# Protocol Database · 协议数据库

独立 TypeScript 全栈项目，提供卫戍协议规程阵容编辑器和阵容广场。

公开仓库：https://github.com/Neptune-520/ak-ProtocolDatabase 。旧项目及封存快照不包含在本仓库中。

服务器完整步骤见 [部署指南](DEPLOYMENT.md)（Node.js 22 + SQLite + systemd + Nginx HTTPS）。部署分支：`main`。

## 运行

要求 Node.js **22.18+**（使用内置 `node:sqlite`，当前 Node 会输出 ExperimentalWarning）。

```powershell
npm ci
npm run dev
```

- 前端：http://127.0.0.1:5174/ ，广场 `/#plaza`
- API：http://127.0.0.1:3001/api/health
- 开发时 Vite 代理 `/api` 至后端。同源 Cookie 用于匿名发布者身份，不向客户端暴露数据库所有权哈希。
- SQLite：`data/squads.sqlite`，目录自动创建，已经忽略提交。请备份该文件（关闭服务后复制，或使用 SQLite 备份工具）。

```powershell
npm test
npm run build
$env:NODE_ENV='production'
npm start
```

生产环境由后端直接提供 `dist/` 和 API，默认监听 127.0.0.1:3001。生产 Cookie 带 Secure，必须使用 HTTPS 反向代理；不要直接用 HTTP 作为正式站点。`PORT`、`HOST`、`DB_PATH` 可通过环境变量配置。开发版勿直接暴露到公网。

## 功能与规则

- 新界面只包含阵容编辑器、阵容广场；白底、浅绿、圆角、轻量卡片，参考 [卡丘 Hub](https://kqhub.win/) 的清新布局方向，未复制其品牌、图片或源码。
- TypeScript 迁移并复用旧版规则：棋盘 8 人、人事部文档 9 人、整备区 10 人、重复棋子实例、羁绊按身份去重、整备区奇迹/投资人/远见计数、独行/绝技/调和。
- 9×4 地图、常规卡片、从池拖入、地图交换、跨区移动、拖回池删除、形态切换。
- 版本 4 阵容文件可与旧编辑器导入导出互通。本版不导入旧版本 2/3 文件；请先用保留的旧编辑器重新导出为版本 4。
- 规程草稿自动保存在本机，不会未经点击发布到服务器。旧站本地草稿不会自动搬入新端口，需从旧站导出再导入。
- 真实广场由 SQLite 提供公共读取、发布、详情、删除自己的发布、搜索、载入前覆盖确认。访问同一后端的浏览器可看同一广场。
- 匿名管理身份保存在 HttpOnly Cookie。清 Cookie 或换浏览器后不能删除原发布，没有账号找回或管理员界面；“后台”当前指后端 API 服务，而非运营管理控制台。

## 数据来源

- 游戏数据：`https://torappu.prts.wiki/gamedata/latest/excel/`。
- 干员头像：`https://torappu.prts.wiki/assets/char_avatar/`。
- 职业/盟约图标：`https://media.prts.wiki/`，沿用旧站 MD5 资源路径算法。
- 新版仅支持规程，直接读取最新游戏数据；旧活动期留在封存旧版，新版不再提供切换或解析。
- 游戏素材版权归鹰角及相关权利人，PRTS 提供资料及托管资源，不将素材当作本项目原创内容。

## 后端边界

- 见 [后端说明](server/README.md)。服务器严格检查 JSON 形状、版本、人数、区域、uid/格子唯一性，并使用 PRTS 验证干员 ID 存在。
- 后端尚不验证每个活动期的干员可用性或策略/装备战斗合法性；载入编辑器时会检查当前期的干员/形态是否存在。
- 基础保护：请求体大小限制、同源检查、写入限流、参数化 SQLite、HttpOnly/SameSite Cookie、仅所有者删除。
- 公网正式部署前仍需账号/恢复方案、审核与举报、运营后台、备份、HTTPS、反向代理限流和监控。当前没有点赞/评论等未实现功能。

## 目录

- `src/`：Vue 3 TypeScript 前端及全新 CSS，无 Vuetify。
- `shared/`：类型、迁移的纯规则与导入校验及测试。
- `server/`：Express TypeScript API、SQLite 数据层、验证与测试。
- [变更记录](CHANGELOG.md)：本轮所有文件和验证。
