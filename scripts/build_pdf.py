"""Render docs/AI_TOOLS_OVERVIEW.md to docs/AI_TOOLS_OVERVIEW.pdf."""
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs" / "AI_TOOLS_OVERVIEW.md"
OUT = ROOT / "docs" / "AI_TOOLS_OVERVIEW.pdf"

INK = colors.HexColor("#1a1a1a")
MUTED = colors.HexColor("#555555")
ACCENT = colors.HexColor("#1B8F6A")
RULE = colors.HexColor("#dddddd")
ZEBRA = colors.HexColor("#f4f6f5")

styles = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=styles["Heading1"], fontName="Helvetica-Bold",
                   fontSize=22, leading=26, textColor=INK, spaceBefore=4, spaceAfter=10)
H2 = ParagraphStyle("H2", parent=styles["Heading2"], fontName="Helvetica-Bold",
                    fontSize=15, leading=19, textColor=ACCENT, spaceBefore=14, spaceAfter=6)
H3 = ParagraphStyle("H3", parent=styles["Heading3"], fontName="Helvetica-Bold",
                    fontSize=12, leading=15, textColor=INK, spaceBefore=10, spaceAfter=3)
BODY = ParagraphStyle("Body", parent=styles["BodyText"], fontName="Helvetica",
                      fontSize=10.5, leading=15, textColor=INK, alignment=TA_LEFT,
                      spaceAfter=6)
BULLET = ParagraphStyle("Bullet", parent=BODY, leftIndent=14, bulletIndent=2,
                        spaceAfter=2)
SMALL = ParagraphStyle("Small", parent=BODY, fontSize=9, textColor=MUTED, leading=12)


def inline(text: str) -> str:
    """Convert simple markdown inline syntax to ReportLab markup."""
    # escape ampersands first
    text = text.replace("&", "&amp;")
    # bold **x**
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    # italic *x*
    text = re.sub(r"(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)", r"<i>\1</i>", text)
    # code `x`
    text = re.sub(r"`([^`]+)`", r'<font name="Courier">\1</font>', text)
    return text


def parse_md(md_text: str):
    lines = md_text.splitlines()
    flow = []
    i = 0
    in_table = False
    table_rows = []

    def flush_table():
        nonlocal table_rows
        if not table_rows:
            return
        # First row is header, second is divider, rest body
        header = table_rows[0]
        body = [r for r in table_rows[2:]] if len(table_rows) > 2 else []
        data = [header] + body
        # wrap each cell in Paragraph for wrapping
        wrapped = [[Paragraph(inline(c), BODY) for c in row] for row in data]
        col_widths = [3.2 * cm, 4.5 * cm, 6.5 * cm, 4.0 * cm]
        t = Table(wrapped, colWidths=col_widths, repeatRows=1)
        ts = TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), ACCENT),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9.5),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, ZEBRA]),
            ("GRID", (0, 0), (-1, -1), 0.4, RULE),
        ])
        # rebuild header row text in white
        for col in range(len(header)):
            wrapped[0][col] = Paragraph(
                f'<font color="#ffffff"><b>{inline(header[col])}</b></font>', BODY)
        t = Table(wrapped, colWidths=col_widths, repeatRows=1)
        t.setStyle(ts)
        flow.append(Spacer(1, 4))
        flow.append(t)
        flow.append(Spacer(1, 8))
        table_rows = []

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # table detection
        if stripped.startswith("|") and stripped.endswith("|"):
            cells = [c.strip() for c in stripped.strip("|").split("|")]
            table_rows.append(cells)
            in_table = True
            i += 1
            continue
        elif in_table:
            flush_table()
            in_table = False

        if not stripped:
            i += 1
            continue

        if stripped.startswith("# "):
            flow.append(Paragraph(inline(stripped[2:]), H1))
        elif stripped.startswith("## "):
            flow.append(Paragraph(inline(stripped[3:]), H2))
        elif stripped.startswith("### "):
            flow.append(Paragraph(inline(stripped[4:]), H3))
        elif stripped.startswith("---"):
            flow.append(Spacer(1, 4))
            flow.append(HRFlowable(width="100%", thickness=0.5, color=RULE,
                                    spaceBefore=2, spaceAfter=8))
        elif stripped.startswith("- "):
            # collect contiguous bullets, supporting wrapped continuations
            while i < len(lines) and lines[i].strip().startswith("- "):
                item = lines[i].strip()[2:]
                # join wrapped continuation lines (indented, not blank, not new bullet)
                j = i + 1
                while (j < len(lines) and lines[j].startswith("  ")
                       and not lines[j].strip().startswith("- ")
                       and lines[j].strip() != ""):
                    item += " " + lines[j].strip()
                    j += 1
                flow.append(Paragraph(inline(item), BULLET, bulletText="•"))
                i = j
            continue
        else:
            # plain paragraph; merge wrapped lines
            buf = [stripped]
            j = i + 1
            while j < len(lines):
                nxt = lines[j].strip()
                if (not nxt or nxt.startswith("#") or nxt.startswith("- ")
                        or nxt.startswith("|") or nxt.startswith("---")):
                    break
                buf.append(nxt)
                j += 1
            flow.append(Paragraph(inline(" ".join(buf)), BODY))
            i = j
            continue

        i += 1

    if in_table:
        flush_table()

    return flow


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(2 * cm, 1.2 * cm, "AI-Built Tools — Overview")
    canvas.drawRightString(A4[0] - 2 * cm, 1.2 * cm, f"Page {doc.page}")
    canvas.restoreState()


def build():
    md_text = SRC.read_text(encoding="utf-8")
    flow = parse_md(md_text)
    doc = SimpleDocTemplate(
        str(OUT), pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm,
        topMargin=2 * cm, bottomMargin=2 * cm,
        title="AI-Built Tools — Overview",
        author="Arun Prakash",
    )
    doc.build(flow, onFirstPage=header_footer, onLaterPages=header_footer)
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    build()
