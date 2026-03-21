from collections.abc import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.auth import read_subject
from app.dbkit import DbSession
from app.tables import User


token_guard = HTTPBearer(auto_error=False)


def get_db() -> Generator[Session, None, None]:
    db = DbSession()
    try:
        yield db
    finally:
        db.close()


def get_me(
    cred: HTTPAuthorizationCredentials | None = Depends(token_guard),
    db: Session = Depends(get_db),
) -> User:
    if cred is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="请先登录后再继续")

    subject = read_subject(cred.credentials)
    if not subject:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录状态已失效，请重新登录")

    user = db.query(User).filter(User.username == subject).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="未找到当前账号")
    return user


def teacher_only(me: User = Depends(get_me)) -> User:
    if me.role != "teacher":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="当前功能仅教师可用")
    return me

