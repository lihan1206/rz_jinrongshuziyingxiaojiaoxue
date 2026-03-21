from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.deps import get_db, get_me
from app.schemas import CampaignIn, CampaignOut
from app.seed_data import build_csv_text, deliver_campaign
from app.tables import CampaignDelivery, CampaignPlan, LeadProfile, User


router = APIRouter(prefix="/campaigns", tags=["营销演练"])


def camp_view(item: CampaignPlan) -> CampaignOut:
    return CampaignOut(
        id=item.id,
        name=item.name,
        channel=item.channel,
        segment=item.segment,
        product_name=item.product_name,
        message_body=item.message_body,
        landing_title=item.landing_title,
        landing_copy=item.landing_copy,
        ab_mode=item.ab_mode,
        status=item.status,
        sent_size=item.sent_size,
        open_size=item.open_size,
        click_size=item.click_size,
        convert_size=item.convert_size,
        owner_name=item.operator.full_name,
        created_at=item.created_at,
        launched_at=item.launched_at,
    )


@router.get("", response_model=list[CampaignOut])
def list_campaigns(me: User = Depends(get_me), db: Session = Depends(get_db)) -> list[CampaignOut]:
    query = db.query(CampaignPlan)
    if me.role != "teacher":
        query = query.filter(CampaignPlan.owner_id == me.id)
    rows = query.order_by(CampaignPlan.created_at.desc()).all()
    return [camp_view(row) for row in rows]


@router.post("", response_model=CampaignOut)
def create_campaign(body: CampaignIn, me: User = Depends(get_me), db: Session = Depends(get_db)) -> CampaignOut:
    row = CampaignPlan(**body.model_dump(), owner_id=me.id)
    db.add(row)
    db.commit()
    db.refresh(row)
    return camp_view(row)


@router.put("/{camp_id}", response_model=CampaignOut)
def edit_campaign(
    camp_id: int,
    body: CampaignIn,
    me: User = Depends(get_me),
    db: Session = Depends(get_db),
) -> CampaignOut:
    row = db.query(CampaignPlan).filter(CampaignPlan.id == camp_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="未找到营销方案")
    if me.role != "teacher" and row.owner_id != me.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权编辑该方案")

    if row.status == "sent":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="已投放方案不能再次编辑")

    for key, val in body.model_dump().items():
        setattr(row, key, val)
    db.commit()
    db.refresh(row)
    return camp_view(row)


@router.delete("/{camp_id}")
def remove_campaign(camp_id: int, me: User = Depends(get_me), db: Session = Depends(get_db)) -> dict[str, str]:
    row = db.query(CampaignPlan).filter(CampaignPlan.id == camp_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="未找到营销方案")
    if me.role != "teacher" and row.owner_id != me.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权删除该方案")
    db.delete(row)
    db.commit()
    return {"message": "营销方案已删除"}


@router.post("/{camp_id}/launch", response_model=CampaignOut)
def launch_campaign(camp_id: int, me: User = Depends(get_me), db: Session = Depends(get_db)) -> CampaignOut:
    row = db.query(CampaignPlan).filter(CampaignPlan.id == camp_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="未找到营销方案")
    if me.role != "teacher" and row.owner_id != me.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权投放该方案")
    if row.status == "sent":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该方案已投放完成")

    leads = db.query(LeadProfile).filter(LeadProfile.segment == row.segment).all()
    if not leads:
        leads = db.query(LeadProfile).all()

    row.delivery_rows.clear()
    deliver_campaign(row, leads)
    for item in leads:
        delivery = CampaignDelivery(
            campaign_id=row.id,
            lead_id=item.id,
            opened=1 if row.open_size > 0 and len(row.delivery_rows) < row.open_size else 0,
            clicked=1 if row.click_size > 0 and len(row.delivery_rows) < row.click_size else 0,
            converted=1 if row.convert_size > 0 and len(row.delivery_rows) < row.convert_size else 0,
        )
        row.delivery_rows.append(delivery)

    row.status = "sent"
    row.launched_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return camp_view(row)


@router.get("/lead/export")
def export_leads(_: User = Depends(get_me), db: Session = Depends(get_db)) -> Response:
    rows = db.query(LeadProfile).order_by(LeadProfile.id.asc()).all()
    csv_text = build_csv_text(rows)
    headers = {"Content-Disposition": "attachment; filename=finance_leads.csv"}
    return Response(content=csv_text, media_type="text/csv; charset=utf-8", headers=headers)

