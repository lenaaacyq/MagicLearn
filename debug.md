# Debug Log

Status: [CLOSED]

Issue: 前端服务异常退出或无法访问

Hypotheses:
1. 开发服务端口被占用或进程崩溃导致无法访问。
2. 前端路由或构建输出异常触发 5xx 或空白页。
3. 依赖或配置变更导致 dev server 启动失败。
4. 资源路径或静态资源引用异常导致加载失败并触发浏览器终止。
5. 运行时异常（JS）触发页面白屏或服务断连。

Notes:
- 当前本机 3000 端口无监听进程（lsof 未返回结果）。
- 本机访问 http://localhost:3000/ 连接被拒绝。
- 用户反馈：同机访问，WiFi 环境变更。
- 重新启动 frontend dev server 后恢复可访问。

Conclusion:
- 根因：前端 dev server 未运行导致端口无监听。
- 处理：重启 frontend dev server（next dev --hostname 0.0.0.0 --port 3000）。
