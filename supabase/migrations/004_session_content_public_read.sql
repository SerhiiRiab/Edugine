-- Allow anonymous (unauthenticated) users to read content_items for
-- sessions that are waiting or active. This lets the /play/[code] page
-- load word cards without requiring auth.
create policy "content_items_session_public_read" on content_items
  for select using (
    exists (
      select 1 from sessions s
      where s.set_id = content_items.set_id
        and s.status in ('waiting', 'active')
    )
  );
