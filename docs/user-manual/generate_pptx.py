"""
Generate OptimaX HR Module User Manual PowerPoint (Sales & Marketing Edition)
Run: python3 generate_pptx.py
"""

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches, Pt
import copy

# ── Colour palette ──────────────────────────────────────────────────────────
BRAND      = RGBColor(0x1A, 0x56, 0xDB)   # deep blue
BRAND_DARK = RGBColor(0x0F, 0x17, 0x2A)   # near-black
ACCENT     = RGBColor(0x2E, 0xB2, 0x70)   # green
AMBER      = RGBColor(0xF5, 0x9E, 0x0B)   # amber
RED_COL    = RGBColor(0xEF, 0x44, 0x44)   # red
SLATE_700  = RGBColor(0x33, 0x41, 0x55)
SLATE_500  = RGBColor(0x64, 0x74, 0x8B)
SLATE_200  = RGBColor(0xE2, 0xE8, 0xF0)
WHITE      = RGBColor(0xFF, 0xFF, 0xFF)
LIGHT_BLUE = RGBColor(0xDB, 0xEA, 0xFE)
LIGHT_GRN  = RGBColor(0xDC, 0xFC, 0xE7)
LIGHT_AMB  = RGBColor(0xFE, 0xF3, 0xC7)
LIGHT_RED  = RGBColor(0xFE, 0xE2, 0xE2)
BG_LIGHT   = RGBColor(0xF8, 0xFA, 0xFC)

prs = Presentation()
prs.slide_width  = Inches(13.33)
prs.slide_height = Inches(7.5)

BLANK = prs.slide_layouts[6]   # truly blank layout


# ── Helpers ──────────────────────────────────────────────────────────────────

def add_rect(slide, l, t, w, h, fill=None, line_color=None, line_width=Pt(0)):
    from pptx.util import Pt
    shape = slide.shapes.add_shape(1, l, t, w, h)  # MSO_SHAPE_TYPE.RECTANGLE = 1
    shape.line.width = line_width
    if fill:
        shape.fill.solid()
        shape.fill.fore_color.rgb = fill
    else:
        shape.fill.background()
    if line_color:
        shape.line.color.rgb = line_color
        shape.line.width = line_width if line_width else Pt(1)
    else:
        shape.line.fill.background()
    return shape


def add_text_box(slide, text, l, t, w, h,
                 size=Pt(12), bold=False, italic=False,
                 color=SLATE_700, align=PP_ALIGN.LEFT,
                 wrap=True, font_name="Segoe UI"):
    txBox = slide.shapes.add_textbox(l, t, w, h)
    txBox.word_wrap = wrap
    tf = txBox.text_frame
    tf.word_wrap = wrap
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    run.font.name  = font_name
    run.font.size  = size
    run.font.bold  = bold
    run.font.color.rgb = color
    run.font.italic = italic
    return txBox


def add_para(tf, text, size=Pt(11), bold=False, color=SLATE_700,
             space_before=Pt(4), align=PP_ALIGN.LEFT, font_name="Segoe UI"):
    p = tf.add_paragraph()
    p.alignment = align
    p.space_before = space_before
    run = p.add_run()
    run.text = text
    run.font.name  = font_name
    run.font.size  = size
    run.font.bold  = bold
    run.font.color.rgb = color
    return p


def slide_header(slide, title, subtitle=None, title_color=WHITE, bg=BRAND):
    """Dark header bar at top of slide."""
    add_rect(slide, Inches(0), Inches(0), Inches(13.33), Inches(1.5), fill=bg)
    add_text_box(slide, title,
                 Inches(0.5), Inches(0.18), Inches(10), Inches(0.7),
                 size=Pt(24), bold=True, color=title_color)
    if subtitle:
        add_text_box(slide, subtitle,
                     Inches(0.5), Inches(0.85), Inches(10), Inches(0.5),
                     size=Pt(12), color=RGBColor(0xBF, 0xD7, 0xFF))


def bullet_box(slide, items, l, t, w, h, dot_color=BRAND,
               text_size=Pt(11), heading=None):
    """Add a box with bullet points."""
    if heading:
        add_text_box(slide, heading, l, t, w, Inches(0.35),
                     size=Pt(12), bold=True, color=SLATE_700)
        t += Inches(0.38)
        h -= Inches(0.38)

    txBox = slide.shapes.add_textbox(l, t, w, h)
    txBox.word_wrap = True
    tf = txBox.text_frame
    tf.word_wrap = True
    first = True
    for item in items:
        p = tf.paragraphs[0] if first else tf.add_paragraph()
        first = False
        p.space_before = Pt(3)
        run = p.add_run()
        run.text = f"•  {item}"
        run.font.name  = "Segoe UI"
        run.font.size  = text_size
        run.font.color.rgb = SLATE_700


def feature_card(slide, l, t, w, h, icon, title, desc,
                 icon_bg=LIGHT_BLUE, icon_color=BRAND):
    add_rect(slide, l, t, w, h, fill=WHITE,
             line_color=SLATE_200, line_width=Pt(1))
    # icon circle
    add_rect(slide, l + Inches(0.18), t + Inches(0.18),
             Inches(0.5), Inches(0.5), fill=icon_bg)
    add_text_box(slide, icon,
                 l + Inches(0.18), t + Inches(0.18),
                 Inches(0.5), Inches(0.5),
                 size=Pt(16), align=PP_ALIGN.CENTER, color=icon_color)
    add_text_box(slide, title,
                 l + Inches(0.18), t + Inches(0.76), w - Inches(0.36), Inches(0.3),
                 size=Pt(11), bold=True, color=SLATE_700)
    add_text_box(slide, desc,
                 l + Inches(0.18), t + Inches(1.05), w - Inches(0.36), h - Inches(1.1),
                 size=Pt(9), color=SLATE_500, wrap=True)


def screenshot_placeholder(slide, l, t, w, h, label, description):
    """Dashed-border screenshot area with label."""
    add_rect(slide, l, t, w, h, fill=BG_LIGHT,
             line_color=SLATE_200, line_width=Pt(1.5))
    add_text_box(slide, f"📸  {label}",
                 l + Inches(0.1), t + Inches(0.1), w - Inches(0.2), Inches(0.35),
                 size=Pt(9), bold=True, color=SLATE_500)
    add_text_box(slide, description,
                 l + Inches(0.15), t + Inches(0.5), w - Inches(0.3), h - Inches(0.65),
                 size=Pt(8.5), color=SLATE_500, wrap=True, italic=True)


def step_row(slide, number, title, detail, t_y, l=Inches(0.5)):
    """Single numbered step row."""
    # circle
    add_rect(slide, l, t_y, Inches(0.38), Inches(0.38),
             fill=BRAND)
    add_text_box(slide, str(number),
                 l, t_y, Inches(0.38), Inches(0.38),
                 size=Pt(10), bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    add_text_box(slide, title,
                 l + Inches(0.48), t_y, Inches(4.5), Inches(0.22),
                 size=Pt(10), bold=True, color=SLATE_700)
    add_text_box(slide, detail,
                 l + Inches(0.48), t_y + Inches(0.22), Inches(4.8), Inches(0.22),
                 size=Pt(9), color=SLATE_500)


# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 1 — COVER
# ══════════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK)

# background gradient-like split
add_rect(slide, 0, 0, Inches(13.33), Inches(7.5), fill=BRAND_DARK)
add_rect(slide, Inches(7.5), 0, Inches(5.83), Inches(7.5), fill=BRAND)

# decorative circle
from pptx.util import Emu
cir = slide.shapes.add_shape(9, Inches(8), Inches(-1), Inches(5), Inches(5))  # oval
cir.fill.solid(); cir.fill.fore_color.rgb = RGBColor(0x1E,0x40,0x80)
cir.line.fill.background()

# eyebrow
add_rect(slide, Inches(0.6), Inches(1.2), Inches(3.2), Inches(0.32),
         fill=RGBColor(0x1E,0x3A,0x8A))
add_text_box(slide, "📘  OFFICIAL USER MANUAL",
             Inches(0.65), Inches(1.22), Inches(3.1), Inches(0.28),
             size=Pt(8), bold=True, color=RGBColor(0xBF,0xD7,0xFF))

# title
add_text_box(slide, "OptimaX ERP",
             Inches(0.6), Inches(1.65), Inches(7), Inches(0.7),
             size=Pt(38), bold=True, color=WHITE)
add_text_box(slide, "Human Resource Module",
             Inches(0.6), Inches(2.35), Inches(7), Inches(0.65),
             size=Pt(32), bold=True, color=RGBColor(0x93,0xC5,0xFD))

# subtitle
add_text_box(slide,
             "A comprehensive guide for Sales & Marketing teams to understand,\n"
             "demonstrate, and present OptimaX HR to prospects and clients.",
             Inches(0.6), Inches(3.1), Inches(7), Inches(0.8),
             size=Pt(12), color=RGBColor(0xBF,0xD7,0xFF), wrap=True)

# meta pills
for i, (label, val) in enumerate([
    ("Module", "Human Resources"),
    ("Audience", "Sales & Marketing"),
    ("Version", "2025 Edition"),
    ("Last Updated", "May 2025"),
]):
    x = Inches(0.6) + i * Inches(1.68)
    add_rect(slide, x, Inches(4.2), Inches(1.6), Inches(0.65),
             fill=RGBColor(0x1E,0x3A,0x8A),
             line_color=RGBColor(0x2D,0x4E,0x9A), line_width=Pt(1))
    add_text_box(slide, label.upper(),
                 x + Inches(0.08), Inches(4.25), Inches(1.44), Inches(0.25),
                 size=Pt(7), color=RGBColor(0x93,0xC5,0xFD), bold=True)
    add_text_box(slide, val,
                 x + Inches(0.08), Inches(4.47), Inches(1.44), Inches(0.3),
                 size=Pt(9), color=WHITE, bold=True)

# right side tagline
add_text_box(slide, "Everything HR.\nOne Platform.",
             Inches(8.2), Inches(2.5), Inches(4.5), Inches(1.2),
             size=Pt(28), bold=True, color=WHITE, align=PP_ALIGN.CENTER)
add_text_box(slide, "Employee Management · Payroll · Recruitment\n"
                    "Attendance · Leave · Loans · Performance · Schedules",
             Inches(8.2), Inches(3.8), Inches(4.5), Inches(0.9),
             size=Pt(10), color=RGBColor(0xBF,0xD7,0xFF),
             align=PP_ALIGN.CENTER, wrap=True)


# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 2 — AGENDA / TABLE OF CONTENTS
# ══════════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK)
add_rect(slide, 0, 0, Inches(13.33), Inches(7.5), fill=BG_LIGHT)
slide_header(slide, "What's Covered in This Manual", "HR Module — Sales & Marketing Edition")

chapters = [
    ("01", "Platform Overview", "What is OptimaX? Modules & value proposition"),
    ("02", "Application Navigation", "Layout, sidebar, and HR sub-navigation"),
    ("03", "Employee Management", "Directory, adding employees, staff ID cards"),
    ("04", "Recruitment", "Vacancies, candidates, interviews, offer letters"),
    ("05", "Attendance Tracking", "Clock-in/out, sheets, timesheets, notifications"),
    ("06", "Leave Management", "Requests, approvals, planning, policies"),
    ("07", "Payroll", "Processing, approvals, payslips, deductions"),
    ("08", "Loans & Contributions", "Employee loans, cooperative module"),
    ("09", "Performance & Schedules", "Goals, appraisals, shift planning"),
    ("10", "Sales Playbook", "Demo flow, talking points, objection handling"),
]

cols = 2
rows = 5
for i, (num, title, desc) in enumerate(chapters):
    col = i % cols
    row = i // cols
    x = Inches(0.4) + col * Inches(6.4)
    y = Inches(1.65) + row * Inches(1.1)
    add_rect(slide, x, y, Inches(6.1), Inches(0.95),
             fill=WHITE, line_color=SLATE_200, line_width=Pt(1))
    add_rect(slide, x, y, Inches(0.5), Inches(0.95), fill=BRAND)
    add_text_box(slide, num, x, y, Inches(0.5), Inches(0.95),
                 size=Pt(10), bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    add_text_box(slide, title, x + Inches(0.58), y + Inches(0.1),
                 Inches(5.3), Inches(0.32), size=Pt(11), bold=True, color=SLATE_700)
    add_text_box(slide, desc, x + Inches(0.58), y + Inches(0.45),
                 Inches(5.3), Inches(0.35), size=Pt(9), color=SLATE_500)


# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 3 — PLATFORM OVERVIEW
# ══════════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK)
add_rect(slide, 0, 0, Inches(13.33), Inches(7.5), fill=BG_LIGHT)
slide_header(slide, "OptimaX — The All-in-One Business Platform",
             "Replace 6–10 disconnected tools with one integrated ERP")

modules = [
    ("👥", "Human Resources", "Employee lifecycle, payroll, attendance, leave", LIGHT_BLUE, BRAND),
    ("💳", "Point of Sale", "Retail transactions, receipts, inventory sync", LIGHT_GRN, ACCENT),
    ("📊", "Accounting", "Ledgers, invoicing, financial statements", LIGHT_AMB, AMBER),
    ("🤝", "CRM", "Customer pipeline, deals, contacts", RGBColor(0xED,0xE9,0xFE), RGBColor(0x6D,0x28,0xD9)),
    ("📦", "Inventory", "Stock control, warehouse, reorder rules", LIGHT_GRN, ACCENT),
    ("🛒", "Procurement", "Vendor mgmt, purchase orders, supply chain", LIGHT_RED, RED_COL),
    ("💰", "Sales", "Quotes, orders, revenue tracking", LIGHT_AMB, AMBER),
    ("🏨", "Hospitality", "Hotel operations, booking, room management", LIGHT_BLUE, BRAND),
]

cols = 4
for i, (icon, name, desc, bg, col) in enumerate(modules):
    c = i % cols
    r = i // cols
    x = Inches(0.3) + c * Inches(3.2)
    y = Inches(1.7) + r * Inches(2.5)
    feature_card(slide, x, y, Inches(3.0), Inches(2.25), icon, name, desc, bg, col)


# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 4 — NAVIGATION
# ══════════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK)
add_rect(slide, 0, 0, Inches(13.33), Inches(7.5), fill=BG_LIGHT)
slide_header(slide, "Navigating OptimaX", "Three main zones — sidebar, navbar, and main workspace")

# Left column: layout description
add_text_box(slide, "Application Layout", Inches(0.4), Inches(1.65),
             Inches(5.5), Inches(0.3), size=Pt(13), bold=True, color=SLATE_700)

zones = [
    ("🔵", "Left Sidebar", "Module navigation — click any icon to switch between HR, Sales, CRM, etc."),
    ("🟣", "Top Navbar", "User profile, notifications, workspace toggle, and sidebar collapse"),
    ("🟢", "Main Workspace", "Active module content — lists, forms, dashboards, reports"),
]
for i, (dot, zone, desc) in enumerate(zones):
    y = Inches(2.05) + i * Inches(1.1)
    add_rect(slide, Inches(0.4), y, Inches(5.5), Inches(0.95),
             fill=WHITE, line_color=SLATE_200, line_width=Pt(1))
    add_text_box(slide, dot, Inches(0.5), y + Inches(0.22),
                 Inches(0.35), Inches(0.35), size=Pt(16))
    add_text_box(slide, zone, Inches(0.95), y + Inches(0.1),
                 Inches(4.8), Inches(0.28), size=Pt(11), bold=True, color=SLATE_700)
    add_text_box(slide, desc, Inches(0.95), y + Inches(0.42),
                 Inches(4.8), Inches(0.4), size=Pt(9), color=SLATE_500, wrap=True)

# Right column: HR sub-menu list
add_text_box(slide, "HR Sub-Navigation Menu", Inches(6.5), Inches(1.65),
             Inches(6.4), Inches(0.3), size=Pt(13), bold=True, color=SLATE_700)

hr_menus = [
    ("👤", "My Dashboard"),
    ("👥", "Employee Management"),
    ("📋", "Recruitment"),
    ("🎯", "Performance"),
    ("📅", "Work Schedule"),
    ("💰", "Payroll"),
    ("🏦", "Contributions & Loans"),
    ("🕐", "Attendance"),
    ("🌴", "Leave"),
    ("📊", "Work Productivity"),
]
cols2 = 2
for i, (icon, name) in enumerate(hr_menus):
    c = i % cols2
    r = i // cols2
    x = Inches(6.5) + c * Inches(3.2)
    y = Inches(2.05) + r * Inches(0.5)
    add_rect(slide, x, y, Inches(3.0), Inches(0.42),
             fill=WHITE, line_color=SLATE_200, line_width=Pt(1))
    add_text_box(slide, icon, x + Inches(0.08), y + Inches(0.03),
                 Inches(0.3), Inches(0.36), size=Pt(12))
    add_text_box(slide, name, x + Inches(0.42), y + Inches(0.08),
                 Inches(2.5), Inches(0.26), size=Pt(10), color=SLATE_700, bold=True)

screenshot_placeholder(slide,
    Inches(0.4), Inches(5.5), Inches(12.53), Inches(1.7),
    "SCREENSHOT: Full Application Layout",
    "Capture the full browser window showing sidebar + navbar + HR workspace. "
    "Log in as Administrator for maximum menu visibility.")


# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 5 — EMPLOYEE MANAGEMENT
# ══════════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK)
add_rect(slide, 0, 0, Inches(13.33), Inches(7.5), fill=BG_LIGHT)
slide_header(slide, "Employee Management",
             "HR → Employee Management  |  Central hub for all staff records")

# stats bar
stats = [("Headcount", "48", "Employees"), ("Visible", "12", "This page"),
         ("Levels", "5", "Groupings"), ("Positions", "14", "Active titles")]
for i, (label, val, sub) in enumerate(stats):
    x = Inches(0.4) + i * Inches(2.2)
    add_rect(slide, x, Inches(1.6), Inches(2.0), Inches(1.0),
             fill=WHITE, line_color=SLATE_200, line_width=Pt(1))
    add_text_box(slide, label.upper(), x + Inches(0.12), Inches(1.68),
                 Inches(1.76), Inches(0.22), size=Pt(7.5), bold=True,
                 color=SLATE_500)
    add_text_box(slide, val, x + Inches(0.12), Inches(1.88),
                 Inches(1.76), Inches(0.45), size=Pt(24), bold=True, color=SLATE_700)
    add_text_box(slide, sub, x + Inches(0.12), Inches(2.32),
                 Inches(1.76), Inches(0.2), size=Pt(8), color=SLATE_500)

# features list
add_text_box(slide, "Key Features", Inches(0.4), Inches(2.8),
             Inches(5.5), Inches(0.3), size=Pt(12), bold=True, color=SLATE_700)
bullet_box(slide, [
    "Visual employee card grid — photo, name, role, department, status",
    "Filter by Level, Position, or search by name in real time",
    "Add new employees via a detailed slide-in form",
    "View comprehensive tabbed employee profiles",
    "Generate & download QR-coded digital Staff ID cards",
    "Delete or deactivate employee records with one click",
    "Profile change request workflow for employee self-updates",
], Inches(0.4), Inches(3.15), Inches(5.5), Inches(3.5), text_size=Pt(10))

# screenshot placeholder
screenshot_placeholder(slide,
    Inches(6.2), Inches(1.6), Inches(6.8), Inches(5.7),
    "SCREENSHOT: Employee Directory Card Grid",
    "Navigate to HR → Employee Management.\n"
    "Capture the 4 summary stat cards at top, the toolbar with filters and "
    "'Add new employee' button, and the employee card grid below showing multiple staff cards.")


# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 6 — EMPLOYEE CARD ANATOMY
# ══════════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK)
add_rect(slide, 0, 0, Inches(13.33), Inches(7.5), fill=BG_LIGHT)
slide_header(slide, "Employee Card — At a Glance",
             "Every employee is represented as a rich data card")

card_elements = [
    ("🏷️", "Department Badge", "Color-coded department label at top of card"),
    ("🟢", "Status Indicator", "Pulsing green = Active | Amber = Away"),
    ("📷", "Profile Photo", "Employee photo or default avatar placeholder"),
    ("✏️", "Full Name", "Last name + First name, prominently displayed"),
    ("💼", "Job Title", "Role/position as configured in employment settings"),
    ("📧", "Work Email", "Official email address for communication"),
    ("🏢", "Dept. & Type Chips", "Department chip + Employment type (Full/Part/Contract)"),
    ("📊", "Level & Type Row", "Organizational level and job category"),
    ("📅", "Date Joined", "Employee hire/start date"),
    ("🪪", "Staff ID Button", "Opens printable QR-coded identity card"),
    ("👁️", "View Profile Button", "Opens full tabbed employee record for editing"),
    ("🗑️", "Delete Action", "Remove employee record (admin only)"),
]

cols = 3
for i, (icon, title, desc) in enumerate(card_elements):
    c = i % cols
    r = i // cols
    x = Inches(0.3) + c * Inches(4.3)
    y = Inches(1.65) + r * Inches(1.3)
    add_rect(slide, x, y, Inches(4.1), Inches(1.15),
             fill=WHITE, line_color=SLATE_200, line_width=Pt(1))
    add_text_box(slide, icon, x + Inches(0.12), y + Inches(0.12),
                 Inches(0.4), Inches(0.4), size=Pt(14))
    add_text_box(slide, title, x + Inches(0.6), y + Inches(0.12),
                 Inches(3.35), Inches(0.28), size=Pt(10.5), bold=True, color=SLATE_700)
    add_text_box(slide, desc, x + Inches(0.6), y + Inches(0.45),
                 Inches(3.35), Inches(0.55), size=Pt(9), color=SLATE_500, wrap=True)


# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 7 — RECRUITMENT
# ══════════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK)
add_rect(slide, 0, 0, Inches(13.33), Inches(7.5), fill=BG_LIGHT)
slide_header(slide, "Recruitment — Full Hiring Pipeline",
             "HR → Recruitment  |  From vacancy to appointment letter in one system")

# Pipeline flow
stages = [
    ("1", "Create\nVacancy", BRAND),
    ("2", "Post Job\nOpening", RGBColor(0x06,0x95,0x5D)),
    ("3", "Receive\nApplications", AMBER),
    ("4", "Screen\nCandidates", RGBColor(0x7C,0x3A,0xED)),
    ("5", "Schedule\nInterview", RGBColor(0x0E,0x7A,0xBF)),
    ("6", "Score &\nDecide", RED_COL),
    ("7", "Send Offer\nLetter", ACCENT),
    ("8", "Appointment\nLetter", RGBColor(0xD9,0x77,0x06)),
    ("9", "Onboard\nEmployee", RGBColor(0x06,0x5F,0x46)),
]

step_w = Inches(1.3)
gap = Inches(0.12)
start_x = Inches(0.35)
y_row = Inches(1.65)

for i, (num, label, col) in enumerate(stages):
    x = start_x + i * (step_w + gap)
    add_rect(slide, x, y_row, step_w, Inches(1.4), fill=col)
    add_text_box(slide, num, x, y_row + Inches(0.06), step_w, Inches(0.35),
                 size=Pt(14), bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    add_text_box(slide, label, x, y_row + Inches(0.45), step_w, Inches(0.85),
                 size=Pt(9), bold=True, color=WHITE, align=PP_ALIGN.CENTER, wrap=True)
    if i < len(stages) - 1:
        add_text_box(slide, "▶", x + step_w + Inches(0.01), y_row + Inches(0.48),
                     gap, Inches(0.4), size=Pt(9), color=SLATE_500, align=PP_ALIGN.CENTER)

# Features split
add_text_box(slide, "Recruitment Capabilities", Inches(0.4), Inches(3.25),
             Inches(5.8), Inches(0.3), size=Pt(12), bold=True, color=SLATE_700)
bullet_box(slide, [
    "Create structured job vacancies with salary range & requirements",
    "Publish openings to external job portal automatically",
    "Receive and track all candidate applications",
    "Send automated interview invitation emails",
    "Digital interview scoring sheets for consistent evaluation",
    "Generate branded offer letters within the system",
    "Produce formal appointment letters with one click",
], Inches(0.4), Inches(3.6), Inches(5.8), Inches(3.5), text_size=Pt(10))

screenshot_placeholder(slide,
    Inches(6.5), Inches(3.2), Inches(6.5), Inches(4.0),
    "SCREENSHOT: Recruitment — Candidate List",
    "Navigate to HR → Recruitment → Candidates tab.\n"
    "Capture the table showing candidate names, positions, application dates, "
    "status badges (Screening/Interview/Offer/Hired), and action buttons.")


# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 8 — ATTENDANCE
# ══════════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK)
add_rect(slide, 0, 0, Inches(13.33), Inches(7.5), fill=BG_LIGHT)
slide_header(slide, "Attendance Tracking",
             "HR → Attendance  |  Real-time presence monitoring for every employee")

add_text_box(slide, "Module Tabs", Inches(0.4), Inches(1.65),
             Inches(12.5), Inches(0.28), size=Pt(11), bold=True, color=SLATE_700)

tabs = ["Attendance Sheet", "My Attendance", "Time Sheet", "Notifications", "Admin View"]
for i, tab in enumerate(tabs):
    x = Inches(0.4) + i * Inches(2.4)
    fill = BRAND if i == 0 else WHITE
    tc = WHITE if i == 0 else SLATE_700
    add_rect(slide, x, Inches(1.98), Inches(2.25), Inches(0.38),
             fill=fill, line_color=BRAND if i == 0 else SLATE_200, line_width=Pt(1))
    add_text_box(slide, tab, x, Inches(2.0), Inches(2.25), Inches(0.34),
                 size=Pt(9.5), bold=(i==0), color=tc, align=PP_ALIGN.CENTER)

# Columns
add_text_box(slide, "Attendance Sheet (Admin)", Inches(0.4), Inches(2.55),
             Inches(5.8), Inches(0.28), size=Pt(11), bold=True, color=SLATE_700)
bullet_box(slide, [
    "Filter attendance by date — see full daily roll",
    "Employee clock-in and clock-out times",
    "Total working hours per employee",
    "Late arrival flag with timestamp",
    "Status: Present / Absent / Late",
    "Bulk mark attendance for shift workers",
], Inches(0.4), Inches(2.88), Inches(5.8), Inches(2.2), text_size=Pt(10))

add_text_box(slide, "My Attendance (Employee)", Inches(0.4), Inches(5.15),
             Inches(5.8), Inches(0.28), size=Pt(11), bold=True, color=SLATE_700)
bullet_box(slide, [
    "Personal calendar view of attendance history",
    "Running count: days present, absent, late",
    "Self-service — reduces HR support queries",
], Inches(0.4), Inches(5.48), Inches(5.8), Inches(1.6), text_size=Pt(10))

screenshot_placeholder(slide,
    Inches(6.5), Inches(2.5), Inches(6.5), Inches(4.7),
    "SCREENSHOT: Attendance Sheet",
    "Navigate to HR → Attendance → Attendance Sheet.\n"
    "Capture the date picker at top and the employee table below "
    "showing clock-in, clock-out, hours worked, and status columns.")


# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 9 — LEAVE MANAGEMENT
# ══════════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK)
add_rect(slide, 0, 0, Inches(13.33), Inches(7.5), fill=BG_LIGHT)
slide_header(slide, "Leave Management",
             "HR → Leave  |  Requests, approvals, planning, and policy in one place")

tabs2 = ["Leave Plan", "My Leave", "Plan Dashboard", "Plan Requests", "Leave Requests", "Leave Policy"]
for i, tab in enumerate(tabs2):
    x = Inches(0.35) + i * Inches(2.12)
    fill = BRAND if i == 0 else WHITE
    tc = WHITE if i == 0 else SLATE_700
    add_rect(slide, x, Inches(1.6), Inches(2.0), Inches(0.38),
             fill=fill, line_color=BRAND if i == 0 else SLATE_200, line_width=Pt(1))
    add_text_box(slide, tab, x, Inches(1.62), Inches(2.0), Inches(0.34),
                 size=Pt(8.5), bold=(i==0), color=tc, align=PP_ALIGN.CENTER)

# Three feature cards
leave_cards = [
    ("📝", "Leave Plan", "Submit upcoming leave requests with leave type, dates, and reason. System auto-calculates working days.", LIGHT_BLUE, BRAND),
    ("👤", "My Leave", "Personal leave dashboard: days allocated, used, and remaining. Visual calendar of leave periods.", LIGHT_GRN, ACCENT),
    ("🗓️", "Plan Dashboard", "Organization-wide leave timeline. Managers see who is on leave on any date — prevents understaffing.", LIGHT_AMB, AMBER),
    ("✅", "Leave Requests", "Admin/manager approval view. Approve or reject with optional reason. Balance updates immediately.", LIGHT_RED, RED_COL),
    ("📖", "Leave Policy", "Define leave types (Annual, Medical, Maternity, etc.), allocations per year, and carry-over rules.", RGBColor(0xED,0xE9,0xFE), RGBColor(0x7C,0x3A,0xED)),
]

for i, (icon, name, desc, bg, col) in enumerate(leave_cards):
    c = i % 3
    r = i // 3
    x = Inches(0.3) + c * Inches(4.3)
    y = Inches(2.15) + r * Inches(2.4)
    feature_card(slide, x, y, Inches(4.1), Inches(2.2), icon, name, desc, bg, col)

screenshot_placeholder(slide,
    Inches(0.3), Inches(6.5), Inches(12.73), Inches(0.8),
    "SCREENSHOT NEEDED — Leave Plan Dashboard showing the org-wide leave timeline/calendar view",
    "Navigate to HR → Leave → Plan Dashboard. Capture the calendar/Gantt view showing employee leave periods.")


# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 10 — PAYROLL
# ══════════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK)
add_rect(slide, 0, 0, Inches(13.33), Inches(7.5), fill=BG_LIGHT)
slide_header(slide, "Payroll Management",
             "HR → Payroll  |  Automated salary processing with multi-stage approval")

# Left: components table
add_text_box(slide, "Payroll Components", Inches(0.4), Inches(1.65),
             Inches(5.5), Inches(0.28), size=Pt(11), bold=True, color=SLATE_700)

components = [
    ("Base Salary", "Earnings", LIGHT_BLUE, BRAND),
    ("Transportation Allowance", "Earnings", LIGHT_BLUE, BRAND),
    ("Meal Allowance", "Earnings", LIGHT_BLUE, BRAND),
    ("Housing Allowance", "Earnings", LIGHT_BLUE, BRAND),
    ("Bonus / Overtime", "Earnings", LIGHT_GRN, ACCENT),
    ("Income Tax (PAYE)", "Deduction", LIGHT_RED, RED_COL),
    ("Pension Contribution", "Deduction", LIGHT_RED, RED_COL),
    ("Loan Repayment", "Deduction", LIGHT_RED, RED_COL),
    ("NET PAY", "Result", LIGHT_GRN, ACCENT),
]

for i, (comp, typ, bg, tc) in enumerate(components):
    y = Inches(2.0) + i * Inches(0.5)
    add_rect(slide, Inches(0.4), y, Inches(3.8), Inches(0.44),
             fill=WHITE, line_color=SLATE_200, line_width=Pt(1))
    add_rect(slide, Inches(4.25), y, Inches(1.4), Inches(0.44), fill=bg)
    add_text_box(slide, comp, Inches(0.52), y + Inches(0.08),
                 Inches(3.6), Inches(0.26),
                 size=Pt(9.5 if comp != "NET PAY" else 10.5),
                 bold=(comp == "NET PAY"), color=SLATE_700)
    add_text_box(slide, typ, Inches(4.25), y, Inches(1.4), Inches(0.44),
                 size=Pt(8.5), color=tc, bold=True, align=PP_ALIGN.CENTER)

# Right: approval flow
add_text_box(slide, "Multi-Stage Approval Workflow", Inches(6.2), Inches(1.65),
             Inches(6.8), Inches(0.28), size=Pt(11), bold=True, color=SLATE_700)

approval_steps = [
    ("1", "HR Prepares Payroll", "Reviews entries, confirms attendance & loan deductions"),
    ("2", "Stage 1 Approval", "HR Manager reviews and approves or rejects"),
    ("3", "Stage 2 Approval", "Finance Director gives final sign-off"),
    ("4", "Payroll Locked", "Payroll is locked; payslips available to employees"),
]
for i, (num, title, detail) in enumerate(approval_steps):
    y = Inches(2.0) + i * Inches(0.88)
    add_rect(slide, Inches(6.2), y, Inches(6.8), Inches(0.78),
             fill=WHITE, line_color=SLATE_200, line_width=Pt(1))
    add_rect(slide, Inches(6.2), y, Inches(0.5), Inches(0.78), fill=BRAND)
    add_text_box(slide, num, Inches(6.2), y, Inches(0.5), Inches(0.78),
                 size=Pt(13), bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    add_text_box(slide, title, Inches(6.78), y + Inches(0.06),
                 Inches(5.9), Inches(0.3), size=Pt(10.5), bold=True, color=SLATE_700)
    add_text_box(slide, detail, Inches(6.78), y + Inches(0.38),
                 Inches(5.9), Inches(0.28), size=Pt(9), color=SLATE_500)

screenshot_placeholder(slide,
    Inches(0.4), Inches(6.6), Inches(12.53), Inches(0.65),
    "SCREENSHOT: Payroll Dashboard — capture the approval progress tracker showing stages in different states (completed/current/pending)",
    "Navigate to HR → Payroll. Capture the header showing month/year and the approval progress grid.")


# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 11 — LOANS & CONTRIBUTIONS
# ══════════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK)
add_rect(slide, 0, 0, Inches(13.33), Inches(7.5), fill=BG_LIGHT)
slide_header(slide, "Loans & Contributions",
             "HR → Contributions and Loans  |  Employee loans + full cooperative management")

add_text_box(slide, "Employee Loan Workflow", Inches(0.4), Inches(1.65),
             Inches(5.8), Inches(0.28), size=Pt(12), bold=True, color=SLATE_700)

loan_steps = [
    ("1", "Employee Submits Request", "Selects loan purpose, amount, and repayment period"),
    ("2", "HR Reviews Eligibility", "Checks salary, existing loans, and tenure"),
    ("3", "Loan Approval/Rejection", "Authorized approver signs off with optional note"),
    ("4", "Disbursement to Bank", "Approved loan amount is transferred to employee account"),
    ("5", "Auto Payroll Deduction", "Monthly repayments automatically deducted until settled"),
]
for i, (num, title, detail) in enumerate(loan_steps):
    step_row(slide, num, title, detail,
             t_y=Inches(2.05) + i * Inches(0.72),
             l=Inches(0.4))

# Cooperative cards
add_text_box(slide, "Cooperative Management Module", Inches(6.5), Inches(1.65),
             Inches(6.4), Inches(0.28), size=Pt(12), bold=True, color=SLATE_700)

coop_cards = [
    ("🤝", "Cooperative Dashboard", "Funds overview, active loans, member counts"),
    ("👥", "Member Management", "Enrollment, contributions, withdrawal tracking"),
    ("💰", "Cooperative Loans", "Group loan requests with approval workflows"),
    ("📊", "Patronage Distribution", "Distribute dividends and patronage refunds"),
    ("⏱️", "Grace Period Mgmt", "Handle grace period requests from members"),
    ("📋", "Loan Reports", "Detailed reports on all loan activity"),
]
for i, (icon, name, desc) in enumerate(coop_cards):
    c = i % 2
    r = i // 2
    x = Inches(6.5) + c * Inches(3.2)
    y = Inches(2.05) + r * Inches(1.55)
    feature_card(slide, x, y, Inches(3.0), Inches(1.4),
                 icon, name, desc, LIGHT_BLUE, BRAND)


# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 12 — PERFORMANCE & WORK SCHEDULE
# ══════════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK)
add_rect(slide, 0, 0, Inches(13.33), Inches(7.5), fill=BG_LIGHT)
slide_header(slide, "Performance & Work Schedules",
             "Goal tracking, appraisals, shift planning, and productivity measurement")

# Performance col
add_text_box(slide, "Performance Management  |  HR → Performance",
             Inches(0.4), Inches(1.65), Inches(5.8), Inches(0.28),
             size=Pt(11), bold=True, color=SLATE_700)
perf_cards = [
    ("🎯", "Goal Setting", "Set measurable goals with deadlines and success criteria for each employee.", LIGHT_BLUE, BRAND),
    ("📈", "Goal Tracking", "Monitor progress with completion % and status updates in real time.", LIGHT_GRN, ACCENT),
    ("📋", "Appraisals", "Structured performance review forms for manager-employee evaluations.", LIGHT_AMB, AMBER),
]
for i, (icon, name, desc, bg, col) in enumerate(perf_cards):
    y = Inches(2.05) + i * Inches(1.5)
    feature_card(slide, Inches(0.4), y, Inches(5.8), Inches(1.4),
                 icon, name, desc, bg, col)

# Divider
add_rect(slide, Inches(6.5), Inches(1.6), Inches(0.02), Inches(5.6),
         fill=SLATE_200)

# Work Schedule col
add_text_box(slide, "Work Schedule & Shifts  |  HR → Work Schedule",
             Inches(6.7), Inches(1.65), Inches(6.2), Inches(0.28),
             size=Pt(11), bold=True, color=SLATE_700)

sched_steps = [
    ("1", "Create Shift Patterns", "Define shift name, start/end time, working days, break duration"),
    ("2", "Assign to Employees", "Select employees and assign them to a shift for a date range"),
    ("3", "View Shift Calendar", "Monthly calendar showing all assigned shifts visually"),
    ("4", "My Schedule Tab", "Employee self-service view of upcoming shifts"),
]
for i, (num, title, detail) in enumerate(sched_steps):
    step_row(slide, num, title, detail,
             t_y=Inches(2.05) + i * Inches(0.75),
             l=Inches(6.7))

screenshot_placeholder(slide,
    Inches(0.4), Inches(6.55), Inches(12.53), Inches(0.7),
    "SCREENSHOT: Shift Calendar — Navigate to HR → Work Schedule → Shift Calendar. Capture the monthly calendar with shift blocks.",
    "")


# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 13 — ROLES & PERMISSIONS
# ══════════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK)
add_rect(slide, 0, 0, Inches(13.33), Inches(7.5), fill=BG_LIGHT)
slide_header(slide, "Roles & Permissions",
             "Role-based access ensures every user sees only what they need")

roles = ["Administrator", "HR Manager", "Line Manager", "Employee"]
role_colors = [RED_COL, BRAND, AMBER, ACCENT]

permissions = [
    ("View all employees",      [True, True, "Team", False]),
    ("Add / Edit employees",    [True, True, False, False]),
    ("Delete employees",        [True, False, False, False]),
    ("Run payroll",             [True, True, False, False]),
    ("Approve payroll",         [True, "Stage", False, False]),
    ("View own payslip",        [True, True, True, True]),
    ("Approve leave requests",  [True, True, "Team", False]),
    ("Apply for leave",         [True, True, True, True]),
    ("Manage recruitment",      [True, True, False, False]),
    ("View own attendance",     [True, True, True, True]),
    ("Request a loan",          [True, True, True, True]),
    ("Approve loans",           [True, True, False, False]),
]

# header row
header_y = Inches(1.6)
col_w = Inches(2.3)
row_h = Inches(0.44)
label_w = Inches(3.7)

add_rect(slide, Inches(0.3), header_y, label_w, row_h, fill=BRAND_DARK)
add_text_box(slide, "Permission", Inches(0.4), header_y,
             label_w - Inches(0.1), row_h,
             size=Pt(9), bold=True, color=WHITE)

for ci, (role, col) in enumerate(zip(roles, role_colors)):
    x = Inches(0.3) + label_w + ci * col_w
    add_rect(slide, x, header_y, col_w, row_h, fill=col)
    add_text_box(slide, role, x, header_y, col_w, row_h,
                 size=Pt(9), bold=True, color=WHITE, align=PP_ALIGN.CENTER)

for ri, (perm, vals) in enumerate(permissions):
    y = header_y + row_h + ri * row_h
    bg = BG_LIGHT if ri % 2 == 0 else WHITE
    add_rect(slide, Inches(0.3), y, label_w, row_h, fill=bg,
             line_color=SLATE_200, line_width=Pt(0.5))
    add_text_box(slide, perm, Inches(0.4), y, label_w - Inches(0.1), row_h,
                 size=Pt(9), color=SLATE_700)
    for ci, val in enumerate(vals):
        x = Inches(0.3) + label_w + ci * col_w
        add_rect(slide, x, y, col_w, row_h, fill=bg,
                 line_color=SLATE_200, line_width=Pt(0.5))
        if val is True:
            sym, color = "✅", ACCENT
        elif val is False:
            sym, color = "❌", RED_COL
        else:
            sym, color = str(val), AMBER
        add_text_box(slide, sym, x, y, col_w, row_h,
                     size=Pt(9.5), color=color, align=PP_ALIGN.CENTER, bold=True)


# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 14 — SALES DEMO FLOW
# ══════════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK)
add_rect(slide, 0, 0, Inches(13.33), Inches(7.5), fill=BG_LIGHT)
slide_header(slide, "Recommended Demo Flow",
             "5-step sequence proven to resonate with HR decision-makers")

demo_steps = [
    ("1", "Employee Directory", BRAND,
     "Show the card grid. Filter by department. Click Staff ID to show QR-coded ID card.\nVisual impact is immediate — prospects love this."),
    ("2", "Payroll Processing", RGBColor(0x06,0x95,0x5D),
     "Display the approval tracker. Open a payslip. Emphasize multi-stage approval and auto loan deductions."),
    ("3", "Leave Management", AMBER,
     "Submit a leave request as employee, switch to admin and approve.\nShow the leave balance update in real time."),
    ("4", "Recruitment Pipeline", RGBColor(0x7C,0x3A,0xED),
     "Create a vacancy, show candidate pipeline, open an offer letter template.\nEmphasize end-to-end in one system."),
    ("5", "Attendance & Shifts", RED_COL,
     "Show the attendance sheet with clock-in/out times.\nIf prospect has shift workers, demo the Shift Calendar."),
]

for i, (num, title, col, desc) in enumerate(demo_steps):
    y = Inches(1.65) + i * Inches(1.1)
    add_rect(slide, Inches(0.3), y, Inches(12.73), Inches(0.98),
             fill=WHITE, line_color=SLATE_200, line_width=Pt(1))
    add_rect(slide, Inches(0.3), y, Inches(0.6), Inches(0.98), fill=col)
    add_text_box(slide, num, Inches(0.3), y, Inches(0.6), Inches(0.98),
                 size=Pt(16), bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    add_text_box(slide, title, Inches(1.05), y + Inches(0.06),
                 Inches(4.5), Inches(0.3), size=Pt(12), bold=True, color=SLATE_700)
    add_text_box(slide, desc, Inches(1.05), y + Inches(0.4),
                 Inches(11.9), Inches(0.48), size=Pt(9.5), color=SLATE_500, wrap=True)


# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 15 — OBJECTION HANDLING
# ══════════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK)
add_rect(slide, 0, 0, Inches(13.33), Inches(7.5), fill=BG_LIGHT)
slide_header(slide, "Common Objections & Winning Responses",
             "Prepared answers for the most frequent prospect concerns")

objections = [
    ("'We already have a payroll system'",
     "OptimaX integrates payroll with attendance, leave, and loans — one source of truth. No more import/export between tools."),
    ("'Our HR needs are simple'",
     "Start with what you need today (employee directory + payroll) and activate more features as you grow — no system migration required."),
    ("'Is it hard to learn?'",
     "Most features work in under 3 clicks. Designed for non-technical HR staff. Full onboarding training and documentation included."),
    ("'How secure is employee data?'",
     "Role-based access means employees only see their own data. Salary and BVN are protected. All data encrypted at rest and in transit."),
    ("'Does it work for multiple branches?'",
     "Yes — multi-workspace support. Each branch operates independently; HQ gets consolidated reporting across all locations."),
]

for i, (obj, resp) in enumerate(objections):
    y = Inches(1.6) + i * Inches(1.12)
    add_rect(slide, Inches(0.3), y, Inches(12.73), Inches(1.0),
             fill=WHITE, line_color=SLATE_200, line_width=Pt(1))
    # left: objection
    add_rect(slide, Inches(0.3), y, Inches(4.0), Inches(1.0),
             fill=LIGHT_RED)
    add_text_box(slide, obj, Inches(0.42), y + Inches(0.1),
                 Inches(3.8), Inches(0.8), size=Pt(9.5), bold=True,
                 color=RED_COL, wrap=True)
    # arrow
    add_text_box(slide, "→", Inches(4.32), y + Inches(0.3),
                 Inches(0.3), Inches(0.4), size=Pt(14), bold=True, color=SLATE_500)
    # right: response
    add_text_box(slide, resp, Inches(4.7), y + Inches(0.1),
                 Inches(8.2), Inches(0.8), size=Pt(9.5),
                 color=SLATE_700, wrap=True)


# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 16 — TOP 10 TALKING POINTS
# ══════════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK)
add_rect(slide, 0, 0, Inches(13.33), Inches(7.5), fill=BRAND_DARK)
slide_header(slide, "Top 10 HR Selling Points",
             "Key messages for every prospect conversation", bg=RGBColor(0x1E,0x3A,0x8A))

points = [
    ("1", "All-in-One Platform", "Replaces HR software, attendance tracker, payroll tool, and recruitment platform in one subscription."),
    ("2", "Digital Staff ID Cards", "Generate QR-coded ID cards with one click. No design software needed."),
    ("3", "Multi-Stage Payroll Approvals", "Built-in approval workflow ensures payroll can't be processed without proper sign-off."),
    ("4", "Self-Service Employee Portal", "Employees check own attendance, leave balance, and payslips — reduces HR support tickets by up to 60%."),
    ("5", "Real-Time Attendance", "Clock-in/out data updates instantly. No manual entry ever."),
    ("6", "Integrated Loan Management", "Employee loans auto-deducted from payroll — no manual tracking, no errors."),
    ("7", "End-to-End Recruitment", "Job posting to appointment letter — entire hiring process in one system."),
    ("8", "Cooperative Management", "Rare in ERP systems — handles member loans, contributions, and patronage distributions."),
    ("9", "Leave Planning Calendar", "Managers see org-wide leave timeline — prevents understaffing during critical periods."),
    ("10", "Performance + Productivity Link", "Connect HR data with operational output — see if dips in performance correlate with attendance."),
]

col_count = 2
for i, (num, title, desc) in enumerate(points):
    c = i % col_count
    r = i // col_count
    x = Inches(0.3) + c * Inches(6.4)
    y = Inches(1.65) + r * Inches(1.05)
    add_rect(slide, x, y, Inches(6.1), Inches(0.95),
             fill=RGBColor(0x1E,0x3A,0x8A),
             line_color=RGBColor(0x2D,0x4E,0x9A), line_width=Pt(1))
    add_rect(slide, x, y, Inches(0.48), Inches(0.95), fill=BRAND)
    add_text_box(slide, num, x, y, Inches(0.48), Inches(0.95),
                 size=Pt(11), bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    add_text_box(slide, title, x + Inches(0.58), y + Inches(0.08),
                 Inches(5.4), Inches(0.3), size=Pt(10.5), bold=True, color=WHITE)
    add_text_box(slide, desc, x + Inches(0.58), y + Inches(0.44),
                 Inches(5.4), Inches(0.42), size=Pt(8.5),
                 color=RGBColor(0xBF,0xD7,0xFF), wrap=True)


# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 17 — CLOSING / THANK YOU
# ══════════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK)
add_rect(slide, 0, 0, Inches(13.33), Inches(7.5), fill=BRAND_DARK)

# background accent
add_rect(slide, Inches(9), Inches(0), Inches(4.33), Inches(7.5), fill=BRAND)

add_text_box(slide, "Ready to Close?",
             Inches(0.8), Inches(1.5), Inches(7.5), Inches(0.8),
             size=Pt(38), bold=True, color=WHITE)
add_text_box(slide,
             '"OptimaX HR isn\'t just a tool — it\'s a fully integrated people-management\n'
             'system that grows with your business. From day one, you have the same\n'
             'infrastructure as enterprise companies, without the enterprise price tag."',
             Inches(0.8), Inches(2.4), Inches(7.8), Inches(1.6),
             size=Pt(13), color=RGBColor(0x93,0xC5,0xFD), wrap=True, italic=True)

add_text_box(slide, "Next Steps", Inches(0.8), Inches(4.2),
             Inches(7), Inches(0.3), size=Pt(14), bold=True, color=WHITE)
bullet_box(slide, [
    "Schedule a live demo — 30-minute walkthrough of all HR features",
    "Request a sandbox account for the prospect to explore",
    "Share this manual for async review by their HR team",
    "Propose a pilot program for one department first",
], Inches(0.8), Inches(4.55), Inches(7), Inches(2.2),
    text_size=Pt(11))
for item in []:
    pass

add_text_box(slide, "OptimaX ERP", Inches(9.5), Inches(2.5), Inches(3.5), Inches(0.7),
             size=Pt(28), bold=True, color=WHITE, align=PP_ALIGN.CENTER)
add_text_box(slide, "Human Resource Module\n2025 Edition",
             Inches(9.5), Inches(3.25), Inches(3.5), Inches(0.7),
             size=Pt(13), color=RGBColor(0xBF,0xD7,0xFF),
             align=PP_ALIGN.CENTER, wrap=True)
add_text_box(slide, "Sales & Marketing Reference Guide\nConfidential — Internal Use Only",
             Inches(9.0), Inches(5.5), Inches(4.0), Inches(0.6),
             size=Pt(9), color=RGBColor(0xBF,0xD7,0xFF),
             align=PP_ALIGN.CENTER, wrap=True)


# ══════════════════════════════════════════════════════════════════════════════
# SAVE
# ══════════════════════════════════════════════════════════════════════════════
out_path = "/Users/damilola/optimax-roli/optimax_fe_app/docs/user-manual/optimax-hr-manual.pptx"
prs.save(out_path)
print(f"✅  Saved: {out_path}")
print(f"    Slides: {len(prs.slides)}")
