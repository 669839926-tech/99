
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FinanceTransaction, FinanceCategoryDefinition, User } from '../types';
import { Wallet, Plus, Trash2, Calendar, FileText, Download, TrendingUp, TrendingDown, PieChart as PieChartIcon, BarChart3, ChevronLeft, ChevronRight, Calculator, CheckCircle, X, ArrowUpRight, ArrowDownRight, MinusCircle, FileSpreadsheet, Upload, FileDown, Target, ImageIcon, Paperclip, Eye, AlertCircle, Info, CheckSquare, RefreshCw, ListFilter, TableProperties } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LineChart, Line, PieChart, Pie, Legend } from 'recharts';

interface FinanceManagerProps {
    transactions: FinanceTransaction[];
    financeCategories: FinanceCategoryDefinition[];
    currentUser: User | null;
    onAddTransaction: (t: FinanceTransaction) => void;
    onBulkAddTransactions: (t: FinanceTransaction[]) => void;
    onDeleteTransaction: (id: string) => void;
    onBulkDeleteTransactions: (ids: string[]) => void;
}

const COLORS = ['#FDE100', '#000000', '#4A4A4A', '#22C55E', '#EF4444', '#3B82F6', '#A855F7', '#F97316'];

// 辅助函数：安全解析年份
const getSafeYear = (dateStr: string) => {
    if (!dateStr) return 0;
    const match = dateStr.match(/^(\d{4})/);
    if (match) return parseInt(match[1]);
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 0 : d.getFullYear();
};

const FinanceManager: React.FC<FinanceManagerProps> = ({ transactions, financeCategories, currentUser, onAddTransaction, onBulkAddTransactions, onDeleteTransaction, onBulkDeleteTransactions }) => {
    const [viewMode, setViewMode] = useState<'journal' | 'summary'>('journal');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    
    // Import Statistics State
    const [importSummary, setImportSummary] = useState<{ count: number, income: number, expense: number, tempTxs: FinanceTransaction[] } | null>(null);

    // Form State
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

    // --- Data Processing ---
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

    // Selection Logic
    const toggleSelectAll = () => {
        if (selectedIds.size === journalWithBalance.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(journalWithBalance.map(t => t.id)));
        }
    };

    const toggleSelectId = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleBulkDelete = () => {
        onBulkDeleteTransactions(Array.from(selectedIds));
        setSelectedIds(new Set());
    };

    const handleDownloadTemplate = () => {
        const headers = "日期,项目分类,摘要备注,收入金额,支出金额,结算账户\n";
        const example = `${new Date().toISOString().split('T')[0]},课时续费,张三充值,1000,0,黔农云\n`;
        const content = headers + example;
        const blob = new Blob(["\ufeff" + content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = "财务导入模版.csv";
        link.click();
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

    const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target?.result as string;
            const lines = text.split('\n');
            const newTxs: FinanceTransaction[] = [];
            let batchIncome = 0; let batchExpense = 0;

            const cleanAmount = (str: string) => str ? parseFloat(str.replace(/[¥, ]/g, '')) || 0 : 0;
            const normalizeDateStr = (str: string) => {
                let s = str.trim();
                s = s.replace(/(\d{4})年(\d{1,2})月(\d{1,2})日/, (_, y, m, d) => `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`);
                s = s.replace(/\//g, '-');
                return s;
            };

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));
                if (cols.length >= 5) {
                    const date = normalizeDateStr(cols[0]);
                    const catLabel = cols[1];
                    const details = cols[2];
                    const income = cleanAmount(cols[3]);
                    const expense = cleanAmount(cols[4]);
                    const account = cols[5] || '默认账户';
                    const catDef = financeCategories.find(c => c.label === catLabel);
                    if (!catDef || (income === 0 && expense === 0)) continue;
                    batchIncome += income; batchExpense += expense;
                    newTxs.push({ id: `imp-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`, date, details, category: catDef.id, income, expense, account });
                }
            }
            if (newTxs.length > 0) {
                setImportSummary({ count: newTxs.length, income: batchIncome, expense: batchExpense, tempTxs: newTxs });
                setShowImportModal(false);
            } else alert('未解析到有效数据，请确保分类名称与系统科目完全一致。');
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
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
                        <button onClick={() => setViewMode('journal')} className={`px-4 py-2 rounded-md text-xs font-black transition-all ${viewMode === 'journal' ? 'bg-bvb-black text-bvb-yellow' : 'text-gray-500 hover:text-gray-800'}`}>日记账流水</button>
                        <button onClick={() => setViewMode('summary')} className={`px-4 py-2 rounded-md text-xs font-black transition-all ${viewMode === 'summary' ? 'bg-bvb-black text-bvb-yellow' : 'text-gray-500 hover:text-gray-800'}`}>统计汇总表</button>
                    </div>
                    <button onClick={() => setShowImportModal(true)} className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-600 font-bold rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
                        <FileSpreadsheet className="w-5 h-5 mr-2 text-green-600" /> 批量导入
                    </button>
                    <button onClick={() => { setActiveType('income'); setShowAddModal(true); }} className="flex items-center px-4 py-2 bg-bvb-yellow text-bvb-black font-bold rounded-lg shadow-md hover:brightness-105 active:scale-95 transition-all">
                        <Plus className="w-5 h-5 mr-2" /> 记一笔
                    </button>
                </div>
            </div>

            {/* Selection Toolbar (Floating) */}
            {selectedIds.size > 0 && viewMode === 'journal' && (
                <div className="sticky top-0 z-20 bg-bvb-black text-white p-4 rounded-xl shadow-2xl flex justify-between items-center animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-4">
                        <CheckSquare className="w-6 h-6 text-bvb-yellow" />
                        <span className="font-bold">已选择 {selectedIds.size} 条记录</span>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setSelectedIds(new Set())} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-bold transition-colors">取消选择</button>
                        <button onClick={handleBulkDelete} className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-bold flex items-center transition-colors">
                            <Trash2 className="w-4 h-4 mr-2" /> 批量删除勾选项
                        </button>
                    </div>
                </div>
            )}

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border-l-[6px] border-green-500 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{selectedYear}年度总收入</p>
                            <h3 className="text-3xl font-black text-gray-800 tabular-nums">¥{currentStats.income.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                        </div>
                        <div className="p-3 bg-green-50 rounded-2xl text-green-600 shadow-inner"><ArrowUpRight className="w-7 h-7" /></div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border-l-[6px] border-red-500 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{selectedYear}年度总支出</p>
                            <h3 className="text-3xl font-black text-gray-800 tabular-nums">¥{currentStats.expense.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                        </div>
                        <div className="p-3 bg-red-50 rounded-2xl text-red-600 shadow-inner"><ArrowDownRight className="w-7 h-7" /></div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border-l-[6px] border-bvb-yellow hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{selectedYear}年度净利润</p>
                            <h3 className={`text-3xl font-black tabular-nums ${currentStats.profit >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
                                ¥{currentStats.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </h3>
                        </div>
                        <div className="p-3 bg-yellow-50 rounded-2xl text-yellow-600 shadow-inner"><Calculator className="w-7 h-7" /></div>
                    </div>
                </div>
            </div>

            {viewMode === 'journal' ? (
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
                                        <tr key={t.id} className={`hover:bg-yellow-50/30 transition-colors group ${isSelected ? 'bg-yellow-50' : ''}`} onClick={() => toggleSelectId(t.id)}>
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
                <div className="space-y-8 animate-in slide-in-from-bottom-4">
                     {/* Year Selector */}
                     <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-gray-800 flex items-center"><BarChart3 className="w-5 h-5 mr-2 text-bvb-yellow" /> 年度财务趋势与统计汇总</h3>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setSelectedYear(v => v - 1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ChevronLeft className="w-5 h-5 text-gray-400"/></button>
                            <span className="font-black text-lg px-4 border-x border-gray-100">{selectedYear}</span>
                            <button onClick={() => setSelectedYear(v => v + 1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ChevronRight className="w-5 h-5 text-gray-400"/></button>
                        </div>
                    </div>

                    {/* Main Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-80">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">月度收支趋势对比表</h4>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlySummaryData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                    <Legend iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 'bold', paddingTop: '10px'}} />
                                    <Bar dataKey="income" name="总收入" fill="#22C55E" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="expense" name="总支出" fill="#EF4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-80 flex flex-col md:flex-row">
                             <div className="flex-1">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 text-center">收入构成占比</h4>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={categoryAnalysis.incomeData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" stroke="none" paddingAngle={2}>
                                            {categoryAnalysis.incomeData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
                                    </PieChart>
                                </ResponsiveContainer>
                             </div>
                             <div className="flex-1">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 text-center">支出构成占比</h4>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={categoryAnalysis.expenseData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" stroke="none" paddingAngle={2}>
                                            {categoryAnalysis.expenseData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
                                    </PieChart>
                                </ResponsiveContainer>
                             </div>
                        </div>
                    </div>

                    {/* NEW: Detailed Category Summary Table */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Income Summary Table */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="bg-green-600 p-4 flex justify-between items-center">
                                <h4 className="text-white font-black text-sm uppercase tracking-widest flex items-center">
                                    <ArrowUpRight className="w-4 h-4 mr-2" /> 收入项目统计 (年度)
                                </h4>
                                <span className="bg-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded">Total: ¥{currentStats.income.toLocaleString()}</span>
                            </div>
                            <table className="w-full text-xs">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-left">科目名称</th>
                                        <th className="px-4 py-3 text-right">累计金额</th>
                                        <th className="px-4 py-3 text-right w-24">所占比重</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {categoryAnalysis.incomeData.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-bold text-gray-700">{item.name}</td>
                                            <td className="px-4 py-3 text-right font-black text-green-600">¥{item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="font-mono text-gray-400">{item.percent}%</span>
                                                    <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-green-500" style={{ width: `${item.percent}%` }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {categoryAnalysis.incomeData.length === 0 && (
                                        <tr><td colSpan={3} className="py-10 text-center text-gray-400 italic">本年度无收入记录</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Expense Summary Table */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="bg-red-600 p-4 flex justify-between items-center">
                                <h4 className="text-white font-black text-sm uppercase tracking-widest flex items-center">
                                    <ArrowDownRight className="w-4 h-4 mr-2" /> 支出项目统计 (年度)
                                </h4>
                                <span className="bg-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded">Total: ¥{currentStats.expense.toLocaleString()}</span>
                            </div>
                            <table className="w-full text-xs">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-left">科目名称</th>
                                        <th className="px-4 py-3 text-right">累计金额</th>
                                        <th className="px-4 py-3 text-right w-24">所占比重</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {categoryAnalysis.expenseData.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-bold text-gray-700">{item.name}</td>
                                            <td className="px-4 py-3 text-right font-black text-red-600">¥{item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="font-mono text-gray-400">{item.percent}%</span>
                                                    <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-red-500" style={{ width: `${item.percent}%` }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {categoryAnalysis.expenseData.length === 0 && (
                                        <tr><td colSpan={3} className="py-10 text-center text-gray-400 italic">本年度无支出记录</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* NEW: Monthly Summary Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="bg-bvb-black p-4">
                            <h4 className="text-white font-black text-sm uppercase tracking-widest flex items-center">
                                <TableProperties className="w-4 h-4 mr-2 text-bvb-yellow" /> 月度盈亏汇总明细表 ({selectedYear}年)
                            </h4>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-gray-50 font-black text-gray-500 border-b">
                                    <tr>
                                        <th className="px-6 py-4">月份</th>
                                        <th className="px-6 py-4 text-right">月度收入</th>
                                        <th className="px-6 py-4 text-right">月度支出</th>
                                        <th className="px-6 py-4 text-right">月度盈余 (净利润)</th>
                                        <th className="px-6 py-4 text-center">状态</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {monthlySummaryData.map((m, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-800">{m.month}</td>
                                            <td className="px-6 py-4 text-right font-bold text-green-600">¥{m.income.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className="px-6 py-4 text-right font-bold text-red-500">¥{m.expense.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className={`px-6 py-4 text-right font-black ${m.profit >= 0 ? 'text-gray-800' : 'text-red-700 bg-red-50/30'}`}>
                                                ¥{m.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {m.profit > 0 ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-black uppercase">盈利</span>
                                                ) : m.profit < 0 ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-black uppercase">亏损</span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 text-[10px] font-black uppercase">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-bvb-yellow/10 font-black border-t-2 border-bvb-yellow">
                                    <tr>
                                        <td className="px-6 py-4 text-gray-800">年度合计</td>
                                        <td className="px-6 py-4 text-right text-green-700">¥{currentStats.income.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td className="px-6 py-4 text-right text-red-700">¥{currentStats.expense.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td className={`px-6 py-4 text-right ${currentStats.profit >= 0 ? 'text-gray-900' : 'text-red-800'}`}>
                                            ¥{currentStats.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Modals --- */}
            {importSummary && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
                        <div className="bg-bvb-black p-8 flex justify-between items-center text-white">
                            <div>
                                <h3 className="font-black text-2xl flex items-center uppercase tracking-tighter italic"><Calculator className="w-6 h-6 mr-3 text-bvb-yellow" /> 导入统计报告</h3>
                            </div>
                            <button onClick={() => setImportSummary(null)}><X className="w-6 h-6" /></button>
                        </div>
                        <div className="p-10 space-y-8 bg-gray-50/50">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100">
                                    <p className="text-[10px] font-black text-green-600 uppercase mb-2">收入总额</p>
                                    <h4 className="text-2xl font-black text-green-800">¥{importSummary.income.toLocaleString()}</h4>
                                </div>
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-100">
                                    <p className="text-[10px] font-black text-red-600 uppercase mb-2">支出总额</p>
                                    <h4 className="text-2xl font-black text-red-800">¥{importSummary.expense.toLocaleString()}</h4>
                                </div>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button onClick={() => setImportSummary(null)} className="flex-1 py-4 bg-gray-200 text-gray-600 font-black rounded-2xl">放弃</button>
                                <button onClick={() => { onBulkAddTransactions(importSummary.tempTxs); setImportSummary(null); }} className="flex-[2] py-4 bg-bvb-yellow text-bvb-black font-black rounded-2xl">确认入账</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-bvb-black p-6 flex justify-between items-center text-white shrink-0">
                            <h3 className="font-bold text-xl flex items-center tracking-tighter uppercase"><FileSpreadsheet className="w-6 h-6 mr-3 text-bvb-yellow" /> 导入向导</h3>
                            <button onClick={() => setShowImportModal(false)}><X className="w-6 h-6" /></button>
                        </div>
                        <div className="p-8 space-y-6 bg-gray-50/50">
                            <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col items-center text-center">
                                <FileDown className="w-12 h-12 text-gray-300 mb-4" />
                                <button onClick={handleDownloadTemplate} className="flex items-center px-6 py-2.5 bg-bvb-black text-white rounded-xl text-xs font-black">下载模板</button>
                            </div>
                            <div className="bg-blue-50 border-2 border-dashed border-blue-200 rounded-2xl p-8 flex flex-col items-center text-center relative">
                                <Upload className="w-12 h-12 text-blue-400 mb-4" />
                                <input type="file" ref={fileInputRef} accept=".csv" onChange={handleImportCSV} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                <button className="px-8 py-3 bg-blue-600 text-white rounded-xl text-xs font-black">上传文件并分析</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-bvb-black p-6 flex justify-between items-center text-white">
                            <h3 className="font-black text-xl flex items-center uppercase tracking-tighter italic"><Calculator className="w-6 h-6 mr-3 text-bvb-yellow" /> 手动入账</h3>
                            <button onClick={() => setShowAddModal(false)}><X className="w-6 h-6" /></button>
                        </div>
                        <div className="flex p-2 gap-2 bg-gray-100/50 mx-6 mt-6 rounded-2xl border border-gray-200">
                            <button onClick={() => setActiveType('income')} className={`flex-1 py-3 rounded-xl font-black text-xs ${activeType === 'income' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-400'}`}>收入</button>
                            <button onClick={() => setActiveType('expense')} className={`flex-1 py-3 rounded-xl font-black text-xs ${activeType === 'expense' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400'}`}>支出</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <input type="date" required className="w-full p-3 bg-gray-50 border rounded-xl" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                                <input type="number" step="0.01" required className="w-full p-3 bg-gray-50 border rounded-xl" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} placeholder="金额 ¥" />
                            </div>
                            <select required className="w-full p-3 bg-gray-50 border rounded-xl" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                <option value="" disabled>选择科目...</option>
                                {financeCategories.filter(c => c.type === activeType).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                            </select>
                            <textarea required rows={2} className="w-full p-3 bg-gray-50 border rounded-xl resize-none" value={formData.details} onChange={e => setFormData({...formData, details: e.target.value})} placeholder="详情摘要..." />
                            <button type="submit" className={`w-full py-4 text-white font-black rounded-2xl shadow-xl mt-4 ${activeType === 'income' ? 'bg-green-600' : 'bg-red-600'}`}>确认提交入账</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinanceManager;
