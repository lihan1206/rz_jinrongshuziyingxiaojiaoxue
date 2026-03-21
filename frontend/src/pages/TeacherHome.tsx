import {
  BookOutlined,
  DeleteOutlined,
  EditOutlined,
  FileDoneOutlined,
  FundProjectionScreenOutlined,
  LogoutOutlined,
  PlusOutlined,
  SendOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Divider,
  Form,
  Input,
  InputNumber,
  Layout,
  Menu,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { startTransition, useEffect, useMemo, useState } from "react";

import { campaignApi, contentApi, dashApi, taskApi } from "../api/modules";
import { ConfirmRemove } from "../components/ConfirmRemove";
import { StatCards } from "../components/StatCards";
import { articleRule, campRule, reviewRule, taskRule } from "../lib/guards";
import type { ArticleRow, CampaignRow, DashboardSummary, SubmissionRow, TaskRow, UserProfile } from "../types";

const { Content, Sider, Header } = Layout;
const sectionItems = [
  { key: "overview", icon: <FundProjectionScreenOutlined />, label: "总览" },
  { key: "contents", icon: <BookOutlined />, label: "课程内容" },
  { key: "tasks", icon: <FileDoneOutlined />, label: "实训任务" },
  { key: "submits", icon: <FileDoneOutlined />, label: "作业批阅" },
  { key: "campaigns", icon: <SendOutlined />, label: "营销演练" },
];

type RemoveTarget =
  | { kind: "content"; id: number; name: string }
  | { kind: "task"; id: number; name: string }
  | { kind: "campaign"; id: number; name: string }
  | null;

export function TeacherHome({ profile, onLogout }: { profile: UserProfile; onLogout: () => void }) {
  const { message, notification } = App.useApp();
  const [section, setSection] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<DashboardSummary | null>(null);
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [removeTarget, setRemoveTarget] = useState<RemoveTarget>(null);
  const [articleForm] = Form.useForm();
  const [taskForm] = Form.useForm();
  const [reviewForm] = Form.useForm();
  const [campForm] = Form.useForm();
  const [articleEditId, setArticleEditId] = useState<number | null>(null);
  const [taskEditId, setTaskEditId] = useState<number | null>(null);
  const [campEditId, setCampEditId] = useState<number | null>(null);
  const [reviewTarget, setReviewTarget] = useState<SubmissionRow | null>(null);
  const [saving, setSaving] = useState(false);

  async function refreshAll() {
    setLoading(true);
    try {
      const [overviewRes, articleRes, taskRes, submitRes, campRes] = await Promise.all([
        dashApi.overview(),
        contentApi.list(),
        taskApi.list(),
        taskApi.allSubmits(),
        campaignApi.list(),
      ]);
      startTransition(() => {
        setOverview(overviewRes);
        setArticles(articleRes);
        setTasks(taskRes);
        setSubmissions(submitRes);
        setCampaigns(campRes);
      });
    } catch (error) {
      notification.error({ message: "数据加载失败", description: pickError(error) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshAll();
  }, []);

  const completionRate = useMemo(() => {
    if (!overview || overview.task_count === 0) {
      return 0;
    }
    return Math.round((overview.submission_count / overview.task_count) * 100);
  }, [overview]);

  async function handleArticleSubmit(values: Record<string, string>) {
    const payload = articleRule.parse(values);
    setSaving(true);
    try {
      if (articleEditId) {
        await contentApi.update(articleEditId, { ...payload, video_link: payload.video_link || null });
        message.success("内容已更新");
      } else {
        await contentApi.create({ ...payload, video_link: payload.video_link || null });
        message.success("内容已发布");
      }
      articleForm.resetFields();
      setArticleEditId(null);
      void refreshAll();
    } catch (error) {
      notification.error({ message: "内容保存失败", description: pickError(error) });
    } finally {
      setSaving(false);
    }
  }

  async function handleTaskSubmit(values: Record<string, string>) {
    const payload = taskRule.parse(values);
    setSaving(true);
    try {
      const taskBody = { ...payload, due_at: payload.due_at };
      if (taskEditId) {
        await taskApi.update(taskEditId, taskBody);
        message.success("任务已更新");
      } else {
        await taskApi.create(taskBody);
        message.success("任务已创建");
      }
      taskForm.resetFields();
      setTaskEditId(null);
      void refreshAll();
    } catch (error) {
      notification.error({ message: "任务保存失败", description: pickError(error) });
    } finally {
      setSaving(false);
    }
  }

  async function handleReview(values: { score: number; teacher_note: string }) {
    if (!reviewTarget) {
      return;
    }
    const payload = reviewRule.parse(values);
    setSaving(true);
    try {
      await taskApi.review(reviewTarget.id, payload);
      message.success("评分已提交");
      setReviewTarget(null);
      reviewForm.resetFields();
      void refreshAll();
    } catch (error) {
      notification.error({ message: "评分提交失败", description: pickError(error) });
    } finally {
      setSaving(false);
    }
  }

  async function handleCampaign(values: Record<string, string>) {
    const payload = campRule.parse(values);
    setSaving(true);
    try {
      if (campEditId) {
        await campaignApi.update(campEditId, payload);
        message.success("营销方案已更新");
      } else {
        await campaignApi.create(payload);
        message.success("营销方案已创建");
      }
      campForm.resetFields();
      setCampEditId(null);
      void refreshAll();
    } catch (error) {
      notification.error({ message: "方案保存失败", description: pickError(error) });
    } finally {
      setSaving(false);
    }
  }

  async function doRemove() {
    if (!removeTarget) {
      return;
    }
    setSaving(true);
    try {
      if (removeTarget.kind === "content") {
        await contentApi.remove(removeTarget.id);
      }
      if (removeTarget.kind === "task") {
        await taskApi.remove(removeTarget.id);
      }
      if (removeTarget.kind === "campaign") {
        await campaignApi.remove(removeTarget.id);
      }
      message.success("删除完成");
      setRemoveTarget(null);
      void refreshAll();
    } catch (error) {
      notification.error({ message: "删除失败", description: pickError(error) });
    } finally {
      setSaving(false);
    }
  }

  async function launchCampaign(id: number) {
    try {
      await campaignApi.launch(id);
      message.success("营销方案已投放");
      void refreshAll();
    } catch (error) {
      notification.error({ message: "投放失败", description: pickError(error) });
    }
  }

  async function exportLeads() {
    try {
      const blob = await campaignApi.exportLeads();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "金融客户样本.csv";
      link.click();
      window.URL.revokeObjectURL(url);
      message.success("客户样本已下载");
    } catch (error) {
      notification.error({ message: "下载失败", description: pickError(error) });
    }
  }

  return (
    <Layout className="workbench">
      <Sider breakpoint="lg" collapsedWidth="0" width={238} className="app-sider">
        <div className="brand-box">
          <Typography.Title level={4}>教师工作台</Typography.Title>
          <Typography.Paragraph>{profile.full_name}</Typography.Paragraph>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[section]}
          items={sectionItems}
          onClick={(info) => setSection(info.key)}
        />
      </Sider>
      <Layout>
        <Header className="top-bar">
          <Typography.Title level={3}>金融数字营销教学实训系统</Typography.Title>
          <Button icon={<LogoutOutlined />} onClick={onLogout}>
            退出登录
          </Button>
        </Header>
        <Content className="page-shell">
          {loading ? (
            <div className="center-spin">
              <Spin size="large" />
            </div>
          ) : (
            <>
              {section === "overview" && overview && (
                <Space direction="vertical" size={18} style={{ width: "100%" }}>
                  <Card className="hero-board">
                    <Row gutter={[18, 18]} align="middle">
                      <Col xs={24} xl={14}>
                        <Typography.Title level={2}>教师数据总览</Typography.Title>
                        <Typography.Paragraph>
                          当前看板已经接入真实数据库，你可以直接布置任务、批阅作业、查看营销演练效果。
                        </Typography.Paragraph>
                        <Button type="primary" onClick={exportLeads}>
                          下载客户样本
                        </Button>
                      </Col>
                      <Col xs={24} xl={10}>
                        <Card className="glow-card" bordered={false}>
                          <Progress type="circle" percent={completionRate} strokeColor="#d97706" />
                          <Typography.Paragraph style={{ marginTop: 16 }}>
                            当前作业完成率
                          </Typography.Paragraph>
                        </Card>
                      </Col>
                    </Row>
                  </Card>
                  <StatCards
                    items={[
                      { title: "课程内容", value: overview.article_count, suffix: "篇" },
                      { title: "实训任务", value: overview.task_count, suffix: "项" },
                      { title: "提交作业", value: overview.submission_count, suffix: "份" },
                      { title: "平均分", value: overview.avg_score, suffix: "分" },
                    ]}
                  />
                  <StatCards
                    items={[
                      { title: "已批阅", value: overview.reviewed_count, suffix: "份" },
                      { title: "营销方案", value: overview.campaign_count, suffix: "个" },
                      { title: "总触达量", value: overview.sent_size, suffix: "人" },
                      { title: "转化人数", value: overview.convert_size, suffix: "人" },
                    ]}
                  />
                </Space>
              )}

              {section === "contents" && (
                <Row gutter={[18, 18]}>
                  <Col xs={24} xl={9}>
                    <Card className="soft-card" title={articleEditId ? "编辑课程内容" : "新增课程内容"}>
                      <Form form={articleForm} layout="vertical" onFinish={handleArticleSubmit}>
                        <Form.Item name="title" label="标题" rules={[{ required: true, message: "请输入标题" }]}>
                          <Input placeholder="例如：客户画像拆解" />
                        </Form.Item>
                        <Form.Item name="category" label="分类" rules={[{ required: true, message: "请输入分类" }]}>
                          <Input placeholder="例如：客户洞察" />
                        </Form.Item>
                        <Form.Item name="brief" label="简介" rules={[{ required: true, message: "请输入简介" }]}>
                          <Input.TextArea rows={3} placeholder="请输入课程简介" />
                        </Form.Item>
                        <Form.Item name="body_text" label="正文" rules={[{ required: true, message: "请输入正文" }]}>
                          <Input.TextArea rows={8} placeholder="请输入课程正文" />
                        </Form.Item>
                        <Form.Item name="video_link" label="视频链接">
                          <Input placeholder="可选，填写教学视频地址" />
                        </Form.Item>
                        <Space>
                          <Button type="primary" htmlType="submit" loading={saving} icon={<PlusOutlined />}>
                            {articleEditId ? "保存更新" : "发布内容"}
                          </Button>
                          {articleEditId && (
                            <Button
                              onClick={() => {
                                setArticleEditId(null);
                                articleForm.resetFields();
                              }}
                            >
                              取消编辑
                            </Button>
                          )}
                        </Space>
                      </Form>
                    </Card>
                  </Col>
                  <Col xs={24} xl={15}>
                    <Card className="soft-card" title="课程内容列表">
                      <Table
                        rowKey="id"
                        dataSource={articles}
                        pagination={{ pageSize: 5 }}
                        columns={[
                          { title: "标题", dataIndex: "title" },
                          { title: "分类", dataIndex: "category" },
                          { title: "简介", dataIndex: "brief", ellipsis: true },
                          { title: "创建人", dataIndex: "creator_name" },
                          {
                            title: "操作",
                            render: (_, row: ArticleRow) => (
                              <Space>
                                <Button
                                  icon={<EditOutlined />}
                                  onClick={() => {
                                    setArticleEditId(row.id);
                                    articleForm.setFieldsValue({
                                      title: row.title,
                                      category: row.category,
                                      brief: row.brief,
                                      body_text: row.body_text,
                                      video_link: row.video_link || "",
                                    });
                                  }}
                                >
                                  编辑
                                </Button>
                                <Button
                                  danger
                                  icon={<DeleteOutlined />}
                                  onClick={() => setRemoveTarget({ kind: "content", id: row.id, name: row.title })}
                                >
                                  删除
                                </Button>
                              </Space>
                            ),
                          },
                        ]}
                      />
                    </Card>
                  </Col>
                </Row>
              )}

              {section === "tasks" && (
                <Row gutter={[18, 18]}>
                  <Col xs={24} xl={9}>
                    <Card className="soft-card" title={taskEditId ? "编辑实训任务" : "新增实训任务"}>
                      <Form form={taskForm} layout="vertical" onFinish={handleTaskSubmit}>
                        <Form.Item name="title" label="任务标题" rules={[{ required: true, message: "请输入标题" }]}>
                          <Input placeholder="请输入任务标题" />
                        </Form.Item>
                        <Form.Item name="scene" label="应用场景" rules={[{ required: true, message: "请输入应用场景" }]}>
                          <Input placeholder="例如：银行理财获客" />
                        </Form.Item>
                        <Form.Item name="intro" label="任务简介" rules={[{ required: true, message: "请输入任务简介" }]}>
                          <Input.TextArea rows={3} placeholder="请输入任务简介" />
                        </Form.Item>
                        <Form.Item name="demand_text" label="任务要求" rules={[{ required: true, message: "请输入任务要求" }]}>
                          <Input.TextArea rows={5} placeholder="请输入任务要求" />
                        </Form.Item>
                        <Form.Item name="rubric" label="评分标准" rules={[{ required: true, message: "请输入评分标准" }]}>
                          <Input.TextArea rows={4} placeholder="请输入评分标准" />
                        </Form.Item>
                        <Form.Item
                          name="due_at"
                          label="截止时间"
                          rules={[{ required: true, message: "请选择截止时间" }]}
                          getValueProps={(value) => ({ value: value ? dayjs(value) : undefined })}
                          normalize={(value) => (value ? dayjs(value).toISOString() : "")}
                        >
                          <DatePicker showTime style={{ width: "100%" }} />
                        </Form.Item>
                        <Space>
                          <Button type="primary" htmlType="submit" loading={saving}>
                            {taskEditId ? "保存任务" : "发布任务"}
                          </Button>
                          {taskEditId && (
                            <Button
                              onClick={() => {
                                setTaskEditId(null);
                                taskForm.resetFields();
                              }}
                            >
                              取消编辑
                            </Button>
                          )}
                        </Space>
                      </Form>
                    </Card>
                  </Col>
                  <Col xs={24} xl={15}>
                    <Card className="soft-card" title="实训任务列表">
                      <Table
                        rowKey="id"
                        dataSource={tasks}
                        pagination={{ pageSize: 5 }}
                        columns={[
                          { title: "标题", dataIndex: "title" },
                          { title: "场景", dataIndex: "scene" },
                          { title: "简介", dataIndex: "intro", ellipsis: true },
                          { title: "提交数", dataIndex: "total_submit" },
                          { title: "截止时间", render: (_, row: TaskRow) => dayjs(row.due_at).format("YYYY-MM-DD HH:mm") },
                          {
                            title: "操作",
                            render: (_, row: TaskRow) => (
                              <Space>
                                <Button
                                  icon={<EditOutlined />}
                                  onClick={() => {
                                    setTaskEditId(row.id);
                                    taskForm.setFieldsValue(row);
                                  }}
                                >
                                  编辑
                                </Button>
                                <Button
                                  danger
                                  icon={<DeleteOutlined />}
                                  onClick={() => setRemoveTarget({ kind: "task", id: row.id, name: row.title })}
                                >
                                  删除
                                </Button>
                              </Space>
                            ),
                          },
                        ]}
                      />
                    </Card>
                  </Col>
                </Row>
              )}

              {section === "submits" && (
                <Card className="soft-card" title="作业批阅列表">
                  <Table
                    rowKey="id"
                    dataSource={submissions}
                    pagination={{ pageSize: 6 }}
                    expandable={{
                      expandedRowRender: (row) => (
                        <Descriptions bordered size="small" column={1}>
                          <Descriptions.Item label="提交内容">{row.summary_text}</Descriptions.Item>
                          <Descriptions.Item label="附件地址">
                            {row.attach_url ? (
                              <a href={row.attach_url} target="_blank" rel="noreferrer">
                                查看附件
                              </a>
                            ) : (
                              "未上传"
                            )}
                          </Descriptions.Item>
                          <Descriptions.Item label="教师评语">{row.teacher_note || "待评分"}</Descriptions.Item>
                        </Descriptions>
                      ),
                    }}
                    columns={[
                      { title: "任务", dataIndex: "task_title" },
                      { title: "学员", dataIndex: "student_name" },
                      { title: "提交时间", render: (_, row: SubmissionRow) => dayjs(row.submitted_at).format("YYYY-MM-DD HH:mm") },
                      {
                        title: "评分状态",
                        render: (_, row: SubmissionRow) =>
                          row.score === null ? <Tag color="gold">待批阅</Tag> : <Tag color="green">{row.score} 分</Tag>,
                      },
                      {
                        title: "操作",
                        render: (_, row: SubmissionRow) => (
                          <Button
                            type="primary"
                            onClick={() => {
                              setReviewTarget(row);
                              reviewForm.setFieldsValue({ score: row.score ?? 80, teacher_note: row.teacher_note ?? "" });
                            }}
                          >
                            批阅
                          </Button>
                        ),
                      },
                    ]}
                  />

                  {reviewTarget && (
                    <Card className="inline-panel" style={{ marginTop: 20 }}>
                      <Typography.Title level={4}>批阅：{reviewTarget.task_title}</Typography.Title>
                      <Divider />
                      <Form form={reviewForm} layout="vertical" onFinish={handleReview}>
                        <Form.Item name="score" label="分数" rules={[{ required: true, message: "请输入分数" }]}>
                          <InputNumber min={0} max={100} style={{ width: "100%" }} placeholder="请输入 0-100 的分数" />
                        </Form.Item>
                        <Form.Item name="teacher_note" label="评语" rules={[{ required: true, message: "请输入评语" }]}>
                          <Input.TextArea rows={4} placeholder="请输入批阅意见" />
                        </Form.Item>
                        <Space>
                          <Button type="primary" htmlType="submit" loading={saving}>
                            提交评分
                          </Button>
                          <Button
                            onClick={() => {
                              setReviewTarget(null);
                              reviewForm.resetFields();
                            }}
                          >
                            关闭
                          </Button>
                        </Space>
                      </Form>
                    </Card>
                  )}
                </Card>
              )}

              {section === "campaigns" && (
                <Row gutter={[18, 18]}>
                  <Col xs={24} xl={9}>
                    <Card className="soft-card" title={campEditId ? "编辑营销方案" : "新增营销方案"}>
                      <Form form={campForm} layout="vertical" onFinish={handleCampaign}>
                        <Form.Item name="name" label="方案名称" rules={[{ required: true, message: "请输入方案名称" }]}>
                          <Input placeholder="例如：基金新客触达方案" />
                        </Form.Item>
                        <Form.Item name="channel" label="渠道" rules={[{ required: true, message: "请选择渠道" }]}>
                          <Select options={[{ value: "邮件" }, { value: "短信" }, { value: "企微" }]} />
                        </Form.Item>
                        <Form.Item name="segment" label="客群" rules={[{ required: true, message: "请选择客群" }]}>
                          <Select options={[{ value: "稳健理财" }, { value: "基金成长" }, { value: "家庭保障" }]} />
                        </Form.Item>
                        <Form.Item name="product_name" label="产品名称" rules={[{ required: true, message: "请输入产品名称" }]}>
                          <Input placeholder="请输入产品名称" />
                        </Form.Item>
                        <Form.Item name="message_body" label="营销文案" rules={[{ required: true, message: "请输入营销文案" }]}>
                          <Input.TextArea rows={4} placeholder="请输入营销文案" />
                        </Form.Item>
                        <Form.Item name="landing_title" label="落地页标题" rules={[{ required: true, message: "请输入落地页标题" }]}>
                          <Input placeholder="请输入落地页标题" />
                        </Form.Item>
                        <Form.Item name="landing_copy" label="落地页内容" rules={[{ required: true, message: "请输入落地页内容" }]}>
                          <Input.TextArea rows={4} placeholder="请输入落地页内容" />
                        </Form.Item>
                        <Form.Item name="ab_mode" label="A/B 版本" rules={[{ required: true, message: "请选择版本" }]}>
                          <Select options={[{ value: "A" }, { value: "B" }]} />
                        </Form.Item>
                        <Space>
                          <Button type="primary" htmlType="submit" loading={saving}>
                            {campEditId ? "保存方案" : "创建方案"}
                          </Button>
                          {campEditId && (
                            <Button
                              onClick={() => {
                                setCampEditId(null);
                                campForm.resetFields();
                              }}
                            >
                              取消编辑
                            </Button>
                          )}
                        </Space>
                      </Form>
                    </Card>
                  </Col>
                  <Col xs={24} xl={15}>
                    <Card className="soft-card" title="营销演练列表">
                      <Table
                        rowKey="id"
                        dataSource={campaigns}
                        pagination={{ pageSize: 5 }}
                        columns={[
                          { title: "方案名称", dataIndex: "name" },
                          { title: "渠道", dataIndex: "channel" },
                          { title: "客群", dataIndex: "segment" },
                          {
                            title: "投放状态",
                            render: (_, row: CampaignRow) =>
                              row.status === "sent" ? <Tag color="green">已投放</Tag> : <Tag color="blue">草稿</Tag>,
                          },
                          {
                            title: "效果",
                            render: (_, row: CampaignRow) =>
                              `${row.sent_size} 触达 / ${row.open_size} 打开 / ${row.convert_size} 转化`,
                          },
                          {
                            title: "操作",
                            render: (_, row: CampaignRow) => (
                              <Space wrap>
                                <Button
                                  icon={<EditOutlined />}
                                  disabled={row.status === "sent"}
                                  onClick={() => {
                                    setCampEditId(row.id);
                                    campForm.setFieldsValue(row);
                                  }}
                                >
                                  编辑
                                </Button>
                                <Button
                                  type="primary"
                                  disabled={row.status === "sent"}
                                  icon={<SendOutlined />}
                                  onClick={() => launchCampaign(row.id)}
                                >
                                  投放
                                </Button>
                                <Button
                                  danger
                                  icon={<DeleteOutlined />}
                                  onClick={() => setRemoveTarget({ kind: "campaign", id: row.id, name: row.name })}
                                >
                                  删除
                                </Button>
                              </Space>
                            ),
                          },
                        ]}
                      />
                    </Card>
                  </Col>
                </Row>
              )}
            </>
          )}
        </Content>
      </Layout>
      <ConfirmRemove
        open={!!removeTarget}
        title={`确认删除「${removeTarget?.name || ""}」吗`}
        desc="该操作会立即影响当前教学数据。"
        loading={saving}
        onCancel={() => setRemoveTarget(null)}
        onOk={doRemove}
      />
    </Layout>
  );
}

function pickError(error: unknown): string {
  const msg = (error as { response?: { data?: { detail?: string } }; message?: string }).response?.data?.detail;
  return msg || (error as { message?: string }).message || "请稍后重试";
}
