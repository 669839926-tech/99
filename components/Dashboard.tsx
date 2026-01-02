
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Player, Match, TrainingSession, Team, User, Announcement, FinanceTransaction } from '../types';
import { Users, Trophy, TrendingUp, AlertCircle, Calendar, Cake, Activity, Filter, ChevronDown, Download, Loader2, Megaphone, Plus, Trash2, X, AlertTriangle, Bell, Send, Lock, FileText, ClipboardCheck, ShieldAlert, Edit2, ArrowRight, User as UserIcon, Shirt, Clock, LayoutList, CheckCircle, Ban, Wallet, ArrowUpRight, ArrowDownRight, Sparkles, Share2, Camera, Medal, Target, Flame, FileDown, FileSpreadsheet } from 'lucide-react';
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

// 辅助函数：修复 JS new Date(str) 在不同浏览器和时区下的解析偏差
const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
};

const Dashboard: React.FC<DashboardProps> = ({ 
    players, matches, trainings, teams, currentUser, onNavigate,
    announcements = [], transactions = [], onAddAnnouncement, onDeleteAnnouncement, onUpdateAnnouncement, appLogo
}) => {
  // Date Range State
  const [attendanceRange, setAttendanceRange] = useState<TimeRange>('month');
  const [attendanceYear, setAttendanceYear] = useState<number>(new Date().getFullYear());
  
  // 具体的月/季选择状态
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
  
  // Credit Alert Filter
  const [creditAlertTeamId, setCreditAlertTeamId] = useState<string>('all');
  
  // Permission check
  const isDirector = currentUser?.role === 'director';

  // --- Filter Data for Coaches ---
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

  // Comment: Calculate pending tasks for director approval
  const pendingTasks = useMemo(() => {
    const reviews = displayPlayers.reduce((acc, p) => acc + (p.reviews?.filter(r => r.status === 'Submitted').length || 0), 0);
    const stats = displayPlayers.filter(p => p.statsStatus === 'Submitted').length;
    const logs = displayTrainings.filter(t => t.submissionStatus === 'Submitted').length;
    return {
      reviews,
      stats,
      logs,
      total: reviews + stats + logs
    };
  }, [displayPlayers, displayTrainings]);

  // 核心日期范围计算逻辑
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

  // Reset selections when filter changes
  useEffect(() => {
      setAttendancePlayerId('all');
      setSelectedSessionId(null);
  }, [attendanceTeamId, attendanceRange, selectedMonth, selectedQuarter, attendanceYear]);

  // Quick Action: Jump to individual report from credit alert
  const handleLowCreditPlayerClick = (player: Player) => {
      setAttendancePlayerId(player.id);
      const lastRecharge = player.rechargeHistory && player.rechargeHistory.length > 0
          ? [...player.rechargeHistory].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
          : null;
      
      if (lastRecharge) {
          setCustomStartDate(lastRecharge.date);
      } else if (player.joinDate) {
          setCustomStartDate(player.joinDate);
      } else {
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          setCustomStartDate(monthAgo.toISOString().split('T')[0]);
      }
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
        if (nextBirthday < today) {
            nextBirthday.setFullYear(today.getFullYear() + 1);
        }
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
        .filter(p => creditAlertTeamId === 'all' || p.teamId === creditAlertTeamId)
        .sort((a,b) => a.credits - b.credits);

    const teamCounts = displayTeams.map(t => ({ id: t.id, name: t.name, count: displayPlayers.filter(p => p.teamId === t.id).length }));
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyTransactions = transactions.filter(t => {
        const d = new Date(t.date);
        let year = isNaN(d.getTime()) ? -1 : d.getFullYear();
        let month = isNaN(d.getTime()) ? -1 : d.getMonth();
        return month === currentMonth && year === currentYear;
    });
    const monthlyIncome = monthlyTransactions.reduce((s, t) => s + (Number(t.income) || 0), 0);
    const monthlyExpense = monthlyTransactions.reduce((s, t) => s + (Number(t.expense) || 0), 0);

    return { 
        nextMatch: matches.find(m => m.status === 'Upcoming'), 
        totalPlayers: displayPlayers.length, 
        upcomingBirthdays, 
        lowCreditPlayers, 
        teamCounts, 
        finance: { income: monthlyIncome, expense: monthlyExpense, profit: monthlyIncome - monthlyExpense } 
    };
  }, [displayPlayers, displayTeams, transactions, matches, isDirector, creditAlertTeamId]);

  const { chartData, exportPlayersData, exportSessionsData, teamPlayersList } = useMemo(() => {
    const start = dateRange.start;
    const end = dateRange.end;

    const filteredSessions = (displayTrainings || []).filter(s => {
        const d = parseLocalDate(s.date);
        const matchDate = d >= start && d <= end;
        const matchTeam = attendanceTeamId === 'all' || s.teamId === attendanceTeamId;
        return matchDate && matchTeam;
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
             grandTotalRate += rate;
             grandTotalCount++;
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
            groupedData[key].totalRate += rate;
            groupedData[key].count += 1;
            grandTotalRate += rate;
            grandTotalCount++;
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
          const teamName = teams.find(t => t.id === s.teamId)?.name || '';
          return { id: s.id, date: s.date, title: s.title, focus: s.focus, status: record?.status || 'Absent', teamName };
      });
      const present = sessionRecords.filter(r => r.status === 'Present').length;
      return { player, sessions: sessionRecords, stats: { total: sessionRecords.length, present, rate: sessionRecords.length > 0 ? Math.round((present / sessionRecords.length) * 100) : 0 } };
  }, [attendancePlayerId, displayTrainings, displayPlayers, dateRange, teams]);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
        if (attendancePlayerId !== 'all' && individualReport) {
            await exportToPDF('individual-attendance-export', `个人出勤_${individualReport.player.name}_${attendanceYear}`);
        } else {
            await exportToPDF('attendance-report-export', `训练出勤分析报告_${attendanceYear}`);
        }
    } catch (e) { alert('导出失败，请重试'); } finally { setIsExporting(false); }
  };

  const handleExportExcel = () => {
      setIsExportingExcel(true);
      try {
          let headers = "";
          let rows = "";
          let fileName = "";

          if (attendancePlayerId !== 'all' && individualReport) {
              headers = "日期,训练主题,所属梯队,训练重点,出勤状态\n";
              rows = individualReport.sessions.map(s => {
                  const statusMap = { 'Present': '实到', 'Leave': '请假', 'Injury': '伤停', 'Absent': '缺席' };
                  return `${s.date},"${s.title.replace(/"/g, '""')}",${s.teamName},${s.focus},${statusMap[s.status] || '缺席'}`;
              }).join('\n');
              fileName = `个人出勤明细_${individualReport.player.name}_${attendanceYear}.csv`;
          } else if (analysisView === 'player') {
              headers = "姓名,球衣号码,所属梯队,总训练场次,实到场次,请假场次,伤停场次,缺席场次,出勤率(%),当前课时余额\n";
              rows = exportPlayersData.map(p => {
                  const teamName = teams.find(t => t.id === p.teamId)?.name || '未知';
                  return `${p.name},${p.number},${teamName},${p.total},${p.present},${p.leave},${p.injury},${p.absent},${p.rate},${p.credits}`;
              }).join('\n');
              fileName = `全员出勤统计_${attendanceYear}.csv`;
          } else {
              headers = "日期,训练主题,所属梯队,应到人数,实到人数,请假人数,伤停人数,旷课人数,到课率(%)\n";
              rows = exportSessionsData.map(s => {
                  return `${s.date},"${s.title.replace(/"/g, '""')}",${s.teamName},${s.total},${s.present},${s.leave},${s.injury},${s.absent},${s.rate}`;
              }).join('\n');
              fileName = `训练场次分析_${attendanceYear}.csv`;
          }

          const blob = new Blob(["\ufeff" + headers + rows], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = fileName;
          link.click();
      } catch (e) {
          alert('Excel 导出失败');
      } finally {
          setIsExportingExcel(false);
      }
  };

  const handleExportCreditsPDF = async () => {
    setIsExportingCredits(true);
    const teamLabel = creditAlertTeamId === 'all' ? '全部梯队' : teams.find(t => t.id === creditAlertTeamId)?.name || '未知梯队';
    try {
        await exportToPDF('low-credits-export', `课时余额预警名单_${teamLabel}`);
    } catch (e) { alert('导出失败'); } finally { setIsExportingCredits(false); }
  };

  const handleAddAnnouncementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAnnouncement.title && newAnnouncement.content) {
        if (onAddAnnouncement) {
            onAddAnnouncement({ id: Date.now().toString(), title: newAnnouncement.title, content: newAnnouncement.content, date: new Date().toISOString().split('T')[0], type: newAnnouncement.type, author: currentUser?.name || '管理员' });
        }
        setNewAnnouncement({ title: '', content: '', type: 'info' });
        setShowAnnounceForm(false);
    }
  };

  const renderSessionDetail = () => {
    if (!selectedSessionId) return null;
    const session = trainings.find(t => t.id === selectedSessionId);
    if (!session) return null;
    const team = teams.find(t => t.id === session.teamId);
    const sessionPlayers = players.filter(p => p.teamId === session.teamId);
    const groups = { Present: [] as Player[], Leave: [] as Player[], Injury: [] as Player[], Absent: [] as Player[] };
    sessionPlayers.forEach(p => {
        const record = session.attendance?.find(r => r.playerId === p.id);
        const status = record ? record.status : 'Absent';
        if (groups[status]) groups[status].push(p);
        else groups['Absent'].push(p);
    });
    return (
        <div className="space-y-4 md:space-y-6 animate-in slide-in-from-right-4">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                <button onClick={() => setSelectedSessionId(null)} className="p-1.5 hover:bg-gray-100 rounded-full flex items-center justify-center"><ChevronDown className="w-5 h-5 text-gray-500 rotate-90" /></button>
                <div>
                    <h3 className="text-base md:text-lg font-black text-gray-800 leading-tight">{session.title}</h3>
                    <div className="flex flex-wrap items-center text-[10px] text-gray-500 gap-2 mt-1">
                        <span className="font-mono bg-gray-100 px-1 py-0.5 rounded border border-gray-200">{session.date}</span>
                        <span className="font-bold">{team?.name}</span>
                        <span className="bg-yellow-50 text-yellow-700 px-1 py-0.5 rounded border border-yellow-100 font-black">{session.focus}</span>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {Object.entries(groups).map(([status, members]) => (
                    <div key={status} className="bg-white rounded-xl p-3 md:p-4 border border-gray-100 flex flex-col shadow-sm">
                        <span className="text-[11px] md:text-sm font-black text-gray-800 flex items-center mb-2 md:mb-3">
                             {status === 'Present' ? <CheckCircle className="w-3.5 h-3.5 mr-1 text-green-500"/> : status === 'Leave' ? <Clock className="w-3.5 h-3.5 mr-1 text-yellow-500"/> : status === 'Injury' ? <AlertTriangle className="w-3.5 h-3.5 mr-1 text-red-500"/> : <Ban className="w-3.5 h-3.5 mr-1 text-gray-400"/>}
                             {status === 'Present' ? '实到' : status === 'Leave' ? '请假' : status === 'Injury' ? '伤停' : '缺席'} ({members.length})
                        </span>
                        <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[150px] md:max-h-[200px] custom-scrollbar">
                            {members.map(p => <div key={p.id} className="text-[10px] md:text-xs font-bold text-gray-600 bg-gray-50 p-1.5 rounded truncate">{p.name}</div>)}
                            {members.length === 0 && <div className="text-[9px] text-gray-300 italic">无人员</div>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-6">
      <div id="dashboard-content" className="space-y-6 md:space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end bg-bvb-yellow rounded-2xl p-4 md:p-6 shadow-lg relative overflow-hidden">
           <div className="relative z-10">
              <h2 className="text-2xl md:text-4xl font-black text-bvb-black uppercase tracking-tighter mb-1 md:mb-2 italic">俱乐部概览</h2>
              <p className="text-[11px] md:text-sm text-bvb-black font-bold opacity-80">欢迎，{currentUser?.name || '教练'}。这是俱乐部当前状态实时报告。</p>
           </div>
           <div className="relative z-10 mt-4 md:mt-0 flex gap-3 md:gap-4 text-center">
                <div className="bg-white/90 backdrop-blur-sm p-2.5 md:p-3 rounded-xl shadow-sm border border-black/5 flex-1 md:flex-none">
                    <div className="text-[9px] md:text-xs font-black text-gray-400 uppercase tracking-widest">球员总数</div>
                    <div className="text-xl md:text-2xl font-black text-bvb-black leading-none mt-1">{stats.totalPlayers}</div>
                </div>
                 <div className="bg-white/90 backdrop-blur-sm p-2.5 md:p-3 rounded-xl shadow-sm border border-black/5 flex-1 md:flex-none">
                    <div className="text-[9px] md:text-xs font-black text-gray-400 uppercase tracking-widest">下场对手</div>
                    <div className="text-xs md:text-sm font-black text-bvb-black max-w-[100px] truncate leading-none mt-1.5">{stats.nextMatch ? stats.nextMatch.opponent : '无安排'}</div>
                </div>
           </div>
           <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-white/20 to-transparent pointer-events-none"></div>
           <Trophy className="absolute -right-6 -bottom-6 w-32 md:w-48 h-32 md:h-48 text-white/20 rotate-12 pointer-events-none" />
        </div>

        {/* Club Status Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {isDirector && (
                <div className="bg-white rounded-xl shadow-md border-l-4 border-green-500 p-4 md:p-6 flex flex-col justify-between cursor-pointer hover:shadow-lg transition-all" onClick={() => onNavigate?.('finance')}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-black text-sm md:text-lg text-gray-800 flex items-center">
                            <Wallet className="w-4 h-4 md:w-6 md:h-6 mr-1.5 md:mr-2 text-green-500" /> 本月财务快报
                        </h3>
                        <span className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">{new Date().getMonth() + 1}月实时流水</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-green-50 p-2 md:p-3 rounded-lg border border-green-100">
                             <div className="text-[8px] md:text-[10px] text-green-600 font-black uppercase">本月收入</div>
                             <div className="text-sm md:text-lg font-black text-green-700 leading-none mt-1">¥{stats.finance.income.toLocaleString()}</div>
                        </div>
                        <div className="bg-red-50 p-2 md:p-3 rounded-lg border border-red-100">
                             <div className="text-[8px] md:text-[10px] text-red-600 font-black uppercase">本月支出</div>
                             <div className="text-sm md:text-lg font-black text-red-700 leading-none mt-1">¥{stats.finance.expense.toLocaleString()}</div>
                        </div>
                        <div className="bg-bvb-yellow/10 p-2 md:p-3 rounded-lg border border-bvb-yellow/20">
                             <div className="text-[8px] md:text-[10px] text-bvb-black font-black uppercase">本月盈余</div>
                             <div className={`text-sm md:text-lg font-black leading-none mt-1 ${stats.finance.profit >= 0 ? 'text-gray-800' : 'text-red-600'}`}>¥{stats.finance.profit.toLocaleString()}</div>
                        </div>
                    </div>
                </div>
            )}
            {isDirector && pendingTasks.total > 0 ? (
                <div className="bg-white rounded-xl shadow-md border-l-4 border-bvb-yellow p-4 md:p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-black text-sm md:text-lg text-gray-800 flex items-center">
                            <ClipboardCheck className="w-4 h-4 md:w-6 md:h-6 mr-1.5 md:mr-2 text-bvb-yellow" /> 待办审核事项
                        </h3>
                        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">{pendingTasks.total} 个待处理</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 md:gap-4">
                        <div onClick={() => onNavigate?.('players', 'pending_reviews')} className="bg-gray-50 p-2.5 md:p-4 rounded-lg flex flex-col items-center border border-gray-100 cursor-pointer hover:bg-blue-50 transition-all group text-center">
                            <span className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase mb-1 group-hover:text-blue-600">球员点评</span>
                            <span className="text-xl md:text-2xl font-black text-blue-600 leading-none">{pendingTasks.reviews}</span>
                        </div>
                        <div onClick={() => onNavigate?.('players', 'pending_stats')} className="bg-gray-50 p-2.5 md:p-4 rounded-lg flex flex-col items-center border border-gray-100 cursor-pointer hover:bg-blue-50 transition-all group text-center">
                            <span className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase mb-1 group-hover:text-blue-600">数据更新</span>
                            <span className="text-xl md:text-2xl font-black text-blue-600 leading-none">{pendingTasks.stats}</span>
                        </div>
                        <div onClick={() => onNavigate?.('training', 'pending_logs')} className="bg-gray-50 p-2.5 md:p-4 rounded-lg flex flex-col items-center border border-gray-100 cursor-pointer hover:bg-blue-50 transition-all group text-center">
                            <span className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase mb-1 group-hover:text-blue-600">训练日志</span>
                            <span className="text-xl md:text-2xl font-black text-blue-600 leading-none">{pendingTasks.logs}</span>
                        </div>
                    </div>
                </div>
            ) : isDirector ? (
                <div className="bg-white rounded-xl shadow-md border-l-4 border-gray-200 p-4 md:p-6 flex items-center justify-center">
                    <div className="text-center"><CheckCircle className="w-6 md:w-8 h-6 md:h-8 text-green-500 mx-auto mb-1 md:mb-2" /><p className="text-[10px] md:text-sm font-black text-gray-500 uppercase tracking-widest">所有审核事项已处理完毕</p></div>
                </div>
            ) : null}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="space-y-4">
                <div className="bg-white rounded-xl shadow-sm border-l-4 border-indigo-500 p-4">
                    <h3 className="font-black text-sm flex items-center text-gray-800 mb-3"><Shirt className="w-4 h-4 mr-1.5 text-indigo-500" /> 梯队人数统计</h3>
                    <div className="space-y-2">
                        {stats.teamCounts.map(t => (
                            <div key={t.id} onClick={() => onNavigate?.('players', t.id)} className="flex justify-between items-center bg-indigo-50 p-2 rounded-lg text-xs group cursor-pointer hover:bg-indigo-100 transition-all">
                                <span className="font-black text-gray-700 group-hover:text-indigo-800">{t.name}</span>
                                <span className="font-mono font-black text-indigo-600">{t.count} 人</span>
                            </div>
                        ))}
                    </div>
                </div>
                {isDirector && (
                    <div className={`bg-white rounded-xl shadow-sm border-l-4 p-4 ${stats.lowCreditPlayers.length > 0 ? 'border-red-500' : 'border-green-500'}`}>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-black text-sm flex items-center text-gray-800">
                                <AlertTriangle className={`w-4 h-4 mr-1.5 ${stats.lowCreditPlayers.length > 0 ? 'text-red-500' : 'text-green-500'}`} /> 余额预警
                            </h3>
                            <div className="flex items-center gap-1.5">
                                <select 
                                    value={creditAlertTeamId} 
                                    onChange={(e) => setCreditAlertTeamId(e.target.value)}
                                    className="text-[10px] bg-gray-100 border-none rounded px-1 py-0.5 font-black outline-none focus:ring-1 focus:ring-bvb-yellow"
                                >
                                    <option value="all">全部</option>
                                    {teams.map(t => <option key={t.id} value={t.id}>{t.level}</option>)}
                                </select>
                                <button 
                                    onClick={handleExportCreditsPDF} 
                                    disabled={isExportingCredits || stats.lowCreditPlayers.length === 0}
                                    className="p-1 text-gray-400 hover:text-bvb-black disabled:opacity-30"
                                    title="导出预警名单"
                                >
                                    {isExportingCredits ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2 max-h-[160px] md:max-h-[180px] overflow-y-auto custom-scrollbar pr-1">
                            {stats.lowCreditPlayers.map(p => {
                                const team = teams.find(t => t.id === p.teamId);
                                return (
                                    <div key={p.id} onClick={() => handleLowCreditPlayerClick(p)} className="flex justify-between items-center bg-red-50 p-2 rounded-lg text-xs cursor-pointer hover:bg-red-100 transition-colors group">
                                        <div className="flex flex-col">
                                            <span className="font-black text-gray-700">{p.name}</span>
                                            <span className="text-[9px] text-gray-400 font-bold uppercase">{team?.name || '未知梯队'}</span>
                                        </div>
                                        <span className="font-mono font-black text-red-600">{p.credits} 节</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                <div className="bg-white rounded-xl shadow-sm border-l-4 border-pink-500 p-4">
                    <h3 className="font-black text-sm flex items-center text-gray-800 mb-3"><Cake className="w-4 h-4 mr-1.5 text-pink-500" /> 近期生日</h3>
                    {stats.upcomingBirthdays.length > 0 ? (
                        <div className="space-y-2">
                            <p className="text-[9px] text-gray-400 font-black uppercase mb-2">本周生日球员 (共{stats.upcomingBirthdays.length}人)</p>
                            <div className="flex flex-wrap gap-1.5 md:gap-2">
                                {stats.upcomingBirthdays.map(p => (
                                    <div 
                                        key={p.id} 
                                        className="bg-pink-50 text-pink-700 px-2.5 py-1 rounded-lg text-[11px] font-black border border-pink-100 flex items-center group shadow-sm"
                                    >
                                        <Sparkles className="w-3 h-3 mr-1" />
                                        {p.name} [{p.monthDay}]
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : <p className="text-[11px] text-gray-400 text-center py-4 italic">近期无生日安排</p>}
                </div>
            </div>

            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                <div className="p-3 md:p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-black text-sm md:text-base text-gray-800 flex items-center italic uppercase tracking-tighter"><Megaphone className="w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2 text-bvb-yellow" /> 俱乐部公告栏</h3>
                    {isDirector && (
                        <button onClick={() => setShowAnnounceForm(!showAnnounceForm)} className="text-[10px] md:text-xs flex items-center bg-white border border-gray-300 px-2 md:px-3 py-1.5 rounded-lg font-black transition-all hover:bg-gray-100 active:scale-95 shadow-sm">
                            {showAnnounceForm ? <X className="w-3 h-3 mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                            {showAnnounceForm ? '取消' : '发布'}
                        </button>
                    )}
                </div>
                {showAnnounceForm && (
                    <div className="p-4 bg-yellow-50 border-b border-yellow-100 animate-in slide-in-from-top-2">
                        <form onSubmit={handleAddAnnouncementSubmit} className="space-y-3">
                            <div className="flex gap-3">
                                <input placeholder="公告标题..." className="flex-1 p-2 border rounded-lg text-xs md:text-sm font-bold" value={newAnnouncement.title} onChange={e => setNewAnnouncement({...newAnnouncement, title: e.target.value})} required />
                                <select className="p-2 border rounded-lg text-xs font-bold bg-white" value={newAnnouncement.type} onChange={e => setNewAnnouncement({...newAnnouncement, type: e.target.value as any})}>
                                    <option value="info">常规通知</option>
                                    <option value="urgent">紧急公告</option>
                                </select>
                            </div>
                            <textarea placeholder="输入公告详情内容..." rows={2} className="w-full p-2 border rounded-lg text-xs md:text-sm font-bold" value={newAnnouncement.content} onChange={e => setNewAnnouncement({...newAnnouncement, content: e.target.value})} required />
                            <div className="flex justify-end"><button type="submit" className="px-5 py-2 bg-bvb-black text-bvb-yellow text-[11px] font-black rounded-lg uppercase italic tracking-widest shadow-md">发布公告</button></div>
                        </form>
                    </div>
                )}
                <div className="flex-1 overflow-y-auto max-h-[250px] md:max-h-[300px] p-3 md:p-4 space-y-3 custom-scrollbar">
                    {announcements.length > 0 ? announcements.map(item => (
                        <div key={item.id} className="relative group border border-gray-100 rounded-xl p-3 bg-white shadow-sm hover:shadow-md transition-all">
                            <div className="flex justify-between items-start mb-1">
                                <h4 className={`font-black text-[12px] md:text-sm ${item.type === 'urgent' ? 'text-red-600' : 'text-gray-800'}`}>{item.title}</h4>
                                <span className="text-[9px] text-gray-400 font-mono font-bold tracking-tighter">{item.date}</span>
                            </div>
                            <p className="text-[11px] md:text-sm text-gray-600 leading-relaxed">{item.content}</p>
                            {isDirector && (
                                <button onClick={() => onDeleteAnnouncement?.(item.id)} className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>
                            )}
                        </div>
                    )) : <div className="text-center py-10 text-gray-300 text-xs italic font-black uppercase tracking-widest">No active announcements</div>}
                </div>
            </div>
        </div>
        
        {/* Attendance Analysis Section */}
        <div id="attendance-analysis-section" className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6 flex flex-col scroll-mt-20">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4 border-b border-gray-100 pb-4">
                <div>
                    <h3 className="text-base md:text-xl font-black text-gray-800 flex items-center italic uppercase tracking-tighter"><Activity className="w-5 h-5 md:w-6 md:h-6 mr-1.5 md:mr-2 text-bvb-yellow" /> 训练出勤深度分析</h3>
                    <p className="text-[9px] md:text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Attendance Analytics & Insights</p>
                </div>
                <div className="flex flex-wrap gap-2 items-center justify-end w-full lg:w-auto">
                    {attendancePlayerId === 'all' && (
                        <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner shrink-0">
                            <button onClick={() => setAnalysisView('player')} className={`px-2.5 md:px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-black transition-all flex items-center ${analysisView === 'player' ? 'bg-white shadow text-bvb-black' : 'text-gray-500'}`}><Users className="w-3 h-3 mr-1" /> 按球员</button>
                            <button onClick={() => setAnalysisView('session')} className={`px-2.5 md:px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-black transition-all flex items-center ${analysisView === 'session' ? 'bg-white shadow text-bvb-black' : 'text-gray-500'}`}><LayoutList className="w-3 h-3 mr-1" /> 按课次</button>
                        </div>
                    )}
                    <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner shrink-0 overflow-x-auto no-scrollbar">
                        <div className="flex items-center gap-1 px-1.5 border-r border-gray-200">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            <select 
                                value={attendanceYear} 
                                onChange={(e) => setAttendanceYear(parseInt(e.target.value))}
                                className="bg-transparent text-[10px] md:text-xs font-black text-gray-600 outline-none focus:ring-0 cursor-pointer"
                            >
                                {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}年</option>)}
                            </select>
                        </div>
                        {['month', 'quarter', 'year', 'custom'].map(r => (
                            <button 
                                key={r} 
                                onClick={() => setAttendanceRange(r as any)} 
                                className={`px-2 md:px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-black transition-all whitespace-nowrap ${attendanceRange === r ? 'bg-white shadow text-bvb-black' : 'text-gray-500'}`}
                            >
                                {r === 'month' ? '按月' : r === 'quarter' ? '季度' : r === 'year' ? '年度' : '自选'}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-wrap gap-2 items-center bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                        {attendanceRange === 'month' && (
                            <select 
                                value={selectedMonth} 
                                onChange={e => setSelectedMonth(parseInt(e.target.value))}
                                className="text-[10px] md:text-xs p-1.5 bg-white border border-gray-200 rounded-lg font-black"
                            >
                                {Array.from({length: 12}, (_, i) => <option key={i} value={i}>{i+1}月</option>)}
                            </select>
                        )}
                        {attendanceRange === 'quarter' && (
                            <select 
                                value={selectedQuarter} 
                                onChange={e => setSelectedQuarter(parseInt(e.target.value))}
                                className="text-[10px] md:text-xs p-1.5 bg-white border border-gray-200 rounded-lg font-black"
                            >
                                <option value={0}>第一季度 (Q1)</option>
                                <option value={1}>第二季度 (Q2)</option>
                                <option value={2}>第三季度 (Q3)</option>
                                <option value={3}>第四季度 (Q4)</option>
                            </select>
                        )}
                        {attendanceRange === 'custom' && (
                            <div className="flex items-center gap-1">
                                <input 
                                    type="date" 
                                    className="text-[10px] md:text-xs p-1.5 bg-white border border-gray-200 rounded-lg font-black" 
                                    value={customStartDate} 
                                    onChange={e => setCustomStartDate(e.target.value)} 
                                />
                                <span className="text-gray-400">至</span>
                                <input 
                                    type="date" 
                                    className="text-[10px] md:text-xs p-1.5 bg-white border border-gray-200 rounded-lg font-black" 
                                    value={customEndDate} 
                                    onChange={e => setCustomEndDate(e.target.value)} 
                                />
                            </div>
                        )}
                        
                        <div className="h-4 w-px bg-gray-200 mx-1"></div>

                        <select value={attendanceTeamId} onChange={e => setAttendanceTeamId(e.target.value)} className="text-[10px] md:text-xs p-1.5 bg-white border border-gray-200 rounded-lg font-black">
                            <option value="all">所有梯队</option>
                            {displayTeams.map(t => <option key={t.id} value={t.id}>{t.level}</option>)}
                        </select>
                        
                        <select value={attendancePlayerId} onChange={e => setAttendancePlayerId(e.target.value)} className="text-[10px] md:text-xs p-1.5 bg-white border border-gray-200 rounded-lg font-black max-w-[120px]">
                            <option value="all">全体球员</option>
                            {teamPlayersList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>

                        <div className="flex gap-1">
                            <button onClick={handleExportExcel} disabled={isExportingExcel} className="p-1.5 md:p-2 bg-green-600 text-white rounded-lg shadow-lg hover:brightness-110 disabled:opacity-50" title="导出 Excel">
                                {isExportingExcel ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <FileSpreadsheet className="w-3.5 h-3.5"/>}
                            </button>
                            <button onClick={handleExportPDF} disabled={isExporting} className="p-1.5 md:p-2 bg-bvb-black text-bvb-yellow rounded-lg shadow-lg hover:brightness-110 disabled:opacity-50" title="导出 PDF">
                                {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Download className="w-3.5 h-3.5"/>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {attendancePlayerId !== 'all' && individualReport ? (
                <div id="individual-attendance-export" className="space-y-4 md:space-y-6 animate-in fade-in bg-white rounded-xl">
                    <div className="bg-gray-50 rounded-2xl p-4 flex justify-between items-center border border-gray-100 shadow-inner">
                        <div className="flex items-center gap-3 md:gap-4">
                            <img src={individualReport.player.image} className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover border-2 border-white shadow-sm" />
                            <div><h3 className="text-base md:text-lg font-black text-gray-800">{individualReport.player.name}</h3><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">#{individualReport.player.number} • {individualReport.player.position}</p></div>
                        </div>
                        <div className="flex gap-4 md:gap-8 text-center pr-2">
                            <div><div className="text-[9px] md:text-xs text-gray-400 font-black uppercase">参训率</div><div className="text-xl md:text-2xl font-black tabular-nums">{individualReport.stats.rate}%</div></div>
                            <div><div className="text-[9px] md:text-xs text-gray-400 font-black uppercase">实到</div><div className="text-xl md:text-2xl font-black text-green-600 tabular-nums">{individualReport.stats.present}</div></div>
                        </div>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 font-black text-gray-500 text-[9px] md:text-xs uppercase tracking-widest border-b">
                                <tr>
                                    <th className="px-3 py-3 md:px-4">日期</th>
                                    <th className="px-3 py-3 md:px-4">训练主题</th>
                                    <th className="px-3 py-3 md:px-4">所属梯队</th>
                                    <th className="px-3 py-3 md:px-4 text-center">状态</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {individualReport.sessions.map(s => (
                                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-3 py-3 md:px-4 font-mono text-[9px] md:text-xs text-gray-400 whitespace-nowrap">{s.date}</td>
                                        <td className="px-3 py-3 md:px-4 font-black text-gray-700 text-[11px] md:text-sm truncate max-w-[100px] md:max-w-none">{s.title}</td>
                                        <td className="px-3 py-3 md:px-4 text-[10px] text-gray-500">{s.teamName}</td>
                                        <td className="px-3 py-3 md:px-4 text-center whitespace-nowrap">
                                            <span className={`px-1.5 py-0.5 rounded-[4px] text-[9px] md:text-[10px] font-black uppercase border tracking-tighter ${
                                                s.status === 'Present' ? 'bg-green-50 text-green-700 border-green-100' : 
                                                s.status === 'Leave' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                                s.status === 'Injury' ? 'bg-red-50 text-red-700 border-red-100' :
                                                'bg-gray-100 text-gray-400 border-gray-200'
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
                <div id="attendance-report-export" className="space-y-6 bg-white rounded-xl">
                    {analysisView === 'session' ? (
                        selectedSessionId ? renderSessionDetail() : (
                        <div className="space-y-6">
                            <div className="h-32 md:h-48 w-full bg-gray-50/50 rounded-2xl p-2 border border-gray-50">
                                <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 'bold', fill: '#9ca3af' }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#d1d5db' }} unit="%" /><Tooltip cursor={{fill: '#fefce8'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '11px' }} /><Bar dataKey="rate" fill="#FDE100" radius={[4, 4, 0, 0]} maxBarSize={30} onClick={(data) => setSelectedSessionId(data.id)} cursor="pointer"/></BarChart></ResponsiveContainer>
                            </div>
                            <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 font-black text-[9px] md:text-[10px] uppercase tracking-tighter md:tracking-widest text-gray-500 border-b">
                                        <tr>
                                            <th className="px-3 py-3 md:px-4">日期/梯队</th>
                                            <th className="px-3 py-3 md:px-4">训练主题</th>
                                            <th className="px-3 py-3 md:px-4">应到/实到</th>
                                            <th className="px-3 py-3 md:px-4">到课率</th>
                                            <th className="px-2 py-3 text-center text-yellow-600">假</th>
                                            <th className="px-2 py-3 text-center text-red-600">伤</th>
                                            <th className="px-2 py-3 text-center text-gray-400">缺</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {exportSessionsData.map(s => (
                                            <tr key={s.id} onClick={() => setSelectedSessionId(s.id)} className="hover:bg-yellow-50/30 cursor-pointer transition-colors text-[11px] md:text-sm">
                                                <td className="px-3 py-3 md:px-4">
                                                    <div className="font-mono text-[9px] text-gray-400 leading-none">{s.date}</div>
                                                    <div className="font-black text-gray-600 text-[10px] mt-1 uppercase tracking-tighter">{s.teamName}</div>
                                                </td>
                                                <td className="px-3 py-3 md:px-4 font-bold text-gray-800 truncate max-w-[80px] md:max-w-none">{s.title}</td>
                                                <td className="px-3 py-3 md:px-4 font-mono text-[10px] text-gray-500">{s.total} / <span className="font-black text-green-600">{s.present}</span></td>
                                                <td className="px-3 py-3 md:px-4">
                                                    <div className="flex items-center gap-1.5 md:gap-2">
                                                        <div className="w-8 md:w-16 h-1 md:h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-bvb-black rounded-full" style={{ width: `${s.rate}%` }}></div>
                                                        </div>
                                                        <span className="text-[10px] font-black tabular-nums">{s.rate}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-2 py-3 text-center font-black text-yellow-600 tabular-nums">{s.leave}</td>
                                                <td className="px-2 py-3 text-center font-black text-red-600 tabular-nums">{s.injury}</td>
                                                <td className="px-2 py-3 text-center font-black text-gray-400 tabular-nums">{s.absent}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        )
                    ) : (
                        <div className="space-y-6">
                            <div className="h-40 md:h-56 w-full bg-gray-50/50 rounded-2xl p-2 border border-gray-50">
                                <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 'bold', fill: '#9ca3af' }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#d1d5db' }} unit="%" /><Tooltip cursor={{fill: '#fefce8'}} contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '11px' }} /><Bar dataKey="rate" fill="#FDE100" radius={[4, 4, 0, 0]} maxBarSize={30}/></BarChart></ResponsiveContainer>
                            </div>
                            <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm max-h-[400px]">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50 font-black text-[9px] md:text-[10px] uppercase tracking-tighter md:tracking-widest text-gray-500 sticky top-0 z-10 border-b">
                                        <tr>
                                            <th className="px-3 py-3 md:px-4">球员</th>
                                            <th className="px-3 py-3 md:px-4">总场次</th>
                                            <th className="px-3 py-3 md:px-4">参训率</th>
                                            <th className="px-2 py-3 text-center text-green-600">到</th>
                                            <th className="px-2 py-3 text-center text-yellow-600">假</th>
                                            <th className="px-2 py-3 text-center text-red-600">伤</th>
                                            <th className="px-2 py-3 text-center text-gray-400">缺</th>
                                            {isDirector && <th className="px-3 py-3 md:px-4 text-right">余额</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {exportPlayersData.map(p => (
                                            <tr key={p.id} className="hover:bg-gray-50/50 transition-colors text-[11px] md:text-sm">
                                                <td className="px-3 py-3 md:px-4 font-black text-gray-800 truncate max-w-[60px] md:max-w-none">{p.name}</td>
                                                <td className="px-3 py-3 md:px-4 font-mono text-[10px] text-gray-500">{p.total}</td>
                                                <td className="px-3 py-3 md:px-4">
                                                    <div className="flex items-center gap-1.5 md:gap-2">
                                                        <div className="flex-1 min-w-[30px] md:min-w-[80px] h-1 md:h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-bvb-black rounded-full" style={{ width: `${p.rate}%` }}></div>
                                                        </div>
                                                        <span className="text-[10px] font-black tabular-nums">{p.rate}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-2 py-3 text-center font-black text-green-600 tabular-nums">{p.present}</td>
                                                <td className="px-2 py-3 text-center font-black text-yellow-600 tabular-nums">{p.leave}</td>
                                                <td className="px-2 py-3 text-center font-black text-red-600 tabular-nums">{p.injury}</td>
                                                <td className="px-2 py-3 text-center font-black text-gray-300 tabular-nums">{p.absent}</td>
                                                {isDirector && (
                                                    <td className={`px-3 py-3 md:px-4 text-right font-black tabular-nums ${p.credits <= 2 ? 'text-red-500' : 'text-gray-800'}`}>
                                                        {p.credits}
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
