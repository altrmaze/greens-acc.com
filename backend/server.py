#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import time
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib import error, parse, request


ROOT_DIR = Path(__file__).resolve().parent.parent
DIST_DIR = ROOT_DIR / "dist"
PORT = int(os.environ.get("PORT", "5000"))
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_FUNCTIONS_BASE_URL = os.environ.get("SUPABASE_FUNCTIONS_BASE_URL", "").rstrip("/")


REGION_TIMEZONES = {
    "global": "UTC",
    "us": "America/New_York",
    "ae": "Asia/Dubai",
    "eg": "Africa/Cairo",
    "in": "Asia/Kolkata",
    "pl": "Europe/Warsaw",
    "fr": "Europe/Paris",
    "cn": "Asia/Shanghai",
    "mn": "Asia/Ulaanbaatar",
}


def json_bytes(payload: dict[str, Any]) -> bytes:
    return json.dumps(payload, ensure_ascii=False).encode("utf-8")


def lifecycle_stage(deal: dict[str, Any] | None) -> str:
    if not deal:
        return "Awaiting inputs"
    if deal.get("escrow_status") == "released":
        return "Escrow released"
    if deal.get("handshake_status") == "confirmed":
        return "Handshake confirmed"
    if deal.get("entry_fee_status") in {"paid", "verified"}:
        return "Entry paid"
    return "Awaiting inputs"


def supabase_get(path: str, query: str) -> list[dict[str, Any]]:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return []
    endpoint = f"{SUPABASE_URL}/rest/v1/{path}"
    if query:
        endpoint = f"{endpoint}?{query}"
    req = request.Request(
        endpoint,
        headers={
            "Accept": "application/json",
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
        },
        method="GET",
    )
    with request.urlopen(req, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def supabase_insert(path: str, payload: dict[str, Any]) -> None:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return
    endpoint = f"{SUPABASE_URL}/rest/v1/{path}"
    req = request.Request(
        endpoint,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
        },
        method="POST",
    )
    with request.urlopen(req, timeout=10):
        return


def evaluate_risk(amount: float) -> float:
    return 0.85 if amount > 100000 else 0.15


def get_current_rollout_mode() -> str:
    try:
        rows = supabase_get("ai_monitoring_config", "select=current_mode&order=id.desc&limit=1")
        if rows and rows[0].get("current_mode") in {"shadow", "assisted", "enforcement"}:
            return rows[0]["current_mode"]
    except Exception:  # noqa: BLE001
        pass
    return "shadow"


def supabase_functions_target(base_url: str, function_path: str, query: str) -> str:
    base = base_url.rstrip("/")
    if not base and SUPABASE_URL:
        base = f"{SUPABASE_URL}/functions/v1"
    if not base:
        return ""

    parsed_base = parse.urlparse(base)
    host = parsed_base.netloc.lower()
    if host.endswith(".supabase.co") and ".functions.supabase.co" not in host and "/functions/" not in parsed_base.path:
        base = f"{base}/functions/v1"

    target = f"{base}/{function_path.lstrip('/')}"
    if query:
        target = f"{target}?{query}"
    return target


class GreensHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, directory=str(DIST_DIR), **kwargs)

    def log_message(self, fmt: str, *args: Any) -> None:  # noqa: A003
        super().log_message("[Greens ACC] " + fmt, *args)

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(HTTPStatus.NO_CONTENT)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        parsed = parse.urlparse(self.path)
        if parsed.path == "/api/system-status":
            self.handle_system_status(parsed)
            return
        super().do_GET()

    def do_POST(self) -> None:  # noqa: N802
        parsed = parse.urlparse(self.path)
        if parsed.path == "/api/v1/transactions/evaluate":
            self.handle_transaction_evaluate()
            return
        if parsed.path == "/api/v1/memo/analyze":
            self.handle_memo_analyze()
            return
        if parsed.path.startswith("/supabase/functions/"):
            self.proxy_supabase_function(parsed)
            return
        self.send_error(HTTPStatus.NOT_FOUND, "Unknown endpoint")

    def handle_memo_analyze(self) -> None:
        length = int(self.headers.get("Content-Length", "0") or "0")
        try:
            body: dict[str, Any] = json.loads(self.rfile.read(length)) if length else {}
        except (json.JSONDecodeError, ValueError):
            self._write_json(HTTPStatus.BAD_REQUEST, {"detail": "Invalid JSON body."})
            return

        contract_text: str = body.get("contract_text", "")
        if not contract_text.strip():
            self._write_json(HTTPStatus.BAD_REQUEST, {"detail": "Contract text cannot be empty."})
            return

        text_lower = contract_text.lower()
        risk_factors: list[str] = []

        import re  # noqa: PLC0415

        if not re.search(r"\b(FOB|CIF|EXW|DDP|CFR|CIP|DAP|DPU|FCA|CPT|FAS)\b", contract_text, re.IGNORECASE):
            risk_factors.append("Missing Incoterms 2020 delivery assignment (e.g., FOB, CIF, EXW).")

        if not re.search(r"governing law|jurisdiction", text_lower):
            risk_factors.append("Governing law or jurisdiction clause is absent.")

        if not re.search(r"payment terms|letter of credit|\bLC\b|wire transfer|escrow", text_lower):
            risk_factors.append("Payment terms are not explicitly defined.")

        if not re.search(r"dispute|arbitration|mediation|\bICC\b|UNCITRAL", text_lower):
            risk_factors.append("No dispute resolution mechanism found.")

        if not re.search(r"force majeure|act of god|unforeseeable", text_lower):
            risk_factors.append("Force majeure clause is absent.")

        if not re.search(r"termination|cancellation", text_lower):
            risk_factors.append("Termination or cancellation provisions are missing.")

        compliance_status = "PASS" if not risk_factors else "ACTION REQUIRED"

        words = contract_text.split()
        excerpt = " ".join(words[:40]) + ("..." if len(words) > 40 else "")
        summary = (
            f"Contract text reviewed ({len(words)} words). "
            f"Excerpt: {excerpt} "
            f"Found {len(risk_factors)} issue(s) requiring attention."
        )

        self._write_json(
            HTTPStatus.OK,
            {
                "summary": summary,
                "risk_factors": risk_factors,
                "compliance_status": compliance_status,
            },
        )

    def handle_transaction_evaluate(self) -> None:
        length = int(self.headers.get("Content-Length", "0") or "0")
        try:
            payload: dict[str, Any] = json.loads(self.rfile.read(length)) if length else {}
        except (json.JSONDecodeError, ValueError):
            self._write_json(HTTPStatus.BAD_REQUEST, {"detail": "Invalid JSON body."})
            return

        required = {"transaction_id", "amount", "buyer_id", "seller_id"}
        missing = [key for key in required if key not in payload]
        if missing:
            self._write_json(HTTPStatus.BAD_REQUEST, {"detail": f"Missing required fields: {', '.join(sorted(missing))}."})
            return

        transaction_id = str(payload.get("transaction_id", "")).strip()
        buyer_id = str(payload.get("buyer_id", "")).strip()
        seller_id = str(payload.get("seller_id", "")).strip()
        try:
            amount = float(payload.get("amount"))
        except (TypeError, ValueError):
            self._write_json(HTTPStatus.BAD_REQUEST, {"detail": "amount must be numeric."})
            return

        if not transaction_id or not buyer_id or not seller_id:
            self._write_json(
                HTTPStatus.BAD_REQUEST,
                {"detail": "transaction_id, buyer_id, and seller_id must be non-empty strings."},
            )
            return

        start_time = time.time()
        risk_score = evaluate_risk(amount)
        current_mode = get_current_rollout_mode()

        action_taken = "logged"
        is_blocked = False
        warning_message: str | None = None

        if risk_score > 0.70:
            if current_mode == "assisted":
                action_taken = "warned"
                warning_message = "Caution: This high-impact transaction has flags."
            elif current_mode == "enforcement":
                action_taken = "blocked"
                is_blocked = True

        duration_ms = int((time.time() - start_time) * 1000)

        try:
            supabase_insert(
                "ai_transaction_logs",
                {
                    "transaction_id": transaction_id,
                    "risk_score": risk_score,
                    "action_taken": action_taken,
                    "processing_time_ms": duration_ms,
                },
            )
        except Exception as exc:  # noqa: BLE001
            print(f"Metrics logging failed: {exc}")

        if is_blocked:
            self._write_json(
                HTTPStatus.FORBIDDEN,
                {"detail": "Transaction blocked by AI safety guardrails for verification."},
            )
            return

        self._write_json(
            HTTPStatus.OK,
            {
                "status": "success",
                "action_mode": current_mode,
                "warning": warning_message,
                "payload": {
                    "transaction_id": transaction_id,
                    "amount": amount,
                    "buyer_id": buyer_id,
                    "seller_id": seller_id,
                },
            },
        )

    def end_headers(self) -> None:
        self._send_cors_headers()
        super().end_headers()

    def _send_cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")

    def _write_json(self, status: HTTPStatus, payload: dict[str, Any]) -> None:
        body = json_bytes(payload)
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def handle_system_status(self, parsed: parse.ParseResult) -> None:
        params = parse.parse_qs(parsed.query)
        region = (params.get("region", ["global"])[0] or "global").lower()
        deal_id = params.get("deal_id", [""])[0]
        order_id = params.get("order_id", [""])[0]
        room_id = params.get("room_id", [""])[0]

        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            self._write_json(
                HTTPStatus.OK,
                {
                    "available": False,
                    "backend": "python",
                    "timestamp": self.date_time_string(),
                    "reason": "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not configured",
                    "locale": {
                        "region": region,
                        "region_timezone": REGION_TIMEZONES.get(region, "UTC"),
                    },
                    "deal": None,
                    "supply_chain": None,
                    "room_session": None,
                    "compliance_logs": [],
                    "summaries": {
                        "lifecycle_stage": "Awaiting inputs",
                        "supply_chain_status": "offline",
                        "compliance_alerts": 0,
                    },
                },
            )
            return

        try:
            deal = None
            if deal_id:
                query = parse.urlencode(
                    {
                        "id": f"eq.{deal_id}",
                        "select": "id,region,currency,amount_total,entry_fee_amount,entry_fee_status,handshake_commission_amount,lc_reference_number,handshake_status,escrow_status,funds_locked,compliance_status,safe_withdrawal_ready,withdrawal_triggered,ai_agent_status,last_updated",
                        "limit": "1",
                    }
                )
                deals = supabase_get("green_acc_deals", query)
                deal = deals[0] if deals else None

            supply_chain = None
            if order_id:
                query = parse.urlencode(
                    {
                        "order_id": f"eq.{order_id}",
                        "select": "id,order_id,carrier_identity,origin_point,destination_point,current_milestone,transit_status,updated_at",
                        "order": "updated_at.desc",
                        "limit": "1",
                    }
                )
                records = supabase_get("supply_chain_tracking", query)
                supply_chain = records[0] if records else None

            room_session = None
            compliance_logs: list[dict[str, Any]] = []
            if room_id:
                session_query = parse.urlencode(
                    {
                        "room_id": f"eq.{room_id}",
                        "select": "id,room_id,session_status,kill_switch_triggered,kill_switch_reason,handshake_allowed,payment_allowed,last_ai_check",
                        "order": "created_at.desc",
                        "limit": "1",
                    }
                )
                sessions = supabase_get("room_sessions", session_query)
                room_session = sessions[0] if sessions else None

                logs_query = parse.urlencode(
                    {
                        "room_id": f"eq.{room_id}",
                        "select": "id,violation_type,severity,description,is_resolved,created_at",
                        "order": "created_at.desc",
                        "limit": "5",
                    }
                )
                compliance_logs = supabase_get("compliance_logs", logs_query)

            alerts = sum(1 for item in compliance_logs if item.get("severity") in {"critical", "kill_switch"})

            self._write_json(
                HTTPStatus.OK,
                {
                    "available": True,
                    "backend": "python",
                    "timestamp": self.date_time_string(),
                    "locale": {
                        "region": region,
                        "region_timezone": REGION_TIMEZONES.get(region, "UTC"),
                    },
                    "deal": deal,
                    "supply_chain": supply_chain,
                    "room_session": room_session,
                    "compliance_logs": compliance_logs,
                    "summaries": {
                        "lifecycle_stage": lifecycle_stage(deal),
                        "supply_chain_status": supply_chain.get("transit_status") if supply_chain else "idle",
                        "compliance_alerts": alerts,
                        "python_sync": "online",
                    },
                },
            )
        except error.HTTPError as exc:
            details = exc.read().decode("utf-8", errors="replace")
            self._write_json(
                HTTPStatus.BAD_GATEWAY,
                {
                    "available": False,
                    "backend": "python",
                    "error": "Supabase status request failed",
                    "details": details,
                },
            )
        except Exception as exc:  # noqa: BLE001
            self._write_json(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                {
                    "available": False,
                    "backend": "python",
                    "error": "Unexpected status aggregation failure",
                    "details": str(exc),
                },
            )

    def proxy_supabase_function(self, parsed: parse.ParseResult) -> None:
        function_path = parsed.path.removeprefix("/supabase/functions/").lstrip("/")
        if not function_path:
            self._write_json(
                HTTPStatus.BAD_REQUEST,
                {
                    "error": "Missing Supabase function name in request path",
                    "backend": "python",
                },
            )
            return

        target = supabase_functions_target(SUPABASE_FUNCTIONS_BASE_URL, function_path, parsed.query)
        if not target:
            self._write_json(
                HTTPStatus.BAD_GATEWAY,
                {
                    "error": "SUPABASE_FUNCTIONS_BASE_URL or SUPABASE_URL is not configured",
                    "backend": "python",
                },
            )
            return

        length = int(self.headers.get("Content-Length", "0") or "0")
        body = self.rfile.read(length) if length else None
        upstream = request.Request(
            target,
            data=body,
            headers={
                "Content-Type": self.headers.get("Content-Type", "application/json"),
                "Accept": self.headers.get("Accept", "application/json"),
            },
            method="POST",
        )

        try:
            with request.urlopen(upstream, timeout=30) as response:
                payload = response.read()
                self.send_response(response.status)
                self.send_header("Content-Type", response.headers.get("Content-Type", "application/json"))
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
        except error.HTTPError as exc:
            payload = exc.read() or json_bytes({"error": exc.reason})
            self.send_response(exc.code)
            self.send_header("Content-Type", exc.headers.get("Content-Type", "application/json"))
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
        except Exception as exc:  # noqa: BLE001
            self._write_json(
                HTTPStatus.BAD_GATEWAY,
                {
                    "error": "Supabase function proxy failed",
                    "backend": "python",
                    "details": str(exc),
                },
            )


def main() -> None:
    DIST_DIR.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer(("0.0.0.0", PORT), GreensHandler)
    print(f"Greens ACC server listening on http://0.0.0.0:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
