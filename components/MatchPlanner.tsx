
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Match, Player, Team, User, PointItemDefinition, PlayerPointRecord, 
  Tactic, IntramuralTournament, TournamentItem, PlayerCharacterAssessment 
} from '../types';
import { Calendar, MapPin, Trophy, Shield, Bot, X, Plus, Trash2, Edit2, FileText, CheckCircle, Save, Users as UsersIcon, Activity, Loader2, RefreshCw, TrendingUp, AlertCircle, Filter, PenTool, Star, Printer, Download, Target, Cloud, ClipboardList } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import html2canvas from 'html2canvas';
import { generateMatchStrategy } from '../services/geminiService';
import TacticsModule from './TacticsModule';
import MatchEditModal from './MatchEditModal';
import IntramuralTournamentModule from './IntramuralTournament';
import TournamentLibrary from './TournamentLibrary';
import PlayerCharacterModule from './PlayerCharacterModule';
import { TIER_CONFIG } from '../constants';

interface MatchPlannerProps {
  matches: Match[];
  players: Player[];
  teams: Team[];
  currentUser: User | null;
  onAddMatch: (match: Match) => void;
  onDeleteMatch: (id: string) => void;
  onUpdateMatch: (match: Match) => void;
  pointItemDefinitions: PointItemDefinition[];
  onAddPointItem: (item: PointItemDefinition) => void;
  onDeletePointItem: (id: string) => void;
  playerPointRecords: PlayerPointRecord[];
  onAddPointRecord: (record: PlayerPointRecord) => void;
  onBulkAddPointRecords: (records: PlayerPointRecord[]) => void;
  onDeletePointRecord: (id: string) => void;
  travelingPlayerIds: string[];
  onUpdateTravelingPlayers: (ids: string[]) => void;
  appLogo?: string;
  tactics: Tactic[];
  onUpdateTactics: (tactics: Tactic[]) => void;
  intramuralTournaments?: IntramuralTournament[];
  onUpdateIntramuralTournaments?: (tournaments: IntramuralTournament[]) => void;
  tournaments?: TournamentItem[];
  onUpdateTournaments?: (tournaments: TournamentItem[]) => void;
  characterAssessments?: PlayerCharacterAssessment[];
  onUpdateCharacterAssessments?: (assessments: PlayerCharacterAssessment[]) => void;
}

type ViewMode = 'matches' | 'intramural' | 'tournamentLibrary' | 'character' | 'points' | 'tactics';

const MatchPlanner: React.FC<MatchPlannerProps> = ({ 
  matches, 
  players, 
  teams, 
  currentUser, 
  onAddMatch, 
  onDeleteMatch, 
  onUpdateMatch,
  pointItemDefinitions,
  onAddPointItem,
  onDeletePointItem,
  playerPointRecords,
  onAddPointRecord,
  onBulkAddPointRecords,
  onDeletePointRecord,
  travelingPlayerIds,
  onUpdateTravelingPlayers,
  tactics,
  onUpdateTactics,
  intramuralTournaments,
  onUpdateIntramuralTournaments,
  tournaments = [],
  onUpdateTournaments,
  characterAssessments = [],
  onUpdateCharacterAssessments = () => {},
  appLogo
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('matches');
  const [selectedMatchForAi, setSelectedMatchForAi] = useState<Match | null>(null);
  const [strategy, setStrategy] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  const [filterTeamId, setFilterTeamId] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [showAddPointItemModal, setShowAddPointItemModal] = useState(false);
  const [selectedMatchForCard, setSelectedMatchForCard] = useState<Match | null>(null);

  const isDirector = currentUser?.role === 'director';

  const availableTeams = useMemo(() => {
      if (isDirector) return teams;
      return teams.filter(t => currentUser?.teamIds?.includes(t.id));
  }, [currentUser, teams, isDirector]);

  const displayMatches = useMemo(() => {
      let base = isDirector ? matches : matches.filter(m => currentUser?.teamIds?.includes(m.teamId));
      if (filterTeamId !== 'all') {
          base = base.filter(m => m.teamId === filterTeamId);
      }
      return base;
  }, [currentUser, matches, isDirector, filterTeamId]);

  // Comment: Defined upcomingMatches and pastMatches based on displayMatches
  const upcomingMatches = useMemo(() => {
    return displayMatches.filter(m => m.status === 'Upcoming').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [displayMatches]);

  const pastMatches = useMemo(() => {
    return displayMatches.filter(m => m.status === 'Completed').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [displayMatches]);

  const displayPlayers = useMemo(() => {
      let base = isDirector ? players : players.filter(p => currentUser?.teamIds?.includes(p.teamId));
      if (filterTeamId !== 'all') {
          base = base.filter(p => p.teamId === filterTeamId);
      }
      return base;
  }, [currentUser, players, isDirector, filterTeamId]);

  // 自动保存逻辑：当编辑中的比赛数据变化时触发
  useEffect(() => {
    if (!editingMatch) return;
    const timer = setTimeout(() => {
        onUpdateMatch(editingMatch);
    }, 3000); 
    return () => clearTimeout(timer);
  }, [editingMatch, onUpdateMatch]);

  const ensureDetails = (match: Match): Match => {
    const existingBreakdown = match.details?.summaryBreakdown;
    const legacyReviewParts = [
        existingBreakdown?.technicalTactical,
        existingBreakdown?.individual,
        existingBreakdown?.gapAnalysis,
        existingBreakdown?.management
    ].filter(Boolean);
    const highlightsFallback = existingBreakdown?.highlights ?? existingBreakdown?.individual ?? '';
    const issuesExposedFallback = existingBreakdown?.issuesExposed ?? existingBreakdown?.gapAnalysis ?? '';
    const matchReviewFallback = existingBreakdown?.matchReview ?? (legacyReviewParts.length > 0 ? legacyReviewParts.join('\n\n') : '');
    const nextStageTrainingFallback = existingBreakdown?.nextStageTraining ?? existingBreakdown?.trainingPriorities ?? '';

    const defaultDetails: MatchDetails = {
        weather: '晴朗',
        pitch: '天然草',
        lineup: [],
        substitutes: [],
        events: [],
        summary: '',
        summaryBreakdown: {
            overall: existingBreakdown?.overall || '',
            highlights: highlightsFallback,
            issuesExposed: issuesExposedFallback,
            matchReview: matchReviewFallback,
            nextStageTraining: nextStageTrainingFallback,
            orgRating: {
                eventOrganization: existingBreakdown?.orgRating?.eventOrganization ?? 5,
                refereeLevel: existingBreakdown?.orgRating?.refereeLevel ?? 5,
                venueCondition: existingBreakdown?.orgRating?.venueCondition ?? 5,
                accommodation: existingBreakdown?.orgRating?.accommodation ?? 5,
                transportation: existingBreakdown?.orgRating?.transportation ?? 5,
                recommendParticipation: existingBreakdown?.orgRating?.recommendParticipation ?? '是'
            }
        },
        teamRequirements: [],
        playerRequirements: {},
        playerPerformances: {}
    };
    return {
        ...match,
        details: {
            ...defaultDetails,
            ...(match.details || {}),
            summaryBreakdown: {
                ...defaultDetails.summaryBreakdown!,
                ...(match.details?.summaryBreakdown || {}),
                orgRating: {
                    ...defaultDetails.summaryBreakdown!.orgRating!,
                    ...(match.details?.summaryBreakdown?.orgRating || {})
                }
            },
            teamRequirements: match.details?.teamRequirements || defaultDetails.teamRequirements,
            playerRequirements: match.details?.playerRequirements || defaultDetails.playerRequirements,
            playerPerformances: match.details?.playerPerformances || defaultDetails.playerPerformances
        }
    };
  };

  const startEditing = (match: Match) => {
    setEditingMatch(ensureDetails(match));
  };

  const seasonStats = useMemo(() => {
      let wins = 0, draws = 0, losses = 0;

      const parseScore = (resStr?: string) => {
          if (!resStr || !resStr.trim()) return null;
          const res = resStr.trim();
          const scoreMatch = res.match(/(\d+)\s*[-:]\s*(\d+)/);
          if (scoreMatch) {
              const myScore = parseInt(scoreMatch[1], 10);
              const oppScore = parseInt(scoreMatch[2], 10);
              if (myScore > oppScore) return 'win';
              if (myScore < oppScore) return 'loss';
              return 'draw';
          }
          if (res.includes('胜')) return 'win';
          if (res.includes('负')) return 'loss';
          if (res.includes('平')) return 'draw';
          return null;
      };

      const parseSeriesResultText = (text?: string) => {
          if (!text) return null;
          const winMatch = text.match(/(\d+)\s*胜/);
          const drawMatch = text.match(/(\d+)\s*平/);
          const lossMatch = text.match(/(\d+)\s*负/);
          if (winMatch || drawMatch || lossMatch) {
              return {
                  wins: winMatch ? parseInt(winMatch[1], 10) : 0,
                  draws: drawMatch ? parseInt(drawMatch[1], 10) : 0,
                  losses: lossMatch ? parseInt(lossMatch[1], 10) : 0,
              };
          }
          return null;
      };

      displayMatches.forEach(m => {
          if (m.isSeries) {
              let seriesCounted = 0;
              // 1. Try fixtures inside series
              if (m.fixtures && m.fixtures.length > 0) {
                  m.fixtures.forEach(f => {
                      const res = parseScore(f.result);
                      if (res === 'win') { wins++; seriesCounted++; }
                      else if (res === 'loss') { losses++; seriesCounted++; }
                      else if (res === 'draw') { draws++; seriesCounted++; }
                  });
              }
              // 2. If no individual fixtures yielded stats, try seriesResult string
              if (seriesCounted === 0 && m.seriesResult) {
                  const sRes = parseSeriesResultText(m.seriesResult);
                  if (sRes && (sRes.wins + sRes.draws + sRes.losses > 0)) {
                      wins += sRes.wins;
                      draws += sRes.draws;
                      losses += sRes.losses;
                      seriesCounted = sRes.wins + sRes.draws + sRes.losses;
                  }
              }
              // 3. Fallback to m.result if still no stats counted
              if (seriesCounted === 0 && m.result) {
                  const res = parseScore(m.result);
                  if (res === 'win') wins++;
                  else if (res === 'loss') losses++;
                  else if (res === 'draw') draws++;
              }
          } else {
              // Single match
              if (m.result || m.status === 'Completed') {
                  const res = parseScore(m.result);
                  if (res === 'win') wins++;
                  else if (res === 'loss') losses++;
                  else if (res === 'draw') draws++;
              }
          }
      });

      const total = wins + draws + losses;
      const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

      const sortedPlayers = [...displayPlayers].sort((a, b) => (b.goals || 0) - (a.goals || 0));
      const topScorer = sortedPlayers[0];

      return { wins, draws, losses, topScorer, winRate, total };
  }, [displayMatches, displayPlayers]);

  const [newMatchForm, setNewMatchForm] = useState<{
      teamId: string;
      opponent: string;
      title?: string;
      date: string;
      endDate: string;
      time: string;
      location: 'Home' | 'Away';
      competition: string;
      status: string;
      isSeries: boolean;
      pitch: string;
      weather: string;
  }>({
      teamId: availableTeams[0]?.id || '',
      opponent: '',
      date: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      time: '14:00',
      location: 'Home',
      competition: '联赛',
      status: 'Upcoming',
      isSeries: false,
      pitch: '天然草',
      weather: '晴朗'
  });

  const handleAddSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(newMatchForm.opponent && newMatchForm.date && newMatchForm.teamId) {
          const matchTitle = newMatchForm.isSeries ? newMatchForm.opponent : (newMatchForm.title || `${newMatchForm.competition} VS ${newMatchForm.opponent}`);
          const matchOpponent = newMatchForm.isSeries ? '' : newMatchForm.opponent;

          const match: Match = {
              id: Date.now().toString(),
              teamId: newMatchForm.teamId,
              title: matchTitle,
              opponent: matchOpponent,
              date: newMatchForm.date,
              endDate: newMatchForm.isSeries ? newMatchForm.endDate : undefined,
              time: newMatchForm.time || '10:00',
              location: newMatchForm.location as 'Home' | 'Away',
              competition: newMatchForm.competition || '友谊赛',
              status: 'Upcoming',
              result: '',
              isSeries: newMatchForm.isSeries,
              fixtures: newMatchForm.isSeries ? [] : undefined,
              details: {
                  weather: newMatchForm.weather || '晴朗',
                  pitch: newMatchForm.pitch || '天然草',
                  lineup: [],
                  substitutes: [],
                  events: [],
                  summary: '',
                  summaryBreakdown: {
                      overall: '',
                      highlights: '',
                      issuesExposed: '',
                      matchReview: '',
                      nextStageTraining: '',
                      orgRating: {
                          eventOrganization: 5,
                          refereeLevel: 5,
                          venueCondition: 5,
                          accommodation: 5,
                          transportation: 5,
                          recommendParticipation: '是'
                      }
                  }
              }
          };
          onAddMatch(match);
          setShowAddModal(false);
          setNewMatchForm({
              teamId: availableTeams[0]?.id || '',
              opponent: '',
              date: new Date().toISOString().split('T')[0],
              endDate: new Date().toISOString().split('T')[0],
              time: '14:00',
              location: 'Home',
              competition: '联赛',
              status: 'Upcoming',
              isSeries: false,
              pitch: '天然草',
              weather: '晴朗'
          });
      }
  };

  const handleGenerateStrategy = async (match: Match) => {
    setSelectedMatchForAi(match);
    setLoading(true);
    try {
        const result = await generateMatchStrategy(match.opponent, "控制球权，快速转换");
        setStrategy(result);
    } catch {
        setStrategy("生成失败。");
    } finally {
        setLoading(false);
    }
  };


  return (
    <div className="space-y-6 md:space-y-8 relative pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl md:text-3xl font-black text-bvb-black uppercase tracking-tighter">比赛日中心</h2>
            <div className="flex gap-4 mt-2">
                <button 
                    onClick={() => setViewMode('matches')}
                    className={`text-[10px] md:text-xs font-black uppercase tracking-widest pb-1 transition-all border-b-2 ${viewMode === 'matches' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-400'}`}
                >
                    比赛日程
                </button>
                <button 
                    onClick={() => setViewMode('intramural')}
                    className={`text-[10px] md:text-xs font-black uppercase tracking-widest pb-1 transition-all border-b-2 ${viewMode === 'intramural' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-400'}`}
                >
                    🏆 队内赛 (Intramural)
                </button>
                <button 
                    onClick={() => setViewMode('tournamentLibrary')}
                    className={`text-[10px] md:text-xs font-black uppercase tracking-widest pb-1 transition-all border-b-2 flex items-center gap-1.5 ${viewMode === 'tournamentLibrary' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
                >
                    <span>🏛️ 赛事库</span>
                    <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded-full font-black">
                        {tournaments?.length || 0}
                    </span>
                </button>
                <button 
                    onClick={() => setViewMode('character')}
                    className={`text-[10px] md:text-xs font-black uppercase tracking-widest pb-1 transition-all border-b-2 flex items-center gap-1.5 ${viewMode === 'character' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
                >
                    <span>⭐ 球员品质</span>
                    <span className="text-[10px] bg-amber-400 text-bvb-black px-1.5 py-0.5 rounded-full font-black">
                        {characterAssessments?.length || 0}
                    </span>
                </button>
                <button 
                    onClick={() => setViewMode('points')}
                    className={`text-[10px] md:text-xs font-black uppercase tracking-widest pb-1 transition-all border-b-2 ${viewMode === 'points' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-400'}`}
                >
                    积分管理
                </button>
                <button 
                    onClick={() => setViewMode('tactics')}
                    className={`text-[10px] md:text-xs font-black uppercase tracking-widest pb-1 transition-all border-b-2 ${viewMode === 'tactics' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-400'}`}
                >
                    战术板
                </button>
            </div>
        </div>
        {(viewMode === 'matches' || viewMode === 'points') && (
          <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
              <div className="relative group flex-1 md:flex-none">
                  <div className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 text-gray-400"><Filter className="w-3.5 h-3.5 md:w-4 md:h-4" /></div>
                  <select value={filterTeamId} onChange={e => setFilterTeamId(e.target.value)} className="w-full md:w-48 pl-8 md:pl-10 pr-3 md:pr-4 py-2 md:py-2.5 bg-white border border-gray-200 rounded-xl text-xs md:text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-bvb-yellow shadow-sm transition-all">
                      <option value="all">所有梯队</option>
                      {availableTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
              </div>
              <button 
                  onClick={() => {
                      if (viewMode === 'matches') setShowAddModal(true);
                      else setShowAddPointItemModal(true);
                  }} 
                  className="flex items-center px-4 md:px-6 py-2 md:py-2.5 bg-bvb-black text-white font-black rounded-xl shadow-xl hover:bg-gray-800 transition-all shrink-0 text-xs md:text-sm"
              >
                  <Plus className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2 text-bvb-yellow" /> 新建
              </button>
          </div>
        )}
      </div>

      {viewMode === 'matches' ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 animate-in slide-in-from-top-4 duration-300">
              <div className="bg-white p-3 md:p-5 rounded-2xl shadow-sm border-l-4 border-green-500 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                      <div><p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5 md:mb-1">本季胜场</p><h3 className="text-xl md:text-3xl font-black text-gray-800 tabular-nums leading-none">{seasonStats.wins}</h3></div>
                      <div className="p-1.5 md:p-2 bg-green-50 rounded-lg text-green-600 shadow-inner"><TrendingUp className="w-4 h-4 md:w-5 md:h-5" /></div>
                  </div>
                  <div className="mt-2 md:mt-3 flex items-center gap-1.5 md:gap-2">
                      <div className="flex-1 h-1 md:h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-green-500" style={{ width: `${seasonStats.winRate}%` }}></div></div>
                      <span className="text-[8px] md:text-[10px] font-black text-green-600 tabular-nums">{seasonStats.winRate}%</span>
                  </div>
              </div>
              <div className="bg-white p-3 md:p-5 rounded-2xl shadow-sm border-l-4 border-gray-400 flex flex-col justify-between">
                   <div className="flex justify-between items-start">
                      <div><p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5 md:mb-1">战平局数</p><h3 className="text-xl md:text-3xl font-black text-gray-800 tabular-nums leading-none">{seasonStats.draws}</h3></div>
                      <div className="p-1.5 md:p-2 bg-gray-100 rounded-lg text-gray-600 shadow-inner"><Activity className="w-4 h-4 md:w-5 md:h-5" /></div>
                  </div>
                  <p className="mt-2 md:mt-4 text-[8px] md:text-[10px] font-black text-gray-400 uppercase">总: {seasonStats.total} 场</p>
              </div>
              <div className="bg-white p-3 md:p-5 rounded-2xl shadow-sm border-l-4 border-red-500 flex flex-col justify-between">
                   <div className="flex justify-between items-start">
                      <div><p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5 md:mb-1">失利记录</p><h3 className="text-xl md:text-3xl font-black text-gray-800 tabular-nums leading-none">{seasonStats.losses}</h3></div>
                      <div className="p-1.5 md:p-2 bg-red-50 rounded-lg text-red-600 shadow-inner"><AlertCircle className="w-4 h-4 md:w-5 md:h-5" /></div>
                  </div>
                  <p className="mt-2 md:mt-4 text-[8px] md:text-[10px] font-black text-gray-400 uppercase">需总结</p>
              </div>
              <div className="bg-white p-3 md:p-5 rounded-2xl shadow-sm border-l-4 border-bvb-yellow flex flex-col justify-between">
                   <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                          <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5 md:mb-1">队内射手王</p>
                          <h3 className="text-sm md:text-lg font-black text-gray-800 truncate">{seasonStats.topScorer?.name || '-'}</h3>
                          <p className="text-[8px] md:text-[10px] text-bvb-yellow font-black bg-black inline-block px-1.5 md:px-2 py-0.5 rounded mt-1.5 md:mt-2 uppercase italic tracking-tighter">{seasonStats.topScorer?.goals || 0} G</p>
                      </div>
                      <div className="p-1.5 md:p-2 bg-yellow-50 rounded-lg text-yellow-600 shadow-inner"><Trophy className="w-4 h-4 md:w-5 md:h-5" /></div>
                  </div>
              </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
              <div className="animate-in slide-in-from-left-4 duration-500">
                  <h3 className="font-black text-lg md:text-xl mb-4 md:mb-6 flex items-center text-bvb-black uppercase tracking-tighter italic">
                      <Shield className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3 text-bvb-yellow" /> Upcoming / 即将进行
                  </h3>
                  <div className="space-y-3 md:space-y-4">
                      {upcomingMatches.length > 0 ? upcomingMatches.map(m => (
                        <MatchCard 
                            key={m.id} 
                            match={m} 
                            teams={teams}
                            onDeleteMatch={onDeleteMatch}
                            startEditing={startEditing}
                            handleGenerateStrategy={handleGenerateStrategy}
                            onShowCard={(m) => setSelectedMatchForCard(m)}
                        />
                      )) : <div className="bg-gray-100/50 border-2 border-dashed border-gray-200 rounded-3xl py-12 md:py-16 text-center text-gray-400 italic font-black uppercase text-xs md:text-sm tracking-widest">No scheduled matches</div>}
                  </div>
              </div>
              <div className="animate-in slide-in-from-right-4 duration-500">
                  <h3 className="font-black text-lg md:text-xl mb-4 md:mb-6 flex items-center text-gray-400 uppercase tracking-tighter italic">
                      <Trophy className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3" /> History / 近期赛果
                  </h3>
                  <div className="space-y-3 md:space-y-4 opacity-90">
                      {pastMatches.length > 0 ? pastMatches.map(m => (
                        <MatchCard 
                            key={m.id} 
                            match={m} 
                            teams={teams}
                            onDeleteMatch={onDeleteMatch}
                            startEditing={startEditing}
                            handleGenerateStrategy={handleGenerateStrategy}
                            onShowCard={(m) => setSelectedMatchForCard(m)}
                        />
                      )) : <div className="bg-gray-100/50 border-2 border-dashed border-gray-200 rounded-3xl py-12 md:py-16 text-center text-gray-400 italic font-black uppercase text-xs md:text-sm tracking-widest">No match records found</div>}
                  </div>
              </div>
          </div>
        </>
      ) : viewMode === 'intramural' ? (
        <IntramuralTournamentModule
            players={players}
            teams={teams}
            currentUser={currentUser}
            intramuralTournaments={intramuralTournaments}
            onUpdateTournaments={onUpdateIntramuralTournaments}
        />
      ) : viewMode === 'points' ? (
        <MatchPointManager 
            players={players} 
            teams={teams}
            currentUser={currentUser}
            filterTeamId={filterTeamId}
            pointItemDefinitions={pointItemDefinitions}
            onAddPointItem={onAddPointItem}
            onDeletePointItem={onDeletePointItem}
            playerPointRecords={playerPointRecords}
            onAddPointRecord={onAddPointRecord}
            onBulkAddPointRecords={onBulkAddPointRecords}
            onDeletePointRecord={onDeletePointRecord}
            travelingPlayerIds={travelingPlayerIds}
            onUpdateTravelingPlayers={onUpdateTravelingPlayers}
        />
      ) : viewMode === 'tournamentLibrary' ? (
        <TournamentLibrary
            tournaments={tournaments}
            matches={matches}
            teams={teams}
            currentUser={currentUser}
            onUpdateTournaments={onUpdateTournaments || (() => {})}
            onAddMatchFromTournament={(t) => {
                const targetTeam = teams.find(tm => tm.name.includes(t.targetAgeGroup || '')) || availableTeams[0];
                setNewMatchForm({
                    teamId: targetTeam?.id || '',
                    opponent: t.name,
                    title: t.name,
                    date: new Date().toISOString().split('T')[0],
                    endDate: new Date().toISOString().split('T')[0],
                    time: '09:00',
                    location: 'Away',
                    competition: t.name,
                    status: 'Upcoming',
                    isSeries: true,
                    pitch: '天然草',
                    weather: '晴朗'
                });
                setViewMode('matches');
                setShowAddModal(true);
            }}
        />
      ) : viewMode === 'character' ? (
        <PlayerCharacterModule
            players={players}
            teams={teams}
            matches={matches}
            intramuralTournaments={intramuralTournaments}
            currentUser={currentUser}
            appLogo={appLogo}
            characterAssessments={characterAssessments}
            onUpdateCharacterAssessments={onUpdateCharacterAssessments}
        />
      ) : (
        <TacticsModule 
            players={players}
            teams={teams}
            tactics={tactics}
            onUpdateTactics={onUpdateTactics}
        />
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full h-full md:h-auto md:max-w-xl rounded-none md:rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="bg-bvb-black p-4 md:p-6 flex justify-between items-center text-white shrink-0"><h3 className="font-black text-lg md:text-xl flex items-center uppercase italic"><Plus className="w-5 h-5 md:w-6 md:h-6 mr-2 text-bvb-yellow" /> 安排新赛程</h3><button onClick={() => setShowAddModal(false)}><X className="w-6 h-6" /></button></div>
            <form onSubmit={handleAddSubmit} className="p-6 md:p-8 space-y-4 md:space-y-6 overflow-y-auto flex-1 pb-24 md:pb-8">
                <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
                    <button 
                        type="button"
                        onClick={() => setNewMatchForm({...newMatchForm, isSeries: false})}
                        className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${!newMatchForm.isSeries ? 'bg-white text-bvb-black shadow-sm' : 'text-gray-400'}`}
                    >
                        单场比赛
                    </button>
                    <button 
                        type="button"
                        onClick={() => setNewMatchForm({...newMatchForm, isSeries: true})}
                        className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${newMatchForm.isSeries ? 'bg-white text-bvb-black shadow-sm' : 'text-gray-400'}`}
                    >
                        系列赛 / 锦标赛
                    </button>
                </div>

                <div><label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 md:mb-1.5">所属梯队</label>
                    <select required className="w-full p-2.5 md:p-3.5 border rounded-2xl font-bold bg-white focus:ring-2 focus:ring-bvb-yellow outline-none text-xs md:text-sm" value={newMatchForm.teamId} onChange={e => setNewMatchForm({...newMatchForm, teamId: e.target.value})}>{availableTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                </div>
                <div>
                    <label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 md:mb-1.5">
                        {newMatchForm.isSeries ? '赛事主体名称' : '对手全称'}
                    </label>
                    <input required className="w-full p-2.5 md:p-3.5 border rounded-2xl font-bold focus:ring-2 focus:ring-bvb-yellow outline-none text-xs md:text-sm" placeholder={newMatchForm.isSeries ? "如: 2024青少年夏季邀请赛" : "输入对手梯队名称..."} value={newMatchForm.opponent} onChange={e => setNewMatchForm({...newMatchForm, opponent: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div><label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 md:mb-1.5">{newMatchForm.isSeries ? '起始日期' : '日期'}</label><input type="date" required className="w-full p-2.5 md:p-3.5 border rounded-2xl font-bold text-xs md:text-sm" value={newMatchForm.date} onChange={e => setNewMatchForm({...newMatchForm, date: e.target.value})} /></div>
                    {newMatchForm.isSeries ? (
                        <div><label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 md:mb-1.5">结束日期</label><input type="date" required className="w-full p-2.5 md:p-3.5 border rounded-2xl font-bold text-xs md:text-sm" value={newMatchForm.endDate} onChange={e => setNewMatchForm({...newMatchForm, endDate: e.target.value})} /></div>
                    ) : (
                        <div><label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 md:mb-1.5">开球时间</label><input type="time" required className="w-full p-2.5 md:p-3.5 border rounded-2xl font-bold text-xs md:text-sm" value={newMatchForm.time} onChange={e => setNewMatchForm({...newMatchForm, time: e.target.value})} /></div>
                    )}
                </div>
                <div className="space-y-3">
                    <div>
                        <label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">主/客场选择</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setNewMatchForm({...newMatchForm, location: 'Home'})}
                                className={`flex-1 py-2.5 rounded-2xl font-black text-xs transition-all border ${
                                    newMatchForm.location === 'Home'
                                        ? 'bg-bvb-yellow text-bvb-black border-bvb-yellow shadow-2xs'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                🏠 主场
                            </button>
                            <button
                                type="button"
                                onClick={() => setNewMatchForm({...newMatchForm, location: 'Away'})}
                                className={`flex-1 py-2.5 rounded-2xl font-black text-xs transition-all border ${
                                    newMatchForm.location === 'Away'
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                ✈️ 客场
                            </button>
                        </div>
                    </div>

                    {/* 比赛性质 */}
                    <div>
                        <label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 md:mb-1.5">比赛性质 / 赛事类型</label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {['友谊赛', '杯赛', '联赛', '邀请赛'].map(preset => (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setNewMatchForm({...newMatchForm, competition: preset})}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                                        newMatchForm.competition === preset
                                            ? 'bg-bvb-black text-bvb-yellow border-bvb-black shadow-2xs'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-bvb-yellow'
                                    }`}
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>
                        <input className="w-full p-2.5 md:p-3 border rounded-2xl font-bold focus:ring-2 focus:ring-bvb-yellow outline-none text-xs md:text-sm" placeholder="自由输入赛事性质 (如: 2026贵阳林城之星邀请赛)" value={newMatchForm.competition} onChange={e => setNewMatchForm({...newMatchForm, competition: e.target.value})} />
                    </div>

                    {/* 场地与天气 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                        <div>
                            <label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">场地类型</label>
                            <div className="flex flex-wrap gap-1 mb-1.5">
                                {['天然草', '人工草', '室内场'].map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setNewMatchForm({...newMatchForm, pitch: p})}
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                            newMatchForm.pitch === p ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-gray-600 border-gray-200'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                            <input className="w-full p-2 border rounded-xl font-bold text-xs bg-white" placeholder="场地描述" value={newMatchForm.pitch} onChange={e => setNewMatchForm({...newMatchForm, pitch: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">天气概况</label>
                            <div className="flex flex-wrap gap-1 mb-1.5">
                                {[{ l: '晴朗', i: '☀️' }, { l: '多云', i: '⛅' }, { l: '小雨', i: '🌧️' }, { l: '大风', i: '💨' }].map(w => (
                                    <button
                                        key={w.l}
                                        type="button"
                                        onClick={() => setNewMatchForm({...newMatchForm, weather: w.l})}
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                            newMatchForm.weather === w.l ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-gray-600 border-gray-200'
                                        }`}
                                    >
                                        {w.i} {w.l}
                                    </button>
                                ))}
                            </div>
                            <input className="w-full p-2 border rounded-xl font-bold text-xs bg-white" placeholder="天气描述" value={newMatchForm.weather} onChange={e => setNewMatchForm({...newMatchForm, weather: e.target.value})} />
                        </div>
                    </div>
                </div>
                <button type="submit" className="w-full py-4 md:py-5 bg-bvb-black text-white font-black rounded-2xl shadow-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2 uppercase italic tracking-widest text-xs md:text-sm"><Save className="w-4 h-4 md:w-5 md:h-5 text-bvb-yellow" /> Create Match Event</button>
            </form>
          </div>
        </div>
      )}

      {editingMatch && (
        <MatchEditModal
          match={editingMatch}
          players={players}
          teams={teams}
          currentUser={currentUser}
          onUpdateMatch={onUpdateMatch}
          onClose={() => setEditingMatch(null)}
          tournaments={tournaments}
          onUpdateTournamentLibrary={onUpdateTournaments}
        />
      )}

      {selectedMatchForAi && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[80vh]">
                  <div className="bg-bvb-black p-4 md:p-6 flex justify-between items-center text-white"><h3 className="font-bold flex items-center text-sm md:text-base"><Bot className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3 text-bvb-yellow" /> AI 战术分析报告</h3><button onClick={() => setSelectedMatchForAi(null)}><X className="w-6 h-6" /></button></div>
                  <div className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar prose prose-sm max-w-none prose-p:text-gray-600">
                      {loading ? <div className="flex flex-col items-center justify-center py-16 md:py-20 gap-4"><Loader2 className="w-10 h-10 md:w-12 md:h-12 text-bvb-yellow animate-spin" /><p className="text-gray-400 font-black italic uppercase tracking-widest text-xs md:text-sm">Generating Strategy...</p></div> : <ReactMarkdown>{strategy}</ReactMarkdown>}
                  </div>
              </div>
          </div>
      )}

      {showAddPointItemModal && (
          <AddPointItemModal 
              onClose={() => setShowAddPointItemModal(false)}
              onAdd={(item) => {
                  onAddPointItem(item);
                  setShowAddPointItemModal(false);
              }}
          />
      )}

      {selectedMatchForCard && (
          <MatchInfoCardModal
              match={selectedMatchForCard}
              players={players}
              teams={teams}
              onClose={() => setSelectedMatchForCard(null)}
          />
      )}
    </div>
  );
};

interface MatchInfoCardModalProps {
    match: Match;
    players: Player[];
    teams: Team[];
    onClose: () => void;
}

const MatchInfoCardModal: React.FC<MatchInfoCardModalProps> = ({ match, players, teams, onClose }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);

    const team = teams.find(t => t.id === match.teamId);
    const details = match.details || {};
    const breakdown = details.summaryBreakdown || {};
    const orgRating = breakdown.orgRating || {};
    const performances = details.playerPerformances || {};
    const lineupPlayerIds = details.lineup || [];
    const substitutesIds = details.substitutes || [];

    const getFullAddress = (m: Match) => {
        if (m.location === 'Home') return '俱乐部主球场';
        const parts = [m.province, m.city, m.district].filter(Boolean);
        return parts.length > 0 ? parts.join(' - ') : (m.city || '客场');
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExportImage = async () => {
        if (!cardRef.current || isExporting) return;
        try {
            setIsExporting(true);
            const element = cardRef.current;

            // Store original styles to restore later
            const origOverflow = element.style.overflow;
            const origMaxHeight = element.style.maxHeight;
            const origHeight = element.style.height;

            // Temporarily unclip container so html2canvas measures full scroll height
            element.style.overflow = 'visible';
            element.style.maxHeight = 'none';
            element.style.height = 'auto';

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#f9fafb',
                logging: false,
                windowWidth: 1280,
                onclone: (clonedDoc) => {
                    const clonedTarget = clonedDoc.querySelector('[data-card-export]') as HTMLElement;
                    if (clonedTarget) {
                        clonedTarget.style.overflow = 'visible';
                        clonedTarget.style.maxHeight = 'none';
                        clonedTarget.style.height = 'auto';
                        clonedTarget.style.padding = '32px';
                    }
                    const modalParent = clonedDoc.querySelector('.max-h-\\[92vh\\]') as HTMLElement;
                    if (modalParent) {
                        modalParent.style.maxHeight = 'none';
                        modalParent.style.height = 'auto';
                        modalParent.style.overflow = 'visible';
                    }
                }
            });

            // Restore original styles
            element.style.overflow = origOverflow;
            element.style.maxHeight = origMaxHeight;
            element.style.height = origHeight;

            const image = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            const titleName = match.title || match.opponent || match.competition || '比赛';
            link.download = `${titleName}_完整比赛信息卡片.png`;
            link.href = image;
            link.click();
        } catch (err) {
            console.error('Export image error:', err);
            alert('导出图片失败，请稍后重试');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-6 bg-black/75 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white">
            <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto print:max-h-none print:shadow-none print:rounded-none">
                {/* Modal Toolbar (hidden when printing) */}
                <div className="bg-bvb-black p-4 md:p-5 flex justify-between items-center text-white shrink-0 print:hidden">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-bvb-yellow flex items-center justify-center text-bvb-black font-black">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-black text-base md:text-lg leading-tight flex items-center gap-2">
                                比赛信息卡片
                                <span className="text-xs bg-bvb-yellow text-bvb-black px-2 py-0.5 rounded font-black italic">
                                    MATCH CARD
                                </span>
                            </h3>
                            <p className="text-[11px] text-gray-400 font-medium">
                                综合呈现基础信息、对阵结果、出场阵容、个人表现与总结复盘
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExportImage}
                            disabled={isExporting}
                            className="px-3.5 py-2 bg-bvb-yellow text-bvb-black font-black text-xs rounded-xl hover:brightness-105 active:scale-95 transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50"
                        >
                            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            {isExporting ? '正在生成图片...' : '导出图片卡片 (PNG)'}
                        </button>
                        <button
                            onClick={handlePrint}
                            className="px-3 py-2 bg-gray-800 text-gray-200 hover:text-white font-bold text-xs rounded-xl hover:bg-gray-700 transition-all flex items-center gap-1.5"
                            title="打印网页或导出PDF"
                        >
                            <Printer className="w-4 h-4" /> 打印
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-800 text-gray-400 hover:text-white rounded-xl transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Printable Card Area */}
                <div ref={cardRef} data-card-export="true" className="p-4 md:p-8 overflow-y-auto flex-1 custom-scrollbar space-y-6 bg-gray-50 print:p-6 print:bg-white">
                    {/* Header Banner */}
                    <div className="bg-gradient-to-r from-bvb-black via-gray-900 to-bvb-black text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden border border-gray-800">
                        {/* Decorative Background Elements */}
                        <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-bvb-yellow/10 rounded-full blur-2xl pointer-events-none" />
                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-gray-800 pb-5">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-bvb-yellow flex items-center justify-center text-bvb-black font-black text-xl shadow-lg">
                                    🪨
                                </div>
                                <div>
                                    <h2 className="text-lg md:text-xl font-black italic uppercase tracking-wider text-bvb-yellow">
                                        顽石之光足球俱乐部 • 比赛报告卡
                                    </h2>
                                    <p className="text-xs text-gray-400 font-bold mt-0.5">
                                        {team?.name || '青训梯队'} • {match.competition || '官方赛事'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 self-start md:self-auto">
                                <span className="text-xs font-black bg-gray-800 text-gray-300 px-3 py-1 rounded-full border border-gray-700">
                                    {match.date} {match.isSeries && match.endDate ? `～ ${match.endDate}` : `• ${match.time}`}
                                </span>
                                <span className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                                    match.location === 'Home' ? 'bg-bvb-yellow text-bvb-black' : 'bg-blue-600 text-white'
                                }`}>
                                    {match.location === 'Home' ? '主场' : '客场'}
                                </span>
                            </div>
                        </div>

                        {/* Match Title & Score Banner */}
                        <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="text-center md:text-left">
                                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-1">
                                    {match.isSeries ? '赛事主体 / 对阵系列' : '比赛对阵对手'}
                                </span>
                                <h1 className="text-2xl md:text-3xl font-black text-white flex items-center justify-center md:justify-start gap-3">
                                    {match.isSeries ? (
                                        <>
                                            <Activity className="w-7 h-7 text-bvb-yellow" />
                                            {match.opponent || '多方对手'}
                                        </>
                                    ) : (
                                        <>VS {match.opponent}</>
                                    )}
                                </h1>
                            </div>

                            {/* Score Display */}
                            <div className="flex flex-col items-center md:items-end">
                                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">
                                    比赛结果 / 比分
                                </span>
                                {match.isSeries ? (
                                    <div className="flex items-center gap-3">
                                        <div className="text-2xl md:text-3xl font-black text-bvb-yellow bg-gray-800/90 px-5 py-2 rounded-2xl border border-bvb-yellow/30 shadow-inner">
                                            {match.seriesResult || '未录入'}
                                        </div>
                                        {match.seriesRanking && (
                                            <span className="text-xs font-black text-bvb-black bg-bvb-yellow px-3 py-1.5 rounded-xl uppercase tracking-wider">
                                                {match.seriesRanking}
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-3xl md:text-4xl font-black text-bvb-yellow bg-gray-800/90 px-6 py-2 rounded-2xl border border-bvb-yellow/30 shadow-inner tabular-nums">
                                        {match.result || '- : -'}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Environment & Location Info Bar */}
                        <div className="mt-6 pt-4 border-t border-gray-800/80 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-bold text-gray-300">
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-bvb-yellow shrink-0" />
                                <span className="truncate">{getFullAddress(match)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-bvb-yellow shrink-0" />
                                <span>场地: {details.pitch || '天然草'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Cloud className="w-4 h-4 text-bvb-yellow shrink-0" />
                                <span>天气: {details.weather || '晴朗'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-bvb-yellow shrink-0" />
                                <span>比赛性质: {match.competition || '未声明'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Section 1: 对阵列表 / 比分细则 */}
                    {(match.isSeries || (match.fixtures && match.fixtures.length > 0)) && (
                        <div className="bg-white rounded-3xl p-5 md:p-6 border border-gray-100 shadow-sm space-y-4">
                            <h3 className="text-sm md:text-base font-black text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                                <Activity className="w-4 h-4 text-bvb-yellow" />
                                系列赛 / 锦标赛对阵明细列表 (共 {match.fixtures?.length || 0} 场)
                            </h3>
                            {(!match.fixtures || match.fixtures.length === 0) ? (
                                <p className="text-xs text-gray-400 font-bold italic py-2">
                                    暂未录入分场明细（系列赛总结成绩：{match.seriesResult || '待录入'}）
                                </p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {match.fixtures.map((fixture, idx) => (
                                        <div key={fixture.id || idx} className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100 flex items-center justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black bg-bvb-black text-bvb-yellow px-1.5 py-0.5 rounded">
                                                        第 {idx + 1} 场
                                                    </span>
                                                    <span className="text-xs font-bold text-gray-500">{fixture.date || match.date}</span>
                                                </div>
                                                <h4 className="text-xs md:text-sm font-black text-gray-800 mt-1">
                                                    VS {fixture.opponent}
                                                </h4>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-base font-black text-bvb-black bg-white px-3 py-1 rounded-xl border border-gray-200 tabular-nums inline-block">
                                                    {fixture.result || '-:-'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Section 2: 参赛阵容 */}
                    <div className="bg-white rounded-3xl p-5 md:p-6 border border-gray-100 shadow-sm space-y-4">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <h3 className="text-sm md:text-base font-black text-gray-900 flex items-center gap-2">
                                <UsersIcon className="w-4 h-4 text-bvb-yellow" />
                                参赛名单与阵容 ({lineupPlayerIds.length} 人)
                            </h3>
                        </div>
                        {lineupPlayerIds.length === 0 ? (
                            <p className="text-xs text-gray-400 font-bold italic py-2">暂未录入出场阵容</p>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {lineupPlayerIds.map(pid => {
                                    const p = players.find(player => player.id === pid);
                                    const isSub = substitutesIds.includes(pid);
                                    return (
                                        <div key={pid} className="bg-gray-50 p-2.5 rounded-2xl border border-gray-100 flex items-center gap-2.5">
                                            <img
                                                src={p?.image || 'https://images.unsplash.com/photo-1533107862482-0e6974b06ec4?q=80&w=200&h=200&fit=crop'}
                                                crossOrigin="anonymous"
                                                referrerPolicy="no-referrer"
                                                className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
                                                alt={p?.name}
                                            />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xs font-black text-gray-900 truncate">{p?.name || '球员'}</span>
                                                    {p?.number && <span className="text-[9px] font-black text-gray-400">#{p.number}</span>}
                                                </div>
                                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded inline-block ${
                                                    isSub ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                                                }`}>
                                                    {isSub ? '替补' : '首发'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Section 3: 个人表现评估 */}
                    <div className="bg-white rounded-3xl p-5 md:p-6 border border-gray-100 shadow-sm space-y-4">
                        <h3 className="text-sm md:text-base font-black text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                            <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                            球员个人表现点评与评分
                        </h3>
                        {lineupPlayerIds.length === 0 ? (
                            <p className="text-xs text-gray-400 font-bold italic py-2">暂无球员信息</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                {lineupPlayerIds.map(pid => {
                                    const p = players.find(player => player.id === pid);
                                    const perf = performances[pid] || {};
                                    const rating = perf.rating || 0;
                                    const comment = perf.comment || '';

                                    return (
                                        <div key={pid} className="bg-gradient-to-br from-gray-50 to-amber-50/10 p-3.5 rounded-2xl border border-gray-100 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2.5">
                                                    <img
                                                        src={p?.image || 'https://images.unsplash.com/photo-1533107862482-0e6974b06ec4?q=80&w=200&h=200&fit=crop'}
                                                        crossOrigin="anonymous"
                                                        referrerPolicy="no-referrer"
                                                        className="w-8 h-8 rounded-full object-cover border border-white shadow-sm"
                                                        alt={p?.name}
                                                    />
                                                    <div>
                                                        <span className="text-xs font-black text-gray-900">{p?.name || '未知球员'}</span>
                                                        {p?.number && <span className="text-[10px] text-gray-400 ml-1">#{p.number}</span>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-gray-100 shadow-xs">
                                                    {[1, 2, 3, 4, 5].map(star => (
                                                        <Star
                                                            key={star}
                                                            className={`w-3.5 h-3.5 ${
                                                                star <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-100'
                                                            }`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-700 font-medium bg-white/80 p-2.5 rounded-xl border border-gray-100/80 leading-relaxed italic">
                                                {comment ? `“${comment}”` : '暂无录入个人点评'}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Section 4: 总结与复盘 */}
                    <div className="bg-white rounded-3xl p-5 md:p-6 border border-gray-100 shadow-sm space-y-4">
                        <h3 className="text-sm md:text-base font-black text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                            <ClipboardList className="w-4 h-4 text-bvb-yellow" />
                            比赛总结与团队复盘
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* 比赛整体评价 */}
                            <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100 md:col-span-2">
                                <h4 className="text-xs font-black text-gray-800 flex items-center gap-1.5 uppercase mb-1.5">
                                    <FileText className="w-3.5 h-3.5 text-bvb-yellow" /> 比赛整体评价
                                </h4>
                                <p className="text-xs text-gray-700 font-medium whitespace-pre-wrap leading-relaxed">
                                    {breakdown.overall || '未填写'}
                                </p>
                            </div>

                            {/* 表现亮点 */}
                            <div className="bg-green-50/30 p-4 rounded-2xl border border-green-100">
                                <h4 className="text-xs font-black text-green-900 flex items-center gap-1.5 uppercase mb-1.5">
                                    <TrendingUp className="w-3.5 h-3.5 text-green-600" /> 表现亮点
                                </h4>
                                <p className="text-xs text-gray-700 font-medium whitespace-pre-wrap leading-relaxed">
                                    {breakdown.highlights || breakdown.matchReview || '未填写'}
                                </p>
                            </div>

                            {/* 暴露的问题 */}
                            <div className="bg-red-50/30 p-4 rounded-2xl border border-red-100">
                                <h4 className="text-xs font-black text-red-900 flex items-center gap-1.5 uppercase mb-1.5">
                                    <AlertCircle className="w-3.5 h-3.5 text-red-500" /> 暴露的问题
                                </h4>
                                <p className="text-xs text-gray-700 font-medium whitespace-pre-wrap leading-relaxed">
                                    {breakdown.issuesExposed || '未填写'}
                                </p>
                            </div>

                            {/* 下一阶段训练重点 */}
                            <div className="bg-amber-50/30 p-4 rounded-2xl border border-amber-100 md:col-span-2">
                                <h4 className="text-xs font-black text-amber-900 flex items-center gap-1.5 uppercase mb-1.5">
                                    <Target className="w-3.5 h-3.5 text-amber-500" /> 下一阶段训练重点
                                </h4>
                                <p className="text-xs text-gray-700 font-medium whitespace-pre-wrap leading-relaxed">
                                    {breakdown.nextStageTraining || '未填写'}
                                </p>
                            </div>

                            {/* 赛事组织评价 */}
                            <div className="bg-gradient-to-br from-amber-50/20 to-gray-50 p-4 rounded-2xl border border-amber-200/60 md:col-span-2 space-y-3">
                                <h4 className="text-xs font-black text-gray-900 flex items-center gap-1.5 uppercase">
                                    <Star className="w-4 h-4 text-amber-500 fill-amber-400" /> 赛事组织综合评分
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {[
                                        { label: '赛事组织', val: orgRating.eventOrganization ?? 5 },
                                        { label: '裁判水平', val: orgRating.refereeLevel ?? 5 },
                                        { label: '场地条件', val: orgRating.venueCondition ?? 5 },
                                        { label: '住宿环境', val: orgRating.accommodation ?? 5 },
                                        { label: '交通配备', val: orgRating.transportation ?? 5 },
                                    ].map((item, idx) => (
                                        <div key={idx} className="bg-white p-2.5 rounded-xl border border-gray-100 flex items-center justify-between">
                                            <span className="text-xs font-bold text-gray-700">{item.label}</span>
                                            <div className="flex items-center gap-0.5">
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <Star
                                                        key={s}
                                                        className={`w-3 h-3 ${s <= item.val ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-100'}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    <div className="bg-white p-2.5 rounded-xl border border-gray-100 flex items-center justify-between">
                                        <span className="text-xs font-bold text-gray-700">推荐再次参赛</span>
                                        <span className={`text-xs font-black px-2 py-0.5 rounded ${
                                            orgRating.recommendParticipation === '是' || orgRating.recommendParticipation === true
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                        }`}>
                                            {orgRating.recommendParticipation === '是' || orgRating.recommendParticipation === true ? '推荐 (是)' : '不推荐 (否)'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MatchPlanner;

interface MatchCardProps {
    match: Match;
    teams: Team[];
    onDeleteMatch: (id: string) => void;
    startEditing: (match: Match) => void;
    handleGenerateStrategy: (match: Match) => void;
    onShowCard: (match: Match) => void;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, teams, onDeleteMatch, startEditing, handleGenerateStrategy, onShowCard }) => {
    const team = teams.find(t => t.id === match.teamId);
    
    const getLocationLabel = (loc: string) => loc === 'Home' ? '主场' : '客场';
    const getFullAddress = (m: Match) => {
        if (m.location === 'Home') return '俱乐部主球场';
        const parts = [m.province, m.city, m.district].filter(Boolean);
        return parts.length > 0 ? parts.join(' - ') : (m.city || '客场');
    };

    return (
        <div className={`bg-white rounded-xl shadow-sm border-l-4 p-3 md:p-5 transition-all hover:shadow-md relative group ${match.status === 'Completed' ? (
            match.isSeries ? (
                match.seriesResult ? 'border-bvb-yellow' : 'border-gray-300'
            ) : (
                match.result && match.result.split('-')[0] > match.result.split('-')[1] ? 'border-green-500' : 
                match.result && match.result.split('-')[0] < match.result.split('-')[1] ? 'border-red-500' : 'border-yellow-500'
            )
        ) : 'border-gray-300'}`}>
            <div className="absolute top-2.5 md:top-3 right-2.5 md:right-3 flex gap-1.5 md:gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); onShowCard(match); }} className="p-1 md:p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded" title="查看比赛卡片"><FileText className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
                <button onClick={(e) => { e.stopPropagation(); onDeleteMatch(match.id); }} className="p-1 md:p-1.5 bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-500 rounded"><Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
                <button onClick={(e) => { e.stopPropagation(); startEditing(match); }} className="p-1 md:p-1.5 bg-gray-100 hover:bg-yellow-50 text-gray-400 hover:text-bvb-black rounded">
                    {match.status === 'Completed' ? <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                </button>
            </div>
            <div className="flex justify-between items-center mb-1.5 md:mb-2">
                <span className="text-[9px] md:text-[10px] font-black uppercase text-gray-400 flex items-center tracking-widest">
                    <Calendar className="w-2.5 h-2.5 md:w-3 md:h-3 mr-1 md:mr-1.5 text-bvb-yellow" /> 
                    {match.date} {match.isSeries && match.endDate ? `～ ${match.endDate}` : `• ${match.time}`}
                </span>
                <div className="flex items-center gap-1.5 md:gap-2 pr-10 md:pr-0">
                    {match.tournamentTier && TIER_CONFIG[match.tournamentTier] && (
                        <span className={`text-[8px] md:text-[9px] px-1.5 py-0.5 rounded font-black ${TIER_CONFIG[match.tournamentTier].badge}`}>
                            {TIER_CONFIG[match.tournamentTier].icon} {match.tournamentTier}级
                        </span>
                    )}
                    {match.isSeries && (
                        <span className="text-[8px] md:text-[10px] bg-bvb-black text-bvb-yellow font-black px-2 py-0.5 rounded italic">SERIES</span>
                    )}
                    <span className="text-[8px] md:text-[10px] bg-gray-100 text-gray-500 font-bold px-1.5 rounded border border-gray-200">{team?.name}</span>
                    <span className={`px-1.5 py-0.5 text-[8px] md:text-[10px] font-black rounded uppercase tracking-tighter ${match.location === 'Home' ? 'bg-bvb-yellow text-bvb-black' : 'bg-gray-200 text-gray-600'}`}>{getLocationLabel(match.location)}</span>
                </div>
            </div>
            <div className="flex justify-between items-end">
                <div>
                    {match.title && <h4 className="text-[8px] md:text-[10px] font-bold text-gray-400 mb-0.5 uppercase truncate max-w-[150px] md:max-w-none">{match.title}</h4>}
                    <h3 className="text-base md:text-xl font-black text-gray-900 flex items-center">
                        {match.isSeries ? (
                            <span className="flex items-center gap-2">
                                <Activity className="w-4 h-4 text-bvb-yellow" /> 
                                {match.opponent || '多方对手'}
                            </span>
                        ) : (
                            `VS ${match.opponent}`
                        )}
                    </h3>
                    <div className="text-[10px] md:text-xs text-gray-500 mt-1 md:mt-1.5 flex items-center font-bold">
                         <MapPin className="w-2.5 h-2.5 md:w-3 md:h-3 mr-1 text-gray-400" /> {getFullAddress(match)}
                    </div>
                </div>
                {match.status === 'Completed' ? (
                    match.isSeries ? (
                        <div className="flex flex-col items-end gap-1.5">
                            <div className="flex items-center gap-2">
                                <div className="text-base md:text-xl font-black text-bvb-black bg-gray-100 px-3 md:px-4 py-1 md:py-1.5 rounded-xl border border-gray-200 tabular-nums leading-none">
                                    {match.seriesResult || '-'}
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); onShowCard(match); }} className="text-[9px] md:text-[10px] font-black flex items-center bg-bvb-yellow text-bvb-black px-2 md:px-2.5 py-1 rounded-lg shadow-xs hover:brightness-105 active:scale-95 transition-all">
                                    <FileText className="w-3 h-3 mr-1" /> 卡片
                                </button>
                            </div>
                            {match.seriesRanking && (
                                <span className="text-[8px] md:text-[10px] font-black text-gray-400 bg-gray-200/50 px-1.5 py-0.5 rounded italic truncate max-w-[120px]">
                                    {match.seriesRanking}
                                </span>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <div className="text-xl md:text-3xl font-black text-bvb-black bg-gray-100 px-3 md:px-4 py-1 md:py-1.5 rounded-xl border border-gray-200 tabular-nums leading-none">{match.result || '-:-'}</div>
                            <button onClick={(e) => { e.stopPropagation(); onShowCard(match); }} className="text-[9px] md:text-[10px] font-black flex items-center bg-bvb-yellow text-bvb-black px-2 md:px-2.5 py-1.5 rounded-lg shadow-xs hover:brightness-105 active:scale-95 transition-all">
                                <FileText className="w-3 h-3 mr-1" /> 卡片
                            </button>
                        </div>
                    )
                ) : (
                    <div className="flex flex-col items-end gap-1.5 md:gap-2">
                         <div className="flex items-center gap-1.5">
                            <button onClick={() => onShowCard(match)} className="text-[9px] md:text-[10px] font-black flex items-center bg-gray-100 text-gray-700 px-2 md:px-2.5 py-1 md:py-1.5 rounded-lg hover:bg-gray-200 transition-all">卡片 <FileText className="w-2.5 h-2.5 md:w-3 md:h-3 ml-1" /></button>
                            <button onClick={() => startEditing(match)} className="text-[9px] md:text-[10px] font-black flex items-center bg-bvb-yellow text-bvb-black px-2 md:px-3 py-1 md:py-1.5 rounded-lg shadow-sm hover:brightness-105 active:scale-95 transition-all">录入赛果 <PenTool className="w-2.5 h-2.5 md:w-3 md:h-3 ml-1 md:ml-1.5" /></button>
                         </div>
                         <button onClick={() => handleGenerateStrategy(match)} className="text-[9px] md:text-[10px] font-black flex items-center bg-black text-white px-2 md:px-3 py-1 md:py-1.5 rounded-lg hover:bg-gray-800 transition-all"><Bot className="w-2.5 h-2.5 md:w-3 md:h-3 mr-1 md:mr-1.5 text-bvb-yellow" /> 助手</button>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Match Point Management Components ---

interface MatchPointManagerProps {
  players: Player[];
  teams: Team[];
  currentUser: User | null;
  filterTeamId: string;
  pointItemDefinitions: PointItemDefinition[];
  onAddPointItem: (item: PointItemDefinition) => void;
  onDeletePointItem: (id: string) => void;
  playerPointRecords: PlayerPointRecord[];
  onAddPointRecord: (record: PlayerPointRecord) => void;
  onBulkAddPointRecords: (records: PlayerPointRecord[]) => void;
  onDeletePointRecord: (id: string) => void;
  travelingPlayerIds: string[];
  onUpdateTravelingPlayers: (ids: string[]) => void;
}

const MatchPointManager: React.FC<MatchPointManagerProps> = ({
    players,
    teams,
    currentUser,
    filterTeamId,
    pointItemDefinitions,
    onAddPointItem,
    onDeletePointItem,
    playerPointRecords,
    onBulkAddPointRecords,
    onDeletePointRecord,
    travelingPlayerIds,
    onUpdateTravelingPlayers
}) => {
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [activeTab, setActiveTab] = useState<'squad' | 'record' | 'summary' | 'history' | 'items'>('squad');
    const [tempSquadIds, setTempSquadIds] = useState<string[]>(travelingPlayerIds || []);
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [summaryViewMode, setSummaryViewMode] = useState<'all' | 'daily'>('all');

    const isDirector = currentUser?.role === 'director';
    const availableTeams = useMemo(() => {
        if (isDirector) return teams;
        return teams.filter(t => currentUser?.teamIds?.includes(t.id));
    }, [currentUser, teams, isDirector]);

    const displayTeams = useMemo(() => {
        return filterTeamId === 'all' ? availableTeams : availableTeams.filter(t => t.id === filterTeamId);
    }, [availableTeams, filterTeamId]);

    const playersByTeam = useMemo(() => {
        const result: Record<string, Player[]> = {};
        displayTeams.forEach(team => {
            result[team.id] = players.filter(p => p.teamId === team.id);
        });
        return result;
    }, [displayTeams, players]);

    // Only show traveling players in management tabs
    const travelingPlayers = useMemo(() => {
        return players.filter(p => travelingPlayerIds.includes(p.id));
    }, [players, travelingPlayerIds]);

    const playerPointsMap = useMemo(() => {
        const map: Record<string, number> = {};
        playerPointRecords.forEach(r => {
            const item = pointItemDefinitions.find(i => i.id === r.itemId);
            if (!item) return;
            const pointsValue = (item.type === 'loss' || item.type === 'consumption') ? -Number(r.points) : Number(r.points);
            map[r.playerId] = (map[r.playerId] || 0) + pointsValue;
        });
        return map;
    }, [playerPointRecords, pointItemDefinitions]);

    const dailyRecords = useMemo(() => {
        return playerPointRecords.filter(r => r.date === selectedDate);
    }, [playerPointRecords, selectedDate]);

    // Aggregated stats for summary table
    const summaryData = useMemo(() => {
        const data: Record<string, Record<PointChangeType, number>> = {};
        travelingPlayerIds.forEach(pid => {
            data[pid] = { gain: 0, loss: 0, consumption: 0 };
        });

        playerPointRecords.forEach(r => {
            if (summaryViewMode === 'daily' && r.date !== selectedDate) return;
            if (travelingPlayerIds.includes(r.playerId) && data[r.playerId]) {
                const item = pointItemDefinitions.find(i => i.id === r.itemId);
                if (item) {
                   data[r.playerId][item.type] += Number(r.points);
                }
            }
        });
        return data;
    }, [playerPointRecords, pointItemDefinitions, travelingPlayerIds, summaryViewMode, selectedDate]);

    const handleRecordPoints = (itemId: string) => {
        if (selectedPlayerIds.length === 0) return;
        const item = pointItemDefinitions.find(i => i.id === itemId);
        if (!item) return;

        let finalPoints = item.points;
        if (item.isVariable) {
            const input = prompt(`请输入 "${item.title}" 的积分数额:`, item.points.toString());
            if (input === null) return; // Cancelled
            const parsed = parseInt(input);
            if (isNaN(parsed) || parsed < 0) {
                alert('请输入有效的正整数');
                return;
            }
            finalPoints = parsed;
        }

        const newRecords: PlayerPointRecord[] = selectedPlayerIds.map(pid => ({
            id: Math.random().toString(36).slice(2, 11),
            playerId: pid,
            itemId: item.id,
            date: selectedDate,
            points: finalPoints
        }));

        onBulkAddPointRecords(newRecords);
        setSelectedPlayerIds([]);
        alert('记录成功');
    };

    const toggleSquadSelection = (playerId: string) => {
        setTempSquadIds(prev => 
            prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
        );
    };

    const toggleTeamSquadSelection = (teamId: string) => {
        const teamPlayerIds = playersByTeam[teamId]?.map(p => p.id) || [];
        const allSelected = teamPlayerIds.every(id => tempSquadIds.includes(id));
        
        if (allSelected) {
            setTempSquadIds(prev => prev.filter(id => !teamPlayerIds.includes(id)));
        } else {
            setTempSquadIds(prev => Array.from(new Set([...prev, ...teamPlayerIds])));
        }
    };

    const confirmSquad = () => {
        onUpdateTravelingPlayers(tempSquadIds);
        alert(`已确认 ${tempSquadIds.length} 名出行球员`);
        setActiveTab('record');
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-24">
            {/* Tabs */}
            <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100 flex gap-1 overflow-x-auto">
                {[
                    { id: 'squad', label: '人员名单', icon: UsersIcon },
                    { id: 'record', label: '积分录入', icon: PenTool },
                    { id: 'summary', label: '积分概览', icon: Trophy },
                    { id: 'history', label: '录入流水', icon: ClipboardList },
                    { id: 'items', label: '项目管理', icon: ListPlus }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 min-w-[100px] py-3 text-[10px] md:text-xs font-black uppercase tracking-wider rounded-lg transition-all flex flex-col items-center gap-1 ${activeTab === tab.id ? 'bg-bvb-black text-bvb-yellow shadow-lg' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'squad' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
                            <h4 className="font-black text-gray-800 text-sm flex items-center gap-2 uppercase italic tracking-tighter">
                                <UsersIcon className="w-4 h-4 text-bvb-yellow" /> 选择外派比赛名单
                            </h4>
                            <div className="bg-bvb-yellow/10 px-3 py-1 rounded-full">
                                <span className="text-[10px] font-black text-bvb-black uppercase">当前选定: {tempSquadIds.length} 人</span>
                            </div>
                        </div>
                        <div className="p-4 space-y-6 max-h-[600px] overflow-y-auto custom-scrollbar">
                            {displayTeams.map(team => (
                                <div key={team.id} className="space-y-3">
                                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                        <h5 className="text-xs font-black text-bvb-black uppercase flex items-center gap-2">
                                            <Shield className="w-3.5 h-3.5 text-bvb-yellow" /> {team.name}
                                        </h5>
                                        <button 
                                            onClick={() => toggleTeamSquadSelection(team.id)}
                                            className="text-[10px] font-black uppercase text-gray-400 hover:text-bvb-black px-2 py-1 bg-gray-100 rounded-lg"
                                        >
                                            全选 / 取消
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                        {playersByTeam[team.id]?.map(player => (
                                            <button
                                                key={player.id}
                                                onClick={() => toggleSquadSelection(player.id)}
                                                className={`p-2.5 rounded-xl border flex items-center justify-between transition-all group ${tempSquadIds.includes(player.id) ? 'bg-bvb-black border-bvb-black shadow-md' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <img src={player.image} className="w-9 h-9 rounded-full object-cover border-2 border-transparent group-hover:border-bvb-yellow transition-all" />
                                                        {tempSquadIds.includes(player.id) && (
                                                            <div className="absolute -top-1 -right-1 bg-bvb-yellow rounded-full p-0.5 shadow-sm">
                                                                <CheckCircle className="w-3 h-3 text-bvb-black" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-left">
                                                        <p className={`text-[11px] font-black leading-tight ${tempSquadIds.includes(player.id) ? 'text-white' : 'text-gray-800'}`}>{player.name}</p>
                                                        <p className={`text-[9px] font-bold opacity-60 flex items-center gap-1 ${tempSquadIds.includes(player.id) ? 'text-bvb-yellow' : 'text-gray-500'}`}>
                                                            <span className="font-black italic">#{player.number}</span>
                                                            <span className="uppercase tracking-tighter">{player.position}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                {tempSquadIds.includes(player.id) ? (
                                                    <div className="w-6 h-6 rounded-full bg-bvb-yellow/20 flex items-center justify-center">
                                                        <Shield className="w-3.5 h-3.5 text-bvb-yellow" />
                                                    </div>
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full border border-gray-100" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <button 
                                onClick={confirmSquad}
                                className="px-8 py-3 bg-bvb-black text-bvb-yellow font-black rounded-xl shadow-lg hover:scale-105 transition-all uppercase italic text-sm tracking-widest flex items-center gap-2"
                            >
                                <CheckCircle className="w-4 h-4" /> 确认名单并开始管理
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'record' && (
                travelingPlayerIds.length === 0 ? (
                    <div className="bg-white rounded-2xl p-20 flex flex-col items-center justify-center border border-dashed border-gray-200 text-gray-400 gap-4">
                        <UsersIcon className="w-12 h-12 opacity-20" />
                        <p className="font-black uppercase tracking-widest text-sm">请先在"人员名单"标签中选择外派球员</p>
                        <button onClick={() => setActiveTab('squad')} className="px-6 py-2 bg-bvb-black text-bvb-yellow rounded-lg font-black text-xs uppercase italic">前往选择</button>
                    </div>
                ) : (
                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Player Selection from Traveling Squad */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
                                    <h4 className="font-black text-gray-800 text-sm flex items-center gap-2 uppercase italic tracking-tighter">
                                        <PenTool className="w-4 h-4 text-bvb-yellow" /> 积分录入 - 选中外派球员
                                    </h4>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="date" 
                                            value={selectedDate} 
                                            onChange={e => setSelectedDate(e.target.value)}
                                            className="text-xs font-bold p-1.5 border rounded-lg bg-white"
                                        />
                                        <span className="text-[10px] font-black text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                                            已选: {selectedPlayerIds.length}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-4 space-y-6 max-h-[600px] overflow-y-auto custom-scrollbar">
                                    {displayTeams.map(team => {
                                        const teamTravelingPlayers = playersByTeam[team.id]?.filter(p => travelingPlayerIds.includes(p.id)) || [];
                                        if (teamTravelingPlayers.length === 0) return null;
                                        
                                        return (
                                            <div key={team.id} className="space-y-3">
                                                <div className="flex items-center justify-between border-b border-gray-100 pb-1">
                                                    <h5 className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-1.5">
                                                        <Shield className="w-3 h-3" /> {team.name}
                                                    </h5>
                                                    <button 
                                                        onClick={() => {
                                                            const ids = teamTravelingPlayers.map(p => p.id);
                                                            const allSelected = ids.every(id => selectedPlayerIds.includes(id));
                                                            if (allSelected) {
                                                                setSelectedPlayerIds(prev => prev.filter(id => !ids.includes(id)));
                                                            } else {
                                                                setSelectedPlayerIds(prev => Array.from(new Set([...prev, ...ids])));
                                                            }
                                                        }}
                                                        className="text-[9px] font-bold text-blue-500 hover:text-blue-700"
                                                    >
                                                        全选
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                    {teamTravelingPlayers.map(player => (
                                                        <button
                                                            key={player.id}
                                                            onClick={() => setSelectedPlayerIds(prev => prev.includes(player.id) ? prev.filter(id => id !== player.id) : [...prev, player.id])}
                                                            className={`p-2.5 rounded-xl border flex items-center justify-between transition-all group ${selectedPlayerIds.includes(player.id) ? 'bg-bvb-black border-bvb-black shadow-md ring-1 ring-bvb-yellow' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="relative">
                                                                    <img src={player.image} className="w-9 h-9 rounded-full object-cover border-2 border-transparent group-hover:border-bvb-yellow transition-all" />
                                                                    {selectedPlayerIds.includes(player.id) && (
                                                                        <div className="absolute -top-1 -right-1 bg-bvb-yellow rounded-full p-0.5 shadow-sm">
                                                                            <CheckCircle className="w-3 h-3 text-bvb-black" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="text-left">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <p className={`text-[11px] font-black leading-tight ${selectedPlayerIds.includes(player.id) ? 'text-white' : 'text-gray-800'}`}>{player.name}</p>
                                                                        <span className={`text-[8px] px-1 rounded-full font-black ${player.gender === '女' ? 'bg-pink-500/20 text-pink-300' : 'bg-blue-500/20 text-blue-300'} ${selectedPlayerIds.includes(player.id) ? 'text-white' : ''}`}>
                                                                            {player.gender === '女' ? '♀' : '♂'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                         <p className={`text-[9px] font-bold opacity-60 ${selectedPlayerIds.includes(player.id) ? 'text-bvb-yellow' : 'text-gray-500'}`}>#{player.number} {player.position}</p>
                                                                         <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${selectedPlayerIds.includes(player.id) ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                                                            {playerPointsMap[player.id] || 0} pts
                                                                         </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${selectedPlayerIds.includes(player.id) ? 'border-bvb-yellow bg-bvb-yellow' : 'border-gray-100'}`}>
                                                                {selectedPlayerIds.includes(player.id) && <CheckCircle className="w-3 h-3 text-bvb-black" />}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="p-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                                    <button 
                                        onClick={() => setSelectedPlayerIds(travelingPlayerIds)}
                                        className="text-[10px] font-black text-gray-500 uppercase hover:text-bvb-black"
                                    >
                                        全选名单球员
                                    </button>
                                    <button 
                                        onClick={() => setSelectedPlayerIds([])}
                                        className="text-[10px] font-black text-gray-500 uppercase hover:text-red-500"
                                    >
                                        清空选择
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Point Actions */}
                        <div className="space-y-6">
                            {[
                                { type: 'gain', title: '加分项目', icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-100', btnBg: 'bg-green-600' },
                                { type: 'loss', title: '减分项目', icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100', btnBg: 'bg-red-600' },
                                { type: 'consumption', title: '积分消耗', icon: Coins, color: 'text-bvb-yellow', bg: 'bg-yellow-50', border: 'border-yellow-100', btnBg: 'bg-bvb-black' }
                            ].map(group => (
                                <div key={group.type} className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-5`}>
                                    <h4 className="font-black text-gray-800 text-sm mb-4 flex items-center gap-2 uppercase tracking-tighter">
                                        <group.icon className={`w-4 h-4 ${group.color}`} /> {group.title}
                                    </h4>
                                    <div className="space-y-2">
                                        {pointItemDefinitions.filter(i => i.type === group.type).map(item => (
                                            <button
                                                key={item.id}
                                                onClick={() => handleRecordPoints(item.id)}
                                                disabled={selectedPlayerIds.length === 0}
                                                className={`w-full flex items-center justify-between p-3 rounded-xl ${group.bg} border ${group.border} ${group.color} hover:shadow-md transition-all font-black text-xs disabled:opacity-50`}
                                            >
                                                <span>{item.title}</span>
                                                <span className={`${group.btnBg} text-white px-2 py-0.5 rounded-full text-[10px]`}>
                                                    {item.isVariable ? '?' : (group.type === 'gain' ? '+' : '-') + item.points}
                                                </span>
                                            </button>
                                        ))}
                                        {pointItemDefinitions.filter(i => i.type === group.type).length === 0 && (
                                            <p className="text-[10px] text-gray-400 italic text-center py-4 bg-gray-50 rounded-xl border border-dashed">暂无该类项目</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            )}

            {activeTab === 'summary' && (
                travelingPlayerIds.length === 0 ? (
                    <div className="bg-white rounded-2xl p-20 flex flex-col items-center justify-center border border-dashed border-gray-200 text-gray-400 gap-4">
                        <Trophy className="w-12 h-12 opacity-20" />
                        <p className="font-black uppercase tracking-widest text-sm">暂无数据，请先确定外派球员名单</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="bg-gray-50 p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                            <h4 className="font-black text-gray-800 text-sm flex items-center gap-2 uppercase italic tracking-tighter">
                                <Trophy className="w-4 h-4 text-bvb-yellow" /> 积分统计概览 {summaryViewMode === 'daily' ? `(${selectedDate})` : '(所有时期)'}
                            </h4>
                            <div className="flex items-center gap-2">
                                <div className="flex bg-gray-200 p-0.5 rounded-lg border border-gray-200">
                                    <button 
                                        onClick={() => setSummaryViewMode('all')}
                                        className={`px-3 py-1 rounded-md text-[10px] font-black transition-all ${summaryViewMode === 'all' ? 'bg-white text-bvb-black shadow-sm' : 'text-gray-500'}`}
                                    >
                                        累计统计
                                    </button>
                                    <button 
                                        onClick={() => setSummaryViewMode('daily')}
                                        className={`px-3 py-1 rounded-md text-[10px] font-black transition-all ${summaryViewMode === 'daily' ? 'bg-white text-bvb-black shadow-sm' : 'text-gray-500'}`}
                                    >
                                        按日统计
                                    </button>
                                </div>
                                {summaryViewMode === 'daily' && (
                                    <input 
                                        type="date" 
                                        value={selectedDate} 
                                        onChange={e => setSelectedDate(e.target.value)}
                                        className="text-xs font-bold p-1 border rounded-lg bg-white"
                                    />
                                )}
                            </div>
                        </div>
                        <div className="md:hidden divide-y divide-gray-50">
                            {travelingPlayers.map(player => (
                                <div key={player.id} className="p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <img src={player.image} className="w-8 h-8 rounded-full object-cover border border-gray-100" />
                                            <div>
                                                <p className="font-black text-gray-800 text-xs">{player.name}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">#{player.number} {player.position}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">
                                                {summaryViewMode === 'daily' ? '当日变动' : '当前总积分'}
                                            </p>
                                            {(() => {
                                                const playerDayNet = (summaryData[player.id]?.gain || 0) - (summaryData[player.id]?.loss || 0) - (summaryData[player.id]?.consumption || 0);
                                                const displayValue = summaryViewMode === 'daily' ? playerDayNet : (playerPointsMap[player.id] || 0);
                                                return (
                                                    <p className={`text-lg font-black leading-none ${displayValue >= 0 ? 'text-bvb-black' : 'text-red-500'}`}>
                                                        {displayValue > 0 && summaryViewMode === 'daily' ? '+' : ''}{displayValue}
                                                    </p>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 py-2 border-t border-gray-50">
                                        <div className="text-center p-2 bg-green-50 rounded-lg">
                                            <p className="text-[8px] font-black text-green-700 uppercase mb-1">加分 (+)</p>
                                            <p className="text-xs font-black text-green-600">{summaryData[player.id]?.gain || 0}</p>
                                        </div>
                                        <div className="text-center p-2 bg-red-50 rounded-lg">
                                            <p className="text-[8px] font-black text-red-700 uppercase mb-1">减分 (-)</p>
                                            <p className="text-xs font-black text-red-600">{summaryData[player.id]?.loss || 0}</p>
                                        </div>
                                        <div className="text-center p-2 bg-amber-50 rounded-lg">
                                            <p className="text-[8px] font-black text-amber-700 uppercase mb-1">消耗 (▼)</p>
                                            <p className="text-xs font-black text-amber-600">{summaryData[player.id]?.consumption || 0}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4 sticky left-0 bg-gray-50 z-10 w-40">球员姓名</th>
                                        <th className="px-6 py-4 text-center">累计加分 (+)</th>
                                        <th className="px-6 py-4 text-center">累计减分 (-)</th>
                                        <th className="px-6 py-4 text-center">累计消耗 (▼)</th>
                                        <th className="px-6 py-4 text-center font-black text-bvb-black bg-yellow-50 w-24">
                                            {summaryViewMode === 'daily' ? '当日变动' : '当前总积分'}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {travelingPlayers.map(player => {
                                        const playerDayNet = (summaryData[player.id]?.gain || 0) - (summaryData[player.id]?.loss || 0) - (summaryData[player.id]?.consumption || 0);
                                        const displayValue = summaryViewMode === 'daily' ? playerDayNet : (playerPointsMap[player.id] || 0);
                                        
                                        return (
                                            <tr key={player.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 sticky left-0 bg-white z-10">
                                                        <div className="flex items-center gap-1.5 sticky left-0 bg-white z-10">
                                                            <img src={player.image} className="w-6 h-6 rounded-full object-cover" />
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-black text-gray-800">{player.name}</span>
                                                                <span className={`text-[8px] px-1 rounded-full font-black ${player.gender === '女' ? 'bg-pink-50 text-pink-500 border border-pink-100' : 'bg-blue-50 text-blue-500 border border-blue-100'}`}>
                                                                    {player.gender === '女' ? '♀' : '♂'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                </td>
                                                <td className="px-6 py-4 text-center font-bold text-green-600">
                                                    {summaryData[player.id]?.gain || 0}
                                                </td>
                                                <td className="px-6 py-4 text-center font-bold text-red-600">
                                                    {summaryData[player.id]?.loss || 0}
                                                </td>
                                                <td className="px-6 py-4 text-center font-bold text-amber-600">
                                                    {summaryData[player.id]?.consumption || 0}
                                                </td>
                                                <td className="px-6 py-4 text-right font-black text-bvb-black bg-yellow-50/30">
                                                    <span className={`${displayValue >= 0 ? 'text-bvb-black' : 'text-red-500'}`}>
                                                        {displayValue > 0 && summaryViewMode === 'daily' ? '+' : ''}{displayValue}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    <tr className="bg-gray-50/50 font-black">
                                        <td className="px-6 py-4 sticky left-0 bg-gray-50/50 z-10">全员合计</td>
                                        <td className="px-6 py-4 text-center text-green-700">
                                            {travelingPlayerIds.reduce((sum, pid) => sum + (summaryData[pid]?.gain || 0), 0)}
                                        </td>
                                        <td className="px-6 py-4 text-center text-red-700">
                                            {travelingPlayerIds.reduce((sum, pid) => sum + (summaryData[pid]?.loss || 0), 0)}
                                        </td>
                                        <td className="px-6 py-4 text-center text-amber-700">
                                            {travelingPlayerIds.reduce((sum, pid) => sum + (summaryData[pid]?.consumption || 0), 0)}
                                        </td>
                                        <td className="px-6 py-4 text-right bg-bvb-yellow/10">
                                            {(() => {
                                                const totalNet = travelingPlayerIds.reduce((sum, pid) => {
                                                    const val = summaryViewMode === 'daily' 
                                                        ? ((summaryData[pid]?.gain || 0) - (summaryData[pid]?.loss || 0) - (summaryData[pid]?.consumption || 0))
                                                        : (playerPointsMap[pid] || 0);
                                                    return sum + val;
                                                }, 0);
                                                return (totalNet > 0 && summaryViewMode === 'daily' ? '+' : '') + totalNet;
                                            })()}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            )}

            {activeTab === 'history' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
                        <h4 className="font-black text-gray-800 text-sm flex items-center gap-2 uppercase italic tracking-tighter">
                            <ClipboardList className="w-4 h-4 text-bvb-yellow" /> 积分录入明细流水
                        </h4>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-gray-400 uppercase">日期筛选:</span>
                            <input 
                                type="date" 
                                value={selectedDate} 
                                onChange={e => setSelectedDate(e.target.value)}
                                className="text-xs font-bold p-1 border rounded-lg bg-white"
                            />
                        </div>
                    </div>
                    <div className="md:hidden divide-y divide-gray-50">
                        {dailyRecords.map(record => {
                            const player = players.find(p => p.id === record.playerId);
                            const item = pointItemDefinitions.find(i => i.id === record.itemId);
                            if (!player || !item) return null;
                            return (
                                <div key={record.id} className="p-4 space-y-2">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <img src={player.image} className="w-8 h-8 rounded-full object-cover" />
                                            <div>
                                                <p className="font-black text-gray-800 text-xs">{player.name}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase">#{player.number}</p>
                                            </div>
                                        </div>
                                        <span className={`font-black px-2.5 py-1 rounded-lg text-xs ${item.type === 'gain' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {item.type === 'gain' ? '+' : '-'}{record.points}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                                        <div className="flex items-center gap-2">
                                             <span className={`w-2 h-2 rounded-full ${item.type === 'gain' ? 'bg-green-500' : item.type === 'loss' ? 'bg-red-500' : 'bg-bvb-yellow'}`} />
                                             <span className="text-[11px] font-bold text-gray-700">{item.title}</span>
                                        </div>
                                        <button onClick={() => onDeletePointRecord(record.id)} className="p-1 px-2 bg-red-50 text-red-500 rounded text-[10px] font-black flex items-center gap-1">
                                            <Trash2 className="w-3 h-3" /> 删除
                                        </button>
                                    </div>
                                    <p className="text-[9px] text-gray-400 font-mono text-right">{record.date}</p>
                                </div>
                            );
                        })}
                        {dailyRecords.length === 0 && (
                            <div className="py-20 text-center">
                                <p className="text-[10px] font-black text-gray-300 uppercase italic tracking-widest italic font-black">该日无流水记录</p>
                            </div>
                        )}
                    </div>
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">球员</th>
                                    <th className="px-6 py-4">变动项目</th>
                                    <th className="px-6 py-4 text-center">分值</th>
                                    <th className="px-6 py-4 text-right">日期</th>
                                    <th className="px-6 py-4 text-right w-16">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {dailyRecords.map(record => {
                                    const player = players.find(p => p.id === record.playerId);
                                    const item = pointItemDefinitions.find(i => i.id === record.itemId);
                                    if (!player || !item) return null;
                                    return (
                                        <tr key={record.id} className="text-xs hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <img src={player.image} className="w-6 h-6 rounded-full object-cover" />
                                                    <span className="font-black text-gray-800">{player.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${item.type === 'gain' ? 'bg-green-500' : item.type === 'loss' ? 'bg-red-500' : 'bg-bvb-yellow'}`} />
                                                    <span className="font-bold text-gray-600">{item.title}</span>
                                                    <span className="text-[10px] text-gray-400 italic">({item.type === 'gain' ? '加分' : item.type === 'loss' ? '减分' : '消耗'})</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`font-black px-2 py-0.5 rounded-full text-[10px] ${item.type === 'gain' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                                    {item.type === 'gain' ? '+' : '-'}{record.points}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-gray-500">{record.date}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => onDeletePointRecord(record.id)} className="p-1.5 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-lg">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {dailyRecords.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-center py-24">
                                            <div className="flex flex-col items-center gap-2 text-gray-300">
                                                <RefreshCw className="w-8 h-8 opacity-20 animate-spin-slow" />
                                                <p className="text-[10px] font-black uppercase tracking-widest italic">该日无流水记录</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'items' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="bg-bvb-yellow w-1 h-8 rounded-full"></div>
                            <h3 className="font-black text-gray-800 uppercase italic tracking-tighter">分值项目配置管理</h3>
                        </div>
                        <button 
                            onClick={() => setIsAddingItem(true)}
                            className="bg-bvb-black text-bvb-yellow px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> 新增项目
                        </button>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { type: 'gain', title: '加分项配置', icon: TrendingUp, color: 'text-green-500' },
                            { type: 'loss', title: '减分项配置', icon: TrendingDown, color: 'text-red-500' },
                            { type: 'consumption', title: '消耗项配置', icon: Coins, color: 'text-bvb-yellow' }
                        ].map(section => (
                            <div key={section.type} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col min-h-[300px]">
                                <h4 className="font-black text-gray-800 text-sm mb-4 uppercase tracking-tighter flex justify-between items-center border-b border-gray-50 pb-2">
                                    <span>{section.title}</span>
                                    <section.icon className={`w-4 h-4 ${section.color}`} />
                                </h4>
                                <div className="space-y-2 flex-1 scrollbar-hide">
                                    {pointItemDefinitions.filter(i => i.type === section.type).map(item => (
                                        <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 group hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200">
                                            <div>
                                                <p className="text-xs font-black text-gray-800 uppercase tracking-tight italic">{item.title}</p>
                                                <p className="text-[10px] text-gray-400 font-black uppercase italic tracking-tighter">
                                                    {item.isVariable ? '不定值 (录入时输入)' : `${item.points} PTS`}
                                                </p>
                                            </div>
                                            <button onClick={() => onDeletePointItem(item.id)} className="p-1.5 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                    {pointItemDefinitions.filter(i => i.type === section.type).length === 0 && (
                                        <div className="flex-1 flex flex-col items-center justify-center text-gray-200 py-10">
                                            <Plus className="w-8 h-8 opacity-10" />
                                            <p className="text-[10px] font-black uppercase tracking-widest opacity-20 italic">暂无项</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isAddingItem && (
                <AddPointItemModal 
                    onClose={() => setIsAddingItem(false)} 
                    onAdd={(item) => {
                        onAddPointItem(item);
                        setIsAddingItem(false);
                    }} 
                />
            )}
        </div>
    );
};

const AddPointItemModal: React.FC<{ onClose: () => void, onAdd: (item: PointItemDefinition) => void }> = ({ onClose, onAdd }) => {
    const [title, setTitle] = useState('');
    const [points, setPoints] = useState(1);
    const [type, setType] = useState<PointChangeType>('gain');
    const [isVariable, setIsVariable] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (title.trim()) {
            onAdd({
                id: Math.random().toString(36).slice(2, 11),
                title,
                points: isVariable ? 0 : points,
                type,
                isVariable
            });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-bvb-black p-4 flex justify-between items-center text-white">
                    <h3 className="font-black text-sm uppercase italic flex items-center gap-2">
                        <Plus className="w-4 h-4 text-bvb-yellow" /> 新增积分管理项
                    </h3>
                    <button onClick={onClose}><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">项目名称</label>
                        <input 
                            required 
                            className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-bvb-yellow outline-none text-sm focus:bg-white transition-all" 
                            placeholder="如: 进球奖励, 迟到惩罚..." 
                            value={title} 
                            onChange={e => setTitle(e.target.value)} 
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">项目数值类型</label>
                            <div className="flex items-center gap-4 mt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" checked={!isVariable} onChange={() => setIsVariable(false)} className="accent-bvb-yellow" />
                                    <span className="text-xs font-bold text-gray-600">固定分值</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" checked={isVariable} onChange={() => setIsVariable(true)} className="accent-bvb-yellow" />
                                    <span className="text-xs font-bold text-gray-600">不定值</span>
                                </label>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">分值 (固定时有效)</label>
                            <input 
                                type="number" 
                                min="1"
                                disabled={isVariable}
                                required={!isVariable}
                                className={`w-full p-3.5 border rounded-xl font-bold outline-none text-sm transition-all ${isVariable ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed' : 'bg-gray-50 border-gray-200 focus:ring-2 focus:ring-bvb-yellow focus:bg-white'}`} 
                                value={points} 
                                onChange={e => setPoints(parseInt(e.target.value) || 0)} 
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">项目分类</label>
                        <select 
                            className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl font-bold bg-white text-sm outline-none focus:ring-2 focus:ring-bvb-yellow transition-all" 
                            value={type} 
                            onChange={e => setType(e.target.value as PointChangeType)}
                        >
                            <option value="gain">加分项目 (Gain)</option>
                            <option value="loss">减分项目 (Loss)</option>
                            <option value="consumption">积分消耗 (Expense)</option>
                        </select>
                    </div>
                    <div className="pt-4">
                        <button type="submit" className="w-full py-4 bg-bvb-black text-white font-black rounded-xl shadow-xl hover:bg-gray-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase italic text-sm tracking-widest">
                            <Save className="w-4 h-4 text-bvb-yellow" /> 保存项目配置
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
