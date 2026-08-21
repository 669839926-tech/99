import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Player, Team, Match, IntramuralTournament, User,
  PlayerCharacterAssessment, CharacterDimensionKey, CheckpointScore
} from '../types';
import { 
  Sparkles, Shield, Flame, Lightbulb, Users, Trophy, Award, Crown, 
  Search, CheckCircle2, ChevronRight, Download, 
  X, Save, Star,
  HelpCircle, Calendar, ArrowRight, FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { 
  CHARACTER_DIMENSIONS, CHARACTER_SCORING_OPTIONS, CHARACTER_BADGE_LEVELS,
  computeDimensionScoreAndBadge, createDefaultPlayerCharacterAssessment,
  recalculateCharacterAssessmentTotals, CharacterDimensionConfig
} from '../constants';
import { CharacterMedalBadge } from './CharacterMedalBadges';

interface PlayerCharacterModuleProps {
  players: Player[];
  teams: Team[];
  matches: Match[];
  intramuralTournaments?: IntramuralTournament[];
  currentUser?: User | null;
  appLogo?: string;
  characterAssessments: PlayerCharacterAssessment[];
  onUpdateCharacterAssessments: (assessments: PlayerCharacterAssessment[]) => void;
}

interface UnifiedMatchOption {
  id: string;
  type: 'regular' | 'intramural';
  title: string;
  subTitle: string;
  date: string;
  teamId?: string;
  teamName: string;
  opponentOrTeams: string;
  categoryName?: string;
  participantPlayerIds: string[];
  intramuralTeam?: any;
  intramuralTournament?: IntramuralTournament;
  regularMatch?: Match;
}

export const PlayerCharacterModule: React.FC<PlayerCharacterModuleProps> = ({
  players,
  teams,
  matches,
  intramuralTournaments = [],
  currentUser,
  appLogo,
  characterAssessments,
  onUpdateCharacterAssessments
}) => {
  // Main view modes
  const [activeTab, setActiveTab] = useState<'assess' | 'badgeWall' | 'standards'>('assess');
  const [matchSourceFilter, setMatchSourceFilter] = useState<'all' | 'regular' | 'intramural'>('all');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');
  const [searchMatchTerm, setSearchMatchTerm] = useState<string>('');
  
  // Selected match for evaluation
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [selectedPlayerForEval, setSelectedPlayerForEval] = useState<Player | null>(null);
  const [editingAssessment, setEditingAssessment] = useState<PlayerCharacterAssessment | null>(null);
  
  // Player filter within selected match
  const [playerStatusFilter, setPlayerStatusFilter] = useState<'all' | 'evaluated' | 'pending' | 'badges'>('all');
  const [searchPlayerTerm, setSearchPlayerTerm] = useState<string>('');
  
  // Modals
  const [showStandardGuideModal, setShowStandardGuideModal] = useState<boolean>(false);
  const [showCertificateModal, setShowCertificateModal] = useState<boolean>(false);
  const [certificateAssessment, setCertificateAssessment] = useState<PlayerCharacterAssessment | null>(null);
  const [certificatePlayer, setCertificatePlayer] = useState<Player | null>(null);
  const [isExportingCert, setIsExportingCert] = useState<boolean>(false);
  const certificateRef = useRef<HTMLDivElement>(null);

  // Auto reset selectedTeamFilter when switching source filter if invalid
  useEffect(() => {
    if (matchSourceFilter === 'intramural' && selectedTeamFilter !== 'all' && !selectedTeamFilter.startsWith('cat-')) {
      setSelectedTeamFilter('all');
    } else if (matchSourceFilter === 'regular' && selectedTeamFilter !== 'all' && selectedTeamFilter.startsWith('cat-')) {
      setSelectedTeamFilter('all');
    }
  }, [matchSourceFilter, selectedTeamFilter]);

  // Filter options for teams & intramural categories dropdown
  const teamAndCategoryOptions = useMemo(() => {
    const opts: { id: string; name: string }[] = [];
    
    // When showing regular or all
    if (matchSourceFilter === 'all' || matchSourceFilter === 'regular') {
      teams.forEach(t => opts.push({ id: t.id, name: `⚽ 常规梯队 · ${t.name}` }));
    }
    
    // When showing intramural or all
    if (matchSourceFilter === 'all' || matchSourceFilter === 'intramural') {
      const addedCats = new Set<string>();
      intramuralTournaments.forEach(tour => {
        (tour.categories || []).forEach(c => {
          if (!addedCats.has(c.name)) {
            addedCats.add(c.name);
            opts.push({ id: `cat-${c.name}`, name: `🏆 队内组别 · ${c.name}` });
          }
        });
      });
    }
    return opts;
  }, [teams, intramuralTournaments, matchSourceFilter]);

  // 1. Build unified match list combining Regular Matches and Intramural Teams
  const unifiedMatches: UnifiedMatchOption[] = useMemo(() => {
    const list: UnifiedMatchOption[] = [];

    // Helper: Check unassigned players
    const isUnassigned = (p: Player): boolean => {
      if (!p.teamId || p.teamId === 'unassigned' || p.teamId === 'unassigned_team' || p.teamId === 'pending' || p.teamId === 'none' || p.teamId === '0') {
        return true;
      }
      const team = teams.find(t => t.id === p.teamId);
      if (!team) return true;
      const name = team.name.toLowerCase();
      return name.includes('待分配') || name.includes('未指定') || name.includes('未归属') || name.includes('待定') || name.includes('未分配') || name.includes('无梯队');
    };

    // A. Regular matches
    matches.forEach(m => {
      const team = teams.find(t => t.id === m.teamId);
      const teamName = team ? team.name : '梯队';
      
      // Determine participant players (prefer lineup, fallback to team members)
      let participantIds: string[] = [];
      if (m.details?.lineup && m.details.lineup.length > 0) {
        participantIds = [...m.details.lineup, ...(m.details.substitutes || [])];
      } else if (m.teamId) {
        participantIds = players.filter(p => p.teamId === m.teamId).map(p => p.id);
      }

      list.push({
        id: `reg-${m.id}`,
        type: 'regular',
        title: `${teamName} vs ${m.opponent || '对手'}`,
        subTitle: `常规赛 · ${m.competition || '俱乐部赛'}`,
        date: m.date || '未定日期',
        teamId: m.teamId,
        teamName,
        opponentOrTeams: `vs ${m.opponent || '对手'}`,
        categoryName: teamName,
        participantPlayerIds: Array.from(new Set(participantIds)),
        regularMatch: m
      });
    });

    // B. Intramural Teams (按队内赛各球队/组别进行评定，严格限定参赛球员)
    intramuralTournaments.forEach(tour => {
      const tourDate = tour.createdAt?.split('T')[0] || '2026赛季';

      if (tour.teams && tour.teams.length > 0) {
        tour.teams.forEach(intraTeam => {
          const cat = (tour.categories || []).find(c => c.id === intraTeam.categoryId);
          const catName = cat?.name || '队内组别';
          const teamName = intraTeam.name || '参赛队';
          const captainPlayer = players.find(p => p.id === intraTeam.captainPlayerId);
          const format = cat?.pitchFormat || '队内赛';

          // Strictly the players assigned to this intramural team
          const participantIds = (intraTeam.playerIds || []).filter(pid => players.some(p => p.id === pid));

          list.push({
            id: `intra-team-${tour.id}-${intraTeam.id}`,
            type: 'intramural',
            title: `[${catName}] ${teamName}`,
            subTitle: `队内赛 · ${tour.title} · ${format}${captainPlayer ? ` · 队长: ${captainPlayer.name}` : ''}`,
            date: tourDate,
            teamName: `${catName} · ${teamName}`,
            opponentOrTeams: `${catName} · ${teamName}`,
            categoryName: catName,
            participantPlayerIds: Array.from(new Set(participantIds)),
            intramuralTeam: intraTeam,
            intramuralTournament: tour
          });
        });
      } else if (tour.categories && tour.categories.length > 0) {
        // Fallback: If no teams configured yet, group by participating players in category
        tour.categories.forEach(cat => {
          const catPlayerIds: string[] = [];
          players.forEach(p => {
            if (isUnassigned(p)) return;
            const ov = cat.playerOverrides?.[p.id];
            if (ov?.status === 'opt_out') return;
            if (ov?.status === 'participating') {
              catPlayerIds.push(p.id);
            } else if (p.birthDate && (!cat.minBirthDate || p.birthDate >= cat.minBirthDate) && (!cat.maxBirthDate || p.birthDate <= cat.maxBirthDate)) {
              catPlayerIds.push(p.id);
            }
          });

          list.push({
            id: `intra-cat-${tour.id}-${cat.id}`,
            type: 'intramural',
            title: `[${cat.name}] 参战球员`,
            subTitle: `队内赛 · ${tour.title} · ${cat.pitchFormat}`,
            date: tourDate,
            teamName: cat.name,
            opponentOrTeams: cat.name,
            categoryName: cat.name,
            participantPlayerIds: Array.from(new Set(catPlayerIds)),
            intramuralTournament: tour
          });
        });
      }
    });

    // Sort by date descending
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [matches, intramuralTournaments, teams, players]);

  // Filtered match options
  const filteredMatches = useMemo(() => {
    return unifiedMatches.filter(m => {
      if (matchSourceFilter !== 'all' && m.type !== matchSourceFilter) return false;
      if (selectedTeamFilter !== 'all') {
        if (selectedTeamFilter.startsWith('cat-')) {
          const targetCatName = selectedTeamFilter.replace('cat-', '');
          if (m.categoryName !== targetCatName && !m.title.includes(targetCatName)) return false;
        } else {
          if (m.type === 'regular' && m.teamId !== selectedTeamFilter) return false;
          if (m.type === 'intramural') {
            const teamPlayers = players.filter(p => p.teamId === selectedTeamFilter).map(p => p.id);
            const hasSharedPlayer = m.participantPlayerIds.some(pid => teamPlayers.includes(pid));
            const matchesTeamName = teams.find(t => t.id === selectedTeamFilter && m.title.includes(t.name));
            if (!hasSharedPlayer && !matchesTeamName) return false;
          }
        }
      }
      if (searchMatchTerm.trim()) {
        const term = searchMatchTerm.toLowerCase();
        const matchTitle = (m.title + ' ' + m.subTitle + ' ' + m.date + ' ' + m.opponentOrTeams).toLowerCase();
        if (!matchTitle.includes(term)) return false;
      }
      return true;
    });
  }, [unifiedMatches, matchSourceFilter, selectedTeamFilter, searchMatchTerm, players, teams]);

  // Default select first match if none selected
  const activeMatch = useMemo(() => {
    if (!selectedMatchId && filteredMatches.length > 0) {
      return filteredMatches[0];
    }
    return unifiedMatches.find(m => m.id === selectedMatchId) || (filteredMatches.length > 0 ? filteredMatches[0] : null);
  }, [selectedMatchId, filteredMatches, unifiedMatches]);

  // Players in the selected active match
  const matchPlayers = useMemo(() => {
    if (!activeMatch) return [];
    
    let candidatePlayers: Player[] = [];
    if (activeMatch.participantPlayerIds && activeMatch.participantPlayerIds.length > 0) {
      // STRICT: Only include players who actually participate in this match/intramural team
      candidatePlayers = players.filter(p => activeMatch.participantPlayerIds.includes(p.id));
    } else if (activeMatch.type === 'regular' && activeMatch.teamId) {
      candidatePlayers = players.filter(p => p.teamId === activeMatch.teamId);
    } else {
      // In intramural tournaments, if there are no registered players in this team/category, do not display regular squad players
      candidatePlayers = [];
    }

    return candidatePlayers;
  }, [activeMatch, players]);

  // Assessments for active match
  const activeMatchAssessments = useMemo(() => {
    if (!activeMatch) return [];
    return characterAssessments.filter(a => {
      if (a.matchId === activeMatch.id) return true;
      // Backward compatibility for previously saved assessments under older match ids
      if (activeMatch.type === 'intramural' && activeMatch.participantPlayerIds.includes(a.playerId)) {
        if (a.matchType === 'intramural' && (a.matchTitle.includes(activeMatch.categoryName || '') || a.matchId.startsWith('intra-'))) {
          return true;
        }
      }
      return false;
    });
  }, [characterAssessments, activeMatch]);

  // Map of playerId -> Assessment in active match
  const playerAssessmentMap = useMemo(() => {
    const map = new Map<string, PlayerCharacterAssessment>();
    activeMatchAssessments.forEach(a => {
      map.set(a.playerId, a);
    });
    return map;
  }, [activeMatchAssessments]);

  // Filtered players list for evaluation display
  const displayMatchPlayers = useMemo(() => {
    return matchPlayers.filter(p => {
      const assessment = playerAssessmentMap.get(p.id);
      const isEvaluated = !!assessment && assessment.totalValidScore > 0;
      const hasBadges = !!assessment && (assessment.standardBadgesCount > 0 || assessment.outstandingBadgesCount > 0);

      if (playerStatusFilter === 'evaluated' && !isEvaluated) return false;
      if (playerStatusFilter === 'pending' && isEvaluated) return false;
      if (playerStatusFilter === 'badges' && !hasBadges) return false;

      if (searchPlayerTerm.trim()) {
        const term = searchPlayerTerm.toLowerCase();
        const info = (p.name + ' ' + (p.number || '') + ' ' + (p.position || '')).toLowerCase();
        if (!info.includes(term)) return false;
      }
      return true;
    });
  }, [matchPlayers, playerAssessmentMap, playerStatusFilter, searchPlayerTerm]);

  // Match overall stats summary
  const matchCharacterStats = useMemo(() => {
    const totalCount = matchPlayers.length;
    const evaluatedCount = activeMatchAssessments.filter(a => a.totalValidScore > 0).length;
    let standardBadgeSum = 0;
    let outstandingBadgeSum = 0;
    let totalScoreSum = 0;
    let validScorePlayersCount = 0;

    // Dimension specific counts
    const dimScoreSum: Record<CharacterDimensionKey, { sum: number; count: number; standard: number; outstanding: number }> = {
      confidence: { sum: 0, count: 0, standard: 0, outstanding: 0 },
      resilience: { sum: 0, count: 0, standard: 0, outstanding: 0 },
      courage: { sum: 0, count: 0, standard: 0, outstanding: 0 },
      creativity: { sum: 0, count: 0, standard: 0, outstanding: 0 },
      cooperation: { sum: 0, count: 0, standard: 0, outstanding: 0 }
    };

    activeMatchAssessments.forEach(a => {
      standardBadgeSum += a.standardBadgesCount;
      outstandingBadgeSum += a.outstandingBadgesCount;
      if (a.totalValidScore > 0) {
        totalScoreSum += a.totalValidScore;
        validScorePlayersCount++;
      }

      (Object.keys(dimScoreSum) as CharacterDimensionKey[]).forEach(k => {
        const dim = a.dimensions[k];
        if (dim && dim.totalScore !== null) {
          dimScoreSum[k].sum += dim.totalScore;
          dimScoreSum[k].count++;
          if (dim.badgeLevel === 'standard') dimScoreSum[k].standard++;
          if (dim.badgeLevel === 'outstanding') dimScoreSum[k].outstanding++;
        }
      });
    });

    const averageTotal = validScorePlayersCount > 0 ? Number((totalScoreSum / validScorePlayersCount).toFixed(1)) : 0;

    return {
      totalCount,
      evaluatedCount,
      pendingCount: totalCount - evaluatedCount,
      standardBadgeSum,
      outstandingBadgeSum,
      totalBadgesSum: standardBadgeSum + outstandingBadgeSum,
      averageTotal,
      dimScoreSum
    };
  }, [matchPlayers, activeMatchAssessments]);

  // Start evaluating a player
  const handleOpenEvaluation = (player: Player) => {
    if (!activeMatch) return;
    setSelectedPlayerForEval(player);

    const existing = playerAssessmentMap.get(player.id);
    if (existing) {
      setEditingAssessment(JSON.parse(JSON.stringify(existing)));
    } else {
      const fresh = createDefaultPlayerCharacterAssessment(
        player.id,
        activeMatch.id,
        activeMatch.type,
        activeMatch.title,
        activeMatch.date,
        activeMatch.teamId,
        activeMatch.opponentOrTeams,
        currentUser?.name || '教练组'
      );
      setEditingAssessment(fresh);
    }
  };

  // Change checkpoint score in evaluation modal
  const handleScoreChange = (
    dimensionKey: CharacterDimensionKey,
    checkpoint: 'checkpoint1' | 'checkpoint2',
    value: CheckpointScore
  ) => {
    if (!editingAssessment) return;
    const currentDim = editingAssessment.dimensions[dimensionKey];
    const newDim = { ...currentDim, [checkpoint]: value };
    const { totalScore, badgeLevel } = computeDimensionScoreAndBadge(newDim.checkpoint1, newDim.checkpoint2);

    newDim.totalScore = totalScore;
    newDim.badgeLevel = badgeLevel;

    const updatedAssessment = {
      ...editingAssessment,
      dimensions: {
        ...editingAssessment.dimensions,
        [dimensionKey]: newDim
      }
    };

    setEditingAssessment(recalculateCharacterAssessmentTotals(updatedAssessment));
  };

  // Save current assessment
  const handleSaveEvaluation = (andNext: boolean = false) => {
    if (!editingAssessment || !selectedPlayerForEval) return;

    const finalAssessment = recalculateCharacterAssessmentTotals(editingAssessment);
    
    // Update list (ensure deduplication)
    const otherAssessments = characterAssessments.filter(a => {
      if (a.playerId !== finalAssessment.playerId) return true;
      if (a.matchId === finalAssessment.matchId) return false;
      if (finalAssessment.matchType === 'intramural' && a.matchType === 'intramural' && activeMatch?.participantPlayerIds.includes(a.playerId)) {
        if (a.matchId.startsWith('intra-') && (a.matchTitle.includes(activeMatch.categoryName || '') || a.matchId.includes(activeMatch.id))) {
          return false;
        }
      }
      return true;
    });
    const nextList = [...otherAssessments, finalAssessment];
    onUpdateCharacterAssessments(nextList);

    if (andNext) {
      // Find next player in current list
      const currentIndex = matchPlayers.findIndex(p => p.id === selectedPlayerForEval.id);
      if (currentIndex >= 0 && currentIndex < matchPlayers.length - 1) {
        const nextPlayer = matchPlayers[currentIndex + 1];
        handleOpenEvaluation(nextPlayer);
        return;
      }
    }

    setSelectedPlayerForEval(null);
    setEditingAssessment(null);
  };

  // Quick preset template (e.g. All 2 points for outstanding, or All 1.5 for standard)
  const handleApplyPreset = (preset: 'outstanding' | 'standard' | 'reset') => {
    if (!editingAssessment) return;
    const nextDims = { ...editingAssessment.dimensions };
    const keys: CharacterDimensionKey[] = ['confidence', 'resilience', 'courage', 'creativity', 'cooperation'];

    keys.forEach(k => {
      if (preset === 'outstanding') {
        nextDims[k] = {
          checkpoint1: 2,
          checkpoint2: 2,
          totalScore: 4,
          badgeLevel: 'outstanding'
        };
      } else if (preset === 'standard') {
        nextDims[k] = {
          checkpoint1: 2,
          checkpoint2: 1,
          totalScore: 3,
          badgeLevel: 'standard'
        };
      } else {
        nextDims[k] = {
          checkpoint1: null,
          checkpoint2: null,
          totalScore: null,
          badgeLevel: 'none'
        };
      }
    });

    setEditingAssessment(recalculateCharacterAssessmentTotals({
      ...editingAssessment,
      dimensions: nextDims
    }));
  };

  // Open Certificate Card Modal
  const handleOpenCertificate = (player: Player, assessment: PlayerCharacterAssessment) => {
    setCertificatePlayer(player);
    setCertificateAssessment(assessment);
    setShowCertificateModal(true);
  };

  // Export Certificate image
  const handleExportCertificate = async () => {
    if (!certificateRef.current) return;
    setIsExportingCert(true);
    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0a0a0c'
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `品质勋章证书_${certificatePlayer?.name || '球员'}_${certificateAssessment?.matchTitle || '比赛'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error('Export certificate error:', e);
    } finally {
      setIsExportingCert(false);
    }
  };

  // Export Current Match Evaluation Results to Excel
  const handleExportMatchExcel = () => {
    if (!activeMatch) return;

    const wb = XLSX.utils.book_new();

    // Sheet 1: 本场品质评定明细表
    const detailRows = matchPlayers.map((player, index) => {
      const assessment = playerAssessmentMap.get(player.id);
      const isEvaluated = !!assessment && assessment.totalValidScore > 0;
      const team = teams.find(t => t.id === player.teamId);

      const getDimData = (key: CharacterDimensionKey) => {
        if (!assessment) return { cp1: '', cp2: '', score: '', badge: '待评定', note: '' };
        const dim = assessment.dimensions[key];
        if (!dim || dim.totalScore === null) return { cp1: '', cp2: '', score: '', badge: '待评定', note: '' };
        const badgeLabel = dim.badgeLevel === 'outstanding' 
          ? '👑 卓越勋章 (4分)' 
          : (dim.badgeLevel === 'standard' 
              ? '🎖️ 达标勋章 (3分)' 
              : (dim.badgeLevel === 'observing' ? '🔍 重点观察 (1-2分)' : '待达标 (0分)'));
        return {
          cp1: dim.checkpoint1 !== null && dim.checkpoint1 !== undefined ? `${dim.checkpoint1}分` : '',
          cp2: dim.checkpoint2 !== null && dim.checkpoint2 !== undefined ? `${dim.checkpoint2}分` : '',
          score: dim.totalScore !== null && dim.totalScore !== undefined ? `${dim.totalScore}分` : '',
          badge: badgeLabel,
          note: dim.coachNote || ''
        };
      };

      const conf = getDimData('confidence');
      const resi = getDimData('resilience');
      const cour = getDimData('courage');
      const crea = getDimData('creativity');
      const coop = getDimData('cooperation');

      return {
        '序号': index + 1,
        '球员姓名': player.name,
        '球衣号码': player.number ? `#${player.number}` : '',
        '场上位置': player.position || '队员',
        '所属梯队': team?.name || activeMatch.teamName || '青训梯队',
        '评定状态': isEvaluated ? '已评定' : '待评定',
        '本场总分(满分20)': isEvaluated ? assessment.totalValidScore : '',
        '获得勋章总数': isEvaluated ? (assessment.standardBadgesCount + assessment.outstandingBadgesCount) : 0,
        '卓越勋章数(4分)': isEvaluated ? assessment.outstandingBadgesCount : 0,
        '达标勋章数(3分)': isEvaluated ? assessment.standardBadgesCount : 0,
        '自信-观察点1(主动要球/敢于做动作)': conf.cp1,
        '自信-观察点2(主导战术/坚决执行)': conf.cp2,
        '自信-合计得分': conf.score,
        '自信-勋章等级': conf.badge,
        '自信-教练评语': conf.note,
        '坚韧-观察点1(失误丢球后立刻就地反抢)': resi.cp1,
        '坚韧-观察点2(比分落后/体能临界全力拼抢)': resi.cp2,
        '坚韧-合计得分': resi.score,
        '坚韧-勋章等级': resi.badge,
        '坚韧-教练评语': resi.note,
        '勇气-观察点1(1v1攻防坚决对抗突破)': cour.cp1,
        '勇气-观察点2(关键球敢于承担责任)': cour.cp2,
        '勇气-合计得分': cour.score,
        '勇气-勋章等级': cour.badge,
        '勇气-教练评语': cour.note,
        '创造-观察点1(非常规路线传球/破局解法)': crea.cp1,
        '创造-观察点2(空间阅读与意图隐蔽性)': crea.cp2,
        '创造-合计得分': crea.score,
        '创造-勋章等级': crea.badge,
        '创造-教练评语': crea.note,
        '合作-观察点1(无球穿插与策应补位)': coop.cp1,
        '合作-观察点2(场上呼应与激励队友)': coop.cp2,
        '合作-合计得分': coop.score,
        '合作-勋章等级': coop.badge,
        '合作-教练评语': coop.note,
        '教练综合评语与寄语': assessment?.overallFeedback || '',
        '评定教练': assessment?.evaluatorName || currentUser?.name || '主教练',
        '评定日期': assessment?.evaluationDate || activeMatch.date,
        '比赛名称': activeMatch.title,
        '赛事类型': activeMatch.type === 'regular' ? '常规比赛日程' : '队内锦标赛'
      };
    });

    const wsDetail = XLSX.utils.json_to_sheet(detailRows);
    XLSX.utils.book_append_sheet(wb, wsDetail, '本场品质评定明细');

    // Sheet 2: 勋章授予荣誉名单
    const awardRows: any[] = [];
    let awardIndex = 1;
    matchPlayers.forEach(player => {
      const assessment = playerAssessmentMap.get(player.id);
      if (!assessment) return;
      const team = teams.find(t => t.id === player.teamId);

      CHARACTER_DIMENSIONS.forEach(dim => {
        const dimEval = assessment.dimensions[dim.key];
        if (dimEval && (dimEval.badgeLevel === 'outstanding' || dimEval.badgeLevel === 'standard')) {
          awardRows.push({
            '序号': awardIndex++,
            '球员姓名': player.name,
            '球衣号码': player.number ? `#${player.number}` : '',
            '场上位置': player.position || '队员',
            '所属梯队': team?.name || activeMatch.teamName || '青训梯队',
            '获得品质勋章': `${dim.name}品质勋章`,
            '勋章级别': dimEval.badgeLevel === 'outstanding' ? '👑 卓越勋章 (4分)' : '🎖️ 达标勋章 (3分)',
            '维度得分': `${dimEval.totalScore}分`,
            '品质核心定义': dim.coreMeaning,
            '实战行为观察与评语': dimEval.coachNote || '达到实战行为观察卓越/达标授予标准',
            '评定教练': assessment.evaluatorName || currentUser?.name || '主教练',
            '比赛名称': activeMatch.title,
            '比赛日期': activeMatch.date
          });
        }
      });
    });

    if (awardRows.length === 0) {
      awardRows.push({
        '提示': '本场比赛暂无球员达到3分及以上勋章授予标准，请继续加油！'
      });
    }

    const wsAwards = XLSX.utils.json_to_sheet(awardRows);
    XLSX.utils.book_append_sheet(wb, wsAwards, '勋章授予荣誉名单');

    // Sheet 3: 赛事评定概况统计
    const summaryRows = [
      {
        '比赛名称': activeMatch.title,
        '赛事副标题': activeMatch.subTitle,
        '比赛日期': activeMatch.date,
        '赛事类型': activeMatch.type === 'regular' ? '常规比赛' : '队内锦标赛',
        '参战球员总数': matchCharacterStats.totalCount,
        '已完成评定人数': matchCharacterStats.evaluatedCount,
        '待评定人数': matchCharacterStats.pendingCount,
        '授予勋章总数': matchCharacterStats.totalBadgesSum,
        '全队平均得分(满分20)': matchCharacterStats.averageTotal,
        '导出时间': new Date().toLocaleString()
      }
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, '比赛基本概况');

    const cleanTitle = activeMatch.title.replace(/[\\/:*?"<>|]/g, '_');
    XLSX.writeFile(wb, `顽石之光_品质评定表_${cleanTitle}_${activeMatch.date}.xlsx`);
  };

  // Export Overall Character Badges Leaderboard & Club History to Excel
  const handleExportOverallLeaderboardExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: 全员品质勋章总榜
    const leaderboardRows = badgeWallData.map((item, index) => {
      const team = teams.find(t => t.id === item.player.teamId);
      let honorTitle = '积极参评球员';
      if (item.outstandingBadges >= 3) {
        honorTitle = '👑 顽石品质领袖';
      } else if (item.totalBadges >= 3) {
        honorTitle = '🎖️ 顽石品质标兵';
      } else if (item.totalBadges > 0) {
        honorTitle = '⭐ 顽石品质新星';
      }

      return {
        '排名': index + 1,
        '球员姓名': item.player.name,
        '球衣号码': item.player.number ? `#${item.player.number}` : '',
        '场上位置': item.player.position || '队员',
        '所属梯队': team?.name || '青训梯队',
        '荣誉称号': honorTitle,
        '参评比赛场次': item.totalAssessments,
        '累计获授勋章总数': item.totalBadges,
        '👑卓越勋章数(4分)': item.outstandingBadges,
        '🎖️达标勋章数(3分)': item.standardBadges,
        '综合平均得分(满分20)': item.avgScore,
        '自信品质勋章(枚)': item.dimBadges.confidence.outstanding + item.dimBadges.confidence.standard,
        '自信-卓越数': item.dimBadges.confidence.outstanding,
        '坚韧品质勋章(枚)': item.dimBadges.resilience.outstanding + item.dimBadges.resilience.standard,
        '坚韧-卓越数': item.dimBadges.resilience.outstanding,
        '勇气品质勋章(枚)': item.dimBadges.courage.outstanding + item.dimBadges.courage.standard,
        '勇气-卓越数': item.dimBadges.courage.outstanding,
        '创造品质勋章(枚)': item.dimBadges.creativity.outstanding + item.dimBadges.creativity.standard,
        '创造-卓越数': item.dimBadges.creativity.outstanding,
        '合作品质勋章(枚)': item.dimBadges.cooperation.outstanding + item.dimBadges.cooperation.standard,
        '合作-卓越数': item.dimBadges.cooperation.outstanding
      };
    });

    const wsLeaderboard = XLSX.utils.json_to_sheet(leaderboardRows);
    XLSX.utils.book_append_sheet(wb, wsLeaderboard, '全员品质勋章总榜');

    // Sheet 2: 全部历史比赛评定明细流水
    const allHistoryRows = characterAssessments
      .filter(a => a.totalValidScore > 0)
      .map((a, index) => {
        const player = players.find(p => p.id === a.playerId);
        const team = teams.find(t => t.id === player?.teamId);

        const getDimScoreAndBadge = (key: CharacterDimensionKey) => {
          const dim = a.dimensions[key];
          if (!dim || dim.totalScore === null) return { score: '', badge: '未评' };
          const badgeLabel = dim.badgeLevel === 'outstanding' 
            ? '👑 卓越(4分)' 
            : (dim.badgeLevel === 'standard' ? '🎖️ 达标(3分)' : (dim.badgeLevel === 'observing' ? '重点观察' : '待达标'));
          return {
            score: `${dim.totalScore}分`,
            badge: badgeLabel
          };
        };

        const conf = getDimScoreAndBadge('confidence');
        const resi = getDimScoreAndBadge('resilience');
        const cour = getDimScoreAndBadge('courage');
        const crea = getDimScoreAndBadge('creativity');
        const coop = getDimScoreAndBadge('cooperation');

        return {
          '流水号': index + 1,
          '比赛日期': a.evaluationDate,
          '比赛名称': a.matchTitle,
          '赛事类型': a.matchType === 'regular' ? '常规比赛' : '队内锦标赛',
          '球员姓名': player?.name || '未知球员',
          '球衣号码': player?.number ? `#${player.number}` : '',
          '所属梯队': team?.name || '青训梯队',
          '本场总分(满分20)': a.totalValidScore,
          '本场获勋总数': a.standardBadgesCount + a.outstandingBadgesCount,
          '卓越勋章数': a.outstandingBadgesCount,
          '达标勋章数': a.standardBadgesCount,
          '自信得分': conf.score,
          '自信勋章': conf.badge,
          '坚韧得分': resi.score,
          '坚韧勋章': resi.badge,
          '勇气得分': cour.score,
          '勇气勋章': cour.badge,
          '创造得分': crea.score,
          '创造勋章': crea.badge,
          '合作得分': coop.score,
          '合作勋章': coop.badge,
          '教练综合评语': a.overallFeedback || '',
          '评定教练': a.evaluatorName || '主教练'
        };
      });

    if (allHistoryRows.length > 0) {
      const wsHistory = XLSX.utils.json_to_sheet(allHistoryRows);
      XLSX.utils.book_append_sheet(wb, wsHistory, '全部赛事评定明细流水');
    }

    // Sheet 3: 五大品质维度全队汇总
    const dimSummaryRows = CHARACTER_DIMENSIONS.map(dim => {
      let totalAwarded = 0;
      let totalOutstanding = 0;
      let totalStandard = 0;

      characterAssessments.forEach(a => {
        const d = a.dimensions[dim.key];
        if (d?.badgeLevel === 'outstanding') {
          totalAwarded++;
          totalOutstanding++;
        } else if (d?.badgeLevel === 'standard') {
          totalAwarded++;
          totalStandard++;
        }
      });

      return {
        '品质维度': `${dim.name}品质`,
        '核心定义': dim.coreMeaning,
        '全队累计授予勋章数': totalAwarded,
        '👑 卓越勋章数(4分)': totalOutstanding,
        '🎖️ 达标品质勋章数(3分)': totalStandard,
        '行为观察要点1': dim.checkpoint1.title,
        '行为观察要点2': dim.checkpoint2.title
      };
    });

    const wsDimSummary = XLSX.utils.json_to_sheet(dimSummaryRows);
    XLSX.utils.book_append_sheet(wb, wsDimSummary, '5大品质维度荣誉汇总');

    const todayStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `顽石之光_全员球员品质勋章总榜_${todayStr}.xlsx`);
  };

  // Overall Club Character Leaderboard / Badge Wall
  const badgeWallData = useMemo(() => {
    const playerStatsMap = new Map<string, {
      player: Player;
      totalAssessments: number;
      standardBadges: number;
      outstandingBadges: number;
      totalBadges: number;
      dimBadges: Record<CharacterDimensionKey, { standard: number; outstanding: number }>;
      avgScore: number;
      scoreSum: number;
    }>();

    // Initialize all players
    players.forEach(p => {
      playerStatsMap.set(p.id, {
        player: p,
        totalAssessments: 0,
        standardBadges: 0,
        outstandingBadges: 0,
        totalBadges: 0,
        dimBadges: {
          confidence: { standard: 0, outstanding: 0 },
          resilience: { standard: 0, outstanding: 0 },
          courage: { standard: 0, outstanding: 0 },
          creativity: { standard: 0, outstanding: 0 },
          cooperation: { standard: 0, outstanding: 0 }
        },
        avgScore: 0,
        scoreSum: 0
      });
    });

    // Populate from all assessments
    characterAssessments.forEach(a => {
      const entry = playerStatsMap.get(a.playerId);
      if (entry) {
        entry.totalAssessments++;
        entry.standardBadges += a.standardBadgesCount;
        entry.outstandingBadges += a.outstandingBadgesCount;
        entry.totalBadges += (a.standardBadgesCount + a.outstandingBadgesCount);
        entry.scoreSum += a.totalValidScore;

        (Object.keys(entry.dimBadges) as CharacterDimensionKey[]).forEach(k => {
          const dim = a.dimensions[k];
          if (dim?.badgeLevel === 'standard') entry.dimBadges[k].standard++;
          if (dim?.badgeLevel === 'outstanding') entry.dimBadges[k].outstanding++;
        });
      }
    });

    const result = Array.from(playerStatsMap.values()).map(item => ({
      ...item,
      avgScore: item.totalAssessments > 0 ? Number((item.scoreSum / item.totalAssessments).toFixed(1)) : 0
    }));

    return result.sort((a, b) => b.outstandingBadges * 2 + b.standardBadges - (a.outstandingBadges * 2 + a.standardBadges));
  }, [players, characterAssessments]);

  // Dimension Icon Renderer helper
  const renderDimensionIcon = (dimConfig: CharacterDimensionConfig, sizeClass: string = 'w-4 h-4') => {
    switch (dimConfig.iconType) {
      case 'sparkles': return <Sparkles className={`${sizeClass} ${dimConfig.badgeText}`} />;
      case 'shield': return <Shield className={`${sizeClass} ${dimConfig.badgeText}`} />;
      case 'flame': return <Flame className={`${sizeClass} ${dimConfig.badgeText}`} />;
      case 'lightbulb': return <Lightbulb className={`${sizeClass} ${dimConfig.badgeText}`} />;
      case 'users': return <Users className={`${sizeClass} ${dimConfig.badgeText}`} />;
      default: return <Star className={`${sizeClass} ${dimConfig.badgeText}`} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-gray-900 via-neutral-900 to-black rounded-3xl p-6 md:p-8 border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-bvb-yellow/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-bvb-yellow text-bvb-black text-[10px] md:text-xs font-black uppercase px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                <Crown className="w-3.5 h-3.5" /> 顽石之光青训特训模块
              </span>
              <span className="bg-white/10 text-gray-300 text-[10px] md:text-xs px-2.5 py-0.5 rounded-full border border-white/10 font-bold">
                5维行为观察体系
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <span>⭐ 球员品质评定系统</span>
              <span className="text-xs md:text-sm font-normal text-gray-400">Player Character Assessment</span>
            </h1>
            <p className="text-gray-300 text-xs md:text-sm mt-1.5 max-w-2xl leading-relaxed">
              基于比赛场景的 <strong className="text-amber-400">自信、坚韧、勇气、创造、合作</strong> 5项核心品质实战评定。采用0—2分行为观察制与3—4分勋章授予标准。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <button
              onClick={() => setShowStandardGuideModal(true)}
              className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white border border-white/15 rounded-xl text-xs font-bold transition-all"
            >
              <HelpCircle className="w-4 h-4 text-bvb-yellow" />
              <span>评定标准说明</span>
            </button>
            <button
              onClick={handleExportOverallLeaderboardExcel}
              title="导出全队品质勋章排行榜及全部评定明细流水至Excel"
              className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-emerald-900/20"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
              <span>导出勋章总榜Excel</span>
            </button>
            <button
              onClick={() => setActiveTab(activeTab === 'badgeWall' ? 'assess' : 'badgeWall')}
              className={`flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
                activeTab === 'badgeWall'
                  ? 'bg-bvb-yellow text-bvb-black shadow-lg shadow-bvb-yellow/20'
                  : 'bg-white/10 hover:bg-white/15 text-gray-200 border border-white/15'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>{activeTab === 'badgeWall' ? '返回评定工作台' : '俱乐部勋章总榜'}</span>
            </button>
          </div>
        </div>

        {/* 5 Dimension Badges Pill Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 mt-6 pt-5 border-t border-white/10">
          {CHARACTER_DIMENSIONS.map(dim => (
            <div 
              key={dim.key}
              className={`flex items-center gap-2 p-2.5 rounded-2xl border ${dim.badgeBorder} ${dim.lightBg} backdrop-blur-sm`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${dim.badgeBg} shrink-0`}>
                {renderDimensionIcon(dim, 'w-4 h-4')}
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-black ${dim.badgeText} truncate`}>
                  {dim.name}品质
                </p>
                <p className="text-[10px] text-gray-400 truncate" title={dim.coreMeaning}>
                  {dim.coreMeaning}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main View Mode Tabs */}
      {activeTab === 'badgeWall' ? (
        /* Club Character Badge Wall & Statistics */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 md:p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div>
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <span>全队品质勋章荣誉墙与排行榜</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">累计记录了各梯队球员在常规赛与队内赛中获得的品质勋章</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleExportOverallLeaderboardExcel}
                className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>导出全队勋章总榜(Excel)</span>
              </button>
              <button
                onClick={() => setActiveTab('assess')}
                className="flex-1 sm:flex-none px-4 py-2 bg-bvb-black text-bvb-yellow rounded-xl text-xs font-black hover:bg-gray-800 transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>进入比赛打分</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {badgeWallData.map((item, idx) => (
              <div 
                key={item.player.id}
                className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
              >
                {idx < 3 && item.totalBadges > 0 && (
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-400 to-yellow-500 text-bvb-black font-black text-[10px] px-3 py-1 rounded-bl-xl shadow-sm">
                    TOP {idx + 1}
                  </div>
                )}
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center font-black text-base text-gray-700">
                    {item.player.image ? (
                      <img src={item.player.image} alt={item.player.name} className="w-full h-full object-cover" />
                    ) : (
                      item.player.name.substring(0, 1)
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-gray-900">{item.player.name}</h4>
                      <span className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-bold">
                        #{item.player.number || '0'} {item.player.position || '队员'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {teams.find(t => t.id === item.player.teamId)?.name || '青训梯队'} · 参评 {item.totalAssessments} 场
                    </p>
                  </div>
                </div>

                {/* Badge Stats */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-gray-100 text-center">
                  <div className="bg-amber-50 rounded-xl p-2 border border-amber-200/60">
                    <span className="text-[10px] text-amber-800 font-bold block flex items-center justify-center gap-1">
                      <Crown className="w-3 h-3 text-amber-600" /> 卓越勋章 (4分)
                    </span>
                    <span className="text-base font-black text-amber-900 tabular-nums">
                      {item.outstandingBadges} <span className="text-[10px] font-normal">枚</span>
                    </span>
                  </div>
                  <div className="bg-sky-50 rounded-xl p-2 border border-sky-200/60">
                    <span className="text-[10px] text-sky-800 font-bold block flex items-center justify-center gap-1">
                      <Award className="w-3 h-3 text-sky-600" /> 达标勋章 (3分)
                    </span>
                    <span className="text-base font-black text-sky-900 tabular-nums">
                      {item.standardBadges} <span className="text-[10px] font-normal">枚</span>
                    </span>
                  </div>
                </div>

                {/* 5-Dimension Mini Badges list */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {CHARACTER_DIMENSIONS.map(dim => {
                    const counts = item.dimBadges[dim.key];
                    const totalD = counts.outstanding + counts.standard;
                    if (totalD === 0) return null;
                    return (
                      <span
                        key={dim.key}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          counts.outstanding > 0 
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}
                      >
                        <span>{dim.name}</span>
                        <span className="font-black text-[9px]">x{totalD}</span>
                      </span>
                    );
                  })}
                  {item.totalBadges === 0 && (
                    <span className="text-[11px] text-gray-400 py-1 italic">暂未获得品质勋章</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Standard Evaluation View */
        <div className="space-y-6">
          {/* Match Source Selector & Filter Bar */}
          <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-200 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black text-gray-400 uppercase tracking-wider mr-1">赛事来源:</span>
                <button
                  onClick={() => setMatchSourceFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    matchSourceFilter === 'all'
                      ? 'bg-bvb-black text-bvb-yellow shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  全部赛事 ({unifiedMatches.length})
                </button>
                <button
                  onClick={() => setMatchSourceFilter('regular')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${
                    matchSourceFilter === 'regular'
                      ? 'bg-bvb-black text-bvb-yellow shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span>⚽ 常规比赛日程</span>
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">
                    {unifiedMatches.filter(m => m.type === 'regular').length}
                  </span>
                </button>
                <button
                  onClick={() => setMatchSourceFilter('intramural')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${
                    matchSourceFilter === 'intramural'
                      ? 'bg-bvb-black text-bvb-yellow shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span>🏆 队内锦标赛</span>
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">
                    {unifiedMatches.filter(m => m.type === 'intramural').length}
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2 w-full lg:w-auto">
                <div className="relative flex-1 lg:w-48">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchMatchTerm}
                    onChange={(e) => setSearchMatchTerm(e.target.value)}
                    placeholder={
                      matchSourceFilter === 'intramural'
                        ? '搜索队内比赛/组别/球队...'
                        : matchSourceFilter === 'regular'
                        ? '搜索常规比赛/梯队/对手...'
                        : '搜索比赛/对手/组别...'
                    }
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-bvb-yellow"
                  />
                </div>
                <select
                  value={selectedTeamFilter}
                  onChange={(e) => setSelectedTeamFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-bvb-yellow text-gray-700 font-bold"
                >
                  <option value="all">
                    {matchSourceFilter === 'intramural'
                      ? '全部队内组别'
                      : matchSourceFilter === 'regular'
                      ? '全部常规梯队'
                      : '全梯队 / 全组别'}
                  </option>
                  {teamAndCategoryOptions.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Match Selection Cards Horizontal Scroll / Grid */}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-[11px] font-bold text-gray-400 mb-2.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-bvb-yellow" />
                <span>请点击选择要进行品质评定的比赛或队内球队：</span>
              </p>
              
              {filteredMatches.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-xs bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  暂无匹配的比赛或球队，请调整筛选条件或在「比赛日程」/「队内赛」中创建比赛。
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-56 overflow-y-auto pr-1">
                  {filteredMatches.map(m => {
                    const isSelected = activeMatch?.id === m.id;
                    const matchEvals = characterAssessments.filter(a => a.matchId === m.id);
                    const evalCount = matchEvals.filter(a => a.totalValidScore > 0).length;
                    const totalPlayers = m.participantPlayerIds.length;

                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMatchId(m.id)}
                        className={`p-3.5 rounded-2xl cursor-pointer transition-all border text-left relative ${
                          isSelected
                            ? 'bg-bvb-black text-white border-bvb-yellow shadow-lg shadow-black/10 ring-2 ring-bvb-yellow/50'
                            : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-800'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            m.type === 'regular' 
                              ? (isSelected ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30' : 'bg-blue-50 text-blue-700 border border-blue-200')
                              : (isSelected ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30' : 'bg-amber-50 text-amber-800 border border-amber-200')
                          }`}>
                            {m.type === 'regular' ? '⚽ 常规赛' : '🏆 队内球队'}
                          </span>
                          <span className={`text-[10px] tabular-nums ${isSelected ? 'text-gray-400' : 'text-gray-500'}`}>
                            {m.date}
                          </span>
                        </div>

                        <h4 className={`text-xs font-black mt-2 line-clamp-1 ${isSelected ? 'text-bvb-yellow' : 'text-gray-900'}`}>
                          {m.title}
                        </h4>
                        <p className={`text-[10px] mt-0.5 line-clamp-1 ${isSelected ? 'text-gray-400' : 'text-gray-500'}`}>
                          {m.subTitle}
                        </p>

                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/10">
                          <span className={`text-[10px] ${isSelected ? 'text-gray-300' : 'text-gray-600'}`}>
                            参战球员: <strong className="font-bold">{totalPlayers}人</strong>
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            evalCount >= totalPlayers && totalPlayers > 0
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : (evalCount > 0 ? 'bg-amber-500/20 text-amber-300' : (isSelected ? 'text-gray-400' : 'text-gray-500'))
                          }`}>
                            {evalCount > 0 ? `已评 ${evalCount}/${totalPlayers}` : '待评定'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Active Match Assessment Dashboard */}
          {activeMatch ? (
            <div className="space-y-5">
              {/* Selected Match Overview Header */}
              <div className="bg-white rounded-3xl p-5 md:p-6 border border-gray-200 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                        activeMatch.type === 'regular'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-amber-100 text-amber-900 border border-amber-200'
                      }`}>
                        {activeMatch.type === 'regular' ? '⚽ 常规比赛评定' : '🏆 队内锦标赛 · 球队评定'}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1 font-bold">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" /> {activeMatch.date}
                      </span>
                    </div>
                    <h2 className="text-lg md:text-xl font-black text-gray-900 mt-1.5 flex items-center gap-2">
                      <span>{activeMatch.title}</span>
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">{activeMatch.subTitle}</p>
                  </div>

                  {/* Summary Metric Badges */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl px-3.5 py-2 text-center">
                      <span className="text-[10px] font-bold text-gray-500 block">参战球员</span>
                      <span className="text-base font-black text-gray-900 tabular-nums">
                        {matchCharacterStats.totalCount} <span className="text-[10px] font-normal text-gray-500">人</span>
                      </span>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-3.5 py-2 text-center">
                      <span className="text-[10px] font-bold text-emerald-700 block">完成评定</span>
                      <span className="text-base font-black text-emerald-800 tabular-nums">
                        {matchCharacterStats.evaluatedCount}/{matchCharacterStats.totalCount}
                      </span>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-3.5 py-2 text-center">
                      <span className="text-[10px] font-bold text-amber-700 block flex items-center justify-center gap-1">
                        <Crown className="w-3 h-3 text-amber-600" /> 授予勋章
                      </span>
                      <span className="text-base font-black text-amber-900 tabular-nums">
                        {matchCharacterStats.totalBadgesSum} <span className="text-[10px] font-normal text-amber-700">枚</span>
                      </span>
                    </div>
                    <div className="bg-bvb-yellow/10 border border-bvb-yellow/30 rounded-2xl px-3.5 py-2 text-center">
                      <span className="text-[10px] font-bold text-bvb-black block">全队均分</span>
                      <span className="text-base font-black text-bvb-black tabular-nums">
                        {matchCharacterStats.averageTotal} <span className="text-[10px] font-normal text-gray-600">/ 20</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Player list filter within match */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mt-5 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                    <button
                      onClick={() => setPlayerStatusFilter('all')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        playerStatusFilter === 'all' ? 'bg-bvb-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      全部球员 ({matchPlayers.length})
                    </button>
                    <button
                      onClick={() => setPlayerStatusFilter('pending')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        playerStatusFilter === 'pending' ? 'bg-bvb-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      待评定 ({matchCharacterStats.pendingCount})
                    </button>
                    <button
                      onClick={() => setPlayerStatusFilter('evaluated')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        playerStatusFilter === 'evaluated' ? 'bg-bvb-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      已评定 ({matchCharacterStats.evaluatedCount})
                    </button>
                    <button
                      onClick={() => setPlayerStatusFilter('badges')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        playerStatusFilter === 'badges' ? 'bg-bvb-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      🎖️ 获勋球员
                    </button>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-52">
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchPlayerTerm}
                        onChange={(e) => setSearchPlayerTerm(e.target.value)}
                        placeholder="搜索本场参战球员..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-bvb-yellow"
                      />
                    </div>
                    <button
                      onClick={handleExportMatchExcel}
                      title="导出本场比赛全体参战球员的品质评定明细与勋章授予名单至Excel"
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>导出本场评定(Excel)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Player Evaluation Cards Grid */}
              {displayMatchPlayers.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-gray-200">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                    <Users className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-gray-800">暂无符合条件的参战球员</h3>
                  <p className="text-xs text-gray-500 mt-1">请尝试更换筛选条件或在比赛中添加阵容名单。</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayMatchPlayers.map(player => {
                    const assessment = playerAssessmentMap.get(player.id);
                    const isEvaluated = !!assessment && assessment.totalValidScore > 0;
                    const standardCount = assessment?.standardBadgesCount || 0;
                    const outstandingCount = assessment?.outstandingBadgesCount || 0;

                    return (
                      <div
                        key={player.id}
                        className={`bg-white rounded-3xl p-5 border transition-all duration-200 flex flex-col justify-between ${
                          isEvaluated
                            ? 'border-gray-200 hover:border-amber-400/80 shadow-sm hover:shadow-md'
                            : 'border-dashed border-gray-300 bg-gray-50/50 hover:bg-white hover:border-gray-400'
                        }`}
                      >
                        <div>
                          {/* Top: Player basic header */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center font-black text-gray-700">
                                {player.image ? (
                                  <img src={player.image} alt={player.name} className="w-full h-full object-cover" />
                                ) : (
                                  player.name.substring(0, 1)
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <h4 className="text-base font-black text-gray-900">{player.name}</h4>
                                  <span className="text-[10px] bg-bvb-yellow/20 text-bvb-black font-black px-1.5 py-0.2 rounded">
                                    #{player.number || '0'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                  {player.position || '球员'} · {teams.find(t => t.id === player.teamId)?.name || '梯队'}
                                </p>
                              </div>
                            </div>

                            {/* Status Tag */}
                            <div className="text-right">
                              {isEvaluated ? (
                                <div className="flex flex-col items-end">
                                  <span className="text-lg font-black text-gray-900 tabular-nums">
                                    {assessment?.totalValidScore || 0}
                                    <span className="text-xs font-normal text-gray-400">/20分</span>
                                  </span>
                                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                                    <CheckCircle2 className="w-3 h-3" /> 已评定
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[11px] font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                                  待评定
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Dimension Mini Pills Matrix */}
                          <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                            {CHARACTER_DIMENSIONS.map(dim => {
                              const dimEval = assessment?.dimensions[dim.key];
                              const score = dimEval?.totalScore;
                              const badgeLevel = dimEval?.badgeLevel || 'none';
                              const badgeConfig = CHARACTER_BADGE_LEVELS[badgeLevel];

                              return (
                                <div 
                                  key={dim.key}
                                  className="flex items-center justify-between text-xs py-1 px-2.5 rounded-xl bg-gray-50 border border-gray-100"
                                >
                                  <span className="font-bold text-gray-700 flex items-center gap-1.5">
                                    {renderDimensionIcon(dim, 'w-3.5 h-3.5')}
                                    <span>{dim.name}</span>
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-black text-gray-900 tabular-nums">
                                      {score !== null && score !== undefined ? `${score}分` : '—'}
                                    </span>
                                    {badgeLevel !== 'none' && (
                                      <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${badgeConfig.pillClass}`}>
                                        {badgeLevel === 'outstanding' ? '👑 卓越' : (badgeLevel === 'standard' ? '🎖️ 勋章' : '观察')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Badges Earned Summary */}
                          {isEvaluated && (standardCount > 0 || outstandingCount > 0) && (
                            <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs">
                              <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                                <Crown className="w-3.5 h-3.5 text-amber-600" />
                                <span>本场品质勋章</span>
                              </span>
                              <span className="font-black text-amber-800 text-[11px]">
                                {outstandingCount > 0 && `👑 ${outstandingCount}卓越 `}
                                {standardCount > 0 && `🎖️ ${standardCount}达标`}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Card Action Buttons */}
                        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEvaluation(player)}
                            className="flex-1 py-2 bg-bvb-black hover:bg-gray-800 text-bvb-yellow font-black text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <span>{isEvaluated ? '重新评定' : '开始品质打分'}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>

                          {isEvaluated && assessment && (
                            <button
                              onClick={() => handleOpenCertificate(player, assessment)}
                              title="生成品质证书卡片"
                              className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1"
                            >
                              <Award className="w-4 h-4 text-amber-700" />
                              <span className="hidden sm:inline">勋章卡</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. Detailed Player Character Evaluation Modal / Drawer */}
      {/* ======================================================== */}
      {selectedPlayerForEval && editingAssessment && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-neutral-900 border border-white/15 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-black via-neutral-900 to-gray-900 p-5 md:p-6 border-b border-white/10 flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 overflow-hidden flex items-center justify-center font-black text-xl text-white">
                  {selectedPlayerForEval.image ? (
                    <img src={selectedPlayerForEval.image} alt={selectedPlayerForEval.name} className="w-full h-full object-cover" />
                  ) : (
                    selectedPlayerForEval.name.substring(0, 1)
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-white">{selectedPlayerForEval.name}</h3>
                    <span className="bg-bvb-yellow text-bvb-black text-xs font-black px-2 py-0.5 rounded">
                      #{selectedPlayerForEval.number || '0'} {selectedPlayerForEval.position || '球员'}
                    </span>
                    <span className="bg-white/10 text-gray-300 text-xs px-2 py-0.5 rounded border border-white/10">
                      {teams.find(t => t.id === selectedPlayerForEval.teamId)?.name || '梯队'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    当前比赛: <strong className="text-gray-200">{editingAssessment.matchTitle}</strong> ({editingAssessment.matchDate})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <span className="text-[10px] uppercase tracking-wider text-gray-400 block font-bold">有效总评分</span>
                  <span className="text-2xl font-black text-bvb-yellow tabular-nums">
                    {editingAssessment.totalValidScore}
                    <span className="text-xs font-normal text-gray-400">/20</span>
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSelectedPlayerForEval(null);
                    setEditingAssessment(null);
                  }}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Presets + 5 Dimensions + Radar Preview */}
            <div className="p-5 md:p-6 overflow-y-auto space-y-6 flex-1 text-white">
              {/* Presets & Overall Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white/5 p-3.5 rounded-2xl border border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-300">快捷打分预设:</span>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('outstanding')}
                    className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center gap-1"
                  >
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span>全部卓越 (4分满分)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('standard')}
                    className="px-3 py-1 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 rounded-xl text-xs font-bold flex items-center gap-1"
                  >
                    <Award className="w-3.5 h-3.5 text-sky-400" />
                    <span>全部达标 (3分勋章)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('reset')}
                    className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-xl text-xs font-bold"
                  >
                    重置
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {editingAssessment.outstandingBadgesCount > 0 && (
                    <span className="bg-amber-400 text-bvb-black text-xs font-black px-2.5 py-1 rounded-xl flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5" /> 获得 {editingAssessment.outstandingBadgesCount} 枚卓越勋章
                    </span>
                  )}
                  {editingAssessment.standardBadgesCount > 0 && (
                    <span className="bg-sky-500/20 text-sky-300 border border-sky-400/30 text-xs font-black px-2.5 py-1 rounded-xl flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" /> 获得 {editingAssessment.standardBadgesCount} 枚达标勋章
                    </span>
                  )}
                </div>
              </div>

              {/* 5 Core Dimensions Assessment Cards */}
              <div className="space-y-4">
                {CHARACTER_DIMENSIONS.map((dim, dimIndex) => {
                  const dimEval = editingAssessment.dimensions[dim.key];
                  const { totalScore, badgeLevel } = computeDimensionScoreAndBadge(dimEval.checkpoint1, dimEval.checkpoint2);
                  const badgeInfo = CHARACTER_BADGE_LEVELS[badgeLevel];

                  return (
                    <div 
                      key={dim.key}
                      className={`p-4 md:p-5 rounded-3xl border transition-all ${
                        badgeLevel === 'outstanding'
                          ? 'bg-gradient-to-r from-amber-950/40 via-neutral-900 to-black border-amber-500/50 shadow-lg shadow-amber-500/10'
                          : (badgeLevel === 'standard'
                            ? 'bg-gradient-to-r from-blue-950/40 via-neutral-900 to-black border-blue-500/50'
                            : 'bg-black/40 border-white/10')
                      }`}
                    >
                      {/* Dimension Title Bar */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-white/10">
                        <div className="flex items-center gap-3">
                          <CharacterMedalBadge
                            dimension={dim.key}
                            level={badgeLevel}
                            size="xs"
                            showLabel={false}
                            showCountBadge={false}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className={`text-sm md:text-base font-black ${dim.badgeText}`}>
                                {dimIndex + 1}. {dim.name} ({dim.englishName})
                              </h4>
                              <span className="text-[11px] text-gray-400 font-normal">
                                核心含义: <strong className="text-gray-200">{dim.coreMeaning}</strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Result Badge */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-gray-300">
                            得分: <strong className="text-base text-bvb-yellow tabular-nums">{totalScore !== null ? `${totalScore}分` : '—'}</strong> / 4分
                          </span>
                          <span className={`text-[10px] px-2.5 py-1 rounded-full font-black ${badgeInfo.badgeClass}`}>
                            {badgeInfo.badgeLabel}
                          </span>
                        </div>
                      </div>

                      {/* Checkpoint 1 & 2 Scoring Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {/* Checkpoint 1 */}
                        <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5 space-y-2">
                          <div className="flex items-start gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-bvb-yellow/20 text-bvb-yellow text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">1</span>
                            <p className="text-xs text-gray-200 font-medium leading-snug">{dim.checkpoint1}</p>
                          </div>

                          <div className="grid grid-cols-4 gap-1.5 pt-1">
                            {CHARACTER_SCORING_OPTIONS.map(opt => {
                              const isSelected = dimEval.checkpoint1 === opt.value;
                              return (
                                <button
                                  key={String(opt.value)}
                                  type="button"
                                  onClick={() => handleScoreChange(dim.key, 'checkpoint1', opt.value)}
                                  title={opt.description}
                                  className={`py-2 px-1 rounded-xl text-center text-xs font-black transition-all ${
                                    isSelected
                                      ? 'bg-bvb-yellow text-bvb-black shadow-md scale-[1.02] ring-2 ring-bvb-yellow/60'
                                      : opt.badgeStyle
                                  }`}
                                >
                                  <div>{opt.label}</div>
                                  <div className="text-[9px] font-normal truncate opacity-80 mt-0.5">
                                    {opt.value === 0 ? '无表现' : (opt.value === 1 ? '偶尔/提醒' : (opt.value === 2 ? '主动稳定' : '免评'))}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Checkpoint 2 */}
                        <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5 space-y-2">
                          <div className="flex items-start gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-bvb-yellow/20 text-bvb-yellow text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">2</span>
                            <p className="text-xs text-gray-200 font-medium leading-snug">{dim.checkpoint2}</p>
                          </div>

                          <div className="grid grid-cols-4 gap-1.5 pt-1">
                            {CHARACTER_SCORING_OPTIONS.map(opt => {
                              const isSelected = dimEval.checkpoint2 === opt.value;
                              return (
                                <button
                                  key={String(opt.value)}
                                  type="button"
                                  onClick={() => handleScoreChange(dim.key, 'checkpoint2', opt.value)}
                                  title={opt.description}
                                  className={`py-2 px-1 rounded-xl text-center text-xs font-black transition-all ${
                                    isSelected
                                      ? 'bg-bvb-yellow text-bvb-black shadow-md scale-[1.02] ring-2 ring-bvb-yellow/60'
                                      : opt.badgeStyle
                                  }`}
                                >
                                  <div>{opt.label}</div>
                                  <div className="text-[9px] font-normal truncate opacity-80 mt-0.5">
                                    {opt.value === 0 ? '无表现' : (opt.value === 1 ? '偶尔/提醒' : (opt.value === 2 ? '主动稳定' : '免评'))}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Coach Evaluation Notes */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <label className="block text-xs font-bold text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-bvb-yellow" />
                  <span>教练综合评定评语与鼓励寄语 (Coach Feedback):</span>
                </label>
                <textarea
                  value={editingAssessment.coachSummary || ''}
                  onChange={(e) => setEditingAssessment({ ...editingAssessment, coachSummary: e.target.value })}
                  placeholder="记录本场球员在品质方面的突出高光时刻（如：第15分钟落后时不弃不馁积极反抢、敢于在重压下做假动作变向等）..."
                  rows={2}
                  className="w-full p-3 bg-black/50 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-bvb-yellow"
                />
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 md:p-5 bg-black border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="text-xs text-gray-400">
                评定人: <strong className="text-white">{editingAssessment.evaluatorName}</strong> · 评定时间: {new Date().toLocaleDateString('zh-CN')}
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlayerForEval(null);
                    setEditingAssessment(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-bold transition-all"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveEvaluation(true)}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>保存并评定下一位</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveEvaluation(false)}
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-bvb-yellow hover:bg-yellow-400 text-bvb-black text-xs font-black shadow-lg shadow-bvb-yellow/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>完成保存</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. Standard Guide Modal (Figure 2, 3, 4 reference tables) */}
      {/* ======================================================== */}
      {showStandardGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-bvb-black text-white p-5 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black flex items-center gap-2">
                  <Crown className="w-5 h-5 text-bvb-yellow" />
                  <span>顽石之光球员品质评定规范标准</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">5大核心品质 · 0-2分观察标准 · 勋章评定规则</p>
              </div>
              <button
                onClick={() => setShowStandardGuideModal(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-gray-800 text-xs">
              {/* Figure 2: Dimensions & Checkpoints */}
              <div>
                <h4 className="text-sm font-black text-gray-900 mb-2.5 flex items-center gap-1.5 pb-1 border-b">
                  <span className="w-5 h-5 rounded-full bg-bvb-yellow text-bvb-black flex items-center justify-center text-xs font-black">1</span>
                  <span>品质核心含义与可观察判断点（图2）</span>
                </h4>
                <div className="overflow-x-auto border border-gray-200 rounded-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold">
                        <th className="py-2.5 px-3 w-20">品质</th>
                        <th className="py-2.5 px-3 w-48">核心含义</th>
                        <th className="py-2.5 px-3">可观察的判断点</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {CHARACTER_DIMENSIONS.map(d => (
                        <tr key={d.key} className="hover:bg-gray-50/60">
                          <td className="py-3 px-3 font-black text-gray-900 align-top">
                            <span className="flex items-center gap-1">{d.name}</span>
                          </td>
                          <td className="py-3 px-3 text-gray-600 align-top">{d.coreMeaning}</td>
                          <td className="py-3 px-3 text-gray-700 align-top space-y-1">
                            <p>① {d.checkpoint1}</p>
                            <p>② {d.checkpoint2}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Figure 3: Scoring Rules */}
              <div>
                <h4 className="text-sm font-black text-gray-900 mb-2.5 flex items-center gap-1.5 pb-1 border-b">
                  <span className="w-5 h-5 rounded-full bg-bvb-yellow text-bvb-black flex items-center justify-center text-xs font-black">2</span>
                  <span>每项品质采用 0—2 分制判断标准（图3）</span>
                </h4>
                <p className="text-gray-500 mb-2">每项品质设置 2 个观察点，每个观察点最高 2 分，因此每项品质满分 4 分。</p>
                <div className="overflow-x-auto border border-gray-200 rounded-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold">
                        <th className="py-2.5 px-3 w-24">分值</th>
                        <th className="py-2.5 px-3">判断标准</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {CHARACTER_SCORING_OPTIONS.map(opt => (
                        <tr key={String(opt.value)} className="hover:bg-gray-50/60">
                          <td className="py-2.5 px-3 font-black text-gray-900">{opt.label}</td>
                          <td className="py-2.5 px-3 text-gray-700">{opt.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Figure 4: Badge Awarding Standards */}
              <div>
                <h4 className="text-sm font-black text-gray-900 mb-2.5 flex items-center gap-1.5 pb-1 border-b">
                  <span className="w-5 h-5 rounded-full bg-bvb-yellow text-bvb-black flex items-center justify-center text-xs font-black">3</span>
                  <span>勋章评定标准（图4）</span>
                </h4>
                <div className="overflow-x-auto border border-gray-200 rounded-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold">
                        <th className="py-2.5 px-3 w-24">总分</th>
                        <th className="py-2.5 px-3 w-36">评定等级</th>
                        <th className="py-2.5 px-3">授予说明</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="py-2.5 px-3 font-bold">0—1分</td>
                        <td className="py-2.5 px-3 text-gray-500 font-bold">暂不符合</td>
                        <td className="py-2.5 px-3 text-gray-400">尚未形成稳定的品质行为，继续鼓励训练</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-bold text-sky-700">2分</td>
                        <td className="py-2.5 px-3 text-sky-700 font-bold">有所表现，继续观察</td>
                        <td className="py-2.5 px-3 text-gray-600">已出现相应行为苗头，需在实战中进一步强化稳定性</td>
                      </tr>
                      <tr className="bg-amber-50/50">
                        <td className="py-2.5 px-3 font-black text-amber-800">3分</td>
                        <td className="py-2.5 px-3 text-amber-800 font-black flex items-center gap-1">
                          <Award className="w-4 h-4 text-amber-600" />
                          <span>达到勋章标准</span>
                        </td>
                        <td className="py-2.5 px-3 text-amber-900 font-bold">授予该维度品质勋章 🎖️</td>
                      </tr>
                      <tr className="bg-gradient-to-r from-amber-100/60 to-yellow-100/60">
                        <td className="py-2.5 px-3 font-black text-amber-900">4分 (满分)</td>
                        <td className="py-2.5 px-3 text-amber-900 font-black flex items-center gap-1">
                          <Crown className="w-4 h-4 text-amber-700" />
                          <span>表现突出，优先授予</span>
                        </td>
                        <td className="py-2.5 px-3 text-amber-900 font-black">授予卓越品质勋章 👑，并优先录入梯队品质之星！</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 text-right">
              <button
                onClick={() => setShowStandardGuideModal(false)}
                className="px-5 py-2 bg-bvb-black text-bvb-yellow rounded-xl text-xs font-black"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. Player Quality Certificate Card Modal (PNG Download) */}
      {/* ======================================================== */}
      {showCertificateModal && certificateAssessment && certificatePlayer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-white/20 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 bg-black border-b border-white/10 flex justify-between items-center text-white">
              <span className="text-xs font-black flex items-center gap-1.5 text-bvb-yellow">
                <Award className="w-4 h-4" /> 球员比赛品质荣誉证书
              </span>
              <button
                onClick={() => setShowCertificateModal(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Certificate Card Content To Render */}
            <div className="p-4 overflow-y-auto flex justify-center">
              <div 
                ref={certificateRef}
                className="w-full bg-gradient-to-b from-gray-950 via-neutral-900 to-black text-white p-6 rounded-3xl border-2 border-bvb-yellow/50 shadow-2xl relative overflow-hidden"
                style={{ width: '420px', minHeight: '560px' }}
              >
                {/* Decorative background watermark */}
                <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-bvb-yellow/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="absolute -left-10 -top-10 w-60 h-60 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>

                {/* Certificate Header */}
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2.5">
                    {appLogo ? (
                      <img src={appLogo} alt="Logo" className="w-8 h-8 rounded-lg object-contain" />
                    ) : (
                      <div className="w-8 h-8 bg-bvb-yellow rounded-lg flex items-center justify-center text-bvb-black font-black text-xs">
                        WS
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] font-black text-bvb-yellow uppercase tracking-widest">顽石之光足球俱乐部</p>
                      <p className="text-[9px] text-gray-400">青训品质发展与行为观察中心</p>
                    </div>
                  </div>
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[9px] font-black px-2.5 py-0.5 rounded-full">
                    实战品质勋章
                  </span>
                </div>

                {/* Player Profile & Match Info */}
                <div className="flex items-center gap-4 mt-5">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 border-2 border-bvb-yellow overflow-hidden shrink-0 flex items-center justify-center font-black text-2xl text-white">
                    {certificatePlayer.image ? (
                      <img src={certificatePlayer.image} alt={certificatePlayer.name} className="w-full h-full object-cover" />
                    ) : (
                      certificatePlayer.name.substring(0, 1)
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white flex items-center gap-2">
                      <span>{certificatePlayer.name}</span>
                      <span className="text-xs bg-bvb-yellow text-bvb-black px-1.5 py-0.2 rounded font-black">
                        #{certificatePlayer.number || '0'}
                      </span>
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {teams.find(t => t.id === certificatePlayer.teamId)?.name || '梯队'} · {certificatePlayer.position || '球员'}
                    </p>
                    <p className="text-[10px] text-amber-300 mt-1 line-clamp-1">
                      {certificateAssessment.matchTitle} ({certificateAssessment.matchDate})
                    </p>
                  </div>
                </div>

                {/* Score & Badges Highlight */}
                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-2">
                    <span className="text-[9px] text-gray-400 block">品质总评分</span>
                    <span className="text-lg font-black text-bvb-yellow tabular-nums">
                      {certificateAssessment.totalValidScore}
                      <span className="text-[9px] text-gray-500 font-normal">/20</span>
                    </span>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2">
                    <span className="text-[9px] text-amber-400 block">卓越勋章 👑</span>
                    <span className="text-lg font-black text-amber-300 tabular-nums">
                      {certificateAssessment.outstandingBadgesCount} <span className="text-[9px] font-normal">枚</span>
                    </span>
                  </div>
                  <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-2">
                    <span className="text-[9px] text-sky-400 block">达标勋章 🎖️</span>
                    <span className="text-lg font-black text-sky-300 tabular-nums">
                      {certificateAssessment.standardBadgesCount} <span className="text-[9px] font-normal">枚</span>
                    </span>
                  </div>
                </div>

                {/* 5-Dimension Detailed Scores */}
                <div className="space-y-1.5 mt-4">
                  {CHARACTER_DIMENSIONS.map(dim => {
                    const evalD = certificateAssessment.dimensions[dim.key];
                    const score = evalD?.totalScore;
                    const bLevel = evalD?.badgeLevel || 'none';
                    const bInfo = CHARACTER_BADGE_LEVELS[bLevel];

                    return (
                      <div 
                        key={dim.key}
                        className={`flex items-center justify-between p-2 rounded-xl border text-xs ${
                          bLevel === 'outstanding'
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                            : (bLevel === 'standard'
                              ? 'bg-blue-500/15 border-blue-500/40 text-blue-200'
                              : 'bg-white/5 border-white/10 text-gray-300')
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {renderDimensionIcon(dim, 'w-3.5 h-3.5')}
                          <span className="font-bold">{dim.name}</span>
                          <span className="text-[10px] text-gray-400">({dim.coreMeaning})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-black tabular-nums">{score !== null ? `${score}分` : '—'}</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${bInfo.badgeClass}`}>
                            {bInfo.badgeLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Coach Summary */}
                {certificateAssessment.coachSummary && (
                  <div className="mt-3 p-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] text-gray-300 leading-relaxed italic">
                    "{certificateAssessment.coachSummary}"
                  </div>
                )}

                {/* Certificate Footer Stamp */}
                <div className="flex justify-between items-end mt-5 pt-3 border-t border-white/10 text-[10px] text-gray-400">
                  <div>
                    <p>评定教练: <strong className="text-white">{certificateAssessment.evaluatorName || '青训教练组'}</strong></p>
                    <p className="text-[9px] text-gray-500">日期: {certificateAssessment.matchDate}</p>
                  </div>
                  <div className="text-right">
                    <div className="inline-block border border-bvb-yellow/40 rounded-lg px-2 py-0.5 text-[9px] text-bvb-yellow font-black">
                      ★ 顽石之光品质认证 ★
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-black border-t border-white/10 flex justify-end gap-2 text-white">
              <button
                onClick={() => setShowCertificateModal(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold"
              >
                关闭
              </button>
              <button
                onClick={handleExportCertificate}
                disabled={isExportingCert}
                className="px-5 py-2 rounded-xl bg-bvb-yellow text-bvb-black text-xs font-black hover:bg-yellow-400 transition-all flex items-center gap-1.5 shadow-lg shadow-bvb-yellow/20"
              >
                <Download className="w-4 h-4" />
                <span>{isExportingCert ? '正在生成...' : '下载品质证书 (PNG)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerCharacterModule;
