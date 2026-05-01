#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT_DIR = Path(__file__).resolve().parent
VENV_DIR = REPO_ROOT / ".venv"
VENV_PYTHON = VENV_DIR / "bin" / "python3"
REQUIREMENTS_PATH = SCRIPT_DIR / "requirements.txt"
STATE_PATH = VENV_DIR / ".saoif_image_analysis_env.json"
HEALTH_CHECK_CODE = """
import importlib
importlib.import_module("pip")
importlib.import_module("firebase_admin")
importlib.import_module("google.generativeai")
importlib.import_module("pandas")
from PIL import Image
assert Image is not None
"""


def log(message: str) -> None:
    print(f"[saoif-env] {message}", file=sys.stderr)


def resolve_base_python() -> Path:
    return Path(getattr(sys, "_base_executable", sys.executable)).expanduser().resolve()


def compute_requirements_hash() -> str:
    return hashlib.sha256(REQUIREMENTS_PATH.read_bytes()).hexdigest()


def build_desired_state() -> dict[str, str]:
    base_python = resolve_base_python()
    return {
        "basePython": str(base_python),
        "basePythonVersion": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        "requirementsSha256": compute_requirements_hash(),
    }


def load_saved_state() -> dict[str, Any] | None:
    if not STATE_PATH.is_file():
        return None

    try:
        return json.loads(STATE_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None


def save_state(state: dict[str, str]) -> None:
    VENV_DIR.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(
        json.dumps(state, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def run_command(
    command: list[str],
    *,
    quiet: bool = False,
) -> subprocess.CompletedProcess[str]:
    stdout = subprocess.DEVNULL if quiet else None
    stderr = subprocess.DEVNULL if quiet else None
    return subprocess.run(
        command,
        cwd=REPO_ROOT,
        check=True,
        stdout=stdout,
        stderr=stderr,
        text=True,
    )


def is_venv_healthy() -> bool:
    if not VENV_PYTHON.is_file():
        return False

    try:
        run_command([str(VENV_PYTHON), "-c", HEALTH_CHECK_CODE], quiet=True)
    except (OSError, subprocess.CalledProcessError):
        return False
    return True


def remove_venv() -> None:
    if VENV_DIR.exists():
        shutil.rmtree(VENV_DIR)


def create_venv() -> None:
    base_python = resolve_base_python()
    run_command([str(base_python), "-m", "venv", str(VENV_DIR)])


def install_requirements(*, upgrade_pip: bool) -> None:
    if upgrade_pip:
        run_command([str(VENV_PYTHON), "-m", "pip", "install", "--upgrade", "pip"])

    run_command(
        [
            str(VENV_PYTHON),
            "-m",
            "pip",
            "install",
            "-r",
            str(REQUIREMENTS_PATH),
        ]
    )


def recreate_venv(reason: str, desired_state: dict[str, str]) -> None:
    log(f"Recreating .venv ({reason}).")
    remove_venv()
    create_venv()
    install_requirements(upgrade_pip=True)
    if not is_venv_healthy():
        raise RuntimeError("The recreated virtual environment is still unhealthy.")
    save_state(desired_state)


def ensure_environment(*, force_recreate: bool = False) -> Path:
    desired_state = build_desired_state()
    saved_state = load_saved_state()

    if force_recreate:
        recreate_venv("forced", desired_state)
        return VENV_PYTHON

    if not VENV_PYTHON.is_file():
        recreate_venv("missing interpreter", desired_state)
        return VENV_PYTHON

    if not is_venv_healthy():
        recreate_venv("health check failed", desired_state)
        return VENV_PYTHON

    if saved_state == desired_state:
        return VENV_PYTHON

    log("Synchronizing .venv with current requirements.")
    try:
        install_requirements(upgrade_pip=False)
    except (OSError, subprocess.CalledProcessError):
        recreate_venv("dependency sync failed", desired_state)
        return VENV_PYTHON

    if not is_venv_healthy():
        recreate_venv("post-sync health check failed", desired_state)
        return VENV_PYTHON

    save_state(desired_state)
    return VENV_PYTHON


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Ensure the SAOIF image analysis virtual environment exists and can run "
            "the required scripts."
        )
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    ensure_parser = subparsers.add_parser(
        "ensure",
        help="Create or repair .venv and install dependencies when needed.",
    )
    ensure_parser.add_argument(
        "--force-recreate",
        action="store_true",
        help="Delete and recreate .venv even if the health check passes.",
    )

    run_parser = subparsers.add_parser(
        "run",
        help="Ensure .venv and then execute a Python script inside it.",
    )
    run_parser.add_argument(
        "script",
        help="Python script path to execute from the repository root.",
    )
    run_parser.add_argument(
        "script_args",
        nargs=argparse.REMAINDER,
        help="Arguments forwarded to the target script.",
    )
    run_parser.add_argument(
        "--force-recreate",
        action="store_true",
        help="Delete and recreate .venv before executing the target script.",
    )

    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if args.command == "ensure":
        ensure_environment(force_recreate=args.force_recreate)
        return

    venv_python = ensure_environment(force_recreate=args.force_recreate)
    script_path = Path(args.script)
    resolved_script_path = (
        script_path if script_path.is_absolute() else (REPO_ROOT / script_path)
    ).resolve()
    if not resolved_script_path.is_file():
        raise FileNotFoundError(f"Python script not found: {resolved_script_path}")

    command = [str(venv_python), str(resolved_script_path), *args.script_args]
    raise SystemExit(subprocess.run(command, cwd=REPO_ROOT).returncode)


if __name__ == "__main__":
    main()
