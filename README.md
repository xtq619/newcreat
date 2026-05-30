# NewCreat 项目总览

本目录包含三个子项目，共同构成完整的 API Gateway 平台。

## 项目关系

```
D:\newcreat\                     ← GitHub: xtq619/newcreat
├── api-gateway/                 # 后端 + Web 前端
│   ├── backend/                 # FastAPI 后端服务
│   ├── frontend/                # React Web 前端
│   ├── nginx/                   # Nginx 反向代理配置
│   └── docker-compose.yml       # Docker 编排
│
├── miniprogram/                 # 微信小程序（首页/世界杯/建议留言）
│
├── image/                       # 项目图片资源
│
└── README.md                    # 本文件
```

## 三者关系

```
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │   Redis         │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
    ┌─────────▼──────┐ ┌────▼────────┐ ┌───▼──────────┐
    │   backend/     │ │ frontend/   │ │ miniprogram/ │
    │   (FastAPI)    │ │ (React)     │ │ (微信小程序)   │
    │                │ │             │ │              │
    │  REST API      │ │  Web 管理端  │ │  移动端入口   │
    │  WebSocket     │ │  用户面板    │ │  军事资讯     │
    │  RSS 抓取      │ │  管理后台    │ │  建议留言     │
    │  定时任务      │ │  解密工具    │ │  建议留言     │
    └───────┬────────┘ └──────┬──────┘ └──────┬───────┘
            │                 │               │
            │    HTTP/WS      │   HTTP/WS     │
            └─────────────────┴───────────────┘
                    api.xtq619.xyz
                   (Nginx 反向代理)
```

- **backend** 是核心，提供所有 API，被 frontend 和 miniprogram 共同调用
- **frontend** 和 **miniprogram** 是同一套后端 API 的两个客户端，互不依赖
- **miniprogram** 独立于 api-gateway 仓库，通过微信开发者工具本地部署，不走 Git
- 三者共享同一个数据库，数据完全互通

## 核心功能

### 1. API 代理网关
- 多模型支持（DeepSeek、MiniMax、小米 MiMo、OpenAI 等）
- API Key 管理、计费、用量统计
- 管理后台：用户管理、模型管理、充值

### 2. 军事资讯（AI News）
- 自动抓取 13 个 RSS 源（4 个本地 + 9 个硅谷代理）
- AI 自动翻译（英文→中文）+ 摘要生成
- 敏感来源（自由時報）标记为 `is_sensitive`，不对外推送
- 管理员可手动发送文章到用户邮箱
- **AES 加密邮件**：用密码加密文章，以普通邮件形式发送 `.txt` 附件，邮件标题/正文不暴露任何文章信息

### 4. 世界杯（2026 美加墨）

**后端数据托管**（2026-05-20）
- 比赛和球队数据从硬编码 JS 迁移到 PostgreSQL（`worldcup_matches` + `worldcup_teams` 表）
- 公开 API：`GET /api/v1/public/worldcup/matches`、`/teams`（无需登录）
- 管理 API：`PATCH /worldcup/admin/matches/{id}` 更新比分/状态，`/teams/{code}` 更新大名单
- 种子脚本：`scripts/seed_worldcup.py` 从 JS 文件初始化数据库
- 前端优先拉 API 数据，网络失败时自动降级到本地数据

**自动更新**（2026-05-20 / 05-24）
- APScheduler 每 30 分钟自动更新比赛状态：upcoming → live → finished
- APScheduler 每 12 小时自动抓取大名单（SI.com → `lxml` 解析 → 有变化才更新 DB）
- 球员位置自动英译中（Goalkeeper→门将 等），队名通过 alias map 模糊匹配
- 号码保护：如数据源无号码，自动从 DB 保留已有号码
- 配置：`.env` 中设置 `WORLDCUP_SQUADS_PAGE_URL`（默认 SI.com）
- 预留外部比分 API 接口（`.env` 中配置 `WORLDCUP_SCORES_API_URL` 即可启用自动抓分）
- 服务文件：`app/services/match_updater.py`（含 match_updates + squad_updates）

**功能**
- 赛程展示（12 组 48 队 + 淘汰赛，北京时间），按日期选择器快速切换
- 竞猜预测（全部 72 场小组赛，提交比分，记录准确率）
- 智能分析（AI 多维度赛前分析：战术、关键球员、比分预测）
- 球队详情弹出层（FIFA 排名、历史最佳、主教练、26 人大名单）
- 淘汰赛对阵图（32 强 → 决赛，6 轮可视化）

### 5. 其他
- 建议留言（用户反馈 + 管理员回复）
- 每日摘要邮件推送
- 微信小程序 + Web 双端

## 服务器架构

### 资源清单

| 资源 | 位置 | 公网 IP | 用途 | SSH 别名 |
|------|------|---------|------|----------|
| 阿里云 ECS | 上海 | `101.133.230.197` | 主服务器：API Gateway + 数据库 | `ssh api-gw` |
| 腾讯云轻量 | 硅谷 | `43.130.56.247` | 海外中转：新闻抓取代理 | `ssh tencent` |

### 域名与路由

| 域名 | 解析方式 | 指向 | 用途 |
|------|----------|------|------|
| `xtq619.xyz` | Cloudflare Proxied → 阿里云 | 阿里云 Nginx | Web 前端 + 离线解密工具 |
| `api.xtq619.xyz` | Cloudflare Proxied → 阿里云 | 阿里云 Nginx → backend:8000 | 统一 API 入口 |
| `ai.xtq619.xyz` | DNS Only → 腾讯云公网 IP | 腾讯云 Nginx :443 | 海外新闻抓取代理 |

### 阿里云上海服务器（api-gw）

Docker Compose 部署：

| 容器 | 用途 |
|------|------|
| backend | FastAPI 后端（:8000） |
| frontend | React Web 前端（nginx :80） |
| nginx | 反向代理（:80/:443） |
| postgres | PostgreSQL 15 |
| redis | Redis 7 |
| certbot | SSL 证书自动续期 |

### 腾讯云硅谷服务器（tencent）

裸机运行 Python 服务 + Nginx：

| 服务 | 端口 | 文件 | 用途 |
|------|------|------|------|
| Nginx | 443 | `/etc/nginx/conf.d/` | HTTPS 反代 |
| 新闻抓取 | 5001 | `/root/news_fetcher.py` | 批量抓取境外 RSS 源 + 全文提取 |

硅谷服务器 Nginx 路由（`ai.xtq619.xyz`）：

| 路径 | 转发 | 功能 |
|------|------|------|
| `/fetch_batch` | 127.0.0.1:5001 | 批量新闻抓取（POST） |
| `/fetch_article` | 127.0.0.1:5001 | 单篇文章抓取 |

## 数据流

```
微信小程序 / Web 前端
        ↓
  api.xtq619.xyz（Cloudflare → 阿里云）
        ↓
  FastAPI 后端（代理 LLM、计费、军事资讯等）
        ↓ 需要海外 RSS 抓取时
  ai.xtq619.xyz（直连腾讯云硅谷）
        ↓
  RSS 源抓取 + 全文提取
```

### 加密邮件流程

```
管理员在后台选择文章 → 输入密码 → AES-256-GCM 加密
        ↓
邮件发送（标题: "AI 日报 — 日期"，附件: 原文.txt）
        ↓
收件人打开 https://xtq619.xyz/decrypt.html（或本地 HTML）
        ↓
粘贴密文 + 输入密码 → 浏览器本地解密（不经过服务器）
```

## Git 工作流

本项目 GitHub 仓库：`xtq619/newcreat`

由于本地电脑无法直连 GitHub，更新代码需要通过上海服务器中转。

服务器目录结构：`/opt/api-gateway` 是 `/opt/newcreat/api-gateway` 的软链接，**只维护 newcreat 一个仓库即可**，Docker 从软链接路径启动，数据不受影响。

### 日常更新流程

```bash
# 1. 本地改完代码后，打包传到服务器
#    在 D:\newcreat\ 目录下执行（Windows PowerShell）:
tar czf /tmp/newcreat.tar.gz --exclude='api-gateway/frontend/node_modules' --exclude='api-gateway/frontend/dist' --exclude='.git' miniprogram api-gateway image README.md .gitignore
scp /tmp/newcreat.tar.gz api-gw:/opt/newcreat/

# 2. SSH 到服务器，解压并推送
ssh api-gw
cd /opt/newcreat
rm -f newcreat.tar.gz
tar xzf /opt/newcreat/newcreat.tar.gz
rm -f newcreat.tar.gz
git add -A
git commit -m "描述改动"
git push

# 3. 重新部署后端（如有变更）
cd /opt/api-gateway  # 实际是 /opt/newcreat/api-gateway 的软链接
docker compose -f docker-compose.prod.yml up -d --build
```

> **注意**：服务器 git remote 使用 `ghfast.top` 代理推送（国内直连 GitHub 不通）：
> `https://ghfast.top/https://github.com/xtq619/newcreat.git`

## 部署

### 阿里云（主服务器）

```bash
ssh api-gw
cd /opt/newcreat
git pull origin main
cd api-gateway
docker compose -f docker-compose.prod.yml up -d --build
```

### 腾讯云（海外中转）

```bash
ssh tencent
pkill -f news_fetcher.py && nohup python3 /root/news_fetcher.py > /root/news_fetcher.log 2>&1 &
systemctl reload nginx
```

### 微信小程序

通过微信开发者工具上传代码并提交审核，不走 Git。

## 关键文件速查

| 文件 | 用途 |
|------|------|
| `api-gateway/backend/app/main.py` | 后端入口，路由注册，定时任务 |
| `api-gateway/backend/app/core/config.py` | 配置（环境变量） |
| `api-gateway/backend/app/core/security.py` | JWT + API Key 加解密 |
| `api-gateway/backend/app/services/news_fetcher.py` | RSS 抓取 + AI 翻译摘要 |
| `api-gateway/backend/app/services/crypto.py` | AES 加密工具 |
| `api-gateway/backend/app/services/notifier.py` | 邮件发送（普通 + 加密） |
| `api-gateway/backend/app/api/v1/news_admin.py` | 资讯管理 API（CRUD + 发送 + 加密） |
| `api-gateway/backend/app/models/worldcup.py` | 世界杯数据模型（Match/Team/Guess/EmotionVote） |
| `api-gateway/backend/app/services/worldcup_service.py` | 世界杯业务逻辑（竞猜/分析/比赛CRUD/种子） |
| `api-gateway/backend/app/services/match_updater.py` | 世界杯比赛状态自动更新 + 大名单爬取（每 30min / 12h） |
| `api-gateway/backend/app/api/v1/worldcup.py` | 世界杯管理 API（竞猜/情绪/分析/比分更新） |
| `api-gateway/backend/app/api/public/worldcup.py` | 世界杯公开 API（比赛/球队，无需登录） |
| `api-gateway/backend/scripts/seed_worldcup.py` | 世界杯种子脚本（从 JS 初始化 DB） |
| `api-gateway/frontend/public/decrypt.html` | 离线解密工具（独立 HTML） |
| `api-gateway/frontend/src/pages/Admin.tsx` | 管理后台页面 |
| `miniprogram/pages/hub/hub.js` | 小程序首页入口 |
| `miniprogram/pages/worldcup/worldcup.js` | 世界杯页面（赛程/竞猜/分析/球队） |
| `miniprogram/pages/worldcup/matches.js` | 世界杯赛程数据（local fallback） |
| `miniprogram/pages/worldcup/teams.js` | 世界杯球队数据（local fallback） |
| `miniprogram/pages/feedback/feedback.js` | 建议留言页面 |
| `miniprogram/utils/api.js` | 小程序 API 封装 |

## 给 AI 的提示

### 项目架构

- 修改后端 API 时，**frontend 和 miniprogram 可能都需要同步更新**
- miniprogram 的代码在 `D:\newcreat\miniprogram`，不在 api-gateway 仓库内
- 小程序的 API 基础地址硬编码在 `miniprogram/app.js` 中
- 后端微信相关配置在 `backend/.env`（WX_APPID、WX_SECRET）
- 数据库迁移自动执行（entrypoint.sh 中 `alembic upgrade head`）
- 自由時報文章自动标记 `is_sensitive=true, is_published=false`，不在网页和小程序推送
- 世界杯比赛/球队数据已托管到后端 DB，前端优先 API 拉取，网络失败时降级到本地 JS
- 世界杯种子数据通过 `python scripts/seed_worldcup.py` 初始化，部署后需运行一次

### 服务器

- 两台服务器都已配置免密 SSH：`ssh api-gw`（阿里云）、`ssh tencent`（腾讯云）
- 阿里云：Docker Compose 部署，`/opt/api-gateway` 是 `/opt/newcreat/api-gateway` 的软链接
- 腾讯云：裸机运行 Python 脚本（`/root/news_fetcher.py`），没有 Docker，提供海外 RSS 代理

### 换域名时必须修改的文件

| 文件 | 内容 |
|------|------|
| `miniprogram/app.js` | `baseUrl` 里的域名 |
| `nginx/nginx.conf` | `server_name` |
| `backend/app/services/news_fetcher.py` | `SILICON_VALLEY_PROXY` |
| `docker-compose.prod.yml` 的 `.env` | `DOMAIN` 变量 |
