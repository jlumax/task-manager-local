export const isLocalMode = process.env.NEXT_PUBLIC_APP_MODE === 'local';

export const LOCAL_WORKSPACE_ID = 'local-workspace';

export const LOCAL_PLAN_LIMITS = {
  tasks: Number.MAX_SAFE_INTEGER,
  projects: Number.MAX_SAFE_INTEGER,
  members: 1,
  storageMB: 0,
  gantt: true,
  ai: false,
  api: false,
  export: true,
  import: true,
  animation: true,
  progressImage: true,
};
