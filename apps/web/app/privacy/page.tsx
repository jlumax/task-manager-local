import Link from "next/link";
import type { Metadata } from "next";

function BackLink() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      返回首页
    </Link>
  );
}

export const metadata: Metadata = {
  title: "隐私政策",
  description: "任务进度管理器隐私政策",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto flex items-center gap-4 px-4 py-4">
          <BackLink />
          <h1 className="text-lg font-semibold text-foreground">隐私政策</h1>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-12 text-foreground leading-relaxed">
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">1. 信息收集</h2>
          <p className="text-sm text-muted mb-2">
            我们收集以下类型的信息：
          </p>
          <ul className="list-disc list-inside text-sm text-muted space-y-1 mb-2">
            <li>账户信息：邮箱地址、用户名、密码（加密存储）</li>
            <li>任务数据：您创建的任务标题、内容、进度记录、截止日期等</li>
            <li>使用数据：访问日志、功能使用频率、设备信息（浏览器类型、操作系统）</li>
            <li>支付信息：通过 Stripe/微信支付处理，我们不直接存储您的信用卡号</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">2. 信息使用</h2>
          <p className="text-sm text-muted mb-2">
            我们使用收集的信息用于：
          </p>
          <ul className="list-disc list-inside text-sm text-muted space-y-1 mb-2">
            <li>提供、维护和改进本服务</li>
            <li>处理您的订阅和支付</li>
            <li>向您发送与服务相关的重要通知</li>
            <li>分析和优化用户体验</li>
            <li>防止欺诈和滥用</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">3. 信息存储与安全</h2>
          <p className="text-sm text-muted mb-2">
            您的数据存储在腾讯云 CloudBase 平台上，采用加密传输（TLS）和加密存储。
            我们采取合理的技术和管理措施保护您的数据安全，但请注意没有任何
            互联网传输或电子存储方式是100%安全的。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">4. 信息共享</h2>
          <p className="text-sm text-muted mb-2">
            我们不会出售您的个人信息。仅在以下情况共享信息：
          </p>
          <ul className="list-disc list-inside text-sm text-muted space-y-1 mb-2">
            <li>获得您的明确同意</li>
            <li>法律、法规或政府机关的强制要求</li>
            <li>与支付处理服务商（如 Stripe）共享必要的交易数据</li>
            <li>与云基础设施服务商（腾讯云）共享存储和处理所需的数据</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">5. Cookie 与类似技术</h2>
          <p className="text-sm text-muted mb-2">
            我们使用必要的 Cookie 来维持您的登录会话和提供基本服务功能。
            我们也可能使用分析 Cookie 来了解服务使用情况。您可以通过浏览器
            设置管理 Cookie 偏好。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">6. 第三方服务</h2>
          <p className="text-sm text-muted mb-2">
            本服务可能包含指向第三方服务的链接或集成（如 AI 服务提供商、
            支付网关等）。我们对第三方服务的隐私实践不承担责任，
            建议您查阅相关第三方的隐私政策。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">7. 用户权利</h2>
          <p className="text-sm text-muted mb-2">
            您有权访问、更正、导出或删除您的个人数据。如需行使这些权利或
            删除账户，请通过客服渠道联系我们。我们将在合理时间内响应您的请求。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">8. 儿童隐私</h2>
          <p className="text-sm text-muted mb-2">
            本服务不面向13岁以下的儿童。我们不会故意收集儿童的个人信息。
            如果我们发现收集了儿童的个人信息，将立即删除。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">9. 跨境数据传输</h2>
          <p className="text-sm text-muted mb-2">
            您的数据存储在中国境内的服务器上。如果未来业务需要将数据传输到
            境外，我们将遵守相关法律法规并通知您。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">10. 政策更新</h2>
          <p className="text-sm text-muted mb-2">
            我们可能会不定期更新本隐私政策。重大变更将通过服务内公告或邮件通知。
            继续使用本服务即表示您接受更新后的隐私政策。
          </p>
        </section>

        <p className="text-xs text-muted mt-12">
          最后更新日期：2026年5月 &mdash;&mdash; 如有疑问，请联系客服。
        </p>
      </main>
    </div>
  );
}
