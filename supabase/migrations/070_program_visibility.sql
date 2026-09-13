-- Programs: add visibility (mirrors lessons — 027_lesson_visibility.sql),
-- and fix a real gap left by 039_program_share.sql.
--
-- Every program already gets a share_token by default at creation, same as
-- lessons (027_lesson_visibility.sql). The policies added in
-- 039_program_share.sql were "USING (share_token IS NOT NULL)" — true for
-- basically every program, so they made every tutor's program (and its
-- program_lessons rows) readable by anyone via the anon REST API, not just
-- someone who actually holds a share link. This is exactly the mistake
-- 055_fix_rls_lesson_content.sql calls out and avoids for lessons — this
-- migration brings programs in line with that pattern:
--   - visibility gates real RLS read access (public/unlisted readable,
--     private owner-only) — a value the owner sets, not "token exists".
--   - the share_token itself is verified in trusted server code via the
--     service-role client (see /programs/share/[token]/page.tsx), matching
--     the exact token value rather than a table policy. A share link works
--     regardless of visibility, same as lessons — sharing one program with
--     one student doesn't require making it globally unlisted.

ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private', 'unlisted', 'public'));

-- Every existing program already has a working share_token that may already
-- be in someone's hands — mark them 'unlisted' so nothing that already
-- shared a link silently breaks. Only new programs start private.
UPDATE programs SET visibility = 'unlisted';

DROP POLICY IF EXISTS "public can read programs by share_token" ON programs;
DROP POLICY IF EXISTS "public can read program_lessons by share_token" ON program_lessons;
DROP POLICY IF EXISTS "public can read program_modules by share_token" ON program_modules;

CREATE POLICY "programs_public_read" ON programs
  FOR SELECT USING (visibility IN ('public', 'unlisted'));

CREATE POLICY "program_lessons_public_read" ON program_lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM programs p
      WHERE p.id = program_lessons.program_id
      AND p.visibility IN ('public', 'unlisted')
    )
  );

CREATE POLICY "program_modules_public_read" ON program_modules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM programs p
      WHERE p.id = program_modules.program_id
      AND p.visibility IN ('public', 'unlisted')
    )
  );
