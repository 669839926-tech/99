
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
        } catch (e) {
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
                    <h2 className="text-3xl font-black text-bvb-black uppercase italic tracking-tighter">技术成长中心</h2>
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
                                        <div><h3 className="font-black text-gray-800 text-lg leading-tight">{focusedPlayer.name}</h3><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">#{focusedPlayer.number} • 技术成长档案</p></div>
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
                            <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-gray-100/50 font-black text-gray-400 uppercase text-[10px] tracking-widest border-b"><tr><th className="px-6 py-4">排名</th><th className="px-6 py-4">球员姓名</th><th className="px-6 py-4 text-center">最高纪录</th><th className="px-6 py-4 text-center">平均成绩</th><th className="px-6 py-4 text-center">挑战次数</th><th className="px-6 py-4 text-right">荣耀等级</th></tr></thead><tbody className="divide-y divide-gray-100">{jugglingLeaderboard.map((p, idx) => { const badge = getHonorBadge(p.stats.max); return (<tr key={p.id} className={`hover:bg-yellow-50/30 transition-colors cursor-pointer group ${jugglingPlayerId === p.id ? 'bg-yellow-50/50' : ''}`} onClick={() => setJugglingPlayerId(p.id)}><td className="px-6 py-4"><div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${idx < 3 ? 'bg-bvb-yellow text-bvb-black border-2 border-bvb-black shadow-md' : 'bg-gray-100 text-gray-400'}`}>{idx + 1}</div></td><td className="px-6 py-4"><div className="flex items-center gap-3"><img src={p.image} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm transition-transform group-hover:scale-110" /><div><p className="font-black text-gray-800 text-sm transition-all">{p.name}</p><p className="text-[10px] text-gray-400 font-bold uppercase">{teams.find(t => t.id === p.teamId)?.level}</p></div></div></td><td className="px-6 py-4 text-center"><span className="text-xl font-black text-bvb-black">{p.stats.max}</span><span className="text-[10px] text-gray-400 ml-1 font-bold">个</span></td><td className="px-6 py-4 text-center font-bold text-gray-500 tabular-nums">{p.stats.avg}</td><td className="px-6 py-4 text-center font-bold text-gray-400">{p.stats.count}</td><td className="px-6 py-4 text-right"><span className={`text-[10px] font-black px-2.5 py-1 rounded-full border shadow-sm flex items-center justify-center gap-1 min-w-[80px] uppercase ${badge.color}`}>{p.stats.max >= 100 && <Star className="w-2.5 h-2.5 fill-current" />}{badge.label}</span></td></tr>); })}</tbody></table></div>
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

            {/* TAB: Technical Tests */}
            {activeTab === 'tests' && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                    {/* Header with Settings */}
                    <div className="flex justify-between items-center bg-white p-4 rounded-2xl border shadow-sm flex-wrap gap-4">
                        <div className="flex items-center gap-4 flex-wrap">
                            <h3 className="font-black text-gray-800 uppercase italic flex items-center"><Gauge className="w-6 h-6 mr-2 text-bvb-yellow" /> 技术测评录入</h3>
                            <div className="h-6 w-px bg-gray-200 hidden md:block"></div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-gray-400 uppercase">当前项目</span>
                                <select 
                                    className="p-2 border rounded-xl text-xs font-black bg-gray-50 focus:ring-2 focus:ring-bvb-yellow outline-none min-w-[140px]"
                                    value={selectedTestId}
                                    onChange={e => setSelectedTestId(e.target.value)}
                                >
                                    <option value="">-- 选择测试项目 --</option>
                                    {techTests.map(t => <option key={t.id} value={t.id}>{t.name} ({t.unit})</option>)}
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-gray-400 uppercase">测试日期</span>
                                <input type="date" className="p-2 border rounded-xl text-xs font-black bg-gray-50" value={testEntryDate} onChange={e => setTestEntryDate(e.target.value)} />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => resultsFileInputRef.current?.click()} disabled={isImportingResults} className="p-2 bg-white border border-gray-200 text-blue-600 rounded-xl hover:bg-blue-50 transition-all flex items-center gap-2 font-black text-xs uppercase tracking-widest">
                                {isImportingResults ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} 导入成绩
                            </button>
                            <input type="file" ref={resultsFileInputRef} className="hidden" accept=".csv" onChange={handleImportResultsCSV} />
                            <button onClick={handleExportExcel} disabled={!selectedTestId || selectedTeamId === 'all'} className="p-2 bg-white border border-gray-200 text-green-600 rounded-xl hover:bg-green-50 transition-all flex items-center gap-2 font-black text-xs uppercase tracking-widest disabled:opacity-30">
                                <FileSpreadsheet className="w-4 h-4" /> 导出表格
                            </button>
                            <button onClick={handleExportTechPDF} disabled={isExportingTech || !selectedTestId || selectedTeamId === 'all'} className="p-2 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all flex items-center gap-2 font-black text-xs uppercase tracking-widest disabled:opacity-30">
                                {isExportingTech ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />} 导出汇总报告
                            </button>
                            <button onClick={() => setShowConfigModal(true)} className="p-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-bvb-black hover:text-bvb-yellow transition-all flex items-center gap-2 font-black text-xs uppercase tracking-widest"><Settings className="w-4 h-4" /> 项目配置</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Score Entry Table */}
                        <div className="lg:col-span-8 bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-6 bg-gray-50 border-b flex justify-between items-center flex-wrap gap-4">
                                <div>
                                    <h4 className="font-black text-gray-800 uppercase tracking-tighter">
                                        {selectedTeamId === 'all' ? '请先选择梯队' : `${managedTeams.find(t => t.id === selectedTeamId)?.name} 成绩单`}
                                    </h4>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">批量录入成绩，点击下方球员可查看个人趋势</p>
                                </div>
                                <button 
                                    onClick={handleSaveBatchTests}
                                    disabled={selectedTeamId === 'all' || !selectedTestId || isSavingTests}
                                    className="px-6 py-2.5 bg-bvb-black text-bvb-yellow font-black rounded-xl shadow-lg flex items-center gap-2 disabled:opacity-30 hover:brightness-110 active:scale-95 transition-all"
                                >
                                    {isSavingTests ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    保存本场成绩 Save Scores
                                </button>
                            </div>
                            <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                                <table className="w-full text-left">
                                    <thead className="bg-white font-black text-gray-400 uppercase text-[10px] tracking-widest border-b sticky top-0 z-10">
                                        <tr>
                                            <th className="px-6 py-4">球员姓名</th>
                                            <th className="px-6 py-4 text-center">历史最佳</th>
                                            <th className="px-6 py-4 text-center">最近成绩</th>
                                            <th className="px-6 py-4 text-right">本次成绩录入</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {selectedTeamId === 'all' && isDirector ? (
                                            <tr><td colSpan={4} className="py-20 text-center text-gray-400 italic font-bold">-- 请在顶部先选择一个具体的梯队 --</td></tr>
                                        ) : displayPlayers.map(p => {
                                            const latest = getPlayerLatestResult(p, selectedTestId);
                                            const all = (p.testResults || []).filter(r => r.testId === selectedTestId).map(r => r.value);
                                            const unit = techTests.find(t => t.id === selectedTestId)?.unit;
                                            const best = all.length ? (isLowerBetter(unit) ? Math.min(...all) : Math.max(...all)) : '-';
                                            return (
                                                <tr key={p.id} className="hover:bg-yellow-50/20 group">
                                                    <td className="px-6 py-4 cursor-pointer" onClick={() => setShowTestHistoryPlayerId(p.id)}>
                                                        <div className="flex items-center gap-3">
                                                            <img src={p.image} className="w-8 h-8 rounded-full object-cover border" />
                                                            <div><p className="font-black text-gray-800 text-sm group-hover:text-bvb-black group-hover:underline">{p.name}</p><p className="text-[10px] text-gray-400">#{p.number}</p></div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-bold text-gray-400">{best} {best !== '-' ? techTests.find(t => t.id === selectedTestId)?.unit : ''}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        {latest ? (
                                                            <div><span className="font-black text-bvb-black">{latest.value}</span><p className="text-[9px] text-gray-400 font-mono">{latest.date}</p></div>
                                                        ) : <span className="text-gray-300">-</span>}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="inline-flex items-center gap-2">
                                                            <input 
                                                                type="number" step="0.01" 
                                                                className="w-24 p-2 bg-gray-50 border rounded-lg text-center font-black outline-none focus:ring-2 focus:ring-bvb-yellow transition-all"
                                                                placeholder="数值"
                                                                value={testScores[p.id] || ''}
                                                                onChange={e => setTestScores({...testScores, [p.id]: e.target.value})}
                                                            />
                                                            <span className="text-xs font-bold text-gray-400 w-8 text-left">{techTests.find(t => t.id === selectedTestId)?.unit || ''}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Right: Team Overview or Selected Player Trend */}
                        <div className="lg:col-span-4 space-y-6">
                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
                                <h4 className="font-black text-gray-800 flex items-center uppercase tracking-tighter text-sm mb-6"><BarChart3 className="w-5 h-5 mr-2 text-bvb-yellow" /> 团队成绩分布</h4>
                                {selectedTestId ? (
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={displayPlayers.map(p => ({ name: p.name, val: getPlayerLatestResult(p, selectedTestId)?.value || 0 })).sort((a,b) => a.val - b.val)}>
                                                <defs>
                                                    <linearGradient id="colorTeamTech" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#FDE100" stopOpacity={0.3}/>
                                                        <stop offset="95%" stopColor="#FDE100" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                                <XAxis dataKey="name" hide />
                                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} reversed={isLowerBetter(techTests.find(t => t.id === selectedTestId)?.unit)} />
                                                <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                                <Area type="monotone" dataKey="val" stroke="#FDE100" strokeWidth={3} fillOpacity={1} fill="url(#colorTeamTech)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : <div className="h-64 flex flex-col items-center justify-center text-gray-400 italic text-sm text-center">-- 请选择测试项以查看分布 --</div>}
                            </div>
                            
                            <div className="bg-bvb-black p-6 rounded-3xl shadow-xl text-white overflow-hidden relative">
                                <div className="z-10 relative">
                                    <h4 className="font-black uppercase tracking-widest text-xs text-bvb-yellow mb-4">测试项目说明</h4>
                                    {selectedTestId ? (
                                        <>
                                            <p className="font-black text-xl mb-2">{techTests.find(t => t.id === selectedTestId)?.name}</p>
                                            <p className="text-sm text-gray-400 leading-relaxed">{techTests.find(t => t.id === selectedTestId)?.description || '暂无详细描述...'}</p>
                                        </>
                                    ) : <p className="text-sm text-gray-500 italic">请在上方选择一个测试项目以查看详情。</p>}
                                </div>
                                <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/5 rounded-full"></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Project Configuration */}
            {showConfigModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-bvb-black p-6 flex justify-between items-center text-white shrink-0">
                            <h3 className="font-black text-xl flex items-center uppercase italic tracking-tighter"><Settings className="w-6 h-6 mr-3 text-bvb-yellow" /> 测试项目库管理</h3>
                            <button onClick={() => setShowConfigModal(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 bg-gray-50/50">
                            <div>
                                <h4 className="font-black text-gray-500 uppercase tracking-widest text-[10px] mb-4">新增测评项目</h4>
                                <div className="space-y-4">
                                    <input className="w-full p-3 border rounded-xl font-bold bg-white focus:ring-2 focus:ring-bvb-yellow outline-none text-sm" placeholder="项目名称 (如: 30米冲刺)" value={newTestDef.name} onChange={e => setNewTestDef({...newTestDef, name: e.target.value})} />
                                    <input className="w-full p-3 border rounded-xl font-bold bg-white focus:ring-2 focus:ring-bvb-yellow outline-none text-sm" placeholder="单位 (如: 秒, 米, 个)" value={newTestDef.unit} onChange={e => setNewTestDef({...newTestDef, unit: e.target.value})} />
                                    <textarea className="w-full p-3 border rounded-xl font-bold bg-white focus:ring-2 focus:ring-bvb-yellow outline-none text-sm h-32 resize-none" placeholder="测试方法简述..." value={newTestDef.description} onChange={e => setNewTestDef({...newTestDef, description: e.target.value})} />
                                    <button onClick={handleAddTestDef} className="w-full py-4 bg-bvb-black text-bvb-yellow font-black rounded-2xl shadow-lg flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all"><Plus className="w-5 h-5" /> 确认添加项目</button>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-black text-gray-500 uppercase tracking-widest text-[10px] mb-4">已定义项目库 ({techTests.length})</h4>
                                <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                                    {techTests.map(t => (
                                        <div key={t.id} className="p-4 bg-white rounded-2xl border border-gray-100 flex justify-between items-center group">
                                            <div><p className="font-black text-gray-800 text-sm">{t.name}</p><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">单位: {t.unit}</p></div>
                                            <button onClick={() => handleDeleteTestDef(t.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                    {techTests.length === 0 && <p className="text-center py-10 text-gray-400 italic text-sm">暂无自定义项目</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Player Individual Test History */}
            {showTestHistoryPlayerId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-bvb-black p-6 flex justify-between items-center text-white shrink-0">
                            <div className="flex items-center gap-4">
                                <img src={players.find(p => p.id === showTestHistoryPlayerId)?.image} className="w-12 h-12 rounded-full border-2 border-bvb-yellow object-cover" />
                                <div><h3 className="font-black text-lg leading-tight">{players.find(p => p.id === showTestHistoryPlayerId)?.name}</h3><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">测试项目历史趋势</p></div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={handleExportIndividualTechPDF}
                                    disabled={isExportingIndividualTech}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-bvb-yellow"
                                    title="导出个人测评历史"
                                >
                                    {isExportingIndividualTech ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
                                </button>
                                <button onClick={() => setShowTestHistoryPlayerId(null)} className="p-1 hover:bg-white/10 rounded-full transition-colors text-white"><X className="w-6 h-6" /></button>
                            </div>
                        </div>
                        <div className="p-8 space-y-8">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center"><h4 className="font-black text-gray-800 uppercase tracking-widest text-xs flex items-center gap-2"><TrendingUp className="w-4 h-4 text-bvb-yellow" /> 数据曲线趋势</h4><span className="text-[10px] font-black text-gray-400 uppercase">{techTests.find(t => t.id === selectedTestId)?.name}</span></div>
                                <div className="h-48 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={getTestTrendData(players.find(p => p.id === showTestHistoryPlayerId)!, selectedTestId)}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="date" hide />
                                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} reversed={isLowerBetter(techTests.find(t => t.id === selectedTestId)?.unit)} />
                                            <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                            <Line type="monotone" dataKey="value" stroke="#000" strokeWidth={3} dot={{fill: '#FDE100', strokeWidth: 2, r: 4}} activeDot={{r: 6}} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <h4 className="font-black text-gray-800 uppercase tracking-widest text-xs flex items-center gap-2"><History className="w-4 h-4 text-bvb-yellow" /> 详细测试日志</h4>
                                <div className="max-h-60 overflow-y-auto custom-scrollbar pr-1">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 text-gray-400 font-black uppercase text-[10px] sticky top-0"><tr><th className="p-3 border-b">日期</th><th className="p-3 border-b text-right">成绩</th></tr></thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {(players.find(p => p.id === showTestHistoryPlayerId)?.testResults || []).filter(r => r.testId === selectedTestId).sort((a,b) => b.date.localeCompare(a.date)).map(res => (
                                                <tr key={res.id} className="hover:bg-gray-50"><td className="p-3 font-mono text-gray-500 text-xs">{res.date}</td><td className="p-3 text-right font-black text-bvb-black">{res.value} {techTests.find(t => t.id === selectedTestId)?.unit}</td></tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden PDF Template for Technical Test Assessment */}
            <div id="tech-test-report-pdf" className="absolute left-[-9999px] top-0 w-[210mm] bg-white text-black p-0 z-[-1000] font-sans">
                <div className="w-full min-h-[297mm] p-[15mm] flex flex-col relative overflow-hidden bg-white">
                    <div className="flex justify-between items-end border-b-4 border-bvb-yellow pb-6 mb-10">
                        <div className="flex items-center gap-4">
                            {appLogo && <img src={appLogo} alt="Club Logo" className="w-20 h-20 object-contain" />}
                            <div>
                                <h1 className="text-3xl font-black uppercase tracking-tighter text-bvb-black">顽石之光足球俱乐部</h1>
                                <p className="text-sm font-bold text-gray-400 tracking-widest uppercase">青少年精英梯队技术测评报告</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-bold text-gray-500 uppercase">Assessment Report</div>
                            <div className="text-2xl font-black text-bvb-black">{new Date().toLocaleDateString()}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-4">
                            <h3 className="font-black text-gray-800 border-l-4 border-bvb-yellow pl-3 text-lg uppercase">测评基本信息</h3>
                            <div className="grid grid-cols-2 gap-y-3 text-sm">
                                <span className="text-gray-400 font-bold">测评项目:</span>
                                <span className="font-black">{techTests.find(t => t.id === selectedTestId)?.name || '-'}</span>
                                <span className="text-gray-400 font-bold">受测梯队:</span>
                                <span className="font-black">{teams.find(t => t.id === selectedTeamId)?.name || '全部梯队'}</span>
                                <span className="text-gray-400 font-bold">数值单位:</span>
                                <span className="font-black">{techTests.find(t => t.id === selectedTestId)?.unit || '-'}</span>
                            </div>
                        </div>
                        <div className="bg-bvb-black p-6 rounded-2xl text-white flex flex-col justify-center items-center text-center">
                            <p className="text-[10px] font-black text-bvb-yellow uppercase tracking-widest mb-2">梯队平均水平 (Average Level)</p>
                            <h4 className="text-5xl font-black">{techSummary.avg}</h4>
                            <p className="text-xs text-gray-400 mt-2">基于 {techSummary.count} 名有效参测球员数据</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h3 className="font-black text-gray-800 border-l-4 border-bvb-yellow pl-3 text-lg uppercase">球员成绩明细 (Score Details)</h3>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-100 border-b-2 border-gray-200 text-[10px] font-black uppercase text-gray-500 tracking-widest">
                                    <th className="p-4">排名</th>
                                    <th className="p-4">姓名 (Name)</th>
                                    <th className="p-4">号码 (No.)</th>
                                    <th className="p-4 text-right">测评成绩</th>
                                    <th className="p-4 text-center">评价</th>
                                    <th className="p-4 text-center">进步状态</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {displayPlayers
                                    .map(p => ({ ...p, latestResult: getPlayerLatestResult(p, selectedTestId) }))
                                    .filter(p => p.latestResult)
                                    .sort((a, b) => {
                                        const unit = techTests.find(t => t.id === selectedTestId)?.unit;
                                        const valA = a.latestResult?.value || 0;
                                        const valB = b.latestResult?.value || 0;
                                        return isLowerBetter(unit) ? valA - valB : valB - valA;
                                    })
                                    .map((p, idx) => {
                                        const score = p.latestResult?.value || 0;
                                        const avgValue = parseFloat(String(techSummary.avg));
                                        const unit = techTests.find(t => t.id === selectedTestId)?.unit;
                                        const lowerBetter = isLowerBetter(unit);
                                        
                                        const isExcellent = lowerBetter 
                                            ? score <= (avgValue * 0.8) 
                                            : score >= (avgValue * 1.2);
                                        const isStandard = lowerBetter
                                            ? score <= avgValue
                                            : score >= avgValue;

                                        const allResults = (p.testResults || [])
                                            .filter(r => r.testId === selectedTestId)
                                            .sort((a, b) => b.date.localeCompare(a.date));
                                        
                                        const previousScore = allResults[1]?.value;
                                        let trendLabel = null;
                                        if (previousScore !== undefined) {
                                            const isImproved = lowerBetter ? score < previousScore : score > previousScore;
                                            const isRegressed = lowerBetter ? score > previousScore : score < previousScore;
                                            if (isImproved) trendLabel = <span className="text-green-600 font-bold">↑ 进步</span>;
                                            else if (isRegressed) trendLabel = <span className="text-red-500 font-bold">↓ 倒退</span>;
                                            else trendLabel = <span className="text-gray-400">持平</span>;
                                        } else {
                                            trendLabel = <span className="text-gray-300">首测</span>;
                                        }

                                        return (
                                            <tr key={p.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                                                <td className="p-4 font-black text-gray-400">{idx + 1}</td>
                                                <td className="p-4 font-bold text-gray-800">{p.name}</td>
                                                <td className="p-4 font-mono text-gray-500">#{p.number}</td>
                                                <td className="p-4 text-right font-black text-bvb-black">
                                                    {score} {techTests.find(t => t.id === selectedTestId)?.unit}
                                                </td>
                                                <td className="p-4 text-center">
                                                    {isExcellent ? (
                                                        <span className="text-[10px] font-black bg-green-100 text-green-700 px-2 py-0.5 rounded border border-green-200">优秀</span>
                                                    ) : isStandard ? (
                                                        <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">达标</span>
                                                    ) : (
                                                        <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-2 py-0.5 rounded">待提高</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-center text-xs">
                                                    {trendLabel}
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-auto pt-10 border-t border-gray-200 flex justify-between items-end">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">教练组签章 / Coaching Signature</p>
                            <div className="h-16 w-48 border-b border-dashed border-gray-300"></div>
                        </div>
                        <div className="text-right text-[10px] text-gray-300 font-mono">
                            WSZG-TECH-REPORT-{selectedTestId.substring(0,8).toUpperCase()}<br />
                            GENERATED BY WSZG ACADEMY SYSTEM
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden PDF Template for Individual Technical Test Record */}
            <div id="individual-tech-test-pdf" className="absolute left-[-9999px] top-0 w-[210mm] bg-white text-black p-0 z-[-1000] font-sans">
                {showTestHistoryPlayerId && selectedTestId && (
                    <div className="w-full min-h-[297mm] p-[15mm] flex flex-col relative overflow-hidden bg-white">
                        <div className="flex justify-between items-end border-b-4 border-bvb-yellow pb-6 mb-10">
                            <div className="flex items-center gap-4">
                                {appLogo && <img src={appLogo} alt="Club Logo" className="w-20 h-20 object-contain" />}
                                <div>
                                    <h1 className="text-3xl font-black uppercase tracking-tighter text-bvb-black">顽石之光足球俱乐部</h1>
                                    <p className="text-sm font-bold text-gray-400 tracking-widest uppercase">球员专项技术测评历史档案</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-bold text-gray-500 uppercase">Personal Archive</div>
                                <div className="text-2xl font-black text-bvb-black">{new Date().toLocaleDateString()}</div>
                            </div>
                        </div>

                        <div className="flex gap-8 bg-gray-50 rounded-3xl p-8 border border-gray-100 mb-10 relative overflow-hidden">
                            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-bvb-yellow shadow-lg bg-white shrink-0">
                                <img src={players.find(p => p.id === showTestHistoryPlayerId)?.image} crossOrigin="anonymous" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <h2 className="text-3xl font-black text-gray-900">{players.find(p => p.id === showTestHistoryPlayerId)?.name}</h2>
                                <p className="text-gray-500 font-bold uppercase tracking-widest mt-1">
                                    #{players.find(p => p.id === showTestHistoryPlayerId)?.number} • {teams.find(t => t.id === players.find(p => p.id === showTestHistoryPlayerId)?.teamId)?.name}
                                </p>
                                <div className="flex gap-4 mt-4">
                                    <div className="bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm text-center">
                                        <p className="text-[9px] font-black text-gray-400 uppercase">测评项目</p>
                                        <p className="text-lg font-black text-bvb-black">{techTests.find(t => t.id === selectedTestId)?.name}</p>
                                    </div>
                                    <div className="bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm text-center">
                                        <p className="text-[9px] font-black text-gray-400 uppercase">历史最佳</p>
                                        <p className="text-lg font-black text-green-600">
                                            {(() => {
                                                const all = (players.find(p => p.id === showTestHistoryPlayerId)?.testResults || []).filter(r => r.testId === selectedTestId).map(r => r.value);
                                                const unit = techTests.find(t => t.id === selectedTestId)?.unit;
                                                return all.length ? (isLowerBetter(unit) ? Math.min(...all) : Math.max(...all)) : '-';
                                            })()} {techTests.find(t => t.id === selectedTestId)?.unit}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h3 className="font-black text-gray-800 border-l-4 border-bvb-yellow pl-3 text-lg uppercase">历史测评数据日志 (Historical Logs)</h3>
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-100 border-b-2 border-gray-200 text-[10px] font-black uppercase text-gray-500 tracking-widest">
                                        <th className="p-4">测评序号 (Index)</th>
                                        <th className="p-4">测评日期 (Date)</th>
                                        <th className="p-4 text-right">测评成绩 (Result)</th>
                                        <th className="p-4 text-center">进步状态</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {(players.find(p => p.id === showTestHistoryPlayerId)?.testResults || [])
                                        .filter(r => r.testId === selectedTestId)
                                        .sort((a,b) => b.date.localeCompare(a.date))
                                        .map((res, idx, arr) => {
                                            const isBest = isLowerBetter(techTests.find(t => t.id === selectedTestId)?.unit)
                                                ? res.value === Math.min(...arr.map(r => r.value))
                                                : res.value === Math.max(...arr.map(r => r.value));
                                            
                                            let trendIcon = null;
                                            if (idx < arr.length - 1) {
                                                const nextRes = arr[idx + 1];
                                                const isImproved = isLowerBetter(techTests.find(t => t.id === selectedTestId)?.unit)
                                                    ? res.value < nextRes.value
                                                    : res.value > nextRes.value;
                                                trendIcon = isImproved ? <span className="text-green-500 text-xs">↑ 进步</span> : <span className="text-red-500 text-xs">↓ 倒退</span>;
                                            }

                                            return (
                                                <tr key={res.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                                                    <td className="p-4 font-black text-gray-400">{arr.length - idx}</td>
                                                    <td className="p-4 font-mono font-bold text-gray-600">{res.date}</td>
                                                    <td className="p-4 text-right font-black text-bvb-black">
                                                        <div className="flex flex-col items-end">
                                                            <span>{res.value} {techTests.find(t => t.id === selectedTestId)?.unit}</span>
                                                            {isBest && <span className="text-[8px] bg-yellow-100 text-yellow-700 px-1 rounded border border-yellow-200 uppercase font-black tracking-tighter">Personal Best</span>}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-center font-bold">
                                                        {trendIcon || <span className="text-gray-300 text-[10px]">首测数据</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-auto pt-10 border-t border-gray-200 flex justify-between items-end">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">技术部审核 / Technical Dept.</p>
                                <div className="h-16 w-48 border-b border-dashed border-gray-300"></div>
                            </div>
                            <div className="text-right text-[10px] text-gray-300 font-mono">
                                PLAYER-TECH-{showTestHistoryPlayerId.substring(0,8).toUpperCase()}<br />
                                SYSTEM GENERATED ARCHIVE
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Hidden PDF Template: Home Training Team Report */}
            <div id="home-training-team-pdf" className="absolute left-[-9999px] top-0 w-[210mm] bg-white text-black p-0 z-[-1000] font-sans">
                <div className="w-full min-h-[297mm] p-[15mm] flex flex-col bg-white">
                    <div className="flex justify-between items-end border-b-4 border-bvb-yellow pb-6 mb-10">
                        <div className="flex items-center gap-4">
                            {appLogo && <img src={appLogo} alt="Club Logo" className="w-20 h-20 object-contain" />}
                            <div>
                                <h1 className="text-3xl font-black uppercase tracking-tighter text-bvb-black">顽石之光足球俱乐部</h1>
                                <p className="text-sm font-bold text-gray-400 tracking-widest uppercase">居家训练完成情况汇总表</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-bold text-gray-500 uppercase">Training Report</div>
                            <div className="text-2xl font-black text-bvb-black">{viewYear}年{viewMonth + 1}月</div>
                        </div>
                    </div>

                    <div className="mb-10">
                        <h3 className="font-black text-gray-800 border-l-4 border-bvb-yellow pl-3 text-lg uppercase mb-6">梯队成员训练统计 (Team Statistics)</h3>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-100 border-b-2 border-gray-200 text-[10px] font-black uppercase text-gray-500 tracking-widest">
                                    <th className="p-4">排名</th>
                                    <th className="p-4">球员姓名</th>
                                    <th className="p-4 text-center">本月打卡 (次)</th>
                                    <th className="p-4 text-center">年度总计 (次)</th>
                                    <th className="p-4 text-center">状态评估</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {displayPlayers
                                    .map(p => ({ ...p, stats: getHomeStats(p) }))
                                    .sort((a, b) => b.stats.monthCount - a.stats.monthCount)
                                    .map((p, idx) => (
                                        <tr key={p.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                                            <td className="p-4 font-black text-gray-400">{idx + 1}</td>
                                            <td className="p-4 font-bold text-gray-800">{p.name}</td>
                                            <td className="p-4 text-center font-black text-lg">{p.stats.monthCount}</td>
                                            <td className="p-4 text-center font-bold text-gray-400">{p.stats.yearCount}</td>
                                            <td className="p-4 text-center">
                                                {p.stats.monthCount >= 15 ? (
                                                    <span className="text-[10px] font-black bg-green-100 text-green-700 px-2 py-0.5 rounded border border-green-200 uppercase">勤奋标兵</span>
                                                ) : p.stats.monthCount > 0 ? (
                                                    <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 uppercase">表现良好</span>
                                                ) : <span className="text-gray-300 text-[10px] font-black uppercase">尚未开启</span>}
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-auto pt-10 border-t border-gray-200 flex justify-between items-end">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">审核签章 / Verifying Signature</p>
                            <div className="h-16 w-48 border-b border-dashed border-gray-300"></div>
                        </div>
                        <div className="text-right text-[10px] text-gray-300 font-mono italic">
                            WSZG-HOME-TEAM-{selectedTeamId.substring(0,6).toUpperCase()}<br />
                            SYSTEM GENERATED AT {new Date().toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden PDF Template: Home Training Individual Report */}
            <div id="home-training-individual-pdf" className="absolute left-[-9999px] top-0 w-[210mm] bg-white text-black p-0 z-[-1000] font-sans">
                {detailPlayerId && (
                    <div className="w-full min-h-[297mm] p-[15mm] flex flex-col bg-white">
                        <div className="flex justify-between items-end border-b-4 border-bvb-yellow pb-6 mb-10">
                            <div className="flex items-center gap-4">
                                {appLogo && <img src={appLogo} alt="Club Logo" className="w-20 h-20 object-contain" />}
                                <div>
                                    <h1 className="text-3xl font-black uppercase tracking-tighter text-bvb-black">顽石之光足球俱乐部</h1>
                                    <p className="text-sm font-bold text-gray-400 tracking-widest uppercase">球员居家训练个人成长档案</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-bold text-gray-500 uppercase">Individual Growth</div>
                                <div className="text-2xl font-black text-bvb-black">{viewYear}年度</div>
                            </div>
                        </div>

                        <div className="flex gap-8 bg-gray-50 rounded-3xl p-8 border border-gray-100 mb-10 relative overflow-hidden">
                            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-bvb-yellow shadow-lg bg-white shrink-0">
                                <img src={players.find(p => p.id === detailPlayerId)?.image} crossOrigin="anonymous" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <h2 className="text-3xl font-black text-gray-900">{players.find(p => p.id === detailPlayerId)?.name}</h2>
                                <p className="text-gray-500 font-bold uppercase tracking-widest mt-1">
                                    #{players.find(p => p.id === detailPlayerId)?.number} • {teams.find(t => t.id === players.find(p => p.id === detailPlayerId)?.teamId)?.name}
                                </p>
                                <div className="flex gap-4 mt-4">
                                    <div className="bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm text-center">
                                        <p className="text-[9px] font-black text-gray-400 uppercase">年度累计打卡</p>
                                        <p className="text-xl font-black text-bvb-black">{players.find(p => p.id === detailPlayerId)?.homeTrainingLogs?.filter(l => l.date.startsWith(String(viewYear))).length || 0} 次</p>
                                    </div>
                                    <div className="bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm text-center">
                                        <p className="text-[9px] font-black text-gray-400 uppercase">本月完成</p>
                                        <p className="text-xl font-black text-green-600">{getHomeStats(players.find(p => p.id === detailPlayerId)!).monthCount} 次</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1">
                            <h3 className="font-black text-gray-800 border-l-4 border-bvb-yellow pl-3 text-lg uppercase mb-6">训练记录明细 (Training Logs)</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {players.find(p => p.id === detailPlayerId)?.homeTrainingLogs
                                    ?.filter(l => l.date.startsWith(String(viewYear)))
                                    .sort((a,b) => b.date.localeCompare(a.date))
                                    .map(log => (
                                        <div key={log.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center">
                                            <div>
                                                <p className="font-black text-gray-800 text-sm">{log.title}</p>
                                                <p className="text-[10px] text-gray-400 font-mono">{log.date}</p>
                                            </div>
                                            <span className="text-[9px] font-black text-green-600 uppercase border border-green-200 px-2 py-0.5 rounded-full bg-green-50">Verified</span>
                                        </div>
                                    ))}
                            </div>
                            {(!players.find(p => p.id === detailPlayerId)?.homeTrainingLogs || players.find(p => p.id === detailPlayerId)?.homeTrainingLogs?.length === 0) && (
                                <p className="text-center py-20 text-gray-400 italic">本年度暂无打卡记录</p>
                            )}
                        </div>

                        <div className="mt-10 pt-10 border-t border-gray-200 flex justify-between items-end">
                            <div className="text-[10px] text-gray-400 leading-relaxed italic max-w-sm">
                                * 此报告基于家长通过“顽石之光青训系统”提交的居家自主训练打卡数据生成，仅供教练组参考评价球员训练积极性使用。
                            </div>
                            <div className="text-right text-[10px] text-gray-300 font-mono">
                                PLAYER-LOG-{detailPlayerId.substring(0,8).toUpperCase()}<br />
                                GENERATED ON {new Date().toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 打卡详情模态框：受权限控制 */}
            {detailPlayerId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-bvb-black p-6 flex justify-between items-center text-white shrink-0">
                            <div>
                                <h3 className="font-bold text-xl flex items-center tracking-tighter uppercase">打卡记录详情</h3>
                                <p className="text-xs text-gray-400 mt-1">{players.find(p => p.id === detailPlayerId)?.name}</p>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleExportHomeIndividualPDF(detailPlayerId)}
                                    disabled={isExportingHome}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-bvb-yellow"
                                    title="导出个人年度报告"
                                >
                                    {isExportingHome ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
                                </button>
                                <button onClick={() => setDetailPlayerId(null)} className="p-1 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                            </div>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-3">
                            {players.find(p => p.id === detailPlayerId)?.homeTrainingLogs
                                ?.filter(l => l.date.startsWith(String(viewYear)))
                                ?.sort((a, b) => b.date.localeCompare(a.date)).map(log => (
                                <div key={log.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl border border-gray-100"><div><p className="font-black text-gray-800 text-sm">{log.title}</p><p className="text-[10px] text-gray-400 font-mono">{log.date}</p></div><div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">计次 +1</div></div>
                            )) || <p className="text-center py-10 text-gray-400 italic text-sm">暂无记录</p>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TechnicalGrowth;
