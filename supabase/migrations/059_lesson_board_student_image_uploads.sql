-- Students can now draw collaboratively on the Lesson Board (see the
-- storage:write scope grant in /api/liveblocks-auth), including inserting
-- images — they're never authenticated (anon role only, same as every
-- other participant-facing table in this app; see session_participants'
-- own wide-open RLS in 001_initial_schema.sql), so the upload policy has
-- to match that same "open behind a secret session code" trust model
-- instead of being scoped to `authenticated` like the tutor-only policy
-- from 048_lesson_board_image_storage.sql.
create policy "Anyone can upload lesson board images"
on storage.objects for insert
to anon
with check (bucket_id = 'lesson-board-images');

update mechanics
set description = 'A live shared whiteboard — the host and students draw, write and explain together in real time.'
where id = 'lesson_board';
