import React, { useState, useEffect, useMemo } from 'react';
import { 
    X, Save, Users, Clock, Target, Zap, Loader2, 
    CheckCircle, AlertCircle, MessageSquare, ShieldCheck, 
    Download, Copy, History, Star, ChevronRight, ChevronLeft,
    Search, LayoutList, Calendar as CalendarIcon, TableProperties,
    Plus, PenTool, FileText, Bell, RefreshCw, PieChart as PieChartIcon,
    Brain, ClipboardCopy, ClipboardPaste, Trash2, UserPlus, UserMinus
} from 'lucide-react';
import { TrainingSession, AttendanceRecord, Player, Team, User, DrillDesign } from '../../types';
import Markdown from 'react-markdown';
import { generateTrainingFeedback } from '../../services/geminiService';
import { exportToPDF } from '../../services/pdfService';

interface SessionDetailModalProps {
    session: TrainingSession;
    teams: Team[];
    players: Player[];
    drillLibrary: string[];
    trainingFoci: string[];
    currentUser: User;
    onUpdate: (session: TrainingSession, attendance: AttendanceRecord[]) => void;
    onDuplicate: (session: TrainingSession) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
    allSessions: TrainingSession[];
}

const SessionDetailModal: React.FC<SessionDetailModalProps> = ({ 
    session, teams, players, drillLibrary, trainingFoci, currentUser, 
    onUpdate, onDuplicate, onDelete, onClose, allSessions 
}) => {
    const [localSession, setLocalSession] = useState<TrainingSession>({ ...session });
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
    const [activeTab, setActiveTab] = useState<'plan' | 'attendance' | 'review'>('plan');
    const [isExporting, setIsExporting] = useState(false);

    const isCoach = currentUser.role === 'coach';
    const isDirector = currentUser.role === 'director' || currentUser.role === 'admin';
    const team = teams.find(t => t.id === session.teamId);
    const teamPlayers = players.filter(p => p.teamId === session.teamId);

    // Sync local state if prop changes (but not while editing)
    useEffect(() => {
        if (saveStatus === 'idle') {
            setLocalSession({ ...session });
        }
    }, [session]);

    const handleSave = () => {
        setSaveStatus('saving');
        onUpdate(localSession, localSession.attendance);
        setTimeout(() => setSaveStatus('saved'), 800);
        setTimeout(() => setSaveStatus('idle'), 3000);
    };

    const handleToggleAttendance = (playerId: string, status: AttendanceRecord['status']) => {
        const nextAttendance = [...localSession.attendance];
        const idx = nextAttendance.findIndex(a => a.playerId === playerId);
        if (idx >= 0) {
            if (nextAttendance[idx].status === status) {
                nextAttendance.splice(idx, 1);
            } else {
                nextAttendance[idx].status = status;
            }
        } else {
            nextAttendance.push({ playerId, status, timestamp: new Date().toISOString() });
        }
        setLocalSession(prev => ({ ...prev, attendance: nextAttendance }));
    };

    const handleGenerateAiFeedback = async () => {
        setIsGeneratingFeedback(true);
        try {
            const feedback = await generateTrainingFeedback(localSession);
            setLocalSession(prev => ({ ...prev, directorReview: feedback }));
        } catch (error) {
            console.error(error);
            alert('AI 生成失败');
        } finally {
            setIsGeneratingFeedback(false);
        }
    };

    const stats = useMemo(() => {
        const present = localSession.attendance.filter(a => a.status === 'Present').length;
        const late = localSession.attendance.filter(a => a.status === 'Late').length;
        const absent = localSession.attendance.filter(a => a.status === 'Absent').length;
        const injury = localSession.attendance.filter(a => a.status === 'Injury').length;
        return { present, late, absent, injury, total: teamPlayers.length };
    }, [localSession.attendance, teamPlayers]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-white w-full h-full md:h-auto md:max-w-4xl rounded-none md:rounded-3xl shadow-2xl overflow-hidden flex flex-col md:max-h-[90vh] animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="bg-bvb-black p-4 md:p-6 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-xl ${localSession.intensity === 'High' ? 'bg-red-500' : localSession.intensity === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'}`}>
                            <Zap className="w-5 h-5 text-bvb-black" />
                        </div>
                        <div>
                            <h3 className="text-lg md:text-xl font-black italic uppercase tracking-tight leading-none mb-1">{localSession.title}</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{team?.name} • {localSession.date}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-2 mr-4">
                            {saveStatus === 'saving' && <span className="text-[10px] font-black uppercase text-bvb-yellow animate-pulse">Saving...</span>}
                            {saveStatus === 'saved' && <span className="text-[10px] font-black uppercase text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Saved</span>}
                        </div>
                        <button onClick={() => onDuplicate(localSession)} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="复制计划"><Copy className="w-5 h-5" /></button>
                        <button onClick={() => { if(confirm('确定要删除这节训练课吗？')) onDelete(localSession.id); }} className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400" title="删除计划"><Trash2 className="w-5 h-5" /></button>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><X className="w-6 h-6" /></button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex bg-gray-100 p-1 md:p-1.5 shrink-0">
                    <button onClick={() => setActiveTab('plan')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'plan' ? 'bg-white shadow-md text-bvb-black' : 'text-gray-400 hover:text-gray-600'}`}>
                        <PenTool className="w-4 h-4" /> 训练教案
                    </button>
                    <button onClick={() => setActiveTab('attendance')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'attendance' ? 'bg-white shadow-md text-bvb-black' : 'text-gray-400 hover:text-gray-600'}`}>
                        <Users className="w-4 h-4" /> 出勤与日志
                    </button>
                    <button onClick={() => setActiveTab('review')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'review' ? 'bg-white shadow-md text-bvb-black' : 'text-gray-400 hover:text-gray-600'}`}>
                        <ShieldCheck className="w-4 h-4" /> 总监审核
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-gray-50/50">
                    {activeTab === 'plan' && (
                        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">训练重点</label>
                                    <div className="flex items-center gap-2">
                                        <Target className="w-5 h-5 text-bvb-yellow" />
                                        <span className="font-black text-gray-800">{localSession.focus}</span>
                                    </div>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">训练时长</label>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-bvb-yellow" />
                                        <span className="font-black text-gray-800">{localSession.duration} 分钟</span>
                                    </div>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">训练强度</label>
                                    <div className="flex items-center gap-2">
                                        <Zap className="w-5 h-5 text-bvb-yellow" />
                                        <span className="font-black text-gray-800">{localSession.intensity === 'High' ? '高 (比赛级)' : localSession.intensity === 'Medium' ? '中 (常规)' : '低 (恢复)'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                                    <h4 className="font-black text-gray-800 uppercase italic tracking-tight flex items-center gap-2">
                                        <LayoutList className="w-5 h-5 text-bvb-yellow" /> 训练项目明细
                                    </h4>
                                    <button 
                                        onClick={async () => {
                                            setIsExporting(true);
                                            try { await exportToPDF('training-session-export', `训练教案_${localSession.title}_${localSession.date}`); }
                                            catch(e) { alert('导出失败'); } finally { setIsExporting(false); }
                                        }}
                                        className="text-[10px] font-black uppercase flex items-center gap-1.5 px-3 py-1.5 bg-bvb-black text-white rounded-lg hover:bg-gray-800 transition-all"
                                    >
                                        {isExporting ? <Loader2 className="w-3 h-3 animate-spin"/> : <Download className="w-3 h-3 text-bvb-yellow"/>}
                                        导出教案
                                    </button>
                                </div>
                                <div id="training-session-export" className="p-8 space-y-6">
                                    {localSession.drills.length > 0 ? (
                                        <div className="space-y-4">
                                            {localSession.drills.map((drill, idx) => (
                                                <div key={idx} className="flex gap-4 group">
                                                    <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 font-black text-gray-400 group-hover:bg-bvb-yellow group-hover:text-bvb-black transition-all">{idx + 1}</div>
                                                    <div className="flex-1 pt-1.5">
                                                        <p className="text-gray-700 font-bold leading-relaxed">{drill}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-12 text-center text-gray-400 italic font-bold">-- 暂无详细训练项目描述 --</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'attendance' && (
                        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
                            {/* Attendance Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">应到人数</p>
                                    <p className="text-xl font-black text-gray-800">{stats.total}</p>
                                </div>
                                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                                    <p className="text-[10px] font-black text-green-500 uppercase mb-1">实到人数</p>
                                    <p className="text-xl font-black text-green-600">{stats.present + stats.late}</p>
                                </div>
                                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                                    <p className="text-[10px] font-black text-red-500 uppercase mb-1">缺勤人数</p>
                                    <p className="text-xl font-black text-red-600">{stats.absent}</p>
                                </div>
                                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                                    <p className="text-[10px] font-black text-yellow-500 uppercase mb-1">伤病人数</p>
                                    <p className="text-xl font-black text-yellow-600">{stats.injury}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Attendance List */}
                                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                                    <div className="p-5 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                                        <h4 className="font-black text-gray-800 uppercase text-xs flex items-center gap-2">
                                            <Users className="w-4 h-4 text-bvb-yellow" /> 球员出勤点名
                                        </h4>
                                        <span className="text-[10px] font-black text-gray-400 bg-white px-2 py-1 rounded border border-gray-100">
                                            {localSession.attendance.length} / {teamPlayers.length} 已记录
                                        </span>
                                    </div>
                                    <div className="p-4 overflow-y-auto max-h-[400px] custom-scrollbar space-y-2">
                                        {teamPlayers.map(p => {
                                            const record = localSession.attendance.find(a => a.playerId === p.id);
                                            return (
                                                <div key={p.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                                    <div className="flex items-center gap-3">
                                                        <img src={p.image} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                                                        <div>
                                                            <p className="font-black text-sm text-gray-800">{p.name}</p>
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase">#{p.number} • {p.position}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex bg-gray-100 p-1 rounded-xl">
                                                        <button 
                                                            onClick={() => handleToggleAttendance(p.id, 'Present')}
                                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${record?.status === 'Present' ? 'bg-green-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                                                        >
                                                            出勤
                                                        </button>
                                                        <button 
                                                            onClick={() => handleToggleAttendance(p.id, 'Late')}
                                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${record?.status === 'Late' ? 'bg-yellow-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                                                        >
                                                            迟到
                                                        </button>
                                                        <button 
                                                            onClick={() => handleToggleAttendance(p.id, 'Absent')}
                                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${record?.status === 'Absent' ? 'bg-red-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                                                        >
                                                            缺勤
                                                        </button>
                                                        <button 
                                                            onClick={() => handleToggleAttendance(p.id, 'Injury')}
                                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${record?.status === 'Injury' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                                                        >
                                                            伤病
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Training Log */}
                                <div className="space-y-6">
                                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                                        <div className="p-5 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                                            <h4 className="font-black text-gray-800 uppercase text-xs flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-bvb-yellow" /> 训练课后日志
                                            </h4>
                                            {localSession.submissionStatus === 'Submitted' && (
                                                <span className="text-[9px] font-black text-blue-600 uppercase flex items-center gap-1">
                                                    <RefreshCw className="w-3 h-3 animate-spin" /> 审核中
                                                </span>
                                            )}
                                        </div>
                                        <div className="p-6 space-y-6">
                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">训练课整体评价 (1-10分)</label>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    {Object.entries(localSession.performanceRatings || { technical: 5, application: 5, focus: 5, discipline: 5 }).map(([key, val]) => (
                                                        <div key={key} className="space-y-2">
                                                            <span className="text-[9px] font-bold text-gray-500 uppercase">{key === 'technical' ? '技战术' : key === 'application' ? '应用' : key === 'focus' ? '专注度' : '纪律性'}</span>
                                                            <input 
                                                                type="number" min="1" max="10" 
                                                                className="w-full p-2 bg-gray-50 border border-gray-100 rounded-xl font-black text-center focus:ring-2 focus:ring-bvb-yellow outline-none"
                                                                value={val}
                                                                onChange={e => setLocalSession(prev => ({
                                                                    ...prev,
                                                                    performanceRatings: { ...prev.performanceRatings, [key]: parseInt(e.target.value) }
                                                                }))}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">教练员课后反思</label>
                                                <textarea 
                                                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-bvb-yellow outline-none min-h-[120px] resize-none"
                                                    placeholder="记录训练中的亮点、不足及改进方向..."
                                                    value={localSession.planReflection}
                                                    onChange={e => setLocalSession(prev => ({ ...prev, planReflection: e.target.value }))}
                                                />
                                            </div>

                                            {/* 重点关注球员反馈 */}
                                            {localSession.focusedPlayerIds && localSession.focusedPlayerIds.length > 0 && (
                                                <div className="space-y-4 pt-4 border-t border-gray-50">
                                                    <label className="text-[10px] font-black text-bvb-black uppercase tracking-widest flex items-center gap-1.5">
                                                        <Star className="w-3.5 h-3.5 text-bvb-yellow fill-current" /> 重点关注球员反馈
                                                    </label>
                                                    <div className="space-y-4">
                                                        {localSession.focusedPlayerIds.map(pid => {
                                                            const p = players.find(player => player.id === pid);
                                                            if (!p) return null;
                                                            return (
                                                                <div key={pid} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                                                    <div className="flex items-center gap-2 mb-3">
                                                                        <img src={p.image} className="w-6 h-6 rounded-full object-cover" />
                                                                        <span className="text-xs font-black text-gray-800">{p.name}</span>
                                                                    </div>
                                                                    <div className="grid grid-cols-1 gap-3">
                                                                        <input 
                                                                            className="w-full p-2 bg-white border border-gray-100 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-bvb-yellow"
                                                                            placeholder="技术表现反馈..."
                                                                            value={localSession.focusedPlayerNotes?.[pid]?.technical || ''}
                                                                            onChange={e => setLocalSession(prev => ({
                                                                                ...prev,
                                                                                focusedPlayerNotes: {
                                                                                    ...prev.focusedPlayerNotes,
                                                                                    [pid]: { ...(prev.focusedPlayerNotes?.[pid] || { technical: '', mental: '' }), technical: e.target.value }
                                                                                }
                                                                            }))}
                                                                        />
                                                                        <input 
                                                                            className="w-full p-2 bg-white border border-gray-100 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-indigo-200"
                                                                            placeholder="心理/态度反馈..."
                                                                            value={localSession.focusedPlayerNotes?.[pid]?.mental || ''}
                                                                            onChange={e => setLocalSession(prev => ({
                                                                                ...prev,
                                                                                focusedPlayerNotes: {
                                                                                    ...prev.focusedPlayerNotes,
                                                                                    [pid]: { ...(prev.focusedPlayerNotes?.[pid] || { technical: '', mental: '' }), mental: e.target.value }
                                                                                }
                                                                            }))}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            <button 
                                                onClick={() => {
                                                    const nextStatus = localSession.submissionStatus === 'Planned' ? 'Submitted' : 'Planned';
                                                    setLocalSession(prev => ({ ...prev, submissionStatus: nextStatus }));
                                                    alert(nextStatus === 'Submitted' ? '日志已提交审核' : '已撤回提交');
                                                }}
                                                className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${localSession.submissionStatus === 'Submitted' ? 'bg-gray-100 text-gray-400' : 'bg-bvb-yellow text-bvb-black shadow-lg hover:brightness-105'}`}
                                            >
                                                {localSession.submissionStatus === 'Submitted' ? <><RefreshCw className="w-4 h-4" /> 撤回提交</> : <><FileText className="w-4 h-4" /> 提交日志审核</>}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'review' && (
                        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
                            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                                    <h4 className="font-black text-gray-800 uppercase italic tracking-tight flex items-center gap-2">
                                        <ShieldCheck className="w-5 h-5 text-bvb-yellow" /> 总监审核与评价
                                    </h4>
                                    {isDirector && (
                                        <button 
                                            onClick={handleGenerateAiFeedback}
                                            disabled={isGeneratingFeedback}
                                            className="text-[10px] font-black uppercase flex items-center gap-1.5 px-3 py-1.5 bg-bvb-yellow text-bvb-black rounded-lg hover:brightness-105 transition-all shadow-sm"
                                        >
                                            {isGeneratingFeedback ? <Loader2 className="w-3 h-3 animate-spin"/> : <Zap className="w-3 h-3 fill-current"/>}
                                            AI 辅助评价
                                        </button>
                                    )}
                                </div>
                                <div className="p-8 space-y-6">
                                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 min-h-[200px] relative">
                                        {isDirector ? (
                                            <textarea 
                                                className="w-full bg-transparent text-sm font-bold text-gray-700 outline-none min-h-[150px] resize-none"
                                                placeholder="输入对本节训练课的指导建议及评价..."
                                                value={localSession.directorReview || ''}
                                                onChange={e => setLocalSession(prev => ({ ...prev, directorReview: e.target.value, submissionStatus: 'Reviewed', isReviewRead: false }))}
                                            />
                                        ) : (
                                            <div className="prose prose-sm max-w-none">
                                                {localSession.directorReview ? (
                                                    <Markdown>{localSession.directorReview}</Markdown>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center py-12 text-gray-300">
                                                        <MessageSquare className="w-12 h-12 opacity-10 mb-4" />
                                                        <p className="text-xs font-black uppercase tracking-widest">暂无总监评价</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {localSession.submissionStatus === 'Reviewed' && (
                                            <div className="absolute top-4 right-4 flex items-center gap-2">
                                                <span className="text-[9px] font-black text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100 uppercase">已审核</span>
                                                {isCoach && !localSession.isReviewRead && (
                                                    <button 
                                                        onClick={() => {
                                                            setLocalSession(prev => ({ ...prev, isReviewRead: true }));
                                                            alert('已确认阅读反馈');
                                                        }}
                                                        className="text-[9px] font-black text-white bg-bvb-black px-2 py-1 rounded shadow-sm hover:bg-gray-800 transition-all uppercase"
                                                    >
                                                        确认阅读
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {isDirector && (
                                        <div className="flex gap-4">
                                            <button 
                                                onClick={() => {
                                                    setLocalSession(prev => ({ ...prev, submissionStatus: 'Reviewed', isReviewRead: false }));
                                                    alert('审核已完成');
                                                }}
                                                className="flex-1 py-3 bg-bvb-black text-white font-black rounded-xl hover:bg-gray-800 shadow-lg transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                                            >
                                                <ShieldCheck className="w-4 h-4 text-bvb-yellow" /> 完成审核
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 md:p-6 bg-white border-t flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2">
                        {saveStatus === 'saving' && <Loader2 className="w-4 h-4 text-bvb-yellow animate-spin" />}
                        <span className={`text-[10px] font-black uppercase ${saveStatus === 'saved' ? 'text-green-500' : 'text-gray-400'}`}>
                            {saveStatus === 'saving' ? '数据同步中...' : saveStatus === 'saved' ? '所有更改已保存' : '就绪'}
                        </span>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={onClose}
                            className="px-6 py-2.5 bg-gray-100 text-gray-600 font-black rounded-xl hover:bg-gray-200 transition-all text-xs uppercase tracking-widest"
                        >
                            关闭
                        </button>
                        <button 
                            onClick={handleSave}
                            className="px-8 py-2.5 bg-bvb-yellow text-bvb-black font-black rounded-xl hover:brightness-105 shadow-lg transition-all text-xs uppercase tracking-widest flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" /> 确认并保存
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SessionDetailModal;
