'use client';

import { useEffect, useRef } from 'react';
import { useTaskStore } from '@/store/taskStore';

// 暴走模式吐槽文案（原版精确值）
const rageTexts = [
  '又是周一', '这B班非上不可吗', '我真的会谢', '躺平了', '毁灭吧',
  '不想起床', '闹钟响了', '再睡一夏', '人已疯', '摆烂吧',
  '打工人的命也是命', '早八人早八魂', '通勤两小时', '挤地铁挤哭了',
  '他喵的', '我勒个去', '坑爹啊', '卧了个槽', '啥也不是',
  '老板画饼', '领导装逼', '老板又疯了', '老板懂个屁', '领导是沙雕',
  '拍马屁的升职了', '干活的离职了', '会舔的赢麻了', '老实人吃亏',
  '领导说我不够努力', '他说要有光', '他说很简单', '他说下周上线',
  '我去他的', '泥煤的', '搞什么飞机', '脑子进水了', '有病吧',
  '996福报', '007才是真爱', '工资三千', '绩效扣光', '年终奖没了',
  '加班没有加班费', '调休是什么', '周末团建', '凌晨两点的公司',
  '住公司算了', '公司是家', '老板说我像家人', '家人不给钱',
  '大爷的', '累死爹了', '命苦啊', '倒了血霉', '造孽啊',
  '方案改第八版', '需求又变了', '要第一版', '客户说随便',
  '客户要高大上', '客户要五彩斑斓黑', '客户说感觉不对',
  '开不完的会', '写不完的PPT', '做不完的表', '改不完的稿',
  '日报周报月报', '开会两小时', '结论再议', '拉齐一下',
  '同步一下', '碰一下', '对一下', '过一下', '盘一下',
  '搞毛啊', '什么鬼', '坑爹呢', '你妹的', '见鬼了',
  '会议精神', '对齐颗粒度', '形成闭环', '底层逻辑', '顶层设计',
  '赋能抓手', '组合拳', '价值转化', '生态体系', '矩阵思维',
  '私域流量', '公域转化', '用户心智', '场景化', '垂直领域',
  '降本增效', '精益管理', '敏捷开发', '快速迭代', 'MVP验证',
  '结果导向', '过程管理', '数据驱动', '流量变现', '商业逻辑',
  '老子不干了', '毁灭吧赶紧', '世界毁灭吧', '地球爆炸吧',
  '只要干不死', '就往死里干', '辛苦我一个', '幸福我老板',
  '我是牛马', '纯纯大冤种', '韭菜的自觉', '社畜本畜',
  '打工而已别当真', '钱难挣屎难吃', '为爱发电', '发不动了',
  '没有加班费', '也没有调休', '更没有未来', '但有老板画的饼',
  '他娘的', '我擦', '我滴个神', '蛋疼', '日了狗了',
  'Deadline是第一生产力', '明天就要', '昨天怎么不交', '时间呢',
  '进度怎么样', ' blocker是什么', '风险在哪', '预案有吗',
  '排期太紧', '人手不够', '资源不足', '但还是要做',
  '工资不够看病', '体检不敢看', '头发一大把', '熬夜成常态',
  '咖啡续命', '奶茶压惊', '零食解压', '加班长胖',
  '一帮二货', '忍气吞声', '一片大好',
  '35岁危机', '毕业即失业', '内卷之王', '卷不动了',
  '精神状态良好', '查询精神状态', '已黑化', '别来沾边',
  '莫挨老子', '退退退', '栓Q', '芭比Q了', '绝绝子',
  '我真的会谢', '无语子', '离离原上谱', '大无语事件',
  '破防了', '蚌埠住了', '笑死根本笑不死', '哭死根本哭不完',
  '我尼玛', '妈的绝了', '草', '佛了', '麻了',
  '已读不回', '收到明白', '马上就好', '稍等一下',
  '在做了', '新建文件夹', '还在评估', '技术调研',
  '没有排期', '排满了', '等反馈', '等评审', '等上线',
  '这个需求很简单', '怎么实现我不管', '明天能上线吧'
];

// 上岸模式祝福文案（原版精确值）
const successTexts = [
  '金榜题名', '蟾宫折桂', '独占鳌头', '一举夺魁', '旗开得胜',
  '马到成功', '功成名就', '前程似锦', '鹏程万里', '飞黄腾达',
  '鱼跃龙门', '水到渠成', '梦想成真', '不负韶华', '未来可期',
  '考神附体', '锦鲤保佑', '逢考必过', '蒙的全对', '做的全会',
  '超常发挥', '稳了稳了', '拿捏住了', '这波不亏', '冲鸭冲鸭',
  '奥利给', '相信自己', '你可以的', '问题不大', '必上岸',
  '功不唐捐', '玉汝于成', '行而不辍', '天道酬勤', '厚积薄发',
  '星光不负赶路人', '越努力越幸运', '坚持就是胜利', '黎明前的黑暗',
  '每一秒都算数', '今天的苦明天的甜', '我在岸上等你', '山顶见',
  '上岸上岸', '一战成硕', '此战必胜', '得偿所愿', '苦尽甘来',
  '春风得意', '乘风破浪', '直挂云帆', '星辰大海', '顶峰相见',
  '各自努力高处见', '我们都有光明的未来', '愿所有努力都不被辜负',
  '乾坤未定你我皆是黑马', '卷王驾到通通闪开', '这波我在大气层',
  '直接拿下', '杀疯了', '绝绝子', 'yyds', '神仙运气',
  '接好运', '沾沾喜气', '欧气满满', '秒了', '赢麻了',
  '脑子借我用用', '分从四面八方来', '考的都会蒙的都对',
  '这题我会', '稳如老狗', '淡定的一批', '胸有成竹',
  '下笔如有神', '文曲星下凡', '智慧大门已开启',
  '我能行', '我最棒', '加油加油', '再坚持一下', '黎明就在眼前',
  '我是最靓的仔', '天生我材必有用', '我命由我不由天',
  '今日披星戴月', '明朝轻舟已过万重山'
];

// 庆祝语文案（原版精确值）
export const celebrationTexts = [
  'Real human confirmed',
  'Certified galaxy brain',
  'Quantum locked',
  'Actually genius',
  'Adulting level: Expert',
  'Deadlines denied',
  'Task, I am your father',
  'Absolute madman',
  'Clutched',
  'Terminated',
  'You are literally Him right now',
  'Task was cooked',
  'This is literally cinema',
  'Literally 1984',
  '遥遥领先',
  '这下有了',
  '秒了',
  '任务绝育完成',
  '难他天',
  '这就开摆',
  '芜湖起飞',
  '有手就行',
  '下一位',
  '抬走',
  '盖了帽了',
  '任务发配宁古塔',
  '功德+1',
  'Certified Real One'
];

// 80 色高级配色库（原版精确值）
export const luxuryColors = [
  '#81D8D0', '#7EDDD6', '#96E5DE', '#5ED4CA', '#40C4B8',
  '#2ABFB3', '#4DD0C4', '#6FDCD2', '#8FE4DC', '#AFECE6',
  '#F7E7CE', '#EDDCC6', '#E8D4B8', '#F0E2C4', '#E5D4A8',
  '#D4AF37', '#C9A961', '#E8C4A8', '#D4A574', '#E6C995',
  '#F4C2C2', '#E8B4B4', '#F0C8C8', '#D4A0A0', '#E8A090',
  '#50C878', '#60D488', '#40BC68', '#30A858', '#20A040',
  '#70E098', '#80E8A8', '#4DD888', '#38C470', '#28B060',
  '#E6E6FA', '#D8D4F0', '#C8C0E8', '#B8ACE0', '#A898D8',
  '#9370DB', '#8A6BE0', '#9B7CF0', '#AC8DF8', '#7B68EE',
  '#FFBF00', '#FFC810', '#FFD020', '#FFD838', '#FFE048',
  '#FFB347', '#FFA858', '#FF9B40', '#FF8C28', '#FF7D10',
  '#FF7F50', '#FF8E68', '#FF9D80', '#FFAC98', '#FFBBB0',
  '#FF6B6B', '#FF7D7D', '#FF8F8F', '#FFA1A1', '#FFB3B3',
  '#4A5568', '#5A6A7A', '#6A7E8C', '#7A929E', '#8AA6B0',
  '#3D5A80', '#4E6D90', '#5F80A0', '#7093B0', '#81A6C0',
  '#800020', '#901030', '#A02040', '#B03050', '#C04060',
  '#9B2335', '#AC3446', '#BD4557', '#CE5668', '#DF6779'
];

export default function ThemeEffects() {
  const { theme, effectsEnabled } = useTaskStore();
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    // 清理函数
    const cleanup = () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      intervalsRef.current.forEach(clearInterval);
      intervalsRef.current = [];
      cancelAnimationFrame(rafRef.current);
      removeAnimations();
    };

    cleanup();

    if (!effectsEnabled || document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return cleanup;
    }

    switch (theme) {
      case 'starry':
        createStars();
        createMeteors();
        createAurora();
        break;
      case 'rage':
        createRageText();
        break;
      case 'success':
        createSuccessText();
        break;
    }

    return cleanup;
  }, [theme, effectsEnabled]);

  function removeAnimations() {
    const selectors = [
      '.star', '.meteor', '.aurora',
      '.rage-text', '.success-text',
    ];
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => el.remove());
    });
  }

  function createStars() {
    for (let i = 0; i < 24; i++) {
      const timer = setTimeout(() => {
        if (document.querySelectorAll('.star').length >= 24) return;
        const star = document.createElement('div');
        star.className = 'star';
        star.style.cssText = `
          left: ${Math.random() * 100}%;
          top: ${Math.random() * 100}%;
          width: ${Math.random() * 3 + 1}px;
          height: ${Math.random() * 3 + 1}px;
          animation-delay: ${Math.random() * 3}s;
          animation-duration: ${Math.random() * 2 + 1}s;
        `;
        document.body.appendChild(star);
      }, i * 50);
      timersRef.current.push(timer);
    }
  }

  function createMeteors() {
    function spawnMeteor() {
      if (document.hidden) return;
      const meteor = document.createElement('div');
      meteor.className = 'meteor';
      meteor.style.cssText = `
        left: ${Math.random() * 50}%;
        top: ${Math.random() * 30}%;
        animation-delay: ${Math.random() * 2}s;
      `;
      document.body.appendChild(meteor);
      setTimeout(() => meteor.remove(), 3000);
      const timer = setTimeout(spawnMeteor, Math.random() * 12000 + 12000);
      timersRef.current.push(timer);
    }
    const timer = setTimeout(spawnMeteor, 6000);
    timersRef.current.push(timer);
  }

  function createAurora() {
    if (document.querySelector('.aurora')) return;
    const aurora = document.createElement('div');
    aurora.className = 'aurora';
    for (let i = 0; i < 3; i++) {
      const layer = document.createElement('div');
      layer.className = 'aurora-layer';
      aurora.appendChild(layer);
    }
    const shimmer = document.createElement('div');
    shimmer.className = 'aurora-shimmer';
    aurora.appendChild(shimmer);
    document.body.appendChild(aurora);
  }

  function createRageText() {
    function spawnText() {
      const text = document.createElement('div');
      text.className = 'rage-text';
      text.textContent = rageTexts[Math.floor(Math.random() * rageTexts.length)];

      const fontSize = Math.random() * 24 + 28;
      const opacity = Math.random() * 0.25 + 0.35;
      const rotate = (Math.random() - 0.5) * 40;
      const leftPos = Math.random() * 120 - 10;

      text.style.cssText = `
        position: fixed;
        font-size: ${fontSize}px;
        font-weight: bold;
        color: rgba(220, 38, 38, ${opacity});
        white-space: nowrap;
        pointer-events: none;
        z-index: 10000;
        left: ${leftPos}%;
        top: -80px;
        transform: rotate(${rotate}deg);
      `;

      document.body.appendChild(text);

      const screenHeight = window.innerHeight;
      const touchY = screenHeight + 50 - Math.random() * 150;
      const tTouch = 0.40;
      const tFadeStart = 0.50;
      const tFadeEnd = 1.00;
      const finalScale = 1.05 + Math.random() * 0.35;
      const totalDuration = Math.random() * 4 + 12;

      text.animate([
        { transform: `translate(0px, 0px) rotate(${rotate}deg) scale(1)`, opacity: 0, offset: 0 },
        { opacity: opacity, offset: 0.02 },
        { transform: `translate(0px, ${touchY}px) rotate(${rotate}deg) scale(1)`, opacity: opacity, offset: tTouch, easing: 'ease-in' },
        { transform: `translate(0px, ${touchY}px) rotate(${rotate}deg) scale(1)`, opacity: opacity, offset: tFadeStart },
        { transform: `translate(0px, ${touchY}px) rotate(${rotate}deg) scale(${finalScale})`, opacity: 0, offset: tFadeEnd, easing: 'ease-out' }
      ], {
        duration: totalDuration * 1000,
        easing: 'cubic-bezier(0.45, 0, 0.55, 1)',
        fill: 'forwards'
      }).onfinish = () => {
        if (text.parentNode) text.remove();
      };
    }

    const interval = setInterval(() => {
      spawnText();
      if (Math.random() > 0.2) {
        const timer = setTimeout(spawnText, 50);
        timersRef.current.push(timer);
      }
    }, 174);
    intervalsRef.current.push(interval);

    for (let i = 0; i < 17; i++) {
      const timer = setTimeout(spawnText, i * 130);
      timersRef.current.push(timer);
    }
  }

  function createSuccessText() {
    function spawnText() {
      const text = document.createElement('div');
      text.className = 'success-text';
      text.textContent = successTexts[Math.floor(Math.random() * successTexts.length)];

      const fontSize = Math.random() * 24 + 28;
      const opacity = Math.random() * 0.15 + 0.65;
      const rotate = (Math.random() - 0.5) * 40;
      const leftPos = Math.random() * 120 - 10;

      text.style.cssText = `
        position: fixed;
        font-size: ${fontSize}px;
        font-weight: bold;
        color: rgba(255, 200, 80, ${opacity});
        text-shadow: 0 0 8px rgba(255, 180, 60, 0.5), 0 0 16px rgba(220, 150, 40, 0.3);
        white-space: nowrap;
        pointer-events: none;
        z-index: 10000;
        left: ${leftPos}%;
        top: -80px;
        transform: rotate(${rotate}deg);
      `;

      document.body.appendChild(text);

      const screenHeight = window.innerHeight;
      const touchY = screenHeight + 50 - Math.random() * 150;
      const tTouch = 0.40;
      const tFadeStart = 0.50;
      const tFadeEnd = 1.00;
      const finalScale = 1.05 + Math.random() * 0.35;

      text.animate([
        { transform: `translate3d(0px, 0px, 0) rotate(${rotate}deg) scale(1)`, opacity: 0, offset: 0 },
        { opacity: opacity, offset: 0.02 },
        { transform: `translate3d(0px, ${touchY}px, 0) rotate(${rotate}deg) scale(1)`, opacity: opacity, offset: tTouch, easing: 'ease-in' },
        { transform: `translate3d(0px, ${touchY}px, 0) rotate(${rotate}deg) scale(1)`, opacity: opacity, offset: tFadeStart },
        { transform: `translate3d(0px, ${touchY}px, 0) rotate(${rotate}deg) scale(${finalScale})`, opacity: 0, offset: tFadeEnd, easing: 'ease-out' }
      ], {
        duration: (Math.random() * 3 + 6) * 1000,
        easing: 'cubic-bezier(0.45, 0, 0.55, 1)',
        fill: 'forwards'
      }).onfinish = () => {
        if (text.parentNode) text.remove();
      };
    }

    const interval = setInterval(() => {
      spawnText();
      if (Math.random() > 0.2) {
        const timer = setTimeout(spawnText, 50);
        timersRef.current.push(timer);
      }
    }, 200);
    intervalsRef.current.push(interval);

    for (let i = 0; i < 12; i++) {
      const timer = setTimeout(spawnText, i * 130);
      timersRef.current.push(timer);
    }
  }

  // 锦鲤静态背景 - 与动效开关无关，仅随主题切换
  useEffect(() => {
    if (theme !== 'success') return;

    const koiPath1 = 'M6684 11345 c-8 -19 -21 -35 -29 -35 -17 0 -20 -16 -5 -25 30 -18 -20 -45 -83 -45 -24 0 -51 -6 -62 -13 -11 -7 -55 -28 -97 -46 -45 -20 -78 -40 -78 -48 0 -8 5 -35 12 -60 10 -43 10 -48 -10 -64 -12 -9 -22 -22 -22 -27 0 -6 -12 -20 -26 -31 -29 -23 -78 -27 -130 -12 -27 8 -35 5 -56 -18 -13 -14 -45 -38 -71 -53 l-47 -28 20 -20 c24 -24 25 -32 3 -59 -14 -16 -36 -23 -103 -30 -128 -14 -363 -84 -630 -188 -209 -81 -623 -310 -775 -428 -38 -30 -102 -78 -141 -107 -164 -121 -385 -329 -649 -609 -83 -88 -96 -98 -165 -123 -206 -77 -350 -219 -479 -470 -26 -52 -69 -121 -94 -154 -71 -91 -104 -181 -134 -357 -6 -38 -50 -154 -64 -172 -6 -7 -22 -13 -35 -13 -13 0 -49 -7 -81 -15 -176 -46 -334 8 -504 173 l-96 92 -33 -27 c-87 -74 -91 -80 -80 -109 6 -15 22 -40 35 -56 14 -16 25 -33 25 -38 0 -12 -50 -50 -66 -50 -7 0 -61 25 -121 55 -126 65 -142 65 -237 7 -50 -31 -68 -37 -115 -37 -31 1 -71 5 -88 9 -43 11 -42 1 3 -58 119 -156 438 -303 739 -342 236 -30 418 -21 576 29 110 35 194 84 317 184 29 24 95 64 145 90 50 25 106 56 123 69 50 38 115 129 190 263 79 142 139 214 175 209 64 -9 43 -140 -43 -266 -29 -42 -85 -116 -125 -165 -59 -70 -72 -91 -64 -105 19 -36 50 -55 98 -57 26 -1 51 -3 56 -4 4 0 7 -24 7 -51 0 -54 -28 -122 -73 -176 -65 -80 -91 -131 -118 -233 -37 -139 -37 -149 9 -193 49 -48 84 -60 148 -52 49 6 53 4 69 -20 26 -40 15 -125 -29 -225 -37 -84 -44 -136 -25 -173 13 -24 67 -48 108 -48 44 0 61 -23 61 -82 0 -40 -7 -62 -36 -109 -63 -104 -93 -233 -65 -278 12 -19 23 -10 98 87 37 48 108 132 158 187 50 55 108 123 130 150 21 28 44 55 50 60 30 27 100 156 168 305 33 74 93 250 111 330 43 184 52 442 26 725 -15 165 -17 229 -9 300 5 50 12 131 16 180 6 90 6 90 52 140 254 275 446 409 710 497 131 44 274 48 439 13 62 -14 121 -29 132 -35 33 -17 142 -49 193 -56 27 -4 61 -17 75 -29 15 -12 47 -34 73 -48 27 -16 54 -42 68 -67 12 -22 30 -44 39 -49 10 -5 63 -11 118 -13 103 -5 161 -24 172 -57 4 -11 -19 -13 -126 -9 -72 2 -129 1 -128 -2 2 -3 11 -23 20 -45 55 -129 70 -148 174 -210 l67 -40 3 -53 c3 -57 -6 -51 107 -72 160 -30 178 -48 45 -45 l-90 3 -50 -41 c-28 -22 -50 -43 -50 -47 0 -7 160 -36 277 -51 135 -16 230 -56 268 -110 11 -15 42 -61 70 -101 27 -40 61 -87 75 -104 14 -17 43 -55 65 -84 65 -86 126 -152 177 -194 34 -28 44 -42 36 -48 -22 -13 -167 -9 -230 7 -33 9 -85 15 -116 13 -56 -3 -57 -4 -58 -33 -1 -51 -3 -54 -45 -66 -32 -10 -39 -16 -35 -31 3 -12 -6 -32 -23 -51 -41 -46 -77 -120 -61 -125 18 -6 79 -62 90 -83 15 -28 2 -47 -43 -62 -27 -9 -43 -21 -45 -33 -2 -10 -21 -37 -42 -59 -46 -49 -60 -75 -60 -113 0 -16 -9 -41 -21 -56 l-20 -26 28 -11 c36 -13 113 -88 113 -109 0 -9 -7 -25 -15 -36 -21 -28 -18 -44 9 -44 33 0 37 -10 27 -63 -6 -36 -4 -53 10 -84 10 -21 18 -48 19 -60 0 -19 6 -23 33 -23 65 0 65 -34 -3 -140 -27 -42 -29 -50 -25 -130 l3 -85 34 3 c29 2 184 -31 196 -42 2 -3 -1 -21 -8 -41 -15 -47 -8 -70 19 -55 28 14 28 15 34 -36 5 -50 34 -97 61 -102 25 -5 48 19 125 132 153 226 313 534 367 706 37 118 69 229 85 290 30 121 55 193 86 250 19 36 39 69 43 74 5 5 40 -14 82 -46 138 -105 294 -169 498 -203 52 -9 96 -18 97 -19 2 -1 13 -22 26 -47 71 -135 335 -209 515 -144 84 30 92 31 134 5 23 -14 51 -20 91 -20 38 0 71 -7 97 -20 22 -11 60 -23 85 -27 25 -3 45 -7 45 -8 0 -2 -15 -26 -32 -53 -18 -28 -42 -66 -53 -84 -21 -34 -77 -62 -147 -73 -62 -10 -43 -25 30 -25 80 0 157 20 227 60 32 18 82 34 139 44 84 15 106 24 182 80 8 6 27 5 53 -4 57 -19 150 -8 204 23 87 51 159 150 202 278 14 41 39 93 56 116 41 58 66 118 83 199 55 265 33 386 -81 440 l-54 25 7 47 c4 30 0 69 -10 108 -25 97 -21 149 17 229 34 72 62 163 53 173 -3 3 -28 -16 -56 -42 -28 -26 -66 -54 -84 -61 -18 -8 -53 -37 -78 -66 l-44 -51 -26 39 c-20 31 -43 47 -100 72 -60 27 -79 41 -104 79 -48 71 -89 149 -124 232 -17 41 -35 84 -40 95 -6 11 -17 40 -25 65 -38 110 -180 336 -242 386 -21 17 -88 59 -148 93 -107 60 -149 94 -142 114 6 19 102 48 306 92 283 62 388 92 526 150 116 49 284 185 533 430 96 93 206 192 245 220 39 28 71 55 71 60 1 6 -34 12 -77 15 -91 6 -112 22 -103 78 4 28 2 32 -18 32 -12 0 -35 13 -51 30 -38 40 -85 55 -128 41 -19 -7 -42 -9 -51 -5 -11 4 -24 -1 -37 -15 -28 -30 -43 -27 -93 19 -24 22 -47 40 -51 40 -5 0 -19 10 -32 22 -21 19 -24 20 -40 6 -10 -9 -36 -23 -57 -32 -22 -9 -63 -41 -91 -71 -45 -49 -55 -55 -91 -55 -62 0 -79 18 -79 84 0 58 -3 64 -23 44 -9 -9 -21 -9 -50 0 -60 18 -91 15 -160 -18 -66 -31 -97 -37 -107 -20 -4 6 -14 4 -28 -5 -20 -13 -30 -12 -80 1 -56 14 -60 14 -104 -8 -26 -13 -65 -40 -87 -61 -27 -25 -45 -35 -58 -31 -13 4 -21 -2 -30 -23 -7 -15 -14 -30 -16 -33 -2 -3 -41 -5 -86 -5 -59 0 -88 -4 -101 -15 -10 -8 -26 -14 -37 -12 -14 3 -18 -3 -18 -27 0 -40 -49 -88 -98 -96 -61 -11 -62 -11 -63 -67 -3 -108 10 -266 28 -336 8 -35 12 -66 9 -69 -3 -4 -38 26 -77 66 -100 101 -240 211 -339 265 -115 64 -184 109 -285 187 -136 104 -447 278 -628 350 -131 51 -193 101 -232 187 -78 169 -123 232 -233 327 -43 36 -88 76 -102 88 -14 12 -52 43 -85 69 -33 25 -73 60 -89 77 -17 17 -34 31 -38 31 -5 0 -16 -16 -24 -35z';
    const koiPath2 = 'M5504 6875 c-106 -113 -385 -607 -429 -760 -10 -33 -26 -82 -35 -110 -10 -27 -30 -93 -44 -145 -66 -240 -79 -278 -111 -337 -20 -34 -39 -64 -43 -67 -5 -3 -33 14 -63 37 -150 117 -283 171 -538 219 -55 10 -66 15 -80 41 -58 108 -198 180 -371 192 -61 4 -84 0 -157 -25 l-86 -30 -53 26 c-44 21 -62 25 -98 20 -35 -6 -51 -3 -77 13 -19 11 -57 26 -86 32 -52 12 -64 21 -43 34 6 4 24 33 40 65 36 72 66 96 138 111 84 17 94 26 40 34 -77 12 -185 -14 -261 -62 -25 -16 -70 -30 -121 -38 -100 -17 -110 -20 -169 -62 -47 -33 -48 -33 -79 -17 -40 21 -127 14 -191 -14 -88 -39 -175 -153 -218 -284 -12 -35 -39 -89 -60 -121 -52 -75 -64 -110 -90 -247 -26 -143 -23 -234 12 -305 20 -41 34 -55 78 -77 l54 -28 -2 -63 c-1 -34 3 -75 9 -91 5 -15 11 -56 11 -91 1 -54 -5 -77 -39 -152 -40 -88 -56 -145 -45 -157 3 -3 27 14 54 39 26 24 62 50 81 58 19 8 56 39 82 68 32 35 50 49 53 41 3 -8 18 -28 34 -46 25 -29 55 -46 135 -76 45 -18 126 -161 219 -390 70 -174 150 -319 223 -407 39 -47 119 -102 217 -152 33 -16 73 -44 90 -61 52 -54 44 -58 -421 -160 -425 -93 -534 -158 -956 -569 -82 -80 -181 -168 -219 -194 -38 -27 -69 -53 -69 -58 0 -5 27 -9 60 -9 35 0 74 -7 90 -15 27 -14 30 -21 30 -61 0 -41 2 -46 19 -41 13 3 30 -6 52 -29 39 -40 89 -57 127 -43 14 6 36 8 48 5 14 -4 28 1 39 14 26 29 48 25 94 -18 22 -20 55 -46 74 -58 33 -20 34 -20 56 -2 13 10 32 18 43 18 11 0 43 24 71 53 29 30 62 59 74 65 24 13 82 16 99 4 23 -15 36 -55 30 -93 -6 -38 -6 -39 19 -27 19 8 31 8 50 0 43 -20 95 -14 168 20 57 26 72 30 88 20 15 -9 23 -9 38 0 15 9 32 9 75 -1 31 -7 66 -9 78 -5 29 9 100 57 133 90 17 17 32 23 44 19 14 -4 21 1 29 25 l11 31 80 -2 c61 -1 87 3 107 16 14 9 32 14 40 11 10 -4 14 3 14 22 1 50 61 102 118 102 26 0 35 5 43 28 15 36 4 287 -16 367 -8 33 -14 63 -15 68 -1 21 29 0 84 -60 68 -75 231 -208 303 -249 133 -74 227 -135 319 -204 152 -116 428 -271 634 -356 97 -40 123 -56 168 -101 28 -30 52 -60 52 -67 0 -27 90 -192 132 -243 44 -52 97 -100 229 -208 41 -33 98 -82 127 -110 51 -47 54 -49 68 -30 8 10 14 24 14 31 0 7 9 16 20 19 15 5 19 12 14 31 -5 19 -1 26 21 34 14 5 45 10 68 10 24 0 51 6 62 13 11 7 52 26 90 42 39 15 73 31 76 34 4 3 1 32 -6 64 -10 52 -10 59 8 75 11 9 23 27 28 39 12 32 79 48 136 32 41 -11 45 -10 59 10 9 12 34 31 56 44 84 46 80 41 58 60 -21 18 -25 43 -12 65 5 6 44 16 88 22 110 14 118 16 309 72 294 86 527 187 830 361 148 84 228 136 310 200 28 21 82 62 121 90 169 124 247 198 683 645 34 34 68 62 76 62 9 0 23 4 33 9 9 5 61 30 114 55 77 37 113 61 171 119 77 75 158 192 222 318 20 40 57 101 82 134 64 84 99 164 123 280 42 199 71 265 117 265 16 0 50 7 76 15 102 31 219 18 332 -35 64 -31 100 -58 180 -135 54 -54 101 -92 103 -86 2 6 24 25 48 41 72 50 78 80 28 140 -31 36 -28 60 10 79 27 13 35 10 143 -44 129 -64 146 -66 224 -17 62 39 103 52 170 52 32 0 60 4 63 9 9 14 -68 95 -142 149 -78 58 -246 137 -382 180 -178 56 -496 81 -675 53 -155 -25 -318 -101 -440 -206 -30 -25 -93 -65 -142 -89 -48 -24 -107 -58 -131 -75 -58 -43 -126 -132 -197 -262 -93 -169 -156 -237 -190 -209 -43 35 -23 141 47 247 53 81 150 204 187 237 48 43 3 98 -87 106 l-57 5 -3 52 c-4 62 9 90 84 188 29 39 62 90 73 115 29 66 73 238 66 260 -3 11 -25 34 -48 52 -38 30 -47 33 -115 34 -61 0 -77 4 -88 19 -33 45 -25 119 27 230 27 60 43 128 36 157 -8 30 -59 58 -106 58 -40 0 -67 28 -76 79 -6 36 -2 50 40 127 49 89 75 165 75 221 0 36 -9 63 -20 63 -5 0 -43 -44 -86 -97 -43 -54 -119 -143 -169 -198 -50 -55 -111 -125 -135 -155 -25 -30 -52 -63 -61 -73 -14 -15 -36 -55 -110 -197 -72 -138 -156 -395 -174 -530 -17 -131 -17 -412 0 -611 16 -181 17 -219 5 -310 -7 -57 -15 -138 -17 -179 -4 -69 -7 -78 -36 -106 -18 -17 -59 -62 -92 -100 -65 -75 -143 -145 -239 -212 -33 -24 -68 -50 -76 -57 -37 -32 -225 -117 -330 -150 -195 -59 -316 -50 -630 50 -58 19 -122 36 -143 40 -21 3 -46 14 -56 24 -10 10 -37 29 -61 42 -25 13 -54 40 -66 59 -43 67 -44 67 -160 75 -75 5 -121 13 -146 26 -73 37 -42 51 92 44 51 -2 101 -7 111 -10 23 -8 23 -4 4 41 -8 19 -14 37 -14 39 -1 3 -12 27 -25 54 -28 54 -65 89 -143 133 -60 34 -73 52 -73 102 0 19 -4 38 -10 41 -5 3 -47 12 -92 19 -101 17 -145 33 -131 47 6 6 19 6 34 1 13 -5 51 -7 83 -4 50 4 68 11 113 46 l53 41 -52 12 c-52 12 -163 29 -245 38 -22 2 -77 16 -122 31 -91 30 -109 47 -216 202 -120 177 -227 304 -310 370 -33 26 -37 33 -25 42 22 14 137 12 198 -4 29 -8 82 -18 118 -21 78 -9 95 1 87 50 -5 31 -2 36 23 46 51 20 59 26 56 44 -2 10 7 29 21 44 13 14 35 47 50 73 l25 47 -34 21 c-41 26 -77 74 -72 97 2 10 22 24 48 33 29 10 46 22 49 35 2 11 21 39 42 63 43 46 59 79 59 119 0 15 8 35 18 46 12 14 13 21 5 24 -7 2 -35 22 -63 45 -58 46 -70 78 -46 119 l17 29 -31 6 -31 7 7 57 c5 44 2 66 -10 91 -9 17 -16 40 -16 51 0 10 -8 19 -17 20 -10 0 -24 2 -30 2 -7 1 -19 8 -28 17 -14 14 -14 19 1 54 9 21 28 54 42 74 27 34 29 50 23 151 -1 14 0 34 1 45 2 14 -2 19 -12 16 -31 -7 -67 -3 -140 16 -82 21 -85 26 -65 97 8 28 7 29 -24 23 -30 -6 -31 -6 -31 32 0 43 -35 104 -63 109 -11 2 -32 -11 -53 -33z';

    const koiContainer = document.createElement('div');
    koiContainer.className = 'koi-fish';

    const paths = [koiPath1, koiPath2];
    const count = 32;

    // 用确定性种子生成伪随机，每次渲染一致
    const seed = (i: number) => {
      const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
      return x - Math.floor(x);
    };

    for (let i = 0; i < count; i++) {
      const r1 = seed(i);
      const r2 = seed(i + count);
      const r3 = seed(i + count * 2);
      const r4 = seed(i + count * 3);
      const r5 = seed(i + count * 4);

      const left = r1 * 110 - 5;        // -5% ~ 105%
      const top = r2 * 110 - 5;         // -5% ~ 105%
      const size = 90 + r3 * 140;       // 90px ~ 230px
      const rotation = (r4 - 0.5) * 90; // -45° ~ 45°
      const opacity = 0.06 + r5 * 0.10; // 0.06 ~ 0.16
      const mirrored = r5 > 0.5;
      const path = paths[i % 2];

      const wrapper = document.createElement('div');
      wrapper.style.cssText = `
        position: absolute;
        left: ${left}%;
        top: ${top}%;
        transform: rotate(${rotation.toFixed(1)}deg);
        opacity: ${opacity.toFixed(3)};
        pointer-events: none;
      `;

      wrapper.innerHTML = `
        <svg width="${size}" height="${size}" viewBox="0 0 1280 1280" preserveAspectRatio="xMidYMid meet">
          <g transform="translate(${mirrored ? '1280,1280' : '0,1280'}) scale(${mirrored ? '-0.10,-0.10' : '0.10,-0.10'})" fill="#F5DEB3">
            <path d="${path}"/>
          </g>
        </svg>
      `;

      koiContainer.appendChild(wrapper);
    }

    // 左上角两条固定锦鲤
    const cornerKoi = [
      { left: 3, top: 2, size: 200, rotation: -15, path: koiPath1, mirrored: false },
      { left: 10, top: 12, size: 120, rotation: 20, path: koiPath2, mirrored: true },
    ];
    cornerKoi.forEach((cfg) => {
      const wrapper = document.createElement('div');
      wrapper.style.cssText = `
        position: absolute;
        left: ${cfg.left}%;
        top: ${cfg.top}%;
        transform: rotate(${cfg.rotation}deg);
        opacity: 0.12;
        pointer-events: none;
      `;
      wrapper.innerHTML = `
        <svg width="${cfg.size}" height="${cfg.size}" viewBox="0 0 1280 1280" preserveAspectRatio="xMidYMid meet">
          <g transform="translate(${cfg.mirrored ? '1280,1280' : '0,1280'}) scale(${cfg.mirrored ? '-0.10,-0.10' : '0.10,-0.10'})" fill="#F5DEB3">
            <path d="${cfg.path}"/>
          </g>
        </svg>
      `;
      koiContainer.appendChild(wrapper);
    });

    document.body.appendChild(koiContainer);

    return () => {
      document.querySelectorAll('.koi-fish').forEach(el => el.remove());
    };
  }, [theme]);

  return null;
}
