
import React, { useState, useMemo, useEffect } from 'react';
import { TrainingSession, Team, Player, AttendanceRecord, AttendanceStatus, User, DrillDesign } from '../types';
import { Calendar as CalendarIcon, Clock, Zap, Cpu, Loader2, CheckCircle, Plus, ChevronLeft, ChevronRight, UserCheck, X, AlertCircle, Ban, BarChart3, PieChart as PieChartIcon, List, FileText, Send, User as UserIcon, ShieldCheck, RefreshCw, Target, Copy, Download, Trash2, PenTool, CalendarDays, Filter, ChevronDown, Users, UserMinus, Settings2 } from 'lucide-react';
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
}

type TimeScope = 'month' | 'quarter' | 'year';

interface SessionDetailModalProps {
    session: TrainingSession;
    teams: Team[];
    players: Player[];
    drillLibrary: string[];
    trainingFoci: string[];
    currentUser: User | null;
    onUpdate: (session: TrainingSession, attendance: AttendanceRecord[]) => void;
    onDuplicate: (session: TrainingSession) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
}

const SessionDetailModal: React.FC<SessionDetailModalProps> = ({ session, teams, players, drillLibrary, trainingFoci, currentUser, onUpdate, onDuplicate, onDelete, onClose }) => {
    const [activeTab, setActiveTab] = useState<'info' | 'attendance' | 'log'>('attendance');
    const teamPlayers = useMemo(() => players.filter(p => p.teamId === session.teamId), [players, session.teamId]);
    const team = useMemo(() => teams.find(t => t.id === session.teamId), [teams, session.teamId]);

    // Local state for all editable fields
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
                    <button onClick={() => setActiveTab('log')} className={`flex-1 min-w-[100px] py-3 text-sm font-bold flex items-center justify-center border-b-2 transition-colors ${activeTab === 'log' ? 'border-bvb-yellow text-bvb-black bg-gray-50' : 'border-transparent text-gray-500'}`}><FileText className="w-4 h-4 mr-2" /> 训练日志</button>
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
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">重点科目</label>
                                        <select 
                                            disabled={!canEdit}
                                            className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none font-bold text-gray-800 bg-gray-50 focus:bg-white transition-all"
                                            value={localSession.focus}
                                            onChange={e => setLocalSession({...localSession, focus: e.target.value})}
                                        >
                                            {trainingFoci.map(f => <option key={f} value={f}>{f}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">训练强度</label>
                                        <select 
                                            disabled={!canEdit}
                                            className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none font-bold text-gray-800 bg-gray-50 focus:bg-white transition-all"
                                            value={localSession.intensity}
                                            onChange={e => setLocalSession({...localSession, intensity: e.target.value as any})}
                                        >
                                            <option value="Low">低强度</option>
                                            <option value="Medium">中等强度</option>
                                            <option value="High">高强度</option>
                                        </select>
                                    </div>
                                </div>
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
                                      return (
                                          <div key={player.id} className="flex flex-col p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                                              <div className="flex items-center justify-between mb-3">
                                                  <div className="flex items-center">
                                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mr-2 border-2 ${status === 'Present' ? 'bg-green-50 border-green-200 text-green-700' : status === 'Leave' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : status === 'Injury' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>{player.name.charAt(0)}</div>
                                                      <div><div className="font-bold text-gray-800 text-sm">{player.name}</div><div className="text-[10px] text-gray-400">#{player.number}</div></div>
                                                  </div>
                                                  <div className="text-[10px] font-bold">{status === 'Present' && <span className="text-green-600">正常参训</span>}{status === 'Leave' && <span className="text-yellow-600">请假</span>}{status === 'Injury' && <span className="text-red-600">伤停</span>}{(status === 'Absent' || !status) && <span className="text-gray-400">未出席</span>}</div>
                                              </div>
                                              <div className="flex bg-gray-50 p-1 rounded-lg gap-1">
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
                        <div className="animate-in fade-in duration-200 space-y-6">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center"><h4 className="font-bold text-gray-800 flex items-center"><UserIcon className="w-4 h-4 mr-2 text-bvb-yellow" /> 教练日志 (Coach)</h4><span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${localSession.submissionStatus === 'Planned' ? 'bg-gray-100 text-gray-500' : localSession.submissionStatus === 'Submitted' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{localSession.submissionStatus === 'Planned' ? '未提交' : localSession.submissionStatus === 'Submitted' ? '待审核' : '已审核'}</span></div>
                                <div className="relative">
                                    <textarea disabled={!canEdit || localSession.submissionStatus === 'Reviewed'} className="w-full h-40 p-3 border rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none text-sm resize-none bg-gray-50 focus:bg-white transition-colors disabled:opacity-70 disabled:bg-gray-100" placeholder="请描述球队整体训练状态，以及教案实际执行效果..." value={localSession.coachFeedback || ''} onChange={e => setLocalSession({...localSession, coachFeedback: e.target.value})} />
                                    {canEdit && localSession.submissionStatus !== 'Reviewed' && (
                                        <div className="absolute bottom-2 right-2"><button onClick={() => setLocalSession({...localSession, submissionStatus: 'Submitted'})} disabled={!(localSession.coachFeedback || '').trim()} className="bg-bvb-black text-white text-xs font-bold px-3 py-1.5 rounded-md hover:bg-gray-800 flex items-center disabled:opacity-50"><Send className="w-3 h-3 mr-1" /> 提交</button></div>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-3 pt-4 border-t border-gray-100">
                                <h4 className="font-bold text-gray-800 flex items-center"><ShieldCheck className="w-4 h-4 mr-2 text-bvb-yellow" /> 总监审核 (Director)</h4>
                                {isDirector ? (
                                    <div className="relative">
                                        <textarea className="w-full h-32 p-3 border rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none text-sm resize-none bg-gray-50 focus:bg-white transition-colors" placeholder="请对本次训练及教练反馈进行点评..." value={localSession.directorReview || ''} onChange={e => setLocalSession({...localSession, directorReview: e.target.value})} />
                                        <div className="absolute bottom-2 right-2"><button onClick={() => setLocalSession({...localSession, submissionStatus: 'Reviewed'})} disabled={!(localSession.directorReview || '').trim() || localSession.submissionStatus === 'Reviewed'} className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-md hover:bg-green-700 flex items-center disabled:opacity-50 disabled:bg-gray-400"><CheckCircle className="w-3 h-3 mr-1" /> {localSession.submissionStatus === 'Reviewed' ? '已审核' : '确认审核'}</button></div>
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 min-h-[80px] text-sm text-gray-600 italic">{localSession.directorReview || "暂无总监点评..."}</div>
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
    trainings, teams, players, drillLibrary, trainingFoci = [], designs = [], currentUser, onAddTraining, onUpdateTraining, onDeleteTraining, initialFilter, appLogo 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [timeScope, setTimeScope] = useState<TimeScope>('month');
  const [selectedDate, setSelectedDate] = useState<string | null>(new Date().toISOString().split('T')[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDesignSelectModal, setShowDesignSelectModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [sessionToDuplicate, setSessionToDuplicate] = useState<TrainingSession | null>(null);
  const [duplicateDate, setDuplicateDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [statsTeamFilter, setStatsTeamFilter] = useState<string>('all');

  const userManagedSessions = useMemo(() => {
      if (currentUser?.role === 'director') return trainings;
      return trainings.filter(t => currentUser?.teamIds?.includes(t.teamId));
  }, [trainings, currentUser]);

  const availableTeams = useMemo(() => {
      if (currentUser?.role === 'director') return teams;
      return teams.filter(t => currentUser?.teamIds?.includes(t.id));
  }, [currentUser, teams]);

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
      linkedDesignId: undefined as string | undefined
  });

  useEffect(() => {
      if (availableTeams.length > 0 && !availableTeams.find(t => t.id === formData.teamId)) {
          setFormData(prev => ({ ...prev, teamId: availableTeams[0].id }));
      }
  }, [availableTeams]);

  const [drillInput, setDrillInput] = useState('');

  useEffect(() => {
    if (initialFilter === 'pending_logs') {
        const firstPending = userManagedSessions.find(t => t.submissionStatus === 'Submitted');
        if (firstPending) {
            const date = new Date(firstPending.date);
            setCurrentDate(date);
            setSelectedDate(firstPending.date);
            setTimeScope('month');
        }
    }
  }, [initialFilter, userManagedSessions]);

  const { filteredSessions, dateLabel, statsData } = useMemo(() => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      let startDate: Date;
      let endDate: Date;
      let label = '';

      if (timeScope === 'month') {
          startDate = new Date(year, month, 1);
          endDate = new Date(year, month + 1, 0);
          label = `${year}年 ${month + 1}月`;
      } else if (timeScope === 'quarter') {
          const quarterStartMonth = Math.floor(month / 3) * 3;
          startDate = new Date(year, quarterStartMonth, 1);
          endDate = new Date(year, quarterStartMonth + 3, 0);
          label = `${year}年 Q${Math.floor(month / 3) + 1}季度`;
      } else {
          startDate = new Date(year, 0, 1);
          endDate = new Date(year, 11, 31);
          label = `${year}年度`;
      }

      const sessions = userManagedSessions.filter(t => {
          const d = new Date(t.date);
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
          days.push(<div key={`empty-${i}`} className={`${isCompact ? 'h-8' : 'h-24 md:h-32'} bg-gray-50/50 border-r border-b border-gray-200`}></div>);
      }
      for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const isToday = dateStr === new Date().toISOString().split('T')[0];
          const isSelected = dateStr === selectedDate;
          
          const sessionsOnDay = userManagedSessions.filter(t => t.date === dateStr);
          const hasPending = sessionsOnDay.some(s => s.submissionStatus === 'Submitted');

          if (isCompact) {
              days.push(
                  <div key={d} onClick={() => setSelectedDate(dateStr)} onDoubleClick={() => { setSelectedDate(dateStr); setFormData(prev => ({ ...prev, date: dateStr })); setShowAddModal(true); }} className={`h-8 border-r border-b border-gray-200 relative cursor-pointer hover:bg-yellow-50 transition-colors flex items-center justify-center ${isSelected ? 'bg-yellow-100' : 'bg-white'}`}>{sessionsOnDay.length > 0 ? (<div className={`w-3 h-3 rounded-full ${sessionsOnDay[0].intensity === 'High' ? 'bg-red-500' : sessionsOnDay[0].intensity === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'} ${hasPending ? 'ring-2 ring-blue-400' : ''}`} title={`${sessionsOnDay.length} 节训练`}></div>) : (<span className={`text-[10px] ${isToday ? 'font-black text-bvb-black' : 'text-gray-300'}`}>{d}</span>)}</div>
              );
          } else {
              days.push(
                  <div key={d} onClick={() => setSelectedDate(dateStr)} onDoubleClick={() => { setSelectedDate(dateStr); setFormData(prev => ({ ...prev, date: dateStr })); setShowAddModal(true); }} className={`h-24 md:h-32 border-r border-b border-gray-200 p-2 relative cursor-pointer hover:bg-yellow-50 transition-colors ${isSelected ? 'bg-yellow-50 ring-2 ring-inset ring-bvb-yellow' : 'bg-white'}`}><div className="flex justify-between items-start"><div className="flex items-center"><span className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-bvb-black text-bvb-yellow' : 'text-gray-700'}`}>{d}</span>{hasPending && <div className="ml-1 w-2 h-2 rounded-full bg-blue-500 animate-pulse" title="待审核日志"></div>}</div></div><div className="mt-1 space-y-1 overflow-y-auto max-h-[calc(100%-24px)] custom-scrollbar">{sessionsOnDay.map(s => { const team = teams.find(t => t.id === s.teamId); return (<div key={s.id} onClick={(e) => { e.stopPropagation(); setSelectedSession(s); }} className={`text-[10px] px-1.5 py-1 rounded font-bold truncate border-l-2 cursor-pointer hover:brightness-95 flex justify-between items-center ${s.submissionStatus === 'Submitted' ? 'bg-blue-50 border-blue-500 text-blue-700' : s.intensity === 'High' ? 'bg-red-50 border-red-500 text-red-700' : s.intensity === 'Medium' ? 'bg-yellow-50 border-yellow-500 text-yellow-800' : s.intensity === 'Low' ? 'bg-green-50 border-green-500 text-green-700' : s.intensity === 'None' ? 'bg-gray-100 border-gray-300 text-gray-500' : 'bg-gray-50 border-gray-300 text-gray-500'}`}><span className="truncate flex-1">{team?.level} - {s.title}</span>{s.submissionStatus === 'Reviewed' && <ShieldCheck className="w-3 h-3 text-bvb-black ml-1 flex-shrink-0" />}{s.submissionStatus === 'Submitted' && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-1 flex-shrink-0"></div>}</div>); })}</div></div>
              );
          }
      }
      const weekDays = isCompact ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] : ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return (
          <div className={`flex flex-col border-gray-200 overflow-hidden ${isCompact ? 'border rounded-lg' : 'border rounded-lg'}`}>{isCompact && <div className="text-center text-xs font-bold bg-gray-100 py-1 text-gray-600 border-b border-gray-200">{month + 1}月</div>}<div className="grid grid-cols-7 gap-px bg-gray-200">{weekDays.map((day, i) => (<div key={i} className={`bg-gray-100 text-center font-bold text-gray-500 uppercase ${isCompact ? 'text-[8px] py-0.5' : 'text-xs p-2'}`}>{day}</div>))}{days}</div></div>
      );
  };

  const renderCalendar = () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      if (timeScope === 'month') return renderMonthGrid(year, month, false);
      else if (timeScope === 'quarter') {
          const startMonth = Math.floor(month / 3) * 3;
          return (<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-y-auto p-1">{[0, 1, 2].map(offset => renderMonthGrid(year, startMonth + offset, true))}</div>);
      } else return (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 h-full overflow-y-auto p-1">{Array.from({ length: 12 }).map((_, i) => renderMonthGrid(year, i, true))}</div>);
  };

  const renderStats = () => (
    <div className="bg-white p-4 rounded-xl border border-gray-200 h-80 flex flex-col">
        <div className="flex flex-col gap-2 mb-4 shrink-0">
            <h4 className="font-bold text-gray-800 text-xs uppercase flex items-center">
                <PieChartIcon className="w-3.5 h-3.5 mr-1.5 text-bvb-yellow" /> 训练重点分布
            </h4>
            <div className="relative group">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-bvb-black transition-colors">
                    <Filter className="w-3 h-3" />
                </div>
                <select 
                    value={statsTeamFilter} 
                    onChange={e => setStatsTeamFilter(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-black uppercase text-gray-600 outline-none focus:ring-2 focus:ring-bvb-yellow focus:bg-white transition-all cursor-pointer"
                >
                    <option value="all">全部管理梯队</option>
                    {availableTeams.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
            </div>
        </div>
        <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={statsData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
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
            await exportToPDF('training-plan-list-pdf', `训练计划业务详细报表_${dateLabel}`); 
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
            const newSession: TrainingSession = { id: Date.now().toString(), teamId: formData.teamId, title: finalTitle, date: formData.date, focus: formData.focus === 'Custom' ? formData.focusCustom : formData.focus, duration: formData.duration, intensity: formData.intensity as any, drills: finalDrills, aiGenerated: isAiMode, attendance: [], submissionStatus: 'Planned', linkedDesignId: formData.linkedDesignId };
            onAddTraining(newSession);
            setShowAddModal(false);
            setFormData({ teamId: availableTeams[0]?.id || '', title: '', focus: trainingFoci[0] || '传接球', focusCustom: '', duration: 90, intensity: 'Medium', date: new Date().toISOString().split('T')[0], drills: [], linkedDesignId: undefined });
            setIsAiMode(false);
        } catch (error) { console.error(error); alert('创建失败'); } finally { setLoading(false); }
  };

  const handleDuplicateConfirm = () => {
      if (!sessionToDuplicate) return;
      const copy: TrainingSession = { ...sessionToDuplicate, id: Date.now().toString(), title: sessionToDuplicate.title, date: duplicateDate, submissionStatus: 'Planned', attendance: [], coachFeedback: '', directorReview: '' };
      onAddTraining(copy);
      setSessionToDuplicate(null);
      alert('已成功复制训练计划到 ' + duplicateDate);
  };

  const addDrill = () => { if(drillInput.trim()) { setFormData(prev => ({ ...prev, drills: [...prev.drills, drillInput.trim()] })); setDrillInput(''); } };
  const removeDrill = (idx: number) => { setFormData(prev => ({ ...prev, drills: prev.drills.filter((_, i) => i !== idx) })); };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-100px)] md:h-auto pb-20 md:pb-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
            <div><h2 className="text-3xl font-black text-bvb-black uppercase">训练计划</h2><div className="flex items-center gap-2 mt-1"><button onClick={() => setTimeScope('month')} className={`text-xs font-bold px-2 py-1 rounded ${timeScope === 'month' ? 'bg-bvb-black text-bvb-yellow' : 'bg-gray-200 text-gray-600'}`}>月视图</button><button onClick={() => setTimeScope('quarter')} className={`text-xs font-bold px-2 py-1 rounded ${timeScope === 'quarter' ? 'bg-bvb-black text-bvb-yellow' : 'bg-gray-200 text-gray-600'}`}>季视图</button><button onClick={() => setTimeScope('year')} className={`text-xs font-bold px-2 py-1 rounded ${timeScope === 'year' ? 'bg-bvb-black text-bvb-yellow' : 'bg-gray-200 text-gray-600'}`}>年视图</button></div></div>
            <div className="flex items-center gap-3"><div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 shadow-sm"><button onClick={handlePrevPeriod} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft className="w-5 h-5"/></button><span className="px-3 font-bold text-sm min-w-[100px] text-center">{dateLabel}</span><button onClick={handleNextPeriod} className="p-1 hover:bg-gray-100 rounded"><ChevronRight className="w-5 h-5"/></button></div><button onClick={handleExportPDF} disabled={isExporting} className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600" title="导出详细业务报表 (PDF)">{isExporting ? <Loader2 className="w-5 h-5 animate-spin"/> : <Download className="w-5 h-5"/>}</button><button onClick={() => setShowAddModal(true)} className="flex items-center px-4 py-2 bg-bvb-yellow text-bvb-black font-bold rounded-lg shadow-md hover:brightness-105"><Plus className="w-5 h-5 mr-2" /> 新建计划</button></div>
        </div>
        <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
             <div className="flex-1 overflow-y-auto custom-scrollbar bg-white rounded-xl shadow-sm border border-gray-200 p-4 relative"><h3 className="font-bold text-gray-800 mb-4 flex items-center"><CalendarIcon className="w-5 h-5 mr-2 text-bvb-yellow" /> 日程安排</h3>{renderCalendar()}</div>
             <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0">{renderStats()}<div className="bg-white p-4 rounded-xl border border-gray-200 flex-1 overflow-y-auto custom-scrollbar"><h4 className="font-bold text-gray-800 mb-3 text-sm uppercase flex justify-between items-center"><span>{selectedDate} 安排</span>{selectedDate === new Date().toISOString().split('T')[0] && <span className="text-[10px] bg-bvb-yellow px-1.5 rounded text-bvb-black">Today</span>}</h4><div className="space-y-3">
                 {userManagedSessions.filter(t => t.date === selectedDate).length > 0 ? (
                     userManagedSessions.filter(t => t.date === selectedDate).map(s => {
                         const team = teams.find(t => t.id === s.teamId);
                         return (<div key={s.id} onClick={() => setSelectedSession(s)} className="p-3 bg-gray-50 border border-gray-100 rounded-lg cursor-pointer hover:bg-yellow-50 transition-colors group"><div className="flex justify-between items-start mb-1"><span className="text-xs font-bold text-gray-500">{team?.name}</span><div className="flex items-center">{s.linkedDesignId && <PenTool className="w-3 h-3 text-purple-500 mr-1" />}{s.submissionStatus === 'Submitted' && <span className="w-2 h-2 rounded-full bg-blue-500 mr-1"></span>}{s.submissionStatus === 'Reviewed' && <ShieldCheck className="w-3 h-3 text-green-600 mr-1" />}<span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${s.intensity === 'High' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{s.intensity}</span></div></div><h5 className="font-bold text-gray-800 text-sm">{s.title}</h5><div className="flex items-center text-xs text-gray-400 mt-2"><Clock className="w-3 h-3 mr-1" /> {s.duration} min<span className="mx-2">•</span><Target className="w-3 h-3 mr-1" /> {s.focus}</div></div>)
                     })
                 ) : (<div className="text-center py-8 text-gray-400 text-sm"><CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-20" />当日无训练安排</div>)}
             </div></div></div>
        </div>

        {/* --- EXPORT TEMPLATE --- */}
        <div id="training-plan-list-pdf" className="absolute left-[-9999px] top-0 w-[210mm] bg-white text-black p-0 z-[-1000] font-sans">
            <div className="w-full p-[15mm] flex flex-col bg-white">
                <div className="flex justify-between items-end border-b-4 border-bvb-yellow pb-6 mb-10">
                    <div className="flex items-center gap-4">
                        {appLogo && <img src={appLogo} alt="Club Logo" className="w-20 h-20 object-contain" />}
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-tighter text-bvb-black">顽石之光足球俱乐部</h1>
                            <p className="text-sm font-bold text-gray-400 tracking-widest uppercase">训练计划执行明细报表</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-bold text-gray-500 uppercase">Training Journal</div>
                        <div className="text-2xl font-black text-bvb-black">{dateLabel}</div>
                    </div>
                </div>

                <div className="space-y-12">
                    {filteredSessions.length > 0 ? (
                        filteredSessions.map((s, idx) => {
                            const team = teams.find(t => t.id === s.teamId);
                            const sessionAttendance = s.attendance || [];
                            const presentPlayers = players.filter(p => sessionAttendance.find(a => a.playerId === p.id && a.status === 'Present'));
                            const leavePlayers = players.filter(p => sessionAttendance.find(a => a.playerId === p.id && a.status === 'Leave'));
                            const injuryPlayers = players.filter(p => sessionAttendance.find(a => a.playerId === p.id && a.status === 'Injury'));
                            const absentPlayers = players.filter(p => p.teamId === s.teamId && (!sessionAttendance.find(a => a.playerId === p.id) || sessionAttendance.find(a => a.playerId === p.id && a.status === 'Absent')));

                            return (
                                <div key={s.id} className="relative border-b border-gray-100 pb-10 last:border-b-0 break-inside-avoid">
                                    <div className="flex justify-between items-center mb-6 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                        <div className="flex items-center gap-5">
                                            <div className="w-14 h-14 bg-bvb-black text-bvb-yellow rounded-2xl flex flex-col items-center justify-center font-black">
                                                <span className="text-[10px] leading-none uppercase">ENTRY</span>
                                                <span className="text-xl leading-none">{idx + 1}</span>
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight">{s.title}</h3>
                                                <div className="flex gap-4 text-xs font-bold text-gray-500 mt-1">
                                                    <span className="flex items-center"><CalendarIcon className="w-3.5 h-3.5 mr-1.5 text-bvb-yellow" /> {s.date}</span>
                                                    <span className="flex items-center"><Users className="w-3.5 h-3.5 mr-1.5 text-bvb-yellow" /> {team?.name} ({team?.level})</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-1.5">
                                            <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${s.intensity === 'High' ? 'bg-red-50 border-red-200 text-red-700' : s.intensity === 'Medium' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-green-50 border-green-200 text-green-700'}`}>
                                                {s.intensity} INTENSITY
                                            </span>
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.duration} MINS • FOCUS: {s.focus}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-12 gap-8 px-2">
                                        <div className="col-span-5 space-y-4">
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">
                                                <List className="w-3.5 h-3.5 mr-1.5 text-bvb-yellow" /> 训练项目清单
                                            </h4>
                                            <ul className="space-y-2.5">
                                                {s.drills.map((drill, dIdx) => (
                                                    <li key={dIdx} className="text-xs font-bold text-gray-600 flex items-start bg-gray-50/50 p-2 rounded-lg border border-gray-100">
                                                        <span className="w-4 h-4 rounded bg-bvb-black text-bvb-yellow text-[8px] flex items-center justify-center mr-2 shrink-0 mt-0.5">{dIdx + 1}</span>
                                                        {drill}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="col-span-7 space-y-6">
                                            <div className="bg-gray-50 rounded-2xl p-6 border-l-4 border-bvb-black">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h4 className="text-[10px] font-black text-bvb-black uppercase tracking-widest flex items-center">
                                                        <FileText className="w-3.5 h-3.5 mr-1.5" /> 实际执行日志
                                                    </h4>
                                                </div>
                                                <div className="text-sm text-gray-700 leading-relaxed italic whitespace-pre-wrap">
                                                    {s.coachFeedback || "-- 暂无教练员训练日志记录 --"}
                                                </div>
                                            </div>

                                            <div className="bg-white border border-gray-100 rounded-2xl p-5">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">
                                                        <UserCheck className="w-3.5 h-3.5 mr-1.5 text-bvb-yellow" /> 球员考勤明细
                                                    </h4>
                                                </div>
                                                <div className="space-y-4">
                                                    <div>
                                                        <p className="text-[9px] font-black text-gray-400 uppercase mb-2">正常参训名单:</p>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {presentPlayers.map(p => (
                                                                <span key={p.id} className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-100 rounded text-[10px] font-bold">#{p.number} {p.name}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-24 text-center text-gray-300 italic font-bold">
                            -- 当前选定周期内暂无任何训练记录 --
                        </div>
                    )}
                </div>
            </div>
        </div>

        {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm"><div className="bg-white w-full h-full md:h-auto md:max-lg rounded-none md:rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col md:max-h-[90vh]"><div className="bg-bvb-black p-4 flex justify-between items-center text-white shrink-0"><h3 className="font-bold flex items-center"><Plus className="w-5 h-5 mr-2 text-bvb-yellow" /> 新建训练计划</h3><button onClick={() => setShowAddModal(false)}><X className="w-5 h-5" /></button></div><form onSubmit={handleAddSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto pb-24 md:pb-6"><div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex justify-between items-center"><div className="flex items-center"><Zap className="w-4 h-4 text-bvb-black mr-2" /><span className="text-sm font-bold text-gray-800">启用 AI 辅助生成</span></div><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={isAiMode} onChange={(e) => { setIsAiMode(e.target.checked); if(e.target.checked) setFormData(p => ({...p, linkedDesignId: undefined})) }}/><div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bvb-yellow"></div></label></div>{!isAiMode && (<button type="button" onClick={() => setShowDesignSelectModal(true)} className="w-full flex items-center justify-center p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 font-bold hover:border-bvb-yellow hover:text-bvb-black transition-colors"><PenTool className="w-4 h-4 mr-2" /> {formData.linkedDesignId ? '已选择教案 (点击重新选择)' : '从教案库导入...'}</button>)}<div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">所属梯队</label><select className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none" value={formData.teamId} onChange={e => setFormData({...formData, teamId: e.target.value})}>{availableTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>{!isAiMode && (<div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">训练主题</label><input className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none" placeholder="例如: 快速反击演练" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required={!isAiMode} /></div>)}<div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">日期</label><input type="date" className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required /></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">时长 (分钟)</label><input type="number" className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none" value={formData.duration} onChange={e => setFormData({...formData, duration: parseInt(e.target.value)})} required /></div></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">训练重点</label><select className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none" value={formData.focus} onChange={e => setFormData({...formData, focus: e.target.value})}>
                                    {trainingFoci.map(f => <option key={f} value={f}>{f}</option>)}
                                    <option value="Custom">自定义...</option>
                                </select>{formData.focus === 'Custom' && (<input className="w-full p-2 border rounded mt-2 text-xs" placeholder="输入重点..." value={formData.focusCustom} onChange={e => setFormData({...formData, focusCustom: e.target.value})} />)}</div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">强度</label><select className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none" value={formData.intensity} onChange={e => setFormData({...formData, intensity: e.target.value})}><option value="Low">低 (恢复)</option><option value="Medium">中 (常规)</option><option value="High">高 (比赛级)</option></select></div></div>{!isAiMode && (<div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">训练项目</label><div className="space-y-2 mb-2">{formData.drills.map((drill, idx) => (<div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm"><span>{drill}</span><button type="button" onClick={() => removeDrill(idx)} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4"/></button></div>))}</div><div className="flex gap-2"><input className="flex-1 p-2 border rounded text-sm" placeholder="添加项目..." value={drillInput} onChange={e => setDrillInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addDrill())} /><button type="button" onClick={addDrill} className="px-3 bg-gray-200 rounded hover:bg-gray-300"><Plus className="w-4 h-4"/></button></div>{drillLibrary && drillLibrary.length > 0 && (<div className="mt-2 flex flex-wrap gap-1"><span className="text-xs text-gray-400 mr-1">快捷添加:</span>{drillLibrary.slice(0, 4).map(d => (<button key={d} type="button" onClick={() => setFormData(prev => ({...prev, drills: [...prev.drills, d]}))} className="text-[10px] bg-gray-100 px-2 py-0.5 rounded hover:bg-yellow-50 hover:text-bvb-black transition-colors">{d}</button>))}</div>)}</div>)}<button type="submit" disabled={loading} className="w-full py-3 bg-bvb-black text-white font-bold rounded hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center">{loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {isAiMode ? 'AI 正在生成教案...' : '保存中...'}</> : (isAiMode ? '生成并保存' : '创建计划')}</button></form></div></div>
        )}
        {sessionToDuplicate && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"><div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200"><div className="bg-bvb-black p-4 flex justify-between items-center text-white"><h3 className="font-bold flex items-center"><Copy className="w-4 h-4 mr-2 text-bvb-yellow" /> 复制训练计划</h3><button onClick={() => setSessionToDuplicate(null)}><X className="w-5 h-5" /></button></div><div className="p-6 space-y-4"><div className="bg-gray-50 p-3 rounded border border-gray-100"><span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">正在复制</span><div className="font-bold text-gray-800">{sessionToDuplicate.title}</div></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center"><CalendarDays className="w-3 h-3 mr-1 text-bvb-yellow" /> 选择新计划的日期</label><input type="date" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none font-bold text-gray-700 bg-gray-50 focus:bg-white transition-colors" value={duplicateDate} onChange={e => setDuplicateDate(e.target.value)}/></div><div className="pt-2 flex gap-3"><button onClick={() => setSessionToDuplicate(null)} className="flex-1 py-2 bg-gray-100 text-gray-600 font-bold rounded hover:bg-gray-200 transition-colors">取消</button><button onClick={handleDuplicateConfirm} className="flex-1 py-2 bg-bvb-yellow text-bvb-black font-bold rounded hover:brightness-105 transition-colors shadow-sm">确认复制</button></div></div></div></div>
        )}
        {showDesignSelectModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"><div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]"><div className="bg-bvb-black p-4 flex justify-between items-center text-white shrink-0"><h3 className="font-bold flex items-center"><PenTool className="w-5 h-5 mr-2 text-bvb-yellow" /> 选择教案</h3><button onClick={() => setShowDesignSelectModal(false)}><X className="w-5 h-5" /></button></div><div className="p-4 flex-1 overflow-y-auto space-y-3">{designs.length > 0 ? designs.map(d => (<button key={d.id} onClick={() => handleImportDesign(d)} className="w-full text-left p-3 border rounded-lg hover:bg-yellow-50 hover:border-bvb-yellow transition-colors group"><div className="flex justify-between items-center"><span className="font-bold text-gray-800">{d.title}</span><span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">{d.category}</span></div><p className="text-xs text-gray-400 mt-1 line-clamp-1">{d.description}</p></button>)) : (<div className="text-center py-8 text-gray-400">暂无教案，请先在“教案设计”中创建。</div>)}</div></div></div>
        )}
        {selectedSession && (
            <SessionDetailModal session={selectedSession} teams={teams} players={players} drillLibrary={drillLibrary} trainingFoci={trainingFoci} currentUser={currentUser} onUpdate={(s, att) => { onUpdateTraining(s, att); setSelectedSession(s); }} onDuplicate={(s) => { setSessionToDuplicate(s); setDuplicateDate(new Date().toISOString().split('T')[0]); }} onDelete={(id) => { onDeleteTraining(id); setSelectedSession(null); }} onClose={() => setSelectedSession(null)} />
        )}
    </div>
  );
};

export default TrainingPlanner;
