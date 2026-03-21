import {
  BookOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
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
  Collapse,
  Form,
  Input,
  Layout,
  Menu,
  Progress,
  Row,
  Select,
  Skeleton,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  Upload,
} from "antd";
import dayjs from "dayjs";
import { startTransition, useEffect, useMemo, useState } from "react";

import { campaignApi, contentApi, dashApi, fileApi, taskApi } from "../api/modules";
import { StatCards } from "../components/StatCards";
import { campRule, submissionRule } from "../lib/guards";
import type { ArticleRow, CampaignRow, DashboardSummary, SubmissionRow, TaskRow, UserProfile } from "../types";

const { Content, Sider, Header } = Layout;
const navItems = [
  { key: "overview", icon: <FundProjectionScreenOutlined />, label: "我的总览" },
  { key: "contents", icon: <BookOutlined />, label: "学习内容" },
  { key: "tasks", icon: <FileDoneOutlined />, label: "任务提交" },
  { key: "campaigns", icon: <SendOutlined />, label: "营销演练" },
];

export function StudentHome({ profile, onLogout }: { profile: UserProfile; onLogout: () => void }) {
  const { message, notification } = App.useApp();
  const [section, setSection] = useState("overview");
  const [busy, setBusy] = useState(true);
  const [overview, setOverview] = useState<DashboardSummary | null>(null);
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [submitForm] = Form.useForm();
  const [campForm] = Form.useForm();
  const [taskTarget, setTaskTarget] = useState<TaskRow | null>(null);
  const [campEditId, setCampEditId] = useState<number | null>(null);
  const [attachUrl, setAttachUrl] = useState<string>("");
  const [saving, setSaving] = useState(false);

  async function reloadPageData() {
    setBusy(true);
    try {
      const [overviewRes, articleRes, taskRes, submitRes, campRes] = await Promise.all([
        dashApi.overview(),
        contentApi.list(),
        taskApi.list(),
        taskApi.mineSubmits(),
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
      notification.error({ message: "数据加载失败", description: takeErr(error) });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void reloadPageData();
  }, []);

  const scoreRate = useMemo(() => {
    if (!overview || overview.submission_count === 0) {
      return 0;
    }
    return Math.round((overview.reviewed_count / overview.submission_count) * 100);
  }, [overview]);

  async function submitWork(values: { summary_text: string }) {
    if (!taskTarget) {
      return;
    }
    const payload = submissionRule.parse({ ...values, attach_url: attachUrl });
    setSaving(true);
    try {
      await taskApi.submit(taskTarget.id, { ...payload, attach_url: payload.attach_url || null });
      message.success("作业已提交");
      setTaskTarget(null);
      setAttachUrl("");
      submitForm.resetFields();
      void reloadPageData();
    } catch (error) {
      notification.error({ message: "提交失败", description: takeErr(error) });
    } finally {
      setSaving(false);
    }
  }

  async function saveCampaign(values: Record<string, string>) {
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
      void reloadPageData();
    } catch (error) {
      notification.error({ message: "方案保存失败", description: takeErr(error) });
    } finally {
      setSaving(false);
    }
  }

  async function runCampaign(id: number) {
    try {
      await campaignApi.launch(id);
      message.success("方案已投放，数据已回写");
      void reloadPageData();
    } catch (error) {
      notification.error({ message: "投放失败", description: takeErr(error) });
    }
  }

  async function exportLeads() {
    try {
      const blob = await campaignApi.exportLeads();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "客户数据练习样本.csv";
      link.click();
      window.URL.revokeObjectURL(url);
      message.success("数据样本已下载");
    } catch (error) {
      notification.error({ message: "下载失败", description: takeErr(error) });
    }
  }

  return (
    <Layout className="workbench">
      <Sider breakpoint="lg" collapsedWidth="0" width={238} className="app-sider">
        <div className="brand-box">
          <Typography.Title level={4}>学员工作台</Typography.Title>
          <Typography.Paragraph>{profile.full_name}</Typography.Paragraph>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[section]}
          items={navItems}
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
          {busy ? (
            <div className="center-spin">
              <Spin size="large" />
            </div>
          ) : (
            <>
              {section === "overview" && overview && (
                <Space direction="vertical" size={18} style={{ width: "100%" }}>
                  <Card className="hero-board">
                    <Row gutter={[18, 18]} align="middle">
                      <Col xs={24} xl={16}>
                        <Typography.Title level={2}>学习与实训进度</Typography.Title>
                        <Typography.Paragraph>
                          你可以在这里查看课程内容、提交实训作业，并把自己的营销方案投放到训练数据中查看效果。
                        </Typography.Paragraph>
                      </Col>
                      <Col xs={24} xl={8}>
                        <Card className="glow-card" bordered={false}>
                          <Progress type="dashboard" percent={scoreRate} strokeColor="#0f766e" />
                          <Typography.Paragraph style={{ marginTop: 16 }}>
                            已批阅占比
                          </Typography.Paragraph>
                        </Card>
                      </Col>
                    </Row>
                  </Card>
                  <StatCards
                    items={[
                      { title: "学习内容", value: overview.article_count, suffix: "篇" },
                      { title: "实训任务", value: overview.task_count, suffix: "项" },
                      { title: "我的提交", value: overview.submission_count, suffix: "份" },
                      { title: "平均成绩", value: overview.avg_score, suffix: "分" },
                    ]}
                  />
                  <StatCards
                    items={[
                      { title: "已批阅", value: overview.reviewed_count, suffix: "份" },
                      { title: "我的方案", value: overview.campaign_count, suffix: "个" },
                      { title: "累计触达", value: overview.sent_size, suffix: "人" },
                      { title: "累计转化", value: overview.convert_size, suffix: "人" },
                    ]}
                  />
                </Space>
              )}

              {section === "contents" && (
                <Card className="soft-card" title="学习内容">
                  <Collapse
                    ghost
                    items={articles.map((item) => ({
                      key: String(item.id),
                      label: (
                        <div className="collapse-head">
                          <span>{item.title}</span>
                          <Tag color="processing">{item.category}</Tag>
                        </div>
                      ),
                      children: (
                        <div>
                          <Typography.Paragraph>{item.brief}</Typography.Paragraph>
                          <Typography.Paragraph style={{ whiteSpace: "pre-line" }}>{item.body_text}</Typography.Paragraph>
                          {item.video_link && (
                            <a href={item.video_link} target="_blank" rel="noreferrer">
                              打开教学视频
                            </a>
                          )}
                        </div>
                      ),
                    }))}
                  />
                </Card>
              )}

              {section === "tasks" && (
                <Row gutter={[18, 18]}>
                  <Col xs={24} xl={14}>
                    <Card className="soft-card" title="实训任务列表">
                      <Table
                        rowKey="id"
                        dataSource={tasks}
                        pagination={{ pageSize: 5 }}
                        columns={[
                          { title: "任务", dataIndex: "title" },
                          { title: "场景", dataIndex: "scene" },
                          { title: "简介", dataIndex: "intro", ellipsis: true },
                          { title: "截止时间", render: (_, row: TaskRow) => dayjs(row.due_at).format("YYYY-MM-DD HH:mm") },
                          {
                            title: "操作",
                            render: (_, row: TaskRow) => (
                              <Button type="primary" onClick={() => setTaskTarget(row)}>
                                提交作业
                              </Button>
                            ),
                          },
                        ]}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} xl={10}>
                    <Card className="soft-card" title={taskTarget ? `提交：${taskTarget.title}` : "我的提交记录"}>
                      {taskTarget ? (
                        <Form form={submitForm} layout="vertical" onFinish={submitWork}>
                          <Form.Item label="提交内容" name="summary_text" rules={[{ required: true, message: "请输入提交内容" }]}>
                            <Input.TextArea rows={6} placeholder="请输入你的方案说明、关键文案和转化思路" />
                          </Form.Item>
                          <Form.Item label="附件上传">
                            <Upload
                              maxCount={1}
                              showUploadList
                              customRequest={async (option) => {
                                try {
                                  const res = await fileApi.upload(option.file as File);
                                  setAttachUrl(res.file_url);
                                  message.success("附件已上传");
                                  option.onSuccess?.(res);
                                } catch (error) {
                                  notification.error({ message: "附件上传失败", description: takeErr(error) });
                                  option.onError?.(new Error("upload-error"));
                                }
                              }}
                            >
                              <Button icon={<CloudUploadOutlined />}>上传附件</Button>
                            </Upload>
                            {attachUrl && (
                              <Typography.Paragraph style={{ marginTop: 12 }}>
                                已上传地址：{attachUrl}
                              </Typography.Paragraph>
                            )}
                          </Form.Item>
                          <Space>
                            <Button type="primary" htmlType="submit" loading={saving}>
                              提交作业
                            </Button>
                            <Button
                              onClick={() => {
                                setTaskTarget(null);
                                setAttachUrl("");
                                submitForm.resetFields();
                              }}
                            >
                              取消
                            </Button>
                          </Space>
                        </Form>
                      ) : submissions.length === 0 ? (
                        <Skeleton active paragraph={{ rows: 3 }} />
                      ) : (
                        <Space direction="vertical" size={14} style={{ width: "100%" }}>
                          {submissions.map((item) => (
                            <Card key={item.id} className="inline-panel">
                              <Typography.Title level={5}>{item.task_title}</Typography.Title>
                              <Typography.Paragraph>{item.summary_text}</Typography.Paragraph>
                              <Tag color={item.score === null ? "gold" : "green"}>
                                {item.score === null ? "待批阅" : `${item.score} 分`}
                              </Tag>
                              <Typography.Paragraph style={{ marginTop: 8 }}>
                                {item.teacher_note || "教师暂未给出评语"}
                              </Typography.Paragraph>
                            </Card>
                          ))}
                        </Space>
                      )}
                    </Card>
                  </Col>
                </Row>
              )}

              {section === "campaigns" && (
                <Row gutter={[18, 18]}>
                  <Col xs={24} xl={9}>
                    <Card className="soft-card" title={campEditId ? "编辑我的营销方案" : "新增我的营销方案"}>
                      <Form form={campForm} layout="vertical" onFinish={saveCampaign}>
                        <Form.Item name="name" label="方案名称" rules={[{ required: true, message: "请输入方案名称" }]}>
                          <Input placeholder="请输入方案名称" />
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
                          <Button type="primary" htmlType="submit" loading={saving} icon={<PlusOutlined />}>
                            {campEditId ? "保存方案" : "创建方案"}
                          </Button>
                          <Button icon={<DownloadOutlined />} onClick={exportLeads}>
                            下载客户样本
                          </Button>
                        </Space>
                      </Form>
                    </Card>
                  </Col>
                  <Col xs={24} xl={15}>
                    <Card className="soft-card" title="我的营销演练">
                      <Table
                        rowKey="id"
                        dataSource={campaigns}
                        pagination={{ pageSize: 5 }}
                        columns={[
                          { title: "方案", dataIndex: "name" },
                          { title: "渠道", dataIndex: "channel" },
                          { title: "客群", dataIndex: "segment" },
                          {
                            title: "状态",
                            render: (_, row: CampaignRow) =>
                              row.status === "sent" ? <Tag color="green">已投放</Tag> : <Tag color="processing">草稿</Tag>,
                          },
                          {
                            title: "效果",
                            render: (_, row: CampaignRow) =>
                              `${row.sent_size} 触达 / ${row.click_size} 点击 / ${row.convert_size} 转化`,
                          },
                          {
                            title: "操作",
                            render: (_, row: CampaignRow) => (
                              <Space wrap>
                                <Button
                                  disabled={row.status === "sent"}
                                  onClick={() => {
                                    setCampEditId(row.id);
                                    campForm.setFieldsValue(row);
                                  }}
                                >
                                  编辑
                                </Button>
                                <Button type="primary" disabled={row.status === "sent"} onClick={() => runCampaign(row.id)}>
                                  立即投放
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
    </Layout>
  );
}

function takeErr(error: unknown): string {
  const msg = (error as { response?: { data?: { detail?: string } }; message?: string }).response?.data?.detail;
  return msg || (error as { message?: string }).message || "请稍后再试";
}
