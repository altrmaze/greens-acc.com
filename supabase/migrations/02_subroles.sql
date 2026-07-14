-- ============================================================
-- Migration 02: Sub-role Extensions & Deal Approval Flag
-- Greens ACC — Corporate Trade Platform
-- ============================================================
-- Extends the RBAC schema from migration 01 to distinguish
-- management oversight roles from execution/data-entry staff.
-- ============================================================

-- Extend the enum with granular execution-staff variants
-- (IF NOT EXISTS guards against re-run errors)
ALTER TYPE user_team_role ADD VALUE IF NOT EXISTS 'account_manager';
ALTER TYPE user_team_role ADD VALUE IF NOT EXISTS 'accounting_staff';
ALTER TYPE user_team_role ADD VALUE IF NOT EXISTS 'software_engineer';

-- Add deal-approval capability flag to profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS can_approve_deals BOOLEAN NOT NULL DEFAULT FALSE;

-- Grant approval capability to management-tier roles
UPDATE public.profiles
    SET can_approve_deals = TRUE
    WHERE role IN ('admin', 'account_manager');

-- ============================================================
-- Role Isolation Matrix
-- ============================================================
-- account_manager  → Full oversight: analytics, ledger creation,
--                    manifest approvals, accounting audit logs.
--                    can_approve_deals = TRUE
--
-- accounting_staff → Restricted: data entry, invoice processing,
--                    individual ledger inputs ONLY.
--                    can_approve_deals = FALSE
--                    (all global summaries & approval buttons hidden)
--
-- financial_manager→ Macro financial reporting, cross-border tax
--                    config, currency fluctuation dashboards.
--
-- admin            → Root configuration, unrestricted overrides.
--                    can_approve_deals = TRUE
--
-- software_engineer→ Code access, CodeSpaces embedded terminal.
--
-- analyzer         → Read-only analysis tools.
-- ============================================================

-- RLS: accounting_staff may only see their own data-entry records
-- (example policy on a hypothetical invoices table for reference)
-- CREATE POLICY "accounting_staff_own_invoices" ON public.invoices
--     FOR ALL USING (
--         auth.uid() = created_by AND
--         EXISTS (
--             SELECT 1 FROM public.profiles
--             WHERE id = auth.uid()
--             AND role IN ('accounting', 'accounting_staff')
--         )
--     );
