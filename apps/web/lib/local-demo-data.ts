import { db, generateTaskCode } from '@/db';
import { LOCAL_WORKSPACE_ID } from '@/lib/app-mode';
import type { Priority, ProgressItem, Project, Task } from '@/types';

const DEMO_SEED_SETTING = 'localDemoSeedVersion';
const DEMO_SEED_VERSION = '1';

type DemoStatus = 'active' | 'completed' | 'stuck';

interface DemoTaskSpec {
  title: string;
  startOffset: number;
  deadlineOffset: number;
  priority: Priority;
  status: DemoStatus;
  progress: Array<[number, string]>;
  pinned?: boolean;
}

const GUIDE_TASKS: DemoTaskSpec[] = [
  {
    title: '请在全部项目-管理项目中删除演示数据',
    startOffset: 0,
    deadlineOffset: 14,
    priority: 'high',
    status: 'active',
    pinned: true,
    progress: [[0, '熟悉应用后，打开“全部项目”→“管理项目”，删除这个演示项目；删除后不会自动恢复。']],
  },
  {
    title: '一键添加任务：先把脑子里的事倒出来',
    startOffset: -1,
    deadlineOffset: 5,
    priority: 'medium',
    status: 'active',
    progress: [[-1, '在页面顶部输入任务名称，点击加号就能建立任务。'], [0, '任务建好后，还可以直接修改标题、开始日期和截止日期。']],
  },
  {
    title: '用进展记录留下过程，不只是打一个勾',
    startOffset: -3,
    deadlineOffset: 3,
    priority: 'high',
    status: 'active',
    progress: [[-3, '点击“记录进展”，可以按时间追加文字和图片。'], [-1, '进展会按时间沉淀，以后回看时不用靠猜。']],
  },
  {
    title: '标记优先级和 Deadline，今天先救哪一件',
    startOffset: -6,
    deadlineOffset: -1,
    priority: 'high',
    status: 'stuck',
    progress: [[-5, '点击优先级色点，可在高、中、低之间切换。'], [-2, '已设置截止日期；逾期任务会单独统计，不再装作没看见。']],
  },
  {
    title: '列表、笔记、甘特图：同一批任务三种看法',
    startOffset: -8,
    deadlineOffset: 8,
    priority: 'medium',
    status: 'completed',
    progress: [[-7, '列表适合推进，笔记卡片适合回顾，甘特图适合看时间排布。'], [-4, '已在顶部试着来回切换三个视图，同一份数据不用重复维护。']],
  },
  {
    title: '切换主题和字体，给待办一点情绪价值',
    startOffset: -10,
    deadlineOffset: 10,
    priority: 'low',
    status: 'completed',
    progress: [[-9, '打开“外观”，可切换暴走、上岸、极光星空等主题。'], [-6, '字体也可独立切换，正经与不正经可以随时换班。']],
  },
  {
    title: '页面卡顿时，可在外观中关闭动效',
    startOffset: -12,
    deadlineOffset: 12,
    priority: 'medium',
    status: 'active',
    progress: [[-11, '极光、烟花等动效会占用一些性能。'], [-8, '如果设备开始喊累，在“外观”里关闭动效即可。']],
  },
  {
    title: '完成任务会放烟花，也可以随时随地来一发',
    startOffset: -14,
    deadlineOffset: 1,
    priority: 'low',
    status: 'completed',
    progress: [[-13, '勾选完成任务时会触发庆祝烟花。'], [-10, '当然，不想等任务完成也没关系：点击页面上的烟花按钮，随时来一发。']],
  },
  {
    title: '按项目分类任务，也可在全部项目统一查看',
    startOffset: -16,
    deadlineOffset: 7,
    priority: 'medium',
    status: 'stuck',
    progress: [[-15, '用项目区分工作、学习和“我真的会去健身”。'], [-12, '切回“全部项目”，可以横向搜索和统一筛选。']],
  },
  {
    title: '本地数据可导出 ZIP 或 Markdown，记得备份',
    startOffset: -18,
    deadlineOffset: 20,
    priority: 'high',
    status: 'completed',
    progress: [[-17, '本应用免登录，数据只保存在当前浏览器。'], [-14, '“本地数据”中可导出 ZIP（JSON+原始图片）或 Markdown，换电脑前请先打包。']],
  },
];

function dateAtOffset(base: Date, dayOffset: number, hour = 10): Date {
  const date = new Date(base);
  date.setHours(hour, 0, 0, 0);
  date.setDate(date.getDate() + dayOffset);
  return date;
}

function dateInputValue(base: Date, dayOffset: number): string {
  const date = dateAtOffset(base, dayOffset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createTask(
  projectId: string,
  taskId: string,
  spec: DemoTaskSpec,
  base: Date,
): Task {
  const createdAt = dateAtOffset(base, spec.startOffset - 1, 9).toISOString();
  const completedAt = spec.status === 'completed'
    ? dateAtOffset(base, Math.min(spec.deadlineOffset, -1), 17).toISOString()
    : null;
  const progress: ProgressItem[] = spec.progress.map(([offset, content], index) => ({
    content,
    time: dateAtOffset(base, offset, 11 + index * 2).toISOString(),
  }));

  return {
    id: taskId,
    code: generateTaskCode(createdAt),
    title: spec.title,
    completed: spec.status === 'completed',
    stuck: spec.status === 'stuck',
    stuckAt: spec.status === 'stuck' ? dateAtOffset(base, -1, 16).toISOString() : null,
    pinned: spec.pinned ?? false,
    pinnedAt: spec.pinned ? dateAtOffset(base, 0, 8).toISOString() : null,
    createdAt,
    completedAt,
    startDate: dateInputValue(base, spec.startOffset),
    progress,
    deadline: dateInputValue(base, spec.deadlineOffset),
    priority: spec.priority,
    projectId,
    workspaceId: LOCAL_WORKSPACE_ID,
  };
}

export function buildLocalDemoData(now = new Date()): { projects: Project[]; tasks: Task[] } {
  const base = new Date(now);
  const createdAt = dateAtOffset(base, -22, 9).toISOString();
  const guideProjectId = 'local-demo-guide-v1';
  const projects: Project[] = [
    {
      id: guideProjectId,
      name: '使用说明演示1',
      color: 'blue',
      order: 0,
      archived: false,
      workspaceId: LOCAL_WORKSPACE_ID,
      createdAt,
    },
  ];
  const tasks = GUIDE_TASKS.map((spec, index) => (
    createTask(guideProjectId, `local-demo-guide-task-${index + 1}`, spec, base)
  ));

  return { projects, tasks };
}

export async function seedLocalDemoDataIfNeeded(): Promise<boolean> {
  return db.transaction('rw', db.tasks, db.projects, db.settings, async () => {
    const seedVersion = await db.settings.get(DEMO_SEED_SETTING);
    if (seedVersion) return false;

    const [taskCount, projectCount] = await Promise.all([
      db.tasks.count(),
      db.projects.count(),
    ]);

    if (taskCount > 0 || projectCount > 0) {
      await db.settings.put({ key: DEMO_SEED_SETTING, value: DEMO_SEED_VERSION });
      return false;
    }

    const { projects, tasks } = buildLocalDemoData();
    await db.projects.bulkPut(projects);
    await db.tasks.bulkPut(tasks);
    await db.settings.put({ key: DEMO_SEED_SETTING, value: DEMO_SEED_VERSION });
    return true;
  });
}
