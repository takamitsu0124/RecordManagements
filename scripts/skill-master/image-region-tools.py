#!/usr/bin/env python3
import argparse
import collections
import json
import sys
from pathlib import Path

from PIL import Image


def clamp(value: int, lower: int, upper: int) -> int:
    return max(lower, min(value, upper))


def build_ratio_box(image: Image.Image, args):
    width, height = image.size
    left = clamp(int(width * args.left_ratio), 0, width)
    top = clamp(int(height * args.top_ratio), 0, height)
    right = clamp(int(width * args.right_ratio), 0, width)
    bottom = clamp(int(height * args.bottom_ratio), 0, height)

    if right <= left or bottom <= top:
        raise ValueError("Invalid ratio crop box.")

    return left, top, right, bottom


def command_crop(args):
    image = Image.open(args.src)
    box = build_ratio_box(image, args)
    crop = image.crop(box)
    Path(args.dst).parent.mkdir(parents=True, exist_ok=True)
    crop.save(args.dst)


def command_dominant_color(args):
    image = Image.open(args.src).convert("RGB")
    box = build_ratio_box(image, args)
    crop = image.crop(box)

    best = None

    for red, green, blue in crop.getdata():
        red_f = red / 255.0
        green_f = green / 255.0
        blue_f = blue / 255.0
        max_value = max(red_f, green_f, blue_f)
        min_value = min(red_f, green_f, blue_f)
        delta = max_value - min_value

        if max_value > args.max_value and delta < args.low_saturation_delta:
            continue
        if max_value < args.min_value:
            continue

        saturation = 0.0 if max_value == 0 else delta / max_value
        if saturation < args.min_saturation:
            continue

        if delta == 0:
            hue = 0.0
        elif max_value == red_f:
            hue = ((green_f - blue_f) / delta) % 6
        elif max_value == green_f:
            hue = ((blue_f - red_f) / delta) + 2
        else:
            hue = ((red_f - green_f) / delta) + 4
        hue /= 6.0

        score = saturation * max_value
        if best is None or score > best["score"]:
            best = {
                "score": score,
                "rgb": [red, green, blue],
                "h": hue,
                "s": saturation,
                "v": max_value,
            }

    if best is None:
        print(json.dumps({"found": False}))
        return

    print(
        json.dumps(
            {
                "found": True,
                "rgb": best["rgb"],
                "h": best["h"],
                "s": best["s"],
                "v": best["v"],
            }
        )
    )


def iter_connected_components(mask, width: int, height: int):
    seen = [[False for _ in range(width)] for _ in range(height)]

    for top in range(height):
        for left in range(width):
            if not mask[top][left] or seen[top][left]:
                continue

            queue = collections.deque([(left, top)])
            seen[top][left] = True
            points = []

            while queue:
                current_x, current_y = queue.popleft()
                points.append((current_x, current_y))

                for next_x, next_y in (
                    (current_x + 1, current_y),
                    (current_x - 1, current_y),
                    (current_x, current_y + 1),
                    (current_x, current_y - 1),
                ):
                    if next_x < 0 or next_x >= width or next_y < 0 or next_y >= height:
                        continue
                    if not mask[next_y][next_x] or seen[next_y][next_x]:
                        continue
                    seen[next_y][next_x] = True
                    queue.append((next_x, next_y))

            xs = [point[0] for point in points]
            ys = [point[1] for point in points]
            yield {
                "left": min(xs),
                "top": min(ys),
                "right": max(xs),
                "bottom": max(ys),
                "width": max(xs) - min(xs) + 1,
                "height": max(ys) - min(ys) + 1,
                "area": len(points),
            }


def command_count_stars(args):
    image = Image.open(args.src).convert("L")
    box = build_ratio_box(image, args)
    crop = image.crop(box)
    width, height = crop.size
    pixels = crop.load()

    mask = [
        [pixels[x, y] >= args.threshold for x in range(width)]
        for y in range(height)
    ]

    candidates = []
    for component in iter_connected_components(mask, width, height):
        if component["area"] < args.min_area or component["area"] > args.max_area:
            continue
        if component["width"] < args.min_width or component["width"] > args.max_width:
            continue
        if component["height"] < args.min_height or component["height"] > args.max_height:
            continue
        candidates.append(component)

    rows = []
    for component in sorted(candidates, key=lambda item: (item["top"], item["left"])):
        matched_row = None
        for row in rows:
            if abs(component["top"] - row["top"]) <= args.row_tolerance:
                matched_row = row
                break

        if matched_row is None:
            matched_row = {
                "top": component["top"],
                "components": [],
            }
            rows.append(matched_row)

        matched_row["components"].append(component)

    best_components = []
    for row in rows:
        deduped = []
        for component in sorted(row["components"], key=lambda item: item["left"]):
            if deduped and component["left"] - deduped[-1]["left"] < args.min_gap:
                if component["area"] > deduped[-1]["area"]:
                    deduped[-1] = component
                continue
            deduped.append(component)

        if len(deduped) < args.min_count:
            continue

        if len(deduped) > len(best_components):
            best_components = deduped
            continue

        if len(deduped) == len(best_components):
            if sum(item["area"] for item in deduped) > sum(
                item["area"] for item in best_components
            ):
                best_components = deduped

    print(
        json.dumps(
            {
                "count": len(best_components),
                "components": best_components,
            }
        )
    )


def main():
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    crop_parser = subparsers.add_parser("crop")
    crop_parser.add_argument("--src", required=True)
    crop_parser.add_argument("--dst", required=True)
    crop_parser.add_argument("--left-ratio", type=float, required=True)
    crop_parser.add_argument("--top-ratio", type=float, required=True)
    crop_parser.add_argument("--right-ratio", type=float, required=True)
    crop_parser.add_argument("--bottom-ratio", type=float, required=True)
    crop_parser.set_defaults(handler=command_crop)

    color_parser = subparsers.add_parser("dominant-color")
    color_parser.add_argument("--src", required=True)
    color_parser.add_argument("--left-ratio", type=float, required=True)
    color_parser.add_argument("--top-ratio", type=float, required=True)
    color_parser.add_argument("--right-ratio", type=float, required=True)
    color_parser.add_argument("--bottom-ratio", type=float, required=True)
    color_parser.add_argument("--min-saturation", type=float, default=0.18)
    color_parser.add_argument("--min-value", type=float, default=0.18)
    color_parser.add_argument("--max-value", type=float, default=0.97)
    color_parser.add_argument("--low-saturation-delta", type=float, default=0.10)
    color_parser.set_defaults(handler=command_dominant_color)

    count_stars_parser = subparsers.add_parser("count-stars")
    count_stars_parser.add_argument("--src", required=True)
    count_stars_parser.add_argument("--left-ratio", type=float, required=True)
    count_stars_parser.add_argument("--top-ratio", type=float, required=True)
    count_stars_parser.add_argument("--right-ratio", type=float, required=True)
    count_stars_parser.add_argument("--bottom-ratio", type=float, required=True)
    count_stars_parser.add_argument("--threshold", type=int, default=170)
    count_stars_parser.add_argument("--min-area", type=int, default=40)
    count_stars_parser.add_argument("--max-area", type=int, default=1000)
    count_stars_parser.add_argument("--min-width", type=int, default=8)
    count_stars_parser.add_argument("--max-width", type=int, default=45)
    count_stars_parser.add_argument("--min-height", type=int, default=8)
    count_stars_parser.add_argument("--max-height", type=int, default=45)
    count_stars_parser.add_argument("--row-tolerance", type=int, default=4)
    count_stars_parser.add_argument("--min-gap", type=int, default=18)
    count_stars_parser.add_argument("--min-count", type=int, default=2)
    count_stars_parser.set_defaults(handler=command_count_stars)

    args = parser.parse_args()
    args.handler(args)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
