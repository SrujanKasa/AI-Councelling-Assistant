"""
Static metadata used by the prediction engine for:
- Branch normalization (canonical groups → keyword matchers)
- NIRF / placement tier for top engineering colleges
- College-type detection (NIT / IIIT / GFTI / Other)

This file is intentionally kept simple — no DB calls.
"""
from typing import List

# ---------------------------------------------------------------------------
# Canonical engineering branches (user-facing filter chips)
# Each entry maps a canonical label → list of lowercase keyword fragments
# found in JoSAA `program_name` / TS EAMCET `branch_name`.
# ---------------------------------------------------------------------------
BRANCH_GROUPS = {
    "CSE": [
        "computer science",
        "computer engineering",
        "cse",
    ],
    "AI & ML": [
        "artificial intelligence",
        "ai and data",
        "machine learning",
        "ai & ml",
        "ai-ml",
    ],
    "Data Science": [
        "data science",
        "data analytics",
    ],
    "IT": [
        "information technology",
        " it ",
        "information science",
    ],
    "ECE": [
        "electronics and communication",
        "electronics & communication",
        "ece",
        "electronics engineering",
    ],
    "EEE": [
        "electrical and electronics",
        "electrical & electronics",
        "eee",
    ],
    "Electrical": [
        "electrical engineering",
        " electrical ",
    ],
    "Mechanical": [
        "mechanical",
    ],
    "Civil": [
        "civil",
    ],
    "Chemical": [
        "chemical",
    ],
    "Biotechnology": [
        "biotechnology",
        "bio technology",
        "bio-technology",
    ],
    "Aerospace": [
        "aerospace",
        "aeronautical",
    ],
    "Metallurgy": [
        "metallurgical",
        "materials",
    ],
}


def match_branches(program_name: str, selected: List[str]) -> bool:
    """Return True if program_name matches ANY selected canonical branch."""
    if not selected:
        return True
    name = f" {program_name.lower()} "
    for label in selected:
        keywords = BRANCH_GROUPS.get(label, [])
        if any(kw in name for kw in keywords):
            return True
    return False


# ---------------------------------------------------------------------------
# NIRF Engineering 2024 ranking (lower = better)
# Used purely for *sorting* — falls back to a high default for unknown colleges.
# Keys are matched as case-insensitive substrings against institute names.
# ---------------------------------------------------------------------------
NIRF_RANK = {
    # IITs
    "Indian Institute of Technology Madras": 1,
    "Indian Institute of Technology Delhi": 2,
    "Indian Institute of Technology Bombay": 3,
    "Indian Institute of Technology Kanpur": 4,
    "Indian Institute of Technology Kharagpur": 5,
    "Indian Institute of Technology Roorkee": 6,
    "Indian Institute of Technology Guwahati": 7,
    "Indian Institute of Technology Hyderabad": 8,
    "Indian Institute of Technology (BHU) Varanasi": 12,
    "Indian Institute of Technology Indore": 16,
    "Indian Institute of Technology (ISM) Dhanbad": 17,
    "Indian Institute of Technology Ropar": 22,
    "Indian Institute of Technology Bhubaneswar": 33,
    "Indian Institute of Technology Gandhinagar": 35,
    "Indian Institute of Technology Patna": 50,
    "Indian Institute of Technology Mandi": 51,
    # NITs
    "National Institute of Technology Tiruchirappalli": 9,
    "National Institute of Technology Karnataka, Surathkal": 17,
    "National Institute of Technology Rourkela": 19,
    "National Institute of Technology Warangal": 21,
    "National Institute of Technology Calicut": 25,
    "National Institute of Technology Silchar": 41,
    "National Institute of Technology, Durgapur": 43,
    "Visvesvaraya National Institute of Technology, Nagpur": 45,
    "Sardar Vallabhbhai National Institute of Technology, Surat": 65,
    "Malaviya National Institute of Technology Jaipur": 47,
    "Motilal Nehru National Institute of Technology Allahabad": 50,
    "National Institute of Technology Kurukshetra": 53,
    "National Institute of Technology, Jamshedpur": 70,
    "National Institute of Technology Hamirpur": 82,
    "National Institute of Technology, Patna": 88,
    "National Institute of Technology Goa": 95,
    # IIITs
    "Indian Institute of Information Technology, Hyderabad": 47,
    "Indian Institute of Information Technology, Allahabad": 60,
    "Atal Bihari Vajpayee Indian Institute of Information Technology": 75,
    "Indian Institute of Information Technology, Bangalore": 85,
    # BITS / IIITs of national importance
    "Birla Institute of Technology and Science": 20,
    # Fallback default applied for unmatched institutes
}

DEFAULT_NIRF = 200


def _normalize(s: str) -> str:
    """Lowercase + strip punctuation for fuzzy NIRF matching."""
    if not s:
        return ""
    out = s.lower()
    for ch in [",", ".", "(", ")", "-", "  "]:
        out = out.replace(ch, " ")
    return " ".join(out.split())


def nirf_rank(name: str) -> int:
    """Best-effort NIRF rank lookup with normalized substring match (bi-directional)."""
    if not name:
        return DEFAULT_NIRF
    name_n = _normalize(name)
    for key, rank in NIRF_RANK.items():
        key_n = _normalize(key)
        if key_n in name_n or name_n in key_n:
            return rank
    return DEFAULT_NIRF


# ---------------------------------------------------------------------------
# College type detection
# ---------------------------------------------------------------------------
def college_type(name: str) -> str:
    """Return one of: 'IIT' | 'NIT' | 'IIIT' | 'GFTI' | 'Other'."""
    if not name:
        return "Other"
    n = name.lower()
    if "indian institute of technology" in n and "information technology" not in n:
        return "IIT"
    if "national institute of technology" in n:
        return "NIT"
    if "indian institute of information technology" in n:
        return "IIIT"
    gfti_markers = [
        "school of planning",
        "iiest",
        "indian school of mines",
        "birla institute",
        "institute of engineering and technology",
        "j.k. institute",
        "indian institute of carpet",
        "indian institute of crop processing",
        "indian institute of food",
        "central institute",
        "national institute of foundry",
        "punjab engineering",
        "shri mata vaishno devi",
        "thapar",
    ]
    if any(m in n for m in gfti_markers):
        return "GFTI"
    return "Other"


TYPE_PRIORITY = {"IIT": 0, "NIT": 1, "IIIT": 2, "GFTI": 3, "Other": 4}


# ---------------------------------------------------------------------------
# Realistic classification (5-tier)
# Based on ratio = (closing_rank / user_rank). Higher ratio = easier admit.
# ---------------------------------------------------------------------------
def classify_5tier(user_rank: int, closing_rank: int):
    """Return (label, probability_percent).
    Labels: Very Safe, Safe, Moderate, Competitive, Difficult.
    Probability is a calibrated estimate, capped at 95%.
    """
    if closing_rank <= 0 or user_rank <= 0:
        return "Difficult", 5.0
    ratio = closing_rank / user_rank
    if ratio >= 1.6:
        return "Very Safe", min(95.0, 88 + (ratio - 1.6) * 10)
    if ratio >= 1.2:
        return "Safe", 72 + (ratio - 1.2) * 40
    if ratio >= 0.95:
        return "Moderate", 45 + (ratio - 0.95) * 108
    if ratio >= 0.75:
        return "Competitive", 18 + (ratio - 0.75) * 135
    return "Difficult", max(3.0, 18 * ratio)


CLASSIFICATION_ORDER = [
    "Very Safe", "Safe", "Moderate", "Competitive", "Difficult"
]


# ---------------------------------------------------------------------------
# Fee estimates (very rough, used purely for display)
# ---------------------------------------------------------------------------
def fee_estimate(name: str, ctype: str) -> str:
    if ctype == "IIT":
        return "~₹2,00,000–₹2,50,000/year"
    if ctype == "NIT":
        return "~₹1,50,000–₹1,75,000/year"
    if ctype == "IIIT":
        return "~₹1,75,000–₹2,25,000/year"
    if ctype == "GFTI":
        return "~₹1,00,000–₹1,75,000/year"
    return "~₹35,000–₹1,50,000/year"
