from scripts.autonomous_environment import AutonomousEnvironment


if __name__ == "__main__":
    orchestrator = AutonomousEnvironment()
    orchestrator.run_forever()
