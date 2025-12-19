
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

export interface Player {
  id: string;
  teamId: string;
  name: string;
  gender: '男' | '女';
  idCard: string;
  birthDate: string;
  number: number;
  position: Position;
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
  reviews: PlayerReview[];
  credits: number;
  validUntil: string;
  leaveQuota: number;
  leavesUsed: number;
  rechargeHistory: RechargeRecord[];
  gallery?: PlayerPhoto[];
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

export interface MatchDetails {
    weather: string;
    pitch: string;
    lineup: string[];
    substitutes: string[];
    events: MatchEvent[];
    summary: string;
}

export interface Match {
  id: string;
  teamId: string;
  title?: string;
  opponent: string;
  date: string;
  time: string;
  location: 'Home' | 'Away';
  province?: string;
  city?: string;
  district?: string;
  result?: string;
  status: 'Upcoming' | 'Completed' | 'Cancelled';
  competition: string;
  matchLog?: string;
  details?: MatchDetails;
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
  coachFeedback?: string;
  directorReview?: string;
  linkedDesignId?: string;
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

// --- RBAC Types ---
export type ModuleId = 'dashboard' | 'players' | 'finance' | 'design' | 'training' | 'matches' | 'settings';
export type PermissionLevel = 'none' | 'view' | 'edit';

export type RolePermissions = Record<UserRole, Record<ModuleId, PermissionLevel>>;

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  teamIds?: string[];
  playerId?: string;
}
