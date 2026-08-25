import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DrillDesign, DesignElement, DesignLine, PitchType, PitchTheme, ElementType, LineType, User, DiagramKeyframe } from '../../types';
import { PitchSvgRenderer } from './PitchSvgRenderer';
import {
  Undo, Redo, RotateCcw, RotateCw, Copy, Trash2, Grid, ZoomOut,
  ArrowUp, ArrowDown, Type, Save, Download, Eye, EyeOff,
  Plus, Minus, Play, Pause, Repeat, ChevronLeft,
  MousePointer2, Send, Check,
  Maximize2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { PublishApprovalModal, PublishChoice } from './PublishApprovalModal';

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

// 12 Area Palette Colors matching image
const AREA_PALETTE_COLORS = [
  { id: '#ef4444', bg: '#ef4444', border: false, name: '红色' },
  { id: '#f97316', bg: '#f97316', border: false, name: '橙色' },
  { id: '#eab308', bg: '#eab308', border: false, name: '黄色' },
  { id: '#22c55e', bg: '#22c55e', border: false, name: '绿色' },
  { id: '#06b6d4', bg: '#06b6d4', border: false, name: '青色' },
  { id: '#3b82f6', bg: '#3b82f6', border: false, name: '蓝色' },
  { id: '#8b5cf6', bg: '#8b5cf6', border: false, name: '紫色' },
  { id: '#ec4899', bg: '#ec4899', border: false, name: '粉色' },
  { id: '#0f172a', bg: '#0f172a', border: false, name: '深黑' },
  { id: '#ffffff', bg: '#ffffff', border: true, name: '白色' },
  { id: '#64748b', bg: '#64748b', border: false, name: '灰色' },
  { id: '#78350f', bg: '#78350f', border: false, name: '棕色' }
];

interface AreaItemDef {
  id: string;
  type: ElementType;
  label: string;
  name: string;
  defaultWidth: number;
  defaultHeight: number;
  renderIcon: () => React.ReactNode;
}

const AREA_ITEMS: AreaItemDef[] = [
  {
    id: 'area-square',
    type: 'AreaSquare',
    label: '正方形',
    name: '正方形区域',
    defaultWidth: 120,
    defaultHeight: 120,
    renderIcon: () => (
      <div className="w-7 h-7 border-2 border-emerald-400 rounded-sm" />
    )
  },
  {
    id: 'area-rect',
    type: 'AreaRect',
    label: '长方形',
    name: '长方形区域',
    defaultWidth: 160,
    defaultHeight: 100,
    renderIcon: () => (
      <div className="w-8 h-5 border-2 border-emerald-400 rounded-sm" />
    )
  },
  {
    id: 'area-circle',
    type: 'AreaCircle',
    label: '圆形',
    name: '圆形区域',
    defaultWidth: 120,
    defaultHeight: 120,
    renderIcon: () => (
      <div className="w-7 h-7 border-2 border-emerald-400 rounded-full" />
    )
  },
  {
    id: 'area-triangle',
    type: 'AreaTriangle',
    label: '三角形',
    name: '三角形区域',
    defaultWidth: 130,
    defaultHeight: 110,
    renderIcon: () => (
      <svg className="w-7 h-7" viewBox="0 0 32 32">
        <polygon points="16,4 28,28 4,28" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinejoin="round" />
      </svg>
    )
  }
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
    name: '攻/防 (实心圆)',
    renderIcon: (color = '#eab308') => (
      <svg className="w-8 h-8 transition-colors" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="11" fill={color} stroke="#334155" strokeWidth="3.6" />
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
    name: '球员 (实心圆)',
    renderIcon: (color = '#eab308') => (
      <svg className="w-8 h-8 transition-colors" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="11" fill={color} stroke="#334155" strokeWidth="3.6" />
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
  'Ladder', 'Hurdle', 'Rebounder',
  'MinimalGoal', 'Goal', 'MiniGoal', 'Ball'
];

const EQUIPMENT_ITEMS: EquipmentItemDef[] = [
  // Row 1 & 2 (Colorable items: AgilityRing, Pole, Cone, Marker, Mannequin)
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
    name: '标志桶 (3D实体锥)',
    renderIcon: (color = '#eab308') => (
      <svg className="w-8 h-8 transition-colors drop-shadow-sm" viewBox="0 0 32 32">
        {/* Diamond Baseplate */}
        <polygon points="16,19 29,24 16,29 3,24" fill={color} stroke="#000000" strokeOpacity="0.18" strokeWidth="0.8" />
        {/* Tapered Cone Body */}
        <path
          d="M 8 23.5 L 13.5 5 Q 16 3.5 18.5 5 L 24 23.5 Q 16 26.5 8 23.5 Z"
          fill={color}
          stroke="#000000"
          strokeOpacity="0.15"
          strokeWidth="0.8"
        />
        {/* Horizontal Tier Ridges */}
        <path d="M 14 9 Q 16 10.5 18 9" fill="none" stroke="#000000" strokeOpacity="0.25" strokeWidth="1.2" />
        <path d="M 12 13.5 Q 16 15.5 20 13.5" fill="none" stroke="#000000" strokeOpacity="0.25" strokeWidth="1.2" />
        <path d="M 10 18 Q 16 20.5 22 18" fill="none" stroke="#000000" strokeOpacity="0.25" strokeWidth="1.2" />
        <path d="M 8.5 22.5 Q 16 25.5 23.5 22.5" fill="none" stroke="#000000" strokeOpacity="0.3" strokeWidth="1.2" />
      </svg>
    )
  },
  {
    id: 'equip-marker',
    type: 'Marker',
    label: '标志盘',
    name: '标志盘 (碟形盘)',
    renderIcon: (color = '#eab308') => (
      <svg className="w-8 h-8 transition-colors drop-shadow-sm" viewBox="0 0 32 32">
        {/* Outer Dome Saucer */}
        <path
          d="M 3 20 Q 16 25.5 29 20 L 22.5 10.5 Q 16 8.5 9.5 10.5 Z"
          fill={color}
          stroke="#000000"
          strokeOpacity="0.18"
          strokeWidth="0.8"
        />
        {/* Stepped Concentric Ridges */}
        <path d="M 4.5 18.5 Q 16 23.8 27.5 18.5" fill="none" stroke="#000000" strokeOpacity="0.25" strokeWidth="1.1" />
        <path d="M 7 15 Q 16 19.8 25 15" fill="none" stroke="#000000" strokeOpacity="0.25" strokeWidth="1.1" />
        <path d="M 9.5 12 Q 16 16 22.5 12" fill="none" stroke="#000000" strokeOpacity="0.28" strokeWidth="1.1" />
        {/* Top Opening Recess */}
        <ellipse cx="16" cy="10" rx="3.5" ry="1.4" fill="#000000" fillOpacity="0.35" />
        <ellipse cx="16" cy="10" rx="1.8" ry="0.8" fill="#000000" fillOpacity="0.6" />
      </svg>
    )
  },
  // Fixed black items / equipment
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
  // Row 3 (Mannequin, Rebounder, Goals)
  {
    id: 'equip-mannequin',
    type: 'Mannequin',
    label: '人型架',
    name: '人型架 (任意球假人墙)',
    renderIcon: (color = '#eab308') => (
      <svg className="w-6 h-9 transition-colors drop-shadow-sm" viewBox="0 0 26 48">
        {/* Head Handle Loop */}
        <path
          d="M 9 9 L 9 5 Q 13 1 17 5 L 17 9 Z"
          fill={color}
          stroke="#000000"
          strokeOpacity="0.2"
          strokeWidth="0.8"
        />
        <path
          d="M 11 8 L 11 5.2 Q 13 3.2 15 5.2 L 15 8 Z"
          fill="#1e293b"
          fillOpacity="0.4"
        />
        {/* Torso Plate */}
        <path
          d="M 10 9 L 4.5 12 Q 4 14 4.5 26 L 21.5 26 Q 22 14 21.5 12 L 16 9 Z"
          fill={color}
          stroke="#000000"
          strokeOpacity="0.2"
          strokeWidth="0.8"
        />
        {/* 4 Standing Rods */}
        <line x1="6.5" y1="26" x2="7.5" y2="44" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
        <line x1="10.5" y1="26" x2="10.5" y2="44" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
        <line x1="15.5" y1="26" x2="15.5" y2="44" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
        <line x1="19.5" y1="26" x2="18.5" y2="44" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
        {/* Ground Baseplate Bar */}
        <rect x="5.5" y="44" width="15" height="2.5" rx="1" fill="#1e293b" />
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
      <svg className="w-7 h-7 drop-shadow-sm select-none" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="47.5" fill="#000000" />
        <path d="M 42 67 L 58 67 Q 61.5 67 62.5 70 L 69.5 83 Q 71 86 67.5 88 A 41.5 41.5 0 0 1 32.5 88 Q 29 86 30.5 83 L 37.5 70 Q 38.5 67 42 67 Z" fill="#ffffff" />
        <path d="M 42 67 L 58 67 Q 61.5 67 62.5 70 L 69.5 83 Q 71 86 67.5 88 A 41.5 41.5 0 0 1 32.5 88 Q 29 86 30.5 83 L 37.5 70 Q 38.5 67 42 67 Z" transform="rotate(72 50 50)" fill="#ffffff" />
        <path d="M 42 67 L 58 67 Q 61.5 67 62.5 70 L 69.5 83 Q 71 86 67.5 88 A 41.5 41.5 0 0 1 32.5 88 Q 29 86 30.5 83 L 37.5 70 Q 38.5 67 42 67 Z" transform="rotate(144 50 50)" fill="#ffffff" />
        <path d="M 42 67 L 58 67 Q 61.5 67 62.5 70 L 69.5 83 Q 71 86 67.5 88 A 41.5 41.5 0 0 1 32.5 88 Q 29 86 30.5 83 L 37.5 70 Q 38.5 67 42 67 Z" transform="rotate(216 50 50)" fill="#ffffff" />
        <path d="M 42 67 L 58 67 Q 61.5 67 62.5 70 L 69.5 83 Q 71 86 67.5 88 A 41.5 41.5 0 0 1 32.5 88 Q 29 86 30.5 83 L 37.5 70 Q 38.5 67 42 67 Z" transform="rotate(288 50 50)" fill="#ffffff" />
      </svg>
    )
  }
];

interface LineToolItemDef {
  id: LineType;
  label: string;
  name: string;
  renderIcon: (color?: string) => React.ReactNode;
}

const LINE_TOOL_ITEMS: LineToolItemDef[] = [
  {
    id: 'Pass',
    label: '传球/射门路线',
    name: '传球/射门路线 (实线)',
    renderIcon: (color = '#1e293b') => (
      <svg className="w-full h-7" viewBox="0 0 100 24">
        <defs>
          <marker id="pv-arrow-pass" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 1 2 L 11 6 L 1 10 L 3.5 6 z" fill={color} />
          </marker>
        </defs>
        <line x1="12" y1="12" x2="84" y2="12" stroke={color} strokeWidth="2.2" markerEnd="url(#pv-arrow-pass)" />
      </svg>
    )
  },
  {
    id: 'Run',
    label: '无球跑动路线',
    name: '无球跑动路线 (虚线)',
    renderIcon: (color = '#1e293b') => (
      <svg className="w-full h-7" viewBox="0 0 100 24">
        <defs>
          <marker id="pv-arrow-run" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 1 2 L 11 6 L 1 10 L 3.5 6 z" fill={color} />
          </marker>
        </defs>
        <line x1="12" y1="12" x2="84" y2="12" stroke={color} strokeWidth="1.8" strokeDasharray="3,3" markerEnd="url(#pv-arrow-run)" />
      </svg>
    )
  },
  {
    id: 'Dribble',
    label: '运球路线1',
    name: '运球路线1 (粗虚线)',
    renderIcon: (color = '#1e293b') => (
      <svg className="w-full h-7" viewBox="0 0 100 24">
        <defs>
          <marker id="pv-arrow-dribble" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 1 2 L 11 6 L 1 10 L 3.5 6 z" fill={color} />
          </marker>
        </defs>
        <line x1="12" y1="12" x2="84" y2="12" stroke={color} strokeWidth="2.4" strokeDasharray="7,5" markerEnd="url(#pv-arrow-dribble)" />
      </svg>
    )
  },
  {
    id: 'DribbleWave2',
    label: '运球路线2',
    name: '运球路线2 (波浪线)',
    renderIcon: (color = '#1e293b') => (
      <svg className="w-full h-7" viewBox="0 0 100 24">
        <defs>
          <marker id="pv-arrow-wave" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 1 2 L 11 6 L 1 10 L 3.5 6 z" fill={color} />
          </marker>
        </defs>
        <path d="M 12 12 Q 17 6, 22 12 T 32 12 T 42 12 T 52 12 T 62 12 T 72 12 L 84 12" fill="none" stroke={color} strokeWidth="2" markerEnd="url(#pv-arrow-wave)" />
      </svg>
    )
  },
  {
    id: 'Boundary',
    label: '虚线边界',
    name: '虚线边界',
    renderIcon: (color = '#1e293b') => (
      <svg className="w-full h-7" viewBox="0 0 100 24">
        <line x1="12" y1="12" x2="88" y2="12" stroke={color} strokeWidth="2" strokeDasharray="4,4" />
      </svg>
    )
  },
  {
    id: 'Connection',
    label: '连接线',
    name: '连接线',
    renderIcon: (color = '#1e293b') => (
      <svg className="w-full h-7" viewBox="0 0 100 24">
        <line x1="18" y1="12" x2="82" y2="12" stroke={color} strokeWidth="2.2" />
        <circle cx="18" cy="12" r="3.5" fill={color} />
        <circle cx="82" cy="12" r="3.5" fill={color} />
      </svg>
    )
  }
];

interface AnnotationItemDef {
  id: string;
  type: ElementType;
  label: string;
  name: string;
  defaultLabel?: string;
  renderIcon: (color?: string) => React.ReactNode;
}

const ANNOTATION_ITEMS: AnnotationItemDef[] = [
  {
    id: 'ann-distance',
    type: 'DistanceMeter',
    label: '距离',
    name: '距离标尺',
    defaultLabel: '5m',
    renderIcon: (color = '#1f2937') => (
      <svg className="w-8 h-8" viewBox="0 0 36 36">
        {/* Top dimension bar with end stops */}
        <line x1="6" y1="11" x2="30" y2="11" stroke={color} strokeWidth="2.4" />
        <line x1="6" y1="7" x2="6" y2="15" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
        <line x1="30" y1="7" x2="30" y2="15" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
        {/* Lower ruler body with markings */}
        <rect x="6" y="17" width="24" height="11" rx="1.5" fill="none" stroke={color} strokeWidth="2" />
        <line x1="12" y1="17" x2="12" y2="23" stroke={color} strokeWidth="1.8" />
        <line x1="18" y1="17" x2="18" y2="25" stroke={color} strokeWidth="1.8" />
        <line x1="24" y1="17" x2="24" y2="23" stroke={color} strokeWidth="1.8" />
      </svg>
    )
  },
  {
    id: 'ann-text',
    type: 'Text',
    label: '文字',
    name: '文字标注',
    defaultLabel: '文字',
    renderIcon: (color = '#1f2937') => (
      <svg className="w-8 h-8" viewBox="0 0 36 36">
        {/* Dashed selection boundary with corner handles */}
        <rect x="7" y="7" width="22" height="22" rx="2" fill="none" stroke={color} strokeWidth="1.6" strokeDasharray="3,2" />
        <rect x="5.5" y="5.5" width="3.2" height="3.2" fill={color} />
        <rect x="27.3" y="5.5" width="3.2" height="3.2" fill={color} />
        <rect x="5.5" y="27.3" width="3.2" height="3.2" fill={color} />
        <rect x="27.3" y="27.3" width="3.2" height="3.2" fill={color} />
        {/* Letter A in center */}
        <text x="18" y="23" textAnchor="middle" fill={color} fontSize="14" fontWeight="bold" fontFamily="sans-serif">A</text>
      </svg>
    )
  },
  {
    id: 'ann-badge',
    type: 'BadgeNumber',
    label: '编号',
    name: '编号 (1-99自动生成)',
    defaultLabel: '1',
    renderIcon: (color = '#1f2937') => {
      const isLightBg = color === '#ffffff' || color === '#eab308' || color === '#facc15';
      const textFill = isLightBg ? '#0f172a' : '#ffffff';
      const stroke = color === '#ffffff' ? '#cbd5e1' : 'none';
      return (
        <svg className="w-8 h-8" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="12" fill={color} stroke={stroke} strokeWidth="1.5" />
          <text x="18" y="22.5" textAnchor="middle" fill={textFill} fontSize="13" fontWeight="bold" fontFamily="sans-serif">1</text>
        </svg>
      );
    }
  },
  {
    id: 'ann-decision',
    type: 'Decision',
    label: '决定',
    name: '决定 (JD框)',
    defaultLabel: 'JD',
    renderIcon: (color = '#1f2937') => (
      <svg className="w-8 h-8" viewBox="0 0 36 36">
        <rect x="6" y="9" width="24" height="18" rx="2" fill="none" stroke={color} strokeWidth="2.2" />
        <text x="18" y="22.5" textAnchor="middle" fill={color} fontSize="11" fontWeight="bold" fontFamily="sans-serif">JD</text>
      </svg>
    )
  },
  {
    id: 'ann-diagonal',
    type: 'DiagonalProtection',
    label: '斜线保护',
    name: '斜线保护 (db圆)',
    defaultLabel: 'db',
    renderIcon: (color = '#1f2937') => (
      <svg className="w-8 h-8" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="11" fill="none" stroke={color} strokeWidth="2.2" />
        <text x="18" y="22.5" textAnchor="middle" fill={color} fontSize="11" fontWeight="bold" fontFamily="sans-serif">db</text>
      </svg>
    )
  }
];

// Helper to generate a wavy sinusoidal path along a quadratic Bézier curve
function generateWavyBezierPath(
  p0: { x: number; y: number },
  pc: { x: number; y: number },
  p1: { x: number; y: number }
): string {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return `M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} L ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;

  const cycles = Math.max(3, Math.round(dist / 32));
  const steps = cycles * 16;
  const amplitude = 12; // in 1000-based viewBox

  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Quadratic Bezier point
    const bx = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * pc.x + t * t * p1.x;
    const by = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * pc.y + t * t * p1.y;

    // Tangent derivative
    const tx = 2 * (1 - t) * (pc.x - p0.x) + 2 * t * (p1.x - pc.x);
    const ty = 2 * (1 - t) * (pc.y - p0.y) + 2 * t * (p1.y - pc.y);
    const len = Math.sqrt(tx * tx + ty * ty) || 1;

    // Normal vector
    const nx = -ty / len;
    const ny = tx / len;

    // Smooth envelope so start and end points lock seamlessly
    const env = Math.sin(t * Math.PI);
    // Taper near the arrowhead (last 12%) so arrowhead points directly along trajectory
    const endTaper = t > 0.88 ? Math.max(0, (1 - t) / 0.12) : 1;
    const wave = Math.sin(t * cycles * 2 * Math.PI) * amplitude * Math.min(1, env * 2.2) * endTaper;

    const x = (bx + nx * wave).toFixed(1);
    const y = (by + ny * wave).toFixed(1);
    pts.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
  }

  return pts.join(' ');
}

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
  const [showPublishApprovalModal, setShowPublishApprovalModal] = useState(false);

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
  const [initialLinePositions, setInitialLinePositions] = useState<{ id: string; startX: number; startY: number; endX: number; endY: number; controlX?: number; controlY?: number }[]>([]);
  const [activeLineHandleDrag, setActiveLineHandleDrag] = useState<{ lineId: string; handleType: 'start' | 'end' | 'control' } | null>(null);
  
  // Canvas View & Element Scale Controls
  const [zoom, setZoom] = useState<number>(0.8);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [defaultElementScale, setDefaultElementScale] = useState<number>(0.85);
  const [showScalePopover, setShowScalePopover] = useState<boolean>(false);
  const [isDrawingLine, setIsDrawingLine] = useState(false);
  const [lineStartPoint, setLineStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [lineCurrentPoint, setLineCurrentPoint] = useState<{ x: number; y: number } | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Active ruler resize state (for DistanceMeter dragging to stretch/shrink)
  const [activeRulerResize, setActiveRulerResize] = useState<{
    elementId: string;
    handle: 'left' | 'right';
    initialWidth: number;
    initialClientX: number;
  } | null>(null);

  // Active area resize state (for AreaSquare, AreaRect, AreaCircle, AreaTriangle 8-way drag-resizing)
  const [activeAreaResize, setActiveAreaResize] = useState<{
    elementId: string;
    handle: 'nw' | 'ne' | 'se' | 'sw' | 'n' | 'e' | 's' | 'w';
    initialWidth: number;
    initialHeight: number;
    initialX: number;
    initialY: number;
    initialClientX: number;
    initialClientY: number;
    canvasWidth: number;
    canvasHeight: number;
  } | null>(null);

  // Inline text/ruler/badge editing state
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  // Derived current scale of selection or default
  const currentScaleValue = selectedElementIds.length > 0
    ? (elements.find(e => selectedElementIds.includes(e.id))?.scale ?? defaultElementScale)
    : defaultElementScale;

  const canvasRef = useRef<HTMLDivElement>(null);
  const playerInputRef = useRef<HTMLInputElement>(null);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Derived label of active selected element
  const selectedElements = elements.filter(e => selectedElementIds.includes(e.id));
  const activeElementLabel = selectedElements.length > 0 ? (selectedElements[0].label ?? '') : '';

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
  const updateCurrentKeyframeState = useCallback((newElements: DesignElement[], newLines: DesignLine[]) => {
    setElements(newElements);
    setLines(newLines);
    setKeyframes(prev => prev.map((kf, idx) => idx === currentKeyframeIndex ? { ...kf, elements: newElements, lines: newLines } : kf));
    pushHistory(newElements, newLines);
  }, [currentKeyframeIndex, pushHistory]);

  // Auto-generate badge numbers (1-99)
  const getNextBadgeNumber = useCallback((currentElements: DesignElement[]): string => {
    const existingNumbers = new Set<number>();
    currentElements.forEach(el => {
      if (el.type === 'BadgeNumber' && el.label) {
        const num = parseInt(el.label, 10);
        if (!isNaN(num) && num >= 1 && num <= 99) {
          existingNumbers.add(num);
        }
      }
    });

    for (let i = 1; i <= 99; i++) {
      if (!existingNumbers.has(i)) {
        return i.toString();
      }
    }
    return '99';
  }, []);

  const handleFinishInlineEdit = (elementId: string) => {
    if (!editingElementId) return;
    const nextEls = elements.map(el => {
      if (el.id === elementId) {
        return { ...el, label: editingText.trim() || el.label || '' };
      }
      return el;
    });
    updateCurrentKeyframeState(nextEls, lines);
    setEditingElementId(null);
  };

  const handleRulerResizeStart = (
    e: React.MouseEvent,
    elementId: string,
    handle: 'left' | 'right',
    currentWidth: number
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedElementIds([elementId]);
    setSelectedLineIds([]);
    setActiveRulerResize({
      elementId,
      handle,
      initialWidth: currentWidth,
      initialClientX: e.clientX
    });
  };

  const handleAreaResizeStart = (
    e: React.MouseEvent,
    elementId: string,
    handle: 'nw' | 'ne' | 'se' | 'sw' | 'n' | 'e' | 's' | 'w',
    currentWidth: number,
    currentHeight: number,
    currentX: number,
    currentY: number
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setSelectedElementIds([elementId]);
    setSelectedLineIds([]);
    setActiveAreaResize({
      elementId,
      handle,
      initialWidth: currentWidth,
      initialHeight: currentHeight,
      initialX: currentX,
      initialY: currentY,
      initialClientX: e.clientX,
      initialClientY: e.clientY,
      canvasWidth: rect.width,
      canvasHeight: rect.height
    });
  };

  // Window-level handler for DistanceMeter Ruler resizing (smooth stretching & shrinking)
  useEffect(() => {
    if (!activeRulerResize) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const deltaX = clientX - activeRulerResize.initialClientX;
      const adjustedDeltaX = deltaX / zoom;

      let newWidth = activeRulerResize.initialWidth;
      if (activeRulerResize.handle === 'right') {
        newWidth = Math.max(50, Math.min(600, activeRulerResize.initialWidth + adjustedDeltaX));
      } else {
        newWidth = Math.max(50, Math.min(600, activeRulerResize.initialWidth - adjustedDeltaX));
      }

      setElements(prev =>
        prev.map(el =>
          el.id === activeRulerResize.elementId
            ? { ...el, shapeWidth: Math.round(newWidth) }
            : el
        )
      );
    };

    const handlePointerUp = () => {
      setElements(latestElements => {
        updateCurrentKeyframeState(latestElements, lines);
        return latestElements;
      });
      setActiveRulerResize(null);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove);
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [activeRulerResize, zoom, lines, updateCurrentKeyframeState]);

  // Window-level handler for Area resizing (smooth 8-way drag-stretching)
  useEffect(() => {
    if (!activeAreaResize) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const deltaX = (clientX - activeAreaResize.initialClientX) / zoom;
      const deltaY = (clientY - activeAreaResize.initialClientY) / zoom;

      let nextWidth = activeAreaResize.initialWidth;
      let nextHeight = activeAreaResize.initialHeight;
      let shiftX = 0;
      let shiftY = 0;

      const { handle, initialWidth, initialHeight, canvasWidth, canvasHeight } = activeAreaResize;

      if (handle === 'e') {
        nextWidth = Math.max(30, initialWidth + deltaX);
        shiftX = (nextWidth - initialWidth) / 2;
      } else if (handle === 'w') {
        nextWidth = Math.max(30, initialWidth - deltaX);
        shiftX = -(nextWidth - initialWidth) / 2;
      } else if (handle === 's') {
        nextHeight = Math.max(30, initialHeight + deltaY);
        shiftY = (nextHeight - initialHeight) / 2;
      } else if (handle === 'n') {
        nextHeight = Math.max(30, initialHeight - deltaY);
        shiftY = -(nextHeight - initialHeight) / 2;
      } else if (handle === 'se') {
        nextWidth = Math.max(30, initialWidth + deltaX);
        nextHeight = Math.max(30, initialHeight + deltaY);
        shiftX = (nextWidth - initialWidth) / 2;
        shiftY = (nextHeight - initialHeight) / 2;
      } else if (handle === 'sw') {
        nextWidth = Math.max(30, initialWidth - deltaX);
        nextHeight = Math.max(30, initialHeight + deltaY);
        shiftX = -(nextWidth - initialWidth) / 2;
        shiftY = (nextHeight - initialHeight) / 2;
      } else if (handle === 'ne') {
        nextWidth = Math.max(30, initialWidth + deltaX);
        nextHeight = Math.max(30, initialHeight - deltaY);
        shiftX = (nextWidth - initialWidth) / 2;
        shiftY = -(nextHeight - initialHeight) / 2;
      } else if (handle === 'nw') {
        nextWidth = Math.max(30, initialWidth - deltaX);
        nextHeight = Math.max(30, initialHeight - deltaY);
        shiftX = -(nextWidth - initialWidth) / 2;
        shiftY = -(nextHeight - initialHeight) / 2;
      }

      const deltaXPercent = canvasWidth > 0 ? (shiftX / canvasWidth) * 100 : 0;
      const deltaYPercent = canvasHeight > 0 ? (shiftY / canvasHeight) * 100 : 0;

      const newX = Math.max(1, Math.min(99, activeAreaResize.initialX + deltaXPercent));
      const newY = Math.max(1, Math.min(99, activeAreaResize.initialY + deltaYPercent));

      setElements(prev =>
        prev.map(el =>
          el.id === activeAreaResize.elementId
            ? {
                ...el,
                x: Math.round(newX * 10) / 10,
                y: Math.round(newY * 10) / 10,
                shapeWidth: Math.round(nextWidth),
                shapeHeight: Math.round(nextHeight)
              }
            : el
        )
      );
    };

    const handlePointerUp = () => {
      setElements(latestElements => {
        updateCurrentKeyframeState(latestElements, lines);
        return latestElements;
      });
      setActiveAreaResize(null);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove);
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [activeAreaResize, zoom, lines, updateCurrentKeyframeState]);

  // Handler for changing player label (text, numbers, letters e.g. '范', '10', 'GK')
  const handleUpdateSelectedLabel = (newLabel: string) => {
    if (selectedElementIds.length === 0) return;
    const nextEls = elements.map(el => {
      if (selectedElementIds.includes(el.id)) {
        return { ...el, label: newLabel };
      }
      return el;
    });
    updateCurrentKeyframeState(nextEls, lines);
  };

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

    let finalLabel = label;
    if (finalLabel === undefined) {
      if (type === 'PlayerCircle') {
        finalLabel = '10';
      } else if (type === 'BadgeNumber') {
        finalLabel = getNextBadgeNumber(elements);
      } else if (type === 'DistanceMeter') {
        finalLabel = '5m';
      } else if (type === 'Decision') {
        finalLabel = 'JD';
      } else if (type === 'DiagonalProtection') {
        finalLabel = 'db';
      } else if (type === 'Text') {
        finalLabel = '文字';
      } else {
        finalLabel = '';
      }
    }

    const isArea = type === 'AreaSquare' || type === 'AreaRect' || type === 'AreaCircle' || type === 'AreaTriangle' || type === 'AreaDiamond' || type.includes('Area');
    const defaultW = type === 'AreaRect' ? 160 : type === 'AreaTriangle' ? 130 : 120;
    const defaultH = type === 'AreaRect' ? 100 : type === 'AreaTriangle' ? 110 : 120;

    const newEl: DesignElement = {
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type,
      x: 50,
      y: 50,
      rotation: 0,
      scale: type === 'Ball' ? 0.55 : defaultElementScale,
      color: elementColor,
      label: finalLabel,
      shapeWidth: type === 'DistanceMeter' ? 160 : isArea ? defaultW : undefined,
      shapeHeight: isArea ? defaultH : undefined
    };
    const nextEls = [...elements, newEl];
    updateCurrentKeyframeState(nextEls, lines);
    setSelectedElementIds([newEl.id]);
    setSelectedLineIds([]);
  };

  const handleAddLine = (type: LineType, dropX = 50, dropY = 50) => {
    const length = 20;
    const startX = Math.max(4, Math.min(96, Math.round((dropX - length / 2) * 10) / 10));
    const endX = Math.max(4, Math.min(96, Math.round((dropX + length / 2) * 10) / 10));
    const startY = Math.round(dropY * 10) / 10;
    const endY = Math.round(dropY * 10) / 10;
    const midX = Math.round(dropX * 10) / 10;
    const midY = Math.round(dropY * 10) / 10;

    const newLine: DesignLine = {
      id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type,
      startX,
      startY,
      endX,
      endY,
      controlX: midX,
      controlY: midY,
      color: selectedColor
    };
    const nextLines = [...lines, newLine];
    updateCurrentKeyframeState(elements, nextLines);
    setSelectedLineIds([newLine.id]);
    setSelectedElementIds([]);
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

      if (item.category === 'line' || item.lineType) {
        handleAddLine(item.lineType || item.type || 'Pass', clampedX, clampedY);
        return;
      }

      const isFixedBlack = FIXED_BLACK_EQUIPMENT_TYPES.includes(item.type);
      const elementColor = isFixedBlack ? '#111827' : selectedColor;

      let finalLabel = item.label;
      if (finalLabel === undefined || item.type === 'BadgeNumber') {
        if (item.type === 'BadgeNumber') {
          finalLabel = getNextBadgeNumber(elements);
        } else if (item.type === 'DistanceMeter') {
          finalLabel = item.label || '5m';
        } else if (item.type === 'Decision') {
          finalLabel = 'JD';
        } else if (item.type === 'DiagonalProtection') {
          finalLabel = 'db';
        } else if (item.type === 'PlayerCircle') {
          finalLabel = '10';
        } else if (item.type === 'Text') {
          finalLabel = '文字';
        }
      }

      const isArea = item.type === 'AreaSquare' || item.type === 'AreaRect' || item.type === 'AreaCircle' || item.type === 'AreaTriangle' || item.type === 'AreaDiamond' || item.type?.includes('Area');
      const defaultW = item.shapeWidth || (item.type === 'AreaRect' ? 160 : item.type === 'AreaTriangle' ? 130 : 120);
      const defaultH = item.shapeHeight || (item.type === 'AreaRect' ? 100 : item.type === 'AreaTriangle' ? 110 : 120);

      const newEl: DesignElement = {
        id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        type: item.type || 'PlayerCircle',
        x: clampedX,
        y: clampedY,
        rotation: 0,
        scale: item.type === 'Ball' ? 0.55 : defaultElementScale,
        color: elementColor,
        label: finalLabel,
        shapeWidth: item.type === 'DistanceMeter' ? 160 : isArea ? defaultW : undefined,
        shapeHeight: isArea ? defaultH : undefined
      };
      const nextEls = [...elements, newEl];
      updateCurrentKeyframeState(nextEls, lines);
      setSelectedElementIds([newEl.id]);
      setSelectedLineIds([]);
    } catch (err) {
      console.error('Failed to parse dropped element', err);
    }
  };

  // Duplicate all selected elements & lines (with automatic number generation 1-99 for BadgeNumber)
  const handleDuplicateSelected = () => {
    if (selectedElementIds.length === 0 && selectedLineIds.length === 0) return;

    const clonedElements: DesignElement[] = [];
    const newElementIds: string[] = [];
    const currentBadgeTracker = [...elements];

    elements.forEach(el => {
      if (selectedElementIds.includes(el.id)) {
        const newId = `el-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        let newLabel = el.label;
        if (el.type === 'BadgeNumber') {
          newLabel = getNextBadgeNumber(currentBadgeTracker);
        }
        const clonedEl: DesignElement = {
          ...el,
          id: newId,
          label: newLabel,
          x: Math.min(94, el.x + 3.5),
          y: Math.min(94, el.y + 3.5)
        };
        clonedElements.push(clonedEl);
        currentBadgeTracker.push(clonedEl);
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
          endY: Math.min(94, l.endY + 3),
          controlX: l.controlX !== undefined ? Math.min(94, l.controlX + 3) : undefined,
          controlY: l.controlY !== undefined ? Math.min(94, l.controlY + 3) : undefined
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
      const clampedX = Math.max(1, Math.min(99, Math.round(x * 10) / 10));
      const clampedY = Math.max(1, Math.min(99, Math.round(y * 10) / 10));
      setIsDrawingLine(true);
      setLineStartPoint({ x: clampedX, y: clampedY });
      setLineCurrentPoint({ x: clampedX, y: clampedY });
      setSelectedElementIds([]);
      setSelectedLineIds([]);
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
        .map(l => ({
          id: l.id,
          startX: l.startX,
          startY: l.startY,
          endX: l.endX,
          endY: l.endY,
          controlX: l.controlX !== undefined ? l.controlX : (l.startX + l.endX) / 2,
          controlY: l.controlY !== undefined ? l.controlY : (l.startY + l.endY) / 2
        }))
    );
  };

  const handleLineHandleMouseDown = (e: React.MouseEvent, lineId: string, handleType: 'start' | 'end' | 'control') => {
    e.stopPropagation();
    setSelectedLineIds([lineId]);
    setSelectedElementIds([]);
    setActiveLineHandleDrag({ lineId, handleType });
  };

  const handleLineMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    let targetSelectedLineIds = selectedLineIds;

    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      if (selectedLineIds.includes(id)) {
        targetSelectedLineIds = selectedLineIds.filter(item => item !== id);
      } else {
        targetSelectedLineIds = [...selectedLineIds, id];
      }
      setSelectedLineIds(targetSelectedLineIds);
    } else {
      if (!selectedLineIds.includes(id)) {
        targetSelectedLineIds = [id];
        setSelectedLineIds(targetSelectedLineIds);
        setSelectedElementIds([]);
      }
    }

    // Start group dragging for all selected lines and elements
    setIsDraggingGroup(true);
    setDragStartPoint({ x, y });
    setInitialElementPositions(
      elements
        .filter(el => selectedElementIds.includes(el.id))
        .map(el => ({ id: el.id, x: el.x, y: el.y }))
    );
    setInitialLinePositions(
      lines
        .filter(l => targetSelectedLineIds.includes(l.id))
        .map(l => ({
          id: l.id,
          startX: l.startX,
          startY: l.startY,
          endX: l.endX,
          endY: l.endY,
          controlX: l.controlX !== undefined ? l.controlX : (l.startX + l.endX) / 2,
          controlY: l.controlY !== undefined ? l.controlY : (l.startY + l.endY) / 2
        }))
    );
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // 0. Handle live line drawing drag
    if (isDrawingLine && lineStartPoint) {
      const clampedX = Math.max(1, Math.min(99, Math.round(x * 10) / 10));
      const clampedY = Math.max(1, Math.min(99, Math.round(y * 10) / 10));
      setLineCurrentPoint({ x: clampedX, y: clampedY });
      return;
    }

    // 1. Handle dragging of line anchor handles (start, end, or middle control point)
    if (activeLineHandleDrag) {
      const clampedX = Math.max(1, Math.min(99, Math.round(x * 10) / 10));
      const clampedY = Math.max(1, Math.min(99, Math.round(y * 10) / 10));
      setLines(prev =>
        prev.map(l => {
          if (l.id !== activeLineHandleDrag.lineId) return l;
          if (activeLineHandleDrag.handleType === 'start') {
            return { ...l, startX: clampedX, startY: clampedY };
          } else if (activeLineHandleDrag.handleType === 'end') {
            return { ...l, endX: clampedX, endY: clampedY };
          } else {
            return { ...l, controlX: clampedX, controlY: clampedY };
          }
        })
      );
      return;
    }

    // 2. Marquee selection handling
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

    // 3. Group dragging handling
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
                startX: Math.max(1, Math.min(99, Math.round((init.startX + dx) * 10) / 10)),
                startY: Math.max(1, Math.min(99, Math.round((init.startY + dy) * 10) / 10)),
                endX: Math.max(1, Math.min(99, Math.round((init.endX + dx) * 10) / 10)),
                endY: Math.max(1, Math.min(99, Math.round((init.endY + dy) * 10) / 10)),
                controlX: init.controlX !== undefined ? Math.max(1, Math.min(99, Math.round((init.controlX + dx) * 10) / 10)) : undefined,
                controlY: init.controlY !== undefined ? Math.max(1, Math.min(99, Math.round((init.controlY + dy) * 10) / 10)) : undefined
              };
            }
            return l;
          })
        );
      }
    }
  };

  const handleCanvasMouseUp = () => {
    if (isDrawingLine && lineStartPoint) {
      const endXVal = lineCurrentPoint ? lineCurrentPoint.x : lineStartPoint.x;
      const endYVal = lineCurrentPoint ? lineCurrentPoint.y : lineStartPoint.y;

      const dx = endXVal - lineStartPoint.x;
      const dy = endYVal - lineStartPoint.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // If user merely clicked without actually dragging a line (< 2.5%), do not create a line
      if (dist < 2.5) {
        setIsDrawingLine(false);
        setLineStartPoint(null);
        setLineCurrentPoint(null);
        return;
      }

      const finalStartX = Math.round(lineStartPoint.x * 10) / 10;
      const finalStartY = Math.round(lineStartPoint.y * 10) / 10;
      const finalEndX = Math.round(endXVal * 10) / 10;
      const finalEndY = Math.round(endYVal * 10) / 10;

      const midX = Math.round(((finalStartX + finalEndX) / 2) * 10) / 10;
      const midY = Math.round(((finalStartY + finalEndY) / 2) * 10) / 10;

      const newLine: DesignLine = {
        id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        type: selectedLineType,
        startX: finalStartX,
        startY: finalStartY,
        endX: finalEndX,
        endY: finalEndY,
        controlX: midX,
        controlY: midY,
        color: selectedColor
      };

      const nextLines = [...lines, newLine];
      updateCurrentKeyframeState(elements, nextLines);
      setSelectedLineIds([newLine.id]);
      setSelectedElementIds([]);
      setIsDrawingLine(false);
      setLineStartPoint(null);
      setLineCurrentPoint(null);
      return;
    }

    if (activeLineHandleDrag) {
      setActiveLineHandleDrag(null);
      updateCurrentKeyframeState(elements, lines);
    }
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

  // Export / Save Core Execution
  const handlePerformSave = async (options: {
    isPrivateChoice: boolean;
    approvalStatusChoice: 'approved' | 'pending' | 'draft';
    isDraftChoice: boolean;
    submissionNotes?: string;
  }) => {
    // Automatically deselect all elements & lines so the diagram is cleanly saved
    setSelectedElementIds([]);
    setSelectedLineIds([]);
    setIsMarqueeSelecting(false);
    setMarqueeBox(null);
    setIsDrawingLine(false);
    setIsCapturing(true);

    // Yield a frame for React to flush the deselected UI to the DOM
    await new Promise(resolve => setTimeout(resolve, 80));

    let previewDataUrl = '';
    if (canvasRef.current) {
      try {
        const canvas = await html2canvas(canvasRef.current, {
          scale: 2,
          useCORS: true,
          backgroundColor: null,
          logging: false,
          ignoreElements: (el) =>
            el.classList.contains('selection-indicator') ||
            el.classList.contains('line-handle') ||
            el.classList.contains('marquee-box')
        });
        previewDataUrl = canvas.toDataURL('image/png');
      } catch (err) {
        console.warn('Canvas export preview warning:', err);
      } finally {
        setIsCapturing(false);
      }
    } else {
      setIsCapturing(false);
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
      authorName: currentUser?.name || (currentUser?.role === 'director' ? '青训总监' : '教练员'),
      authorRole: currentUser?.role || 'coach',
      isPrivate: options.isPrivateChoice,
      approvalStatus: options.approvalStatusChoice,
      approvalFeedback: options.submissionNotes,
      isDraft: options.isDraftChoice
    };

    onSave(designToSave);
  };

  const handleSaveDiagram = async (publish = false) => {
    if (!publish) {
      // Direct draft save
      await handlePerformSave({
        isPrivateChoice: true,
        approvalStatusChoice: 'draft',
        isDraftChoice: true
      });
      return;
    }

    // Publish action
    if (currentUser?.role === 'director') {
      // Director publishes directly to Content Library
      await handlePerformSave({
        isPrivateChoice: false,
        approvalStatusChoice: 'approved',
        isDraftChoice: false
      });
    } else {
      // Non-director coach needs to choose between private or submit for director review
      setShowPublishApprovalModal(true);
    }
  };

  const handleConfirmPublishChoice = async (choice: PublishChoice, notes?: string) => {
    if (choice === 'private') {
      await handlePerformSave({
        isPrivateChoice: true,
        approvalStatusChoice: 'draft',
        isDraftChoice: false
      });
    } else {
      await handlePerformSave({
        isPrivateChoice: false,
        approvalStatusChoice: 'pending',
        isDraftChoice: false,
        submissionNotes: notes
      });
    }
  };

  const handleExportPNG = async () => {
    if (!canvasRef.current) return;
    setSelectedElementIds([]);
    setSelectedLineIds([]);
    setIsMarqueeSelecting(false);
    setMarqueeBox(null);
    setIsDrawingLine(false);
    setIsCapturing(true);

    await new Promise(resolve => setTimeout(resolve, 80));

    try {
      const canvas = await html2canvas(canvasRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
        logging: false,
        ignoreElements: (el) =>
          el.classList.contains('selection-indicator') ||
          el.classList.contains('line-handle') ||
          el.classList.contains('marquee-box')
      });
      const link = document.createElement('a');
      link.download = `${title || '战术示意图'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      alert('导出图片失败，请稍后重试');
    } finally {
      setIsCapturing(false);
    }
  };

  // Element Icon / Component Visual Renderer
  const renderCanvasElement = (el: DesignElement) => {
    const isSelected = selectedElementIds.includes(el.id);
    const isFixedBlack = FIXED_BLACK_EQUIPMENT_TYPES.includes(el.type);
    const color = isFixedBlack ? '#111827' : (el.color || '#ef4444');
    const elementScale = typeof el.scale === 'number' && !isNaN(el.scale) ? el.scale : (el.type === 'Ball' ? 0.55 : defaultElementScale);

    const isArea = el.type === 'AreaSquare' || el.type === 'AreaRect' || el.type === 'AreaCircle' || el.type === 'AreaTriangle' || el.type === 'AreaDiamond' || el.type.startsWith('Area');
    const shapeWidth = el.shapeWidth || (el.type === 'AreaRect' ? 160 : el.type === 'AreaTriangle' ? 130 : 120);
    const shapeHeight = el.shapeHeight || (el.type === 'AreaRect' ? 100 : el.type === 'AreaTriangle' ? 110 : 120);

    const style: React.CSSProperties = {
      left: `${el.x}%`,
      top: `${el.y}%`,
      position: 'absolute',
      transform: `translate(-50%, -50%) rotate(${el.rotation}deg) scale(${isArea ? 1 : elementScale})`,
      transformOrigin: 'center center',
      zIndex: isSelected ? 40 : isArea ? 10 : 20,
      cursor: 'move',
      userSelect: 'none',
      ...(isArea ? { width: `${shapeWidth}px`, height: `${shapeHeight}px` } : {})
    };

    let innerContent = null;
    switch (el.type) {
      case 'PlayerRing':
        innerContent = (
          <div
            className="w-6 h-6 rounded-full border-[2.5px] border-slate-900 shadow-md flex items-center justify-center font-black text-xs transition-colors"
            style={{ backgroundColor: color }}
          >
            {el.label && (
              <span className={`text-[10px] font-black leading-none ${color === '#ffffff' || color === '#eab308' || color === '#facc15' ? 'text-slate-900' : 'text-white'}`}>
                {el.label}
              </span>
            )}
          </div>
        );
        break;

      case 'PlayerCross':
        innerContent = (
          <svg className="w-6 h-6" viewBox="0 0 32 32">
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
          <svg className="w-6 h-6" viewBox="0 0 36 36">
            <circle cx="18" cy="17" r="5.5" fill="none" stroke={color} strokeWidth="3" />
            <path d="M9 25 C9 12, 27 12, 27 25" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
          </svg>
        );
        break;

      case 'PlayerShoulders':
        innerContent = (
          <svg className="w-7 h-5" viewBox="0 0 44 28">
            <ellipse cx="10" cy="14" rx="7.5" ry="3.8" fill={color} opacity="0.6" />
            <ellipse cx="34" cy="14" rx="7.5" ry="3.8" fill={color} opacity="0.6" />
            <circle cx="22" cy="14" r="7.5" fill={color} stroke="white" strokeWidth="1" />
          </svg>
        );
        break;

      case 'PlayerTeardrop':
        innerContent = (
          <svg className="w-6 h-6" viewBox="0 0 36 36">
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
          <svg className="w-6 h-6" viewBox="0 0 36 36">
            <polygon points="18,7 30,28 6,28" fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" />
          </svg>
        );
        break;

      case 'PlayerArchGK':
        innerContent = (
          <svg className="w-6 h-6" viewBox="0 0 36 36">
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

      case 'PlayerCircle': {
        const isLightBg = color === '#ffffff' || color === '#eab308' || color === '#facc15';
        const circleTextColor = isLightBg ? 'text-slate-950' : 'text-white';
        const labelText = el.label !== undefined ? el.label : '10';
        const labelLength = labelText.length;
        const labelFontSize = labelLength > 3 
          ? 'text-[7.5px] leading-tight tracking-tighter' 
          : labelLength === 3 
          ? 'text-[8.5px] leading-tight tracking-tight' 
          : labelLength === 2 
          ? 'text-[10px] leading-tight' 
          : 'text-[11.5px] leading-none';
        innerContent = (
          <div
            className={`w-6 h-6 rounded-full border-[2.2px] border-slate-900 shadow-md flex items-center justify-center font-black ${circleTextColor} ${labelFontSize} select-none transition-colors overflow-hidden`}
            style={{ backgroundColor: color }}
          >
            {labelText}
          </div>
        );
        break;
      }

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
          <svg className="w-6 h-6" viewBox="0 0 36 36">
            <polygon points="18,7 30,29 6,29" fill={color} stroke="white" strokeWidth="1" />
            <polygon points="18,7 23.5,17 12.5,17" fill="#1e293b" />
          </svg>
        );
        break;

      case 'Referee':
        innerContent = (
          <svg className="w-6 h-6" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="10" fill={color} stroke="white" strokeWidth="1" />
            <path d="M8 18 A10 10 0 0 1 28 18 Z" fill="#1e293b" />
          </svg>
        );
        break;

      case 'Ball': {
        innerContent = (
          <svg className="w-7 h-7 select-none" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="47.5" fill="#000000" />
            <path d="M 42 67 L 58 67 Q 61.5 67 62.5 70 L 69.5 83 Q 71 86 67.5 88 A 41.5 41.5 0 0 1 32.5 88 Q 29 86 30.5 83 L 37.5 70 Q 38.5 67 42 67 Z" fill="#ffffff" />
            <path d="M 42 67 L 58 67 Q 61.5 67 62.5 70 L 69.5 83 Q 71 86 67.5 88 A 41.5 41.5 0 0 1 32.5 88 Q 29 86 30.5 83 L 37.5 70 Q 38.5 67 42 67 Z" transform="rotate(72 50 50)" fill="#ffffff" />
            <path d="M 42 67 L 58 67 Q 61.5 67 62.5 70 L 69.5 83 Q 71 86 67.5 88 A 41.5 41.5 0 0 1 32.5 88 Q 29 86 30.5 83 L 37.5 70 Q 38.5 67 42 67 Z" transform="rotate(144 50 50)" fill="#ffffff" />
            <path d="M 42 67 L 58 67 Q 61.5 67 62.5 70 L 69.5 83 Q 71 86 67.5 88 A 41.5 41.5 0 0 1 32.5 88 Q 29 86 30.5 83 L 37.5 70 Q 38.5 67 42 67 Z" transform="rotate(216 50 50)" fill="#ffffff" />
            <path d="M 42 67 L 58 67 Q 61.5 67 62.5 70 L 69.5 83 Q 71 86 67.5 88 A 41.5 41.5 0 0 1 32.5 88 Q 29 86 30.5 83 L 37.5 70 Q 38.5 67 42 67 Z" transform="rotate(288 50 50)" fill="#ffffff" />
          </svg>
        );
        break;
      }

      case 'Cone':
        innerContent = (
          <svg className="w-6 h-7 select-none" viewBox="0 0 32 32">
            {/* Diamond Baseplate */}
            <polygon points="16,19 29,24 16,29 3,24" fill={color} stroke="#000000" strokeOpacity="0.18" strokeWidth="0.8" />
            {/* Tapered Cone Body */}
            <path
              d="M 8 23.5 L 13.5 5 Q 16 3.5 18.5 5 L 24 23.5 Q 16 26.5 8 23.5 Z"
              fill={color}
              stroke="#000000"
              strokeOpacity="0.15"
              strokeWidth="0.8"
            />
            {/* Horizontal Tier Ridges */}
            <path d="M 14 9 Q 16 10.5 18 9" fill="none" stroke="#000000" strokeOpacity="0.28" strokeWidth="1.1" />
            <path d="M 12 13.5 Q 16 15.5 20 13.5" fill="none" stroke="#000000" strokeOpacity="0.28" strokeWidth="1.1" />
            <path d="M 10 18 Q 16 20.5 22 18" fill="none" stroke="#000000" strokeOpacity="0.28" strokeWidth="1.1" />
            <path d="M 8.5 22.5 Q 16 25.5 23.5 22.5" fill="none" stroke="#000000" strokeOpacity="0.32" strokeWidth="1.1" />
          </svg>
        );
        break;

      case 'Marker':
        innerContent = (
          <svg className="w-6 h-5 select-none" viewBox="0 0 32 32">
            {/* Outer Dome Saucer */}
            <path
              d="M 3 20 Q 16 25.5 29 20 L 22.5 10.5 Q 16 8.5 9.5 10.5 Z"
              fill={color}
              stroke="#000000"
              strokeOpacity="0.18"
              strokeWidth="0.8"
            />
            {/* Stepped Concentric Ridges */}
            <path d="M 4.5 18.5 Q 16 23.8 27.5 18.5" fill="none" stroke="#000000" strokeOpacity="0.25" strokeWidth="1.1" />
            <path d="M 7 15 Q 16 19.8 25 15" fill="none" stroke="#000000" strokeOpacity="0.25" strokeWidth="1.1" />
            <path d="M 9.5 12 Q 16 16 22.5 12" fill="none" stroke="#000000" strokeOpacity="0.28" strokeWidth="1.1" />
            {/* Top Opening Recess */}
            <ellipse cx="16" cy="10" rx="3.5" ry="1.4" fill="#000000" fillOpacity="0.35" />
            <ellipse cx="16" cy="10" rx="1.8" ry="0.8" fill="#000000" fillOpacity="0.6" />
          </svg>
        );
        break;

      case 'Pole':
        innerContent = (
          <svg className="w-4 h-8" viewBox="0 0 20 40">
            <path d="M10 4 L10 32 M5 37 L15 37 L10 32 Z" fill={color} stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
        break;

      case 'AgilityRing':
        innerContent = (
          <svg className="w-7 h-5" viewBox="0 0 36 24">
            <ellipse cx="18" cy="12" rx="14" ry="7" fill="none" stroke={color} strokeWidth="2.8" />
          </svg>
        );
        break;

      case 'Ladder':
        innerContent = (
          <svg className="w-20 h-5" viewBox="0 0 112 28">
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
          <svg className="w-7 h-5" viewBox="0 0 40 24">
            <path d="M8 20 L8 7 L32 7 L32 20" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="square" />
            <path d="M5 20 L11 20 M29 20 L35 20" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        );
        break;

      case 'Mannequin':
        innerContent = (
          <svg className="w-6 h-12 select-none" viewBox="0 0 26 52">
            {/* Head Handle Loop */}
            <path
              d="M 9 10 L 9 5.5 Q 13 1.5 17 5.5 L 17 10 Z"
              fill={color}
              stroke="#000000"
              strokeOpacity="0.2"
              strokeWidth="0.8"
            />
            <path
              d="M 11 9 L 11 5.8 Q 13 3.8 15 5.8 L 15 9 Z"
              fill="#1e293b"
              fillOpacity="0.45"
            />
            {/* Torso Solid Shield */}
            <path
              d="M 10 10 L 4.5 13 Q 4 15 4.5 28 L 21.5 28 Q 22 15 21.5 13 L 16 10 Z"
              fill={color}
              stroke="#000000"
              strokeOpacity="0.2"
              strokeWidth="0.8"
            />
            {/* 4 Standing Spring/Steel Rods */}
            <line x1="6.5" y1="28" x2="7.5" y2="47" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
            <line x1="10.5" y1="28" x2="10.5" y2="47" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
            <line x1="15.5" y1="28" x2="15.5" y2="47" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
            <line x1="19.5" y1="28" x2="18.5" y2="47" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
            {/* Ground Turf Baseplate */}
            <rect x="5.5" y="47" width="15" height="3" rx="1" fill="#1e293b" />
          </svg>
        );
        break;

      case 'Rebounder':
        innerContent = (
          <svg className="w-8 h-5" viewBox="0 0 48 24">
            <polygon points="10,6 38,6 44,18 4,18" fill={color} stroke="white" strokeWidth="1" />
          </svg>
        );
        break;

      case 'MinimalGoal':
        innerContent = (
          <svg className="w-12 h-6 select-none" viewBox="0 0 64 32">
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
          <svg className="w-16 h-10 select-none" viewBox="0 0 80 48">
            <polygon
              points="8,10 72,10 65,42 15,42"
              fill="#ffffff"
              fillOpacity="0.18"
              stroke={color}
              strokeWidth="1"
              strokeDasharray="2,2"
            />
            {/* Rear Ground Bar */}
            <line x1="15" y1="42" x2="65" y2="42" stroke={color} strokeWidth="2.8" strokeLinecap="round" opacity="0.9" />
            {/* Side Net Stanchions */}
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

            {/* Front Goal Mouth Frame */}
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
          <svg className="w-24 h-13 select-none" viewBox="0 0 128 64">
            {/* Ground Net Area Polygon */}
            <polygon
              points="10,12 118,12 108,56 20,56"
              fill="#ffffff"
              fillOpacity="0.2"
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

            {/* Front Goal Frame */}
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

      case 'BadgeNumber': {
        const isEditing = editingElementId === el.id;
        const badgeVal = el.label || '1';
        const isLightBg = color === '#ffffff' || color === '#eab308' || color === '#facc15';
        const textColor = isLightBg ? '#0f172a' : '#ffffff';
        const strokeColor = color === '#ffffff' ? '#cbd5e1' : 'rgba(255,255,255,0.4)';
        const fontSize = badgeVal.length > 2 ? 11 : badgeVal.length === 2 ? 13 : 15;

        innerContent = isEditing ? (
          <input
            autoFocus
            type="text"
            value={editingText}
            onChange={e => setEditingText(e.target.value)}
            onBlur={() => handleFinishInlineEdit(el.id)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleFinishInlineEdit(el.id);
              if (e.key === 'Escape') setEditingElementId(null);
            }}
            maxLength={3}
            className="w-7 h-7 min-w-[28px] min-h-[28px] rounded-full text-center text-xs font-black bg-white text-slate-950 border-2 border-emerald-500 shadow-md focus:outline-none"
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <div
            onDoubleClick={e => {
              e.stopPropagation();
              setEditingElementId(el.id);
              setEditingText(el.label || '1');
            }}
            className="w-7 h-7 min-w-[28px] min-h-[28px] flex items-center justify-center cursor-pointer select-none transition-transform hover:scale-105"
            title="双击修改编号 (1-99)"
          >
            <svg className="w-7 h-7" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="14" fill={color} stroke={strokeColor} strokeWidth="1.2" />
              <text
                x="16"
                y={fontSize >= 14 ? "21" : "20"}
                textAnchor="middle"
                fill={textColor}
                fontSize={fontSize}
                fontWeight="900"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {badgeVal}
              </text>
            </svg>
          </div>
        );
        break;
      }

      case 'DistanceMeter': {
        const rulerWidth = el.shapeWidth || 160;
        const isEditing = editingElementId === el.id;
        innerContent = (
          <div
            className="relative flex items-center justify-center select-none py-1 group/ruler"
            style={{ width: `${rulerWidth}px`, minWidth: '60px' }}
          >
            {/* Left End Stop Bar */}
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] h-4 rounded-full shadow-sm"
              style={{ backgroundColor: color }}
            />

            {/* Connecting Horizontal Line (Left segment) */}
            <div
              className="absolute left-[2.5px] top-1/2 -translate-y-1/2 h-[1.8px]"
              style={{
                backgroundColor: color,
                right: isEditing ? 'calc(50% + 40px)' : 'calc(50% + 22px)'
              }}
            />

            {/* Center Distance Label / Inline Input */}
            {isEditing ? (
              <input
                autoFocus
                type="text"
                value={editingText}
                onChange={e => setEditingText(e.target.value)}
                onBlur={() => handleFinishInlineEdit(el.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleFinishInlineEdit(el.id);
                  if (e.key === 'Escape') setEditingElementId(null);
                }}
                className="z-20 px-2 py-0.5 bg-white text-slate-900 font-mono text-xs font-bold rounded border-2 border-emerald-500 shadow-md text-center w-20 focus:outline-none ring-2 ring-emerald-400"
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <div
                onDoubleClick={e => {
                  e.stopPropagation();
                  setEditingElementId(el.id);
                  setEditingText(el.label || '5m');
                }}
                className="z-10 px-2 py-0.5 text-xs font-mono font-bold tracking-tight whitespace-nowrap cursor-text select-none text-center bg-transparent"
                style={{ color: color }}
                title="双击修改距离 (或使用顶部输入框)"
              >
                {el.label || '5m'}
              </div>
            )}

            {/* Connecting Horizontal Line (Right segment) */}
            <div
              className="absolute right-[2.5px] top-1/2 -translate-y-1/2 h-[1.8px]"
              style={{
                backgroundColor: color,
                left: isEditing ? 'calc(50% + 40px)' : 'calc(50% + 22px)'
              }}
            />

            {/* Right End Stop Bar */}
            <div
              className="absolute right-0 top-1/2 -translate-y-1/2 w-[2.5px] h-4 rounded-full shadow-sm"
              style={{ backgroundColor: color }}
            />

            {/* Interactive Stretch/Shrink Handles when Selected */}
            {isSelected && !isCapturing && (
              <>
                <div
                  onMouseDown={e => handleRulerResizeStart(e, el.id, 'left', rulerWidth)}
                  className="line-handle absolute -left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-emerald-500 rounded-full shadow-md cursor-ew-resize z-30 hover:scale-125 transition-transform flex items-center justify-center pointer-events-auto"
                  title="按住左右拖拽收缩/拉长标尺"
                >
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                </div>
                <div
                  onMouseDown={e => handleRulerResizeStart(e, el.id, 'right', rulerWidth)}
                  className="line-handle absolute -right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-emerald-500 rounded-full shadow-md cursor-ew-resize z-30 hover:scale-125 transition-transform flex items-center justify-center pointer-events-auto"
                  title="按住左右拖拽收缩/拉长标尺"
                >
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                </div>
              </>
            )}
          </div>
        );
        break;
      }

      case 'Text': {
        const isEditing = editingElementId === el.id;
        innerContent = isEditing ? (
          <input
            autoFocus
            type="text"
            value={editingText}
            onChange={e => setEditingText(e.target.value)}
            onBlur={() => handleFinishInlineEdit(el.id)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleFinishInlineEdit(el.id);
              if (e.key === 'Escape') setEditingElementId(null);
            }}
            className="px-2 py-0.5 bg-white text-slate-900 text-xs font-bold rounded border-2 border-emerald-500 shadow-md text-center min-w-[60px] focus:outline-none ring-2 ring-emerald-400"
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <div
            onDoubleClick={e => {
              e.stopPropagation();
              setEditingElementId(el.id);
              setEditingText(el.label || '文字');
            }}
            className="px-2 py-0.5 text-xs font-bold whitespace-nowrap cursor-text select-none text-center rounded"
            style={{ color: color }}
            title="双击编辑文字"
          >
            {el.label || '文字'}
          </div>
        );
        break;
      }

      case 'Decision':
        innerContent = (
          <div
            className="px-2 py-0.5 min-w-[28px] h-6 rounded border-2 flex items-center justify-center font-black text-xs select-none shadow-sm"
            style={{
              borderColor: color,
              color: color,
              backgroundColor: 'rgba(255, 255, 255, 0.95)'
            }}
          >
            {el.label || 'JD'}
          </div>
        );
        break;

      case 'DiagonalProtection':
        innerContent = (
          <div
            className="w-7 h-7 min-w-[28px] min-h-[28px] rounded-full border-2 flex items-center justify-center font-bold text-xs select-none shadow-sm lowercase"
            style={{
              borderColor: color,
              color: color,
              backgroundColor: 'rgba(255, 255, 255, 0.95)'
            }}
          >
            {el.label || 'db'}
          </div>
        );
        break;

      case 'AreaSquare':
      case 'AreaRect':
        innerContent = (
          <div
            className="w-full h-full relative select-none rounded-none"
            style={{
              backgroundColor: color,
              opacity: 0.35,
              border: `1.5px solid ${color === '#ffffff' ? '#94a3b8' : '#0f172a'}`
            }}
          />
        );
        break;

      case 'AreaCircle':
        innerContent = (
          <div
            className="w-full h-full rounded-full relative select-none"
            style={{
              backgroundColor: color,
              opacity: 0.35,
              border: `1.5px solid ${color === '#ffffff' ? '#94a3b8' : '#0f172a'}`
            }}
          />
        );
        break;

      case 'AreaTriangle':
        innerContent = (
          <svg className="w-full h-full select-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polygon
              points="50,2 98,98 2,98"
              fill={color}
              fillOpacity="0.35"
              stroke={color === '#ffffff' ? '#94a3b8' : '#0f172a'}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        );
        break;

      case 'AreaDiamond':
        innerContent = (
          <svg className="w-full h-full select-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polygon
              points="50,2 98,50 50,98 2,50"
              fill={color}
              fillOpacity="0.35"
              stroke={color === '#ffffff' ? '#94a3b8' : '#0f172a'}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        );
        break;

      default:
        innerContent = <div className="w-6 h-6 rounded-full bg-white border shadow-sm" />;
    }

    return (
      <div
        key={el.id}
        style={style}
        onMouseDown={e => handleElementMouseDown(e, el.id)}
        onDoubleClick={e => {
          e.stopPropagation();
          setSelectedElementIds([el.id]);
          setTimeout(() => {
            playerInputRef.current?.focus();
            playerInputRef.current?.select();
          }, 50);
        }}
        className={`group relative select-none ${isSelected ? 'z-50' : ''}`}
      >
        {/* Standard Selection Box for Non-Area Elements */}
        {isSelected && !isCapturing && !isArea && (
          <div className="selection-indicator absolute -inset-1.5 border-2 border-emerald-400/90 rounded-md pointer-events-none shadow-sm animate-in fade-in duration-100">
            {/* 4 Corner Knots */}
            <span className="absolute -top-1 -left-1 w-1.5 h-1.5 bg-emerald-400 border border-black rounded-full" />
            <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-emerald-400 border border-black rounded-full" />
            <span className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-emerald-400 border border-black rounded-full" />
            <span className="absolute -bottom-1 -right-1 w-1.5 h-1.5 bg-emerald-400 border border-black rounded-full" />
          </div>
        )}

        {/* 8-Point Resize Box for Area Elements (Matches Video & Image) */}
        {isSelected && !isCapturing && isArea && (
          <div className="selection-indicator absolute inset-0 border border-slate-900/60 pointer-events-none">
            {/* Top-Left */}
            <div
              onMouseDown={e => handleAreaResizeStart(e, el.id, 'nw', shapeWidth, shapeHeight, el.x, el.y)}
              className="line-handle absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-slate-900 rounded-sm shadow-sm cursor-nwse-resize pointer-events-auto hover:scale-125 transition-transform z-50"
              title="拉伸区域"
            />
            {/* Top-Middle */}
            <div
              onMouseDown={e => handleAreaResizeStart(e, el.id, 'n', shapeWidth, shapeHeight, el.x, el.y)}
              className="line-handle absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border border-slate-900 rounded-sm shadow-sm cursor-ns-resize pointer-events-auto hover:scale-125 transition-transform z-50"
              title="调整高度"
            />
            {/* Top-Right */}
            <div
              onMouseDown={e => handleAreaResizeStart(e, el.id, 'ne', shapeWidth, shapeHeight, el.x, el.y)}
              className="line-handle absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-slate-900 rounded-sm shadow-sm cursor-nesw-resize pointer-events-auto hover:scale-125 transition-transform z-50"
              title="拉伸区域"
            />
            {/* Right-Middle */}
            <div
              onMouseDown={e => handleAreaResizeStart(e, el.id, 'e', shapeWidth, shapeHeight, el.x, el.y)}
              className="line-handle absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-white border border-slate-900 rounded-sm shadow-sm cursor-ew-resize pointer-events-auto hover:scale-125 transition-transform z-50"
              title="调整宽度"
            />
            {/* Bottom-Right */}
            <div
              onMouseDown={e => handleAreaResizeStart(e, el.id, 'se', shapeWidth, shapeHeight, el.x, el.y)}
              className="line-handle absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-slate-900 rounded-sm shadow-sm cursor-nwse-resize pointer-events-auto hover:scale-125 transition-transform z-50"
              title="拉伸区域"
            />
            {/* Bottom-Middle */}
            <div
              onMouseDown={e => handleAreaResizeStart(e, el.id, 's', shapeWidth, shapeHeight, el.x, el.y)}
              className="line-handle absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border border-slate-900 rounded-sm shadow-sm cursor-ns-resize pointer-events-auto hover:scale-125 transition-transform z-50"
              title="调整高度"
            />
            {/* Bottom-Left */}
            <div
              onMouseDown={e => handleAreaResizeStart(e, el.id, 'sw', shapeWidth, shapeHeight, el.x, el.y)}
              className="line-handle absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-slate-900 rounded-sm shadow-sm cursor-nesw-resize pointer-events-auto hover:scale-125 transition-transform z-50"
              title="拉伸区域"
            />
            {/* Left-Middle */}
            <div
              onMouseDown={e => handleAreaResizeStart(e, el.id, 'w', shapeWidth, shapeHeight, el.x, el.y)}
              className="line-handle absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-white border border-slate-900 rounded-sm shadow-sm cursor-ew-resize pointer-events-auto hover:scale-125 transition-transform z-50"
              title="调整宽度"
            />
          </div>
        )}
        {innerContent}
      </div>
    );
  };

  // Dedicated smooth window-level drag handler for Line Anchor Handles (eliminates cursor flicker & jitter)
  useEffect(() => {
    if (!activeLineHandleDrag) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!canvasRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const rect = canvasRef.current.getBoundingClientRect();
      const rawX = ((clientX - rect.left) / rect.width) * 100;
      const rawY = ((clientY - rect.top) / rect.height) * 100;
      const clampedX = Math.max(1, Math.min(99, Math.round(rawX * 10) / 10));
      const clampedY = Math.max(1, Math.min(99, Math.round(rawY * 10) / 10));

      setLines(prev =>
        prev.map(l => {
          if (l.id !== activeLineHandleDrag.lineId) return l;
          if (activeLineHandleDrag.handleType === 'start') {
            return { ...l, startX: clampedX, startY: clampedY };
          } else if (activeLineHandleDrag.handleType === 'end') {
            return { ...l, endX: clampedX, endY: clampedY };
          } else {
            return { ...l, controlX: clampedX, controlY: clampedY };
          }
        })
      );
    };

    const handlePointerUp = () => {
      setActiveLineHandleDrag(null);
      setLines(latestLines => {
        updateCurrentKeyframeState(elements, latestLines);
        return latestLines;
      });
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);
    document.body.style.userSelect = 'none';

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
      document.body.style.userSelect = '';
    };
  }, [activeLineHandleDrag, elements, updateCurrentKeyframeState]);

  // Dedicated smooth window-level drag handler for Line Drawing (click-drag-release)
  useEffect(() => {
    if (!isDrawingLine || !lineStartPoint) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!canvasRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const rect = canvasRef.current.getBoundingClientRect();
      const rawX = ((clientX - rect.left) / rect.width) * 100;
      const rawY = ((clientY - rect.top) / rect.height) * 100;
      const clampedX = Math.max(1, Math.min(99, Math.round(rawX * 10) / 10));
      const clampedY = Math.max(1, Math.min(99, Math.round(rawY * 10) / 10));

      setLineCurrentPoint({ x: clampedX, y: clampedY });
    };

    const handlePointerUp = (e: MouseEvent | TouchEvent) => {
      if (!canvasRef.current) {
        setIsDrawingLine(false);
        setLineStartPoint(null);
        setLineCurrentPoint(null);
        return;
      }

      const clientX = 'changedTouches' in e && e.changedTouches.length > 0 ? e.changedTouches[0].clientX : ('clientX' in e ? e.clientX : 0);
      const clientY = 'changedTouches' in e && e.changedTouches.length > 0 ? e.changedTouches[0].clientY : ('clientY' in e ? e.clientY : 0);
      const rect = canvasRef.current.getBoundingClientRect();
      const rawX = ((clientX - rect.left) / rect.width) * 100;
      const rawY = ((clientY - rect.top) / rect.height) * 100;
      const currentClampedX = Math.max(1, Math.min(99, Math.round(rawX * 10) / 10));
      const currentClampedY = Math.max(1, Math.min(99, Math.round(rawY * 10) / 10));

      const endXVal = lineCurrentPoint ? lineCurrentPoint.x : currentClampedX;
      const endYVal = lineCurrentPoint ? lineCurrentPoint.y : currentClampedY;

      const dx = endXVal - lineStartPoint.x;
      const dy = endYVal - lineStartPoint.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // If user merely clicked without actually dragging a line (< 2.5%), do not create a line
      if (dist < 2.5) {
        setIsDrawingLine(false);
        setLineStartPoint(null);
        setLineCurrentPoint(null);
        return;
      }

      const finalStartX = Math.round(lineStartPoint.x * 10) / 10;
      const finalStartY = Math.round(lineStartPoint.y * 10) / 10;
      const finalEndX = Math.round(endXVal * 10) / 10;
      const finalEndY = Math.round(endYVal * 10) / 10;

      const midX = Math.round(((finalStartX + finalEndX) / 2) * 10) / 10;
      const midY = Math.round(((finalStartY + finalEndY) / 2) * 10) / 10;

      const newLine: DesignLine = {
        id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        type: selectedLineType,
        startX: finalStartX,
        startY: finalStartY,
        endX: finalEndX,
        endY: finalEndY,
        controlX: midX,
        controlY: midY,
        color: selectedColor
      };

      setLines(latestLines => {
        const nextLines = [...latestLines, newLine];
        updateCurrentKeyframeState(elements, nextLines);
        return nextLines;
      });

      setSelectedLineIds([newLine.id]);
      setSelectedElementIds([]);
      setIsDrawingLine(false);
      setLineStartPoint(null);
      setLineCurrentPoint(null);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);
    document.body.style.userSelect = 'none';

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
      document.body.style.userSelect = '';
    };
  }, [isDrawingLine, lineStartPoint, lineCurrentPoint, selectedLineType, selectedColor, elements, updateCurrentKeyframeState]);

  // Line SVG Renderer
  const renderSvgLine = (line: DesignLine) => {
    const isSelected = selectedLineIds.includes(line.id);
    const color = isSelected ? '#34d399' : line.color;
    const markerId = `arrowhead-${line.id}`;

    // Convert percentage (0-100) to 1000-based coordinate system
    const p0 = { x: line.startX * 10, y: line.startY * 10 };
    const p1 = { x: line.endX * 10, y: line.endY * 10 };
    const pc = {
      x: (line.controlX !== undefined ? line.controlX : (line.startX + line.endX) / 2) * 10,
      y: (line.controlY !== undefined ? line.controlY : (line.startY + line.endY) / 2) * 10
    };

    // Clean, crisp, prominent aerodynamic arrowhead marker matching Image 1
    const marker = (
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 16 16"
          refX="13"
          refY="8"
          markerWidth="7.5"
          markerHeight="7.5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M 1 2.5 L 14 8 L 1 13.5 L 4.2 8 z" fill={color} />
        </marker>
      </defs>
    );

    const mainBezierD = `M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} Q ${pc.x.toFixed(1)} ${pc.y.toFixed(1)} ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;

    let pathContent: React.ReactNode = null;

    if (line.type === 'DribbleWave2') {
      const waveD = generateWavyBezierPath(p0, pc, p1);
      pathContent = (
        <path
          d={waveD}
          stroke={color}
          strokeWidth={isSelected ? 3.4 : 2.6}
          fill="none"
          markerEnd={`url(#${markerId})`}
        />
      );
    } else if (line.type === 'Run') {
      pathContent = (
        <path
          d={mainBezierD}
          stroke={color}
          strokeWidth={isSelected ? 3.2 : 2.4}
          strokeDasharray="4,6"
          strokeLinecap="round"
          fill="none"
          markerEnd={`url(#${markerId})`}
        />
      );
    } else if (line.type === 'Dribble') {
      pathContent = (
        <path
          d={mainBezierD}
          stroke={color}
          strokeWidth={isSelected ? 3.6 : 2.8}
          strokeDasharray="10,7"
          strokeLinecap="butt"
          fill="none"
          markerEnd={`url(#${markerId})`}
        />
      );
    } else if (line.type === 'Boundary') {
      pathContent = (
        <path
          d={mainBezierD}
          stroke={color}
          strokeWidth={isSelected ? 3.0 : 2.2}
          strokeDasharray="6,5"
          fill="none"
        />
      );
    } else if (line.type === 'Connection') {
      pathContent = (
        <g>
          <path
            d={mainBezierD}
            stroke={color}
            strokeWidth={isSelected ? 3.4 : 2.5}
            fill="none"
          />
          <circle cx={p0.x} cy={p0.y} r={7.5} fill={color} stroke="#0f172a" strokeWidth={2} />
          <circle cx={p1.x} cy={p1.y} r={7.5} fill={color} stroke="#0f172a" strokeWidth={2} />
        </g>
      );
    } else {
      // Pass or Shot or CurvePass
      pathContent = (
        <path
          d={mainBezierD}
          stroke={color}
          strokeWidth={isSelected ? 3.6 : 2.8}
          fill="none"
          markerEnd={`url(#${markerId})`}
        />
      );
    }

    return (
      <g key={line.id}>
        {marker}

        {/* Visual Line */}
        {pathContent}

        {/* Transparent wide path for easy selecting and dragging the whole line */}
        <path
          d={mainBezierD}
          stroke="transparent"
          strokeWidth={36}
          fill="none"
          style={{ cursor: 'move' }}
          onMouseDown={e => handleLineMouseDown(e, line.id)}
        />

        {/* When Selected: Show Control Guidelines and 3 Interactive Anchor Handles (Matches Image 1 exactly) */}
        {isSelected && !isCapturing && (
          <g className="line-handle selection-indicator pointer-events-auto">
            {/* Control guideline from Start -> Control -> End */}
            <polyline
              points={`${p0.x.toFixed(1)},${p0.y.toFixed(1)} ${pc.x.toFixed(1)},${pc.y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={1.8}
              strokeDasharray="6,6"
              opacity={0.8}
            />

            {/* Start Anchor Point (Handle 'start' - Blue square frame matching screenshot) */}
            <g
              style={{ cursor: 'crosshair' }}
              onMouseDown={e => handleLineHandleMouseDown(e, line.id, 'start')}
            >
              {/* Invisible large hit box to eliminate mouse slips */}
              <rect x={p0.x - 22} y={p0.y - 22} width={44} height={44} fill="transparent" />
              {/* Blue Outer Box */}
              <rect
                x={p0.x - 12}
                y={p0.y - 12}
                width={24}
                height={24}
                rx={2}
                fill="#93c5fd"
                fillOpacity={0.4}
                stroke="#2563eb"
                strokeWidth={2.4}
              />
              {/* Inner Center Dot */}
              <rect
                x={p0.x - 2.5}
                y={p0.y - 2.5}
                width={5}
                height={5}
                fill="#2563eb"
              />
            </g>

            {/* End Anchor Point (Handle 'end' - Blue square frame matching screenshot) */}
            <g
              style={{ cursor: 'crosshair' }}
              onMouseDown={e => handleLineHandleMouseDown(e, line.id, 'end')}
            >
              {/* Invisible large hit box */}
              <rect x={p1.x - 22} y={p1.y - 22} width={44} height={44} fill="transparent" />
              {/* Blue Outer Box */}
              <rect
                x={p1.x - 12}
                y={p1.y - 12}
                width={24}
                height={24}
                rx={2}
                fill="#93c5fd"
                fillOpacity={0.4}
                stroke="#2563eb"
                strokeWidth={2.4}
              />
              {/* Inner Center Dot */}
              <rect
                x={p1.x - 2.5}
                y={p1.y - 2.5}
                width={5}
                height={5}
                fill="#2563eb"
              />
            </g>

            {/* Middle Curve Control Anchor Point (Handle 'control' - Blue translucent circle matching screenshot) */}
            <g
              style={{ cursor: 'pointer' }}
              onMouseDown={e => handleLineHandleMouseDown(e, line.id, 'control')}
            >
              {/* Invisible large hit area */}
              <circle cx={pc.x} cy={pc.y} r={24} fill="transparent" />
              {/* Translucent Blue Disc */}
              <circle
                cx={pc.x}
                cy={pc.y}
                r={13}
                fill="#3b82f6"
                fillOpacity={0.5}
                stroke="#2563eb"
                strokeWidth={2.4}
              />
              {/* Center Dot */}
              <circle cx={pc.x} cy={pc.y} r={4} fill="#1d4ed8" />
            </g>
          </g>
        )}
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

        {/* Center Operations Bar (Undo, Redo, Select All, Rotate, Duplicate, Delete, Zoom, Grid - Unified Top Bar) */}
        <div className={`flex items-center gap-1.5 p-1 rounded-2xl border transition-all flex-wrap ${
          selectedElementIds.length > 0 || selectedLineIds.length > 0
            ? 'bg-gray-950 border-emerald-500/70 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/30'
            : 'bg-gray-900/90 border-gray-800'
        }`}>
          {/* Undo / Redo */}
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

          <div className="w-[1px] h-4 bg-gray-700 mx-0.5" />

          {/* Selection indicator pill when items are active */}
          {(selectedElementIds.length > 0 || selectedLineIds.length > 0) && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-400 text-xs font-black">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>已选 {selectedElementIds.length + selectedLineIds.length} 个</span>
              <button
                onClick={handleClearSelection}
                title="取消选择 (Esc)"
                className="ml-1 text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
          )}

          {/* Pointer Select Mode */}
          <button
            onClick={() => setActiveToolMode('select')}
            title="选择与拖拽模式"
            className={`p-1.5 rounded-xl transition-colors ${
              activeToolMode === 'select' ? 'bg-emerald-600 text-white shadow-sm' : 'hover:bg-gray-800 text-gray-400'
            }`}
          >
            <MousePointer2 className="w-4 h-4" />
          </button>

          {/* Select All */}
          <button
            onClick={handleSelectAll}
            title="全选球场元素 (Ctrl+A)"
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors ${
              (selectedElementIds.length === elements.length && elements.length > 0)
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'hover:bg-gray-800 text-gray-300'
            }`}
          >
            全选
          </button>

          {/* Rotate Group */}
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
            title="旋转 +15°"
            className="px-2 py-1 rounded-xl hover:bg-gray-800 disabled:opacity-30 text-gray-300 flex items-center gap-1 text-xs font-bold transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>旋转</span>
          </button>

          {/* Duplicate Button */}
          <button
            onClick={handleDuplicateSelected}
            disabled={selectedElementIds.length === 0 && selectedLineIds.length === 0}
            title="复制选中元素 (Ctrl/Cmd+D)"
            className="px-2.5 py-1 rounded-xl hover:bg-gray-800 disabled:opacity-30 text-gray-300 flex items-center gap-1 text-xs font-bold transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>复制</span>
          </button>

          {/* Stepper + Scale Control Popover (Unified with +/- and direct slider) */}
          <div className="relative flex items-center bg-gray-950/80 px-1 py-0.5 rounded-xl border border-gray-700/80">
            <button
              onClick={() => handleScaleChange(Math.max(0.3, currentScaleValue - 0.1))}
              title="缩小元素 (-10%)"
              className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              onClick={() => setShowScalePopover(!showScalePopover)}
              title="点击打开缩放精准调节面板"
              className={`px-1.5 py-0.5 text-xs font-mono font-black rounded transition-colors ${
                showScalePopover
                  ? 'bg-emerald-600 text-white'
                  : selectedElementIds.length > 0
                  ? 'text-emerald-300 hover:bg-emerald-950'
                  : 'text-emerald-400 hover:bg-gray-800'
              }`}
            >
              {currentScaleValue.toFixed(2)}x
            </button>
            <button
              onClick={() => handleScaleChange(Math.min(2.5, currentScaleValue + 0.1))}
              title="放大元素 (+10%)"
              className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
            >
              <Plus className="w-3 h-3" />
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

                {/* Slider + Number Input */}
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

          {/* Delete Button */}
          <button
            onClick={handleDeleteSelected}
            disabled={selectedElementIds.length === 0 && selectedLineIds.length === 0}
            title="删除选中 (Delete/Backspace)"
            className={`px-2.5 py-1 rounded-xl flex items-center gap-1 text-xs font-bold transition-colors ${
              selectedElementIds.length > 0 || selectedLineIds.length > 0
                ? 'bg-red-950/90 hover:bg-red-900 text-red-300 border border-red-800/60 shadow-sm'
                : 'hover:bg-gray-800 disabled:opacity-30 text-gray-400'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>删除</span>
          </button>

          <div className="w-[1px] h-4 bg-gray-700 mx-0.5" />

          {/* Grid Toggle */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            title="网格参考开关"
            className={`p-1.5 rounded-xl transition-colors ${
              showGrid ? 'bg-emerald-950 text-emerald-400' : 'hover:bg-gray-800 text-gray-400'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>

          {/* Canvas Zoom */}
          <div className="flex items-center gap-1 px-1">
            <ZoomOut className="w-3.5 h-3.5 text-gray-400" />
            <input
              type="range"
              min="0.5"
              max="1.8"
              step="0.05"
              value={zoom}
              onChange={e => setZoom(parseFloat(e.target.value))}
              className="w-16 h-1 accent-emerald-500 cursor-pointer"
            />
            <span className="text-[10px] font-mono text-gray-300 w-8 font-bold">{zoom.toFixed(2)}x</span>
          </div>

          <div className="w-[1px] h-4 bg-gray-700 mx-0.5" />

          {/* Layer Ordering */}
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

          <div className="w-[1px] h-4 bg-gray-700 mx-0.5" />

          {/* Player Text / Number Input Field (Matching Image 1 UI) */}
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-xl border transition-all ${
            selectedElementIds.length > 0
              ? 'bg-gray-950 border-emerald-500 shadow-sm ring-1 ring-emerald-500/40'
              : 'bg-gray-950/60 border-gray-700/70'
          }`}>
            <Type className={`w-3.5 h-3.5 shrink-0 transition-colors ${
              selectedElementIds.length > 0 ? 'text-emerald-400' : 'text-gray-500'
            }`} />
            <input
              ref={playerInputRef}
              type="text"
              value={activeElementLabel}
              onChange={e => handleUpdateSelectedLabel(e.target.value)}
              placeholder={selectedElementIds.length > 0 ? "输入文字/编号" : "选球员输入"}
              disabled={selectedElementIds.length === 0}
              maxLength={8}
              className={`w-16 sm:w-20 bg-transparent text-xs font-bold text-center focus:outline-none transition-colors ${
                selectedElementIds.length > 0 ? 'text-emerald-300 placeholder:text-gray-500' : 'text-gray-500 placeholder:text-gray-600'
              }`}
              title="为选中的球员/元素输入汉字、数字或字母 (例如: 范, 10, GK, A)"
            />
          </div>
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
                onClick={() => {
                  setActiveCategory(tab.id as any);
                  if (tab.id === 'lines') {
                    setActiveToolMode('line');
                  } else {
                    setActiveToolMode('select');
                  }
                }}
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
            {/* 1. 区域 (Areas & Shapes) - Matches Image Exactly */}
            {activeCategory === 'areas' && (
              <div className="space-y-4 bg-gray-900/60 p-3 rounded-2xl border border-gray-800/80">
                {/* 顶部当前颜色 */}
                <div>
                  <div className="text-xs font-bold text-gray-300 mb-2.5">当前颜色:</div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {AREA_PALETTE_COLORS.map(c => {
                      const isChecked = selectedColor.toLowerCase() === c.id.toLowerCase();
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleColorChange(c.id)}
                          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-sm ${
                            c.border ? 'border border-gray-400' : 'border border-black/20'
                          } ${isChecked ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-gray-900 scale-110' : ''}`}
                          style={{ backgroundColor: c.bg }}
                          title={c.name || c.id}
                        >
                          {isChecked && (
                            <Check
                              className={`w-3.5 h-3.5 stroke-[3] ${
                                c.id === '#ffffff' || c.id === '#eab308' || c.id === '#facc15'
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
                <div className="border-t border-gray-800/80" />

                {/* 区域图形 2x2 Grid with Draggable Cards */}
                <div>
                  <div className="text-xs font-bold text-gray-300 mb-2.5">区域图形</div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {AREA_ITEMS.map(item => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/json', JSON.stringify({
                            type: item.type,
                            label: '',
                            shapeWidth: item.defaultWidth,
                            shapeHeight: item.defaultHeight
                          }));
                        }}
                        onClick={() => handleAddElement(item.type)}
                        className="group bg-[#111827] hover:bg-[#1e293b] border border-gray-800 hover:border-emerald-500/50 rounded-2xl p-3.5 flex flex-col items-center justify-center gap-2 cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02] shadow-sm select-none"
                        title={`点击添加或拖拽: ${item.label}`}
                      >
                        <div className="h-8 flex items-center justify-center">
                          {item.renderIcon()}
                        </div>
                        <span className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors">
                          {item.label}
                        </span>
                      </div>
                    ))}
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

            {/* 4. 线条 (Lines & Arrows) - Matches Image 1 UI */}
            {activeCategory === 'lines' && (
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

                {/* 线 (点选 + 绘制) Header & 2-Column Lines Grid */}
                <div>
                  <div className="text-xs font-extrabold text-gray-200 mb-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span>线</span>
                      <span className="text-gray-400 font-normal">（拖拽 / 点选绘制）</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-800/60 font-semibold">
                      在场地按住拉拽
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                    {LINE_TOOL_ITEMS.map(item => {
                      const isSelected = activeToolMode === 'line' && selectedLineType === item.id;
                      return (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('application/json', JSON.stringify({
                              category: 'line',
                              lineType: item.id
                            }));
                          }}
                          onClick={() => {
                            setSelectedLineType(item.id);
                            setActiveToolMode('line');
                            setSelectedElementIds([]);
                            setSelectedLineIds([]);
                          }}
                          className={`group relative h-20 sm:h-22 rounded-xl flex flex-col items-center justify-between p-2 cursor-pointer select-none transition-all ${
                            isSelected
                              ? 'bg-white ring-2 ring-emerald-500 border-2 border-emerald-500 shadow-md scale-[1.02]'
                              : 'bg-slate-100 hover:bg-white border border-slate-200/60 hover:scale-[1.02] hover:shadow-sm'
                          }`}
                          title={`点击选择此线条并在球场按住拉拽绘制，或直接拖拽到球场: ${item.name}`}
                        >
                          {/* Center Line Icon */}
                          <div className="flex-1 flex items-center justify-center w-full">
                            {item.renderIcon(selectedColor)}
                          </div>

                          {/* Bottom Label */}
                          <span className={`text-[11px] font-bold transition-colors leading-none tracking-tight text-center ${
                            isSelected ? 'text-emerald-700 font-extrabold' : 'text-gray-600 group-hover:text-gray-900'
                          }`}>
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 5. 标注 (Annotations) - Matches Image UI */}
            {activeCategory === 'annotations' && (
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

                {/* 标注（拖拽） Header & 3-Column Grid */}
                <div>
                  <div className="text-xs font-extrabold text-gray-200 mb-2.5 flex items-center gap-1.5">
                    <span>标注</span>
                    <span className="text-gray-400 font-normal">（拖拽）</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {ANNOTATION_ITEMS.map(item => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/json', JSON.stringify({
                            type: item.type,
                            label: item.defaultLabel !== undefined ? item.defaultLabel : ''
                          }));
                        }}
                        onClick={() => handleAddElement(item.type, item.defaultLabel)}
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
                className={`${dimClasses} relative rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-800/80 bg-gray-950 shrink-0 select-none cursor-default`}
              >
                {/* SVG Background Pitch */}
                <PitchSvgRenderer
                  pitchType={pitchType}
                  pitchTheme={pitchTheme}
                  showGrid={showGrid}
                  className="w-full h-full pointer-events-none"
                />

                {/* Marquee Selection Drag Box Overlay */}
                {isMarqueeSelecting && marqueeBox && !isCapturing && (
                  <div
                    className="marquee-box absolute border-2 border-dashed border-emerald-400 bg-emerald-500/20 rounded-md pointer-events-none z-50 transition-none shadow-md"
                    style={{
                      left: `${Math.min(marqueeBox.startX, marqueeBox.currentX)}%`,
                      top: `${Math.min(marqueeBox.startY, marqueeBox.currentY)}%`,
                      width: `${Math.abs(marqueeBox.currentX - marqueeBox.startX)}%`,
                      height: `${Math.abs(marqueeBox.currentY - marqueeBox.startY)}%`
                    }}
                  />
                )}

                {/* SVG Lines Overlay */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-auto"
                  viewBox="0 0 1000 1000"
                  preserveAspectRatio="none"
                  style={{ zIndex: 15 }}
                >
                  {lines.map(renderSvgLine)}

                  {/* Real-time Live Line Drawing Preview (Click -> Drag -> Release) */}
                  {isDrawingLine && lineStartPoint && lineCurrentPoint && (
                    <g className="pointer-events-none opacity-90">
                      {renderSvgLine({
                        id: 'live-drawing-preview-line',
                        type: selectedLineType,
                        startX: lineStartPoint.x,
                        startY: lineStartPoint.y,
                        endX: lineCurrentPoint.x,
                        endY: lineCurrentPoint.y,
                        controlX: (lineStartPoint.x + lineCurrentPoint.x) / 2,
                        controlY: (lineStartPoint.y + lineCurrentPoint.y) / 2,
                        color: selectedColor
                      })}
                      {/* Starting point anchor dot */}
                      <circle
                        cx={lineStartPoint.x * 10}
                        cy={lineStartPoint.y * 10}
                        r={7.5}
                        fill={selectedColor}
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                    </g>
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

      {/* Coach Publish Approval Workflow Modal */}
      <PublishApprovalModal
        isOpen={showPublishApprovalModal}
        onClose={() => setShowPublishApprovalModal(false)}
        onConfirm={handleConfirmPublishChoice}
        contentTypeName="示意图"
        title={title}
        currentUser={currentUser}
      />
    </div>
  );
};
