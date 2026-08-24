import React, { useState } from 'react';
import { DrillDesign, User } from '../../types';
import { AGE_GROUPS, TRAINING_TOPICS, DRILL_STAGES } from './constants';
import {
  X, Image as ImageIcon, Check, Eye, EyeOff, Save, Layers, Plus, BookOpen, Send
} from 'lucide-react';
import { PitchSvgRenderer } from './PitchSvgRenderer';

interface CreateDrillItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (drill: DrillDesign) => void;
  currentUser: User | null;
  existingDiagrams: DrillDesign[];
  onOpenPitchSelector: () => void;
  initialDrill?: DrillDesign | null;
}

export const CreateDrillItemModal: React.FC<CreateDrillItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentUser,
  existingDiagrams,
  onOpenPitchSelector,
  initialDrill
}) => {
  const [title, setTitle] = useState(initialDrill?.title || '');
  const [description, setDescription] = useState(initialDrill?.description || '');
  const [selectedDiagramId, setSelectedDiagramId] = useState<string | null>(initialDrill?.diagramId || null);
  const [selectedAges, setSelectedAges] = useState<string[]>(initialDrill?.ageGroups || ['8', '9', '10']);
  const [selectedTopic, setSelectedTopic] = useState<string>(initialDrill?.topic || '1v1');
  const [selectedStage, setSelectedStage] = useState<string>(initialDrill?.drillStage || 'skill');
  
  // Basic numeric parameters
  const [durationMinutes, setDurationMinutes] = useState<number>(initialDrill?.durationMinutes || 15);
  const [fieldLength, setFieldLength] = useState<number>(initialDrill?.fieldLength || 20);
  const [fieldWidth, setFieldWidth] = useState<number>(initialDrill?.fieldWidth || 15);
  const [playerCount, setPlayerCount] = useState<number>(initialDrill?.playerCount || 8);
  const [ballCount, setBallCount] = useState<number>(initialDrill?.ballCount || 6);
  const [coneCount, setConeCount] = useState<number>(initialDrill?.coneCount || 8);
  const [equipmentNotes, setEquipmentNotes] = useState<string>(initialDrill?.equipmentNotes || '标志盘8个、足球6个、分队背心2色');

  // Structured Coaching Fields (组织方法, 指导要点, 变化与进阶)
  const [activeTemplateTab, setActiveTemplateTab] = useState<'template' | 'blank'>('template');
  const [organization, setOrganization] = useState<string>(
    initialDrill?.organization ||
    '1. 在20x15米区域内，两端各设一条端线。\n2. 进攻队员从一端运球出发，防守队员在中间限制区内防守。\n3. 进攻队员可利用变速变向突破防守人，或与远端中立队员做撞墙配合后越过端线。\n4. 防守断球后反向进攻端线。'
  );
  const [coachingPoints, setCoachingPoints] = useState<string>(
    initialDrill?.coachingPoints ||
    '1. 运球推进时步频快、重心低，触球点位于脚背外侧或内侧。\n2. 接近防守人前预设变向假动作，拉开防守重心后瞬间加速。\n3. 与中立队友呼应，传球力量精准，出球后迅速前插。'
  );
  const [progressions, setProgressions] = useState<string>(
    initialDrill?.progressions ||
    '1. 限制进攻球员必须在3次触球内完成变向或传球。\n2. 防守队员升级为全场紧逼防守。\n3. 增加第二名防守队员形成局部2v2。'
  );

  const [isPrivate, setIsPrivate] = useState<boolean>(initialDrill?.isPrivate ?? false);
  const [showDiagramPicker, setShowDiagramPicker] = useState<boolean>(false);

  if (!isOpen) return null;

  const toggleAge = (age: string) => {
    if (selectedAges.includes(age)) {
      setSelectedAges(selectedAges.filter(a => a !== age));
    } else {
      setSelectedAges([...selectedAges, age]);
    }
  };

  const selectedDiagram = existingDiagrams.find(d => d.id === selectedDiagramId);

  const handleSave = (publish = true) => {
    if (!title.trim()) {
      alert('请输入训练项标题');
      return;
    }

    const keyPointsArray = coachingPoints
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    const drillItem: DrillDesign = {
      id: initialDrill?.id || `drill-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      category: 'drill_item',
      contentType: 'drill',
      pitchType: selectedDiagram?.pitchType || 'Midfield',
      pitchTheme: selectedDiagram?.pitchTheme || 'Grass',
      elements: selectedDiagram?.elements || [],
      lines: selectedDiagram?.lines || [],
      keyframes: selectedDiagram?.keyframes || [],
      previewImage: selectedDiagram?.previewImage || initialDrill?.previewImage,
      diagramId: selectedDiagramId || undefined,
      keyPoints: keyPointsArray,
      ageGroups: selectedAges,
      topic: selectedTopic,
      drillStage: selectedStage,
      durationMinutes,
      fieldLength,
      fieldWidth,
      playerCount,
      ballCount,
      coneCount,
      equipmentNotes,
      organization,
      coachingPoints,
      progressions,
      createdAt: initialDrill?.createdAt || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      authorId: currentUser?.id,
      authorName: currentUser?.name,
      isPrivate,
      isDraft: !publish
    };

    onSave(drillItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 text-gray-100 flex flex-col overflow-hidden animate-in fade-in duration-200">
      
      {/* Top Fullscreen Header Navigation */}
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
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                <span>{initialDrill ? '编辑训练项' : '创建训练项（全屏模式）'}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  球场视窗已开启
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
            <span>立即发布训练项</span>
          </button>
        </div>
      </div>

      {/* Main Fullscreen Split Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left/Center Area: Tactical Football Pitch Canvas Display (Image 2 style) */}
        <div className="flex-1 bg-gray-900 flex flex-col relative overflow-hidden">
          
          {/* Canvas Top Bar */}
          <div className="p-3 px-6 bg-gray-950/90 border-b border-gray-800/80 flex items-center justify-between flex-wrap gap-2 z-20">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-gray-200 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <span>关联战术示意图 / 动态场地</span>
              </span>
              {selectedDiagram && (
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-md border border-emerald-800/60">
                  {selectedDiagram.title}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDiagramPicker(!showDiagramPicker)}
                className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded-xl border border-gray-700 transition-colors shadow-sm"
              >
                {showDiagramPicker ? '收起图库' : '从我的示意图库选择'}
              </button>
              <button
                onClick={() => {
                  onClose();
                  onOpenPitchSelector();
                }}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新建示意图</span>
              </button>
            </div>
          </div>

          {/* Expandable Diagram Picker Drawer */}
          {showDiagramPicker && (
            <div className="p-4 bg-gray-950 border-b border-gray-800 z-30 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-48 overflow-y-auto">
              {existingDiagrams.map(d => (
                <div
                  key={d.id}
                  onClick={() => {
                    setSelectedDiagramId(d.id);
                    setShowDiagramPicker(false);
                  }}
                  className={`p-2 rounded-xl border cursor-pointer transition-all ${
                    selectedDiagramId === d.id
                      ? 'border-emerald-500 bg-emerald-950/50 ring-2 ring-emerald-500/30'
                      : 'border-gray-800 bg-gray-900 hover:border-gray-700'
                  }`}
                >
                  <div className="aspect-[16/10] bg-gray-950 rounded-lg overflow-hidden mb-1 flex items-center justify-center">
                    {d.previewImage ? (
                      <img src={d.previewImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <PitchSvgRenderer pitchType={d.pitchType} pitchTheme={d.pitchTheme} className="w-full h-full" />
                    )}
                  </div>
                  <span className="text-[11px] font-bold text-gray-300 block truncate">{d.title}</span>
                </div>
              ))}
            </div>
          )}

          {/* Pitch Display Viewport */}
          <div className="flex-1 flex items-center justify-center p-6 overflow-auto relative">
            
            {/* Top-Left pitch overlay badge */}
            <div className="absolute top-4 left-6 z-10 flex items-center gap-2">
              <span className="px-2.5 py-1 bg-gray-950/80 border border-gray-800 rounded-lg text-xs font-bold text-gray-300 backdrop-blur-sm">
                📐 场地规格: {fieldLength}米 × {fieldWidth}米
              </span>
              <span className="px-2.5 py-1 bg-gray-950/80 border border-gray-800 rounded-lg text-xs font-bold text-gray-300 backdrop-blur-sm">
                👥 人数: {playerCount}人
              </span>
            </div>

            {/* Tactical Pitch Box */}
            <div className="w-[720px] h-[480px] sm:w-[780px] sm:h-[520px] relative rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-800 bg-gray-950 shrink-0">
              <PitchSvgRenderer
                pitchType={selectedDiagram?.pitchType || 'Midfield'}
                pitchTheme={selectedDiagram?.pitchTheme || 'Grass'}
                showGrid={true}
                className="w-full h-full"
              />

              {/* Associated Diagram Elements Preview */}
              {selectedDiagram && selectedDiagram.elements && (
                <div className="absolute inset-0 pointer-events-none">
                  {selectedDiagram.elements.map(el => (
                    <div
                      key={el.id}
                      className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
                      style={{
                        left: `${el.x}%`,
                        top: `${el.y}%`,
                        transform: `translate(-50%, -50%) rotate(${el.rotation || 0}deg) scale(${el.scale || 1})`
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-full border-2 border-white shadow-md flex items-center justify-center font-black text-[11px] text-white"
                        style={{ backgroundColor: el.color || '#eab308' }}
                      >
                        {el.label || ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom floating pitch info */}
            <div className="absolute bottom-4 left-6 z-10 flex items-center gap-2 text-xs font-bold text-gray-400 bg-gray-950/80 px-3 py-1.5 rounded-xl border border-gray-800">
              <span>⚽ 足球: {ballCount}个</span>
              <span>·</span>
              <span>🔶 标志盘: {coneCount}个</span>
              <span>·</span>
              <span>⏱️ 预计时长: {durationMinutes}分钟</span>
            </div>
          </div>
        </div>

        {/* Right Sidebar Area: Structured Drill Parameters & Teaching Steps */}
        <div className="w-full lg:w-[480px] bg-gray-950 border-l border-gray-800 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
          
          <div className="p-5 space-y-5">
            
            {/* Title & Description */}
            <div className="space-y-2.5">
              <div>
                <label className="block text-xs font-black text-gray-300 mb-1">
                  训练项标题 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="例如: 技能: 1v1+1 (回避防守人) 运球变向加速突破训练"
                  className="w-full px-3.5 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs font-bold text-white focus:border-emerald-500 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-300 mb-1">训练项简介</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="简述该训练项的目标与针对的核心痛点..."
                  rows={2}
                  className="w-full px-3.5 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs text-gray-200 focus:border-emerald-500 focus:outline-none transition-all resize-none"
                />
              </div>
            </div>

            {/* Age & Topic & Stage */}
            <div className="space-y-3 bg-gray-900/60 p-3.5 rounded-2xl border border-gray-800">
              {/* Age selector */}
              <div>
                <span className="block text-[11px] font-bold text-gray-400 mb-1.5">适用年龄段 (岁)</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {AGE_GROUPS.map(age => {
                    const isSelected = selectedAges.includes(age);
                    return (
                      <button
                        key={age}
                        onClick={() => toggleAge(age)}
                        className={`w-7 h-7 rounded-lg font-black text-xs transition-all ${
                          isSelected
                            ? 'bg-bvb-yellow text-black shadow-md scale-105'
                            : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                        }`}
                      >
                        {age}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Topic selector */}
              <div>
                <span className="block text-[11px] font-bold text-gray-400 mb-1.5">训练主题</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {TRAINING_TOPICS.map(topic => {
                    const isSelected = selectedTopic === topic;
                    return (
                      <button
                        key={topic}
                        onClick={() => setSelectedTopic(topic)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                        }`}
                      >
                        {topic}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Training Stage */}
              <div>
                <span className="block text-[11px] font-bold text-gray-400 mb-1.5">训练环节</span>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {DRILL_STAGES.map(stage => {
                    const isSelected = selectedStage === stage.id;
                    return (
                      <button
                        key={stage.id}
                        onClick={() => setSelectedStage(stage.id)}
                        className={`py-1.5 px-2 rounded-xl border text-[11px] font-black transition-all flex items-center justify-center gap-1 ${
                          isSelected
                            ? `${stage.color} ring-2 ring-emerald-500/30 text-white`
                            : 'bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-800'
                        }`}
                      >
                        <span>{stage.name}</span>
                        {isSelected && <Check className="w-3 h-3" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Basic Numeric Parameters */}
            <div className="bg-gray-900/60 p-3.5 rounded-2xl border border-gray-800 space-y-2.5">
              <span className="text-[11px] font-bold text-gray-400 block">基础参数设置</span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">时长(分)</label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={e => setDurationMinutes(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-xs font-bold text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">场地长(米)</label>
                  <input
                    type="number"
                    value={fieldLength}
                    onChange={e => setFieldLength(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-xs font-bold text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">场地宽(米)</label>
                  <input
                    type="number"
                    value={fieldWidth}
                    onChange={e => setFieldWidth(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-xs font-bold text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">队员数(人)</label>
                  <input
                    type="number"
                    value={playerCount}
                    onChange={e => setPlayerCount(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-xs font-bold text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">足球数(个)</label>
                  <input
                    type="number"
                    value={ballCount}
                    onChange={e => setBallCount(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-xs font-bold text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">标志盘(个)</label>
                  <input
                    type="number"
                    value={coneCount}
                    onChange={e => setConeCount(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-xs font-bold text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 block mb-1">所需器材及背心备注</label>
                <input
                  type="text"
                  value={equipmentNotes}
                  onChange={e => setEquipmentNotes(e.target.value)}
                  placeholder="例如: 标志盘8个、足球6个、分队背心2色"
                  className="w-full px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-xs font-medium text-gray-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Teaching Steps: 组织方法, 指导要点, 变化与进阶 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <span className="text-xs font-black text-gray-200 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <span>教案要点结构</span>
                </span>
                <div className="flex items-center gap-1 bg-gray-900 p-0.5 rounded-lg text-xs font-bold">
                  <button
                    onClick={() => setActiveTemplateTab('template')}
                    className={`px-2.5 py-0.5 rounded-md transition-colors ${
                      activeTemplateTab === 'template' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-400'
                    }`}
                  >
                    标准教案
                  </button>
                  <button
                    onClick={() => {
                      setActiveTemplateTab('blank');
                      setOrganization('');
                      setCoachingPoints('');
                      setProgressions('');
                    }}
                    className={`px-2.5 py-0.5 rounded-md transition-colors ${
                      activeTemplateTab === 'blank' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-400'
                    }`}
                  >
                    空白模板
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-300 mb-1">
                  1. 组织方法 (场地布置与步骤流程)
                </label>
                <textarea
                  value={organization}
                  onChange={e => setOrganization(e.target.value)}
                  rows={3}
                  placeholder="详细列出每一步训练的站位与跑动组织流程..."
                  className="w-full px-3.5 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs text-gray-200 focus:border-emerald-500 focus:outline-none transition-all leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-300 mb-1">
                  2. 指导要点 (技术关键与心理意识)
                </label>
                <textarea
                  value={coachingPoints}
                  onChange={e => setCoachingPoints(e.target.value)}
                  rows={3}
                  placeholder="教练员指导口令与关键技术纠错要点..."
                  className="w-full px-3.5 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs text-gray-200 focus:border-emerald-500 focus:outline-none transition-all leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-300 mb-1">
                  3. 变化与进阶 (升降级与防守强度调整)
                </label>
                <textarea
                  value={progressions}
                  onChange={e => setProgressions(e.target.value)}
                  rows={2}
                  placeholder="进阶规则（如触球次数限制、增加防守人、弱侧跑位）..."
                  className="w-full px-3.5 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs text-gray-200 focus:border-emerald-500 focus:outline-none transition-all leading-relaxed"
                />
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
