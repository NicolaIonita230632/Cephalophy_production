"""
Evaluation and documentation of user evaluation Endpoint.
"""

# Import packages
import base64
import os
from datetime import datetime
from io import BytesIO
from typing import Optional
from xml.sax.saxutils import escape

from fastapi import APIRouter, Body
from fastapi.responses import FileResponse
from reportlab import platypus
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Flowable

from api.schemas.eval import GenerateDocRequest

router = APIRouter()


class FullWidthRemainingHeightImage(Flowable):
    def __init__(self, img_reader):
        super().__init__()
        self.img = img_reader

    def wrap(self, availWidth, availHeight):
        iw, ih = self.img.getSize()
        aspect = ih / iw

        # Compute height if scaled by width
        height_by_width = availWidth * aspect
        # Compute width if scaled by height
        width_by_height = availHeight / aspect

        # Decide which dimension to scale by
        if height_by_width <= availHeight:
            # Width is limiting, scale by width
            self.width = availWidth
            self.height = height_by_width
        else:
            # Height is limiting, scale by height
            self.height = availHeight
            self.width = width_by_height

        return self.width, self.height

    def draw(self):
        self.canv.drawImage(
            self.img,
            0,
            0,
            width=self.width,
            height=self.height,
            preserveAspectRatio=True,
            mask="auto",
        )


def draw_header(canvas, doc, logo_path, logo_width=50, logo_height=50, margin=10):
    """
    Draw a header logo on each page.

    Args:
    canvas:
        The canvas to draw on.
    doc:
        The document object.
    logo_path (str):
        Path or base64 data URL of the logo image.
    logo_width (int, default=50):
        Width of the logo in the document.
    logo_height (int, default=50):
        Height of the logo in the document.
    margin (int, default=10):
        Margin from the edges of the document.
    """
    if logo_path:
        # Load image
        if "," in logo_path and logo_path.startswith("data:"):
            img_reader = base64_to_image_reader(logo_path)
        else:
            img_reader = ImageReader(logo_path)

        # Draw the image in top-left corner
        canvas.drawImage(
            img_reader,
            margin,
            doc.pagesize[1] - logo_height - margin,
            width=logo_width,
            height=logo_height,
            preserveAspectRatio=True,
            mask="auto",
        )


def draw_title_bg(canvas, doc, bg_color):
    """
    Draw background color on title page.

    Args:
    canvas:
        The canvas to draw on.
    doc:
        The document object.
    bg_color (str):
        Background color as a string (hex or name) or reportlab Color object.
    """
    # convert hex or name
    if isinstance(bg_color, str):
        if bg_color.startswith("#") and len(bg_color) == 7:
            r = int(bg_color[1:3], 16) / 255
            g = int(bg_color[3:5], 16) / 255
            b = int(bg_color[5:7], 16) / 255
            bg_color = colors.Color(r, g, b)
        else:
            bg_color = getattr(colors, bg_color.lower(), colors.white)

    canvas.saveState()
    canvas.setFillColor(bg_color)
    canvas.rect(0, 0, doc.pagesize[0], doc.pagesize[1], fill=1, stroke=0)
    canvas.restoreState()


def base64_to_image_reader(data_url: str):
    """
    Convert a base64 data URL to a ReportLab ImageReader.

    Args:
    data_url (str):
        Base64 data URL of the image.

    Returns:
    ImageReader:
        ReportLab ImageReader object.
    """
    # Remove the prefix if present
    header, encoded = data_url.split(",", 1)
    data = base64.b64decode(encoded)
    return ImageReader(BytesIO(data))


def create_title_page(elements, main_title, author, patient, descr, title_img, styles):
    """
    Create title page elements.

    Args:
    elements (list):
        List of document elements.
    main_title (str):
        Main title of the document.
    author (str):
        Author of the document.
    patient (str):
        Patient identifier.
    descr (str):
        Description text.
    title_img (str):
        Image path or base64 data URL for the title page.
    styles (dict):
        Dictionary of styles for the document.
    Returns:
    list:
        Updated list of document elements.
    """
    # elements.append(PageBackground(title_bg))
    elements.append(platypus.Paragraph(escape(main_title), styles["TitlePage"]))
    elements.append(platypus.Spacer(1, 12))
    if author and author != "":
        elements.append(
            platypus.Paragraph(f"Author(s): {escape(author)}", styles["Author"])
        )
    if patient and patient != "":
        elements.append(
            platypus.Paragraph(f"Patient: {escape(patient)}", styles["Author"])
        )
    elements.append(
        platypus.Paragraph(
            f"Date: {datetime.now().strftime('%d-%m-%Y')}", styles["Author"]
        )
    )
    if descr and descr != "":
        elements.append(platypus.Paragraph(escape(descr), styles["Author"]))
        elements.append(platypus.Spacer(1, 12))
    if title_img and title_img != "":
        if "," in title_img and title_img.startswith("data:"):
            img_read = base64_to_image_reader(title_img)
        else:
            img_read = ImageReader(title_img)

        elements.append(FullWidthRemainingHeightImage(img_read))

    elements.append(platypus.PageBreak())

    return elements


def add_single_images(elements, imgs, captions, styles, fig_n):
    """
    Adds single images with captions to the document elements.

    Args:
    elements (list):
        List of document elements.
    imgs (list):
        List of image paths or base64 data URLs.
    captions (list):
        List of captions for the images.
    styles (dict):
        Dictionary of styles for the document.
    fig_n (int):
        Starting figure number.
    Returns:
    int:
        Updated figure number.
    list:
        Updated list of document elements.
    """
    MAX_WIDTH = 500
    MAX_HEIGHT = 300
    for img_idx, img in enumerate(imgs):
        if "," in img and img.startswith("data:"):
            img_read = base64_to_image_reader(img)
        else:
            img_read = ImageReader(img)
        iw, ih = img_read.getSize()

        aspect = ih / iw

        if iw > MAX_WIDTH or ih > MAX_HEIGHT:
            if iw > ih:
                width = MAX_WIDTH
                height = width * aspect
            else:
                height = MAX_HEIGHT
                width = height / aspect
        else:
            width, height = iw, ih

        elements.append(platypus.Image(img, width=width, height=height))
        # Check if caption exists for this image.
        if img_idx < len(captions) and captions[img_idx]:
            caption_text = f"Figure {fig_n}: {escape(captions[img_idx])}"
        else:
            caption_text = f"Figure {fig_n}"
        elements.append(platypus.Paragraph(caption_text, styles["Caption"]))
        elements.append(platypus.Spacer(1, 12))
        fig_n += 1
    return fig_n, elements


def add_grid(elements, imgs, captions, styles, fig_n, cols=2):
    """
    Adds a grid of images with captions to the document elements.

    Args:
    elements (list):
        List of document elements.
    imgs (list):
        List of image paths or base64 data URLs.
    captions (list):
        List of captions for the images.
    styles (dict):
        Dictionary of styles for the document.
    fig_n (int):
        Starting figure number.
    cols (int, default=2):
        Number of columns in the grid.
    Returns:
    int:
        Updated figure number.
    """
    MAX_CELL_WIDTH = 180
    MAX_CELL_HEIGHT = 140

    rows = []
    row = []

    for i, img in enumerate(imgs):
        if "," in img and img.startswith("data:"):
            img_read = base64_to_image_reader(img)
        else:
            img_read = ImageReader(img)
        iw, ih = img_read.getSize()
        aspect = ih / iw
        if iw > MAX_CELL_WIDTH or ih > MAX_CELL_HEIGHT:
            if iw > ih:
                width = MAX_CELL_WIDTH
                height = width * aspect
            else:
                height = MAX_CELL_HEIGHT
                width = height / aspect
        else:
            width, height = iw, ih
        # Build image + caption cell.
        caption = captions[i] if i < len(captions) else ""
        caption_text = (
            f"Figure {fig_n}: {escape(caption)}" if caption else f"Figure {fig_n}"
        )
        fig_n += 1

        cell = [
            platypus.Image(img, width=width, height=height),
            platypus.Paragraph(caption_text, styles["Caption"]),
        ]
        row.append(cell)

        if len(row) == cols:
            rows.append(row)
            row = []
    # Add padding for leftover cells.
    if row:
        while len(row) < cols:
            row.append("")
        rows.append(row)
    if rows:
        table = platypus.Table(rows, hAlign="CENTER")
        table.setStyle(
            platypus.TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
            ])
        )
        elements.append(table)
        elements.append(platypus.Spacer(1, 24))

    return fig_n, elements


@router.post("/generate_doc")
def generate_document(
    payload: GenerateDocRequest = Body(...),
):
    """
    Generate a PDF document showing analysis results, notes, and metrics.

    Args:
    GenerateDocRequest:
        Payload containing all necessary information for document generation.
        include_title (bool):
            Whether to include a title page in the document.
        main_title (str):
            Main title of the generated document.
        author (str):
            Author of the generated document.
        patient (str):
            Patient identifier to show on the title page.
        descr (str):
            Description to show on the title page.
        logo (str):
            Logo image base64 data URL displayed in the header
        title_bg (str):
            Background style or colour for the title page
        title_img (str):
            Image to show in the title page of the generated document.
        titles_li (list):
            List or array of titles in the generated document.
        img_li (list):
            List or array of images to show in the generated document.
        notes_li (list):
            List or array of notes from the user to show in the generated document.
        metrics_li (list):
            List or array of metrics shown in analysis page.
        path (str, default='temp_pdfs/pdf_report.pdf'):
            Path of saving PDF until user downloads the file.
    """
    # Collect all important values from payload.
    include_title = payload.include_title
    logo = payload.logo
    title_img = payload.title_img
    main_title = payload.main_title
    author = payload.author
    patient = payload.patient
    descr = payload.descr
    title_bg = payload.title_bg
    titles_li = payload.titles_li
    img_li = payload.img_li
    notes_li = payload.notes_li
    metrics_li = payload.metrics_li
    img_captions_li = payload.img_captions_li or []
    image_layout = payload.image_layout or ["single", "single", "grid2"]

    path = "temp_pdfs"
    os.makedirs(path, exist_ok=True)
    pdf_path = os.path.join(path, "report.pdf")
    # Set up the document
    doc = platypus.SimpleDocTemplate(pdf_path, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = []
    fig_n = 1

    # Create styles for custom objects.
    styles.add(
        ParagraphStyle(
            name="TitlePage",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=28,
            alignment=1,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Author",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=11,
            alignment=1,
            spaceAfter=12,
        )
    )
    # Style for image captions.
    styles.add(
        ParagraphStyle(
            name="Caption",
            parent=styles["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=10,
            alignment=1,
            spaceAfter=12,
            textColor=colors.grey,
        )
    )
    if include_title:
        # Print out information about title page.
        print("Adding title page")
        print(f"  - Title: {main_title}")
        print(f"  - Author: {author}")
        print(f"  - Description: {descr}")
        print(f"  - Has title_img: {bool(title_img and title_img != '')}")
        elements = create_title_page(
            elements, main_title, author, patient, descr, title_img, styles
        )
        print(f"  - Elements count after title page: {len(elements)}")
    else:
        print("Skipping title page (include_title is False)")

    elements.append(platypus.Paragraph("Prediction Analysis", styles["Heading1"]))
    for idx, (title, imgs, note, metrics) in enumerate(
        zip(titles_li, img_li, notes_li, metrics_li)
    ):
        elements.append(platypus.Paragraph(title, styles["Heading2"]))
        layout = image_layout[idx] if idx < len(image_layout) else "single"
        sect_captions = []
        if idx < len(img_captions_li):
            sect_captions = img_captions_li[idx]
        if imgs:
            # Check the selected layout type.
            if layout == "single":
                fig_n, elements = add_single_images(
                    elements, imgs, sect_captions, styles, fig_n
                )
            elif layout == "grid2":
                fig_n, elements = add_grid(
                    elements, imgs, sect_captions, styles, fig_n, cols=2
                )
            elif layout == "grid3":
                fig_n, elements = add_grid(
                    elements, imgs, sect_captions, styles, fig_n, cols=3
                )
            else:
                fig_n, elements = add_single_images(
                    elements, imgs, sect_captions, styles, fig_n
                )
        if note:
            elements.append(platypus.Paragraph("Notes:", styles["Heading3"]))
            elements.append(platypus.Paragraph(escape(note)))
            elements.append(platypus.Spacer(1, 12))
        if metrics:
            if isinstance(metrics, dict) and metrics:
                # Get headers from first entry.
                first_entry = next(iter(metrics.values()))

                if isinstance(first_entry, dict):
                    headers = ["Measurement"] + list(first_entry.keys())
                    data = [headers]

                    for measurement, values in metrics.items():
                        row = [measurement] + [
                            values.get(key, "") for key in first_entry.keys()
                        ]
                        data.append(row)
                else:
                    # Handle simple key-value pairs.
                    data = [["Measurement", "Value"]]
                    for measurement, value in metrics.items():
                        data.append([measurement, value])

                print(data)
                metrics = data
            # Create table again.
            table = platypus.Table(metrics, hAlign="LEFT")
            table.setStyle(
                platypus.TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.whitesmoke),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 11),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ])
            )
            elements.append(table)
            elements.append(platypus.Spacer(1, 12))
        elements.append(platypus.PageBreak())
    if not include_title:
        title_bg = "white"
    doc.build(
        elements,
        onFirstPage=lambda canvas, doc: draw_title_bg(canvas, doc, title_bg)
        or draw_header(canvas, doc, logo),
        onLaterPages=lambda c, d: draw_header(c, d, logo),
    )
    print(f"pdf saved at {path}.")


@router.get("/download_doc")
def download_document(path: Optional[str] = "temp_pdfs"):
    pdf_path = os.path.join(path, "report.pdf")
    return FileResponse(pdf_path, media_type="application/pdf", filename="report.pdf")
