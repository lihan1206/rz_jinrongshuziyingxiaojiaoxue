from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.deps import get_me
from app.schemas import UploadOut
from app.storage import save_upload
from app.tables import User


router = APIRouter(prefix="/files", tags=["文件"])


@router.post("/upload", response_model=UploadOut)
async def upload_file(
    file: UploadFile = File(...),
    _: User = Depends(get_me),
) -> UploadOut:
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="未选择文件")

    raw = await file.read()
    if len(raw) > 5 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="文件不能超过 5MB")

    file_name, file_url = save_upload(file.filename, raw)
    return UploadOut(file_name=file_name, file_url=file_url)

