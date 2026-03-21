from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.dbkit import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(60))
    role: Mapped[str] = mapped_column(Enum("teacher", "student", name="user_role"))
    pwd_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    articles: Mapped[list["CourseArticle"]] = relationship(back_populates="creator")
    tasks: Mapped[list["PracticeTask"]] = relationship(back_populates="owner")
    submissions: Mapped[list["TaskSubmission"]] = relationship(back_populates="student")
    campaigns: Mapped[list["CampaignPlan"]] = relationship(back_populates="operator")


class CourseArticle(Base):
    __tablename__ = "course_articles"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(120))
    category: Mapped[str] = mapped_column(String(40))
    brief: Mapped[str] = mapped_column(String(200))
    body_text: Mapped[str] = mapped_column(Text)
    video_link: Mapped[str | None] = mapped_column(String(255), nullable=True)
    creator_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    creator: Mapped["User"] = relationship(back_populates="articles")


class PracticeTask(Base):
    __tablename__ = "practice_tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(120))
    scene: Mapped[str] = mapped_column(String(80))
    intro: Mapped[str] = mapped_column(String(240))
    demand_text: Mapped[str] = mapped_column(Text)
    rubric: Mapped[str] = mapped_column(Text)
    due_at: Mapped[datetime]
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    owner: Mapped["User"] = relationship(back_populates="tasks")
    works: Mapped[list["TaskSubmission"]] = relationship(
        back_populates="task",
        cascade="all, delete-orphan",
    )


class TaskSubmission(Base):
    __tablename__ = "task_submissions"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("practice_tasks.id"))
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    summary_text: Mapped[str] = mapped_column(Text)
    attach_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    teacher_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    task: Mapped["PracticeTask"] = relationship(back_populates="works")
    student: Mapped["User"] = relationship(back_populates="submissions")


class LeadProfile(Base):
    __tablename__ = "lead_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(40))
    city: Mapped[str] = mapped_column(String(30))
    age: Mapped[int]
    segment: Mapped[str] = mapped_column(String(40))
    interest: Mapped[str] = mapped_column(String(60))
    preferred_channel: Mapped[str] = mapped_column(String(30))
    last_touch: Mapped[str] = mapped_column(String(60))

    records: Mapped[list["CampaignDelivery"]] = relationship(back_populates="lead")


class CampaignPlan(Base):
    __tablename__ = "campaign_plans"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    channel: Mapped[str] = mapped_column(String(30))
    segment: Mapped[str] = mapped_column(String(40))
    product_name: Mapped[str] = mapped_column(String(60))
    message_body: Mapped[str] = mapped_column(Text)
    landing_title: Mapped[str] = mapped_column(String(120))
    landing_copy: Mapped[str] = mapped_column(Text)
    ab_mode: Mapped[str] = mapped_column(String(20), default="A")
    status: Mapped[str] = mapped_column(String(20), default="draft")
    sent_size: Mapped[int] = mapped_column(Integer, default=0)
    open_size: Mapped[int] = mapped_column(Integer, default=0)
    click_size: Mapped[int] = mapped_column(Integer, default=0)
    convert_size: Mapped[int] = mapped_column(Integer, default=0)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    launched_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    operator: Mapped["User"] = relationship(back_populates="campaigns")
    delivery_rows: Mapped[list["CampaignDelivery"]] = relationship(
        back_populates="campaign",
        cascade="all, delete-orphan",
    )


class CampaignDelivery(Base):
    __tablename__ = "campaign_deliveries"

    id: Mapped[int] = mapped_column(primary_key=True)
    campaign_id: Mapped[int] = mapped_column(ForeignKey("campaign_plans.id"))
    lead_id: Mapped[int] = mapped_column(ForeignKey("lead_profiles.id"))
    delivered_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    opened: Mapped[int] = mapped_column(Integer, default=0)
    clicked: Mapped[int] = mapped_column(Integer, default=0)
    converted: Mapped[int] = mapped_column(Integer, default=0)

    campaign: Mapped["CampaignPlan"] = relationship(back_populates="delivery_rows")
    lead: Mapped["LeadProfile"] = relationship(back_populates="records")

