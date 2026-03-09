"""
rag/afirm_matcher.py
====================
Match retrieved chunks against AFIRM evidence-based interventions.

After retrieval, checks which AFIRM therapy names/abbreviations appear in
the retrieved text. Matched modules are included as structured context in
the generation prompt, linking unstructured guideline evidence to known EBPs.
"""

from __future__ import annotations

import json
import logging
import re
from typing import List, Optional

log = logging.getLogger(__name__)

AFIRM_PATH = "data/afirm_modules.json"

# Mapping of common abbreviations / alternate names to therapy names.
# Built from the AFIRM module data to catch mentions like "AAC", "DTT", etc.
_ABBREVIATION_MAP = {
    "ABI":  "Antecedent-Based Interventions",
    "AAC":  "Augmentative & Alternative Communication",
    "ASI":  "Ayres Sensory Integration",
    "BMI":  "Behavioral Momentum Intervention",
    "CBIS": "Cognitive Behavioral/Instructional Strategies",
    "DR":   "Differential Reinforcement",
    "DI":   "Direct Instruction",
    "DTT":  "Discrete Trial Training",
    "EXM":  "Exercise & Movement",
    "EXT":  "Extinction",
    "FBA":  "Functional Behavioral Assessment",
    "FCT":  "Functional Communication Training",
    "MD":   "Modeling",
    "MMI":  "Music-Mediated Intervention",
    "NI":   "Naturalistic Interventions",
    "PII":  "Parent-Implemented Intervention",
    "PBII": "Peer-Based Instruction & Intervention",
    "PP":   "Prompting",
    "R":    "Reinforcement",
    "RIR":  "Response Interruption & Redirection",
    "SM":   "Self-Management",
    "SN":   "Social Narratives",
    "SST":  "Social Skills Training",
    "TA":   "Task Analysis",
    "TAII": "Technology-Aided Instruction & Intervention",
    "TD":   "Time Delay",
    "VM":   "Video Modeling",
    "VS":   "Visual Supports",
}


def load_afirm_modules(path: str = AFIRM_PATH) -> List[dict]:
    """Load AFIRM intervention modules from JSON."""
    try:
        with open(path, "r") as fh:
            return json.load(fh)
    except FileNotFoundError:
        log.warning("AFIRM modules not found at '%s'.", path)
        return []


def match_afirm_to_chunks(
    retrieved_chunks: List[dict],
    age: Optional[int] = None,
    afirm_path: str = AFIRM_PATH,
) -> List[dict]:
    """
    Match retrieved chunks against AFIRM interventions.

    Checks if any AFIRM therapy name or abbreviation appears in the
    retrieved chunk text. Returns matched AFIRM modules filtered by
    age appropriateness.

    Parameters
    ----------
    retrieved_chunks : list[dict] — retrieved result dicts with "text" key
    age              : int | None — child's age for filtering
    afirm_path       : str        — path to afirm_modules.json

    Returns
    -------
    list[dict] — matched AFIRM modules with added "matched_in" field
    """
    modules = load_afirm_modules(afirm_path)
    if not modules:
        return []

    # Combine all retrieved text for matching
    combined_text = " ".join(c.get("text", "") for c in retrieved_chunks).lower()

    matched = []
    for module in modules:
        therapy_name = module["therapy_name"]
        # Extract abbreviation from therapy name, e.g. "(AAC)" from the name
        abbrev_match = re.search(r'\(([A-Z]{2,})\)', therapy_name)
        abbrev = abbrev_match.group(1) if abbrev_match else None

        # Check for matches: full name or abbreviation
        name_lower = therapy_name.lower()
        # Also check the core name without abbreviation
        core_name = re.sub(r'\s*\([^)]*\)\s*', '', therapy_name).strip().lower()

        found = False
        if core_name in combined_text:
            found = True
        elif abbrev and re.search(r'\b' + re.escape(abbrev) + r'\b', combined_text, re.IGNORECASE):
            found = True
        # Also check key terms from the description
        elif _has_strong_keyword_match(module, combined_text):
            found = True

        if found:
            # Age filter: parse age_range like "birth-22"
            if age is not None and not _age_in_range(age, module.get("age_range", "")):
                continue
            matched.append(module)

    log.info("Matched %d AFIRM modules to retrieved chunks.", len(matched))
    return matched


def format_afirm_context(modules: List[dict]) -> str:
    """Format matched AFIRM modules as structured context for the generation prompt."""
    if not modules:
        return ""

    lines = ["## Matched Evidence-Based Interventions (AFIRM)\n"]
    for m in modules:
        lines.append(f"**{m['therapy_name']}**")
        lines.append(f"- Description: {m['description']}")
        lines.append(f"- Targets: {', '.join(m.get('intervention_targets', []))}")
        lines.append(f"- Age range: {m.get('age_range', 'N/A')}")
        lines.append(f"- Evidence: {m.get('evidence_basis', 'N/A')}")
        link = m.get('source', {}).get('link')
        if link:
            lines.append(f"- Link: {link}")
        lines.append("")

    return "\n".join(lines)


def _has_strong_keyword_match(module: dict, text: str) -> bool:
    """Check if intervention-specific keywords appear in text."""
    targets = module.get("intervention_targets", [])
    matches = sum(1 for t in targets if t.lower() in text)
    # Require at least 2 target matches for a keyword-based match
    return matches >= 2


def _age_in_range(age: int, age_range: str) -> bool:
    """Check if age falls within an AFIRM age_range like 'birth-22'."""
    if not age_range:
        return True
    parts = age_range.lower().replace("birth", "0").split("-")
    try:
        low = int(parts[0])
        high = int(parts[1]) if len(parts) > 1 else low
        return low <= age <= high
    except (ValueError, IndexError):
        return True
