-- Payments (Stripe Connect) migration for an EXISTING marketplace database.
-- Run it in the Supabase SQL editor. It is idempotent: running it again is safe.
-- A fresh install does not need this file; supabase-schema.sql already contains
-- the same objects.
-- Writes use the anon key only (never service_role): RLS policies plus the
-- triggers below limit what that key can do. See docs/DEVELOPMENT_GUIDE.md.

-- listings: sold state
ALTER TABLE listings ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'available';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS sold_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_status_check;
ALTER TABLE listings ADD CONSTRAINT listings_status_check CHECK (status IN ('available', 'sold'));

-- Already created by supabase-schema.sql; repeated so this file stands alone.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- One connected Stripe account per seller email (emails are stored lowercase)
CREATE TABLE IF NOT EXISTS stripe_accounts (
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
CREATE TABLE IF NOT EXISTS orders (
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

CREATE INDEX IF NOT EXISTS idx_orders_listing_id ON orders(listing_id);

ALTER TABLE stripe_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- stripe_accounts: read, create and update status; no delete
DROP POLICY IF EXISTS "Anyone can view stripe accounts" ON stripe_accounts;
CREATE POLICY "Anyone can view stripe accounts" ON stripe_accounts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can create stripe accounts" ON stripe_accounts;
CREATE POLICY "Anyone can create stripe accounts" ON stripe_accounts FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can update stripe accounts" ON stripe_accounts;
CREATE POLICY "Anyone can update stripe accounts" ON stripe_accounts FOR UPDATE USING (true) WITH CHECK (true);

-- orders: read and create; no update or delete
DROP POLICY IF EXISTS "Anyone can view orders" ON orders;
CREATE POLICY "Anyone can view orders" ON orders FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
CREATE POLICY "Anyone can create orders" ON orders FOR INSERT WITH CHECK (true);

-- listings: new listings must start available; an available listing can be
-- marked sold (guarded by the trigger below)
DROP POLICY IF EXISTS "Anyone can create listings" ON listings;
CREATE POLICY "Anyone can create listings" ON listings FOR INSERT WITH CHECK (status = 'available');
DROP POLICY IF EXISTS "Anyone can mark an available listing sold" ON listings;
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

DROP TRIGGER IF EXISTS guard_listing_anon_update ON listings;
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

DROP TRIGGER IF EXISTS freeze_stripe_account_identity ON stripe_accounts;
CREATE TRIGGER freeze_stripe_account_identity BEFORE UPDATE ON stripe_accounts
FOR EACH ROW EXECUTE FUNCTION freeze_stripe_account_identity();

DROP TRIGGER IF EXISTS update_stripe_accounts_updated_at ON stripe_accounts;
CREATE TRIGGER update_stripe_accounts_updated_at BEFORE UPDATE ON stripe_accounts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
