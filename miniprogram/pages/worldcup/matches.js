// 2026 世界杯赛程数据（北京时间 UTC+8）
// 48 队 12 组，每组 4 队
// 小组赛每组 6 场，共 72 场
// 淘汰赛 32 场（32 强 → 决赛）

// 小组赛：每组打 3 轮
// 第1轮：1vs2, 3vs4
// 第2轮：1vs3, 2vs4
// 第3轮：1vs4, 2vs3

const groups = {
  A: [
    { code: 'MEX', name: '墨西哥', flag: '🇲🇽' },
    { code: 'RSA', name: '南非', flag: '🇿🇦' },
    { code: 'KOR', name: '韩国', flag: '🇰🇷' },
    { code: 'CZE', name: '捷克', flag: '🇨🇿' },
  ],
  B: [
    { code: 'CAN', name: '加拿大', flag: '🇨🇦' },
    { code: 'BIH', name: '波黑', flag: '🇧🇦' },
    { code: 'SUI', name: '瑞士', flag: '🇨🇭' },
    { code: 'QAT', name: '卡塔尔', flag: '🇶🇦' },
  ],
  C: [
    { code: 'BRA', name: '巴西', flag: '🇧🇷' },
    { code: 'MAR', name: '摩洛哥', flag: '🇲🇦' },
    { code: 'HAI', name: '海地', flag: '🇭🇹' },
    { code: 'SCO', name: '苏格兰', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  ],
  D: [
    { code: 'USA', name: '美国', flag: '🇺🇸' },
    { code: 'PAR', name: '巴拉圭', flag: '🇵🇾' },
    { code: 'TUR', name: '土耳其', flag: '🇹🇷' },
    { code: 'AUS', name: '澳大利亚', flag: '🇦🇺' },
  ],
  E: [
    { code: 'GER', name: '德国', flag: '🇩🇪' },
    { code: 'ECU', name: '厄瓜多尔', flag: '🇪🇨' },
    { code: 'CIV', name: '科特迪瓦', flag: '🇨🇮' },
    { code: 'CUW', name: '库拉索', flag: '🇨🇼' },
  ],
  F: [
    { code: 'NED', name: '荷兰', flag: '🇳🇱' },
    { code: 'JPN', name: '日本', flag: '🇯🇵' },
    { code: 'TUN', name: '突尼斯', flag: '🇹🇳' },
    { code: 'SWE', name: '瑞典', flag: '🇸🇪' },
  ],
  G: [
    { code: 'BEL', name: '比利时', flag: '🇧🇪' },
    { code: 'IRN', name: '伊朗', flag: '🇮🇷' },
    { code: 'EGY', name: '埃及', flag: '🇪🇬' },
    { code: 'NZL', name: '新西兰', flag: '🇳🇿' },
  ],
  H: [
    { code: 'ESP', name: '西班牙', flag: '🇪🇸' },
    { code: 'URU', name: '乌拉圭', flag: '🇺🇾' },
    { code: 'CPV', name: '佛得角', flag: '🇨🇻' },
    { code: 'KSA', name: '沙特', flag: '🇸🇦' },
  ],
  I: [
    { code: 'FRA', name: '法国', flag: '🇫🇷' },
    { code: 'SEN', name: '塞内加尔', flag: '🇸🇳' },
    { code: 'NOR', name: '挪威', flag: '🇳🇴' },
    { code: 'IRQ', name: '伊拉克', flag: '🇮🇶' },
  ],
  J: [
    { code: 'ARG', name: '阿根廷', flag: '🇦🇷' },
    { code: 'AUT', name: '奥地利', flag: '🇦🇹' },
    { code: 'ALG', name: '阿尔及利亚', flag: '🇩🇿' },
    { code: 'JOR', name: '约旦', flag: '🇯🇴' },
  ],
  K: [
    { code: 'POR', name: '葡萄牙', flag: '🇵🇹' },
    { code: 'COL', name: '哥伦比亚', flag: '🇨🇴' },
    { code: 'UZB', name: '乌兹别克斯坦', flag: '🇺🇿' },
    { code: 'COD', name: '刚果(金)', flag: '🇨🇩' },
  ],
  L: [
    { code: 'ENG', name: '英格兰', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    { code: 'CRO', name: '克罗地亚', flag: '🇭🇷' },
    { code: 'PAN', name: '巴拿马', flag: '🇵🇦' },
    { code: 'GHA', name: '加纳', flag: '🇬🇭' },
  ],
};

// 生成小组赛赛程
function generateGroupMatches() {
  const matches = [];
  let id = 1;
  const startDate = new Date('2026-06-11');

  // 北京时间场次（对应美东当地时间 12/15/18/21 点 → 北京 +12h）
  const bjSlot1 = ['00:00', '03:00', '06:00', '09:00'];
  const bjSlot2 = ['06:00', '09:00', '12:00', '15:00'];

  Object.keys(groups).forEach((g, gi) => {
    const t = groups[g];
    const si = gi % 4;
    // 第1轮：1vs2, 3vs4
    const d1 = new Date(startDate);
    d1.setDate(d1.getDate() + Math.floor(gi / 4)); // 每天4组
    matches.push({
      id: id++,
      date: formatDate(d1),
      time: bjSlot1[si],
      teamA: t[0],
      teamB: t[1],
      group: g,
      stage: 'group',
      round: 1,
      status: 'upcoming',
      scoreA: null,
      scoreB: null,
    });
    matches.push({
      id: id++,
      date: formatDate(d1),
      time: bjSlot2[si],
      teamA: t[2],
      teamB: t[3],
      group: g,
      stage: 'group',
      round: 1,
      status: 'upcoming',
      scoreA: null,
      scoreB: null,
    });

    // 第2轮：1vs3, 2vs4
    const d2 = new Date(d1);
    d2.setDate(d2.getDate() + 3);
    matches.push({
      id: id++,
      date: formatDate(d2),
      time: bjSlot1[si],
      teamA: t[0],
      teamB: t[2],
      group: g,
      stage: 'group',
      round: 2,
      status: 'upcoming',
      scoreA: null,
      scoreB: null,
    });
    matches.push({
      id: id++,
      date: formatDate(d2),
      time: bjSlot2[si],
      teamA: t[1],
      teamB: t[3],
      group: g,
      stage: 'group',
      round: 2,
      status: 'upcoming',
      scoreA: null,
      scoreB: null,
    });

    // 第3轮：1vs4, 2vs3
    const d3 = new Date(d1);
    d3.setDate(d3.getDate() + 6);
    matches.push({
      id: id++,
      date: formatDate(d3),
      time: bjSlot1[si],
      teamA: t[0],
      teamB: t[3],
      group: g,
      stage: 'group',
      round: 3,
      status: 'upcoming',
      scoreA: null,
      scoreB: null,
    });
    matches.push({
      id: id++,
      date: formatDate(d3),
      time: bjSlot2[si],
      teamA: t[1],
      teamB: t[2],
      group: g,
      stage: 'group',
      round: 3,
      status: 'upcoming',
      scoreA: null,
      scoreB: null,
    });
  });

  return matches;
}

// 淘汰赛赛程
const knockoutMatches = [
  // 32 强（北京时间）
  { id: 73, date: '2026-06-30', time: '00:00', teamA: { code: 'TBD', name: '待定', flag: '🏳️' }, teamB: { code: 'TBD', name: '待定', flag: '🏳️' }, stage: 'round32', status: 'upcoming', scoreA: null, scoreB: null },
  { id: 74, date: '2026-06-30', time: '04:00', teamA: { code: 'TBD', name: '待定', flag: '🏳️' }, teamB: { code: 'TBD', name: '待定', flag: '🏳️' }, stage: 'round32', status: 'upcoming', scoreA: null, scoreB: null },
  { id: 75, date: '2026-06-30', time: '08:00', teamA: { code: 'TBD', name: '待定', flag: '🏳️' }, teamB: { code: 'TBD', name: '待定', flag: '🏳️' }, stage: 'round32', status: 'upcoming', scoreA: null, scoreB: null },
  { id: 76, date: '2026-07-01', time: '00:00', teamA: { code: 'TBD', name: '待定', flag: '🏳️' }, teamB: { code: 'TBD', name: '待定', flag: '🏳️' }, stage: 'round32', status: 'upcoming', scoreA: null, scoreB: null },
  { id: 77, date: '2026-07-01', time: '04:00', teamA: { code: 'TBD', name: '待定', flag: '🏳️' }, teamB: { code: 'TBD', name: '待定', flag: '🏳️' }, stage: 'round32', status: 'upcoming', scoreA: null, scoreB: null },
  { id: 78, date: '2026-07-01', time: '08:00', teamA: { code: 'TBD', name: '待定', flag: '🏳️' }, teamB: { code: 'TBD', name: '待定', flag: '🏳️' }, stage: 'round32', status: 'upcoming', scoreA: null, scoreB: null },
  { id: 79, date: '2026-07-02', time: '00:00', teamA: { code: 'TBD', name: '待定', flag: '🏳️' }, teamB: { code: 'TBD', name: '待定', flag: '🏳️' }, stage: 'round32', status: 'upcoming', scoreA: null, scoreB: null },
  { id: 80, date: '2026-07-02', time: '04:00', teamA: { code: 'TBD', name: '待定', flag: '🏳️' }, teamB: { code: 'TBD', name: '待定', flag: '🏳️' }, stage: 'round32', status: 'upcoming', scoreA: null, scoreB: null },
  { id: 81, date: '2026-07-02', time: '08:00', teamA: { code: 'TBD', name: '待定', flag: '🏳️' }, teamB: { code: 'TBD', name: '待定', flag: '🏳️' }, stage: 'round32', status: 'upcoming', scoreA: null, scoreB: null },
  { id: 82, date: '2026-07-03', time: '00:00', teamA: { code: 'TBD', name: '待定', flag: '🏳️' }, teamB: { code: 'TBD', name: '待定', flag: '🏳️' }, stage: 'round32', status: 'upcoming', scoreA: null, scoreB: null },
  { id: 83, date: '2026-07-03', time: '04:00', teamA: { code: 'TBD', name: '待定', flag: '🏳️' }, teamB: { code: 'TBD', name: '待定', flag: '🏳️' }, stage: 'round32', status: 'upcoming', scoreA: null, scoreB: null },
  { id: 84, date: '2026-07-03', time: '08:00', teamA: { code: 'TBD', name: '待定', flag: '🏳️' }, teamB: { code: 'TBD', name: '待定', flag: '🏳️' }, stage: 'round32', status: 'upcoming', scoreA: null, scoreB: null },
  { id: 85, date: '2026-07-04', time: '00:00', teamA: { code: 'TBD', name: '待定', flag: '🏳️' }, teamB: { code: 'TBD', name: '待定', flag: '🏳️' }, stage: 'round32', status: 'upcoming', scoreA: null, scoreB: null },
  { id: 86, date: '2026-07-04', time: '04:00', teamA: { code: 'TBD', name: '待定', flag: '🏳️' }, teamB: { code: 'TBD', name: '待定', flag: '🏳️' }, stage: 'round32', status: 'upcoming', scoreA: null, scoreB: null },
  { id: 87, date: '2026-07-04', time: '08:00', teamA: { code: 'TBD', name: '待定', flag: '🏳️' }, teamB: { code: 'TBD', name: '待定', flag: '🏳️' }, stage: 'round32', status: 'upcoming', scoreA: null, scoreB: null },
  { id: 88, date: '2026-07-05', time: '00:00', teamA: { code: 'TBD', name: '待定', flag: '🏳️' }, teamB: { code: 'TBD', name: '待定', flag: '🏳️' }, stage: 'round32', status: 'upcoming', scoreA: null, scoreB: null },

  // 16 强（北京时间）
  { id: 89, date: '2026-07-05', time: '04:00', teamA: { code: 'TBD', name: '待定', flag: '🏳️' }, teamB: { code: 'TBD', name: '待定', flag: '🏳️' }, stage: 'round16', status: 'upcoming', scoreA: null, scoreB: null },
  { id: 90, date: '2026-07-05', time: '08:00', teamA: { code: 'TBD', name: '待定', flag: '🏳️' }, teamB: { code: 'TBD', name: '待定', flag: '🏳️' }, stage: 'round16', status: 'upcoming', scoreA: null, scoreB: null },
  { id: 91, date: '2026-07-06', time: '04:00', teamA: { code: 'TBD', name: '待定', flag: '🏳️' }, teamB: { code: 'TBD', name: '待定', flag: '🏳️' }, stage: 'round16', status: 'upcoming', scoreA: null, scoreB: null },
  { id: 92, date: '2026-07-06', time: '08:00', teamA: { code: 'TBD', name: '待定', flag: '🏳️' }, teamB: { code: 'TBD', name: '待定', flag: '🏳️' }, stage: 'round16', status: 'upcoming', scoreA: null, scoreB: null },
  { id: 93, date: '2026-07-07', time: '04:00', teamA: { code: 'TBD', name: '待定', flag: '🏳️' }, teamB: { code: 'TBD', name: '待定', flag: '🏳️' }, stage: 'round16', status: 'upcoming', scoreA: null, scoreB: null },
  { id: 94, date: '2026-07-07', time: '08:00', teamA: { code: 'TBD', name: '待定', flag: '🏳️' }, teamB: { code: 'TBD', name: '待定', flag: '🏳️' }, stage: 'round16', status: 'upcoming', scoreA: null, scoreB: null },
  { id: 95, date: '2026-07-08', time: '04:00', teamA: { code: 'TBD', name: '待定', flag: '🏳️' }, teamB: { code: 'TBD', name: '待定', flag: '🏳️' }, stage: 'round16', status: 'upcoming', scoreA: null, scoreB: null },
  { id: 96, date: '2026-07-08', time: '08:00', teamA: { code: 'TBD', name: '待定', flag: '🏳️' }, teamB: { code: 'TBD', name: '待定', flag: '🏳️' }, stage: 'round16', status: 'upcoming', scoreA: null, scoreB: null },

  // 1/4 决赛（北京时间）
  { id: 97, date: '2026-07-10', time: '04:00', teamA: { code: 'TBD', name: '待定', flag: '🏳️' }, teamB: { code: 'TBD', name: '待定', flag: '🏳️' }, stage: 'quarter', status: 'upcoming', scoreA: null, scoreB: null },
  { id: 98, date: '2026-07-10', time: '08:00', teamA: { code: 'TBD', name: '待定', flag: '🏳️' }, teamB: { code: 'TBD', name: '待定', flag: '🏳️' }, stage: 'quarter', status: 'upcoming', scoreA: null, scoreB: null },
  { id: 99, date: '2026-07-11', time: '04:00', teamA: { code: 'TBD', name: '待定', flag: '🏳️' }, teamB: { code: 'TBD', name: '待定', flag: '🏳️' }, stage: 'quarter', status: 'upcoming', scoreA: null, scoreB: null },
  { id: 100, date: '2026-07-11', time: '08:00', teamA: { code: 'TBD', name: '待定', flag: '🏳️' }, teamB: { code: 'TBD', name: '待定', flag: '🏳️' }, stage: 'quarter', status: 'upcoming', scoreA: null, scoreB: null },

  // 半决赛（北京时间）
  { id: 101, date: '2026-07-15', time: '06:00', teamA: { code: 'TBD', name: '待定', flag: '🏳️' }, teamB: { code: 'TBD', name: '待定', flag: '🏳️' }, stage: 'semi', status: 'upcoming', scoreA: null, scoreB: null },
  { id: 102, date: '2026-07-16', time: '06:00', teamA: { code: 'TBD', name: '待定', flag: '🏳️' }, teamB: { code: 'TBD', name: '待定', flag: '🏳️' }, stage: 'semi', status: 'upcoming', scoreA: null, scoreB: null },

  // 三四名（北京时间）
  { id: 103, date: '2026-07-19', time: '04:00', teamA: { code: 'TBD', name: '待定', flag: '🏳️' }, teamB: { code: 'TBD', name: '待定', flag: '🏳️' }, stage: 'third', status: 'upcoming', scoreA: null, scoreB: null },

  // 决赛（北京时间）
  { id: 104, date: '2026-07-20', time: '06:00', teamA: { code: 'TBD', name: '待定', flag: '🏳️' }, teamB: { code: 'TBD', name: '待定', flag: '🏳️' }, stage: 'final', status: 'upcoming', scoreA: null, scoreB: null },
];

const stageLabels = {
  group: '小组赛',
  round32: '32 强',
  round16: '16 强',
  quarter: '1/4 决赛',
  semi: '半决赛',
  third: '三四名决赛',
  final: '决赛',
};

const emotions = [
  { key: 'excited', label: '激动', emoji: '🔥' },
  { key: 'nervous', label: '紧张', emoji: '😰' },
  { key: 'disappointed', label: '失望', emoji: '😞' },
  { key: 'ecstatic', label: '狂喜', emoji: '🤩' },
  { key: 'calm', label: '平静', emoji: '😌' },
];

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const groupMatches = generateGroupMatches();
const allMatches = [...groupMatches, ...knockoutMatches];

module.exports = { groups, groupMatches, knockoutMatches, allMatches, stageLabels, emotions };
