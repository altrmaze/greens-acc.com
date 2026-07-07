import json
import subprocess
import sys
from typing import Any


def run_command(command: list[str]) -> bool:
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error executing: {' '.join(command)}\n{result.stderr.strip()}")
        return False
    if result.stdout.strip():
        print(result.stdout.strip())
    return True


def parse_payload(raw_payload: str) -> dict[str, Any]:
    try:
        parsed = json.loads(raw_payload)
        if isinstance(parsed, dict):
            return parsed
    except Exception:  # noqa: BLE001
        pass
    return {}


def execute_autonomous_workflow(proposal_data: dict[str, Any]) -> int:
    print("🤖 Agent analyzing proposal data...")
    print("🚀 Triggering GitHub Actions workflow autonomously...")

    workflow_name = str(proposal_data.get("workflow", "deploy.yml"))
    command = ["gh", "workflow", "run", workflow_name]

    ref = proposal_data.get("ref")
    if isinstance(ref, str) and ref.strip():
        command.extend(["--ref", ref.strip()])

    repo = proposal_data.get("repo")
    if isinstance(repo, str) and repo.strip():
        command.extend(["--repo", repo.strip()])

    if run_command(command):
        print("✅ Workflow triggered successfully. Zero manual intervention required.")
        return 0

    print("❌ Autonomy failure: Check GitHub CLI installation and authentication status.")
    return 1


if __name__ == "__main__":
    payload = parse_payload(sys.argv[1]) if len(sys.argv) > 1 else {}
    raise SystemExit(execute_autonomous_workflow(payload))
