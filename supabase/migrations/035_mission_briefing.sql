-- ============================================================
-- Edugine — Add mission_briefing mechanic
-- ============================================================

INSERT INTO mechanics (id, name, description, supported_modes, skill_category, skill_categories)
VALUES (
  'mission_briefing',
    'Mission Briefing',
      'Each player holds private intel. Coordinate verbally to complete the mission.',
        ARRAY['shared'],
          'simulations',
            ARRAY['simulations']
            )
            ON CONFLICT (id) DO UPDATE
              SET name             = EXCLUDED.name,
                    description      = EXCLUDED.description,
                          supported_modes  = EXCLUDED.supported_modes,
                                skill_category   = EXCLUDED.skill_category,
                                      skill_categories = EXCLUDED.skill_categories;
                                      