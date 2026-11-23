import React, { useState, useMemo, useEffect } from 'react';
import {
  TrainingSession,
  Team,
  Player,
  AttendanceRecord,
  User,
  TeamLog,
  TeamLogCategory,
} from '../types';
import {
  Calendar as CalendarIcon,
  Clock,
  Loader2,
  CheckCircle,
  Plus,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  X,
  AlertCircle,
  FileText,
  ShieldCheck,
  Target,
  Star,
  Brain,
  History,
  Search,
  Users as UsersIcon,
  Download,
  Edit2,
  Trash2,
  Quote,
  BookOpen,
  MessageSquare,
  Sparkles,
  RotateCcw,
  PenTool,
  TrendingUp,
} from 'lucide-react';
import { exportToPDF } from '../services/pdfService';

interface TrainingLogsHubProps {
  teams: Team[];
  availableTeams: Team[];
  players: Player[];
  sessions: TrainingSession[];
  teamLogs: TeamLog[];
  currentUser: User | null;
  users: User[];
  statsTeamFilter: string;
  onChangeTeamFilter: (teamId: string) => void;
  currentDate: Date;
  onChangeCurrentDate: (date: Date) => void;
  timeScope: 'month' | 'quarter' | 'year';
  dateLabel: string;
  initialLogSubFilter?: string;
  onOpenSessionLog: (session: TrainingSession) => void;
  onCreateSessionOnDate: (date: string, teamId?: string) => void;
  onUpdateTraining: (session: TrainingSession, attendance: AttendanceRecord[]) => void;
  onAddTeamLog: (log: TeamLog) => void;
  onUpdateTeamLog: (log: TeamLog) => void;
  onDeleteTeamLog: (logId: string) => void;
  getLogOperatorName: (s: TrainingSession, usersList?: User[]) => string;
  getCheckInAssistantNames: (s: TrainingSession, usersList?: User[]) => string;
}

const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getWeekdayLabel = (dateStr: string): string => {
  const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const d = parseLocalDate(dateStr);
  return names[d.getDay()] || '';
};

const isNewPlayerThisMonth = (player: Player): boolean => {
  if (!player.joinDate) return false;
  const parts = player.joinDate.split('-');
  if (parts.length < 2) return false;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const today = new Date();
  return y === today.getFullYear() && m === today.getMonth() + 1;
};

const calculateFocusStats = (playerId: string, allSessions: TrainingSession[]) => {
  const today = new Date();
  const curYear = today.getFullYear();
  const curMonth = today.getMonth();
  const curQuarter = Math.floor(curMonth / 3);

  const playerSessions = allSessions.filter((s) => s.focusedPlayerIds?.includes(playerId));
  const stats = { month: 0, quarter: 0, year: 0 };

  playerSessions.forEach((s) => {
    const d = parseLocalDate(s.date);
    if (d.getFullYear() === curYear) {
      stats.year++;
      if (d.getMonth() === curMonth) stats.month++;
      if (Math.floor(d.getMonth() / 3) === curQuarter) stats.quarter++;
    }
  });

  return stats;
};

const TEAM_LOG_CATEGORY_META: Record<
  TeamLogCategory,
  { label: string; badgeClass: string; borderClass: string }
> = {
  daily: {
    label: '日常训练总结',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-200',
    borderClass: 'border-l-amber-500',
  },
  training: {
    label: '专项训练随笔',
    badgeClass: 'bg-sky-100 text-sky-900 border-sky-200',
    borderClass: 'border-l-sky-500',
  },
  management: {
    label: '梯队管理与纪律',
    badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-200',
    borderClass: 'border-l-indigo-500',
  },
  match: {
    label: '赛后复盘',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-200',
    borderClass: 'border-l-rose-500',
  },
  parent: {
    label: '家长沟通反馈',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    borderClass: 'border-l-emerald-500',
  },
  evaluation: {
    label: '阶段评估',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-200',
    borderClass: 'border-l-purple-500',
  },
  other: {
    label: '其他记录',
    badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
    borderClass: 'border-l-gray-400',
  },
};

const getRatingDisplay = (v?: number) => {
  const val = v ?? 5;
  if (val <= 3) return { label: '较差', cls: 'bg-red-50 text-red-700 border-red-200' };
  if (val <= 5) return { label: '一般', cls: 'bg-yellow-50 text-yellow-800 border-yellow-200' };
  if (val <= 8) return { label: '良好', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
  return { label: '优秀', cls: 'bg-green-50 text-green-700 border-green-200' };
};

export const TrainingLogsHub: React.FC<TrainingLogsHubProps> = ({
  teams,
  availableTeams,
  players,
  sessions,
  teamLogs,
  currentUser,
  users,
  statsTeamFilter,
  onChangeTeamFilter,
  currentDate,
  onChangeCurrentDate,
  timeScope,
  dateLabel,
  initialLogSubFilter,
  onOpenSessionLog,
  onCreateSessionOnDate,
  onUpdateTraining,
  onAddTeamLog,
  onUpdateTeamLog,
  onDeleteTeamLog,
  getLogOperatorName,
  getCheckInAssistantNames,
}) => {
  const isDirector = currentUser?.role === 'director';
  const isCoach = currentUser?.role === 'coach';
  const isAssistant = currentUser?.role === 'assistant_coach';

  // 主子模式切换：球队训练日志（按球队/日期） vs 球员关注追踪（按球员）
  const [hubMode, setHubMode] = useState<'team_logs' | 'player_focus'>('team_logs');

  // 球队训练日志子视图状态
  const [selectedLogDate, setSelectedLogDate] = useState<string | null>(null);
  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [logStatusFilter, setLogStatusFilter] = useState<
    'all' | 'has_content' | 'pending' | 'reviewed' | 'team_logs_only' | 'sessions_only'
  >(() => (initialLogSubFilter === 'pending_logs' ? 'pending' : 'all'));

  // 当外部 initialLogSubFilter 为 pending_logs 时切到待审核筛选
  useEffect(() => {
    if (initialLogSubFilter === 'pending_logs') {
      setHubMode('team_logs');
      setLogStatusFilter('pending');
      setSelectedLogDate(null);
    }
  }, [initialLogSubFilter]);

  // 书写/编辑球队日志弹窗状态
  const [showTeamLogModal, setShowTeamLogModal] = useState(false);
  const [editingTeamLog, setEditingTeamLog] = useState<TeamLog | null>(null);
  const [logFormTeamId, setLogFormTeamId] = useState<string>('');
  const [logFormDate, setLogFormDate] = useState<string>(getLocalDateString());
  const [logFormCategory, setLogFormCategory] = useState<TeamLogCategory>('daily');
  const [logFormTitle, setLogFormTitle] = useState('');
  const [logFormContent, setLogFormContent] = useState('');
  const [logFormHighlights, setLogFormHighlights] = useState('');
  const [logFormIssues, setLogFormIssues] = useState('');
  const [logFormPlayerIds, setLogFormPlayerIds] = useState<string[]>([]);
  const [logFormPlayerSearch, setLogFormPlayerSearch] = useState('');

  // 总监对球队日志的快捷批注状态
  const [commentingLogId, setCommentingLogId] = useState<string | null>(null);
  const [directorCommentDraft, setDirectorCommentDraft] = useState('');

  // 球员关注追踪状态（按球员查看关注内容）
  const [focusSearchTerm, setFocusSearchTerm] = useState('');
  const [focusListMode, setFocusListMode] = useState<'focused' | 'unfocused'>('focused');
  const [selectedFocusPlayerId, setSelectedFocusPlayerId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // 当前管理范围的球队日志
  const userManagedTeamLogs = useMemo(() => {
    if (isDirector || !currentUser?.teamIds || currentUser.teamIds.length === 0) return teamLogs;
    return teamLogs.filter((l) => currentUser?.teamIds?.includes(l.teamId));
  }, [teamLogs, currentUser, isDirector]);

  // 计算当前时间范围起止（跟随顶部 currentDate + timeScope）
  const { startDate, endDate } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    if (timeScope === 'month') {
      return {
        startDate: new Date(year, month, 1),
        endDate: new Date(year, month + 1, 0, 23, 59, 59, 999),
      };
    }
    if (timeScope === 'quarter') {
      const qStart = Math.floor(month / 3) * 3;
      return {
        startDate: new Date(year, qStart, 1),
        endDate: new Date(year, qStart + 3, 0, 23, 59, 59, 999),
      };
    }
    return {
      startDate: new Date(year, 0, 1),
      endDate: new Date(year, 11, 31, 23, 59, 59, 999),
    };
  }, [currentDate, timeScope]);

  // 当前时间范围 + 球队筛选下的训练课次和球队日志（供日历标点与日期索引使用）
  const scopedSessionsByTeamAndPeriod = useMemo(() => {
    return sessions
      .filter((s) => {
        const d = parseLocalDate(s.date);
        const matchDate = d >= startDate && d <= endDate;
        const matchTeam = statsTeamFilter === 'all' || s.teamId === statsTeamFilter;
        return matchDate && matchTeam;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [sessions, startDate, endDate, statsTeamFilter]);

  const scopedTeamLogsByTeamAndPeriod = useMemo(() => {
    return userManagedTeamLogs
      .filter((l) => {
        const d = parseLocalDate(l.date);
        const matchDate = d >= startDate && d <= endDate;
        const matchTeam = statsTeamFilter === 'all' || l.teamId === statsTeamFilter;
        return matchDate && matchTeam;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [userManagedTeamLogs, startDate, endDate, statsTeamFilter]);

  // 当月全量事件（供左侧迷你月历显示标记点）
  const calendarMonthSessionsMap = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const map: Record<string, TrainingSession[]> = {};
    sessions.forEach((s) => {
      if (statsTeamFilter !== 'all' && s.teamId !== statsTeamFilter) return;
      const d = parseLocalDate(s.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        if (!map[s.date]) map[s.date] = [];
        map[s.date].push(s);
      }
    });
    return map;
  }, [sessions, statsTeamFilter, currentDate]);

  const calendarMonthTeamLogsMap = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const map: Record<string, TeamLog[]> = {};
    userManagedTeamLogs.forEach((l) => {
      if (statsTeamFilter !== 'all' && l.teamId !== statsTeamFilter) return;
      const d = parseLocalDate(l.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        if (!map[l.date]) map[l.date] = [];
        map[l.date].push(l);
      }
    });
    return map;
  }, [userManagedTeamLogs, statsTeamFilter, currentDate]);

  // 搜索与状态过滤后的课次与球队日志
  const filteredSessionsForLog = useMemo(() => {
    if (logStatusFilter === 'team_logs_only') return [];
    const q = logSearchTerm.trim().toLowerCase();

    return scopedSessionsForFilter(scopedSessionsByTeamAndPeriod).filter((s) => {
      if (logStatusFilter === 'pending' && s.submissionStatus !== 'Submitted') return false;
      if (logStatusFilter === 'reviewed' && s.submissionStatus !== 'Reviewed') return false;
      if (logStatusFilter === 'has_content') {
        const hasAny =
          Boolean(s.planReflection && s.planReflection.trim()) ||
          Boolean(s.coachFeedback && s.coachFeedback.trim()) ||
          Boolean(s.directorReview && s.directorReview.trim()) ||
          Boolean(s.focusedPlayerIds && s.focusedPlayerIds.length > 0) ||
          s.submissionStatus === 'Submitted' ||
          s.submissionStatus === 'Reviewed';
        if (!hasAny) return false;
      }

      if (!q) return true;
      const teamName = teams.find((t) => t.id === s.teamId)?.name || '';
      const coachName = getLogOperatorName(s, users);
      const focusPlayersText = (s.focusedPlayerIds || [])
        .map((pid) => {
          const p = players.find((pl) => pl.id === pid);
          const note = s.focusedPlayerNotes?.[pid];
          return `${p?.name || ''} ${note?.technical || ''} ${note?.mental || ''}`;
        })
        .join(' ');
      const haystack = `${s.title || ''} ${s.focus || ''} ${s.planReflection || ''} ${s.coachFeedback || ''} ${s.directorReview || ''} ${teamName} ${coachName} ${focusPlayersText}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [
    scopedSessionsByTeamAndPeriod,
    logStatusFilter,
    logSearchTerm,
    teams,
    users,
    players,
    getLogOperatorName,
  ]);

  function scopedSessionsForFilter(list: TrainingSession[]) {
    return list;
  }

  const filteredTeamLogsForView = useMemo(() => {
    if (logStatusFilter === 'sessions_only' || logStatusFilter === 'pending' || logStatusFilter === 'reviewed') {
      if (logStatusFilter === 'sessions_only') return [];
      // pending / reviewed filter applies to session submission status
      return [];
    }
    const q = logSearchTerm.trim().toLowerCase();
    return scopedTeamLogsByTeamAndPeriod.filter((l) => {
      if (!q) return true;
      const teamName = teams.find((t) => t.id === l.teamId)?.name || '';
      const relatedNames = (l.relatedPlayerIds || [])
        .map((pid) => players.find((p) => p.id === pid)?.name || '')
        .join(' ');
      const haystack = `${l.title || ''} ${l.content || ''} ${l.highlights || ''} ${l.issuesAndNextSteps || ''} ${l.authorName || ''} ${l.directorComment || ''} ${teamName} ${relatedNames}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [scopedTeamLogsByTeamAndPeriod, logStatusFilter, logSearchTerm, teams, players]);

  // 左侧日期索引汇总（按日期聚合）
  const dateIndexEntries = useMemo(() => {
    const dateMap: Record<
      string,
      {
        date: string;
        sessions: TrainingSession[];
        teamLogs: TeamLog[];
        teamNames: string[];
        hasPending: boolean;
      }
    > = {};

    const ensureEntry = (d: string) => {
      if (!dateMap[d]) {
        dateMap[d] = {
          date: d,
          sessions: [],
          teamLogs: [],
          teamNames: [],
          hasPending: false,
        };
      }
      return dateMap[d];
    };

    filteredSessionsForLog.forEach((s) => {
      const entry = ensureEntry(s.date);
      entry.sessions.push(s);
      if (s.submissionStatus === 'Submitted') entry.hasPending = true;
      const tName = teams.find((t) => t.id === s.teamId)?.name;
      if (tName && !entry.teamNames.includes(tName)) entry.teamNames.push(tName);
    });

    filteredTeamLogsForView.forEach((l) => {
      const entry = ensureEntry(l.date);
      entry.teamLogs.push(l);
      const tName = teams.find((t) => t.id === l.teamId)?.name;
      if (tName && !entry.teamNames.includes(tName)) entry.teamNames.push(tName);
    });

    return Object.values(dateMap).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredSessionsForLog, filteredTeamLogsForView, teams]);

  // 右侧实际展示的日期列表（若选定具体日期，则只显示该日期；否则显示全部匹配日期）
  const visibleDateGroups = useMemo(() => {
    if (!selectedLogDate) return dateIndexEntries;
    const matched = dateIndexEntries.filter((e) => e.date === selectedLogDate);
    if (matched.length > 0) return matched;
    return [
      {
        date: selectedLogDate,
        sessions: [],
        teamLogs: [],
        teamNames: [],
        hasPending: false,
      },
    ];
  }, [dateIndexEntries, selectedLogDate]);

  // ============================================
  // 球员关注追踪子模块数据（保留原有完整功能）
  // ============================================
  const focusedPlayersSummary = useMemo(() => {
    const focusMap: Record<
      string,
      {
        player: Player;
        stats: { month: number; quarter: number; year: number };
        history: { id: string; date: string; title: string; notes: { technical: string; mental: string; resolved?: boolean }; session: TrainingSession }[];
        isLastWeekFocused: boolean;
        hasUnresolved: boolean;
      }
    > = {};
    const relevantTrainings = sessions.filter(
      (s) => statsTeamFilter === 'all' || s.teamId === statsTeamFilter
    );

    const today = new Date();
    const day = today.getDay();
    const diffToLastMonday = (day === 0 ? 6 : day - 1) + 7;
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - diffToLastMonday);
    lastMonday.setHours(0, 0, 0, 0);
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    lastSunday.setHours(23, 59, 59, 999);

    relevantTrainings.forEach((s) => {
      if (s.focusedPlayerIds) {
        const sessionDate = parseLocalDate(s.date);
        const inLastWeek = sessionDate >= lastMonday && sessionDate <= lastSunday;

        s.focusedPlayerIds.forEach((pid) => {
          const notes = s.focusedPlayerNotes?.[pid] || {
            technical: '',
            mental: '',
            resolved: false,
          };
          if (!focusMap[pid]) {
            const p = players.find((pl) => pl.id === pid);
            if (p) {
              focusMap[pid] = {
                player: p,
                stats: calculateFocusStats(pid, sessions),
                history: [],
                isLastWeekFocused: false,
                hasUnresolved: false,
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
              notes,
              session: s,
            });
          }
        });
      }
    });

    return Object.values(focusMap)
      .filter((entry) => entry.player.name.includes(focusSearchTerm))
      .sort((a, b) => {
        if (a.isLastWeekFocused !== b.isLastWeekFocused) return a.isLastWeekFocused ? -1 : 1;
        if (a.hasUnresolved !== b.hasUnresolved) return a.hasUnresolved ? -1 : 1;
        return b.stats.year - a.stats.year;
      });
  }, [sessions, players, focusSearchTerm, statsTeamFilter]);

  const focusedPlayerIdsThisMonth = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const focused = new Set<string>();
    sessions.forEach((s) => {
      const sessionDate = parseLocalDate(s.date);
      if (sessionDate >= startOfMonth && sessionDate <= endOfMonth && s.focusedPlayerIds) {
        s.focusedPlayerIds.forEach((pid) => focused.add(pid));
      }
    });
    return focused;
  }, [sessions]);

  const monthlyFocusStats = useMemo(() => {
    const teamPlayers = players.filter((p) =>
      statsTeamFilter === 'all'
        ? isDirector || !currentUser?.teamIds || currentUser.teamIds.length === 0
          ? p.teamId !== 'unassigned'
          : availableTeams.some((at) => at.id === p.teamId)
        : p.teamId === statsTeamFilter
    );
    if (teamPlayers.length === 0) {
      return { coverage: 0, focusedCount: 0, totalCount: 0, unfocusedPlayers: [] as Player[] };
    }

    const focusedInMonthForTeam = new Set<string>();
    teamPlayers.forEach((p) => {
      if (focusedPlayerIdsThisMonth.has(p.id)) {
        focusedInMonthForTeam.add(p.id);
      }
    });

    const unfocusedPlayers = teamPlayers
      .filter((p) => !focusedInMonthForTeam.has(p.id))
      .filter((p) => p.name.includes(focusSearchTerm));
    const focusedCount = focusedInMonthForTeam.size;
    const totalCount = teamPlayers.length;
    const coverage = totalCount > 0 ? (focusedCount / totalCount) * 100 : 0;

    return { coverage, focusedCount, totalCount, unfocusedPlayers };
  }, [
    players,
    statsTeamFilter,
    focusSearchTerm,
    focusedPlayerIdsThisMonth,
    availableTeams,
    currentUser,
    isDirector,
  ]);

  const unresolvedFocusCount = useMemo(
    () => focusedPlayersSummary.filter((e) => e.hasUnresolved).length,
    [focusedPlayersSummary]
  );

  // ============================================
  // 书写/编辑球队日志 Handlers
  // ============================================
  const canWriteTeamLog = isDirector || isCoach || isAssistant;

  const openNewTeamLogModal = (prefillDate?: string, prefillTeamId?: string) => {
    const defaultTeamId =
      prefillTeamId ||
      (statsTeamFilter !== 'all' ? statsTeamFilter : availableTeams[0]?.id || teams[0]?.id || '');
    const defaultDate = prefillDate || selectedLogDate || getLocalDateString();
    setEditingTeamLog(null);
    setLogFormTeamId(defaultTeamId);
    setLogFormDate(defaultDate);
    setLogFormCategory('daily');
    setLogFormTitle('');
    setLogFormContent('');
    setLogFormHighlights('');
    setLogFormIssues('');
    setLogFormPlayerIds([]);
    setLogFormPlayerSearch('');
    setShowTeamLogModal(true);
  };

  const openEditTeamLogModal = (log: TeamLog) => {
    setEditingTeamLog(log);
    setLogFormTeamId(log.teamId);
    setLogFormDate(log.date);
    setLogFormCategory(log.category || 'daily');
    setLogFormTitle(log.title || '');
    setLogFormContent(log.content || '');
    setLogFormHighlights(log.highlights || '');
    setLogFormIssues(log.issuesAndNextSteps || '');
    setLogFormPlayerIds(log.relatedPlayerIds || []);
    setLogFormPlayerSearch('');
    setShowTeamLogModal(true);
  };

  const handleSaveTeamLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logFormTeamId) {
      alert('请选择所属梯队/球队');
      return;
    }
    if (!logFormDate) {
      alert('请选择日志日期');
      return;
    }
    if (!logFormContent.trim()) {
      alert('请填写日志正文内容');
      return;
    }

    const nowIso = new Date().toISOString();
    const catLabel = TEAM_LOG_CATEGORY_META[logFormCategory]?.label || '球队日志';
    const finalTitle = logFormTitle.trim() || `${logFormDate} ${catLabel}`;

    if (editingTeamLog) {
      const updated: TeamLog = {
        ...editingTeamLog,
        teamId: logFormTeamId,
        date: logFormDate,
        category: logFormCategory,
        title: finalTitle,
        content: logFormContent.trim(),
        highlights: logFormHighlights.trim() || undefined,
        issuesAndNextSteps: logFormIssues.trim() || undefined,
        relatedPlayerIds: logFormPlayerIds.length > 0 ? logFormPlayerIds : undefined,
        updatedAt: nowIso,
      };
      onUpdateTeamLog(updated);
    } else {
      const created: TeamLog = {
        id: `tlog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        teamId: logFormTeamId,
        date: logFormDate,
        category: logFormCategory,
        title: finalTitle,
        content: logFormContent.trim(),
        highlights: logFormHighlights.trim() || undefined,
        issuesAndNextSteps: logFormIssues.trim() || undefined,
        relatedPlayerIds: logFormPlayerIds.length > 0 ? logFormPlayerIds : undefined,
        authorId: currentUser?.id,
        authorName: currentUser?.name || '教练员',
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      onAddTeamLog(created);
    }

    // 同步切换月历到保存的日期所在月份（若用户选择了不同月份的日期），并选中该日期方便立即看到
    const savedDateObj = parseLocalDate(logFormDate);
    if (
      savedDateObj.getFullYear() !== currentDate.getFullYear() ||
      savedDateObj.getMonth() !== currentDate.getMonth()
    ) {
      onChangeCurrentDate(savedDateObj);
    }
    setSelectedLogDate(logFormDate);
    setShowTeamLogModal(false);
  };

  const handleSaveDirectorComment = (log: TeamLog) => {
    if (!directorCommentDraft.trim()) return;
    onUpdateTeamLog({
      ...log,
      directorComment: directorCommentDraft.trim(),
      directorCommentBy: currentUser?.name || '青训总监',
      directorCommentAt: getLocalDateString(),
      updatedAt: new Date().toISOString(),
    });
    setCommentingLogId(null);
    setDirectorCommentDraft('');
  };

  const jumpToPlayerFocus = (playerId: string) => {
    setSelectedFocusPlayerId(playerId);
    const hasHistory = focusedPlayersSummary.some((e) => e.player.id === playerId);
    setFocusListMode(hasHistory ? 'focused' : 'unfocused');
    setHubMode('player_focus');
  };

  // ============================================
  // 渲染：左侧月历日期选择器
  // ============================================
  const renderMiniDatePicker = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDay = new Date(year, month, 1).getDay();
    const todayStr = getLocalDateString();

    const cells: React.ReactNode[] = [];
    for (let i = 0; i < startDay; i++) {
      cells.push(<div key={`empty-${i}`} className="h-10 rounded-lg bg-gray-50/40" />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const daySessions = calendarMonthSessionsMap[dateStr] || [];
      const dayTeamLogs = calendarMonthTeamLogsMap[dateStr] || [];
      const hasSession = daySessions.length > 0;
      const hasTeamLog = dayTeamLogs.length > 0;
      const hasPending = daySessions.some((s) => s.submissionStatus === 'Submitted');
      const isSelected = selectedLogDate === dateStr;
      const isToday = dateStr === todayStr;

      cells.push(
        <button
          key={dateStr}
          type="button"
          onClick={() => setSelectedLogDate(isSelected ? null : dateStr)}
          title={`${dateStr}${hasSession ? ` · ${daySessions.length}节训练` : ''}${hasTeamLog ? ` · ${dayTeamLogs.length}篇球队日志` : ''}`}
          className={`h-10 rounded-xl flex flex-col items-center justify-center relative transition-all cursor-pointer border ${
            isSelected
              ? 'bg-bvb-black text-bvb-yellow border-bvb-black shadow-md scale-[1.03]'
              : isToday
              ? 'bg-yellow-50 text-bvb-black border-bvb-yellow font-black'
              : hasSession || hasTeamLog
              ? 'bg-white text-gray-800 border-gray-200 hover:border-bvb-yellow hover:bg-yellow-50/40'
              : 'bg-white/60 text-gray-400 border-transparent hover:bg-gray-100'
          }`}
        >
          <span className={`text-xs leading-none ${isSelected || isToday || hasSession || hasTeamLog ? 'font-black' : 'font-semibold'}`}>
            {d}
          </span>
          {(hasSession || hasTeamLog) && (
            <div className="flex items-center gap-0.5 mt-1">
              {hasSession && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    hasPending
                      ? 'bg-blue-500 animate-pulse'
                      : isSelected
                      ? 'bg-bvb-yellow'
                      : 'bg-sky-500'
                  }`}
                />
              )}
              {hasTeamLog && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSelected ? 'bg-amber-300' : 'bg-amber-500'
                  }`}
                />
              )}
            </div>
          )}
        </button>
      );
    }

    const weekHeaders = ['日', '一', '二', '三', '四', '五', '六'];

    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="w-4 h-4 text-bvb-yellow" />
            <span className="text-xs font-black text-gray-800">
              {year}年 {month + 1}月
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const prev = new Date(currentDate);
                prev.setMonth(prev.getMonth() - 1);
                onChangeCurrentDate(prev);
              }}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 cursor-pointer"
              title="上个月"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                onChangeCurrentDate(now);
                setSelectedLogDate(getLocalDateString(now));
              }}
              className="px-2 py-0.5 text-[10px] font-black bg-gray-100 hover:bg-yellow-100 text-gray-700 rounded-md cursor-pointer transition-colors"
            >
              今天
            </button>
            <button
              type="button"
              onClick={() => {
                const next = new Date(currentDate);
                next.setMonth(next.getMonth() + 1);
                onChangeCurrentDate(next);
              }}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 cursor-pointer"
              title="下个月"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {weekHeaders.map((w) => (
            <div key={w} className="text-[10px] font-black text-gray-400 py-1">
              {w}
            </div>
          ))}
          {cells}
        </div>

        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-500 font-bold">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" /> 训练课次
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> 球队日志
            </span>
          </div>
          {selectedLogDate && (
            <button
              type="button"
              onClick={() => setSelectedLogDate(null)}
              className="text-bvb-black hover:underline font-black flex items-center gap-0.5 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> 看全部
            </button>
          )}
        </div>
      </div>
    );
  };

  // ============================================
  // 渲染：视角 A - 球队训练日志（按球队 · 日期查看与书写）
  // ============================================
  const renderTeamLogsView = () => {
    const activeTeamObj =
      statsTeamFilter !== 'all' ? teams.find((t) => t.id === statsTeamFilter) : null;

    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        {/* 球队快速筛选 + 搜索 + 写日志 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* 按球队切换胶囊 */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1 shrink-0 flex items-center gap-1">
                <UsersIcon className="w-3.5 h-3.5 text-bvb-yellow" /> 球队:
              </span>
              <button
                type="button"
                onClick={() => onChangeTeamFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer border ${
                  statsTeamFilter === 'all'
                    ? 'bg-bvb-black text-bvb-yellow border-bvb-black shadow-xs'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
              >
                全部管理梯队
              </button>
              {availableTeams.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onChangeTeamFilter(t.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer border ${
                    statsTeamFilter === t.id
                      ? 'bg-bvb-black text-bvb-yellow border-bvb-black shadow-xs'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>

            {canWriteTeamLog && (
              <button
                type="button"
                onClick={() => openNewTeamLogModal()}
                className="px-4 py-2 bg-bvb-yellow hover:bg-yellow-400 text-bvb-black font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95"
              >
                <PenTool className="w-4 h-4" />
                书写球队日志
              </button>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-3 pt-2 border-t border-gray-100">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={logSearchTerm}
                onChange={(e) => setLogSearchTerm(e.target.value)}
                placeholder="搜索日志标题、训练反思、球队随笔、教练姓名或关联球员..."
                className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-bvb-yellow outline-none transition-all"
              />
              {logSearchTerm && (
                <button
                  type="button"
                  onClick={() => setLogSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { id: 'all', label: '全部日志' },
                { id: 'has_content', label: '已有日志内容' },
                { id: 'team_logs_only', label: '仅球队日志' },
                { id: 'sessions_only', label: '仅训练课次日志' },
                { id: 'pending', label: '待审核' },
                { id: 'reviewed', label: '已审核' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setLogStatusFilter(st.id as typeof logStatusFilter)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black whitespace-nowrap transition-all cursor-pointer border ${
                    logStatusFilter === st.id
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 主体左右双栏：左侧日历+日期索引，右侧日志详情 */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* 左侧：迷你日历 + 日期列表 */}
          <div className="w-full lg:w-[340px] xl:w-[360px] flex flex-col gap-4 shrink-0">
            {renderMiniDatePicker()}

            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-4 h-4 text-bvb-yellow" />
                  日期日志索引 ({dateIndexEntries.length} 天)
                </h4>
                {selectedLogDate && (
                  <button
                    type="button"
                    onClick={() => setSelectedLogDate(null)}
                    className="text-[10px] font-black text-blue-600 hover:underline cursor-pointer"
                  >
                    显示全部日期
                  </button>
                )}
              </div>

              <div className="max-h-[420px] overflow-y-auto custom-scrollbar space-y-2 pr-0.5">
                {dateIndexEntries.length === 0 ? (
                  <div className="py-10 text-center text-gray-400 space-y-2">
                    <FileText className="w-8 h-8 mx-auto opacity-20" />
                    <p className="text-xs font-bold">当前范围暂无匹配日志记录</p>
                  </div>
                ) : (
                  dateIndexEntries.map((entry) => {
                    const isSelected = selectedLogDate === entry.date;
                    const firstSnippet =
                      entry.teamLogs[0]?.title ||
                      entry.sessions[0]?.planReflection ||
                      entry.sessions[0]?.title ||
                      '';
                    return (
                      <button
                        key={entry.date}
                        type="button"
                        onClick={() => setSelectedLogDate(isSelected ? null : entry.date)}
                        className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                          isSelected
                            ? 'bg-bvb-black text-white border-bvb-black shadow-md'
                            : 'bg-gray-50/70 text-gray-800 border-gray-200/80 hover:bg-yellow-50/60 hover:border-bvb-yellow'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-black font-mono ${
                                isSelected ? 'text-bvb-yellow' : 'text-gray-900'
                              }`}
                            >
                              {entry.date}
                            </span>
                            <span
                              className={`text-[10px] font-bold ${
                                isSelected ? 'text-gray-300' : 'text-gray-400'
                              }`}
                            >
                              {getWeekdayLabel(entry.date)}
                            </span>
                            {entry.hasPending && (
                              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" title="含待审核日志" />
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {entry.teamLogs.length > 0 && (
                              <span
                                className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                  isSelected
                                    ? 'bg-amber-400 text-bvb-black'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {entry.teamLogs.length} 球队日志
                              </span>
                            )}
                            {entry.sessions.length > 0 && (
                              <span
                                className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                  isSelected
                                    ? 'bg-white/15 text-white'
                                    : 'bg-sky-100 text-sky-800'
                                }`}
                              >
                                {entry.sessions.length} 课次
                              </span>
                            )}
                          </div>
                        </div>
                        {entry.teamNames.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {entry.teamNames.map((tn) => (
                              <span
                                key={tn}
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                  isSelected ? 'bg-white/10 text-gray-200' : 'bg-white text-gray-600 border border-gray-200'
                                }`}
                              >
                                {tn}
                              </span>
                            ))}
                          </div>
                        )}
                        {firstSnippet && (
                          <p
                            className={`text-[11px] line-clamp-1 ${
                              isSelected ? 'text-gray-300' : 'text-gray-500'
                            }`}
                          >
                            {firstSnippet}
                          </p>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* 右侧：选中日期（或当前范围全部日期）的详细日志内容 */}
          <div className="flex-1 w-full space-y-5 min-w-0">
            {/* 上下文概览头 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-lg bg-bvb-black text-bvb-yellow text-xs font-black">
                    {activeTeamObj ? activeTeamObj.name : '全部管理梯队'}
                  </span>
                  <h3 className="text-base md:text-lg font-black text-gray-900">
                    {selectedLogDate
                      ? `${selectedLogDate} (${getWeekdayLabel(selectedLogDate)}) 训练与球队日志`
                      : `${dateLabel} 日志总览`}
                  </h3>
                </div>
                <p className="text-xs text-gray-500 font-bold mt-1">
                  {selectedLogDate
                    ? `当天共 ${visibleDateGroups[0]?.teamLogs.length || 0} 篇球队日志 · ${visibleDateGroups[0]?.sessions.length || 0} 节训练课次日志`
                    : `当前时段共 ${filteredTeamLogsForView.length} 篇球队日志 · ${filteredSessionsForLog.length} 节训练课次记录`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {selectedLogDate && (
                  <button
                    type="button"
                    onClick={() => setSelectedLogDate(null)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    查看全部日期
                  </button>
                )}
                {canWriteTeamLog && (
                  <button
                    type="button"
                    onClick={() => openNewTeamLogModal(selectedLogDate || undefined)}
                    className="px-3.5 py-2 bg-bvb-yellow hover:bg-yellow-400 text-bvb-black font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    {selectedLogDate ? '在此日写球队日志' : '写球队日志'}
                  </button>
                )}
              </div>
            </div>

            {/* 按日期分组渲染日志内容 */}
            {visibleDateGroups.length === 0 ? (
              <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-12 text-center space-y-4">
                <BookOpen className="w-14 h-14 text-gray-200 mx-auto" />
                <div>
                  <h4 className="text-base font-black text-gray-700">当前筛选范围内暂无日志内容</h4>
                  <p className="text-xs text-gray-400 mt-1">
                    您可以切换上方时间周期、选择其他球队，或直接点击下方按钮书写新的球队日志。
                  </p>
                </div>
                {canWriteTeamLog && (
                  <button
                    type="button"
                    onClick={() => openNewTeamLogModal()}
                    className="px-5 py-2.5 bg-bvb-yellow hover:bg-yellow-400 text-bvb-black font-black text-xs rounded-xl shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <PenTool className="w-4 h-4" /> 立即书写球队日志
                  </button>
                )}
              </div>
            ) : (
              visibleDateGroups.map((group) => {
                const isDayEmpty = group.teamLogs.length === 0 && group.sessions.length === 0;
                return (
                  <div key={group.date} className="space-y-4">
                    {/* 日期分割标头 */}
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-gray-900 text-white text-xs font-black font-mono shadow-2xs">
                          {group.date}
                        </span>
                        <span className="text-xs font-black text-gray-500">
                          {getWeekdayLabel(group.date)}
                        </span>
                      </div>
                      <div className="h-px flex-1 bg-gray-200 mx-3" />
                      <span className="text-[11px] font-bold text-gray-400">
                        {group.teamLogs.length} 球队日志 / {group.sessions.length} 课次
                      </span>
                    </div>

                    {isDayEmpty && (
                      <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center space-y-3">
                        <CalendarIcon className="w-10 h-10 text-gray-200 mx-auto" />
                        <p className="text-xs font-bold text-gray-500">
                          {group.date} 暂无训练课次或球队日志记录
                        </p>
                        <div className="flex items-center justify-center gap-3 flex-wrap">
                          {canWriteTeamLog && (
                            <button
                              type="button"
                              onClick={() => openNewTeamLogModal(group.date)}
                              className="px-4 py-2 bg-bvb-yellow hover:bg-yellow-400 text-bvb-black font-black text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <PenTool className="w-3.5 h-3.5" /> 书写当日球队日志
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              onCreateSessionOnDate(
                                group.date,
                                statsTeamFilter !== 'all' ? statsTeamFilter : undefined
                              )
                            }
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" /> 新建当日训练课次
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 1. 球队日志卡片 */}
                    {group.teamLogs.map((log) => {
                      const teamObj = teams.find((t) => t.id === log.teamId);
                      const catMeta = TEAM_LOG_CATEGORY_META[log.category || 'daily'] || TEAM_LOG_CATEGORY_META.daily;
                      const canEditThisLog =
                        isDirector ||
                        log.authorId === currentUser?.id ||
                        (isCoach && currentUser?.teamIds?.includes(log.teamId));
                      const relatedPlayers = (log.relatedPlayerIds || [])
                        .map((pid) => players.find((p) => p.id === pid))
                        .filter(Boolean) as Player[];

                      return (
                        <div
                          key={log.id}
                          className={`bg-white rounded-2xl border border-gray-200 border-l-4 ${catMeta.borderClass} p-5 shadow-sm hover:shadow-md transition-all space-y-4`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-gray-100 pb-3">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2 py-0.5 rounded-md bg-bvb-black text-bvb-yellow text-[10px] font-black">
                                  球队日志
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-800 text-[10px] font-black border border-gray-200">
                                  {teamObj?.name || '未知梯队'}
                                </span>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${catMeta.badgeClass}`}>
                                  {catMeta.label}
                                </span>
                              </div>
                              <h4 className="text-base md:text-lg font-black text-gray-900">
                                {log.title}
                              </h4>
                              <div className="flex items-center gap-3 text-[11px] text-gray-400 font-bold">
                                <span className="flex items-center gap-1">
                                  <UserCheck className="w-3.5 h-3.5 text-amber-500" />
                                  记录人: <span className="text-gray-700">{log.authorName}</span>
                                </span>
                                <span>•</span>
                                <span className="font-mono">{log.date}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-start">
                              {isDirector && commentingLogId !== log.id && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCommentingLogId(log.id);
                                    setDirectorCommentDraft(log.directorComment || '');
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-black flex items-center gap-1 cursor-pointer"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  {log.directorComment ? '修改批注' : '总监批注'}
                                </button>
                              )}
                              {canEditThisLog && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openEditTeamLogModal(log)}
                                    className="p-1.5 rounded-lg text-gray-500 hover:text-bvb-black hover:bg-gray-100 cursor-pointer"
                                    title="编辑球队日志"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (window.confirm('确定要删除这篇球队日志吗？')) {
                                        onDeleteTeamLog(log.id);
                                      }
                                    }}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                    title="删除球队日志"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="bg-gray-50/70 rounded-xl p-4 border border-gray-100 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                            {log.content}
                          </div>

                          {(log.highlights || log.issuesAndNextSteps) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {log.highlights && (
                                <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 space-y-1">
                                  <div className="text-[10px] font-black text-emerald-700 uppercase flex items-center gap-1">
                                    <Sparkles className="w-3.5 h-3.5" /> 亮点与进步
                                  </div>
                                  <p className="text-xs text-emerald-950 whitespace-pre-wrap leading-relaxed">
                                    {log.highlights}
                                  </p>
                                </div>
                              )}
                              {log.issuesAndNextSteps && (
                                <div className="bg-orange-50/60 border border-orange-200/80 rounded-xl p-3 space-y-1">
                                  <div className="text-[10px] font-black text-orange-700 uppercase flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5" /> 待改进与后续安排
                                  </div>
                                  <p className="text-xs text-orange-950 whitespace-pre-wrap leading-relaxed">
                                    {log.issuesAndNextSteps}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {relatedPlayers.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap pt-1">
                              <span className="text-[10px] font-black text-gray-400 uppercase">关联球员:</span>
                              {relatedPlayers.map((rp) => (
                                <button
                                  key={rp.id}
                                  type="button"
                                  onClick={() => jumpToPlayerFocus(rp.id)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 text-[11px] font-black text-gray-800 transition-colors cursor-pointer"
                                  title="点击跳转到该球员的关注记录"
                                >
                                  <img
                                    src={rp.image}
                                    alt={rp.name}
                                    className="w-4 h-4 rounded-full object-cover"
                                  />
                                  <span>#{rp.number} {rp.name}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* 总监批注区 */}
                          {commentingLogId === log.id ? (
                            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 space-y-2">
                              <label className="text-[10px] font-black text-amber-800 uppercase flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5" /> 填写总监批注
                              </label>
                              <textarea
                                value={directorCommentDraft}
                                onChange={(e) => setDirectorCommentDraft(e.target.value)}
                                placeholder="输入对本篇球队日志的意见与建议..."
                                className="w-full p-2.5 bg-white border border-amber-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-bvb-yellow h-20 resize-none"
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setCommentingLogId(null)}
                                  className="px-3 py-1 rounded-lg bg-white border border-gray-200 text-xs font-bold text-gray-600 cursor-pointer"
                                >
                                  取消
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveDirectorComment(log)}
                                  className="px-3 py-1 rounded-lg bg-bvb-black text-bvb-yellow text-xs font-black cursor-pointer"
                                >
                                  保存批注
                                </button>
                              </div>
                            </div>
                          ) : (
                            log.directorComment && (
                              <div className="bg-yellow-50/40 border border-bvb-yellow/40 rounded-xl p-3.5 flex items-start gap-2.5">
                                <Quote className="w-4 h-4 text-bvb-yellow shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                  <div className="text-[10px] font-black text-amber-800 uppercase flex items-center gap-1.5">
                                    <span>总监批注 ({log.directorCommentBy || '青训总监'})</span>
                                    {log.directorCommentAt && (
                                      <span className="font-mono text-gray-400">{log.directorCommentAt}</span>
                                    )}
                                  </div>
                                  <p className="text-xs font-bold text-gray-800 italic leading-relaxed">
                                    {log.directorComment}
                                  </p>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      );
                    })}

                    {/* 2. 训练课次日志卡片 */}
                    {group.sessions.map((s) => {
                      const teamObj = teams.find((t) => t.id === s.teamId);
                      const logCoach = getLogOperatorName(s, users);
                      const assistantNames = getCheckInAssistantNames(s, users);
                      const presentCount =
                        s.attendance?.filter((r) => r.status === 'Present').length || 0;
                      const leaveCount =
                        s.attendance?.filter((r) => r.status === 'Leave').length || 0;
                      const injuryCount =
                        s.attendance?.filter((r) => r.status === 'Injury').length || 0;
                      const focusedIds = s.focusedPlayerIds || [];
                      const ratings = s.performanceRatings;

                      const canEditSession =
                        isDirector ||
                        (isCoach && currentUser?.teamIds?.includes(s.teamId)) ||
                        (isAssistant && currentUser?.teamIds?.includes(s.teamId));

                      const statusBadge =
                        s.submissionStatus === 'Reviewed' ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-green-100 text-green-800 border border-green-200 text-[10px] font-black flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> 已审核
                          </span>
                        ) : s.submissionStatus === 'Submitted' ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-black flex items-center gap-1 animate-pulse">
                            <FileText className="w-3 h-3" /> 待审核
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 text-[10px] font-black">
                            草稿 / 未提交
                          </span>
                        );

                      return (
                        <div
                          key={s.id}
                          className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all space-y-4 ${
                            s.submissionStatus === 'Submitted'
                              ? 'border-blue-300 ring-1 ring-blue-100'
                              : 'border-gray-200'
                          }`}
                        >
                          {/* 头部信息 */}
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 border-b border-gray-100 pb-3.5">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-900 border border-sky-200 text-[10px] font-black">
                                  课次训练日志
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-gray-900 text-bvb-yellow text-[10px] font-black">
                                  {teamObj?.name || '未知梯队'}
                                </span>
                                {statusBadge}
                                <span
                                  className={`text-[10px] font-black px-2 py-0.5 rounded border ${
                                    s.intensity === 'High'
                                      ? 'bg-red-50 text-red-700 border-red-200'
                                      : s.intensity === 'Medium'
                                      ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
                                      : 'bg-green-50 text-green-700 border-green-200'
                                  }`}
                                >
                                  强度: {s.intensity === 'High' ? '高' : s.intensity === 'Medium' ? '中' : '低'}
                                </span>
                              </div>
                              <h4 className="text-base md:text-lg font-black text-gray-900">
                                {s.title || s.focus || '训练课次'}
                              </h4>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500 font-bold">
                                <span className="flex items-center gap-1">
                                  <Target className="w-3.5 h-3.5 text-bvb-yellow" /> 主题: {s.focus || '-'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-gray-400" /> {s.duration || 90} 分钟
                                </span>
                                <span className="flex items-center gap-1">
                                  <UserCheck className="w-3.5 h-3.5 text-amber-500" /> 录入教练: {logCoach}
                                </span>
                                <span className="flex items-center gap-1">
                                  <UsersIcon className="w-3.5 h-3.5 text-blue-500" /> 助教: {assistantNames}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => onOpenSessionLog(s)}
                                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer ${
                                  isDirector && s.submissionStatus === 'Submitted'
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                    : 'bg-bvb-black hover:bg-gray-800 text-bvb-yellow'
                                }`}
                              >
                                <PenTool className="w-3.5 h-3.5" />
                                {isDirector && s.submissionStatus === 'Submitted'
                                  ? '审核此课次日志'
                                  : canEditSession
                                  ? s.planReflection
                                    ? '查看 / 编辑日志'
                                    : '补写课次日志'
                                  : '查看完整课次'}
                              </button>
                              <div className="flex items-center gap-2 text-[10px] font-black">
                                <span className="text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                                  实到 {presentCount}
                                </span>
                                {leaveCount > 0 && (
                                  <span className="text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded border border-yellow-100">
                                    请假 {leaveCount}
                                  </span>
                                )}
                                {injuryCount > 0 && (
                                  <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                                    伤停 {injuryCount}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* 一、整体训练表现评级 */}
                          {ratings && (
                            <div className="space-y-2">
                              <div className="text-[11px] font-black text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                <TrendingUp className="w-3.5 h-3.5 text-bvb-yellow" /> 一、整体训练表现
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {[
                                  { key: 'technical', label: '技术执行质量', val: ratings.technical },
                                  { key: 'application', label: '比赛运用效果', val: ratings.application },
                                  { key: 'focus', label: '球员专注度', val: ratings.focus },
                                  { key: 'discipline', label: '球队纪律性', val: ratings.discipline },
                                ].map((item) => {
                                  const badge = getRatingDisplay(item.val);
                                  return (
                                    <div
                                      key={item.key}
                                      className="bg-gray-50 rounded-xl px-3 py-2 border border-gray-100 flex items-center justify-between gap-2"
                                    >
                                      <span className="text-[11px] font-bold text-gray-600 truncate">
                                        {item.label}
                                      </span>
                                      <span
                                        className={`text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 ${badge.cls}`}
                                      >
                                        {badge.label}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* 二、教案反思评价 */}
                          <div className="space-y-1.5">
                            <div className="text-[11px] font-black text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-indigo-500" /> 二、教案反思与训练总结
                            </div>
                            {s.planReflection?.trim() || s.coachFeedback?.trim() ? (
                              <div className="bg-gray-50/80 rounded-xl p-3.5 border border-gray-100 text-xs md:text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                                {s.planReflection?.trim() || s.coachFeedback?.trim()}
                              </div>
                            ) : (
                              <div className="bg-gray-50/50 rounded-xl p-3 border border-dashed border-gray-200 text-xs text-gray-400 italic flex items-center justify-between">
                                <span>暂未填写本节训练的教案反思与总结</span>
                                {canEditSession && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenSessionLog(s)}
                                    className="text-bvb-black font-black not-italic hover:underline cursor-pointer"
                                  >
                                    立即填写 →
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* 三、本课重点关注球员反馈 */}
                          {focusedIds.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-[11px] font-black text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Star className="w-3.5 h-3.5 text-bvb-yellow fill-current" /> 三、重点关注球员反馈 ({focusedIds.length} 人)
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {focusedIds.map((pid) => {
                                  const fp = players.find((p) => p.id === pid);
                                  if (!fp) return null;
                                  const note = s.focusedPlayerNotes?.[pid] || {
                                    technical: '',
                                    mental: '',
                                    resolved: false,
                                  };
                                  return (
                                    <div
                                      key={pid}
                                      className="bg-yellow-50/40 border border-yellow-200/80 rounded-xl p-3 space-y-2"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <button
                                          type="button"
                                          onClick={() => jumpToPlayerFocus(fp.id)}
                                          className="flex items-center gap-2 hover:underline cursor-pointer text-left"
                                          title="点击在「球员关注」中查看该球员全部跟踪轨迹"
                                        >
                                          <img
                                            src={fp.image}
                                            alt={fp.name}
                                            className="w-7 h-7 rounded-full object-cover border border-white shadow-2xs"
                                          />
                                          <span className="text-xs font-black text-gray-900">
                                            {fp.name}
                                          </span>
                                          <span className="text-[10px] font-mono text-gray-400">
                                            #{fp.number}
                                          </span>
                                        </button>
                                        {note.resolved ? (
                                          <span className="text-[9px] font-black text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                                            已解决
                                          </span>
                                        ) : (
                                          <span className="text-[9px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                                            未解决
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[11px] space-y-1 text-gray-700">
                                        <div>
                                          <span className="font-black text-amber-800">技术: </span>
                                          <span>{note.technical || '暂无技术评价'}</span>
                                        </div>
                                        <div>
                                          <span className="font-black text-indigo-700">心理/态度: </span>
                                          <span>{note.mental || '暂无心理评价'}</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* 四、总监审核意见 */}
                          {s.directorReview && (
                            <div className="bg-yellow-50/30 border border-bvb-yellow/40 rounded-xl p-3.5 flex items-start gap-2.5">
                              <ShieldCheck className="w-4 h-4 text-bvb-yellow shrink-0 mt-0.5" />
                              <div className="space-y-1">
                                <div className="text-[10px] font-black text-amber-800 uppercase">
                                  总监审核意见
                                </div>
                                <p className="text-xs font-bold text-gray-800 italic leading-relaxed">
                                  {s.directorReview}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // 渲染：视角 B - 球员关注追踪（按球员查看关注内容）
  // ============================================
  const renderPlayerFocusView = () => {
    const selectedFocusedEntry = focusedPlayersSummary.find(
      (e) => e.player.id === selectedFocusPlayerId
    );
    const selectedPlayerFallback = selectedFocusPlayerId
      ? players.find((p) => p.id === selectedFocusPlayerId)
      : null;

    // 该球员在球队日志中被关联提及的记录
    const relatedTeamLogsForPlayer = selectedFocusPlayerId
      ? userManagedTeamLogs
          .filter((l) => l.relatedPlayerIds?.includes(selectedFocusPlayerId))
          .sort((a, b) => b.date.localeCompare(a.date))
      : [];

    return (
      <div className="flex flex-col lg:flex-row h-full gap-6 animate-in fade-in duration-300">
        {/* 左侧：球员关注列表 */}
        <div className="w-full lg:w-96 flex flex-col gap-4 shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  本月关注覆盖率
                </p>
                <h3 className="text-2xl font-black text-bvb-black">
                  {monthlyFocusStats.coverage.toFixed(0)}%
                </h3>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  已关注 / 总人数
                </p>
                <p className="text-sm font-black text-gray-600">
                  {monthlyFocusStats.focusedCount} / {monthlyFocusStats.totalCount}
                </p>
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
              type="button"
              onClick={() => setFocusListMode('focused')}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer ${
                focusListMode === 'focused'
                  ? 'bg-white text-bvb-black shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              关注历史 ({focusedPlayersSummary.length})
            </button>
            <button
              type="button"
              onClick={() => setFocusListMode('unfocused')}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer ${
                focusListMode === 'unfocused'
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
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
              onChange={(e) => setFocusSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex-1 max-h-[560px] overflow-y-auto custom-scrollbar space-y-2 pb-4">
            {focusListMode === 'focused'
              ? focusedPlayersSummary.map((entry) => {
                  const isSelected = selectedFocusPlayerId === entry.player.id;
                  return (
                    <div
                      key={entry.player.id}
                      onClick={() => setSelectedFocusPlayerId(entry.player.id)}
                      className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer relative group ${
                        isSelected
                          ? 'bg-bvb-black border-bvb-black text-white shadow-lg'
                          : 'bg-white border-gray-100 text-gray-800 hover:border-bvb-yellow/50'
                      } ${
                        entry.isLastWeekFocused && !isSelected
                          ? 'ring-1 ring-green-400 ring-offset-1'
                          : ''
                      }`}
                    >
                      {entry.isLastWeekFocused && (
                        <div className="absolute -top-1.5 -right-1.5 bg-green-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-sm z-10 animate-bounce">
                          上周关注
                        </div>
                      )}
                      {entry.hasUnresolved && (
                        <div
                          className={`absolute -top-1.5 left-2 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-sm z-10 ${
                            isSelected ? 'bg-red-600 ring-1 ring-white' : 'bg-red-500'
                          }`}
                        >
                          未解决
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <img
                            src={entry.player.image}
                            alt={entry.player.name}
                            className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm"
                          />
                          <div className="absolute -bottom-1 -right-1 p-0.5 bg-bvb-yellow rounded-full border border-white">
                            <Star className="w-2 h-2 text-bvb-black fill-current" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-xs truncate flex items-center gap-1.5">
                            <span>{entry.player.name}</span>
                            {isNewPlayerThisMonth(entry.player) && (
                              <span
                                className={`text-[8px] font-black px-1.5 py-0.5 rounded border inline-flex items-center ${
                                  isSelected
                                    ? 'bg-amber-950/40 text-amber-300 border-amber-800'
                                    : 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse'
                                }`}
                              >
                                新入队
                              </span>
                            )}
                          </h4>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
                            #{entry.player.number} •{' '}
                            {teams.find((t) => t.id === entry.player.teamId)?.name}
                          </p>
                        </div>
                        <ChevronRight
                          className={`w-4 h-4 transition-transform ${
                            isSelected
                              ? 'text-bvb-yellow'
                              : 'text-gray-300 group-hover:translate-x-1'
                          }`}
                        />
                      </div>
                      <div
                        className={`grid grid-cols-3 gap-1 mt-2 pt-2 border-t ${
                          isSelected ? 'border-white/10' : 'border-gray-50'
                        }`}
                      >
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
                          <p
                            className={`text-xs font-black tabular-nums ${
                              isSelected ? 'text-bvb-yellow' : 'text-bvb-black'
                            }`}
                          >
                            {entry.stats.year}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              : monthlyFocusStats.unfocusedPlayers.map((player) => {
                  const isSelected = selectedFocusPlayerId === player.id;
                  return (
                    <div
                      key={player.id}
                      onClick={() => setSelectedFocusPlayerId(player.id)}
                      className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer relative group ${
                        isSelected
                          ? 'bg-bvb-black border-bvb-black text-white shadow-lg'
                          : 'bg-white border-gray-100 text-gray-800 hover:border-bvb-yellow/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <img
                            src={player.image}
                            alt={player.name}
                            className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm"
                          />
                          <div className="absolute -bottom-1 -right-1 p-0.5 bg-gray-200 rounded-full border border-white">
                            <UsersIcon className="w-2 h-2 text-gray-500" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-xs truncate flex items-center gap-1.5">
                            <span>{player.name}</span>
                            {isNewPlayerThisMonth(player) && (
                              <span
                                className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${
                                  isSelected
                                    ? 'bg-amber-950/40 text-amber-300 border-amber-800'
                                    : 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse'
                                }`}
                              >
                                新入队
                              </span>
                            )}
                          </h4>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
                            #{player.number} • {teams.find((t) => t.id === player.teamId)?.name}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0 select-none">
                          <div className="text-[8px] font-black uppercase text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                            本月未关注
                          </div>
                          {isNewPlayerThisMonth(player) && (
                            <span
                              className={`text-[7px] font-black px-1.5 py-0.5 rounded-full border tracking-wider uppercase animate-pulse ${
                                isSelected
                                  ? 'bg-amber-400 text-bvb-black border-transparent'
                                  : 'bg-amber-500 text-white border-transparent'
                              }`}
                            >
                              重点关注 ⭐
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            {focusListMode === 'focused' && focusedPlayersSummary.length === 0 && (
              <div className="py-16 text-center text-gray-400 flex flex-col items-center gap-4">
                <History className="w-12 h-12 opacity-10" />
                <p className="text-xs font-black uppercase tracking-widest">暂无重点关注球员记录</p>
              </div>
            )}
            {focusListMode === 'unfocused' && monthlyFocusStats.unfocusedPlayers.length === 0 && (
              <div className="py-16 text-center text-green-500 flex flex-col items-center gap-4">
                <CheckCircle className="w-12 h-12 opacity-20" />
                <p className="text-xs font-black uppercase tracking-widest">本月已完成全员关注覆盖</p>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：球员成长追踪时间轴 */}
        <div className="flex-1 flex flex-col bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm min-h-[460px]">
          {selectedFocusedEntry ? (
            (() => {
              const entry = selectedFocusedEntry;
              const history = [...entry.history].sort((a, b) => b.date.localeCompare(a.date));
              return (
                <>
                  <div className="p-6 md:p-8 bg-gray-50 border-b flex justify-between items-end shrink-0 gap-4">
                    <div className="flex items-center gap-5">
                      <img
                        src={entry.player.image}
                        alt={entry.player.name}
                        className="w-20 h-20 rounded-3xl object-cover border-4 border-white shadow-xl rotate-[-2deg]"
                      />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-2xl font-black text-gray-800">{entry.player.name}</h3>
                          <Star className="w-5 h-5 text-bvb-yellow fill-current" />
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                          {teams.find((t) => t.id === entry.player.teamId)?.name || ''} • #
                          {entry.player.number}
                        </p>
                        <div className="flex gap-4 mt-4">
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-gray-400 uppercase">
                              年度关注频次
                            </span>
                            <span className="text-lg font-black text-bvb-black">
                              {entry.stats.year} 次
                            </span>
                          </div>
                          <div className="w-px h-8 bg-gray-200" />
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-gray-400 uppercase">
                              最后关注日期
                            </span>
                            <span className="text-lg font-black text-gray-800">
                              {history[0]?.date || '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        setIsExporting(true);
                        try {
                          await exportToPDF(
                            'focus-tracking-export',
                            `${entry.player.name}_重点关注成长报告`
                          );
                        } catch {
                          alert('导出失败');
                        } finally {
                          setIsExporting(false);
                        }
                      }}
                      className="hidden md:flex items-center gap-2 px-6 py-2.5 bg-bvb-black text-white font-black rounded-xl hover:bg-gray-800 shadow-lg transition-all text-xs italic uppercase tracking-widest cursor-pointer"
                    >
                      {isExporting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 text-bvb-yellow" />
                      )}
                      Export Profile
                    </button>
                  </div>

                  <div
                    id="focus-tracking-export"
                    className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar space-y-8"
                  >
                    <div className="relative space-y-8">
                      <div className="absolute left-[23px] top-4 bottom-4 w-1 bg-gray-100 rounded-full" />
                      {history.map((h, idx) => (
                        <div
                          key={h.id}
                          className="relative pl-14 animate-in slide-in-from-left-4"
                          style={{ animationDelay: `${idx * 60}ms` }}
                        >
                          <div className="absolute left-0 top-0 w-12 h-12 bg-white rounded-2xl border-4 border-gray-50 shadow-md flex items-center justify-center z-10">
                            <span className="text-[10px] font-black text-gray-400 font-mono leading-none">
                              {h.date.split('-').slice(1).join('/')}
                            </span>
                          </div>
                          <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-6 hover:bg-white hover:shadow-md transition-all group">
                            <div className="flex flex-wrap justify-between items-start gap-2 mb-4">
                              <div>
                                <h5 className="font-black text-lg text-gray-800 group-hover:text-bvb-black transition-colors">
                                  {h.title}
                                </h5>
                                <span className="text-[10px] text-gray-400 font-mono font-bold">
                                  {h.date}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
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
                                    type="button"
                                    onClick={() => {
                                      const updatedSession = { ...h.session };
                                      if (
                                        updatedSession.focusedPlayerNotes &&
                                        updatedSession.focusedPlayerNotes[entry.player.id]
                                      ) {
                                        updatedSession.focusedPlayerNotes = {
                                          ...updatedSession.focusedPlayerNotes,
                                          [entry.player.id]: {
                                            ...updatedSession.focusedPlayerNotes[entry.player.id],
                                            resolved: true,
                                          },
                                        };
                                        onUpdateTraining(
                                          updatedSession,
                                          updatedSession.attendance
                                        );
                                      }
                                    }}
                                    className="flex items-center gap-1 text-[10px] font-black text-bvb-black uppercase bg-bvb-yellow px-2 py-1 rounded border border-bvb-black/10 hover:bg-yellow-400 transition-colors cursor-pointer"
                                  >
                                    标记已解决
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => onOpenSessionLog(h.session)}
                                  className="text-[10px] font-black text-gray-500 hover:text-bvb-black bg-white px-2.5 py-1 rounded border border-gray-200 cursor-pointer"
                                >
                                  查看课次日志
                                </button>
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

                    {relatedTeamLogsForPlayer.length > 0 && (
                      <div className="pt-6 border-t border-gray-100 space-y-3">
                        <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-amber-500" /> 球队日志中的相关提及 (
                          {relatedTeamLogsForPlayer.length})
                        </h4>
                        <div className="space-y-2">
                          {relatedTeamLogsForPlayer.map((tl) => (
                            <div
                              key={tl.id}
                              onClick={() => {
                                setSelectedLogDate(tl.date);
                                setHubMode('team_logs');
                              }}
                              className="p-3.5 bg-amber-50/40 hover:bg-amber-50 border border-amber-200/70 rounded-2xl cursor-pointer transition-all space-y-1"
                            >
                              <div className="flex items-center justify-between text-xs font-black text-gray-800">
                                <span>{tl.title}</span>
                                <span className="font-mono text-[10px] text-gray-500">{tl.date}</span>
                              </div>
                              <p className="text-xs text-gray-600 line-clamp-2">{tl.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              );
            })()
          ) : selectedPlayerFallback ? (
            <div className="flex-1 p-6 md:p-10 space-y-6">
              <div className="flex items-center gap-5 border-b border-gray-100 pb-6">
                <img
                  src={selectedPlayerFallback.image}
                  alt={selectedPlayerFallback.name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-gray-200"
                />
                <div>
                  <h3 className="text-xl font-black text-gray-900">{selectedPlayerFallback.name}</h3>
                  <p className="text-xs font-bold text-gray-500 mt-0.5">
                    #{selectedPlayerFallback.number} •{' '}
                    {teams.find((t) => t.id === selectedPlayerFallback.teamId)?.name || '未知梯队'}
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-6 text-center space-y-2">
                <Star className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-sm font-black text-gray-700">该球员本月暂无重点关注课次记录</p>
                <p className="text-xs text-gray-500">
                  在“新建训练计划”或编辑“训练课次”时将其选为重点关注球员，即可在此持续追踪技术与心理反馈。
                </p>
              </div>
              {relatedTeamLogsForPlayer.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-amber-500" /> 球队日志中的相关提及 (
                    {relatedTeamLogsForPlayer.length})
                  </h4>
                  {relatedTeamLogsForPlayer.map((tl) => (
                    <div
                      key={tl.id}
                      onClick={() => {
                        setSelectedLogDate(tl.date);
                        setHubMode('team_logs');
                      }}
                      className="p-3.5 bg-amber-50/40 hover:bg-amber-50 border border-amber-200/70 rounded-2xl cursor-pointer transition-all space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs font-black text-gray-800">
                        <span>{tl.title}</span>
                        <span className="font-mono text-[10px] text-gray-500">{tl.date}</span>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2">{tl.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-300 p-10">
              <UsersIcon className="w-20 h-20 opacity-10 mb-6" />
              <h4 className="text-xl font-black text-gray-400 uppercase italic tracking-tighter mb-2">
                Focus Player Analytics
              </h4>
              <p className="text-sm font-bold text-center max-w-xs uppercase tracking-widest opacity-60">
                请从左侧列表中选择一名关注球员查看其历史成长轨迹及反馈。
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================
  // 主视图入口：Sub-Tabs + 内容 + 写球队日志弹窗
  // ============================================
  const teamPlayersForForm = useMemo(() => {
    const q = logFormPlayerSearch.trim().toLowerCase();
    return players
      .filter((p) => p.teamId === logFormTeamId)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || String(p.number).includes(q));
  }, [players, logFormTeamId, logFormPlayerSearch]);

  return (
    <div className="space-y-5 flex flex-col h-full">
      {/* 顶部模式切换栏：按球队/日期查看训练日志 vs 按球员查看关注内容 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setHubMode('team_logs')}
            className={`px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
              hubMode === 'team_logs'
                ? 'bg-bvb-black text-bvb-yellow shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>训练与球队日志</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                hubMode === 'team_logs'
                  ? 'bg-bvb-yellow text-bvb-black'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {filteredTeamLogsForView.length + filteredSessionsForLog.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setHubMode('player_focus')}
            className={`px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
              hubMode === 'player_focus'
                ? 'bg-bvb-black text-bvb-yellow shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Star className="w-4 h-4" />
            <span>按球员查看关注内容</span>
            {unresolvedFocusCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500 text-white">
                {unresolvedFocusCount} 待解决
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 px-2 text-xs text-gray-500 font-bold">
          <span>
            {hubMode === 'team_logs'
              ? '按球队与日期浏览课次训练日志，并可随时书写球队日常/管理日志'
              : '按球员追踪课次重点关注评价、技术/心理成长时间轴'}
          </span>
        </div>
      </div>

      {hubMode === 'team_logs' ? renderTeamLogsView() : renderPlayerFocusView()}

      {/* 书写 / 编辑球队日志弹窗 */}
      {showTeamLogModal && (
        <div className="fixed inset-0 z-[120] bg-black/65 backdrop-blur-sm flex items-center justify-center p-0 md:p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-2xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200">
            <div className="bg-bvb-black text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <PenTool className="w-5 h-5 text-bvb-yellow" />
                <div>
                  <h3 className="font-black text-base">
                    {editingTeamLog ? '编辑球队日志' : '书写球队日志'}
                  </h3>
                  <p className="text-[10px] text-gray-400">
                    记录球队整体训练状态、梯队管理事项、沟通反馈或赛后复盘
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTeamLogModal(false)}
                className="text-gray-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveTeamLogSubmit}
              className="flex-1 overflow-y-auto p-5 md:p-6 space-y-4 custom-scrollbar"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-600 mb-1.5">
                    所属梯队 / 球队 *
                  </label>
                  <select
                    value={logFormTeamId}
                    onChange={(e) => {
                      setLogFormTeamId(e.target.value);
                      setLogFormPlayerIds([]);
                    }}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs font-black focus:bg-white focus:ring-2 focus:ring-bvb-yellow outline-none"
                    required
                  >
                    {availableTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-600 mb-1.5">
                    日志日期 *
                  </label>
                  <input
                    type="date"
                    value={logFormDate}
                    onChange={(e) => setLogFormDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs font-mono font-black focus:bg-white focus:ring-2 focus:ring-bvb-yellow outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-600 mb-1.5">日志分类</label>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(TEAM_LOG_CATEGORY_META) as TeamLogCategory[]).map((catKey) => {
                    const meta = TEAM_LOG_CATEGORY_META[catKey];
                    const active = logFormCategory === catKey;
                    return (
                      <button
                        key={catKey}
                        type="button"
                        onClick={() => setLogFormCategory(catKey)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                          active
                            ? 'bg-bvb-black text-bvb-yellow border-bvb-black shadow-xs'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-600 mb-1.5">
                  日志标题 (选填)
                </label>
                <input
                  type="text"
                  value={logFormTitle}
                  onChange={(e) => setLogFormTitle(e.target.value)}
                  placeholder="例：本周高位压迫转换练习执行情况及梯队氛围总结"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-bvb-yellow outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-600 mb-1.5">
                  日志正文内容 *
                </label>
                <textarea
                  value={logFormContent}
                  onChange={(e) => setLogFormContent(e.target.value)}
                  placeholder="详细记录球队当日训练状态、整体执行力、场地/人员出勤情况、管理事项或重要沟通..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm leading-relaxed focus:bg-white focus:ring-2 focus:ring-bvb-yellow outline-none h-36 resize-y"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-emerald-700 mb-1.5">
                    亮点与进步 (选填)
                  </label>
                  <textarea
                    value={logFormHighlights}
                    onChange={(e) => setLogFormHighlights(e.target.value)}
                    placeholder="值得肯定的细节或进步显著的环节..."
                    className="w-full bg-emerald-50/40 border border-emerald-200 rounded-xl p-2.5 text-xs focus:bg-white focus:ring-2 focus:ring-bvb-yellow outline-none h-24 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-orange-700 mb-1.5">
                    存在问题与后续计划 (选填)
                  </label>
                  <textarea
                    value={logFormIssues}
                    onChange={(e) => setLogFormIssues(e.target.value)}
                    placeholder="需要重点跟进的问题、下阶段调整方向..."
                    className="w-full bg-orange-50/40 border border-orange-200 rounded-xl p-2.5 text-xs focus:bg-white focus:ring-2 focus:ring-bvb-yellow outline-none h-24 resize-none"
                  />
                </div>
              </div>

              {/* 关联本队球员（可选） */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-black text-gray-700">
                    关联本队球员 (选填，便于在球员关注页联动查阅)
                  </label>
                  <input
                    type="text"
                    value={logFormPlayerSearch}
                    onChange={(e) => setLogFormPlayerSearch(e.target.value)}
                    placeholder="搜索姓名/球号..."
                    className="w-36 px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-[11px] font-bold outline-none"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar">
                  {teamPlayersForForm.length === 0 ? (
                    <span className="text-[11px] text-gray-400">当前梯队暂无可选球员</span>
                  ) : (
                    teamPlayersForForm.map((p) => {
                      const selected = logFormPlayerIds.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() =>
                            setLogFormPlayerIds((prev) =>
                              selected ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                            )
                          }
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black border transition-all cursor-pointer ${
                            selected
                              ? 'bg-bvb-black text-bvb-yellow border-bvb-black'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-bvb-yellow'
                          }`}
                        >
                          <span>
                            #{p.number} {p.name}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTeamLogModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-bvb-yellow hover:bg-yellow-400 text-bvb-black font-black rounded-xl text-xs shadow-sm cursor-pointer"
                >
                  {editingTeamLog ? '保存修改' : '发布球队日志'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingLogsHub;
