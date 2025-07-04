# GitHub Actions 工作流程说明

## 自动构建流程

本项目配置了自动化的 Docker 镜像构建和推送流程，支持以下触发条件：

### 🚀 自动触发条件

1. **推送到 main 分支**
   - 自动构建并推送 Docker 镜像到 GitHub Container Registry (GHCR)
   - 镜像标签：`latest`、`yymmdd`（日期版本）和 `main-<git-sha>`
   - 支持多平台构建：`linux/amd64`, `linux/arm64`

2. **创建 Pull Request 到 main 分支**
   - 仅构建 Docker 镜像，不推送到 GHCR
   - 镜像标签：`pr-<number>`
   - 仅构建 `linux/amd64` 平台以节省时间

3. **手动触发**
   - 可以指定自定义版本号
   - 支持多平台构建和推送
   - 支持三种环境：production、staging、development

### 📋 工作流程步骤

#### 1. 测试阶段 (test job)
- 代码检出
- Node.js 环境设置 (v22)
- 依赖安装
- 代码检查 (ESLint)
- 应用构建测试

#### 2. Docker 构建阶段 (build job)
- 仅在测试通过后执行
- 多平台构建支持
- 智能缓存机制
- 条件性推送到 GitHub Container Registry (GHCR)

### 🔧 所需的配置

**无需额外配置！** 使用 GitHub Container Registry 的优势：

- ✅ 自动使用 `GITHUB_TOKEN`，无需手动配置 Secrets
- ✅ 与 GitHub 仓库权限自动同步
- ✅ 免费的私有镜像存储
- ✅ 更好的集成和安全性

### 📦 镜像标签策略

- `latest`: 推送到 main 分支时的最新版本
- `yymmdd`: 推送到 main 分支时的日期版本（如 `250104` 表示 2025年1月4日）
  - 💡 **推荐用于生产环境**：提供可追溯的版本标识
  - 🔒 **稳定性**：避免 `latest` 标签的不确定性
  - 📅 **易于管理**：基于日期的版本便于回滚和追踪
- `<version>`: 手动触发时指定的版本号
- `pr-<number>`: Pull Request 构建版本
- `<branch>-<sha>`: 分支名称和 Git SHA 组合

### 🚫 忽略的文件

以下文件变更不会触发构建：
- Markdown 文件 (`**.md`)
- `.gitignore`
- `LICENSE`
- `docs/**` 目录

### 🔍 构建优化

- 使用 GitHub Actions 缓存加速构建
- 多阶段 Docker 构建减少镜像大小
- 条件性多平台构建节省资源
- 智能标签管理避免重复推送
