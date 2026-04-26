import {
  AppstoreOutlined,
  BookOutlined,
  BulbOutlined,
  LockOutlined,
  RadarChartOutlined,
  RocketOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button, Card, Col, Form, Input, Radio, Row, Tabs, Tag, Typography } from "antd";

interface AuthValues {
  username: string;
  password: string;
  full_name?: string;
  role?: "teacher" | "student";
}

interface AuthPageProps {
  busy: boolean;
  onLogin: (values: AuthValues) => Promise<void>;
  onRegister: (values: AuthValues) => Promise<void>;
}

const featureCards = [
  {
    icon: <RadarChartOutlined />,
    title: "双角色切换",
    text: "教师、学员各自拥有完全不同的工作台和信息结构。",
  },
  {
    icon: <BookOutlined />,
    title: "课程与任务",
    text: "课程内容、实训任务、投放演练和提交记录统一串联。",
  },
  {
    icon: <RocketOutlined />,
    title: "营销演练",
    text: "投放方案支持创建、编辑、投放和导出样本数据。",
  },
];

export function AuthPage(props: AuthPageProps) {
  return (
    <div className="auth-wrap">
      <div className="auth-shell">
        <section className="auth-hero">
          <div className="auth-hero__tagline">
            <Tag color="gold">金融数字营销教学实训系统</Tag>
            <Tag color="volcano">教学实验室</Tag>
          </div>
          <Typography.Title level={1} className="auth-hero__title">
            金融数字营销教学实训系统
          </Typography.Title>
          <Typography.Paragraph className="auth-hero__desc">
            这不是普通的管理后台入口，而是一个把课程、批阅、投放和学习档案串成一体的教学中枢。
          </Typography.Paragraph>
          <div className="auth-hero__stats">
            <div>
              <strong>2</strong>
              <span>角色空间</span>
            </div>
            <div>
              <strong>6+</strong>
              <span>功能板块</span>
            </div>
            <div>
              <strong>1</strong>
              <span>套完整教学流</span>
            </div>
          </div>
        </section>

        <Card className="auth-card" bordered={false}>
          <div className="auth-card__header">
            <div>
              <Typography.Text className="section-kicker">Access Console</Typography.Text>
              <Typography.Title level={2}>进入系统</Typography.Title>
            </div>
            <div className="auth-card__accent">
              <ThunderboltOutlined />
            </div>
          </div>

          <Tabs
            defaultActiveKey="login"
            items={[
              {
                key: "login",
                label: "登录",
                children: (
                  <Form layout="vertical" onFinish={props.onLogin}>
                    <Form.Item label="账号" name="username" rules={[{ required: true, message: "请输入账号" }]}>
                      <Input size="large" prefix={<UserOutlined />} placeholder="请输入账号" />
                    </Form.Item>
                    <Form.Item label="密码" name="password" rules={[{ required: true, message: "请输入密码" }]}>
                      <Input.Password size="large" prefix={<LockOutlined />} placeholder="请输入密码" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" size="large" loading={props.busy} block>
                      进入教学中枢
                    </Button>
                  </Form>
                ),
              },
              {
                key: "register",
                label: "注册",
                children: (
                  <Form layout="vertical" onFinish={props.onRegister}>
                    <Form.Item label="姓名" name="full_name" rules={[{ required: true, message: "请输入姓名" }]}>
                      <Input size="large" prefix={<BulbOutlined />} placeholder="请输入姓名" />
                    </Form.Item>
                    <Form.Item label="账号" name="username" rules={[{ required: true, message: "请输入账号" }]}>
                      <Input size="large" prefix={<UserOutlined />} placeholder="请输入账号" />
                    </Form.Item>
                    <Form.Item label="密码" name="password" rules={[{ required: true, message: "请输入密码" }]}>
                      <Input.Password size="large" prefix={<LockOutlined />} placeholder="请输入密码" />
                    </Form.Item>
                    <Form.Item label="角色" name="role" rules={[{ required: true, message: "请选择角色" }]}>
                      <Radio.Group optionType="button" buttonStyle="solid">
                        <Radio.Button value="student">学员</Radio.Button>
                        <Radio.Button value="teacher">教师</Radio.Button>
                      </Radio.Group>
                    </Form.Item>
                    <Button type="primary" htmlType="submit" size="large" loading={props.busy} block>
                      创建账号
                    </Button>
                  </Form>
                ),
              },
            ]}
          />
        </Card>

       
      </div>
    </div>
  );
}
