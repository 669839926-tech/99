
export enum Position {
  GK_ATT = '进攻型守门员',
  GK_DEF = '防守型守门员',
  CB = '中后卫',
  LB = '左边后卫',
  RB = '右边后卫',
  LWB = '左边翼卫',
  RWB = '右边翼卫',
  CAM = '进攻型中场',
  CM = '组织型中场',
  CDM = '防守型中场',
  F9 = '伪9号',
  ST = '中锋',
  LW = '左边锋',
  RW = '右边锋',
  TBD = '位置待定'
}

export type AttendanceStatus = 'Present' | 'Leave' | 'Injury' | 'Absent';

export interface AttendanceRecord {
  playerId: string;
  status: AttendanceStatus;
  creditCost?: number; // 扣除课时数，默认为1
}

export interface RechargeRecord {
    id: string;
    date: string;
    amount: number;
    quotaAdded: number;
}

export interface Team {
  id: string;
  name: string;
  level: string;
  attribute?: string; // e.g. '启蒙' | '成长' | '挑战' | '兴趣' | '竞技'
  description?: string;
}

export interface AttributeDefinition {
  key: string;
  label: string;
}

export type AttributeCategory = 'technical' | 'tactical' | 'physical' | 'mental';

export interface AttributeConfig {
    technical: AttributeDefinition[];
    tactical: AttributeDefinition[];
    physical: AttributeDefinition[];
    mental: AttributeDefinition[];
    drillLibrary: string[];
    trainingFoci: string[];
    focusSubjects?: Record<string, string[]>;
    // Player Profile Tag Config
    playerTypes?: string[];
    technicalStrengths?: string[];
    personalityTraits?: string[];
    behavioralTraits?: string[];
    coachingReminders?: string[];
}

export interface PlayerStats {
  technical: Record<string, number>;
  tactical: Record<string, number>;
  physical: Record<string, number>;
  mental: Record<string, number>;
}

export type ApprovalStatus = 'Draft' | 'Submitted' | 'Published';

export interface PlayerReview {
  id: string;
  date: string;
  year: number;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  technicalTacticalImprovement: string;
  mentalDevelopment: string;
  summary: string;
  status?: ApprovalStatus;
}

export interface PlayerPhoto {
    id: string;
    url: string;
    date: string;
    caption?: string;
}

// --- Technical Growth Types ---
export interface HomeTrainingLog {
    id: string;
    playerId: string;
    date: string;
    title: string;
    duration: number; // minutes
    notes?: string;
}

export interface JugglingRecord {
    id: string;
    playerId: string;
    date: string;
    count: number;
}

export interface TechTestDefinition {
    id: string;
    name: string;
    unit: string; // e.g., '秒', '个', '次'
    description: string;
}

export interface TechTestResult {
    id: string;
    testId: string;
    playerId: string;
    date: string;
    value: number;
    coachId?: string;
}

// --- Match Point Management Types ---
export type PointChangeType = 'gain' | 'loss' | 'consumption';

export interface PointItemDefinition {
    id: string;
    title: string;
    points: number;
    type: PointChangeType;
    isVariable?: boolean;
}

export interface PlayerPointRecord {
    id: string;
    playerId: string;
    itemId: string; // Reference to PointItemDefinition
    date: string;
    points: number;
    note?: string;
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  gender: '男' | '女';
  idCard: string;
  birthDate: string;
  number: number;
  position: Position;
  secondaryPosition?: Position;
  isCaptain?: boolean;
  age: number;
  goals: number;
  assists: number;
  appearances: number;
  image: string;
  joinDate?: string;
  school?: string;
  parentName?: string;
  parentPhone?: string;
  preferredFoot: '左' | '右';
  height?: number;
  weight?: number;
  nickname?: string;
  stats: PlayerStats;
  statsStatus?: ApprovalStatus;
  lastPublishedStats?: PlayerStats;
  yearlyStats?: Record<number, PlayerStats>;
  reviews: PlayerReview[];
  credits: number;
  validUntil: string;
  leaveQuota: number;
  leavesUsed: number;
  remainingLeaveQuota: number; // 剩余赠予请假额度
  rechargeHistory: RechargeRecord[];
  gallery?: PlayerPhoto[];
  // Growth Data
  homeTrainingLogs?: HomeTrainingLog[];
  jugglingHistory?: JugglingRecord[];
  testResults?: TechTestResult[];
  // Player Profile Tags
  playerType?: string[];
  technicalStrengths?: string[];
  personalityTraits?: string[];
  behavioralTraits?: string[];
  coachingReminders?: string[];
  renewalLevel?: 1 | 2 | 3 | 4;
}

export type MatchEventType = 'Goal' | 'Assist' | 'YellowCard' | 'RedCard' | 'Sub' | 'OwnGoal';

export interface MatchEvent {
    id: string;
    minute: number;
    type: MatchEventType;
    playerId: string;
    playerName: string;
    relatedPlayerId?: string;
    relatedPlayerName?: string;
    description?: string;
}

export type GameFormat = '11v11' | '9v9' | '8v8' | '7v7' | '5v5' | '11' | '9' | '8' | '7' | '5';

export interface TacticsPlayer {
    id: string;
    playerId?: string;
    label: string;
    name?: string;
    number?: number;
    positionLabel?: string;
    x: number;
    y: number;
    color?: string;
}

export interface TacticsDrawing {
    id: string;
    type: 'line' | 'arrow' | 'curve' | 'text' | 'highlight' | 'run' | 'pass' | 'shot' | 'dribble';
    points: number[];
    x?: number;
    y?: number;
    text?: string;
    color: string;
    width?: number;
}

export interface Tactic {
    id: string;
    title: string;
    description?: string;
    format: GameFormat;
    formation: string;
    data: TacticsBoardData;
    createdAt: string;
    updatedAt: string;
    authorId?: string;
}

export interface TacticsBoardData {
    players: TacticsPlayer[];
    drawings: TacticsDrawing[];
    format?: GameFormat;
    formation?: string;
}

export interface FormationTemplate {
    id?: string;
    name: string;
    format: GameFormat;
    positions: { label: string; x: number; y: number }[];
}

export interface MatchPlanRequirement {
    id: string;
    text: string;
    completed: boolean;
    score?: number; // 1-10 points
    rating?: 'Excellent' | 'Good' | 'Normal';
}

export interface MatchPlan {
    id: string;
    teamId: string;
    seasonName: string;
    location: string;
    date: string;
    playerIds: string[];
    teamRequirements: MatchPlanRequirement[];
    playerRequirements: Record<string, MatchPlanRequirement[]>; // playerId -> requirements
    status: 'Draft' | 'Active' | 'Completed';
    createdAt: string;
}

export interface OrgRating {
    eventOrganization?: number; // 1-5 颗星
    refereeLevel?: number;      // 1-5 颗星
    venueCondition?: number;    // 1-5 颗星
    accommodation?: number;     // 1-5 颗星
    transportation?: number;    // 1-5 颗星
    recommendParticipation?: '是' | '否' | boolean; // 是否推荐再次参赛
}

export interface MatchSummaryBreakdown {
    overall?: string;             // 比赛整体评价
    highlights?: string;          // 表现亮点
    issuesExposed?: string;       // 暴露的问题
    matchReview?: string;         // 比赛复盘（表现亮点与暴露的问题 - 旧版兼容）
    nextStageTraining?: string;   // 下一阶段训练重点
    orgRating?: OrgRating;        // 赛事组织评价

    // Legacy fields kept optional for backwards compatibility
    technicalTactical?: string;
    individual?: string;
    gapAnalysis?: string;
    trainingPriorities?: string;
    management?: string;
}

export interface SeriesFixture {
    id: string;
    opponent: string;
    result: string;
    location: 'Home' | 'Away';
    date: string;
    weather?: string;
    pitch?: string;
    events: MatchEvent[];
}

export interface PlayerPerformanceEvaluation {
    rating?: number;  // 1-5 颗星
    comment?: string; // 个人点评
    goals?: number;   // 个人进球数
    assists?: number; // 个人助攻数
    honors?: string[]; // 个人荣誉 (如 ['最佳射手', 'MVP'])
}

export interface MatchDetails {
    weather: string;
    dailyWeather?: Record<string, string>; // 按日期选择的天气: { "2026-07-20": "晴朗", "2026-07-21": "小雨" }
    pitch: string;
    lineup: string[];
    substitutes: string[];
    events: MatchEvent[];
    summary: string;
    summaryBreakdown?: MatchSummaryBreakdown;
    teamRequirements?: MatchPlanRequirement[];
    playerRequirements?: Record<string, MatchPlanRequirement[]>;
    playerPerformances?: Record<string, PlayerPerformanceEvaluation>;
}

export interface Match {
  id: string;
  teamId: string;
  title?: string;
  opponent: string;
  date: string;
  endDate?: string;
  time: string;
  location: 'Home' | 'Away';
  province?: string;
  city?: string;
  district?: string;
  result?: string;
  seriesResult?: string;
  seriesRanking?: string;
  status: 'Upcoming' | 'Completed' | 'Cancelled';
  competition: string;
  matchLog?: string;
  details?: MatchDetails;
  isSeries?: boolean;
  fixtures?: SeriesFixture[];
}

export interface TrainingSession {
  id: string;
  teamId: string;
  title: string;
  date: string;
  focus: string;
  duration: number;
  drills: string[];
  intensity: 'Low' | 'Medium' | 'High';
  aiGenerated?: boolean;
  attendance: AttendanceRecord[];
  submissionStatus?: 'Planned' | 'Submitted' | 'Reviewed';
  isReviewRead?: boolean;
  coachFeedback?: string; // Repurposed as Overall Evaluation
  directorReview?: string;
  lessonPlanAssessment?: 'implemented' | 'not_adjusted' | 'no_plan';
  linkedDesignId?: string;
  coachId?: string; // 创建该计划的教练ID
  logCoachName?: string; // 录入日志的操作员（教练员）
  assistantCheckInIds?: string[]; // 助教签到ID列表
  assistantCheckInNames?: string[]; // 打卡的操作员（助教）姓名列表
  // --- New Focus Fields ---
  focusedPlayerIds?: string[]; // 1-2 重点关注球员
  focusedPlayerNotes?: Record<string, { technical: string; mental: string; resolved?: boolean }>; // 重点关注笔记
  // --- Structured Log Fields ---
  performanceRatings?: {
    technical: number;
    application: number;
    focus: number;
    discipline: number;
  };
  planReflection?: string;
  assistantSupervision?: {
    hasWatch: boolean;
    hasWhistle: boolean;
    hasUniform: boolean;
    equipmentCleared: boolean;
    evaluated: boolean;
  };
  planCreatedAt?: string;
  logSubmittedAt?: string;
}

// --- Periodization Plan Types ---
export interface WeeklyPlanSubItem {
    id: string;
    physicalTheme: string;
    trainingTheme: string;
    trainingContent: string;
}

export interface WeeklyPlan {
    id: string;
    year: number;
    month: number;
    weekInMonth: number;
    physicalTheme: string;
    trainingTheme: string;
    trainingContent: string;
    oppositionContent: string;
    trainingGoals: string;
    matchPlan: string;
    remarks: string;
    subItems?: WeeklyPlanSubItem[];
}

export interface PeriodizationPlan {
    id: string;
    teamId: string;
    year: number;
    weeks: WeeklyPlan[];
    quarterAssessments?: Record<string, 'entered' | 'not_entered'>;
}

export interface FinanceCategoryDefinition {
    id: string;
    label: string;
    type: 'income' | 'expense';
}

export interface FinanceTransaction {
    id: string;
    date: string;
    details: string;
    category: string; // Dynamic ID from FinanceCategoryDefinition
    income: number;
    expense: number;
    account: string;
    attachment?: string; // Base64 Image
}

export type PitchType = 'Full' | 'Half' | 'Box' | 'Portrait' | 'Midfield' | 'DefensiveThird' | 'AttackingThird';
export type PitchTheme = 'Grass' | 'Blue' | 'Grey' | 'White' | 'Black';

export type ElementType = 
  | 'PlayerCircle' | 'PlayerPin' | 'GK' | 'Coach' | 'Referee'
  | 'Ball' 
  | 'Cone' | 'Marker' | 'Pole' 
  | 'AgilityRing' | 'Ladder' | 'Hurdle' | 'Mannequin' | 'Rebounder' 
  | 'Goal' | 'MiniGoal' 
  | 'Text';

export type LineType = 'Pass' | 'Run' | 'Dribble' | 'Boundary';

export interface DesignElement {
    id: string;
    type: ElementType;
    x: number;
    y: number;
    rotation: number;
    scale?: number;
    color?: string;
    label?: string;
}

export interface DesignLine {
    id: string;
    type: LineType;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    color: string;
}

export interface DrillDesign {
    id: string;
    title: string;
    category: 'Drill' | 'Tactic' | 'SetPiece' | 'Other';
    pitchType: PitchType;
    pitchTheme: PitchTheme;
    elements: DesignElement[];
    lines: DesignLine[];
    description: string;
    keyPoints: string[];
    createdAt: string;
    authorId?: string;
}

export interface Announcement {
    id: string;
    title: string;
    content: string;
    date: string;
    type: 'info' | 'urgent';
    author: string;
}

export type UserRole = 'director' | 'coach' | 'assistant_coach' | 'parent';

// --- Coach Salary Types ---
export type CoachLevel = 'Apprentice' | 'Junior' | 'Intermediate' | 'Senior';

export interface CoachLevelSetting {
    level: CoachLevel;
    label: string;
    baseSalary: number;
    sessionBaseFee: number;
}

export interface CustomAssessmentRule {
    enabled: boolean;
    assessCoaches: boolean;
    assessAssistants: boolean;
    amount: number;       // 金额 (罚款基准、比例、或者正向激励底数)
    timing: string;       // 考核时间点
    content: string;      // 考核项目内容
}

export interface AssessmentRulesConfig {
    assistantSupervision: CustomAssessmentRule; // 1. 助教监督考评
    directorLogAudit: CustomAssessmentRule;     // 2. 青训总监监督考评
    periodizationPlan: CustomAssessmentRule;     // 3. 季度周期计划目标考核录入
    playerReview: CustomAssessmentRule;          // 4. 球员跟踪录入考核
    quarterlyAttendance: CustomAssessmentRule;   // 5. 季度全勤奖
    monthlyExecution: CustomAssessmentRule;      // 6. 月度执行奖
}

export interface SalarySettings {
    levels: CoachLevelSetting[];
    incrementalPlayerFee: number; // 5
    minPlayersForCalculation: number; // 6
    assistantCoachBaseSalary: number; // 助教底薪
    assistantCoachSessionBaseFee: number; // 助教基础课酬
    assistantCoachMinPlayersForCalculation: number; // 助教起算基准人数
    assistantCoachIncrementalPlayerFee: number; // 助教每超1人增加金额
    monthlyAttendanceRewards: { threshold: number; amount: number }[]; // 参训率改为月度
    quarterlyRenewalReward: { threshold: number; amount: number; minRechargeAmount: number }; // 续费保持季度，amount 为达标后每人奖励金额
    evaluationAllocation: number; // 教练员综合评价绩效分配金额
    performanceBonusConfig: {
        attendance: { coach: boolean; assistant: boolean };
        renewal: { coach: boolean; assistant: boolean };
        evaluation: { coach: boolean; assistant: boolean };
    };
    enableCoachPerformanceReward: boolean; // 是否向主教练开启公共绩效 (Master Switch)
    enableAssistantPerformanceReward: boolean; // 是否向助教开启公共绩效 (Master Switch)
    assessmentRules?: AssessmentRulesConfig;  // 6个核心考评项目规则配置
}

export interface MonthlyEvaluation {
    id: string;
    year: number;
    month: number;
    score: number; // 平均分
    trainingScore?: number; // 专业训练程度
    attentionScore?: number; // 球员关注程度
    synergyScore?: number; // 团队协同与协作
    comment: string;
}

export interface MonthlySalaryRecord {
    id: string;
    year: number;
    month: number;
    baseSalary: number;
    sessionFees: number;
    attendanceReward: number;
    renewalReward: number;
    performanceReward: number;
    matchSubsidy?: number;     // 比赛补贴 (可手动输入)
    monthlyExecutionReward?: number; // 月度执行奖 (优秀 200, 良好 100)
    monthlyExecutionLevel?: string;  // 月度执行等级 ("Excellent" | "Good" | "NeedsImprovement")
    totalDeductions?: number;        // 月/季考核扣罚 (支持手动修改/覆盖)
    totalSalary: number;
    isDisbursed?: boolean;
    disbursedDate?: string;
    overriddenTeamSizes?: Record<string, number>;
    overriddenLogAuditCount?: number;
}

// --- Accounting Types ---
export interface AccountingRecord {
    id: string;
    type: 'receivable' | 'payable';
    date: string;
    entity: string;
    details: string;
    amount: number;
    status: 'pending' | 'settled' | 'cancelled';
    category: string;
    settledDate?: string;
}

// --- RBAC Types ---
export type ModuleId = 'dashboard' | 'players' | 'finance' | 'design' | 'training' | 'matches' | 'growth' | 'settings' | 'tactics' | 'philosophy';
export type PermissionLevel = 'none' | 'view' | 'edit';

export interface PhilosophyDocument {
  id: string;
  category: string;
  title: string;
  content: string; // 内容详细描述 (支持富文本/Markdown)
  attachments?: { name: string; type: string; url: string }[]; // 上传的文件
  updatedAt: string;
  isBuiltIn?: boolean; // 标识是否为系统内置(即由上传PDF解析的基础内容)
}

export type RolePermissions = Record<UserRole, Record<ModuleId, PermissionLevel>>;

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  teamIds?: string[];
  playerId?: string;
  joiningDate?: string; // 入职时间 YYYY-MM-DD
  // Salary fields
  level?: CoachLevel;
  isTrial?: boolean;
  monthlyEvaluations?: MonthlyEvaluation[];
  monthlySalaryRecords?: MonthlySalaryRecord[];
}

// --- Intramural Tournament (队内赛) Types ---
export type PitchFormat = '3人制' | '5人制' | '8人制' | '11人制';
export type TournamentType = 'league' | 'group_knockout'; // 积分循环赛(联赛) | 小组赛+淘汰赛(杯赛)

export interface PlayerCategoryOverride {
  status: 'participating' | 'opt_out';
  overrideCategoryId?: string;
}

export interface TournamentCategory {
  id: string;
  name: string; // e.g. "U10 组别"
  minBirthDate: string; // e.g. "2015-09-01"
  maxBirthDate: string; // e.g. "2016-08-31"
  pitchFormat: PitchFormat;
  tournamentType: TournamentType;
  legCount?: 1 | 2; // 单循环 / 双循环 (for league)
  playerOverrides?: Record<string, PlayerCategoryOverride>;
  playerSkillTiers?: Record<string, number>; // playerId -> tierIndex (0=A档, 1=B档, 2=C档...)
}

export interface IntramuralTeam {
  id: string;
  categoryId: string;
  name: string; // e.g. "红队", "蓝队", "战狼队"
  color: string; // hex color or tailwind badge style
  captainPlayerId?: string;
  playerIds: string[]; // assigned player IDs
}

export interface IntramuralMatchGoal {
  id: string;
  matchId: string;
  scorerPlayerId: string;
  assistantPlayerId?: string;
  minute?: number;
  teamId: string;
}

export interface IntramuralMatch {
  id: string;
  categoryId: string;
  stage: 'group' | 'semi_final' | 'final' | 'third_place' | 'league_round';
  groupName?: string; // e.g., 'A组', 'B组'
  roundNumber?: number; // e.g. Round 1, Round 2
  homeTeamId: string;
  awayTeamId: string;
  homeScore?: number;
  awayScore?: number;
  status: 'scheduled' | 'live' | 'completed';
  date?: string;
  time?: string;
  field?: string;
  goals?: IntramuralMatchGoal[];
  notes?: string;
}

export interface IntramuralTournament {
  id: string;
  title: string; // e.g. "2026年夏季俱乐部队内赛"
  createdAt: string;
  status: 'draft' | 'active' | 'completed';
  categories: TournamentCategory[];
  teams: IntramuralTeam[];
  matches: IntramuralMatch[];
}

