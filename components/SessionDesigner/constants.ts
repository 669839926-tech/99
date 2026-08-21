import { PitchType, PitchTheme, DrillDesign } from '../../types';

export interface PitchThemeConfig {
  id: PitchTheme;
  name: string;
  bgColor: string;
  lineColor: string;
  stripeColor?: string;
  previewBg: string;
  isStripe?: boolean;
}

export const PITCH_THEMES: PitchThemeConfig[] = [
  {
    id: 'White',
    name: '经典白',
    bgColor: '#ffffff',
    lineColor: '#1f2937',
    previewBg: '#ffffff'
  },
  {
    id: 'Black',
    name: '极简黑白',
    bgColor: '#111827',
    lineColor: '#ffffff',
    previewBg: '#111827'
  },
  {
    id: 'Grey',
    name: '灰色',
    bgColor: '#4b5563',
    lineColor: '#e5e7eb',
    previewBg: '#4b5563'
  },
  {
    id: 'Grass',
    name: '经典草地',
    bgColor: '#2f855a',
    lineColor: '#ffffff',
    stripeColor: '#276749',
    previewBg: '#2f855a',
    isStripe: true
  },
  {
    id: 'Blue',
    name: '天青蓝',
    bgColor: '#1e40af',
    lineColor: '#ffffff',
    stripeColor: '#1d4ed8',
    previewBg: '#1e40af',
    isStripe: true
  },
  {
    id: 'VibrantGreen',
    name: '青翠绿',
    bgColor: '#15803d',
    lineColor: '#ffffff',
    stripeColor: '#166534',
    previewBg: '#15803d',
    isStripe: true
  }
];

export interface PitchLayoutConfig {
  id: PitchType;
  name: string;
  category: 'standard' | 'box' | 'half' | 'special';
  badge?: string;
  aspectRatio: string; // e.g. '16/10', '1/1', '4/3'
}

export const PITCH_LAYOUTS: PitchLayoutConfig[] = [
  { id: 'Midfield', name: '中场', category: 'standard', aspectRatio: '16/10' },
  { id: 'DefensiveThird', name: '防守三区', category: 'standard', aspectRatio: '16/10' },
  { id: 'AttackingThird', name: '进攻三区', category: 'standard', aspectRatio: '16/10' },
  { id: 'Full', name: '完整球场', category: 'standard', aspectRatio: '16/10' },
  { id: 'HalfDefend', name: '半场 (防守)', category: 'half', aspectRatio: '16/10' },
  { id: 'HalfAttack', name: '半场 (进攻)', category: 'half', aspectRatio: '16/10' },
  { id: 'Futsal', name: '五人制球场', category: 'standard', aspectRatio: '16/10' },
  { id: 'SquareBox', name: '空白正方形', category: 'box', aspectRatio: '1/1' },
  { id: 'RectangleBox', name: '空白长方形', category: 'box', aspectRatio: '16/10' },
  { id: 'AdvRectangle', name: '空白长方形 (进阶)', category: 'box', aspectRatio: '16/10' },
  { id: 'DualRectangle', name: '双长方形 (进阶)', category: 'box', aspectRatio: '16/10' },
  { id: 'Portrait', name: '完整球场 (纵向)', category: 'standard', aspectRatio: '10/16' },
  { id: 'TwoThirdsDefend', name: '三分之二场 (防守)', category: 'half', aspectRatio: '16/10' },
  { id: 'TwoThirdsAttack', name: '三分之二场 (进攻)', category: 'half', aspectRatio: '16/10' },
  { id: 'TwoThirdsHorizontal', name: '三分之二场 (横向)', category: 'half', aspectRatio: '16/10' },
  { id: 'FutsalVertical', name: '五人制球场 (纵向)', category: 'standard', aspectRatio: '10/16' },
  { id: 'Triangle', name: '三角形', category: 'special', aspectRatio: '1/1' },
  { id: 'Diamond', name: '菱形', category: 'special', aspectRatio: '1/1' },
  { id: 'Trapezoid', name: '梯形', category: 'special', aspectRatio: '16/10' },
  { id: 'GridType1', name: '类型一', category: 'special', aspectRatio: '16/10' },
  { id: 'GridType2', name: '类型二', category: 'special', aspectRatio: '16/10' },
  { id: 'GridType3', name: '类型三', category: 'special', aspectRatio: '16/10' },
  { id: 'GridType4', name: '类型四', category: 'special', aspectRatio: '16/10' },
  { id: 'GridType5', name: '类型五', category: 'special', aspectRatio: '16/10' }
];

export const DRILL_STAGES = [
  { id: 'warmup', name: '热身环节', short: '热身', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { id: 'technical', name: '技术环节', short: '技术', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'skill', name: '技能环节', short: '技能', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: 'opposed', name: '情景对抗', short: '对抗', color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { id: 'scrimmage', name: '小比赛', short: '比赛', color: 'text-rose-600 bg-rose-50 border-rose-200' }
];

export const TRAINING_TOPICS = [
  '传控', '停球', '运球', '射门', '速度', '突破', 
  '防守', '空间移动', '发球接应', '协调性', '1v1', '守门', '体能'
];

export const AGE_GROUPS = [
  '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18+'
];

export const PRESET_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#facc15', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#111827', // Black
  '#ffffff', // White
  '#6b7280', // Gray
  '#78350f'  // Brown
];

export const INITIAL_PRESET_DRILLS: DrillDesign[] = [
  {
    id: 'drill-preset-1',
    title: '技能: 1v1+1 (回避防守人) 运球变向加速突破训练U8+',
    category: 'drill_item',
    contentType: 'drill',
    pitchType: 'Midfield',
    pitchTheme: 'Grass',
    elements: [
      { id: 'p1', type: 'PlayerCircle', x: 25, y: 50, rotation: 0, scale: 1, color: '#3b82f6', label: '10' },
      { id: 'p2', type: 'PlayerCircle', x: 50, y: 50, rotation: 0, scale: 1, color: '#ef4444', label: 'X' },
      { id: 'p3', type: 'PlayerCircle', x: 75, y: 50, rotation: 0, scale: 1, color: '#facc15', label: 'N' },
      { id: 'b1', type: 'Ball', x: 28, y: 52, rotation: 0, scale: 1, color: '#ffffff' },
      { id: 'c1', type: 'Cone', x: 20, y: 30, rotation: 0, scale: 1, color: '#f97316' },
      { id: 'c2', type: 'Cone', x: 80, y: 30, rotation: 0, scale: 1, color: '#f97316' },
      { id: 'c3', type: 'Cone', x: 20, y: 70, rotation: 0, scale: 1, color: '#f97316' },
      { id: 'c4', type: 'Cone', x: 80, y: 70, rotation: 0, scale: 1, color: '#f97316' }
    ],
    lines: [
      { id: 'l1', type: 'Dribble', startX: 28, startY: 52, endX: 45, endY: 38, color: '#3b82f6' },
      { id: 'l2', type: 'Pass', startX: 45, startY: 38, endX: 72, endY: 48, color: '#facc15' }
    ],
    description: '通过设置中立球员与防守队员，培养进攻球员在高速运球中阅读防守重心、主动选择变向摆脱并完成穿透出球的能力。',
    keyPoints: [
      '第一触球快速向前，抬头观察防守人距离与重心',
      '变向动作坚决果断，利用身体隔绝防守人',
      '变向后第一时间抬头寻找接应点快速出球'
    ],
    ageGroups: ['7', '8', '9', '10', '11'],
    topic: '1v1',
    drillStage: 'skill',
    durationMinutes: 15,
    fieldLength: 20,
    fieldWidth: 15,
    playerCount: 8,
    ballCount: 6,
    coneCount: 8,
    equipmentNotes: '标志盘8个、足球6个、分队背心3色',
    organization: '1. 在20x15米区域内，两端各设一条端线。\n2. 进攻队员从一端运球出发，防守队员在中间限制区内防守。\n3. 进攻队员可利用变速变向突破防守人，或与远端中立队员做撞墙配合后越过端线。\n4. 防守断球后反向进攻端线。',
    coachingPoints: '1. 运球推进时步频快、重心低，触球点位于脚背外侧或内侧。\n2. 接近防守人前预设变向假动作，拉开防守重心后瞬间加速。\n3. 与中立队友呼应，传球力量精准，出球后迅速前插。',
    progressions: '1. 限制进攻球员必须在3次触球内完成变向或传球。\n2. 防守队员升级为全场紧逼防守。\n3. 增加第二名防守队员形成局部2v2。',
    createdAt: '2026-04-03',
    isPrivate: false
  },
  {
    id: 'drill-preset-2',
    title: '技术: 进攻三区 2v1 传切配合与第三人前插射门U10+',
    category: 'drill_item',
    contentType: 'drill',
    pitchType: 'AttackingThird',
    pitchTheme: 'Grass',
    elements: [
      { id: 'p1', type: 'PlayerCircle', x: 20, y: 65, rotation: 0, scale: 1, color: '#3b82f6', label: '8' },
      { id: 'p2', type: 'PlayerCircle', x: 45, y: 35, rotation: 0, scale: 1, color: '#3b82f6', label: '9' },
      { id: 'p3', type: 'PlayerCircle', x: 40, y: 55, rotation: 0, scale: 1, color: '#ef4444', label: '4' },
      { id: 'p4', type: 'GK', x: 88, y: 50, rotation: 0, scale: 1, color: '#facc15', label: 'GK' },
      { id: 'g1', type: 'Goal', x: 92, y: 50, rotation: 0, scale: 1, color: '#ffffff' },
      { id: 'b1', type: 'Ball', x: 23, y: 64, rotation: 0, scale: 1, color: '#ffffff' }
    ],
    lines: [
      { id: 'l1', type: 'Pass', startX: 23, startY: 64, endX: 43, endY: 37, color: '#3b82f6' },
      { id: 'l2', type: 'Run', startX: 20, startY: 65, endX: 55, endY: 60, color: '#3b82f6' },
      { id: 'l3', type: 'Pass', startX: 45, startY: 35, endX: 62, endY: 58, color: '#3b82f6' }
    ],
    description: '通过局部二过一配合与套边前插，训练球员在进攻三区撕开防线、创造射门机会的默契度。',
    keyPoints: [
      '传球后立即跑动前插（Give and Go）',
      '接球中锋做墙回做角度精准',
      '射门脚型稳定，果断起脚打门'
    ],
    ageGroups: ['9', '10', '11', '12', '13', '14'],
    topic: '传控',
    drillStage: 'technical',
    durationMinutes: 20,
    fieldLength: 35,
    fieldWidth: 25,
    playerCount: 10,
    ballCount: 8,
    coneCount: 12,
    equipmentNotes: '标准球门1座、标志碟12个、足球8个',
    organization: '1. 进攻三区禁区弧顶外25米开始，持球队员传球给接应中锋。\n2. 中锋一脚斜塞回做给前插队员。\n3. 前插队员迎球在防守补位前果断打门。\n4. 防守队员在禁区线拦截。',
    coachingPoints: '1. 传球脚法与时机，跑位要与传球同步。\n2. 射门动作干脆，支撑脚站位准确。',
    progressions: '1. 防守人由半消极升级为全对抗。\n2. 增加弱侧边路包抄队员。',
    createdAt: '2026-04-03',
    isPrivate: false
  }
];

export const INITIAL_PRESET_PLANS: DrillDesign[] = [
  {
    id: 'plan-preset-1',
    title: 'U9梯队: 进攻三区变向突破与二人传切主题课',
    category: 'session_plan',
    contentType: 'session_plan',
    pitchType: 'Full',
    pitchTheme: 'Grass',
    elements: [],
    lines: [],
    description: '本堂教案旨在强化队员在进攻三区面对紧逼防守时的个人自信突破与二过一配合默契，提升临门一脚果断性。',
    keyPoints: [
      '热身环节注重球感协调与小步频',
      '技术环节强调传球时机与跑位呼应',
      '技能环节加强1v1决策',
      '小比赛中要求充分运用边中结合'
    ],
    totalDuration: 90,
    targetAge: 'U9 (8-9岁)',
    sessionStages: [
      {
        id: 's1',
        name: '1. 热身环节',
        duration: 15,
        focus: '动态拉伸 + 变向球感熟悉',
        drillIds: [],
        coachNotes: '重点关注踝关节与膝关节活动开，运球节奏轻快'
      },
      {
        id: 's2',
        name: '2. 技术环节',
        duration: 20,
        focus: '2v1 传切配合与前插跑位',
        drillIds: ['drill-preset-2'],
        coachNotes: '传球力量适度，确保接球队员顺畅跑动起脚'
      },
      {
        id: 's3',
        name: '3. 技能环节',
        duration: 20,
        focus: '1v1+1 (回避防守人) 变向加速突破',
        drillIds: ['drill-preset-1'],
        coachNotes: '鼓励进攻队员敢于在防守压迫下做变向动作'
      },
      {
        id: 's4',
        name: '4. 情景对抗',
        duration: 20,
        focus: '半场 3v3+2自由人 攻防转换',
        drillIds: [],
        coachNotes: '丢球后就地反抢，断球后迅速找自由人'
      },
      {
        id: 's5',
        name: '5. 小比赛',
        duration: 15,
        focus: '5v5 真实比赛（奖励二过一配合进球）',
        drillIds: [],
        coachNotes: '通过二过一形成的进球算2分，强化本课主题'
      }
    ],
    createdAt: '2026-04-03',
    isPrivate: false
  }
];
