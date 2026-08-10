import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Player, Team, IntramuralTournament, TournamentCategory, IntramuralTeam, IntramuralMatch, PitchFormat, IntramuralMatchGoal, User } from '../types';
import { Trophy, Users, Calendar, Shuffle, Dices, CheckCircle2, Award, Flame, RefreshCw, Plus, Edit3, Settings2, BarChart2, Search, Sparkles, Crown, ChevronRight, X, UserPlus, Flag, Shield, Check, UserX, Lock, Eye, RotateCcw, Trash2, Download, FileSpreadsheet, UserCheck } from 'lucide-react';
import * as XLSX from 'xlsx';

interface IntramuralTournamentProps {
  players: Player[];
  teams: Team[];
  currentUser?: User | null;
}

// Default Category Configuration
const DEFAULT_CATEGORIES: Omit<TournamentCategory, 'id'>[] = [
  { name: 'U7 组别', minBirthDate: '2018-09-01', maxBirthDate: '2019-08-31', pitchFormat: '3人制', tournamentType: 'group_knockout' },
  { name: 'U8 组别', minBirthDate: '2017-09-01', maxBirthDate: '2018-08-31', pitchFormat: '5人制', tournamentType: 'group_knockout' },
  { name: 'U9 组别', minBirthDate: '2016-09-01', maxBirthDate: '2017-08-31', pitchFormat: '5人制', tournamentType: 'group_knockout' },
  { name: 'U10 组别', minBirthDate: '2015-09-01', maxBirthDate: '2016-08-31', pitchFormat: '8人制', tournamentType: 'league', legCount: 1 },
  { name: 'U11 组别', minBirthDate: '2014-09-01', maxBirthDate: '2015-08-31', pitchFormat: '8人制', tournamentType: 'league', legCount: 1 },
  { name: 'U12 组别', minBirthDate: '2013-09-01', maxBirthDate: '2014-08-31', pitchFormat: '8人制', tournamentType: 'group_knockout' },
];

const TEAM_PRESET_COLORS = [
  { name: '红队', bg: 'bg-red-500', text: 'text-red-500', border: 'border-red-500', hex: '#ef4444', badge: 'bg-red-100 text-red-800 border-red-200' },
  { name: '蓝队', bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-500', hex: '#3b82f6', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
  { name: '黄队', bg: 'bg-amber-400', text: 'text-amber-500', border: 'border-amber-400', hex: '#f59e0b', badge: 'bg-amber-100 text-amber-800 border-amber-200' },
  { name: '绿队', bg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-500', hex: '#10b981', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { name: '橙队', bg: 'bg-orange-500', text: 'text-orange-500', border: 'border-orange-500', hex: '#f97316', badge: 'bg-orange-100 text-orange-800 border-orange-200' },
  { name: '紫队', bg: 'bg-purple-500', text: 'text-purple-500', border: 'border-purple-500', hex: '#a855f7', badge: 'bg-purple-100 text-purple-800 border-purple-200' },
  { name: '青队', bg: 'bg-cyan-500', text: 'text-cyan-500', border: 'border-cyan-500', hex: '#06b6d4', badge: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  { name: '黑队', bg: 'bg-gray-800', text: 'text-gray-800', border: 'border-gray-800', hex: '#1f2937', badge: 'bg-gray-200 text-gray-900 border-gray-300' },
];

const TIER_CONFIGS = [
  { name: 'A档', label: 'A档 (种子/顶尖)', badge: 'bg-amber-500 text-white', border: 'border-amber-400', lightBg: 'bg-amber-50/80', textColor: 'text-amber-900' },
  { name: 'B档', label: 'B档 (核心/主力)', badge: 'bg-blue-600 text-white', border: 'border-blue-400', lightBg: 'bg-blue-50/80', textColor: 'text-blue-900' },
  { name: 'C档', label: 'C档 (骨干/轮换)', badge: 'bg-emerald-600 text-white', border: 'border-emerald-400', lightBg: 'bg-emerald-50/80', textColor: 'text-emerald-900' },
  { name: 'D档', label: 'D档 (潜质/新秀)', badge: 'bg-purple-600 text-white', border: 'border-purple-400', lightBg: 'bg-purple-50/80', textColor: 'text-purple-900' },
  { name: 'E档', label: 'E档 (拼搏/保障)', badge: 'bg-rose-500 text-white', border: 'border-rose-400', lightBg: 'bg-rose-50/80', textColor: 'text-rose-900' },
  { name: 'F档', label: 'F档 (预备/补充)', badge: 'bg-cyan-600 text-white', border: 'border-cyan-400', lightBg: 'bg-cyan-50/80', textColor: 'text-cyan-900' },
  { name: 'G档', label: 'G档 (梯队成员)', badge: 'bg-indigo-600 text-white', border: 'border-indigo-400', lightBg: 'bg-indigo-50/80', textColor: 'text-indigo-900' },
  { name: 'H档', label: 'H档 (预备成员)', badge: 'bg-gray-600 text-white', border: 'border-gray-400', lightBg: 'bg-gray-50/80', textColor: 'text-gray-900' },
];

// Helper function: Check if a player belongs to an unassigned team (待分配球队/未指定)
const isUnassignedTeamPlayer = (p: Player, teams: Team[] = []): boolean => {
  if (!p.teamId || p.teamId === 'unassigned' || p.teamId === 'unassigned_team' || p.teamId === 'pending' || p.teamId === 'none' || p.teamId === '0') {
    return true;
  }
  const team = teams.find(t => t.id === p.teamId);
  if (!team) return true; // If team not found or unassigned
  const name = team.name.toLowerCase();
  if (name.includes('待分配') || name.includes('未指定') || name.includes('未归属') || name.includes('待定') || name.includes('未分配') || name.includes('无梯队')) {
    return true;
  }
  return false;
};

export const IntramuralTournamentModule: React.FC<IntramuralTournamentProps> = ({ players, teams }) => {
  // Main state - tournaments list
  const [tournaments, setTournaments] = useState<IntramuralTournament[]>(() => {
    const saved = localStorage.getItem('club_intramural_tournaments_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse tournaments', e);
      }
    }
    // Create initial tournament if none
    const initialId = 'tour_' + Date.now();
    const categoriesWithId: TournamentCategory[] = DEFAULT_CATEGORIES.map((c, i) => ({
      ...c,
      id: `cat_${initialId}_${i}`
    }));
    return [{
      id: initialId,
      title: '2026年夏季顽石之光队内锦标赛',
      createdAt: new Date().toISOString().split('T')[0],
      status: 'active',
      categories: categoriesWithId,
      teams: [],
      matches: []
    }];
  });

  const [activeTournamentId, setActiveTournamentId] = useState<string>(tournaments[0]?.id || '');
  const [activeCategoryId, setActiveCategoryId] = useState<string>('');
  const [activeStep, setActiveStep] = useState<'overview' | 'roster' | 'format' | 'draft' | 'schedule' | 'standings'>('overview');

  // Overview Search & Filters
  const [overviewGroupBy, setOverviewGroupBy] = useState<'club_team' | 'tournament_category'>('club_team');
  const [overviewTeamFilter, setOverviewTeamFilter] = useState<string>('all');
  const [overviewSearch, setOverviewSearch] = useState('');
  const [overviewCategoryFilter, setOverviewCategoryFilter] = useState<string>('all');
  const [overviewStatusFilter, setOverviewStatusFilter] = useState<'all' | 'participating' | 'opt_out'>('all');

  // Search & Filter within active category
  const [playerSearch, setPlayerSearch] = useState('');
  const [playerFilterStatus, setPlayerFilterStatus] = useState<'all' | 'participating' | 'opt_out'>('all');

  // Draft Lottery State
  const [isLotteryAnimating, setIsLotteryAnimating] = useState(false);
  const [lotteryHighlightedPlayer, setLotteryHighlightedPlayer] = useState<Player | null>(null);
  const [lotteryMessage, setLotteryMessage] = useState<string>('');
  const [isTierSetupCollapsed, setIsTierSetupCollapsed] = useState<boolean>(false);

  // Match Result Modal State
  const [editingMatch, setEditingMatch] = useState<IntramuralMatch | null>(null);
  const [editingHomeScore, setEditingHomeScore] = useState<number>(0);
  const [editingAwayScore, setEditingAwayScore] = useState<number>(0);
  const [editingGoals, setEditingGoals] = useState<IntramuralMatchGoal[]>([]);

  // Category Edit & New Modal State
  const [editingCategory, setEditingCategory] = useState<TournamentCategory | null>(null);
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryPitchFormat, setNewCategoryPitchFormat] = useState<PitchFormat>('5人制');
  const [newCategoryMinBirthDate, setNewCategoryMinBirthDate] = useState('2015-01-01');
  const [newCategoryMaxBirthDate, setNewCategoryMaxBirthDate] = useState('2016-12-31');

  const [showNewTournamentModal, setShowNewTournamentModal] = useState(false);
  const [newTournamentTitle, setNewTournamentTitle] = useState('');

  // Cross-category modal state
  const [isCrossCategoryModalOpen, setIsCrossCategoryModalOpen] = useState(false);
  const [crossModalTeamFilter, setCrossModalTeamFilter] = useState<string>('all');
  const [crossModalSearch, setCrossModalSearch] = useState<string>('');
  const [selectedCrossPlayerIds, setSelectedCrossPlayerIds] = useState<string[]>([]);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('club_intramural_tournaments_v1', JSON.stringify(tournaments));
  }, [tournaments]);

  // Current active tournament object
  const currentTournament = useMemo(() => {
    return tournaments.find(t => t.id === activeTournamentId) || tournaments[0];
  }, [tournaments, activeTournamentId]);

  // Set active category default
  useEffect(() => {
    if (currentTournament && currentTournament.categories.length > 0) {
      if (!activeCategoryId || !currentTournament.categories.some(c => c.id === activeCategoryId)) {
        setActiveCategoryId(currentTournament.categories[0].id);
      }
    }
  }, [currentTournament, activeCategoryId]);

  // Current active category
  const activeCategory = useMemo(() => {
    return currentTournament?.categories.find(c => c.id === activeCategoryId) || currentTournament?.categories[0];
  }, [currentTournament, activeCategoryId]);

  // Helper to update active tournament
  const updateCurrentTournament = (updater: (t: IntramuralTournament) => IntramuralTournament) => {
    setTournaments(prev => prev.map(t => t.id === currentTournament.id ? updater(t) : t));
  };

  // Helper to update active category
  const updateActiveCategory = (updater: (c: TournamentCategory) => TournamentCategory) => {
    updateCurrentTournament(t => ({
      ...t,
      categories: t.categories.map(c => c.id === activeCategoryId ? updater(c) : c)
    }));
  };

  // Centralized Category Assignment Map across the entire tournament
  // Rule: Each player can belong to AT MOST ONE category in a tournament.
  // Rule: Players belonging to unassigned teams (待分配/未指定) do NOT enter the tournament roster.
  const playerCategoryMap = useMemo(() => {
    const map: Record<string, { categoryId: string; status: 'participating' | 'opt_out' }> = {};
    if (!currentTournament) return map;

    // 1. Explicit overrides across all categories take top priority
    currentTournament.categories.forEach(cat => {
      const overrides = cat.playerOverrides || {};
      Object.entries(overrides).forEach(([pid, ov]) => {
        const p = players.find(x => x.id === pid);
        if (p && isUnassignedTeamPlayer(p, teams)) {
          return;
        }
        if (ov.status === 'participating') {
          map[pid] = { categoryId: cat.id, status: 'participating' };
        } else if (ov.status === 'opt_out' && !map[pid]) {
          map[pid] = { categoryId: cat.id, status: 'opt_out' };
        }
      });
    });

    // 2. Birthdate auto-eligibility for players not explicitly participating anywhere
    players.forEach(p => {
      // 球员属于待分配球队中，则不进入队内赛名单
      if (isUnassignedTeamPlayer(p, teams)) {
        return;
      }
      if (!map[p.id] && p.birthDate) {
        const matchingCat = currentTournament.categories.find(c => {
          return p.birthDate >= c.minBirthDate && p.birthDate <= c.maxBirthDate;
        });
        if (matchingCat) {
          const ov = matchingCat.playerOverrides?.[p.id];
          if (ov?.status === 'opt_out') {
            map[p.id] = { categoryId: matchingCat.id, status: 'opt_out' };
          } else {
            map[p.id] = { categoryId: matchingCat.id, status: 'participating' };
          }
        }
      }
    });

    return map;
  }, [currentTournament, players, teams]);

  // 1. Calculate Player Enrollment for active Category based on Birth Date Range & Overrides
  const categoryPlayersInfo = useMemo(() => {
    if (!activeCategory || !currentTournament) {
      return { all: [], participating: [], optOut: [], crossCategory: [] };
    }

    const minDate = activeCategory.minBirthDate;
    const maxDate = activeCategory.maxBirthDate;

    const list: {
      player: Player;
      isAutoEligible: boolean;
      status: 'participating' | 'opt_out';
      isCrossCategory: boolean;
    }[] = [];

    players.forEach(p => {
      const assignment = playerCategoryMap[p.id];
      // Rule: Only include players whose resolved category is activeCategory
      if (assignment && assignment.categoryId === activeCategory.id) {
        const inAgeRange = Boolean(p.birthDate && p.birthDate >= minDate && p.birthDate <= maxDate);
        const override = activeCategory.playerOverrides?.[p.id];
        const isCross = !inAgeRange || Boolean(override && override.overrideCategoryId === activeCategory.id);

        list.push({
          player: p,
          isAutoEligible: inAgeRange,
          status: assignment.status,
          isCrossCategory: isCross
        });
      }
    });

    const participating = list.filter(item => item.status === 'participating');
    const optOut = list.filter(item => item.status === 'opt_out');
    const crossCategory = list.filter(item => item.isCrossCategory && item.status === 'participating');

    return {
      all: list,
      participating,
      optOut,
      crossCategory
    };
  }, [players, activeCategory, currentTournament, playerCategoryMap]);

  // Calculate Player Enrollment for ANY Category based on Birth Date Range & Overrides
  const getCategoryPlayersInfo = useCallback((catId: string) => {
    if (!currentTournament) {
      return { category: null, all: [], participating: [], optOut: [], crossCategory: [] };
    }

    const cat = currentTournament.categories.find(c => c.id === catId);
    if (!cat) return { category: null, all: [], participating: [], optOut: [], crossCategory: [] };

    const minDate = cat.minBirthDate;
    const maxDate = cat.maxBirthDate;

    const list: {
      player: Player;
      isAutoEligible: boolean;
      status: 'participating' | 'opt_out';
      isCrossCategory: boolean;
      categoryId: string;
      categoryName: string;
    }[] = [];

    players.forEach(p => {
      if (isUnassignedTeamPlayer(p, teams)) {
        return;
      }
      const assignment = playerCategoryMap[p.id];
      if (assignment && assignment.categoryId === cat.id) {
        const inAgeRange = Boolean(p.birthDate && p.birthDate >= minDate && p.birthDate <= maxDate);
        const override = cat.playerOverrides?.[p.id];
        const isCross = !inAgeRange || Boolean(override && override.overrideCategoryId === cat.id);

        list.push({
          player: p,
          isAutoEligible: inAgeRange,
          status: assignment.status,
          isCrossCategory: isCross,
          categoryId: cat.id,
          categoryName: cat.name
        });
      }
    });

    const participating = list.filter(item => item.status === 'participating');
    const optOut = list.filter(item => item.status === 'opt_out');
    const crossCategory = list.filter(item => item.isCrossCategory && item.status === 'participating');

    return {
      category: cat,
      all: list,
      participating,
      optOut,
      crossCategory
    };
  }, [currentTournament, players, teams, playerCategoryMap]);

  // Calculate Player Enrollment grouped by Club Team (球员管理里的球队/梯队)
  const getClubTeamPlayersInfo = useCallback((teamId: string) => {
    if (!currentTournament) {
      return { team: null, all: [], participating: [], optOut: [] };
    }

    const team = teams.find(t => t.id === teamId);
    if (!team) return { team: null, all: [], participating: [], optOut: [] };

    const list: {
      player: Player;
      status: 'participating' | 'opt_out';
      assignedCategoryId: string;
      assignedCategoryName: string;
      isCrossCategory: boolean;
    }[] = [];

    const teamPlayers = players.filter(p => p.teamId === team.id && !isUnassignedTeamPlayer(p, teams));

    teamPlayers.forEach(p => {
      const assignment = playerCategoryMap[p.id];
      let catId = '';
      let catName = '未指定组别';
      let status: 'participating' | 'opt_out' = 'participating';
      let isCross = false;

      if (assignment) {
        catId = assignment.categoryId;
        status = assignment.status;
        const catObj = currentTournament.categories.find(c => c.id === catId);
        if (catObj) {
          catName = catObj.name;
          if (p.birthDate && (p.birthDate < catObj.minBirthDate || p.birthDate > catObj.maxBirthDate)) {
            isCross = true;
          }
        }
      } else {
        // Auto match by birth date
        const matchingCat = currentTournament.categories.find(c =>
          p.birthDate && p.birthDate >= c.minBirthDate && p.birthDate <= c.maxBirthDate
        );
        if (matchingCat) {
          catId = matchingCat.id;
          catName = matchingCat.name;
        } else if (currentTournament.categories.length > 0) {
          catId = currentTournament.categories[0].id;
          catName = currentTournament.categories[0].name;
        }
      }

      list.push({
        player: p,
        status,
        assignedCategoryId: catId,
        assignedCategoryName: catName,
        isCrossCategory: isCross
      });
    });

    const participating = list.filter(item => item.status === 'participating');
    const optOut = list.filter(item => item.status === 'opt_out');

    return {
      team,
      all: list,
      participating,
      optOut
    };
  }, [currentTournament, players, teams, playerCategoryMap]);

  // Assign or Move Player to Category from Club Team View
  const handleAssignPlayerCategoryFromClubTeam = (playerId: string, newCategoryId: string) => {
    if (!currentTournament) return;
    const currentAssignment = playerCategoryMap[playerId];
    const oldCatId = currentAssignment?.categoryId || '';

    if (oldCatId && oldCatId !== newCategoryId) {
      handleMovePlayerToCategoryGlobal(playerId, oldCatId, newCategoryId);
    } else {
      const updatedCategories = currentTournament.categories.map(cat => {
        const overrides = { ...(cat.playerOverrides || {}) };
        if (cat.id === newCategoryId) {
          overrides[playerId] = { status: 'participating', overrideCategoryId: newCategoryId };
          return { ...cat, playerOverrides: overrides };
        } else {
          delete overrides[playerId];
          return { ...cat, playerOverrides: overrides };
        }
      });

      updateCurrentTournament(t => ({
        ...t,
        categories: updatedCategories
      }));
    }
  };

  // Global handler: Toggle Player Status in ANY Category
  const handleTogglePlayerStatusGlobal = (playerId: string, categoryId: string) => {
    if (!currentTournament) return;
    
    // If categoryId is not provided, find or infer assigned category
    let targetCatId = categoryId;
    if (!targetCatId) {
      const assignment = playerCategoryMap[playerId];
      targetCatId = assignment?.categoryId || currentTournament.categories[0]?.id || '';
    }

    const cat = currentTournament.categories.find(c => c.id === targetCatId);
    if (!cat) return;

    const overrides = { ...(cat.playerOverrides || {}) };
    const current = overrides[playerId];

    if (!current) {
      overrides[playerId] = { status: 'opt_out' };
    } else if (current.status === 'participating') {
      overrides[playerId] = { ...current, status: 'opt_out' };
    } else {
      overrides[playerId] = { ...current, status: 'participating' };
    }

    const updatedCategories = currentTournament.categories.map(c =>
      c.id === targetCatId ? { ...c, playerOverrides: overrides } : c
    );

    updateCurrentTournament(t => ({
      ...t,
      categories: updatedCategories
    }));
  };

  // Global handler: Move Player to another Category
  const handleMovePlayerToCategoryGlobal = (playerId: string, oldCategoryId: string, newCategoryId: string) => {
    if (!currentTournament || oldCategoryId === newCategoryId) return;

    const updatedCategories = currentTournament.categories.map(cat => {
      const catOverrides = { ...(cat.playerOverrides || {}) };

      if (cat.id === newCategoryId) {
        // Set new category override as participating
        catOverrides[playerId] = { status: 'participating', overrideCategoryId: newCategoryId };
        return { ...cat, playerOverrides: catOverrides };
      } else {
        // Remove override from old and other categories
        if (catOverrides[playerId]) {
          delete catOverrides[playerId];
          return { ...cat, playerOverrides: catOverrides };
        }
        return cat;
      }
    });

    // Remove player from teams in old category to prevent orphaned players
    const updatedTeams = currentTournament.teams.map(t => {
      if (t.categoryId === oldCategoryId && t.playerIds.includes(playerId)) {
        return { ...t, playerIds: t.playerIds.filter(id => id !== playerId) };
      }
      return t;
    });

    updateCurrentTournament(t => ({
      ...t,
      categories: updatedCategories,
      teams: updatedTeams
    }));
  };

  // Export Roster Overview to Excel (.xlsx)
  const handleExportExcel = () => {
    if (!currentTournament) return;

    const participatingRows: any[] = [];
    let partIdx = 1;

    const optOutRows: any[] = [];
    let optIdx = 1;

    // Build rows by Club Team (球员管理梯队)
    const activeClubTeams = teams.filter(t => !isUnassignedTeamPlayer({ teamId: t.id } as Player, teams));

    activeClubTeams.forEach(team => {
      const info = getClubTeamPlayersInfo(team.id);

      info.participating.forEach(item => {
        const p = item.player;
        participatingRows.push({
          '序号': partIdx++,
          '归属球队(梯队)': team.name,
          '比赛分配组别': item.assignedCategoryName,
          '学员姓名': p.name,
          '球衣号码': p.number || '无',
          '性别': p.gender || '男',
          '出生日期': p.birthDate || '未填写',
          '场上位置': p.position || '未定',
          '脚法': p.preferredFoot || '右脚',
          '属性标注': item.isCrossCategory ? '跨组/补强' : '标准适龄',
          '参赛状态': '确认参赛'
        });
      });

      info.optOut.forEach(item => {
        const p = item.player;
        optOutRows.push({
          '序号': optIdx++,
          '归属球队(梯队)': team.name,
          '预分配组别': item.assignedCategoryName,
          '学员姓名': p.name,
          '球衣号码': p.number || '无',
          '性别': p.gender || '男',
          '出生日期': p.birthDate || '未填写',
          '状态说明': '选择不参加 / 请假'
        });
      });
    });

    // Stats Table 1: By Club Team
    const teamStatsRows: any[] = activeClubTeams.map((team, idx) => {
      const info = getClubTeamPlayersInfo(team.id);
      const rate = info.all.length > 0 ? Math.round((info.participating.length / info.all.length) * 100) : 0;
      return {
        '序号': idx + 1,
        '球队名称(梯队)': team.name,
        '梯队总人数': info.all.length,
        '确认参赛人数': info.participating.length,
        '选择非参赛人数': info.optOut.length,
        '参训率': `${rate}%`
      };
    });

    // Stats Table 2: By Tournament Category
    const categoryStatsRows: any[] = currentTournament.categories.map((cat, idx) => {
      const info = getCategoryPlayersInfo(cat.id);
      const catTeams = currentTournament.teams.filter(t => t.categoryId === cat.id);
      return {
        '序号': idx + 1,
        '比赛组别名称': cat.name,
        '赛制规格': cat.pitchFormat,
        '适龄范围': `${cat.minBirthDate} 至 ${cat.maxBirthDate}`,
        '确认参赛人数': info.participating.length,
        '非参赛人数': info.optOut.length,
        '组内球队数': catTeams.length
      };
    });

    const wb = XLSX.utils.book_new();

    const wsParticipating = XLSX.utils.json_to_sheet(participatingRows);
    const wsOptOut = XLSX.utils.json_to_sheet(optOutRows);
    const wsTeamStats = XLSX.utils.json_to_sheet(teamStatsRows);
    const wsCategoryStats = XLSX.utils.json_to_sheet(categoryStatsRows);

    wsParticipating['!cols'] = [
      { wch: 8 },  // 序号
      { wch: 18 }, // 归属球队
      { wch: 16 }, // 比赛分配组别
      { wch: 14 }, // 学员姓名
      { wch: 10 }, // 球衣号码
      { wch: 8 },  // 性别
      { wch: 14 }, // 出生日期
      { wch: 12 }, // 场上位置
      { wch: 10 }, // 脚法
      { wch: 14 }, // 属性标注
      { wch: 12 }, // 参赛状态
    ];

    wsOptOut['!cols'] = [
      { wch: 8 },  // 序号
      { wch: 18 }, // 归属球队
      { wch: 16 }, // 预分配组别
      { wch: 14 }, // 学员姓名
      { wch: 10 }, // 球衣号码
      { wch: 8 },  // 性别
      { wch: 14 }, // 出生日期
      { wch: 22 }, // 状态说明
    ];

    wsTeamStats['!cols'] = [
      { wch: 8 },  // 序号
      { wch: 20 }, // 球队名称
      { wch: 14 }, // 梯队总人数
      { wch: 14 }, // 确认参赛人数
      { wch: 14 }, // 选择非参赛人数
      { wch: 12 }, // 参训率
    ];

    wsCategoryStats['!cols'] = [
      { wch: 8 },  // 序号
      { wch: 18 }, // 比赛组别名称
      { wch: 12 }, // 赛制规格
      { wch: 26 }, // 适龄范围
      { wch: 14 }, // 确认参赛人数
      { wch: 12 }, // 非参赛人数
      { wch: 12 }, // 组内球队数
    ];

    XLSX.utils.book_append_sheet(wb, wsParticipating, '参赛球员名单');
    XLSX.utils.book_append_sheet(wb, wsOptOut, '非参赛球员名单');
    XLSX.utils.book_append_sheet(wb, wsTeamStats, '球队(梯队)人数统计');
    XLSX.utils.book_append_sheet(wb, wsCategoryStats, '比赛组别人数统计');

    const fileName = `顽石之光队内赛_全员名单与统计概况_${currentTournament.title}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Teams in current category
  const categoryTeams = useMemo(() => {
    if (!currentTournament || !activeCategory) return [];
    return currentTournament.teams.filter(t => t.categoryId === activeCategory.id);
  }, [currentTournament, activeCategory]);

  // Matches in current category
  const categoryMatches = useMemo(() => {
    if (!currentTournament || !activeCategory) return [];
    return currentTournament.matches.filter(m => m.categoryId === activeCategory.id);
  }, [currentTournament, activeCategory]);

  // Skill Tier Classification Helpers for Lottery & Draft
  const participatingList = useMemo(() => {
    return categoryPlayersInfo.participating.map(item => item.player);
  }, [categoryPlayersInfo]);

  const teamCount = categoryTeams.length || 4;
  const calculatedTierCount = Math.max(1, Math.ceil(participatingList.length / (teamCount || 1)));

  // Player skill tier mapping: playerId -> tierIndex
  const playerSkillTiers = useMemo(() => {
    const map: Record<string, number> = {};
    const storedTiers = activeCategory?.playerSkillTiers || {};

    participatingList.forEach((p, index) => {
      if (storedTiers[p.id] !== undefined) {
        map[p.id] = storedTiers[p.id];
      } else {
        const defaultTier = Math.min(Math.floor(index / teamCount), calculatedTierCount - 1);
        map[p.id] = defaultTier;
      }
    });

    return map;
  }, [participatingList, activeCategory?.playerSkillTiers, teamCount, calculatedTierCount]);

  // Group participating players by Tier Index
  const playersByTier = useMemo(() => {
    const tiersGroup: Record<number, Player[]> = {};
    for (let i = 0; i < calculatedTierCount; i++) {
      tiersGroup[i] = [];
    }

    participatingList.forEach(p => {
      const tIdx = playerSkillTiers[p.id] ?? 0;
      if (!tiersGroup[tIdx]) tiersGroup[tIdx] = [];
      tiersGroup[tIdx].push(p);
    });

    return tiersGroup;
  }, [participatingList, playerSkillTiers, calculatedTierCount]);

  // Auto-tier helper function (一键智能分档)
  const handleAutoSkillTier = () => {
    if (!activeCategory || participatingList.length === 0) return;

    const sorted = [...participatingList].sort((a, b) => {
      if ((b.goals || 0) !== (a.goals || 0)) return (b.goals || 0) - (a.goals || 0);
      return a.number - b.number;
    });

    const newSkillTiers: Record<string, number> = {};
    sorted.forEach((p, idx) => {
      const tierIdx = Math.min(Math.floor(idx / teamCount), calculatedTierCount - 1);
      newSkillTiers[p.id] = tierIdx;
    });

    updateActiveCategory(c => ({
      ...c,
      playerSkillTiers: newSkillTiers
    }));
  };

  // Assign specific player to tier
  const handleSetPlayerTier = (playerId: string, targetTierIndex: number) => {
    if (!activeCategory) return;
    const current = activeCategory.playerSkillTiers || {};
    const updated = { ...current, [playerId]: targetTierIndex };

    updateActiveCategory(c => ({
      ...c,
      playerSkillTiers: updated
    }));
  };

  // Toggle player participation status
  const handleTogglePlayerStatus = (playerId: string) => {
    if (!activeCategory) return;
    const overrides = { ...(activeCategory.playerOverrides || {}) };
    const current = overrides[playerId];

    if (!current) {
      overrides[playerId] = { status: 'opt_out' };
    } else if (current.status === 'participating') {
      overrides[playerId] = { ...current, status: 'opt_out' };
    } else {
      overrides[playerId] = { ...current, status: 'participating' };
    }

    updateActiveCategory(c => ({ ...c, playerOverrides: overrides }));
  };

  // Bulk add / transfer selected players to activeCategory
  const handleBulkAddCrossCategoryPlayers = (playerIdsToAdd: string[]) => {
    if (!activeCategory || !currentTournament || playerIdsToAdd.length === 0) return;

    // Update activeCategory overrides
    const updatedActiveOverrides = { ...(activeCategory.playerOverrides || {}) };
    playerIdsToAdd.forEach(pid => {
      updatedActiveOverrides[pid] = { status: 'participating', overrideCategoryId: activeCategory.id };
    });

    // Remove these playerIds from any OTHER category's overrides in currentTournament
    // to strictly enforce the exclusive 1-category-per-player rule
    const updatedCategories = currentTournament.categories.map(cat => {
      if (cat.id === activeCategory.id) {
        return { ...cat, playerOverrides: updatedActiveOverrides };
      } else {
        const catOverrides = { ...(cat.playerOverrides || {}) };
        let modified = false;
        playerIdsToAdd.forEach(pid => {
          if (catOverrides[pid]) {
            delete catOverrides[pid];
            modified = true;
          }
        });
        return modified ? { ...cat, playerOverrides: catOverrides } : cat;
      }
    });

    updateCurrentTournament(t => ({
      ...t,
      categories: updatedCategories
    }));
  };

  // 2. Format & Team Setup Handlers
  const handleSetTeamCount = (count: number) => {
    if (!activeCategory || !currentTournament) return;

    // Filter existing teams belonging to other categories
    const otherTeams = currentTournament.teams.filter(t => t.categoryId !== activeCategory.id);
    const existing = categoryTeams;

    const newCategoryTeams: IntramuralTeam[] = [];
    for (let i = 0; i < count; i++) {
      if (existing[i]) {
        newCategoryTeams.push(existing[i]);
      } else {
        const preset = TEAM_PRESET_COLORS[i % TEAM_PRESET_COLORS.length];
        newCategoryTeams.push({
          id: `team_${activeCategory.id}_${i}_${Date.now()}`,
          categoryId: activeCategory.id,
          name: preset.name,
          color: preset.hex,
          playerIds: []
        });
      }
    }

    updateCurrentTournament(t => ({
      ...t,
      teams: [...otherTeams, ...newCategoryTeams]
    }));
  };

  // 3. Online Draft / Lottery System (线上抽签)
  // Step A: Draw Captains Randomly from Tiers
  const handleRunCaptainLottery = () => {
    if (participatingList.length < teamCount) {
      alert(`参赛球员人数 (${participatingList.length}人) 少于队伍数量 (${teamCount}队)，无法抽取队长！`);
      return;
    }

    setIsLotteryAnimating(true);
    setLotteryMessage('🎲 正在从5个盲盒能力档位中滚签抽选【队长档位】...');

    let counter = 0;
    const interval = setInterval(() => {
      const randomTierIdx = Math.floor(Math.random() * calculatedTierCount);
      const tierConfig = TIER_CONFIGS[randomTierIdx % TIER_CONFIGS.length];
      const playersInTier = participatingList.filter(p => (playerSkillTiers[p.id] ?? 0) === randomTierIdx);
      if (playersInTier.length > 0) {
        const sample = playersInTier[Math.floor(Math.random() * playersInTier.length)];
        setLotteryHighlightedPlayer(sample);
      }
      setLotteryMessage(`🎲 正在滚签盲盒档位: 【${tierConfig.name}】...`);
      counter++;

      if (counter > 25) {
        clearInterval(interval);

        const validTierIndices: number[] = [];
        for (let i = 0; i < calculatedTierCount; i++) {
          const count = participatingList.filter(p => (playerSkillTiers[p.id] ?? 0) === i).length;
          if (count > 0) validTierIndices.push(i);
        }
        const chosenTierIdx = validTierIndices.length > 0
          ? validTierIndices[Math.floor(Math.random() * validTierIndices.length)]
          : 0;

        const chosenTierConfig = TIER_CONFIGS[chosenTierIdx % TIER_CONFIGS.length];
        const tierCaptains = participatingList.filter(p => (playerSkillTiers[p.id] ?? 0) === chosenTierIdx);
        const shuffledCaptains = [...tierCaptains].sort(() => 0.5 - Math.random());

        const updatedCategoryTeams = categoryTeams.map((team, idx) => {
          const captain = shuffledCaptains[idx % shuffledCaptains.length] || participatingList[idx];
          const existingPlayers = team.playerIds.filter(pid => pid !== captain.id);
          return {
            ...team,
            captainPlayerId: captain.id,
            playerIds: [captain.id, ...existingPlayers]
          };
        });

        const otherTeams = currentTournament.teams.filter(t => t.categoryId !== activeCategory.id);
        updateCurrentTournament(t => ({
          ...t,
          teams: [...otherTeams, ...updatedCategoryTeams]
        }));

        setIsLotteryAnimating(false);
        setLotteryMessage(`👑 随机盲盒抽中【${chosenTierConfig.name}】学员担任各队队长！已生成 ${categoryTeams.length} 支球队队长。`);
      }
    }, 100);
  };

  // Step B: Interactive Player Lottery Draft (1-Click Tier Balanced Blind Box Draft)
  const handleRunInstantFairDraft = () => {
    if (categoryTeams.length === 0 || participatingList.length === 0) return;

    setIsLotteryAnimating(true);
    setLotteryMessage('⚡ 正在按 A/B/C/D/E 技战术能力档位全自动盲盒配对，生成绝对均衡阵容...');

    let counter = 0;
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * participatingList.length);
      setLotteryHighlightedPlayer(participatingList[randomIdx]);
      counter++;

      if (counter > 20) {
        clearInterval(interval);

        const tierBuckets: Record<number, Player[]> = {};
        for (let i = 0; i < calculatedTierCount; i++) {
          tierBuckets[i] = [];
        }
        participatingList.forEach(p => {
          const tIdx = playerSkillTiers[p.id] ?? 0;
          if (!tierBuckets[tIdx]) tierBuckets[tIdx] = [];
          tierBuckets[tIdx].push(p);
        });

        let captainTierIdx = 0;
        const existingCaptains = categoryTeams.map(t => t.captainPlayerId).filter(Boolean) as string[];

        if (existingCaptains.length === categoryTeams.length) {
          const cap0Tier = playerSkillTiers[existingCaptains[0]];
          if (cap0Tier !== undefined) captainTierIdx = cap0Tier;
        } else {
          captainTierIdx = Math.floor(Math.random() * calculatedTierCount);
        }

        const newTeamPlayerMap: Record<string, string[]> = {};
        categoryTeams.forEach(t => {
          newTeamPlayerMap[t.id] = [];
        });

        const newCaptains: Record<string, string> = {};

        // 1. Assign Captains from captainTierIdx
        const captainPool = [...(tierBuckets[captainTierIdx] || [])].sort(() => 0.5 - Math.random());
        categoryTeams.forEach((team, idx) => {
          const captain = captainPool[idx % captainPool.length] || participatingList[idx];
          if (captain) {
            newCaptains[team.id] = captain.id;
            newTeamPlayerMap[team.id].push(captain.id);
          }
        });

        // 2. Assign remaining players tier by tier
        for (let tIdx = 0; tIdx < calculatedTierCount; tIdx++) {
          let playersInTier = [...(tierBuckets[tIdx] || [])];
          if (tIdx === captainTierIdx) {
            const capIds = new Set(Object.values(newCaptains));
            playersInTier = playersInTier.filter(p => !capIds.has(p.id));
          }

          const shuffledTierPlayers = playersInTier.sort(() => 0.5 - Math.random());
          shuffledTierPlayers.forEach((player, pIdx) => {
            const targetTeam = categoryTeams[pIdx % categoryTeams.length];
            if (!newTeamPlayerMap[targetTeam.id].includes(player.id)) {
              newTeamPlayerMap[targetTeam.id].push(player.id);
            }
          });
        }

        const updatedTeams = categoryTeams.map(t => ({
          ...t,
          captainPlayerId: newCaptains[t.id] || t.captainPlayerId,
          playerIds: newTeamPlayerMap[t.id] || []
        }));

        const otherTeams = currentTournament.teams.filter(t => t.categoryId !== activeCategory.id);
        updateCurrentTournament(t => ({
          ...t,
          teams: [...otherTeams, ...updatedTeams]
        }));

        setIsLotteryAnimating(false);
        setLotteryMessage('🎉 全盲盒档位分配完成！各队均均衡包含 A/B/C/D/E 档位选手，阵容水平绝对均衡！');
      }
    }, 90);
  };

  // Step C: Sequential Round-by-Round Lottery Pick (队长轮流开启盲盒)
  const handleRunRoundLottery = () => {
    const assignedPlayerIds = new Set(categoryTeams.flatMap(t => t.playerIds));
    const unassigned = participatingList.filter(p => !assignedPlayerIds.has(p.id));

    if (unassigned.length === 0) {
      alert('所有盲盒档位学员均已配对完毕！');
      return;
    }

    let targetTierIdx = 0;
    for (let i = 0; i < calculatedTierCount; i++) {
      const unassignedInTier = unassigned.filter(p => (playerSkillTiers[p.id] ?? 0) === i);
      if (unassignedInTier.length > 0) {
        targetTierIdx = i;
        break;
      }
    }

    const targetTierConfig = TIER_CONFIGS[targetTierIdx % TIER_CONFIGS.length];
    const unassignedInTier = unassigned.filter(p => (playerSkillTiers[p.id] ?? 0) === targetTierIdx);

    setIsLotteryAnimating(true);
    setLotteryMessage(`📦 各队队长正在轮流抽取【${targetTierConfig.name}】盲盒 (${unassignedInTier.length}人待抽取)...`);

    let counter = 0;
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * unassignedInTier.length);
      setLotteryHighlightedPlayer(unassignedInTier[randomIdx]);
      counter++;

      if (counter > 20) {
        clearInterval(interval);

        const shuffledUnassigned = [...unassignedInTier].sort(() => 0.5 - Math.random());
        const newTeamPlayerMap: Record<string, string[]> = {};
        categoryTeams.forEach(t => {
          newTeamPlayerMap[t.id] = [...t.playerIds];
        });

        let poolIdx = 0;
        categoryTeams.forEach(t => {
          if (poolIdx < shuffledUnassigned.length) {
            newTeamPlayerMap[t.id].push(shuffledUnassigned[poolIdx].id);
            poolIdx++;
          }
        });

        const updatedTeams = categoryTeams.map(t => ({
          ...t,
          playerIds: newTeamPlayerMap[t.id]
        }));

        const otherTeams = currentTournament.teams.filter(t => t.categoryId !== activeCategory.id);
        updateCurrentTournament(t => ({
          ...t,
          teams: [...otherTeams, ...updatedTeams]
        }));

        setIsLotteryAnimating(false);
        setLotteryMessage(`🎁【${targetTierConfig.name}】盲盒抽取完成！成功为各队配对落位 ${poolIdx} 名学员！`);
      }
    }, 90);
  };

  // Delete Category (删除组别)
  const handleDeleteCategory = (categoryId: string, categoryName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentTournament) return;
    if (currentTournament.categories.length <= 1) {
      alert('赛事至少需要保留一个比赛组别！');
      return;
    }
    if (!window.confirm(`确定要删除【${categoryName}】组别吗？\n删除后该组别下的球队分组与比赛对阵数据都将被清理。`)) {
      return;
    }

    const updatedCategories = currentTournament.categories.filter(c => c.id !== categoryId);
    const updatedTeams = currentTournament.teams.filter(t => t.categoryId !== categoryId);
    const updatedMatches = currentTournament.matches.filter(m => m.categoryId !== categoryId);

    updateCurrentTournament(t => ({
      ...t,
      categories: updatedCategories,
      teams: updatedTeams,
      matches: updatedMatches
    }));

    if (activeCategoryId === categoryId) {
      setActiveCategoryId(updatedCategories[0]?.id || '');
    }
  };

  // Create New Category (新增组别)
  const handleCreateCategory = () => {
    if (!currentTournament) return;
    if (!newCategoryName.trim()) {
      alert('请输入组别名称！');
      return;
    }

    const newCat: TournamentCategory = {
      id: `cat_${currentTournament.id}_${Date.now()}`,
      name: newCategoryName.trim(),
      minBirthDate: newCategoryMinBirthDate,
      maxBirthDate: newCategoryMaxBirthDate,
      pitchFormat: newCategoryPitchFormat,
      tournamentType: 'group_knockout'
    };

    updateCurrentTournament(t => ({
      ...t,
      categories: [...t.categories, newCat]
    }));

    setActiveCategoryId(newCat.id);
    setShowNewCategoryModal(false);
    setNewCategoryName('');
  };

  // Reset Draft / Redraw (一键重置，重新抽签)
  const handleResetDraft = () => {
    if (!activeCategory || categoryTeams.length === 0) return;
    if (!window.confirm('确定要重置当前组别的球队抽签结果吗？重置后所有球队的球员名单和队长将被全部清除，以便重新进行抽签。')) return;

    const updatedTeams = categoryTeams.map(t => ({
      ...t,
      captainPlayerId: undefined,
      playerIds: []
    }));

    const otherTeams = currentTournament.teams.filter(t => t.categoryId !== activeCategory.id);
    updateCurrentTournament(t => ({
      ...t,
      teams: [...otherTeams, ...updatedTeams]
    }));

    setLotteryMessage('↺ 抽签结果与队伍分配已重置，所有球队球员名单已全部清空，可重新开启线上抽签。');
    setLotteryHighlightedPlayer(null);
  };

  // Move player manually between teams
  const handleManualMovePlayer = (playerId: string, targetTeamId: string) => {
    const updatedTeams = categoryTeams.map(t => {
      const filtered = t.playerIds.filter(id => id !== playerId);
      if (t.id === targetTeamId) {
        return { ...t, playerIds: [...filtered, playerId] };
      }
      return { ...t, playerIds: filtered };
    });

    const otherTeams = currentTournament.teams.filter(t => t.categoryId !== activeCategory.id);
    updateCurrentTournament(tournament => ({
      ...tournament,
      teams: [...otherTeams, ...updatedTeams]
    }));
  };

  // 4. Generate Fixtures & Schedule
  const handleGenerateSchedule = (randomSeed = false) => {
    if (!activeCategory || categoryTeams.length < 2) {
      alert('请至少创建 2 支队伍后再生成赛程！');
      return;
    }

    const type = activeCategory.tournamentType; // 'league' or 'group_knockout'
    const newMatches: IntramuralMatch[] = [];

    let teamsList = [...categoryTeams];
    if (randomSeed) {
      teamsList = teamsList.sort(() => 0.5 - Math.random());
    }

    if (type === 'league') {
      // Round Robin League
      const legCount = activeCategory.legCount || 1;
      const n = teamsList.length;
      
      // Standard Berger round-robin schedule generator
      const tempTeams = [...teamsList];
      if (n % 2 !== 0) {
        tempTeams.push({ id: 'BYE', name: '轮空', categoryId: activeCategory.id, color: '#000', playerIds: [] });
      }

      const numTeams = tempTeams.length;
      const rounds = numTeams - 1;
      const half = numTeams / 2;

      for (let leg = 1; leg <= legCount; leg++) {
        for (let round = 0; round < rounds; round++) {
          const roundNum = (leg - 1) * rounds + (round + 1);

          for (let i = 0; i < half; i++) {
            const home = tempTeams[i];
            const away = tempTeams[numTeams - 1 - i];

            if (home.id !== 'BYE' && away.id !== 'BYE') {
              const isSwapped = leg === 2;
              newMatches.push({
                id: `match_${activeCategory.id}_l${leg}_r${roundNum}_${home.id}_${away.id}`,
                categoryId: activeCategory.id,
                stage: 'league_round',
                roundNumber: roundNum,
                homeTeamId: isSwapped ? away.id : home.id,
                awayTeamId: isSwapped ? home.id : away.id,
                status: 'scheduled',
                date: new Date().toISOString().split('T')[0],
                time: '10:00'
              });
            }
          }

          // Rotate teams array
          tempTeams.splice(1, 0, tempTeams.pop()!);
        }
      }
    } else {
      // Group + Knockout (杯赛)
      if (teamsList.length <= 4) {
        // Single group round-robin + Final
        // Group matches
        for (let i = 0; i < teamsList.length; i++) {
          for (let j = i + 1; j < teamsList.length; j++) {
            newMatches.push({
              id: `match_${activeCategory.id}_grp_${teamsList[i].id}_${teamsList[j].id}`,
              categoryId: activeCategory.id,
              stage: 'group',
              groupName: 'A组',
              homeTeamId: teamsList[i].id,
              awayTeamId: teamsList[j].id,
              status: 'scheduled',
              date: new Date().toISOString().split('T')[0],
              time: '09:30'
            });
          }
        }

        // Add placeholder Final & 3rd Place match
        newMatches.push({
          id: `match_${activeCategory.id}_3rd`,
          categoryId: activeCategory.id,
          stage: 'third_place',
          homeTeamId: teamsList[2]?.id || teamsList[0].id,
          awayTeamId: teamsList[3]?.id || teamsList[1].id,
          status: 'scheduled',
          date: new Date().toISOString().split('T')[0],
          time: '11:00',
          notes: '小组第3名 vs 小组第4名'
        });

        newMatches.push({
          id: `match_${activeCategory.id}_final`,
          categoryId: activeCategory.id,
          stage: 'final',
          homeTeamId: teamsList[0].id,
          awayTeamId: teamsList[1].id,
          status: 'scheduled',
          date: new Date().toISOString().split('T')[0],
          time: '11:30',
          notes: '🏆 决赛 (小组第1名 vs 小组第2名)'
        });
      } else {
        // Multi-group or Semi-Final Knockout
        // Semi Final 1: Team 0 vs Team 3
        newMatches.push({
          id: `match_${activeCategory.id}_semi1`,
          categoryId: activeCategory.id,
          stage: 'semi_final',
          homeTeamId: teamsList[0].id,
          awayTeamId: teamsList[3]?.id || teamsList[1].id,
          status: 'scheduled',
          date: new Date().toISOString().split('T')[0],
          time: '09:00',
          notes: '半决赛 1'
        });

        // Semi Final 2: Team 1 vs Team 2
        newMatches.push({
          id: `match_${activeCategory.id}_semi2`,
          categoryId: activeCategory.id,
          stage: 'semi_final',
          homeTeamId: teamsList[1].id,
          awayTeamId: teamsList[2].id,
          status: 'scheduled',
          date: new Date().toISOString().split('T')[0],
          time: '09:45',
          notes: '半决赛 2'
        });

        // 3rd place & Final
        newMatches.push({
          id: `match_${activeCategory.id}_3rd`,
          categoryId: activeCategory.id,
          stage: 'third_place',
          homeTeamId: teamsList[2].id,
          awayTeamId: teamsList[3]?.id || teamsList[0].id,
          status: 'scheduled',
          date: new Date().toISOString().split('T')[0],
          time: '10:30',
          notes: '🥉 季军争夺战'
        });

        newMatches.push({
          id: `match_${activeCategory.id}_final`,
          categoryId: activeCategory.id,
          stage: 'final',
          homeTeamId: teamsList[0].id,
          awayTeamId: teamsList[1].id,
          status: 'scheduled',
          date: new Date().toISOString().split('T')[0],
          time: '11:15',
          notes: '🏆 冠军决赛'
        });
      }
    }

    const otherMatches = currentTournament.matches.filter(m => m.categoryId !== activeCategory.id);
    updateCurrentTournament(t => ({
      ...t,
      matches: [...otherMatches, ...newMatches]
    }));

    setActiveStep('schedule');
  };

  // Match Result Save Handler
  const handleSaveMatchScore = () => {
    if (!editingMatch) return;

    const updatedMatch: IntramuralMatch = {
      ...editingMatch,
      homeScore: editingHomeScore,
      awayScore: editingAwayScore,
      status: 'completed',
      goals: editingGoals
    };

    updateCurrentTournament(t => ({
      ...t,
      matches: t.matches.map(m => m.id === editingMatch.id ? updatedMatch : m)
    }));

    setEditingMatch(null);
  };

  // Add goal event in match modal
  const handleAddGoal = (teamId: string, scorerPlayerId: string, assistantPlayerId?: string) => {
    if (!scorerPlayerId) return;
    const newGoal: IntramuralMatchGoal = {
      id: 'goal_' + Date.now() + Math.random().toString(36).substr(2, 4),
      matchId: editingMatch?.id || '',
      teamId,
      scorerPlayerId,
      assistantPlayerId: assistantPlayerId || undefined
    };
    setEditingGoals(prev => [...prev, newGoal]);

    // Update score count
    if (editingMatch) {
      if (teamId === editingMatch.homeTeamId) {
        setEditingHomeScore(prev => prev + 1);
      } else {
        setEditingAwayScore(prev => prev + 1);
      }
    }
  };

  // Remove goal event
  const handleRemoveGoal = (goalId: string) => {
    const goalToRemove = editingGoals.find(g => g.id === goalId);
    if (!goalToRemove || !editingMatch) return;

    setEditingGoals(prev => prev.filter(g => g.id !== goalId));
    if (goalToRemove.teamId === editingMatch.homeTeamId && editingHomeScore > 0) {
      setEditingHomeScore(prev => prev - 1);
    } else if (goalToRemove.teamId === editingMatch.awayTeamId && editingAwayScore > 0) {
      setEditingAwayScore(prev => prev - 1);
    }
  };

  // 5. Calculate League Standings (积分榜)
  const categoryStandings = useMemo(() => {
    if (!activeCategory || categoryTeams.length === 0) return [];

    const statsMap: Record<string, {
      team: IntramuralTeam;
      played: number;
      won: number;
      drawn: number;
      lost: number;
      gf: number;
      ga: number;
      gd: number;
      pts: number;
    }> = {};

    categoryTeams.forEach(t => {
      statsMap[t.id] = { team: t, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
    });

    categoryMatches.forEach(m => {
      if (m.status === 'completed' && m.homeScore !== undefined && m.awayScore !== undefined) {
        const homeStats = statsMap[m.homeTeamId];
        const awayStats = statsMap[m.awayTeamId];

        if (homeStats && awayStats) {
          homeStats.played += 1;
          awayStats.played += 1;

          homeStats.gf += m.homeScore;
          homeStats.ga += m.awayScore;
          awayStats.gf += m.awayScore;
          awayStats.ga += m.homeScore;

          homeStats.gd = homeStats.gf - homeStats.ga;
          awayStats.gd = awayStats.gf - awayStats.ga;

          if (m.homeScore > m.awayScore) {
            homeStats.won += 1;
            homeStats.pts += 3;
            awayStats.lost += 1;
          } else if (m.homeScore < m.awayScore) {
            awayStats.won += 1;
            awayStats.pts += 3;
            homeStats.lost += 1;
          } else {
            homeStats.drawn += 1;
            homeStats.pts += 1;
            awayStats.drawn += 1;
            awayStats.pts += 1;
          }
        }
      }
    });

    return Object.values(statsMap).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      return b.gf - a.gf;
    });
  }, [activeCategory, categoryTeams, categoryMatches]);

  // Top Scorers Leaderboard (射手榜 & 助攻榜)
  const categoryLeaderboard = useMemo(() => {
    const goalsCount: Record<string, { player: Player; goals: number; assists: number; team?: IntramuralTeam }> = {};

    categoryMatches.forEach(m => {
      (m.goals || []).forEach(g => {
        if (g.scorerPlayerId) {
          if (!goalsCount[g.scorerPlayerId]) {
            const p = players.find(x => x.id === g.scorerPlayerId);
            const t = categoryTeams.find(x => x.playerIds.includes(g.scorerPlayerId));
            if (p) goalsCount[g.scorerPlayerId] = { player: p, goals: 0, assists: 0, team: t };
          }
          if (goalsCount[g.scorerPlayerId]) {
            goalsCount[g.scorerPlayerId].goals += 1;
          }
        }

        if (g.assistantPlayerId) {
          if (!goalsCount[g.assistantPlayerId]) {
            const p = players.find(x => x.id === g.assistantPlayerId);
            const t = categoryTeams.find(x => x.playerIds.includes(g.assistantPlayerId));
            if (p) goalsCount[g.assistantPlayerId] = { player: p, goals: 0, assists: 0, team: t };
          }
          if (goalsCount[g.assistantPlayerId]) {
            goalsCount[g.assistantPlayerId].assists += 1;
          }
        }
      });
    });

    return Object.values(goalsCount).sort((a, b) => {
      if (b.goals !== a.goals) return b.goals - a.goals;
      return b.assists - a.assists;
    });
  }, [categoryMatches, players, categoryTeams]);

  // Create new tournament handler
  const handleCreateNewTournament = () => {
    if (!newTournamentTitle.trim()) return;
    const newId = 'tour_' + Date.now();
    const categoriesWithId: TournamentCategory[] = DEFAULT_CATEGORIES.map((c, i) => ({
      ...c,
      id: `cat_${newId}_${i}`
    }));

    const newTour: IntramuralTournament = {
      id: newId,
      title: newTournamentTitle.trim(),
      createdAt: new Date().toISOString().split('T')[0],
      status: 'active',
      categories: categoriesWithId,
      teams: [],
      matches: []
    };

    setTournaments(prev => [newTour, ...prev]);
    setActiveTournamentId(newId);
    setNewTournamentTitle('');
    setShowNewTournamentModal(false);
  };

  // Candidate players that can be added as cross-category players to activeCategory
  const candidatePlayers = useMemo(() => {
    if (!activeCategory) return [];

    // Participating player IDs in activeCategory currently
    const currentActivePlayerIds = new Set(categoryPlayersInfo.participating.map(item => item.player.id));

    return players.filter(p => {
      // 属于待分配/未指定球队的球员不能作为跨组球员加入队内赛
      if (isUnassignedTeamPlayer(p, teams)) return false;

      // Must not already be participating in activeCategory
      if (currentActivePlayerIds.has(p.id)) return false;

      // Filter by team if specified
      if (crossModalTeamFilter !== 'all' && p.teamId !== crossModalTeamFilter) {
        return false;
      }

      // Filter by search query if specified
      if (crossModalSearch) {
        const query = crossModalSearch.toLowerCase();
        return p.name.toLowerCase().includes(query) || p.number.toString().includes(query);
      }

      return true;
    });
  }, [players, activeCategory, categoryPlayersInfo, crossModalTeamFilter, crossModalSearch, teams]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Tournament Selector */}
      <div className="bg-gradient-to-r from-bvb-black via-slate-900 to-amber-950 rounded-3xl p-5 md:p-7 text-white shadow-xl relative overflow-hidden border border-amber-500/20">
        <div className="absolute -right-10 -bottom-10 opacity-15 pointer-events-none">
          <Trophy className="w-80 h-80 text-bvb-yellow" />
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-bvb-yellow text-bvb-black text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase italic tracking-wider">
                CLUB INTRAMURALS
              </span>
              <span className="text-xs text-amber-300 font-bold">顽石之光队内赛专属系统</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3 tracking-tight">
              <Trophy className="w-8 h-8 text-bvb-yellow animate-pulse" />
              <span>{currentTournament?.title || '队内赛'}</span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={activeTournamentId}
              onChange={(e) => setActiveTournamentId(e.target.value)}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-black text-xs md:text-sm rounded-xl px-3.5 py-2 outline-none cursor-pointer backdrop-blur-md transition-all"
            >
              {tournaments.map(t => (
                <option key={t.id} value={t.id} className="text-gray-900 font-bold">{t.title}</option>
              ))}
            </select>

            <button
              onClick={() => setShowNewTournamentModal(true)}
              className="px-3.5 py-2 bg-bvb-yellow hover:bg-yellow-400 text-bvb-black font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>新建赛事</span>
            </button>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-gray-400 mr-1 flex items-center gap-1">
            <Flag className="w-3.5 h-3.5 text-bvb-yellow" /> 比赛组别:
          </span>
          {currentTournament?.categories.map(cat => {
            const isActive = cat.id === activeCategoryId;
            return (
              <div
                key={cat.id}
                className={`group relative rounded-xl font-black text-xs transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-bvb-yellow text-bvb-black shadow-lg scale-105 px-3 py-1.5'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white px-3 py-1.5'
                }`}
              >
                <button
                  onClick={() => setActiveCategoryId(cat.id)}
                  className="flex items-center gap-1.5 cursor-pointer outline-none"
                >
                  <span>{cat.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    isActive ? 'bg-black/20 text-bvb-black' : 'bg-black/30 text-amber-200'
                  }`}>
                    {cat.pitchFormat}
                  </span>
                </button>

                {/* Edit & Delete Action Buttons */}
                <div className="flex items-center gap-1 ml-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingCategory(cat);
                    }}
                    title="编辑组别设置"
                    className={`p-0.5 rounded hover:bg-black/20 transition-colors cursor-pointer ${
                      isActive ? 'text-bvb-black hover:text-black' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>

                  <button
                    onClick={(e) => handleDeleteCategory(cat.id, cat.name, e)}
                    title="删除组别"
                    className={`p-0.5 rounded transition-colors cursor-pointer ${
                      isActive ? 'text-rose-900 hover:bg-rose-500 hover:text-white' : 'text-gray-400 hover:bg-rose-600 hover:text-white'
                    }`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}

          <button
            onClick={() => {
              setNewCategoryName(`U${(currentTournament?.categories.length || 0) + 12} 组别`);
              setShowNewCategoryModal(true);
            }}
            className="px-3 py-1.5 bg-bvb-yellow/20 hover:bg-bvb-yellow hover:text-bvb-black border border-dashed border-bvb-yellow/50 text-amber-300 font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增比赛组别</span>
          </button>
        </div>
      </div>

      {/* Main Workflow Tabs */}
      {currentTournament && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={() => setActiveStep('overview')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeStep === 'overview'
                  ? 'bg-bvb-black text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>0. 全员名单总览与Excel导出</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 font-mono">
                {currentTournament.categories.reduce((acc, cat) => acc + getCategoryPlayersInfo(cat.id).participating.length, 0)}人参赛
              </span>
            </button>

            <ChevronRight className="w-4 h-4 text-gray-300 hidden sm:block" />

            <button
              onClick={() => setActiveStep('roster')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeStep === 'roster'
                  ? 'bg-bvb-black text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Users className="w-4 h-4 text-bvb-yellow" />
              <span>1. 年龄限制与组别名单</span>
              {activeCategory && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 font-mono">
                  {categoryPlayersInfo.participating.length}人
                </span>
              )}
            </button>

            <ChevronRight className="w-4 h-4 text-gray-300 hidden sm:block" />

            <button
              onClick={() => setActiveStep('format')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeStep === 'format'
                  ? 'bg-bvb-black text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Settings2 className="w-4 h-4 text-bvb-yellow" />
              <span>2. 赛制与人数规格</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-800">
                {activeCategory.pitchFormat} • {activeCategory.tournamentType === 'league' ? '联赛' : '杯赛'}
              </span>
            </button>

            <ChevronRight className="w-4 h-4 text-gray-300 hidden sm:block" />

            <button
              onClick={() => setActiveStep('draft')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeStep === 'draft'
                  ? 'bg-bvb-black text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Dices className="w-4 h-4 text-bvb-yellow" />
              <span>3. 线上抽签与球队配对</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-800">
                {categoryTeams.length} 队
              </span>
            </button>

            <ChevronRight className="w-4 h-4 text-gray-300 hidden sm:block" />

            <button
              onClick={() => setActiveStep('schedule')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeStep === 'schedule'
                  ? 'bg-bvb-black text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Calendar className="w-4 h-4 text-bvb-yellow" />
              <span>4. 赛程对阵与录入</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800">
                {categoryMatches.length} 场
              </span>
            </button>

            <ChevronRight className="w-4 h-4 text-gray-300 hidden sm:block" />

            <button
              onClick={() => setActiveStep('standings')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeStep === 'standings'
                  ? 'bg-bvb-black text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <BarChart2 className="w-4 h-4 text-bvb-yellow" />
              <span>5. 积分榜与射手榜</span>
            </button>
          </div>

          <button
            onClick={() => setEditingCategory(activeCategory)}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-gray-500" />
            <span>设置组别参数</span>
          </button>
        </div>
      )}

      {/* STEP 0: OVERVIEW & ROSTER ADJUSTMENT */}
      {activeStep === 'overview' && currentTournament && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header Banner & Excel Export */}
          <div className="bg-white p-5 md:p-6 rounded-3xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  ROSTER OVERVIEW & EXCEL EXPORT
                </span>
                <span className="text-xs text-gray-500 font-bold">按球员管理梯队归属 & 一键导出 Excel</span>
              </div>
              <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                <span>全员参赛名单总览与梯队分配 (归属球员管理)</span>
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                默认按照【球员管理】中的球队/梯队进行归属展示，您可以集中查看各梯队学员名单，调配其参加的【比赛组别】或标记“参赛 / 非参赛”。调整结果将同步更新至全流程。
              </p>
            </div>

            <button
              onClick={handleExportExcel}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
            >
              <Download className="w-4 h-4 text-emerald-200" />
              <span>导出全员参赛及非参赛球员名单 (Excel)</span>
            </button>
          </div>

          {/* Tournament Overview Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4.5 rounded-2xl border border-gray-100 shadow-2xs">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-gray-400" /> 俱乐部梯队学员总数
              </span>
              <div className="text-2xl font-black text-gray-900 mt-1">
                {teams.filter(t => !isUnassignedTeamPlayer({ teamId: t.id } as Player, teams))
                  .reduce((acc, t) => acc + getClubTeamPlayersInfo(t.id).all.length, 0)} 人
              </div>
            </div>

            <div className="bg-emerald-50/70 p-4.5 rounded-2xl border border-emerald-100 shadow-2xs">
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> 确认参赛总人数
              </span>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {teams.filter(t => !isUnassignedTeamPlayer({ teamId: t.id } as Player, teams))
                  .reduce((acc, t) => acc + getClubTeamPlayersInfo(t.id).participating.length, 0)} 人
              </div>
            </div>

            <div className="bg-rose-50/70 p-4.5 rounded-2xl border border-rose-100 shadow-2xs">
              <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider flex items-center gap-1">
                <UserX className="w-3.5 h-3.5 text-rose-600" /> 选择非参赛人数
              </span>
              <div className="text-2xl font-black text-rose-700 mt-1">
                {teams.filter(t => !isUnassignedTeamPlayer({ teamId: t.id } as Player, teams))
                  .reduce((acc, t) => acc + getClubTeamPlayersInfo(t.id).optOut.length, 0)} 人
              </div>
            </div>

            <div className="bg-amber-50/70 p-4.5 rounded-2xl border border-amber-100 shadow-2xs">
              <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider flex items-center gap-1">
                <Flag className="w-3.5 h-3.5 text-amber-600" /> 整体参训率
              </span>
              <div className="text-2xl font-black text-amber-800 mt-1">
                {(() => {
                  const activeTeams = teams.filter(t => !isUnassignedTeamPlayer({ teamId: t.id } as Player, teams));
                  const total = activeTeams.reduce((acc, t) => acc + getClubTeamPlayersInfo(t.id).all.length, 0);
                  const part = activeTeams.reduce((acc, t) => acc + getClubTeamPlayersInfo(t.id).participating.length, 0);
                  return total > 0 ? `${Math.round((part / total) * 100)}%` : '0%';
                })()}
              </div>
            </div>
          </div>

          {/* Grouping Toggle & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            {/* View Mode Toggle */}
            <div className="bg-gray-100 p-1 rounded-xl flex items-center gap-1 shrink-0">
              <button
                onClick={() => setOverviewGroupBy('club_team')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  overviewGroupBy === 'club_team'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-amber-500" />
                <span>按【球员管理球队】归属</span>
              </button>

              <button
                onClick={() => setOverviewGroupBy('tournament_category')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  overviewGroupBy === 'tournament_category'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span>按【比赛设置组别】归属</span>
              </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-1 min-w-[260px] flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="搜索学员姓名 / 球衣号码..."
                  value={overviewSearch}
                  onChange={(e) => setOverviewSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:ring-1 focus:ring-bvb-yellow"
                />
              </div>

              {overviewGroupBy === 'club_team' && (
                <select
                  value={overviewTeamFilter}
                  onChange={(e) => setOverviewTeamFilter(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-xs font-bold rounded-xl px-3 py-1.5 outline-none cursor-pointer"
                >
                  <option value="all">显示全部梯队球队</option>
                  {teams.filter(t => !isUnassignedTeamPlayer({ teamId: t.id } as Player, teams)).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}

              <select
                value={overviewCategoryFilter}
                onChange={(e) => setOverviewCategoryFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-xs font-bold rounded-xl px-3 py-1.5 outline-none cursor-pointer"
              >
                <option value="all">筛选比赛组别 (全部)</option>
                {currentTournament.categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                value={overviewStatusFilter}
                onChange={(e) => setOverviewStatusFilter(e.target.value as any)}
                className="bg-gray-50 border border-gray-200 text-xs font-bold rounded-xl px-3 py-1.5 outline-none cursor-pointer"
              >
                <option value="all">全部参赛状态</option>
                <option value="participating">仅显示确认参赛</option>
                <option value="opt_out">仅显示非参赛</option>
              </select>
            </div>
          </div>

          {/* VIEW MODE 1: GROUPED BY PLAYER MANAGEMENT CLUB TEAMS (DEFAULT) */}
          {overviewGroupBy === 'club_team' && (
            <div className="space-y-6">
              {teams
                .filter(t => !isUnassignedTeamPlayer({ teamId: t.id } as Player, teams))
                .filter(t => overviewTeamFilter === 'all' || overviewTeamFilter === t.id)
                .map(team => {
                  const info = getClubTeamPlayersInfo(team.id);

                  // Filter participating players
                  const filteredParticipating = info.participating.filter(item => {
                    if (overviewStatusFilter === 'opt_out') return false;
                    if (overviewCategoryFilter !== 'all' && item.assignedCategoryId !== overviewCategoryFilter) return false;
                    if (overviewSearch) {
                      const q = overviewSearch.toLowerCase();
                      return item.player.name.toLowerCase().includes(q) || item.player.number.toString().includes(q);
                    }
                    return true;
                  });

                  // Filter opt-out players
                  const filteredOptOut = info.optOut.filter(item => {
                    if (overviewStatusFilter === 'participating') return false;
                    if (overviewCategoryFilter !== 'all' && item.assignedCategoryId !== overviewCategoryFilter) return false;
                    if (overviewSearch) {
                      const q = overviewSearch.toLowerCase();
                      return item.player.name.toLowerCase().includes(q) || item.player.number.toString().includes(q);
                    }
                    return true;
                  });

                  const rate = info.all.length > 0 ? Math.round((info.participating.length / info.all.length) * 100) : 0;

                  return (
                    <div key={team.id} className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
                      {/* Team Header */}
                      <div className="bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900 p-4 md:p-5 text-white flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-amber-400 text-bvb-black flex items-center justify-center font-black text-sm shadow-md">
                            <Shield className="w-5 h-5 text-gray-900" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-black text-lg text-white">{team.name}</h4>
                              <span className="bg-white/20 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-md">
                                球员管理梯队
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-300 mt-0.5">
                              梯队注册学员: {info.all.length} 人 • 参训率: {rate}%
                            </p>
                          </div>
                        </div>

                        {/* Headcount Pills */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 text-xs">
                            <span className="text-gray-300 text-[10px]">梯队成员: </span>
                            <span className="font-black text-white">{info.all.length} 人</span>
                          </div>
                          <div className="bg-emerald-500/20 backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-400/30 text-xs">
                            <span className="text-emerald-300 text-[10px]">确认参赛: </span>
                            <span className="font-black text-emerald-200">{info.participating.length} 人</span>
                          </div>
                          <div className="bg-rose-500/20 backdrop-blur-md px-3 py-1.5 rounded-xl border border-rose-400/30 text-xs">
                            <span className="text-rose-300 text-[10px]">非参赛: </span>
                            <span className="font-black text-rose-200">{info.optOut.length} 人</span>
                          </div>
                        </div>
                      </div>

                      {/* Team Players Roster */}
                      <div className="p-4 md:p-5 space-y-4">
                        {/* Participating Section */}
                        {(overviewStatusFilter === 'all' || overviewStatusFilter === 'participating') && (
                          <div>
                            <div className="mb-3 flex items-center justify-between">
                              <span className="text-xs font-black text-gray-700 flex items-center gap-1.5">
                                <UserCheck className="w-4 h-4 text-emerald-600" />
                                <span>【{team.name}】确认参赛学员 ({filteredParticipating.length} 人)</span>
                              </span>
                              <span className="text-[10px] text-gray-400">
                                可在此直接为该学员选择参加的【比赛组别】或切换为【非参赛】
                              </span>
                            </div>

                            {filteredParticipating.length === 0 ? (
                              <div className="p-6 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-400 text-xs">
                                {info.participating.length === 0
                                  ? '该梯队暂无确认参赛的学员'
                                  : '没有符合筛选条件的参赛学员'}
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {filteredParticipating.map(item => {
                                  const p = item.player;

                                  return (
                                    <div
                                      key={p.id}
                                      className="bg-white p-3.5 rounded-2xl border border-gray-200 hover:border-amber-400 shadow-2xs transition-all flex flex-col justify-between gap-3"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-black text-xs flex items-center justify-center overflow-hidden shrink-0">
                                            {p.image ? (
                                              <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                                            ) : (
                                              p.name.charAt(0)
                                            )}
                                          </div>
                                          <div>
                                            <div className="flex items-center gap-1.5">
                                              <span className="font-black text-gray-900 text-sm">{p.name}</span>
                                              <span className="text-[10px] font-mono text-gray-400">#{p.number}</span>
                                              {item.isCrossCategory && (
                                                <span className="text-[8px] font-black bg-blue-100 text-blue-800 px-1 py-0.2 rounded">跨组/补强</span>
                                              )}
                                            </div>
                                            <div className="text-[10px] text-gray-400 mt-0.5">
                                              位置: {p.position || '未定'} • 生日: {p.birthDate || '未知'}
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                                        {/* Competition Category Dropdown Selector */}
                                        <div className="flex items-center gap-1">
                                          <span className="text-[10px] text-gray-500 font-bold">参赛组别:</span>
                                          <select
                                            value={item.assignedCategoryId}
                                            onChange={(e) => handleAssignPlayerCategoryFromClubTeam(p.id, e.target.value)}
                                            className="bg-amber-50 border border-amber-200 text-[11px] font-black text-amber-900 rounded-lg px-2 py-1 outline-none cursor-pointer focus:bg-white focus:border-amber-500"
                                          >
                                            {currentTournament.categories.map(c => (
                                              <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                          </select>
                                        </div>

                                        {/* Toggle to Non-Participating */}
                                        <button
                                          onClick={() => handleTogglePlayerStatusGlobal(p.id, item.assignedCategoryId)}
                                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer active:scale-95 shrink-0"
                                        >
                                          <UserX className="w-3.5 h-3.5" />
                                          <span>设为非参赛</span>
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Opt-Out Section for this team */}
                        {(overviewStatusFilter === 'all' || overviewStatusFilter === 'opt_out') && filteredOptOut.length > 0 && (
                          <div className="pt-3 border-t border-gray-100">
                            <div className="mb-2.5 flex items-center justify-between">
                              <span className="text-xs font-black text-rose-700 flex items-center gap-1.5">
                                <UserX className="w-3.5 h-3.5 text-rose-600" />
                                <span>【{team.name}】非参赛学员 ({filteredOptOut.length} 人)</span>
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {filteredOptOut.map(item => {
                                const p = item.player;

                                return (
                                  <div
                                    key={p.id}
                                    className="bg-rose-50/40 p-3.5 rounded-2xl border border-rose-100 shadow-2xs flex flex-col justify-between gap-3 opacity-80 hover:opacity-100 transition-opacity"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-300 text-gray-500 font-black text-xs flex items-center justify-center overflow-hidden shrink-0">
                                        {p.image ? (
                                          <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                                        ) : (
                                          p.name.charAt(0)
                                        )}
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-black text-gray-900 text-sm">{p.name}</span>
                                          <span className="text-[10px] font-mono text-gray-400">#{p.number}</span>
                                          <span className="text-[9px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded font-bold">
                                            未参赛
                                          </span>
                                        </div>
                                        <div className="text-[10px] text-gray-400 mt-0.5">
                                          分配组别: {item.assignedCategoryName} • 生日: {p.birthDate || '未知'}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="pt-2 border-t border-rose-100/60 flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-1">
                                        <span className="text-[10px] text-gray-400 font-bold">恢复到:</span>
                                        <select
                                          value={item.assignedCategoryId}
                                          onChange={(e) => handleAssignPlayerCategoryFromClubTeam(p.id, e.target.value)}
                                          className="bg-white border border-gray-200 text-[11px] font-black text-gray-800 rounded-lg px-2 py-1 outline-none cursor-pointer focus:border-amber-400"
                                        >
                                          {currentTournament.categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                          ))}
                                        </select>
                                      </div>

                                      <button
                                        onClick={() => handleTogglePlayerStatusGlobal(p.id, item.assignedCategoryId)}
                                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer active:scale-95 shrink-0"
                                      >
                                        <UserCheck className="w-3.5 h-3.5" />
                                        <span>恢复参赛</span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* VIEW MODE 2: GROUPED BY TOURNAMENT COMPETITION CATEGORIES */}
          {overviewGroupBy === 'tournament_category' && (
            <div className="space-y-6">
              {currentTournament.categories
                .filter(cat => overviewCategoryFilter === 'all' || overviewCategoryFilter === cat.id)
                .map(cat => {
                  const info = getCategoryPlayersInfo(cat.id);
                  const filteredParticipating = info.participating.filter(item => {
                    if (overviewStatusFilter === 'opt_out') return false;
                    if (overviewSearch) {
                      const q = overviewSearch.toLowerCase();
                      return item.player.name.toLowerCase().includes(q) || item.player.number.toString().includes(q);
                    }
                    return true;
                  });

                  return (
                    <div key={cat.id} className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
                      {/* Category Header */}
                      <div className="bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900 p-4 md:p-5 text-white flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-bvb-yellow text-bvb-black flex items-center justify-center font-black text-sm shadow-md">
                            {cat.name.substring(0, 3)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-black text-lg text-white">{cat.name}</h4>
                              <span className="bg-white/20 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-md">
                                {cat.pitchFormat}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-300 mt-0.5 font-mono">
                              生日限制: {cat.minBirthDate} ~ {cat.maxBirthDate}
                            </p>
                          </div>
                        </div>

                        {/* Headcount Statistics Pills */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 text-xs">
                            <span className="text-gray-300 text-[10px]">适龄人员: </span>
                            <span className="font-black text-white">{info.all.length} 人</span>
                          </div>
                          <div className="bg-emerald-500/20 backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-400/30 text-xs">
                            <span className="text-emerald-300 text-[10px]">参赛人员: </span>
                            <span className="font-black text-emerald-200">{info.participating.length} 人</span>
                          </div>
                          <div className="bg-rose-500/20 backdrop-blur-md px-3 py-1.5 rounded-xl border border-rose-400/30 text-xs">
                            <span className="text-rose-300 text-[10px]">非参赛: </span>
                            <span className="font-black text-rose-200">{info.optOut.length} 人</span>
                          </div>
                        </div>
                      </div>

                      {/* Participating Roster Content */}
                      <div className="p-4 md:p-5">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-xs font-black text-gray-700 flex items-center gap-1.5">
                            <UserCheck className="w-4 h-4 text-emerald-600" />
                            <span>【{cat.name}】确认参赛球员名单 ({filteredParticipating.length} 人)</span>
                          </span>
                          <span className="text-[10px] text-gray-400">
                            提示: 可直接下拉调整所属组别或点击“设为非参赛”移动至非参赛名单
                          </span>
                        </div>

                        {filteredParticipating.length === 0 ? (
                          <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-400 text-xs">
                            {info.participating.length === 0
                              ? '暂无确认参赛的球员'
                              : '没有符合搜索条件的参赛球员'}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {filteredParticipating.map(item => {
                              const p = item.player;
                              const origTeam = teams.find(t => t.id === p.teamId);

                              return (
                                <div
                                  key={p.id}
                                  className="bg-white p-3.5 rounded-2xl border border-gray-200 hover:border-amber-400 shadow-2xs transition-all flex flex-col justify-between gap-3"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-black text-xs flex items-center justify-center overflow-hidden shrink-0">
                                        {p.image ? (
                                          <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                                        ) : (
                                          p.name.charAt(0)
                                        )}
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-black text-gray-900 text-sm">{p.name}</span>
                                          <span className="text-[10px] font-mono text-gray-400">#{p.number}</span>
                                          {item.isCrossCategory && (
                                            <span className="text-[8px] font-black bg-blue-100 text-blue-800 px-1 py-0.2 rounded">跨组补强</span>
                                          )}
                                        </div>
                                        <div className="text-[10px] text-gray-400 mt-0.5">
                                          归属梯队: {origTeam?.name || '未指定'} • 生日: {p.birthDate || '未知'}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                                    {/* Category Change Selector */}
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] text-gray-400 font-bold">组别:</span>
                                      <select
                                        value={cat.id}
                                        onChange={(e) => handleMovePlayerToCategoryGlobal(p.id, cat.id, e.target.value)}
                                        className="bg-gray-50 border border-gray-200 text-[11px] font-black text-gray-800 rounded-lg px-2 py-1 outline-none cursor-pointer focus:bg-white focus:border-amber-400"
                                      >
                                        {currentTournament.categories.map(c => (
                                          <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                      </select>
                                    </div>

                                    {/* Participation Toggle */}
                                    <button
                                      onClick={() => handleTogglePlayerStatusGlobal(p.id, cat.id)}
                                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer active:scale-95 shrink-0"
                                    >
                                      <UserX className="w-3.5 h-3.5" />
                                      <span>设为非参赛</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* NON-PARTICIPATING PLAYERS SECTION */}
          {(() => {
            const allOptOut = currentTournament.categories.flatMap(cat => {
              const info = getCategoryPlayersInfo(cat.id);
              return info.optOut.map(item => ({
                ...item,
                categoryId: cat.id,
                categoryName: cat.name
              }));
            }).filter(item => {
              if (overviewCategoryFilter !== 'all' && item.categoryId !== overviewCategoryFilter) return false;
              if (overviewStatusFilter === 'participating') return false;
              if (overviewSearch) {
                const q = overviewSearch.toLowerCase();
                return item.player.name.toLowerCase().includes(q) || item.player.number.toString().includes(q);
              }
              return true;
            });

            return (
              <div className="bg-rose-50/40 rounded-3xl border border-rose-200/80 p-5 md:p-6 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center font-black">
                      <UserX className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900 text-base">非参赛球员名单汇总专区</h4>
                      <p className="text-xs text-gray-500">
                        在此可集中查看未参加本次比赛的学员，点击“恢复参赛”可将其直接恢复加入指定组别。
                      </p>
                    </div>
                  </div>

                  <span className="bg-rose-100 text-rose-800 text-xs font-black px-3 py-1 rounded-full border border-rose-200">
                    共 {allOptOut.length} 人非参赛
                  </span>
                </div>

                {allOptOut.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-rose-200 text-gray-400 text-xs">
                    暂无非参赛球员记录
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {allOptOut.map(item => {
                      const p = item.player;
                      const origTeam = teams.find(t => t.id === p.teamId);

                      return (
                        <div
                          key={p.id}
                          className="bg-white p-3.5 rounded-2xl border border-rose-100 shadow-2xs flex flex-col justify-between gap-3 opacity-90 hover:opacity-100 transition-opacity"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-300 text-gray-500 font-black text-xs flex items-center justify-center overflow-hidden shrink-0">
                              {p.image ? (
                                <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                p.name.charAt(0)
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-black text-gray-900 text-sm">{p.name}</span>
                                <span className="text-[10px] font-mono text-gray-400">#{p.number}</span>
                                <span className="text-[9px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded font-bold">
                                  原适用: {item.categoryName}
                                </span>
                              </div>
                              <div className="text-[10px] text-gray-400 mt-0.5">
                                原梯队: {origTeam?.name || '未指定'} • 生日: {p.birthDate || '未知'}
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                            {/* Reassign target category dropdown */}
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-gray-400 font-bold">恢复到:</span>
                              <select
                                value={item.categoryId}
                                onChange={(e) => handleMovePlayerToCategoryGlobal(p.id, item.categoryId, e.target.value)}
                                className="bg-gray-50 border border-gray-200 text-[11px] font-black text-gray-800 rounded-lg px-2 py-1 outline-none cursor-pointer focus:bg-white focus:border-amber-400"
                              >
                                {currentTournament.categories.map(c => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                            </div>

                            {/* Restore Participation Button */}
                            <button
                              onClick={() => handleTogglePlayerStatusGlobal(p.id, item.categoryId)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer active:scale-95 shrink-0"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>恢复参赛</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* STEP 1: Age Limit & Player Enrollment Roster */}
      {activeStep === 'roster' && activeCategory && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Age Limit Config Header */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-gray-900 text-base flex items-center gap-2">
                <Calendar className="w-5 h-5 text-bvb-yellow" />
                <span>【{activeCategory.name}】年龄段生日限制规则</span>
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                自动匹配生日在区间内的俱乐部学员（属于“待分配/未指定”梯队的学员不进入队内赛名单）。
              </p>
            </div>

            <div className="flex items-center gap-3 bg-amber-50/80 border border-amber-200 p-3 rounded-xl">
              <div>
                <label className="block text-[10px] font-black text-amber-800 uppercase">出生起始日期</label>
                <input
                  type="date"
                  value={activeCategory.minBirthDate}
                  onChange={(e) => updateActiveCategory(c => ({ ...c, minBirthDate: e.target.value }))}
                  className="bg-white border border-amber-300 rounded-lg text-xs font-black p-1.5 outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <span className="text-amber-600 font-black text-xs">至</span>
              <div>
                <label className="block text-[10px] font-black text-amber-800 uppercase">出生截止日期</label>
                <input
                  type="date"
                  value={activeCategory.maxBirthDate}
                  onChange={(e) => updateActiveCategory(c => ({ ...c, maxBirthDate: e.target.value }))}
                  className="bg-white border border-amber-300 rounded-lg text-xs font-black p-1.5 outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Player Roster Stats & Controls */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">符合规则总人数</span>
              <div className="text-2xl font-black text-gray-900 mt-0.5">{categoryPlayersInfo.all.length} 人</div>
            </div>

            <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 shadow-xs">
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">确认参赛人数</span>
              <div className="text-2xl font-black text-emerald-700 mt-0.5">{categoryPlayersInfo.participating.length} 人</div>
            </div>

            <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-100 shadow-xs">
              <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider">选择不参加人数</span>
              <div className="text-2xl font-black text-rose-700 mt-0.5">{categoryPlayersInfo.optOut.length} 人</div>
            </div>

            <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100 shadow-xs">
              <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider">跨组/升组加练人数</span>
              <div className="text-2xl font-black text-blue-700 mt-0.5">{categoryPlayersInfo.crossCategory.length} 人</div>
            </div>
          </div>

          {/* Player Search & Action Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-[240px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="搜索学员名字 / 号码..."
                  value={playerSearch}
                  onChange={(e) => setPlayerSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:ring-1 focus:ring-bvb-yellow"
                />
              </div>

              <select
                value={playerFilterStatus}
                onChange={(e) => setPlayerFilterStatus(e.target.value as any)}
                className="bg-gray-50 border border-gray-200 text-xs font-bold rounded-xl px-3 py-1.5 outline-none cursor-pointer"
              >
                <option value="all">显示全部状态</option>
                <option value="participating">仅显示确认参赛</option>
                <option value="opt_out">仅显示不参加</option>
              </select>
            </div>

            <button
              onClick={() => {
                setSelectedCrossPlayerIds([]);
                setCrossModalSearch('');
                setCrossModalTeamFilter('all');
                setIsCrossCategoryModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ 添加跨组别球员</span>
            </button>
          </div>

          {/* Player Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {categoryPlayersInfo.all
              .filter(item => {
                if (playerFilterStatus === 'participating' && item.status !== 'participating') return false;
                if (playerFilterStatus === 'opt_out' && item.status !== 'opt_out') return false;
                if (playerSearch) {
                  const query = playerSearch.toLowerCase();
                  return item.player.name.toLowerCase().includes(query) || item.player.number.toString().includes(query);
                }
                return true;
              })
              .map(item => {
                const p = item.player;
                const isParticipating = item.status === 'participating';
                const originalTeam = teams.find(t => t.id === p.teamId);

                return (
                  <div
                    key={p.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-2 ${
                      isParticipating
                        ? 'bg-white border-gray-100 hover:border-amber-300 shadow-2xs'
                        : 'bg-gray-50 border-gray-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs border overflow-hidden shrink-0 ${
                        isParticipating ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-gray-200 text-gray-500 border-gray-300'
                      }`}>
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          p.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-gray-900 text-sm">{p.name}</span>
                          <span className="text-[10px] font-mono text-gray-400">#{p.number}</span>
                          {item.isCrossCategory && (
                            <span className="text-[8px] font-black bg-blue-100 text-blue-800 px-1 py-0.2 rounded">跨组</span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          原梯队: {originalTeam?.name || '未指定'} • 生日: {p.birthDate || '未知'}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleTogglePlayerStatus(p.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isParticipating
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-rose-100 hover:text-rose-800'
                          : 'bg-gray-200 text-gray-600 hover:bg-emerald-100 hover:text-emerald-800'
                      }`}
                    >
                      {isParticipating ? '参训中' : '已选择不参加'}
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* STEP 2: Format & Game Rules */}
      {activeStep === 'format' && activeCategory && (
        <div className="space-y-6 animate-in fade-in duration-200 max-w-4xl mx-auto">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-bvb-yellow" />
                <span>【{activeCategory.name}】比赛赛制与人数规格设置</span>
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                与国际普通青训赛制接轨，支持选择3人制、5人制、8人制、11人制，以及杯赛（小组淘汰赛）或联赛（单/双循环积分赛）。
              </p>
            </div>

            {/* Pitch Format Selection */}
            <div>
              <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                1. 人数规格 (Pitch Format)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(['3人制', '5人制', '8人制', '11人制'] as PitchFormat[]).map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => updateActiveCategory(c => ({ ...c, pitchFormat: fmt }))}
                    className={`p-4 rounded-2xl border-2 font-black text-sm transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      activeCategory.pitchFormat === fmt
                        ? 'bg-bvb-yellow/20 border-bvb-yellow text-bvb-black shadow-md scale-102'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-white'
                    }`}
                  >
                    <Users className="w-6 h-6 text-bvb-black" />
                    <span>{fmt}</span>
                    <span className="text-[10px] text-gray-500 font-normal">
                      {fmt === '3人制' ? '微型无门将/小门' : fmt === '5人制' ? '室内/标准5人制' : fmt === '8人制' ? '标准青训8人制' : '标准全尺寸'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tournament Format Selection */}
            <div>
              <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                2. 比赛赛制 (Tournament Format)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => updateActiveCategory(c => ({ ...c, tournamentType: 'group_knockout' }))}
                  className={`p-5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    activeCategory.tournamentType === 'group_knockout'
                      ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-200'
                      : 'bg-gray-50 border-gray-200 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-gray-900 text-base flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-amber-500" />
                      <span>小组赛 + 淘汰赛 (杯赛)</span>
                    </span>
                    {activeCategory.tournamentType === 'group_knockout' && (
                      <CheckCircle2 className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    先进行单循环小组赛积累出线名额，后续进入半决赛、三四名排位赛及冠军决赛决出杯赛名次。
                  </p>
                </button>

                <button
                  onClick={() => updateActiveCategory(c => ({ ...c, tournamentType: 'league' }))}
                  className={`p-5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    activeCategory.tournamentType === 'league'
                      ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200'
                      : 'bg-gray-50 border-gray-200 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-gray-900 text-base flex items-center gap-2">
                      <BarChart2 className="w-5 h-5 text-blue-500" />
                      <span>积分大循环赛 (联赛)</span>
                    </span>
                    {activeCategory.tournamentType === 'league' && (
                      <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    所有队伍之间进行单循环或双循环积分比赛，胜3分、平1分、负0分，按总积分与净胜球决出最终联赛冠军。
                  </p>
                </button>
              </div>
            </div>

            {/* Additional League Settings */}
            {activeCategory.tournamentType === 'league' && (
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center justify-between">
                <div>
                  <span className="font-black text-xs text-blue-900">循环回合设置</span>
                  <p className="text-[11px] text-blue-700">设置联赛单循环或双循环</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateActiveCategory(c => ({ ...c, legCount: 1 }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeCategory.legCount === 1 ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-blue-900 border border-blue-200'
                    }`}
                  >
                    单循环 (1回合)
                  </button>
                  <button
                    onClick={() => updateActiveCategory(c => ({ ...c, legCount: 2 }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeCategory.legCount === 2 ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-blue-900 border border-blue-200'
                    }`}
                  >
                    双循环 (2主客场)
                  </button>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setActiveStep('draft')}
                className="px-6 py-2.5 bg-bvb-black text-white font-black text-xs rounded-xl hover:bg-gray-800 transition-all flex items-center gap-2 shadow-md cursor-pointer"
              >
                <span>下一步：分配球队与线上抽签</span>
                <ChevronRight className="w-4 h-4 text-bvb-yellow" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Teams & Online Lottery System */}
      {activeStep === 'draft' && activeCategory && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Controls Bar */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-gray-900 text-base flex items-center gap-2">
                <Dices className="w-5 h-5 text-bvb-yellow" />
                <span>【{activeCategory.name}】球队分组与线上抽签系统</span>
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                先制定教练员盲盒能力档位分配，然后启动队长盲盒抽选及组别配对系统。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Team Count Picker */}
              <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-2xl">
                <span className="text-xs font-bold text-gray-600 px-2">队伍数:</span>
                {[2, 3, 4, 6, 8].map(num => (
                  <button
                    key={num}
                    onClick={() => handleSetTeamCount(num)}
                    className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                      categoryTeams.length === num
                        ? 'bg-bvb-black text-white shadow-xs'
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {num}队
                  </button>
                ))}
              </div>

              {/* Draft Buttons */}
              <button
                onClick={handleRunCaptainLottery}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Crown className="w-4 h-4 text-yellow-200" />
                <span>1. 抽选队长 (Captain Lottery)</span>
              </button>

              <button
                onClick={handleRunRoundLottery}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Shuffle className="w-4 h-4 text-purple-200" />
                <span>2. 队长轮流抽盲盒</span>
              </button>

              <button
                onClick={handleRunInstantFairDraft}
                className="px-4 py-2 bg-bvb-black hover:bg-gray-800 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-bvb-yellow" />
                <span>一键全自动抽签</span>
              </button>

              <button
                onClick={handleResetDraft}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="重置当前组别的球队分组与队长"
              >
                <RotateCcw className="w-4 h-4 text-rose-600" />
                <span>一键重置抽签</span>
              </button>
            </div>
          </div>

          {/* Coach Skill Tier Setup Section */}
          {isTierSetupCollapsed ? (
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-100/30 to-amber-50/60 p-4 rounded-3xl border border-amber-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shadow-xs shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-xs text-gray-900 flex items-center gap-2">
                    <span>教练员盲盒能力档位已设定（保护学员自尊，已隐去具体档位标签）</span>
                    <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md text-[10px] font-bold">
                      已划分 {calculatedTierCount} 档位
                    </span>
                  </h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    盲盒抽签算法正在按设置的 A/B/C/D 档位进行等量对等抽取，球队名册中不会向球员显示档位称号。
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsTierSetupCollapsed(false)}
                className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 font-black text-xs rounded-xl border border-amber-300 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
              >
                <Eye className="w-3.5 h-3.5 text-amber-600" />
                <span>展开/修改盲盒档位</span>
              </button>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-amber-500/10 via-amber-100/30 to-white p-5 rounded-3xl border border-amber-200/80 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/60 pb-3">
                <div>
                  <h4 className="font-black text-sm text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>教练员盲盒档位分配设置 (技战术能力划分)</span>
                  </h4>
                  <p className="text-xs text-gray-600 mt-1">
                    抽签前教练员将参赛学员划分为 {calculatedTierCount} 个档位（A/B/C/D/E...），盲盒抽签时随机抽取1个档位作为队长，队长再轮流抽取其余档位盲盒，确保队间实力平衡。
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAutoSkillTier}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>一键智能盲盒分档</span>
                  </button>

                  <button
                    onClick={() => setIsTierSetupCollapsed(true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-200" />
                    <span>确认分档并隐藏设置</span>
                  </button>
                </div>
              </div>

              {/* Summary Metrics Pill Bar */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-gray-700 bg-white/80 p-2.5 rounded-2xl border border-amber-100">
                <span className="bg-amber-100 text-amber-900 px-2.5 py-1 rounded-xl">
                  👥 确认参赛: <strong className="font-black text-amber-900">{participatingList.length}</strong> 人
                </span>
                <span className="bg-blue-100 text-blue-900 px-2.5 py-1 rounded-xl">
                  🛡️ 比赛球队: <strong className="font-black text-blue-900">{teamCount}</strong> 队
                </span>
                <span className="bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-xl">
                  ⚽ 每队编制: <strong className="font-black text-emerald-900">{Math.ceil(participatingList.length / (teamCount || 1))}</strong> 人/队
                </span>
                <span className="bg-purple-100 text-purple-900 px-2.5 py-1 rounded-xl">
                  📦 划分盲盒档数: <strong className="font-black text-purple-900">{calculatedTierCount}</strong> 档
                </span>
              </div>

              {/* Tier Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {Array.from({ length: calculatedTierCount }).map((_, tierIdx) => {
                  const config = TIER_CONFIGS[tierIdx % TIER_CONFIGS.length];
                  const tierPlayers = playersByTier[tierIdx] || [];

                  return (
                    <div key={tierIdx} className={`p-3 rounded-2xl border ${config.border} ${config.lightBg} space-y-2 flex flex-col justify-between`}>
                      <div>
                        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-gray-200/60">
                          <span className={`text-xs font-black px-2 py-0.5 rounded-lg shadow-xs ${config.badge}`}>
                            {config.label}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-gray-500">
                            {tierPlayers.length}人
                          </span>
                        </div>

                        {/* Tier Players List */}
                        <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                          {tierPlayers.length === 0 ? (
                            <div className="text-[11px] text-gray-400 italic text-center py-2">暂无队员</div>
                          ) : (
                            tierPlayers.map(p => (
                              <div key={p.id} className="bg-white/90 p-1.5 rounded-xl border border-gray-100 flex items-center justify-between text-xs font-bold text-gray-800">
                                <div className="flex items-center gap-1.5 truncate">
                                  <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center font-black text-[9px] overflow-hidden shrink-0">
                                    {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : p.name.charAt(0)}
                                  </div>
                                  <span className="truncate">{p.name}</span>
                                  <span className="text-[9px] text-gray-400 font-mono shrink-0">#{p.number}</span>
                                </div>

                                {/* Dropdown to adjust Tier */}
                                <select
                                  value={tierIdx}
                                  onChange={(e) => handleSetPlayerTier(p.id, parseInt(e.target.value))}
                                  className="text-[9px] font-black bg-gray-50 border border-gray-200 rounded px-1 py-0.5 text-gray-700 outline-none cursor-pointer hover:bg-white"
                                >
                                  {Array.from({ length: calculatedTierCount }).map((_, tIndex) => (
                                    <option key={tIndex} value={tIndex}>
                                      {TIER_CONFIGS[tIndex % TIER_CONFIGS.length].name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Lottery Animation Notice Banner */}
          {lotteryMessage && (
            <div className={`p-4 rounded-2xl border text-center transition-all ${
              isLotteryAnimating ? 'bg-amber-100 border-amber-300 text-amber-900 animate-pulse' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              <div className="flex items-center justify-center gap-3">
                <Dices className={`w-6 h-6 ${isLotteryAnimating ? 'animate-spin text-amber-600' : 'text-emerald-600'}`} />
                <span className="font-black text-sm">{lotteryMessage}</span>
                {lotteryHighlightedPlayer && isLotteryAnimating && (
                  <span className="bg-amber-500 text-white font-black px-3 py-1 rounded-xl text-xs shadow-xs animate-bounce">
                    🎯 候选: {lotteryHighlightedPlayer.name} (#{lotteryHighlightedPlayer.number})
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Teams Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {categoryTeams.map((team, tIdx) => {
              const presetColor = TEAM_PRESET_COLORS.find(c => c.hex === team.color) || TEAM_PRESET_COLORS[tIdx % TEAM_PRESET_COLORS.length];
              const captain = players.find(p => p.id === team.captainPlayerId);

              return (
                <div key={team.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                  {/* Team Header */}
                  <div className={`p-4 ${presetColor.bg} text-white flex justify-between items-center`}>
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-white/90" />
                      <input
                        type="text"
                        value={team.name}
                        onChange={(e) => {
                          const updated = categoryTeams.map(t => t.id === team.id ? { ...t, name: e.target.value } : t);
                          const other = currentTournament.teams.filter(t => t.categoryId !== activeCategory.id);
                          updateCurrentTournament(tour => ({ ...tour, teams: [...other, ...updated] }));
                        }}
                        className="font-black text-base bg-transparent border-b border-white/30 text-white outline-none w-28 focus:border-white"
                      />
                    </div>
                    <span className="text-xs font-mono bg-black/20 px-2 py-0.5 rounded-full font-bold">
                      {team.playerIds.length} 人
                    </span>
                  </div>

                  {/* Captain Banner */}
                  <div className="bg-gray-50 p-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-[11px] font-black text-gray-500 flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5 text-amber-500" /> 队内队长:
                    </span>
                    {captain ? (
                      <span className="text-xs font-black text-gray-900 bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-lg border border-amber-200">
                        {captain.name} (#{captain.number})
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-400 italic">未抽选</span>
                    )}
                  </div>

                  {/* Player List */}
                  <div className="p-3 flex-1 space-y-2 min-h-[200px] max-h-[350px] overflow-y-auto">
                    {team.playerIds.map(pid => {
                      const p = players.find(x => x.id === pid);
                      if (!p) return null;
                      const isCap = pid === team.captainPlayerId;

                      return (
                        <div key={pid} className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-100 text-xs font-bold text-gray-800">
                          <div className="flex items-center gap-1.5 truncate">
                            <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center font-black text-[10px] overflow-hidden shrink-0">
                              {p.image ? (
                                <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                p.name.charAt(0)
                              )}
                            </div>
                            <span className="truncate">{p.name}</span>
                            <span className="text-[10px] text-gray-400 font-mono shrink-0">#{p.number}</span>
                            {isCap && (
                              <span className="text-[9px] font-black bg-amber-400 text-black px-1.5 py-0.2 rounded shrink-0">队长</span>
                            )}
                          </div>

                          {/* Quick Transfer Option */}
                          <select
                            value={team.id}
                            onChange={(e) => handleManualMovePlayer(p.id, e.target.value)}
                            className="bg-white border border-gray-200 text-[10px] font-bold rounded p-0.5 text-gray-600 outline-none cursor-pointer"
                          >
                            {categoryTeams.map(targetT => (
                              <option key={targetT.id} value={targetT.id}>{targetT.name}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Unassigned & Opted-out Players Section */}
          {(() => {
            const assignedPlayerIds = new Set(categoryTeams.flatMap(t => t.playerIds));
            const unassignedPlayers = categoryPlayersInfo.participating
              .map(item => item.player)
              .filter(p => !assignedPlayerIds.has(p.id));
            const optOutPlayers = categoryPlayersInfo.optOut.map(item => item.player);

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Unassigned Participating Players */}
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <h4 className="font-black text-xs text-gray-800 uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-4 h-4 text-amber-500" />
                      <span>待分配参训学员 ({unassignedPlayers.length} 人)</span>
                    </h4>
                    <span className="text-[10px] text-gray-400">参训但尚未加入队伍</span>
                  </div>

                  {unassignedPlayers.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-xs italic">
                      所有参训学员均已分配至队伍！
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto p-1">
                      {unassignedPlayers.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-2 rounded-xl bg-amber-50/60 border border-amber-200/60 text-xs font-bold text-gray-800">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-amber-200 text-amber-900 border border-amber-400 flex items-center justify-center font-black text-xs overflow-hidden shrink-0">
                              {p.image ? (
                                <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                p.name.charAt(0)
                              )}
                            </div>
                            <div>
                              <div className="font-black text-gray-900">{p.name} <span className="text-[10px] text-gray-400">#{p.number}</span></div>
                            </div>
                          </div>

                          {/* Quick Assign to Team */}
                          {categoryTeams.length > 0 && (
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleManualMovePlayer(p.id, e.target.value);
                                }
                              }}
                              className="bg-white border border-amber-300 text-[10px] font-bold rounded p-1 text-amber-900 outline-none cursor-pointer"
                            >
                              <option value="" disabled>+ 分配至...</option>
                              {categoryTeams.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Opted-out Non-participating Players */}
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <h4 className="font-black text-xs text-rose-800 uppercase tracking-wider flex items-center gap-2">
                      <UserX className="w-4 h-4 text-rose-500" />
                      <span>不参加比赛人员 ({optOutPlayers.length} 人)</span>
                    </h4>
                    <span className="text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full font-bold">不参加本次比赛</span>
                  </div>

                  {optOutPlayers.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-xs italic">
                      无全组别选择不参加的学员
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto p-1">
                      {optOutPlayers.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-2 rounded-xl bg-gray-100 border border-gray-200 text-xs font-bold text-gray-500 opacity-75">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 border border-gray-300 flex items-center justify-center font-black text-xs overflow-hidden shrink-0">
                              {p.image ? (
                                <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                p.name.charAt(0)
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-gray-700">{p.name} <span className="text-[10px] text-gray-400">#{p.number}</span></div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleTogglePlayerStatus(p.id)}
                            className="text-[10px] bg-emerald-100 text-emerald-800 hover:bg-emerald-200 px-2 py-1 rounded-lg font-bold cursor-pointer"
                          >
                            改参加
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          <div className="pt-4 flex justify-end">
            <button
              onClick={() => handleGenerateSchedule(true)}
              className="px-6 py-3 bg-bvb-yellow text-bvb-black font-black text-xs rounded-xl shadow-lg hover:bg-yellow-400 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Calendar className="w-4 h-4 text-bvb-black" />
              <span>生成对阵赛程与抽签落位 (Generate Schedule)</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Fixtures & Match Results Entry */}
      {activeStep === 'schedule' && activeCategory && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-gray-900 text-base flex items-center gap-2">
                <Calendar className="w-5 h-5 text-bvb-yellow" />
                <span>【{activeCategory.name}】赛程列表与成绩录入</span>
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                点击赛程卡片上的【录入比分】填写进球数、进球者与助攻人，系统将自动汇总积分榜与射手榜。
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleGenerateSchedule(true)}
                className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>重新抽签/落位赛程</span>
              </button>
            </div>
          </div>

          {/* Matches Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoryMatches.length === 0 ? (
              <div className="col-span-2 text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200 text-gray-400 text-xs italic">
                尚未生成赛程，请点击上方【生成对阵赛程】按钮。
              </div>
            ) : (
              categoryMatches.map(match => {
                const homeTeam = categoryTeams.find(t => t.id === match.homeTeamId);
                const awayTeam = categoryTeams.find(t => t.id === match.awayTeamId);
                const isCompleted = match.status === 'completed';

                return (
                  <div key={match.id} className="bg-white rounded-3xl border border-gray-100 p-5 shadow-xs flex flex-col justify-between space-y-4">
                    {/* Match Header */}
                    <div className="flex items-center justify-between text-xs text-gray-500 border-b border-gray-100 pb-2.5">
                      <span className="font-black text-gray-700 bg-gray-100 px-2.5 py-0.5 rounded-full">
                        {match.groupName ? match.groupName : match.notes || '常规对阵'}
                      </span>
                      <span className={`font-bold px-2 py-0.5 rounded-full ${
                        isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isCompleted ? '已完赛' : '未开赛'}
                      </span>
                    </div>

                    {/* Teams Score Banner */}
                    <div className="flex items-center justify-around py-2">
                      <div className="text-center space-y-1 w-2/5">
                        <div className="font-black text-base text-gray-900">{homeTeam?.name || 'Home'}</div>
                        <span className="text-[10px] text-gray-400 font-bold block">主场</span>
                      </div>

                      <div className="text-center px-4">
                        {isCompleted ? (
                          <div className="text-2xl font-black text-bvb-black bg-amber-50 px-4 py-1.5 rounded-2xl border border-amber-200">
                            {match.homeScore} : {match.awayScore}
                          </div>
                        ) : (
                          <div className="text-sm font-black text-gray-400 bg-gray-100 px-3 py-1 rounded-xl">
                            VS
                          </div>
                        )}
                      </div>

                      <div className="text-center space-y-1 w-2/5">
                        <div className="font-black text-base text-gray-900">{awayTeam?.name || 'Away'}</div>
                        <span className="text-[10px] text-gray-400 font-bold block">客场</span>
                      </div>
                    </div>

                    {/* Goals summary if any */}
                    {isCompleted && (match.goals || []).length > 0 && (
                      <div className="p-3 bg-gray-50 rounded-2xl text-[11px] text-gray-600 space-y-1">
                        <span className="font-bold text-gray-400 block text-[9px] uppercase">进球明细:</span>
                        {match.goals?.map(g => {
                          const scorer = players.find(x => x.id === g.scorerPlayerId);
                          const assist = players.find(x => x.id === g.assistantPlayerId);
                          return (
                            <div key={g.id} className="flex items-center gap-1 font-bold">
                              <span>⚽ {scorer?.name || '球员'}</span>
                              {assist && <span className="text-gray-400 font-normal">(助攻: {assist.name})</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Score Entry Button */}
                    <div className="pt-2 border-t border-gray-100 flex justify-end">
                      <button
                        onClick={() => {
                          setEditingMatch(match);
                          setEditingHomeScore(match.homeScore || 0);
                          setEditingAwayScore(match.awayScore || 0);
                          setEditingGoals(match.goals || []);
                        }}
                        className="px-4 py-1.5 bg-bvb-black hover:bg-gray-800 text-white font-black text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-bvb-yellow" />
                        <span>{isCompleted ? '修改比分/进球' : '录入比赛比分'}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* STEP 5: Standings & Leaderboards */}
      {activeStep === 'standings' && activeCategory && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* League Table */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-black text-gray-900 text-base flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-bvb-yellow" />
                <span>【{activeCategory.name}】积分榜 (Standings)</span>
              </h3>
              <span className="text-xs text-gray-500 font-bold">按积分/净胜球/进球数自动排序</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 font-black uppercase tracking-wider text-[10px] border-b border-gray-100">
                    <th className="p-3">排名</th>
                    <th className="p-3">球队</th>
                    <th className="p-3 text-center">已赛</th>
                    <th className="p-3 text-center">胜</th>
                    <th className="p-3 text-center">平</th>
                    <th className="p-3 text-center">负</th>
                    <th className="p-3 text-center">进球</th>
                    <th className="p-3 text-center">失球</th>
                    <th className="p-3 text-center">净胜球</th>
                    <th className="p-3 text-center text-amber-600 font-black">积分</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-bold text-gray-800">
                  {categoryStandings.map((item, idx) => (
                    <tr key={item.team.id} className={idx === 0 ? 'bg-amber-50/50' : ''}>
                      <td className="p-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${
                          idx === 0 ? 'bg-amber-400 text-black' : idx === 1 ? 'bg-gray-300 text-black' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="p-3 font-black text-sm text-gray-900 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.team.color }}></span>
                        <span>{item.team.name}</span>
                        {idx === 0 && <Trophy className="w-4 h-4 text-amber-500" />}
                      </td>
                      <td className="p-3 text-center">{item.played}</td>
                      <td className="p-3 text-center text-emerald-600">{item.won}</td>
                      <td className="p-3 text-center text-gray-500">{item.drawn}</td>
                      <td className="p-3 text-center text-rose-600">{item.lost}</td>
                      <td className="p-3 text-center">{item.gf}</td>
                      <td className="p-3 text-center">{item.ga}</td>
                      <td className="p-3 text-center font-mono">{item.gd > 0 ? `+${item.gd}` : item.gd}</td>
                      <td className="p-3 text-center text-amber-600 font-black text-base">{item.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Leaderboards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Golden Boot Top Scorers */}
            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
              <h3 className="font-black text-gray-900 text-base flex items-center gap-2 border-b border-gray-100 pb-3">
                <Flame className="w-5 h-5 text-amber-500" />
                <span>射手榜 (Top Scorers)</span>
              </h3>

              <div className="space-y-2">
                {categoryLeaderboard.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-xs italic">暂无进球数据</div>
                ) : (
                  categoryLeaderboard.map((item, idx) => (
                    <div key={item.player.id} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-3">
                        <span className="font-black text-xs w-5 text-gray-400">#{idx + 1}</span>
                        <div>
                          <div className="font-black text-sm text-gray-900">{item.player.name}</div>
                          <div className="text-[10px] text-gray-400 font-bold">
                            所属球队: {item.team?.name || '未知'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-lg text-amber-600">{item.goals} ⚽</span>
                        <span className="text-[10px] text-gray-400 block">{item.assists} 助攻</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Assists Chart */}
            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
              <h3 className="font-black text-gray-900 text-base flex items-center gap-2 border-b border-gray-100 pb-3">
                <Award className="w-5 h-5 text-blue-500" />
                <span>助攻榜 (Top Assists)</span>
              </h3>

              <div className="space-y-2">
                {[...categoryLeaderboard].sort((a, b) => b.assists - a.assists).length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-xs italic">暂无助攻数据</div>
                ) : (
                  [...categoryLeaderboard]
                    .sort((a, b) => b.assists - a.assists)
                    .map((item, idx) => (
                      <div key={item.player.id} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                        <div className="flex items-center gap-3">
                          <span className="font-black text-xs w-5 text-gray-400">#{idx + 1}</span>
                          <div>
                            <div className="font-black text-sm text-gray-900">{item.player.name}</div>
                            <div className="text-[10px] text-gray-400 font-bold">
                              所属球队: {item.team?.name || '未知'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-lg text-blue-600">{item.assists} 👟</span>
                          <span className="text-[10px] text-gray-400 block">{item.goals} 进球</span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Match Score Entry Modal */}
      {editingMatch && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 border border-gray-100">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-black text-lg text-gray-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-bvb-yellow" />
                <span>录入/修改比赛成绩与进球</span>
              </h3>
              <button onClick={() => setEditingMatch(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Score Inputs */}
            <div className="flex items-center justify-around bg-gray-50 p-4 rounded-2xl">
              <div className="text-center">
                <span className="font-black text-sm text-gray-800 block mb-2">
                  {categoryTeams.find(t => t.id === editingMatch.homeTeamId)?.name}
                </span>
                <input
                  type="number"
                  min="0"
                  value={editingHomeScore}
                  onChange={(e) => setEditingHomeScore(parseInt(e.target.value) || 0)}
                  className="w-16 h-12 text-center text-2xl font-black bg-white border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <span className="text-2xl font-black text-gray-400">:</span>

              <div className="text-center">
                <span className="font-black text-sm text-gray-800 block mb-2">
                  {categoryTeams.find(t => t.id === editingMatch.awayTeamId)?.name}
                </span>
                <input
                  type="number"
                  min="0"
                  value={editingAwayScore}
                  onChange={(e) => setEditingAwayScore(parseInt(e.target.value) || 0)}
                  className="w-16 h-12 text-center text-2xl font-black bg-white border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>

            {/* Goal Scorer Addition */}
            <div className="space-y-3">
              <h4 className="font-black text-xs text-gray-700 uppercase tracking-wider">登记进球人与助攻人</h4>
              <div className="flex gap-2">
                <select
                  id="goalScorerSelect"
                  className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
                >
                  <option value="">选择进球球员...</option>
                  {categoryTeams
                    .filter(t => t.id === editingMatch.homeTeamId || t.id === editingMatch.awayTeamId)
                    .flatMap(t => t.playerIds)
                    .map(pid => {
                      const p = players.find(x => x.id === pid);
                      return p ? <option key={p.id} value={p.id}>{p.name} (#{p.number})</option> : null;
                    })}
                </select>

                <select
                  id="goalAssistSelect"
                  className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
                >
                  <option value="">选择助攻球员(可选)...</option>
                  {categoryTeams
                    .filter(t => t.id === editingMatch.homeTeamId || t.id === editingMatch.awayTeamId)
                    .flatMap(t => t.playerIds)
                    .map(pid => {
                      const p = players.find(x => x.id === pid);
                      return p ? <option key={p.id} value={p.id}>{p.name} (#{p.number})</option> : null;
                    })}
                </select>

                <button
                  onClick={() => {
                    const scorerEl = document.getElementById('goalScorerSelect') as HTMLSelectElement;
                    const assistEl = document.getElementById('goalAssistSelect') as HTMLSelectElement;
                    if (scorerEl && scorerEl.value) {
                      const scorerTeam = categoryTeams.find(t => t.playerIds.includes(scorerEl.value));
                      if (scorerTeam) {
                        handleAddGoal(scorerTeam.id, scorerEl.value, assistEl?.value);
                      }
                    }
                  }}
                  className="px-3 py-2 bg-emerald-600 text-white font-black text-xs rounded-xl hover:bg-emerald-700 cursor-pointer"
                >
                  + 记录进球
                </button>
              </div>

              {/* Goals list */}
              <div className="space-y-1.5 max-h-36 overflow-y-auto pt-2">
                {editingGoals.map(g => {
                  const scorer = players.find(x => x.id === g.scorerPlayerId);
                  const assist = players.find(x => x.id === g.assistantPlayerId);

                  return (
                    <div key={g.id} className="flex items-center justify-between p-2 rounded-xl bg-gray-50 text-xs font-bold">
                      <span>⚽ {scorer?.name} {assist ? `(助攻: ${assist.name})` : ''}</span>
                      <button onClick={() => handleRemoveGoal(g.id)} className="text-rose-600 hover:underline cursor-pointer">删除</button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button onClick={() => setEditingMatch(null)} className="px-4 py-2 bg-gray-100 font-bold text-xs rounded-xl cursor-pointer">取消</button>
              <button onClick={handleSaveMatchScore} className="px-5 py-2 bg-bvb-black text-white font-black text-xs rounded-xl hover:bg-gray-800 cursor-pointer">保存成绩</button>
            </div>
          </div>
        </div>
      )}

      {/* New Tournament Creation Modal */}
      {showNewTournamentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-gray-100">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-black text-lg text-gray-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-bvb-yellow" />
                <span>创建全新队内赛项目</span>
              </h3>
              <button onClick={() => setShowNewTournamentModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                赛事项目名称
              </label>
              <input
                type="text"
                placeholder="例如: 2026顽石之光秋季班级杯"
                value={newTournamentTitle}
                onChange={(e) => setNewTournamentTitle(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-bvb-yellow"
              />
            </div>

            <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-800 font-medium">
              💡 系统将自动为您预设 U7 - U12 标准梯队组别，创建后即可自由管理。
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button onClick={() => setShowNewTournamentModal(false)} className="px-4 py-2 bg-gray-100 font-bold text-xs rounded-xl cursor-pointer">取消</button>
              <button onClick={handleCreateNewTournament} className="px-5 py-2 bg-bvb-black text-white font-black text-xs rounded-xl hover:bg-gray-800 cursor-pointer">确认创建</button>
            </div>
          </div>
        </div>
      )}

      {/* Category Edit Settings Modal */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-gray-100">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-black text-lg text-gray-900 flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-bvb-yellow" />
                <span>编辑组别参数 ({editingCategory.name})</span>
              </h3>
              <button onClick={() => setEditingCategory(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1">组别名称</label>
                <input
                  type="text"
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1">赛制 / 人数限制</label>
                <select
                  value={editingCategory.pitchFormat}
                  onChange={(e) => setEditingCategory({ ...editingCategory, pitchFormat: e.target.value as PitchFormat })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
                >
                  <option value="3人制">3人制 (小场地无门将)</option>
                  <option value="5人制">5人制 (标准半场/室内)</option>
                  <option value="8人制">8人制 (中型场地)</option>
                  <option value="11人制">11人制 (全场标准)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1">出生起始日期</label>
                  <input
                    type="date"
                    value={editingCategory.minBirthDate}
                    onChange={(e) => setEditingCategory({ ...editingCategory, minBirthDate: e.target.value })}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1">出生截止日期</label>
                  <input
                    type="date"
                    value={editingCategory.maxBirthDate}
                    onChange={(e) => setEditingCategory({ ...editingCategory, maxBirthDate: e.target.value })}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <button
                onClick={() => {
                  const catToDelete = editingCategory;
                  setEditingCategory(null);
                  handleDeleteCategory(catToDelete.id, catToDelete.name);
                }}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>删除此组别</span>
              </button>

              <div className="flex items-center gap-2">
                <button onClick={() => setEditingCategory(null)} className="px-4 py-2 bg-gray-100 font-bold text-xs rounded-xl cursor-pointer">取消</button>
                <button
                  onClick={() => {
                    updateActiveCategory(() => editingCategory);
                    setEditingCategory(null);
                  }}
                  className="px-5 py-2 bg-bvb-black text-white font-black text-xs rounded-xl hover:bg-gray-800 cursor-pointer"
                >
                  保存设置
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Category Modal */}
      {showNewCategoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-gray-100">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-black text-lg text-gray-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-bvb-yellow" />
                <span>新增比赛组别</span>
              </h3>
              <button onClick={() => setShowNewCategoryModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1">组别名称</label>
                <input
                  type="text"
                  placeholder="例如: U13 组别 / 女足组"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:ring-1 focus:ring-bvb-yellow"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1">赛制 / 人数限制</label>
                <select
                  value={newCategoryPitchFormat}
                  onChange={(e) => setNewCategoryPitchFormat(e.target.value as PitchFormat)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
                >
                  <option value="3人制">3人制 (小场地无门将)</option>
                  <option value="5人制">5人制 (标准半场/室内)</option>
                  <option value="8人制">8人制 (中型场地)</option>
                  <option value="11人制">11人制 (全场标准)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1">出生起始日期</label>
                  <input
                    type="date"
                    value={newCategoryMinBirthDate}
                    onChange={(e) => setNewCategoryMinBirthDate(e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1">出生截止日期</label>
                  <input
                    type="date"
                    value={newCategoryMaxBirthDate}
                    onChange={(e) => setNewCategoryMaxBirthDate(e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button onClick={() => setShowNewCategoryModal(false)} className="px-4 py-2 bg-gray-100 font-bold text-xs rounded-xl cursor-pointer">取消</button>
              <button
                onClick={handleCreateCategory}
                className="px-5 py-2 bg-bvb-black text-white font-black text-xs rounded-xl hover:bg-gray-800 cursor-pointer"
              >
                确认创建组别
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cross Category Player Selection Modal */}
      {isCrossCategoryModalOpen && activeCategory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 border border-gray-100 max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-gray-100 pb-3 shrink-0">
              <div>
                <h3 className="font-black text-lg text-gray-900 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                  <span>添加跨组别球员 ({activeCategory.name})</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  可单选、多选或点击【全选当前筛选】批量添加其他梯队/组别的球员参加本组别赛事。
                </p>
              </div>
              <button onClick={() => setIsCrossCategoryModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Candidate Filtering & Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 p-3 rounded-2xl shrink-0">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                {/* Team Filter Dropdown */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-gray-500">原梯队:</span>
                  <select
                    value={crossModalTeamFilter}
                    onChange={(e) => setCrossModalTeamFilter(e.target.value)}
                    className="bg-white border border-gray-200 text-xs font-bold rounded-xl px-2.5 py-1.5 outline-none cursor-pointer"
                  >
                    <option value="all">所有球队/梯队</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                {/* Search Input */}
                <div className="relative flex-1 min-w-[160px]">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    placeholder="搜索学员姓名/球衣号..."
                    value={crossModalSearch}
                    onChange={(e) => setCrossModalSearch(e.target.value)}
                    className="w-full pl-8 pr-2 py-1 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none"
                  />
                </div>
              </div>

              {/* Quick Batch Select Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const visibleIds = candidatePlayers.map(p => p.id);
                    setSelectedCrossPlayerIds(prev => Array.from(new Set([...prev, ...visibleIds])));
                  }}
                  className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs rounded-lg transition-all cursor-pointer"
                >
                  全选当前筛选 ({candidatePlayers.length}人)
                </button>
                <button
                  onClick={() => setSelectedCrossPlayerIds([])}
                  className="px-2.5 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs rounded-lg transition-all cursor-pointer"
                >
                  清空选择
                </button>
              </div>
            </div>

            {/* Candidate Player Grid */}
            <div className="flex-1 overflow-y-auto min-h-[250px] p-1">
              {candidatePlayers.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-xs italic">
                  没有可供添加的球员 (所有匹配球员均已在本组别中)
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {candidatePlayers.map(p => {
                    const isChecked = selectedCrossPlayerIds.includes(p.id);
                    const originalTeam = teams.find(t => t.id === p.teamId);
                    const currentCategoryAssignment = playerCategoryMap[p.id];
                    const assignedCategoryObj = currentCategoryAssignment ? currentTournament.categories.find(c => c.id === currentCategoryAssignment.categoryId) : null;

                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          if (isChecked) {
                            setSelectedCrossPlayerIds(prev => prev.filter(id => id !== p.id));
                          } else {
                            setSelectedCrossPlayerIds(prev => [...prev, p.id]);
                          }
                        }}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isChecked
                            ? 'bg-blue-50/80 border-blue-400 shadow-2xs'
                            : 'bg-white border-gray-100 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer shrink-0"
                          />
                          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center font-black text-xs overflow-hidden shrink-0">
                            {p.image ? (
                              <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              p.name.charAt(0)
                            )}
                          </div>
                          <div className="truncate">
                            <div className="font-black text-gray-900 text-xs flex items-center gap-1 truncate">
                              <span>{p.name}</span>
                              <span className="text-[10px] text-gray-400 font-mono">#{p.number}</span>
                            </div>
                            <div className="text-[10px] text-gray-400 truncate">
                              {originalTeam?.name || '未指定梯队'}
                              {assignedCategoryObj && assignedCategoryObj.id !== activeCategory.id && (
                                <span className="text-amber-700 ml-1 font-bold">({assignedCategoryObj.name})</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center pt-3 border-t border-gray-100 shrink-0">
              <span className="text-xs font-bold text-gray-600">
                已选中 <span className="text-blue-600 font-black text-sm">{selectedCrossPlayerIds.length}</span> 名学员
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsCrossCategoryModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 font-bold text-xs rounded-xl cursor-pointer"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    handleBulkAddCrossCategoryPlayers(selectedCrossPlayerIds);
                    setIsCrossCategoryModalOpen(false);
                  }}
                  disabled={selectedCrossPlayerIds.length === 0}
                  className={`px-5 py-2 font-black text-xs rounded-xl transition-all cursor-pointer ${
                    selectedCrossPlayerIds.length > 0
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  确认添加 ({selectedCrossPlayerIds.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntramuralTournamentModule;
