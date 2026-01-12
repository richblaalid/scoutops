-- Migration: Add storage policies for unit-logos bucket
-- This allows authenticated users to upload/delete logos and public read access

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('unit-logos', 'unit-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policy: Allow public read access to logos
CREATE POLICY "Public read access for unit logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'unit-logos');

-- Policy: Allow authenticated users to upload logos
CREATE POLICY "Authenticated users can upload unit logos"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'unit-logos'
    AND auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to update logos (for upsert)
CREATE POLICY "Authenticated users can update unit logos"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'unit-logos'
    AND auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to delete logos
CREATE POLICY "Authenticated users can delete unit logos"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'unit-logos'
    AND auth.role() = 'authenticated'
);
