import React, { useState } from 'react';
import { DrillDesign, PitchType, PitchTheme, User } from '../types';
import { ContentLibraryHub } from './SessionDesigner/ContentLibraryHub';
import { PitchSelectorModal } from './SessionDesigner/PitchSelectorModal';
import { DiagramCanvasEditor } from './SessionDesigner/DiagramCanvasEditor';
import { CreateDrillItemModal } from './SessionDesigner/CreateDrillItemModal';
import { CreateSessionPlanModal } from './SessionDesigner/CreateSessionPlanModal';
import { SessionDetailViewModal } from './SessionDesigner/SessionDetailViewModal';
import { INITIAL_PRESET_DRILLS, INITIAL_PRESET_PLANS } from './SessionDesigner/constants';
import { X, Save, FileText } from 'lucide-react';

interface SessionDesignerProps {
  designs: DrillDesign[];
  onSaveDesign: (design: DrillDesign) => void;
  onDeleteDesign: (id: string) => void;
  currentUser: User | null;
}

export const SessionDesigner: React.FC<SessionDesignerProps> = ({
  designs,
  onSaveDesign,
  onDeleteDesign,
  currentUser
}) => {
  // Combine stored designs with initial presets if empty
  const activeDesigns = designs && designs.length > 0
    ? designs
    : [...INITIAL_PRESET_DRILLS, ...INITIAL_PRESET_PLANS];

  // Main UI Mode ('hub' | 'editor')
  const [currentMode, setCurrentMode] = useState<'hub' | 'editor'>('hub');
  const [editingDesign, setEditingDesign] = useState<DrillDesign | null>(null);

  // Modals state
  const [isPitchSelectorOpen, setIsPitchSelectorOpen] = useState(false);
  const [isCreateDrillModalOpen, setIsCreateDrillModalOpen] = useState(false);
  const [isCreateSessionModalOpen, setIsCreateSessionModalOpen] = useState(false);
  const [isCreateOtherModalOpen, setIsCreateOtherModalOpen] = useState(false);
  const [viewingDetailItem, setViewingDetailItem] = useState<DrillDesign | null>(null);

  // Active pitch selection when entering canvas editor
  const [selectedPitchType, setSelectedPitchType] = useState<PitchType>('Midfield');
  const [selectedPitchTheme, setSelectedPitchTheme] = useState<PitchTheme>('Grass');

  // Other Content Form State (Video 1: 创建其他)
  const [otherTitle, setOtherTitle] = useState('');
  const [otherContent, setOtherContent] = useState('');

  // 1. Pitch Selector (Video 2) -> Diagram Canvas Editor (Video 5)
  const handleSelectPitchAndStartDrawing = (pitchType: PitchType, pitchTheme: PitchTheme) => {
    setSelectedPitchType(pitchType);
    setSelectedPitchTheme(pitchTheme);
    setEditingDesign(null); // Fresh new diagram
    setCurrentMode('editor');
  };

  // 2. Save Diagram from Canvas Editor (Video 5)
  const handleSaveCanvasDiagram = (design: DrillDesign) => {
    onSaveDesign(design);
    setCurrentMode('hub');
  };

  // 3. Save Drill Item (Video 3)
  const handleSaveDrillItem = (drill: DrillDesign) => {
    onSaveDesign(drill);
  };

  // 4. Save Session Plan (Video 4)
  const handleSaveSessionPlan = (plan: DrillDesign) => {
    onSaveDesign(plan);
  };

  // 5. Save Other Content (Articles/Notes)
  const handleSaveOtherContent = () => {
    if (!otherTitle.trim()) {
      alert('请输入文章或笔记标题');
      return;
    }
    const otherItem: DrillDesign = {
      id: `other-${Date.now()}`,
      title: otherTitle.trim(),
      description: otherContent.slice(0, 100),
      category: 'Other',
      contentType: 'other',
      pitchType: 'Full',
      pitchTheme: 'Grass',
      elements: [],
      lines: [],
      articleContent: otherContent,
      keyPoints: ['专栏与战术分析笔记'],
      createdAt: new Date().toISOString().split('T')[0],
      authorId: currentUser?.id,
      authorName: currentUser?.name
    };
    onSaveDesign(otherItem);
    setOtherTitle('');
    setOtherContent('');
    setIsCreateOtherModalOpen(false);
  };

  // Common Actions
  const handleEditItem = (item: DrillDesign) => {
    if (item.category === 'session_plan' || item.contentType === 'session_plan') {
      setEditingDesign(item);
      setIsCreateSessionModalOpen(true);
    } else if (item.category === 'drill_item' || item.contentType === 'drill') {
      setEditingDesign(item);
      setIsCreateDrillModalOpen(true);
    } else {
      setSelectedPitchType(item.pitchType || 'Midfield');
      setSelectedPitchTheme(item.pitchTheme || 'Grass');
      setEditingDesign(item);
      setCurrentMode('editor');
    }
  };

  const handleDuplicateItem = (item: DrillDesign) => {
    const duplicated: DrillDesign = {
      ...item,
      id: `dup-${Date.now()}`,
      title: `${item.title} (副本)`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    onSaveDesign(duplicated);
  };

  const handleDeleteItem = (id: string) => {
    if (window.confirm('确定要删除该条教案内容吗？')) {
      onDeleteDesign(id);
      if (viewingDetailItem?.id === id) {
        setViewingDetailItem(null);
      }
    }
  };

  const handleToggleFavorite = (id: string) => {
    const target = activeDesigns.find(d => d.id === id);
    if (target) {
      onSaveDesign({ ...target, isFavorite: !target.isFavorite });
    }
  };

  // When inside canvas editor (Video 5)
  if (currentMode === 'editor') {
    return (
      <div className="h-[calc(100vh-4.5rem)] rounded-3xl overflow-hidden shadow-2xl border border-gray-800">
        <DiagramCanvasEditor
          initialDesign={editingDesign}
          pitchType={selectedPitchType}
          pitchTheme={selectedPitchTheme}
          currentUser={currentUser}
          onSave={handleSaveCanvasDiagram}
          onBack={() => setCurrentMode('hub')}
        />
      </div>
    );
  }

  // Main Content Library Hub (Video 1)
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Content Library Hub */}
      <ContentLibraryHub
        designs={activeDesigns}
        currentUser={currentUser}
        onOpenPitchSelector={() => setIsPitchSelectorOpen(true)}
        onOpenCreateDrillModal={() => {
          setEditingDesign(null);
          setIsCreateDrillModalOpen(true);
        }}
        onOpenCreateSessionModal={() => {
          setEditingDesign(null);
          setIsCreateSessionModalOpen(true);
        }}
        onOpenCreateOtherModal={() => setIsCreateOtherModalOpen(true)}
        onEditItem={handleEditItem}
        onViewDetail={item => setViewingDetailItem(item)}
        onDuplicateItem={handleDuplicateItem}
        onDeleteItem={handleDeleteItem}
        onToggleFavorite={handleToggleFavorite}
      />

      {/* Modal 1: Pitch Selector (Video 2) */}
      <PitchSelectorModal
        isOpen={isPitchSelectorOpen}
        onClose={() => setIsPitchSelectorOpen(false)}
        onSelect={handleSelectPitchAndStartDrawing}
      />

      {/* Modal 2: Create Drill Item (Video 3) */}
      <CreateDrillItemModal
        isOpen={isCreateDrillModalOpen}
        onClose={() => {
          setIsCreateDrillModalOpen(false);
          setEditingDesign(null);
        }}
        onSave={handleSaveDrillItem}
        currentUser={currentUser}
        existingDiagrams={activeDesigns.filter(d => d.category === 'diagram' || d.contentType === 'diagram' || (d.elements && d.elements.length > 0))}
        onOpenPitchSelector={() => {
          setIsCreateDrillModalOpen(false);
          setIsPitchSelectorOpen(true);
        }}
        initialDrill={editingDesign}
      />

      {/* Modal 3: Create Session Plan (Video 4) */}
      <CreateSessionPlanModal
        isOpen={isCreateSessionModalOpen}
        onClose={() => {
          setIsCreateSessionModalOpen(false);
          setEditingDesign(null);
        }}
        onSave={handleSaveSessionPlan}
        currentUser={currentUser}
        availableDrills={activeDesigns.filter(d => d.category !== 'session_plan' && d.contentType !== 'session_plan')}
        onOpenCreateDrillModal={() => {
          setIsCreateDrillModalOpen(true);
        }}
        initialPlan={editingDesign}
      />

      {/* Modal 4: Full Detail & Print Modal */}
      <SessionDetailViewModal
        item={viewingDetailItem}
        allDesigns={activeDesigns}
        onClose={() => setViewingDetailItem(null)}
        onEdit={item => {
          setViewingDetailItem(null);
          handleEditItem(item);
        }}
      />

      {/* Modal 5: Create Other Content (Articles/Theory) */}
      {isCreateOtherModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-gray-100 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-black text-gray-900">创建专栏文章与理论笔记</h3>
              </div>
              <button
                onClick={() => setIsCreateOtherModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-700 mb-1">文章标题</label>
              <input
                type="text"
                value={otherTitle}
                onChange={e => setOtherTitle(e.target.value)}
                placeholder="例如: 德国足协青少年阶段传控与空间压迫战术理论..."
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-bvb-black"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-gray-700 mb-1">文章内容</label>
              <textarea
                value={otherContent}
                onChange={e => setOtherContent(e.target.value)}
                rows={8}
                placeholder="在此编写详细的技战术分析、比赛复盘总结或青训教案理论..."
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-bvb-black resize-none leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setIsCreateOtherModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl"
              >
                取消
              </button>
              <button
                onClick={handleSaveOtherContent}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>保存并发布</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionDesigner;
