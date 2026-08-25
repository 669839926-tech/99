import React from 'react';
import { DrillDesign, DesignElement, DesignLine, PitchType, PitchTheme } from '../../types';
import { PitchSvgRenderer } from './PitchSvgRenderer';

interface DiagramPreviewBoxProps {
  diagram?: DrillDesign | null;
  pitchType?: PitchType;
  pitchTheme?: PitchTheme;
  elements?: DesignElement[];
  lines?: DesignLine[];
  previewImage?: string;
  className?: string;
  showGrid?: boolean;
  maxHeight?: string;
  size?: 'sm' | 'md' | 'lg' | 'responsive' | 'auto';
}

// Generate wavy bezier path for dribble lines
function generateWavyBezierPath(
  p0: { x: number; y: number },
  pc: { x: number; y: number },
  p1: { x: number; y: number },
  numWaves: number = 8,
  amplitude: number = 14
): string {
  const steps = numWaves * 4;
  const points: { x: number; y: number }[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const invT = 1 - t;
    const bx = invT * invT * p0.x + 2 * invT * t * pc.x + t * t * p1.x;
    const by = invT * invT * p0.y + 2 * invT * t * pc.y + t * t * p1.y;

    const dx = 2 * (1 - t) * (pc.x - p0.x) + 2 * t * (p1.x - pc.x);
    const dy = 2 * (1 - t) * (pc.y - p0.y) + 2 * t * (p1.y - pc.y);
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    const waveOffset = Math.sin((t * Math.PI * 2 * numWaves)) * amplitude;
    points.push({ x: bx + nx * waveOffset, y: by + ny * waveOffset });
  }

  if (points.length === 0) return '';
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)}`;
  }
  return d;
}

const FIXED_BLACK_EQUIPMENT_TYPES = [
  'Goal', 'MiniGoal', 'MinimalGoal', 'AgilityRing', 'Ladder', 'Hurdle', 'Pole', 'Mannequin', 'Rebounder', 'DistanceMeter'
];

export const DiagramPreviewBox: React.FC<DiagramPreviewBoxProps> = ({
  diagram,
  pitchType: propPitchType,
  pitchTheme: propPitchTheme,
  elements: propElements,
  lines: propLines,
  previewImage: propPreviewImage,
  className = '',
  showGrid = true,
  size = 'auto'
}) => {
  const effectivePitchType: PitchType = propPitchType || diagram?.pitchType || 'Midfield';
  const effectivePitchTheme: PitchTheme = propPitchTheme || diagram?.pitchTheme || 'Grass';
  const effectiveElements: DesignElement[] = propElements || diagram?.elements || [];
  const effectiveLines: DesignLine[] = propLines || diagram?.lines || [];
  const effectivePreviewImage: string | undefined = propPreviewImage || diagram?.previewImage;

  const isVertical = effectivePitchType === 'Portrait' || effectivePitchType === 'FutsalVertical' || effectivePitchType === 'RectangleVertical';
  const isSquare = effectivePitchType === 'SquareBox' || effectivePitchType === 'FourGrids' || effectivePitchType === 'HalfDefend' || effectivePitchType === 'HalfAttack';
  const isTwoThirdsVertical = effectivePitchType === 'TwoThirdsDefend' || effectivePitchType === 'TwoThirdsAttack';

  const aspectClass = isVertical
    ? 'aspect-[10/15]'
    : isSquare
    ? 'aspect-square'
    : isTwoThirdsVertical
    ? 'aspect-[10/13]'
    : 'aspect-[16/10]';

  let dimClasses = "";
  if (size === 'lg') {
    if (isVertical) {
      dimClasses = "w-[480px] h-[720px] sm:w-[520px] sm:h-[780px]";
    } else if (isSquare) {
      dimClasses = "w-[540px] h-[540px] sm:w-[600px] sm:h-[600px]";
    } else if (isTwoThirdsVertical) {
      dimClasses = "w-[520px] h-[676px] sm:w-[560px] sm:h-[728px]";
    } else {
      dimClasses = "w-[720px] h-[480px] sm:w-[780px] sm:h-[520px]";
    }
  } else if (size === 'sm') {
    dimClasses = `w-full max-w-[340px] ${aspectClass}`;
  } else if (size === 'md') {
    dimClasses = `w-full max-w-[440px] ${aspectClass}`;
  } else if (size === 'responsive') {
    dimClasses = `w-full h-full max-w-full max-h-full ${aspectClass}`;
  } else {
    // auto: adapt to aspect ratio and allow container / className to control dimensions
    dimClasses = `w-full ${aspectClass}`;
  }

  // If high-resolution rendered raster image is available and valid
  if (effectivePreviewImage && effectivePreviewImage.length > 50) {
    return (
      <div className={`relative overflow-hidden rounded-2xl shadow-2xl border-4 border-gray-800 bg-gray-950 flex items-center justify-center shrink-0 ${dimClasses} ${className}`}>
        <img
          src={effectivePreviewImage}
          alt={diagram?.title || '战术示意图'}
          className="w-full h-full object-contain pointer-events-none select-none"
        />
      </div>
    );
  }

  // Fallback: Rich SVG pitch + SVG lines + Full fidelity elements
  const renderSvgLine = (line: DesignLine) => {
    const color = line.color || '#ffffff';
    const markerId = `preview-arrowhead-${line.id}`;

    const p0 = { x: line.startX * 10, y: line.startY * 10 };
    const p1 = { x: line.endX * 10, y: line.endY * 10 };
    const pc = {
      x: (line.controlX !== undefined ? line.controlX : (line.startX + line.endX) / 2) * 10,
      y: (line.controlY !== undefined ? line.controlY : (line.startY + line.endY) / 2) * 10
    };

    const marker = (
      <defs key={`defs-${line.id}`}>
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
          strokeWidth={2.8}
          fill="none"
          markerEnd={`url(#${markerId})`}
        />
      );
    } else if (line.type === 'Run') {
      pathContent = (
        <path
          d={mainBezierD}
          stroke={color}
          strokeWidth={2.6}
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
          strokeWidth={3.0}
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
          strokeWidth={2.2}
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
            strokeWidth={2.6}
            fill="none"
          />
          <circle cx={p0.x} cy={p0.y} r={7.5} fill={color} stroke="#0f172a" strokeWidth={2} />
          <circle cx={p1.x} cy={p1.y} r={7.5} fill={color} stroke="#0f172a" strokeWidth={2} />
        </g>
      );
    } else {
      pathContent = (
        <path
          d={mainBezierD}
          stroke={color}
          strokeWidth={3.0}
          fill="none"
          markerEnd={`url(#${markerId})`}
        />
      );
    }

    return (
      <g key={line.id}>
        {marker}
        {pathContent}
      </g>
    );
  };

  const renderElement = (el: DesignElement) => {
    const isFixedBlack = FIXED_BLACK_EQUIPMENT_TYPES.includes(el.type);
    const color = isFixedBlack ? '#111827' : (el.color || '#ef4444');
    const elementScale = typeof el.scale === 'number' && !isNaN(el.scale) ? el.scale : (el.type === 'Ball' ? 0.55 : 1);

    const isArea = el.type === 'AreaSquare' || el.type === 'AreaRect' || el.type === 'AreaCircle' || el.type === 'AreaTriangle' || el.type === 'AreaDiamond' || el.type.startsWith('Area');
    const shapeWidth = el.shapeWidth || (el.type === 'AreaRect' ? 160 : el.type === 'AreaTriangle' ? 130 : 120);
    const shapeHeight = el.shapeHeight || (el.type === 'AreaRect' ? 100 : el.type === 'AreaTriangle' ? 110 : 120);

    const style: React.CSSProperties = {
      left: `${el.x}%`,
      top: `${el.y}%`,
      position: 'absolute',
      transform: `translate(-50%, -50%) rotate(${el.rotation || 0}deg) scale(${isArea ? 1 : elementScale})`,
      transformOrigin: 'center center',
      zIndex: isArea ? 10 : 20,
      userSelect: 'none',
      pointerEvents: 'none',
      ...(isArea ? { width: `${shapeWidth}px`, height: `${shapeHeight}px` } : {})
    };

    let innerContent: React.ReactNode = null;

    switch (el.type) {
      case 'PlayerRing':
        innerContent = (
          <div
            className="w-6 h-6 rounded-full border-[2.5px] border-slate-900 shadow-md flex items-center justify-center font-black text-xs"
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
            <path d="M7 26 C7 14, 29 14, 29 26" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
            <line x1="7" y1="26" x2="29" y2="26" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        );
        break;

      case 'PlayerStar':
        innerContent = (
          <svg className="w-6 h-6 drop-shadow-sm" viewBox="0 0 36 36">
            <polygon points="18,3 22.5,12.5 33,14 25.5,21.5 27.5,32 18,27 8.5,32 10.5,21.5 3,14 13.5,12.5" fill={color} stroke="white" strokeWidth="1" strokeLinejoin="round" />
          </svg>
        );
        break;

      case 'PlayerDiamond':
        innerContent = (
          <svg className="w-6 h-6 drop-shadow-sm" viewBox="0 0 36 36">
            <polygon points="18,5 31,18 18,31 5,18" fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" />
          </svg>
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
          <svg className="w-6 h-7 drop-shadow-sm select-none" viewBox="0 0 32 32">
            <polygon points="16,19 29,24 16,29 3,24" fill={color} stroke="#000000" strokeOpacity="0.18" strokeWidth="0.8" />
            <path
              d="M 8 23.5 L 13.5 5 Q 16 3.5 18.5 5 L 24 23.5 Q 16 26.5 8 23.5 Z"
              fill={color}
              stroke="#000000"
              strokeOpacity="0.15"
              strokeWidth="0.8"
            />
            <path d="M 14 9 Q 16 10.5 18 9" fill="none" stroke="#000000" strokeOpacity="0.28" strokeWidth="1.1" />
            <path d="M 12 13.5 Q 16 15.5 20 13.5" fill="none" stroke="#000000" strokeOpacity="0.28" strokeWidth="1.1" />
            <path d="M 10 18 Q 16 20.5 22 18" fill="none" stroke="#000000" strokeOpacity="0.28" strokeWidth="1.1" />
            <path d="M 8.5 22.5 Q 16 25.5 23.5 22.5" fill="none" stroke="#000000" strokeOpacity="0.32" strokeWidth="1.1" />
          </svg>
        );
        break;

      case 'Marker':
        innerContent = (
          <svg className="w-6 h-5 drop-shadow-sm select-none" viewBox="0 0 32 32">
            <path
              d="M 3 20 Q 16 25.5 29 20 L 22.5 10.5 Q 16 8.5 9.5 10.5 Z"
              fill={color}
              stroke="#000000"
              strokeOpacity="0.18"
              strokeWidth="0.8"
            />
            <path d="M 4.5 18.5 Q 16 23.8 27.5 18.5" fill="none" stroke="#000000" strokeOpacity="0.25" strokeWidth="1.1" />
            <path d="M 7 15 Q 16 19.8 25 15" fill="none" stroke="#000000" strokeOpacity="0.25" strokeWidth="1.1" />
            <path d="M 9.5 12 Q 16 16 22.5 12" fill="none" stroke="#000000" strokeOpacity="0.28" strokeWidth="1.1" />
            <ellipse cx="16" cy="10" rx="3.5" ry="1.4" fill="#000000" fillOpacity="0.35" />
            <ellipse cx="16" cy="10" rx="1.8" ry="0.8" fill="#000000" fillOpacity="0.6" />
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
          <svg className="w-7 h-5 drop-shadow-sm" viewBox="0 0 36 24">
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
          <svg className="w-7 h-5 drop-shadow-sm" viewBox="0 0 40 24">
            <path d="M8 20 L8 7 L32 7 L32 20" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="square" />
            <path d="M5 20 L11 20 M29 20 L35 20" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        );
        break;

      case 'Mannequin':
        innerContent = (
          <svg className="w-6 h-12 drop-shadow-sm select-none" viewBox="0 0 26 52">
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
            <path
              d="M 10 10 L 4.5 13 Q 4 15 4.5 28 L 21.5 28 Q 22 15 21.5 13 L 16 10 Z"
              fill={color}
              stroke="#000000"
              strokeOpacity="0.2"
              strokeWidth="0.8"
            />
            <line x1="6.5" y1="28" x2="7.5" y2="47" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
            <line x1="10.5" y1="28" x2="10.5" y2="47" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
            <line x1="15.5" y1="28" x2="15.5" y2="47" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
            <line x1="19.5" y1="28" x2="18.5" y2="47" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
            <rect x="5.5" y="47" width="15" height="3" rx="1" fill="#1e293b" />
          </svg>
        );
        break;

      case 'Rebounder':
        innerContent = (
          <svg className="w-8 h-5 drop-shadow-sm" viewBox="0 0 48 24">
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
            <polygon
              points="8,10 72,10 65,42 15,42"
              fill="#ffffff22"
              stroke={color}
              strokeWidth="1"
              strokeDasharray="2,2"
            />
            <line x1="15" y1="42" x2="65" y2="42" stroke={color} strokeWidth="2.8" strokeLinecap="round" opacity="0.9" />
            <line x1="8" y1="10" x2="15" y2="42" stroke={color} strokeWidth="2.4" strokeLinecap="round" opacity="0.9" />
            <line x1="72" y1="10" x2="65" y2="42" stroke={color} strokeWidth="2.4" strokeLinecap="round" opacity="0.9" />
            <line x1="8" y1="10" x2="8" y2="18" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
            <line x1="8" y1="10" x2="8" y2="18" stroke={color} strokeWidth="2.8" strokeLinecap="round" />
            <line x1="72" y1="10" x2="72" y2="18" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
            <line x1="72" y1="10" x2="72" y2="18" stroke={color} strokeWidth="2.8" strokeLinecap="round" />
            <line x1="8" y1="10" x2="72" y2="10" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
            <line x1="8" y1="10" x2="72" y2="10" stroke={color} strokeWidth="2.8" strokeLinecap="round" />
            <circle cx="8" cy="10" r="3.2" fill="#ffffff" stroke="#1f2937" strokeWidth="1" />
            <circle cx="72" cy="10" r="3.2" fill="#ffffff" stroke="#1f2937" strokeWidth="1" />
          </svg>
        );
        break;

      case 'Goal':
        innerContent = (
          <svg className="w-24 h-13 drop-shadow-xl select-none" viewBox="0 0 128 64">
            <polygon
              points="10,12 118,12 108,56 20,56"
              fill="#ffffff28"
              stroke={color}
              strokeWidth="1.2"
              strokeDasharray="3,3"
            />
            <line x1="20" y1="56" x2="108" y2="56" stroke={color} strokeWidth="3" strokeLinecap="round" />
            <line x1="10" y1="12" x2="20" y2="56" stroke={color} strokeWidth="2.8" strokeLinecap="round" />
            <line x1="118" y1="12" x2="108" y2="56" stroke={color} strokeWidth="2.8" strokeLinecap="round" />
            <line x1="10" y1="12" x2="10" y2="24" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
            <line x1="10" y1="12" x2="10" y2="24" stroke={color} strokeWidth="3.6" strokeLinecap="round" />
            <line x1="118" y1="12" x2="118" y2="24" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
            <line x1="118" y1="12" x2="118" y2="24" stroke={color} strokeWidth="3.6" strokeLinecap="round" />
            <line x1="10" y1="12" x2="118" y2="12" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
            <line x1="10" y1="12" x2="118" y2="12" stroke={color} strokeWidth="3.6" strokeLinecap="round" />
            <circle cx="10" cy="12" r="4" fill="#ffffff" stroke="#111827" strokeWidth="1.2" />
            <circle cx="118" cy="12" r="4" fill="#ffffff" stroke="#111827" strokeWidth="1.2" />
          </svg>
        );
        break;

      case 'BadgeNumber': {
        const badgeVal = el.label || '1';
        const isLightBg = color === '#ffffff' || color === '#eab308' || color === '#facc15';
        const textColor = isLightBg ? '#0f172a' : '#ffffff';
        const strokeColor = color === '#ffffff' ? '#cbd5e1' : 'rgba(255,255,255,0.4)';
        const fontSize = badgeVal.length > 2 ? 11 : badgeVal.length === 2 ? 13 : 15;

        innerContent = (
          <div className="w-7 h-7 min-w-[28px] min-h-[28px] flex items-center justify-center select-none drop-shadow-md">
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

      case 'Text':
        innerContent = (
          <div
            className="px-2 py-0.5 text-xs font-bold whitespace-nowrap select-none text-center rounded drop-shadow-sm"
            style={{ color: color }}
          >
            {el.label || '文字'}
          </div>
        );
        break;

      case 'DistanceMeter':
        innerContent = (
          <div className="flex items-center gap-1 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded-full border border-gray-600 text-[10px] font-mono font-black text-amber-300 shadow-md">
            <span>↔</span>
            <span>{el.label || '10m'}</span>
          </div>
        );
        break;

      case 'TextLabel':
        innerContent = (
          <div
            className="px-2.5 py-1 rounded-lg text-xs font-bold shadow-md select-none border whitespace-nowrap"
            style={{
              backgroundColor: `${color}f0`,
              borderColor: color === '#ffffff' ? '#94a3b8' : '#00000030',
              color: color === '#ffffff' || color === '#facc15' ? '#0f172a' : '#ffffff'
            }}
          >
            {el.label || '说明文字'}
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

      // Default: Player circle with label or number (e.g. 7, 10, GK, or dot)
      default:
        innerContent = (
          <div
            className="w-7 h-7 rounded-full border-2 border-white shadow-md flex items-center justify-center font-black text-xs text-white"
            style={{ backgroundColor: color }}
          >
            {el.label || ''}
          </div>
        );
    }

    return (
      <div key={el.id} style={style}>
        {innerContent}
      </div>
    );
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-800 bg-gray-950 flex items-center justify-center shrink-0 ${dimClasses} ${className}`}>
      {/* Background SVG pitch */}
      <PitchSvgRenderer
        pitchType={effectivePitchType}
        pitchTheme={effectivePitchTheme}
        showGrid={showGrid}
        className="w-full h-full pointer-events-none"
      />

      {/* SVG Lines Overlay */}
      {effectiveLines.length > 0 && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
          style={{ zIndex: 15 }}
        >
          {effectiveLines.map(renderSvgLine)}
        </svg>
      )}

      {/* Canvas Elements Overlay */}
      {effectiveElements.length > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          {effectiveElements.map(renderElement)}
        </div>
      )}
    </div>
  );
};
