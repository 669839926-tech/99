
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Player, Match, TrainingSession, Team, User, Announcement, FinanceTransaction } from '../types';
import { Users, Trophy, TrendingUp, AlertCircle, Calendar, Cake, Activity, Filter, ChevronDown, Download, Loader2, Megaphone, Plus, Trash2, X, AlertTriangle, Bell, Send, Lock, FileText, ClipboardCheck, ShieldAlert, Edit2, ArrowRight, User as UserIcon, Shirt, Clock, LayoutList, CheckCircle, Ban, Wallet, ArrowUpRight, ArrowDownRight, Sparkles, Share2, Camera, Medal, Target, Flame, FileDown, FileSpreadsheet, Quote, ShieldCheck, Type, PartyPopper, Gift, Star, Triangle, Pencil, UserMinus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LineChart, Line } from 'recharts';
import { exportToPDF } from '../services/pdfService';
import html2canvas from 'html2canvas';

interface DashboardProps {
  players: Player[];
  matches: Match[];
  trainings: TrainingSession[];
  teams: Team[];
  transactions?: FinanceTransaction[];
  announcements?: Announcement[];
  currentUser: User | null;
  onNavigate?: (tab: string, filter?: string) => void;
  onAddAnnouncement?: (announcement: Announcement) => void;
  onDeleteAnnouncement?: (id: string) => void;
  onUpdateAnnouncement?: (announcement: Announcement) => void;
  appLogo?: string;
}

type TimeRange = 'month' | 'quarter' | 'year' | 'custom';
type AnalysisView = 'player' | 'session';

const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
};

const Dashboard: React.FC<DashboardProps> = ({ 
    players, matches, trainings, teams, currentUser, onNavigate,
    announcements = [], transactions = [], onAddAnnouncement, onDeleteAnnouncement, onUpdateAnnouncement, appLogo
}) => {
  const [attendanceRange, setAttendanceRange] = useState<TimeRange>('month');
  const [attendanceYear, setAttendanceYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedQuarter, setSelectedQuarter] = useState<number>(Math.floor(new Date().getMonth() / 3));
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
      const d = new Date();
      d.setDate(1); 
      return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [attendanceTeamId, setAttendanceTeamId] = useState<string>('all');
  const [attendancePlayerId, setAttendancePlayerId] = useState<string>('all');
  const [analysisView, setAnalysisView] = useState<AnalysisView>('player');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingCredits, setIsExportingCredits] = useState(false);
  const [selectedBirthdayPlayer, setSelectedBirthdayPlayer] = useState<any | null>(null);
  const [birthdayMessage, setBirthdayMessage] = useState('祝你生日快乐！在绿茵场上继续追逐梦想，勇敢闪耀！');
  const [isCapturingCard, setIsCapturingCard] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [creditAlertTeamId, setCreditAlertTeamId] = useState<string>('all');
  
  const isDirector = currentUser?.role === 'director';
  const isCoach = currentUser?.role === 'coach';

  const managedTeamIds = useMemo(() => {
      if (isDirector) return teams.map(t => t.id);
      return currentUser?.teamIds || [];
  }, [isDirector, currentUser, teams]);

  const displayTeams = useMemo(() => {
      if (isDirector) return teams;
      return teams.filter(t => managedTeamIds.includes(t.id));
  }, [teams, isDirector, managedTeamIds]);

  const displayPlayers = useMemo(() => {
      if (isDirector) return players;
      return players.filter(p => managedTeamIds.includes(p.teamId));
  }, [players, isDirector, managedTeamIds]);

  const displayTrainings = useMemo(() => {
      if (isDirector) return trainings;
      return trainings.filter(t => managedTeamIds.includes(t.teamId));
  }, [trainings, isDirector, managedTeamIds]);

  const [showAnnounceForm, setShowAnnounceForm] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', type: 'info' as 'info' | 'urgent' });

  const pendingTasks = useMemo(() => {
    const reviews = displayPlayers.reduce((acc, p) => acc + (p.reviews?.filter(r => r.status === 'Submitted').length || 0), 0);
    const stats = displayPlayers.filter(p => p.statsStatus === 'Submitted').length;
    const logs = displayTrainings.filter(t => t.submissionStatus === 'Submitted').length;
    return { reviews, stats, logs, total: reviews + stats + logs };
  }, [displayPlayers, displayTrainings]);

  const unreadReviews = useMemo(() => {
    if (isDirector) return [];
    return displayTrainings.filter(t => t.submissionStatus === 'Reviewed' && !t.isReviewRead);
  }, [displayTrainings, isDirector]);

  const dateRange = useMemo(() => {
    let start = new Date(attendanceYear, 0, 1);
    let end = new Date(attendanceYear, 11, 31, 23, 59, 59);
    if (attendanceRange === 'month') {
        start = new Date(attendanceYear, selectedMonth, 1);
        end = new Date(attendanceYear, selectedMonth + 1, 0, 23, 59, 59);
    } else if (attendanceRange === 'quarter') {
        start = new Date(attendanceYear, selectedQuarter * 3, 1);
        end = new Date(attendanceYear, (selectedQuarter * 3) + 3, 0, 23, 59, 59);
    } else if (attendanceRange === 'custom') {
        start = parseLocalDate(customStartDate);
        end = parseLocalDate(customEndDate);
        end.setHours(23, 59, 59, 999);
    }
    return { start, end };
  }, [attendanceRange, attendanceYear, selectedMonth, selectedQuarter, customStartDate, customEndDate]);

  useEffect(() => {
      setAttendancePlayerId('all');
      setSelectedSessionId(null);
  }, [attendanceTeamId, attendanceRange, selectedMonth, selectedQuarter, attendanceYear]);

  const handleLowCreditPlayerClick = (player: Player) => {
      setAttendancePlayerId(player.id);
      const lastRecharge = player.rechargeHistory && player.rechargeHistory.length > 0
          ? [...player.rechargeHistory].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
          : null;
      if (lastRecharge) { setCustomStartDate(lastRecharge.date); } 
      else if (player.joinDate) { setCustomStartDate(player.joinDate); } 
      else { const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1); setCustomStartDate(monthAgo.toISOString().split('T')[0]); }
      setCustomEndDate(new Date().toISOString().split('T')[0]);
      setAttendanceRange('custom');
      document.getElementById('attendance-analysis-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const upcomingBirthdays = displayPlayers.filter(p => {
        if (!p.birthDate) return false;
        const [y, m, d] = p.birthDate.split('-').map(Number);
        if(!y || !m || !d) return false;
        let nextBirthday = new Date(today.getFullYear(), m - 1, d);
        if (nextBirthday < today) { nextBirthday.setFullYear(today.getFullYear() + 1); }
        const diffTime = nextBirthday.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 7;
    }).map(p => {
        const [y, m, d] = p.birthDate.split('-').map(Number);
        const todayYear = new Date().getFullYear();
        const nextBirthday = new Date(todayYear, m - 1, d);
        if(nextBirthday < today) nextBirthday.setFullYear(todayYear + 1);
        const diffTime = nextBirthday.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const monthDay = `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const turningAge = todayYear - y;
        return { ...p, daysUntil: diffDays, monthDay, turningAge };
    }).sort((a,b) => a.daysUntil - b.daysUntil);

    const lowCreditPlayers = displayPlayers
        .filter(p => p.credits <= 2)
        .filter(p => p.teamId !== 'unassigned') 
        .filter(p => creditAlertTeamId === 'all' || p.teamId === creditAlertTeamId)
        .sort((a,b) => a.credits - b.credits);

    const teamCounts = displayTeams.map(t => ({ id: t.id, name: t.name, count: displayPlayers.filter(p => p.teamId === t.id).length }));
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyTransactions = transactions.filter(t => {
        const d = new Date(t.date);
        return !isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const monthlyIncome = monthlyTransactions.reduce((s, t) => s + (Number(t.income) || 0), 0);
    const monthlyExpense = monthlyTransactions.reduce((s, t) => s + (Number(t.expense) || 0), 0);

    return { 
        nextMatch: matches.find(m => m.status === 'Upcoming'), 
        totalPlayers: displayPlayers.filter(p => p.teamId !== 'unassigned').length, 
        upcomingBirthdays, 
        lowCreditPlayers, 
        teamCounts, 
        finance: { income: monthlyIncome, expense: monthlyExpense, profit: monthlyIncome - monthlyExpense } 
    };
  }, [displayPlayers, displayTeams, transactions, matches, creditAlertTeamId]);

  const { chartData, exportPlayersData, exportSessionsData, teamPlayersList } = useMemo(() => {
    const start = dateRange.start;
    const end = dateRange.end;
    const filteredSessions = (displayTrainings || []).filter(s => {
        const d = parseLocalDate(s.date);
        return d >= start && d <= end && (attendanceTeamId === 'all' || s.teamId === attendanceTeamId);
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const teamPlayers = displayPlayers.filter(p => attendanceTeamId === 'all' || p.teamId === attendanceTeamId);
    if (filteredSessions.length === 0) return { chartData: [], averageRate: 0, exportPlayersData: [], exportSessionsData: [], teamPlayersList: teamPlayers };
    
    let data: any[] = [];
    let grandTotalRate = 0;
    let grandTotalCount = 0;

    if (analysisView === 'session') {
        data = filteredSessions.map(s => {
             const potentialCount = displayPlayers.filter(p => p.teamId === s.teamId).length;
             const presentCount = s.attendance?.filter(r => r.status === 'Present').length || 0;
             const rate = potentialCount > 0 ? Math.round((presentCount / potentialCount) * 100) : 0;
             grandTotalRate += rate; grandTotalCount++;
             const d = parseLocalDate(s.date);
             return { name: `${d.getMonth() + 1}/${d.getDate()}`, rate, fullDate: s.date, title: s.title, id: s.id };
        });
    } else {
        const groupedData: Record<string, { totalRate: number; count: number }> = {};
        filteredSessions.forEach(session => {
            const date = parseLocalDate(session.date);
            let key = attendanceRange === 'year' ? `${date.getMonth() + 1}月` : `${date.getMonth() + 1}月W${Math.ceil(date.getDate() / 7)}`;
            const sessionTeamPlayersCount = displayPlayers.filter(p => p.teamId === session.teamId).length;
            const presentCount = session.attendance?.filter(r => r.status === 'Present').length || 0;
            const rate = sessionTeamPlayersCount > 0 ? (presentCount / sessionTeamPlayersCount) * 100 : 0;
            if (!groupedData[key]) groupedData[key] = { totalRate: 0, count: 0 };
            groupedData[key].totalRate += rate; groupedData[key].count += 1;
            grandTotalRate += rate; grandTotalCount++;
        });
        data = Object.keys(groupedData).map(key => ({ name: key, rate: Math.round(groupedData[key].totalRate / groupedData[key].count) }));
    }

    const exportList = teamPlayers.map(p => {
         const pSessions = filteredSessions.filter(t => t.teamId === p.teamId);
         const pPresent = pSessions.filter(t => t.attendance?.some(r => r.playerId === p.id && r.status === 'Present')).length;
         const pLeave = pSessions.filter(t => t.attendance?.some(r => r.playerId === p.id && r.status === 'Leave')).length;
         const pInjury = pSessions.filter(t => t.attendance?.some(r => r.playerId === p.id && r.status === 'Injury')).length;
         const pAbsent = pSessions.filter(t => t.attendance?.some(r => r.playerId === p.id && r.status === 'Absent')).length;
         const pNoRecord = pSessions.filter(t => !t.attendance?.some(r => r.playerId === p.id)).length;
         const rate = pSessions.length > 0 ? Math.round((pPresent / pSessions.length) * 100) : 0;
         return { ...p, present: pPresent, leave: pLeave, injury: pInjury, absent: pAbsent + pNoRecord, total: pSessions.length, rate };
    }).sort((a,b) => b.rate - a.rate);

    const exportSessions = filteredSessions.map(s => {
         const sTeamPlayers = displayPlayers.filter(p => p.teamId === s.teamId);
         const total = sTeamPlayers.length;
         const present = s.attendance?.filter(r => r.status === 'Present').length || 0;
         const leave = s.attendance?.filter(r => r.status === 'Leave').length || 0;
         const injury = s.attendance?.filter(r => r.status === 'Injury').length || 0;
         const absentRecords = s.attendance?.filter(r => r.status === 'Absent').length || 0;
         const noRecords = total - (present + leave + injury + absentRecords);
         return { id: s.id, date: s.date, title: s.title, focus: s.focus, teamName: teams.find(t => t.id === s.teamId)?.name || '未知', total, present, leave, injury, absent: absentRecords + noRecords, rate: total > 0 ? Math.round((present / total) * 100) : 0 };
    });

    return { chartData: data, averageRate: grandTotalCount > 0 ? Math.round(grandTotalRate / grandTotalCount) : 0, exportPlayersData: exportList, exportSessionsData: exportSessions, teamPlayersList: teamPlayers };
  }, [displayTrainings, displayPlayers, dateRange, attendanceRange, attendanceTeamId, analysisView, teams]);

  const individualReport = useMemo(() => {
      if (attendancePlayerId === 'all') return null;
      const player = displayPlayers.find(p => p.id === attendancePlayerId);
      if (!player) return null;
      const start = dateRange.start;
      const end = dateRange.end;
      const sessionRecords = displayTrainings.filter(s => {
          const d = parseLocalDate(s.date);
          return d >= start && d <= end && s.teamId === player.teamId;
      }).map(s => {
          const record = s.attendance?.find(r => r.playerId === player.id);
          return { id: s.id, date: s.date, title: s.title, focus: s.focus, status: record?.status || 'Absent', teamName: teams.find(t => t.id === s.teamId)?.name || '' };
      });
      const present = sessionRecords.filter(r => r.status === 'Present').length;
      const leave = sessionRecords.filter(r => r.status === 'Leave').length;
      const injury = sessionRecords.filter(r => r.status === 'Injury').length;
      const absent = sessionRecords.filter(r => r.status === 'Absent').length;
      
      return { 
          player, 
          sessions: sessionRecords, 
          stats: { 
              total: sessionRecords.length, 
              present, 
              leave, 
              injury, 
              absent, 
              rate: sessionRecords.length > 0 ? Math.round((present / sessionRecords.length) * 100) : 0 
          } 
      };
  }, [attendancePlayerId, displayTrainings, displayPlayers, dateRange, teams]);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
        if (attendancePlayerId !== 'all' && individualReport) {
            await exportToPDF('individual-attendance-export', `个人出勤_${individualReport.player.name}_${attendanceYear}`);
        } else {
            await exportToPDF('attendance-report-export', `训练出勤分析报告_${attendanceYear}`);
        }
    } catch (e) { alert('导出失败'); } finally { setIsExporting(false); }
  };

  const handleExportExcel = () => {
      setIsExportingExcel(true);
      try {
          let headers = ""; let rows = ""; let fileName = "";
          if (attendancePlayerId !== 'all' && individualReport) {
              headers = "日期,训练主题,所属梯队,出勤状态\n";
              rows = individualReport.sessions.map(s => {
                  const statusMap = { 'Present': '实到', 'Leave': '请假', 'Injury': '伤停', 'Absent': '缺席' };
                  return `${s.date},"${s.title.replace(/"/g, '""')}",${s.teamName},${statusMap[s.status] || '缺席'}`;
              }).join('\n');
              fileName = `个人出勤明细_${individualReport.player.name}_${attendanceYear}.csv`;
          } else if (analysisView === 'player') {
              headers = "姓名,球衣号码,所属梯队,总场,实到,请假,伤停,缺席,出勤率(%),当前余额\n";
              rows = exportPlayersData.map(p => `${p.name},${p.number},${teams.find(t => t.id === p.teamId)?.name},${p.total},${p.present},${p.leave},${p.injury},${p.absent},${p.rate},${p.credits}`).join('\n');
              fileName = `全员出勤统计_${attendanceYear}.csv`;
          }
          const blob = new Blob(["\ufeff" + headers + rows], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = fileName; link.click();
      } catch (e) { alert('Excel 导出失败'); } finally { setIsExportingExcel(false); }
  };

  const handleExportCreditsPDF = async () => {
    setIsExportingCredits(true);
    try { await exportToPDF('low-credits-export', `课时余额预警名单`); } catch (e) { alert('导出失败'); } finally { setIsExportingCredits(false); }
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-6">
      <div id="dashboard-content" className="space-y-6 md:space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end bg-bvb-yellow rounded-2xl p-4 md:p-6 shadow-lg relative overflow-hidden">
           <div className="relative z-10">
              <h2 className="text-2xl md:text-4xl font-black text-bvb-black uppercase tracking-tighter mb-1 md:mb-2 italic">俱乐部概览</h2>
              <p className="text-[11px] md:text-sm text-bvb-black font-bold opacity-80">欢迎，{currentUser?.name || '教练'}。当前正式在册球员统计：</p>
           </div>
           <div className="relative z-10 mt-4 md:mt-0 flex gap-3 md:gap-4 text-center">
                <div className="bg-white/90 backdrop-blur-sm p-2.5 md:p-3 rounded-xl shadow-sm border border-black/5 flex-1 md:flex-none min-w-[80px]">
                    <div className="text-[9px] md:text-xs font-black text-gray-400 uppercase tracking-widest">在册球员</div>
                    <div className="text-xl md:text-2xl font-black text-bvb-black leading-none mt-1">{stats.totalPlayers}</div>
                </div>
                 <div className="bg-white/90 backdrop-blur-sm p-2.5 md:p-3 rounded-xl shadow-sm border border-black/5 flex-1 md:flex-none">
                    <div className="text-[9px] md:text-xs font-black text-gray-400 uppercase tracking-widest">下场对手</div>
                    <div className="text-xs md:text-sm font-black text-bvb-black max-w-[100px] truncate leading-none mt-1.5">{stats.nextMatch ? stats.nextMatch.opponent : '无安排'}</div>
                </div>
           </div>
           <Trophy className="absolute -right-6 -bottom-6 w-32 md:w-48 h-32 md:h-48 text-white/20 rotate-12 pointer-events-none" />
        </div>

        {/* Attendance Analysis Section */}
        <div id="attendance-analysis-section" className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6 flex flex-col scroll-mt-20">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4 border-b border-gray-100 pb-4">
                <div>
                    <h3 className="text-base md:text-xl font-black text-gray-800 flex items-center italic uppercase tracking-tighter"><Activity className="w-5 h-5 md:w-6 md:h-6 mr-1.5 md:mr-2 text-bvb-yellow" /> 训练出勤分析报告</h3>
                </div>
                <div className="flex flex-wrap gap-2 items-center justify-end w-full lg:w-auto">
                    <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner shrink-0">
                        <button onClick={() => setAnalysisView('player')} className={`px-2.5 md:px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-black transition-all ${analysisView === 'player' ? 'bg-white shadow text-bvb-black' : 'text-gray-500'}`}><Users className="w-3 h-3 mr-1" /> 球员</button>
                        <button onClick={() => setAnalysisView('session')} className={`px-2.5 md:px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-black transition-all ${analysisView === 'session' ? 'bg-white shadow text-bvb-black' : 'text-gray-500'}`}><LayoutList className="w-3 h-3 mr-1" /> 课次</button>
                    </div>
                    
                    {/* 过滤器容器 */}
                    <div className="flex flex-wrap items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100 overflow-visible">
                        {/* 范围选择 */}
                        <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1">
                            <select value={attendanceRange} onChange={e => setAttendanceRange(e.target.value as any)} className="text-[10px] md:text-xs font-black outline-none border-none focus:ring-0 bg-transparent py-0.5">
                                <option value="month">按月</option>
                                <option value="quarter">季度</option>
                                <option value="year">年度</option>
                                <option value="custom">自选</option>
                            </select>
                        </div>

                        {/* 根据范围显示的具体时间选择器 */}
                        <div className="flex items-center gap-1.5 animate-in slide-in-from-right-2 duration-300">
                            {attendanceRange === 'month' && (
                                <div className="flex items-center gap-1">
                                    <select value={attendanceYear} onChange={e => setAttendanceYear(parseInt(e.target.value))} className="text-[10px] md:text-xs font-black border border-gray-200 rounded-lg py-1 px-1.5 bg-white">
                                        {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}年</option>)}
                                    </select>
                                    <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="text-[10px] md:text-xs font-black border border-gray-200 rounded-lg py-1 px-1.5 bg-white">
                                        {Array.from({length: 12}, (_, i) => <option key={i} value={i}>{i+1}月</option>)}
                                    </select>
                                </div>
                            )}
                            {attendanceRange === 'quarter' && (
                                <div className="flex items-center gap-1">
                                    <select value={attendanceYear} onChange={e => setAttendanceYear(parseInt(e.target.value))} className="text-[10px] md:text-xs font-black border border-gray-200 rounded-lg py-1 px-1.5 bg-white">
                                        {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}年</option>)}
                                    </select>
                                    <select value={selectedQuarter} onChange={e => setSelectedQuarter(parseInt(e.target.value))} className="text-[10px] md:text-xs font-black border border-gray-200 rounded-lg py-1 px-1.5 bg-white">
                                        <option value={0}>第一季度 Q1</option>
                                        <option value={1}>第二季度 Q2</option>
                                        <option value={2}>第三季度 Q3</option>
                                        <option value={3}>第四季度 Q4</option>
                                    </select>
                                </div>
                            )}
                            {attendanceRange === 'year' && (
                                <select value={attendanceYear} onChange={e => setAttendanceYear(parseInt(e.target.value))} className="text-[10px] md:text-xs font-black border border-gray-200 rounded-lg py-1 px-1.5 bg-white">
                                    {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}年</option>)}
                                </select>
                            )}
                            {attendanceRange === 'custom' && (
                                <div className="flex items-center gap-1">
                                    <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="text-[10px] md:text-xs font-bold border border-gray-200 rounded-lg py-1 px-1.5 bg-white focus:ring-1 focus:ring-bvb-yellow" />
                                    <span className="text-[10px] text-gray-400 font-bold">至</span>
                                    <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="text-[10px] md:text-xs font-bold border border-gray-200 rounded-lg py-1 px-1.5 bg-white focus:ring-1 focus:ring-bvb-yellow" />
                                </div>
                            )}
                        </div>

                        <div className="h-4 w-px bg-gray-200 mx-1"></div>

                        {/* 梯队与球员过滤 */}
                        <select value={attendanceTeamId} onChange={e => setAttendanceTeamId(e.target.value)} className="text-[10px] md:text-xs p-1.5 bg-white border border-gray-200 rounded-lg font-black max-w-[80px] md:max-w-none">
                            <option value="all">所有梯队</option>{displayTeams.map(t => <option key={t.id} value={t.id}>{t.level}</option>)}
                        </select>
                        <select value={attendancePlayerId} onChange={e => setAttendancePlayerId(e.target.value)} className="text-[10px] md:text-xs p-1.5 bg-white border border-gray-200 rounded-lg font-black max-w-[80px] md:max-w-[100px]">
                            <option value="all">全体球员</option>{teamPlayersList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>

                        {/* 导出按钮 */}
                        <div className="flex gap-1 ml-1">
                            <button onClick={handleExportExcel} disabled={isExportingExcel} className="p-1.5 md:p-2 bg-green-600 text-white rounded-lg shadow-lg hover:brightness-110 disabled:opacity-50"><FileSpreadsheet className="w-3.5 h-3.5"/></button>
                            <button onClick={handleExportPDF} disabled={isExporting} className="p-1.5 md:p-2 bg-bvb-black text-bvb-yellow rounded-lg shadow-lg hover:brightness-110 disabled:opacity-50"><Download className="w-3.5 h-3.5"/></button>
                        </div>
                    </div>
                </div>
            </div>

            {attendancePlayerId !== 'all' && individualReport ? (
                <div id="individual-attendance-export" className="space-y-4 md:space-y-6 animate-in fade-in bg-white rounded-xl">
                    <div className="bg-gray-50 rounded-2xl p-4 md:p-6 flex flex-col md:flex-row justify-between items-center border border-gray-100 shadow-inner gap-4">
                        <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
                            <img src={individualReport.player.image} className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-4 border-white shadow-sm" />
                            <div><h3 className="text-lg md:text-2xl font-black text-gray-800">{individualReport.player.name}</h3><p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-wider">#{individualReport.player.number} • {individualReport.player.position}</p></div>
                        </div>
                        <div className="grid grid-cols-3 md:grid-cols-5 gap-2 md:gap-4 text-center w-full md:w-auto">
                            <div className="bg-white p-2 rounded-xl border border-gray-100 min-w-[70px]">
                                <div className="text-[8px] md:text-[9px] text-gray-400 font-black uppercase mb-0.5">参训率</div>
                                <div className="text-base md:text-xl font-black tabular-nums">{individualReport.stats.rate}%</div>
                            </div>
                            <div className="bg-white p-2 rounded-xl border border-green-100 min-w-[70px]">
                                <div className="text-[8px] md:text-[9px] text-green-500 font-black uppercase mb-0.5">实到</div>
                                <div className="text-base md:text-xl font-black text-green-600 tabular-nums">{individualReport.stats.present}</div>
                            </div>
                            <div className="bg-white p-2 rounded-xl border border-yellow-100 min-w-[70px]">
                                <div className="text-[8px] md:text-[9px] text-yellow-500 font-black uppercase mb-0.5">请假</div>
                                <div className="text-base md:text-xl font-black text-yellow-600 tabular-nums">{individualReport.stats.leave}</div>
                            </div>
                            <div className="bg-white p-2 rounded-xl border border-red-100 min-w-[70px]">
                                <div className="text-[8px] md:text-[9px] text-red-500 font-black uppercase mb-0.5">伤停</div>
                                <div className="text-base md:text-xl font-black text-red-600 tabular-nums">{individualReport.stats.injury}</div>
                            </div>
                            <div className="bg-white p-2 rounded-xl border border-gray-200 min-w-[70px]">
                                <div className="text-[8px] md:text-[9px] text-gray-400 font-black uppercase mb-0.5">缺席</div>
                                <div className="text-base md:text-xl font-black text-gray-400 tabular-nums">{individualReport.stats.absent}</div>
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm max-h-[500px]">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 font-black text-gray-500 text-[9px] md:text-xs uppercase sticky top-0 z-10 border-b">
                                <tr><th className="px-4 py-3">日期</th><th className="px-4 py-3">训练主题</th><th className="px-4 py-3 text-center">状态</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {individualReport.sessions.map(s => (
                                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 font-mono text-[9px] md:text-xs text-gray-400 whitespace-nowrap">{s.date}</td>
                                        <td className="px-4 py-3 font-black text-gray-700 text-[11px] md:text-sm">{s.title}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[9px] md:text-[10px] font-black uppercase border ${
                                                s.status === 'Present' ? 'bg-green-50 text-green-700 border-green-200' :
                                                s.status === 'Leave' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                s.status === 'Injury' ? 'bg-red-50 text-red-700 border-red-200' :
                                                'bg-gray-50 text-gray-400 border-gray-200'
                                            }`}>
                                                {s.status === 'Present' ? '实到' : s.status === 'Leave' ? '请假' : s.status === 'Injury' ? '伤停' : '缺席'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div id="attendance-report-export" className="space-y-6">
                    <div className="h-48 md:h-64 w-full bg-gray-50/50 rounded-2xl p-2">
                        <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" /><XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 'bold' }} /><YAxis unit="%" tick={{ fontSize: 8 }} /><Tooltip contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '11px' }} /><Bar dataKey="rate" fill="#FDE100" radius={[4, 4, 0, 0]} maxBarSize={30}/></BarChart></ResponsiveContainer>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 font-black text-[9px] md:text-[10px] uppercase text-gray-500 border-b">
                                <tr><th className="px-3 py-3">球员</th><th className="px-2 py-3">总场</th><th className="px-3 py-3">出勤率</th><th className="text-center text-green-600 px-1">到</th><th className="text-center text-yellow-600 px-1">假</th><th className="text-center text-red-600 px-1">伤</th><th className="text-center text-gray-400 px-1">缺</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {exportPlayersData.map(p => (
                                    <tr key={p.id} className="hover:bg-gray-50 transition-colors text-[10px] md:text-sm">
                                        <td className="px-3 py-3 font-black text-gray-800">{p.name}</td>
                                        <td className="px-2 py-3 font-mono text-gray-400">{p.total}</td>
                                        <td className="px-3 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-12 md:w-20 h-1 md:h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-bvb-black" style={{ width: `${p.rate}%` }}></div></div>
                                                <span className="text-[9px] md:text-[10px] font-black">{p.rate}%</span>
                                            </div>
                                        </td>
                                        <td className="text-center font-black text-green-600 px-1">{p.present}</td>
                                        <td className="text-center font-black text-yellow-600 px-1">{p.leave}</td>
                                        <td className="text-center font-black text-red-600 px-1">{p.injury}</td>
                                        <td className="text-center font-black text-gray-300 px-1">{p.absent}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Birthday Card Customizer Modal */}
      {selectedBirthdayPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white md:rounded-3xl shadow-2xl w-full md:max-w-5xl overflow-hidden flex flex-col md:flex-row h-full md:h-[500px]">
                {/* Left: Card Preview Container */}
                <div className="flex-1 bg-[#1a1a1a] p-4 md:p-8 flex items-center justify-center overflow-hidden relative shrink-0">
                    <div 
                        ref={cardRef}
                        className="w-[420px] h-[280px] md:w-[580px] md:h-[360px] bg-bvb-black relative overflow-hidden shadow-2xl flex flex-row p-0 text-white shrink-0"
                        style={{ border: '10px solid #FDE100', backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(253, 225, 0, 0.05) 1px, transparent 0)', backgroundSize: '24px 24px' }}
                    >
                        <div className="absolute top-0 left-0 text-bvb-yellow/20">
                            <PartyPopper className="w-16 h-16 rotate-[-15deg]" />
                        </div>
                        <div className="absolute bottom-0 right-0 text-bvb-yellow/20">
                            <PartyPopper className="w-16 h-16 rotate-[165deg]" />
                        </div>

                        <div className="w-[42%] flex flex-col items-center justify-center border-r border-white/10 p-4 relative z-10">
                            <div className="absolute top-3 left-4 flex items-center gap-2">
                                <div className="bg-white p-0.5 rounded shadow-sm">
                                    <img src={appLogo} className="w-5 h-5 object-contain" crossOrigin="anonymous" />
                                </div>
                                <span className="font-black text-[8px] text-bvb-yellow tracking-tighter uppercase">WSZG ACADEMY</span>
                            </div>
                            <div className="text-center mb-4">
                                <div className="flex justify-center gap-1.5 mb-0.5">
                                    <Star className="w-2.5 h-2.5 text-bvb-yellow fill-current" />
                                    <Star className="w-2.5 h-2.5 text-bvb-yellow fill-current" />
                                </div>
                                <h3 className="text-4xl md:text-5xl font-black italic text-bvb-yellow tracking-tighter uppercase leading-none drop-shadow-lg">HAPPY</h3>
                                <h3 className="text-xl md:text-2xl font-black italic text-white tracking-[0.25em] uppercase mt-0.5 drop-shadow-md">BIRTHDAY</h3>
                            </div>
                            <div className="relative">
                                <div className="absolute -top-6 -left-1 z-30 transform -rotate-12 scale-75">
                                    <Triangle className="w-12 h-12 text-bvb-yellow fill-current stroke-bvb-black stroke-[2px]" />
                                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full border border-bvb-black shadow-sm"></div>
                                </div>
                                <div className="w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden border-4 border-white shadow-[0_0_25px_rgba(253,225,0,0.3)] relative bg-gray-800 ring-2 ring-bvb-yellow">
                                    <img src={selectedBirthdayPlayer.image} className="w-full h-full object-cover" crossOrigin="anonymous" />
                                </div>
                            </div>
                        </div>

                        <div className="w-[58%] flex flex-col justify-center p-6 md:p-8 relative z-10 bg-gradient-to-br from-transparent to-white/5">
                            <div className="mb-4 flex justify-start">
                                <div className="bg-bvb-yellow px-4 py-1.5 rounded-full shadow-lg flex items-center gap-3 border-2 border-bvb-black transform -rotate-1">
                                    <span className="text-sm md:text-lg font-black text-bvb-black uppercase tracking-tight">{selectedBirthdayPlayer.name}</span>
                                    <div className="w-1 h-3 bg-bvb-black/20 rounded-full"></div>
                                    <span className="text-xs md:text-base font-black text-bvb-black">{selectedBirthdayPlayer.turningAge}岁</span>
                                </div>
                            </div>
                            <div className="relative flex-1 flex flex-col justify-center px-1">
                                <Quote className="absolute -top-4 -left-3 w-8 h-8 text-bvb-yellow/10" />
                                <Sparkles className="absolute top-0 right-0 w-4 h-4 text-bvb-yellow/20 animate-pulse" />
                                <p className="text-lg md:text-2xl font-black italic text-bvb-yellow leading-relaxed drop-shadow-sm">
                                    "{birthdayMessage}"
                                </p>
                            </div>
                            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                                <div className="flex items-center gap-2">
                                    <Cake className="w-4 h-4 text-bvb-yellow" />
                                    <span className="text-[10px] font-black text-white font-mono">{selectedBirthdayPlayer.monthDay}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Controls Panel */}
                <div className="w-full md:w-80 p-6 flex flex-col bg-white shrink-0 border-l border-gray-100 overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-black text-gray-800 flex items-center gap-2 uppercase tracking-tighter">
                            <Edit2 className="w-4 h-4 text-bvb-yellow" /> 贺卡定制
                        </h3>
                        <button onClick={() => setSelectedBirthdayPlayer(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="flex-1 space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">编辑祝福语</label>
                            <textarea 
                                className="w-full h-24 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-bvb-yellow outline-none transition-all leading-relaxed"
                                value={birthdayMessage}
                                onChange={e => setBirthdayMessage(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">推荐模板</label>
                            {[
                                { label: '温情鼓励', text: '祝你生日快乐！在绿茵场上继续追逐梦想，勇敢闪耀！' },
                                { label: '竞技核心', text: '新的一岁，愿你带球如风，射门如箭！生日快乐，场上MVP！' },
                                { label: '成长愿景', text: '愿你保持对足球的热爱，勤奋训练，成为更好的自己。生日快乐！' }
                            ].map((tpl, i) => (
                                <button key={i} onClick={() => setBirthdayMessage(tpl.text)} className={`w-full text-left p-2.5 rounded-lg border text-[10px] font-bold transition-all ${birthdayMessage === tpl.text ? 'bg-bvb-black text-bvb-yellow border-bvb-black shadow-md' : 'bg-white border-gray-100 text-gray-500'}`}>{tpl.label}</button>
                            ))}
                        </div>
                    </div>
                    <div className="pt-5 mt-5 border-t border-gray-100">
                        <button 
                            onClick={async () => {
                                if (!cardRef.current) return;
                                setIsCapturingCard(true);
                                try {
                                    const canvas = await html2canvas(cardRef.current, { useCORS: true, scale: 3, backgroundColor: '#000000' });
                                    const link = document.createElement('a');
                                    link.download = `生日贺卡_${selectedBirthdayPlayer.name}.png`;
                                    link.href = canvas.toDataURL('image/png');
                                    link.click();
                                } catch (e) { alert('生成失败'); } finally { setIsCapturingCard(false); }
                            }}
                            disabled={isCapturingCard}
                            className="w-full py-3.5 bg-bvb-black text-white font-black rounded-xl shadow-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2 uppercase italic text-xs tracking-widest disabled:opacity-50"
                        >
                            {isCapturingCard ? <Loader2 className="w-4 h-4 animate-spin text-bvb-yellow" /> : <Download className="w-4 h-4 text-bvb-yellow" />} 生成并下载
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
