-- Create storage bucket for PDF page images
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdf-pages', 'pdf-pages', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to pdf-pages bucket
CREATE POLICY "Authenticated users can upload pdf pages"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pdf-pages');

-- Allow public read access to pdf pages
CREATE POLICY "Public can view pdf pages"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'pdf-pages');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete pdf pages"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'pdf-pages');