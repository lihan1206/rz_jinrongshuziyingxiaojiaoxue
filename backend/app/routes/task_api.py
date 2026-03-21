from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.deps import get_db, get_me, teacher_only
from app.schemas import SubmissionIn, SubmissionOut, SubmissionReviewIn, TaskIn, TaskOut
from app.tables import PracticeTask, TaskSubmission, User


router = APIRouter(prefix="/tasks", tags=["实训任务"])


def to_task_out(item: PracticeTask) -> TaskOut:
    return TaskOut(
        id=item.id,
        title=item.title,
        scene=item.scene,
        intro=item.intro,
        demand_text=item.demand_text,
        rubric=item.rubric,
        due_at=item.due_at,
        created_at=item.created_at,
        owner_name=item.owner.full_name,
        total_submit=len(item.works),
    )


def to_submission_out(item: TaskSubmission) -> SubmissionOut:
    return SubmissionOut(
        id=item.id,
        task_id=item.task_id,
        task_title=item.task.title,
        student_name=item.student.full_name,
        summary_text=item.summary_text,
        attach_url=item.attach_url,
        score=item.score,
        teacher_note=item.teacher_note,
        submitted_at=item.submitted_at,
        reviewed_at=item.reviewed_at,
    )


@router.get("", response_model=list[TaskOut])
def task_list(db: Session = Depends(get_db)) -> list[TaskOut]:
    rows = db.query(PracticeTask).order_by(PracticeTask.due_at.asc()).all()
    return [to_task_out(row) for row in rows]


@router.post("", response_model=TaskOut)
def create_task(body: TaskIn, me: User = Depends(teacher_only), db: Session = Depends(get_db)) -> TaskOut:
    row = PracticeTask(**body.model_dump(), owner_id=me.id)
    db.add(row)
    db.commit()
    db.refresh(row)
    return to_task_out(row)


@router.put("/{task_id}", response_model=TaskOut)
def update_task(task_id: int, body: TaskIn, _: User = Depends(teacher_only), db: Session = Depends(get_db)) -> TaskOut:
    row = db.query(PracticeTask).filter(PracticeTask.id == task_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="未找到任务")
    for key, val in body.model_dump().items():
        setattr(row, key, val)
    db.commit()
    db.refresh(row)
    return to_task_out(row)


@router.delete("/{task_id}")
def remove_task(task_id: int, _: User = Depends(teacher_only), db: Session = Depends(get_db)) -> dict[str, str]:
    row = db.query(PracticeTask).filter(PracticeTask.id == task_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="未找到任务")
    db.delete(row)
    db.commit()
    return {"message": "任务已删除"}


@router.post("/{task_id}/submit", response_model=SubmissionOut)
def submit_task(
    task_id: int,
    body: SubmissionIn,
    me: User = Depends(get_me),
    db: Session = Depends(get_db),
) -> SubmissionOut:
    if me.role != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="当前账号不能提交作业")

    task = db.query(PracticeTask).filter(PracticeTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="未找到任务")

    row = (
        db.query(TaskSubmission)
        .filter(TaskSubmission.task_id == task_id, TaskSubmission.student_id == me.id)
        .first()
    )
    if row:
        row.summary_text = body.summary_text
        row.attach_url = body.attach_url
        row.submitted_at = datetime.utcnow()
        row.score = None
        row.teacher_note = None
        row.reviewed_at = None
    else:
        row = TaskSubmission(task_id=task_id, student_id=me.id, **body.model_dump())
        db.add(row)

    db.commit()
    db.refresh(row)
    return to_submission_out(row)


@router.get("/mine/submissions", response_model=list[SubmissionOut])
def my_submissions(me: User = Depends(get_me), db: Session = Depends(get_db)) -> list[SubmissionOut]:
    if me.role != "student":
        return []
    rows = (
        db.query(TaskSubmission)
        .filter(TaskSubmission.student_id == me.id)
        .order_by(TaskSubmission.submitted_at.desc())
        .all()
    )
    return [to_submission_out(row) for row in rows]


@router.get("/all/submissions", response_model=list[SubmissionOut])
def all_submissions(_: User = Depends(teacher_only), db: Session = Depends(get_db)) -> list[SubmissionOut]:
    rows = db.query(TaskSubmission).order_by(TaskSubmission.submitted_at.desc()).all()
    return [to_submission_out(row) for row in rows]


@router.put("/submissions/{submit_id}/review", response_model=SubmissionOut)
def review_submission(
    submit_id: int,
    body: SubmissionReviewIn,
    _: User = Depends(teacher_only),
    db: Session = Depends(get_db),
) -> SubmissionOut:
    row = db.query(TaskSubmission).filter(TaskSubmission.id == submit_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="未找到提交记录")
    row.score = body.score
    row.teacher_note = body.teacher_note
    row.reviewed_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return to_submission_out(row)

