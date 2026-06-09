
import React, { useState, useMemo, useRef } from 'react';
import { FinanceTransaction, FinanceCategoryDefinition, User, TrainingSession, Player, SalarySettings, Team, MonthlySalaryRecord, AccountingRecord, PeriodizationPlan } from '../types';
import { Wallet, Plus, Trash2, FileText, Download, Calculator, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, FileSpreadsheet, Upload, FileDown, CheckSquare, RefreshCw, Star, X, BarChart3, Save, Banknote, UserCheck, PieChart as PieChartIcon, AlignLeft, ArrowUpDown, ArrowUp, ArrowDown, Briefcase, Clock, CheckCircle2, ShieldCheck, AlertCircle, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell, PieChart, Pie } from 'recharts';

interface FinanceManagerProps {
    transactions: FinanceTransaction[];
    financeCategories: FinanceCategoryDefinition[];
    currentUser: User | null;
    onAddTransaction: (t: FinanceTransaction) => void;
    onBulkAddTransactions: (t: FinanceTransaction[]) => void;
    onDeleteTransaction: (id: string) => void;
    onBulkDeleteTransactions: (ids: string[]) => void;
    users: User[];
    players: Player[];
    teams: Team[];
    trainings: TrainingSession[];
    salarySettings: SalarySettings;
    onUpdateUser: (user: User) => void;
    accountingRecords: AccountingRecord[];
    onAddAccountingRecord: (r: AccountingRecord) => void;
    onUpdateAccountingRecord: (r: AccountingRecord) => void;
    onDeleteAccountingRecord: (id: string) => void;
    periodizationPlans?: PeriodizationPlan[];
}

const parseDateInfo = (dateStr: string) => {
    if (!dateStr) return { year: 0, month: -1 };
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
        return { year: d.getFullYear(), month: d.getMonth() };
    }
    const yMatch = dateStr.match(/(\d{4})/);
    const mMatch = dateStr.match(/(?:-|年|\/)(\d{1,2})(?:-|月|\/)?/);
    return {
        year: yMatch ? parseInt(yMatch[1]) : 0,
        month: mMatch ? parseInt(mMatch[1]) - 1 : -1
    };
};

const getDaysBetween = (dateStr1: string, dateStr2: string): number => {
    if (!dateStr1 || !dateStr2) return 0;
    const d1 = new Date(dateStr1);
    const d2 = new Date(dateStr2);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    const diffTime = d2.getTime() - d1.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

const FinanceManager: React.FC<FinanceManagerProps> = ({ 
    transactions, financeCategories, onAddTransaction, onBulkAddTransactions, onDeleteTransaction, onBulkDeleteTransactions,
    users, players, teams, trainings, salarySettings, onUpdateUser,
    accountingRecords, onAddAccountingRecord, onUpdateAccountingRecord, onDeleteAccountingRecord,
    periodizationPlans = []
}) => {
    const [viewMode, setViewMode] = useState<'journal' | 'summary' | 'salary' | 'accounting'>('summary');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showAccountingModal, setShowAccountingModal] = useState(false);
    const [editingAccountingRecord, setEditingAccountingRecord] = useState<AccountingRecord | null>(null);
    const [selectedYear, setSelectedYear] = useState<number | 'all'>(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [journalSortField, setJournalSortField] = useState<'date' | 'income' | 'expense' | 'category'>('date');
    const [journalSortOrder, setJournalSortOrder] = useState<'asc' | 'desc'>('desc');
    const [filterCoachId, setFilterCoachId] = useState<string>('all');
    const [editPayroll, setEditPayroll] = useState<Record<string, Partial<MonthlySalaryRecord>>>({});
    const [overriddenTeamSizes, setOverriddenTeamSizes] = useState<Record<string, number>>({});
    const [importSummary, setImportSummary] = useState<{ count: number, income: number, expense: number, tempTxs: FinanceTransaction[] } | null>(null);
    const [activeType, setActiveType] = useState<'income' | 'expense'>('income');
    const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0], details: '', category: '', amount: '', account: '黔农云', attachment: '' as string });
    const [accountingFormData, setAccountingFormData] = useState<Partial<AccountingRecord>>({ type: 'receivable', date: new Date().toISOString().split('T')[0], entity: '', details: '', amount: 0, status: 'pending', category: '' });
    const [filters, setFilters] = useState({
        date: '',
        category: '',
        details: '',
        account: '',
        income: '',
        expense: '',
        balance: ''
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const defaultAssessmentRules = {
        assistantSupervision: {
            enabled: true,
            assessCoaches: true,
            assessAssistants: true,
            amount: 10,
            timing: '每场训练课后 (每日累积督考)',
            content: '检查考核教练/助教的着装规范(缺项扣10元)、必备口哨、消音/秒表，以及器材清理规范完成情况(未清每次扣10元)。'
        },
        directorLogAudit: {
            enabled: true,
            assessCoaches: true,
            assessAssistants: false,
            amount: 10,
            timing: '每日训练课后 (月度累积计算)',
            content: '训练日志应在下课当天完成提交。逾期1天扣除10元，逾期2天及以上扣罚20元。'
        },
        periodizationPlan: {
            enabled: true,
            assessCoaches: true,
            assessAssistants: false,
            amount: 20, // 20%
            timing: '季度末月 (Q1-Q4季末终审评定)',
            content: '每季度底需及时更新录入所带梯队的周期计划与目标大纲，若季度考核评定为“未录入”将扣除基础底薪的20%。'
        },
        playerReview: {
            enabled: true,
            assessCoaches: true,
            assessAssistants: false,
            amount: 5,
            timing: '每季度次月10日 24:00 截止',
            content: '要求在次月10日前录入并提交学员上季度的全部成长评估，每漏录入1人扣罚5元。'
        },
        quarterlyAttendance: {
            enabled: true,
            assessCoaches: true,
            assessAssistants: true,
            amount: 200,
            timing: '每季度末 (总监终评)',
            content: '配合青训总监对教练员进行季度考核执勤，评定为优秀全勤者给予单次追加奖励200元。'
        },
        monthlyExecution: {
            enabled: true,
            assessCoaches: true,
            assessAssistants: true,
            amount: 200,
            timing: '每月核算周期',
            content: '对无严重违纪或前4项考核累计扣罚≤0元的发放优秀奖(¥200)；累计扣罚在 ¥20(含)以内的发放良好奖(¥100)；超过 ¥20 则不予以正向奖励。'
        }
    };

    const rules = {
        ...defaultAssessmentRules,
        ...(salarySettings?.assessmentRules || {})
    };

    const handleTypeChange = (type: 'income' | 'expense') => {
        setActiveType(type);
        const categoriesForType = financeCategories.filter(c => c.type === type);
        if (categoriesForType.length > 0) {
            setFormData(prev => ({ ...prev, category: categoriesForType[0].id }));
        }
    };

    const journalWithBalance = useMemo(() => {
        const baseSorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        const recordsWithBalance: any[] = [];
        let runningBalance = 0;
        baseSorted.forEach(t => {
            runningBalance += (Number(t.income) || 0) - (Number(t.expense) || 0);
            recordsWithBalance.push({ ...t, balance: runningBalance });
        });

        const filtered = recordsWithBalance.filter(t => {
            const catLabel = financeCategories.find(c => c.id === t.category)?.label || '';
            return (
                t.date.includes(filters.date) &&
                catLabel.includes(filters.category) &&
                t.details.toLowerCase().includes(filters.details.toLowerCase()) &&
                t.account.toLowerCase().includes(filters.account.toLowerCase()) &&
                (filters.income === '' || String(t.income).includes(filters.income)) &&
                (filters.expense === '' || String(t.expense).includes(filters.expense)) &&
                (filters.balance === '' || String(t.balance.toFixed(2)).includes(filters.balance))
            );
        });

        return filtered.sort((a, b) => {
            let valA: any = a[journalSortField];
            let valB: any = b[journalSortField];
            if (journalSortField === 'date') { valA = new Date(valA).getTime(); valB = new Date(valB).getTime(); }
            else if (journalSortField === 'income' || journalSortField === 'expense') { valA = Number(valA) || 0; valB = Number(valB) || 0; }
            else if (journalSortField === 'category') { valA = financeCategories.find(c => c.id === valA)?.label || ''; valB = financeCategories.find(c => c.id === valB)?.label || ''; }
            if (valA < valB) return journalSortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return journalSortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }, [transactions, journalSortField, journalSortOrder, financeCategories, filters]);

    const toggleSort = (field: 'date' | 'income' | 'expense' | 'category') => {
        if (journalSortField === field) setJournalSortOrder(journalSortOrder === 'asc' ? 'desc' : 'asc');
        else { setJournalSortField(field); setJournalSortOrder('desc'); }
    };

    const annualStats = useMemo(() => {
        const yearTransactions = selectedYear === 'all' 
            ? transactions 
            : transactions.filter(t => parseDateInfo(t.date).year === selectedYear);
        const income = yearTransactions.reduce((sum, t) => sum + (Number(t.income) || 0), 0);
        const expense = yearTransactions.reduce((sum, t) => sum + (Number(t.expense) || 0), 0);
        return { income, expense, profit: income - expense };
    }, [transactions, selectedYear]);

    const totalStats = useMemo(() => {
        const income = transactions.reduce((sum, t) => sum + (Number(t.income) || 0), 0);
        const expense = transactions.reduce((sum, t) => sum + (Number(t.expense) || 0), 0);
        return { income, expense, balance: income - expense };
    }, [transactions]);

    const monthlySummaryData = useMemo(() => {
        if (selectedYear === 'all') {
            // Group by year if "All Time" is selected
            const yearMap: Record<string, { year: string, income: number, expense: number, profit: number }> = {};
            transactions.forEach(t => {
                const { year } = parseDateInfo(t.date);
                if (year > 0) {
                    if (!yearMap[year]) yearMap[year] = { year: `${year}年`, income: 0, expense: 0, profit: 0 };
                    yearMap[year].income += (Number(t.income) || 0);
                    yearMap[year].expense += (Number(t.expense) || 0);
                    yearMap[year].profit = yearMap[year].income - yearMap[year].expense;
                }
            });
            return Object.values(yearMap).sort((a, b) => a.year.localeCompare(b.year));
        }

        const data = Array.from({ length: 12 }, (_, i) => ({ month: `${i + 1}月`, income: 0, expense: 0, profit: 0 }));
        transactions.forEach(t => {
            const { year, month } = parseDateInfo(t.date);
            if (year === selectedYear && month >= 0 && month < 12) {
                data[month].income += (Number(t.income) || 0);
                data[month].expense += (Number(t.expense) || 0);
                data[month].profit = data[month].income - data[month].expense;
            }
        });
        return data;
    }, [transactions, selectedYear]);

    const annualCategoryAnalysis = useMemo(() => {
        const incomeMap: Record<string, number> = {};
        const expenseMap: Record<string, number> = {};
        transactions.forEach(t => {
            const { year } = parseDateInfo(t.date);
            if (selectedYear === 'all' || year === selectedYear) {
                const cat = financeCategories.find(c => c.id === t.category);
                if (cat) {
                    if (cat.type === 'income') incomeMap[cat.label] = (incomeMap[cat.label] || 0) + (Number(t.income) || 0);
                    else expenseMap[cat.label] = (expenseMap[cat.label] || 0) + (Number(t.expense) || 0);
                }
            }
        });
        return {
            incomeData: Object.keys(incomeMap).map(label => ({ name: label, value: incomeMap[label], percent: annualStats.income > 0 ? (incomeMap[label] / annualStats.income * 100).toFixed(1) : '0' })).sort((a,b) => b.value - a.value),
            expenseData: Object.keys(expenseMap).map(label => ({ name: label, value: expenseMap[label], percent: annualStats.expense > 0 ? (expenseMap[label] / annualStats.expense * 100).toFixed(1) : '0' })).sort((a,b) => b.value - a.value)
        };
    }, [transactions, selectedYear, financeCategories, annualStats]);

    const monthlyAnalysis = useMemo(() => {
        const monthTransactions = transactions.filter(t => { 
            const info = parseDateInfo(t.date); 
            return (selectedYear === 'all' || info.year === selectedYear) && info.month === selectedMonth; 
        });
        const income = monthTransactions.reduce((sum, t) => sum + (Number(t.income) || 0), 0);
        const expense = monthTransactions.reduce((sum, t) => sum + (Number(t.expense) || 0), 0);
        const incomeMap: Record<string, number> = {};
        const expenseMap: Record<string, number> = {};
        monthTransactions.forEach(t => {
            const cat = financeCategories.find(c => c.id === t.category);
            if (cat) {
                if (cat.type === 'income') incomeMap[cat.label] = (incomeMap[cat.label] || 0) + (Number(t.income) || 0);
                else expenseMap[cat.label] = (expenseMap[cat.label] || 0) + (Number(t.expense) || 0);
            }
        });
        const rechargeCategory = financeCategories.find(c => c.label.includes('续费') || c.label.includes('充值') || c.label.includes('学费'));
        const rechargeTransactions = monthTransactions.filter(t => t.category === rechargeCategory?.id);
        const threshold = salarySettings.quarterlyRenewalReward.minRechargeAmount || 0;
        const validRechargeCount = rechargeTransactions.filter(t => {
            return (Number(t.income) || 0) >= threshold; 
        }).length;

        return {
            income, expense, profit: income - expense,
            rechargeCount: validRechargeCount,
            totalRecharges: rechargeTransactions.length,
            incomeData: Object.keys(incomeMap).map(label => ({ name: label, value: incomeMap[label], percent: income > 0 ? (incomeMap[label] / income * 100).toFixed(1) : '0' })).sort((a,b) => b.value - a.value),
            expenseData: Object.keys(expenseMap).map(label => ({ name: label, value: expenseMap[label], percent: expense > 0 ? (expenseMap[label] / expense * 100).toFixed(1) : '0' })).sort((a,b) => b.value - a.value)
        };
    }, [transactions, selectedYear, selectedMonth, financeCategories, salarySettings.quarterlyRenewalReward.minRechargeAmount]);

    const coachSalaries = useMemo(() => {
        const staff = users.filter(u => (u.role === 'coach' || u.role === 'assistant_coach') && (filterCoachId === 'all' || u.id === filterCoachId));
        const isDistributionMonth = [2, 5, 8, 11].includes(selectedMonth);
        const effectiveYear = selectedYear === 'all' ? new Date().getFullYear() : selectedYear;
        const quarterIndex = Math.floor(selectedMonth / 3);
        const quarterKey = `Q${quarterIndex + 1}`;

        return staff.map(coach => {
            const savedRecord = coach.monthlySalaryRecords?.find(r => r.year === selectedYear && r.month === selectedMonth);
            const levelConfig = salarySettings.levels.find(l => l.level === coach.level) || salarySettings.levels[0];
            const coachTeams = coach.teamIds || [];
            const isAssistant = coach.role === 'assistant_coach';
            const isPerformanceEnabled = isAssistant ? salarySettings.enableAssistantPerformanceReward : salarySettings.enableCoachPerformanceReward;
            
            const isAttendanceEnabled = isPerformanceEnabled && (isAssistant 
                ? (salarySettings.performanceBonusConfig?.attendance?.assistant ?? true)
                : (salarySettings.performanceBonusConfig?.attendance?.coach ?? true));
            
            const isRenewalEnabled = isPerformanceEnabled && (isAssistant 
                ? (salarySettings.performanceBonusConfig?.renewal?.assistant ?? true)
                : (salarySettings.performanceBonusConfig?.renewal?.coach ?? true));
            

            let calcSessionFees = 0;
            let calcAttendanceReward = 0;
            let calcRenewalReward = 0;
            
            const teamBreakdown = coachTeams.map(teamId => {
                const teamPlayers = players.filter(p => p.teamId === teamId);
                const overrideKey = `${selectedYear}-${selectedMonth}-${coach.id}-${teamId}`;
                const teamSize = overriddenTeamSizes[overrideKey] !== undefined 
                    ? overriddenTeamSizes[overrideKey] 
                    : (savedRecord?.overriddenTeamSizes?.[teamId] !== undefined ? savedRecord.overriddenTeamSizes[teamId] : teamPlayers.length);
                
                let singleSessionFee = 0;
                let sessionFeeFormula = "";

                const monthlySessions = trainings.filter(t => {
                    const { year, month } = parseDateInfo(t.date);
                    const isTeamSession = t.teamId === teamId && year === selectedYear && month === selectedMonth;
                    if (isAssistant) {
                        return isTeamSession && (t.assistantCheckInIds?.includes(coach.id));
                    }
                    return isTeamSession;
                });

                if (isAssistant) {
                    // 助教新规则: 基础 + 超额 (与主教练一致)
                    const extraPlayers = Math.max(0, teamSize - salarySettings.assistantCoachMinPlayersForCalculation);
                    singleSessionFee = salarySettings.assistantCoachSessionBaseFee + (extraPlayers * salarySettings.assistantCoachIncrementalPlayerFee);
                } else {
                    // 主教练规则: 基础 + 超额
                    if (coach.level === 'Apprentice') {
                        singleSessionFee = coach.isTrial ? 50 : levelConfig.sessionBaseFee;
                    } else {
                        const extraPlayers = Math.max(0, teamSize - salarySettings.minPlayersForCalculation);
                        singleSessionFee = levelConfig.sessionBaseFee + (extraPlayers * salarySettings.incrementalPlayerFee);
                    }
                }

                const countImplemented = monthlySessions.filter(s => (s.lessonPlanAssessment || 'implemented') === 'implemented').length;
                const countNotAdjusted = monthlySessions.filter(s => s.lessonPlanAssessment === 'not_adjusted').length;
                const countNoPlan = monthlySessions.filter(s => s.lessonPlanAssessment === 'no_plan').length;

                let monthlySessionFeeTotal = 0;
                monthlySessions.forEach(s => {
                    const assessment = s.lessonPlanAssessment || 'implemented';
                    let ratio = 1.0;
                    if (assessment === 'not_adjusted') ratio = 0.7;
                    else if (assessment === 'no_plan') ratio = 0.5;
                    monthlySessionFeeTotal += singleSessionFee * ratio;
                });

                if (isAssistant) {
                    const ratioText = countNotAdjusted > 0 || countNoPlan > 0
                        ? ` [考核兑付: 100%兑付×${countImplemented}课, 70%兑付×${countNotAdjusted}课, 50%兑付×${countNoPlan}课]`
                        : ` [100%兑付×${monthlySessions.length}课]`;
                    sessionFeeFormula = `(¥${salarySettings.assistantCoachSessionBaseFee} + (${teamSize}人 - ${salarySettings.assistantCoachMinPlayersForCalculation}基准) * ¥${salarySettings.assistantCoachIncrementalPlayerFee}) * 课时 = ¥${monthlySessionFeeTotal}${ratioText}`;
                } else {
                    const ratioText = countNotAdjusted > 0 || countNoPlan > 0
                        ? ` [考核兑付: 100%兑付×${countImplemented}课, 70%兑付×${countNotAdjusted}课, 50%兑付×${countNoPlan}课]`
                        : ` [100%兑付×${monthlySessions.length}课]`;
                    if (coach.level === 'Apprentice') {
                        if (coach.isTrial) {
                            sessionFeeFormula = `(见习试岗价 ¥50/课时，不享受人数递增) * 课时 = ¥${monthlySessionFeeTotal}${ratioText}`;
                        } else {
                            sessionFeeFormula = `(见习正式价 ¥${levelConfig.sessionBaseFee}/课时，不享受人数递增) * 课时 = ¥${monthlySessionFeeTotal}${ratioText}`;
                        }
                    } else {
                        sessionFeeFormula = `(¥${levelConfig.sessionBaseFee} + (${teamSize}人 - ${salarySettings.minPlayersForCalculation}基准) * ¥${salarySettings.incrementalPlayerFee}) * 课时 = ¥${monthlySessionFeeTotal}${ratioText}`;
                    }
                }

                let monthlyAttendanceRate = 0;
                let attendanceReward = 0;
                let attendanceFormula = "";
                if (monthlySessions.length > 0) {
                    const totalPossible = monthlySessions.length * teamSize;
                    const totalPresent = monthlySessions.reduce((sum, s) => sum + (s.attendance?.filter(r => r.status === 'Present').length || 0), 0);
                    monthlyAttendanceRate = totalPossible > 0 ? (totalPresent / totalPossible) * 100 : 0;
                    
                    const rewardConfig = salarySettings.monthlyAttendanceRewards
                        .sort((a,b) => b.threshold - a.threshold)
                        .find(r => monthlyAttendanceRate >= r.threshold);
                    
                    attendanceReward = isAttendanceEnabled ? (rewardConfig?.amount || 0) : 0;
                    attendanceFormula = isAttendanceEnabled 
                        ? `${totalPresent}实到 / ${totalPossible}应到 = ${monthlyAttendanceRate.toFixed(1)}% (阈值≥${rewardConfig?.threshold || '-'}% 奖¥${attendanceReward})`
                        : "该项绩效未开启";
                }

                let renewalReward = 0;
                let renewalRate = 0;
                let renewalFormula = "非季末月份";
                if (isDistributionMonth) {
                    const quarterMonths = [Math.floor(selectedMonth / 3) * 3, Math.floor(selectedMonth / 3) * 3 + 1, Math.floor(selectedMonth / 3) * 3 + 2];
                    const renewedCount = teamPlayers.filter(p => 
                        p.rechargeHistory?.some(r => {
                            const { year, month } = parseDateInfo(r.date);
                            return year === effectiveYear && quarterMonths.includes(month) && r.amount >= (salarySettings.quarterlyRenewalReward.minRechargeAmount || 0);
                        })
                    ).length;
                    
                    const expiredCount = teamPlayers.filter(p => {
                        if (!p.validUntil) return false;
                        const { year, month } = parseDateInfo(p.validUntil);
                        const hasRenewed = p.rechargeHistory?.some(r => {
                            const { year: rYear, month: rMonth } = parseDateInfo(r.date);
                            return rYear === effectiveYear && quarterMonths.includes(rMonth) && r.amount >= (salarySettings.quarterlyRenewalReward.minRechargeAmount || 0);
                        });
                        return !hasRenewed && year === effectiveYear && quarterMonths.includes(month);
                    }).length;

                    const dueForRenewalCount = renewedCount + expiredCount;
                    if (coach.level === 'Apprentice') {
                        renewalRate = 0;
                        renewalReward = 0;
                        renewalFormula = "见习教练不享受季度续费率奖励";
                    } else {
                        renewalRate = dueForRenewalCount > 0 ? (renewedCount / dueForRenewalCount) * 100 : (teamSize > 0 ? 100 : 0);
                        renewalReward = isRenewalEnabled ? (renewalRate >= salarySettings.quarterlyRenewalReward.threshold ? (renewedCount * salarySettings.quarterlyRenewalReward.amount) : 0) : 0;
                        renewalFormula = isRenewalEnabled 
                            ? `${renewedCount}实续(单次≥${salarySettings.quarterlyRenewalReward.minRechargeAmount}节) / ${dueForRenewalCount}到期 = ${renewalRate.toFixed(1)}% (阈值≥${salarySettings.quarterlyRenewalReward.threshold}% 奖 ¥${salarySettings.quarterlyRenewalReward.amount}/人 × ${renewedCount}人 = ¥${renewalReward})`
                            : "该项绩效未开启";
                    }
                }

                return { 
                    teamId, 
                    teamName: teams.find(t => t.id === teamId)?.name || '未知',
                    teamSize, 
                    sessionCount: monthlySessions.length, 
                    singleSessionFee,
                    monthlySessionFee: monthlySessionFeeTotal, 
                    monthlyAttendanceRate, 
                    attendanceReward, 
                    attendanceFormula,
                    renewalRate, 
                    renewalReward,
                    renewalFormula,
                    sessionFeeFormula
                };
            });

            calcSessionFees = teamBreakdown.reduce((sum, b) => sum + b.monthlySessionFee, 0);
            calcAttendanceReward = 0; // 季度全勤奖由总监季评，默认0，选择全勤则奖励配置金额
            calcRenewalReward = teamBreakdown.reduce((sum, b) => sum + b.renewalReward, 0);

            // 合并默认考核/奖励项目规则配置，以便向后兼容
            const defaultAssessmentRules = {
                assistantSupervision: {
                    enabled: true,
                    assessCoaches: true,
                    assessAssistants: true,
                    amount: 10,
                    timing: '每场训练课后 (每日累积督考)',
                    content: '检查考核教练/助教的着装规范(缺项扣10元)、必备口哨、消音/秒表，以及器材清理规范完成情况(未清每次扣10元)。'
                },
                directorLogAudit: {
                    enabled: true,
                    assessCoaches: true,
                    assessAssistants: false,
                    amount: 10,
                    timing: '每日训练课后 (月度累积计算)',
                    content: '训练日志应在下课当天完成提交。逾期1天扣除10元，逾期2天及以上扣罚20元。'
                },
                periodizationPlan: {
                    enabled: true,
                    assessCoaches: true,
                    assessAssistants: false,
                    amount: 20, // 20%
                    timing: '季度末月 (Q1-Q4季末终审评定)',
                    content: '每季度底需及时更新录入所带梯队的周期计划与目标大纲，若季度考核评定为“未录入”将扣除基础底薪的20%。'
                },
                playerReview: {
                    enabled: true,
                    assessCoaches: true,
                    assessAssistants: false,
                    amount: 5,
                    timing: '每季度次月10日 24:00 截止',
                    content: '要求在次月10日前录入并提交学员上季度的全部成长评估，每漏录入1人扣罚5元。'
                },
                quarterlyAttendance: {
                    enabled: true,
                    assessCoaches: true,
                    assessAssistants: true,
                    amount: 200,
                    timing: '每季度末 (总监终评)',
                    content: '配合青训总监对教练员进行季度考核执勤，评定为优秀全勤者给予单次追加奖励200元。'
                },
                monthlyExecution: {
                    enabled: true,
                    assessCoaches: true,
                    assessAssistants: true,
                    amount: 200,
                    timing: '每月核算周期',
                    content: '对无严重违纪或前4项考核累计扣罚≤0元的发放优秀奖(¥200)；累计扣罚在 ¥20(含)以内的发放良好奖(¥100)；超过 ¥20 则不予以正向奖励。'
                }
            };

            const rules = {
                ...defaultAssessmentRules,
                ...(salarySettings.assessmentRules || {})
            };

            let totalSupervisorDeductions = 0;
            let supervisorDeductionSessionsCount = 0;
            let totalLogAuditDeductions = 0;
            let logAuditSessionsCount = 0;

            const isAssSupervisorApplies = rules.assistantSupervision.enabled && 
                (isAssistant ? rules.assistantSupervision.assessAssistants : rules.assistantSupervision.assessCoaches);
            const isLogAuditApplies = rules.directorLogAudit.enabled && 
                (isAssistant ? rules.directorLogAudit.assessAssistants : rules.directorLogAudit.assessCoaches);

            const coachSessionsInMonth = trainings.filter(t => {
                const { year: sYear, month: sMonth } = parseDateInfo(t.date);
                return coachTeams.includes(t.teamId) && sYear === selectedYear && sMonth === selectedMonth;
            });
            const todayStr = new Date().toISOString().split('T')[0];

            coachSessionsInMonth.forEach(s => {
                // 1. 助教监督考评 (Assistant supervision assessment)
                if (isAssSupervisorApplies && s.assistantSupervision?.evaluated) {
                    let currentDec = 0;
                    const unitFine = rules.assistantSupervision.amount;
                    if (!s.assistantSupervision.hasWatch) currentDec += unitFine;
                    if (!s.assistantSupervision.hasWhistle) currentDec += unitFine;
                    if (!s.assistantSupervision.hasUniform) currentDec += unitFine;
                    if (!s.assistantSupervision.equipmentCleared) currentDec += unitFine;
                    
                    if (currentDec > 0) {
                        totalSupervisorDeductions += currentDec;
                        supervisorDeductionSessionsCount += 1;
                    }
                }

                // 2. 青训总监监督考评 (Director training log recording assessment)
                if (isLogAuditApplies) {
                    const unitFine = rules.directorLogAudit.amount;
                    const isSubmitted = s.submissionStatus === 'Submitted' || s.submissionStatus === 'Reviewed';
                    if (isSubmitted) {
                        if (s.logSubmittedAt && s.logSubmittedAt > s.date) {
                            const daysDiff = getDaysBetween(s.date, s.logSubmittedAt);
                            if (daysDiff >= 2) {
                                totalLogAuditDeductions += unitFine * 2;
                                logAuditSessionsCount += 1;
                            } else if (daysDiff >= 1) {
                                totalLogAuditDeductions += unitFine;
                                logAuditSessionsCount += 1;
                            }
                        }
                    } else {
                        if (todayStr > s.date) {
                            const daysDiff = getDaysBetween(s.date, todayStr);
                            if (daysDiff >= 2) {
                                totalLogAuditDeductions += unitFine * 2;
                                logAuditSessionsCount += 1;
                            } else if (daysDiff >= 1) {
                                totalLogAuditDeductions += unitFine;
                                logAuditSessionsCount += 1;
                            }
                        }
                    }
                }
            });

            const evaluation = coach.monthlyEvaluations?.find(e => e.year === selectedYear && e.month === selectedMonth);
            
            // 取消对训练、关注、协同的主观评价绩效奖励组块，置为0
            const calcPerformanceReward = 0;
            const performanceFormula = "主观评价绩效奖励已取消";

            const currentEdit = editPayroll[coach.id] || {};
            const baseSalaryDefault = isAssistant 
                ? salarySettings.assistantCoachBaseSalary 
                : (coach.level === 'Apprentice' && coach.isTrial ? 0 : levelConfig.baseSalary);

            // 3. 季度周期计划目标考核录入 (periodizationPlan)
            let periodizationDeduction = 0;
            let periodizationDetailsString = "";
            const isPeriodizationApplies = rules.periodizationPlan.enabled && 
                (isAssistant ? rules.periodizationPlan.assessAssistants : rules.periodizationPlan.assessCoaches);
            
            if (isPeriodizationApplies && isDistributionMonth && coachTeams.length > 0) {
                const teamsWithNoPlan = coachTeams.filter(teamId => {
                    const plan = periodizationPlans?.find(p => p.teamId === teamId && p.year === effectiveYear);
                    return plan?.quarterAssessments?.[quarterKey] === 'not_entered';
                });
                if (teamsWithNoPlan.length > 0) {
                    const teamNames = teamsWithNoPlan.map(tid => teams.find(t => t.id === tid)?.name || '未知梯队').join('、');
                    const deductionRatio = rules.periodizationPlan.amount / 100;
                    periodizationDeduction = baseSalaryDefault * deductionRatio;
                    periodizationDetailsString = `因负责的梯队 [${teamNames}] 在季度周期计划目标考核中被评定为“未录入”，根据业务规则扣除底薪的 ${rules.periodizationPlan.amount}% (${selectedMonth + 1}月季末执行)`;
                }
            }

            // 4. 季度球员跟踪录入考核 (playerReview)
            let playerReviewDeduction = 0;
            let playerReviewAuditDetails = "";
            let unreviewedCountForCoach = 0;
            let totalCoachPlayersOfCoach = 0;

            const isReviewAssessmentMonth = [0, 3, 6, 9].includes(selectedMonth);
            const isPlayerReviewApplies = rules.playerReview.enabled && 
                (isAssistant ? rules.playerReview.assessAssistants : rules.playerReview.assessCoaches);

            if (isPlayerReviewApplies && isReviewAssessmentMonth && coachTeams.length > 0) {
                const targetYearToCheck = typeof selectedYear === 'string' ? new Date().getFullYear() : (selectedYear || new Date().getFullYear());
                const checkYear = selectedMonth === 0 ? (targetYearToCheck - 1) : targetYearToCheck;
                let checkQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
                if (selectedMonth === 0) checkQuarter = 'Q4';
                else if (selectedMonth === 3) checkQuarter = 'Q1';
                else if (selectedMonth === 6) checkQuarter = 'Q2';
                else checkQuarter = 'Q3';

                const coachPlayers = players.filter(p => coachTeams.includes(p.teamId));
                totalCoachPlayersOfCoach = coachPlayers.length;

                const unreviewedPlayers = coachPlayers.filter(p => {
                    return !p.reviews?.some(r => r.year === checkYear && r.quarter === checkQuarter && (r.status === 'Published' || r.status === 'Submitted'));
                });

                unreviewedCountForCoach = unreviewedPlayers.length;
                playerReviewDeduction = unreviewedCountForCoach * rules.playerReview.amount;

                if (unreviewedCountForCoach > 0) {
                    const sampleNames = unreviewedPlayers.slice(0, 5).map(p => p.name).join('、') + (unreviewedCountForCoach > 5 ? `等 ${unreviewedCountForCoach} 人` : '');
                    playerReviewAuditDetails = `${checkYear}年${checkQuarter}季度球员跟踪逾期未录入，共有 ${unreviewedCountForCoach} 名球员未按时在次月10日前完成跟踪评价录入 （未录入球员：${sampleNames}）。根据总监考核规定，每名球员扣罚 ${rules.playerReview.amount} 元，总计扣减基本薪资 ¥${playerReviewDeduction}。`;
                } else {
                    playerReviewAuditDetails = `季度球员跟踪考核100%通过！已及时在次月10日前完成了${checkYear}年${checkQuarter}季度全部 ${totalCoachPlayersOfCoach} 名球员的跟踪考评录入。`;
                }
            }

            // 6. 月度执行奖：每月评选，在助教监督考评、青训总监监督考评，季度周期计划目标考核录入及球员跟踪录入考核未扣罚工资。则考核结果为优秀奖励配置金额(如200元)；如累计被罚款20元（含）以内，则评为良好奖励100元(或优秀的一半)，如罚款超过20元则不进行奖励。
            const totalExecutionFines = totalSupervisorDeductions + totalLogAuditDeductions + periodizationDeduction + playerReviewDeduction;
            let defaultExecutionLevel = 'NeedsImprovement';
            let defaultExecutionReward = 0;

            const isExecutionApplies = rules.monthlyExecution.enabled && 
                (isAssistant ? rules.monthlyExecution.assessAssistants : rules.monthlyExecution.assessCoaches);

            if (isExecutionApplies) {
                const execLimitAmount = rules.monthlyExecution.amount;
                if (totalExecutionFines === 0) {
                    defaultExecutionLevel = 'Excellent';
                    defaultExecutionReward = execLimitAmount;
                } else if (totalExecutionFines <= 20) {
                    defaultExecutionLevel = 'Good';
                    defaultExecutionReward = Math.round(execLimitAmount / 2);
                }
            }

            const monthlyExecutionReward = currentEdit.monthlyExecutionReward !== undefined 
                ? currentEdit.monthlyExecutionReward 
                : (savedRecord && savedRecord.monthlyExecutionReward !== undefined ? savedRecord.monthlyExecutionReward : defaultExecutionReward);
            
            const monthlyExecutionLevel = savedRecord && savedRecord.monthlyExecutionLevel 
                ? savedRecord.monthlyExecutionLevel 
                : (monthlyExecutionReward === rules.monthlyExecution.amount ? 'Excellent' : monthlyExecutionReward === Math.round(rules.monthlyExecution.amount / 2) ? 'Good' : defaultExecutionLevel);

            const baseSalary = currentEdit.baseSalary !== undefined ? currentEdit.baseSalary : (savedRecord ? savedRecord.baseSalary : Math.max(0, baseSalaryDefault - totalSupervisorDeductions - totalLogAuditDeductions - periodizationDeduction - playerReviewDeduction));
            const sessionFees = currentEdit.sessionFees !== undefined ? currentEdit.sessionFees : (savedRecord ? savedRecord.sessionFees : calcSessionFees);
            const attendanceReward = currentEdit.attendanceReward !== undefined ? currentEdit.attendanceReward : (savedRecord ? savedRecord.attendanceReward : calcAttendanceReward);
            const renewalReward = currentEdit.renewalReward !== undefined ? currentEdit.renewalReward : (savedRecord ? savedRecord.renewalReward : calcRenewalReward);
            const performanceReward = currentEdit.performanceReward !== undefined ? currentEdit.performanceReward : (savedRecord ? savedRecord.performanceReward : calcPerformanceReward);
            const matchSubsidy = currentEdit.matchSubsidy !== undefined ? currentEdit.matchSubsidy : (savedRecord ? (savedRecord.matchSubsidy || 0) : 0);
            
            const totalSalary = baseSalary + sessionFees + attendanceReward + renewalReward + performanceReward + matchSubsidy + monthlyExecutionReward;

            return {
                coachId: coach.id,
                coachName: coach.name,
                role: coach.role,
                level: isAssistant ? 'Assistant' : levelConfig.label,
                baseSalary,
                sessionFees,
                attendanceReward,
                renewalReward,
                performanceReward,
                matchSubsidy,
                monthlyExecutionReward,
                monthlyExecutionLevel,
                totalSalary,
                performanceFormula,
                evaluationScore: evaluation?.score || 0,
                evaluationDetails: evaluation,
                savedRecord,
                isSaved: !!savedRecord,
                isDisbursed: savedRecord?.isDisbursed || false,
                totalSupervisorDeductions,
                supervisorDeductionSessionsCount,
                totalLogAuditDeductions,
                logAuditSessionsCount,
                periodizationDeduction,
                periodizationDetailsString,
                playerReviewDeduction,
                playerReviewAuditDetails,
                unreviewedCountForCoach,
                totalCoachPlayersOfCoach,
                isModified: Object.keys(currentEdit).length > 0 || Object.keys(overriddenTeamSizes).some(k => k.startsWith(`${selectedYear}-${selectedMonth}-${coach.id}-`)),
                teamBreakdown
            };
        });
    }, [users, players, trainings, salarySettings, selectedYear, selectedMonth, editPayroll, filterCoachId, teams, overriddenTeamSizes, periodizationPlans]);

    const handleUpdatePayrollField = (coachId: string, field: keyof MonthlySalaryRecord, value: string) => {
        const numVal = parseFloat(value) || 0;
        setEditPayroll(prev => ({ ...prev, [coachId]: { ...prev[coachId], [field]: numVal } }));
    };

    const handleSavePayroll = (coachId: string) => {
        if (selectedYear === 'all') { alert('请选择具体年份进行保存'); return; }
        const yearNum = selectedYear as number;
        const coach = users.find(u => u.id === coachId);
        const row = coachSalaries.find(s => s.coachId === coachId);
        if (!coach || !row) return;
        const records = coach.monthlySalaryRecords || [];
        const existingIdx = records.findIndex(r => r.year === yearNum && r.month === selectedMonth);
        
        // Extract overrides for this coach and month
        const teamOverrides: Record<string, number> = {};
        Object.entries(overriddenTeamSizes).forEach(([key, val]) => {
            if (key.startsWith(`${yearNum}-${selectedMonth}-${coachId}-`)) {
                const teamId = key.split('-').slice(3).join('-');
                teamOverrides[teamId] = val;
            }
        });

        const newRecord: MonthlySalaryRecord = { 
            id: `sal-${yearNum}-${selectedMonth}-${coachId}`, 
            year: yearNum, 
            month: selectedMonth, 
            baseSalary: row.baseSalary, 
            sessionFees: row.sessionFees, 
            attendanceReward: row.attendanceReward, 
            renewalReward: row.renewalReward, 
            performanceReward: row.performanceReward, 
            matchSubsidy: row.matchSubsidy,
            monthlyExecutionReward: row.monthlyExecutionReward,
            monthlyExecutionLevel: row.monthlyExecutionLevel,
            totalSalary: row.totalSalary, 
            isDisbursed: row.isDisbursed,
            overriddenTeamSizes: teamOverrides
        };
        const nextRecords = [...records];
        if (existingIdx >= 0) nextRecords[existingIdx] = newRecord; else nextRecords.push(newRecord);
        onUpdateUser({ ...coach, monthlySalaryRecords: nextRecords });
        
        // Clear local overrides that were just saved
        const nextOverrides = { ...overriddenTeamSizes };
        Object.keys(nextOverrides).forEach(key => {
            if (key.startsWith(`${yearNum}-${selectedMonth}-${coachId}-`)) {
                delete nextOverrides[key];
            }
        });
        setOverriddenTeamSizes(nextOverrides);
        
        const nextEdit = { ...editPayroll }; delete nextEdit[coachId]; setEditPayroll(nextEdit);
        alert(`已保存 ${coach.name} 的薪酬快照。`);
    };

    const handleDisburseSalary = (coachId: string) => {
        if (selectedYear === 'all') { alert('请选择具体年份进行发放'); return; }
        const yearNum = selectedYear as number;
        const coach = users.find(u => u.id === coachId);
        const row = coachSalaries.find(s => s.coachId === coachId);
        if (!coach || !row) return;
        if (row.totalSalary <= 0) { alert('薪资总额为0，无需发放。'); return; }
        if (row.isDisbursed && !confirm('该笔薪资已经发放过，确定要再次发放并记录支出吗？')) return;
        const records = coach.monthlySalaryRecords || [];
        const existingIdx = records.findIndex(r => r.year === yearNum && r.month === selectedMonth);
        const newRecord: MonthlySalaryRecord = { 
            id: `sal-${yearNum}-${selectedMonth}-${coachId}`, 
            year: yearNum, 
            month: selectedMonth, 
            baseSalary: row.baseSalary, 
            sessionFees: row.sessionFees, 
            attendanceReward: row.attendanceReward, 
            renewalReward: row.renewalReward, 
            performanceReward: row.performanceReward, 
            matchSubsidy: row.matchSubsidy, 
            monthlyExecutionReward: row.monthlyExecutionReward,
            monthlyExecutionLevel: row.monthlyExecutionLevel,
            totalSalary: row.totalSalary, 
            isDisbursed: true, 
            disbursedDate: new Date().toISOString().split('T')[0] 
        };
        const nextRecords = [...records];
        if (existingIdx >= 0) nextRecords[existingIdx] = newRecord; else nextRecords.push(newRecord);
        onUpdateUser({ ...coach, monthlySalaryRecords: nextRecords });
        const salaryExpenseCategory = financeCategories.find(c => c.label.includes('工资支出') || c.id === 'cat-4');
        onAddTransaction({ id: `disburse-${Date.now()}-${coachId}`, date: new Date().toISOString().split('T')[0], details: `${yearNum}年${selectedMonth + 1}月 ${coach.name} (${coach.role === 'coach' ? '主教练' : '助教'}) 薪资发放入账`, category: salaryExpenseCategory?.id || 'cat-4', income: 0, expense: row.totalSalary, account: '黔农云 (发薪账户)' });
        alert(`发放成功！已为 ${coach.name} 生成一笔 ¥${row.totalSalary} 的薪酬支出记录。`);
    };

    const uniqueAccounts = useMemo(() => {
        const accounts = new Set(transactions.map(t => t.account).filter(Boolean));
        return Array.from(accounts).sort();
    }, [transactions]);

    const uniqueDetails = useMemo(() => {
        const details = new Set(transactions.map(t => t.details).filter(Boolean));
        return Array.from(details).sort();
    }, [transactions]);

    const handleAccountingSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingAccountingRecord) {
            onUpdateAccountingRecord({ ...editingAccountingRecord, ...accountingFormData } as AccountingRecord);
        } else {
            onAddAccountingRecord({ ...accountingFormData, id: Date.now().toString() } as AccountingRecord);
        }
        setShowAccountingModal(false);
        setEditingAccountingRecord(null);
    };

    const handleSettleAccountingRecord = (record: AccountingRecord) => {
        const settledDate = new Date().toISOString().split('T')[0];
        onUpdateAccountingRecord({ ...record, status: 'settled', settledDate });
        
        // Generate transaction
        const transactionId = `settle-${new Date().getTime()}`;
        onAddTransaction({
            id: transactionId,
            date: settledDate,
            details: `[账款结算] ${record.entity}: ${record.details}`,
            category: record.category,
            income: record.type === 'receivable' ? record.amount : 0,
            expense: record.type === 'payable' ? record.amount : 0,
            account: '黔农云 (结算入账)'
        });
    };

    const toggleSelectAll = () => setSelectedIds(selectedIds.size === journalWithBalance.length ? new Set() : new Set(journalWithBalance.map(t => t.id)));
    const toggleSelectId = (id: string) => { const newSet = new Set(selectedIds); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); setSelectedIds(newSet); };
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amountNum = parseFloat(formData.amount) || 0;
        if (!formData.category) { alert('请选择一个项目分类'); return; }
        onAddTransaction({ id: Date.now().toString(), date: formData.date, details: formData.details, category: formData.category, income: activeType === 'income' ? amountNum : 0, expense: activeType === 'expense' ? amountNum : 0, account: formData.account, attachment: formData.attachment });
        setShowAddModal(false); setFormData({ ...formData, details: '', amount: '', attachment: '' });
    };

    const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target?.result as string; const lines = text.split('\n'); const newTxs: FinanceTransaction[] = []; let batchIncome = 0; let batchExpense = 0;
            const cleanAmount = (str: string) => str ? parseFloat(str.replace(/[¥, ]/g, '')) || 0 : 0;
            const normalizeDateStr = (str: string) => str.trim().replace(/(\d{4})年(\d{1,2})月(\d{1,2})日/, (_, y, m, d) => `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`).replace(/\//g, '-');
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim(); if (!line) continue;
                const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));
                if (cols.length >= 5) {
                    const date = normalizeDateStr(cols[0]); const catLabel = cols[1]; const details = cols[2]; const income = cleanAmount(cols[3]); const expense = cleanAmount(cols[4]); const account = cols[5] || '默认账户';
                    const catDef = financeCategories.find(c => c.label === catLabel);
                    if (!catDef || (income === 0 && expense === 0)) continue;
                    batchIncome += income; batchExpense += expense;
                    newTxs.push({ id: `imp-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`, date, details, category: catDef.id, income, expense, account });
                }
            }
            if (newTxs.length > 0) { setImportSummary({ count: newTxs.length, income: batchIncome, expense: batchExpense, tempTxs: newTxs }); setShowImportModal(false); } else alert('未解析到有效数据。');
        };
        reader.readAsText(file); if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black text-bvb-black uppercase tracking-tighter">财务管理</h2>
                    <p className="text-gray-500 font-bold uppercase text-[9px] md:text-[10px] tracking-widest">Financial Records & Performance Analytics</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm shrink-0">
                        <button onClick={() => setViewMode('journal')} className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-[10px] md:text-xs font-black transition-all ${viewMode === 'journal' ? 'bg-bvb-black text-bvb-yellow shadow-sm' : 'text-gray-400 hover:text-gray-800'}`}>流水</button>
                        <button onClick={() => setViewMode('summary')} className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-[10px] md:text-xs font-black transition-all ${viewMode === 'summary' ? 'bg-bvb-black text-bvb-yellow shadow-sm' : 'text-gray-400 hover:text-gray-800'}`}>统计</button>
                        <button onClick={() => setViewMode('salary')} className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-[10px] md:text-xs font-black transition-all ${viewMode === 'salary' ? 'bg-bvb-black text-bvb-yellow shadow-sm' : 'text-gray-400 hover:text-gray-800'}`}>薪资</button>
                        <button onClick={() => setViewMode('accounting')} className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-[10px] md:text-xs font-black transition-all ${viewMode === 'accounting' ? 'bg-bvb-black text-bvb-yellow shadow-sm' : 'text-gray-400 hover:text-gray-800'}`}>账款</button>
                    </div>
                    <button onClick={() => setShowImportModal(true)} className="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-white border border-gray-300 text-gray-600 font-bold rounded-xl shadow-sm hover:bg-gray-50 transition-colors text-xs"><FileSpreadsheet className="w-4 h-4 mr-1.5 text-green-600" /> 导入</button>
                    <button onClick={() => { setActiveType('income'); setShowAddModal(true); }} className="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-bvb-yellow text-bvb-black font-black rounded-xl shadow-md hover:brightness-105 active:scale-95 transition-all text-xs"><Plus className="w-4 h-4 mr-1.5" /> 记账</button>
                </div>
            </div>

            {viewMode === 'salary' ? (
                <div className="space-y-6 animate-in slide-in-from-bottom-4">
                    <div className="flex flex-col lg:flex-row justify-between items-center bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-200 gap-4">
                        <h3 className="font-black text-base md:text-lg text-gray-800 flex items-center shrink-0 uppercase italic tracking-tighter"><Calculator className="w-5 h-5 md:w-6 md:h-6 mr-2 text-bvb-yellow" /> 教练组薪酬核算表</h3>
                        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
                            <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 md:px-3 md:py-1.5 rounded-xl border border-gray-100">
                                <UserCheck className="w-3.5 h-3.5 text-gray-400" />
                                <select value={filterCoachId} onChange={e => setFilterCoachId(e.target.value)} className="bg-transparent text-[10px] md:text-xs font-black outline-none focus:ring-0 cursor-pointer">
                                    <option value="all">全部人员 (主/助教)</option>
                                    {users.filter(u => u.role === 'coach' || u.role === 'assistant_coach').map(c => <option key={c.id} value={c.id}>{c.name} ({c.role === 'coach' ? '主' : '助'})</option>)}
                                </select>
                            </div>
                            <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 md:px-3 md:py-1.5 rounded-xl border border-gray-100">
                                <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="bg-transparent text-[10px] md:text-xs font-black outline-none focus:ring-0 cursor-pointer">{[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}年</option>)}</select>
                                <span className="text-gray-300">|</span>
                                <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="bg-transparent text-[10px] md:text-xs font-black outline-none focus:ring-0 cursor-pointer">{Array.from({length: 12}, (_, i) => <option key={i} value={i}>{i+1}月</option>)}</select>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead className="bg-gray-50 text-gray-500 font-black uppercase text-[9px] md:text-[10px] tracking-tighter md:tracking-widest border-b">
                                    <tr>
                                        <th className="px-2 py-3 md:px-4 md:py-4">职员信息</th>
                                        <th className="px-2 py-3 md:px-4 md:py-4 text-right">底薪</th>
                                        <th className="px-2 py-3 md:px-4 md:py-4 text-right">课时费</th>
                                        <th className="px-2 py-3 md:px-4 md:py-4 text-right text-green-600 font-extrabold bg-green-50/10">全勤奖 (季评)</th>
                                        <th className="px-2 py-3 md:px-4 md:py-4 text-right">续费奖</th>
                                        <th className="px-2 py-3 md:px-4 md:py-4 text-right">月度执行奖</th>
                                        <th className="px-2 py-3 md:px-4 md:py-4 text-right">比赛补贴</th>
                                        <th className="px-2 py-3 md:px-4 md:py-4 text-right text-red-500 font-extrabold bg-red-50/10">月/季考核扣罚</th>
                                        <th className="px-2 py-3 md:px-4 md:py-4 text-right font-black text-bvb-black">应发总计</th>
                                        <th className="px-2 py-3 md:px-4 md:py-4 text-center">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {coachSalaries.map(sal => (
                                        <React.Fragment key={sal.coachId}>
                                            <tr className={`hover:bg-yellow-50/20 transition-colors ${sal.isSaved ? 'bg-green-50/10' : ''}`}>
                                                <td className="px-2 py-3 md:px-4 md:py-4">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-1"><span className="font-black text-gray-800 text-[11px] md:text-sm">{sal.coachName}</span>{sal.isDisbursed && <span className="text-[7px] md:text-[8px] bg-green-500 text-white px-1 rounded font-black uppercase">已发</span>}</div>
                                                                                       <div className="flex items-center gap-1.5 mt-0.5">
                                                             <span className={`text-[8px] font-black uppercase px-1 rounded border leading-tight ${sal.role === 'coach' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                                                                 {sal.role === 'coach' ? '主教练' : '助教'}
                                                             </span>
                                                             <span className="text-[8px] md:text-[10px] text-gray-400 font-bold uppercase">
                                                                 {sal.level === 'Apprentice' ? '见习' : sal.level === 'Junior' ? '初级' : sal.level === 'Intermediate' ? '常驻' : sal.level === 'Senior' ? '核心' : sal.level}
                                                             </span>
                                                         </div>
                                                    </div>
                                                </td>
                                                <td className="px-2 py-3 md:px-4 md:py-4 text-right"><input type="number" className={`w-12 md:w-20 p-1 border rounded text-right font-black text-[10px] md:text-xs bg-transparent focus:bg-white outline-none ${sal.isModified ? 'border-bvb-yellow bg-yellow-50' : 'border-transparent hover:border-gray-200'}`} value={sal.baseSalary || 0} onChange={(e) => handleUpdatePayrollField(sal.coachId, 'baseSalary', e.target.value)} /></td>
                                                <td className="px-2 py-3 md:px-4 md:py-4 text-right"><div className="flex flex-col items-end"><input type="number" className="w-12 md:w-20 p-1 border border-transparent rounded text-right font-black text-[10px] md:text-xs hover:border-gray-200 focus:bg-white outline-none" value={sal.sessionFees || 0} onChange={(e) => handleUpdatePayrollField(sal.coachId, 'sessionFees', e.target.value)} />{sal.teamBreakdown.length > 0 && <span className="text-[7px] md:text-[8px] text-gray-400 italic">按课计费</span>}</div></td>
                                                <td className="px-2 py-3 md:px-4 md:py-4 text-right bg-green-50/5">
                                                    {(() => {
                                                        const isAssistant = sal.role === 'assistant_coach';
                                                        const isAttAwardApplies = rules.quarterlyAttendance.enabled && 
                                                            (isAssistant ? rules.quarterlyAttendance.assessAssistants : rules.quarterlyAttendance.assessCoaches);
                                                        const attAmount = rules.quarterlyAttendance.amount || 200;

                                                        if (!isAttAwardApplies) {
                                                            return (
                                                                <span className="text-[10px] font-bold text-gray-400 block text-right">免考评/未启用</span>
                                                            );
                                                        }

                                                        return (
                                                            <div className="flex flex-col items-end gap-1">
                                                                <select
                                                                    className={`p-1 border rounded text-right font-black text-[10px] md:text-xs bg-white outline-none focus:border-bvb-yellow transition-all ${
                                                                        sal.attendanceReward > 0 ? 'border-green-300 text-green-700 bg-green-50/30' : 'border-gray-200 text-gray-400'
                                                                    }`}
                                                                    value={sal.attendanceReward > 0 ? 'yes' : 'no'}
                                                                    onChange={(e) => {
                                                                        const isPerfect = e.target.value === 'yes';
                                                                        handleUpdatePayrollField(sal.coachId, 'attendanceReward', isPerfect ? String(attAmount) : '0');
                                                                    }}
                                                                >
                                                                    <option value="no">非全勤 (¥0)</option>
                                                                    <option value="yes">全勤 (¥{attAmount})</option>
                                                                </select>
                                                                {sal.attendanceReward > 0 && (
                                                                    <span className="text-[7px] md:text-[8px] text-green-600 font-extrabold bg-green-50 px-1 py-0.5 rounded border border-green-200 whitespace-nowrap">
                                                                        季度全勤
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-2 py-3 md:px-4 md:py-4 text-right"><input type="number" className="w-12 md:w-20 p-1 border border-transparent rounded text-right font-black text-[10px] md:text-xs hover:border-gray-200 focus:bg-white outline-none" value={sal.renewalReward || 0} onChange={(e) => handleUpdatePayrollField(sal.coachId, 'renewalReward', e.target.value)} /></td>
                                                <td className="px-2 py-3 md:px-4 md:py-4 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <input 
                                                            type="number" 
                                                            className="w-12 md:w-20 p-1 border border-transparent rounded text-right font-black text-[10px] md:text-xs hover:border-gray-200 focus:bg-white outline-none" 
                                                            value={sal.monthlyExecutionReward || 0} 
                                                            onChange={(e) => handleUpdatePayrollField(sal.coachId, 'monthlyExecutionReward', e.target.value)} 
                                                        />
                                                        {sal.monthlyExecutionReward > 0 && (
                                                            <span className={`text-[7px] md:text-[8px] font-black uppercase ${
                                                                sal.monthlyExecutionLevel === 'Excellent' ? 'text-green-500 font-extrabold' : 'text-blue-500 font-extrabold'
                                                            }`}>
                                                                {sal.monthlyExecutionLevel === 'Excellent' ? '优秀奖' : '良好奖'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-2 py-3 md:px-4 md:py-4 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <input 
                                                            type="number" 
                                                            className="w-12 md:w-20 p-1 border border-transparent rounded text-right font-black text-[10px] md:text-xs hover:border-gray-200 focus:bg-white outline-none" 
                                                            value={sal.matchSubsidy || 0} 
                                                            onChange={(e) => handleUpdatePayrollField(sal.coachId, 'matchSubsidy', e.target.value)} 
                                                        />
                                                        {sal.matchSubsidy > 0 && <span className="text-[7px] md:text-[8px] text-orange-600 font-black">赛事补贴</span>}
                                                    </div>
                                                </td>
                                                <td className="px-2 py-3 md:px-4 md:py-4 text-right bg-red-50/5">
                                                    <div className="flex flex-col items-end">
                                                        <span className={`font-black text-[10px] md:text-sm leading-none ${(sal.totalSupervisorDeductions + sal.totalLogAuditDeductions + sal.periodizationDeduction + sal.playerReviewDeduction) > 0 ? 'text-red-600 font-extrabold' : 'text-gray-400'}`}>
                                                            {(sal.totalSupervisorDeductions + sal.totalLogAuditDeductions + sal.periodizationDeduction + sal.playerReviewDeduction) > 0 
                                                                ? `-¥${sal.totalSupervisorDeductions + sal.totalLogAuditDeductions + sal.periodizationDeduction + sal.playerReviewDeduction}` 
                                                                : '¥0'
                                                            }
                                                        </span>
                                                        {(sal.totalSupervisorDeductions + sal.totalLogAuditDeductions + sal.periodizationDeduction + sal.playerReviewDeduction) > 0 && (
                                                            <span className="text-[7px] md:text-[8px] text-red-500 font-black leading-none mt-1">月/季考核扣罚</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-2 py-3 md:px-4 md:py-4 text-right font-black text-bvb-black text-[11px] md:text-base tabular-nums leading-none">¥{sal.totalSalary.toLocaleString()}</td>
                                                <td className="px-2 py-3 md:px-4 md:py-4 text-center">
                                                    <div className="flex justify-center gap-0.5 md:gap-1">
                                                        <button onClick={() => handleSavePayroll(sal.coachId)} className={`p-1.5 md:p-2 rounded-lg transition-all ${sal.isModified ? 'bg-bvb-yellow text-bvb-black shadow-sm' : 'text-gray-300 hover:text-bvb-black hover:bg-gray-100'}`}><Save className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
                                                        <button onClick={() => handleDisburseSalary(sal.coachId)} className={`p-1.5 md:p-2 rounded-lg transition-all ${sal.isDisbursed ? 'text-green-500 bg-green-50' : 'bg-green-600 text-white hover:bg-green-700'}`} disabled={sal.isDisbursed}>{sal.isDisbursed ? <CheckSquare className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Banknote className="w-3.5 h-3.5 md:w-4 md:h-4" />}</button>
                                                    </div>
                                                </td>
                                            </tr>
                                            <tr className="bg-gray-50/10">
                                                <td colSpan={9} className="px-3 md:px-4 py-3 border-b border-gray-100/50">
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2 text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                                            <AlignLeft className="w-3 h-3 text-bvb-yellow" /> 核算公式与规则核对 (Formulas)
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                                                                                        {sal.teamBreakdown.map(teamInfo => (
                                                                <div key={teamInfo.teamId} className="bg-white/50 border border-gray-100 p-2.5 rounded-xl space-y-1.5 shadow-sm">
                                                                    <p className="text-[10px] font-black text-gray-800 border-b border-gray-100 pb-1 flex justify-between items-center">
                                                                        <span className="flex items-center gap-1">
                                                                            {teamInfo.teamName} (
                                                                            <input 
                                                                                type="number"
                                                                                className="w-8 bg-gray-100 hover:bg-white border border-transparent hover:border-gray-300 rounded text-center focus:ring-1 focus:ring-bvb-yellow outline-none font-black text-[10px] p-0"
                                                                                value={teamInfo.teamSize}
                                                                                onChange={(e) => {
                                                                                    const val = parseInt(e.target.value) || 0;
                                                                                    setOverriddenTeamSizes(prev => ({
                                                                                        ...prev,
                                                                                        [`${selectedYear}-${selectedMonth}-${sal.coachId}-${teamInfo.teamId}`]: val
                                                                                    }));
                                                                                }}
                                                                                title="点击修改计算人数"
                                                                            />
                                                                            {(overriddenTeamSizes[`${selectedYear}-${selectedMonth}-${sal.coachId}-${teamInfo.teamId}`] !== undefined || (sal.savedRecord?.overriddenTeamSizes?.[teamInfo.teamId] !== undefined)) && (
                                                                                <button 
                                                                                    onClick={() => {
                                                                                        setOverriddenTeamSizes(prev => {
                                                                                            const next = { ...prev };
                                                                                            delete next[`${selectedYear}-${selectedMonth}-${sal.coachId}-${teamInfo.teamId}`];
                                                                                            return next;
                                                                                        });
                                                                                    }}
                                                                                    className="p-0.5 text-gray-300 hover:text-bvb-yellow transition-colors"
                                                                                    title="同步至当前实际人数"
                                                                                >
                                                                                    <RefreshCw className="w-2.5 h-2.5" />
                                                                                </button>
                                                                            )}
                                                                            人)
                                                                        </span>
                                                                        <span className="text-bvb-yellow bg-black px-1 rounded-sm">¥{teamInfo.monthlySessionFee}</span>
                                                                    </p>
                                                                    <div className="space-y-1">
                                                                        <div className="flex items-start gap-1.5">
                                                                            <Calculator className="w-2.5 h-2.5 text-gray-300 mt-0.5" />
                                                                            <div>
                                                                                <p className="text-[8px] text-gray-400 font-bold uppercase leading-none">课时费公式:</p>
                                                                                <p className="text-[9px] font-mono text-gray-600 font-bold">{teamInfo.sessionFeeFormula}</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-start gap-1.5">
                                                                            <UserCheck className="w-2.5 h-2.5 text-gray-300 mt-0.5" />
                                                                            <div>
                                                                                <p className="text-[8px] text-gray-400 font-bold uppercase leading-none">参训奖励公式:</p>
                                                                                <p className={`text-[9px] font-mono font-bold ${teamInfo.attendanceReward > 0 ? 'text-green-600' : 'text-gray-500'}`}>{teamInfo.attendanceFormula}</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-start gap-1.5">
                                                                            <Star className="w-2.5 h-2.5 text-gray-300 mt-0.5" />
                                                                            <div>
                                                                                <p className="text-[8px] text-gray-400 font-bold uppercase leading-none">季度续费奖励公式:</p>
                                                                                <p className={`text-[9px] font-mono font-bold ${teamInfo.renewalReward > 0 ? 'text-blue-600' : 'text-gray-500'}`}>{teamInfo.renewalFormula}</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {(() => {
                                                                const isAssistant = sal.role === 'assistant_coach';
                                                                const isAssSupervisorApplies = rules.assistantSupervision.enabled && 
                                                                    (isAssistant ? rules.assistantSupervision.assessAssistants : rules.assistantSupervision.assessCoaches);

                                                                if (!isAssSupervisorApplies) {
                                                                    return null;
                                                                }

                                                                return (
                                                                    <div className={`bg-red-50/30 border ${sal.totalSupervisorDeductions > 0 ? 'border-red-200' : 'border-gray-200'} p-2.5 rounded-xl space-y-1.5 shadow-sm`}>
                                                                        <p className="text-[10px] font-black text-gray-800 border-b border-gray-100 pb-1 flex justify-between">
                                                                            <span className="flex items-center gap-1">
                                                                                <ShieldCheck className={`w-3.5 h-3.5 ${sal.totalSupervisorDeductions > 0 ? 'text-red-500 animate-pulse' : 'text-green-500'}`} />
                                                                                助教监督考评扣款 (监督状态)
                                                                            </span>
                                                                            <span className={`font-black text-xs ${sal.totalSupervisorDeductions > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                                                - ¥{sal.totalSupervisorDeductions || 0}
                                                                            </span>
                                                                        </p>
                                                                        <div className="space-y-1">
                                                                            <div className="flex items-start gap-1.5">
                                                                                <AlertCircle className="w-2.5 h-2.5 text-amber-500 mt-0.5" />
                                                                                <div>
                                                                                    <p className="text-[8px] text-gray-400 font-bold uppercase leading-none">扣缴明细与政策核对:</p>
                                                                                    <p className="text-[9px] text-gray-600 font-bold leading-relaxed">
                                                                                        {sal.totalSupervisorDeductions > 0 ? (
                                                                                            <span>
                                                                                                本月共 <span className="text-red-600 font-black">{sal.supervisorDeductionSessionsCount}</span> 场训练课触发不合规项。根据监督规定（着装规范缺项扣10元，器材清理未清每次扣10元）扣减基本工资。
                                                                                            </span>
                                                                                        ) : (
                                                                                            <span>
                                                                                                状态优良。本月无任何着装缺项及教材器材丢放未清零的记录。
                                                                                            </span>
                                                                                        )}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                            {(() => {
                                                                const isAssistant = sal.role === 'assistant_coach';
                                                                const isLogAuditApplies = rules.directorLogAudit.enabled && 
                                                                    (isAssistant ? rules.directorLogAudit.assessAssistants : rules.directorLogAudit.assessCoaches);

                                                                if (!isLogAuditApplies) {
                                                                    return null;
                                                                }

                                                                return (
                                                                    <div className={`bg-rose-50/30 border ${sal.totalLogAuditDeductions > 0 ? 'border-rose-200' : 'border-gray-200'} p-2.5 rounded-xl space-y-1.5 shadow-sm`}>
                                                                        <p className="text-[10px] font-black text-gray-800 border-b border-gray-100 pb-1 flex justify-between">
                                                                            <span className="flex items-center gap-1">
                                                                                <FileText className={`w-3.5 h-3.5 ${sal.totalLogAuditDeductions > 0 ? 'text-rose-500 animate-pulse' : 'text-green-500'}`} />
                                                                                青训总监日志考核扣款 (录入考评)
                                                                            </span>
                                                                            <span className={`font-black text-xs ${sal.totalLogAuditDeductions > 0 ? 'text-rose-600' : 'text-green-600'}`}>
                                                                                - ¥{sal.totalLogAuditDeductions || 0}
                                                                            </span>
                                                                        </p>
                                                                        <div className="space-y-1">
                                                                            <div className="flex items-start gap-1.5">
                                                                                <AlertCircle className="w-2.5 h-2.5 text-rose-500 mt-0.5" />
                                                                                <div>
                                                                                    <p className="text-[8px] text-gray-400 font-bold uppercase leading-none">扣罚明细与考核结果:</p>
                                                                                    <p className="text-[9px] text-gray-600 font-bold leading-relaxed">
                                                                                        {sal.totalLogAuditDeductions > 0 ? (
                                                                                            <span>
                                                                                                本月共 <span className="text-rose-600 font-black">{sal.logAuditSessionsCount}</span> 场训练日志录入逾期。根据考核规程（逾期未录入每次课时扣10元，逾期2天及以上每次扣20元）扣减基本工资。
                                                                                            </span>
                                                                                        ) : (
                                                                                            <span>
                                                                                                考核优秀！本月训练课日志均按时在当天完成录入，无任何逾期扣款。
                                                                                            </span>
                                                                                        )}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                            {(() => {
                                                                const isAssistant = sal.role === 'assistant_coach';
                                                                const isPeriodizationApplies = rules.periodizationPlan.enabled && 
                                                                    (isAssistant ? rules.periodizationPlan.assessAssistants : rules.periodizationPlan.assessCoaches);

                                                                if (!isPeriodizationApplies) {
                                                                    return null;
                                                                }

                                                                return (
                                                                    <div className={`bg-amber-50/20 border ${sal.periodizationDeduction > 0 ? 'border-amber-250 bg-amber-50/30' : 'border-gray-200'} p-2.5 rounded-xl space-y-1.5 shadow-sm`}>
                                                                        <p className="text-[10px] font-black text-gray-800 border-b border-gray-100 pb-1 flex justify-between">
                                                                            <span className="flex items-center gap-1">
                                                                                <Target className={`w-3.5 h-3.5 ${sal.periodizationDeduction > 0 ? 'text-amber-500 animate-pulse' : 'text-green-500'}`} />
                                                                                季度周期训练计划目标考核 ({[2, 5, 8, 11].includes(selectedMonth) ? '当前季末考评' : '非季末月份'})
                                                                            </span>
                                                                            <span className={`font-black text-xs ${sal.periodizationDeduction > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                                                                                {sal.periodizationDeduction > 0 ? `- ¥${sal.periodizationDeduction}` : '正常'}
                                                                            </span>
                                                                        </p>
                                                                        <div className="space-y-1">
                                                                            <div className="flex items-start gap-1.5">
                                                                                <AlertCircle className={`w-2.5 h-2.5 mt-0.5 ${sal.periodizationDeduction > 0 ? 'text-amber-500' : 'text-green-500'}`} />
                                                                                <div>
                                                                                    <p className="text-[8px] text-gray-400 font-bold uppercase leading-none">考核结果与扣罚依据:</p>
                                                                                    <p className="text-[9px] text-gray-600 font-bold leading-relaxed">
                                                                                        {![2, 5, 8, 11].includes(selectedMonth) ? (
                                                                                            <span>当前月份非季末考核月（3、6、9、12月为季末考核月），周期计划由总监考核，此其不进行基础工资扣除。</span>
                                                                                        ) : sal.periodizationDeduction > 0 ? (
                                                                                            <span className="text-amber-800 font-medium">
                                                                                                {sal.periodizationDetailsString}。扣除当月基础工资20%。
                                                                                            </span>
                                                                                        ) : (
                                                                                            <span>本季度所管理团队的季度计划制定考评已通过，已确认录入计划目标。本季末月底正常发放基本工资。</span>
                                                                                        )}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                            {(() => {
                                                                const isAssistant = sal.role === 'assistant_coach';
                                                                const isPlayerReviewApplies = rules.playerReview.enabled && 
                                                                    (isAssistant ? rules.playerReview.assessAssistants : rules.playerReview.assessCoaches);

                                                                if (!isPlayerReviewApplies) {
                                                                    return null;
                                                                }

                                                                return (
                                                                    <div className={`bg-rose-50/20 border ${sal.playerReviewDeduction > 0 ? 'border-red-200 bg-red-50/20' : 'border-gray-200'} p-2.5 rounded-xl space-y-1.5 shadow-sm`}>
                                                                        <p className="text-[10px] font-black text-gray-800 border-b border-gray-100 pb-1 flex justify-between">
                                                                            <span className="flex items-center gap-1">
                                                                                <Clock className={`w-3.5 h-3.5 ${sal.playerReviewDeduction > 0 ? 'text-red-500 animate-pulse' : 'text-green-400'}`} />
                                                                                季度球员跟踪录入考核 ({[0, 3, 6, 9].includes(selectedMonth) ? '季度次月考核月' : '非次月考核'})
                                                                            </span>
                                                                            <span className={`font-black text-xs ${sal.playerReviewDeduction > 0 ? 'text-red-600 font-extrabold animate-pulse' : 'text-green-600'}`}>
                                                                                {sal.playerReviewDeduction > 0 ? `- ¥${sal.playerReviewDeduction}` : '满分/正常'}
                                                                            </span>
                                                                        </p>
                                                                        <div className="space-y-1">
                                                                            <div className="flex items-start gap-1.5">
                                                                                <AlertCircle className={`w-2.5 h-2.5 mt-0.5 ${sal.playerReviewDeduction > 0 ? 'text-red-500' : 'text-green-500'}`} />
                                                                                <div>
                                                                                    <p className="text-[8px] text-gray-400 font-bold uppercase leading-none">考核结果与扣减明细:</p>
                                                                                    <p className="text-[9px] text-gray-600 font-bold leading-relaxed">
                                                                                        {![0, 3, 6, 9].includes(selectedMonth) ? (
                                                                                            <span>当前月份非季度次月考核月（1、4、7、10月为上季度录入结果考核月，首期自当前季度2026 Q2起由青训总监考核并在7月10日前执行完毕）。</span>
                                                                                        ) : (
                                                                                            <span>
                                                                                                {sal.playerReviewAuditDetails}
                                                                                            </span>
                                                                                        )}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                            {(() => {
                                                                const isAssistant = sal.role === 'assistant_coach';
                                                                const isAttAwardApplies = rules.quarterlyAttendance.enabled && 
                                                                    (isAssistant ? rules.quarterlyAttendance.assessAssistants : rules.quarterlyAttendance.assessCoaches);

                                                                if (!isAttAwardApplies) {
                                                                    return null;
                                                                }

                                                                return (
                                                                    <div className={`border p-2.5 rounded-xl space-y-1.5 shadow-sm transition-all ${
                                                                        sal.attendanceReward > 0 
                                                                            ? 'bg-green-50/25 border-green-200' 
                                                                            : 'bg-gray-50/50 border-gray-200 opacity-80'
                                                                    }`}>
                                                                    <p className="text-[10px] font-black text-gray-800 border-b border-gray-150 pb-1 flex justify-between">
                                                                        <span className="flex items-center gap-1">
                                                                            <UserCheck className={`w-3.5 h-3.5 ${
                                                                                sal.attendanceReward > 0 
                                                                                    ? 'text-green-500 fill-green-100' 
                                                                                    : 'text-gray-400'
                                                                            }`} />
                                                                            季度全勤奖 (总监季评)
                                                                        </span>
                                                                        <span className={`font-black text-xs ${
                                                                            sal.attendanceReward > 0 
                                                                                ? 'text-green-600 font-extrabold' 
                                                                                : 'text-gray-500'
                                                                        }`}>
                                                                            {sal.attendanceReward > 0 ? `+ ¥${sal.attendanceReward}` : '不予以奖励'}
                                                                        </span>
                                                                    </p>
                                                                    <div className="space-y-1">
                                                                        <div className="flex items-start gap-1.5">
                                                                            <div className="text-[9px] text-gray-600 font-bold leading-relaxed w-full">
                                                                                <div className="flex items-center justify-between gap-1 flex-wrap">
                                                                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black leading-none ${
                                                                                        sal.attendanceReward > 0 
                                                                                            ? 'bg-green-100 text-green-800' 
                                                                                            : 'bg-gray-200 text-gray-800'
                                                                                    }`}>
                                                                                        {sal.attendanceReward > 0 ? '评定状态: 全勤' : '评定状态: 非全勤'}
                                                                                    </span>
                                                                                    
                                                                                    <div className="flex items-center gap-1">
                                                                                        <span className="text-gray-400">切换状态:</span>
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                const attAmount = rules.quarterlyAttendance.amount || 200;
                                                                                                handleUpdatePayrollField(sal.coachId, 'attendanceReward', sal.attendanceReward > 0 ? '0' : String(attAmount));
                                                                                            }}
                                                                                            className={`px-2 py-0.5 rounded text-[8px] font-black transition-colors ${
                                                                                                sal.attendanceReward > 0
                                                                                                    ? 'bg-rose-100 text-rose-750 hover:bg-rose-200'
                                                                                                    : 'bg-green-100 text-green-750 hover:bg-green-200'
                                                                                            }`}
                                                                                        >
                                                                                            {sal.attendanceReward > 0 ? '设为非全勤' : `设为全勤 (奖¥${rules.quarterlyAttendance.amount || 200})`}
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                                <p className="mt-1 text-[9px] text-gray-500 leading-normal font-sans">
                                                                                    {rules.quarterlyAttendance.content || `全勤奖由青训总监每季度末根据全勤记录评定。选择全勤教练员将获得 ${rules.quarterlyAttendance.amount || 200} 元 的季度全勤奖励。`} (考核时间点: {rules.quarterlyAttendance.timing})
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
                                                            {(() => {
                                                                const isAssistant = sal.role === 'assistant_coach';
                                                                const isExecutionApplies = rules.monthlyExecution.enabled && 
                                                                    (isAssistant ? rules.monthlyExecution.assessAssistants : rules.monthlyExecution.assessCoaches);

                                                                if (!isExecutionApplies) {
                                                                    return null;
                                                                }

                                                                return (
                                                                    <div className={`border p-2.5 rounded-xl space-y-1.5 shadow-sm transition-all ${
                                                                        sal.monthlyExecutionLevel === 'Excellent' 
                                                                            ? 'bg-emerald-50/20 border-emerald-200' 
                                                                            : sal.monthlyExecutionLevel === 'Good' 
                                                                                ? 'bg-blue-50/10 border-blue-200' 
                                                                                : 'bg-gray-50/50 border-gray-200 opacity-80'
                                                                    }`}>
                                                                        <p className="text-[10px] font-black text-gray-800 border-b border-gray-150 pb-1 flex justify-between">
                                                                            <span className="flex items-center gap-1">
                                                                                <Star className={`w-3.5 h-3.5 ${
                                                                                    sal.monthlyExecutionLevel === 'Excellent' 
                                                                                        ? 'text-yellow-500 fill-yellow-500' 
                                                                                        : sal.monthlyExecutionLevel === 'Good' 
                                                                                            ? 'text-blue-500' 
                                                                                            : 'text-gray-400'
                                                                                }`} />
                                                                                月度执行奖 (总监正向激励)
                                                                            </span>
                                                                            <span className={`font-black text-xs ${
                                                                                sal.monthlyExecutionLevel === 'Excellent' 
                                                                                    ? 'text-emerald-600 font-extrabold' 
                                                                                    : sal.monthlyExecutionLevel === 'Good' 
                                                                                        ? 'text-blue-600 font-extrabold' 
                                                                                        : 'text-gray-500'
                                                                            }`}>
                                                                                {sal.monthlyExecutionReward > 0 ? `+ ¥${sal.monthlyExecutionReward}` : '不予奖励'}
                                                                            </span>
                                                                        </p>
                                                                        <div className="space-y-1">
                                                                            <div className="flex items-start gap-1.5">
                                                                                <div className="text-[9px] text-gray-600 font-bold leading-relaxed w-full">
                                                                                    <div className="flex items-center gap-1 flex-wrap">
                                                                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black leading-none ${
                                                                                            sal.monthlyExecutionLevel === 'Excellent' 
                                                                                                ? 'bg-emerald-100 text-emerald-800' 
                                                                                                : sal.monthlyExecutionLevel === 'Good' 
                                                                                                    ? 'bg-blue-100 text-blue-800' 
                                                                                                    : 'bg-gray-200 text-gray-800'
                                                                                        }`}>
                                                                                            {sal.monthlyExecutionLevel === 'Excellent' ? '优秀 (考核满分)' : sal.monthlyExecutionLevel === 'Good' ? '良好 (累计扣款≤20元)' : '待改进 / 不予奖励'}
                                                                                        </span>
                                                                                        <span className="text-gray-400">
                                                                                            (累计四项考核扣款: <span className="font-bold underline text-gray-700">¥{sal.totalSupervisorDeductions + sal.totalLogAuditDeductions + sal.periodizationDeduction + sal.playerReviewDeduction}</span> 元)
                                                                                        </span>
                                                                                    </div>
                                                                                    <p className="mt-1 text-[9px] text-gray-500 leading-normal font-sans">
                                                                                        {sal.monthlyExecutionLevel === 'Excellent' ? (
                                                                                            <span>恭喜！四大考核项（助教考评、总监日志、周期计划、球员跟踪）本月无任何扣罚，特此正向激励奖励 <strong className="text-emerald-600">200元</strong>。优秀品质，继续保持！</span>
                                                                                        ) : sal.monthlyExecutionLevel === 'Good' ? (
                                                                                            <span>本月四大考核项合计被扣罚 <strong>¥{sal.totalSupervisorDeductions + sal.totalLogAuditDeductions + sal.periodizationDeduction + sal.playerReviewDeduction}</strong>，在 <strong>20元（含）以内</strong>，考核等级为良好，给予正向激励奖励 <strong className="text-blue-500">100元</strong>。积极进取，争取月月拿优秀！</span>
                                                                                        ) : (
                                                                                            <span>本月四大考核项累计扣罚已 <strong>超过了20元</strong>，考核等级为待改进。本月不予以发放月度执行奖，请教练员严格自律，规范记录。</span>
                                                                                        )}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                            <div className="bg-orange-50/30 border border-orange-100/50 p-2.5 rounded-xl space-y-1.5 shadow-sm">
                                                                <p className="text-[10px] font-black text-gray-800 border-b border-orange-100 pb-1 flex justify-between">
                                                                    <span>出差比赛补贴</span>
                                                                    <span className="text-orange-600 font-black">¥{sal.matchSubsidy || 0}</span>
                                                                </p>
                                                                <div className="flex items-start gap-1.5">
                                                                    <Banknote className="w-2.5 h-2.5 text-orange-400 mt-0.5" />
                                                                    <div>
                                                                        <p className="text-[8px] text-gray-400 font-bold uppercase leading-none">补贴说明:</p>
                                                                        <p className="text-[9px] font-mono text-gray-600 font-bold">外出比赛差旅/出差补贴 (由管理员手动录入发放)</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : viewMode === 'accounting' ? (
                <div className="space-y-6 animate-in slide-in-from-bottom-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">待收账款 (AR)</p>
                            <h4 className="text-2xl font-black text-green-600">¥{accountingRecords.filter(r => r.type === 'receivable' && r.status === 'pending').reduce((sum, r) => sum + r.amount, 0).toLocaleString()}</h4>
                            <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-400 font-bold">
                                <Clock className="w-3 h-3" /> 待结算: {accountingRecords.filter(r => r.type === 'receivable' && r.status === 'pending').length} 笔
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">待付账款 (AP)</p>
                            <h4 className="text-2xl font-black text-red-500">¥{accountingRecords.filter(r => r.type === 'payable' && r.status === 'pending').reduce((sum, r) => sum + r.amount, 0).toLocaleString()}</h4>
                            <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-400 font-bold">
                                <Clock className="w-3 h-3" /> 待结算: {accountingRecords.filter(r => r.type === 'payable' && r.status === 'pending').length} 笔
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-center">
                            <button onClick={() => { setEditingAccountingRecord(null); setAccountingFormData({ type: 'receivable', date: new Date().toISOString().split('T')[0], entity: '', details: '', amount: 0, status: 'pending', category: financeCategories[0]?.id || '' }); setShowAccountingModal(true); }} className="w-full py-3 bg-bvb-black text-bvb-yellow font-black rounded-xl shadow-md hover:brightness-110 transition-all flex items-center justify-center gap-2 uppercase tracking-tighter italic">
                                <Plus className="w-5 h-5" /> 新增会计账款
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 md:p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-black text-sm md:text-base text-gray-800 flex items-center uppercase italic tracking-tighter"><Briefcase className="w-4 h-4 md:w-5 md:h-5 mr-2 text-bvb-yellow" /> 应收应付账款管理明细</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-gray-50 text-gray-500 font-black uppercase text-[9px] md:text-[10px] tracking-widest border-b">
                                    <tr>
                                        <th className="px-4 py-4">类型</th>
                                        <th className="px-4 py-4">日期</th>
                                        <th className="px-4 py-4">对方单位/个人</th>
                                        <th className="px-4 py-4">摘要明细</th>
                                        <th className="px-4 py-4 text-right">金额</th>
                                        <th className="px-4 py-4 text-center">状态</th>
                                        <th className="px-4 py-4 text-center">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {accountingRecords.sort((a, b) => b.date.localeCompare(a.date)).map(record => (
                                        <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-4">
                                                <span className={`px-2 py-0.5 rounded-full font-black text-[9px] uppercase border ${record.type === 'receivable' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                                    {record.type === 'receivable' ? '应收 (AR)' : '应付 (AP)'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 font-mono text-gray-400">{record.date}</td>
                                            <td className="px-4 py-4 font-black text-gray-800">{record.entity}</td>
                                            <td className="px-4 py-4 text-gray-600">{record.details}</td>
                                            <td className={`px-4 py-4 text-right font-black text-sm ${record.type === 'receivable' ? 'text-green-600' : 'text-red-600'}`}>
                                                ¥{record.amount.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <div className="flex justify-center">
                                                    {record.status === 'pending' ? (
                                                        <span className="flex items-center gap-1 text-orange-500 font-black uppercase text-[9px] bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                                                            <Clock className="w-3 h-3" /> 待结算
                                                        </span>
                                                    ) : record.status === 'settled' ? (
                                                        <span className="flex items-center gap-1 text-green-600 font-black uppercase text-[9px] bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                                                            <CheckCircle2 className="w-3 h-3" /> 已结算 ({record.settledDate})
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-gray-400 font-black uppercase text-[9px] bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                                                            <X className="w-3 h-3" /> 已取消
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <div className="flex justify-center gap-2">
                                                    {record.status === 'pending' && (
                                                        <>
                                                            <button onClick={() => handleSettleAccountingRecord(record)} title="结算" className="p-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm">
                                                                <CheckSquare className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button onClick={() => { setEditingAccountingRecord(record); setAccountingFormData(record); setShowAccountingModal(true); }} title="编辑" className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
                                                                <FileText className="w-3.5 h-3.5" />
                                                            </button>
                                                        </>
                                                    )}
                                                    <button onClick={() => onDeleteAccountingRecord(record.id)} title="删除" className="p-1.5 text-gray-300 hover:text-red-500 transition-colors">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {accountingRecords.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-12 text-center text-gray-400 italic">暂无会计账款记录</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : viewMode === 'journal' ? (
                // 流水视图逻辑保持不变...
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 md:p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h3 className="font-black text-sm md:text-base text-gray-800 flex items-center uppercase italic tracking-tighter"><FileText className="w-4 h-4 md:w-5 md:h-5 mr-2 text-bvb-yellow" /> 现金日记账流水明细</h3>
                        <div className="flex items-center gap-2 md:gap-4">
                            {Object.values(filters).some(v => v !== '') && (
                                <button onClick={() => setFilters({ date: '', category: '', details: '', account: '', income: '', expense: '', balance: '' })} className="text-[10px] md:text-xs flex items-center bg-gray-50 text-gray-600 border border-gray-200 px-2 py-1 md:px-3 md:py-1.5 rounded-lg font-bold hover:bg-gray-100"><RefreshCw className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1" /> 重置筛选</button>
                            )}
                            {selectedIds.size > 0 && <button onClick={() => onBulkDeleteTransactions(Array.from(selectedIds))} className="text-[10px] md:text-xs flex items-center bg-red-50 text-red-600 border border-red-200 px-2 py-1 md:px-3 md:py-1.5 rounded-lg font-bold"><Trash2 className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1" /> 删除({selectedIds.size})</button>}
                            <button onClick={() => { const headers = "日期,项目分类,摘要备注,收入金额,支出金额,结算账户,结余\n"; const rows = journalWithBalance.map(t => { const catLabel = financeCategories.find(c => c.id === t.category)?.label || '未知分类'; return `${t.date},${catLabel},"${t.details.replace(/"/g, '""')}",${t.income || ''},${t.expense || ''},${t.account},${t.balance.toFixed(2)}`; }).join('\n'); const blob = new Blob(["\ufeff" + headers + rows], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `现金日记账_${new Date().toISOString().split('T')[0]}.csv`; link.click(); }} className="text-[10px] md:text-xs flex items-center bg-white border border-gray-300 px-2 py-1 md:px-3 md:py-1.5 rounded-lg font-bold hover:bg-gray-100 shadow-sm"><Download className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1" /> 导出</button>
                        </div>
                    </div>
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left">
                            <thead className="bg-gray-100 text-gray-500 font-black uppercase text-[9px] md:text-[10px] tracking-tighter md:tracking-widest sticky top-0 z-10 border-b border-gray-200">
                                <tr>
                                    <th className="px-3 py-3 md:px-6 md:py-4 w-10 text-center"><input type="checkbox" className="w-3.5 h-3.5 rounded text-bvb-black focus:ring-bvb-yellow" checked={selectedIds.size > 0 && selectedIds.size === journalWithBalance.length} onChange={toggleSelectAll} /></th>
                                    <th className="px-3 py-3 md:px-6 md:py-4"><button onClick={() => toggleSort('date')} className="flex items-center gap-1 hover:text-bvb-black transition-colors">日期 {journalSortField === 'date' ? (journalSortOrder === 'asc' ? <ArrowUp className="w-2.5 h-2.5 text-bvb-yellow" /> : <ArrowDown className="w-2.5 h-2.5 text-bvb-yellow" />) : <ArrowUpDown className="w-2.5 h-2.5 opacity-30" />}</button></th>
                                    <th className="px-3 py-3 md:px-6 md:py-4"><button onClick={() => toggleSort('category')} className="flex items-center gap-1 hover:text-bvb-black transition-colors">分类 {journalSortField === 'category' ? (journalSortOrder === 'asc' ? <ArrowUp className="w-2.5 h-2.5 text-bvb-yellow" /> : <ArrowDown className="w-2.5 h-2.5 text-bvb-yellow" />) : <ArrowUpDown className="w-2.5 h-2.5 opacity-30" />}</button></th>
                                    <th className="px-3 py-3 md:px-6 md:py-4">备注/摘要</th>
                                    <th className="px-3 py-3 md:px-6 md:py-4">账户</th>
                                    <th className="px-3 py-3 md:px-6 md:py-4 text-right"><button onClick={() => toggleSort('income')} className="flex items-center justify-end gap-1 ml-auto hover:text-bvb-black transition-colors">收入 {journalSortField === 'income' ? (journalSortOrder === 'asc' ? <ArrowUp className="w-2.5 h-2.5 text-bvb-yellow" /> : <ArrowDown className="w-2.5 h-2.5 text-bvb-yellow" />) : <ArrowUpDown className="w-2.5 h-2.5 opacity-30" />}</button></th>
                                    <th className="px-3 py-3 md:px-6 md:py-4 text-right"><button onClick={() => toggleSort('expense')} className="flex items-center justify-end gap-1 ml-auto hover:text-bvb-black transition-colors">支出 {journalSortField === 'expense' ? (journalSortOrder === 'asc' ? <ArrowUp className="w-2.5 h-2.5 text-bvb-yellow" /> : <ArrowDown className="w-2.5 h-2.5 text-bvb-yellow" />) : <ArrowUpDown className="w-2.5 h-2.5 opacity-30" />}</button></th>
                                    <th className="px-3 py-3 md:px-6 md:py-4 text-right font-black">结余</th>
                                    <th className="px-3 py-3 md:px-6 md:py-4 text-center">操作</th>
                                </tr>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <td className="px-3 py-2 md:px-6 md:py-3"></td>
                                    <td className="px-3 py-2 md:px-6 md:py-3"><input type="text" placeholder="筛选日期..." className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-[10px] font-bold outline-none focus:border-bvb-yellow" value={filters.date} onChange={e => setFilters({...filters, date: e.target.value})} /></td>
                                    <td className="px-3 py-2 md:px-6 md:py-3">
                                        <select 
                                            className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-[10px] font-bold outline-none focus:border-bvb-yellow" 
                                            value={filters.category} 
                                            onChange={e => setFilters({...filters, category: e.target.value})}
                                        >
                                            <option value="">全部分类</option>
                                            {financeCategories.map(c => (
                                                <option key={c.id} value={c.label}>{c.label}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-3 py-2 md:px-6 md:py-3">
                                        <input 
                                            list="details-list"
                                            type="text" 
                                            placeholder="筛选备注..." 
                                            className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-[10px] font-bold outline-none focus:border-bvb-yellow" 
                                            value={filters.details} 
                                            onChange={e => setFilters({...filters, details: e.target.value})} 
                                        />
                                        <datalist id="details-list">
                                            {uniqueDetails.map((d, i) => <option key={i} value={d} />)}
                                        </datalist>
                                    </td>
                                    <td className="px-3 py-2 md:px-6 md:py-3">
                                        <select 
                                            className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-[10px] font-bold outline-none focus:border-bvb-yellow" 
                                            value={filters.account} 
                                            onChange={e => setFilters({...filters, account: e.target.value})}
                                        >
                                            <option value="">全部账户</option>
                                            {uniqueAccounts.map((acc, i) => (
                                                <option key={i} value={acc}>{acc}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-3 py-2 md:px-6 md:py-3"><input type="text" placeholder="筛选收入..." className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-[10px] font-bold outline-none focus:border-bvb-yellow text-right" value={filters.income} onChange={e => setFilters({...filters, income: e.target.value})} /></td>
                                    <td className="px-3 py-2 md:px-6 md:py-3"><input type="text" placeholder="筛选支出..." className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-[10px] font-bold outline-none focus:border-bvb-yellow text-right" value={filters.expense} onChange={e => setFilters({...filters, expense: e.target.value})} /></td>
                                    <td className="px-3 py-2 md:px-6 md:py-3"><input type="text" placeholder="筛选结余..." className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-[10px] font-bold outline-none focus:border-bvb-yellow text-right" value={filters.balance} onChange={e => setFilters({...filters, balance: e.target.value})} /></td>
                                    <td className="px-3 py-2 md:px-6 md:py-3"></td>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {journalWithBalance.map((t) => {
                                    const cat = financeCategories.find(c => c.id === t.category);
                                    const isSelected = selectedIds.has(t.id);
                                    return (
                                        <tr
                                            key={t.id}
                                            className={`hover:bg-yellow-50/20 transition-colors cursor-pointer group animate-in fade-in duration-300 ${isSelected ? 'bg-yellow-50' : ''}`}
                                            onClick={() => toggleSelectId(t.id)}
                                        >
                                            <td className="px-3 py-3 md:px-6 md:py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    className="w-3.5 h-3.5 rounded text-bvb-black focus:ring-bvb-yellow"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelectId(t.id)}
                                                />
                                            </td>
                                            <td className="px-3 py-3 md:px-6 md:py-4 font-mono text-[9px] md:text-xs whitespace-nowrap text-gray-400">
                                                {t.date}
                                            </td>
                                            <td className="px-3 py-3 md:px-6 md:py-4 whitespace-nowrap">
                                                <span className={`text-[8px] md:text-[10px] px-1.5 md:px-2 py-0.5 rounded font-black border uppercase tracking-tighter ${cat?.type === 'income' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                                    {cat?.label || '未知'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 md:px-6 md:py-4 font-bold text-gray-800 text-[10px] md:text-sm truncate max-w-[80px] md:max-w-none">
                                                {t.details}
                                            </td>
                                            <td className="px-3 py-3 md:px-6 md:py-4 font-bold text-gray-400 text-[10px] md:text-xs">
                                                {t.account}
                                            </td>
                                            <td className="px-3 py-3 md:px-6 md:py-4 text-right font-black text-green-600 tabular-nums text-[10px] md:text-sm">
                                                {t.income > 0 ? Number(t.income).toLocaleString(undefined, { minimumFractionDigits: 1 }) : '-'}
                                            </td>
                                            <td className="px-3 py-3 md:px-6 md:py-4 text-right font-black text-red-500 tabular-nums text-[10px] md:text-sm">
                                                {t.expense > 0 ? Number(t.expense).toLocaleString(undefined, { minimumFractionDigits: 1 }) : '-'}
                                            </td>
                                            <td className="px-3 py-3 md:px-6 md:py-4 text-right font-mono font-black text-gray-600 bg-gray-50/30 tabular-nums text-[10px] md:text-sm leading-none">
                                                {t.balance.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                                            </td>
                                            <td className="px-3 py-3 md:px-6 md:py-4 text-center">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDeleteTransaction(t.id);
                                                    }}
                                                    className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-in slide-in-from-bottom-4">
                    {/* 统计视图保持不变... */}
                    <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-200 gap-4">
                        <h3 className="font-black text-base md:text-lg text-gray-800 flex items-center uppercase italic tracking-tighter shrink-0"><BarChart3 className="w-5 h-5 md:w-6 md:h-6 mr-2 text-bvb-yellow" /> 财务统计与深度分析</h3>
                        <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto justify-end">
                            <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 md:px-3 md:py-1.5 rounded-xl border border-gray-100">
                                <button onClick={() => { if (selectedYear !== 'all') setSelectedYear(v => (v as number) - 1); }} className="p-1 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-30" disabled={selectedYear === 'all'}><ChevronLeft className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400"/></button>
                                <button onClick={() => setSelectedYear(selectedYear === 'all' ? new Date().getFullYear() : 'all')} className="px-2 py-0.5 bg-white border rounded-lg text-[10px] font-black hover:bg-gray-50 transition-all">
                                    {selectedYear === 'all' ? '切换至年度' : '查看全部年度'}
                                </button>
                                <span className="font-black text-sm md:text-base min-w-[50px] md:min-w-[60px] text-center">{selectedYear === 'all' ? '全部' : selectedYear}</span>
                                <button onClick={() => { if (selectedYear !== 'all') setSelectedYear(v => (v as number) + 1); }} className="p-1 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-30" disabled={selectedYear === 'all'}><ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400"/></button>
                            </div>
                            <span className="text-gray-200 hidden md:block">/</span>
                            <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 md:px-3 md:py-1.5 rounded-xl border border-gray-100">
                                <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="bg-transparent text-[10px] md:text-xs font-black outline-none focus:ring-0 cursor-pointer">
                                    {Array.from({length: 12}, (_, i) => <option key={i} value={i}>{i+1}月 (深度分析)</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">总体累计收入</p>
                            <h4 className="text-xl font-black text-green-600">¥{totalStats.income.toLocaleString()}</h4>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">总体累计支出</p>
                            <h4 className="text-xl font-black text-red-500">¥{totalStats.expense.toLocaleString()}</h4>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">账目当前结余</p>
                            <h4 className={`text-xl font-black ${totalStats.balance >= 0 ? 'text-bvb-black' : 'text-red-600'}`}>¥{totalStats.balance.toLocaleString()}</h4>
                        </div>
                        <div className="bg-bvb-yellow p-5 rounded-2xl shadow-sm border border-bvb-black/10">
                            <p className="text-[10px] font-black text-bvb-black/60 uppercase tracking-widest mb-1">{selectedYear === 'all' ? '全部年度利润' : `${selectedYear}年度利润`}</p>
                            <h4 className="text-xl font-black text-bvb-black">¥{annualStats.profit.toLocaleString()}</h4>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        <div className="bg-white p-4 md:p-8 rounded-2xl shadow-sm border border-gray-200 min-h-[400px] md:min-h-[500px] flex flex-col">
                            <div className="flex justify-between items-start mb-4 md:mb-8">
                                <h4 className="text-[10px] md:text-sm font-black text-gray-400 uppercase tracking-widest leading-none">
                                    {selectedYear === 'all' ? '历年收支趋势' : `年度收支对比 (${selectedYear})`}
                                </h4>
                                <div className="flex gap-4 md:gap-6">
                                    <div className="text-right"><p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase">收入</p><p className="text-sm md:text-lg font-black text-green-600">¥{annualStats.income.toLocaleString()}</p></div>
                                    <div className="text-right"><p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase">支出</p><p className="text-sm md:text-lg font-black text-red-500">¥{annualStats.expense.toLocaleString()}</p></div>
                                </div>
                            </div>
                            <div className="flex-1 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart 
                                        data={monthlySummaryData} 
                                        margin={{ top: 10, right: 0, left: -20, bottom: 20 }}
                                        onClick={(data) => {
                                            if (data && data.activeTooltipIndex !== undefined) {
                                                if (selectedYear === 'all') {
                                                    const item = monthlySummaryData[data.activeTooltipIndex] as any;
                                                    if (item) {
                                                        const yearStr = item.year;
                                                        const year = parseInt(yearStr);
                                                        if (!isNaN(year)) setSelectedYear(year);
                                                    }
                                                } else {
                                                    setSelectedMonth(Number(data.activeTooltipIndex));
                                                }
                                            }
                                        }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey={selectedYear === 'all' ? 'year' : 'month'} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#6b7280' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9ca3af' }} />
                                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '11px' }} />
                                        <Legend iconType="circle" align="center" verticalAlign="bottom" wrapperStyle={{ paddingBottom: '10px' }} formatter={(value) => <span className="text-[11px] font-black uppercase tracking-wider text-gray-600 mr-4 ml-1">{value}</span>} />
                                        <Bar dataKey="income" name="收入" fill="#22C55E" radius={[4, 4, 0, 0]} barSize={selectedYear === 'all' ? 40 : 12} cursor="pointer" />
                                        <Bar dataKey="expense" name="支出" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={selectedYear === 'all' ? 40 : 12} cursor="pointer" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        {/* 年度收入分析 */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-3 md:p-5 border-b flex justify-between items-center bg-green-50/30">
                                <h4 className="font-black text-[11px] md:text-sm uppercase tracking-tighter md:tracking-widest flex items-center text-green-700">
                                    <ArrowUpRight className="w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2" /> 
                                    {selectedYear === 'all' ? '历年收入分析' : '年度收入分析'}
                                </h4>
                                <span className="text-[8px] md:text-[10px] font-black text-green-600 bg-white px-1.5 py-0.5 rounded border border-green-100">
                                    ¥{annualStats.income.toLocaleString()}
                                </span>
                            </div>
                            <div className="p-4 md:p-6">
                                {annualCategoryAnalysis.incomeData.length > 0 ? (
                                    <div className="flex flex-col sm:flex-row items-center gap-4">
                                        <div className="w-full sm:w-1/2 h-[240px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={annualCategoryAnalysis.incomeData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={90}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                    >
                                                        {annualCategoryAnalysis.incomeData.map((_, index) => (
                                                            <Cell key={`cell-${index}`} fill={['#22C55E', '#4ADE80', '#86EFAC', '#BBF7D0', '#DCFCE7'][index % 5]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="w-full sm:w-1/2 space-y-2.5 max-h-[240px] overflow-y-auto custom-scrollbar pr-2">
                                            {annualCategoryAnalysis.incomeData.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center group border-b border-gray-50 pb-1.5 last:border-0">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ['#22C55E', '#4ADE80', '#86EFAC', '#BBF7D0', '#DCFCE7'][idx % 5] }}></div>
                                                        <span className="text-xs font-bold text-gray-600 truncate max-w-[100px]">{item.name}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-black text-gray-800">¥{item.value.toLocaleString()}</p>
                                                        <p className="text-[9px] text-gray-400 font-bold">{item.percent}%</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-10 text-center text-gray-300 italic text-[11px]">暂无记录</div>
                                )}
                            </div>
                        </div>

                        {/* 年度支出分析 */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-3 md:p-5 border-b flex justify-between items-center bg-red-50/30">
                                <h4 className="font-black text-[11px] md:text-sm uppercase tracking-tighter md:tracking-widest flex items-center text-red-700">
                                    <ArrowDownRight className="w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2" /> 
                                    {selectedYear === 'all' ? '历年支出分析' : '年度支出分析'}
                                </h4>
                                <span className="text-[8px] md:text-[10px] font-black text-red-600 bg-white px-1.5 py-0.5 rounded border border-red-100">
                                    ¥{annualStats.expense.toLocaleString()}
                                </span>
                            </div>
                            <div className="p-4 md:p-6">
                                {annualCategoryAnalysis.expenseData.length > 0 ? (
                                    <div className="flex flex-col sm:flex-row items-center gap-4">
                                        <div className="w-full sm:w-1/2 h-[240px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={annualCategoryAnalysis.expenseData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={90}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                    >
                                                        {annualCategoryAnalysis.expenseData.map((_, index) => (
                                                            <Cell key={`cell-${index}`} fill={['#EF4444', '#F87171', '#FCA5A5', '#FECACA', '#FEE2E2'][index % 5]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="w-full sm:w-1/2 space-y-2.5 max-h-[240px] overflow-y-auto custom-scrollbar pr-2">
                                            {annualCategoryAnalysis.expenseData.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center group border-b border-gray-50 pb-1.5 last:border-0">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ['#EF4444', '#F87171', '#FCA5A5', '#FECACA', '#FEE2E2'][idx % 5] }}></div>
                                                        <span className="text-xs font-bold text-gray-600 truncate max-w-[100px]">{item.name}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-black text-gray-800">¥{item.value.toLocaleString()}</p>
                                                        <p className="text-[9px] text-gray-400 font-bold">{item.percent}%</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-10 text-center text-gray-300 italic text-[11px]">暂无记录</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 月度深度分析 */}
                    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                            <div>
                                <h4 className="text-base md:text-lg font-black text-gray-800 uppercase italic tracking-tighter flex items-center">
                                    <PieChartIcon className="w-5 h-5 md:w-6 md:h-6 mr-2 text-bvb-yellow" /> 
                                    {selectedYear === 'all' ? `历年 ${selectedMonth + 1}月 深度分析` : `${selectedYear}年 ${selectedMonth + 1}月 深度分析`}
                                </h4>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Monthly Category Breakdown & Distribution</p>
                            </div>
                            <div className="flex flex-wrap gap-4 md:gap-8">
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-gray-400 uppercase">月收入</p>
                                    <p className="text-lg md:text-2xl font-black text-green-600">¥{monthlyAnalysis.income.toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-gray-400 uppercase">月支出</p>
                                    <p className="text-lg md:text-2xl font-black text-red-500">¥{monthlyAnalysis.expense.toLocaleString()}</p>
                                </div>
                                <div className="text-right border-l pl-4 md:pl-8 border-gray-100">
                                    <p className="text-[10px] font-black text-gray-400 uppercase">月利润</p>
                                    <p className={`text-lg md:text-2xl font-black ${monthlyAnalysis.profit >= 0 ? 'text-bvb-black' : 'text-red-600'}`}>¥{monthlyAnalysis.profit.toLocaleString()}</p>
                                </div>
                                <div className="text-right border-l pl-4 md:pl-8 border-gray-100">
                                    <p className="text-[10px] font-black text-gray-400 uppercase">符合奖励充值人次</p>
                                    <div className="flex items-baseline justify-end gap-1">
                                        <p className="text-lg md:text-2xl font-black text-blue-600">{monthlyAnalysis.rechargeCount}</p>
                                        <p className="text-[10px] font-bold text-gray-400">/ {monthlyAnalysis.totalRecharges} 总人次</p>
                                    </div>
                                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter">阈值 ≥{salarySettings.quarterlyRenewalReward.minRechargeAmount || 0} 节/次</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
                            {/* 收入饼图与列表 */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
                                    <div className="w-2 h-4 bg-green-500 rounded-full"></div>
                                    <h5 className="text-xs font-black text-gray-700 uppercase tracking-wider">月度收入构成</h5>
                                </div>
                                <div className="flex flex-col md:flex-row gap-6 items-center">
                                    <div className="w-full md:w-1/2 h-[160px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={monthlyAnalysis.incomeData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={40}
                                                    outerRadius={65}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {monthlyAnalysis.incomeData.map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={['#22C55E', '#4ADE80', '#86EFAC', '#BBF7D0', '#DCFCE7'][index % 5]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="w-full md:w-1/2 space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-2">
                                        {monthlyAnalysis.incomeData.length > 0 ? monthlyAnalysis.incomeData.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center group border-b border-gray-50 pb-1 last:border-0">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#22C55E', '#4ADE80', '#86EFAC', '#BBF7D0', '#DCFCE7'][idx % 5] }}></div>
                                                    <span className="text-[10px] font-bold text-gray-600 group-hover:text-gray-900 transition-colors truncate max-w-[80px]">{item.name}</span>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-gray-800">¥{item.value.toLocaleString()}</p>
                                                    <p className="text-[8px] text-gray-400 font-bold">{item.percent}%</p>
                                                </div>
                                            </div>
                                        )) : <p className="text-xs text-gray-300 italic text-center py-8">本月无收入数据</p>}
                                    </div>
                                </div>
                            </div>

                            {/* 支出饼图与列表 */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
                                    <div className="w-2 h-4 bg-red-500 rounded-full"></div>
                                    <h5 className="text-xs font-black text-gray-700 uppercase tracking-wider">月度支出构成</h5>
                                </div>
                                <div className="flex flex-col md:flex-row gap-6 items-center">
                                    <div className="w-full md:w-1/2 h-[160px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={monthlyAnalysis.expenseData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={40}
                                                    outerRadius={65}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {monthlyAnalysis.expenseData.map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={['#EF4444', '#F87171', '#FCA5A5', '#FECACA', '#FEE2E2'][index % 5]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="w-full md:w-1/2 space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-2">
                                        {monthlyAnalysis.expenseData.length > 0 ? monthlyAnalysis.expenseData.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center group border-b border-gray-50 pb-1 last:border-0">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#EF4444', '#F87171', '#FCA5A5', '#FECACA', '#FEE2E2'][idx % 5] }}></div>
                                                    <span className="text-[10px] font-bold text-gray-600 group-hover:text-gray-900 transition-colors truncate max-w-[80px]">{item.name}</span>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-gray-800">¥{item.value.toLocaleString()}</p>
                                                    <p className="text-[8px] text-gray-400 font-bold">{item.percent}%</p>
                                                </div>
                                            </div>
                                        )) : <p className="text-xs text-gray-300 italic text-center py-8">本月无支出数据</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showAddModal && (
                // 记账 Modal 保持不变...
                <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-white w-full h-full md:h-auto md:max-w-lg md:rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
                        <div className={`${activeType === 'income' ? 'bg-green-600' : 'bg-red-600'} p-6 md:p-8 flex justify-between items-center text-white shrink-0`}>
                            <div><h3 className="font-black text-xl md:text-2xl flex items-center uppercase tracking-tighter italic"><Wallet className="w-5 h-5 md:w-6 md:h-6 mr-3" /> {activeType === 'income' ? '录入收入' : '录入支出'}</h3><p className="text-white/70 text-[10px] md:text-xs font-bold mt-1 uppercase tracking-widest">Entry Accounting Record</p></div>
                            <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-4 md:space-y-6 bg-gray-50/50 flex-1 overflow-y-auto pb-24 md:pb-8">
                            <div className="grid grid-cols-2 bg-gray-200 p-1 rounded-2xl mb-2"><button type="button" onClick={() => handleTypeChange('income')} className={`py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-black transition-all ${activeType === 'income' ? 'bg-white text-green-600 shadow-md scale-105' : 'text-gray-500'}`}>收入</button><button type="button" onClick={() => handleTypeChange('expense')} className={`py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-black transition-all ${activeType === 'expense' ? 'bg-white text-red-600 shadow-md scale-105' : 'text-gray-500'}`}>支出</button></div>
                            <div className="grid grid-cols-2 gap-3 md:gap-4">
                                <div><label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">发生日期</label><input type="date" required className="w-full p-2.5 md:p-3.5 border rounded-2xl font-bold bg-white text-xs md:text-sm outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
                                <div><label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">项目分类</label><select required className="w-full p-2.5 md:p-3.5 border rounded-2xl font-bold bg-white text-xs md:text-sm outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>{financeCategories.filter(c => c.type === activeType).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
                            </div>
                            <div><label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">摘要/明细</label><input required className="w-full p-2.5 md:p-3.5 border rounded-2xl font-bold bg-white text-xs md:text-sm outline-none focus:ring-2 focus:ring-bvb-yellow transition-all" placeholder="用途或来源..." value={formData.details} onChange={e => setFormData({...formData, details: e.target.value})} /></div>
                            <div className="grid grid-cols-2 gap-3 md:gap-4">
                                <div><label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">金额 (¥)</label><input type="number" step="0.01" required className="w-full p-2.5 md:p-3.5 border rounded-2xl font-black text-lg md:text-xl bg-white outline-none focus:ring-2 focus:ring-bvb-yellow transition-all" placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} /></div>
                                <div><label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">结算账户</label><input className="w-full p-2.5 md:p-3.5 border rounded-2xl font-bold bg-white text-xs md:text-sm outline-none" value={formData.account} onChange={e => setFormData({...formData, account: e.target.value})} /></div>
                            </div>
                            <button type="submit" className={`w-full py-3.5 md:py-4 ${activeType === 'income' ? 'bg-green-600' : 'bg-red-600'} text-white font-black rounded-2xl shadow-xl hover:brightness-110 active:scale-95 transition-all text-sm md:text-lg flex items-center justify-center gap-2`}><CheckSquare className="w-5 h-5 md:w-6 md:h-6" /> 确认入账</button>
                        </form>
                    </div>
                </div>
            )}

            {/* 导入确认和上传 Modal 保持不变... */}
            {importSummary && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-bvb-black p-6 md:p-8 flex justify-between items-center text-white shrink-0"><h3 className="font-black text-xl md:text-2xl flex items-center uppercase tracking-tighter italic"><Calculator className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3 text-bvb-yellow" /> 导入数据确认</h3><button onClick={() => setImportSummary(null)}><X className="w-6 h-6" /></button></div>
                        <div className="p-6 md:p-10 space-y-6 md:space-y-8 bg-gray-50/50 text-center"><p className="text-gray-500 font-bold text-sm md:text-base">解析成功！请确认汇总金额：</p><div className="grid grid-cols-2 gap-3 md:gap-4"><div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-green-100"><p className="text-[9px] md:text-[10px] font-black text-green-600 uppercase mb-2">收入</p><h4 className="text-lg md:text-2xl font-black text-green-800 leading-none">¥{importSummary.income.toLocaleString()}</h4></div><div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-red-100"><p className="text-[9px] md:text-[10px] font-black text-red-600 uppercase mb-2">支出</p><h4 className="text-lg md:text-2xl font-black text-red-800 leading-none">¥{importSummary.expense.toLocaleString()}</h4></div></div><div className="flex gap-3 md:gap-4 pt-2"><button onClick={() => setImportSummary(null)} className="flex-1 py-3 md:py-4 bg-gray-200 text-gray-600 font-black rounded-2xl transition-colors text-xs md:text-base">取消</button><button onClick={() => { onBulkAddTransactions(importSummary.tempTxs); setImportSummary(null); }} className="flex-[2] py-3 md:py-4 bg-bvb-yellow text-bvb-black font-black rounded-2xl shadow-lg hover:brightness-105 text-xs md:text-base">全部入账</button></div></div>
                    </div>
                </div>
            )}

            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-md overflow-hidden animate-in zoom-in-95 duration-200"><div className="bg-bvb-black p-5 md:p-6 flex justify-between items-center text-white shrink-0"><h3 className="font-black text-lg md:text-xl flex items-center uppercase italic tracking-tighter"><FileSpreadsheet className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3 text-bvb-yellow" /> 批量导入流水</h3><button onClick={() => setShowImportModal(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button></div><div className="p-6 md:p-8 space-y-4 md:space-y-6 bg-gray-50/50"><div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-100 text-center"><FileDown className="w-8 h-8 md:w-10 md:h-10 text-gray-300 mx-auto mb-3" /><h4 className="font-bold text-gray-800 mb-1 text-sm md:text-base">1. 准备 CSV 模版</h4><p className="text-[10px] md:text-xs text-gray-400 mb-4">下载标准格式模板并按要求填写</p><button onClick={() => { const headers = "日期,项目分类,摘要备注,收入金额,支出金额,结算账户\n"; const example = "2023-11-01,课时续费,张三续费50节,5200,,黔农云\n2023-11-02,租金支出,11月场地租金,,2000,黔农云\n"; const blob = new Blob(["\ufeff" + headers + example], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = '财务流水导入模板.csv'; link.click(); }} className="w-full py-2.5 md:py-3 bg-gray-100 text-gray-600 font-black rounded-xl hover:bg-gray-200 transition-all text-[10px] md:text-xs uppercase tracking-widest">下载模板</button></div><div className="relative group"><input type="file" accept=".csv" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handleImportCSV} /><div className="bg-bvb-yellow p-6 md:p-8 rounded-3xl border-4 border-dashed border-bvb-black/20 flex flex-col items-center justify-center text-bvb-black group-hover:scale-[1.02] transition-all"><Upload className="w-10 h-10 md:w-12 md:h-12 mb-2 md:mb-3" /><h4 className="font-black uppercase italic text-base md:text-lg">2. 点击上传</h4><p className="text-[9px] md:text-[10px] font-bold opacity-60 mt-1 uppercase">Process Batch Data</p></div></div></div></div>
                </div>
            )}

            {showAccountingModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-bvb-black p-6 flex justify-between items-center text-white">
                            <div>
                                <h3 className="font-black text-xl flex items-center uppercase tracking-tighter italic">
                                    <Briefcase className="w-5 h-5 mr-3 text-bvb-yellow" /> 
                                    {editingAccountingRecord ? '编辑会计账款' : '新增会计账款'}
                                </h3>
                            </div>
                            <button onClick={() => setShowAccountingModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleAccountingSubmit} className="p-8 space-y-6 bg-gray-50/50">
                            <div className="grid grid-cols-2 bg-gray-200 p-1 rounded-2xl">
                                <button type="button" onClick={() => setAccountingFormData({...accountingFormData, type: 'receivable'})} className={`py-2.5 rounded-xl text-xs font-black transition-all ${accountingFormData.type === 'receivable' ? 'bg-white text-green-600 shadow-md' : 'text-gray-500'}`}>应收 (AR)</button>
                                <button type="button" onClick={() => setAccountingFormData({...accountingFormData, type: 'payable'})} className={`py-2.5 rounded-xl text-xs font-black transition-all ${accountingFormData.type === 'payable' ? 'bg-white text-red-600 shadow-md' : 'text-gray-500'}`}>应付 (AP)</button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">发生日期</label>
                                    <input type="date" required className="w-full p-3 border rounded-2xl font-bold bg-white text-sm outline-none" value={accountingFormData.date} onChange={e => setAccountingFormData({...accountingFormData, date: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">账款金额</label>
                                    <input type="number" required className="w-full p-3 border rounded-2xl font-black text-sm bg-white outline-none" value={accountingFormData.amount} onChange={e => setAccountingFormData({...accountingFormData, amount: parseFloat(e.target.value) || 0})} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">对方单位/个人</label>
                                <input required className="w-full p-3 border rounded-2xl font-bold bg-white text-sm outline-none" placeholder="例如：某某赞助商、某某供应商" value={accountingFormData.entity} onChange={e => setAccountingFormData({...accountingFormData, entity: e.target.value})} />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">摘要明细</label>
                                <input required className="w-full p-3 border rounded-2xl font-bold bg-white text-sm outline-none" placeholder="账款的具体内容说明" value={accountingFormData.details} onChange={e => setAccountingFormData({...accountingFormData, details: e.target.value})} />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">对应财务分类 (用于结算时入账)</label>
                                <select required className="w-full p-3 border rounded-2xl font-bold bg-white text-sm outline-none" value={accountingFormData.category} onChange={e => setAccountingFormData({...accountingFormData, category: e.target.value})}>
                                    <option value="">请选择分类</option>
                                    {financeCategories.filter(c => c.type === (accountingFormData.type === 'receivable' ? 'income' : 'expense')).map(c => (
                                        <option key={c.id} value={c.id}>{c.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-4">
                                <button type="button" onClick={() => setShowAccountingModal(false)} className="flex-1 py-4 bg-gray-200 text-gray-600 font-black rounded-2xl transition-colors">取消</button>
                                <button type="submit" className="flex-[2] py-4 bg-bvb-yellow text-bvb-black font-black rounded-2xl shadow-lg hover:brightness-105 transition-all">保存账款</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinanceManager;
