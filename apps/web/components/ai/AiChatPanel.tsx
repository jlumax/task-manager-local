'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, Send, BookmarkCheck, ExternalLink, Loader2, Sparkles, CheckSquare, ChevronLeft, ChevronRight, BarChart3, Search, Brain, Network, Target } from 'lucide-react';
import { useAiChat } from '@/hooks/useAiChat';
import ConversationList from './ConversationList';
import ChatBubble from './ChatBubble';

interface Props {
  workspaceId: string | null;
  onClose: () => void;
  collapsed?: 'none' | 'left' | 'right';
  onCollapseLeft?: () => void;
  onCollapseRight?: () => void;
}

const QUICK_ACTIONS = [
  { label: '今日工作总结', icon: <BarChart3 size={18} />, displayText: '帮我总结一下今日工作', prompt: '请根据今日的任务完成情况，给我生成一份简洁的工作总结。先查看任务列表再总结。' },
  { label: '分析任务效率', icon: <Search size={18} />, displayText: '帮我分析任务管理效率', prompt: '请先查看我的所有任务，然后分析我的任务管理效率，指出存在的问题并给出改进建议。' },
  { label: '复习任务笔记', icon: <Brain size={18} />, displayText: '帮我复习任务笔记', prompt: '请帮我复习任务笔记。严格按两阶段操作：\n阶段1：调用 list_tasks（不带filter，获取全部任务），根据每条任务的 lastProgressTime 按艾宾浩斯遗忘曲线计算遗忘程度。按遗忘严重度+reviewCount低优先原则，选出最需要复习的10-15个任务。\n阶段2：对筛选出的任务，调用 get_task 传入 taskIds 数组 一次性获取详情，然后为每个任务给出复习建议。\n格式：[任务ID] + 遗忘阶段 + 距今天数 + 历史复习次数 + 复习建议。最后排出复习计划表。' },
  { label: '拆解大任务', icon: <Network size={18} />, displayText: '帮我拆解一个任务', prompt: '我要交给你一个任务目标，请先问清楚细节（如有必要），然后分解为3-8个子任务并逐条列出方案。必须等我明确确认后，才能调用 batch_create_tasks 批量创建。子任务标题请加统一前缀便于识别。' },
  { label: '重排优先级', icon: <Target size={18} />, displayText: '帮我重新排列任务优先级', prompt: '请先用 list_tasks 获取所有进行中的任务（filter=active），然后根据以下规则分析并建议新的优先级：1) 截止日期越近越优先 2) 最后进展距今超过7天的需要关注 3) 原来就是高优先级的保持不变。逐条列出你的建议。必须等我明确确认后，才能调用 batch_update_tasks 批量更新。' },
];

export default function AiChatPanel({ workspaceId, onClose, collapsed = 'none', onCollapseLeft, onCollapseRight }: Props) {
  const {
    conversations,
    activeConversation,
    messages,
    streaming,
    streamingContent,
    lastUsage,
    error,
    loadConversations,
    loadConversation,
    sendMessage,
    saveAsNote,
    deleteConversation,
    newConversation,
  } = useAiChat(workspaceId);

  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedTaskId, setSavedTaskId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [savePriority, setSavePriority] = useState<string>('medium');
  const saveSeqNumsRef = useRef<number[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = async (text?: string, displayText?: string) => {
    const msg = text || input.trim();
    if (!msg || streaming) return;
    setInput('');
    setSavedTaskId(null);
    await sendMessage(msg, displayText);
  };

  const handleQuickAction = (displayText: string, prompt: string) => {
    handleSend(prompt, displayText);
  };

  const isNewConversation = messages.length === 0 && !streaming;

  // Map each message to its parent user message index (Q&A pair)
  const messageUserMap = useMemo(() => {
    const map = new Map<number, number>();
    let lastUserIdx = -1;
    messages.forEach((msg, i) => {
      if (msg.role === 'user') lastUserIdx = i;
      if (lastUserIdx >= 0) map.set(i, lastUserIdx);
    });
    return map;
  }, [messages]);

  // Indices of all user messages (selectable units)
  const userIndices = useMemo(
    () => messages.reduce<number[]>((acc, m, i) => { if (m.role === 'user') acc.push(i); return acc; }, []),
    [messages],
  );

  const isMessageSelected = useCallback((msgIndex: number) => {
    const userIdx = messageUserMap.get(msgIndex);
    return userIdx !== undefined && selectedIndices.has(userIdx);
  }, [messageUserMap, selectedIndices]);

  const handleToggleSelect = useCallback((msgIndex: number) => {
    const userIdx = messageUserMap.get(msgIndex);
    if (userIdx === undefined) return;
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(userIdx)) next.delete(userIdx);
      else next.add(userIdx);
      return next;
    });
  }, [messageUserMap]);

  const handleSelectAll = useCallback(() => {
    if (selectedIndices.size === userIndices.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(userIndices));
    }
  }, [selectedIndices, userIndices]);

  const handleSaveSelected = useCallback(() => {
    // Convert array indices to user-message sequence numbers (0, 1, 2, ...)
    // to avoid index mismatches when frontend/backend message arrays differ
    saveSeqNumsRef.current = Array.from(selectedIndices).map((arrIdx) => {
      let count = 0;
      for (let i = 0; i <= arrIdx; i++) {
        if (messages[i]?.role === 'user') count++;
      }
      return count - 1;
    });
    setSaveTitle(activeConversation?.title || '');
    setSavePriority('medium');
    setShowSaveDialog(true);
  }, [activeConversation, selectedIndices, messages]);

  const handleConfirmSave = useCallback(async () => {
    setSaving(true);
    setShowSaveDialog(false);
    const taskId = await saveAsNote(
      saveSeqNumsRef.current,
      saveTitle || undefined,
      savePriority,
    );
    if (taskId) {
      setSavedTaskId(taskId);
      setSelectMode(false);
      setSelectedIndices(new Set());
    }
    setSaving(false);
  }, [selectedIndices, saveTitle, savePriority, saveAsNote]);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIndices(new Set());
    setShowSaveDialog(false);
  }, []);

  return (
    <div className="flex h-full w-full flex-col border-l border-border bg-background shadow-2xl relative">
      {/* 分割线折叠手柄 */}
      {onCollapseLeft && onCollapseRight && (
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 z-[60]">
          <button
            onClick={onCollapseLeft}
            title={collapsed === 'left' ? '展开主界面' : collapsed === 'right' ? '恢复分屏' : '收起主界面'}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-muted hover:text-foreground hover:border-primary/50 shadow-sm transition-colors"
          >
            {collapsed === 'left' || collapsed === 'right' ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
          <button
            onClick={onCollapseRight}
            title={collapsed === 'right' ? '展开AI界面' : collapsed === 'left' ? '恢复分屏' : '收起AI界面'}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-muted hover:text-foreground hover:border-primary/50 shadow-sm transition-colors"
          >
            {collapsed === 'right' || collapsed === 'left' ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-primary" />
          <span className="font-semibold text-foreground">AI 助手</span>
        </div>
        <div className="flex items-center gap-1">
          {!isNewConversation && !streaming && !selectMode && (
            <button
              onClick={() => setSelectMode(true)}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted hover:text-primary hover:bg-accent transition-colors"
            >
              <CheckSquare size={14} />
              选择
            </button>
          )}
          {savedTaskId && (
            <button
              onClick={() => {
                const tid = savedTaskId;
                if (tid) {
                  const el = document.querySelector(`[data-task-id="${tid}"]`);
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                  onClose();
                }
              }}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-green-600 hover:bg-accent transition-colors"
            >
              <ExternalLink size={14} />
              查看任务
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-accent transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Body: sidebar + chat area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Conversation list sidebar */}
        <div className="hidden w-[160px] shrink-0 sm:block">
          <ConversationList
            conversations={conversations}
            activeId={activeConversation?.id || null}
            onSelect={loadConversation}
            onDelete={deleteConversation}
            onNew={newConversation}
          />
        </div>

        {/* Chat area */}
        <div className="flex flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {isNewConversation && (
              <div className="flex flex-col items-center gap-3 pt-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                  <Sparkles size={24} className="text-purple-500" />
                </div>
                <p className="text-sm text-muted text-center">
                  你好！我是你的任务管理AI助手，可以帮你分析任务进度、生成工作总结。
                </p>
                <div className="mt-2 flex flex-col gap-2 w-full">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => handleQuickAction(action.displayText, action.prompt)}
                      disabled={streaming}
                      className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground hover:border-primary/50 transition-colors disabled:opacity-50"
                    >
                      <span className="text-lg">{action.icon}</span>
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <ChatBubble
                key={i}
                role={msg.role}
                content={msg.content}
                toolName={msg.toolName}
                toolResult={msg.toolResult}
                selectable={selectMode}
                selected={isMessageSelected(i)}
                onToggle={() => handleToggleSelect(i)}
              />
            ))}

            {streaming && streamingContent && (
              <ChatBubble role="assistant" content={streamingContent} />
            )}

            {streaming && !streamingContent && (
              <div className="flex items-center gap-2 px-4 py-2 text-muted text-sm">
                <Loader2 size={16} className="animate-spin" />
                思考中...
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Selection bar */}
          {selectMode && (
            <div className="border-t border-border bg-muted/30 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSelectAll}
                  className="text-xs text-muted hover:text-foreground transition-colors"
                >
                  {selectedIndices.size === userIndices.length && userIndices.length > 0 ? '取消全选' : '全选'}
                </button>
                <span className="text-xs text-muted">
                  已选 {selectedIndices.size} 条
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveSelected}
                  disabled={selectedIndices.size === 0}
                  className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <BookmarkCheck size={14} />
                  保存为笔记
                </button>
                <button
                  onClick={exitSelectMode}
                  className="rounded-lg px-3 py-1.5 text-xs text-muted hover:text-foreground transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {/* Save dialog */}
          {showSaveDialog && (
            <div className="border-t border-border bg-card px-4 py-4 space-y-3">
              <p className="text-sm font-medium text-foreground">保存为笔记</p>
              <div>
                <label className="text-xs text-muted block mb-1">标题</label>
                <input
                  id="save-note-title"
                  name="save-note-title"
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  placeholder="输入笔记标题..."
                  className="w-full rounded-lg border border-border bg-accent px-3 py-2 text-sm text-foreground placeholder:text-muted outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">优先级</label>
                <div className="flex gap-2">
                  {(['high', 'medium', 'low'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setSavePriority(p)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        savePriority === p
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-accent text-muted hover:text-foreground'
                      }`}
                    >
                      {p === 'high' ? '高' : p === 'medium' ? '中' : '低'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleConfirmSave}
                  disabled={saving || !saveTitle.trim()}
                  className="flex items-center gap-1 rounded-lg px-4 py-2 text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  确认保存
                </button>
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="rounded-lg px-4 py-2 text-xs text-muted hover:text-foreground transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="border-t border-border p-3">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                id="ai-chat-input"
                name="ai-chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="输入问题..."
                disabled={streaming}
                className="flex-1 rounded-xl border border-border bg-accent px-4 py-2.5 text-sm text-foreground placeholder:text-muted outline-none focus:border-primary disabled:opacity-50"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || streaming}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {streaming ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>

            {/* Token usage display */}
            {lastUsage && (
              <div className="mt-2 text-[10px] text-muted/60 text-right">
                本次消耗: {lastUsage.totalTokens.toLocaleString()} tokens
                （提示 {lastUsage.promptTokens.toLocaleString()} + 生成 {lastUsage.completionTokens.toLocaleString()}）
              </div>
            )}

            {/* Mobile conversation list toggle */}
            <div className="mt-2 sm:hidden">
              <button
                onClick={() => {
                  const list = conversations.map((c) => `${c.savedAsTask ? '✓ ' : ''}${c.title} (${c.messageCount})`).join('\n');
                  if (list) {
                    const idx = prompt('选择对话 (输入序号 1-' + conversations.length + ')：\n' + conversations.map((c, i) => `${i + 1}. ${c.savedAsTask ? '✓ ' : ''}${c.title}`).join('\n'));
                    if (idx) {
                      const c = conversations[parseInt(idx) - 1];
                      if (c) loadConversation(c.id);
                    }
                  } else {
                    alert('暂无对话记录');
                  }
                }}
                className="w-full rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:bg-accent transition-colors"
              >
                对话记录
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
