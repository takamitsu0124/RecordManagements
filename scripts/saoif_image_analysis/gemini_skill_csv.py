#!/usr/bin/env python3
from __future__ import annotations

import argparse
import colorsys
import csv
import hashlib
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
    "characterName",
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
    "effect",
    "image",
]
REPO_ROOT = Path(__file__).resolve().parents[2]
LOCAL_SOURCE_IMAGE_ROOT = REPO_ROOT / "scripts" / "skill-master" / "source-images"
STORAGE_SOURCE_IMAGE_ROOT = Path("skill-master/source-images")
MEANINGFUL_COLUMNS = [
    "name",
    "characterName",
    "rarity",
    "cost",
    "sp",
    "element",
    "attackType",
    "breakGauge",
    "switchGauge",
    "cooldown",
    "skillName",
    "effect",
]
DEFAULT_MODEL_NAME = "gemini-2.5-flash-lite"
DEFAULT_OUTPUT_PATH = "saoif_skills.csv"
DEFAULT_SLEEP_SECONDS = 2.0
DEFAULT_PROMPT_CACHE_TTL_SECONDS = 3600
GENERATE_CONTENT_METHOD = "generateContent"
ANALYSIS_SIGNATURE_VERSION = 1
PROMPT_CACHE_DISPLAY_NAME_PREFIX = "saoif-skill-analyzer"
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
SKILL_HEADER_CROP_RATIOS = (0.71, 0.45, 0.98, 0.55)
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
TEXT_PLACEHOLDERS = {
    "skill",
    "skill name",
    "character name",
    "effect",
    "アビリティ",
    "キャラ",
    "キャラ名",
    "キャラクター",
    "キャラクター名",
    "スキル",
    "技",
    "技名",
    "効果",
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
6. スキルヘッダー領域
7. 属性アイコン枠
8. 攻撃属性アイコン枠
9. 右下アイコン領域

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
最優先: カードが「アビリティ」であるか確認してください。
- スキル詳細欄に「アビリティ」と記載がある、または装備タイプが「アビリティ」の場合はアビリティです。
- アビリティの場合、attackType と element は解析不要です。必ず null を返してください。
- アビリティは武器属性アイコンを持たないので、背景色や雰囲気から補完しないでください。

アビリティでない場合のみ、以下のルールを適用します。
1. 属性(element):
   - 消費SPの右側を確認してください。
   - アイコン（火、水、風、土、聖、闇）が存在しない、つまりアイコン枠が空欄なら「無」と回答してください。
   - 背景が何色であっても、背景イラストやエフェクトの色は属性判定に使わないこと。
2. 攻撃属性(attackType):
   - スキルメインアイコン内の図形を確認してください。
   - 斬撃の軌跡や剣のマークなら「斬」、矢印や鋭い刺突のマークなら「突」、衝撃波や重みのある鈍器のマークなら「打」と回答してください。
3. キャラクター名(characterName):
   - カード名のうち、キャラクター名だけを返してください。
   - 例: 【智の探求】アリス → アリス
   - 二つ名や【】は含めないでください。
   - 判断できない場合は null
4. 技名(skillName):
   - カードに書かれている技名そのものを返してください。
   - 例: スターバースト・ストリーム
   - 効果説明文や「Effect」「効果」の見出しは入れないでください。
   - 技名が見当たらない場合は null
5. 効果内容(effect):
   - 効果説明文の本文を返してください。
   - 「Effect」「効果」の見出しそのものは含めず、その下の本文だけを返してください。
   - 技名を effect に重ねて入れないでください。
   - 効果説明文が見当たらない場合は null

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
  "characterName": null,
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
  "effect": null,
  "image": null
}
""".strip()


def normalize_whitespace(value: Any) -> str:
    return str(value or "").strip()


def normalize_lookup_key(value: Any) -> str:
    return re.sub(r"[\s_()/:.-]+", "", normalize_whitespace(value).lower())


TEXT_PLACEHOLDER_KEYS = {normalize_lookup_key(item) for item in TEXT_PLACEHOLDERS}


def normalize_rarity(value: Any) -> str | None:
    normalized = normalize_whitespace(value).upper()
    return normalized or None


def normalize_enum(value: Any, aliases: dict[str, str]) -> str | None:
    normalized = normalize_whitespace(value)
    if not normalized:
        return None

    lookup_key = normalize_lookup_key(normalized)
    return aliases.get(lookup_key) or aliases.get(normalized) or None


def extract_character_name_from_name(value: Any) -> str | None:
    normalized = normalize_whitespace(value)
    if not normalized:
        return None
    matched = re.search(r"】\s*(.+)$", normalized)
    if not matched:
        return None
    extracted = normalize_whitespace(matched.group(1))
    return extracted or None


def normalize_character_name_text(value: Any) -> str | None:
    normalized = normalize_whitespace(value)
    if not normalized:
        return None
    normalized = re.sub(
        r"^(?:character\s*name|charactername|キャラクター名|キャラ名)\s*[:：]?\s*",
        "",
        normalized,
        flags=re.IGNORECASE,
    )
    if not normalized:
        return None
    if normalize_lookup_key(normalized) in TEXT_PLACEHOLDER_KEYS:
        return None
    if "【" in normalized or "】" in normalized:
        extracted = extract_character_name_from_name(normalized)
        if extracted:
            return extracted
    return normalized


def normalize_skill_name_text(value: Any) -> str | None:
    normalized = normalize_whitespace(value)
    if not normalized:
        return None
    if normalize_lookup_key(normalized) in TEXT_PLACEHOLDER_KEYS:
        return None
    if re.match(r"^(?:effect|効果)\s*[:：]?\s*", normalized, flags=re.IGNORECASE):
        return None
    return normalized


def normalize_effect_text(value: Any) -> str | None:
    normalized = normalize_whitespace(value)
    if not normalized:
        return None
    normalized = re.sub(r"^(?:effect|効果)\s*[:：]?\s*", "", normalized, flags=re.IGNORECASE)
    if not normalized:
        return None
    if normalize_lookup_key(normalized) in TEXT_PLACEHOLDER_KEYS:
        return None
    return normalized


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


def create_source_spec(
    source: str,
    analysis_source: str | None = None,
) -> dict[str, str]:
    normalized_source = normalize_whitespace(source)
    normalized_analysis_source = normalize_whitespace(analysis_source) or normalized_source
    return {
        "source": normalized_source,
        "analysisSource": normalized_analysis_source,
    }


def extract_storage_relative_path(candidate: str) -> Path | None:
    normalized_candidate = normalize_whitespace(candidate)
    if not normalized_candidate:
        return None

    raw_path = (
        decode_firebase_object_path(normalized_candidate)
        if normalized_candidate.startswith(("http://", "https://"))
        else normalized_candidate
    )
    normalized_path = Path(raw_path)
    root_parts = STORAGE_SOURCE_IMAGE_ROOT.parts
    if normalized_path.parts[: len(root_parts)] != root_parts:
        return None

    relative_parts = normalized_path.parts[len(root_parts) :]
    if not relative_parts:
        return None
    return Path(*relative_parts)


def resolve_local_source_from_storage_reference(candidate: str) -> str:
    relative_path = extract_storage_relative_path(candidate)
    if relative_path is None:
        return ""

    local_path = (LOCAL_SOURCE_IMAGE_ROOT / relative_path).resolve()
    if not local_path.is_file():
        return ""
    return str(local_path)


def build_source_spec_from_mapping(item: dict[str, Any]) -> dict[str, str] | None:
    existing_source = normalize_whitespace(item.get("source"))
    existing_analysis_source = normalize_whitespace(item.get("analysisSource"))
    if existing_source:
        return create_source_spec(existing_source, existing_analysis_source)

    image_value = ""
    for key in SOURCE_KEYS:
        candidate = normalize_whitespace(item.get(key))
        if candidate:
            image_value = candidate
            break

    explicit_local_source = ""
    for key in ("local_path", "localPath"):
        candidate = normalize_whitespace(item.get(key))
        if candidate:
            explicit_local_source = candidate
            break

    generic_local_source = ""
    for key in ("path", "file"):
        candidate = normalize_whitespace(item.get(key))
        if candidate and not candidate.startswith(("http://", "https://")):
            generic_local_source = candidate
            break

    derived_local_source = (
        resolve_local_source_from_storage_reference(
            normalize_whitespace(item.get("storage_path") or item.get("storagePath"))
        )
        or resolve_local_source_from_storage_reference(image_value)
    )
    analysis_source = explicit_local_source or generic_local_source or derived_local_source or image_value
    source = image_value or analysis_source
    if not source:
        return None
    return create_source_spec(source, analysis_source)


def coerce_source_spec(source: str | Path | dict[str, Any]) -> dict[str, str]:
    if isinstance(source, dict):
        source_spec = build_source_spec_from_mapping(source)
        if source_spec is not None:
            return source_spec
        return create_source_spec("")

    normalized_source = normalize_whitespace(source)
    return create_source_spec(normalized_source)


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
    *,
    image_value: str | None = None,
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
        "characterName": None,
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
        "effect": None,
        "image": normalize_whitespace(image_value) or source,
    }


def normalize_record(
    raw_record: dict[str, Any],
    source: str,
    *,
    image_value: str | None = None,
    source_hints: dict[str, Any] | None = None,
) -> dict[str, Any]:
    source_hints = source_hints or {}
    normalized_record = create_empty_record(
        source,
        image_value=image_value,
        source_hints=source_hints,
    )
    element = normalize_enum(raw_record.get("element"), ELEMENT_ALIASES)
    equipment_type = normalize_enum(
        raw_record.get("equipmentType"), EQUIPMENT_TYPE_ALIASES
    ) or source_hints.get("equipmentType") or infer_equipment_type_from_source(source)
    is_ability = equipment_type == "アビリティ"
    skill_type = normalize_enum(raw_record.get("skillType"), SKILL_TYPE_ALIASES) or source_hints.get(
        "skillType"
    )
    name = normalize_whitespace(raw_record.get("name")) or None
    character_name = normalize_character_name_text(raw_record.get("characterName"))
    if character_name is None:
        character_name = extract_character_name_from_name(name)

    normalized_record.update(
        {
            "id": normalize_whitespace(raw_record.get("id"))
            or build_draft_id(element, equipment_type, source),
            "name": name,
            "characterName": character_name,
            "rarity": normalize_rarity(raw_record.get("rarity")),
            "cost": parse_integer(raw_record.get("cost")),
            "equipmentType": equipment_type,
            "sp": parse_integer(raw_record.get("sp")),
            "element": None if is_ability else element,
            "skillType": skill_type,
            "attackType": None
            if is_ability
            else normalize_enum(
                raw_record.get("attackType"), ATTACK_TYPE_ALIASES
            ),
            "breakGauge": parse_integer(raw_record.get("breakGauge")),
            "switchGauge": parse_integer(raw_record.get("switchGauge")),
            "cooldown": parse_integer(raw_record.get("cooldown")),
            "skillName": normalize_skill_name_text(raw_record.get("skillName")),
            "effect": normalize_effect_text(raw_record.get("effect")),
            "image": normalize_whitespace(image_value) or source,
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


def load_sources_from_json(file_path: Path) -> list[dict[str, str]]:
    parsed = json.loads(file_path.read_text(encoding="utf-8"))
    if isinstance(parsed, dict):
        for key in ("images", "items", "results"):
            value = parsed.get(key)
            if isinstance(value, list):
                parsed = value
                break

    if not isinstance(parsed, list):
        raise ValueError("JSON input must be an array or an object containing an array.")

    results: list[dict[str, str]] = []
    for item in parsed:
        if isinstance(item, str):
            normalized = normalize_whitespace(item)
            if normalized:
                results.append(create_source_spec(normalized))
            continue
        if isinstance(item, dict):
            source_spec = build_source_spec_from_mapping(item)
            if source_spec is not None:
                results.append(source_spec)
    return results


def load_sources_from_csv(file_path: Path) -> list[dict[str, str]]:
    results: list[dict[str, str]] = []
    with file_path.open("r", encoding="utf-8", newline="") as file:
        reader = csv.DictReader(file)
        for row in reader:
            source_spec = build_source_spec_from_mapping(row)
            if source_spec is not None:
                results.append(source_spec)
    return results


def load_sources_from_text(file_path: Path) -> list[dict[str, str]]:
    results: list[dict[str, str]] = []
    for line in file_path.read_text(encoding="utf-8").splitlines():
        normalized = normalize_whitespace(line)
        if normalized and not normalized.startswith("#"):
            results.append(create_source_spec(normalized))
    return results


def load_image_sources(
    folder_path: str | None = None,
    input_file: str | None = None,
    recursive: bool = True,
    limit: int = 0,
) -> list[dict[str, str]]:
    sources: list[dict[str, str]] = []

    if folder_path:
        sources.extend(create_source_spec(str(path)) for path in iter_image_files(folder_path, recursive))

    if input_file:
        resolved_input_path = Path(input_file).expanduser().resolve()
        suffix = resolved_input_path.suffix.lower()
        if suffix == ".json":
            sources.extend(load_sources_from_json(resolved_input_path))
        elif suffix == ".csv":
            sources.extend(load_sources_from_csv(resolved_input_path))
        else:
            sources.extend(load_sources_from_text(resolved_input_path))

    deduped_sources: list[dict[str, str]] = []
    seen_sources: set[str] = set()
    for source in sources:
        source_spec = coerce_source_spec(source)
        source_key = source_spec["source"] or source_spec["analysisSource"]
        if not source_key or source_key in seen_sources:
            continue
        seen_sources.add(source_key)
        deduped_sources.append(source_spec)
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


def normalize_image_for_analysis(image_bytes: bytes) -> Image.Image:
    return resize_image(load_pil_image(image_bytes), max_side=MAX_FULL_IMAGE_SIDE)


def compute_image_sha256(image: Image.Image) -> str:
    return hashlib.sha256(image_to_png_bytes(image)).hexdigest()


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


def build_prompt_images_from_image(image: Image.Image) -> list[tuple[str, bytes]]:
    return [
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
            "スキルヘッダー領域",
            image,
            ratios=SKILL_HEADER_CROP_RATIOS,
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


def build_prompt_images(image_bytes: bytes) -> tuple[list[tuple[str, bytes]], Image.Image]:
    image = normalize_image_for_analysis(image_bytes)
    return build_prompt_images_from_image(image), image


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
    *,
    include_prompt: bool = True,
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

    contents: list[Any] = []
    if include_prompt:
        contents.append(GEMINI_PROMPT)
    contents.extend(("\n".join(hint_lines), f"source: {source}"))
    for index, (label, image_part) in enumerate(prompt_images, start=1):
        contents.append(f"画像 {index}: {label}")
        contents.append({"mime_type": "image/png", "data": image_part})
    return contents


def analyze_image_with_gemini(
    model: genai.GenerativeModel,
    source: str,
    prompt_images: list[tuple[str, bytes]],
    source_hints: dict[str, Any],
    *,
    include_prompt: bool = True,
) -> tuple[dict[str, Any], str]:
    response = model.generate_content(
        build_gemini_contents(
            source,
            prompt_images,
            source_hints,
            include_prompt=include_prompt,
        ),
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
    *,
    clear_existing: bool = True,
) -> Path | None:
    if debug_jsonl_path == "":
        return None
    if debug_jsonl_path is not None:
        resolved_path = Path(debug_jsonl_path).expanduser().resolve()
    else:
        output_file_path = Path(output_path).expanduser().resolve()
        resolved_path = output_file_path.parent / f"{output_file_path.name}{DEFAULT_DEBUG_SUFFIX}"
    resolved_path.parent.mkdir(parents=True, exist_ok=True)
    if clear_existing and resolved_path.exists():
        resolved_path.unlink()
    return resolved_path


def build_analysis_signature(model_resolution: dict[str, Any]) -> str:
    signature_payload = {
        "version": ANALYSIS_SIGNATURE_VERSION,
        "resolvedModel": model_resolution.get("resolvedModel"),
        "prompt": GEMINI_PROMPT,
        "cropRatios": {
            "title": TITLE_CROP_RATIOS,
            "rarity": RARITY_CROP_RATIOS,
            "rightTab": RIGHT_TAB_CROP_RATIOS,
            "stats": STATS_CROP_RATIOS,
            "skillHeader": SKILL_HEADER_CROP_RATIOS,
            "element": ELEMENT_AREA_CROP_RATIOS,
            "attackType": ATTACK_TYPE_ICON_CROP_RATIOS,
            "skillIcon": SKILL_ICON_CROP_RATIOS,
        },
        "imageSizing": {
            "full": MAX_FULL_IMAGE_SIDE,
            "titleMax": TITLE_CROP_MAX_SIDE,
            "titleMin": TITLE_CROP_MIN_SIDE,
            "detailMax": DETAIL_CROP_MAX_SIDE,
            "detailMin": DETAIL_CROP_MIN_SIDE,
            "iconMax": ICON_CROP_MAX_SIDE,
            "iconMin": ICON_CROP_MIN_SIDE,
        },
    }
    payload_bytes = json.dumps(
        signature_payload,
        sort_keys=True,
        ensure_ascii=False,
    ).encode("utf-8")
    return hashlib.sha256(payload_bytes).hexdigest()


def build_prompt_cache_display_name(analysis_signature: str) -> str:
    return f"{PROMPT_CACHE_DISPLAY_NAME_PREFIX}-{analysis_signature[:24]}"


def get_prompt_cache(
    model_name: str,
    analysis_signature: str,
    ttl_seconds: int,
) -> tuple[Any | None, dict[str, Any]]:
    cache_display_name = build_prompt_cache_display_name(analysis_signature)
    cache_info: dict[str, Any] = {
        "enabled": True,
        "displayName": cache_display_name,
        "ttlSeconds": ttl_seconds,
    }
    normalized_model_name = normalize_model_name(model_name)

    try:
        for cached_content in genai.caching.CachedContent.list(page_size=100):
            if cached_content.display_name != cache_display_name:
                continue
            if normalize_model_name(cached_content.model) != normalized_model_name:
                continue
            cache_info.update(
                {
                    "status": "reused",
                    "name": cached_content.name,
                    "model": cached_content.model,
                }
            )
            return cached_content, cache_info

        cached_content = genai.caching.CachedContent.create(
            model=model_name,
            display_name=cache_display_name,
            contents=[GEMINI_PROMPT],
            ttl=ttl_seconds,
        )
        cache_info.update(
            {
                "status": "created",
                "name": cached_content.name,
                "model": cached_content.model,
            }
        )
        return cached_content, cache_info
    except Exception as error:
        cache_info.update(
            {
                "enabled": False,
                "status": "fallback",
                "error": str(error),
            }
        )
        return None, cache_info


def build_analysis_model(
    model_resolution: dict[str, Any],
    analysis_signature: str,
    *,
    use_explicit_prompt_cache: bool,
    prompt_cache_ttl_seconds: int,
) -> tuple[genai.GenerativeModel, dict[str, Any], bool]:
    if use_explicit_prompt_cache:
        cached_content, cache_info = get_prompt_cache(
            model_resolution["resolvedModel"],
            analysis_signature,
            prompt_cache_ttl_seconds,
        )
        if cached_content is not None:
            return (
                genai.GenerativeModel.from_cached_content(cached_content),
                cache_info,
                False,
            )
        return genai.GenerativeModel(model_resolution["resolvedModel"]), cache_info, True

    return (
        genai.GenerativeModel(model_resolution["resolvedModel"]),
        {
            "enabled": False,
            "status": "disabled",
        },
        True,
    )


def coerce_output_row(
    candidate: dict[str, Any] | None,
    source: str,
    *,
    image_value: str | None = None,
    source_hints: dict[str, Any] | None = None,
) -> dict[str, Any]:
    row = create_empty_record(source, image_value=image_value, source_hints=source_hints)
    if isinstance(candidate, dict):
        for column in CSV_COLUMNS:
            if column in candidate:
                row[column] = candidate[column]

    row["image"] = normalize_whitespace(image_value) or normalize_whitespace(row.get("image")) or source
    if not normalize_whitespace(row.get("id")):
        row["id"] = build_draft_id(row.get("element"), row.get("equipmentType"), source)
    return row


def load_resume_state(
    debug_path: Path | None,
    analysis_signature: str,
) -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    by_source: dict[str, dict[str, Any]] = {}
    by_image_sha256: dict[str, dict[str, Any]] = {}
    if debug_path is None or not debug_path.exists():
        return by_source, by_image_sha256

    with debug_path.open("r", encoding="utf-8") as file:
        for line in file:
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue

            if entry.get("analysisSignature") != analysis_signature:
                continue

            status = normalize_whitespace(entry.get("status"))
            source = normalize_whitespace(entry.get("source"))
            if status not in {"ok", "empty"} or not source:
                continue

            source_hints = entry.get("sourceHints") if isinstance(entry.get("sourceHints"), dict) else None
            normalized_record = coerce_output_row(
                entry.get("normalizedRecord"),
                source,
                image_value=normalize_whitespace(
                    entry.get("normalizedRecord", {}).get("image")
                    if isinstance(entry.get("normalizedRecord"), dict)
                    else ""
                ),
                source_hints=source_hints,
            )
            resume_entry = {
                "source": source,
                "status": status,
                "normalizedRecord": normalized_record,
                "rawRecord": entry.get("rawRecord") if isinstance(entry.get("rawRecord"), dict) else None,
                "rawResponseText": entry.get("rawResponseText"),
                "sourceHints": source_hints,
                "imageSha256": normalize_whitespace(entry.get("imageSha256")),
            }
            by_source[source] = resume_entry

            if resume_entry["imageSha256"] and resume_entry["rawRecord"] is not None:
                by_image_sha256[resume_entry["imageSha256"]] = resume_entry

    return by_source, by_image_sha256


def prepare_source_analysis(
    source: str | Path | dict[str, Any],
    model_resolution: dict[str, Any],
    analysis_signature: str,
) -> tuple[dict[str, Any] | None, dict[str, Any], dict[str, Any]]:
    source_spec = coerce_source_spec(source)
    normalized_source = source_spec["source"]
    analysis_source = source_spec["analysisSource"]
    debug_entry: dict[str, Any] = {
        "source": normalized_source,
        "status": "error",
        "modelResolution": model_resolution,
        "analysisSignature": analysis_signature,
    }
    source_hints: dict[str, Any] | None = None

    try:
        image_bytes, _mime_type, normalized_analysis_source = load_image_bytes(analysis_source)
        normalized_image = normalize_image_for_analysis(image_bytes)
        source_hints = build_source_hints(normalized_source, normalized_image)
        image_sha256 = compute_image_sha256(normalized_image)
        prepared_source = {
            "source": normalized_source,
            "analysisSource": normalized_analysis_source,
            "normalizedImage": normalized_image,
            "sourceHints": source_hints,
            "imageSha256": image_sha256,
            "imageValue": normalized_source,
        }
        debug_entry.update(
            {
                "source": normalized_source,
                "analysisSource": normalized_analysis_source,
                "sourceHints": source_hints,
                "imageSha256": image_sha256,
            }
        )
        return (
            prepared_source,
            create_empty_record(
                normalized_source,
                image_value=normalized_source,
                source_hints=source_hints,
            ),
            debug_entry,
        )
    except Exception as error:
        row = create_empty_record(
            normalized_source,
            image_value=normalized_source,
            source_hints=source_hints,
        )
        debug_entry.update(
            {
                "source": normalized_source,
                "analysisSource": analysis_source,
                "status": "error",
                "error": str(error),
                "sourceHints": source_hints,
                "normalizedRecord": row,
            }
        )
        return None, row, debug_entry


def analyze_prepared_source(
    model: genai.GenerativeModel,
    prepared_source: dict[str, Any],
    model_resolution: dict[str, Any],
    analysis_signature: str,
    *,
    include_prompt: bool,
) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any] | None]:
    normalized_source = normalize_whitespace(prepared_source["source"])
    debug_entry: dict[str, Any] = {
        "source": normalized_source,
        "status": "error",
        "modelResolution": model_resolution,
        "analysisSignature": analysis_signature,
        "sourceHints": prepared_source["sourceHints"],
        "imageSha256": prepared_source["imageSha256"],
    }

    try:
        prompt_images = build_prompt_images_from_image(prepared_source["normalizedImage"])
        raw_record, raw_response_text = analyze_image_with_gemini(
            model,
            normalized_source,
            prompt_images,
            prepared_source["sourceHints"],
            include_prompt=include_prompt,
        )
        row = normalize_record(
            raw_record,
            normalized_source,
            image_value=normalize_whitespace(prepared_source.get("imageValue")),
            source_hints=prepared_source["sourceHints"],
        )
        status = "ok" if has_meaningful_data(row) else "empty"
        debug_entry.update(
            {
                "source": normalized_source,
                "status": status,
                "rawResponseText": raw_response_text,
                "rawRecord": raw_record,
                "normalizedRecord": row,
            }
        )
        return row, debug_entry, raw_record
    except Exception as error:
        row = create_empty_record(
            normalized_source,
            image_value=normalize_whitespace(prepared_source.get("imageValue")),
            source_hints=prepared_source["sourceHints"],
        )
        debug_entry.update(
            {
                "source": normalized_source,
                "status": "error",
                "error": str(error),
                "normalizedRecord": row,
            }
        )
        return row, debug_entry, None


def analyze_skill_images_to_dataframe(
    image_sources: list[str | Path | dict[str, Any]],
    model_name: str = DEFAULT_MODEL_NAME,
    output_path: str | Path = DEFAULT_OUTPUT_PATH,
    sleep_seconds: float = DEFAULT_SLEEP_SECONDS,
    gemini_api_key: str | None = None,
    debug_jsonl_path: str | Path | None = None,
    *,
    resume_ok: bool = True,
    dedupe_by_content: bool = True,
    use_explicit_prompt_cache: bool = True,
    prompt_cache_ttl_seconds: int = DEFAULT_PROMPT_CACHE_TTL_SECONDS,
) -> pd.DataFrame:
    if not image_sources:
        raise RuntimeError("No image sources were provided.")

    configure_gemini(gemini_api_key)
    rows: list[dict[str, Any]] = []
    summary = {"ok": 0, "empty": 0, "error": 0, "resumed": 0, "deduped": 0}
    model_resolution: dict[str, Any] | None = None

    try:
        model_resolution = resolve_model_name(model_name)
        analysis_signature = build_analysis_signature(model_resolution)
        existing_debug_path = resolve_debug_path(
            output_path,
            debug_jsonl_path,
            clear_existing=False,
        )
        resumed_by_source, resumed_by_image_sha256 = (
            load_resume_state(existing_debug_path, analysis_signature)
            if resume_ok
            else ({}, {})
        )
        debug_path = resolve_debug_path(output_path, debug_jsonl_path, clear_existing=True)
        model, prompt_cache_info, include_prompt = build_analysis_model(
            model_resolution,
            analysis_signature,
            use_explicit_prompt_cache=use_explicit_prompt_cache,
            prompt_cache_ttl_seconds=prompt_cache_ttl_seconds,
        )
        append_debug_entry(
            debug_path,
            {
                "phase": "preflight",
                "status": "ok",
                "modelResolution": model_resolution,
                "analysisSignature": analysis_signature,
                "resume": {
                    "enabled": resume_ok,
                    "resumableSources": len(resumed_by_source),
                    "resumableFingerprints": len(resumed_by_image_sha256),
                },
                "dedupeByContent": dedupe_by_content,
                "promptCache": prompt_cache_info,
            },
        )
    except Exception as error:
        debug_path = resolve_debug_path(output_path, debug_jsonl_path, clear_existing=True)
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

    print(
        f"Using Gemini model: requested={model_resolution['requestedModel']} "
        f"resolved={model_resolution['resolvedModel']}",
        file=sys.stderr,
    )
    if prompt_cache_info.get("enabled"):
        print(
            f"Prompt cache: {prompt_cache_info.get('status')} "
            f"({prompt_cache_info.get('name', prompt_cache_info.get('error', 'n/a'))})",
            file=sys.stderr,
        )
    elif prompt_cache_info.get("status") == "fallback":
        print(
            f"Prompt cache unavailable, using direct prompts: {prompt_cache_info.get('error')}",
            file=sys.stderr,
        )

    reusable_by_image_sha256 = dict(resumed_by_image_sha256)

    for index, source in enumerate(image_sources, start=1):
        source_spec = coerce_source_spec(source)
        normalized_source = source_spec["source"]
        resumed_entry = resumed_by_source.get(normalized_source)
        if resumed_entry is not None:
            row = coerce_output_row(
                resumed_entry["normalizedRecord"],
                normalized_source,
                image_value=normalize_whitespace(resumed_entry["normalizedRecord"].get("image")),
                source_hints=resumed_entry.get("sourceHints"),
            )
            debug_entry = {
                "source": normalized_source,
                "status": resumed_entry["status"],
                "modelResolution": model_resolution,
                "analysisSignature": analysis_signature,
                "sourceHints": resumed_entry.get("sourceHints"),
                "imageSha256": resumed_entry.get("imageSha256"),
                "rawResponseText": resumed_entry.get("rawResponseText"),
                "rawRecord": resumed_entry.get("rawRecord"),
                "normalizedRecord": row,
                "reuse": {
                    "kind": "resume",
                },
            }
            status = resumed_entry["status"]
            summary[status] = summary.get(status, 0) + 1
            summary["resumed"] += 1
            rows.append(row)
            append_debug_entry(debug_path, debug_entry)
            print(
                f"[{index}/{len(image_sources)}] resumed: {normalized_source}",
                file=sys.stderr,
            )
            continue

        prepared_source, row, debug_entry = prepare_source_analysis(
            normalized_source,
            model_resolution,
            analysis_signature,
        )
        if prepared_source is None:
            status = "error"
            summary[status] = summary.get(status, 0) + 1
            rows.append(row)
            append_debug_entry(debug_path, debug_entry)
            print(
                f"[{index}/{len(image_sources)}] failed: {normalized_source} ({debug_entry.get('error')})",
                file=sys.stderr,
            )
            continue

        if dedupe_by_content:
            cached_entry = reusable_by_image_sha256.get(prepared_source["imageSha256"])
            if cached_entry is not None and isinstance(cached_entry.get("rawRecord"), dict):
                row = normalize_record(
                    cached_entry["rawRecord"],
                    prepared_source["source"],
                    source_hints=prepared_source["sourceHints"],
                )
                status = "ok" if has_meaningful_data(row) else "empty"
                debug_entry.update(
                    {
                        "status": status,
                        "rawResponseText": cached_entry.get("rawResponseText"),
                        "rawRecord": cached_entry["rawRecord"],
                        "normalizedRecord": row,
                        "reuse": {
                            "kind": "duplicate-content",
                            "fromSource": cached_entry.get("source"),
                        },
                    }
                )
                summary[status] = summary.get(status, 0) + 1
                summary["deduped"] += 1
                rows.append(row)
                append_debug_entry(debug_path, debug_entry)
                print(
                    f"[{index}/{len(image_sources)}] reused duplicate: {prepared_source['source']}",
                    file=sys.stderr,
                )
                continue

        row, debug_entry, raw_record = analyze_prepared_source(
            model,
            prepared_source,
            model_resolution,
            analysis_signature,
            include_prompt=include_prompt,
        )
        status = str(debug_entry.get("status") or "error")
        summary[status] = summary.get(status, 0) + 1
        rows.append(row)
        append_debug_entry(debug_path, debug_entry)
        if raw_record is not None and status in {"ok", "empty"}:
            reusable_by_image_sha256[prepared_source["imageSha256"]] = {
                "source": prepared_source["source"],
                "status": status,
                "rawRecord": raw_record,
                "rawResponseText": debug_entry.get("rawResponseText"),
                "sourceHints": prepared_source["sourceHints"],
                "imageSha256": prepared_source["imageSha256"],
            }

        if status == "ok":
            print(
                f"[{index}/{len(image_sources)}] analyzed: {prepared_source['source']}",
                file=sys.stderr,
            )
        elif status == "empty":
            print(
                f"[{index}/{len(image_sources)}] low-signal result: {prepared_source['source']}",
                file=sys.stderr,
            )
        else:
            print(
                f"[{index}/{len(image_sources)}] failed: {prepared_source['source']} ({debug_entry.get('error')})",
                file=sys.stderr,
            )

        if index < len(image_sources):
            time.sleep(max(0.0, sleep_seconds))

    data_frame = pd.DataFrame(rows, columns=CSV_COLUMNS)
    resolved_output_path = Path(output_path).expanduser().resolve()
    resolved_output_path.parent.mkdir(parents=True, exist_ok=True)
    data_frame.to_csv(resolved_output_path, index=False)

    print(
        "Summary: "
        f"ok={summary.get('ok', 0)} "
        f"empty={summary.get('empty', 0)} "
        f"error={summary.get('error', 0)} "
        f"resumed={summary.get('resumed', 0)} "
        f"deduped={summary.get('deduped', 0)}",
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
    parser.add_argument(
        "--no-resume-ok",
        action="store_true",
        help="Do not reuse matching successful rows from an existing debug JSONL.",
    )
    parser.add_argument(
        "--no-dedupe-by-content",
        action="store_true",
        help="Do not reuse results for duplicate images with the same content hash.",
    )
    parser.add_argument(
        "--disable-explicit-prompt-cache",
        action="store_true",
        help="Disable explicit Gemini prompt caching and always send the full prompt.",
    )
    parser.add_argument(
        "--prompt-cache-ttl-seconds",
        type=int,
        default=DEFAULT_PROMPT_CACHE_TTL_SECONDS,
        help=f"TTL for explicit Gemini prompt cache. Default: {DEFAULT_PROMPT_CACHE_TTL_SECONDS}",
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
        resume_ok=not args.no_resume_ok,
        dedupe_by_content=not args.no_dedupe_by_content,
        use_explicit_prompt_cache=not args.disable_explicit_prompt_cache,
        prompt_cache_ttl_seconds=max(1, args.prompt_cache_ttl_seconds),
    )
    print(f"Saved {len(data_frame)} rows to {Path(args.output).expanduser().resolve()}")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
