import React from 'react';
import { DrillDesign } from '../../types';
import { PitchSvgRenderer } from './PitchSvgRenderer';
import {
  X, Printer, Layers, BookOpen
} from 'lucide-react';

interface SessionDetailViewModalProps {
  item: DrillDesign | null;
  allDesigns: DrillDesign[];
  onClose: () => void;
  onEdit: (item: DrillDesign) => void;
}

export const SessionDetailViewModal: React.FC<SessionDetailViewModalProps> = ({
  item,
  allDesigns,
  onClose,
  onEdit
}) => {
  if (!item) return null;

  const isPlan = item.category === 'session_plan' || item.contentType === 'session_plan';
  const isDrill = item.category === 'drill_item' || item.contentType === 'drill';

  // Find drills linked in this plan
  const planStages = item.sessionStages || [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 via-white to-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-bvb-black flex items-center justify-center text-bvb-yellow shadow-md">
              {isPlan ? <BookOpen className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-gray-900 tracking-tight">{item.title}</h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {isPlan ? '主题教案' : isDrill ? '训练项' : '示意图'}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-mono mt-0.5">创建于: {item.createdAt} · 作者: {item.authorName || '多特蒙德青训教练组'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>打印教案</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onEdit(item);
              }}
              className="px-3.5 py-1.5 bg-bvb-black hover:bg-black text-bvb-yellow text-xs font-black rounded-xl shadow-md transition-colors"
            >
              编辑
            </button>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
          
          {/* Main Diagram or Cover */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Diagram / Pitch Box */}
            <div className="lg:col-span-6 bg-gray-950 rounded-2xl overflow-hidden shadow-lg border-2 border-gray-900 aspect-[16/10] relative flex items-center justify-center">
              {item.previewImage ? (
                <img src={item.previewImage} alt="" className="w-full h-full object-contain" />
              ) : (
                <PitchSvgRenderer pitchType={item.pitchType || 'Midfield'} pitchTheme={item.pitchTheme || 'Grass'} className="w-full h-full" />
              )}
            </div>

            {/* Right Meta & Parameters Box */}
            <div className="lg:col-span-6 space-y-4">
              {item.description && (
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                  <h4 className="text-xs font-black text-gray-900 mb-1">教案简介与重难点</h4>
                  <p className="text-xs text-gray-700 leading-relaxed">{item.description}</p>
                </div>
              )}

              {/* Drill Parameters Badges */}
              {isDrill && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-blue-50/70 p-2.5 rounded-xl border border-blue-100 text-center">
                    <span className="text-[10px] text-blue-600 font-bold block">训练主题</span>
                    <span className="text-xs font-black text-blue-900">{item.topic || '综合'}</span>
                  </div>
                  <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100 text-center">
                    <span className="text-[10px] text-emerald-600 font-bold block">训练时长</span>
                    <span className="text-xs font-black text-emerald-900">{item.durationMinutes || 15} 分钟</span>
                  </div>
                  <div className="bg-purple-50/70 p-2.5 rounded-xl border border-purple-100 text-center">
                    <span className="text-[10px] text-purple-600 font-bold block">人数规模</span>
                    <span className="text-xs font-black text-purple-900">{item.playerCount || 8} 人</span>
                  </div>
                  <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-100 text-center">
                    <span className="text-[10px] text-amber-600 font-bold block">场地尺寸</span>
                    <span className="text-xs font-black text-amber-900">{item.fieldLength || 20}x{item.fieldWidth || 15} 米</span>
                  </div>
                  <div className="bg-rose-50/70 p-2.5 rounded-xl border border-rose-100 text-center">
                    <span className="text-[10px] text-rose-600 font-bold block">足球数量</span>
                    <span className="text-xs font-black text-rose-900">{item.ballCount || 6} 个</span>
                  </div>
                  <div className="bg-teal-50/70 p-2.5 rounded-xl border border-teal-100 text-center">
                    <span className="text-[10px] text-teal-600 font-bold block">标志物</span>
                    <span className="text-xs font-black text-teal-900">{item.coneCount || 8} 个</span>
                  </div>
                </div>
              )}

              {/* Age groups chips */}
              {item.ageGroups && item.ageGroups.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold text-gray-500 block mb-1">适用年龄段:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {item.ageGroups.map(a => (
                      <span key={a} className="px-2.5 py-0.5 rounded-lg bg-gray-900 text-yellow-400 text-xs font-mono font-bold">
                        {a} 岁
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Drill Structured Sections (组织方法, 指导要点, 变化进阶) */}
          {isDrill && (
            <div className="space-y-4 pt-2 border-t border-gray-100">
              {item.organization && (
                <div className="bg-white p-4 rounded-2xl border border-gray-200">
                  <h4 className="text-xs font-black text-gray-900 flex items-center gap-1.5 mb-2">
                    <span className="w-5 h-5 rounded-lg bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                    <span>组织方法 (步骤与站位)</span>
                  </h4>
                  <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed pl-6">{item.organization}</p>
                </div>
              )}

              {item.coachingPoints && (
                <div className="bg-white p-4 rounded-2xl border border-gray-200">
                  <h4 className="text-xs font-black text-gray-900 flex items-center gap-1.5 mb-2">
                    <span className="w-5 h-5 rounded-lg bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                    <span>指导要点 (技术关键与心理)</span>
                  </h4>
                  <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed pl-6">{item.coachingPoints}</p>
                </div>
              )}

              {item.progressions && (
                <div className="bg-white p-4 rounded-2xl border border-gray-200">
                  <h4 className="text-xs font-black text-gray-900 flex items-center gap-1.5 mb-2">
                    <span className="w-5 h-5 rounded-lg bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">3</span>
                    <span>变化与进阶 (规则与防守调整)</span>
                  </h4>
                  <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed pl-6">{item.progressions}</p>
                </div>
              )}
            </div>
          )}

          {/* Session Plan Stages Breakdown */}
          {isPlan && (
            <div className="space-y-4 pt-2 border-t border-gray-100">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>教案完整训练环节流程 ({planStages.length}个环节)</span>
              </h3>

              <div className="space-y-3">
                {planStages.map((stage, idx) => {
                  const stageDrills = allDesigns.filter(d => stage.drillIds.includes(d.id));

                  return (
                    <div key={stage.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-bvb-black text-bvb-yellow text-xs font-black flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <h4 className="text-xs font-black text-gray-900">{stage.name}</h4>
                          {stage.focus && (
                            <span className="text-[11px] text-gray-500 font-medium">({stage.focus})</span>
                          )}
                        </div>
                        <span className="text-xs font-mono font-bold text-gray-600 bg-white px-2.5 py-0.5 rounded-lg border border-gray-200">
                          {stage.duration || 15} 分钟
                        </span>
                      </div>

                      {stageDrills.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {stageDrills.map(d => (
                            <div key={d.id} className="bg-white p-3 rounded-xl border border-gray-200 flex items-center gap-3">
                              <div className="w-14 h-10 bg-gray-950 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                                {d.previewImage ? (
                                  <img src={d.previewImage} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <PitchSvgRenderer pitchType={d.pitchType} pitchTheme={d.pitchTheme} className="w-full h-full" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <h5 className="text-xs font-black text-gray-900 truncate">{d.title}</h5>
                                <p className="text-[10px] text-gray-500 truncate mt-0.5">{d.topic} · {d.durationMinutes || 15}分钟</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
