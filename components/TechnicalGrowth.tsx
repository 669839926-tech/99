
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Player, Team, JugglingRecord, HomeTrainingLog, TechTestDefinition, TechTestResult, User } from '../types';
import { TrendingUp, Award, Activity, History, Plus, Target, CheckCircle, BarChart3, ChevronRight, User as UserIcon, Medal, Calendar, ChevronLeft, ChevronRight as ChevronRightIcon, Users, CheckSquare, Square, Save, Trash2, FileText, Download, Loader2, X, Search, Trophy, TrendingDown, Star, LayoutList, FileDown, Settings, Gauge, ArrowRight, ClipboardList, FileSpreadsheet, Upload } from 'lucide-react';
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
    // 权限判断
    const isDirector = currentUser?.role === 'director';
    const isCoach = currentUser?.role === 'coach';
    
    // 计算当前用户可管理的梯队
    const managedTeams = useMemo(() => {
        if (isDirector) return teams;
        return teams.filter(t => currentUser?.teamIds?.includes(t.id));
    }, [teams, currentUser, isDirector]);

    const [activeTab, setActiveTab] = useState<'juggling' | 'home' | 'tests'>('juggling');
    
    // 初始化选中的梯队
    const [selectedTeamId, setSelectedTeamId] = useState<string>(() => {
        if (isCoach && managedTeams.length > 0) return managedTeams[0].id;
        return 'all';
    });

    useEffect(() => {
        if (selectedTeamId !== 'all' && !managedTeams.some(t => t.id === selectedTeamId)) {
            setSelectedTeamId(managedTeams.length > 0 ? managedTeams[0].id : 'all');
        }
    }, [managedTeams, selectedTeamId]);
    
    // 状态
    const [isExporting, setIsExporting] = useState(false);
    const [isExportingHome, setIsExportingHome] = useState(false);
    const [isExportingIndividualTech, setIsExportingIndividualTech] = useState(false);

    // 颠球录入状态
    const [jugglingPlayerId, setJugglingPlayerId] = useState<string>('');
    const [jugglingDate, setJugglingDate] = useState(new Date().toISOString().split('T')[0]);
    const [jugglingCount, setJugglingCount] = useState<string>('');
    const [jugglingSearch, setJugglingSearch] = useState('');

    // 统计视图状态
    const [statPeriod, setStatPeriod] = useState<'month' | 'quarter' | 'year'>('month');
    const [viewYear, setViewYear] = useState(new Date().getFullYear());
    const [viewMonth, setViewMonth] = useState(new Date().getMonth());

    // 居家打卡状态
    const [homeDate, setHomeDate] = useState(new Date().toISOString().split('T')[0]);
    const [homeTitle, setHomeTitle] = useState('居家练习');
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
    const [detailPlayerId, setDetailPlayerId] = useState<string | null>(null);

    // 技术测试状态
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [newTestDef, setNewTestDef] = useState({ name: '', unit: '', description: '' });
    const [selectedTestId, setSelectedTestId] = useState<string>('');
    const [testEntryDate, setTestEntryDate] = useState(new Date().toISOString().split('T')[0]);
    const [testScores, setTestScores] = useState<Record<string, string>>({});
    const [isSavingTests, setIsSavingTests] = useState(false);
    const [isExportingTech, setIsExportingTech] = useState(false);
    const [showTestHistoryPlayerId, setShowTestHistoryPlayerId] = useState<string | null>(null);
    const [isImportingResults, setIsImportingResults] = useState(false);
    const resultsFileInputRef = useRef<HTMLInputElement>(null);

    const isLowerBetter = (unit?: string) => {
        if (!unit) return false;
        const u = unit.toLowerCase();
        return u.includes('秒') || u.includes('s') || u.includes('分') || u.includes('min');
    };

    const displayPlayers = useMemo(() => {
        const basePlayers = isDirector 
            ? players 
            : players.filter(p => currentUser?.teamIds?.includes(p.teamId));
        return basePlayers.filter(p => selectedTeamId === 'all' || p.teamId === selectedTeamId);
    }, [players, selectedTeamId, currentUser, isDirector]);

    const focusedPlayer = useMemo(() => {
        return displayPlayers.find(p => p.id === jugglingPlayerId) || null;
    }, [displayPlayers, jugglingPlayerId]);

    const getHonorBadge = (max: number) => {
        if (max >= 100) return { label: '五星传奇', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
        if (max >= 50) return { label: '四星大师', color: 'bg-purple-100 text-purple-700 border-purple-200' };
        if (max >= 20) return { label: '三星高手', color: 'bg-red-100 text-red-700 border-red-200' };
        if (max >= 10) return { label: '二星达人', color: 'bg-blue-100 text-blue-700 border-blue-200' };
        if (max >= 5) return { label: '一星小将', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' };
        if (max >= 3) return { label: '入门学徒', color: 'bg-green-100 text-green-700 border-green-200' };
        return { label: '待挑战', color: 'bg-gray-50 text-gray-400 border-gray-100' };
    };

    const getHomeStats = (player: Player) => {
        const history = player.homeTrainingLogs || [];
        const mKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
        const monthCount = history.filter(h => h.date.startsWith(mKey)).length;
        const yearCount = history.filter(h => h.date.startsWith(String(viewYear))).length;
        return { monthCount, yearCount };
    };

    const handleAddJuggling = () => {
        const count = parseInt(jugglingCount);
        if (!jugglingPlayerId || isNaN(count)) return;
        const player = displayPlayers.find(p => p.id === jugglingPlayerId);
        if (player) {
            const newRecord: JugglingRecord = { id: `jug-${Date.now()}`, playerId: jugglingPlayerId, date: jugglingDate, count };
            onUpdatePlayer({ ...player, jugglingHistory: [...(player.jugglingHistory || []), newRecord] });
            setJugglingCount('');
            alert(`${player.name} 的成绩已保存！`);
        }
    };

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
        return { max: counts.length ? Math.max(...counts) : 0, avg: counts.length ? Math.round(counts.reduce((a, b) => a + b, 0) / counts.length) : 0, count: filtered.length, records: filtered.sort((a, b) => b.date.localeCompare(a.date)) };
    };

    const jugglingLeaderboard = useMemo(() => {
        return displayPlayers.map(p => ({ ...p, stats: getJugglingStats(p) })).sort((a, b) => b.stats.max - a.stats.max);
    }, [displayPlayers, statPeriod, viewYear, viewMonth]);

    const jugglingTrendData = useMemo(() => {
        if (!focusedPlayer || !focusedPlayer.jugglingHistory) return [];
        return [...focusedPlayer.jugglingHistory].sort((a, b) => a.date.localeCompare(b.date)).map(h => ({ date: h.date, displayDate: h.date.substring(5), count: h.count }));
    }, [focusedPlayer]);

    const handleAddTestDef = () => {
        if (!newTestDef.name || !newTestDef.unit || !onUpdateTechTests) return;
        const test: TechTestDefinition = { id: `test-${Date.now()}`, ...newTestDef };
        onUpdateTechTests([...techTests, test]);
        setNewTestDef({ name: '', unit: '', description: '' });
    };

    const handleDeleteTestDef = (id: string) => {
        if (!confirm('确定删除该测试项定义吗？这不会删除已录入的成绩，但该测试项将不再可选。') || !onUpdateTechTests) return;
        onUpdateTechTests(techTests.filter(t => t.id !== id));
    };

    const handleSaveBatchTests = async () => {
        if (!selectedTestId || !selectedTeamId || selectedTeamId === 'all') {
            alert('请先选择具体的梯队和测试项目');
            return;
        }
        setIsSavingTests(true);
        try {
            const playersToUpdate = displayPlayers.filter(p => testScores[p.id]);
            for (const p of playersToUpdate) {
                const newResult: TechTestResult = {
                    id: `res-${Date.now()}-${p.id}`,
                    testId: selectedTestId,
                    playerId: p.id,
                    date: testEntryDate,
                    value: parseFloat(testScores[p.id]),
                    coachId: currentUser?.id
                };
                onUpdatePlayer({ ...p, testResults: [...(p.testResults || []), newResult] });
            }
            setTestScores({});
            alert('成绩批量保存成功！');
        } catch (e) {
            alert('保存失败');
        } finally {
            setIsSavingTests(false);
        }
    };

    const getPlayerLatestResult = (player: Player, testId: string) => {
        const results = (player.testResults || []).filter(r => r.testId === testId);
        if (results.length === 0) return null;
        return results.sort((a, b) => b.date.localeCompare(a.date))[0];
    };

    const handleExportTechPDF = async () => {
        if (!selectedTestId || selectedTeamId === 'all') {
            alert('请先选择测试项目和梯队');
            return;
        }
        setIsExportingTech(true);
        const testName = techTests.find(t => t.id === selectedTestId)?.name || '技术测试';
        const teamName = teams.find(t => t.id === selectedTeamId)?.name || '全部梯队';
        try {
            await exportToPDF('tech-test-report-pdf', `技术测评报告_${testName}_${teamName}_${new Date().toLocaleDateString()}`);
        } catch (e) {
            alert('导出失败');
        } finally {
            setIsExportingTech(false);
        }
    };

    const handleExportIndividualTechPDF = async () => {
        if (!showTestHistoryPlayerId || !selectedTestId) return;
        setIsExportingIndividualTech(true);
        const p = players.find(p => p.id === showTestHistoryPlayerId);
        const t = techTests.find(t => t.id === selectedTestId);
        try {
            await exportToPDF('individual-tech-test-pdf', `专项测评报告_${p?.name}_${t?.name}`);
        } catch (error) {
            alert('导出失败');
        } finally {
            setIsExportingIndividualTech(false);
        }
    };

    const handleExportExcel = () => {
        if (!selectedTestId || selectedTeamId === 'all') {
            alert('请先选择测试项目和梯队以生成对应的记录表');
            return;
        }
        const test = techTests.find(t => t.id === selectedTestId);
        const team = teams.find(t => t.id === selectedTeamId);
        const headers = "球员姓名,球衣号码,测试项目,单位,测试日期,成绩(请在此列录入)\n";
        const rows = displayPlayers.map(p => {
            return `${p.name},${p.number},${test?.name},${test?.unit},${testEntryDate},""`;
        }).join('\n');
        
        const blob = new Blob(["\ufeff" + headers + rows], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `测评记录表_${team?.name}_${test?.name}_${testEntryDate}.csv`;
        link.click();
    };

    const handleImportResultsCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsImportingResults(true);
        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target?.result as string;
            const lines = text.split('\n');
            let successCount = 0;
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
                if (cols.length >= 6) {
                    const name = cols[0];
                    const number = parseInt(cols[1]);
                    const testName = cols[2];
                    const testDate = cols[4];
                    const score = parseFloat(cols[5]);
                    if (isNaN(score)) continue;
                    const player = players.find(p => p.name === name && p.number === number);
                    const testDef = techTests.find(t => t.name === testName);
                    if (player && testDef) {
                        const newResult: TechTestResult = {
                            id: `res-imp-${Date.now()}-${player.id}-${Math.random().toString(36).substr(2,4)}`,
                            testId: testDef.id,
                            playerId: player.id,
                            date: testDate || new Date().toISOString().split('T')[0],
                            value: score,
                            coachId: currentUser?.id
                        };
                        onUpdatePlayer({ ...player, testResults: [...(player.testResults || []), newResult] });
                        successCount++;
                    }
                }
            }
            alert(`成功导入 ${successCount} 条测评成绩！`);
            setIsImportingResults(false);
        };
        reader.readAsText(file);
        if (resultsFileInputRef.current) resultsFileInputRef.current.value = '';
    };

    const handleExportHomeTeamPDF = async () => {
        setIsExportingHome(true);
        const teamName = teams.find(t => t.id === selectedTeamId)?.name || '全部梯队';
        try {
            await exportToPDF('home-training-team-pdf', `居家训练梯队报告_${teamName}_${viewYear}年${viewMonth + 1}月`);
        } catch (e) {
            alert('导出失败');
        } finally {
            setIsExportingHome(false);
        }
    };

    const detailPlayer = useMemo(() => players.find(p => p.id === detailPlayerId) || null, [players, detailPlayerId]);
    const testHistoryPlayer = useMemo(() => players.find(p => p.id === showTestHistoryPlayerId) || null, [players, showTestHistoryPlayerId]);
    const currentTest = useMemo(() => techTests.find(t => t.id === selectedTestId) || null, [techTests, selectedTestId]);

    return (
        <div className="space-y-4 md:space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black text-bvb-black uppercase italic tracking-tighter">球员成长中心</h2>
                    <p className="text-gray-500 font-bold uppercase text-[9px] md:text-[10px] tracking-widest">Digital Performance Tracking & Analytics</p>
                </div>
                <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
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
                <button onClick={() => setActiveTab('juggling')} className={`flex-1 min-w-[90px] md:min-w-[120px] py-2.5 md:py-3 rounded-xl text-[12px] md:text-sm font-black flex items-center justify-center gap-1.5 md:gap-2 transition-all ${activeTab === 'juggling' ? 'bg-bvb-yellow text-bvb-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><Medal className="w-3.5 h-3.5 md:w-4 md:h-4" /> 颠球</button>
                <button onClick={() => setActiveTab('home')} className={`flex-1 min-w-[90px] md:min-w-[120px] py-2.5 md:py-3 rounded-xl text-[12px] md:text-sm font-black flex items-center justify-center gap-1.5 md:gap-2 transition-all ${activeTab === 'home' ? 'bg-bvb-yellow text-bvb-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><TrendingUp className="w-3.5 h-3.5 md:w-4 md:h-4" /> 打卡</button>
                <button onClick={() => setActiveTab('tests')} className={`flex-1 min-w-[90px] md:min-w-[120px] py-2.5 md:py-3 rounded-xl text-[12px] md:text-sm font-black flex items-center justify-center gap-1.5 md:gap-2 transition-all ${activeTab === 'tests' ? 'bg-bvb-yellow text-bvb-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><Target className="w-3.5 h-3.5 md:w-4 md:h-4" /> 测评</button>
            </div>

            {/* TAB: Juggling Challenge */}
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
                                <button onClick={handleAddJuggling} disabled={!jugglingPlayerId || !jugglingCount} className="w-full py-3 md:py-4 bg-bvb-black text-bvb-yellow font-black rounded-xl md:rounded-2xl shadow-xl disabled:opacity-30 hover:brightness-110 active:scale-95 transition-all uppercase italic text-xs md:text-sm">保存记录 Record Result</button>
                            </div>
                        </div>
                        {focusedPlayer && (
                            <div id="juggling-report-pdf" className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-gray-200 animate-in fade-in duration-500 space-y-4 md:space-y-6 overflow-hidden relative">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2 md:gap-3">
                                        <img src={focusedPlayer.image} className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-bvb-yellow" />
                                        <div><h3 className="font-black text-gray-800 text-sm md:text-lg leading-tight">{focusedPlayer.name}</h3><p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">#{focusedPlayer.number} • 个人成长档案</p></div>
                                    </div>
                                    <button onClick={async () => { setIsExporting(true); try { await exportToPDF('juggling-report-pdf', `颠球挑战档案_${focusedPlayer.name}`); } catch (e) { alert('导出失败'); } finally { setIsExporting(false); } }} disabled={isExporting} className="p-1.5 md:p-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-bvb-black hover:text-bvb-yellow transition-all">{isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}</button>
                                </div>
                                <div className="grid grid-cols-2 gap-2 md:gap-3">
                                    <div className="bg-gray-50 p-2 md:p-3 rounded-xl md:rounded-2xl border border-gray-100"><p className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase mb-1">本周最高</p><p className="text-xl md:text-2xl font-black text-bvb-black">{getJugglingStats(focusedPlayer).max}</p></div>
                                    <div className="bg-gray-50 p-2 md:p-3 rounded-xl md:rounded-2xl border border-gray-100"><p className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase mb-1">荣誉等级</p><span className={`text-[9px] md:text-[10px] font-black px-1.5 md:px-2 py-0.5 rounded-full border leading-tight ${getHonorBadge(getJugglingStats(focusedPlayer).max).color}`}>{getHonorBadge(getJugglingStats(focusedPlayer).max).label}</span></div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center"><h4 className="font-black text-gray-800 flex items-center uppercase tracking-tighter text-[10px] md:text-xs"><TrendingUp className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2 text-bvb-yellow" /> 进步曲线</h4></div>
                                    <div className="h-32 md:h-40 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={jugglingTrendData}><defs><linearGradient id="colorJugReport" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#FDE100" stopOpacity={0.4}/><stop offset="95%" stopColor="#FDE100" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" /><XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 'bold' }} /><YAxis hide /><Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} /><Area type="monotone" dataKey="count" stroke="#FDE100" strokeWidth={2} fillOpacity={1} fill="url(#colorJugReport)" /></AreaChart></ResponsiveContainer></div>
                                </div>
                                <div className="space-y-2 pt-3 border-t border-gray-100">
                                    <h4 className="font-black text-gray-800 flex items-center uppercase tracking-tighter text-[10px] md:text-xs"><LayoutList className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2 text-bvb-yellow" /> 详细挑战清单</h4>
                                    <div className="max-h-48 md:max-h-60 overflow-y-auto custom-scrollbar pr-1"><table className="w-full text-left text-[10px] md:text-[11px]"><thead className="bg-gray-50 text-gray-400 font-black uppercase sticky top-0"><tr><th className="p-1.5 md:p-2 border-b">日期</th><th className="p-1.5 md:p-2 border-b text-right">成绩</th></tr></thead><tbody className="divide-y divide-gray-50">{(focusedPlayer.jugglingHistory || []).sort((a,b) => b.date.localeCompare(a.date)).map(h => (<tr key={h.id} className="hover:bg-gray-50 transition-colors"><td className="p-1.5 md:p-2 font-mono text-gray-500">{h.date}</td><td className="p-1.5 md:p-2 text-right font-black text-bvb-black">{h.count} 个</td></tr>))}</tbody></table></div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="lg:col-span-8 space-y-6">
                        <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                            <div className="p-4 md:p-6 border-b flex flex-col md:flex-row justify-between items-center gap-3 bg-gray-50/50">
                                <div className="flex items-center gap-3 md:gap-4"><h3 className="font-black text-gray-800 flex items-center uppercase italic text-sm md:text-lg"><Trophy className="w-5 h-5 md:w-6 md:h-6 mr-1.5 md:mr-2 text-bvb-yellow" /> 挑战光荣榜</h3>
                                    <div className="flex bg-white p-1 rounded-xl border shadow-sm"><button onClick={() => setStatPeriod('month')} className={`px-2 md:px-4 py-1 rounded-lg text-[10px] md:text-xs font-black transition-all ${statPeriod === 'month' ? 'bg-bvb-black text-bvb-yellow' : 'text-gray-400 hover:text-gray-600'}`}>月</button><button onClick={() => setStatPeriod('quarter')} className={`px-2 md:px-4 py-1 rounded-lg text-[10px] md:text-xs font-black transition-all ${statPeriod === 'quarter' ? 'bg-bvb-black text-bvb-yellow' : 'text-gray-400 hover:text-gray-600'}`}>季</button><button onClick={() => setStatPeriod('year')} className={`px-2 md:px-4 py-1 rounded-lg text-[10px] md:text-xs font-black transition-all ${statPeriod === 'year' ? 'bg-bvb-black text-bvb-yellow' : 'text-gray-400 hover:text-gray-600'}`}>年</button></div>
                                </div>
                                <div className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white px-2 md:px-3 py-1 rounded-full border border-gray-100">{statPeriod === 'month' ? `${viewYear}-${viewMonth + 1}` : statPeriod === 'quarter' ? `${viewYear} Q${Math.floor(viewMonth / 3) + 1}` : `${viewYear} 全年`}</div>
                            </div>
                            <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-gray-100/50 font-black text-gray-400 uppercase text-[9px] md:text-[10px] tracking-tighter md:tracking-widest border-b"><tr><th className="px-2 py-3 md:px-6 md:py-4">排名</th><th className="px-2 py-3 md:px-6 md:py-4">球员姓名</th><th className="px-2 py-3 md:px-6 md:py-4 text-center">最高</th><th className="px-2 py-3 md:px-6 md:py-4 text-center">平均</th><th className="px-2 py-3 md:px-6 md:py-4 text-center">次数</th><th className="px-2 py-3 md:px-6 md:py-4 text-right">荣耀等级</th></tr></thead><tbody className="divide-y divide-gray-100">{jugglingLeaderboard.map((p, idx) => { const badge = getHonorBadge(p.stats.max); return (<tr key={p.id} className={`hover:bg-yellow-50/30 transition-colors cursor-pointer group ${jugglingPlayerId === p.id ? 'bg-yellow-50/50' : ''}`} onClick={() => setJugglingPlayerId(p.id)}><td className="px-2 py-3 md:px-6 md:py-4"><div className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center font-black text-[9px] md:text-xs ${idx < 3 ? 'bg-bvb-yellow text-bvb-black border-2 border-bvb-black shadow-md' : 'bg-gray-100 text-gray-400'}`}>{idx + 1}</div></td><td className="px-2 py-3 md:px-6 md:py-4"><div className="flex items-center gap-1.5 md:gap-3"><img src={p.image} className="w-7 h-7 md:w-10 md:h-10 rounded-full object-cover border-2 border-white shadow-sm transition-transform group-hover:scale-110" /><div><p className="font-black text-gray-800 text-[11px] md:text-sm transition-all truncate max-w-[50px] md:max-w-none">{p.name}</p><p className="text-[8px] md:text-[10px] text-gray-400 font-bold uppercase">{teams.find(t => t.id === p.teamId)?.level}</p></div></div></td><td className="px-2 py-3 md:px-6 md:py-4 text-center"><span className="text-sm md:text-xl font-black text-bvb-black">{p.stats.max}</span><span className="text-[8px] md:text-[10px] text-gray-400 ml-0.5 font-bold">个</span></td><td className="px-2 py-3 md:px-6 md:py-4 text-center font-bold text-gray-500 text-[10px] md:text-sm tabular-nums">{p.stats.avg}</td><td className="px-2 py-3 md:px-6 md:py-4 text-center font-bold text-gray-400 text-[10px] md:text-sm">{p.stats.count}</td><td className="px-2 py-3 md:px-6 md:py-4 text-right"><span className={`text-[8px] md:text-[10px] font-black px-1 md:px-2.5 py-0.5 md:py-1 rounded-full border shadow-sm flex items-center justify-center gap-0.5 min-w-[50px] md:min-w-[80px] uppercase whitespace-nowrap leading-tight ${badge.color}`}>{p.stats.max >= 100 && <Star className="w-2 md:w-2.5 h-2 md:h-2.5 fill-current" />}{badge.label}</span></td></tr>); })}</tbody></table></div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: Home Training */}
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
                            <div className="grid grid-cols-2 gap-2 max-h-[200px] md:max-h-[300px] overflow-y-auto pr-1 custom-scrollbar mb-4 md:mb-6">{displayPlayers.map(p => (<button key={p.id} onClick={() => { const next = new Set(selectedPlayerIds); if (next.has(p.id)) next.delete(p.id); else next.add(p.id); setSelectedPlayerIds(next); }} className={`flex items-center gap-1.5 p-1.5 md:p-2 rounded-xl border-2 transition-all ${selectedPlayerIds.has(p.id) ? 'bg-bvb-yellow/10 border-bvb-yellow' : 'bg-white border-gray-100'}`}><div className={`w-3.5 h-3.5 md:w-4 md:h-4 rounded border flex items-center justify-center shrink-0 ${selectedPlayerIds.has(p.id) ? 'bg-bvb-yellow border-bvb-black' : 'border-gray-300'}`}>{selectedPlayerIds.has(p.id) && <CheckCircle className="w-2.5 h-2.5 md:w-3 md:h-3 text-bvb-black" />}</div><span className="text-[11px] md:text-xs font-bold text-gray-700 truncate">{p.name}</span></button>))}</div>
                            <button onClick={() => { selectedPlayerIds.forEach(id => { const p = players.find(p => p.id === id); if (p) onUpdatePlayer({ ...p, homeTrainingLogs: [...(p.homeTrainingLogs || []), { id: `home-${Date.now()}-${id}`, playerId: id, date: homeDate, title: homeTitle, duration: 0 }] }); }); setSelectedPlayerIds(new Set()); alert('批量打卡成功！'); }} disabled={selectedPlayerIds.size === 0} className="w-full py-3 md:py-4 bg-bvb-black text-bvb-yellow font-black rounded-xl md:rounded-2xl shadow-xl disabled:opacity-30 flex items-center justify-center gap-2 hover:brightness-110 transition-all text-xs md:text-sm"><Plus className="w-4 h-4 md:w-5 md:h-5" /> 确认 {selectedPlayerIds.size} 人打卡</button>
                        </div>
                    </div>
                    <div className="lg:col-span-8 space-y-6">
                        <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-4 md:p-6 bg-gray-50 border-b flex flex-col md:flex-row justify-between items-center gap-3 md:gap-4">
                                <h3 className="font-black text-gray-800 flex items-center uppercase italic text-sm md:text-lg"><BarChart3 className="w-5 h-5 md:w-6 md:h-6 mr-1.5 md:mr-2 text-bvb-yellow" /> 居家训练计次榜</h3>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={handleExportHomeTeamPDF}
                                        disabled={isExportingHome}
                                        className="text-[9px] md:text-[10px] font-black text-gray-600 uppercase tracking-widest bg-white px-2 md:px-3 py-1 md:py-1.5 rounded-full border border-gray-200 flex items-center gap-1 md:gap-2 hover:bg-gray-50 transition-colors disabled:opacity-50"
                                    >
                                        {isExportingHome ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileDown className="w-3 h-3" />}
                                        <span className="hidden sm:inline">导出报告</span>
                                    </button>
                                    <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white px-2 md:px-3 py-1 md:py-1.5 rounded-full border border-gray-200">点击查看详情</span>
                                </div>
                            </div>
                            <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-gray-100/50 font-black text-gray-400 uppercase text-[9px] md:text-[10px] tracking-widest border-b"><tr><th className="px-3 py-3 md:px-6 md:py-4">排名</th><th className="px-3 py-3 md:px-6 md:py-4">球员</th><th className="px-3 py-3 md:px-6 md:py-4 text-center">本月</th><th className="px-3 py-3 md:px-6 md:py-4 text-center">年度</th><th className="px-3 py-3 md:px-6 md:py-4">状态</th></tr></thead><tbody className="divide-y divide-gray-100">{displayPlayers.map((p, idx) => { const stats = getHomeStats(p); return (<tr key={p.id} onClick={() => setDetailPlayerId(p.id)} className="hover:bg-yellow-50/50 transition-colors cursor-pointer group"><td className="px-3 py-3 md:px-6 md:py-4"><div className={`w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center font-black text-[10px] md:text-xs ${idx < 3 ? 'bg-bvb-yellow text-bvb-black border-2 border-bvb-black' : 'bg-gray-100 text-gray-400'}`}>{idx + 1}</div></td><td className="px-3 py-3 md:px-6 md:py-4"><div className="flex items-center gap-2 md:gap-3"><img src={p.image} className="w-7 h-7 md:w-8 md:h-8 rounded-full object-cover border border-gray-100" /><span className="font-black text-gray-800 text-[11px] md:text-sm truncate max-w-[50px] md:max-w-none">{p.name}</span></div></td><td className="px-3 py-3 md:px-6 md:py-4 text-center font-black text-sm md:text-lg text-bvb-black">{stats.monthCount}</td><td className="px-3 py-3 md:px-6 md:py-4 text-center font-bold text-gray-400 text-[10px] md:text-sm">{stats.yearCount}</td><td className="px-3 py-3 md:px-6 md:py-4"><div className="flex">{stats.monthCount >= 15 ? (<span className="bg-green-100 text-green-700 text-[8px] md:text-[10px] font-black px-1.5 md:px-2 py-0.5 md:py-1 rounded-full border border-green-200 uppercase whitespace-nowrap">勤奋标兵</span>) : stats.monthCount > 0 ? (<span className="bg-blue-50 text-blue-600 text-[8px] md:text-[10px] font-black px-1.5 md:px-2 py-0.5 md:py-1 rounded-full border border-blue-100 uppercase whitespace-nowrap">表现良好</span>) : <span className="text-gray-300 text-[8px] md:text-[10px] font-black uppercase whitespace-nowrap">未开启</span>}</div></td></tr>); })}</tbody></table></div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: Technical Tests */}
            {activeTab === 'tests' && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-200">
                        <div className="flex flex-wrap items-center gap-3">
                            <h3 className="font-black text-gray-800 flex items-center uppercase italic text-sm md:text-lg"><Target className="w-5 h-5 md:w-6 md:h-6 mr-2 text-bvb-yellow" /> 技术测评录入</h3>
                            <select 
                                value={selectedTestId} 
                                onChange={e => setSelectedTestId(e.target.value)}
                                className="p-2 border rounded-xl text-[11px] md:text-xs font-black bg-gray-50 outline-none focus:ring-2 focus:ring-bvb-yellow"
                            >
                                <option value="">选择测试项目...</option>
                                {techTests.map(t => <option key={t.id} value={t.id}>{t.name} ({t.unit})</option>)}
                            </select>
                            <input type="date" className="p-2 border rounded-xl text-[11px] md:text-xs font-black bg-gray-50" value={testEntryDate} onChange={e => setTestEntryDate(e.target.value)} />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <button onClick={() => setShowConfigModal(true)} className="p-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all flex items-center gap-2 text-xs font-bold"><Settings className="w-4 h-4" /> 项目配置</button>
                            <button onClick={handleExportExcel} disabled={!selectedTestId} className="flex-1 md:flex-none p-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 flex items-center justify-center gap-2 text-xs font-bold disabled:opacity-50"><FileSpreadsheet className="w-4 h-4 text-green-600" /> 下载记录表</button>
                            <div className="relative flex-1 md:flex-none">
                                <input type="file" ref={resultsFileInputRef} accept=".csv" className="hidden" onChange={handleImportResultsCSV} />
                                <button onClick={() => resultsFileInputRef.current?.click()} className="w-full p-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 flex items-center justify-center gap-2 text-xs font-bold"><Upload className="w-4 h-4 text-blue-600" /> 导入成绩</button>
                            </div>
                        </div>
                    </div>

                    {selectedTestId ? (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            <div className="lg:col-span-8 bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="p-4 md:p-6 border-b flex justify-between items-center bg-gray-50/50">
                                    <h4 className="font-black text-gray-800 text-xs md:text-sm uppercase tracking-widest flex items-center"><Users className="w-4 h-4 mr-2" /> 待录入名单 ({displayPlayers.length})</h4>
                                    <div className="flex gap-2">
                                        <button onClick={handleExportTechPDF} className="p-2 text-gray-400 hover:text-bvb-black" title="导出报告"><Download className="w-4 h-4" /></button>
                                        <button onClick={handleSaveBatchTests} disabled={isSavingTests || Object.keys(testScores).length === 0} className="px-4 md:px-6 py-2 bg-bvb-black text-bvb-yellow font-black rounded-xl shadow-lg hover:brightness-110 disabled:opacity-30 transition-all flex items-center gap-2 text-xs md:text-sm">
                                            {isSavingTests ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 保存成绩表
                                        </button>
                                    </div>
                                </div>
                                <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-gray-100/50 font-black text-gray-400 uppercase text-[9px] md:text-[10px] tracking-widest border-b"><tr><th className="px-3 py-4 md:px-6">球员</th><th className="px-3 py-4 md:px-6 text-center">最近一次成绩</th><th className="px-3 py-4 md:px-6 text-right w-32 md:w-48">本次录入 ({currentTest?.unit})</th><th className="px-3 py-4 md:px-6 w-10"></th></tr></thead><tbody className="divide-y divide-gray-100">{displayPlayers.map(p => { const lastRes = getPlayerLatestResult(p, selectedTestId); return (<tr key={p.id} className="hover:bg-yellow-50/20 transition-colors"><td className="px-3 py-3 md:px-6"><div className="flex items-center gap-2 md:gap-3"><img src={p.image} className="w-8 h-8 rounded-full object-cover border" /><div><p className="font-black text-gray-800 text-[11px] md:text-sm">{p.name}</p><p className="text-[9px] text-gray-400 font-bold uppercase">#{p.number}</p></div></div></td><td className="px-3 py-3 md:px-6 text-center">{lastRes ? (<button onClick={() => setShowTestHistoryPlayerId(p.id)} className="group bg-gray-50 hover:bg-white border border-gray-100 rounded-lg px-2 py-1 transition-all"><span className="font-black text-gray-600 group-hover:text-bvb-black">{lastRes.value} {currentTest?.unit}</span><p className="text-[8px] text-gray-300 font-mono">{lastRes.date}</p></button>) : <span className="text-gray-300 text-[10px] italic">无历史记录</span>}</td><td className="px-3 py-3 md:px-6 text-right"><input type="number" step="0.01" className="w-24 md:w-32 p-2 border rounded-xl font-black text-center text-sm md:text-lg focus:ring-2 focus:ring-bvb-yellow outline-none bg-gray-50 focus:bg-white transition-all" placeholder="录入分数" value={testScores[p.id] || ''} onChange={e => setTestScores({...testScores, [p.id]: e.target.value})} /></td><td className="px-3 py-3 md:px-6 text-right"><button onClick={() => setShowTestHistoryPlayerId(p.id)} className="p-1.5 text-gray-300 hover:text-bvb-black transition-colors"><History className="w-4 h-4" /></button></td></tr>); })}</tbody></table></div>
                            </div>
                            <div className="lg:col-span-4 space-y-6">
                                <div className="bg-bvb-black rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[250px] md:min-h-[300px]">
                                    <div className="z-10">
                                        <p className="text-bvb-yellow text-[10px] font-black uppercase tracking-widest mb-1">当前测试项目</p>
                                        <h4 className="text-2xl md:text-4xl font-black italic tracking-tighter uppercase mb-4 leading-none">{currentTest?.name}</h4>
                                        <div className="h-1 w-12 bg-bvb-yellow/30 rounded-full mb-6"></div>
                                        <p className="text-sm text-gray-400 font-bold leading-relaxed">{currentTest?.description || '暂无描述。录入标准数据以建立梯队性能基准。'}</p>
                                    </div>
                                    <div className="z-10 pt-6 border-t border-white/10 flex items-center justify-between">
                                        <div><span className="text-[10px] font-black text-gray-500 uppercase block mb-1">单位</span><span className="text-xl font-black text-white">{currentTest?.unit}</span></div>
                                        <Target className="w-10 h-10 md:w-16 md:h-16 text-white/5 absolute -right-4 -bottom-4 rotate-12" />
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
                                    <h4 className="font-black text-gray-800 text-xs uppercase mb-4 flex items-center gap-2"><Trophy className="w-4 h-4 text-bvb-yellow" /> 本期 Top 3</h4>
                                    <div className="space-y-4">
                                        {displayPlayers.map(p => ({ ...p, res: getPlayerLatestResult(p, selectedTestId) }))
                                            .filter(p => p.res && p.res.date === testEntryDate)
                                            .sort((a,b) => isLowerBetter(currentTest?.unit) ? a.res!.value - b.res!.value : b.res!.value - a.res!.value)
                                            .slice(0, 3)
                                            .map((p, i) => (
                                                <div key={p.id} className="flex items-center gap-4 bg-gray-50 p-3 rounded-2xl border border-gray-100 relative group overflow-hidden">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${i === 0 ? 'bg-bvb-yellow text-bvb-black' : 'bg-gray-200 text-gray-500'}`}>{i + 1}</div>
                                                    <div className="flex-1 min-w-0"><p className="font-black text-gray-800 text-sm truncate">{p.name}</p><p className="text-[10px] font-bold text-gray-400">Score: {p.res!.value} {currentTest?.unit}</p></div>
                                                </div>
                                            ))
                                        }
                                        {!displayPlayers.some(p => getPlayerLatestResult(p, selectedTestId)?.date === testEntryDate) && <p className="text-center py-6 text-gray-300 italic text-xs">今日暂无提交</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl p-16 md:p-24 text-center border-2 border-dashed border-gray-200 flex flex-col items-center gap-4">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center"><Target className="w-10 h-10 text-gray-200" /></div>
                            <h3 className="text-xl font-black text-gray-400 uppercase italic">请选择左上方测评项目</h3>
                            <p className="text-gray-400 font-bold max-w-xs text-sm">选择一个测试项以开始录入。如果库中没有您想要的测试，请点击“项目配置”添加。</p>
                        </div>
                    )}
                </div>
            )}

            {/* --- MODALS --- */}

            {/* 居家训练详情历史弹窗 */}
            {detailPlayerId && detailPlayer && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 md:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
                    <div className="bg-white w-full h-full md:h-auto md:max-h-[85vh] md:max-w-lg md:rounded-[32px] shadow-2xl overflow-hidden flex flex-col relative">
                        <div className="bg-bvb-black p-6 md:p-8 flex justify-between items-center text-white shrink-0">
                            <div className="flex items-center gap-4">
                                <img src={detailPlayer.image} className="w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-bvb-yellow object-cover" />
                                <div><h3 className="text-xl md:text-2xl font-black leading-tight">{detailPlayer.name}</h3><p className="text-[10px] md:text-xs text-bvb-yellow font-black uppercase tracking-widest mt-0.5">居家训练计次历史</p></div>
                            </div>
                            <button onClick={() => setDetailPlayerId(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar pb-24 md:pb-8">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center"><span className="text-[10px] font-black text-gray-400 uppercase mb-1 block">本月累计</span><div className="text-3xl font-black text-bvb-black">{getHomeStats(detailPlayer).monthCount}<span className="text-xs ml-1">次</span></div></div>
                                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center"><span className="text-[10px] font-black text-gray-400 uppercase mb-1 block">年度累计</span><div className="text-3xl font-black text-bvb-black">{getHomeStats(detailPlayer).yearCount}<span className="text-xs ml-1">次</span></div></div>
                            </div>
                            <div className="space-y-3">
                                <h4 className="font-black text-gray-800 text-xs uppercase tracking-widest flex items-center gap-2"><LayoutList className="w-4 h-4 text-bvb-yellow" /> 详细打卡记录</h4>
                                <div className="space-y-2">
                                    {(detailPlayer.homeTrainingLogs || []).sort((a,b) => b.date.localeCompare(a.date)).map(log => (
                                        <div key={log.id} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-xl shadow-sm group">
                                            <div><p className="font-black text-gray-800 text-sm">{log.title}</p><p className="text-[10px] text-gray-400 font-mono flex items-center gap-1"><Calendar className="w-3 h-3" /> {log.date}</p></div>
                                            {(isDirector || isCoach) && (
                                                <button onClick={() => {
                                                    if(confirm('确定要删除这条打卡记录吗？')) {
                                                        const next = { ...detailPlayer, homeTrainingLogs: (detailPlayer.homeTrainingLogs || []).filter(l => l.id !== log.id) };
                                                        onUpdatePlayer(next);
                                                    }
                                                }} className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                                            )}
                                        </div>
                                    ))}
                                    {(detailPlayer.homeTrainingLogs || []).length === 0 && <div className="py-12 text-center text-gray-300 italic text-sm">暂无记录</div>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 技术测评历史进步弹窗 */}
            {showTestHistoryPlayerId && testHistoryPlayer && currentTest && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md animate-in zoom-in-95 duration-200">
                    <div className="bg-white w-full h-full md:h-auto md:max-w-2xl md:rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-bvb-black p-6 md:p-8 flex justify-between items-center text-white shrink-0">
                            <div className="flex items-center gap-4">
                                <img src={testHistoryPlayer.image} className="w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-bvb-yellow object-cover" />
                                <div><h3 className="text-xl md:text-2xl font-black leading-tight">{testHistoryPlayer.name}</h3><p className="text-[10px] md:text-xs text-bvb-yellow font-black uppercase tracking-widest mt-0.5">{currentTest.name} 进步轨迹</p></div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleExportIndividualTechPDF} disabled={isExportingIndividualTech} className="p-2 text-gray-400 hover:text-bvb-yellow"><Download className="w-5 h-5" /></button>
                                <button onClick={() => setShowTestHistoryPlayerId(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 md:space-y-8 custom-scrollbar pb-24 md:pb-8">
                            <div className="h-48 md:h-64 bg-gray-50 p-4 rounded-3xl border border-gray-100">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={(testHistoryPlayer.testResults || []).filter(r => r.testId === selectedTestId).sort((a,b) => a.date.localeCompare(b.date))}>
                                        <defs>
                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#FDE100" stopOpacity={0.8}/><stop offset="95%" stopColor="#FDE100" stopOpacity={0}/></linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9ca3af', fontWeight: 'bold' }} tickFormatter={d => d.substring(5)} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9ca3af' }} unit={currentTest.unit} reversed={isLowerBetter(currentTest.unit)} domain={['auto', 'auto']} />
                                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                        <Area type="monotone" dataKey="value" stroke="#FDE100" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-3">
                                <h4 className="font-black text-gray-800 text-xs uppercase tracking-widest flex items-center gap-2">历史所有成绩表</h4>
                                <div className="border rounded-2xl overflow-hidden"><table className="w-full text-left text-xs md:text-sm"><thead className="bg-gray-50 text-gray-400 font-black uppercase text-[10px]"><tr><th className="px-4 py-3">日期</th><th className="px-4 py-3 text-right">成绩 ({currentTest.unit})</th><th className="px-4 py-3"></th></tr></thead><tbody className="divide-y divide-gray-100">{(testHistoryPlayer.testResults || []).filter(r => r.testId === selectedTestId).sort((a,b) => b.date.localeCompare(a.date)).map(res => (<tr key={res.id} className="hover:bg-gray-50 transition-colors"><td className="px-4 py-3 font-mono font-bold text-gray-600">{res.date}</td><td className="px-4 py-3 text-right font-black text-bvb-black text-lg leading-none">{res.value}</td><td className="px-4 py-3 text-right">{(isDirector || isCoach) && <button onClick={() => { if(confirm('确定删除该次测评成绩？')) { const next = {...testHistoryPlayer, testResults: (testHistoryPlayer.testResults || []).filter(r => r.id !== res.id)}; onUpdatePlayer(next); } }} className="p-1.5 text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>}</td></tr>))}</tbody></table></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 配置测评项弹窗 */}
            {showConfigModal && isDirector && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in zoom-in-95 duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="bg-bvb-black p-6 flex justify-between items-center text-white shrink-0"><h3 className="font-black text-lg flex items-center uppercase italic"><Settings className="w-5 h-5 mr-2 text-bvb-yellow" /> 配置技术测试库</h3><button onClick={() => setShowConfigModal(false)}><X className="w-6 h-6" /></button></div>
                        <div className="p-6 md:p-8 overflow-y-auto space-y-6 md:space-y-8 flex-1 custom-scrollbar">
                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-4 shadow-inner">
                                <h4 className="font-black text-gray-800 text-xs uppercase tracking-widest flex items-center gap-2"><Plus className="w-4 h-4 text-bvb-yellow" /> 新增测试项</h4>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="text-[10px] font-black text-gray-400 uppercase block mb-1">项目名称</label><input className="w-full p-3 border rounded-xl font-bold bg-white outline-none focus:ring-2 focus:ring-bvb-yellow text-sm" placeholder="如：30米冲刺" value={newTestDef.name} onChange={e => setNewTestDef({...newTestDef, name: e.target.value})} /></div>
                                        <div><label className="text-[10px] font-black text-gray-400 uppercase block mb-1">计分单位</label><input className="w-full p-3 border rounded-xl font-bold bg-white outline-none focus:ring-2 focus:ring-bvb-yellow text-sm" placeholder="如：秒, 次, 个" value={newTestDef.unit} onChange={e => setNewTestDef({...newTestDef, unit: e.target.value})} /></div>
                                    </div>
                                    <div><label className="text-[10px] font-black text-gray-400 uppercase block mb-1">测试描述 / 标准</label><textarea className="w-full p-3 border rounded-xl font-bold bg-white outline-none focus:ring-2 focus:ring-bvb-yellow text-sm h-24 resize-none" placeholder="描述该项测试的具体操作标准流程..." value={newTestDef.description} onChange={e => setNewTestDef({...newTestDef, description: e.target.value})} /></div>
                                    <button onClick={handleAddTestDef} disabled={!newTestDef.name || !newTestDef.unit} className="w-full py-3 bg-bvb-black text-bvb-yellow font-black rounded-xl hover:brightness-110 disabled:opacity-30 transition-all uppercase italic text-xs">添加至库 Add to Library</button>
                                </div>
                            </div>
                            <div className="space-y-3 pb-8">
                                <h4 className="font-black text-gray-800 text-xs uppercase tracking-widest">已保存的测试项</h4>
                                <div className="grid gap-3">
                                    {techTests.map(t => (
                                        <div key={t.id} className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm flex items-center justify-between group">
                                            <div className="flex items-center gap-3"><div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center"><Target className="w-5 h-5 text-gray-400" /></div><div><p className="font-black text-gray-800 text-sm">{t.name}</p><p className="text-[10px] font-bold text-gray-400 uppercase">单位: {t.unit}</p></div></div>
                                            <button onClick={() => handleDeleteTestDef(t.id)} className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                    {techTests.length === 0 && <div className="text-center py-10 text-gray-300 italic text-xs">库中暂无数据</div>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- HIDDEN PDF TEMPLATES --- */}
            
            {/* 技术测试报告 PDF 模板 */}
            <div id="tech-test-report-pdf" className="absolute left-[-9999px] top-0 w-[210mm] bg-white text-black p-0 z-[-1000] font-sans">
                <div className="w-full p-[15mm] flex flex-col bg-white">
                    <div className="flex justify-between items-end border-b-4 border-bvb-yellow pb-6 mb-10">
                        <div className="flex items-center gap-5">
                            {appLogo && <img src={appLogo} className="w-20 h-20 object-contain" crossOrigin="anonymous" />}
                            <div>
                                <h1 className="text-3xl font-black uppercase tracking-tighter text-bvb-black">顽石之光足球俱乐部</h1>
                                <p className="text-sm font-bold text-gray-400 tracking-widest uppercase">青少年精英梯队技术测评报告</p>
                            </div>
                        </div>
                        <div className="text-right"><div className="text-sm font-bold text-gray-500 uppercase">Performance Report</div><div className="text-2xl font-black text-bvb-black">{new Date().toLocaleDateString()}</div></div>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-3xl mb-10 border border-gray-100 flex justify-between items-center relative overflow-hidden">
                        <div className="z-10">
                            <h2 className="text-4xl font-black italic tracking-tighter uppercase mb-2 leading-none text-bvb-black">{currentTest?.name}</h2>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">测试单位: {currentTest?.unit} | 测试梯队: {teams.find(t => t.id === selectedTeamId)?.name || '全部'}</p>
                        </div>
                        <Target className="absolute -right-8 -bottom-8 w-48 h-48 text-bvb-black opacity-5 rotate-12" />
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                        <div className="border-4 border-bvb-black rounded-3xl overflow-hidden shadow-xl">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-bvb-black text-bvb-yellow text-[10px] font-black uppercase tracking-widest">
                                    <tr><th className="p-4">排名</th><th className="p-4">球员姓名</th><th className="p-4">球衣号码</th><th className="p-4 text-center">测评成绩 ({currentTest?.unit})</th><th className="p-4">录入日期</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {displayPlayers.map(p => ({ ...p, res: getPlayerLatestResult(p, selectedTestId) }))
                                        .filter(p => p.res)
                                        .sort((a,b) => isLowerBetter(currentTest?.unit) ? a.res!.value - b.res!.value : b.res!.value - a.res!.value)
                                        .map((p, i) => (
                                            <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                                                <td className="p-4 font-black text-gray-400">{i+1}</td>
                                                <td className="p-4 font-black text-lg text-bvb-black">{p.name}</td>
                                                <td className="p-4 font-mono font-bold text-gray-500">#{p.number}</td>
                                                <td className="p-4 text-center font-black text-2xl text-bvb-black italic">{p.res!.value}</td>
                                                <td className="p-4 font-mono text-xs text-gray-400">{p.res!.date}</td>
                                            </tr>
                                        ))
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="mt-auto pt-10 border-t border-gray-200 flex justify-between items-center text-[10px] text-gray-400 font-mono italic"><span>WSZG CLUB DATA CENTER</span><span>PAGE 1 / OFFICIAL DOCUMENT</span></div>
                </div>
            </div>

            {/* 个人专项测评 PDF 模板 */}
            {testHistoryPlayer && (
                <div id="individual-tech-test-pdf" className="absolute left-[-9999px] top-0 w-[210mm] bg-white text-black p-0 z-[-1000] font-sans">
                    <div className="w-full h-[297mm] p-[15mm] flex flex-col bg-white">
                        <div className="flex justify-between items-end border-b-4 border-bvb-yellow pb-6 mb-10">
                            <div className="flex items-center gap-5">
                                {appLogo && <img src={appLogo} className="w-20 h-20 object-contain" crossOrigin="anonymous" />}
                                <div><h1 className="text-3xl font-black uppercase tracking-tighter text-bvb-black">{testHistoryPlayer.name}</h1><p className="text-sm font-bold text-gray-400 tracking-widest uppercase">个人专项测评进步报告 / Growth Journal</p></div>
                            </div>
                        </div>
                        <div className="flex-1 space-y-10">
                            <div className="grid grid-cols-12 gap-8 items-center bg-gray-50 rounded-3xl p-10 border border-gray-100">
                                <div className="col-span-4 flex flex-col items-center">
                                    <div className="w-40 h-40 rounded-full border-[6px] border-bvb-yellow overflow-hidden shadow-2xl bg-white"><img src={testHistoryPlayer.image} className="w-full h-full object-cover" crossOrigin="anonymous"/></div>
                                    <div className="bg-bvb-black text-bvb-yellow px-4 py-1 rounded-full text-sm font-black mt-4 uppercase">Elite Prospect</div>
                                </div>
                                <div className="col-span-8">
                                    <h2 className="text-5xl font-black text-gray-900 mb-2 italic tracking-tighter uppercase">{currentTest?.name}</h2>
                                    <p className="text-lg font-bold text-gray-400 uppercase tracking-widest border-b pb-4 mb-6">Historical Track Record</p>
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                            <span className="text-xs font-black text-gray-400 uppercase block mb-1">历史最高值 (PB)</span>
                                            <div className="text-4xl font-black text-bvb-black italic">{(testHistoryPlayer.testResults || []).filter(r => r.testId === selectedTestId).length > 0 ? (isLowerBetter(currentTest?.unit) ? Math.min(...(testHistoryPlayer.testResults || []).filter(r => r.testId === selectedTestId).map(r => r.value)) : Math.max(...(testHistoryPlayer.testResults || []).filter(r => r.testId === selectedTestId).map(r => r.value))) : 0} <span className="text-sm not-italic ml-1">{currentTest?.unit}</span></div>
                                        </div>
                                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                            <span className="text-xs font-black text-gray-400 uppercase block mb-1">测试总频次</span>
                                            <div className="text-4xl font-black text-bvb-black italic">{(testHistoryPlayer.testResults || []).filter(r => r.testId === selectedTestId).length} <span className="text-sm not-italic ml-1">次</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <h3 className="text-2xl font-black text-bvb-black uppercase border-l-8 border-bvb-yellow pl-4 italic tracking-tighter">Performance Evolution / 进化曲线</h3>
                                <div className="h-80 w-full border border-gray-100 rounded-3xl p-6 bg-white shadow-inner">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={(testHistoryPlayer.testResults || []).filter(r => r.testId === selectedTestId).sort((a,b) => a.date.localeCompare(b.date))}>
                                            <defs><linearGradient id="colorValuePDF" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#FDE100" stopOpacity={0.8}/><stop offset="95%" stopColor="#FDE100" stopOpacity={0}/></linearGradient></defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                            <XAxis dataKey="date" tick={{fontSize: 10, fontWeight: 'bold'}} />
                                            <YAxis unit={currentTest?.unit} reversed={isLowerBetter(currentTest?.unit)} tick={{fontSize: 10, fontWeight: 'bold'}} />
                                            <Area type="monotone" dataKey="value" stroke="#FDE100" strokeWidth={5} fillOpacity={1} fill="url(#colorValuePDF)" isAnimationActive={false} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                        <div className="mt-auto pt-10 border-t border-gray-200 flex justify-between items-center text-xs text-gray-400 font-mono italic"><span>WSZG CLUB • INDIVIDUAL PERFORMANCE TRACKER</span><span>CONFIDENTIAL REPORT</span></div>
                    </div>
                </div>
            )}

            {/* 居家训练计次梯队报告 PDF 模板 */}
            <div id="home-training-team-pdf" className="absolute left-[-9999px] top-0 w-[210mm] bg-white text-black p-0 z-[-1000] font-sans">
                <div className="w-full p-[15mm] flex flex-col bg-white">
                    <div className="flex justify-between items-end border-b-4 border-bvb-yellow pb-6 mb-10">
                        <div className="flex items-center gap-5">
                            {appLogo && <img src={appLogo} className="w-20 h-20 object-contain" crossOrigin="anonymous" />}
                            <div>
                                <h1 className="text-3xl font-black uppercase tracking-tighter text-bvb-black">顽石之光足球俱乐部</h1>
                                <p className="text-sm font-bold text-gray-400 tracking-widest uppercase">居家训练考勤月度报告 (梯队全览)</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-bvb-black text-white p-8 rounded-3xl mb-8 flex justify-between items-center">
                        <div>
                            <p className="text-bvb-yellow text-xs font-black uppercase tracking-widest mb-1">报告周期</p>
                            <h2 className="text-3xl font-black italic uppercase tracking-tight">{viewYear}年{viewMonth + 1}月度报告</h2>
                        </div>
                        <div className="text-right">
                            <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-1">所属梯队</p>
                            <h2 className="text-3xl font-black text-white uppercase italic tracking-tight">{teams.find(t => t.id === selectedTeamId)?.name || '全梯队'}</h2>
                        </div>
                    </div>
                    <div className="border-4 border-gray-100 rounded-3xl overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                                <tr><th className="p-4">姓名</th><th className="p-4">球衣号码</th><th className="p-4 text-center">本月打卡频次</th><th className="p-4 text-center">历史年度总计</th><th className="p-4 text-right">荣誉评价</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {displayPlayers.map(p => {
                                    const stats = getHomeStats(p);
                                    return (
                                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 font-black text-lg text-bvb-black">{p.name}</td>
                                            <td className="p-4 font-mono font-bold text-gray-400">#{p.number}</td>
                                            <td className="p-4 text-center font-black text-2xl italic">{stats.monthCount}</td>
                                            <td className="p-4 text-center font-bold text-gray-400">{stats.yearCount}</td>
                                            <td className="p-4 text-right">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${stats.monthCount >= 15 ? 'bg-green-100 text-green-700 border-green-200' : stats.monthCount > 5 ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-gray-100 text-gray-400'}`}>
                                                    {stats.monthCount >= 15 ? '勤奋标兵' : stats.monthCount > 5 ? '表现良好' : '继续努力'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-10 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                        <h4 className="font-black text-gray-800 text-sm uppercase tracking-widest mb-4 flex items-center gap-2"><Gauge className="w-5 h-5 text-bvb-yellow" /> 总监/主教练评估意见</h4>
                        <div className="h-32 border-2 border-dashed border-gray-200 rounded-xl bg-white"></div>
                    </div>
                    <div className="mt-auto pt-10 border-t border-gray-200 flex justify-between items-center text-[10px] text-gray-400 font-mono italic"><span>WSZG CLUB DATA MANAGEMENT SYSTEM</span><span>VERIFIED ON {new Date().toLocaleDateString()}</span></div>
                </div>
            </div>

        </div>
    );
};
export default TechnicalGrowth;
