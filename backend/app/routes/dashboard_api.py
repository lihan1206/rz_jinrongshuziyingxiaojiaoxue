from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.deps import get_db, get_me
from app.schemas import DashboardOut
from app.tables import CampaignPlan, CourseArticle, PracticeTask, TaskSubmission, User


router = APIRouter(prefix="/dashboard", tags=["看板"])


@router.get("/overview", response_model=DashboardOut)
def overview(me: User = Depends(get_me), db: Session = Depends(get_db)) -> DashboardOut:
    task_query = db.query(PracticeTask)
    submit_query = db.query(TaskSubmission)
    camp_query = db.query(CampaignPlan)

    if me.role != "teacher":
        submit_query = submit_query.filter(TaskSubmission.student_id == me.id)
        camp_query = camp_query.filter(CampaignPlan.owner_id == me.id)

    article_count = db.query(func.count(CourseArticle.id)).scalar() or 0
    task_count = task_query.count()
    submission_count = submit_query.count()
    reviewed_count = submit_query.filter(TaskSubmission.score.isnot(None)).count()
    avg_score_raw = submit_query.with_entities(func.avg(TaskSubmission.score)).scalar()
    campaign_count = camp_query.count()
    sent_size = camp_query.with_entities(func.sum(CampaignPlan.sent_size)).scalar() or 0
    convert_size = camp_query.with_entities(func.sum(CampaignPlan.convert_size)).scalar() or 0

    return DashboardOut(
        article_count=article_count,
        task_count=task_count,
        submission_count=submission_count,
        reviewed_count=reviewed_count,
        avg_score=round(float(avg_score_raw or 0), 1),
        campaign_count=campaign_count,
        sent_size=sent_size,
        convert_size=convert_size,
    )

