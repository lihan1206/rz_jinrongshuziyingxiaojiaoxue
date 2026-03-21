from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import make_hash, make_token, verify_hash
from app.deps import get_db, get_me
from app.schemas import LoginBody, RegisterBody, TokenPayload, UserInfo
from app.tables import User


router = APIRouter(prefix="/auth", tags=["认证"])


@router.post("/login", response_model=TokenPayload)
def login(body: LoginBody, db: Session = Depends(get_db)) -> TokenPayload:
    user = db.query(User).filter(User.username == body.username).first()
    if not user or not verify_hash(body.password, user.pwd_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="账号或密码不正确")
    token = make_token(user.username)
    return TokenPayload(access_token=token, profile=UserInfo.model_validate(user))


@router.post("/register", response_model=TokenPayload)
def register(body: RegisterBody, db: Session = Depends(get_db)) -> TokenPayload:
    if body.role not in {"teacher", "student"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="角色类型不正确")

    exists = db.query(User).filter(User.username == body.username).first()
    if exists:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该账号已存在")

    user = User(
        username=body.username,
        full_name=body.full_name,
        role=body.role,
        pwd_hash=make_hash(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = make_token(user.username)
    return TokenPayload(access_token=token, profile=UserInfo.model_validate(user))


@router.get("/me", response_model=UserInfo)
def me(user: User = Depends(get_me)) -> UserInfo:
    return UserInfo.model_validate(user)

