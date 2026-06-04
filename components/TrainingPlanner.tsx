
import React, { useState, useMemo, useEffect } from 'react';
import { TrainingSession, Team, Player, AttendanceRecord, AttendanceStatus, User, DrillDesign, PeriodizationPlan, WeeklyPlan } from '../types';
import { Calendar as CalendarIcon, Clock, Zap, Loader2, CheckCircle, Plus, ChevronLeft, ChevronRight, UserCheck, X, AlertCircle, Ban, PieChart as PieChartIcon, List, FileText, Send, ShieldCheck, RefreshCw, Target, Copy, Download, Trash2, PenTool, CalendarDays, Settings2, LayoutList, Quote, Bell, TableProperties, Edit2, Save, ClipboardCopy, ClipboardPaste, Star, Brain, History, TrendingUp, Search, Users as UsersIcon } from 'lucide-react';
import { generateTrainingPlan } from '../services/geminiService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { exportToPDF } from '../services/pdfService';
import { BasicTechItem, ScenarioTheme, BASIC_TECH_THEMES, SCENARIO_THEMES } from '../src/philosophyData';

interface TrainingPlannerProps {
  trainings: TrainingSession[];
  teams: Team[];
  players: Player[];
  drillLibrary: string[];
  trainingFoci?: string[];
  focusSubjects?: Record<string, string[]>;
  designs?: DrillDesign[];
  currentUser: User | null;
  onAddTraining: (session: TrainingSession) => void;
  onUpdateTraining: (session: TrainingSession, attendance: AttendanceRecord[]) => void;
  onDeleteTraining: (id: string) => void;
  initialFilter?: string;
  appLogo?: string;
  periodizationPlans?: PeriodizationPlan[];
  onUpdatePeriodization?: (plan: PeriodizationPlan) => void;
  basicTechThemes?: BasicTechItem[];
  scenarioThemes?: ScenarioTheme[];
}

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (focus: string, content: string) => void;
  basicTechThemes?: BasicTechItem[];
  scenarioThemes?: ScenarioTheme[];
}

const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  basicTechThemes = BASIC_TECH_THEMES,
  scenarioThemes = SCENARIO_THEMES
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'tech' | 'scenario'>('all');
  const [selectedTechCategory, setSelectedTechCategory] = useState<string>('all');
  const [selectedScenarioStage, setSelectedScenarioStage] = useState<string>('all');

  const techCategories = useMemo(() => {
    const list = (basicTechThemes || BASIC_TECH_THEMES).map(t => t.focus);
    return Array.from(new Set(list)).filter(Boolean);
  }, [basicTechThemes]);

  const scenarioStages = useMemo(() => {
    const list = (scenarioThemes || SCENARIO_THEMES).map(s => s.stage);
    return Array.from(new Set(list)).filter(Boolean);
  }, [scenarioThemes]);

  const handleTabChange = (tab: 'all' | 'tech' | 'scenario') => {
    setActiveTab(tab);
    setSelectedTechCategory('all');
    setSelectedScenarioStage('all');
  };

  if (!isOpen) return null;

  const techItems = (basicTechThemes || BASIC_TECH_THEMES).map(t => ({
    type: 'tech' as const,
    key: `tech-${t.code}`,
    code: t.code,
    category: t.focus,
    subCategory: t.focus,
    theme: t.theme,
    focusLabel: `[基础技术] ${t.focus}`,
    displayTag: '基础技术',
    description: t.objective || '',
    teachingPoints: t.teachingPoints || '',
  }));

  const scenarioItems = (scenarioThemes || SCENARIO_THEMES).map(s => ({
    type: 'scenario' as const,
    key: `scenario-${s.code}`,
    code: s.code,
    category: `${s.stage} · ${s.moment}`,
    subCategory: s.stage,
    theme: s.theme,
    focusLabel: `[比赛场景] ${s.stage} · ${s.moment}`,
    displayTag: '比赛场景',
    description: s.objective || '',
    teachingPoints: s.cue || '',
  }));

  const allItems = [...techItems, ...scenarioItems];

  const filteredItems = allItems.filter(item => {
    const matchesSearch = 
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.theme.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'tech') {
      if (item.type !== 'tech') return false;
      if (selectedTechCategory !== 'all' && item.subCategory !== selectedTechCategory) return false;
    } else if (activeTab === 'scenario') {
      if (item.type !== 'scenario') return false;
      if (selectedScenarioStage !== 'all' && item.subCategory !== selectedScenarioStage) return false;
    } else {
      // activeTab === 'all'
      if (selectedTechCategory !== 'all' && item.type === 'tech' && item.subCategory !== selectedTechCategory) return false;
      if (selectedScenarioStage !== 'all' && item.type === 'scenario' && item.subCategory !== selectedScenarioStage) return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="bg-bvb-black p-4 flex justify-between items-center text-white shrink-0">
          <div>
            <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
              <span className="text-bvb-yellow">★</span>
              选择俱乐部体系库核心主题
            </h3>
            <p className="text-gray-400 text-xs mt-0.5">从俱乐部标准技术库与比赛场景库中统一检索与选择核心训练主题</p>
          </div>
          <button onClick={onClose} className="p-1 px-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0">
          <div className="flex gap-1.5 p-1 bg-gray-200/60 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => handleTabChange('all')}
              className={`flex-1 sm:flex-none py-1.5 px-4 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'all'
                  ? 'bg-white shadow-sm text-bvb-black'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              全部体系 ({allItems.length})
            </button>
            <button
              onClick={() => handleTabChange('tech')}
              className={`flex-1 sm:flex-none py-1.5 px-4 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'tech'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-blue-600'
              }`}
            >
              基础技术 ({techItems.length})
            </button>
            <button
              onClick={() => handleTabChange('scenario')}
              className={`flex-1 sm:flex-none py-1.5 px-4 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'scenario'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-green-600'
              }`}
            >
              比赛场景 ({scenarioItems.length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索编码、主题、大类..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 bg-white rounded-xl text-xs font-bold outline-none ring-bvb-yellow focus:ring-1 focus:border-bvb-yellow"
            />
          </div>
        </div>

        {/* 筛选过滤条: 技术分类 & 比赛阶段 */}
        {((activeTab === 'tech' || activeTab === 'all') && techCategories.length > 0) && (
          <div className="px-4 py-2 bg-slate-50 border-b border-gray-100 flex flex-wrap gap-1.5 items-center shrink-0">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider mr-1">技术分类:</span>
            <button
              type="button"
              onClick={() => setSelectedTechCategory('all')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                selectedTechCategory === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              全部技术
            </button>
            {techCategories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedTechCategory(cat)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                  selectedTechCategory === cat
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {((activeTab === 'scenario' || activeTab === 'all') && scenarioStages.length > 0) && (
          <div className="px-4 py-2 bg-slate-50 border-b border-gray-100 flex flex-wrap gap-1.5 items-center shrink-0">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider mr-1">比赛阶段:</span>
            <button
              type="button"
              onClick={() => setSelectedScenarioStage('all')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                selectedScenarioStage === 'all'
                  ? 'bg-green-600 text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              全部阶段
            </button>
            {scenarioStages.map(stage => (
              <button
                key={stage}
                type="button"
                onClick={() => setSelectedScenarioStage(stage)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                  selectedScenarioStage === stage
                    ? 'bg-green-600 text-white shadow-xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {stage}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-gray-50/50">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Search className="w-10 h-10 mb-2 stroke-1" />
              <p className="text-xs font-bold font-mono">没有找到匹配的核心训练主题</p>
            </div>
          ) : (
            filteredItems.map(item => (
              <div
                key={item.key}
                onClick={() => {
                  onSelect(item.focusLabel, `${item.theme} (${item.code})`);
                  onClose();
                }}
                className="group cursor-pointer hover:scale-[1.005] transition-all duration-150 relative bg-white border border-gray-200 hover:border-bvb-yellow rounded-xl p-3 shadow-sm hover:shadow-md flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between"
              >
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl ${
                    item.type === 'tech' ? 'bg-blue-500' : 'bg-green-500'
                  }`}
                />
                
                <div className="pl-2 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono px-1.5 py-0.5 rounded text-[10px] font-black tracking-wider uppercase text-white bg-bvb-black">
                      {item.code}
                    </span>
                    <span className="text-xs font-black text-gray-800">{item.theme}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        item.type === 'tech'
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-green-50 text-green-600'
                      }`}
                    >
                      {item.category}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-[11px] text-gray-500 font-medium line-clamp-2">
                      <span className="font-extrabold text-gray-600">目标: </span>
                      {item.description}
                    </p>
                  )}
                  {item.teachingPoints && (
                    <p className="text-[10px] text-gray-400 line-clamp-1">
                      <span className="font-extrabold text-gray-500">提示: </span>
                      {item.teachingPoints}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  className="shrink-0 self-end sm:self-center px-4 py-1.5 bg-gray-50 hover:bg-bvb-yellow hover:text-bvb-black text-gray-700 rounded-lg text-xs font-black transition-colors border border-gray-100 group-hover:bg-bvb-yellow group-hover:text-bvb-black"
                >
                  选择
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

type TimeScope = 'month' | 'quarter' | 'year';
type ViewType = 'calendar' | 'list' | 'periodization' | 'focus';

const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
};

// 辅助函数：计算球员关注统计
const calculateFocusStats = (playerId: string, allSessions: TrainingSession[]) => {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth();
    const curQuarter = Math.floor(curMonth / 3);

    const playerSessions = allSessions.filter(s => s.focusedPlayerIds?.includes(playerId));

    const stats = {
        month: 0,
        quarter: 0,
        year: 0
    };

    playerSessions.forEach(s => {
        const d = parseLocalDate(s.date);
        if (d.getFullYear() === curYear) {
            stats.year++;
            if (d.getMonth() === curMonth) stats.month++;
            if (Math.floor(d.getMonth() / 3) === curQuarter) stats.quarter++;
        }
    });

    return stats;
};

// 辅助函数：获取某月有多少个星期日
const getSundaysInMonth = (year: number, month: number) => {
    let sundays = 0;
    const date = new Date(year, month - 1, 1);
    while (date.getMonth() === month - 1) {
        if (date.getDay() === 0) { // 0 is Sunday
            sundays++;
        }
        date.setDate(date.getDate() + 1);
    }
    return sundays;
};

// 辅助函数：计算特定日期在其月份的第几个周（按星期日分割周次，与周期表一致）
const getWeekInMonthOfDate = (dateStr: string) => {
    if (!dateStr) return null;
    const parts = dateStr.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    const [year, month, day] = parts;
    
    let sundaysBefore = 0;
    const tempDate = new Date(year, month - 1, 1);
    while (tempDate.getDate() < day && tempDate.getMonth() === month - 1) {
        if (tempDate.getDay() === 0) { // Sunday
            sundaysBefore++;
        }
        tempDate.setDate(tempDate.getDate() + 1);
    }
    
    let weekInMonth = sundaysBefore + 1;
    const totalSundays = getSundaysInMonth(year, month);
    if (weekInMonth > totalSundays) {
        weekInMonth = totalSundays;
    }
    if (weekInMonth < 1) {
        weekInMonth = 1;
    }
    return { year, month, weekInMonth };
};

interface WeeklyPlanEditorProps {
    week: WeeklyPlan;
    onSave: (week: WeeklyPlan) => void;
    onClose: () => void;
    clipboard?: WeeklyPlan | null;
    onCopy?: (week: WeeklyPlan) => void;
    trainingFoci?: string[];
    focusSubjects?: Record<string, string[]>;
    basicTechThemes?: BasicTechItem[];
    scenarioThemes?: ScenarioTheme[];
}

const WeeklyPlanEditor: React.FC<WeeklyPlanEditorProps> = ({ week, onSave, onClose, clipboard, onCopy, basicTechThemes = BASIC_TECH_THEMES, scenarioThemes = SCENARIO_THEMES }) => {
    const [localWeek, setLocalWeek] = useState<WeeklyPlan>({ ...week });
    const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);

    const handlePaste = () => {
        if (clipboard) {
            setLocalWeek({
                ...localWeek,
                physicalTheme: clipboard.physicalTheme,
                trainingTheme: clipboard.trainingTheme,
                trainingContent: clipboard.trainingContent,
                oppositionContent: clipboard.oppositionContent,
                trainingGoals: clipboard.trainingGoals,
                matchPlan: clipboard.matchPlan,
                remarks: clipboard.remarks
            });
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="bg-bvb-black p-4 flex justify-between items-center text-white shrink-0">
                    <h3 className="font-bold flex items-center gap-2"><Edit2 className="w-4 h-4 text-bvb-yellow" /> 编辑第 {week.weekInMonth} 周计划</h3>
                    <div className="flex items-center gap-2">
                        {onCopy && (
                            <button 
                                onClick={() => onCopy(localWeek)}
                                className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                                title="复制当前内容"
                            >
                                <ClipboardCopy className="w-4 h-4" />
                            </button>
                        )}
                        <button onClick={onClose}><X className="w-6 h-6" /></button>
                    </div>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <div className="flex gap-4">
                            <div>
                                <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">月份</label>
                                <div className="font-bold text-gray-700">{week.month}月</div>
                            </div>
                            <div>
                                <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">周次</label>
                                <div className="font-bold text-gray-700">第 {week.weekInMonth} 周</div>
                            </div>
                        </div>
                        {clipboard && (
                            <button 
                                onClick={handlePaste}
                                className="flex items-center gap-1 px-3 py-1.5 bg-bvb-yellow text-bvb-black text-[10px] font-black rounded-lg hover:brightness-105 shadow-sm transition-all animate-pulse"
                            >
                                <ClipboardPaste className="w-3 h-3" /> 粘贴已复制内容
                            </button>
                        )}
                    </div>
                    
                    <label className="block text-[10px] font-black text-gray-400 mb-1">训练重点 / 核心主题内容</label>
                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl flex flex-col gap-3">
                            <div className="flex justify-between items-center gap-4 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-gray-400 uppercase">当前重点分类:</span>
                                        {localWeek.trainingTheme ? (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-bvb-black text-white shrink-0">
                                                {localWeek.trainingTheme}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-400 font-bold">未指定分类</span>
                                        )}
                                    </div>
                                    <div className="text-xs font-black text-gray-800">
                                        {localWeek.trainingContent || '未选择主题内容'}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsThemeSelectorOpen(true)}
                                    className="px-3 py-1.5 bg-bvb-yellow hover:brightness-105 text-bvb-black text-xs font-black rounded-lg shadow-sm transition-all shrink-0 flex items-center gap-1.5"
                                >
                                    <Edit2 className="w-3.5 h-3.5" /> 选择体系核心主题
                                </button>
                            </div>

                            {/* Enable manual override */}
                            <div className="pt-2 border-t border-gray-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-0.5">手动校订分类</label>
                                    <input
                                        type="text"
                                        placeholder="分类, 例如 [基础技术] 运控球"
                                        className="w-full p-2 border border-gray-200 bg-white rounded-lg text-xs font-bold focus:ring-1 focus:ring-bvb-yellow outline-none"
                                        value={localWeek.trainingTheme || ''}
                                        onChange={e => setLocalWeek({ ...localWeek, trainingTheme: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-0.5">手动校订中心训练内容</label>
                                    <input
                                        type="text"
                                        placeholder="主题具体描述描述..."
                                        className="w-full p-2 border border-gray-200 bg-white rounded-lg text-xs font-bold focus:ring-1 focus:ring-bvb-yellow outline-none"
                                        value={localWeek.trainingContent || ''}
                                        onChange={e => setLocalWeek({ ...localWeek, trainingContent: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Integrated pedagogical prompt card */}
                        {(() => {
                            const match = localWeek.trainingContent?.match(/\(([^)]+)\)/);
                            const currentCode = match ? match[1] : '';
                            const techItem = (basicTechThemes || BASIC_TECH_THEMES).find(t => t.code === currentCode);
                            if (techItem) {
                                return (
                                    <div className="bg-yellow-50/50 border border-yellow-200/60 p-3 rounded-xl text-[11px] text-gray-600 space-y-1.5 mt-3 animate-in fade-in duration-150">
                                        <div className="font-extrabold text-bvb-black flex items-center justify-between">
                                            <span className="flex items-center gap-1"><Brain className="w-3.5 h-3.5 text-bvb-yellow" /> 技术要领:</span>
                                            <span className="text-gray-400 font-mono text-[9px] bg-white border border-gray-100 px-1.5 py-0.5 rounded-full">{techItem.code}</span>
                                        </div>
                                        <p><strong className="text-gray-700">技术目标:</strong> {techItem.objective}</p>
                                        <p><strong className="text-gray-700">教学步骤:</strong> {techItem.teachingPoints}</p>
                                        <p><strong className="text-gray-700">典型错误:</strong> {techItem.problem}</p>
                                        <p><strong className="text-gray-700">呐喊口令:</strong> <span className="bg-yellow-100 font-black px-1.5 py-0.5 rounded text-bvb-black">{techItem.coachCue}</span></p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setLocalWeek(prev => ({
                                                    ...prev,
                                                    trainingGoals: `【基础技术核心目标】\n1. 动作要领：${techItem.objective}\n2. 教学要义：${techItem.teachingPoints}\n3. 易犯动作：${techItem.problem}`,
                                                    remarks: `青训口令：${techItem.coachCue}`
                                                }));
                                            }}
                                            className="mt-1 w-full bg-white border border-yellow-250 text-yellow-800 font-bold py-1 px-2 rounded hover:bg-yellow-101 active:scale-95 transition-all text-[10px]"
                                        >
                                            ✨ 自动关联：一键同步动作目标 & 青训呐喊暗语
                                        </button>
                                    </div>
                                );
                            }
                            const scenarioItem = (scenarioThemes || SCENARIO_THEMES).find(s => s.code === currentCode);
                            if (scenarioItem) {
                                return (
                                    <div className="bg-yellow-50/50 border border-yellow-200/60 p-3 rounded-xl text-[11px] text-gray-600 space-y-1.5 mt-3 animate-in fade-in duration-150">
                                        <div className="font-extrabold text-bvb-black flex items-center justify-between">
                                            <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-bvb-yellow" /> 战术目标:</span>
                                            <span className="text-gray-400 font-mono text-[9px] bg-white border border-gray-100 px-1.5 py-0.5 rounded-full">{scenarioItem.code}</span>
                                        </div>
                                        <p><strong className="text-gray-700">战术重点:</strong> {scenarioItem.objective}</p>
                                        <p><strong className="text-gray-700">战术原则:</strong> {scenarioItem.principle}</p>
                                        <p><strong className="text-gray-700">纠错呐喊:</strong> <span className="bg-yellow-100 font-black px-1.5 py-0.5 rounded text-bvb-black">{scenarioItem.cue}</span></p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setLocalWeek(prev => ({
                                                    ...prev,
                                                    trainingGoals: `【战术情景目标】\n${scenarioItem.objective}\n【典型错误纠正】\n${scenarioItem.typicalError || scenarioItem.problem}`,
                                                    oppositionContent: scenarioItem.trainingFormat || prev.oppositionContent,
                                                    remarks: `呐喊指令：${scenarioItem.cue}`
                                                }));
                                            }}
                                            className="mt-1 w-full bg-white border border-yellow-250 text-yellow-800 font-bold py-1 px-2 rounded hover:bg-yellow-101 active:scale-95 transition-all text-[10px]"
                                        >
                                            ✨ 自动条件对抗导入 (例如: 3v3 等) 并在日程中关联战术
                                        </button>
                                    </div>
                                );
                            }
                            return null;
                        })()}
                    <ThemeSelectorModal
                        isOpen={isThemeSelectorOpen}
                        onClose={() => setIsThemeSelectorOpen(false)}
                        onSelect={(focus, content) => {
                            setLocalWeek(prev => ({
                                ...prev,
                                trainingTheme: focus,
                                trainingContent: content
                            }));
                        }}
                        basicTechThemes={basicTechThemes}
                        scenarioThemes={scenarioThemes}
                    />
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">情景对抗内容</label>
                        <input className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none font-bold" value={localWeek.oppositionContent} onChange={e => setLocalWeek({...localWeek, oppositionContent: e.target.value})} placeholder="如：1v1、2v2" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">训练目标 (当月共享)</label>
                        <textarea rows={3} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none text-sm font-bold" value={localWeek.trainingGoals} onChange={e => setLocalWeek({...localWeek, trainingGoals: e.target.value})} placeholder="1. 强化基础... 2. 提高..." />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">赛事计划</label>
                        <input className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none font-bold" value={localWeek.matchPlan} onChange={e => setLocalWeek({...localWeek, matchPlan: e.target.value})} placeholder="本周比赛安排..." />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">备注</label>
                        <input className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none font-bold" value={localWeek.remarks} onChange={e => setLocalWeek({...localWeek, remarks: e.target.value})} placeholder="如：春节假期" />
                    </div>
                </div>
                <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-200 rounded-lg transition-all">取消</button>
                    <button onClick={() => onSave(localWeek)} className="px-6 py-2 bg-bvb-black text-bvb-yellow font-black rounded-lg shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"><Save className="w-4 h-4" /> 保存更新</button>
                </div>
            </div>
        </div>
    );
};

const SessionDetailModal: React.FC<any> = ({ session, teams, players, basicTechThemes = BASIC_TECH_THEMES, scenarioThemes = SCENARIO_THEMES, currentUser, onUpdate, onDuplicate, onDelete, onClose }) => {
    const [activeTab, setActiveTab] = useState<'info' | 'attendance' | 'log'>('attendance');
    const teamPlayers = useMemo(() => players.filter(p => p.teamId === session.teamId), [players, session.teamId]);
    const team = useMemo(() => teams.find(t => t.id === session.teamId), [teams, session.teamId]);

    const [localSession, setLocalSession] = useState<TrainingSession>(() => {
        const copy = JSON.parse(JSON.stringify(session));
        if (!copy.performanceRatings) {
            copy.performanceRatings = { technical: 5, application: 5, focus: 5, discipline: 5 };
        }
        return copy;
    });

    const isJuneOrLater = useMemo(() => {
        if (!localSession.date) return false;
        const d = new Date(localSession.date);
        if (isNaN(d.getTime())) return false;
        return d.getFullYear() > 2026 || (d.getFullYear() === 2026 && d.getMonth() >= 5);
    }, [localSession.date]);

    const currentPlanEvaluation = localSession.planEvaluation || (localSession.linkedDesignId ? 'exec_ok' : 'no_plan');

    const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);

    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [drillInput, setDrillInput] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setSaveStatus('saving');
            onUpdate(localSession, localSession.attendance || []);
            setTimeout(() => setSaveStatus('saved'), 800);
        }, 1500);
        return () => clearTimeout(timer);
    }, [localSession, onUpdate]);

    useEffect(() => {
        if (activeTab === 'log' && currentUser?.role === 'coach' && localSession.submissionStatus === 'Reviewed' && !localSession.isReviewRead) {
            setTimeout(() => {
                setLocalSession(prev => ({ ...prev, isReviewRead: true }));
            }, 0);
        }
    }, [activeTab, currentUser?.role, localSession.submissionStatus, localSession.isReviewRead]);

    const isDirector = currentUser?.role === 'director';
    const isCoach = currentUser?.role === 'coach';
    const isAssistant = currentUser?.role === 'assistant_coach';
    const canEdit = (isCoach && currentUser?.teamIds?.includes(session.teamId)) || isDirector || (isAssistant && currentUser?.teamIds?.includes(session.teamId));
    
    const handleAssistantCheckIn = () => {
        if (!currentUser) return;
        setLocalSession(prev => {
            const currentIds = prev.assistantCheckInIds || [];
            if (currentIds.includes(currentUser.id)) {
                return { ...prev, assistantCheckInIds: currentIds.filter(id => id !== currentUser.id) };
            } else {
                return { ...prev, assistantCheckInIds: [...currentIds, currentUser.id] };
            }
        });
    };
    const getStatus = (playerId: string): AttendanceStatus => {
        const record = localSession.attendance?.find(r => r.playerId === playerId);
        return record ? record.status : 'Absent';
    };

    const setPlayerStatus = (playerId: string, status: AttendanceStatus, creditCost?: number) => {
        setLocalSession(prev => {
            const currentAttendance = prev.attendance || [];
            const others = currentAttendance.filter(r => r.playerId !== playerId);
            const nextAttendance = status === 'Absent' ? others : [...others, { playerId, status, creditCost }];
            return { ...prev, attendance: nextAttendance };
        });
    };

    const markAllPresent = () => {
        const allPresent: AttendanceRecord[] = teamPlayers.map(p => ({
            playerId: p.id,
            status: 'Present'
        }));
        setLocalSession(prev => ({ ...prev, attendance: allPresent }));
    };

    const addDrill = () => {
        if (drillInput.trim()) {
            setLocalSession(prev => ({ ...prev, drills: [...prev.drills, drillInput.trim()] }));
            setDrillInput('');
        }
    };

    const removeDrill = (idx: number) => {
        setLocalSession(prev => ({ ...prev, drills: prev.drills.filter((_, i) => i !== idx) }));
    };

    const handleDelete = () => {
        if (confirm('确定要删除这项训练安排吗？')) {
            onDelete(session.id);
            onClose();
        }
    };

    const updateFocusNote = (playerId: string, field: 'technical' | 'mental', value: string) => {
        setLocalSession(prev => {
            const notes = { ...(prev.focusedPlayerNotes || {}) };
            if (!notes[playerId]) notes[playerId] = { technical: '', mental: '' };
            notes[playerId][field] = value;
            return { ...prev, focusedPlayerNotes: notes };
        });
    };

    const handleRatingChange = (key: string, value: number) => {
        setLocalSession(prev => ({
            ...prev,
            performanceRatings: {
                ...(prev.performanceRatings || { technical: 5, application: 5, focus: 5, discipline: 5 }),
                [key]: value
            }
        }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-2xl md:rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                <div className="bg-bvb-black p-4 flex justify-between items-center text-white shrink-0">
                    <div>
                      <h3 className="font-bold text-lg leading-tight">{localSession.title}</h3>
                      <p className="text-xs text-gray-400">{localSession.date} • {team?.name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                           {saveStatus === 'saving' && <span className="text-xs text-bvb-yellow flex items-center"><RefreshCw className="w-3 h-3 mr-1 animate-spin"/> 保存中</span>}
                           {saveStatus === 'saved' && <span className="text-xs text-green-400 flex items-center bg-gray-800 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3 mr-1"/> 已保存</span>}
                      </div>
                      <button onClick={() => onDuplicate(localSession)} className="p-1 hover:text-bvb-yellow" title="复制并选择日期">
                          <Copy className="w-5 h-5" />
                      </button>
                      {canEdit && (
                          <button onClick={handleDelete} className="p-1 hover:text-red-500" title="删除训练计划">
                              <Trash2 className="w-5 h-5" />
                          </button>
                      )}
                      <button onClick={onClose}><X className="w-6 h-6" /></button>
                    </div>
                </div>
                <div className="flex border-b border-gray-200 shrink-0 sticky top-0 bg-white z-10 overflow-x-auto no-scrollbar">
                    <button onClick={() => setActiveTab('info')} className={`flex-1 min-w-[100px] py-3 text-sm font-bold flex items-center justify-center border-b-2 transition-colors ${activeTab === 'info' ? 'border-bvb-yellow text-bvb-black bg-gray-50' : 'border-transparent text-gray-500'}`}><Settings2 className="w-4 h-4 mr-2" /> 计划内容</button>
                    <button onClick={() => setActiveTab('attendance')} className={`flex-1 min-w-[100px] py-3 text-sm font-bold flex items-center justify-center border-b-2 transition-colors ${activeTab === 'attendance' ? 'border-bvb-yellow text-bvb-black bg-gray-50' : 'border-transparent text-gray-500'}`}><UserCheck className="w-4 h-4 mr-2" /> 考勤管理</button>
                    <button onClick={() => setActiveTab('log')} className={`flex-1 min-w-[100px] py-3 text-sm font-bold flex items-center justify-center border-b-2 transition-colors relative ${activeTab === 'log' ? 'border-bvb-yellow text-bvb-black bg-gray-50' : 'border-transparent text-gray-500'}`}>
                        <FileText className="w-4 h-4 mr-2" /> 训练日志
                        {isCoach && localSession.submissionStatus === 'Reviewed' && !localSession.isReviewRead && <span className="absolute top-2 right-4 w-2 h-2 bg-blue-500 rounded-full animate-ping"></span>}
                        {isDirector && localSession.submissionStatus === 'Submitted' && <span className="absolute top-2 right-4 w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse border border-white"></span>}
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 pb-24 md:pb-6 custom-scrollbar">
                    {activeTab === 'info' && (
                        <div className="animate-in fade-in duration-200 space-y-6">
                            <div className="space-y-4">
                                <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl flex flex-col gap-3">
                                    <div className="flex justify-between items-center gap-4 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black text-gray-400 uppercase">当前重点分类:</span>
                                                {localSession.focus ? (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-bvb-black text-white shrink-0">
                                                        {localSession.focus}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400 font-bold">未指定重点分类</span>
                                                )}
                                            </div>
                                            <div className="text-xs font-black text-gray-800">
                                                {localSession.title || '未选择主题内容'}
                                            </div>
                                        </div>
                                        {canEdit && (
                                            <button
                                                type="button"
                                                onClick={() => setIsThemeSelectorOpen(true)}
                                                className="px-3 py-1.5 bg-bvb-yellow hover:brightness-105 text-bvb-black text-xs font-black rounded-lg shadow-sm transition-all shrink-0 flex items-center gap-1.5"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" /> 选择体系核心主题
                                            </button>
                                        )}
                                    </div>

                                    {/* Enable manual override */}
                                    <div className="pt-2 border-t border-gray-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[9px] font-black text-gray-400 uppercase mb-0.5">手动校订分类</label>
                                            <input
                                                type="text"
                                                disabled={!canEdit}
                                                placeholder="分类, 例如 [基础技术] 运控球"
                                                className="w-full p-2 border border-gray-200 bg-white rounded-lg text-xs font-bold focus:ring-1 focus:ring-bvb-yellow outline-none"
                                                value={localSession.focus || ''}
                                                onChange={e => setLocalSession({ ...localSession, focus: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-gray-400 uppercase mb-0.5">手动校订中心训练内容</label>
                                            <input
                                                type="text"
                                                disabled={!canEdit}
                                                placeholder="主题具体描述描述..."
                                                className="w-full p-2 border border-gray-200 bg-white rounded-lg text-xs font-bold focus:ring-1 focus:ring-bvb-yellow outline-none"
                                                value={localSession.title || ''}
                                                onChange={e => setLocalSession({ ...localSession, title: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Integrated pedagogical prompt card */}
                                {(() => {
                                    const match = localSession.title?.match(/\(([^)]+)\)/);
                                    const currentCode = match ? match[1] : '';
                                    const techItem = (basicTechThemes || BASIC_TECH_THEMES).find(t => t.code === currentCode);
                                    if (techItem) {
                                        return (
                                            <div className="bg-yellow-50/50 border border-yellow-200/60 p-3 rounded-xl text-[11px] text-gray-600 space-y-1.5 animate-in fade-in duration-150">
                                                <div className="font-extrabold text-bvb-black flex items-center justify-between">
                                                    <span className="flex items-center gap-1"><Brain className="w-3.5 h-3.5 text-bvb-yellow" /> 技术要领:</span>
                                                    <span className="text-gray-400 font-mono text-[9px] bg-white border border-gray-100 px-1.5 py-0.5 rounded-full">{techItem.code}</span>
                                                </div>
                                                <p><strong className="text-gray-700">技术目标:</strong> {techItem.objective}</p>
                                                <p><strong className="text-gray-700">教学步骤:</strong> {techItem.teachingPoints}</p>
                                                <p><strong className="text-gray-700">典型错误:</strong> {techItem.problem}</p>
                                                <p><strong className="text-gray-700">呐喊口令:</strong> <span className="bg-yellow-101 font-black px-1.5 py-0.5 rounded text-bvb-black">{techItem.coachCue}</span></p>
                                            </div>
                                        );
                                    }
                                    const scenarioItem = (scenarioThemes || SCENARIO_THEMES).find(s => s.code === currentCode);
                                    if (scenarioItem) {
                                        return (
                                            <div className="bg-yellow-50/50 border border-yellow-200/60 p-3 rounded-xl text-[11px] text-gray-600 space-y-1.5 animate-in fade-in duration-150">
                                                <div className="font-extrabold text-bvb-black flex items-center justify-between">
                                                    <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-bvb-yellow" /> 战术目标:</span>
                                                    <span className="text-gray-400 font-mono text-[9px] bg-white border border-gray-100 px-1.5 py-0.5 rounded-full">{scenarioItem.code}</span>
                                                </div>
                                                <p><strong className="text-gray-700">战术重点:</strong> {scenarioItem.objective}</p>
                                                <p><strong className="text-gray-700">战术原则:</strong> {scenarioItem.principle}</p>
                                                <p><strong className="text-gray-700">纠错呐喊:</strong> <span className="bg-yellow-101 font-black px-1.5 py-0.5 rounded text-bvb-black">{scenarioItem.cue}</span></p>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">训练主题描述 (精细内容或教案细项)</label>
                                        <input 
                                            disabled={!canEdit}
                                            className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none font-bold text-gray-800 bg-gray-50 focus:bg-white transition-all text-sm"
                                            value={localSession.title}
                                            onChange={e => setLocalSession({...localSession, title: e.target.value})}
                                            placeholder="如：半场攻防演练 / 自定义主题"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">训练强度</label>
                                        <select 
                                            disabled={!canEdit}
                                            className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none font-bold text-gray-800 bg-gray-50 focus:bg-white transition-all text-sm"
                                            value={localSession.intensity}
                                            onChange={e => setLocalSession({...localSession, intensity: e.target.value as any})}
                                        >
                                            <option value="Low">低 (恢复性)</option>
                                            <option value="Medium">中 (常规训练)</option>
                                            <option value="High">高 (比赛高强)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">训练日期</label>
                                        <input 
                                            disabled={!canEdit}
                                            type="date"
                                            className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none font-bold text-gray-800 bg-gray-50 focus:bg-white transition-all"
                                            value={localSession.date}
                                            onChange={e => setLocalSession({...localSession, date: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">时长 (分钟)</label>
                                        <input 
                                            disabled={!canEdit}
                                            type="number"
                                            className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none font-bold text-gray-800 bg-gray-50 focus:bg-white transition-all"
                                            value={localSession.duration}
                                            onChange={e => setLocalSession({...localSession, duration: parseInt(e.target.value) || 0})}
                                        />
                                    </div>
                                </div>

                                {(localSession.focusedPlayerIds && localSession.focusedPlayerIds.length > 0) && (
                                    <div className="bg-yellow-50/50 border border-yellow-100 p-4 rounded-xl">
                                        <label className="block text-[10px] font-black text-yellow-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                                            <Star className="w-3 h-3 fill-current" /> 本课重点关注球员
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {localSession.focusedPlayerIds.map(pid => {
                                                const p = players.find(p => p.id === pid);
                                                if (!p) return null;
                                                return (
                                                    <div key={pid} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-yellow-200 shadow-sm">
                                                        <img src={p.image} className="w-5 h-5 rounded-full object-cover" />
                                                        <span className="text-xs font-black text-gray-800">{p.name}</span>
                                                        <span className="text-[10px] text-gray-400 font-mono">#{p.number}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                        <List className="w-3 h-3" /> 训练项目清单 (Drills)
                                    </label>
                                    <div className="space-y-2 mb-3">
                                        {localSession.drills.map((drill, idx) => (
                                            <div key={idx} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 group">
                                                <span className="text-sm font-bold text-gray-700 flex items-center">
                                                    <span className="w-5 h-5 rounded-full bg-gray-200 text-[10px] flex items-center justify-center mr-2 text-gray-500 font-black">{idx + 1}</span>
                                                    {drill}
                                                </span>
                                                {canEdit && (
                                                    <button onClick={() => removeDrill(idx)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Trash2 className="w-4 h-4"/>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {canEdit && (
                                        <div className="flex gap-2">
                                            <input 
                                                className="flex-1 p-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-bvb-yellow outline-none" 
                                                placeholder="输入新的训练科目..." 
                                                value={drillInput} 
                                                onChange={e => setDrillInput(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && addDrill()}
                                            />
                                            <button onClick={addDrill} className="px-3 bg-bvb-black text-bvb-yellow rounded-lg hover:brightness-110">
                                                <Plus className="w-5 h-5"/>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'attendance' && (
                        <div className="animate-in fade-in duration-200 space-y-6">
                          <div className="grid grid-cols-3 gap-3 text-center">
                              <div className="bg-gray-50 p-2 rounded border border-gray-100"><span className="text-xs text-gray-500 uppercase font-bold">时长</span><div className="font-bold text-sm">{localSession.duration}分钟</div></div>
                              <div className="bg-gray-50 p-2 rounded border border-gray-100"><span className="text-xs text-gray-500 uppercase font-bold">重点</span><div className="font-bold text-sm truncate">{localSession.focus}</div></div>
                              <div className="bg-gray-50 p-2 rounded border border-gray-100"><span className="text-xs text-gray-500 uppercase font-bold">强度</span><div className={`font-bold text-sm ${localSession.intensity === 'High' ? 'text-red-600' : 'text-green-600'}`}>{localSession.intensity === 'High' ? '高' : localSession.intensity === 'Medium' ? '中' : '低'}</div></div>
                          </div>

                          {/* 助教签到区 */}
                          {(isAssistant || isDirector) && (
                              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${localSession.assistantCheckInIds?.includes(currentUser?.id || '') ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-gray-200 text-gray-400'}`}>
                                          <UsersIcon className="w-5 h-5" />
                                      </div>
                                      <div>
                                          <div className="text-sm font-black text-gray-800">助教签到 (打卡)</div>
                                          <p className="text-[10px] text-gray-500">签到后该课时将计入助教薪酬计算</p>
                                      </div>
                                  </div>
                                  <button 
                                      onClick={handleAssistantCheckIn}
                                      className={`px-4 py-2 rounded-lg font-black text-xs transition-all ${localSession.assistantCheckInIds?.includes(currentUser?.id || '') ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white border border-blue-200 text-blue-600 hover:bg-blue-50'}`}
                                  >
                                      {localSession.assistantCheckInIds?.includes(currentUser?.id || '') ? '已签到' : '立即签到'}
                                  </button>
                              </div>
                          )}

                          <div>
                              <div className="flex justify-between items-center mb-4">
                                  <h4 className="font-bold text-gray-800 flex items-center"><UserCheck className="w-4 h-4 mr-2 text-bvb-yellow" /> 考勤列表</h4>
                                  <div className="text-xs"><span className="font-bold">{localSession.attendance?.filter(r => r.status === 'Present').length || 0}</span> / {teamPlayers.length} 实到<button onClick={markAllPresent} className="ml-3 text-bvb-black underline hover:text-bvb-yellow">全勤</button></div>
                              </div>
                              <div className="space-y-3">
                                  {teamPlayers.map(player => {
                                      const status = getStatus(player.id);
                                      const record = localSession.attendance?.find(r => r.playerId === player.id);
                                      const currentCost = record?.creditCost || 1;
                                      const isFocused = localSession.focusedPlayerIds?.includes(player.id);
                                      return (
                                          <div key={player.id} className={`flex flex-col p-3 border rounded-xl shadow-sm transition-all ${isFocused ? 'bg-yellow-50/50 border-yellow-200 ring-2 ring-yellow-100' : 'bg-white border-gray-100'}`}>
                                              <div className="flex items-center justify-between mb-3">
                                                  <div className="flex items-center">
                                                      <div className="relative">
                                                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold mr-3 border-2 ${status === 'Present' ? 'bg-green-50 border-green-200 text-green-700' : status === 'Leave' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : status === 'Injury' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                                                              {player.name.charAt(0)}
                                                          </div>
                                                          {isFocused && <div className="absolute -top-1 -right-1 p-1 bg-bvb-yellow rounded-full border border-white shadow-sm"><Star className="w-2.5 h-2.5 text-bvb-black fill-current" /></div>}
                                                      </div>
                                                      <div>
                                                          <div className="flex items-center gap-1.5">
                                                              <div className="font-black text-gray-800 text-sm">{player.name}</div>
                                                              {isFocused && <span className="text-[8px] font-black uppercase text-bvb-black bg-bvb-yellow px-1.5 rounded-sm">Focused</span>}
                                                          </div>
                                                          <div className="text-[10px] text-gray-400 font-mono">#{player.number} • {player.position}</div>
                                                      </div>
                                                  </div>
                                                  <div className="flex flex-col items-end gap-1">
                                                      <div className="text-[10px] font-bold">{status === 'Present' && <span className="text-green-600">正常参训</span>}{status === 'Leave' && <span className="text-yellow-600">请假</span>}{status === 'Injury' && <span className="text-red-600">伤停</span>}{(status === 'Absent' || !status) && <span className="text-gray-400">未出席</span>}</div>
                                                      {status === 'Present' && (
                                                          <div className="flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                                              <span className="text-[9px] font-black text-gray-500 uppercase">扣课时:</span>
                                                              <select 
                                                                  className="bg-transparent text-[10px] font-black text-bvb-black outline-none cursor-pointer"
                                                                  value={currentCost}
                                                                  onChange={(e) => setPlayerStatus(player.id, 'Present', parseInt(e.target.value))}
                                                              >
                                                                  {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}
                                                              </select>
                                                          </div>
                                                      )}
                                                  </div>
                                              </div>
                                              <div className="flex bg-gray-50/50 p-1 rounded-lg gap-1">
                                                  <button onClick={() => setPlayerStatus(player.id, 'Present', currentCost)} className={`flex-1 py-2 rounded-md transition-all flex items-center justify-center ${status === 'Present' ? 'bg-white shadow-sm text-green-600 ring-1 ring-green-100' : 'text-gray-400 hover:text-green-600 hover:bg-gray-200'}`}><CheckCircle className="w-5 h-5" /></button>
                                                  <button onClick={() => setPlayerStatus(player.id, 'Leave')} className={`flex-1 py-2 rounded-md transition-all flex items-center justify-center ${status === 'Leave' ? 'bg-white shadow-sm text-yellow-600 ring-1 ring-yellow-100' : 'text-gray-400 hover:text-yellow-600 hover:bg-gray-200'}`}><Clock className="w-5 h-5" /></button>
                                                  <button onClick={() => setPlayerStatus(player.id, 'Injury')} className={`flex-1 py-2 rounded-md transition-all flex items-center justify-center ${status === 'Injury' ? 'bg-white shadow-sm text-red-600 ring-1 ring-red-100' : 'text-gray-400 hover:text-red-600 hover:bg-gray-200'}`}><AlertCircle className="w-5 h-5" /></button>
                                                  <button onClick={() => setPlayerStatus(player.id, 'Absent')} className={`flex-1 py-2 rounded-md transition-all flex items-center justify-center ${status === 'Absent' ? 'bg-white shadow-sm text-gray-600 ring-1 ring-gray-200' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-200'}`}><Ban className="w-5 h-5" /></button>
                                              </div>
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>
                        </div>
                    )}
                    {activeTab === 'log' && (
                        <div className="animate-in fade-in duration-200 space-y-10">
                            {/* 一、整体训练表现 (NEW) */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                                    <TrendingUp className="w-5 h-5 text-bvb-yellow" />
                                    <h4 className="font-black text-base text-gray-800 uppercase italic tracking-tighter">一、整体训练表现</h4>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        { key: 'technical', label: '1. 技术执行质量' },
                                        { key: 'application', label: '2. 比赛运用效果' },
                                        { key: 'focus', label: '3. 球员专注度' },
                                        { key: 'discipline', label: '4. 球队纪律性' },
                                    ].map(metric => {
                                        const value = localSession.performanceRatings?.[metric.key as keyof typeof localSession.performanceRatings] ?? 5;
                                        
                                        const getRatingLevel = (v: number) => {
                                            if (v <= 3) return 1;
                                            if (v <= 5) return 2;
                                            if (v <= 8) return 3;
                                            return 4;
                                        };

                                        const currentLevel = getRatingLevel(value);

                                        const levels = [
                                            { 
                                                level: 1, 
                                                label: '较差', 
                                                colorClass: 'border-red-100 text-red-600 hover:bg-red-50/50 hover:text-red-700 bg-red-50/10 font-bold', 
                                                activeClass: 'bg-red-500 border-red-500 text-white shadow-sm font-black', 
                                                value: 2 
                                            },
                                            { 
                                                level: 2, 
                                                label: '一般', 
                                                colorClass: 'border-yellow-100 text-yellow-700 hover:bg-yellow-50/50 hover:text-yellow-800 bg-yellow-50/10 font-bold', 
                                                activeClass: 'bg-yellow-500 border-yellow-500 text-white shadow-sm font-black', 
                                                value: 5 
                                            },
                                            { 
                                                level: 3, 
                                                label: '良好', 
                                                colorClass: 'border-blue-100 text-blue-600 hover:bg-blue-50/50 hover:text-blue-700 bg-blue-50/10 font-bold', 
                                                activeClass: 'bg-blue-600 border-blue-600 text-white shadow-sm font-black', 
                                                value: 8 
                                            },
                                            { 
                                                level: 4, 
                                                label: '优秀', 
                                                colorClass: 'border-green-100 text-green-600 hover:bg-green-50/50 hover:text-green-700 bg-green-50/10 font-bold', 
                                                activeClass: 'bg-green-600 border-green-600 text-white shadow-sm font-black', 
                                                value: 10 
                                            },
                                        ];

                                        const activeLvl = levels.find(l => l.level === currentLevel) || levels[1];

                                        return (
                                            <div key={metric.key} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest">{metric.label}</label>
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                                        currentLevel === 1 ? 'bg-red-50 text-red-600' :
                                                        currentLevel === 2 ? 'bg-yellow-50 text-yellow-600' :
                                                        currentLevel === 3 ? 'bg-blue-50 text-blue-600' :
                                                        'bg-green-50 text-green-600'
                                                    }`}>
                                                        {activeLvl.label}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-4 gap-1.5 pt-1">
                                                    {levels.map(lvl => {
                                                        const isSelected = currentLevel === lvl.level;
                                                        const isDisabled = !canEdit || localSession.submissionStatus === 'Reviewed';
                                                        return (
                                                            <button
                                                                key={lvl.level}
                                                                type="button"
                                                                disabled={isDisabled}
                                                                onClick={() => handleRatingChange(metric.key, lvl.value)}
                                                                className={`py-2 text-[11px] rounded-xl border text-center transition-all duration-200 ${
                                                                    isSelected 
                                                                        ? lvl.activeClass 
                                                                        : lvl.colorClass
                                                                } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02] active:scale-95'}`}
                                                            >
                                                                {lvl.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* 二、教案反思评价 (NEW) */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                                    <RefreshCw className="w-5 h-5 text-indigo-400" />
                                    <h4 className="font-black text-base text-gray-800 uppercase italic tracking-tighter">二、教案反思评价</h4>
                                </div>
                                <textarea 
                                    disabled={!canEdit || localSession.submissionStatus === 'Reviewed'}
                                    className="w-full h-32 p-4 border rounded-2xl focus:ring-2 focus:ring-bvb-yellow outline-none text-sm leading-relaxed bg-gray-50 focus:bg-white transition-all shadow-inner placeholder:text-gray-300"
                                    placeholder="反思教案难度是否合理、器械布置、组织流畅度及需要改进的细节..."
                                    value={localSession.planReflection || ''}
                                    onChange={e => setLocalSession({...localSession, planReflection: e.target.value})}
                                />
                            </section>

                            {/* 三、重点关注球员内容 (保持现状) */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                                    <Star className="w-5 h-5 text-bvb-yellow fill-current" />
                                    <h4 className="font-black text-base text-gray-800 uppercase italic tracking-tighter">三、重点球员成长反馈</h4>
                                </div>
                                {(localSession.focusedPlayerIds && localSession.focusedPlayerIds.length > 0) ? (
                                    <div className="grid grid-cols-1 gap-6">
                                        {localSession.focusedPlayerIds.map(pid => {
                                            const p = players.find(p => p.id === pid);
                                            if (!p) return null;
                                            const note = localSession.focusedPlayerNotes?.[pid] || { technical: '', mental: '' };
                                            return (
                                                <div key={pid} className="bg-yellow-50/30 border border-yellow-200 rounded-3xl p-6 shadow-sm space-y-4">
                                                    <div className="flex items-center gap-3 border-b border-yellow-100 pb-4">
                                                        <img src={p.image} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                                                        <div>
                                                            <div className="font-black text-gray-800 text-base">{p.name}</div>
                                                            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Focused Player Stats Tracking</div>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div className="space-y-1.5">
                                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                                                <Target className="w-3.5 h-3.5 text-bvb-yellow" /> 技术表现反馈
                                                            </label>
                                                            <textarea 
                                                                disabled={!canEdit || localSession.submissionStatus === 'Reviewed'}
                                                                className="w-full h-28 p-4 bg-white border border-yellow-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-bvb-yellow outline-none transition-all placeholder-gray-300"
                                                                placeholder="点评该球员的技术执行..."
                                                                value={note.technical}
                                                                onChange={e => updateFocusNote(pid, 'technical', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                                                <Brain className="w-3.5 h-3.5 text-indigo-400" /> 心理/态度反馈
                                                            </label>
                                                            <textarea 
                                                                disabled={!canEdit || localSession.submissionStatus === 'Reviewed'}
                                                                className="w-full h-28 p-4 bg-white border border-yellow-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-bvb-yellow outline-none transition-all placeholder-gray-300"
                                                                placeholder="评价球员的心理状态、抗压能力和团队融入..."
                                                                value={note.mental}
                                                                onChange={e => updateFocusNote(pid, 'mental', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="p-10 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                        <p className="text-gray-400 font-bold text-sm italic">本课次未设置重点关注球员</p>
                                    </div>
                                )}
                            </section>

                            {/* 提交控制区 */}
                            <div className="flex justify-between items-center pt-10 border-t border-gray-100">
                                <div className="flex items-center gap-3">
                                    <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest border shadow-sm ${localSession.submissionStatus === 'Planned' ? 'bg-gray-100 text-gray-500 border-gray-200' : localSession.submissionStatus === 'Submitted' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                                        Status: {localSession.submissionStatus === 'Planned' ? 'Draft' : localSession.submissionStatus === 'Submitted' ? 'Submitted' : 'Reviewed'}
                                    </span>
                                </div>
                                {canEdit && localSession.submissionStatus !== 'Reviewed' && (
                                    <button 
                                        onClick={() => setLocalSession({...localSession, submissionStatus: 'Submitted', isReviewRead: false})}
                                        className="bg-bvb-black text-bvb-yellow font-black px-8 py-3 rounded-2xl hover:brightness-110 shadow-xl transition-all flex items-center gap-2 uppercase italic text-sm tracking-widest"
                                    >
                                        <Send className="w-4 h-4" /> 提交日志进行审核
                                    </button>
                                )}
                            </div>

                            {/* 总监审核 (Director) */}
                            <div className="space-y-4 pt-10 border-t border-gray-100">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-bold text-gray-800 flex items-center"><ShieldCheck className="w-5 h-5 mr-2 text-bvb-yellow" /> 总监审核意见 (WSZG Director Review)</h4>
                                    {localSession.submissionStatus === 'Reviewed' && <span className="text-[10px] bg-green-500 text-white px-3 py-1 rounded-full font-black flex items-center gap-1 shadow-sm"><CheckCircle className="w-3 h-3"/> 已阅准</span>}
                                </div>

                                {/* 教案考核标准 (Drill Plan Evaluation) */}
                                {isJuneOrLater && (
                                    <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl space-y-3 shadow-inner">
                                        <div className="flex items-center justify-between">
                                            <h5 className="font-black text-xs text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                                                <FileText className="w-4 h-4 text-slate-500" />
                                                教案兑付课时费考核 (6月起执行新规)
                                            </h5>
                                            <span className="text-[10px] bg-slate-200 text-slate-600 px-2.5 py-0.5 rounded font-black">
                                                {currentPlanEvaluation === 'exec_ok' ? '100% 兑付' : currentPlanEvaluation === 'exec_fail' ? '70% 兑付' : '50% 兑付'}
                                            </span>
                                        </div>
                                        
                                        {isDirector ? (
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setLocalSession({ ...localSession, planEvaluation: 'exec_ok' })}
                                                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                                                        currentPlanEvaluation === 'exec_ok'
                                                            ? 'border-green-500 bg-green-50/50 shadow-sm'
                                                            : 'border-gray-200 bg-white hover:border-slate-300'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] font-black text-gray-850">1. 有教案并按计划执行</span>
                                                        <span className="text-[10px] font-mono font-black text-green-600 bg-green-100 px-1.5 rounded">100%</span>
                                                    </div>
                                                    <p className="text-[9px] text-gray-400 mt-1.5 leading-relaxed font-bold">关联有教案，无审核失败或已按调整执行</p>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setLocalSession({ ...localSession, planEvaluation: 'exec_fail' })}
                                                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                                                        currentPlanEvaluation === 'exec_fail'
                                                            ? 'border-amber-500 bg-amber-50/50 shadow-sm'
                                                            : 'border-gray-200 bg-white hover:border-slate-300'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] font-black text-gray-850">2. 审核不通过且未调整</span>
                                                        <span className="text-[10px] font-mono font-black text-amber-600 bg-amber-100 px-1.5 rounded">70%</span>
                                                    </div>
                                                    <p className="text-[9px] text-gray-400 mt-1.5 leading-relaxed font-bold">原教案审核驳回，教练员未按要求纠偏</p>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setLocalSession({ ...localSession, planEvaluation: 'no_plan' })}
                                                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                                                        currentPlanEvaluation === 'no_plan'
                                                            ? 'border-rose-500 bg-rose-50/50 shadow-sm'
                                                            : 'border-gray-200 bg-white hover:border-slate-300'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] font-black text-gray-850">3. 无关联教案</span>
                                                        <span className="text-[10px] font-mono font-black text-rose-600 bg-rose-100 px-1.5 rounded">50%</span>
                                                    </div>
                                                    <p className="text-[9px] text-gray-400 mt-1.5 leading-relaxed font-bold">未上传/关联教案，直接进行日常教学与签到</p>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="p-4 rounded-xl border bg-white">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-xs font-black text-gray-805">当前考核:</span>
                                                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-black ${
                                                        currentPlanEvaluation === 'exec_ok' ? 'bg-green-100 text-green-700' :
                                                        currentPlanEvaluation === 'exec_fail' ? 'bg-amber-100 text-amber-700' :
                                                        'bg-rose-100 text-rose-700'
                                                    }`}>
                                                        {currentPlanEvaluation === 'exec_ok' ? '有教案，开课良好 100% 兑付本课时费' :
                                                         currentPlanEvaluation === 'exec_fail' ? '教案审核未过未按要求调整 70% 兑付本课时费' :
                                                         '无教案开课 50% 兑付本课时费'}
                                                    </span>
                                                </div>
                                                <p className="text-[9px] text-gray-400 mt-2 font-bold leading-normal">
                                                    考核比例将直接影响月度薪酬核算里的本节课时费用兑付所得。
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {isDirector ? (
                                    <div className="relative">
                                        <textarea className="w-full h-32 p-4 border rounded-2xl focus:ring-2 focus:ring-bvb-yellow outline-none text-sm leading-relaxed bg-gray-50 focus:bg-white transition-all shadow-inner" placeholder="请对本次训练日志及教练表现进行评价..." value={localSession.directorReview || ''} onChange={e => setLocalSession({...localSession, directorReview: e.target.value})} />
                                        <div className="absolute bottom-3 right-3"><button onClick={() => setLocalSession({...localSession, submissionStatus: 'Reviewed', isReviewRead: false})} disabled={!(localSession.directorReview || '').trim() || localSession.submissionStatus === 'Reviewed'} className="bg-green-600 text-white text-xs font-black px-5 py-2.5 rounded-xl hover:bg-green-700 flex items-center gap-1.5 disabled:opacity-50 disabled:bg-gray-400 shadow-lg"><CheckCircle className="w-4 h-4" /> {localSession.submissionStatus === 'Reviewed' ? '已完成审核' : '确认并发布意见'}</button></div>
                                    </div>
                                ) : (
                                    <div className={`p-6 rounded-3xl border-2 transition-all ${localSession.directorReview ? 'bg-yellow-50/30 border-bvb-yellow/30 shadow-sm' : 'bg-gray-50 border-gray-100 border-dashed'}`}>
                                        {localSession.directorReview ? (
                                            <div className="relative">
                                                <Quote className="absolute -top-3 -left-3 w-10 h-10 text-bvb-yellow/20" />
                                                <div className="text-sm text-gray-700 leading-relaxed font-bold italic relative z-10 pl-2">
                                                    {localSession.directorReview}
                                                </div>
                                                <div className="mt-5 flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-t border-bvb-yellow/10 pt-3">
                                                    <ShieldCheck className="w-4 h-4 text-bvb-yellow" /> 
                                                    OFFICIAL WSZG ACADEMY FEEDBACK
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-sm text-gray-400 italic text-center py-6 flex flex-col items-center gap-3">
                                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-gray-100 shadow-sm"><RefreshCw className="w-6 h-6 opacity-30 animate-spin" /></div>
                                                <span className="font-black uppercase tracking-widest">Waiting for director's review...</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                {(activeTab === 'attendance' || activeTab === 'info') && (
                    <div className="bg-gray-50 p-4 border-t flex justify-end shrink-0 hidden md:flex">
                        <button 
                            onClick={() => { onUpdate(localSession, localSession.attendance); setSaveStatus('saved'); }} 
                            className="px-6 py-2 bg-bvb-black text-white font-bold rounded hover:bg-gray-800 transition-colors flex items-center"
                        >
                            {saveStatus === 'saved' ? <CheckCircle className="w-4 h-4 mr-2" /> : <RefreshCw className={`w-4 h-4 mr-2 ${saveStatus === 'saving' ? 'animate-spin' : ''}`} />}
                            立即保存所有更改
                        </button>
                    </div>
                )}
                <ThemeSelectorModal
                    isOpen={isThemeSelectorOpen}
                    onClose={() => setIsThemeSelectorOpen(false)}
                    onSelect={(focus, title) => {
                        setLocalSession(prev => ({
                            ...prev,
                            focus,
                            title
                        }));
                    }}
                    basicTechThemes={basicTechThemes}
                    scenarioThemes={scenarioThemes}
                />
            </div>
        </div>
    );
};

const TrainingPlanner: React.FC<TrainingPlannerProps> = ({ 
    trainings, teams, players, trainingFoci = [], focusSubjects = {}, designs = [], currentUser, onAddTraining, onUpdateTraining, onDeleteTraining, periodizationPlans = [], onUpdatePeriodization, basicTechThemes = BASIC_TECH_THEMES, scenarioThemes = SCENARIO_THEMES 
}) => {
  const isDirector = currentUser?.role === 'director';
  const isCoach = currentUser?.role === 'coach';

  const [currentDate, setCurrentDate] = useState(new Date());
  const [timeScope, setTimeScope] = useState<TimeScope>('month');
  const [viewType, setViewType] = useState<ViewType>('calendar');
  const [selectedDate, setSelectedDate] = useState<string | null>(new Date().toISOString().split('T')[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAddThemeSelectorOpen, setIsAddThemeSelectorOpen] = useState(false);
  const [showDesignSelectModal, setShowDesignSelectModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [sessionToDuplicate, setSessionToDuplicate] = useState<TrainingSession | null>(null);
  const [duplicateDate, setDuplicateDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [statsTeamFilter, setStatsTeamFilter] = useState<string>(() => {
    if (isCoach && currentUser?.teamIds?.length) return currentUser.teamIds[0];
    return 'all';
  });

  const [activeWeekPlan, setActiveWeekPlan] = useState<WeeklyPlan | null>(null);
  const [periodizationClipboard, setPeriodizationClipboard] = useState<WeeklyPlan | null>(null);

  // 球员关注追踪子模块状态
  const [focusSearchTerm, setFocusSearchTerm] = useState('');
  const [focusListMode, setFocusListMode] = useState<'focused' | 'unfocused'>('focused');
  const [selectedFocusPlayerId, setSelectedFocusPlayerId] = useState<string | null>(null);

  const userManagedSessions = useMemo(() => {
      if (isDirector) return trainings;
      return trainings.filter(t => currentUser?.teamIds?.includes(t.teamId));
  }, [trainings, currentUser, isDirector]);

  const availableTeams = useMemo(() => {
      if (isDirector) return teams;
      return teams.filter(t => currentUser?.teamIds?.includes(t.id));
  }, [currentUser, teams, isDirector]);

  useEffect(() => {
    if (selectedSession) {
        const updated = trainings.find(t => t.id === selectedSession.id);
        if (updated && updated !== selectedSession) {
            setSelectedSession(updated);
        }
    }
  }, [trainings, selectedSession]); 

  const [loading, setLoading] = useState(false);
  const [isAiMode, setIsAiMode] = useState(false);
  const [formData, setFormData] = useState({
      teamId: availableTeams[0]?.id || '',
      title: '',
      focus: trainingFoci[0] || '传接球',
      focusCustom: '',
      duration: 90,
      intensity: 'Medium',
      date: new Date().toISOString().split('T')[0],
      drills: [] as string[],
      linkedDesignId: undefined as string | undefined,
      focusedPlayerIds: [] as string[]
  });

  useEffect(() => {
      if (availableTeams.length > 0 && !availableTeams.find(t => t.id === formData.teamId)) {
          setFormData(prev => ({ ...prev, teamId: availableTeams[0].id }));
      }
  }, [availableTeams, formData.teamId]);

  const [drillInput, setDrillInput] = useState('');

  const { filteredSessions, dateLabel, statsData } = useMemo(() => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      let startDate: Date;
      let endDate: Date;
      let label = '';

      if (timeScope === 'month') {
          startDate = new Date(year, month, 1);
          endDate = new Date(year, month + 1, 0, 23, 59, 59);
          label = `${year}年 ${month + 1}月`;
      } else if (timeScope === 'quarter') {
          const quarterStartMonth = Math.floor(month / 3) * 3;
          startDate = new Date(year, quarterStartMonth, 1);
          endDate = new Date(year, quarterStartMonth + 3, 0, 23, 59, 59);
          label = `${year}年 Q${Math.floor(month / 3) + 1}季度`;
      } else {
          startDate = new Date(year, 0, 1);
          endDate = new Date(year, 11, 31, 23, 59, 59);
          label = `${year}年度`;
      }

      const sessions = userManagedSessions.filter(t => {
          const d = parseLocalDate(t.date);
          const matchDate = d >= startDate && d <= endDate;
          const matchTeam = statsTeamFilter === 'all' || t.teamId === statsTeamFilter;
          return matchDate && matchTeam;
      }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const focusCounts: Record<string, number> = {};
      sessions.forEach(s => {
          focusCounts[s.focus] = (focusCounts[s.focus] || 0) + 1;
      });
      const chartData = Object.keys(focusCounts).map(key => ({
          name: key,
          value: focusCounts[key]
      }));
      return { filteredSessions: sessions, dateLabel: label, statsData: chartData };
  }, [currentDate, timeScope, userManagedSessions, statsTeamFilter]);

  const currentPeriodization = useMemo(() => {
      const teamId = statsTeamFilter === 'all' ? (availableTeams[0]?.id || '') : statsTeamFilter;
      const year = currentDate.getFullYear();
      return periodizationPlans.find(p => p.teamId === teamId && p.year === year) || { id: `p-${teamId}-${year}`, teamId, year, weeks: [] };
  }, [periodizationPlans, statsTeamFilter, availableTeams, currentDate]);

  const matchedWeekPlanForForm = useMemo(() => {
      if (!formData.teamId || !formData.date || !periodizationPlans) return null;
      const weekInfo = getWeekInMonthOfDate(formData.date);
      if (!weekInfo) return null;
      const plan = periodizationPlans.find(p => p.teamId === formData.teamId && p.year === weekInfo.year);
      if (!plan) return null;
      const weekPlan = plan.weeks.find(w => w.month === weekInfo.month && w.weekInMonth === weekInfo.weekInMonth);
      if (weekPlan && (weekPlan.trainingTheme || weekPlan.trainingContent)) {
          return {
              ...weekPlan,
              year: weekInfo.year,
              month: weekInfo.month,
              weekInMonth: weekInfo.weekInMonth
          };
      }
      return null;
  }, [formData.teamId, formData.date, periodizationPlans]);

  // 自动化同步周期训练计划中的重点与主题内容，在未建立周期计划时清除，且取消自主选择
  useEffect(() => {
      if (showAddModal) {
          if (matchedWeekPlanForForm) {
              const theme = matchedWeekPlanForForm.trainingTheme || '';
              const content = matchedWeekPlanForForm.trainingContent || '';
              const isStandard = trainingFoci.includes(theme);
              setFormData(prev => {
                  if (prev.focus === (isStandard ? theme : 'Custom') &&
                      prev.focusCustom === (isStandard ? '' : theme) &&
                      prev.title === content) {
                      return prev;
                  }
                  return {
                      ...prev,
                      focus: isStandard ? theme : 'Custom',
                      focusCustom: isStandard ? '' : theme,
                      title: content
                  };
              });
          } else {
              setFormData(prev => {
                  if (prev.focus === '' && prev.focusCustom === '' && prev.title === '') {
                      return prev;
                  }
                  return {
                      ...prev,
                      focus: '',
                      focusCustom: '',
                      title: ''
                  };
              });
          }
      }
  }, [matchedWeekPlanForForm, showAddModal, trainingFoci]);

  // 球员关注追踪视图逻辑
  const focusedPlayersSummary = useMemo(() => {
    const focusMap: Record<string, { player: Player; stats: any; history: any[]; isLastWeekFocused: boolean; hasUnresolved: boolean }> = {};
    const relevantTrainings = userManagedSessions.filter(s => statsTeamFilter === 'all' || s.teamId === statsTeamFilter);
    
    // 计算上周的时间范围
    const today = new Date();
    const day = today.getDay();
    const diffToLastMonday = (day === 0 ? 6 : day - 1) + 7;
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - diffToLastMonday);
    lastMonday.setHours(0, 0, 0, 0);
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    lastSunday.setHours(23, 59, 59, 999);

    relevantTrainings.forEach(s => {
        if (s.focusedPlayerIds) {
            const sessionDate = parseLocalDate(s.date);
            const inLastWeek = sessionDate >= lastMonday && sessionDate <= lastSunday;

            s.focusedPlayerIds.forEach(pid => {
                const notes = s.focusedPlayerNotes?.[pid] || { technical: '', mental: '', resolved: false };
                if (!focusMap[pid]) {
                    const p = players.find(p => p.id === pid);
                    if (p) {
                        focusMap[pid] = { 
                            player: p, 
                            stats: calculateFocusStats(pid, userManagedSessions),
                            history: [],
                            isLastWeekFocused: false,
                            hasUnresolved: false
                        };
                    }
                }
                if (focusMap[pid]) {
                    if (inLastWeek) focusMap[pid].isLastWeekFocused = true;
                    if (!notes.resolved) focusMap[pid].hasUnresolved = true;
                    focusMap[pid].history.push({
                        id: s.id,
                        date: s.date,
                        title: s.title,
                        notes: notes,
                        session: s
                    });
                }
            });
        }
    });

    return Object.values(focusMap)
        .filter(entry => entry.player.name.includes(focusSearchTerm))
        .sort((a, b) => {
            if (a.isLastWeekFocused !== b.isLastWeekFocused) return a.isLastWeekFocused ? -1 : 1;
            if (a.hasUnresolved !== b.hasUnresolved) return a.hasUnresolved ? -1 : 1;
            return b.stats.year - a.stats.year;
        });
  }, [userManagedSessions, players, focusSearchTerm, statsTeamFilter]);

  const focusedPlayerIdsThisMonth = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const focused = new Set<string>();
    userManagedSessions.forEach(s => {
      const sessionDate = parseLocalDate(s.date);
      if (sessionDate >= startOfMonth && sessionDate <= endOfMonth && s.focusedPlayerIds) {
        s.focusedPlayerIds.forEach(pid => focused.add(pid));
      }
    });
    return focused;
  }, [userManagedSessions]);

  const monthlyFocusStats = useMemo(() => {
    const teamPlayers = players.filter(p => statsTeamFilter === 'all' || p.teamId === statsTeamFilter);
    if (teamPlayers.length === 0) return { coverage: 0, focusedCount: 0, totalCount: 0, unfocusedPlayers: [] };

    const focusedInMonthForTeam = new Set<string>();
    teamPlayers.forEach(p => {
        if (focusedPlayerIdsThisMonth.has(p.id)) {
            focusedInMonthForTeam.add(p.id);
        }
    });

    const unfocusedPlayers = teamPlayers.filter(p => !focusedInMonthForTeam.has(p.id))
        .filter(p => p.name.includes(focusSearchTerm));
    const focusedCount = focusedInMonthForTeam.size;
    const totalCount = teamPlayers.length;
    const coverage = totalCount > 0 ? (focusedCount / totalCount) * 100 : 0;

    return {
      coverage,
      focusedCount,
      totalCount,
      unfocusedPlayers
    };
  }, [players, statsTeamFilter, focusSearchTerm, focusedPlayerIdsThisMonth]);

  const handlePrevPeriod = () => {
        const d = new Date(currentDate);
        if (timeScope === 'month') d.setMonth(d.getMonth() - 1);
        else if (timeScope === 'quarter') d.setMonth(d.getMonth() - 3);
        else d.setFullYear(d.getFullYear() - 1);
        setCurrentDate(d);
  };
  const handleNextPeriod = () => {
        const d = new Date(currentDate);
        if (timeScope === 'month') d.setMonth(d.getMonth() + 1);
        else if (timeScope === 'quarter') d.setMonth(d.getMonth() + 3);
        else d.setFullYear(d.getFullYear() + 1);
        setCurrentDate(d);
  };

  const handleImportDesign = (design: DrillDesign) => {
      setFormData(prev => ({
          ...prev,
          title: design.title,
          focus: 'Custom',
          focusCustom: design.category === 'Drill' ? '技术训练' : design.category === 'Tactic' ? '战术演练' : '综合训练',
          drills: design.keyPoints.length > 0 ? design.keyPoints : [design.description.substring(0, 50) + '...'],
          linkedDesignId: design.id
      }));
      setShowDesignSelectModal(false);
  };

  const renderMonthGrid = (year: number, month: number, isCompact: boolean) => {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const startDay = new Date(year, month, 1).getDay();
      const days = [];
      for (let i = 0; i < startDay; i++) {
          days.push(<div key={`empty-${i}`} className={`${isCompact ? 'h-8' : 'h-16 md:h-40 xl:h-48'} bg-gray-50/50 border-r border-b border-gray-200`}></div>);
      }
      for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const isToday = dateStr === new Date().toISOString().split('T')[0];
          const isSelected = dateStr === selectedDate;
          
          const sessionsOnDay = filteredSessions.filter(t => t.date === dateStr);
          const hasPending = sessionsOnDay.some(s => s.submissionStatus === 'Submitted');
          const hasUnreadReview = sessionsOnDay.some(s => s.submissionStatus === 'Reviewed' && !s.isReviewRead);

          if (isCompact) {
              days.push(
                  <div key={d} onClick={() => setSelectedDate(dateStr)} onDoubleClick={() => { setSelectedDate(dateStr); setFormData(prev => ({ ...prev, date: dateStr })); setShowAddModal(true); }} className={`h-8 border-r border-b border-gray-200 relative cursor-pointer hover:bg-yellow-50 transition-colors flex items-center justify-center ${isSelected ? 'bg-yellow-100' : 'bg-white'}`}>{sessionsOnDay.length > 0 ? (<div className={`w-3 h-3 rounded-full relative ${hasPending ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] animate-pulse' : sessionsOnDay[0].intensity === 'High' ? 'bg-red-500' : sessionsOnDay[0].intensity === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'}`} title={`${sessionsOnDay.length} 节训练`}>{hasUnreadReview && <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-blue-500 rounded-full"></span>}</div>) : (<span className={`text-[10px] ${isToday ? 'font-black text-bvb-black' : 'text-gray-300'}`}>{d}</span>)}</div>
              );
          } else {
              days.push(
                  <div key={d} onClick={() => setSelectedDate(dateStr)} onDoubleClick={() => { setSelectedDate(dateStr); setFormData(prev => ({ ...prev, date: dateStr })); setShowAddModal(true); }} className={`h-16 md:h-40 xl:h-48 border-r border-b border-gray-200 p-1 md:p-2 relative cursor-pointer hover:bg-yellow-50 transition-colors ${isSelected ? 'bg-yellow-50 ring-2 ring-inset ring-bvb-yellow' : 'bg-white'}`}><div className="flex justify-between items-start"><div className="flex items-center"><span className={`text-xs md:text-sm font-bold w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-bvb-black text-bvb-yellow' : 'text-gray-700'}`}>{d}</span>{hasPending && <div className="ml-1 w-1.5 h-1.5 md:w-2.5 md:h-2.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)] border border-white" title="待审核日志"></div>}{hasUnreadReview && <div className="ml-1 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-blue-500 shadow-sm" title="有新审核建议"></div>}</div></div><div className="mt-1 space-y-0.5 md:space-y-1 overflow-y-auto max-h-[calc(100%-28px)] custom-scrollbar">{sessionsOnDay.map(s => { const team = teams.find(t => t.id === s.teamId); return (<div key={s.id} onClick={(e) => { e.stopPropagation(); setSelectedSession(s); }} className={`text-[8px] md:text-[10px] px-1 py-0.5 md:py-1 rounded font-bold truncate border-l-2 cursor-pointer hover:brightness-95 flex justify-between items-center ${s.submissionStatus === 'Submitted' ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-sm ring-1 ring-blue-100' : s.submissionStatus === 'Reviewed' ? (s.isReviewRead ? 'bg-green-50 border-green-500 text-green-700' : 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm') : s.intensity === 'High' ? 'bg-red-50 border-red-500 text-red-700' : s.intensity === 'Medium' ? 'bg-yellow-50 border-yellow-500 text-yellow-800' : s.intensity === 'Low' ? 'bg-green-50 border-green-500 text-green-700' : s.intensity === 'None' ? 'bg-gray-100 border-gray-300 text-gray-500' : 'bg-gray-50 border-gray-300 text-gray-500'}`}><span className="truncate flex-1">{team?.name}</span>
{s.assistantCheckInIds && s.assistantCheckInIds.length > 0 && <UserCheck className="w-2 md:w-3 h-2 md:h-3 text-blue-600 ml-1 flex-shrink-0" title="助教已签到" />}
{s.submissionStatus === 'Reviewed' && <ShieldCheck className="w-2 md:w-3 h-2 md:h-3 text-bvb-black ml-1 flex-shrink-0" />}{s.submissionStatus === 'Submitted' && <FileText className="w-2 md:w-3 h-2 md:h-3 text-blue-600 ml-1 flex-shrink-0 animate-pulse" />}</div>); })}</div></div>
              );
          }
      }
      const weekDays = isCompact ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] : ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return (
          <div className={`flex flex-col border-gray-200 overflow-hidden ${isCompact ? 'border rounded-lg' : 'border rounded-lg'}`}>{isCompact && <div className="text-center text-xs font-bold bg-gray-100 py-1 text-gray-600 border-b border-gray-200">{month + 1}月</div>}<div className="grid grid-cols-7 gap-px bg-gray-200">{weekDays.map((day, i) => (<div key={i} className={`bg-gray-100 text-center font-bold text-gray-500 uppercase ${isCompact ? 'text-[8px] py-0.5' : 'text-[10px] md:text-xs p-1 md:p-2'}`}>{day}</div>))}{days}</div></div>
      );
  };

  const renderFocusView = () => {
    return (
        <div className="flex flex-col lg:flex-row h-full gap-6 animate-in fade-in duration-500">
            {/* 球员关注列表 */}
            <div className="w-full lg:w-96 flex flex-col gap-4 shrink-0">
                {/* Monthly Coverage Stat */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                    <div className="flex justify-between items-end mb-2">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">本月关注覆盖率</p>
                            <h3 className="text-2xl font-black text-bvb-black">{monthlyFocusStats.coverage.toFixed(0)}%</h3>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">已关注 / 总人数</p>
                            <p className="text-sm font-black text-gray-600">{monthlyFocusStats.focusedCount} / {monthlyFocusStats.totalCount}</p>
                        </div>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-bvb-yellow transition-all duration-1000 ease-out" 
                            style={{ width: `${monthlyFocusStats.coverage}%` }}
                        />
                    </div>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button 
                        onClick={() => setFocusListMode('focused')}
                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${focusListMode === 'focused' ? 'bg-white text-bvb-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        关注历史 ({focusedPlayersSummary.length})
                    </button>
                    <button 
                        onClick={() => setFocusListMode('unfocused')}
                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${focusListMode === 'unfocused' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        本月未关注 ({monthlyFocusStats.unfocusedPlayers.length})
                    </button>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-bvb-yellow outline-none shadow-sm"
                        placeholder="搜索球员追踪成长..."
                        value={focusSearchTerm}
                        onChange={e => setFocusSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pb-20 md:pb-4">
                    {focusListMode === 'focused' ? (
                        focusedPlayersSummary.map(entry => {
                            const isSelected = selectedFocusPlayerId === entry.player.id;
                            return (
                                <div 
                                    key={entry.player.id} 
                                    onClick={() => setSelectedFocusPlayerId(entry.player.id)}
                                    className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer relative group ${isSelected ? 'bg-bvb-black border-bvb-black text-white shadow-lg' : 'bg-white border-gray-100 text-gray-800 hover:border-bvb-yellow/50'} ${entry.isLastWeekFocused && !isSelected ? 'ring-1 ring-green-400 ring-offset-1' : ''}`}
                                >
                                    {entry.isLastWeekFocused && (
                                        <div className="absolute -top-1.5 -right-1.5 bg-green-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-sm z-10 animate-bounce">
                                            上周关注
                                        </div>
                                    )}
                                    {entry.hasUnresolved && (
                                        <div className={`absolute -top-1.5 left-2 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-sm z-10 ${isSelected ? 'bg-red-600 ring-1 ring-white' : 'bg-red-500'}`}>
                                            未解决
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <img src={entry.player.image} className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm" />
                                            <div className="absolute -bottom-1 -right-1 p-0.5 bg-bvb-yellow rounded-full border border-white"><Star className="w-2 h-2 text-bvb-black fill-current" /></div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-black text-xs truncate">{entry.player.name}</h4>
                                            <p className={`text-[9px] font-bold uppercase tracking-widest ${isSelected ? 'text-gray-400' : 'text-gray-400'}`}>#{entry.player.number} • {teams.find(t => t.id === entry.player.teamId)?.name}</p>
                                        </div>
                                        <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-bvb-yellow' : 'text-gray-300 group-hover:translate-x-1'}`} />
                                    </div>
                                    <div className={`grid grid-cols-3 gap-1 mt-2 pt-2 border-t ${isSelected ? 'border-white/10' : 'border-gray-50'}`}>
                                        <div className="text-center">
                                            <p className="text-[7px] font-black uppercase opacity-60">本月</p>
                                            <p className="text-xs font-black tabular-nums">{entry.stats.month}</p>
                                        </div>
                                        <div className="text-center border-x border-white/5">
                                            <p className="text-[7px] font-black uppercase opacity-60">本季</p>
                                            <p className="text-xs font-black tabular-nums">{entry.stats.quarter}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[7px] font-black uppercase opacity-60">年度</p>
                                            <p className={`text-xs font-black tabular-nums ${isSelected ? 'text-bvb-yellow' : 'text-bvb-black'}`}>{entry.stats.year}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        monthlyFocusStats.unfocusedPlayers.map(player => {
                            const isSelected = selectedFocusPlayerId === player.id;
                            return (
                                <div 
                                    key={player.id} 
                                    onClick={() => setSelectedFocusPlayerId(player.id)}
                                    className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer relative group ${isSelected ? 'bg-bvb-black border-bvb-black text-white shadow-lg' : 'bg-white border-gray-100 text-gray-800 hover:border-bvb-yellow/50'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <img src={player.image} className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm" />
                                            <div className="absolute -bottom-1 -right-1 p-0.5 bg-gray-200 rounded-full border border-white"><UsersIcon className="w-2 h-2 text-gray-500" /></div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-black text-xs truncate">{player.name}</h4>
                                            <p className={`text-[9px] font-bold uppercase tracking-widest ${isSelected ? 'text-gray-400' : 'text-gray-400'}`}>#{player.number} • {teams.find(t => t.id === player.teamId)?.name}</p>
                                        </div>
                                        <div className="text-[8px] font-black uppercase text-red-500 bg-red-50 px-1.5 py-0.5 rounded">本月未关注</div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    {focusListMode === 'focused' && focusedPlayersSummary.length === 0 && (
                        <div className="py-20 text-center text-gray-400 flex flex-col items-center gap-4">
                            <History className="w-12 h-12 opacity-10" />
                            <p className="text-xs font-black uppercase tracking-widest">暂无重点关注球员记录</p>
                        </div>
                    )}
                    {focusListMode === 'unfocused' && monthlyFocusStats.unfocusedPlayers.length === 0 && (
                        <div className="py-20 text-center text-green-500 flex flex-col items-center gap-4">
                            <CheckCircle className="w-12 h-12 opacity-20" />
                            <p className="text-xs font-black uppercase tracking-widest">本月已完成全员关注覆盖</p>
                        </div>
                    )}
                </div>
            </div>

            {/* 球员成长追踪时间轴 */}
            <div className="flex-1 flex flex-col bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
                {selectedFocusPlayerId ? (
                    <React.Fragment>
                        {(() => {
                            const entry = focusedPlayersSummary.find(e => e.player.id === selectedFocusPlayerId);
                            if (!entry) return null;
                            const history = [...entry.history].sort((a,b) => b.date.localeCompare(a.date));
                            return (
                                <React.Fragment>
                                    <div className="p-6 md:p-8 bg-gray-50 border-b flex justify-between items-end shrink-0">
                                        <div className="flex items-center gap-5">
                                            <img src={entry.player.image} className="w-20 h-20 rounded-3xl object-cover border-4 border-white shadow-xl rotate-[-2deg]" />
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="text-2xl font-black text-gray-800">{entry.player.name}</h3>
                                                    <Star className="w-5 h-5 text-bvb-yellow fill-current" />
                                                </div>
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Growth & Psychological Tracking Portal</p>
                                                <div className="flex gap-4 mt-4">
                                                    <div className="flex flex-col"><span className="text-[8px] font-black text-gray-400 uppercase">年度关注频次</span><span className="text-lg font-black text-bvb-black">{entry.stats.year} 次</span></div>
                                                    <div className="w-px h-8 bg-gray-200"></div>
                                                    <div className="flex flex-col"><span className="text-[8px] font-black text-gray-400 uppercase">最后关注日期</span><span className="text-lg font-black text-gray-800">{history[0]?.date || '-'}</span></div>
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={async () => {
                                                setIsExporting(true);
                                                try { await exportToPDF('focus-tracking-export', `${entry.player.name}_重点关注成长报告`); }
                                                catch { alert('导出失败'); } finally { setIsExporting(false); }
                                            }}
                                            className="hidden md:flex items-center gap-2 px-6 py-2.5 bg-bvb-black text-white font-black rounded-xl hover:bg-gray-800 shadow-lg transition-all text-xs italic uppercase tracking-widest"
                                        >
                                            {isExporting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4 text-bvb-yellow"/>}
                                            Export Profile
                                        </button>
                                    </div>
                                    <div id="focus-tracking-export" className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
                                        <div className="relative space-y-8">
                                            <div className="absolute left-[23px] top-4 bottom-4 w-1 bg-gray-100 rounded-full"></div>
                                            {history.map((h, idx) => (
                                                <div key={h.id} className="relative pl-14 animate-in slide-in-from-left-4" style={{ animationDelay: `${idx * 100}ms` }}>
                                                    <div className="absolute left-0 top-0 w-12 h-12 bg-white rounded-2xl border-4 border-gray-50 shadow-md flex items-center justify-center z-10">
                                                        <span className="text-[10px] font-black text-gray-400 font-mono leading-none">{h.date.split('-').slice(1).join('/')}</span>
                                                    </div>
                                                    <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-6 hover:bg-white hover:shadow-md transition-all group">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <h5 className="font-black text-lg text-gray-800 group-hover:text-bvb-black transition-colors">{h.title}</h5>
                                                            <div className="flex items-center gap-2">
                                                                {!h.notes.resolved && (
                                                                    <span className="flex items-center gap-1 text-[10px] font-black text-red-600 uppercase bg-red-50 px-2 py-1 rounded border border-red-100">
                                                                        <AlertCircle className="w-3 h-3" /> 未解决
                                                                    </span>
                                                                )}
                                                                {h.notes.resolved ? (
                                                                    <span className="flex items-center gap-1 text-[10px] font-black text-green-600 uppercase bg-green-50 px-2 py-1 rounded border border-green-100">
                                                                        <CheckCircle className="w-3 h-3" /> 已解决
                                                                    </span>
                                                                ) : (
                                                                    <button 
                                                                        onClick={() => {
                                                                            const updatedSession = { ...h.session };
                                                                            if (updatedSession.focusedPlayerNotes && updatedSession.focusedPlayerNotes[entry.player.id]) {
                                                                                updatedSession.focusedPlayerNotes[entry.player.id] = {
                                                                                    ...updatedSession.focusedPlayerNotes[entry.player.id],
                                                                                    resolved: true
                                                                                };
                                                                                onUpdateTraining(updatedSession, updatedSession.attendance);
                                                                            }
                                                                        }}
                                                                        className="flex items-center gap-1 text-[10px] font-black text-bvb-black uppercase bg-bvb-yellow px-2 py-1 rounded border border-bvb-black/10 hover:bg-yellow-400 transition-colors"
                                                                    >
                                                                        标记已解决
                                                                    </button>
                                                                )}
                                                                <span className="text-[10px] font-black text-gray-400 uppercase bg-white px-2 py-1 rounded border border-gray-100">Training Record</span>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black text-bvb-black uppercase tracking-widest flex items-center gap-1.5">
                                                                    <Target className="w-3.5 h-3.5 text-bvb-yellow" /> 技术表现评价
                                                                </label>
                                                                <div className="text-sm text-gray-600 leading-relaxed italic bg-white p-3 rounded-xl border border-gray-50 min-h-[60px]">
                                                                    {h.notes.technical || '-- 暂无技战术层反馈记录 --'}
                                                                </div>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                                                                    <Brain className="w-3.5 h-3.5 text-indigo-400" /> 心理/态度评估
                                                                </label>
                                                                <div className="text-sm text-gray-600 leading-relaxed italic bg-white p-3 rounded-xl border border-gray-50 min-h-[60px]">
                                                                    {h.notes.mental || '-- 暂无心理层面评估记录 --'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        })()}
                    </React.Fragment>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-300 p-10">
                        <UsersIcon className="w-20 h-20 opacity-10 mb-6" />
                        <h4 className="text-xl font-black text-gray-400 uppercase italic tracking-tighter mb-2">Focus Player Analytics</h4>
                        <p className="text-sm font-bold text-center max-w-xs uppercase tracking-widest opacity-60">请从左侧列表中选择一名关注球员查看其历史成长轨迹及反馈。</p>
                    </div>
                )}
            </div>
        </div>
    );
  };

  const renderPeriodizationView = () => {
    const year = currentDate.getFullYear();
    const months = timeScope === 'year' ? Array.from({length: 12}, (_, i) => i + 1) : 
                   timeScope === 'quarter' ? Array.from({length: 3}, (_, i) => Math.floor(currentDate.getMonth() / 3) * 3 + i + 1) :
                   [currentDate.getMonth() + 1];

    const handleSaveWeek = (updatedWeek: WeeklyPlan) => {
        const nextWeeks = [...currentPeriodization.weeks];
        const idx = nextWeeks.findIndex(w => w.month === updatedWeek.month && w.weekInMonth === updatedWeek.weekInMonth);
        if (idx >= 0) nextWeeks[idx] = updatedWeek;
        else nextWeeks.push(updatedWeek);
        onUpdatePeriodization?.({ ...currentPeriodization, weeks: nextWeeks });
        setActiveWeekPlan(null);
    };

    const handleCopyWeek = (week: WeeklyPlan) => {
        setPeriodizationClipboard(week);
        alert(`已复制 ${week.month}月 第${week.weekInMonth}周 计划到剪贴板`);
    };

    const handlePasteToWeek = (month: number, weekNum: number) => {
        if (!periodizationClipboard) return;
        const targetWeek = {
            ...periodizationClipboard,
            id: `w-${month}-${weekNum}`,
            month,
            weekInMonth: weekNum,
            year
        };
        const nextWeeks = [...currentPeriodization.weeks];
        const idx = nextWeeks.findIndex(w => w.month === month && w.weekInMonth === weekNum);
        if (idx >= 0) nextWeeks[idx] = targetWeek;
        else nextWeeks.push(targetWeek);
        onUpdatePeriodization?.({ ...currentPeriodization, weeks: nextWeeks });
        alert(`内容已成功粘贴到 ${month}月 第${weekNum}周`);
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto relative no-scrollbar">
                    <table className="w-full text-center border-collapse table-fixed min-w-[850px] md:min-w-[1200px]">
                        <thead className="bg-gray-100 text-gray-600 font-black uppercase text-[8px] md:text-[10px] tracking-widest border-b">
                            <tr>
                                <th className="px-2 md:px-4 py-3 border-r w-12 md:w-16 sticky left-0 z-30 bg-gray-100">月份</th>
                                <th className="px-2 md:px-4 py-3 border-r w-14 md:w-20 sticky left-12 md:left-16 z-30 bg-gray-100">周期</th>
                                <th className="px-2 md:px-4 py-3 border-r w-20 md:w-24">体能主题</th>
                                <th className="px-2 md:px-4 py-3 border-r w-20 md:w-24">训练主题</th>
                                <th className="px-2 md:px-4 py-3 border-r w-40 md:w-48 text-left">训练内容</th>
                                <th className="px-2 md:px-4 py-3 border-r w-24 md:w-32">情景对抗</th>
                                <th className="px-2 md:px-4 py-3 border-r w-40 md:w-48">训练目标</th>
                                <th className="px-2 md:px-4 py-3 border-r w-24 md:w-32">赛事计划</th>
                                <th className="px-2 md:px-4 py-3 w-20 md:w-24">备注</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {months.map(month => {
                                const monthWeeksCount = getSundaysInMonth(year, month);
                                const monthWeeks = Array.from({length: monthWeeksCount}, (_, i) => i + 1);
                                return monthWeeks.map((weekNum, idx) => {
                                    const weekPlan = currentPeriodization.weeks.find(w => w.month === month && w.weekInMonth === weekNum) || {
                                        id: `w-${month}-${weekNum}`,
                                        year, month, weekInMonth: weekNum,
                                        physicalTheme: '', trainingTheme: '', trainingContent: '', oppositionContent: '', trainingGoals: '', matchPlan: '', remarks: ''
                                    };
                                    const isClipboardSource = periodizationClipboard?.id === weekPlan.id;
                                    
                                    return (
                                        <tr key={`${month}-${weekNum}`} className={`hover:bg-yellow-50/30 transition-colors group cursor-pointer ${isClipboardSource ? 'bg-yellow-50' : ''}`} onClick={() => setActiveWeekPlan(weekPlan)}>
                                            {idx === 0 && (
                                                <td rowSpan={monthWeeksCount} className="border-r font-black text-sm md:text-lg bg-gray-50/80 backdrop-blur-sm sticky left-0 z-20">
                                                    {month}月
                                                </td>
                                            )}
                                            <td className="px-1 md:px-2 py-3 md:py-4 border-r font-bold text-[9px] md:text-xs text-gray-500 bg-gray-50/40 sticky left-12 md:left-16 z-20">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span>第{weekNum}周</span>
                                                    <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleCopyWeek(weekPlan); }}
                                                            className="p-1 bg-white border border-gray-200 rounded text-gray-400 hover:text-bvb-black hover:border-bvb-yellow shadow-sm"
                                                            title="复制此周"
                                                        >
                                                            <ClipboardCopy className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                                        </button>
                                                        {periodizationClipboard && !isClipboardSource && (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handlePasteToWeek(month, weekNum); }}
                                                                className="p-1 bg-bvb-yellow border border-bvb-yellow rounded text-bvb-black shadow-sm"
                                                                title="粘贴到此周"
                                                            >
                                                                <ClipboardPaste className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-1 md:px-2 py-3 md:py-4 border-r text-[9px] md:text-xs font-bold text-gray-700">{weekPlan.physicalTheme || '-'}</td>
                                            <td className="px-1 md:px-2 py-3 md:py-4 border-r text-[9px] md:text-xs font-black text-bvb-black bg-yellow-50/20">{weekPlan.trainingTheme || '-'}</td>
                                            <td className="px-2 md:px-4 py-3 md:py-4 border-r text-[9px] md:text-[11px] text-gray-600 text-left leading-snug md:leading-relaxed">
                                                {weekPlan.trainingContent || '-'}
                                            </td>
                                            <td className="px-1 md:px-2 py-3 md:py-4 border-r text-[9px] md:text-[11px] font-black text-blue-600">{weekPlan.oppositionContent || '-'}</td>
                                            {idx === 0 && (
                                                <td rowSpan={monthWeeksCount} className="px-2 md:px-4 py-3 md:py-4 border-r text-[9px] md:text-[11px] text-red-600 font-bold text-left align-top leading-snug md:leading-relaxed whitespace-pre-wrap">
                                                    {weekPlan.trainingGoals || '-'}
                                                </td>
                                            )}
                                            <td className="px-1 md:px-2 py-3 md:py-4 border-r text-[9px] md:text-[11px] font-bold text-gray-800">{weekPlan.matchPlan || '-'}</td>
                                            <td className="px-1 md:px-2 py-3 md:py-4 text-[8px] md:text-[10px] text-gray-400 italic">{weekPlan.remarks || '-'}</td>
                                        </tr>
                                    );
                                });
                            })}
                        </tbody>
                    </table>
                </div>
                {activeWeekPlan && (
                    <WeeklyPlanEditor 
                        week={activeWeekPlan} 
                        onSave={handleSaveWeek} 
                        onClose={() => setActiveWeekPlan(null)} 
                        clipboard={periodizationClipboard}
                        onCopy={handleCopyWeek}
                        trainingFoci={trainingFoci}
                        focusSubjects={focusSubjects}
                        basicTechThemes={basicTechThemes}
                        scenarioThemes={scenarioThemes}
                    />
                )}
            </div>
        </div>
    );
  };

  const renderListView = () => {
    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-in fade-in duration-300">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-gray-600 font-black uppercase text-[10px] tracking-widest border-b">
                        <tr>
                            <th className="px-3 md:px-6 py-4">训练日期</th>
                            <th className="px-3 md:px-6 py-4">梯队</th>
                            <th className="px-3 md:px-6 py-4">主题</th>
                            <th className="px-3 md:px-6 py-4 hidden md:table-cell">时长</th>
                            <th className="px-3 md:px-6 py-4 hidden md:table-cell">重点</th>
                            <th className="px-3 md:px-6 py-4 hidden md:table-cell">强度</th>
                            <th className="px-3 md:px-6 py-4 text-right">状态</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredSessions.length > 0 ? (
                            filteredSessions.map(s => {
                                const team = teams.find(t => t.id === s.teamId);
                                const isUnread = isCoach && s.submissionStatus === 'Reviewed' && !s.isReviewRead;
                                const isPendingDirector = isDirector && s.submissionStatus === 'Submitted';
                                
                                return (
                                    <tr 
                                        key={s.id} 
                                        onClick={() => setSelectedSession(s)}
                                        className={`hover:bg-yellow-50/50 cursor-pointer transition-colors group ${isUnread ? 'bg-blue-50/30' : isPendingDirector ? 'bg-blue-50/20' : ''}`}
                                    >
                                        <td className="px-3 md:px-6 py-4 font-mono text-xs md:text-sm text-gray-500 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                {(isUnread || isPendingDirector) && <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-sm"></span>}
                                                {s.date}
                                            </div>
                                        </td>
                                        <td className="px-3 md:px-6 py-4 font-bold text-xs md:text-sm text-gray-700">{team?.name || '-'}</td>
                                        <td className="px-3 md:px-6 py-4">
                                            <div className="flex items-center gap-1.5 md:gap-2">
                                                <span className={`font-bold text-xs md:text-sm group-hover:underline truncate max-w-[100px] md:max-w-none ${isUnread || isPendingDirector ? 'text-blue-700' : 'text-bvb-black'}`}>{s.title}</span>
                                                {s.linkedDesignId && <PenTool className="w-3 md:w-3.5 h-3 md:h-3.5 text-purple-500 shrink-0" title="关联教案" />}
                                                {s.assistantCheckInIds && s.assistantCheckInIds.length > 0 && <UserCheck className="w-3 md:w-3.5 h-3 md:h-3.5 text-blue-600 shrink-0" title="助教已签到" />}
                                            </div>
                                        </td>
                                        <td className="px-3 md:px-6 py-4 text-sm text-gray-500 hidden md:table-cell">{s.duration} min</td>
                                        <td className="px-3 md:px-6 py-4 hidden md:table-cell">
                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-bold uppercase">{s.focus}</span>
                                        </td>
                                        <td className="px-3 md:px-6 py-4 hidden md:table-cell">
                                            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full border ${
                                                s.intensity === 'High' ? 'bg-red-50 text-red-700 border-red-100' : 
                                                s.intensity === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' : 
                                                'bg-green-50 text-green-700 border-green-100'
                                            }`}>
                                                {s.intensity === 'High' ? '高' : s.intensity === 'Medium' ? '中' : '低'}
                                            </span>
                                        </td>
                                        <td className="px-3 md:px-6 py-4 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end">
                                                {s.submissionStatus === 'Reviewed' ? (
                                                    <span className={`flex items-center gap-1 text-[9px] md:text-[10px] font-black uppercase ${isUnread ? 'text-blue-600' : 'text-green-600'}`} title={isUnread ? '新反馈待阅' : '已查看总监评价'}>
                                                        {isUnread ? <Bell className="w-3 h-3 animate-bounce" /> : <ShieldCheck className="w-3 h-3" />}
                                                        <span className="hidden sm:inline">{isUnread ? '反馈待阅' : '已审核'}</span>
                                                    </span>
                                                ) : s.submissionStatus === 'Submitted' ? (
                                                    <span className="flex items-center gap-1 text-[9px] md:text-[10px] font-black text-blue-600 uppercase">
                                                        <RefreshCw className="w-3 h-3 animate-spin" /> 
                                                        <span className="hidden sm:inline">{isDirector ? '待审核日志' : '审核中'}</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase">未提交</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={7} className="px-6 py-20 text-center text-gray-400 italic font-bold">
                                    -- 选定范围内暂无训练计划安排 --
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
  };

  const renderCalendarView = () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      if (timeScope === 'month') return renderMonthGrid(year, month, false);
      else if (timeScope === 'quarter') {
          const startMonth = Math.floor(month / 3) * 3;
          return (<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-y-auto p-1">{[0, 1, 2].map(offset => renderMonthGrid(year, startMonth + offset, true))}</div>);
      } else return (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 h-full overflow-y-auto p-1">{Array.from({ length: 12 }).map((_, i) => renderMonthGrid(year, i, true))}</div>);
  };

  const renderStats = () => (
    <div className="bg-white p-4 rounded-xl border border-gray-200 h-64 md:h-80 flex flex-col">
        <div className="flex flex-col gap-2 mb-4 shrink-0">
            <h4 className="font-bold text-gray-800 text-xs uppercase flex items-center">
                <PieChartIcon className="w-3.5 h-3.5 mr-1.5 text-bvb-yellow" /> 训练重点分布
            </h4>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Focus Area Distribution</p>
        </div>
        <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={statsData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={5} dataKey="value">
                        {statsData.map((entry, index) => (<Cell key={`cell-${index}`} fill={['#FDE100', '#000000', '#9CA3AF', '#D1D5DB'][index % 4]} />))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '12px' }} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} verticalAlign="bottom" />
                </PieChart>
            </ResponsiveContainer>
        </div>
    </div>
  );

  const handleExportPDF = async () => {
        setIsExporting(true);
        try { 
            if (viewType === 'periodization') {
                const teamName = teams.find(t => t.id === statsTeamFilter)?.name || '未知梯队';
                await exportToPDF('periodization-plan-export', `周期性训练大纲_${teamName}_${dateLabel}`); 
            } else {
                await exportToPDF('training-plan-list-pdf', `训练计划明细报表_${dateLabel}`); 
            }
        } catch { 
            alert('导出失败'); 
        } finally { 
            setIsExporting(false); 
        }
    };
    
  const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            let finalDrills = formData.drills;
            let finalTitle = formData.title;
            if (isAiMode && !finalDrills.length) {
                 const plan = await generateTrainingPlan(formData.focus === 'Custom' ? formData.focusCustom : formData.focus, formData.duration, formData.intensity);
                 if (plan.drills) finalDrills = plan.drills;
                 if (plan.title) finalTitle = plan.title;
            }
            if (!finalTitle) finalTitle = `${formData.focus} 训练`;
            const newSession: TrainingSession = { 
                id: Date.now().toString(), 
                teamId: formData.teamId, 
                title: finalTitle, 
                date: formData.date, 
                focus: formData.focus === 'Custom' ? formData.focusCustom : formData.focus, 
                duration: formData.duration, 
                intensity: formData.intensity as any, 
                drills: finalDrills, 
                aiGenerated: isAiMode, 
                attendance: [], 
                submissionStatus: 'Planned', 
                isReviewRead: true, 
                coachId: currentUser?.id,
                linkedDesignId: formData.linkedDesignId,
                focusedPlayerIds: formData.focusedPlayerIds,
                focusedPlayerNotes: {},
                performanceRatings: { technical: 5, application: 5, focus: 5, discipline: 5 },
                planReflection: ''
            };
            onAddTraining(newSession);
            setShowAddModal(false);
            setFormData({ 
                teamId: availableTeams[0]?.id || '', 
                title: '', 
                focus: trainingFoci[0] || '传接球', 
                focusCustom: '', 
                duration: 90, 
                intensity: 'Medium', 
                date: new Date().toISOString().split('T')[0], 
                drills: [], 
                linkedDesignId: undefined, 
                focusedPlayerIds: [] 
            });
            setIsAiMode(false);
        } catch (error) { console.error(error); alert('创建失败'); } finally { setLoading(false); }
  };

  const handleDuplicateConfirm = () => {
      if (!sessionToDuplicate) return;
      const weekInfo = getWeekInMonthOfDate(duplicateDate);
      if (weekInfo) {
          const plan = periodizationPlans.find(p => p.teamId === sessionToDuplicate.teamId && p.year === weekInfo.year);
          const weekPlan = plan?.weeks.find(w => w.month === weekInfo.month && w.weekInMonth === weekInfo.weekInMonth);
          if (!weekPlan || (!weekPlan.trainingTheme && !weekPlan.trainingContent)) {
              alert(`目标日期 [第${weekInfo.month}月 第${weekInfo.weekInMonth}周] 尚未建立周期性训练计划，无法在该日期新建或复制训练计划。`);
              return;
          }
          const theme = weekPlan.trainingTheme || '';
          const copy: TrainingSession = { 
              ...sessionToDuplicate, 
              id: Date.now().toString(), 
              title: weekPlan.trainingContent || sessionToDuplicate.title, 
              focus: theme,
              date: duplicateDate, 
              submissionStatus: 'Planned', 
              isReviewRead: true, 
              coachId: currentUser?.id, 
              attendance: [], 
              coachFeedback: '', 
              directorReview: '', 
              focusedPlayerNotes: {} 
          };
          onAddTraining(copy);
          setSessionToDuplicate(null);
          alert('已成功复制训练计划到 ' + duplicateDate);
      }
  };

  const addDrill = () => { if(drillInput.trim()) { setFormData(prev => ({ ...prev, drills: [...prev.drills, drillInput.trim()] })); setDrillInput(''); } };
  const removeDrill = (idx: number) => { setFormData(prev => ({ ...prev, drills: prev.drills.filter((_, i) => i !== idx) })); };

  return (
    <div className="space-y-6 flex flex-col h-auto pb-20 md:pb-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl md:text-3xl font-black text-bvb-black uppercase">训练计划</h2>
                <div className="flex items-center gap-2">
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button onClick={() => setViewType('calendar')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] md:text-xs font-black transition-all ${viewType === 'calendar' ? 'bg-white shadow text-bvb-black' : 'text-gray-400'}`}>
                            <CalendarIcon className="w-3 h-3 md:w-3.5 md:h-3.5" /> 日历
                        </button>
                        <button onClick={() => setViewType('list')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] md:text-xs font-black transition-all ${viewType === 'list' ? 'bg-white shadow text-bvb-black' : 'text-gray-400'}`}>
                            <LayoutList className="w-3 h-3 md:w-3.5 md:h-3.5" /> 列表
                        </button>
                        <button onClick={() => setViewType('periodization')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] md:text-xs font-black transition-all ${viewType === 'periodization' ? 'bg-white shadow text-bvb-black' : 'text-gray-400'}`}>
                            <TableProperties className="w-3 h-3 md:w-3.5 md:h-3.5" /> 周期
                        </button>
                        <button onClick={() => setViewType('focus')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] md:text-xs font-black transition-all ${viewType === 'focus' ? 'bg-white shadow text-bvb-black' : 'text-gray-400'}`}>
                            <Star className="w-3 h-3 md:w-3.5 md:h-3.5" /> 关注
                        </button>
                    </div>
                    <div className="h-4 w-px bg-gray-300 mx-1"></div>
                    <button onClick={() => setTimeScope('month')} className={`text-[10px] font-black uppercase px-2 py-1 rounded transition-colors ${timeScope === 'month' ? 'bg-bvb-black text-bvb-yellow' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}>月</button>
                    <button onClick={() => setTimeScope('quarter')} className={`text-[10px] font-black uppercase px-2 py-1 rounded transition-colors ${timeScope === 'quarter' ? 'bg-bvb-black text-bvb-yellow' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}>季</button>
                    <button onClick={() => setTimeScope('year')} className={`text-[10px] font-black uppercase px-2 py-1 rounded transition-colors ${timeScope === 'year' ? 'bg-bvb-black text-bvb-yellow' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}>年</button>
                </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl p-1.5 shadow-sm shrink-0 flex-1 md:flex-none">
                    <UsersIcon className="w-4 h-4 text-gray-400 ml-1" />
                    <select 
                        value={statsTeamFilter} 
                        onChange={e => setStatsTeamFilter(e.target.value)}
                        className="bg-transparent text-[11px] md:text-xs font-black uppercase text-gray-700 outline-none focus:ring-0 cursor-pointer min-w-[80px] md:min-w-[120px]"
                    >
                        {isDirector && <option value="all">全部管理梯队</option>}
                        {availableTeams.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm shrink-0 flex-1 md:flex-none justify-between">
                    <button onClick={handlePrevPeriod} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><ChevronLeft className="w-5 h-5 text-gray-400" /></button>
                    <span className="px-2 font-black text-xs md:text-sm flex-1 md:min-w-[110px] text-center whitespace-nowrap">{dateLabel}</span>
                    <button onClick={handleNextPeriod} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><ChevronRight className="w-5 h-5 text-gray-400" /></button>
                </div>

                <div className="flex gap-2">
                    <button onClick={handleExportPDF} disabled={isExporting} className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 shadow-sm transition-all" title="导出 (PDF)">
                        {isExporting ? <Loader2 className="w-5 h-5 animate-spin"/> : <Download className="w-5 h-5"/>}
                    </button>
                    <button 
                        onClick={() => {
                            const initialDate = selectedDate || new Date().toISOString().split('T')[0];
                            const initialTeamId = statsTeamFilter === 'all' ? (formData.teamId || availableTeams[0]?.id || '') : statsTeamFilter;
                            setFormData(prev => ({
                                ...prev,
                                date: initialDate,
                                teamId: initialTeamId,
                                title: '',
                                focus: '',
                                focusCustom: '',
                                drills: [],
                                linkedDesignId: undefined,
                                focusedPlayerIds: []
                            }));
                            setShowAddModal(true);
                        }} 
                        className="flex items-center justify-center p-2.5 md:px-5 md:py-2.5 bg-bvb-yellow text-bvb-black font-black rounded-xl shadow-lg hover:brightness-105 transition-all"
                    >
                        <Plus className="w-5 h-5 md:mr-2" /> <span className="hidden md:inline">新建课次</span>
                    </button>
                </div>
            </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
             <div className="flex-1 p-1">
                 {viewType === 'calendar' ? renderCalendarView() : 
                  viewType === 'list' ? renderListView() : 
                  viewType === 'periodization' ? renderPeriodizationView() :
                  renderFocusView()}
             </div>
             
             {viewType !== 'periodization' && viewType !== 'focus' && (
             <div className="w-full lg:w-72 flex flex-col gap-6 shrink-0 mt-6 lg:mt-0">
                 {renderStats()}
                 <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm min-h-[300px]">
                    <h4 className="font-black text-gray-800 mb-4 text-[10px] uppercase tracking-widest flex justify-between items-center border-b pb-3 border-gray-50">
                        <span>{selectedDate} 当日详情</span>
                        {selectedDate === new Date().toISOString().split('T')[0] && <span className="text-[10px] bg-bvb-black px-2 py-0.5 rounded-full text-bvb-yellow font-black">TODAY</span>}
                    </h4>
                    <div className="space-y-4">
                        {filteredSessions.filter(t => t.date === selectedDate).length > 0 ? (
                            filteredSessions.filter(t => t.date === selectedDate).map(s => {
                                const team = teams.find(t => t.id === s.teamId);
                                const isUnread = isCoach && s.submissionStatus === 'Reviewed' && !s.isReviewRead;
                                const isPendingDirector = isDirector && s.submissionStatus === 'Submitted';

                                return (
                                    <div key={s.id} onClick={() => setSelectedSession(s)} className={`p-4 border rounded-2xl cursor-pointer transition-all group relative ${isUnread || isPendingDirector ? 'bg-blue-50/50 border-blue-200 shadow-sm' : 'bg-gray-50 border-gray-100 hover:bg-yellow-50 hover:border-bvb-yellow/30 shadow-none'}`}>
                                        {(isUnread || isPendingDirector) && <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white animate-pulse"></span>}
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{team?.name}</span>
                                            <div className="flex items-center gap-1.5">
                                                {s.focusedPlayerIds && s.focusedPlayerIds.length > 0 && <Star className="w-3 h-3 text-bvb-yellow fill-current" />}
                                                {s.linkedDesignId && <PenTool className="w-3 h-3 text-purple-500" />}
                                                {s.submissionStatus === 'Submitted' && <FileText className="w-3 h-3 text-blue-600 animate-pulse" title="日志待审核" />}
                                                {s.submissionStatus === 'Reviewed' && <ShieldCheck className={`w-3 h-3 ${isUnread ? 'text-blue-600' : 'text-green-600'}`} />}
                                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${
                                                    s.intensity === 'High' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'
                                                }`}>{s.intensity}</span>
                                            </div>
                                        </div>
                                        <h5 className={`font-black group-hover:text-bvb-black leading-tight ${isUnread || isPendingDirector ? 'text-blue-900' : 'text-gray-800'}`}>{s.title}</h5>
                                        <div className="flex items-center gap-3 text-[10px] text-gray-400 font-bold mt-4 uppercase">
                                            <div className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {s.duration} MIN</div>
                                            <div className="flex items-center"><Target className="w-3 h-3 mr-1" /> {s.focus}</div>
                                        </div>
                                        <ChevronRight className="absolute right-3 bottom-4 w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                    </div>
                                )
                            })
                        ) : (
                            <div className="text-center py-16 flex flex-col items-center gap-4 text-gray-300">
                                <CalendarIcon className="w-10 h-10 md:w-12 md:h-12 opacity-10" />
                                <p className="text-xs font-bold uppercase tracking-widest text-center">当日无训练记录<br/>(双击日期添加)</p>
                            </div>
                        )}
                    </div>
                 </div>
             </div>
             )}
        </div>

        {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white w-full h-full md:h-auto md:max-w-xl rounded-none md:rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col md:max-h-[90vh]">
                <div className="bg-bvb-black p-4 flex justify-between items-center text-white shrink-0">
                  <h3 className="font-bold flex items-center"><Plus className="w-5 h-5 mr-2 text-bvb-yellow" /> 新建训练计划</h3>
                  <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleAddSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto pb-24 md:pb-6">
                  
                  {/* 第一步：选择所属梯队与培训日期 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-xs">
                    <div>
                      <label className="block text-xs font-black text-gray-500 uppercase mb-1">所属梯队</label>
                      <select 
                        className="w-full p-2.5 border border-gray-250 rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none font-black bg-white text-sm cursor-pointer" 
                        value={formData.teamId} 
                        onChange={e => setFormData({...formData, teamId: e.target.value})}
                      >
                        {availableTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-gray-500 uppercase mb-1 font-bold">培训日期</label>
                      <input 
                        type="date" 
                        className="w-full p-2.5 border border-gray-250 rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none font-black bg-white text-sm text-gray-800" 
                        value={formData.date} 
                        onChange={e => setFormData({...formData, date: e.target.value})} 
                        required 
                      />
                    </div>
                  </div>

                  {/* 周期计划匹配状态展示 */}
                  {matchedWeekPlanForForm ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3 shadow-xs animate-in slide-in-from-top-2 duration-200 text-sm">
                      <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-xs uppercase tracking-wider">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span>📅 周期训练计划已匹配并强制同步 (第 {matchedWeekPlanForForm.month}月 第{matchedWeekPlanForForm.weekInMonth}周)</span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-white p-3 rounded-lg border border-emerald-100 flex flex-col justify-between shadow-xs">
                          <div>
                            <span className="text-gray-400 block text-[10px] font-black uppercase tracking-wider mb-1">重点分类 (强制同步)</span>
                            <span className="font-extrabold text-gray-800 text-xs md:text-sm bg-gray-100/50 px-2.5 py-1.5 rounded border border-gray-200 block truncate">
                              {matchedWeekPlanForForm.trainingTheme || '无重点'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="bg-white p-3 rounded-lg border border-emerald-100 flex flex-col justify-between shadow-xs">
                          <div>
                            <span className="text-gray-400 block text-[10px] font-black uppercase tracking-wider mb-1">主要主题 (强制同步)</span>
                            <span className="font-extrabold text-gray-805 text-xs md:text-sm line-clamp-2" title={matchedWeekPlanForForm.trainingContent}>
                              {matchedWeekPlanForForm.trainingContent || '无特定主题'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {(matchedWeekPlanForForm.physicalTheme || matchedWeekPlanForForm.oppositionContent || matchedWeekPlanForForm.trainingGoals) && (
                        <div className="text-[10px] text-emerald-800 font-bold space-y-1 border-t border-emerald-200/50 pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {matchedWeekPlanForForm.physicalTheme && <div className="truncate"><span className="text-gray-450 font-medium">💪 体能：</span>{matchedWeekPlanForForm.physicalTheme}</div>}
                          {matchedWeekPlanForForm.oppositionContent && <div className="truncate"><span className="text-gray-450 font-medium">⚔️ 对抗：</span>{matchedWeekPlanForForm.oppositionContent}</div>}
                          {matchedWeekPlanForForm.trainingGoals && <div className="line-clamp-1" title={matchedWeekPlanForForm.trainingGoals}><span className="text-gray-450 font-medium">🎯 目标：</span>{matchedWeekPlanForForm.trainingGoals}</div>}
                        </div>
                      )}
                    </div>
                  ) : (
                    (() => {
                      const weekInfo = getWeekInMonthOfDate(formData.date);
                      const teamName = teams.find(t => t.id === formData.teamId)?.name || '该球队';
                      return (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3 shadow-xs animate-in slide-in-from-top-2 duration-200 text-sm">
                          <div className="flex items-start gap-2.5">
                            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <h4 className="font-extrabold text-red-800 text-xs uppercase tracking-wider">⚠️ 周期计划未匹配，禁止新建</h4>
                              <p className="text-[11px] text-red-655 font-bold mt-1.5 leading-relaxed">
                                {teamName} 在 <strong>{weekInfo ? `${weekInfo.year}年${weekInfo.month}月 第${weekInfo.weekInMonth}周` : ''}</strong> 尚未建立任何周期性计划。
                              </p>
                              <p className="text-[10px] text-red-500 mt-1">
                                根据俱乐部统筹规则，您必须先为该梯队在对应周期内通过其“周期训练计划”设置核心主题与重点，随后方可新建此日期课次。
                              </p>
                            </div>
                          </div>
                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setStatsTeamFilter(formData.teamId);
                                setViewType('periodization');
                                setShowAddModal(false);
                              }}
                              className="text-[10.5px] font-black bg-red-100 hover:bg-red-200 text-red-800 py-1.5 px-3 rounded-lg transition-colors border border-red-250 flex items-center gap-1 shadow-sm uppercase shrink-0"
                            >
                              <TableProperties className="w-3.5 h-3.5" /> 立即前往配置周期计划
                            </button>
                          </div>
                        </div>
                      );
                    })()
                  )}

                  {/* 仅当已匹配周期计划时，允许填写其后的业务内容 */}
                  {matchedWeekPlanForForm && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex justify-between items-center">
                        <div className="flex items-center"><Zap className="w-4 h-4 text-bvb-black mr-2" /><span className="text-sm font-bold text-gray-800">启用 AI 辅助生成</span></div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={isAiMode} onChange={(e) => { setIsAiMode(e.target.checked); if(e.target.checked) setFormData(p => ({...p, linkedDesignId: undefined})) }}/>
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bvb-yellow"></div>
                        </label>
                      </div>

                      {!isAiMode && (
                        <button type="button" onClick={() => setShowDesignSelectModal(true)} className="w-full flex items-center justify-center p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 font-bold hover:border-bvb-yellow hover:text-bvb-black transition-colors">
                          <PenTool className="w-4 h-4 mr-2" /> {formData.linkedDesignId ? '已选择教案 (点击重新选择)' : '从教案库导入...'}
                        </button>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-200">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">时长 (分钟)</label>
                          <input type="number" className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none font-bold bg-white text-sm" value={formData.duration} onChange={e => setFormData({...formData, duration: parseInt(e.target.value) || 0})} required />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">强度</label>
                          <select className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none font-bold bg-white text-sm" value={formData.intensity} onChange={e => setFormData({...formData, intensity: e.target.value})}>
                            <option value="Low">低 (恢复)</option>
                            <option value="Medium">中 (常规)</option>
                            <option value="High">高 (比赛级)</option>
                          </select>
                        </div>

                        {!isAiMode && (
                          <div className="sm:col-span-2 pt-2 border-t border-gray-250/50">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                              <LayoutList className="w-3 h-3 text-bvb-yellow" /> 训练项目 (Drills)
                            </label>
                            <div className="space-y-2 mb-2">
                              {formData.drills.map((drill, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100 text-sm shadow-sm">
                                  <span className="font-bold text-gray-700">{drill}</span>
                                  <button type="button" onClick={() => removeDrill(idx)} className="text-gray-400 hover:text-red-500">
                                    <X className="w-4 h-4"/>
                                  </button>
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <input 
                                className="flex-1 p-2 border rounded-lg text-sm font-bold bg-white focus:ring-2 focus:ring-bvb-yellow outline-none" 
                                placeholder="添加项目..." 
                                value={drillInput} 
                                onChange={e => setDrillInput(e.target.value)} 
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addDrill())} 
                              />
                              <button type="button" onClick={addDrill} className="px-3 bg-bvb-black text-bvb-yellow rounded-lg hover:brightness-110 transition-all">
                                <Plus className="w-4 h-4"/>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 重点关注球员选择器 */}
                      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5 text-bvb-yellow fill-current" /> 重点关注球员 (最多2名)
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {players.filter(p => p.teamId === formData.teamId).map(p => {
                            const isSelected = formData.focusedPlayerIds.includes(p.id);
                            const stats = calculateFocusStats(p.id, userManagedSessions);
                            const isUnfocusedThisMonth = !focusedPlayerIdsThisMonth.has(p.id);
                            return (
                              <button 
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => {
                                    if (prev.focusedPlayerIds.includes(p.id)) return { ...prev, focusedPlayerIds: prev.focusedPlayerIds.filter(id => id !== p.id) };
                                    if (prev.focusedPlayerIds.length >= 2) {
                                      alert('每课次最多选择2名重点关注球员');
                                      return prev;
                                    }
                                    return { ...prev, focusedPlayerIds: [...prev.focusedPlayerIds, p.id] };
                                  });
                                }}
                                className={`flex items-center gap-2 p-2 rounded-xl border-2 transition-all text-left relative ${isSelected ? 'bg-white border-bvb-black shadow-md ring-2 ring-bvb-yellow/20' : 'bg-white border-transparent grayscale opacity-60 hover:grayscale-0 hover:opacity-100 hover:border-gray-200'}`}
                              >
                                {isUnfocusedThisMonth && !isSelected && (
                                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white shadow-sm z-10" title="本月尚未关注" />
                                )}
                                <img src={p.image} className="w-8 h-8 rounded-full object-cover border border-gray-100" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1">
                                    <div className="text-[11px] font-black text-gray-805 truncate">{p.name}</div>
                                    {isUnfocusedThisMonth && <span className="text-[7px] font-black text-red-500 bg-red-50 px-1 rounded-sm shrink-0">待关注</span>}
                                  </div>
                                  <div className="flex gap-1 text-[8px] font-bold text-gray-400 mt-0.5">
                                    <span title="本月被关注次数">M:{stats.month}</span>
                                    <span title="本季被关注次数">Q:{stats.quarter}</span>
                                    <span title="本年被关注次数">Y:{stats.year}</span>
                                  </div>
                                </div>
                                {isSelected && <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* 提交按钮控制 */}
                  <button 
                    type="submit" 
                    disabled={loading || !matchedWeekPlanForForm} 
                    className={`w-full py-4 font-bold rounded-xl flex items-center justify-center shadow-lg transition-all text-sm ${
                      matchedWeekPlanForForm 
                        ? 'bg-bvb-black hover:bg-gray-800 text-white cursor-pointer active:scale-98' 
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300'
                    }`}
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {isAiMode ? 'AI 正在生成教案...' : '保存中...'}</>
                    ) : !matchedWeekPlanForForm ? (
                      '❌ 无法新建 (请先创建相应周期计划)'
                    ) : isAiMode ? (
                      '智能生成并保存计划'
                    ) : (
                      '创建课次计划'
                    )}
                  </button>

                </form>
              </div>
            </div>
        )}
        <ThemeSelectorModal
            isOpen={isAddThemeSelectorOpen}
            onClose={() => setIsAddThemeSelectorOpen(false)}
            onSelect={(focus, title) => {
                setFormData(prev => ({
                    ...prev,
                    focus,
                    title
                }));
            }}
            basicTechThemes={basicTechThemes}
            scenarioThemes={scenarioThemes}
        />
        {sessionToDuplicate && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"><div className="bg-white rounded-xl shadow-2xl w-full max-sm overflow-hidden animate-in fade-in zoom-in duration-200"><div className="bg-bvb-black p-4 flex justify-between items-center text-white"><h3 className="font-bold flex items-center"><Copy className="w-4 h-4 mr-2 text-bvb-yellow" /> 复制训练计划</h3><button onClick={() => setSessionToDuplicate(null)}><X className="w-5 h-5" /></button></div><div className="p-6 space-y-4"><div className="bg-gray-50 p-3 rounded border border-gray-100"><span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">正在复制</span><div className="font-bold text-gray-800">{sessionToDuplicate.title}</div></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center"><CalendarDays className="w-3 h-3 mr-1 text-bvb-yellow" /> 选择新计划的日期</label><input type="date" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none font-bold text-gray-700 bg-gray-50 focus:bg-white transition-colors" value={duplicateDate} onChange={e => setDuplicateDate(e.target.value)}/></div><div className="pt-2 flex gap-3"><button onClick={() => setSessionToDuplicate(null)} className="flex-1 py-2 bg-gray-100 text-gray-600 font-bold rounded hover:bg-gray-200 transition-colors">取消</button><button onClick={handleDuplicateConfirm} className="flex-1 py-2 bg-bvb-yellow text-bvb-black font-bold rounded hover:brightness-105 transition-colors shadow-sm">确认复制</button></div></div></div></div>
        )}
        {showDesignSelectModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"><div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]"><div className="bg-bvb-black p-4 flex justify-between items-center text-white shrink-0"><h3 className="font-bold flex items-center"><PenTool className="w-5 h-5 mr-2 text-bvb-yellow" /> 选择教案</h3><button onClick={() => setShowDesignSelectModal(false)}><X className="w-5 h-5" /></button></div><div className="p-4 flex-1 overflow-y-auto space-y-3">{designs.length > 0 ? designs.map(d => (<button key={d.id} onClick={() => handleImportDesign(d)} className="w-full text-left p-3 border rounded-lg hover:bg-yellow-50 hover:border-bvb-yellow transition-colors group"><div className="flex justify-between items-center"><span className="font-bold text-gray-800">{d.title}</span><span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">{d.category}</span></div><p className="text-xs text-gray-400 mt-1 line-clamp-1">{d.description}</p></button>)) : (<div className="text-center py-8 text-gray-400">暂无教案，请先在“教案设计”中创建。</div>)}</div></div></div>
        )}
        {selectedSession && (
            <SessionDetailModal session={selectedSession} teams={teams} players={players} trainingFoci={trainingFoci} focusSubjects={focusSubjects} basicTechThemes={basicTechThemes} scenarioThemes={scenarioThemes} currentUser={currentUser} onUpdate={(s: TrainingSession, att: AttendanceRecord[]) => { onUpdateTraining(s, att); setSelectedSession(s); }} onDuplicate={(s: TrainingSession) => { setSessionToDuplicate(s); setDuplicateDate(new Date().toISOString().split('T')[0]); }} onDelete={(id: string) => { onDeleteTraining(id); setSelectedSession(null); }} onClose={() => setSelectedSession(null)} />
        )}
    </div>
  );
};

export default TrainingPlanner;
