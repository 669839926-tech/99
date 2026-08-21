import React, { useState } from 'react';
import { PitchType, PitchTheme } from '../../types';
import { PITCH_THEMES, PITCH_LAYOUTS } from './constants';
import { PitchSvgRenderer } from './PitchSvgRenderer';
import { X, Layers, Box, Check, Compass } from 'lucide-react';

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
  const [selectedTheme, setSelectedTheme] = useState<PitchTheme>('Grass');
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (!isOpen) return null;

  const filteredLayouts = PITCH_LAYOUTS.filter(layout => {
    if (selectedCategory === 'all') return true;
    return layout.category === selectedCategory;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 via-white to-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-bvb-black flex items-center justify-center text-bvb-yellow shadow-md">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                <span>选择场地</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  支持多模式与动画
                </span>
              </h2>
              <p className="text-xs text-gray-500 font-medium">选择合适的球场类型与主题，开启战术示意图与动画绘制</p>
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
        <div className="px-6 py-4 bg-gray-50/80 border-b border-gray-200 space-y-4">
          {/* Mode Switcher */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <button
              onClick={() => setViewMode('2d')}
              className={`flex-1 sm:flex-none sm:w-64 px-5 py-3 rounded-2xl border-2 flex items-center justify-center gap-2.5 transition-all font-black text-sm shadow-sm ${
                viewMode === '2d'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Layers className={`w-5 h-5 ${viewMode === '2d' ? 'text-emerald-600' : 'text-gray-400'}`} />
              <div className="text-left">
                <div className="text-sm font-black">平面示意图</div>
                <div className="text-[10px] text-gray-500 font-normal">支持动画/3D/演示模式</div>
              </div>
              {viewMode === '2d' && <Check className="w-4 h-4 ml-auto text-emerald-600" />}
            </button>

            <button
              onClick={() => setViewMode('3d')}
              className={`flex-1 sm:flex-none sm:w-64 px-5 py-3 rounded-2xl border-2 flex items-center justify-center gap-2.5 transition-all font-black text-sm shadow-sm ${
                viewMode === '3d'
                  ? 'border-bvb-black bg-yellow-50 text-bvb-black ring-2 ring-yellow-400/30'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Box className={`w-5 h-5 ${viewMode === '3d' ? 'text-bvb-black' : 'text-gray-400'}`} />
              <div className="text-left">
                <div className="text-sm font-black">立体示意图</div>
                <div className="text-[10px] text-gray-500 font-normal">球员动作细节一目了然</div>
              </div>
              {viewMode === '3d' && <Check className="w-4 h-4 ml-auto text-bvb-black" />}
            </button>
          </div>

          {/* Theme Color Bar & Category Tabs */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-gray-200">
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {[
                { id: 'all', label: '全部布局' },
                { id: 'full', label: '全场区域' },
                { id: 'half', label: '半场攻防' },
                { id: 'box', label: '禁区对抗' },
                { id: 'local', label: '局部网格' },
                { id: 'special', label: '特殊场地' }
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

            <div className="flex items-center gap-2 flex-wrap">
              {PITCH_THEMES.map(theme => {
                const isSelected = selectedTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-black transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-white shadow-md ring-2 ring-emerald-500/20 text-gray-900 scale-105'
                        : 'border-gray-200 bg-white/70 hover:bg-white text-gray-600'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-md border border-black/10 shadow-inner inline-block"
                      style={{ backgroundColor: theme.previewBg }}
                    />
                    <span>{theme.name}</span>
                    {isSelected && <Check className="w-3 h-3 text-emerald-600" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Layout Grid */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
            {filteredLayouts.map(layout => {
              return (
                <div
                  key={layout.id}
                  onClick={() => {
                    onSelect(layout.id, selectedTheme, viewMode === '3d');
                    onClose();
                  }}
                  className="group relative bg-white rounded-2xl border-2 border-gray-200 hover:border-emerald-500 p-2.5 flex flex-col items-center justify-between cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
                >
                  {/* SVG Pitch Canvas Card */}
                  <div className="w-full aspect-[16/10] rounded-xl overflow-hidden shadow-inner border border-black/5 bg-gray-50 flex items-center justify-center p-1 group-hover:opacity-95 transition-opacity">
                    <PitchSvgRenderer
                      pitchType={layout.id}
                      pitchTheme={selectedTheme}
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </div>

                  {/* Title & Info */}
                  <div className="mt-2 text-center w-full">
                    <span className="text-xs font-black text-gray-800 group-hover:text-emerald-700 transition-colors line-clamp-1">
                      {layout.name}
                    </span>
                  </div>

                  {/* Hover indicator */}
                  <div className="absolute inset-0 rounded-2xl bg-emerald-600/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity flex items-center justify-center">
                    <span className="bg-emerald-700 text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow-lg scale-90 group-hover:scale-100 transition-transform">
                      点击进入绘制
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <span>共 {filteredLayouts.length} 种场地及区域布局可选</span>
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
