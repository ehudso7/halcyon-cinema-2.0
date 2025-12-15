-- Halcyon Cinema + StoryForge Unified Platform
-- Initial Database Schema Migration
--
-- DESIGN PRINCIPLES:
-- 1. Industry-standard efficient for Supabase (proper indexing, RLS, partitioning strategies)
-- 2. Support for users with existing literary works (legacy compatibility)
-- 3. Complete separation of StoryForge and Cinema concerns
-- 4. Canon as single source of truth
-- 5. Mode-aware project management

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search optimization
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For composite indexes

-- Custom ENUM types
CREATE TYPE project_mode AS ENUM ('storyforge', 'cinema');
CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'studio', 'enterprise');
CREATE TYPE canon_entity_type AS ENUM ('character', 'location', 'rule', 'event', 'theme', 'reference', 'item', 'relationship');
CREATE TYPE canon_lock_status AS ENUM ('unlocked', 'soft_locked', 'hard_locked');
CREATE TYPE content_status AS ENUM ('draft', 'review', 'final', 'archived');
CREATE TYPE shot_type AS ENUM ('establishing', 'wide', 'medium', 'close_up', 'extreme_close_up', 'over_shoulder', 'pov', 'aerial', 'tracking', 'dolly', 'pan', 'tilt', 'zoom', 'static');
CREATE TYPE production_format AS ENUM ('film', 'tv', 'animation', 'game', 'web_series', 'short');
CREATE TYPE export_format AS ENUM ('docx', 'pdf', 'epub', 'fountain', 'markdown', 'json');
CREATE TYPE conflict_resolution AS ENUM ('keep_canon', 'update_canon', 'fork_timeline');

-- ============================================
-- USERS & SUBSCRIPTIONS
-- ============================================

-- Users table extends Supabase auth.users
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    subscription_tier subscription_tier DEFAULT 'free' NOT NULL,
    subscription_status TEXT DEFAULT 'active',
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT,
    trial_ends_at TIMESTAMPTZ,
    -- Feature usage tracking for rate limiting
    monthly_ai_tokens_used BIGINT DEFAULT 0,
    monthly_ai_tokens_limit BIGINT DEFAULT 50000, -- Free tier default
    monthly_exports_used INTEGER DEFAULT 0,
    monthly_exports_limit INTEGER DEFAULT 5, -- Free tier default
    -- Legacy support: users who had content before StoryForge integration
    legacy_user BOOLEAN DEFAULT FALSE,
    legacy_import_date TIMESTAMPTZ,
    -- Preferences
    preferred_mode project_mode DEFAULT 'storyforge',
    onboarding_completed BOOLEAN DEFAULT FALSE,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for subscription queries
CREATE INDEX idx_users_subscription ON public.users(subscription_tier, subscription_status);
CREATE INDEX idx_users_stripe ON public.users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX idx_users_legacy ON public.users(legacy_user) WHERE legacy_user = TRUE;

-- ============================================
-- PROJECTS
-- ============================================

CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Basic info
    title TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    genre TEXT,
    logline TEXT, -- One sentence summary

    -- Mode management
    mode project_mode DEFAULT 'storyforge' NOT NULL,
    cinema_enabled_at TIMESTAMPTZ, -- When user first enabled cinema mode

    -- Project metadata
    word_count INTEGER DEFAULT 0,
    chapter_count INTEGER DEFAULT 0,
    scene_count INTEGER DEFAULT 0,
    target_word_count INTEGER,

    -- Production format (for cinema mode)
    production_format production_format DEFAULT 'film',

    -- Status
    status content_status DEFAULT 'draft' NOT NULL,
    is_demo BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,

    -- Legacy support: projects imported from old Halcyon Cinema
    legacy_project BOOLEAN DEFAULT FALSE,
    legacy_source TEXT, -- 'halcyon_cinema_v1', 'storyforge_standalone', etc.
    legacy_id TEXT, -- Original ID from legacy system

    -- Cover and branding
    cover_image_url TEXT,
    color_scheme JSONB DEFAULT '{"primary": "#8b5cf6", "secondary": "#d946ef"}',

    -- Settings
    settings JSONB DEFAULT '{
        "auto_save": true,
        "ai_suggestions": true,
        "canon_enforcement": "strict",
        "export_header": true,
        "export_footer": true
    }',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_edited_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient project queries
CREATE INDEX idx_projects_user ON public.projects(user_id);
CREATE INDEX idx_projects_mode ON public.projects(mode);
CREATE INDEX idx_projects_status ON public.projects(status) WHERE status != 'archived';
CREATE INDEX idx_projects_legacy ON public.projects(legacy_project, legacy_source) WHERE legacy_project = TRUE;
CREATE INDEX idx_projects_user_mode ON public.projects(user_id, mode);
CREATE INDEX idx_projects_updated ON public.projects(updated_at DESC);

-- ============================================
-- CHAPTERS
-- ============================================

CREATE TABLE public.chapters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    -- Content
    title TEXT NOT NULL,
    summary TEXT,
    content TEXT DEFAULT '',

    -- Ordering
    order_index INTEGER NOT NULL,

    -- Metadata
    word_count INTEGER DEFAULT 0,
    status content_status DEFAULT 'draft' NOT NULL,

    -- AI generation tracking
    ai_generated_percentage DECIMAL(5,2) DEFAULT 0,
    last_ai_action TEXT,
    last_ai_action_at TIMESTAMPTZ,

    -- Version tracking
    version INTEGER DEFAULT 1,

    -- Notes for author
    author_notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_chapters_project ON public.chapters(project_id);
CREATE INDEX idx_chapters_order ON public.chapters(project_id, order_index);
CREATE UNIQUE INDEX idx_chapters_project_order ON public.chapters(project_id, order_index);

-- ============================================
-- SCENES
-- ============================================

CREATE TABLE public.scenes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    -- Content
    title TEXT,
    content TEXT DEFAULT '',

    -- Scene metadata
    order_index INTEGER NOT NULL,
    location TEXT,
    time_of_day TEXT, -- 'day', 'night', 'dawn', 'dusk', etc.

    -- Semantic scene data (for StoryForge → Cinema translation)
    semantic_data JSONB DEFAULT '{
        "purpose": null,
        "emotional_beat": null,
        "conflict": null,
        "resolution": null,
        "character_states": {},
        "themes": [],
        "mood": null,
        "pacing": "normal"
    }',

    -- Characters present in scene
    character_ids UUID[] DEFAULT '{}',
    location_id UUID,

    -- Status
    status content_status DEFAULT 'draft' NOT NULL,
    word_count INTEGER DEFAULT 0,

    -- Cinema-specific (only populated in cinema mode)
    shot_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_scenes_chapter ON public.scenes(chapter_id);
CREATE INDEX idx_scenes_project ON public.scenes(project_id);
CREATE INDEX idx_scenes_order ON public.scenes(chapter_id, order_index);
CREATE INDEX idx_scenes_characters ON public.scenes USING GIN(character_ids);

-- ============================================
-- CANON VAULT TABLES
-- ============================================

-- Master canon entries table
CREATE TABLE public.canon_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    -- Entry type and identity
    entity_type canon_entity_type NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL, -- URL-friendly identifier

    -- Core data
    description TEXT,
    data JSONB DEFAULT '{}', -- Type-specific structured data

    -- Locking and versioning
    lock_status canon_lock_status DEFAULT 'unlocked' NOT NULL,
    locked_at TIMESTAMPTZ,
    locked_by UUID REFERENCES public.users(id),
    version INTEGER DEFAULT 1,

    -- Relationships
    parent_id UUID REFERENCES public.canon_entries(id) ON DELETE SET NULL,
    related_entry_ids UUID[] DEFAULT '{}',

    -- Reference tracking
    reference_count INTEGER DEFAULT 0, -- How many times referenced in content
    last_referenced_at TIMESTAMPTZ,

    -- Timeline support (for fork_timeline resolution)
    timeline_id UUID, -- NULL = main timeline
    is_active BOOLEAN DEFAULT TRUE,

    -- Search optimization
    search_vector TSVECTOR,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for canon queries
CREATE INDEX idx_canon_project ON public.canon_entries(project_id);
CREATE INDEX idx_canon_type ON public.canon_entries(project_id, entity_type);
CREATE INDEX idx_canon_slug ON public.canon_entries(project_id, slug);
CREATE UNIQUE INDEX idx_canon_project_slug ON public.canon_entries(project_id, slug) WHERE is_active = TRUE;
CREATE INDEX idx_canon_parent ON public.canon_entries(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_canon_related ON public.canon_entries USING GIN(related_entry_ids);
CREATE INDEX idx_canon_search ON public.canon_entries USING GIN(search_vector);
CREATE INDEX idx_canon_lock ON public.canon_entries(project_id, lock_status);
CREATE INDEX idx_canon_timeline ON public.canon_entries(project_id, timeline_id) WHERE timeline_id IS NOT NULL;

-- Canon version history (for rollbacks)
CREATE TABLE public.canon_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canon_entry_id UUID NOT NULL REFERENCES public.canon_entries(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,

    -- Snapshot of data at this version
    name TEXT NOT NULL,
    description TEXT,
    data JSONB NOT NULL,

    -- Change metadata
    changed_by UUID REFERENCES public.users(id),
    change_reason TEXT,
    change_type TEXT, -- 'manual', 'ai_suggestion_accepted', 'conflict_resolution'

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_canon_versions_entry ON public.canon_versions(canon_entry_id);
CREATE INDEX idx_canon_versions_entry_version ON public.canon_versions(canon_entry_id, version DESC);

-- Canon references (tracks where canon is used)
CREATE TABLE public.canon_references (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canon_entry_id UUID NOT NULL REFERENCES public.canon_entries(id) ON DELETE CASCADE,

    -- Reference location
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
    scene_id UUID REFERENCES public.scenes(id) ON DELETE CASCADE,

    -- Reference context
    context_snippet TEXT, -- Surrounding text for context
    position_start INTEGER, -- Character position in content
    position_end INTEGER,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_canon_refs_entry ON public.canon_references(canon_entry_id);
CREATE INDEX idx_canon_refs_chapter ON public.canon_references(chapter_id);
CREATE INDEX idx_canon_refs_scene ON public.canon_references(scene_id);

-- ============================================
-- SPECIFIC CANON TYPE TABLES (Denormalized for performance)
-- ============================================

-- Characters
CREATE TABLE public.canon_characters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canon_entry_id UUID NOT NULL REFERENCES public.canon_entries(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    -- Character details
    name TEXT NOT NULL,
    full_name TEXT,
    aliases TEXT[] DEFAULT '{}',

    -- Physical
    age TEXT,
    gender TEXT,
    appearance TEXT,

    -- Personality
    personality TEXT,
    motivations TEXT,
    fears TEXT,
    strengths TEXT[] DEFAULT '{}',
    weaknesses TEXT[] DEFAULT '{}',

    -- Background
    backstory TEXT,
    occupation TEXT,
    role TEXT, -- 'protagonist', 'antagonist', 'supporting', etc.

    -- Relationships stored as JSONB for flexibility
    relationships JSONB DEFAULT '[]',

    -- Voice
    speech_patterns TEXT,
    vocabulary_level TEXT,
    catchphrases TEXT[] DEFAULT '{}',

    -- Arc
    character_arc TEXT,

    -- Visual (for cinema mode)
    visual_description TEXT,
    reference_images TEXT[] DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_canon_characters_project ON public.canon_characters(project_id);
CREATE INDEX idx_canon_characters_entry ON public.canon_characters(canon_entry_id);
CREATE INDEX idx_canon_characters_name ON public.canon_characters(project_id, name);

-- Locations
CREATE TABLE public.canon_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canon_entry_id UUID NOT NULL REFERENCES public.canon_entries(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    -- Location details
    name TEXT NOT NULL,
    type TEXT, -- 'interior', 'exterior', 'both'
    category TEXT, -- 'city', 'building', 'room', 'landscape', etc.

    -- Description
    description TEXT,
    atmosphere TEXT,
    sensory_details JSONB DEFAULT '{"sight": null, "sound": null, "smell": null, "touch": null}',

    -- Geography
    parent_location_id UUID REFERENCES public.canon_locations(id),
    coordinates JSONB, -- For mapping if needed

    -- History
    history TEXT,
    significance TEXT,

    -- Visual (for cinema mode)
    visual_description TEXT,
    reference_images TEXT[] DEFAULT '{}',
    lighting_notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_canon_locations_project ON public.canon_locations(project_id);
CREATE INDEX idx_canon_locations_entry ON public.canon_locations(canon_entry_id);
CREATE INDEX idx_canon_locations_parent ON public.canon_locations(parent_location_id);

-- Rules (world-building rules, magic systems, technology, etc.)
CREATE TABLE public.canon_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canon_entry_id UUID NOT NULL REFERENCES public.canon_entries(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    -- Rule details
    name TEXT NOT NULL,
    category TEXT, -- 'magic', 'technology', 'society', 'physics', etc.

    -- Definition
    description TEXT NOT NULL,
    constraints TEXT[] DEFAULT '{}', -- What the rule prevents
    enables TEXT[] DEFAULT '{}', -- What the rule allows
    exceptions TEXT[] DEFAULT '{}',

    -- Importance for enforcement
    priority INTEGER DEFAULT 5, -- 1-10, higher = more strictly enforced
    enforcement_notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_canon_rules_project ON public.canon_rules(project_id);
CREATE INDEX idx_canon_rules_entry ON public.canon_rules(canon_entry_id);
CREATE INDEX idx_canon_rules_category ON public.canon_rules(project_id, category);

-- Events (timeline events)
CREATE TABLE public.canon_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canon_entry_id UUID NOT NULL REFERENCES public.canon_entries(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    -- Event details
    name TEXT NOT NULL,
    description TEXT,

    -- Timing
    story_date TEXT, -- In-story date/time
    relative_order INTEGER, -- For ordering events
    duration TEXT,

    -- Impact
    consequences TEXT[] DEFAULT '{}',
    affected_character_ids UUID[] DEFAULT '{}',
    affected_location_ids UUID[] DEFAULT '{}',

    -- Classification
    event_type TEXT, -- 'backstory', 'current', 'future', 'alternate'
    significance TEXT, -- 'minor', 'moderate', 'major', 'pivotal'

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_canon_events_project ON public.canon_events(project_id);
CREATE INDEX idx_canon_events_entry ON public.canon_events(canon_entry_id);
CREATE INDEX idx_canon_events_order ON public.canon_events(project_id, relative_order);

-- Themes
CREATE TABLE public.canon_themes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canon_entry_id UUID NOT NULL REFERENCES public.canon_entries(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    -- Theme details
    name TEXT NOT NULL,
    description TEXT,

    -- Expression
    how_expressed TEXT,
    symbols TEXT[] DEFAULT '{}',
    motifs TEXT[] DEFAULT '{}',

    -- Related characters/arcs
    related_character_ids UUID[] DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_canon_themes_project ON public.canon_themes(project_id);
CREATE INDEX idx_canon_themes_entry ON public.canon_themes(canon_entry_id);

-- ============================================
-- CINEMA MODE: SHOTS
-- ============================================

CREATE TABLE public.shots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scene_id UUID NOT NULL REFERENCES public.scenes(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    -- Shot ordering
    order_index INTEGER NOT NULL,

    -- Shot definition
    shot_type shot_type NOT NULL,
    duration_seconds DECIMAL(6,2),

    -- Visual description
    description TEXT NOT NULL,
    composition TEXT,
    camera_movement TEXT,
    lighting TEXT,

    -- Generated prompt
    visual_prompt TEXT,
    prompt_template TEXT, -- Which template was used

    -- Character and location references
    character_ids UUID[] DEFAULT '{}',
    location_id UUID REFERENCES public.canon_locations(id),

    -- Mood and emotion
    mood TEXT,
    emotional_beat TEXT,

    -- Technical notes
    technical_notes TEXT,
    vfx_required BOOLEAN DEFAULT FALSE,
    vfx_notes TEXT,

    -- Generated visuals
    preview_image_url TEXT,
    mood_board_urls TEXT[] DEFAULT '{}',

    -- Production format specific
    format production_format NOT NULL,
    aspect_ratio TEXT DEFAULT '16:9',

    -- Status
    status content_status DEFAULT 'draft' NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_shots_scene ON public.shots(scene_id);
CREATE INDEX idx_shots_project ON public.shots(project_id);
CREATE INDEX idx_shots_order ON public.shots(scene_id, order_index);
CREATE INDEX idx_shots_type ON public.shots(shot_type);

-- ============================================
-- AI GENERATION TRACKING
-- ============================================

CREATE TABLE public.ai_generations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    -- What was generated
    generation_type TEXT NOT NULL, -- 'chapter', 'scene', 'continue', 'rewrite', 'expand', 'condense', 'shot_prompt'
    target_type TEXT, -- 'chapter', 'scene', 'shot'
    target_id UUID,

    -- Input/Output
    prompt_used TEXT,
    input_context JSONB, -- Canon loaded, previous content, etc.
    output_content TEXT,

    -- Canon interaction
    canon_loaded JSONB, -- What canon was loaded for this generation
    canon_conflicts_detected JSONB, -- Any conflicts found
    canon_resolution conflict_resolution,

    -- Usage metrics
    tokens_used INTEGER,
    model_used TEXT,
    latency_ms INTEGER,

    -- Status
    status TEXT DEFAULT 'completed', -- 'completed', 'failed', 'cancelled'
    error_message TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_ai_gen_user ON public.ai_generations(user_id);
CREATE INDEX idx_ai_gen_project ON public.ai_generations(project_id);
CREATE INDEX idx_ai_gen_created ON public.ai_generations(created_at DESC);
CREATE INDEX idx_ai_gen_type ON public.ai_generations(generation_type);

-- ============================================
-- EXPORTS
-- ============================================

CREATE TABLE public.exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    -- Export details
    format export_format NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT,
    file_size_bytes BIGINT,

    -- What was exported
    export_scope TEXT, -- 'full', 'chapters', 'scene'
    chapter_ids UUID[] DEFAULT '{}',

    -- Options used
    options JSONB DEFAULT '{}',

    -- Status
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ -- For cleanup
);

CREATE INDEX idx_exports_user ON public.exports(user_id);
CREATE INDEX idx_exports_project ON public.exports(project_id);
CREATE INDEX idx_exports_status ON public.exports(status) WHERE status = 'pending';

-- ============================================
-- FEATURE FLAGS
-- ============================================

CREATE TABLE public.feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,

    -- Targeting
    enabled BOOLEAN DEFAULT FALSE,
    enabled_for_tiers subscription_tier[] DEFAULT '{}',
    enabled_for_users UUID[] DEFAULT '{}', -- Specific user overrides

    -- Rollout percentage (0-100)
    rollout_percentage INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_feature_flags_name ON public.feature_flags(name);

-- ============================================
-- METRICS & ANALYTICS
-- ============================================

CREATE TABLE public.metrics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,

    -- Event details
    event_name TEXT NOT NULL,
    event_category TEXT, -- 'writing', 'canon', 'cinema', 'export', 'subscription'
    event_data JSONB DEFAULT '{}',

    -- Context
    session_id TEXT,
    page_path TEXT,
    user_agent TEXT,

    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Partitioned by month for efficient cleanup and queries
CREATE INDEX idx_metrics_user ON public.metrics_events(user_id);
CREATE INDEX idx_metrics_event ON public.metrics_events(event_name);
CREATE INDEX idx_metrics_created ON public.metrics_events(created_at DESC);
CREATE INDEX idx_metrics_category ON public.metrics_events(event_category, created_at DESC);

-- Aggregated metrics (computed periodically)
CREATE TABLE public.metrics_aggregates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Aggregation period
    period_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,

    -- Metrics
    metric_name TEXT NOT NULL,
    metric_value DECIMAL(20,4),
    dimensions JSONB DEFAULT '{}', -- For breakdown (by tier, mode, etc.)

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX idx_metrics_agg_unique ON public.metrics_aggregates(period_type, period_start, metric_name, dimensions);
CREATE INDEX idx_metrics_agg_period ON public.metrics_aggregates(period_start DESC);

-- ============================================
-- TIMELINES (for canon fork support)
-- ============================================

CREATE TABLE public.timelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    description TEXT,
    is_main BOOLEAN DEFAULT FALSE,
    parent_timeline_id UUID REFERENCES public.timelines(id),
    fork_point_event_id UUID REFERENCES public.canon_events(id),

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_timelines_project ON public.timelines(project_id);
CREATE UNIQUE INDEX idx_timelines_main ON public.timelines(project_id) WHERE is_main = TRUE;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canon_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canon_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canon_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canon_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canon_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canon_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canon_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canon_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timelines ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Projects policies
CREATE POLICY "Users can view own projects" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON public.projects FOR DELETE USING (auth.uid() = user_id);

-- Chapters policies
CREATE POLICY "Users can manage chapters in own projects" ON public.chapters
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.projects WHERE id = chapters.project_id AND user_id = auth.uid())
    );

-- Scenes policies
CREATE POLICY "Users can manage scenes in own projects" ON public.scenes
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.projects WHERE id = scenes.project_id AND user_id = auth.uid())
    );

-- Canon entries policies
CREATE POLICY "Users can manage canon in own projects" ON public.canon_entries
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.projects WHERE id = canon_entries.project_id AND user_id = auth.uid())
    );

-- Canon versions policies
CREATE POLICY "Users can view canon versions in own projects" ON public.canon_versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.canon_entries ce
            JOIN public.projects p ON ce.project_id = p.id
            WHERE ce.id = canon_versions.canon_entry_id AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create canon versions in own projects" ON public.canon_versions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.canon_entries ce
            JOIN public.projects p ON ce.project_id = p.id
            WHERE ce.id = canon_versions.canon_entry_id AND p.user_id = auth.uid()
        )
    );

-- Canon references policies
CREATE POLICY "Users can manage canon references in own projects" ON public.canon_references
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.canon_entries ce
            JOIN public.projects p ON ce.project_id = p.id
            WHERE ce.id = canon_references.canon_entry_id AND p.user_id = auth.uid()
        )
    );

-- Canon type-specific table policies
CREATE POLICY "Users can manage characters in own projects" ON public.canon_characters
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.projects WHERE id = canon_characters.project_id AND user_id = auth.uid())
    );

CREATE POLICY "Users can manage locations in own projects" ON public.canon_locations
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.projects WHERE id = canon_locations.project_id AND user_id = auth.uid())
    );

CREATE POLICY "Users can manage rules in own projects" ON public.canon_rules
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.projects WHERE id = canon_rules.project_id AND user_id = auth.uid())
    );

CREATE POLICY "Users can manage events in own projects" ON public.canon_events
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.projects WHERE id = canon_events.project_id AND user_id = auth.uid())
    );

CREATE POLICY "Users can manage themes in own projects" ON public.canon_themes
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.projects WHERE id = canon_themes.project_id AND user_id = auth.uid())
    );

-- Shots policies
CREATE POLICY "Users can manage shots in own projects" ON public.shots
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.projects WHERE id = shots.project_id AND user_id = auth.uid())
    );

-- AI generations policies
CREATE POLICY "Users can view own AI generations" ON public.ai_generations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create AI generations" ON public.ai_generations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Exports policies
CREATE POLICY "Users can manage own exports" ON public.exports
    FOR ALL USING (auth.uid() = user_id);

-- Metrics policies (users can only insert their own)
CREATE POLICY "Users can insert own metrics" ON public.metrics_events
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Timelines policies
CREATE POLICY "Users can manage timelines in own projects" ON public.timelines
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.projects WHERE id = timelines.project_id AND user_id = auth.uid())
    );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_chapters_updated_at BEFORE UPDATE ON public.chapters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_scenes_updated_at BEFORE UPDATE ON public.scenes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_canon_entries_updated_at BEFORE UPDATE ON public.canon_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_canon_characters_updated_at BEFORE UPDATE ON public.canon_characters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_canon_locations_updated_at BEFORE UPDATE ON public.canon_locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_canon_rules_updated_at BEFORE UPDATE ON public.canon_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_canon_events_updated_at BEFORE UPDATE ON public.canon_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_canon_themes_updated_at BEFORE UPDATE ON public.canon_themes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_shots_updated_at BEFORE UPDATE ON public.shots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_timelines_updated_at BEFORE UPDATE ON public.timelines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update word counts function
CREATE OR REPLACE FUNCTION update_word_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update scene word count
    IF TG_TABLE_NAME = 'scenes' THEN
        NEW.word_count := array_length(regexp_split_to_array(COALESCE(NEW.content, ''), '\s+'), 1);
    END IF;

    -- Update chapter word count
    IF TG_TABLE_NAME = 'chapters' THEN
        NEW.word_count := array_length(regexp_split_to_array(COALESCE(NEW.content, ''), '\s+'), 1);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_scene_word_count BEFORE INSERT OR UPDATE OF content ON public.scenes
    FOR EACH ROW EXECUTE FUNCTION update_word_counts();
CREATE TRIGGER update_chapter_word_count BEFORE INSERT OR UPDATE OF content ON public.chapters
    FOR EACH ROW EXECUTE FUNCTION update_word_counts();

-- Update project counts function
CREATE OR REPLACE FUNCTION update_project_counts()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.projects
    SET
        chapter_count = (SELECT COUNT(*) FROM public.chapters WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)),
        scene_count = (SELECT COUNT(*) FROM public.scenes WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)),
        word_count = (SELECT COALESCE(SUM(word_count), 0) FROM public.chapters WHERE project_id = COALESCE(NEW.project_id, OLD.project_id))
    WHERE id = COALESCE(NEW.project_id, OLD.project_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_chapter_count AFTER INSERT OR DELETE ON public.chapters
    FOR EACH ROW EXECUTE FUNCTION update_project_counts();
CREATE TRIGGER update_project_scene_count AFTER INSERT OR DELETE ON public.scenes
    FOR EACH ROW EXECUTE FUNCTION update_project_counts();

-- Canon search vector update
CREATE OR REPLACE FUNCTION update_canon_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', COALESCE(NEW.name, '') || ' ' || COALESCE(NEW.description, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_canon_search BEFORE INSERT OR UPDATE OF name, description ON public.canon_entries
    FOR EACH ROW EXECUTE FUNCTION update_canon_search_vector();

-- Create user profile on auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, display_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get user's effective feature flags
CREATE OR REPLACE FUNCTION get_user_features(p_user_id UUID)
RETURNS TABLE (feature_name TEXT, enabled BOOLEAN) AS $$
DECLARE
    v_tier subscription_tier;
BEGIN
    SELECT subscription_tier INTO v_tier FROM public.users WHERE id = p_user_id;

    RETURN QUERY
    SELECT
        f.name,
        CASE
            WHEN p_user_id = ANY(f.enabled_for_users) THEN TRUE
            WHEN v_tier = ANY(f.enabled_for_tiers) THEN TRUE
            WHEN f.enabled AND f.rollout_percentage >= 100 THEN TRUE
            WHEN f.enabled AND f.rollout_percentage > 0 THEN
                (hashtext(p_user_id::text) % 100) < f.rollout_percentage
            ELSE FALSE
        END
    FROM public.feature_flags f;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can access cinema mode
CREATE OR REPLACE FUNCTION can_access_cinema(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_tier subscription_tier;
BEGIN
    SELECT subscription_tier INTO v_tier FROM public.users WHERE id = p_user_id;
    RETURN v_tier IN ('studio', 'enterprise');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get canon for AI context loading
CREATE OR REPLACE FUNCTION get_project_canon_for_ai(p_project_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'characters', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id', c.id,
                'name', c.name,
                'description', ce.description,
                'personality', c.personality,
                'backstory', c.backstory,
                'relationships', c.relationships,
                'locked', ce.lock_status != 'unlocked'
            )), '[]'::jsonb)
            FROM public.canon_characters c
            JOIN public.canon_entries ce ON c.canon_entry_id = ce.id
            WHERE c.project_id = p_project_id AND ce.is_active = TRUE
        ),
        'locations', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id', l.id,
                'name', l.name,
                'description', ce.description,
                'atmosphere', l.atmosphere,
                'locked', ce.lock_status != 'unlocked'
            )), '[]'::jsonb)
            FROM public.canon_locations l
            JOIN public.canon_entries ce ON l.canon_entry_id = ce.id
            WHERE l.project_id = p_project_id AND ce.is_active = TRUE
        ),
        'rules', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id', r.id,
                'name', r.name,
                'description', ce.description,
                'constraints', r.constraints,
                'priority', r.priority,
                'locked', ce.lock_status != 'unlocked'
            )), '[]'::jsonb)
            FROM public.canon_rules r
            JOIN public.canon_entries ce ON r.canon_entry_id = ce.id
            WHERE r.project_id = p_project_id AND ce.is_active = TRUE
        ),
        'events', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id', e.id,
                'name', e.name,
                'description', ce.description,
                'story_date', e.story_date,
                'consequences', e.consequences,
                'locked', ce.lock_status != 'unlocked'
            ) ORDER BY e.relative_order), '[]'::jsonb)
            FROM public.canon_events e
            JOIN public.canon_entries ce ON e.canon_entry_id = ce.id
            WHERE e.project_id = p_project_id AND ce.is_active = TRUE
        ),
        'themes', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id', t.id,
                'name', t.name,
                'description', ce.description,
                'how_expressed', t.how_expressed,
                'locked', ce.lock_status != 'unlocked'
            )), '[]'::jsonb)
            FROM public.canon_themes t
            JOIN public.canon_entries ce ON t.canon_entry_id = ce.id
            WHERE t.project_id = p_project_id AND ce.is_active = TRUE
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- INITIAL DATA
-- ============================================

-- Insert default feature flags
INSERT INTO public.feature_flags (name, description, enabled, enabled_for_tiers) VALUES
    ('storyforge_mode', 'Access to StoryForge writing mode', TRUE, ARRAY['free', 'pro', 'studio', 'enterprise']::subscription_tier[]),
    ('cinema_mode', 'Access to Cinema visualization mode', TRUE, ARRAY['studio', 'enterprise']::subscription_tier[]),
    ('ai_generation', 'AI content generation', TRUE, ARRAY['free', 'pro', 'studio', 'enterprise']::subscription_tier[]),
    ('unlimited_projects', 'Unlimited project creation', TRUE, ARRAY['pro', 'studio', 'enterprise']::subscription_tier[]),
    ('canon_vault', 'Full Canon Vault access', TRUE, ARRAY['free', 'pro', 'studio', 'enterprise']::subscription_tier[]),
    ('advanced_exports', 'Advanced export formats (EPUB, Fountain)', TRUE, ARRAY['pro', 'studio', 'enterprise']::subscription_tier[]),
    ('shot_generation', 'AI shot prompt generation', TRUE, ARRAY['studio', 'enterprise']::subscription_tier[]),
    ('mood_boards', 'Mood board generation', TRUE, ARRAY['studio', 'enterprise']::subscription_tier[]),
    ('pitch_decks', 'Pitch deck generation', TRUE, ARRAY['studio', 'enterprise']::subscription_tier[]),
    ('api_access', 'API access for integrations', TRUE, ARRAY['enterprise']::subscription_tier[]),
    ('team_collaboration', 'Team collaboration features', TRUE, ARRAY['enterprise']::subscription_tier[]),
    ('demo_mode', 'Demo mode for showcasing', TRUE, ARRAY['free', 'pro', 'studio', 'enterprise']::subscription_tier[])
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE public.users IS 'User profiles extending Supabase auth, includes subscription and usage tracking';
COMMENT ON TABLE public.projects IS 'Writing projects with mode awareness (storyforge/cinema)';
COMMENT ON TABLE public.chapters IS 'Chapters within projects';
COMMENT ON TABLE public.scenes IS 'Scenes within chapters with semantic data for cinema translation';
COMMENT ON TABLE public.canon_entries IS 'Master table for all canon vault entries';
COMMENT ON TABLE public.shots IS 'Cinema mode: visual shots generated from scenes';
COMMENT ON TABLE public.feature_flags IS 'Feature flag configuration for tier-based access control';
