#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import time
import hmac
import hashlib
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
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

GREEN_BANANAS_SAMPLE_SURVEYS: list[dict[str, Any]] = [
    {
        "user_id": "demo-user-1",
        "content": {"response_text": "Cosmetic line inquiry integration check."},
        "created_at": "2026-07-06T00:00:00Z",
    },
    {
        "user_id": "demo-user-2",
        "content": {"response_text": "Render engine asset pipeline active."},
        "created_at": "2026-07-05T00:00:00Z",
    },
]
IN_MEMORY_GB_SURVEYS: list[dict[str, Any]] = []


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


def supabase_insert(path: str, payload: dict[str, Any]) -> list[dict[str, Any]]:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return []
    endpoint = f"{SUPABASE_URL}/rest/v1/{path}"
    req = request.Request(
        endpoint,
        data=json_bytes(payload),
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Prefer": "return=representation",
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
        },
        method="POST",
    )
    with request.urlopen(req, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def format_green_bananas_surveys(rows: list[dict[str, Any]]) -> list[dict[str, str]]:
    surveys: list[dict[str, str]] = []
    for row in rows:
        content = row.get("content")
        if not isinstance(content, dict):
            content = {}
        timestamp = str(row.get("created_at") or row.get("timestamp") or "")[:10] or "2026-07-06"
        response_text = str(content.get("response_text") or content.get("summary") or "Survey response recorded.")
        surveys.append(
            {
                "timestamp": timestamp,
                "response_text": response_text,
            }
        )
    return surveys


def parse_stripe_signature(signature_header: str) -> tuple[str, list[str]]:
    timestamp = ""
    signatures: list[str] = []
    for part in signature_header.split(","):
        cleaned = part.strip()
        if cleaned.startswith("t="):
            timestamp = cleaned[2:]
        elif cleaned.startswith("v1="):
            signatures.append(cleaned[3:])
    return timestamp, signatures


def verify_stripe_signature(payload_text: str, signature_header: str, secret: str, tolerance_seconds: int = 300) -> bool:
    if not signature_header or not secret:
        return False
    timestamp, expected_signatures = parse_stripe_signature(signature_header)
    if not timestamp or not expected_signatures:
        return False
    try:
        if abs(time.time() - int(timestamp)) > tolerance_seconds:
            return False
    except ValueError:
        return False

    signed_payload = f"{timestamp}.{payload_text}".encode("utf-8")
    computed_signature = hmac.new(secret.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()
    return any(hmac.compare_digest(signature, computed_signature) for signature in expected_signatures)


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
        if parsed.path == "/api/v1/green-bananas/content":
            self.handle_green_bananas_content()
            return
        super().do_GET()

    def do_POST(self) -> None:  # noqa: N802
        parsed = parse.urlparse(self.path)
        if parsed.path == "/api/v1/memo/analyze":
            self.handle_memo_analyze()
            return
        if parsed.path == "/api/v1/green-bananas/survey/submit":
            self.handle_green_bananas_survey_submit()
            return
        if parsed.path == "/api/v1/payments/webhook":
            self.handle_payments_webhook()
            return
        if parsed.path.startswith("/supabase/functions/"):
            self.proxy_supabase_function(parsed)
            return
        self.send_error(HTTPStatus.NOT_FOUND, "Unknown endpoint")

    def _read_json_body(self) -> dict[str, Any] | None:
        length = int(self.headers.get("Content-Length", "0") or "0")
        try:
            return json.loads(self.rfile.read(length)) if length else {}
        except (json.JSONDecodeError, ValueError):
            self._write_json(HTTPStatus.BAD_REQUEST, {"detail": "Invalid JSON body."})
            return None

    def handle_memo_analyze(self) -> None:
        body = self._read_json_body()
        if body is None:
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

    def handle_green_bananas_content(self) -> None:
        records = list(IN_MEMORY_GB_SURVEYS)
        source = "memory"

        if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
            try:
                query = parse.urlencode(
                    {
                        "select": "user_id,content,created_at",
                        "order": "created_at.desc",
                        "limit": "10",
                    }
                )
                records = supabase_get("gb_surveys", query)
                source = "supabase"
            except error.HTTPError:
                records = list(IN_MEMORY_GB_SURVEYS)
                source = "memory"
            except Exception:
                records = list(IN_MEMORY_GB_SURVEYS)
                source = "memory"

        if not records:
            records = GREEN_BANANAS_SAMPLE_SURVEYS
            source = "mock"

        self._write_json(
            HTTPStatus.OK,
            {
                "status": "success",
                "module": "Greens ACC Asset Engine",
                "source": source,
                "surveys": format_green_bananas_surveys(records),
            },
        )

    def handle_green_bananas_survey_submit(self) -> None:
        body = self._read_json_body()
        if body is None:
            return

        user_id = body.get("user_id")
        content = body.get("content")
        if not isinstance(user_id, str) or not user_id.strip():
            self._write_json(HTTPStatus.BAD_REQUEST, {"detail": "user_id must be a non-empty string."})
            return
        if not isinstance(content, dict):
            self._write_json(HTTPStatus.BAD_REQUEST, {"detail": "content must be an object."})
            return

        record = {
            "user_id": user_id.strip(),
            "content": content,
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }

        storage_mode = "memory"
        if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
            try:
                inserted = supabase_insert("gb_surveys", record)
                if inserted:
                    record = inserted[0]
                storage_mode = "supabase"
            except error.HTTPError as exc:
                details = exc.read().decode("utf-8", errors="replace")
                self._write_json(
                    HTTPStatus.BAD_GATEWAY,
                    {
                        "status": "error",
                        "detail": "Failed to persist survey data to Supabase.",
                        "source": "supabase",
                        "upstream": details,
                    },
                )
                return
            except Exception as exc:  # noqa: BLE001
                self._write_json(
                    HTTPStatus.BAD_GATEWAY,
                    {
                        "status": "error",
                        "detail": "Unexpected survey persistence failure.",
                        "source": "supabase",
                        "upstream": str(exc),
                    },
                )
                return
        else:
            IN_MEMORY_GB_SURVEYS.insert(0, record)

        self._write_json(
            HTTPStatus.OK,
            {
                "message": "Data successfully piped into Greens ACC platform storage",
                "status": "verified",
                "source": storage_mode,
                "survey": {
                    "user_id": record["user_id"],
                    "timestamp": str(record.get("created_at", ""))[:10],
                },
            },
        )

    def handle_payments_webhook(self) -> None:
        length = int(self.headers.get("Content-Length", "0") or "0")
        payload = self.rfile.read(length) if length else b""
        if not payload:
            self._write_json(HTTPStatus.BAD_REQUEST, {"error": "Empty webhook payload"})
            return

        payload_text = payload.decode("utf-8", errors="replace")
        signature_header = self.headers.get("stripe-signature", "")
        if STRIPE_WEBHOOK_SECRET and not verify_stripe_signature(payload_text, signature_header, STRIPE_WEBHOOK_SECRET):
            self._write_json(HTTPStatus.BAD_REQUEST, {"error": "Invalid Stripe signature"})
            return

        try:
            event: dict[str, Any] = json.loads(payload_text)
        except (json.JSONDecodeError, ValueError):
            self._write_json(HTTPStatus.BAD_REQUEST, {"error": "Invalid JSON payload"})
            return

        session = event.get("data", {}).get("object", {})
        metadata = session.get("metadata", {}) if isinstance(session, dict) else {}
        business_branch = str(metadata.get("branch", "greens_acc"))
        user_email = session.get("customer_details", {}).get("email") if isinstance(session, dict) else None

        if event.get("type") == "checkout.session.completed":
            if business_branch == "green_bananas":
                print(f"[Greens ACC] Processing legacy product delivery for: {user_email or 'unknown user'}")
            else:
                print(f"[Greens ACC] Processing main B2B platform logistics fulfillment for: {user_email or 'unknown user'}")

        if not SUPABASE_FUNCTIONS_BASE_URL:
            self._write_json(
                HTTPStatus.OK,
                {
                    "status": "success",
                    "mode": "local",
                    "branch": business_branch,
                },
            )
            return

        upstream = request.Request(
            f"{SUPABASE_FUNCTIONS_BASE_URL.rstrip('/')}/supabase/functions/stripeWebhook",
            data=payload,
            headers={
                "Content-Type": self.headers.get("Content-Type", "application/json"),
                "Accept": "application/json",
                "stripe-signature": signature_header,
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
                    "error": "Stripe webhook proxy failed",
                    "backend": "python",
                    "details": str(exc),
                },
            )

    def end_headers(self) -> None:
        self._send_cors_headers()
        super().end_headers()

    def _send_cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, stripe-signature")
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
        if not SUPABASE_FUNCTIONS_BASE_URL:
            self._write_json(
                HTTPStatus.BAD_GATEWAY,
                {
                    "error": "SUPABASE_FUNCTIONS_BASE_URL is not configured",
                    "backend": "python",
                },
            )
            return

        target = f"{SUPABASE_FUNCTIONS_BASE_URL.rstrip('/')}{parsed.path}"
        if parsed.query:
            target = f"{target}?{parsed.query}"

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
