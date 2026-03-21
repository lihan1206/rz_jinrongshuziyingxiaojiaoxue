# 金融数字营销教学实训系统

## 🛠 技术栈
- Frontend: React 19 + TypeScript + Vite + Ant Design
- Backend: FastAPI + SQLAlchemy
- Database: PostgreSQL 15

## 🚀 启动指南 (How to Run)
1. 确保 Docker Desktop 已启动。
2. 在根目录执行：`docker compose up --build`
3. 等待容器启动完成。

## 🔗 服务地址 (Services)
- Frontend: http://localhost:3000
- Backend Swagger: http://localhost:8000/docs
- Database: localhost:5432 (user: postgres / pass: postgres)

## 🧪 测试账号
- Admin: admin / 123456
- Student: xueyuan01 / 123456

## 项目说明
- 提供教师与学员双角色登录。
- 教师可管理课程内容、布置实训任务、批阅作业、创建并投放营销演练方案。
- 学员可浏览课程内容、提交作业、上传附件、创建个人营销方案并查看投放结果。
- 系统启动时会自动写入真实演示数据，页面首次打开即可看到内容。

## 🐳 Docker 镜像源配置 (Docker Registry Configuration)

### 推荐配置（基于实际项目验证）

#### 1. Docker 镜像源
**使用官方 Docker Hub 镜像**

```yaml
services:
  db:
    image: postgres:15-alpine

  backend:
    build: ./backend

  frontend:
    build: ./frontend
```

#### 2. npm 依赖源
**使用淘宝镜像**

在 `frontend/Dockerfile` 中已添加：

```dockerfile
RUN npm config set registry https://registry.npmmirror.com
```

#### 3. 前端构建加速规范 (Fast Build with npm ci)

当前仓库已保留 `package-lock.json`，容器构建可直接复用锁定依赖。

#### 4. 常用镜像说明
- PostgreSQL: `postgres:15-alpine`
- Frontend 构建: `node:20-alpine`
- Frontend 运行: `nginx:alpine`
- Backend: `python:3.11-slim`
