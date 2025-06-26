# FiveChat Docker 管理脚本使用指南

本项目提供了两个管理脚本来简化 FiveChat Docker 环境的安装、卸载和管理。

## 脚本文件

- `manage-fivechat.ps1` - Windows PowerShell 脚本
- `manage-fivechat.sh` - Linux/macOS/WSL Bash 脚本

## 功能特性

✅ **智能安装**: 自动检查并创建 `.env` 配置文件  
✅ **完全卸载**: 彻底清理所有容器、镜像和数据  
✅ **服务管理**: 重启、状态查看、日志监控  
✅ **交互式配置**: 自动打开编辑器编辑配置文件  
✅ **错误检查**: 自动检查 Docker 环境和依赖  

## 使用方法

### Windows (PowerShell)

```powershell
# 安装 FiveChat
.\manage-fivechat.ps1 install

# 查看状态
.\manage-fivechat.ps1 status

# 查看日志
.\manage-fivechat.ps1 logs

# 重启服务
.\manage-fivechat.ps1 restart

# 完全卸载
.\manage-fivechat.ps1 uninstall

# 显示帮助
.\manage-fivechat.ps1 help
```

### Linux/macOS/WSL (Bash)

```bash
# 给脚本添加执行权限 (仅首次需要)
chmod +x manage-fivechat.sh

# 安装 FiveChat
./manage-fivechat.sh install

# 查看状态
./manage-fivechat.sh status

# 查看日志
./manage-fivechat.sh logs

# 重启服务
./manage-fivechat.sh restart

# 完全卸载
./manage-fivechat.sh uninstall

# 显示帮助
./manage-fivechat.sh help
```

## 安装流程详解

### 1. 首次安装

运行安装命令时，脚本会：

1. **检查 Docker 环境** - 确保 Docker 和 Docker Compose 已安装并运行
2. **处理配置文件**:
   - 如果 `.env` 不存在，自动从 `.env.example` 复制
   - 自动打开编辑器让你编辑配置
3. **拉取镜像** - 下载最新的 FiveChat 和 PostgreSQL 镜像
4. **启动服务** - 启动所有容器
5. **显示状态** - 显示服务运行状态和访问地址

### 2. 配置编辑

脚本会自动尝试使用以下编辑器（按优先级）：
- **Windows**: VS Code → 记事本
- **Linux/macOS**: VS Code → nano → vim → vi

### 3. 重要配置项

编辑 `.env` 文件时，请注意以下配置：

```env
# 管理员授权码 - 用于首次设置管理员账号
ADMIN_CODE=11223344

# 服务端口 - 默认 3000
HOST_PORT=3000

# 认证密钥 - 生产环境请重新生成
AUTH_SECRET=PKqQmr74pyUXLR18kx85is9yXguIinaJ40DrOBim+Tg=

# 访问地址 - 生产环境请修改为实际域名
NEXTAUTH_URL=http://localhost:3000
```

## 卸载说明

运行卸载命令时，脚本会：

1. **确认操作** - 要求用户确认删除所有数据
2. **停止服务** - 停止所有容器
3. **删除资源**:
   - 删除容器和数据卷
   - 删除相关镜像
   - 清理未使用的 Docker 资源
4. **可选删除** - 询问是否删除 `.env` 配置文件

⚠️ **警告**: 卸载操作会永久删除所有聊天数据和用户信息，请谨慎操作！

## 访问应用

安装完成后：

1. **主页面**: http://localhost:3000
2. **管理员设置**: http://localhost:3000/setup
3. **使用授权码**: 查看 `.env` 文件中的 `ADMIN_CODE` 值

## 故障排除

### 常见问题

1. **Docker 未启动**
   ```
   错误: Docker 服务未启动
   解决: 启动 Docker Desktop
   ```

2. **端口被占用**
   ```bash
   # Windows
   netstat -ano | findstr :3000
   
   # Linux/macOS
   lsof -i :3000
   ```

3. **权限问题 (Linux/macOS)**
   ```bash
   chmod +x manage-fivechat.sh
   ```

### 查看详细日志

```bash
# 查看应用日志
docker logs fivechat

# 查看数据库日志
docker logs fivechat-db

# 查看所有服务日志
docker-compose logs -f
```

### 重新生成认证密钥

```bash
# 生成新的 AUTH_SECRET
openssl rand -base64 32
```

## 手动操作

如果脚本无法正常工作，可以手动执行以下命令：

```bash
# 停止服务
docker-compose down

# 完全清理
docker-compose down -v
docker system prune -f

# 重新启动
docker-compose up -d
```

## 技术支持

如果遇到问题，请：

1. 查看脚本输出的错误信息
2. 检查 Docker 服务状态
3. 查看容器日志
4. 确认 `.env` 配置正确

---

**注意**: 这些脚本适用于开发和测试环境。生产环境部署请参考官方文档进行额外的安全配置。
