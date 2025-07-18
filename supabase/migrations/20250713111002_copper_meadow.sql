/*
  # Create AR Experiences Table

  1. New Tables
    - `ar_experiences`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `description` (text, optional)
      - `marker_image_url` (text, required)
      - `marker_mind_url` (text, optional)
      - `marker_fset_url` (text, optional)
      - `marker_fset3_url` (text, optional)
      - `content_url` (text, required)
      - `content_type` (text, required) - 'video' or 'model'
      - `status` (text, required) - 'processing', 'ready', 'failed'
      - `created_at` (timestamp)

  2. Storage
    - Create storage buckets for markers and content
    - Set up public access policies

  3. Security
    - Enable RLS on `ar_experiences` table
    - Add policy for public read access (no auth required)
    - Add policy for public insert access (no auth required)
*/

-- Create the AR experiences table
CREATE TABLE IF NOT EXISTS ar_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  marker_image_url text NOT NULL,
  marker_mind_url text,
  marker_fset_url text,
  marker_fset3_url text,
  content_url text NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('video', 'model')),
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE ar_experiences ENABLE ROW LEVEL SECURITY;

-- Allow public read access (no auth required)
CREATE POLICY "Allow public read access"
  ON ar_experiences
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow public insert access (no auth required)
CREATE POLICY "Allow public insert access"
  ON ar_experiences
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow public update access for status changes
CREATE POLICY "Allow public update access"
  ON ar_experiences
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('ar-markers', 'ar-markers', true),
  ('ar-content', 'ar-content', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for markers bucket
CREATE POLICY "Allow public uploads to ar-markers"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'ar-markers');

CREATE POLICY "Allow public access to ar-markers"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'ar-markers');

-- Set up storage policies for content bucket
CREATE POLICY "Allow public uploads to ar-content"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'ar-content');

CREATE POLICY "Allow public access to ar-content"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'ar-content');