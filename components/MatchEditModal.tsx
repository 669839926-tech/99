import React, { useState, useEffect } from 'react';
import { Match, Player, Team, MatchDetails, PointItemDefinition, PlayerPointRecord, MatchEvent, MatchEventType, User, SeriesFixture, OrgRating } from '../types';
import { X, Save, CheckCircle, RefreshCw, ChevronLeft, Minimize2, Maximize2, Info, Activity, Users as UsersIcon, Star, Tag, ClipboardList, Plus, Trash2, FileText, TrendingUp, AlertCircle, Target, Flag, UserMinus, PenTool, Trophy, Shield, Cloud } from 'lucide-react';

interface MatchEditModalProps {
    match: Match;
    players: Player[];
    teams: Team[];
    currentUser: User | null;
    onUpdateMatch: (match: Match) => void;
    onClose: () => void;
    pointItemDefinitions?: PointItemDefinition[];
    playerPointRecords?: PlayerPointRecord[];
    onAddPointRecord?: (record: PlayerPointRecord) => void;
    onBulkAddPointRecords?: (records: PlayerPointRecord[]) => void;
    onDeletePointRecord?: (id: string) => void;
}

type TabType = 'info' | 'fixtures' | 'lineup' | 'objectives' | 'events' | 'report';

const calcSeriesStats = (fixtures: SeriesFixture[] = []) => {
    if (!fixtures || fixtures.length === 0) return { wins: 0, draws: 0, losses: 0, text: '' };
    let wins = 0;
    let draws = 0;
    let losses = 0;
    
    fixtures.forEach(f => {
        if (!f.result || !f.result.trim()) return;
        const res = f.result.trim();

        // 1. Check numeric score e.g. "3-1", "3:1", "3 - 1"
        const scoreMatch = res.match(/(\d+)\s*[-:]\s*(\d+)/);
        if (scoreMatch) {
            const myScore = parseInt(scoreMatch[1], 10);
            const oppScore = parseInt(scoreMatch[2], 10);
            if (myScore > oppScore) wins++;
            else if (myScore < oppScore) losses++;
            else draws++;
            return;
        }

        // 2. Check explicit Chinese outcome keywords
        if (res.includes('胜')) { wins++; return; }
        if (res.includes('负')) { losses++; return; }
        if (res.includes('平')) { draws++; return; }
    });

    const total = wins + draws + losses;
    if (total === 0) return { wins: 0, draws: 0, losses: 0, text: '' };
    
    const parts: string[] = [];
    if (wins > 0 || total > 0) parts.push(`${wins}胜`);
    if (draws > 0) parts.push(`${draws}平`);
    if (losses > 0 || (wins === 0 && draws === 0)) parts.push(`${losses}负`);

    return {
        wins,
        draws,
        losses,
        text: parts.join('')
    };
};

const ensureDetails = (match: Match): Match => {
    const existingBreakdown = match.details?.summaryBreakdown;
    const legacyReviewParts = [
        existingBreakdown?.technicalTactical,
        existingBreakdown?.individual,
        existingBreakdown?.gapAnalysis,
        existingBreakdown?.management
    ].filter(Boolean);
    const highlightsFallback = existingBreakdown?.highlights ?? existingBreakdown?.individual ?? '';
    const issuesExposedFallback = existingBreakdown?.issuesExposed ?? existingBreakdown?.gapAnalysis ?? '';
    const matchReviewFallback = existingBreakdown?.matchReview ?? (legacyReviewParts.length > 0 ? legacyReviewParts.join('\n\n') : '');
    const nextStageTrainingFallback = existingBreakdown?.nextStageTraining ?? existingBreakdown?.trainingPriorities ?? '';

    const defaultDetails: MatchDetails = {
        weather: '晴朗',
        pitch: '天然草',
        lineup: [],
        substitutes: [],
        events: [],
        summary: '',
        summaryBreakdown: {
            overall: existingBreakdown?.overall || '',
            highlights: highlightsFallback,
            issuesExposed: issuesExposedFallback,
            matchReview: matchReviewFallback,
            nextStageTraining: nextStageTrainingFallback,
            orgRating: {
                eventOrganization: existingBreakdown?.orgRating?.eventOrganization ?? 5,
                refereeLevel: existingBreakdown?.orgRating?.refereeLevel ?? 5,
                venueCondition: existingBreakdown?.orgRating?.venueCondition ?? 5,
                accommodation: existingBreakdown?.orgRating?.accommodation ?? 5,
                transportation: existingBreakdown?.orgRating?.transportation ?? 5,
                recommendParticipation: existingBreakdown?.orgRating?.recommendParticipation ?? '是'
            }
        },
        playerPerformances: match.details?.playerPerformances || {}
    };

    return {
        ...match,
        fixtures: match.fixtures || [],
        details: {
            ...defaultDetails,
            ...match.details,
            summaryBreakdown: {
                ...defaultDetails.summaryBreakdown,
                ...existingBreakdown,
                orgRating: {
                    ...defaultDetails.summaryBreakdown!.orgRating,
                    ...existingBreakdown?.orgRating
                }
            }
        }
    };
};

export const MatchEditModal: React.FC<MatchEditModalProps> = ({
    match,
    players,
    onUpdateMatch,
    onClose
}) => {
    const [editingMatch, setEditingMatch] = useState<Match>(() => ensureDetails(match));
    const [activeTab, setActiveTab] = useState<TabType>('info');
    const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [isFullscreen, setIsFullscreen] = useState(false);

    const [honorPresets, setHonorPresets] = useState<string[]>([
        '最佳射手', 'MVP 最佳球员', '最佳守门员', '拼搏奖', '优秀球员', '金靴奖', '最佳后卫'
    ]);
    const [newHonorInputs, setNewHonorInputs] = useState<Record<string, string>>({});

    const handleAddHonor = (pid: string, tagToAdd?: string) => {
        const rawTag = tagToAdd || newHonorInputs[pid] || '';
        const tag = rawTag.trim();
        if (!tag) return;

        const current = ensureDetails(editingMatch);
        const performances = { ...(current.details?.playerPerformances || {}) };
        const playerPerf = performances[pid] || {};
        const currentHonors = playerPerf.honors || [];

        if (!currentHonors.includes(tag)) {
            performances[pid] = {
                ...playerPerf,
                honors: [...currentHonors, tag]
            };
            setEditingMatch({
                ...current,
                details: {
                    ...current.details!,
                    playerPerformances: performances
                }
            });
        }

        if (!honorPresets.includes(tag)) {
            setHonorPresets(prev => [...prev, tag]);
        }

        setNewHonorInputs(prev => ({ ...prev, [pid]: '' }));
    };

    const handleRemoveHonor = (pid: string, tagToRemove: string) => {
        const current = ensureDetails(editingMatch);
        const performances = { ...(current.details?.playerPerformances || {}) };
        const playerPerf = performances[pid] || {};
        const currentHonors = playerPerf.honors || [];

        performances[pid] = {
            ...playerPerf,
            honors: currentHonors.filter(h => h !== tagToRemove)
        };

        setEditingMatch({
            ...current,
            details: {
                ...current.details!,
                playerPerformances: performances
            }
        });
    };

    const handleRemovePreset = (presetToRemove: string) => {
        setHonorPresets(prev => prev.filter(p => p !== presetToRemove));
    };

    const [newEvent, setNewEvent] = useState<{ playerId: string; type: MatchEventType; minute: number; details: string }>({
        playerId: '',
        type: 'Goal',
        minute: 1,
        details: ''
    });

    const [newFixture, setNewFixture] = useState<{
        opponent: string;
        date: string;
        location: 'Home' | 'Away';
        result: string;
    }>({
        opponent: '',
        date: '',
        location: 'Home',
        result: ''
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            setSaveStatus('saving');
            onUpdateMatch(editingMatch);
            setTimeout(() => setSaveStatus('saved'), 800);
        }, 1500);
        return () => clearTimeout(timer);
    }, [editingMatch, onUpdateMatch]);

    const toggleLineupPlayer = (playerId: string) => {
        const currentDetails = editingMatch.details || { weather: '晴朗', pitch: '天然草', lineup: [], substitutes: [], events: [], summary: '' };
        const currentLineup = currentDetails.lineup || [];
        const nextLineup = currentLineup.includes(playerId)
            ? currentLineup.filter(id => id !== playerId)
            : [...currentLineup, playerId];

        setEditingMatch({
            ...editingMatch,
            details: {
                ...currentDetails,
                lineup: nextLineup
            }
        });
    };

    const addEvent = () => {
        if (!newEvent.playerId) return;
        const player = players.find(p => p.id === newEvent.playerId);

        const createdEvent: MatchEvent = {
            id: Math.random().toString(36).slice(2, 11),
            playerId: newEvent.playerId,
            playerName: player?.name || '未知球员',
            type: newEvent.type,
            minute: newEvent.minute,
            details: newEvent.details
        };

        if (editingMatch.isSeries && selectedFixtureId) {
            const nextFixtures = (editingMatch.fixtures || []).map(f => {
                if (f.id === selectedFixtureId) {
                    return {
                        ...f,
                        events: [...(f.events || []), createdEvent]
                    };
                }
                return f;
            });
            setEditingMatch({
                ...editingMatch,
                fixtures: nextFixtures
            });
        } else {
            const currentDetails = editingMatch.details || { weather: '晴朗', pitch: '天然草', lineup: [], substitutes: [], events: [], summary: '' };
            setEditingMatch({
                ...editingMatch,
                details: {
                    ...currentDetails,
                    events: [...(currentDetails.events || []), createdEvent]
                }
            });
        }

        setNewEvent({
            playerId: '',
            type: 'Goal',
            minute: 1,
            details: ''
        });
    };

    const removeEvent = (eventId: string) => {
        if (editingMatch.isSeries && selectedFixtureId) {
            const nextFixtures = (editingMatch.fixtures || []).map(f => {
                if (f.id === selectedFixtureId) {
                    return {
                        ...f,
                        events: (f.events || []).filter(e => e.id !== eventId)
                    };
                }
                return f;
            });
            setEditingMatch({
                ...editingMatch,
                fixtures: nextFixtures
            });
        } else {
            const currentDetails = editingMatch.details || { weather: '晴朗', pitch: '天然草', lineup: [], substitutes: [], events: [], summary: '' };
            setEditingMatch({
                ...editingMatch,
                details: {
                    ...currentDetails,
                    events: (currentDetails.events || []).filter(e => e.id !== eventId)
                }
            });
        }
    };

    return (
        <div className={`fixed inset-0 z-[110] flex items-center justify-center p-0 ${isFullscreen ? '' : 'md:p-4'} bg-black/60 backdrop-blur-sm`}>
            <div className={`bg-white w-full ${isFullscreen ? 'h-full' : 'h-full md:h-[90vh] md:max-w-4xl md:rounded-2xl'} shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200`}>
                <div className="bg-bvb-black p-3 md:p-4 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-2 md:gap-3">
                        <button 
                            type="button"
                            onClick={() => {
                                onUpdateMatch(editingMatch);
                                onClose();
                            }} 
                            className="md:hidden"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h3 className="font-bold text-base md:text-lg leading-tight">
                                比赛录入: {editingMatch.isSeries || !editingMatch.opponent ? (editingMatch.title || editingMatch.competition || '比赛') : `VS ${editingMatch.opponent}`}
                            </h3>
                            <p className="text-[10px] md:text-xs text-gray-400 font-mono uppercase">{editingMatch.date} • {editingMatch.competition}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                        {saveStatus === 'saving' && <span className="hidden sm:flex text-[10px] md:text-xs text-bvb-yellow items-center"><RefreshCw className="w-3 h-3 mr-1 animate-spin"/> 同步中</span>}
                        {saveStatus === 'saved' && <span className="hidden sm:flex text-[10px] md:text-xs text-green-400 items-center bg-gray-800 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3 mr-1"/> 云端已存</span>}
                        <button 
                            type="button"
                            onClick={() => setIsFullscreen(!isFullscreen)} 
                            className="hidden md:flex items-center gap-1 px-2 py-1 hover:bg-gray-800 rounded transition-colors text-gray-400 hover:text-white"
                            title={isFullscreen ? "退出全屏" : "全屏显示"}
                        >
                            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                        </button>
                        <button 
                            type="button"
                            onClick={() => {
                                onUpdateMatch(editingMatch);
                                onClose();
                            }} 
                            className="hidden md:block hover:bg-gray-800 p-1 rounded"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto no-scrollbar shrink-0">
                    {[
                        { id: 'info', label: '基础信息', icon: Info },
                        ...(editingMatch.isSeries ? [{ id: 'fixtures', label: '对阵列表', icon: Activity }] : []),
                        { id: 'lineup', label: '阵容', icon: UsersIcon },
                        { id: 'objectives', label: '个人表现', icon: Star },
                        { id: 'events', label: '事件记录', icon: Tag },
                        { id: 'report', label: '总结复盘', icon: ClipboardList }
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={`px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold flex items-center transition-all border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-bvb-yellow text-bvb-black bg-white' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            <tab.icon className={`w-3.5 h-3.5 md:w-4 h-4 mr-1.5 md:mr-2 ${activeTab === tab.id ? 'text-bvb-yellow' : ''}`} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar pb-24 md:pb-8">
                    {activeTab === 'info' && (() => {
                        const currentDetails = ensureDetails(editingMatch);
                        const currentPitch = currentDetails.details?.pitch || '天然草';
                        const currentWeather = currentDetails.details?.weather || '晴朗';
                        const dailyWeather = currentDetails.details?.dailyWeather || {};

                        // Calculate match date list
                        const matchDates: string[] = [];
                        if (editingMatch.date) {
                            matchDates.push(editingMatch.date);
                        }
                        if (editingMatch.isSeries && editingMatch.endDate && editingMatch.endDate > editingMatch.date) {
                            const curr = new Date(editingMatch.date);
                            const end = new Date(editingMatch.endDate);
                            let count = 0;
                            while (curr <= end && count < 30) {
                                const dStr = curr.toISOString().split('T')[0];
                                if (!matchDates.includes(dStr)) matchDates.push(dStr);
                                curr.setDate(curr.getDate() + 1);
                                count++;
                            }
                        }
                        (editingMatch.fixtures || []).forEach(f => {
                            if (f.date && !matchDates.includes(f.date)) {
                                matchDates.push(f.date);
                            }
                        });
                        matchDates.sort();

                        const weatherOptions = [
                            { id: '晴朗', label: '晴朗', icon: '☀️' },
                            { id: '多云', label: '多云', icon: '⛅' },
                            { id: '阴天', label: '阴天', icon: '☁️' },
                            { id: '小雨', label: '小雨', icon: '🌧️' },
                            { id: '大雨', label: '大雨', icon: '⛈️' },
                            { id: '雷阵雨', label: '雷阵雨', icon: '🌩️' },
                            { id: '下雪', label: '下雪', icon: '❄️' },
                            { id: '大风', label: '大风', icon: '💨' },
                            { id: '雾霾', label: '雾霾', icon: '🌫️' },
                        ];

                        const pitchPresets = ['天然草', '人工草', '室内场', '沙地/泥地'];
                        const competitionPresets = ['友谊赛', '杯赛', '联赛', '邀请赛', '热身赛'];

                        const updatePitch = (val: string) => {
                            const current = ensureDetails(editingMatch);
                            setEditingMatch({
                                ...current,
                                details: { ...current.details!, pitch: val }
                            });
                        };

                        const updateDailyWeather = (dateStr: string, weatherVal: string) => {
                            const current = ensureDetails(editingMatch);
                            const newDaily = {
                                ...(current.details!.dailyWeather || {}),
                                [dateStr]: weatherVal
                            };
                            const summaryList = Object.entries(newDaily).map(([d, w]) => `${d} ${w}`);
                            const summaryText = summaryList.length > 0 ? Object.values(newDaily).join(' / ') : weatherVal;

                            setEditingMatch({
                                ...current,
                                details: {
                                    ...current.details!,
                                    weather: summaryText,
                                    dailyWeather: newDaily
                                }
                            });
                        };

                        return (
                            <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                                    {/* Column 1: 核心比赛信息 */}
                                    <div className="space-y-4 md:space-y-6">
                                        <h4 className="font-black text-gray-400 text-[9px] md:text-[10px] uppercase tracking-widest border-b pb-1.5 md:pb-2 flex items-center justify-between">
                                            <span>核心比赛信息</span>
                                            <span className="text-[10px] text-bvb-black bg-bvb-yellow px-2 py-0.5 rounded font-bold">
                                                {editingMatch.isSeries ? '系列赛 / 锦标赛' : '单场比赛'}
                                            </span>
                                        </h4>

                                        {/* 比分与状态 */}
                                        <div className="grid grid-cols-2 gap-3 md:gap-4">
                                            <div>
                                                <label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 block">比赛状态</label>
                                                <select 
                                                    className="w-full p-2.5 md:p-3 border rounded-xl font-bold bg-white text-xs md:text-sm focus:ring-2 focus:ring-bvb-yellow outline-none transition-all cursor-pointer" 
                                                    value={editingMatch.status} 
                                                    onChange={e => setEditingMatch({...editingMatch, status: e.target.value as any})}
                                                >
                                                    <option value="Upcoming">⏳ 未开始</option>
                                                    <option value="Completed">✅ 已完赛</option>
                                                    <option value="Cancelled">❌ 已取消</option>
                                                </select>
                                            </div>
                                            {!editingMatch.isSeries && (
                                                <div>
                                                    <label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 block">最终比分</label>
                                                    <input 
                                                        className="w-full p-2.5 md:p-3 border rounded-xl font-black text-center text-lg md:text-xl bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-bvb-yellow transition-all" 
                                                        placeholder="如: 3-1" 
                                                        value={editingMatch.result || ''} 
                                                        onChange={e => setEditingMatch({...editingMatch, result: e.target.value})} 
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* 系列赛统计 */}
                                        {editingMatch.isSeries && (
                                            <div className="grid grid-cols-2 gap-3 md:gap-4 bg-amber-50/50 p-3 rounded-2xl border border-amber-200/60">
                                                <div>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <label className="text-[9px] md:text-[10px] font-black text-amber-900 uppercase block">系列赛赛果</label>
                                                        {(editingMatch.fixtures || []).length > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const stats = calcSeriesStats(editingMatch.fixtures || []);
                                                                    if (stats.text) {
                                                                        setEditingMatch({ ...editingMatch, seriesResult: stats.text });
                                                                    }
                                                                }}
                                                                className="text-[9px] font-black text-bvb-black bg-bvb-yellow px-2 py-0.5 rounded hover:brightness-110 transition-all flex items-center gap-1 shadow-2xs"
                                                                title="根据对阵列表中的各场比分自动统计"
                                                            >
                                                                <RefreshCw className="w-2.5 h-2.5" /> 自动统计
                                                            </button>
                                                        )}
                                                    </div>
                                                    <input 
                                                        className="w-full p-2.5 border rounded-xl font-bold text-xs md:text-sm bg-white outline-none focus:ring-2 focus:ring-bvb-yellow transition-all" 
                                                        placeholder="如: 3胜1平3负" 
                                                        value={editingMatch.seriesResult || ''} 
                                                        onChange={e => setEditingMatch({...editingMatch, seriesResult: e.target.value})} 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] md:text-[10px] font-black text-amber-900 uppercase mb-1 block">系列赛名次 / 奖项</label>
                                                    <input 
                                                        className="w-full p-2.5 border rounded-xl font-bold text-xs md:text-sm bg-white outline-none focus:ring-2 focus:ring-bvb-yellow transition-all" 
                                                        placeholder="如: 优胜组亚军" 
                                                        value={editingMatch.seriesRanking || ''} 
                                                        onChange={e => setEditingMatch({...editingMatch, seriesRanking: e.target.value})} 
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* 比赛性质 (Match Nature / Competition) */}
                                        <div className="space-y-2 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100">
                                            <label className="text-[10px] md:text-xs font-black text-gray-800 uppercase flex items-center gap-1.5">
                                                <Trophy className="w-3.5 h-3.5 text-bvb-yellow" /> 比赛性质 / 赛事类型
                                            </label>
                                            <div className="flex flex-wrap gap-1.5 mb-2">
                                                {competitionPresets.map(preset => (
                                                    <button
                                                        key={preset}
                                                        type="button"
                                                        onClick={() => setEditingMatch({ ...editingMatch, competition: preset })}
                                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                                                            editingMatch.competition === preset
                                                                ? 'bg-bvb-black text-bvb-yellow border-bvb-black shadow-2xs'
                                                                : 'bg-white text-gray-600 border-gray-200 hover:border-bvb-yellow'
                                                        }`}
                                                    >
                                                        {preset}
                                                    </button>
                                                ))}
                                            </div>
                                            <input 
                                                className="w-full p-2.5 border rounded-xl font-bold text-xs md:text-sm bg-white focus:ring-2 focus:ring-bvb-yellow outline-none transition-all" 
                                                placeholder="自由录入赛事名称/性质 (如: 2026贵阳林城之星邀请赛)" 
                                                value={editingMatch.competition || ''} 
                                                onChange={e => setEditingMatch({...editingMatch, competition: e.target.value})} 
                                            />
                                        </div>

                                        {/* 场地 (Pitch) */}
                                        <div className="space-y-2 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100">
                                            <label className="text-[10px] md:text-xs font-black text-gray-800 uppercase flex items-center gap-1.5">
                                                <Shield className="w-3.5 h-3.5 text-bvb-yellow" /> 场地类型
                                            </label>
                                            <div className="flex flex-wrap gap-1.5 mb-2">
                                                {pitchPresets.map(preset => (
                                                    <button
                                                        key={preset}
                                                        type="button"
                                                        onClick={() => updatePitch(preset)}
                                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                                                            currentPitch === preset
                                                                ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                                                                : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-500'
                                                        }`}
                                                    >
                                                        🏟️ {preset}
                                                    </button>
                                                ))}
                                            </div>
                                            <input 
                                                className="w-full p-2.5 border rounded-xl font-bold text-xs md:text-sm bg-white focus:ring-2 focus:ring-bvb-yellow outline-none transition-all" 
                                                placeholder="自定义场地描述 (如: 天然草/高清皮, 人工草 5人制)" 
                                                value={currentPitch} 
                                                onChange={e => updatePitch(e.target.value)} 
                                            />
                                        </div>
                                    </div>

                                    {/* Column 2: 赛程时间、地点 & 天气信息 */}
                                    <div className="space-y-4 md:space-y-6">
                                        <h4 className="font-black text-gray-400 text-[9px] md:text-[10px] uppercase tracking-widest border-b pb-1.5 md:pb-2">
                                            赛程时间与地点
                                        </h4>
                                        <div>
                                            <label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 block">比赛主体名称</label>
                                            <input 
                                                className="w-full p-2.5 md:p-3 border rounded-xl font-bold text-xs md:text-sm focus:ring-2 focus:ring-bvb-yellow outline-none" 
                                                value={editingMatch.title || ''} 
                                                onChange={e => setEditingMatch({...editingMatch, title: e.target.value})} 
                                            />
                                        </div>
                                        {!editingMatch.isSeries && (
                                            <div>
                                                <label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 block">对手名称</label>
                                                <input 
                                                    className="w-full p-2.5 md:p-3 border rounded-xl font-bold text-xs md:text-sm focus:ring-2 focus:ring-bvb-yellow outline-none" 
                                                    value={editingMatch.opponent || ''} 
                                                    onChange={e => setEditingMatch({...editingMatch, opponent: e.target.value})} 
                                                />
                                            </div>
                                        )}
                                        <div className="grid grid-cols-2 gap-3 md:gap-4">
                                            <div>
                                                <label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 block">
                                                    {editingMatch.isSeries ? '起始日期' : '日期'}
                                                </label>
                                                <input 
                                                    type="date" 
                                                    className="w-full p-2.5 md:p-3 border rounded-xl font-bold text-xs md:text-sm outline-none focus:ring-2 focus:ring-bvb-yellow" 
                                                    value={editingMatch.date || ''} 
                                                    onChange={e => setEditingMatch({...editingMatch, date: e.target.value})} 
                                                />
                                            </div>
                                            {editingMatch.isSeries ? (
                                                <div>
                                                    <label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 block">结束日期</label>
                                                    <input 
                                                        type="date" 
                                                        className="w-full p-2.5 md:p-3 border rounded-xl font-bold text-xs md:text-sm outline-none focus:ring-2 focus:ring-bvb-yellow" 
                                                        value={editingMatch.endDate || editingMatch.date || ''} 
                                                        onChange={e => setEditingMatch({...editingMatch, endDate: e.target.value})} 
                                                    />
                                                </div>
                                            ) : (
                                                <div>
                                                    <label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 block">开球时间</label>
                                                    <input 
                                                        type="time" 
                                                        className="w-full p-2.5 md:p-3 border rounded-xl font-bold text-xs md:text-sm outline-none focus:ring-2 focus:ring-bvb-yellow" 
                                                        value={editingMatch.time || ''} 
                                                        onChange={e => setEditingMatch({...editingMatch, time: e.target.value})} 
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* 天气信息 (按日期选择各种天气，并展示天气情况) */}
                                        <div className="space-y-3 bg-sky-50/60 p-4 rounded-2xl border border-sky-100">
                                            <div className="flex items-center justify-between border-b border-sky-200/60 pb-2">
                                                <label className="text-[10px] md:text-xs font-black text-sky-900 uppercase flex items-center gap-1.5">
                                                    <Cloud className="w-4 h-4 text-sky-600" /> 天气录入与日期明细
                                                </label>
                                                <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                                                    按日期设置天气
                                                </span>
                                            </div>

                                            {/* Date selection & weather selector */}
                                            <div className="space-y-2">
                                                <p className="text-[10px] text-sky-800 font-medium">
                                                    选择对应日期，并点击匹配的天气状况：
                                                </p>
                                                <div className="space-y-2.5">
                                                    {matchDates.map(dateStr => {
                                                        const dateWeather = dailyWeather[dateStr] || currentWeather || '晴朗';
                                                        return (
                                                            <div key={dateStr} className="bg-white p-3 rounded-xl border border-sky-100 space-y-2 shadow-2xs">
                                                                <div className="flex items-center justify-between text-xs font-black text-gray-800">
                                                                    <span className="flex items-center gap-1.5">
                                                                        📅 {dateStr}
                                                                    </span>
                                                                    <span className="bg-sky-50 text-sky-800 px-2.5 py-0.5 rounded-md border border-sky-200 font-bold">
                                                                        当前: {dateWeather}
                                                                    </span>
                                                                </div>

                                                                {/* Weather choice buttons for this date */}
                                                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                                                                    {weatherOptions.map(w => (
                                                                        <button
                                                                            key={w.id}
                                                                            type="button"
                                                                            onClick={() => updateDailyWeather(dateStr, w.label)}
                                                                            className={`p-1.5 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer border ${
                                                                                dateWeather === w.label || dateWeather.includes(w.label)
                                                                                    ? 'bg-sky-600 text-white border-sky-600 shadow-2xs scale-102'
                                                                                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-sky-300'
                                                                            }`}
                                                                        >
                                                                            <span>{w.icon}</span>
                                                                            <span>{w.label}</span>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Summary display card of overall weather */}
                                            <div className="bg-white p-3 rounded-xl border border-sky-100/80 space-y-1">
                                                <span className="text-[9px] font-black text-sky-700 uppercase block">天气概况汇总</span>
                                                <input 
                                                    className="w-full p-2 border rounded-lg text-xs font-bold bg-sky-50/50 text-sky-900 outline-none" 
                                                    value={editingMatch.details?.weather || ''} 
                                                    onChange={e => {
                                                        const current = ensureDetails(editingMatch);
                                                        setEditingMatch({
                                                            ...current,
                                                            details: { ...current.details!, weather: e.target.value }
                                                        });
                                                    }} 
                                                    placeholder="例如: 晴朗 / 多云 / 有雨"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {activeTab === 'fixtures' && (
                        <div className="animate-in fade-in duration-300 space-y-6">
                            {/* Header & Auto Stats Banner */}
                            <div className="bg-gradient-to-r from-bvb-black via-gray-900 to-bvb-black text-white p-4 md:p-6 rounded-2xl shadow-lg border border-gray-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-bvb-yellow text-bvb-black font-black text-[10px] uppercase px-2 py-0.5 rounded-md">
                                            系列赛对阵明细
                                        </span>
                                        <span className="text-xs text-gray-300 font-bold">
                                            共 {(editingMatch.fixtures || []).length} 场对阵
                                        </span>
                                    </div>
                                    <h4 className="text-base md:text-lg font-black text-white flex items-center gap-2">
                                        <Trophy className="w-5 h-5 text-bvb-yellow" />
                                        系列赛总赛果: <span className="text-bvb-yellow font-black">{editingMatch.seriesResult || '尚未统计'}</span>
                                    </h4>
                                    <p className="text-[10px] md:text-xs text-gray-400">
                                        录入每场对阵比分后，系统将自动汇总胜/平/负统计并生成系列赛战绩。
                                    </p>
                                </div>
                                
                                <button
                                    type="button"
                                    onClick={() => {
                                        const stats = calcSeriesStats(editingMatch.fixtures || []);
                                        if (stats.text) {
                                            setEditingMatch({
                                                ...editingMatch,
                                                seriesResult: stats.text
                                            });
                                        }
                                    }}
                                    className="w-full md:w-auto px-5 py-2.5 bg-bvb-yellow text-bvb-black font-black rounded-xl text-xs md:text-sm hover:brightness-110 shadow-lg transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                                >
                                    <RefreshCw className="w-4 h-4 text-bvb-black" />
                                    一键统计系列赛赛果
                                </button>
                            </div>

                            {/* Add New Fixture Form */}
                            <div className="bg-gray-50 p-4 md:p-6 rounded-2xl border border-gray-200 space-y-3">
                                <h4 className="font-bold text-sm md:text-base text-gray-800 flex items-center gap-2">
                                    <Plus className="w-4 h-4 text-bvb-yellow" /> 新增系列赛对阵场次
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 items-end">
                                    <div className="md:col-span-2">
                                        <label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 block">对手名称</label>
                                        <input 
                                            type="text"
                                            className="w-full p-2.5 border rounded-xl font-bold text-xs bg-white focus:ring-2 focus:ring-bvb-yellow outline-none"
                                            placeholder={editingMatch.opponent || "例如: 贵州仁怀队"}
                                            value={newFixture.opponent}
                                            onChange={e => setNewFixture({ ...newFixture, opponent: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 block">主客场</label>
                                        <select 
                                            className="w-full p-2.5 border rounded-xl font-bold text-xs bg-white focus:ring-2 focus:ring-bvb-yellow outline-none cursor-pointer"
                                            value={newFixture.location || 'Home'}
                                            onChange={e => setNewFixture({ ...newFixture, location: e.target.value as 'Home' | 'Away' })}
                                        >
                                            <option value="Home">🏠 主场</option>
                                            <option value="Away">🚩 客场</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 block">比赛日期</label>
                                        <input 
                                            type="date"
                                            className="w-full p-2.5 border rounded-xl font-bold text-xs bg-white focus:ring-2 focus:ring-bvb-yellow outline-none"
                                            value={newFixture.date || editingMatch.date}
                                            onChange={e => setNewFixture({ ...newFixture, date: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 block">比分/赛果 (可选)</label>
                                        <input 
                                            type="text"
                                            className="w-full p-2.5 border rounded-xl font-bold text-xs bg-white focus:ring-2 focus:ring-bvb-yellow outline-none"
                                            placeholder="如: 3-1"
                                            value={newFixture.result}
                                            onChange={e => setNewFixture({ ...newFixture, result: e.target.value })}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newF: SeriesFixture = {
                                                id: 'f_' + Math.random().toString(36).slice(2, 9),
                                                opponent: newFixture.opponent || editingMatch.opponent || '对手',
                                                date: newFixture.date || editingMatch.date || new Date().toISOString().split('T')[0],
                                                location: newFixture.location || 'Home',
                                                result: newFixture.result || '',
                                                events: []
                                            };
                                            const updatedFixtures = [...(editingMatch.fixtures || []), newF];
                                            const stats = calcSeriesStats(updatedFixtures);
                                            setEditingMatch({
                                                ...editingMatch,
                                                fixtures: updatedFixtures,
                                                seriesResult: stats.text || editingMatch.seriesResult
                                            });
                                            setNewFixture({
                                                opponent: '',
                                                date: '',
                                                location: 'Home',
                                                result: ''
                                            });
                                        }}
                                        className="bg-bvb-black text-white font-black py-2.5 px-4 rounded-xl hover:bg-gray-800 text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                                    >
                                        <Plus className="w-4 h-4 text-bvb-yellow" /> 添加场次
                                    </button>
                                </div>
                            </div>

                            {/* Fixtures List */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <h4 className="font-black text-xs text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                        <Activity className="w-3.5 h-3.5 text-bvb-yellow" />
                                        已录入对阵场次列表 ({(editingMatch.fixtures || []).length})
                                    </h4>
                                    <span className="text-[10px] text-gray-400 font-bold">录入比分后自动实时更新系列赛战绩</span>
                                </div>

                                {(editingMatch.fixtures || []).length === 0 ? (
                                    <div className="py-16 text-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl space-y-2">
                                        <Activity className="w-10 h-10 text-gray-200 mx-auto" />
                                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest italic">暂无对阵场次</p>
                                        <p className="text-[10px] text-gray-400 font-bold">请在上方输入对手与日期添加系列赛各场比赛</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3">
                                        {(editingMatch.fixtures || []).map((fixture, idx) => {
                                            return (
                                                <div key={fixture.id || idx} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-bvb-yellow/50 transition-all">
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <span className="w-8 h-8 rounded-xl bg-bvb-black text-bvb-yellow font-black text-xs flex items-center justify-center shrink-0">
                                                            #{idx + 1}
                                                        </span>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <input 
                                                                    type="text"
                                                                    className="font-black text-sm text-gray-900 bg-transparent border-b border-gray-200 hover:border-gray-400 focus:border-bvb-yellow outline-none px-1 py-0.5"
                                                                    value={fixture.opponent}
                                                                    onChange={e => {
                                                                        const val = e.target.value;
                                                                        const updated = (editingMatch.fixtures || []).map((f, i) => i === idx ? { ...f, opponent: val } : f);
                                                                        setEditingMatch({ ...editingMatch, fixtures: updated });
                                                                    }}
                                                                    placeholder="对手名称"
                                                                />
                                                                <select
                                                                    className="text-[10px] font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md outline-none border-0"
                                                                    value={fixture.location || 'Home'}
                                                                    onChange={e => {
                                                                        const val = e.target.value as 'Home' | 'Away';
                                                                        const updated = (editingMatch.fixtures || []).map((f, i) => i === idx ? { ...f, location: val } : f);
                                                                        setEditingMatch({ ...editingMatch, fixtures: updated });
                                                                    }}
                                                                >
                                                                    <option value="Home">主场</option>
                                                                    <option value="Away">客场</option>
                                                                </select>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold mt-1">
                                                                <input 
                                                                    type="date"
                                                                    className="bg-transparent border-b border-gray-200 hover:border-gray-400 outline-none text-[10px] text-gray-500 font-bold"
                                                                    value={fixture.date || editingMatch.date}
                                                                    onChange={e => {
                                                                        const val = e.target.value;
                                                                        const updated = (editingMatch.fixtures || []).map((f, i) => i === idx ? { ...f, date: val } : f);
                                                                        setEditingMatch({ ...editingMatch, fixtures: updated });
                                                                    }}
                                                                />
                                                                <span>•</span>
                                                                <span>包含 {(fixture.events || []).length} 条事件记录</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Score Entry & Quick Outcome */}
                                                    <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap justify-between md:justify-end">
                                                        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100">
                                                            <span className="text-[10px] font-black text-gray-500 uppercase">比分:</span>
                                                            <input 
                                                                type="text"
                                                                className="w-20 p-1.5 border rounded-lg font-black text-center text-xs bg-white focus:ring-2 focus:ring-bvb-yellow outline-none"
                                                                placeholder="如: 2-1"
                                                                value={fixture.result || ''}
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    const updated = (editingMatch.fixtures || []).map((f, i) => i === idx ? { ...f, result: val } : f);
                                                                    const stats = calcSeriesStats(updated);
                                                                    setEditingMatch({ 
                                                                        ...editingMatch, 
                                                                        fixtures: updated,
                                                                        seriesResult: stats.text || editingMatch.seriesResult
                                                                    });
                                                                }}
                                                            />
                                                            <div className="flex items-center gap-1">
                                                                {['胜', '平', '负'].map(outcome => (
                                                                    <button
                                                                        key={outcome}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const updated = (editingMatch.fixtures || []).map((f, i) => i === idx ? { ...f, result: outcome } : f);
                                                                            const stats = calcSeriesStats(updated);
                                                                            setEditingMatch({
                                                                                ...editingMatch,
                                                                                fixtures: updated,
                                                                                seriesResult: stats.text || editingMatch.seriesResult
                                                                            });
                                                                        }}
                                                                        className={`px-1.5 py-0.5 text-[9px] font-black rounded transition-all cursor-pointer ${
                                                                            fixture.result === outcome 
                                                                                ? 'bg-bvb-black text-bvb-yellow shadow-2xs' 
                                                                                : 'bg-white border text-gray-600 hover:bg-gray-100'
                                                                        }`}
                                                                    >
                                                                        {outcome}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedFixtureId(fixture.id);
                                                                    setActiveTab('events');
                                                                }}
                                                                className="p-2 text-gray-500 hover:text-bvb-black hover:bg-yellow-50 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                                                title="录入该场关键事件(进球/黄牌等)"
                                                            >
                                                                <Tag className="w-3.5 h-3.5 text-bvb-yellow" />
                                                                <span className="hidden sm:inline">事件</span>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const updated = (editingMatch.fixtures || []).filter((_, i) => i !== idx);
                                                                    const stats = calcSeriesStats(updated);
                                                                    setEditingMatch({
                                                                        ...editingMatch,
                                                                        fixtures: updated,
                                                                        seriesResult: stats.text || editingMatch.seriesResult
                                                                    });
                                                                }}
                                                                className="p-2 text-gray-300 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                                                                title="删除此对阵场次"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'lineup' && (
                        <div className="animate-in fade-in duration-300 space-y-4 md:space-y-6">
                            <div className="bg-yellow-50 p-3 md:p-4 rounded-xl border border-yellow-100 flex items-center gap-2 md:gap-3">
                                <Info className="w-4 h-4 md:w-5 md:h-5 text-yellow-600 shrink-0" />
                                <p className="text-[10px] md:text-xs text-yellow-800 font-bold">请选拔参赛球员名单。已选中球员将记入个人“出场次数”统计。</p>
                            </div>
                            <div className="grid grid-cols-1 gap-6 md:gap-8">
                                <div className="space-y-3 md:space-y-4">
                                    <h4 className="font-black text-[10px] md:text-xs text-gray-800 flex items-center uppercase tracking-widest"><CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2 text-green-500" /> 参赛人员名单 ({editingMatch.details?.lineup.length})</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                        {players.filter(p => p.teamId === editingMatch.teamId).map(p => {
                                            const isSelected = editingMatch.details?.lineup.includes(p.id);
                                            return (
                                                <button key={p.id} type="button" onClick={() => toggleLineupPlayer(p.id)} className={`p-2 md:p-3 rounded-xl border-2 flex items-center gap-2 md:gap-3 transition-all ${isSelected ? 'bg-bvb-black text-bvb-yellow border-bvb-black shadow-lg' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}>
                                                    <img src={p.image} className="w-5 h-5 md:w-6 md:h-6 rounded-full object-cover shrink-0" /><span className="text-[10px] md:text-xs font-bold truncate">{p.name}</span>
                                                    {isSelected ? <UserMinus className="w-3 h-3 md:w-4 md:h-4 ml-auto opacity-40" /> : <Plus className="w-3 h-3 md:w-4 md:h-4 ml-auto" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'objectives' && (
                        <div className="animate-in fade-in duration-300 space-y-6">
                            <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200/80 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <Star className="w-5 h-5 text-amber-500 fill-amber-400 shrink-0" />
                                    <div>
                                        <h4 className="text-sm font-black text-amber-900 uppercase">参赛球员个人表现评估</h4>
                                        <p className="text-[10px] text-amber-700 font-bold">对已选入阵容的参赛球员进行1-5星打分，并在下方录入个人点评与状态反馈。</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {editingMatch.details?.lineup.length === 0 ? (
                                    <div className="py-20 text-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl">
                                        <UsersIcon className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                                        <p className="text-sm font-black text-gray-400 uppercase tracking-widest italic">请先在“阵容”标签中选择参赛球员</p>
                                    </div>
                                ) : (
                                    editingMatch.details?.lineup.map(pid => {
                                        const p = players.find(player => player.id === pid);
                                        const currentPerf = editingMatch.details?.playerPerformances?.[pid] || {};
                                        const rating = currentPerf.rating || 0;
                                        const comment = currentPerf.comment || '';

                                        return (
                                            <div key={pid} className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm space-y-3.5 hover:border-amber-200 transition-colors">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                                                    <div className="flex items-center gap-3">
                                                        <img src={p?.image || 'https://images.unsplash.com/photo-1533107862482-0e6974b06ec4?q=80&w=200&h=200&fit=crop'} className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm shrink-0" />
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h5 className="font-black text-gray-900 text-sm">{p?.name || '未知球员'}</h5>
                                                                {p?.number && (
                                                                    <span className="text-[10px] font-black bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                                                        #{p.number}
                                                                    </span>
                                                                )}
                                                                {p?.position && (
                                                                    <span className="text-[10px] font-bold text-gray-400">
                                                                        {p.position}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                                                                {rating > 0 ? `评分: ${rating} 颗星` : '未打分'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 self-start sm:self-auto">
                                                        <span className="text-[11px] font-black text-gray-600 mr-1">个人表现打分:</span>
                                                        <div className="flex items-center gap-1">
                                                            {[1, 2, 3, 4, 5].map(star => (
                                                                <button
                                                                    key={star}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const current = ensureDetails(editingMatch);
                                                                        const performances = { ...(current.details?.playerPerformances || {}) };
                                                                        performances[pid] = {
                                                                            ...(performances[pid] || {}),
                                                                            rating: star
                                                                        };
                                                                        setEditingMatch({
                                                                            ...current,
                                                                            details: {
                                                                                ...current.details!,
                                                                                playerPerformances: performances
                                                                            }
                                                                        });
                                                                    }}
                                                                    className="p-1 hover:scale-125 transition-transform outline-none focus:outline-none"
                                                                    title={`${star} 颗星`}
                                                                >
                                                                    <Star
                                                                        className={`w-5 h-5 ${
                                                                            star <= rating
                                                                                ? 'text-amber-400 fill-amber-400 drop-shadow-sm'
                                                                                : 'text-gray-200 fill-gray-100'
                                                                        }`}
                                                                    />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-black text-gray-700 flex items-center gap-1.5">
                                                        <PenTool className="w-3.5 h-3.5 text-amber-500" />
                                                        个人点评
                                                    </label>
                                                    <textarea
                                                        rows={2}
                                                        className="w-full p-3 bg-gray-50/70 border border-gray-200/80 rounded-xl text-xs font-bold text-gray-800 placeholder-gray-400 outline-none focus:bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all shadow-inner"
                                                        placeholder="录入该球员本场比赛的个人点评（如：表现亮点、战术执行力、心态控制、针对性改进方向...）"
                                                        value={comment}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            const current = ensureDetails(editingMatch);
                                                            const performances = { ...(current.details?.playerPerformances || {}) };
                                                            performances[pid] = {
                                                                ...(performances[pid] || {}),
                                                                comment: val
                                                            };
                                                            setEditingMatch({
                                                                ...current,
                                                                details: {
                                                                    ...current.details!,
                                                                    playerPerformances: performances
                                                                }
                                                            });
                                                        }}
                                                    />
                                                </div>

                                                {/* 个人数据 & 个人荣誉 */}
                                                {(() => {
                                                    const goalsFromEvents = (editingMatch.details?.events || [])
                                                        .filter(e => e.playerId === pid && e.type === 'Goal').length;
                                                    const assistsFromEvents = (editingMatch.details?.events || [])
                                                        .filter(e => e.playerId === pid && e.type === 'Assist').length;

                                                    const goals = currentPerf.goals !== undefined ? currentPerf.goals : goalsFromEvents;
                                                    const assists = currentPerf.assists !== undefined ? currentPerf.assists : assistsFromEvents;
                                                    const honors: string[] = currentPerf.honors || [];

                                                    return (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50/70 p-3 rounded-xl border border-gray-100 mt-2">
                                                            <div className="space-y-1">
                                                                <label className="text-[11px] font-black text-gray-700 flex items-center gap-1.5">
                                                                    <Target className="w-3.5 h-3.5 text-bvb-yellow" />
                                                                    个人数据 (进球 / 助攻)
                                                                </label>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-gray-200">
                                                                        <span className="text-[10px] font-bold text-gray-400">进球:</span>
                                                                        <input
                                                                            type="number"
                                                                            min={0}
                                                                            className="w-10 text-xs font-black text-gray-900 outline-none font-mono"
                                                                            value={goals}
                                                                            onChange={e => {
                                                                                const val = parseInt(e.target.value) || 0;
                                                                                const current = ensureDetails(editingMatch);
                                                                                const performances = { ...(current.details?.playerPerformances || {}) };
                                                                                performances[pid] = {
                                                                                    ...(performances[pid] || {}),
                                                                                    goals: val
                                                                                };
                                                                                setEditingMatch({
                                                                                    ...current,
                                                                                    details: {
                                                                                        ...current.details!,
                                                                                        playerPerformances: performances
                                                                                    }
                                                                                });
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-gray-200">
                                                                        <span className="text-[10px] font-bold text-gray-400">助攻:</span>
                                                                        <input
                                                                            type="number"
                                                                            min={0}
                                                                            className="w-10 text-xs font-black text-gray-900 outline-none font-mono"
                                                                            value={assists}
                                                                            onChange={e => {
                                                                                const val = parseInt(e.target.value) || 0;
                                                                                const current = ensureDetails(editingMatch);
                                                                                const performances = { ...(current.details?.playerPerformances || {}) };
                                                                                performances[pid] = {
                                                                                    ...(performances[pid] || {}),
                                                                                    assists: val
                                                                                };
                                                                                setEditingMatch({
                                                                                    ...current,
                                                                                    details: {
                                                                                        ...current.details!,
                                                                                        playerPerformances: performances
                                                                                    }
                                                                                });
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-2 col-span-1 sm:col-span-2 pt-2 border-t border-gray-200/60">
                                                                <div className="flex items-center justify-between">
                                                                    <label className="text-[11px] font-black text-gray-700 flex items-center gap-1.5">
                                                                        <Trophy className="w-3.5 h-3.5 text-amber-500" />
                                                                        个人荣誉 (已被选中标签可按 ✕ 删除，也可输入新增)
                                                                    </label>
                                                                </div>

                                                                {/* 已授予该球员的荣誉标签 */}
                                                                {honors.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1.5 items-center bg-amber-50/80 p-2 rounded-xl border border-amber-200/60">
                                                                        <span className="text-[10px] font-bold text-amber-900 shrink-0">已得荣誉:</span>
                                                                        {honors.map(tag => (
                                                                            <span
                                                                                key={tag}
                                                                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-400 text-bvb-black border border-amber-500 shadow-2xs"
                                                                            >
                                                                                <span>🏆 {tag}</span>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleRemoveHonor(pid, tag)}
                                                                                    title="移除此荣誉标签"
                                                                                    className="w-3.5 h-3.5 rounded-full hover:bg-amber-600/30 flex items-center justify-center transition-colors cursor-pointer ml-0.5"
                                                                                >
                                                                                    <X className="w-2.5 h-2.5 text-bvb-black" />
                                                                                </button>
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                {/* 快捷预设标签与彻底删除预设 */}
                                                                <div className="space-y-1">
                                                                    <span className="text-[10px] font-bold text-gray-400 block">快捷点选预设 (点击右侧 ✕ 可直接删除该预设):</span>
                                                                    <div className="flex flex-wrap gap-1 items-center">
                                                                        {honorPresets.map(preset => {
                                                                            const isSelected = honors.includes(preset);
                                                                            return (
                                                                                <div
                                                                                    key={preset}
                                                                                    className={`inline-flex items-center rounded-full text-[10px] font-bold transition-all border ${
                                                                                        isSelected
                                                                                            ? 'bg-amber-100 text-amber-900 border-amber-400 font-black'
                                                                                            : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300'
                                                                                    }`}
                                                                                >
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            if (isSelected) {
                                                                                                handleRemoveHonor(pid, preset);
                                                                                            } else {
                                                                                                handleAddHonor(pid, preset);
                                                                                            }
                                                                                        }}
                                                                                        className="px-2 py-0.5 hover:opacity-80 cursor-pointer"
                                                                                    >
                                                                                        {isSelected ? '✓ ' : ''}{preset}
                                                                                    </button>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            handleRemovePreset(preset);
                                                                                        }}
                                                                                        title="从预设列表中删除"
                                                                                        className="pr-1.5 pl-0.5 text-gray-300 hover:text-red-500 transition-colors cursor-pointer"
                                                                                    >
                                                                                        <X className="w-2.5 h-2.5" />
                                                                                    </button>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>

                                                                {/* 新增自定义荣誉输入框 */}
                                                                <div className="flex items-center gap-1.5 pt-1">
                                                                    <input
                                                                        type="text"
                                                                        placeholder="输入自定义荣誉标签 (如: 最佳队长、道德风尚奖)..."
                                                                        className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white font-medium focus:outline-none focus:border-bvb-yellow"
                                                                        value={newHonorInputs[pid] || ''}
                                                                        onChange={(e) => setNewHonorInputs(prev => ({ ...prev, [pid]: e.target.value }))}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                e.preventDefault();
                                                                                handleAddHonor(pid);
                                                                            }
                                                                        }}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleAddHonor(pid)}
                                                                        className="px-3 py-1.5 bg-bvb-black text-white rounded-lg text-xs font-black hover:bg-gray-800 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                                                                    >
                                                                        <Plus className="w-3 h-3" />
                                                                        新增标签
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'events' && (
                        <div className="animate-in fade-in duration-300 space-y-4 md:space-y-6">
                            {editingMatch.isSeries && (
                                <div className="bg-white border-2 border-gray-100 p-4 rounded-2xl flex flex-col md:flex-row md:items-center gap-4">
                                    <div className="shrink-0 flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-bvb-yellow flex items-center justify-center">
                                            <Activity className="w-4 h-4 text-bvb-black" />
                                        </div>
                                        <label className="text-xs font-black text-gray-800 uppercase italic">选择具体场次进行记录</label>
                                    </div>
                                    <select 
                                        className="flex-1 p-2.5 border rounded-xl font-bold text-xs md:text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-bvb-yellow outline-none transition-all"
                                        value={selectedFixtureId || ''}
                                        onChange={e => setSelectedFixtureId(e.target.value)}
                                    >
                                        <option value="">-- 请选择系列赛场次 --</option>
                                        {(editingMatch.fixtures || []).map((f, i) => (
                                            <option key={f.id} value={f.id}>
                                                场次 #{i+1}: vs {f.opponent || '未命名对手'} ({f.date})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {(!editingMatch.isSeries || selectedFixtureId) ? (
                                <>
                                    <div className="bg-gray-50 p-4 md:p-6 rounded-2xl border border-gray-200">
                                        <h4 className="font-bold text-sm md:text-base text-gray-800 mb-3 md:mb-4 flex items-center"><Plus className="w-4 h-4 mr-2 text-bvb-yellow" /> 新增关键事件 {selectedFixtureId && <span className="ml-2 text-[10px] text-gray-400 italic">(当前场次)</span>}</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4 items-end">
                                            <div><label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 block">球员</label>
                                                <select className="w-full p-2 md:p-2.5 border rounded-xl text-[11px] md:text-sm font-bold bg-white" value={newEvent.playerId} onChange={e => setNewEvent({...newEvent, playerId: e.target.value})}>
                                                    <option value="">选择球员...</option>
                                                    {players.filter(p => p.teamId === editingMatch.teamId).filter(p => editingMatch.details?.lineup.includes(p.id)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                            </div>
                                            <div><label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 block">类型</label>
                                                <select className="w-full p-2 md:p-2.5 border rounded-xl text-[11px] md:text-sm font-bold bg-white" value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value as any})}>
                                                    <option value="Goal">进球 (Goal)</option><option value="Assist">助攻 (Assist)</option><option value="YellowCard">黄牌 (Yellow)</option><option value="RedCard">红牌 (Red)</option><option value="Sub">换人 (Sub)</option>
                                                </select>
                                            </div>
                                            <div><label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 block">时间 (分)</label><input type="number" className="w-full p-2 md:p-2.5 border rounded-xl font-bold text-xs md:text-sm" value={newEvent.minute} onChange={e => setNewEvent({...newEvent, minute: parseInt(e.target.value) || 0})} /></div>
                                            <button type="button" onClick={addEvent} disabled={!newEvent.playerId} className="bg-bvb-black text-white font-black py-2.5 rounded-xl hover:bg-gray-800 disabled:opacity-50 text-xs md:text-sm">添加</button>
                                        </div>
                                    </div>
                                    <div className="space-y-2 md:space-y-3">
                                        <h4 className="font-black text-[10px] md:text-xs text-gray-400 uppercase tracking-widest px-1">本场事件流</h4>
                                        {(() => {
                                            const currentEvents = editingMatch.isSeries 
                                                ? (editingMatch.fixtures?.find(f => f.id === selectedFixtureId)?.events || [])
                                                : (editingMatch.details?.events || []);
                                            
                                            if (currentEvents.length === 0) {
                                                return <div className="py-12 md:py-20 text-center text-[11px] md:text-sm text-gray-300 italic border-2 border-dashed border-gray-100 rounded-2xl">暂无记录</div>;
                                            }

                                            return (
                                                <div className="space-y-2">
                                                    {[...currentEvents].sort((a,b) => a.minute - b.minute).map(event => (
                                                        <div key={event.id} className="bg-white border border-gray-100 p-3 md:p-4 rounded-xl flex items-center justify-between group shadow-sm">
                                                            <div className="flex items-center gap-3 md:gap-4">
                                                                <span className="w-8 h-8 md:w-10 md:h-10 bg-gray-50 rounded-lg flex items-center justify-center font-mono font-black text-gray-400 text-xs md:text-sm">{event.minute}'</span>
                                                                <div className={`p-1.5 md:p-2 rounded-lg ${event.type === 'Goal' ? 'bg-green-50 text-green-600' : event.type === 'YellowCard' ? 'bg-yellow-50 text-yellow-600' : event.type === 'RedCard' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                                                    {event.type === 'Goal' ? <Star className="w-3.5 h-3.5 md:w-4 md:h-4" /> : event.type === 'YellowCard' ? <Flag className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Activity className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-gray-800 text-xs md:text-sm">{event.playerName}</p>
                                                                    <p className="text-[8px] md:text-[10px] text-gray-400 font-black uppercase">{event.type === 'Goal' ? '进球' : event.type === 'Assist' ? '助攻' : event.type === 'YellowCard' ? '黄牌' : '事件'}</p>
                                                                </div>
                                                            </div>
                                                            <button type="button" onClick={() => removeEvent(event.id)} className="p-2 text-gray-300 hover:text-red-500 md:opacity-0 group-hover:opacity-100 transition-all">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </>
                            ) : (
                                <div className="py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                                    <Activity className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                                    <p className="text-sm font-black text-gray-400 uppercase tracking-widest italic">请先在上方选择一个场次以记录事件</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'report' && (() => {
                        const currentOrgRating = editingMatch.details?.summaryBreakdown?.orgRating || {
                            eventOrganization: 5,
                            refereeLevel: 5,
                            venueCondition: 5,
                            accommodation: 5,
                            transportation: 5,
                            recommendParticipation: '是'
                        };

                        const updateOrgRatingField = (field: keyof OrgRating, val: any) => {
                            const current = ensureDetails(editingMatch);
                            setEditingMatch({
                                ...current,
                                details: {
                                    ...current.details!,
                                    summaryBreakdown: {
                                        ...current.details!.summaryBreakdown!,
                                        orgRating: {
                                            ...currentOrgRating,
                                            [field]: val
                                        }
                                    }
                                }
                            });
                        };

                        return (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                                    {/* 赛事组织评价 */}
                                    <div className="space-y-2 md:col-span-2 bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80">
                                        <label className="text-xs md:text-sm font-black text-amber-900 flex items-center uppercase tracking-widest gap-2 mb-2">
                                            <Star className="w-4 h-4 text-amber-500 fill-amber-400" /> 赛事组织评价
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {[
                                                { key: 'eventOrganization', label: '赛事组织' },
                                                { key: 'refereeLevel', label: '裁判水平' },
                                                { key: 'venueCondition', label: '场地条件' },
                                                { key: 'accommodation', label: '住宿环境' },
                                                { key: 'transportation', label: '交通配备' },
                                            ].map((item) => {
                                                const val = (currentOrgRating[item.key as keyof OrgRating] as number) ?? 5;
                                                return (
                                                    <div key={item.key} className="bg-white p-3 rounded-xl border border-amber-100/80 flex items-center justify-between shadow-2xs">
                                                        <span className="text-xs font-bold text-gray-700">{item.label}</span>
                                                        <div className="flex items-center gap-0.5">
                                                            {[1, 2, 3, 4, 5].map((star) => (
                                                                <button
                                                                    key={star}
                                                                    type="button"
                                                                    onClick={() => updateOrgRatingField(item.key as keyof OrgRating, star)}
                                                                    className="p-0.5 hover:scale-110 transition-transform cursor-pointer"
                                                                    title={`${star} 颗星`}
                                                                >
                                                                    <Star
                                                                        className={`w-4 h-4 ${
                                                                            star <= val
                                                                                ? 'text-amber-400 fill-amber-400'
                                                                                : 'text-gray-200 fill-gray-100'
                                                                        }`}
                                                                    />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            <div className="bg-white p-3 rounded-xl border border-amber-100/80 flex items-center justify-between shadow-2xs">
                                                <span className="text-xs font-bold text-gray-700">推荐再次参赛</span>
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateOrgRatingField('recommendParticipation', '是')}
                                                        className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer border ${
                                                            currentOrgRating.recommendParticipation === '是' || currentOrgRating.recommendParticipation === true
                                                                ? 'bg-green-600 text-white border-green-600 shadow-2xs'
                                                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-green-300'
                                                        }`}
                                                    >
                                                        👍 是
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateOrgRatingField('recommendParticipation', '否')}
                                                        className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer border ${
                                                            currentOrgRating.recommendParticipation === '否' || currentOrgRating.recommendParticipation === false
                                                                ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                                                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-red-300'
                                                        }`}
                                                    >
                                                        👎 否
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 md:space-y-2 md:col-span-2">
                                    <label className="text-xs md:text-sm font-black text-gray-800 flex items-center uppercase tracking-widest gap-2">
                                        <FileText className="w-4 h-4 text-bvb-yellow" /> 比赛整体评价
                                    </label>
                                    <textarea 
                                        className="w-full p-3 md:p-4 border rounded-2xl font-bold text-xs md:text-sm h-28 md:h-32 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-bvb-yellow outline-none transition-all shadow-inner"
                                        placeholder="对本次比赛/系列赛的总体印象与综合评价..."
                                        value={editingMatch.details?.summaryBreakdown?.overall || ''}
                                        onChange={e => {
                                            const val = e.target.value;
                                            const current = ensureDetails(editingMatch);
                                            setEditingMatch({
                                                ...current,
                                                details: {
                                                    ...current.details!,
                                                    summaryBreakdown: {
                                                        ...current.details!.summaryBreakdown!,
                                                        overall: val
                                                    }
                                                }
                                            });
                                        }}
                                    />
                                </div>

                                <div className="space-y-1.5 md:space-y-2">
                                    <label className="text-xs md:text-sm font-black text-gray-800 flex items-center uppercase tracking-widest gap-2">
                                        <TrendingUp className="w-4 h-4 text-green-600" /> 表现亮点
                                    </label>
                                    <textarea 
                                        className="w-full p-3 md:p-4 border border-green-100 rounded-2xl font-bold text-xs md:text-sm h-36 md:h-40 bg-green-50/20 focus:bg-white focus:ring-2 focus:ring-green-500 outline-none transition-all shadow-inner"
                                        placeholder="记录比赛中的战术执行亮点、个人优秀发挥、精彩配合与成功细节..."
                                        value={editingMatch.details?.summaryBreakdown?.highlights || ''}
                                        onChange={e => {
                                            const val = e.target.value;
                                            const current = ensureDetails(editingMatch);
                                            setEditingMatch({
                                                ...current,
                                                details: {
                                                    ...current.details!,
                                                    summaryBreakdown: {
                                                        ...current.details!.summaryBreakdown!,
                                                        highlights: val
                                                    }
                                                }
                                            });
                                        }}
                                    />
                                </div>

                                <div className="space-y-1.5 md:space-y-2">
                                    <label className="text-xs md:text-sm font-black text-gray-800 flex items-center uppercase tracking-widest gap-2">
                                        <AlertCircle className="w-4 h-4 text-red-500" /> 暴露的问题
                                    </label>
                                    <textarea 
                                        className="w-full p-3 md:p-4 border border-red-100 rounded-2xl font-bold text-xs md:text-sm h-36 md:h-40 bg-red-50/20 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-inner"
                                        placeholder="记录比赛中暴露出的短板、失误、战术执行不到位、体能或心态波动等问题..."
                                        value={editingMatch.details?.summaryBreakdown?.issuesExposed || ''}
                                        onChange={e => {
                                            const val = e.target.value;
                                            const current = ensureDetails(editingMatch);
                                            setEditingMatch({
                                                ...current,
                                                details: {
                                                    ...current.details!,
                                                    summaryBreakdown: {
                                                        ...current.details!.summaryBreakdown!,
                                                        issuesExposed: val
                                                    }
                                                }
                                            });
                                        }}
                                    />
                                </div>

                                <div className="space-y-1.5 md:space-y-2 md:col-span-2">
                                    <label className="text-xs md:text-sm font-black text-gray-800 flex items-center uppercase tracking-widest gap-2">
                                        <Target className="w-4 h-4 text-bvb-yellow" /> 下一阶段训练重点
                                    </label>
                                    <textarea 
                                        className="w-full p-3 md:p-4 border rounded-2xl font-bold text-xs md:text-sm h-28 md:h-32 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-bvb-yellow outline-none transition-all shadow-inner"
                                        placeholder="针对本次比赛暴露的问题，规划下一阶段的具体针对性训练科目、战术演练重点与改进目标..."
                                        value={editingMatch.details?.summaryBreakdown?.nextStageTraining || ''}
                                        onChange={e => {
                                            const val = e.target.value;
                                            const current = ensureDetails(editingMatch);
                                            setEditingMatch({
                                                ...current,
                                                details: {
                                                    ...current.details!,
                                                    summaryBreakdown: {
                                                        ...current.details!.summaryBreakdown!,
                                                        nextStageTraining: val
                                                    }
                                                }
                                            });
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })()}
                </div>
                
                <div className="bg-gray-50 p-3 md:p-4 border-t flex justify-end shrink-0">
                    <button 
                        type="button"
                        onClick={() => {
                            onUpdateMatch(editingMatch);
                            onClose();
                        }} 
                        className="px-6 md:px-10 py-2.5 md:py-3 bg-bvb-black text-white font-black rounded-xl shadow-xl hover:bg-gray-800 transition-all uppercase italic text-xs md:text-sm flex items-center gap-2"
                    >
                        <Save className="w-4 h-4 text-bvb-yellow" />
                        保存确认并退出
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MatchEditModal;
