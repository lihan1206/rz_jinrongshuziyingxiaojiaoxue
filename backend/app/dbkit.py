from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.settings import get_cfg


cfg = get_cfg()
engine = create_engine(cfg.database_url, pool_pre_ping=True)
DbSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass

