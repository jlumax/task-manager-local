'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useCloudBaseAuth';
import { useTaskStore } from '@/store/taskStore';
import { connectSocket, disconnectSocket, reconnectSocket } from '@/lib/socket';
import { saveTask, deleteTask as deleteTaskFromDB, generateTaskCode } from '@/db';

export function useSync() {
  const { isSignedIn } = useAuth();
  const {
    syncFromCloud,
    setOnline,
    currentWorkspaceId,
    loadTasks,
  } = useTaskStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initial sync when signed in AND workspace is selected
  useEffect(() => {
    if (!isSignedIn || !currentWorkspaceId) return;
    let mounted = true;
    (async () => {
      await syncFromCloud();
    })();
    return () => {
      mounted = false;
    };
  }, [isSignedIn, currentWorkspaceId, syncFromCloud]);

  // Periodic sync every 30 seconds
  useEffect(() => {
    if (!isSignedIn || !currentWorkspaceId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      syncFromCloud();
    }, 30000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isSignedIn, currentWorkspaceId, syncFromCloud]);

  // WebSocket connection and event listeners
  useEffect(() => {
    if (!isSignedIn) {
      disconnectSocket();
      return;
    }

    let mounted = true;
    let socketCleanup: (() => void) | undefined;

    (async () => {
      const socket = await connectSocket();
      if (!socket || !mounted) return;

      const handleCreated = (payload: any) => {
        // 按工作区过滤：只处理当前工作区的事件
        const taskWsId = payload.workspaceId;
        if (taskWsId && taskWsId !== currentWorkspaceId) return;

        const task = {
          id: payload.id,
          code: payload.code || generateTaskCode(payload.createdAt),
          title: payload.title,
          completed: payload.completed,
          stuck: payload.stuck ?? false,
          stuckAt: payload.stuckAt ?? null,
          pinned: payload.pinned ?? false,
          pinnedAt: payload.pinnedAt ?? null,
          createdAt: payload.createdAt,
          completedAt: payload.completedAt,
          startDate: payload.startDate ?? null,
          progress: payload.progress || [],
          deadline: payload.deadline,
          priority: payload.priority,
          projectId: payload.projectId ?? null,
          workspaceId: taskWsId || currentWorkspaceId,
        };
        // 后台处理，不阻塞事件循环
        saveTask(task).then(() => loadTasks()).catch(() => {});
      };

      const handleUpdated = (payload: any) => {
        // 按工作区过滤：只处理当前工作区的事件
        const taskWsId = payload.workspaceId;
        if (taskWsId && taskWsId !== currentWorkspaceId) return;

        const task = {
          id: payload.id,
          code: payload.code || generateTaskCode(payload.createdAt),
          title: payload.title,
          completed: payload.completed,
          stuck: payload.stuck ?? false,
          stuckAt: payload.stuckAt ?? null,
          pinned: payload.pinned ?? false,
          pinnedAt: payload.pinnedAt ?? null,
          createdAt: payload.createdAt,
          completedAt: payload.completedAt,
          startDate: payload.startDate ?? null,
          progress: payload.progress || [],
          deadline: payload.deadline,
          priority: payload.priority,
          projectId: payload.projectId ?? null,
          workspaceId: taskWsId || currentWorkspaceId,
        };
        // 后台处理，不阻塞事件循环
        saveTask(task).then(() => loadTasks()).catch(() => {});
      };

      const handleDeleted = (payload: any) => {
        // 按工作区过滤：只处理当前工作区的事件
        const taskWsId = payload.workspaceId;
        if (taskWsId && taskWsId !== currentWorkspaceId) return;

        if (payload?.id) {
          deleteTaskFromDB(payload.id).then(() => loadTasks()).catch(() => {});
        }
      };

      socket.on('task:created', handleCreated);
      socket.on('task:updated', handleUpdated);
      socket.on('task:deleted', handleDeleted);

      socketCleanup = () => {
        socket.off('task:created', handleCreated);
        socket.off('task:updated', handleUpdated);
        socket.off('task:deleted', handleDeleted);
      };
    })();

    return () => {
      mounted = false;
      if (socketCleanup) socketCleanup();
      disconnectSocket();
    };
  }, [isSignedIn, loadTasks, currentWorkspaceId]);

  // Reconnect socket when workspace changes
  useEffect(() => {
    if (!isSignedIn || !currentWorkspaceId) return;
    reconnectSocket();
  }, [isSignedIn, currentWorkspaceId]);

  // Online/offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      if (isSignedIn && currentWorkspaceId) {
        syncFromCloud();
      }
    };
    const handleOffline = () => {
      setOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isSignedIn, currentWorkspaceId, setOnline, syncFromCloud]);
}
