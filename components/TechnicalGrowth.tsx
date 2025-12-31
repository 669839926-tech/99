
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
    
    // 初始化选中的梯队：如果是教练，默认为其管理的第一个梯队
    const [selectedTeamId, setSelectedTeamId] = useState<string>(() => {
        if (isCoach && managedTeams.length > 0) return managedTeams[0].id;
        return 'all';
    });

    // 当用户管理的梯队发生变化时（虽然通常不会），确保选中的 ID 有效
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

    // 辅助逻辑：判断是否是“数值越小越好”的单位
    const isLowerBetter = (unit?: string) => {
        if (!unit) return false;
        const u = unit.toLowerCase();
        return u.includes('秒') || u.includes('s') || u.includes('分') || u.includes('min');
    };

    // 核心数据隔离：计算当前视图下可见的球员列表
    const displayPlayers = useMemo(() => {
        // 第一层过滤：基于用户权限的球员基数
        const basePlayers = isDirector 
            ? players 
            : players.filter(p => currentUser?.teamIds?.includes(p.teamId));

        // 第二层过滤：基于页面顶部选中的梯队筛选器
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

    // --- 颠球逻辑 ---
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

    // --- 技术测试逻辑 ---
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

    const getTestTrendData = (player: Player, testId: string) => {
        return (player.testResults || [])
            .filter(r => r.testId === testId)
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(r => ({ date: r.date, value: r.value }));
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

    const techSummary = useMemo(() => {
        if (!selectedTestId) return { avg: 0, best: 0, count: 0 };
        const results = displayPlayers.map(p => getPlayerLatestResult(p, selectedTestId)).filter(Boolean) as TechTestResult[];
        if (results.length === 0) return { avg: 0, best: 0, count: 0 };
        const values = results.map(r => r.value);
        const unit = techTests.find(t => t.id === selectedTestId)?.unit;
        
        return {
            avg: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
            best: isLowerBetter(unit) ? Math.min(...values) : Math.max(...values),
            count: values.length
        };
    }, [displayPlayers, selectedTestId, techTests]);

    // --- 居家训练导出逻辑 ---
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

    const handleExportHomeIndividualPDF = async (playerId: string) => {
        setIsExportingHome(true);
        const p = players.find(p => p.id === playerId);
        try {
            await exportToPDF('home-training-individual-pdf', `居家训练个人报告_${p?.name}_${viewYear}年`);
        } catch (e) {
            alert('导出失败');
        } finally {
            setIsExportingHome(false);
        }
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-bvb-black uppercase italic tracking-tighter">球员成长中心</h2>
                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Digital Performance Tracking & Analytics</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-white rounded-xl border p-1 shadow-sm shrink-0">
                        <button onClick={() => { if(viewMonth === 0) { setViewMonth(11); setViewYear(viewYear-1); } else setViewMonth(viewMonth-1); }} className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><ChevronLeft className="w-5 h-5 text-gray-400" /></button>
                        <span className="px-4 font-black text-xs min-w-[90px] text-center">{viewYear}年 {viewMonth + 1}月</span>
                        <button onClick={() => { if(viewMonth === 11) { setViewMonth(0); setViewYear(viewYear+1); } else setViewMonth(viewMonth+1); }} className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><ChevronRightIcon className="w-5 h-5 text-gray-400" /></button>
                    </div>
                    {/* 梯队筛选器：受权限控制 */}
                    <select 
                        value={selectedTeamId} 
                        onChange={e => setSelectedTeamId(e.target.value)}
                        className="p-2 border rounded-xl text-xs font-black bg-white outline-none focus:ring-2 focus:ring-bvb-yellow"
                    >
                        {isDirector && <option value="all">所有梯队</option>}
                        {managedTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
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
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
                            <h3 className="font-black text-gray-800 mb-6 flex items-center uppercase tracking-tighter text-lg"><Plus className="w-6 h-6 mr-2 text-bvb-yellow" /> 录入颠球成绩</h3>
                            <div className="space-y-4">
                                <div className="relative">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">选择球员</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                        <input className="w-full pl-9 pr-4 py-3 border rounded-xl font-bold bg-gray-50 focus:ring-2 focus:ring-bvb-yellow outline-none text-sm" placeholder="搜索姓名..." value={jugglingSearch} onChange={e => setJugglingSearch(e.target.value)} />
                                    </div>
                                    <div className="mt-2 grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto custom-scrollbar p-1">
                                        {displayPlayers.filter(p => p.name.includes(jugglingSearch)).map(p => (
                                            <button key={p.id} onClick={() => setJugglingPlayerId(p.id)} className={`p-2 rounded-xl border text-xs font-bold transition-all text-left truncate flex items-center gap-2 ${jugglingPlayerId === p.id ? 'bg-bvb-black text-bvb-yellow border-bvb-black shadow-lg' : 'bg-white text-gray-600 hover:border-bvb-yellow'}`}><img src={p.image} className="w-5 h-5 rounded-full object-cover" /><span className="truncate">{p.name}</span></button>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">挑战日期</label><input type="date" className="w-full p-3 border rounded-xl font-bold bg-gray-50 text-sm focus:ring-2 focus:ring-bvb-yellow outline-none" value={jugglingDate} onChange={e => setJugglingDate(e.target.value)} /></div>
                                    <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">完成个数</label><input type="number" className="w-full p-3 border rounded-xl font-black bg-gray-50 text-center text-lg focus:ring-2 focus:ring-bvb-yellow outline-none" placeholder="0" value={jugglingCount} onChange={e => setJugglingCount(e.target.value)} /></div>
                                </div>
                                <button onClick={handleAddJuggling} disabled={!jugglingPlayerId || !jugglingCount} className="w-full py-4 bg-bvb-black text-bvb-yellow font-black rounded-2xl shadow-xl disabled:opacity-30 hover:brightness-110 active:scale-95 transition-all uppercase italic">保存记录 Record Achievement</button>
                            </div>
                        </div>
                        {focusedPlayer && (
                            <div id="juggling-report-pdf" className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 animate-in fade-in duration-500 space-y-6 overflow-hidden relative">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <img src={focusedPlayer.image} className="w-12 h-12 rounded-full object-cover border-2 border-bvb-yellow" />
                                        <div><h3 className="font-black text-gray-800 text-lg leading-tight">{focusedPlayer.name}</h3><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">#{focusedPlayer.number} • 球员成长档案</p></div>
                                    </div>
                                    <button onClick={async () => { setIsExporting(true); try { await exportToPDF('juggling-report-pdf', `颠球挑战档案_${focusedPlayer.name}`); } catch (e) { alert('导出失败'); } finally { setIsExporting(false); } }} disabled={isExporting} className="p-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-bvb-black hover:text-bvb-yellow transition-all">{isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}</button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100"><p className="text-[9px] font-black text-gray-400 uppercase mb-1">本周最高</p><p className="text-2xl font-black text-bvb-black">{getJugglingStats(focusedPlayer).max}</p></div>
                                    <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100"><p className="text-[9px] font-black text-gray-400 uppercase mb-1">荣誉等级</p><span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${getHonorBadge(getJugglingStats(focusedPlayer).max).color}`}>{getHonorBadge(getJugglingStats(focusedPlayer).max).label}</span></div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center"><h4 className="font-black text-gray-800 flex items-center uppercase tracking-tighter text-xs"><TrendingUp className="w-4 h-4 mr-2 text-bvb-yellow" /> 进步曲线</h4></div>
                                    <div className="h-40 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={jugglingTrendData}><defs><linearGradient id="colorJugReport" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#FDE100" stopOpacity={0.4}/><stop offset="95%" stopColor="#FDE100" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" /><XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 'bold' }} /><YAxis hide /><Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} /><Area type="monotone" dataKey="count" stroke="#FDE100" strokeWidth={3} fillOpacity={1} fill="url(#colorJugReport)" /></AreaChart></ResponsiveContainer></div>
                                </div>
                                <div className="space-y-3 pt-4 border-t border-gray-100">
                                    <h4 className="font-black text-gray-800 flex items-center uppercase tracking-tighter text-xs"><LayoutList className="w-4 h-4 mr-2 text-bvb-yellow" /> 详细挑战清单</h4>
                                    <div className="max-h-60 overflow-y-auto custom-scrollbar pr-1"><table className="w-full text-left text-[11px]"><thead className="bg-gray-50 text-gray-400 font-black uppercase sticky top-0"><tr><th className="p-2 border-b">日期</th><th className="p-2 border-b text-right">成绩</th></tr></thead><tbody className="divide-y divide-gray-50">{(focusedPlayer.jugglingHistory || []).sort((a,b) => b.date.localeCompare(a.date)).map(h => (<tr key={h.id} className="hover:bg-gray-50 transition-colors"><td className="p-2 font-mono text-gray-500">{h.date}</td><td className="p-2 text-right font-black text-bvb-black">{h.count} 个</td></tr>))}</tbody></table></div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="lg:col-span-8 space-y-6">
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                            <div className="p-6 border-b flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50">
                                <div className="flex items-center gap-4"><h3 className="font-black text-gray-800 flex items-center uppercase italic text-lg"><Trophy className="w-6 h-6 mr-2 text-bvb-yellow" /> 挑战光荣榜</h3>
                                    <div className="flex bg-white p-1 rounded-xl border shadow-sm"><button onClick={() => setStatPeriod('month')} className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${statPeriod === 'month' ? 'bg-bvb-black text-bvb-yellow' : 'text-gray-400 hover:text-gray-600'}`}>按月</button><button onClick={() => setStatPeriod('quarter')} className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${statPeriod === 'quarter' ? 'bg-bvb-black text-bvb-yellow' : 'text-gray-400 hover:text-gray-600'}`}>按季</button><button onClick={() => setStatPeriod('year')} className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${statPeriod === 'year' ? 'bg-bvb-black text-bvb-yellow' : 'text-gray-400 hover:text-gray-600'}`}>全年度</button></div>
                                </div>
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white px-3 py-1.5 rounded-full border border-gray-100">{statPeriod === 'month' ? `统计周期: ${viewYear}-${viewMonth + 1}` : statPeriod === 'quarter' ? `统计周期: ${viewYear} Q${Math.floor(viewMonth / 3) + 1}` : `统计周期: ${viewYear} 全年`}</div>
                            </div>
                            <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-gray-100/50 font-black text-gray-400 uppercase text-[9px] md:text-[10px] tracking-tighter md:tracking-widest border-b"><tr><th className="px-2 py-3 md:px-6 md:py-4">排名</th><th className="px-2 py-3 md:px-6 md:py-4">球员姓名</th><th className="px-2 py-3 md:px-6 md:py-4 text-center">最高</th><th className="px-2 py-3 md:px-6 md:py-4 text-center">平均</th><th className="px-2 py-3 md:px-6 md:py-4 text-center">次数</th><th className="px-2 py-3 md:px-6 md:py-4 text-right">荣耀等级</th></tr></thead><tbody className="divide-y divide-gray-100">{jugglingLeaderboard.map((p, idx) => { const badge = getHonorBadge(p.stats.max); return (<tr key={p.id} className={`hover:bg-yellow-50/30 transition-colors cursor-pointer group ${jugglingPlayerId === p.id ? 'bg-yellow-50/50' : ''}`} onClick={() => setJugglingPlayerId(p.id)}><td className="px-2 py-3 md:px-6 md:py-4"><div className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center font-black text-[10px] md:text-xs ${idx < 3 ? 'bg-bvb-yellow text-bvb-black border-2 border-bvb-black shadow-md' : 'bg-gray-100 text-gray-400'}`}>{idx + 1}</div></td><td className="px-2 py-3 md:px-6 md:py-4"><div className="flex items-center gap-1.5 md:gap-3"><img src={p.image} className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover border-2 border-white shadow-sm transition-transform group-hover:scale-110" /><div><p className="font-black text-gray-800 text-xs md:text-sm transition-all truncate max-w-[60px] md:max-w-none">{p.name}</p><p className="text-[8px] md:text-[10px] text-gray-400 font-bold uppercase">{teams.find(t => t.id === p.teamId)?.level}</p></div></div></td><td className="px-2 py-3 md:px-6 md:py-4 text-center"><span className="text-base md:text-xl font-black text-bvb-black">{p.stats.max}</span><span className="text-[8px] md:text-[10px] text-gray-400 ml-0.5 font-bold">个</span></td><td className="px-2 py-3 md:px-6 md:py-4 text-center font-bold text-gray-500 text-[10px] md:text-sm tabular-nums">{p.stats.avg}</td><td className="px-2 py-3 md:px-6 md:py-4 text-center font-bold text-gray-400 text-[10px] md:text-sm">{p.stats.count}</td><td className="px-2 py-3 md:px-6 md:py-4 text-right"><span className={`text-[8px] md:text-[10px] font-black px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-full border shadow-sm flex items-center justify-center gap-0.5 min-w-[60px] md:min-w-[80px] uppercase whitespace-nowrap ${badge.color}`}>{p.stats.max >= 100 && <Star className="w-2 md:w-2.5 h-2 md:h-2.5 fill-current" />}{badge.label}</span></td></tr>); })}</tbody></table></div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: Home Training */}
            {activeTab === 'home' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in slide-in-from-right-4">
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
                            <h3 className="font-black text-gray-800 mb-6 flex items-center uppercase tracking-tighter text-lg"><CheckSquare className="w-6 h-6 mr-2 text-bvb-yellow" /> 快速批量打卡</h3>
                            <div className="space-y-4 mb-6">
                                <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">选择日期</label><input type="date" className="w-full p-3 border rounded-xl font-bold bg-gray-50 focus:ring-2 focus:ring-bvb-yellow outline-none" value={homeDate} onChange={e => setHomeDate(e.target.value)} /></div>
                                <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">训练主题</label><input className="w-full p-3 border rounded-xl font-bold bg-gray-50 focus:ring-2 focus:ring-bvb-yellow outline-none" placeholder="如：触球练习" value={homeTitle} onChange={e => setHomeTitle(e.target.value)} /></div>
                            </div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex justify-between"><span>待选球员 ({displayPlayers.length})</span><button onClick={() => setSelectedPlayerIds(selectedPlayerIds.size === displayPlayers.length ? new Set() : new Set(displayPlayers.map(p => p.id)))} className="text-bvb-black hover:underline">全选/取消</button></p>
                            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar mb-6">{displayPlayers.map(p => (<button key={p.id} onClick={() => { const next = new Set(selectedPlayerIds); if (next.has(p.id)) next.delete(p.id); else next.add(p.id); setSelectedPlayerIds(next); }} className={`flex items-center gap-2 p-2 rounded-xl border-2 transition-all ${selectedPlayerIds.has(p.id) ? 'bg-bvb-yellow/10 border-bvb-yellow' : 'bg-white border-gray-100'}`}><div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedPlayerIds.has(p.id) ? 'bg-bvb-yellow border-bvb-black' : 'border-gray-300'}`}>{selectedPlayerIds.has(p.id) && <CheckCircle className="w-3 h-3 text-bvb-black" />}</div><span className="text-xs font-bold text-gray-700 truncate">{p.name}</span></button>))}</div>
                            <button onClick={() => { selectedPlayerIds.forEach(id => { const p = players.find(p => p.id === id); if (p) onUpdatePlayer({ ...p, homeTrainingLogs: [...(p.homeTrainingLogs || []), { id: `home-${Date.now()}-${id}`, playerId: id, date: homeDate, title: homeTitle, duration: 0 }] }); }); setSelectedPlayerIds(new Set()); alert('批量打卡成功！'); }} disabled={selectedPlayerIds.size === 0} className="w-full py-4 bg-bvb-black text-bvb-yellow font-black rounded-2xl shadow-xl disabled:opacity-30 flex items-center justify-center gap-2 hover:brightness-110 transition-all"><Plus className="w-5 h-5" /> 确认 {selectedPlayerIds.size} 人打卡</button>
                        </div>
                    </div>
                    <div className="lg:col-span-8 space-y-6">
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-6 bg-gray-50 border-b flex flex-col md:flex-row justify-between items-center gap-4">
                                <h3 className="font-black text-gray-800 flex items-center uppercase italic text-lg"><BarChart3 className="w-6 h-6 mr-2 text-bvb-yellow" /> 居家训练计次榜</h3>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={handleExportHomeTeamPDF}
                                        disabled={isExportingHome}
                                        className="text-[10px] font-black text-gray-600 uppercase tracking-widest bg-white px-3 py-1.5 rounded-full border border-gray-200 flex items-center gap-2 hover:bg-gray-50 transition-colors disabled:opacity-50"
                                    >
                                        {isExportingHome ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileDown className="w-3 h-3" />}
                                        导出梯队报告
                                    </button>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white px-3 py-1.5 rounded-full border border-gray-200">点击球员查看详情</span>
                                </div>
                            </div>
                            <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-gray-100/50 font-black text-gray-400 uppercase text-[10px] tracking-widest border-b"><tr><th className="px-6 py-4">球员</th><th className="px-6 py-4 text-center">本月次数</th><th className="px-6 py-4 text-center">年度总计</th><th className="px-6 py-4">状态</th></tr></thead><tbody className="divide-y divide-gray-100">{displayPlayers.map((p, idx) => { const stats = getHomeStats(p); return (<tr key={p.id} onClick={() => setDetailPlayerId(p.id)} className="hover:bg-yellow-50/50 transition-colors cursor-pointer group"><td className="px-6 py-4"><div className="flex items-center gap-3"><div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] ${idx < 3 ? 'bg-bvb-yellow text-bvb-black' : 'bg-gray-100 text-gray-400'}`}>{idx + 1}</div><img src={p.image} className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm" /><span className="font-black text-gray-800 transition-all">{p.name}</span></div></td><td className="px-6 py-4 text-center font-black text-lg text-bvb-black">{stats.monthCount}</td><td className="px-6 py-4 text-center font-bold text-gray-400">{stats.yearCount}</td><td className="px-6 py-4">{stats.monthCount >= 15 ? (<span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-1 rounded-full border border-green-200 uppercase">勤奋标兵</span>) : stats.monthCount > 0 ? (<span className="bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-1 rounded-full border border-blue-100 uppercase">表现良好</span>) : <span className="text-gray-300 text-[10px] font-black uppercase">未开启</span>}</td></tr>); })}</tbody></table></div>
                        </div>
                    </div>
                </div>
            )}
            {/* ... tests tab and modals remain the same ... */}
        </div>
    );
};
export default TechnicalGrowth;
