-- SQL query to create the alertaxis table in Supabase

-- MIGRATION: If you are switching from instagram_report, you can rename it:
-- ALTER TABLE instagram_report RENAME TO alertaxis;

CREATE TABLE IF NOT EXISTS alertaxis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  instagram_username TEXT,
  reel_url TEXT,
  caption TEXT,
  media_id TEXT,
  hashtag TEXT DEFAULT '#alertaxis',
  is_direct_upload BOOLEAN DEFAULT FALSE,
  video_storage_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE alertaxis ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid errors
DROP POLICY IF EXISTS "Anyone can view alertaxis reports" ON alertaxis;
DROP POLICY IF EXISTS "Anyone can insert alertaxis reports" ON alertaxis;
DROP POLICY IF EXISTS "Users can update their own alertaxis reports" ON alertaxis;
DROP POLICY IF EXISTS "Users can delete their own alertaxis reports" ON alertaxis;

-- Create policies
-- 1. Allow everyone to view reports
CREATE POLICY "Anyone can view alertaxis reports" 
ON alertaxis FOR SELECT 
USING (true);

-- 2. Allow anyone to insert reports (for anonymous uploads)
CREATE POLICY "Anyone can insert alertaxis reports" 
ON alertaxis FOR INSERT 
WITH CHECK (true);

-- 3. Allow users to update their own reports
CREATE POLICY "Users can update their own alertaxis reports" 
ON alertaxis FOR UPDATE 
USING (auth.uid() = user_id);

-- 4. Allow users to delete their own reports
CREATE POLICY "Users can delete their own alertaxis reports" 
ON alertaxis FOR DELETE 
USING (auth.uid() = user_id);

-- Storage Policies for app-files bucket
-- Note: Ensure the 'app-files' bucket exists in your Supabase Storage dashboard

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Public Access to Instagram Alerts" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload Instagram Alerts" ON storage.objects;

-- 1. Allow public access to view videos in the 'instagram alert' folder
CREATE POLICY "Public Access to Instagram Alerts"
ON storage.objects FOR SELECT
USING ( bucket_id = 'app-files' AND (storage.foldername(name))[1] = 'instagram alert' );

-- 2. Allow anyone to upload videos to the 'instagram alert' folder
CREATE POLICY "Anyone can upload Instagram Alerts"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'app-files' AND (storage.foldername(name))[1] = 'instagram alert' );
