
import React, { useState } from 'react';
import { Player, Team, AttributeConfig, AttributeCategory, TrainingSession } from '../types';
import { User, LogOut, Activity, Calendar, Trophy, History, Clock } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface ParentPortalProps {
    player: Player;
    team?: Team;
    attributeConfig: AttributeConfig;
    trainings: TrainingSession[];
    onLogout: () => void;
    appLogo?: string;
}

const ParentPortal: React.FC<ParentPortalProps> = ({ player, team, attributeConfig, trainings, onLogout, appLogo }) => {
    
    // State to toggle between radar views
    const [activeRadar, setActiveRadar] = useState<'overall' | 'technical' | 'tactical' | 'physical' | 'mental'>('overall');

    // Source of truth for parents is ONLY the published stats
    const statsSource = player.lastPublishedStats || {
         technical: {}, tactical: {}, physical: {}, mental: {}
    };

    // --- Stats Helpers ---
    const getAvg = (category: AttributeCategory) => {
        const values = Object.values(statsSource[category] || {}) as number[];
        if (values.length === 0) return 0;
        return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1));
    };

    // Data for Overall Radar
    const overviewData = [
        { subject: '技术', A: getAvg('technical'), fullMark: 10 },
        { subject: '战术', A: getAvg('tactical'), fullMark: 10 },
        { subject: '身体', A: getAvg('physical'), fullMark: 10 },
        { subject: '心理', A: getAvg('mental'), fullMark: 10 },
    ];

    // Helper to get specific category radar data
    const getCategoryRadarData = (category: AttributeCategory) => {
        return attributeConfig[category].map(attr => ({
            subject: attr.label,
            A: statsSource[category][attr.key] || 0,
            fullMark: 10
        }));
    };

    // Determine current radar data based on active tab
    const currentRadarData = activeRadar === 'overall' 
        ? overviewData 
        : getCategoryRadarData(activeRadar as AttributeCategory);

    // --- Attendance Calculation ---
    const recentTrainings = trainings
        .filter(t => t.teamId === player.teamId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10); // Last 10 sessions

    const getStatus = (t: TrainingSession) => {
        return t.attendance?.find(r => r.playerId === player.id)?.status || 'Absent';
    };
    
    // Only show published reviews
    const publishedReviews = player.reviews?.filter(r => r.status === 'Published') || [];

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            {/* Header */}
            <header className="bg-bvb-black text-white p-4 sticky top-0 z-20 shadow-md">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <div className="flex items-center">
                        <img src={appLogo} alt="Club Logo" className="w-10 h-10 object-contain mr-3" />
                        <div>
                            <h1 className="font-bold text-lg leading-tight">家长端</h1>
                            <p className="text-xs text-gray-400">顽石之光青训系统</p>
                        </div>
                    </div>
                    <button 
                        onClick={onLogout}
                        className="flex items-center px-3 py-1.5 bg-gray-800 rounded-lg text-xs font-bold hover:bg-red-900/50 hover:text-red-300 transition-colors"
                    >
                        <LogOut className="w-3 h-3 mr-1" /> 退出
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 p-4 overflow-y-auto">
                <div className="max-w-5xl mx-auto space-y-6">
                    
                    {/* Player Header Card */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden">
                        <div className="relative">
                            <img src={player.image} alt={player.name} className="w-32 h-32 rounded-full object-cover border-4 border-bvb-yellow shadow-lg" />
                            <div className="absolute -bottom-2 -right-2 bg-bvb-black text-white w-10 h-10 rounded-full flex items-center justify-center font-black border-2 border-white">
                                {player.number}
                            </div>
                        </div>
                        <div className="text-center md:text-left z-10">
                            <h2 className="text-3xl font-black text-gray-900 mb-1">{player.name}</h2>
                            <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
                                <span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold text-gray-600 border border-gray-200">
                                    {team?.name || '未知梯队'}
                                </span>
                                <span className="bg-bvb-yellow px-2 py-1 rounded text-xs font-bold text-bvb-black">
                                    {player.position}
                                </span>
                                <span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold text-gray-600">
                                    {player.age} 岁
                                </span>
                            </div>
                            
                            {/* Credits Info */}
                            <div className="inline-flex items-center bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
                                <div className="text-left mr-6">
                                    <span className="block text-[10px] font-bold text-gray-400 uppercase">剩余课时</span>
                                    <span className={`block text-xl font-black ${player.credits <= 5 ? 'text-red-500' : 'text-gray-800'}`}>
                                        {player.credits} <span className="text-xs font-bold text-gray-400">节</span>
                                    </span>
                                </div>
                                <div className="text-left pl-6 border-l border-gray-200">
                                    <span className="block text-[10px] font-bold text-gray-400 uppercase">有效期至</span>
                                    <span className="block text-sm font-bold text-gray-800 font-mono">{player.validUntil}</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Bg Decoration */}
                        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-bvb-yellow/10 to-transparent pointer-events-none"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Ability Radar (Multi-View) */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col h-[400px]">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-gray-800 flex items-center">
                                    <Activity className="w-5 h-5 mr-2 text-bvb-yellow" /> 能力评估图谱
                                </h3>
                            </div>
                            
                            {/* Tabs */}
                            <div className="flex overflow-x-auto no-scrollbar gap-2 mb-4 pb-1">
                                {[
                                    { id: 'overall', label: '综合' },
                                    { id: 'technical', label: '技术' },
                                    { id: 'tactical', label: '战术' },
                                    { id: 'physical', label: '身体' },
                                    { id: 'mental', label: '心理' },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveRadar(tab.id as any)}
                                        className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                                            activeRadar === tab.id 
                                            ? 'bg-bvb-black text-bvb-yellow' 
                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {player.lastPublishedStats ? (
                                <>
                                    <div className="flex-1 min-h-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={currentRadarData}>
                                                <PolarGrid stroke="#e5e7eb" />
                                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#4b5563', fontWeight: 'bold', fontSize: 10 }} />
                                                <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                                                <Radar 
                                                    key={activeRadar} // Key forces animation re-render on tab change
                                                    name={activeRadar} 
                                                    dataKey="A" 
                                                    stroke="#000" 
                                                    strokeWidth={3} 
                                                    fill="#FDE100" 
                                                    fillOpacity={0.6} 
                                                />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <p className="text-center text-xs text-gray-400 mt-2 italic">
                                        {activeRadar === 'overall' ? '显示各维度平均水平' : '显示具体细分项能力分布 (不显示具体数值)'}
                                    </p>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                                    <Activity className="w-12 h-12 mb-2 opacity-20" />
                                    <p>暂无已发布的能力评估数据</p>
                                </div>
                            )}
                        </div>

                        {/* Recent Attendance */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 h-[400px] flex flex-col">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center shrink-0">
                                <Calendar className="w-5 h-5 mr-2 text-bvb-yellow" /> 近期考勤记录
                            </h3>
                            <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 pr-2">
                                {recentTrainings.length > 0 ? recentTrainings.map(t => {
                                    const status = getStatus(t);
                                    return (
                                        <div key={t.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <div>
                                                <div className="font-bold text-sm text-gray-800">{t.title}</div>
                                                <div className="text-xs text-gray-500">{t.date}</div>
                                            </div>
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                status === 'Present' ? 'bg-green-100 text-green-700' :
                                                status === 'Leave' ? 'bg-yellow-100 text-yellow-700' :
                                                status === 'Injury' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-500'
                                            }`}>
                                                {status === 'Present' ? '出席' : status === 'Leave' ? '请假' : status === 'Injury' ? '伤病' : '缺席'}
                                            </span>
                                        </div>
                                    )
                                }) : <p className="text-gray-400 text-sm">暂无记录</p>}
                            </div>
                        </div>
                    </div>

                    {/* All Reviews */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                            <Trophy className="w-5 h-5 mr-2 text-bvb-yellow" /> 教练点评历史
                        </h3>
                        {publishedReviews.length > 0 ? (
                            <div className="space-y-6">
                                {publishedReviews.sort((a,b) => b.year - a.year || b.quarter.localeCompare(a.quarter)).map(review => (
                                    <div key={review.id} className="border-b border-gray-100 last:border-b-0 pb-6 last:pb-0">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="bg-bvb-black text-bvb-yellow px-2 py-1 rounded text-xs font-bold">
                                                {review.year} {review.quarter}
                                            </span>
                                            <span className="text-xs text-gray-400">{review.date}</span>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 space-y-3">
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">技战术表现</h4>
                                                <p className="text-sm text-gray-700 leading-relaxed">{review.technicalTacticalImprovement}</p>
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">心理成长</h4>
                                                <p className="text-sm text-gray-700 leading-relaxed">{review.mentalDevelopment}</p>
                                            </div>
                                            <div className="border-t border-gray-200 pt-2 mt-2">
                                                 <p className="text-sm font-bold text-gray-800 italic">"{review.summary}"</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-400 text-sm">暂无已发布的点评记录。</p>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ParentPortal;
