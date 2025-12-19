
import React, { useState, useMemo } from 'react';
import { FinanceTransaction, FinanceCategory, User } from '../types';
import { Wallet, Plus, Trash2, Calendar, FileText, Download, TrendingUp, TrendingDown, PieChart as PieChartIcon, BarChart3, ChevronLeft, ChevronRight, Calculator, CheckCircle, X, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LineChart, Line, PieChart, Pie, Legend } from 'recharts';

interface FinanceManagerProps {
    transactions: FinanceTransaction[];
    currentUser: User | null;
    onAddTransaction: (t: FinanceTransaction) => void;
    onDeleteTransaction: (id: string) => void;
}

const FINANCE_CATEGORIES: { id: FinanceCategory; label: string; type: 'income' | 'expense' }[] = [
    { id: 'Tuition', label: '课时续费', type: 'income' },
    { id: 'PitchBooking', label: '球场包场', type: 'income' },
    { id: 'Competition', label: '参赛费/杂费', type: 'income' },
    { id: 'Salary', label: '工资支出', type: 'expense' },
    { id: 'Rent', label: '租金支出', type: 'expense' },
    { id: 'Admin', label: '行政/杂项', type: 'expense' },
    { id: 'Other', label: '其他', type: 'expense' },
];

const FinanceManager: React.FC<FinanceManagerProps> = ({ transactions, currentUser, onAddTransaction, onDeleteTransaction }) => {
    const [viewMode, setViewMode] = useState<'journal' | 'summary'>('journal');
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    
    // Form State
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        details: '',
        category: 'Tuition' as FinanceCategory,
        amount: '',
        account: '黔农云'
    });

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
        const income = transactions.reduce((sum, t) => sum + t.income, 0);
        const expense = transactions.reduce((sum, t) => sum + t.expense, 0);
        return { income, expense, profit: income - expense };
    }, [transactions]);

    const monthlySummaryData = useMemo(() => {
        const data = Array.from({ length: 12 }, (_, i) => ({
            month: `${i + 1}月`,
            income: 0,
            expense: 0,
            profit: 0,
            tuition: 0,
            pitch: 0,
            salary: 0,
            rent: 0
        }));

        transactions.forEach(t => {
            const date = new Date(t.date);
            if (date.getFullYear() === selectedYear) {
                const m = date.getMonth();
                data[m].income += t.income;
                data[m].expense += t.expense;
                data[m].profit = data[m].income - data[m].expense;
                
                if (t.category === 'Tuition') data[m].tuition += t.income;
                if (t.category === 'PitchBooking') data[m].pitch += t.income;
                if (t.category === 'Salary') data[m].salary += t.expense;
                if (t.category === 'Rent') data[m].rent += t.expense;
            }
        });

        return data;
    }, [transactions, selectedYear]);

    // Handle Form Submit
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const catObj = FINANCE_CATEGORIES.find(c => c.id === formData.category);
        const amountNum = parseFloat(formData.amount) || 0;
        
        const newTx: FinanceTransaction = {
            id: Date.now().toString(),
            date: formData.date,
            details: formData.details,
            category: formData.category,
            income: catObj?.type === 'income' ? amountNum : 0,
            expense: catObj?.type === 'expense' ? amountNum : 0,
            account: formData.account
        };

        onAddTransaction(newTx);
        setShowAddModal(false);
        setFormData({ ...formData, details: '', amount: '' });
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
                <div className="flex gap-2">
                    <div className="flex bg-white p-1 rounded-lg border border-gray-200">
                        <button onClick={() => setViewMode('journal')} className={`px-4 py-2 rounded-md text-xs font-black transition-all ${viewMode === 'journal' ? 'bg-bvb-black text-bvb-yellow' : 'text-gray-500'}`}>日记账流水</button>
                        <button onClick={() => setViewMode('summary')} className={`px-4 py-2 rounded-md text-xs font-black transition-all ${viewMode === 'summary' ? 'bg-bvb-black text-bvb-yellow' : 'text-gray-500'}`}>统计汇总表</button>
                    </div>
                    <button onClick={() => setShowAddModal(true)} className="flex items-center px-4 py-2 bg-bvb-yellow text-bvb-black font-bold rounded-lg shadow-md hover:brightness-105">
                        <Plus className="w-5 h-5 mr-2" /> 记一笔
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-green-500">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">年度总收入</p>
                            <h3 className="text-3xl font-black text-gray-800">¥{currentStats.income.toLocaleString()}</h3>
                        </div>
                        <div className="p-3 bg-green-50 rounded-xl text-green-600"><ArrowUpRight className="w-6 h-6" /></div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-red-500">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">年度总支出</p>
                            <h3 className="text-3xl font-black text-gray-800">¥{currentStats.expense.toLocaleString()}</h3>
                        </div>
                        <div className="p-3 bg-red-50 rounded-xl text-red-600"><ArrowDownRight className="w-6 h-6" /></div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-bvb-yellow">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">当前净利润</p>
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
                            <button className="text-xs flex items-center bg-white border border-gray-300 px-3 py-1 rounded-lg font-bold hover:bg-gray-50"><Download className="w-3 h-3 mr-1" /> 导出表格</button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 text-gray-600 font-black uppercase text-[10px] tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">日期</th>
                                    <th className="px-6 py-4">明细/摘要</th>
                                    <th className="px-6 py-4">分类</th>
                                    <th className="px-6 py-4 text-right">收入金额</th>
                                    <th className="px-6 py-4 text-right">支出金额</th>
                                    <th className="px-6 py-4 text-right">余额</th>
                                    <th className="px-6 py-4">账户</th>
                                    <th className="px-6 py-4 text-center">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {journalWithBalance.map((t) => (
                                    <tr key={t.id} className="hover:bg-yellow-50/30 transition-colors group">
                                        <td className="px-6 py-4 font-mono text-xs whitespace-nowrap">{t.date}</td>
                                        <td className="px-6 py-4 font-bold text-gray-800">{t.details}</td>
                                        <td className="px-6 py-4">
                                            <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded font-bold text-gray-500">
                                                {FINANCE_CATEGORIES.find(c => c.id === t.category)?.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-green-600">{t.income > 0 ? t.income.toFixed(2) : '-'}</td>
                                        <td className="px-6 py-4 text-right font-black text-red-500">{t.expense > 0 ? t.expense.toFixed(2) : '-'}</td>
                                        <td className="px-6 py-4 text-right font-mono font-black text-gray-700 bg-gray-50/30">{t.balance.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-gray-500 font-bold">{t.account}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button onClick={() => onDeleteTransaction(t.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {transactions.length === 0 && (
                                    <tr><td colSpan={8} className="py-20 text-center text-gray-400 italic">暂无账务流水记录</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* --- Monthly Summary View --- */
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-gray-800 flex items-center"><BarChart3 className="w-5 h-5 mr-2 text-bvb-yellow" /> 俱乐部经营数据汇总 ({selectedYear}年度)</h3>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setSelectedYear(v => v - 1)} className="p-2 hover:bg-gray-100 rounded"><ChevronLeft className="w-4 h-4"/></button>
                            <span className="font-black text-lg">{selectedYear}</span>
                            <button onClick={() => setSelectedYear(v => v + 1)} className="p-2 hover:bg-gray-100 rounded"><ChevronRight className="w-4 h-4"/></button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* 收支对比图表 */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-80">
                            <h4 className="font-bold text-gray-800 mb-4 text-sm uppercase">月度收支趋势对比</h4>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlySummaryData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="month" axisLine={false} tick={{ fontSize: 10 }} />
                                    <YAxis axisLine={false} tick={{ fontSize: 10 }} />
                                    <Tooltip cursor={{ fill: '#FDE10015' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                    <Bar dataKey="income" name="收入" fill="#FDE100" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="expense" name="支出" fill="#1F2937" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* 利润趋势图表 */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-80">
                            <h4 className="font-bold text-gray-800 mb-4 text-sm uppercase">月度经营净利润波动</h4>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={monthlySummaryData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="month" axisLine={false} tick={{ fontSize: 10 }} />
                                    <YAxis axisLine={false} tick={{ fontSize: 10 }} />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="profit" name="利润" stroke="#FDE100" strokeWidth={4} dot={{ r: 4, fill: '#000' }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 汇总统计表 */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                         <div className="p-4 bg-gray-50 border-b font-black text-xs uppercase tracking-widest text-gray-500">主营业务月度利润明细</div>
                         <div className="overflow-x-auto">
                             <table className="w-full text-sm text-left border-collapse">
                                 <thead className="bg-white text-gray-400 font-bold border-b">
                                     <tr>
                                         <th className="px-6 py-4">月份</th>
                                         <th className="px-6 py-4 text-right bg-yellow-50/30">课时收入</th>
                                         <th className="px-6 py-4 text-right bg-yellow-50/30">包场收入</th>
                                         <th className="px-6 py-4 text-right bg-red-50/30">工资支出</th>
                                         <th className="px-6 py-4 text-right bg-red-50/30">场地租金</th>
                                         <th className="px-6 py-4 text-right font-black text-gray-800">单月利润</th>
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y">
                                     {monthlySummaryData.filter(m => m.income > 0 || m.expense > 0).map((m, idx) => (
                                         <tr key={idx} className="hover:bg-gray-50">
                                             <td className="px-6 py-4 font-bold">{m.month}</td>
                                             <td className="px-6 py-4 text-right font-mono">¥{m.tuition.toFixed(2)}</td>
                                             <td className="px-6 py-4 text-right font-mono">¥{m.pitch.toFixed(2)}</td>
                                             <td className="px-6 py-4 text-right font-mono text-red-500">¥{m.salary.toFixed(2)}</td>
                                             <td className="px-6 py-4 text-right font-mono text-red-500">¥{m.rent.toFixed(2)}</td>
                                             <td className={`px-6 py-4 text-right font-black ${m.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                 ¥{m.profit.toFixed(2)}
                                             </td>
                                         </tr>
                                     ))}
                                     <tr className="bg-bvb-black text-white">
                                         <td className="px-6 py-4 font-black">年度合计</td>
                                         <td className="px-6 py-4 text-right font-mono text-bvb-yellow">¥{monthlySummaryData.reduce((s,m) => s + m.tuition, 0).toFixed(2)}</td>
                                         <td className="px-6 py-4 text-right font-mono text-bvb-yellow">¥{monthlySummaryData.reduce((s,m) => s + m.pitch, 0).toFixed(2)}</td>
                                         <td className="px-6 py-4 text-right font-mono">¥{monthlySummaryData.reduce((s,m) => s + m.salary, 0).toFixed(2)}</td>
                                         <td className="px-6 py-4 text-right font-mono">¥{monthlySummaryData.reduce((s,m) => s + m.rent, 0).toFixed(2)}</td>
                                         <td className="px-6 py-4 text-right font-black text-bvb-yellow text-lg">¥{monthlySummaryData.reduce((s,m) => s + m.profit, 0).toFixed(2)}</td>
                                     </tr>
                                 </tbody>
                             </table>
                         </div>
                    </div>
                </div>
            )}

            {/* Add Transaction Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
                        <div className="bg-bvb-black p-6 flex justify-between items-center text-white">
                            <h3 className="font-bold text-xl flex items-center"><Calculator className="w-5 h-5 mr-2 text-bvb-yellow" /> 新增账务记录</h3>
                            <button onClick={() => setShowAddModal(false)}><X className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-5">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">业务日期</label>
                                <input type="date" required className="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-bvb-yellow outline-none font-bold" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">明细摘要</label>
                                <input required className="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-bvb-yellow outline-none font-bold" placeholder="例如：李小明续费 20 课时" value={formData.details} onChange={e => setFormData({...formData, details: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">项目分类</label>
                                    <select className="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-bvb-yellow outline-none font-bold" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})}>
                                        {FINANCE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">金额 (¥)</label>
                                    <input type="number" step="0.01" required className="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-bvb-yellow outline-none font-black text-lg" placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">结算账户</label>
                                <input className="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-bvb-yellow outline-none font-bold" value={formData.account} onChange={e => setFormData({...formData, account: e.target.value})} />
                            </div>
                            <button type="submit" className="w-full py-4 bg-bvb-black text-white font-black rounded-2xl hover:brightness-110 shadow-xl shadow-gray-200 flex items-center justify-center transition-all active:scale-[0.98]">
                                <CheckCircle className="w-5 h-5 mr-2 text-bvb-yellow" /> 确认入账
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinanceManager;
