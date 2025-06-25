from fpdf import FPDF


def export_analysis_to_pdf(text: str, output_path: str) -> None:
    """Export the provided analysis text to a PDF file.

    Parameters
    ----------
    text : str
        Analysis text that may span multiple pages.
    output_path : str
        File path for the output PDF.
    """
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Arial", size=12)

    # Split text into lines to preserve newlines
    for line in text.splitlines():
        pdf.multi_cell(0, 10, line)
    pdf.output(output_path)
