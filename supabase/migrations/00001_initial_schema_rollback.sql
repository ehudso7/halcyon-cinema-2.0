-- Rollback script for initial schema
-- WARNING: This will delete all data. Use with caution.

-- Drop triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
DROP TRIGGER IF EXISTS update_chapters_updated_at ON public.chapters;
DROP TRIGGER IF EXISTS update_scenes_updated_at ON public.scenes;
DROP TRIGGER IF EXISTS update_canon_entries_updated_at ON public.canon_entries;
DROP TRIGGER IF EXISTS update_canon_characters_updated_at ON public.canon_characters;
DROP TRIGGER IF EXISTS update_canon_locations_updated_at ON public.canon_locations;
DROP TRIGGER IF EXISTS update_canon_rules_updated_at ON public.canon_rules;
DROP TRIGGER IF EXISTS update_canon_events_updated_at ON public.canon_events;
DROP TRIGGER IF EXISTS update_canon_themes_updated_at ON public.canon_themes;
DROP TRIGGER IF EXISTS update_shots_updated_at ON public.shots;
DROP TRIGGER IF EXISTS update_timelines_updated_at ON public.timelines;
DROP TRIGGER IF EXISTS update_scene_word_count ON public.scenes;
DROP TRIGGER IF EXISTS update_chapter_word_count ON public.chapters;
DROP TRIGGER IF EXISTS update_project_chapter_count ON public.chapters;
DROP TRIGGER IF EXISTS update_project_scene_count ON public.scenes;
DROP TRIGGER IF EXISTS update_canon_search ON public.canon_entries;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at();
DROP FUNCTION IF EXISTS update_word_counts();
DROP FUNCTION IF EXISTS update_project_counts();
DROP FUNCTION IF EXISTS update_canon_search_vector();
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS get_user_features(UUID);
DROP FUNCTION IF EXISTS can_access_cinema(UUID);
DROP FUNCTION IF EXISTS get_project_canon_for_ai(UUID);

-- Drop tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS public.metrics_aggregates CASCADE;
DROP TABLE IF EXISTS public.metrics_events CASCADE;
DROP TABLE IF EXISTS public.feature_flags CASCADE;
DROP TABLE IF EXISTS public.exports CASCADE;
DROP TABLE IF EXISTS public.ai_generations CASCADE;
DROP TABLE IF EXISTS public.shots CASCADE;
DROP TABLE IF EXISTS public.canon_themes CASCADE;
DROP TABLE IF EXISTS public.canon_events CASCADE;
DROP TABLE IF EXISTS public.canon_rules CASCADE;
DROP TABLE IF EXISTS public.canon_locations CASCADE;
DROP TABLE IF EXISTS public.canon_characters CASCADE;
DROP TABLE IF EXISTS public.canon_references CASCADE;
DROP TABLE IF EXISTS public.canon_versions CASCADE;
DROP TABLE IF EXISTS public.canon_entries CASCADE;
DROP TABLE IF EXISTS public.timelines CASCADE;
DROP TABLE IF EXISTS public.scenes CASCADE;
DROP TABLE IF EXISTS public.chapters CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop types
DROP TYPE IF EXISTS conflict_resolution;
DROP TYPE IF EXISTS export_format;
DROP TYPE IF EXISTS production_format;
DROP TYPE IF EXISTS shot_type;
DROP TYPE IF EXISTS content_status;
DROP TYPE IF EXISTS canon_lock_status;
DROP TYPE IF EXISTS canon_entity_type;
DROP TYPE IF EXISTS subscription_tier;
DROP TYPE IF EXISTS project_mode;

-- Drop extensions (optional, usually keep these)
-- DROP EXTENSION IF EXISTS "btree_gin";
-- DROP EXTENSION IF EXISTS "pg_trgm";
-- DROP EXTENSION IF EXISTS "uuid-ossp";
