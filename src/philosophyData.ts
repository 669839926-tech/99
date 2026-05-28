export interface MatchPrinciple {
  code: string;
  stage: '进攻' | '攻转守' | '防守' | '守转攻';
  name: string;
  description: string;
}

export interface AgeFocus {
  stage: string;
  u8: string;
  u9_u10: string;
}

export interface BasicTechItem {
  code: string;
  focus: string;
  theme: string;
  u8: '重点' | '掌握' | '引入' | '深化' | '掌握/深化' | '引入/重点' | '重点/掌握' | string;
  u9_u10: '重点' | '掌握' | '引入' | '深化' | '掌握/深化' | '引入/重点' | '重点/掌握' | string;
  u11_u12: '重点' | '掌握' | '引入' | '深化' | '掌握/深化' | '引入/重点' | '重点/掌握' | string;
  objective: string;
  teachingPoints: string;
  problem: string;
  scenario: string;
  coachCue: string;
}

export interface ScenarioTheme {
  code: string;
  stage: '进攻' | '攻转守' | '防守' | '守转攻';
  moment: string;
  theme: string;
  u8: string;
  u9_u10: string;
  u11_u12: string;
  principle: string;
  objective: string;
  problem: string;
  cue: string;
  typicalError: string;
  trainingFormat: string;
  technicalMatch: string;
}

// 1. Core Match Principles (P01 - P20)
export const MATCH_PRINCIPLES: MatchPrinciple[] = [
  { code: 'P01', stage: '进攻', name: '敢于控球与主动处理球', description: '球员在合理风险内敢接球、敢处理，不轻易盲目开大脚。' },
  { code: 'P02', stage: '进攻', name: '拉开宽度与深度', description: '进攻时通过横向宽度和纵向深度扩大可用空间，避免全队围球。' },
  { code: 'P03', stage: '进攻', name: '接球前观察', description: '接球前扫描球、队友、对手和空间，为第一脚处理做准备。' },
  { code: 'P04', stage: '进攻', name: '持球人身边形成支援', description: '持球人左右或身后至少有可传接应点，形成三角关系。' },
  { code: 'P05', stage: '进攻', name: '开放式身体朝向与第一脚为下一步服务', description: '接球时半转身，第一脚触球指向前方、空当或安全出球方向。' },
  { code: 'P06', stage: '进攻', name: '能向前就向前', description: '优先选择向前带球、向前传球或向前跑动，不能向前再横传或回传。' },
  { code: 'P07', stage: '进攻', name: '传球后继续移动', description: '传球不是动作结束，而是下一次接应、前插或换位的开始。' },
  { code: 'P08', stage: '进攻', name: '带球吸引防守后分球', description: '持球人通过正面带球制造威胁，吸引防守后把球传给更好位置队友。' },
  { code: 'P09', stage: '进攻', name: '创造机会后果断终结', description: '进入射门区要快速观察、调整和完成射门，门前队友形成包抄补射。' },
  { code: 'P10', stage: '攻转守', name: '最近人立即压迫', description: '丢球瞬间最近球员第一时间向持球人施压，延缓或抢回球权。' },
  { code: 'P11', stage: '攻转守', name: '附近队友围抢与封线', description: '周围队友不是全部扑球，而是形成包围并封堵对手向前传球线路。' },
  { code: 'P12', stage: '攻转守', name: '快速回位保护中路', description: '反抢未成功时立刻回收，优先保护中路、球门和危险空间。' },
  { code: 'P13', stage: '防守', name: '先延缓再抢断', description: '第一防守人控制距离 and 方向，先减慢对手速度，不盲目出脚。' },
  { code: 'P14', stage: '防守', name: '一人上抢一人保护', description: '第一防守人压迫，第二防守人保护其身后和内线。' },
  { code: 'P15', stage: '防守', name: '保持紧凑，优先保护中路', description: '防守整体缩小有效空间，优先封堵中路和球门前危险区域。' },
  { code: 'P16', stage: '防守', name: '侧身逼边，限制对手方向', description: '通过身体朝向和站位把对手引导到边路或弱势方向。' },
  { code: 'P17', stage: '防守', name: '门前先盯人再处理球', description: '门前防守既看球也看人，优先占住身前位置，及时解围或封堵。' },
  { code: 'P18', stage: '守转攻', name: '抢到球第一眼看前方', description: '夺回球后先观察前方空间和队友跑动，判断能否快速攻击。' },
  { code: 'P19', stage: '守转攻', name: '有空间快速推进或斜直传', description: '有空间时通过带球推进、斜向传球或直传攻击对手身后。' },
  { code: 'P20', stage: '守转攻', name: '快攻不成，保护球权重新组织', description: '若前方无机会或风险过高，应保护球权、回传支援点并重新组织。' }
];

// 2. Headings for the overall philosophy overview for U12 BVB-style training
export const PHILOSOPHY_OVERVIEW = {
  title: "顽石之光 U12 以下比赛模型总纲",
  slogan: "以主动控球培养技术自信，以向前意识提升进攻效率，以局部配合形成团队连接，以快速转换提升比赛竞争力。",
  sections: [
    {
      stage: "进攻阶段",
      focus: "本方控球时如何组织、推进与创造机会",
      professional: "通过宽度、深度、支援角度、接球方向和传跑连续完成有目的推进。",
      childExpression: "敢拿球、先看前面、会帮队友。不挤在一起，队友拿球我给出口，能向前就向前。",
      drills: "技术导入 + 小场景对抗 + 条件比赛 + 赛后复盘",
      avoid: "只靠大脚找快马；为了传控而无目的倒脚；过早复杂位置打法；所有人围球；传完站着；盲目带入死角"
    },
    {
      stage: "攻转守阶段",
      focus: "本方丢球后的即时反应",
      professional: "就近反抢、压迫持球人、封堵前传线路；反抢失败后快速回位保护中路。",
      childExpression: "丢球后先抢5秒，抢不到赶快回到位置。",
      drills: "丢球反抢、围抢封线、回追落位",
      avoid: "丢球后抱怨、停顿、只看球不保护身后"
    },
    {
      stage: "防守阶段",
      focus: "对方控球时如何限制对手",
      professional: "以延缓、压迫、保护、紧凑和中路优先为基本防守逻辑。",
      childExpression: "一人上去挡，一人后面帮；先保护球门中间。",
      drills: "1v1延缓、一人上抢一人保护、逼边、防守整体移动",
      avoid: "多人同时扑抢；只盯球不盯人；防线拉得过散"
    },
    {
      stage: "守转攻阶段",
      focus: "抢回球后的第一反应",
      professional: "优先观察前方空间和队友跑动，有条件则快速推进或斜直传，机会消失后重新组织控球。",
      childExpression: "抢到球先看前面，能带就带，能传就传。",
      drills: "抢球后第一脚向前、快速反击、快攻失败保护球权",
      avoid: "抢到球后低头乱带；盲目回传；错过前插队友"
    },
    {
      stage: "训练结构",
      focus: "基础技术与场景训练的高效结合",
      professional: "基础技术解决动作质量，场景主题解决比赛应用；二者共同服务比赛原则。",
      childExpression: "先把动作做好，再学会比赛里怎么用。",
      drills: "每节课建议流程：主题激活 → 技术导入 → 场景对抗 → 条件比赛 → 复盘",
      avoid: "只练动作不对抗；只踢比赛不纠错"
    }
  ]
};

// 3. Early Over-Demands Warnings ("不宜过早要求" section from pages 11 & 12)
export const EARLY_WARNINGS = [
  "不要求后场复杂短传出球。",
  "不讲复杂肋部/位置轮转。",
  "不要求每次都做到职业级频率。",
  "不要求复杂位置流动。",
  "不要求全员一脚出球。",
  "不鼓励所有球都硬打身后。",
  "不要求复杂第三人。",
  "不把带球吸引等同于个人单干。",
  "不追求花哨射门动作。",
  "不要求小年龄高位压迫体系。",
  "不要求复杂集体逼抢陷阱。",
  "不要求成人队形移动。",
  "不鼓励铲球和高风险抢断。",
  "不要求复杂区域防守。",
  "不强调成人低位防守阵型。",
  "不要求复杂迫抢触发点。",
  "不要求高空对抗过激。",
  "不要求每次抢回都快攻。",
  "不把反击变成盲目大脚。",
  "不因回传就批评球员。"
];

// 4. Basic Technical Training Theme Library (YK1-YK14)
export const BASIC_TECH_THEMES: BasicTechItem[] = [
  {
    code: 'YK1', focus: '运控球', theme: '球感启蒙', u8: '重点', u9_u10: '掌握', u11_u12: '深化',
    objective: '建立多部位触球能力与控球兴趣，为后续运控、变向、摆脱打基础。',
    teachingPoints: '多部位触球；左右脚均衡；小步频；抬头感知；动作游戏化。',
    problem: '低头盯球、触球僵硬、控球距离过大，比赛中不敢拿球。',
    scenario: '1v1突破、带球推进、抢球后向前',
    coachCue: '触球次数、左右脚使用、是否敢于带球'
  },
  {
    code: 'YK2', focus: '运控球', theme: '基础运球与方向控制', u8: '重点', u9_u10: '掌握', u11_u12: '深化',
    objective: '让球员能在低压力下带球朝目标方向前进，并保持球在可控范围。',
    teachingPoints: '触球轻而密；球在身体前侧1米内；身体重心低；抬头观察方向。',
    problem: '带球跑偏、球离脚远、遇到对手就停滞。',
    scenario: '带球推进、边路突破',
    coachCue: '球是否在可控范围；能否按目标方向前进'
  },
  {
    code: 'YK3', focus: '运控球', theme: '高速运球', u8: '引入', u9_u10: '重点', u11_u12: '掌握/深化',
    objective: '培养球员在有空间时快速向前推进的能力。',
    teachingPoints: '大步推进与小步调整结合；触球在奔跑线路前方；抬头观察空当；最后一步减速控制。',
    problem: '抢到球后推进慢，空当出现时不敢向前带。',
    scenario: '守转攻带球推进、快速反击',
    coachCue: '是否利用前方空间；推进后能否完成传/射'
  },
  {
    code: 'YK4', focus: '运控球', theme: '节奏变化控制', u8: '引入', u9_u10: '重点', u11_u12: '掌握/深化',
    objective: '通过快慢变化打乱防守节奏，创造突破或传球窗口。',
    teachingPoints: '慢中突然加速；身体假动作配合；触球节奏变化；观察防守重心。',
    problem: '带球节奏单一，防守队员容易预判。',
    scenario: '1v1突破、带球吸引分球',
    coachCue: '是否能诱导防守重心变化'
  },
  {
    code: 'YK5', focus: '运控球', theme: '变向加速', u8: '引入', u9_u10: '重点', u11_u12: '掌握/深化',
    objective: '提升球员变向后摆脱防守的爆发能力。',
    teachingPoints: '变向前降重心；变向触球明确；变向后第一步加速；用身体保护球。',
    problem: '变向后没有加速，摆脱距离不够。',
    scenario: '边路突破、1v1正面突破',
    coachCue: '变向后是否真正甩开防守'
  },
  {
    code: 'YK6', focus: '运控球', theme: '高速运球变向', u8: '引入', u9_u10: '重点', u11_u12: '掌握',
    objective: '培养高速推进中改变线路并继续控制球的能力。',
    teachingPoints: '提前观察空间；变向触球幅度合理；速度下降与再次启动衔接；身体平衡。',
    problem: '高速推进中丢球，无法在速度下调整方向。',
    scenario: '反击推进、边路突破',
    coachCue: '高速状态下球是否仍可控'
  }
];

// 5. Scenario Training Themes Map (B01 - B33 in legacy, now JG1 - SZG5) - FULL Baseline from the CSV file
export const SCENARIO_THEMES: ScenarioTheme[] = [
  {
    code: 'JG1', stage: '进攻', moment: '组织进攻', theme: '后场支援出球', u8: '引入', u9_u10: '重点', u11_u12: '掌握',
    principle: '敢于控球与主动处理球；持球人身边形成支援。',
    objective: '从门将/后卫开始通过合理站位和短传推进，减少盲目开大脚。',
    problem: '后场球员无接应、被压迫后大脚处理。',
    cue: '后卫接球时两侧是否有接应；第一脚是否停死；是否有无压力大脚。',
    typicalError: '后卫背身接球、边路无人接应、中场站在防守影子里。',
    trainingFormat: '3v1/4v2出球；5v5从门将开始；后场出球得分线。',
    technicalMatch: '脚弓短传、开放式接球、远脚接球、接应角度'
  },
  {
    code: 'JG2', stage: '进攻', moment: '组织进攻', theme: '接球前观察与开放式接球', u8: '引入', u9_u10: '重点', u11_u12: '掌握/深化',
    principle: '接球前观察；开放式身体朝向与第一脚为下一步服务。',
    objective: '提升接球前扫描、身体半转和第一脚向前处理能力。',
    problem: '接球后才看，被抢断或只能回传。',
    cue: '接球前是否扫视；身体是否半转；第一脚方向。',
    typicalError: '正面/背身停死，第一脚停向防守压力。',
    trainingFormat: '颜色扫描接球；三角传接；4v2压力下出球。',
    technicalMatch: '接球前观察、开放式接球、第一脚触球'
  },
  {
    code: 'JG3', stage: '进攻', moment: '组织进攻', theme: '持球人两侧支援与三角接应', u8: '引入', u9_u10: '重点', u11_u12: '掌握/深化',
    principle: '持球人左右两侧要有出球点。',
    objective: '让持球球员始终拥有至少两个可用传球选择。',
    problem: '持球人孤立无援，被迫带死或大脚。',
    cue: '持球人接球瞬间周围是否形成三角；接应是否站在防守影子外。',
    typicalError: '三人站一条线；接应距离过近或过远。',
    trainingFormat: '3v1抢圈；3v2方向性推进；4v4+2中立人。',
    technicalMatch: '短传、接球、移动接应、身体朝向'
  },
  {
    code: 'JG4', stage: '进攻', moment: '组织进攻', theme: '拉开宽度与纵深、去空当接应', u8: '引入', u9_u10: '重点', u11_u12: '掌握/深化',
    principle: '进攻时不拥挤，去最大可用空间接球。',
    objective: '通过宽度、深度和空当接应拉开防守结构。',
    problem: '全队围球，空间被自己压缩。',
    cue: '进攻宽度是否有人保持；前后层次是否清晰；是否有人去空当。',
    typicalError: '所有人靠近球，弱侧无人，前锋与中场距离重叠。',
    trainingFormat: '4v4四门比赛；区域占位游戏；宽度得分规则。',
    technicalMatch: '移动接应、无球跑动、第一脚触球'
  },
  {
    code: 'JG5', stage: '进攻', moment: '组织进攻', theme: '控球转移弱侧', u8: '引入', u9_u10: '引入/重点', u11_u12: '重点/掌握',
    principle: '对手压一侧时，寻找另一侧空间。',
    objective: '培养球员从强侧压力中转移到弱侧的空间意识。',
    problem: '球总在拥挤一侧，被连续围抢。',
    cue: '强侧人数密集时是否有回传/横传转弱侧；弱侧是否有人保持宽度。',
    typicalError: '弱侧球员内收过早；转移球力量不足。',
    trainingFormat: '5v5+2转移得分；强弱侧转换小场。',
    technicalMatch: '斜传、长传基础、弱侧保持宽度'
  },
  {
    code: 'JG6', stage: '进攻', moment: '组织/渗透', theme: '斜向传球向前推进', u8: '引入', u9_u10: '重点', u11_u12: '掌握',
    principle: '优先寻找斜向和向前线路。',
    objective: '通过斜传同时改变方向和推进层次。',
    problem: '横传多、无法打破防线。',
    cue: '传球是否打破防线；接球点是否在防线间或身后. ',
    typicalError: '传球横向无目的；传到队友身后脚。',
    trainingFormat: '3v2斜向推进；穿越线得分；限制横传次数。',
    technicalMatch: '斜向短传、渗透传球、接应时机'
  },
  {
    code: 'JG7', stage: '进攻', moment: '组织/渗透', theme: '先跑位再传球', u8: '引入', u9_u10: '重点', u11_u12: '掌握/深化',
    principle: '无球队员先跑出线路，持球人再传。',
    objective: '建立跑动创造传球线路的习惯。',
    problem: '站着等球，传球线路被封。',
    cue: '传球前接接应者是否主动移动；传球是否传到跑动线路。',
    typicalError: '跑动太晚；传球先出而队友未启动。',
    trainingFormat: '三人跑位传球；2v1传跑；4v4跑位后传球得分。',
    technicalMatch: '无球跑动、传球时机、斜传直插'
  },
  {
    code: 'JG8', stage: '进攻', moment: '组织/渗透', theme: '传球后继续移动', u8: '引入', u9_u10: '重点', u11_u12: '掌握/深化',
    principle: '传球不是结束，传后继续参与。',
    objective: '让球员传球后前插、支援或换位，保持进攻连续。',
    problem: '传完球站着看，局部配合断裂。',
    cue: '传球后3秒内是否再次移动；是否形成二次接应点。',
    typicalError: '传后原地停留；所有人只盯球不移动。',
    trainingFormat: '传跑循环；二过一；4v4传后不动进球不算。',
    technicalMatch: '脚弓短传、启动、接应角度'
  },
  {
    code: 'JG9', stage: '进攻', moment: '组织/渗透', theme: '墙式二过一突破', u8: '引入', u9_u10: '重点', u11_u12: '掌握/深化',
    principle: '通过传球后前插制造局部人数优势。',
    objective: '在1v1受阻时借助队友完成突破。',
    problem: '持球人只会单打，队友支援无效。',
    cue: '传球后是否前插到防守身后；墙球是否一脚回做。',
    typicalError: '传球后不跑；接应者停球过多。',
    trainingFormat: '2v1通道；3v2二过一；边路二过一攻门。',
    technicalMatch: '脚弓短传、传球后移动、接球'
  },
  {
    code: 'JG10', stage: '进攻', moment: '组织/渗透', theme: '第三人接应启蒙', u8: '引入', u9_u10: '引入/重点', u11_u12: '重点/掌握',
    principle: '直接线路被封时，通过第三人向前。',
    objective: '让U11-U12开始理解第三人线路和间接推进。',
    problem: '两人之间被封死后没有第三选择。',
    cue: '持球、接应、第三人是否形成三角；第三人是否提前移动。',
    typicalError: '第三人站得太远或太晚启动。',
    trainingFormat: '4v2+1；4v4+3位置游戏；第三人接球得分。',
    technicalMatch: '一脚出球、创造第三人线路、接球前观察'
  },
  {
    code: 'JG11', stage: '进攻', moment: '突破进攻', theme: '正面持球吸引防守后分球', u8: '引入', u9_u10: '重点', u11_u12: '掌握',
    principle: '持球正面威胁牵制对手，解放队友。',
    objective: '通过带球吸引一名防守后及时传给空位队友。',
    problem: '持球人侧向带死、传球角度被封。',
    cue: '持球人是否正面压向防守；防守被吸引后是否分球。',
    typicalError: '只顾自己过人；吸引后不抬头；队友不拉开。',
    trainingFormat: '2v1吸引分球；3v2局部进攻；吸引助攻得2分。',
    technicalMatch: '变速运球、1v1突破、脚弓短传'
  },
  {
    code: 'JG12', stage: '进攻', moment: '突破进攻', theme: '1v1正面突破创造空间', u8: '引入', u9_u10: '重点', u11_u12: '掌握/深化',
    principle: '敢于用个人能力解决局部问题。',
    objective: '提升正面突破、摆脱 and 突破后连接能力。',
    problem: '遇到防守就回传或盲目带入人堆。',
    cue: '是否敢于正面挑战；过人后是否连接传/射。',
    typicalError: '低头带球；过人后不加速；突破方向单一。',
    trainingFormat: '1v1通道；边路1v1攻门；突破后传射。',
    technicalMatch: '假动作过人、加速变向、运球射门'
  },
  {
    code: 'JG13', stage: '进攻', moment: '突破进攻', theme: '边路突破与中路接应', u8: '引入', u9_u10: '重点', u11_u12: '掌握',
    principle: '利用宽度创造空间，再攻击门前。',
    objective: '边路突破后通过传中/倒三角找到中路队友。',
    problem: '边路突破后盲目射门，中路无人包抄。',
    cue: '边路突破时中路是否有前点/倒三角/后点；传球是否有目标。',
    typicalError: '边路低头下底；中路球员站着等。',
    trainingFormat: '边路2v1；3v2边路攻门；边路进球双倍。',
    technicalMatch: '1v1突破、倒三角、脚弓推射'
  },
  {
    code: 'JG14', stage: '进攻', moment: '突破进攻', theme: '背身接球转身或回做', u8: '引入', u9_u10: '重点', u11_u12: '掌握',
    principle: '背身接球时根据压力选择转身、护球或回做。',
    objective: '培养前锋/中场背身支点能力。',
    problem: '背身接球被抢或盲目强转。',
    cue: '接球前是否观察；防守贴近时是否先护球；转身时机。',
    typicalError: '不看身后强行转身；回做后不再移动。',
    trainingFormat: '背身1v1；3v2支点回做；前锋回撤+前插。',
    technicalMatch: '背身接球转身、护球、脚弓短传'
  },
  {
    code: 'JG15', stage: '进攻', moment: '射门得分', theme: '接球后快速射门', u8: '引入', u9_u10: '重点', u11_u12: '掌握/深化',
    principle: '创造机会后果断完成终结。',
    objective: '减少调整触球，提升接球后第一时间射门能力。',
    problem: '机会出现后调整过多，被防守封堵。',
    cue: '接球到射门触球次数；射门前是否观察门将。',
    typicalError: '停球方向差；抬脚慢；只看球不看门。',
    trainingFormat: '接传射门；3v2攻门；限时射门。',
    technicalMatch: '接球射门、脚弓推射、正脚背射门'
  },
  {
    code: 'JG16', stage: '进攻', moment: '射门得分', theme: '带球突破后射门', u8: '引入', u9_u10: '重点', u11_u12: '掌握/深化',
    principle: '突破后快速连接终结。',
    objective: '让带球推进与射门步点衔接。',
    problem: '突破成功后球离脚远，无法射门。',
    cue: '最后一脚触球是否为射门创造角度。',
    typicalError: '突破后还想再过人；射门步点乱。',
    trainingFormat: '1v1突破射门；带球穿门后射门。',
    technicalMatch: '运球射门、正脚背射门、变速运球'
  },
  {
    code: 'JG17', stage: '进攻', moment: '射门得分', theme: '倒三角包抄终结', u8: '引入', u9_u10: '重点', u11_u12: '掌握',
    principle: '从边路低位传回高价值射门区域。',
    objective: '提高倒三角区域接应和脚弓推射质量。',
    problem: '边路到底线后没有倒三角选择。',
    cue: '倒三角区域是否有人；射门是否第一时间。',
    typicalError: '所有人冲门线；传球传到门将。',
    trainingFormat: '边路倒三角3v2；5v5倒三角进球加分。',
    technicalMatch: '脚弓推射、包抄跑动、传中'
  },
  {
    code: 'JG18', stage: '进攻', moment: '射门得分', theme: '补射与二次进攻', u8: '引入', u9_u10: '重点', u11_u12: '掌握/深化',
    principle: '射门后继续参与，争取第二落点。',
    objective: '培养门前持续进攻和反应能力。',
    problem: '射门后停止行动，错失补射。',
    cue: '射门后是否有人跟进；门将脱手后反应. ',
    typicalError: '所有人看球不跟；二点无人保护。',
    trainingFormat: '射门反弹补射；4v4二次进攻加分。',
    technicalMatch: '补射、抢点、启动反应'
  },
  {
    code: 'GZS1', stage: '攻转守', moment: '迅速反抢', theme: '丢球后5秒反抢', u8: '引入', u9_u10: '重点', u11_u12: '掌握/深化',
    principle: '丢球后最近的人立即压迫。',
    objective: '建立丢球后第一反应，延缓或夺回球权。',
    problem: '丢球后抱怨/队友，眼睁睁看球或停顿。',
    cue: '丢球后1秒内最近人是否上抢；5秒内是否形成围抢。',
    typicalError: '丢球者原地停；队友后退过早。',
    trainingFormat: '3v3转换；4v4丢球5秒抢回得2分。',
    technicalMatch: '启动制动、抢断、身体对抗'
  },
  {
    code: 'GZS2', stage: '攻转守', moment: '迅速反抢', theme: '附近队友围抢与封线', u8: '引入', u9_u10: '重点', u11_u12: '掌握',
    principle: '一个人压迫，附近队友封传球线路。',
    objective: '让反抢从个人追球变成小组围抢。',
    problem: '最近人上抢但队友不保护，被一脚传出。',
    cue: '第二、第三防守人是否封住向前传球。',
    typicalError: '所有人追球；无人保护身后。',
    trainingFormat: '4v4+转换门；围抢封线游戏。',
    technicalMatch: '协防、封线、防守选位'
  },
  {
    code: 'GZS3', stage: '攻转守', moment: '调整阵型', theme: '反抢失败后快速回位', u8: '引入', u9_u10: '重点', u11_u12: '掌握/深化',
    principle: '抢不回来时及时回到防守位置。',
    objective: '防止反抢失败后被对手打身后。',
    problem: '反抢失败后继续乱扑，阵型散开。',
    cue: '5秒后是否回收；中路是否有人保护。',
    typicalError: '多人越抢越散；后场无人保护。',
    trainingFormat: '4v4反抢失败回位；转换门防守。',
    technicalMatch: '回追、侧向防守、团队移动'
  },
  {
    code: 'GZS4', stage: '攻转守', moment: '调整阵型', theme: '丢球后优先保护中路', u8: '引入', u9_u10: '重点', u11_u12: '掌握/深化',
    principle: '失球瞬间先保护球门和中路通道防线。',
    objective: '防止对手从中路直接反击。',
    problem: '丢球后全队被球吸引，中路空挡漏偏。',
    cue: '中路是否有人回收；持球人向前线路是否被封。',
    typicalError: '边路丢球后中路没人；后卫盯球不盯人。',
    trainingFormat: '转换中路门；丢球后封中路得分。',
    technicalMatch: '封内放外、回追、站位'
  },
  {
    code: 'FS1', stage: '防守', moment: '压迫进攻', theme: '1v1防守延缓与逼边', u8: '引入', u9_u10: '重点', u11_u12: '掌握/深化',
    principle: '先延缓，不轻易出脚，优先逼向边路。',
    objective: '提升第一防守人的基本防守质量。',
    problem: '防守一扑就被过，被对手一脚传球轻松打穿。',
    cue: '防守人距离、身体方向、是否封中路。',
    typicalError: '正面猛扑；站位平行；被一步过。',
    trainingFormat: '1v1通道防守；边路逼抢。',
    technicalMatch: '防守脚步、侧身防守、延缓'
  },
  {
    code: 'FS2', stage: '防守', moment: '压迫进攻', theme: '二防一协防与补位', u8: '引入', u9_u10: '重点', u11_u12: '掌握',
    principle: '第一人压迫，第二人保护身后确保不丢。',
    objective: '建立小组防守的压迫与保护关系。',
    problem: '两人同时上抢，被传球打穿防护。',
    cue: '第二人位置是否保护第一人身后和中路。',
    typicalError: '保护人站平线；没有沟通协作。',
    trainingFormat: '2v2防守；3v2防守；压迫保护评分。',
    technicalMatch: '二防一协防、补位、封线'
  },
  {
    code: 'FS3', stage: '防守', moment: '压迫进攻', theme: '压迫触发识别', u8: '引入', u9_u10: '引入/重点', u11_u12: '重点/掌握',
    principle: '识别背身、坏触球、边线等压迫时机。',
    objective: '让压迫更有时机和集体性协作。',
    problem: '乱压或不压，防守配合节奏不统一。',
    cue: '是否在对手坏触球/背身/边线时同步前压。',
    typicalError: '一个人冲，其他人不跟；对手轻松转移。',
    trainingFormat: '压迫触发游戏；4v4边线逼抢。',
    technicalMatch: '防守逼近、封线、沟通'
  },
  {
    code: 'FS4', stage: '防守', moment: '密集防守', theme: '防守中路优先与整体紧凑', u8: '引入', u9_u10: '重点', u11_u12: '掌握/深化',
    principle: '保护球门、中路 and 危险区域。',
    objective: '建立防守收缩和队形紧凑的基本意识。',
    problem: '防守距离过大，被中路轻松穿透。',
    cue: '队员间距；中路通道是否被封；球侧是否同步移动。',
    typicalError: '只追球不守空间；弱侧完全丢人。',
    trainingFormat: '4v4中路门防守；区域压缩游戏。',
    technicalMatch: '区域防守、封内放外、协防'
  },
  {
    code: 'FS5', stage: '防守', moment: '密集防守', theme: '门前盯人与解围', u8: '引入', u9_u10: '重点', u11_u12: '掌握',
    principle: '门前先看人再看球，及时处理核心空中或反弹球。',
    objective: '提升禁区内防守盯人和解围质量。',
    problem: '门前漏人、盯球不盯人，造成失守。',
    cue: '传中前防守人是否看人；解围是否远离危险区。',
    typicalError: '站在对手身后；解围踢回中路。',
    trainingFormat: '门前3v3传中防守；二点解围。',
    technicalMatch: '盯人防守、卡位、头球解围'
  },
  {
    code: 'FS6', stage: '防守', moment: '密集防守', theme: '小组防守整体移动', u8: '引入', u9_u10: '重点', u11_u12: '掌握',
    principle: '全队随球移动，保持横向和纵向紧凑。',
    objective: '提升U11-U12防守整体协同能力。',
    problem: '防守队形被一个长传转移拉散。',
    cue: '球转移时全队是否同步平移。',
    typicalError: '有人不上移/不回收；队形断裂。',
    trainingFormat: '4v4+2防守移动；区域移动游戏。',
    technicalMatch: '区域防守、补位、沟通'
  },
  {
    code: 'SZG1', stage: '守转攻', moment: '抢球后第一反应', theme: '抢球后第一眼向前', u8: '引入', u9_u10: '重点', u11_u12: '掌握/深化',
    principle: '夺回球权后第一时间寻找前方机会。',
    objective: '形成由守转攻的向前推进意识。',
    problem: '抢到球后不知道推进，盲目回大脚。',
    cue: '抢球后第一脚是否观察前方；是否有向前传带。',
    typicalError: '抢到球后停死；没有前插队友。',
    trainingFormat: '3v3转换；抢球后5秒攻门。',
    technicalMatch: '接球前观察、第一脚触球、直传'
  },
  {
    code: 'SZG2', stage: '守转攻', moment: '快速推进', theme: '抢球后带球推进', u8: '引入', u9_u10: '重点', u11_u12: '掌握/深化',
    principle: '有空间时快速向前带球制造传威胁射门。',
    objective: '利用对手无序防守阶段向前深度推进。',
    problem: '抢到球后不敢带，习惯性节奏变慢。',
    cue: '前方有空间时是否带球进入；推进后是否传/射。',
    typicalError: '低头带入人堆；推进后不处理丢。',
    trainingFormat: '转换带球攻门；2v1反击. ',
    technicalMatch: '高速运球、带球推进、运球射门'
  },
  {
    code: 'SZG3', stage: '守转攻', moment: '快速推进', theme: '快速直传或斜传找前插', u8: '引入', u9_u10: '重点', u11_u12: '掌握',
    principle: '有队友前插时及时向前传到位。',
    objective: '把抢断瞬间转化为身后穿透威胁。',
    problem: '前插队友出现但传球启动太慢。',
    cue: '队友启动时传球是否及时；传球是否有提前量。',
    typicalError: '持球人多带；前插者越跑越窄线。',
    trainingFormat: '3v2反击；斜传直插。',
    technicalMatch: '渗透传球、斜传直插、长传准确性'
  },
  {
    code: 'SZG4', stage: '守转攻', moment: '射门终结', theme: '快速反击中的射门', u8: '引入', u9_u10: '重点', u11_u12: '掌握',
    principle: '反击进入前场后快速、简洁、果断终结。',
    objective: '减少无效触球调整，把转换优势变为破门。',
    problem: '反击推进到前场因犹豫，防守立刻回位。',
    cue: '进入射门区后是否果断射球门；是否有人包抄。',
    typicalError: '过度传球；带球过深；无人补射。',
    trainingFormat: '3v2反击攻门；限时终结。',
    technicalMatch: '接球射门、运球射门、补射'
  },
  {
    code: 'SZG5', stage: '守转攻', moment: '重新组织', theme: '快攻受阻后的控球保护', u8: '引入', u9_u10: '重点', u11_u12: '掌握',
    principle: '快攻机会消失时，用身体和回传保护球权。',
    objective: '避免无机会硬推向前导致二次丢球防守反弹。',
    problem: '反击跑位被封仍盲目传身后或远射。',
    cue: '前方被封时是否回传/横传重新控制。',
    typicalError: '一味向前跑位堵死；无人回撤支援。',
    trainingFormat: '转换后控球保护；反击受阻回做。',
    technicalMatch: '护球、回传、弱侧转移'
  }
];

/*
    principle: '无球队员先跑出线路，持球人再传。',
    objective: '建立跑动创造传球线路的习惯。',
    problem: '站着等球，传球线路被封。',
    cue: '传球前接接应者是否主动移动；传球是否传到跑动线路。',
    typicalError: '跑动太晚；传球先出而队友未启动。',
    trainingFormat: '三人跑位传球；2v1传跑；4v4跑位后传球得分。',
    technicalMatch: '无球跑动、传球时机、斜传直插'
  },
  {
    code: 'B08', stage: '进攻', moment: '组织/渗透', theme: '传球后继续移动', u8: '引入', u9_u10: '重点', u11_u12: '掌握/深化',
    principle: '传球不是结束，传后继续参与。',
    objective: '让球员传球后前插、支援或换位，保持进攻连续。',
    problem: '传完球站着看，局部配合断裂。',
    cue: '传球后3秒内是否再次移动；是否形成二次接应点。',
    typicalError: '传后原地停留；所有人只盯球不移动。',
    trainingFormat: '传跑循环；二过一；4v4传后不动进球不算。',
    technicalMatch: '脚弓短传、启动、接应角度'
  },
  {
    code: 'B09', stage: '进攻', moment: '组织/渗透', theme: '墙式二过一突破', u8: '引入', u9_u10: '重点', u11_u12: '掌握/深化',
    principle: '通过传球后前插制造局部人数优势。',
    objective: '在1v1受阻时借助队友完成突破。',
    problem: '持球人只会单打，队友支援无效。',
    cue: '传球后是否前插到防守身后；墙球是否一脚回做。',
    typicalError: '传球后不跑；接应者停球过多。',
    trainingFormat: '2v1通道；3v2二过一；边路二过一攻门。',
    technicalMatch: '脚弓短传、传球后移动、接球'
  },
  {
    code: 'B10', stage: '进攻', moment: '组织/渗透', theme: '第三人接应启蒙', u8: '引入', u9_u10: '引入/重点', u11_u12: '重点/掌握',
    principle: '直接线路被封时，通过第三人向前。',
    objective: '让U11-U12开始理解第三人线路和间接推进。',
    problem: '两人之间被封死后没有第三选择。',
    cue: '持球、接应、第三人是否形成三角；第三人是否提前移动。',
    typicalError: '第三人站得太远或太晚启动。',
    trainingFormat: '4v2+1；4v4+3位置游戏；第三人接球得分。',
    technicalMatch: '一脚出球、创造第三人线路、接球前观察'
  },
  {
    code: 'B11', stage: '进攻', moment: '突破进攻', theme: '正面持球吸引防守后分球', u8: '引入', u9_u10: '重点', u11_u12: '掌握',
    principle: '持球正面威胁牵制对手，解放队友。',
    objective: '通过带球吸引一名防守后及时传给空位队友。',
    problem: '持球人侧向带死、传球角度被封。',
    cue: '持球人是否正面压向防守；防守被吸引后是否分球。',
    typicalError: '只顾自己过人；吸引后不抬头；队友不拉开。',
    trainingFormat: '2v1吸引分球；3v2局部进攻；吸引助攻得2分。',
    technicalMatch: '变速运球、1v1突破、脚弓短传'
  },
  {
    code: 'B12', stage: '进攻', moment: '突破进攻', theme: '1v1正面突破创造空间', u8: '引入', u9_u10: '重点', u11_u12: '掌握/深化',
    principle: '敢于用个人能力解决局部问题。',
    objective: '提升正面突破、摆脱 and 突破后连接能力。',
    problem: '遇到防守就回传或盲目带入人堆。',
    cue: '是否敢于正面挑战；过人后是否连接传/射。',
    typicalError: '低头带球；过人后不加速；突破方向单一。',
    trainingFormat: '1v1通道；边路1v1攻门；突破后传射。',
    technicalMatch: '假动作过人、加速变向、运球射门'
  },
  {
    code: 'B13', stage: '进攻', moment: '突破进攻', theme: '边路突破与中路接应', u8: '引入', u9_u10: '重点', u11_u12: '掌握',
    principle: '利用宽度创造空间，再攻击门前。',
    objective: '边路突破后通过传中/倒三角找到中路队友。',
    problem: '边路突破后盲目射门，中路无人包抄。',
    cue: '边路突破时中路是否有前点/倒三角/后点；传球是否有目标。',
    typicalError: '边路低头下底；中路球员站着等。',
    trainingFormat: '边路2v1；3v2边路攻门；边路进球双倍。',
    technicalMatch: '1v1突破、倒三角、脚弓推射'
  },
  {
    code: 'B14', stage: '进攻', moment: '突破进攻', theme: '背身接球转身或回做', u8: '引入', u9_u10: '重点', u11_u12: '掌握',
    principle: '背身接球时根据压力选择转身、护球或回做。',
    objective: '培养前锋/中场背身支点能力。',
    problem: '背身接球被抢或盲目强转。',
    cue: '接球前是否观察；防守贴近时是否先护球；转身时机。',
    typicalError: '不看身后强行转身；回做后不再移动。',
    trainingFormat: '背身1v1；3v2支点回做；前锋回撤+前插。',
    technicalMatch: '背身接球转身、护球、脚弓短传'
  },
  {
    code: 'B15', stage: '进攻', moment: '射门得分', theme: '接球后快速射门', u8: '引入', u9_u10: '重点', u11_u12: '掌握/深化',
    principle: '创造机会后果断完成终结。',
    objective: '减少调整触球，提升接球后第一时间射门能力。',
    problem: '机会出现后调整过多，被防守封堵。',
    cue: '接球到射门触球次数；射门前是否观察门将。',
    typicalError: '停球方向差；抬脚慢；只看球不看门。',
    trainingFormat: '接传射门；3v2攻门；限时射门。',
    technicalMatch: '接球射门、脚弓推射、正脚背射门'
  },
  {
    code: 'B16', stage: '进攻', moment: '射门得分', theme: '带球突破后射门', u8: '引入', u9_u10: '重点', u11_u12: '掌握/深化',
    principle: '突破后快速连接终结。',
    objective: '让带球推进与射门步点衔接。',
    problem: '突破成功后球离脚远，无法射门。',
    cue: '最后一脚触球是否为射门创造角度。',
    typicalError: '突破后还想再过人；射门步点乱。',
    trainingFormat: '1v1突破射门；带球穿门后射门。',
    technicalMatch: '运球射门、正脚背射门、变速运球'
  },
  {
    code: 'B17', stage: '进攻', moment: '射门得分', theme: '倒三角包抄终结', u8: '引入', u9_u10: '重点', u11_u12: '掌握',
    principle: '从边路低位传回高价值射门区域。',
    objective: '提高倒三角区域接应和脚弓推射质量。',
    problem: '边路到底线后没有倒三角选择。',
    cue: '倒三角区域是否有人；射门是否第一时间。',
    typicalError: '所有人冲门线；传球传到门将。',
    trainingFormat: '边路倒三角3v2；5v5倒三角进球加分。',
    technicalMatch: '脚弓推射、包抄跑动、传中'
  },
  {
    code: 'B18', stage: '进攻', moment: '射门得分', theme: '补射与二次进攻', u8: '引入', u9_u10: '重点', u11_u12: '掌握/深化',
    principle: '射门后继续参与，争取第二落点。',
    objective: '培养门前持续进攻和反应能力。',
    problem: '射门后停止行动，错失补射。',
    cue: '射门后是否有人跟进；门将脱手后反应。',
    typicalError: '所有人看球不跟；二点无人保护。',
    trainingFormat: '射门反弹补射；4v4二次进攻加分。',
    technicalMatch: '补射、抢点、启动反应'
  },
  {
    code: 'B19', stage: '攻转守', moment: '迅速反抢', theme: '丢球后5秒反抢', u8: '引入', u9_u10: '重点', u11_u12: '掌握/深化',
    principle: '丢球后最近的人立即压迫。',
    objective: '建立丢球后第一反应，延缓或夺回球权。',
    problem: '丢球后抱怨/队友，眼睁睁看球或停顿。',
    cue: '丢球后1秒内最近人是否上抢；5秒内是否形成围抢。',
    typicalError: '丢球者原地停；队友后退过早。',
    trainingFormat: '3v3转换；4v4丢球5秒抢回得2分。',
    technicalMatch: '启动制动、抢断、身体对抗'
  },
  {
    code: 'B20', stage: '攻转守', moment: '迅速反抢', theme: '附近队友围抢与封线', u8: '引入', u9_u10: '重点', u11_u12: '掌握',
    principle: '一个人压迫，附近队友封传球线路。',
    objective: '让反抢从个人追球变成小组围抢。',
    problem: '最近人上抢但队友不保护，被一脚传出。',
    cue: '第二、第三防守人是否封住向前传球。',
    typicalError: '所有人追球；无人保护身后。',
    trainingFormat: '4v4+转换门；围抢封线游戏。',
    technicalMatch: '协防、封线、防守选位'
  },
  {
    code: 'B21', stage: '攻转守', moment: '调整阵型', theme: '反抢失败后快速回位', u8: '引入', u9_u10: '重点', u11_u12: '掌握/深化',
    principle: '抢不回来时及时回到防守位置。',
    objective: '防止反抢失败后被对手打身后。',
    problem: '反抢失败后继续乱扑，阵型散开。',
    cue: '5秒后是否回收；中路是否有人保护。',
    typicalError: '多人越抢越散；后场无人保护。',
    trainingFormat: '4v4反抢失败回位；转换门防守。',
    technicalMatch: '回追、侧向防守、团队移动'
  },
  {
    code: 'B22', stage: '攻转守', moment: '调整阵型', theme: '丢球后优先保护中路', u8: '引入', u9_u10: '重点', u11_u12: '掌握/深化',
    principle: '失球瞬间先保护球门和中路通道防线。',
    objective: '防止对手从中路直接反击。',
    problem: '丢球后全队被球吸引，中路空挡漏偏。',
    cue: '中路是否有人回收；持球人向前线路是否被封。',
    typicalError: '边路丢球后中路没人；后卫盯球不盯人。',
    trainingFormat: '转换中路门；丢球后封中路得分。',
    technicalMatch: '封内放外、回追、站位'
  },
  {
    code: 'B23', stage: '防守', moment: '压迫进攻', theme: '1v1防守延缓与逼边', u8: '引入', u9_u10: '重点', u11_u12: '掌握/深化',
    principle: '先延缓，不轻易出脚，优先逼向边路。',
    objective: '提升第一防守人的基本防守质量。',
    problem: '防守一扑就被过，被对手一脚传球轻松打穿。',
    cue: '防守人距离、身体方向、是否封中路。',
    typicalError: '正面猛扑；站位平行；被一步过。',
    trainingFormat: '1v1通道防守；边路逼抢。',
    technicalMatch: '防守脚步、侧身防守、延缓'
  },
  {
    code: 'B24', stage: '防守', moment: '压迫进攻', theme: '二防一协防与补位', u8: '引入', u9_u10: '重点', u11_u12: '掌握',
    principle: '第一人压迫，第二人保护身后确保不丢。',
    objective: '建立小组防守的压迫与保护关系。',
    problem: '两人同时上抢，被传球打穿防护。',
    cue: '第二人位置是否保护第一人身后和中路。',
    typicalError: '保护人站平线；没有沟通协作。',
    trainingFormat: '2v2防守；3v2防守；压迫保护评分。',
    technicalMatch: '二防一协防、补位、封线'
  },
  {
    code: 'B25', stage: '防守', moment: '压迫进攻', theme: '压迫触发识别', u8: '引入', u9_u10: '引入/重点', u11_u12: '重点/掌握',
    principle: '识别背身、坏触球、边线等压迫时机。',
    objective: '让压迫更有时机和集体性协作。',
    problem: '乱压或不压，防守配合节奏不统一。',
    cue: '是否在对手坏触球/背身/边线时同步前压。',
    typicalError: '一个人冲，其他人不跟；对手轻松转移。',
    trainingFormat: '压迫触发游戏；4v4边线逼抢。',
    technicalMatch: '防守逼近、封线、沟通'
  },
  {
    code: 'B26', stage: '防守', moment: '密集防守', theme: '防守中路优先与整体紧凑', u8: '引入', u9_u10: '重点', u11_u12: '掌握/深化',
    principle: '保护球门、中路和危险区域。',
    objective: '建立防守收缩和队形紧凑的基本意识。',
    problem: '防守距离过大，被中路轻松穿透。',
    cue: '队员间距；中路通道是否被封；球侧是否同步移动。',
    typicalError: '只追球不守空间；弱侧完全丢人。',
    trainingFormat: '4v4中路门防守；区域压缩游戏。',
    technicalMatch: '区域防守、封内放外、协防'
  },
  {
    code: 'B27', stage: '防守', moment: '密集防守', theme: '门前盯人与解围', u8: '引入', u9_u10: '重点', u11_u12: '掌握',
    principle: '门前先看人再看球，及时处理核心空中或反弹球。',
    objective: '提升禁区内防守盯人和解围质量。',
    problem: '门前漏人、盯球不盯人，造成失守。',
    cue: '传中前防守人是否看人；解围是否远离危险区。',
    typicalError: '站在对手身后；解围踢回中路。',
    trainingFormat: '门前3v3传中防守；二点解围。',
    technicalMatch: '盯人防守、卡位、头球解围'
  },
  {
    code: 'B28', stage: '防守', moment: '密集防守', theme: '小组防守整体移动', u8: '引入', u9_u10: '重点', u11_u12: '掌握',
    principle: '全队随球移动，保持横向和纵向紧凑。',
    objective: '提升U11-U12防守整体协同能力。',
    problem: '防守队形被一个长传转移拉散。',
    cue: '球转移时全队是否同步平移。',
    typicalError: '有人不上移/不回收；队形断裂。',
    trainingFormat: '4v4+2防守移动；区域移动游戏。',
    technicalMatch: '区域防守、补位、沟通'
  },
  {
    code: 'B29', stage: '守转攻', moment: '抢球后第一反应', theme: '抢球后第一眼向前', u8: '引入', u9_u10: '重点', u11_u12: '掌握/深化',
    principle: '夺回球权后第一时间寻找前方机会。',
    objective: '形成由守转攻的向前推进意识。',
    problem: '抢到球后不知道推进，盲目回大脚。',
    cue: '抢球后第一脚是否观察前方；是否有向前传带。',
    typicalError: '抢到球后停死；没有前插队友。',
    trainingFormat: '3v3转换；抢球后5秒攻门。',
    technicalMatch: '接球前观察、第一脚触球、直传'
  },
  {
    code: 'B30', stage: '守转攻', moment: '快速推进', theme: '抢球后带球推进', u8: '引入', u9_u10: '重点', u11_u12: '掌握/深化',
    principle: '有空间时快速向前带球制造传威胁射门。',
    objective: '利用对手无序防守阶段向前深度推进。',
    problem: '抢到球后不敢带，习惯性节奏变慢。',
    cue: '前方有空间时是否带球进入；推进后是否传/射。',
    typicalError: '低头带入人堆；推进后不处理丢。',
    trainingFormat: '转换带球攻门；2v1反击。',
    technicalMatch: '高速运球、带球推进、运球射门'
  },
  {
    code: 'B31', stage: '守转攻', moment: '快速推进', theme: '快速直传或斜传找前插', u8: '引入', u9_u10: '重点', u11_u12: '掌握',
    principle: '有队友前插时及时向前传到位。',
    objective: '把抢断瞬间转化为身后穿透威胁。',
    problem: '前插队友出现但传球启动太慢。',
    cue: '队友启动时传球是否及时；传球是否有提前量。',
    typicalError: '持球人多带；前插者越跑越窄线。',
    trainingFormat: '3v2反击；斜传直插。',
    technicalMatch: '渗透传球、斜传直插、长传准确性'
  },
  {
    code: 'B32', stage: '守转攻', moment: '射门终结', theme: '快速反击中的射门', u8: '引入', u9_u10: '重点', u11_u12: '掌握',
    principle: '反击进入前场后快速、简洁、果断终结。',
    objective: '减少无效触球调整，把转换优势变为破门。',
    problem: '反击推进到前场因犹豫，防守立刻回位。',
    cue: '进入射门区后是否果断射球门；是否有人包抄。',
    typicalError: '过度传球；带球过深；无人补射。',
    trainingFormat: '3v2反击攻门；限时终结。',
    technicalMatch: '接球射门、运球射门、补射'
  },
  {
    code: 'B33', stage: '守转攻', moment: '重新组织', theme: '快攻受阻后的控球保护', u8: '引入', u9_u10: '重点', u11_u12: '掌握',
    principle: '快攻机会消失时，用身体和回传保护球权。',
    objective: '避免无机会硬推向前导致二次丢球防守反弹。',
    problem: '反击跑位被封仍盲目传身后或远射。',
    cue: '前方被封时是否回传/横传重新控制。',
    typicalError: '一味向前跑位堵死；无人回撤支援。',
    trainingFormat: '转换后控球保护；反击受阻回做。',
    technicalMatch: '护球、回传、弱侧转移'
  }
];
*/
