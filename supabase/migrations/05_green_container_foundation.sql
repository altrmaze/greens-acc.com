-- ============================================================
-- GREEN CONTAINER FOUNDATION
-- FILE: migrations/05_green_container_foundation.sql
-- PostgreSQL / Supabase
-- ============================================================
-- Phase 1: Core Green Container schema.
--
-- Tables created here:
--   green_containers             — master container per customer
--   green_container_objects      — individual vault items
--   green_container_permissions  — permission grants
--   green_container_consents     — purpose-scoped consent records
--   green_container_events       — lifecycle events
--   green_container_access_log   — every access record (audit)
--   green_container_integrity_checks — hash verification
--   agent_registry               — registered agent catalog
--   agent_permissions            — scoped agent+customer grants
--   agent_tasks                  — task queue
--   agent_actions                — action audit log
--   automation_rules             — customer-configured bounds
--   automation_approvals         — customer approvals
--   payment_authorizations       — payment tokens (never raw creds)
--   trust_decisions              — trust engine decisions
--   external_connectors          — registered external services
--   connector_actions            — connector execution log
-- ============================================================
--
-- SECURITY NON-NEGOTIABLES enforced here:
--   • All tables have RLS enabled
--   • No open "allow everything" policies
--   • Write access is service-role only (backend)
--   • Customers can read only their own container data
--   • Agents can read only what their permission record allows
-- ============================================================

-- ============================================================
-- 1. VAULT DOMAIN ENUM
--    Maps to the security domains defined in the directive.
-- ============================================================

DO $$ BEGIN
    CREATE TYPE vault_domain AS ENUM (
        'identity',
        'document',
        'financial_authorization',
        'travel_profile',
        'household_profile',
        'wellness_profile',
        'business_profile',
        'automation_settings'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 2. AUTOMATION LEVEL ENUM
--    Mirrors the four authorization tiers in the directive.
-- ============================================================

DO $$ BEGIN
    CREATE TYPE automation_level AS ENUM (
        'level_1_information',
        'level_2_preparation',
        'level_3_authorized_transaction',
        'level_4_high_risk'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 3. GREEN CONTAINERS
--    One row per customer. The master container record.
--    Linked to Supabase Auth via customer_id = auth.users.id.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.green_containers (
    id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id         UUID        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    display_name        TEXT,
    container_status    TEXT        NOT NULL DEFAULT 'active'
        CHECK (container_status IN ('active', 'locked', 'quarantined', 'suspended', 'archived')),
    integrity_hash      TEXT,                               -- SHA-256 of current container state
    last_integrity_check TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (customer_id)
);

CREATE INDEX IF NOT EXISTS idx_green_containers_customer
    ON public.green_containers (customer_id);
CREATE INDEX IF NOT EXISTS idx_green_containers_status
    ON public.green_containers (container_status);

-- ============================================================
-- 4. GREEN CONTAINER OBJECTS
--    Individual vault items inside a container.
--    Files (documents) are stored in private object storage;
--    this table holds only metadata and references.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.green_container_objects (
    id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    container_id        UUID        NOT NULL
        REFERENCES public.green_containers (id) ON DELETE CASCADE,
    vault_domain        vault_domain NOT NULL,
    object_type         TEXT        NOT NULL,               -- e.g. 'passport', 'invoice', 'travel_preference'
    display_label       TEXT,
    storage_reference   TEXT,                               -- pointer to private object storage (never a public URL)
    content_hash        TEXT,                               -- SHA-256 of the stored file/record
    encryption_key_ref  TEXT,                               -- KMS key reference (never the key itself)
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    expires_at          TIMESTAMPTZ,                        -- NULL = no expiry
    metadata            JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gc_objects_container
    ON public.green_container_objects (container_id);
CREATE INDEX IF NOT EXISTS idx_gc_objects_vault_domain
    ON public.green_container_objects (vault_domain);
CREATE INDEX IF NOT EXISTS idx_gc_objects_type
    ON public.green_container_objects (object_type);
CREATE INDEX IF NOT EXISTS idx_gc_objects_active
    ON public.green_container_objects (is_active);

-- ============================================================
-- 5. GREEN CONTAINER PERMISSIONS
--    Grants an agent (or user) access to specific objects
--    within a container, for a specific purpose, for a
--    limited duration.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.green_container_permissions (
    id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    container_id        UUID        NOT NULL
        REFERENCES public.green_containers (id) ON DELETE CASCADE,
    object_id           UUID
        REFERENCES public.green_container_objects (id) ON DELETE CASCADE,
    -- NULL object_id means the permission applies to all objects
    -- in the specified vault_domain
    vault_domain        vault_domain,
    grantee_type        TEXT        NOT NULL
        CHECK (grantee_type IN ('agent', 'user', 'service')),
    grantee_id          TEXT        NOT NULL,               -- agent name or user UUID
    allowed_actions     TEXT[]      NOT NULL DEFAULT '{}',  -- e.g. '{read}', '{read,write}'
    purpose             TEXT        NOT NULL,               -- human-readable purpose statement
    automation_level    automation_level NOT NULL DEFAULT 'level_1_information',
    granted_by          UUID        NOT NULL,               -- customer UUID who granted
    granted_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at          TIMESTAMPTZ NOT NULL,               -- short-lived; REQUIRED
    revoked_at          TIMESTAMPTZ,
    revoke_reason       TEXT,
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    CONSTRAINT gc_perm_object_or_domain CHECK (
        object_id IS NOT NULL OR vault_domain IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_gc_permissions_container
    ON public.green_container_permissions (container_id);
CREATE INDEX IF NOT EXISTS idx_gc_permissions_grantee
    ON public.green_container_permissions (grantee_id);
CREATE INDEX IF NOT EXISTS idx_gc_permissions_active
    ON public.green_container_permissions (is_active);
CREATE INDEX IF NOT EXISTS idx_gc_permissions_expires
    ON public.green_container_permissions (expires_at);

-- ============================================================
-- 6. GREEN CONTAINER CONSENTS
--    Explicit customer consent records.
--    WHO + CAN DO WHAT + WITH WHICH DATA + FOR WHICH PURPOSE
--    + FOR HOW LONG + UNDER WHICH LIMITS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.green_container_consents (
    id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    container_id        UUID        NOT NULL
        REFERENCES public.green_containers (id) ON DELETE CASCADE,
    consent_type        TEXT        NOT NULL,               -- e.g. 'data_processing', 'agent_access', 'automation'
    subject             TEXT        NOT NULL,               -- what the consent covers
    grantee_id          TEXT        NOT NULL,               -- agent or service receiving consent
    purpose             TEXT        NOT NULL,
    scope_description   TEXT        NOT NULL,
    vault_domains       vault_domain[] NOT NULL DEFAULT '{}',
    automation_level    automation_level NOT NULL DEFAULT 'level_1_information',
    consented_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at          TIMESTAMPTZ NOT NULL,
    revoked_at          TIMESTAMPTZ,
    revoke_reason       TEXT,
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    customer_ip_hash    TEXT,                               -- hashed IP at time of consent
    consent_mechanism   TEXT        NOT NULL DEFAULT 'explicit_ui'
        CHECK (consent_mechanism IN ('explicit_ui', 'voice_confirmed', 'api_signed'))
);

CREATE INDEX IF NOT EXISTS idx_gc_consents_container
    ON public.green_container_consents (container_id);
CREATE INDEX IF NOT EXISTS idx_gc_consents_grantee
    ON public.green_container_consents (grantee_id);
CREATE INDEX IF NOT EXISTS idx_gc_consents_active
    ON public.green_container_consents (is_active);
CREATE INDEX IF NOT EXISTS idx_gc_consents_expires
    ON public.green_container_consents (expires_at);

-- ============================================================
-- 7. GREEN CONTAINER EVENTS
--    Lifecycle events on a container or its objects.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.green_container_events (
    id                  BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    container_id        UUID        NOT NULL
        REFERENCES public.green_containers (id) ON DELETE CASCADE,
    object_id           UUID
        REFERENCES public.green_container_objects (id) ON DELETE SET NULL,
    event_type          TEXT        NOT NULL
        CHECK (event_type IN (
            'container_created', 'container_locked', 'container_unlocked',
            'container_quarantined', 'object_added', 'object_updated',
            'object_removed', 'object_accessed', 'permission_granted',
            'permission_revoked', 'consent_given', 'consent_revoked',
            'integrity_check_passed', 'integrity_check_failed',
            'automation_triggered', 'automation_blocked'
        )),
    actor_type          TEXT        NOT NULL
        CHECK (actor_type IN ('customer', 'agent', 'system', 'admin')),
    actor_id            TEXT        NOT NULL,
    description         TEXT,
    metadata            JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gc_events_container
    ON public.green_container_events (container_id);
CREATE INDEX IF NOT EXISTS idx_gc_events_type
    ON public.green_container_events (event_type);
CREATE INDEX IF NOT EXISTS idx_gc_events_created
    ON public.green_container_events (created_at DESC);

-- ============================================================
-- 8. GREEN CONTAINER ACCESS LOG
--    Every access to container data is recorded here.
--    This is the primary audit trail for data access.
--    Immutable — no UPDATE or DELETE policies.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.green_container_access_log (
    id                  BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    container_id        UUID        NOT NULL
        REFERENCES public.green_containers (id) ON DELETE CASCADE,
    object_id           UUID
        REFERENCES public.green_container_objects (id) ON DELETE SET NULL,
    permission_id       UUID
        REFERENCES public.green_container_permissions (id) ON DELETE SET NULL,
    consent_id          UUID
        REFERENCES public.green_container_consents (id) ON DELETE SET NULL,
    accessor_type       TEXT        NOT NULL
        CHECK (accessor_type IN ('agent', 'user', 'service', 'system')),
    accessor_id         TEXT        NOT NULL,
    access_purpose      TEXT        NOT NULL,
    vault_domain        vault_domain,
    action_performed    TEXT        NOT NULL,
    data_fields_accessed TEXT[]     NOT NULL DEFAULT '{}',
    external_service    TEXT,                               -- if data was shared externally
    success             BOOLEAN     NOT NULL,
    denial_reason       TEXT,
    risk_score          INTEGER     CHECK (risk_score IS NULL OR risk_score BETWEEN 0 AND 100),
    session_id          TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gc_access_log_container
    ON public.green_container_access_log (container_id);
CREATE INDEX IF NOT EXISTS idx_gc_access_log_accessor
    ON public.green_container_access_log (accessor_id);
CREATE INDEX IF NOT EXISTS idx_gc_access_log_created
    ON public.green_container_access_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gc_access_log_success
    ON public.green_container_access_log (success);

-- ============================================================
-- 9. GREEN CONTAINER INTEGRITY CHECKS
--    Hash-based integrity verification records.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.green_container_integrity_checks (
    id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    container_id        UUID        NOT NULL
        REFERENCES public.green_containers (id) ON DELETE CASCADE,
    object_id           UUID
        REFERENCES public.green_container_objects (id) ON DELETE SET NULL,
    check_type          TEXT        NOT NULL
        CHECK (check_type IN ('full_container', 'single_object', 'vault_domain', 'permission_audit')),
    expected_hash       TEXT        NOT NULL,
    actual_hash         TEXT,
    passed              BOOLEAN,
    failure_details     TEXT,
    checked_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gc_integrity_container
    ON public.green_container_integrity_checks (container_id);
CREATE INDEX IF NOT EXISTS idx_gc_integrity_passed
    ON public.green_container_integrity_checks (passed);
CREATE INDEX IF NOT EXISTS idx_gc_integrity_checked
    ON public.green_container_integrity_checks (checked_at DESC);

-- ============================================================
-- 10. AGENT REGISTRY
--     Catalog of registered AI agents.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.agent_registry (
    id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_name          TEXT        NOT NULL UNIQUE,        -- e.g. 'green-travel-agent'
    display_name        TEXT        NOT NULL,
    description         TEXT,
    allowed_vault_domains vault_domain[] NOT NULL DEFAULT '{}',
    max_automation_level automation_level NOT NULL DEFAULT 'level_1_information',
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    requires_consent    BOOLEAN     NOT NULL DEFAULT TRUE,
    requires_customer_confirmation_above automation_level DEFAULT 'level_3_authorized_transaction',
    metadata            JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_registry_name
    ON public.agent_registry (agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_registry_active
    ON public.agent_registry (is_active);

-- Seed the standard agents from the directive
INSERT INTO public.agent_registry (agent_name, display_name, description, allowed_vault_domains, max_automation_level)
VALUES
    ('green-orchestrator',      'Green Orchestrator',        'Central task dispatcher',
     '{identity,document,financial_authorization,travel_profile,household_profile,wellness_profile,business_profile,automation_settings}',
     'level_4_high_risk'),
    ('green-container-agent',   'Green Container Agent',     'Container read/write under consent',
     '{identity,document,financial_authorization,travel_profile,household_profile,wellness_profile,business_profile,automation_settings}',
     'level_2_preparation'),
    ('green-trust-agent',       'Green Trust Agent',         'Trust scoring and session analysis',
     '{}',
     'level_1_information'),
    ('green-security-agent',    'Green Security Agent',      'Security event handling',
     '{}',
     'level_1_information'),
    ('green-integrity-agent',   'Green Integrity Agent',     'Data integrity checks',
     '{}',
     'level_1_information'),
    ('green-repair-agent',      'Green Repair Agent',        'Aegis-guided operational repairs',
     '{}',
     'level_1_information'),
    ('green-travel-agent',      'Green Travel Agent',        'Travel search and booking',
     '{travel_profile,identity}',
     'level_3_authorized_transaction'),
    ('green-form-agent',        'Green Form Agent',          'Form preparation',
     '{identity,document,travel_profile,business_profile}',
     'level_2_preparation'),
    ('green-payment-agent',     'Green Payment Agent',       'Payment authorization execution',
     '{financial_authorization}',
     'level_3_authorized_transaction'),
    ('green-grocery-agent',     'Green Grocery Agent',       'Household and grocery ordering',
     '{household_profile,financial_authorization}',
     'level_3_authorized_transaction'),
    ('green-renewal-agent',     'Green Renewal Agent',       'Bill and renewal reminders and payments',
     '{financial_authorization,document}',
     'level_3_authorized_transaction'),
    ('green-audit-agent',       'Green Audit Agent',         'Audit trail maintenance',
     '{}',
     'level_1_information'),
    ('green-report-agent',      'Green Report Agent',        'Daily report generation',
     '{}',
     'level_1_information')
ON CONFLICT (agent_name) DO NOTHING;

-- ============================================================
-- 11. AGENT PERMISSIONS
--     Short-lived scoped authorization grants per agent + customer.
--     These are the runtime tokens the orchestrator issues.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.agent_permissions (
    id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_name          TEXT        NOT NULL
        REFERENCES public.agent_registry (agent_name) ON DELETE CASCADE,
    customer_id         UUID        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    container_id        UUID        NOT NULL
        REFERENCES public.green_containers (id) ON DELETE CASCADE,
    purpose             TEXT        NOT NULL,
    allowed_vault_domains vault_domain[] NOT NULL DEFAULT '{}',
    allowed_actions     TEXT[]      NOT NULL DEFAULT '{}',
    automation_level    automation_level NOT NULL DEFAULT 'level_1_information',
    consent_id          UUID
        REFERENCES public.green_container_consents (id) ON DELETE SET NULL,
    issued_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at          TIMESTAMPTZ NOT NULL,               -- REQUIRED: short-lived
    revoked_at          TIMESTAMPTZ,
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_agent_permissions_agent
    ON public.agent_permissions (agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_permissions_customer
    ON public.agent_permissions (customer_id);
CREATE INDEX IF NOT EXISTS idx_agent_permissions_active
    ON public.agent_permissions (is_active);
CREATE INDEX IF NOT EXISTS idx_agent_permissions_expires
    ON public.agent_permissions (expires_at);

-- ============================================================
-- 12. AGENT TASKS
--     Task queue — one row per customer request dispatched
--     to an agent by the orchestrator.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.agent_tasks (
    id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_name          TEXT        NOT NULL,
    customer_id         UUID        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    agent_permission_id UUID
        REFERENCES public.agent_permissions (id) ON DELETE SET NULL,
    task_type           TEXT        NOT NULL,               -- e.g. 'travel_search', 'form_prepare'
    automation_level    automation_level NOT NULL DEFAULT 'level_1_information',
    input_payload       JSONB       NOT NULL DEFAULT '{}'::jsonb,
    status              TEXT        NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'running', 'awaiting_approval', 'approved', 'rejected', 'completed', 'failed', 'cancelled')),
    result_payload      JSONB,
    requires_approval   BOOLEAN     NOT NULL DEFAULT FALSE,
    approved_by         UUID        REFERENCES auth.users ON DELETE SET NULL,
    approved_at         TIMESTAMPTZ,
    rejection_reason    TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent
    ON public.agent_tasks (agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_customer
    ON public.agent_tasks (customer_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status
    ON public.agent_tasks (status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_created
    ON public.agent_tasks (created_at DESC);

-- ============================================================
-- 13. AGENT ACTIONS
--     Immutable audit log of every action an agent took.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.agent_actions (
    id                  BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    task_id             UUID        NOT NULL
        REFERENCES public.agent_tasks (id) ON DELETE CASCADE,
    agent_name          TEXT        NOT NULL,
    customer_id         UUID        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    action_type         TEXT        NOT NULL,
    data_categories_accessed TEXT[] NOT NULL DEFAULT '{}',
    external_service    TEXT,
    success             BOOLEAN     NOT NULL,
    failure_reason      TEXT,
    requires_confirmation BOOLEAN   NOT NULL DEFAULT FALSE,
    confirmed_by        UUID        REFERENCES auth.users ON DELETE SET NULL,
    confirmed_at        TIMESTAMPTZ,
    metadata            JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_actions_task
    ON public.agent_actions (task_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_agent
    ON public.agent_actions (agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_actions_customer
    ON public.agent_actions (customer_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_created
    ON public.agent_actions (created_at DESC);

-- ============================================================
-- 14. AUTOMATION RULES
--     Customer-configured automation bounds.
--     e.g. "monthly grocery limit $300", "approved stores list"
-- ============================================================

CREATE TABLE IF NOT EXISTS public.automation_rules (
    id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id         UUID        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    container_id        UUID        NOT NULL
        REFERENCES public.green_containers (id) ON DELETE CASCADE,
    agent_name          TEXT        NOT NULL,
    rule_type           TEXT        NOT NULL,               -- e.g. 'spending_limit', 'approved_vendors', 'schedule'
    automation_level    automation_level NOT NULL DEFAULT 'level_3_authorized_transaction',
    rule_config         JSONB       NOT NULL DEFAULT '{}'::jsonb,
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_rules_customer
    ON public.automation_rules (customer_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_agent
    ON public.automation_rules (agent_name);
CREATE INDEX IF NOT EXISTS idx_automation_rules_active
    ON public.automation_rules (is_active);

-- ============================================================
-- 15. AUTOMATION APPROVALS
--     Customer approvals for automation actions that exceed
--     configured bounds or require Level 3/4 confirmation.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.automation_approvals (
    id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id             UUID        NOT NULL
        REFERENCES public.agent_tasks (id) ON DELETE CASCADE,
    customer_id         UUID        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    automation_level    automation_level NOT NULL,
    approval_status     TEXT        NOT NULL DEFAULT 'pending'
        CHECK (approval_status IN ('pending', 'approved', 'rejected', 'expired')),
    requested_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at          TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
    responded_at        TIMESTAMPTZ,
    response_channel    TEXT,                               -- e.g. 'ui', 'voice', 'push'
    rejection_reason    TEXT
);

CREATE INDEX IF NOT EXISTS idx_automation_approvals_task
    ON public.automation_approvals (task_id);
CREATE INDEX IF NOT EXISTS idx_automation_approvals_customer
    ON public.automation_approvals (customer_id);
CREATE INDEX IF NOT EXISTS idx_automation_approvals_status
    ON public.automation_approvals (approval_status);

-- ============================================================
-- 16. PAYMENT AUTHORIZATIONS
--     Payment authorization tokens — NEVER raw payment credentials.
--     References tokens from payment provider (e.g. Stripe).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_authorizations (
    id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id         UUID        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    container_id        UUID        NOT NULL
        REFERENCES public.green_containers (id) ON DELETE CASCADE,
    task_id             UUID
        REFERENCES public.agent_tasks (id) ON DELETE SET NULL,
    provider            TEXT        NOT NULL,               -- e.g. 'stripe'
    provider_token_ref  TEXT        NOT NULL,               -- provider-issued token (not a secret)
    amount_limit_cents  BIGINT      NOT NULL,               -- maximum authorized amount
    currency            TEXT        NOT NULL DEFAULT 'USD',
    purpose             TEXT        NOT NULL,
    automation_level    automation_level NOT NULL DEFAULT 'level_3_authorized_transaction',
    status              TEXT        NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'authorized', 'used', 'expired', 'revoked', 'failed')),
    authorized_at       TIMESTAMPTZ,
    expires_at          TIMESTAMPTZ NOT NULL,
    used_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_auth_customer
    ON public.payment_authorizations (customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_auth_status
    ON public.payment_authorizations (status);
CREATE INDEX IF NOT EXISTS idx_payment_auth_expires
    ON public.payment_authorizations (expires_at);

-- ============================================================
-- 17. TRUST DECISIONS
--     Trust engine decisions, referenced by the consent engine
--     and Green Bubbles.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.trust_decisions (
    id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    subject_type        TEXT        NOT NULL
        CHECK (subject_type IN ('customer', 'agent', 'session', 'request')),
    subject_id          TEXT        NOT NULL,
    decision            TEXT        NOT NULL
        CHECK (decision IN ('allow', 'challenge', 'deny', 'require_approval', 'rate_limit')),
    risk_score          INTEGER     NOT NULL DEFAULT 0
        CHECK (risk_score BETWEEN 0 AND 100),
    confidence          INTEGER     NOT NULL DEFAULT 100
        CHECK (confidence BETWEEN 0 AND 100),
    reason_codes        TEXT[]      NOT NULL DEFAULT '{}',
    policy_name         TEXT,
    session_id          TEXT,
    request_context     JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trust_decisions_subject
    ON public.trust_decisions (subject_id);
CREATE INDEX IF NOT EXISTS idx_trust_decisions_decision
    ON public.trust_decisions (decision);
CREATE INDEX IF NOT EXISTS idx_trust_decisions_created
    ON public.trust_decisions (created_at DESC);

-- ============================================================
-- 18. EXTERNAL CONNECTORS
--     Registered external service adapters.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.external_connectors (
    id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    service_name        TEXT        NOT NULL UNIQUE,        -- e.g. 'stripe', 'amadeus-travel'
    display_name        TEXT        NOT NULL,
    connector_type      TEXT        NOT NULL
        CHECK (connector_type IN (
            'payment', 'travel', 'grocery', 'government',
            'document', 'notification', 'identity_verification', 'other'
        )),
    auth_method         TEXT        NOT NULL
        CHECK (auth_method IN ('oauth2', 'api_key_ref', 'service_token', 'mtls')),
    allowed_actions     TEXT[]      NOT NULL DEFAULT '{}',
    rate_limit_rpm      INTEGER,
    timeout_ms          INTEGER     NOT NULL DEFAULT 30000,
    retry_max           INTEGER     NOT NULL DEFAULT 3,
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    audit_policy        TEXT        NOT NULL DEFAULT 'log_all',
    failure_policy      TEXT        NOT NULL DEFAULT 'fail_closed',
    metadata            JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ext_connectors_type
    ON public.external_connectors (connector_type);
CREATE INDEX IF NOT EXISTS idx_ext_connectors_active
    ON public.external_connectors (is_active);

-- ============================================================
-- 19. CONNECTOR ACTIONS
--     Immutable log of every external connector execution.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.connector_actions (
    id                  BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    connector_id        UUID        NOT NULL
        REFERENCES public.external_connectors (id) ON DELETE CASCADE,
    task_id             UUID
        REFERENCES public.agent_tasks (id) ON DELETE SET NULL,
    customer_id         UUID        REFERENCES auth.users ON DELETE SET NULL,
    action_name         TEXT        NOT NULL,
    request_summary     TEXT,                               -- human-readable, NO raw sensitive data
    response_status     INTEGER,
    success             BOOLEAN     NOT NULL,
    failure_reason      TEXT,
    duration_ms         INTEGER,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_connector_actions_connector
    ON public.connector_actions (connector_id);
CREATE INDEX IF NOT EXISTS idx_connector_actions_task
    ON public.connector_actions (task_id);
CREATE INDEX IF NOT EXISTS idx_connector_actions_created
    ON public.connector_actions (created_at DESC);

-- ============================================================
-- 20. AUTO-UPDATED_AT TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION gc_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$
DECLARE tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'green_containers',
        'green_container_objects',
        'agent_registry',
        'automation_rules',
        'external_connectors'
    ] LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON public.%1$I;
             CREATE TRIGGER trg_%1$s_updated_at
             BEFORE UPDATE ON public.%1$I
             FOR EACH ROW EXECUTE FUNCTION gc_set_updated_at();',
            tbl
        );
    END LOOP;
END $$;

-- ============================================================
-- 21. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.green_containers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.green_container_objects       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.green_container_permissions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.green_container_consents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.green_container_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.green_container_access_log    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.green_container_integrity_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_registry                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_permissions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tasks                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_actions                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_approvals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_authorizations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_decisions               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_connectors           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connector_actions             ENABLE ROW LEVEL SECURITY;

-- ── Customers can read their own container ──────────────────
CREATE POLICY "gc_customer_read_own_container"
    ON public.green_containers FOR SELECT TO authenticated
    USING (auth.uid() = customer_id);

-- ── Customers can read their own container objects ──────────
CREATE POLICY "gc_customer_read_own_objects"
    ON public.green_container_objects FOR SELECT TO authenticated
    USING (
        container_id IN (
            SELECT id FROM public.green_containers WHERE customer_id = auth.uid()
        )
    );

-- ── Customers can read their own permissions ────────────────
CREATE POLICY "gc_customer_read_own_permissions"
    ON public.green_container_permissions FOR SELECT TO authenticated
    USING (
        container_id IN (
            SELECT id FROM public.green_containers WHERE customer_id = auth.uid()
        )
    );

-- ── Customers can read their own consents ───────────────────
CREATE POLICY "gc_customer_read_own_consents"
    ON public.green_container_consents FOR SELECT TO authenticated
    USING (
        container_id IN (
            SELECT id FROM public.green_containers WHERE customer_id = auth.uid()
        )
    );

-- ── Customers can read their own events ─────────────────────
CREATE POLICY "gc_customer_read_own_events"
    ON public.green_container_events FOR SELECT TO authenticated
    USING (
        container_id IN (
            SELECT id FROM public.green_containers WHERE customer_id = auth.uid()
        )
    );

-- ── Customers can read their own access log ─────────────────
CREATE POLICY "gc_customer_read_own_access_log"
    ON public.green_container_access_log FOR SELECT TO authenticated
    USING (
        container_id IN (
            SELECT id FROM public.green_containers WHERE customer_id = auth.uid()
        )
    );

-- ── Customers can read their own integrity checks ───────────
CREATE POLICY "gc_customer_read_own_integrity"
    ON public.green_container_integrity_checks FOR SELECT TO authenticated
    USING (
        container_id IN (
            SELECT id FROM public.green_containers WHERE customer_id = auth.uid()
        )
    );

-- ── All authenticated users can read agent catalog ──────────
CREATE POLICY "gc_auth_read_agent_registry"
    ON public.agent_registry FOR SELECT TO authenticated
    USING (true);

-- ── Customers can read their own agent permissions ──────────
CREATE POLICY "gc_customer_read_own_agent_perms"
    ON public.agent_permissions FOR SELECT TO authenticated
    USING (customer_id = auth.uid());

-- ── Customers can read their own tasks ──────────────────────
CREATE POLICY "gc_customer_read_own_tasks"
    ON public.agent_tasks FOR SELECT TO authenticated
    USING (customer_id = auth.uid());

-- ── Customers can read their own agent actions ──────────────
CREATE POLICY "gc_customer_read_own_agent_actions"
    ON public.agent_actions FOR SELECT TO authenticated
    USING (customer_id = auth.uid());

-- ── Customers can read and manage their own automation rules ─
CREATE POLICY "gc_customer_manage_own_automation_rules"
    ON public.automation_rules FOR ALL TO authenticated
    USING (customer_id = auth.uid())
    WITH CHECK (customer_id = auth.uid());

-- ── Customers can read their own approvals ──────────────────
CREATE POLICY "gc_customer_read_own_approvals"
    ON public.automation_approvals FOR SELECT TO authenticated
    USING (customer_id = auth.uid());

-- ── Customers can respond to their own approvals ────────────
CREATE POLICY "gc_customer_respond_own_approvals"
    ON public.automation_approvals FOR UPDATE TO authenticated
    USING (customer_id = auth.uid())
    WITH CHECK (customer_id = auth.uid());

-- ── Customers can read their own payment authorizations ─────
CREATE POLICY "gc_customer_read_own_payment_auth"
    ON public.payment_authorizations FOR SELECT TO authenticated
    USING (customer_id = auth.uid());

-- ── Authenticated admins/security can read trust decisions ──
CREATE POLICY "gc_auth_read_trust_decisions"
    ON public.trust_decisions FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND role IN ('admin', 'account_manager', 'financial_manager')
        )
    );

-- ── All authenticated users can read external connectors ────
CREATE POLICY "gc_auth_read_ext_connectors"
    ON public.external_connectors FOR SELECT TO authenticated
    USING (true);

-- ── Admins can read connector actions ───────────────────────
CREATE POLICY "gc_admin_read_connector_actions"
    ON public.connector_actions FOR SELECT TO authenticated
    USING (
        customer_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- All writes go through backend service-role only.
-- No INSERT/UPDATE/DELETE policies for authenticated role
-- (except automation_rules and automation_approvals above,
--  which are customer-managed).

-- ============================================================
-- 22. REALTIME PUBLICATIONS
--     Enable realtime for customer-facing tables.
-- ============================================================

DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'green_container_events',
        'agent_tasks',
        'automation_approvals',
        'payment_authorizations'
    ] LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM pg_publication_tables
            WHERE pubname    = 'supabase_realtime'
              AND schemaname = 'public'
              AND tablename  = t
        ) THEN
            EXECUTE format(
                'ALTER PUBLICATION supabase_realtime ADD TABLE %I', t
            );
        END IF;
    END LOOP;
END $$;
