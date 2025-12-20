
import React, { useState, useMemo } from 'react';
import { Player, Team, AttributeConfig, AttributeCategory, TrainingSession, TechTestDefinition, JugglingRecord, HomeTrainingLog } from '../types';
import { User, LogOut, Activity, Calendar, Trophy, History, Clock, TrendingUp, Medal, Plus, Send, Target, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface ParentPortalProps {
    player: Player;
    team?: Team;
    attributeConfig: AttributeConfig;
    trainings: TrainingSession[];
    onLogout: () => void;
    appLogo?: string;
    techTests?: TechTestDefinition[];
    onUpdatePlayer: (player: Player) => void;
}

const ParentPortal: React.FC<ParentPortalProps> = ({ player, team, attributeConfig, trainings, onLogout, appLogo, techTests = [], onUpdatePlayer }) => {
    
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
            // 检查重复打卡
            const alreadyDone = (player.homeTrainingLogs || []).some(l => l.date === homeDate);
            if (alreadyDone) {
                alert('该日期已完成打卡，请勿重复提交。');
                return;
            }
            const log: HomeTrainingLog = { id: `home-${Date.now()}`, playerId: player.id, date: homeDate, title: homeTitle, duration: 0 };
            const updated = { ...player, homeTrainingLogs: [...(player.homeTrainingLogs || []), log] };
            onUpdatePlayer(updated);
            setHomeTitle('居家练习');
            alert('居家训练确认完成！计入一次有效频次。');
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
                            
                            {/* Monthly Count Card */}
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
                                {/* Juggling Entry */}
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

                                {/* Home Training Entry (Simplified) */}
                                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
                                    <h3 className="font-bold text-gray-800 mb-4 flex items-center uppercase tracking-widest text-xs"><Activity className="w-5 h-5 mr-2 text-bvb-yellow" /> 居家训练打卡</h3>
                                    <div className="space-y-3">
                                        <input type="date" className="w-full p-3 border rounded-xl text-sm font-bold bg-gray-50 focus:ring-2 focus:ring-bvb-yellow outline-none" value={homeDate} onChange={e => setHomeDate(e.target.value)} />
                                        <input className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-bvb-yellow font-bold text-sm bg-gray-50" placeholder="简单描述内容（如：传球练习）" value={homeTitle} onChange={e => setHomeTitle(e.target.value)} />
                                        <button onClick={handleAddHomeLog} className="w-full bg-bvb-yellow text-bvb-black font-black py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"><CheckCircle className="w-4 h-4"/> 确认今日练习完成</button>
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-bold mt-3 text-center italic">确认打卡后，系统将为您增加一次成长计次</p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* ... 其他 Tab 保持一致 ... */}
                    {activeTab === 'history' && (
                         <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 animate-in slide-in-from-right-4">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center uppercase tracking-widest text-xs"><Activity className="w-5 h-5 mr-2 text-bvb-yellow" /> 训练计次详情</h3>
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
                                {(player.homeTrainingLogs || []).length === 0 && <p className="text-center py-10 text-gray-400 italic text-sm">暂无打卡记录，开启第一步吧！</p>}
                            </div>
                         </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ParentPortal;
