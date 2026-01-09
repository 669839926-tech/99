
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Player, Team, JugglingRecord, HomeTrainingLog, TechTestDefinition, TechTestResult, User } from '../types';
import { TrendingUp, Award, Activity, History, Plus, Target, CheckCircle, BarChart3, ChevronRight, User as UserIcon, Medal, Calendar, ChevronLeft, ChevronRight as ChevronRightIcon, Users, CheckSquare, Square, Save, Trash2, FileText, Download, Loader2, X, Search, Trophy, TrendingDown, Star, LayoutList, FileDown, Settings, Gauge, ArrowRight, ClipboardList, FileSpreadsheet, Upload, Clock, Sparkles } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell, AreaChart, Area } from 'recharts';
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

const getMondayOfCurrentWeek = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
};

const TechnicalGrowth: React.FC<TechnicalGrowthProps> = ({ 
    players, teams, currentUser, techTests = [], onUpdatePlayer, onUpdateTechTests, appLogo 
}) => {
    const isDirector = currentUser?.role === 'director';
    const isCoach = currentUser?.role === 'coach';
    
    const managedTeams = useMemo(() => {
        if (isDirector) return teams;
        return teams.filter(t => currentUser?.teamIds?.includes(t.id));
    }, [teams, currentUser, isDirector]);

    const [activeTab, setActiveTab] = useState<'juggling' | 'home' | 'tests'>('juggling');
    const [selectedTeamId, setSelectedTeamId] = useState<string>(() => {
        if (isCoach && managedTeams.length > 0) return managedTeams[0].id;
        return 'all';
    });

    const [isExportingHome, setIsExportingHome] = useState(false);
    const [jugglingPlayerId, setJugglingPlayerId] = useState<string>('');
    const [jugglingDate, setJugglingDate] = useState(new Date().toISOString().split('T')[0]);
    const [jugglingCount, setJugglingCount] = useState<string>('');
    const [jugglingSearch, setJugglingSearch] = useState('');

    const [statPeriod, setStatPeriod] = useState<'month' | 'quarter' | 'year'>('month');
    const [viewYear, setViewYear] = useState(new Date().getFullYear());
    const [viewMonth, setViewMonth] = useState(new Date().getMonth());

    const [homeDate, setHomeDate] = useState(new Date().toISOString().split('T')[0]);
    const [homeTitle, setHomeTitle] = useState('居家练习');
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
    const [detailPlayerId, setDetailPlayerId] = useState<string | null>(null);
    const [jugglingDetailPlayerId, setJugglingDetailPlayerId] = useState<string | null>(null);

    const [showConfigModal, setShowConfigModal] = useState(false);
    const [newTestDef, setNewTestDef] = useState({ name: '', unit: '', description: '' });
    const [selectedTestId, setSelectedTestId] = useState<string>('');
    const [testEntryDate, setTestEntryDate] = useState(new Date().toISOString().split('T')[0]);
    const [testScores, setTestScores] = useState<Record<string, string>>({});
    const [isSavingTests, setIsSavingTests] = useState(false);
    const [isExportingTech, setIsExportingTech] = useState(false);
    const [showTestHistoryPlayerId, setShowTestHistoryPlayerId] = useState<string | null>(null);

    const resultsFileInputRef = useRef<HTMLInputElement>(null);

    const displayPlayers = useMemo(() => {
        const basePlayers = isDirector 
            ? players 
            : players.filter(p => currentUser?.teamIds?.includes(p.teamId));
        return basePlayers.filter(p => selectedTeamId === 'all' || p.teamId === selectedTeamId);
    }, [players, selectedTeamId, currentUser, isDirector]);

    // 计算颠球排行统计并增加历史最佳
    const jugglingLeaderboard = useMemo(() => {
        return displayPlayers.map(p => {
            const allHistory = p.jugglingHistory || [];
            // 计算历年历史最佳 (全局)
            const allTimeBest = allHistory.length > 0 ? Math.max(...allHistory.map(h => h.count)) : 0;
            
            let filtered = allHistory;
            const year = viewYear;
            const month = viewMonth;

            if (statPeriod === 'month') {
                const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
                filtered = allHistory.filter(h => h.date.startsWith(prefix));
            } else if (statPeriod === 'quarter') {
                const qStartMonth = Math.floor(month / 3) * 3;
                filtered = allHistory.filter(h => {
                    const d = new Date(h.date);
                    return d.getFullYear() === year && d.getMonth() >= qStartMonth && d.getMonth() < qStartMonth + 3;
                });
            } else if (statPeriod === 'year') {
                filtered = allHistory.filter(h => h.date.startsWith(String(year)));
            }

            const counts = filtered.map(h => h.count);
            const max = counts.length > 0 ? Math.max(...counts) : 0;
            const sum = counts.reduce((a, b) => a + b, 0);
            const avg = counts.length > 0 ? (sum / counts.length).toFixed(1) : '0';
            const count = counts.length;

            // 标记是否在当前周期打破了历史纪录
            const isBreakingRecord = max > 0 && max === allTimeBest;

            return { ...p, stats: { max, avg, count, allTimeBest, isBreakingRecord } };
        }).filter(p => p.stats.count > 0 || p.stats.allTimeBest > 0).sort((a, b) => b.stats.max - a.stats.max);
    }, [displayPlayers, statPeriod, viewYear, viewMonth]);

    const homeTrainingLeaderboard = useMemo(() => {
        const today = new Date();
        const isCurrentMonth = today.getFullYear() === viewYear && today.getMonth() === viewMonth;
        
        return displayPlayers.map(p => {
            const history = p.homeTrainingLogs || [];
            const monday = getMondayOfCurrentWeek();
            // 周统计仅在查看本月时显示实际意义，否则仅作为参考
            const weekCount = history.filter(h => h.date >= monday).length;
            const mKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
            const monthCount = history.filter(h => h.date.startsWith(mKey)).length;
            const yearCount = history.filter(h => h.date.startsWith(String(viewYear))).length;
            
            return { 
                ...p, 
                stats: { weekCount, monthCount, yearCount, isCurrentMonthView: isCurrentMonth } 
            };
        }).sort((a, b) => b.stats.yearCount - a.stats.yearCount);
    }, [displayPlayers, viewYear, viewMonth]);

    const handleBatchHomeCheckin = () => {
        if (selectedPlayerIds.size === 0) return;
        let successCount = 0;
        let skipCount = 0;
        selectedPlayerIds.forEach(id => {
            const p = players.find(p => p.id === id);
            if (p) {
                const isAlreadyCheckedIn = (p.homeTrainingLogs || []).some(log => log.date === homeDate);
                if (!isAlreadyCheckedIn) {
                    onUpdatePlayer({ 
                        ...p, 
                        homeTrainingLogs: [...(p.homeTrainingLogs || []), { id: `home-${Date.now()}-${id}`, playerId: id, date: homeDate, title: homeTitle, duration: 0 }] 
                    });
                    successCount++;
                } else {
                    skipCount++;
                }
            }
        });
        setSelectedPlayerIds(new Set());
        if (skipCount > 0) {
            alert(`打卡完成！成功：${successCount}人。跳过：${skipCount}人（当日已打卡）。`);
        } else {
            alert(`成功为 ${successCount} 名球员完成打卡！`);
        }
    };

    const JugglingHistoryModal = () => {
        if (!jugglingDetailPlayerId) return null;
        const player = players.find(p => p.id === jugglingDetailPlayerId);
        if (!player) return null;
        const sortedHistory = [...(player.jugglingHistory || [])].sort((a, b) => b.date.localeCompare(a.date));

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                    <div className="bg-bvb-black p-4 flex justify-between items-center text-white shrink-0">
                        <div className="flex items-center gap-3">
                            <img src={player.image} className="w-10 h-10 rounded-full object-cover border-2 border-bvb-yellow" />
                            <div>
                                <h3 className="font-bold text-lg">{player.name} 颠球挑战历史</h3>
                                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Historical Best: {Math.max(...(player.jugglingHistory?.map(h => h.count) || [0]))}</p>
                            </div>
                        </div>
                        <button onClick={() => setJugglingDetailPlayerId(null)} className="p-1 hover:bg-gray-800 rounded-lg transition-colors"><X className="w-6 h-6" /></button>
                    </div>
                    <div className="p-6 overflow-y-auto max-h-[60vh] space-y-3 custom-scrollbar">
                        {sortedHistory.length > 0 ? sortedHistory.map(record => (
                            <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl group hover:bg-white hover:border-bvb-yellow/30 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white rounded-lg flex flex-col items-center justify-center shadow-sm shrink-0 border border-gray-100">
                                        <span className="text-xl font-black text-bvb-black leading-none">{record.count}</span>
                                        <span className="text-[8px] text-gray-400 font-bold uppercase mt-0.5">PTS</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 text-sm leading-none mb-1">完成挑战</p>
                                        <p className="text-[10px] text-gray-400 font-mono flex items-center"><Calendar className="w-2.5 h-2.5 mr-1" /> {record.date}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => {
                                        if (confirm('确定要删除这条成绩记录吗？该操作不可撤销。')) {
                                            onUpdatePlayer({
                                                ...player,
                                                jugglingHistory: (player.jugglingHistory || []).filter(h => h.id !== record.id)
                                            });
                                        }
                                    }}
                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        )) : (
                            <div className="py-20 text-center text-gray-300 italic font-black uppercase text-xs tracking-widest">No records found</div>
                        )}
                    </div>
                    <div className="bg-gray-50 p-4 border-t flex justify-end">
                        <button onClick={() => setJugglingDetailPlayerId(null)} className="px-6 py-2 bg-bvb-black text-white font-bold rounded-lg hover:bg-gray-800 transition-colors shadow-lg">关闭窗口</button>
                    </div>
                </div>
            </div>
        );
    };

    const HomeLogDetailModal = () => {
        if (!detailPlayerId) return null;
        const player = players.find(p => p.id === detailPlayerId);
        if (!player) return null;
        const sortedLogs = [...(player.homeTrainingLogs || [])].sort((a,b) => b.date.localeCompare(a.date));
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                    <div className="bg-bvb-black p-4 flex justify-between items-center text-white shrink-0">
                        <div className="flex items-center gap-3">
                            <img src={player.image} className="w-10 h-10 rounded-full object-cover border-2 border-bvb-yellow" />
                            <div>
                                <h3 className="font-bold text-lg">{player.name} 打卡档案</h3>
                                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Training History Records</p>
                            </div>
                        </div>
                        <button onClick={() => setDetailPlayerId(null)} className="p-1 hover:bg-gray-800 rounded-lg transition-colors"><X className="w-6 h-6" /></button>
                    </div>
                    <div className="p-6 overflow-y-auto max-h-[60vh] space-y-3 custom-scrollbar">
                        {sortedLogs.length > 0 ? sortedLogs.map(log => (
                            <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl group hover:bg-white hover:border-bvb-yellow/30 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0 border border-gray-100">
                                        <History className="w-5 h-5 text-bvb-yellow" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 text-sm leading-none mb-1">{log.title || '居家练习'}</p>
                                        <p className="text-[10px] text-gray-400 font-mono flex items-center"><Clock className="w-2.5 h-2.5 mr-1" /> {log.date}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => {
                                        if (confirm('确定要删除这条打卡记录吗？')) {
                                            onUpdatePlayer({
                                                ...player,
                                                homeTrainingLogs: (player.homeTrainingLogs || []).filter(l => l.id !== log.id)
                                            });
                                        }
                                    }}
                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        )) : (
                            <div className="py-20 text-center text-gray-300 italic font-black uppercase text-xs tracking-widest">No records found</div>
                        )}
                    </div>
                    <div className="bg-gray-50 p-4 border-t flex justify-end">
                        <button onClick={() => setDetailPlayerId(null)} className="px-6 py-2 bg-bvb-black text-white font-bold rounded-lg hover:bg-gray-800 transition-colors shadow-lg">关闭窗口</button>
                    </div>
                </div>
            </div>
        );
    };

    const getPlayerLatestResult = (player: Player, testId: string) => {
        if (!player.testResults) return null;
        return [...player.testResults]
            .filter(r => r.testId === testId)
            .sort((a, b) => b.date.localeCompare(a.date))[0] || null;
    };

    const isLowerBetter = (unit?: string) => {
        if (!unit) return false;
        const lowBetterUnits = ['秒', 's', 'sec', '分', 'min'];
        return lowBetterUnits.some(u => unit.toLowerCase().includes(u));
    };

    const handleImportResultsCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target?.result as string;
            const lines = text.split('\n');
            const newScores: Record<string, string> = { ...testScores };
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
                if (cols.length >= 4) {
                    const idCard = cols[2].replace(/^'/, '');
                    const score = cols[3];
                    const player = displayPlayers.find(p => p.idCard === idCard);
                    if (player && score) {
                        newScores[player.id] = score;
                    }
                }
            }
            setTestScores(newScores);
        };
        reader.readAsText(file);
    };

    const handleExportTechPDF = async () => {
        setIsExportingTech(true);
        const testName = techTests.find(t => t.id === selectedTestId)?.name || '技术测试';
        try {
            await exportToPDF('tech-test-report-pdf', `${testName}_测评报告_${testEntryDate}`);
        } catch {
            alert('导出失败');
        } finally {
            setIsExportingTech(false);
        }
    };

    const handleSaveBatchTests = async () => {
        setIsSavingTests(true);
        try {
            for (const [playerId, score] of Object.entries(testScores)) {
                const val = parseFloat(score);
                if (isNaN(val)) continue;
                const player = players.find(p => p.id === playerId);
                if (player) {
                    const newResult: TechTestResult = {
                        id: `tr-${Date.now()}-${playerId}`,
                        testId: selectedTestId,
                        playerId,
                        date: testEntryDate,
                        value: val,
                        coachId: currentUser?.id
                    };
                    onUpdatePlayer({
                        ...player,
                        testResults: [...(player.testResults || []), newResult]
                    });
                }
            }
            setTestScores({});
            alert('成绩保存成功！');
        } catch {
            alert('保存失败');
        } finally {
            setIsSavingTests(false);
        }
    };

    const handleAddTestDef = () => {
        if (!newTestDef.name || !newTestDef.unit) return;
        const newDef: TechTestDefinition = {
            id: `test-${Date.now()}`,
            name: newTestDef.name,
            unit: newTestDef.unit,
            description: newTestDef.description
        };
        if (onUpdateTechTests) {
            onUpdateTechTests([...techTests, newDef]);
        }
        setNewTestDef({ name: '', unit: '', description: '' });
    };

    const handleDeleteTestDef = (id: string) => {
        if (confirm('确定要删除这个测评项目吗？')) {
            if (onUpdateTechTests) {
                onUpdateTechTests(techTests.filter(t => t.id !== id));
            }
        }
    };

    return (
        <div className="space-y-4 md:space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black text-bvb-black uppercase italic tracking-tighter">球员成长中心</h2>
                    <p className="text-gray-500 font-bold uppercase text-[9px] md:text-[10px] tracking-widest">Digital Performance Tracking & Analytics</p>
                </div>
                <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto justify-end">
                    <div className="flex items-center bg-white rounded-xl border p-1 shadow-sm shrink-0 flex-1 md:flex-none justify-between">
                        <button onClick={() => { if(viewMonth === 0) { setViewMonth(11); setViewYear(viewYear-1); } else setViewMonth(viewMonth-1); }} className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><ChevronLeft className="w-4 h-4 md:w-5 md:h-5 text-gray-400" /></button>
                        <span className="px-2 md:px-4 font-black text-[11px] md:text-xs min-w-[70px] md:min-w-[90px] text-center">{viewYear}年{viewMonth + 1}月</span>
                        <button onClick={() => { if(viewMonth === 11) { setViewMonth(0); setViewYear(viewYear+1); } else setViewMonth(viewMonth+1); }} className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><ChevronRightIcon className="w-4 h-4 md:w-5 md:h-5 text-gray-400" /></button>
                    </div>
                    <select 
                        value={selectedTeamId} 
                        onChange={e => setSelectedTeamId(e.target.value)}
                        className="p-1.5 md:p-2 border rounded-xl text-[11px] md:text-xs font-black bg-white outline-none focus:ring-2 focus:ring-bvb-yellow flex-1 md:flex-none"
                    >
                        {isDirector && <option value="all">所有梯队</option>}
                        {managedTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Main Tabs */}
            <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto no-scrollbar shrink-0">
                <button onClick={() => setActiveTab('juggling')} className={`flex-1 min-w-[90px] md:min-w-[120px] py-2.5 md:py-3 rounded-xl text-[12px] md:text-sm font-black flex items-center justify-center gap-1.5 md:gap-2 transition-all ${activeTab === 'juggling' ? 'bg-bvb-yellow text-bvb-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><Medal className="w-3.5 h-3.5 md:w-4 md:h-4" /> 颠球挑战</button>
                <button onClick={() => setActiveTab('home')} className={`flex-1 min-w-[90px] md:min-w-[120px] py-2.5 md:py-3 rounded-xl text-[12px] md:text-sm font-black flex items-center justify-center gap-1.5 md:gap-2 transition-all ${activeTab === 'home' ? 'bg-bvb-yellow text-bvb-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><TrendingUp className="w-3.5 h-3.5 md:w-4 md:h-4" /> 居家打卡</button>
                <button onClick={() => setActiveTab('tests')} className={`flex-1 min-w-[90px] md:min-w-[120px] py-2.5 md:py-3 rounded-xl text-[12px] md:text-sm font-black flex items-center justify-center gap-1.5 md:gap-2 transition-all ${activeTab === 'tests' ? 'bg-bvb-yellow text-bvb-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><Target className="w-3.5 h-3.5 md:w-4 md:h-4" /> 技术测评</button>
            </div>

            {activeTab === 'juggling' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in slide-in-from-right-4">
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-gray-200">
                            <h3 className="font-black text-gray-800 mb-4 md:mb-6 flex items-center uppercase tracking-tighter text-base md:text-lg"><Plus className="w-5 h-5 md:w-6 md:h-6 mr-2 text-bvb-yellow" /> 录入颠球成绩</h3>
                            <div className="space-y-4">
                                <div className="relative">
                                    <label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 md:mb-2">选择球员</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                        <input className="w-full pl-9 pr-4 py-2 md:py-3 border rounded-xl font-bold bg-gray-50 focus:ring-2 focus:ring-bvb-yellow outline-none text-[12px] md:text-sm" placeholder="搜索姓名..." value={jugglingSearch} onChange={e => setJugglingSearch(e.target.value)} />
                                    </div>
                                    <div className="mt-2 grid grid-cols-2 gap-2 max-h-[120px] md:max-h-[160px] overflow-y-auto custom-scrollbar p-1">
                                        {displayPlayers.filter(p => p.name.includes(jugglingSearch)).map(p => (
                                            <button key={p.id} onClick={() => setJugglingPlayerId(p.id)} className={`p-1.5 md:p-2 rounded-xl border text-[10px] md:text-xs font-bold transition-all text-left truncate flex items-center gap-1.5 md:gap-2 ${jugglingPlayerId === p.id ? 'bg-bvb-black text-bvb-yellow border-bvb-black shadow-lg' : 'bg-white text-gray-600 hover:border-bvb-yellow'}`}><img src={p.image} className="w-4 h-4 md:w-5 md:h-5 rounded-full object-cover" /><span className="truncate">{p.name}</span></button>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 md:gap-4">
                                    <div><label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 md:mb-2">挑战日期</label><input type="date" className="w-full p-2 md:p-3 border rounded-xl font-bold bg-gray-50 text-[12px] md:text-sm focus:ring-2 focus:ring-bvb-yellow outline-none" value={jugglingDate} onChange={e => setJugglingDate(e.target.value)} /></div>
                                    <div><label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 md:mb-2">完成个数</label><input type="number" className="w-full p-2 md:p-3 border rounded-xl font-black bg-gray-50 text-center text-base md:text-lg focus:ring-2 focus:ring-bvb-yellow outline-none" placeholder="0" value={jugglingCount} onChange={e => setJugglingCount(e.target.value)} /></div>
                                </div>
                                <button onClick={() => {
                                    const count = parseInt(jugglingCount);
                                    if (!jugglingPlayerId || isNaN(count)) return;
                                    const player = players.find(p => p.id === jugglingPlayerId);
                                    if (player) {
                                        onUpdatePlayer({ ...player, jugglingHistory: [...(player.jugglingHistory || []), { id: `jug-${Date.now()}`, playerId: jugglingPlayerId, date: jugglingDate, count }] });
                                        setJugglingCount('');
                                        alert(`${player.name} 的成绩已保存！`);
                                    }
                                }} disabled={!jugglingPlayerId || !jugglingCount} className="w-full py-3 md:py-4 bg-bvb-black text-bvb-yellow font-black rounded-xl md:rounded-2xl shadow-xl disabled:opacity-30 hover:brightness-110 active:scale-95 transition-all uppercase italic text-xs md:text-sm">保存记录 Record Result</button>
                            </div>
                        </div>
                    </div>
                    <div className="lg:col-span-8 space-y-6">
                        <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                            <div className="p-4 md:p-6 border-b flex flex-col md:flex-row justify-between items-center gap-3 bg-gray-50/50">
                                <div className="flex items-center gap-3 md:gap-4">
                                    <h3 className="font-black text-gray-800 flex items-center uppercase italic text-sm md:text-lg"><Trophy className="w-5 h-5 md:w-6 md:h-6 mr-1.5 md:mr-2 text-bvb-yellow" /> 挑战光荣榜</h3>
                                    <div className="flex bg-white p-1 rounded-xl border shadow-sm">
                                        <button onClick={() => setStatPeriod('month')} className={`px-2 md:px-4 py-1 rounded-lg text-[10px] md:text-xs font-black transition-all ${statPeriod === 'month' ? 'bg-bvb-black text-bvb-yellow' : 'text-gray-400 hover:text-gray-600'}`}>月</button>
                                        <button onClick={() => setStatPeriod('quarter')} className={`px-2 md:px-4 py-1 rounded-lg text-[10px] md:text-xs font-black transition-all ${statPeriod === 'quarter' ? 'bg-bvb-black text-bvb-yellow' : 'text-gray-400 hover:text-gray-600'}`}>季</button>
                                        <button onClick={() => setStatPeriod('year')} className={`px-2 md:px-4 py-1 rounded-lg text-[10px] md:text-xs font-black transition-all ${statPeriod === 'year' ? 'bg-bvb-black text-bvb-yellow' : 'text-gray-400 hover:text-gray-600'}`}>年</button>
                                    </div>
                                </div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                                    点击姓名查看全部历史记录
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-100/50 font-black text-gray-400 uppercase text-[9px] md:text-[10px] tracking-tighter md:tracking-widest border-b">
                                        <tr>
                                            <th className="px-2 py-3 md:px-6 md:py-4">排名</th>
                                            <th className="px-2 py-3 md:px-6 md:py-4">球员姓名</th>
                                            <th className="px-2 py-3 md:px-6 md:py-4 text-center">周期最高</th>
                                            <th className="px-2 py-3 md:px-6 md:py-4 text-center font-black text-bvb-black">历史最佳</th>
                                            <th className="px-2 py-3 md:px-6 md:py-4 text-center">周期平均</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {(jugglingLeaderboard || []).map((p, idx) => (
                                            <tr key={p.id} className="hover:bg-yellow-50/30 transition-colors">
                                                <td className="px-2 py-3 md:px-6 md:py-4"><div className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center font-black text-[9px] md:text-xs ${idx < 3 ? 'bg-bvb-yellow text-bvb-black border-2 border-bvb-black shadow-md' : 'bg-gray-100 text-gray-400'}`}>{idx + 1}</div></td>
                                                <td className="px-2 py-3 md:px-6 md:py-4">
                                                    <button onClick={() => setJugglingDetailPlayerId(p.id)} className="flex items-center gap-1.5 md:gap-3 text-left hover:opacity-80 transition-all group">
                                                        <div className="relative">
                                                            <img src={p.image} className="w-7 h-7 md:w-10 md:h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                                                            <div className="absolute inset-0 bg-bvb-black/0 group-hover:bg-bvb-black/20 rounded-full transition-colors flex items-center justify-center"><Search className="w-3 h-3 text-white opacity-0 group-hover:opacity-100" /></div>
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-gray-800 text-[11px] md:text-sm truncate max-w-[50px] md:max-w-none group-hover:underline">{p.name}</p>
                                                            <p className="text-[8px] md:text-[10px] text-gray-400 font-bold uppercase">{teams.find(t => t.id === p.teamId)?.level}</p>
                                                        </div>
                                                    </button>
                                                </td>
                                                <td className="px-2 py-3 md:px-6 md:py-4 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-sm md:text-lg font-black text-gray-800">{p.stats.max}</span>
                                                        {p.stats.isBreakingRecord && (
                                                            <span className="text-[7px] md:text-[8px] font-black text-bvb-yellow bg-bvb-black px-1.5 rounded-full flex items-center gap-0.5 animate-pulse">
                                                                <Sparkles className="w-2 h-2 fill-current" /> NEW RECORD
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-2 py-3 md:px-6 md:py-4 text-center"><span className="text-base md:text-xl font-black text-gray-400 tabular-nums">{p.stats.allTimeBest}</span><span className="text-[8px] md:text-[10px] text-gray-400 ml-0.5 font-bold">个</span></td>
                                                <td className="px-2 py-3 md:px-6 md:py-4 text-center font-bold text-gray-400 text-[10px] md:text-sm">{p.stats.avg}</td>
                                            </tr>
                                        ))}
                                        {jugglingLeaderboard.length === 0 && (
                                            <tr><td colSpan={5} className="py-20 text-center text-gray-300 italic font-black uppercase text-xs">No records for this period</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'home' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in slide-in-from-right-4">
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-gray-200">
                            <h3 className="font-black text-gray-800 mb-4 md:mb-6 flex items-center uppercase tracking-tighter text-base md:text-lg"><CheckSquare className="w-5 h-5 md:w-6 md:h-6 mr-2 text-bvb-yellow" /> 快速批量打卡</h3>
                            <div className="space-y-4 mb-4 md:mb-6">
                                <div><label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 md:mb-2">选择日期</label><input type="date" className="w-full p-2.5 md:p-3 border rounded-xl font-bold bg-gray-50 focus:ring-2 focus:ring-bvb-yellow outline-none text-[12px] md:text-sm" value={homeDate} onChange={e => setHomeDate(e.target.value)} /></div>
                                <div><label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 md:mb-2">训练主题</label><input className="w-full p-2.5 md:p-3 border rounded-xl font-bold bg-gray-50 focus:ring-2 focus:ring-bvb-yellow outline-none text-[12px] md:text-sm" placeholder="如：触球练习" value={homeTitle} onChange={e => setHomeTitle(e.target.value)} /></div>
                            </div>
                            <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 md:mb-3 flex justify-between"><span>待选球员 ({displayPlayers.length})</span><button onClick={() => setSelectedPlayerIds(selectedPlayerIds.size === displayPlayers.length ? new Set() : new Set(displayPlayers.map(p => p.id)))} className="text-bvb-black hover:underline">全选</button></p>
                            <div className="grid grid-cols-2 gap-2 max-h-[200px] md:max-h-[300px] overflow-y-auto pr-1 custom-scrollbar mb-4 md:mb-6">{displayPlayers.map(p => {
                                const isAlreadyCheckedIn = (p.homeTrainingLogs || []).some(log => log.date === homeDate);
                                return (
                                    <button 
                                        key={p.id} 
                                        onClick={() => { if(isAlreadyCheckedIn) return; const next = new Set(selectedPlayerIds); if (next.has(p.id)) next.delete(p.id); else next.add(p.id); setSelectedPlayerIds(next); }} 
                                        className={`flex items-center gap-1.5 p-1.5 md:p-2 rounded-xl border-2 transition-all ${isAlreadyCheckedIn ? 'opacity-50 grayscale bg-gray-50 cursor-not-allowed' : selectedPlayerIds.has(p.id) ? 'bg-bvb-yellow/10 border-bvb-yellow' : 'bg-white border-gray-100'}`}
                                    >
                                        <div className={`w-3.5 h-3.5 md:w-4 md:h-4 rounded border flex items-center justify-center shrink-0 ${isAlreadyCheckedIn ? 'bg-gray-200' : selectedPlayerIds.has(p.id) ? 'bg-bvb-yellow border-bvb-black' : 'border-gray-300'}`}>{isAlreadyCheckedIn ? <Clock className="w-2.5 h-2.5 text-gray-400"/> : selectedPlayerIds.has(p.id) && <CheckCircle className="w-2.5 h-2.5 md:w-3 md:h-3 text-bvb-black" />}</div>
                                        <span className="text-[11px] md:text-xs font-bold text-gray-700 truncate">{p.name} {isAlreadyCheckedIn && '(已存)'}</span>
                                    </button>
                                );
                            })}</div>
                            <button onClick={handleBatchHomeCheckin} disabled={selectedPlayerIds.size === 0} className="w-full py-3 md:py-4 bg-bvb-black text-bvb-yellow font-black rounded-xl md:rounded-2xl shadow-xl disabled:opacity-30 flex items-center justify-center gap-2 hover:brightness-110 transition-all text-xs md:text-sm"><Plus className="w-4 h-4 md:w-5 md:h-5" /> 确认 {selectedPlayerIds.size} 人打卡</button>
                        </div>
                    </div>
                    <div className="lg:col-span-8 space-y-6">
                        <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-4 md:p-6 bg-gray-50 border-b flex flex-col md:flex-row justify-between items-center gap-3 md:gap-4">
                                <h3 className="font-black text-gray-800 flex items-center uppercase italic text-sm md:text-lg"><BarChart3 className="w-5 h-5 md:w-6 md:h-6 mr-1.5 md:mr-2 text-bvb-yellow" /> 居家训练排行榜 (按年度频次排序)</h3>
                                <div className="flex gap-2">
                                    <button onClick={async () => { setIsExportingHome(true); try { await exportToPDF('home-training-team-pdf', `居家训练年度报告_${viewYear}`); } catch { alert('导出失败'); } finally { setIsExportingHome(false); } }} disabled={isExportingHome} className="text-[9px] md:text-[10px] font-black text-gray-600 uppercase tracking-widest bg-white px-2 md:px-3 py-1 rounded-full border border-gray-200 flex items-center gap-1 hover:bg-gray-50 transition-colors disabled:opacity-50">{isExportingHome ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileDown className="w-3 h-3" />} 导出报告</button>
                                </div>
                            </div>
                            <div className="overflow-x-auto" id="home-training-team-pdf">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-100/50 font-black text-gray-400 uppercase text-[9px] md:text-[10px] tracking-widest border-b">
                                        <tr>
                                            <th className="px-3 py-3 md:px-6 md:py-4">排名</th>
                                            <th className="px-3 py-3 md:px-6 md:py-4">球员姓名</th>
                                            <th className="px-3 py-3 md:px-6 md:py-4 text-center">本周</th>
                                            <th className="px-3 py-3 md:px-6 md:py-4 text-center">本月</th>
                                            <th className="px-3 py-3 md:px-6 md:py-4 text-center font-black text-bvb-black">年度总计</th>
                                            <th className="px-3 py-3 md:px-6 md:py-4">成就勋章</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {homeTrainingLeaderboard.map((p, idx) => { 
                                            const stats = p.stats; 
                                            return (
                                                <tr key={p.id} onClick={() => setDetailPlayerId(p.id)} className="hover:bg-yellow-50/50 transition-colors cursor-pointer group animate-in fade-in duration-300">
                                                    <td className="px-3 py-3 md:px-6 md:py-4"><div className={`w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center font-black text-[10px] md:text-xs ${idx < 3 ? 'bg-bvb-yellow text-bvb-black border-2 border-bvb-black' : 'bg-gray-100 text-gray-400'}`}>{idx + 1}</div></td>
                                                    <td className="px-3 py-3 md:px-6 md:py-4"><div className="flex items-center gap-2 md:gap-3"><img src