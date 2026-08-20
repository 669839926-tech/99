import React, { useState, useMemo } from 'react';
import { Match, Team, User, TournamentItem, TournamentTier, OrgRating } from '../types';
import { 
  Trophy, Star, Plus, Search, MapPin, Calendar, 
  ThumbsUp, ThumbsDown, Edit2, Trash2,
  Sparkles, ArrowUpRight, Info, X, Save, Target
} from 'lucide-react';
import { TIER_CONFIG, CATEGORY_OPTIONS, calculateTournamentRatings } from '../constants';

interface TournamentLibraryProps {
  tournaments: TournamentItem[];
  matches: Match[];
  teams: Team[];
  currentUser?: User | null;
  onUpdateTournaments: (tournaments: TournamentItem[]) => void;
  onAddMatchFromTournament?: (tournament: TournamentItem) => void;
  onSelectTournamentForFilter?: (tournamentName: string) => void;
}

const TournamentLibrary: React.FC<TournamentLibraryProps> = ({
  tournaments,
  matches,
  teams,
  onUpdateTournaments,
  onAddMatchFromTournament,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [recommendFilter, setRecommendFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'tier' | 'standard' | 'experience' | 'matches' | 'newest'>('tier');
  
  const [editingTournament, setEditingTournament] = useState<TournamentItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [detailModalTournament, setDetailModalTournament] = useState<TournamentItem | null>(null);

  // Auto-sync: Discover matches from `matches` that are not yet registered in tournaments
  const unindexedMatches = useMemo(() => {
    const existingNames = new Set(tournaments.map(t => t.name.trim().toLowerCase()));
    const unindexed = new Map<string, Match>();
    matches.forEach(m => {
      const compName = (m.isSeries ? (m.title || m.competition || m.opponent) : (m.competition || m.title))?.trim();
      if (compName && !existingNames.has(compName.toLowerCase()) && compName !== '联赛' && compName !== '杯赛' && compName !== '友谊赛' && compName !== '单场比赛') {
        if (!unindexed.has(compName)) {
          unindexed.set(compName, m);
        }
      }
    });
    return Array.from(unindexed.values());
  }, [tournaments, matches]);

  const handleSyncUnindexedMatches = () => {
    if (unindexedMatches.length === 0) return;
    const newItems: TournamentItem[] = unindexedMatches.map(m => {
      const name = (m.isSeries ? (m.title || m.competition || m.opponent) : (m.competition || m.title))!.trim();
      const org = m.details?.summaryBreakdown?.orgRating;
      const s1 = org?.eventOrganization ?? 5;
      const s2 = org?.refereeLevel ?? 4;
      const s3 = org?.venueCondition ?? 4;
      const e1 = org?.accommodation ?? 4;
      const e2 = org?.transportation ?? 4;
      
      return {
        id: 'tour-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
        name,
        tier: (name.includes('全国') || name.includes('锦标赛') || name.includes('中青赛')) ? 'S' : (name.includes('省') || name.includes('之星') || name.includes('邀请赛') ? 'A' : 'B'),
        category: (name.includes('全国') || name.includes('足协')) ? '官方赛事' : (name.includes('邀请赛') || name.includes('之星') ? '品牌赛事' : '商业赛事'),
        standardRating: Number(((s1 + s2 + s3) / 3).toFixed(1)),
        experienceRating: Number(((e1 + e2) / 2).toFixed(1)),
        recommendParticipation: org?.recommendParticipation ?? '是',
        orgRating: org || {
          eventOrganization: s1,
          refereeLevel: s2,
          venueCondition: s3,
          accommodation: e1,
          transportation: e2,
          recommendParticipation: '是'
        },
        province: m.province,
        city: m.city,
        district: m.district,
        targetAgeGroup: teams.find(t => t.id === m.teamId)?.name || '青训梯队',
        seasonMonth: m.date ? `${new Date(m.date).getMonth() + 1}月份` : '常规赛季',
        isPotential: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });

    onUpdateTournaments([...tournaments, ...newItems]);
  };

  const processedTournaments = useMemo(() => {
    return tournaments.map(t => {
      const stats = calculateTournamentRatings(t, matches);
      return {
        ...t,
        stats
      };
    });
  }, [tournaments, matches]);

  const filteredTournaments = useMemo(() => {
    const result = processedTournaments.filter(t => {
      if (searchTerm.trim()) {
        const query = searchTerm.trim().toLowerCase();
        const matchName = t.name.toLowerCase().includes(query);
        const matchCity = (t.city || '').toLowerCase().includes(query) || (t.province || '').toLowerCase().includes(query);
        const matchOrg = (t.organizer || '').toLowerCase().includes(query);
        const matchAge = (t.targetAgeGroup || '').toLowerCase().includes(query);
        if (!matchName && !matchCity && !matchOrg && !matchAge) return false;
      }

      if (tierFilter !== 'all' && t.tier !== tierFilter) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (recommendFilter !== 'all') {
        const isRec = t.stats.recommendParticipation === '是' || t.stats.recommendParticipation === true;
        if (recommendFilter === 'yes' && !isRec) return false;
        if (recommendFilter === 'no' && isRec) return false;
      }

      return true;
    });

    // Sorting
    return [...result].sort((a, b) => {
      if (sortBy === 'tier') {
        const tierWeights: Record<TournamentTier, number> = { S: 4, A: 3, B: 2, C: 1 };
        const diff = (tierWeights[b.tier] || 0) - (tierWeights[a.tier] || 0);
        if (diff !== 0) return diff;
        return (b.stats.standardRating || 0) - (a.stats.standardRating || 0);
      }
      if (sortBy === 'standard') {
        return (b.stats.standardRating || 0) - (a.stats.standardRating || 0);
      }
      if (sortBy === 'experience') {
        return (b.stats.experienceRating || 0) - (a.stats.experienceRating || 0);
      }
      if (sortBy === 'matches') {
        return b.stats.matchCount - a.stats.matchCount;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [processedTournaments, searchTerm, tierFilter, categoryFilter, recommendFilter, sortBy]);

  // Summary counts
  const summary = useMemo(() => {
    const total = tournaments.length;
    const sCount = tournaments.filter(t => t.tier === 'S').length;
    const aCount = tournaments.filter(t => t.tier === 'A').length;
    const bCount = tournaments.filter(t => t.tier === 'B').length;
    const cCount = tournaments.filter(t => t.tier === 'C').length;
    const recommendYes = processedTournaments.filter(t => t.stats.recommendParticipation === '是' || t.stats.recommendParticipation === true).length;
    const playedCount = processedTournaments.filter(t => t.stats.hasPlayed).length;

    return {
      total,
      sCount,
      aCount,
      bCount,
      cCount,
      recommendRate: total > 0 ? Math.round((recommendYes / total) * 100) : 100,
      playedCount,
      potentialCount: total - playedCount
    };
  }, [tournaments, processedTournaments]);

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`确定要从赛事库中删除【${name}】吗？删除后不影响已有比赛的日程流水。`)) {
      onUpdateTournaments(tournaments.filter(t => t.id !== id));
      if (detailModalTournament?.id === id) setDetailModalTournament(null);
    }
  };

  const handleSaveTournament = (savedItem: TournamentItem) => {
    const exists = tournaments.some(t => t.id === savedItem.id);
    let updated: TournamentItem[];
    if (exists) {
      updated = tournaments.map(t => t.id === savedItem.id ? { ...savedItem, updatedAt: new Date().toISOString() } : t);
    } else {
      updated = [
        {
          ...savedItem,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        ...tournaments
      ];
    }
    onUpdateTournaments(updated);
    setEditingTournament(null);
    setIsCreating(false);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300">
      {/* 顶部标题与快速统计栏 */}
      <div className="bg-gradient-to-r from-bvb-black via-gray-900 to-black text-white p-5 md:p-7 rounded-3xl shadow-xl relative overflow-hidden">
        {/* 背景装饰光效 */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-bvb-yellow/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-bvb-yellow text-bvb-black p-2 md:p-2.5 rounded-2xl shadow-md">
                <Trophy className="w-6 h-6 md:w-7 md:h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">俱乐部赛事库</h2>
                  <span className="bg-bvb-yellow/20 text-bvb-yellow border border-bvb-yellow/30 text-[10px] md:text-xs px-2.5 py-0.5 rounded-full font-black">
                    TOURNAMENT ARCHIVES
                  </span>
                </div>
                <p className="text-xs md:text-sm text-gray-400 mt-0.5 font-medium">
                  收录全部已参战赛事、潜在邀约赛事，沉淀组织水准、体验评分与再次参赛研判
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto flex-wrap sm:flex-nowrap">
            {unindexedMatches.length > 0 && (
              <button
                onClick={handleSyncUnindexedMatches}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-bvb-yellow border border-bvb-yellow/40 rounded-2xl text-xs font-black transition-all shadow-sm shrink-0"
                title={`发现 ${unindexedMatches.length} 场历史比赛名称未在库中`}
              >
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span>同步已打比赛 ({unindexedMatches.length})</span>
              </button>
            )}
            <button
              onClick={() => {
                setEditingTournament({
                  id: 'tour-' + Date.now(),
                  name: '',
                  tier: 'A',
                  category: '品牌赛事',
                  standardRating: 4.5,
                  experienceRating: 4.0,
                  recommendParticipation: '是',
                  orgRating: {
                    eventOrganization: 5,
                    refereeLevel: 4,
                    venueCondition: 4,
                    accommodation: 4,
                    transportation: 4,
                    recommendParticipation: '是'
                  },
                  province: '贵州省',
                  city: '贵阳市',
                  targetAgeGroup: '2015/2016挑战队',
                  seasonMonth: '暑期7-8月',
                  isPotential: true,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                });
                setIsCreating(true);
              }}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-bvb-yellow text-bvb-black font-black rounded-2xl shadow-lg hover:bg-yellow-400 hover:scale-105 active:scale-95 transition-all text-xs md:text-sm shrink-0 flex-1 sm:flex-none"
            >
              <Plus className="w-4 h-4 md:w-5 md:h-5 stroke-[3]" />
              <span>录入潜在 / 新赛事</span>
            </button>
          </div>
        </div>

        {/* 统计胶囊 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase">赛事总库容</p>
            <p className="text-xl md:text-2xl font-black text-white mt-1 tabular-nums">
              {summary.total} <span className="text-xs font-normal text-gray-400">项</span>
            </p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3">
            <p className="text-[10px] font-bold text-amber-400 uppercase flex items-center gap-1">
              <span>👑 S级顶级赛事</span>
            </p>
            <p className="text-xl md:text-2xl font-black text-amber-300 mt-1 tabular-nums">
              {summary.sCount} <span className="text-xs font-normal text-amber-400/80">项</span>
            </p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-3">
            <p className="text-[10px] font-bold text-blue-400 uppercase flex items-center gap-1">
              <span>💎 A级高水平</span>
            </p>
            <p className="text-xl md:text-2xl font-black text-blue-300 mt-1 tabular-nums">
              {summary.aCount} <span className="text-xs font-normal text-blue-400/80">项</span>
            </p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3">
            <p className="text-[10px] font-bold text-emerald-400 uppercase flex items-center gap-1">
              <span>🌱 B/C级赛事</span>
            </p>
            <p className="text-xl md:text-2xl font-black text-emerald-300 mt-1 tabular-nums">
              {summary.bCount + summary.cCount} <span className="text-xs font-normal text-emerald-400/80">项</span>
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase">已参战历史赛事</p>
            <p className="text-xl md:text-2xl font-black text-white mt-1 tabular-nums">
              {summary.playedCount} <span className="text-xs font-normal text-gray-400">项</span>
            </p>
          </div>
          <div className="bg-bvb-yellow/10 border border-bvb-yellow/30 rounded-2xl p-3">
            <p className="text-[10px] font-bold text-bvb-yellow uppercase flex items-center gap-1">
              <span>👍 综合推荐率</span>
            </p>
            <p className="text-xl md:text-2xl font-black text-bvb-yellow mt-1 tabular-nums">
              {summary.recommendRate}%
            </p>
          </div>
        </div>
      </div>

      {/* 搜索与过滤工具栏 */}
      <div className="bg-white p-4 md:p-5 rounded-3xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        {/* 搜索输入 */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索赛事名称、举办城市、主办方、适龄组别..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs md:text-sm font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-bvb-yellow outline-none transition-all"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 筛选项组合 */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
          {/* 等级筛选 */}
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-bvb-yellow shadow-2xs shrink-0"
          >
            <option value="all">全部等级 (All Tiers)</option>
            <option value="S">👑 S级 (顶级赛事)</option>
            <option value="A">💎 A级 (高水平赛事)</option>
            <option value="B">🌱 B级 (普通成长)</option>
            <option value="C">⚽ C级 (基础赛事)</option>
          </select>

          {/* 类型筛选 */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-bvb-yellow shadow-2xs shrink-0"
          >
            <option value="all">全部赛事类型</option>
            {CATEGORY_OPTIONS.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* 推荐筛选 */}
          <select
            value={recommendFilter}
            onChange={(e) => setRecommendFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-bvb-yellow shadow-2xs shrink-0"
          >
            <option value="all">全部推荐状态</option>
            <option value="yes">👍 推荐再次参赛</option>
            <option value="no">👎 不推荐</option>
          </select>

          {/* 排序方式 */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-black text-gray-900 outline-none focus:ring-2 focus:ring-bvb-yellow shadow-2xs shrink-0"
          >
            <option value="tier">🏆 按等级高低 (S→C)</option>
            <option value="standard">🎯 按水准评分</option>
            <option value="experience">🌟 按体验评分</option>
            <option value="matches">⚽ 按参赛场次</option>
            <option value="newest">🕒 按收录时间</option>
          </select>
        </div>
      </div>

      {/* 赛事等级说明条 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {(['S', 'A', 'B', 'C'] as TournamentTier[]).map((tierKey) => {
          const cfg = TIER_CONFIG[tierKey];
          const isSelected = tierFilter === tierKey;
          return (
            <button
              key={tierKey}
              onClick={() => setTierFilter(isSelected ? 'all' : tierKey)}
              className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                isSelected 
                  ? 'bg-bvb-black text-white border-bvb-black shadow-md' 
                  : 'bg-white text-gray-800 border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-[11px] px-2 py-0.5 rounded-lg ${cfg.badge}`}>
                  {cfg.label}
                </span>
                <div className="leading-tight">
                  <p className={`text-xs font-black ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                    {tierKey === 'S' && '高等级突出展示'}
                    {tierKey === 'A' && '次一级突出展示'}
                    {tierKey === 'B' && '普通成长赛事'}
                    {tierKey === 'C' && '基础赛事'}
                  </p>
                  <p className={`text-[10px] ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>
                    {cfg.description}
                  </p>
                </div>
              </div>
              <span className="text-xs font-black tabular-nums opacity-80">
                {tournaments.filter(t => t.tier === tierKey).length}
              </span>
            </button>
          );
        })}
      </div>

      {/* 赛事卡片列表网格 (Card Grid) */}
      {filteredTournaments.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 flex flex-col items-center justify-center border border-dashed border-gray-300 text-gray-400 gap-4 text-center">
          <Trophy className="w-16 h-16 opacity-20 text-gray-400" />
          <div>
            <h3 className="font-black text-gray-700 text-base">未找到符合条件的赛事</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-md">
              尝试清除筛选条件，或点击右上角「录入潜在 / 新赛事」添加新的赛事档案
            </p>
          </div>
          <button
            onClick={() => {
              setSearchTerm('');
              setTierFilter('all');
              setCategoryFilter('all');
              setRecommendFilter('all');
            }}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all"
          >
            重置所有筛选
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6">
          {filteredTournaments.map((t) => {
            const cfg = TIER_CONFIG[t.tier || 'B'];
            const stats = t.stats;
            const isRecommended = stats.recommendParticipation === '是' || stats.recommendParticipation === true;
            const detailed = stats.detailedOrgRating;

            return (
              <div
                key={t.id}
                className={`rounded-3xl border ${cfg.cardBorder} ${cfg.cardBg} ${cfg.glow} p-5 md:p-6 transition-all duration-300 flex flex-col justify-between relative group hover:-translate-y-1 hover:shadow-xl`}
              >
                {/* 顶部栏：等级徽章 + 赛事类型 + 适龄组别 + 操作区 */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* 等级徽章 (S/A/B/C) */}
                      <span className={`text-xs px-2.5 py-1 rounded-xl flex items-center gap-1 uppercase tracking-wider ${cfg.badge}`}>
                        <span>{cfg.icon}</span>
                        <span>{cfg.label}</span>
                      </span>

                      {/* 赛事类型 (官方/品牌/商业/地方/交流赛) */}
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-gray-900/5 text-gray-700 border border-gray-200">
                        {t.category || '官方赛事'}
                      </span>

                      {/* 适龄组别 */}
                      {t.targetAgeGroup && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                          {t.targetAgeGroup}
                        </span>
                      )}
                    </div>

                    {/* 快捷操作按钮 */}
                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingTournament(t);
                          setIsCreating(false);
                        }}
                        className="p-1.5 hover:bg-gray-100 text-gray-500 hover:text-bvb-black rounded-lg transition-all"
                        title="编辑赛事资料"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id, t.name)}
                        className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-all"
                        title="删除该赛事"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 赛事名称 */}
                  <h3 className={`text-lg md:text-xl font-black tracking-tight ${cfg.titleColor} mb-2 leading-snug line-clamp-2`}>
                    {t.name}
                  </h3>

                  {/* 地点与举办周期 */}
                  <div className="flex items-center gap-3 text-xs text-gray-600 font-bold mb-4 flex-wrap">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>{[t.province, t.city, t.district].filter(Boolean).join(' ') || t.locationName || '全国/待定'}</span>
                    </div>
                    {t.seasonMonth && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{t.seasonMonth}</span>
                      </div>
                    )}
                  </div>

                  {/* 核心双指标评分卡片 (结合图2) */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {/* 赛事水准评分 (1-3项均星) */}
                    <div className="bg-white/90 p-3 rounded-2xl border border-amber-200/70 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-amber-900 uppercase tracking-wider flex items-center gap-1">
                          <Target className="w-3 h-3 text-amber-500" /> 赛事水准评分
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1 my-1">
                        <span className="text-2xl font-black text-amber-600 tabular-nums leading-none">
                          {stats.standardRating}
                        </span>
                        <span className="text-xs font-black text-amber-500">★</span>
                      </div>
                      <p className="text-[9px] text-gray-500 font-medium">
                        组织 {detailed.eventOrganization ?? 5}★ · 裁判 {detailed.refereeLevel ?? 5}★ · 场地 {detailed.venueCondition ?? 5}★
                      </p>
                    </div>

                    {/* 赛事体验评分 (4-5项均星) */}
                    <div className="bg-white/90 p-3 rounded-2xl border border-blue-200/70 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-blue-900 uppercase tracking-wider flex items-center gap-1">
                          <Star className="w-3 h-3 text-blue-500" /> 赛事体验评分
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1 my-1">
                        <span className="text-2xl font-black text-blue-600 tabular-nums leading-none">
                          {stats.experienceRating}
                        </span>
                        <span className="text-xs font-black text-blue-500">★</span>
                      </div>
                      <p className="text-[9px] text-gray-500 font-medium">
                        住宿 {detailed.accommodation ?? 5}★ · 交通 {detailed.transportation ?? 5}★
                      </p>
                    </div>
                  </div>

                  {/* 推荐再次参赛徽章 (图2录入) */}
                  <div className="flex items-center justify-between bg-white/80 p-2.5 rounded-xl border border-gray-200/80 mb-4 text-xs font-bold">
                    <span className="text-gray-600 text-[11px]">推荐再次参赛研判:</span>
                    {isRecommended ? (
                      <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200 font-black text-[11px]">
                        <ThumbsUp className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                        <span>推荐再次参赛</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-700 bg-red-50 px-2.5 py-0.5 rounded-lg border border-red-200 font-black text-[11px]">
                        <ThumbsDown className="w-3.5 h-3.5 text-red-600 fill-red-600" />
                        <span>不推荐再次参赛</span>
                      </span>
                    )}
                  </div>

                  {/* 历史参战记录与备注 */}
                  <div className="bg-gray-50/80 rounded-2xl p-3 border border-gray-100 mb-4 text-xs">
                    <div className="flex items-center justify-between text-gray-500 text-[10px] font-black uppercase mb-1">
                      <span>参赛履历与战绩</span>
                      <span className="text-gray-700">{stats.hasPlayed ? `已打 ${stats.matchCount} 场` : '潜在待参赛'}</span>
                    </div>
                    {stats.hasPlayed ? (
                      <div className="flex items-center justify-between font-bold text-gray-800">
                        <span className="text-xs text-bvb-black font-black">{stats.recordText}</span>
                        {t.bestAchievement && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                            🏆 {t.bestAchievement}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-500 italic">
                        {t.notes ? t.notes.slice(0, 45) + (t.notes.length > 45 ? '...' : '') : '暂未参加，已录入俱乐部潜在参赛观察备忘。'}
                      </p>
                    )}
                  </div>
                </div>

                {/* 底部按钮栏 */}
                <div className="pt-3 border-t border-gray-200/60 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setDetailModalTournament(t)}
                    className="text-xs font-bold text-gray-600 hover:text-bvb-black flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-gray-100 transition-all"
                  >
                    <Info className="w-3.5 h-3.5" /> 详情与评分明细
                  </button>

                  <button
                    onClick={() => {
                      if (onAddMatchFromTournament) {
                        onAddMatchFromTournament(t);
                      }
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-bvb-black text-bvb-yellow hover:bg-gray-800 rounded-xl text-xs font-black shadow-sm transition-all"
                  >
                    <span>从此赛事新建比赛</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 新增 / 编辑赛事弹窗 (Modal) */}
      {editingTournament && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="bg-bvb-black p-4 md:p-5 flex justify-between items-center text-white shrink-0">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-bvb-yellow" />
                <h3 className="font-black text-sm md:text-base">
                  {isCreating ? '录入新赛事 / 潜在赛事' : `编辑赛事：${editingTournament.name || '未命名'}`}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setEditingTournament(null);
                  setIsCreating(false);
                }}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editingTournament.name.trim()) {
                  alert('请填写赛事名称');
                  return;
                }
                handleSaveTournament(editingTournament);
              }}
              className="p-5 md:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-5"
            >
              {/* 赛事名称 */}
              <div>
                <label className="block text-[10px] md:text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">
                  赛事主体名称 <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={editingTournament.name}
                  onChange={(e) => setEditingTournament({ ...editingTournament, name: e.target.value })}
                  placeholder="如: 2026贵州仁怀全国足球邀请赛、中国青少年足球联赛 (中青赛)"
                  className="w-full p-3 border rounded-2xl font-black text-sm text-gray-900 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-bvb-yellow outline-none"
                />
              </div>

              {/* 赛事等级 (S / A / B / C) 单选徽章 */}
              <div>
                <label className="block text-[10px] md:text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">
                  赛事等级划分 (S / A / B / C) <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['S', 'A', 'B', 'C'] as TournamentTier[]).map((tier) => {
                    const isSelected = editingTournament.tier === tier;
                    const cfg = TIER_CONFIG[tier];
                    return (
                      <button
                        type="button"
                        key={tier}
                        onClick={() => setEditingTournament({ ...editingTournament, tier })}
                        className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                          isSelected
                            ? 'bg-bvb-black text-white border-bvb-black shadow-md scale-102 ring-2 ring-bvb-yellow'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        <span className={`text-xs px-2.5 py-0.5 rounded-lg ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                        <span className={`text-[10px] font-bold ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>
                          {tier === 'S' && '高等级突出'}
                          {tier === 'A' && '次一级突出'}
                          {tier === 'B' && '普通成长'}
                          {tier === 'C' && '基础赛事'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 赛事类型 (官方赛事 / 品牌赛事 / 商业赛事 / 地方赛事 / 交流赛) */}
              <div>
                <label className="block text-[10px] md:text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">
                  赛事类型 <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {CATEGORY_OPTIONS.map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setEditingTournament({ ...editingTournament, category: cat })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        editingTournament.category === cat
                          ? 'bg-bvb-black text-bvb-yellow border-bvb-black shadow-sm'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={editingTournament.category}
                  onChange={(e) => setEditingTournament({ ...editingTournament, category: e.target.value })}
                  placeholder="或自定义输入赛事类型 (如: 足协官方A标锦标赛)"
                  className="w-full p-2.5 border rounded-xl text-xs font-bold text-gray-700 bg-white"
                />
              </div>

              {/* 举办地点与常规周期 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] md:text-xs font-black text-gray-500 uppercase tracking-widest mb-1">
                    举办地点 (省 / 市 / 基地)
                  </label>
                  <input
                    type="text"
                    value={editingTournament.city || ''}
                    onChange={(e) => setEditingTournament({ ...editingTournament, city: e.target.value })}
                    placeholder="如: 贵州省 遵义市 仁怀市"
                    className="w-full p-2.5 border rounded-xl text-xs font-bold bg-gray-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] md:text-xs font-black text-gray-500 uppercase tracking-widest mb-1">
                    举办常规周期 / 月份
                  </label>
                  <input
                    type="text"
                    value={editingTournament.seasonMonth || ''}
                    onChange={(e) => setEditingTournament({ ...editingTournament, seasonMonth: e.target.value })}
                    placeholder="如: 每年五一假期 / 每年暑期7-8月"
                    className="w-full p-2.5 border rounded-xl text-xs font-bold bg-gray-50 focus:bg-white"
                  />
                </div>
              </div>

              {/* 适龄组别与主办方 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] md:text-xs font-black text-gray-500 uppercase tracking-widest mb-1">
                    适龄组别 / 梯队
                  </label>
                  <input
                    type="text"
                    value={editingTournament.targetAgeGroup || ''}
                    onChange={(e) => setEditingTournament({ ...editingTournament, targetAgeGroup: e.target.value })}
                    placeholder="如: U8 / U9 / 2015挑战队 / 2016红队"
                    className="w-full p-2.5 border rounded-xl text-xs font-bold bg-gray-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] md:text-xs font-black text-gray-500 uppercase tracking-widest mb-1">
                    主办方 / 承办单位
                  </label>
                  <input
                    type="text"
                    value={editingTournament.organizer || ''}
                    onChange={(e) => setEditingTournament({ ...editingTournament, organizer: e.target.value })}
                    placeholder="如: 中国足协青训部 / 贵州省足协"
                    className="w-full p-2.5 border rounded-xl text-xs font-bold bg-gray-50 focus:bg-white"
                  />
                </div>
              </div>

              {/* 赛事组织评价录入 (5项指标 + 推荐研判 - 结合图2) */}
              <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200">
                <label className="text-xs font-black text-amber-900 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                  <span>赛事组织评价与评分标准 (结合比赛日志评价)</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  {/* 项目1-3: 赛事水准 */}
                  <div className="bg-white p-3 rounded-xl border border-amber-100 space-y-2">
                    <p className="text-[10px] font-black text-amber-800 uppercase flex items-center justify-between">
                      <span>🎯 赛事水准维度 (1-3项目)</span>
                    </p>
                    {[
                      { key: 'eventOrganization', label: '1. 赛事组织' },
                      { key: 'refereeLevel', label: '2. 裁判水平' },
                      { key: 'venueCondition', label: '3. 场地条件' },
                    ].map(item => {
                      const curRating = editingTournament.orgRating?.[item.key as keyof OrgRating] as number ?? 5;
                      return (
                        <div key={item.key} className="flex items-center justify-between text-xs">
                          <span className="font-bold text-gray-700">{item.label}</span>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                type="button"
                                key={star}
                                onClick={() => {
                                  const updatedOrg = {
                                    ...(editingTournament.orgRating || {}),
                                    [item.key]: star
                                  };
                                  setEditingTournament({
                                    ...editingTournament,
                                    orgRating: updatedOrg as OrgRating
                                  });
                                }}
                                className="p-0.5 hover:scale-110 transition-transform"
                              >
                                <Star 
                                  className={`w-4 h-4 ${star <= curRating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} 
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 项目4-5: 赛事体验 */}
                  <div className="bg-white p-3 rounded-xl border border-amber-100 space-y-2">
                    <p className="text-[10px] font-black text-blue-800 uppercase flex items-center justify-between">
                      <span>🌟 赛事体验维度 (4-5项目)</span>
                    </p>
                    {[
                      { key: 'accommodation', label: '4. 住宿环境' },
                      { key: 'transportation', label: '5. 交通配备' },
                    ].map(item => {
                      const curRating = editingTournament.orgRating?.[item.key as keyof OrgRating] as number ?? 4;
                      return (
                        <div key={item.key} className="flex items-center justify-between text-xs">
                          <span className="font-bold text-gray-700">{item.label}</span>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                type="button"
                                key={star}
                                onClick={() => {
                                  const updatedOrg = {
                                    ...(editingTournament.orgRating || {}),
                                    [item.key]: star
                                  };
                                  setEditingTournament({
                                    ...editingTournament,
                                    orgRating: updatedOrg as OrgRating
                                  });
                                }}
                                className="p-0.5 hover:scale-110 transition-transform"
                              >
                                <Star 
                                  className={`w-4 h-4 ${star <= curRating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} 
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 推荐再次参赛选择 (图2一致) */}
                <div className="bg-white p-3 rounded-xl border border-amber-100 flex items-center justify-between">
                  <span className="text-xs font-black text-gray-800">推荐再次参赛:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTournament({
                          ...editingTournament,
                          recommendParticipation: '是',
                          orgRating: {
                            ...(editingTournament.orgRating || {}),
                            recommendParticipation: '是'
                          }
                        });
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 border transition-all ${
                        (editingTournament.recommendParticipation === '是' || editingTournament.recommendParticipation === true)
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" /> 是 (推荐)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTournament({
                          ...editingTournament,
                          recommendParticipation: '否',
                          orgRating: {
                            ...(editingTournament.orgRating || {}),
                            recommendParticipation: '否'
                          }
                        });
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 border transition-all ${
                        (editingTournament.recommendParticipation === '否' || editingTournament.recommendParticipation === false)
                          ? 'bg-red-600 text-white border-red-600 shadow-sm'
                          : 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}
                    >
                      <ThumbsDown className="w-3.5 h-3.5" /> 否 (不推荐)
                    </button>
                  </div>
                </div>
              </div>

              {/* 赛事特色与备忘 */}
              <div>
                <label className="block text-[10px] md:text-xs font-black text-gray-500 uppercase tracking-widest mb-1">
                  赛事备忘 / 往届经验总结
                </label>
                <textarea
                  rows={3}
                  value={editingTournament.notes || ''}
                  onChange={(e) => setEditingTournament({ ...editingTournament, notes: e.target.value })}
                  placeholder="记录该赛事的参赛要求、食宿特点、裁判风格、对阵强队、往年战绩或值得关注的细节..."
                  className="w-full p-3 border rounded-2xl text-xs font-medium text-gray-800 bg-gray-50 focus:bg-white outline-none"
                />
              </div>

              {/* 提交按钮栏 */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setEditingTournament(null);
                    setIsCreating(false);
                  }}
                  className="px-5 py-2.5 rounded-2xl text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-bvb-yellow text-bvb-black font-black rounded-2xl text-xs md:text-sm shadow-md hover:bg-yellow-400 transition-all flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>保存赛事档案</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 赛事详情与评价明细弹窗 (Detail Modal) */}
      {detailModalTournament && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            {(() => {
              const cfg = TIER_CONFIG[detailModalTournament.tier || 'B'];
              const stats = calculateTournamentRatings(detailModalTournament, matches);
              const detailed = stats.detailedOrgRating;

              return (
                <>
                  <div className="bg-bvb-black p-5 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2.5 py-0.5 rounded-lg ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                      <h3 className="font-black text-sm md:text-base text-white truncate max-w-md">
                        {detailModalTournament.name}
                      </h3>
                    </div>
                    <button 
                      onClick={() => setDetailModalTournament(null)}
                      className="text-gray-400 hover:text-white p-1"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar">
                    {/* 等级与类型说明 */}
                    <div className="flex items-center justify-between bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase">赛事等级与定位</p>
                        <p className="text-sm font-black text-gray-800 mt-0.5">{cfg.description}</p>
                      </div>
                      <span className="text-xs font-bold px-3 py-1 rounded-xl bg-white border text-gray-700 shadow-2xs">
                        {detailModalTournament.category || '官方赛事'}
                      </span>
                    </div>

                    {/* 5项细分评价星级 (结合图2) */}
                    <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/80 space-y-3">
                      <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                        <span>赛事组织综合评价明细 (比赛日志评分均星)</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="bg-white p-3 rounded-xl border border-amber-100 flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-700">1. 赛事组织</span>
                          <span className="text-xs font-black text-amber-600 tabular-nums">
                            {detailed.eventOrganization ?? 5} ★
                          </span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-amber-100 flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-700">2. 裁判水平</span>
                          <span className="text-xs font-black text-amber-600 tabular-nums">
                            {detailed.refereeLevel ?? 5} ★
                          </span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-amber-100 flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-700">3. 场地条件</span>
                          <span className="text-xs font-black text-amber-600 tabular-nums">
                            {detailed.venueCondition ?? 5} ★
                          </span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-blue-100 flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-700">4. 住宿环境</span>
                          <span className="text-xs font-black text-blue-600 tabular-nums">
                            {detailed.accommodation ?? 5} ★
                          </span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-blue-100 flex items-center justify-between sm:col-span-2">
                          <span className="text-xs font-bold text-gray-700">5. 交通配备</span>
                          <span className="text-xs font-black text-blue-600 tabular-nums">
                            {detailed.transportation ?? 5} ★
                          </span>
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-amber-100 flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-700">推荐再次参赛结论:</span>
                        {stats.recommendParticipation === '是' || stats.recommendParticipation === true ? (
                          <span className="text-emerald-700 font-black flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                            <ThumbsUp className="w-3.5 h-3.5 fill-emerald-600" /> 是 (推荐继续参赛)
                          </span>
                        ) : (
                          <span className="text-red-700 font-black flex items-center gap-1 bg-red-50 px-2.5 py-0.5 rounded-lg border border-red-200">
                            <ThumbsDown className="w-3.5 h-3.5 fill-red-600" /> 否 (综合体验不佳，暂不推荐)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 往届战绩与备忘 */}
                    {detailModalTournament.notes && (
                      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">赛事备忘与经验总结</p>
                        <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap font-medium">
                          {detailModalTournament.notes}
                        </p>
                      </div>
                    )}

                    {/* 关联比赛日程一览 */}
                    <div>
                      <h4 className="text-xs font-black text-gray-800 uppercase mb-2 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-bvb-yellow" />
                        <span>关联比赛日程 ({stats.matchCount} 场)</span>
                      </h4>
                      {stats.matchCount === 0 ? (
                        <p className="text-xs text-gray-400 italic bg-gray-50 p-3 rounded-xl border border-dashed text-center">
                          暂无历史比赛流水记录，可点击下方按钮创建关联比赛
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                          {matches.filter(m => 
                            (m.tournamentId && m.tournamentId === detailModalTournament.id) ||
                            (m.competition && m.competition.trim() === detailModalTournament.name.trim()) ||
                            (m.title && m.title.trim() === detailModalTournament.name.trim()) ||
                            (m.opponent && m.opponent.trim() === detailModalTournament.name.trim())
                          ).map(m => (
                            <div key={m.id} className="bg-gray-50 p-2.5 rounded-xl border border-gray-200 text-xs flex justify-between items-center">
                              <div>
                                <span className="font-bold text-gray-800">{m.title || m.opponent}</span>
                                <span className="text-[10px] text-gray-400 ml-2">{m.date}</span>
                              </div>
                              <span className="font-black text-bvb-black bg-white px-2 py-0.5 rounded border">
                                {m.seriesResult || m.result || (m.status === 'Upcoming' ? '即将进行' : '已完成')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 border-t bg-gray-50 flex justify-between items-center shrink-0">
                    <button
                      onClick={() => {
                        const target = detailModalTournament;
                        setDetailModalTournament(null);
                        setEditingTournament(target);
                        setIsCreating(false);
                      }}
                      className="px-4 py-2 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-700"
                    >
                      编辑此赛事
                    </button>
                    <button
                      onClick={() => {
                        const target = detailModalTournament;
                        setDetailModalTournament(null);
                        if (onAddMatchFromTournament) {
                          onAddMatchFromTournament(target);
                        }
                      }}
                      className="px-5 py-2 bg-bvb-black text-bvb-yellow rounded-xl text-xs font-black hover:bg-gray-800 shadow-sm"
                    >
                      从此赛事新建比赛
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentLibrary;
