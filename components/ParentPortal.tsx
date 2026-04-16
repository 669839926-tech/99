
import React, { useState, useMemo } from 'react';
import { Player, Team, JugglingRecord, HomeTrainingLog } from '../types';
import { LogOut, Activity, TrendingUp, Medal, Plus, CheckCircle } from 'lucide-react';

interface ParentPortalProps {
    player: Player;
    team?: Team;
    onLogout: () => void;
    appLogo?: string;
    onUpdatePlayer: (player: Player) => void;
    trainings: TrainingSession[];
}

const ParentPortal: React.FC<ParentPortalProps> = ({ player, team, onLogout, appLogo, onUpdatePlayer, trainings }) => {
    
    const [activeTab, setActiveTab] = useState<'overview' | 'growth' | 'history'>('overview');
    
    // Growth entry state
    const [jugglingCount, setJugglingCount] = useState('');
    const [jugglingDate, setJugglingDate] = useState(new Date().toISOString().split('T')[0]);
    const [homeTitle, setHomeTitle] = useState('居家练习');
    const [homeDate, setHomeDate] = useState(new Date().toISOString().split('T')[0]);

    const handleAddJuggling = () => {
        const count = parseInt(jugglingCount);
        if (!isNaN(count)) {
            const record: JugglingRecord = { id: `jug-${Date.now()}`, playerId: player.id, date: jugglingDate, count };
            const updated = { ...player, jugglingHistory: [...(player.jugglingHistory || []), record] };
            onUpdatePlayer(updated);
            setJugglingCount('');
            alert('颠球记录已保存！');
        }
    };

    const handleAddHomeLog = () => {
        if (homeTitle.trim()) {
            const alreadyDone = (player.homeTrainingLogs || []).some(l => l.date === homeDate);
            if (alreadyDone) {
                alert(`当日（${homeDate}）已完成打卡记录。球员每日仅限打卡一次，请保持规律训练！`);
                return;
            }
            const log: HomeTrainingLog = { id: `home-${Date.now()}`, playerId: player.id, date: homeDate, title: homeTitle, duration: 0 };
            const updated = { ...player, homeTrainingLogs: [...(player.homeTrainingLogs || []), log] };
            onUpdatePlayer(updated);
            setHomeTitle('居家练习');
            alert('打卡成功！计入一次有效频次。');
        }
    };

    const monthlyCount = useMemo(() => {
        const currentMonth = new Date().toISOString().split('T')[0].substring(0, 7);
        return (player.homeTrainingLogs || []).filter(l => l.date.startsWith(currentMonth)).length;
    }, [player.homeTrainingLogs]);

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            <header className="bg-bvb-black text-white p-4 sticky top-0 z-20 shadow-md">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <div className="flex items-center">
                        <img src={appLogo} alt="Club Logo" className="w-10 h-10 object-contain mr-3" />
                        <div>
                            <h1 className="font-bold text-lg leading-tight">家长端</h1>
                            <p className="text-xs text-gray-400">顽石之光青训系统</p>
                        </div>
                    </div>
                    <button onClick={onLogout} className="flex items-center px-3 py-1.5 bg-gray-800 rounded-lg text-xs font-bold hover:bg-red-900/50 hover:text-red-300 transition-colors"><LogOut className="w-3 h-3 mr-1" /> 退出</button>
                </div>
            </header>

            <nav className="bg-white border-b border-gray-200 flex justify-center shrink-0">
                <button onClick={() => setActiveTab('overview')} className={`px-6 py-4 text-sm font-bold border-b-4 transition-all ${activeTab === 'overview' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-400'}`}>档案概览</button>
                <button onClick={() => setActiveTab('growth')} className={`px-6 py-4 text-sm font-bold border-b-4 transition-all ${activeTab === 'growth' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-400'}`}>技术成长</button>
                <button onClick={() => setActiveTab('history')} className={`px-6 py-4 text-sm font-bold border-b-4 transition-all ${activeTab === 'history' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-400'}`}>训练历史</button>
            </nav>

            <main className="flex-1 p-4 overflow-y-auto pb-20">
                <div className="max-w-5xl mx-auto space-y-6">
                    {activeTab === 'growth' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4">
                            <div className="bg-bvb-black text-white p-6 rounded-3xl shadow-xl flex items-center justify-between overflow-hidden relative">
                                <div>
                                    <p className="text-bvb-yellow text-[10px] font-black uppercase tracking-widest mb-1">本月居家达标</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-5xl font-black">{monthlyCount}</span>
                                        <span className="text-xl font-bold text-gray-400">次</span>
                                    </div>
                                </div>
                                <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
                                    <TrendingUp className="w-10 h-10 text-bvb-yellow" />
                                </div>
                                <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-bvb-yellow opacity-5 rounded-full blur-2xl"></div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
                                    <h3 className="font-bold text-gray-800 mb-4 flex items-center uppercase tracking-widest text-xs"><Medal className="w-5 h-5 mr-2 text-bvb-yellow" /> 颠球挑战录入</h3>
                                    <div className="space-y-3">
                                        <div className="flex gap-2">
                                            <input type="date" className="flex-1 p-3 border rounded-xl text-sm font-bold bg-gray-50 focus:ring-2 focus:ring-bvb-yellow outline-none" value={jugglingDate} onChange={e => setJugglingDate(e.target.value)} />
                                            <input type="number" className="w-24 p-3 border rounded-xl outline-none focus:ring-2 focus:ring-bvb-yellow font-black text-center" placeholder="个数" value={jugglingCount} onChange={e => setJugglingCount(e.target.value)} />
                                        </div>
                                        <button onClick={handleAddJuggling} className="w-full bg-bvb-black text-bvb-yellow font-black py-3 rounded-xl flex items-center justify-center gap-2 hover:brightness-110 transition-all"><Plus className="w-4 h-4"/> 保存颠球成绩</button>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
                                    <h3 className="font-bold text-gray-800 mb-4 flex items-center uppercase tracking-widest text-xs"><Activity className="w-5 h-5 mr-2 text-bvb-yellow" /> 居家训练打卡</h3>
                                    <div className="space-y-3">
                                        <input type="date" className="w-full p-3 border rounded-xl text-sm font-bold bg-gray-50 focus:ring-2 focus:ring-bvb-yellow outline-none" value={homeDate} onChange={e => setHomeDate(e.target.value)} />
                                        <input className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-bvb-yellow font-bold text-sm bg-gray-50" placeholder="简单描述内容（如：传球练习）" value={homeTitle} onChange={e => setHomeTitle(e.target.value)} />
                                        <button onClick={handleAddHomeLog} className="w-full bg-bvb-yellow text-bvb-black font-black py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"><CheckCircle className="w-4 h-4"/> 确认今日练习完成</button>
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-bold mt-3 text-center italic">球员每日仅可打卡一次，保持科学训练频次</p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'overview' && (
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 animate-in slide-in-from-right-4">
                            <div className="flex flex-col md:flex-row gap-6 items-center">
                                <img src={player.image} className="w-32 h-32 rounded-full border-4 border-bvb-yellow shadow-lg object-cover" />
                                <div className="text-center md:text-left flex-1">
                                    <h2 className="text-3xl font-black text-gray-800">{player.name} <span className="text-sm font-bold text-gray-400 font-mono">#{player.number}</span></h2>
                                    <p className="text-gray-500 font-bold uppercase tracking-wider">{player.position} • {team?.name}</p>
                                    <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-4">
                                        <div className="bg-gray-50 px-5 py-3 rounded-2xl border border-gray-100 shadow-sm"><p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">可用课时</p><p className="text-2xl font-black text-bvb-black">{player.credits}</p></div>
                                        <div className="bg-blue-50 px-5 py-3 rounded-2xl border border-blue-100 shadow-sm">
                                            <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest mb-1">最新赠予请假额度</p>
                                            <p className="text-2xl font-black text-blue-600">{player.remainingLeaveQuota}</p>
                                            <p className="text-[7px] text-blue-400/60 mt-1 font-bold">* 充值后额度将更新重置</p>
                                        </div>
                                        <div className="bg-gray-50 px-5 py-3 rounded-2xl border border-gray-100 shadow-sm"><p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">本季进球</p><p className="text-2xl font-black text-gray-800">{player.goals}</p></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'history' && (
                         <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 animate-in slide-in-from-right-4">
                            <h3 className="font-bold text-gray-800 mb-6 flex items-center uppercase tracking-widest text-xs"><Activity className="w-5 h-5 mr-2 text-bvb-yellow" /> 变动记录</h3>
                            
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 border-b pb-1">训练与课时记录</h4>
                                    <div className="space-y-2">
                                        {(() => {
                                            const events: any[] = [];
                                            (player.rechargeHistory || []).forEach(r => events.push({ type: 'recharge', date: r.date, amount: r.amount, title: '账户充值', note: `赠予请假 ${r.quotaAdded}次` }));
                                            trainings.forEach(t => {
                                                const record = t.attendance?.find(att => att.playerId === player.id);
                                                if (record && record.status !== 'Absent') {
                                                    const cost = record.creditCost || 1;
                                                    events.push({ 
                                                        type: 'training', 
                                                        date: t.date, 
                                                        title: t.title, 
                                                        status: record.status,
                                                        amount: record.status === 'Present' ? -cost : (record.status === 'Leave' ? 0 : 0),
                                                        note: record.status === 'Present' ? `扣除 ${cost} 课时` : (record.status === 'Leave' ? '请假 (消耗额度)' : '伤停')
                                                    });
                                                }
                                            });
                                            
                                            return events.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((e, idx) => (
                                                <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl border border-gray-100">
                                                    <div>
                                                        <p className="font-black text-gray-800 text-sm">{e.title}</p>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-[10px] text-gray-400 font-mono">{e.date}</p>
                                                            <span className="text-[9px] font-bold text-gray-400 bg-gray-200 px-1.5 rounded-sm">{e.note}</span>
                                                        </div>
                                                    </div>
                                                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${e.amount > 0 ? 'bg-blue-100 text-blue-700' : e.amount < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-500'}`}>
                                                        {e.amount > 0 ? `+${e.amount}` : e.amount === 0 ? '0' : e.amount}
                                                    </div>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 border-b pb-1">居家训练打卡</h4>
                                    <div className="space-y-2">
                                        {(player.homeTrainingLogs || []).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(log => (
                                            <div key={log.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl border border-gray-100">
                                                <div>
                                                    <p className="font-black text-gray-800 text-sm">{log.title}</p>
                                                    <p className="text-[10px] text-gray-400 font-mono">{log.date}</p>
                                                </div>
                                                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">计次 +1</div>
                                            </div>
                                        ))}
                                        {(player.homeTrainingLogs || []).length === 0 && <p className="text-center py-4 text-gray-400 italic text-[10px]">暂无打卡记录</p>}
                                    </div>
                                </div>
                            </div>
                         </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ParentPortal;
