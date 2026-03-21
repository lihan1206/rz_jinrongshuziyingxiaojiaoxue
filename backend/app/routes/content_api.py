from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.deps import get_db, teacher_only
from app.schemas import ArticleIn, ArticleOut
from app.tables import CourseArticle, User


router = APIRouter(prefix="/contents", tags=["课程内容"])


def to_article_out(row: CourseArticle) -> ArticleOut:
    return ArticleOut(
        id=row.id,
        title=row.title,
        category=row.category,
        brief=row.brief,
        body_text=row.body_text,
        video_link=row.video_link,
        created_at=row.created_at,
        creator_name=row.creator.full_name,
    )


@router.get("", response_model=list[ArticleOut])
def article_list(db: Session = Depends(get_db)) -> list[ArticleOut]:
    rows = db.query(CourseArticle).order_by(CourseArticle.created_at.desc()).all()
    return [to_article_out(row) for row in rows]


@router.post("", response_model=ArticleOut)
def create_article(body: ArticleIn, me: User = Depends(teacher_only), db: Session = Depends(get_db)) -> ArticleOut:
    item = CourseArticle(**body.model_dump(), creator_id=me.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return to_article_out(item)


@router.put("/{article_id}", response_model=ArticleOut)
def edit_article(
    article_id: int,
    body: ArticleIn,
    _: User = Depends(teacher_only),
    db: Session = Depends(get_db),
) -> ArticleOut:
    row = db.query(CourseArticle).filter(CourseArticle.id == article_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="未找到内容")

    for key, val in body.model_dump().items():
        setattr(row, key, val)
    db.commit()
    db.refresh(row)
    return to_article_out(row)


@router.delete("/{article_id}")
def drop_article(article_id: int, _: User = Depends(teacher_only), db: Session = Depends(get_db)) -> dict[str, str]:
    row = db.query(CourseArticle).filter(CourseArticle.id == article_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="未找到内容")
    db.delete(row)
    db.commit()
    return {"message": "内容已删除"}

