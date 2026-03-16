
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Match, Player, Team, MatchDetails, MatchEvent, MatchEventType, User } from '../types';
// Comment: Added 'Info' to the lucide-react imports
import { Calendar, MapPin, Trophy, Shield, Bot, X, Plus, Trash2, Edit2, FileText, CheckCircle, Save, Download, Sun, Cloud, CloudRain, CloudSnow, Wind, Users, Activity, Flag, Tag, Loader2, Clock, RefreshCw, ChevronLeft, TrendingUp, AlertCircle, Filter, ChevronDown, UserPlus, UserMinus, Star, ClipboardList, PenTool, Info } from 'lucide-react';
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
  
  const [filterTeamId, setFilterTeamId] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('info');

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
    }, 1500); 
    return () => clearTimeout(timer);
  }, [editingMatch]);

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
          
          const updatedDetails = {
              ...editingMatch.details!,
              events: [...(editingMatch.details?.events || []), event]
          };
          
          setEditingMatch({ ...editingMatch, details: updatedDetails });
          setNewEvent({ minute: 0, type: 'Goal', playerId: '' });
      }
  };

  const removeEvent = (id: string) => {
      if (editingMatch) {
          const updatedEvents = editingMatch.details?.events.filter(e => e.id !== id) || [];
          setEditingMatch({ ...editingMatch, details: { ...editingMatch.details!, events: updatedEvents } });
      }
  };

  const toggleLineupPlayer = (playerId: string, isSub: boolean = false) => {
      if (!editingMatch) return;
      const details = editingMatch.details!;
      if (isSub) {
          const nextSubs = details.substitutes.includes(playerId) 
            ? details.substitutes.filter(id => id !== playerId)
            : [...details.substitutes, playerId];
          setEditingMatch({ ...editingMatch, details: { ...details, substitutes: nextSubs } });
      } else {
          const nextLineup = details.lineup.includes(playerId) 
            ? details.lineup.filter(id => id !== playerId)
            : [...details.lineup, playerId];
          setEditingMatch({ ...editingMatch, details: { ...details, lineup: nextLineup } });
      }
  };

  const handleGenerateStrategy = async (match: Match) => {
    setSelectedMatchForAi(match);
    setLoading(true);
    try {
        const result = await generateMatchStrategy(match.opponent, "控制球权，快速转换");
        setStrategy(result);
    } catch (e) {
        setStrategy("生成失败。");
    } finally {
        setLoading(false);
    }
  };

  const MatchDetailModal = () => {
    if (!editingMatch) return null;
    const teamPlayers = players.filter(p => p.teamId === editingMatch.teamId);
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full h-full md:h-[90vh] md:max-w-4xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="bg-bvb-black p-3 md:p-4 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-2 md:gap-3">
                        <button onClick={() => setEditingMatch(null)} className="md:hidden"><ChevronLeft className="w-6 h-6" /></button>
                        <div>
                            <h3 className="font-bold text-base md:text-lg leading-tight">比赛录入: VS {editingMatch.opponent}</h3>
                            <p className="text-[10px] md:text-xs text-gray-400 font-mono uppercase">{editingMatch.date} • {editingMatch.competition}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                         {saveStatus === 'saving' && <span className="text-[10px] md:text-xs text-bvb-yellow flex items-center"><RefreshCw className="w-3 h-3 mr-1 animate-spin"/> 同步中</span>}
                         {saveStatus === 'saved' && <span className="text-[10px] md:text-xs text-green-400 flex items-center bg-gray-800 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3 mr-1"/> 云端已存</span>}
                         <button onClick={() => setEditingMatch(null)} className="hidden md:block hover:bg-gray-800 p-1 rounded"><X className="w-6 h-6" /></button>
                    </div>
                </div>

                <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto no-scrollbar shrink-0">
                    {[
                        { id: 'info', label: '比分', icon: Activity },
                        { id: 'lineup', label: '阵容', icon: Users },
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
                                            <select className="w-full p-2.5 md:p-3 border rounded-xl font-bold bg-white text-xs md:text-sm outline-none" value={editingMatch.details?.weather} onChange={e => setEditingMatch({...editingMatch, details: {...editingMatch.details!, weather: e.target.value}})}>
                                                <option value="Sunny">晴朗</option><option value="Cloudy">多云</option><option value="Rainy">有雨</option><option value="Snow">雪天</option><option value="Windy">大风</option>
                                            </select>
                                        </div>
                                        <div><label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 block">场地</label>
                                            <select className="w-full p-2.5 md:p-3 border rounded-xl font-bold bg-white text-xs md:text-sm outline-none" value={editingMatch.details?.pitch} onChange={e => setEditingMatch({...editingMatch, details: {...editingMatch.details!, pitch: e.target.value}})}>
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
                                        {teamPlayers.map(p => {
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
                                        {teamPlayers.map(p => {
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
                                            {teamPlayers.filter(p => editingMatch.details?.lineup.includes(p.id) || editingMatch.details?.substitutes.includes(p.id)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
                                                <button onClick={() => removeEvent(event.id)} className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4"/></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'report' && (
                        <div className="animate-in fade-in duration-300 space-y-4 md:space-y-6">
                            <div className="space-y-3 md:space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-bold text-sm md:text-base text-gray-800 flex items-center"><PenTool className="w-4 h-4 mr-2 text-bvb-yellow" /> 教练赛后复盘</h4>
                                    <button onClick={() => handleGenerateStrategy(editingMatch)} className="text-[10px] md:text-xs bg-white border border-gray-300 px-2 md:px-3 py-1 md:py-1.5 rounded-lg font-bold flex items-center hover:bg-yellow-50 transition-colors"><Bot className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1 md:mr-1.5 text-bvb-yellow" /> AI 建议</button>
                                </div>
                                <textarea className="w-full h-48 md:h-64 p-3 md:p-5 border rounded-2xl focus:ring-2 focus:ring-bvb-yellow outline-none text-xs md:text-sm leading-relaxed bg-gray-50 focus:bg-white transition-all shadow-inner" placeholder="详细记录本场表现及个人球员点评..." value={editingMatch.details?.summary} onChange={e => setEditingMatch({...editingMatch, details: {...editingMatch.details!, summary: e.target.value}})} />
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="bg-gray-50 p-3 md:p-4 border-t flex justify-end shrink-0 hidden md:flex">
                    <button onClick={() => setEditingMatch(null)} className="px-6 md:px-10 py-2.5 md:py-3 bg-bvb-black text-white font-black rounded-xl shadow-xl hover:bg-gray-800 transition-all uppercase italic text-xs md:text-sm">
                        确认并退出
                    </button>
                </div>
            </div>
        </div>
    );
  };

  const getLocationLabel = (loc: string) => loc === 'Home' ? '主场' : '客场';
  const getFullAddress = (m: Match) => {
      if (m.location === 'Home') return '俱乐部主球场';
      const parts = [m.province, m.city, m.district].filter(Boolean);
      return parts.length > 0 ? parts.join(' - ') : (m.city || '客场');
  };

  const MatchCard: React.FC<{ match: Match }> = ({ match }) => {
    const team = teams.find(t => t.id === match.teamId);
    return (
        <div className={`bg-white rounded-xl shadow-sm border-l-4 p-3 md:p-5 transition-all hover:shadow-md relative group ${match.status === 'Completed' ? (
            match.result && match.result.split('-')[0] > match.result.split('-')[1] ? 'border-green-500' : 
            match.result && match.result.split('-')[0] < match.result.split('-')[1] ? 'border-red-500' : 'border-yellow-500'
        ) : 'border-gray-300'}`}>
            <div className="absolute top-2.5 md:top-3 right-2.5 md:right-3 flex gap-1.5 md:gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); onDeleteMatch(match.id); }} className="p-1 md:p-1.5 bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-500 rounded"><Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
                <button onClick={(e) => { e.stopPropagation(); setEditingMatch(match); setActiveTab('info'); }} className="p-1 md:p-1.5 bg-gray-100 hover:bg-yellow-50 text-gray-400 hover:text-bvb-black rounded">
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
                         <button onClick={() => { setEditingMatch(match); setActiveTab('info'); }} className="text-[9px] md:text-[10px] font-black flex items-center bg-bvb-yellow text-bvb-black px-2 md:px-3 py-1 md:py-1.5 rounded-lg shadow-sm hover:brightness-105 active:scale-95 transition-all">录入赛果 <PenTool className="w-2.5 h-2.5 md:w-3 md:h-3 ml-1 md:ml-1.5" /></button>
                         <button onClick={() => handleGenerateStrategy(match)} className="text-[9px] md:text-[10px] font-black flex items-center bg-black text-white px-2 md:px-3 py-1 md:py-1.5 rounded-lg hover:bg-gray-800 transition-all"><Bot className="w-2.5 h-2.5 md:w-3 md:h-3 mr-1 md:mr-1.5 text-bvb-yellow" /> 助手</button>
                    </div>
                )}
            </div>
        </div>
    );
  };

  return (
    <div className="space-y-6 md:space-y-8 relative pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl md:text-3xl font-black text-bvb-black uppercase tracking-tighter">比赛日中心</h2>
            <p className="text-gray-500 font-bold uppercase text-[9px] md:text-[10px] tracking-widest">Match Schedule & Performance Analytics</p>
        </div>
        <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
            <div className="relative group flex-1 md:flex-none">
                <div className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 text-gray-400"><Filter className="w-3.5 h-3.5 md:w-4 md:h-4" /></div>
                <select value={filterTeamId} onChange={e => setFilterTeamId(e.target.value)} className="w-full md:w-48 pl-8 md:pl-10 pr-3 md:pr-4 py-2 md:py-2.5 bg-white border border-gray-200 rounded-xl text-xs md:text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-bvb-yellow shadow-sm transition-all">
                    {isDirector && <option value="all">所有梯队</option>}
                    {availableTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
            </div>
            <button onClick={() => setShowAddModal(true)} className="flex items-center px-4 md:px-6 py-2 md:py-2.5 bg-bvb-black text-white font-black rounded-xl shadow-xl hover:bg-gray-800 transition-all shrink-0 text-xs md:text-sm"><Plus className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2 text-bvb-yellow" /> 新建</button>
        </div>
      </div>

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
                  {upcomingMatches.length > 0 ? upcomingMatches.map(m => <MatchCard key={m.id} match={m} />) : <div className="bg-gray-100/50 border-2 border-dashed border-gray-200 rounded-3xl py-12 md:py-16 text-center text-gray-400 italic font-black uppercase text-xs md:text-sm tracking-widest">No scheduled matches</div>}
              </div>
          </div>
          <div className="animate-in slide-in-from-right-4 duration-500">
              <h3 className="font-black text-lg md:text-xl mb-4 md:mb-6 flex items-center text-gray-400 uppercase tracking-tighter italic">
                  <Trophy className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3" /> History / 近期赛果
              </h3>
              <div className="space-y-3 md:space-y-4 opacity-90">
                  {pastMatches.length > 0 ? pastMatches.map(m => <MatchCard key={m.id} match={m} />) : <div className="bg-gray-100/50 border-2 border-dashed border-gray-200 rounded-3xl py-12 md:py-16 text-center text-gray-400 italic font-black uppercase text-xs md:text-sm tracking-widest">No match records found</div>}
              </div>
          </div>
      </div>

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

      <MatchDetailModal />

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
    </div>
  );
};

export default MatchPlanner;
