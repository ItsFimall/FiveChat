#!/bin/bash

# FiveChat Docker 管理脚本
# 作者: FiveChat Team
# 版本: 1.0

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 输出带颜色的文本
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# 检查 Docker 是否安装
check_docker() {
    if ! command -v docker &> /dev/null || ! command -v docker-compose &> /dev/null; then
        print_color $RED "错误: Docker 或 Docker Compose 未安装"
        print_color $YELLOW "请先安装 Docker 和 Docker Compose"
        return 1
    fi
    
    if ! docker info &> /dev/null; then
        print_color $RED "错误: Docker 服务未启动"
        print_color $YELLOW "请启动 Docker 服务"
        return 1
    fi
    
    return 0
}

# 检查 .env 文件
check_env_file() {
    [ -f ".env" ]
}

# 创建 .env 文件
create_env_file() {
    if [ -f ".env.example" ]; then
        cp ".env.example" ".env"
        print_color $GREEN "已创建 .env 文件，基于 .env.example"
        return 0
    else
        print_color $RED "错误: .env.example 文件不存在"
        return 1
    fi
}

# 编辑 .env 文件
edit_env_file() {
    print_color $YELLOW "正在打开 .env 文件进行编辑..."
    print_color $CYAN "请根据需要修改配置，保存后关闭编辑器继续安装"
    
    # 尝试使用不同的编辑器
    if command -v code &> /dev/null; then
        # 使用 VS Code
        code .env
        read -p "请在 VS Code 中编辑 .env 文件，完成后按 Enter 继续..."
    elif command -v nano &> /dev/null; then
        # 使用 nano
        nano .env
    elif command -v vim &> /dev/null; then
        # 使用 vim
        vim .env
    elif command -v vi &> /dev/null; then
        # 使用 vi
        vi .env
    else
        print_color $YELLOW "未找到合适的编辑器，请手动编辑 .env 文件"
        read -p "编辑完成后按 Enter 继续..."
    fi
}

# 安装 FiveChat
install_fivechat() {
    print_color $CYAN "=== FiveChat Docker 安装 ==="
    
    # 检查 Docker
    if ! check_docker; then
        return 1
    fi
    
    # 检查 .env 文件
    if ! check_env_file; then
        print_color $YELLOW ".env 文件不存在，正在创建..."
        if ! create_env_file; then
            return 1
        fi
        edit_env_file
    else
        print_color $GREEN ".env 文件已存在"
        read -p "是否要编辑 .env 文件? (y/N): " edit_choice
        if [[ $edit_choice =~ ^[Yy]$ ]]; then
            edit_env_file
        fi
    fi
    
    print_color $GREEN "开始安装 FiveChat..."
    
    # 停止现有服务
    print_color $YELLOW "停止现有服务..."
    docker-compose down 2>/dev/null
    
    # 拉取最新镜像
    print_color $YELLOW "拉取最新镜像..."
    docker-compose pull
    
    # 启动服务
    print_color $YELLOW "启动服务..."
    docker-compose up -d
    
    # 等待服务启动
    print_color $YELLOW "等待服务启动..."
    sleep 10
    
    # 检查服务状态
    print_color $CYAN "服务状态:"
    docker-compose ps
    
    print_color $GREEN "\n=== 安装完成 ==="
    print_color $CYAN "访问地址: http://localhost:3000"
    print_color $CYAN "管理员设置: http://localhost:3000/setup"
    print_color $YELLOW "管理员授权码请查看 .env 文件中的 ADMIN_CODE"
}

# 卸载 FiveChat
uninstall_fivechat() {
    print_color $RED "=== FiveChat Docker 卸载 ==="
    
    read -p "确定要完全卸载 FiveChat 吗? 这将删除所有数据 (y/N): " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        print_color $YELLOW "取消卸载"
        return 0
    fi
    
    print_color $RED "正在卸载 FiveChat..."
    
    # 停止并删除容器和数据卷
    print_color $YELLOW "停止并删除容器和数据卷..."
    docker-compose down -v
    
    # 删除镜像
    print_color $YELLOW "删除相关镜像..."
    docker rmi ghcr.io/itsfimall/fivechat:latest 2>/dev/null || true
    docker rmi postgres:16.8-alpine 2>/dev/null || true
    
    # 清理未使用的资源
    print_color $YELLOW "清理未使用的 Docker 资源..."
    docker system prune -f
    
    # 询问是否删除 .env 文件
    read -p "是否删除 .env 配置文件? (y/N): " delete_env
    if [[ $delete_env =~ ^[Yy]$ ]]; then
        rm -f .env
        print_color $YELLOW "已删除 .env 文件"
    fi
    
    print_color $GREEN "\n=== 卸载完成 ==="
    print_color $GREEN "FiveChat 已完全卸载"
}

# 重启服务
restart_fivechat() {
    print_color $CYAN "=== 重启 FiveChat ==="
    
    if ! check_docker; then
        return 1
    fi
    
    docker-compose restart
    print_color $GREEN "服务已重启"
    
    sleep 5
    show_status
}

# 显示状态
show_status() {
    print_color $CYAN "=== FiveChat 状态 ==="
    
    if ! check_docker; then
        return 1
    fi
    
    docker-compose ps
    
    print_color $GREEN "\n访问地址: http://localhost:3000"
}

# 显示日志
show_logs() {
    print_color $CYAN "=== FiveChat 日志 ==="
    print_color $YELLOW "按 Ctrl+C 退出日志查看"
    
    if ! check_docker; then
        return 1
    fi
    
    docker-compose logs -f
}

# 显示帮助
show_help() {
    print_color $CYAN "=== FiveChat Docker 管理脚本 ==="
    echo
    print_color $NC "用法: ./manage-fivechat.sh [命令]"
    echo
    print_color $YELLOW "可用命令:"
    print_color $NC "  install   - 安装 FiveChat (检查/创建 .env 文件)"
    print_color $NC "  uninstall - 完全卸载 FiveChat (删除所有数据)"
    print_color $NC "  restart   - 重启 FiveChat 服务"
    print_color $NC "  status    - 显示服务状态"
    print_color $NC "  logs      - 显示服务日志"
    print_color $NC "  help      - 显示此帮助信息"
    echo
    print_color $YELLOW "示例:"
    print_color $GREEN "  ./manage-fivechat.sh install"
    print_color $GREEN "  ./manage-fivechat.sh status"
    print_color $GREEN "  ./manage-fivechat.sh uninstall"
}

# 主逻辑
case "${1:-help}" in
    "install")
        install_fivechat
        ;;
    "uninstall")
        uninstall_fivechat
        ;;
    "restart")
        restart_fivechat
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs
        ;;
    "help"|*)
        show_help
        ;;
esac
