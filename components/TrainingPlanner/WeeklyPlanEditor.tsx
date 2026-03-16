import React, { useState } from 'react';
import { X, Save, ClipboardCopy, ClipboardPaste } from 'lucide-react';
import { WeeklyPlan } from '../../types';

interface WeeklyPlanEditorProps {
    week: WeeklyPlan;
    onSave: (week: WeeklyPlan) => void;
    onClose: () => void;
    clipboard: WeeklyPlan | null;
    onCopy: (week: WeeklyPlan) => void;
}

const WeeklyPlanEditor: React.FC<WeeklyPlanEditorProps> = ({ week, onSave, onClose, clipboard, onCopy }) => {
    const [localWeek, setLocalWeek] = useState<WeeklyPlan>({ ...week });

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                <div className="bg-bvb-black p-5 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <h3 className="font-black italic uppercase tracking-tight">编辑周期计划</h3>
                        <span className="text-[10px] bg-bvb-yellow text-bvb-black px-2 py-0.5 rounded font-black">{localWeek.month}月 第{localWeek.weekInMonth}周</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => onCopy(localWeek)} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="复制此周"><ClipboardCopy className="w-5 h-5" /></button>
                        <button onClick={onClose}><X className="w-6 h-6" /></button>
                    </div>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">体能主题</label><input className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none focus:ring-2 focus:ring-bvb-yellow" value={localWeek.physicalTheme} onChange={e => setLocalWeek({...localWeek, physicalTheme: e.target.value})} /></div>
                        <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">训练主题</label><input className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl font-black text-bvb-black outline-none focus:ring-2 focus:ring-bvb-yellow" value={localWeek.trainingTheme} onChange={e => setLocalWeek({...localWeek, trainingTheme: e.target.value})} /></div>
                    </div>
                    <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">训练内容</label><textarea className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none focus:ring-2 focus:ring-bvb-yellow min-h-[80px]" value={localWeek.trainingContent} onChange={e => setLocalWeek({...localWeek, trainingContent: e.target.value})} /></div>
                    <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">情景对抗</label><input className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none focus:ring-2 focus:ring-bvb-yellow text-blue-600" value={localWeek.oppositionContent} onChange={e => setLocalWeek({...localWeek, oppositionContent: e.target.value})} /></div>
                    <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">训练目标</label><textarea className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none focus:ring-2 focus:ring-bvb-yellow min-h-[80px] text-red-600" value={localWeek.trainingGoals} onChange={e => setLocalWeek({...localWeek, trainingGoals: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">赛事计划</label><input className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none focus:ring-2 focus:ring-bvb-yellow" value={localWeek.matchPlan} onChange={e => setLocalWeek({...localWeek, matchPlan: e.target.value})} /></div>
                        <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">备注</label><input className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none focus:ring-2 focus:ring-bvb-yellow" value={localWeek.remarks} onChange={e => setLocalWeek({...localWeek, remarks: e.target.value})} /></div>
                    </div>
                </div>
                <div className="p-6 bg-gray-50 border-t flex gap-3 shrink-0">
                    <button onClick={onClose} className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 font-black rounded-xl hover:bg-gray-100 transition-all uppercase tracking-widest text-xs">取消</button>
                    <button onClick={() => onSave(localWeek)} className="flex-1 py-3 bg-bvb-yellow text-bvb-black font-black rounded-xl hover:brightness-105 shadow-lg transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                        <Save className="w-4 h-4" /> 保存计划
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WeeklyPlanEditor;
