'use client';

import { useState, useCallback, useRef } from 'react';
import { useTaskStore } from '@/store/taskStore';
import { aiApi, type AiConversationItem, type AiConversationDetail } from '@/lib/api';

interface ChatMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolName?: string;
  toolResult?: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ToolCallEvent {
  name: string;
  args: string;
  result: string;
}

export function useAiChat(workspaceId: string | null) {
  const [conversations, setConversations] = useState<AiConversationItem[]>([]);
  const [activeConversation, setActiveConversation] = useState<AiConversationDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [lastUsage, setLastUsage] = useState<TokenUsage | null>(null);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const syncFromCloud = useTaskStore((s) => s.syncFromCloud);
  const currentProjectId = useTaskStore((s) => s.currentProjectId);

  const loadConversations = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const list = await aiApi.getConversations(workspaceId);
      setConversations(list);
    } catch {
      // ignore
    }
  }, [workspaceId]);

  const loadConversation = useCallback(async (cid: string) => {
    if (!workspaceId) return;
    try {
      const detail = await aiApi.getConversation(workspaceId, cid);
      setActiveConversation(detail);
      setMessages(detail.messages.map((m) => ({ role: m.role, content: m.content })));
    } catch {
      setError('加载对话失败');
    }
  }, [workspaceId]);

  const sendMessage = useCallback(async (question: string, displayText?: string) => {
    if (!workspaceId) {
      setError('请先选择或创建一个工作区后再使用 AI 功能');
      return;
    }
    if (!question.trim()) return;
    setError('');
    setStreaming(true);
    setStreamingContent('');

    // Add user message immediately — show displayText if provided, otherwise the full question
    const userMsg: ChatMessage = { role: 'user', content: displayText || question };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const stream = await aiApi.chat(
        workspaceId,
        question,
        activeConversation?.id,
        currentProjectId || undefined,
      );

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let newConvId = activeConversation?.id || '';
      let title = '';
      const pendingToolCalls: ToolCallEvent[] = [];

      // Track current SSE event type
      let currentEvent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          // Track event type
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
            continue;
          }

          if (!line.startsWith('data: ')) continue;

          try {
            const json = JSON.parse(line.slice(6));

            if (currentEvent === 'tool_call') {
              // Tool call event
              const tc: ToolCallEvent = {
                name: json.name,
                args: json.args,
                result: json.result,
              };
              pendingToolCalls.push(tc);

              // Only show one tool hint (first one), don't spam the chat
              if (pendingToolCalls.length === 1) {
                setMessages((prev) => [
                  ...prev,
                  {
                    role: 'tool',
                    content: randomToolPhrase(),
                    toolName: json.name,
                    toolResult: json.result,
                  },
                ]);
              }
            } else if (currentEvent === 'usage') {
              setLastUsage({
                promptTokens: json.promptTokens,
                completionTokens: json.completionTokens,
                totalTokens: json.totalTokens,
              });
            } else if (json.token) {
              fullContent += json.token;
              setStreamingContent(fullContent);
            } else if (json.title) {
              title = json.title;
            } else if (json.conversationId) {
              newConvId = json.conversationId;
            } else if (json.message) {
              setError(json.message);
            }
          } catch {
            // skip
          }

          currentEvent = '';
        }
      }

      // Add assistant message
      if (fullContent) {
        setMessages((prev) => [...prev, { role: 'assistant', content: fullContent }]);
      }

      // Update active conversation
      if (newConvId && !activeConversation) {
        setActiveConversation({
          id: newConvId,
          title: title || question.slice(0, 20),
          savedAsTask: false,
          savedTaskId: null,
          messages: [],
        });
      }

      setStreamingContent('');

      // Refresh task list if AI created or updated tasks (sync from cloud to pull new data into IndexedDB)
      const hasTaskWrite = pendingToolCalls.some(
        (tc) => tc.name === 'create_task' || tc.name === 'update_task' || tc.name === 'batch_create_tasks' || tc.name === 'batch_update_tasks',
      );
      if (hasTaskWrite) {
        await syncFromCloud();
      }

      loadConversations();
    } catch (err: any) {
      setError(err.message || '请求失败');
    } finally {
      setStreaming(false);
    }
  }, [workspaceId, activeConversation, loadConversations, syncFromCloud]);

  const saveAsNote = useCallback(async (indices: number[], title?: string, priority?: string) => {
    if (!workspaceId || !activeConversation) return null;
    try {
      const result = await aiApi.saveConversation(workspaceId, activeConversation.id, {
        messageIndices: indices,
        title,
        priority,
      });
      // Pull new task into IndexedDB so it shows in the frontend list immediately
      await syncFromCloud();
      return result.taskId;
    } catch (err: any) {
      setError(err.message || '保存失败');
      return null;
    }
  }, [workspaceId, activeConversation, syncFromCloud]);

  const deleteConversation = useCallback(async (cid: string) => {
    if (!workspaceId) return;
    try {
      await aiApi.deleteConversation(workspaceId, cid);
      if (activeConversation?.id === cid) {
        setActiveConversation(null);
        setMessages([]);
      }
      loadConversations();
    } catch {
      setError('删除失败');
    }
  }, [workspaceId, activeConversation, loadConversations]);

  const newConversation = useCallback(() => {
    setActiveConversation(null);
    setMessages([]);
    setStreamingContent('');
    setError('');
  }, []);

  return {
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
  };
}

const TOOL_PHRASES = [
  '让我看看怎么个事儿…',
  '收到，让我研究一下…',
  '稍等，我瞅一眼…',
  '好嘞，正在帮你查…',
  '让我翻翻任务本…',
  '等一下哈，马上就好…',
  '容我想想…',
  '正在帮你处理…',
  '好，我先看看数据…',
  '嗯嗯，已经在找了…',
  '让我扫一眼任务列表…',
  '正在干活，别急…',
  '好的，我已经在看了…',
  '这就帮你安排…',
  '收到信号，正在执行…',
];

function randomToolPhrase(): string {
  return TOOL_PHRASES[Math.floor(Math.random() * TOOL_PHRASES.length)];
}
