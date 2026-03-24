
import React, { useState, useRef, useMemo } from 'react';
import { Stage, Layer, Image as KonvaImage, Circle, Text, Line, Arrow, Group, Rect } from 'react-konva';
import useImage from 'use-image';
import { Player, TacticsBoardData, TacticsPlayer, TacticsDrawing, FormationTemplate, GameFormat } from '../types';
import { Trash2, Undo, RotateCcw, Save, Download, Users, Layout as LayoutIcon, MousePointer2, Type, ArrowUpRight, Spline, Highlighter, Copy, Plus } from 'lucide-react';

interface TacticsBoardProps {
  matchId: string;
  players: Player[];
  initialData?: TacticsBoardData;
  onSave: (data: TacticsBoardData) => void;
  formationTemplates: FormationTemplate[];
  onSaveTemplate: (template: FormationTemplate) => void;
  onCopyPrevious: () => void;
}

const PITCH_WIDTH = 800;
const PITCH_HEIGHT = 600;

const FORMATIONS_11V11 = [
  { name: '4-3-3', positions: [
    { label: 'GK', x: 400, y: 550 },
    { label: 'LB', x: 100, y: 450 }, { label: 'CB', x: 300, y: 450 }, { label: 'CB', x: 500, y: 450 }, { label: 'RB', x: 700, y: 450 },
    { label: 'CM', x: 200, y: 300 }, { label: 'DM', x: 400, y: 350 }, { label: 'CM', x: 600, y: 300 },
    { label: 'LW', x: 150, y: 150 }, { label: 'ST', x: 400, y: 100 }, { label: 'RW', x: 650, y: 150 }
  ]},
  { name: '4-4-2', positions: [
    { label: 'GK', x: 400, y: 550 },
    { label: 'LB', x: 100, y: 450 }, { label: 'CB', x: 300, y: 450 }, { label: 'CB', x: 500, y: 450 }, { label: 'RB', x: 700, y: 450 },
    { label: 'LM', x: 100, y: 250 }, { label: 'CM', x: 300, y: 300 }, { label: 'CM', x: 500, y: 300 }, { label: 'RM', x: 700, y: 250 },
    { label: 'ST', x: 300, y: 100 }, { label: 'ST', x: 500, y: 100 }
  ]},
  { name: '4-2-3-1', positions: [
    { label: 'GK', x: 400, y: 550 },
    { label: 'LB', x: 100, y: 450 }, { label: 'CB', x: 300, y: 450 }, { label: 'CB', x: 500, y: 450 }, { label: 'RB', x: 700, y: 450 },
    { label: 'DM', x: 300, y: 350 }, { label: 'DM', x: 500, y: 350 },
    { label: 'LW', x: 150, y: 200 }, { label: 'AM', x: 400, y: 200 }, { label: 'RW', x: 650, y: 200 },
    { label: 'ST', x: 400, y: 80 }
  ]}
];

const FORMATIONS_8V8 = [
  { name: '3-3-1', positions: [
    { label: 'GK', x: 400, y: 550 },
    { label: 'DF', x: 150, y: 450 }, { label: 'DF', x: 400, y: 450 }, { label: 'DF', x: 650, y: 450 },
    { label: 'MF', x: 150, y: 250 }, { label: 'MF', x: 400, y: 300 }, { label: 'MF', x: 650, y: 250 },
    { label: 'FW', x: 400, y: 100 }
  ]},
  { name: '2-4-1', positions: [
    { label: 'GK', x: 400, y: 550 },
    { label: 'DF', x: 300, y: 450 }, { label: 'DF', x: 500, y: 450 },
    { label: 'MF', x: 100, y: 250 }, { label: 'MF', x: 300, y: 250 }, { label: 'MF', x: 500, y: 250 }, { label: 'MF', x: 700, y: 250 },
    { label: 'FW', x: 400, y: 100 }
  ]}
];

const FORMATIONS_5V5 = [
  { name: '1-2-1', positions: [
    { label: 'GK', x: 400, y: 550 },
    { label: 'DF', x: 400, y: 450 },
    { label: 'MF', x: 200, y: 300 }, { label: 'MF', x: 600, y: 300 },
    { label: 'FW', x: 400, y: 100 }
  ]},
  { name: '2-0-2', positions: [
    { label: 'GK', x: 400, y: 550 },
    { label: 'DF', x: 250, y: 450 }, { label: 'DF', x: 550, y: 450 },
    { label: 'FW', x: 250, y: 150 }, { label: 'FW', x: 550, y: 150 }
  ]}
];

const TacticsBoard: React.FC<TacticsBoardProps> = ({ matchId, players, initialData, onSave, formationTemplates, onSaveTemplate, onCopyPrevious }) => {
  const [format, setFormat] = useState<GameFormat>(initialData?.format || '11v11');
  const [formation, setFormation] = useState(initialData?.formation || '4-3-3');
  const [tacticsPlayers, setTacticsPlayers] = useState<TacticsPlayer[]>(initialData?.players || []);
  const [drawings, setDrawings] = useState<TacticsDrawing[]>(initialData?.drawings || []);
  const [tool, setTool] = useState<'select' | 'arrow' | 'curve' | 'run' | 'pass' | 'highlight' | 'text'>('select');
  const [color, setColor] = useState('#FDE100');
  
  const stageRef = useRef<any>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Load pitch image
  const [pitchImage] = useImage('https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=1000');

  const availableFormations = useMemo(() => {
    if (format === '11v11') return FORMATIONS_11V11;
    if (format === '8v8') return FORMATIONS_8V8;
    return FORMATIONS_5V5;
  }, [format]);

  const customTemplates = useMemo(() => {
    return formationTemplates.filter(t => t.format === format);
  }, [formationTemplates, format]);

  const applyFormation = (f: any) => {
    setFormation(f.name);
    const newPlayers = f.positions.map((pos: any, index: number) => ({
      id: `pos-${index}`,
      positionLabel: pos.label,
      x: pos.x,
      y: pos.y,
      isStarting: true
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
      
      if (tool === 'arrow' || tool === 'run' || tool === 'pass') {
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
  };

  const removePlayerAssignment = (tacticsPlayerId: string) => {
    setTacticsPlayers(prev => prev.map(p => p.id === tacticsPlayerId ? { ...p, playerId: undefined, name: undefined, number: undefined } : p));
  };

  const handleSave = () => {
    onSave({
      format,
      formation,
      players: tacticsPlayers,
      drawings
    });
  };

  const handleExport = async () => {
    if (stageRef.current) {
      const uri = stageRef.current.toDataURL();
      const link = document.createElement('a');
      link.download = `tactics-${matchId}.png`;
      link.href = uri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleSaveAsTemplate = () => {
    const name = prompt('请输入模板名称:');
    if (name) {
      onSaveTemplate({
        id: Date.now().toString(),
        name,
        format,
        positions: tacticsPlayers.map(p => ({ label: p.positionLabel, x: p.x, y: p.y }))
      });
    }
  };

  const startingPlayersIds = tacticsPlayers.map(p => p.playerId).filter(Boolean);
  const unassignedPlayers = players.filter(p => !startingPlayersIds.includes(p.id));

  return (
    <div className="flex flex-col h-full bg-gray-100 overflow-hidden">
      {/* Toolbar */}
      <div className="bg-white p-3 border-b flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">赛制</span>
            <select 
              className="p-1.5 border rounded-lg text-xs font-bold"
              value={format}
              onChange={(e) => setFormat(e.target.value as any)}
            >
              <option value="11v11">11人制</option>
              <option value="8v8">8人制</option>
              <option value="5v5">5人制</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">阵型</span>
            <select 
              className="p-1.5 border rounded-lg text-xs font-bold"
              onChange={(e) => {
                const f = availableFormations.find(form => form.name === e.target.value) || customTemplates.find(t => t.name === e.target.value);
                if (f) applyFormation(f);
              }}
            >
              <option value="">选择阵型...</option>
              <optgroup label="标准阵型">
                {availableFormations.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
              </optgroup>
              {customTemplates.length > 0 && (
                <optgroup label="自定义模板">
                  {customTemplates.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </optgroup>
              )}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setTool('select')} className={`p-2 rounded-lg transition-all ${tool === 'select' ? 'bg-bvb-yellow text-bvb-black' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`} title="选择/移动">
            <MousePointer2 className="w-4 h-4" />
          </button>
          <button onClick={() => setTool('arrow')} className={`p-2 rounded-lg transition-all ${tool === 'arrow' ? 'bg-bvb-yellow text-bvb-black' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`} title="直线箭头">
            <ArrowUpRight className="w-4 h-4" />
          </button>
          <button onClick={() => setTool('curve')} className={`p-2 rounded-lg transition-all ${tool === 'curve' ? 'bg-bvb-yellow text-bvb-black' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`} title="曲线箭头">
            <Spline className="w-4 h-4" />
          </button>
          <button onClick={() => setTool('run')} className={`p-2 rounded-lg transition-all ${tool === 'run' ? 'bg-bvb-yellow text-bvb-black' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`} title="跑动路线">
            <div className="w-4 h-4 border-b-2 border-dashed border-current rotate-[-45deg]" />
          </button>
          <button onClick={() => setTool('pass')} className={`p-2 rounded-lg transition-all ${tool === 'pass' ? 'bg-bvb-yellow text-bvb-black' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`} title="传球路线">
            <div className="w-4 h-4 border-b-2 border-current rotate-[-45deg]" />
          </button>
          <button onClick={() => setTool('highlight')} className={`p-2 rounded-lg transition-all ${tool === 'highlight' ? 'bg-bvb-yellow text-bvb-black' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`} title="空间高亮">
            <Highlighter className="w-4 h-4" />
          </button>
          <button onClick={() => setTool('text')} className={`p-2 rounded-lg transition-all ${tool === 'text' ? 'bg-bvb-yellow text-bvb-black' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`} title="文本备注">
            <Type className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-gray-200 mx-1" />
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
          <button onClick={() => setDrawings(prev => prev.slice(0, -1))} className="p-2 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200" title="撤销">
            <Undo className="w-4 h-4" />
          </button>
          <button onClick={() => { if(confirm('确定清空所有标注吗？')) setDrawings([]); }} className="p-2 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200" title="清空">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={onCopyPrevious} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg font-bold text-xs hover:bg-gray-200">
            <Copy className="w-3.5 h-3.5" /> 复制上一场
          </button>
          <button onClick={handleSaveAsTemplate} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg font-bold text-xs hover:bg-gray-200">
            <Plus className="w-3.5 h-3.5" /> 存为模板
          </button>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 bg-bvb-black text-white rounded-lg font-bold text-xs hover:bg-gray-800">
            <Download className="w-3.5 h-3.5 text-bvb-yellow" /> 导出图片
          </button>
          <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-1.5 bg-bvb-yellow text-bvb-black rounded-lg font-black text-xs shadow-lg hover:brightness-105">
            <Save className="w-3.5 h-3.5" /> 保存战术
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Pitch Area */}
        <div className="flex-1 bg-gray-200 p-4 flex items-center justify-center overflow-auto custom-scrollbar">
          <div className="bg-white shadow-2xl rounded-lg overflow-hidden" style={{ width: PITCH_WIDTH, height: PITCH_HEIGHT }}>
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
                    opacity={0.8}
                  />
                )}
                
                {/* Pitch Lines (Simplified) */}
                <Rect width={PITCH_WIDTH} height={PITCH_HEIGHT} stroke="white" strokeWidth={2} />
                <Line points={[PITCH_WIDTH/2, 0, PITCH_WIDTH/2, PITCH_HEIGHT]} stroke="white" strokeWidth={2} />
                <Circle x={PITCH_WIDTH/2} y={PITCH_HEIGHT/2} radius={60} stroke="white" strokeWidth={2} />
                
                {/* Drawings */}
                {drawings.map((d) => {
                  if (d.type === 'arrow') {
                    return <Arrow key={d.id} points={d.points} stroke={d.color} fill={d.color} strokeWidth={3} pointerLength={10} pointerWidth={10} />;
                  }
                  if (d.type === 'run') {
                    return <Arrow key={d.id} points={d.points} stroke={d.color} fill={d.color} strokeWidth={3} dash={[10, 5]} pointerLength={10} pointerWidth={10} />;
                  }
                  if (d.type === 'pass') {
                    return <Arrow key={d.id} points={d.points} stroke={d.color} fill={d.color} strokeWidth={3} pointerLength={10} pointerWidth={10} />;
                  }
                  if (d.type === 'curve') {
                    return <Line key={d.id} points={d.points} stroke={d.color} strokeWidth={3} tension={0.5} lineCap="round" lineJoin="round" />;
                  }
                  if (d.type === 'highlight') {
                    return <Line key={d.id} points={d.points} fill={d.color} opacity={0.3} closed tension={0.5} />;
                  }
                  if (d.type === 'text') {
                    return <Text key={d.id} x={d.points[0]} y={d.points[1]} text={d.text} fill={d.color} fontSize={14} fontStyle="bold" />;
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
                  >
                    <Circle
                      radius={20}
                      fill={p.playerId ? '#FDE100' : 'rgba(255, 255, 255, 0.2)'}
                      stroke={p.playerId ? '#000' : '#fff'}
                      strokeWidth={2}
                      shadowBlur={5}
                    />
                    <Text
                      text={p.number?.toString() || p.positionLabel}
                      fontSize={12}
                      fontStyle="bold"
                      fill={p.playerId ? '#000' : '#fff'}
                      align="center"
                      verticalAlign="middle"
                      width={40}
                      height={40}
                      offsetX={20}
                      offsetY={20}
                    />
                    {p.name && (
                      <Text
                        text={p.name}
                        y={25}
                        fontSize={10}
                        fontStyle="bold"
                        fill="#fff"
                        align="center"
                        width={60}
                        offsetX={30}
                        shadowBlur={2}
                        shadowColor="black"
                      />
                    )}
                  </Group>
                ))}
              </Layer>
            </Stage>
          </div>
        </div>

        {/* Player List Sidebar */}
        <div className="w-64 bg-white border-l flex flex-col shrink-0">
          <div className="p-4 border-b bg-gray-50">
            <h4 className="font-black text-xs text-gray-800 flex items-center uppercase tracking-widest">
              <Users className="w-4 h-4 mr-2 text-bvb-yellow" /> 待分配球员 ({unassignedPlayers.length})
            </h4>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
            {unassignedPlayers.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-xs italic">所有球员已分配</div>
            ) : (
              unassignedPlayers.map(p => (
                <div 
                  key={p.id}
                  className="p-2 border rounded-lg flex items-center gap-2 bg-white hover:border-bvb-yellow cursor-pointer transition-all group"
                  onClick={() => {
                    const targetPos = tacticsPlayers.find(tp => !tp.playerId);
                    if (targetPos) assignPlayer(targetPos.id, p.id);
                  }}
                >
                  <img src={p.image} className="w-8 h-8 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800 truncate">{p.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono">#{p.number} {p.position}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="p-4 border-t bg-gray-50">
            <h4 className="font-black text-xs text-gray-800 flex items-center uppercase tracking-widest mb-2">
              <LayoutIcon className="w-4 h-4 mr-2 text-bvb-yellow" /> 已分配位置
            </h4>
            <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
              {tacticsPlayers.map(p => (
                <div key={p.id} className="flex items-center justify-between p-1.5 bg-white border rounded text-[10px] font-bold">
                  <span className="text-gray-400 w-8">{p.positionLabel}</span>
                  <span className="flex-1 truncate px-2">{p.name || <span className="text-gray-300 italic">未分配</span>}</span>
                  {p.playerId && (
                    <button onClick={() => removePlayerAssignment(p.id)} className="text-gray-300 hover:text-red-500">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TacticsBoard;
