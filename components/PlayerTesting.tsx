
import React, { useState, useMemo, useRef } from 'react';
import { Player, SkillTest, SkillTestRecord, HomeTrainingRecord, Team, User } from '../types';
import { Timer, Calendar as CalendarIcon, CheckCircle, Plus, Trash2, TrendingUp, Filter, Home, Dumbbell, ChevronLeft, ChevronRight, Image as ImageIcon, Heart, MessageCircle, MoreHorizontal, PlayCircle, ThumbsUp, Camera } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PlayerTestingProps {
    players: Player[];
    teams: Team[];
    skillTests: SkillTest[];
    skillTestRecords: SkillTestRecord[];
    homeTrainingRecords: HomeTrainingRecord[];
    currentUser: User | null;
    onAddHomeTraining: (record: HomeTrainingRecord) => void;
    onDeleteHomeTrainingRecord: (id: string) => void;
    onAddSkillTestRecord: (record: SkillTestRecord) => void;
    onDeleteSkillTestRecord: (id: string) => void;
    onAddSkillTest: (test: SkillTest) => void;
}

const PlayerTesting: React.FC<PlayerTestingProps> = ({
    players, teams, skillTests, skillTestRecords, homeTrainingRecords, currentUser,
    onAddHomeTraining, onDeleteHomeTrainingRecord, onAddSkillTestRecord, onDeleteSkillTestRecord, onAddSkillTest
}) => {
    const [activeTab, setActiveTab] = useState<'home' | 'skill'>('home');
    
    // --- Shared State ---
    const [selectedTeamId, setSelectedTeamId] = useState<string>(currentUser?.teamId || 'all');
    const [selectedPlayerId, setSelectedPlayerId] = useState<string>('all');

    // --- Home Training State ---
    const [showCheckInModal, setShowCheckInModal] = useState(false);
    const [calendarDate, setCalendarDate] = useState(new Date()); // Controls the month view
    const [checkInForm, setCheckInForm] = useState({
        date: new Date().toISOString().split('T')[0],
        content: '',
        imageUrl: ''
    });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [homeStatsRange, setHomeStatsRange] = useState<'week' | 'month' | 'year'>('month'); // For Leaderboard

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

    const selectedPlayer = useMemo(() => players.find(p => p.id === selectedPlayerId), [players, selectedPlayerId]);

    // --- Home Training Helpers ---
    
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setCheckInForm(prev => ({ ...prev, imageUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleHomeTrainingSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const pid = selectedPlayerId === 'all' ? filteredPlayers[0]?.id : selectedPlayerId;
        
        if (pid) {
            // Check duplicate
            const alreadyCheckedIn = homeTrainingRecords.some(
                r => r.playerId === pid && r.date === checkInForm.date
            );

            if (alreadyCheckedIn) {
                alert('该球员今日已完成打卡，无需重复提交。');
                return;
            }

            onAddHomeTraining({
                id: Date.now().toString(),
                playerId: pid,
                date: checkInForm.date,
                count: 1,
                content: checkInForm.content,
                imageUrl: checkInForm.imageUrl
            });
            
            setCheckInForm({ date: new Date().toISOString().split('T')[0], content: '', imageUrl: '' });
            setShowCheckInModal(false);
        }
    };

    // Calculate Stats for Single Player
    const playerStats = useMemo(() => {
        if (selectedPlayerId === 'all') return null;
        
        const now = new Date();
        now.setHours(0,0,0,0);

        // Week calculation: Start from Monday
        const currentDay = now.getDay() || 7; // 1 (Mon) to 7 (Sun)
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - currentDay + 1);
        
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const yearStart = new Date(now.getFullYear(), 0, 1);

        const records = homeTrainingRecords.filter(r => r.playerId === selectedPlayerId);

        // Helper to count unique days (in case of data inconsistency, though UI prevents duplicates)
        const countUniqueDays = (recs: HomeTrainingRecord[]) => {
            const uniqueDates = new Set(recs.map(r => r.date));
            return uniqueDates.size;
        };

        const thisWeekRecords = records.filter(r => new Date(r.date) >= weekStart);
        const thisMonthRecords = records.filter(r => new Date(r.date) >= monthStart);
        const thisYearRecords = records.filter(r => new Date(r.date) >= yearStart);

        return { 
            thisWeek: countUniqueDays(thisWeekRecords), 
            thisMonth: countUniqueDays(thisMonthRecords), 
            thisYear: countUniqueDays(thisYearRecords), 
            total: countUniqueDays(records) 
        };
    }, [homeTrainingRecords, selectedPlayerId]);

    // Leaderboard Data
    const leaderboardData = useMemo(() => {
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
    }, [homeTrainingRecords, selectedTeamId, homeStatsRange, players]);

    // Calendar Generator
    const generateCalendarDays = () => {
        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
        
        const days = [];
        // Empty slots
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(null);
        }
        // Days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }
        return days;
    };

    const changeMonth = (delta: number) => {
        const newDate = new Date(calendarDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setCalendarDate(newDate);
    };

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

    // --- Render ---

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-bvb-black uppercase">球员测试与打卡</h2>
                    <p className="text-gray-500">追踪球员居家训练频率以及专项测试成绩。</p>
                </div>
            </div>

            {/* Top Toolbar: Player Selection */}
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
                <div className="animate-in fade-in slide-in-from-left-4">
                    
                    {/* View for ALL Players (Leaderboard) */}
                    {selectedPlayerId === 'all' ? (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-gray-800 flex items-center">
                                    <TrendingUp className="w-5 h-5 mr-2 text-bvb-yellow" /> 
                                    打卡排行榜 (勤奋榜)
                                </h3>
                                <div className="flex bg-gray-100 rounded-lg p-1">
                                    <button onClick={() => setHomeStatsRange('week')} className={`px-3 py-1 text-xs font-bold rounded ${homeStatsRange === 'week' ? 'bg-white shadow' : 'text-gray-500'}`}>本周</button>
                                    <button onClick={() => setHomeStatsRange('month')} className={`px-3 py-1 text-xs font-bold rounded ${homeStatsRange === 'month' ? 'bg-white shadow' : 'text-gray-500'}`}>本月</button>
                                    <button onClick={() => setHomeStatsRange('year')} className={`px-3 py-1 text-xs font-bold rounded ${homeStatsRange === 'year' ? 'bg-white shadow' : 'text-gray-500'}`}>本年</button>
                                </div>
                            </div>
                            <div className="h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={leaderboardData} layout="vertical" margin={{ left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12, fontWeight: 'bold'}} />
                                        <Tooltip cursor={{fill: '#f3f4f6'}} />
                                        <Bar dataKey="count" fill="#FDE100" radius={[0, 4, 4, 0]} barSize={20} label={{ position: 'right', fill: '#666', fontSize: 12 }} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <p className="text-center text-xs text-gray-400 mt-4">请选择具体球员以查看详细打卡日历和动态</p>
                        </div>
                    ) : (
                        /* View for SINGLE Player (Calendar + Feed) */
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            {/* Left Column: Calendar */}
                            <div className="lg:col-span-1 space-y-6">
                                {/* Stats Cards */}
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-white p-3 rounded-lg border border-gray-200 text-center shadow-sm">
                                        <div className="text-[10px] text-gray-400 font-bold uppercase">本周打卡</div>
                                        <div className="text-xl font-black text-bvb-black">{playerStats?.thisWeek}<span className="text-xs font-normal text-gray-400 ml-1">天</span></div>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border border-gray-200 text-center shadow-sm bg-yellow-50 border-bvb-yellow">
                                        <div className="text-[10px] text-yellow-600 font-bold uppercase">本月打卡</div>
                                        <div className="text-xl font-black text-yellow-700">{playerStats?.thisMonth}<span className="text-xs font-normal text-yellow-600 ml-1">天</span></div>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border border-gray-200 text-center shadow-sm">
                                        <div className="text-[10px] text-gray-400 font-bold uppercase">本年累计</div>
                                        <div className="text-xl font-black text-bvb-black">{playerStats?.thisYear}<span className="text-xs font-normal text-gray-400 ml-1">天</span></div>
                                    </div>
                                </div>

                                {/* Calendar Widget */}
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                                        <div className="flex items-center border-l-4 border-green-500 pl-2">
                                            <div>
                                                <h3 className="font-bold text-gray-800 text-sm">打卡日历</h3>
                                                <p className="text-[10px] text-gray-400 mt-0.5">
                                                    {calendarDate.getFullYear()}-{String(calendarDate.getMonth()+1).padStart(2,'0')} 
                                                    (本月打卡 {homeTrainingRecords.filter(r => r.playerId === selectedPlayerId && r.date.startsWith(`${calendarDate.getFullYear()}-${String(calendarDate.getMonth()+1).padStart(2,'0')}`)).length} 天)
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft className="w-4 h-4 text-gray-500"/></button>
                                            <button onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-100 rounded"><ChevronRight className="w-4 h-4 text-gray-500"/></button>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-7 text-center mb-2">
                                        {['周日','周一','周二','周三','周四','周五','周六'].map(d => (
                                            <div key={d} className="text-xs font-bold text-gray-400 py-1">{d}</div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-7 gap-1">
                                        {generateCalendarDays().map((day, idx) => {
                                            if (!day) return <div key={idx}></div>;
                                            
                                            const dateStr = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                                            const record = homeTrainingRecords.find(r => r.playerId === selectedPlayerId && r.date === dateStr);
                                            const isToday = dateStr === new Date().toISOString().split('T')[0];

                                            return (
                                                <div 
                                                    key={idx} 
                                                    className={`aspect-square rounded-lg flex items-center justify-center relative border text-sm font-bold transition-all
                                                        ${record 
                                                            ? 'bg-green-50 border-green-200 text-green-700' 
                                                            : isToday ? 'bg-gray-100 border-bvb-yellow text-bvb-black border-2' : 'bg-white border-gray-100 text-gray-400'}
                                                    `}
                                                >
                                                    {day}
                                                    {record && (
                                                        <div className="absolute top-0.5 right-0.5 w-2 h-2 bg-green-500 rounded-full"></div>
                                                    )}
                                                    {record && <CheckCircle className="absolute w-3 h-3 text-green-600 bottom-0.5 right-0.5" strokeWidth={3} />}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Feed */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-gray-800 text-lg">所有打卡记录</h3>
                                    <button 
                                        onClick={() => setShowCheckInModal(true)}
                                        className="bg-bvb-black text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center shadow-lg hover:bg-gray-800 transition-colors"
                                    >
                                        <Camera className="w-4 h-4 mr-2 text-bvb-yellow" /> 立即打卡 / 补卡
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {[...homeTrainingRecords]
                                        .filter(r => r.playerId === selectedPlayerId)
                                        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                        .map(r => (
                                            <div key={r.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 group">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center">
                                                        <div className="w-10 h-10 rounded-full bg-gray-200 mr-3 overflow-hidden">
                                                            <img src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${r.playerId}`} alt="Avatar" />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-sm text-gray-800 flex items-center">
                                                                {selectedPlayer?.parentName || `${selectedPlayer?.name}家长`}
                                                                <span className="ml-2 text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-normal">
                                                                    已打卡 {playerStats?.total || 0} 天
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-gray-500 mt-0.5">姓名：{selectedPlayer?.name}</div>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => onDeleteHomeTrainingRecord(r.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                <div className="pl-13 mb-3">
                                                    <p className="text-sm text-gray-800 mb-2">{r.content || '完成了今日居家训练。'}</p>
                                                    {r.imageUrl ? (
                                                        <div className="rounded-lg overflow-hidden border border-gray-100 w-full max-w-sm relative group/img cursor-pointer">
                                                            <img src={r.imageUrl} alt="Training" className="w-full h-48 object-cover" />
                                                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                                                                <PlayCircle className="w-10 h-10 text-white/80" />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="w-full max-w-sm h-32 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center text-gray-300">
                                                            <ImageIcon className="w-8 h-8 opacity-20" />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex justify-between items-center text-xs text-gray-400 pl-13 border-t border-gray-50 pt-2">
                                                    <span>{r.date} 17:30</span> {/* Mock time if not stored */}
                                                    <div className="flex gap-4">
                                                        <button className="flex items-center hover:text-red-500 transition-colors"><Heart className="w-4 h-4 mr-1" /> 1</button>
                                                        <button className="flex items-center hover:text-blue-500 transition-colors"><MessageCircle className="w-4 h-4 mr-1" /> 点评</button>
                                                        <button className="hover:text-gray-600"><MoreHorizontal className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    }
                                    {homeTrainingRecords.filter(r => r.playerId === selectedPlayerId).length === 0 && (
                                        <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                            <Camera className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                            <p className="text-sm">暂无打卡记录，快来记录第一次训练吧！</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
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

            {/* Modal: Check In */}
            {showCheckInModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-0 overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-bvb-black p-4 text-white flex justify-between items-center">
                            <h3 className="font-bold">每日打卡</h3>
                            <button onClick={() => setShowCheckInModal(false)} className="text-white hover:text-gray-300">取消</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                                    <img src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${selectedPlayerId}`} alt="avatar" />
                                </div>
                                <div>
                                    <div className="font-bold text-sm text-gray-800">{selectedPlayer?.name}</div>
                                    <div className="text-xs text-gray-500">#{selectedPlayer?.number} {selectedPlayer?.position}</div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">日期</label>
                                <input 
                                    type="date" 
                                    className="w-full p-2 border rounded text-sm bg-gray-50 focus:ring-2 focus:ring-bvb-yellow outline-none"
                                    value={checkInForm.date}
                                    onChange={e => setCheckInForm({...checkInForm, date: e.target.value})}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">训练内容</label>
                                <textarea 
                                    className="w-full p-2 border rounded text-sm bg-gray-50 focus:ring-2 focus:ring-bvb-yellow outline-none resize-none"
                                    rows={3}
                                    placeholder="今天练习了什么？例如：颠球100次..."
                                    value={checkInForm.content}
                                    onChange={e => setCheckInForm({...checkInForm, content: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">照片/视频 (可选)</label>
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-bvb-yellow transition-colors relative overflow-hidden"
                                >
                                    {checkInForm.imageUrl ? (
                                        <img src={checkInForm.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <>
                                            <Camera className="w-8 h-8 text-gray-300 mb-1" />
                                            <span className="text-xs text-gray-400">点击上传照片</span>
                                        </>
                                    )}
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                </div>
                            </div>

                            <button onClick={handleHomeTrainingSubmit} className="w-full bg-bvb-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition-colors shadow-md">
                                发布打卡
                            </button>
                        </div>
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
