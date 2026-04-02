
import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Stage, Layer, Line, Arrow, Circle, Text, Group } from 'react-konva';
import { Tactic, GameFormat, Player, TacticsBoardData, TacticsPlayer, TacticsDrawing, Team } from '../types';
import { FORMATIONS } from '../tacticsConstants';
import { 
  Save, 
  Trash2, 
  Undo2, 
  MousePointer2, 
  Pen, 
  ArrowRight, 
  Type, 
  Eraser, 
  Plus, 
  Layout, 
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TacticBoardProps {
  players: Player[];
  teams: Team[];
  onSaveTactic: (tactic: Tactic) => void;
  onDeleteTactic: (id: string) => void;
  savedTactics: Tactic[];
}

const PITCH_WIDTH = 800;
const PITCH_HEIGHT = 1200;

const TacticBoard: React.FC<TacticBoardProps> = ({ 
  players, 
  teams, 
  onSaveTactic, 
  onDeleteTactic, 
  savedTactics 
}) => {
  const [format, setFormat] = useState<GameFormat>('11v11');
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.id || '');
  const [currentTactic, setCurrentTactic] = useState<TacticsBoardData>({
    players: [],
    drawings: [],
    format: '11v11',
    formation: '4-3-3'
  });
  const [tool, setTool] = useState<'select' | 'pen' | 'arrow' | 'text' | 'eraser'>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tacticTitle, setTacticTitle] = useState('未命名战术');
  const [showHistory, setShowHistory] = useState(false);

  const stageRef = useRef<any>(null);

  const teamPlayers = useMemo(() => 
    players.filter(p => p.teamId === selectedTeamId),
    [players, selectedTeamId]
  );

  const availableFormations = useMemo(() => 
    FORMATIONS.filter(f => f.format === format),
    [format]
  );

  // Apply formation template
  const applyFormation = useCallback((formationName: string) => {
    const formation = FORMATIONS.find(f => f.name === formationName && f.format === format);
    if (!formation) return;

    const newPlayers: TacticsPlayer[] = formation.positions.map((pos, idx) => ({
      id: `pos-${idx}`,
      label: pos.label,
      x: (pos.x / 100) * PITCH_WIDTH,
      y: (pos.y / 100) * PITCH_HEIGHT,
      color: '#FACC15' // BVB Yellow
    }));

    setCurrentTactic(prev => ({
      ...prev,
      players: newPlayers,
      formation: formationName,
      format
    }));
  }, [format]);

  // Initialize or update when format changes
  const [lastFormat, setLastFormat] = useState<GameFormat>(format);
  if (format !== lastFormat) {
    setLastFormat(format);
    const defaultFormation = FORMATIONS.find(f => f.format === format);
    if (defaultFormation) {
      const newPlayers: TacticsPlayer[] = defaultFormation.positions.map((pos, idx) => ({
        id: `pos-${idx}`,
        label: pos.label,
        x: (pos.x / 100) * PITCH_WIDTH,
        y: (pos.y / 100) * PITCH_HEIGHT,
        color: '#FACC15'
      }));
      setCurrentTactic({
        players: newPlayers,
        drawings: [],
        format,
        formation: defaultFormation.name
      });
    }
  }

  const handleDragEnd = (id: string, e: any) => {
    setCurrentTactic(prev => ({
      ...prev,
      players: prev.players.map(p => 
        p.id === id ? { ...p, x: e.target.x(), y: e.target.y() } : p
      )
    }));
  };

  const handleMouseDown = (e: any) => {
    if (tool === 'select') {
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) {
        setSelectedId(null);
      }
      return;
    }

    const pos = e.target.getStage().getPointerPosition();
    if (tool === 'pen' || tool === 'arrow') {
      const newDrawing: TacticsDrawing = {
        id: `draw-${Date.now()}`,
        type: tool === 'pen' ? 'line' : 'arrow',
        points: [pos.x, pos.y, pos.x, pos.y],
        color: '#FFFFFF',
        width: 3
      };
      setCurrentTactic(prev => ({
        ...prev,
        drawings: [...prev.drawings, newDrawing]
      }));
    }
  };

  const handleMouseMove = (e: any) => {
    if (tool === 'select' || currentTactic.drawings.length === 0) return;
    if (e.evt.buttons !== 1) return; // Only if mouse is pressed

    const pos = e.target.getStage().getPointerPosition();
    const lastDrawing = currentTactic.drawings[currentTactic.drawings.length - 1];
    
    if (tool === 'pen' || tool === 'arrow') {
      const newPoints = [...(lastDrawing.points || [])];
      if (tool === 'pen') {
        newPoints.push(pos.x, pos.y);
      } else {
        newPoints[2] = pos.x;
        newPoints[3] = pos.y;
      }

      setCurrentTactic(prev => ({
        ...prev,
        drawings: prev.drawings.map((d, i) => 
          i === prev.drawings.length - 1 ? { ...d, points: newPoints } : d
        )
      }));
    }
  };

  const assignPlayer = (tacticPlayerId: string, player: Player) => {
    setCurrentTactic(prev => ({
      ...prev,
      players: prev.players.map(p => 
        p.id === tacticPlayerId ? { 
          ...p, 
          playerId: player.id, 
          name: player.name, 
          number: player.number 
        } : p
      )
    }));
    setSelectedId(null);
  };

  const saveTactic = () => {
    const newTactic: Tactic = {
      id: `tactic-${Date.now()}`,
      title: tacticTitle,
      format,
      formation: currentTactic.formation || '',
      boardData: currentTactic,
      createdAt: new Date().toISOString()
    };
    onSaveTactic(newTactic);
  };

  const loadTactic = (tactic: Tactic) => {
    setCurrentTactic(tactic.boardData);
    setFormat(tactic.format);
    setTacticTitle(tactic.title);
    setShowHistory(false);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* Header / Toolbar */}
      <div className="bg-bvb-black text-white p-4 flex items-center justify-between shadow-lg z-20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Layout className="w-5 h-5 text-bvb-yellow" />
            <span className="font-black italic uppercase tracking-tighter text-lg">Tactical Board</span>
          </div>
          
          <div className="flex bg-white/10 p-1 rounded-lg">
            {(['5v5', '8v8', '11v11'] as GameFormat[]).map(f => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`px-4 py-1.5 rounded-md text-xs font-black transition-all ${format === f ? 'bg-bvb-yellow text-bvb-black' : 'text-gray-400 hover:text-white'}`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="h-8 w-px bg-white/10" />

          <div className="flex items-center gap-2">
            <input 
              value={tacticTitle}
              onChange={e => setTacticTitle(e.target.value)}
              className="bg-transparent border-b border-white/20 px-2 py-1 text-sm font-bold focus:border-bvb-yellow outline-none transition-all w-48"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors relative"
          >
            <History className="w-5 h-5" />
            {savedTactics.length > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 bg-bvb-yellow text-bvb-black text-[10px] font-black rounded-full flex items-center justify-center">
                {savedTactics.length}
              </span>
            )}
          </button>
          <button 
            onClick={saveTactic}
            className="flex items-center gap-2 bg-bvb-yellow text-bvb-black px-4 py-2 rounded-xl font-black text-sm hover:brightness-110 transition-all shadow-sm"
          >
            <Save className="w-4 h-4" />
            保存战术
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Formations & Players */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-sm z-10">
          <div className="p-4 space-y-6 overflow-y-auto custom-scrollbar">
            {/* Formation Selector */}
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">阵型模板</label>
              <div className="grid grid-cols-2 gap-2">
                {availableFormations.map(f => (
                  <button
                    key={f.name}
                    onClick={() => applyFormation(f.name)}
                    className={`p-3 rounded-xl border-2 font-black text-sm transition-all ${currentTactic.formation === f.name ? 'border-bvb-black bg-bvb-black text-white' : 'border-gray-100 hover:border-bvb-yellow'}`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Team Selector */}
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">选择球队</label>
              <select 
                value={selectedTeamId}
                onChange={e => setSelectedTeamId(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-bvb-yellow"
              >
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            {/* Player List */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">球员名单</label>
                <span className="text-[10px] font-bold text-gray-400">{teamPlayers.length} 人</span>
              </div>
              <div className="space-y-2">
                {teamPlayers.map(p => {
                  const isAssigned = currentTactic.players.some(tp => tp.playerId === p.id);
                  return (
                    <div 
                      key={p.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('playerId', p.id)}
                      className={`flex items-center gap-3 p-2 rounded-xl border transition-all group ${isAssigned ? 'bg-green-50 border-green-100 opacity-60' : 'bg-white border-gray-100 hover:border-bvb-yellow cursor-grab active:cursor-grabbing'}`}
                    >
                      <img src={p.image} className="w-8 h-8 rounded-full object-cover border border-white shadow-sm" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-black text-gray-800 truncate">{p.name}</div>
                        <div className="text-[10px] font-bold text-gray-400">#{p.number} • {p.position}</div>
                      </div>
                      {isAssigned ? (
                        <div className="p-1 bg-green-500 text-white rounded-full"><Plus className="w-3 h-3 rotate-45" /></div>
                      ) : (
                        <div className="p-1 bg-gray-100 text-gray-400 rounded-full group-hover:bg-bvb-yellow group-hover:text-bvb-black transition-colors"><Plus className="w-3 h-3" /></div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 relative bg-gray-200 flex items-center justify-center p-8 overflow-hidden">
          {/* Canvas Toolbar */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-white flex items-center gap-2 z-10">
            <ToolButton 
              active={tool === 'select'} 
              onClick={() => setTool('select')} 
              icon={<MousePointer2 className="w-5 h-5" />} 
              label="选择"
            />
            <div className="w-px h-6 bg-gray-200 mx-1" />
            <ToolButton 
              active={tool === 'pen'} 
              onClick={() => setTool('pen')} 
              icon={<Pen className="w-5 h-5" />} 
              label="画笔"
            />
            <ToolButton 
              active={tool === 'arrow'} 
              onClick={() => setTool('arrow')} 
              icon={<ArrowRight className="w-5 h-5" />} 
              label="箭头"
            />
            <ToolButton 
              active={tool === 'text'} 
              onClick={() => setTool('text')} 
              icon={<Type className="w-5 h-5" />} 
              label="文字"
            />
            <div className="w-px h-6 bg-gray-200 mx-1" />
            <ToolButton 
              active={false} 
              onClick={() => setCurrentTactic(prev => ({ ...prev, drawings: [] }))} 
              icon={<Eraser className="w-5 h-5" />} 
              label="清除"
            />
            <ToolButton 
              active={false} 
              onClick={() => setCurrentTactic(prev => ({ ...prev, drawings: prev.drawings.slice(0, -1) }))} 
              icon={<Undo2 className="w-5 h-5" />} 
              label="撤销"
            />
          </div>

          {/* The Pitch */}
          <div 
            className="relative shadow-2xl rounded-lg overflow-hidden"
            style={{ 
              width: '100%', 
              maxWidth: '600px', 
              aspectRatio: '2/3',
              background: '#15803d' // Grass green
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const playerId = e.dataTransfer.getData('playerId');
              const player = players.find(p => p.id === playerId);
              if (player && selectedId) {
                assignPlayer(selectedId, player);
              }
            }}
          >
            {/* Pitch Markings (CSS) */}
            <div className="absolute inset-4 border-2 border-white/40 pointer-events-none">
              {/* Center Line */}
              <div className="absolute top-1/2 left-0 w-full h-px bg-white/40" />
              {/* Center Circle */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/40 rounded-full" />
              {/* Penalty Areas */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-32 border-2 border-white/40 border-t-0" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-32 border-2 border-white/40 border-b-0" />
            </div>

            <Stage
              width={600}
              height={900}
              scaleX={600 / PITCH_WIDTH}
              scaleY={900 / PITCH_HEIGHT}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              ref={stageRef}
              className="cursor-crosshair"
            >
              <Layer>
                {/* Drawings */}
                {currentTactic.drawings.map((draw) => (
                  draw.type === 'line' ? (
                    <Line
                      key={draw.id}
                      points={draw.points}
                      stroke={draw.color}
                      strokeWidth={draw.width}
                      tension={0.5}
                      lineCap="round"
                    />
                  ) : (
                    <Arrow
                      key={draw.id}
                      points={draw.points}
                      stroke={draw.color}
                      fill={draw.color}
                      strokeWidth={draw.width}
                      pointerLength={10}
                      pointerWidth={10}
                    />
                  )
                ))}

                {/* Players */}
                {currentTactic.players.map((p) => (
                  <PlayerNode 
                    key={p.id}
                    data={p}
                    isSelected={selectedId === p.id}
                    onSelect={() => setSelectedId(p.id)}
                    onDragEnd={(e) => handleDragEnd(p.id, e)}
                    draggable={tool === 'select'}
                  />
                ))}
              </Layer>
            </Stage>
          </div>

          {/* History Panel */}
          <AnimatePresence>
            {showHistory && (
              <motion.div 
                initial={{ x: 400 }}
                animate={{ x: 0 }}
                exit={{ x: 400 }}
                className="absolute top-0 right-0 h-full w-80 bg-white shadow-2xl border-l border-gray-200 z-30 flex flex-col"
              >
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="font-black text-sm uppercase tracking-widest">已保存战术</h3>
                  <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-gray-100 rounded-full"><Plus className="w-5 h-5 rotate-45" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {savedTactics.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                      <Layout className="w-12 h-12 mx-auto opacity-10 mb-4" />
                      <p className="text-xs font-bold">暂无保存的战术</p>
                    </div>
                  ) : (
                    savedTactics.map(t => (
                      <div 
                        key={t.id}
                        onClick={() => loadTactic(t)}
                        className="p-3 rounded-xl border border-gray-100 hover:border-bvb-yellow cursor-pointer group transition-all"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-black text-sm text-gray-800">{t.title}</div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); onDeleteTactic(t.id); }}
                            className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded uppercase">{t.format}</span>
                          <span>{t.formation}</span>
                          <span className="ml-auto">{new Date(t.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const ToolButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${active ? 'bg-bvb-black text-bvb-yellow shadow-md' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
  >
    {icon}
    <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

const PlayerNode = ({ data, isSelected, onSelect, onDragEnd, draggable }: { 
  data: TacticsPlayer, 
  isSelected: boolean, 
  onSelect: () => void, 
  onDragEnd: (e: any) => void,
  draggable: boolean
}) => {
  return (
    <Group
      x={data.x}
      y={data.y}
      draggable={draggable}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      onTap={onSelect}
    >
      <Circle
        radius={25}
        fill={isSelected ? '#000000' : '#FACC15'}
        stroke={isSelected ? '#FACC15' : '#FFFFFF'}
        strokeWidth={isSelected ? 3 : 2}
        shadowBlur={isSelected ? 10 : 5}
        shadowOpacity={0.3}
      />
      <Text
        text={data.label}
        fontSize={12}
        fontStyle="bold"
        fill={isSelected ? '#FACC15' : '#000000'}
        align="center"
        verticalAlign="middle"
        width={50}
        height={50}
        offsetX={25}
        offsetY={25}
      />
      {data.name && (
        <Group y={35}>
          <Text
            text={data.name}
            fontSize={11}
            fontStyle="bold"
            fill="#FFFFFF"
            align="center"
            width={100}
            offsetX={50}
            shadowBlur={2}
          />
          <Text
            text={`#${data.number}`}
            y={14}
            fontSize={9}
            fontStyle="bold"
            fill="#FACC15"
            align="center"
            width={100}
            offsetX={50}
          />
        </Group>
      )}
    </Group>
  );
};

export default TacticBoard;
