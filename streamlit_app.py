import json
import os
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlencode

import requests
import streamlit as st

BACKEND_API_URL = os.environ.get("BACKEND_API_URL", "http://localhost:5000").rstrip("/")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

SYSTEM_TABLES = [
    "ai_monitoring_config",
    "ai_transaction_logs",
    "green_acc_deals",
    "meeting_signals",
    "global_news",
    "global_risk_flags",
    "deal_announcements",
    "instant_rooms",
    "document_references",
    "compliance_logs",
    "room_sessions",
    "marketplace_listings",
    "user_profiles",
    "legal_audit_logs",
    "supply_chain_tracking",
    "deal_clearances",
    "deal_documents",
    "deal_appointments",
    "proxy_gov_filings",
    "deal_fulfillments",
    "meeting_room_documents",
    "meeting_memos",
]

REGIONS = ["global", "us", "ae", "eg", "in", "pl", "fr", "cn", "mn"]


class ApiClient:
    def __init__(self, backend_url: str, supabase_url: str, supabase_key: str) -> None:
        self.backend_url = backend_url
        self.supabase_url = supabase_url
        self.supabase_key = supabase_key

    def _post(self, path: str, payload: dict[str, Any], timeout: int = 30) -> tuple[int, dict[str, Any]]:
        try:
            response = requests.post(
                f"{self.backend_url}{path}",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=timeout,
            )
            return response.status_code, self._json_or_error(response)
        except requests.RequestException as exc:
            return 500, {"error": str(exc)}

    def _get(self, path: str, params: dict[str, str]) -> tuple[int, dict[str, Any]]:
        try:
            response = requests.get(f"{self.backend_url}{path}", params=params, timeout=30)
            return response.status_code, self._json_or_error(response)
        except requests.RequestException as exc:
            return 500, {"error": str(exc)}

    @staticmethod
    def _json_or_error(response: requests.Response) -> dict[str, Any]:
        try:
            return response.json()
        except ValueError:
            return {"error": f"Non-JSON response: {response.text[:300]}"}

    def get_system_status(self, region: str, deal_id: str, order_id: str, room_id: str) -> tuple[int, dict[str, Any]]:
        return self._get(
            "/api/system-status",
            {
                "region": region,
                "deal_id": deal_id,
                "order_id": order_id,
                "room_id": room_id,
            },
        )

    def evaluate_transaction(self, payload: dict[str, Any]) -> tuple[int, dict[str, Any]]:
        return self._post("/api/v1/transactions/evaluate", payload)

    def analyze_contract(self, contract_text: str) -> tuple[int, dict[str, Any]]:
        return self._post("/api/v1/memo/analyze", {"contract_text": contract_text})

    def invoke_function(self, function_name: str, payload: dict[str, Any]) -> tuple[int, dict[str, Any]]:
        return self._post(f"/supabase/functions/{function_name}", payload)

    def query_table(self, table: str, select: str = "*", limit: int = 25, order: str | None = None) -> tuple[int, list[dict[str, Any]] | dict[str, Any]]:
        if not self.supabase_url or not self.supabase_key:
            return 503, {"error": "SUPABASE_URL and key are required for direct table sync views."}

        endpoint = f"{self.supabase_url}/rest/v1/{table}"
        query = {"select": select, "limit": str(limit)}
        if order:
            query["order"] = order

        try:
            response = requests.get(
                f"{endpoint}?{urlencode(query)}",
                headers={
                    "Accept": "application/json",
                    "apikey": self.supabase_key,
                    "Authorization": f"******",
                },
                timeout=20,
            )
            payload = self._json_or_error(response)
            if isinstance(payload, list):
                return response.status_code, payload
            return response.status_code, payload
        except requests.RequestException as exc:
            return 500, {"error": str(exc)}


def init_state() -> None:
    defaults: dict[str, Any] = {
        "username": os.environ.get("DEFAULT_USERNAME", "operator"),
        "user_role": os.environ.get("DEFAULT_USER_ROLE", "admin"),
        "session_id": f"sess-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
        "events": [],
    }
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value


def log_event(category: str, status_code: int, detail: str) -> None:
    st.session_state.events.insert(
        0,
        {
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
            "category": category,
            "status": status_code,
            "detail": detail,
            "username": st.session_state.username,
        },
    )
    st.session_state.events = st.session_state.events[:120]


def sidebar_identity() -> None:
    with st.sidebar:
        st.header("Identity & Access")
        st.session_state.username = st.text_input("Username", value=st.session_state.username)
        st.session_state.user_role = st.selectbox(
            "Role",
            ["admin", "manager", "operator", "auditor", "viewer"],
            index=["admin", "manager", "operator", "auditor", "viewer"].index(st.session_state.user_role)
            if st.session_state.user_role in {"admin", "manager", "operator", "auditor", "viewer"}
            else 0,
        )
        st.caption(f"Session ID: {st.session_state.session_id}")
        st.caption(f"Backend: {BACKEND_API_URL}")
        st.caption(f"Supabase: {'configured' if SUPABASE_URL else 'not configured'}")


st.set_page_config(page_title="Greens ACC Unified Python Interface", page_icon="🟢", layout="wide")
init_state()
sidebar_identity()

supabase_key = SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY
client = ApiClient(BACKEND_API_URL, SUPABASE_URL, supabase_key)

st.title("Greens ACC • Regenerated Unified Python Interface")
st.caption("Synchronized control surface for backend APIs, Supabase schema, security sandbox, logistics, and collaboration rooms.")

sections = st.tabs(
    [
        "Executive Dashboard",
        "System Alignment",
        "Transaction & Compliance",
        "Market + Supply Chain",
        "Meeting Rooms & Collaboration",
        "Security Sandbox",
    ]
)

with sections[0]:
    st.subheader("Unified Executive Dashboard")
    c1, c2, c3, c4 = st.columns(4)
    with c1:
        region = st.selectbox("Region", REGIONS, index=0)
    with c2:
        deal_id = st.text_input("Deal ID", value="")
    with c3:
        order_id = st.text_input("Order ID", value="")
    with c4:
        room_id = st.text_input("Room ID", value="")

    if st.button("Refresh Synchronization Snapshot", type="primary"):
        code, status_payload = client.get_system_status(region, deal_id, order_id, room_id)
        detail = status_payload.get("error") or status_payload.get("reason") or "status refreshed"
        log_event("system_status", code, detail)
        if code == 200:
            st.success("System snapshot updated.")
        else:
            st.error(f"Snapshot failed with status {code}")
        st.session_state["status_payload"] = status_payload

    payload = st.session_state.get("status_payload", {})
    summaries = payload.get("summaries", {}) if isinstance(payload, dict) else {}
    metrics = st.columns(4)
    metrics[0].metric("Lifecycle Stage", summaries.get("lifecycle_stage", "n/a"))
    metrics[1].metric("Supply Chain", summaries.get("supply_chain_status", "n/a"))
    metrics[2].metric("Compliance Alerts", summaries.get("compliance_alerts", 0))
    metrics[3].metric("Python Sync", summaries.get("python_sync", "offline"))

    if payload:
        st.json(payload)

with sections[1]:
    st.subheader("Back-end/API + Database Schema Alignment")
    col_a, col_b = st.columns(2)
    with col_a:
        st.markdown("**Mapped Python endpoints**")
        st.code(
            "\n".join(
                [
                    "GET  /api/system-status",
                    "POST /api/v1/transactions/evaluate",
                    "POST /api/v1/memo/analyze",
                    "POST /supabase/functions/{function}",
                ]
            )
        )
    with col_b:
        st.markdown("**Tracked Supabase core tables**")
        st.write(", ".join(SYSTEM_TABLES))

    table = st.selectbox("Inspect table", SYSTEM_TABLES, index=0)
    limit = st.slider("Rows", min_value=5, max_value=100, value=20, step=5)
    if st.button("Query selected table"):
        code, rows = client.query_table(table=table, limit=limit, order="created_at.desc")
        detail = rows.get("error", "ok") if isinstance(rows, dict) else f"{len(rows)} rows"
        log_event(f"table:{table}", code, detail)
        if code == 200 and isinstance(rows, list):
            st.dataframe(rows, use_container_width=True)
        else:
            st.error(f"Query failed ({code})")
            st.json(rows)

with sections[2]:
    st.subheader("Transaction Risk + Memo Compliance")
    trans_col, memo_col = st.columns(2)

    with trans_col:
        st.markdown("**Transaction Evaluation**")
        tx_id = st.text_input("Transaction ID", value="")
        amount = st.number_input("Amount", min_value=0.0, value=1000.0, step=100.0)
        buyer_id = st.text_input("Buyer ID", value="buyer-001")
        seller_id = st.text_input("Seller ID", value="seller-001")
        company = st.text_input("Company", value="Greens Trading")

        if st.button("Evaluate Transaction"):
            code, response_payload = client.evaluate_transaction(
                {
                    "transaction_id": tx_id.strip() or f"tx-{int(datetime.now(timezone.utc).timestamp())}",
                    "amount": amount,
                    "buyer_id": buyer_id,
                    "seller_id": seller_id,
                    "company": company,
                    "username": st.session_state.username,
                }
            )
            detail = response_payload.get("detail") or response_payload.get("warning") or response_payload.get("status", "processed")
            log_event("transaction_evaluate", code, str(detail))
            if code == 200:
                st.success("Transaction accepted")
            elif code == 403:
                st.error("Transaction blocked by enforcement")
            else:
                st.warning(f"Transaction returned status {code}")
            st.json(response_payload)

    with memo_col:
        st.markdown("**Memo/Contract Analysis**")
        contract_text = st.text_area(
            "Contract Text",
            height=220,
            placeholder="Paste contract text with governing law, payment terms, dispute and force majeure clauses.",
        )
        if st.button("Analyze Memo"):
            code, response_payload = client.analyze_contract(contract_text)
            detail = response_payload.get("compliance_status") or response_payload.get("detail") or "analyzed"
            log_event("memo_analyze", code, str(detail))
            if code == 200:
                st.success("Memo analyzed")
            else:
                st.error(f"Analysis failed ({code})")
            st.json(response_payload)

with sections[3]:
    st.subheader("Logistics, Marketplace, and Multi-Agent Supply Chain")
    fcol1, fcol2, fcol3 = st.columns(3)

    with fcol1:
        st.markdown("**Supply Chain Coordinator**")
        order_ref = st.text_input("Order Ref", value="order-001")
        milestone = st.text_input("Milestone", value="IN_TRANSIT")
        if st.button("Sync supplyChainCoordinator"):
            code, response_payload = client.invoke_function(
                "supplyChainCoordinator",
                {
                    "order_id": order_ref,
                    "milestone": milestone,
                    "username": st.session_state.username,
                    "role": st.session_state.user_role,
                },
            )
            detail = response_payload.get("error") or response_payload.get("message") or "synced"
            log_event("supply_chain_coordinator", code, str(detail))
            st.json(response_payload)

    with fcol2:
        st.markdown("**Marketplace Engine**")
        listing_title = st.text_input("Listing Title", value="Bulk commodities lot")
        listing_price = st.number_input("Listing Price", min_value=0.0, value=50000.0, step=1000.0)
        if st.button("Sync marketplaceEngine"):
            code, response_payload = client.invoke_function(
                "marketplaceEngine",
                {
                    "title": listing_title,
                    "price": listing_price,
                    "username": st.session_state.username,
                },
            )
            detail = response_payload.get("error") or response_payload.get("message") or "synced"
            log_event("marketplace_engine", code, str(detail))
            st.json(response_payload)

    with fcol3:
        st.markdown("**Deal Fulfillment**")
        deal_ref = st.text_input("Deal Ref", value="deal-001")
        fulfillment_note = st.text_input("Fulfillment Note", value="Ready for clearance")
        if st.button("Sync dealFulfillment"):
            code, response_payload = client.invoke_function(
                "dealFulfillment",
                {
                    "deal_id": deal_ref,
                    "note": fulfillment_note,
                    "username": st.session_state.username,
                },
            )
            detail = response_payload.get("error") or response_payload.get("message") or "synced"
            log_event("deal_fulfillment", code, str(detail))
            st.json(response_payload)

with sections[4]:
    st.subheader("Meeting Rooms & Collaboration Hubs")
    m1, m2 = st.columns(2)

    with m1:
        st.markdown("**Generate Instant Room**")
        room_label = st.text_input("Room Name", value="Executive Sync")
        participants = st.text_input("Participants (comma separated)", value="ops-agent,finance-agent,legal-agent")
        if st.button("Create instant room"):
            code, response_payload = client.invoke_function(
                "generateInstantRoom",
                {
                    "room_name": room_label,
                    "participants": [p.strip() for p in participants.split(",") if p.strip()],
                    "username": st.session_state.username,
                    "role": st.session_state.user_role,
                },
            )
            detail = response_payload.get("error") or response_payload.get("room_id") or "created"
            log_event("generate_instant_room", code, str(detail))
            st.json(response_payload)

    with m2:
        st.markdown("**Meeting Room Memo + Compliance**")
        room_id = st.text_input("Room ID", value="")
        memo_text = st.text_area("Meeting Memo", value="", height=160)
        if st.button("Sync meetingRoom"):
            code, response_payload = client.invoke_function(
                "meetingRoom",
                {
                    "room_id": room_id,
                    "memo": memo_text,
                    "username": st.session_state.username,
                    "role": st.session_state.user_role,
                },
            )
            detail = response_payload.get("error") or response_payload.get("message") or "posted"
            log_event("meeting_room", code, str(detail))
            st.json(response_payload)

with sections[5]:
    st.subheader("Security Sandbox • General Bubbles / Iron Dome")
    sb1, sb2 = st.columns([1, 1])

    with sb1:
        st.markdown("**Containment Status**")
        shield_mode = st.selectbox("Shield", ["GENERAL_BUBBLES", "IRON_DOME"], index=0)
        quarantine_target = st.text_input("Target Session ID", value=st.session_state.session_id)
        if st.button("Apply containment operation"):
            operation = {
                "shield_mode": shield_mode,
                "target_session": quarantine_target,
                "username": st.session_state.username,
                "role": st.session_state.user_role,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            log_event("sandbox_operation", 200, json.dumps(operation))
            st.success("Containment operation registered in session telemetry")
            st.json(operation)

    with sb2:
        st.markdown("**Recent Interface Security Events**")
        if not st.session_state.events:
            st.info("No events yet.")
        else:
            st.dataframe(st.session_state.events[:25], use_container_width=True)

st.divider()
st.subheader("Live Agent Event Log")
if st.session_state.events:
    st.dataframe(st.session_state.events, use_container_width=True)
else:
    st.info("No actions executed in this session yet.")
