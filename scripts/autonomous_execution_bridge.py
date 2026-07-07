import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

try:
    from openai import OpenAI
except Exception:  # noqa: BLE001
    OpenAI = None


ALLOWED_COMMAND_PREFIXES = (
    "npm test",
    "npm run build",
    "python3 -m py_compile",
)


class AutonomousExecutionBridge:
    def __init__(self) -> None:
        self.agent_api_key = os.getenv("CORE_AGENT_API_KEY", "")
        self.workspace_path = Path(os.getenv("PROJECT_WORKSPACE_PATH", ".")).resolve()
        self.model = os.getenv("CORE_AGENT_MODEL", "gpt-4-turbo")

    def query_core_agent_decision(self, proposed_task: str, context_data: dict[str, Any]) -> dict[str, Any]:
        prompt = f"""
[AUTONOMOUS DIRECTIVE]
Analyze the following task and project context. You must make a definitive executive decision.
Do not generate a proposal or ask for confirmation. Provide the exact execution payload.

Task: {proposed_task}
Context: {json.dumps(context_data)}

Return a strict JSON response containing:
{{
  "decision": "EXECUTE" or "ABORT",
  "execution_steps": ["list", "of", "shell", "commands"],
  "target_files": {{"filename": "exact code content to write"}}
}}
"""
        if OpenAI is None:
            return {"decision": "ABORT", "error": "openai package is not available."}
        if not self.agent_api_key:
            return {"decision": "ABORT", "error": "CORE_AGENT_API_KEY is missing."}

        try:
            client = OpenAI(api_key=self.agent_api_key)
            response = client.responses.create(
                model=self.model,
                input=[{"role": "user", "content": prompt}],
                text={"format": {"type": "json_object"}},
            )
            output_text = response.output_text
            return json.loads(output_text)
        except Exception as exc:  # noqa: BLE001
            return {"decision": "ABORT", "error": f"Agent communication failure: {exc}"}

    def run_self_healing_validation(self) -> bool:
        print("🔄 Running autonomous self-healing validation checks...")
        test_result = subprocess.run(
            ["npm", "test"],
            cwd=self.workspace_path,
            capture_output=True,
            text=True,
        )
        if test_result.returncode != 0:
            print(f"❌ Test validation failed: {test_result.stderr or test_result.stdout}")
            return False
        print("✅ All self-healing validation gates passed cleanly.")
        return True

    def _resolve_target_path(self, relative_path: str) -> Path:
        target = (self.workspace_path / relative_path).resolve()
        if self.workspace_path not in target.parents and target != self.workspace_path:
            raise ValueError(f"Path escapes workspace: {relative_path}")
        return target

    def _validate_command(self, command: str) -> None:
        normalized = command.strip()
        if not normalized.startswith(ALLOWED_COMMAND_PREFIXES):
            raise ValueError(f"Command not allowed by policy: {command}")

    def execute_autonomously(self, proposed_task: str, data_payload: dict[str, Any]) -> int:
        print(f"🚀 Processing task autonomously: {proposed_task}")
        decision_packet = self.query_core_agent_decision(proposed_task, data_payload)

        if decision_packet.get("decision") != "EXECUTE":
            print(f"🛑 Decision Engine aborted execution: {decision_packet.get('error', 'Criteria not met.')}")
            return 1

        files_to_modify = decision_packet.get("target_files", {})
        if not isinstance(files_to_modify, dict):
            print("🛑 Invalid target_files payload.")
            return 1

        for filepath, content in files_to_modify.items():
            try:
                full_path = self._resolve_target_path(str(filepath))
                full_path.parent.mkdir(parents=True, exist_ok=True)
                full_path.write_text(str(content), encoding="utf-8")
                print(f"💾 Applied code updates to: {filepath}")
            except Exception as exc:  # noqa: BLE001
                print(f"🛑 Failed applying file update: {filepath} ({exc})")
                return 1

        for command in decision_packet.get("execution_steps", []):
            if not isinstance(command, str):
                print("🛑 Invalid execution step format.")
                return 1
            try:
                self._validate_command(command)
                print(f"⚙️ Running command: {command}")
                subprocess.run(command, shell=True, cwd=self.workspace_path, check=True)
            except Exception as exc:  # noqa: BLE001
                print(f"🛑 Execution step failed: {exc}")
                subprocess.run(["git", "checkout", "."], cwd=self.workspace_path, check=False)
                return 1

        if not self.run_self_healing_validation():
            print("🚨 Self-healing triggered: Rolling back unsafe changes to protect environment data.")
            subprocess.run(["git", "checkout", "."], cwd=self.workspace_path, check=False)
            return 1

        print("🎉 Execution finalized successfully with zero manual steps.")
        return 0


if __name__ == "__main__":
    bridge = AutonomousExecutionBridge()
    code = bridge.execute_autonomously(
        proposed_task="Integrate real-time transaction ledger sync with database verification schemas",
        data_payload={"environment": "production-agent-mesh", "risk_enforcement": "active"},
    )
    sys.exit(code)
