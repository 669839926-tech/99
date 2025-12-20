
import React, { useState, useMemo } from 'react';
import { Player, Team, AttributeConfig, AttributeCategory, TrainingSession, TechTestDefinition, JugglingRecord, HomeTrainingLog } from '../types';
import { User, LogOut, Activity, Calendar, Trophy, History, Clock, TrendingUp, Medal, Plus, Send, Target, ChevronLeft, ChevronRight } from 'lucide-react';
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
    const [activeRadar, setActiveRadar] = useState<'overall' | 'technical' | 'tactical' | 'physical' | 'mental'>('overall');
    
    // Growth entry state
    const [jugglingCount, setJugglingCount] = useState('');
    const [jugglingDate, setJugglingDate] = useState(new Date().toISOString().split('T')[0]);
    const [homeTitle, setHomeTitle] = useState('');
    const [homeDate, setHomeDate] = useState(new Date().toISOString().split('T')[0]);
    const [homeDuration, setHomeDuration] = useState('30');

    const statsSource = player.lastPublishedStats || { technical: {}, tactical: {}, physical: {}, mental: {} };

    const handleAddJuggling = () => {
        const count = parseInt(jugglingCount);
        if (!isNaN(count)) {
            const record: JugglingRecord = { id: Date.now().toString(), playerId: player.id, date: jugglingDate, count };
            const updated = { ...player, jugglingHistory: [...(player.jugglingHistory || []), record] };
            onUpdatePlayer(updated);
            setJugglingCount('');
            alert('颠球记录已保存！');
        }
    };

    const handleAddHomeLog = () => {
        if (homeTitle.trim()) {
            const log: HomeTrainingLog = { id: Date.now().toString(), playerId: player.id, date: homeDate, title: homeTitle, duration: parseInt(homeDuration) };
            const updated = { ...player, homeTrainingLogs: [...(player.homeTrainingLogs || []), log] };
            onUpdatePlayer(updated);
            setHomeTitle('');
            alert('居家训练打卡成功！');
        }
    };

    const jugglingTrendData = useMemo(() => {
        return (player.jugglingHistory || []).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-15);
    }, [player.jugglingHistory]);

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

            <main className="flex-1 p-4 overflow-y-auto">
                <div className="max-w-5xl mx-auto space-y-6">
                    {activeTab === 'overview' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                             {/* Player Header Card */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden">
                                <div className="relative">
                                    <img src={player.image} alt={player.name} className="w-32 h-32 rounded-full object-cover border-4 border-bvb-yellow shadow-lg" />
                                    <div className="absolute -bottom-2 -right-2 bg-bvb-black text-white w-10 h-10 rounded-full flex items-center justify-center font-black border-2 border-white">{player.number}</div>
                                </div>
                                <div className="text-center md:text-left z-10">
                                    <h2 className="text-3xl font-black text-gray-900 mb-1">{player.name}</h2>
                                    <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
                                        <span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold text-gray-600 border border-gray-200">{team?.name || '未知梯队'}</span>
                                        <span className="bg-bvb-yellow px-2 py-1 rounded text-xs font-bold text-bvb-black">{player.position}</span>
                                    </div>
                                    <div className="inline-flex items-center bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
                                        <div className="text-left mr-6"><span className="block text-[10px] font-bold text-gray-400 uppercase">剩余课时</span><span className={`block text-xl font-black ${player.credits <= 5 ? 'text-red-500' : 'text-gray-800'}`}>{player.credits} <span className="text-xs font-bold text-gray-400">节</span></span></div>
                                        <div className="text-left pl-6 border-l border-gray-200"><span className="block text-[10px] font-bold text-gray-400 uppercase">有效期至</span><span className="block text-sm font-bold text-gray-800 font-mono">{player.validUntil}</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'growth' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Juggling Entry */}
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                                    <h3 className="font-bold text-gray-800 mb-4 flex items-center uppercase tracking-widest text-xs"><Medal className="w-5 h-5 mr-2 text-bvb-yellow" /> 颠球挑战录入</h3>
                                    <div className="space-y-3">
                                        <div className="flex gap-2">
                                            <input type="date" className="flex-1 p-3 border rounded-xl text-sm font-bold bg-gray-50" value={jugglingDate} onChange={e => setJugglingDate(e.target.value)} />
                                            <input type="number" className="w-24 p-3 border rounded-xl outline-none focus:ring-2 focus:ring-bvb-yellow font-black text-center" placeholder="个数" value={jugglingCount} onChange={e => setJugglingCount(e.target.value)} />
                                        </div>
                                        <button onClick={handleAddJuggling} className="w-full bg-bvb-black text-bvb-yellow font-black py-3 rounded-xl flex items-center justify-center gap-2"><Plus className="w-4 h-4"/> 记录并保存</button>
                                    </div>
                                    {jugglingTrendData.length > 0 && (
                                        <div className="h-40 mt-6">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={jugglingTrendData}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                                    <XAxis dataKey="date" hide />
                                                    <YAxis hide domain={['auto', 'auto']} />
                                                    <Tooltip contentStyle={{ borderRadius: '12px' }} />
                                                    <Line type="monotone" dataKey="count" stroke="#000" strokeWidth={3} dot={{ fill: '#FDE100', stroke: '#000', strokeWidth: 2 }} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                </div>

                                {/* Home Training Entry */}
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                                    <h3 className="font-bold text-gray-800 mb-4 flex items-center uppercase tracking-widest text-xs"><TrendingUp className="w-5 h-5 mr-2 text-bvb-yellow" /> 居家练习打卡</h3>
                                    <div className="space-y-3">
                                        <input type="date" className="w-full p-3 border rounded-xl text-sm font-bold bg-gray-50" value={homeDate} onChange={e => setHomeDate(e.target.value)} />
                                        <input className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-bvb-yellow font-bold text-sm" placeholder="练习主题（如：拉球转身100次）" value={homeTitle} onChange={e => setHomeTitle(e.target.value)} />
                                        <div className="flex gap-2">
                                            <select className="flex-1 p-3 border rounded-xl font-bold bg-gray-50 text-sm" value={homeDuration} onChange={e => setHomeDuration(e.target.value)}>
                                                <option value="15">15 分钟</option>
                                                <option value="30">30 分钟</option>
                                                <option value="45">45 分钟</option>
                                                <option value="60">60+ 分钟</option>
                                            </select>
                                            <button onClick={handleAddHomeLog} className="bg-bvb-yellow text-bvb-black font-black px-6 rounded-xl flex items-center gap-2 shadow-sm"><Send className="w-4 h-4"/> 补录打卡</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4">
                             <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center uppercase tracking-widest text-xs"><Activity className="w-5 h-5 mr-2 text-bvb-yellow" /> 居家练习历史记录</h3>
                                <div className="space-y-2">
                                    {(player.homeTrainingLogs || []).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(log => (
                                        <div key={log.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                            <div>
                                                <p className="font-black text-gray-800 text-sm">{log.title}</p>
                                                <p className="text-[10px] text-gray-400 font-mono">{log.date}</p>
                                            </div>
                                            <span className="text-xs font-black text-bvb-black bg-bvb-yellow/20 px-2 py-0.5 rounded">{log.duration}min</span>
                                        </div>
                                    ))}
                                    {(player.homeTrainingLogs || []).length === 0 && <p className="text-center py-10 text-gray-400 italic">暂无居家打卡记录</p>}
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
