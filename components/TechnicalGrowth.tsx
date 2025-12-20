import React, { useState, useMemo } from 'react';
import { Player, Team, JugglingRecord, HomeTrainingLog, TechTestDefinition, User } from '../types';
import { TrendingUp, Award, Activity, History, Plus, Target, CheckCircle, BarChart3, ChevronRight, User as UserIcon, Medal, Calendar, ChevronLeft, ChevronRight as ChevronRightIcon, Users, CheckSquare, Square, Save, Trash2, FileText, Download, Loader2, X, Search, Trophy, TrendingDown, Star, LayoutList, FileDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, AreaChart, Area } from 'recharts';
import { exportToPDF } from '../services/pdfService';

interface TechnicalGrowthProps {
    players: Player[];
    teams: Team[];
    currentUser: User | null;
    techTests?: TechTestDefinition[];
    onUpdatePlayer: (player: Player) => void;
    onUpdateTechTests?: (tests: TechTestDefinition[]) => void;
    appLogo?: string;
}

const TechnicalGrowth: React.FC<TechnicalGrowthProps> = ({ 
    players, teams, currentUser, techTests = [], onUpdatePlayer, onUpdateTechTests, appLogo 
}) => {
    const [activeTab, setActiveTab] = useState<'juggling' | 'home' | 'tests' | 'configs'>('juggling');
    const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.id || 'all');
    
    // 颠球录入状态
    const [jugglingPlayerId, setJugglingPlayerId] = useState<string>('');
    const [jugglingDate, setJugglingDate] = useState(new Date().toISOString().split('T')[0]);
    const [jugglingCount, setJugglingCount] = useState<string>('');
    const [jugglingSearch, setJugglingSearch] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    // 统计视图状态
    const [statPeriod, setStatPeriod] = useState<'month' | 'quarter' | 'year'>('month');
    const [viewYear, setViewYear] = useState(new Date().getFullYear());
    const [viewMonth, setViewMonth] = useState(new Date().getMonth());

    // Comment: Added missing state variables for Home Training features to fix errors
    const [homeDate, setHomeDate] = useState(new Date().toISOString().split('T')[0]);
    const [homeTitle, setHomeTitle] = useState('居家练习');
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
    const [detailPlayerId, setDetailPlayerId] = useState<string | null>(null);

    const displayPlayers = useMemo(() => {
        return players.filter(p => selectedTeamId === 'all' || p.teamId === selectedTeamId);
    }, [players, selectedTeamId]);

    const focusedPlayer = useMemo(() => {
        return players.find(p => p.id === jugglingPlayerId) || null;
    }, [players, jugglingPlayerId]);

    // --- 荣耀等级助手函数 ---
    const getHonorBadge = (max: number) => {
        if (max >= 100) return { label: '五星传奇', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
        if (max >= 50) return { label: '四星大师', color: 'bg-purple-100 text-purple-700 border-purple-200' };
        if (max >= 20) return { label: '三星高手', color: 'bg-red-100 text-red-700 border-red-200' };
        if (max >= 10) return { label: '二星达人', color: 'bg-blue-100 text-blue-700 border-blue-200' };
        if (max >= 5) return { label: '一星小将', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' };
        if (max >= 3) return { label: '入门学徒', color: 'bg-green-100 text-green-700 border-green-200' };
        return { label: '待挑战', color: 'bg-gray-50 text-gray-400 border-gray-100' };
    };

    // Comment: Added missing getHomeStats helper function to calculate training frequencies for the UI
    const getHomeStats = (player: Player) => {
        const history = player.homeTrainingLogs || [];
        const mKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
        const monthCount = history.filter(h => h.date.startsWith(mKey)).length;
        const yearCount = history.filter(h => h.date.startsWith(String(viewYear))).length;
        return { monthCount, yearCount };
    };

    // --- 颠球挑战逻辑 ---
    const handleAddJuggling = () => {
        const count = parseInt(jugglingCount);
        if (!jugglingPlayerId || isNaN(count)) return;

        const player = players.find(p => p.id === jugglingPlayerId);
        if (player) {
            const newRecord: JugglingRecord = {
                id: `jug-${Date.now()}`,
                playerId: jugglingPlayerId,
                date: jugglingDate,
                count: count
            };
            onUpdatePlayer({
                ...player,
                jugglingHistory: [...(player.jugglingHistory || []), newRecord]
            });
            setJugglingCount('');
            alert(`${player.name} 的成绩已保存！`);
        }
    };

    const handleExportReport = async () => {
        if (!focusedPlayer) return;
        setIsExporting(true);
        try {
            await exportToPDF('juggling-report-pdf', `颠球挑战档案_${focusedPlayer.name}`);
        } catch (e) {
            alert('导出失败');
        } finally {
            setIsExporting(false);
        }
    };

    // 获取特定周期内的统计数据
    const getJugglingStats = (player: Player) => {
        const history = player.jugglingHistory || [];
        let filtered = history;

        if (statPeriod === 'month') {
            const mKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
            filtered = history.filter(h => h.date.startsWith(mKey));
        } else if (statPeriod === 'quarter') {
            const qStartMonth = Math.floor(viewMonth / 3) * 3 + 1;
            filtered = history.filter(h => {
                const d = new Date(h.date);
                return d.getFullYear() === viewYear && (d.getMonth() + 1) >= qStartMonth && (d.getMonth() + 1) < qStartMonth + 3;
            });
        } else {
            filtered = history.filter(h => h.date.startsWith(String(viewYear)));
        }

        const counts = filtered.map(h => h.count);
        return {
            max: counts.length ? Math.max(...counts) : 0,
            avg: counts.length ? Math.round(counts.reduce((a, b) => a + b, 0) / counts.length) : 0,
            count: filtered.length,
            records: filtered.sort((a, b) => b.date.localeCompare(a.date))
        };
    };

    const jugglingLeaderboard = useMemo(() => {
        return displayPlayers.map(p => ({
            ...p,
            stats: getJugglingStats(p)
        })).sort((a, b) => b.stats.max - a.stats.max);
    }, [displayPlayers, statPeriod, viewYear, viewMonth]);

    const jugglingTrendData = useMemo(() => {
        if (!focusedPlayer || !focusedPlayer.jugglingHistory) return [];
        return [...focusedPlayer.jugglingHistory]
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(h => ({
                date: h.date,
                displayDate: h.date.substring(5),
                count: h.count
            }));
    }, [focusedPlayer]);

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-bvb-black uppercase italic tracking-tighter">技术成长中心</h2>
                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Digital Performance Tracking & Analytics</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-white rounded-xl border p-1 shadow-sm shrink-0">
                        <button onClick={() => { if(viewMonth === 0) { setViewMonth(11); setViewYear(viewYear-1); } else setViewMonth(viewMonth-1); }} className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><ChevronLeft className="w-5 h-5 text-gray-400" /></button>
                        <span className="px-4 font-black text-xs min-w-[90px] text-center">{viewYear}年 {viewMonth + 1}月</span>
                        <button onClick={() => { if(viewMonth === 11) { setViewMonth(0); setViewYear(viewYear+1); } else setViewMonth(viewMonth+1); }} className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><ChevronRightIcon className="w-5 h-5 text-gray-400" /></button>
                    </div>
                    <select 
                        value={selectedTeamId} 
                        onChange={e => setSelectedTeamId(e.target.value)}
                        className="p-2 border rounded-xl text-xs font-black bg-white outline-none focus:ring-2 focus:ring-bvb-yellow"
                    >
                        <option value="all">所有梯队</option>
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Main Tabs */}
            <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto no-scrollbar">
                <button onClick={() => setActiveTab('juggling')} className={`flex-1 min-w-[120px] py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all ${activeTab === 'juggling' ? 'bg-bvb-yellow text-bvb-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><Medal className="w-4 h-4" /> 颠球挑战</button>
                <button onClick={() => setActiveTab('home')} className={`flex-1 min-w-[120px] py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all ${activeTab === 'home' ? 'bg-bvb-yellow text-bvb-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><TrendingUp className="w-4 h-4" /> 居家打卡</button>
                <button onClick={() => setActiveTab('tests')} className={`flex-1 min-w-[120px] py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all ${activeTab === 'tests' ? 'bg-bvb-yellow text-bvb-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><Target className="w-4 h-4" /> 技术测评</button>
            </div>

            {/* TAB: Juggling Challenge */}
            {activeTab === 'juggling' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in slide-in-from-right-4">
                    
                    {/* Left: Quick Entry & Trend */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
                            <h3 className="font-black text-gray-800 mb-6 flex items-center uppercase tracking-tighter text-lg"><Plus className="w-6 h-6 mr-2 text-bvb-yellow" /> 录入颠球成绩</h3>
                            
                            <div className="space-y-4">
                                <div className="relative">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">选择球员</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                        <input 
                                            className="w-full pl-9 pr-4 py-3 border rounded-xl font-bold bg-gray-50 focus:ring-2 focus:ring-bvb-yellow outline-none text-sm"
                                            placeholder="搜索姓名..."
                                            value={jugglingSearch}
                                            onChange={e => setJugglingSearch(e.target.value)}
                                        />
                                    </div>
                                    <div className="mt-2 grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto custom-scrollbar p-1">
                                        {displayPlayers.filter(p => p.name.includes(jugglingSearch)).map(p => (
                                            <button 
                                                key={p.id} 
                                                onClick={() => setJugglingPlayerId(p.id)}
                                                className={`p-2 rounded-xl border text-xs font-bold transition-all text-left truncate flex items-center gap-2 ${jugglingPlayerId === p.id ? 'bg-bvb-black text-bvb-yellow border-bvb-black shadow-lg' : 'bg-white text-gray-600 hover:border-bvb-yellow'}`}
                                            >
                                                <img src={p.image} className="w-5 h-5 rounded-full object-cover" />
                                                <span className="truncate">{p.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">挑战日期</label>
                                        <input type="date" className="w-full p-3 border rounded-xl font-bold bg-gray-50 text-sm focus:ring-2 focus:ring-bvb-yellow outline-none" value={jugglingDate} onChange={e => setJugglingDate(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">完成个数</label>
                                        <input type="number" className="w-full p-3 border rounded-xl font-black bg-gray-50 text-center text-lg focus:ring-2 focus:ring-bvb-yellow outline-none" placeholder="0" value={jugglingCount} onChange={e => setJugglingCount(e.target.value)} />
                                    </div>
                                </div>

                                <button 
                                    onClick={handleAddJuggling}
                                    disabled={!jugglingPlayerId || !jugglingCount}
                                    className="w-full py-4 bg-bvb-black text-bvb-yellow font-black rounded-2xl shadow-xl disabled:opacity-30 hover:brightness-110 active:scale-95 transition-all uppercase italic"
                                >
                                    保存记录 Record Achievement
                                </button>
                            </div>
                        </div>

                        {/* Selected Player Dashboard (PDF Target) */}
                        {focusedPlayer && (
                            <div id="juggling-report-pdf" className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 animate-in fade-in duration-500 space-y-6 overflow-hidden relative">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <img src={focusedPlayer.image} className="w-12 h-12 rounded-full object-cover border-2 border-bvb-yellow" />
                                        <div>
                                            <h3 className="font-black text-gray-800 text-lg leading-tight">{focusedPlayer.name}</h3>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">#{focusedPlayer.number} • 技术成长档案</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleExportReport}
                                        disabled={isExporting}
                                        className="p-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-bvb-black hover:text-bvb-yellow transition-all"
                                        title="导出 PDF 报表"
                                    >
                                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                                        <p className="text-[9px] font-black text-gray-400 uppercase mb-1">本周最高</p>
                                        <p className="text-2xl font-black text-bvb-black">{getJugglingStats(focusedPlayer).max}</p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                                        <p className="text-[9px] font-black text-gray-400 uppercase mb-1">荣誉等级</p>
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${getHonorBadge(getJugglingStats(focusedPlayer).max).color}`}>
                                            {getHonorBadge(getJugglingStats(focusedPlayer).max).label}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-black text-gray-800 flex items-center uppercase tracking-tighter text-xs"><TrendingUp className="w-4 h-4 mr-2 text-bvb-yellow" /> 进步曲线</h4>
                                        <span className="text-[9px] font-black text-gray-400 uppercase">历史挑战趋势</span>
                                    </div>
                                    <div className="h-40 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={jugglingTrendData}>
                                                <defs>
                                                    <linearGradient id="colorJugReport" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#FDE100" stopOpacity={0.4}/>
                                                        <stop offset="95%" stopColor="#FDE100" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                                <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 'bold' }} />
                                                <YAxis hide />
                                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                <Area type="monotone" dataKey="count" stroke="#FDE100" strokeWidth={3} fillOpacity={1} fill="url(#colorJugReport)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-4 border-t border-gray-100">
                                    <h4 className="font-black text-gray-800 flex items-center uppercase tracking-tighter text-xs"><LayoutList className="w-4 h-4 mr-2 text-bvb-yellow" /> 详细挑战清单</h4>
                                    <div className="max-h-60 overflow-y-auto custom-scrollbar pr-1">
                                        <table className="w-full text-left text-[11px]">
                                            <thead className="bg-gray-50 text-gray-400 font-black uppercase sticky top-0">
                                                <tr>
                                                    <th className="p-2 border-b">日期</th>
                                                    <th className="p-2 border-b text-right">成绩</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {(focusedPlayer.jugglingHistory || []).sort((a,b) => b.date.localeCompare(a.date)).map(h => (
                                                    <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="p-2 font-mono text-gray-500">{h.date}</td>
                                                        <td className="p-2 text-right font-black text-bvb-black">{h.count} 个</td>
                                                    </tr>
                                                ))}
                                                {(focusedPlayer.jugglingHistory || []).length === 0 && (
                                                    <tr><td colSpan={2} className="p-4 text-center text-gray-400 italic">暂无历史记录</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                
                                <div className="hidden pdf-only flex justify-between items-center mt-6 pt-4 border-t-2 border-bvb-yellow">
                                    <img src={appLogo} className="w-10 h-10 object-contain" />
                                    <span className="text-[10px] font-black text-gray-300">BORUSSIA DORTMUND ACADEMY - PERFORMANCE REPORT</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Detailed Table & Period Stats */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                            <div className="p-6 border-b flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50">
                                <div className="flex items-center gap-4">
                                    <h3 className="font-black text-gray-800 flex items-center uppercase italic text-lg"><Trophy className="w-6 h-6 mr-2 text-bvb-yellow" /> 挑战光荣榜</h3>
                                    <div className="flex bg-white p-1 rounded-xl border shadow-sm">
                                        <button onClick={() => setStatPeriod('month')} className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${statPeriod === 'month' ? 'bg-bvb-black text-bvb-yellow' : 'text-gray-400 hover:text-gray-600'}`}>按月</button>
                                        <button onClick={() => setStatPeriod('quarter')} className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${statPeriod === 'quarter' ? 'bg-bvb-black text-bvb-yellow' : 'text-gray-400 hover:text-gray-600'}`}>按季</button>
                                        <button onClick={() => setStatPeriod('year')} className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${statPeriod === 'year' ? 'bg-bvb-black text-bvb-yellow' : 'text-gray-400 hover:text-gray-600'}`}>全年度</button>
                                    </div>
                                </div>
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white px-3 py-1.5 rounded-full border border-gray-100">
                                    {statPeriod === 'month' ? `统计周期: ${viewYear}-${viewMonth + 1}` : statPeriod === 'quarter' ? `统计周期: ${viewYear} Q${Math.floor(viewMonth / 3) + 1}` : `统计周期: ${viewYear} 全年`}
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-100/50 font-black text-gray-400 uppercase text-[10px] tracking-widest border-b">
                                        <tr>
                                            <th className="px-6 py-4">排名</th>
                                            <th className="px-6 py-4">球员姓名</th>
                                            <th className="px-6 py-4 text-center">最高纪录</th>
                                            <th className="px-6 py-4 text-center">平均成绩</th>
                                            <th className="px-6 py-4 text-center">挑战次数</th>
                                            <th className="px-6 py-4 text-right">荣耀等级</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {jugglingLeaderboard.map((p, idx) => {
                                            const badge = getHonorBadge(p.stats.max);
                                            return (
                                                <tr key={p.id} className={`hover:bg-yellow-50/30 transition-colors cursor-pointer group ${jugglingPlayerId === p.id ? 'bg-yellow-50/50' : ''}`} onClick={() => setJugglingPlayerId(p.id)}>
                                                    <td className="px-6 py-4">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${idx < 3 ? 'bg-bvb-yellow text-bvb-black border-2 border-bvb-black shadow-md' : 'bg-gray-100 text-gray-400'}`}>
                                                            {idx + 1}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <img src={p.image} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm transition-transform group-hover:scale-110" />
                                                            <div>
                                                                <p className="font-black text-gray-800 text-sm group-hover:text-bvb-black group-hover:underline decoration-bvb-yellow decoration-2 underline-offset-4 transition-all">{p.name}</p>
                                                                <p className="text-[10px] text-gray-400 font-bold uppercase">{teams.find(t => t.id === p.teamId)?.level}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="text-xl font-black text-bvb-black">{p.stats.max}</span>
                                                        <span className="text-[10px] text-gray-400 ml-1 font-bold">个</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-bold text-gray-500 tabular-nums">
                                                        {p.stats.avg}
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-bold text-gray-400">
                                                        {p.stats.count}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border shadow-sm flex items-center justify-center gap-1 min-w-[80px] transition-all uppercase ${badge.color}`}>
                                                            {p.stats.max >= 100 && <Star className="w-2.5 h-2.5 fill-current" />}
                                                            {badge.label}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: Home Training */}
            {activeTab === 'home' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in slide-in-from-right-4">
                    {/* Left: Quick Batch Check-in */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
                            <h3 className="font-black text-gray-800 mb-6 flex items-center uppercase tracking-tighter text-lg"><CheckSquare className="w-6 h-6 mr-2 text-bvb-yellow" /> 快速批量打卡</h3>
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">选择日期</label>
                                    <input type="date" className="w-full p-3 border rounded-xl font-bold bg-gray-50 focus:ring-2 focus:ring-bvb-yellow outline-none" value={homeDate} onChange={e => setHomeDate(e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">训练主题</label>
                                    <input className="w-full p-3 border rounded-xl font-bold bg-gray-50 focus:ring-2 focus:ring-bvb-yellow outline-none" placeholder="如：触球练习" value={homeTitle} onChange={e => setHomeTitle(e.target.value)} />
                                </div>
                            </div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex justify-between">
                                <span>待选球员 ({displayPlayers.length})</span>
                                <button onClick={() => setSelectedPlayerIds(selectedPlayerIds.size === displayPlayers.length ? new Set() : new Set(displayPlayers.map(p => p.id)))} className="text-bvb-black hover:underline">全选/取消</button>
                            </p>
                            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar mb-6">
                                {displayPlayers.map(p => (
                                    <button key={p.id} onClick={() => {
                                        const next = new Set(selectedPlayerIds);
                                        if (next.has(p.id)) next.delete(p.id);
                                        else next.add(p.id);
                                        setSelectedPlayerIds(next);
                                    }} className={`flex items-center gap-2 p-2 rounded-xl border-2 transition-all ${selectedPlayerIds.has(p.id) ? 'bg-bvb-yellow/10 border-bvb-yellow' : 'bg-white border-gray-100'}`}>
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedPlayerIds.has(p.id) ? 'bg-bvb-yellow border-bvb-black' : 'border-gray-300'}`}>{selectedPlayerIds.has(p.id) && <CheckCircle className="w-3 h-3 text-bvb-black" />}</div>
                                        <span className="text-xs font-bold text-gray-700 truncate">{p.name}</span>
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => {
                                selectedPlayerIds.forEach(id => {
                                    const p = players.find(p => p.id === id);
                                    if (p) onUpdatePlayer({ ...p, homeTrainingLogs: [...(p.homeTrainingLogs || []), { id: `home-${Date.now()}-${id}`, playerId: id, date: homeDate, title: homeTitle, duration: 0 }] });
                                });
                                setSelectedPlayerIds(new Set());
                                alert('批量打卡成功！');
                            }} disabled={selectedPlayerIds.size === 0} className="w-full py-4 bg-bvb-black text-bvb-yellow font-black rounded-2xl shadow-xl disabled:opacity-30 flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all"><Plus className="w-5 h-5" /> 确认 {selectedPlayerIds.size} 人打卡</button>
                        </div>
                    </div>

                    {/* Right: Frequency Statistics */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-6 bg-gray-50 border-b flex flex-col md:flex-row justify-between items-center gap-4">
                                <h3 className="font-black text-gray-800 flex items-center uppercase italic text-lg"><BarChart3 className="w-6 h-6 mr-2 text-bvb-yellow" /> 居家训练计次榜</h3>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-gray-200">点击球员查看打卡明细</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-100/50 font-black text-gray-400 uppercase text-[10px] tracking-widest border-b">
                                        <tr>
                                            <th className="px-6 py-4">球员</th>
                                            <th className="px-6 py-4 text-center">本月次数</th>
                                            <th className="px-6 py-4 text-center">年度总计</th>
                                            <th className="px-6 py-4">状态</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {displayPlayers.map((p, idx) => {
                                            const stats = getHomeStats(p);
                                            return (
                                                <tr key={p.id} onClick={() => setDetailPlayerId(p.id)} className="hover:bg-yellow-50/50 transition-colors cursor-pointer group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] ${idx < 3 ? 'bg-bvb-yellow text-bvb-black' : 'bg-gray-100 text-gray-400'}`}>{idx + 1}</div>
                                                            <img src={p.image} className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm" />
                                                            <span className="font-black text-gray-800 group-hover:text-bvb-black underline decoration-transparent group-hover:decoration-bvb-yellow transition-all">{p.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-black text-lg text-bvb-black">{stats.monthCount}</td>
                                                    <td className="px-6 py-4 text-center font-bold text-gray-400">{stats.yearCount}</td>
                                                    <td className="px-6 py-4">
                                                        {stats.monthCount >= 15 ? (
                                                            <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-1 rounded-full border border-green-200 uppercase">勤奋标兵</span>
                                                        ) : stats.monthCount > 0 ? (
                                                            <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-1 rounded-full border border-blue-100 uppercase">已开始</span>
                                                        ) : <span className="text-gray-300 text-[10px] font-black uppercase">未开启</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Comment: Added Detail Modal for Home Training logs when a player is selected from the leaderboard */}
            {detailPlayerId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-bvb-black p-6 flex justify-between items-center text-white shrink-0">
                            <div>
                                <h3 className="font-bold text-xl flex items-center tracking-tighter uppercase">打卡记录详情</h3>
                                <p className="text-xs text-gray-400 mt-1">{players.find(p => p.id === detailPlayerId)?.name}</p>
                            </div>
                            <button onClick={() => setDetailPlayerId(null)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-3">
                            {players.find(p => p.id === detailPlayerId)?.homeTrainingLogs?.sort((a, b) => b.date.localeCompare(a.date)).map(log => (
                                <div key={log.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl border border-gray-100">
                                    <div>
                                        <p className="font-black text-gray-800 text-sm">{log.title}</p>
                                        <p className="text-[10px] text-gray-400 font-mono">{log.date}</p>
                                    </div>
                                    <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">计次 +1</div>
                                </div>
                            )) || <p className="text-center py-10 text-gray-400 italic text-sm">暂无记录</p>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TechnicalGrowth;