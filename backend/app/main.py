from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.bootstrap import boot_app
from app.logger_box import setup_logger
from app.routes.auth_api import router as auth_router
from app.routes.campaign_api import router as campaign_router
from app.routes.content_api import router as content_router
from app.routes.dashboard_api import router as dashboard_router
from app.routes.file_api import router as file_router
from app.routes.task_api import router as task_router
from app.settings import get_cfg


setup_logger()
cfg = get_cfg()
app = FastAPI(title=cfg.app_title)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_start() -> None:
    boot_app()


app.include_router(auth_router, prefix="/api")
app.include_router(content_router, prefix="/api")
app.include_router(task_router, prefix="/api")
app.include_router(campaign_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(file_router, prefix="/api")

upload_dir = Path(cfg.storage_dir)
upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
