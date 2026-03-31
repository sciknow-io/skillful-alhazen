#!/usr/bin/env python3
"""
Install a skill from a zip bundle created by scripts/package_skill.py.

Usage:
    uv run python scripts/install_skill.py <zip-path> [--force]

Extracts the zip to local_skills/<name>/ and appends an entry to
skills-registry-local.yaml so the skill is recognized by make build-skills.
The Makefile install-skill target handles wiring, schema loading, and
skill-builder KG import after this script runs.
"""

import argparse
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description="Install a skill from a zip bundle")
    parser.add_argument("zip_path", help="Path to the skill zip file")
    parser.add_argument("--force", action="store_true",
                        help="Overwrite existing skill directory without prompting")
    args = parser.parse_args()

    zip_path = Path(args.zip_path).resolve()
    if not zip_path.exists():
        print(f"Error: zip file not found: {zip_path}", file=sys.stderr)
        sys.exit(1)

    repo_root = Path(__file__).resolve().parents[1]

    # Extract to temp dir and read skill.yaml
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        with zipfile.ZipFile(zip_path) as zf:
            zf.extractall(tmp)

        skill_yaml_path = tmp / "skill.yaml"
        if not skill_yaml_path.exists():
            print("Error: zip does not contain skill.yaml", file=sys.stderr)
            sys.exit(1)

        try:
            import yaml
            skill_meta = yaml.safe_load(skill_yaml_path.read_text())
        except ImportError:
            print("Error: PyYAML not available. Run: uv sync --all-extras", file=sys.stderr)
            sys.exit(1)

        skill_name = skill_meta.get("name")
        if not skill_name:
            print("Error: skill.yaml is missing 'name:' field", file=sys.stderr)
            sys.exit(1)

        dest = repo_root / "local_skills" / skill_name

        # Handle existing installation
        if dest.exists() or dest.is_symlink():
            if dest.is_symlink():
                print(f"  Removing existing symlink: local_skills/{skill_name}")
                dest.unlink()
            elif args.force:
                print(f"  Removing existing directory: local_skills/{skill_name}")
                shutil.rmtree(dest)
            else:
                print(f"Error: local_skills/{skill_name}/ already exists.")
                print(f"  Use --force to overwrite, or remove it manually first.")
                sys.exit(1)

        # Copy extracted skill to local_skills/
        shutil.copytree(tmp, dest)
        print(f"  ✓ Extracted to local_skills/{skill_name}/")

    # Register in skills-registry-local.yaml
    local_reg_path = repo_root / "skills-registry-local.yaml"
    skill_entry = f"  - name: {skill_name}\n    path: local_skills/{skill_name}\n"

    if local_reg_path.exists():
        content = local_reg_path.read_text()
        if f"name: {skill_name}" in content:
            print(f"  ✓ Already in skills-registry-local.yaml (skipping)")
        else:
            # Append to existing file
            if not content.endswith("\n"):
                content += "\n"
            if "skills:" not in content:
                content += "skills:\n"
            content += skill_entry
            local_reg_path.write_text(content)
            print(f"  ✓ Added to skills-registry-local.yaml")
    else:
        local_reg_path.write_text(f"skills:\n{skill_entry}")
        print(f"  ✓ Created skills-registry-local.yaml")

    print(f"\n✓ Skill '{skill_name}' installed.")
    print(f"  Next steps (handled automatically by 'make install-skill'):")
    print(f"    make deploy-claude           # wire .claude/skills/ symlink")
    print(f"    make db-init                 # load schema into TypeDB")
    print(f"    # import skill-builder KG if data/skill_builder.json exists")


if __name__ == "__main__":
    main()
