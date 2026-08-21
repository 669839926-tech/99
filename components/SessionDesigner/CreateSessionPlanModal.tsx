import React, { useState } from 'react';
import { DrillDesign, SessionPlanStage, User } from '../../types';
import { DRILL_STAGES } from './constants';
import {
  X, Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Save,
  Search, BookOpen, Clock, Layers, Check,
  FileText, Sparkles, Send
} from 'lucide-react';
import { PitchSvgRenderer } from './PitchSvgRenderer';

interface CreateSessionPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (plan: DrillDesign) => void;
  currentUser: User | null;
  availableDrills: DrillDesign[];
  onOpenCreateDrillModal: () => void;
  initialPlan?: DrillDesign | null;
}

export const CreateSessionPlanModal: React.FC<CreateSessionPlanModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentUser,
  availableDrills,
  onOpenCreateDrillModal,
  initialPlan
}) => {
  const [title, setTitle] = useState(initialPlan?.title || '');
  const [description, setDescription] = useState(initialPlan?.description || '');
  const [targetAge, setTargetAge] = useState(initialPlan?.targetAge || 'U9 (8-9岁)');
  const [isPrivate, setIsPrivate] = useState(initialPlan?.isPrivate ?? false);

  // Stages State (Video 4 defaults to 5 stages)
  const [stages, setStages] = useState<SessionPlanStage[]>(
    initialPlan?.sessionStages && initialPlan.sessionStages.length > 0
      ? initialPlan.sessionStages
      : [
          { id: 'stg-1', name: '1. 热身环节', duration: 15, focus: '球感熟悉与动态热身', drillIds: [] },
          { id: 'stg-2', name: '2. 技术环节', duration: 20, focus: '基础动作传控精细化', drillIds: [] },
          { id: 'stg-3', name: '3. 技能环节', duration: 20, focus: '有防守压迫下的1v1与变向决策', drillIds: [] },
          { id: 'stg-4', name: '4. 情景对抗', duration: 20, focus: '局部人数优势与攻防转换', drillIds: [] },
          { id: 'stg-5', name: '5. 小比赛', duration: 15, focus: '全场实战演练与主题战术验收', drillIds: [] }
        ]
  );

  const [activeStageId, setActiveStageId] = useState<string>(stages[0]?.id || 'stg-1');

  // Drill Selector Tab & Filters
  const [drillTab, setDrillTab] = useState<'my' | 'favorites' | 'library'>('my');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState<string>('all');

  if (!isOpen) return null;

  const totalDuration = stages.reduce((sum, s) => sum + (s.duration || 0), 0);

  // Stage Manipulation
  const handleAddStage = () => {
    const newIdx = stages.length + 1;
    const newStage: SessionPlanStage = {
      id: `stg-${Date.now()}`,
      name: `${newIdx}. 自定义训练环节`,
      duration: 15,
      focus: '针对性强化训练',
      drillIds: []
    };
    setStages([...stages, newStage]);
    setActiveStageId(newStage.id);
  };

  const handleRemoveStage = (id: string) => {
    if (stages.length <= 1) return;
    const next = stages.filter(s => s.id !== id);
    setStages(next);
    if (activeStageId === id) {
      setActiveStageId(next[0]?.id || '');
    }
  };

  const handleMoveStage = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === stages.length - 1)) return;
    const next = [...stages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    setStages(next);
  };

  const handleUpdateStage = (id: string, updates: Partial<SessionPlanStage>) => {
    setStages(stages.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  // Add/Remove Drill into Active Stage
  const handleAddDrillToStage = (drillId: string) => {
    setStages(stages.map(s => {
      if (s.id === activeStageId) {
        if (s.drillIds.includes(drillId)) return s;
        return { ...s, drillIds: [...s.drillIds, drillId] };
      }
      return s;
    }));
  };

  const handleRemoveDrillFromStage = (stageId: string, drillId: string) => {
    setStages(stages.map(s => {
      if (s.id === stageId) {
        return { ...s, drillIds: s.drillIds.filter(id => id !== drillId) };
      }
      return s;
    }));
  };

  // Filter Drills in Right Panel
  const filteredDrills = availableDrills.filter(drill => {
    if (drill.category === 'session_plan') return false;
    if (drillTab === 'my' && drill.authorId && currentUser && drill.authorId !== currentUser.id) return false;
    if (drillTab === 'favorites' && !drill.isFavorite) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = drill.title?.toLowerCase().includes(q);
      const matchTopic = drill.topic?.toLowerCase().includes(q);
      if (!matchTitle && !matchTopic) return false;
    }

    if (filterStage !== 'all' && drill.drillStage !== filterStage) return false;

    return true;
  });

  const handleSave = (publish = true) => {
    if (!title.trim()) {
      alert('请输入教案名称');
      return;
    }

    const planItem: DrillDesign = {
      id: initialPlan?.id || `plan-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      category: 'session_plan',
      contentType: 'session_plan',
      pitchType: 'Full',
      pitchTheme: 'Grass',
      elements: [],
      lines: [],
      targetAge,
      totalDuration,
      sessionStages: stages,
      keyPoints: [
        `总时长: ${totalDuration}分钟`,
        `环节数: ${stages.length}个环节`,
        `适用组别: ${targetAge}`
      ],
      createdAt: initialPlan?.createdAt || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      authorId: currentUser?.id,
      authorName: currentUser?.name,
      isPrivate,
      isDraft: !publish
    };

    onSave(planItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-6xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col h-[94vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 via-white to-gray-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-bvb-black flex items-center justify-center text-bvb-yellow shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                <span>{initialPlan ? '编辑主题教案' : '创建教案'}</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-900 border border-yellow-300">
                  完整教案组装
                </span>
              </h2>
              <p className="text-xs text-gray-500 font-medium">将热身、技术、技能、对抗及小比赛多环节训练项融合成完整教案</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Info Bar: Name (0/40), Description (0/200), Age & Duration preview */}
        <div className="px-6 py-3 bg-gray-50/90 border-b border-gray-200 shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            
            {/* Name Input */}
            <div className="md:col-span-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-black text-gray-700">教案名称</label>
                <span className="text-[10px] text-gray-400 font-mono">{title.length}/40</span>
              </div>
              <input
                type="text"
                maxLength={40}
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="例如: U9梯队: 进攻三区变向突破与二人传切主题课"
                className="w-full px-3.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-bvb-black transition-all"
              />
            </div>

            {/* Description Input */}
            <div className="md:col-span-5">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-black text-gray-700">教案阐述与重点</label>
                <span className="text-[10px] text-gray-400 font-mono">{description.length}/200</span>
              </div>
              <input
                type="text"
                maxLength={200}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="简明描述本堂课的教学重难点与战术目标..."
                className="w-full px-3.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-bvb-black transition-all"
              />
            </div>

            {/* Target Age & Total Duration Badge */}
            <div className="md:col-span-3 flex items-center justify-end gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 block mb-0.5">适用组别</label>
                <input
                  type="text"
                  value={targetAge}
                  onChange={e => setTargetAge(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-800 w-24 text-center"
                />
              </div>

              <div className="bg-bvb-black text-bvb-yellow px-3 py-1.5 rounded-xl text-center shadow-sm">
                <div className="text-[9px] font-bold text-gray-400">总训练时长</div>
                <div className="text-sm font-black font-mono">{totalDuration} 分钟</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Body: Split View (Left: Lesson Stages, Right: Drill Item Picker) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Panel: Lesson Plan Stages (Video 4) */}
          <div className="w-full md:w-1/2 lg:w-7/12 border-r border-gray-200 bg-gray-50/50 p-4 overflow-y-auto custom-scrollbar flex flex-col space-y-4">
            
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>教案训练环节 ({stages.length}个)</span>
              </span>
              <button
                onClick={handleAddStage}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>添加训练环节</span>
              </button>
            </div>

            {/* Stages Stack */}
            <div className="space-y-3">
              {stages.map((stage, idx) => {
                const isActive = activeStageId === stage.id;
                const stageDrills = availableDrills.filter(d => stage.drillIds.includes(d.id));

                return (
                  <div
                    key={stage.id}
                    onClick={() => setActiveStageId(stage.id)}
                    className={`rounded-2xl border-2 transition-all p-3.5 cursor-pointer ${
                      isActive
                        ? 'border-bvb-black bg-white shadow-md ring-2 ring-yellow-400/20'
                        : 'border-gray-200 bg-white/80 hover:bg-white hover:border-gray-300'
                    }`}
                  >
                    {/* Stage Header */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-gray-900 text-white text-xs font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={stage.name}
                          onChange={e => handleUpdateStage(stage.id, { name: e.target.value })}
                          className="font-black text-xs text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-bvb-black focus:outline-none flex-1 truncate"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Duration edit */}
                        <div className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-lg text-xs font-bold text-gray-700">
                          <Clock className="w-3 h-3 text-gray-500" />
                          <input
                            type="number"
                            value={stage.duration || 15}
                            onChange={e => handleUpdateStage(stage.id, { duration: parseInt(e.target.value) || 0 })}
                            className="w-9 bg-transparent text-center font-mono focus:outline-none"
                          />
                          <span>分</span>
                        </div>

                        {/* Move & Delete */}
                        <button
                          onClick={e => { e.stopPropagation(); handleMoveStage(idx, 'up'); }}
                          disabled={idx === 0}
                          className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-20 text-gray-500"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleMoveStage(idx, 'down'); }}
                          disabled={idx === stages.length - 1}
                          className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-20 text-gray-500"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        {stages.length > 1 && (
                          <button
                            onClick={e => { e.stopPropagation(); handleRemoveStage(stage.id); }}
                            className="p-1 rounded-lg hover:bg-red-50 text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Stage Focus Note */}
                    <div className="mb-2.5">
                      <input
                        type="text"
                        value={stage.focus || ''}
                        onChange={e => handleUpdateStage(stage.id, { focus: e.target.value })}
                        placeholder="该环节训练目标（如：球感熟悉、2v1配合）..."
                        className="w-full text-[11px] text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 focus:bg-white focus:outline-none"
                      />
                    </div>

                    {/* Attached Drill Items inside this stage */}
                    <div className="space-y-2 pt-1 border-t border-gray-100">
                      {stageDrills.length > 0 ? (
                        stageDrills.map(drill => (
                          <div
                            key={drill.id}
                            className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-200"
                          >
                            <div className="w-14 h-10 bg-gray-900 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                              {drill.previewImage ? (
                                <img src={drill.previewImage} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <PitchSvgRenderer pitchType={drill.pitchType} pitchTheme={drill.pitchTheme} className="w-full h-full" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-xs font-black text-gray-900 truncate">{drill.title}</h5>
                              <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
                                <span>{drill.durationMinutes || 15}分钟</span>
                                <span>·</span>
                                <span>{drill.topic || '综合'}</span>
                              </div>
                            </div>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleRemoveDrillFromStage(stage.id, drill.id);
                              }}
                              className="p-1 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-200"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="py-2 px-3 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center">
                          <span className="text-[11px] text-gray-400 font-bold">
                            {isActive ? '👈 从右侧选择训练项添加至此环节' : '点击激活该环节并添加训练项'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Drill Items Selector (Video 4) */}
          <div className="w-full md:w-1/2 lg:w-5/12 bg-white p-4 overflow-y-auto custom-scrollbar flex flex-col space-y-3">
            
            {/* Header & Quick Create Drill Button */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-bvb-yellow" />
                <span>选择训练项加入当前环节</span>
              </span>
              <button
                onClick={onOpenCreateDrillModal}
                className="px-2.5 py-1 bg-bvb-black hover:bg-black text-bvb-yellow text-xs font-black rounded-xl shadow-sm flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>创建训练项</span>
              </button>
            </div>

            {/* Tabs (我的, 收藏夹, 教案库) */}
            <div className="grid grid-cols-3 bg-gray-100 p-1 rounded-xl text-xs font-bold">
              {[
                { id: 'my', label: '我的训练项' },
                { id: 'favorites', label: '我的收藏' },
                { id: 'library', label: '全部教案库' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setDrillTab(tab.id as any)}
                  className={`py-1.5 rounded-lg text-center transition-all ${
                    drillTab === tab.id ? 'bg-white text-gray-900 shadow-sm font-black' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="搜索训练项名称或主题..."
                  className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:bg-white focus:outline-none"
                />
              </div>

              <select
                value={filterStage}
                onChange={e => setFilterStage(e.target.value)}
                className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none"
              >
                <option value="all">所有环节</option>
                {DRILL_STAGES.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Drills List */}
            <div className="space-y-2.5 overflow-y-auto flex-1 custom-scrollbar">
              {filteredDrills.length > 0 ? (
                filteredDrills.map(drill => {
                  const currentStage = stages.find(s => s.id === activeStageId);
                  const isAlreadyAdded = currentStage?.drillIds.includes(drill.id);

                  return (
                    <div
                      key={drill.id}
                      className="p-3 bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all flex flex-col gap-2"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-20 h-14 bg-gray-900 rounded-xl overflow-hidden shadow-inner shrink-0 flex items-center justify-center">
                          {drill.previewImage ? (
                            <img src={drill.previewImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <PitchSvgRenderer pitchType={drill.pitchType} pitchTheme={drill.pitchTheme} className="w-full h-full" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-black text-gray-900 leading-tight line-clamp-2">{drill.title}</h4>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                              {drill.topic || '综合'}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                              {drill.durationMinutes || 15}分
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">
                              {drill.playerCount || 8}人
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Coaching summary snippet */}
                      {drill.coachingPoints && (
                        <p className="text-[10px] text-gray-500 line-clamp-1 bg-gray-50 px-2 py-1 rounded-lg">
                          💡 {drill.coachingPoints.replace(/\n/g, ' ')}
                        </p>
                      )}

                      {/* Action Button */}
                      <button
                        onClick={() => handleAddDrillToStage(drill.id)}
                        disabled={isAlreadyAdded}
                        className={`w-full py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                          isAlreadyAdded
                            ? 'bg-emerald-100 text-emerald-800 font-black cursor-default'
                            : 'bg-bvb-black hover:bg-black text-bvb-yellow shadow-sm active:scale-95'
                        }`}
                      >
                        {isAlreadyAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>已加入当前环节</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>选择加入此环节 ({stages.find(s => s.id === activeStageId)?.name?.slice(0, 7) || '当前环节'})</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center">
                  <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-400 font-bold">未找到匹配的训练项</p>
                  <button
                    onClick={onOpenCreateDrillModal}
                    className="mt-3 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl"
                  >
                    立即创建首个训练项
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-wrap gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPrivate(!isPrivate)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
                isPrivate
                  ? 'bg-gray-200 border-gray-300 text-gray-700'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              {isPrivate ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{isPrivate ? '仅自己可见' : '公开至俱乐部教案库'}</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSave(false)}
              className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 font-black text-xs rounded-xl border border-gray-200 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>保存为草稿</span>
            </button>

            <button
              onClick={() => handleSave(true)}
              className="px-5 py-2 bg-bvb-black hover:bg-black text-bvb-yellow font-black text-xs rounded-xl shadow-lg transition-transform active:scale-95 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>立即发布主题教案</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
