import fitz
import re
import json
import sys
import os

# ── Font-size thresholds discovered by probing the Karnataka textbook PDFs ─────
# size ~20  = chapter title  ("Nutrition in Plants")
# size ~66  = chapter number digit ("1", "2") — same page as title
# size ~12  = section heading ("1.1 MODE OF NUTRITION IN PLANTS")
# size ~11  = end-of-chapter noise ("What you have learnt", "Exercises")
# size ~10  = body text — ignore

CHAPTER_TITLE_SIZE = 18.0   # >= this → chapter title (size ~20.4 in this PDF)
SECTION_SIZE_MIN   = 11.5   # >= this (and < CHAPTER_TITLE_SIZE) → section heading
SECTION_SIZE_MAX   = 17.9
DROP_CAP_SIZE      = 40.0   # >= this → decorative drop-cap digit/letter, skip

# Section headings that are noise (end-of-chapter boilerplate)
SECTION_NOISE = {
    "what you have learnt", "keywords", "exercises", "exercise",
    "extended learning", "did you know", "activities and projects",
    "amazing fact", "caution", "note", "absorption in the small",
    "the mouth and buccal cavity", "the foodpipe", "the stomach",
    "the small intestine", "large intestine", "reading a thermometer",
    "woollen clothes keep us warm",
}

SECTION_RE = re.compile(r'^\d+\.\d+')   # "1.1", "2.3" etc.


def is_readable(text):
    """True if span text contains real ASCII chars (not private-use glyphs)."""
    return sum(1 for c in text if ord(c) < 0xF000) > 0


def extract_line_text(line):
    """Merge all readable spans in a line into one string."""
    return "".join(
        s["text"] for s in line["spans"] if is_readable(s["text"])
    ).strip()


def max_size_in_line(line):
    return max((s["size"] for s in line["spans"]), default=0)


def extract_structure(pdf_path):
    doc = fitz.open(pdf_path)
    print(f"[extract] {len(doc)} pages", file=sys.stderr)

    chapters = []          # [{chapter, number, concepts, _seen}]
    current_chapter = None
    pending_title_parts = []   # accumulate multi-line chapter titles
    pending_number = None      # chapter number digit seen on same page

    for page_idx in range(len(doc)):
        page_lines = []

        for block in doc[page_idx].get_text("dict")["blocks"]:
            if block.get("type") != 0:
                continue
            for line in block["lines"]:
                txt = extract_line_text(line)
                sz = max_size_in_line(line)
                if txt and sz >= SECTION_SIZE_MIN:
                    # Skip watermark
                    if "KTBS" in txt or "REPUBLISH" in txt:
                        continue
                    page_lines.append((sz, txt))

        for sz, txt in page_lines:
            # ── Chapter number digit (size ~66) or drop-cap letter (size ~52) ─
            if sz >= DROP_CAP_SIZE:
                # Only treat as chapter number if it's a single digit
                if txt.isdigit() and len(txt) == 1:
                    pending_number = int(txt)
                # else: decorative drop-cap letter — skip entirely
                continue

            # ── Chapter title (size ~20) ──────────────────────────────────────
            if sz >= CHAPTER_TITLE_SIZE:
                # Skip cover-page titles: all-caps short strings like "SCIENCE", "PART - 1"
                if txt.isupper() and len(txt.split()) <= 2:
                    continue
                # Flush any previous pending title
                if pending_title_parts:
                    title = " ".join(pending_title_parts).strip()
                    num = pending_number or (len(chapters) + 1)
                    full_title = f"{num} {title}"
                    if current_chapter:
                        chapters.append(current_chapter)
                    current_chapter = {
                        "chapter": full_title,
                        "concepts": [],
                        "_seen": set(),
                    }
                    pending_title_parts = []
                    pending_number = None

                pending_title_parts.append(txt)
                continue

            # ── Section heading (size ~12) ────────────────────────────────────
            if SECTION_SIZE_MIN <= sz <= SECTION_SIZE_MAX:
                # Flush pending chapter title when first section heading arrives
                if pending_title_parts:
                    title = " ".join(pending_title_parts).strip()
                    num = pending_number or (len(chapters) + 1)
                    full_title = f"{num} {title}"
                    # Reuse current_chapter if it already has this title (avoid duplicate)
                    if current_chapter and current_chapter["chapter"] == full_title:
                        pass  # already correct, just clear pending
                    else:
                        if current_chapter:
                            chapters.append(current_chapter)
                        current_chapter = {
                            "chapter": full_title,
                            "concepts": [],
                            "_seen": set(),
                        }
                    pending_title_parts = []
                    pending_number = None

                if not current_chapter:
                    continue

                # Skip noise headings
                if txt.lower() in SECTION_NOISE:
                    continue
                if any(txt.lower().startswith(n) for n in SECTION_NOISE):
                    continue
                # Skip pure activity lines
                if re.match(r'^Activity\s+\d', txt, re.IGNORECASE):
                    continue

                # Merge ONLY genuine split section headings:
                # prev line starts with "N.N" and current has no section number
                # and prev line is short (was cut mid-word by column layout)
                if (current_chapter["concepts"]
                        and not SECTION_RE.match(txt)
                        and not txt[0].islower()):  # continuation won't start lowercase
                    last = current_chapter["concepts"][-1]
                    last_clean = last.split()[0] if last.split() else ""
                    # Only merge if last concept starts with a section number AND is short
                    if SECTION_RE.match(last) and len(last) < 55:
                        merged = last + " " + txt
                        current_chapter["concepts"][-1] = merged
                        current_chapter["_seen"].discard(last.lower())
                        current_chapter["_seen"].add(merged.lower())
                        continue

                clean = re.sub(r'[\uff66\u2013\u2014]', ' ', txt).strip(" -").strip()
                clean = re.sub(r'\s+', ' ', clean)
                if len(clean) > 3 and clean.lower() not in current_chapter["_seen"]:
                    current_chapter["concepts"].append(clean)
                    current_chapter["_seen"].add(clean.lower())

    # Flush last pending title
    if pending_title_parts:
        title = " ".join(pending_title_parts).strip()
        num = pending_number or (len(chapters) + 1)
        if current_chapter:
            chapters.append(current_chapter)
        current_chapter = {
            "chapter": f"{num} {title}",
            "concepts": [],
            "_seen": set(),
        }

    if current_chapter:
        chapters.append(current_chapter)

    # Clean up and build output
    # Post-process: split any concept that has a section number mid-string
    # e.g. "1.2 PHOTOSYNTHESIS FOOD MAKING Cells" → keep only up to next section
    output = []
    for ch in chapters:
        ch.pop("_seen", None)
        cleaned = []
        for concept in ch["concepts"]:
            # If concept starts with section number, keep only the heading part
            # (strip any sub-text that got merged after a space following all-caps)
            if SECTION_RE.match(concept):
                # Trim trailing sub-concept noise: stop at first Title Case word
                # after the ALL-CAPS section title
                parts = concept.split()
                cutoff = len(parts)
                in_title = False
                for j, w in enumerate(parts):
                    if j == 0:  # "1.2"
                        continue
                    if w.isupper() or w[0].isupper() and w.upper() == w:
                        in_title = True
                    elif in_title and w[0].isupper() and not w.isupper():
                        # Title Case word after ALL CAPS = sub-concept noise
                        cutoff = j
                        break
                concept = " ".join(parts[:cutoff]).strip("ｦ –—-").strip()
            # Skip orphan continuation fragments (no section number, very short)
            if not SECTION_RE.match(concept) and len(concept.split()) <= 3:
                continue
            if concept:
                cleaned.append(concept)
        ch["concepts"] = cleaned
        ch["conceptCount"] = len(cleaned)
        output.append(ch)

    print(f"[extract] {len(output)} chapters found", file=sys.stderr)
    return output


def main():
    if len(sys.argv) < 2:
        print("Usage: python extract_chapters.py <input.pdf>", file=sys.stderr)
        sys.exit(1)

    pdf_path = os.path.abspath(sys.argv[1])
    if not os.path.exists(pdf_path):
        print(json.dumps({"error": f"File not found: {pdf_path}"}))
        sys.exit(0)

    try:
        result = extract_structure(pdf_path)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        import traceback
        print(json.dumps({"error": str(e), "traceback": traceback.format_exc()}))
        sys.exit(0)


if __name__ == "__main__":
    main()
