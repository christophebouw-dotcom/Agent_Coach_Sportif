#!/usr/bin/env python3
"""Hook UserPromptSubmit : demande à Claude d'analyser chaque prompt en JSON.

Désactivation : créer le fichier .claude/prompt-to-json.off
Contournement ponctuel : commencer le prompt par « !brut ».
"""
import json
import os
import sys

project_dir = os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd())
if os.path.exists(os.path.join(project_dir, ".claude", "prompt-to-json.off")):
    sys.exit(0)

try:
    prompt = json.load(sys.stdin).get("prompt", "")
except (json.JSONDecodeError, AttributeError):
    sys.exit(0)

stripped = prompt.strip()
# Les commandes slash et les prompts marqués « !brut » ne sont pas analysés.
if not stripped or stripped.startswith("/") or stripped.lower().startswith("!brut"):
    sys.exit(0)

print(
    "MODE PROMPT → JSON ACTIF. Avant toute autre action, analyse le prompt de "
    "l'utilisateur selon le schéma défini dans .claude/agents/prompt-to-json.md "
    "et affiche le résultat dans un bloc ```json. Ensuite seulement, réponds à la "
    "demande en t'appuyant sur cette analyse. Si le JSON révèle une ambiguïté "
    "bloquante, pose les questions de clarification au lieu d'agir."
)
