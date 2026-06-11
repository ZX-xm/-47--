# 47cardgame

2047 同人类尖塔，纯前端卡牌 Roguelike（Vite + TypeScript）。

- GitHub：https://github.com/ZX-xm/-47--
- Gitee：https://gitee.com/denghuo_lanshan/47cardgame
- 在线试玩（国内）：https://denghuo_lanshan.gitee.io/47cardgame/（需先开启 Gitee Pages）

## 本地运行

```bash
npm install
npm run dev
```

本地开发地址带路径前缀：`http://localhost:5173/47cardgame/`

## 构建

```bash
npm run build
npm run preview
```

## 部署到 Gitee Pages（国内访问）

```bash
npm run deploy:gitee
```

首次在 Gitee：**服务 → Gitee Pages** → 分支选 `gitee-pages`、目录选 `/` → 启动。  
之后每次改代码执行 `npm run deploy:gitee`，再在 Pages 页面点 **更新**（免费版需手动更新）。
