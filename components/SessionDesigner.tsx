
import React, { useState, useRef, useEffect } from 'react';
import { DrillDesign, DesignElement, DesignLine, PitchType, ElementType, LineType, User } from '../types';
import { Plus, Save, Trash2, Layout, User as UserIcon, Circle, Box, Flag, ArrowRight, Minus, Move, RotateCw, Image as ImageIcon, ChevronRight, PenTool, FileText, Type as TypeIcon, Grid as GridIcon, Cone as ConeIcon, Crosshair, Hexagon, Component, Film, Video, Layers, ChevronLeft, Activity } from 'lucide-react';

interface SessionDesignerProps {
    designs: DrillDesign[];
    onSaveDesign: (design: DrillDesign) => void;
    onDeleteDesign: (id: string) => void;
    currentUser: User | null;
}

// Color Palette from Image
const COLORS = [
    { id: 'blue', hex: '#3B82F6' },
    { id: 'green', hex: '#22C55E' },
    { id: 'yellow', hex: '#FACC15' },
    { id: 'red', hex: '#EF4444' },
    { id: 'black', hex: '#1F2937' },
    { id: 'grey', hex: '#9CA3AF' },
    { id: 'white', hex: '#FFFFFF', border: true },
];

type Category = 'equipment' | 'players' | 'lines' | 'annotations' | 'areas';

const SessionDesigner: React.FC<SessionDesignerProps> = ({ designs, onSaveDesign, onDeleteDesign, currentUser }) => {
    const [viewMode, setViewMode] = useState<'list' | 'editor'>('list');
    const [currentDesign, setCurrentDesign] = useState<DrillDesign | null>(null);
    
    // Editor State
    const [activeCategory, setActiveCategory] = useState<Category>('equipment');
    const [selectedColor, setSelectedColor] = useState<string>(COLORS[3].hex); // Default red
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [activeTool, setActiveTool] = useState<'select' | 'line'>('select');
    const [lineType, setLineType] = useState<LineType>('Pass');
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawingStart, setDrawingStart] = useState<{x: number, y: number} | null>(null);
    
    const canvasRef = useRef<HTMLDivElement>(null);

    // Initial Design Template
    const createNewDesign = () => {
        const newDesign: DrillDesign = {
            id: Date.now().toString(),
            title: '未命名教案',
            category: 'Drill',
            pitchType: 'Full',
            elements: [],
            lines: [],
            description: '',
            keyPoints: [],
            createdAt: new Date().toISOString().split('T')[0],
            authorId: currentUser?.id
        };
        setCurrentDesign(newDesign);
        setViewMode('editor');
    };

    const handleEditDesign = (design: DrillDesign) => {
        setCurrentDesign(JSON.parse(JSON.stringify(design)));
        setViewMode('editor');
    };

    const handleSave = () => {
        if (currentDesign) {
            if (!currentDesign.title.trim()) {
                alert('请输入教案标题');
                return;
            }
            onSaveDesign(currentDesign);
            setViewMode('list');
        }
    };

    // --- Drag and Drop Logic ---
    const handleDragStart = (e: React.DragEvent, type: ElementType) => {
        e.dataTransfer.setData('elementType', type);
        e.dataTransfer.setData('elementColor', selectedColor);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (!canvasRef.current || !currentDesign) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        const type = e.dataTransfer.getData('elementType') as ElementType;
        const color = e.dataTransfer.getData('elementColor') || selectedColor;
        
        if (type) {
            const newElement: DesignElement = {
                id: Date.now().toString(),
                type,
                x,
                y,
                rotation: 0,
                color,
                label: type === 'Player' ? '' : undefined
            };
            setCurrentDesign({
                ...currentDesign,
                elements: [...currentDesign.elements, newElement]
            });
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    // --- Element Interaction ---
    const updateElement = (id: string, updates: Partial<DesignElement>) => {
        if (!currentDesign) return;
        const updatedElements = currentDesign.elements.map(el => 
            el.id === id ? { ...el, ...updates } : el
        );
        setCurrentDesign({ ...currentDesign, elements: updatedElements });
    };

    const deleteSelected = () => {
        if (!currentDesign || !selectedElementId) return;
        const els = currentDesign.elements.filter(e => e.id !== selectedElementId);
        const lines = currentDesign.lines.filter(l => l.id !== selectedElementId);
        setCurrentDesign({ ...currentDesign, elements: els, lines });
        setSelectedElementId(null);
    };

    // --- Drawing Logic ---
    const handleCanvasClick = (e: React.MouseEvent) => {
        if (!currentDesign || !canvasRef.current) return;
        if ((e.target as HTMLElement).closest('.design-element')) return; // Don't draw if clicking element

        if (activeTool === 'select') {
            setSelectedElementId(null);
            return;
        }

        const rect = canvasRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        if (!isDrawing) {
            setIsDrawing(true);
            setDrawingStart({ x, y });
        } else {
            if (drawingStart) {
                const newLine: DesignLine = {
                    id: Date.now().toString(),
                    type: lineType,
                    startX: drawingStart.x,
                    startY: drawingStart.y,
                    endX: x,
                    endY: y,
                    color: selectedColor
                };
                setCurrentDesign({
                    ...currentDesign,
                    lines: [...currentDesign.lines, newLine]
                });
            }
            setIsDrawing(false);
            setDrawingStart(null);
            // Switch back to select after drawing? Optional.
            // setActiveTool('select'); 
        }
    };

    // --- Renderers ---

    // 1. Equipment & Elements
    const renderElement = (el: DesignElement) => {
        const isSelected = selectedElementId === el.id;
        const style: React.CSSProperties = {
            left: `${el.x}%`,
            top: `${el.y}%`,
            position: 'absolute',
            transform: `translate(-50%, -50%) rotate(${el.rotation}deg) scale(${el.scale || 1})`,
            zIndex: isSelected ? 100 : 10
        };

        const color = el.color || '#000000';
        let content = null;

        // Visual Definitions
        switch (el.type) {
            case 'Player':
                content = (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm text-[10px] font-bold text-white relative" style={{ backgroundColor: color }}>
                        {el.label}
                        {/* Orientation Marker */}
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[4px] border-b-white"></div>
                    </div>
                );
                break;
            case 'GK':
                content = (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm text-[10px] font-bold text-white bg-yellow-500">GK</div>
                );
                break;
            case 'Ball':
                content = <div className="w-3 h-3 bg-white border border-gray-800 rounded-full shadow-sm flex items-center justify-center text-[6px]">⚽</div>;
                break;
            case 'AgilityRing': // 敏捷圈
                content = <div className="w-6 h-6 rounded-full border-4 opacity-80" style={{ borderColor: color }}></div>;
                break;
            case 'Pole': // 标志杆
                content = <div className="w-1.5 h-6 rounded-full border border-black/20" style={{ backgroundColor: color }}></div>;
                break;
            case 'Cone': // 标志桶
                content = (
                    <div className="flex flex-col items-center">
                        <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[8px]" style={{ borderBottomColor: color }}></div>
                        <div className="w-3 h-1 rounded-full mt-[1px]" style={{ backgroundColor: color }}></div>
                    </div>
                );
                break;
            case 'Marker': // 标志盘
                content = <div className="w-4 h-4 rounded-full opacity-90 shadow-sm border border-white/30" style={{ backgroundColor: color }}>
                    <div className="w-1 h-1 bg-black/20 rounded-full mx-auto mt-1"></div>
                </div>;
                break;
            case 'Ladder': // 敏捷梯
                content = (
                    <div className="w-20 h-5 flex border-t-2 border-b-2" style={{ borderColor: color }}>
                        {[1,2,3,4].map(i => <div key={i} className="flex-1 border-r-2 last:border-r-0" style={{ borderColor: color }}></div>)}
                    </div>
                );
                break;
            case 'Hurdle': // 小跨栏
                content = <div className="w-6 h-3 border-t-2 border-l-2 border-r-2" style={{ borderColor: color }}></div>;
                break;
            case 'Mannequin': // 人形架
                content = (
                    <div className="flex flex-col items-center opacity-90">
                        <div className="w-4 h-4 rounded-full mb-0.5" style={{ backgroundColor: color }}></div>
                        <div className="w-6 h-8 rounded-t-lg rounded-b-sm" style={{ backgroundColor: color }}></div>
                    </div>
                );
                break;
            case 'Rebounder': // 回弹板
                content = <div className="w-8 h-2 bg-black skew-x-12 border border-gray-500"></div>;
                break;
            case 'Goal': // 标准球门
                content = <div className="w-16 h-5 border-2 border-white bg-white/10 relative">
                    <div className="absolute inset-0 grid grid-cols-6 grid-rows-2 opacity-30"><div className="border border-white/50 col-span-6 row-span-2"></div></div>
                </div>;
                break;
            case 'MiniGoal': // 小球门
                content = <div className="w-6 h-3 border-2 border-white bg-white/10 rounded-sm"></div>;
                break;
            case 'Text':
                content = <div className="text-sm font-bold whitespace-nowrap" style={{ color: color }}>{el.label || 'Text'}</div>;
                break;
            default:
                content = <div className="w-4 h-4 bg-gray-500 rounded-full"></div>;
        }

        return (
            <div 
                key={el.id}
                className={`design-element cursor-grab active:cursor-grabbing ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-green-600' : ''}`}
                style={style}
                onClick={(e) => { e.stopPropagation(); setSelectedElementId(el.id); }}
                onMouseDown={(e) => e.stopPropagation()} // Simplified drag prevention for now
            >
                {content}
            </div>
        );
    };

    // 2. Lines (SVG)
    const renderLine = (line: DesignLine) => {
        const isSelected = selectedElementId === line.id;
        const strokeColor = isSelected ? '#ffffff' : line.color;
        const strokeWidth = isSelected ? 4 : 2;
        const opacity = isSelected ? 1 : 0.9;

        let pathProps: React.SVGProps<SVGPathElement | SVGLineElement> = {
            stroke: strokeColor,
            strokeWidth: strokeWidth,
            fill: "none",
            opacity: opacity,
            onClick: (e) => { e.stopPropagation(); setSelectedElementId(line.id); }
        };

        const markerId = `arrow-${line.id}`;

        // Define Marker
        const marker = (
            <defs>
                <marker id={markerId} markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                    <path d="M0,0 L0,6 L9,3 z" fill={strokeColor} />
                </marker>
            </defs>
        );

        if (line.type === 'Dribble') {
            // Wavy Line Logic
            // Calculate distance and angle
            const dx = line.endX - line.startX;
            const dy = line.endY - line.startY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            
            // Create a wavy path string relative to 0,0
            // We'll scale the wave frequency based on distance
            const waveCount = Math.max(2, Math.floor(dist / 5)); // Approx wave every 5%
            let d = `M 0 0`;
            const step = dist / waveCount;
            for (let i = 0; i < waveCount; i++) {
                // Quadratic bezier for simple wave
                // q dx dy, x y (relative)
                // We alternate up and down
                const sign = i % 2 === 0 ? 1 : -1;
                d += ` q ${step/2} ${sign * 2}, ${step} 0`;
            }

            return (
                <g key={line.id} className="cursor-pointer hover:opacity-100">
                    {marker}
                    <path 
                        d={d}
                        {...pathProps}
                        transform={`translate(${line.startX} ${line.startY}) rotate(${angle})`}
                        markerEnd={`url(#${markerId})`}
                        vectorEffect="non-scaling-stroke" // Helps with scaling issues if any
                    />
                </g>
            );
        } else if (line.type === 'Run') {
            // Dashed Line
            return (
                <g key={line.id} className="cursor-pointer">
                    {marker}
                    <line 
                        x1={`${line.startX}%`} y1={`${line.startY}%`} 
                        x2={`${line.endX}%`} y2={`${line.endY}%`} 
                        {...(pathProps as any)}
                        strokeDasharray="4,4"
                        markerEnd={`url(#${markerId})`}
                    />
                </g>
            );
        } else if (line.type === 'Boundary') {
             return (
                <line 
                    key={line.id}
                    x1={`${line.startX}%`} y1={`${line.startY}%`} 
                    x2={`${line.endX}%`} y2={`${line.endY}%`} 
                    {...(pathProps as any)}
                    strokeDasharray="2,2"
                    strokeWidth={1}
                    className="cursor-pointer"
                />
            );
        } else {
            // Pass (Solid)
            return (
                <g key={line.id} className="cursor-pointer">
                    {marker}
                    <line 
                        x1={`${line.startX}%`} y1={`${line.startY}%`} 
                        x2={`${line.endX}%`} y2={`${line.endY}%`} 
                        {...(pathProps as any)}
                        markerEnd={`url(#${markerId})`}
                    />
                </g>
            );
        }
    };

    // --- Main Render ---

    if (viewMode === 'list') {
        return (
            <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-black text-bvb-black uppercase">教案设计库</h2>
                        <p className="text-gray-500">创建、管理训练图解与战术板。</p>
                    </div>
                    <button onClick={createNewDesign} className="flex items-center px-4 py-2 bg-bvb-yellow text-bvb-black font-bold rounded-lg shadow-md hover:brightness-105">
                        <Plus className="w-5 h-5 mr-2" /> 新建教案
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto pb-10">
                    {designs.map(design => (
                        <div key={design.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all group flex flex-col h-64">
                            <div className="h-32 bg-green-600 relative flex items-center justify-center border-b border-gray-100">
                                <div className="w-full h-full opacity-30 bg-[url('https://www.transparenttextures.com/patterns/grass.png')]"></div>
                                <Layout className="w-10 h-10 text-white/50 absolute" />
                                <div className="absolute bottom-2 right-2 text-[10px] bg-black/50 text-white px-2 py-0.5 rounded backdrop-blur-sm">
                                    {design.pitchType}
                                </div>
                            </div>
                            <div className="p-4 flex-1 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase bg-gray-100 px-1.5 py-0.5 rounded">{design.category}</span>
                                        <span className="text-[10px] text-gray-400">{design.createdAt}</span>
                                    </div>
                                    <h3 className="font-bold text-gray-800 text-lg mt-1 line-clamp-1">{design.title}</h3>
                                    <p className="text-xs text-gray-500 line-clamp-2 mt-1 h-8">{design.description || '无描述...'}</p>
                                </div>
                                <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
                                    <button onClick={() => onDeleteDesign(design.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4"/></button>
                                    <button onClick={() => handleEditDesign(design)} className="px-3 py-1.5 bg-bvb-black text-white text-xs font-bold rounded hover:bg-gray-800 flex items-center">
                                        编辑 <ChevronRight className="w-3 h-3 ml-1" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {designs.length === 0 && (
                        <div className="col-span-full py-20 text-center text-gray-400 flex flex-col items-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4"><PenTool className="w-8 h-8 opacity-20" /></div>
                            <p>暂无教案设计，点击右上角新建。</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // EDITOR MODE LAYOUT
    return (
        <div className="flex h-[calc(100vh-100px)] bg-gray-100 -m-4 md:-m-8 relative overflow-hidden">
            
            {/* 1. Narrow Dark Sidebar (Navigation) */}
            <div className="w-14 bg-gray-900 flex flex-col items-center py-4 gap-4 z-30 shrink-0">
                <button onClick={() => setViewMode('list')} className="p-2 bg-gray-800 rounded-lg text-white hover:bg-gray-700 mb-2"><ChevronLeft className="w-5 h-5"/></button>
                <div className="w-8 h-[1px] bg-gray-700 mb-2"></div>
                
                {[
                    { id: 'areas', icon: Layout }, // Using layout icon for Area/Zone
                    { id: 'equipment', icon: ConeIcon },
                    { id: 'players', icon: UserIcon },
                    { id: 'lines', icon: Component }, // Component icon resembles lines/nodes
                    { id: 'annotations', icon: TypeIcon },
                ].map(cat => (
                    <button 
                        key={cat.id} 
                        onClick={() => setActiveCategory(cat.id as Category)}
                        className={`p-2 rounded-lg transition-all relative ${activeCategory === cat.id ? 'bg-bvb-yellow text-bvb-black' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                        title={cat.id}
                    >
                        <cat.icon className="w-6 h-6" />
                        {activeCategory === cat.id && <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-bvb-yellow rotate-45 translate-x-1"></div>}
                    </button>
                ))}
            </div>

            {/* 2. Light Drawer (Asset Panel) */}
            <div className="w-64 bg-white border-r border-gray-200 flex flex-col z-20 shadow-lg shrink-0">
                {/* Header Title */}
                <div className="p-4 pb-2">
                    <h3 className="text-xl font-black text-gray-800 capitalize">
                        {activeCategory === 'equipment' && '训练器材'}
                        {activeCategory === 'players' && '球员角色'}
                        {activeCategory === 'lines' && '线条工具'}
                        {activeCategory === 'annotations' && '标注符号'}
                        {activeCategory === 'areas' && '场地设置'}
                    </h3>
                </div>

                {/* Color Palette (Visible for adding new items) */}
                <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">选择颜色</p>
                    <div className="flex gap-2 flex-wrap">
                        {COLORS.map(c => (
                            <button
                                key={c.id}
                                onClick={() => setSelectedColor(c.hex)}
                                className={`w-6 h-6 rounded shadow-sm transition-transform hover:scale-110 ${selectedColor === c.hex ? 'ring-2 ring-offset-1 ring-bvb-black scale-110' : ''}`}
                                style={{ backgroundColor: c.hex, border: c.border ? '1px solid #e5e7eb' : 'none' }}
                            />
                        ))}
                    </div>
                </div>

                {/* Scrollable Asset List */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    
                    {/* EQUIPMENT */}
                    {activeCategory === 'equipment' && (
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { type: 'AgilityRing', label: '敏捷圈', icon: <div className="w-8 h-8 rounded-full border-4 border-red-500"></div> },
                                { type: 'Pole', label: '标志杆', icon: <div className="w-1 h-8 bg-red-500 rounded-full mx-auto"></div> },
                                { type: 'Cone', label: '标志桶', icon: <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[12px] border-b-red-500 mx-auto"></div> },
                                { type: 'Marker', label: '标志盘', icon: <div className="w-6 h-6 bg-red-500 rounded-full mx-auto opacity-80"></div> },
                                { type: 'Ladder', label: '敏捷梯', icon: <GridIcon className="w-8 h-8 text-gray-500" /> },
                                { type: 'Hurdle', label: '小跨栏', icon: <div className="w-8 h-4 border-t-4 border-l-4 border-r-4 border-gray-500 mx-auto mt-2"></div> },
                                { type: 'Mannequin', label: '人形架', icon: <UserIcon className="w-8 h-8 text-gray-500" /> },
                                { type: 'Rebounder', label: '回弹板', icon: <div className="w-8 h-4 bg-black skew-x-12 mx-auto"></div> },
                                { type: 'Goal', label: '标准门', icon: <div className="w-10 h-6 border-2 border-gray-800 mx-auto grid grid-cols-4 bg-gray-100"><div className="border-r border-gray-300 col-span-4 h-full"></div></div> },
                                { type: 'MiniGoal', label: '小球门', icon: <div className="w-6 h-4 border-2 border-gray-800 rounded mx-auto"></div> },
                                { type: 'Ball', label: '足球', icon: <div className="w-6 h-6 bg-white border border-black rounded-full flex items-center justify-center text-[8px] shadow-sm">⚽</div> },
                            ].map(item => (
                                <div 
                                    key={item.type}
                                    draggable 
                                    onDragStart={e => handleDragStart(e, item.type as ElementType)}
                                    className="flex flex-col items-center justify-center p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-yellow-50 hover:border-bvb-yellow cursor-grab active:cursor-grabbing transition-colors"
                                >
                                    <div className="mb-2">{item.icon}</div>
                                    <span className="text-xs text-gray-500 font-bold">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* PLAYERS */}
                    {activeCategory === 'players' && (
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { type: 'Player', label: '球员', color: '#3B82F6', icon: <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shadow-md">10</div> },
                                { type: 'GK', label: '门将', color: '#FACC15', icon: <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-white text-xs font-bold shadow-md">GK</div> },
                                { type: 'Neutral', label: '自由人', color: '#22C55E', icon: <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold shadow-md">N</div> },
                                { type: 'Coach', label: '教练', color: '#1F2937', icon: <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white text-xs font-bold shadow-md">C</div> },
                            ].map(item => (
                                <div 
                                    key={item.type}
                                    draggable 
                                    onDragStart={e => handleDragStart(e, item.type as ElementType)}
                                    className="flex flex-col items-center justify-center p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-yellow-50 hover:border-bvb-yellow cursor-grab active:cursor-grabbing"
                                >
                                    <div className="mb-2">{item.icon}</div>
                                    <span className="text-xs text-gray-500 font-bold">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* LINES */}
                    {activeCategory === 'lines' && (
                        <div className="space-y-2">
                            <p className="text-xs text-gray-400 mb-2">点击选择线型，然后在画板上点击起点和终点。</p>
                            {[
                                { type: 'Pass', label: '传球/射门 (实线)', icon: <Minus className="w-6 h-6" /> },
                                { type: 'Run', label: '无球跑动 (虚线)', icon: <Minus className="w-6 h-6" strokeDasharray="4,4" /> },
                                { type: 'Dribble', label: '运球 (波浪线)', icon: <Activity className="w-6 h-6" /> },
                                { type: 'Boundary', label: '区域边界 (虚线)', icon: <Minus className="w-6 h-6 text-gray-400" strokeDasharray="2,2" /> },
                            ].map(line => (
                                <button
                                    key={line.type}
                                    onClick={() => { setActiveTool('line'); setLineType(line.type as LineType); }}
                                    className={`w-full flex items-center p-3 rounded-lg border transition-all ${
                                        activeTool === 'line' && lineType === line.type 
                                        ? 'bg-bvb-black text-white border-bvb-black shadow-md' 
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="mr-3">{line.icon}</div>
                                    <span className="text-sm font-bold">{line.label}</span>
                                </button>
                            ))}
                            <button
                                onClick={() => setActiveTool('select')}
                                className={`w-full flex items-center p-3 rounded-lg border transition-all mt-4 ${
                                    activeTool === 'select'
                                    ? 'bg-bvb-yellow text-bvb-black border-bvb-yellow shadow-md'
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                <Move className="w-5 h-5 mr-3" />
                                <span className="text-sm font-bold">选择 / 移动模式</span>
                            </button>
                        </div>
                    )}

                    {/* ANNOTATIONS */}
                    {activeCategory === 'annotations' && (
                        <div className="grid grid-cols-2 gap-3">
                             <div 
                                draggable 
                                onDragStart={e => handleDragStart(e, 'Text')}
                                className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-yellow-50 cursor-grab"
                             >
                                 <TypeIcon className="w-6 h-6 mb-2 text-gray-600" />
                                 <span className="text-xs font-bold text-gray-500">纯文本</span>
                             </div>
                             {/* Placeholder for future annotation types */}
                             <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg border border-gray-100 opacity-50 cursor-not-allowed">
                                 <Crosshair className="w-6 h-6 mb-2 text-gray-400" />
                                 <span className="text-xs font-bold text-gray-400">距离标注</span>
                             </div>
                        </div>
                    )}

                    {/* AREAS / PITCH */}
                    {activeCategory === 'areas' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">场地类型</label>
                                <select 
                                    className="w-full p-2 border rounded-lg text-sm bg-gray-50 font-bold"
                                    value={currentDesign?.pitchType}
                                    onChange={e => setCurrentDesign(currentDesign ? {...currentDesign, pitchType: e.target.value as PitchType} : null)}
                                >
                                    <option value="Full">全场 (Full Pitch)</option>
                                    <option value="Half">半场 (Half Pitch)</option>
                                    <option value="Box">禁区 (Penalty Box)</option>
                                    <option value="Portrait">纵向半场 (Portrait)</option>
                                </select>
                            </div>
                            <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700 leading-relaxed">
                                提示：更改场地类型可能会导致现有元素位置偏移，建议在开始设计前确定场地。
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* 3. Center Canvas Area */}
            <div className="flex-1 bg-gray-200 relative overflow-hidden flex flex-col">
                {/* Top Bar inside Canvas Area */}
                <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-10 shrink-0">
                    <input 
                        className="font-black text-xl text-gray-800 border-none focus:ring-0 p-0 placeholder-gray-300 bg-transparent w-full max-w-md" 
                        value={currentDesign?.title} 
                        onChange={e => setCurrentDesign(currentDesign ? {...currentDesign, title: e.target.value} : null)}
                        placeholder="输入教案标题..."
                    />
                    <div className="flex items-center gap-2">
                        {selectedElementId && (
                            <button onClick={deleteSelected} className="flex items-center px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-xs font-bold transition-colors">
                                <Trash2 className="w-3 h-3 mr-1" /> 删除选中
                            </button>
                        )}
                        <button onClick={handleSave} className="flex items-center px-4 py-2 bg-bvb-black text-white font-bold rounded-lg hover:bg-gray-800 text-sm shadow-lg transform active:scale-95 transition-all ml-2">
                            <Save className="w-4 h-4 mr-2" /> 保存设计
                        </button>
                    </div>
                </div>

                {/* The Pitch */}
                <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-gray-200/50">
                    <div 
                        ref={canvasRef}
                        className={`relative bg-[#2e8b57] shadow-2xl transition-all duration-300 select-none ${
                            currentDesign?.pitchType === 'Portrait' ? 'aspect-[3/4] h-full max-h-[800px]' : 'aspect-[16/9] w-full max-w-6xl'
                        }`}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onClick={handleCanvasClick}
                        style={{
                            backgroundImage: `
                                repeating-linear-gradient(90deg, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 2px, transparent 2px, transparent 100px),
                                repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 100px)
                            `,
                            backgroundSize: '100% 100%'
                        }}
                    >
                        {/* Pitch Markings (SVG Overlay) */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-60" xmlns="http://www.w3.org/2000/svg">
                            <rect width="100%" height="100%" fill="none" stroke="white" strokeWidth="2" />
                            <circle cx="50%" cy="50%" r="10%" fill="none" stroke="white" strokeWidth="2" />
                            <line x1="50%" y1="0" x2="50%" y2="100%" stroke="white" strokeWidth="2" />
                            
                            {/* Simple Goal Areas */}
                            <rect x="0" y="30%" width="12%" height="40%" fill="none" stroke="white" strokeWidth="2" />
                            <rect x="0" y="40%" width="5%" height="20%" fill="none" stroke="white" strokeWidth="2" />
                            
                            <rect x="88%" y="30%" width="12%" height="40%" fill="none" stroke="white" strokeWidth="2" />
                            <rect x="95%" y="40%" width="5%" height="20%" fill="none" stroke="white" strokeWidth="2" />
                        </svg>

                        {/* User Lines Layer */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
                            {currentDesign?.lines.map(line => renderLine(line))}
                            {isDrawing && drawingStart && (
                                <line 
                                    x1={`${drawingStart.x}%`} y1={`${drawingStart.y}%`} 
                                    x2={`${drawingStart.x}%`} y2={`${drawingStart.y}%`} // Visual feedback endpoint needs mouse tracking, using static for now
                                    stroke={selectedColor} strokeWidth="2" strokeDasharray="5,5" 
                                />
                            )}
                        </svg>

                        {/* User Elements Layer */}
                        {currentDesign?.elements.map(el => renderElement(el))}

                    </div>
                </div>
            </div>

            {/* 4. Right Details Panel */}
            <div className="w-72 bg-white border-l border-gray-200 flex flex-col z-20 shadow-lg shrink-0">
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-bold text-xs text-gray-500 uppercase flex items-center"><FileText className="w-3 h-3 mr-2" /> 教案详情与属性</h3>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    
                    {/* Selected Item Properties Editor */}
                    {selectedElementId ? (
                        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 mb-4 animate-in slide-in-from-right-2">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-yellow-800 uppercase">选中项属性</span>
                                <button onClick={() => setSelectedElementId(null)} className="text-xs text-yellow-600 hover:underline">取消选择</button>
                            </div>
                            {/* Common Properties */}
                            {currentDesign?.elements.find(e => e.id === selectedElementId) && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-yellow-700 mb-1">旋转角度</label>
                                        <input 
                                            type="range" min="0" max="360" 
                                            className="w-full h-1 bg-yellow-200 rounded-lg appearance-none cursor-pointer"
                                            value={currentDesign.elements.find(e => e.id === selectedElementId)?.rotation || 0}
                                            onChange={(e) => updateElement(selectedElementId, { rotation: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-yellow-700 mb-1">标签/号码</label>
                                        <input 
                                            className="w-full p-1 border border-yellow-300 rounded text-xs bg-white focus:outline-none"
                                            value={currentDesign.elements.find(e => e.id === selectedElementId)?.label || ''}
                                            onChange={(e) => updateElement(selectedElementId, { label: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-yellow-700 mb-1">颜色</label>
                                        <div className="flex gap-1">
                                            {COLORS.map(c => (
                                                <button
                                                    key={c.id}
                                                    onClick={() => updateElement(selectedElementId, { color: c.hex })}
                                                    className="w-4 h-4 rounded border border-black/10"
                                                    style={{ backgroundColor: c.hex }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-4 text-gray-400 text-xs italic border-b border-gray-100 pb-6">
                            未选择任何元素，点击画布上的元素进行编辑。
                        </div>
                    )}

                    {/* General Text Fields */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">分类</label>
                            <select 
                                className="w-full p-2 border rounded text-sm bg-gray-50"
                                value={currentDesign?.category}
                                onChange={e => setCurrentDesign(currentDesign ? {...currentDesign, category: e.target.value as any} : null)}
                            >
                                <option value="Drill">基础训练 (Drill)</option>
                                <option value="Tactic">战术演练 (Tactic)</option>
                                <option value="SetPiece">定位球 (Set Piece)</option>
                                <option value="Other">其他</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">训练描述 / 规则</label>
                            <textarea 
                                className="w-full p-2 border rounded text-sm bg-gray-50 min-h-[100px] focus:ring-2 focus:ring-bvb-yellow outline-none"
                                placeholder="描述训练流程..."
                                value={currentDesign?.description}
                                onChange={e => setCurrentDesign(currentDesign ? {...currentDesign, description: e.target.value} : null)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">指导要点 (Key Points)</label>
                            <textarea 
                                className="w-full p-2 border rounded text-sm bg-gray-50 min-h-[80px] focus:ring-2 focus:ring-bvb-yellow outline-none"
                                placeholder="每行一个要点..."
                                value={currentDesign?.keyPoints.join('\n')}
                                onChange={e => setCurrentDesign(currentDesign ? {...currentDesign, keyPoints: e.target.value.split('\n')} : null)}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SessionDesigner;
