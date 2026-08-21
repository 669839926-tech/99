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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 via-white to-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-bvb-black flex items-center justify-center text-bvb-yellow shadow-md">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                <span>{initialDrill ? '编辑训练项' : '创建训练项'}</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  单项训练设计
                </span>
              </h2>
              <p className="text-xs text-gray-500 font-medium">设定示意图、年龄段、技战术主题、参数及教学组织步骤</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
          
          {/* Section 1: Title & Description */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-black text-gray-700 mb-1">
                训练项标题 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="例如: 技能: 1v1+1 (回避防守人) 运球变向加速突破训练U8+"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-900 focus:bg-white focus:border-bvb-black focus:ring-2 focus:ring-yellow-400/20 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-gray-700 mb-1">训练项简介</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="简述该训练项的目标与针对的核心痛点..."
                rows={2}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-gray-800 focus:bg-white focus:border-bvb-black focus:outline-none transition-all resize-none"
              />
            </div>
          </div>

          {/* Section 2: Diagram Attachment (Video 3) */}
          <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                <span>示意图 / 战术画板关联</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDiagramPicker(!showDiagramPicker)}
                  className="px-3 py-1 bg-white hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 transition-colors shadow-sm"
                >
                  {showDiagramPicker ? '收起画板列表' : '从我的示意图库选择'}
                </button>
                <button
                  onClick={() => {
                    onOpenPitchSelector();
                  }}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>新建示意图</span>
                </button>
              </div>
            </div>

            {/* Selected Diagram Thumbnail Preview */}
            {selectedDiagram ? (
              <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-emerald-300 shadow-sm">
                <div className="w-28 h-20 bg-gray-900 rounded-xl overflow-hidden shadow-inner flex items-center justify-center shrink-0">
                  {selectedDiagram.previewImage ? (
                    <img src={selectedDiagram.previewImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <PitchSvgRenderer
                      pitchType={selectedDiagram.pitchType}
                      pitchTheme={selectedDiagram.pitchTheme}
                      className="w-full h-full"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-black text-gray-900 truncate">{selectedDiagram.title}</h4>
                  <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                    {selectedDiagram.elements.length} 个元素 · {selectedDiagram.lines.length} 条战术线条
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      已绑定
                    </span>
                    <button
                      onClick={() => setSelectedDiagramId(null)}
                      className="text-[11px] text-red-500 hover:underline font-bold"
                    >
                      解除绑定
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-white rounded-2xl border-2 border-dashed border-gray-200 text-center">
                <p className="text-xs text-gray-400 font-bold">暂未关联示意图，可点击右上角选择或新建</p>
              </div>
            )}

            {/* Expandable Diagram Picker */}
            {showDiagramPicker && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 max-h-48 overflow-y-auto">
                {existingDiagrams.map(d => (
                  <div
                    key={d.id}
                    onClick={() => {
                      setSelectedDiagramId(d.id);
                      setShowDiagramPicker(false);
                    }}
                    className={`p-2 rounded-xl border cursor-pointer transition-all ${
                      selectedDiagramId === d.id
                        ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/20'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="aspect-[16/10] bg-gray-900 rounded-lg overflow-hidden mb-1.5 flex items-center justify-center">
                      {d.previewImage ? (
                        <img src={d.previewImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <PitchSvgRenderer pitchType={d.pitchType} pitchTheme={d.pitchTheme} className="w-full h-full" />
                      )}
                    </div>
                    <span className="text-[11px] font-bold text-gray-800 block truncate">{d.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Ages, Topics & Stage Selectors */}
          <div className="space-y-4">
            {/* Age selector */}
            <div>
              <span className="block text-xs font-black text-gray-700 mb-1.5">适用年龄段 (岁)</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {AGE_GROUPS.map(age => {
                  const isSelected = selectedAges.includes(age);
                  return (
                    <button
                      key={age}
                      onClick={() => toggleAge(age)}
                      className={`w-9 h-8 rounded-xl font-black text-xs transition-all ${
                        isSelected
                          ? 'bg-bvb-black text-bvb-yellow shadow-md scale-105 ring-2 ring-yellow-400/20'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      {age}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Training Topics */}
            <div>
              <span className="block text-xs font-black text-gray-700 mb-1.5">训练主题</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {TRAINING_TOPICS.map(topic => {
                  const isSelected = selectedTopic === topic;
                  return (
                    <button
                      key={topic}
                      onClick={() => setSelectedTopic(topic)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/20'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
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
              <span className="block text-xs font-black text-gray-700 mb-1.5">训练环节</span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {DRILL_STAGES.map(stage => {
                  const isSelected = selectedStage === stage.id;
                  return (
                    <button
                      key={stage.id}
                      onClick={() => setSelectedStage(stage.id)}
                      className={`py-2 px-3 rounded-2xl border text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? `${stage.color} ring-2 ring-emerald-500/20 font-black shadow-sm`
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-white'
                      }`}
                    >
                      <span>{stage.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 4: Basic Numeric Parameters */}
          <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-200 space-y-3">
            <span className="text-xs font-black text-gray-800">训练基础参数设置</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">训练时长 (分)</label>
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={e => setDurationMinutes(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">场地长 (米)</label>
                <input
                  type="number"
                  value={fieldLength}
                  onChange={e => setFieldLength(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">场地宽 (米)</label>
                <input
                  type="number"
                  value={fieldWidth}
                  onChange={e => setFieldWidth(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">队员数 (人)</label>
                <input
                  type="number"
                  value={playerCount}
                  onChange={e => setPlayerCount(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">足球数 (个)</label>
                <input
                  type="number"
                  value={ballCount}
                  onChange={e => setBallCount(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">标志盘 (个)</label>
                <input
                  type="number"
                  value={coneCount}
                  onChange={e => setConeCount(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-500 block mb-1">器材备注</label>
              <input
                type="text"
                value={equipmentNotes}
                onChange={e => setEquipmentNotes(e.target.value)}
                placeholder="例如: 标志盘8个、足球6个、分队背心2色、迷你球门2座"
                className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Section 5: Structured Coaching Content (组织方法, 指导要点, 变化与进阶) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-2">
              <span className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-bvb-black" />
                <span>教案要点结构</span>
              </span>
              <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setActiveTemplateTab('template')}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    activeTemplateTab === 'template' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  标准教案模板
                </button>
                <button
                  onClick={() => {
                    setActiveTemplateTab('blank');
                    setOrganization('');
                    setCoachingPoints('');
                    setProgressions('');
                  }}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    activeTemplateTab === 'blank' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  空白模板
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-black text-gray-700 mb-1">
                  1. 组织方法 (场地布置与步骤流程)
                </label>
                <textarea
                  value={organization}
                  onChange={e => setOrganization(e.target.value)}
                  rows={3}
                  placeholder="详细列出每一步训练的站位与跑动组织流程..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-gray-800 focus:bg-white focus:border-bvb-black focus:outline-none transition-all leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-700 mb-1">
                  2. 指导要点 (技术关键与心理意识)
                </label>
                <textarea
                  value={coachingPoints}
                  onChange={e => setCoachingPoints(e.target.value)}
                  rows={3}
                  placeholder="教练员指导口令与关键技术纠错要点..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-gray-800 focus:bg-white focus:border-bvb-black focus:outline-none transition-all leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-700 mb-1">
                  3. 变化与进阶 (升降级与防守强度调整)
                </label>
                <textarea
                  value={progressions}
                  onChange={e => setProgressions(e.target.value)}
                  rows={2}
                  placeholder="进阶规则（如触球次数限制、增加防守人、弱侧跑位）..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-gray-800 focus:bg-white focus:border-bvb-black focus:outline-none transition-all leading-relaxed"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-wrap gap-3">
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
              <span>{isPrivate ? '仅自己可见' : '公开至教案库'}</span>
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
              <span>立即发布训练项</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
