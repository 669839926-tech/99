
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Match, Player, Team, MatchEvent, MatchEventType, User, MatchDetails, MatchPlan, MatchPlanRequirement, PointItemDefinition, PlayerPointRecord, PointChangeType } from '../types';
// Comment: Added 'Coins', 'TrendingDown', 'ListPlus' to the lucide-react imports
import { Calendar, MapPin, Trophy, Shield, Bot, X, Plus, Trash2, Edit2, FileText, CheckCircle, Save, Users as UsersIcon, Activity, Flag, Tag, Loader2, Clock, RefreshCw, ChevronLeft, TrendingUp, AlertCircle, Filter, UserMinus, ClipboardList, PenTool, Info, Coins, TrendingDown, ListPlus, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateMatchStrategy } from '../services/geminiService';

interface MatchPlannerProps {
  matches: Match[];
  players: Player[];
  teams: Team[];
  currentUser: User | null;
  onAddMatch: (match: Match) => void;
  onDeleteMatch: (id: string) => void;
  onUpdateMatch: (match: Match) => void;
  matchPlans: MatchPlan[];
  onAddMatchPlan: (plan: MatchPlan) => void;
  onUpdateMatchPlan: (plan: MatchPlan) => void;
  onDeleteMatchPlan: (id: string) => void;
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
}

type TabType = 'info' | 'lineup' | 'events' | 'report';
type ViewMode = 'matches' | 'plans' | 'points';

const MatchPlanner: React.FC<MatchPlannerProps> = ({ 
  matches, 
  players, 
  teams, 
  currentUser, 
  onAddMatch, 
  onDeleteMatch, 
  onUpdateMatch,
  matchPlans,
  onAddMatchPlan,
  onUpdateMatchPlan,
  onDeleteMatchPlan,
  pointItemDefinitions,
  onAddPointItem,
  onDeletePointItem,
  playerPointRecords,
  onAddPointRecord,
  onBulkAddPointRecords,
  onDeletePointRecord,
  travelingPlayerIds,
  onUpdateTravelingPlayers
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('matches');
  const [selectedMatchForAi, setSelectedMatchForAi] = useState<Match | null>(null);
  const [strategy, setStrategy] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  
  const [filterTeamId, setFilterTeamId] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [editingPlan, setEditingPlan] = useState<MatchPlan | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [showAddPointItemModal, setShowAddPointItemModal] = useState(false);

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
        setSaveStatus('saving');
        onUpdateMatch(editingMatch);
        setTimeout(() => setSaveStatus('saved'), 800);
    }, 3000); 
    return () => clearTimeout(timer);
  }, [editingMatch, onUpdateMatch]);

  const ensureDetails = (match: Match): Match => {
    const defaultDetails: MatchDetails = {
        weather: '晴朗',
        pitch: '天然草',
        lineup: [],
        substitutes: [],
        events: [],
        summary: ''
    };
    return {
        ...match,
        details: {
            ...defaultDetails,
            ...(match.details || {})
        }
    };
  };

  const startEditing = (match: Match) => {
    setEditingMatch(ensureDetails(match));
    setActiveTab('info');
  };

  const seasonStats = useMemo(() => {
      const completed = displayMatches.filter(m => m.status === 'Completed' && m.result);
      let wins = 0, draws = 0, losses = 0;
      
      completed.forEach(m => {
          const scores = m.result!.split('-').map(Number);
          if (scores[0] > scores[1]) wins++;
          else if (scores[0] < scores[1]) losses++;
          else draws++;
      });

      const total = wins + draws + losses;
      const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

      const sortedPlayers = [...displayPlayers].sort((a, b) => (b.goals || 0) - (a.goals || 0));
      const topScorer = sortedPlayers[0];

      return { wins, draws, losses, topScorer, winRate, total };
  }, [displayMatches, displayPlayers]);

  const [newMatchForm, setNewMatchForm] = useState<Partial<Match>>({
      teamId: availableTeams[0]?.id || '',
      opponent: '',
      date: new Date().toISOString().split('T')[0],
      time: '14:00',
      location: 'Home',
      competition: '联赛',
      status: 'Upcoming'
  });

  const handleAddSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(newMatchForm.opponent && newMatchForm.date && newMatchForm.teamId) {
          const match: Match = {
              id: Date.now().toString(),
              teamId: newMatchForm.teamId,
              title: newMatchForm.title || `${newMatchForm.competition} VS ${newMatchForm.opponent}`,
              opponent: newMatchForm.opponent,
              date: newMatchForm.date,
              time: newMatchForm.time || '10:00',
              location: newMatchForm.location as 'Home' | 'Away',
              competition: newMatchForm.competition || '友谊赛',
              status: 'Upcoming',
              result: '',
              details: {
                  weather: '晴朗',
                  pitch: '天然草',
                  lineup: [],
                  substitutes: [],
                  events: [],
                  summary: ''
              }
          };
          onAddMatch(match);
          setShowAddModal(false);
          setNewMatchForm({ teamId: availableTeams[0]?.id || '', opponent: '', date: new Date().toISOString().split('T')[0], time: '14:00', location: 'Home', competition: '联赛' });
      }
  };

  const [newEvent, setNewEvent] = useState<Partial<MatchEvent>>({ minute: 0, type: 'Goal', playerId: '' });

  const addEvent = () => {
      if (editingMatch && newEvent.playerId && newEvent.minute !== undefined) {
          const player = players.find(p => p.id === newEvent.playerId);
          const event: MatchEvent = {
              id: Date.now().toString(),
              minute: newEvent.minute,
              type: newEvent.type as MatchEventType,
              playerId: newEvent.playerId,
              playerName: player?.name || '未知球员',
              description: newEvent.description || ''
          };
          
          const currentMatch = ensureDetails(editingMatch);
          const updatedDetails = {
              ...currentMatch.details!,
              events: [...(currentMatch.details?.events || []), event]
          };
          
          setEditingMatch({ ...currentMatch, details: updatedDetails });
          setNewEvent({ minute: 0, type: 'Goal', playerId: '' });
      }
  };

  const removeEvent = (id: string) => {
      if (editingMatch) {
          const currentMatch = ensureDetails(editingMatch);
          const updatedEvents = currentMatch.details?.events.filter(e => e.id !== id) || [];
          setEditingMatch({ ...currentMatch, details: { ...currentMatch.details!, events: updatedEvents } });
      }
  };

  const toggleLineupPlayer = (playerId: string, isSub: boolean = false) => {
      if (!editingMatch) return;
      const currentMatch = ensureDetails(editingMatch);
      const details = currentMatch.details!;
      if (isSub) {
          const nextSubs = details.substitutes.includes(playerId) 
            ? details.substitutes.filter(id => id !== playerId)
            : [...details.substitutes, playerId];
          setEditingMatch({ ...currentMatch, details: { ...details, substitutes: nextSubs } });
      } else {
          const nextLineup = details.lineup.includes(playerId) 
            ? details.lineup.filter(id => id !== playerId)
            : [...details.lineup, playerId];
          setEditingMatch({ ...currentMatch, details: { ...details, lineup: nextLineup } });
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
                    onClick={() => setViewMode('plans')}
                    className={`text-[10px] md:text-xs font-black uppercase tracking-widest pb-1 transition-all border-b-2 ${viewMode === 'plans' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-400'}`}
                >
                    比赛计划
                </button>
                <button 
                    onClick={() => setViewMode('points')}
                    className={`text-[10px] md:text-xs font-black uppercase tracking-widest pb-1 transition-all border-b-2 ${viewMode === 'points' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-400'}`}
                >
                    积分管理
                </button>
            </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
            <div className="relative group flex-1 md:flex-none">
                <div className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 text-gray-400"><Filter className="w-3.5 h-3.5 md:w-4 md:h-4" /></div>
                <select value={filterTeamId} onChange={e => setFilterTeamId(e.target.value)} className="w-full md:w-48 pl-8 md:pl-10 pr-3 md:pr-4 py-2 md:py-2.5 bg-white border border-gray-200 rounded-xl text-xs md:text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-bvb-yellow shadow-sm transition-all">
                    {isDirector && <option value="all">所有梯队</option>}
                    {availableTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
            </div>
            <button 
                onClick={() => {
                    if (viewMode === 'matches') setShowAddModal(true);
                    else if (viewMode === 'plans') setShowAddPlanModal(true);
                    else setShowAddPointItemModal(true);
                }} 
                className="flex items-center px-4 md:px-6 py-2 md:py-2.5 bg-bvb-black text-white font-black rounded-xl shadow-xl hover:bg-gray-800 transition-all shrink-0 text-xs md:text-sm"
            >
                <Plus className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2 text-bvb-yellow" /> 新建
            </button>
        </div>
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
                        />
                      )) : <div className="bg-gray-100/50 border-2 border-dashed border-gray-200 rounded-3xl py-12 md:py-16 text-center text-gray-400 italic font-black uppercase text-xs md:text-sm tracking-widest">No match records found</div>}
                  </div>
              </div>
          </div>
        </>
      ) : viewMode === 'plans' ? (
        <div className="animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {matchPlans.filter(p => filterTeamId === 'all' || p.teamId === filterTeamId).map(plan => (
                    <div key={plan.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all group relative">
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingPlan(plan)} className="p-1.5 bg-gray-100 text-gray-400 hover:text-bvb-black rounded-lg"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => onDeleteMatchPlan(plan.id)} className="p-1.5 bg-gray-100 text-gray-400 hover:text-red-500 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="px-2 py-0.5 bg-bvb-yellow text-bvb-black text-[10px] font-black rounded uppercase italic tracking-tighter">{plan.seasonName}</span>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{plan.date}</span>
                        </div>
                        <h4 className="text-lg font-black text-gray-800 mb-1">{teams.find(t => t.id === plan.teamId)?.name} 外出比赛计划</h4>
                        <div className="flex items-center text-xs text-gray-500 mb-4 font-bold">
                            <MapPin className="w-3 h-3 mr-1 text-gray-400" /> {plan.location}
                        </div>
                        
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400 border-b pb-1">
                                <span>任务达成情况</span>
                                <span className="text-bvb-black">
                                    {(() => {
                                        const teamDone = plan.teamRequirements.filter(r => r.completed).length;
                                        const teamTotal = plan.teamRequirements.length;
                                        let playerDone = 0;
                                        let playerTotal = 0;
                                        Object.values(plan.playerRequirements).forEach(reqs => {
                                            playerDone += reqs.filter(r => r.completed).length;
                                            playerTotal += reqs.length;
                                        });
                                        const total = teamTotal + playerTotal;
                                        const done = teamDone + playerDone;
                                        return total > 0 ? `${Math.round((done / total) * 100)}%` : '0%';
                                    })()}
                                </span>
                            </div>
                            <div className="flex -space-x-2 overflow-hidden">
                                {plan.playerIds.slice(0, 5).map(pid => {
                                    const p = players.find(player => player.id === pid);
                                    return <img key={pid} src={p?.image} className="inline-block h-6 w-6 rounded-full ring-2 ring-white object-cover" />;
                                })}
                                {plan.playerIds.length > 5 && (
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[8px] font-black text-gray-400 ring-2 ring-white">
                                        +{plan.playerIds.length - 5}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => setEditingPlan(plan)}
                            className="w-full mt-5 py-2.5 bg-gray-50 text-gray-600 text-xs font-black rounded-xl hover:bg-bvb-yellow hover:text-bvb-black transition-all flex items-center justify-center gap-2"
                        >
                            <ClipboardList className="w-4 h-4" /> 查看详情与跟踪
                        </button>
                    </div>
                ))}
                {matchPlans.filter(p => filterTeamId === 'all' || p.teamId === filterTeamId).length === 0 && (
                    <div className="col-span-full py-20 text-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl">
                        <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-400 font-black uppercase italic tracking-widest text-sm">暂无比赛计划</p>
                        <button onClick={() => setShowAddPlanModal(true)} className="mt-4 text-xs font-black text-bvb-yellow bg-bvb-black px-6 py-2.5 rounded-xl shadow-lg hover:scale-105 transition-all uppercase tracking-widest">立即创建</button>
                    </div>
                )}
            </div>
        </div>
      ) : (
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
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full h-full md:h-auto md:max-w-xl rounded-none md:rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="bg-bvb-black p-4 md:p-6 flex justify-between items-center text-white shrink-0"><h3 className="font-black text-lg md:text-xl flex items-center uppercase italic"><Plus className="w-5 h-5 md:w-6 md:h-6 mr-2 text-bvb-yellow" /> 安排新赛程</h3><button onClick={() => setShowAddModal(false)}><X className="w-6 h-6" /></button></div>
            <form onSubmit={handleAddSubmit} className="p-6 md:p-8 space-y-4 md:space-y-6 overflow-y-auto flex-1 pb-24 md:pb-8">
                <div><label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 md:mb-1.5">所属梯队</label>
                    <select required className="w-full p-2.5 md:p-3.5 border rounded-2xl font-bold bg-white focus:ring-2 focus:ring-bvb-yellow outline-none text-xs md:text-sm" value={newMatchForm.teamId} onChange={e => setNewMatchForm({...newMatchForm, teamId: e.target.value})}>{availableTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                </div>
                <div><label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 md:mb-1.5">对手全称</label><input required className="w-full p-2.5 md:p-3.5 border rounded-2xl font-bold focus:ring-2 focus:ring-bvb-yellow outline-none text-xs md:text-sm" placeholder="输入对手梯队名称..." value={newMatchForm.opponent} onChange={e => setNewMatchForm({...newMatchForm, opponent: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div><label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 md:mb-1.5">日期</label><input type="date" required className="w-full p-2.5 md:p-3.5 border rounded-2xl font-bold text-xs md:text-sm" value={newMatchForm.date} onChange={e => setNewMatchForm({...newMatchForm, date: e.target.value})} /></div>
                    <div><label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 md:mb-1.5">开球时间</label><input type="time" required className="w-full p-2.5 md:p-3.5 border rounded-2xl font-bold text-xs md:text-sm" value={newMatchForm.time} onChange={e => setNewMatchForm({...newMatchForm, time: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div><label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 md:mb-1.5">主/客场</label>
                        <select className="w-full p-2.5 md:p-3.5 border rounded-2xl font-bold bg-white text-xs md:text-sm" value={newMatchForm.location} onChange={e => setNewMatchForm({...newMatchForm, location: e.target.value as any})}><option value="Home">主场</option><option value="Away">客场</option></select>
                    </div>
                    <div><label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 md:mb-1.5">赛事名称</label><input className="w-full p-2.5 md:p-3.5 border rounded-2xl font-bold focus:ring-2 focus:ring-bvb-yellow outline-none text-xs md:text-sm" placeholder="例如: 地区青少年联赛" value={newMatchForm.competition} onChange={e => setNewMatchForm({...newMatchForm, competition: e.target.value})} /></div>
                </div>
                <button type="submit" className="w-full py-4 md:py-5 bg-bvb-black text-white font-black rounded-2xl shadow-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2 uppercase italic tracking-widest text-xs md:text-sm"><Save className="w-4 h-4 md:w-5 md:h-5 text-bvb-yellow" /> Create Match Event</button>
            </form>
          </div>
        </div>
      )}

      {editingMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full h-full md:h-[90vh] md:max-w-4xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="bg-bvb-black p-3 md:p-4 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-2 md:gap-3">
                        <button 
                            onClick={() => {
                                if (editingMatch) onUpdateMatch(editingMatch);
                                setEditingMatch(null);
                            }} 
                            className="md:hidden"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h3 className="font-bold text-base md:text-lg leading-tight">比赛录入: VS {editingMatch.opponent}</h3>
                            <p className="text-[10px] md:text-xs text-gray-400 font-mono uppercase">{editingMatch.date} • {editingMatch.competition}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                         {saveStatus === 'saving' && <span className="text-[10px] md:text-xs text-bvb-yellow flex items-center"><RefreshCw className="w-3 h-3 mr-1 animate-spin"/> 同步中</span>}
                         {saveStatus === 'saved' && <span className="text-[10px] md:text-xs text-green-400 flex items-center bg-gray-800 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3 mr-1"/> 云端已存</span>}
                         <button 
                            onClick={() => {
                                if (editingMatch) onUpdateMatch(editingMatch);
                                setEditingMatch(null);
                            }} 
                            className="hidden md:block hover:bg-gray-800 p-1 rounded"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto no-scrollbar shrink-0">
                    {[
                        { id: 'info', label: '比分', icon: Activity },
                        { id: 'lineup', label: '阵容', icon: UsersIcon },
                        { id: 'events', label: '事件', icon: Tag },
                        { id: 'report', label: '总结', icon: ClipboardList }
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={`px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold flex items-center transition-all border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-bvb-yellow text-bvb-black bg-white' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            <tab.icon className={`w-3.5 h-3.5 md:w-4 h-4 mr-1.5 md:mr-2 ${activeTab === tab.id ? 'text-bvb-yellow' : ''}`} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar pb-24 md:pb-8">
                    {activeTab === 'info' && (
                        <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                                <div className="space-y-4 md:space-y-6">
                                    <h4 className="font-black text-gray-400 text-[9px] md:text-[10px] uppercase tracking-widest border-b pb-1.5 md:pb-2">核心比赛信息</h4>
                                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                                        <div><label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 block">比赛状态</label>
                                            <select className="w-full p-2.5 md:p-3 border rounded-xl font-bold bg-white text-xs md:text-sm focus:ring-2 focus:ring-bvb-yellow outline-none transition-all" value={editingMatch.status} onChange={e => setEditingMatch({...editingMatch, status: e.target.value as any})}>
                                                <option value="Upcoming">未开始</option><option value="Completed">已完赛</option><option value="Cancelled">已取消</option>
                                            </select>
                                        </div>
                                        <div><label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 block">最终比分</label>
                                            <input className="w-full p-2.5 md:p-3 border rounded-xl font-black text-center text-lg md:text-xl bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-bvb-yellow transition-all" placeholder="如: 3-1" value={editingMatch.result} onChange={e => setEditingMatch({...editingMatch, result: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                                        <div><label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 block">天气</label>
                                            <select 
                                                className="w-full p-2.5 md:p-3 border rounded-xl font-bold bg-white text-xs md:text-sm outline-none" 
                                                value={editingMatch.details?.weather || '晴朗'} 
                                                onChange={e => {
                                                    const current = ensureDetails(editingMatch);
                                                    setEditingMatch({...current, details: {...current.details!, weather: e.target.value}});
                                                }}
                                            >
                                                <option value="Sunny">晴朗</option><option value="Cloudy">多云</option><option value="Rainy">有雨</option><option value="Snow">雪天</option><option value="Windy">大风</option>
                                            </select>
                                        </div>
                                        <div><label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 block">场地</label>
                                            <select 
                                                className="w-full p-2.5 md:p-3 border rounded-xl font-bold bg-white text-xs md:text-sm outline-none" 
                                                value={editingMatch.details?.pitch || '天然草'} 
                                                onChange={e => {
                                                    const current = ensureDetails(editingMatch);
                                                    setEditingMatch({...current, details: {...current.details!, pitch: e.target.value}});
                                                }}
                                            >
                                                <option value="Natural Grass">天然草</option><option value="Artificial Turf">人造草</option><option value="Indoor">室内场</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4 md:space-y-6">
                                    <h4 className="font-black text-gray-400 text-[9px] md:text-[10px] uppercase tracking-widest border-b pb-1.5 md:pb-2">赛程时间与地点</h4>
                                    <div><label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 block">比赛名称</label><input className="w-full p-2.5 md:p-3 border rounded-xl font-bold text-xs md:text-sm" value={editingMatch.title} onChange={e => setEditingMatch({...editingMatch, title: e.target.value})} /></div>
                                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                                        <div><label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 block">日期</label><input type="date" className="w-full p-2.5 md:p-3 border rounded-xl font-bold text-xs md:text-sm" value={editingMatch.date} onChange={e => setEditingMatch({...editingMatch, date: e.target.value})} /></div>
                                        <div><label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 block">开球时间</label><input type="time" className="w-full p-2.5 md:p-3 border rounded-xl font-bold text-xs md:text-sm" value={editingMatch.time} onChange={e => setEditingMatch({...editingMatch, time: e.target.value})} /></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'lineup' && (
                        <div className="animate-in fade-in duration-300 space-y-4 md:space-y-6">
                            <div className="bg-yellow-50 p-3 md:p-4 rounded-xl border border-yellow-100 flex items-center gap-2 md:gap-3">
                                <Info className="w-4 h-4 md:w-5 md:h-5 text-yellow-600 shrink-0" />
                                <p className="text-[10px] md:text-xs text-yellow-800 font-bold">请选拔出场球员及替补。已选中球员将记入个人“出场次数”统计。</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                                <div className="space-y-3 md:space-y-4">
                                    <h4 className="font-black text-[10px] md:text-xs text-gray-800 flex items-center uppercase tracking-widest"><CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2 text-green-500" /> 首发名单 ({editingMatch.details?.lineup.length})</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {players.filter(p => p.teamId === editingMatch.teamId).map(p => {
                                            const isSelected = editingMatch.details?.lineup.includes(p.id);
                                            return (
                                                <button key={p.id} onClick={() => toggleLineupPlayer(p.id)} className={`p-2 md:p-3 rounded-xl border-2 flex items-center gap-2 md:gap-3 transition-all ${isSelected ? 'bg-bvb-black text-bvb-yellow border-bvb-black shadow-lg' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}>
                                                    <img src={p.image} className="w-5 h-5 md:w-6 md:h-6 rounded-full object-cover shrink-0" /><span className="text-[10px] md:text-xs font-bold truncate">{p.name}</span>
                                                    {isSelected ? <UserMinus className="w-3 h-3 md:w-4 md:h-4 ml-auto opacity-40" /> : <Plus className="w-3 h-3 md:w-4 md:h-4 ml-auto" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="space-y-3 md:space-y-4">
                                    <h4 className="font-black text-[10px] md:text-xs text-gray-800 flex items-center uppercase tracking-widest"><Clock className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2 text-blue-500" /> 替补名单 ({editingMatch.details?.substitutes.length})</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {players.filter(p => p.teamId === editingMatch.teamId).map(p => {
                                            const isSelected = editingMatch.details?.substitutes.includes(p.id);
                                            return (
                                                <button key={p.id} onClick={() => toggleLineupPlayer(p.id, true)} className={`p-2 md:p-3 rounded-xl border-2 flex items-center gap-2 md:gap-3 transition-all ${isSelected ? 'bg-gray-800 text-white border-gray-800 shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}>
                                                    <img src={p.image} className="w-5 h-5 md:w-6 md:h-6 rounded-full object-cover shrink-0" /><span className="text-[10px] md:text-xs font-bold truncate">{p.name}</span>
                                                    {isSelected ? <UserMinus className="w-3 h-3 md:w-4 md:h-4 ml-auto opacity-40" /> : <Plus className="w-3 h-3 md:w-4 md:h-4 ml-auto" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'events' && (
                        <div className="animate-in fade-in duration-300 space-y-4 md:space-y-6">
                            <div className="bg-gray-50 p-4 md:p-6 rounded-2xl border border-gray-200">
                                <h4 className="font-bold text-sm md:text-base text-gray-800 mb-3 md:mb-4 flex items-center"><Plus className="w-4 h-4 mr-2 text-bvb-yellow" /> 新增关键事件</h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4 items-end">
                                    <div><label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 block">球员</label>
                                        <select className="w-full p-2 md:p-2.5 border rounded-xl text-[11px] md:text-sm font-bold bg-white" value={newEvent.playerId} onChange={e => setNewEvent({...newEvent, playerId: e.target.value})}>
                                            <option value="">选择球员...</option>
                                            {players.filter(p => p.teamId === editingMatch.teamId).filter(p => editingMatch.details?.lineup.includes(p.id) || editingMatch.details?.substitutes.includes(p.id)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div><label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 block">类型</label>
                                        <select className="w-full p-2 md:p-2.5 border rounded-xl text-[11px] md:text-sm font-bold bg-white" value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value as any})}>
                                            <option value="Goal">进球 (Goal)</option><option value="Assist">助攻 (Assist)</option><option value="YellowCard">黄牌 (Yellow)</option><option value="RedCard">红牌 (Red)</option><option value="Sub">换人 (Sub)</option>
                                        </select>
                                    </div>
                                    <div><label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 block">时间 (分)</label><input type="number" className="w-full p-2 md:p-2.5 border rounded-xl font-bold text-xs md:text-sm" value={newEvent.minute} onChange={e => setNewEvent({...newEvent, minute: parseInt(e.target.value) || 0})} /></div>
                                    <button onClick={addEvent} disabled={!newEvent.playerId} className="bg-bvb-black text-white font-black py-2.5 rounded-xl hover:bg-gray-800 disabled:opacity-50 text-xs md:text-sm">添加</button>
                                </div>
                            </div>
                            <div className="space-y-2 md:space-y-3">
                                <h4 className="font-black text-[10px] md:text-xs text-gray-400 uppercase tracking-widest px-1">本场事件流</h4>
                                {editingMatch.details?.events.length === 0 ? (
                                    <div className="py-12 md:py-20 text-center text-[11px] md:text-sm text-gray-300 italic border-2 border-dashed border-gray-100 rounded-2xl">暂无记录</div>
                                ) : (
                                    <div className="space-y-2">
                                        {[...(editingMatch.details?.events || [])].sort((a,b) => a.minute - b.minute).map(event => (
                                            <div key={event.id} className="bg-white border border-gray-100 p-3 md:p-4 rounded-xl flex items-center justify-between group shadow-sm">
                                                <div className="flex items-center gap-3 md:gap-4">
                                                    <span className="w-8 h-8 md:w-10 md:h-10 bg-gray-50 rounded-lg flex items-center justify-center font-mono font-black text-gray-400 text-xs md:text-sm">{event.minute}'</span>
                                                    <div className={`p-1.5 md:p-2 rounded-lg ${event.type === 'Goal' ? 'bg-green-50 text-green-600' : event.type === 'YellowCard' ? 'bg-yellow-50 text-yellow-600' : event.type === 'RedCard' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                                        {event.type === 'Goal' ? <Trophy className="w-3.5 h-3.5 md:w-4 md:h-4" /> : event.type === 'YellowCard' ? <Flag className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Activity className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-800 text-xs md:text-sm">{event.playerName}</p>
                                                        <p className="text-[8px] md:text-[10px] text-gray-400 font-black uppercase">{event.type === 'Goal' ? '进球' : event.type === 'Assist' ? '助攻' : event.type === 'YellowCard' ? '黄牌' : '事件'}</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => removeEvent(event.id)} className="p-2 text-gray-300 hover:text-red-500 md:opacity-0 group-hover:opacity-100 transition-all">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'report' && (
                        <div className="space-y-4 md:space-y-6 animate-in fade-in duration-300">
                            <div className="space-y-3 md:space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-bold text-sm md:text-base text-gray-800 flex items-center"><PenTool className="w-4 h-4 mr-2 text-bvb-yellow" /> 教练赛后复盘</h4>
                                    <button onClick={() => handleGenerateStrategy(editingMatch)} className="text-[10px] md:text-xs bg-white border border-gray-300 px-2 md:px-3 py-1 md:py-1.5 rounded-lg font-bold flex items-center hover:bg-yellow-50 transition-colors"><Bot className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1 md:mr-1.5 text-bvb-yellow" /> AI 建议</button>
                                </div>
                                <textarea 
                                    key={`summary-${editingMatch.id}`}
                                    className="w-full h-48 md:h-64 p-3 md:p-5 border rounded-2xl focus:ring-2 focus:ring-bvb-yellow outline-none text-xs md:text-sm leading-relaxed bg-gray-50 focus:bg-white transition-all shadow-inner" 
                                    placeholder="详细记录本场表现及个人球员点评..." 
                                    value={editingMatch.details?.summary || ''} 
                                    onChange={e => {
                                        const val = e.target.value;
                                        setEditingMatch(prev => {
                                            if (!prev) return prev;
                                            const withDetails = ensureDetails(prev);
                                            return {
                                                ...withDetails,
                                                details: {
                                                    ...withDetails.details!,
                                                    summary: val
                                                }
                                            };
                                        });
                                    }} 
                                />
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="bg-gray-50 p-3 md:p-4 border-t flex justify-end shrink-0 hidden md:flex">
                    <button 
                        onClick={() => {
                            if (editingMatch) {
                                onUpdateMatch(editingMatch);
                            }
                            setEditingMatch(null);
                        }} 
                        className="px-6 md:px-10 py-2.5 md:py-3 bg-bvb-black text-white font-black rounded-xl shadow-xl hover:bg-gray-800 transition-all uppercase italic text-xs md:text-sm"
                    >
                        确认并退出
                    </button>
                </div>
            </div>
        </div>
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

      {(showAddPlanModal || editingPlan) && (
          <MatchPlanModal 
            plan={editingPlan} 
            teams={availableTeams} 
            players={players} 
            onClose={() => { setShowAddPlanModal(false); setEditingPlan(null); }} 
            onSave={(plan) => {
                if (editingPlan) {
                    onUpdateMatchPlan(plan);
                } else {
                    onAddMatchPlan(plan);
                }
                setShowAddPlanModal(false);
                setEditingPlan(null);
            }}
          />
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
    </div>
  );
};

interface MatchPlanModalProps {
    plan: MatchPlan | null;
    teams: Team[];
    players: Player[];
    onClose: () => void;
    onSave: (plan: MatchPlan) => void;
}

const MatchPlanModal: React.FC<MatchPlanModalProps> = ({ plan, teams, players, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<MatchPlan>>(plan || {
        teamId: teams[0]?.id || '',
        seasonName: '',
        location: '',
        date: new Date().toISOString().split('T')[0],
        playerIds: [],
        teamRequirements: [],
        playerRequirements: {},
        status: 'Draft',
        createdAt: new Date().toISOString()
    });

    const [activeTab, setActiveTab] = useState<'info' | 'tracking'>('info');
    const [newTeamReq, setNewTeamReq] = useState('');
    const [newPlayerReqs, setNewPlayerReqs] = useState<Record<string, string>>({});

    const teamPlayers = useMemo(() => players.filter(p => p.teamId === formData.teamId), [players, formData.teamId]);

    const handleSave = useCallback(() => {
        if (formData.teamId && formData.seasonName && formData.location && formData.date) {
            onSave({
                ...formData,
                id: formData.id || Math.random().toString(36).slice(2, 11),
                teamId: formData.teamId!,
                seasonName: formData.seasonName!,
                location: formData.location!,
                date: formData.date!,
                playerIds: formData.playerIds || [],
                teamRequirements: formData.teamRequirements || [],
                playerRequirements: formData.playerRequirements || {},
                status: formData.status || 'Draft',
                createdAt: formData.createdAt || new Date().toISOString()
            } as MatchPlan);
        }
    }, [formData, onSave]);

    const handleAddTeamReq = useCallback(() => {
        if (newTeamReq.trim()) {
            const newReq: MatchPlanRequirement = { id: Math.random().toString(36).slice(2, 11), text: newTeamReq.trim(), completed: false };
            setFormData(prev => ({ ...prev, teamRequirements: [...(prev.teamRequirements || []), newReq] }));
            setNewTeamReq('');
        }
    }, [newTeamReq]);

    const handleAddPlayerReq = useCallback((playerId: string) => {
        const text = newPlayerReqs[playerId];
        if (text && text.trim()) {
            const newReq: MatchPlanRequirement = { id: Math.random().toString(36).slice(2, 11), text: text.trim(), completed: false };
            setFormData(prev => {
                const current = prev.playerRequirements || {};
                const playerReqs = current[playerId] || [];
                return { ...prev, playerRequirements: { ...current, [playerId]: [...playerReqs, newReq] } };
            });
            setNewPlayerReqs(prev => ({ ...prev, [playerId]: '' }));
        }
    }, [newPlayerReqs]);

    const toggleRequirement = useCallback((type: 'team' | 'player', reqId: string, playerId?: string) => {
        setFormData(prev => {
            if (type === 'team') {
                return {
                    ...prev,
                    teamRequirements: prev.teamRequirements?.map(r => r.id === reqId ? { ...r, completed: !r.completed } : r)
                };
            } else if (playerId) {
                const current = prev.playerRequirements || {};
                const playerReqs = current[playerId] || [];
                return {
                    ...prev,
                    playerRequirements: {
                        ...current,
                        [playerId]: playerReqs.map(r => r.id === reqId ? { ...r, completed: !r.completed } : r)
                    }
                };
            }
            return prev;
        });
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full h-full md:h-[90vh] md:max-w-5xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-bvb-black p-4 md:p-6 flex justify-between items-center text-white shrink-0">
                    <h3 className="font-black text-lg md:text-xl flex items-center uppercase italic tracking-tighter">
                        <ClipboardList className="w-5 h-5 md:w-6 md:h-6 mr-2 text-bvb-yellow" /> 
                        {plan ? '管理比赛计划' : '新建比赛计划'}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded-lg transition-colors"><X className="w-6 h-6" /></button>
                </div>

                <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto no-scrollbar shrink-0">
                    <button onClick={() => setActiveTab('info')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest flex items-center transition-all border-b-2 ${activeTab === 'info' ? 'border-bvb-yellow text-bvb-black bg-white' : 'border-transparent text-gray-400'}`}><Info className="w-4 h-4 mr-2" /> 基本信息</button>
                    <button onClick={() => setActiveTab('tracking')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest flex items-center transition-all border-b-2 ${activeTab === 'tracking' ? 'border-bvb-yellow text-bvb-black bg-white' : 'border-transparent text-gray-400'}`}><Activity className="w-4 h-4 mr-2" /> 任务跟踪与评估</button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar pb-24 md:pb-8">
                    {activeTab === 'info' ? (
                        <div className="grid md:grid-cols-2 gap-8 animate-in fade-in duration-300">
                            <div className="space-y-6">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b pb-2">计划详情</h4>
                                <div className="space-y-4">
                                    <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">所属梯队</label>
                                        <select className="w-full p-3 border rounded-2xl font-bold bg-white text-sm" value={formData.teamId} onChange={e => setFormData({...formData, teamId: e.target.value})}>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                                    </div>
                                    <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">赛季名称</label><input className="w-full p-3 border rounded-2xl font-bold text-sm" placeholder="如: 2024春季联赛" value={formData.seasonName} onChange={e => setFormData({...formData, seasonName: e.target.value})} /></div>
                                    <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">比赛地点</label><input className="w-full p-3 border rounded-2xl font-bold text-sm" placeholder="输入详细地点..." value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} /></div>
                                    <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">计划日期</label><input type="date" className="w-full p-3 border rounded-2xl font-bold text-sm" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b pb-2">参赛球员名单 ({formData.playerIds?.length || 0})</h4>
                                <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {teamPlayers.map(p => {
                                        const isSelected = formData.playerIds?.includes(p.id);
                                        return (
                                            <button key={p.id} onClick={() => {
                                                const current = formData.playerIds || [];
                                                const next = isSelected ? current.filter(id => id !== p.id) : [...current, p.id];
                                                setFormData({...formData, playerIds: next});
                                            }} className={`p-2.5 rounded-xl border-2 flex items-center gap-2 transition-all ${isSelected ? 'bg-bvb-black text-bvb-yellow border-bvb-black' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'}`}>
                                                <img src={p.image} className="w-6 h-6 rounded-full object-cover" /><span className="text-xs font-bold truncate">{p.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-3 gap-8 animate-in fade-in duration-300">
                            <div className="md:col-span-1 space-y-6">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b pb-2">团队要求</h4>
                                <div className="space-y-4">
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            value={newTeamReq} 
                                            onChange={e => setNewTeamReq(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleAddTeamReq()}
                                            placeholder="输入新的团队战术要求..."
                                            className="flex-1 p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-bvb-yellow shadow-sm transition-all"
                                        />
                                        <button 
                                            onClick={handleAddTeamReq}
                                            disabled={!newTeamReq.trim()}
                                            className="p-2.5 bg-bvb-black text-bvb-yellow rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-all shadow-md"
                                        >
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {formData.teamRequirements?.map(req => (
                                            <div key={req.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 group">
                                                <button onClick={() => toggleRequirement('team', req.id)} className={`p-1 rounded-full transition-colors ${req.completed ? 'bg-green-500 text-white' : 'bg-white text-gray-200 border border-gray-200'}`}><CheckCircle className="w-4 h-4" /></button>
                                                <span className={`text-xs font-bold flex-1 ${req.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{req.text}</span>
                                                <button onClick={() => setFormData(prev => ({ ...prev, teamRequirements: prev.teamRequirements?.filter(r => r.id !== req.id) }))} className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                                            </div>
                                        ))}
                                        {formData.teamRequirements?.length === 0 && (
                                            <div className="text-center py-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-100">
                                                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic font-black">暂无团队要求</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="md:col-span-2 space-y-6">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b pb-2">球员个人要求跟踪</h4>
                                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                    {formData.playerIds?.map(pid => {
                                        const p = players.find(player => player.id === pid);
                                        const playerReqs = formData.playerRequirements?.[pid] || [];
                                        return (
                                            <div key={pid} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                                <div className="flex justify-between items-center mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <img src={p?.image} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                                                        <div>
                                                            <h5 className="font-black text-gray-800 text-sm">{p?.name}</h5>
                                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                                                任务进度: {playerReqs.length > 0 ? `${Math.round((playerReqs.filter(r => r.completed).length / playerReqs.length) * 100)}%` : '0%'}
                                                                <span className="ml-2 text-bvb-yellow">({playerReqs.filter(r => r.completed).length}/{playerReqs.length})</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-2 mt-4">
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="text" 
                                                            value={newPlayerReqs[pid] || ''} 
                                                            onChange={e => setNewPlayerReqs(prev => ({...prev, [pid]: e.target.value}))}
                                                            onKeyDown={e => e.key === 'Enter' && handleAddPlayerReq(pid)}
                                                            placeholder="输入个人任务..."
                                                            className="flex-1 p-2 bg-white border border-gray-200 rounded-lg text-[10px] font-bold outline-none focus:ring-1 focus:ring-bvb-yellow"
                                                        />
                                                        <button 
                                                            onClick={() => handleAddPlayerReq(pid)}
                                                            disabled={!(newPlayerReqs[pid] || '').trim()}
                                                            className="p-2 bg-bvb-black text-bvb-yellow rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-all font-black"
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                    <div className="space-y-1.5 flex flex-col gap-1.5 mt-2">
                                                        {playerReqs.map(req => (
                                                            <div key={req.id} className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-gray-100 group shadow-sm transition-all hover:border-gray-200">
                                                                <button onClick={() => toggleRequirement('player', req.id, pid)} className={`p-0.5 rounded-full transition-colors ${req.completed ? 'bg-green-500 text-white' : 'bg-white text-gray-200 border border-gray-200'}`}>
                                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                                </button>
                                                                <span className={`text-[11px] font-bold flex-1 ${req.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{req.text}</span>
                                                                <button 
                                                                    onClick={() => setFormData(prev => {
                                                                        const current = prev.playerRequirements || {};
                                                                        const reqs = current[pid] || [];
                                                                        return { ...prev, playerRequirements: { ...current, [pid]: reqs.filter(r => r.id !== req.id) } };
                                                                    })} 
                                                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all"
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                        {playerReqs.length === 0 && (
                                                            <p className="text-center text-[10px] text-gray-300 italic py-2 bg-white/50 rounded-lg border border-dashed border-gray-100">暂无个人任务要求</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {(!formData.playerIds || formData.playerIds.length === 0) && (
                                        <div className="py-20 text-center bg-gray-50 border-2 border-dashed border-gray-100 rounded-2xl">
                                            <UserMinus className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                                            <p className="text-gray-400 text-xs font-black uppercase tracking-widest italic">请先在“基本信息”中选择参赛球员</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-gray-50 p-4 md:p-6 border-t flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">状态:</span>
                        <select className="bg-white border rounded-lg px-3 py-1.5 text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-bvb-yellow" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                            <option value="Draft">草稿</option>
                            <option value="Active">执行中</option>
                            <option value="Completed">已归档</option>
                        </select>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-6 py-3 text-gray-500 font-black text-xs uppercase tracking-widest hover:text-gray-800">取消</button>
                        <button onClick={handleSave} className="px-10 py-3 bg-bvb-black text-white font-black rounded-xl shadow-xl hover:bg-gray-800 transition-all uppercase italic text-xs tracking-widest flex items-center gap-2"><Save className="w-4 h-4 text-bvb-yellow" /> 保存计划</button>
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
}

const MatchCard: React.FC<MatchCardProps> = ({ match, teams, onDeleteMatch, startEditing, handleGenerateStrategy }) => {
    const team = teams.find(t => t.id === match.teamId);
    
    const getLocationLabel = (loc: string) => loc === 'Home' ? '主场' : '客场';
    const getFullAddress = (m: Match) => {
        if (m.location === 'Home') return '俱乐部主球场';
        const parts = [m.province, m.city, m.district].filter(Boolean);
        return parts.length > 0 ? parts.join(' - ') : (m.city || '客场');
    };

    return (
        <div className={`bg-white rounded-xl shadow-sm border-l-4 p-3 md:p-5 transition-all hover:shadow-md relative group ${match.status === 'Completed' ? (
            match.result && match.result.split('-')[0] > match.result.split('-')[1] ? 'border-green-500' : 
            match.result && match.result.split('-')[0] < match.result.split('-')[1] ? 'border-red-500' : 'border-yellow-500'
        ) : 'border-gray-300'}`}>
            <div className="absolute top-2.5 md:top-3 right-2.5 md:right-3 flex gap-1.5 md:gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); onDeleteMatch(match.id); }} className="p-1 md:p-1.5 bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-500 rounded"><Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
                <button onClick={(e) => { e.stopPropagation(); startEditing(match); }} className="p-1 md:p-1.5 bg-gray-100 hover:bg-yellow-50 text-gray-400 hover:text-bvb-black rounded">
                    {match.status === 'Completed' ? <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                </button>
            </div>
            <div className="flex justify-between items-center mb-1.5 md:mb-2">
                <span className="text-[9px] md:text-[10px] font-black uppercase text-gray-400 flex items-center tracking-widest"><Calendar className="w-2.5 h-2.5 md:w-3 md:h-3 mr-1 md:mr-1.5 text-bvb-yellow" /> {match.date} • {match.time}</span>
                <div className="flex items-center gap-1.5 md:gap-2 pr-10 md:pr-0">
                    <span className="text-[8px] md:text-[10px] bg-gray-100 text-gray-500 font-bold px-1.5 rounded border border-gray-200">{team?.level}</span>
                    <span className={`px-1.5 py-0.5 text-[8px] md:text-[10px] font-black rounded uppercase tracking-tighter ${match.location === 'Home' ? 'bg-bvb-yellow text-bvb-black' : 'bg-gray-200 text-gray-600'}`}>{getLocationLabel(match.location)}</span>
                </div>
            </div>
            <div className="flex justify-between items-end">
                <div>
                    {match.title && <h4 className="text-[8px] md:text-[10px] font-bold text-gray-400 mb-0.5 uppercase truncate max-w-[150px] md:max-w-none">{match.title}</h4>}
                    <h3 className="text-base md:text-xl font-black text-gray-900 flex items-center">VS {match.opponent}</h3>
                    <div className="text-[10px] md:text-xs text-gray-500 mt-1 md:mt-1.5 flex items-center font-bold">
                         <MapPin className="w-2.5 h-2.5 md:w-3 md:h-3 mr-1 text-gray-400" /> {getFullAddress(match)}
                    </div>
                </div>
                {match.status === 'Completed' ? (
                    <div className="text-xl md:text-3xl font-black text-bvb-black bg-gray-100 px-3 md:px-4 py-1 md:py-1.5 rounded-xl border border-gray-200 tabular-nums leading-none">{match.result || '-:-'}</div>
                ) : (
                    <div className="flex flex-col items-end gap-1.5 md:gap-2">
                         <button onClick={() => startEditing(match)} className="text-[9px] md:text-[10px] font-black flex items-center bg-bvb-yellow text-bvb-black px-2 md:px-3 py-1 md:py-1.5 rounded-lg shadow-sm hover:brightness-105 active:scale-95 transition-all">录入赛果 <PenTool className="w-2.5 h-2.5 md:w-3 md:h-3 ml-1 md:ml-1.5" /></button>
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
            if (travelingPlayerIds.includes(r.playerId) && data[r.playerId]) {
                const item = pointItemDefinitions.find(i => i.id === r.itemId);
                if (item) {
                   data[r.playerId][item.type] += Number(r.points);
                }
            }
        });
        return data;
    }, [playerPointRecords, pointItemDefinitions, travelingPlayerIds]);

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
                                                                    <p className={`text-[11px] font-black leading-tight ${selectedPlayerIds.includes(player.id) ? 'text-white' : 'text-gray-800'}`}>{player.name}</p>
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
                        <div className="bg-gray-50 p-4 border-b border-gray-100">
                            <h4 className="font-black text-gray-800 text-sm flex items-center gap-2 uppercase italic tracking-tighter">
                                <Trophy className="w-4 h-4 text-bvb-yellow" /> 积分统计概览 (按出行球员)
                            </h4>
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
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">当前总分</p>
                                            <p className={`text-lg font-black leading-none ${(playerPointsMap[player.id] || 0) >= 0 ? 'text-bvb-black' : 'text-red-500'}`}>
                                                {playerPointsMap[player.id] || 0}
                                            </p>
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
                                        <th className="px-6 py-4 text-right font-black text-bvb-black bg-yellow-50 w-24">当前总积分</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {travelingPlayers.map(player => (
                                        <tr key={player.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 sticky left-0 bg-white z-10">
                                                <div className="flex items-center gap-2">
                                                    <img src={player.image} className="w-6 h-6 rounded-full object-cover" />
                                                    <span className="font-black text-gray-800">{player.name}</span>
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
                                                <span className={`${(playerPointsMap[player.id] || 0) >= 0 ? 'text-bvb-black' : 'text-red-500'}`}>
                                                    {playerPointsMap[player.id] || 0}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
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
                                            {travelingPlayerIds.reduce((sum, pid) => sum + (playerPointsMap[pid] || 0), 0)}
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
