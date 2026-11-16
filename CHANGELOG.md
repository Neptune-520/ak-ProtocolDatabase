# 新版修改记录

## 2026-11-16 · 003 · GitHub 发布与部署说明

- 首次误拟沿用旧 Fork 发布，用户纠正后未执行该计划；旧仓库没有收到提交或推送。
- 用户明确指定创建全新公开仓库 `Neptune-520/ak-ProtocolDatabase`。在本目录初始化独立 Git 历史，以 main 发布，不携带旧仓库提交历史、旧源码或归档。
- 只发布本项目源码、测试、文档及锁文件；不包含 node_modules、dist、SQLite 运行数据库或环境秘密。
- 修正 [README.md](README.md) 与 [DEPLOYMENT.md](DEPLOYMENT.md) 为新仓库 URL、main 分支及独立根目录路径。
- 新增 [DEPLOYMENT.md](DEPLOYMENT.md)：Ubuntu/Debian、Node22、systemd、Nginx HTTPS、更新、验收、数据库备份及匿名身份/代理限流边界。
- 更新 [README.md](README.md) 添加部署说明入口；本 [CHANGELOG.md](CHANGELOG.md) 记录发布过程。
- 移除新项目中已不再引用的三份 public/archive 历史快照（旧项目封存副本保持原样）；[shared/planner.ts](shared/planner.ts) 清理文件末尾额外空行。
- 发布前 `npm run build`、`npm test` 通过，暂存区文件范围与空白检查通过；独立新仓库仅包含 26 个项目文件，不包含旧快照和运行数据。

## 2026-11-16 · 002 · 封存纠正、仅规程与可读性调整

### 修改内容与文件清单
- [AGENTS.md](AGENTS.md)：新版只在本目录记录；旧版和归档封存，不再追加旧日志。
- 根目录旧日志恢复为封存快照，撤回误加的第 012 条，保留至 011；archives 内文件未修改。
- [src/data.ts](src/data.ts)：删除其他活动期配置和解析分支，仅保留规程。历史素材文件不再引用，留存不影响旧版封存。
- [shared/plan.ts](shared/plan.ts)、[server/validation.ts](server/validation.ts)：前后端仅接受规程阵容；广场查询只读取规程。
- [src/App.vue](src/App.vue)：移除英文品牌副标题、英文玩法标记、介绍句、✳、草稿说明、整备羁绊提示、地图说明及顶部 PRTS 小字；同时去掉英文社区/弹窗装饰文案和选子底部提示。活动期由下拉改成规程标签。分享说明长度修正为服务端一致的 500。
- [src/style.css](src/style.css)：整体放大小字，按钮/筛选/名称等提升至 14～16px，辅助信息以 12～13px 为主，调整卡片网格、换行和移动端字号，保留地图紧凑标记。
- [server/index.test.ts](server/index.test.ts)、[server/store.test.ts](server/store.test.ts)：测试样本改为规程；[server/validation.test.ts](server/validation.test.ts) 增加拒绝其他活动期断言。
- [README.md](README.md)：说明仅规程，不再宣称支持旧活动；[CHANGELOG.md](CHANGELOG.md)：本轮独立记录，不写入旧日志。

### 验证
- 首轮构建通过；测试发现原 season1 测试样本被新规则拒绝，已同步为规程。
- 最终重新运行严格类型检查、构建与 8 项测试通过。
- 未进行浏览器截图和视觉验收，未提交或推送。

## 2026-11-16 · 001 · TypeScript 全栈新版

### 本轮新增文件

| 文件 | 内容 |
| --- | --- |
| [package.json](package.json)、[package-lock.json](package-lock.json) | 独立依赖与锁文件，dev/build/start/test 命令 |
| [tsconfig.json](tsconfig.json)、[tsconfig.server.json](tsconfig.server.json)、[vite.config.ts](vite.config.ts) | 前后端严格类型检查、Vite、同源 API 代理 |
| [index.html](index.html)、[.gitignore](.gitignore) | 新版入口、忽略依赖/构建/数据库/秘密 |
| [AGENTS.md](AGENTS.md)、[README.md](README.md)、[CHANGELOG.md](CHANGELOG.md) | 新版规则、运行与部署说明、所有文件变动及验证 |
| [src/main.ts](src/main.ts)、[src/App.vue](src/App.vue) | Vue TS 应用、编辑器/公共广场、拖拽、人口/整备区、导入导出、发布/载入/本人删除 |
| [src/style.css](src/style.css) | 完全重写的白底圆角浅绿响应式样式，无 Vuetify；参考站布局方向，未复制品牌资源 |
| [src/data.ts](src/data.ts) | 旧版活动期配置与解析逻辑 TS 迁移；沿用 PRTS 游戏接口、头像和 MD5 媒体路径 |
| [shared/types.ts](shared/types.ts)、[shared/planner.ts](shared/planner.ts)、[shared/plan.ts](shared/plan.ts)、[shared/planner.test.ts](shared/planner.test.ts) | 核心规则类型、旧版纯逻辑迁移、版本 4 校验与回归测试 |
| [server/index.ts](server/index.ts)、[server/store.ts](server/store.ts)、[server/validation.ts](server/validation.ts) | Express API、SQLite 持久化、匿名身份 Cookie、限流、同源检查、服务端严格校验及干员 ID 存在校验 |
| [server/index.test.ts](server/index.test.ts)、[server/store.test.ts](server/store.test.ts)、[server/validation.test.ts](server/validation.test.ts)、[server/README.md](server/README.md) | API/权限/数据库持久化/校验测试与说明 |
| [public/archive/alliance_1st.json](public/archive/alliance_1st.json)、[alliance_2nd.json](public/archive/alliance_2nd.json)、[alliance_2nd_p2.json](public/archive/alliance_2nd_p2.json) | 从旧版逐字复制的三份历史快照 |

### 规则与边界
- 保留 8/9 人棋盘、10 人整备、同干员多实例但羁绊去重、整备三羁绊、9×4 地图、普通/精锐及特殊羁绊。
- 广场是真实数据库内容，访问相同服务即可公共读取；匿名管理 Cookie 丢失无法恢复所有权，未实现账号/运营管理界面/审核举报。
- 游戏资料继续依赖外部 PRTS；未增加模拟数据冒充真实游戏数据。
- 当前导入版本 4，旧浏览器草稿不自动搬迁（端口和存储键独立），使用原编辑器导出导入。
- 后端校验已知干员 ID，不保证活动期或装备/策略战斗合法性；前端载入再检查当期干员和形态。
- 旧项目保留原位，完整源码和资源快照另存仓库 `archives/legacy-2026-11-16`，有基准提交、工作树补丁及 48 文件 SHA256 清单。未归档 node_modules、dist、Git 凭据或运行数据库。

### 验证
- `npm run build`：Vue/前端严格 TS 检查、后端严格 TS 检查及 Vite 构建通过。初次类型迁移发现 RawBond.name、布尔排序与可选 uid 问题，修复后通过。
- `npm test`：8 项通过，涵盖 API 读写/匿名所有权/跨源拒绝/限流、SQLite 重启后保留、输入拒绝、容量与重复实例及去重规则。
- 实际启动前端 5174、后端 3001；前端、API health、广场列表返回成功。
- 通过新前端代理实际发布临时阵容，另一无 Cookie 请求公开读取成功（owned=false），原发布身份删除成功；测试记录已清理。
- 旧版构建与 15 项测试通过，系统临时目录 esbuild 删除错误以既有项目内 TEMP/TMP 解决。
- 归档清单首轮因扫描了输出自身而提示读取冲突，改为排除清单再生成，48 文件完成。
- Node22 SQLite 提示 experimental，已在运行文档说明。未进行浏览器截图或真实鼠标拖拽视觉验收。
- 未提交或推送。开发服务作为后台任务运行，旧版服务仍保留。
