import pymupdf
import docx


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
    document = docx.Document(file_path)
    return "\n".join(p.text for p in document.paragraphs).strip()
