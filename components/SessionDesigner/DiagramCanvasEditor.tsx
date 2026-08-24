import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DrillDesign, DesignElement, DesignLine, PitchType, PitchTheme, ElementType, LineType, User, DiagramKeyframe } from '../../types';
import { PRESET_COLORS } from './constants';
import { PitchSvgRenderer } from './PitchSvgRenderer';
import {
  Undo, Redo, RotateCcw, RotateCw, Copy, Trash2, Grid, ZoomOut,
  ArrowUp, ArrowDown, Type, Save, Download, Eye, EyeOff,
  Plus, Minus, Play, Pause, Repeat, ChevronLeft,
  MousePointer2, Square, Circle, Triangle, Send, Check, CheckSquare,
  Maximize2
} from 'lucide-react';
import html2canvas from 'html2canvas';

// 7 Preset colors matching Image 2
const IMAGE_PRESET_COLORS = [
  { id: '#3b82f6', bg: '#3b82f6', border: false },
  { id: '#22c55e', bg: '#22c55e', border: false },
  { id: '#eab308', bg: '#eab308', border: false },
  { id: '#ef4444', bg: '#ef4444', border: false },
  { id: '#1e293b', bg: '#1e293b', border: false },
  { id: '#9ca3af', bg: '#9ca3af', border: false },
  { id: '#ffffff', bg: '#ffffff', border: true }
];

interface PersonnelItemDef {
  id: string;
  type: ElementType;
  label: string;
  defaultText?: string;
  name: string;
  isVip?: boolean;
  renderIcon: (color?: string) => React.ReactNode;
}

const PERSONNEL_ITEMS: PersonnelItemDef[] = [
  // Row 1
  {
    id: 'ring-offense-defense',
    type: 'PlayerRing',
    label: '攻/防',
    name: '攻/防 (圆圈)',
    renderIcon: (color = '#eab308') => (
      <svg className="w-8 h-8 transition-colors" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="11" fill="none" stroke={color} strokeWidth="4.2" />
      </svg>
    )
  },
  {
    id: 'cross-offense-defense',
    type: 'PlayerCross',
    label: '攻/防',
    name: '攻/防 (叉号)',
    renderIcon: (color = '#eab308') => (
      <svg className="w-8 h-8 transition-colors" viewBox="0 0 36 36">
        <path d="M10 10 L26 26 M26 10 L10 26" stroke={color} strokeWidth="4.2" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'neutral-free',
    type: 'PlayerNeutral',
    label: '自由人',
    defaultText: 'N',
    name: '自由人 (N)',
    renderIcon: (color = '#eab308') => (
      <span className="text-2xl font-black font-sans tracking-tight" style={{ color }}>N</span>
    )
  },
  // Row 2
  {
    id: 'gk-text',
    type: 'GK',
    label: '门将',
    defaultText: 'GK',
    name: '门将 (GK)',
    renderIcon: (color = '#eab308') => (
      <span className="text-xl font-black font-sans tracking-tight" style={{ color }}>GK</span>
    )
  },
  {
    id: 'player-circle-thin',
    type: 'PlayerCircle',
    label: '球员',
    name: '球员 (圆环)',
    renderIcon: (color = '#eab308') => (
      <svg className="w-8 h-8 transition-colors" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="11" fill="none" stroke={color} strokeWidth="4.2" />
      </svg>
    )
  },
  {
    id: 'player-topview',
    type: 'PlayerTopView',
    label: '球员',
    name: '球员 (俯视头盔/姿态)',
    renderIcon: (color = '#eab308') => (
      <svg className="w-8 h-8 transition-colors" viewBox="0 0 36 36">
        <circle cx="18" cy="17" r="6" fill="none" stroke={color} strokeWidth="3.5" />
        <path d="M9 25 C9 11, 27 11, 27 25" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
      </svg>
    )
  },
  // Row 3
  {
    id: 'player-shoulders',
    type: 'PlayerShoulders',
    label: '球员',
    name: '球员 (双肩/视野)',
    renderIcon: (color = '#eab308') => (
      <svg className="w-10 h-7 transition-colors" viewBox="0 0 44 28">
        <ellipse cx="10" cy="14" rx="7.5" ry="3.8" fill={color} opacity="0.6" />
        <ellipse cx="34" cy="14" rx="7.5" ry="3.8" fill={color} opacity="0.6" />
        <circle cx="22" cy="14" r="8" fill={color} stroke="white" strokeWidth="1" />
      </svg>
    )
  },
  {
    id: 'player-teardrop',
    type: 'PlayerTeardrop',
    label: '球员',
    name: '球员 (水滴标记)',
    renderIcon: (color = '#eab308') => (
      <svg className="w-8 h-8 transition-colors" viewBox="0 0 36 36">
        <path d="M18 6 C12 6, 8 10.5, 8 16.5 C8 23.5, 18 30, 18 30 C18 30, 28 23.5, 28 16.5 C28 10.5, 24 6, 18 6 Z" fill={color} stroke="white" strokeWidth="1" />
        <circle cx="18" cy="15" r="4" fill="white" />
      </svg>
    )
  },
  {
    id: 'player-cross-thin',
    type: 'PlayerCross',
    label: '球员',
    name: '球员 (X)',
    renderIcon: (color = '#eab308') => (
      <svg className="w-8 h-8 transition-colors" viewBox="0 0 36 36">
        <path d="M10 10 L26 26 M26 10 L10 26" stroke={color} strokeWidth="4.2" strokeLinecap="round" />
      </svg>
    )
  },
  // Row 4
  {
    id: 'player-square',
    type: 'PlayerSquare',
    label: '球员',
    name: '球员 (方框)',
    renderIcon: (color = '#eab308') => (
      <svg className="w-8 h-8 transition-colors" viewBox="0 0 36 36">
        <rect x="9" y="9" width="18" height="18" fill="none" stroke={color} strokeWidth="4" rx="1.5" />
      </svg>
    )
  },
  {
    id: 'player-triangle',
    type: 'PlayerTriangle',
    label: '球员',
    name: '球员 (三角框)',
    renderIcon: (color = '#eab308') => (
      <svg className="w-8 h-8 transition-colors" viewBox="0 0 36 36">
        <polygon points="18,7 30,28 6,28" fill="none" stroke={color} strokeWidth="4" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    id: 'player-arch-gk',
    type: 'PlayerArchGK',
    label: '门将',
    name: '门将 (马蹄/拱形)',
    renderIcon: (color = '#eab308') => (
      <svg className="w-8 h-8 transition-colors" viewBox="0 0 36 36">
        <path d="M10 26 L10 17 C10 9, 26 9, 26 17 L26 26" fill="none" stroke={color} strokeWidth="4.2" strokeLinecap="round" />
      </svg>
    )
  },
  // Row 5
  {
    id: 'player-coach',
    type: 'Coach',
    label: '教练',
    name: '教练 (实体三角帽)',
    renderIcon: (color = '#eab308') => (
      <svg className="w-8 h-8 transition-colors" viewBox="0 0 36 36">
        <polygon points="18,7 30,29 6,29" fill={color} stroke="white" strokeWidth="1" />
        <polygon points="18,7 23.5,17 12.5,17" fill="#1e293b" />
      </svg>
    )
  },
  {
    id: 'player-referee',
    type: 'Referee',
    label: '裁判',
    name: '裁判 (圆帽/裁判)',
    renderIcon: (color = '#eab308') => (
      <svg className="w-8 h-8 transition-colors" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="11" fill={color} stroke="white" strokeWidth="1" />
        <path d="M7 18 A11 11 0 0 1 29 18 Z" fill="#1e293b" />
      </svg>
    )
  }
];

interface EquipmentItemDef {
  id: string;
  type: ElementType;
  label: string;
  name: string;
  renderIcon: (color?: string) => React.ReactNode;
}

const FIXED_BLACK_EQUIPMENT_TYPES: ElementType[] = [
  'Ladder', 'Hurdle', 'Mannequin', 'Rebounder',
  'MinimalGoal', 'Goal', 'MiniGoal', 'Ball'
];

const EQUIPMENT_ITEMS: EquipmentItemDef[] = [
  // Row 1 & 2 (Colorable items: AgilityRing, Pole, Cone, Marker)
  {
    id: 'equip-agility-ring',
    type: 'AgilityRing',
    label: '敏捷圈',
    name: '敏捷圈 (椭圆环)',
    renderIcon: (color = '#eab308') => (
      <svg className="w-8 h-8 transition-colors" viewBox="0 0 36 36">
        <ellipse cx="18" cy="18" rx="12" ry="5.2" fill="none" stroke={color} strokeWidth="3" />
      </svg>
    )
  },
  {
    id: 'equip-pole',
    type: 'Pole',
    label: '标志杆',
    name: '标志杆 (立柱带底座)',
    renderIcon: (color = '#eab308') => (
      <svg className="w-8 h-8 transition-colors" viewBox="0 0 36 36">
        <path d="M18 5 L18 24 M13 29 L23 29 L18 24 Z" fill={color} stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    id: 'equip-cone',
    type: 'Cone',
    label: '标志桶',
    name: '标志桶 (实体三角锥)',
    renderIcon: (color = '#eab308') => (
      <svg className="w-8 h-8 transition-colors" viewBox="0 0 36 36">
        <polygon points="18,6 25,28 11,28" fill={color} />
      </svg>
    )
  },
  {
    id: 'equip-marker',
    type: 'Marker',
    label: '标志盘',
    name: '标志盘 (同心圆盘)',
    renderIcon: (color = '#eab308') => (
      <svg className="w-8 h-8 transition-colors" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="10" fill={color} opacity="0.35" />
        <circle cx="18" cy="18" r="6.8" fill={color} />
        <circle cx="18" cy="18" r="2.2" fill="white" />
      </svg>
    )
  },
  // Fixed black items
  {
    id: 'equip-ladder',
    type: 'Ladder',
    label: '敏捷梯',
    name: '敏捷梯 (横向梯子)',
    renderIcon: () => (
      <svg className="w-9 h-7 text-gray-900" viewBox="0 0 40 28">
        <line x1="4" y1="9" x2="36" y2="9" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="4" y1="19" x2="36" y2="19" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="8" y1="9" x2="8" y2="19" stroke="#1f2937" strokeWidth="2" />
        <line x1="13" y1="9" x2="13" y2="19" stroke="#1f2937" strokeWidth="2" />
        <line x1="18" y1="9" x2="18" y2="19" stroke="#1f2937" strokeWidth="2" />
        <line x1="23" y1="9" x2="23" y2="19" stroke="#1f2937" strokeWidth="2" />
        <line x1="28" y1="9" x2="28" y2="19" stroke="#1f2937" strokeWidth="2" />
        <line x1="33" y1="9" x2="33" y2="19" stroke="#1f2937" strokeWidth="2" />
      </svg>
    )
  },
  {
    id: 'equip-hurdle',
    type: 'Hurdle',
    label: '小跨栏',
    name: '小跨栏 (门形支架)',
    renderIcon: () => (
      <svg className="w-8 h-8 text-gray-900" viewBox="0 0 36 36">
        <path d="M7 23 L7 13 L29 13 L29 23" fill="none" stroke="#1f2937" strokeWidth="3" strokeLinecap="square" />
        <path d="M5 23 L9 23 M27 23 L31 23" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
      </svg>
    )
  },
  // Row 3 (Fixed black items)
  {
    id: 'equip-mannequin',
    type: 'Mannequin',
    label: '人型架',
    name: '人型架 (双耳假人墙)',
    renderIcon: () => (
      <svg className="w-9 h-7 text-gray-900" viewBox="0 0 40 28">
        <rect x="15" y="9" width="10" height="10" rx="2.5" fill="#1f2937" />
        <rect x="5" y="11" width="9" height="6" rx="3" fill="none" stroke="#1f2937" strokeWidth="2.5" />
        <rect x="26" y="11" width="9" height="6" rx="3" fill="none" stroke="#1f2937" strokeWidth="2.5" />
      </svg>
    )
  },
  {
    id: 'equip-rebounder',
    type: 'Rebounder',
    label: '回弹板',
    name: '回弹板 (梯形斜挡板)',
    renderIcon: () => (
      <svg className="w-8 h-8 text-gray-900" viewBox="0 0 36 36">
        <polygon points="10,14 26,14 30,22 6,22" fill="#1f2937" />
      </svg>
    )
  },
  {
    id: 'equip-minimal-goal',
    type: 'MinimalGoal',
    label: '极简球门',
    name: '极简球门 (立柱球门线)',
    renderIcon: () => (
      <svg className="w-8 h-8 text-gray-900" viewBox="0 0 36 36">
        <line x1="7" y1="12" x2="7" y2="24" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="7" y1="18" x2="29" y2="18" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" />
        <line x1="29" y1="12" x2="29" y2="24" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    )
  },
  // Row 4 (Fixed black items)
  {
    id: 'equip-goal',
    type: 'Goal',
    label: '标准球门',
    name: '标准球门 (11人制大网门)',
    renderIcon: () => (
      <svg className="w-10 h-7 text-gray-900" viewBox="0 0 48 30">
        <polygon points="4,7 44,7 39,26 9,26" fill="#f1f5f9" fillOpacity="0.4" stroke="#1f2937" strokeWidth="0.8" strokeDasharray="1.5,1.5" />
        <line x1="9" y1="26" x2="39" y2="26" stroke="#1f2937" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="4" y1="7" x2="9" y2="26" stroke="#1f2937" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="44" y1="7" x2="39" y2="26" stroke="#1f2937" strokeWidth="1.5" strokeLinecap="round" />
        {[10, 16, 22, 28, 34, 40].map((topX, idx) => {
          const bX = 9 + idx * 6;
          return <line key={topX} x1={topX} y1="7" x2={bX} y2="26" stroke="#1f2937" strokeWidth="0.6" strokeOpacity="0.6" />;
        })}
        {[12, 17, 22].map(y => {
          const p = (y - 7) / 19;
          return <line key={y} x1={4 + 5 * p} y1={y} x2={44 - 5 * p} y2={y} stroke="#1f2937" strokeWidth="0.6" strokeOpacity="0.6" />;
        })}
        <line x1="4" y1="7" x2="4" y2="12" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" />
        <line x1="4" y1="7" x2="4" y2="12" stroke="#1f2937" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="44" y1="7" x2="44" y2="12" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" />
        <line x1="44" y1="7" x2="44" y2="12" stroke="#1f2937" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="4" y1="7" x2="44" y2="7" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" />
        <line x1="4" y1="7" x2="44" y2="7" stroke="#1f2937" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="4" cy="7" r="1.8" fill="#ffffff" stroke="#1f2937" strokeWidth="0.8" />
        <circle cx="44" cy="7" r="1.8" fill="#ffffff" stroke="#1f2937" strokeWidth="0.8" />
      </svg>
    )
  },
  {
    id: 'equip-mini-goal',
    type: 'MiniGoal',
    label: '小球门',
    name: '小球门 (5人制/训练门)',
    renderIcon: () => (
      <svg className="w-8 h-7 text-gray-900" viewBox="0 0 38 28">
        <polygon points="5,7 33,7 29,24 9,24" fill="#ffffff" fillOpacity="0.2" stroke="#1f2937" strokeWidth="0.8" strokeDasharray="1.5,1.5" />
        <line x1="9" y1="24" x2="29" y2="24" stroke="#1f2937" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="5" y1="7" x2="9" y2="24" stroke="#1f2937" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="33" y1="7" x2="29" y2="24" stroke="#1f2937" strokeWidth="1.4" strokeLinecap="round" />
        {[10, 16, 22, 28].map((topX, idx) => {
          const bX = 9 + idx * 6.6;
          return <line key={topX} x1={topX} y1="7" x2={bX} y2="24" stroke="#1f2937" strokeWidth="0.6" strokeOpacity="0.6" />;
        })}
        {[12, 18].map(y => {
          const p = (y - 7) / 17;
          return <line key={y} x1={5 + 4 * p} y1={y} x2={33 - 4 * p} y2={y} stroke="#1f2937" strokeWidth="0.6" strokeOpacity="0.6" />;
        })}
        <line x1="5" y1="7" x2="5" y2="12" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
        <line x1="5" y1="7" x2="5" y2="12" stroke="#1f2937" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="33" y1="7" x2="33" y2="12" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
        <line x1="33" y1="7" x2="33" y2="12" stroke="#1f2937" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="5" y1="7" x2="33" y2="7" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
        <line x1="5" y1="7" x2="33" y2="7" stroke="#1f2937" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="5" cy="7" r="1.5" fill="#ffffff" stroke="#1f2937" strokeWidth="0.7" />
        <circle cx="33" cy="7" r="1.5" fill="#ffffff" stroke="#1f2937" strokeWidth="0.7" />
      </svg>
    )
  },
  {
    id: 'equip-ball',
    type: 'Ball',
    label: '足球',
    name: '足球',
    renderIcon: () => (
      <svg className="w-7 h-7 text-gray-900" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="11" fill="none" stroke="#1f2937" strokeWidth="2.2" />
        <polygon points="16,11 20,14 18.5,19 13.5,19 12,14" fill="#1f2937" />
        <line x1="16" y1="11" x2="16" y2="5" stroke="#1f2937" strokeWidth="1.8" />
        <line x1="20" y1="14" x2="25.5" y2="11.5" stroke="#1f2937" strokeWidth="1.8" />
        <line x1="18.5" y1="19" x2="23" y2="24" stroke="#1f2937" strokeWidth="1.8" />
        <line x1="13.5" y1="19" x2="9" y2="24" stroke="#1f2937" strokeWidth="1.8" />
        <line x1="12" y1="14" x2="6.5" y2="11.5" stroke="#1f2937" strokeWidth="1.8" />
      </svg>
    )
  }
];

interface DiagramCanvasEditorProps {
  initialDesign?: DrillDesign | null;
  pitchType: PitchType;
  pitchTheme: PitchTheme;
  currentUser: User | null;
  onSave: (design: DrillDesign) => void;
  onBack: () => void;
}

export const DiagramCanvasEditor: React.FC<DiagramCanvasEditorProps> = ({
  initialDesign,
  pitchType,
  pitchTheme,
  currentUser,
  onSave,
  onBack
}) => {
  // Title & Basic metadata
  const [title, setTitle] = useState(initialDesign?.title || '未命名战术示意图');
  const [description] = useState(initialDesign?.description || '');
  const [isPrivate, setIsPrivate] = useState(initialDesign?.isPrivate ?? false);

  // Active elements & lines
  const [elements, setElements] = useState<DesignElement[]>(initialDesign?.elements || []);
  const [lines, setLines] = useState<DesignLine[]>(initialDesign?.lines || []);
  
  // History for Undo/Redo
  const [history, setHistory] = useState<{ elements: DesignElement[]; lines: DesignLine[] }[]>([
    { elements: initialDesign?.elements || [], lines: initialDesign?.lines || [] }
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Keyframes / Animation Timeline
  const [keyframes, setKeyframes] = useState<DiagramKeyframe[]>(
    initialDesign?.keyframes && initialDesign.keyframes.length > 0
      ? initialDesign.keyframes
      : [{ id: 'kf-1', name: '键帧 1', elements: initialDesign?.elements || [], lines: initialDesign?.lines || [] }]
  );
  const [currentKeyframeIndex, setCurrentKeyframeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.5 | 2>(1);
  const [isLooping, setIsLooping] = useState(true);

  // Tool selection & Canvas properties
  const [activeCategory, setActiveCategory] = useState<'areas' | 'equipment' | 'personnel' | 'lines' | 'annotations'>('personnel');
  const [activeToolMode, setActiveToolMode] = useState<'select' | 'line' | 'text'>('select');
  const [selectedLineType, setSelectedLineType] = useState<LineType>('Pass');
  const [selectedColor, setSelectedColor] = useState<string>('#ef4444');
  
  // Multi-selection state
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [selectedLineIds, setSelectedLineIds] = useState<string[]>([]);

  // Marquee Selection Box State (for dragging to select all/multiple elements & lines)
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueeBox, setMarqueeBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);

  // Group Dragging State
  const [isDraggingGroup, setIsDraggingGroup] = useState(false);
  const [dragStartPoint, setDragStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [initialElementPositions, setInitialElementPositions] = useState<{ id: string; x: number; y: number }[]>([]);
  const [initialLinePositions, setInitialLinePositions] = useState<{ id: string; startX: number; startY: number; endX: number; endY: number }[]>([]);
  
  // Canvas View & Element Scale Controls
  const [zoom, setZoom] = useState<number>(1.0);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [defaultElementScale, setDefaultElementScale] = useState<number>(0.85);
  const [showScalePopover, setShowScalePopover] = useState<boolean>(false);
  const [isDrawingLine, setIsDrawingLine] = useState(false);
  const [lineStartPoint, setLineStartPoint] = useState<{ x: number; y: number } | null>(null);

  // Derived current scale of selection or default
  const currentScaleValue = selectedElementIds.length > 0
    ? (elements.find(e => selectedElementIds.includes(e.id))?.scale ?? defaultElementScale)
    : defaultElementScale;

  const canvasRef = useRef<HTMLDivElement>(null);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Scale Adjustment Handler for selected elements or default
  const handleScaleChange = (newScale: number) => {
    const clamped = Math.max(0.3, Math.min(2.5, Math.round(newScale * 100) / 100));
    if (selectedElementIds.length > 0) {
      const nextEls = elements.map(el => {
        if (selectedElementIds.includes(el.id)) {
          return { ...el, scale: clamped };
        }
        return el;
      });
      updateCurrentKeyframeState(nextEls, lines);
    } else {
      setDefaultElementScale(clamped);
    }
  };

  // Scale All Elements on Pitch
  const handleScaleAllElements = (newScale: number) => {
    const clamped = Math.max(0.3, Math.min(2.5, Math.round(newScale * 100) / 100));
    setDefaultElementScale(clamped);
    const nextEls = elements.map(el => ({ ...el, scale: clamped }));
    updateCurrentKeyframeState(nextEls, lines);
  };

  // Push state to history
  const pushHistory = useCallback((newElements: DesignElement[], newLines: DesignLine[]) => {
    setHistory(prev => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, { elements: newElements, lines: newLines }];
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setElements(prev.elements);
      setLines(prev.lines);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setElements(next.elements);
      setLines(next.lines);
      setHistoryIndex(historyIndex + 1);
    }
  };

  // Sync with current keyframe
  const updateCurrentKeyframeState = (newElements: DesignElement[], newLines: DesignLine[]) => {
    setElements(newElements);
    setLines(newLines);
    setKeyframes(prev => prev.map((kf, idx) => idx === currentKeyframeIndex ? { ...kf, elements: newElements, lines: newLines } : kf));
    pushHistory(newElements, newLines);
  };

  // Selection Helper Methods
  const handleSelectAll = useCallback(() => {
    setSelectedElementIds(elements.map(e => e.id));
    setSelectedLineIds(lines.map(l => l.id));
  }, [elements, lines]);

  const handleClearSelection = useCallback(() => {
    setSelectedElementIds([]);
    setSelectedLineIds([]);
  }, []);

  // Keyframe Actions
  const handleSelectKeyframe = (index: number, kfArray = keyframes) => {
    if (kfArray[index]) {
      setCurrentKeyframeIndex(index);
      setElements(kfArray[index].elements);
      setLines(kfArray[index].lines);
      setSelectedElementIds([]);
      setSelectedLineIds([]);
    }
  };

  const handleAddKeyframe = () => {
    const newId = `kf-${Date.now()}`;
    const newKf: DiagramKeyframe = {
      id: newId,
      name: `键帧 ${keyframes.length + 1}`,
      elements: JSON.parse(JSON.stringify(elements)),
      lines: JSON.parse(JSON.stringify(lines))
    };
    const nextList = [...keyframes, newKf];
    setKeyframes(nextList);
    handleSelectKeyframe(nextList.length - 1, nextList);
  };

  const handleDeleteKeyframe = () => {
    if (keyframes.length <= 1) return;
    const nextList = keyframes.filter((_, idx) => idx !== currentKeyframeIndex);
    setKeyframes(nextList);
    const targetIdx = Math.max(0, currentKeyframeIndex - 1);
    handleSelectKeyframe(targetIdx, nextList);
  };

  // Canvas Element & Line Manipulation
  const handleAddElement = (type: ElementType, label?: string) => {
    const isFixedBlack = FIXED_BLACK_EQUIPMENT_TYPES.includes(type);
    const elementColor = isFixedBlack ? '#111827' : selectedColor;

    const newEl: DesignElement = {
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type,
      x: 50,
      y: 50,
      rotation: 0,
      scale: defaultElementScale,
      color: elementColor,
      label: label !== undefined ? label : (type === 'PlayerCircle' ? '10' : type === 'BadgeNumber' ? '①' : ''),
      shapeWidth: type.includes('Area') ? 100 : undefined,
      shapeHeight: type.includes('Area') ? 65 : undefined
    };
    const nextEls = [...elements, newEl];
    updateCurrentKeyframeState(nextEls, lines);
    setSelectedElementIds([newEl.id]);
    setSelectedLineIds([]);
  };

  const handleCanvasDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    const rawData = e.dataTransfer.getData('application/json');
    if (!rawData) return;
    try {
      const item = JSON.parse(rawData);
      const rect = canvasRef.current.getBoundingClientRect();
      const dropX = ((e.clientX - rect.left) / rect.width) * 100;
      const dropY = ((e.clientY - rect.top) / rect.height) * 100;
      const clampedX = Math.max(4, Math.min(96, Math.round(dropX)));
      const clampedY = Math.max(4, Math.min(96, Math.round(dropY)));

      const isFixedBlack = FIXED_BLACK_EQUIPMENT_TYPES.includes(item.type);
      const elementColor = isFixedBlack ? '#111827' : selectedColor;

      const newEl: DesignElement = {
        id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        type: item.type || 'PlayerCircle',
        x: clampedX,
        y: clampedY,
        rotation: 0,
        scale: defaultElementScale,
        color: elementColor,
        label: item.label !== undefined ? item.label : (item.type === 'PlayerCircle' ? '10' : ''),
        shapeWidth: item.type?.includes('Area') ? 100 : undefined,
        shapeHeight: item.type?.includes('Area') ? 65 : undefined
      };
      const nextEls = [...elements, newEl];
      updateCurrentKeyframeState(nextEls, lines);
      setSelectedElementIds([newEl.id]);
      setSelectedLineIds([]);
    } catch (err) {
      console.error('Failed to parse dropped element', err);
    }
  };

  // Duplicate all selected elements & lines
  const handleDuplicateSelected = () => {
    if (selectedElementIds.length === 0 && selectedLineIds.length === 0) return;

    const clonedElements: DesignElement[] = [];
    const newElementIds: string[] = [];

    elements.forEach(el => {
      if (selectedElementIds.includes(el.id)) {
        const newId = `el-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        clonedElements.push({
          ...el,
          id: newId,
          x: Math.min(94, el.x + 3.5),
          y: Math.min(94, el.y + 3.5)
        });
        newElementIds.push(newId);
      }
    });

    const clonedLines: DesignLine[] = [];
    const newLineIds: string[] = [];

    lines.forEach(l => {
      if (selectedLineIds.includes(l.id)) {
        const newId = `line-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        clonedLines.push({
          ...l,
          id: newId,
          startX: Math.min(94, l.startX + 3),
          startY: Math.min(94, l.startY + 3),
          endX: Math.min(94, l.endX + 3),
          endY: Math.min(94, l.endY + 3)
        });
        newLineIds.push(newId);
      }
    });

    const nextEls = [...elements, ...clonedElements];
    const nextLines = [...lines, ...clonedLines];
    updateCurrentKeyframeState(nextEls, nextLines);
    setSelectedElementIds(newElementIds);
    setSelectedLineIds(newLineIds);
  };

  // Delete all selected elements & lines
  const handleDeleteSelected = () => {
    if (selectedElementIds.length === 0 && selectedLineIds.length === 0) return;
    const nextEls = elements.filter(e => !selectedElementIds.includes(e.id));
    const nextLines = lines.filter(l => !selectedLineIds.includes(l.id));
    updateCurrentKeyframeState(nextEls, nextLines);
    setSelectedElementIds([]);
    setSelectedLineIds([]);
  };

  // Rotate all selected elements
  const handleRotateSelected = (angleDelta: number) => {
    if (selectedElementIds.length === 0) return;
    const nextEls = elements.map(el => {
      if (selectedElementIds.includes(el.id)) {
        return { ...el, rotation: (el.rotation + angleDelta) % 360 };
      }
      return el;
    });
    updateCurrentKeyframeState(nextEls, lines);
  };

  // Keyboard Shortcuts: Ctrl/Cmd+A (Select All), Ctrl/Cmd+D (Duplicate), Delete/Backspace (Delete), Esc (Clear), Ctrl+Z (Undo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSelectAll();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicateSelected();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteSelected();
      } else if (e.key === 'Escape') {
        handleClearSelection();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements, lines, selectedElementIds, selectedLineIds]);

  // Animation Playback Engine
  useEffect(() => {
    if (isPlaying) {
      const interval = 1000 / playbackSpeed;
      playTimerRef.current = setInterval(() => {
        setCurrentKeyframeIndex(prev => {
          let next = prev + 1;
          if (prev >= keyframes.length - 1) {
            if (isLooping) {
              next = 0;
            } else {
              setIsPlaying(false);
              return prev;
            }
          }
          if (keyframes[next]) {
            setElements(keyframes[next].elements);
            setLines(keyframes[next].lines);
          }
          return next;
        });
      }, interval);
    } else {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    }
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, keyframes, playbackSpeed, isLooping]);

  const handleBringToFront = () => {
    if (selectedElementIds.length === 0) return;
    const selected = elements.filter(e => selectedElementIds.includes(e.id));
    const nonSelected = elements.filter(e => !selectedElementIds.includes(e.id));
    const nextEls = [...nonSelected, ...selected];
    updateCurrentKeyframeState(nextEls, lines);
  };

  const handleSendToBack = () => {
    if (selectedElementIds.length === 0) return;
    const selected = elements.filter(e => selectedElementIds.includes(e.id));
    const nonSelected = elements.filter(e => !selectedElementIds.includes(e.id));
    const nextEls = [...selected, ...nonSelected];
    updateCurrentKeyframeState(nextEls, lines);
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    let updated = false;
    let nextEls = elements;
    let nextLines = lines;

    if (selectedElementIds.length > 0) {
      nextEls = elements.map(el => {
        if (selectedElementIds.includes(el.id)) {
          if (FIXED_BLACK_EQUIPMENT_TYPES.includes(el.type)) {
            return el;
          }
          return { ...el, color };
        }
        return el;
      });
      updated = true;
    }
    if (selectedLineIds.length > 0) {
      nextLines = lines.map(l => selectedLineIds.includes(l.id) ? { ...l, color } : l);
      updated = true;
    }
    if (updated) {
      updateCurrentKeyframeState(nextEls, nextLines);
    }
  };

  // Canvas Mouse Events: Line Drawing, Marquee Selection & Multi-Element Dragging
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (activeToolMode === 'line') {
      if (!isDrawingLine) {
        setIsDrawingLine(true);
        setLineStartPoint({ x, y });
      } else if (lineStartPoint) {
        const newLine: DesignLine = {
          id: `line-${Date.now()}`,
          type: selectedLineType,
          startX: lineStartPoint.x,
          startY: lineStartPoint.y,
          endX: x,
          endY: y,
          color: selectedColor
        };
        const nextLines = [...lines, newLine];
        updateCurrentKeyframeState(elements, nextLines);
        setIsDrawingLine(false);
        setLineStartPoint(null);
      }
    } else {
      // Empty pitch click -> Start Marquee selection
      if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
        setSelectedElementIds([]);
        setSelectedLineIds([]);
      }
      setIsMarqueeSelecting(true);
      setMarqueeBox({ startX: x, startY: y, currentX: x, currentY: y });
    }
  };

  const handleElementMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    let targetSelectedElementIds = selectedElementIds;

    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      // Toggle selection for this element
      if (selectedElementIds.includes(id)) {
        targetSelectedElementIds = selectedElementIds.filter(item => item !== id);
      } else {
        targetSelectedElementIds = [...selectedElementIds, id];
      }
      setSelectedElementIds(targetSelectedElementIds);
    } else {
      // If clicking an element not in current selection, select ONLY this element
      if (!selectedElementIds.includes(id)) {
        targetSelectedElementIds = [id];
        setSelectedElementIds(targetSelectedElementIds);
        setSelectedLineIds([]);
      }
    }

    // Start group dragging for all elements in targetSelectedElementIds
    setIsDraggingGroup(true);
    setDragStartPoint({ x, y });
    setInitialElementPositions(
      elements
        .filter(el => targetSelectedElementIds.includes(el.id))
        .map(el => ({ id: el.id, x: el.x, y: el.y }))
    );
    setInitialLinePositions(
      lines
        .filter(l => selectedLineIds.includes(l.id))
        .map(l => ({ id: l.id, startX: l.startX, startY: l.startY, endX: l.endX, endY: l.endY }))
    );
  };

  const handleLineMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      if (selectedLineIds.includes(id)) {
        setSelectedLineIds(prev => prev.filter(item => item !== id));
      } else {
        setSelectedLineIds(prev => [...prev, id]);
      }
    } else {
      setSelectedLineIds([id]);
      setSelectedElementIds([]);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // 1. Marquee selection handling
    if (isMarqueeSelecting && marqueeBox) {
      const currentX = Math.max(0, Math.min(100, x));
      const currentY = Math.max(0, Math.min(100, y));
      setMarqueeBox(prev => prev ? { ...prev, currentX, currentY } : null);

      const minX = Math.min(marqueeBox.startX, currentX);
      const maxX = Math.max(marqueeBox.startX, currentX);
      const minY = Math.min(marqueeBox.startY, currentY);
      const maxY = Math.max(marqueeBox.startY, currentY);

      // Select elements inside box (margin 2% tolerance)
      const matchedElementIds = elements
        .filter(el => el.x >= minX - 2.5 && el.x <= maxX + 2.5 && el.y >= minY - 2.5 && el.y <= maxY + 2.5)
        .map(el => el.id);

      // Select lines inside box
      const matchedLineIds = lines
        .filter(l => (
          (l.startX >= minX && l.startX <= maxX && l.startY >= minY && l.startY <= maxY) ||
          (l.endX >= minX && l.endX <= maxX && l.endY >= minY && l.endY <= maxY)
        ))
        .map(l => l.id);

      setSelectedElementIds(matchedElementIds);
      setSelectedLineIds(matchedLineIds);
      return;
    }

    // 2. Group dragging handling
    if (isDraggingGroup && dragStartPoint) {
      const dx = x - dragStartPoint.x;
      const dy = y - dragStartPoint.y;

      setElements(prev =>
        prev.map(el => {
          const init = initialElementPositions.find(p => p.id === el.id);
          if (init) {
            return {
              ...el,
              x: Math.max(2, Math.min(98, init.x + dx)),
              y: Math.max(2, Math.min(98, init.y + dy))
            };
          }
          return el;
        })
      );

      if (initialLinePositions.length > 0) {
        setLines(prev =>
          prev.map(l => {
            const init = initialLinePositions.find(p => p.id === l.id);
            if (init) {
              return {
                ...l,
                startX: Math.max(2, Math.min(98, init.startX + dx)),
                startY: Math.max(2, Math.min(98, init.startY + dy)),
                endX: Math.max(2, Math.min(98, init.endX + dx)),
                endY: Math.max(2, Math.min(98, init.endY + dy))
              };
            }
            return l;
          })
        );
      }
    }
  };

  const handleCanvasMouseUp = () => {
    if (isMarqueeSelecting) {
      setIsMarqueeSelecting(false);
      setMarqueeBox(null);
    }
    if (isDraggingGroup) {
      setIsDraggingGroup(false);
      setDragStartPoint(null);
      setInitialElementPositions([]);
      setInitialLinePositions([]);
      updateCurrentKeyframeState(elements, lines);
    }
  };

  // Export / Save
  const handleSaveDiagram = async (publish = false) => {
    let previewDataUrl = '';
    if (canvasRef.current) {
      try {
        const canvas = await html2canvas(canvasRef.current, { scale: 1.5, useCORS: true });
        previewDataUrl = canvas.toDataURL('image/png');
      } catch (err) {
        console.warn('Canvas export preview warning:', err);
      }
    }

    const designToSave: DrillDesign = {
      id: initialDesign?.id || `diagram-${Date.now()}`,
      title: title.trim() || '未命名战术示意图',
      category: 'diagram',
      contentType: 'diagram',
      pitchType,
      pitchTheme,
      elements,
      lines,
      keyframes,
      previewImage: previewDataUrl || initialDesign?.previewImage,
      description,
      keyPoints: initialDesign?.keyPoints || [],
      createdAt: initialDesign?.createdAt || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      authorId: currentUser?.id,
      authorName: currentUser?.name,
      isPrivate,
      isDraft: !publish
    };

    onSave(designToSave);
  };

  const handleExportPNG = async () => {
    if (!canvasRef.current) return;
    try {
      const canvas = await html2canvas(canvasRef.current, { scale: 2, useCORS: true });
      const link = document.createElement('a');
      link.download = `${title || '战术示意图'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      alert('导出图片失败，请稍后重试');
    }
  };

  // Element Icon / Component Visual Renderer
  const renderCanvasElement = (el: DesignElement) => {
    const isSelected = selectedElementIds.includes(el.id);
    const isFixedBlack = FIXED_BLACK_EQUIPMENT_TYPES.includes(el.type);
    const color = isFixedBlack ? '#111827' : (el.color || '#ef4444');
    const elementScale = typeof el.scale === 'number' && !isNaN(el.scale) ? el.scale : defaultElementScale;

    const style: React.CSSProperties = {
      left: `${el.x}%`,
      top: `${el.y}%`,
      position: 'absolute',
      transform: `translate(-50%, -50%) rotate(${el.rotation}deg) scale(${elementScale})`,
      transformOrigin: 'center center',
      zIndex: isSelected ? 40 : 20,
      cursor: 'move',
      userSelect: 'none'
    };

    let innerContent = null;
    switch (el.type) {
      case 'PlayerRing':
        innerContent = (
          <div
            className="w-6 h-6 rounded-full border-[3px] shadow-sm flex items-center justify-center font-black text-xs"
            style={{ borderColor: color, backgroundColor: 'transparent' }}
          />
        );
        break;

      case 'PlayerCross':
        innerContent = (
          <svg className="w-6 h-6 drop-shadow-sm" viewBox="0 0 32 32">
            <path d="M7 7 L25 25 M25 7 L7 25" stroke={color} strokeWidth="3.6" strokeLinecap="round" />
          </svg>
        );
        break;

      case 'PlayerNeutral':
        innerContent = (
          <div
            className="w-6 h-6 rounded-full border border-white shadow-sm flex items-center justify-center font-black text-[11px] text-white"
            style={{ backgroundColor: color }}
          >
            {el.label || 'N'}
          </div>
        );
        break;

      case 'PlayerTopView':
        innerContent = (
          <svg className="w-6 h-6 drop-shadow-sm" viewBox="0 0 36 36">
            <circle cx="18" cy="17" r="5.5" fill="none" stroke={color} strokeWidth="3" />
            <path d="M9 25 C9 12, 27 12, 27 25" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
          </svg>
        );
        break;

      case 'PlayerShoulders':
        innerContent = (
          <svg className="w-7 h-5 drop-shadow-sm" viewBox="0 0 44 28">
            <ellipse cx="10" cy="14" rx="7.5" ry="3.8" fill={color} opacity="0.6" />
            <ellipse cx="34" cy="14" rx="7.5" ry="3.8" fill={color} opacity="0.6" />
            <circle cx="22" cy="14" r="7.5" fill={color} stroke="white" strokeWidth="1" />
          </svg>
        );
        break;

      case 'PlayerTeardrop':
        innerContent = (
          <svg className="w-6 h-6 drop-shadow-sm" viewBox="0 0 36 36">
            <path d="M18 6 C12 6, 8 10.5, 8 16.5 C8 23.5, 18 30, 18 30 C18 30, 28 23.5, 28 16.5 C28 10.5, 24 6, 18 6 Z" fill={color} stroke="white" strokeWidth="1" />
            <circle cx="18" cy="15" r="3.5" fill="white" />
          </svg>
        );
        break;

      case 'PlayerSquare':
        innerContent = (
          <div
            className="w-6 h-6 rounded-sm border-[3px] shadow-sm flex items-center justify-center font-black text-xs"
            style={{ borderColor: color, backgroundColor: 'transparent' }}
          />
        );
        break;

      case 'PlayerTriangle':
        innerContent = (
          <svg className="w-6 h-6 drop-shadow-sm" viewBox="0 0 36 36">
            <polygon points="18,7 30,28 6,28" fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" />
          </svg>
        );
        break;

      case 'PlayerArchGK':
        innerContent = (
          <svg className="w-6 h-6 drop-shadow-sm" viewBox="0 0 36 36">
            <path d="M10 26 L10 17 C10 9, 26 9, 26 17 L26 26" fill="none" stroke={color} strokeWidth="3.2" strokeLinecap="round" />
          </svg>
        );
        break;

      case 'PlayerTarget':
        innerContent = (
          <div className="w-6 h-6 rounded-full bg-slate-400/30 flex items-center justify-center shadow-sm">
            <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: color }} />
          </div>
        );
        break;

      case 'PlayerCircle':
        innerContent = (
          <div
            className="w-6 h-6 rounded-full border border-white shadow-sm flex items-center justify-center font-black text-[11px] text-white"
            style={{ backgroundColor: color }}
          >
            {el.label || '10'}
          </div>
        );
        break;

      case 'PlayerPin':
        innerContent = (
          <div className="flex flex-col items-center">
            <div
              className="w-5 h-5 rounded-full border border-white shadow-sm flex items-center justify-center text-[9px] font-black text-white"
              style={{ backgroundColor: color }}
            >
              {el.label || 'O'}
            </div>
            <div className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-t-[4px] border-t-white -mt-0.5" />
          </div>
        );
        break;

      case 'Defender':
        innerContent = (
          <div
            className="w-6 h-6 rounded-md border border-white shadow-sm flex items-center justify-center font-black text-[11px] text-white"
            style={{ backgroundColor: color }}
          >
            {el.label || 'X'}
          </div>
        );
        break;

      case 'GK':
        innerContent = (
          <div
            className="w-6 h-6 rounded-full border border-white shadow-sm flex items-center justify-center text-[9px] font-black text-white"
            style={{ backgroundColor: color }}
          >
            {el.label || 'GK'}
          </div>
        );
        break;

      case 'Coach':
        innerContent = (
          <svg className="w-6 h-6 drop-shadow-sm" viewBox="0 0 36 36">
            <polygon points="18,7 30,29 6,29" fill={color} stroke="white" strokeWidth="1" />
            <polygon points="18,7 23.5,17 12.5,17" fill="#1e293b" />
          </svg>
        );
        break;

      case 'Referee':
        innerContent = (
          <svg className="w-6 h-6 drop-shadow-sm" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="10" fill={color} stroke="white" strokeWidth="1" />
            <path d="M8 18 A10 10 0 0 1 28 18 Z" fill="#1e293b" />
          </svg>
        );
        break;

      case 'Ball':
        innerContent = (
          <div className="w-4 h-4 rounded-full bg-white border border-gray-800 shadow-sm flex items-center justify-center text-[9px]">
            ⚽
          </div>
        );
        break;

      case 'Cone':
        innerContent = (
          <svg className="w-4.5 h-6 drop-shadow-sm" viewBox="0 0 24 32">
            <polygon points="12,4 21,28 3,28" fill={color} stroke="white" strokeWidth="1" />
          </svg>
        );
        break;

      case 'Marker':
        innerContent = (
          <svg className="w-5 h-5 drop-shadow-sm" viewBox="0 0 28 28">
            <circle cx="14" cy="14" r="9" fill={color} opacity="0.45" />
            <circle cx="14" cy="14" r="6" fill={color} />
            <circle cx="14" cy="14" r="1.8" fill="white" />
          </svg>
        );
        break;

      case 'Pole':
        innerContent = (
          <svg className="w-4 h-8 drop-shadow-sm" viewBox="0 0 20 40">
            <path d="M10 4 L10 32 M5 37 L15 37 L10 32 Z" fill={color} stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
        break;

      case 'AgilityRing':
        innerContent = (
          <svg className="w-7 h-4.5 drop-shadow-sm" viewBox="0 0 36 24">
            <ellipse cx="18" cy="12" rx="14" ry="7" fill="none" stroke={color} strokeWidth="2.8" />
          </svg>
        );
        break;

      case 'Ladder':
        innerContent = (
          <svg className="w-20 h-5 drop-shadow-sm" viewBox="0 0 112 28">
            <line x1="4" y1="7" x2="108" y2="7" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
            <line x1="4" y1="21" x2="108" y2="21" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
            {[8, 24, 40, 56, 72, 88, 104].map(px => (
              <line key={px} x1={px} y1="7" x2={px} y2="21" stroke={color} strokeWidth="1.8" />
            ))}
          </svg>
        );
        break;

      case 'Hurdle':
        innerContent = (
          <svg className="w-7 h-4.5 drop-shadow-sm" viewBox="0 0 40 24">
            <path d="M8 20 L8 7 L32 7 L32 20" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="square" />
            <path d="M5 20 L11 20 M29 20 L35 20" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        );
        break;

      case 'Mannequin':
        innerContent = (
          <svg className="w-7 h-5.5 drop-shadow-sm" viewBox="0 0 40 28">
            <rect x="15" y="9" width="10" height="10" rx="2" fill={color} stroke="white" strokeWidth="0.8" />
            <rect x="5" y="11" width="9" height="6" rx="2.5" fill="none" stroke={color} strokeWidth="2" />
            <rect x="26" y="11" width="9" height="6" rx="2.5" fill="none" stroke={color} strokeWidth="2" />
          </svg>
        );
        break;

      case 'Rebounder':
        innerContent = (
          <svg className="w-8 h-4.5 drop-shadow-sm" viewBox="0 0 48 24">
            <polygon points="10,6 38,6 44,18 4,18" fill={color} stroke="white" strokeWidth="1" />
          </svg>
        );
        break;

      case 'MinimalGoal':
        innerContent = (
          <svg className="w-12 h-6 drop-shadow-md select-none" viewBox="0 0 64 32">
            <line x1="6" y1="4" x2="6" y2="28" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="6" y1="4" x2="6" y2="28" stroke={color} strokeWidth="2" strokeLinecap="round" />
            <line x1="6" y1="16" x2="58" y2="16" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="6" y1="16" x2="58" y2="16" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
            <line x1="58" y1="4" x2="58" y2="28" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="58" y1="4" x2="58" y2="28" stroke={color} strokeWidth="2" strokeLinecap="round" />
            <circle cx="6" cy="16" r="2" fill="#ffffff" stroke={color} strokeWidth="0.8" />
            <circle cx="58" cy="16" r="2" fill="#ffffff" stroke={color} strokeWidth="0.8" />
          </svg>
        );
        break;

      case 'MiniGoal':
        innerContent = (
          <svg className="w-16 h-10 drop-shadow-lg select-none" viewBox="0 0 80 48">
            <defs>
              <linearGradient id={`miniGoalNetGrad-${el.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.32" />
                <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.12" />
              </linearGradient>
            </defs>

            {/* Rear Ground Base & Net Shape */}
            <polygon
              points="8,10 72,10 65,42 15,42"
              fill={`url(#miniGoalNetGrad-${el.id})`}
              stroke={color}
              strokeWidth="1"
              strokeDasharray="2,2"
            />
            {/* Rear Ground Bar */}
            <line x1="15" y1="42" x2="65" y2="42" stroke={color} strokeWidth="2.8" strokeLinecap="round" opacity="0.9" />
            {/* Side Net Stanchions (Curved / Angled 3D depth) */}
            <line x1="8" y1="10" x2="15" y2="42" stroke={color} strokeWidth="2.4" strokeLinecap="round" opacity="0.9" />
            <line x1="72" y1="10" x2="65" y2="42" stroke={color} strokeWidth="2.4" strokeLinecap="round" opacity="0.9" />

            {/* Realistic Net Longitudinal Strings */}
            {[16, 24, 32, 40, 48, 56, 64].map((topX, idx) => {
              const bottomX = 15 + idx * 7.1;
              return (
                <line
                  key={idx}
                  x1={topX}
                  y1="10"
                  x2={bottomX}
                  y2="42"
                  stroke="#ffffff"
                  strokeWidth="0.9"
                  strokeOpacity="0.65"
                />
              );
            })}
            {/* Net Transverse Strings */}
            {[18, 26, 34].map((y, idx) => {
              const progress = (y - 10) / 32;
              const x1 = 8 + (15 - 8) * progress;
              const x2 = 72 - (72 - 65) * progress;
              return (
                <line
                  key={idx}
                  x1={x1}
                  y1={y}
                  x2={x2}
                  y2={y}
                  stroke="#ffffff"
                  strokeWidth="0.9"
                  strokeOpacity="0.65"
                />
              );
            })}

            {/* Front Goal Mouth Frame (Posts + Crossbar with realistic white highlight) */}
            <line x1="8" y1="10" x2="8" y2="18" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
            <line x1="8" y1="10" x2="8" y2="18" stroke={color} strokeWidth="2.8" strokeLinecap="round" />

            <line x1="72" y1="10" x2="72" y2="18" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
            <line x1="72" y1="10" x2="72" y2="18" stroke={color} strokeWidth="2.8" strokeLinecap="round" />

            <line x1="8" y1="10" x2="72" y2="10" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
            <line x1="8" y1="10" x2="72" y2="10" stroke={color} strokeWidth="2.8" strokeLinecap="round" />

            {/* Corner Elbow Joints */}
            <circle cx="8" cy="10" r="3.2" fill="#ffffff" stroke="#1f2937" strokeWidth="1" />
            <circle cx="72" cy="10" r="3.2" fill="#ffffff" stroke="#1f2937" strokeWidth="1" />
          </svg>
        );
        break;

      case 'Goal':
        innerContent = (
          <svg className="w-24 h-13 drop-shadow-xl select-none" viewBox="0 0 128 64">
            <defs>
              <linearGradient id={`regGoalNetGrad-${el.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.38" />
                <stop offset="100%" stopColor="#64748b" stopOpacity="0.15" />
              </linearGradient>
            </defs>

            {/* Ground Net Area Polygon with translucent fill */}
            <polygon
              points="10,12 118,12 108,56 20,56"
              fill={`url(#regGoalNetGrad-${el.id})`}
              stroke={color}
              strokeWidth="1.2"
              strokeDasharray="3,2.5"
            />

            {/* Rear Ground Base Bar */}
            <line x1="20" y1="56" x2="108" y2="56" stroke={color} strokeWidth="3.2" strokeLinecap="round" opacity="0.95" />
            
            {/* Top Depth D-Stanchions & Back Diagonal Pipes */}
            <line x1="10" y1="12" x2="16" y2="28" stroke={color} strokeWidth="2.8" strokeLinecap="round" opacity="0.9" />
            <line x1="118" y1="12" x2="112" y2="28" stroke={color} strokeWidth="2.8" strokeLinecap="round" opacity="0.9" />
            <line x1="16" y1="28" x2="20" y2="56" stroke={color} strokeWidth="2.6" strokeLinecap="round" opacity="0.9" />
            <line x1="112" y1="28" x2="108" y2="56" stroke={color} strokeWidth="2.6" strokeLinecap="round" opacity="0.9" />
            <line x1="10" y1="12" x2="20" y2="56" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.75" />
            <line x1="118" y1="12" x2="108" y2="56" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.75" />

            {/* Realistic Stadium Soccer Net Mesh (Longitudinal) */}
            {[20, 31, 42, 53, 64, 75, 86, 97, 108].map((topX, idx) => {
              const bottomX = 20 + idx * 9.77;
              return (
                <line
                  key={idx}
                  x1={topX}
                  y1="12"
                  x2={bottomX}
                  y2="56"
                  stroke="#ffffff"
                  strokeWidth="1"
                  strokeOpacity="0.7"
                />
              );
            })}

            {/* Realistic Stadium Soccer Net Mesh (Transverse) */}
            {[20, 29, 38, 47].map((y, idx) => {
              const progress = (y - 12) / 44;
              const x1 = 10 + (20 - 10) * progress;
              const x2 = 118 - (118 - 108) * progress;
              return (
                <line
                  key={idx}
                  x1={x1}
                  y1={y}
                  x2={x2}
                  y2={y}
                  stroke="#ffffff"
                  strokeWidth="1"
                  strokeOpacity="0.7"
                />
              );
            })}

            {/* Front Goal Frame (Left Post, Right Post, Crossbar in 3D double layer) */}
            <line x1="10" y1="12" x2="10" y2="24" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
            <line x1="10" y1="12" x2="10" y2="24" stroke={color} strokeWidth="3.2" strokeLinecap="round" />

            <line x1="118" y1="12" x2="118" y2="24" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
            <line x1="118" y1="12" x2="118" y2="24" stroke={color} strokeWidth="3.2" strokeLinecap="round" />

            <line x1="10" y1="12" x2="118" y2="12" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
            <line x1="10" y1="12" x2="118" y2="12" stroke={color} strokeWidth="3.2" strokeLinecap="round" />

            {/* Corner Post Joint Round Caps */}
            <circle cx="10" cy="12" r="4" fill="#ffffff" stroke="#1f2937" strokeWidth="1.2" />
            <circle cx="118" cy="12" r="4" fill="#ffffff" stroke="#1f2937" strokeWidth="1.2" />
          </svg>
        );
        break;

      case 'BadgeNumber':
        innerContent = (
          <div
            className="w-5.5 h-5.5 rounded-full border border-white text-white font-black text-xs flex items-center justify-center shadow-sm"
            style={{ backgroundColor: color }}
          >
            {el.label || '①'}
          </div>
        );
        break;

      case 'DistanceMeter':
        innerContent = (
          <div className="px-2 py-0.5 bg-black/80 text-white font-mono text-[10px] font-bold rounded border border-white/40 flex items-center gap-1 shadow-md">
            <span>|←</span>
            <span>{el.label || '10m'}</span>
            <span>→|</span>
          </div>
        );
        break;

      case 'Text':
        innerContent = (
          <div
            className="px-2 py-1 bg-black/70 backdrop-blur-sm rounded-lg text-xs font-black whitespace-nowrap shadow-md border border-white/20"
            style={{ color }}
          >
            {el.label || '文字说明'}
          </div>
        );
        break;

      case 'AreaSquare':
      case 'AreaRect':
      case 'AreaCircle':
        innerContent = (
          <div
            className={`border-2 border-dashed shadow-inner flex items-center justify-center text-[10px] font-bold text-white/90 ${
              el.type === 'AreaCircle' ? 'rounded-full' : 'rounded-lg'
            }`}
            style={{
              width: el.shapeWidth || 90,
              height: el.shapeHeight || 60,
              borderColor: color,
              backgroundColor: `${color}25`
            }}
          >
            {el.label || '训练限制区'}
          </div>
        );
        break;

      default:
        innerContent = <div className="w-5.5 h-5.5 rounded-full bg-white border shadow-sm" />;
    }

    return (
      <div
        key={el.id}
        style={style}
        onMouseDown={e => handleElementMouseDown(e, el.id)}
        className={`group relative transition-transform duration-75 select-none ${
          isSelected ? 'z-50' : ''
        }`}
      >
        {isSelected && (
          <div className="absolute -inset-1.5 border-2 border-emerald-400/90 rounded-md pointer-events-none shadow-sm animate-in fade-in duration-100">
            {/* 4 Corner Knots */}
            <span className="absolute -top-1 -left-1 w-1.5 h-1.5 bg-emerald-400 border border-black rounded-full" />
            <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-emerald-400 border border-black rounded-full" />
            <span className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-emerald-400 border border-black rounded-full" />
            <span className="absolute -bottom-1 -right-1 w-1.5 h-1.5 bg-emerald-400 border border-black rounded-full" />
          </div>
        )}
        {innerContent}
      </div>
    );
  };

  // Line SVG Renderer
  const renderSvgLine = (line: DesignLine) => {
    const isSelected = selectedLineIds.includes(line.id);
    const color = isSelected ? '#34d399' : line.color;
    const markerId = `arrowhead-${line.id}`;

    const dx = line.endX - line.startX;
    const dy = line.endY - line.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

    const marker = (
      <defs>
        <marker id={markerId} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L0,8 L8,4 z" fill={color} />
        </marker>
      </defs>
    );

    const lineProps = {
      stroke: color,
      strokeWidth: isSelected ? 3.8 : 2.5,
      fill: 'none',
      onMouseDown: (e: any) => handleLineMouseDown(e, line.id),
      style: { cursor: 'pointer' }
    };

    if (line.type === 'Dribble' || line.type === 'DribbleWave2') {
      const wavePoints: string[] = [];
      const segments = Math.max(4, Math.floor(dist / 2.5));
      for (let i = 0; i <= segments; i++) {
        const px = (i / segments) * dist;
        const py = Math.sin(i * 1.6) * (line.type === 'DribbleWave2' ? 5 : 3.5);
        wavePoints.push(`${px},${py}`);
      }
      return (
        <g key={line.id} transform={`translate(${line.startX}%, ${line.startY}%) rotate(${angle})`}>
          {marker}
          <polyline points={wavePoints.join(' ')} {...lineProps} markerEnd={`url(#${markerId})`} />
        </g>
      );
    }

    if (line.type === 'CurvePass') {
      const midX = (line.startX + line.endX) / 2 - dy * 0.15;
      const midY = (line.startY + line.endY) / 2 + dx * 0.15;
      return (
        <g key={line.id}>
          {marker}
          <path
            d={`M ${line.startX}% ${line.startY}% Q ${midX}% ${midY}% ${line.endX}% ${line.endY}%`}
            {...lineProps}
            markerEnd={`url(#${markerId})`}
          />
        </g>
      );
    }

    return (
      <g key={line.id}>
        {marker}
        <line
          x1={`${line.startX}%`}
          y1={`${line.startY}%`}
          x2={`${line.endX}%`}
          y2={`${line.endY}%`}
          {...lineProps}
          strokeDasharray={line.type === 'Run' ? '6,5' : line.type === 'Boundary' ? '3,3' : 'none'}
          markerEnd={line.type !== 'Boundary' ? `url(#${markerId})` : undefined}
        />
      </g>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white select-none">
      
      {/* Top Main Toolbar */}
      <div className="px-4 py-2.5 bg-gray-950 border-b border-gray-800 flex items-center justify-between gap-3 flex-wrap z-30">
        
        {/* Left Back & Title info */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors flex items-center gap-1 text-xs font-bold"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>返回</span>
          </button>

          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="输入示意图标题..."
            className="bg-gray-900 border border-gray-700 focus:border-emerald-500 rounded-xl px-3 py-1.5 text-xs font-black text-white focus:outline-none w-52 sm:w-64"
          />
        </div>

        {/* Center Operations Bar (Undo, Redo, Select All, Rotate, Duplicate, Delete, Zoom, Grid) */}
        <div className="flex items-center gap-1.5 bg-gray-900/90 p-1 rounded-2xl border border-gray-800 flex-wrap">
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            title="撤销 (Ctrl+Z)"
            className="p-1.5 rounded-xl hover:bg-gray-800 disabled:opacity-30 text-gray-300 transition-colors"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            title="恢复 (Ctrl+Shift+Z)"
            className="p-1.5 rounded-xl hover:bg-gray-800 disabled:opacity-30 text-gray-300 transition-colors"
          >
            <Redo className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-gray-700 mx-1" />

          <button
            onClick={() => setActiveToolMode('select')}
            title="选择与拖拽模式"
            className={`p-1.5 rounded-xl transition-colors ${
              activeToolMode === 'select' ? 'bg-emerald-600 text-white' : 'hover:bg-gray-800 text-gray-400'
            }`}
          >
            <MousePointer2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleSelectAll}
            title="全选球场元素 (Ctrl+A)"
            className={`p-1.5 rounded-xl transition-colors ${
              (selectedElementIds.length === elements.length && elements.length > 0)
                ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/40'
                : 'hover:bg-gray-800 text-gray-300'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleRotateSelected(-15)}
            disabled={selectedElementIds.length === 0}
            title="左转 -15°"
            className="p-1.5 rounded-xl hover:bg-gray-800 disabled:opacity-30 text-gray-300 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleRotateSelected(15)}
            disabled={selectedElementIds.length === 0}
            title="右转 +15°"
            className="p-1.5 rounded-xl hover:bg-gray-800 disabled:opacity-30 text-gray-300 transition-colors"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleDuplicateSelected}
            disabled={selectedElementIds.length === 0 && selectedLineIds.length === 0}
            title="复制选中元素 (Ctrl/Cmd+D)"
            className="p-1.5 rounded-xl hover:bg-gray-800 disabled:opacity-30 text-gray-300 transition-colors"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={handleDeleteSelected}
            disabled={selectedElementIds.length === 0 && selectedLineIds.length === 0}
            title="删除选中 (Delete/Backspace)"
            className="p-1.5 rounded-xl hover:bg-red-950 text-red-400 disabled:opacity-30 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-gray-700 mx-1" />

          {/* Scale / Resize Control Button & Popover (Matching Image 1) */}
          <div className="relative">
            <button
              onClick={() => setShowScalePopover(!showScalePopover)}
              title="调整器材与人员缩放比例"
              className={`px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold ${
                showScalePopover
                  ? 'bg-emerald-600 text-white shadow-md'
                  : selectedElementIds.length > 0
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                  : 'hover:bg-gray-800 text-gray-300'
              }`}
            >
              <Maximize2 className="w-4 h-4" />
              <span>缩放</span>
              <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-black/40 text-emerald-400 font-bold">
                {currentScaleValue.toFixed(2)}x
              </span>
            </button>

            {/* Scale Popover Dropdown matching Image 1 */}
            {showScalePopover && (
              <div className="absolute top-full left-0 mt-2 w-72 bg-gray-950/95 backdrop-blur-xl border border-gray-700/90 rounded-2xl p-3.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-gray-800">
                  <span className="text-xs font-black text-gray-100 flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      {selectedElementIds.length > 0
                        ? `缩放已选 (${selectedElementIds.length} 个元素)`
                        : '缩放调整 (全局/默认)'}
                    </span>
                  </span>
                  <button
                    onClick={() => setShowScalePopover(false)}
                    className="text-gray-400 hover:text-white text-xs px-1 rounded hover:bg-gray-800"
                  >
                    ✕
                  </button>
                </div>

                {/* Slider + Number Input (Matching Image 1 slider layout) */}
                <div className="flex items-center gap-2.5 bg-gray-900 px-3 py-2.5 rounded-xl border border-gray-800 mb-3">
                  <input
                    type="range"
                    min="0.30"
                    max="2.50"
                    step="0.01"
                    value={currentScaleValue}
                    onChange={e => handleScaleChange(parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                  />
                  <input
                    type="number"
                    min="0.30"
                    max="2.50"
                    step="0.01"
                    value={Number(currentScaleValue.toFixed(2))}
                    onChange={e => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) handleScaleChange(val);
                    }}
                    className="w-16 px-1.5 py-1 bg-gray-950 border border-gray-700 focus:border-emerald-500 rounded-lg text-xs font-mono text-center font-black text-emerald-400 focus:outline-none"
                  />
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-5 gap-1 mb-3">
                  {[0.5, 0.7, 0.85, 1.0, 1.3].map(preset => (
                    <button
                      key={preset}
                      onClick={() => handleScaleChange(preset)}
                      className={`py-1 rounded-lg text-[10px] font-mono font-black transition-colors ${
                        Math.abs(currentScaleValue - preset) < 0.03
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800'
                      }`}
                    >
                      {preset}x
                    </button>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 pt-1 border-t border-gray-800/80">
                  <button
                    onClick={() => handleScaleChange(0.85)}
                    className="flex-1 py-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-[11px] font-bold text-gray-300 text-center transition-colors border border-gray-800"
                  >
                    重置默认 (0.85)
                  </button>
                  <button
                    onClick={() => handleScaleAllElements(currentScaleValue)}
                    title="将当前缩放比例应用到全场所有器材和人员"
                    className="flex-1 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-[11px] font-bold text-emerald-400 border border-emerald-800 text-center transition-colors"
                  >
                    应用至全场
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="w-[1px] h-4 bg-gray-700 mx-1" />

          <button
            onClick={() => setShowGrid(!showGrid)}
            title="网格参考开关"
            className={`p-1.5 rounded-xl transition-colors ${
              showGrid ? 'bg-emerald-950 text-emerald-400' : 'hover:bg-gray-800 text-gray-400'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1 px-1">
            <ZoomOut className="w-3.5 h-3.5 text-gray-400" />
            <input
              type="range"
              min="0.8"
              max="1.8"
              step="0.05"
              value={zoom}
              onChange={e => setZoom(parseFloat(e.target.value))}
              className="w-16 h-1 accent-emerald-500"
            />
            <span className="text-[10px] font-mono text-gray-400 w-8">{zoom.toFixed(2)}x</span>
          </div>

          <div className="w-[1px] h-4 bg-gray-700 mx-1" />

          <button
            onClick={handleBringToFront}
            disabled={selectedElementIds.length === 0}
            title="置顶图层"
            className="p-1.5 rounded-xl hover:bg-gray-800 disabled:opacity-30 text-gray-300"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <button
            onClick={handleSendToBack}
            disabled={selectedElementIds.length === 0}
            title="置底图层"
            className="p-1.5 rounded-xl hover:bg-gray-800 disabled:opacity-30 text-gray-300"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPrivate(!isPrivate)}
            title="可见性设置"
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
              isPrivate
                ? 'bg-gray-800 border-gray-700 text-gray-300'
                : 'bg-emerald-950/60 border-emerald-800 text-emerald-400'
            }`}
          >
            {isPrivate ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{isPrivate ? '仅自己可见' : '全队可见'}</span>
          </button>

          <button
            onClick={handleExportPNG}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 font-black text-xs rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>导出图片</span>
          </button>

          <button
            onClick={() => handleSaveDiagram(false)}
            className="px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>保存草稿</span>
          </button>

          <button
            onClick={() => handleSaveDiagram(true)}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-900/40"
          >
            <Send className="w-3.5 h-3.5" />
            <span>发布</span>
          </button>
        </div>
      </div>

      {/* Main Workspace (Left Tool Palette + Center Canvas) */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Tool Categories Dock */}
        <div className="w-64 sm:w-72 bg-gray-950 border-r border-gray-800 flex flex-col z-20 shrink-0 select-none">
          
          {/* Category Tabs Header */}
          <div className="grid grid-cols-5 p-1.5 bg-gray-900 border-b border-gray-800 text-[11px] font-black">
            {[
              { id: 'areas', label: '区域' },
              { id: 'equipment', label: '器材' },
              { id: 'personnel', label: '人员' },
              { id: 'lines', label: '线条' },
              { id: 'annotations', label: '标注' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id as any)}
                className={`py-1.5 rounded-lg text-center transition-all ${
                  activeCategory === tab.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Specific Content */}
          <div className="p-3 overflow-y-auto flex-1 custom-scrollbar space-y-3">
            {/* 1. 区域 (Areas & Shapes) */}
            {activeCategory === 'areas' && (
              <div className="space-y-3">
                <div className="border-b border-gray-800/80 pb-2.5">
                  <span className="text-[11px] font-bold text-gray-400 block mb-2">当前颜色:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => handleColorChange(c)}
                        className={`w-5 h-5 rounded-full border transition-all ${
                          selectedColor === c ? 'ring-2 ring-white scale-110 border-white' : 'border-black/30'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-gray-400">区域图形</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleAddElement('AreaSquare', '正方形区')}
                      className="p-2.5 bg-gray-900 hover:bg-gray-800 rounded-xl border border-gray-800 flex flex-col items-center gap-1 text-xs font-bold"
                    >
                      <Square className="w-5 h-5 text-emerald-400" />
                      <span>正方形</span>
                    </button>
                    <button
                      onClick={() => handleAddElement('AreaRect', '长方形区')}
                      className="p-2.5 bg-gray-900 hover:bg-gray-800 rounded-xl border border-gray-800 flex flex-col items-center gap-1 text-xs font-bold"
                    >
                      <div className="w-6 h-4 border-2 border-emerald-400 rounded-sm" />
                      <span>长方形</span>
                    </button>
                    <button
                      onClick={() => handleAddElement('AreaCircle', '圆形区')}
                      className="p-2.5 bg-gray-900 hover:bg-gray-800 rounded-xl border border-gray-800 flex flex-col items-center gap-1 text-xs font-bold"
                    >
                      <Circle className="w-5 h-5 text-emerald-400" />
                      <span>圆形</span>
                    </button>
                    <button
                      onClick={() => handleAddElement('AreaTriangle', '三角区')}
                      className="p-2.5 bg-gray-900 hover:bg-gray-800 rounded-xl border border-gray-800 flex flex-col items-center gap-1 text-xs font-bold"
                    >
                      <Triangle className="w-5 h-5 text-emerald-400" />
                      <span>三角形</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. 器材 (Equipment) - Matches Image 2 exactly */}
            {activeCategory === 'equipment' && (
              <div className="space-y-4 bg-gray-900/60 p-3 rounded-2xl border border-gray-800/80">
                {/* 颜色 Header & 7 Palette Boxes */}
                <div>
                  <div className="text-xs font-extrabold text-gray-200 mb-2.5">颜色</div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {IMAGE_PRESET_COLORS.map(c => {
                      const isChecked = selectedColor.toLowerCase() === c.id.toLowerCase();
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleColorChange(c.id)}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-transform hover:scale-105 shadow-sm ${
                            c.border ? 'border border-gray-400/50' : ''
                          }`}
                          style={{ backgroundColor: c.bg }}
                          title={c.id}
                        >
                          {isChecked && (
                            <Check
                              className={`w-4 h-4 stroke-[3] ${
                                c.id === '#ffffff' || c.id === '#eab308' || c.id === '#9ca3af'
                                  ? 'text-gray-900'
                                  : 'text-white'
                              }`}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-gray-800/80 pt-3">
                  <div className="text-xs font-extrabold text-gray-200 mb-2.5 flex items-center gap-1.5">
                    <span>器材</span>
                    <span className="text-gray-400 font-normal">（拖拽）</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {EQUIPMENT_ITEMS.map((item) => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(
                            'application/json',
                            JSON.stringify({
                              type: item.type,
                              label: item.label
                            })
                          );
                        }}
                        onClick={() => handleAddElement(item.type, item.label)}
                        className="group relative h-20 sm:h-22 bg-slate-100 hover:bg-white rounded-xl flex flex-col items-center justify-between p-2 cursor-grab active:cursor-grabbing transition-all hover:scale-[1.03] hover:shadow-md border border-slate-200/60 select-none"
                        title={`点击添加或拖拽: ${item.name}`}
                      >
                        {/* Center Icon */}
                        <div className="flex-1 flex items-center justify-center w-full">
                          {item.renderIcon(selectedColor)}
                        </div>

                        {/* Bottom Label */}
                        <span className="text-[11px] font-bold text-gray-600 group-hover:text-gray-900 transition-colors leading-none tracking-tight">
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 3. 人员 (Personnel) - Matches Image 2 exactly */}
            {activeCategory === 'personnel' && (
              <div className="space-y-4 bg-gray-900/60 p-3 rounded-2xl border border-gray-800/80">
                {/* 颜色 Header & 7 Palette Boxes */}
                <div>
                  <div className="text-xs font-extrabold text-gray-200 mb-2.5">颜色</div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {IMAGE_PRESET_COLORS.map(c => {
                      const isChecked = selectedColor.toLowerCase() === c.id.toLowerCase();
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleColorChange(c.id)}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-transform hover:scale-105 shadow-sm ${
                            c.border ? 'border border-gray-400/50' : ''
                          }`}
                          style={{ backgroundColor: c.bg }}
                          title={c.id}
                        >
                          {isChecked && (
                            <Check
                              className={`w-4 h-4 stroke-[3] ${
                                c.id === '#ffffff' || c.id === '#eab308' || c.id === '#9ca3af'
                                  ? 'text-gray-900'
                                  : 'text-white'
                              }`}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Subtle Divider */}
                <div className="border-t border-gray-800" />

                {/* 人员（拖拽） Header & 3-Column Personnel Grid */}
                <div>
                  <div className="text-xs font-extrabold text-gray-200 mb-2.5 flex items-center gap-1.5">
                    <span>人员</span>
                    <span className="text-gray-400 font-normal">（拖拽）</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {PERSONNEL_ITEMS.map(item => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/json', JSON.stringify({
                            type: item.type,
                            label: item.defaultText !== undefined ? item.defaultText : ''
                          }));
                        }}
                        onClick={() => handleAddElement(item.type, item.defaultText)}
                        className="group relative h-20 sm:h-22 bg-slate-100 hover:bg-white rounded-xl flex flex-col items-center justify-between p-2 cursor-grab active:cursor-grabbing transition-all hover:scale-[1.03] hover:shadow-md border border-slate-200/60 select-none"
                        title={`点击添加或拖拽: ${item.name}`}
                      >
                        {/* Center Icon dynamically colored */}
                        <div className="flex-1 flex items-center justify-center w-full">
                          {item.renderIcon(selectedColor)}
                        </div>

                        {/* Bottom Label */}
                        <span className="text-[11px] font-bold text-gray-600 group-hover:text-gray-900 transition-colors leading-none tracking-tight">
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 4. 线条 (Lines & Arrows) */}
            {activeCategory === 'lines' && (
              <div className="space-y-3">
                <div className="border-b border-gray-800/80 pb-2.5">
                  <span className="text-[11px] font-bold text-gray-400 block mb-2">当前线条颜色:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => handleColorChange(c)}
                        className={`w-5 h-5 rounded-full border transition-all ${
                          selectedColor === c ? 'ring-2 ring-white scale-110 border-white' : 'border-black/30'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-gray-400">战术线条 (点击画布两点连线)</span>
                  <div className="space-y-2">
                    {[
                      { id: 'Pass', name: '传球/射门实线', icon: '→' },
                      { id: 'Run', name: '无球跑动虚线', icon: '- - →' },
                      { id: 'Dribble', name: '运球波浪线 1', icon: '〜〜→' },
                      { id: 'DribbleWave2', name: '运球波浪线 2', icon: '∿∿→' },
                      { id: 'CurvePass', name: '弧线传球', icon: '⌒→' },
                      { id: 'Boundary', name: '边界/划分线', icon: '---' }
                    ].map(l => (
                      <button
                        key={l.id}
                        onClick={() => {
                          setSelectedLineType(l.id as LineType);
                          setActiveToolMode('line');
                        }}
                        className={`w-full p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
                          activeToolMode === 'line' && selectedLineType === l.id
                            ? 'bg-emerald-600 border-emerald-500 text-white ring-2 ring-emerald-400/20'
                            : 'bg-gray-900 hover:bg-gray-800 border-gray-800 text-gray-300'
                        }`}
                      >
                        <span>{l.name}</span>
                        <span className="font-mono font-black">{l.icon}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 5. 标注 (Annotations) */}
            {activeCategory === 'annotations' && (
              <div className="space-y-3">
                <div className="border-b border-gray-800/80 pb-2.5">
                  <span className="text-[11px] font-bold text-gray-400 block mb-2">当前颜色:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => handleColorChange(c)}
                        className={`w-5 h-5 rounded-full border transition-all ${
                          selectedColor === c ? 'ring-2 ring-white scale-110 border-white' : 'border-black/30'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-gray-400">距离与标注</span>
                  <div className="grid grid-cols-2 gap-2">
                    {['5m', '10m', '15m', '20m'].map(dist => (
                      <button
                        key={dist}
                        onClick={() => handleAddElement('DistanceMeter', dist)}
                        className="p-2.5 bg-gray-900 hover:bg-gray-800 rounded-xl border border-gray-800 flex flex-col items-center gap-1 text-xs font-bold"
                      >
                        <span className="font-mono text-emerald-400 font-bold">{dist}</span>
                        <span>标尺</span>
                      </button>
                    ))}
                    {['①', '②', '③', '④', '⑤', '⑥'].map(badge => (
                      <button
                        key={badge}
                        onClick={() => handleAddElement('BadgeNumber', badge)}
                        className="p-2 bg-gray-900 hover:bg-gray-800 rounded-xl border border-gray-800 flex items-center justify-center gap-1 text-xs font-black"
                      >
                        <span className="text-yellow-400 text-sm">{badge}</span>
                        <span>序号</span>
                      </button>
                    ))}
                    <button
                      onClick={() => handleAddElement('Text', '点击编辑备注')}
                      className="col-span-2 p-2.5 bg-gray-900 hover:bg-gray-800 rounded-xl border border-gray-800 flex items-center justify-center gap-2 text-xs font-bold text-emerald-400"
                    >
                      <Type className="w-4 h-4" />
                      <span>添加文字说明框</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center Canvas Area with Zoom Container */}
        <div
          className="flex-1 bg-gray-900 flex items-center justify-center p-4 sm:p-8 overflow-auto relative"
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
        >
          {/* Top-Left Canvas Badge: 水印设置 */}
          <div className="absolute top-4 left-4 z-40 flex items-center gap-2">
            <button
              onClick={() => alert('已开启场地水印保护')}
              className="px-3 py-1.5 bg-gray-950/80 hover:bg-gray-950 backdrop-blur-md border border-gray-700/80 rounded-xl text-xs font-bold text-gray-300 hover:text-white flex items-center gap-1.5 shadow-lg transition-all"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>设置水印</span>
            </button>
          </div>

          {/* Top-Right Canvas Helper: 示意图快速入门 */}
          <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
            <button
              onClick={() => alert('示意图设计指南：\n1. 从左侧拖拽器材或人员至球场。\n2. 点击线条工具在球场上两点连线绘制战术跑位。\n3. 按住鼠标框选或按 Ctrl+A 全选元素进行批量移动或删除。')}
              className="px-3.5 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 backdrop-blur-md border border-emerald-700/80 rounded-xl text-xs font-bold text-emerald-300 hover:text-white flex items-center gap-1.5 shadow-lg transition-all"
            >
              <span>🛒</span>
              <span>示意图快速入门</span>
            </button>
          </div>

          {/* Bottom-Right Floating Action Buttons (AI助教, 客服, 帮助) */}
          <div className="absolute bottom-4 right-4 z-40 flex flex-col gap-2 pointer-events-auto">
            <button
              onClick={() => alert('AI 助教已就绪，可随时提供站位建议与教案编写支持！')}
              className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow-xl flex items-center gap-1.5 transition-all hover:scale-105"
            >
              <span>💬</span>
              <span>AI助教</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => alert('在线客服：如需技术支持请联系青训技术团队。')}
                className="px-2.5 py-1.5 bg-gray-950/80 hover:bg-gray-900 border border-gray-700 rounded-xl text-xs font-bold text-gray-300 hover:text-white shadow-md flex items-center gap-1 transition-colors"
              >
                <span>🎧</span>
                <span>客服</span>
              </button>
              <button
                onClick={() => alert('快捷键说明：\n- Ctrl+A：全选球场所有元素\n- Ctrl+D：复制选中元素\n- Delete / Backspace：删除选中元素\n- Ctrl+Z / Ctrl+Shift+Z：撤销与重做\n- 鼠标拖拽框选：批量全选移动')}
                className="px-2.5 py-1.5 bg-gray-950/80 hover:bg-gray-900 border border-gray-700 rounded-xl text-xs font-bold text-gray-300 hover:text-white shadow-md flex items-center gap-1 transition-colors"
              >
                <span>❓</span>
                <span>帮助</span>
              </button>
            </div>
          </div>
          {/* Floating Multi-Selection Quick Bar */}
          {(selectedElementIds.length > 0 || selectedLineIds.length > 0) && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gray-950/90 backdrop-blur-md border border-emerald-500/50 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-2xl z-50 pointer-events-auto animate-in fade-in slide-in-from-top-3 duration-200">
              <span className="text-xs font-black text-emerald-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                已选中 {selectedElementIds.length + selectedLineIds.length} 个元素
              </span>
              <div className="w-[1px] h-4 bg-gray-700 mx-0.5" />
              <button
                onClick={handleSelectAll}
                title="全选球场上所有元素 (Ctrl+A)"
                className="text-xs font-bold px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 transition-colors"
              >
                全选
              </button>
              <button
                onClick={handleDuplicateSelected}
                title="复制选中 (Ctrl+D)"
                className="text-xs font-bold px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 flex items-center gap-1 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>复制</span>
              </button>
              {selectedElementIds.length > 0 && (
                <>
                  <button
                    onClick={() => handleRotateSelected(15)}
                    title="旋转 +15°"
                    className="text-xs font-bold px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 flex items-center gap-1 transition-colors"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>旋转</span>
                  </button>

                  <div className="flex items-center gap-1 bg-gray-800 px-1.5 py-0.5 rounded-lg border border-gray-700">
                    <button
                      onClick={() => handleScaleChange(Math.max(0.3, currentScaleValue - 0.1))}
                      title="缩小元素 (-10%)"
                      className="p-1 hover:bg-gray-700 rounded text-gray-300 hover:text-white"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setShowScalePopover(!showScalePopover)}
                      title="点击打开缩放精准调节面板"
                      className="text-[11px] font-mono font-black text-emerald-400 px-1 hover:underline"
                    >
                      {currentScaleValue.toFixed(2)}x
                    </button>
                    <button
                      onClick={() => handleScaleChange(Math.min(2.5, currentScaleValue + 0.1))}
                      title="放大元素 (+10%)"
                      className="p-1 hover:bg-gray-700 rounded text-gray-300 hover:text-white"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
              <button
                onClick={handleDeleteSelected}
                title="删除选中 (Delete/Backspace)"
                className="text-xs font-bold px-2.5 py-1 rounded-lg bg-red-950/90 hover:bg-red-900 text-red-300 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>删除</span>
              </button>
              <button
                onClick={handleClearSelection}
                title="取消选中 (Esc)"
                className="text-xs font-bold px-2 py-1 text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
          )}

          {/* Dynamic canvas sizing for horizontal, vertical, square and 2/3 ratio pitches */}
          {(() => {
            const isVertical = pitchType === 'Portrait' || pitchType === 'FutsalVertical' || pitchType === 'RectangleVertical';
            const isSquare = pitchType === 'SquareBox' || pitchType === 'FourGrids' || pitchType === 'HalfDefend' || pitchType === 'HalfAttack';
            const isTwoThirdsVertical = pitchType === 'TwoThirdsDefend' || pitchType === 'TwoThirdsAttack';
            
            let dimClasses = "w-[780px] h-[520px] sm:w-[840px] sm:h-[560px]";
            if (isVertical) {
              dimClasses = "w-[520px] h-[780px] sm:w-[560px] sm:h-[840px]";
            } else if (isSquare) {
              dimClasses = "w-[560px] h-[560px] sm:w-[620px] sm:h-[620px]";
            } else if (isTwoThirdsVertical) {
              dimClasses = "w-[540px] h-[700px] sm:w-[580px] sm:h-[750px]";
            }

            return (
              <div
                ref={canvasRef}
                onMouseDown={handleCanvasMouseDown}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleCanvasDrop}
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.1s ease-out'
                }}
                className={`${dimClasses} relative rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-800/80 bg-gray-950 shrink-0 select-none cursor-crosshair`}
              >
                {/* SVG Background Pitch */}
                <PitchSvgRenderer
                  pitchType={pitchType}
                  pitchTheme={pitchTheme}
                  showGrid={showGrid}
                  className="w-full h-full pointer-events-none"
                />

                {/* Marquee Selection Drag Box Overlay */}
                {isMarqueeSelecting && marqueeBox && (
                  <div
                    className="absolute border-2 border-dashed border-emerald-400 bg-emerald-500/20 rounded-md pointer-events-none z-50 transition-none shadow-md"
                    style={{
                      left: `${Math.min(marqueeBox.startX, marqueeBox.currentX)}%`,
                      top: `${Math.min(marqueeBox.startY, marqueeBox.currentY)}%`,
                      width: `${Math.abs(marqueeBox.currentX - marqueeBox.startX)}%`,
                      height: `${Math.abs(marqueeBox.currentY - marqueeBox.startY)}%`
                    }}
                  />
                )}

                {/* SVG Lines Overlay */}
                <svg className="absolute inset-0 w-full h-full pointer-events-auto" style={{ zIndex: 15 }}>
                  {lines.map(renderSvgLine)}
                  {isDrawingLine && lineStartPoint && (
                    <circle cx={`${lineStartPoint.x}%`} cy={`${lineStartPoint.y}%`} r={4} fill="#facc15" />
                  )}
                </svg>

                {/* Canvas Elements Overlay */}
                {elements.map(renderCanvasElement)}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Bottom Animation Keyframe Studio Timeline (Video 5) */}
      <div className="px-6 py-2.5 bg-gray-950 border-t border-gray-800 flex items-center justify-between gap-4 flex-wrap z-30">
        
        {/* Keyframe Selector */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-bold text-gray-400 shrink-0">关键帧:</span>
          {keyframes.map((kf, index) => (
            <button
              key={kf.id}
              onClick={() => handleSelectKeyframe(index)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition-all ${
                currentKeyframeIndex === index
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-gray-900 hover:bg-gray-800 text-gray-400'
              }`}
            >
              <span>键帧 {index + 1} / {keyframes.length}</span>
            </button>
          ))}

          <button
            onClick={handleAddKeyframe}
            title="添加新关键帧"
            className="p-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-emerald-400 font-black text-xs flex items-center gap-1 border border-emerald-900/40"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {keyframes.length > 1 && (
            <button
              onClick={handleDeleteKeyframe}
              title="删除当前帧"
              className="p-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-red-400 text-xs"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLooping(!isLooping)}
            title="循环播放"
            className={`p-1.5 rounded-xl transition-colors ${
              isLooping ? 'bg-emerald-950 text-emerald-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Repeat className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-900/30"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? '暂停' : '播放动画'}</span>
          </button>

          <button
            onClick={() => {
              const speeds: (1 | 1.5 | 2)[] = [1, 1.5, 2];
              const next = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
              setPlaybackSpeed(next);
            }}
            className="px-2.5 py-1 bg-gray-900 hover:bg-gray-800 text-gray-300 font-mono font-bold text-xs rounded-lg border border-gray-800"
          >
            {playbackSpeed}x 倍速
          </button>
        </div>
      </div>
    </div>
  );
};
