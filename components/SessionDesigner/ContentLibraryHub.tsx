import React, { useState } from 'react';
import { DrillDesign, User } from '../../types';
import { PitchSvgRenderer } from './PitchSvgRenderer';
import {
  Compass, Layers, BookOpen, PenTool, Calendar, Folder,
  Search, Grid, List, Edit3, Copy, Trash2, Heart,
  Clock, ArrowUpRight, FolderPlus
} from 'lucide-react';

interface ContentLibraryHubProps {
  designs: DrillDesign[];
  currentUser: User | null;
  onOpenPitchSelector: () => void;
  onOpenCreateDrillModal: () => void;
  onOpenCreateSessionModal: () => void;
  onOpenCreateOtherModal: () => void;
  onEditItem: (item: DrillDesign) => void;
  onViewDetail: (item: DrillDesign) => void;
  onDuplicateItem: (item: DrillDesign) => void;
  onDeleteItem: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

export const ContentLibraryHub: React.FC<ContentLibraryHubProps> = ({
  designs,
  onOpenPitchSelector,
  onOpenCreateDrillModal,
  onOpenCreateSessionModal,
  onOpenCreateOtherModal,
  onEditItem,
  onViewDetail,
  onDuplicateItem,
  onDeleteItem,
  onToggleFavorite
}) => {
  // Top Level Tabs
  const [mainTab, setMainTab] = useState<'content' | 'articles' | 'favorites'>('content');
  const [subFilter, setSubFilter] = useState<'all' | 'unfiled' | 'drafts' | string>('all');
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Custom User Folders
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([
    { id: 'f-u9', name: 'U9 传控进攻梯队' },
    { id: 'f-u11', name: 'U11 战术攻防转换' },
    { id: 'f-warmup', name: '常用高频热身套路' }
  ]);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Weekly Schedule Strip (Mocking current week dates for realistic club UI)
  const currentWeekDays = [
    { day: '周一', date: '04/06', count: 2, isToday: false },
    { day: '周二', date: '04/07', count: 1, isToday: false },
    { day: '周三', date: '04/08', count: 3, isToday: false },
    { day: '周四', date: '04/09', count: 0, isToday: false },
    { day: '周五', date: '04/10', count: 2, isToday: true },
    { day: '周六', date: '04/11', count: 4, isToday: false },
    { day: '周日', date: '04/12', count: 1, isToday: false }
  ];

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    setFolders([...folders, { id: `f-${Date.now()}`, name: newFolderName.trim() }]);
    setNewFolderName('');
    setShowNewFolderInput(false);
  };

  // Filter items
  const filteredItems = designs.filter(item => {
    // Top tab filtering
    if (mainTab === 'favorites' && !item.isFavorite) return false;
    if (mainTab === 'articles' && item.contentType !== 'other' && item.category !== 'Other') return false;

    // Sub filter
    if (subFilter === 'unfiled' && item.folderId) return false;
    if (subFilter === 'drafts' && !item.isDraft) return false;
    if (subFilter !== 'all' && subFilter !== 'unfiled' && subFilter !== 'drafts') {
      if (item.folderId !== subFilter) return false;
    }

    // Type filter
    if (contentTypeFilter !== 'all') {
      if (contentTypeFilter === 'diagram' && item.category !== 'diagram' && item.contentType !== 'diagram') return false;
      if (contentTypeFilter === 'drill' && item.category !== 'drill_item' && item.contentType !== 'drill') return false;
      if (contentTypeFilter === 'session_plan' && item.category !== 'session_plan' && item.contentType !== 'session_plan') return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title?.toLowerCase().includes(q);
      const matchTopic = item.topic?.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchTopic && !matchDesc) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* 1. Top 4 Feature Creation Cards (Video 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: 创建示意图 */}
        <div
          onClick={onOpenPitchSelector}
          className="group relative bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent hover:from-emerald-500/20 rounded-3xl p-5 border-2 border-emerald-200 hover:border-emerald-500 cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-1 overflow-hidden"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/30 group-hover:scale-110 transition-transform">
              <Compass className="w-6 h-6" />
            </div>
            <span className="w-8 h-8 rounded-full bg-emerald-100 group-hover:bg-emerald-600 group-hover:text-white text-emerald-700 flex items-center justify-center transition-colors">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <h3 className="text-base font-black text-gray-900 group-hover:text-emerald-700 transition-colors">
            创建示意图
          </h3>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
            便可在此生成工具创建战术示意图与动画，支持24种场地布局
          </p>
        </div>

        {/* Card 2: 创建训练项 */}
        <div
          onClick={onOpenCreateDrillModal}
          className="group relative bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent hover:from-blue-500/20 rounded-3xl p-5 border-2 border-blue-200 hover:border-blue-500 cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-1 overflow-hidden"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 group-hover:scale-110 transition-transform">
              <Layers className="w-6 h-6" />
            </div>
            <span className="w-8 h-8 rounded-full bg-blue-100 group-hover:bg-blue-600 group-hover:text-white text-blue-700 flex items-center justify-center transition-colors">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <h3 className="text-base font-black text-gray-900 group-hover:text-blue-700 transition-colors">
            创建训练项
          </h3>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
            组合示意图与组织指导要点，创建教案中的单项训练环节
          </p>
        </div>

        {/* Card 3: 创建教案 */}
        <div
          onClick={onOpenCreateSessionModal}
          className="group relative bg-gradient-to-br from-yellow-500/15 via-yellow-500/5 to-transparent hover:from-yellow-500/25 rounded-3xl p-5 border-2 border-yellow-300 hover:border-bvb-black cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-1 overflow-hidden"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-bvb-black flex items-center justify-center text-bvb-yellow shadow-lg shadow-yellow-500/30 group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <span className="w-8 h-8 rounded-full bg-yellow-100 group-hover:bg-bvb-black group-hover:text-bvb-yellow text-yellow-800 flex items-center justify-center transition-colors">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <h3 className="text-base font-black text-gray-900 group-hover:text-bvb-black transition-colors">
            创建教案
          </h3>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
            将热身、技术、技能、对抗组合成一堂完整的主题训练教案
          </p>
        </div>

        {/* Card 4: 创建其他 */}
        <div
          onClick={onOpenCreateOtherModal}
          className="group relative bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent hover:from-purple-500/20 rounded-3xl p-5 border-2 border-purple-200 hover:border-purple-500 cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-1 overflow-hidden"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30 group-hover:scale-110 transition-transform">
              <PenTool className="w-6 h-6" />
            </div>
            <span className="w-8 h-8 rounded-full bg-purple-100 group-hover:bg-purple-600 group-hover:text-white text-purple-700 flex items-center justify-center transition-colors">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <h3 className="text-base font-black text-gray-900 group-hover:text-purple-700 transition-colors">
            创建其他
          </h3>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
            自由编写青训理论、专栏笔记、技战术分析或复盘文章
          </p>
        </div>
      </div>

      {/* 2. Middle Calendar / Schedule Bar (Video 1: 训练日程) */}
      <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-bvb-black" />
            <h4 className="text-sm font-black text-gray-900">本周训练日程</h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-900">
              智能关联梯队排课
            </span>
          </div>
          <span className="text-xs text-gray-400 font-medium">点击日期可快速筛选与布置对应课次</span>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {currentWeekDays.map((d, i) => (
            <div
              key={i}
              className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                d.isToday
                  ? 'bg-bvb-black text-bvb-yellow border-bvb-black shadow-md ring-2 ring-yellow-400/30'
                  : d.count > 0
                  ? 'bg-gray-50 hover:bg-yellow-50/50 border-gray-200 hover:border-yellow-300'
                  : 'bg-white hover:bg-gray-50 border-gray-100 text-gray-400'
              }`}
            >
              <div className={`text-xs font-black ${d.isToday ? 'text-bvb-yellow' : 'text-gray-900'}`}>
                {d.day}
              </div>
              <div className="text-[10px] font-mono opacity-60 mt-0.5">{d.date}</div>
              <div className="mt-2">
                {d.count > 0 ? (
                  <span
                    className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-full ${
                      d.isToday
                        ? 'bg-yellow-400 text-gray-900'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {d.count} 节课
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-300">无排课</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Bottom Multi-Tab Content Section (Video 1) */}
      <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-5">
        
        {/* Main Tabs (我的内容, 我的专栏, 我的收藏) */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 flex-wrap gap-4">
          <div className="flex items-center gap-2">
            {[
              { id: 'content', label: '我的内容', count: designs.length },
              { id: 'articles', label: '我的专栏/文章', count: designs.filter(d => d.contentType === 'other').length },
              { id: 'favorites', label: '我的收藏', count: designs.filter(d => d.isFavorite).length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setMainTab(tab.id as any)}
                className={`px-4 py-2 rounded-2xl font-black text-xs transition-all flex items-center gap-1.5 ${
                  mainTab === tab.id
                    ? 'bg-bvb-black text-bvb-yellow shadow-md shadow-black/10'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  mainTab === tab.id ? 'bg-yellow-400 text-gray-900' : 'bg-gray-200 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub Navigation Bar: Folder Filter & Category Filters */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          
          {/* Folders & System Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
            <button
              onClick={() => setSubFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                subFilter === 'all' ? 'bg-emerald-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              全部内容 ({designs.length})
            </button>

            <button
              onClick={() => setSubFilter('unfiled')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                subFilter === 'unfiled' ? 'bg-emerald-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              未分类内容
            </button>

            <button
              onClick={() => setSubFilter('drafts')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                subFilter === 'drafts' ? 'bg-emerald-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              草稿箱
            </button>

            {/* Custom Folders */}
            {folders.map(f => (
              <button
                key={f.id}
                onClick={() => setSubFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  subFilter === f.id ? 'bg-emerald-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <Folder className="w-3.5 h-3.5" />
                <span>{f.name}</span>
              </button>
            ))}

            {showNewFolderInput ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  placeholder="文件夹名称..."
                  className="px-2 py-1 bg-gray-50 border border-gray-300 rounded-lg text-xs w-28 focus:outline-none"
                />
                <button
                  onClick={handleCreateFolder}
                  className="px-2 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg"
                >
                  确定
                </button>
                <button
                  onClick={() => setShowNewFolderInput(false)}
                  className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-lg"
                >
                  取消
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowNewFolderInput(true)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center gap-1 border border-dashed border-gray-300"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>新建文件夹</span>
              </button>
            )}
          </div>

          {/* Search and Category Filter */}
          <div className="flex items-center gap-2">
            <select
              value={contentTypeFilter}
              onChange={e => setContentTypeFilter(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none"
            >
              <option value="all">所有分类 (全部)</option>
              <option value="diagram">战术示意图</option>
              <option value="drill">训练项</option>
              <option value="session_plan">主题教案</option>
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索标题或主题..."
                className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:bg-white focus:outline-none w-44 sm:w-56"
              />
            </div>
          </div>
        </div>

        {/* 4. Items Render Area */}
        {filteredItems.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filteredItems.map(item => {
                const isSessionPlan = item.category === 'session_plan' || item.contentType === 'session_plan';
                const isDrill = item.category === 'drill_item' || item.contentType === 'drill';

                return (
                  <div
                    key={item.id}
                    className="group bg-white rounded-3xl border-2 border-gray-200 hover:border-emerald-500 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col justify-between"
                  >
                    {/* Top Preview Canvas Card */}
                    <div
                      onClick={() => onViewDetail(item)}
                      className="w-full aspect-[16/10] bg-gray-950 relative overflow-hidden cursor-pointer flex items-center justify-center group-hover:opacity-95 transition-opacity"
                    >
                      {item.previewImage ? (
                        <img src={item.previewImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <PitchSvgRenderer pitchType={item.pitchType || 'Midfield'} pitchTheme={item.pitchTheme || 'Grass'} className="w-full h-full" />
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full shadow-md ${
                            isSessionPlan
                              ? 'bg-yellow-400 text-gray-950'
                              : isDrill
                              ? 'bg-blue-500 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {isSessionPlan ? '主题教案' : isDrill ? '训练项' : '示意图'}
                        </span>
                        {item.isPrivate && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-gray-300 backdrop-blur-sm">
                            私有
                          </span>
                        )}
                      </div>

                      {/* Favorite Button */}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onToggleFavorite(item.id);
                        }}
                        className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                          item.isFavorite
                            ? 'bg-red-500 text-white shadow-md'
                            : 'bg-black/50 hover:bg-black text-white/80'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-current' : ''}`} />
                      </button>

                      {/* Quick play overlay indicator for plans/drills */}
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <span className="bg-white/95 text-gray-900 text-xs font-black px-3 py-1.5 rounded-full shadow-lg">
                          查看详情
                        </span>
                      </div>
                    </div>

                    {/* Bottom Info Body */}
                    <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <h4
                          onClick={() => onViewDetail(item)}
                          className="text-xs font-black text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-2 cursor-pointer leading-snug"
                        >
                          {item.title}
                        </h4>

                        <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[10px] font-bold">
                          {item.topic && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                              {item.topic}
                            </span>
                          )}
                          {item.durationMinutes && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{item.durationMinutes}分</span>
                            </span>
                          )}
                          {item.totalDuration && (
                            <span className="px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-800 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{item.totalDuration}分</span>
                            </span>
                          )}
                          {item.sessionStages && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">
                              {item.sessionStages.length}个环节
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                        <span className="text-[10px] font-mono">{item.createdAt || '2026-04-03'}</span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onEditItem(item)}
                            title="编辑"
                            className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDuplicateItem(item)}
                            title="复制"
                            className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteItem(item.id)}
                            title="删除"
                            className="p-1 hover:bg-red-50 rounded text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View Mode */
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden">
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  className="p-3.5 hover:bg-gray-50 flex items-center justify-between gap-4 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-10 bg-gray-950 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                      {item.previewImage ? (
                        <img src={item.previewImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <PitchSvgRenderer pitchType={item.pitchType || 'Midfield'} pitchTheme={item.pitchTheme || 'Grass'} className="w-full h-full" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4
                        onClick={() => onViewDetail(item)}
                        className="text-xs font-black text-gray-900 truncate hover:text-emerald-700 cursor-pointer"
                      >
                        {item.title}
                      </h4>
                      <p className="text-[10px] text-gray-500 truncate mt-0.5">{item.description || '暂无详细描述'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] font-mono text-gray-400">{item.createdAt}</span>
                    <button
                      onClick={() => onEditItem(item)}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="p-1 hover:bg-red-50 text-red-500 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Empty State */
          <div className="py-16 text-center">
            <div className="w-16 h-16 rounded-3xl bg-gray-100 flex items-center justify-center text-gray-400 mx-auto mb-3">
              <Compass className="w-8 h-8" />
            </div>
            <h4 className="text-sm font-black text-gray-900">暂无匹配内容</h4>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              你可以点击上方快捷卡片创建示意图、训练项或主题教案，开启高标准青训教案库。
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
