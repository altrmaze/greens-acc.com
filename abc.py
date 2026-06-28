
"""GreenACC integration layer.

This module centralizes:
1) Supabase function endpoint contracts
2) Request validation rules aligned to current backend logic
3) UI state derivation aligned to current frontend flows
4) Database contract metadata for integration checks
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
import json
from typing import Any, Callable, Dict, Iterable, Mapping, MutableMapping, Optional
from urllib import request as urlrequest
from urllib.error import HTTPError, URLError


JSONDict = Dict[str, Any]
Validator = Callable[[Mapping[str, Any]], None]


class IntegrationValidationError(ValueError):
    """Raised when payload validation fails before calling a backend endpoint."""


class UIState(str, Enum):
    AWAITING_ACTIVATION = "Awaiting Activation"
    ENTRY_PAID_HANDSHAKE_READY = "Entry Fee Paid · Handshake Ready"
    HANDSHAKE_CONFIRMED_ESCROW_ACTIVE = "Handshake Confirmed · Escrow Active"
    ANNOUNCEMENT_READY = "Announcement Ready"
    BROADCAST_COMPLETE = "Broadcast Complete"
    SETTLEMENT_READY = "Settlement Ready"
    RELEASED = "Released"
    BLOCKED_GLOBAL_RISK = "Blocked · Global Risk Active"
    BLOCKED_COMPLIANCE = "Blocked · Compliance Kill Switch"


@dataclass(frozen=True)
class EndpointContract:
    name: str
    path: str
    validator: Validator


@dataclass(frozen=True)
class ApiResult:
    ok: bool
    status: int
    data: JSONDict


@dataclass(frozen=True)
class TableContract:
    table: str
    required_columns: frozenset[str]


def _require(payload: Mapping[str, Any], key: str) -> Any:
    value = payload.get(key)
    if value is None or value == "":
        raise IntegrationValidationError(f"{key} is required")
    return value


def _require_number(payload: Mapping[str, Any], key: str) -> float:
    value = _require(payload, key)
    try:
        return float(value)
    except (TypeError, ValueError) as exc:
        raise IntegrationValidationError(f"{key} must be numeric") from exc


def _validate_process_entry_fee(payload: Mapping[str, Any]) -> None:
    _require(payload, "deal_id")
    _require(payload, "payer_id")
    amount = _require_number(payload, "amount")
    if amount != 20.0:
        raise IntegrationValidationError("amount must be exactly 20.00")


def _validate_create_handshake(payload: Mapping[str, Any]) -> None:
    _require(payload, "deal_id")
    _require(payload, "payer_id")
    if _require_number(payload, "amount") <= 0:
        raise IntegrationValidationError("amount must be greater than 0")


def _validate_process_withdrawal(payload: Mapping[str, Any]) -> None:
    _require(payload, "deal_id")


def _validate_create_stripe_checkout(payload: Mapping[str, Any]) -> None:
    _require(payload, "deal_id")
    _require(payload, "payer_id")


def _validate_stripe_webhook(payload: Mapping[str, Any]) -> None:
    if not isinstance(payload, Mapping):
        raise IntegrationValidationError("webhook payload must be an object")
    if "type" not in payload and "data" not in payload:
        raise IntegrationValidationError("webhook payload must include type or data")


def _validate_generate_press_release(payload: Mapping[str, Any]) -> None:
    _require(payload, "deal_id")
    _require(payload, "buyer_name")
    _require(payload, "seller_name")


def _validate_syndicate_announcement(payload: Mapping[str, Any]) -> None:
    _require(payload, "announcement_id")
    _require(payload, "press_release")


def _validate_generate_instant_room(payload: Mapping[str, Any]) -> None:
    _require(payload, "creator_company")


def _validate_document_bridge(payload: Mapping[str, Any]) -> None:
    _require(payload, "room_id")
    _require(payload, "document_name")
    allowed = {"pdf", "docx", "spreadsheet", "contract", "blueprint", "legal", "compliance"}
    if payload.get("document_type") and payload["document_type"] not in allowed:
        raise IntegrationValidationError(f"document_type must be one of: {', '.join(sorted(allowed))}")


def _validate_ai_secretary_tools(payload: Mapping[str, Any]) -> None:
    action = _require(payload, "action")
    if action not in {"summarize", "parse", "calculate"}:
        raise IntegrationValidationError("action must be summarize, parse, or calculate")
    if action == "summarize" and not payload.get("document_text"):
        raise IntegrationValidationError("document_text required for summarize")
    if action == "parse" and (not payload.get("document_text") or not payload.get("query")):
        raise IntegrationValidationError("document_text and query required for parse")
    if action == "calculate" and not payload.get("currency_pair"):
        raise IntegrationValidationError("currency_pair required for calculate")


def _validate_ai_compliance_lawyer(payload: Mapping[str, Any]) -> None:
    _require(payload, "room_id")
    if not payload.get("conversation_text") and not payload.get("document_content"):
        raise IntegrationValidationError("conversation_text or document_content is required")


def _validate_marketplace_engine(payload: Mapping[str, Any]) -> None:
    action = _require(payload, "action")
    if action == "list_asset":
        _require(payload, "title")
        _require(payload, "category")
        _require(payload, "seller_id")
        return
    if action == "process_verification":
        _require(payload, "listing_id")
        amount = _require_number(payload, "amount")
        if amount != 20.0:
            raise IntegrationValidationError("amount must be exactly 20.00 for verification")
        if not bool(payload.get("is_cleared")):
            raise IntegrationValidationError("is_cleared must be true")
        return
    raise IntegrationValidationError("action must be list_asset or process_verification")


def _validate_audit_contract_compliance(payload: Mapping[str, Any]) -> None:
    _require(payload, "text")


def _validate_supply_chain_coordinator(payload: Mapping[str, Any]) -> None:
    action = _require(payload, "action")
    if action == "init_shipment":
        _require(payload, "order_id")
        _require(payload, "origin")
        _require(payload, "destination")
        return
    if action == "advance_milestone":
        _require(payload, "tracking_id")
        _require(payload, "milestone")
        return
    raise IntegrationValidationError("action must be init_shipment or advance_milestone")


def _validate_news_webhook(payload: Mapping[str, Any]) -> None:
    _require(payload, "title")


def _validate_ai_agent_analyze(payload: Mapping[str, Any]) -> None:
    if not isinstance(payload, Mapping):
        raise IntegrationValidationError("payload must be an object")


ENDPOINT_CONTRACTS: dict[str, EndpointContract] = {
    "processEntryFee": EndpointContract("processEntryFee", "/supabase/functions/processEntryFee", _validate_process_entry_fee),
    "createHandshakeSession": EndpointContract("createHandshakeSession", "/supabase/functions/createHandshakeSession", _validate_create_handshake),
    "processWithdrawal": EndpointContract("processWithdrawal", "/supabase/functions/processWithdrawal", _validate_process_withdrawal),
    "createStripeCheckout": EndpointContract("createStripeCheckout", "/supabase/functions/createStripeCheckout", _validate_create_stripe_checkout),
    "stripeWebhook": EndpointContract("stripeWebhook", "/supabase/functions/stripeWebhook", _validate_stripe_webhook),
    "generatePressRelease": EndpointContract("generatePressRelease", "/supabase/functions/generatePressRelease", _validate_generate_press_release),
    "syndicateAnnouncement": EndpointContract("syndicateAnnouncement", "/supabase/functions/syndicateAnnouncement", _validate_syndicate_announcement),
    "generateInstantRoom": EndpointContract("generateInstantRoom", "/supabase/functions/generateInstantRoom", _validate_generate_instant_room),
    "documentBridge": EndpointContract("documentBridge", "/supabase/functions/documentBridge", _validate_document_bridge),
    "aiSecretaryTools": EndpointContract("aiSecretaryTools", "/supabase/functions/aiSecretaryTools", _validate_ai_secretary_tools),
    "aiComplianceLawyer": EndpointContract("aiComplianceLawyer", "/supabase/functions/aiComplianceLawyer", _validate_ai_compliance_lawyer),
    "marketplaceEngine": EndpointContract("marketplaceEngine", "/supabase/functions/marketplaceEngine", _validate_marketplace_engine),
    "auditContractCompliance": EndpointContract("auditContractCompliance", "/supabase/functions/auditContractCompliance", _validate_audit_contract_compliance),
    "supplyChainCoordinator": EndpointContract("supplyChainCoordinator", "/supabase/functions/supplyChainCoordinator", _validate_supply_chain_coordinator),
    "newsWebhook": EndpointContract("newsWebhook", "/supabase/functions/newsWebhook", _validate_news_webhook),
    "aiAgentAnalyze": EndpointContract("aiAgentAnalyze", "/supabase/functions/aiAgentAnalyze", _validate_ai_agent_analyze),
}


TABLE_CONTRACTS: tuple[TableContract, ...] = (
    TableContract("green_acc_deals", frozenset({
        "id", "buyer_id", "seller_id", "entry_fee_status", "handshake_status",
        "escrow_status", "compliance_status", "ai_agent_status", "funds_locked",
        "safe_withdrawal_ready", "withdrawal_triggered", "amount_total",
        "handshake_commission_amount", "lc_reference_number",
    })),
    TableContract("deal_announcements", frozenset({
        "id", "deal_id", "press_release", "social_posts", "syndication_status",
        "syndication_metadata", "published_at",
    })),
    TableContract("instant_rooms", frozenset({
        "id", "room_token", "room_name", "creator_company", "encryption_key",
        "session_fee_status", "is_active", "expires_at",
    })),
    TableContract("room_sessions", frozenset({
        "id", "room_id", "session_status", "kill_switch_triggered",
        "kill_switch_reason", "handshake_allowed", "payment_allowed",
    })),
    TableContract("document_references", frozenset({
        "id", "room_id", "document_name", "document_type", "source_url",
        "oauth_provider", "encryption_metadata",
    })),
    TableContract("global_news", frozenset({
        "id", "source", "title", "summary", "category", "severity", "metadata",
    })),
    TableContract("global_risk_flags", frozenset({
        "id", "news_id", "scope", "active", "reason",
    })),
    TableContract("compliance_logs", frozenset({
        "id", "room_id", "violation_type", "severity", "description",
        "detected_content", "legal_citation", "ai_recommendation",
    })),
    TableContract("marketplace_listings", frozenset({
        "id", "title", "category", "seller_id", "is_verified", "status",
    })),
    TableContract("user_profiles", frozenset({
        "id", "account_status", "security_flags",
    })),
    TableContract("legal_audit_logs", frozenset({
        "id", "contract_id", "is_compliant", "report_payload",
    })),
    TableContract("supply_chain_tracking", frozenset({
        "id", "order_id", "carrier_identity", "origin_point",
        "destination_point", "current_milestone", "transit_status", "logs",
    })),
)


def validate_db_contract(schema_snapshot: Mapping[str, Iterable[str]]) -> dict[str, list[str]]:
    """Compare a schema snapshot against known table/column contracts.

    schema_snapshot format:
    {
        "table_name": ["column_1", "column_2", ...]
    }
    """
    normalized: dict[str, set[str]] = {t: set(cols) for t, cols in schema_snapshot.items()}
    missing: dict[str, list[str]] = {}
    for table_contract in TABLE_CONTRACTS:
        have = normalized.get(table_contract.table, set())
        missing_cols = sorted(table_contract.required_columns - have)
        if missing_cols:
            missing[table_contract.table] = missing_cols
    return missing


def derive_ui_state(
    deal: Mapping[str, Any],
    announcement: Optional[Mapping[str, Any]] = None,
    *,
    global_risk_active: bool = False,
    kill_switch_triggered: bool = False,
) -> UIState:
    """Derive frontend state from backend payloads."""
    if kill_switch_triggered:
        return UIState.BLOCKED_COMPLIANCE

    handshake_status = deal.get("handshake_status")
    entry_fee_status = deal.get("entry_fee_status")
    escrow_status = deal.get("escrow_status")
    safe_withdrawal_ready = bool(deal.get("safe_withdrawal_ready"))

    if global_risk_active and handshake_status != "confirmed":
        return UIState.BLOCKED_GLOBAL_RISK
    if escrow_status == "released" or bool(deal.get("withdrawal_triggered")):
        return UIState.RELEASED
    if safe_withdrawal_ready:
        return UIState.SETTLEMENT_READY

    if announcement:
        syndication = announcement.get("syndication_status")
        if syndication == "published":
            return UIState.BROADCAST_COMPLETE
        if announcement.get("press_release"):
            return UIState.ANNOUNCEMENT_READY

    if handshake_status == "confirmed" and escrow_status == "locked":
        return UIState.HANDSHAKE_CONFIRMED_ESCROW_ACTIVE
    if entry_fee_status in {"paid", "verified"}:
        return UIState.ENTRY_PAID_HANDSHAKE_READY
    return UIState.AWAITING_ACTIVATION


class GreenAccIntegration:
    """HTTP client + validation facade for all current Supabase functions."""

    def __init__(self, base_url: str, *, timeout_seconds: float = 30.0, default_headers: Optional[Mapping[str, str]] = None):
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds
        self.default_headers = dict(default_headers or {})

    def validate(self, endpoint_name: str, payload: Mapping[str, Any]) -> None:
        contract = ENDPOINT_CONTRACTS.get(endpoint_name)
        if not contract:
            raise IntegrationValidationError(f"Unknown endpoint: {endpoint_name}")
        contract.validator(payload)

    def call(self, endpoint_name: str, payload: Mapping[str, Any]) -> ApiResult:
        contract = ENDPOINT_CONTRACTS.get(endpoint_name)
        if not contract:
            raise IntegrationValidationError(f"Unknown endpoint: {endpoint_name}")
        contract.validator(payload)
        return self._post_json(contract.path, payload)

    def _post_json(self, path: str, payload: Mapping[str, Any]) -> ApiResult:
        url = f"{self.base_url}{path}"
        body = json.dumps(payload).encode("utf-8")
        headers: MutableMapping[str, str] = {"Content-Type": "application/json", **self.default_headers}
        req = urlrequest.Request(url=url, data=body, headers=headers, method="POST")
        try:
            with urlrequest.urlopen(req, timeout=self.timeout_seconds) as resp:
                raw = resp.read().decode("utf-8")
                parsed = json.loads(raw) if raw else {}
                return ApiResult(ok=True, status=resp.status, data=parsed)
        except HTTPError as err:
            raw = err.read().decode("utf-8") if err.fp else ""
            parsed = json.loads(raw) if raw else {}
            return ApiResult(ok=False, status=err.code, data=parsed)
        except URLError as err:
            return ApiResult(ok=False, status=0, data={"error": f"Network error: {err.reason}"})
