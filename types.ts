
export enum Position {
  GK = '门将',
  DEF = '后卫',
  MID = '中场',
  FWD = '前锋'
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
  level: string; // e.g. U19, U17, First Team
  description?: string;
}

export interface AttributeDefinition {
  key: string;
  label: string;
}

export type AttributeCategory = 'technical' | 'tactical' | 'physical' | 'mental';

// Added drillLibrary to the config
export interface AttributeConfig {
    technical: AttributeDefinition[];
    tactical: AttributeDefinition[];
    physical: AttributeDefinition[];
    mental: AttributeDefinition[];
    drillLibrary: string[]; // New: List of preset drills
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
  status?: ApprovalStatus; // Workflow status
}

export interface PlayerPhoto {
    id: string;
    url: string; // Base64 data URL
    date: string;
    caption?: string;
}

// --- NEW: Testing & Home Training Types ---

export interface HomeTrainingRecord {
    id: string;
    playerId: string;
    date: string; // YYYY-MM-DD
    count: number; // Replaced duration with count/sets
    content?: string; // Optional description
    imageUrl?: string; // Optional proof photo
}

export interface SkillTest {
    id: string;
    name: string; // e.g. "颠球", "30米冲刺"
    unit: string; // e.g. "个", "秒", "cm"
    category: 'technical' | 'physical';
}

export interface SkillTestRecord {
    id: string;
    playerId: string;
    testId: string; // Links to SkillTest.id
    date: string;
    value: number; // The result
    notes?: string;
}

export interface Player {
  id: string;
  teamId: string; // Links player to a team
  name: string;
  gender: '男' | '女';
  idCard: string;
  birthDate: string;   // (YYYY-MM-DD)
  number: number;
  position: Position;
  isCaptain?: boolean;
  age: number;
  height: number; // cm
  weight: number; // kg
  goals: number;
  assists: number;
  appearances: number;
  image: string;
  
  // New Fields
  joinDate?: string;      // 入队时间
  school?: string;        // 就读学校
  parentName?: string;    // 家长姓名
  parentPhone?: string;   // 联系方式

  // Stats System
  stats: PlayerStats; // Current working copy (Draft/Submitted)
  statsStatus?: ApprovalStatus; // Status of the working copy
  lastPublishedStats?: PlayerStats; // The version visible to parents
  
  reviews: PlayerReview[]; // History of quarterly reviews
  
  // Class Hour / Credit System
  credits: number; // Remaining class hours
  validUntil: string; // Expiration Date (YYYY-MM-DD)
  leaveQuota: number; // Total allowed leaves in current cycle
  leavesUsed: number; // Leaves used in current cycle
  rechargeHistory: RechargeRecord[]; // New: Log of recharges
  
  // Gallery System
  gallery?: PlayerPhoto[]; // New: Daily photos
}

// --- Match Detail Types ---

export type MatchEventType = 'Goal' | 'Assist' | 'YellowCard' | 'RedCard' | 'Sub' | 'OwnGoal';

export interface MatchEvent {
    id: string;
    minute: number;
    type: MatchEventType;
    playerId: string; // The main player involved
    playerName: string; // Cached for display
    relatedPlayerId?: string; // For substitution (player out) or assist
    relatedPlayerName?: string;
    description?: string;
}

export interface MatchLineup {
    starting: string[]; // Player IDs
    substitutes: string[]; // Player IDs
}

export interface MatchDetails {
    weather: string; // e.g. "Sunny", "Rainy"
    pitch: string; // e.g. "Natural Grass", "Artificial"
    lineup: string[]; // Deprecated, use lineup obj if possible, but keeping for compatibility or simple array
    substitutes: string[]; // Deprecated, use lineup obj
    events: MatchEvent[];
    summary: string; // The text report
}

export interface Match {
  id: string;
  title?: string; // New: Match Title e.g. "U19 League Round 5"
  opponent: string;
  date: string;
  time: string;
  location: 'Home' | 'Away';
  
  // Detailed Location
  province?: string;
  city?: string;
  district?: string;

  result?: string; // e.g., "3-1"
  status: 'Upcoming' | 'Completed' | 'Cancelled';
  competition: string;
  matchLog?: string; // Deprecated, use details.summary
  details?: MatchDetails; // New detailed structure
}

export interface TrainingSession {
  id: string;
  teamId: string; // New: Link to a specific team
  title: string;
  date: string;
  focus: string; // e.g., "Counter Pressing", "Set Pieces"
  duration: number; // minutes
  drills: string[];
  intensity: 'Low' | 'Medium' | 'High';
  aiGenerated?: boolean;
  attendance: AttendanceRecord[]; // Updated: Detailed attendance records
  
  // New: Training Log & Review System
  submissionStatus?: 'Planned' | 'Submitted' | 'Reviewed'; // Workflow status
  coachFeedback?: string; // Filled by Coach: Summary of training effect & team state
  directorReview?: string; // Filled by Director: Audit and comments
}

export interface DashboardStats {
  totalPlayers: number;
  wins: number;
  draws: number;
  losses: number;
  nextMatch: Match | null;
  topScorer: string;
}

export interface Announcement {
    id: string;
    title: string;
    content: string;
    date: string;
    type: 'info' | 'urgent';
    author?: string; // Name of the creator
}

// --- Auth Types ---

export type UserRole = 'director' | 'coach' | 'parent';

export interface User {
  id: string;
  username: string; // For login
  password?: string; // For login
  name: string;
  role: UserRole;
  teamId?: string; // For coaches, which team they manage
  playerId?: string; // For parents, which player they view
}
