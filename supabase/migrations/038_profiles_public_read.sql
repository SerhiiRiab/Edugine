-- Allow anyone to read full_name from profiles of public-lesson authors.
-- The library page and public lesson pages show "by [Name]" / "Created by [Name]".
DROP POLICY IF EXISTS "profiles_select_public" ON profiles;
CREATE POLICY "profiles_select_public" ON profiles
  FOR SELECT USING (true);

-- Keep the existing own-row update policy (unchanged from 001).
