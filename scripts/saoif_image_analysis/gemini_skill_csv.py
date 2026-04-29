#!/usr/bin/env python3
from __future__ import annotations

import argparse
import colorsys
import csv
import json
import mimetypes
import re
import sys
import time
from io import BytesIO
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse
from urllib.request import Request, urlopen

import google.generativeai as genai
import pandas as pd
from PIL import Image, ImageOps

try:
    from .bootstrap import configure_gemini
    from .storage_uploader import iter_image_files
except ImportError:
    from bootstrap import configure_gemini
    from storage_uploader import iter_image_files

CSV_COLUMNS = [
    "id",
    "name",
    "rarity",
    "cost",
    "equipmentType",
    "sp",
    "element",
    "skillType",
    "attackType",
    "breakGauge",
    "switchGauge",
    "cooldown",
    "skillName",
    "image",
]
MEANINGFUL_COLUMNS = [
    "name",
    "rarity",
    "cost",
    "sp",
    "element",
    "attackType",
    "breakGauge",
    "switchGauge",
    "cooldown",
    "skillName",
]
DEFAULT_MODEL_NAME = "gemini-2.5-flash-lite"
DEFAULT_OUTPUT_PATH = "saoif_skills.csv"
DEFAULT_SLEEP_SECONDS = 2.0
GENERATE_CONTENT_METHOD = "generateContent"
SOURCE_KEYS = (
    "image",
    "imageUrl",
    "imageURL",
    "download_url",
    "downloadURL",
    "url",
    "path",
    "file",
)
TITLE_CROP_RATIOS = (0.00, 0.00, 1.00, 0.24)
RARITY_CROP_RATIOS = (0.62, 0.08, 0.88, 0.26)
RIGHT_TAB_CROP_RATIOS = (0.72, 0.18, 0.98, 0.42)
STATS_CROP_RATIOS = (0.52, 0.48, 0.98, 0.96)
ELEMENT_AREA_CROP_RATIOS = (0.91, 0.30, 0.98, 0.38)
ATTACK_TYPE_ICON_CROP_RATIOS = (0.72, 0.74, 0.82, 0.84)
SKILL_ICON_CROP_RATIOS = (0.78, 0.74, 0.98, 0.98)
MAX_FULL_IMAGE_SIDE = 1536
TITLE_CROP_MAX_SIDE = 1024
TITLE_CROP_MIN_SIDE = 768
DETAIL_CROP_MAX_SIDE = 768
DETAIL_CROP_MIN_SIDE = 512
ICON_CROP_MAX_SIDE = 512
ICON_CROP_MIN_SIDE = 384
DEFAULT_DEBUG_SUFFIX = ".debug.jsonl"
ELEMENT_ALIASES = {
    "火": "火",
    "fire": "火",
    "炎": "火",
    "red": "火",
    "水": "水",
    "water": "水",
    "blue": "水",
    "土": "土",
    "earth": "土",
    "brown": "土",
    "聖": "聖",
    "holy": "聖",
    "light": "聖",
    "yellow": "聖",
    "闇": "闇",
    "dark": "闇",
    "shadow": "闇",
    "purple": "闇",
    "風": "風",
    "wind": "風",
    "green": "風",
    "無": "無",
    "none": "無",
    "neutral": "無",
}
EQUIPMENT_TYPE_ALIASES = {
    "片手直剣": "片手直剣",
    "片手剣": "片手直剣",
    "直剣": "片手直剣",
    "sword": "片手直剣",
    "細剣": "細剣",
    "レイピア": "細剣",
    "rapier": "細剣",
    "棍棒": "棍棒",
    "棍": "棍棒",
    "club": "棍棒",
    "mace": "棍棒",
    "短剣": "短剣",
    "dagger": "短剣",
    "ナイフ": "短剣",
    "斧": "斧",
    "axe": "斧",
    "槍": "槍",
    "spear": "槍",
    "lance": "槍",
    "弓": "弓",
    "bow": "弓",
    "盾": "盾",
    "shield": "盾",
    "アビリティ": "アビリティ",
    "ability": "アビリティ",
    "バースト/フルバースト": "バースト/フルバースト",
    "burst/fullburst": "バースト/フルバースト",
    "burstfullburst": "バースト/フルバースト",
    "burstfull": "バースト/フルバースト",
    "フリー": "フリー",
    "free": "フリー",
}
SKILL_TYPE_ALIASES = {
    "": "通常",
    "normal": "通常",
    "ノーマル": "通常",
    "通常": "通常",
    "awaken": "覚醒",
    "覚醒": "覚醒",
    "recollection": "覚醒",
    "accele": "アクセル",
    "アクセル": "アクセル",
    "mod": "MOD",
    "connect": "コネクト",
    "コネクト": "コネクト",
    "chain": "チェイン",
    "チェイン": "チェイン",
    "burst": "バースト",
    "バースト": "バースト",
    "fullburst": "フルバースト",
    "full burst": "フルバースト",
    "フルバースト": "フルバースト",
}
ATTACK_TYPE_ALIASES = {
    "斬": "斬",
    "slash": "斬",
    "突": "突",
    "pierce": "突",
    "打": "打",
    "strike": "打",
}
ATTRIBUTE_SLUG_MAP = {
    "火": "fire",
    "水": "water",
    "土": "earth",
    "聖": "holy",
    "闇": "dark",
    "風": "wind",
    "無": "none",
}
BASE_TYPE_SLUG_MAP = {
    "片手直剣": "sword",
    "細剣": "rapier",
    "棍棒": "club",
    "短剣": "dagger",
    "斧": "axe",
    "槍": "spear",
    "弓": "bow",
    "盾": "shield",
    "アビリティ": "ability",
    "バースト/フルバースト": "burst-fullburst",
    "フリー": "free",
}
COMMON_MODEL_ALIASES = {
    "gemini-1.5-flash": [
        "gemini-1.5-flash-002",
        "gemini-1.5-flash-001",
    ],
    "gemini-1.5-pro": [
        "gemini-1.5-pro-002",
        "gemini-1.5-pro-001",
    ],
}

GEMINI_PROMPT = """
あなたは SAOIF (Sword Art Online Integral Factor) のスキルカード解析器です。
これから 1 枚のカード画像と、その重要領域を切り出した補助画像を複数枚渡します。

画像の順番:
1. カード全体
2. タイトル帯
3. レアリティ付近
4. 右側タブ領域
5. 下部ステータス領域
6. 属性アイコン枠
7. 攻撃属性アイコン枠
8. 右下アイコン領域

重要ルール:
- カード上の日本語を優先して読んでください
- 出力は JSON オブジェクト 1 個だけ
- 推測しきれない値は null
- `image` は null のまま返す
- `id` は画像だけで確定できない場合は null
- `cost`, `sp`, `breakGauge`, `switchGauge`, `cooldown` は数値か null

許容値:
- equipmentType: 片手直剣, 細剣, 棍棒, 短剣, 斧, 槍, 弓, 盾, アビリティ, バースト/フルバースト, フリー
- element: 火, 水, 土, 聖, 闇, 風, 無
- attackType: 斬, 突, 打
- skillType: 通常, コネクト, チェイン, MOD, 覚醒, アクセル, バースト, フルバースト

判定優先ルール:
1. 属性(element):
   - 消費SPの右側を確認。アイコン（火、水、風、土、聖、闇）がなければ「無」。
   - 背景が何色であっても、アイコン枠が空なら「無」と回答すること。
   - 背景イラストやエフェクトの色は属性判定に使わないこと。
2. 攻撃属性(attackType):
   - スキルアイコン内の図形を確認。
   - 斬撃の軌跡なら「斬」、矢印・刺突なら「突」、衝撃波・重みのあるマークなら「打」と回答すること。

スキルタイプ判定ヒント:
- 右側タブに "MOD Skill" があれば MOD
- 右側タブに "Connect Skill" があれば コネクト
- 右下アイコン色の目安:
  - 紫 = アクセル
  - 青 = チェイン
  - 赤 = バースト
  - 緑 = コネクト
- カードに full burst 相当の明示があれば フルバースト
- 上記に当てはまらなければ 通常

返却形式:
{
  "id": null,
  "name": null,
  "rarity": null,
  "cost": null,
  "equipmentType": null,
  "sp": null,
  "element": null,
  "skillType": null,
  "attackType": null,
  "breakGauge": null,
  "switchGauge": null,
  "cooldown": null,
  "skillName": null,
  "image": null
}
""".strip()


def normalize_whitespace(value: Any) -> str:
    return str(value or "").strip()


def normalize_lookup_key(value: Any) -> str:
    return re.sub(r"[\s_()/:.-]+", "", normalize_whitespace(value).lower())


def normalize_rarity(value: Any) -> str | None:
    normalized = normalize_whitespace(value).upper()
    return normalized or None


def normalize_enum(value: Any, aliases: dict[str, str]) -> str | None:
    normalized = normalize_whitespace(value)
    if not normalized:
        return None

    lookup_key = normalize_lookup_key(normalized)
    return aliases.get(lookup_key) or aliases.get(normalized) or None


def parse_integer(value: Any) -> int | None:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)

    matched = re.search(r"[-+]?\d+", normalize_whitespace(value).replace(",", ""))
    if not matched:
        return None
    return int(matched.group(0))


def sanitize_fragment(value: str) -> str:
    return re.sub(r"^-+|-+$", "", re.sub(r"[^a-z0-9._-]+", "-", value.lower()))


def normalize_model_name(value: Any) -> str:
    normalized = normalize_whitespace(value)
    if normalized.startswith("models/"):
        return normalized.split("/", 1)[1]
    return normalized


def normalize_model_method_name(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", "", normalize_whitespace(value).lower())


def model_supports_generate_content(supported_methods: list[str]) -> bool:
    target = normalize_model_method_name(GENERATE_CONTENT_METHOD)
    return any(
        normalize_model_method_name(method) == target for method in supported_methods or []
    )


def summarize_model(model: Any) -> dict[str, Any]:
    full_name = normalize_whitespace(getattr(model, "name", ""))
    short_name = normalize_model_name(full_name)
    base_model_id = normalize_model_name(getattr(model, "base_model_id", "") or "")
    display_name = normalize_whitespace(getattr(model, "display_name", "") or "")
    supported_methods = list(getattr(model, "supported_generation_methods", []) or [])
    return {
        "name": full_name,
        "shortName": short_name,
        "baseModelId": base_model_id,
        "displayName": display_name,
        "supportedGenerationMethods": supported_methods,
        "supportsGenerateContent": model_supports_generate_content(supported_methods),
    }


def list_available_models() -> list[dict[str, Any]]:
    return [summarize_model(model) for model in genai.list_models()]


def build_model_alias_candidates(requested_model_name: str) -> list[str]:
    normalized_name = normalize_model_name(requested_model_name)
    candidates = [normalized_name]
    candidates.extend(COMMON_MODEL_ALIASES.get(normalized_name, []))
    return list(dict.fromkeys(candidate for candidate in candidates if candidate))


def score_model_candidate(model: dict[str, Any], alias_candidates: list[str]) -> int | None:
    short_name = normalize_model_name(model.get("shortName"))
    full_name = normalize_whitespace(model.get("name"))
    base_model_id = normalize_model_name(model.get("baseModelId"))
    display_name = normalize_model_name(model.get("displayName"))

    for score, alias in enumerate(alias_candidates):
        if not alias:
            continue
        if short_name == alias:
            return score
        if full_name == alias or full_name == f"models/{alias}":
            return score
        if base_model_id == alias:
            return score
        if display_name == alias:
            return score + 20
        if short_name.startswith(f"{alias}-"):
            return score + 40
        if base_model_id.startswith(f"{alias}-"):
            return score + 50

    return None


def resolve_model_name(requested_model_name: str) -> dict[str, Any]:
    alias_candidates = build_model_alias_candidates(requested_model_name)

    try:
        available_models = list_available_models()
    except Exception as error:
        raise RuntimeError(
            "Failed to list available Gemini models before analysis. "
            f"Requested model: {requested_model_name}. {error}"
        ) from error

    supported_models = [
        model for model in available_models if model.get("supportsGenerateContent")
    ]
    scored_candidates = []
    for model in supported_models:
        score = score_model_candidate(model, alias_candidates)
        if score is None:
            continue
        scored_candidates.append((score, model))

    if not scored_candidates:
        supported_names = [model["shortName"] for model in supported_models]
        raise RuntimeError(
            "Requested Gemini model is unavailable or does not support generateContent. "
            f"Requested model: {requested_model_name}. "
            f"Supported models: {', '.join(supported_names[:20])}"
        )

    scored_candidates.sort(key=lambda item: (item[0], item[1]["shortName"]))
    resolved_model = scored_candidates[0][1]
    return {
        "requestedModel": requested_model_name,
        "requestedAliases": alias_candidates,
        "resolvedModel": resolved_model["shortName"],
        "resolvedModelFullName": resolved_model["name"] or f"models/{resolved_model['shortName']}",
        "supportedGenerationMethods": resolved_model["supportedGenerationMethods"],
        "availableSupportedModels": [model["shortName"] for model in supported_models],
        "matchedCandidates": [candidate["shortName"] for _, candidate in scored_candidates[:10]],
    }


def decode_firebase_object_path(source: str) -> str:
    parsed = urlparse(source)
    marker = "/o/"
    if marker not in parsed.path:
        return ""
    return unquote(parsed.path.split(marker, 1)[1])


def extract_source_stem(source: str) -> str:
    if source.startswith(("http://", "https://")):
        firebase_object_path = decode_firebase_object_path(source)
        if firebase_object_path:
            object_path = Path(firebase_object_path)
            if object_path.stem == "source" and object_path.parent.name:
                return sanitize_fragment(object_path.parent.name) or "image"
            return sanitize_fragment(object_path.stem) or "image"

        parsed = urlparse(source)
        stem = Path(unquote(parsed.path)).stem
        return sanitize_fragment(stem) or "image"

    return sanitize_fragment(Path(source).stem) or "image"


def iter_source_path_parts(source: str) -> list[str]:
    if source.startswith(("http://", "https://")):
        firebase_object_path = decode_firebase_object_path(source)
        if firebase_object_path:
            return list(Path(firebase_object_path).parts)
        return list(Path(unquote(urlparse(source).path)).parts)
    return list(Path(source).parts)


def infer_equipment_type_from_source(source: str) -> str | None:
    normalized_aliases = sorted(
        (
            (normalize_lookup_key(alias), canonical)
            for alias, canonical in EQUIPMENT_TYPE_ALIASES.items()
        ),
        key=lambda item: len(item[0]),
        reverse=True,
    )

    for part in reversed(iter_source_path_parts(source)[:-1]):
        normalized_part = normalize_lookup_key(part)
        for alias, canonical in normalized_aliases:
            if (
                normalized_part == alias
                or normalized_part.startswith(alias)
                or normalized_part.endswith(alias)
                or alias in normalized_part
            ):
                return canonical
    return None


def build_draft_id(element: str | None, equipment_type: str | None, source: str) -> str:
    attr_slug = ATTRIBUTE_SLUG_MAP.get(element or "", "unknown")
    type_slug = BASE_TYPE_SLUG_MAP.get(
        equipment_type or infer_equipment_type_from_source(source) or "",
        "unknown",
    )
    return f"skill-{attr_slug}-{type_slug}-{extract_source_stem(source)}"


def create_empty_record(
    source: str,
    source_hints: dict[str, Any] | None = None,
) -> dict[str, Any]:
    source_hints = source_hints or {}
    equipment_type = source_hints.get("equipmentType") or infer_equipment_type_from_source(
        source
    )
    skill_type = source_hints.get("skillType")

    return {
        "id": build_draft_id(None, equipment_type, source),
        "name": None,
        "rarity": None,
        "cost": None,
        "equipmentType": equipment_type,
        "sp": None,
        "element": None,
        "skillType": skill_type,
        "attackType": None,
        "breakGauge": None,
        "switchGauge": None,
        "cooldown": None,
        "skillName": None,
        "image": source,
    }


def normalize_record(
    raw_record: dict[str, Any],
    source: str,
    source_hints: dict[str, Any] | None = None,
) -> dict[str, Any]:
    source_hints = source_hints or {}
    normalized_record = create_empty_record(source, source_hints=source_hints)
    element = normalize_enum(raw_record.get("element"), ELEMENT_ALIASES)
    equipment_type = normalize_enum(
        raw_record.get("equipmentType"), EQUIPMENT_TYPE_ALIASES
    ) or source_hints.get("equipmentType") or infer_equipment_type_from_source(source)
    skill_type = normalize_enum(raw_record.get("skillType"), SKILL_TYPE_ALIASES) or source_hints.get(
        "skillType"
    )

    normalized_record.update(
        {
            "id": normalize_whitespace(raw_record.get("id"))
            or build_draft_id(element, equipment_type, source),
            "name": normalize_whitespace(raw_record.get("name")) or None,
            "rarity": normalize_rarity(raw_record.get("rarity")),
            "cost": parse_integer(raw_record.get("cost")),
            "equipmentType": equipment_type,
            "sp": parse_integer(raw_record.get("sp")),
            "element": element,
            "skillType": skill_type,
            "attackType": normalize_enum(
                raw_record.get("attackType"), ATTACK_TYPE_ALIASES
            ),
            "breakGauge": parse_integer(raw_record.get("breakGauge")),
            "switchGauge": parse_integer(raw_record.get("switchGauge")),
            "cooldown": parse_integer(raw_record.get("cooldown")),
            "skillName": normalize_whitespace(raw_record.get("skillName")) or None,
            "image": source,
        }
    )
    return normalized_record


def extract_json_object(text: str) -> dict[str, Any]:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = re.sub(r"^```(?:json)?\s*", "", stripped)
        stripped = re.sub(r"\s*```$", "", stripped)

    try:
        parsed = json.loads(stripped)
    except json.JSONDecodeError:
        matched = re.search(r"\{.*\}", stripped, re.DOTALL)
        if not matched:
            raise
        parsed = json.loads(matched.group(0))

    if isinstance(parsed, list):
        if not parsed or not isinstance(parsed[0], dict):
            raise ValueError("Gemini response did not contain an object.")
        return parsed[0]
    if not isinstance(parsed, dict):
        raise ValueError("Gemini response did not contain a JSON object.")
    return parsed


def get_response_text(response: Any) -> str:
    try:
        return response.text
    except Exception:
        candidates = getattr(response, "candidates", []) or []
        for candidate in candidates:
            content = getattr(candidate, "content", None)
            parts = getattr(content, "parts", None) or []
            for part in parts:
                text = getattr(part, "text", None)
                if text:
                    return text

        prompt_feedback = getattr(response, "prompt_feedback", None)
        if prompt_feedback:
            raise RuntimeError(f"Gemini response did not contain text: {prompt_feedback}")

        raise RuntimeError("Gemini response did not contain text.")


def load_remote_image(source: str) -> tuple[bytes, str]:
    request = Request(source, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(request, timeout=60) as response:
        image_bytes = response.read()
        content_type = response.headers.get_content_type()
    if not content_type or content_type == "application/octet-stream":
        content_type = mimetypes.guess_type(source)[0] or "image/png"
    return image_bytes, content_type


def load_local_image(source: str | Path) -> tuple[bytes, str]:
    file_path = Path(source).expanduser().resolve()
    image_bytes = file_path.read_bytes()
    content_type = mimetypes.guess_type(file_path.name)[0] or "image/png"
    return image_bytes, content_type


def load_image_bytes(source: str | Path) -> tuple[bytes, str, str]:
    source_text = normalize_whitespace(source)
    if source_text.startswith(("http://", "https://")):
        image_bytes, content_type = load_remote_image(source_text)
        return image_bytes, content_type, source_text

    resolved_path = str(Path(source_text).expanduser().resolve())
    image_bytes, content_type = load_local_image(resolved_path)
    return image_bytes, content_type, resolved_path


def load_sources_from_json(file_path: Path) -> list[str]:
    parsed = json.loads(file_path.read_text(encoding="utf-8"))
    if isinstance(parsed, dict):
        for key in ("images", "items", "results"):
            value = parsed.get(key)
            if isinstance(value, list):
                parsed = value
                break

    if not isinstance(parsed, list):
        raise ValueError("JSON input must be an array or an object containing an array.")

    results: list[str] = []
    for item in parsed:
        if isinstance(item, str):
            normalized = normalize_whitespace(item)
            if normalized:
                results.append(normalized)
            continue
        if isinstance(item, dict):
            for key in SOURCE_KEYS:
                normalized = normalize_whitespace(item.get(key))
                if normalized:
                    results.append(normalized)
                    break
    return results


def load_sources_from_csv(file_path: Path) -> list[str]:
    results: list[str] = []
    with file_path.open("r", encoding="utf-8", newline="") as file:
        reader = csv.DictReader(file)
        for row in reader:
            for key in SOURCE_KEYS:
                normalized = normalize_whitespace(row.get(key))
                if normalized:
                    results.append(normalized)
                    break
    return results


def load_sources_from_text(file_path: Path) -> list[str]:
    results: list[str] = []
    for line in file_path.read_text(encoding="utf-8").splitlines():
        normalized = normalize_whitespace(line)
        if normalized and not normalized.startswith("#"):
            results.append(normalized)
    return results


def load_image_sources(
    folder_path: str | None = None,
    input_file: str | None = None,
    recursive: bool = True,
    limit: int = 0,
) -> list[str]:
    sources: list[str] = []

    if folder_path:
        sources.extend(str(path) for path in iter_image_files(folder_path, recursive))

    if input_file:
        resolved_input_path = Path(input_file).expanduser().resolve()
        suffix = resolved_input_path.suffix.lower()
        if suffix == ".json":
            sources.extend(load_sources_from_json(resolved_input_path))
        elif suffix == ".csv":
            sources.extend(load_sources_from_csv(resolved_input_path))
        else:
            sources.extend(load_sources_from_text(resolved_input_path))

    deduped_sources = list(dict.fromkeys(source for source in sources if source))
    if limit > 0:
        return deduped_sources[:limit]
    return deduped_sources


def load_pil_image(image_bytes: bytes) -> Image.Image:
    image = Image.open(BytesIO(image_bytes))
    image.load()
    if image.mode in ("RGBA", "LA"):
        background = Image.new("RGBA", image.size, (255, 255, 255, 255))
        image = Image.alpha_composite(background, image.convert("RGBA")).convert("RGB")
    else:
        image = image.convert("RGB")
    return ImageOps.exif_transpose(image)


def resize_image(image: Image.Image, *, max_side: int, min_side: int = 0) -> Image.Image:
    width, height = image.size
    current_max = max(width, height)
    if current_max == 0:
        return image

    scale = 1.0
    if max_side and current_max > max_side:
        scale = min(scale, max_side / current_max)
    if min_side and current_max < min_side:
        scale = max(scale, min_side / current_max)

    if abs(scale - 1.0) < 0.01:
        return image

    resized_width = max(1, int(width * scale))
    resized_height = max(1, int(height * scale))
    return image.resize((resized_width, resized_height), Image.Resampling.LANCZOS)


def crop_by_ratios(image: Image.Image, ratios: tuple[float, float, float, float]) -> Image.Image:
    width, height = image.size
    left = max(0, min(width, int(width * ratios[0])))
    top = max(0, min(height, int(height * ratios[1])))
    right = max(0, min(width, int(width * ratios[2])))
    bottom = max(0, min(height, int(height * ratios[3])))
    if right <= left or bottom <= top:
        return image
    return image.crop((left, top, right, bottom))


def image_to_png_bytes(image: Image.Image) -> bytes:
    buffer = BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    return buffer.getvalue()


def build_prompt_image_part(
    label: str,
    image: Image.Image,
    *,
    ratios: tuple[float, float, float, float] | None = None,
    max_side: int,
    min_side: int = 0,
    autocontrast: bool = True,
) -> tuple[str, bytes]:
    prepared_image = crop_by_ratios(image, ratios) if ratios is not None else image
    if autocontrast:
        prepared_image = ImageOps.autocontrast(prepared_image)
    prepared_image = resize_image(
        prepared_image,
        max_side=max_side,
        min_side=min_side,
    )
    return label, image_to_png_bytes(prepared_image)


def build_prompt_images(image_bytes: bytes) -> tuple[list[tuple[str, bytes]], Image.Image]:
    image = resize_image(load_pil_image(image_bytes), max_side=MAX_FULL_IMAGE_SIDE)
    prompt_images = [
        build_prompt_image_part(
            "カード全体",
            image,
            max_side=MAX_FULL_IMAGE_SIDE,
            autocontrast=False,
        ),
        build_prompt_image_part(
            "タイトル帯",
            image,
            ratios=TITLE_CROP_RATIOS,
            max_side=TITLE_CROP_MAX_SIDE,
            min_side=TITLE_CROP_MIN_SIDE,
        ),
        build_prompt_image_part(
            "レアリティ付近",
            image,
            ratios=RARITY_CROP_RATIOS,
            max_side=DETAIL_CROP_MAX_SIDE,
            min_side=DETAIL_CROP_MIN_SIDE,
        ),
        build_prompt_image_part(
            "右側タブ領域",
            image,
            ratios=RIGHT_TAB_CROP_RATIOS,
            max_side=DETAIL_CROP_MAX_SIDE,
            min_side=DETAIL_CROP_MIN_SIDE,
        ),
        build_prompt_image_part(
            "下部ステータス領域",
            image,
            ratios=STATS_CROP_RATIOS,
            max_side=DETAIL_CROP_MAX_SIDE,
            min_side=DETAIL_CROP_MIN_SIDE,
        ),
        build_prompt_image_part(
            "属性アイコン枠",
            image,
            ratios=ELEMENT_AREA_CROP_RATIOS,
            max_side=ICON_CROP_MAX_SIDE,
            min_side=ICON_CROP_MIN_SIDE,
        ),
        build_prompt_image_part(
            "攻撃属性アイコン枠",
            image,
            ratios=ATTACK_TYPE_ICON_CROP_RATIOS,
            max_side=ICON_CROP_MAX_SIDE,
            min_side=ICON_CROP_MIN_SIDE,
        ),
        build_prompt_image_part(
            "右下アイコン領域",
            image,
            ratios=SKILL_ICON_CROP_RATIOS,
            max_side=ICON_CROP_MAX_SIDE,
            min_side=ICON_CROP_MIN_SIDE,
        ),
    ]
    return prompt_images, image


def detect_icon_skill_type(image: Image.Image) -> tuple[str | None, dict[str, Any]]:
    icon_crop = crop_by_ratios(image, SKILL_ICON_CROP_RATIOS).convert("RGB")
    if icon_crop.size[0] <= 1 or icon_crop.size[1] <= 1:
        return None, {}

    icon_crop = resize_image(icon_crop, max_side=256)
    best_pixel: dict[str, Any] | None = None

    for red, green, blue in icon_crop.getdata():
        hue, saturation, value = colorsys.rgb_to_hsv(red / 255.0, green / 255.0, blue / 255.0)
        if value < 0.20 or saturation < 0.35:
            continue
        score = saturation * value
        if best_pixel is None or score > best_pixel["score"]:
            best_pixel = {
                "score": score,
                "rgb": [red, green, blue],
                "hue": hue,
                "saturation": saturation,
                "value": value,
            }

    if best_pixel is None:
        return None, {"found": False}

    hue = best_pixel["hue"]
    if hue <= 0.05 or hue >= 0.94:
        skill_type = "バースト"
    elif 0.22 <= hue <= 0.45:
        skill_type = "コネクト"
    elif 0.52 <= hue <= 0.72:
        skill_type = "チェイン"
    elif 0.73 <= hue <= 0.90:
        skill_type = "アクセル"
    else:
        skill_type = None

    return skill_type, {
        "found": True,
        "rgb": best_pixel["rgb"],
        "hue": round(float(best_pixel["hue"]), 4),
        "saturation": round(float(best_pixel["saturation"]), 4),
        "value": round(float(best_pixel["value"]), 4),
    }


def build_source_hints(source: str, image: Image.Image) -> dict[str, Any]:
    skill_type, icon_debug = detect_icon_skill_type(image)
    return {
        "equipmentType": infer_equipment_type_from_source(source),
        "skillType": skill_type,
        "iconDebug": icon_debug,
    }


def build_gemini_contents(
    source: str,
    prompt_images: list[tuple[str, bytes]],
    source_hints: dict[str, Any],
) -> list[Any]:
    hint_lines = ["補助ヒントは画像と矛盾しない場合だけ使ってください。"]
    if source_hints.get("equipmentType"):
        hint_lines.append(
            f"入力パス由来の装備種別ヒント: {source_hints['equipmentType']}"
        )
    if source_hints.get("skillType"):
        hint_lines.append(
            f"右下アイコン色のローカル判定ヒント: {source_hints['skillType']}"
        )

    contents: list[Any] = [GEMINI_PROMPT, "\n".join(hint_lines), f"source: {source}"]
    for index, (label, image_part) in enumerate(prompt_images, start=1):
        contents.append(f"画像 {index}: {label}")
        contents.append({"mime_type": "image/png", "data": image_part})
    return contents


def analyze_image_with_gemini(
    model: genai.GenerativeModel,
    source: str,
    prompt_images: list[tuple[str, bytes]],
    source_hints: dict[str, Any],
) -> tuple[dict[str, Any], str]:
    response = model.generate_content(
        build_gemini_contents(source, prompt_images, source_hints),
        generation_config={
            "temperature": 0,
            "response_mime_type": "application/json",
        },
    )
    raw_text = get_response_text(response)
    return extract_json_object(raw_text), raw_text


def has_meaningful_data(row: dict[str, Any]) -> bool:
    return any(row.get(column) not in (None, "") for column in MEANINGFUL_COLUMNS)


def append_debug_entry(debug_path: Path | None, entry: dict[str, Any]) -> None:
    if debug_path is None:
        return
    with debug_path.open("a", encoding="utf-8") as file:
        file.write(json.dumps(entry, ensure_ascii=False) + "\n")


def resolve_debug_path(
    output_path: str | Path,
    debug_jsonl_path: str | Path | None = None,
) -> Path | None:
    if debug_jsonl_path == "":
        return None
    if debug_jsonl_path is not None:
        resolved_path = Path(debug_jsonl_path).expanduser().resolve()
    else:
        output_file_path = Path(output_path).expanduser().resolve()
        resolved_path = output_file_path.parent / f"{output_file_path.name}{DEFAULT_DEBUG_SUFFIX}"
    resolved_path.parent.mkdir(parents=True, exist_ok=True)
    if resolved_path.exists():
        resolved_path.unlink()
    return resolved_path


def analyze_single_source(
    model: genai.GenerativeModel,
    source: str | Path,
    model_resolution: dict[str, Any],
) -> tuple[dict[str, Any], dict[str, Any]]:
    normalized_source = normalize_whitespace(source)
    debug_entry: dict[str, Any] = {
        "source": normalized_source,
        "status": "error",
        "modelResolution": model_resolution,
    }
    source_hints: dict[str, Any] | None = None

    try:
        image_bytes, _mime_type, normalized_source = load_image_bytes(normalized_source)
        prompt_images, normalized_image = build_prompt_images(image_bytes)
        source_hints = build_source_hints(normalized_source, normalized_image)
        raw_record, raw_response_text = analyze_image_with_gemini(
            model,
            normalized_source,
            prompt_images,
            source_hints,
        )
        row = normalize_record(raw_record, normalized_source, source_hints=source_hints)
        status = "ok" if has_meaningful_data(row) else "empty"
        debug_entry.update(
            {
                "source": normalized_source,
                "status": status,
                "rawResponseText": raw_response_text,
                "rawRecord": raw_record,
                "sourceHints": source_hints,
                "normalizedRecord": row,
            }
        )
        return row, debug_entry
    except Exception as error:
        row = create_empty_record(
            normalized_source,
            source_hints=source_hints,
        )
        debug_entry.update(
            {
                "source": normalized_source,
                "status": "error",
                "error": str(error),
                "sourceHints": source_hints,
                "normalizedRecord": row,
            }
        )
        return row, debug_entry


def analyze_skill_images_to_dataframe(
    image_sources: list[str | Path],
    model_name: str = DEFAULT_MODEL_NAME,
    output_path: str | Path = DEFAULT_OUTPUT_PATH,
    sleep_seconds: float = DEFAULT_SLEEP_SECONDS,
    gemini_api_key: str | None = None,
    debug_jsonl_path: str | Path | None = None,
) -> pd.DataFrame:
    if not image_sources:
        raise RuntimeError("No image sources were provided.")

    configure_gemini(gemini_api_key)
    rows: list[dict[str, Any]] = []
    debug_path = resolve_debug_path(output_path, debug_jsonl_path)
    summary = {"ok": 0, "empty": 0, "error": 0}
    model_resolution: dict[str, Any] | None = None

    try:
        model_resolution = resolve_model_name(model_name)
        append_debug_entry(
            debug_path,
            {
                "phase": "preflight",
                "status": "ok",
                "modelResolution": model_resolution,
            },
        )
    except Exception as error:
        append_debug_entry(
            debug_path,
            {
                "phase": "preflight",
                "status": "error",
                "requestedModel": model_name,
                "error": str(error),
            },
        )
        raise

    model = genai.GenerativeModel(model_resolution["resolvedModel"])
    print(
        f"Using Gemini model: requested={model_resolution['requestedModel']} "
        f"resolved={model_resolution['resolvedModel']}",
        file=sys.stderr,
    )

    for index, source in enumerate(image_sources, start=1):
        row, debug_entry = analyze_single_source(model, source, model_resolution)
        status = str(debug_entry.get("status") or "error")
        summary[status] = summary.get(status, 0) + 1
        rows.append(row)
        append_debug_entry(debug_path, debug_entry)

        normalized_source = normalize_whitespace(source)
        if status == "ok":
            print(
                f"[{index}/{len(image_sources)}] analyzed: {normalized_source}",
                file=sys.stderr,
            )
        elif status == "empty":
            print(
                f"[{index}/{len(image_sources)}] low-signal result: {normalized_source}",
                file=sys.stderr,
            )
        else:
            print(
                f"[{index}/{len(image_sources)}] failed: {normalized_source} ({debug_entry.get('error')})",
                file=sys.stderr,
            )

        if index < len(image_sources):
            time.sleep(max(0.0, sleep_seconds))

    data_frame = pd.DataFrame(rows, columns=CSV_COLUMNS)
    resolved_output_path = Path(output_path).expanduser().resolve()
    resolved_output_path.parent.mkdir(parents=True, exist_ok=True)
    data_frame.to_csv(resolved_output_path, index=False)

    print(
        f"Summary: ok={summary.get('ok', 0)} empty={summary.get('empty', 0)} error={summary.get('error', 0)}",
        file=sys.stderr,
    )
    if debug_path is not None:
        print(f"Debug log: {debug_path}", file=sys.stderr)

    return data_frame


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Analyze SAOIF skill images with Gemini and export a CSV."
    )
    parser.add_argument("--folder", help="Local folder containing image files.")
    parser.add_argument(
        "--input-file",
        help="Text, CSV, or JSON file containing image URLs or local paths.",
    )
    parser.add_argument(
        "--output",
        default=DEFAULT_OUTPUT_PATH,
        help=f"CSV output path. Default: {DEFAULT_OUTPUT_PATH}",
    )
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL_NAME,
        help=f"Gemini model name. Default: {DEFAULT_MODEL_NAME}",
    )
    parser.add_argument(
        "--sleep-seconds",
        type=float,
        default=DEFAULT_SLEEP_SECONDS,
        help=f"Wait time between requests. Default: {DEFAULT_SLEEP_SECONDS}",
    )
    parser.add_argument(
        "--gemini-api-key",
        help="Override the Gemini API key.",
    )
    parser.add_argument(
        "--debug-jsonl",
        help="Optional debug JSONL path. Defaults to <output>.debug.jsonl",
    )
    parser.add_argument(
        "--non-recursive",
        action="store_true",
        help="Only scan the top level of --folder.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Optional limit for the number of images to analyze.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not args.folder and not args.input_file:
        raise RuntimeError("Pass --folder or --input-file.")

    image_sources = load_image_sources(
        folder_path=args.folder,
        input_file=args.input_file,
        recursive=not args.non_recursive,
        limit=args.limit,
    )
    data_frame = analyze_skill_images_to_dataframe(
        image_sources=image_sources,
        model_name=args.model,
        output_path=args.output,
        sleep_seconds=args.sleep_seconds,
        gemini_api_key=args.gemini_api_key,
        debug_jsonl_path=args.debug_jsonl,
    )
    print(f"Saved {len(data_frame)} rows to {Path(args.output).expanduser().resolve()}")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
