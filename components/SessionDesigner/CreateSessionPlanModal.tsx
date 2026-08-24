import React, { useState } from 'react';
import { DrillDesign, SessionPlanStage, User } from '../../types';
import { DRILL_STAGES } from './constants';
import {
  X, Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Save,
  Search, BookOpen, Clock, Layers, Check,
  FileText, Send
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
    <div className="fixed inset-0 z-50 bg-gray-950 text-gray-100 flex flex-col overflow-hidden animate-in fade-in duration-200">
      
      {/* Top Header Navigation */}
      <div className="px-6 py-3 bg-gray-900 border-b border-gray-800 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            <span>返回/退出</span>
          </button>
          
          <div className="h-5 w-px bg-gray-800" />

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-bvb-yellow text-black flex items-center justify-center font-black text-xs shadow-sm">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                <span>{initialPlan ? '编辑主题教案' : '创建教案（全屏模式）'}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">
                  全场战术教案组装
                </span>
              </h2>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsPrivate(!isPrivate)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
              isPrivate
                ? 'bg-gray-800 border-gray-700 text-gray-400'
                : 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
            }`}
          >
            {isPrivate ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{isPrivate ? '仅自己可见' : '公开至教案库'}</span>
          </button>

          <button
            onClick={() => handleSave(false)}
            className="px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold text-xs rounded-xl border border-gray-700 transition-colors shadow-sm flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>保存草稿</span>
          </button>

          <button
            onClick={() => handleSave(true)}
            className="px-4 py-1.5 bg-bvb-yellow hover:bg-yellow-400 text-black font-black text-xs rounded-xl shadow-lg transition-transform active:scale-95 flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>立即发布主题教案</span>
          </button>
        </div>
      </div>

      {/* Top Info Bar */}
      <div className="px-6 py-2.5 bg-gray-900/90 border-b border-gray-800 shrink-0">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Name Input */}
          <div className="md:col-span-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-gray-300">教案名称</label>
              <span className="text-[10px] text-gray-500 font-mono">{title.length}/40</span>
            </div>
            <input
              type="text"
              maxLength={40}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="例如: U9梯队: 进攻三区变向突破与二人传切主题课"
              className="w-full px-3 py-1.5 bg-gray-950 border border-gray-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Description Input */}
          <div className="md:col-span-5">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-gray-300">教案阐述与重点</label>
              <span className="text-[10px] text-gray-500 font-mono">{description.length}/200</span>
            </div>
            <input
              type="text"
              maxLength={200}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="简明描述本堂课的教学重难点与战术目标..."
              className="w-full px-3 py-1.5 bg-gray-950 border border-gray-800 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Target Age & Total Duration Badge */}
          <div className="md:col-span-3 flex items-center justify-end gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-0.5">适用组别</label>
              <input
                type="text"
                value={targetAge}
                onChange={e => setTargetAge(e.target.value)}
                className="px-2.5 py-1 bg-gray-950 border border-gray-800 rounded-lg text-xs font-bold text-gray-200 w-24 text-center"
              />
            </div>

            <div className="bg-bvb-yellow text-black px-3.5 py-1 rounded-xl text-center shadow-md">
              <div className="text-[9px] font-black text-gray-900">总训练时长</div>
              <div className="text-sm font-black font-mono">{totalDuration} 分钟</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Body: Full Screen Split Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Left Panel: Lesson Plan Stages (Video 4) */}
        <div className="w-full md:w-5/12 lg:w-4/12 border-r border-gray-800 bg-gray-950 p-4 overflow-y-auto custom-scrollbar flex flex-col space-y-4">
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-gray-200 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>教案训练环节 ({stages.length}个)</span>
            </span>
            <button
              onClick={handleAddStage}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-colors shadow-sm"
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
                  className={`rounded-2xl border transition-all p-3.5 cursor-pointer ${
                    isActive
                      ? 'border-emerald-500 bg-gray-900 shadow-md ring-2 ring-emerald-500/20'
                      : 'border-gray-800 bg-gray-900/50 hover:bg-gray-900 hover:border-gray-700'
                  }`}
                >
                  {/* Stage Header */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-bvb-yellow text-black text-xs font-black flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={stage.name}
                        onChange={e => handleUpdateStage(stage.id, { name: e.target.value })}
                        className="font-black text-xs text-white bg-transparent border-b border-transparent hover:border-gray-700 focus:border-emerald-500 focus:outline-none flex-1 truncate"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Duration edit */}
                      <div className="flex items-center gap-1 bg-gray-950 px-2 py-0.5 rounded-lg text-xs font-bold text-gray-300 border border-gray-800">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <input
                          type="number"
                          value={stage.duration || 15}
                          onChange={e => handleUpdateStage(stage.id, { duration: parseInt(e.target.value) || 0 })}
                          className="w-9 bg-transparent text-center font-mono focus:outline-none text-white"
                        />
                        <span>分</span>
                      </div>

                      {/* Move & Delete */}
                      <button
                        onClick={e => { e.stopPropagation(); handleMoveStage(idx, 'up'); }}
                        disabled={idx === 0}
                        className="p-1 rounded-lg hover:bg-gray-800 disabled:opacity-20 text-gray-400"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleMoveStage(idx, 'down'); }}
                        disabled={idx === stages.length - 1}
                        className="p-1 rounded-lg hover:bg-gray-800 disabled:opacity-20 text-gray-400"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      {stages.length > 1 && (
                        <button
                          onClick={e => { e.stopPropagation(); handleRemoveStage(stage.id); }}
                          className="p-1 rounded-lg hover:bg-red-950 text-red-400"
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
                      className="w-full text-[11px] text-gray-300 bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1 focus:bg-black focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Attached Drill Items inside this stage */}
                  <div className="space-y-2 pt-1 border-t border-gray-800">
                    {stageDrills.length > 0 ? (
                      stageDrills.map(drill => (
                        <div
                          key={drill.id}
                          className="flex items-center gap-3 bg-gray-950 p-2 rounded-xl border border-gray-800"
                        >
                          <div className="w-14 h-10 bg-gray-900 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                            {drill.previewImage ? (
                              <img src={drill.previewImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <PitchSvgRenderer pitchType={drill.pitchType} pitchTheme={drill.pitchTheme} className="w-full h-full" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="text-xs font-black text-white truncate">{drill.title}</h5>
                            <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
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
                            className="p-1 text-gray-500 hover:text-red-400 rounded-lg hover:bg-gray-800"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="py-2 px-3 bg-gray-950 rounded-xl border border-dashed border-gray-800 text-center">
                        <span className="text-[11px] text-gray-500 font-bold">
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

        {/* Center / Right Panel: Tactical Pitch Display & Drill Item Selector */}
        <div className="w-full md:w-7/12 lg:w-8/12 bg-gray-900 flex flex-col overflow-hidden">
          
          {/* Active Stage Tactical Pitch Display */}
          {(() => {
            const currentStage = stages.find(s => s.id === activeStageId);
            const activeDrillsInStage = availableDrills.filter(d => currentStage?.drillIds.includes(d.id));
            const primaryDrill = activeDrillsInStage[0];

            return (
              <div className="p-4 bg-gray-950/80 border-b border-gray-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-gray-200">
                    当前环节: <span className="text-emerald-400">{currentStage?.name || '未选环节'}</span>
                  </span>
                  {primaryDrill && (
                    <span className="text-xs text-gray-400">
                      (展示场地: {primaryDrill.title})
                    </span>
                  )}
                </div>

                <button
                  onClick={onOpenCreateDrillModal}
                  className="px-3 py-1 bg-bvb-yellow hover:bg-yellow-400 text-black text-xs font-black rounded-xl shadow-sm flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>新建训练项</span>
                </button>
              </div>
            );
          })()}

          {/* Drill Selector Sub-area */}
          <div className="p-4 flex-1 flex flex-col space-y-3 overflow-y-auto custom-scrollbar">
            
            {/* Tabs (我的, 收藏夹, 教案库) */}
            <div className="grid grid-cols-3 bg-gray-950 p-1 rounded-xl text-xs font-bold border border-gray-800">
              {[
                { id: 'my', label: '我的训练项' },
                { id: 'favorites', label: '我的收藏' },
                { id: 'library', label: '全部教案库' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setDrillTab(tab.id as any)}
                  className={`py-1.5 rounded-lg text-center transition-all ${
                    drillTab === tab.id ? 'bg-gray-800 text-white shadow-sm font-black' : 'text-gray-400 hover:text-gray-200'
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
                  className="w-full pl-8 pr-3 py-1.5 bg-gray-950 border border-gray-800 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <select
                value={filterStage}
                onChange={e => setFilterStage(e.target.value)}
                className="px-2.5 py-1.5 bg-gray-950 border border-gray-800 rounded-xl text-xs font-bold text-gray-300 focus:outline-none"
              >
                <option value="all">所有环节</option>
                {DRILL_STAGES.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Drills Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto flex-1 custom-scrollbar">
              {filteredDrills.length > 0 ? (
                filteredDrills.map(drill => {
                  const currentStage = stages.find(s => s.id === activeStageId);
                  const isAlreadyAdded = currentStage?.drillIds.includes(drill.id);

                  return (
                    <div
                      key={drill.id}
                      className="p-3 bg-gray-950 rounded-2xl border border-gray-800 hover:border-gray-700 hover:shadow-md transition-all flex flex-col justify-between gap-2.5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-24 h-16 bg-gray-900 rounded-xl overflow-hidden shadow-inner shrink-0 flex items-center justify-center">
                          {drill.previewImage ? (
                            <img src={drill.previewImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <PitchSvgRenderer pitchType={drill.pitchType} pitchTheme={drill.pitchTheme} className="w-full h-full" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-black text-white leading-tight line-clamp-2">{drill.title}</h4>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60">
                              {drill.topic || '综合'}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                              {drill.durationMinutes || 15}分
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60">
                              {drill.playerCount || 8}人
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Coaching summary snippet */}
                      {drill.coachingPoints && (
                        <p className="text-[10px] text-gray-400 line-clamp-1 bg-gray-900/60 px-2 py-1 rounded-lg">
                          💡 {drill.coachingPoints.replace(/\n/g, ' ')}
                        </p>
                      )}

                      {/* Action Button */}
                      <button
                        onClick={() => handleAddDrillToStage(drill.id)}
                        disabled={isAlreadyAdded}
                        className={`w-full py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                          isAlreadyAdded
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-black cursor-default'
                            : 'bg-bvb-yellow hover:bg-yellow-400 text-black shadow-sm active:scale-95'
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
                            <span>加入此环节 ({stages.find(s => s.id === activeStageId)?.name?.slice(0, 7) || '当前环节'})</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-2 py-12 text-center">
                  <FileText className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-400 font-bold">未找到匹配的训练项</p>
                  <button
                    onClick={onOpenCreateDrillModal}
                    className="mt-3 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded-xl"
                  >
                    立即创建训练项
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
