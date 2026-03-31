#!/usr/bin/env python3
"""
Package a skill as a distributable zip bundle.

Usage:
    uv run python scripts/package_skill.py <skill-name> [--output <dir>]

The zip contains all skill files plus a skill_builder KG snapshot in data/.
"""

import argparse
import json
import os
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

EXCLUDE_PATTERNS = {"__pycache__", ".git", "*.pyc", ".DS_Store", "node_modules"}


def should_exclude(path: Path) -> bool:
    for part in path.parts:
        if part in EXCLUDE_PATTERNS:
            return True
        if part.endswith(".pyc"):
            return True
    return False


def main():
    parser = argparse.ArgumentParser(description="Package a skill as a distributable zip bundle")
    parser.add_argument("skill", help="Skill name (must exist in local_skills/)")
    parser.add_argument("--output", default=".", help="Output directory (default: current dir)")
    args = parser.parse_args()

    skill_name = args.skill
    repo_root = Path(__file__).resolve().parents[1]
    skill_dir = repo_root / "local_skills" / skill_name

    if not skill_dir.exists():
        print(f"Error: local_skills/{skill_name}/ not found. Run 'make build-skills' first.",
              file=sys.stderr)
        sys.exit(1)

    # Resolve symlinks to get real path
    real_skill_dir = skill_dir.resolve()
    skill_yaml_path = real_skill_dir / "skill.yaml"
    if not skill_yaml_path.exists():
        print(f"Error: {skill_name}/skill.yaml not found.", file=sys.stderr)
        sys.exit(1)

    # Read version from skill.yaml
    try:
        import yaml
        skill_meta = yaml.safe_load(skill_yaml_path.read_text())
    except ImportError:
        print("Error: PyYAML not available. Run: uv sync --all-extras", file=sys.stderr)
        sys.exit(1)

    version = (skill_meta.get("bundle") or {}).get("version", "1.0")
    zip_name = f"{skill_name}-v{version}.zip"
    output_dir = Path(args.output).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    zip_path = output_dir / zip_name

    # Export skill-builder KG snapshot
    skill_builder_script = repo_root / ".claude" / "skills" / "skill-builder" / "skill_builder.py"
    kg_snapshot = None

    if skill_builder_script.exists():
        print(f"  Exporting skill-builder KG for '{skill_name}'...")
        try:
            result = subprocess.run(
                ["uv", "run", "python", str(skill_builder_script),
                 "export-skill-data", "--skill", skill_name],
                capture_output=True, text=True, cwd=str(repo_root), timeout=30,
            )
            if result.returncode == 0:
                data = json.loads(result.stdout)
                if data.get("success"):
                    kg_snapshot = result.stdout
                    domain_count = len(data.get("domains", []))
                    print(f"  ✓ Exported {domain_count} domain(s) from skill-builder KG")
                else:
                    print(f"  Warning: export-skill-data returned: {data}", file=sys.stderr)
            else:
                print(f"  Warning: export-skill-data failed (stderr): {result.stderr[:200]}",
                      file=sys.stderr)
        except Exception as e:
            print(f"  Warning: could not export skill-builder KG: {e}", file=sys.stderr)
    else:
        print("  Warning: skill-builder not found — skipping KG snapshot", file=sys.stderr)

    # Assemble zip
    print(f"  Assembling {zip_name}...")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for item in sorted(real_skill_dir.rglob("*")):
            if should_exclude(item.relative_to(real_skill_dir)):
                continue
            if item.is_file():
                arcname = item.relative_to(real_skill_dir)
                zf.write(item, arcname)

        if kg_snapshot:
            zf.writestr("data/skill_builder.json", kg_snapshot)

    print(f"✓ Packaged: {zip_path}")
    return str(zip_path)


if __name__ == "__main__":
    main()
