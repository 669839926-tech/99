import React, { useState, useRef } from 'react';
import { PitchType, PitchTheme, DrillDesign, User } from '../../types';
import { PITCH_THEMES, PITCH_LAYOUTS } from './constants';
import { PitchSvgRenderer } from './PitchSvgRenderer';
import { X, Layers, Box, Check, Compass, Sparkles, Upload } from 'lucide-react';

interface PitchSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (pitchType: PitchType, pitchTheme: PitchTheme, is3D: boolean) => void;
  onUploadImageDiagram?: (diagram: DrillDesign) => void;
  currentUser?: User | null;
}

export const PitchSelectorModal: React.FC<PitchSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  onUploadImageDiagram,
  currentUser
}) => {
  const [selectedTheme, setSelectedTheme] = useState<PitchTheme>('White'); // Default to clean white/black high-contrast classic style or switchable to Grass
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for naming uploaded diagram
  const [pendingUpload, setPendingUpload] = useState<{
    base64: string;
    fileName: string;
    title: string;
    description: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('请选择有效的图片文件 (PNG, JPG, JPEG, WEBP, SVG 等)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      if (base64) {
        const cleanFileName = file.name.replace(/\.[^/.]+$/, '');
        setPendingUpload({
          base64,
          fileName: file.name,
          title: cleanFileName || '本地导入示意图',
          description: `从本地设备上传的战术示意图 (${file.name})`
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleConfirmUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUpload) return;
    if (!pendingUpload.title.trim()) {
      alert('请输入示意图名称');
      return;
    }

    const isDirector = currentUser?.role === 'director' || !currentUser?.role;
    const newUploadedDiagram: DrillDesign = {
      id: `uploaded-diagram-${Date.now()}`,
      title: pendingUpload.title.trim(),
      description: pendingUpload.description.trim(),
      category: 'diagram',
      contentType: 'diagram',
      pitchType: 'Full',
      pitchTheme: 'Grass',
      elements: [],
      lines: [],
      previewImage: pendingUpload.base64,
      diagramImage: pendingUpload.base64,
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

    if (onUploadImageDiagram) {
      onUploadImageDiagram(newUploadedDiagram);
    }
    setPendingUpload(null);
    onClose();
  };

  const filteredLayouts = PITCH_LAYOUTS.filter(layout => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'standard') return layout.category === 'standard' || layout.category === 'half';
    if (selectedCategory === 'box') return layout.category === 'box' || layout.category === 'special';
    if (selectedCategory === 'tactical') return layout.category === 'tactical';
    return layout.category === selectedCategory;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl border border-gray-200 flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 via-white to-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-bvb-black flex items-center justify-center text-bvb-yellow shadow-md">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                <span>选择场地</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  共 26 种专业场地与战术分区
                </span>
              </h2>
              <p className="text-xs text-gray-500 font-medium">选择合适的球场类型与主题配色，开启专业战术教案绘制</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Controls: 2D/3D Mode & Color Themes */}
        <div className="px-5 sm:px-6 py-3.5 bg-gray-50/90 border-b border-gray-200 space-y-3.5">
          {/* Mode Switcher */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <button
              onClick={() => setViewMode('2d')}
              className={`flex-1 sm:flex-none sm:w-64 px-5 py-2.5 rounded-2xl border-2 flex items-center justify-center gap-2.5 transition-all font-black text-sm shadow-xs ${
                viewMode === '2d'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Layers className={`w-5 h-5 ${viewMode === '2d' ? 'text-emerald-600' : 'text-gray-400'}`} />
              <div className="text-left">
                <div className="text-sm font-black">平面示意图</div>
                <div className="text-[10px] text-gray-500 font-normal">支持动画/战术推演/多图层</div>
              </div>
              {viewMode === '2d' && <Check className="w-4 h-4 ml-auto text-emerald-600" />}
            </button>

            <button
              onClick={() => setViewMode('3d')}
              className={`flex-1 sm:flex-none sm:w-64 px-5 py-2.5 rounded-2xl border-2 flex items-center justify-center gap-2.5 transition-all font-black text-sm shadow-xs ${
                viewMode === '3d'
                  ? 'border-bvb-black bg-yellow-50 text-bvb-black ring-2 ring-yellow-400/30'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Box className={`w-5 h-5 ${viewMode === '3d' ? 'text-bvb-black' : 'text-gray-400'}`} />
              <div className="text-left">
                <div className="text-sm font-black">立体示意图</div>
                <div className="text-[10px] text-gray-500 font-normal">多视角球员动作细节</div>
              </div>
              {viewMode === '3d' && <Check className="w-4 h-4 ml-auto text-bvb-black" />}
            </button>
          </div>

          {/* Theme Color Bar */}
          <div className="pt-2 border-t border-gray-200">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
              {PITCH_THEMES.map(theme => {
                const isSelected = selectedTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme.id)}
                    className="flex flex-col items-start gap-1 group text-left transition-transform hover:-translate-y-0.5"
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-gray-700 group-hover:text-gray-900">
                        {theme.name}
                      </span>
                      {theme.isVip && (
                        <span className="inline-flex items-center justify-center px-1 py-0.2 rounded text-[9px] font-black italic bg-amber-500 text-white leading-none">
                          VIP
                        </span>
                      )}
                    </div>
                    <div
                      className={`relative w-full h-10 sm:h-11 rounded-lg overflow-hidden border transition-all ${
                        isSelected
                          ? 'border-emerald-600 ring-2 ring-emerald-500/30 shadow-sm'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      style={{
                        background:
                          theme.id === 'Grass'
                            ? 'repeating-linear-gradient(90deg, #72a35c, #72a35c 9px, #86b86f 9px, #86b86f 18px)'
                            : theme.previewBg,
                        borderColor: theme.id === 'Black' ? '#1f2937' : undefined
                      }}
                    >
                      {isSelected && (
                        <div className="absolute bottom-0 right-0 w-0 h-0 border-solid border-t-transparent border-l-transparent border-r-[#ea580c] border-b-[#ea580c] border-t-[10px] border-l-[10px] border-r-[10px] border-b-[10px] flex items-end justify-end">
                          <Check className="w-2.5 h-2.5 text-white absolute -right-2 -bottom-2" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Tabs & Upload Local Image Action */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: 'all', label: '全部场地 (26)' },
                { id: 'standard', label: '基础与攻防' },
                { id: 'box', label: '空白与几何' },
                { id: 'tactical', label: '战术分区' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? 'bg-bvb-black text-bvb-yellow shadow-sm'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Upload Button */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all hover:shadow-md cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>上传本地图片示意图</span>
              </button>
            </div>
          </div>
        </div>

        {/* Layout Grid (Images 1 - 4) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar bg-gray-50/40">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 sm:gap-4">
            {filteredLayouts.map(layout => {
              const currentThemeConfig = PITCH_THEMES.find(t => t.id === selectedTheme) || PITCH_THEMES[0];
              return (
                <div
                  key={layout.id}
                  onClick={() => {
                    onSelect(layout.id, selectedTheme, viewMode === '3d');
                    onClose();
                  }}
                  className="group relative bg-white rounded-xl sm:rounded-2xl border border-gray-200 hover:border-emerald-500 overflow-hidden flex flex-col items-stretch cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                >
                  {/* SVG Pitch Canvas Card Preview with Themed Dot Matrix */}
                  <div
                    className="w-full aspect-[16/10] flex items-center justify-center p-2.5 sm:p-3.5 transition-colors"
                    style={{
                      backgroundColor: currentThemeConfig.containerBg,
                      backgroundImage: `radial-gradient(${currentThemeConfig.dotColor} 1.2px, transparent 1.2px)`,
                      backgroundSize: '10px 10px'
                    }}
                  >
                    <div className="w-full h-full flex items-center justify-center max-w-[200px] max-h-[120px]">
                      <PitchSvgRenderer
                        pitchType={layout.id}
                        pitchTheme={selectedTheme}
                        className="w-full h-full object-contain filter drop-shadow-xs"
                      />
                    </div>
                  </div>

                  {/* Card Bottom Divider & Title */}
                  <div className="py-2.5 px-2 bg-white border-t border-gray-100 flex items-center justify-center gap-1.5">
                    <span className="text-xs sm:text-[13px] font-bold text-gray-800 group-hover:text-emerald-700 transition-colors truncate">
                      {layout.name}
                    </span>
                    {layout.isVip && (
                      <span className="inline-flex items-center justify-center px-1.5 py-0.2 rounded text-[10px] font-black italic tracking-tighter bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs leading-tight">
                        VIP
                      </span>
                    )}
                  </div>

                  {/* Hover indicator overlay */}
                  <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-emerald-600/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity flex items-center justify-center">
                    <span className="bg-emerald-700 text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow-lg scale-90 group-hover:scale-100 transition-transform">
                      选择使用
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <span className="font-medium">当前展示 {filteredLayouts.length} / 26 种球场模式</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-colors"
          >
            取消
          </button>
        </div>
      </div>

      {/* Upload Naming Modal Step */}
      {pendingUpload && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150 flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 via-white to-gray-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">导入示意图命名</h3>
                  <p className="text-[10px] text-gray-500">{pendingUpload.fileName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingUpload(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmUpload} className="p-6 space-y-4">
              {/* Image Preview */}
              <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-950 aspect-[16/10] flex items-center justify-center shadow-inner">
                <img
                  src={pendingUpload.base64}
                  alt={pendingUpload.title}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-800 mb-1.5">
                  示意图名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={pendingUpload.title}
                  onChange={(e) => setPendingUpload({ ...pendingUpload, title: e.target.value })}
                  placeholder="请输入示意图名称..."
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm font-bold text-gray-900 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-800 mb-1.5">
                  备注说明 (选填)
                </label>
                <textarea
                  value={pendingUpload.description}
                  onChange={(e) => setPendingUpload({ ...pendingUpload, description: e.target.value })}
                  placeholder="可填写该示意图的战术要点或使用说明..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs text-gray-700 outline-none transition-all resize-none"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPendingUpload(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-black transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>保存并导入内容库</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
