import json
import shutil
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


def run_preflight_checks(proposal_data: dict[str, Any]) -> bool:
    print("🧪 Running preflight checks before workflow trigger...")

    if shutil.which("gh") is None:
        print("❌ GitHub CLI (gh) is not installed or not in PATH.")
        return False

    if not run_command(["gh", "auth", "status"]):
        print("❌ GitHub CLI authentication check failed.")
        return False

    workflow_name = str(proposal_data.get("workflow", "deploy.yml"))
    view_command = ["gh", "workflow", "view", workflow_name]

    repo = proposal_data.get("repo")
    if isinstance(repo, str) and repo.strip():
        view_command.extend(["--repo", repo.strip()])

    if not run_command(view_command):
        print(f"❌ Workflow not accessible: {workflow_name}")
        return False

    print("✅ Preflight checks passed.")
    return True


def execute_autonomous_workflow(proposal_data: dict[str, Any]) -> int:
    print("🤖 Agent analyzing proposal data...")
    print("🚀 Triggering GitHub Actions workflow autonomously...")

    if not run_preflight_checks(proposal_data):
        return 1

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
