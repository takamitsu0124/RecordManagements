#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import mimetypes
import uuid
from pathlib import Path
from typing import Any
from urllib.parse import quote

try:
    from .firebase_setup import initialize_firebase_storage
except ImportError:
    from firebase_setup import initialize_firebase_storage

IMAGE_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".gif",
    ".svg",
    ".avif",
    ".bmp",
}
DEFAULT_DESTINATION_PREFIX = "saoif_image_analysis"
DEFAULT_CACHE_CONTROL = "public,max-age=31536000,immutable"


def iter_image_files(folder_path: str | Path, recursive: bool = True) -> list[Path]:
    resolved_folder_path = Path(folder_path).expanduser().resolve()
    if not resolved_folder_path.is_dir():
        raise NotADirectoryError(f"Image folder not found: {resolved_folder_path}")

    pattern = "**/*" if recursive else "*"
    image_files = sorted(
        file_path
        for file_path in resolved_folder_path.glob(pattern)
        if file_path.is_file() and file_path.suffix.lower() in IMAGE_EXTENSIONS
    )
    return image_files


def create_storage_object_path(
    file_path: Path,
    folder_root: Path,
    destination_prefix: str = DEFAULT_DESTINATION_PREFIX,
) -> str:
    relative_path = file_path.relative_to(folder_root).as_posix()
    normalized_prefix = destination_prefix.strip("/ ")
    if not normalized_prefix:
        return relative_path

    return f"{normalized_prefix}/{relative_path}"


def create_download_url(bucket_name: str, object_path: str, download_token: str) -> str:
    return (
        f"https://firebasestorage.googleapis.com/v0/b/{bucket_name}/o/"
        f"{quote(object_path, safe='')}?alt=media&token={download_token}"
    )


def read_existing_download_token(blob: Any) -> str:
    metadata = blob.metadata or {}
    raw_tokens = str(metadata.get("firebaseStorageDownloadTokens", "")).strip()
    if not raw_tokens:
        return ""

    return raw_tokens.split(",")[0].strip()


def upload_single_image(
    bucket: Any,
    file_path: Path,
    folder_root: Path,
    destination_prefix: str = DEFAULT_DESTINATION_PREFIX,
    dry_run: bool = False,
) -> dict[str, str | None]:
    object_path = create_storage_object_path(file_path, folder_root, destination_prefix)
    blob = bucket.blob(object_path)
    content_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
    existing_blob = bucket.get_blob(object_path)
    download_token = (
        read_existing_download_token(existing_blob) if existing_blob is not None else ""
    ) or str(uuid.uuid4())
    existing_metadata = dict(existing_blob.metadata or {}) if existing_blob else {}

    if dry_run:
        return {
            "file_name": file_path.name,
            "relative_path": file_path.relative_to(folder_root).as_posix(),
            "storage_path": object_path,
            "download_url": create_download_url(bucket.name, object_path, download_token),
            "status": "dry-run",
            "error": None,
        }

    blob.upload_from_filename(file_path, content_type=content_type)
    blob.cache_control = DEFAULT_CACHE_CONTROL
    blob.metadata = {
        **existing_metadata,
        "firebaseStorageDownloadTokens": download_token,
    }
    blob.patch()

    return {
        "file_name": file_path.name,
        "relative_path": file_path.relative_to(folder_root).as_posix(),
        "storage_path": object_path,
        "download_url": create_download_url(bucket.name, object_path, download_token),
        "status": "uploaded",
        "error": None,
    }


def upload_images_in_folder(
    folder_path: str | Path,
    destination_prefix: str = DEFAULT_DESTINATION_PREFIX,
    recursive: bool = True,
    service_account_path: str | Path | None = None,
    storage_bucket_name: str | None = None,
    dry_run: bool = False,
) -> list[dict[str, str | None]]:
    folder_root = Path(folder_path).expanduser().resolve()
    image_files = iter_image_files(folder_root, recursive=recursive)
    _, bucket, _ = initialize_firebase_storage(
        service_account_path=service_account_path,
        storage_bucket_name=storage_bucket_name,
        app_name="saoif-image-analysis-uploader",
    )

    results: list[dict[str, str | None]] = []

    for file_path in image_files:
        try:
            results.append(
                upload_single_image(
                    bucket=bucket,
                    file_path=file_path,
                    folder_root=folder_root,
                    destination_prefix=destination_prefix,
                    dry_run=dry_run,
                )
            )
        except Exception as error:
            results.append(
                {
                    "file_name": file_path.name,
                    "relative_path": file_path.relative_to(folder_root).as_posix(),
                    "storage_path": create_storage_object_path(
                        file_path, folder_root, destination_prefix
                    ),
                    "download_url": None,
                    "status": "error",
                    "error": str(error),
                }
            )

    return results


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Upload image files in a folder to Firebase Storage."
    )
    parser.add_argument("--folder", required=True, help="Folder containing images to upload.")
    parser.add_argument(
        "--destination-prefix",
        default=DEFAULT_DESTINATION_PREFIX,
        help="Storage object prefix for uploaded images.",
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
        "--non-recursive",
        action="store_true",
        help="Only upload files directly under the specified folder.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Resolve upload targets without writing files to Storage.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    results = upload_images_in_folder(
        folder_path=args.folder,
        destination_prefix=args.destination_prefix,
        recursive=not args.non_recursive,
        service_account_path=args.service_account,
        storage_bucket_name=args.storage_bucket,
        dry_run=args.dry_run,
    )

    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
