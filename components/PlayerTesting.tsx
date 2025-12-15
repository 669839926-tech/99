
import React, { useState, useMemo } from 'react';
import { Player, SkillTest, SkillTestRecord, HomeTrainingRecord, Team, User } from '../types';
import { Timer, Calendar, CheckCircle, Plus, Trash2, TrendingUp, Filter, Home, Dumbbell, ChevronDown, ChevronUp } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface PlayerTestingProps {
    players: Player[];
    teams: Team[];
    skillTests: SkillTest[];
    skillTestRecords: SkillTestRecord[];
    homeTrainingRecords: HomeTrainingRecord[];
    currentUser: User | null;
    onAddHomeTraining: (record: HomeTrainingRecord) => void;
    onAddSkillTestRecord: (record: SkillTestRecord) => void;
    onDeleteSkillTestRecord: (id: string) => void;
    onAddSkillTest: (test: SkillTest) => void;
}

const PlayerTesting: React.FC<PlayerTestingProps> = ({
    players, teams, skillTests, skillTestRecords, homeTrainingRecords, currentUser,
    onAddHomeTraining, onAddSkillTestRecord, onDeleteSkillTestRecord, onAddSkillTest
}) => {
    const [activeTab, setActiveTab] = useState<'home' | 'skill'>('home');
    
    // --- Shared State ---
    const [selectedTeamId, setSelectedTeamId] = useState<string>(currentUser?.teamId || 'all');
    const [selectedPlayerId, setSelectedPlayerId] = useState<string>('all');

    // --- Home Training State ---
    const [homeTrainingForm, setHomeTrainingForm] = useState({
        playerId: '',
        date: new Date().toISOString().split('T')[0],
        content: ''
    });
    const [homeStatsRange, setHomeStatsRange] = useState<'week' | 'month' | 'year'>('month');

    // --- Skill Test State ---
    const [skillTestForm, setSkillTestForm] = useState({
        playerId: '',
        testId: skillTests[0]?.id || '',
        date: new Date().toISOString().split('T')[0],
        value: ''
    });
    const [showNewTestModal, setShowNewTestModal] = useState(false);
    const [newTestForm, setNewTestForm] = useState({ name: '', unit: '', category: 'technical' as 'technical' | 'physical' });

    // --- Filter Logic ---
    const filteredPlayers = useMemo(() => {
        return players.filter(p => selectedTeamId === 'all' || p.teamId === selectedTeamId);
    }, [players, selectedTeamId]);

    // --- Home Training Logic ---
    const handleHomeTrainingSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (homeTrainingForm.playerId) {
            onAddHomeTraining({
                id: Date.now().toString(),
                playerId: homeTrainingForm.playerId,
                date: homeTrainingForm.date,
                count: 1, // Fixed count as 1 for a single check-in
                content: homeTrainingForm.content
            });
            // Reset but keep date
            setHomeTrainingForm(prev => ({ ...prev, content: '' }));
            alert('打卡成功！');
        }
    };

    const homeStatsData = useMemo(() => {
        const now = new Date();
        const isInRange = (dateStr: string) => {
            const d = new Date(dateStr);
            if (homeStatsRange === 'week') {
                const diff = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
                return diff <= 7;
            } else if (homeStatsRange === 'month') {
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            } else {
                return d.getFullYear() === now.getFullYear();
            }
        };

        if (selectedPlayerId === 'all') {
            // Leaderboard Mode: Count total check-ins per player
            const map: Record<string, number> = {};
            homeTrainingRecords.forEach(r => {
                const p = players.find(pl => pl.id === r.playerId);
                if (p && (selectedTeamId === 'all' || p.teamId === selectedTeamId)) {
                    if (isInRange(r.date)) {
                        map[p.name] = (map[p.name] || 0) + 1; 
                    }
                }
            });
            return Object.keys(map).map(k => ({ name: k, count: map[k] })).sort((a,b) => b.count - a.count).slice(0, 10);
        } else {
            // Trend Mode for Single Player: Aggregate check-ins by Date
            const relevantRecords = homeTrainingRecords.filter(r => r.playerId === selectedPlayerId && isInRange(r.date));
            
            const dateMap: Record<string, number> = {};
            relevantRecords.forEach(r => {
                // Use Short Date format MM-DD for chart
                const dateKey = r.date.slice(5); 
                dateMap[dateKey] = (dateMap[dateKey] || 0) + 1;
            });

            return Object.keys(dateMap).sort().map(k => ({ name: k, count: dateMap[k] }));
        }
    }, [homeTrainingRecords, selectedPlayerId, selectedTeamId, homeStatsRange, players]);

    // --- Skill Test Logic ---
    const handleSkillTestSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (skillTestForm.playerId && skillTestForm.testId && skillTestForm.value) {
            onAddSkillTestRecord({
                id: Date.now().toString(),
                playerId: skillTestForm.playerId,
                testId: skillTestForm.testId,
                date: skillTestForm.date,
                value: parseFloat(skillTestForm.value)
            });
            setSkillTestForm(prev => ({ ...prev, value: '' }));
        }
    };

    const handleAddTestType = () => {
        if (newTestForm.name && newTestForm.unit) {
            onAddSkillTest({
                id: `t-${Date.now()}`,
                name: newTestForm.name,
                unit: newTestForm.unit,
                category: newTestForm.category
            });
            setShowNewTestModal(false);
            setNewTestForm({ name: '', unit: '', category: 'technical' });
        }
    };

    const skillChartData = useMemo(() => {
        if (selectedPlayerId === 'all') return [];
        // Show progress for selected test type for selected player
        const records = skillTestRecords
            .filter(r => r.playerId === selectedPlayerId && r.testId === skillTestForm.testId)
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        return records.map(r => ({
            date: r.date,
            value: r.value
        }));
    }, [skillTestRecords, selectedPlayerId, skillTestForm.testId]);

    const getUnit = (testId: string) => skillTests.find(t => t.id === testId)?.unit || '';

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-bvb-black uppercase">球员测试与打卡</h2>
                    <p className="text-gray-500">追踪球员居家训练频率以及专项测试成绩。</p>
                </div>
            </div>

            {/* Top Toolbar: Player Selection (Global for this view) */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select 
                        className="bg-gray-50 border border-gray-200 rounded p-2 text-sm font-bold focus:ring-2 focus:ring-bvb-yellow outline-none"
                        value={selectedTeamId}
                        onChange={e => { setSelectedTeamId(e.target.value); setSelectedPlayerId('all'); }}
                    >
                        <option value="all">所有梯队</option>
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <select 
                        className="bg-gray-50 border border-gray-200 rounded p-2 text-sm font-bold focus:ring-2 focus:ring-bvb-yellow outline-none"
                        value={selectedPlayerId}
                        onChange={e => setSelectedPlayerId(e.target.value)}
                    >
                        <option value="all">全体 / 概览</option>
                        {filteredPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-gray-200">
                <button 
                    onClick={() => setActiveTab('home')} 
                    className={`px-6 py-3 font-bold text-sm flex items-center border-b-2 transition-colors ${activeTab === 'home' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <Home className="w-4 h-4 mr-2" /> 居家训练打卡
                </button>
                <button 
                    onClick={() => setActiveTab('skill')} 
                    className={`px-6 py-3 font-bold text-sm flex items-center border-b-2 transition-colors ${activeTab === 'skill' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <Dumbbell className="w-4 h-4 mr-2" /> 专项测试记录
                </button>
            </div>

            {/* === HOME TRAINING TAB === */}
            {activeTab === 'home' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-left-4">
                    {/* Left: Check-in Form */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                            <CheckCircle className="w-5 h-5 mr-2 text-green-500" /> 快速打卡
                        </h3>
                        <form onSubmit={handleHomeTrainingSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">选择球员</label>
                                <select 
                                    className="w-full p-2 border rounded text-sm bg-gray-50 focus:ring-2 focus:ring-bvb-yellow outline-none"
                                    value={homeTrainingForm.playerId}
                                    onChange={e => setHomeTrainingForm({...homeTrainingForm, playerId: e.target.value})}
                                    required
                                >
                                    <option value="">请选择...</option>
                                    {filteredPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">日期</label>
                                <input 
                                    type="date" 
                                    className="w-full p-2 border rounded text-sm bg-gray-50 focus:ring-2 focus:ring-bvb-yellow outline-none"
                                    value={homeTrainingForm.date}
                                    onChange={e => setHomeTrainingForm({...homeTrainingForm, date: e.target.value})}
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">训练内容 (选填)</label>
                                <textarea 
                                    className="w-full p-2 border rounded text-sm bg-gray-50 focus:ring-2 focus:ring-bvb-yellow outline-none resize-none"
                                    rows={3}
                                    placeholder="例如：核心力量，跳绳，球感练习..."
                                    value={homeTrainingForm.content}
                                    onChange={e => setHomeTrainingForm({...homeTrainingForm, content: e.target.value})}
                                />
                            </div>
                            <button type="submit" className="w-full bg-bvb-black text-white font-bold py-2 rounded hover:bg-gray-800 transition-colors">
                                确认打卡
                            </button>
                        </form>
                    </div>

                    {/* Right: Stats Chart */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-gray-800 flex items-center">
                                <TrendingUp className="w-5 h-5 mr-2 text-bvb-yellow" /> 
                                {selectedPlayerId === 'all' ? '打卡排行榜 (总次数)' : '个人打卡频率'}
                            </h3>
                            <div className="flex bg-gray-100 rounded-lg p-1">
                                <button onClick={() => setHomeStatsRange('week')} className={`px-3 py-1 text-xs font-bold rounded ${homeStatsRange === 'week' ? 'bg-white shadow' : 'text-gray-500'}`}>本周</button>
                                <button onClick={() => setHomeStatsRange('month')} className={`px-3 py-1 text-xs font-bold rounded ${homeStatsRange === 'month' ? 'bg-white shadow' : 'text-gray-500'}`}>本月</button>
                                <button onClick={() => setHomeStatsRange('year')} className={`px-3 py-1 text-xs font-bold rounded ${homeStatsRange === 'year' ? 'bg-white shadow' : 'text-gray-500'}`}>本年</button>
                            </div>
                        </div>
                        
                        <div className="flex-1 min-h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                {selectedPlayerId === 'all' ? (
                                    <BarChart data={homeStatsData} layout="vertical" margin={{ left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12, fontWeight: 'bold'}} />
                                        <Tooltip cursor={{fill: '#f3f4f6'}} />
                                        <Bar dataKey="count" fill="#FDE100" radius={[0, 4, 4, 0]} barSize={20} label={{ position: 'right', fill: '#666', fontSize: 12 }} />
                                    </BarChart>
                                ) : (
                                    <BarChart data={homeStatsData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" tick={{fontSize: 10}} />
                                        <YAxis label={{ value: '次数', angle: -90, position: 'insideLeft' }} allowDecimals={false} />
                                        <Tooltip />
                                        <Bar dataKey="count" fill="#FDE100" name="打卡次数" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                )}
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* === SKILL TEST TAB === */}
            {activeTab === 'skill' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-right-4">
                    {/* Left: Entry Form */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-800 flex items-center">
                                <Timer className="w-5 h-5 mr-2 text-blue-500" /> 成绩录入
                            </h3>
                            <button onClick={() => setShowNewTestModal(true)} className="text-xs text-blue-600 hover:underline flex items-center">
                                <Plus className="w-3 h-3 mr-1" /> 项目
                            </button>
                        </div>
                        <form onSubmit={handleSkillTestSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">测试项目</label>
                                <select 
                                    className="w-full p-2 border rounded text-sm bg-gray-50 focus:ring-2 focus:ring-bvb-yellow outline-none"
                                    value={skillTestForm.testId}
                                    onChange={e => setSkillTestForm({...skillTestForm, testId: e.target.value})}
                                    required
                                >
                                    {skillTests.map(t => <option key={t.id} value={t.id}>{t.name} ({t.unit})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">球员</label>
                                <select 
                                    className="w-full p-2 border rounded text-sm bg-gray-50 focus:ring-2 focus:ring-bvb-yellow outline-none"
                                    value={skillTestForm.playerId}
                                    onChange={e => setSkillTestForm({...skillTestForm, playerId: e.target.value})}
                                    required
                                >
                                    <option value="">请选择...</option>
                                    {filteredPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">测试日期</label>
                                <input 
                                    type="date" 
                                    className="w-full p-2 border rounded text-sm bg-gray-50 focus:ring-2 focus:ring-bvb-yellow outline-none"
                                    value={skillTestForm.date}
                                    onChange={e => setSkillTestForm({...skillTestForm, date: e.target.value})}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">成绩数值 ({getUnit(skillTestForm.testId)})</label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    className="w-full p-2 border rounded text-sm bg-gray-50 focus:ring-2 focus:ring-bvb-yellow outline-none font-bold"
                                    value={skillTestForm.value}
                                    onChange={e => setSkillTestForm({...skillTestForm, value: e.target.value})}
                                    placeholder="输入结果..."
                                    required
                                />
                            </div>
                            <button type="submit" className="w-full bg-bvb-black text-white font-bold py-2 rounded hover:bg-gray-800 transition-colors">
                                保存成绩
                            </button>
                        </form>
                    </div>

                    {/* Right: History & Charts */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col min-h-[400px]">
                        {selectedPlayerId === 'all' ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <TrendingUp className="w-16 h-16 mb-4 opacity-20" />
                                <p>请在上方选择一名球员以查看测试成绩走势</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h3 className="font-bold text-gray-800">
                                            {players.find(p => p.id === selectedPlayerId)?.name} - {skillTests.find(t => t.id === skillTestForm.testId)?.name} 趋势
                                        </h3>
                                        <p className="text-xs text-gray-400">历史记录</p>
                                    </div>
                                </div>
                                
                                {skillChartData.length > 0 ? (
                                    <div className="flex-1">
                                        <div className="h-64 mb-6">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={skillChartData}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <XAxis dataKey="date" tick={{fontSize: 10}} />
                                                    <YAxis width={40} />
                                                    <Tooltip />
                                                    <Line type="monotone" dataKey="value" stroke="#FDE100" strokeWidth={3} activeDot={{r: 6}} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                        
                                        <div className="border-t border-gray-100 pt-4">
                                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">详细记录</h4>
                                            <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2">
                                                {[...skillTestRecords]
                                                    .filter(r => r.playerId === selectedPlayerId && r.testId === skillTestForm.testId)
                                                    .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                                    .map(r => (
                                                        <div key={r.id} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm group">
                                                            <span className="font-mono text-gray-600">{r.date}</span>
                                                            <div className="flex items-center">
                                                                <span className="font-bold mr-4">{r.value} {getUnit(r.testId)}</span>
                                                                <button onClick={() => onDeleteSkillTestRecord(r.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))
                                                }
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                        <p>暂无该项目的测试记录</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Modal: Add Test Type */}
            {showNewTestModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
                        <h3 className="font-bold text-lg mb-4">添加自定义测试项目</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">项目名称</label>
                                <input 
                                    className="w-full p-2 border rounded text-sm"
                                    placeholder="例如：50米跑"
                                    value={newTestForm.name}
                                    onChange={e => setNewTestForm({...newTestForm, name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">单位</label>
                                <input 
                                    className="w-full p-2 border rounded text-sm"
                                    placeholder="例如：秒，个，cm"
                                    value={newTestForm.unit}
                                    onChange={e => setNewTestForm({...newTestForm, unit: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">分类</label>
                                <select 
                                    className="w-full p-2 border rounded text-sm"
                                    value={newTestForm.category}
                                    onChange={e => setNewTestForm({...newTestForm, category: e.target.value as any})}
                                >
                                    <option value="technical">技术类 (Technical)</option>
                                    <option value="physical">身体类 (Physical)</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 mt-4">
                                <button onClick={() => setShowNewTestModal(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded text-sm font-bold">取消</button>
                                <button onClick={handleAddTestType} className="px-4 py-2 bg-bvb-black text-white rounded text-sm font-bold">添加</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlayerTesting;
