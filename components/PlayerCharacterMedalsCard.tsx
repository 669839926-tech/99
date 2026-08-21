import React, { useState, useMemo } from 'react';
import { Player, PlayerCharacterAssessment, CharacterDimensionKey, CharacterBadgeLevel } from '../types';
import { CHARACTER_DIMENSIONS, CHARACTER_BADGE_LEVELS, DIMENSION_MEDAL_CONFIG } from '../constants';
import { CharacterMedalBadge } from './CharacterMedalBadges';
import { Award, Trophy, Crown, Sparkles, CheckCircle2, ChevronRight, X, Calendar, UserCheck, ShieldCheck, Flame, Lightbulb, Users, Shield, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

interface PlayerCharacterMedalsCardProps {
  player: Player;
  characterAssessments?: PlayerCharacterAssessment[];
  className?: string;
}

export const PlayerCharacterMedalsCard: React.FC<PlayerCharacterMedalsCardProps> = ({
  player,
  characterAssessments = [],
  className = ''
}) => {
  const [selectedDimensionKey, setSelectedDimensionKey] = useState<CharacterDimensionKey | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // 筛选该球员的所有评定记录（按比赛日期倒序）
  const playerAssessments = useMemo(() => {
    return characterAssessments
      .filter(a => a.playerId === player.id)
      .sort((a, b) => new Date(b.matchDate || b.createdAt).getTime() - new Date(a.matchDate || a.createdAt).getTime());
  }, [characterAssessments, player.id]);

  // 聚合各维度品质数据
  const dimensionStats = useMemo(() => {
    const stats: Record<CharacterDimensionKey, {
      dimensionKey: CharacterDimensionKey;
      name: string;
      english: string;
      themeColor: string;
      earnedCount: number;
      outstandingCount: number;
      standardCount: number;
      observingCount: number;
      bestLevel: CharacterBadgeLevel;
      latestAssessment: {
        assessment: PlayerCharacterAssessment;
        totalScore: number | null;
        badgeLevel: CharacterBadgeLevel;
        checkpoint1: number | null;
        checkpoint2: number | null;
        coachNote?: string;
      } | null;
      history: Array<{
        assessmentId: string;
        matchTitle: string;
        matchDate: string;
        matchType: 'regular' | 'intramural';
        opponentOrTeams?: string;
        evaluatorName?: string;
        totalScore: number | null;
        badgeLevel: CharacterBadgeLevel;
        checkpoint1: number | null;
        checkpoint2: number | null;
        coachNote?: string;
      }>;
    }> = {
      confidence: { dimensionKey: 'confidence', name: '自信', english: 'CONFIDENCE', themeColor: '#EAB308', earnedCount: 0, outstandingCount: 0, standardCount: 0, observingCount: 0, bestLevel: 'none', latestAssessment: null, history: [] },
      resilience: { dimensionKey: 'resilience', name: '坚韧', english: 'PERSEVERANCE', themeColor: '#F59E0B', earnedCount: 0, outstandingCount: 0, standardCount: 0, observingCount: 0, bestLevel: 'none', latestAssessment: null, history: [] },
      courage: { dimensionKey: 'courage', name: '勇气', english: 'COURAGE', themeColor: '#EF4444', earnedCount: 0, outstandingCount: 0, standardCount: 0, observingCount: 0, bestLevel: 'none', latestAssessment: null, history: [] },
      creativity: { dimensionKey: 'creativity', name: '创造', english: 'CREATIVITY', themeColor: '#8B5CF6', earnedCount: 0, outstandingCount: 0, standardCount: 0, observingCount: 0, bestLevel: 'none', latestAssessment: null, history: [] },
      cooperation: { dimensionKey: 'cooperation', name: '合作', english: 'COOPERATION', themeColor: '#10B981', earnedCount: 0, outstandingCount: 0, standardCount: 0, observingCount: 0, bestLevel: 'none', latestAssessment: null, history: [] }
    };

    playerAssessments.forEach(ass => {
      (['confidence', 'resilience', 'courage', 'creativity', 'cooperation'] as CharacterDimensionKey[]).forEach(k => {
        const dim = ass.dimensions?.[k];
        if (!dim) return;

        const { badgeLevel, totalScore, checkpoint1, checkpoint2, coachNote } = dim;

        // 记录历史
        if (totalScore !== null || badgeLevel !== 'none') {
          stats[k].history.push({
            assessmentId: ass.id,
            matchTitle: ass.matchTitle,
            matchDate: ass.matchDate,
            matchType: ass.matchType,
            opponentOrTeams: ass.opponentOrTeams,
            evaluatorName: ass.evaluatorName,
            totalScore,
            badgeLevel,
            checkpoint1,
            checkpoint2,
            coachNote
          });
        }

        // 记录最新评估
        if (!stats[k].latestAssessment && (totalScore !== null || badgeLevel !== 'none')) {
          stats[k].latestAssessment = {
            assessment: ass,
            totalScore,
            badgeLevel,
            checkpoint1,
            checkpoint2,
            coachNote
          };
        }

        // 统计次数
        if (badgeLevel === 'outstanding') {
          stats[k].outstandingCount++;
          stats[k].earnedCount++;
          if (stats[k].bestLevel !== 'outstanding') {
            stats[k].bestLevel = 'outstanding';
          }
        } else if (badgeLevel === 'standard') {
          stats[k].standardCount++;
          stats[k].earnedCount++;
          if (stats[k].bestLevel === 'none' || stats[k].bestLevel === 'observing') {
            stats[k].bestLevel = 'standard';
          }
        } else if (badgeLevel === 'observing') {
          stats[k].observingCount++;
          if (stats[k].bestLevel === 'none') {
            stats[k].bestLevel = 'observing';
          }
        }
      });
    });

    return stats;
  }, [playerAssessments]);

  // 全局概览数据
  const overallStats = useMemo(() => {
    let totalMedals = 0;
    let outstandingCount = 0;
    let standardCount = 0;
    let litCount = 0;

    Object.values(dimensionStats).forEach(s => {
      totalMedals += s.earnedCount;
      outstandingCount += s.outstandingCount;
      standardCount += s.standardCount;
      if (s.earnedCount > 0) {
        litCount++;
      }
    });

    return {
      totalMedals,
      outstandingCount,
      standardCount,
      litCount,
      assessedMatchesCount: playerAssessments.length
    };
  }, [dimensionStats, playerAssessments]);

  // 导出个人品质勋章档案与评定明细 Excel
  const handleExportPersonalMedalsExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: 球员品质勋章档案概览
    const profileSummaryRows = [
      {
        '球员姓名': player.name,
        '球衣号码': player.number ? `#${player.number}` : '',
        '场上位置': player.position || '',
        '已点亮品质数量': `${overallStats.litCount} / 5`,
        '累计获授勋章总数': overallStats.totalMedals,
        '👑 卓越勋章数 (4分)': overallStats.outstandingCount,
        '🎖️ 达标品质勋章数 (3分)': overallStats.standardCount,
        '参评比赛总场次': playerAssessments.length,
        '自信最高荣誉': dimensionStats.confidence.bestLevel === 'outstanding' ? '👑 卓越勋章' : (dimensionStats.confidence.bestLevel === 'standard' ? '🎖️ 达标勋章' : (dimensionStats.confidence.bestLevel === 'observing' ? '重点观察' : '未点亮')),
        '自信获勋次数': dimensionStats.confidence.earnedCount,
        '坚韧最高荣誉': dimensionStats.resilience.bestLevel === 'outstanding' ? '👑 卓越勋章' : (dimensionStats.resilience.bestLevel === 'standard' ? '🎖️ 达标勋章' : (dimensionStats.resilience.bestLevel === 'observing' ? '重点观察' : '未点亮')),
        '坚韧获勋次数': dimensionStats.resilience.earnedCount,
        '勇气最高荣誉': dimensionStats.courage.bestLevel === 'outstanding' ? '👑 卓越勋章' : (dimensionStats.courage.bestLevel === 'standard' ? '🎖️ 达标勋章' : (dimensionStats.courage.bestLevel === 'observing' ? '重点观察' : '未点亮')),
        '勇气获勋次数': dimensionStats.courage.earnedCount,
        '创造最高荣誉': dimensionStats.creativity.bestLevel === 'outstanding' ? '👑 卓越勋章' : (dimensionStats.creativity.bestLevel === 'standard' ? '🎖️ 达标勋章' : (dimensionStats.creativity.bestLevel === 'observing' ? '重点观察' : '未点亮')),
        '创造获勋次数': dimensionStats.creativity.earnedCount,
        '合作最高荣誉': dimensionStats.cooperation.bestLevel === 'outstanding' ? '👑 卓越勋章' : (dimensionStats.cooperation.bestLevel === 'standard' ? '🎖️ 达标勋章' : (dimensionStats.cooperation.bestLevel === 'observing' ? '重点观察' : '未点亮')),
        '合作获勋次数': dimensionStats.cooperation.earnedCount,
        '档案导出时间': new Date().toLocaleString()
      }
    ];
    const wsProfile = XLSX.utils.json_to_sheet(profileSummaryRows);
    XLSX.utils.book_append_sheet(wb, wsProfile, '球员品质勋章档案');

    // Sheet 2: 比赛实战评定历程
    const historyRows = playerAssessments.map((ass, idx) => {
      const getDimInfo = (k: CharacterDimensionKey) => {
        const d = ass.dimensions?.[k];
        if (!d || d.totalScore === null) return { score: '—', badge: '未评定', cp1: '', cp2: '', note: '' };
        const badgeLabel = d.badgeLevel === 'outstanding' ? '👑 卓越勋章 (4分)' : (d.badgeLevel === 'standard' ? '🎖️ 达标勋章 (3分)' : (d.badgeLevel === 'observing' ? '🔍 重点观察' : '待达标 (0分)'));
        return {
          score: `${d.totalScore}分`,
          badge: badgeLabel,
          cp1: d.checkpoint1 !== null && d.checkpoint1 !== undefined ? `${d.checkpoint1}分` : '',
          cp2: d.checkpoint2 !== null && d.checkpoint2 !== undefined ? `${d.checkpoint2}分` : '',
          note: d.coachNote || ''
        };
      };

      const conf = getDimInfo('confidence');
      const resi = getDimInfo('resilience');
      const cour = getDimInfo('courage');
      const crea = getDimInfo('creativity');
      const coop = getDimInfo('cooperation');

      return {
        '序号': idx + 1,
        '比赛日期': ass.matchDate || ass.evaluationDate,
        '比赛名称': ass.matchTitle,
        '赛事类型': ass.matchType === 'intramural' ? '队内锦标赛' : '常规赛事',
        '对阵对手/组别': ass.opponentOrTeams || '',
        '本场总分(满分20)': ass.totalValidScore,
        '本场获勋总数': ass.standardBadgesCount + ass.outstandingBadgesCount,
        '卓越勋章数': ass.outstandingBadgesCount,
        '达标勋章数': ass.standardBadgesCount,
        '自信得分': conf.score,
        '自信勋章等级': conf.badge,
        '自信观察1': conf.cp1,
        '自信观察2': conf.cp2,
        '自信评语': conf.note,
        '坚韧得分': resi.score,
        '坚韧勋章等级': resi.badge,
        '坚韧观察1': resi.cp1,
        '坚韧观察2': resi.cp2,
        '坚韧评语': resi.note,
        '勇气得分': cour.score,
        '勇气勋章等级': cour.badge,
        '勇气观察1': cour.cp1,
        '勇气观察2': cour.cp2,
        '勇气评语': cour.note,
        '创造得分': crea.score,
        '创造勋章等级': crea.badge,
        '创造观察1': crea.cp1,
        '创造观察2': crea.cp2,
        '创造评语': crea.note,
        '合作得分': coop.score,
        '合作勋章等级': coop.badge,
        '合作观察1': coop.cp1,
        '合作观察2': coop.cp2,
        '合作评语': coop.note,
        '教练综合评语': ass.overallFeedback || ass.generalNotes || '',
        '评定教练': ass.evaluatorName || '青训教练组'
      };
    });

    if (historyRows.length > 0) {
      const wsHistory = XLSX.utils.json_to_sheet(historyRows);
      XLSX.utils.book_append_sheet(wb, wsHistory, '比赛实战评定历程');
    }

    const todayStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `品质勋章档案_${player.name}_${todayStr}.xlsx`);
  };

  const selectedDimStat = selectedDimensionKey ? dimensionStats[selectedDimensionKey] : null;
  const selectedDimConfig = selectedDimensionKey ? CHARACTER_DIMENSIONS.find(d => d.key === selectedDimensionKey) : null;

  return (
    <div className={`bg-white border-2 border-gray-100 rounded-2xl p-5 shadow-sm space-y-4 ${className}`}>
      {/* 头部标题与统计数据 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-bvb-yellow/20 border border-bvb-yellow/40 flex items-center justify-center text-bvb-black">
            <Trophy className="w-4 h-4 text-bvb-black" />
          </div>
          <div>
            <h4 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
              球员核心品质勋章
              <span className="text-[10px] bg-bvb-black text-bvb-yellow px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                WSZG Character
              </span>
            </h4>
            <p className="text-[11px] text-gray-400 font-medium">
              基于比赛实战行为观察评定，点亮并记录球员成长勋章
            </p>
          </div>
        </div>

        {/* 概览徽章汇总 */}
        <div className="flex items-center flex-wrap gap-1.5 text-xs">
          <span className={`px-2.5 py-1 rounded-lg font-black flex items-center gap-1 border ${
            overallStats.litCount > 0
              ? 'bg-amber-50 text-amber-800 border-amber-200 shadow-sm'
              : 'bg-gray-50 text-gray-500 border-gray-200'
          }`}>
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            已点亮 <strong className="text-bvb-black mx-0.5">{overallStats.litCount}</strong>/5 品质
          </span>

          <span className="px-2.5 py-1 rounded-lg font-black bg-yellow-50 text-yellow-900 border border-yellow-200 flex items-center gap-1 shadow-sm">
            <Award className="w-3.5 h-3.5 text-yellow-600" />
            获授 <strong className="text-bvb-black mx-0.5">{overallStats.totalMedals}</strong> 枚勋章
          </span>

          {overallStats.outstandingCount > 0 && (
            <span className="px-2.5 py-1 rounded-lg font-black bg-gradient-to-r from-amber-400 to-yellow-400 text-bvb-black border border-amber-300 flex items-center gap-1 shadow-sm">
              <Crown className="w-3.5 h-3.5 text-black fill-current" />
              {overallStats.outstandingCount} 卓越
            </span>
          )}

          {playerAssessments.length > 0 && (
            <>
              <button
                onClick={handleExportPersonalMedalsExcel}
                title="导出该球员品质勋章档案与评定历程至Excel"
                className="text-xs text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors font-bold flex items-center gap-1 shadow-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>导出Excel</span>
              </button>
              <button
                onClick={() => setShowHistoryModal(true)}
                className="text-xs text-gray-600 hover:text-bvb-black bg-gray-50 hover:bg-gray-100 px-2 py-1 rounded-lg border border-gray-200 transition-colors font-bold flex items-center gap-0.5"
              >
                评定历程 ({playerAssessments.length})
                <ChevronRight className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* 5大品质勋章展示区 (严格按用户图2图样小比例展示) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
        {(['confidence', 'resilience', 'courage', 'creativity', 'cooperation'] as CharacterDimensionKey[]).map(key => {
          const stat = dimensionStats[key];
          const isAwarded = stat.earnedCount > 0;
          const isOutstanding = stat.outstandingCount > 0;
          const isObserving = stat.bestLevel === 'observing';
          const dimDef = CHARACTER_DIMENSIONS.find(d => d.key === key);

          return (
            <div
              key={key}
              onClick={() => setSelectedDimensionKey(key)}
              className={`group relative flex flex-col items-center p-3 rounded-2xl border-2 transition-all duration-200 cursor-pointer text-center ${
                isOutstanding
                  ? 'bg-gradient-to-b from-amber-500/10 via-yellow-500/5 to-white border-amber-400/80 shadow-md shadow-yellow-500/10 hover:border-amber-400 hover:-translate-y-1'
                  : isAwarded
                  ? 'bg-gradient-to-b from-yellow-500/10 to-white border-yellow-300 shadow-sm hover:border-yellow-400 hover:-translate-y-1'
                  : isObserving
                  ? 'bg-sky-50/40 border-sky-200 hover:border-sky-300 hover:-translate-y-0.5'
                  : 'bg-gray-50/60 border-gray-200/70 hover:border-gray-300 opacity-75 hover:opacity-100'
              }`}
            >
              {/* 勋章图形 (标准小比例样式) */}
              <div className="py-1">
                <CharacterMedalBadge
                  dimension={key}
                  level={stat.bestLevel}
                  earnedCount={stat.earnedCount}
                  outstandingCount={stat.outstandingCount}
                  standardCount={stat.standardCount}
                  size="sm"
                  showLabel={false}
                  showCountBadge={true}
                />
              </div>

              {/* 品质名称与英文 */}
              <div className="mt-2 flex flex-col items-center">
                <span className={`text-sm font-black tracking-tight ${
                  isOutstanding ? 'text-amber-700' : isAwarded ? 'text-gray-900' : isObserving ? 'text-sky-700' : 'text-gray-500'
                }`}>
                  {stat.name}
                </span>
                <span className="text-[8px] text-gray-400 font-mono tracking-tighter uppercase font-bold">
                  {stat.english}
                </span>
              </div>

              {/* 勋章状态胶囊 */}
              <div className="mt-2 w-full">
                {isOutstanding ? (
                  <div className="w-full py-0.5 px-1 bg-gradient-to-r from-amber-400 to-yellow-400 text-bvb-black font-black text-[10px] rounded-lg shadow-sm border border-amber-300 flex items-center justify-center gap-1">
                    <Crown className="w-2.5 h-2.5 fill-current" />
                    卓越勋章 {stat.earnedCount > 1 && `(${stat.earnedCount})`}
                  </div>
                ) : isAwarded ? (
                  <div className="w-full py-0.5 px-1 bg-amber-50 text-amber-800 font-black text-[10px] rounded-lg border border-amber-300 flex items-center justify-center gap-1">
                    <Award className="w-2.5 h-2.5 text-amber-600" />
                    品质勋章 {stat.earnedCount > 1 && `(${stat.earnedCount})`}
                  </div>
                ) : isObserving ? (
                  <div className="w-full py-0.5 px-1 bg-sky-50 text-sky-700 font-bold text-[10px] rounded-lg border border-sky-200 flex items-center justify-center gap-1">
                    继续观察
                  </div>
                ) : (
                  <div className="w-full py-0.5 px-1 bg-gray-100 text-gray-400 font-bold text-[10px] rounded-lg border border-gray-200 flex items-center justify-center gap-1">
                    待点亮
                  </div>
                )}
              </div>

              {/* 核心内涵提示 */}
              <p className="text-[9px] text-gray-400 mt-1 line-clamp-1 group-hover:text-gray-600 transition-colors">
                {dimDef?.coreMeaning}
              </p>
            </div>
          );
        })}
      </div>

      {/* 底部快速提示 */}
      {playerAssessments.length === 0 ? (
        <div className="bg-amber-50/60 border border-amber-200/70 rounded-xl p-3 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>该球员暂无比赛品质评定记录。在<strong>「比赛管理」</strong>或<strong>「队内锦标赛」</strong>完成比赛后，教练可对参战球员进行 5 项品质评定。</span>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl p-2.5 flex items-center justify-between text-xs text-gray-500 border border-gray-100">
          <div className="flex items-center gap-2">
            <UserCheck className="w-3.5 h-3.5 text-bvb-yellow" />
            <span>已累计完成 <strong>{playerAssessments.length}</strong> 场赛事实战品质评定，点击上方任意勋章可查看评定细则与教练评语。</span>
          </div>
          <button
            onClick={() => setShowHistoryModal(true)}
            className="text-xs text-bvb-black font-black hover:underline shrink-0 ml-2"
          >
            查看全部记录 →
          </button>
        </div>
      )}

      {/* 单个品质勋章详情弹窗 */}
      {selectedDimensionKey && selectedDimStat && selectedDimConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* 弹窗头部 */}
            <div className="bg-bvb-black text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-bvb-yellow text-bvb-black flex items-center justify-center font-black">
                  {selectedDimensionKey === 'confidence' && <Shield className="w-5 h-5" />}
                  {selectedDimensionKey === 'resilience' && <ShieldCheck className="w-5 h-5" />}
                  {selectedDimensionKey === 'courage' && <Flame className="w-5 h-5" />}
                  {selectedDimensionKey === 'creativity' && <Lightbulb className="w-5 h-5" />}
                  {selectedDimensionKey === 'cooperation' && <Users className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    {selectedDimStat.name}品质勋章
                    <span className="text-xs text-bvb-yellow font-mono font-bold">
                      {selectedDimStat.english}
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400">{selectedDimConfig.coreMeaning}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDimensionKey(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {/* 大比例勋章展示与当前荣誉 */}
              <div className="flex items-center gap-5 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-gray-50 border border-amber-200">
                <div className="shrink-0">
                  <CharacterMedalBadge
                    dimension={selectedDimensionKey}
                    level={selectedDimStat.bestLevel}
                    earnedCount={selectedDimStat.earnedCount}
                    outstandingCount={selectedDimStat.outstandingCount}
                    standardCount={selectedDimStat.standardCount}
                    size="md"
                    showLabel={false}
                    showCountBadge={true}
                  />
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500">当前荣誉等级:</span>
                    {selectedDimStat.bestLevel === 'outstanding' ? (
                      <span className="bg-gradient-to-r from-amber-400 to-yellow-400 text-bvb-black font-black text-xs px-2.5 py-0.5 rounded-full border border-amber-300 shadow-sm flex items-center gap-1">
                        <Crown className="w-3 h-3 fill-current" /> 卓越勋章 (4分满分)
                      </span>
                    ) : selectedDimStat.bestLevel === 'standard' ? (
                      <span className="bg-amber-100 text-amber-800 font-black text-xs px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                        <Award className="w-3 h-3 text-amber-600" /> 品质勋章 (3分)
                      </span>
                    ) : selectedDimStat.bestLevel === 'observing' ? (
                      <span className="bg-sky-100 text-sky-700 font-bold text-xs px-2.5 py-0.5 rounded-full border border-sky-200">
                        继续观察 (2分)
                      </span>
                    ) : (
                      <span className="bg-gray-100 text-gray-500 font-bold text-xs px-2.5 py-0.5 rounded-full border border-gray-200">
                        暂未达标/待评定
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 flex items-center gap-3">
                    <span>累计获授: <strong className="text-bvb-black font-black text-sm">{selectedDimStat.earnedCount}</strong> 次</span>
                    {selectedDimStat.outstandingCount > 0 && (
                      <span className="text-amber-600 font-bold">其中卓越 {selectedDimStat.outstandingCount} 次</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {DIMENSION_MEDAL_CONFIG[selectedDimensionKey].description}
                  </p>
                </div>
              </div>

              {/* 观察行为观察点标准 */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-bvb-yellow" />
                  实战行为观察点判定标准
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-start gap-2.5">
                    <span className="bg-bvb-black text-bvb-yellow text-[10px] font-mono font-black px-1.5 py-0.5 rounded shrink-0">
                      观察点 1
                    </span>
                    <span className="text-gray-800 leading-snug">{selectedDimConfig.checkpoint1}</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-start gap-2.5">
                    <span className="bg-bvb-black text-bvb-yellow text-[10px] font-mono font-black px-1.5 py-0.5 rounded shrink-0">
                      观察点 2
                    </span>
                    <span className="text-gray-800 leading-snug">{selectedDimConfig.checkpoint2}</span>
                  </div>
                </div>
              </div>

              {/* 历史评定获授记录 */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-bvb-yellow" />
                  实战获授记录 ({selectedDimStat.history.length})
                </h4>

                {selectedDimStat.history.length === 0 ? (
                  <div className="text-center py-6 text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    暂无本维度的比赛获授记录
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedDimStat.history.map((h, idx) => {
                      const badgeConfig = CHARACTER_BADGE_LEVELS[h.badgeLevel];
                      return (
                        <div key={idx} className="p-3 rounded-xl border border-gray-100 bg-gray-50/70 hover:bg-gray-50 transition-colors text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                h.matchType === 'intramural' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {h.matchType === 'intramural' ? '队内赛' : '常规赛'}
                              </span>
                              <span className="font-bold text-gray-800">{h.matchTitle}</span>
                              <span className="text-[10px] text-gray-400 font-mono">{h.matchDate}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-xs text-gray-700">
                                {h.totalScore !== null ? `${h.totalScore}分` : '—'}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badgeConfig.pillClass}`}>
                                {badgeConfig.title}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-[10px] text-gray-500">
                            <span>观察点1: <strong className="text-gray-700">{h.checkpoint1 !== null ? `${h.checkpoint1}分` : '免评'}</strong></span>
                            <span>观察点2: <strong className="text-gray-700">{h.checkpoint2 !== null ? `${h.checkpoint2}分` : '免评'}</strong></span>
                            {h.evaluatorName && <span>评定教练: {h.evaluatorName}</span>}
                          </div>

                          {h.coachNote && (
                            <p className="text-[11px] text-gray-600 bg-white p-2 rounded-lg border border-gray-200 mt-1 italic">
                              “{h.coachNote}”
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 弹窗底部 */}
            <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedDimensionKey(null)}
                className="px-4 py-1.5 bg-bvb-black text-bvb-yellow font-black text-xs rounded-xl hover:bg-gray-800 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 完整比赛评定历程 Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-bvb-black text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-bvb-yellow" />
                <h3 className="font-black text-white text-base">
                  {player.name} · 比赛实战品质评定全历程 ({playerAssessments.length}场)
                </h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {playerAssessments.length === 0 ? (
                <div className="text-center py-12 text-sm text-gray-400">暂无评定记录</div>
              ) : (
                playerAssessments.map(ass => (
                  <div key={ass.id} className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          ass.matchType === 'intramural' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}>
                          {ass.matchType === 'intramural' ? '🏆 队内锦标赛' : '⚽ 常规赛事'}
                        </span>
                        <h4 className="font-black text-gray-900 text-sm">{ass.matchTitle}</h4>
                        {ass.opponentOrTeams && (
                          <span className="text-xs text-gray-500">({ass.opponentOrTeams})</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 font-mono">
                        {ass.matchDate} · 教练: {ass.evaluatorName || '青训教练组'}
                      </div>
                    </div>

                    {/* 5项维度评分展示 */}
                    <div className="grid grid-cols-5 gap-2 text-center">
                      {(['confidence', 'resilience', 'courage', 'creativity', 'cooperation'] as CharacterDimensionKey[]).map(k => {
                        const dim = ass.dimensions?.[k];
                        const dimDef = CHARACTER_DIMENSIONS.find(d => d.key === k);
                        const badgeL = dim?.badgeLevel || 'none';
                        const badgeInfo = CHARACTER_BADGE_LEVELS[badgeL];

                        return (
                          <div key={k} className={`p-2 rounded-xl border flex flex-col items-center justify-center ${
                            badgeL === 'outstanding'
                              ? 'bg-amber-100/70 border-amber-300'
                              : badgeL === 'standard'
                              ? 'bg-yellow-50 border-yellow-200'
                              : badgeL === 'observing'
                              ? 'bg-sky-50 border-sky-200'
                              : 'bg-white border-gray-200'
                          }`}>
                            <CharacterMedalBadge
                              dimension={k}
                              level={badgeL}
                              size="xs"
                              showLabel={false}
                              showCountBadge={false}
                            />
                            <span className="text-[11px] font-black text-gray-800 mt-1">{dimDef?.name}</span>
                            <span className="text-[10px] font-bold text-gray-600 font-mono">
                              {dim?.totalScore !== null && dim?.totalScore !== undefined ? `${dim.totalScore}分` : '—'}
                            </span>
                            <span className={`text-[8px] font-bold px-1 rounded mt-0.5 ${badgeInfo.pillClass}`}>
                              {badgeL === 'outstanding' ? '👑卓越' : badgeL === 'standard' ? '🎖️品质' : badgeL === 'observing' ? '观察' : '—'}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* 教练综合备注 */}
                    {ass.generalNotes && (
                      <p className="text-xs text-gray-600 bg-white p-2.5 rounded-xl border border-gray-200 italic">
                        教练综合评语: “{ass.generalNotes}”
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
              <button
                onClick={handleExportPersonalMedalsExcel}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>导出此球员评定档案(Excel)</span>
              </button>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-1.5 bg-bvb-black text-bvb-yellow font-black text-xs rounded-xl hover:bg-gray-800 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerCharacterMedalsCard;
