from pydantic import BaseModel


class RepresentativeOut(BaseModel):
    id: str
    representative_code: str
    name: str
    territory: str
    region: str
    product_category: str
    language: str
    manager_phone: str
    email: str
    phone: str
    workload: int
    active: bool

    model_config = {"from_attributes": True}


class RepresentativeDirectoryOut(BaseModel):
    """Reduced rep-directory view for Sales Reps — no contact info or workload numbers."""

    id: str
    representative_code: str
    name: str
    territory: str
    product_category: str

    model_config = {"from_attributes": True}


class CsvUploadResult(BaseModel):
    id: str
    filename: str
    row_count: int
    valid_rows: int
    invalid_rows: int
    errors: str
