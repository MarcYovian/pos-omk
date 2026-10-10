#!/usr/bin/env bash
# Cross-platform installer for qa-doc-suite
set -e

SKILL_NAME="qa-doc-suite"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TARGET_DIR="$HOME/.gemini/config/skills/$SKILL_NAME"
mkdir -p "$TARGET_DIR"
cp -R "$SOURCE_DIR/"* "$TARGET_DIR/"

mkdir -p "$HOME/.agents/skills"
ln -sf "$TARGET_DIR" "$HOME/.agents/skills/$SKILL_NAME"

echo "Installed $SKILL_NAME successfully to $TARGET_DIR and linked to ~/.agents/skills/"
