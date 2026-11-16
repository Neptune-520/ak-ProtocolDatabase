# 服务器部署（Ubuntu / Debian）

部署分支：`main`，仓库 https://github.com/Neptune-520/ak-ProtocolDatabase 。以下命令以有 sudo 权限的管理员执行。将 `protocol.example.com` 换成你的域名，并先把 DNS A/AAAA 指向服务器。

## 1. 环境

- Node.js **22.18+ 的 22 LTS**（使用官方发布渠道安装）；运行 `node -v` / `npm -v` 确认。当前内置 node:sqlite 为 experimental，告警不影响启动。
- 至少约 1 GB 内存及足够磁盘；构建内存不足时在本地/CI 构建上传，或增加内存，不要盲目反复构建。
- 安装 Git、Nginx 和 HTTPS 工具：

```bash
sudo apt update
sudo apt install -y git nginx certbot python3-certbot-nginx
command -v node
```

本文 systemd 假设 node 在 `/usr/bin/node`。如果 `command -v node` 不同，请把服务文件的 ExecStart 改为实际绝对路径；不要依赖交互 shell 的 nvm 环境。

## 2. 获取代码与构建

```bash
sudo useradd --system --home /opt/protocol-database --shell /usr/sbin/nologin protocol
sudo git clone --branch main --single-branch https://github.com/Neptune-520/ak-ProtocolDatabase.git /opt/protocol-database
sudo chown -R protocol:protocol /opt/protocol-database
cd /opt/protocol-database
sudo -u protocol npm ci
sudo -u protocol npm test
sudo -u protocol npm run build
```

数据库单独放在 `/var/lib/protocol-database/`，不要和拉代码/构建时可清理的目录混在一起。

## 3. systemd 后台运行

创建 `/etc/systemd/system/protocol-database.service`：

```ini
[Unit]
Description=Protocol Database web and API
After=network.target

[Service]
Type=simple
User=protocol
Group=protocol
WorkingDirectory=/opt/protocol-database
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
Environment=PORT=3001
Environment=DB_PATH=/var/lib/protocol-database/squads.sqlite
StateDirectory=protocol-database
ExecStart=/usr/bin/node --import tsx server/index.ts
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/protocol-database

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now protocol-database
sudo systemctl status protocol-database --no-pager
curl http://127.0.0.1:3001/api/health
```

应返回 `{"ok":true}`。日志：`sudo journalctl -u protocol-database -n 100 --no-pager`。

## 4. Nginx 与 HTTPS

创建 `/etc/nginx/sites-available/protocol-database`：

```nginx
server {
    listen 80;
    server_name protocol.example.com;
    client_max_body_size 64k;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/protocol-database /etc/nginx/sites-enabled/protocol-database
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d protocol.example.com
sudo certbot renew --dry-run
```

- 云安全组和防火墙放行 80/443；不要开放 3001/5174。调整防火墙时先确保 SSH 端口仍放行，避免锁出服务器。
- **生产必须 HTTPS**：匿名所有权 Cookie 使用 Secure，纯 HTTP 无法正确管理发布。
- 部署到域名根路径 `/`，当前不支持直接放在 `/app/spdatabase/` 这类子目录。
- 当前 API 不信任代理传入 IP，Nginx 后所有用户会共享服务器的 IP 限流桶（120 请求/分钟、15 写入/分钟）。小规模试用可先部署；正式放量前应配置受信任的单层代理、按真实 IP 限流，不能直接无条件信任外部 X-Forwarded-For。

## 5. 发布验收

1. 打开 `https://protocol.example.com`，检查规程数据和头像能否加载（服务器及浏览器都需要连通 PRTS）。
2. 放入干员、导出、清空后导入，确认棋盘/整备/羁绊。
3. 发布一条测试阵容，用另一个浏览器查看广场。
4. 回到原浏览器删除测试发布，确认别人不能删除。
5. 重启服务后确认广场数据仍在。

API 后端仅检查已知干员 ID 和阵容结构，不是战斗规则权威校验；当前没有账号、管理员后台、审核举报和身份找回。公网使用前请评估滥用、内容合规和隐私需求。匿名 Cookie 丢失会失去该浏览器发布记录的管理权。

## 6. 更新代码

```bash
cd /opt/protocol-database
sudo -u protocol git pull --ff-only origin main
sudo -u protocol npm ci
sudo -u protocol npm test
sudo -u protocol npm run build
sudo systemctl restart protocol-database
curl http://127.0.0.1:3001/api/health
```

更新前先备份数据库；不要使用 `git clean -fdx` 或删除 `/var/lib/protocol-database`。不要对运行中的 SQLite 只复制主文件而遗漏 WAL。

## 7. 数据库备份

简单且可靠的短暂停机备份：

```bash
sudo mkdir -p /var/backups/protocol-database
sudo chmod 700 /var/backups/protocol-database
sudo systemctl stop protocol-database
sudo cp -a /var/lib/protocol-database /var/backups/protocol-database/$(date +%Y%m%d-%H%M%S)
sudo systemctl start protocol-database
```

备份目录可能含匿名所有权哈希，应限制访问并加密异地备份。恢复应先停服务，保留现有目录，恢复整个备份后修正 `protocol:protocol` 所有权再启动。需要无停机备份时使用 SQLite backup API/工具，不直接复制活动中的数据库文件。
