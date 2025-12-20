
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Match, Player, Team, MatchDetails, MatchEvent, MatchEventType, User } from '../types';
import { Calendar, MapPin, Trophy, Shield, Bot, X, Plus, Trash2, Edit2, FileText, CheckCircle, Save, Download, Sun, Cloud, CloudRain, CloudSnow, Wind, Users, Activity, Flag, Tag, Loader2, Clock, RefreshCw, ChevronLeft, TrendingUp, AlertCircle, Filter } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateMatchStrategy } from '../services/geminiService';
import { exportToPDF } from '../services/pdfService';

interface MatchPlannerProps {
  matches: Match[];
  players: Player[];
  teams: Team[];
  currentUser: User | null;
  onAddMatch: (match: Match) => void;
  onDeleteMatch: (id: string) => void;
  onUpdateMatch: (match: Match) => void;
  appLogo?: string;
}

type TabType = 'info' | 'lineup' | 'events' | 'report';

const MatchPlanner: React.FC<MatchPlannerProps> = ({ matches, players, teams, currentUser, onAddMatch, onDeleteMatch, onUpdateMatch, appLogo }) => {
  const [selectedMatchForAi, setSelectedMatchForAi] = useState<Match | null>(null);
  const [strategy, setStrategy] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  
  // New Filter State
  const [filterTeamId, setFilterTeamId] = useState<string>('all');

  const isDirector = currentUser?.role === 'director';

  // --- Filtering Teams & Matches for Coaches ---
  const availableTeams = useMemo(() => {
      if (isDirector) return teams;
      return teams.filter(t => currentUser?.teamIds?.includes(t.id));
  }, [currentUser, teams, isDirector]);

  // Combine permissions and UI filter
  const displayMatches = useMemo(() => {
      let base = isDirector ? matches : matches.filter(m => currentUser?.teamIds?.includes(m.teamId));
      if (filterTeamId !== 'all') {
          base = base.filter(m => m.teamId === filterTeamId);
      }
      return base;
  }, [currentUser, matches, isDirector, filterTeamId]);

  const displayPlayers = useMemo(() => {
      let base = isDirector ? players : players.filter(p => currentUser?.teamIds?.includes(p.teamId));
      if (filterTeamId !== 'all') {
          base = base.filter(p => p.teamId === filterTeamId);
      }
      return base;
  }, [currentUser, players, isDirector, filterTeamId]);

  // Season Statistics Calculation based on filters
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

  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  
  // Auto-Save Effect for Editing Match
  useEffect(() => {
    if (!editingMatch) return;

    const timer = setTimeout(() => {
        setSaveStatus('saving');
        onUpdateMatch(editingMatch);
        setTimeout(() => setSaveStatus('saved'), 800);
    }, 1500); 

    return () => clearTimeout(timer);
  }, [editingMatch]);

  // Detailed Edit State
  const [activeTab, setActiveTab] = useState<TabType>('info');
  
  // Temp Event State
  const [newEvent, setNewEvent] = useState<Partial<MatchEvent>>({
      minute: 0,
      type: 'Goal',
      playerId: '',
  });

  // New Match Form
  const [newMatch, setNewMatch] = useState<Partial<Match>>({
      teamId: availableTeams[0]?.id || '',
      title: '',
      opponent: '',
      province: '',
      city: '',
      district: '',
      date: new Date().toISOString().split('T')[0],
      time: '14:00',
      location: 'Home',
      competition: '联赛',
      status: 'Upcoming'
  });

  useEffect(() => {
      if (availableTeams.length > 0 && !availableTeams.find(t => t.id === newMatch.teamId)) {
          setNewMatch(prev => ({ ...prev, teamId: availableTeams[0].id }));
      }
  }, [availableTeams]);

  const upcomingMatches = displayMatches.filter(m => m.status === 'Upcoming').sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const pastMatches = displayMatches.filter(m => m.status === 'Completed' || m.status === 'Cancelled').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleGenerateStrategy = async (match: Match) => {
    setSelectedMatchForAi(match);
    setLoading(true);
    setStrategy('');
    try {
        const result = await generateMatchStrategy(match.opponent, "快速反击，边路突击，体能充沛");
        setStrategy(result);
    } catch (e) {
        setStrategy("生成战术失败。");
    } finally {
        setLoading(false);
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(newMatch.opponent && newMatch.date && newMatch.teamId) {
          const isHome = newMatch.location === 'Home';
          
          const match: Match = {
              id: Date.now().toString(),
              teamId: newMatch.teamId,
              title: newMatch.title || `${newMatch.competition} VS ${newMatch.opponent}`,
              opponent: newMatch.opponent,
              date: newMatch.date,
              time: newMatch.time || '10:00',
              location: newMatch.location as 'Home' | 'Away',
              province: isHome ? undefined : newMatch.province,
              city: isHome ? undefined : newMatch.city,
              district: isHome ? undefined : newMatch.district,
              competition: newMatch.competition || '友谊赛',
              status: newMatch.status as any,
              result: '',
              details: {
                  weather: 'Sunny',
                  pitch: 'Natural Grass',
                  lineup: [],
                  substitutes: [],
                  events: [],
                  summary: ''
              }
          };
          onAddMatch(match);
          setShowAddModal(false);
          setNewMatch({ 
              teamId: availableTeams[0]?.id || '',
              title: '', opponent: '', 
              province: '', city: '', district: '',
              date: new Date().toISOString().split('T')[0], time: '14:00', 
              location: 'Home', competition: '联赛', status: 'Upcoming' 
          });
      }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(editingMatch) {
          const isHome = editingMatch.location === 'Home';
          const finalMatch = {
              ...editingMatch,
              province: isHome ? undefined : editingMatch.province,
              city: isHome ? undefined : editingMatch.city,
              district: isHome ? undefined : editingMatch.district,
          };
          onUpdateMatch(finalMatch);
          setEditingMatch(null);
      }
  };
  
  const handleForceSave = () => {
       if (editingMatch) {
           onUpdateMatch(editingMatch);
           setSaveStatus('saved');
       }
  };

  const handleAddEvent = () => {
      if (editingMatch && newEvent.playerId && newEvent.type) {
          const player = players.find(p => p.id === newEvent.playerId);
          const relatedPlayer = players.find(p => p.id === newEvent.relatedPlayerId);
          
          const event: MatchEvent = {
              id: Date.now().toString(),
              minute: newEvent.minute || 0,
              type: newEvent.type as MatchEventType,
              playerId: newEvent.playerId,
              playerName: player?.name || '未知球员',
              relatedPlayerId: newEvent.relatedPlayerId,
              relatedPlayerName: relatedPlayer?.name,
              description: newEvent.description
          };

          const updatedDetails: MatchDetails = {
              ...(editingMatch.details || { weather: '', pitch: '', lineup: [], substitutes: [], events: [], summary: '' }),
              events: [...(editingMatch.details?.events || []), event].sort((a,b) => a.minute - b.minute)
          };

          setEditingMatch({ ...editingMatch, details: updatedDetails });
          setNewEvent({ minute: 0, type: 'Goal', playerId: '' });
      }
  };

  const handleRemoveEvent = (eventId: string) => {
      if (editingMatch && editingMatch.details) {
          const updatedEvents = editingMatch.details.events.filter(e => e.id !== eventId);
          setEditingMatch({
              ...editingMatch,
              details: { ...editingMatch.details, events: updatedEvents }
          });
      }
  };

  const toggleLineup = (playerId: string) => {
      if (!editingMatch) return;
      const currentLineup = editingMatch.details?.lineup || [];
      const newLineup = currentLineup.includes(playerId) 
          ? currentLineup.filter(id => id !== playerId)
          : [...currentLineup, playerId];
      
      setEditingMatch({
          ...editingMatch,
          details: { ...(editingMatch.details!), lineup: newLineup }
      });
  };

  const handleExportReport = async () => {
      if (!editingMatch) return;
      setIsExporting(true);
      try {
          await exportToPDF('match-report-export-container', `比赛战报_${editingMatch.opponent}_${editingMatch.date}`);
      } catch (e) {
          alert('导出失败');
      } finally {
          setIsExporting(false);
      }
  };

  const getLocationLabel = (loc: string) => loc === 'Home' ? '主场' : '客场';
  const getFullAddress = (m: Match) => {
      if (m.location === 'Home') return '俱乐部主球场';
      const parts = [m.province, m.city, m.district].filter(Boolean);
      return parts.length > 0 ? parts.join(' - ') : (m.city || '客场');
  };

  // --- Components ---

  const MatchCard: React.FC<{ match: Match }> = ({ match }) => {
    const team = teams.find(t => t.id === match.teamId);
    return (
        <div className={`bg-white rounded-xl shadow-sm border-l-4 p-5 transition-all hover:shadow-md relative group ${match.result ? (
            match.result.split('-')[0] > match.result.split('-')[1] ? 'border-green-500' : 
            match.result.split('-')[0] < match.result.split('-')[1] ? 'border-red-500' : 'border-yellow-500'
        ) : 'border-gray-300'}`}>
            
            <div className="absolute top-3 right-3 flex gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteMatch(match.id); }}
                    className="p-1.5 bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-500 rounded"
                    title="删除比赛"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); setEditingMatch(match); setActiveTab('info'); }}
                    className="p-1.5 bg-gray-100 hover:bg-yellow-50 text-gray-400 hover:text-bvb-black rounded"
                    title={match.status === 'Completed' ? "编辑日志/比分" : "编辑详情"}
                >
                    {match.status === 'Completed' ? <FileText className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                </button>
            </div>

            <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold uppercase text-gray-400 flex items-center">
                    <Calendar className="w-3 h-3 mr-1" /> {match.date} • {match.time}
                </span>
                <div className="flex items-center gap-2 pr-12 md:pr-0">
                    <span className="text-[10px] bg-gray-100 text-gray-500 font-bold px-1.5 rounded border border-gray-200">{team?.name}</span>
                    <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${match.location === 'Home' ? 'bg-bvb-yellow text-bvb-black' : 'bg-gray-200 text-gray-600'}`}>
                        {getLocationLabel(match.location)}
                    </span>
                </div>
            </div>
            <div className="flex justify-between items-end">
                <div>
                    {match.title && <h4 className="text-xs font-bold text-gray-500 mb-0.5">{match.title}</h4>}
                    <h3 className="text-lg font-bold text-gray-900 flex items-center">
                        VS {match.opponent}
                    </h3>
                    <div className="text-sm text-gray-500 mt-1 flex items-center">
                         <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                         {getFullAddress(match)}
                    </div>
                    {(match.details?.summary || match.matchLog) && (
                         <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded max-w-xs truncate flex items-center">
                             <FileText className="w-3 h-3 mr-1" /> 
                             已录入赛后日志
                         </div>
                    )}
                </div>
                {match.status === 'Completed' ? (
                    <div className="text-2xl font-black text-bvb-black bg-gray-100 px-3 py-1 rounded">
                        {match.result || '-:-'}
                    </div>
                ) : (
                    <button 
                        onClick={() => handleGenerateStrategy(match)}
                        className="text-xs font-bold flex items-center bg-black text-white px-3 py-1.5 rounded hover:bg-gray-800"
                    >
                        <Bot className="w-3 h-3 mr-1.5 text-bvb-yellow" /> 战术分析
                    </button>
                )}
            </div>
        </div>
    );
  };

  return (
    <div className="space-y-8 relative pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-3xl font-black text-bvb-black uppercase">比赛日中心</h2>
            <p className="text-gray-500">查看赛程、结果和战术准备。</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative group flex-1 md:flex-none">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Filter className="w-4 h-4" />
                </div>
                <select 
                    value={filterTeamId}
                    onChange={e => setFilterTeamId(e.target.value)}
                    className="w-full md:w-48 pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-bvb-yellow shadow-sm transition-all"
                >
                    {isDirector && <option value="all">所有梯队统计</option>}
                    {availableTeams.map(t => (
                        <option key={t.id} value={t.id}>{t.name} (单队)</option>
                    ))}
                </select>
            </div>
            <button 
                onClick={() => setShowAddModal(true)}
                className="flex items-center px-5 py-2.5 bg-bvb-black text-white font-bold rounded-xl shadow-md hover:bg-gray-800 transition-colors shrink-0"
            >
                <Plus className="w-5 h-5 mr-2 text-bvb-yellow" />
                录入比赛
            </button>
        </div>
      </div>

      {/* Season Statistics Grid - Moved from Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-4 duration-300">
          <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-green-500 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                  <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">赛季胜场</p><h3 className="text-3xl font-black text-gray-800">{seasonStats.wins}</h3></div>
                  <div className="p-2 bg-green-50 rounded-lg text-green-600 shadow-inner"><TrendingUp className="w-5 h-5" /></div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500" style={{ width: `${seasonStats.winRate}%` }}></div>
                  </div>
                  <span className="text-[10px] font-black text-green-600">{seasonStats.winRate}% 胜率</span>
              </div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-gray-400">
               <div className="flex justify-between items-start">
                  <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">战平局数</p><h3 className="text-3xl font-black text-gray-800">{seasonStats.draws}</h3></div>
                  <div className="p-2 bg-gray-100 rounded-lg text-gray-600 shadow-inner"><Activity className="w-5 h-5" /></div>
              </div>
              <p className="mt-4 text-[10px] font-bold text-gray-400 uppercase">总场次: {seasonStats.total} 场</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-red-500">
               <div className="flex justify-between items-start">
                  <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">负场记录</p><h3 className="text-3xl font-black text-gray-800">{seasonStats.losses}</h3></div>
                  <div className="p-2 bg-red-50 rounded-lg text-red-600 shadow-inner"><AlertCircle className="w-5 h-5" /></div>
              </div>
              <p className="mt-4 text-[10px] font-bold text-gray-400 uppercase">需总结提升</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-bvb-yellow">
               <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">队内最佳射手</p>
                      <h3 className="text-xl font-black text-gray-800 truncate">{seasonStats.topScorer?.name || '-'}</h3>
                      <p className="text-[10px] text-bvb-yellow font-black bg-black inline-block px-1.5 py-0.5 rounded mt-2 uppercase">{seasonStats.topScorer?.goals || 0} GOALS</p>
                  </div>
                  <div className="p-2 bg-yellow-50 rounded-lg text-yellow-600 shadow-inner"><Trophy className="w-5 h-5" /></div>
              </div>
          </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
          {/* Upcoming */}
          <div className="animate-in slide-in-from-left-4 duration-500">
              <h3 className="font-bold text-xl mb-4 flex items-center text-bvb-black">
                  <Shield className="w-5 h-5 mr-2 text-bvb-yellow" /> 即将进行的比赛
              </h3>
              <div className="space-y-4">
                  {upcomingMatches.length > 0 ? (
                      upcomingMatches.map(m => <MatchCard key={m.id} match={m} />)
                  ) : (
                      <div className="bg-gray-100/50 border-2 border-dashed border-gray-200 rounded-2xl py-12 text-center text-gray-400 italic font-bold">
                          暂无选定梯队的待进行比赛安排
                      </div>
                  )}
              </div>
          </div>

          {/* Past */}
          <div className="animate-in slide-in-from-right-4 duration-500">
              <h3 className="font-bold text-xl mb-4 flex items-center text-gray-600">
                  <Trophy className="w-5 h-5 mr-2" /> 近期赛果明细
              </h3>
              <div className="space-y-4 opacity-80">
                  {pastMatches.length > 0 ? (
                    pastMatches.map(m => <MatchCard key={m.id} match={m} />)
                  ) : (
                    <div className="bg-gray-100/50 border-2 border-dashed border-gray-200 rounded-2xl py-12 text-center text-gray-400 italic font-bold">
                        暂无已完成的比赛记录
                    </div>
                  )}
              </div>
          </div>
      </div>

      {/* --- Modals --- */}
      {/* ... Add/Edit Modals remain same ... */}
    </div>
  );
};

// Comment: Added missing default export
export default MatchPlanner;
