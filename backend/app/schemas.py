from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TokenPayload(BaseModel):
    access_token: str
    token_type: str = "bearer"
    profile: "UserInfo"


class LoginBody(BaseModel):
    username: str = Field(min_length=3, max_length=40)
    password: str = Field(min_length=6, max_length=30)


class RegisterBody(BaseModel):
    username: str = Field(min_length=3, max_length=40)
    full_name: str = Field(min_length=2, max_length=60)
    role: str
    password: str = Field(min_length=6, max_length=30)


class UserInfo(BaseModel):
    id: int
    username: str
    full_name: str
    role: str

    model_config = ConfigDict(from_attributes=True)


class ArticleIn(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    category: str = Field(min_length=2, max_length=40)
    brief: str = Field(min_length=6, max_length=200)
    body_text: str = Field(min_length=20)
    video_link: str | None = Field(default=None, max_length=255)


class ArticleOut(ArticleIn):
    id: int
    created_at: datetime
    creator_name: str


class TaskIn(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    scene: str = Field(min_length=2, max_length=80)
    intro: str = Field(min_length=6, max_length=240)
    demand_text: str = Field(min_length=20)
    rubric: str = Field(min_length=10)
    due_at: datetime


class TaskOut(TaskIn):
    id: int
    created_at: datetime
    owner_name: str
    total_submit: int


class SubmissionIn(BaseModel):
    summary_text: str = Field(min_length=20)
    attach_url: str | None = Field(default=None, max_length=255)


class SubmissionReviewIn(BaseModel):
    score: int = Field(ge=0, le=100)
    teacher_note: str = Field(min_length=6)


class SubmissionOut(BaseModel):
    id: int
    task_id: int
    task_title: str
    student_name: str
    summary_text: str
    attach_url: str | None
    score: int | None
    teacher_note: str | None
    submitted_at: datetime
    reviewed_at: datetime | None


class CampaignIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    channel: str = Field(min_length=2, max_length=30)
    segment: str = Field(min_length=2, max_length=40)
    product_name: str = Field(min_length=2, max_length=60)
    message_body: str = Field(min_length=10)
    landing_title: str = Field(min_length=2, max_length=120)
    landing_copy: str = Field(min_length=10)
    ab_mode: str = Field(min_length=1, max_length=20)


class CampaignOut(CampaignIn):
    id: int
    status: str
    sent_size: int
    open_size: int
    click_size: int
    convert_size: int
    owner_name: str
    created_at: datetime
    launched_at: datetime | None


class DashboardOut(BaseModel):
    article_count: int
    task_count: int
    submission_count: int
    reviewed_count: int
    avg_score: float
    campaign_count: int
    sent_size: int
    convert_size: int


class UploadOut(BaseModel):
    file_name: str
    file_url: str


TokenPayload.model_rebuild()

