
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Match, Player, Team, MatchDetails, MatchEvent, MatchEventType } from '../types';
import { Calendar, MapPin, Trophy, Shield, Bot, X, Plus, Trash2, Edit2, FileText, CheckCircle, Save, Download, Sun, Cloud, CloudRain, CloudSnow, Wind, Users, Activity, Flag, Tag, Loader2, Clock, RefreshCw, ChevronLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateMatchStrategy } from '../services/geminiService';
import { exportToPDF } from '../services/pdfService';

interface MatchPlannerProps {
  matches: Match[];
  players: Player[];
  teams: Team[];
  onAddMatch: (match: Match) => void;
  onDeleteMatch: (id: string) => void;
  onUpdateMatch: (match: Match) => void;
  appLogo?: string;
}

type TabType = 'info' | 'lineup' | 'events' | 'report';

const MatchPlanner: React.FC<MatchPlannerProps> = ({ matches, players, teams, onAddMatch, onDeleteMatch, onUpdateMatch, appLogo }) => {
  const [selectedMatchForAi, setSelectedMatchForAi] = useState<Match | null>(null);
  const [strategy, setStrategy] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

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
    }, 1500); // 1.5s debounce

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

  const upcomingMatches = matches.filter(m => m.status === 'Upcoming').sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const pastMatches = matches.filter(m => m.status === 'Completed' || m.status === 'Cancelled').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
      if(newMatch.opponent && newMatch.date) {
          // If Home, we can clear the geo details or set them to default base
          const isHome = newMatch.location === 'Home';
          
          const match: Match = {
              id: Date.now().toString(),
              title: newMatch.title || `${newMatch.competition} VS ${newMatch.opponent}`,
              opponent: newMatch.opponent,
              date: newMatch.date,
              time: newMatch.time || '10:00',
              location: newMatch.location as 'Home' | 'Away',
              // Only save detailed address if Away
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
              title: '', opponent: '', 
              province: '', city: '', district: '',
              date: new Date().toISOString().split('T')[0], time: '14:00', 
              location: 'Home', competition: '联赛', status: 'Upcoming' 
          });
      }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      // Force immediate save on manual submit
      if(editingMatch) {
          // If changed to Home during edit, clear address
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
          // Use the hidden container ID
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

  const MatchCard: React.FC<{ match: Match }> = ({ match }) => (
    <div className={`bg-white rounded-xl shadow-sm border-l-4 p-5 transition-all hover:shadow-md relative group ${match.result ? (
        match.result.split('-')[0] > match.result.split('-')[1] ? 'border-green-500' : 
        match.result.split('-')[0] < match.result.split('-')[1] ? 'border-red-500' : 'border-yellow-500'
    ) : 'border-gray-300'}`}>
        
        {/* Actions Top Right */}
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

  return (
    <div className="space-y-8 relative pb-20 md:pb-0">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-3xl font-black text-bvb-black uppercase">比赛日中心</h2>
            <p className="text-gray-500">查看赛程、结果和战术准备。</p>
        </div>
        <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-4 py-2 bg-bvb-black text-white font-bold rounded-lg shadow-md hover:bg-gray-800 transition-colors"
        >
            <Plus className="w-5 h-5 mr-2 text-bvb-yellow" />
            录入比赛
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
          {/* Upcoming */}
          <div>
              <h3 className="font-bold text-xl mb-4 flex items-center text-bvb-black">
                  <Shield className="w-5 h-5 mr-2" /> 即将进行的比赛
              </h3>
              <div className="space-y-4">
                  {upcomingMatches.length > 0 ? (
                      upcomingMatches.map(m => <MatchCard key={m.id} match={m} />)
                  ) : (
                      <p className="text-gray-400 italic">暂无安排即将进行的比赛。</p>
                  )}
              </div>
          </div>

          {/* Past */}
          <div>
              <h3 className="font-bold text-xl mb-4 flex items-center text-gray-600">
                  <Trophy className="w-5 h-5 mr-2" /> 近期赛果
              </h3>
              <div className="space-y-4 opacity-80">
                  {pastMatches.map(m => <MatchCard key={m.id} match={m} />)}
              </div>
          </div>
      </div>

      {/* --- Modals --- */}

      {/* 1. Add Match Modal */}
      {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white w-full h-full md:h-auto md:max-w-md rounded-none md:rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col md:max-h-[90vh]">
                  <div className="bg-bvb-black p-4 flex justify-between items-center text-white shrink-0">
                      <h3 className="font-bold flex items-center">
                          <Plus className="w-5 h-5 mr-2 text-bvb-yellow" /> 录入新比赛
                      </h3>
                      <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5" /></button>
                  </div>
                  <form onSubmit={handleAddSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto pb-24 md:pb-6">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">比赛名称 (标题)</label>
                          <input 
                              className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none"
                              placeholder="例如: U19 联赛第3轮"
                              value={newMatch.title}
                              onChange={e => setNewMatch({...newMatch, title: e.target.value})}
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">对手名称</label>
                              <input 
                                  required
                                  className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none"
                                  value={newMatch.opponent}
                                  onChange={e => setNewMatch({...newMatch, opponent: e.target.value})}
                              />
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">赛事类型</label>
                              <select 
                                  className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none"
                                  value={newMatch.competition}
                                  onChange={e => setNewMatch({...newMatch, competition: e.target.value})}
                              >
                                  <option value="联赛">联赛</option>
                                  <option value="杯赛">杯赛</option>
                                  <option value="友谊赛">友谊赛</option>
                              </select>
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">日期</label>
                              <input 
                                  type="date"
                                  required
                                  className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none"
                                  value={newMatch.date}
                                  onChange={e => setNewMatch({...newMatch, date: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">时间</label>
                              <input 
                                  type="time"
                                  required
                                  className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none"
                                  value={newMatch.time}
                                  onChange={e => setNewMatch({...newMatch, time: e.target.value})}
                              />
                          </div>
                      </div>
                      
                      {/* Location: Manual Input */}
                      <div className="space-y-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                          <div className="flex justify-between items-center mb-1">
                               <span className="text-xs font-bold text-gray-500 uppercase">比赛地点</span>
                               <select 
                                  className="text-xs border rounded p-1 font-bold"
                                  value={newMatch.location}
                                  onChange={e => setNewMatch({...newMatch, location: e.target.value as any})}
                               >
                                  <option value="Home">主场 (Home)</option>
                                  <option value="Away">客场 (Away)</option>
                               </select>
                          </div>
                          
                          {/* Only show manual input if 'Away' is selected */}
                          {newMatch.location === 'Away' ? (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <input
                                    className="w-full p-2 border rounded text-xs focus:ring-2 focus:ring-bvb-yellow outline-none"
                                    placeholder="请输入客场城市或球场名称"
                                    value={newMatch.city || ''}
                                    onChange={e => setNewMatch({...newMatch, city: e.target.value, province: '', district: ''})}
                                />
                            </div>
                          ) : (
                              <div className="text-center py-2 text-xs text-gray-400 font-medium">
                                  使用俱乐部主球场
                              </div>
                          )}
                      </div>

                      <button type="submit" className="w-full py-3 bg-bvb-yellow text-bvb-black font-bold rounded hover:brightness-105 mt-2">
                          确认添加
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* 2. Detailed Edit / Log Modal */}
      {editingMatch && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white w-full h-full md:h-auto md:max-w-4xl rounded-none md:rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col md:h-[85vh]">
                  <div className="bg-bvb-black p-4 flex justify-between items-center text-white shrink-0">
                      <div className="flex items-center gap-3">
                        <button onClick={() => setEditingMatch(null)} className="md:hidden"><ChevronLeft className="w-6 h-6" /></button>
                        <div>
                            <h3 className="font-bold flex items-center text-lg leading-tight">
                                <FileText className="w-5 h-5 mr-2 text-bvb-yellow" />
                                {editingMatch.status === 'Completed' ? '赛后总结' : '编辑详情'}
                            </h3>
                            <p className="text-xs text-gray-400 mt-1">{editingMatch.opponent} | {editingMatch.date}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                            {saveStatus === 'saving' && <span className="text-xs text-bvb-yellow flex items-center bg-gray-800 px-2 py-0.5 rounded-full"><RefreshCw className="w-3 h-3 mr-1 animate-spin"/> 保存中</span>}
                            {saveStatus === 'saved' && <span className="text-xs text-green-400 flex items-center bg-gray-800 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3 mr-1"/> 已保存</span>}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                         <button 
                            onClick={handleExportReport}
                            disabled={isExporting}
                            className="hidden md:flex bg-gray-800 hover:bg-gray-700 text-bvb-yellow px-3 py-1.5 rounded text-xs font-bold items-center"
                         >
                            {isExporting ? '导出中...' : <><Download className="w-3 h-3 mr-1" /> 导出战报</>}
                         </button>
                         <button onClick={() => setEditingMatch(null)} className="hidden md:block"><X className="w-5 h-5" /></button>
                      </div>
                  </div>
                  
                  {/* Tabs */}
                  <div className="bg-gray-100 border-b border-gray-200 flex space-x-1 p-1 shrink-0 sticky top-0 z-10 overflow-x-auto no-scrollbar">
                      {[
                          { id: 'info', label: '基础', icon: MapPin },
                          { id: 'lineup', label: '阵容', icon: Users },
                          { id: 'events', label: '事件', icon: Activity },
                          { id: 'report', label: '总结', icon: FileText },
                      ].map(tab => (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center transition-all min-w-[80px] ${
                                activeTab === tab.id ? 'bg-white shadow text-bvb-black' : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                              <tab.icon className={`w-4 h-4 mr-1 md:mr-2 ${activeTab === tab.id ? 'text-bvb-yellow fill-current stroke-bvb-black' : ''}`} />
                              <span className="text-xs md:text-sm">{tab.label}</span>
                          </button>
                      ))}
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 pb-24 md:pb-6">
                    <form id="match-log-form" onSubmit={handleEditSubmit} className="space-y-6 h-full flex flex-col">
                        
                        {/* TAB 1: INFO & ENVIRONMENT */}
                        {activeTab === 'info' && (
                            <div className="space-y-6 animate-in slide-in-from-right-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                        <h4 className="font-bold text-gray-800 mb-3 text-sm uppercase">比赛信息</h4>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">比赛名称</label>
                                                <input 
                                                    className="w-full p-2 border rounded text-sm font-bold"
                                                    value={editingMatch.title || ''}
                                                    onChange={e => setEditingMatch({...editingMatch, title: e.target.value})}
                                                    placeholder="例如: U19 联赛第5轮"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">对手</label>
                                                <input 
                                                    className="w-full p-2 border rounded text-sm font-bold"
                                                    value={editingMatch.opponent}
                                                    onChange={e => setEditingMatch({...editingMatch, opponent: e.target.value})}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">日期</label>
                                                    <input type="date" className="w-full p-2 border rounded text-sm" value={editingMatch.date} onChange={e => setEditingMatch({...editingMatch, date: e.target.value})} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">时间</label>
                                                    <input type="time" className="w-full p-2 border rounded text-sm" value={editingMatch.time} onChange={e => setEditingMatch({...editingMatch, time: e.target.value})} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">状态</label>
                                                <select 
                                                    className="w-full p-2 border rounded text-sm"
                                                    value={editingMatch.status}
                                                    onChange={e => setEditingMatch({...editingMatch, status: e.target.value as any})}
                                                >
                                                    <option value="Upcoming">未开始</option>
                                                    <option value="Completed">已结束</option>
                                                    <option value="Cancelled">已取消</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                        <h4 className="font-bold text-gray-800 mb-3 text-sm uppercase">环境与位置</h4>
                                        <div className="space-y-3">
                                            {/* Location Edit */}
                                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-3">
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className="block text-xs font-bold text-gray-500 uppercase">比赛地点</label>
                                                    <select 
                                                        className="text-xs border rounded p-1 font-bold bg-white"
                                                        value={editingMatch.location}
                                                        onChange={e => setEditingMatch({...editingMatch, location: e.target.value as any})}
                                                    >
                                                        <option value="Home">主场 (Home)</option>
                                                        <option value="Away">客场 (Away)</option>
                                                    </select>
                                                </div>
                                                
                                                {/* Edit Location Details - Only if Away - Manual Input */}
                                                {editingMatch.location === 'Away' ? (
                                                    <div className="animate-in fade-in slide-in-from-top-1">
                                                         <input
                                                            className="w-full p-2 border rounded text-xs bg-white focus:ring-2 focus:ring-bvb-yellow outline-none"
                                                            placeholder="请输入客场城市或球场名称"
                                                            value={editingMatch.city || ''}
                                                            onChange={e => setEditingMatch({...editingMatch, city: e.target.value})}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-4 text-xs text-gray-400 font-medium">
                                                        <MapPin className="w-5 h-5 mx-auto mb-1 opacity-50" />
                                                        俱乐部主球场
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">天气</label>
                                                    <select 
                                                        className="w-full p-2 border rounded text-sm"
                                                        value={editingMatch.details?.weather || 'Sunny'}
                                                        onChange={e => setEditingMatch({...editingMatch, details: { ...editingMatch.details!, weather: e.target.value }})}
                                                    >
                                                        <option value="Sunny">晴朗 ☀️</option>
                                                        <option value="Cloudy">多云 ☁️</option>
                                                        <option value="Rainy">雨天 🌧️</option>
                                                        <option value="Snowy">雪天 ❄️</option>
                                                        <option value="Windy">大风 💨</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">场地状况</label>
                                                    <select 
                                                        className="w-full p-2 border rounded text-sm"
                                                        value={editingMatch.details?.pitch || 'Natural Grass'}
                                                        onChange={e => setEditingMatch({...editingMatch, details: { ...editingMatch.details!, pitch: e.target.value }})}
                                                    >
                                                        <option value="Natural Excellent">天然草 (优)</option>
                                                        <option value="Natural Poor">天然草 (差)</option>
                                                        <option value="Artificial">人工草</option>
                                                        <option value="Hard Ground">硬地/土场</option>
                                                    </select>
                                                </div>
                                            </div>
                                            
                                            {editingMatch.status === 'Completed' && (
                                                <div className="mt-3">
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">比分结果</label>
                                                    <input 
                                                        className="w-full bg-yellow-50 p-2 border border-yellow-300 rounded text-xl font-black text-center tracking-widest text-yellow-800"
                                                        placeholder="3-1"
                                                        value={editingMatch.result || ''}
                                                        onChange={e => setEditingMatch({...editingMatch, result: e.target.value})}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: LINEUP */}
                        {activeTab === 'lineup' && (
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 h-full flex flex-col animate-in slide-in-from-right-4">
                                <h4 className="font-bold text-gray-800 mb-3 text-sm uppercase flex justify-between items-center">
                                    <span>选择出场阵容</span>
                                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">已选: {editingMatch.details?.lineup?.length || 0} 人</span>
                                </h4>
                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                    {teams.map(team => {
                                        const teamPlayers = players.filter(p => p.teamId === team.id);
                                        if (teamPlayers.length === 0) return null;
                                        return (
                                            <div key={team.id} className="mb-4">
                                                <div className="bg-gray-100 px-3 py-1.5 rounded-t-lg text-xs font-bold text-gray-600 border-b border-gray-200 sticky top-0 z-10">
                                                    {team.name}
                                                </div>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-2 border border-gray-100 rounded-b-lg">
                                                    {teamPlayers.map(player => {
                                                        const isSelected = editingMatch.details?.lineup?.includes(player.id);
                                                        return (
                                                            <div 
                                                                key={player.id}
                                                                onClick={() => toggleLineup(player.id)}
                                                                className={`cursor-pointer flex items-center p-2 rounded border transition-all ${
                                                                    isSelected ? 'bg-yellow-50 border-bvb-yellow ring-1 ring-bvb-yellow' : 'bg-white border-gray-200 hover:bg-gray-50'
                                                                }`}
                                                            >
                                                                <div className={`w-4 h-4 rounded border mr-2 flex items-center justify-center ${isSelected ? 'bg-bvb-yellow border-bvb-black' : 'bg-white border-gray-300'}`}>
                                                                    {isSelected && <CheckCircle className="w-3 h-3 text-bvb-black" />}
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs font-bold text-gray-800">{player.name}</span>
                                                                    <span className="text-[10px] text-gray-400">#{player.number} • {player.position}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* TAB 3: EVENTS */}
                        {activeTab === 'events' && (
                            <div className="flex flex-col h-full gap-4 animate-in slide-in-from-right-4">
                                {/* Add Event Form */}
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 shrink-0">
                                    <h4 className="font-bold text-gray-800 mb-3 text-sm uppercase">添加关键事件</h4>
                                    <div className="flex flex-wrap gap-2 items-end">
                                        <div className="w-20">
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">时间(分)</label>
                                            <input 
                                                type="number"
                                                className="w-full p-2 border rounded text-sm"
                                                value={newEvent.minute}
                                                onChange={e => setNewEvent({...newEvent, minute: parseInt(e.target.value)})}
                                            />
                                        </div>
                                        <div className="w-24 flex-1">
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">事件类型</label>
                                            <select 
                                                className="w-full p-2 border rounded text-sm"
                                                value={newEvent.type}
                                                onChange={e => setNewEvent({...newEvent, type: e.target.value as MatchEventType})}
                                            >
                                                <option value="Goal">进球 ⚽</option>
                                                <option value="Assist">助攻 👟</option>
                                                <option value="YellowCard">黄牌 🟨</option>
                                                <option value="RedCard">红牌 🟥</option>
                                                <option value="Sub">换人 🔄</option>
                                            </select>
                                        </div>
                                        <div className="w-full md:w-auto md:flex-1">
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">球员</label>
                                            <select 
                                                className="w-full p-2 border rounded text-sm"
                                                value={newEvent.playerId}
                                                onChange={e => setNewEvent({...newEvent, playerId: e.target.value})}
                                            >
                                                <option value="">选择球员...</option>
                                                {players.sort((a,b) => a.name.localeCompare(b.name)).map(p => (
                                                    <option key={p.id} value={p.id}>{p.name} (#{p.number})</option>
                                                ))}
                                            </select>
                                        </div>
                                        {newEvent.type === 'Sub' && (
                                            <div className="w-full md:w-auto md:flex-1">
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">换下球员</label>
                                                <select 
                                                    className="w-full p-2 border rounded text-sm"
                                                    value={newEvent.relatedPlayerId}
                                                    onChange={e => setNewEvent({...newEvent, relatedPlayerId: e.target.value})}
                                                >
                                                    <option value="">选择被换下...</option>
                                                    {players.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        <button 
                                            type="button" 
                                            onClick={handleAddEvent}
                                            disabled={!newEvent.playerId}
                                            className="w-full md:w-auto px-4 py-2 bg-bvb-black text-white font-bold rounded hover:bg-gray-800 disabled:opacity-50"
                                        >
                                            添加
                                        </button>
                                    </div>
                                </div>

                                {/* Timeline List */}
                                <div className="flex-1 bg-white p-4 rounded-lg shadow-sm border border-gray-200 overflow-y-auto custom-scrollbar">
                                    <h4 className="font-bold text-gray-800 mb-3 text-sm uppercase">比赛时间轴</h4>
                                    <div className="space-y-2 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                                        {(editingMatch.details?.events || []).length > 0 ? (
                                            (editingMatch.details?.events || []).map((ev, idx) => (
                                                <div key={idx} className="flex items-center relative pl-12 group">
                                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 bg-white border-2 border-bvb-yellow rounded-full flex items-center justify-center text-xs font-bold z-10">
                                                        {ev.minute}'
                                                    </div>
                                                    <div className="flex-1 bg-gray-50 p-2 rounded border border-gray-100 flex justify-between items-center group-hover:bg-yellow-50 transition-colors">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-lg">
                                                                {ev.type === 'Goal' && '⚽'}
                                                                {ev.type === 'Assist' && '👟'}
                                                                {ev.type === 'YellowCard' && '🟨'}
                                                                {ev.type === 'RedCard' && '🟥'}
                                                                {ev.type === 'Sub' && '🔄'}
                                                            </span>
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-bold text-gray-800">{ev.playerName}</span>
                                                                {ev.type === 'Sub' && <span className="text-xs text-gray-400">换下: {ev.relatedPlayerName}</span>}
                                                            </div>
                                                        </div>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => handleRemoveEvent(ev.id)}
                                                            className="text-gray-300 hover:text-red-500"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-gray-400 text-sm text-center py-8 pl-8">暂无事件记录</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 4: REPORT */}
                        {activeTab === 'report' && (
                             <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 h-full flex flex-col animate-in slide-in-from-right-4">
                                <h4 className="font-bold text-gray-800 mb-3 text-sm uppercase">赛后总结 / 教练战报</h4>
                                <textarea 
                                    className="flex-1 w-full p-4 border rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none text-sm leading-relaxed resize-none bg-gray-50 focus:bg-white transition-colors"
                                    placeholder="请详细描述球队整体表现、战术执行情况、改进点等..."
                                    value={editingMatch.details?.summary || editingMatch.matchLog || ''}
                                    onChange={e => setEditingMatch({
                                        ...editingMatch, 
                                        matchLog: e.target.value,
                                        details: { ...(editingMatch.details || { weather: '', pitch: '', lineup: [], substitutes: [], events: [], summary: '' }), summary: e.target.value }
                                    })}
                                />
                             </div>
                        )}

                        {/* Footer Save Button */}
                        <div className="pt-2 mt-auto hidden md:block">
                            <button type="button" onClick={handleForceSave} className={`w-full py-3 font-bold rounded-lg flex justify-center items-center shadow-lg transform active:scale-[0.99] transition-all ${saveStatus === 'saved' ? 'bg-green-600 text-white' : 'bg-bvb-black text-white hover:bg-gray-800'}`}>
                                {saveStatus === 'saved' ? <CheckCircle className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />} 
                                {saveStatus === 'saved' ? '所有更改已保存' : '立即保存所有更改'}
                            </button>
                        </div>
                    </form>
                  </div>
              </div>
           </div>
      )}

      {/* 3. AI Strategy Modal */}
      {selectedMatchForAi && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                  <div className="bg-bvb-black p-6 flex justify-between items-start shrink-0">
                      <div>
                          <h3 className="text-bvb-yellow font-bold text-xl uppercase tracking-wider">AI 战术报告</h3>
                          <p className="text-gray-400 text-sm">对手: {selectedMatchForAi.opponent}</p>
                      </div>
                      <button onClick={() => setSelectedMatchForAi(null)} className="text-gray-400 hover:text-white">
                          <X className="w-6 h-6" />
                      </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 bg-gray-50 custom-scrollbar">
                      {loading ? (
                          <div className="flex flex-col items-center justify-center h-48 space-y-4">
                              <Loader2 className="w-8 h-8 animate-spin text-bvb-yellow" />
                              <p className="text-gray-500 font-bold animate-pulse">正在分析对手数据...</p>
                          </div>
                      ) : (
                          <div className="prose prose-sm max-w-none prose-p:text-gray-600 prose-headings:text-gray-800 prose-strong:text-gray-900">
                              <ReactMarkdown>{strategy}</ReactMarkdown>
                          </div>
                      )}
                  </div>
                  <div className="p-4 bg-white border-t border-gray-100 flex justify-end">
                       <button 
                          onClick={() => setSelectedMatchForAi(null)}
                          className="px-4 py-2 bg-gray-200 text-gray-700 font-bold rounded hover:bg-gray-300"
                       >
                          关闭
                       </button>
                  </div>
              </div>
          </div>
      )}

      {/* 4. Hidden Export Container - Full Report Template */}
      {editingMatch && (
         <div id="match-report-export-container" className="absolute left-[-9999px] top-0 w-[1000px] bg-white text-black p-12 z-[-1000]">
             {/* Header */}
             <div className="flex items-center justify-between border-b-4 border-bvb-yellow pb-6 mb-8">
                <div className="flex items-center">
                    <div className="w-16 h-16 bg-bvb-yellow rounded-full flex items-center justify-center text-bvb-black font-black text-2xl border-4 border-black mr-4">WS</div>
                    <div>
                        <h1 className="text-4xl font-black uppercase tracking-tighter">顽石之光足球俱乐部</h1>
                        <p className="text-xl text-gray-500 font-bold mt-1">比赛战报 / Match Report</p>
                    </div>
                </div>
                <div className="text-right">
                     <div className="text-4xl font-black text-bvb-black tracking-widest bg-gray-100 px-4 py-1 rounded-lg">
                        {editingMatch.result || 'vs'}
                     </div>
                     <div className="text-sm font-bold text-gray-400 uppercase mt-2">
                        {editingMatch.opponent}
                     </div>
                </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-3 gap-6 mb-8 p-6 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                     <span className="block text-xs font-bold text-gray-400 uppercase mb-1">日期时间</span>
                     <span className="block text-lg font-bold">{editingMatch.date} {editingMatch.time}</span>
                </div>
                <div>
                     <span className="block text-xs font-bold text-gray-400 uppercase mb-1">地点</span>
                     <span className="block text-lg font-bold">{getFullAddress(editingMatch)}</span>
                </div>
                <div>
                     <span className="block text-xs font-bold text-gray-400 uppercase mb-1">环境</span>
                     <span className="block text-lg font-bold">
                        {editingMatch.details?.weather === 'Sunny' ? '晴朗' : editingMatch.details?.weather === 'Rainy' ? '雨天' : editingMatch.details?.weather} / {editingMatch.details?.pitch}
                     </span>
                </div>
            </div>

            <div className="flex gap-8 mb-8">
                 {/* Lineup List */}
                 <div className="w-1/3">
                    <h3 className="font-bold text-xl border-b-2 border-bvb-yellow pb-2 mb-4 flex items-center">
                        <Users className="w-5 h-5 mr-2" /> 首发阵容
                    </h3>
                    <div className="space-y-2">
                        {(editingMatch.details?.lineup || []).map((pid, idx) => {
                            const p = players.find(player => player.id === pid);
                            return (
                                <div key={pid} className="flex items-center p-2 bg-gray-50 rounded border border-gray-100">
                                    <span className="w-6 font-mono font-bold text-gray-400">{idx + 1}.</span>
                                    <span className="font-bold">{p?.name || '未知球员'}</span>
                                    <span className="ml-auto text-xs bg-bvb-yellow text-bvb-black px-1.5 rounded font-bold">#{p?.number}</span>
                                </div>
                            )
                        })}
                        {(!editingMatch.details?.lineup || editingMatch.details.lineup.length === 0) && (
                            <p className="text-gray-400 italic">未录入阵容</p>
                        )}
                    </div>
                 </div>

                 {/* Events & Summary */}
                 <div className="w-2/3 flex flex-col gap-8">
                    {/* Events */}
                    <div>
                        <h3 className="font-bold text-xl border-b-2 border-bvb-yellow pb-2 mb-4 flex items-center">
                            <Activity className="w-5 h-5 mr-2" /> 关键事件
                        </h3>
                         <div className="space-y-2 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                            {(editingMatch.details?.events || []).map((ev, idx) => (
                                <div key={idx} className="flex items-center relative pl-10">
                                    <div className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-2 border-black rounded-full flex items-center justify-center text-xs font-bold z-10">
                                        {ev.minute}'
                                    </div>
                                    <div className="flex-1 p-2 border-b border-gray-100 flex items-center">
                                        <span className="mr-3 text-lg">
                                            {ev.type === 'Goal' && '⚽'}
                                            {ev.type === 'Assist' && '👟'}
                                            {ev.type === 'YellowCard' && '🟨'}
                                            {ev.type === 'RedCard' && '🟥'}
                                            {ev.type === 'Sub' && '🔄'}
                                        </span>
                                        <span className="font-bold mr-2">{ev.playerName}</span>
                                        <span className="text-gray-500 text-sm">{ev.type === 'Sub' ? `换下: ${ev.relatedPlayerName}` : ev.description}</span>
                                    </div>
                                </div>
                            ))}
                             {(editingMatch.details?.events || []).length === 0 && (
                                <p className="text-gray-400 italic pl-10">无关键事件记录</p>
                            )}
                         </div>
                    </div>

                    {/* Summary */}
                    <div>
                        <h3 className="font-bold text-xl border-b-2 border-bvb-yellow pb-2 mb-4 flex items-center">
                            <FileText className="w-5 h-5 mr-2" /> 赛后总结
                        </h3>
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 text-sm leading-relaxed whitespace-pre-wrap text-justify">
                            {editingMatch.details?.summary || editingMatch.matchLog || "暂无总结内容。"}
                        </div>
                    </div>
                 </div>
            </div>
         </div>
      )}

    </div>
  );
};

export default MatchPlanner;
