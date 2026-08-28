import React, { useState, useRef } from 'react';
import { DrillDesign, User } from '../../types';
import { AGE_GROUPS, TRAINING_TOPICS, DRILL_STAGES } from './constants';
import {
  X, Image as ImageIcon, Check, Eye, EyeOff, Save, Layers, Plus, BookOpen, Send,
  HelpCircle, Trash2, ZoomIn, Maximize2, MoveHorizontal
} from 'lucide-react';
import { PitchSvgRenderer } from './PitchSvgRenderer';
import { DiagramPreviewBox } from './DiagramPreviewBox';
import { SelectDiagramModal } from './SelectDiagramModal';
import { PublishApprovalModal, PublishChoice } from './PublishApprovalModal';
import { compressImageFile } from '../../utils/imageCompression';

interface CreateDrillItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (drill: DrillDesign) => void;
  currentUser: User | null;
  existingDiagrams: DrillDesign[];
  onOpenPitchSelector: () => void;
  initialDrill?: DrillDesign | null;
  onSaveUploadedDiagram?: (diagram: DrillDesign) => void;
}

const STANDARD_ORGANIZATION = '1. 在20x15米区域内，两端各设一条端线。\n2. 进攻队员从一端运球出发，防守队员在中间限制区内防守。\n3. 进攻队员可利用变速变向突破防守人，或与远端中立队员做撞墙配合后越过端线。\n4. 防守断球后反向进攻端线。';
const STANDARD_COACHING_POINTS = '1. 运球推进时步频快、重心低，触球点位于脚背外侧或内侧。\n2. 接近防守人前预设变向假动作，拉开防守重心后瞬间加速。\n3. 与中立队友呼应，传球力量精准，出球后迅速前插。';
const STANDARD_PROGRESSIONS = '1. 限制进攻球员必须在3次触球内完成变向或传球。\n2. 防守队员升级为全场紧逼防守。\n3. 增加第二名防守队员形成局部2v2。';

export const CreateDrillItemModal: React.FC<CreateDrillItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentUser,
  existingDiagrams,
  onOpenPitchSelector,
  initialDrill,
  onSaveUploadedDiagram
}) => {
  const [title, setTitle] = useState(initialDrill?.title || '');
  const [description, setDescription] = useState(initialDrill?.description || '');
  const [selectedDiagramId, setSelectedDiagramId] = useState<string | null>(initialDrill?.diagramId || null);
  const [customUploadedImage, setCustomUploadedImage] = useState<string | null>(initialDrill?.diagramImage || initialDrill?.previewImage || null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [isDiagramModalOpen, setIsDiagramModalOpen] = useState<boolean>(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [previewPanelWidthMode, setPreviewPanelWidthMode] = useState<'standard' | 'wide'>('standard');
  const [showPublishApprovalModal, setShowPublishApprovalModal] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [equipmentNotes, setEquipmentNotes] = useState<string>(initialDrill?.equipmentNotes || '');

  // Structured Coaching Fields (组织方法, 指导要点, 变化与进阶) - Default to Blank Template
  const [activeTemplateTab, setActiveTemplateTab] = useState<'template' | 'blank'>('blank');
  const [organization, setOrganization] = useState<string>(initialDrill?.organization || '');
  const [coachingPoints, setCoachingPoints] = useState<string>(initialDrill?.coachingPoints || '');
  const [progressions, setProgressions] = useState<string>(initialDrill?.progressions || '');

  const [isPrivate, setIsPrivate] = useState<boolean>(initialDrill?.isPrivate ?? false);

  // Synchronize and reset state when modal opens or initialDrill changes
  React.useEffect(() => {
    if (isOpen) {
      if (initialDrill) {
        setTitle(initialDrill.title || '');
        setDescription(initialDrill.description || '');
        setSelectedDiagramId(initialDrill.diagramId || null);
        setCustomUploadedImage(initialDrill.diagramImage || initialDrill.previewImage || null);
        setUploadedFileName('');
        setSelectedAges(initialDrill.ageGroups && initialDrill.ageGroups.length > 0 ? initialDrill.ageGroups : ['8', '9', '10']);
        setSelectedTopic(initialDrill.topic || '1v1');
        setSelectedStage(initialDrill.drillStage || 'skill');
        setDurationMinutes(initialDrill.durationMinutes || 15);
        setFieldLength(initialDrill.fieldLength || 20);
        setFieldWidth(initialDrill.fieldWidth || 15);
        setPlayerCount(initialDrill.playerCount || 8);
        setBallCount(initialDrill.ballCount || 6);
        setConeCount(initialDrill.coneCount || 8);
        setEquipmentNotes(initialDrill.equipmentNotes || '');
        setOrganization(initialDrill.organization || '');
        setCoachingPoints(initialDrill.coachingPoints || '');
        setProgressions(initialDrill.progressions || '');
        setIsPrivate(initialDrill.isPrivate ?? false);
        setActiveTemplateTab(initialDrill.organization ? 'template' : 'blank');
      } else {
        // Brand new drill item - clean all inputs with blank template default
        setTitle('');
        setDescription('');
        setSelectedDiagramId(null);
        setCustomUploadedImage(null);
        setUploadedFileName('');
        setSelectedAges(['8', '9', '10']);
        setSelectedTopic('1v1');
        setSelectedStage('skill');
        setDurationMinutes(15);
        setFieldLength(20);
        setFieldWidth(15);
        setPlayerCount(8);
        setBallCount(6);
        setConeCount(8);
        setEquipmentNotes('');
        setOrganization('');
        setCoachingPoints('');
        setProgressions('');
        setIsPrivate(false);
        setActiveTemplateTab('blank');
      }
    }
  }, [isOpen, initialDrill]);

  const [lastAgeClick, setLastAgeClick] = useState<string | null>(null);

  const toggleAge = (age: string) => {
    // If no previous age is active or if user clicked the same age, set single selection
    if (!lastAgeClick || lastAgeClick === age) {
      if (selectedAges.length === 1 && selectedAges[0] === age) {
        setSelectedAges([]);
        setLastAgeClick(null);
      } else {
        setSelectedAges([age]);
        setLastAgeClick(age);
      }
      return;
    }

    // Two different ages clicked: calculate inclusive span between them
    const idx1 = AGE_GROUPS.indexOf(lastAgeClick);
    const idx2 = AGE_GROUPS.indexOf(age);

    if (idx1 !== -1 && idx2 !== -1) {
      const start = Math.min(idx1, idx2);
      const end = Math.max(idx1, idx2);
      const range = AGE_GROUPS.slice(start, end + 1);
      setSelectedAges(range);
      setLastAgeClick(null); // Reset click anchor after forming range
    } else {
      setSelectedAges([age]);
      setLastAgeClick(age);
    }
  };

  const selectedDiagram = existingDiagrams.find(d => d.id === selectedDiagramId);
  const activeDrillOrDiagram = selectedDiagram || initialDrill;

  // Handle Selection from Diagram Library Modal
  const handleSelectDiagramFromModal = (diagram: DrillDesign) => {
    setSelectedDiagramId(diagram.id);
    setCustomUploadedImage(null); // Clear custom upload when choosing from library
    
    // Auto sync equipment counts if present in diagram
    if (diagram.elements && diagram.elements.length > 0) {
      const pCount = diagram.elements.filter(e => 
        e.type.startsWith('Player') || e.type === 'Coach' || e.type === 'Referee'
      ).length;
      const bCount = diagram.elements.filter(e => e.type === 'Ball').length;
      const cCount = diagram.elements.filter(e => e.type === 'Cone' || e.type === 'Marker').length;
      if (pCount > 0) setPlayerCount(pCount);
      if (bCount > 0) setBallCount(bCount);
      if (cCount > 0) setConeCount(cCount);
    }
    if (diagram.fieldLength) setFieldLength(diagram.fieldLength);
    if (diagram.fieldWidth) setFieldWidth(diagram.fieldWidth);
  };

  // Handle local device image file upload
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('请选择有效的图片文件 (PNG, JPG, JPEG, WEBP, SVG 等)');
      return;
    }

    setUploadedFileName(file.name);
    try {
      const result = await compressImageFile(file, { maxWidth: 1024, maxHeight: 768, quality: 0.8 });
      if (result) {
        setCustomUploadedImage(result);
        setSelectedDiagramId(null); // Reset library id since user uploaded a custom file

        // Also persist this newly uploaded image diagram to the library
        if (onSaveUploadedDiagram) {
          const isDirector = currentUser?.role === 'director' || !currentUser?.role;
          const cleanFileName = file.name.replace(/\.[^/.]+$/, '');
          const newDiagram: DrillDesign = {
            id: `uploaded-diagram-${Date.now()}`,
            title: cleanFileName || '本地导入示意图',
            description: `从设备导入的战术示意图 (${file.name})`,
            category: 'diagram',
            contentType: 'diagram',
            pitchType: 'Full',
            pitchTheme: 'Grass',
            elements: [],
            lines: [],
            previewImage: result,
            keyPoints: ['本地导入示意图'],
            createdAt: new Date().toISOString().split('T')[0],
            isUploadedImage: true,
            fieldLength: 20,
            fieldWidth: 15,
            playerCount: 8,
            ballCount: 6,
            coneCount: 8,
            authorId: currentUser?.id || 'u1',
            authorName: currentUser?.name || '青训总监',
            authorRole: currentUser?.role || 'director',
            approvalStatus: isDirector ? 'approved' : 'pending',
            isPrivate: false,
            isDraft: false
          };
          onSaveUploadedDiagram(newDiagram);
        }
      }
    } catch (err) {
      console.warn('Image upload compression error:', err);
    }
    // Reset file input value to allow re-uploading same file name if needed
    e.target.value = '';
  };

  // Clear diagram / image
  const handleClearDiagram = () => {
    setSelectedDiagramId(null);
    setCustomUploadedImage(null);
    setUploadedFileName(null);
  };

  if (!isOpen) return null;

  const handlePerformSave = (options: {
    isPrivateChoice: boolean;
    approvalStatusChoice: 'approved' | 'pending' | 'draft';
    isDraftChoice: boolean;
    submissionNotes?: string;
  }) => {
    if (!title.trim()) {
      alert('请输入训练项标题');
      return;
    }

    const keyPointsArray = coachingPoints
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    const finalPreviewImage = customUploadedImage || selectedDiagram?.previewImage || initialDrill?.previewImage;

    const isDirector = currentUser?.role === 'director' || !currentUser?.role;
    const drillItem: DrillDesign = {
      id: initialDrill?.id || `drill-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      category: 'drill_item',
      contentType: 'drill',
      pitchType: selectedDiagram?.pitchType || initialDrill?.pitchType || 'Midfield',
      pitchTheme: selectedDiagram?.pitchTheme || initialDrill?.pitchTheme || 'Grass',
      elements: selectedDiagram ? selectedDiagram.elements : (initialDrill?.elements || []),
      lines: selectedDiagram ? selectedDiagram.lines : (initialDrill?.lines || []),
      keyframes: selectedDiagram ? selectedDiagram.keyframes : (initialDrill?.keyframes || []),
      previewImage: finalPreviewImage,
      diagramImage: customUploadedImage || undefined,
      diagramId: selectedDiagramId || initialDrill?.diagramId || undefined,
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
      authorId: currentUser?.id || 'u1',
      authorName: currentUser?.name || '青训总监',
      authorRole: currentUser?.role || 'director',
      isPrivate: options.isPrivateChoice,
      approvalStatus: isDirector && options.approvalStatusChoice !== 'draft' ? 'approved' : options.approvalStatusChoice,
      approvalFeedback: options.submissionNotes,
      isDraft: options.isDraftChoice
    };

    onSave(drillItem);
    onClose();
  };

  const handleSave = (publish = true) => {
    if (!title.trim()) {
      alert('请输入训练项标题');
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

  const hasDiagramOrImage = !!selectedDiagram || !!customUploadedImage || (!!initialDrill?.previewImage && !selectedDiagramId && !customUploadedImage);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-100 text-gray-900 flex flex-col overflow-hidden animate-in fade-in duration-200">
        
        {/* Hidden File Input for Device Image Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageFileChange}
        />

        {/* Top Fullscreen Header Navigation */}
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
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-gray-900 flex items-center gap-2">
                  <span>{initialDrill ? '编辑训练项' : '创建训练项（全屏模式）'}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
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
              <span>立即发布训练项</span>
            </button>
          </div>
        </div>

        {/* Main Fullscreen Split Workspace */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Left Companion Area: Tactical Pitch Diagram Preview & High-Fidelity Workspace */}
          <div className={`w-full ${previewPanelWidthMode === 'wide' ? 'lg:w-[580px] xl:w-[680px] 2xl:w-[780px]' : 'lg:w-[460px] xl:w-[540px] 2xl:w-[620px]'} bg-slate-50 border-r border-gray-200 flex flex-col shrink-0 overflow-y-auto custom-scrollbar transition-all duration-200`}>
            
            {/* Companion Top Bar */}
            <div className="p-3.5 px-4 bg-white/95 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2 sticky top-0 z-20 backdrop-blur-sm shadow-xs">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-black text-gray-900">战术示意图</span>
                <span className="text-[10px] text-gray-400 font-mono">
                  {previewPanelWidthMode === 'wide' ? '(宽屏视野)' : '(标准视野)'}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Toggle Width Mode */}
                <button
                  type="button"
                  onClick={() => setPreviewPanelWidthMode(prev => prev === 'wide' ? 'standard' : 'wide')}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold rounded-lg border border-gray-200 transition-colors shadow-xs flex items-center gap-1"
                  title={previewPanelWidthMode === 'wide' ? '切换为标准宽度' : '拓展为更宽视野'}
                >
                  <MoveHorizontal className="w-3 h-3 text-emerald-600" />
                  <span>{previewPanelWidthMode === 'wide' ? '适中' : '更宽'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold rounded-lg border border-gray-200 transition-colors shadow-xs flex items-center gap-1"
                  title="全屏超清放大查看"
                >
                  <ZoomIn className="w-3 h-3 text-blue-600" />
                  <span>放大</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsDiagramModalOpen(true)}
                  className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 text-[11px] font-bold rounded-lg border border-gray-200 transition-colors shadow-xs"
                  title="从示意图库中选择"
                >
                  图库
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 text-[11px] font-bold rounded-lg border border-gray-200 transition-colors shadow-xs"
                  title="上传电脑中的图片"
                >
                  上传
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPitchSelector();
                  }}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg transition-colors shadow-xs flex items-center gap-1"
                  title="新建战术图"
                >
                  <Plus className="w-3 h-3" />
                  <span>新建</span>
                </button>
              </div>
            </div>

            {/* High-Fidelity Tactical Diagram Preview Area */}
            <div className="p-4 space-y-4 flex flex-col items-center">
              
              {/* Diagram Card Container */}
              <div className="w-full bg-white rounded-2xl p-3.5 border border-gray-200 shadow-sm flex flex-col items-center">
                
                {/* Diagram Title & Type Badge */}
                <div className="w-full flex items-center justify-between pb-2.5 mb-2.5 border-b border-gray-100 text-xs font-bold">
                  <span className="text-gray-900 font-black truncate max-w-[240px]">
                    {customUploadedImage 
                      ? (uploadedFileName || '设备中上传的示意图') 
                      : (selectedDiagram?.title || initialDrill?.title || '战术示意图')}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200 text-[10.5px]">
                      {customUploadedImage ? '本地图片' : (activeDrillOrDiagram?.pitchType || '标准场地')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsLightboxOpen(true)}
                      className="p-1 hover:bg-gray-100 text-gray-400 hover:text-emerald-600 rounded-md transition-colors"
                      title="点击全屏放大"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* High-Proportion Diagram Renderer with Click-to-Zoom */}
                <div 
                  onClick={() => setIsLightboxOpen(true)}
                  className="w-full aspect-[16/10] flex items-center justify-center overflow-hidden rounded-xl bg-slate-900 border border-gray-300 relative cursor-zoom-in group shadow-inner"
                  title="点击查看全屏超清大图"
                >
                  {customUploadedImage ? (
                    <img 
                      src={customUploadedImage} 
                      alt="Uploaded Diagram" 
                      className="w-full h-full object-contain bg-black/40 group-hover:scale-[1.02] transition-transform duration-200"
                    />
                  ) : activeDrillOrDiagram?.previewImage ? (
                    <img 
                      src={activeDrillOrDiagram.previewImage} 
                      alt="" 
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                    />
                  ) : activeDrillOrDiagram?.elements && activeDrillOrDiagram.elements.length > 0 ? (
                    <DiagramPreviewBox
                      diagram={activeDrillOrDiagram}
                      pitchType={activeDrillOrDiagram?.pitchType || 'Midfield'}
                      pitchTheme={activeDrillOrDiagram?.pitchTheme || 'Grass'}
                      elements={activeDrillOrDiagram?.elements}
                      lines={activeDrillOrDiagram?.lines}
                      previewImage={activeDrillOrDiagram?.previewImage}
                      showGrid={true}
                      size="auto"
                      className="w-full max-w-full h-full group-hover:scale-[1.01] transition-transform duration-200"
                    />
                  ) : (
                    <PitchSvgRenderer
                      pitchType={activeDrillOrDiagram?.pitchType || 'Midfield'}
                      pitchTheme={activeDrillOrDiagram?.pitchTheme || 'Grass'}
                      className="w-full h-full group-hover:scale-[1.01] transition-transform duration-200"
                    />
                  )}

                  {/* Hover Floating Hint */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full border border-gray-700 flex items-center gap-1.5 shadow-2xl">
                      <ZoomIn className="w-3.5 h-3.5 text-emerald-400" />
                      <span>点击全屏超清放大</span>
                    </div>
                  </div>
                </div>

                {/* Pitch Spec Cards Below Diagram */}
                <div className="w-full mt-3 grid grid-cols-4 gap-2 text-xs font-bold">
                  <div className="p-2 bg-slate-50 rounded-xl border border-gray-200 text-gray-700 flex flex-col items-center justify-center">
                    <span className="text-gray-400 text-[10px] mb-0.5">场地规格</span>
                    <span className="text-amber-700 font-mono text-[11px] font-black">{fieldLength}×{fieldWidth}m</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl border border-gray-200 text-gray-700 flex flex-col items-center justify-center">
                    <span className="text-gray-400 text-[10px] mb-0.5">参训人数</span>
                    <span className="text-emerald-700 font-mono text-[11px] font-black">{playerCount}人</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl border border-gray-200 text-gray-700 flex flex-col items-center justify-center">
                    <span className="text-gray-400 text-[10px] mb-0.5">器材配置</span>
                    <span className="text-blue-700 font-mono text-[11px] font-black">{ballCount}球 · {coneCount}盘</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl border border-gray-200 text-gray-700 flex flex-col items-center justify-center">
                    <span className="text-gray-400 text-[10px] mb-0.5">训练时长</span>
                    <span className="text-purple-700 font-mono text-[11px] font-black">{durationMinutes}分钟</span>
                  </div>
                </div>
              </div>

              {/* Quick tips */}
              <div className="w-full p-3 bg-white rounded-xl border border-gray-200/80 text-xs text-gray-500 leading-relaxed flex items-start gap-2 shadow-2xs">
                <span className="text-emerald-600 font-bold shrink-0">💡</span>
                <span>
                  左侧示意图已自适应高清晰度展示；点击示意图或右上角放大镜可进入全屏高分辨率视图。
                </span>
              </div>
            </div>
          </div>

          {/* Right Main Area: Primary Form Editor Workspace (Spacious, Clear & Fast) */}
          <div className="flex-1 bg-slate-100 flex flex-col overflow-y-auto custom-scrollbar">
            
            <div className="p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-6">
              
              {/* Section 1: Title & Description */}
              <div className="bg-white p-5 lg:p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <div className="w-2 h-4 bg-emerald-500 rounded-full" />
                  <h3 className="text-sm font-black text-gray-900">训练项基本信息</h3>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1.5">
                      训练项标题 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="例如: 技能: 1v1+1 (回避防守人) 运球变向加速突破训练"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:border-emerald-500 focus:outline-none transition-all placeholder:text-gray-400 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1.5">
                      训练项简介与核心目标
                    </label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="简述该训练项的训练目标、针对痛点与关键战术意图..."
                      rows={2}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:bg-white focus:border-emerald-500 focus:outline-none transition-all resize-none placeholder:text-gray-400 leading-relaxed shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Diagram Selection Area (Image 2 style) */}
              <div className="bg-white p-5 lg:p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-4 bg-emerald-500 rounded-full" />
                    <h3 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
                      <span>示意图</span>
                      <div className="group relative cursor-pointer">
                        <HelpCircle className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 transition-colors" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block w-64 p-2 bg-gray-900 border border-gray-700 text-[11px] text-gray-200 rounded-lg shadow-xl z-30 pointer-events-none">
                          如果添加仅自己可见的示意图，取消仅自己可见后请重新添加
                        </div>
                      </div>
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenPitchSelector();
                    }}
                    className="text-emerald-600 hover:text-emerald-700 text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>创建示意图</span>
                  </button>
                </div>

                <p className="text-[11px] text-gray-500">
                  如果添加仅自己可见的示意图，取消仅自己可见后请重新添加
                </p>

                {/* If already selected or uploaded, show high-fidelity active card */}
                {hasDiagramOrImage ? (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-emerald-400/60 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-24 h-16 rounded-xl bg-slate-900 border border-gray-300 overflow-hidden shrink-0 flex items-center justify-center">
                        {customUploadedImage ? (
                          <img src={customUploadedImage} alt="Uploaded" className="w-full h-full object-cover" />
                        ) : activeDrillOrDiagram?.previewImage ? (
                          <img src={activeDrillOrDiagram.previewImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <PitchSvgRenderer pitchType={activeDrillOrDiagram?.pitchType || 'Midfield'} pitchTheme="Grass" className="w-full h-full" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-black text-gray-900 truncate mb-1">
                          {customUploadedImage 
                            ? (uploadedFileName || '设备中上传的示意图') 
                            : (selectedDiagram?.title || initialDrill?.title || '已关联战术图')}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 flex-wrap">
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {customUploadedImage ? '设备图片' : (selectedDiagram?.pitchType || '标准场地')}
                          </span>
                          <span>规格: {fieldLength}×{fieldWidth}米</span>
                          <span>·</span>
                          <span>{playerCount}人</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsDiagramModalOpen(true)}
                        className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 transition-colors shadow-2xs"
                      >
                        更换示意图
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 transition-colors shadow-2xs"
                      >
                        重新上传
                      </button>
                      <button
                        type="button"
                        onClick={handleClearDiagram}
                        className="p-1.5 bg-white hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-xl border border-gray-200 hover:border-red-200 transition-colors"
                        title="移除示意图"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Two-Card Choice Grid (Image 2 style) */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Left Card: Upload Device Image */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-6 rounded-2xl border-2 border-dashed border-gray-300 hover:border-emerald-500 bg-slate-50 hover:bg-white transition-all flex flex-col items-center justify-center gap-2.5 group cursor-pointer"
                    >
                      <div className="w-11 h-11 rounded-2xl bg-white group-hover:bg-emerald-50 text-gray-500 group-hover:text-emerald-600 flex items-center justify-center transition-colors border border-gray-200 group-hover:border-emerald-200 shadow-2xs">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-black text-gray-800 group-hover:text-emerald-700 transition-colors">
                        点击添加设备中的图片
                      </span>
                      <span className="text-[10px] text-gray-400">
                        支持 PNG、JPG、WEBP、SVG 等格式图片
                      </span>
                    </button>

                    {/* Right Card: Select Created Diagram */}
                    <button
                      type="button"
                      onClick={() => setIsDiagramModalOpen(true)}
                      className="p-6 rounded-2xl border-2 border-dashed border-gray-300 hover:border-emerald-500 bg-slate-50 hover:bg-white transition-all flex flex-col items-center justify-center gap-2.5 group cursor-pointer"
                    >
                      <div className="w-11 h-11 rounded-2xl bg-white group-hover:bg-emerald-50 text-gray-500 group-hover:text-emerald-600 flex items-center justify-center transition-colors border border-gray-200 group-hover:border-emerald-200 shadow-2xs">
                        <Layers className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-black text-gray-800 group-hover:text-emerald-700 transition-colors">
                        点击选择已创建的示意图
                      </span>
                      <span className="text-[10px] text-gray-400">
                        按最新创建排序 · 支持官方与个人库快速检索
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Section 3: Age, Topic & Stage Classification */}
              <div className="bg-white p-5 lg:p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-5">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <div className="w-2 h-4 bg-bvb-yellow rounded-full" />
                  <h3 className="text-sm font-black text-gray-900">分类与属性配置</h3>
                </div>

                {/* Age selector */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-gray-700">适用年龄段 (岁)</span>
                    <span className="text-[11px] text-gray-500 font-medium">已选: {selectedAges.join(', ')} 岁</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {AGE_GROUPS.map(age => {
                      const isSelected = selectedAges.includes(age);
                      return (
                        <button
                          key={age}
                          type="button"
                          onClick={() => toggleAge(age)}
                          className={`min-w-[34px] h-8 px-2 rounded-xl font-black text-xs transition-all ${
                            isSelected
                              ? 'bg-bvb-yellow text-black shadow-xs scale-105 ring-2 ring-yellow-400/40'
                              : 'bg-slate-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
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
                  <span className="block text-xs font-black text-gray-700 mb-2">训练主题</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {TRAINING_TOPICS.map(topic => {
                      const isSelected = selectedTopic === topic;
                      return (
                        <button
                          key={topic}
                          type="button"
                          onClick={() => setSelectedTopic(topic)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/40'
                              : 'bg-slate-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
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
                  <span className="block text-xs font-black text-gray-700 mb-2">训练环节</span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {DRILL_STAGES.map(stage => {
                      const isSelected = selectedStage === stage.id;
                      return (
                        <button
                          key={stage.id}
                          type="button"
                          onClick={() => setSelectedStage(stage.id)}
                          className={`py-2 px-2.5 rounded-xl border text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                            isSelected
                              ? `${stage.color} ring-2 ring-emerald-500/40 text-white shadow-xs`
                              : 'bg-slate-50 border-gray-200 text-gray-600 hover:bg-gray-100'
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
              <div className="bg-white p-5 lg:p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <div className="w-2 h-4 bg-blue-500 rounded-full" />
                  <h3 className="text-sm font-black text-gray-900">场地规格与器材配置</h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-gray-200">
                    <label className="text-[11px] font-bold text-gray-500 block mb-1.5">预计时长(分)</label>
                    <input
                      type="number"
                      value={durationMinutes}
                      onChange={e => setDurationMinutes(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-black text-gray-900 focus:outline-none focus:border-emerald-500 shadow-2xs"
                    />
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-gray-200">
                    <label className="text-[11px] font-bold text-gray-500 block mb-1.5">场地长(米)</label>
                    <input
                      type="number"
                      value={fieldLength}
                      onChange={e => setFieldLength(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-black text-gray-900 focus:outline-none focus:border-emerald-500 shadow-2xs"
                    />
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-gray-200">
                    <label className="text-[11px] font-bold text-gray-500 block mb-1.5">场地宽(米)</label>
                    <input
                      type="number"
                      value={fieldWidth}
                      onChange={e => setFieldWidth(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-black text-gray-900 focus:outline-none focus:border-emerald-500 shadow-2xs"
                    />
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-gray-200">
                    <label className="text-[11px] font-bold text-gray-500 block mb-1.5">队员数(人)</label>
                    <input
                      type="number"
                      value={playerCount}
                      onChange={e => setPlayerCount(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-black text-emerald-700 focus:outline-none focus:border-emerald-500 shadow-2xs"
                    />
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-gray-200">
                    <label className="text-[11px] font-bold text-gray-500 block mb-1.5">足球数(个)</label>
                    <input
                      type="number"
                      value={ballCount}
                      onChange={e => setBallCount(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-black text-gray-900 focus:outline-none focus:border-emerald-500 shadow-2xs"
                    />
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-gray-200">
                    <label className="text-[11px] font-bold text-gray-500 block mb-1.5">标志盘(个)</label>
                    <input
                      type="number"
                      value={coneCount}
                      onChange={e => setConeCount(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-black text-amber-700 focus:outline-none focus:border-emerald-500 shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5">所需器材及背心备注</label>
                  <input
                    type="text"
                    value={equipmentNotes}
                    onChange={e => setEquipmentNotes(e.target.value)}
                    placeholder="例如: 标志盘8个、足球6个、分队背心2色、敏捷梯1条"
                    className="w-full px-4 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:bg-white focus:outline-none focus:border-emerald-500 shadow-2xs"
                  />
                </div>
              </div>

              {/* Section 5: Teaching Steps & Content Breakdown */}
              <div className="bg-white p-5 lg:p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-4 bg-purple-500 rounded-full" />
                    <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-emerald-600" />
                      <span>教案结构与指导要点</span>
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold border border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTemplateTab('template');
                        if (!organization) setOrganization(STANDARD_ORGANIZATION);
                        if (!coachingPoints) setCoachingPoints(STANDARD_COACHING_POINTS);
                        if (!progressions) setProgressions(STANDARD_PROGRESSIONS);
                      }}
                      className={`px-3 py-1 rounded-lg transition-colors ${
                        activeTemplateTab === 'template' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      标准教案模板
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTemplateTab('blank');
                        setOrganization('');
                        setCoachingPoints('');
                        setProgressions('');
                      }}
                      className={`px-3 py-1 rounded-lg transition-colors ${
                        activeTemplateTab === 'blank' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      空白模板
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-gray-800 mb-1.5 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center text-[10px] font-bold">1</span>
                      <span>组织方法 (场地布置与步骤流程)</span>
                    </label>
                    <textarea
                      value={organization}
                      onChange={e => setOrganization(e.target.value)}
                      rows={4}
                      placeholder="详细列出每一步训练的站位与跑动组织流程..."
                      className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:bg-white focus:border-emerald-500 focus:outline-none transition-all leading-relaxed shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-800 mb-1.5 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-yellow-100 text-yellow-900 border border-yellow-300 flex items-center justify-center text-[10px] font-bold">2</span>
                      <span>指导要点 (技术关键与心理意识)</span>
                    </label>
                    <textarea
                      value={coachingPoints}
                      onChange={e => setCoachingPoints(e.target.value)}
                      rows={4}
                      placeholder="教练员指导口令与关键技术纠错要点..."
                      className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:bg-white focus:border-emerald-500 focus:outline-none transition-all leading-relaxed shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-800 mb-1.5 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 flex items-center justify-center text-[10px] font-bold">3</span>
                      <span>变化与进阶 (升降级与防守强度调整)</span>
                    </label>
                    <textarea
                      value={progressions}
                      onChange={e => setProgressions(e.target.value)}
                      rows={3}
                      placeholder="进阶规则（如触球次数限制、增加防守人、弱侧跑位）..."
                      className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:bg-white focus:border-emerald-500 focus:outline-none transition-all leading-relaxed shadow-2xs"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Independent Select Diagram Modal (Image 3 style) */}
      <SelectDiagramModal
        isOpen={isDiagramModalOpen}
        onClose={() => setIsDiagramModalOpen(false)}
        onSelect={handleSelectDiagramFromModal}
        existingDiagrams={existingDiagrams}
        selectedDiagramId={selectedDiagramId}
        onOpenPitchSelector={() => {
          setIsDiagramModalOpen(false);
          onClose();
          onOpenPitchSelector();
        }}
      />

      {/* High-Resolution Fullscreen Diagram Lightbox / Modal */}
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div 
            className="relative max-w-6xl w-full max-h-[92vh] bg-white border border-gray-200 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col items-center overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Top Lightbox Header */}
            <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-gray-200">
              <div className="flex items-center gap-2.5">
                <ImageIcon className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-black text-gray-900">
                  {customUploadedImage 
                    ? (uploadedFileName || '设备中上传的示意图') 
                    : (selectedDiagram?.title || initialDrill?.title || '战术示意图全屏预览')}
                </h3>
                <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {customUploadedImage ? '本地图片' : (activeDrillOrDiagram?.pitchType || '标准场地')}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="p-2 hover:bg-gray-100 text-gray-500 hover:text-gray-900 rounded-xl transition-colors"
                title="关闭预览"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lightbox Large Image Display */}
            <div className="w-full flex-1 max-h-[70vh] flex items-center justify-center overflow-hidden rounded-2xl bg-slate-900 border border-gray-200 p-2">
              {customUploadedImage ? (
                <img 
                  src={customUploadedImage} 
                  alt="Uploaded Diagram Fullscreen" 
                  className="max-w-full max-h-[66vh] object-contain rounded-xl shadow-lg"
                />
              ) : activeDrillOrDiagram?.previewImage ? (
                <img 
                  src={activeDrillOrDiagram.previewImage} 
                  alt="" 
                  className="max-w-full max-h-[66vh] object-contain rounded-xl shadow-lg"
                />
              ) : activeDrillOrDiagram?.elements && activeDrillOrDiagram.elements.length > 0 ? (
                <div className="w-full h-full max-h-[66vh] flex items-center justify-center">
                  <DiagramPreviewBox
                    diagram={activeDrillOrDiagram}
                    pitchType={activeDrillOrDiagram?.pitchType || 'Midfield'}
                    pitchTheme={activeDrillOrDiagram?.pitchTheme || 'Grass'}
                    elements={activeDrillOrDiagram?.elements}
                    lines={activeDrillOrDiagram?.lines}
                    previewImage={activeDrillOrDiagram?.previewImage}
                    showGrid={true}
                    size="responsive"
                    className="w-auto h-full max-h-[66vh] aspect-[16/10]"
                  />
                </div>
              ) : (
                <PitchSvgRenderer
                  pitchType={activeDrillOrDiagram?.pitchType || 'Midfield'}
                  pitchTheme={activeDrillOrDiagram?.pitchTheme || 'Grass'}
                  className="w-full h-full max-h-[66vh]"
                />
              )}
            </div>

            {/* Bottom Spec Pills */}
            <div className="w-full mt-3.5 flex items-center justify-between flex-wrap gap-2 text-xs font-bold text-gray-500">
              <div className="flex items-center gap-3 flex-wrap">
                <span>场地: <strong className="text-amber-700">{fieldLength}×{fieldWidth}米</strong></span>
                <span>·</span>
                <span>参训人数: <strong className="text-emerald-700">{playerCount}人</strong></span>
                <span>·</span>
                <span>器材: <strong className="text-blue-700">{ballCount}球 / {coneCount}标志盘</strong></span>
                <span>·</span>
                <span>训练时长: <strong className="text-purple-700">{durationMinutes}分钟</strong></span>
              </div>

              <div className="text-[11px] text-gray-400">
                点击背景或右上角关闭全屏
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Publish Approval Workflow Modal */}
      <PublishApprovalModal
        isOpen={showPublishApprovalModal}
        onClose={() => setShowPublishApprovalModal(false)}
        onConfirm={handleConfirmPublishChoice}
        contentTypeName="训练项"
        title={title}
        currentUser={currentUser}
      />
    </>
  );
};
