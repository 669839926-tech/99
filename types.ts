
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
  goals: number;
  assists: number;
  appearances: number;
  image: string;
  
  // New Fields
  joinDate?: string;      // 入队时间
  school?: string;        // 就读学校
  parentName?: string;    // 家长姓名
  parentPhone?: string;   // 联系方式

  // Newly requested fields
  preferredFoot: '左' | '右'; // 惯用脚 (必填)
  height?: number;           // 身高 (cm)
  weight?: number;           // 体重 (kg)
  nickname?: string;         // 昵称

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
  
  linkedDesignId?: string; // NEW: Link to a visual design
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

// --- Session Design Types (NEW) ---

export type PitchType = 'Full' | 'Half' | 'Box' | 'Portrait';

// Expanded Element Types based on image
export type ElementType = 
  | 'Player' | 'GK' | 'Neutral' | 'Coach' 
  | 'Ball' 
  | 'Cone' | 'Marker' | 'Pole' 
  | 'AgilityRing' | 'Ladder' | 'Hurdle' | 'Mannequin' | 'Rebounder' 
  | 'Goal' | 'MiniGoal' 
  | 'Text' | 'Zone';

// Expanded Line Types
export type LineType = 'Pass' | 'Run' | 'Dribble' | 'Boundary';

export interface DesignElement {
    id: string;
    type: ElementType;
    x: number; // Percentage 0-100
    y: number; // Percentage 0-100
    rotation: number; // Degrees
    scale?: number; // 1 = default
    color?: string; // Custom color
    label?: string; // e.g. player number
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
    elements: DesignElement[];
    lines: DesignLine[];
    description: string;
    keyPoints: string[];
    createdAt: string;
    authorId?: string;
    thumbnail?: string; // Optional base64 preview
}

// --- Auth Types ---

export type UserRole = 'director' | 'coach' | 'parent';

export interface User {
  id: string;
  username: string; // For login
  password?: string; // For login
  name: string;
  role: UserRole;
  teamIds?: string[]; // Updated: Supports multiple teams for coaches
  playerId?: string; // For parents, which player they view
}
