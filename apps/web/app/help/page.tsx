import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowLeft,
  BarChart3,
  Bot,
  Building2,
  Cloud,
  Download,
  Gem,
  ListTodo,
  NotebookPen,
  NotebookText,
  Palette,
  Smartphone,
  Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
  title: "帮助",
  description: "任务进度管理器使用帮助",
};

function BackLink() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
    >
      <ArrowLeft size={18} />
      返回首页
    </Link>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold text-foreground mt-12 mb-4 pb-2 border-b border-border">{children}</h2>;
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-foreground mt-6 mb-2">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted leading-relaxed mb-3">{children}</p>;
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return <code className="bg-accent px-1.5 py-0.5 rounded text-sm text-foreground">{children}</code>;
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="bg-accent px-1.5 py-0.5 rounded text-xs text-foreground font-medium inline-block mr-1">{children}</kbd>;
}

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto flex items-center gap-4 px-4 py-4">
          <BackLink />
          <h1 className="text-lg font-semibold text-foreground">帮助</h1>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-12 text-foreground leading-relaxed">

        {/* ============ 第一部分：核心功能 ============ */}
        <H2>核心功能</H2>

        <div className="grid gap-4 sm:grid-cols-2 mb-4">
          {[
            { icon: ListTodo, title: "任务视图", desc: "列表展示所有任务，勾选完成、行内编辑、拖拽排序，日常管理的核心界面。" },
            { icon: BarChart3, title: "甘特图", desc: "以时间轴展示任务排期，支持周/月视图切换，项目时间线一目了然。" },
            { icon: NotebookText, title: "笔记视图", desc: "轻量笔记卡片，关联任务视图，适合记录碎片信息和灵感。" },
            { icon: NotebookPen, title: "进展记录", desc: "每个任务可添加多条进展，支持 Markdown 排版和图片粘贴上传。" },
            { icon: Bot, title: "AI 智能助手", desc: "自然语言对话式交互，支持创建任务、生成报告、批量分解、跨工作区移动。" },
            { icon: Building2, title: "工作区 + 项目", desc: "多工作区隔离管理，项目分组筛选，微信任务收集自动归入专属工作区。" },
            { icon: Palette, title: "8 种主题 + 4 种字体", desc: "星空黑、莫兰迪系列、暴走模式、上岸模式，搭配思源/文楷字体和视觉动效。" },
            { icon: Cloud, title: "云端同步", desc: "登录后数据自动同步到云端，多设备实时协作，游客模式本地离线可用。" },
            { icon: Sparkles, title: "情绪激励", desc: "「来一发」烟花庆祝、暴走/上岸主题、自定义庆祝文案，让工作有仪式感。" },
            { icon: Smartphone, title: "微信任务收集", desc: "绑定微信后，向公众号发消息自动在「微信任务收集」工作区创建任务。" },
            { icon: Download, title: "导入 / 导出", desc: "支持 Markdown 格式导入合并或覆盖，导出完整数据用于备份和迁移。" },
            { icon: Gem, title: "订阅套餐", desc: "免费版基础功能，Pro 版解锁 AI 助手、无限任务、更大存储，Team 版团队协作。" },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <f.icon size={20} strokeWidth={1.8} className="text-primary" />
                <strong className="text-sm text-foreground">{f.title}</strong>
              </div>
              <p className="text-xs text-muted leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* ============ 第二部分：详细介绍 ============ */}
        <H2>详细介绍</H2>

        <H3>三种视图</H3>
        <P>
          顶部工具栏左侧的三个按钮分别对应<strong className="text-foreground">任务视图、甘特图、笔记视图</strong>。三种视图共享同一份数据，切换视图时数据保持一致。
        </P>
        <P>
          任务视图是核心操作界面，支持勾选完成任务、行内编辑标题、展开查看进展记录。甘特图以条形图展示任务时间跨度，点击条形可跳转到对应任务。笔记视图以卡片形式呈现，右下角任务图标可跳转任务视图。
        </P>

        <H3>任务管理</H3>
        <ul className="text-sm text-muted space-y-2 mb-3 list-disc list-inside">
          <li><strong className="text-foreground">创建任务：</strong>在任务视图顶部输入框填写标题，按 <Kbd>Enter</Kbd> 创建。可同时设置截止日期、优先级和所属项目。</li>
          <li><strong className="text-foreground">编辑任务：</strong>点击任务标题可直接行内编辑，点击任务展开后可修改详情、截止日期、优先级和项目归属。</li>
          <li><strong className="text-foreground">进展记录：</strong>展开任务后在进展区域输入内容，支持 Markdown 语法和图片粘贴上传，每次进展自动记录时间。</li>
          <li><strong className="text-foreground">置顶任务：</strong>点击任务左上角的置顶按钮，任务固定到列表顶部，再次点击取消。</li>
          <li><strong className="text-foreground">标记僵持：</strong>长期无进展的任务可标记为「僵持」，通过顶部筛选器可折叠收纳，保持列表清爽。</li>
          <li><strong className="text-foreground">排序与筛选：</strong>支持按优先级、创建时间、截止日期排序；可按项目、僵持状态、完成状态筛选。</li>
          <li><strong className="text-foreground">删除任务：</strong>点击任务右上角的删除按钮，任务从列表中移除。</li>
          <li><strong className="text-foreground">撤销完成：</strong>已勾选完成的任务再次点击复选框即可恢复为进行中。</li>
        </ul>

        <H3>工作区与项目</H3>
        <P>
          工作区是任务数据的隔离单元，不同工作区之间的任务互不可见。顶部的<strong className="text-foreground">工作区选择器</strong>可创建、切换和重命名工作区。每个工作区可在「我的」菜单中独立管理。
        </P>
        <P>
          项目是工作区内的分组标签，支持 8 种颜色标识。在任务详情中可为任务指定项目，顶部工具栏可筛选指定项目的任务。AI 助手可搜索工作区内所有项目。
        </P>

        <H3>AI 智能助手（Pro 专属）</H3>
        <P>
          点击顶部 AI 按钮或右下角悬浮按钮打开 AI 面板。AI 可以：
        </P>
        <ul className="text-sm text-muted space-y-1 mb-3 list-disc list-inside">
          <li>根据自然语言描述<strong className="text-foreground">创建单个或多个任务</strong>，自动设置优先级和截止日期</li>
          <li><strong className="text-foreground">生成日/周/月报</strong>，汇总任务进展和完成情况</li>
          <li><strong className="text-foreground">跨工作区移动任务</strong>，例如"把微信任务收集里的任务移到个人空间"</li>
          <li><strong className="text-foreground">分析任务数据</strong>，给出完成率、逾期情况等统计</li>
          <li><strong className="text-foreground">保存对话为笔记</strong>，重要分析结果一键归档</li>
        </ul>
        <P>
          AI 配置入口在「我的」→「AI 设置」，支持切换 DeepSeek、OpenAI、Kimi、MiMo、Anthropic Claude 等供应商，也可使用自定义 API Key 和模型。
        </P>

        <H3>微信任务收集</H3>
        <P>
          在「我的」→「微信任务收集」中获取 6 位绑定码，发送给公众号即可完成一次性绑定。绑定后，向公众号发送的每条文字消息会自动在「微信任务收集」工作区的「默认」项目下创建任务。后续可通过 AI 助手将任务批量移动到其他工作区。
        </P>

        <H3>主题与外观</H3>
        <P>
          顶部工具栏的外观按钮可切换 8 种主题：
        </P>
        <ul className="text-sm text-muted space-y-1 mb-3 list-disc list-inside">
          <li><strong className="text-foreground">简洁白</strong> — 默认明亮风格</li>
          <li><strong className="text-foreground">星空黑</strong> — 深色主题，带有星空粒子效果</li>
          <li><strong className="text-foreground">莫兰迪咖 / 莫兰迪绿 / 莫兰迪蓝 / 莫兰迪多色</strong> — 四款低饱和度配色</li>
          <li><strong className="text-foreground">暴走模式</strong> — 红色视觉 + 红色边框 + 暴走文字，打工人发泄专属</li>
          <li><strong className="text-foreground">上岸模式</strong> — 深红底 + 金色边框，考公/考研/考证人专属</li>
        </ul>
        <P>
          同时支持 <strong className="text-foreground">4 种字体</strong>（思源黑体、思源宋体、霞鹜文楷、系统默认）和<strong className="text-foreground">动效开关</strong>。暴走模式下开启动效有头皮发麻的粒子效果，关闭动效可省电。
        </P>

        <H3>情绪激励</H3>
        <ul className="text-sm text-muted space-y-2 mb-3 list-disc list-inside">
          <li><strong className="text-foreground">来一发：</strong>点击左下角的圆形激励按钮后全屏烟花庆祝，按钮可拖动到任意位置。</li>
          <li><strong className="text-foreground">庆祝语：</strong>「我的」→「庆祝语」可编辑暴走和庆祝时显示的文案，改成你喜欢的鼓励话语。</li>
          <li><strong className="text-foreground">暴走模式：</strong>配合动效开关，红色边框 + 粒子动画 + 自定义暴走文字，让压力有出口。</li>
        </ul>

        <H3>数据管理</H3>
        <ul className="text-sm text-muted space-y-2 mb-3 list-disc list-inside">
          <li><strong className="text-foreground">云端同步：</strong>登录后数据自动同步到云端，「我的」→「立即同步」可手动触发。游客模式下数据仅保存在浏览器本地。</li>
          <li><strong className="text-foreground">导出：</strong>「我的」→「导出数据」，所有任务以 Markdown 格式导出为 <InlineCode>.md</InlineCode> 文件下载。</li>
          <li><strong className="text-foreground">导入：</strong>「我的」→「导入数据」，选择 <InlineCode>.md</InlineCode> 文件后可选择<strong className="text-foreground">合并</strong>（追加到现有任务）或<strong className="text-foreground">覆盖</strong>（清空后导入）。文件格式支持 Markdown 标题层级自动识别任务和进展。</li>
          <li><strong className="text-foreground">多设备：</strong>同一账号登录多台设备，数据实时同步。注意导入操作会触发全量同步。</li>
        </ul>

        <H3>进展记录 Markdown 语法</H3>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-accent">
                <th className="text-left px-4 py-2 font-semibold text-foreground">语法</th>
                <th className="text-left px-4 py-2 font-semibold text-foreground">效果</th>
                <th className="text-left px-4 py-2 font-semibold text-foreground">写法示例</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ["粗体", "**加粗文字**", "**今日完成** 接口开发"],
                ["斜体", "*倾斜文字*", "*备注：* 等待后端联调"],
                ["行内代码", "`代码`", "调用了 `getUserInfo` 接口"],
                ["无序列表", "- 列表项", "- 完成登录模块\n- 修复分页 bug"],
                ["引用", "> 引用内容", "> 产品经理说这个需求延后"],
                ["插入图片", "![描述](图片链接)", "![截图](https://example.com/img.png)"],
              ].map(([label, syntax, example]) => (
                <tr key={label} className="hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-2 font-medium text-foreground">{label}</td>
                  <td className="px-4 py-2"><InlineCode>{syntax}</InlineCode></td>
                  <td className="px-4 py-2 text-muted text-xs">{example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <H3>快捷键</H3>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-accent">
                <th className="text-left px-4 py-2 font-semibold text-foreground">操作</th>
                <th className="text-left px-4 py-2 font-semibold text-foreground">快捷键</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ["创建任务（聚焦输入框后）", <span key="1"><Kbd>Enter</Kbd></span>],
                ["确认 Markdown 编辑", <span key="2"><Kbd>⌘</Kbd> + <Kbd>Enter</Kbd> 或 <Kbd>Ctrl</Kbd> + <Kbd>Enter</Kbd></span>],
                ["关闭弹窗 / 编辑框", <span key="3"><Kbd>Esc</Kbd></span>],
              ].map(([label, keys]) => (
                <tr key={label as string} className="hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-2 text-muted">{label}</td>
                  <td className="px-4 py-2">{keys}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 版本信息 */}
        <div className="mt-12 pt-6 border-t border-border text-xs text-muted">
          <p>当前版本：V1.3 · 更新时间：2026-04-29 · 如有问题请联系 <a href="mailto:support@taskdada.com" className="text-primary hover:underline">support@taskdada.com</a></p>
        </div>

      </main>
    </div>
  );
}
