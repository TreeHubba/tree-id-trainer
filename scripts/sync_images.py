#!/usr/bin/env python3
"""Sync each species' `images` array in data/species.json with what's
actually sitting in its Pictures/ folder.

Each species' folder is derived from the directory of its first existing
image path (every species in data/species.json already has at least one
image, so this is always derivable -- no new field needed). For each
species, this script:
  - keeps existing image entries (in their current order) that still exist
    on disk
  - appends newly found image files (not already listed), sorted
    alphabetically
  - drops entries whose file no longer exists on disk (printed as removed)

Only the "images": [...] array on each species' line is rewritten in place
-- the rest of data/species.json (formatting, field order, blank-line
grouping) is left untouched.

By default this only PRINTS a diff (dry run). Pass --write to actually save
the changes to data/species.json.

Usage:
    python scripts/sync_images.py          # dry run, prints diff only
    python scripts/sync_images.py --write  # applies changes and saves

Workflow: drop new photos into the matching Pictures/<...>/ folder for a
species, then run this script with --write, then commit.
"""

import argparse
import json
import re
from pathlib import Path

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

ROOT = Path(__file__).resolve().parent.parent
SPECIES_JSON = ROOT / "data" / "species.json"

ID_RE = re.compile(r'"id":\s*"([^"]+)"')
IMAGES_RE = re.compile(r'"images":\s*\[[^\]]*\]')


def list_folder_images(folder: Path):
    if not folder.is_dir():
        return []
    return [
        f.name
        for f in folder.iterdir()
        if f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS
    ]


def sync_species(species):
    """Returns (new_images_list, added, removed)."""
    existing = species.get("images", [])
    if not existing:
        return existing, [], []

    folder_rel = str(Path(existing[0]).parent).replace("\\", "/")
    folder = ROOT / folder_rel

    on_disk_names = list_folder_images(folder)
    on_disk_paths = {f"{folder_rel}/{name}" for name in on_disk_names}

    kept = [img for img in existing if img in on_disk_paths]
    removed = [img for img in existing if img not in on_disk_paths]

    existing_names = {Path(img).name for img in existing}
    new_names = sorted(
        (name for name in on_disk_names if name not in existing_names),
        key=str.lower,
    )
    added = [f"{folder_rel}/{name}" for name in new_names]

    return kept + added, added, removed


def main():
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        "--write",
        action="store_true",
        help="Write changes back to data/species.json (default: dry run only).",
    )
    args = parser.parse_args()

    species_list = json.loads(SPECIES_JSON.read_text(encoding="utf-8"))
    lines = SPECIES_JSON.read_text(encoding="utf-8").splitlines(keepends=True)

    updates = {}
    any_changes = False
    for species in species_list:
        new_images, added, removed = sync_species(species)
        if added or removed:
            any_changes = True
            print(f"\n{species['commonName']} ({species['id']}):")
            for img in added:
                print(f"  + {img}")
            for img in removed:
                print(f"  - {img} (missing on disk)")
            updates[species["id"]] = new_images

    if not any_changes:
        print("No changes -- data/species.json already matches the Pictures/ folders.")
        return

    if not args.write:
        print("\nDry run only -- re-run with --write to save these changes.")
        return

    new_lines = []
    for line in lines:
        id_match = ID_RE.search(line)
        if id_match and id_match.group(1) in updates:
            images_json = json.dumps(updates[id_match.group(1)], ensure_ascii=False)
            line = IMAGES_RE.sub(f'"images": {images_json}', line, count=1)
        new_lines.append(line)

    SPECIES_JSON.write_text("".join(new_lines), encoding="utf-8")
    print("\nWrote updates to data/species.json")


if __name__ == "__main__":
    main()
