#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import firebase_admin
import google.generativeai as genai
try:
    from .firebase_setup import initialize_firebase_storage
except ImportError:
    from firebase_setup import initialize_firebase_storage


@dataclass(frozen=True)
class SAOIFImageAnalysisContext:
    firebase_app: firebase_admin.App
    storage_bucket: Any
    gemini_api_key: str
    service_account_path: Path


def configure_gemini(api_key: str | None = None) -> str:
    resolved_api_key = (
        api_key
        or os.environ.get("GEMINI_API_KEY")
        or os.environ.get("GOOGLE_API_KEY")
    )
    if not resolved_api_key:
        raise RuntimeError(
            "Gemini API key is required. Set GEMINI_API_KEY or GOOGLE_API_KEY."
        )

    genai.configure(api_key=resolved_api_key)
    return resolved_api_key


def build_context(
    service_account_path: str | Path | None = None,
    storage_bucket_name: str | None = None,
    gemini_api_key: str | None = None,
) -> SAOIFImageAnalysisContext:
    firebase_app, storage_bucket, resolved_path = initialize_firebase_storage(
        service_account_path=service_account_path,
        storage_bucket_name=storage_bucket_name,
    )
    resolved_api_key = configure_gemini(gemini_api_key)

    return SAOIFImageAnalysisContext(
        firebase_app=firebase_app,
        storage_bucket=storage_bucket,
        gemini_api_key=resolved_api_key,
        service_account_path=resolved_path,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Prepare the SAOIF image analysis environment for Firebase Storage "
            "and Gemini access."
        )
    )
    parser.add_argument(
        "--service-account",
        help="Path to the Firebase service account JSON file.",
    )
    parser.add_argument(
        "--storage-bucket",
        help="Override the Firebase Storage bucket name.",
    )
    parser.add_argument(
        "--gemini-api-key",
        help="Override the Gemini API key.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    context = build_context(
        service_account_path=args.service_account,
        storage_bucket_name=args.storage_bucket,
        gemini_api_key=args.gemini_api_key,
    )

    print(f"Installed packages: python3 -m pip install -r {Path(__file__).with_name('requirements.txt')}")
    print(f"Service account JSON loaded: {context.service_account_path}")
    print(f"Firebase Storage bucket ready: {context.storage_bucket.name}")
    print("Gemini API key configured.")


if __name__ == "__main__":
    main()
