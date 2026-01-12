-- Migration: Add unit branding fields
-- Allows units to upload a logo for payment pages and emails

-- Add logo_url to units table
ALTER TABLE units ADD COLUMN logo_url TEXT;

-- Note: The storage bucket 'unit-logos' needs to be created in Supabase Dashboard
-- with the following settings:
-- - Public bucket: Yes
-- - Max file size: 2MB (2097152 bytes)
-- - Allowed MIME types: image/png, image/jpeg, image/webp
