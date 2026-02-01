
import { Player, Match, TrainingSession, Position, Team, PlayerStats, AttributeConfig, PlayerReview, User, Announcement, RolePermissions, FinanceCategoryDefinition, SalarySettings } from './types';

// CHINA_GEO_DATA 省略...
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
        "武汉市": ["江岸区", "江汉区", "硚口区", "汉阳区", "武昌区", "青山区", "虹山区", "东西湖区", "汉南区", "蔡甸区", "江夏区", "黄陂区", "新洲区"]
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
        growth: 'view',
        settings: 'view'
    }
};

export const DEFAULT_SALARY_SETTINGS: SalarySettings = {
    levels: [
        { level: 'Junior', label: '初级', baseSalary: 3000, sessionBaseFee: 60 },
        { level: 'Intermediate', label: '中级', baseSalary: 4500, sessionBaseFee: 70 },
        { level: 'Senior', label: '高级', baseSalary: 6000, sessionBaseFee: 90 },
    ],
    incrementalPlayerFee: 5,
    minPlayersForCalculation: 6,
    assistantCoachBaseSalary: 2000,
    assistantCoachPlayerRate: 5,
    monthlyAttendanceRewards: [
        { threshold: 80, amount: 100 },
        { threshold: 90, amount: 200 },
    ],
    quarterlyRenewalReward: { threshold: 80, amount: 300 },
    monthlyPerformanceRewards: [
        { minScore: 8, maxScore: 8.9, amount: 100 },
        { minScore: 9, maxScore: 10, amount: 200 },
    ],
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

// Comment: Added missing mock data exports
export const MOCK_PLAYERS: Player[] = [
  {
    id: 'p1',
    teamId: 't1',
    name: '马尔科·罗伊斯 (Jr)',
    gender: '男',
    idCard: '110101201001011234',
    birthDate: '2010-01-01',
    number: 11,
    position: Position.ST,
    age: 13,
    goals: 12,
    assists: 8,
    appearances: 15,
    image: 'https://picsum.photos/200/200?random=1',
    joinDate: '2022-01-01',
    preferredFoot: '右',
    stats: {
      technical: { passing: 8, dribbling: 9, shooting: 8, attacking1v1: 7, defending1v1: 4, goalkeeping: 2 },
      tactical: { vision: 9, offBall: 8, positioning: 6, decision: 8 },
      physical: { coordination: 8, agility: 8, speed: 7, endurance: 6, explosiveness: 7, strength: 5 },
      mental: { focus: 8, confidence: 9, pressure: 7, teamwork: 8, discipline: 9, selfDiscipline: 8 }
    },
    statsStatus: 'Published',
    reviews: [],
    credits: 10,
    validUntil: '2024-12-31',
    leaveQuota: 3,
    leavesUsed: 0,
    remainingLeaveQuota: 3,
    rechargeHistory: []
  }
];

export const MOCK_MATCHES: Match[] = [
  {
    id: 'm1',
    teamId: 't1',
    opponent: '沙尔克04 U19',
    date: '2023-11-20',
    time: '14:30',
    location: 'Away',
    status: 'Completed',
    result: '2-1',
    competition: '地区联赛',
    details: {
      weather: 'Sunny',
      pitch: 'Natural Grass',
      lineup: ['p1'],
      substitutes: [],
      events: [{ id: 'e1', minute: 23, type: 'Goal', playerId: 'p1', playerName: '罗伊斯' }],
      summary: '表现出色'
    }
  }
];

export const MOCK_TRAINING: TrainingSession[] = [
  {
    id: 's1',
    teamId: 't1',
    title: '传接球专项训练',
    date: '2023-11-15',
    focus: '传接球',
    duration: 90,
    drills: ['5v2 Rondo', '长传练习'],
    intensity: 'Medium',
    attendance: [{ playerId: 'p1', status: 'Present' }],
    submissionStatus: 'Reviewed',
    isReviewRead: true,
    coachFeedback: '由于天气寒冷，热身时间延长。',
    directorReview: '注意传球细节。'
  }
];

export const MOCK_USERS: User[] = [
  { id: 'u1', username: 'admin', password: '123', name: '青训总监', role: 'director' },
  { id: 'u2', username: 'coach_u19', password: '123', name: 'U19 主教练', role: 'coach', teamIds: ['t1'], level: 'Intermediate' },
  { id: 'u3', username: 'coach_u17', password: '123', name: 'U17 助教', role: 'assistant_coach', teamIds: ['t2'] },
  { id: 'u4', username: 'head_coach', password: '123', name: '梯队总教头', role: 'coach', teamIds: ['t1', 't2'], level: 'Senior' },
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
