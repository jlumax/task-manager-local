import Link from "next/link";

export default function Footer() {
  return (
    <footer className="text-center py-5 text-xs text-muted mt-4 border-t border-border">
      <div className="flex items-center justify-center gap-4 mb-1 flex-wrap">
        <Link
          href="/terms"
          className="hover:text-foreground transition-colors"
        >
          服务条款
        </Link>
        <Link
          href="/privacy"
          className="hover:text-foreground transition-colors"
        >
          隐私政策
        </Link>
        <Link
          href="/pricing"
          className="hover:text-foreground transition-colors"
        >
          定价
        </Link>
        <span>|</span>
        <a
          href="mailto:support@taskdada.com"
          className="hover:text-foreground transition-colors"
        >
          联系我们
        </a>
      </div>
      <p>&copy; 2026 KUN WANG. All Rights Reserved. V1.3</p>
    </footer>
  );
}
