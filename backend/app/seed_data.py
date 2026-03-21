import csv
import io
import logging
import random
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.auth import make_hash
from app.tables import CampaignDelivery, CampaignPlan, CourseArticle, LeadProfile, PracticeTask, TaskSubmission, User


log = logging.getLogger(__name__)


def ensure_seed(db: Session) -> None:
    if db.query(User).count() > 0:
        return

    teacher = User(username="admin", full_name="教学主管", role="teacher", pwd_hash=make_hash("123456"))
    stu_a = User(username="xueyuan01", full_name="陈若宁", role="student", pwd_hash=make_hash("123456"))
    stu_b = User(username="xueyuan02", full_name="林书言", role="student", pwd_hash=make_hash("123456"))
    db.add_all([teacher, stu_a, stu_b])
    db.flush()

    article_rows = [
        CourseArticle(
            title="金融客户画像入门",
            category="客户洞察",
            brief="从年龄、资产偏好与风险承受能力拆解金融客户画像。",
            body_text="客户画像是数字营销的起点。\n\n在金融业务里，除了年龄、城市和职业，还要关注风险承受能力、投资经验、触达偏好与产品生命周期。先分层，再设计内容，才能让营销动作更精准。",
            video_link="https://www.bilibili.com/",
            creator_id=teacher.id,
        ),
        CourseArticle(
            title="邮件触达与转化路径设计",
            category="渠道运营",
            brief="学习邮件标题、落地页标题和转化按钮之间的承接逻辑。",
            body_text="一封有效的金融营销邮件，核心不是堆信息，而是建立清晰的行动路径。\n\n标题承诺价值，正文补充信任，落地页负责完成转化。不同阶段的客户，CTA 强度也要不同。",
            video_link="https://www.icourse163.org/",
            creator_id=teacher.id,
        ),
    ]
    db.add_all(article_rows)

    task_rows = [
        PracticeTask(
            title="理财新客欢迎邮件策划",
            scene="银行理财获客",
            intro="为首次接触理财产品的新客设计欢迎邮件方案。",
            demand_text="请完成一份欢迎邮件策划，包含标题、正文结构、利益点、风险提示和落地页引导。",
            rubric="内容完整度40分，金融表达准确性30分，转化路径设计30分。",
            due_at=datetime.utcnow() + timedelta(days=7),
            owner_id=teacher.id,
        ),
        PracticeTask(
            title="保险续保提醒触达方案",
            scene="保险客户运营",
            intro="围绕即将到期客户，设计短信与落地页联动方案。",
            demand_text="请提交短信文案、落地页主标题与转化按钮文案，并说明分群策略。",
            rubric="分群策略35分，文案质量35分，行动设计30分。",
            due_at=datetime.utcnow() + timedelta(days=10),
            owner_id=teacher.id,
        ),
    ]
    db.add_all(task_rows)
    db.flush()

    leads = [
        LeadProfile(name="张敏", city="上海", age=32, segment="稳健理财", interest="现金管理", preferred_channel="邮件", last_touch="查看过活期理财内容"),
        LeadProfile(name="王珂", city="杭州", age=28, segment="基金成长", interest="指数基金", preferred_channel="短信", last_touch="完成风险测评"),
        LeadProfile(name="周宁", city="深圳", age=41, segment="家庭保障", interest="重疾险", preferred_channel="企微", last_touch="咨询过家庭保障方案"),
        LeadProfile(name="刘晨", city="南京", age=36, segment="稳健理财", interest="固收增强", preferred_channel="邮件", last_touch="下载过投资月报"),
        LeadProfile(name="李悦", city="苏州", age=30, segment="基金成长", interest="定投计划", preferred_channel="短信", last_touch="领取过基金入门资料"),
        LeadProfile(name="何霖", city="成都", age=45, segment="家庭保障", interest="年金险", preferred_channel="企微", last_touch="预约过顾问咨询"),
    ]
    db.add_all(leads)
    db.flush()

    base_campaign = CampaignPlan(
        name="稳健理财春季转化方案",
        channel="邮件",
        segment="稳健理财",
        product_name="安盈月月投",
        message_body="主题突出稳健收益与申购便捷，正文强调流动性与投教支持。",
        landing_title="稳健理财，一步完成首投",
        landing_copy="落地页突出低门槛、收益说明、顾问答疑与风险提示。",
        ab_mode="A",
        status="sent",
        owner_id=teacher.id,
        sent_size=2,
        open_size=1,
        click_size=1,
        convert_size=1,
        launched_at=datetime.utcnow() - timedelta(days=1),
    )
    db.add(base_campaign)
    db.flush()

    db.add_all(
        [
            CampaignDelivery(campaign_id=base_campaign.id, lead_id=leads[0].id, opened=1, clicked=1, converted=1),
            CampaignDelivery(campaign_id=base_campaign.id, lead_id=leads[3].id, opened=0, clicked=0, converted=0),
        ]
    )

    db.add(
        TaskSubmission(
            task_id=task_rows[0].id,
            student_id=stu_a.id,
            summary_text="欢迎邮件以低门槛试投为主线，先说明客户首次接触理财的关注点，再给出收益展示、风险提示和一键预约顾问入口。",
            score=88,
            teacher_note="结构完整，建议再强化风险提示位置。",
            submitted_at=datetime.utcnow() - timedelta(hours=12),
            reviewed_at=datetime.utcnow() - timedelta(hours=5),
        )
    )

    db.commit()
    log.info("初始化演示数据完成")


def build_csv_text(rows: list[LeadProfile]) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["姓名", "城市", "年龄", "客群", "兴趣点", "偏好渠道", "最近行为"])
    for row in rows:
        writer.writerow([row.name, row.city, row.age, row.segment, row.interest, row.preferred_channel, row.last_touch])
    return output.getvalue()


def deliver_campaign(camp: CampaignPlan, leads: list[LeadProfile]) -> None:
    camp.sent_size = len(leads)
    camp.open_size = 0
    camp.click_size = 0
    camp.convert_size = 0
    seed_num = camp.id * 97 + len(leads) * 13
    rnd = random.Random(seed_num)

    for lead in leads:
        opened = 1 if rnd.random() < (0.62 if camp.ab_mode.upper() == "A" else 0.54) else 0
        clicked = 1 if opened and rnd.random() < (0.45 if camp.channel == "邮件" else 0.38) else 0
        converted = 1 if clicked and rnd.random() < (0.4 if lead.segment == camp.segment else 0.22) else 0
        camp.open_size += opened
        camp.click_size += clicked
        camp.convert_size += converted
    camp.status = "sent"
