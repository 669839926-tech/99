
import React, { useState, useMemo, useEffect } from 'react';
import { TrainingSession, Team, Player, AttendanceRecord, AttendanceStatus, User, DrillDesign, PeriodizationPlan, WeeklyPlan } from '../types';
import { Calendar as CalendarIcon, Clock, Zap, Cpu, Loader2, CheckCircle, Plus, ChevronLeft, ChevronRight, UserCheck, X, AlertCircle, Ban, BarChart3, PieChart as PieChartIcon, List, FileText, Send, User as UserIcon, ShieldCheck, RefreshCw, Target, Copy, Download, Trash2, PenTool, CalendarDays, Filter, ChevronDown, Users, UserMinus, Settings2, LayoutList, Calendar, Quote, Bell, TableProperties, Edit2, Save, ClipboardCopy, ClipboardPaste, Shield, Star, Brain, History, MessageSquare, TrendingUp, Search } from 'lucide-react';
import { generateTrainingPlan } from '../services/geminiService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { exportToPDF } from '../services/pdfService';

interface TrainingPlannerProps {
  trainings: TrainingSession[];
  teams: Team[];
  players: Player[];
  drillLibrary: string[];
  trainingFoci?: string[];
  designs?: DrillDesign[];
  currentUser: User | null;
  onAddTraining: (session: TrainingSession) => void;
  onUpdateTraining: (session: TrainingSession, attendance: AttendanceRecord[]) => void;
  onDeleteTraining: (id: string) => void;
  initialFilter?: string;
  appLogo?: string;
  periodizationPlans?: PeriodizationPlan[];
  onUpdatePeriodization?: (plan: PeriodizationPlan) => void;
}

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

interface WeeklyPlanEditorProps {
    week: WeeklyPlan;
    onSave: (week: WeeklyPlan) => void;
    onClose: () => void;
    clipboard?: WeeklyPlan | null;
    onCopy?: (week: WeeklyPlan) => void;
}

const WeeklyPlanEditor: React.FC<WeeklyPlanEditorProps> = ({ week, onSave, onClose, clipboard, onCopy }) => {
    const [localWeek, setLocalWeek] = useState<WeeklyPlan>({ ...week });

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
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">体能主题</label>
                        <input className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none font-bold" value={localWeek.physicalTheme} onChange={e => setLocalWeek({...localWeek, physicalTheme: e.target.value})} placeholder="如：速度、敏捷" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">训练主题</label>
                        <input className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none font-bold" value={localWeek.trainingTheme} onChange={e => setLocalWeek({...localWeek, trainingTheme: e.target.value})} placeholder="如：运控球" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">训练内容</label>
                        <textarea rows={2} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none text-sm font-bold" value={localWeek.trainingContent} onChange={e => setLocalWeek({...localWeek, trainingContent: e.target.value})} placeholder="核心训练细节..." />
                    </div>
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

const SessionDetailModal: React.FC<any> = ({ session, teams, players, drillLibrary, trainingFoci, currentUser, onUpdate, onDuplicate, onDelete, onClose, allSessions }) => {
    const [activeTab, setActiveTab] = useState<'info' | 'attendance' | 'log'>('attendance');
    const teamPlayers = useMemo(() => players.filter(p => p.teamId === session.teamId), [players, session.teamId]);
    const team = useMemo(() => teams.find(t => t.id === session.teamId), [teams, session.teamId]);

    const [localSession, setLocalSession] = useState<TrainingSession>(JSON.parse(JSON.stringify(session)));
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [drillInput, setDrillInput] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setSaveStatus('saving');
            onUpdate(localSession, localSession.attendance);
            setTimeout(() => setSaveStatus('saved'), 800);
        }, 1500);
        return () => clearTimeout(timer);
    }, [localSession]);

    useEffect(() => {
        if (activeTab === 'log' && currentUser?.role === 'coach' && localSession.submissionStatus === 'Reviewed' && !localSession.isReviewRead) {
            setLocalSession(prev => ({ ...prev, isReviewRead: true }));
        }
    }, [activeTab]);

    const isDirector = currentUser?.role === 'director';
    const isCoach = currentUser?.role === 'coach';
    const canEdit = (isCoach && currentUser?.teamIds?.includes(session.teamId)) || isDirector;
    
    const getStatus = (playerId: string): AttendanceStatus => {
        const record = localSession.attendance?.find(r => r.playerId === playerId);
        return record ? record.status : 'Absent';
    };

    const setPlayerStatus = (playerId: string, status: AttendanceStatus) => {
        setLocalSession(prev => {
            const currentAttendance = prev.attendance || [];
            const others = currentAttendance.filter(r => r.playerId !== playerId);
            const nextAttendance = status === 'Absent' ? others : [...others, { playerId, status }];
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
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 pb-24 md:pb-6">
                    {activeTab === 'info' && (
                        <div className="animate-in fade-in duration-200 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">训练主题</label>
                                    <input 
                                        disabled={!canEdit}
                                        className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none font-bold text-gray-800 bg-gray-50 focus:bg-white transition-all"
                                        value={localSession.title}
                                        onChange={e => setLocalSession({...localSession, title: e.target.value})}
                                    />
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
                                
                                {/* 重点关注球员显示 (仅查看) */}
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
                          <div>
                              <div className="flex justify-between items-center mb-4">
                                  <h4 className="font-bold text-gray-800 flex items-center"><UserCheck className="w-4 h-4 mr-2 text-bvb-yellow" /> 考勤列表</h4>
                                  <div className="text-xs"><span className="font-bold">{localSession.attendance?.filter(r => r.status === 'Present').length || 0}</span> / {teamPlayers.length} 实到<button onClick={markAllPresent} className="ml-3 text-bvb-black underline hover:text-bvb-yellow">全勤</button></div>
                              </div>
                              <div className="space-y-3">
                                  {teamPlayers.map(player => {
                                      const status = getStatus(player.id);
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
                                                  <div className="text-[10px] font-bold">{status === 'Present' && <span className="text-green-600">正常参训</span>}{status === 'Leave' && <span className="text-yellow-600">请假</span>}{status === 'Injury' && <span className="text-red-600">伤停</span>}{(status === 'Absent' || !status) && <span className="text-gray-400">未出席</span>}</div>
                                              </div>
                                              <div className="flex bg-gray-50/50 p-1 rounded-lg gap-1">
                                                  <button onClick={() => setPlayerStatus(player.id, 'Present')} className={`flex-1 py-2 rounded-md transition-all flex items-center justify-center ${status === 'Present' ? 'bg-white shadow-sm text-green-600 ring-1 ring-green-100' : 'text-gray-400 hover:text-green-600 hover:bg-gray-200'}`}><CheckCircle className="w-5 h-5" /></button>
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
                        <div className="animate-in fade-in duration-200 space-y-8">
                            {/* 重点关注球员评价区 (NEW) */}
                            {(localSession.focusedPlayerIds && localSession.focusedPlayerIds.length > 0) && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <Star className="w-5 h-5 text-bvb-yellow fill-current" />
                                        <h4 className="font-black text-base text-gray-800 uppercase italic tracking-tighter">重点球员成长反馈</h4>
                                    </div>
                                    <div className="grid grid-cols-1 gap-6">
                                        {localSession.focusedPlayerIds.map(pid => {
                                            const p = players.find(p => p.id === pid);
                                            if (!p) return null;
                                            const note = localSession.focusedPlayerNotes?.[pid] || { technical: '', mental: '' };
                                            return (
                                                <div key={pid} className="bg-yellow-50/30 border border-yellow-200 rounded-2xl p-5 shadow-sm space-y-4">
                                                    <div className="flex items-center gap-3 border-b border-yellow-100 pb-3">
                                                        <img src={p.image} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                                                        <div>
                                                            <div className="font-black text-gray-800 text-sm">{p.name}</div>
                                                            <div className="text-[10px] text-gray-500 font-bold uppercase">Target Feedback Session</div>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="space-y-1.5">
                                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                                                <Target className="w-3 h-3 text-bvb-yellow" /> 技术表现反馈
                                                            </label>
                                                            <textarea 
                                                                disabled={!canEdit}
                                                                className="w-full h-24 p-3 bg-white border border-yellow-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-bvb-yellow outline-none transition-all placeholder-gray-300"
                                                                placeholder="点评该球员本课的技术执行、基本功及战术理解..."
                                                                value={note.technical}
                                                                onChange={e => updateFocusNote(pid, 'technical', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                                                <Brain className="w-3 h-3 text-indigo-400" /> 心理/态度反馈
                                                            </label>
                                                            <textarea 
                                                                disabled={!canEdit}
                                                                className="w-full h-24 p-3 bg-white border border-yellow-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-bvb-yellow outline-none transition-all placeholder-gray-300"
                                                                placeholder="评价球员本课的训练态度、专注度及自信心..."
                                                                value={note.mental}
                                                                onChange={e => updateFocusNote(pid, 'mental', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3 pt-6 border-t border-gray-100">
                                <div className="flex justify-between items-center"><h4 className="font-bold text-gray-800 flex items-center"><UserIcon className="w-4 h-4 mr-2 text-bvb-yellow" /> 整体训练总结 (Team Summary)</h4><span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${localSession.submissionStatus === 'Planned' ? 'bg-gray-100 text-gray-500' : localSession.submissionStatus === 'Submitted' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{localSession.submissionStatus === 'Planned' ? '未提交' : localSession.submissionStatus === 'Submitted' ? '待审核' : '已审核'}</span></div>
                                <div className="relative">
                                    <textarea disabled={!canEdit || localSession.submissionStatus === 'Reviewed'} className="w-full h-40 p-3 border rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none text-sm resize-none bg-gray-50 focus:bg-white transition-colors disabled:opacity-70 disabled:bg-gray-100" placeholder="请描述球队整体训练状态，以及教案实际执行效果..." value={localSession.coachFeedback || ''} onChange={e => setLocalSession({...localSession, coachFeedback: e.target.value})} />
                                    {canEdit && localSession.submissionStatus !== 'Reviewed' && (
                                        <div className="absolute bottom-2 right-2"><button onClick={() => setLocalSession({...localSession, submissionStatus: 'Submitted', isReviewRead: false})} disabled={!(localSession.coachFeedback || '').trim()} className="bg-bvb-black text-white text-xs font-bold px-3 py-1.5 rounded-md hover:bg-gray-800 flex items-center disabled:opacity-50"><Send className="w-3 h-3 mr-1" /> 提交</button></div>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-3 pt-4 border-t border-gray-100">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-bold text-gray-800 flex items-center"><ShieldCheck className="w-4 h-4 mr-2 text-bvb-yellow" /> 总监审核 (Director)</h4>
                                    {localSession.submissionStatus === 'Reviewed' && <span className="text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-full font-black flex items-center gap-1 shadow-sm"><CheckCircle className="w-2.5 h-2.5"/> 已阅准</span>}
                                </div>
                                {isDirector ? (
                                    <div className="relative">
                                        <textarea className="w-full h-32 p-3 border rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none text-sm resize-none bg-gray-50 focus:bg-white transition-colors" placeholder="请对本次训练及教练反馈进行点评..." value={localSession.directorReview || ''} onChange={e => setLocalSession({...localSession, directorReview: e.target.value})} />
                                        <div className="absolute bottom-2 right-2"><button onClick={() => setLocalSession({...localSession, submissionStatus: 'Reviewed', isReviewRead: false})} disabled={!(localSession.directorReview || '').trim() || localSession.submissionStatus === 'Reviewed'} className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-md hover:bg-green-700 flex items-center disabled:opacity-50 disabled:bg-gray-400"><CheckCircle className="w-3 h-3 mr-1" /> {localSession.submissionStatus === 'Reviewed' ? '已审核' : '确认审核'}</button></div>
                                    </div>
                                ) : (
                                    <div className={`p-4 md:p-6 rounded-2xl border-2 transition-all ${localSession.directorReview ? 'bg-yellow-50/50 border-bvb-yellow/30 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
                                        {localSession.directorReview ? (
                                            <div className="relative">
                                                <Quote className="absolute -top-2 -left-2 w-8 h-8 text-bvb-yellow/20" />
                                                <div className="text-sm text-gray-700 leading-relaxed font-bold italic relative z-10">
                                                    {localSession.directorReview}
                                                </div>
                                                <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest border-t border-bvb-yellow/10 pt-2">
                                                    <ShieldCheck className="w-3 h-3 text-bvb-yellow" /> 
                                                    WSZG DIRECTOR VERIFIED
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-sm text-gray-400 italic text-center py-4 flex flex-col items-center gap-2">
                                                <RefreshCw className="w-6 h-6 opacity-20" />
                                                等待总监审阅反馈...
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
            </div>
        </div>
    );
};

const TrainingPlanner: React.FC<TrainingPlannerProps> = ({ 
    trainings, teams, players, drillLibrary, trainingFoci = [], designs = [], currentUser, onAddTraining, onUpdateTraining, onDeleteTraining, initialFilter, appLogo, periodizationPlans = [], onUpdatePeriodization 
}) => {
  const isDirector = currentUser?.role === 'director';
  const isCoach = currentUser?.role === 'coach';

  const [currentDate, setCurrentDate] = useState(new Date());
  const [timeScope, setTimeScope] = useState<TimeScope>('month');
  const [viewType, setViewType] = useState<ViewType>('calendar');
  const [selectedDate, setSelectedDate] = useState<string | null>(new Date().toISOString().split('T')[0]);
  const [showAddModal, setShowAddModal] = useState(false);
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
  }, [trainings]); 

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
  }, [availableTeams]);

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

  // 球员关注追踪视图逻辑
  const focusedPlayersSummary = useMemo(() => {
    const focusMap: Record<string, { player: Player; stats: any; history: any[] }> = {};
    const relevantTrainings = userManagedSessions.filter(s => statsTeamFilter === 'all' || s.teamId === statsTeamFilter);
    
    relevantTrainings.forEach(s => {
        if (s.focusedPlayerIds) {
            s.focusedPlayerIds.forEach(pid => {
                if (!focusMap[pid]) {
                    const p = players.find(p => p.id === pid);
                    if (p) {
                        focusMap[pid] = { 
                            player: p, 
                            stats: calculateFocusStats(pid, userManagedSessions),
                            history: []
                        };
                    }
                }
                if (focusMap[pid]) {
                    focusMap[pid].history.push({
                        id: s.id,
                        date: s.date,
                        title: s.title,
                        notes: s.focusedPlayerNotes?.[pid] || { technical: '', mental: '' }
                    });
                }
            });
        }
    });

    return Object.values(focusMap)
        .filter(entry => entry.player.name.includes(focusSearchTerm))
        .sort((a, b) => b.stats.year - a.stats.year);
  }, [userManagedSessions, players, focusSearchTerm, statsTeamFilter]);

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
          days.push(<div key={`empty-${i}`} className={`${isCompact ? 'h-8' : 'h-16 md:h-32'} bg-gray-50/50 border-r border-b border-gray-200`}></div>);
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
                  <div key={d} onClick={() => setSelectedDate(dateStr)} onDoubleClick={() => { setSelectedDate(dateStr); setFormData(prev => ({ ...prev, date: dateStr })); setShowAddModal(true); }} className={`h-8 border-r border-b border-gray-200 relative cursor-pointer hover:bg-yellow-50 transition-colors flex items-center justify-center ${isSelected ? 'bg-yellow-100' : 'bg-white'}`}>{sessionsOnDay.length > 0 ? (<div className={`w-3 h-3 rounded-full relative ${sessionsOnDay[0].intensity === 'High' ? 'bg-red-500' : sessionsOnDay[0].intensity === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'} ${hasPending ? 'ring-2 ring-blue-400' : ''}`} title={`${sessionsOnDay.length} 节训练`}>{hasUnreadReview && <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-blue-500 rounded-full"></span>}</div>) : (<span className={`text-[10px] ${isToday ? 'font-black text-bvb-black' : 'text-gray-300'}`}>{d}</span>)}</div>
              );
          } else {
              days.push(
                  <div key={d} onClick={() => setSelectedDate(dateStr)} onDoubleClick={() => { setSelectedDate(dateStr); setFormData(prev => ({ ...prev, date: dateStr })); setShowAddModal(true); }} className={`h-16 md:h-32 border-r border-b border-gray-200 p-1 md:p-2 relative cursor-pointer hover:bg-yellow-50 transition-colors ${isSelected ? 'bg-yellow-50 ring-2 ring-inset ring-bvb-yellow' : 'bg-white'}`}><div className="flex justify-between items-start"><div className="flex items-center"><span className={`text-xs md:text-sm font-bold w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-bvb-black text-bvb-yellow' : 'text-gray-700'}`}>{d}</span>{hasPending && <div className="ml-1 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-blue-500 animate-pulse" title="待审核日志"></div>}{hasUnreadReview && <div className="ml-1 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-blue-500 shadow-sm" title="有新审核建议"></div>}</div></div><div className="mt-1 space-y-0.5 md:space-y-1 overflow-y-auto max-h-[calc(100%-18px)] custom-scrollbar">{sessionsOnDay.map(s => { const team = teams.find(t => t.id === s.teamId); return (<div key={s.id} onClick={(e) => { e.stopPropagation(); setSelectedSession(s); }} className={`text-[8px] md:text-[10px] px-1 py-0.5 md:py-1 rounded font-bold truncate border-l-2 cursor-pointer hover:brightness-95 flex justify-between items-center ${s.submissionStatus === 'Reviewed' ? (s.isReviewRead ? 'bg-green-50 border-green-500 text-green-700' : 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm') : s.intensity === 'High' ? 'bg-red-50 border-red-500 text-red-700' : s.intensity === 'Medium' ? 'bg-yellow-50 border-yellow-500 text-yellow-800' : s.intensity === 'Low' ? 'bg-green-50 border-green-500 text-green-700' : s.intensity === 'None' ? 'bg-gray-100 border-gray-300 text-gray-500' : 'bg-gray-50 border-gray-300 text-gray-500'}`}><span className="truncate flex-1">{team?.level}</span>{s.submissionStatus === 'Reviewed' && <ShieldCheck className="w-2 md:w-3 h-2 md:h-3 text-bvb-black ml-1 flex-shrink-0" />}</div>); })}</div></div>
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
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-bvb-yellow outline-none shadow-sm"
                        placeholder="搜索球员追踪成长..."
                        value={focusSearchTerm}
                        onChange={e => setFocusSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pb-20 md:pb-4">
                    {focusedPlayersSummary.map(entry => {
                        const isSelected = selectedFocusPlayerId === entry.player.id;
                        return (
                            <div 
                                key={entry.player.id} 
                                onClick={() => setSelectedFocusPlayerId(entry.player.id)}
                                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative group ${isSelected ? 'bg-bvb-black border-bvb-black text-white shadow-xl' : 'bg-white border-gray-100 text-gray-800 hover:border-bvb-yellow/50'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <img src={entry.player.image} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                                        <div className="absolute -bottom-1 -right-1 p-1 bg-bvb-yellow rounded-full border border-white"><Star className="w-2.5 h-2.5 text-bvb-black fill-current" /></div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-black text-sm truncate">{entry.player.name}</h4>
                                        <p className={`text-[10px] font-bold uppercase tracking-widest ${isSelected ? 'text-gray-400' : 'text-gray-400'}`}>#{entry.player.number} • {teams.find(t => t.id === entry.player.teamId)?.level}</p>
                                    </div>
                                    <ChevronRight className={`w-5 h-5 transition-transform ${isSelected ? 'text-bvb-yellow' : 'text-gray-300 group-hover:translate-x-1'}`} />
                                </div>
                                <div className={`grid grid-cols-3 gap-2 mt-4 pt-3 border-t ${isSelected ? 'border-white/10' : 'border-gray-50'}`}>
                                    <div className="text-center">
                                        <p className="text-[8px] font-black uppercase opacity-60">本月关注</p>
                                        <p className="text-sm font-black tabular-nums">{entry.stats.month}</p>
                                    </div>
                                    <div className="text-center border-x border-white/5">
                                        <p className="text-[8px] font-black uppercase opacity-60">本季关注</p>
                                        <p className="text-sm font-black tabular-nums">{entry.stats.quarter}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[8px] font-black uppercase opacity-60">年度总计</p>
                                        <p className={`text-sm font-black tabular-nums ${isSelected ? 'text-bvb-yellow' : 'text-bvb-black'}`}>{entry.stats.year}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {focusedPlayersSummary.length === 0 && (
                        <div className="py-20 text-center text-gray-400 flex flex-col items-center gap-4">
                            <History className="w-12 h-12 opacity-10" />
                            <p className="text-xs font-black uppercase tracking-widest">暂无重点关注球员记录</p>
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
                                                catch(e) { alert('导出失败'); } finally { setIsExporting(false); }
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
                                                            <span className="text-[10px] font-black text-gray-400 uppercase bg-white px-2 py-1 rounded border border-gray-100">Training Record</span>
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
                        <Users className="w-20 h-20 opacity-10 mb-6" />
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
                                const monthWeeks = Array.from({length: 4}, (_, i) => i + 1);
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
                                                <td rowSpan={4} className="border-r font-black text-sm md:text-lg bg-gray-50/80 backdrop-blur-sm sticky left-0 z-20">
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
                                                <td rowSpan={4} className="px-2 md:px-4 py-3 md:py-4 border-r text-[9px] md:text-[11px] text-red-600 font-bold text-left align-top leading-snug md:leading-relaxed whitespace-pre-wrap">
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
                                return (
                                    <tr 
                                        key={s.id} 
                                        onClick={() => setSelectedSession(s)}
                                        className={`hover:bg-yellow-50/50 cursor-pointer transition-colors group ${isUnread ? 'bg-blue-50/30' : ''}`}
                                    >
                                        <td className="px-3 md:px-6 py-4 font-mono text-xs md:text-sm text-gray-500 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                {isUnread && <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-sm"></span>}
                                                {s.date}
                                            </div>
                                        </td>
                                        <td className="px-3 md:px-6 py-4 font-bold text-xs md:text-sm text-gray-700">{team?.level || '-'}</td>
                                        <td className="px-3 md:px-6 py-4">
                                            <div className="flex items-center gap-1.5 md:gap-2">
                                                <span className={`font-bold text-xs md:text-sm group-hover:underline truncate max-w-[100px] md:max-w-none ${isUnread ? 'text-blue-700' : 'text-bvb-black'}`}>{s.title}</span>
                                                {s.linkedDesignId && <PenTool className="w-3 md:w-3.5 h-3 md:h-3.5 text-purple-500 shrink-0" title="关联教案" />}
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
                                                    <span className="flex items-center gap-1 text-[9px] md:text-[10px] font-black text-blue-600 uppercase"><RefreshCw className="w-3 h-3 animate-spin" /> <span className="hidden sm:inline">待审核</span></span>
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
        } catch (e) { 
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
                linkedDesignId: formData.linkedDesignId,
                focusedPlayerIds: formData.focusedPlayerIds,
                focusedPlayerNotes: {}
            };
            onAddTraining(newSession);
            setShowAddModal(false);
            setFormData({ teamId: availableTeams[0]?.id || '', title: '', focus: trainingFoci[0] || '传接球', focusCustom: '', duration: 90, intensity: 'Medium', date: new Date().toISOString().split('T')[0], drills: [], linkedDesignId: undefined, focusedPlayerIds: [] });
            setIsAiMode(false);
        } catch (error) { console.error(error); alert('创建失败'); } finally { setLoading(false); }
  };

  const handleDuplicateConfirm = () => {
      if (!sessionToDuplicate) return;
      const copy: TrainingSession = { ...sessionToDuplicate, id: Date.now().toString(), title: sessionToDuplicate.title, date: duplicateDate, submissionStatus: 'Planned', isReviewRead: true, attendance: [], coachFeedback: '', directorReview: '', focusedPlayerNotes: {} };
      onAddTraining(copy);
      setSessionToDuplicate(null);
      alert('已成功复制训练计划到 ' + duplicateDate);
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
                        <button onClick={() => setViewType('calendar')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] md:text-xs font-black transition-all ${viewType === 'calendar' ? 'bg-white shadow text-bvb-black' : 'text-gray-500'}`}>
                            <CalendarIcon className="w-3 h-3 md:w-3.5 md:h-3.5" /> 日历
                        </button>
                        <button onClick={() => setViewType('list')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] md:text-xs font-black transition-all ${viewType === 'list' ? 'bg-white shadow text-bvb-black' : 'text-gray-500'}`}>
                            <LayoutList className="w-3 h-3 md:w-3.5 md:h-3.5" /> 列表
                        </button>
                        <button onClick={() => setViewType('periodization')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] md:text-xs font-black transition-all ${viewType === 'periodization' ? 'bg-white shadow text-bvb-black' : 'text-gray-500'}`}>
                            <TableProperties className="w-3 h-3 md:w-3.5 md:h-3.5" /> 周期
                        </button>
                        <button onClick={() => setViewType('focus')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] md:text-xs font-black transition-all ${viewType === 'focus' ? 'bg-white shadow text-bvb-black' : 'text-gray-500'}`}>
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
                    <Users className="w-4 h-4 text-gray-400 ml-1" />
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
                    <button onClick={() => setShowAddModal(true)} className="flex items-center justify-center p-2.5 md:px-5 md:py-2.5 bg-bvb-yellow text-bvb-black font-black rounded-xl shadow-lg hover:brightness-105 transition-all">
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
             <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0 mt-6 lg:mt-0">
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
                                return (
                                    <div key={s.id} onClick={() => setSelectedSession(s)} className={`p-4 border rounded-2xl cursor-pointer transition-all group relative ${isUnread ? 'bg-blue-50/50 border-blue-200 shadow-sm' : 'bg-gray-50 border-gray-100 hover:bg-yellow-50 hover:border-bvb-yellow/30 shadow-none'}`}>
                                        {isUnread && <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white animate-pulse"></span>}
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{team?.name}</span>
                                            <div className="flex items-center gap-1.5">
                                                {s.focusedPlayerIds && s.focusedPlayerIds.length > 0 && <Star className="w-3 h-3 text-bvb-yellow fill-current" />}
                                                {s.linkedDesignId && <PenTool className="w-3 h-3 text-purple-500" />}
                                                {s.submissionStatus === 'Submitted' && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>}
                                                {s.submissionStatus === 'Reviewed' && <ShieldCheck className={`w-3 h-3 ${isUnread ? 'text-blue-600' : 'text-green-600'}`} />}
                                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${
                                                    s.intensity === 'High' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'
                                                }`}>{s.intensity}</span>
                                            </div>
                                        </div>
                                        <h5 className={`font-black group-hover:text-bvb-black leading-tight ${isUnread ? 'text-blue-900' : 'text-gray-800'}`}>{s.title}</h5>
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
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex justify-between items-center">
                    <div className="flex items-center"><Zap className="w-4 h-4 text-bvb-black mr-2" /><span className="text-sm font-bold text-gray-800">启用 AI 辅助生成</span></div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={isAiMode} onChange={(e) => { setIsAiMode(e.target.checked); if(e.target.checked) setFormData(p => ({...p, linkedDesignId: undefined})) }}/>
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bvb-yellow"></div>
                    </label>
                  </div>
                  {!isAiMode && (<button type="button" onClick={() => setShowDesignSelectModal(true)} className="w-full flex items-center justify-center p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 font-bold hover:border-bvb-yellow hover:text-bvb-black transition-colors"><PenTool className="w-4 h-4 mr-2" /> {formData.linkedDesignId ? '已选择教案 (点击重新选择)' : '从教案库导入...'}</button>)}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">所属梯队</label><select className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none font-bold bg-white" value={formData.teamId} onChange={e => setFormData({...formData, teamId: e.target.value})}>{availableTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">训练主题</label><input className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none font-bold" placeholder="例如: 快速反击演练" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required={!isAiMode} /></div>
                  </div>

                  {/* 重点关注球员选择器 (NEW) */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5 text-bvb-yellow fill-current" /> 重点关注球员 (最多2名)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                          {players.filter(p => p.teamId === formData.teamId).map(p => {
                              const isSelected = formData.focusedPlayerIds.includes(p.id);
                              const stats = calculateFocusStats(p.id, userManagedSessions);
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
                                      className={`flex items-center gap-2 p-2 rounded-xl border-2 transition-all text-left ${isSelected ? 'bg-white border-bvb-black shadow-md ring-2 ring-bvb-yellow/20' : 'bg-white border-transparent grayscale opacity-60 hover:grayscale-0 hover:opacity-100 hover:border-gray-200'}`}
                                  >
                                      <img src={p.image} className="w-8 h-8 rounded-full object-cover border border-gray-100" />
                                      <div className="flex-1 min-w-0">
                                          <div className="text-[11px] font-black text-gray-800 truncate">{p.name}</div>
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

                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">日期</label><input type="date" className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none font-bold bg-white" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required /></div>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">时长 (分钟)</label><input type="number" className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none font-bold bg-white" value={formData.duration} onChange={e => setFormData({...formData, duration: parseInt(e.target.value)})} required /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">训练重点</label><select className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none font-bold bg-white" value={formData.focus} onChange={e => setFormData({...formData, focus: e.target.value})}>
                      {trainingFoci.map(f => <option key={f} value={f}>{f}</option>)}
                      <option value="Custom">自定义...</option>
                    </select>{formData.focus === 'Custom' && (<input className="w-full p-2 border rounded mt-2 text-xs font-bold" placeholder="输入重点..." value={formData.focusCustom} onChange={e => setFormData({...formData, focusCustom: e.target.value})} />)}</div>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">强度</label><select className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none font-bold bg-white" value={formData.intensity} onChange={e => setFormData({...formData, intensity: e.target.value})}><option value="Low">低 (恢复)</option><option value="Medium">中 (常规)</option><option value="High">高 (比赛级)</option></select></div>
                  </div>
                  {!isAiMode && (<div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">训练项目</label><div className="space-y-2 mb-2">{formData.drills.map((drill, idx) => (<div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm"><span>{drill}</span><button type="button" onClick={() => removeDrill(idx)} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4"/></button></div>))}</div><div className="flex gap-2"><input className="flex-1 p-2 border rounded text-sm font-bold bg-white" placeholder="添加项目..." value={drillInput} onChange={e => setDrillInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addDrill())} /><button type="button" onClick={addDrill} className="px-3 bg-gray-200 rounded hover:bg-gray-300"><Plus className="w-4 h-4"/></button></div></div>)}
                  <button type="submit" disabled={loading} className="w-full py-4 bg-bvb-black text-white font-bold rounded-xl hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center shadow-lg transition-all">{loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {isAiMode ? 'AI 正在生成教案...' : '保存中...'}</> : (isAiMode ? '生成并保存' : '创建计划')}</button>
                </form>
              </div>
            </div>
        )}
        {sessionToDuplicate && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"><div className="bg-white rounded-xl shadow-2xl w-full max-sm overflow-hidden animate-in fade-in zoom-in duration-200"><div className="bg-bvb-black p-4 flex justify-between items-center text-white"><h3 className="font-bold flex items-center"><Copy className="w-4 h-4 mr-2 text-bvb-yellow" /> 复制训练计划</h3><button onClick={() => setSessionToDuplicate(null)}><X className="w-5 h-5" /></button></div><div className="p-6 space-y-4"><div className="bg-gray-50 p-3 rounded border border-gray-100"><span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">正在复制</span><div className="font-bold text-gray-800">{sessionToDuplicate.title}</div></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center"><CalendarDays className="w-3 h-3 mr-1 text-bvb-yellow" /> 选择新计划的日期</label><input type="date" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none font-bold text-gray-700 bg-gray-50 focus:bg-white transition-colors" value={duplicateDate} onChange={e => setDuplicateDate(e.target.value)}/></div><div className="pt-2 flex gap-3"><button onClick={() => setSessionToDuplicate(null)} className="flex-1 py-2 bg-gray-100 text-gray-600 font-bold rounded hover:bg-gray-200 transition-colors">取消</button><button onClick={handleDuplicateConfirm} className="flex-1 py-2 bg-bvb-yellow text-bvb-black font-bold rounded hover:brightness-105 transition-colors shadow-sm">确认复制</button></div></div></div></div>
        )}
        {showDesignSelectModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"><div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]"><div className="bg-bvb-black p-4 flex justify-between items-center text-white shrink-0"><h3 className="font-bold flex items-center"><PenTool className="w-5 h-5 mr-2 text-bvb-yellow" /> 选择教案</h3><button onClick={() => setShowDesignSelectModal(false)}><X className="w-5 h-5" /></button></div><div className="p-4 flex-1 overflow-y-auto space-y-3">{designs.length > 0 ? designs.map(d => (<button key={d.id} onClick={() => handleImportDesign(d)} className="w-full text-left p-3 border rounded-lg hover:bg-yellow-50 hover:border-bvb-yellow transition-colors group"><div className="flex justify-between items-center"><span className="font-bold text-gray-800">{d.title}</span><span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">{d.category}</span></div><p className="text-xs text-gray-400 mt-1 line-clamp-1">{d.description}</p></button>)) : (<div className="text-center py-8 text-gray-400">暂无教案，请先在“教案设计”中创建。</div>)}</div></div></div>
        )}
        {selectedSession && (
            <SessionDetailModal session={selectedSession} teams={teams} players={players} drillLibrary={drillLibrary} trainingFoci={trainingFoci} currentUser={currentUser} onUpdate={(s: TrainingSession, att: AttendanceRecord[]) => { onUpdateTraining(s, att); setSelectedSession(s); }} onDuplicate={(s: TrainingSession) => { setSessionToDuplicate(s); setDuplicateDate(new Date().toISOString().split('T')[0]); }} onDelete={(id: string) => { onDeleteTraining(id); setSelectedSession(null); }} onClose={() => setSelectedSession(null)} allSessions={userManagedSessions} />
        )}
    </div>
  );
};

export default TrainingPlanner;
