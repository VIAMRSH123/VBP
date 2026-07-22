import csv
import io

from sqlalchemy.orm import Session

from app.models.representative import CsvRepMapping, Representative
from app.services.ai.representative_matching import recommend_representative

REQUIRED_COLUMNS = ["RepresentativeID", "RepresentativeName", "Territory", "ProductCategory"]

MATCH_CONFIDENCE_THRESHOLD = 0.35


def load_representative_csv(db: Session, content: str, filename: str, uploaded_by: str) -> CsvRepMapping:
    reader = csv.DictReader(io.StringIO(content))
    header = reader.fieldnames or []
    missing_columns = [c for c in REQUIRED_COLUMNS if c not in header]

    rows = list(reader)
    valid_rows = 0
    errors: list[str] = []

    if missing_columns:
        errors.append(f"Missing required columns: {', '.join(missing_columns)}")
    else:
        for i, row in enumerate(rows, start=2):
            if not row.get("RepresentativeID") or not row.get("RepresentativeName"):
                errors.append(f"Row {i}: missing RepresentativeID or RepresentativeName")
                continue

            existing = (
                db.query(Representative)
                .filter(Representative.representative_code == row["RepresentativeID"])
                .first()
            )
            rep = existing or Representative(representative_code=row["RepresentativeID"])
            rep.name = row.get("RepresentativeName", rep.name if existing else "")
            rep.territory = row.get("Territory", "")
            rep.region = row.get("Region", "")
            rep.product_category = row.get("ProductCategory", "")
            rep.language = row.get("Language", "English")
            rep.manager_phone = row.get("ManagerPhone", "")
            rep.email = row.get("Email", "")
            rep.phone = row.get("Phone", rep.phone if existing else "")
            try:
                rep.workload = int(row.get("Workload", 0) or 0)
            except ValueError:
                rep.workload = 0
            rep.active = str(row.get("ActiveFlag", "true")).strip().lower() in ("true", "1", "yes")

            if not existing:
                db.add(rep)
            valid_rows += 1

    db.commit()

    mapping = CsvRepMapping(
        filename=filename,
        row_count=len(rows),
        valid_rows=valid_rows,
        invalid_rows=len(rows) - valid_rows,
        uploaded_by=uploaded_by,
        errors="; ".join(errors)[:2000],
    )
    db.add(mapping)
    db.commit()
    db.refresh(mapping)
    return mapping


def assign_representative(db: Session, territory: str, product_category: str, language: str, lead_id: str) -> dict:
    """Returns {"assigned": bool, "representative": Representative|None, "confidence": float}."""
    recommendation = recommend_representative(db, territory, product_category, language, lead_id=lead_id)
    candidates = recommendation.get("candidates", [])

    if not candidates or candidates[0]["confidence"] < MATCH_CONFIDENCE_THRESHOLD:
        return {"assigned": False, "representative": None, "confidence": 0.0}

    top = candidates[0]
    rep = db.get(Representative, top["representative_id"])
    if rep is None:
        return {"assigned": False, "representative": None, "confidence": 0.0}

    rep.workload += 1
    db.commit()
    return {"assigned": True, "representative": rep, "confidence": top["confidence"]}
