#!/usr/bin/env python3
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import firebase_admin
from firebase_admin import credentials, get_app, initialize_app, storage

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SERVICE_ACCOUNT_PATH = REPO_ROOT / "secrets" / "recordmanagements-service-account.json"


def resolve_service_account_path(service_account_path: str | Path | None = None) -> Path:
    raw_path = (
        service_account_path
        or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        or DEFAULT_SERVICE_ACCOUNT_PATH
    )
    if not raw_path:
        raise RuntimeError(
            "Service account JSON path is required. "
            "Set GOOGLE_APPLICATION_CREDENTIALS, pass --service-account, "
            f"or place the file at {DEFAULT_SERVICE_ACCOUNT_PATH}."
        )

    resolved_path = Path(raw_path).expanduser().resolve()
    if not resolved_path.is_file():
        raise FileNotFoundError(f"Service account JSON not found: {resolved_path}")

    return resolved_path


def load_service_account_info(service_account_path: Path) -> dict[str, Any]:
    with service_account_path.open("r", encoding="utf-8") as file:
        service_account_info = json.load(file)

    if not service_account_info.get("project_id"):
        raise RuntimeError("Service account JSON must include project_id.")

    return service_account_info


def initialize_firebase_storage(
    service_account_path: str | Path | None = None,
    storage_bucket_name: str | None = None,
    app_name: str = "saoif-image-analysis",
) -> tuple[firebase_admin.App, Any, Path]:
    resolved_path = resolve_service_account_path(service_account_path)
    service_account_info = load_service_account_info(resolved_path)
    resolved_bucket_name = (
        storage_bucket_name
        or os.environ.get("FIREBASE_STORAGE_BUCKET")
        or f'{service_account_info["project_id"]}.appspot.com'
    )

    try:
        firebase_app = get_app(app_name)
    except ValueError:
        firebase_app = initialize_app(
            credentials.Certificate(service_account_info),
            {"storageBucket": resolved_bucket_name},
            name=app_name,
        )

    storage_bucket = storage.bucket(app=firebase_app)
    return firebase_app, storage_bucket, resolved_path
