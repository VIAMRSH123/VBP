from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.auth.deps import CurrentUser, get_current_user, managers_and_admin
from app.db import get_db
from app.models.bronze import BronzeCsvUpload
from app.models.representative import Representative
from app.schemas.representative import CsvUploadResult, RepresentativeDirectoryOut, RepresentativeOut
from app.services.audit_service import record_audit
from app.services.representative_service import load_representative_csv

router = APIRouter(prefix="/api/representatives", tags=["representatives"])


@router.get("")
def list_representatives(db: Session = Depends(get_db), current: CurrentUser = Depends(get_current_user)):
    reps = db.query(Representative).order_by(Representative.name).all()
    if current.role == "sales_representative":
        # Reduced view: no colleagues' contact info or workload numbers for reps.
        return [RepresentativeDirectoryOut.model_validate(r) for r in reps]
    return [RepresentativeOut.model_validate(r) for r in reps]


@router.post("/upload-csv", response_model=CsvUploadResult)
async def upload_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current: CurrentUser = Depends(managers_and_admin),
):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted")

    raw_bytes = await file.read()
    content = raw_bytes.decode("utf-8-sig")

    db.add(BronzeCsvUpload(filename=file.filename, raw_content=content, uploaded_by=current.email))
    db.commit()

    result = load_representative_csv(db, content, file.filename, current.email)

    record_audit(
        db, actor=current.email, actor_role=current.role, action="representatives.csv_upload",
        entity_type="csv_rep_mapping", entity_id=result.id,
        details=f"{result.valid_rows}/{result.row_count} rows valid",
    )

    return CsvUploadResult(
        id=result.id, filename=result.filename, row_count=result.row_count,
        valid_rows=result.valid_rows, invalid_rows=result.invalid_rows, errors=result.errors,
    )
