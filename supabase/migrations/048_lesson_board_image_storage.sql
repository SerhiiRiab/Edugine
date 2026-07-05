-- Images inserted into a Lesson Board are uploaded here immediately on
-- insert; only the resulting public URL is broadcast/persisted afterward
-- instead of the full base64 payload, which is too large to sync live.
insert into storage.buckets (id, name, public)
values ('lesson-board-images', 'lesson-board-images', true)
on conflict (id) do nothing;

create policy "Authenticated users can upload lesson board images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'lesson-board-images');

-- Students load images directly from the public URL and are never
-- authenticated (they join via a session code, not a login), so reads must
-- be open to everyone.
create policy "Anyone can view lesson board images"
on storage.objects for select
using (bucket_id = 'lesson-board-images');


