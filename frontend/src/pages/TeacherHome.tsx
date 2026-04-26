import {
  BookOutlined,
  DeleteOutlined,
  EditOutlined,
  ExperimentOutlined,
  FileDoneOutlined,
  FundProjectionScreenOutlined,
  LogoutOutlined,
  PlusOutlined,
  SendOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  TrophyOutlined,
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
  List,
  Menu,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Timeline,
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

type TeacherSection = "overview" | "contents" | "tasks" | "submits" | "campaigns" | "class-radar" | "material-lab";

const sectionItems = [
  { key: "overview", icon: <FundProjectionScreenOutlined />, label: "总览" },
  { key: "contents", icon: <BookOutlined />, label: "课程内容" },
  { key: "tasks", icon: <FileDoneOutlined />, label: "实训任务" },
  { key: "submits", icon: <TrophyOutlined />, label: "作业批阅" },
  { key: "campaigns", icon: <SendOutlined />, label: "投放演练" },
  { key: "class-radar", icon: <ThunderboltOutlined />, label: "班级雷达" },
  { key: "material-lab", icon: <ExperimentOutlined />, label: "素材工坊" },
];

type RemoveTarget =
  | { kind: "content"; id: number; name: string }
  | { kind: "task"; id: number; name: string }
  | { kind: "campaign"; id: number; name: string }
  | null;

export function TeacherHome({ profile, onLogout }: { profile: UserProfile; onLogout: () => void }) {
  const { message, notification } = App.useApp();
  const [section, setSection] = useState<TeacherSection>("overview");
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

  const reviewPending = useMemo(() => submissions.filter((item) => item.score === null), [submissions]);
  const topReviewed = useMemo(
    () =>
      [...submissions]
        .filter((item) => item.score !== null)
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, 4),
    [submissions],
  );
  const upcomingTasks = useMemo(
    () => tasks.slice().sort((a, b) => dayjs(a.due_at).valueOf() - dayjs(b.due_at).valueOf()).slice(0, 4),
    [tasks],
  );
  const sentCampaigns = useMemo(() => campaigns.filter((item) => item.status === "sent"), [campaigns]);

  const reviewRate = useMemo(() => {
    if (!overview || overview.submission_count === 0) {
      return 0;
    }
    return Math.round((overview.reviewed_count / overview.submission_count) * 100);
  }, [overview]);

  const radarTiles = [
    {
      title: "待批阅",
      value: reviewPending.length,
      hint: "需要优先处理的提交",
      color: "#d97706",
    },
    {
      title: "高分作品",
      value: topReviewed.length,
      hint: "当前可作为示范的作业",
      color: "#059669",
    },
    {
      title: "临期任务",
      value: upcomingTasks.length,
      hint: "需要提醒班级的任务",
      color: "#2563eb",
    },
    {
      title: "已投放方案",
      value: sentCampaigns.length,
      hint: "可以复盘的营销案例",
      color: "#7c3aed",
    },
  ];

  const contentTemplates = articles.slice(0, 3);
  const taskTemplates = tasks.slice(0, 3);
  const campaignTemplates = campaigns.slice(0, 3);

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
      if (taskEditId) {
        await taskApi.update(taskEditId, payload);
        message.success("任务已更新");
      } else {
        await taskApi.create(payload);
        message.success("任务已发布");
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
        message.success("投放方案已更新");
      } else {
        await campaignApi.create(payload);
        message.success("投放方案已创建");
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
      message.success("方案已投放");
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

  function fillArticleTemplate(item: ArticleRow) {
    articleForm.setFieldsValue({
      title: item.title,
      category: item.category,
      brief: item.brief,
      body_text: item.body_text,
      video_link: item.video_link || "",
    });
    setArticleEditId(item.id);
    setSection("contents");
  }

  function fillTaskTemplate(item: TaskRow) {
    taskForm.setFieldsValue({
      title: item.title,
      scene: item.scene,
      intro: item.intro,
      demand_text: item.demand_text,
      rubric: item.rubric,
      due_at: item.due_at ? dayjs(item.due_at) : undefined,
    });
    setTaskEditId(item.id);
    setSection("tasks");
  }

  function fillCampaignTemplate(item: CampaignRow) {
    campForm.setFieldsValue(item);
    setCampEditId(item.id);
    setSection("campaigns");
  }

  return (
    <Layout className="workbench workbench--teacher">
      <Sider breakpoint="lg" collapsedWidth="0" width={250} className="app-sider">
        <div className="brand-box">
          <Typography.Text className="section-kicker">Teacher Console</Typography.Text>
          <Typography.Title level={4}>教师工作台</Typography.Title>
          <Typography.Paragraph>{profile.full_name}</Typography.Paragraph>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[section]}
          items={sectionItems}
          onClick={(info) => setSection(info.key as TeacherSection)}
        />
      </Sider>
      <Layout>
        <Header className="top-bar">
          <div>
            <Typography.Text className="section-kicker">Teaching studio</Typography.Text>
            <Typography.Title level={3}>课程内容与教学投放中枢</Typography.Title>
          </div>
          <Space wrap>
            <Button onClick={() => setSection("material-lab")}>打开素材工坊</Button>
            <Button type="primary" icon={<SendOutlined />} onClick={exportLeads}>
              下载样本
            </Button>
            <Button icon={<LogoutOutlined />} onClick={onLogout}>
              退出登录
            </Button>
          </Space>
        </Header>
        <Content className="page-shell">
          {loading ? (
            <div className="center-spin">
              <Spin size="large" />
            </div>
          ) : (
            <Space direction="vertical" size={20} style={{ width: "100%" }}>
              {section === "overview" && overview && (
                <>
                  <Card className="hero-board hero-board--teacher">
                    <Row gutter={[20, 20]} align="middle">
                      <Col xs={24} xl={14}>
                        <Typography.Text className="section-kicker">Teaching snapshot</Typography.Text>
                        <Typography.Title level={2}>把课堂、批阅和投放放进一张教学指挥图</Typography.Title>
                        <Typography.Paragraph className="hero-copy">
                          这里把原来分散的列表换成了更适合教师快速决策的中枢视图，重点突出班级状态和下一步动作。
                        </Typography.Paragraph>
                        <Space wrap>
                          <Button type="primary" onClick={() => setSection("contents")}>
                            管理课程内容
                          </Button>
                          <Button onClick={() => setSection("submits")}>进入批阅中心</Button>
                          <Button onClick={() => setSection("class-radar")}>查看班级雷达</Button>
                        </Space>
                      </Col>
                      <Col xs={24} xl={10}>
                        <Card className="glow-card" bordered={false}>
                          <Progress type="circle" percent={reviewRate} strokeColor="#d97706" />
                          <Typography.Paragraph style={{ marginTop: 16 }}>
                            批阅完成率
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
                      { title: "平均分数", value: overview.avg_score, suffix: "分" },
                    ]}
                  />
                  <Row gutter={[16, 16]}>
                    {radarTiles.map((tile) => (
                      <Col xs={24} sm={12} xl={6} key={tile.title}>
                        <Card className="soft-card radar-card">
                          <div className="radar-card__head">
                            <Typography.Title level={5}>{tile.title}</Typography.Title>
                            <span style={{ color: tile.color }}>{tile.value}</span>
                          </div>
                          <Typography.Paragraph>{tile.hint}</Typography.Paragraph>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </>
              )}

              {section === "contents" && (
                <Row gutter={[16, 16]}>
                  <Col xs={24} xl={9}>
                    <Card className="soft-card" title={articleEditId ? "编辑课程内容" : "发布课程内容"}>
                      <Form form={articleForm} layout="vertical" onFinish={handleArticleSubmit}>
                        <Form.Item name="title" label="标题" rules={[{ required: true, message: "请输入标题" }]}>
                          <Input placeholder="例如：客户画像拆解" />
                        </Form.Item>
                        <Form.Item name="category" label="分类" rules={[{ required: true, message: "请输入分类" }]}>
                          <Input placeholder="例如：客户洞察" />
                        </Form.Item>
                        <Form.Item name="brief" label="简介" rules={[{ required: true, message: "请输入简介" }]}>
                          <Input.TextArea rows={3} placeholder="课程简介" />
                        </Form.Item>
                        <Form.Item name="body_text" label="正文" rules={[{ required: true, message: "请输入正文" }]}>
                          <Input.TextArea rows={8} placeholder="课程正文" />
                        </Form.Item>
                        <Form.Item name="video_link" label="视频链接">
                          <Input placeholder="可选，填写教学视频地址" />
                        </Form.Item>
                        <Space wrap>
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
                    <Card className="soft-card" title="课程内容库">
                      <Row gutter={[16, 16]}>
                        {articles.map((row) => (
                          <Col xs={24} md={12} xxl={8} key={row.id}>
                            <Card className="content-card" title={row.title} extra={<Tag color="processing">{row.category}</Tag>}>
                              <Typography.Paragraph>{row.brief}</Typography.Paragraph>
                              <Typography.Paragraph className="content-card__body" style={{ whiteSpace: "pre-line" }}>
                                {row.body_text}
                              </Typography.Paragraph>
                              <Space wrap>
                                <Button icon={<EditOutlined />} onClick={() => fillArticleTemplate(row)}>
                                  载入表单
                                </Button>
                                <Button danger icon={<DeleteOutlined />} onClick={() => setRemoveTarget({ kind: "content", id: row.id, name: row.title })}>
                                  删除
                                </Button>
                              </Space>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    </Card>
                  </Col>
                </Row>
              )}

              {section === "tasks" && (
                <Row gutter={[16, 16]}>
                  <Col xs={24} xl={9}>
                    <Card className="soft-card" title={taskEditId ? "编辑实训任务" : "发布实训任务"}>
                      <Form form={taskForm} layout="vertical" onFinish={handleTaskSubmit}>
                        <Form.Item name="title" label="任务标题" rules={[{ required: true, message: "请输入标题" }]}>
                          <Input placeholder="请输入任务标题" />
                        </Form.Item>
                        <Form.Item name="scene" label="应用场景" rules={[{ required: true, message: "请输入场景" }]}>
                          <Input placeholder="例如：银行理财获客" />
                        </Form.Item>
                        <Form.Item name="intro" label="任务简介" rules={[{ required: true, message: "请输入简介" }]}>
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
                        <Space wrap>
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
                    <Card className="soft-card" title="实训任务库">
                      <List
                        itemLayout="vertical"
                        dataSource={tasks}
                        renderItem={(row) => (
                          <List.Item
                            key={row.id}
                            className="task-card"
                            extra={
                              <Space wrap>
                                <Button icon={<EditOutlined />} onClick={() => fillTaskTemplate(row)}>
                                  载入表单
                                </Button>
                                <Button danger icon={<DeleteOutlined />} onClick={() => setRemoveTarget({ kind: "task", id: row.id, name: row.title })}>
                                  删除
                                </Button>
                              </Space>
                            }
                          >
                            <List.Item.Meta
                              title={
                                <Space wrap>
                                  <Typography.Text strong>{row.title}</Typography.Text>
                                  <Tag color="orange">{row.scene}</Tag>
                                </Space>
                              }
                              description={row.intro}
                            />
                            <Typography.Paragraph className="task-card__text">{row.demand_text}</Typography.Paragraph>
                            <Space wrap>
                              <Tag color="blue">截止 {dayjs(row.due_at).format("YYYY-MM-DD HH:mm")}</Tag>
                              <Tag color="green">提交 {row.total_submit}</Tag>
                            </Space>
                          </List.Item>
                        )}
                      />
                    </Card>
                  </Col>
                </Row>
              )}

              {section === "submits" && (
                <Card className="soft-card" title="作业批阅">
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
                          <Descriptions.Item label="教师评语">{row.teacher_note || "待批阅"}</Descriptions.Item>
                        </Descriptions>
                      ),
                    }}
                    columns={[
                      { title: "任务", dataIndex: "task_title" },
                      { title: "学生", dataIndex: "student_name" },
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
                          <InputNumber min={0} max={100} style={{ width: "100%" }} placeholder="0-100" />
                        </Form.Item>
                        <Form.Item name="teacher_note" label="评语" rules={[{ required: true, message: "请输入评语" }]}>
                          <Input.TextArea rows={4} placeholder="请输入评语" />
                        </Form.Item>
                        <Space wrap>
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
                <Row gutter={[16, 16]}>
                  <Col xs={24} xl={9}>
                    <Card className="soft-card" title={campEditId ? "编辑投放方案" : "新建投放方案"}>
                      <Form form={campForm} layout="vertical" onFinish={handleCampaign}>
                        <Form.Item name="name" label="方案名称" rules={[{ required: true, message: "请输入方案名称" }]}>
                          <Input placeholder="例如：高净值客户唤醒" />
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
                        <Form.Item
                          name="landing_title"
                          label="落地页标题"
                          rules={[{ required: true, message: "请输入落地页标题" }]}
                        >
                          <Input placeholder="请输入落地页标题" />
                        </Form.Item>
                        <Form.Item
                          name="landing_copy"
                          label="落地页内容"
                          rules={[{ required: true, message: "请输入落地页内容" }]}
                        >
                          <Input.TextArea rows={4} placeholder="请输入落地页内容" />
                        </Form.Item>
                        <Form.Item name="ab_mode" label="A/B 版本" rules={[{ required: true, message: "请选择版本" }]}>
                          <Select options={[{ value: "A" }, { value: "B" }]} />
                        </Form.Item>
                        <Space wrap>
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
                    <Card className="soft-card" title="投放演练库">
                      <Row gutter={[16, 16]}>
                        {campaigns.map((row) => (
                          <Col xs={24} md={12} key={row.id}>
                            <Card
                              className="campaign-card"
                              title={row.name}
                              extra={<Tag color={row.status === "sent" ? "green" : "blue"}>{row.status === "sent" ? "已投放" : "草稿"}</Tag>}
                            >
                              <Typography.Paragraph>
                                {row.channel} · {row.segment} · {row.product_name}
                              </Typography.Paragraph>
                              <Typography.Paragraph>{row.message_body}</Typography.Paragraph>
                              <div className="campaign-card__metric">
                                <span>触达 {row.sent_size}</span>
                                <span>点击 {row.click_size}</span>
                                <span>转化 {row.convert_size}</span>
                              </div>
                              <Space wrap>
                                <Button
                                  icon={<EditOutlined />}
                                  disabled={row.status === "sent"}
                                  onClick={() => {
                                    fillCampaignTemplate(row);
                                  }}
                                >
                                  载入表单
                                </Button>
                                <Button type="primary" disabled={row.status === "sent"} onClick={() => launchCampaign(row.id)}>
                                  立即投放
                                </Button>
                                <Button danger icon={<DeleteOutlined />} onClick={() => setRemoveTarget({ kind: "campaign", id: row.id, name: row.name })}>
                                  删除
                                </Button>
                              </Space>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    </Card>
                  </Col>
                </Row>
              )}

              {section === "class-radar" && overview && (
                <Row gutter={[16, 16]}>
                  <Col xs={24} xl={12}>
                    <Card className="soft-card" title="班级雷达">
                      <Space direction="vertical" size={16} style={{ width: "100%" }}>
                        <Card className="mini-spotlight" bordered={false}>
                          <Typography.Title level={5}>批阅完成率</Typography.Title>
                          <Progress percent={reviewRate} strokeColor="#d97706" />
                        </Card>
                        <Card className="mini-spotlight" bordered={false}>
                          <Typography.Title level={5}>作业与任务配比</Typography.Title>
                          <Progress percent={Math.min(100, Math.round((overview.submission_count / Math.max(overview.task_count, 1)) * 100))} />
                        </Card>
                        <Card className="mini-spotlight" bordered={false}>
                          <Typography.Title level={5}>投放复盘率</Typography.Title>
                          <Progress percent={Math.min(100, Math.round((overview.convert_size / Math.max(overview.sent_size, 1)) * 100))} strokeColor="#059669" />
                        </Card>
                      </Space>
                    </Card>
                  </Col>
                  <Col xs={24} xl={12}>
                    <Card className="soft-card" title="教学提醒">
                      <Timeline
                        items={[
                          {
                            children: `当前有 ${reviewPending.length} 份作业待批阅，优先处理最新提交。`,
                          },
                          {
                            children: upcomingTasks[0]
                              ? `最近截止的是《${upcomingTasks[0].title}》，可提前在课堂里做一次提示。`
                              : "暂无临期任务。",
                          },
                          {
                            children: sentCampaigns[0]
                              ? `已有 ${sentCampaigns.length} 个投放方案上线，适合安排案例复盘。`
                              : "暂无已上线投放方案。",
                          },
                        ]}
                      />
                    </Card>
                  </Col>
                </Row>
              )}

              {section === "material-lab" && (
                <Row gutter={[16, 16]}>
                  <Col xs={24} xl={8}>
                    <Card className="soft-card" title="课程模板">
                      <List
                        dataSource={contentTemplates}
                        renderItem={(item) => (
                          <List.Item
                            actions={[
                              <Button key="fill" onClick={() => fillArticleTemplate(item)}>
                                一键填入
                              </Button>,
                            ]}
                          >
                            <List.Item.Meta title={item.title} description={item.category} />
                          </List.Item>
                        )}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} xl={8}>
                    <Card className="soft-card" title="任务模板">
                      <List
                        dataSource={taskTemplates}
                        renderItem={(item) => (
                          <List.Item
                            actions={[
                              <Button key="fill" onClick={() => fillTaskTemplate(item)}>
                                一键填入
                              </Button>,
                            ]}
                          >
                            <List.Item.Meta title={item.title} description={item.scene} />
                          </List.Item>
                        )}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} xl={8}>
                    <Card className="soft-card" title="投放模板">
                      <List
                        dataSource={campaignTemplates}
                        renderItem={(item) => (
                          <List.Item
                            actions={[
                              <Button key="fill" onClick={() => fillCampaignTemplate(item)}>
                                一键填入
                              </Button>,
                            ]}
                          >
                            <List.Item.Meta title={item.name} description={`${item.channel} · ${item.segment}`} />
                          </List.Item>
                        )}
                      />
                    </Card>
                  </Col>
                </Row>
              )}
            </Space>
          )}
        </Content>
      </Layout>
      <ConfirmRemove
        open={!!removeTarget}
        title={`确认删除 ${removeTarget?.name || ""} 吗`}
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
