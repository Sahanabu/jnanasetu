# Path: pipeline/generate.py
"""
AI misconception generation pipeline for JnanaSetu.
Uses Groq API to generate questions with misconceptions from extracted textbook text.

Usage:
    python generate.py --pdf <path> --file <filename>  # Batch mode (from backend trigger)
    python generate.py                                   # Interactive mode (list available PDFs)

Exit codes:
    0 - Success
    1 - Failure
"""

import os
import sys
import json
import re
import argparse
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

try:
    import jsonschema
    from jsonschema import validate
    JSONSCHEMA_AVAILABLE = True
except ImportError:
    JSONSCHEMA_AVAILABLE = False

# Directory setup - use Path for cross-platform compatibility
BASE_DIR = Path(__file__).parent.resolve()
EXTRACTED_DIR = BASE_DIR / 'data' / 'extracted'
DATASETS_DIR = BASE_DIR / 'data' / 'datasets'
RAW_DIR = BASE_DIR / 'data' / 'raw'

EXTRACTED_DIR.mkdir(parents=True, exist_ok=True)
DATASETS_DIR.mkdir(parents=True, exist_ok=True)
RAW_DIR.mkdir(parents=True, exist_ok=True)

# JSON Schema for validation
QUESTION_SCHEMA = {
    "type": "object",
    "required": ["topic", "questions"],
    "properties": {
        "topic": {"type": "string"},
        "questions": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["id", "question", "correctAnswer", "explanation", "concept", "difficulty", "misconceptions"],
                "properties": {
                    "id": {"type": "string"},
                    "question": {"type": "string"},
                    "correctAnswer": {"type": "string"},
                    "explanation": {"type": "string"},
                    "concept": {"type": "string"},
                    "difficulty": {"type": "string", "enum": ["easy", "medium", "hard"]},
                    "misconceptions": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "required": ["gapType", "reason", "story"],
                            "properties": {
                                "gapType": {"type": "string", "enum": ["conceptual", "procedural", "careless"]},
                                "reason": {"type": "string"},
                                "story": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                    "minItems": 3,
                                    "maxItems": 3,
                                },
                            },
                        },
                        "minItems": 3,
                        "maxItems": 3,
                    },
                },
            },
            "minItems": 5,
            "maxItems": 5,
        },
    },
}

SYSTEM_PROMPT = """You are an expert in K-12 Indian mathematics education.
Generate 5 questions per chapter with exactly 3 misconceptions each.
Each misconception must have a gapType (conceptual/procedural/careless),
a reason string, and a 3-step explanation story.
Return ONLY valid JSON matching the schema. No markdown."""


def extract_text_from_pdf(pdf_path):
    """Extract text from a PDF file using pdfplumber."""
    try:
        import pdfplumber
    except ImportError:
        print("pdfplumber not installed. Install with: pip install pdfplumber")
        return None

    text_parts = []
    try:
        pdf_path = Path(pdf_path)
        if not pdf_path.exists():
            print(f"PDF file not found: {pdf_path}")
            return None

        with pdfplumber.open(str(pdf_path)) as pdf:
            for i, page in enumerate(pdf.pages):
                page_text = page.extract_text() or ''
                if page_text.strip():
                    text_parts.append(f"--- Page {i + 1} ---\n{page_text}")
        print(f"Extracted {len(text_parts)} pages from {pdf_path.name}")
        return '\n\n'.join(text_parts)
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return None


def load_extracted_text(chapter_name):
    """Load extracted text for a given chapter."""
    for filepath in EXTRACTED_DIR.glob(f"*{chapter_name}*"):
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()

    print(f"No extracted text found for {chapter_name}")
    return None


def generate_with_groq(text, chapter_name):
    """Generate questions using Groq API."""
    api_key = os.getenv('GROQ_API_KEY')
    if not api_key:
        print("GROQ_API_KEY not set. Using template fallback.")
        return None

    try:
        user_prompt = f"""Chapter: {chapter_name}
Extracted text:
{text[:4000]}  # Limit context length

Generate 5 questions with 3 misconceptions each following the schema."""

        response = requests.post(
            'https://api.groq.com/openai/v1/chat/completions',
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {api_key}',
            },
            json={
                'model': 'llama-3.3-70b-versatile',
                'messages': [
                    {'role': 'system', 'content': SYSTEM_PROMPT},
                    {'role': 'user', 'content': user_prompt},
                ],
                'temperature': 0.7,
                'max_tokens': 4000,
            },
            timeout=60,
        )

        if not response.ok:
            print(f"Groq API error: {response.status_code} {response.text}")
            return None

        data = response.json()
        content = data['choices'][0]['message']['content'].strip()

        # Remove markdown code blocks if present
        content = re.sub(r'^```json\s*', '', content)
        content = re.sub(r'\s*```$', '', content)

        return json.loads(content)

    except Exception as e:
        print(f"Groq generation failed: {e}")
        return None


def validate_question_data(data):
    """Validate generated data against schema."""
    if not JSONSCHEMA_AVAILABLE:
        print("jsonschema not available. Skipping validation.")
        return True

    try:
        validate(instance=data, schema=QUESTION_SCHEMA)
        print("JSON validation passed!")
        return True
    except jsonschema.exceptions.ValidationError as e:
        print(f"JSON validation failed: {e}")
        return False


def save_dataset(data, filename):
    """Save generated dataset to file."""
    filepath = DATASETS_DIR / filename
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Saved dataset to {filepath}")
    return filepath


def parse_file_key(file_key):
    """
    Parse a file key like 'maths7_ch2.pdf' or 'science7_ch1.pdf'
    into subject, grade, and chapter name.
    """
    # Remove .pdf extension
    name = file_key.replace('.pdf', '')

    # Extract subject prefix (maths, science, etc.)
    match = re.match(r'([a-z]+)(\d+)_(.+)', name)
    if match:
        subject_prefix = match.group(1)
        grade = match.group(2)
        chapter_code = match.group(3)

        # Map subject prefix to full name
        subject_map = {
            'maths': 'Mathematics',
            'science': 'Science',
            'english': 'English',
            'social': 'Social Studies',
            'hindi': 'Hindi',
            'kannada': 'Kannada',
        }

        subject = subject_map.get(subject_prefix, subject_prefix.capitalize())

        # Convert chapter code to readable name
        chapter_name = chapter_code.replace('_', ' ').replace('-', ' ').title()

        return subject, grade, chapter_name

    return 'Unknown', '0', name.replace('_', ' ').title()


def process_pdf(pdf_path, file_key):
    """
    Process a PDF file end-to-end:
    1. Copy to raw directory
    2. Extract text
    3. Generate questions via Groq
    4. Save dataset
    """
    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        print(f"PDF not found: {pdf_path}")
        return False

    # Copy PDF to raw directory
    raw_pdf = RAW_DIR / pdf_path.name
    import shutil
    shutil.copy2(str(pdf_path), str(raw_pdf))
    print(f"Copied PDF to {raw_pdf}")

    # Extract text
    text = extract_text_from_pdf(str(pdf_path))
    if not text:
        print("No text extracted from PDF")
        return False

    # Parse file key for chapter name
    subject, grade, chapter_name = parse_file_key(file_key)
    print(f"Parsed: Subject={subject}, Grade={grade}, Chapter={chapter_name}")

    # Save extracted text
    extracted_file = EXTRACTED_DIR / f"{file_key.replace('.pdf', '')}.txt"
    with open(extracted_file, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f"Saved extracted text to {extracted_file}")

    # Generate questions
    data = generate_with_groq(text, chapter_name)

    if data and validate_question_data(data):
        # Save with a clean filename based on the file key
        dataset_name = f"{file_key.replace('.pdf', '')}.json"
        save_dataset(data, dataset_name)
        print(f"\n✅ Successfully processed: {file_key}")
        return True
    else:
        print(f"\n⚠️  Generation failed or invalid for {file_key}")
        return False


def main():
    """Main generation pipeline."""
    parser = argparse.ArgumentParser(description='JnanaSetu AI Misconception Generation Pipeline')
    parser.add_argument('--pdf', type=str, help='Path to PDF file to process')
    parser.add_argument('--file', type=str, help='File key identifier (e.g. maths7_ch2.pdf)')
    args = parser.parse_args()

    # Batch mode: triggered from backend
    if args.pdf and args.file:
        print(f"Processing PDF: {args.pdf}")
        print(f"File key: {args.file}")
        success = process_pdf(args.pdf, args.file)
        sys.exit(0 if success else 1)

    # Interactive mode - list available PDFs from backend data directory
    print("=" * 60)
    print("JnanaSetu AI Misconception Generation Pipeline")
    print("=" * 60)

    # Look for PDFs in the backend data/pdfs directory
    backend_pdfs_dir = BASE_DIR.parent / 'backend' / 'data' / 'pdfs'
    if backend_pdfs_dir.exists():
        pdf_files = list(backend_pdfs_dir.glob('*.pdf'))
        if pdf_files:
            print(f"\nFound {len(pdf_files)} PDF(s) in backend data directory:")
            for pdf in pdf_files:
                print(f"  - {pdf.name}")
                process_pdf(str(pdf), pdf.name)
        else:
            print("\nNo PDFs found in backend/data/pdfs/")
            print("Place PDF files there and run this script again.")
    else:
        print(f"\nBackend PDF directory not found: {backend_pdfs_dir}")
        print("Create the directory and place PDF files there.")

    print("\nGeneration complete!")


if __name__ == '__main__':
    main()
