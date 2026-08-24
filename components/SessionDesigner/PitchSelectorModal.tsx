import React, { useState } from 'react';
import { PitchType, PitchTheme } from '../../types';
import { PITCH_THEMES, PITCH_LAYOUTS } from './constants';
import { PitchSvgRenderer } from './PitchSvgRenderer';
import { X, Layers, Box, Check, Compass, Sparkles } from 'lucide-react';

interface PitchSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (pitchType: PitchType, pitchTheme: PitchTheme, is3D: boolean) => void;
}

export const PitchSelectorModal: React.FC<PitchSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelect
}) => {
  const [selectedTheme, setSelectedTheme] = useState<PitchTheme>('White'); // Default to clean white/black high-contrast classic style or switchable to Grass
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (!isOpen) return null;

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

          {/* Theme Color Bar & Category Tabs */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-gray-200">
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              {[
                { id: 'all', label: '全部场地 (26)' },
                { id: 'standard', label: '基础与攻防' },
                { id: 'box', label: '空白与几何' },
                { id: 'tactical', label: '战术分区' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-black transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-bvb-black text-bvb-yellow shadow-sm'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-gray-400 mr-1">主题配色:</span>
              {PITCH_THEMES.map(theme => {
                const isSelected = selectedTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-black transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-white shadow-sm ring-2 ring-emerald-500/20 text-gray-900 scale-105'
                        : 'border-gray-200 bg-white/80 hover:bg-white text-gray-600'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-md border border-black/15 shadow-inner inline-block"
                      style={{ backgroundColor: theme.previewBg }}
                    />
                    <span>{theme.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Layout Grid (Images 1 - 4) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar bg-gray-50/40">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 sm:gap-4">
            {filteredLayouts.map(layout => {
              return (
                <div
                  key={layout.id}
                  onClick={() => {
                    onSelect(layout.id, selectedTheme, viewMode === '3d');
                    onClose();
                  }}
                  className="group relative bg-white rounded-xl sm:rounded-2xl border border-gray-200 hover:border-emerald-500 overflow-hidden flex flex-col items-stretch cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                >
                  {/* SVG Pitch Canvas Card Preview */}
                  <div className="w-full aspect-[16/10] bg-[#fafafa] flex items-center justify-center p-2.5 sm:p-3.5 group-hover:bg-emerald-50/30 transition-colors">
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
    </div>
  );
};
