-- Client-side compression (see useLessonBoardWriteSync.ts) is a courtesy
-- check, not something the bucket enforces — nothing stopped a request that
-- skips the app's own JS from uploading an arbitrarily large or
-- non-image file, since 048/059's insert policies only check bucket_id.
-- This is the hard ceiling: 5MB comfortably covers a compressed upload
-- (see MAX_IMAGE_DIMENSION/IMAGE_JPEG_QUALITY) with headroom for a raw
-- photo that skips compression, and image-only mime types match what
-- Excalidraw's own image tool ever inserts.
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
where id = 'lesson-board-images';
