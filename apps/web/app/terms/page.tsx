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
  title: "服务条款",
  description: "任务进度管理器服务条款",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto flex items-center gap-4 px-4 py-4">
          <BackLink />
          <h1 className="text-lg font-semibold text-foreground">服务条款</h1>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-12 text-foreground leading-relaxed">
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">1. 服务说明</h2>
          <p className="text-sm text-muted mb-2">
            任务进度管理器（以下简称&ldquo;本服务&rdquo;）是一个在线任务管理和进度追踪工具，
            提供任务创建、进度记录、甘特排期、AI智能助手等功能。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">2. 账户注册与安全</h2>
          <p className="text-sm text-muted mb-2">
            您承诺提供真实、准确、完整的注册信息。您对账户下发生的所有活动负责，
            请妥善保管账户密码。如发现未经授权的使用，请立即通知我们。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">3. 用户责任</h2>
          <p className="text-sm text-muted mb-2">
            您不得利用本服务从事任何违反法律法规的活动，不得上传或传播恶意代码、
            病毒或其他有害内容。您对使用本服务创建、存储和分享的所有内容负责。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">4. 知识产权</h2>
          <p className="text-sm text-muted mb-2">
            您保留对您创建内容的所有权利。本服务的代码、设计、品牌元素及相关技术
            受版权法和其他知识产权法律保护。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">5. 付费服务</h2>
          <p className="text-sm text-muted mb-2">
            部分高级功能需要付费订阅。订阅费用按照购买时公布的套餐价格收取。
            您可随时取消自动续费，取消后当前计费周期结束前仍可使用已付费功能。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">6. 退款政策</h2>
          <p className="text-sm text-muted mb-2">
            除非法律另有规定，已支付的订阅费用不予退还。我们建议您在订阅前
            充分试用免费功能以确定是否符合您的需求。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">7. 服务可用性</h2>
          <p className="text-sm text-muted mb-2">
            我们尽力维持服务的稳定可用，但不保证服务不中断或不出错。
            我们保留因维护、升级或其他原因暂停服务的权利，并将尽量提前通知。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">8. 免责声明</h2>
          <p className="text-sm text-muted mb-2">
            本服务按&ldquo;现状&rdquo;提供。在法律允许的范围内，我们不提供任何
            明示或暗示的保证，包括但不限于适销性、特定用途适用性及不侵权的保证。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">9. 责任限制</h2>
          <p className="text-sm text-muted mb-2">
            在任何情况下，我们对因使用或无法使用本服务而产生的任何间接、
            附带、特殊或后果性损害不承担责任。我们的总责任不超过您在事件发生前
            12个月内向本服务支付的费用总额。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">10. 条款修改</h2>
          <p className="text-sm text-muted mb-2">
            我们保留随时修改本条款的权利。重大变更将通过服务内公告或邮件通知。
            继续使用本服务即表示您接受修改后的条款。
          </p>
        </section>

        <p className="text-xs text-muted mt-12">
          最后更新日期：2026年5月 &mdash;&mdash; 如有疑问，请联系客服。
        </p>
      </main>
    </div>
  );
}
