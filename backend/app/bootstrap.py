import logging
import time

from sqlalchemy.exc import OperationalError

from app.dbkit import Base, DbSession, engine
from app.logger_box import setup_logger
from app.seed_data import ensure_seed


setup_logger()
log = logging.getLogger(__name__)


def boot_app() -> None:
    for idx in range(15):
        try:
            Base.metadata.create_all(bind=engine)
            with DbSession() as db:
                ensure_seed(db)
            return
        except OperationalError as exc:
            log.warning("数据库暂未就绪，准备重试: %s", exc)
            time.sleep(2)
    raise RuntimeError("数据库连接失败，请检查容器状态")


if __name__ == "__main__":
    boot_app()

