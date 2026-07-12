-- ============================================================
-- GREEN BUBBLES AUTONOMOUS DEFENSE ORCHESTRATOR
-- FILE: migrations/04_green_bubbles_defense.sql
-- PostgreSQL / Supabase
-- ============================================================
-- Two-path security architecture:
--   TRUSTED PATH   → normal application flow
--   SUSPICIOUS PATH → Green Bubbles Island (score → isolate →
--                     observe → classify → contain → learn →
--                     preserve forensics → destroy bubble →
--                     update dashboard → generate report)
-- ============================================================

-- ============================================================
-- 1. THREAT PROFILES
--    Persistent defensive intelligence — survives bubble destruction.
--    One profile per unique threat fingerprint.
-- ============================================================

CREATE TABLE IF NOT EXISTS threat_profiles (
    id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    fingerprint          TEXT        NOT NULL UNIQUE,
    artifact_hash        TEXT,
    classification       TEXT        NOT NULL DEFAULT 'unknown'
        CHECK (classification IN (
            'unknown', 'benign', 'suspicious', 'malicious',
            'critical', 'coordinated_attack'
        )),
    first_seen_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    detection_count      INTEGER     NOT NULL DEFAULT 1
        CHECK (detection_count >= 1),
    highest_risk_score   INTEGER     NOT NULL DEFAULT 0
        CHECK (highest_risk_score BETWEEN 0 AND 100),
    current_risk_level   TEXT        NOT NULL DEFAULT 'low'
        CHECK (current_risk_level IN (
            'low', 'elevated', 'high', 'severe', 'critical'
        )),
    behavior_summary     TEXT,
    known_indicators     JSONB       NOT NULL DEFAULT '[]'::jsonb,
    recommended_response TEXT        NOT NULL DEFAULT 'monitor',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_threat_profiles_fingerprint
    ON threat_profiles(fingerprint);
CREATE INDEX IF NOT EXISTS idx_threat_profiles_classification
    ON threat_profiles(classification);
CREATE INDEX IF NOT EXISTS idx_threat_profiles_risk_level
    ON threat_profiles(current_risk_level);
CREATE INDEX IF NOT EXISTS idx_threat_profiles_last_seen
    ON threat_profiles(last_seen_at DESC);


-- ============================================================
-- 2. ANALYSIS RUNS
--    One row per model-execution pass on a suspicious event.
--    Five models → five rows per analysis cycle.
-- ============================================================

CREATE TABLE IF NOT EXISTS analysis_runs (
    id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    bubble_id          TEXT        NOT NULL,
    threat_profile_id  UUID
        REFERENCES threat_profiles(id)
        ON DELETE SET NULL,
    analysis_type      TEXT        NOT NULL
        CHECK (analysis_type IN (
            'signature',
            'static_structure',
            'behavior_telemetry',
            'network_movement',
            'trust_context'
        )),
    model_name         TEXT        NOT NULL,
    model_version      TEXT        NOT NULL DEFAULT '1.0.0',
    status             TEXT        NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending', 'running', 'completed', 'failed', 'timeout'
        )),
    risk_score         INTEGER
        CHECK (risk_score IS NULL OR risk_score BETWEEN 0 AND 100),
    confidence         INTEGER
        CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 100),
    started_at         TIMESTAMPTZ,
    completed_at       TIMESTAMPTZ,
    metadata           JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analysis_runs_bubble
    ON analysis_runs(bubble_id);
CREATE INDEX IF NOT EXISTS idx_analysis_runs_profile
    ON analysis_runs(threat_profile_id);
CREATE INDEX IF NOT EXISTS idx_analysis_runs_status
    ON analysis_runs(status);
CREATE INDEX IF NOT EXISTS idx_analysis_runs_type
    ON analysis_runs(analysis_type);
CREATE INDEX IF NOT EXISTS idx_analysis_runs_created
    ON analysis_runs(created_at DESC);


-- ============================================================
-- 3. THREAT OBSERVATIONS
--    Sanitized behavioral telemetry extracted from an analysis run.
--    Stored after bubble destruction — never stores active malware.
-- ============================================================

CREATE TABLE IF NOT EXISTS threat_observations (
    id                 BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    analysis_run_id    UUID        NOT NULL
        REFERENCES analysis_runs(id)
        ON DELETE CASCADE,
    observation_type   TEXT        NOT NULL
        CHECK (observation_type IN (
            'file_activity',
            'process_activity',
            'network_metadata',
            'persistence_attempt',
            'privilege_change',
            'data_access',
            'movement_pattern',
            'target_type',
            'timeline_event',
            'model_finding'
        )),
    timestamp_offset_ms BIGINT     NOT NULL DEFAULT 0,
    subject            TEXT        NOT NULL,
    action             TEXT        NOT NULL,
    target             TEXT,
    severity           TEXT        NOT NULL DEFAULT 'info'
        CHECK (severity IN (
            'info', 'warning', 'high', 'critical'
        )),
    metadata           JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_observations_run
    ON threat_observations(analysis_run_id);
CREATE INDEX IF NOT EXISTS idx_observations_type
    ON threat_observations(observation_type);
CREATE INDEX IF NOT EXISTS idx_observations_severity
    ON threat_observations(severity);
CREATE INDEX IF NOT EXISTS idx_observations_created
    ON threat_observations(created_at DESC);


-- ============================================================
-- 4. CONTAINMENT ACTIONS
--    Every autonomous or manually triggered defensive action.
--    Includes reversal information — no irreversible action
--    without an explicit reversal path recorded.
-- ============================================================

CREATE TABLE IF NOT EXISTS containment_actions (
    id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    security_decision_id TEXT        NOT NULL,
    action_type          TEXT        NOT NULL
        CHECK (action_type IN (
            'allow',
            'challenge',
            'rate_limit',
            'deny',
            'quarantine',
            'isolate_session',
            'hold_transaction',
            'disable_sensitive_operation',
            'expire_session',
            'require_reauthentication'
        )),
    status               TEXT        NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending', 'active', 'completed', 'failed', 'reversed'
        )),
    scope                TEXT        NOT NULL DEFAULT 'request',
    reason               TEXT        NOT NULL,
    automatic            BOOLEAN     NOT NULL DEFAULT TRUE,
    trigger_signal       TEXT,
    policy_name          TEXT,
    resource_affected    TEXT,
    reversal_path        TEXT,
    started_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at         TIMESTAMPTZ,
    metadata             JSONB       NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_containment_decision
    ON containment_actions(security_decision_id);
CREATE INDEX IF NOT EXISTS idx_containment_action_type
    ON containment_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_containment_status
    ON containment_actions(status);
CREATE INDEX IF NOT EXISTS idx_containment_started
    ON containment_actions(started_at DESC);


-- ============================================================
-- 5. SECURITY CAPACITY
--    Single-row live capacity snapshot — upserted by the orchestrator.
--    Also tracks historical snapshots for trending.
-- ============================================================

CREATE TABLE IF NOT EXISTS security_capacity (
    id                          BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    active_bubbles              INTEGER     NOT NULL DEFAULT 0
        CHECK (active_bubbles >= 0),
    queued_jobs                 INTEGER     NOT NULL DEFAULT 0
        CHECK (queued_jobs >= 0),
    rejected_jobs               INTEGER     NOT NULL DEFAULT 0
        CHECK (rejected_jobs >= 0),
    analysis_capacity_percent   INTEGER     NOT NULL DEFAULT 0
        CHECK (analysis_capacity_percent BETWEEN 0 AND 100),
    gateway_load_percent        INTEGER     NOT NULL DEFAULT 0
        CHECK (gateway_load_percent BETWEEN 0 AND 100),
    quarantine_storage_percent  INTEGER     NOT NULL DEFAULT 0
        CHECK (quarantine_storage_percent BETWEEN 0 AND 100),
    events_per_minute           INTEGER     NOT NULL DEFAULT 0
        CHECK (events_per_minute >= 0),
    requests_per_minute         INTEGER     NOT NULL DEFAULT 0
        CHECK (requests_per_minute >= 0),
    load_shedding_active        BOOLEAN     NOT NULL DEFAULT FALSE,
    circuit_breaker_open        BOOLEAN     NOT NULL DEFAULT FALSE,
    last_updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_capacity_updated
    ON security_capacity(last_updated_at DESC);


-- ============================================================
-- 6. DAILY SECURITY REPORTS
--    One row per calendar day per timezone config.
--    Generated automatically by the orchestrator.
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_security_reports (
    id                        UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    report_date               DATE        NOT NULL,
    timezone                  TEXT        NOT NULL DEFAULT 'UTC',
    total_requests            INTEGER     NOT NULL DEFAULT 0,
    allowed_requests          INTEGER     NOT NULL DEFAULT 0,
    challenged_requests       INTEGER     NOT NULL DEFAULT 0,
    denied_requests           INTEGER     NOT NULL DEFAULT 0,
    quarantined_objects       INTEGER     NOT NULL DEFAULT 0,
    threats_detected          INTEGER     NOT NULL DEFAULT 0,
    unique_threat_profiles    INTEGER     NOT NULL DEFAULT 0,
    critical_events           INTEGER     NOT NULL DEFAULT 0,
    high_events               INTEGER     NOT NULL DEFAULT 0,
    medium_events             INTEGER     NOT NULL DEFAULT 0,
    low_events                INTEGER     NOT NULL DEFAULT 0,
    bubbles_created           INTEGER     NOT NULL DEFAULT 0,
    bubbles_destroyed         INTEGER     NOT NULL DEFAULT 0,
    analysis_jobs_completed   INTEGER     NOT NULL DEFAULT 0,
    analysis_jobs_failed      INTEGER     NOT NULL DEFAULT 0,
    peak_capacity_percent     INTEGER     NOT NULL DEFAULT 0
        CHECK (peak_capacity_percent BETWEEN 0 AND 100),
    repairs_completed         INTEGER     NOT NULL DEFAULT 0,
    repairs_failed            INTEGER     NOT NULL DEFAULT 0,
    transactions_held         INTEGER     NOT NULL DEFAULT 0,
    summary                   TEXT,
    recommendations           JSONB       NOT NULL DEFAULT '[]'::jsonb,
    generated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (report_date, timezone)
);

CREATE INDEX IF NOT EXISTS idx_daily_reports_date
    ON daily_security_reports(report_date DESC);


-- ============================================================
-- 7. SECURITY DECISIONS
--    Master decision record — one per evaluated suspicious event.
--    Links raw event → analysis runs → containment actions.
-- ============================================================

CREATE TABLE IF NOT EXISTS security_decisions (
    id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    event_source       TEXT        NOT NULL,
    event_type         TEXT        NOT NULL,
    fingerprint        TEXT,
    threat_profile_id  UUID
        REFERENCES threat_profiles(id)
        ON DELETE SET NULL,
    path               TEXT        NOT NULL DEFAULT 'trusted'
        CHECK (path IN ('trusted', 'suspicious')),
    composite_risk     INTEGER     NOT NULL DEFAULT 0
        CHECK (composite_risk BETWEEN 0 AND 100),
    risk_color         TEXT        NOT NULL DEFAULT 'green'
        CHECK (risk_color IN (
            'green', 'yellow', 'orange', 'red', 'dark_red'
        )),
    final_action       TEXT        NOT NULL DEFAULT 'allow'
        CHECK (final_action IN (
            'allow', 'challenge', 'rate_limit', 'deny',
            'quarantine', 'isolate_session', 'hold_transaction',
            'disable_sensitive_operation', 'expire_session',
            'require_reauthentication'
        )),
    model_agreement    BOOLEAN     NOT NULL DEFAULT TRUE,
    bubble_id          TEXT,
    bubble_destroyed   BOOLEAN     NOT NULL DEFAULT FALSE,
    request_metadata   JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decisions_fingerprint
    ON security_decisions(fingerprint);
CREATE INDEX IF NOT EXISTS idx_decisions_path
    ON security_decisions(path);
CREATE INDEX IF NOT EXISTS idx_decisions_risk_color
    ON security_decisions(risk_color);
CREATE INDEX IF NOT EXISTS idx_decisions_final_action
    ON security_decisions(final_action);
CREATE INDEX IF NOT EXISTS idx_decisions_created
    ON security_decisions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decisions_profile
    ON security_decisions(threat_profile_id);


-- ============================================================
-- 8. AUTO UPDATED_AT FOR THREAT PROFILES
-- ============================================================

CREATE OR REPLACE FUNCTION gb_update_threat_profile_ts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_threat_profile_updated_at ON threat_profiles;
CREATE TRIGGER trg_threat_profile_updated_at
BEFORE UPDATE ON threat_profiles
FOR EACH ROW
EXECUTE FUNCTION gb_update_threat_profile_ts();


-- ============================================================
-- 9. THREAT PROFILE UPSERT FUNCTION
--    Called by the orchestrator when a new event arrives.
--    Fingerprint-based correlation: match → update, new → create.
--    Historical similarity does NOT automatically prove same origin.
-- ============================================================

CREATE OR REPLACE FUNCTION upsert_threat_profile(
    p_fingerprint        TEXT,
    p_artifact_hash      TEXT,
    p_classification     TEXT,
    p_risk_score         INTEGER,
    p_risk_level         TEXT,
    p_behavior_summary   TEXT,
    p_indicators         JSONB,
    p_recommended_action TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO threat_profiles (
        fingerprint,
        artifact_hash,
        classification,
        highest_risk_score,
        current_risk_level,
        behavior_summary,
        known_indicators,
        recommended_response,
        last_seen_at,
        detection_count
    )
    VALUES (
        p_fingerprint,
        p_artifact_hash,
        p_classification,
        p_risk_score,
        p_risk_level,
        p_behavior_summary,
        p_indicators,
        p_recommended_action,
        NOW(),
        1
    )
    ON CONFLICT (fingerprint) DO UPDATE SET
        last_seen_at       = NOW(),
        detection_count    = threat_profiles.detection_count + 1,
        highest_risk_score = GREATEST(
                                 threat_profiles.highest_risk_score,
                                 p_risk_score
                             ),
        current_risk_level = CASE
            WHEN p_risk_score >= 90 THEN 'critical'
            WHEN p_risk_score >= 70 THEN 'severe'
            WHEN p_risk_score >= 50 THEN 'high'
            WHEN p_risk_score >= 25 THEN 'elevated'
            ELSE threat_profiles.current_risk_level
        END,
        behavior_summary   = COALESCE(p_behavior_summary,
                                      threat_profiles.behavior_summary),
        recommended_response = p_recommended_action
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;


-- ============================================================
-- 10. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE threat_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_runs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE threat_observations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE containment_actions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_capacity     ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_security_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_decisions    ENABLE ROW LEVEL SECURITY;

-- Remove legacy open policies if they exist.
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'threat_profiles','analysis_runs','threat_observations',
        'containment_actions','security_capacity',
        'daily_security_reports','security_decisions'
    ] LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS "Allow all" ON %I',
            t
        );
    END LOOP;
END $$;

-- Authenticated users may read security dashboards (read-only).

CREATE POLICY "auth_read_threat_profiles"
    ON threat_profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_read_analysis_runs"
    ON analysis_runs FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_read_threat_observations"
    ON threat_observations FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_read_containment_actions"
    ON containment_actions FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_read_security_capacity"
    ON security_capacity FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_read_daily_security_reports"
    ON daily_security_reports FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_read_security_decisions"
    ON security_decisions FOR SELECT TO authenticated USING (true);

-- All writes (INSERT/UPDATE/DELETE) are backend-only (service-role key).


-- ============================================================
-- 11. SUPABASE REALTIME — SAFE TO RE-RUN
-- ============================================================

DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'threat_profiles',
        'analysis_runs',
        'containment_actions',
        'security_capacity',
        'daily_security_reports',
        'security_decisions'
    ] LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM pg_publication_tables
            WHERE pubname    = 'supabase_realtime'
              AND schemaname = 'public'
              AND tablename  = t
        ) THEN
            EXECUTE format(
                'ALTER PUBLICATION supabase_realtime ADD TABLE %I',
                t
            );
        END IF;
    END LOOP;
END $$;
