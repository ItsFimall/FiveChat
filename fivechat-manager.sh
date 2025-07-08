#!/bin/bash
# FiveChat Docker 管理脚本
# 用法: chmod +x fivechat-manager.sh && ./fivechat-manager.sh
# 功能: 安装、卸载、全新安装(卸载删库+强制拉取重新安装)

# 设置颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 项目名称
PROJECT="FiveChat"

# 显示标题
show_header() {
    clear
    echo -e "${CYAN}=================================================${NC}"
    echo -e "${CYAN}           ${PROJECT} Docker 管理脚本            ${NC}"
    echo -e "${CYAN}=================================================${NC}"
    echo
}

# 显示菜单
show_menu() {
    echo -e "${YELLOW}请选择操作:${NC}"
    echo -e "${GREEN}1. 安装${NC} - 首次部署或启动已有容器"
    echo -e "${RED}2. 卸载${NC} - 移除所有容器、镜像和卷"
    echo -e "${BLUE}3. 全新安装${NC} - 卸载后强制拉取最新镜像并重新安装"
    echo -e "${CYAN}4. 初始化数据库${NC} - 运行数据库初始化和种子脚本"
    echo -e "${YELLOW}0. 退出${NC}"
    echo
    echo -n -e "${YELLOW}请输入选项 [0-4]: ${NC}"
}

# 安装函数
install() {
    echo -e "${GREEN}开始安装 ${PROJECT}...${NC}"
    
    # 检查 docker-compose.yml 是否存在
    if [ ! -f "docker-compose.yml" ]; then
        echo -e "${RED}错误: docker-compose.yml 文件不存在!${NC}"
        echo -e "${YELLOW}请确保您在项目根目录下运行此脚本.${NC}"
        return 1
    fi
    
    # 检查 .env 文件是否存在
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}未找到 .env 文件，正在检查示例文件...${NC}"
        
        # 检查 .env.example 是否存在
        if [ -f ".env.example" ]; then
            echo -e "${GREEN}找到 .env.example 文件，正在创建 .env...${NC}"
            cp .env.example .env
            echo -e "${GREEN}.env 文件已创建。即将打开编辑器进行配置...${NC}"
            
            # 尝试使用 nano 编辑器，如果不可用则提示手动编辑
            if command -v nano &> /dev/null; then
                echo -e "${YELLOW}请编辑环境配置文件后保存退出 (Ctrl+O 保存, Ctrl+X 退出)${NC}"
                sleep 2
                nano .env
            else
                echo -e "${RED}未找到 nano 编辑器，请手动编辑 .env 文件后继续。${NC}"
                echo -e "${YELLOW}按任意键继续安装，或按 Ctrl+C 退出以手动编辑。${NC}"
                read -n 1 -s
            fi
            
            echo -e "${GREEN}.env 文件配置完成。${NC}"
        else
            echo -e "${RED}错误: 未找到 .env.example 文件!${NC}"
            echo -e "${YELLOW}请手动创建 .env 文件并配置必要的环境变量。${NC}"
            return 1
        fi
    else
        echo -e "${GREEN}已找到 .env 文件，将使用现有配置。${NC}"
    fi
    
    # 启动 Docker 容器
    echo -e "${YELLOW}启动 Docker 容器...${NC}"
    docker-compose up -d
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}${PROJECT} 已成功启动!${NC}"
        echo -e "${YELLOW}您可以通过以下地址访问:${NC}"
        echo -e "${CYAN}http://localhost:3000${NC}"
    else
        echo -e "${RED}启动 ${PROJECT} 时出错.${NC}"
        echo -e "${YELLOW}请检查 Docker 和 docker-compose 是否正确安装.${NC}"
    fi
}

# 卸载函数
uninstall() {
    echo -e "${RED}开始卸载 ${PROJECT}...${NC}"
    
    # 1. 停止并删除由 docker-compose 创建的所有容器
    echo -e "${YELLOW}[1/5] 停止并删除 ${PROJECT} 容器...${NC}"
    docker-compose down 2>/dev/null || echo -e "${RED}docker-compose down 失败，可能容器已经停止${NC}"
    
    # 2. 强制删除任何名称包含 fivechat 的容器
    echo -e "${YELLOW}[2/5] 强制删除所有 ${PROJECT} 相关容器...${NC}"
    docker ps -a | grep -i fivechat | awk '{print $1}' | xargs -r docker rm -f
    echo -e "${GREEN}所有 ${PROJECT} 容器已删除${NC}"
    
    # 3. 删除 FiveChat 相关的镜像
    echo -e "${YELLOW}[3/5] 删除 ${PROJECT} 相关镜像...${NC}"
    docker images | grep -i fivechat | awk '{print $3}' | xargs -r docker rmi -f
    echo -e "${GREEN}所有 ${PROJECT} 镜像已删除${NC}"
    
    # 4. 删除 FiveChat 相关的卷
    echo -e "${YELLOW}[4/5] 删除 ${PROJECT} 数据卷...${NC}"
    docker volume ls | grep -i fivechat | awk '{print $2}' | xargs -r docker volume rm
    # 删除 postgres 数据卷（如果存在）
    docker volume ls | grep postgres | awk '{print $2}' | xargs -r docker volume rm
    echo -e "${GREEN}所有 ${PROJECT} 数据卷已删除${NC}"
    
    # 5. 清理不再使用的网络
    echo -e "${YELLOW}[5/5] 清理不再使用的 Docker 网络...${NC}"
    docker network prune -f
    
    echo -e "${GREEN}执行系统清理，移除未使用的资源...${NC}"
    docker system prune -f
    
    echo -e "${GREEN}${PROJECT} Docker 资源已完全清理!${NC}"
}

# 全新安装函数
fresh_install() {
    echo -e "${BLUE}开始 ${PROJECT} 全新安装...${NC}"
    
    # 先卸载
    echo -e "${YELLOW}第一步: 卸载现有环境${NC}"
    uninstall
    
    # 强制拉取最新镜像
    echo -e "${YELLOW}第二步: 强制拉取最新镜像${NC}"
    # 检查 docker-compose.yml 是否存在
    if [ ! -f "docker-compose.yml" ]; then
        echo -e "${RED}错误: docker-compose.yml 文件不存在!${NC}"
        echo -e "${YELLOW}请确保您在项目根目录下运行此脚本.${NC}"
        return 1
    fi
    
    docker-compose pull
    
    # 最后重新安装
    echo -e "${YELLOW}第三步: 重新安装 ${PROJECT}${NC}"
    docker-compose up -d
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}${PROJECT} 已成功全新安装!${NC}"
        echo -e "${YELLOW}您可以通过以下地址访问:${NC}"
        echo -e "${CYAN}http://localhost:3000${NC}"
    else
        echo -e "${RED}安装 ${PROJECT} 时出错.${NC}"
        echo -e "${YELLOW}请检查 Docker 和 docker-compose 是否正确安装.${NC}"
    fi
}

# 初始化数据库函数
init_database() {
    echo -e "${CYAN}开始初始化数据库...${NC}"
    
    # 确认容器是否在运行
    if ! docker-compose ps | grep -q "postgres"; then
        echo -e "${RED}错误: PostgreSQL 容器未运行!${NC}"
        echo -e "${YELLOW}请先运行安装命令启动容器.${NC}"
        return 1
    fi

    echo -e "${YELLOW}运行数据库迁移...${NC}"
    docker-compose exec fivechat npx drizzle-kit push --force
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}数据库架构迁移成功!${NC}"
        
        echo -e "${YELLOW}正在填充初始数据...${NC}"
        docker-compose exec fivechat npm run db:seedProvider && \
        docker-compose exec fivechat npm run db:seedModel && \
        docker-compose exec fivechat npm run db:seedBot && \
        docker-compose exec fivechat npm run db:seedGroup
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}数据库初始化完成!${NC}"
        else
            echo -e "${RED}填充初始数据时出错.${NC}"
            return 1
        fi
    else
        echo -e "${RED}数据库迁移失败.${NC}"
        return 1
    fi
}

# 确认操作
confirm() {
    local action=$1
    echo -e "${YELLOW}您确定要${action} ${PROJECT} 吗? 这可能导致数据丢失! [y/N] ${NC}"
    read -r response
    case "$response" in
        [yY][eE][sS]|[yY]) 
            return 0
            ;;
        *)
            echo -e "${BLUE}操作已取消.${NC}"
            return 1
            ;;
    esac
}

# 主函数
main() {
    local choice

    while true; do
        show_header
        show_menu
        read -r choice
        
        case $choice in
            1)
                install
                ;;
            2)
                if confirm "卸载"; then
                    uninstall
                fi
                ;;
            3)
                if confirm "全新安装"; then
                    fresh_install
                fi
                ;;
            4)
                init_database
                ;;
            0)
                echo -e "${GREEN}感谢使用 ${PROJECT} 管理脚本!${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}无效选项, 请重试.${NC}"
                ;;
        esac
        
        echo
        echo -e "${YELLOW}按任意键继续...${NC}"
        read -n 1 -s
    done
}

# 执行主函数
main 