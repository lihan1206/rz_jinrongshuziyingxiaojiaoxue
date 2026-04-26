import {
  BookOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
  FireOutlined,
  FundProjectionScreenOutlined,
  LogoutOutlined,
  PlusOutlined,
  ReadOutlined,
  RocketOutlined,
  SendOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Col,
  Form,
  Input,
  Layout,
  List,
  Menu,
  Progress,
  Row,
  Select,
  Skeleton,
  Space,
  Spin,
  Tag,
  Timeline,
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

type StudentSection = "overview" | "contents" | "tasks" | "campaigns" | "learning-map" | "portfolio";

const navItems = [
  { key: "overview", icon: <FundProjectionScreenOutlined />, label: "指挥台" },
  { key: "contents", icon: <BookOutlined />, label: "知识工坊" },
  { key: "tasks", icon: <ReadOutlined />, label: "任务中心" },
  { key: "campaigns", icon: <SendOutlined />, label: "投放演练" },
  { key: "learning-map", icon: <ThunderboltOutlined />, label: "学习地图" },
  { key: "portfolio", icon: <TrophyOutlined />, label: "成长档案" },
];

export function StudentHome({ profile, onLogout }: { profile: UserProfile; onLogout: () => void }) {
  const { message, notification } = App.useApp();
  const [section, setSection] = useState<StudentSection>("overview");
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
  const [attachUrl, setAttachUrl] = useState("");
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

  const reviewedCount = useMemo(() => submissions.filter((item) => item.score !== null).length, [submissions]);
  const pendingCount = useMemo(() => submissions.filter((item) => item.score === null).length, [submissions]);
  const bestSubmission = useMemo(
    () =>
      [...submissions]
        .filter((item) => item.score !== null)
        .sort((a, b) => (b.score || 0) - (a.score || 0))[0] || null,
    [submissions],
  );
  const bestScore = bestSubmission?.score ?? 0;

  const topCategories = useMemo(() => {
    const map = new Map<string, number>();
    articles.forEach((article) => {
      map.set(article.category, (map.get(article.category) || 0) + 1);
    });
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, count]) => ({ name, count }));
  }, [articles]);

  const upcomingTasks = useMemo(() => tasks.slice().sort((a, b) => dayjs(a.due_at).valueOf() - dayjs(b.due_at).valueOf()).slice(0, 4), [tasks]);
  const recentSubmissions = useMemo(() => [...submissions].sort((a, b) => dayjs(b.submitted_at).valueOf() - dayjs(a.submitted_at).valueOf()).slice(0, 4), [submissions]);
  const latestCampaigns = useMemo(() => campaigns.slice(0, 3), [campaigns]);

  const scoreRate = useMemo(() => {
    if (!overview || overview.submission_count === 0) {
      return 0;
    }
    return Math.round((overview.reviewed_count / overview.submission_count) * 100);
  }, [overview]);

  const learnSteps = [
    {
      title: "内容积累",
      desc: "从课程文章里建立金融营销、客户分层和投放文案的基础认知。",
      value: Math.min(100, Math.max(30, (overview?.article_count || 0) * 12)),
    },
    {
      title: "任务演练",
      desc: "通过实训任务形成方法论，并在提交与批阅中不断修正作品。",
      value: Math.min(100, Math.max(20, (overview?.task_count || 0) * 10 + reviewedCount * 5)),
    },
    {
      title: "商业投放",
      desc: "把学习成果放进营销方案里，观察触达、点击和转化的变化。",
      value: Math.min(100, Math.max(10, (overview?.campaign_count || 0) * 18)),
    },
  ];

  const recommendations = [
    pendingCount > 0 ? `当前还有 ${pendingCount} 份作业等待老师批阅，建议先完善最近一次提交。` : "你最近的作业都已批阅，适合继续挑战更高难度任务。",
    upcomingTasks.length > 0 ? `最近截止的是《${upcomingTasks[0].title}》，距离截止时间不要太远。` : "暂无待提交任务，可以优先浏览课程内容和投放案例。",
    latestCampaigns.length > 0 ? `已有 ${latestCampaigns.length} 个投放演练可复盘，重点观察点击和转化差异。` : "你还没有投放演练，建议尽快创建一个方案练手。",
  ];

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
        message.success("投放方案已更新");
      } else {
        await campaignApi.create(payload);
        message.success("投放方案已创建");
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
      message.success("方案已投放");
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
      link.download = "客户样本.csv";
      link.click();
      window.URL.revokeObjectURL(url);
      message.success("样本已下载");
    } catch (error) {
      notification.error({ message: "下载失败", description: takeErr(error) });
    }
  }

  return (
    <Layout className="workbench workbench--student">
      <Sider breakpoint="lg" collapsedWidth="0" width={250} className="app-sider">
        <div className="brand-box">
          <Typography.Text className="section-kicker">Student Console</Typography.Text>
          <Typography.Title level={4}>学员工作台</Typography.Title>
          <Typography.Paragraph>{profile.full_name}</Typography.Paragraph>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[section]}
          items={navItems}
          onClick={(info) => setSection(info.key as StudentSection)}
        />
      </Sider>
      <Layout>
        <Header className="top-bar">
          <div>
            <Typography.Text className="section-kicker">Welcome back</Typography.Text>
            <Typography.Title level={3}>金融数字营销教学中枢</Typography.Title>
          </div>
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
            <Space direction="vertical" size={20} style={{ width: "100%" }}>
              {section === "overview" && overview && (
                <>
                  <Card className="hero-board hero-board--student">
                    <Row gutter={[20, 20]} align="middle">
                      <Col xs={24} xl={15}>
                        <Typography.Text className="section-kicker">Learning snapshot</Typography.Text>
                        <Typography.Title level={2}>把学习、任务与投放串成一条成长线</Typography.Title>
                        <Typography.Paragraph className="hero-copy">
                          这里不再是单纯的列表，而是一个从内容吸收、任务演练到商业投放的闭环工作区。
                        </Typography.Paragraph>
                        <Space wrap>
                          <Button type="primary" onClick={() => setSection("tasks")}>
                            去提交任务
                          </Button>
                          <Button onClick={() => setSection("learning-map")}>查看学习地图</Button>
                          <Button onClick={() => setSection("portfolio")}>查看成长档案</Button>
                        </Space>
                      </Col>
                      <Col xs={24} xl={9}>
                        <Card className="glow-card" bordered={false}>
                          <Progress type="dashboard" percent={scoreRate} strokeColor="#d97706" />
                          <Typography.Paragraph style={{ marginTop: 16 }}>
                            批阅完成率
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
                  <Row gutter={[16, 16]}>
                    <Col xs={24} xl={10}>
                      <Card className="soft-card" title="学习建议">
                        <Space direction="vertical" size={12} style={{ width: "100%" }}>
                          {recommendations.map((item, index) => (
                            <Card key={item} className="mini-spotlight" bordered={false}>
                              <Space align="start">
                                <div className="mini-spotlight__icon">{index + 1}</div>
                                <Typography.Paragraph>{item}</Typography.Paragraph>
                              </Space>
                            </Card>
                          ))}
                        </Space>
                      </Card>
                    </Col>
                    <Col xs={24} xl={14}>
                      <Card className="soft-card" title="知识标签热度">
                        <Space wrap>
                          {topCategories.length > 0 ? (
                            topCategories.map((item) => (
                              <Tag key={item.name} color="volcano">
                                {item.name} · {item.count}
                              </Tag>
                            ))
                          ) : (
                            <Typography.Text type="secondary">暂无课程标签</Typography.Text>
                          )}
                        </Space>
                        <div className="insight-grid">
                          {learnSteps.map((item) => (
                            <div key={item.title} className="insight-card">
                              <div className="insight-card__head">
                                <Typography.Title level={5}>{item.title}</Typography.Title>
                                <span>{item.value}%</span>
                              </div>
                              <Progress percent={item.value} showInfo={false} strokeColor="#d97706" />
                              <Typography.Paragraph>{item.desc}</Typography.Paragraph>
                            </div>
                          ))}
                        </div>
                      </Card>
                    </Col>
                  </Row>
                </>
              )}

              {section === "contents" && (
                <Card className="soft-card" title="知识工坊">
                  <Row gutter={[16, 16]}>
                    {articles.map((item) => (
                      <Col xs={24} md={12} xxl={8} key={item.id}>
                        <Card
                          className="content-card"
                          title={item.title}
                          extra={<Tag color="processing">{item.category}</Tag>}
                        >
                          <Typography.Paragraph>{item.brief}</Typography.Paragraph>
                          <Typography.Paragraph className="content-card__body" style={{ whiteSpace: "pre-line" }}>
                            {item.body_text}
                          </Typography.Paragraph>
                          <Space wrap>
                            <Tag icon={<FireOutlined />} color="gold">
                              {item.creator_name}
                            </Tag>
                            {item.video_link && (
                              <a href={item.video_link} target="_blank" rel="noreferrer">
                                打开教学视频
                              </a>
                            )}
                          </Space>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </Card>
              )}

              {section === "tasks" && (
                <Row gutter={[16, 16]}>
                  <Col xs={24} xl={14}>
                    <Card className="soft-card" title="任务中心">
                      <List
                        itemLayout="vertical"
                        dataSource={upcomingTasks}
                        renderItem={(row) => (
                          <List.Item
                            key={row.id}
                            className="task-card"
                            extra={
                              <Button type="primary" onClick={() => setTaskTarget(row)}>
                                进入提交
                              </Button>
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
                              <Tag color="green">已提交 {row.total_submit}</Tag>
                            </Space>
                          </List.Item>
                        )}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} xl={10}>
                    <Card className="soft-card" title={taskTarget ? `提交任务：${taskTarget.title}` : "我的提交记录"}>
                      {taskTarget ? (
                        <Form form={submitForm} layout="vertical" onFinish={submitWork}>
                          <Form.Item
                            label="提交内容"
                            name="summary_text"
                            rules={[{ required: true, message: "请输入提交内容" }]}
                          >
                            <Input.TextArea rows={6} placeholder="说明你的思路、结论和复盘" />
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
                          {recentSubmissions.map((item) => (
                            <Card key={item.id} className="inline-panel">
                              <Typography.Title level={5}>{item.task_title}</Typography.Title>
                              <Typography.Paragraph>{item.summary_text}</Typography.Paragraph>
                              <Space wrap>
                                <Tag color={item.score === null ? "gold" : "green"}>
                                  {item.score === null ? "待批阅" : `${item.score} 分`}
                                </Tag>
                                <Tag color="default">{dayjs(item.submitted_at).format("YYYY-MM-DD HH:mm")}</Tag>
                              </Space>
                              <Typography.Paragraph style={{ marginTop: 12 }}>
                                {item.teacher_note || "老师暂未给出批语"}
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
                <Row gutter={[16, 16]}>
                  <Col xs={24} xl={9}>
                    <Card className="soft-card" title={campEditId ? "编辑投放方案" : "新建投放方案"}>
                      <Form form={campForm} layout="vertical" onFinish={saveCampaign}>
                        <Form.Item name="name" label="方案名称" rules={[{ required: true, message: "请输入方案名称" }]}>
                          <Input placeholder="例如：基金新客召回" />
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
                          <Button type="primary" htmlType="submit" loading={saving} icon={<PlusOutlined />}>
                            {campEditId ? "保存方案" : "创建方案"}
                          </Button>
                          <Button icon={<DownloadOutlined />} onClick={exportLeads}>
                            下载样本
                          </Button>
                        </Space>
                      </Form>
                    </Card>
                  </Col>
                  <Col xs={24} xl={15}>
                    <Card className="soft-card" title="投放演练">
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
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    </Card>
                  </Col>
                </Row>
              )}

              {section === "learning-map" && (
                <Row gutter={[16, 16]}>
                  <Col xs={24} xl={12}>
                    <Card className="soft-card" title="学习地图">
                      <Timeline
                        items={learnSteps.map((item) => ({
                          children: (
                            <div>
                              <Typography.Title level={5}>{item.title}</Typography.Title>
                              <Progress percent={item.value} strokeColor="#d97706" />
                              <Typography.Paragraph>{item.desc}</Typography.Paragraph>
                            </div>
                          ),
                        }))}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} xl={12}>
                    <Card className="soft-card" title="路径建议">
                      <Space direction="vertical" size={14} style={{ width: "100%" }}>
                        <Card className="mini-spotlight" bordered={false}>
                          <Typography.Title level={5}>下一步重点</Typography.Title>
                          <Typography.Paragraph>
                            先完成最近一项任务，再复盘对应课程文章，最后把思路迁移到投放演练里。
                          </Typography.Paragraph>
                        </Card>
                        <Card className="mini-spotlight" bordered={false}>
                          <Typography.Title level={5}>内容偏好</Typography.Title>
                          <Space wrap>
                            {topCategories.length > 0 ? (
                              topCategories.map((item) => (
                                <Tag key={item.name} color="gold">
                                  {item.name}
                                </Tag>
                              ))
                            ) : (
                              <Typography.Text type="secondary">暂无标签可用</Typography.Text>
                            )}
                          </Space>
                        </Card>
                        <Card className="mini-spotlight" bordered={false}>
                          <Typography.Title level={5}>投放视角</Typography.Title>
                          <Typography.Paragraph>
                            保持关注点击率和转化率的差异，投放不是把内容发出去，而是把策略验证出来。
                          </Typography.Paragraph>
                        </Card>
                      </Space>
                    </Card>
                  </Col>
                </Row>
              )}

              {section === "portfolio" && (
                <Row gutter={[16, 16]}>
                  <Col xs={24} xl={11}>
                    <Card className="soft-card" title="成长档案">
                      <Timeline
                        items={recentSubmissions.map((item) => ({
                          children: (
                            <div>
                              <Typography.Title level={5}>{item.task_title}</Typography.Title>
                              <Typography.Paragraph>{item.summary_text}</Typography.Paragraph>
                              <Space wrap>
                                <Tag color={item.score === null ? "gold" : "green"}>
                                  {item.score === null ? "待批阅" : `${item.score} 分`}
                                </Tag>
                                <Tag color="default">{dayjs(item.submitted_at).format("YYYY-MM-DD HH:mm")}</Tag>
                              </Space>
                            </div>
                          ),
                        }))}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} xl={13}>
                    <Card className="soft-card" title="成果概览">
                      <StatCards
                        items={[
                          { title: "已批阅", value: reviewedCount, suffix: "份" },
                          { title: "待批阅", value: pendingCount, suffix: "份" },
                          { title: "最佳成绩", value: bestScore, suffix: "分" },
                          { title: "投放方案", value: campaigns.length, suffix: "个" },
                        ]}
                      />
                      <div className="insight-grid">
                        {latestCampaigns.length > 0 ? (
                          latestCampaigns.map((item) => (
                            <div key={item.id} className="insight-card">
                              <div className="insight-card__head">
                                <Typography.Title level={5}>{item.name}</Typography.Title>
                                <Tag color={item.status === "sent" ? "green" : "blue"}>{item.status === "sent" ? "已投放" : "草稿"}</Tag>
                              </div>
                              <Typography.Paragraph>{item.segment}</Typography.Paragraph>
                              <Typography.Paragraph>
                                {item.sent_size} 触达 / {item.click_size} 点击 / {item.convert_size} 转化
                              </Typography.Paragraph>
                            </div>
                          ))
                        ) : (
                          <Skeleton active paragraph={{ rows: 3 }} />
                        )}
                      </div>
                      {bestSubmission && (
                        <Card className="mini-spotlight" bordered={false} style={{ marginTop: 16 }}>
                          <Typography.Title level={5}>最佳作品</Typography.Title>
                          <Typography.Paragraph>{bestSubmission.task_title}</Typography.Paragraph>
                          <Typography.Paragraph>{bestSubmission.teacher_note || "暂无老师点评"}</Typography.Paragraph>
                        </Card>
                      )}
                    </Card>
                  </Col>
                </Row>
              )}
            </Space>
          )}
        </Content>
      </Layout>
    </Layout>
  );
}

function takeErr(error: unknown): string {
  const msg = (error as { response?: { data?: { detail?: string } }; message?: string }).response?.data?.detail;
  return msg || (error as { message?: string }).message || "请稍后重试";
}
