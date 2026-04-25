#!/usr/bin/env python3
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw


DEFAULT_IMAGE_ROOT = "./scripts/skill-master/source-images"
TITLE_CROP_RATIOS = {"left": 0.0, "top": 0.0, "right": 1.0, "bottom": 0.24}
RARITY_REGION_RATIOS = {"left": 0.62, "top": 0.08, "right": 0.88, "bottom": 0.26}
ATTR_REGION_RATIOS = {"left": 0.70, "top": 0.30, "right": 0.97, "bottom": 0.88}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tif", ".tiff", ".avif"}


def normalize_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "").replace("\u3000", " ").strip())


def normalize_lookup_key(value: str) -> str:
    return re.sub(r"[\s_()/:.-]", "", normalize_whitespace(value).lower())


def contains_japanese_text(value: str) -> bool:
    return re.search(r"[一-龥ぁ-んァ-ヶ]", str(value or "")) is not None


def sanitize_output_fragment(value: str) -> str:
    normalized = normalize_whitespace(value).lower()
    normalized = re.sub(r"[^a-z0-9._-]+", "-", normalized)
    return normalized.strip("-")


def should_insert_space_between_tokens(left: str, right: str) -> bool:
    if not left or not right:
        return False
    if re.search(r"[【「『（(]$", left):
        return False
    if re.match(r"^[】」』）)、。・:：%)]", right):
        return False
    if contains_japanese_text(left) or contains_japanese_text(right):
        return False
    return True


def resolve_runtime_paths(args):
    image_root = Path(args.image_root).resolve()
    folder_name = normalize_whitespace(args.folder)
    input_dir = image_root / folder_name if folder_name else Path(args.input_dir).resolve()
    output_dir = (
        Path(args.output_dir).resolve()
        if args.output_dir
        else Path("tmp").resolve()
        / f"skill-master.ocr-regions.{sanitize_output_fragment(folder_name or input_dir.name)}"
    )
    return image_root, input_dir, output_dir


def walk_images(directory_path: Path):
    return sorted(
        path
        for path in directory_path.rglob("*")
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    )


def build_ratio_box(image_size, ratios):
    width, height = image_size
    left = max(0, min(width, int(width * ratios["left"])))
    top = max(0, min(height, int(height * ratios["top"])))
    right = max(0, min(width, int(width * ratios["right"])))
    bottom = max(0, min(height, int(height * ratios["bottom"])))
    return {
        "left": left,
        "top": top,
        "right": right,
        "bottom": bottom,
        "width": right - left,
        "height": bottom - top,
    }


def parse_tesseract_tsv(tsv_text: str):
    rows = [row for row in tsv_text.replace("\r", "").split("\n") if row]
    if not rows:
        return {"image_size": {"width": 0, "height": 0}, "line_boxes": []}

    headers = rows[0].split("\t")
    header_index = {name: index for index, name in enumerate(headers)}
    image_width = 0
    image_height = 0
    line_groups = {}

    for row in rows[1:]:
        columns = row.split("\t")
        if len(columns) < len(headers):
            continue
        level = int(columns[header_index["level"]] or "0")
        if level == 1:
            image_width = int(columns[header_index["width"]] or image_width)
            image_height = int(columns[header_index["height"]] or image_height)
            continue
        text = normalize_whitespace(columns[header_index["text"]])
        if not text:
            continue
        key = ":".join(
            columns[header_index[name]]
            for name in ("page_num", "block_num", "par_num", "line_num")
        )
        line_groups.setdefault(key, []).append(
            {
                "text": text,
                "left": int(columns[header_index["left"]] or "0"),
                "top": int(columns[header_index["top"]] or "0"),
                "width": int(columns[header_index["width"]] or "0"),
                "height": int(columns[header_index["height"]] or "0"),
            }
        )

    line_boxes = []
    for words in line_groups.values():
        words = sorted(words, key=lambda item: item["left"])
        left = min(word["left"] for word in words)
        top = min(word["top"] for word in words)
        right = max(word["left"] + word["width"] for word in words)
        bottom = max(word["top"] + word["height"] for word in words)
        text = ""
        for index, word in enumerate(words):
            if index == 0:
                text = word["text"]
            else:
                text = f"{text}{' ' if should_insert_space_between_tokens(words[index - 1]['text'], word['text']) else ''}{word['text']}"
        line_boxes.append(
            {
                "text": normalize_whitespace(text),
                "words": words,
                "left": left,
                "top": top,
                "right": right,
                "bottom": bottom,
                "width": right - left,
                "height": bottom - top,
            }
        )

    line_boxes.sort(key=lambda item: (item["top"], item["left"]))
    return {"image_size": {"width": image_width, "height": image_height}, "line_boxes": line_boxes}


def run_structured_ocr(file_path: Path, lang: str, psm: int):
    result = subprocess.run(
        [
            "tesseract",
            str(file_path),
            "stdout",
            "-l",
            lang,
            "--psm",
            str(psm),
            "tsv",
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return parse_tesseract_tsv(result.stdout)


def line_box_lookup_key(line_box) -> str:
    return normalize_lookup_key(line_box.get("text", ""))


def find_line_boxes_by_lookup_includes(
    line_boxes,
    lookup_includes,
    image_size,
    top_min_ratio=0.0,
    top_max_ratio=1.0,
    left_min_ratio=0.0,
    exclude_lookup_includes=None,
):
    exclude_lookup_includes = exclude_lookup_includes or []
    results = []
    for line_box in line_boxes:
        top_ratio = line_box["top"] / image_size["height"] if image_size["height"] else 0
        left_ratio = line_box["left"] / image_size["width"] if image_size["width"] else 0
        lookup_key = line_box_lookup_key(line_box)
        if top_ratio < top_min_ratio or top_ratio > top_max_ratio:
            continue
        if left_ratio < left_min_ratio:
            continue
        if any(value in lookup_key for value in exclude_lookup_includes):
            continue
        if any(value in lookup_key for value in lookup_includes):
            results.append(line_box)
    return results


def normalize_integer_string(value, minimum=-10**9, maximum=10**9):
    matched = re.search(r"[+-]?\d+(?:\.\d+)?", str(value or "").replace(",", ""))
    if not matched:
        return ""
    parsed = int(float(matched.group(0)))
    if parsed < minimum or parsed > maximum:
        return ""
    return str(parsed)


def find_label_value_boxes(
    line_boxes,
    image_size,
    label_includes,
    exclude_label_includes=None,
    top_min_ratio=0.0,
    top_max_ratio=1.0,
    left_min_ratio=0.0,
    minimum=-10**9,
    maximum=10**9,
    same_row_tolerance=14,
    max_y_offset=56,
    max_x_distance=260,
):
    labels = find_line_boxes_by_lookup_includes(
        line_boxes,
        label_includes,
        image_size,
        top_min_ratio=top_min_ratio,
        top_max_ratio=top_max_ratio,
        left_min_ratio=left_min_ratio,
        exclude_lookup_includes=exclude_label_includes or [],
    )
    for label in labels:
        candidates = [label]
        for line_box in line_boxes:
            if line_box is label:
                continue
            if line_box["left"] < label["left"] - 40:
                continue
            if line_box["left"] > label["right"] + max_x_distance:
                continue
            if line_box["top"] < label["top"] - same_row_tolerance:
                continue
            if line_box["top"] > label["bottom"] + max_y_offset:
                continue
            candidates.append(line_box)

        candidates.sort(key=lambda item: (abs(item["top"] - label["top"]), item["left"]))
        for candidate in candidates:
            if normalize_integer_string(candidate["text"], minimum=minimum, maximum=maximum):
                return {"label": label, "value": candidate}
    return None


def score_name_line(line: str, index: int, source: str = "full") -> int:
    normalized_line = normalize_whitespace(line)
    lookup_key = normalize_lookup_key(normalized_line)
    japanese_char_count = len(re.findall(r"[一-龥ぁ-んァ-ヶ]", normalized_line))

    if not normalized_line or lookup_key in {"cool", "ct", "sw", "switch", "br", "burst"}:
        return -100
    if re.match(r"^(cool|ct|sw|switch|br|burst|属性|type)\b", normalized_line, re.IGNORECASE):
        return -100
    if re.match(r"^(?:\[|【)?(?:追加効果|前方|中範囲|発動条件|消費|属性|防御|ダメージ|限界突破数|装備タイプ|備タイプ)", normalized_line):
        return -100
    if re.match(r"^[0-9]+(?:\.[0-9]+)?%?$", normalized_line):
        return -100

    score = 0
    if japanese_char_count > 0:
        score += 5
    score += min(6, japanese_char_count)
    if re.search(r"[A-Za-z]", normalized_line):
        score += 2
    if 3 <= len(normalized_line) <= 32:
        score += 3
    if 6 <= len(normalized_line) <= 18:
        score += 3
    if not re.search(r"[0-9]", normalized_line):
        score += 2
    if re.search(r"[【】]", normalized_line):
        score += 10
    if re.search(r"[「」]", normalized_line):
        score += 2
    if re.search(r"】\s*[A-Za-z0-9一-龥ぁ-んァ-ヶ]", normalized_line):
        score += 6
    if re.search(r"【.*】", normalized_line):
        score += 8
    if index == 0:
        score += 2
    if index <= 2:
        score += 1
    if source == "title":
        score += 4
    if len(normalized_line) > 40:
        score -= 3
    if re.search(r"[,:/]", normalized_line):
        score -= 2
    if re.search(r"[@\\_=><]", normalized_line):
        score -= 5
    if re.search(r"^[~\-./\\]", normalized_line):
        score -= 6
    return score


def find_name_line_box(line_boxes, image_size):
    candidates = []
    for index, line_box in enumerate(line_boxes):
        left_ratio = line_box["left"] / image_size["width"] if image_size["width"] else 0
        top_ratio = line_box["top"] / image_size["height"] if image_size["height"] else 0
        if left_ratio < 0.68 or top_ratio > 0.16:
            continue
        score = (
            score_name_line(line_box["text"], index, "title")
            + (8 if re.search(r"[【】]", line_box["text"]) else 0)
            + (4 if contains_japanese_text(line_box["text"]) else -8)
        )
        if score > 0:
            candidates.append((score, line_box))
    candidates.sort(key=lambda item: (-item[0], item[1]["top"]))
    return candidates[0][1] if candidates else None


def find_skill_name_line_boxes(line_boxes, image_size):
    label_lines = find_line_boxes_by_lookup_includes(
        line_boxes,
        ["消費", "肖費", "消費sp", "sp消費", "消費p", "消費5p"],
        image_size,
        top_min_ratio=0.26,
        top_max_ratio=0.72,
        left_min_ratio=0.68,
    )
    candidates = []
    for label_line in label_lines:
        for line_box in line_boxes:
            if line_box is label_line:
                continue
            if line_box["bottom"] > label_line["top"]:
                continue
            if label_line["top"] - line_box["bottom"] > 96:
                continue
            if line_box["left"] < label_line["left"] - 140:
                continue
            if line_box["right"] < label_line["left"] - 60:
                continue
            normalized_text = normalize_whitespace(line_box["text"])
            if re.match(r"^(?:cost|cool|switch|break|exp|skill|装備|備タイプ|属性|発動条件|追加効果|前方|中範囲)", normalized_text, re.IGNORECASE):
                continue
            if re.search(r"[%0-9]{3,}", normalized_text):
                continue
            candidates.append(
                {
                    "line_box": line_box,
                    "gap": label_line["top"] - line_box["bottom"],
                    "left": line_box["left"],
                }
            )
    candidates.sort(key=lambda item: (item["gap"], -item["left"], item["line_box"]["top"]))
    return [item["line_box"] for item in candidates]


def find_equipment_type_boxes(line_boxes, image_size):
    labels = find_line_boxes_by_lookup_includes(
        line_boxes,
        ["装備タイプ", "備タイプ"],
        image_size,
        top_min_ratio=0.20,
        top_max_ratio=0.40,
        left_min_ratio=0.68,
    )
    for label in labels:
        candidates = [
            line_box
            for line_box in line_boxes
            if line_box is not label
            and line_box["left"] >= label["left"] - 40
            and line_box["left"] <= label["right"] + 200
            and line_box["top"] >= label["top"] - 12
            and line_box["top"] <= label["bottom"] + 60
        ]
        candidates.sort(key=lambda item: (abs(item["top"] - label["bottom"]), item["left"]))
        for candidate in candidates:
            if candidate["text"] != label["text"]:
                return {"label": label, "value": candidate}
    return None


def create_annotations(image_size, line_boxes):
    annotations = [
        {"label": "TITLE-CROP", "color": (38, 99, 235), "box": build_ratio_box((image_size["width"], image_size["height"]), TITLE_CROP_RATIOS)},
        {"label": "RARITY", "color": (245, 158, 11), "box": build_ratio_box((image_size["width"], image_size["height"]), RARITY_REGION_RATIOS)},
        {"label": "ATTR", "color": (6, 182, 212), "box": build_ratio_box((image_size["width"], image_size["height"]), ATTR_REGION_RATIOS)},
    ]

    name_line = find_name_line_box(line_boxes, image_size)
    if name_line:
        annotations.append({"label": "NAME", "color": (34, 197, 94), "box": name_line})

    for index, line_box in enumerate(find_skill_name_line_boxes(line_boxes, image_size)[:5], start=1):
        annotations.append(
            {
                "label": f"SKILL-{index}",
                "color": (239, 68, 68) if index == 1 else (249, 115, 22),
                "box": line_box,
            }
        )

    pairs = [
        (
            "COST",
            find_label_value_boxes(
                line_boxes,
                image_size,
                ["cost", "cast"],
                top_min_ratio=0.0,
                top_max_ratio=0.18,
                left_min_ratio=0.70,
                minimum=1,
                maximum=120,
                same_row_tolerance=12,
                max_y_offset=12,
                max_x_distance=180,
            ),
            (168, 85, 247),
        ),
        (
            "COOLDOWN",
            find_label_value_boxes(
                line_boxes,
                image_size,
                ["skillcooltime", "cooltime"],
                exclude_label_includes=["burst"],
                top_min_ratio=0.04,
                top_max_ratio=0.24,
                left_min_ratio=0.70,
                minimum=1,
                maximum=300,
                same_row_tolerance=12,
                max_y_offset=12,
                max_x_distance=180,
            ),
            (16, 185, 129),
        ),
        (
            "SP",
            find_label_value_boxes(
                line_boxes,
                image_size,
                ["消費", "肖費", "消費sp", "sp消費", "消費p", "消費5p"],
                top_min_ratio=0.26,
                top_max_ratio=0.72,
                left_min_ratio=0.68,
                minimum=0,
                maximum=100,
                same_row_tolerance=18,
                max_y_offset=32,
                max_x_distance=160,
            ),
            (225, 29, 72),
        ),
        (
            "SWITCH",
            find_label_value_boxes(
                line_boxes,
                image_size,
                ["switchgauge"],
                exclude_label_includes=["burst"],
                top_min_ratio=0.04,
                top_max_ratio=0.26,
                left_min_ratio=0.70,
                minimum=-999,
                maximum=999,
                same_row_tolerance=12,
                max_y_offset=12,
                max_x_distance=180,
            ),
            (20, 184, 166),
        ),
        (
            "BREAK",
            find_label_value_boxes(
                line_boxes,
                image_size,
                ["breakgauge"],
                exclude_label_includes=["burst"],
                top_min_ratio=0.04,
                top_max_ratio=0.28,
                left_min_ratio=0.70,
                minimum=-999,
                maximum=999,
                same_row_tolerance=12,
                max_y_offset=18,
                max_x_distance=180,
            ),
            (14, 165, 233),
        ),
        ("TYPE", find_equipment_type_boxes(line_boxes, image_size), (99, 102, 241)),
    ]

    for prefix, pair, color in pairs:
        if not pair:
            continue
        annotations.append({"label": f"{prefix}-LABEL", "color": color, "box": pair["label"]})
        annotations.append({"label": f"{prefix}-VALUE", "color": color, "box": pair["value"]})

    return annotations


def draw_labeled_box(draw, box, color, label, width=3, fill_alpha=38):
    shape = (box["left"], box["top"], box["right"], box["bottom"])
    draw.rectangle(shape, outline=color, width=width, fill=color + (fill_alpha,))
    label_x = box["left"] + 4
    label_y = max(0, box["top"] - 14)
    draw.rectangle((label_x - 2, label_y - 1, label_x + max(34, len(label) * 8), label_y + 12), fill=(255, 255, 255, 220))
    draw.text((label_x, label_y), label, fill=color)


def export_annotation_image(file_path: Path, output_path: Path, annotations):
    image = Image.open(file_path).convert("RGBA")
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay, "RGBA")

    for annotation in annotations:
        draw_labeled_box(
            draw,
            annotation["box"],
            annotation["color"],
            annotation["label"],
            width=4 if annotation["label"] in {"NAME", "SKILL-1"} else 3,
        )

    legend_height = 18 * (len(annotations) + 2)
    draw.rectangle((12, 12, 360, 12 + legend_height), fill=(255, 255, 255, 190))
    draw.text((20, 18), f"{file_path.name} OCR regions", fill=(0, 0, 0))
    for index, annotation in enumerate(annotations, start=1):
        y = 18 + index * 18
        draw.rectangle((20, y + 2, 30, y + 12), fill=annotation["color"] + (255,))
        draw.text((38, y), annotation["label"], fill=(0, 0, 0))

    annotated = Image.alpha_composite(image, overlay).convert("RGB")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    annotated.save(output_path)


def annotation_to_jsonable(annotation, image_size):
    box = annotation["box"]
    return {
        "label": annotation["label"],
        "left": box["left"],
        "top": box["top"],
        "right": box["right"],
        "bottom": box["bottom"],
        "leftRatio": round(box["left"] / image_size["width"], 4) if image_size["width"] else 0,
        "topRatio": round(box["top"] / image_size["height"], 4) if image_size["height"] else 0,
        "rightRatio": round(box["right"] / image_size["width"], 4) if image_size["width"] else 0,
        "bottomRatio": round(box["bottom"] / image_size["height"], 4) if image_size["height"] else 0,
        "text": box.get("text", ""),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--folder", default="")
    parser.add_argument("--input-dir", default=DEFAULT_IMAGE_ROOT)
    parser.add_argument("--image-root", default=DEFAULT_IMAGE_ROOT)
    parser.add_argument("--output-dir", default="")
    parser.add_argument("--lang", default="jpn+eng")
    parser.add_argument("--psm", type=int, default=11)
    args = parser.parse_args()

    _, input_dir, output_dir = resolve_runtime_paths(args)
    if not input_dir.exists():
        raise FileNotFoundError(f"Input dir not found: {input_dir}")

    image_files = walk_images(input_dir)
    if not image_files:
        raise FileNotFoundError(f"No image files found under {input_dir}")

    manifest = []
    for file_path in image_files:
        ocr = run_structured_ocr(file_path, args.lang, args.psm)
        annotations = create_annotations(ocr["image_size"], ocr["line_boxes"])
        relative_path = file_path.relative_to(input_dir)
        output_path = output_dir / relative_path.with_suffix(".annotated.png")
        export_annotation_image(file_path, output_path, annotations)
        manifest.append(
            {
                "file": str(relative_path),
                "output": str(output_path),
                "annotations": [
                    annotation_to_jsonable(annotation, ocr["image_size"])
                    for annotation in annotations
                ],
            }
        )

    output_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = output_dir / "annotations.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")

    print(f"Input dir: {input_dir}")
    print(f"Output dir: {output_dir}")
    print(f"Images: {len(image_files)}")
    print(f"Manifest: {manifest_path}")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
