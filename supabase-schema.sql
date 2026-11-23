-- Supabase schema for the Marketplace app.
-- Source: docs/SCHEMA.md, plus `seller_name` on listings.
-- Run this ONCE in the Supabase SQL editor. It is not idempotent: running it
-- again fails because the tables, bucket and policies already exist.

-- Create listings table
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(100) NOT NULL,
  seller_name VARCHAR(255) NOT NULL,
  seller_email VARCHAR(255) NOT NULL,
  image_url TEXT,
  location VARCHAR(255) DEFAULT 'Palo Alto, CA',
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold')),
  sold_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  buyer_email VARCHAR(255) NOT NULL,
  seller_email VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create storage bucket for listing images
INSERT INTO storage.buckets (id, name, public) VALUES ('listing-images', 'listing-images', true);

-- Create policy for listing images storage
CREATE POLICY "Anyone can upload listing images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'listing-images');

CREATE POLICY "Anyone can view listing images" ON storage.objects
FOR SELECT USING (bucket_id = 'listing-images');

-- Create indexes for better performance
CREATE INDEX idx_listings_category ON listings(category);
CREATE INDEX idx_listings_created_at ON listings(created_at DESC);
CREATE INDEX idx_messages_listing_id ON messages(listing_id);

-- Enable Row Level Security (RLS)
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies for listings (anyone can read, anyone can insert)
CREATE POLICY "Anyone can view listings" ON listings FOR SELECT USING (true);
CREATE POLICY "Anyone can create listings" ON listings FOR INSERT WITH CHECK (status = 'available');
CREATE POLICY "Users can update their own listings" ON listings FOR UPDATE USING (seller_email = current_setting('request.jwt.claims')::json->>'email');

-- Create policies for messages (anyone can read and insert)
CREATE POLICY "Anyone can view messages" ON messages FOR SELECT USING (true);
CREATE POLICY "Anyone can create messages" ON messages FOR INSERT WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Payments (Stripe Connect)
-- A fresh install gets everything from this file. An EXISTING database runs
-- supabase-payments-migration.sql instead (same objects, safe to re-run).
-- Writes use the anon key only (never service_role): RLS policies plus the
-- triggers below limit what that key can do. See docs/DEVELOPMENT_GUIDE.md.
-- ---------------------------------------------------------------------------

-- One connected Stripe account per seller email (emails are stored lowercase)
CREATE TABLE stripe_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_email VARCHAR(255) NOT NULL UNIQUE CHECK (seller_email = lower(seller_email)),
  stripe_account_id TEXT NOT NULL UNIQUE,
  details_submitted BOOLEAN NOT NULL DEFAULT false,
  charges_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A row exists only after a payment is confirmed, so a row means "paid".
-- Amounts are integers in the smallest currency unit (cents).
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE RESTRICT,
  buyer_email VARCHAR(255),
  stripe_account_id TEXT NOT NULL,
  stripe_session_id TEXT NOT NULL UNIQUE,
  stripe_payment_intent_id TEXT,
  amount_total INTEGER NOT NULL CHECK (amount_total >= 0),
  application_fee INTEGER NOT NULL CHECK (application_fee >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'usd',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_orders_listing_id ON orders(listing_id);

ALTER TABLE stripe_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- stripe_accounts: read, create and update status; no delete
CREATE POLICY "Anyone can view stripe accounts" ON stripe_accounts FOR SELECT USING (true);
CREATE POLICY "Anyone can create stripe accounts" ON stripe_accounts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update stripe accounts" ON stripe_accounts FOR UPDATE USING (true) WITH CHECK (true);

-- orders: read and create; no update or delete
CREATE POLICY "Anyone can view orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Anyone can create orders" ON orders FOR INSERT WITH CHECK (true);

-- listings: an available listing can be marked sold (guarded by the trigger below)
CREATE POLICY "Anyone can mark an available listing sold" ON listings
FOR UPDATE USING (status = 'available') WITH CHECK (status = 'sold');

-- The anon role may only flip a listing from available to sold, and only once an
-- order exists for it. Nothing else on the listing can change.
CREATE OR REPLACE FUNCTION guard_listing_anon_update()
RETURNS TRIGGER AS $$
BEGIN
  IF current_user = 'anon' THEN
    IF (to_jsonb(NEW) - 'status' - 'sold_at' - 'updated_at')
       IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'sold_at' - 'updated_at') THEN
      RAISE EXCEPTION 'Only status and sold_at can be changed on a listing.' USING ERRCODE = '42501';
    END IF;
    IF NOT (OLD.status = 'available' AND NEW.status = 'sold') THEN
      RAISE EXCEPTION 'A listing can only change from available to sold.' USING ERRCODE = '42501';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM orders WHERE listing_id = NEW.id) THEN
      RAISE EXCEPTION 'A listing can only be marked sold after an order exists.' USING ERRCODE = '42501';
    END IF;
    NEW.sold_at := COALESCE(NEW.sold_at, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER guard_listing_anon_update BEFORE UPDATE ON listings
FOR EACH ROW EXECUTE FUNCTION guard_listing_anon_update();

-- A connected account can never be re-pointed at another email or account id
CREATE OR REPLACE FUNCTION freeze_stripe_account_identity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.seller_email IS DISTINCT FROM OLD.seller_email
     OR NEW.stripe_account_id IS DISTINCT FROM OLD.stripe_account_id THEN
    RAISE EXCEPTION 'seller_email and stripe_account_id cannot be changed.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER freeze_stripe_account_identity BEFORE UPDATE ON stripe_accounts
FOR EACH ROW EXECUTE FUNCTION freeze_stripe_account_identity();

CREATE TRIGGER update_stripe_accounts_updated_at BEFORE UPDATE ON stripe_accounts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
