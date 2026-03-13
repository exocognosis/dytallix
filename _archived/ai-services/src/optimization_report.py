"""Generate a PDF report with charts showing optimization results."""

import math
from io import BytesIO

import matplotlib
matplotlib.use("Agg")  # Use non-GUI backend
import matplotlib.pyplot as plt
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


def run_gradient_descent(iterations: int = 50, lr: float = 0.1):
    """Simple gradient descent on f(x) = (x-3)^2."""
    x = 0.0
    history = []
    for _ in range(iterations):
        grad = 2 * (x - 3)
        x -= lr * grad
        value = (x - 3) ** 2
        history.append(value)
    return history


def create_chart(history):
    """Return a BytesIO buffer with a matplotlib chart."""
    plt.figure(figsize=(6, 3))
    plt.plot(history, marker="o")
    plt.title("Optimization Convergence")
    plt.xlabel("Iteration")
    plt.ylabel("Objective Value")
    plt.tight_layout()
    buf = BytesIO()
    plt.savefig(buf, format="png")
    plt.close()
    buf.seek(0)
    return buf


def generate_pdf(history, output_path="optimization_report.pdf"):
    """Create a PDF file embedding the optimization chart."""
    chart_buf = create_chart(history)
    img = ImageReader(chart_buf)

    c = canvas.Canvas(output_path, pagesize=letter)
    width, height = letter

    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, height - 50, "Optimization Results")

    c.setFont("Helvetica", 12)
    final_value = history[-1]
    c.drawString(50, height - 80, f"Final objective value: {final_value:.6f}")

    # Draw chart
    c.drawImage(img, 50, height - 350, width=500, height=250)

    c.showPage()
    c.save()


if __name__ == "__main__":
    hist = run_gradient_descent()
    generate_pdf(hist)
    print("Generated optimization_report.pdf")
