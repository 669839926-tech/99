
import React, { useState, useMemo, useEffect } from 'react';
import { TrainingSession, Team, Player, AttendanceRecord, AttendanceStatus, User } from '../types';
import { Calendar as CalendarIcon, Clock, Zap, Cpu, Loader2, CheckCircle, Plus, ChevronLeft, ChevronRight, UserCheck, X, AlertCircle, Ban, BarChart3, PieChart as PieChartIcon, List, FileText, Send, User as UserIcon, ShieldCheck, RefreshCw, Target, Copy, Download, Trash2 } from 'lucide-react';
import { generateTrainingPlan } from '../services/geminiService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { exportToPDF } from '../services/pdfService';

interface TrainingPlannerProps {
  trainings: TrainingSession[];
  teams: Team[];
  players: Player[];
  drillLibrary: string[];
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
    const [activeTab, setActiveTab] = useState<'attendance' | 'log'>('attendance');
    const teamPlayers = useMemo(() => players.filter(p => p.teamId === session.teamId), [players, session.teamId]);
    const team = useMemo(() => teams.find(t => t.id === session.teamId), [teams, session.teamId]);

    // --- Attendance State ---
    // Initialize state once. We rely on local state for UI responsiveness.
    // Syncing from props while editing is risky (cursor jumps), so we generally trust local state until close/re-open.
    const [localAttendance, setLocalAttendance] = useState<AttendanceRecord[]>(session.attendance || []);

    // --- Log / Feedback State ---
    const [coachFeedback, setCoachFeedback] = useState(session.coachFeedback || '');
    const [directorReview, setDirectorReview] = useState(session.directorReview || '');
    const [logStatus, setLogStatus] = useState(session.submissionStatus || 'Planned');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    // Sync logStatus from props if it changes externally (e.g. approved by another user, though rare in this session)
    useEffect(() => {
        if (session.submissionStatus !== logStatus) {
            setLogStatus(session.submissionStatus || 'Planned');
        }
    }, [session.submissionStatus]);

    // Auto-Save Effect
    useEffect(() => {
        // Prevent auto-save on initial mount by checking if state matches props roughly, 
        // but easier to just debounce. 
        const timer = setTimeout(() => {
            // Only save if there are actual changes? 
            // For simplicity, we save on debounce. The parent handles merge.
            
            setSaveStatus('saving');
            
            // Construct update object
            const updatedSession = {
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
    const canEditLog = (isCoach && session.teamId === currentUser?.teamId) || isDirector;
    
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
        onUpdate({ ...session, attendance: localAttendance, coachFeedback, directorReview, submissionStatus: logStatus }, localAttendance);
        setSaveStatus('saved');
    };

    const handleSubmitLog = () => {
        const newStatus = 'Submitted';
        setLogStatus(newStatus);
        // Force immediate update for status change
        const updatedSession = { 
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
        const newStatus = 'Reviewed';
        setLogStatus(newStatus);
        const updatedSession = {
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
    trainings, teams, players, drillLibrary, currentUser, onAddTraining, onUpdateTraining, onDeleteTraining, initialFilter 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [timeScope, setTimeScope] = useState<TimeScope>('month');
  const [selectedDate, setSelectedDate] = useState<string | null>(new Date().toISOString().split('T')[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Sync selectedSession with trainings prop when it updates (e.g. after auto-save)
  // This ensures the modal receives the latest data without closing/resetting if we pass it correctly
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
      drills: [] as string[]
  });

  const [drillInput, setDrillInput] = useState('');

  // Handle Initial Filter (Jump from Dashboard)
  useEffect(() => {
    if (initialFilter === 'pending_logs') {
        // Find the first pending log and set view to that month
        const firstPending = trainings.find(t => t.submissionStatus === 'Submitted');
        if (firstPending) {
            const date = new Date(firstPending.date);
            setCurrentDate(date);
            setSelectedDate(firstPending.date);
            // Optionally auto-open list view or switch to month view
            setTimeScope('month');
        }
    }
  }, [initialFilter, trainings]);

  // --- Statistics & Filtering Logic ---

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

      // Filter Sessions
      const sessions = trainings.filter(t => {
          const d = new Date(t.date);
          return d >= startDate && d <= endDate;
      }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate Stats
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

  // --- View Rendering Logic ---

  const renderCalendar = () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const startDay = new Date(year, month, 1).getDay(); // 0 = Sun
      
      const days = [];
      // Empty slots for start of month
      for (let i = 0; i < startDay; i++) {
          days.push(<div key={`empty-${i}`} className="h-24 md:h-32 bg-gray-50/50 border-r border-b border-gray-200"></div>);
      }

      // Days
      for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const isToday = dateStr === new Date().toISOString().split('T')[0];
          const isSelected = dateStr === selectedDate;
          
          const sessionsOnDay = trainings.filter(t => t.date === dateStr);

          // Check if any session on this day has pending status
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
      return days;
  };

  const renderPeriodList = () => {
      // Group by Month
      const groups: Record<string, TrainingSession[]> = {};
      filteredSessions.forEach(s => {
          const d = new Date(s.date);
          const key = `${d.getFullYear()}年${d.getMonth() + 1}月`;
          if (!groups[key]) groups[key] = [];
          groups[key].push(s);
      });

      return (
          <div className="space-y-6">
              {Object.keys(groups).map(monthKey => (
                  <div key={monthKey}>
                      <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 sticky top-0 bg-white py-2 z-10">{monthKey}</h4>
                      <div className="space-y-3">
                          {groups[monthKey].map(s => {
                              const team = teams.find(t => t.id === s.teamId);
                              const canDelete = (currentUser?.role === 'director') || (currentUser?.role === 'coach' && currentUser.teamId === s.teamId);
                              return (
                                  <div 
                                    key={s.id}
                                    onClick={() => setSelectedSession(s)}
                                    className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-all hover:border-bvb-yellow group"
                                  >
                                      <div className="flex items-center">
                                          <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center mr-4 border ${
                                              s.intensity === 'High' ? 'bg-red-50 border-red-100 text-red-600' :
                                              s.intensity === 'Medium' ? 'bg-yellow-50 border-yellow-100 text-yellow-600' :
                                              'bg-green-50 border-green-100 text-green-600'
                                          }`}>
                                              <span className="text-xs font-bold">{new Date(s.date).getDate()}</span>
                                              <span className="text-[10px] uppercase">{s.intensity}</span>
                                          </div>
                                          <div>
                                              <div className="flex items-center gap-2">
                                                  <span className="text-xs font-bold bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{team?.level}</span>
                                                  <h4 className="font-bold text-gray-800">{s.title}</h4>
                                                  {s.submissionStatus === 'Submitted' && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 rounded font-bold">待审核</span>}
                                                  {s.submissionStatus === 'Reviewed' && <span className="text-[10px] bg-green-100 text-green-600 px-1.5 rounded font-bold flex items-center"><ShieldCheck className="w-3 h-3 mr-1"/>已审</span>}
                                              </div>
                                              <div className="text-xs text-gray-400 mt-1 flex items-center gap-3">
                                                  <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {s.duration}分钟</span>
                                                  <span className="flex items-center"><Target className="w-3 h-3 mr-1" /> {s.focus}</span>
                                              </div>
                                          </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                          {canDelete && (
                                              <button
                                                  onClick={(e) => { e.stopPropagation(); onDeleteTraining(s.id); }}
                                                  className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                  title="删除"
                                              >
                                                  <Trash2 className="w-4 h-4" />
                                              </button>
                                          )}
                                          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-bvb-yellow transition-colors" />
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              ))}
              {filteredSessions.length === 0 && <p className="text-gray-400 text-sm py-8 text-center italic">该时段暂无训练安排</p>}
          </div>
      );
  };

  const navigateDate = (direction: 'prev' | 'next') => {
      const newDate = new Date(currentDate);
      if (timeScope === 'month') {
          newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
      } else if (timeScope === 'quarter') {
          newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 3 : -3));
      } else {
          newDate.setFullYear(newDate.getFullYear() + (direction === 'next' ? 1 : -1));
      }
      setCurrentDate(newDate);
  };

  const handleAddDrill = () => {
      if (drillInput.trim()) {
          setFormData(prev => ({ ...prev, drills: [...prev.drills, drillInput.trim()] }));
          setDrillInput('');
      }
  };

  const handleRemoveDrill = (idx: number) => {
      setFormData(prev => ({ ...prev, drills: prev.drills.filter((_, i) => i !== idx) }));
  };

  const handleDuplicateSession = (session: TrainingSession) => {
      setFormData({
          teamId: session.teamId,
          title: `${session.title} (复制)`,
          focus: session.focus,
          focusCustom: '', // If it was custom, we could map it, but simplicity first
          duration: session.duration,
          intensity: session.intensity,
          date: new Date().toISOString().split('T')[0], // Default to today
          drills: [...session.drills]
      });
      setSelectedSession(null); // Close detail
      setShowAddModal(true); // Open add
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (formData.title && formData.teamId) {
          const newSession: TrainingSession = {
              id: Date.now().toString(),
              teamId: formData.teamId,
              title: formData.title,
              date: formData.date,
              focus: formData.focus === 'Custom' ? formData.focusCustom : formData.focus,
              duration: formData.duration,
              intensity: formData.intensity as any,
              drills: formData.drills,
              attendance: [], // Init empty
              aiGenerated: isAiMode,
              submissionStatus: 'Planned'
          };
          onAddTraining(newSession);
          setShowAddModal(false);
          // Reset
          setFormData({
            teamId: teams[0]?.id || '',
            title: '',
            focus: '传接球',
            focusCustom: '',
            duration: 90,
            intensity: 'Medium',
            date: new Date().toISOString().split('T')[0],
            drills: []
          });
          setIsAiMode(false);
      }
  };

  const handleAiGenerate = async () => {
      setLoading(true);
      try {
          const result = await generateTrainingPlan(
              formData.focus === 'Custom' ? formData.focusCustom : formData.focus,
              formData.duration,
              formData.intensity
          );
          if (result) {
              setFormData(prev => ({
                  ...prev,
                  title: result.title || prev.title,
                  drills: result.drills || prev.drills
              }));
              setIsAiMode(true);
          }
      } catch (e) {
          alert('AI 生成失败，请重试');
      } finally {
          setLoading(false);
      }
  };

  const handleExportPDF = async () => {
      setIsExporting(true);
      try {
          await exportToPDF('training-plan-export', `训练计划_${dateLabel.replace(/\s+/g, '_')}`);
      } catch (e) {
          alert('导出失败');
      } finally {
          setIsExporting(false);
      }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
           <h2 className="text-3xl font-black text-bvb-black uppercase">训练计划</h2>
           <p className="text-gray-500">制定教案，追踪考勤，分析训练负荷。</p>
        </div>
        <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 p-1 rounded-lg">
                <button onClick={() => setTimeScope('month')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${timeScope === 'month' ? 'bg-white shadow text-bvb-black' : 'text-gray-500'}`}>月视图</button>
                <button onClick={() => setTimeScope('quarter')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${timeScope === 'quarter' ? 'bg-white shadow text-bvb-black' : 'text-gray-500'}`}>季视图</button>
                <button onClick={() => setTimeScope('year')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${timeScope === 'year' ? 'bg-white shadow text-bvb-black' : 'text-gray-500'}`}>年视图</button>
            </div>
            
            <button 
                onClick={handleExportPDF}
                disabled={isExporting}
                className="flex items-center px-3 py-2 bg-gray-800 text-bvb-yellow text-xs font-bold rounded-lg hover:bg-gray-700 transition-colors"
                title="导出为 PDF"
            >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
                导出计划
            </button>

            <button 
                onClick={() => setShowAddModal(true)}
                className="flex items-center px-4 py-2 bg-bvb-black text-white font-bold rounded-lg hover:bg-gray-800 transition-colors shadow-md"
            >
                <Plus className="w-5 h-5 mr-2 text-bvb-yellow" />
                新建计划
            </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
          
          {/* Left: Calendar / List */}
          <div className="w-full lg:w-2/3 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
              {/* Toolbar */}
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                  <div className="flex items-center gap-4">
                      <button onClick={() => navigateDate('prev')} className="p-1 hover:bg-white rounded-full transition-colors"><ChevronLeft className="w-5 h-5 text-gray-500" /></button>
                      <h3 className="text-lg font-black text-gray-800 tracking-tight">{dateLabel}</h3>
                      <button onClick={() => navigateDate('next')} className="p-1 hover:bg-white rounded-full transition-colors"><ChevronRight className="w-5 h-5 text-gray-500" /></button>
                  </div>
                  <div className="text-xs font-bold text-gray-400">
                      共 {filteredSessions.length} 节训练课
                  </div>
              </div>

              {/* View Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
                 {timeScope === 'month' ? (
                     <div className="overflow-x-auto">
                        <div className="grid grid-cols-7 border-l border-t border-gray-200 min-w-[700px] md:min-w-0">
                            {['日','一','二','三','四','五','六'].map(d => (
                                <div key={d} className="py-2 text-center text-xs font-bold text-gray-400 bg-gray-50 border-r border-b border-gray-200">{d}</div>
                            ))}
                            {renderCalendar()}
                        </div>
                     </div>
                 ) : (
                     <div className="p-4">
                         {renderPeriodList()}
                     </div>
                 )}
              </div>
          </div>

          {/* Right: Stats & Quick Info */}
          <div className="w-full lg:w-1/3 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
              
              {/* Focus Chart */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                      <PieChartIcon className="w-5 h-5 mr-2 text-bvb-yellow" /> 训练重点分布
                  </h3>
                  <div className="h-48">
                      {statsData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={statsData} 
                                    dataKey="value" 
                                    nameKey="name" 
                                    cx="50%" 
                                    cy="50%" 
                                    outerRadius={60} 
                                    innerRadius={40}
                                    paddingAngle={5}
                                >
                                    {statsData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#FDE100', '#000000', '#4B5563', '#9CA3AF', '#D1D5DB'][index % 5]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: '10px' }}/>
                            </PieChart>
                        </ResponsiveContainer>
                      ) : (
                          <div className="flex items-center justify-center h-full text-gray-400 text-xs">暂无数据</div>
                      )}
                  </div>
              </div>

              {/* Selected Day/Session Preview */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex-1">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                      <List className="w-5 h-5 mr-2 text-bvb-yellow" /> 
                      {selectedDate ? `${selectedDate} 安排` : '今日安排'}
                  </h3>
                  <div className="space-y-3">
                      {trainings.filter(t => t.date === selectedDate).map(s => (
                          <div key={s.id} onClick={() => setSelectedSession(s)} className="p-3 bg-gray-50 border border-gray-100 rounded-lg hover:bg-yellow-50 hover:border-bvb-yellow cursor-pointer transition-colors group">
                              <div className="flex justify-between items-start mb-1">
                                  <span className="text-xs font-bold text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200">{teams.find(t => t.id === s.teamId)?.level}</span>
                                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-bvb-black" />
                              </div>
                              <h4 className="font-bold text-gray-800">{s.title}</h4>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{s.drills.join(', ')}</p>
                          </div>
                      ))}
                      {trainings.filter(t => t.date === selectedDate).length === 0 && (
                          <div className="text-center py-8">
                              <p className="text-gray-400 text-sm mb-4">本日暂无训练计划</p>
                              <button onClick={() => {
                                  setFormData(prev => ({ ...prev, date: selectedDate || new Date().toISOString().split('T')[0] }));
                                  setShowAddModal(true);
                              }} className="text-xs font-bold text-bvb-black bg-bvb-yellow px-4 py-2 rounded hover:brightness-105">
                                  立即添加
                              </button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white w-full h-full md:h-auto md:max-w-lg md:rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col md:max-h-[90vh]">
                  <div className="bg-bvb-black p-4 flex justify-between items-center text-white shrink-0">
                      <h3 className="font-bold flex items-center">
                          <Plus className="w-5 h-5 mr-2 text-bvb-yellow" /> 新建训练计划
                      </h3>
                      <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5" /></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 pb-24 md:pb-6">
                      <form onSubmit={handleSubmit} className="space-y-4">
                          {/* AI Generator Banner */}
                          <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-100 flex justify-between items-center">
                              <div>
                                  <h4 className="font-bold text-purple-900 text-sm flex items-center"><Zap className="w-4 h-4 mr-1 text-purple-600"/> AI 辅助教案</h4>
                                  <p className="text-xs text-purple-700 mt-1">输入重点与强度，自动生成训练内容</p>
                              </div>
                              <button 
                                type="button" 
                                onClick={handleAiGenerate}
                                disabled={loading}
                                className="bg-white text-purple-700 text-xs font-bold px-3 py-2 rounded border border-purple-200 hover:bg-purple-50 flex items-center shadow-sm"
                              >
                                  {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1"/> : <Cpu className="w-3 h-3 mr-1"/>}
                                  {loading ? '生成中...' : '一键生成'}
                              </button>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">训练对象</label>
                                  <select className="w-full p-2 border rounded text-sm bg-white focus:ring-2 focus:ring-bvb-yellow outline-none" value={formData.teamId} onChange={e => setFormData({...formData, teamId: e.target.value})}>
                                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">日期</label>
                                  <input type="date" className="w-full p-2 border rounded text-sm bg-white focus:ring-2 focus:ring-bvb-yellow outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                              </div>
                          </div>

                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">训练主题</label>
                              <input 
                                className="w-full p-2 border rounded text-sm bg-white focus:ring-2 focus:ring-bvb-yellow outline-none font-bold" 
                                placeholder="例如: 快速反击演练"
                                value={formData.title} 
                                onChange={e => setFormData({...formData, title: e.target.value})} 
                              />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">训练重点</label>
                                  <select className="w-full p-2 border rounded text-sm bg-white focus:ring-2 focus:ring-bvb-yellow outline-none" value={formData.focus} onChange={e => setFormData({...formData, focus: e.target.value})}>
                                      <option value="传接球">传接球</option>
                                      <option value="盘带与过人">盘带与过人</option>
                                      <option value="射门">射门</option>
                                      <option value="防守">防守</option>
                                      <option value="体能">体能</option>
                                      <option value="战术">战术</option>
                                      <option value="Custom">自定义...</option>
                                  </select>
                                  {formData.focus === 'Custom' && (
                                      <input 
                                        className="mt-2 w-full p-2 border rounded text-sm" 
                                        placeholder="输入自定义重点"
                                        value={formData.focusCustom}
                                        onChange={e => setFormData({...formData, focusCustom: e.target.value})}
                                      />
                                  )}
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">强度 & 时长</label>
                                  <div className="flex gap-2">
                                      <select className="w-1/2 p-2 border rounded text-sm bg-white focus:ring-2 focus:ring-bvb-yellow outline-none" value={formData.intensity} onChange={e => setFormData({...formData, intensity: e.target.value})}>
                                          <option value="Low">低</option>
                                          <option value="Medium">中</option>
                                          <option value="High">高</option>
                                      </select>
                                      <div className="w-1/2 relative">
                                          <input type="number" className="w-full p-2 border rounded text-sm bg-white focus:ring-2 focus:ring-bvb-yellow outline-none" value={formData.duration} onChange={e => setFormData({...formData, duration: parseInt(e.target.value)})} />
                                          <span className="absolute right-2 top-2 text-xs text-gray-400">min</span>
                                      </div>
                                  </div>
                              </div>
                          </div>

                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">训练项目 (Drills)</label>
                              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2">
                                  {formData.drills.map((d, i) => (
                                      <div key={i} className="flex justify-between items-center bg-white p-2 rounded border border-gray-100 shadow-sm text-sm">
                                          <span>{i+1}. {d}</span>
                                          <button type="button" onClick={() => handleRemoveDrill(i)} className="text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                                      </div>
                                  ))}
                                  <div className="flex gap-2 mt-2">
                                      <input 
                                        className="flex-1 p-2 border rounded text-sm focus:ring-2 focus:ring-bvb-yellow outline-none" 
                                        placeholder="添加项目..." 
                                        value={drillInput}
                                        onChange={e => setDrillInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddDrill())}
                                      />
                                      <button type="button" onClick={handleAddDrill} className="px-3 bg-gray-200 rounded text-gray-600 hover:bg-gray-300 font-bold"><Plus className="w-4 h-4" /></button>
                                  </div>
                                  
                                  {/* Quick Select from Library */}
                                  {drillLibrary.length > 0 && (
                                      <div className="mt-3 pt-2 border-t border-gray-200">
                                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">快速添加 (来自库)</p>
                                          <div className="flex flex-wrap gap-2">
                                              {drillLibrary.map(d => (
                                                  <button 
                                                    type="button" 
                                                    key={d} 
                                                    onClick={() => setFormData(prev => ({ ...prev, drills: [...prev.drills, d] }))}
                                                    className="text-[10px] bg-white border border-gray-200 px-2 py-1 rounded hover:border-bvb-yellow hover:bg-yellow-50 transition-colors"
                                                  >
                                                      {d}
                                                  </button>
                                              ))}
                                          </div>
                                      </div>
                                  )}
                              </div>
                          </div>

                          <button type="submit" className="w-full py-3 bg-bvb-yellow text-bvb-black font-bold rounded hover:brightness-105 shadow-md mt-2">
                              确认创建计划
                          </button>
                      </form>
                  </div>
              </div>
          </div>
      )}

      {/* Detail Modal - Rendered Conditionally */}
      {selectedSession && (
         <SessionDetailModal 
            session={selectedSession}
            teams={teams}
            players={players}
            currentUser={currentUser}
            onUpdate={onUpdateTraining}
            onDuplicate={handleDuplicateSession}
            onDelete={onDeleteTraining}
            onClose={() => setSelectedSession(null)}
         />
      )}

      {/* Hidden Export Template */}
      <div id="training-plan-export" className="absolute left-[-9999px] top-0 w-[1100px] bg-white text-black p-12 z-[-1000] font-sans">
          {/* Header */}
          <div className="flex justify-between items-center border-b-4 border-bvb-yellow pb-6 mb-8">
             <div className="flex items-center">
                 <div className="w-16 h-16 bg-bvb-yellow rounded-full flex items-center justify-center text-bvb-black font-black text-2xl border-4 border-black mr-4">WS</div>
                 <div>
                     <h1 className="text-4xl font-black uppercase tracking-tighter">顽石之光足球俱乐部</h1>
                     <p className="text-xl text-gray-500 font-bold mt-1">青训教案总表 / Training Plan Schedule</p>
                 </div>
             </div>
             <div className="text-right">
                 <div className="text-sm font-bold text-gray-400 uppercase">时间范围</div>
                 <div className="text-2xl font-black">{dateLabel}</div>
             </div>
          </div>

          {/* Training Focus Analysis Section */}
          <div className="mb-8 flex gap-8">
              <div className="w-1/3 bg-gray-50 p-6 rounded-lg border border-gray-100 flex flex-col justify-center">
                  <h3 className="font-bold text-lg mb-2">数据概览</h3>
                  <div className="space-y-2">
                      <div className="flex justify-between">
                          <span className="text-gray-500 text-sm">总课时数</span>
                          <span className="font-black">{filteredSessions.length} 节</span>
                      </div>
                      <div className="flex justify-between">
                          <span className="text-gray-500 text-sm">平均时长</span>
                          <span className="font-black">{Math.round(filteredSessions.reduce((acc, s) => acc + s.duration, 0) / (filteredSessions.length || 1))} 分钟</span>
                      </div>
                  </div>
              </div>
              <div className="w-2/3 h-64 border border-gray-100 rounded-lg p-2">
                  <h3 className="font-bold text-sm text-gray-500 uppercase absolute ml-2 mt-2">训练重点分布</h3>
                  {statsData.length > 0 && (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={statsData} 
                                    dataKey="value" 
                                    nameKey="name" 
                                    cx="50%" 
                                    cy="50%" 
                                    outerRadius={80} 
                                    innerRadius={50}
                                    paddingAngle={2}
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {statsData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#FDE100', '#000000', '#4B5563', '#9CA3AF', '#D1D5DB'][index % 5]} />
                                    ))}
                                </Pie>
                                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }}/>
                            </PieChart>
                        </ResponsiveContainer>
                  )}
              </div>
          </div>
          
          {/* Table */}
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 border-b-2 border-gray-300">
              <tr>
                 <th className="p-3 font-black text-sm uppercase text-gray-600">日期/时间</th>
                 <th className="p-3 font-black text-sm uppercase text-gray-600">梯队</th>
                 <th className="p-3 font-black text-sm uppercase text-gray-600">训练主题</th>
                 <th className="p-3 font-black text-sm uppercase text-gray-600">重点</th>
                 <th className="p-3 font-black text-sm uppercase text-gray-600 w-[35%]">主要内容 (Drills)</th>
                 <th className="p-3 font-black text-sm uppercase text-gray-600 text-center">强度</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.map((session, idx) => {
                 const team = teams.find(t => t.id === session.teamId);
                 return (
                     <tr key={session.id} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="p-3 align-top">
                            <div className="font-bold text-gray-900">{session.date}</div>
                            <div className="text-xs text-gray-500 font-mono mt-1">{session.duration} min</div>
                        </td>
                        <td className="p-3 align-top font-bold">{team?.level}</td>
                        <td className="p-3 align-top font-bold text-gray-800">{session.title}</td>
                        <td className="p-3 align-top text-sm">{session.focus}</td>
                        <td className="p-3 align-top">
                            <ul className="list-disc list-inside text-xs space-y-1 text-gray-700">
                                {session.drills.map((d, i) => <li key={i}>{d}</li>)}
                            </ul>
                        </td>
                        <td className="p-3 align-top text-center">
                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                session.intensity === 'High' ? 'bg-red-100 text-red-700' :
                                session.intensity === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-green-100 text-green-700'
                            }`}>
                                {session.intensity}
                            </span>
                        </td>
                     </tr>
                 );
              })}
            </tbody>
          </table>
          
          <div className="mt-8 pt-4 border-t border-gray-200 flex justify-between items-center text-xs text-gray-400">
              <span>导出时间: {new Date().toLocaleString()}</span>
              <span>© 顽石之光足球俱乐部 - 内部训练资料</span>
          </div>
      </div>
    </div>
  );
};

export default TrainingPlanner;
