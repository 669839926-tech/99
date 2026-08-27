import React, { useState } from 'react';
import { DrillDesign, SessionPlanStage, User } from '../../types';
import { DRILL_STAGES } from './constants';
import {
  X, Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Save,
  Search, BookOpen, Clock, Layers, Check,
  FileText, Send, ZoomIn, Maximize2, Sparkles, Bookmark
} from 'lucide-react';
import { DiagramPreviewBox } from './DiagramPreviewBox';
import { PublishApprovalModal, PublishChoice } from './PublishApprovalModal';
import { ThemeSelectorModal, ThemeDetails } from '../ThemeSelectorModal';
import { BasicTechItem, ScenarioTheme } from '../../src/philosophyData';

interface CreateSessionPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (plan: DrillDesign) => void;
  currentUser: User | null;
  availableDrills: DrillDesign[];
  onOpenCreateDrillModal: () => void;
  initialPlan?: DrillDesign | null;
  basicTechThemes?: BasicTechItem[];
  scenarioThemes?: ScenarioTheme[];
}

export const CreateSessionPlanModal: React.FC<CreateSessionPlanModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentUser,
  availableDrills,
  onOpenCreateDrillModal,
  initialPlan,
  basicTechThemes,
  scenarioThemes
}) => {
  const [title, setTitle] = useState(initialPlan?.title || '');
  const [description, setDescription] = useState(initialPlan?.description || '');
  const [targetAge, setTargetAge] = useState(initialPlan?.targetAge || 'U9 (8-9岁)');
  const [isPrivate, setIsPrivate] = useState(initialPlan?.isPrivate ?? false);
  const [showPublishApprovalModal, setShowPublishApprovalModal] = useState<boolean>(false);

  // Topic binding state from Philosophy Library
  const [boundTopic, setBoundTopic] = useState<{
    code?: string;
    theme?: string;
    category?: string;
    type?: 'tech' | 'scenario';
    label?: string;
  } | null>(
    initialPlan?.topic ? {
      code: initialPlan.topicCode,
      theme: initialPlan.topic,
      category: initialPlan.topicCategory,
      type: initialPlan.topicType,
      label: initialPlan.topicLabel
    } : null
  );
  const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);

  // Drill preview / enlarge detail modal state
  const [previewDrill, setPreviewDrill] = useState<DrillDesign | null>(null);

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

  // Synchronize and reset state when modal opens or initialPlan changes
  React.useEffect(() => {
    if (isOpen) {
      if (initialPlan) {
        setTitle(initialPlan.title || '');
        setDescription(initialPlan.description || '');
        setTargetAge(initialPlan.targetAge || 'U9 (8-9岁)');
        setIsPrivate(initialPlan.isPrivate ?? false);
        if (initialPlan.topic) {
          setBoundTopic({
            code: initialPlan.topicCode,
            theme: initialPlan.topic,
            category: initialPlan.topicCategory,
            type: initialPlan.topicType,
            label: initialPlan.topicLabel
          });
        } else {
          setBoundTopic(null);
        }
        const stgs = initialPlan.sessionStages && initialPlan.sessionStages.length > 0
          ? initialPlan.sessionStages
          : [
              { id: 'stg-1', name: '1. 热身环节', duration: 15, focus: '球感熟悉与动态热身', drillIds: [] },
              { id: 'stg-2', name: '2. 技术环节', duration: 20, focus: '基础动作传控精细化', drillIds: [] },
              { id: 'stg-3', name: '3. 技能环节', duration: 20, focus: '有防守压迫下的1v1与变向决策', drillIds: [] },
              { id: 'stg-4', name: '4. 情景对抗', duration: 20, focus: '局部人数优势与攻防转换', drillIds: [] },
              { id: 'stg-5', name: '5. 小比赛', duration: 15, focus: '全场实战演练与主题战术验收', drillIds: [] }
            ];
        setStages(stgs);
        setActiveStageId(stgs[0]?.id || 'stg-1');
        setSearchQuery('');
        setFilterStage('all');
      } else {
        // Brand new session plan
        setTitle('');
        setDescription('');
        setTargetAge('U9 (8-9岁)');
        setIsPrivate(false);
        setBoundTopic(null);
        const defaultStages = [
          { id: 'stg-1', name: '1. 热身环节', duration: 15, focus: '球感熟悉与动态热身', drillIds: [] },
          { id: 'stg-2', name: '2. 技术环节', duration: 20, focus: '基础动作传控精细化', drillIds: [] },
          { id: 'stg-3', name: '3. 技能环节', duration: 20, focus: '有防守压迫下的1v1与变向决策', drillIds: [] },
          { id: 'stg-4', name: '4. 情景对抗', duration: 20, focus: '局部人数优势与攻防转换', drillIds: [] },
          { id: 'stg-5', name: '5. 小比赛', duration: 15, focus: '全场实战演练与主题战术验收', drillIds: [] }
        ];
        setStages(defaultStages);
        setActiveStageId('stg-1');
        setSearchQuery('');
        setFilterStage('all');
      }
    }
  }, [isOpen, initialPlan]);

  const handleSelectTheme = (focusLabel: string, contentStr: string, details?: ThemeDetails) => {
    if (details) {
      setTitle(details.theme); // Directly name the plan after the selected theme (e.g. "球感启蒙")
      setBoundTopic({
        code: details.code,
        theme: details.theme,
        category: details.category,
        type: details.type,
        label: details.focusLabel
      });
      if (!description.trim() && details.description) {
        setDescription(details.description);
      }
    } else {
      const cleanTheme = contentStr.split(' (')[0] || contentStr;
      setTitle(cleanTheme);
      setBoundTopic({
        theme: cleanTheme,
        label: focusLabel
      });
    }
  };

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

  // Filter Drills in Right Panel (Strictly Training Items only, strictly exclude standalone Diagrams and Session Plans)
  const isDrillItem = (d: DrillDesign) => {
    if (d.category === 'session_plan' || d.contentType === 'session_plan') return false;
    if (d.category === 'diagram' || d.contentType === 'diagram' || d.isUploadedImage) return false;
    return d.category === 'drill_item' || d.contentType === 'drill' || d.category === 'Drill';
  };

  const filteredDrills = availableDrills.filter(drill => {
    if (!isDrillItem(drill)) return false;
    if (drillTab === 'my' && drill.authorId && currentUser && drill.authorId !== currentUser.id) return false;
    if (drillTab === 'favorites' && !drill.isFavorite) return false;
    if (drillTab === 'library') {
      if (drill.approvalStatus === 'rejected' || drill.approvalStatus === 'pending' || drill.isDraft) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = drill.title?.toLowerCase().includes(q);
      const matchTopic = drill.topic?.toLowerCase().includes(q);
      if (!matchTitle && !matchTopic) return false;
    }

    if (filterStage !== 'all' && drill.drillStage !== filterStage) return false;

    return true;
  });

  const handlePerformSave = (options: {
    isPrivateChoice: boolean;
    approvalStatusChoice: 'approved' | 'pending' | 'draft';
    isDraftChoice: boolean;
    submissionNotes?: string;
  }) => {
    if (!title.trim()) {
      alert('请输入教案名称');
      return;
    }

    const isDirector = currentUser?.role === 'director' || !currentUser?.role;

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
      topic: boundTopic?.theme || undefined,
      topicCode: boundTopic?.code || undefined,
      topicCategory: boundTopic?.category || undefined,
      topicType: boundTopic?.type || undefined,
      topicLabel: boundTopic?.label || undefined,
      sessionStages: stages,
      keyPoints: [
        `总时长: ${totalDuration}分钟`,
        `环节数: ${stages.length}个环节`,
        `适用组别: ${targetAge}`
      ],
      createdAt: initialPlan?.createdAt || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      authorId: currentUser?.id || 'u1',
      authorName: currentUser?.name || '青训总监',
      authorRole: currentUser?.role || 'director',
      isPrivate: options.isPrivateChoice,
      approvalStatus: isDirector && options.approvalStatusChoice !== 'draft' ? 'approved' : options.approvalStatusChoice,
      approvalFeedback: options.submissionNotes,
      isDraft: options.isDraftChoice
    };

    onSave(planItem);
    onClose();
  };

  const handleSave = (publish = true) => {
    if (!title.trim()) {
      alert('请输入教案名称');
      return;
    }

    if (!publish) {
      // Save draft
      handlePerformSave({
        isPrivateChoice: true,
        approvalStatusChoice: 'draft',
        isDraftChoice: true
      });
      return;
    }

    // Publish action
    const isDirector = currentUser?.role === 'director' || !currentUser?.role;
    if (isDirector) {
      handlePerformSave({
        isPrivateChoice: false,
        approvalStatusChoice: 'approved',
        isDraftChoice: false
      });
    } else {
      setShowPublishApprovalModal(true);
    }
  };

  const handleConfirmPublishChoice = (choice: PublishChoice, notes?: string) => {
    if (choice === 'private') {
      handlePerformSave({
        isPrivateChoice: true,
        approvalStatusChoice: 'draft',
        isDraftChoice: false
      });
    } else {
      handlePerformSave({
        isPrivateChoice: false,
        approvalStatusChoice: 'pending',
        isDraftChoice: false,
        submissionNotes: notes
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 text-gray-900 flex flex-col overflow-hidden animate-in fade-in duration-200">
      
      {/* Top Header Navigation */}
      <div className="px-6 py-3 bg-white border-b border-gray-200/80 flex items-center justify-between shrink-0 select-none shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            <span>返回/退出</span>
          </button>
          
          <div className="h-5 w-px bg-gray-200" />

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-bvb-yellow text-black flex items-center justify-center font-black text-xs shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <span>{initialPlan ? '编辑主题教案' : '创建教案（全屏模式）'}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-yellow-100 text-yellow-800 border border-yellow-300">
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
                ? 'bg-gray-100 border-gray-200 text-gray-600'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
          >
            {isPrivate ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{isPrivate ? '仅自己可见' : '公开至教案库'}</span>
          </button>

          <button
            onClick={() => handleSave(false)}
            className="px-3.5 py-1.5 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs rounded-xl border border-gray-200 transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>保存草稿</span>
          </button>

          <button
            onClick={() => handleSave(true)}
            className="px-4 py-1.5 bg-bvb-yellow hover:bg-yellow-400 text-black font-black text-xs rounded-xl shadow-md transition-transform active:scale-95 flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>立即发布主题教案</span>
          </button>
        </div>
      </div>

      {/* Top Info Bar */}
      <div className="px-6 py-3 bg-white border-b border-gray-200/80 shrink-0 shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Name Input */}
          <div className="md:col-span-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] font-black text-gray-700">教案名称</label>
                <button
                  type="button"
                  onClick={() => setIsThemeSelectorOpen(true)}
                  className="px-2 py-0.5 rounded-lg bg-bvb-yellow hover:bg-yellow-400 text-black text-[10px] font-black flex items-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer"
                  title="从俱乐部体系库选择比赛场景或基础技术主题并联动命名"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>体系库联动</span>
                </button>
              </div>
              <span className="text-[10px] text-gray-400 font-mono">{title.length}/40</span>
            </div>
            <div className="relative flex items-center">
              <input
                type="text"
                maxLength={40}
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="例如: 球感启蒙 或 进攻三区二人传切..."
                className="w-full pl-3 pr-20 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:outline-none focus:border-emerald-500 transition-all shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setIsThemeSelectorOpen(true)}
                className="absolute right-1 px-2 py-1 text-[10px] font-black text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg flex items-center gap-1 transition-colors border border-transparent hover:border-emerald-200"
              >
                <BookOpen className="w-3 h-3 text-emerald-600" />
                <span>选择主题</span>
              </button>
            </div>
            {boundTopic && (
              <div className="mt-1.5 flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg text-[10.5px] animate-in fade-in duration-150">
                <Bookmark className="w-3 h-3 text-emerald-600 shrink-0" />
                <span className="text-emerald-800 font-bold shrink-0">已绑定:</span>
                {boundTopic.code && (
                  <span className="font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-black text-[9.5px]">
                    {boundTopic.code}
                  </span>
                )}
                <span className="text-emerald-900 font-bold truncate">
                  {boundTopic.label ? `${boundTopic.label} · ` : ''}{boundTopic.theme}
                </span>
                <button
                  type="button"
                  onClick={() => setBoundTopic(null)}
                  className="ml-auto text-gray-400 hover:text-red-500 p-0.5 transition-colors"
                  title="解除绑定"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Description Input */}
          <div className="md:col-span-5">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-black text-gray-700">教案阐述与重点</label>
              <span className="text-[10px] text-gray-400 font-mono">{description.length}/200</span>
            </div>
            <input
              type="text"
              maxLength={200}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="简明描述本堂课的教学重难点与战术目标..."
              className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:bg-white focus:outline-none focus:border-emerald-500 transition-all shadow-2xs"
            />
          </div>

          {/* Target Age & Total Duration Badge */}
          <div className="md:col-span-3 flex items-center justify-end gap-3">
            <div>
              <label className="text-[10px] font-black text-gray-500 block mb-0.5">适用组别</label>
              <input
                type="text"
                value={targetAge}
                onChange={e => setTargetAge(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-black text-gray-800 w-24 text-center focus:bg-white focus:outline-none focus:border-emerald-500 shadow-2xs"
              />
            </div>

            <div className="bg-bvb-yellow text-black px-4 py-1.5 rounded-xl text-center shadow-xs">
              <div className="text-[9px] font-black text-gray-900">总训练时长</div>
              <div className="text-sm font-black font-mono">{totalDuration} 分钟</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Body: Full Screen Split Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Left Panel: Lesson Plan Stages (Video 4) */}
        <div className="w-full md:w-5/12 lg:w-4/12 border-r border-gray-200 bg-slate-50 p-4 overflow-y-auto custom-scrollbar flex flex-col space-y-4">
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-gray-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>教案训练环节 ({stages.length}个)</span>
            </span>
            <button
              onClick={handleAddStage}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-colors shadow-xs"
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
                      ? 'border-emerald-500 bg-white shadow-sm ring-2 ring-emerald-500/20'
                      : 'border-gray-200 bg-white/70 hover:bg-white hover:border-gray-300'
                  }`}
                >
                  {/* Stage Header */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-bvb-yellow text-black text-xs font-black flex items-center justify-center shrink-0 shadow-2xs">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={stage.name}
                        onChange={e => handleUpdateStage(stage.id, { name: e.target.value })}
                        className="font-black text-xs text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-emerald-500 focus:outline-none flex-1 truncate"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Duration edit */}
                      <div className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-lg text-xs font-bold text-gray-700 border border-gray-200">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <input
                          type="number"
                          value={stage.duration || 15}
                          onChange={e => handleUpdateStage(stage.id, { duration: parseInt(e.target.value) || 0 })}
                          className="w-9 bg-transparent text-center font-mono focus:outline-none text-gray-900 font-bold"
                        />
                        <span>分</span>
                      </div>

                      {/* Move & Delete */}
                      <button
                        onClick={e => { e.stopPropagation(); handleMoveStage(idx, 'up'); }}
                        disabled={idx === 0}
                        className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-20 text-gray-500 hover:text-gray-900 transition-colors"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleMoveStage(idx, 'down'); }}
                        disabled={idx === stages.length - 1}
                        className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-20 text-gray-500 hover:text-gray-900 transition-colors"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      {stages.length > 1 && (
                        <button
                          onClick={e => { e.stopPropagation(); handleRemoveStage(stage.id); }}
                          className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
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
                      className="w-full text-[11px] text-gray-700 bg-slate-50 border border-gray-200 rounded-lg px-2.5 py-1 focus:bg-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Attached Drill Items inside this stage */}
                  <div className="space-y-2 pt-1 border-t border-gray-100">
                    {stageDrills.length > 0 ? (
                      stageDrills.map(drill => (
                        <div
                          key={drill.id}
                          className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-gray-200 hover:border-emerald-400 hover:bg-white transition-all shadow-2xs"
                        >
                          <div
                            onClick={() => setPreviewDrill(drill)}
                            title="点击放大查看示意图与完整训练项"
                            className="relative w-16 h-11 bg-slate-900 rounded-lg overflow-hidden shrink-0 flex items-center justify-center cursor-pointer border border-gray-300 hover:border-emerald-500 group/leftthumb transition-all"
                          >
                            {drill.previewImage ? (
                              <img src={drill.previewImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <DiagramPreviewBox
                                diagram={drill}
                                pitchType={drill.pitchType}
                                pitchTheme={drill.pitchTheme}
                                elements={drill.elements}
                                lines={drill.lines}
                                showGrid={false}
                                className="w-full h-full"
                              />
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/leftthumb:opacity-100 transition-opacity flex items-center justify-center">
                              <ZoomIn className="w-3.5 h-3.5 text-bvb-yellow" />
                            </div>
                          </div>
                          <div
                            onClick={() => setPreviewDrill(drill)}
                            className="flex-1 min-w-0 cursor-pointer"
                          >
                            <h5 className="text-xs font-black text-gray-900 truncate hover:text-emerald-700 transition-colors">{drill.title}</h5>
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
                            className="p-1 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="py-2 px-3 bg-slate-50 rounded-xl border border-dashed border-gray-200 text-center">
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

        {/* Center / Right Panel: Tactical Pitch Display & Drill Item Selector */}
        <div className="w-full md:w-7/12 lg:w-8/12 bg-slate-100 flex flex-col overflow-hidden">
          
          {/* Active Stage Tactical Pitch Display */}
          {(() => {
            const currentStage = stages.find(s => s.id === activeStageId);
            const activeDrillsInStage = availableDrills.filter(d => currentStage?.drillIds.includes(d.id));
            const primaryDrill = activeDrillsInStage[0];

            return (
              <div className="p-3.5 px-6 bg-white border-b border-gray-200 flex items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-gray-900">
                    当前环节: <span className="text-emerald-700">{currentStage?.name || '未选环节'}</span>
                  </span>
                  {primaryDrill && (
                    <span className="text-xs text-gray-500 truncate max-w-[260px]">
                      (展示场地: {primaryDrill.title})
                    </span>
                  )}
                </div>

                <button
                  onClick={onOpenCreateDrillModal}
                  className="px-3.5 py-1.5 bg-bvb-yellow hover:bg-yellow-400 text-black text-xs font-black rounded-xl shadow-xs flex items-center gap-1.5 transition-transform active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>新建训练项</span>
                </button>
              </div>
            );
          })()}

          {/* Drill Selector Sub-area */}
          <div className="p-4 sm:p-6 flex-1 flex flex-col space-y-3.5 overflow-y-auto custom-scrollbar">
            
            {/* Tabs (我的, 收藏夹, 教案库) */}
            <div className="grid grid-cols-3 bg-white p-1 rounded-xl text-xs font-bold border border-gray-200 shadow-2xs">
              {[
                { id: 'my', label: '我的训练项' },
                { id: 'favorites', label: '我的收藏' },
                { id: 'library', label: '公共训练库' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setDrillTab(tab.id as any)}
                  className={`py-1.5 rounded-lg text-center transition-all ${
                    drillTab === tab.id ? 'bg-slate-100 text-gray-900 shadow-2xs font-black border border-gray-200' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="搜索训练项名称或主题..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-emerald-500 shadow-2xs"
                />
              </div>

              <select
                value={filterStage}
                onChange={e => setFilterStage(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none shadow-2xs"
              >
                <option value="all">所有环节</option>
                {DRILL_STAGES.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Drills Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 overflow-y-auto flex-1 custom-scrollbar">
              {filteredDrills.length > 0 ? (
                filteredDrills.map(drill => {
                  const currentStage = stages.find(s => s.id === activeStageId);
                  const isAlreadyAdded = currentStage?.drillIds.includes(drill.id);

                  return (
                    <div
                      key={drill.id}
                      className="p-3.5 bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all flex flex-col justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-start gap-3">
                        {/* Enlarged tactical diagram thumbnail with click-to-enlarge action */}
                        <div
                          onClick={() => setPreviewDrill(drill)}
                          title="点击放大查看示意图与完整训练项"
                          className="relative w-32 sm:w-36 h-22 sm:h-24 bg-slate-900 rounded-xl overflow-hidden shadow-inner shrink-0 flex items-center justify-center cursor-pointer border border-gray-300 hover:border-emerald-500 group/thumb transition-all hover:scale-[1.02]"
                        >
                          {drill.previewImage ? (
                            <img src={drill.previewImage} alt={drill.title} className="w-full h-full object-cover" />
                          ) : (
                            <DiagramPreviewBox
                              diagram={drill}
                              pitchType={drill.pitchType}
                              pitchTheme={drill.pitchTheme}
                              elements={drill.elements}
                              lines={drill.lines}
                              showGrid={false}
                              className="w-full h-full"
                            />
                          )}
                          {/* Hover Zoom-in Cue */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white backdrop-blur-[1px]">
                            <ZoomIn className="w-4 h-4 text-bvb-yellow" />
                            <span className="text-[10px] font-bold text-white tracking-tight">点击放大</span>
                          </div>
                        </div>

                        {/* Title and metadata badges */}
                        <div className="flex-1 min-w-0">
                          <h4
                            onClick={() => setPreviewDrill(drill)}
                            className="text-xs font-black text-gray-900 leading-snug line-clamp-2 cursor-pointer hover:text-emerald-700 transition-colors"
                          >
                            {drill.title}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              {drill.topic || '综合'}
                            </span>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {drill.durationMinutes || 15}分
                            </span>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                              {drill.playerCount || 8}人
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => handleAddDrillToStage(drill.id)}
                        disabled={isAlreadyAdded}
                        className={`w-full py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                          isAlreadyAdded
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-black cursor-default'
                            : 'bg-bvb-yellow hover:bg-yellow-400 text-black shadow-xs active:scale-95'
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
                  <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 font-bold">未找到匹配的训练项（已过滤示意图与教案）</p>
                  <button
                    onClick={onOpenCreateDrillModal}
                    className="mt-3 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 shadow-2xs"
                  >
                    立即创建训练项
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Full Drill Content & Large Tactical Diagram Preview Modal */}
      {previewDrill && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-gray-200 text-gray-900 rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-3.5 border-b border-gray-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-bvb-yellow text-black flex items-center justify-center font-black shadow-xs">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-gray-900">{previewDrill.title}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      训练项详情与示意图
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    环节分类: {previewDrill.drillStage || '通用训练'} · 作者: {previewDrill.authorName || '青训教练组'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setPreviewDrill(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Two columns layout */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left: Large Tactical Diagram Preview */}
                <div className="lg:col-span-6 flex flex-col items-center justify-center">
                  <div className="w-full flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-gray-700 flex items-center gap-1.5">
                      <Maximize2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>战术场地示意图（大图）</span>
                    </span>
                    <span className="text-[10px] font-bold text-gray-600 bg-slate-100 px-2 py-0.5 rounded-md border border-gray-200">
                      {previewDrill.pitchType || '标准半场'} · {previewDrill.pitchTheme || '草地绿'}
                    </span>
                  </div>

                  <div className="w-full flex items-center justify-center bg-slate-900 p-2 rounded-2xl border border-gray-300">
                    <DiagramPreviewBox
                      diagram={previewDrill}
                      pitchType={previewDrill.pitchType}
                      pitchTheme={previewDrill.pitchTheme}
                      elements={previewDrill.elements}
                      lines={previewDrill.lines}
                      previewImage={previewDrill.previewImage}
                      showGrid={true}
                      className="w-full max-w-[500px] max-h-[380px] shadow-lg"
                    />
                  </div>
                </div>

                {/* Right: Meta & Badges */}
                <div className="lg:col-span-6 space-y-4">
                  {/* Parameter Badges */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-gray-200 text-center">
                      <span className="text-[10px] text-blue-700 font-bold block">训练主题</span>
                      <span className="text-xs font-black text-gray-900">{previewDrill.topic || '综合'}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-gray-200 text-center">
                      <span className="text-[10px] text-emerald-700 font-bold block">训练时长</span>
                      <span className="text-xs font-black text-gray-900">{previewDrill.durationMinutes || 15} 分钟</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-gray-200 text-center">
                      <span className="text-[10px] text-purple-700 font-bold block">参与人数</span>
                      <span className="text-xs font-black text-gray-900">{previewDrill.playerCount || 8} 人</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-gray-200 text-center">
                      <span className="text-[10px] text-amber-700 font-bold block">场地尺寸</span>
                      <span className="text-xs font-black text-gray-900">{previewDrill.fieldLength || 20}x{previewDrill.fieldWidth || 15} 米</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-gray-200 text-center">
                      <span className="text-[10px] text-rose-700 font-bold block">足球数量</span>
                      <span className="text-xs font-black text-gray-900">{previewDrill.ballCount || 6} 个</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-gray-200 text-center">
                      <span className="text-[10px] text-teal-700 font-bold block">标志物</span>
                      <span className="text-xs font-black text-gray-900">{previewDrill.coneCount || 8} 个</span>
                    </div>
                  </div>

                  {/* Age groups chips */}
                  {previewDrill.ageGroups && previewDrill.ageGroups.length > 0 && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-gray-200">
                      <span className="text-[11px] font-bold text-gray-500 block mb-1.5">适用年龄段:</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {previewDrill.ageGroups.map(a => (
                          <span key={a} className="px-2.5 py-0.5 rounded-lg bg-white border border-gray-200 text-amber-700 text-xs font-mono font-bold shadow-2xs">
                            {a} 岁
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {previewDrill.description && (
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-gray-200">
                      <h4 className="text-xs font-black text-gray-800 mb-1">训练简述</h4>
                      <p className="text-xs text-gray-600 leading-relaxed">{previewDrill.description}</p>
                    </div>
                  )}

                  {/* Equipment notes */}
                  {previewDrill.equipmentNotes && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-gray-200">
                      <h4 className="text-xs font-black text-gray-800 mb-1">所需器材备注</h4>
                      <p className="text-xs text-gray-600 leading-relaxed">{previewDrill.equipmentNotes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Drill Structured Sections (组织方法, 指导要点, 变化进阶) */}
              <div className="space-y-3 pt-2 border-t border-gray-200">
                {previewDrill.organization && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-gray-200">
                    <h4 className="text-xs font-black text-blue-700 flex items-center gap-1.5 mb-2">
                      <span className="w-5 h-5 rounded-lg bg-blue-100 text-blue-800 border border-blue-200 text-[10px] flex items-center justify-center font-bold">1</span>
                      <span>组织方法 (步骤与站位)</span>
                    </h4>
                    <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed pl-6">{previewDrill.organization}</p>
                  </div>
                )}

                {previewDrill.coachingPoints && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-gray-200">
                    <h4 className="text-xs font-black text-emerald-700 flex items-center gap-1.5 mb-2">
                      <span className="w-5 h-5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] flex items-center justify-center font-bold">2</span>
                      <span>指导要点 (技术关键与心理)</span>
                    </h4>
                    <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed pl-6">{previewDrill.coachingPoints}</p>
                  </div>
                )}

                {previewDrill.progressions && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-gray-200">
                    <h4 className="text-xs font-black text-purple-700 flex items-center gap-1.5 mb-2">
                      <span className="w-5 h-5 rounded-lg bg-purple-100 text-purple-800 border border-purple-200 text-[10px] flex items-center justify-center font-bold">3</span>
                      <span>变化与进阶 (规则与防守调整)</span>
                    </h4>
                    <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed pl-6">{previewDrill.progressions}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            {(() => {
              const currentStage = stages.find(s => s.id === activeStageId);
              const isAlreadyAdded = currentStage?.drillIds.includes(previewDrill.id);

              return (
                <div className="px-6 py-3.5 border-t border-gray-200 bg-slate-50 flex items-center justify-between">
                  <div className="text-xs text-gray-600">
                    当前选定环节: <span className="font-black text-emerald-700">{currentStage?.name || '未选环节'}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setPreviewDrill(null)}
                      className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 transition-colors shadow-2xs"
                    >
                      关闭预览
                    </button>

                    <button
                      onClick={() => {
                        handleAddDrillToStage(previewDrill.id);
                      }}
                      disabled={isAlreadyAdded}
                      className={`px-5 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-xs transition-all ${
                        isAlreadyAdded
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold cursor-default'
                          : 'bg-bvb-yellow hover:bg-yellow-400 text-black active:scale-95'
                      }`}
                    >
                      {isAlreadyAdded ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>已加入当前环节</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>加入此环节 ({currentStage?.name?.slice(0, 7) || '当前环节'})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Publish Approval Workflow Modal */}
      <PublishApprovalModal
        isOpen={showPublishApprovalModal}
        onClose={() => setShowPublishApprovalModal(false)}
        onConfirm={handleConfirmPublishChoice}
        contentTypeName="教案"
        title={title}
        currentUser={currentUser}
      />

      {/* Philosophy Library Theme Selector Modal */}
      <ThemeSelectorModal
        isOpen={isThemeSelectorOpen}
        onClose={() => setIsThemeSelectorOpen(false)}
        onSelect={handleSelectTheme}
        basicTechThemes={basicTechThemes}
        scenarioThemes={scenarioThemes}
        title="选择俱乐部体系库训练主题（教案联动）"
        subtitle="选择对应比赛场景或基础技术主题后，教案将自动命名并与该主题绑定"
      />
    </div>
  );
};
