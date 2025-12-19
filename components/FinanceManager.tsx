
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FinanceTransaction, FinanceCategoryDefinition, User } from '../types';
import { Wallet, Plus, Trash2, Calendar, FileText, Download, TrendingUp, TrendingDown, PieChart as PieChartIcon, BarChart3, ChevronLeft, ChevronRight, Calculator, CheckCircle, X, ArrowUpRight, ArrowDownRight, MinusCircle, FileSpreadsheet, Upload, FileDown, Target, ImageIcon, Paperclip, Eye, AlertCircle, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LineChart, Line, PieChart, Pie, Legend } from 'recharts';

interface FinanceManagerProps {
    transactions: FinanceTransaction[];
    financeCategories: FinanceCategoryDefinition[];
    currentUser: User | null;
    onAddTransaction: (t: FinanceTransaction) => void;
    onBulkAddTransactions: (t: FinanceTransaction[]) => void;
    onDeleteTransaction: (id: string) => void;
}

const COLORS = ['#FDE100', '#000000', '#4A4A4A', '#22C55E', '#EF4444', '#3B82F6', '#A855F7', '#F97316'];

const FinanceManager: React.FC<FinanceManagerProps> = ({ transactions, financeCategories, currentUser, onAddTransaction, onBulkAddTransactions, onDeleteTransaction }) => {
    const [viewMode, setViewMode] = useState<'journal' | 'summary'>('journal');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    
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
            balance += (t.income - t.expense);
            return { ...t, balance };
        }).reverse(); 
    }, [sortedTransactions]);

    const currentStats = useMemo(() => {
        const yearTransactions = transactions.filter(t => new Date(t.date).getFullYear() === selectedYear);
        const income = yearTransactions.reduce((sum, t) => sum + (t.income || 0), 0);
        const expense = yearTransactions.reduce((sum, t) => sum + (t.expense || 0), 0);
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
            const date = new Date(t.date);
            if (date.getFullYear() === selectedYear) {
                const m = date.getMonth();
                data[m].income += t.income;
                data[m].expense += t.expense;
                data[m].profit = data[m].income - data[m].expense;
            }
        });
        return data;
    }, [transactions, selectedYear]);

    // Comment: Added missing categoryAnalysis to fix "Cannot find name 'categoryAnalysis'" error
    const categoryAnalysis = useMemo(() => {
        const incomeMap: Record<string, number> = {};
        const expenseMap: Record<string, number> = {};

        transactions.forEach(t => {
            const date = new Date(t.date);
            if (date.getFullYear() === selectedYear) {
                const cat = financeCategories.find(c => c.id === t.category);
                if (cat) {
                    if (cat.type === 'income') {
                        incomeMap[cat.label] = (incomeMap[cat.label] || 0) + t.income;
                    } else {
                        expenseMap[cat.label] = (expenseMap[cat.label] || 0) + t.expense;
                    }
                }
            }
        });

        const incomeData = Object.keys(incomeMap).map(label => ({
            name: label,
            value: incomeMap[label]
        }));

        const expenseData = Object.keys(expenseMap).map(label => ({
            name: label,
            value: expenseMap[label]
        }));

        return { incomeData, expenseData };
    }, [transactions, selectedYear, financeCategories]);

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
            let batchIncome = 0;
            let batchExpense = 0;
            
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));
                if (cols.length >= 5) {
                    const date = cols[0];
                    const catLabel = cols[1];
                    const details = cols[2];
                    
                    const cleanAmount = (str: string) => {
                        if (!str) return 0;
                        return parseFloat(str.replace(/[¥, ]/g, '')) || 0;
                    };
                    
                    const income = cleanAmount(cols[3]);
                    const expense = cleanAmount(cols[4]);
                    const account = cols[5] || '默认账户';

                    const catDef = financeCategories.find(c => c.label === catLabel);
                    if (!catDef) continue;
                    if (income === 0 && expense === 0) continue;

                    batchIncome += income;
                    batchExpense += expense;

                    newTxs.push({
                        id: `imp-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
                        date, details, category: catDef.id, income, expense, account
                    });
                }
            }

            if (newTxs.length > 0) {
                setImportSummary({
                    count: newTxs.length,
                    income: batchIncome,
                    expense: batchExpense,
                    tempTxs: newTxs
                });
                setShowImportModal(false);
            } else {
                alert('未解析到有效数据，请确保分类名称与系统科目完全一致。');
            }
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const confirmBulkImport = () => {
        if (importSummary) {
            onBulkAddTransactions(importSummary.tempTxs);
            setImportSummary(null);
        }
    };

    const handleExportJournal = () => {
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
                /* --- Journal View --- */
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h3 className="font-bold text-gray-800 flex items-center"><FileText className="w-5 h-5 mr-2 text-bvb-yellow" /> 现金日记账流水明细</h3>
                        <div className="flex items-center gap-4">
                            <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">共 {transactions.length} 条记录</span>
                            <button onClick={handleExportJournal} className="text-xs flex items-center bg-white border border-gray-300 px-3 py-1.5 rounded-lg font-bold hover:bg-gray-100 transition-colors shadow-sm">
                                <Download className="w-3.5 h-3.5 mr-1.5" /> 导出表格
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 text-gray-600 font-black uppercase text-[10px] tracking-widest sticky top-0 z-10 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4">日期</th>
                                    <th className="px-6 py-4">项目分类</th>
                                    <th className="px-6 py-4">明细/摘要</th>
                                    <th className="px-6 py-4 text-right">收入金额</th>
                                    <th className="px-6 py-4 text-right">支出金额</th>
                                    <th className="px-6 py-4 text-right">余额</th>
                                    <th className="px-6 py-4 text-center">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {journalWithBalance.map((t) => {
                                    const cat = financeCategories.find(c => c.id === t.category);
                                    return (
                                        <tr key={t.id} className="hover:bg-yellow-50/30 transition-colors group">
                                            <td className="px-6 py-4 font-mono text-xs whitespace-nowrap text-gray-500">{t.date}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-[10px] px-2 py-0.5 rounded font-black border uppercase tracking-tighter ${cat?.type === 'income' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                                    {cat?.label || '未知分类'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-gray-800">{t.details}</td>
                                            <td className="px-6 py-4 text-right font-black text-green-600 tabular-nums">{t.income > 0 ? t.income.toFixed(2) : '-'}</td>
                                            <td className="px-6 py-4 text-right font-black text-red-500 tabular-nums">{t.expense > 0 ? t.expense.toFixed(2) : '-'}</td>
                                            <td className="px-6 py-4 text-right font-mono font-black text-gray-700 bg-gray-50/30 tabular-nums">{t.balance.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-center">
                                                <button onClick={() => onDeleteTransaction(t.id)} className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {journalWithBalance.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-20 text-center text-gray-400 italic">暂无账务记录，点击上方按钮新增或导入数据。</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* --- Summary View --- */
                <div className="space-y-8 animate-in slide-in-from-bottom-4">
                     <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-gray-800 flex items-center"><BarChart3 className="w-5 h-5 mr-2 text-bvb-yellow" /> 年度财务趋势与分类统计 ({selectedYear})</h3>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setSelectedYear(v => v - 1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ChevronLeft className="w-5 h-5 text-gray-400"/></button>
                            <span className="font-black text-lg px-4 border-x border-gray-100">{selectedYear}</span>
                            <button onClick={() => setSelectedYear(v => v + 1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ChevronRight className="w-5 h-5 text-gray-400"/></button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-80">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">月度收支趋势对比</h4>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlySummaryData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                    <Legend iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 'bold', paddingTop: '10px'}} />
                                    <Bar dataKey="income" name="收入" fill="#22C55E" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="expense" name="支出" fill="#EF4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-80 flex flex-col md:flex-row">
                             <div className="flex-1">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 text-center">收入构成</h4>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={categoryAnalysis.incomeData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" stroke="none" paddingAngle={2}>
                                            {categoryAnalysis.incomeData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                             </div>
                             <div className="flex-1">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 text-center">支出构成</h4>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={categoryAnalysis.expenseData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" stroke="none" paddingAngle={2}>
                                            {categoryAnalysis.expenseData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                             </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Modals --- */}

            {/* Import Statistics Summary Report Modal */}
            {importSummary && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
                        <div className="bg-bvb-black p-8 flex justify-between items-center text-white">
                            <div>
                                <h3 className="font-black text-2xl flex items-center uppercase tracking-tighter italic">
                                    <Calculator className="w-6 h-6 mr-3 text-bvb-yellow" /> 
                                    导入数据统计报告
                                </h3>
                                <p className="text-gray-400 text-xs font-bold mt-1 uppercase tracking-widest">Financial Import Batch Analysis</p>
                            </div>
                            <button onClick={() => setImportSummary(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-10 space-y-8 bg-gray-50/50">
                            {/* Record Count */}
                            <div className="flex items-center gap-5 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                <div className="p-4 bg-bvb-yellow/10 rounded-2xl text-bvb-black"><FileText className="w-8 h-8" /></div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">解析到有效记录</p>
                                    <h4 className="text-3xl font-black text-gray-800">{importSummary.count} <span className="text-sm font-normal text-gray-400 ml-1">Entries</span></h4>
                                </div>
                            </div>

                            {/* Summary Detail */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100">
                                    <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-2 flex items-center"><ArrowUpRight className="w-3 h-3 mr-1" /> 收入总额</p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-sm font-black text-green-700">¥</span>
                                        <h4 className="text-2xl font-black text-green-800 tabular-nums">{importSummary.income.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h4>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-100">
                                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-2 flex items-center"><ArrowDownRight className="w-3 h-3 mr-1" /> 支出总额</p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-sm font-black text-red-700">¥</span>
                                        <h4 className="text-2xl font-black text-red-800 tabular-nums">{importSummary.expense.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h4>
                                    </div>
                                </div>
                            </div>

                            {/* Impact Analysis */}
                            <div className="bg-bvb-black p-8 rounded-[24px] text-white relative overflow-hidden shadow-xl shadow-bvb-black/20">
                                <div className="relative z-10">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 flex items-center">
                                        <TrendingUp className="w-3 h-3 mr-1 text-bvb-yellow" />
                                        本次入账利润贡献
                                    </p>
                                    <h4 className={`text-4xl font-black tabular-nums ${(importSummary.income - importSummary.expense) >= 0 ? 'text-bvb-yellow' : 'text-red-400'}`}>
                                        ¥{(importSummary.income - importSummary.expense).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </h4>
                                </div>
                                <div className="absolute top-0 right-0 h-full w-1/3 bg-bvb-yellow/5 skew-x-12 transform translate-x-12 pointer-events-none"></div>
                                <Target className="absolute -right-6 -bottom-6 w-32 h-32 text-white/5 rotate-12" />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button onClick={() => setImportSummary(null)} className="flex-1 py-4 bg-gray-200 text-gray-600 font-black rounded-2xl hover:bg-gray-300 transition-all uppercase tracking-widest text-xs">放弃导入</button>
                                <button onClick={confirmBulkImport} className="flex-[2] py-4 bg-bvb-yellow text-bvb-black font-black rounded-2xl hover:brightness-105 shadow-lg flex items-center justify-center uppercase tracking-widest text-xs">
                                    <CheckCircle className="w-5 h-5 mr-3" /> 确认入账并保存
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Standard Import Guidance Modal */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-bvb-black p-6 flex justify-between items-center text-white shrink-0">
                            <h3 className="font-bold text-xl flex items-center tracking-tighter uppercase">
                                <FileSpreadsheet className="w-6 h-6 mr-3 text-bvb-yellow" /> 
                                财务导入向导
                            </h3>
                            <button onClick={() => setShowImportModal(false)} className="hover:bg-white/10 rounded-full p-1 transition-colors"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="p-8 space-y-6 bg-gray-50/50">
                            <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col items-center text-center shadow-sm hover:border-bvb-yellow transition-colors group">
                                <FileDown className="w-12 h-12 text-gray-300 mb-4 group-hover:text-bvb-yellow transition-colors" />
                                <h4 className="font-black text-gray-700 mb-2 uppercase text-sm">1. 获取标准表格模板</h4>
                                <button onClick={handleDownloadTemplate} className="flex items-center px-6 py-2.5 bg-bvb-black text-white rounded-xl text-xs font-black hover:bg-gray-800 shadow-md transition-all active:scale-95">
                                    <Download className="w-4 h-4 mr-2 text-bvb-yellow" /> 下载 CSV 模板
                                </button>
                            </div>
                            <div className="bg-blue-50 border-2 border-dashed border-blue-200 rounded-2xl p-8 flex flex-col items-center text-center relative group hover:bg-blue-100/50 transition-colors">
                                <Upload className="w-12 h-12 text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
                                <h4 className="font-black text-blue-900 mb-2 uppercase text-sm">2. 上传数据进行统计</h4>
                                <p className="text-[10px] text-blue-600/70 font-bold mb-4">支持 .CSV 格式文件</p>
                                <input type="file" ref={fileInputRef} accept=".csv" onChange={handleImportCSV} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                <button className="flex items-center px-8 py-3 bg-blue-600 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-600/20 group-hover:brightness-110">选择文件并分析</button>
                            </div>
                            <div className="flex items-start gap-3 text-[10px] text-gray-400 italic bg-white p-3 rounded-lg border border-gray-100">
                                <AlertCircle className="w-4 h-4 shrink-0 text-bvb-yellow" />
                                <span>系统将基于“项目分类”自动匹配会计科目。请确保表格中的分类名称与“系统设置”中的科目完全一致。</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Manual Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-bvb-black p-6 flex justify-between items-center text-white shrink-0">
                            <h3 className="font-black text-xl flex items-center tracking-tighter uppercase">
                                <Calculator className="w-6 h-6 mr-3 text-bvb-yellow" /> 
                                手动入账
                            </h3>
                            <button onClick={() => setShowAddModal(false)} className="hover:bg-white/10 rounded-full p-1 transition-colors"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="flex p-2 gap-2 bg-gray-100/50 mx-6 mt-6 rounded-2xl border border-gray-200">
                            <button onClick={() => setActiveType('income')} className={`flex-1 py-3 rounded-xl font-black text-xs flex items-center justify-center transition-all ${activeType === 'income' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>
                                <ArrowUpRight className="w-4 h-4 mr-2" /> 收入入账
                            </button>
                            <button onClick={() => setActiveType('expense')} className={`flex-1 py-3 rounded-xl font-black text-xs flex items-center justify-center transition-all ${activeType === 'expense' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>
                                <ArrowDownRight className="w-4 h-4 mr-2" /> 支出入账
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">业务日期</label>
                                    <input type="date" required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-sm focus:ring-2 focus:ring-bvb-yellow transition-all" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">收支金额 (¥)</label>
                                    <input type="number" step="0.01" required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-black text-lg text-gray-800 focus:ring-2 focus:ring-bvb-yellow transition-all" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} placeholder="0.00" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">会计科目</label>
                                <select required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-sm focus:ring-2 focus:ring-bvb-yellow transition-all appearance-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                    <option value="" disabled>请选择所属分类...</option>
                                    {financeCategories.filter(c => c.type === activeType).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">明细备注 / 摘要</label>
                                <textarea required rows={2} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-sm focus:ring-2 focus:ring-bvb-yellow transition-all resize-none" value={formData.details} onChange={e => setFormData({...formData, details: e.target.value})} placeholder="例如：学员张三续缴课时费..." />
                            </div>
                            <button type="submit" className={`w-full py-4 text-white font-black rounded-2xl shadow-xl mt-4 uppercase tracking-widest transition-all active:scale-95 ${activeType === 'income' ? 'bg-green-600 shadow-green-600/20' : 'bg-red-600 shadow-red-600/20'}`}>
                                <CheckCircle className="w-5 h-5 inline-block mr-2" /> 确认提交入账
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinanceManager;
