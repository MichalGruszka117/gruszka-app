"""Dopisuje transkrypcje (IPA + polski zapis) do data.js i dzieli lekcje na porcje.

Uzycie:
    pip install cmudict
    python tools/add_phonetics.py

Skrypt czyta ../data.js, dla kazdego hasla generuje pola `ipa` i `fon`, dzieli kazdy
temat na porcje po ~CHUNK slowek i nadpisuje data.js. Uruchamiaj po kazdym dodaniu
nowych slowek, zeby zapis fonetyczny byl spojny z reszta.

UWAGA: zmiana podzialu lekcji zmienia ich numery. Jesli to zrobisz, podbij
DATA_VERSION w app.js i dopisz krok w migrate() - inaczej user straci postep.
"""
import json
import os
import re
import sys

import cmudict

from phon import to_ipa, to_pol

CHUNK = 15          # docelowa liczba slowek w lekcji
MAX_IN_LESSON = 17  # twardy limit - powyzej tego dzielimy na wiecej porcji

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, os.pardir, "data.js")

D = cmudict.dict()

# Slowa nieobecne w CMUdict - uzupelnione recznie
EXTRA = {
    "godparents": ["G", "AA1", "D", "P", "EH2", "R", "AH0", "N", "T", "S"],
    "pyjamas":    ["P", "AH0", "JH", "AA1", "M", "AH0", "Z"],
}

# Formy slabe - w dluzszej frazie te slowka sa nieakcentowane
WEAK = {
    "a":   ["AH0"],
    "the": ["DH", "AH0"],
    "to":  ["T", "AH0"],
    "of":  ["AH0", "V"],
    "and": ["AH0", "N", "D"],
}


def phones_for(token):
    if token in EXTRA:
        return EXTRA[token]
    return D[token][0] if token in D else None


def transcribe(phrase):
    """Zwraca (ipa, pol) dla calego hasla - takze wielowyrazowego."""
    tokens = [t for t in re.split(r"([\s\-/]+)", phrase.lower()) if t]
    real = [t for t in tokens if not re.fullmatch(r"[\s\-/]+", t)]
    multi = len(real) > 1

    ipa_parts, pol_parts = [], []
    for tok in tokens:
        if re.fullmatch(r"[\s\-/]+", tok):
            ipa_parts.append(" ")
            pol_parts.append(" ")
            continue
        clean = re.sub(r"[^a-z']", "", tok)
        if not clean:
            continue
        ph = WEAK[clean] if (multi and clean in WEAK) else phones_for(clean)
        if ph is None:
            return None, None
        ipa_parts.append(to_ipa(ph))
        pol_parts.append(to_pol(ph))

    return (re.sub(r"\s+", " ", "".join(ipa_parts)).strip(),
            re.sub(r"\s+", " ", "".join(pol_parts)).strip())


def split_evenly(words):
    """Dzieli liste na porcje o mozliwie rownej dlugosci, srednio ~CHUNK."""
    n = len(words)
    parts = max(1, round(n / CHUNK))
    while n / parts > MAX_IN_LESSON:
        parts += 1
    q, r = divmod(n, parts)
    out, at = [], 0
    for i in range(parts):
        size = q + (1 if i < r else 0)
        out.append(words[at:at + size])
        at += size
    return out


def main():
    src = open(DATA, encoding="utf-8").read()
    start = src.index("{", src.index("const CHAPTER1"))
    ch, _ = json.JSONDecoder().raw_decode(src[start:])

    cache, failed = {}, []
    for lesson in ch["lessons"]:
        for w in lesson["words"]:
            if w["en"] not in cache:
                ipa, pol = transcribe(w["en"])
                if ipa is None:
                    failed.append(w["en"])
                cache[w["en"]] = (ipa, pol)

    if failed:
        print("BLAD - brak wymowy dla:", failed)
        print("Dopisz je recznie do EXTRA (fonemy ARPAbet) i uruchom ponownie.")
        return 1

    # Scal z powrotem po temacie, zeby skrypt byl idempotentny - inaczej ponowne
    # uruchomienie dzielilo by juz podzielone lekcje i zgubilo numery czesci.
    themes, order = {}, []
    for lesson in ch["lessons"]:
        theme = lesson.get("theme", lesson["id"])
        if theme not in themes:
            themes[theme] = {"title": lesson["title"], "words": []}
            order.append(theme)
        themes[theme]["words"].extend(lesson["words"])

    new_lessons, nid = [], 0
    for theme in order:
        lesson = themes[theme]
        chunks = split_evenly(lesson["words"])
        for pi, cw in enumerate(chunks, 1):
            nid += 1
            new_lessons.append({
                "id": nid,
                "theme": theme,
                "title": lesson["title"],
                "part": pi,
                "partCount": len(chunks),
                "words": [{"en": w["en"], "pl": w["pl"],
                           "ipa": cache[w["en"]][0], "fon": cache[w["en"]][1]}
                          for w in cw],
            })

    out = {k: ch[k] for k in ("id", "title", "subtitle")}
    out["lessons"] = new_lessons

    body = json.dumps(out, ensure_ascii=False, separators=(", ", ": "))
    with open(DATA, "w", encoding="utf-8") as f:
        f.write("const CHAPTER1 = " + body + ";\n\n"
                "if (typeof module !== 'undefined') { module.exports = { CHAPTER1 }; }\n")

    sizes = [len(l["words"]) for l in new_lessons]
    print(f"OK - {len(new_lessons)} lekcji, {sum(sizes)} slowek "
          f"(porcje {min(sizes)}-{max(sizes)})")
    print("PAMIETAJ: podbij CACHE_NAME w service-worker.js")
    return 0


if __name__ == "__main__":
    sys.exit(main())
