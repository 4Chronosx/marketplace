# Supabase-Schema.sql

```sql
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
CREATE POLICY "Anyone can create listings" ON listings FOR INSERT WITH CHECK (true);
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
```

## Payments (Stripe Connect)

Added for the Stripe Connect feature. The full SQL, including policies and triggers, is in `supabase-schema.sql` (fresh install) and `supabase-payments-migration.sql` (existing database, safe to re-run).

```sql
-- listings: sold state
ALTER TABLE listings ADD COLUMN status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold'));
ALTER TABLE listings ADD COLUMN sold_at TIMESTAMP WITH TIME ZONE;

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

-- A row exists only after a payment is confirmed. Amounts are in cents.
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
```

Access rules (all through the anon key, no `service_role`):

- `stripe_accounts`: read, insert and update; no delete. A trigger blocks changing `seller_email` or `stripe_account_id`.
- `orders`: read and insert; no update or delete.
- `listings`: new rows must have `status = 'available'`. The anon role can update a listing only from `available` to `sold`, only when an order exists for it, and no other column may change (enforced by a trigger).
