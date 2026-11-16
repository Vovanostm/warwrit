#!/usr/bin/env python3
"""Check Warwrit player text: forbidden, rare and naive wording; brief and reply length.

Usage: python3 check_text.py FILE [FILE ...]
Scans quoted player text: lines starting with '>' or '«', and lines with replies.
Designer tables and headings are skipped. Exit code 1 when anything is found.
"""
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
DICT = HERE.parent / "references" / "plain-russian.md"

FORBIDDEN = [
    "действительн", "подлинн", "законн", "фактическ", "установленн", "соответствующ",
    "предъяв", "осуществ", "данный", "данная", "данное", "тьма", "древнее зло",
    "мрачная тайна", "судьб", "эхо прошлого", "зловещ", "витал", "холодок",
    "сердце сжал", "глаза блес", "не просто", "он понял, что", "она поняла, что",
]
PLACE_NAMES = ["тихая гать", "тихой гати", "тихую гать", "тихой гатью"]
# Naive or childish speech: self-praise and bargains an adult would not say aloud.
NAIVE = [
    r"(?<![а-яё])я умею(?![а-яё])", r"умею держать", r"будете кормить", r"пойду с вами",
    r"(?<![а-яё])я (сильный|храбрый|смелый|верный|честный)(?![а-яё])",
    r"буду (вам )?верен", r"(?<![а-яё])клянусь(?![а-яё])",
]
# Invented fantasy names for things the world has only one of (SKILL rule 9).
INVENTED = [
    r"(церк[а-яё]*|час[а-яё]*|вер[аыуе]) креста", r"орден[а-яё]* (пламени|света|тьмы|рассвета)",
    r"(церк[а-яё]*|храм[а-яё]*) (пламени|света|солнца|единого)",
]


def rare_stems():
    stems = []
    for line in DICT.read_text(encoding="utf-8").splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) < 3 or cells[0] in ("Корень", "") or set(cells[0]) <= set("-"):
            continue
        for stem in cells[0].split("/"):
            stems.append((stem.strip().lower(), cells[2]))
    return stems


def player_lines(text):
    for n, line in enumerate(text.splitlines(), 1):
        s = line.strip()
        if s.startswith("|"):
            continue
        # Issuer cards (**Заказчик:** …) show role names to the player too;
        # other bold designer notes (**Кадр:**, **Действие:**) may use service words.
        issuer = re.match(r"\*\*(Заказчи|Платит|Не говорит)", s)
        if s.startswith(">") or "«" in s or s.startswith("—") or issuer:
            yield n, s


def check(text):
    """Return (line, message) issues for one document."""
    stems = rare_stems()
    issues = []
    # Keep "Полесского герцогства" whole when a line break splits it.
    text = re.sub(r"((?:[Жж]итн|[Пп]олесск)[а-яё]*)[ \t]*\n(>?[ \t]*)(герцогств[а-яё]*)", r"\1 \3\n\2", text)
    for n, s in player_lines(text):
        low = s.lower()
        for name in PLACE_NAMES:
            low = low.replace(name, " ")
        low = re.sub(r"(житн|полесск)[а-яё]*\s+герцогств[а-яё]*", " ", low)
        for w in FORBIDDEN:
            if w in low:
                issues.append((n, f"forbidden '{w}': {s[:90]}"))
        for stem, plain in stems:
            exact = stem.endswith("$")
            pattern = r"(?<![а-яё])" + re.escape(stem.rstrip("$")) + (r"(?![а-яё])" if exact else "")
            if re.search(pattern, low):
                issues.append((n, f"rare '{stem}' -> {plain}: {s[:90]}"))
        for pattern in NAIVE:
            if re.search(pattern, low):
                issues.append((n, f"naive speech (show by action, see SKILL rule 8): {s[:90]}"))
        for pattern in INVENTED:
            if re.search(pattern, low):
                issues.append((n, f"invented name (plain word, see SKILL rule 9): {s[:90]}"))
        reply = s.lstrip("> ").strip()
        if reply.startswith("—") and len(reply.split()) > 18:
            issues.append((n, f"long reply ({len(reply.split())} words)"))
    for m in re.finditer(r"\*\*brief:\*\*(.*?)(?:\n>\s*\n|\n\n|\Z)", text, re.S):
        words = re.sub(r"\n>\s*", " ", m.group(1)).split()
        if len(words) > 25:
            line = text[: m.start()].count("\n") + 1
            issues.append((line, f"brief has {len(words)} words (max 25)"))
    return issues


def main(paths):
    found = 0
    for p in paths:
        for n, msg in check(Path(p).read_text(encoding="utf-8")):
            print(f"{p}:{n}: {msg}")
            found += 1
    print(f"issues: {found}")
    return 1 if found else 0


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(sys.argv[1:]))
