import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DrillDesign, DesignElement, DesignLine, PitchType, PitchTheme, ElementType, LineType, User, DiagramKeyframe } from '../../types';
import { PRESET_COLORS } from './constants';
import { PitchSvgRenderer } from './PitchSvgRenderer';
import {
  Undo, Redo, RotateCcw, RotateCw, Copy, Trash2, Grid, ZoomOut,
  ArrowUp, ArrowDown, Type, Save, Download, Eye, EyeOff,
  Plus, Minus, Play, Pause, Repeat, ChevronLeft,
  MousePointer2, Square, Circle, Triangle, Send
} from 'lucide-react';
import html2canvas from 'html2canvas';

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
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  
  // Canvas View Controls
  const [zoom, setZoom] = useState<number>(1.0);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [isDrawingLine, setIsDrawingLine] = useState(false);
  const [lineStartPoint, setLineStartPoint] = useState<{ x: number; y: number } | null>(null);

  // Dragging state for elements
  const [draggedElementId, setDraggedElementId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Keyframe Actions
  const handleSelectKeyframe = (index: number, kfArray = keyframes) => {
    if (kfArray[index]) {
      setCurrentKeyframeIndex(index);
      setElements(kfArray[index].elements);
      setLines(kfArray[index].lines);
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
    const newEl: DesignElement = {
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type,
      x: 50,
      y: 50,
      rotation: 0,
      scale: 1,
      color: selectedColor,
      label: label || (type.includes('Player') ? '10' : type === 'BadgeNumber' ? '①' : ''),
      shapeWidth: type.includes('Area') ? 120 : undefined,
      shapeHeight: type.includes('Area') ? 80 : undefined
    };
    const nextEls = [...elements, newEl];
    updateCurrentKeyframeState(nextEls, lines);
    setSelectedElementId(newEl.id);
  };

  const handleDuplicateSelected = () => {
    if (selectedElementId) {
      const target = elements.find(e => e.id === selectedElementId);
      if (target) {
        const cloned: DesignElement = {
          ...target,
          id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          x: Math.min(92, target.x + 4),
          y: Math.min(92, target.y + 4)
        };
        const nextEls = [...elements, cloned];
        updateCurrentKeyframeState(nextEls, lines);
        setSelectedElementId(cloned.id);
      }
    } else if (selectedLineId) {
      const targetLine = lines.find(l => l.id === selectedLineId);
      if (targetLine) {
        const clonedLine: DesignLine = {
          ...targetLine,
          id: `line-${Date.now()}`,
          startX: targetLine.startX + 3,
          startY: targetLine.startY + 3,
          endX: targetLine.endX + 3,
          endY: targetLine.endY + 3
        };
        const nextLines = [...lines, clonedLine];
        updateCurrentKeyframeState(elements, nextLines);
        setSelectedLineId(clonedLine.id);
      }
    }
  };

  const handleDeleteSelected = () => {
    if (selectedElementId) {
      const nextEls = elements.filter(e => e.id !== selectedElementId);
      updateCurrentKeyframeState(nextEls, lines);
      setSelectedElementId(null);
    } else if (selectedLineId) {
      const nextLines = lines.filter(l => l.id !== selectedLineId);
      updateCurrentKeyframeState(elements, nextLines);
      setSelectedLineId(null);
    }
  };

  const handleRotateSelected = (angleDelta: number) => {
    if (!selectedElementId) return;
    const nextEls = elements.map(el => {
      if (el.id === selectedElementId) {
        return { ...el, rotation: (el.rotation + angleDelta) % 360 };
      }
      return el;
    });
    updateCurrentKeyframeState(nextEls, lines);
  };

  // Keyboard Shortcuts: Ctrl/Cmd+D (Duplicate), Delete/Backspace (Delete), Ctrl+Z (Undo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        handleDuplicateSelected();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

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
    if (!selectedElementId) return;
    const el = elements.find(e => e.id === selectedElementId);
    if (!el) return;
    const nextEls = [...elements.filter(e => e.id !== selectedElementId), el];
    updateCurrentKeyframeState(nextEls, lines);
  };

  const handleSendToBack = () => {
    if (!selectedElementId) return;
    const el = elements.find(e => e.id === selectedElementId);
    if (!el) return;
    const nextEls = [el, ...elements.filter(e => e.id !== selectedElementId)];
    updateCurrentKeyframeState(nextEls, lines);
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    if (selectedElementId) {
      const nextEls = elements.map(el => el.id === selectedElementId ? { ...el, color } : el);
      updateCurrentKeyframeState(nextEls, lines);
    }
    if (selectedLineId) {
      const nextLines = lines.map(l => l.id === selectedLineId ? { ...l, color } : l);
      updateCurrentKeyframeState(elements, nextLines);
    }
  };

  // Canvas Mouse Events for Line Drawing & Element Dragging
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
      setSelectedElementId(null);
      setSelectedLineId(null);
    }
  };

  const handleElementMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedElementId(id);
    setSelectedLineId(null);
    setDraggedElementId(id);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!draggedElementId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * 100;
    let y = ((e.clientY - rect.top) / rect.height) * 100;

    // Constrain to canvas boundaries
    x = Math.max(3, Math.min(97, x));
    y = Math.max(3, Math.min(97, y));

    setElements(prev => prev.map(el => el.id === draggedElementId ? { ...el, x, y } : el));
  };

  const handleCanvasMouseUp = () => {
    if (draggedElementId) {
      setDraggedElementId(null);
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
    const isSelected = selectedElementId === el.id;
    const color = el.color || '#ef4444';

    const style: React.CSSProperties = {
      left: `${el.x}%`,
      top: `${el.y}%`,
      position: 'absolute',
      transform: `translate(-50%, -50%) rotate(${el.rotation}deg) scale(${el.scale || 1})`,
      zIndex: isSelected ? 40 : 20,
      cursor: 'move',
      userSelect: 'none'
    };

    let innerContent = null;
    switch (el.type) {
      case 'PlayerCircle':
        innerContent = (
          <div
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-white shadow-md flex items-center justify-center font-black text-xs text-white"
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
              className="w-6 h-6 rounded-full border-2 border-white shadow-md flex items-center justify-center text-[10px] font-black text-white"
              style={{ backgroundColor: color }}
            >
              {el.label || 'O'}
            </div>
            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-white -mt-0.5" />
          </div>
        );
        break;

      case 'Defender':
        innerContent = (
          <div
            className="w-7 h-7 rounded-lg border-2 border-white shadow-md flex items-center justify-center font-black text-xs text-white"
            style={{ backgroundColor: color }}
          >
            {el.label || 'X'}
          </div>
        );
        break;

      case 'GK':
        innerContent = (
          <div className="w-8 h-8 rounded-full border-2 border-white bg-amber-400 shadow-md flex items-center justify-center text-[10px] font-black text-gray-900">
            GK
          </div>
        );
        break;

      case 'Coach':
        innerContent = (
          <div className="w-8 h-8 rounded-full border-2 border-white bg-indigo-600 shadow-md flex items-center justify-center text-[10px] font-black text-white">
            教练
          </div>
        );
        break;

      case 'Referee':
        innerContent = (
          <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-900 shadow-md flex items-center justify-center text-[10px] font-black text-yellow-300">
            裁判
          </div>
        );
        break;

      case 'Ball':
        innerContent = (
          <div className="w-5 h-5 rounded-full bg-white border border-gray-900 shadow-md flex items-center justify-center text-[10px]">
            ⚽
          </div>
        );
        break;

      case 'Cone':
        innerContent = (
          <div
            className="w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-b-[18px] drop-shadow-sm"
            style={{ borderBottomColor: color }}
          />
        );
        break;

      case 'Marker':
        innerContent = (
          <div
            className="w-6 h-2 rounded-full border border-black/20 shadow-sm"
            style={{ backgroundColor: color }}
          />
        );
        break;

      case 'Pole':
        innerContent = (
          <div
            className="w-1.5 h-10 rounded-full border border-black/20 shadow-sm"
            style={{ backgroundColor: color }}
          />
        );
        break;

      case 'AgilityRing':
        innerContent = (
          <div
            className="w-8 h-8 rounded-full border-2 bg-transparent shadow-sm"
            style={{ borderColor: color }}
          />
        );
        break;

      case 'Ladder':
        innerContent = (
          <div className="w-24 h-7 flex border-2 border-yellow-300 rounded-sm bg-yellow-300/10">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex-1 border-r-2 border-yellow-300 last:border-r-0" />
            ))}
          </div>
        );
        break;

      case 'Hurdle':
        innerContent = (
          <div className="w-12 h-4 border-t-2 border-l-2 border-r-2 border-orange-500 rounded-t-sm" />
        );
        break;

      case 'Mannequin':
        innerContent = (
          <div className="flex flex-col items-center">
            <div className="w-4 h-4 rounded-full bg-red-600 border border-white" />
            <div className="w-6 h-8 bg-red-600 rounded-b-sm border-x border-b border-white" />
          </div>
        );
        break;

      case 'Rebounder':
        innerContent = (
          <div className="w-14 h-5 border-2 border-blue-500 bg-blue-500/20 rounded-sm flex items-center justify-center text-[8px] text-blue-200">
            回传网
          </div>
        );
        break;

      case 'MiniGoal':
        innerContent = (
          <div className="w-12 h-5 border-2 border-white bg-white/20 rounded-sm shadow-md" />
        );
        break;

      case 'Goal':
        innerContent = (
          <div className="w-24 h-8 border-2 border-white bg-white/20 relative shadow-lg">
            <div className="absolute inset-0 grid grid-cols-4 border border-white/30" />
          </div>
        );
        break;

      case 'BadgeNumber':
        innerContent = (
          <div
            className="w-6 h-6 rounded-full border border-white text-white font-black text-xs flex items-center justify-center shadow-md"
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
              width: el.shapeWidth || 100,
              height: el.shapeHeight || 70,
              borderColor: color,
              backgroundColor: `${color}25`
            }}
          >
            {el.label || '训练限制区'}
          </div>
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
        className={`transition-transform duration-75 ${
          isSelected ? 'ring-2 ring-bvb-yellow ring-offset-2 ring-offset-black/50 scale-110 z-50' : ''
        }`}
      >
        {innerContent}
      </div>
    );
  };

  // Line SVG Renderer
  const renderSvgLine = (line: DesignLine) => {
    const isSelected = selectedLineId === line.id;
    const color = isSelected ? '#facc15' : line.color;
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
      strokeWidth: isSelected ? 3.5 : 2.5,
      fill: 'none',
      onClick: (e: any) => {
        e.stopPropagation();
        setSelectedLineId(line.id);
        setSelectedElementId(null);
      },
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

        {/* Center Operations Bar (Undo, Redo, Rotate, Duplicate, Delete, Zoom, Grid) */}
        <div className="flex items-center gap-1.5 bg-gray-900/90 p-1 rounded-2xl border border-gray-800 flex-wrap">
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            title="撤销"
            className="p-1.5 rounded-xl hover:bg-gray-800 disabled:opacity-30 text-gray-300 transition-colors"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            title="恢复"
            className="p-1.5 rounded-xl hover:bg-gray-800 disabled:opacity-30 text-gray-300 transition-colors"
          >
            <Redo className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-gray-700 mx-1" />

          <button
            onClick={() => setActiveToolMode('select')}
            title="移动/选择模式"
            className={`p-1.5 rounded-xl transition-colors ${
              activeToolMode === 'select' ? 'bg-emerald-600 text-white' : 'hover:bg-gray-800 text-gray-400'
            }`}
          >
            <MousePointer2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleRotateSelected(-15)}
            disabled={!selectedElementId}
            title="左转 -15°"
            className="p-1.5 rounded-xl hover:bg-gray-800 disabled:opacity-30 text-gray-300 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleRotateSelected(15)}
            disabled={!selectedElementId}
            title="右转 +15°"
            className="p-1.5 rounded-xl hover:bg-gray-800 disabled:opacity-30 text-gray-300 transition-colors"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleDuplicateSelected}
            disabled={!selectedElementId && !selectedLineId}
            title="复制选中元素 (Ctrl/Cmd+D)"
            className="p-1.5 rounded-xl hover:bg-gray-800 disabled:opacity-30 text-gray-300 transition-colors"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={handleDeleteSelected}
            disabled={!selectedElementId && !selectedLineId}
            title="删除选中 (Delete)"
            className="p-1.5 rounded-xl hover:bg-red-950 text-red-400 disabled:opacity-30 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>

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
            disabled={!selectedElementId}
            title="置顶图层"
            className="p-1.5 rounded-xl hover:bg-gray-800 disabled:opacity-30 text-gray-300"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <button
            onClick={handleSendToBack}
            disabled={!selectedElementId}
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
        <div className="w-64 sm:w-72 bg-gray-950 border-r border-gray-800 flex flex-col z-20 shrink-0">
          
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

          {/* Color Palette Row */}
          <div className="p-3 border-b border-gray-800/80 bg-gray-900/40">
            <span className="text-[10px] font-bold text-gray-400 block mb-1.5">当前颜色:</span>
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

          {/* Tab Specific Tools List */}
          <div className="p-3 overflow-y-auto flex-1 custom-scrollbar space-y-4">
            {/* 1. 区域 (Areas & Shapes) */}
            {activeCategory === 'areas' && (
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
            )}

            {/* 2. 器材 (Equipment) */}
            {activeCategory === 'equipment' && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-400">训练器材</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleAddElement('Cone')}
                    className="p-2.5 bg-gray-900 hover:bg-gray-800 rounded-xl border border-gray-800 flex flex-col items-center gap-1 text-xs font-bold"
                  >
                    <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[14px] border-b-orange-500" />
                    <span>矮圆锥</span>
                  </button>
                  <button
                    onClick={() => handleAddElement('Marker')}
                    className="p-2.5 bg-gray-900 hover:bg-gray-800 rounded-xl border border-gray-800 flex flex-col items-center gap-1 text-xs font-bold"
                  >
                    <div className="w-6 h-2 bg-yellow-400 rounded-full" />
                    <span>标志碟</span>
                  </button>
                  <button
                    onClick={() => handleAddElement('Pole')}
                    className="p-2.5 bg-gray-900 hover:bg-gray-800 rounded-xl border border-gray-800 flex flex-col items-center gap-1 text-xs font-bold"
                  >
                    <div className="w-1.5 h-6 bg-red-500 rounded-full" />
                    <span>标志杆</span>
                  </button>
                  <button
                    onClick={() => handleAddElement('Ball')}
                    className="p-2.5 bg-gray-900 hover:bg-gray-800 rounded-xl border border-gray-800 flex flex-col items-center gap-1 text-xs font-bold"
                  >
                    <span className="text-base">⚽</span>
                    <span>足球</span>
                  </button>
                  <button
                    onClick={() => handleAddElement('Ladder')}
                    className="p-2.5 bg-gray-900 hover:bg-gray-800 rounded-xl border border-gray-800 flex flex-col items-center gap-1 text-xs font-bold"
                  >
                    <div className="w-8 h-3 border border-yellow-400 grid grid-cols-3" />
                    <span>敏捷梯</span>
                  </button>
                  <button
                    onClick={() => handleAddElement('AgilityRing')}
                    className="p-2.5 bg-gray-900 hover:bg-gray-800 rounded-xl border border-gray-800 flex flex-col items-center gap-1 text-xs font-bold"
                  >
                    <div className="w-5 h-5 rounded-full border-2 border-cyan-400" />
                    <span>敏捷圈</span>
                  </button>
                  <button
                    onClick={() => handleAddElement('Hurdle')}
                    className="p-2.5 bg-gray-900 hover:bg-gray-800 rounded-xl border border-gray-800 flex flex-col items-center gap-1 text-xs font-bold"
                  >
                    <div className="w-7 h-2 border-t-2 border-x-2 border-orange-400" />
                    <span>小障碍</span>
                  </button>
                  <button
                    onClick={() => handleAddElement('Mannequin')}
                    className="p-2.5 bg-gray-900 hover:bg-gray-800 rounded-xl border border-gray-800 flex flex-col items-center gap-1 text-xs font-bold"
                  >
                    <div className="w-4 h-6 bg-red-600 rounded-sm" />
                    <span>人型墙</span>
                  </button>
                  <button
                    onClick={() => handleAddElement('MiniGoal')}
                    className="p-2.5 bg-gray-900 hover:bg-gray-800 rounded-xl border border-gray-800 flex flex-col items-center gap-1 text-xs font-bold"
                  >
                    <div className="w-8 h-3 border border-white" />
                    <span>迷你门</span>
                  </button>
                  <button
                    onClick={() => handleAddElement('Goal')}
                    className="p-2.5 bg-gray-900 hover:bg-gray-800 rounded-xl border border-gray-800 flex flex-col items-center gap-1 text-xs font-bold"
                  >
                    <div className="w-10 h-4 border-2 border-white" />
                    <span>标准门</span>
                  </button>
                </div>
              </div>
            )}

            {/* 3. 人员 (Personnel) */}
            {activeCategory === 'personnel' && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-400">场上人员</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleAddElement('PlayerCircle', '10')}
                    className="p-2.5 bg-gray-900 hover:bg-gray-800 rounded-xl border border-gray-800 flex flex-col items-center gap-1 text-xs font-bold"
                  >
                    <div className="w-6 h-6 rounded-full bg-blue-600 border border-white flex items-center justify-center text-[10px] text-white">
                      10
                    </div>
                    <span>进攻队员</span>
                  </button>
                  <button
                    onClick={() => handleAddElement('Defender', 'X')}
                    className="p-2.5 bg-gray-900 hover:bg-gray-800 rounded-xl border border-gray-800 flex flex-col items-center gap-1 text-xs font-bold"
                  >
                    <div className="w-6 h-6 rounded-md bg-red-600 border border-white flex items-center justify-center text-[10px] text-white">
                      X
                    </div>
                    <span>防守队员</span>
                  </button>
                  <button
                    onClick={() => handleAddElement('PlayerCircle', 'N')}
                    className="p-2.5 bg-gray-900 hover:bg-gray-800 rounded-xl border border-gray-800 flex flex-col items-center gap-1 text-xs font-bold"
                  >
                    <div className="w-6 h-6 rounded-full bg-yellow-400 border border-white flex items-center justify-center text-[10px] text-gray-900">
                      N
                    </div>
                    <span>中立队员</span>
                  </button>
                  <button
                    onClick={() => handleAddElement('GK', 'GK')}
                    className="p-2.5 bg-gray-900 hover:bg-gray-800 rounded-xl border border-gray-800 flex flex-col items-center gap-1 text-xs font-bold"
                  >
                    <div className="w-6 h-6 rounded-full bg-amber-500 border border-white flex items-center justify-center text-[9px] text-gray-900">
                      GK
                    </div>
                    <span>守门员</span>
                  </button>
                  <button
                    onClick={() => handleAddElement('Coach', '教练')}
                    className="p-2.5 bg-gray-900 hover:bg-gray-800 rounded-xl border border-gray-800 flex flex-col items-center gap-1 text-xs font-bold"
                  >
                    <div className="w-6 h-6 rounded-full bg-indigo-600 border border-white flex items-center justify-center text-[9px] text-white">
                      教
                    </div>
                    <span>教练员</span>
                  </button>
                  <button
                    onClick={() => handleAddElement('Referee', '裁判')}
                    className="p-2.5 bg-gray-900 hover:bg-gray-800 rounded-xl border border-gray-800 flex flex-col items-center gap-1 text-xs font-bold"
                  >
                    <div className="w-6 h-6 rounded-full bg-gray-900 border border-yellow-300 flex items-center justify-center text-[9px] text-yellow-300">
                      裁
                    </div>
                    <span>裁判员</span>
                  </button>
                </div>
              </div>
            )}

            {/* 4. 线条 (Lines & Arrows) */}
            {activeCategory === 'lines' && (
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
            )}

            {/* 5. 标注 (Annotations) */}
            {activeCategory === 'annotations' && (
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
            )}
          </div>
        </div>

        {/* Center Canvas Area with Zoom Container */}
        <div
          className="flex-1 bg-gray-900 flex items-center justify-center p-4 sm:p-8 overflow-auto relative"
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
        >
          <div
            ref={canvasRef}
            onClick={handleCanvasMouseDown}
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
              transition: 'transform 0.1s ease-out'
            }}
            className="w-[780px] h-[520px] sm:w-[840px] sm:h-[560px] relative rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-800/80 bg-gray-950 shrink-0"
          >
            {/* SVG Background Pitch */}
            <PitchSvgRenderer
              pitchType={pitchType}
              pitchTheme={pitchTheme}
              showGrid={showGrid}
              className="w-full h-full pointer-events-none"
            />

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
