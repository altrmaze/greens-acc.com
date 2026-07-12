-- ============================================================
-- GREENS ACC / AEGIS SELF-HEALING SYSTEM
-- FILE: migrations/03_aegis_self_healing.sql
-- PostgreSQL / Supabase
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- 1. ALGORITHMS REGISTRY
-- ============================================================

CREATE TABLE IF NOT EXISTS algorithms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    algo_type TEXT NOT NULL,
    icon TEXT,
    health INTEGER NOT NULL DEFAULT 100
        CHECK (health BETWEEN 0 AND 100),
    status TEXT NOT NULL DEFAULT 'healthy'
        CHECK (status IN (
            'healthy',
            'warning',
            'glitching',
            'repairing',
            'offline'
        )),
    endpoint TEXT,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_check TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 2. GLITCHES / ANOMALIES DETECTED
-- ============================================================

CREATE TABLE IF NOT EXISTS glitches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    algorithm_id UUID NOT NULL
        REFERENCES algorithms(id)
        ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT NOT NULL DEFAULT 'warning'
        CHECK (severity IN (
            'critical',
            'warning',
            'info'
        )),
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN (
            'open',
            'repairing',
            'resolved',
            'failed'
        )),
    error_code TEXT,
    stack_trace TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    repair_attempts INTEGER NOT NULL DEFAULT 0
        CHECK (repair_attempts >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 3. REPAIR OPERATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS repairs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    glitch_id UUID NOT NULL
        REFERENCES glitches(id)
        ON DELETE CASCADE,
    algorithm_id UUID NOT NULL
        REFERENCES algorithms(id)
        ON DELETE CASCADE,
    strategy TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending',
            'running',
            'success',
            'failed',
            'rolled_back'
        )),
    ai_confidence DECIMAL(5,2)
        CHECK (
            ai_confidence IS NULL
            OR ai_confidence BETWEEN 0 AND 100
        ),
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    logs TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER
        CHECK (
            duration_ms IS NULL
            OR duration_ms >= 0
        ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 4. INDIVIDUAL REPAIR STEPS
-- ============================================================

CREATE TABLE IF NOT EXISTS repair_steps (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    repair_id UUID NOT NULL
        REFERENCES repairs(id)
        ON DELETE CASCADE,
    step_number INTEGER NOT NULL
        CHECK (step_number > 0),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending',
            'running',
            'success',
            'failed',
            'rolled_back'
        )),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (repair_id, step_number)
);


-- ============================================================
-- 5. PERFORMANCE TIME-SERIES METRICS
-- ============================================================

CREATE TABLE IF NOT EXISTS metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    algorithm_id UUID
        REFERENCES algorithms(id)
        ON DELETE SET NULL,
    metric_type TEXT NOT NULL
        CHECK (metric_type IN (
            'cpu',
            'memory',
            'network',
            'error_rate',
            'latency',
            'throughput'
        )),
    value DECIMAL(14,4) NOT NULL,
    unit TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 6. SYSTEM EVENTS / AUDIT TIMELINE
-- ============================================================

CREATE TABLE IF NOT EXISTS events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_type TEXT NOT NULL
        CHECK (event_type IN (
            'glitch_detected',
            'repair_started',
            'repair_completed',
            'repair_failed',
            'repair_rolled_back',
            'health_changed',
            'system_alert'
        )),
    algorithm_id UUID
        REFERENCES algorithms(id)
        ON DELETE SET NULL,
    glitch_id UUID
        REFERENCES glitches(id)
        ON DELETE SET NULL,
    repair_id UUID
        REFERENCES repairs(id)
        ON DELETE SET NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info'
        CHECK (severity IN (
            'info',
            'warning',
            'error',
            'success'
        )),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 7. AI AGENT STATE
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_agent_state (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    agent_id TEXT NOT NULL UNIQUE,
    current_strategy TEXT,
    learning_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    success_rate DECIMAL(5,2) NOT NULL DEFAULT 0
        CHECK (success_rate BETWEEN 0 AND 100),
    total_repairs INTEGER NOT NULL DEFAULT 0
        CHECK (total_repairs >= 0),
    successful_repairs INTEGER NOT NULL DEFAULT 0
        CHECK (successful_repairs >= 0),
    active_repair_count INTEGER NOT NULL DEFAULT 0
        CHECK (active_repair_count >= 0),
    last_action_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 8. PERFORMANCE INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_algorithms_status
ON algorithms(status);

CREATE INDEX IF NOT EXISTS idx_glitches_status
ON glitches(status);

CREATE INDEX IF NOT EXISTS idx_glitches_algorithm
ON glitches(algorithm_id);

CREATE INDEX IF NOT EXISTS idx_glitches_detected_at
ON glitches(detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_repairs_status
ON repairs(status);

CREATE INDEX IF NOT EXISTS idx_repairs_glitch
ON repairs(glitch_id);

CREATE INDEX IF NOT EXISTS idx_repairs_algorithm
ON repairs(algorithm_id);

CREATE INDEX IF NOT EXISTS idx_repair_steps_repair
ON repair_steps(repair_id, step_number);

CREATE INDEX IF NOT EXISTS idx_metrics_type_time
ON metrics(metric_type, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_metrics_algorithm_time
ON metrics(algorithm_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_time
ON events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_algorithm
ON events(algorithm_id);


-- ============================================================
-- 9. AUTOMATIC UPDATED_AT
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS algorithms_updated_at
ON algorithms;

CREATE TRIGGER algorithms_updated_at
BEFORE UPDATE ON algorithms
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();


DROP TRIGGER IF EXISTS ai_agent_state_updated_at
ON ai_agent_state;

CREATE TRIGGER ai_agent_state_updated_at
BEFORE UPDATE ON ai_agent_state
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- 10. AUTOMATIC GLITCH EVENT + HEALTH PENALTY
-- ============================================================

CREATE OR REPLACE FUNCTION on_glitch_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    health_penalty INTEGER;
BEGIN
    health_penalty :=
        CASE NEW.severity
            WHEN 'critical' THEN 30
            WHEN 'warning' THEN 15
            WHEN 'info' THEN 5
            ELSE 10
        END;

    INSERT INTO events (
        event_type,
        algorithm_id,
        glitch_id,
        message,
        severity
    )
    VALUES (
        'glitch_detected',
        NEW.algorithm_id,
        NEW.id,
        'Glitch detected: ' || NEW.title,
        CASE
            WHEN NEW.severity = 'critical' THEN 'error'
            WHEN NEW.severity = 'warning' THEN 'warning'
            ELSE 'info'
        END
    );

    UPDATE algorithms
    SET
        status =
            CASE
                WHEN NEW.severity = 'critical'
                    THEN 'glitching'
                ELSE 'warning'
            END,
        health = GREATEST(
            health - health_penalty,
            0
        ),
        last_check = NOW()
    WHERE id = NEW.algorithm_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS glitch_created_event
ON glitches;

CREATE TRIGGER glitch_created_event
AFTER INSERT ON glitches
FOR EACH ROW
EXECUTE FUNCTION on_glitch_created();


-- ============================================================
-- 11. REPAIR STATE-MACHINE VALIDATION
-- ============================================================

CREATE OR REPLACE FUNCTION validate_repair_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    IF NOT (
        (
            OLD.status = 'pending'
            AND NEW.status IN ('running', 'failed')
        )
        OR
        (
            OLD.status = 'running'
            AND NEW.status IN (
                'success',
                'failed',
                'rolled_back'
            )
        )
        OR
        (
            OLD.status = 'failed'
            AND NEW.status = 'running'
        )
    ) THEN
        RAISE EXCEPTION
            'Invalid repair transition: % -> %',
            OLD.status,
            NEW.status;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_repair_status
ON repairs;

CREATE TRIGGER validate_repair_status
BEFORE UPDATE OF status ON repairs
FOR EACH ROW
EXECUTE FUNCTION validate_repair_transition();


-- ============================================================
-- 12. REPAIR STATUS AUTOMATION
-- ============================================================

CREATE OR REPLACE FUNCTION on_repair_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    unresolved_count INTEGER;
BEGIN
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NEW;
    END IF;


    -- REPAIR STARTED
    IF NEW.status = 'running' THEN

        INSERT INTO events (
            event_type,
            algorithm_id,
            glitch_id,
            repair_id,
            message,
            severity
        )
        VALUES (
            'repair_started',
            NEW.algorithm_id,
            NEW.glitch_id,
            NEW.id,
            'AI repair started: ' || NEW.strategy,
            'info'
        );

        UPDATE glitches
        SET status = 'repairing'
        WHERE id = NEW.glitch_id;

        UPDATE algorithms
        SET
            status = 'repairing',
            last_check = NOW()
        WHERE id = NEW.algorithm_id;


    -- REPAIR SUCCESSFUL
    ELSIF NEW.status = 'success' THEN

        INSERT INTO events (
            event_type,
            algorithm_id,
            glitch_id,
            repair_id,
            message,
            severity
        )
        VALUES (
            'repair_completed',
            NEW.algorithm_id,
            NEW.glitch_id,
            NEW.id,
            'AI repair completed successfully',
            'success'
        );

        UPDATE glitches
        SET
            status = 'resolved',
            resolved_at = NOW(),
            repair_attempts = repair_attempts + 1
        WHERE id = NEW.glitch_id;

        SELECT COUNT(*)
        INTO unresolved_count
        FROM glitches
        WHERE algorithm_id = NEW.algorithm_id
          AND id <> NEW.glitch_id
          AND status IN (
              'open',
              'repairing',
              'failed'
          );

        IF unresolved_count > 0 THEN
            UPDATE algorithms
            SET
                status = 'warning',
                health = LEAST(health + 10, 100),
                last_check = NOW()
            WHERE id = NEW.algorithm_id;
        ELSE
            UPDATE algorithms
            SET
                status = 'healthy',
                health = LEAST(health + 20, 100),
                last_check = NOW()
            WHERE id = NEW.algorithm_id;
        END IF;


    -- REPAIR FAILED
    ELSIF NEW.status = 'failed' THEN

        INSERT INTO events (
            event_type,
            algorithm_id,
            glitch_id,
            repair_id,
            message,
            severity
        )
        VALUES (
            'repair_failed',
            NEW.algorithm_id,
            NEW.glitch_id,
            NEW.id,
            'AI repair failed. Escalation required.',
            'error'
        );

        UPDATE glitches
        SET
            status = 'open',
            repair_attempts = repair_attempts + 1
        WHERE id = NEW.glitch_id;

        UPDATE algorithms
        SET
            status = 'warning',
            last_check = NOW()
        WHERE id = NEW.algorithm_id;


    -- REPAIR ROLLED BACK
    ELSIF NEW.status = 'rolled_back' THEN

        INSERT INTO events (
            event_type,
            algorithm_id,
            glitch_id,
            repair_id,
            message,
            severity
        )
        VALUES (
            'repair_rolled_back',
            NEW.algorithm_id,
            NEW.glitch_id,
            NEW.id,
            'Repair was rolled back',
            'warning'
        );

        UPDATE glitches
        SET status = 'open'
        WHERE id = NEW.glitch_id;

        UPDATE algorithms
        SET
            status = 'warning',
            last_check = NOW()
        WHERE id = NEW.algorithm_id;

    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS repair_status_event
ON repairs;

CREATE TRIGGER repair_status_event
AFTER UPDATE OF status ON repairs
FOR EACH ROW
EXECUTE FUNCTION on_repair_status_change();


-- ============================================================
-- 13. ATOMIC AI AGENT STATISTICS
-- ============================================================

CREATE OR REPLACE FUNCTION record_agent_repair(
    p_agent_id TEXT,
    p_success BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO ai_agent_state (
        agent_id,
        current_strategy,
        total_repairs,
        successful_repairs,
        success_rate,
        last_action_at
    )
    VALUES (
        p_agent_id,
        'monitoring',
        1,
        CASE WHEN p_success THEN 1 ELSE 0 END,
        CASE WHEN p_success THEN 100 ELSE 0 END,
        NOW()
    )

    ON CONFLICT (agent_id)

    DO UPDATE SET
        total_repairs =
            ai_agent_state.total_repairs + 1,

        successful_repairs =
            ai_agent_state.successful_repairs
            + CASE
                WHEN p_success THEN 1
                ELSE 0
              END,

        success_rate =
            ROUND(
                (
                    (
                        ai_agent_state.successful_repairs
                        + CASE
                            WHEN p_success THEN 1
                            ELSE 0
                          END
                    )::NUMERIC
                    /
                    (
                        ai_agent_state.total_repairs + 1
                    )
                ) * 100,
                2
            ),

        current_strategy = 'monitoring',
        last_action_at = NOW();
END;
$$;


-- ============================================================
-- 14. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE algorithms ENABLE ROW LEVEL SECURITY;
ALTER TABLE glitches ENABLE ROW LEVEL SECURITY;
ALTER TABLE repairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_state ENABLE ROW LEVEL SECURITY;


-- Remove previous unsafe policies.

DROP POLICY IF EXISTS "Allow all" ON algorithms;
DROP POLICY IF EXISTS "Allow all" ON glitches;
DROP POLICY IF EXISTS "Allow all" ON repairs;
DROP POLICY IF EXISTS "Allow all" ON repair_steps;
DROP POLICY IF EXISTS "Allow all" ON metrics;
DROP POLICY IF EXISTS "Allow all" ON events;
DROP POLICY IF EXISTS "Allow all" ON ai_agent_state;


-- Authenticated dashboard read-only access.

DROP POLICY IF EXISTS "authenticated_read_algorithms"
ON algorithms;

CREATE POLICY "authenticated_read_algorithms"
ON algorithms
FOR SELECT
TO authenticated
USING (true);


DROP POLICY IF EXISTS "authenticated_read_glitches"
ON glitches;

CREATE POLICY "authenticated_read_glitches"
ON glitches
FOR SELECT
TO authenticated
USING (true);


DROP POLICY IF EXISTS "authenticated_read_repairs"
ON repairs;

CREATE POLICY "authenticated_read_repairs"
ON repairs
FOR SELECT
TO authenticated
USING (true);


DROP POLICY IF EXISTS "authenticated_read_repair_steps"
ON repair_steps;

CREATE POLICY "authenticated_read_repair_steps"
ON repair_steps
FOR SELECT
TO authenticated
USING (true);


DROP POLICY IF EXISTS "authenticated_read_metrics"
ON metrics;

CREATE POLICY "authenticated_read_metrics"
ON metrics
FOR SELECT
TO authenticated
USING (true);


DROP POLICY IF EXISTS "authenticated_read_events"
ON events;

CREATE POLICY "authenticated_read_events"
ON events
FOR SELECT
TO authenticated
USING (true);


-- ai_agent_state remains backend-only.
-- The Supabase service-role key can access it from the server.


-- ============================================================
-- 15. SUPABASE REALTIME
-- SAFE TO RE-RUN
-- ============================================================

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'algorithms'
    ) THEN
        ALTER PUBLICATION supabase_realtime
        ADD TABLE algorithms;
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'glitches'
    ) THEN
        ALTER PUBLICATION supabase_realtime
        ADD TABLE glitches;
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'repairs'
    ) THEN
        ALTER PUBLICATION supabase_realtime
        ADD TABLE repairs;
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'repair_steps'
    ) THEN
        ALTER PUBLICATION supabase_realtime
        ADD TABLE repair_steps;
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'metrics'
    ) THEN
        ALTER PUBLICATION supabase_realtime
        ADD TABLE metrics;
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'events'
    ) THEN
        ALTER PUBLICATION supabase_realtime
        ADD TABLE events;
    END IF;

END $$;
