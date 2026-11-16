# 新版开发约定

此目录是独立 TypeScript 新版，替代根目录中保留旧版的 JavaScript/Vuetify 技术栈约定。

- Vue 3 + TypeScript + 自定义清新风格 CSS；后端 Express + TypeScript + Node SQLite。保持严格类型检查，不使用 ts-nocheck。
- 规则来自旧版，变更同时覆盖 shared 测试；公开 API 必须在服务端验证，不依赖浏览器校验。
- 新版每轮变更仅记录本目录 `CHANGELOG.md`，列出所有修改文件。旧版及其修改记录已经封存，不再追加；archives 快照保持不变。
- 验证：`npm test`、`npm run build`；不提交 data、node_modules、dist 或环境秘密。
- 不经明确要求提交/推送；旧版与 archives 目录不做破坏性修改。
- 广场匿名身份 Cookie 是管理凭据，不回传凭据或数据库哈希给浏览器，不允许任意访客删除他人记录。
