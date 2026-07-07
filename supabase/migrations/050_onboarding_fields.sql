-- Tutor onboarding: welcome screen shown once, tour completion tracked
-- separately since a tutor can dismiss the welcome screen without taking
-- the tour (or vice versa via "Take the tour again" in Settings).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_step TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;
