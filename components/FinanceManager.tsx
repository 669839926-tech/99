
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FinanceTransaction, FinanceCategoryDefinition, User } from '../types';
import { Wallet, Plus, Trash2, Calendar, FileText, Download, TrendingUp, TrendingDown, PieChart as PieChartIcon, BarChart3, ChevronLeft, ChevronRight, Calculator, CheckCircle, X, ArrowUpRight, ArrowDownRight, MinusCircle, FileSpreadsheet, Upload, FileDown, Target, ImageIcon, Paperclip, Eye } from 'lucide-react';
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
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    
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

    // Reset category when switching type or when categories change
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
        }).reverse(); // Latest first
    }, [sortedTransactions]);

    const currentStats = useMemo(() => {
        const income = transactions.filter(t => new Date(t.date).getFullYear() === selectedYear).reduce((sum, t) => sum + t.income, 0);
        const expense = transactions.filter(t => new Date(t.date).getFullYear() === selectedYear).reduce((sum, t) => sum + t.expense, 0);
        return { income, expense, profit: income - expense };
    }, [transactions, selectedYear]);

    // Monthly Aggregation
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

    // Category Breakdown Analysis
    const categoryAnalysis = useMemo(() => {
        const incomeMap: Record<string, number> = {};
        const expenseMap: Record<string, number> = {};

        transactions.forEach(t => {
            if (new Date(t.date).getFullYear() === selectedYear) {
                if (t.income > 0) {
                    incomeMap[t.category] = (incomeMap[t.category] || 0) + t.income;
                }
                if (t.expense > 0) {
                    expenseMap[t.category] = (expenseMap[t.category] || 0) + t.expense;
                }
            }
        });

        const incomeData = Object.keys(incomeMap).map(catId => {
            const cat = financeCategories.find(c => c.id === catId);
            return { name: cat?.label || '未知收入', value: incomeMap[catId] };
        }).sort((a, b) => b.value - a.value);

        const expenseData = Object.keys(expenseMap).map(catId => {
            const cat = financeCategories.find(c => c.id === catId);
            return { name: cat?.label || '未知支出', value: expenseMap[catId] };
        }).sort((a, b) => b.value - a.value);

        return { incomeData, expenseData };
    }, [transactions, selectedYear, financeCategories]);

    // Handle Form Submit
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amountNum = parseFloat(formData.amount) || 0;
        
        if (!formData.category) {
            alert('请选择一个项目分类');
            return;
        }

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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, attachment: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    // --- Bulk Import Logic ---
    const handleDownloadTemplate = () => {
        const headers = "日期,项目分类,摘要备注,收入金额,支出金额,结算账户\n";
        const examples = `2024-01-01,课时续费,张三秋季学费,2400,,黔农云\n2024-01-02,租金支出,1月球场租金,,5000,现金`;
        const content = headers + examples;
        const blob = new Blob(["\ufeff" + content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = '财务导入模版.csv';
        link.click();
    };

    const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target?.result as string;
            const lines = text.split('\n');
            const newTxs: FinanceTransaction[] = [];
            
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
                if (cols.length >= 5) {
                    const date = cols[0];
                    const catLabel = cols[1];
                    const details = cols[2];
                    const income = parseFloat(cols[3]) || 0;
                    const expense = parseFloat(cols[4]) || 0;
                    const account = cols[5] || '默认账户';

                    const catDef = financeCategories.find(c => c.label === catLabel);
                    if (!catDef) continue;
                    if (income === 0 && expense === 0) continue;

                    newTxs.push({
                        id: `imp-${Date.now()}-${i}`,
                        date, details, category: catDef.id, income, expense, account
                    });
                }
            }

            if (newTxs.length > 0) {
                onBulkAddTransactions(newTxs);
                alert(`成功导入 ${newTxs.length} 条账务记录。提示：附件图片需手动在列表中上传（如需此功能，可联系维护人员）。`);
                setShowImportModal(false);
            } else {
                alert('未解析到有效数据，请检查文件格式是否与导出模版一致。');
            }
        };
        reader.readAsText(file);
    };

    const handleExportJournal = () => {
        const headers = "日期,项目分类,摘要备注,收入金额,支出金额,结算账户,结余\n";
        const rows = journalWithBalance.map(t => {
            const catLabel = financeCategories.find(c => c.id === t.category)?.label || '未知分类';
            const escapedDetails = `"${t.details.replace(/"/g, '""')}"`;
            const escapedCat = `"${catLabel.replace(/"/g, '""')}"`;
            const escapedAccount = `"${t.account.replace(/"/g, '""')}"`;
            return `${t.date},${escapedCat},${escapedDetails},${t.income || ''},${t.expense || ''},${escapedAccount},${t.balance.toFixed(2)}`;
        }).join('\n');
        
        const content = headers + rows;
        const blob = new Blob(["\ufeff" + content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
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
                    <div className="flex bg-white p-1 rounded-lg border border-gray-200">
                        <button onClick={() => setViewMode('journal')} className={`px-4 py-2 rounded-md text-xs font-black transition-all ${viewMode === 'journal' ? 'bg-bvb-black text-bvb-yellow' : 'text-gray-500'}`}>日记账流水</button>
                        <button onClick={() => setViewMode('summary')} className={`px-4 py-2 rounded-md text-xs font-black transition-all ${viewMode === 'summary' ? 'bg-bvb-black text-bvb-yellow' : 'text-gray-500'}`}>统计汇总表</button>
                    </div>
                    <button onClick={() => setShowImportModal(true)} className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-600 font-bold rounded-lg shadow-sm hover:bg-gray-50">
                        <FileSpreadsheet className="w-5 h-5 mr-2" /> 批量导入
                    </button>
                    <button onClick={() => { setActiveType('income'); setShowAddModal(true); }} className="flex items-center px-4 py-2 bg-bvb-yellow text-bvb-black font-bold rounded-lg shadow-md hover:brightness-105">
                        <Plus className="w-5 h-5 mr-2" /> 记一笔
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-green-500">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">{selectedYear}年度总收入</p>
                            <h3 className="text-3xl font-black text-gray-800">¥{currentStats.income.toLocaleString()}</h3>
                        </div>
                        <div className="p-3 bg-green-50 rounded-xl text-green-600"><ArrowUpRight className="w-6 h-6" /></div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-red-500">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">{selectedYear}年度总支出</p>
                            <h3 className="text-3xl font-black text-gray-800">¥{currentStats.expense.toLocaleString()}</h3>
                        </div>
                        <div className="p-3 bg-red-50 rounded-xl text-red-600"><ArrowDownRight className="w-6 h-6" /></div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-bvb-yellow">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">{selectedYear}年度净利润</p>
                            <h3 className={`text-3xl font-black ${currentStats.profit >= 0 ? 'text-gray-800' : 'text-red-500'}`}>
                                ¥{currentStats.profit.toLocaleString()}
                            </h3>
                        </div>
                        <div className="p-3 bg-yellow-50 rounded-xl text-yellow-600"><Calculator className="w-6 h-6" /></div>
                    </div>
                </div>
            </div>

            {viewMode === 'journal' ? (
                /* --- Daily Journal View --- */
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h3 className="font-bold text-gray-800 flex items-center"><FileText className="w-5 h-5 mr-2 text-bvb-yellow" /> 现金日记账流水明细</h3>
                        <div className="flex items-center gap-4">
                            <span className="text-xs text-gray-400 font-bold">共 {transactions.length} 条记录</span>
                            <button onClick={handleExportJournal} className="text-xs flex items-center bg-white border border-gray-300 px-3 py-1 rounded-lg font-bold hover:bg-gray-50">
                                <Download className="w-3 h-3 mr-1" /> 导出表格
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 text-gray-600 font-black uppercase text-[10px] tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">日期</th>
                                    <th className="px-6 py-4">项目分类</th>
                                    <th className="px-6 py-4">明细/摘要</th>
                                    <th className="px-6 py-4 text-right">收入金额</th>
                                    <th className="px-6 py-4 text-right">支出金额</th>
                                    <th className="px-6 py-4 text-right">余额</th>
                                    <th className="px-6 py-4">账户</th>
                                    <th className="px-6 py-4 text-center">附件</th>
                                    <th className="px-6 py-4 text-center">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {journalWithBalance.map((t) => {
                                    const cat = financeCategories.find(c => c.id === t.category);
                                    return (
                                        <tr key={t.id} className="hover:bg-yellow-50/30 transition-colors group">
                                            <td className="px-6 py-4 font-mono text-xs whitespace-nowrap">{t.date}</td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${cat?.type === 'income' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                                    {cat?.label || '未知分类'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-gray-800">{t.details}</td>
                                            <td className="px-6 py-4 text-right font-black text-green-600">{t.income > 0 ? t.income.toFixed(2) : '-'}</td>
                                            <td className="px-6 py-4 text-right font-black text-red-500">{t.expense > 0 ? t.expense.toFixed(2) : '-'}</td>
                                            <td className="px-6 py-4 text-right font-mono font-black text-gray-700 bg-gray-50/30">{t.balance.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-gray-500 font-bold">{t.account}</td>
                                            <td className="px-6 py-4 text-center">
                                                {t.attachment ? (
                                                    <button onClick={() => setPreviewImage(t.attachment!)} className="p-1.5 bg-yellow-50 text-bvb-black border border-bvb-yellow rounded-lg hover:bg-bvb-yellow transition-all" title="查看附件">
                                                        <Paperclip className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <span className="text-gray-200">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button onClick={() => onDeleteTransaction(t.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {transactions.length === 0 && (
                                    <tr><td colSpan={9} className="py-20 text-center text-gray-400 italic">暂无账务流水记录</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* --- Summary Analysis View --- */
                <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-gray-800 flex items-center"><BarChart3 className="w-5 h-5 mr-2 text-bvb-yellow" /> 俱乐部年度经营深度分析 ({selectedYear})</h3>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setSelectedYear(v => v - 1)} className="p-2 hover:bg-gray-100 rounded transition-colors"><ChevronLeft className="w-4 h-4"/></button>
                            <span className="font-black text-lg px-4">{selectedYear}</span>
                            <button onClick={() => setSelectedYear(v => v + 1)} className="p-2 hover:bg-gray-100 rounded transition-colors"><ChevronRight className="w-4 h-4"/></button>
                        </div>
                    </div>

                    {/* Chart Row 1: Monthly Trends */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                            <h4 className="font-bold text-gray-800 mb-6 text-sm uppercase flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400"/> 月度收支趋势对比</h4>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={monthlySummaryData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="month" axisLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                        <YAxis axisLine={false} tick={{ fontSize: 10 }} />
                                        <Tooltip cursor={{ fill: '#FDE10010' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                        <Legend iconType="circle" />
                                        <Bar dataKey="income" name="总收入" fill="#22C55E" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="expense" name="总支出" fill="#EF4444" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                            <h4 className="font-bold text-gray-800 mb-6 text-sm uppercase flex items-center gap-2"><TrendingUp className="w-4 h-4 text-gray-400"/> 月度净利润波动趋势</h4>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={monthlySummaryData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="month" axisLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                        <YAxis axisLine={false} tick={{ fontSize: 10 }} />
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                        <Line type="monotone" dataKey="profit" name="净利润" stroke="#FDE100" strokeWidth={4} dot={{ r: 4, fill: '#000', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Chart Row 2: Category Analysis */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col">
                            <h4 className="font-bold text-gray-800 mb-2 text-sm uppercase flex items-center gap-2"><PieChartIcon className="w-4 h-4 text-green-500"/> 项目收入分类占比</h4>
                            <p className="text-[10px] text-gray-400 mb-6 uppercase tracking-widest font-bold">年度收入结构分析</p>
                            <div className="h-64 flex-1">
                                {categoryAnalysis.incomeData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie 
                                                data={categoryAnalysis.incomeData} 
                                                cx="50%" cy="50%" 
                                                innerRadius={60} 
                                                outerRadius={80} 
                                                paddingAngle={5} 
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {categoryAnalysis.incomeData.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
                                            <Legend verticalAlign="bottom" align="center" iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400 italic text-sm">暂无收入数据</div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col">
                            <h4 className="font-bold text-gray-800 mb-2 text-sm uppercase flex items-center gap-2"><PieChartIcon className="w-4 h-4 text-red-500"/> 项目支出分类占比</h4>
                            <p className="text-[10px] text-gray-400 mb-6 uppercase tracking-widest font-bold">年度支出成本分析</p>
                            <div className="h-64 flex-1">
                                {categoryAnalysis.expenseData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie 
                                                data={categoryAnalysis.expenseData} 
                                                cx="50%" cy="50%" 
                                                innerRadius={60} 
                                                outerRadius={80} 
                                                paddingAngle={5} 
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {categoryAnalysis.expenseData.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
                                            <Legend verticalAlign="bottom" align="center" iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400 italic text-sm">暂无支出数据</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Table Row: Category Details */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                            <h4 className="font-black text-xs uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                <Target className="w-4 h-4" /> 项目分类明细汇总表 ({selectedYear})
                            </h4>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-white text-gray-400 font-bold border-b text-[10px] uppercase">
                                    <tr>
                                        <th className="px-6 py-4">科目分类</th>
                                        <th className="px-6 py-4">类型</th>
                                        <th className="px-6 py-4 text-right">年度汇总金额</th>
                                        <th className="px-6 py-4 text-right">占比</th>
                                        <th className="px-6 py-4 text-right">记录笔数</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {financeCategories.map(cat => {
                                        const total = transactions
                                            .filter(t => t.category === cat.id && new Date(t.date).getFullYear() === selectedYear)
                                            .reduce((sum, t) => sum + (cat.type === 'income' ? t.income : t.expense), 0);
                                        
                                        const count = transactions
                                            .filter(t => t.category === cat.id && new Date(t.date).getFullYear() === selectedYear)
                                            .length;

                                        const percentage = cat.type === 'income' 
                                            ? (currentStats.income > 0 ? (total / currentStats.income) * 100 : 0)
                                            : (currentStats.expense > 0 ? (total / currentStats.expense) * 100 : 0);

                                        if (total === 0) return null;

                                        return (
                                            <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-gray-800">{cat.label}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded ${cat.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {cat.type === 'income' ? '收入类' : '支出类'}
                                                    </span>
                                                </td>
                                                <td className={`px-6 py-4 text-right font-mono font-bold ${cat.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                                    ¥{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full ${cat.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`} 
                                                                style={{ width: `${percentage}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-gray-500">{percentage.toFixed(1)}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right text-gray-400 font-mono text-xs">{count} 笔</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-bvb-black text-white font-black">
                                    <tr>
                                        <td colSpan={2} className="px-6 py-4 uppercase tracking-wider">年度收支总计</td>
                                        <td className="px-6 py-4 text-right text-bvb-yellow">¥{currentStats.income.toLocaleString()} (收) / ¥{currentStats.expense.toLocaleString()} (支)</td>
                                        <td colSpan={2} className="px-6 py-4 text-right text-lg">利润: ¥{currentStats.profit.toLocaleString()}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Transactions Modal */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
                        <div className="bg-bvb-black p-6 flex justify-between items-center text-white shrink-0">
                            <h3 className="font-bold text-xl flex items-center"><FileSpreadsheet className="w-5 h-5 mr-2 text-bvb-yellow" /> 批量导入账务</h3>
                            <button onClick={() => setShowImportModal(false)}><X className="w-6 h-6" /></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 flex flex-col items-center text-center">
                                <FileDown className="w-12 h-12 text-gray-400 mb-4" />
                                <h4 className="font-bold text-gray-700 mb-2">第一步：下载模版</h4>
                                <p className="text-xs text-gray-500 mb-4">请使用我们提供的标准格式进行数据整理，确保列名及分类与系统一致。</p>
                                <button onClick={handleDownloadTemplate} className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors shadow-sm">
                                    <Download className="w-4 h-4 mr-2" /> 下载 CSV 模版
                                </button>
                            </div>
                            
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 flex flex-col items-center text-center relative group">
                                <Upload className="w-12 h-12 text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
                                <h4 className="font-bold text-blue-900 mb-2">第二步：上传数据</h4>
                                <p className="text-xs text-blue-600 mb-4">选择填写好的 CSV 文件，我们将自动解析收入与支出金额。</p>
                                <input 
                                    type="file" 
                                    accept=".csv" 
                                    onChange={handleImportCSV} 
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                />
                                <button className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-md pointer-events-none">
                                    点击选择文件
                                </button>
                            </div>

                            <p className="text-[10px] text-gray-400 text-center italic">
                                * 提示：导入后请在日记账流水中核对结余数据。
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Transaction Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
                        <div className="bg-bvb-black p-6 flex justify-between items-center text-white shrink-0">
                            <h3 className="font-bold text-xl flex items-center"><Calculator className="w-5 h-5 mr-2 text-bvb-yellow" /> 新增账务记录</h3>
                            <button onClick={() => setShowAddModal(false)}><X className="w-6 h-6" /></button>
                        </div>
                        
                        {/* Type Toggle Buttons */}
                        <div className="flex p-4 gap-2 bg-gray-50 border-b border-gray-100">
                            <button 
                                onClick={() => setActiveType('income')}
                                className={`flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center transition-all ${activeType === 'income' ? 'bg-green-600 text-white shadow-lg shadow-green-200 scale-[1.02]' : 'bg-white text-gray-400 border border-gray-200'}`}
                            >
                                <ArrowUpRight className="w-4 h-4 mr-2" /> 收入录入
                            </button>
                            <button 
                                onClick={() => setActiveType('expense')}
                                className={`flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center transition-all ${activeType === 'expense' ? 'bg-red-600 text-white shadow-lg shadow-red-200 scale-[1.02]' : 'bg-white text-gray-400 border border-gray-200'}`}
                            >
                                <ArrowDownRight className="w-4 h-4 mr-2" /> 支出录入
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-5">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">业务日期</label>
                                <input type="date" required className="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-bvb-yellow outline-none font-bold" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">项目分类</label>
                                    <select 
                                        className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-bvb-yellow outline-none font-bold ${activeType === 'income' ? 'bg-green-50/30' : 'bg-red-50/30'}`} 
                                        value={formData.category} 
                                        onChange={e => setFormData({...formData, category: e.target.value})}
                                    >
                                        <option value="" disabled>选择分类...</option>
                                        {financeCategories.filter(c => c.type === activeType).map(c => (
                                            <option key={c.id} value={c.id}>{c.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">金额 (¥)</label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        required 
                                        className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-bvb-yellow outline-none font-black text-lg ${activeType === 'income' ? 'bg-green-50/30 text-green-700' : 'bg-red-50/30 text-red-700'}`} 
                                        placeholder="0.00" 
                                        value={formData.amount} 
                                        onChange={e => setFormData({...formData, amount: e.target.value})} 
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">摘要备注</label>
                                <input required className="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-bvb-yellow outline-none font-bold" placeholder={activeType === 'income' ? "例如：2024秋季班学费" : "例如：主球场10月租金"} value={formData.details} onChange={e => setFormData({...formData, details: e.target.value})} />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">结算账户</label>
                                <input className="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-bvb-yellow outline-none font-bold" value={formData.account} onChange={e => setFormData({...formData, account: e.target.value})} />
                            </div>

                            {/* Attachment Section */}
                            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center">
                                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">凭证附件 (选填)</p>
                                {formData.attachment ? (
                                    <div className="relative group w-20 h-20 mb-2">
                                        <img src={formData.attachment} className="w-full h-full object-cover rounded-lg border border-gray-200" />
                                        <button 
                                            type="button" 
                                            onClick={() => setFormData(prev => ({...prev, attachment: ''}))} 
                                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        type="button" 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full py-4 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center hover:bg-gray-100 hover:border-bvb-yellow transition-all"
                                    >
                                        <ImageIcon className="w-6 h-6 text-gray-300 mb-1" />
                                        <span className="text-xs text-gray-400 font-bold">点击上传图片</span>
                                    </button>
                                )}
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                            </div>

                            <button 
                                type="submit" 
                                className={`w-full py-4 text-white font-black rounded-2xl hover:brightness-110 shadow-xl flex items-center justify-center transition-all active:scale-[0.98] mt-4 ${activeType === 'income' ? 'bg-green-600 shadow-green-100' : 'bg-red-600 shadow-red-100'}`}
                            >
                                <CheckCircle className="w-5 h-5 mr-2 text-white" /> 确认入账
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Image Preview Modal */}
            {previewImage && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setPreviewImage(null)}>
                    <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-xl shadow-2xl flex flex-col items-center bg-white p-2">
                        <img src={previewImage} className="max-w-full max-h-[80vh] object-contain rounded-lg" />
                        <div className="p-4 flex gap-4 w-full justify-between items-center bg-white border-t border-gray-100 mt-2">
                            <p className="text-xs text-gray-500 font-bold">附件凭证预览</p>
                            <button onClick={() => setPreviewImage(null)} className="flex items-center px-6 py-2 bg-bvb-black text-white rounded-lg text-sm font-bold shadow-md">
                                <X className="w-4 h-4 mr-2" /> 关闭
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinanceManager;
