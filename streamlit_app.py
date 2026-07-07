import json
import os
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any
from urllib.parse import urlencode

import requests
import streamlit as st

BACKEND_BASE_URL = os.environ.get("BACKEND_API_URL", "http://localhost:5000").rstrip("/")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
SUPABASE_KEY = SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY

ROLES = ["admin", "manager", "operator", "auditor", "viewer"]
ROLE_PERMISSIONS: dict[str, set[str]] = {
    "admin": {"system", "transactions", "memo", "functions", "tables", "sandbox", "meetings", "logistics"},
    "manager": {"system", "transactions", "memo", "functions", "tables", "sandbox", "meetings", "logistics"},
    "operator": {"system", "transactions", "memo", "functions", "tables", "meetings", "logistics"},
    "auditor": {"system", "memo", "tables", "sandbox", "meetings", "logistics"},
    "viewer": {"system", "tables", "meetings"},
}

REGIONS = ["global", "us", "ae", "eg", "in", "pl", "fr", "cn", "mn"]
FUNCTION_NAMES = [
    "processEntryFee",
    "processWithdrawal",
    "createHandshakeSession",
    "createStripeCheckout",
    "stripeWebhook",
    "aiAgentAnalyze",
    "newsWebhook",
    "generatePressRelease",
    "syndicateAnnouncement",
    "generateInstantRoom",
    "documentBridge",
    "aiSecretaryTools",
    "aiComplianceLawyer",
    "marketplaceEngine",
    "auditContractCompliance",
    "supplyChainCoordinator",
    "dealClearanceRoom",
    "dealFulfillment",
    "stripeConnectOnboard",
    "meetingRoom",
]

TABLE_CATALOG: dict[str, dict[str, Any]] = {
    "ai_monitoring_config": {"pk": ["id"], "columns": ["id", "current_mode", "updated_at"], "relations": []},
    "ai_transaction_logs": {
        "pk": ["id"],
        "columns": ["id", "transaction_id", "risk_score", "action_taken", "is_false_positive", "processing_time_ms", "created_at"],
        "relations": [],
    },
    "green_acc_deals": {
        "pk": ["id"],
        "columns": [
            "id", "created_at", "buyer_id", "seller_id", "region", "currency", "amount_total", "entry_fee_amount",
            "entry_fee_status", "handshake_commission_rate", "handshake_commission_amount", "lc_reference_number", "handshake_status",
            "escrow_status", "funds_locked", "compliance_status", "safe_withdrawal_ready", "withdrawal_triggered", "ai_agent_status", "last_updated",
        ],
        "relations": [],
    },
    "meeting_signals": {"pk": ["id"], "columns": ["id", "room_id", "sender_id", "target_id", "signal_type", "signal_data", "created_at"], "relations": []},
    "global_news": {"pk": ["id"], "columns": ["id", "source", "title", "summary", "category", "severity", "metadata", "created_at"], "relations": []},
    "global_risk_flags": {"pk": ["id"], "columns": ["id", "news_id", "scope", "active", "reason", "created_at"], "relations": ["news_id -> global_news.id"]},
    "deal_announcements": {
        "pk": ["id"],
        "columns": ["id", "deal_id", "press_release", "social_posts", "syndication_status", "syndication_metadata", "published_at", "created_at"],
        "relations": ["deal_id -> green_acc_deals.id"],
    },
    "instant_rooms": {
        "pk": ["id"],
        "columns": ["id", "room_token", "room_name", "creator_company", "participant_company", "encryption_key", "session_fee_status", "created_at", "expires_at", "is_active"],
        "relations": [],
    },
    "document_references": {
        "pk": ["id"],
        "columns": ["id", "room_id", "document_name", "document_type", "source_url", "oauth_provider", "encryption_metadata", "uploaded_by", "created_at"],
        "relations": ["room_id -> instant_rooms.id"],
    },
    "compliance_logs": {
        "pk": ["id"],
        "columns": ["id", "room_id", "violation_type", "severity", "description", "detected_content", "legal_citation", "ai_recommendation", "is_resolved", "created_at"],
        "relations": ["room_id -> instant_rooms.id"],
    },
    "room_sessions": {
        "pk": ["id"],
        "columns": ["id", "room_id", "session_status", "compliance_flags", "kill_switch_triggered", "kill_switch_reason", "handshake_allowed", "payment_allowed", "last_ai_check", "created_at"],
        "relations": ["room_id -> instant_rooms.id"],
    },
    "marketplace_listings": {
        "pk": ["id"],
        "columns": ["id", "title", "category", "description", "quantity", "price_per_unit", "seller_id", "is_verified", "status", "created_at", "updated_at"],
        "relations": [],
    },
    "user_profiles": {
        "pk": ["id"],
        "columns": ["id", "display_name", "email", "account_status", "security_flags", "created_at", "updated_at"],
        "relations": [],
    },
    "legal_audit_logs": {
        "pk": ["id"],
        "columns": ["id", "contract_id", "is_compliant", "report_payload", "created_at"],
        "relations": [],
    },
    "supply_chain_tracking": {
        "pk": ["id"],
        "columns": ["id", "order_id", "carrier_identity", "origin_point", "destination_point", "current_milestone", "transit_status", "logs", "created_at", "updated_at"],
        "relations": [],
    },
    "deal_clearances": {
        "pk": ["id"],
        "columns": ["id", "deal_id", "user_id", "commodity_type", "status", "ncnda_signed", "ncnda_signed_at", "notes", "created_at", "updated_at"],
        "relations": ["deal_id -> green_acc_deals.id", "user_id -> user_profiles.id"],
    },
    "deal_documents": {
        "pk": ["id"],
        "columns": ["id", "clearance_id", "document_type", "file_name", "file_size_bytes", "status", "reviewer_notes", "uploaded_at"],
        "relations": ["clearance_id -> deal_clearances.id"],
    },
    "deal_appointments": {
        "pk": ["id"],
        "columns": ["id", "deal_id", "user_id", "scheduled_at", "duration_minutes", "timezone", "status", "notes", "created_at"],
        "relations": ["deal_id -> green_acc_deals.id", "user_id -> user_profiles.id"],
    },
    "proxy_gov_filings": {
        "pk": ["id"],
        "columns": ["id", "user_id", "deal_id", "agency_target_name", "document_type_scope", "execution_status", "preferred_language", "proxy_authorization_signed", "tracking_reference_logs", "created_at", "updated_at"],
        "relations": ["deal_id -> green_acc_deals.id", "user_id -> user_profiles.id"],
    },
    "deal_fulfillments": {
        "pk": ["id"],
        "columns": ["id", "deal_id", "buyer_id", "seller_id", "gross_value_usd", "platform_fee_usd", "stripe_session_id", "stripe_payment_status", "current_logistics_status", "vessel_tracking_id", "origin_port", "destination_port", "estimated_delivery_date", "route_coordinates", "milestone_log", "commodity_type", "updated_at", "created_at"],
        "relations": ["deal_id -> green_acc_deals.id", "buyer_id -> user_profiles.id", "seller_id -> user_profiles.id"],
    },
    "meeting_room_documents": {
        "pk": ["id"],
        "columns": ["id", "deal_id", "uploader_id", "file_name", "file_path", "mime_type", "file_size_bytes", "scan_status", "created_at"],
        "relations": ["deal_id -> green_acc_deals.id", "uploader_id -> user_profiles.id"],
    },
    "meeting_memos": {
        "pk": ["id"],
        "columns": ["id", "deal_id", "receiver_id", "memo_type", "content_message", "source_clause", "severity", "is_read", "created_at"],
        "relations": ["deal_id -> green_acc_deals.id", "receiver_id -> user_profiles.id"],
    },
}


@dataclass
class IdentityContext:
    username: str
    role: str
    department: str
    auth_token: str


@dataclass
class TransactionRequest:
    transaction_id: str
    amount: float
    buyer_id: str
    seller_id: str

    def payload(self, identity: IdentityContext) -> dict[str, Any]:
        return {
            "transaction_id": self.transaction_id.strip(),
            "amount": float(self.amount),
            "buyer_id": self.buyer_id.strip(),
            "seller_id": self.seller_id.strip(),
            "username": identity.username,
            "role": identity.role,
            "department": identity.department,
        }


class ApiClient:
    def __init__(self, backend_url: str, supabase_url: str, supabase_key: str) -> None:
        self.backend_url = backend_url
        self.supabase_url = supabase_url
        self.supabase_key = supabase_key

    def _request(self, method: str, path: str, *, params: dict[str, str] | None = None, payload: dict[str, Any] | None = None) -> tuple[int, Any]:
        url = f"{self.backend_url}{path}"
        try:
            response = requests.request(method, url, params=params, json=payload, timeout=30)
            return response.status_code, self._decode(response)
        except requests.RequestException as exc:
            return 500, {"error": str(exc), "target": url}

    @staticmethod
    def _decode(response: requests.Response) -> Any:
        try:
            return response.json()
        except ValueError:
            return {"error": response.text[:500]}

    def system_status(self, region: str, deal_id: str, order_id: str, room_id: str) -> tuple[int, Any]:
        return self._request(
            "GET",
            "/api/system-status",
            params={"region": region, "deal_id": deal_id.strip(), "order_id": order_id.strip(), "room_id": room_id.strip()},
        )

    def evaluate_transaction(self, request_data: TransactionRequest, identity: IdentityContext) -> tuple[int, Any]:
        return self._request("POST", "/api/v1/transactions/evaluate", payload=request_data.payload(identity))

    def analyze_memo(self, contract_text: str, identity: IdentityContext) -> tuple[int, Any]:
        payload = {"contract_text": contract_text, "username": identity.username, "role": identity.role, "department": identity.department}
        return self._request("POST", "/api/v1/memo/analyze", payload=payload)

    def invoke_function(self, function_name: str, payload: dict[str, Any]) -> tuple[int, Any]:
        return self._request("POST", f"/supabase/functions/{function_name}", payload=payload)

    def table_select(self, table: str, *, limit: int, order: str, select: str = "*") -> tuple[int, Any]:
        if not self.supabase_url or not self.supabase_key:
            return 503, {"error": "SUPABASE_URL and key are required"}

        endpoint = f"{self.supabase_url}/rest/v1/{table}"
        query = urlencode({"select": select, "limit": str(limit), "order": order})
        headers = {
            "Accept": "application/json",
            "apikey": self.supabase_key,
            "Authorization": "Bearer " + self.supabase_key,
        }
        try:
            response = requests.get(f"{endpoint}?{query}", headers=headers, timeout=20)
            return response.status_code, self._decode(response)
        except requests.RequestException as exc:
            return 500, {"error": str(exc), "target": endpoint}


def log_event(event_type: str, status: int, detail: str, identity: IdentityContext) -> None:
    st.session_state.events.insert(
        0,
        {
            "timestamp": datetime.now(UTC).isoformat(),
            "event": event_type,
            "status": status,
            "detail": detail,
            "username": identity.username,
            "role": identity.role,
        },
    )
    st.session_state.events = st.session_state.events[:200]


def ensure_state() -> None:
    defaults = {
        "username": os.environ.get("DEFAULT_USERNAME", "operator"),
        "role": os.environ.get("DEFAULT_USER_ROLE", "admin"),
        "department": os.environ.get("DEFAULT_DEPARTMENT", "command-center"),
        "auth_token": os.environ.get("SESSION_AUTH_TOKEN", ""),
        "events": [],
        "sandbox_mode": "GENERAL_BUBBLES",
        "sandbox_score": 0,
    }
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value


def get_identity() -> IdentityContext:
    return IdentityContext(
        username=st.session_state.username.strip() or "operator",
        role=st.session_state.role,
        department=st.session_state.department.strip() or "command-center",
        auth_token=st.session_state.auth_token.strip(),
    )


def has_permission(identity: IdentityContext, permission: str) -> bool:
    return permission in ROLE_PERMISSIONS.get(identity.role, set())


def render_identity_sidebar() -> IdentityContext:
    with st.sidebar:
        st.header("Identity & Permissions")
        st.session_state.username = st.text_input("username", value=st.session_state.username)
        st.session_state.role = st.selectbox("role", ROLES, index=ROLES.index(st.session_state.role) if st.session_state.role in ROLES else 0)
        st.session_state.department = st.text_input("department", value=st.session_state.department)
        st.session_state.auth_token = st.text_input("auth_token", value=st.session_state.auth_token, type="password")
        st.caption(f"Backend: {BACKEND_BASE_URL}")
        st.caption(f"Supabase configured: {'yes' if SUPABASE_URL and SUPABASE_KEY else 'no'}")
    return get_identity()


def render_overview(identity: IdentityContext) -> None:
    st.subheader("Unified Executive Dashboard")
    c1, c2, c3, c4 = st.columns(4)
    with c1:
        region = st.selectbox("region", REGIONS, index=0)
    with c2:
        deal_id = st.text_input("deal_id", value="")
    with c3:
        order_id = st.text_input("order_id", value="")
    with c4:
        room_id = st.text_input("room_id", value="")

    if st.button("refresh full-stack snapshot", type="primary", disabled=not has_permission(identity, "system")):
        code, payload = st.session_state.client.system_status(region, deal_id, order_id, room_id)
        st.session_state.snapshot = payload
        log_event("system_status", code, payload.get("error") if isinstance(payload, dict) else "ok", identity)

    payload = st.session_state.get("snapshot", {})
    summaries = payload.get("summaries", {}) if isinstance(payload, dict) else {}
    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Lifecycle", summaries.get("lifecycle_stage", "n/a"))
    m2.metric("Supply Chain", summaries.get("supply_chain_status", "n/a"))
    m3.metric("Compliance Alerts", summaries.get("compliance_alerts", 0))
    m4.metric("Python Sync", summaries.get("python_sync", "offline"))
    if payload:
        st.json(payload)


def render_backend_contracts(identity: IdentityContext) -> None:
    st.subheader("Back-End Contracts & Invocation")
    st.code("\n".join([
        "GET  /api/system-status?region=&deal_id=&order_id=&room_id=",
        "POST /api/v1/transactions/evaluate {transaction_id,amount,buyer_id,seller_id,username,role,department}",
        "POST /api/v1/memo/analyze {contract_text,username,role,department}",
        "POST /supabase/functions/{function_name} {json payload}",
    ]))

    tx_col, memo_col = st.columns(2)
    with tx_col:
        st.markdown("**Transaction Evaluation**")
        transaction = TransactionRequest(
            transaction_id=st.text_input("transaction_id", value=""),
            amount=st.number_input("amount", min_value=0.0, value=1000.0, step=100.0),
            buyer_id=st.text_input("buyer_id", value="buyer-001"),
            seller_id=st.text_input("seller_id", value="seller-001"),
        )
        if st.button("evaluate transaction", disabled=not has_permission(identity, "transactions")):
            code, payload = st.session_state.client.evaluate_transaction(transaction, identity)
            log_event("transactions.evaluate", code, payload.get("detail") if isinstance(payload, dict) else "ok", identity)
            st.write(f"HTTP {code}")
            st.json(payload)

    with memo_col:
        st.markdown("**Memo / Contract Analysis**")
        contract_text = st.text_area("contract_text", height=210)
        if st.button("analyze memo", disabled=not has_permission(identity, "memo")):
            code, payload = st.session_state.client.analyze_memo(contract_text, identity)
            log_event("memo.analyze", code, payload.get("compliance_status") if isinstance(payload, dict) else "ok", identity)
            st.write(f"HTTP {code}")
            st.json(payload)

    st.markdown("**Supabase Function Router**")
    function_name = st.selectbox("function_name", FUNCTION_NAMES)
    default_payload = {
        "username": identity.username,
        "role": identity.role,
        "department": identity.department,
        "timestamp": datetime.now(UTC).isoformat(),
    }
    payload_text = st.text_area("function_payload_json", value=json.dumps(default_payload, indent=2), height=180)
    if st.button("invoke function", disabled=not has_permission(identity, "functions")):
        try:
            payload = json.loads(payload_text)
        except json.JSONDecodeError as exc:
            st.error(f"Invalid JSON payload: {exc}")
            return
        code, body = st.session_state.client.invoke_function(function_name, payload)
        log_event(f"function.{function_name}", code, body.get("error") if isinstance(body, dict) else "ok", identity)
        st.write(f"HTTP {code}")
        st.json(body)


def render_schema_sync(identity: IdentityContext) -> None:
    st.subheader("Database Schema Synchronization")
    table = st.selectbox("table", list(TABLE_CATALOG.keys()))
    spec = TABLE_CATALOG[table]
    st.write({"primary_key": spec["pk"], "relations": spec["relations"], "column_count": len(spec["columns"])})
    st.code("\n".join(spec["columns"]))

    col1, col2 = st.columns(2)
    with col1:
        limit = st.slider("limit", min_value=5, max_value=200, value=25, step=5)
    with col2:
        order = st.text_input("order", value="created_at.desc")

    if st.button("query table", disabled=not has_permission(identity, "tables")):
        code, rows = st.session_state.client.table_select(table, limit=limit, order=order)
        detail = rows.get("error") if isinstance(rows, dict) else f"{len(rows)} rows"
        log_event(f"table.{table}", code, str(detail), identity)
        st.write(f"HTTP {code}")
        if isinstance(rows, list):
            st.dataframe(rows, use_container_width=True)
        else:
            st.json(rows)


def render_logistics(identity: IdentityContext) -> None:
    st.subheader("Logistics & Automated Supply Chains")
    c1, c2, c3 = st.columns(3)
    with c1:
        order_id = st.text_input("supply_order_id", value="order-001")
        milestone = st.text_input("current_milestone", value="IN_TRANSIT")
        if st.button("sync supply chain", disabled=not has_permission(identity, "logistics")):
            code, body = st.session_state.client.invoke_function(
                "supplyChainCoordinator",
                {"order_id": order_id, "milestone": milestone, "username": identity.username, "role": identity.role},
            )
            log_event("logistics.supply_chain", code, body.get("error") if isinstance(body, dict) else "ok", identity)
            st.json(body)

    with c2:
        listing_title = st.text_input("listing_title", value="Bulk commodity")
        listing_price = st.number_input("listing_price", min_value=0.0, value=50000.0, step=1000.0)
        if st.button("sync marketplace", disabled=not has_permission(identity, "logistics")):
            code, body = st.session_state.client.invoke_function(
                "marketplaceEngine",
                {"title": listing_title, "price": listing_price, "username": identity.username, "role": identity.role},
            )
            log_event("logistics.marketplace", code, body.get("error") if isinstance(body, dict) else "ok", identity)
            st.json(body)

    with c3:
        deal_id = st.text_input("fulfillment_deal_id", value="deal-001")
        note = st.text_input("fulfillment_note", value="release for customs")
        if st.button("sync fulfillment", disabled=not has_permission(identity, "logistics")):
            code, body = st.session_state.client.invoke_function(
                "dealFulfillment",
                {"deal_id": deal_id, "note": note, "username": identity.username, "role": identity.role},
            )
            log_event("logistics.fulfillment", code, body.get("error") if isinstance(body, dict) else "ok", identity)
            st.json(body)


def render_meetings(identity: IdentityContext) -> None:
    st.subheader("Meeting Rooms & Multi-Agent Collaboration")
    c1, c2 = st.columns(2)
    with c1:
        room_name = st.text_input("room_name", value="Executive War Room")
        participants_raw = st.text_input("participants_csv", value="ops-agent,finance-agent,legal-agent")
        if st.button("create instant room", disabled=not has_permission(identity, "meetings")):
            participants = [item.strip() for item in participants_raw.split(",") if item.strip()]
            code, body = st.session_state.client.invoke_function(
                "generateInstantRoom",
                {"room_name": room_name, "participants": participants, "username": identity.username, "role": identity.role},
            )
            log_event("meetings.generate_room", code, body.get("error") if isinstance(body, dict) else "ok", identity)
            st.json(body)

    with c2:
        room_id = st.text_input("collaboration_room_id", value="")
        memo = st.text_area("collaboration_memo", height=180)
        if st.button("sync collaboration", disabled=not has_permission(identity, "meetings")):
            code, body = st.session_state.client.invoke_function(
                "meetingRoom",
                {"room_id": room_id, "memo": memo, "username": identity.username, "role": identity.role},
            )
            log_event("meetings.sync", code, body.get("error") if isinstance(body, dict) else "ok", identity)
            st.json(body)


def render_sandbox(identity: IdentityContext) -> None:
    st.subheader("Security Sandbox • General Bubbles / Iron Dome")
    c1, c2 = st.columns(2)
    with c1:
        mode = st.selectbox("containment_mode", ["GENERAL_BUBBLES", "IRON_DOME"], index=0 if st.session_state.sandbox_mode == "GENERAL_BUBBLES" else 1)
        anomaly_score = st.slider("anomaly_score", min_value=0, max_value=100, value=st.session_state.sandbox_score)
        kill_switch = st.checkbox("kill_switch", value=False)
        if st.button("apply sandbox state", disabled=not has_permission(identity, "sandbox")):
            st.session_state.sandbox_mode = mode
            st.session_state.sandbox_score = anomaly_score
            detail = json.dumps({"mode": mode, "anomaly_score": anomaly_score, "kill_switch": kill_switch})
            log_event("sandbox.apply", 200, detail, identity)
            st.success("Sandbox state updated")

    with c2:
        status = "CONTAINED" if st.session_state.sandbox_score >= 70 or st.session_state.sandbox_mode == "IRON_DOME" else "MONITORING"
        st.metric("Sandbox Mode", st.session_state.sandbox_mode)
        st.metric("Anomaly Score", st.session_state.sandbox_score)
        st.metric("Containment Status", status)


def render_event_log() -> None:
    st.subheader("Live Event Log")
    events = st.session_state.events
    if not events:
        st.info("No events yet.")
        return
    st.dataframe(events, use_container_width=True)


def main() -> None:
    st.set_page_config(page_title="Greens ACC Unified Python Interface", page_icon="🟢", layout="wide")
    ensure_state()
    st.session_state.client = ApiClient(BACKEND_BASE_URL, SUPABASE_URL, SUPABASE_KEY)

    identity = render_identity_sidebar()
    st.title("Greens ACC • Regenerated Unified Interface")
    st.caption("Complete Python control surface for backend contracts, schema synchronization, identity-aware operations, security sandbox telemetry, and collaboration workflows.")

    tabs = st.tabs([
        "Executive Dashboard",
        "Back-End Contracts",
        "Schema Sync",
        "Logistics + Market",
        "Meeting Rooms",
        "Security Sandbox",
        "Events",
    ])

    with tabs[0]:
        render_overview(identity)
    with tabs[1]:
        render_backend_contracts(identity)
    with tabs[2]:
        render_schema_sync(identity)
    with tabs[3]:
        render_logistics(identity)
    with tabs[4]:
        render_meetings(identity)
    with tabs[5]:
        render_sandbox(identity)
    with tabs[6]:
        render_event_log()


if __name__ == "__main__":
    main()
