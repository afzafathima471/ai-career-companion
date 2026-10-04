import pymupdf
import docx
from docx.oxml.ns import qn
from docx.table import Table
from docx.text.paragraph import Paragraph


def extract_text(file_path: str, file_type: str) -> str:
    if file_type == "pdf":
        return _extract_pdf(file_path)
    elif file_type == "docx":
        return _extract_docx(file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")


def _extract_pdf(file_path: str) -> str:
    text_parts = []
    with pymupdf.open(file_path) as pdf:
        for page in pdf:
            text_parts.append(page.get_text())
    return "\n".join(text_parts).strip()


def _extract_docx(file_path: str) -> str:
    """Body paragraphs AND table cells, in document order (many resumes lay out sections in tables)."""
    document = docx.Document(file_path)
    parts = []
    for child in document.element.body.iterchildren():
        if child.tag == qn("w:p"):
            parts.append(Paragraph(child, document).text)
        elif child.tag == qn("w:tbl"):
            for row in Table(child, document).rows:
                cells = []
                for cell in row.cells:
                    t = cell.text.strip()
                    if t and t not in cells:  # merged cells repeat their text
                        cells.append(t)
                if cells:
                    parts.append(" | ".join(cells))
    return "\n".join(parts).strip()
