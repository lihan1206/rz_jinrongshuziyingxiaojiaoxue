import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, Radio, Tabs, Typography } from "antd";

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

export function AuthPage(props: AuthPageProps) {
  return (
    <div className="auth-wrap">
      <div className="auth-bg auth-bg-one" />
      <div className="auth-bg auth-bg-two" />
      <Card className="auth-card" bordered={false}>
        <Typography.Title level={1} className="auth-title">
          金融数字营销教学实训系统
        </Typography.Title>
        <Tabs
          defaultActiveKey="login"
          items={[
            {
              key: "login",
              label: "登录",
              children: (
                <Form layout="vertical" onFinish={props.onLogin}>
                  <Form.Item label="账号" name="username" rules={[{ required: true, message: "请输入账号" }]}>
                    <Input prefix={<UserOutlined />} placeholder="请输入账号" size="large" />
                  </Form.Item>
                  <Form.Item label="密码" name="password" rules={[{ required: true, message: "请输入密码" }]}>
                    <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" size="large" />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" size="large" loading={props.busy} block>
                    进入系统
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
                    <Input placeholder="请输入姓名" size="large" />
                  </Form.Item>
                  <Form.Item label="账号" name="username" rules={[{ required: true, message: "请输入账号" }]}>
                    <Input prefix={<UserOutlined />} placeholder="请输入账号" size="large" />
                  </Form.Item>
                  <Form.Item label="密码" name="password" rules={[{ required: true, message: "请输入密码" }]}>
                    <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" size="large" />
                  </Form.Item>
                  <Form.Item label="角色" name="role" rules={[{ required: true, message: "请选择角色" }]}>
                    <Radio.Group optionType="button" buttonStyle="solid">
                      <Radio.Button value="student">学员</Radio.Button>
                      <Radio.Button value="teacher">教师</Radio.Button>
                    </Radio.Group>
                  </Form.Item>
                  <Button type="primary" htmlType="submit" size="large" loading={props.busy} block>
                    完成注册
                  </Button>
                </Form>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

