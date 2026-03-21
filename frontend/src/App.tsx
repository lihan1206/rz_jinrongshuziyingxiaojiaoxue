import { App as AntApp, ConfigProvider, theme, notification } from "antd";
import zhCN from "antd/locale/zh_CN";
import { useEffect, useState } from "react";

import { authApi } from "./api/modules";
import { ErrorFallback } from "./components/ErrorFallback";
import { loginRule, registerRule } from "./lib/guards";
import { AuthPage } from "./pages/AuthPage";
import { StudentHome } from "./pages/StudentHome";
import { TeacherHome } from "./pages/TeacherHome";
import type { UserProfile } from "./types";

function App() {
  const [api, holder] = notification.useNotification();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("fm_token");
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((res) => setProfile(res))
      .catch(() => {
        localStorage.removeItem("fm_token");
        setProfile(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleLogin(values: { username: string; password: string }) {
    try {
      const payload = loginRule.parse(values);
      setBusy(true);
      const res = await authApi.login(payload);
      localStorage.setItem("fm_token", res.access_token);
      setProfile(res.profile);
    } catch (error) {
      api.error({ message: "登录失败", description: grabErr(error) });
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister(values: {
    username: string;
    password: string;
    full_name?: string;
    role?: "teacher" | "student";
  }) {
    try {
      const payload = registerRule.parse(values);
      setBusy(true);
      const res = await authApi.register(payload);
      localStorage.setItem("fm_token", res.access_token);
      setProfile(res.profile);
    } catch (error) {
      api.error({ message: "注册失败", description: grabErr(error) });
    } finally {
      setBusy(false);
    }
  }

  function logoutNow() {
    localStorage.removeItem("fm_token");
    setProfile(null);
  }

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#0f766e",
          colorInfo: "#0f766e",
          borderRadius: 20,
          fontFamily: `"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif`,
        },
      }}
    >
      <AntApp>
        {holder}
        <ErrorFallback>
          {loading ? (
            <div className="page-shell" />
          ) : profile ? (
            profile.role === "teacher" ? (
              <TeacherHome profile={profile} onLogout={logoutNow} />
            ) : (
              <StudentHome profile={profile} onLogout={logoutNow} />
            )
          ) : (
            <AuthPage busy={busy} onLogin={handleLogin} onRegister={handleRegister} />
          )}
        </ErrorFallback>
      </AntApp>
    </ConfigProvider>
  );
}

function grabErr(error: unknown): string {
  const msg = (error as { response?: { data?: { detail?: string } }; message?: string }).response?.data?.detail;
  return msg || (error as { message?: string }).message || "请检查输入后重试";
}

export default App;
