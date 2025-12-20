
import React, { useState, useMemo } from 'react';
import { Player, Team, JugglingRecord, HomeTrainingLog, TechTestDefinition, TechTestResult, User } from '../types';
import { TrendingUp, Award, Activity, History, Plus, Target, CheckCircle, BarChart3, ChevronRight, User as UserIcon, Medal, Clock, Settings, Save, Trash2, Calendar, ChevronLeft, ChevronRight as ChevronRightIcon, LayoutGrid, ListFilter } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

interface TechnicalGrowthProps {
    players: Player[];
    teams: Team[];
    currentUser: User | null;
    techTests?: TechTestDefinition[];
    onUpdatePlayer: (player: Player) => void;
    onUpdateTechTests?: (tests: TechTestDefinition[]) => void;
}

const TechnicalGrowth: React.FC<TechnicalGrowthProps> = ({ 
    players, teams, currentUser, techTests = [], onUpdatePlayer, onUpdateTechTests 
}) => {
    const [activeTab, setActiveTab] = useState<'juggling' | 'home' | 'tests' | 'configs'>('juggling');
    const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.id || 'all');
    const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
    const [viewYear, setViewYear] = useState(new Date().getFullYear());
    const [viewMonth, setViewMonth] = useState(new Date().getMonth());

    // 录入状态
    const [showAddJuggling, setShowAddJuggling] = useState(false);
    const [jugglingForm, setJugglingForm] = useState({ date: new Date().toISOString().split('T')[0], count: '' });
    const [showAddHome, setShowAddHome] = useState(false);
    const [homeForm, setHomeForm] = useState({ date: new Date().toISOString().split('T')[0], title: '', duration: '30' });

    const isDirector = currentUser?.role === 'director';
    
    const displayPlayers = useMemo(() => {
        return players.filter(p => selectedTeamId === 'all' || p.teamId === selectedTeamId);
    }, [players, selectedTeamId]);

    const currentPlayer = useMemo(() => {
        return players.find(p => p.id === selectedPlayerId) || displayPlayers[0];
    }, [players, selectedPlayerId, displayPlayers]);

    // --- 颠球逻辑 ---
    const jugglingLeaderboard = useMemo(() => {
        return displayPlayers.map(p => {
            const max = p.jugglingHistory?.length ? Math.max(...p.jugglingHistory.map(h => h.count)) : 0;
            return { id: p.id, name: p.name, image: p.image, count: max, teamId: p.teamId };
        }).sort((a, b) => b.count - a.count);
    }, [displayPlayers]);

    const handleAddJuggling = () => {
        if (!currentPlayer || !jugglingForm.count) return;
        const record: JugglingRecord = {
            id: `jug-${Date.now()}`,
            playerId: currentPlayer.id,
            date: jugglingForm.date,
            count: parseInt(jugglingForm.count)
        };
        const updated = {
            ...currentPlayer,
            jugglingHistory: [...(currentPlayer.jugglingHistory || []), record]
        };
        onUpdatePlayer(updated);
        setJugglingForm({ ...jugglingForm, count: '' });
        setShowAddJuggling(false);
    };

    // --- 居家打卡日历逻辑 ---
    const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
    const firstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

    const homeStats = useMemo(() => {
        if (!currentPlayer) return { month: 0, quarter: 0, year: 0, count: 0 };
        const logs = currentPlayer.homeTrainingLogs || [];
        const now = new Date();
        
        const mTotal = logs.filter(l => l.date.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`))
                          .reduce((s, l) => s + l.duration, 0);
        
        const qStartMonth = Math.floor(viewMonth / 3) * 3 + 1;
        const qTotal = logs.filter(l => {
            const d = new Date(l.date);
            return d.getFullYear() === viewYear && (d.getMonth() + 1) >= qStartMonth && (d.getMonth() + 1) < qStartMonth + 3;
        }).reduce((s, l) => s + l.duration, 0);

        const yTotal = logs.filter(l => l.date.startsWith(`${viewYear}`)).reduce((s, l) => s + l.duration, 0);

        return { month: mTotal, quarter: qTotal, year: yTotal, count: logs.length };
    }, [currentPlayer, viewYear, viewMonth]);

    const handleAddHomeLog = () => {
        if (!currentPlayer || !homeForm.title) return;
        const log: HomeTrainingLog = {
            id: `home-${Date.now()}`,
            playerId: currentPlayer.id,
            date: homeForm.date,
            title: homeForm.title,
            duration: parseInt(homeForm.duration)
        };
        const updated = {
            ...currentPlayer,
            homeTrainingLogs: [...(currentPlayer.homeTrainingLogs || []), log]
        };
        onUpdatePlayer(updated);
        setHomeForm({ ...homeForm, title: '' });
        setShowAddHome(false);
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-bvb-black uppercase">技术成长中心</h2>
                    <p className="text-gray-500 font-bold">追踪颠球突破与居家自主训练数据</p>
                </div>
                <div className="flex gap-2">
                    <select 
                        value={selectedTeamId} 
                        onChange={e => { setSelectedTeamId(e.target.value); setSelectedPlayerId(''); }}
                        className="p-2 border rounded-lg text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-bvb-yellow"
                    >
                        <option value="all">所有梯队</option>
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100 overflow-x-auto no-scrollbar">
                <button onClick={() => setActiveTab('juggling')} className={`flex-1 min-w-[120px] py-3 rounded-lg text-sm font-black flex items-center justify-center gap-2 transition-all ${activeTab === 'juggling' ? 'bg-bvb-yellow text-bvb-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><Medal className="w-4 h-4" /> 颠球挑战</button>
                <button onClick={() => setActiveTab('home')} className={`flex-1 min-w-[120px] py-3 rounded-lg text-sm font-black flex items-center justify-center gap-2 transition-all ${activeTab === 'home' ? 'bg-bvb-yellow text-bvb-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><Calendar className="w-4 h-4" /> 居家统计</button>
                <button onClick={() => setActiveTab('tests')} className={`flex-1 min-w-[120px] py-3 rounded-lg text-sm font-black flex items-center justify-center gap-2 transition-all ${activeTab === 'tests' ? 'bg-bvb-yellow text-bvb-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><Target className="w-4 h-4" /> 技术测评</button>
                {isDirector && (
                    <button onClick={() => setActiveTab('configs')} className={`flex-1 min-w-[120px] py-3 rounded-lg text-sm font-black flex items-center justify-center gap-2 transition-all ${activeTab === 'configs' ? 'bg-bvb-black text-bvb-yellow shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><Settings className="w-4 h-4" /> 测评设置</button>
                )}
            </div>

            {/* TAB: Juggling */}
            {activeTab === 'juggling' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-right-4">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-black text-gray-800 flex items-center uppercase tracking-tighter"><BarChart3 className="w-5 h-5 mr-2 text-bvb-yellow" /> 俱乐部颠球英雄榜</h3>
                                <button onClick={() => setShowAddJuggling(true)} className="px-4 py-2 bg-bvb-black text-white text-xs font-black rounded-lg hover:bg-gray-800 flex items-center gap-2 shadow-lg"><Plus className="w-4 h-4" /> 录入新成绩</button>
                            </div>
                            <div className="space-y-3">
                                {jugglingLeaderboard.slice(0, 10).map((p, idx) => (
                                    <div key={p.id} className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100 group hover:border-bvb-yellow transition-all hover:translate-x-1 cursor-pointer" onClick={() => setSelectedPlayerId(p.id)}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${idx === 0 ? 'bg-bvb-yellow text-bvb-black scale-110 shadow-md' : idx === 1 ? 'bg-gray-300 text-gray-700' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-500'}`}>{idx + 1}</div>
                                        <img src={p.image} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                                        <div className="flex-1">
                                            <p className="font-black text-gray-800">{p.name}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">{teams.find(t => t.id === p.teamId)?.name}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-2xl font-black text-bvb-black">{p.count}</span>
                                            <span className="text-[10px] text-gray-400 ml-1 font-black uppercase">个</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-full">
                            <h3 className="font-black text-gray-800 mb-6 flex items-center uppercase tracking-tighter"><History className="w-5 h-5 mr-2 text-bvb-yellow" /> 个人进步曲线</h3>
                            {currentPlayer && (currentPlayer.jugglingHistory?.length || 0) > 0 ? (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                                        <img src={currentPlayer.image} className="w-12 h-12 rounded-full object-cover border-2 border-bvb-yellow" />
                                        <div>
                                            <p className="font-black text-gray-800">{currentPlayer.name}</p>
                                            <p className="text-xs text-green-600 font-black">历史最高: {Math.max(...(currentPlayer.jugglingHistory || []).map(h => h.count))} 个</p>
                                        </div>
                                    </div>
                                    <div className="h-48 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={(currentPlayer.jugglingHistory || []).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-10)}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                                <XAxis dataKey="date" hide />
                                                <YAxis hide domain={['auto', 'auto']} />
                                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                <Line type="monotone" dataKey="count" stroke="#000" strokeWidth={4} dot={{ fill: '#FDE100', stroke: '#000', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: '#000' }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-20 text-gray-400">选择球员查看历史进步</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: Home Training Calendar & Stats */}
            {activeTab === 'home' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in slide-in-from-right-4">
                    {/* Left: Stats Panel */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                            <div className="flex items-center gap-4 mb-6">
                                <img src={currentPlayer?.image} className="w-14 h-14 rounded-full object-cover border-2 border-bvb-yellow" />
                                <div>
                                    <h3 className="font-black text-xl text-gray-800">{currentPlayer?.name}</h3>
                                    <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded font-black text-gray-500 uppercase tracking-widest">自主训练档案</span>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-center">
                                    <p className="text-[10px] font-black text-green-600 uppercase mb-1">本月时长</p>
                                    <p className="text-2xl font-black text-green-700">{homeStats.month}<span className="text-xs ml-1">min</span></p>
                                </div>
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center">
                                    <p className="text-[10px] font-black text-blue-600 uppercase mb-1">本季时长</p>
                                    <p className="text-2xl font-black text-blue-700">{homeStats.quarter}<span className="text-xs ml-1">min</span></p>
                                </div>
                                <div className="bg-bvb-yellow/10 p-4 rounded-xl border border-bvb-yellow/20 text-center col-span-2">
                                    <p className="text-[10px] font-black text-bvb-black uppercase mb-1">{viewYear}年度总时长</p>
                                    <p className="text-3xl font-black text-gray-800">{homeStats.year}<span className="text-xs ml-1">min</span></p>
                                </div>
                            </div>

                            <button onClick={() => setShowAddHome(true)} className="w-full py-4 bg-bvb-black text-white font-black rounded-2xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95"><Activity className="w-5 h-5 text-bvb-yellow" /> 提交今日打卡</button>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                             <h4 className="font-black text-xs text-gray-400 uppercase tracking-widest mb-6">月度时长对比</h4>
                             <div className="h-40">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={Array.from({length: 12}, (_, i) => ({
                                        month: `${i+1}月`,
                                        duration: (currentPlayer?.homeTrainingLogs || [])
                                            .filter(l => {
                                                const d = new Date(l.date);
                                                return d.getFullYear() === viewYear && d.getMonth() === i;
                                            })
                                            .reduce((s, l) => s + l.duration, 0)
                                    }))}>
                                        <Bar dataKey="duration" radius={[4, 4, 0, 0]}>
                                            {Array.from({length: 12}).map((_, index) => (
                                                <Cell key={index} fill={index === viewMonth ? '#FDE100' : '#f3f4f6'} stroke={index === viewMonth ? '#000' : 'none'} />
                                            ))}
                                        </Bar>
                                        <XAxis dataKey="month" hide />
                                        <Tooltip cursor={{fill: 'transparent'}} />
                                    </BarChart>
                                </ResponsiveContainer>
                             </div>
                        </div>
                    </div>

                    {/* Right: Calendar View */}
                    <div className="lg:col-span-8">
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <h3 className="font-black text-gray-800 flex items-center uppercase"><Calendar className="w-5 h-5 mr-2 text-bvb-yellow" /> 训练日历</h3>
                                    <div className="flex items-center bg-white rounded-lg border p-1 shadow-sm">
                                        <button onClick={() => { if(viewMonth === 0) { setViewMonth(11); setViewYear(viewYear-1); } else setViewMonth(viewMonth-1); }} className="p-1 hover:bg-gray-100 rounded transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                                        <span className="px-4 font-black text-sm min-w-[100px] text-center">{viewYear}年 {viewMonth + 1}月</span>
                                        <button onClick={() => { if(viewMonth === 11) { setViewMonth(0); setViewYear(viewYear+1); } else setViewMonth(viewMonth+1); }} className="p-1 hover:bg-gray-100 rounded transition-colors"><ChevronRightIcon className="w-4 h-4" /></button>
                                    </div>
                                </div>
                                <div className="flex gap-2 text-[10px] font-black uppercase text-gray-400">
                                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-bvb-yellow border border-black/10 rounded-sm"></div> 已训练</div>
                                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-white border border-gray-200 rounded-sm"></div> 未记录</div>
                                </div>
                            </div>
                            
                            <div className="p-4 grid grid-cols-7 gap-1">
                                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                                    <div key={d} className="py-2 text-center text-[10px] font-black text-gray-400 tracking-widest">{d}</div>
                                ))}
                                {Array.from({ length: firstDayOfMonth(viewYear, viewMonth) }).map((_, i) => (
                                    <div key={`empty-${i}`} className="aspect-square bg-gray-50/50 rounded-xl"></div>
                                ))}
                                {Array.from({ length: daysInMonth(viewYear, viewMonth) }).map((_, i) => {
                                    const day = i + 1;
                                    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    const log = (currentPlayer?.homeTrainingLogs || []).find(l => l.date === dateStr);
                                    const isToday = dateStr === new Date().toISOString().split('T')[0];
                                    
                                    return (
                                        <div 
                                            key={day} 
                                            onClick={() => {
                                                if (log) {
                                                    alert(`训练记录：${log.title}\n时长：${log.duration} 分钟`);
                                                } else {
                                                    setHomeForm({ ...homeForm, date: dateStr });
                                                    setShowAddHome(true);
                                                }
                                            }}
                                            className={`aspect-square rounded-2xl border flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 relative group ${log ? 'bg-bvb-yellow border-bvb-black shadow-sm' : 'bg-white border-gray-100 hover:border-bvb-yellow'}`}
                                        >
                                            <span className={`text-sm font-black ${log ? 'text-bvb-black' : isToday ? 'text-bvb-yellow underline decoration-2' : 'text-gray-400'}`}>{day}</span>
                                            {log && <span className="text-[8px] font-black text-bvb-black mt-1 opacity-60">{log.duration}m</span>}
                                            {isToday && !log && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-bvb-yellow rounded-full animate-pulse"></div>}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="p-6 bg-gray-50 border-t">
                                <h4 className="font-black text-xs text-gray-400 uppercase tracking-widest mb-4">本月详情明细</h4>
                                <div className="space-y-2">
                                    {(currentPlayer?.homeTrainingLogs || [])
                                        .filter(l => l.date.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`))
                                        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                        .map(log => (
                                            <div key={log.id} className="flex justify-between items-center p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-yellow-50 flex items-center justify-center font-mono text-[10px] font-black text-bvb-black border border-bvb-yellow/30">{log.date.split('-')[2]}</div>
                                                    <span className="font-bold text-gray-700 text-sm">{log.title}</span>
                                                </div>
                                                <span className="font-mono text-xs font-black text-gray-400 bg-gray-50 px-2 py-0.5 rounded">{log.duration} min</span>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Add Juggling Record */}
            {showAddJuggling && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/20">
                        <div className="bg-bvb-black p-6 flex justify-between items-center text-white">
                            <h3 className="font-black text-xl flex items-center uppercase tracking-tighter"><Medal className="w-5 h-5 mr-3 text-bvb-yellow" /> 录入颠球数据</h3>
                            <button onClick={() => setShowAddJuggling(false)}><Trash2 className="w-5 h-5 text-gray-500 hover:text-white" /></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">选择球员</label>
                                <select className="w-full p-3 border rounded-xl font-bold bg-gray-50" value={selectedPlayerId} onChange={e => setSelectedPlayerId(e.target.value)}>
                                    {displayPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">训练日期</label>
                                    <input type="date" className="w-full p-3 border rounded-xl text-sm font-bold bg-gray-50" value={jugglingForm.date} onChange={e => setJugglingForm({...jugglingForm, date: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">最高个数</label>
                                    <input type="number" className="w-full p-3 border rounded-xl text-sm font-black bg-gray-50" value={jugglingForm.count} onChange={e => setJugglingForm({...jugglingForm, count: e.target.value})} placeholder="0" />
                                </div>
                            </div>
                            <button onClick={handleAddJuggling} className="w-full py-4 bg-bvb-yellow text-bvb-black font-black rounded-2xl shadow-xl hover:brightness-105 active:scale-95 transition-all">保存记录</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Add Home Training Log */}
            {showAddHome && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/20">
                        <div className="bg-bvb-black p-6 flex justify-between items-center text-white">
                            <h3 className="font-black text-xl flex items-center uppercase tracking-tighter"><Activity className="w-5 h-5 mr-3 text-bvb-yellow" /> 居家训练打卡</h3>
                            <button onClick={() => setShowAddHome(false)}><Trash2 className="w-5 h-5 text-gray-500 hover:text-white" /></button>
                        </div>
                        <div className="p-8 space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">打卡日期</label>
                                <input type="date" className="w-full p-3 border rounded-xl font-bold bg-gray-50" value={homeForm.date} onChange={e => setHomeForm({...homeForm, date: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">训练内容</label>
                                <input className="w-full p-3 border rounded-xl font-bold bg-gray-50" placeholder="如：运球练习、体能拉伸..." value={homeForm.title} onChange={e => setHomeForm({...homeForm, title: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">训练时长 (分钟)</label>
                                <select className="w-full p-3 border rounded-xl font-bold bg-gray-50" value={homeForm.duration} onChange={e => setHomeForm({...homeForm, duration: e.target.value})}>
                                    <option value="15">15 分钟</option>
                                    <option value="30">30 分钟</option>
                                    <option value="45">45 分钟</option>
                                    <option value="60">60 分钟</option>
                                    <option value="90">90 分钟</option>
                                </select>
                            </div>
                            <button onClick={handleAddHomeLog} className="w-full py-4 bg-bvb-yellow text-bvb-black font-black rounded-2xl shadow-xl hover:brightness-105 active:scale-95 transition-all">确认打卡</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TechnicalGrowth;
