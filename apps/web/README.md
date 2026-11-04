This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Local-only edition

Local 版不需要后端、登录或数据库服务器。任务、项目、设置和进展图片都保存在浏览器 IndexedDB，并支持 JSON/ZIP 完整备份与 Markdown 文本导出。

```bash
npm run dev:local
npm run build:local
```

`build:local` 生成可直接放在 GitHub Pages 等静态托管上的 `out/` 目录，并从产物中移除管理后台、定价、设置和账单路由。

如果部署在项目型 GitHub Pages 路径，例如 `https://name.github.io/repository/`，构建时传入仓库名：

```bash
NEXT_PUBLIC_BASE_PATH=/repository npm run build:local
```

仓库内的 `Deploy Local Web to GitHub Pages` Action 只支持手动触发，不会因普通提交自动部署。

### 可选：本地版激活门

默认不启用激活门，因此现有免登录版行为不变。在激活服务完成独立验证后，构建时再配置：

```bash
NEXT_PUBLIC_LICENSE_REQUIRED=true
NEXT_PUBLIC_LICENSE_API_URL=https://<license-worker-domain>
NEXT_PUBLIC_LICENSE_VERIFY_KEY='{"kty":"EC","crv":"P-256","x":"...","y":"..."}'
```

用户首次激活时需要联网。激活后，签名许可证和不可导出的本机私钥保存在单独的 IndexedDB 表中，可离线验证；它们不会进入任务 JSON/ZIP 备份。
