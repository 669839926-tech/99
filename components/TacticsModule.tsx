import React, { useState } from 'react';
import { Player, Team, Tactic, TacticsBoardData } from '../types';
import TacticsBoard from './TacticsBoard';
import { Plus, Search, Trash2, Edit2, Calendar, Layout, ChevronRight, Share2, Star, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TacticsModuleProps {
  players: Player[];
  teams: Team[];
  tactics: Tactic[];
  onUpdateTactics: (tactics: Tactic[]) => void;
}

const TacticsModule: React.FC<TacticsModuleProps> = ({ players, teams, tactics, onUpdateTactics }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingTactic, setEditingTactic] = useState<Tactic | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSaveTactic = (data: TacticsBoardData, title: string) => {
    if (editingTactic) {
      const updated = tactics.map(t => t.id === editingTactic.id ? {
        ...t,
        title,
        format: data.format,
        formation: data.formation,
        data,
        updatedAt: new Date().toISOString()
      } : t);
      onUpdateTactics(updated);
      setEditingTactic(null);
    } else {
      const newTactic: Tactic = {
        id: Date.now().toString(),
        title,
        format: data.format,
        formation: data.formation,
        data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      onUpdateTactics([newTactic, ...tactics]);
      setIsCreating(false);
    }
  };

  const deleteTactic = (id: string) => {
    if (confirm('确定要删除这个战术吗？')) {
      const updated = tactics.filter(t => t.id !== id);
      onUpdateTactics(updated);
    }
  };

  const filteredTactics = tactics.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.formation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isCreating || editingTactic) {
    return (
      <div className="h-full flex flex-col bg-gray-100">
        <div className="p-4 bg-white border-b flex items-center justify-between shrink-0">
          <button 
            onClick={() => { setIsCreating(false); setEditingTactic(null); }}
            className="text-xs font-black text-gray-500 hover:text-bvb-black flex items-center gap-2 transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" /> 返回战术列表
          </button>
          <div className="text-center">
            <h2 className="text-sm font-black uppercase tracking-tighter">
              {editingTactic ? '编辑战术' : '新建战术'}
            </h2>
          </div>
          <div className="w-20" /> {/* Spacer */}
        </div>
        <div className="flex-1 overflow-hidden">
          <TacticsBoard 
            players={players}
            teams={teams}
            initialData={editingTactic?.data}
            onSave={handleSaveTactic}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="bg-bvb-yellow p-2 rounded-xl shadow-lg">
              <Layout className="w-6 h-6 text-bvb-black" />
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tighter italic text-bvb-black">
              战术板 <span className="text-gray-300">Tactics</span>
            </h1>
          </div>
          <p className="text-gray-500 font-bold text-sm max-w-md">
            设计、保存并演示你的比赛战术。支持多种赛制与阵型模板，实时拖拽布阵。
          </p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="bg-bvb-yellow text-bvb-black px-8 py-4 rounded-2xl font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 group"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
          新建战术方案
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text"
            placeholder="搜索战术名称或阵型..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-2xl border-transparent focus:border-bvb-yellow focus:ring-0 font-bold text-sm transition-all"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border">
                <button className="px-4 py-2 bg-white shadow-sm rounded-lg text-[10px] font-black uppercase tracking-widest text-bvb-black">全部</button>
                <button className="px-4 py-2 text-gray-400 text-[10px] font-black uppercase tracking-widest hover:text-bvb-black transition-colors">11人制</button>
                <button className="px-4 py-2 text-gray-400 text-[10px] font-black uppercase tracking-widest hover:text-bvb-black transition-colors">8人制</button>
                <button className="px-4 py-2 text-gray-400 text-[10px] font-black uppercase tracking-widest hover:text-bvb-black transition-colors">5人制</button>
            </div>
        </div>
      </div>

      {/* Tactics Grid */}
      {filteredTactics.length === 0 ? (
        <div className="py-20 text-center space-y-4 bg-white rounded-[40px] border-2 border-dashed border-gray-200">
          <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
            <History className="w-10 h-10 text-gray-300" />
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">暂无战术方案</h3>
            <p className="text-gray-400 font-bold text-sm">点击右上角按钮开始创建你的第一个战术演示</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredTactics.map((tactic) => (
              <motion.div 
                key={tactic.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group bg-white rounded-[32px] overflow-hidden shadow-sm hover:shadow-2xl transition-all border border-gray-100 flex flex-col"
              >
                {/* Preview Placeholder */}
                <div className="aspect-[4/3] bg-gray-900 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=1000')] bg-cover bg-center opacity-40 group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    
                    <div className="absolute top-4 left-4 flex gap-2">
                        <span className="bg-bvb-yellow text-bvb-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                            {tactic.format}
                        </span>
                        <span className="bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
                            {tactic.formation}
                        </span>
                    </div>

                    <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="text-white font-black text-xl truncate mb-1 group-hover:text-bvb-yellow transition-colors">{tactic.title}</h3>
                        <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold">
                            <Calendar className="w-3 h-3" />
                            {new Date(tactic.updatedAt).toLocaleDateString()} 更新
                        </div>
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
                        <button 
                            onClick={() => setEditingTactic(tactic)}
                            className="bg-white text-bvb-black px-6 py-3 rounded-2xl font-black text-xs shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <Edit2 className="w-4 h-4" /> 查看详情
                        </button>
                    </div>
                </div>

                <div className="p-4 flex items-center justify-between bg-white">
                    <div className="flex -space-x-2">
                        {tactic.data.players.slice(0, 5).map((p, i) => (
                            <div key={i} className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-black">
                                {p.positionLabel}
                            </div>
                        ))}
                        {tactic.data.players.length > 5 && (
                            <div className="w-8 h-8 rounded-full bg-gray-50 border-2 border-white flex items-center justify-center text-[10px] font-black text-gray-400">
                                +{tactic.data.players.length - 5}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        <button className="p-2 text-gray-400 hover:text-bvb-black transition-colors">
                            <Share2 className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => deleteTactic(tactic.id)}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Info Section */}
      <div className="bg-bvb-black rounded-[40px] p-8 md:p-12 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-bvb-yellow opacity-10 blur-[100px] -mr-32 -mt-32" />
          <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                  <h2 className="text-3xl font-black uppercase tracking-tighter italic">
                      专业级战术板 <br/>
                      <span className="text-bvb-yellow">助力每一场胜利</span>
                  </h2>
                  <div className="space-y-4">
                      {[
                          { title: '全赛制支持', desc: '支持5人、8人、11人制足球赛，内置所有主流阵型模板。' },
                          { title: '可视化演示', desc: '通过传球、跑动、射门等多种标注工具，清晰传达战术意图。' },
                          { title: '球员库集成', desc: '直接从球队名单中拖拽球员，实时管理参赛人员阵容。' }
                      ].map((item, i) => (
                          <div key={i} className="flex gap-4">
                              <div className="bg-bvb-yellow/20 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                                  <Star className="w-5 h-5 text-bvb-yellow" />
                              </div>
                              <div>
                                  <h4 className="font-black text-sm uppercase tracking-tight">{item.title}</h4>
                                  <p className="text-gray-400 text-xs font-bold leading-relaxed">{item.desc}</p>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
              <div className="hidden md:block">
                  <div className="bg-white/5 rounded-3xl p-4 border border-white/10 backdrop-blur-sm rotate-3 hover:rotate-0 transition-transform duration-500">
                      <img 
                        src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800" 
                        className="rounded-2xl shadow-2xl grayscale hover:grayscale-0 transition-all duration-700"
                        alt="Tactics"
                      />
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default TacticsModule;
