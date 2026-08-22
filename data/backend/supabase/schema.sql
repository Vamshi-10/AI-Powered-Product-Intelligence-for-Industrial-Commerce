-- Supabase Database Schema for Industrial Product Intelligence

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    competitor_price NUMERIC(10, 2) NOT NULL CHECK (competitor_price >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Row Level Security Policies for public development access
CREATE POLICY "Allow public select on products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow public insert on products" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on products" ON public.products FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on products" ON public.products FOR DELETE USING (true);
