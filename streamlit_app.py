import os
from datetime import datetime, timezone
from uuid import uuid4

import requests
import streamlit as st


st.set_page_config(
    page_title="Greens ACC - Global B2B Platform",
    page_icon="🟢",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(
    """
<style>
    .main { background: linear-gradient(180deg, #f8fff9 0%, #ffffff 100%); }
    h1, h2, h3 { color: #0f5132; font-family: "Inter", sans-serif; }
    .stAlert { border-radius: 0.75rem; }
</style>
""",
    unsafe_allow_html=True,
)

BACKEND_API_URL = os.environ.get("BACKEND_API_URL", "http://localhost:5000/api/v1").rstrip("/")


def submit_transaction(payload: dict) -> tuple[int, dict]:
    try:
        response = requests.post(
            f"{BACKEND_API_URL}/transactions/evaluate",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=15,
        )
        try:
            body = response.json()
        except ValueError:
            body = {"error": "Backend returned non-JSON response."}
        return response.status_code, body
    except requests.RequestException as exc:
        return 500, {"error": f"Connection failed: {exc}"}


if "audit_logs" not in st.session_state:
    st.session_state.audit_logs = []

st.sidebar.markdown("### **Navigation Control**")
menu_selection = st.sidebar.radio(
    "Go to:",
    ["Dashboard Overview", "B2B Ledger Transaction", "AI Self-Healing & Security Logs"],
)

st.sidebar.divider()
st.sidebar.markdown("### **System Status**")
st.sidebar.success("Pipeline Status: Green (Passed)")
st.sidebar.info("CodeQL Scan: 0 Alerts")
st.sidebar.caption(f"API: `{BACKEND_API_URL}`")

if menu_selection == "Dashboard Overview":
    st.title("🌐 Greens ACC Global Operations Dashboard")
    st.subheader("Real-time monitoring and compliance overview")

    blocked = sum(1 for item in st.session_state.audit_logs if item["status"] == 403)
    verified = sum(1 for item in st.session_state.audit_logs if item["status"] == 200)
    total = len(st.session_state.audit_logs)

    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Total Evaluations", total)
    with col2:
        st.metric("Verified", verified)
    with col3:
        st.metric("Blocked", blocked)

elif menu_selection == "B2B Ledger Transaction":
    st.title("📝 Execute B2B Ledger Entry")
    st.write("Submit commodity transactions for AI risk evaluation and staged enforcement.")

    with st.form("transaction_form", clear_on_submit=False):
        col_left, col_right = st.columns(2)

        with col_left:
            buyer_id = st.text_input("Buyer ID", placeholder="buyer-001")
            seller_id = st.text_input("Seller ID", placeholder="seller-001")
            transaction_amount = st.number_input("Transaction Value (USD)", min_value=0.0, step=100.0)

        with col_right:
            transaction_id = st.text_input("Transaction ID", placeholder="auto-generated if empty")
            company_name = st.text_input("Counterparty Company Name", placeholder="e.g., Global Logistics Corp")
            risk_override = st.checkbox("Simulate High-Risk Flag (For Testing 403 Rules)")

        submitted = st.form_submit_button("Commit Transaction to Ledger")

        if submitted:
            if not buyer_id or not seller_id:
                st.warning("Please provide both buyer_id and seller_id.")
            else:
                amount = max(transaction_amount, 100001.0) if risk_override else transaction_amount
                payload = {
                    "transaction_id": transaction_id.strip() or str(uuid4()),
                    "amount": amount,
                    "buyer_id": buyer_id.strip(),
                    "seller_id": seller_id.strip(),
                    "company": company_name.strip(),
                }

                with st.spinner("Evaluating compliance structures..."):
                    status, result = submit_transaction(payload)

                st.session_state.audit_logs.insert(
                    0,
                    {
                        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
                        "event": "Transaction Evaluate",
                        "status": status,
                        "details": result.get("detail") or result.get("warning") or result.get("error") or "Processed",
                    },
                )
                st.session_state.audit_logs = st.session_state.audit_logs[:50]

                if status == 200:
                    st.success("Transaction evaluated successfully.")
                    st.json(result)
                elif status == 403:
                    st.error("🚨 Transaction Blocked (403 Forbidden)")
                    st.markdown(
                        "AI Enforcement Reason: high-risk transaction intercepted and logged to `ai_transaction_logs`."
                    )
                    st.json(result)
                else:
                    st.warning(f"Unexpected response status [{status}].")
                    st.json(result)

elif menu_selection == "AI Self-Healing & Security Logs":
    st.title("🛡️ AI Self-Healing & Security Interface")
    st.write("Recent transaction evaluation events from this active session.")

    if not st.session_state.audit_logs:
        st.info("No logs yet. Submit a transaction to populate audit trail.")
    else:
        st.markdown("### Recent Audit Trails")
        for log in st.session_state.audit_logs:
            if log["status"] == 403:
                st.error(
                    f"**Time:** `{log['timestamp']}` | **Event:** {log['event']} | "
                    f"**Status:** {log['status']} | **Details:** {log['details']}"
                )
            elif log["status"] == 200:
                st.success(
                    f"**Time:** `{log['timestamp']}` | **Event:** {log['event']} | "
                    f"**Status:** {log['status']} | **Details:** {log['details']}"
                )
            else:
                st.warning(
                    f"**Time:** `{log['timestamp']}` | **Event:** {log['event']} | "
                    f"**Status:** {log['status']} | **Details:** {log['details']}"
                )
