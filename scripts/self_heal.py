import os
import sys
from supabase import Client, create_client


def main() -> None:
    print("AI Self-Healing agent triggered.")

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")

    if not url or not key:
        print("Error: Supabase environment variables are missing.")
        sys.exit(1)

    try:
        supabase: Client = create_client(url, key)

        telemetry_data = {
            "event": "workflow_failure",
            "status_file_created": os.path.exists(".status"),
            "repository": os.environ.get("GITHUB_REPOSITORY"),
            "commit_sha": os.environ.get("GITHUB_SHA"),
        }

        print(f"Sending telemetry to Supabase: {telemetry_data}")
        supabase.table("pipeline_telemetry").insert(telemetry_data).execute()
        print("Telemetry successfully sent.")

    except Exception as e:
        print(f"Failed to execute self-healing sequence: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
