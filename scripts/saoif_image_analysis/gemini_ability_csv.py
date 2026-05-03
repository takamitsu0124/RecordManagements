#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import time
from pathlib import Path
from typing import Any

import google.generativeai as genai
import pandas as pd

try:
    from .bootstrap import configure_gemini
    from .gemini_skill_csv import (
        CSV_COLUMNS,
        DEFAULT_MODEL_NAME,
        DEFAULT_PROMPT_CACHE_TTL_SECONDS,
        DEFAULT_SLEEP_SECONDS,
        append_debug_entry,
        build_draft_id,
        build_prompt_images_from_image,
        coerce_source_spec,
        compute_image_sha256,
        extract_json_object,
        extract_character_name_from_name,
        get_response_text,
        load_image_bytes,
        load_image_sources,
        normalize_character_name_text,
        normalize_image_for_analysis,
        normalize_whitespace,
        parse_integer,
        resolve_debug_path,
        resolve_model_name,
    )
except ImportError:
    from bootstrap import configure_gemini
    from gemini_skill_csv import (
        CSV_COLUMNS,
        DEFAULT_MODEL_NAME,
        DEFAULT_PROMPT_CACHE_TTL_SECONDS,
        DEFAULT_SLEEP_SECONDS,
        append_debug_entry,
        build_draft_id,
        build_prompt_images_from_image,
        coerce_source_spec,
        compute_image_sha256,
        extract_json_object,
        extract_character_name_from_name,
        get_response_text,
        load_image_bytes,
        load_image_sources,
        normalize_character_name_text,
        normalize_image_for_analysis,
        normalize_whitespace,
        parse_integer,
        resolve_debug_path,
        resolve_model_name,
    )

DEFAULT_OUTPUT_PATH = "saoif_abilities.csv"
ANALYSIS_SIGNATURE_VERSION = 1
PROMPT_CACHE_DISPLAY_NAME_PREFIX = "saoif-ability-analyzer"
MEANINGFUL_COLUMNS = [
    "name",
    "rarity",
    "cost",
    "effect",
]
PLACEHOLDER_NAMES = {
    "ability",
    "effect",
    "skill",
    "アビリティ",
    "アビリティカード",
    "効果",
    "スキル",
    "スキルカード",
}
ABILITY_PROMPT = """
あなたは SAOIF (Sword Art Online Integral Factor) のアビリティカード解析器です。
これから 1 枚のアビリティカード画像と、その重要領域を切り出した補助画像を複数枚渡します。

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

このスクリプトはアビリティカード専用です。次の値は固定で返してください。
- equipmentType: "アビリティ"
- skillType: "アビリティ"
- skillName: null
- sp: null
- element: null
- attackType: null
- breakGauge: null
- switchGauge: null
- cooldown: null
- image: null
- id: null

Gemini が読む対象は次の 5 項目です。
1. name:
    - カード上部の表示名をそのまま読んでください
    - 例: 【反逆の風妖精】リーファ
    - キャラ名だけや二つ名だけではなく、カード上部の表示名全体を返してください
    - 読み切れない場合は推測せず null
2. characterName:
   - カード名のうち、キャラクター名だけを返してください
   - 例: 【智の探求】アリス → アリス
   - 二つ名や【】は含めないでください
   - 読み切れない場合は推測せず null
3. rarity:
    - 星の数を数え、数値で返してください
    - 例: 5
    - 星記号のまま返さず、数字にしてください
4. cost:
    - コスト数値だけを返してください
    - 例: 16
5. effect:
    - カードの効果内容を返してください
   - 「Effect」や「効果」の見出しそのものではなく、その下に書かれている本文を返してください
   - 例: クリティカル発生率が10.5%上昇
   - 読み切れない場合は推測せず null

重要ルール:
- 出力は JSON オブジェクト 1 個だけ
- カード上の日本語を優先して読んでください
- 推測しきれない値は null
- 「アビリティ」のような見出し語を name に入れないでください
- 右側タブ、属性枠、攻撃属性枠、右下アイコン色から武器スキルの種別を推測しないでください
- 下部の説明文や効果文を name に混ぜないでください
- effect には見出しを含めず、本文だけを入れてください

返却形式:
{
  "id": null,
  "name": null,
  "characterName": null,
  "rarity": null,
  "cost": null,
  "equipmentType": "アビリティ",
  "sp": null,
  "element": null,
  "skillType": "アビリティ",
  "attackType": null,
  "breakGauge": null,
  "switchGauge": null,
  "cooldown": null,
  "skillName": null,
  "effect": null,
  "image": null
}
""".strip()


def normalize_ability_name(value: Any) -> str | None:
    normalized = normalize_whitespace(value)
    if not normalized:
        return None
    if normalize_whitespace(value).lower() in PLACEHOLDER_NAMES:
        return None
    if "】" in normalized and "【" not in normalized:
        normalized = f"【{normalized}"
    return normalized or None


def normalize_ability_effect(value: Any) -> str | None:
    normalized = normalize_whitespace(value)
    if not normalized:
        return None

    normalized = re.sub(r"^(?:effect|効果)\s*[:：]?\s*", "", normalized, flags=re.IGNORECASE)
    if not normalized:
        return None
    if normalize_whitespace(normalized).lower() in PLACEHOLDER_NAMES:
        return None
    return normalized


def normalize_ability_rarity(value: Any) -> str | None:
    normalized = normalize_whitespace(value)
    if not normalized:
        return None

    parsed = parse_integer(normalized)
    if parsed is not None and 1 <= parsed <= 9:
        return str(parsed)

    star_count = len(re.findall(r"[★☆⭐＊*]", normalized))
    if star_count > 0:
        return str(star_count)

    return normalized or None


def create_empty_record(source: str, *, image_value: str | None = None) -> dict[str, Any]:
    return {
        "id": build_draft_id(None, "アビリティ", source),
        "name": None,
        "characterName": None,
        "rarity": None,
        "cost": None,
        "equipmentType": "アビリティ",
        "sp": None,
        "element": None,
        "skillType": "アビリティ",
        "attackType": None,
        "breakGauge": None,
        "switchGauge": None,
        "cooldown": None,
        "skillName": None,
        "effect": None,
        "image": normalize_whitespace(image_value) or source,
    }


def normalize_record(
    raw_record: dict[str, Any] | None,
    source: str,
    *,
    image_value: str | None = None,
) -> dict[str, Any]:
    raw_record = raw_record if isinstance(raw_record, dict) else {}
    normalized_record = create_empty_record(source, image_value=image_value)

    name = normalize_ability_name(raw_record.get("name"))
    if name is None:
        fallback_name = normalize_ability_name(raw_record.get("skillName"))
        if fallback_name and "【" in fallback_name and "】" in fallback_name:
            name = fallback_name
    character_name = normalize_character_name_text(raw_record.get("characterName"))
    if character_name is None:
        character_name = extract_character_name_from_name(name)
    effect = normalize_ability_effect(raw_record.get("effect"))
    if effect is None:
        fallback_effect = normalize_ability_effect(raw_record.get("skillName"))
        if fallback_effect and "【" not in fallback_effect:
            effect = fallback_effect

    normalized_record.update(
        {
            "id": normalize_whitespace(raw_record.get("id"))
            or build_draft_id(None, "アビリティ", source),
            "name": name,
            "characterName": character_name,
            "rarity": normalize_ability_rarity(raw_record.get("rarity")),
            "cost": parse_integer(raw_record.get("cost")),
            "equipmentType": "アビリティ",
            "sp": None,
            "element": None,
            "skillType": "アビリティ",
            "attackType": None,
            "breakGauge": None,
            "switchGauge": None,
            "cooldown": None,
            "skillName": None,
            "effect": effect,
            "image": normalize_whitespace(image_value) or source,
        }
    )
    return normalized_record


def has_meaningful_data(row: dict[str, Any]) -> bool:
    return any(row.get(column) not in (None, "") for column in MEANINGFUL_COLUMNS)


def build_source_hints() -> dict[str, Any]:
    return {
        "equipmentType": "アビリティ",
        "skillType": "アビリティ",
    }


def build_gemini_contents(
    source: str,
    prompt_images: list[tuple[str, bytes]],
    *,
    include_prompt: bool = True,
) -> list[Any]:
    hint_lines = [
        "この解析はアビリティカード専用です。",
        "equipmentType=アビリティ, skillType=アビリティ, skillName=null は固定値です。",
        "name, rarity, cost, effect だけを画像から読んでください。",
    ]

    contents: list[Any] = []
    if include_prompt:
        contents.append(ABILITY_PROMPT)
    contents.extend(("\n".join(hint_lines), f"source: {source}"))
    for index, (label, image_part) in enumerate(prompt_images, start=1):
        contents.append(f"画像 {index}: {label}")
        contents.append({"mime_type": "image/png", "data": image_part})
    return contents


def analyze_image_with_gemini(
    model: genai.GenerativeModel,
    source: str,
    prompt_images: list[tuple[str, bytes]],
    *,
    include_prompt: bool = True,
) -> tuple[dict[str, Any], str]:
    response = model.generate_content(
        build_gemini_contents(
            source,
            prompt_images,
            include_prompt=include_prompt,
        ),
        generation_config={
            "temperature": 0,
            "response_mime_type": "application/json",
        },
    )
    raw_text = get_response_text(response)
    return extract_json_object(raw_text), raw_text


def build_analysis_signature(model_resolution: dict[str, Any]) -> str:
    signature_payload = {
        "version": ANALYSIS_SIGNATURE_VERSION,
        "resolvedModel": model_resolution.get("resolvedModel"),
        "prompt": ABILITY_PROMPT,
        "fixedFields": {
            "equipmentType": "アビリティ",
            "skillType": "アビリティ",
            "skillName": None,
            "sp": None,
            "element": None,
            "attackType": None,
            "breakGauge": None,
            "switchGauge": None,
            "cooldown": None,
            "effect": None,
        },
        "promptImages": [
            "カード全体",
            "タイトル帯",
            "レアリティ付近",
            "右側タブ領域",
            "下部ステータス領域",
            "スキルヘッダー領域",
            "属性アイコン枠",
            "攻撃属性アイコン枠",
            "右下アイコン領域",
        ],
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
    normalized_model_name = normalize_whitespace(model_name.removeprefix("models/"))

    try:
        for cached_content in genai.caching.CachedContent.list(page_size=100):
            if cached_content.display_name != cache_display_name:
                continue
            if normalize_whitespace(cached_content.model).removeprefix("models/") != normalized_model_name:
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
            contents=[ABILITY_PROMPT],
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
) -> dict[str, Any]:
    return normalize_record(candidate or {}, source, image_value=image_value)


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

            normalized_record = coerce_output_row(
                entry.get("normalizedRecord") if isinstance(entry.get("normalizedRecord"), dict) else None,
                source,
                image_value=normalize_whitespace(
                    entry.get("normalizedRecord", {}).get("image")
                    if isinstance(entry.get("normalizedRecord"), dict)
                    else ""
                ),
            )
            resume_entry = {
                "source": source,
                "status": status,
                "normalizedRecord": normalized_record,
                "rawRecord": entry.get("rawRecord") if isinstance(entry.get("rawRecord"), dict) else None,
                "rawResponseText": entry.get("rawResponseText"),
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
    source_hints = build_source_hints()
    debug_entry: dict[str, Any] = {
        "source": normalized_source,
        "status": "error",
        "modelResolution": model_resolution,
        "analysisSignature": analysis_signature,
        "sourceHints": source_hints,
    }

    try:
        image_bytes, _mime_type, normalized_analysis_source = load_image_bytes(analysis_source)
        normalized_image = normalize_image_for_analysis(image_bytes)
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
            ),
            debug_entry,
        )
    except Exception as error:
        row = create_empty_record(
            normalized_source,
            image_value=normalized_source,
        )
        debug_entry.update(
            {
                "analysisSource": analysis_source,
                "status": "error",
                "error": str(error),
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
            include_prompt=include_prompt,
        )
        row = normalize_record(
            raw_record,
            normalized_source,
            image_value=normalize_whitespace(prepared_source.get("imageValue")),
        )
        status = "ok" if has_meaningful_data(row) else "empty"
        debug_entry.update(
            {
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
        )
        debug_entry.update(
            {
                "status": "error",
                "error": str(error),
                "normalizedRecord": row,
            }
        )
        return row, debug_entry, None


def analyze_ability_images_to_dataframe(
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
            )
            debug_entry = {
                "source": normalized_source,
                "status": resumed_entry["status"],
                "modelResolution": model_resolution,
                "analysisSignature": analysis_signature,
                "sourceHints": build_source_hints(),
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
            source_spec,
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
                    image_value=normalize_whitespace(prepared_source.get("imageValue")),
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
        description="Analyze SAOIF ability card images with Gemini and export a CSV."
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
    data_frame = analyze_ability_images_to_dataframe(
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
