# Path: pipeline/ingest.py
"""
PDF ingestion pipeline for JnanaSetu.
Downloads Karnataka State Textbook PDFs, extracts text, and cleans it.
"""

import os
import re
import time
import requests
import pdfplumber
from pathlib import Path

# Directory setup
BASE_DIR = Path(__file__).parent
RAW_DIR = BASE_DIR / 'data' / 'raw'
EXTRACTED_DIR = BASE_DIR / 'data' / 'extracted'

RAW_DIR.mkdir(parents=True, exist_ok=True)
EXTRACTED_DIR.mkdir(parents=True, exist_ok=True)

# Karnataka State Textbook URLs (example URLs - may need updating)
TEXTBOOK_URLS = {
    'mathematics_7_fractions': (
        'https://ktbs.kar.nic.in/New/Textbooks/2023-24/7th/English/'
        'Mathematics-7/Chapter-2.pdf'
    ),
}

HEADING_PATTERNS = [
    re.compile(r'^(?:Chapter|Lesson|Unit)\s+\d+', re.IGNORECASE),
    re.compile(r'^\d+\.\d+\s+[A-Z]'),  # Section numbers like 2.1
    re.compile(r'^Exercise\s+\d+', re.IGNORECASE),
    re.compile(r'^Example\s+\d+', re.IGNORECASE),
]


def download_pdf(url, output_path, max_retries=3):
    """Download a PDF with retry logic."""
    for attempt in range(1, max_retries + 1):
        try:
            print(f"Downloading {url} (attempt {attempt}/{max_retries})...")
            response = requests.get(url, timeout=30, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            response.raise_for_status()

            with open(output_path, 'wb') as f:
                f.write(response.content)

            print(f"Downloaded to {output_path}")
            return True

        except requests.RequestException as e:
            print(f"Download attempt {attempt} failed: {e}")
            if attempt < max_retries:
                wait = attempt * 2
                print(f"Retrying in {wait} seconds...")
                time.sleep(wait)

    print(f"Failed to download {url} after {max_retries} attempts")
    return False


def extract_text_from_pdf(pdf_path):
    """Extract text from PDF using pdfplumber."""
    text_by_page = {}

    try:
        with pdfplumber.open(pdf_path) as pdf:
            for i, page in enumerate(pdf.pages):
                page_text = page.extract_text() or ''
                text_by_page[i + 1] = page_text

        print(f"Extracted {len(text_by_page)} pages from {pdf_path.name}")
        return text_by_page

    except Exception as e:
        print(f"Error extracting text from {pdf_path}: {e}")
        return {}


def clean_text(text):
    """Clean extracted text by removing artifacts."""
    if not text:
        return ''

    # Remove page numbers (standalone numbers at start/end of lines)
    text = re.sub(r'^\d+\s*$', '', text, flags=re.MULTILINE)

    # Remove headers/footers (common patterns)
    text = re.sub(r'^(Mathematics|Science|Social Science)\s+-\s+\d+', '', text, flags=re.MULTILINE)
    text = re.sub(r'^\d+\s+[A-Z][a-z]+\s+\d+$', '', text, flags=re.MULTILINE)  # "2 Fractions 7"

    # Fix hyphenation artifacts (word split across lines)
    text = re.sub(r'(\w+)-\s*\n\s*(\w+)', r'\1\2', text)

    # Normalize whitespace
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)

    return text.strip()


def detect_chapter_boundaries(text_by_page):
    """Detect chapter boundaries using heading patterns."""
    chapters = {}
    current_chapter = 'unknown'
    current_sections = []
    current_examples = []

    for page_num, text in text_by_page.items():
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Check if line is a heading
            is_heading = any(pattern.match(line) for pattern in HEADING_PATTERNS)

            if is_heading:
                if 'Chapter' in line or 'Lesson' in line or 'Unit' in line:
                    if current_chapter != 'unknown':
                        chapters[current_chapter] = {
                            'sections': current_sections,
                            'examples': current_examples,
                        }
                    current_chapter = line
                    current_sections = []
                    current_examples = []
                elif 'Example' in line:
                    current_examples.append(line)
                else:
                    current_sections.append(line)

    # Save last chapter
    if current_chapter != 'unknown':
        chapters[current_chapter] = {
            'sections': current_sections,
            'examples': current_examples,
        }

    return chapters


def save_extracted_text(subject, chapter, text, output_dir=None):
    """Save extracted text to file."""
    if output_dir is None:
        output_dir = EXTRACTED_DIR

    # Sanitize filename
    safe_chapter = re.sub(r'[^\w\s-]', '', chapter).strip().replace(' ', '_')
    filename = f"{subject}_{safe_chapter}.txt"
    filepath = output_dir / filename

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(text)

    print(f"Saved extracted text to {filepath}")
    return filepath


def main():
    """Main ingestion pipeline."""
    print("=" * 60)
    print("JnanaSetu PDF Ingestion Pipeline")
    print("=" * 60)

    for key, url in TEXTBOOK_URLS.items():
        subject, grade, chapter = key.split('_', 2)
        pdf_filename = f"{key}.pdf"
        pdf_path = RAW_DIR / pdf_filename

        # Download PDF
        if not pdf_path.exists():
            success = download_pdf(url, pdf_path)
            if not success:
                print(f"Skipping {key} - download failed")
                continue
        else:
            print(f"Using cached PDF: {pdf_path}")

        # Extract text
        text_by_page = extract_text_from_pdf(pdf_path)
        if not text_by_page:
            print(f"No text extracted from {key}")
            continue

        # Clean text
        all_text = []
        for page_num in sorted(text_by_page.keys()):
            cleaned = clean_text(text_by_page[page_num])
            if cleaned:
                all_text.append(f"--- Page {page_num} ---\n{cleaned}")

        combined_text = '\n\n'.join(all_text)

        # Detect chapters
        chapters = detect_chapter_boundaries(text_by_page)
        print(f"Detected chapters: {list(chapters.keys())}")

        # Save
        save_extracted_text(subject, chapter, combined_text)

    print("\nIngestion complete!")


if __name__ == '__main__':
    main()
