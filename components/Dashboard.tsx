
import React, { useMemo, useState, useEffect } from 'react';
import { Player, Match, TrainingSession, Team, User, Announcement } from '../types';
import { Users, Trophy, TrendingUp, AlertCircle, Calendar, Cake, Activity, Filter, ChevronDown, Download, Loader2, Megaphone, Plus, Trash2, X, AlertTriangle, Bell, Send, Lock, FileText, ClipboardCheck, ShieldAlert, Edit2, ArrowRight, User as UserIcon, Shirt, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LineChart, Line } from 'recharts';
import { exportToPDF } from '../services/pdfService';

interface DashboardProps {
  players: Player[];
  matches: Match[];
  trainings: TrainingSession[];
  teams: Team[];
  announcements?: Announcement[];
  currentUser: User | null;
  onNavigate?: (tab: string, filter?: string) => void;
  onAddAnnouncement?: (announcement: Announcement) => void;
  onDeleteAnnouncement?: (id: string) => void;
  onUpdateAnnouncement?: (announcement: Announcement) => void;
  appLogo?: string;
}

type TimeRange = 'month' | 'quarter' | 'year' | 'custom';

const Dashboard: React.FC<DashboardProps> = ({ 
    players, matches, trainings, teams, currentUser, onNavigate,
    announcements = [], onAddAnnouncement, onDeleteAnnouncement, onUpdateAnnouncement, appLogo
}) => {
  // Date Range State
  const [attendanceRange, setAttendanceRange] = useState<TimeRange>('month');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  const [attendanceTeamId, setAttendanceTeamId] = useState<string>('all');
  const [attendancePlayerId, setAttendancePlayerId] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);

  // Permission check
  const isDirector = currentUser?.role === 'director';
  const isCoach = currentUser?.role === 'coach';

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
      // Coaches only see players in their managed teams
      return players.filter(p => managedTeamIds.includes(p.teamId));
  }, [players, isDirector, managedTeamIds]);

  const displayTrainings = useMemo(() => {
      if (isDirector) return trainings;
      return trainings.filter(t => managedTeamIds.includes(t.teamId));
  }, [trainings, isDirector, managedTeamIds]);

  const [showAnnounceForm, setShowAnnounceForm] = useState(false);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', type: 'info' as 'info' | 'urgent' });

  // Handle Preset Range Changes
  const handleRangeChange = (range: TimeRange) => {
      setAttendanceRange(range);
      const end = new Date();
      const start = new Date();
      
      if (range === 'month') {
          start.setMonth(end.getMonth() - 1);
      } else if (range === 'quarter') {
          start.setMonth(end.getMonth() - 3);
      } else if (range === 'year') {
          start.setFullYear(end.getFullYear() - 1);
      }
      // If custom, we don't overwrite dates immediately, keep previous custom or default
      if (range !== 'custom') {
          setCustomStartDate(start.toISOString().split('T')[0]);
          setCustomEndDate(end.toISOString().split('T')[0]);
      }
  };

  // Reset player selection when team changes
  useEffect(() => {
      setAttendancePlayerId('all');
  }, [attendanceTeamId]);

  // Director Pending Tasks Logic
  const pendingTasks = useMemo(() => {
      if (!isDirector) return { reviews: 0, stats: 0, logs: 0, total: 0 };

      const pendingReviews = players.reduce((acc, p) => {
          return acc + (p.reviews?.filter(r => r.status === 'Submitted').length || 0);
      }, 0);

      const pendingStats = players.filter(p => p.statsStatus === 'Submitted').length;
      
      const pendingLogs = trainings.filter(t => t.submissionStatus === 'Submitted').length;

      return {
          reviews: pendingReviews,
          stats: pendingStats,
          logs: pendingLogs,
          total: pendingReviews + pendingStats + pendingLogs
      };
  }, [players, trainings, isDirector]);


  const stats = useMemo(() => {
    const wins = matches.filter(m => m.status === 'Completed' && m.result && parseInt(m.result.split('-')[0]) > parseInt(m.result.split('-')[1])).length;
    const losses = matches.filter(m => m.status === 'Completed' && m.result && parseInt(m.result.split('-')[0]) < parseInt(m.result.split('-')[1])).length;
    const draws = matches.filter(m => m.status === 'Completed' && m.result && parseInt(m.result.split('-')[0]) === parseInt(m.result.split('-')[1])).length;
    
    // Use displayPlayers for ranking
    const sortedPlayers = [...displayPlayers].sort((a, b) => b.goals - a.goals);

    // Birthday Logic (Use displayPlayers)
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
        const nextBirthday = new Date(today.getFullYear(), m - 1, d);
        if(nextBirthday < today) nextBirthday.setFullYear(today.getFullYear() + 1);
        const diffTime = nextBirthday.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { ...p, daysUntil: diffDays };
    }).sort((a,b) => a.daysUntil - b.daysUntil);

    // Low Credit Logic (Use displayPlayers)
    const lowCreditPlayers = displayPlayers.filter(p => p.credits <= 2).sort((a,b) => a.credits - b.credits);
    
    // Team Counts Logic (Use displayTeams and displayPlayers)
    const teamCounts = displayTeams.map(t => ({
        id: t.id,
        name: t.name,
        count: displayPlayers.filter(p => p.teamId === t.id).length
    }));
    // Only check unassigned if Director (or if coach has unassigned access, which current logic excludes for coaches)
    if (isDirector) {
        const unassignedCount = displayPlayers.filter(p => p.teamId === 'unassigned').length;
        if (unassignedCount > 0) {
            teamCounts.push({ id: 'unassigned', name: '待分配', count: unassignedCount });
        }
    }

    return {
      wins, losses, draws,
      topScorer: sortedPlayers[0],
      nextMatch: matches.find(m => m.status === 'Upcoming'),
      totalPlayers: displayPlayers.length,
      upcomingBirthdays,
      lowCreditPlayers,
      teamCounts
    };
  }, [matches, displayPlayers, displayTeams, isDirector]);

  // --- Attendance Analytics Logic ---
  const { chartData, averageRate, exportPlayersData, teamPlayersList } = useMemo(() => {
    // 1. Filtered Sessions (Use displayTrainings)
    const start = new Date(customStartDate);
    const end = new Date(customEndDate);
    end.setHours(23, 59, 59, 999);

    const filteredSessions = (displayTrainings || []).filter(s => {
        const d = new Date(s.date);
        const matchDate = d >= start && d <= end;
        const matchTeam = attendanceTeamId === 'all' || s.teamId === attendanceTeamId;
        return matchDate && matchTeam;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 2. Filtered Players for Dropdown & Chart Context (Use displayPlayers)
    const teamPlayers = displayPlayers.filter(p => attendanceTeamId === 'all' || p.teamId === attendanceTeamId);

    if (filteredSessions.length === 0) return { chartData: [], averageRate: 0, exportPlayersData: [], teamPlayersList: teamPlayers };

    const groupedData: Record<string, { totalRate: number; count: number }> = {};
    let grandTotalRate = 0;
    let grandTotalCount = 0;

    filteredSessions.forEach(session => {
        const date = new Date(session.date);
        let key = '';
        
        if (attendanceRange === 'year') {
             key = `${date.getMonth() + 1}月`;
        } else {
             const weekNum = Math.ceil(date.getDate() / 7);
             key = `${date.getMonth() + 1}月W${weekNum}`;
        }
        
        const sessionTeamPlayersCount = displayPlayers.filter(p => p.teamId === session.teamId).length;
        const presentCount = session.attendance?.filter(r => r.status === 'Present').length || 0;
        const rate = sessionTeamPlayersCount > 0 ? (presentCount / sessionTeamPlayersCount) * 100 : 0;

        if (!groupedData[key]) groupedData[key] = { totalRate: 0, count: 0 };
        groupedData[key].totalRate += rate;
        groupedData[key].count += 1;

        grandTotalRate += rate;
        grandTotalCount++;
    });

    const data = Object.keys(groupedData).map(key => ({
        name: key,
        rate: Math.round(groupedData[key].totalRate / groupedData[key].count)
    }));
    
    // Export Data for Summary Table
    const exportList = teamPlayers.map(p => {
         const pSessions = filteredSessions.filter(t => t.teamId === p.teamId);
         const pPresent = pSessions.filter(t => t.attendance?.some(r => r.playerId === p.id && r.status === 'Present')).length;
         const pLeave = pSessions.filter(t => t.attendance?.some(r => r.playerId === p.id && r.status === 'Leave')).length;
         const pInjury = pSessions.filter(t => t.attendance?.some(r => r.playerId === p.id && r.status === 'Injury')).length;
         const rate = pSessions.length > 0 ? Math.round((pPresent / pSessions.length) * 100) : 0;
         return { ...p, present: pPresent, leave: pLeave, injury: pInjury, total: pSessions.length, rate };
    }).sort((a,b) => b.rate - a.rate);

    return { 
        chartData: data, 
        averageRate: Math.round(grandTotalRate / grandTotalCount),
        exportPlayersData: exportList,
        teamPlayersList: teamPlayers
    };

  }, [displayTrainings, displayPlayers, attendanceRange, attendanceTeamId, customStartDate, customEndDate]);

  // --- Individual Player Export Data ---
  const individualReport = useMemo(() => {
      if (attendancePlayerId === 'all') return null;
      
      const player = displayPlayers.find(p => p.id === attendancePlayerId);
      if (!player) return null;

      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);

      const relevantSessions = displayTrainings.filter(s => {
          const d = new Date(s.date);
          return d >= start && d <= end && s.teamId === player.teamId;
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Recent first

      const sessionRecords = relevantSessions.map(s => {
          const record = s.attendance?.find(r => r.playerId === player.id);
          return {
              id: s.id,
              date: s.date,
              title: s.title,
              focus: s.focus,
              status: record?.status || 'Absent',
              creditChange: (record?.status === 'Present') ? -1 : 0
          };
      });

      const present = sessionRecords.filter(r => r.status === 'Present').length;
      const leave = sessionRecords.filter(r => r.status === 'Leave').length;
      const injury = sessionRecords.filter(r => r.status === 'Injury').length;
      const absent = sessionRecords.filter(r => r.status === 'Absent').length;
      const rate = sessionRecords.length > 0 ? Math.round((present / sessionRecords.length) * 100) : 0;

      return {
          player,
          sessions: sessionRecords,
          stats: { total: sessionRecords.length, present, leave, injury, absent, rate }
      };
  }, [attendancePlayerId, displayTrainings, displayPlayers, customStartDate, customEndDate]);

  const playersStats = useMemo(() => {
      return exportPlayersData.slice(0, 5);
  }, [exportPlayersData]);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
        if (attendancePlayerId !== 'all' && individualReport) {
             await exportToPDF('individual-attendance-export', `个人出勤_${individualReport.player.name}_${customStartDate}`);
        } else {
             await exportToPDF('attendance-report-export', `训练出勤分析报告_${customStartDate}_至_${customEndDate}`);
        }
    } catch (e) {
        alert('导出失败');
    } finally {
        setIsExporting(false);
    }
  };

  const handleAddAnnouncementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAnnouncement.title && newAnnouncement.content) {
        if (editingAnnouncementId && onUpdateAnnouncement) {
             // Update existing
             const original = announcements.find(a => a.id === editingAnnouncementId);
             onUpdateAnnouncement({
                 id: editingAnnouncementId,
                 title: newAnnouncement.title,
                 content: newAnnouncement.content,
                 type: newAnnouncement.type,
                 date: original?.date || new Date().toISOString().split('T')[0],
                 author: original?.author || currentUser?.name || '管理员'
             });
             setEditingAnnouncementId(null);
        } else if (onAddAnnouncement) {
            // Add new
            onAddAnnouncement({
                id: Date.now().toString(),
                title: newAnnouncement.title,
                content: newAnnouncement.content,
                date: new Date().toISOString().split('T')[0],
                type: newAnnouncement.type,
                author: currentUser?.name || '管理员'
            });
        }
        
        setNewAnnouncement({ title: '', content: '', type: 'info' });
        setShowAnnounceForm(false);
    }
  };

  const handleEditAnnouncementClick = (announcement: Announcement) => {
      setNewAnnouncement({
          title: announcement.title,
          content: announcement.content,
          type: announcement.type
      });
      setEditingAnnouncementId(announcement.id);
      setShowAnnounceForm(true);
  };

  const handleCancelEdit = () => {
      setShowAnnounceForm(false);
      setEditingAnnouncementId(null);
      setNewAnnouncement({ title: '', content: '', type: 'info' });
  };

  const handleDeleteAnnouncementSubmit = (id: string) => {
      if(confirm('确定要删除这条公告吗？') && onDeleteAnnouncement) {
          onDeleteAnnouncement(id);
      }
  };

  return (
    <div className="space-y-6">
      
      {/* --- Main Dashboard Content --- */}
      <div id="dashboard-content" className="space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end bg-bvb-yellow rounded-2xl p-6 shadow-lg relative overflow-hidden">
           <div className="relative z-10">
              <h2 className="text-4xl font-black text-bvb-black uppercase tracking-tighter mb-2">俱乐部概览</h2>
              <p className="text-bvb-black font-bold opacity-80">欢迎回来，{currentUser?.name || '教练'}。这是{isCoach ? '您管理球队' : '本周'}的状态报告。</p>
           </div>
           <div className="relative z-10 mt-4 md:mt-0 flex gap-4 text-center">
                <div className="bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-sm">
                    <div className="text-xs font-bold text-gray-500 uppercase">球员总数</div>
                    <div className="text-2xl font-black text-bvb-black">{stats.totalPlayers}</div>
                </div>
                 <div className="bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-sm">
                    <div className="text-xs font-bold text-gray-500 uppercase">下场比赛</div>
                    <div className="text-sm font-black text-bvb-black max-w-[100px] truncate">{stats.nextMatch ? stats.nextMatch.opponent : '无'}</div>
                </div>
           </div>
           {/* Background Decoration */}
           <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-white/20 to-transparent pointer-events-none"></div>
           <Trophy className="absolute -right-6 -bottom-6 w-48 h-48 text-white/20 rotate-12 pointer-events-none" />
        </div>

        {/* ... (Pending Tasks Widget) ... */}
        {isDirector && pendingTasks.total > 0 && (
            <div className="bg-white rounded-xl shadow-md border-l-4 border-bvb-yellow p-6 animate-in slide-in-from-top-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center">
                        <ClipboardCheck className="w-6 h-6 mr-2 text-bvb-yellow" />
                        待办审核事项
                    </h3>
                    <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                        {pendingTasks.total} 个待处理
                    </span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                     <div 
                        onClick={() => onNavigate?.('players', 'pending_reviews')}
                        className="bg-gray-50 p-4 rounded-lg flex flex-col items-center border border-gray-100 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all group"
                     >
                         <span className="text-xs font-bold text-gray-400 uppercase mb-1 group-hover:text-blue-600">球员季度评价</span>
                         <span className={`text-2xl font-black ${pendingTasks.reviews > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                             {pendingTasks.reviews}
                         </span>
                     </div>
                     <div 
                        onClick={() => onNavigate?.('players', 'pending_stats')}
                        className="bg-gray-50 p-4 rounded-lg flex flex-col items-center border border-gray-100 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all group"
                     >
                         <span className="text-xs font-bold text-gray-400 uppercase mb-1 group-hover:text-blue-600">能力数据更新</span>
                         <span className={`text-2xl font-black ${pendingTasks.stats > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                             {pendingTasks.stats}
                         </span>
                     </div>
                     <div 
                        onClick={() => onNavigate?.('training', 'pending_logs')}
                        className="bg-gray-50 p-4 rounded-lg flex flex-col items-center border border-gray-100 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all group"
                     >
                         <span className="text-xs font-bold text-gray-400 uppercase mb-1 group-hover:text-blue-600">训练日志审核</span>
                         <span className={`text-2xl font-black ${pendingTasks.logs > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                             {pendingTasks.logs}
                         </span>
                     </div>
                </div>
            </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-green-500">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">胜场 (Wins)</p>
                        <h3 className="text-3xl font-black text-gray-800">{stats.wins}</h3>
                    </div>
                    <div className="p-2 bg-green-50 rounded-lg text-green-600">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                </div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-gray-400">
                 <div className="flex justify-between items-start">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">平局 (Draws)</p>
                        <h3 className="text-3xl font-black text-gray-800">{stats.draws}</h3>
                    </div>
                    <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                        <Activity className="w-5 h-5" />
                    </div>
                </div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-red-500">
                 <div className="flex justify-between items-start">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">负场 (Losses)</p>
                        <h3 className="text-3xl font-black text-gray-800">{stats.losses}</h3>
                    </div>
                    <div className="p-2 bg-red-50 rounded-lg text-red-600">
                        <AlertCircle className="w-5 h-5" />
                    </div>
                </div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-bvb-yellow">
                 <div className="flex justify-between items-start">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">头号射手</p>
                        <h3 className="text-xl font-black text-gray-800 truncate max-w-[120px]" title={stats.topScorer?.name || '-'}>{stats.topScorer?.name || '-'}</h3>
                        <p className="text-xs text-bvb-yellow font-bold bg-black inline-block px-1 rounded mt-1">{stats.topScorer?.goals || 0} 球</p>
                    </div>
                    <div className="p-2 bg-yellow-50 rounded-lg text-yellow-600">
                        <Trophy className="w-5 h-5" />
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Alerts & Info */}
            <div className="space-y-4">
                {/* Team Counts Card */}
                <div className="bg-white rounded-xl shadow-sm border-l-4 border-indigo-500 p-4">
                    <div className="flex justify-between items-center mb-3">
                         <h3 className="font-bold flex items-center text-gray-800">
                             <Shirt className="w-5 h-5 mr-2 text-indigo-500" />
                             梯队人数统计
                         </h3>
                    </div>
                    <div className="space-y-2">
                        {stats.teamCounts.map(t => (
                            <div key={t.id} className="flex justify-between items-center bg-indigo-50 p-2 rounded text-sm group">
                                <span className={`font-bold ${t.id === 'unassigned' ? 'text-red-500' : 'text-gray-700'}`}>
                                    {t.name}
                                </span>
                                <span className="font-mono font-black text-indigo-600">{t.count} 人</span>
                            </div>
                        ))}
                        {stats.teamCounts.length === 0 && <p className="text-xs text-gray-400 text-center py-2">暂无梯队数据</p>}
                    </div>
                </div>

                {/* Low Credit Alert - Hidden for Coaches */}
                {isDirector && (
                    <div className={`bg-white rounded-xl shadow-sm border-l-4 p-4 ${stats.lowCreditPlayers.length > 0 ? 'border-red-500' : 'border-green-500'}`}>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold flex items-center text-gray-800">
                                <AlertTriangle className={`w-5 h-5 mr-2 ${stats.lowCreditPlayers.length > 0 ? 'text-red-500' : 'text-green-500'}`} />
                                课时余额预警
                            </h3>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${stats.lowCreditPlayers.length > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {stats.lowCreditPlayers.length} 人
                            </span>
                        </div>
                        {stats.lowCreditPlayers.length > 0 ? (
                            <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                                {stats.lowCreditPlayers.map(p => (
                                    <div key={p.id} className="flex justify-between items-center bg-red-50 p-2 rounded text-sm">
                                        <span className="font-bold text-gray-700">{p.name}</span>
                                        <span className="font-mono font-bold text-red-600">{p.credits} 节</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4 text-gray-400 text-sm">
                                目前所有球员课时充足
                            </div>
                        )}
                    </div>
                )}

                {/* Birthday Alert */}
                <div className="bg-white rounded-xl shadow-sm border-l-4 border-pink-500 p-4">
                     <div className="flex justify-between items-center mb-3">
                         <h3 className="font-bold flex items-center text-gray-800">
                             <Cake className="w-5 h-5 mr-2 text-pink-500" />
                             近期生日
                         </h3>
                         <span className="text-xs font-bold bg-pink-100 text-pink-700 px-2 py-0.5 rounded">{stats.upcomingBirthdays.length} 人</span>
                    </div>
                    {stats.upcomingBirthdays.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {stats.upcomingBirthdays.map(p => (
                                <span key={p.id} className="bg-pink-50 text-pink-700 px-2 py-1 rounded text-xs font-bold border border-pink-100 flex items-center">
                                    {p.name} ({p.daysUntil === 0 ? '今天' : `${p.daysUntil}天后`})
                                </span>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-4 text-gray-400 text-sm">
                            近期（7天内）无球员生日
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column: Announcements Board */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center">
                        <Megaphone className="w-5 h-5 mr-2 text-bvb-yellow" />
                        俱乐部公告栏
                    </h3>
                    {isDirector ? (
                        <button 
                            onClick={showAnnounceForm ? handleCancelEdit : () => setShowAnnounceForm(true)}
                            className="text-xs flex items-center bg-white border border-gray-300 hover:border-bvb-yellow px-3 py-1.5 rounded-lg font-bold transition-all shadow-sm"
                        >
                            {showAnnounceForm ? <X className="w-3 h-3 mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                            {showAnnounceForm ? (editingAnnouncementId ? '取消编辑' : '取消发布') : '发布公告'}
                        </button>
                    ) : (
                        <span className="text-xs text-gray-400 flex items-center bg-gray-100 px-2 py-1 rounded">
                             <Lock className="w-3 h-3 mr-1" /> 仅总监可发布
                        </span>
                    )}
                </div>
                
                {/* Add/Edit Form (Only if allowed) */}
                {showAnnounceForm && isDirector && (
                    <div className="p-4 bg-yellow-50 border-b border-yellow-100 animate-in slide-in-from-top-2">
                        <form onSubmit={handleAddAnnouncementSubmit} className="space-y-3">
                            <div className="flex gap-3">
                                <input 
                                    placeholder="公告标题..." 
                                    className="flex-1 p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bvb-yellow"
                                    value={newAnnouncement.title}
                                    onChange={e => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                                    required
                                />
                                <select 
                                    className="p-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-bvb-yellow"
                                    value={newAnnouncement.type}
                                    onChange={e => setNewAnnouncement({...newAnnouncement, type: e.target.value as any})}
                                >
                                    <option value="info">普通通知</option>
                                    <option value="urgent">紧急/重要</option>
                                </select>
                            </div>
                            <textarea 
                                placeholder="公告详情内容..." 
                                rows={2}
                                className="w-full p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bvb-yellow"
                                value={newAnnouncement.content}
                                onChange={e => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                                required
                            />
                            <div className="flex justify-end gap-2">
                                <button type="submit" className="px-4 py-1.5 bg-bvb-black text-white text-xs font-bold rounded hover:bg-gray-800 flex items-center">
                                    <Send className="w-3 h-3 mr-1" /> {editingAnnouncementId ? '更新公告' : '发布'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* List */}
                <div className="flex-1 overflow-y-auto max-h-[300px] p-4 space-y-3 custom-scrollbar">
                    {announcements.length > 0 ? (
                        announcements.map(item => {
                            const isNew = item.date === new Date().toISOString().split('T')[0];
                            return (
                                <div key={item.id} className={`relative group border border-gray-100 rounded-lg p-3 hover:shadow-md transition-shadow bg-white ${isNew ? 'ring-1 ring-blue-100' : ''}`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-2">
                                            {item.type === 'urgent' && <Bell className="w-4 h-4 text-red-500 fill-current" />}
                                            <h4 className={`font-bold text-sm ${item.type === 'urgent' ? 'text-red-600' : 'text-gray-800'}`}>
                                                {item.title}
                                            </h4>
                                            {item.type === 'urgent' && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">重要</span>}
                                            {isNew && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold animate-pulse">New</span>}
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] text-gray-400 font-mono">{item.date}</span>
                                            {item.author && <span className="text-[9px] text-gray-300">By {item.author}</span>}
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600 leading-relaxed pl-6 md:pl-0">{item.content}</p>
                                    
                                    {isDirector && (
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleEditAnnouncementClick(item)}
                                                className="p-1.5 text-gray-300 hover:text-bvb-black hover:bg-gray-100 rounded"
                                                title="编辑"
                                            >
                                                <Edit2 className="w-3 h-3" />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteAnnouncementSubmit(item.id)}
                                                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded"
                                                title="删除"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-10 text-gray-400 text-sm italic">
                            暂无公告信息
                        </div>
                    )}
                </div>
            </div>
        </div>
        
        {/* Attendance Analysis Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 border-b border-gray-100 pb-4">
                <h3 className="text-xl font-bold text-gray-800 flex items-center">
                    <Activity className="w-6 h-6 mr-2 text-bvb-yellow" />
                    训练出勤与课时分析
                </h3>
                {/* Filters */}
                <div className="flex flex-wrap gap-2 items-center justify-end">
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button onClick={() => handleRangeChange('month')} className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${attendanceRange === 'month' ? 'bg-white shadow text-bvb-black' : 'text-gray-500'}`}>近1月</button>
                        <button onClick={() => handleRangeChange('quarter')} className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${attendanceRange === 'quarter' ? 'bg-white shadow text-bvb-black' : 'text-gray-500'}`}>本季度</button>
                        <button onClick={() => handleRangeChange('custom')} className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${attendanceRange === 'custom' ? 'bg-white shadow text-bvb-black' : 'text-gray-500'}`}>自定义</button>
                    </div>
                    
                    {attendanceRange === 'custom' && (
                        <div className="flex gap-1 items-center bg-gray-50 px-2 py-1 rounded border border-gray-200">
                            <input type="date" className="text-xs bg-transparent outline-none font-bold text-gray-600" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} />
                            <span className="text-gray-400">-</span>
                            <input type="date" className="text-xs bg-transparent outline-none font-bold text-gray-600" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} />
                        </div>
                    )}

                    <select 
                        value={attendanceTeamId}
                        onChange={e => setAttendanceTeamId(e.target.value)}
                        className="text-xs p-2 bg-gray-100 rounded-lg border-none outline-none font-bold text-gray-600 focus:ring-2 focus:ring-bvb-yellow"
                    >
                        <option value="all">所有梯队</option>
                        {displayTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>

                    <select 
                        value={attendancePlayerId}
                        onChange={e => setAttendancePlayerId(e.target.value)}
                        className="text-xs p-2 bg-gray-100 rounded-lg border-none outline-none font-bold text-gray-600 focus:ring-2 focus:ring-bvb-yellow max-w-[120px]"
                    >
                        <option value="all">全体球员</option>
                        {teamPlayersList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>

                    <button 
                        onClick={handleExportPDF} 
                        disabled={isExporting}
                        className="p-2 bg-gray-800 text-bvb-yellow rounded-lg hover:bg-gray-700 transition-colors"
                        title="导出报表"
                    >
                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4"/>}
                    </button>
                </div>
            </div>

            {/* Conditional Content: Individual OR Overview */}
            {attendancePlayerId !== 'all' && individualReport ? (
                /* --- Individual View --- */
                <div className="space-y-6 animate-in fade-in">
                    {/* Header Card */}
                    <div className="bg-gray-50 rounded-xl p-4 flex justify-between items-center border border-gray-100">
                        <div className="flex items-center gap-4">
                            <img src={individualReport.player.image} className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm" />
                            <div>
                                <h3 className="text-lg font-black text-gray-800">{individualReport.player.name}</h3>
                                <p className="text-xs text-gray-500">#{individualReport.player.number} • {individualReport.player.position}</p>
                            </div>
                        </div>
                        <div className="flex gap-4 text-center">
                            <div><div className="text-xs text-gray-400 font-bold uppercase">出勤率</div><div className="text-2xl font-black text-gray-800">{individualReport.stats.rate}%</div></div>
                            <div><div className="text-xs text-gray-400 font-bold uppercase">训练课</div><div className="text-2xl font-black text-gray-800">{individualReport.stats.total}</div></div>
                            <div><div className="text-xs text-gray-400 font-bold uppercase">实到</div><div className="text-2xl font-black text-green-600">{individualReport.stats.present}</div></div>
                            {isDirector && (
                                <div><div className="text-xs text-gray-400 font-bold uppercase">课时余额</div><div className={`text-2xl font-black ${individualReport.player.credits <= 2 ? 'text-red-500' : 'text-gray-800'}`}>{individualReport.player.credits}</div></div>
                            )}
                        </div>
                    </div>

                    {/* Detailed Session Table */}
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 font-bold text-gray-600 text-xs uppercase">
                                <tr>
                                    <th className="px-4 py-3">日期</th>
                                    <th className="px-4 py-3">训练主题</th>
                                    <th className="px-4 py-3">重点</th>
                                    <th className="px-4 py-3 text-center">状态</th>
                                    {isDirector && <th className="px-4 py-3 text-right">课时变动</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {individualReport.sessions.length > 0 ? individualReport.sessions.map(s => (
                                    <tr key={s.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-mono text-xs">{s.date}</td>
                                        <td className="px-4 py-3 font-bold">{s.title}</td>
                                        <td className="px-4 py-3 text-xs text-gray-500">{s.focus}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                s.status === 'Present' ? 'bg-green-100 text-green-700' :
                                                s.status === 'Leave' ? 'bg-yellow-100 text-yellow-700' :
                                                s.status === 'Injury' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                                            }`}>
                                                {s.status === 'Present' ? '实到' : s.status === 'Leave' ? '请假' : s.status === 'Injury' ? '伤停' : '缺席'}
                                            </span>
                                        </td>
                                        {isDirector && (
                                            <td className={`px-4 py-3 text-right font-mono font-bold ${s.creditChange < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                                {s.creditChange}
                                            </td>
                                        )}
                                    </tr>
                                )) : (
                                    <tr><td colSpan={isDirector ? 5 : 4} className="text-center py-8 text-gray-400">该时段无训练记录</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* --- Overview View --- */
                <div className="space-y-6">
                    {/* Chart */}
                    <div className="h-64 w-full">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} unit="%" />
                                    <Tooltip 
                                        cursor={{ fill: '#f9fafb' }} 
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="rate" fill="#FDE100" radius={[4, 4, 0, 0]} barSize={20} name="出勤率" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50 rounded-lg">
                                暂无出勤数据
                            </div>
                        )}
                    </div>

                    {/* Team Stats Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-center">
                            <span className="text-xs text-gray-400 font-bold uppercase">区间平均出勤率</span>
                            <div className="text-2xl font-black text-gray-800">{averageRate}%</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-center">
                            <span className="text-xs text-gray-400 font-bold uppercase">统计训练场次</span>
                            <div className="text-2xl font-black text-gray-800">{chartData.reduce((acc, curr) => acc + (curr as any).rate > 0 ? 1 : 0, 0)} <span className="text-xs font-normal">周/次</span></div>
                        </div>
                    </div>

                    {/* Players Table */}
                    <div className="overflow-x-auto rounded-lg border border-gray-200 max-h-[400px]">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 font-bold text-gray-600 text-xs uppercase sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3">球员</th>
                                    <th className="px-4 py-3">出勤率</th>
                                    <th className="px-4 py-3 text-center">实到</th>
                                    <th className="px-4 py-3 text-center">请假</th>
                                    <th className="px-4 py-3 text-center">伤停</th>
                                    {isDirector && <th className="px-4 py-3 text-right">课时余额</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {exportPlayersData.map(p => (
                                    <tr key={p.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-bold flex items-center">
                                            <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: p.rate >= 90 ? '#16a34a' : p.rate >= 75 ? '#eab308' : '#ef4444' }}></div>
                                            {p.name}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                    <div className="h-full bg-bvb-black" style={{ width: `${p.rate}%` }}></div>
                                                </div>
                                                <span className="text-xs font-mono">{p.rate}%</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center font-bold text-green-600">{p.present}</td>
                                        <td className="px-4 py-3 text-center text-yellow-600">{p.leave}</td>
                                        <td className="px-4 py-3 text-center text-red-500">{p.injury}</td>
                                        {isDirector && (
                                            <td className={`px-4 py-3 text-right font-black font-mono ${p.credits <= 2 ? 'text-red-500' : 'text-gray-800'}`}>
                                                {p.credits}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {exportPlayersData.length === 0 && <tr><td colSpan={isDirector ? 6 : 5} className="text-center py-8 text-gray-400">无数据</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>

      </div>
      
      {/* Hidden Export Templates */}
      <div id="attendance-report-export" className="absolute left-[-9999px] top-0 w-[1100px] bg-white text-black p-12 z-[-1000] font-sans">
          <div className="flex justify-between items-center border-b-4 border-bvb-yellow pb-6 mb-8">
             <div>
                 <h1 className="text-4xl font-black uppercase tracking-tighter">顽石之光足球俱乐部</h1>
                 <p className="text-xl text-gray-500 font-bold mt-1">训练出勤与课时统计</p>
             </div>
             <div className="text-right">
                 <div className="text-sm font-bold text-gray-400 uppercase">统计周期</div>
                 <div className="text-xl font-black">{customStartDate} ~ {customEndDate}</div>
             </div>
          </div>
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 border-b-2 border-gray-300">
              <tr>
                 <th className="p-3 font-black text-sm uppercase">球员姓名</th>
                 <th className="p-3 font-black text-sm uppercase">所属梯队</th>
                 <th className="p-3 font-black text-sm uppercase text-center">出勤率</th>
                 <th className="p-3 font-black text-sm uppercase text-center">实到次数</th>
                 <th className="p-3 font-black text-sm uppercase text-center">请假次数</th>
                 {isDirector && <th className="p-3 font-black text-sm uppercase text-right">剩余课时</th>}
              </tr>
            </thead>
            <tbody>
              {exportPlayersData.map((p, idx) => {
                 const teamName = teams.find(t => t.id === p.teamId)?.name || '未知';
                 return (
                     <tr key={p.id} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="p-3 font-bold">{p.name}</td>
                        <td className="p-3 text-gray-600">{teamName}</td>
                        <td className="p-3 text-center">{p.rate}%</td>
                        <td className="p-3 text-center">{p.present}</td>
                        <td className="p-3 text-center">{p.leave}</td>
                        {isDirector && <td className="p-3 text-right font-mono font-bold">{p.credits}</td>}
                     </tr>
                 );
              })}
            </tbody>
          </table>
          <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-400 flex justify-between">
              <span>生成日期: {new Date().toLocaleDateString()}</span>
              <span>CONFIDENTIAL INTERNAL REPORT</span>
          </div>
      </div>

      {individualReport && (
          <div id="individual-attendance-export" className="absolute left-[-9999px] top-0 w-[1100px] bg-white text-black p-12 z-[-1000] font-sans">
              <div className="flex justify-between items-center border-b-4 border-bvb-yellow pb-6 mb-8">
                 <div>
                     <h1 className="text-4xl font-black uppercase tracking-tighter">{individualReport.player.name}</h1>
                     <p className="text-xl text-gray-500 font-bold mt-1">个人训练考勤详单</p>
                 </div>
                 <div className="text-right">
                     {isDirector && <div className="text-2xl font-black">课时余额: {individualReport.player.credits}</div>}
                     <div className="text-sm font-bold text-gray-400 uppercase">{customStartDate} ~ {customEndDate}</div>
                 </div>
              </div>
              <div className="grid grid-cols-4 gap-4 mb-8 bg-gray-50 p-4 rounded border border-gray-200">
                  <div className="text-center"><div className="text-sm text-gray-500">总课次</div><div className="text-xl font-black">{individualReport.stats.total}</div></div>
                  <div className="text-center"><div className="text-sm text-gray-500">实到</div><div className="text-xl font-black">{individualReport.stats.present}</div></div>
                  <div className="text-center"><div className="text-sm text-gray-500">请假</div><div className="text-xl font-black">{individualReport.stats.leave}</div></div>
                  <div className="text-center"><div className="text-sm text-gray-500">出勤率</div><div className="text-xl font-black">{individualReport.stats.rate}%</div></div>
              </div>
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-100 border-b-2 border-gray-300">
                  <tr>
                     <th className="p-3 font-black text-sm uppercase">日期</th>
                     <th className="p-3 font-black text-sm uppercase">训练内容</th>
                     <th className="p-3 font-black text-sm uppercase text-center">状态</th>
                     {isDirector && <th className="p-3 font-black text-sm uppercase text-right">课时扣除</th>}
                  </tr>
                </thead>
                <tbody>
                  {individualReport.sessions.map((s, idx) => (
                         <tr key={s.id} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                            <td className="p-3 font-mono">{s.date}</td>
                            <td className="p-3">
                                <div className="font-bold">{s.title}</div>
                                <div className="text-xs text-gray-500">{s.focus}</div>
                            </td>
                            <td className="p-3 text-center">{s.status === 'Present' ? '实到' : s.status}</td>
                            {isDirector && <td className="p-3 text-right font-mono">{s.creditChange}</td>}
                         </tr>
                  ))}
                </tbody>
              </table>
          </div>
      )}

    </div>
  );
};

export default Dashboard;
