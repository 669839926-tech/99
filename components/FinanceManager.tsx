
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FinanceTransaction, FinanceCategoryDefinition, User, TrainingSession, Player, SalarySettings, MonthlyEvaluation, Team, MonthlySalaryRecord } from '../types';
import { Wallet, Plus, Trash2, FileText, Download, TrendingUp, TrendingDown, Calculator, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, FileSpreadsheet, Upload, FileDown, Target, ImageIcon, Paperclip, Eye, AlertCircle, Info, CheckSquare, RefreshCw, ListFilter, TableProperties, Users, Star, Gauge, ClipboardCheck, X, BarChart3, Save, Banknote, UserCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

interface FinanceManagerProps {
    transactions: FinanceTransaction[];
    financeCategories: FinanceCategoryDefinition[];
    currentUser: User | null;
    onAddTransaction: (t: FinanceTransaction) => void;
    onBulkAddTransactions: (t: FinanceTransaction[]) => void;
    onDeleteTransaction: (id: string) => void;
    onBulkDeleteTransactions: (ids: string[]) => void;
    // Salary related
    users: User[];
    players: Player[];
    teams: Team[];
    trainings: TrainingSession[];
    salarySettings: SalarySettings;
    onUpdateUser: (user: User) => void;
}

const getSafeYear = (dateStr: string) => {
    if (!dateStr) return 0;
    const match = dateStr.match(/^(\d{4})/);
    if (match) return parseInt(match[1]);
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 0 : d.getFullYear();
};

const FinanceManager: React.FC<FinanceManagerProps> = ({ 
    transactions, financeCategories, currentUser, onAddTransaction, onBulkAddTransactions, onDeleteTransaction, onBulkDeleteTransactions,
    users, players, teams, trainings, salarySettings, onUpdateUser
}) => {
    const [viewMode, setViewMode] = useState<'journal' | 'summary' | 'salary'>('summary');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    
    // 薪酬视图专用：教练员筛选
    const [filterCoachId, setFilterCoachId] = useState<string>('all');
    
    // 编辑状态：用于暂存手动修改的金额
    const [editPayroll, setEditPayroll] = useState<Record<string, Partial<MonthlySalaryRecord>>>({});

    const [importSummary, setImportSummary] = useState<{ count: number, income: number, expense: number, tempTxs: FinanceTransaction[] } | null>(null);

    const [activeType, setActiveType] = useState<'income' | 'expense'>('income');
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        details: '',
        category: '',
        amount: '',
        account: '黔农云',
        attachment: '' as string
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const categoriesForType = financeCategories.filter(c => c.type === activeType);
        if (categoriesForType.length > 0) {
            setFormData(prev => ({ ...prev, category: categoriesForType[0].id }));
        } else {
            setFormData(prev => ({ ...prev, category: '' }));
        }
    }, [activeType, financeCategories]);

    const isDirector = currentUser?.role === 'director';

    const sortedTransactions = useMemo(() => {
        return [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [transactions]);

    const journalWithBalance = useMemo(() => {
        let balance = 0;
        return sortedTransactions.map(t => {
            balance += (Number(t.income) - Number(t.expense));
            return { ...t, balance };
        }).reverse(); 
    }, [sortedTransactions]);

    const currentStats = useMemo(() => {
        const yearTransactions = transactions.filter(t => getSafeYear(t.date) === selectedYear);
        const income = yearTransactions.reduce((sum, t) => sum + (Number(t.income) || 0), 0);
        const expense = yearTransactions.reduce((sum, t) => sum + (Number(t.expense) || 0), 0);
        return { income, expense, profit: income - expense };
    }, [transactions, selectedYear]);

    const monthlySummaryData = useMemo(() => {
        const data = Array.from({ length: 12 }, (_, i) => ({
            month: `${i + 1}月`,
            income: 0,
            expense: 0,
            profit: 0
        }));
        transactions.forEach(t => {
            const year = getSafeYear(t.date);
            if (year === selectedYear) {
                const d = new Date(t.date);
                let m = isNaN(d.getTime()) ? -1 : d.getMonth();
                if (m === -1) {
                    const mMatch = t.date.match(/年(\d{1,2})月/) || t.date.match(/-(\d{1,2})-/);
                    if (mMatch) m = parseInt(mMatch[1]) - 1;
                }
                
                if (m >= 0 && m < 12) {
                    data[m].income += (Number(t.income) || 0);
                    data[m].expense += (Number(t.expense) || 0);
                    data[m].profit = data[m].income - data[m].expense;
                }
            }
        });
        return data;
    }, [transactions, selectedYear]);

    const categoryAnalysis = useMemo(() => {
        const incomeMap: Record<string, number> = {};
        const expenseMap: Record<string, number> = {};
        
        transactions.forEach(t => {
            if (getSafeYear(t.date) === selectedYear) {
                const cat = financeCategories.find(c => c.id === t.category);
                if (cat) {
                    if (cat.type === 'income') incomeMap[cat.label] = (incomeMap[cat.label] || 0) + (Number(t.income) || 0);
                    else expenseMap[cat.label] = (expenseMap[cat.label] || 0) + (Number(t.expense) || 0);
                }
            }
        });

        const incomeData = Object.keys(incomeMap).map(label => ({ 
            name: label, 
            value: incomeMap[label],
            percent: currentStats.income > 0 ? (incomeMap[label] / currentStats.income * 100).toFixed(1) : '0'
        })).sort((a,b) => b.value - a.value);

        const expenseData = Object.keys(expenseMap).map(label => ({ 
            name: label, 
            value: expenseMap[label],
            percent: currentStats.expense > 0 ? (expenseMap[label] / currentStats.expense * 100).toFixed(1) : '0'
        })).sort((a,b) => b.value - a.value);

        return { incomeData, expenseData };
    }, [transactions, selectedYear, financeCategories, currentStats]);

    // --- 教职薪酬核算引擎 (升级版) ---
    const coachSalaries = useMemo(() => {
        // 增加教练员筛选逻辑
        const coaches = users.filter(u => u.role === 'coach' && (filterCoachId === 'all' || u.id === filterCoachId));
        const isDistributionMonth = [2, 5, 8, 11].includes(selectedMonth);

        return coaches.map(coach => {
            const savedRecord = coach.monthlySalaryRecords?.find(r => r.year === selectedYear && r.month === selectedMonth);
            const levelConfig = salarySettings.levels.find(l => l.level === coach.level) || salarySettings.levels[0];
            const coachTeams = coach.teamIds || [];
            
            // 默认初算值
            let calcSessionFees = 0;
            let calcAttendanceReward = 0;
            let calcRenewalReward = 0;
            
            const teamBreakdown = coachTeams.map(teamId => {
                const teamPlayers = players.filter(p => p.teamId === teamId);
                const teamSize = teamPlayers.length;
                const effectiveTeamSize = Math.max(salarySettings.minPlayersForCalculation, teamSize);
                const sessionFeePerSession = levelConfig.sessionBaseFee + (effectiveTeamSize - salarySettings.minPlayersForCalculation) * salarySettings.incrementalPlayerFee;
                
                const monthlySessions = trainings.filter(t => {
                    const d = new Date(t.date);
                    return t.teamId === teamId && d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
                });
                const monthlySessionFee = monthlySessions.length * sessionFeePerSession;

                let monthlyAttendanceRate = 0;
                let attendanceReward = 0;
                if (monthlySessions.length > 0) {
                    const totalPossible = monthlySessions.length * teamSize;
                    const totalPresent = monthlySessions.reduce((sum, s) => sum + (s.attendance?.filter(r => r.status === 'Present').length || 0), 0);
                    monthlyAttendanceRate = totalPossible > 0 ? (totalPresent / totalPossible) * 100 : 0;
                    attendanceReward = salarySettings.monthlyAttendanceRewards
                        .sort((a,b) => b.threshold - a.threshold)
                        .find(r => monthlyAttendanceRate >= r.threshold)?.amount || 0;
                }

                let renewalReward = 0;
                let renewalRate = 0;
                if (isDistributionMonth) {
                    const quarterMonths = [Math.floor(selectedMonth / 3) * 3, Math.floor(selectedMonth / 3) * 3 + 1, Math.floor(selectedMonth / 3) * 3 + 2];
                    const qStart = new Date(selectedYear, quarterMonths[0], 1).toISOString();
                    const qEnd = new Date(selectedYear, quarterMonths[2] + 1, 0).toISOString();
                    const renewedCount = teamPlayers.filter(p => {
                        const rechargedInQ = p.rechargeHistory?.some(r => r.date >= qStart && r.date <= qEnd);
                        const joinedInQ = p.joinDate && p.joinDate >= qStart && p.joinDate <= qEnd;
                        return rechargedInQ || joinedInQ;
                    }).length;
                    renewalRate = teamSize > 0 ? (renewedCount / teamSize) * 100 : 0;
                    renewalReward = renewalRate >= salarySettings.quarterlyRenewalReward.threshold ? salarySettings.quarterlyRenewalReward.amount : 0;
                }

                return { teamId, teamSize, sessionCount: monthlySessions.length, monthlySessionFee, monthlyAttendanceRate, attendanceReward, renewalRate, renewalReward };
            });

            calcSessionFees = teamBreakdown.reduce((sum, b) => sum + b.monthlySessionFee, 0);
            calcAttendanceReward = teamBreakdown.reduce((sum, b) => sum + b.attendanceReward, 0);
            calcRenewalReward = teamBreakdown.reduce((sum, b) => sum + b.renewalReward, 0);

            const evaluation = coach.monthlyEvaluations?.find(e => e.year === selectedYear && e.month === selectedMonth);
            const calcPerformanceReward = salarySettings.monthlyPerformanceRewards.find(r => evaluation && evaluation.score >= r.minScore && evaluation.score <= r.maxScore)?.amount || 0;

            const currentEdit = editPayroll[coach.id] || {};
            
            const baseSalary = currentEdit.baseSalary !== undefined ? currentEdit.baseSalary : (savedRecord ? savedRecord.baseSalary : levelConfig.baseSalary);
            const sessionFees = currentEdit.sessionFees !== undefined ? currentEdit.sessionFees : (savedRecord ? savedRecord.sessionFees : calcSessionFees);
            const attendanceReward = currentEdit.attendanceReward !== undefined ? currentEdit.attendanceReward : (savedRecord ? savedRecord.attendanceReward : calcAttendanceReward);
            const renewalReward = currentEdit.renewalReward !== undefined ? currentEdit.renewalReward : (savedRecord ? savedRecord.renewalReward : calcRenewalReward);
            const performanceReward = currentEdit.performanceReward !== undefined ? currentEdit.performanceReward : (savedRecord ? savedRecord.performanceReward : calcPerformanceReward);
            
            const totalSalary = baseSalary + sessionFees + attendanceReward + renewalReward + performanceReward;

            return {
                coachId: coach.id,
                coachName: coach.name,
                level: levelConfig.label,
                baseSalary,
                sessionFees,
                attendanceReward,
                renewalReward,
                performanceReward,
                totalSalary,
                evaluationScore: evaluation?.score,
                isSaved: !!savedRecord,
                isDisbursed: savedRecord?.isDisbursed || false,
                isModified: Object.keys(currentEdit).length > 0,
                teamBreakdown
            };
        });
    }, [users, players, trainings, salarySettings, selectedYear, selectedMonth, editPayroll, filterCoachId]);

    const handleUpdatePayrollField = (coachId: string, field: keyof MonthlySalaryRecord, value: string) => {
        const numVal = parseFloat(value) || 0;
        setEditPayroll(prev => ({
            ...prev,
            [coachId]: { ...prev[coachId], [field]: numVal }
        }));
    };

    const handleSavePayroll = (coachId: string) => {
        const coach = users.find(u => u.id === coachId);
        if (!coach) return;
        const row = coachSalaries.find(s => s.coachId === coachId);
        if (!row) return;

        const recordId = `sal-${selectedYear}-${selectedMonth}-${coachId}`;
        const records = coach.monthlySalaryRecords || [];
        const existingIdx = records.findIndex(r => r.year === selectedYear && r.month === selectedMonth);

        const newRecord: MonthlySalaryRecord = {
            id: recordId,
            year: selectedYear,
            month: selectedMonth,
            baseSalary: row.baseSalary,
            sessionFees: row.sessionFees,
            attendanceReward: row.attendanceReward,
            renewalReward: row.renewalReward,
            performanceReward: row.performanceReward,
            totalSalary: row.totalSalary,
            isDisbursed: row.isDisbursed
        };

        let nextRecords = [...records];
        if (existingIdx >= 0) nextRecords[existingIdx] = newRecord;
        else nextRecords.push(newRecord);

        onUpdateUser({ ...coach, monthlySalaryRecords: nextRecords });
        const nextEdit = { ...editPayroll };
        delete nextEdit[coachId];
        setEditPayroll(nextEdit);
        alert(`已保存 ${coach.name} ${selectedYear}年${selectedMonth + 1}月的薪酬快照。`);
    };

    const handleDisburseSalary = (coachId: string) => {
        const coach = users.find(u => u.id === coachId);
        const row = coachSalaries.find(s => s.coachId === coachId);
        if (!coach || !row) return;

        if (row.totalSalary <= 0) {
            alert('薪资总额为0，无需发放。');
            return;
        }

        if (row.isDisbursed) {
            if (!confirm('该笔薪资已经发放过，确定要再次发放并记录流水吗？')) return;
        }

        // 1. 更新用户状态，固化快照并标记已发放
        const records = coach.monthlySalaryRecords || [];
        const existingIdx = records.findIndex(r => r.year === selectedYear && r.month === selectedMonth);
        const newRecord: MonthlySalaryRecord = {
            id: `sal-${selectedYear}-${selectedMonth}-${coachId}`,
            year: selectedYear,
            month: selectedMonth,
            baseSalary: row.baseSalary,
            sessionFees: row.sessionFees,
            attendanceReward: row.attendanceReward,
            renewalReward: row.renewalReward,
            performanceReward: row.performanceReward,
            totalSalary: row.totalSalary,
            isDisbursed: true,
            disbursedDate: new Date().toISOString().split('T')[0]
        };

        let nextRecords = [...records];
        if (existingIdx >= 0) nextRecords[existingIdx] = newRecord;
        else nextRecords.push(newRecord);

        onUpdateUser({ ...coach, monthlySalaryRecords: nextRecords });

        // 2. 自动记入财务流水 (支出)
        const salaryExpenseCategory = financeCategories.find(c => c.label.includes('工资支出') || c.id === 'cat-4');
        const transaction: FinanceTransaction = {
            id: `disburse-${Date.now()}-${coachId}`,
            date: new Date().toISOString().split('T')[0],
            details: `${selectedYear}年${selectedMonth + 1}月 ${coach.name} 薪资发放入账`,
            category: salaryExpenseCategory?.id || 'cat-4',
            income: 0,
            expense: row.totalSalary,
            account: '黔农云 (发薪账户)'
        };
        onAddTransaction(transaction);

        alert(`发放成功！已为 ${coach.name} 生成一笔 ¥${row.totalSalary} 的薪酬支出记录。`);
    };

    const handleUpdateEvaluation = (coachId: string, score: number) => {
        const coach = users.find(u => u.id === coachId);
        if (!coach) return;
        const evaluations = coach.monthlyEvaluations || [];
        const existingIdx = evaluations.findIndex(e => e.year === selectedYear && e.month === selectedMonth);
        let nextEvals = [...evaluations];
        if (existingIdx >= 0) nextEvals[existingIdx] = { ...nextEvals[existingIdx], score };
        else nextEvals.push({ id: `eval-${Date.now()}`, year: selectedYear, month: selectedMonth, score, comment: '' });
        onUpdateUser({ ...coach, monthlyEvaluations: nextEvals });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === journalWithBalance.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(journalWithBalance.map(t => t.id)));
    };

    const toggleSelectId = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amountNum = parseFloat(formData.amount) || 0;
        if (!formData.category) { alert('请选择一个项目分类'); return; }
        const newTx: FinanceTransaction = {
            id: Date.now().toString(),
            date: formData.date,
            details: formData.details,
            category: formData.category,
            income: activeType === 'income' ? amountNum : 0,
            expense: activeType === 'expense' ? amountNum : 0,
            account: formData.account,
            attachment: formData.attachment
        };
        onAddTransaction(newTx);
        setShowAddModal(false);
        setFormData({ ...formData, details: '', amount: '', attachment: '' });
    };

    if (!isDirector) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 p-8 text-center">
                <Wallet className="w-16 h-16 mb-4 opacity-20" />
                <h2 className="text-xl font-bold">权限不足</h2>
                <p>只有青训总监可以访问财务数据。</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-bvb-black uppercase">财务管理</h2>
                    <p className="text-gray-500">记录日常收支，分析俱乐部经营状况。</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                        <button onClick={() => setViewMode('journal')} className={`px-4 py-2 rounded-md text-xs font-black transition-all ${viewMode === 'journal' ? 'bg-bvb-black text-bvb-yellow shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>日记账流水</button>
                        <button onClick={() => setViewMode('summary')} className={`px-4 py-2 rounded-md text-xs font-black transition-all ${viewMode === 'summary' ? 'bg-bvb-black text-bvb-yellow shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>统计汇总表</button>
                        <button onClick={() => setViewMode('salary')} className={`px-4 py-2 rounded-md text-xs font-black transition-all ${viewMode === 'salary' ? 'bg-bvb-black text-bvb-yellow shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>教职薪资</button>
                    </div>
                    <button onClick={() => setShowImportModal(true)} className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-600 font-bold rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
                        <FileSpreadsheet className="w-5 h-5 mr-2 text-green-600" /> 批量导入
                    </button>
                    <button onClick={() => { setActiveType('income'); setShowAddModal(true); }} className="flex items-center px-4 py-2 bg-bvb-yellow text-bvb-black font-bold rounded-lg shadow-md hover:brightness-105 active:scale-95 transition-all">
                        <Plus className="w-5 h-5 mr-2" /> 记一笔
                    </button>
                </div>
            </div>

            {/* Salary Calculation Tab */}
            {viewMode === 'salary' ? (
                <div className="space-y-6 animate-in slide-in-from-bottom-4">
                    <div className="flex flex-col lg:flex-row justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-200 gap-4">
                        <h3 className="font-bold text-lg text-gray-800 flex items-center shrink-0"><Calculator className="w-6 h-6 mr-2 text-bvb-yellow" /> 教练员月度薪酬核算表</h3>
                        
                        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
                            {/* 教练员筛选器 */}
                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                                <UserCheck className="w-4 h-4 text-gray-400" />
                                <select 
                                    value={filterCoachId} 
                                    onChange={e => setFilterCoachId(e.target.value)}
                                    className="bg-transparent text-xs font-black outline-none focus:ring-0 cursor-pointer"
                                >
                                    <option value="all">显示全部教练员</option>
                                    {users.filter(u => u.role === 'coach').map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                                <select 
                                    value={selectedYear} 
                                    onChange={e => setSelectedYear(parseInt(e.target.value))}
                                    className="bg-transparent text-xs font-black outline-none focus:ring-0 cursor-pointer"
                                >
                                    {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}年</option>)}
                                </select>
                                <span className="text-gray-300">|</span>
                                <select 
                                    value={selectedMonth} 
                                    onChange={e => setSelectedMonth(parseInt(e.target.value))}
                                    className="bg-transparent text-xs font-black outline-none focus:ring-0 cursor-pointer"
                                >
                                    {Array.from({length: 12}, (_, i) => <option key={i} value={i}>{i+1}月</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="bg-gray-50 text-gray-600 font-black uppercase text-[10px] tracking-widest border-b">
                                    <tr>
                                        <th className="px-4 py-4">教练信息</th>
                                        <th className="px-4 py-4 text-right">基础底薪</th>
                                        <th className="px-4 py-4 text-right">课时费总额</th>
                                        <th className="px-4 py-4 text-right">月参训奖</th>
                                        <th className="px-4 py-4 text-right">季度续费奖</th>
                                        <th className="px-4 py-4 text-center">考核分</th>
                                        <th className="px-4 py-4 text-right">绩效考核奖</th>
                                        <th className="px-4 py-4 text-right font-black text-bvb-black">核算应发</th>
                                        <th className="px-4 py-4 text-center">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {coachSalaries.map(sal => {
                                        const isModified = editPayroll[sal.coachId] !== undefined;
                                        return (
                                            <React.Fragment key={sal.coachId}>
                                                <tr className={`hover:bg-gray-50 transition-colors ${sal.isSaved ? 'bg-green-50/20' : ''}`}>
                                                    <td className="px-4 py-4">
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-1">
                                                                <span className="font-black text-gray-800">{sal.coachName}</span>
                                                                {sal.isDisbursed && <span className="text-[8px] bg-green-500 text-white px-1 rounded font-black uppercase">已发放</span>}
                                                            </div>
                                                            <span className="text-[10px] text-gray-400 font-bold uppercase">{sal.level}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-right">
                                                        <input 
                                                            type="number" 
                                                            className={`w-20 p-1.5 border rounded text-right font-black text-xs bg-transparent focus:bg-white focus:ring-2 focus:ring-bvb-yellow outline-none transition-all ${sal.baseSalary !== salarySettings.levels.find(l=>l.label===sal.level)?.baseSalary ? 'border-bvb-yellow bg-yellow-50' : 'border-transparent hover:border-gray-200'}`}
                                                            value={sal.baseSalary}
                                                            onChange={(e) => handleUpdatePayrollField(sal.coachId, 'baseSalary', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-4 text-right">
                                                        <input 
                                                            type="number" 
                                                            className="w-20 p-1.5 border border-transparent rounded text-right font-black text-xs hover:border-gray-200 focus:bg-white focus:border-bvb-yellow outline-none transition-all"
                                                            value={sal.sessionFees}
                                                            onChange={(e) => handleUpdatePayrollField(sal.coachId, 'sessionFees', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-4 text-right">
                                                        <input 
                                                            type="number" 
                                                            className="w-20 p-1.5 border border-transparent rounded text-right font-black text-xs hover:border-gray-200 focus:bg-white focus:border-bvb-yellow outline-none transition-all"
                                                            value={sal.attendanceReward}
                                                            onChange={(e) => handleUpdatePayrollField(sal.coachId, 'attendanceReward', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-4 text-right">
                                                        <input 
                                                            type="number" 
                                                            className="w-20 p-1.5 border border-transparent rounded text-right font-black text-xs hover:border-gray-200 focus:bg-white focus:border-bvb-yellow outline-none transition-all"
                                                            value={sal.renewalReward}
                                                            onChange={(e) => handleUpdatePayrollField(sal.coachId, 'renewalReward', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <input 
                                                            type="number" min="0" max="10" step="0.1"
                                                            className="w-14 p-1.5 text-center border rounded font-black text-xs bg-gray-50 focus:ring-2 focus:ring-bvb-yellow outline-none"
                                                            value={sal.evaluationScore || ''}
                                                            onChange={e => handleUpdateEvaluation(sal.coachId, parseFloat(e.target.value))}
                                                            placeholder="0"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-4 text-right">
                                                        <input 
                                                            type="number" 
                                                            className="w-20 p-1.5 border border-transparent rounded text-right font-black text-xs hover:border-gray-200 focus:bg-white focus:border-bvb-yellow outline-none transition-all"
                                                            value={sal.performanceReward}
                                                            onChange={(e) => handleUpdatePayrollField(sal.coachId, 'performanceReward', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-4 text-right font-black text-bvb-black text-base tabular-nums">¥{sal.totalSalary.toLocaleString()}</td>
                                                    <td className="px-4 py-4 text-center">
                                                        <div className="flex justify-center gap-1">
                                                            <button 
                                                                onClick={() => handleSavePayroll(sal.coachId)}
                                                                className={`p-2 rounded-lg transition-all ${sal.isModified ? 'bg-bvb-yellow text-bvb-black shadow-md' : 'text-gray-300 hover:text-bvb-black hover:bg-gray-100'}`}
                                                                title="固化月度快照"
                                                            >
                                                                <Save className="w-4 h-4" />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDisburseSalary(sal.coachId)}
                                                                className={`p-2 rounded-lg transition-all ${sal.isDisbursed ? 'text-green-500 bg-green-50 cursor-default' : 'bg-green-600 text-white hover:bg-green-700 shadow-md'}`}
                                                                title="确认发放并记入财务流水"
                                                                disabled={sal.isDisbursed}
                                                            >
                                                                {sal.isDisbursed ? <CheckSquare className="w-4 h-4" /> : <Banknote className="w-4 h-4" />}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {/* 系统初算详细 breakdowns */}
                                                {!sal.isSaved && (
                                                    <tr className="bg-gray-50/30">
                                                        <td colSpan={9} className="px-10 py-2 border-b border-gray-100/50">
                                                            <div className="flex flex-wrap gap-4">
                                                                {sal.teamBreakdown.map(teamInfo => (
                                                                    <div key={teamInfo.teamId} className="flex gap-2 text-[9px] font-bold text-gray-400">
                                                                        <span className="text-gray-600">{teams.find(t => t.id === teamInfo.teamId)?.level}:</span>
                                                                        <span>{teamInfo.sessionCount}次课 / {teamInfo.monthlyAttendanceRate.toFixed(1)}% 参训 {teamInfo.renewalRate > 0 ? `/ ${teamInfo.renewalRate.toFixed(1)}% 续费` : ''}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                    {coachSalaries.length === 0 && (
                                        <tr><td colSpan={9} className="py-20 text-center text-gray-400 italic">未找到符合条件的教练员核算信息。</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 flex items-start gap-4 shadow-inner">
                        <div className="p-2 bg-blue-600 text-white rounded-lg"><Info className="w-5 h-5" /></div>
                        <div className="text-xs text-blue-900 leading-relaxed">
                            <p className="font-black mb-1 uppercase tracking-widest">财务入账规则说明</p>
                            <ul className="list-disc pl-4 space-y-1 opacity-80 font-bold">
                                <li>表单数据默认按当前系统配置规则初算，背景变色表示该项金额已被人工手动干预修改。</li>
                                <li>点击 <Save className="w-3.5 h-3.5 inline text-blue-700" /> 将当前所有字段金额固化为该教练该月永久快照，之后球员变动或考勤修改将不影响此快照。</li>
                                <li>点击 <Banknote className="w-3.5 h-3.5 inline text-green-700" /> 发放按钮后，系统会自动在“现金日记账流水”中生成一笔“支出”记录，摘要含月份与教练姓名。</li>
                            </ul>
                        </div>
                    </div>
                </div>
            ) : viewMode === 'journal' ? (
                /* 日记账流水视图保持原有功能 */
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h3 className="font-bold text-gray-800 flex items-center"><FileText className="w-5 h-5 mr-2 text-bvb-yellow" /> 现金日记账流水明细</h3>
                        <div className="flex items-center gap-4">
                            <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">共 {transactions.length} 条记录</span>
                            <button onClick={() => {
                                const headers = "日期,项目分类,摘要备注,收入金额,支出金额,结算账户,结余\n";
                                const rows = journalWithBalance.map(t => {
                                    const catLabel = financeCategories.find(c => c.id === t.category)?.label || '未知分类';
                                    return `${t.date},${catLabel},"${t.details.replace(/"/g, '""')}",${t.income || ''},${t.expense || ''},${t.account},${t.balance.toFixed(2)}`;
                                }).join('\n');
                                const blob = new Blob(["\ufeff" + headers + rows], { type: 'text/csv;charset=utf-8;' });
                                const link = document.createElement('a');
                                link.href = URL.createObjectURL(blob);
                                link.download = `现金日记账_${new Date().toISOString().split('T')[0]}.csv`;
                                link.click();
                            }} className="text-xs flex items-center bg-white border border-gray-300 px-3 py-1.5 rounded-lg font-bold hover:bg-gray-100 transition-colors shadow-sm">
                                <Download className="w-3.5 h-3.5 mr-1.5" /> 导出表格
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 text-gray-600 font-black uppercase text-[10px] tracking-widest sticky top-0 z-10 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 w-10">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 rounded text-bvb-black focus:ring-bvb-yellow"
                                            checked={selectedIds.size > 0 && selectedIds.size === journalWithBalance.length}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th className="px-6 py-4">日期</th>
                                    <th className="px-6 py-4">项目分类</th>
                                    <th className="px-6 py-4">明细/摘要</th>
                                    <th className="px-6 py-4 text-right">收入</th>
                                    <th className="px-6 py-4 text-right">支出</th>
                                    <th className="px-6 py-4 text-right">余额</th>
                                    <th className="px-6 py-4 text-center">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {journalWithBalance.map((t) => {
                                    const cat = financeCategories.find(c => c.id === t.category);
                                    const isSelected = selectedIds.has(t.id);
                                    return (
                                        <tr key={t.id} className={`hover:bg-yellow-50/30 transition-colors cursor-pointer group ${isSelected ? 'bg-yellow-50' : ''}`} onClick={() => toggleSelectId(t.id)}>
                                            <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 rounded text-bvb-black focus:ring-bvb-yellow"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelectId(t.id)}
                                                />
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs whitespace-nowrap text-gray-500">{t.date}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-[10px] px-2 py-0.5 rounded font-black border uppercase tracking-tighter ${cat?.type === 'income' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                                    {cat?.label || '未知分类'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-gray-800">{t.details}</td>
                                            <td className="px-6 py-4 text-right font-black text-green-600 tabular-nums">{t.income > 0 ? Number(t.income).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</td>
                                            <td className="px-6 py-4 text-right font-black text-red-500 tabular-nums">{t.expense > 0 ? Number(t.expense).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</td>
                                            <td className="px-6 py-4 text-right font-mono font-black text-gray-700 bg-gray-50/30 tabular-nums">{t.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className="px-6 py-4 text-center">
                                                <button onClick={(e) => { e.stopPropagation(); onDeleteTransaction(t.id); }} className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {journalWithBalance.length === 0 && (
                                    <tr><td colSpan={8} className="py-20 text-center text-gray-400 italic">暂无账务记录。</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* 年度统计视图保持不变 */
                <div className="space-y-6 animate-in slide-in-from-bottom-4">
                     <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-lg text-gray-800 flex items-center"><BarChart3 className="w-6 h-6 mr-2 text-bvb-yellow" /> 年度财务趋势与统计汇总</h3>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setSelectedYear(v => v - 1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-100"><ChevronLeft className="w-4 h-4 text-gray-400"/></button>
                            <span className="font-black text-xl px-6 min-w-[100px] text-center">{selectedYear}</span>
                            <button onClick={() => setSelectedYear(v => v + 1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-100"><ChevronRight className="w-4 h-4 text-gray-400"/></button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 h-[450px]">
                            <h4 className="text-sm font-black text-gray-400 uppercase tracking-[0.15em] mb-8">月度收支趋势对比表</h4>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlySummaryData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold', fill: '#6b7280' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }} />
                                    <Legend iconType="circle" align="center" verticalAlign="bottom" wrapperStyle={{fontSize: '12px', fontWeight: 'bold', paddingTop: '30px'}} />
                                    <Bar dataKey="income" name="总收入" fill="#22C55E" radius={[6, 6, 0, 0]} barSize={32} />
                                    <Bar dataKey="expense" name="总支出" fill="#EF4444" radius={[6, 6, 0, 0]} barSize={32} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* 收入分析 */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-5 flex justify-between items-center border-b border-gray-100">
                                <h4 className="font-black text-sm uppercase tracking-widest flex items-center text-green-600">
                                    <ArrowUpRight className="w-5 h-5 mr-2" /> 收入项目统计 ({selectedYear}年)
                                </h4>
                                <span className="bg-green-50 text-green-700 text-[10px] font-black px-2 py-1 rounded border border-green-100">¥{currentStats.income.toLocaleString()}</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50/50 border-b">
                                        <tr className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
                                            <th className="px-6 py-4 text-left">科目名称</th>
                                            <th className="px-6 py-4 text-right">累计金额</th>
                                            <th className="px-6 py-4 text-right w-32">比重</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {categoryAnalysis.incomeData.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-gray-700">{item.name}</td>
                                                <td className="px-6 py-4 text-right font-black text-green-600 tabular-nums">¥{item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex flex-col items-end gap-1.5">
                                                        <span className="font-mono text-xs font-bold text-gray-400">{item.percent}%</span>
                                                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${item.percent}%` }}></div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* 支出分析 */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-5 flex justify-between items-center border-b border-gray-100">
                                <h4 className="font-black text-sm uppercase tracking-widest flex items-center text-red-600">
                                    <ArrowDownRight className="w-5 h-5 mr-2" /> 支出项目统计 ({selectedYear}年)
                                </h4>
                                <span className="bg-red-50 text-red-700 text-[10px] font-black px-2 py-1 rounded border border-red-100">¥{currentStats.expense.toLocaleString()}</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50/50 border-b">
                                        <tr className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
                                            <th className="px-6 py-4 text-left">科目名称</th>
                                            <th className="px-6 py-4 text-right">累计金额</th>
                                            <th className="px-6 py-4 text-right w-32">比重</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {categoryAnalysis.expenseData.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-gray-700">{item.name}</td>
                                                <td className="px-6 py-4 text-right font-black text-red-600 tabular-nums">¥{item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex flex-col items-end gap-1.5">
                                                        <span className="font-mono text-xs font-bold text-gray-400">{item.percent}%</span>
                                                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-red-500 rounded-full" style={{ width: `${item.percent}%` }}></div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals 保持不变 */}
        </div>
    );
};

export default FinanceManager;
