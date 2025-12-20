
import { Player, Match, TrainingSession, Position, Team, PlayerStats, AttributeConfig, PlayerReview, User, Announcement, RolePermissions, FinanceCategoryDefinition } from './types';

// ... CHINA_GEO_DATA保持原样
export const CHINA_GEO_DATA: Record<string, Record<string, string[]>> = {
    "北京市": {
        "北京市": ["东城区", "西城区", "朝阳区", "丰台区", "石景山区", "海淀区", "门头沟区", "房山区", "通州区", "顺义区", "昌平区", "大兴区", "怀柔区", "平谷区", "密云区", "延庆区"]
    },
    "上海市": {
        "上海市": ["黄浦区", "徐汇区", "长宁区", "静安区", "普陀区", "虹口区", "杨浦区", "闵行区", "宝山区", "嘉定区", "浦东新区", "金山区", "松江区", "青浦区", "奉贤区", "崇明区"]
    },
    "广东省": {
        "广州市": ["荔湾区", "越秀区", "海珠区", "天河区", "白云区", "黄埔区", "番禺区", "花都区", "南沙区", "从化区", "增城区"],
        "深圳市": ["罗湖区", "福田区", "南山区", "宝安区", "龙岗区", "盐田区", "龙华区", "坪山区", "光明区"],
        "珠海市": ["香洲区", "斗门区", "金湾区"],
        "东莞市": ["东莞市"]
    },
    "浙江省": {
        "杭州市": ["上城区", "拱曙区", "西湖区", "滨江区", "萧山区", "余杭区", "福阳区", "临安区", "临平区", "钱塘区"],
        "宁波市": ["海曙区", "江北区", "北仑区", "镇海区", "鄞州区", "奉化区"],
        "温州市": ["鹿城区", "龙湾区", "瓯海区", "洞头区"]
    },
    "江苏省": {
        "南京市": ["玄武区", "秦淮区", "建邺区", "鼓楼区", "浦口区", "栖霞区", "雨花台区", "江宁区", "六合区", "溧水区", "高淳区"],
        "苏州市": ["虎丘区", "吴中区", "相城区", "姑苏区", "吴江区"]
    },
    "四川省": {
        "成都市": ["锦江区", "青羊区", "金牛区", "武侯区", "成华区", "龙泉驿区", "青白江区", "新都区", "温江区", "双流区", "郫都区"]
    },
    "湖北省": {
        "武汉市": ["江岸区", "江汉区", "硚口区", "汉阳区", "武昌区", "青山区", "洪山区", "东西湖区", "汉南区", "蔡甸区", "江夏区", "黄陂区", "新洲区"]
    },
    "山东省": {
        "济南市": ["历下区", "市中区", "槐荫区", "天桥区", "历城区", "长清区", "章丘区", "济阳区", "莱芜区", "钢城区"],
        "青岛市": ["市南区", "市北区", "黄岛区", "崂山区", "李沧区", "城阳区", "即墨区"]
    },
    "辽宁省": {
        "沈阳市": ["和平区", "沈河区", "大东区", "皇姑区", "铁西区", "顺乐路区", "浑南区", "沈北新区", "于洪区", "辽中区"],
        "大连市": ["中山区", "西岗区", "沙口区", "甘井子区", "旅顺口区", "金州区", "普兰店区"]
    },
    "陕西省": {
        "西安市": ["新城区", "碑林区", "莲湖区", "灞桥区", "未央区", "雁塔区", "阎良区", "临潼区", "长安区", "高陵区", "鄠邑区"]
    }
};

export const APP_LOGO = "https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg";

export const DEFAULT_PERMISSIONS: RolePermissions = {
    director: {
        dashboard: 'edit',
        players: 'edit',
        finance: 'edit',
        design: 'edit',
        training: 'edit',
        matches: 'edit',
        // Comment: Added missing growth module permission
        growth: 'edit',
        settings: 'edit'
    },
    coach: {
        dashboard: 'view',
        players: 'edit',
        finance: 'none',
        design: 'edit',
        training: 'edit',
        matches: 'view',
        // Comment: Added missing growth module permission
        growth: 'edit',
        settings: 'view'
    },
    assistant_coach: {
        dashboard: 'view',
        players: 'view',
        finance: 'none',
        design: 'view',
        training: 'view',
        matches: 'view',
        // Comment: Added missing growth module permission
        growth: 'view',
        settings: 'view'
    },
    parent: {
        dashboard: 'view',
        players: 'view',
        finance: 'none',
        design: 'none',
        training: 'view',
        matches: 'view',
        // Comment: Added missing growth module permission
        growth: 'view',
        settings: 'view'
    }
};

export const DEFAULT_FINANCE_CATEGORIES: FinanceCategoryDefinition[] = [
    { id: 'cat-1', label: '课时续费', type: 'income' },
    { id: 'cat-2', label: '球场包场', type: 'income' },
    { id: 'cat-3', label: '参赛费/杂费', type: 'income' },
    { id: 'cat-4', label: '工资支出', type: 'expense' },
    { id: 'cat-5', label: '租金支出', type: 'expense' },
    { id: 'cat-6', label: '行政/杂项', type: 'expense' },
    { id: 'cat-7', label: '其他支出', type: 'expense' },
];

export const MOCK_TEAMS: Team[] = [
  { id: 't1', name: '多特蒙德 U19', level: 'U19', description: '主要青年梯队，备战青年欧冠' },
  { id: 't2', name: '多特蒙德 U17', level: 'U17', description: '专注于基础战术素养培养' },
];

export const MOCK_USERS: User[] = [
  { id: 'u1', username: 'admin', password: '123', name: '青训总监', role: 'director' },
  { id: 'u2', username: 'coach_u19', password: '123', name: 'U19 主教练', role: 'coach', teamIds: ['t1'] },
  { id: 'u3', username: 'coach_u17', password: '123', name: 'U17 主教练', role: 'coach', teamIds: ['t2'] },
  { id: 'u4', username: 'head_coach', password: '123', name: '梯队总教头', role: 'coach', teamIds: ['t1', 't2'] },
];

export const MOCK_ANNOUNCEMENTS: Announcement[] = [
    { id: '1', title: '球场维护通知', content: '本周三主球场进行草皮维护，U17 训练场地调整至 2 号人工草训练场，请互相转告。', date: new Date().toISOString().split('T')[0], type: 'info', author: '青训总监' },
    { id: '2', title: '冬季训练营报名', content: '2023 冬季特训营报名通道已开启，名额有限，请尽快联系管理人员。', date: new Date().toISOString().split('T')[0], type: 'urgent', author: '运营部' }
];

export const DEFAULT_ATTRIBUTE_CONFIG: AttributeConfig = {
  technical: [
    { key: 'passing', label: '传接球' },
    { key: 'dribbling', label: '盘带' },
    { key: 'shooting', label: '射门' },
    { key: 'attacking1v1', label: '1对1进攻' },
    { key: 'defending1v1', label: '1V1防守' },
    { key: 'goalkeeping', label: '守门' },
  ],
  tactical: [
    { key: 'vision', label: '观察能力' },
    { key: 'offBall', label: '无球跑动' },
    { key: 'positioning', label: '防守选位' },
    { key: 'decision', label: '决策能力' },
  ],
  physical: [
    { key: 'coordination', label: '协调性' },
    { key: 'agility', label: '敏捷' },
    { key: 'speed', label: '速度' },
    { key: 'endurance', label: '耐力' },
    { key: 'explosiveness', label: '爆发力' },
    { key: 'strength', label: '力量' },
  ],
  mental: [
    { key: 'focus', label: '专注度' },
    { key: 'confidence', label: '自信心' },
    { key: 'pressure', label: '抗压能力' },
    { key: 'teamwork', label: '团队合作' },
    { key: 'discipline', label: '纪律性' },
    { key: 'selfDiscipline', label: '自律性' },
  ],
  drillLibrary: [
    '5v2 抢圈 (Rondo)',
    '1v1 攻防演练',
    '3v2 快速反击',
    '角球战术演练',
    '点球大战模拟',
    '体能: 12分钟跑',
    '体能: 30米折返跑',
    '传中射门练习'
  ],
  trainingFoci: [
    '传接球',
    '射门',
    '防守',
    '体能',
    '战术',
    '对抗'
  ]
};

const generateStats = (): PlayerStats => {
  const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  const stats: any = { technical: {}, tactical: {}, physical: {}, mental: {} };
  DEFAULT_ATTRIBUTE_CONFIG.technical.forEach(attr => stats.technical[attr.key] = rand(4, 9));
  DEFAULT_ATTRIBUTE_CONFIG.tactical.forEach(attr => stats.tactical[attr.key] = rand(4, 9));
  DEFAULT_ATTRIBUTE_CONFIG.physical.forEach(attr => stats.physical[attr.key] = rand(5, 9));
  DEFAULT_ATTRIBUTE_CONFIG.mental.forEach(attr => stats.mental[attr.key] = rand(4, 9));
  if (stats.technical.goalkeeping) stats.technical.goalkeeping = rand(1, 3);
  return stats as PlayerStats;
};

const mockId = (year: number) => `110101${year}01011234`;

const MOCK_REVIEWS: PlayerReview[] = [
    { id: 'r1', date: '2023-04-01', year: 2023, quarter: 'Q1', technicalTacticalImprovement: '在高强度压迫下的出球能力有显著提升，能够更冷静地寻找队友。但是非惯用脚的传球精准度仍需加强。', mentalDevelopment: '自信心增强，但在比赛落后时容易急躁，需要学会控制情绪。', summary: '总体表现出色，已经成为中场的节拍器。下个季度重点提升左脚能力和情绪管理。', status: 'Published' },
    { id: 'r2', date: '2023-07-01', year: 2023, quarter: 'Q2', technicalTacticalImprovement: '无球跑动更加聪明，经常能出现在对手防线的真空地带。射门转化率有所下降，需要加强门前终结能力训练。', mentalDevelopment: '作为队长展现了很好的领导力，能够鼓励队友。抗压能力在关键比赛中得到了验证。', summary: '战术执行力满分，是球队的核心。需要在休赛期加强力量训练，以适应更高强度的对抗。', status: 'Published' }
];

const getNextYear = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
};

const createMockPlayer = (data: Partial<Player>): Player => {
    const stats = generateStats();
    return {
        ...data,
        preferredFoot: data.preferredFoot || '右',
        height: data.height || 175,
        weight: data.weight || 65,
        nickname: data.nickname || '',
        stats: stats,
        statsStatus: 'Published',
        lastPublishedStats: JSON.parse(JSON.stringify(stats)),
        gallery: [],
    } as Player;
}

export const MOCK_PLAYERS: Player[] = [
  createMockPlayer({ id: '1', teamId: 't1', name: '马尔科·罗伊斯 (Jr)', gender: '男', idCard: mockId(2005), birthDate: '2005-01-01', number: 11, position: Position.CAM, isCaptain: true, age: 18, goals: 12, assists: 8, appearances: 15, image: 'https://picsum.photos/200/200?random=1', reviews: MOCK_REVIEWS, credits: 50, validUntil: getNextYear(), leaveQuota: 3, leavesUsed: 0, rechargeHistory: [{ id: 'init-1', date: '2023-01-01', amount: 52, quotaAdded: 3 }], nickname: '小火箭', joinDate: '2020-01-15' }),
  createMockPlayer({ id: '2', teamId: 't1', name: '马茨·胡梅尔斯 (Jr)', gender: '男', idCard: mockId(2005), birthDate: '2005-01-01', number: 15, position: Position.CB, isCaptain: false, age: 18, goals: 2, assists: 1, appearances: 15, image: 'https://picsum.photos/200/200?random=2', reviews: [], credits: 45, validUntil: getNextYear(), leaveQuota: 3, leavesUsed: 1, rechargeHistory: [{ id: 'init-2', date: '2023-01-01', amount: 46, quotaAdded: 3 }], joinDate: '2021-03-20' }),
  createMockPlayer({ id: '3', teamId: 't1', name: '尤利安·布兰特 (Jr)', gender: '男', idCard: mockId(2006), birthDate: '2006-01-01', number: 19, position: Position.CM, isCaptain: false, age: 17, goals: 5, assists: 12, appearances: 14, image: 'https://picsum.photos/200/200?random=3', reviews: [], credits: 12, validUntil: '2023-12-31', leaveQuota: 3, leavesUsed: 2, rechargeHistory: [{ id: 'init-3', date: '2023-01-01', amount: 12, quotaAdded: 3 }], joinDate: '2022-09-01' }),
  createMockPlayer({ id: '4', teamId: 't1', name: '格雷戈·科贝尔 (Jr)', gender: '男', idCard: mockId(2005), birthDate: '2005-01-01', number: 1, position: Position.GK_ATT, isCaptain: false, age: 18, goals: 0, assists: 1, appearances: 15, image: 'https://picsum.photos/200/200?random=4', reviews: [], credits: 100, validUntil: getNextYear(), leaveQuota: 5, leavesUsed: 0, rechargeHistory: [{ id: 'init-4', date: '2023-01-01', amount: 101, quotaAdded: 5 }], joinDate: '2021-11-10' }),
  createMockPlayer({ id: '5', teamId: 't2', name: '卡里姆·阿德耶米 (Jr)', gender: '男', idCard: mockId(2007), birthDate: '2007-01-01', number: 27, position: Position.LW, isCaptain: true, age: 16, goals: 15, assists: 4, appearances: 13, image: 'https://picsum.photos/200/200?random=5', reviews: [], credits: 0, validUntil: '2023-01-01', leaveQuota: 2, leavesUsed: 2, rechargeHistory: [], joinDate: '2023-02-14' }),
  createMockPlayer({ id: '6', teamId: 't2', name: '尼科·施洛特贝克 (Jr)', gender: '男', idCard: mockId(2007), birthDate: '2007-01-01', number: 4, position: Position.CB, isCaptain: false, age: 16, goals: 3, assists: 0, appearances: 14, image: 'https://picsum.photos/200/200?random=6', reviews: [], credits: 20, validUntil: getNextYear(), leaveQuota: 3, leavesUsed: 0, rechargeHistory: [{ id: 'init-6', date: '2023-01-01', amount: 20, quotaAdded: 3 }], joinDate: '2023-01-05' }),
  createMockPlayer({ id: '7', teamId: 't2', name: '埃姆雷·詹 (Jr)', gender: '男', idCard: mockId(2007), birthDate: '2007-01-01', number: 23, position: Position.CDM, isCaptain: false, age: 16, goals: 1, assists: 3, appearances: 12, image: 'https://picsum.photos/200/200?random=7', reviews: [], credits: 30, validUntil: getNextYear(), leaveQuota: 3, leavesUsed: 0, rechargeHistory: [{ id: 'init-7', date: '2023-01-01', amount: 30, quotaAdded: 3 }], joinDate: '2022-07-25' }),
];

export const MOCK_MATCHES: Match[] = [
  { id: '1', teamId: 't1', title: 'U19 青年联赛第5轮', opponent: '沙尔克04 U19', date: '2023-10-01', time: '10:00', location: 'Home', province: '北京市', city: '北京市', district: '朝阳区', result: '4-1', status: 'Completed', competition: '联赛' },
  { id: '2', teamId: 't1', title: '国家德比青年版', opponent: '拜仁慕尼黑 U19', date: '2023-10-08', time: '11:00', location: 'Away', province: '广东省', city: '广州市', district: '天河区', result: '2-2', status: 'Completed', competition: '联赛' },
  { id: '3', teamId: 't1', title: '地区杯赛半决赛', opponent: '波鸿 U19', date: '2023-10-15', time: '10:00', location: 'Home', province: '北京市', city: '北京市', district: '海淀区', result: '3-0', status: 'Completed', competition: '杯赛' },
  { id: '4', teamId: 't2', title: 'U17 关键战役', opponent: '勒沃库森 U17', date: '2023-11-20', time: '14:00', location: 'Away', province: '上海市', city: '上海市', district: '浦东新区', status: 'Upcoming', competition: '联赛' },
  { id: '5', teamId: 't2', title: '主场收官战', opponent: '莱比锡 U17', date: '2023-11-27', time: '10:00', location: 'Home', province: '北京市', city: '北京市', district: '朝阳区', status: 'Upcoming', competition: '联赛' },
];

export const MOCK_TRAINING: TrainingSession[] = [
  { id: '1', teamId: 't1', title: '高位逼抢恢复', date: '2023-11-14', focus: '防守', duration: 90, intensity: 'High', drills: ['5v2 抢圈 (Rondo)', '3v3 攻守转换', '高位防线布置', '8v8 限制触球次数'], attendance: [ { playerId: '1', status: 'Present' }, { playerId: '2', status: 'Present' }, { playerId: '3', status: 'Leave' } ] },
  { id: '2', teamId: 't1', title: '防守阵型保持', date: '2023-11-16', focus: '防守', duration: 75, intensity: 'Medium', drills: ['动态拉伸', '影子防守练习', '整体阵型移动', '放松整理'], attendance: [ { playerId: '1', status: 'Present' }, { playerId: '2', status: 'Injury' }, { playerId: '4', status: 'Present' } ] }
];
