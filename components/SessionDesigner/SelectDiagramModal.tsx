import React, { useState, useMemo } from 'react';
import { DrillDesign } from '../../types';
import { X, Search, Check, Image as ImageIcon, Plus, Sparkles } from 'lucide-react';
import { DiagramPreviewBox } from './DiagramPreviewBox';
import { PitchSvgRenderer } from './PitchSvgRenderer';

interface SelectDiagramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (diagram: DrillDesign) => void;
  existingDiagrams: DrillDesign[];
  selectedDiagramId?: string | null;
  onOpenPitchSelector?: () => void;
}

// System Built-in Official Tactical Resources (官方资源)
const OFFICIAL_DIAGRAM_TEMPLATES: DrillDesign[] = [
  {
    id: 'official-1',
    title: '技能: 1v1+1 (追防防守人) 运球变向加速突破训练',
    description: '通过局部快速变向与重心晃动突破正面及追防防守队员，训练球员带球变向与爆发力',
    category: 'diagram',
    contentType: 'diagram',
    pitchType: 'Midfield',
    pitchTheme: 'Grass',
    elements: [
      { id: 'p1', type: 'PlayerCircle', x: 20, y: 50, rotation: 0, color: '#e11d48', label: '10' },
      { id: 'p2', type: 'Defender', x: 50, y: 50, rotation: 180, color: '#2563eb', label: '4' },
      { id: 'p3', type: 'Defender', x: 25, y: 65, rotation: 0, color: '#2563eb', label: '5' },
      { id: 'p4', type: 'PlayerNeutral', x: 80, y: 50, rotation: 0, color: '#f59e0b', label: 'N' },
      { id: 'b1', type: 'Ball', x: 22, y: 52, rotation: 0 },
      { id: 'c1', type: 'Cone', x: 35, y: 35, rotation: 0, color: '#f59e0b' },
      { id: 'c2', type: 'Cone', x: 35, y: 65, rotation: 0, color: '#f59e0b' },
      { id: 'c3', type: 'Cone', x: 65, y: 35, rotation: 0, color: '#f59e0b' },
      { id: 'c4', type: 'Cone', x: 65, y: 65, rotation: 0, color: '#f59e0b' },
      { id: 'g1', type: 'MiniGoal', x: 92, y: 50, rotation: 180 }
    ],
    lines: [
      { id: 'l1', type: 'Dribble', startX: 23, startY: 50, endX: 45, endY: 42, color: '#e11d48' },
      { id: 'l2', type: 'Run', startX: 45, startY: 42, endX: 75, endY: 35, color: '#e11d48' },
      { id: 'l3', type: 'Pass', startX: 75, startY: 35, endX: 92, endY: 50, color: '#fbbf24' }
    ],
    playerCount: 4,
    ballCount: 4,
    coneCount: 8,
    fieldLength: 20,
    fieldWidth: 15,
    createdAt: '2025-04-03T10:02:38.000Z',
    updatedAt: '2025-04-03T10:02:38.000Z',
    keyPoints: ['变向假动作幅度要大', '出球果断', '防守人追防施压']
  },
  {
    id: 'official-2',
    title: '战术: 4v4+3 区域控球与第三人前插渗透',
    description: '中场狭小空间内的网格化控球与接应，培养中场球员抬头观察与弱侧空当发现能力',
    category: 'diagram',
    contentType: 'diagram',
    pitchType: 'Midfield',
    pitchTheme: 'Grass',
    elements: [
      { id: 'op1', type: 'PlayerCircle', x: 25, y: 30, rotation: 0, color: '#e11d48', label: '7' },
      { id: 'op2', type: 'PlayerCircle', x: 25, y: 70, rotation: 0, color: '#e11d48', label: '11' },
      { id: 'op3', type: 'PlayerCircle', x: 75, y: 30, rotation: 0, color: '#e11d48', label: '8' },
      { id: 'op4', type: 'PlayerCircle', x: 75, y: 70, rotation: 0, color: '#e11d48', label: '9' },
      { id: 'od1', type: 'Defender', x: 45, y: 40, rotation: 0, color: '#2563eb', label: '3' },
      { id: 'od2', type: 'Defender', x: 55, y: 40, rotation: 0, color: '#2563eb', label: '4' },
      { id: 'od3', type: 'Defender', x: 45, y: 60, rotation: 0, color: '#2563eb', label: '5' },
      { id: 'od4', type: 'Defender', x: 55, y: 60, rotation: 0, color: '#2563eb', label: '6' },
      { id: 'on1', type: 'PlayerNeutral', x: 50, y: 20, rotation: 0, color: '#f59e0b', label: 'N1' },
      { id: 'on2', type: 'PlayerNeutral', x: 50, y: 80, rotation: 0, color: '#f59e0b', label: 'N2' },
      { id: 'on3', type: 'PlayerNeutral', x: 50, y: 50, rotation: 0, color: '#f59e0b', label: 'N3' },
      { id: 'ob1', type: 'Ball', x: 27, y: 32, rotation: 0 }
    ],
    lines: [
      { id: 'ol1', type: 'Pass', startX: 27, startY: 32, endX: 48, endY: 48, color: '#fbbf24' },
      { id: 'ol2', type: 'Pass', startX: 52, startY: 52, endX: 73, endY: 68, color: '#fbbf24' }
    ],
    playerCount: 11,
    ballCount: 6,
    coneCount: 12,
    fieldLength: 30,
    fieldWidth: 25,
    createdAt: '2025-04-02T16:30:00.000Z',
    updatedAt: '2025-04-02T16:30:00.000Z',
    keyPoints: ['三角形支撑接应', '一脚或两脚快速转移', '压迫防守阵型展开']
  },
  {
    id: 'official-3',
    title: '进攻: 边路2过1套边下底传中与包抄射门',
    description: '边后卫与边锋配合套边突破下底，中路前锋与后插上中场包抄前后点攻门',
    category: 'diagram',
    contentType: 'diagram',
    pitchType: 'AttackingThird',
    pitchTheme: 'Grass',
    elements: [
      { id: 'wp1', type: 'PlayerCircle', x: 20, y: 80, rotation: 0, color: '#e11d48', label: '2' },
      { id: 'wp2', type: 'PlayerCircle', x: 45, y: 75, rotation: 0, color: '#e11d48', label: '7' },
      { id: 'wp3', type: 'PlayerCircle', x: 60, y: 40, rotation: 0, color: '#e11d48', label: '9' },
      { id: 'wp4', type: 'PlayerCircle', x: 45, y: 30, rotation: 0, color: '#e11d48', label: '10' },
      { id: 'wd1', type: 'Defender', x: 55, y: 75, rotation: 180, color: '#2563eb', label: '3' },
      { id: 'wd2', type: 'Defender', x: 75, y: 45, rotation: 180, color: '#2563eb', label: '4' },
      { id: 'wgk', type: 'GK', x: 92, y: 50, rotation: 180, color: '#10b981', label: 'GK' },
      { id: 'wg1', type: 'Goal', x: 97, y: 50, rotation: 180 },
      { id: 'wb1', type: 'Ball', x: 22, y: 80, rotation: 0 }
    ],
    lines: [
      { id: 'wl1', type: 'Pass', startX: 24, startY: 80, endX: 43, endY: 76, color: '#fbbf24' },
      { id: 'wl2', type: 'Run', startX: 20, startY: 82, endX: 75, endY: 88, color: '#e11d48' },
      { id: 'wl3', type: 'Pass', startX: 47, startY: 75, endX: 74, endY: 86, color: '#fbbf24' },
      { id: 'wl4', type: 'CurvePass', startX: 78, startY: 88, endX: 85, endY: 45, color: '#fbbf24' }
    ],
    playerCount: 7,
    ballCount: 8,
    coneCount: 6,
    fieldLength: 35,
    fieldWidth: 30,
    createdAt: '2025-04-01T09:15:20.000Z',
    updatedAt: '2025-04-01T09:15:20.000Z',
    keyPoints: ['套边时机与加速跑位', '传中落点避开门将控制范围', '中路抢点双层包抄']
  }
];

// Helper to format ISO or timestamp to YYYY.MM.DD HH:mm:ss
function formatDateTime(dateStr?: string): string {
  if (!dateStr) {
    const now = new Date();
    return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  }
  
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      // If it's already a simple date string like '2025-04-03'
      return dateStr.replace(/-/g, '.') + ' 10:00:00';
    }
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd} ${hh}:${min}:${ss}`;
  } catch {
    return dateStr;
  }
}

export const SelectDiagramModal: React.FC<SelectDiagramModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  existingDiagrams,
  selectedDiagramId,
  onOpenPitchSelector
}) => {
  const [activeTab, setActiveTab] = useState<'my' | 'official'>('my');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentSelectedId, setCurrentSelectedId] = useState<string | null>(selectedDiagramId || null);

  // Sync with prop when opened
  React.useEffect(() => {
    if (isOpen) {
      setCurrentSelectedId(selectedDiagramId || null);
    }
  }, [isOpen, selectedDiagramId]);

  // Sort: NEWEST CREATED / UPDATED FIRST
  const mySortedDiagrams = useMemo(() => {
    const list = [...existingDiagrams];
    return list.sort((a, b) => {
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [existingDiagrams]);

  const officialSortedDiagrams = useMemo(() => {
    const list = [...OFFICIAL_DIAGRAM_TEMPLATES];
    return list.sort((a, b) => {
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, []);

  const activeSourceList = activeTab === 'my' ? mySortedDiagrams : officialSortedDiagrams;

  // Filter based on search query
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return activeSourceList;
    const q = searchQuery.toLowerCase().trim();
    return activeSourceList.filter(item => {
      return (
        item.title?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.topic?.toLowerCase().includes(q) ||
        item.pitchType?.toLowerCase().includes(q)
      );
    });
  }, [activeSourceList, searchQuery]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!currentSelectedId) return;
    const found = [...existingDiagrams, ...OFFICIAL_DIAGRAM_TEMPLATES].find(d => d.id === currentSelectedId);
    if (found) {
      onSelect(found);
      onClose();
    }
  };

  const handleItemDoubleClick = (item: DrillDesign) => {
    setCurrentSelectedId(item.id);
    onSelect(item);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden max-h-[88vh] animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
          <h2 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
            <span>选择示意图</span>
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation (我的内容 / 官方资源) */}
        <div className="flex items-center justify-center border-b border-gray-100 dark:border-gray-800 shrink-0 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-8 px-6">
            <button
              onClick={() => setActiveTab('my')}
              className={`py-3 px-2 text-sm font-black transition-all relative ${
                activeTab === 'my'
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <span>我的内容</span>
              {activeTab === 'my' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('official')}
              className={`py-3 px-2 text-sm font-black transition-all relative flex items-center gap-1.5 ${
                activeTab === 'official'
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>官方资源</span>
              {activeTab === 'official' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* Search Bar & Quick Creation Strip */}
        <div className="p-4 px-6 border-b border-gray-100 dark:border-gray-800/80 bg-white dark:bg-gray-900 shrink-0">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="输入搜索关键词"
              className="w-full pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <Search className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Diagram List Area (Sorted by Newest First) */}
        <div className="flex-1 overflow-y-auto p-4 px-6 space-y-2.5 custom-scrollbar bg-gray-50/30 dark:bg-gray-950/40">
          {filteredList.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center mb-3">
                <ImageIcon className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-1">
                {searchQuery ? '未找到匹配的战术示意图' : '暂无可用的示意图'}
              </p>
              <p className="text-xs text-gray-400 mb-4 max-w-xs">
                您可以直接在画板中快速绘制全新的战术示意图并关联到此训练项。
              </p>
              {onOpenPitchSelector && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPitchSelector();
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>立即新建示意图</span>
                </button>
              )}
            </div>
          ) : (
            filteredList.map(diagram => {
              const isSelected = currentSelectedId === diagram.id;
              const formattedTime = formatDateTime(diagram.updatedAt || diagram.createdAt);

              return (
                <div
                  key={diagram.id}
                  onClick={() => setCurrentSelectedId(diagram.id)}
                  onDoubleClick={() => handleItemDoubleClick(diagram)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 select-none ${
                    isSelected
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                      : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm'
                  }`}
                >
                  {/* Left Thumbnail (120px x 72px) */}
                  <div className="w-28 sm:w-32 h-20 rounded-xl overflow-hidden bg-gray-950 border border-gray-800/80 shrink-0 relative flex items-center justify-center shadow-inner">
                    {diagram.previewImage ? (
                      <img
                        src={diagram.previewImage}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : diagram.elements && diagram.elements.length > 0 ? (
                      <DiagramPreviewBox
                        diagram={diagram}
                        pitchType={diagram.pitchType || 'Midfield'}
                        pitchTheme={diagram.pitchTheme || 'Grass'}
                        elements={diagram.elements}
                        lines={diagram.lines}
                        size="auto"
                        showGrid={false}
                        className="w-full h-full scale-90"
                      />
                    ) : (
                      <PitchSvgRenderer
                        pitchType={diagram.pitchType || 'Midfield'}
                        pitchTheme={diagram.pitchTheme || 'Grass'}
                        className="w-full h-full"
                      />
                    )}

                    {/* Pitch type tag overlay */}
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[9px] font-bold text-gray-300 border border-white/10">
                      {diagram.pitchType || '标准场地'}
                    </div>
                  </div>

                  {/* Right Information Block */}
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-xs sm:text-sm font-black text-gray-900 dark:text-gray-100 truncate">
                        {diagram.title}
                      </h4>
                      {diagram.isPrivate && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded font-bold shrink-0">
                          私有
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-1.5">
                      <span>更新时间:{formattedTime}</span>
                    </div>

                    {/* Quick Specs info */}
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                      {diagram.playerCount && diagram.playerCount > 0 && (
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-emerald-600 dark:text-emerald-400">
                          {diagram.playerCount}人
                        </span>
                      )}
                      {diagram.fieldLength && (
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-amber-600 dark:text-amber-400">
                          {diagram.fieldLength}×{diagram.fieldWidth || 15}米
                        </span>
                      )}
                      {diagram.topic && (
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-blue-500">
                          {diagram.topic}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Selection Indicator Checkbox */}
                  <div className="shrink-0 pr-1">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                        isSelected
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow'
                          : 'border-gray-300 dark:border-gray-700 bg-transparent'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Footer Actions */}
        <div className="p-4 px-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/90 flex items-center justify-between shrink-0">
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <span>已按最新创建时间排列</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              disabled={!currentSelectedId}
              onClick={handleConfirm}
              className={`px-6 py-2 rounded-xl text-xs font-black transition-all shadow-md ${
                currentSelectedId
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
              }`}
            >
              确定
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
