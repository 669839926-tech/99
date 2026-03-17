
import React, { useState, useRef, useEffect } from 'react';
import { DrillDesign, DesignElement, DesignLine, PitchType, PitchTheme, ElementType, LineType, User } from '../types';
import { Plus, Save, Trash2, Layout, User as UserIcon, ArrowRight, Move, RotateCw, ChevronRight, PenTool, Type as TypeIcon, Cone as ConeIcon, Component, Activity, ChevronLeft, Palette, CheckCircle, X, Maximize2, Monitor } from 'lucide-react';

interface SessionDesignerProps {
    designs: DrillDesign[];
    onSaveDesign: (design: DrillDesign) => void;
    onDeleteDesign: (id: string) => void;
    currentUser: User | null;
}

const THEMES: { id: PitchTheme; label: string; bg: string; line: string }[] = [
    { id: 'Grass', label: '经典草地', bg: '#2e8b57', line: '#ffffff' },
    { id: 'Blue', label: '天青蓝', bg: '#005bb7', line: '#ffffff' },
    { id: 'Grey', label: '专业灰色', bg: '#555555', line: '#eeeeee' },
    { id: 'White', label: '极简白', bg: '#ffffff', line: '#333333' },
    { id: 'Black', label: '极简黑', bg: '#1a1a1a', line: '#ffffff' },
];

const PITCH_ZONES: { id: PitchType; label: string; preview: string }[] = [
    { id: 'Full', label: '完整球场', preview: 'M 5 5 H 95 V 95 H 5 Z M 50 5 V 95 M 50 50 m -10 0 a 10 10 0 1 0 20 0 a 10 10 0 1 0 -20 0' },
    { id: 'Half', label: '半场 (横向)', preview: 'M 5 5 H 95 V 95 H 5 Z M 5 50 H 95' },
    { id: 'AttackingThird', label: '进攻三区', preview: 'M 5 5 H 95 V 60 H 5 Z M 5 30 H 95' },
    { id: 'DefensiveThird', label: '防守三区', preview: 'M 5 40 H 95 V 95 H 5 Z M 5 70 H 95' },
    { id: 'Midfield', label: '中场区域', preview: 'M 5 30 H 95 V 70 H 5 Z M 50 30 V 70' },
    { id: 'Box', label: '禁区区域', preview: 'M 20 5 H 80 V 50 H 20 Z' },
    { id: 'Portrait', label: '完整 (纵向)', preview: 'M 5 5 H 95 V 95 H 5 Z M 5 50 H 95' },
];

const COLORS = [
    { id: 'red', hex: '#EF4444' },
    { id: 'blue', hex: '#3B82F6' },
    { id: 'yellow', hex: '#FACC15' },
    { id: 'green', hex: '#22C55E' },
    { id: 'black', hex: '#1F2937' },
    { id: 'white', hex: '#FFFFFF' },
];

const SessionDesigner: React.FC<SessionDesignerProps> = ({ designs, onSaveDesign, onDeleteDesign, currentUser }) => {
    const [viewMode, setViewMode] = useState<'list' | 'config' | 'editor'>('list');
    const [currentDesign, setCurrentDesign] = useState<DrillDesign | null>(null);
    const [activeToolTab, setActiveToolTab] = useState<'areas' | 'equipment' | 'personnel' | 'lines' | 'annotations'>('equipment');
    const [selectedColor, setSelectedColor] = useState<string>('#EF4444');
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [activeTool, setActiveTool] = useState<'select' | 'line'>('select');
    const [lineType, setLineType] = useState<LineType>('Pass');
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawingStart, setDrawingStart] = useState<{x: number, y: number} | null>(null);
    
    const canvasRef = useRef<HTMLDivElement>(null);

    const startNewConfig = () => {
        const initial: DrillDesign = {
            id: Date.now().toString(),
            title: '',
            category: 'Drill',
            pitchType: 'Full',
            pitchTheme: 'Grass',
            elements: [],
            lines: [],
            description: '',
            keyPoints: [],
            createdAt: new Date().toISOString().split('T')[0],
            authorId: currentUser?.id
        };
        setCurrentDesign(initial);
        setViewMode('config');
    };

    const enterEditor = () => {
        if (!currentDesign?.title) {
            alert('请先输入教案名称');
            return;
        }
        setViewMode('editor');
    };

    const handleSave = () => {
        if (currentDesign) {
            onSaveDesign(currentDesign);
            setViewMode('list');
        }
    };

    // --- 器材渲染辅助 ---
    const renderElement = (el: DesignElement) => {
        const isSelected = selectedElementId === el.id;
        const color = el.color || '#000';
        
        const style: React.CSSProperties = {
            left: `${el.x}%`,
            top: `${el.y}%`,
            position: 'absolute',
            transform: `translate(-50%, -50%) rotate(${el.rotation}deg) scale(${el.scale || 1})`,
            zIndex: isSelected ? 100 : 10,
            cursor: 'move'
        };

        let icon = null;
        switch (el.type) {
            case 'PlayerCircle':
                icon = <div className="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center font-black text-xs text-white" style={{ backgroundColor: color }}>{el.label}</div>;
                break;
            case 'PlayerPin':
                icon = <div className="relative flex flex-col items-center">
                    <div className="w-6 h-6 rounded-full border-2 border-white bg-white shadow-md flex items-center justify-center overflow-hidden">
                        <div className="w-full h-full" style={{ backgroundColor: color, opacity: 0.8 }}></div>
                        <span className="absolute text-[10px] font-bold text-white">{el.label}</span>
                    </div>
                    <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-white -mt-0.5"></div>
                </div>;
                break;
            case 'GK':
                icon = <div className="w-8 h-8 rounded-full border-2 border-white bg-yellow-400 shadow-lg flex items-center justify-center text-[10px] font-bold text-bvb-black">GK</div>;
                break;
            case 'Ball':
                icon = <div className="w-4 h-4 bg-white border border-gray-800 rounded-full shadow-md flex items-center justify-center text-[8px]">⚽</div>;
                break;
            case 'Cone':
                icon = <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[18px]" style={{ borderBottomColor: color }}></div>;
                break;
            case 'Marker':
                icon = <div className="w-8 h-2.5 rounded-full opacity-90 shadow-sm" style={{ backgroundColor: color, borderBottom: '2px solid rgba(0,0,0,0.2)' }}></div>;
                break;
            case 'Pole':
                icon = <div className="w-1.5 h-12 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: color }}></div>;
                break;
            case 'Goal':
                icon = <div className="w-24 h-8 border-2 border-white bg-white/10 relative"><div className="absolute inset-0 grid grid-cols-6 border border-white/20"></div></div>;
                break;
            case 'MiniGoal':
                icon = <div className="w-12 h-4 border-2 border-white rounded-sm bg-white/5 shadow-inner"></div>;
                break;
            case 'Ladder':
                icon = <div className="w-24 h-8 flex border-2" style={{ borderColor: color }}>{[1,2,3,4,5].map(i => <div key={i} className="flex-1 border-r-2 last:border-r-0" style={{ borderColor: color }}></div>)}</div>;
                break;
            case 'Text':
                icon = <div className="text-sm font-black whitespace-nowrap px-2 py-1 bg-white/30 backdrop-blur-sm rounded-lg" style={{ color }}>{el.label || '文字标注'}</div>;
                break;
            default:
                icon = <div className="w-6 h-6 rounded-sm bg-gray-400"></div>;
        }

        return (
            <div key={el.id} className={`design-element transition-shadow ${isSelected ? 'ring-4 ring-bvb-yellow ring-offset-4 ring-offset-green-800' : ''}`} style={style} onClick={(e) => { e.stopPropagation(); setSelectedElementId(el.id); }}>
                {icon}
            </div>
        );
    };

    // --- 线条渲染逻辑 ---
    const renderLine = (line: DesignLine) => {
        const isSelected = selectedElementId === line.id;
        const color = isSelected ? '#FDE100' : line.color;
        const markerId = `arrow-${line.id}`;
        
        const dx = line.endX - line.startX;
        const dy = line.endY - line.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;

        const arrowhead = (
            <defs>
                <marker id={markerId} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                    <path d="M0,0 L0,8 L7,4 z" fill={color} />
                </marker>
            </defs>
        );

        const commonProps = {
            stroke: color,
            strokeWidth: isSelected ? 4 : 2,
            fill: 'none',
            onClick: (e: any) => { e.stopPropagation(); setSelectedElementId(line.id); },
            style: { cursor: 'pointer' }
        };

        if (line.type === 'Dribble') {
            // 运球线：正弦波浪线效果
            const wavePoints = [];
            const segments = Math.floor(dist / 2);
            for(let i=0; i<=segments; i++) {
                const x = (i/segments) * dist;
                const y = Math.sin(i * 1.5) * 4;
                wavePoints.push(`${x},${y}`);
            }
            return (
                <g key={line.id} transform={`translate(${line.startX}%, ${line.startY}%) rotate(${angle})`}>
                    {arrowhead}
                    <polyline 
                        points={wavePoints.join(' ')} 
                        {...commonProps} 
                        markerEnd={`url(#${markerId})`} 
                    />
                </g>
            );
        }

        return (
            <g key={line.id}>
                {arrowhead}
                <line 
                    x1={`${line.startX}%`} y1={`${line.startY}%`} 
                    x2={`${line.endX}%`} y2={`${line.endY}%`} 
                    {...commonProps} 
                    strokeDasharray={line.type === 'Run' ? '8,6' : line.type === 'Boundary' ? '3,3' : 'none'}
                    markerEnd={line.type !== 'Boundary' ? `url(#${markerId})` : undefined}
                />
            </g>
        );
    };

    // --- 画布交互 ---
    const handleCanvasClick = (e: React.MouseEvent) => {
        if (!currentDesign || !canvasRef.current) return;
        if ((e.target as HTMLElement).closest('.design-element')) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        if (activeTool === 'line') {
            if (!isDrawing) {
                setIsDrawing(true);
                setDrawingStart({ x, y });
            } else if (drawingStart) {
                const newLine: DesignLine = { id: Date.now().toString(), type: lineType, startX: drawingStart.x, startY: drawingStart.y, endX: x, endY: y, color: selectedColor };
                setCurrentDesign({ ...currentDesign, lines: [...currentDesign.lines, newLine] });
                setIsDrawing(false);
                setDrawingStart(null);
            }
        } else {
            setSelectedElementId(null);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (!canvasRef.current || !currentDesign) return;
        const type = e.dataTransfer.getData('type') as ElementType;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        const newEl: DesignElement = { 
            id: Date.now().toString(), 
            type, x, y, rotation: 0, scale: 1, 
            color: selectedColor, 
            label: type.includes('Player') ? '10' : '' 
        };
        setCurrentDesign({ ...currentDesign, elements: [...currentDesign.elements, newEl] });
    };

    // --- 视图模式渲染 ---

    if (viewMode === 'list') {
        return (
            <div className="space-y-6 h-full flex flex-col animate-in fade-in duration-300">
                <div className="flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-3xl font-black text-bvb-black uppercase">教案库</h2>
                        <p className="text-gray-500">管理并设计您的专业训练教案</p>
                    </div>
                    <button onClick={startNewConfig} className="flex items-center px-6 py-3 bg-bvb-yellow text-bvb-black font-bold rounded-xl shadow-lg hover:brightness-105 active:scale-95 transition-all">
                        <Plus className="w-5 h-5 mr-2" /> 开始新创作
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto pb-20 custom-scrollbar">
                    {designs.map(d => (
                        <div key={d.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl transition-all group flex flex-col h-72">
                            <div className="h-40 relative flex items-center justify-center overflow-hidden bg-gray-100">
                                <div className="absolute inset-0 opacity-50 bg-[url('https://www.transparenttextures.com/patterns/grass.png')]" style={{ backgroundColor: THEMES.find(t => t.id === d.pitchTheme)?.bg }}></div>
                                <PenTool className="w-12 h-12 text-white/40 z-10" />
                                <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-widest">{d.pitchType}</div>
                            </div>
                            <div className="p-4 flex-1 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-black text-gray-400 uppercase bg-gray-100 px-1.5 py-0.5 rounded">{d.category}</span>
                                        <span className="text-[10px] text-gray-400 font-mono">{d.createdAt}</span>
                                    </div>
                                    <h3 className="font-bold text-gray-800 line-clamp-1">{d.title || '未命名教案'}</h3>
                                </div>
                                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-50">
                                    <button onClick={() => onDeleteDesign(d.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4"/></button>
                                    <button onClick={() => { setCurrentDesign(JSON.parse(JSON.stringify(d))); setViewMode('editor'); }} className="px-4 py-1.5 bg-bvb-black text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition-colors flex items-center">编辑教案 <ChevronRight className="w-4 h-4 ml-1"/></button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {designs.length === 0 && (
                        <div className="col-span-full py-24 text-center flex flex-col items-center">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4"><PenTool className="w-10 h-10 text-gray-300" /></div>
                            <p className="text-gray-400 font-bold italic">暂无教案，点击右上角开始设计</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (viewMode === 'config') {
        return (
            <div className="h-full flex items-center justify-center p-4 animate-in zoom-in-95 duration-500">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col md:flex-row h-[600px]">
                    {/* Left: Setup Side */}
                    <div className="md:w-2/5 bg-bvb-black p-10 text-white flex flex-col justify-between relative">
                        <div className="z-10">
                            <h2 className="text-4xl font-black text-bvb-yellow uppercase tracking-tighter mb-4 italic">场区配置</h2>
                            <p className="text-gray-400 font-bold leading-relaxed">在开始绘制前，请先设定您的训练主题、草坪风格和战术区域范围。</p>
                        </div>
                        <div className="mt-8 space-y-6 z-10">
                            <div>
                                <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-2">教案标题</label>
                                <input 
                                    className="w-full bg-gray-900 border-none rounded-2xl p-4 text-xl font-bold focus:ring-2 focus:ring-bvb-yellow outline-none transition-all"
                                    placeholder="例如: U12 高位逼抢练习..."
                                    value={currentDesign?.title}
                                    onChange={e => setCurrentDesign(prev => prev ? {...prev, title: e.target.value} : null)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-2">分类</label>
                                    <select 
                                        className="w-full bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-bvb-yellow outline-none cursor-pointer"
                                        value={currentDesign?.category}
                                        onChange={e => setCurrentDesign(prev => prev ? {...prev, category: e.target.value as any} : null)}
                                    >
                                        <option value="Drill">基础训练</option>
                                        <option value="Tactic">战术演练</option>
                                        <option value="SetPiece">定位球</option>
                                    </select>
                                </div>
                                <div className="flex items-end">
                                    <button onClick={enterEditor} className="w-full h-[58px] bg-bvb-yellow text-bvb-black font-black rounded-2xl hover:brightness-105 shadow-xl shadow-bvb-yellow/20 flex items-center justify-center group transition-all">
                                        进入画板 <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-bvb-yellow opacity-10 rounded-full blur-3xl"></div>
                    </div>
                    
                    {/* Right: Visual Options */}
                    <div className="md:w-3/5 p-10 overflow-y-auto custom-scrollbar bg-gray-50 flex flex-col gap-10">
                        <section>
                            <h3 className="font-black text-gray-400 text-xs uppercase mb-6 tracking-widest flex items-center"><Palette className="w-4 h-4 mr-2" /> 1. 选择背景主题 (草坪颜色)</h3>
                            <div className="grid grid-cols-3 gap-4">
                                {THEMES.map(theme => (
                                    <button 
                                        key={theme.id}
                                        onClick={() => setCurrentDesign(prev => prev ? {...prev, pitchTheme: theme.id} : null)}
                                        className={`group p-4 rounded-2xl border-4 transition-all flex flex-col items-center gap-3 ${currentDesign?.pitchTheme === theme.id ? 'border-bvb-yellow bg-white shadow-xl scale-105' : 'border-transparent bg-white/50 grayscale hover:grayscale-0 hover:bg-white'}`}
                                    >
                                        <div className="w-16 h-10 rounded-lg shadow-inner flex items-center justify-center" style={{ backgroundColor: theme.bg }}>
                                            {currentDesign?.pitchTheme === theme.id && <CheckCircle className="w-5 h-5 text-white drop-shadow-md" />}
                                        </div>
                                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-tighter">{theme.label}</span>
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section>
                            <h3 className="font-black text-gray-400 text-xs uppercase mb-6 tracking-widest flex items-center"><Layout className="w-4 h-4 mr-2" /> 2. 选择绘制区域范围</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {PITCH_ZONES.map(zone => (
                                    <button 
                                        key={zone.id}
                                        onClick={() => setCurrentDesign(prev => prev ? {...prev, pitchType: zone.id} : null)}
                                        className={`p-4 rounded-2xl border-4 transition-all text-left flex items-center gap-4 ${currentDesign?.pitchType === zone.id ? 'border-bvb-yellow bg-white shadow-xl' : 'border-transparent bg-white/50 hover:bg-white'}`}
                                    >
                                        <div className="w-12 h-12 shrink-0 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border border-gray-200">
                                            <svg viewBox="0 0 100 100" className={`w-10 h-10 ${currentDesign?.pitchType === zone.id ? 'text-bvb-yellow' : 'text-gray-300'}`} fill="none" stroke="currentColor" strokeWidth="6">
                                                <path d={zone.preview} />
                                            </svg>
                                        </div>
                                        <span className="text-xs font-black text-gray-700 uppercase">{zone.label}</span>
                                    </button>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        );
    }

    // --- EDITOR VIEW (重构后的编辑器) ---
    return (
        <div className="flex h-[calc(100vh-100px)] bg-[#121212] -m-4 md:-m-8 relative overflow-hidden text-white">
            
            {/* 1. 左侧垂直极简导航 (一级目录) */}
            <div className="w-16 bg-black border-r border-white/5 flex flex-col items-center py-8 gap-6 z-40 shrink-0">
                <button onClick={() => setViewMode('list')} className="p-3 bg-gray-800 rounded-2xl hover:bg-gray-700 transition-all text-gray-400 hover:text-white mb-6">
                    <ChevronLeft className="w-6 h-6"/>
                </button>
                {[
                    { id: 'areas', icon: Layout, label: '场区' },
                    { id: 'equipment', icon: ConeIcon, label: '器材' },
                    { id: 'personnel', icon: UserIcon, label: '人员' },
                    { id: 'lines', icon: Component, label: '轨迹' },
                    { id: 'annotations', icon: TypeIcon, label: '标注' },
                ].map(item => (
                    <button 
                        key={item.id}
                        onClick={() => setActiveToolTab(item.id as any)}
                        className={`p-3 rounded-2xl transition-all relative group ${activeToolTab === item.id ? 'bg-bvb-yellow text-bvb-black shadow-[0_0_15px_rgba(253,225,0,0.4)]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                    >
                        <item.icon className="w-6 h-6" />
                        <span className="absolute left-full ml-4 px-2 py-1 bg-black text-[10px] font-black rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none transition-opacity uppercase tracking-widest">{item.label}</span>
                    </button>
                ))}
                <div className="mt-auto flex flex-col gap-4 mb-4">
                    <button onClick={handleSave} className="p-4 bg-green-600 rounded-2xl hover:bg-green-500 transition-all text-white shadow-xl shadow-green-900/20" title="保存教案">
                        <Save className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* 2. 悬浮工具选择面板 (白色卡片风格，匹配图示) */}
            <div className="w-72 bg-white flex flex-col z-30 shadow-[-10px_0_30px_rgba(0,0,0,0.3)] shrink-0 overflow-hidden m-4 rounded-[32px] text-gray-800 border border-white/10 animate-in slide-in-from-left-4 duration-500">
                <div className="p-8 pb-4 shrink-0">
                    <h3 className="text-xl font-black text-bvb-black uppercase tracking-tighter flex items-center gap-3">
                        {activeToolTab === 'equipment' && '添加器材'}
                        {activeToolTab === 'personnel' && '场上人员'}
                        {activeToolTab === 'lines' && '线条 & 轨迹'}
                        {activeToolTab === 'annotations' && '标注文本'}
                        {activeToolTab === 'areas' && '背景设置'}
                    </h3>
                    <div className="h-1.5 w-12 bg-bvb-yellow mt-2 rounded-full"></div>
                </div>

                {/* 颜色快捷选单 (仅线条、标注、器材显示) */}
                <div className="px-8 py-5 border-b border-gray-100 bg-gray-50/50">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">当前颜色</p>
                    <div className="flex gap-2.5">
                        {COLORS.map(c => (
                            <button 
                                key={c.id} 
                                onClick={() => setSelectedColor(c.hex)}
                                className={`w-8 h-8 rounded-xl shadow-inner transition-all transform hover:scale-110 ${selectedColor === c.hex ? 'ring-4 ring-gray-200 ring-offset-0 scale-110' : ''}`}
                                style={{ backgroundColor: c.hex }}
                            />
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {/* 内容根据 Tab 切换 */}
                    {activeToolTab === 'equipment' && (
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { type: 'Cone', label: '标志桶' },
                                { type: 'Marker', label: '标志盘' },
                                { type: 'Pole', label: '标志杆' },
                                { type: 'AgilityRing', label: '敏捷圈' },
                                { type: 'Ladder', label: '敏捷梯' },
                                { type: 'Hurdle', label: '小跨栏' },
                                { type: 'Mannequin', label: '人墙架' },
                                { type: 'Goal', label: '标准球门' },
                                { type: 'MiniGoal', label: '训练小门' },
                                { type: 'Ball', label: '足球' },
                            ].map(item => (
                                <div 
                                    key={item.type}
                                    draggable
                                    onDragStart={(e) => { e.dataTransfer.setData('type', item.type); }}
                                    className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-2xl border-2 border-transparent hover:bg-yellow-50 hover:border-bvb-yellow transition-all cursor-grab active:cursor-grabbing text-center group"
                                >
                                    <div className="w-10 h-10 mb-2 flex items-center justify-center opacity-70 group-hover:opacity-100">
                                        <Plus className="w-6 h-6 text-gray-400" />
                                    </div>
                                    <span className="text-[10px] font-black text-gray-500 uppercase group-hover:text-bvb-black">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeToolTab === 'personnel' && (
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { type: 'PlayerCircle', label: '球员 (圈型)' },
                                { type: 'PlayerPin', label: '球员 (坐标)' },
                                { type: 'GK', label: '守门员' },
                                { type: 'Coach', label: '教练员' },
                                { type: 'Referee', label: '裁判员' },
                            ].map(item => (
                                <div 
                                    key={item.type}
                                    draggable
                                    onDragStart={(e) => { e.dataTransfer.setData('type', item.type); }}
                                    className="flex flex-col items-center justify-center p-5 bg-gray-50 rounded-2xl border-2 border-transparent hover:bg-yellow-50 hover:border-bvb-yellow transition-all cursor-grab text-center"
                                >
                                    <div className="w-12 h-12 rounded-full bg-gray-200 mb-2 flex items-center justify-center shadow-inner"><UserIcon className="w-6 h-6 text-gray-400" /></div>
                                    <span className="text-[10px] font-black text-gray-500 uppercase">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeToolTab === 'lines' && (
                        <div className="space-y-3">
                            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-6">
                                <p className="text-xs text-blue-800 font-bold leading-relaxed italic">操作：选择线型后，在画布点击 [起点] 和 [终点] 即可完成绘制。</p>
                            </div>
                            {[
                                { type: 'Pass', label: '传球/射门 (实线)', icon: <ArrowRight className="w-5 h-5" /> },
                                { type: 'Run', label: '无球跑动 (虚线)', icon: <ArrowRight className="w-5 h-5 opacity-40" strokeDasharray="4,4" /> },
                                { type: 'Dribble', label: '运球推进 (波浪)', icon: <Activity className="w-5 h-5" /> },
                                { type: 'Boundary', label: '场地分界 (细虚)', icon: <Maximize2 className="w-5 h-5 text-gray-300" /> },
                            ].map(l => (
                                <button 
                                    key={l.type}
                                    onClick={() => { setActiveTool('line'); setLineType(l.type as any); }}
                                    className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${activeTool === 'line' && lineType === l.type ? 'bg-bvb-black text-white border-bvb-black shadow-xl' : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50'}`}
                                >
                                    <span className="text-sm font-black uppercase">{l.label}</span>
                                    <div className={`p-2 rounded-lg ${activeTool === 'line' && lineType === l.type ? 'bg-bvb-yellow text-bvb-black' : 'bg-gray-100'}`}>{l.icon}</div>
                                </button>
                            ))}
                            <button 
                                onClick={() => setActiveTool('select')}
                                className={`w-full flex items-center p-5 rounded-2xl border-2 transition-all mt-6 ${activeTool === 'select' ? 'bg-bvb-yellow text-bvb-black border-bvb-yellow shadow-xl' : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50'}`}
                            >
                                <Move className="w-5 h-5 mr-3" />
                                <span className="text-sm font-black uppercase">移动 / 选择模式</span>
                            </button>
                        </div>
                    )}

                    {activeToolTab === 'annotations' && (
                         <div className="space-y-4">
                            <div 
                                draggable
                                onDragStart={(e) => { e.dataTransfer.setData('type', 'Text'); }}
                                className="p-10 bg-gray-50 rounded-2xl border-4 border-dashed border-gray-200 flex flex-col items-center hover:bg-white hover:border-bvb-yellow transition-all cursor-grab group"
                            >
                                <TypeIcon className="w-10 h-10 text-gray-300 group-hover:text-bvb-black mb-3" />
                                <span className="text-xs font-black text-gray-400 group-hover:text-bvb-black uppercase tracking-widest">拖拽文字到画布</span>
                            </div>
                         </div>
                    )}

                    {activeToolTab === 'areas' && (
                         <div className="space-y-6">
                            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                                <p className="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest">切换场底</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {THEMES.map(t => (
                                        <button key={t.id} onClick={() => setCurrentDesign({...currentDesign!, pitchTheme: t.id})} className={`p-3 text-[10px] font-black rounded-xl border-2 transition-all uppercase ${currentDesign?.pitchTheme === t.id ? 'bg-bvb-black text-white border-bvb-black' : 'bg-white text-gray-600 border-gray-200'}`}>{t.label}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                                <p className="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest">切换场区范围</p>
                                <div className="space-y-1.5">
                                    {PITCH_ZONES.map(z => (
                                        <button key={z.id} onClick={() => setCurrentDesign({...currentDesign!, pitchType: z.id})} className={`w-full text-left p-3 text-xs font-black rounded-xl uppercase transition-all ${currentDesign?.pitchType === z.id ? 'bg-bvb-black text-white' : 'hover:bg-white text-gray-600'}`}>{z.label}</button>
                                    ))}
                                </div>
                            </div>
                         </div>
                    )}
                </div>
            </div>

            {/* 3. 画布主体区 */}
            <div className="flex-1 flex flex-col bg-[#0a0a0a] overflow-hidden p-6">
                <header className="h-16 flex items-center justify-between px-8 bg-white/5 backdrop-blur-2xl rounded-3xl mb-6 border border-white/10 shrink-0">
                    <div className="flex items-center gap-6">
                        <input 
                            className="bg-transparent text-white font-black text-2xl outline-none focus:ring-0 w-80 placeholder-white/20"
                            placeholder="教案名称..."
                            value={currentDesign?.title}
                            onChange={e => setCurrentDesign({...currentDesign!, title: e.target.value})}
                        />
                        <div className="h-8 w-px bg-white/10"></div>
                        <div className="flex gap-4">
                            <span className="text-[10px] font-black text-bvb-yellow uppercase tracking-[0.2em]">{currentDesign?.pitchType} VIEW</span>
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{currentDesign?.category}</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {selectedElementId && (
                            <button onClick={() => {
                                const elements = currentDesign?.elements.filter(e => e.id !== selectedElementId) || [];
                                const lines = currentDesign?.lines.filter(l => l.id !== selectedElementId) || [];
                                setCurrentDesign({...currentDesign!, elements, lines});
                                setSelectedElementId(null);
                            }} className="flex items-center px-5 py-2 bg-red-900/50 text-red-400 rounded-2xl font-black text-xs hover:bg-red-800 transition-colors">
                                <Trash2 className="w-4 h-4 mr-2" /> 删除选中项
                            </button>
                        )}
                        <button onClick={handleSave} className="flex items-center px-8 py-2.5 bg-bvb-yellow text-bvb-black font-black rounded-2xl hover:brightness-105 shadow-xl shadow-bvb-yellow/20">
                            保存并退出
                        </button>
                    </div>
                </header>

                {/* 战术画布容器 */}
                <div className="flex-1 flex items-center justify-center overflow-auto p-12 custom-scrollbar relative">
                    <div 
                        ref={canvasRef}
                        className="relative shadow-[0_40px_100px_rgba(0,0,0,0.8)] transition-all duration-700 overflow-hidden"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        onClick={handleCanvasClick}
                        style={{
                            width: currentDesign?.pitchType === 'Portrait' ? '600px' : '1000px',
                            height: currentDesign?.pitchType === 'Box' ? '600px' : currentDesign?.pitchType === 'Full' ? '650px' : '700px',
                            backgroundColor: THEMES.find(t => t.id === currentDesign?.pitchTheme)?.bg || '#2e8b57',
                            aspectRatio: currentDesign?.pitchType === 'Portrait' ? '3/4' : '1.5',
                            borderRadius: '12px',
                            border: `4px solid ${THEMES.find(t => t.id === currentDesign?.pitchTheme)?.line}55`
                        }}
                    >
                        {/* 动态网格背景 (类似专业软件) */}
                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.4) 1.5px, transparent 1.5px)', backgroundSize: '25px 25px' }}></div>

                        {/* 球场标线系统 */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible" style={{ opacity: 0.8 }}>
                            <g stroke={THEMES.find(t => t.id === currentDesign?.pitchTheme)?.line} strokeWidth="3" fill="none">
                                {/* 简化版全场标线逻辑 */}
                                <rect x="2%" y="2%" width="96%" height="96%" strokeWidth="4" />
                                <line x1="50%" y1="2%" x2="50%" y2="98%" />
                                <circle cx="50%" cy="50%" r="8%" />
                                <rect x="2%" y="30%" width="12%" height="40%" />
                                <rect x="86%" y="30%" width="12%" height="40%" />
                            </g>
                            {/* 线条渲染层 */}
                            {currentDesign?.lines.map(line => renderLine(line))}
                        </svg>

                        {/* 元素渲染层 */}
                        {currentDesign?.elements.map(el => renderElement(el))}
                        
                        {/* 绘制反馈 */}
                        {isDrawing && drawingStart && (
                            <div className="absolute pointer-events-none" style={{ left: `${drawingStart.x}%`, top: `${drawingStart.y}%` }}>
                                <div className="w-3 h-3 bg-bvb-yellow rounded-full animate-ping"></div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 4. 右侧属性微调面板 (仅在选中项时出现) */}
            {selectedElementId && (
                <div className="w-80 bg-white/5 backdrop-blur-3xl border-l border-white/10 flex flex-col z-40 shrink-0 m-4 rounded-[32px] p-8 animate-in slide-in-from-right-4 duration-500">
                    <div className="flex justify-between items-center mb-8">
                        <h4 className="font-black text-xs uppercase tracking-[0.2em] text-white/40">属性微调</h4>
                        <button onClick={() => setSelectedElementId(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5 text-white/30" /></button>
                    </div>
                    
                    <div className="space-y-10">
                        {currentDesign?.elements.find(e => e.id === selectedElementId) && (
                            <>
                                <section>
                                    <label className="block text-[10px] font-black text-white/30 uppercase mb-4 tracking-widest">旋转角度</label>
                                    <div className="flex items-center gap-4">
                                        <input 
                                            type="range" min="0" max="360" className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-bvb-yellow"
                                            value={currentDesign.elements.find(e => e.id === selectedElementId)?.rotation || 0}
                                            onChange={(e) => {
                                                const els = currentDesign.elements.map(el => el.id === selectedElementId ? {...el, rotation: parseInt(e.target.value)} : el);
                                                setCurrentDesign({...currentDesign, elements: els});
                                            }}
                                        />
                                        <span className="text-xs font-mono font-bold text-bvb-yellow w-10 text-right">{currentDesign.elements.find(e => e.id === selectedElementId)?.rotation}°</span>
                                    </div>
                                </section>

                                <section>
                                    <label className="block text-[10px] font-black text-white/30 uppercase mb-4 tracking-widest">显示标签 / 号码</label>
                                    <input 
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:border-bvb-yellow transition-all"
                                        value={currentDesign.elements.find(e => e.id === selectedElementId)?.label || ''}
                                        onChange={(e) => {
                                            const els = currentDesign.elements.map(el => el.id === selectedElementId ? {...el, label: e.target.value} : el);
                                            setCurrentDesign({...currentDesign, elements: els});
                                        }}
                                        placeholder="如: 10, 教练, A点..."
                                    />
                                </section>

                                <section>
                                    <label className="block text-[10px] font-black text-white/30 uppercase mb-4 tracking-widest">单体色彩覆盖</label>
                                    <div className="flex gap-2.5 flex-wrap">
                                        {COLORS.map(c => (
                                            <button key={c.id} onClick={() => {
                                                const els = currentDesign.elements.map(el => el.id === selectedElementId ? {...el, color: c.hex} : el);
                                                setCurrentDesign({...currentDesign, elements: els});
                                            }} className={`w-8 h-8 rounded-xl border-2 transition-all transform hover:scale-110 ${currentDesign.elements.find(e => e.id === selectedElementId)?.color === c.hex ? 'border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: c.hex }}></button>
                                        ))}
                                    </div>
                                </section>
                            </>
                        )}
                        
                        <div className="pt-10 border-t border-white/5">
                             <label className="block text-[10px] font-black text-white/30 uppercase mb-4 tracking-widest">教案详述</label>
                             <textarea 
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white/80 min-h-[180px] outline-none focus:border-bvb-yellow resize-none leading-relaxed transition-all"
                                placeholder="输入针对此项训练的细节描述..."
                                value={currentDesign?.description}
                                onChange={e => setCurrentDesign({...currentDesign!, description: e.target.value})}
                             />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SessionDesigner;
