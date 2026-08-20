
import { 
  Player, Match, TrainingSession, Position, Team, PlayerStats, AttributeConfig, 
  PlayerReview, User, Announcement, RolePermissions, FinanceCategoryDefinition, 
  SalarySettings, TournamentItem, TournamentTier, OrgRating,
  CharacterDimensionKey, CheckpointScore, CharacterBadgeLevel, CharacterDimensionAssessment, PlayerCharacterAssessment
} from './types';

// CHINA_GEO_DATA 省略保持原样...
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
        settings: 'edit',
        tactics: 'edit',
        philosophy: 'edit'
    },
    coach: {
        dashboard: 'view',
        players: 'edit',
        finance: 'none',
        design: 'edit',
        training: 'edit',
        matches: 'view',
        growth: 'edit',
        settings: 'view',
        tactics: 'edit',
        philosophy: 'view'
    },
    assistant_coach: {
        dashboard: 'view',
        players: 'view',
        finance: 'none',
        design: 'view',
        training: 'view',
        matches: 'view',
        growth: 'view',
        settings: 'view',
        tactics: 'view',
        philosophy: 'view'
    },
    parent: {
        dashboard: 'view',
        players: 'view',
        finance: 'none',
        design: 'none',
        training: 'view',
        matches: 'view',
        growth: 'view',
        settings: 'view',
        tactics: 'view',
        philosophy: 'view'
    }
};

export const DEFAULT_SALARY_SETTINGS: SalarySettings = {
    levels: [
        { level: 'Apprentice', label: '见习', baseSalary: 200, sessionBaseFee: 70 },
        { level: 'Junior', label: '初级', baseSalary: 500, sessionBaseFee: 60 },
        { level: 'Intermediate', label: '常驻', baseSalary: 1000, sessionBaseFee: 70 },
        { level: 'Senior', label: '核心', baseSalary: 2000, sessionBaseFee: 90 },
    ],
    incrementalPlayerFee: 5,
    minPlayersForCalculation: 6,
    assistantCoachBaseSalary: 2000,
    assistantCoachSessionBaseFee: 40,
    assistantCoachMinPlayersForCalculation: 6,
    assistantCoachIncrementalPlayerFee: 5,
    monthlyAttendanceRewards: [
        { threshold: 80, amount: 100 },
        { threshold: 85, amount: 150 },
        { threshold: 90, amount: 200 },
    ],
    quarterlyRenewalReward: { threshold: 80, amount: 100, minRechargeAmount: 9 },
    evaluationAllocation: 1000, // 教练员综合评价绩效分配金额
    performanceBonusConfig: {
        attendance: { coach: true, assistant: true },
        renewal: { coach: true, assistant: true },
        evaluation: { coach: true, assistant: true },
    },
    enableCoachPerformanceReward: true,
    enableAssistantPerformanceReward: true,
    assessmentRules: {
        assistantSupervision: {
            enabled: true,
            assessCoaches: true,
            assessAssistants: true,
            amount: 10,
            timing: '每场训练课后 (每日累积督考)',
            content: '检查考核教练/助教的着装规范(缺项扣10元)、必备口哨、消音/秒表，以及器材清理规范完成情况(未清每次扣10元)。'
        },
        directorLogAudit: {
            enabled: true,
            assessCoaches: true,
            assessAssistants: false,
            amount: 10,
            timing: '每日训练课后 (月度累积计算)',
            content: '训练日志应在下课当天完成提交。逾期1天扣除10元，逾期2天及以上扣罚20元。'
        },
        periodizationPlan: {
            enabled: true,
            assessCoaches: true,
            assessAssistants: false,
            amount: 20, // 20%
            timing: '季度末月 (Q1-Q4季末终审评定)',
            content: '每季度底需及时更新录入所带梯队的周期计划与目标大纲，若季度考核评定为“未录入”将扣除基础底薪的20%。'
        },
        playerReview: {
            enabled: true,
            assessCoaches: true,
            assessAssistants: false,
            amount: 5,
            timing: '每季度次月10日 24:00 截止',
            content: '要求在次月10日前录入并提交学员上季度的全部成长评估，每漏录入1人扣罚5元。'
        },
        quarterlyAttendance: {
            enabled: true,
            assessCoaches: true,
            assessAssistants: true,
            amount: 200,
            timing: '每季度末 (总监终评)',
            content: '配合青训总监对教练员进行季度考核执勤，评定为优秀全勤者给予单次追加奖励200元。'
        },
        monthlyExecution: {
            enabled: true,
            assessCoaches: true,
            assessAssistants: true,
            amount: 200,
            timing: '每月核算周期',
            content: '对无严重违纪或前4项考核累计扣罚≤0元的发放优秀奖(¥200)；累计扣罚在 ¥20(含)以内的发放良好奖(¥100)；超过 ¥20 则不予以正向奖励。'
        }
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
  { id: 't1', name: '多特蒙德 U19', level: '', attribute: '挑战', description: '主要青年梯队，备战青年欧冠' },
  { id: 't2', name: '多特蒙德 U17', level: '', attribute: '成长', description: '专注于基础战术素养培养' },
  { id: 't3', name: '多特蒙德 U15', level: '', attribute: '启蒙', description: '入门级基础训练' },
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
  ],
  focusSubjects: {
    '传接球': ['短传配合', '长传转移', '接球转身', '一脚传球'],
    '射门': ['禁区外远射', '门前抢点', '单刀球练习', '头球攻门'],
    '防守': ['个人防守姿势', '小组协防', '阵型保持', '高位逼抢'],
    '体能': ['耐力跑', '爆发力训练', '灵敏性练习', '核心力量'],
    '战术': ['快速反击', '阵地进攻', '边路进攻', '定位球战术'],
    '对抗': ['1v1 对抗', '2v2 小组对抗', '5v5 比赛模拟', '全场对抗']
  }
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
  createMockPlayer({ id: '3', teamId: 't2', name: '尤利安·布兰特 (Jr)', gender: '男', idCard: mockId(2006), birthDate: '2006-01-01', number: 19, position: Position.CM, isCaptain: false, age: 17, goals: 5, assists: 12, appearances: 14, image: 'https://picsum.photos/200/200?random=3', reviews: [], credits: 12, validUntil: '2023-12-31', leaveQuota: 3, leavesUsed: 2, rechargeHistory: [{ id: 'init-3', date: '2023-01-01', amount: 12, quotaAdded: 3 }], joinDate: '2022-09-01' }),
  createMockPlayer({ id: '4', teamId: 't2', name: '格雷戈·科贝尔 (Jr)', gender: '男', idCard: mockId(2005), birthDate: '2005-01-01', number: 1, position: Position.GK_ATT, isCaptain: false, age: 18, goals: 0, assists: 1, appearances: 15, image: 'https://picsum.photos/200/200?random=4', reviews: [], credits: 100, validUntil: getNextYear(), leaveQuota: 5, leavesUsed: 0, rechargeHistory: [{ id: 'init-4', date: '2023-01-01', amount: 101, quotaAdded: 5 }], joinDate: '2021-11-10' }),
  createMockPlayer({ id: '5', teamId: 't3', name: '卡里姆·阿德耶米 (Jr)', gender: '男', idCard: mockId(2007), birthDate: '2007-01-01', number: 27, position: Position.LW, isCaptain: true, age: 16, goals: 15, assists: 4, appearances: 13, image: 'https://picsum.photos/200/200?random=5', reviews: [], credits: 0, validUntil: '2023-01-01', leaveQuota: 2, leavesUsed: 2, rechargeHistory: [], joinDate: '2023-02-14' }),
  createMockPlayer({ id: '6', teamId: 't3', name: '尼科·施洛特贝克 (Jr)', gender: '男', idCard: mockId(2007), birthDate: '2007-01-01', number: 4, position: Position.CB, isCaptain: false, age: 16, goals: 3, assists: 0, appearances: 14, image: 'https://picsum.photos/200/200?random=6', reviews: [], credits: 20, validUntil: getNextYear(), leaveQuota: 3, leavesUsed: 0, rechargeHistory: [{ id: 'init-6', date: '2023-01-01', amount: 20, quotaAdded: 3 }], joinDate: '2023-01-05' }),
  createMockPlayer({ id: '7', teamId: 'unassigned', name: '埃姆雷·詹 (Jr)', gender: '男', idCard: mockId(2007), birthDate: '2007-01-01', number: 23, position: Position.CDM, isCaptain: false, age: 16, goals: 1, assists: 3, appearances: 12, image: 'https://picsum.photos/200/200?random=7', reviews: [], credits: 30, validUntil: getNextYear(), leaveQuota: 3, leavesUsed: 0, rechargeHistory: [{ id: 'init-7', date: '2023-01-01', amount: 30, quotaAdded: 3 }], joinDate: '2022-07-25' }),
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

export const MOCK_TOURNAMENTS: TournamentItem[] = [
  {
    id: 'tour-1',
    name: '2026贵州仁怀全国足球邀请赛',
    tier: 'S',
    category: '官方赛事',
    standardRating: 4.3,
    experienceRating: 3.6,
    recommendParticipation: '是',
    orgRating: {
      eventOrganization: 5,
      refereeLevel: 4,
      venueCondition: 4,
      accommodation: 3,
      transportation: 4,
      recommendParticipation: '是'
    },
    province: '贵州省',
    city: '遵义市',
    district: '仁怀市',
    locationName: '仁怀市奥体中心足球训练基地',
    targetAgeGroup: '2015/2016挑战队',
    seasonMonth: '暑期7-8月',
    matchFormat: '8人制',
    organizer: '遵义市足协 / 仁怀市体育总会',
    notes: '全国多支青训强队参赛，整体竞技对抗水平极高；草皮养护与赛事直播保障到位，食宿需提前预订。',
    isPotential: false,
    createdAt: '2026-07-20T08:00:00.000Z',
    updatedAt: '2026-07-25T18:00:00.000Z'
  },
  {
    id: 'tour-2',
    name: '贵阳林城之星邀请赛',
    tier: 'A',
    category: '品牌赛事',
    standardRating: 4.0,
    experienceRating: 4.5,
    recommendParticipation: '是',
    orgRating: {
      eventOrganization: 4,
      refereeLevel: 4,
      venueCondition: 4,
      accommodation: 5,
      transportation: 4,
      recommendParticipation: '是'
    },
    province: '贵州省',
    city: '贵阳市',
    district: '观山湖区',
    locationName: '贵阳奥体中心副场',
    targetAgeGroup: '2015/2016红队',
    seasonMonth: '每年五一假期',
    matchFormat: '8人制',
    organizer: '贵阳林城青少年足球联盟',
    notes: '省内标杆品牌赛事，组织服务周到，往届获得优胜组亚军（3胜1平3负）。',
    isPotential: false,
    createdAt: '2026-05-01T08:00:00.000Z',
    updatedAt: '2026-05-04T18:00:00.000Z'
  },
  {
    id: 'tour-3',
    name: '中国青少年足球联赛 (中青赛)',
    tier: 'S',
    category: '官方赛事',
    standardRating: 4.8,
    experienceRating: 4.6,
    recommendParticipation: '是',
    orgRating: {
      eventOrganization: 5,
      refereeLevel: 5,
      venueCondition: 4.5,
      accommodation: 4.5,
      transportation: 4.7,
      recommendParticipation: '是'
    },
    province: '全国各赛区',
    city: '全国大区赛',
    targetAgeGroup: 'U13 / U15 / U17',
    seasonMonth: '每年9月-次年6月',
    matchFormat: '11人制',
    organizer: '教育部 / 国家体育总局 / 中国足协',
    notes: '国内最高水平官方青少年赛事体系，梯队升学与评级核心通道。',
    isPotential: true,
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-01-10T08:00:00.000Z'
  },
  {
    id: 'tour-4',
    name: '全国青训菁英杯挑战赛',
    tier: 'A',
    category: '商业赛事',
    standardRating: 4.2,
    experienceRating: 4.0,
    recommendParticipation: '是',
    orgRating: {
      eventOrganization: 4,
      refereeLevel: 4,
      venueCondition: 4.5,
      accommodation: 4,
      transportation: 4,
      recommendParticipation: '是'
    },
    province: '四川省',
    city: '成都市',
    district: '温江区',
    locationName: '成都温江足球基地',
    targetAgeGroup: 'U9-U12',
    seasonMonth: '国庆黄金周',
    matchFormat: '8人制',
    organizer: '西部菁英体育',
    notes: '汇聚西南地区知名职业梯队与青训名校，锻炼价值高。',
    isPotential: true,
    createdAt: '2026-03-15T08:00:00.000Z',
    updatedAt: '2026-03-15T08:00:00.000Z'
  },
  {
    id: 'tour-5',
    name: '川黔滇青少年足球交流优胜杯',
    tier: 'B',
    category: '地方赛事',
    standardRating: 3.8,
    experienceRating: 3.5,
    recommendParticipation: '是',
    orgRating: {
      eventOrganization: 4,
      refereeLevel: 3.5,
      venueCondition: 4,
      accommodation: 3.5,
      transportation: 3.5,
      recommendParticipation: '是'
    },
    province: '贵州省',
    city: '毕节市',
    targetAgeGroup: 'U8-U11',
    seasonMonth: '春季4月',
    matchFormat: '8人制',
    organizer: '毕节地区足协',
    notes: '适合年轻梯队积累客场实战经验。',
    isPotential: true,
    createdAt: '2026-04-10T08:00:00.000Z',
    updatedAt: '2026-04-10T08:00:00.000Z'
  }
];

export const TIER_CONFIG: Record<TournamentTier, {
  label: string;
  badge: string;
  cardBorder: string;
  cardBg: string;
  titleColor: string;
  glow: string;
  icon: string;
  description: string;
}> = {
  S: {
    label: 'S 级',
    badge: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-black font-black shadow-md border border-amber-300',
    cardBorder: 'border-amber-400/80 hover:border-amber-400',
    cardBg: 'bg-gradient-to-br from-amber-50/40 via-white to-amber-50/20',
    titleColor: 'text-amber-950',
    glow: 'ring-1 ring-amber-400/50 shadow-amber-100/60 shadow-lg',
    icon: '👑',
    description: '顶级锦标 / 重点全国赛事'
  },
  A: {
    label: 'A 级',
    badge: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black shadow-sm border border-blue-400',
    cardBorder: 'border-blue-300 hover:border-blue-400',
    cardBg: 'bg-gradient-to-br from-blue-50/30 via-white to-indigo-50/20',
    titleColor: 'text-blue-950',
    glow: 'ring-1 ring-blue-300/40 shadow-blue-50 shadow-md',
    icon: '💎',
    description: '高水平竞技 / 省级品牌赛事'
  },
  B: {
    label: 'B 级',
    badge: 'bg-emerald-600 text-white font-black shadow-2xs border border-emerald-500',
    cardBorder: 'border-emerald-200 hover:border-emerald-400',
    cardBg: 'bg-gradient-to-br from-emerald-50/30 via-white to-white',
    titleColor: 'text-emerald-950',
    glow: 'shadow-emerald-50 shadow-sm',
    icon: '🌱',
    description: '普通成长 / 区域性竞技赛事'
  },
  C: {
    label: 'C 级',
    badge: 'bg-slate-600 text-white font-bold border border-slate-500',
    cardBorder: 'border-gray-200 hover:border-gray-300',
    cardBg: 'bg-white',
    titleColor: 'text-gray-900',
    glow: 'shadow-sm',
    icon: '⚽',
    description: '基础锻炼 / 常规周末交流赛事'
  }
};

export const CATEGORY_OPTIONS: TournamentCategory[] = [
  '官方赛事',
  '品牌赛事',
  '商业赛事',
  '地方赛事',
  '交流赛'
];

export const calculateTournamentRatings = (
  tournament: TournamentItem, 
  matches: Match[]
): {
  standardRating: number;
  experienceRating: number;
  recommendParticipation: '是' | '否' | boolean;
  matchCount: number;
  recordText: string;
  hasPlayed: boolean;
  detailedOrgRating: OrgRating;
} => {
  const linkedMatches = matches.filter(m => 
    (m.tournamentId && m.tournamentId === tournament.id) ||
    (m.competition && m.competition.trim() === tournament.name.trim()) ||
    (m.title && m.title.trim() === tournament.name.trim()) ||
    (m.opponent && m.opponent.trim() === tournament.name.trim())
  );

  const ratedMatches = linkedMatches.filter(m => m.details?.summaryBreakdown?.orgRating);

  let standardRating = tournament.standardRating || 0;
  let experienceRating = tournament.experienceRating || 0;
  let recommendParticipation = tournament.recommendParticipation ?? '是';

  let eventOrgSum = 0;
  let refereeSum = 0;
  let venueSum = 0;
  let accomSum = 0;
  let transSum = 0;
  let recommendYesCount = 0;
  let validRatingCount = 0;

  ratedMatches.forEach(m => {
    const org = m.details?.summaryBreakdown?.orgRating;
    if (org) {
      validRatingCount++;
      eventOrgSum += org.eventOrganization ?? 5;
      refereeSum += org.refereeLevel ?? 5;
      venueSum += org.venueCondition ?? 5;
      accomSum += org.accommodation ?? 5;
      transSum += org.transportation ?? 5;
      if (org.recommendParticipation === '是' || org.recommendParticipation === true) {
        recommendYesCount++;
      }
    }
  });

  if (validRatingCount > 0) {
    const avgEventOrg = eventOrgSum / validRatingCount;
    const avgReferee = refereeSum / validRatingCount;
    const avgVenue = venueSum / validRatingCount;
    const avgAccom = accomSum / validRatingCount;
    const avgTrans = transSum / validRatingCount;

    standardRating = Number(((avgEventOrg + avgReferee + avgVenue) / 3).toFixed(1));
    experienceRating = Number(((avgAccom + avgTrans) / 2).toFixed(1));
    recommendParticipation = (recommendYesCount / validRatingCount) >= 0.5 ? '是' : '否';
  } else if (tournament.orgRating) {
    const org = tournament.orgRating;
    const s1 = org.eventOrganization ?? 5;
    const s2 = org.refereeLevel ?? 5;
    const s3 = org.venueCondition ?? 5;
    const e1 = org.accommodation ?? 5;
    const e2 = org.transportation ?? 5;
    standardRating = Number(((s1 + s2 + s3) / 3).toFixed(1));
    experienceRating = Number(((e1 + e2) / 2).toFixed(1));
    recommendParticipation = org.recommendParticipation ?? '是';
  }

  let wins = 0;
  let draws = 0;
  let losses = 0;
  let totalMatchesCount = linkedMatches.length;

  linkedMatches.forEach(m => {
    if (m.isSeries && m.fixtures && m.fixtures.length > 0) {
      totalMatchesCount += (m.fixtures.length - 1);
      m.fixtures.forEach(f => {
        const res = f.result || '';
        const scoreMatch = res.match(/(\d+)\s*[-:]\s*(\d+)/);
        if (scoreMatch) {
          const s1 = parseInt(scoreMatch[1], 10);
          const s2 = parseInt(scoreMatch[2], 10);
          if (s1 > s2) wins++;
          else if (s1 < s2) losses++;
          else draws++;
        } else if (res.includes('胜')) wins++;
        else if (res.includes('负')) losses++;
        else if (res.includes('平')) draws++;
      });
    } else if (m.result) {
      const res = m.result;
      const scoreMatch = res.match(/(\d+)\s*[-:]\s*(\d+)/);
      if (scoreMatch) {
        const s1 = parseInt(scoreMatch[1], 10);
        const s2 = parseInt(scoreMatch[2], 10);
        if (s1 > s2) wins++;
        else if (s1 < s2) losses++;
        else draws++;
      } else if (res.includes('胜')) wins++;
      else if (res.includes('负')) losses++;
      else if (res.includes('平')) draws++;
    }
  });

  const recordParts: string[] = [];
  if (wins > 0 || totalMatchesCount > 0) recordParts.push(`${wins}胜`);
  if (draws > 0) recordParts.push(`${draws}平`);
  if (losses > 0) recordParts.push(`${losses}负`);

  const detailedOrgRating: OrgRating = validRatingCount > 0 ? {
    eventOrganization: Number((eventOrgSum / validRatingCount).toFixed(1)),
    refereeLevel: Number((refereeSum / validRatingCount).toFixed(1)),
    venueCondition: Number((venueSum / validRatingCount).toFixed(1)),
    accommodation: Number((accomSum / validRatingCount).toFixed(1)),
    transportation: Number((transSum / validRatingCount).toFixed(1)),
    recommendParticipation
  } : (tournament.orgRating || {
    eventOrganization: 5,
    refereeLevel: 5,
    venueCondition: 5,
    accommodation: 5,
    transportation: 5,
    recommendParticipation: '是'
  });

  return {
    standardRating: standardRating || 4.5,
    experienceRating: experienceRating || 4.0,
    recommendParticipation,
    matchCount: totalMatchesCount,
    recordText: recordParts.length > 0 ? recordParts.join('') : '暂无详细比分',
    hasPlayed: linkedMatches.length > 0,
    detailedOrgRating
  };
};

// ==========================================
// 球员品质 (Player Character / Qualities) 体系配置
// ==========================================

export interface CharacterDimensionConfig {
  key: CharacterDimensionKey;
  name: string;
  englishName: string;
  badgeName: string;
  coreMeaning: string;
  checkpoint1: string;
  checkpoint2: string;
  colorName: string;
  themeColor: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  lightBg: string;
  glowColor: string;
  iconType: 'sparkles' | 'shield' | 'flame' | 'lightbulb' | 'users';
}

export const CHARACTER_DIMENSIONS: CharacterDimensionConfig[] = [
  {
    key: 'confidence',
    name: '自信',
    englishName: 'Confidence',
    badgeName: '自信品质勋章',
    coreMeaning: '相信自己，敢于主动处理球',
    checkpoint1: '主动要球，敢在对手逼抢下接球、转身',
    checkpoint2: '出现合理机会时，敢于带球突破、射门或完成自己的判断',
    colorName: 'amber',
    themeColor: '#f59e0b',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-400',
    badgeBorder: 'border-amber-500/40',
    lightBg: 'bg-amber-500/5',
    glowColor: 'shadow-amber-500/20',
    iconType: 'sparkles'
  },
  {
    key: 'resilience',
    name: '坚韧',
    englishName: 'Resilience',
    badgeName: '坚韧品质勋章',
    coreMeaning: '遇到挫折后仍能继续投入',
    checkpoint1: '失误、丢球或球队落后后，立即回追并继续比赛',
    checkpoint2: '疲劳、连续受挫时，仍保持跑动、回防和战术执行',
    colorName: 'blue',
    themeColor: '#3b82f6',
    badgeBg: 'bg-blue-500/15',
    badgeText: 'text-blue-400',
    badgeBorder: 'border-blue-500/40',
    lightBg: 'bg-blue-500/5',
    glowColor: 'shadow-blue-500/20',
    iconType: 'shield'
  },
  {
    key: 'courage',
    name: '勇气',
    englishName: 'Courage',
    badgeName: '勇气品质勋章',
    coreMeaning: '面对压力和困难不逃避',
    checkpoint1: '面对更强壮、更凶猛的对手，敢于进行合理的身材对抗和五五开球争抢',
    checkpoint2: '在困难或关键时刻，敢于封堵射门、争抢第一点、承担防守或进攻责任',
    colorName: 'rose',
    themeColor: '#f43f5e',
    badgeBg: 'bg-rose-500/15',
    badgeText: 'text-rose-400',
    badgeBorder: 'border-rose-500/40',
    lightBg: 'bg-rose-500/5',
    glowColor: 'shadow-rose-500/20',
    iconType: 'flame'
  },
  {
    key: 'creativity',
    name: '创造',
    englishName: 'Creativity',
    badgeName: '创造品质勋章',
    coreMeaning: '能发现并尝试不同的解决办法',
    checkpoint1: '运用假动作、变向、节奏变化等方式突破或摆脱防守',
    checkpoint2: '能通过直塞、转移、突然跑位等方式，为球队创造明显的进攻空间或机会',
    colorName: 'purple',
    themeColor: '#a855f7',
    badgeBg: 'bg-purple-500/15',
    badgeText: 'text-purple-400',
    badgeBorder: 'border-purple-500/40',
    lightBg: 'bg-purple-500/5',
    glowColor: 'shadow-purple-500/20',
    iconType: 'lightbulb'
  },
  {
    key: 'cooperation',
    name: '合作',
    englishName: 'Cooperation',
    badgeName: '合作品质勋章',
    coreMeaning: '愿意帮助队友并为团队作出贡献',
    checkpoint1: '发现队友位置更好时愿意传球，传球后继续跑位接应',
    checkpoint2: '主动回防、补位、协防，并通过提醒、鼓励帮助队友',
    colorName: 'emerald',
    themeColor: '#10b981',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-400',
    badgeBorder: 'border-emerald-500/40',
    lightBg: 'bg-emerald-500/5',
    glowColor: 'shadow-emerald-500/20',
    iconType: 'users'
  }
];

export const CHARACTER_SCORING_OPTIONS: {
  value: CheckpointScore;
  label: string;
  title: string;
  description: string;
  badgeStyle: string;
}[] = [
  {
    value: 0,
    label: '0分',
    title: '0分 - 无行为',
    description: '有表现机会，但没有观察到相应行为',
    badgeStyle: 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-500'
  },
  {
    value: 1,
    label: '1分',
    title: '1分 - 偶尔/提醒',
    description: '偶尔出现1次，或经过教练提醒后才表现',
    badgeStyle: 'bg-blue-950/60 text-blue-300 border border-blue-800/80 hover:border-blue-500'
  },
  {
    value: 2,
    label: '2分',
    title: '2分 - 主动稳定',
    description: '主动、独立地出现2次以上，具有一定稳定性',
    badgeStyle: 'bg-amber-950/60 text-amber-300 border border-amber-800/80 hover:border-amber-500'
  },
  {
    value: null,
    label: '—',
    title: '— 免评',
    description: '出场时间或比赛场景不足，无法判断，不按0分处理',
    badgeStyle: 'bg-gray-900/60 text-gray-500 border border-gray-800 hover:border-gray-700'
  }
];

export const CHARACTER_BADGE_LEVELS: Record<CharacterBadgeLevel, {
  level: CharacterBadgeLevel;
  scoreRange: string;
  title: string;
  badgeLabel: string;
  badgeClass: string;
  pillClass: string;
  cardClass: string;
  iconBg: string;
  isBadgeAwarded: boolean;
  isOutstanding: boolean;
}> = {
  none: {
    level: 'none',
    scoreRange: '0—1分',
    title: '暂不符合',
    badgeLabel: '暂不符合',
    badgeClass: 'bg-gray-800/60 text-gray-400 border border-gray-700',
    pillClass: 'bg-gray-100 text-gray-500 border border-gray-200',
    cardClass: 'border-gray-200 bg-white',
    iconBg: 'bg-gray-100 text-gray-400',
    isBadgeAwarded: false,
    isOutstanding: false
  },
  observing: {
    level: 'observing',
    scoreRange: '2分',
    title: '有所表现，继续观察',
    badgeLabel: '继续观察 (2分)',
    badgeClass: 'bg-sky-950/60 text-sky-300 border border-sky-800/80',
    pillClass: 'bg-sky-50 text-sky-700 border border-sky-200',
    cardClass: 'border-sky-200 bg-sky-50/30',
    iconBg: 'bg-sky-100 text-sky-600',
    isBadgeAwarded: false,
    isOutstanding: false
  },
  standard: {
    level: 'standard',
    scoreRange: '3分',
    title: '达到勋章标准',
    badgeLabel: '🎖️ 品质勋章 (3分)',
    badgeClass: 'bg-amber-950/80 text-amber-300 border border-amber-600 shadow-sm shadow-amber-500/20',
    pillClass: 'bg-amber-50 text-amber-800 border border-amber-300 font-bold',
    cardClass: 'border-amber-300 bg-amber-50/40 shadow-sm',
    iconBg: 'bg-amber-100 text-amber-700',
    isBadgeAwarded: true,
    isOutstanding: false
  },
  outstanding: {
    level: 'outstanding',
    scoreRange: '4分',
    title: '表现突出，优先授予',
    badgeLabel: '👑 卓越勋章 (4分满分)',
    badgeClass: 'bg-gradient-to-r from-amber-500 to-yellow-400 text-bvb-black font-black border border-amber-300 shadow-md shadow-yellow-500/30',
    pillClass: 'bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-black shadow-sm',
    cardClass: 'border-amber-400 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-transparent ring-2 ring-amber-400/40 shadow-md',
    iconBg: 'bg-bvb-yellow text-bvb-black',
    isBadgeAwarded: true,
    isOutstanding: true
  }
};

export const DIMENSION_MEDAL_CONFIG: Record<CharacterDimensionKey, {
  name: string;
  english: string;
  themeColor: string;
  glowColor: string;
  description: string;
  coreMeaning: string;
}> = {
  confidence: {
    name: '自信',
    english: 'CONFIDENCE',
    themeColor: '#EAB308',
    glowColor: 'rgba(234, 179, 8, 0.4)',
    description: '相信自己，敢于在比赛中发挥特点与处理关键球',
    coreMeaning: '积极投入、主动要球、敢于做动作'
  },
  resilience: {
    name: '坚韧',
    english: 'PERSEVERANCE',
    themeColor: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    description: '面对失误与落后不气馁，全场保持高昂斗志',
    coreMeaning: '失误立即回追、逆境持续拼搏'
  },
  courage: {
    name: '勇气',
    english: 'COURAGE',
    themeColor: '#EF4444',
    glowColor: 'rgba(239, 68, 68, 0.4)',
    description: '面对强敌无所畏惧，敢于身体对抗与关键封堵',
    coreMeaning: '敢抢五五开球、敢于封堵射门'
  },
  creativity: {
    name: '创造',
    english: 'CREATIVITY',
    themeColor: '#8B5CF6',
    glowColor: 'rgba(139, 92, 246, 0.4)',
    description: '突破思维常规，善于利用假动作与精妙传球破局',
    coreMeaning: '巧用节奏假动作、创造进攻空间'
  },
  cooperation: {
    name: '合作',
    english: 'COOPERATION',
    themeColor: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    description: '乐于分享球权、积极补位协防，与团队融为一体',
    coreMeaning: '主动传球跑位、积极回防补位'
  }
};

export const computeDimensionScoreAndBadge = (
  c1: CheckpointScore, 
  c2: CheckpointScore
): { totalScore: number | null; badgeLevel: CharacterBadgeLevel } => {
  if (c1 === null && c2 === null) {
    return { totalScore: null, badgeLevel: 'none' };
  }
  const score1 = c1 ?? 0;
  const score2 = c2 ?? 0;
  const total = score1 + score2;
  
  let badgeLevel: CharacterBadgeLevel = 'none';
  if (total >= 4) {
    badgeLevel = 'outstanding';
  } else if (total === 3) {
    badgeLevel = 'standard';
  } else if (total === 2) {
    badgeLevel = 'observing';
  } else {
    badgeLevel = 'none';
  }

  return { totalScore: total, badgeLevel };
};

export const createDefaultDimensionAssessment = (): CharacterDimensionAssessment => ({
  checkpoint1: null,
  checkpoint2: null,
  totalScore: null,
  badgeLevel: 'none'
});

export const createDefaultPlayerCharacterAssessment = (
  playerId: string,
  matchId: string,
  matchType: 'regular' | 'intramural',
  matchTitle: string,
  matchDate: string,
  teamId?: string,
  opponentOrTeams?: string,
  evaluatorName?: string
): PlayerCharacterAssessment => {
  return {
    id: `char-eval-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    playerId,
    matchId,
    matchType,
    matchTitle,
    matchDate,
    teamId,
    opponentOrTeams,
    evaluatorName: evaluatorName || '青训教练组',
    dimensions: {
      confidence: createDefaultDimensionAssessment(),
      resilience: createDefaultDimensionAssessment(),
      courage: createDefaultDimensionAssessment(),
      creativity: createDefaultDimensionAssessment(),
      cooperation: createDefaultDimensionAssessment(),
    },
    totalValidScore: 0,
    standardBadgesCount: 0,
    outstandingBadgesCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};

export const recalculateCharacterAssessmentTotals = (
  assessment: PlayerCharacterAssessment
): PlayerCharacterAssessment => {
  const keys: CharacterDimensionKey[] = ['confidence', 'resilience', 'courage', 'creativity', 'cooperation'];
  let validScoreSum = 0;
  let standardCount = 0;
  let outstandingCount = 0;

  const newDimensions = { ...assessment.dimensions };

  keys.forEach(key => {
    const dim = newDimensions[key];
    const { totalScore, badgeLevel } = computeDimensionScoreAndBadge(dim.checkpoint1, dim.checkpoint2);
    newDimensions[key] = {
      ...dim,
      totalScore,
      badgeLevel
    };

    if (totalScore !== null) {
      validScoreSum += totalScore;
    }
    if (badgeLevel === 'standard') {
      standardCount++;
    } else if (badgeLevel === 'outstanding') {
      outstandingCount++;
    }
  });

  return {
    ...assessment,
    dimensions: newDimensions,
    totalValidScore: validScoreSum,
    standardBadgesCount: standardCount,
    outstandingBadgesCount: outstandingCount,
    updatedAt: new Date().toISOString()
  };
};

