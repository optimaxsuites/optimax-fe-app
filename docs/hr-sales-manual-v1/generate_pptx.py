"""
Generate a PowerPoint version of the OptimaX HR Sales Manual.
Run:
  python3 generate_pptx.py
"""

from pathlib import Path
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

ROOT = Path(__file__).resolve().parent
SHOT_DIR = ROOT / "assets" / "screenshots"
OUT = ROOT / "optimax-hr-sales-manual.pptx"

BRAND = RGBColor(0x1C, 0x4F, 0xD7)
BRAND_DARK = RGBColor(0x0F, 0x1F, 0x39)
TEXT = RGBColor(0x10, 0x21, 0x3A)
MUTED = RGBColor(0x5C, 0x6D, 0x87)
LINE = RGBColor(0xD9, 0xE2, 0xF1)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
BG = RGBColor(0xF6, 0xF8, 0xFC)

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
BLANK = prs.slide_layouts[6]


def rect(slide, x, y, w, h, fill, line=None):
    shape = slide.shapes.add_shape(1, x, y, w, h)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill
    if line:
      shape.line.color.rgb = line
      shape.line.width = Pt(1)
    else:
      shape.line.fill.background()
    return shape


def textbox(slide, text, x, y, w, h, size=Pt(18), bold=False, color=TEXT, align=PP_ALIGN.LEFT):
    box = slide.shapes.add_textbox(x, y, w, h)
    tf = box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.alignment = align
    r = p.add_run()
    r.text = text
    r.font.name = "Segoe UI"
    r.font.size = size
    r.font.bold = bold
    r.font.color.rgb = color
    return box


def header(slide, title, subtitle):
    rect(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.15), BRAND_DARK)
    textbox(slide, title, Inches(0.45), Inches(0.18), Inches(8), Inches(0.38), Pt(24), True, WHITE)
    textbox(slide, subtitle, Inches(0.45), Inches(0.6), Inches(8.6), Inches(0.25), Pt(10), False, RGBColor(0xD7, 0xE3, 0xFB))


def shot_or_placeholder(slide, filename, label, x, y, w, h):
    rect(slide, x, y, w, h, WHITE, LINE)
    textbox(slide, label, x + Inches(0.12), y + Inches(0.08), w - Inches(0.24), Inches(0.2), Pt(9), True, MUTED)
    path = SHOT_DIR / filename
    if path.exists():
        slide.shapes.add_picture(str(path), x + Inches(0.12), y + Inches(0.38), w - Inches(0.24), h - Inches(0.5))
    else:
        inner = rect(slide, x + Inches(0.12), y + Inches(0.38), w - Inches(0.24), h - Inches(0.5), BG, LINE)
        textbox(
            slide,
            f"Missing exact screenshot\n{filename}",
            x + Inches(0.35),
            y + Inches(1.15),
            w - Inches(0.7),
            Inches(0.8),
            Pt(13),
            True,
            MUTED,
            PP_ALIGN.CENTER,
        )


slides = [
    {
        "title": "OptimaX Human Resource Module",
        "subtitle": "Sales and Marketing Edition",
        "body": [
            "Unified HR workspace across employee records, recruitment, attendance, leave, payroll, loans, and performance.",
            "Designed for business-led demos and customer-facing storytelling.",
        ],
        "shot": "hr-dashboard.png",
        "shot_label": "Exact Screenshot: HR Dashboard",
    },
    {
        "title": "HR Navigation",
        "subtitle": "How to frame the module quickly in a demo",
        "body": [
            "Use the HR sidebar to explain the module by function, not by technical depth.",
            "Show how users move from summary to list view to action form without leaving the module.",
            "Position the interface as easier to train than disconnected HR tools.",
        ],
        "shot": "hr-navigation.png",
        "shot_label": "Exact Screenshot: HR Navigation",
    },
    {
        "title": "Employee Management",
        "subtitle": "The foundation of the HR story",
        "body": [
            "Employee directory for central staff visibility.",
            "Structured employee creation and record management.",
            "Rich profile data including guarantor, next of kin, and employment details.",
        ],
        "shot": "hr-employee-directory.png",
        "shot_label": "Exact Screenshot: Employee Directory",
    },
    {
        "title": "Recruitment",
        "subtitle": "From openings to candidates and interviews",
        "body": [
            "Show job openings, candidate pipeline, and interview workflow.",
            "Position recruitment as a move away from spreadsheet-based hiring.",
        ],
        "shot": "hr-recruitment.png",
        "shot_label": "Exact Screenshot: Recruitment",
    },
    {
        "title": "Attendance and Leave",
        "subtitle": "High-frequency HR operations",
        "body": [
            "Attendance improves visibility into daily workforce activity.",
            "Leave workflows formalize requests, approvals, and planning.",
        ],
        "shot": "hr-attendance.png",
        "shot_label": "Exact Screenshot: Attendance",
    },
    {
        "title": "Payroll",
        "subtitle": "Trust, transparency, and operational control",
        "body": [
            "Use payroll and payslips to show structured records and employee confidence.",
            "Connect HR actions to finance coordination and audit clarity.",
        ],
        "shot": "hr-payroll.png",
        "shot_label": "Exact Screenshot: Payroll",
    },
    {
        "title": "Loans, Performance, and Scheduling",
        "subtitle": "Differentiators for the right buyer profile",
        "body": [
            "Loan and cooperative flows show deeper employee support capability.",
            "Performance and scheduling extend the module beyond recordkeeping.",
        ],
        "shot": "hr-performance.png",
        "shot_label": "Exact Screenshot: Performance and Scheduling",
    },
    {
        "title": "Recommended Demo Sequence",
        "subtitle": "How marketers and sales teams should present the module",
        "body": [
            "1. Overview",
            "2. Employee Management",
            "3. Recruitment",
            "4. Attendance and Leave",
            "5. Payroll",
            "6. Loans and Performance when relevant",
        ],
        "shot": "hr-loan-management.png",
        "shot_label": "Exact Screenshot: Loan Management",
    },
]


for idx, spec in enumerate(slides):
    slide = prs.slides.add_slide(BLANK)
    rect(slide, Inches(0), Inches(0), Inches(13.333), Inches(7.5), BG)
    if idx == 0:
        rect(slide, Inches(0), Inches(0), Inches(13.333), Inches(7.5), BRAND_DARK)
        rect(slide, Inches(7.6), Inches(0), Inches(5.733), Inches(7.5), BRAND)
        textbox(slide, "OFFICIAL USER MANUAL", Inches(0.6), Inches(1.1), Inches(3.1), Inches(0.25), Pt(8), True, RGBColor(0xD7, 0xE3, 0xFB))
        textbox(slide, spec["title"], Inches(0.6), Inches(1.45), Inches(6.6), Inches(0.9), Pt(30), True, WHITE)
        textbox(slide, spec["subtitle"], Inches(0.6), Inches(2.35), Inches(6.2), Inches(0.45), Pt(20), True, RGBColor(0x9D, 0xC0, 0xFF))
        textbox(slide, "A fresh HR manual workspace for sales and marketing teams.", Inches(0.6), Inches(3.1), Inches(5.7), Inches(0.45), Pt(11), False, RGBColor(0xD7, 0xE3, 0xFB))
        shot_or_placeholder(slide, spec["shot"], spec["shot_label"], Inches(7.95), Inches(1.2), Inches(4.7), Inches(4.8))
        continue

    header(slide, spec["title"], spec["subtitle"])
    textbox(slide, "Key points", Inches(0.5), Inches(1.45), Inches(2), Inches(0.25), Pt(12), True, TEXT)

    body_box = slide.shapes.add_textbox(Inches(0.55), Inches(1.8), Inches(5.2), Inches(4.9))
    tf = body_box.text_frame
    tf.word_wrap = True
    for i, line in enumerate(spec["body"]):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.level = 0
        p.space_after = Pt(8)
        r = p.add_run()
        r.text = f"• {line}"
        r.font.name = "Segoe UI"
        r.font.size = Pt(15 if idx == 1 else 14)
        r.font.color.rgb = TEXT

    shot_or_placeholder(slide, spec["shot"], spec["shot_label"], Inches(6.2), Inches(1.45), Inches(6.55), Inches(5.45))

prs.save(OUT)
print(f"Created {OUT}")
