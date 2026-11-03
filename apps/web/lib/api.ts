import { getCloudBaseToken, getCloudBaseUid } from '@/lib/cloudbase';
import type { Project, Task } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';
const API_ORIGIN = API_BASE.replace(/\/api\/v1\/?$/, '');

const JWT_KEY = 'task_manager_jwt';

export async function getAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(JWT_KEY);
}

export function setAuthToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(JWT_KEY, token);
  }
}

export function clearAuthToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(JWT_KEY);
  }
}

export async function exchangeCloudBaseToken(expectedPhone?: string): Promise<void> {
  const accessToken = await getCloudBaseToken();
  const uid = await getCloudBaseUid();
  if (!accessToken) {
    clearAuthToken();
    return;
  }

  let lastError = '';
  const retryDelays = [1500, 2500, 4000, 6000, 8000];
  for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/auth/cloudbase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, uid, expectedPhone }),
      });
    } catch {
      lastError = `无法连接任务服务，请检查 API 地址是否可用：${API_BASE}`;
      if (attempt < retryDelays.length) {
        await new Promise((resolve) => setTimeout(resolve, retryDelays[attempt]));
        continue;
      }
      throw new Error(lastError);
    }

    if (res.ok) {
      const data = await res.json();
      setAuthToken(data.token);
      return;
    }

    const text = await res.text().catch(() => 'Unknown error');
    lastError = `Auth exchange failed: ${res.status} ${text}`;
    if ([502, 503, 504].includes(res.status)) {
      if (attempt < retryDelays.length) {
        await new Promise((resolve) => setTimeout(resolve, retryDelays[attempt]));
        continue;
      }
      throw new Error('任务服务正在启动，请稍后重新登录');
    }
    if (res.status === 429 && attempt < retryDelays.length) {
      await new Promise((resolve) => setTimeout(resolve, retryDelays[attempt]));
      continue;
    }
    throw new Error(lastError);
  }
  throw new Error(lastError || 'Auth exchange failed');
}

async function getHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch<T = unknown>(
  input: string,
  init?: RequestInit,
  retries = 1,
  timeoutMs = 20000,
): Promise<T> {
  const url = input.startsWith('http') ? input : `${API_BASE}${input}`;
  const headers = await getHeaders();
  if (init?.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...init,
        headers: {
          ...headers,
          ...(init?.headers || {}),
        },
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => 'Unknown error');
        let message = text;
        let code: string | undefined;
        try {
          const json = JSON.parse(text);
          if (json.message) message = json.message;
          else if (json.error) message = json.error;
          if (json.code) code = json.code;
        } catch {
          // not JSON, use raw text
        }
        if (res.status === 401 && message.includes('expired')) {
          clearAuthToken();
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
        }
        throw new ApiError(`API ${res.status}: ${message}`, res.status, code);
      }
      return res.json() as Promise<T>;
    } catch (err: any) {
      clearTimeout(timer);
      lastError = err;
      // 超时 → 可重试
      if (err.name === 'AbortError' && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        continue;
      }
      // 网络错误（冷启动导致预检超时）→ 等 1.5 秒重试
      if (err instanceof TypeError && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        continue;
      }
      // 转为明确错误消息
      if (err.name === 'AbortError') {
        throw new Error('请求超时，服务器可能正在启动，请稍后重试');
      }
      if (err instanceof TypeError) {
        throw new Error('网络连接失败，请检查网络后重试');
      }
      throw err;
    }
  }
  throw lastError;
}

export interface CloudTask {
  id: string;
  code?: string;
  title: string;
  completed: boolean;
  stuck?: boolean;
  stuckAt?: string | null;
  pinned?: boolean;
  pinnedAt?: string | null;
  createdAt: string;
  completedAt: string | null;
  startDate: string | null;
  progress: { content: string; time: string; images?: string[] }[];
  deadline: string | null;
  priority: 'high' | 'medium' | 'low';
  workspaceId: string;
  projectId: string | null;
  deletedAt: string | null;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  plan: string;
  role?: string;
  createdAt: string;
  updatedAt: string;
}

export const tasksApi = {
  list: (workspaceId: string, options?: { after?: string; deleted?: boolean }) =>
    apiFetch<CloudTask[]>(`/workspaces/${workspaceId}/tasks?${new URLSearchParams({
      ...(options?.after ? { after: options.after } : {}),
      ...(options?.deleted ? { deleted: 'true' } : {}),
    })}`),

  create: (workspaceId: string, data: {
    title: string;
    priority?: 'high' | 'medium' | 'low';
    deadline?: string | null;
    createdAt?: string;
    progress?: { content: string; time: string }[];
  }) =>
    apiFetch<CloudTask>(`/workspaces/${workspaceId}/tasks`, {
      method: 'POST',
      body: JSON.stringify({ workspaceId, ...data }),
    }),

  update: (workspaceId: string, taskId: string, data: Partial<Omit<CloudTask, 'id' | 'workspaceId'>>) =>
    apiFetch<CloudTask>(`/workspaces/${workspaceId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  remove: (workspaceId: string, taskId: string) =>
    apiFetch<void>(`/workspaces/${workspaceId}/tasks/${taskId}`, {
      method: 'DELETE',
    }),

  move: (workspaceId: string, taskId: string, targetWorkspaceId: string, targetProjectId?: string) =>
    apiFetch<CloudTask>(`/workspaces/${workspaceId}/tasks/${taskId}/move`, {
      method: 'PATCH',
      body: JSON.stringify({ targetWorkspaceId, targetProjectId }),
    }),
};

export const syncApi = {
  pull: (workspaceId: string, lastSyncAt?: string) =>
    apiFetch<{ tasks: CloudTask[]; deletedIds: string[]; serverTs: string }>(`/workspaces/${workspaceId}/sync/pull`, {
      method: 'POST',
      body: JSON.stringify({ lastSyncAt }),
    }),

  push: (workspaceId: string, changes: {
    id: string;
    action: 'create' | 'update' | 'delete';
    data?: Task;
    clientTs: string;
  }[]) =>
    apiFetch<{ results: { id: string; success: boolean; error?: string }[]; serverTs: string }>(`/workspaces/${workspaceId}/sync/push`, {
      method: 'POST',
      body: JSON.stringify({ workspaceId, changes }),
    }),
};

export const workspacesApi = {
  list: () => apiFetch<Workspace[]>('/workspaces'),
  create: (name: string) =>
    apiFetch<Workspace>('/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  update: (id: string, data: { name?: string }) =>
    apiFetch<Workspace>(`/workspaces/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/workspaces/${id}`, {
      method: 'DELETE',
    }),
};

export interface PlanInfo {
  id: string;
  name: string;
  description?: string;
  price: number;
  priceYearly?: number;
  currency: string;
  features: string[];
  limits: {
    tasks: number;
    projects: number;
    members: number;
    storageMB: number;
    gantt: boolean;
    ai: boolean;
    api: boolean;
    export: boolean;
    import: boolean;
    animation: boolean;
    progressImage: boolean;
  };
}

export interface SubscriptionInfo {
  plan: string;
  subscription: {
    id: string;
    status: string;
    currentPeriodEnd: string;
  } | null;
}

export const billingApi = {
  getPlans: () => apiFetch<PlanInfo[]>('/billing/plans'),
  getSubscription: (workspaceId: string) =>
    apiFetch<SubscriptionInfo>(`/billing/subscription?workspaceId=${workspaceId}`),
  createCheckout: (workspaceId: string, priceId: string, provider?: string) =>
    apiFetch<{ url: string; sessionId: string }>('/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ workspaceId, priceId, provider: provider || 'stripe' }),
    }),
  createPortal: (workspaceId: string, provider?: string) =>
    apiFetch<{ url: string }>('/billing/portal', {
      method: 'POST',
      body: JSON.stringify({ workspaceId, provider: provider || 'stripe' }),
    }),
};

export const wechatApi = {
  getBindCode: () => apiFetch<{ code: string; expiresAt: string }>('/wechat/bind-code'),
  getStatus: () => apiFetch<{ bound: boolean; boundAt: string | null }>('/wechat/status'),
  unbind: () => apiFetch<{ success: boolean }>('/wechat/unbind', { method: 'DELETE' }),
};

export const filesApi = {
  upload: async (workspaceId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiFetch<{ id: string; url: string; originalName: string; size: number }>(
      `/workspaces/${workspaceId}/files/upload`,
      {
        method: 'POST',
        headers: {}, // Let browser set Content-Type with boundary
        body: formData,
      },
    );
    return {
      ...res,
      url: res.url.startsWith('http') ? res.url : `${API_ORIGIN}${res.url}`,
    };
  },
};

export interface AdminPlan {
  id: string;
  key: string;
  name: string;
  description: string | null;
  price: number;
  priceYearly: number | null;
  currency: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  limits: {
    id: string;
    maxTasks: number;
    maxProjects: number;
    maxMembers: number;
    maxStorageMB: number;
    enableGantt: boolean;
    enableAi: boolean;
    enableApi: boolean;
    enableExport: boolean;
    enableImport: boolean;
    enableAnimation: boolean;
    enableCloudSync: boolean;
    enableProgressImage: boolean;
    aiQuotaMonthly: number;
    aiCustomKey: boolean;
  } | null;
}

export interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  disabled: boolean;
  lastLoginAt: string | null;
  plan: string;
  cloudbaseUid: string | null;
  createdAt: string;
  workspaceCount: number;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  aiQuotaUsed: number;
  workspaces: {
    id: string;
    name: string;
    plan: string;
    role: string;
    joinedAt: string;
  }[];
}

export interface AdminUserDetail {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  disabled: boolean;
  lastLoginAt: string | null;
  plan: string;
  cloudbaseUid: string | null;
  createdAt: string;
  updatedAt: string;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  aiQuotaUsed: number;
  aiQuotaReset: string | null;
  workspaces: {
    id: string;
    name: string;
    plan: string;
    role: string;
    joinedAt: string;
    taskCount: number;
    projectCount: number;
    aiQuotaUsed: number;
  }[];
}

export interface AdminUserList {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

export const adminApi = {
  getPlans: () => apiFetch<AdminPlan[]>('/admin/plans'),
  createPlan: (data: Omit<AdminPlan, 'id' | 'createdAt' | 'updatedAt' | 'limits'> & { limits?: Partial<AdminPlan['limits']> }) =>
    apiFetch<AdminPlan>('/admin/plans', { method: 'POST', body: JSON.stringify(data) }),
  updatePlan: (id: string, data: Partial<Omit<AdminPlan, 'id' | 'createdAt' | 'updatedAt' | 'limits'> & { limits?: Partial<AdminPlan['limits']> }>) =>
    apiFetch<AdminPlan>(`/admin/plans/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePlan: (id: string) => apiFetch<{ deleted: boolean }>(`/admin/plans/${id}`, { method: 'DELETE' }),

  // API Key Pool
  getKeyPool: () => apiFetch<KeyPoolEntry[]>('/admin/key-pool'),
  getKeyPoolStatus: () => apiFetch<KeyPoolStatus>('/admin/key-pool/status'),
  createKeyPool: (data: { provider: string; baseUrl: string; apiKey: string; model: string; enabled?: boolean; priority?: number }) =>
    apiFetch<KeyPoolEntry>('/admin/key-pool', { method: 'POST', body: JSON.stringify(data) }),
  updateKeyPool: (id: string, data: Partial<{ provider: string; baseUrl: string; apiKey: string; model: string; enabled: boolean; priority: number }>) =>
    apiFetch<KeyPoolEntry>(`/admin/key-pool/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteKeyPool: (id: string) => apiFetch<{ deleted: boolean }>(`/admin/key-pool/${id}`, { method: 'DELETE' }),

  // 用户管理
  getUsers: (params?: { page?: number; limit?: number; search?: string }) =>
    apiFetch<AdminUserList>(`/admin/users?${new URLSearchParams({
      ...(params?.page ? { page: String(params.page) } : {}),
      ...(params?.limit ? { limit: String(params.limit) } : {}),
      ...(params?.search ? { search: params.search } : {}),
    })}`),
  getUserDetail: (userId: string) =>
    apiFetch<AdminUserDetail>(`/admin/users/${userId}`),
  updateUser: (userId: string, data: { name?: string; email?: string }) =>
    apiFetch<AdminUser>(`/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  setUserDisabled: (userId: string, disabled: boolean) =>
    apiFetch<{ disabled: boolean }>(`/admin/users/${userId}/disabled`, { method: 'PATCH', body: JSON.stringify({ disabled }) }),
  updateUserPlan: (userId: string, plan: string) =>
    apiFetch<{ id: string; name: string | null; plan: string; syncedWorkspaces: number }>(`/admin/users/${userId}/plan`, { method: 'PATCH', body: JSON.stringify({ plan }) }),
  deleteUser: (userId: string) =>
    apiFetch<{ deleted: boolean }>(`/admin/users/${userId}`, { method: 'DELETE' }),

  updateWorkspacePlan: (workspaceId: string, plan: string) =>
    apiFetch<{ id: string; name: string; plan: string }>(`/admin/workspaces/${workspaceId}/plan`, { method: 'PATCH', body: JSON.stringify({ plan }) }),
};

export interface KeyPoolEntry {
  id: string;
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
  priority: number;
}

export interface KeyPoolStatus {
  total: number;
  busy: number;
  available: number;
  waiters: number;
}

// ---- Announcements ----

export interface Announcement {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  targetPlans: string[];
  isActive: boolean;
  priority: number;
  startDate: string | null;
  endDate: string | null;
  dismissible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveAnnouncement {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  dismissible: boolean;
  dismissed: boolean;
}

export const announcementsApi = {
  getActive: (plan: string) =>
    apiFetch<ActiveAnnouncement[]>(`/announcements/active?plan=${encodeURIComponent(plan)}`),
  dismiss: (id: string) =>
    apiFetch<{ dismissed: boolean }>(`/announcements/${id}/dismiss`, { method: 'POST' }),
};

export const adminAnnouncementsApi = {
  list: () => apiFetch<Announcement[]>('/admin/announcements'),
  get: (id: string) => apiFetch<Announcement>(`/admin/announcements/${id}`),
  create: (data: {
    title: string;
    content: string;
    imageUrl?: string;
    targetPlans: string[];
    isActive?: boolean;
    priority?: number;
    startDate?: string;
    endDate?: string;
    dismissible?: boolean;
  }) => apiFetch<Announcement>('/admin/announcements', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{
    title: string;
    content: string;
    imageUrl: string;
    targetPlans: string[];
    isActive: boolean;
    priority: number;
    startDate: string;
    endDate: string;
    dismissible: boolean;
  }>) => apiFetch<Announcement>(`/admin/announcements/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => apiFetch<{ deleted?: boolean }>(`/admin/announcements/${id}`, { method: 'DELETE' }),
};

// ---- AI ----

export interface AiConversationItem {
  id: string;
  title: string;
  savedAsTask: boolean;
  savedTaskId: string | null;
  updatedAt: string;
  messageCount: number;
}

export interface AiConversationDetail {
  id: string;
  title: string;
  savedAsTask: boolean;
  savedTaskId: string | null;
  messages: { role: 'user' | 'assistant'; content: string; createdAt: string }[];
}

export interface AiQuotaInfo {
  used: number;
  limit: number;
  plan: string;
  hasCustomKey: boolean;
}

export interface AiCustomKeyInfo {
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
}

export const aiApi = {
  analyze: (workspaceId: string, options?: { taskIds?: string[]; focus?: string }) =>
    apiFetch<{ summary: string; stats: any }>(`/workspaces/${workspaceId}/ai/analyze`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    }),

  report: (workspaceId: string, options: { type: 'daily' | 'weekly' | 'monthly'; date?: string }) =>
    apiFetch<{ markdown: string; stats: any }>(`/workspaces/${workspaceId}/ai/report`, {
      method: 'POST',
      body: JSON.stringify(options),
    }),

  chat: (workspaceId: string, question: string, conversationId?: string, projectId?: string): Promise<ReadableStream<Uint8Array>> =>
    (async () => {
      const url = `${API_BASE}/workspaces/${workspaceId}/ai/chat`;
      const headers = await getHeaders();
      const res = await fetch(url, {
        method: 'POST',
        headers: { ...headers, Accept: 'text/event-stream' },
        body: JSON.stringify({ question, conversationId, projectId }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => 'Unknown error');
        throw new ApiError(`AI chat error: ${res.status} ${text}`, res.status);
      }
      return res.body!;
    })(),

  getConversations: (workspaceId: string) =>
    apiFetch<AiConversationItem[]>(`/workspaces/${workspaceId}/ai/conversations`),

  getConversation: (workspaceId: string, cid: string) =>
    apiFetch<AiConversationDetail>(`/workspaces/${workspaceId}/ai/conversations/${cid}`),

  deleteConversation: (workspaceId: string, cid: string) =>
    apiFetch<{ deleted: boolean }>(`/workspaces/${workspaceId}/ai/conversations/${cid}`, { method: 'DELETE' }),

  saveConversation: (workspaceId: string, cid: string, data?: { messageIndices?: number[]; title?: string; priority?: string }) =>
    apiFetch<{ taskId: string; task: any }>(`/workspaces/${workspaceId}/ai/conversations/${cid}/save`, { method: 'POST', body: JSON.stringify(data || {}) }),

  getQuota: (workspaceId: string) =>
    apiFetch<AiQuotaInfo>(`/workspaces/${workspaceId}/ai/quota`),

  getCustomKey: (workspaceId: string) =>
    apiFetch<AiCustomKeyInfo>(`/workspaces/${workspaceId}/ai/custom-key`),

  saveCustomKey: (workspaceId: string, data: { provider?: string; baseUrl?: string; apiKey?: string; model?: string; enabled?: boolean }) =>
    apiFetch<{ saved: boolean }>(`/workspaces/${workspaceId}/ai/custom-key`, { method: 'POST', body: JSON.stringify(data) }),

  deleteCustomKey: (workspaceId: string) =>
    apiFetch<{ deleted: boolean }>(`/workspaces/${workspaceId}/ai/custom-key`, { method: 'DELETE' }),

  testCustomKey: (workspaceId: string, data: { baseUrl?: string; apiKey?: string; model?: string }) =>
    apiFetch<{ success: boolean; model: string }>(`/workspaces/${workspaceId}/ai/custom-key/test`, { method: 'POST', body: JSON.stringify(data) }),

  getPreferences: (workspaceId: string) =>
    apiFetch<{ replyStyle: string; customInstructions: string; nickname: string }>(`/workspaces/${workspaceId}/ai/preferences`),

  savePreferences: (workspaceId: string, data: { replyStyle?: string; customInstructions?: string; nickname?: string }) =>
    apiFetch<{ saved: boolean; preferences: Record<string, string> }>(`/workspaces/${workspaceId}/ai/preferences`, { method: 'POST', body: JSON.stringify(data) }),
};

export interface ProjectCreate {
  name: string;
  color?: string;
}

export interface ProjectUpdate {
  name?: string;
  color?: string;
  order?: number;
  archived?: boolean;
}

export const projectApi = {
  list: (workspaceId: string) =>
    apiFetch<Project[]>(`/workspaces/${workspaceId}/projects`),

  create: (workspaceId: string, data: ProjectCreate) =>
    apiFetch<Project>(`/workspaces/${workspaceId}/projects`, { method: 'POST', body: JSON.stringify(data) }),

  update: (workspaceId: string, projectId: string, data: ProjectUpdate) =>
    apiFetch<Project>(`/workspaces/${workspaceId}/projects/${projectId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (workspaceId: string, projectId: string) =>
    apiFetch<{ deleted: boolean }>(`/workspaces/${workspaceId}/projects/${projectId}`, { method: 'DELETE' }),
};

// ---- Phone / SMS ----

export const smsApi = {
  sendCode: (phone: string, purpose: 'bind' | 'login' | 'register') =>
    apiFetch<void>('/auth/send-sms-code', { method: 'POST', body: JSON.stringify({ phone, purpose }) }),

  loginByPhone: (phone: string, code: string) =>
    apiFetch<{ token: string; user: { id: string; phone?: string; name?: string; email?: string } }>('/auth/login-by-phone', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    }),

  bindPhone: (phone: string, code: string) =>
    apiFetch<{ success: boolean; message: string }>('/auth/bind-phone', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    }),
};
