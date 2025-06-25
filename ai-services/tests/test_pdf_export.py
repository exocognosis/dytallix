import sys
from pathlib import Path

import pytest
from PyPDF2 import PdfReader

# Allow importing from the src directory
sys.path.append(str(Path(__file__).resolve().parents[1] / "src"))

from pdf_export import export_analysis_to_pdf


def test_short_analysis(tmp_path: Path) -> None:
    output = tmp_path / "short.pdf"
    export_analysis_to_pdf("Short analysis", str(output))
    reader = PdfReader(str(output))
    assert len(reader.pages) == 1


def test_long_analysis(tmp_path: Path) -> None:
    output = tmp_path / "long.pdf"
    long_text = "Lorem ipsum " * 500  # create long text to span multiple pages
    export_analysis_to_pdf(long_text, str(output))
    reader = PdfReader(str(output))
    assert len(reader.pages) > 1
