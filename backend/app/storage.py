from pathlib import Path
from uuid import uuid4

from app.settings import get_cfg


cfg = get_cfg()
store_root = Path(cfg.storage_dir)
store_root.mkdir(parents=True, exist_ok=True)


def save_upload(src_name: str, content: bytes) -> tuple[str, str]:
    ext = Path(src_name).suffix
    final_name = f"{uuid4().hex}{ext}"
    aim = store_root / final_name
    aim.write_bytes(content)
    return final_name, f"/uploads/{final_name}"
