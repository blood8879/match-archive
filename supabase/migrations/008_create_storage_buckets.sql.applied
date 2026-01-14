-- Create storage buckets for team emblems and user avatars

-- Team emblems bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'team-emblems',
  'team-emblems',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
);

-- User avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-avatars',
  'user-avatars',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Storage policies for team emblems
CREATE POLICY "Anyone can view team emblems"
ON storage.objects FOR SELECT
USING (bucket_id = 'team-emblems');

CREATE POLICY "Authenticated users can upload team emblems"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'team-emblems');

CREATE POLICY "Users can update their team emblems"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'team-emblems' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their team emblems"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'team-emblems' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for user avatars
CREATE POLICY "Anyone can view user avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-avatars');

CREATE POLICY "Authenticated users can upload their avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'user-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'user-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'user-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
