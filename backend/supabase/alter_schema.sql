-- Add ai_intelligence column to store the massive 252-column JSON output from the AI Engine
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS ai_intelligence JSONB;
