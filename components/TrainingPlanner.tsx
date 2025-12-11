
import React, { useState, useMemo, useEffect } from 'react';
import { TrainingSession, Team, Player, AttendanceRecord, AttendanceStatus, User } from '../types';
import { Calendar as CalendarIcon, Clock, Zap, Cpu, Loader2, CheckCircle, Plus, ChevronLeft, ChevronRight, UserCheck, X, AlertCircle, Ban, BarChart3, PieChart as PieChartIcon, List, FileText, Send, User as UserIcon, ShieldCheck, RefreshCw } from 'lucide-react';
import { generateTrainingPlan } from '../services/geminiService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface TrainingPlannerProps {
  trainings: TrainingSession[];
  teams: Team[];
  players: Player[];
  drillLibrary: string[];
  currentUser: User | null;
  onAddTraining: (session: TrainingSession) => void;
  onUpdateTraining: (session: TrainingSession, attendance: AttendanceRecord[]) => void;
  initialFilter?: string;
}

type TimeScope = 'month' | 'quarter' | 'year';

const TrainingPlanner: React.FC<TrainingPlannerProps> = ({ 
    trainings, teams, players, drillLibrary, currentUser, onAddTraining, onUpdateTraining, initialFilter 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [timeScope, setTimeScope] = useState<TimeScope>('month');
  const [selectedDate, setSelectedDate] = useState<string | null>(new Date().toISOString().split('T')[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);

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

      if (filteredSessions.length === 0) {
          return (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <CalendarIcon className="w-12 h-12 mb-2 opacity-20" />
                  <p>该时间段内暂无训练计划</p>
                  <button onClick={handleOpenAddModal} className="mt-4 text-bvb-yellow hover:underline font-bold">立即创建</button>
              </div>
          );
      }

      return (
          <div className="space-y-6 p-4">
              {Object.keys(groups).map(monthKey => (
                  <div key={monthKey} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                          <h4 className="font-bold text-gray-700">{monthKey}</h4>
                          <span className="text-xs bg-gray-200 px-2 py-0.5 rounded text-gray-600 font-bold">{groups[monthKey].length} 节课</span>
                      </div>
                      <div className="divide-y divide-gray-100">
                          {groups[monthKey].map(s => {
                              const team = teams.find(t => t.id === s.teamId);
                              const isPending = s.submissionStatus === 'Submitted';
                              return (
                                  <div 
                                    key={s.id} 
                                    onClick={() => setSelectedSession(s)}
                                    className={`p-4 hover:bg-yellow-50 cursor-pointer transition-colors flex items-center justify-between ${isPending ? 'bg-blue-50/30' : ''}`}
                                  >
                                      <div className="flex items-center gap-4">
                                          <div className="flex flex-col items-center justify-center w-12 h-12 bg-gray-100 rounded-lg text-gray-600">
                                              <span className="text-xs font-bold uppercase">{new Date(s.date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                              <span className="text-lg font-black">{new Date(s.date).getDate()}</span>
                                          </div>
                                          <div>
                                              <h5 className="font-bold text-gray-900 flex items-center">
                                                  {s.title}
                                                  {s.submissionStatus === 'Submitted' && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded animate-pulse">待审核</span>}
                                                  {s.submissionStatus === 'Reviewed' && <span className="ml-2 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded flex items-center"><ShieldCheck className="w-3 h-3 mr-1"/>已审核</span>}
                                              </h5>
                                              <div className="flex items-center gap-2 mt-1">
                                                  <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600 font-medium">{team?.name}</span>
                                                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                                                      s.intensity === 'High' ? 'bg-red-50 text-red-600' : 
                                                      s.intensity === 'Medium' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'
                                                  }`}>
                                                      {s.intensity === 'High' ? '高强度' : s.intensity === 'Medium' ? '中等' : '低强度'}
                                                  </span>
                                                  <span className="text-xs text-gray-400">| {s.focus}</span>
                                              </div>
                                          </div>
                                      </div>
                                      <ChevronRight className="w-5 h-5 text-gray-300" />
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              ))}
          </div>
      );
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
      const newDate = new Date(currentDate);
      const offset = direction === 'next' ? 1 : -1;

      if (timeScope === 'month') {
          newDate.setMonth(newDate.getMonth() + offset);
      } else if (timeScope === 'quarter') {
          newDate.setMonth(newDate.getMonth() + (offset * 3));
      } else {
          newDate.setFullYear(newDate.getFullYear() + offset);
      }
      setCurrentDate(newDate);
  };

  // --- Handlers ---

  const handleOpenAddModal = () => {
      setFormData({
          teamId: teams[0]?.id || '',
          title: '',
          focus: '传接球',
          focusCustom: '',
          duration: 90,
          intensity: 'Medium',
          date: selectedDate || new Date().toISOString().split('T')[0],
          drills: []
      });
      setIsAiMode(false);
      setShowAddModal(true);
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
        const finalFocus = formData.focus === 'Custom' ? formData.focusCustom : formData.focus;
        const aiPlan = await generateTrainingPlan(finalFocus, formData.duration, formData.intensity);
        
        setFormData(prev => ({
            ...prev,
            title: aiPlan.title || 'AI 训练课',
            drills: aiPlan.drills || []
        }));
    } catch (err) {
        alert("生成计划失败，请重试。");
    } finally {
        setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const finalFocus = formData.focus === 'Custom' ? formData.focusCustom : formData.focus;
      const newSession: TrainingSession = {
          id: Date.now().toString(),
          teamId: formData.teamId,
          date: formData.date,
          focus: finalFocus,
          duration: formData.duration,
          intensity: formData.intensity as 'Low' | 'Medium' | 'High',
          title: formData.title || `${finalFocus}训练`,
          drills: formData.drills,
          aiGenerated: isAiMode,
          attendance: [],
          submissionStatus: 'Planned'
      };
      onAddTraining(newSession);
      setShowAddModal(false);
  };

  const toggleDrill = (drill: string) => {
      if (formData.drills.includes(drill)) {
          setFormData(prev => ({...prev, drills: prev.drills.filter(d => d !== drill)}));
      } else {
          setFormData(prev => ({...prev, drills: [...prev.drills, drill]}));
      }
  };

  const addManualDrill = () => {
      if (drillInput.trim()) {
          setFormData(prev => ({...prev, drills: [...prev.drills, drillInput.trim()]}));
          setDrillInput('');
      }
  };

  const COLORS = ['#FDE100', '#000000', '#9CA3AF', '#D1D5DB', '#4B5563', '#F59E0B'];

  // --- Attendance & Log Modal ---
  const SessionDetailModal = () => {
      if (!selectedSession) return null;
      
      const [activeTab, setActiveTab] = useState<'attendance' | 'log'>('attendance');
      const teamPlayers = players.filter(p => p.teamId === selectedSession.teamId);
      const team = teams.find(t => t.id === selectedSession.teamId);

      // --- Attendance State ---
      const [localAttendance, setLocalAttendance] = useState<AttendanceRecord[]>(selectedSession.attendance || []);

      // --- Log / Feedback State ---
      const [coachFeedback, setCoachFeedback] = useState(selectedSession.coachFeedback || '');
      const [directorReview, setDirectorReview] = useState(selectedSession.directorReview || '');
      const [logStatus, setLogStatus] = useState(selectedSession.submissionStatus || 'Planned');
      const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

      // Auto-Save Effect
      useEffect(() => {
          const timer = setTimeout(() => {
              setSaveStatus('saving');
              
              // Construct update object
              const updatedSession = {
                  ...selectedSession,
                  attendance: localAttendance,
                  coachFeedback,
                  directorReview,
                  // Do not update status here unless explicitly handled by buttons,
                  // but we want to ensure latest text is saved.
                  // Status updates are handled by specific buttons.
              };
              
              onUpdateTraining(updatedSession, localAttendance);
              
              setTimeout(() => setSaveStatus('saved'), 800);
          }, 1500); // 1.5s debounce

          return () => clearTimeout(timer);
      }, [localAttendance, coachFeedback, directorReview]);

      // Permissions
      const isDirector = currentUser?.role === 'director';
      const isCoach = currentUser?.role === 'coach';
      const canEditLog = (isCoach && selectedSession.teamId === currentUser?.teamId) || isDirector;
      const canReview = isDirector;

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
          onUpdateTraining({ ...selectedSession, attendance: localAttendance, coachFeedback, directorReview }, localAttendance);
          setSaveStatus('saved');
      };

      const handleSubmitLog = () => {
          const updatedSession = { 
              ...selectedSession, 
              coachFeedback, 
              directorReview,
              submissionStatus: 'Submitted' as const
          };
          onUpdateTraining(updatedSession, localAttendance);
          setSelectedSession(updatedSession);
          setLogStatus('Submitted');
          setSaveStatus('saved');
      };

      const handleDirectorApprove = () => {
          const updatedSession = {
              ...selectedSession,
              coachFeedback,
              directorReview,
              submissionStatus: 'Reviewed' as const
          };
          onUpdateTraining(updatedSession, localAttendance);
          setSelectedSession(updatedSession);
          setLogStatus('Reviewed');
          setSaveStatus('saved');
      };

      return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="bg-bvb-black p-4 flex justify-between items-center text-white shrink-0">
                      <div>
                        <h3 className="font-bold text-lg">{selectedSession.title}</h3>
                        <p className="text-xs text-gray-400">{selectedSession.date} • {team?.name}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                             {saveStatus === 'saving' && <span className="text-xs text-bvb-yellow flex items-center"><RefreshCw className="w-3 h-3 mr-1 animate-spin"/> 正在保存...</span>}
                             {saveStatus === 'saved' && <span className="text-xs text-green-400 flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> 已保存</span>}
                        </div>
                        <button onClick={() => setSelectedSession(null)}><X className="w-5 h-5" /></button>
                      </div>
                  </div>
                  
                  {/* Tabs */}
                  <div className="flex border-b border-gray-200">
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
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      
                      {/* --- Tab 1: Attendance --- */}
                      {activeTab === 'attendance' && (
                          <div className="animate-in fade-in duration-200 space-y-6">
                            {/* Info Section */}
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div className="bg-gray-50 p-2 rounded">
                                    <span className="text-xs text-gray-500 uppercase">时长</span>
                                    <div className="font-bold">{selectedSession.duration}分钟</div>
                                </div>
                                <div className="bg-gray-50 p-2 rounded">
                                    <span className="text-xs text-gray-500 uppercase">重点</span>
                                    <div className="font-bold">{selectedSession.focus}</div>
                                </div>
                                <div className="bg-gray-50 p-2 rounded">
                                    <span className="text-xs text-gray-500 uppercase">强度</span>
                                    <div className={`font-bold ${
                                        selectedSession.intensity === 'High' ? 'text-red-600' : 'text-green-600'
                                    }`}>{selectedSession.intensity === 'High' ? '高' : selectedSession.intensity === 'Medium' ? '中' : '低'}</div>
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
                                
                                <div className="space-y-2">
                                    {teamPlayers.map(player => {
                                        const status = getStatus(player.id);
                                        return (
                                            <div key={player.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex items-center">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mr-3 border-2 ${
                                                        status === 'Present' ? 'bg-green-50 border-green-200 text-green-700' :
                                                        status === 'Leave' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                                                        status === 'Injury' ? 'bg-red-50 border-red-200 text-red-700' :
                                                        'bg-gray-50 border-gray-200 text-gray-400'
                                                    }`}>
                                                        {player.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-800">{player.name}</div>
                                                        <div className="text-[10px] flex items-center gap-2">
                                                            {status === 'Present' && <span className="text-green-600 font-bold">正常参训 (-1 课时)</span>}
                                                            {status === 'Leave' && <span className="text-yellow-600 font-bold">请假 (消耗额度/扣课时)</span>}
                                                            {status === 'Injury' && <span className="text-red-600 font-bold">伤停 (不扣费)</span>}
                                                            {(status === 'Absent' || !status) && <span className="text-gray-400">未出席 / 缺席</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
                                                    <button 
                                                        onClick={() => setPlayerStatus(player.id, 'Present')}
                                                        className={`p-2 rounded-md transition-all flex items-center justify-center ${status === 'Present' ? 'bg-white shadow-sm text-green-600 ring-1 ring-green-100' : 'text-gray-400 hover:text-green-600 hover:bg-gray-200'}`}
                                                    >
                                                        <CheckCircle className="w-5 h-5" />
                                                    </button>
                                                    <button 
                                                        onClick={() => setPlayerStatus(player.id, 'Leave')}
                                                        className={`p-2 rounded-md transition-all flex items-center justify-center ${status === 'Leave' ? 'bg-white shadow-sm text-yellow-600 ring-1 ring-yellow-100' : 'text-gray-400 hover:text-yellow-600 hover:bg-gray-200'}`}
                                                    >
                                                        <Clock className="w-5 h-5" />
                                                    </button>
                                                    <button 
                                                        onClick={() => setPlayerStatus(player.id, 'Injury')}
                                                        className={`p-2 rounded-md transition-all flex items-center justify-center ${status === 'Injury' ? 'bg-white shadow-sm text-red-600 ring-1 ring-red-100' : 'text-gray-400 hover:text-red-600 hover:bg-gray-200'}`}
                                                    >
                                                        <AlertCircle className="w-5 h-5" />
                                                    </button>
                                                    <button 
                                                        onClick={() => setPlayerStatus(player.id, 'Absent')}
                                                        className={`p-2 rounded-md transition-all flex items-center justify-center ${status === 'Absent' ? 'bg-white shadow-sm text-gray-600 ring-1 ring-gray-200' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-200'}`}
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
                                          className="w-full h-32 p-3 border rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none text-sm resize-none bg-gray-50 focus:bg-white transition-colors disabled:opacity-70 disabled:bg-gray-100"
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
                                                  <Send className="w-3 h-3 mr-1" /> 提交日志
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
                                              className="w-full h-24 p-3 border rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none text-sm resize-none bg-gray-50 focus:bg-white transition-colors"
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
                      <div className="bg-gray-50 p-4 border-t flex justify-end">
                          <button 
                            onClick={handleForceSave} 
                            className="px-6 py-2 bg-bvb-black text-white font-bold rounded hover:bg-gray-800 transition-colors flex items-center"
                          >
                             {saveStatus === 'saved' ? <CheckCircle className="w-4 h-4 mr-2" /> : <RefreshCw className={`w-4 h-4 mr-2 ${saveStatus === 'saving' ? 'animate-spin' : ''}`} />}
                             保存考勤并更新
                          </button>
                      </div>
                  )}
                  {activeTab === 'log' && (
                      <div className="bg-gray-50 p-4 border-t flex justify-between items-center text-xs text-gray-400">
                           <span>日志状态: {logStatus}</span>
                           <button onClick={() => setSelectedSession(null)} className="font-bold hover:text-gray-600">关闭</button>
                      </div>
                  )}
              </div>
          </div>
      );
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <div>
           <h2 className="text-3xl font-black text-bvb-black uppercase">训练计划中心</h2>
           <p className="text-gray-500">规划日程，管理教案与考勤。</p>
        </div>
        <button 
            onClick={handleOpenAddModal}
            className="flex items-center px-4 py-2 bg-bvb-black text-white font-bold rounded-lg shadow-md hover:bg-gray-800 transition-colors"
        >
            <Plus className="w-5 h-5 mr-2 text-bvb-yellow" />
            新建计划
        </button>
      </div>

      {/* Main Layout Grid */}
      <div className="grid lg:grid-cols-3 gap-6 flex-1 min-h-0">
          
          {/* Left Column: Calendar/List (Span 2) */}
          <div className="lg:col-span-2 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full">
               {/* Controls Header */}
               <div className="flex flex-col md:flex-row items-center justify-between p-4 border-b border-gray-200 bg-white gap-3 shrink-0">
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setTimeScope('month')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${timeScope === 'month' ? 'bg-white text-bvb-black shadow-sm' : 'text-gray-500'}`}
                        >
                            月视图
                        </button>
                        <button 
                            onClick={() => setTimeScope('quarter')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${timeScope === 'quarter' ? 'bg-white text-bvb-black shadow-sm' : 'text-gray-500'}`}
                        >
                            季度
                        </button>
                         <button 
                            onClick={() => setTimeScope('year')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${timeScope === 'year' ? 'bg-white text-bvb-black shadow-sm' : 'text-gray-500'}`}
                        >
                            年度
                        </button>
                    </div>

                    <div className="flex items-center space-x-4">
                        <button onClick={() => handleNavigate('prev')} className="p-1 hover:bg-gray-100 rounded-full"><ChevronLeft className="w-6 h-6" /></button>
                        <h3 className="text-xl font-bold w-40 text-center">{dateLabel}</h3>
                        <button onClick={() => handleNavigate('next')} className="p-1 hover:bg-gray-100 rounded-full"><ChevronRight className="w-6 h-6" /></button>
                    </div>

                    <button 
                        onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date().toISOString().split('T')[0]); }} 
                        className="text-xs font-bold text-gray-500 hover:text-bvb-black border px-2 py-1 rounded"
                    >
                        回到今天
                    </button>
               </div>

               {/* View Content */}
               <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                   {timeScope === 'month' ? (
                       <>
                        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 shrink-0">
                            {['周日', '周一', '周二', '周三', '周四', '周五', '周六'].map(day => (
                                <div key={day} className="p-2 text-xs font-bold text-gray-500 uppercase text-center border-r last:border-r-0 border-gray-200">
                                    {day}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 flex-1">
                            {renderCalendar()}
                        </div>
                       </>
                   ) : (
                       renderPeriodList()
                   )}
               </div>
          </div>

          {/* Right Column: Statistics (Span 1) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden">
               <div className="p-4 border-b border-gray-200 shrink-0 bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center">
                        <PieChartIcon className="w-5 h-5 mr-2 text-bvb-yellow" />
                        训练主题分析
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">统计当前时段 ({dateLabel}) 的训练侧重点。</p>
               </div>
               
               <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                   {/* Summary Cards */}
                   <div className="grid grid-cols-2 gap-3 mb-6">
                       <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-center">
                           <span className="text-xs text-gray-400 font-bold uppercase block">总课时</span>
                           <span className="text-2xl font-black text-gray-800">{filteredSessions.length}</span>
                       </div>
                       <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-center">
                            <span className="text-xs text-gray-400 font-bold uppercase block">总时长</span>
                           <span className="text-xl font-black text-gray-800">
                               {Math.round(filteredSessions.reduce((acc, s) => acc + s.duration, 0) / 60)} <span className="text-xs text-gray-500 font-bold">小时</span>
                           </span>
                       </div>
                   </div>

                   {/* Pie Chart */}
                   <div className="h-64 relative mb-4">
                        {statsData.length > 0 ? (
                             <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={statsData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {statsData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                        itemStyle={{ fontWeight: 'bold' }}
                                    />
                                    <Legend 
                                        layout="horizontal" 
                                        verticalAlign="bottom" 
                                        align="center"
                                        iconSize={8}
                                        iconType="circle"
                                        wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '10px' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm">暂无数据</div>
                        )}
                        {/* Center Text */}
                        {statsData.length > 0 && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center">
                                    <span className="block text-3xl font-black text-bvb-black">{statsData.length}</span>
                                    <span className="block text-[10px] text-gray-400 font-bold uppercase">个主题</span>
                                </div>
                            </div>
                        )}
                   </div>

                   {/* List Details */}
                   <div className="space-y-2">
                       {statsData.sort((a,b) => b.value - a.value).map((item, idx) => (
                           <div key={item.name} className="flex items-center justify-between text-sm">
                               <div className="flex items-center">
                                   <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                   <span className="font-bold text-gray-700">{item.name}</span>
                               </div>
                               <div className="flex items-center">
                                    <span className="font-bold mr-2">{item.value} 节</span>
                                    <span className="text-xs text-gray-400">({Math.round((item.value / filteredSessions.length) * 100)}%)</span>
                               </div>
                           </div>
                       ))}
                   </div>

               </div>
          </div>
      </div>

      {/* --- Add Training Modal --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
             <div className="bg-bvb-black p-4 flex justify-between items-center text-white shrink-0">
                <h3 className="font-bold flex items-center">
                    <CalendarIcon className="w-5 h-5 mr-2 text-bvb-yellow" /> 
                    新建训练计划
                </h3>
                <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5" /></button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6">
                
                {/* Mode Toggle */}
                <div className="flex justify-center mb-6">
                    <div className="bg-gray-100 p-1 rounded-lg flex text-sm font-bold">
                        <button 
                            onClick={() => setIsAiMode(false)}
                            className={`px-4 py-2 rounded-md transition-colors ${!isAiMode ? 'bg-white shadow text-bvb-black' : 'text-gray-500'}`}
                        >
                            手动录入
                        </button>
                        <button 
                            onClick={() => setIsAiMode(true)}
                            className={`px-4 py-2 rounded-md transition-colors flex items-center ${isAiMode ? 'bg-white shadow text-bvb-black' : 'text-gray-500'}`}
                        >
                            <Cpu className="w-3 h-3 mr-1" /> AI 辅助生成
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">梯队</label>
                            <select 
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none"
                                value={formData.teamId}
                                onChange={e => setFormData({...formData, teamId: e.target.value})}
                            >
                                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">日期</label>
                            <input 
                                type="date"
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none"
                                value={formData.date}
                                onChange={e => setFormData({...formData, date: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">训练主题</label>
                            <select 
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none"
                                value={formData.focus}
                                onChange={e => setFormData({...formData, focus: e.target.value})}
                            >
                                <option value="运控球">运控球</option>
                                <option value="传接球">传接球</option>
                                <option value="射门">射门</option>
                                <option value="防守">防守</option>
                                <option value="Custom">自定义...</option>
                            </select>
                            {formData.focus === 'Custom' && (
                                <input 
                                    placeholder="输入主题..."
                                    className="w-full p-2 mt-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none text-sm"
                                    value={formData.focusCustom}
                                    onChange={e => setFormData({...formData, focusCustom: e.target.value})}
                                />
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">时长 (分钟)</label>
                            <input 
                                type="number"
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none"
                                value={formData.duration}
                                onChange={e => setFormData({...formData, duration: parseInt(e.target.value)})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">强度</label>
                            <select 
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none"
                                value={formData.intensity}
                                onChange={e => setFormData({...formData, intensity: e.target.value})}
                            >
                                <option value="Low">低</option>
                                <option value="Medium">中</option>
                                <option value="High">高</option>
                            </select>
                        </div>
                    </div>

                    {/* AI Generator Section */}
                    {isAiMode && (
                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                            <p className="text-sm text-yellow-800 mb-2 font-medium">配置好上方参数后，点击生成即可获得推荐教案。</p>
                            <button 
                                type="button" 
                                onClick={handleGenerate} 
                                disabled={loading}
                                className="w-full py-2 bg-bvb-yellow text-bvb-black font-bold rounded shadow-sm hover:brightness-105 flex justify-center items-center"
                            >
                                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <><Zap className="w-4 h-4 mr-2" /> 生成 AI 计划</>}
                            </button>
                        </div>
                    )}

                    {/* Drills Section (Manual or Result of AI) */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                            训练内容 (Drills)
                        </label>
                        
                        {/* Library Selector */}
                        {!isAiMode && (
                            <div className="mb-2">
                                <p className="text-xs text-gray-400 mb-1">从库中选择:</p>
                                <div className="flex flex-wrap gap-2">
                                    {drillLibrary?.map((drill, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => toggleDrill(drill)}
                                            className={`text-xs px-2 py-1 rounded border transition-colors ${
                                                formData.drills.includes(drill) 
                                                ? 'bg-bvb-black text-bvb-yellow border-bvb-black' 
                                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            {drill}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Title Input (Auto-filled by AI usually) */}
                        <input 
                            className="w-full p-2 border rounded mb-2 font-bold focus:ring-2 focus:ring-bvb-yellow outline-none"
                            placeholder="训练课标题 (如: 周二传控专项)"
                            value={formData.title}
                            onChange={e => setFormData({...formData, title: e.target.value})}
                            required
                        />

                        {/* Current Drill List */}
                        <div className="bg-gray-50 border rounded-lg p-2 min-h-[100px]">
                            {formData.drills.length === 0 && <p className="text-gray-400 text-sm italic p-2">暂无内容...</p>}
                            <ul className="space-y-1">
                                {formData.drills.map((drill, idx) => (
                                    <li key={idx} className="flex justify-between items-center bg-white p-2 rounded shadow-sm text-sm">
                                        <span>{idx + 1}. {drill}</span>
                                        <button type="button" onClick={() => setFormData(prev => ({...prev, drills: prev.drills.filter((_, i) => i !== idx)}))}>
                                            <X className="w-3 h-3 text-gray-400 hover:text-red-500" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Manual Add Input */}
                        {!isAiMode && (
                            <div className="flex mt-2">
                                <input 
                                    className="flex-1 p-2 border rounded-l focus:outline-none focus:border-bvb-yellow text-sm"
                                    placeholder="手动输入项目..."
                                    value={drillInput}
                                    onChange={e => setDrillInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addManualDrill())}
                                />
                                <button 
                                    type="button" 
                                    onClick={addManualDrill}
                                    className="px-3 bg-gray-200 text-gray-700 font-bold rounded-r hover:bg-gray-300"
                                >
                                    添加
                                </button>
                            </div>
                        )}
                    </div>

                    <button type="submit" className="w-full py-3 bg-bvb-black text-white font-bold rounded-lg hover:bg-gray-800 mt-4">
                        保存计划
                    </button>
                </form>
             </div>
          </div>
        </div>
      )}

      {/* Detail & Attendance & Log Modal */}
      <SessionDetailModal />

    </div>
  );
};

export default TrainingPlanner;
