"""Generator transkrypcji: ARPAbet (CMUdict) -> IPA + polski zapis przyblizony."""
import re

# ---------- ARPAbet -> IPA ----------
IPA = {
    "AA": "ɑː", "AE": "æ", "AO": "ɔː", "AW": "aʊ", "AY": "aɪ",
    "EH": "ɛ", "EY": "eɪ", "IH": "ɪ", "IY": "iː", "OW": "oʊ",
    "OY": "ɔɪ", "UH": "ʊ", "UW": "uː",
    "B": "b", "CH": "tʃ", "D": "d", "DH": "ð", "F": "f", "G": "ɡ",
    "HH": "h", "JH": "dʒ", "K": "k", "L": "l", "M": "m", "N": "n",
    "NG": "ŋ", "P": "p", "R": "r", "S": "s", "SH": "ʃ", "T": "t",
    "TH": "θ", "V": "v", "W": "w", "Y": "j", "Z": "z", "ZH": "ʒ",
}

# ---------- ARPAbet -> polski zapis ----------
POL = {
    "AA": "a", "AE": "a", "AO": "o", "AW": "ał", "AY": "aj",
    "EH": "e", "EY": "ej", "IH": "y", "IY": "i", "OW": "oł",
    "OY": "oj", "UH": "u", "UW": "u",
    "B": "b", "CH": "cz", "D": "d", "DH": "dh", "F": "f", "G": "g",
    "HH": "h", "JH": "dż", "K": "k", "L": "l", "M": "m", "N": "n",
    "NG": "ng", "P": "p", "R": "r", "S": "s", "SH": "sz", "T": "t",
    "TH": "th", "V": "w", "W": "ł", "Y": "j", "Z": "z", "ZH": "ż",
}

VOWELS = {"AA", "AE", "AH", "AO", "AW", "AY", "EH", "ER", "EY",
          "IH", "IY", "OW", "OY", "UH", "UW"}

# Dopuszczalne nagłosy (maximal onset principle)
ONSET2 = {
    ("P","R"),("P","L"),("B","R"),("B","L"),("T","R"),("D","R"),
    ("K","R"),("K","L"),("G","R"),("G","L"),("K","W"),("G","W"),
    ("T","W"),("D","W"),("F","R"),("F","L"),("TH","R"),("TH","W"),
    ("S","P"),("S","T"),("S","K"),("S","M"),("S","N"),("S","L"),
    ("S","W"),("S","F"),("SH","R"),("HH","W"),("V","R"),
    ("P","Y"),("B","Y"),("T","Y"),("D","Y"),("K","Y"),("G","Y"),
    ("F","Y"),("V","Y"),("M","Y"),("N","Y"),("L","Y"),("S","Y"),
    ("HH","Y"),("TH","Y"),
}
ONSET3 = {("S","P","R"),("S","P","L"),("S","T","R"),("S","K","R"),
          ("S","K","W"),("S","K","L"),("S","P","Y"),("S","T","Y"),
          ("S","K","Y"),("S","M","Y")}


def base(ph):
    return re.sub(r"\d$", "", ph)


def stress_of(ph):
    m = re.search(r"(\d)$", ph)
    return int(m.group(1)) if m else None


def syllabify(phones):
    """Zwraca liste sylab; kazda to (onset, nucleus, coda, stress)."""
    nuclei = [i for i, p in enumerate(phones) if base(p) in VOWELS or base(p) == "ER"]
    if not nuclei:
        return [(list(phones), None, [], 0)]

    sylls = []
    for k, ni in enumerate(nuclei):
        prev_n = nuclei[k - 1] if k > 0 else -1
        between = [base(p) for p in phones[prev_n + 1:ni]]

        if k == 0:
            onset = between            # cale nagłosowe zbitki do pierwszej sylaby
        else:
            onset = []
            for size in (3, 2, 1):     # maximal onset
                if len(between) >= size:
                    cand = tuple(between[-size:])
                    ok = (cand in ONSET3) if size == 3 else \
                         (cand in ONSET2) if size == 2 else True
                    if ok:
                        onset = between[-size:]
                        break
            # reszta trafia do kody poprzedniej sylaby
            coda_prev = between[:len(between) - len(onset)]
            o, n, c, s = sylls[-1]
            sylls[-1] = (o, n, c + coda_prev, s)

        nucleus = phones[ni]
        sylls.append((onset, nucleus, [], stress_of(nucleus) or 0))

    # ogon po ostatniej samoglosce -> koda ostatniej sylaby
    tail = [base(p) for p in phones[nuclei[-1] + 1:]]
    o, n, c, s = sylls[-1]
    sylls[-1] = (o, n, c + tail, s)

    # CMUdict czasem daje kilka akcentow glownych (np. seventeen).
    # Slowniki notuja jeden - wczesniejsze schodza na poboczny.
    primary = [i for i, sy in enumerate(sylls) if sy[3] == 1]
    for i in primary[:-1]:
        o, n, c, _ = sylls[i]
        sylls[i] = (o, n, c, 2)
    return sylls


def vowel_ipa(ph):
    b, st = base(ph), stress_of(ph)
    if b == "AH":
        return "ə" if st == 0 else "ʌ"
    if b == "ER":
        return "ər" if st == 0 else "ɜːr"
    if b == "IY" and st == 0:
        return "i"      # nieakcentowane koncowe -y: /i/, nie /iː/
    if b == "UW" and st == 0:
        return "u"
    return IPA.get(b, b.lower())


def vowel_pol(ph):
    b, st = base(ph), stress_of(ph)
    if b == "AH":
        return "e" if st == 0 else "a"
    if b == "ER":
        return "er"
    return POL.get(b, b.lower())


def to_ipa(phones):
    sylls = syllabify(phones)
    mono = len(sylls) == 1          # w jednosylabowcach slowniki nie znacza akcentu
    out = []
    for o, n, c, s in sylls:
        if n is None:
            out.append("".join(IPA.get(p, p.lower()) for p in o))
            continue
        mark = "" if mono else ("ˈ" if s == 1 else ("ˌ" if s == 2 else ""))
        out.append(mark
                   + "".join(IPA.get(p, p.lower()) for p in o)
                   + vowel_ipa(n)
                   + "".join(IPA.get(p, p.lower()) for p in c))
    return "".join(out)


def to_pol(phones):
    sylls = syllabify(phones)
    parts = []
    for o, n, c, s in sylls:
        if n is None:
            parts.append(("".join(POL.get(p, p.lower()) for p in o), False))
            continue
        txt = ("".join(POL.get(p, p.lower()) for p in o)
               + vowel_pol(n)
               + "".join(POL.get(p, p.lower()) for p in c))
        parts.append((txt, s == 1))
    if len(parts) == 1:
        return parts[0][0]
    return "-".join(t.upper() if stressed else t for t, stressed in parts)
