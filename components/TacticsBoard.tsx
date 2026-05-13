
import React, { useState, useRef, useMemo } from 'react';
import { Stage, Layer, Image as KonvaImage, Circle, Text, Line, Arrow, Group, Rect, Arc } from 'react-konva';
import useImage from 'use-image';
import { Player, TacticsBoardData, TacticsPlayer, TacticsDrawing, FormationTemplate, GameFormat, Team } from '../types';
import { Trash2, Undo, RotateCcw, Save, Download, Users as UsersIcon, Layout as LayoutIcon, MousePointer2, Type, ArrowUpRight, Spline, Highlighter, Target, Info, Maximize2, Minimize2 } from 'lucide-react';
import { FORMATIONS } from '../tacticsConstants';

interface TacticsBoardProps {
  players: Player[];
  teams: Team[];
  initialData?: TacticsBoardData;
  onSave: (data: TacticsBoardData, title: string) => void;
}

const PITCH_WIDTH = 800;
const PITCH_HEIGHT = 600;

const TacticsBoard: React.FC<TacticsBoardProps> = ({ players, teams, initialData, onSave }) => {
  const [format, setFormat] = useState<GameFormat>(initialData?.format || '11v11');
  const [formation, setFormation] = useState(initialData?.formation || '4-3-3');
  const [tacticsPlayers, setTacticsPlayers] = useState<TacticsPlayer[]>(initialData?.players || []);
  const [drawings, setDrawings] = useState<TacticsDrawing[]>(initialData?.drawings || []);
  const [tool, setTool] = useState<'select' | 'arrow' | 'curve' | 'run' | 'pass' | 'shot' | 'dribble' | 'highlight' | 'text'>('select');
  const [color, setColor] = useState('#FDE100');
  const [title, setTitle] = useState(initialData?.formation ? `${initialData.formation} 战术` : '新建战术');
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.id || '');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const [selectedTacticsPlayerId, setSelectedTacticsPlayerId] = useState<string | null>(null);
  
  const stageRef = useRef<any>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Load pitch image
  const [pitchImage] = useImage('https://images.unsplash.com/photo-1556056504-5c7696c4c28d?auto=format&fit=crop&q=80&w=1000');

  const availableFormations = useMemo(() => {
    const formatStr = format.includes('v') ? format : `${format}v${format}`;
    return FORMATIONS.filter(f => f.format === formatStr || f.format === format);
  }, [format]);

  const applyFormation = (f: FormationTemplate) => {
    setFormation(f.name);
    const newPlayers = f.positions.map((pos: any, index: number) => ({
      id: `pos-${index}-${Date.now()}`,
      positionLabel: pos.label,
      x: (pos.x / 100) * PITCH_WIDTH,
      y: (pos.y / 100) * PITCH_HEIGHT,
    }));
    setTacticsPlayers(newPlayers);
  };

  const handleMouseDown = (e: any) => {
    if (tool === 'select') return;
    setIsDrawing(true);
    const pos = e.target.getStage().getPointerPosition();
    
    if (tool === 'text') {
      const text = prompt('请输入备注内容:');
      if (text) {
        const newDrawing: TacticsDrawing = {
          id: Date.now().toString(),
          type: 'text',
          points: [pos.x, pos.y],
          color: color,
          text: text
        };
        setDrawings([...drawings, newDrawing]);
      }
      setIsDrawing(false);
      return;
    }

    const newDrawing: TacticsDrawing = {
      id: Date.now().toString(),
      type: tool,
      points: [pos.x, pos.y],
      color: color
    };
    setDrawings([...drawings, newDrawing]);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    
    setDrawings(prev => {
      if (prev.length === 0) return prev;
      const newDrawings = [...prev];
      const lastDrawing = { ...newDrawings[newDrawings.length - 1] };
      
      if (['arrow', 'run', 'pass', 'shot', 'dribble'].includes(tool)) {
        lastDrawing.points = [lastDrawing.points[0], lastDrawing.points[1], point.x, point.y];
      } else if (tool === 'curve' || tool === 'highlight') {
        lastDrawing.points = lastDrawing.points.concat([point.x, point.y]);
      }
      
      newDrawings[newDrawings.length - 1] = lastDrawing;
      return newDrawings;
    });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handlePlayerDrop = (e: any, tacticsPlayerId: string) => {
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    setTacticsPlayers(prev => prev.map(p => p.id === tacticsPlayerId ? { ...p, x: pos.x, y: pos.y } : p));
  };

  const assignPlayer = (tacticsPlayerId: string, playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    setTacticsPlayers(prev => prev.map(p => p.id === tacticsPlayerId ? { ...p, playerId: player.id, name: player.name, number: player.number } : p));
    setSelectedTacticsPlayerId(null);
  };

  const removePlayerAssignment = (tacticsPlayerId: string) => {
    setTacticsPlayers(prev => prev.map(p => p.id === tacticsPlayerId ? { ...p, playerId: undefined, name: undefined, number: undefined } : p));
  };

  const handleSave = () => {
    if (!title) {
        alert('请输入战术名称');
        return;
    }
    onSave({
      format,
      formation,
      players: tacticsPlayers,
      drawings
    }, title);
  };

  const handleExport = async () => {
    if (stageRef.current) {
      const uri = stageRef.current.toDataURL();
      const link = document.createElement('a');
      link.download = `${title || 'tactics'}.png`;
      link.href = uri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const teamPlayers = useMemo(() => {
    return players.filter(p => p.teamId === selectedTeamId);
  }, [players, selectedTeamId]);

  const assignedPlayerIds = tacticsPlayers.map(p => p.playerId).filter(Boolean);
  const unassignedPlayers = teamPlayers.filter(p => !assignedPlayerIds.includes(p.id));

  return (
    <div className={`flex flex-col h-full bg-gray-100 overflow-hidden rounded-2xl shadow-xl border border-gray-200 transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-[9999] rounded-none' : 'relative'}`}>
      {/* Header & Main Toolbar */}
      <div className="bg-bvb-black p-4 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-lg">
        <div className="flex items-center gap-4">
            <div className="bg-bvb-yellow p-2 rounded-xl">
                <LayoutIcon className="w-6 h-6 text-bvb-black" />
            </div>
            <div>
                <input 
                    type="text" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)}
                    className="bg-transparent text-white font-black text-lg outline-none border-b border-transparent focus:border-bvb-yellow transition-all placeholder:text-gray-600"
                    placeholder="输入战术名称..."
                />
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Tactical Demonstration Board</p>
            </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)} 
            className="p-2 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition-all shadow-inner"
            title={isFullscreen ? "退出全屏" : "全屏模式"}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5 text-bvb-yellow" /> : <Maximize2 className="w-5 h-5 text-bvb-yellow" />}
          </button>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-xl font-bold text-xs hover:bg-gray-700 transition-all">
            <Download className="w-4 h-4 text-bvb-yellow" /> 导出图片
          </button>
          <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-bvb-yellow text-bvb-black rounded-xl font-black text-xs shadow-lg hover:brightness-105 active:scale-95 transition-all">
            <Save className="w-4 h-4" /> 保存战术
          </button>
        </div>
      </div>

      {/* Secondary Toolbar */}
      <div className="bg-white p-3 border-b flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-100">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">赛制</span>
            <select 
              className="bg-transparent p-1.5 text-xs font-bold outline-none cursor-pointer"
              value={format}
              onChange={(e) => setFormat(e.target.value as any)}
            >
              <option value="11v11">11人制</option>
              <option value="8v8">8人制</option>
              <option value="5v5">5人制</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-100">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">阵型</span>
            <select 
              className="bg-transparent p-1.5 text-xs font-bold outline-none cursor-pointer"
              value={formation}
              onChange={(e) => {
                const f = availableFormations.find(form => form.name === e.target.value);
                if (f) applyFormation(f);
              }}
            >
              <option value="">选择阵型模板...</option>
              {availableFormations.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-100">
          <button onClick={() => setTool('select')} className={`p-2 rounded-lg transition-all ${tool === 'select' ? 'bg-bvb-black text-bvb-yellow shadow-md' : 'text-gray-400 hover:bg-gray-200'}`} title="选择/移动">
            <MousePointer2 className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-gray-200 mx-1" />
          <button onClick={() => setTool('pass')} className={`p-2 rounded-lg transition-all ${tool === 'pass' ? 'bg-bvb-black text-bvb-yellow shadow-md' : 'text-gray-400 hover:bg-gray-200'}`} title="传球路线">
            <ArrowUpRight className="w-4 h-4" />
          </button>
          <button onClick={() => setTool('run')} className={`p-2 rounded-lg transition-all ${tool === 'run' ? 'bg-bvb-black text-bvb-yellow shadow-md' : 'text-gray-400 hover:bg-gray-200'}`} title="跑动路线">
             <div className="w-4 h-4 border-b-2 border-dashed border-current rotate-[-45deg]" />
          </button>
          <button onClick={() => setTool('dribble')} className={`p-2 rounded-lg transition-all ${tool === 'dribble' ? 'bg-bvb-black text-bvb-yellow shadow-md' : 'text-gray-400 hover:bg-gray-200'}`} title="带球路线">
             <Spline className="w-4 h-4" />
          </button>
          <button onClick={() => setTool('shot')} className={`p-2 rounded-lg transition-all ${tool === 'shot' ? 'bg-bvb-black text-bvb-yellow shadow-md' : 'text-gray-400 hover:bg-gray-200'}`} title="射门路线">
            <Target className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-gray-200 mx-1" />
          <button onClick={() => setTool('highlight')} className={`p-2 rounded-lg transition-all ${tool === 'highlight' ? 'bg-bvb-black text-bvb-yellow shadow-md' : 'text-gray-400 hover:bg-gray-200'}`} title="空间高亮">
            <Highlighter className="w-4 h-4" />
          </button>
          <button onClick={() => setTool('text')} className={`p-2 rounded-lg transition-all ${tool === 'text' ? 'bg-bvb-black text-bvb-yellow shadow-md' : 'text-gray-400 hover:bg-gray-200'}`} title="文本备注">
            <Type className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-gray-200 mx-1" />
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-6 h-6 rounded-full cursor-pointer border-2 border-white shadow-sm" />
          <button onClick={() => setDrawings(prev => prev.slice(0, -1))} className="p-2 text-gray-400 hover:text-bvb-black transition-colors" title="撤销">
            <Undo className="w-4 h-4" />
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowClearConfirm(true)} 
              className="p-2 text-gray-400 hover:text-red-500 transition-colors bg-white rounded-lg border border-gray-100 shadow-sm" 
              title="清空"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            {showClearConfirm && (
              <div className="absolute right-0 top-full mt-2 p-3 bg-white border rounded-xl shadow-2xl z-[100] w-48 animate-in fade-in slide-in-from-top-2">
                <p className="text-[10px] font-bold text-gray-800 mb-3">确定清空所有标注吗？</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setDrawings([]); setShowClearConfirm(false); }}
                    className="flex-1 py-1.5 bg-red-500 text-white text-[10px] font-bold rounded-lg hover:bg-red-600 transition-colors"
                  >
                    确定
                  </button>
                  <button 
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 py-1.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Pitch Area */}
        <div className="flex-1 bg-gray-200 p-4 flex items-center justify-center overflow-auto custom-scrollbar">
          <div className="bg-white shadow-2xl rounded-lg overflow-hidden border-4 border-white" style={{ width: PITCH_WIDTH, height: PITCH_HEIGHT }}>
            <Stage
              width={PITCH_WIDTH}
              height={PITCH_HEIGHT}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              ref={stageRef}
            >
              <Layer>
                {/* Pitch Background */}
                {pitchImage && (
                  <KonvaImage
                    image={pitchImage}
                    width={PITCH_WIDTH}
                    height={PITCH_HEIGHT}
                    opacity={0.7}
                  />
                )}
                <Rect width={PITCH_WIDTH} height={PITCH_HEIGHT} fill="rgba(21, 128, 61, 0.3)" />
                
                {/* Pitch Lines */}
                <Rect width={PITCH_WIDTH} height={PITCH_HEIGHT} stroke="white" strokeWidth={3} />
                <Line points={[PITCH_WIDTH/2, 0, PITCH_WIDTH/2, PITCH_HEIGHT]} stroke="white" strokeWidth={3} />
                <Circle x={PITCH_WIDTH/2} y={PITCH_HEIGHT/2} radius={75} stroke="white" strokeWidth={3} />
                <Circle x={PITCH_WIDTH/2} y={PITCH_HEIGHT/2} radius={4} fill="white" />
                
                {/* Left Side */}
                <Rect x={0} y={PITCH_HEIGHT * 0.2} width={PITCH_WIDTH * 0.18} height={PITCH_HEIGHT * 0.6} stroke="white" strokeWidth={3} />
                <Rect x={0} y={PITCH_HEIGHT * 0.38} width={PITCH_WIDTH * 0.06} height={PITCH_HEIGHT * 0.24} stroke="white" strokeWidth={3} />
                <Circle x={PITCH_WIDTH * 0.12} y={PITCH_HEIGHT/2} radius={4} fill="white" />
                <Arc 
                  x={PITCH_WIDTH * 0.12} 
                  y={PITCH_HEIGHT/2} 
                  innerRadius={75} 
                  outerRadius={75} 
                  angle={100} 
                  rotation={-50} 
                  stroke="white" 
                  strokeWidth={3} 
                />
                {/* Left Corners */}
                <Arc x={0} y={0} innerRadius={20} outerRadius={20} angle={90} rotation={0} stroke="white" strokeWidth={3} />
                <Arc x={0} y={PITCH_HEIGHT} innerRadius={20} outerRadius={20} angle={90} rotation={270} stroke="white" strokeWidth={3} />
                {/* Left Goal */}
                <Rect x={-15} y={PITCH_HEIGHT * 0.42} width={15} height={PITCH_HEIGHT * 0.16} stroke="white" strokeWidth={3} />

                {/* Right Side */}
                <Rect x={PITCH_WIDTH * 0.82} y={PITCH_HEIGHT * 0.2} width={PITCH_WIDTH * 0.18} height={PITCH_HEIGHT * 0.6} stroke="white" strokeWidth={3} />
                <Rect x={PITCH_WIDTH * 0.94} y={PITCH_HEIGHT * 0.38} width={PITCH_WIDTH * 0.06} height={PITCH_HEIGHT * 0.24} stroke="white" strokeWidth={3} />
                <Circle x={PITCH_WIDTH * 0.88} y={PITCH_HEIGHT/2} radius={4} fill="white" />
                <Arc 
                  x={PITCH_WIDTH * 0.88} 
                  y={PITCH_HEIGHT/2} 
                  innerRadius={75} 
                  outerRadius={75} 
                  angle={100} 
                  rotation={130} 
                  stroke="white" 
                  strokeWidth={3} 
                />
                {/* Right Corners */}
                <Arc x={PITCH_WIDTH} y={0} innerRadius={20} outerRadius={20} angle={90} rotation={90} stroke="white" strokeWidth={3} />
                <Arc x={PITCH_WIDTH} y={PITCH_HEIGHT} innerRadius={20} outerRadius={20} angle={90} rotation={180} stroke="white" strokeWidth={3} />
                {/* Right Goal */}
                <Rect x={PITCH_WIDTH} y={PITCH_HEIGHT * 0.42} width={15} height={PITCH_HEIGHT * 0.16} stroke="white" strokeWidth={3} />
                
                {/* Drawings */}
                {drawings.map((d) => {
                  if (d.type === 'arrow' || d.type === 'pass' || d.type === 'shot') {
                    return <Arrow key={d.id} points={d.points} stroke={d.color} fill={d.color} strokeWidth={d.type === 'shot' ? 4 : 3} pointerLength={10} pointerWidth={10} />;
                  }
                  if (d.type === 'run') {
                    return <Arrow key={d.id} points={d.points} stroke={d.color} fill={d.color} strokeWidth={3} dash={[10, 5]} pointerLength={10} pointerWidth={10} />;
                  }
                  if (d.type === 'dribble' || d.type === 'curve') {
                    return <Line key={d.id} points={d.points} stroke={d.color} strokeWidth={3} tension={0.5} lineCap="round" lineJoin="round" />;
                  }
                  if (d.type === 'highlight') {
                    return <Line key={d.id} points={d.points} fill={d.color} opacity={0.3} closed tension={0.5} />;
                  }
                  if (d.type === 'text') {
                    return <Text key={d.id} x={d.points[0]} y={d.points[1]} text={d.text} fill={d.color} fontSize={16} fontStyle="bold" shadowBlur={2} shadowColor="black" />;
                  }
                  return null;
                })}

                {/* Players */}
                {tacticsPlayers.map((p) => (
                  <Group
                    key={p.id}
                    x={p.x}
                    y={p.y}
                    draggable={tool === 'select'}
                    onDragEnd={(e) => handlePlayerDrop(e, p.id)}
                    onClick={() => setSelectedTacticsPlayerId(p.id)}
                    onTap={() => setSelectedTacticsPlayerId(p.id)}
                  >
                    <Circle
                      radius={22}
                      fill={p.playerId ? '#FDE100' : 'rgba(255, 255, 255, 0.15)'}
                      stroke={selectedTacticsPlayerId === p.id ? '#FDE100' : (p.playerId ? '#000' : '#fff')}
                      strokeWidth={selectedTacticsPlayerId === p.id ? 4 : 2}
                      shadowBlur={selectedTacticsPlayerId === p.id ? 15 : (p.playerId ? 8 : 0)}
                      shadowColor={selectedTacticsPlayerId === p.id ? '#FDE100' : 'black'}
                      shadowOpacity={0.6}
                    />
                    <Text
                      text={p.number?.toString() || p.positionLabel}
                      fontSize={14}
                      fontStyle="black"
                      fill={p.playerId ? '#000' : '#fff'}
                      align="center"
                      verticalAlign="middle"
                      width={44}
                      height={44}
                      offsetX={22}
                      offsetY={22}
                    />
                    {p.name && (
                      <Group y={28}>
                        <Rect 
                            x={-30} 
                            width={60} 
                            height={14} 
                            fill="rgba(0,0,0,0.6)" 
                            cornerRadius={4} 
                        />
                        <Text
                            text={p.name}
                            fontSize={10}
                            fontStyle="bold"
                            fill="#fff"
                            align="center"
                            width={60}
                            offsetX={30}
                            y={2}
                        />
                      </Group>
                    )}
                  </Group>
                ))}
              </Layer>
            </Stage>
          </div>
        </div>

        {/* Player List Sidebar */}
        <div className="w-[480px] bg-white border-l flex flex-col shrink-0 shadow-xl z-10">
          <div className="p-4 border-b bg-gray-50 space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="font-black text-xs text-gray-800 flex items-center uppercase tracking-widest">
                <UsersIcon className="w-4 h-4 mr-2 text-bvb-yellow" /> 球队布阵
                </h4>
                {selectedTacticsPlayerId && (
                    <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-black animate-pulse">
                        正在配置: {tacticsPlayers.find(tp => tp.id === selectedTacticsPlayerId)?.positionLabel}
                    </span>
                )}
            </div>
            <select 
                value={selectedTeamId} 
                onChange={e => setSelectedTeamId(e.target.value)}
                className="w-full p-2 border rounded-xl text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-bvb-yellow"
            >
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-3 bg-gray-50 border-b flex justify-between items-center">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {selectedTacticsPlayerId ? '请选择球员填入当前位置' : '待分配球员'} ({unassignedPlayers.length})
                </span>
                {selectedTacticsPlayerId && (
                    <button 
                        onClick={() => setSelectedTacticsPlayerId(null)}
                        className="text-[10px] text-red-500 font-black hover:underline"
                    >
                        取消选择
                    </button>
                )}
            </div>
            <div className={`flex-[3] overflow-y-auto p-4 grid grid-cols-3 gap-3 custom-scrollbar content-start transition-colors ${selectedTacticsPlayerId ? 'bg-blue-50/30' : 'bg-gray-50/30'}`}>
                {unassignedPlayers.length === 0 ? (
                <div className="col-span-3 py-12 text-center text-gray-400 text-xs italic bg-gray-50 rounded-xl border border-dashed">所有球员已分配</div>
                ) : (
                unassignedPlayers.map(p => (
                    <div 
                    key={p.id}
                    className={`p-2 border rounded-2xl flex flex-col items-center text-center gap-2 bg-white transition-all group shadow-sm hover:shadow-md ${selectedTacticsPlayerId ? 'border-blue-200 hover:border-blue-500 cursor-pointer scale-100 hover:scale-105' : 'border-gray-100 opacity-80 cursor-not-allowed'}`}
                    onClick={() => {
                        if (selectedTacticsPlayerId) {
                            assignPlayer(selectedTacticsPlayerId, p.id);
                        } else {
                            alert('请先点击球场上的位置圆圈，再选择球员进行配置。');
                        }
                    }}
                    >
                    <div className="relative">
                        <img src={p.image} className="w-14 h-14 rounded-full object-cover border-2 border-gray-100 group-hover:border-blue-200 transition-colors" />
                        <span className="absolute -bottom-1 -right-1 bg-bvb-black text-bvb-yellow text-[9px] font-black px-1.5 py-0.5 rounded-full border border-white shadow-sm">#{p.number}</span>
                    </div>
                    <div className="w-full text-left space-y-0.5">
                        <p className="text-[11px] font-black text-gray-800 truncate leading-tight">{p.name}</p>
                        <div className="flex items-center justify-between">
                            <p className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter">{p.position}</p>
                            <p className="text-[8px] text-gray-500 font-medium">{p.age}岁 | {p.preferredFoot}脚</p>
                        </div>
                        {p.height && (
                            <p className="text-[7px] text-gray-400 font-medium">{p.height}cm | {p.weight || '--'}kg</p>
                        )}
                    </div>
                    </div>
                ))
                )}
            </div>
            
            <div className="p-3 bg-gray-50 border-t border-b flex justify-between items-center">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">参赛阵容 ({assignedPlayerIds.length})</span>
            </div>
            <div className="flex-[2] p-3 space-y-1.5 overflow-y-auto custom-scrollbar bg-gray-50/50">
                {tacticsPlayers.length === 0 ? (
                    <div className="text-center py-4 text-gray-400 text-[10px] italic">请先选择阵型</div>
                ) : (
                    tacticsPlayers.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-2 bg-white border rounded-xl text-[11px] font-bold shadow-sm">
                        <span className="text-bvb-yellow bg-black px-1.5 py-0.5 rounded text-[9px] w-8 text-center">{p.positionLabel}</span>
                        <span className="flex-1 truncate px-3">{p.name || <span className="text-gray-300 italic font-normal">未分配球员</span>}</span>
                        {p.playerId && (
                            <button onClick={() => removePlayerAssignment(p.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                        </div>
                    ))
                )}
            </div>
          </div>

          <div className="p-4 bg-yellow-50 border-t border-yellow-100">
              <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-yellow-800 leading-relaxed">
                      <b>操作提示:</b><br/>
                      1. <b>点击球场上的位置圆圈</b>，激活该位置。<br/>
                      2. 在右侧球员列表中点击球员，将其填入激活位置。<br/>
                      3. 在战术板上拖拽圆圈可调整位置。
                  </p>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TacticsBoard;
