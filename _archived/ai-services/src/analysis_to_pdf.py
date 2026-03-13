import argparse
import json
from pathlib import Path

import pandas as pd
from fpdf import FPDF


def load_results(path: Path) -> pd.DataFrame:
    with path.open() as f:
        data = json.load(f)
    return pd.DataFrame(data)


class PDFReport(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 16)
        self.cell(0, 10, "Analysis Results", ln=True, align="C")
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")


def add_summary(pdf: PDFReport, df: pd.DataFrame) -> None:
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "Summary", ln=True)

    summary = df["recommended_action"].value_counts().reset_index()
    summary.columns = ["Recommended Action", "Count"]

    pdf.set_font("Helvetica", "", 12)
    col_widths = [80, 30]
    pdf.cell(col_widths[0], 8, summary.columns[0], border=1)
    pdf.cell(col_widths[1], 8, summary.columns[1], border=1, ln=True)
    for _, row in summary.iterrows():
        pdf.cell(col_widths[0], 8, str(row["Recommended Action"]), border=1)
        pdf.cell(col_widths[1], 8, str(row["Count"]), border=1, ln=True)
    pdf.ln(10)


def add_details(pdf: PDFReport, df: pd.DataFrame) -> None:
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "Detailed Results", ln=True)

    headers = ["Transaction ID", "Fraud Score", "Recommendation", "Risk Factors"]
    widths = [40, 30, 50, 70]

    pdf.set_font("Helvetica", "", 11)
    for h, w in zip(headers, widths):
        pdf.cell(w, 8, h, border=1)
    pdf.ln()

    for _, row in df.iterrows():
        pdf.cell(widths[0], 8, str(row.get("transaction_id", ""))[:20], border=1)
        pdf.cell(widths[1], 8, f"{row.get('confidence', 0):.2f}", border=1)
        pdf.cell(widths[2], 8, str(row.get("recommended_action", ""))[:25], border=1)
        risk = ", ".join(row.get("risk_factors", []))
        pdf.cell(widths[3], 8, risk[:40], border=1, ln=True)


def generate_pdf(input_path: Path, output_path: Path) -> None:
    df = load_results(input_path)
    pdf = PDFReport()
    pdf.add_page()
    add_summary(pdf, df)
    add_details(pdf, df)
    pdf.output(str(output_path))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate PDF report from analysis results")
    parser.add_argument("input", type=Path, nargs="?", default=Path("analysis_results.json"), help="Input JSON file")
    parser.add_argument("output", type=Path, nargs="?", default=Path("analysis_report.pdf"), help="Output PDF file")
    args = parser.parse_args()

    generate_pdf(args.input, args.output)
