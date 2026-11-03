export const PRESET_NICKNAMES = [
  '摸鱼锦标赛冠军',
  '野生生产力专家',
  'DDL 驯兽师',
  '已读不回艺术家',
  '今天也不想上班',
  '带薪发呆种子选手',
  '任务消灭小能手',
  '人间清醒工具人',
  '改需求就哭',
  '下班倒计时管理员',
];

function avatarSVG(monogram: string, bg: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" rx="50" fill="${bg}"/><circle cx="50" cy="50" r="34" fill="none" stroke="rgba(255,255,255,.28)"/><text x="50" y="62" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="32" font-weight="600" fill="#fff">${monogram}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const PRESET_AVATARS = [
  avatarSVG('A', '#4f6f82'),
  avatarSVG('N', '#9a7047'),
  avatarSVG('R', '#49735f'),
  avatarSVG('S', '#9b4c45'),
  avatarSVG('V', '#596a73'),
];

export function randomPresetNickname(): string {
  return PRESET_NICKNAMES[Math.floor(Math.random() * PRESET_NICKNAMES.length)];
}

export function randomPresetAvatar(): string {
  return PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)];
}
