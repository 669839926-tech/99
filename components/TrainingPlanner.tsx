
import React, { useState, useMemo, useEffect } from 'react';
import { TrainingSession, Team, Player, AttendanceRecord, AttendanceStatus, User, DrillDesign } from '../types';
import { Calendar as CalendarIcon, Clock, Zap, Cpu, Loader2, CheckCircle, Plus, ChevronLeft, ChevronRight, UserCheck, X, AlertCircle, Ban, BarChart3, PieChart as PieChartIcon, List, FileText, Send, User as UserIcon, ShieldCheck, RefreshCw, Target, Copy, Download, Trash2, PenTool } from 'lucide-react';
import { generateTrainingPlan } from '../services/geminiService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { exportToPDF } from '../services/pdfService';

interface TrainingPlannerProps {
  trainings: TrainingSession[];
  teams: Team[];
  players: Player[];
  drillLibrary: string[];
  designs?: DrillDesign[]; // NEW PROP
  currentUser: User | null;
  onAddTraining: (session: TrainingSession) => void;
  onUpdateTraining: (session: TrainingSession, attendance: AttendanceRecord[]) => void;
  onDeleteTraining: (id: string) => void;
  initialFilter?: string;
  appLogo?: string;
}

type TimeScope = 'month' | 'quarter' | 'year';

// --- Extracted SessionDetailModal (Must be outside TrainingPlanner) ---
interface SessionDetailModalProps {
    session: TrainingSession;
    teams: Team[];
    players: Player[];
    currentUser: User | null;
    onUpdate: (session: TrainingSession, attendance: AttendanceRecord[]) => void;
    onDuplicate: (session: TrainingSession) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
}

const SessionDetailModal: React.FC<SessionDetailModalProps> = ({ session, teams, players, currentUser, onUpdate, onDuplicate, onDelete, onClose }) => {
    // ... (Existing implementation of SessionDetailModal remains unchanged)
    const [activeTab, setActiveTab] = useState<'attendance' | 'log'>('attendance');
    const teamPlayers = useMemo(() => players.filter(p => p.teamId === session.teamId), [players, session.teamId]);
    const team = useMemo(() => teams.find(t => t.id === session.teamId), [teams, session.teamId]);

    // --- Attendance State ---
    const [localAttendance, setLocalAttendance] = useState<AttendanceRecord[]>(session.attendance || []);

    // --- Log / Feedback State ---
    const [coachFeedback, setCoachFeedback] = useState(session.coachFeedback || '');
    const [directorReview, setDirectorReview] = useState(session.directorReview || '');
    
    // Fix: Explicitly type the state to allow specific string literals
    const [logStatus, setLogStatus] = useState<'Planned' | 'Submitted' | 'Reviewed'>(session.submissionStatus || 'Planned');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    // Sync logStatus from props if it changes externally
    useEffect(() => {
        if (session.submissionStatus !== logStatus) {
            setLogStatus(session.submissionStatus || 'Planned');
        }
    }, [session.submissionStatus]);

    // Auto-Save Effect
    useEffect(() => {
        const timer = setTimeout(() => {
            setSaveStatus('saving');
            
            // Construct update object
            const updatedSession: TrainingSession = {
                ...session,
                attendance: localAttendance,
                coachFeedback,
                directorReview,
                submissionStatus: logStatus // Persist current status
            };
            
            onUpdate(updatedSession, localAttendance);
            
            setTimeout(() => setSaveStatus('saved'), 800);
        }, 1500); // 1.5s debounce

        return () => clearTimeout(timer);
    }, [localAttendance, coachFeedback, directorReview, logStatus]); 

    // Permissions
    const isDirector = currentUser?.role === 'director';
    const isCoach = currentUser?.role === 'coach';
    const canEditLog = (isCoach && currentUser?.teamIds?.includes(session.teamId)) || isDirector;
    
    const getStatus = (playerId: string): AttendanceStatus => {
        const record = localAttendance.find(r => r.playerId === playerId);
        return record ? record.status : 'Absent';
    };

    const setPlayerStatus = (playerId: string, status: AttendanceStatus) => {
        setLocalAttendance(prev => {
            const others = prev.filter(r => r.playerId !== playerId);
            if (status === 'Absent') return others;
            return [...others, { playerId, status }];
        });
    };

    const markAllPresent = () => {
        const allPresent: AttendanceRecord[] = teamPlayers.map(p => ({
            playerId: p.id,
            status: 'Present'
        }));
        setLocalAttendance(allPresent);
    };

    // Explicit Save (forces immediate update)
    const handleForceSave = () => {
        const updatedSession: TrainingSession = { 
            ...session, 
            attendance: localAttendance, 
            coachFeedback, 
            directorReview, 
            submissionStatus: logStatus 
        };
        onUpdate(updatedSession, localAttendance);
        setSaveStatus('saved');
    };

    const handleSubmitLog = () => {
        const newStatus: 'Submitted' = 'Submitted';
        setLogStatus(newStatus);
        // Force immediate update for status change
        const updatedSession: TrainingSession = { 
            ...session, 
            attendance: localAttendance,
            coachFeedback, 
            directorReview,
            submissionStatus: newStatus
        };
        onUpdate(updatedSession, localAttendance);
        setSaveStatus('saved');
    };

    const handleDirectorApprove = () => {
        const newStatus: 'Reviewed' = 'Reviewed';
        setLogStatus(newStatus);
        const updatedSession: TrainingSession = {
            ...session,
            attendance: localAttendance,
            coachFeedback,
            directorReview,
            submissionStatus: newStatus
        };
        onUpdate(updatedSession, localAttendance);
        setSaveStatus('saved');
    };

    const handleDelete = () => {
        onDelete(session.id);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-2xl md:rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                <div className="bg-bvb-black p-4 flex justify-between items-center text-white shrink-0">
                    <div>
                      <h3 className="font-bold text-lg leading-tight">{session.title}</h3>
                      <p className="text-xs text-gray-400">{session.date} • {team?.name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                           {saveStatus === 'saving' && <span className="text-xs text-bvb-yellow flex items-center"><RefreshCw className="w-3 h-3 mr-1 animate-spin"/> 保存中</span>}
                           {saveStatus === 'saved' && <span className="text-xs text-green-400 flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> 已保存</span>}
                      </div>
                      <button onClick={() => onDuplicate(session)} className="p-1 hover:text-bvb-yellow" title="复制训练计划">
                          <Copy className="w-5 h-5" />
                      </button>
                      {canEditLog && (
                          <button onClick={handleDelete} className="p-1 hover:text-red-500" title="删除训练计划">
                              <Trash2 className="w-5 h-5" />
                          </button>
                      )}
                      <button onClick={onClose}><X className="w-6 h-6" /></button>
                    </div>
                </div>
                
                {/* Tabs */}
                <div className="flex border-b border-gray-200 shrink-0 sticky top-0 bg-white z-10">
                    <button 
                      onClick={() => setActiveTab('attendance')}
                      className={`flex-1 py-3 text-sm font-bold flex items-center justify-center border-b-2 transition-colors ${activeTab === 'attendance' ? 'border-bvb-yellow text-bvb-black bg-gray-50' : 'border-transparent text-gray-500'}`}
                    >
                        <UserCheck className="w-4 h-4 mr-2" /> 考勤管理
                    </button>
                    <button 
                      onClick={() => setActiveTab('log')}
                      className={`flex-1 py-3 text-sm font-bold flex items-center justify-center border-b-2 transition-colors ${activeTab === 'log' ? 'border-bvb-yellow text-bvb-black bg-gray-50' : 'border-transparent text-gray-500'}`}
                    >
                        <FileText className="w-4 h-4 mr-2" /> 训练日志
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 pb-24 md:pb-6">
                    
                    {/* --- Tab 1: Attendance --- */}
                    {activeTab === 'attendance' && (
                        <div className="animate-in fade-in duration-200 space-y-6">
                          {/* Info Section */}
                          <div className="grid grid-cols-3 gap-3 text-center">
                              <div className="bg-gray-50 p-2 rounded border border-gray-100">
                                  <span className="text-xs text-gray-500 uppercase font-bold">时长</span>
                                  <div className="font-bold text-sm">{session.duration}分钟</div>
                              </div>
                              <div className="bg-gray-50 p-2 rounded border border-gray-100">
                                  <span className="text-xs text-gray-500 uppercase font-bold">重点</span>
                                  <div className="font-bold text-sm truncate">{session.focus}</div>
                              </div>
                              <div className="bg-gray-50 p-2 rounded border border-gray-100">
                                  <span className="text-xs text-gray-500 uppercase font-bold">强度</span>
                                  <div className={`font-bold text-sm ${
                                      session.intensity === 'High' ? 'text-red-600' : 'text-green-600'
                                  }`}>{session.intensity === 'High' ? '高' : session.intensity === 'Medium' ? '中' : '低'}</div>
                              </div>
                          </div>

                          <div>
                              <div className="flex justify-between items-center mb-4">
                                  <h4 className="font-bold text-gray-800 flex items-center">
                                      <UserCheck className="w-4 h-4 mr-2 text-bvb-yellow" /> 考勤列表
                                  </h4>
                                  <div className="text-xs">
                                      <span className="font-bold">{localAttendance.filter(r => r.status === 'Present').length}</span> / {teamPlayers.length} 实到
                                      <button onClick={markAllPresent} className="ml-3 text-bvb-black underline hover:text-bvb-yellow">全勤</button>
                                  </div>
                              </div>
                              
                              <div className="space-y-3">
                                  {teamPlayers.map(player => {
                                      const status = getStatus(player.id);
                                      return (
                                          <div key={player.id} className="flex flex-col p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                                              <div className="flex items-center justify-between mb-3">
                                                  <div className="flex items-center">
                                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mr-2 border-2 ${
                                                          status === 'Present' ? 'bg-green-50 border-green-200 text-green-700' :
                                                          status === 'Leave' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                                                          status === 'Injury' ? 'bg-red-50 border-red-200 text-red-700' :
                                                          'bg-gray-50 border-gray-200 text-gray-400'
                                                      }`}>
                                                          {player.name.charAt(0)}
                                                      </div>
                                                      <div>
                                                          <div className="font-bold text-gray-800 text-sm">{player.name}</div>
                                                          <div className="text-[10px] text-gray-400">#{player.number}</div>
                                                      </div>
                                                  </div>
                                                  <div className="text-[10px] font-bold">
                                                      {status === 'Present' && <span className="text-green-600">正常参训</span>}
                                                      {status === 'Leave' && <span className="text-yellow-600">请假</span>}
                                                      {status === 'Injury' && <span className="text-red-600">伤停</span>}
                                                      {(status === 'Absent' || !status) && <span className="text-gray-400">未出席</span>}
                                                  </div>
                                              </div>
                                              
                                              <div className="flex bg-gray-50 p-1 rounded-lg gap-1">
                                                  <button 
                                                      onClick={() => setPlayerStatus(player.id, 'Present')}
                                                      className={`flex-1 py-2 rounded-md transition-all flex items-center justify-center ${status === 'Present' ? 'bg-white shadow-sm text-green-600 ring-1 ring-green-100' : 'text-gray-400 hover:text-green-600 hover:bg-gray-200'}`}
                                                  >
                                                      <CheckCircle className="w-5 h-5" />
                                                  </button>
                                                  <button 
                                                      onClick={() => setPlayerStatus(player.id, 'Leave')}
                                                      className={`flex-1 py-2 rounded-md transition-all flex items-center justify-center ${status === 'Leave' ? 'bg-white shadow-sm text-yellow-600 ring-1 ring-yellow-100' : 'text-gray-400 hover:text-yellow-600 hover:bg-gray-200'}`}
                                                  >
                                                      <Clock className="w-5 h-5" />
                                                  </button>
                                                  <button 
                                                      onClick={() => setPlayerStatus(player.id, 'Injury')}
                                                      className={`flex-1 py-2 rounded-md transition-all flex items-center justify-center ${status === 'Injury' ? 'bg-white shadow-sm text-red-600 ring-1 ring-red-100' : 'text-gray-400 hover:text-red-600 hover:bg-gray-200'}`}
                                                  >
                                                      <AlertCircle className="w-5 h-5" />
                                                  </button>
                                                  <button 
                                                      onClick={() => setPlayerStatus(player.id, 'Absent')}
                                                      className={`flex-1 py-2 rounded-md transition-all flex items-center justify-center ${status === 'Absent' ? 'bg-white shadow-sm text-gray-600 ring-1 ring-gray-200' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-200'}`}
                                                  >
                                                      <Ban className="w-5 h-5" />
                                                  </button>
                                              </div>
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>
                        </div>
                    )}

                    {/* --- Tab 2: Training Log --- */}
                    {activeTab === 'log' && (
                        <div className="animate-in fade-in duration-200 space-y-6">
                            {/* Coach's Section */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-bold text-gray-800 flex items-center">
                                        <UserIcon className="w-4 h-4 mr-2 text-bvb-yellow" /> 教练日志 (Coach)
                                    </h4>
                                    <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${
                                        logStatus === 'Planned' ? 'bg-gray-100 text-gray-500' : 
                                        logStatus === 'Submitted' ? 'bg-blue-100 text-blue-700' : 
                                        'bg-green-100 text-green-700'
                                    }`}>
                                        {logStatus === 'Planned' ? '未提交' : logStatus === 'Submitted' ? '待审核' : '已审核'}
                                    </span>
                                </div>
                                
                                <div className="relative">
                                    <textarea 
                                        disabled={!canEditLog || logStatus === 'Reviewed'}
                                        className="w-full h-40 p-3 border rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none text-sm resize-none bg-gray-50 focus:bg-white transition-colors disabled:opacity-70 disabled:bg-gray-100"
                                        placeholder="请描述球队整体训练状态，以及教案实际执行效果..."
                                        value={coachFeedback}
                                        onChange={e => setCoachFeedback(e.target.value)}
                                    />
                                    {canEditLog && logStatus !== 'Reviewed' && (
                                        <div className="absolute bottom-2 right-2">
                                            <button 
                                                onClick={handleSubmitLog}
                                                disabled={!coachFeedback.trim()}
                                                className="bg-bvb-black text-white text-xs font-bold px-3 py-1.5 rounded-md hover:bg-gray-800 flex items-center disabled:opacity-50"
                                            >
                                                <Send className="w-3 h-3 mr-1" /> 提交
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Director's Section */}
                            <div className="space-y-3 pt-4 border-t border-gray-100">
                                <h4 className="font-bold text-gray-800 flex items-center">
                                    <ShieldCheck className="w-4 h-4 mr-2 text-bvb-yellow" /> 总监审核 (Director)
                                </h4>
                                
                                {isDirector ? (
                                    <div className="relative">
                                        <textarea 
                                            className="w-full h-32 p-3 border rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none text-sm resize-none bg-gray-50 focus:bg-white transition-colors"
                                            placeholder="请对本次训练及教练反馈进行点评..."
                                            value={directorReview}
                                            onChange={e => setDirectorReview(e.target.value)}
                                        />
                                        <div className="absolute bottom-2 right-2">
                                            <button 
                                                onClick={handleDirectorApprove}
                                                disabled={!directorReview.trim() || logStatus === 'Reviewed'}
                                                className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-md hover:bg-green-700 flex items-center disabled:opacity-50 disabled:bg-gray-400"
                                            >
                                                <CheckCircle className="w-3 h-3 mr-1" /> {logStatus === 'Reviewed' ? '已审核' : '确认审核'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 min-h-[80px] text-sm text-gray-600 italic">
                                        {directorReview || "暂无总监点评..."}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>

                {activeTab === 'attendance' && (
                    <div className="bg-gray-50 p-4 border-t flex justify-end shrink-0 hidden md:flex">
                        <button 
                          onClick={handleForceSave} 
                          className="px-6 py-2 bg-bvb-black text-white font-bold rounded hover:bg-gray-800 transition-colors flex items-center"
                        >
                           {saveStatus === 'saved' ? <CheckCircle className="w-4 h-4 mr-2" /> : <RefreshCw className={`w-4 h-4 mr-2 ${saveStatus === 'saving' ? 'animate-spin' : ''}`} />}
                           保存考勤并更新
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- TrainingPlanner Main Component ---

const TrainingPlanner: React.FC<TrainingPlannerProps> = ({ 
    trainings, teams, players, drillLibrary, designs = [], currentUser, onAddTraining, onUpdateTraining, onDeleteTraining, initialFilter 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [timeScope, setTimeScope] = useState<TimeScope>('month');
  const [selectedDate, setSelectedDate] = useState<string | null>(new Date().toISOString().split('T')[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDesignSelectModal, setShowDesignSelectModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Sync selectedSession with trainings prop when it updates (e.g. after auto-save)
  useEffect(() => {
    if (selectedSession) {
        const updated = trainings.find(t => t.id === selectedSession.id);
        if (updated && updated !== selectedSession) {
            setSelectedSession(updated);
        }
    }
  }, [trainings]); 

  // Form State
  const [loading, setLoading] = useState(false);
  const [isAiMode, setIsAiMode] = useState(false);
  
  const [formData, setFormData] = useState({
      teamId: teams[0]?.id || '',
      title: '',
      focus: '传接球',
      focusCustom: '',
      duration: 90,
      intensity: 'Medium',
      date: new Date().toISOString().split('T')[0],
      drills: [] as string[],
      linkedDesignId: undefined as string | undefined
  });

  const [drillInput, setDrillInput] = useState('');

  // Handle Initial Filter (Jump from Dashboard)
  useEffect(() => {
    if (initialFilter === 'pending_logs') {
        const firstPending = trainings.find(t => t.submissionStatus === 'Submitted');
        if (firstPending) {
            const date = new Date(firstPending.date);
            setCurrentDate(date);
            setSelectedDate(firstPending.date);
            setTimeScope('month');
        }
    }
  }, [initialFilter, trainings]);

  // --- Statistics & Filtering Logic ---
  const { filteredSessions, dateLabel, statsData } = useMemo(() => {
      // ... same logic
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

      const sessions = trainings.filter(t => {
          const d = new Date(t.date);
          return d >= startDate && d <= endDate;
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
  }, [currentDate, timeScope, trainings]);

  // --- Import Design Logic ---
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

  // --- View Rendering Logic ---
  const renderCalendar = () => {
      // ... same implementation as before
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const startDay = new Date(year, month, 1).getDay(); // 0 = Sun
      
      const days = [];
      for (let i = 0; i < startDay; i++) {
          days.push(<div key={`empty-${i}`} className="h-24 md:h-32 bg-gray-50/50 border-r border-b border-gray-200"></div>);
      }

      for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const isToday = dateStr === new Date().toISOString().split('T')[0];
          const isSelected = dateStr === selectedDate;
          
          const sessionsOnDay = trainings.filter(t => t.date === dateStr);
          const hasPending = sessionsOnDay.some(s => s.submissionStatus === 'Submitted');

          days.push(
              <div 
                key={d} 
                onClick={() => setSelectedDate(dateStr)}
                className={`h-24 md:h-32 border-r border-b border-gray-200 p-2 relative cursor-pointer hover:bg-yellow-50 transition-colors ${isSelected ? 'bg-yellow-50 ring-2 ring-inset ring-bvb-yellow' : 'bg-white'}`}
              >
                  <div className="flex justify-between items-start">
                      <div className="flex items-center">
                          <span className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-bvb-black text-bvb-yellow' : 'text-gray-700'}`}>
                              {d}
                          </span>
                          {hasPending && <div className="ml-1 w-2 h-2 rounded-full bg-blue-500 animate-pulse" title="待审核日志"></div>}
                      </div>
                  </div>
                  <div className="mt-1 space-y-1 overflow-y-auto max-h-[calc(100%-24px)] custom-scrollbar">
                      {sessionsOnDay.map(s => {
                          const team = teams.find(t => t.id === s.teamId);
                          return (
                            <div 
                                key={s.id}
                                onClick={(e) => { e.stopPropagation(); setSelectedSession(s); }}
                                className={`text-[10px] px-1.5 py-1 rounded font-bold truncate border-l-2 cursor-pointer hover:brightness-95 flex justify-between items-center ${
                                    s.submissionStatus === 'Submitted' ? 'bg-blue-50 border-blue-500 text-blue-700' :
                                    s.intensity === 'High' ? 'bg-red-50 border-red-500 text-red-700' :
                                    s.intensity === 'Medium' ? 'bg-yellow-50 border-yellow-500 text-yellow-800' :
                                    'bg-green-50 border-green-500 text-green-700'
                                }`}
                            >
                                <span className="truncate flex-1">{team?.level} - {s.title}</span>
                                {s.submissionStatus === 'Reviewed' && <ShieldCheck className="w-3 h-3 text-bvb-black ml-1 flex-shrink-0" />}
                                {s.submissionStatus === 'Submitted' && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-1 flex-shrink-0"></div>}
                            </div>
                          );
                      })}
                  </div>
              </div>
          );
      }
      
      return (
          <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
              {['周日', '周一', '周二', '周三', '周四', '周五', '周六'].map(d => (
                  <div key={d} className="bg-gray-100 p-2 text-center text-xs font-bold text-gray-500 uppercase">
                      {d}
                  </div>
              ))}
              {days}
          </div>
      );
  };

  const renderStats = () => {
        return (
            <div className="bg-white p-4 rounded-xl border border-gray-200 h-64">
                <h4 className="font-bold text-gray-800 mb-2 text-xs uppercase">训练重点分布</h4>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={statsData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={60}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {statsData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={['#FDE100', '#000000', '#9CA3AF', '#D1D5DB'][index % 4]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        );
  };

  const handleExportPDF = async () => {
        setIsExporting(true);
        try {
            await exportToPDF('training-plan-export', `训练计划_${dateLabel}`);
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

            // If AI Mode is on and we have focus/duration/intensity
            if (isAiMode && !finalDrills.length) {
                 const plan = await generateTrainingPlan(
                     formData.focus === 'Custom' ? formData.focusCustom : formData.focus,
                     formData.duration,
                     formData.intensity
                 );
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
                attendance: [], // Empty initially
                submissionStatus: 'Planned',
                linkedDesignId: formData.linkedDesignId
            };
            
            onAddTraining(newSession);
            setShowAddModal(false);
            // Reset Form
            setFormData({
                teamId: teams[0]?.id || '',
                title: '',
                focus: '传接球',
                focusCustom: '',
                duration: 90,
                intensity: 'Medium',
                date: new Date().toISOString().split('T')[0],
                drills: [],
                linkedDesignId: undefined
            });
            setIsAiMode(false);
        } catch (error) {
            console.error(error);
            alert('创建失败');
        } finally {
            setLoading(false);
        }
  };

  const addDrill = () => {
      if(drillInput.trim()) {
          setFormData(prev => ({ ...prev, drills: [...prev.drills, drillInput.trim()] }));
          setDrillInput('');
      }
  };

  const removeDrill = (idx: number) => {
      setFormData(prev => ({ ...prev, drills: prev.drills.filter((_, i) => i !== idx) }));
  };


  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-100px)] md:h-auto pb-20 md:pb-0">
        {/* Header / Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
            <div>
                <h2 className="text-3xl font-black text-bvb-black uppercase">训练计划</h2>
                <div className="flex items-center gap-2 mt-1">
                    <button onClick={() => setTimeScope('month')} className={`text-xs font-bold px-2 py-1 rounded ${timeScope === 'month' ? 'bg-bvb-black text-bvb-yellow' : 'bg-gray-200 text-gray-600'}`}>月视图</button>
                    <button onClick={() => setTimeScope('quarter')} className={`text-xs font-bold px-2 py-1 rounded ${timeScope === 'quarter' ? 'bg-bvb-black text-bvb-yellow' : 'bg-gray-200 text-gray-600'}`}>季视图</button>
                    <button onClick={() => setTimeScope('year')} className={`text-xs font-bold px-2 py-1 rounded ${timeScope === 'year' ? 'bg-bvb-black text-bvb-yellow' : 'bg-gray-200 text-gray-600'}`}>年视图</button>
                </div>
            </div>
            <div className="flex items-center gap-3">
                 <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                    <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft className="w-5 h-5"/></button>
                    <span className="px-3 font-bold text-sm min-w-[100px] text-center">{dateLabel}</span>
                    <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-1 hover:bg-gray-100 rounded"><ChevronRight className="w-5 h-5"/></button>
                 </div>
                 <button onClick={handleExportPDF} disabled={isExporting} className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600" title="导出PDF">
                     {isExporting ? <Loader2 className="w-5 h-5 animate-spin"/> : <Download className="w-5 h-5"/>}
                 </button>
                 <button onClick={() => setShowAddModal(true)} className="flex items-center px-4 py-2 bg-bvb-yellow text-bvb-black font-bold rounded-lg shadow-md hover:brightness-105">
                     <Plus className="w-5 h-5 mr-2" /> 新建计划
                 </button>
            </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
             {/* Left: Calendar/List */}
             <div className="flex-1 overflow-y-auto custom-scrollbar bg-white rounded-xl shadow-sm border border-gray-200 p-4 relative" id="training-plan-export">
                 <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                     <CalendarIcon className="w-5 h-5 mr-2 text-bvb-yellow" /> 日程安排
                 </h3>
                 {renderCalendar()}
             </div>

             {/* Right: Stats & Day Detail */}
             <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
                 {/* Stats Chart */}
                 {renderStats()}

                 {/* Selected Day/Session List */}
                 <div className="bg-white p-4 rounded-xl border border-gray-200 flex-1 overflow-y-auto custom-scrollbar">
                     <h4 className="font-bold text-gray-800 mb-3 text-sm uppercase flex justify-between items-center">
                         <span>{selectedDate} 安排</span>
                         {selectedDate === new Date().toISOString().split('T')[0] && <span className="text-[10px] bg-bvb-yellow px-1.5 rounded text-bvb-black">Today</span>}
                     </h4>
                     <div className="space-y-3">
                         {trainings.filter(t => t.date === selectedDate).length > 0 ? (
                             trainings.filter(t => t.date === selectedDate).map(s => {
                                 const team = teams.find(t => t.id === s.teamId);
                                 return (
                                     <div key={s.id} onClick={() => setSelectedSession(s)} className="p-3 bg-gray-50 border border-gray-100 rounded-lg cursor-pointer hover:bg-yellow-50 transition-colors group">
                                         <div className="flex justify-between items-start mb-1">
                                             <span className="text-xs font-bold text-gray-500">{team?.name}</span>
                                             <div className="flex items-center">
                                                 {s.linkedDesignId && <PenTool className="w-3 h-3 text-purple-500 mr-1" />}
                                                 {s.submissionStatus === 'Submitted' && <span className="w-2 h-2 rounded-full bg-blue-500 mr-1"></span>}
                                                 {s.submissionStatus === 'Reviewed' && <ShieldCheck className="w-3 h-3 text-green-600 mr-1" />}
                                                 <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${s.intensity === 'High' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{s.intensity}</span>
                                             </div>
                                         </div>
                                         <h5 className="font-bold text-gray-800 text-sm">{s.title}</h5>
                                         <div className="flex items-center text-xs text-gray-400 mt-2">
                                             <Clock className="w-3 h-3 mr-1" /> {s.duration} min
                                             <span className="mx-2">•</span>
                                             <Target className="w-3 h-3 mr-1" /> {s.focus}
                                         </div>
                                     </div>
                                 )
                             })
                         ) : (
                             <div className="text-center py-8 text-gray-400 text-sm">
                                 <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                 当日无训练安排
                             </div>
                         )}
                     </div>
                 </div>
             </div>
        </div>

        {/* Modal: Add Training */}
        {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-white w-full h-full md:h-auto md:max-w-lg rounded-none md:rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col md:max-h-[90vh]">
                    <div className="bg-bvb-black p-4 flex justify-between items-center text-white shrink-0">
                        <h3 className="font-bold flex items-center"><Plus className="w-5 h-5 mr-2 text-bvb-yellow" /> 新建训练计划</h3>
                        <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5" /></button>
                    </div>
                    <form onSubmit={handleAddSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto pb-24 md:pb-6">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex justify-between items-center">
                             <div className="flex items-center">
                                 <Zap className="w-4 h-4 text-bvb-black mr-2" />
                                 <span className="text-sm font-bold text-gray-800">启用 AI 辅助生成</span>
                             </div>
                             <label className="relative inline-flex items-center cursor-pointer">
                                  <input type="checkbox" className="sr-only peer" checked={isAiMode} onChange={(e) => { setIsAiMode(e.target.checked); if(e.target.checked) setFormData(p => ({...p, linkedDesignId: undefined})) }}/>
                                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bvb-yellow"></div>
                              </label>
                        </div>
                        
                        {/* Import from Design */}
                        {!isAiMode && (
                            <button 
                                type="button"
                                onClick={() => setShowDesignSelectModal(true)}
                                className="w-full flex items-center justify-center p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 font-bold hover:border-bvb-yellow hover:text-bvb-black transition-colors"
                            >
                                <PenTool className="w-4 h-4 mr-2" /> 
                                {formData.linkedDesignId ? '已选择教案 (点击重新选择)' : '从教案库导入...'}
                            </button>
                        )}

                        <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">所属梯队</label>
                             <select className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none" value={formData.teamId} onChange={e => setFormData({...formData, teamId: e.target.value})}>
                                 {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                             </select>
                        </div>

                        {!isAiMode && (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">训练主题 (Title)</label>
                                <input className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none" placeholder="例如: 快速反击演练" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required={!isAiMode} />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">日期</label>
                                <input type="date" className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
                             </div>
                             <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">时长 (分钟)</label>
                                <input type="number" className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none" value={formData.duration} onChange={e => setFormData({...formData, duration: parseInt(e.target.value)})} required />
                             </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">训练重点</label>
                                <select className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none" value={formData.focus} onChange={e => setFormData({...formData, focus: e.target.value})}>
                                    <option value="传接球">传接球</option>
                                    <option value="射门">射门</option>
                                    <option value="防守">防守</option>
                                    <option value="体能">体能</option>
                                    <option value="战术">战术</option>
                                    <option value="Custom">自定义...</option>
                                </select>
                                {formData.focus === 'Custom' && (
                                    <input className="w-full p-2 border rounded mt-2 text-xs" placeholder="输入重点..." value={formData.focusCustom} onChange={e => setFormData({...formData, focusCustom: e.target.value})} />
                                )}
                             </div>
                             <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">强度</label>
                                <select className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none" value={formData.intensity} onChange={e => setFormData({...formData, intensity: e.target.value})}>
                                    <option value="Low">低 (恢复)</option>
                                    <option value="Medium">中 (常规)</option>
                                    <option value="High">高 (比赛级)</option>
                                </select>
                             </div>
                        </div>

                        {!isAiMode && (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">训练项目 (Drills)</label>
                                <div className="space-y-2 mb-2">
                                    {formData.drills.map((drill, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm">
                                            <span>{drill}</span>
                                            <button type="button" onClick={() => removeDrill(idx)} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4"/></button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input className="flex-1 p-2 border rounded text-sm" placeholder="添加项目..." value={drillInput} onChange={e => setDrillInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addDrill())} />
                                    <button type="button" onClick={addDrill} className="px-3 bg-gray-200 rounded hover:bg-gray-300"><Plus className="w-4 h-4"/></button>
                                </div>
                                {drillLibrary && drillLibrary.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        <span className="text-xs text-gray-400 mr-1">快捷添加:</span>
                                        {drillLibrary.slice(0, 4).map(d => (
                                            <button key={d} type="button" onClick={() => setFormData(prev => ({...prev, drills: [...prev.drills, d]}))} className="text-[10px] bg-gray-100 px-2 py-0.5 rounded hover:bg-yellow-50 hover:text-bvb-black transition-colors">{d}</button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <button type="submit" disabled={loading} className="w-full py-3 bg-bvb-black text-white font-bold rounded hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center">
                            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {isAiMode ? 'AI 正在生成教案...' : '保存中...'}</> : (isAiMode ? '生成并保存' : '创建计划')}
                        </button>
                    </form>
                </div>
            </div>
        )}

        {/* Modal: Design Selection */}
        {showDesignSelectModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
                    <div className="bg-bvb-black p-4 flex justify-between items-center text-white shrink-0">
                        <h3 className="font-bold flex items-center"><PenTool className="w-5 h-5 mr-2 text-bvb-yellow" /> 选择教案</h3>
                        <button onClick={() => setShowDesignSelectModal(false)}><X className="w-5 h-5" /></button>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto space-y-3">
                        {designs.length > 0 ? designs.map(d => (
                            <button 
                                key={d.id} 
                                onClick={() => handleImportDesign(d)}
                                className="w-full text-left p-3 border rounded-lg hover:bg-yellow-50 hover:border-bvb-yellow transition-colors group"
                            >
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-gray-800">{d.title}</span>
                                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">{d.category}</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-1 line-clamp-1">{d.description}</p>
                            </button>
                        )) : (
                            <div className="text-center py-8 text-gray-400">暂无教案，请先在“教案设计”中创建。</div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* Modal: View/Edit Session */}
        {selectedSession && (
            <SessionDetailModal 
                session={selectedSession} 
                teams={teams}
                players={players}
                currentUser={currentUser}
                onUpdate={(s, att) => { onUpdateTraining(s, att); setSelectedSession(s); }}
                onDuplicate={(s) => {
                     const copy = { ...s, id: Date.now().toString(), title: `${s.title} (副本)`, date: new Date().toISOString().split('T')[0], submissionStatus: 'Planned' as any, attendance: [] };
                     onAddTraining(copy);
                     alert('已创建副本');
                }}
                onDelete={(id) => { onDeleteTraining(id); setSelectedSession(null); }}
                onClose={() => setSelectedSession(null)}
            />
        )}

    </div>
  );
};

export default TrainingPlanner;
