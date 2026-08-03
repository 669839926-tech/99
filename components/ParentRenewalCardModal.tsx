import React, { useState } from 'react';
import { Player, Team, TrainingSession } from '../types';
import { 
  X, Download, Copy, Check, Sparkles, AlertTriangle, CheckCircle2, 
  Calendar, Award, Target, Brain, Clock, ShieldCheck, Heart, 
  ChevronRight, RefreshCw
} from 'lucide-react';
import { exportToImage } from '../services/pdfService';

interface ParentRenewalCardModalProps {
  player: Player;
  teams: Team[];
  trainings: TrainingSession[];
  appLogo?: string;
  onClose: () => void;
  onNavigateToAttendance?: (player: Player) => void;
}

const calculateAge = (birthDateStr?: string): number => {
  if (!birthDateStr) return 0;
  const today = new Date();
  const parts = birthDateStr.split('-').map(Number);
  if (parts.length === 3) {
    const [y, m, d] = parts;
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      let age = today.getFullYear() - y;
      const mDiff = today.getMonth() + 1 - m;
      if (mDiff < 0 || (mDiff === 0 && today.getDate() < d)) {
        age--;
      }
      return age >= 0 ? age : 0;
    }
  }
  return 0;
};

const calculateTenure = (dateStr?: string) => {
  if (!dateStr) return '未登记';
  const start = new Date(dateStr);
  const now = new Date();
  if (isNaN(start.getTime())) return '未登记';
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (months < 0) { years--; months += 12; }
  if (years < 0) return '刚刚入队';
  if (years === 0 && months === 0) return '不满1个月';
  let result = '';
  if (years > 0) result += `${years}年`;
  if (months > 0) result += `${months}个月`;
  return result;
};

const formatBirthDateMonth = (dateStr?: string) => {
  if (!dateStr) return '未录入';
  const parts = dateStr.split('-');
  if (parts.length >= 2) {
    return `${parts[0]}年${parts[1]}月`;
  }
  return dateStr;
};

const parseLocalDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  const cleanStr = dateStr.trim().replace(/\//g, '-');
  const parts = cleanStr.split('-').map(Number);
  const y = parts[0] || new Date().getFullYear();
  const m = parts.length >= 2 ? parts[1] - 1 : 0;
  const d = parts.length >= 3 ? parts[2] : 1;
  return new Date(y, m, d);
};

const isBeforeJoinDate = (sessionDateStr: string, joinDateStr?: string) => {
  if (!joinDateStr) return false;
  const sDate = parseLocalDate(sessionDateStr);
  const jDate = parseLocalDate(joinDateStr);
  sDate.setHours(0, 0, 0, 0);
  jDate.setHours(0, 0, 0, 0);
  return sDate < jDate;
};

export const ParentRenewalCardModal: React.FC<ParentRenewalCardModalProps> = ({
  player,
  teams,
  trainings,
  appLogo,
  onClose,
  onNavigateToAttendance
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const team = teams.find(t => t.id === player.teamId);

  // 1. 上次充值续费记录 (主充值 > 8节)
  const rechargeHistory = player.rechargeHistory || [];
  const majorRecharges = rechargeHistory
    .filter(r => r.amount > 8)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const primaryRecharge = majorRecharges.length > 0 ? majorRecharges[0] : null;

  // 上次主充值日期与课时数
  const primaryDate = primaryRecharge 
    ? primaryRecharge.date 
    : (rechargeHistory.length > 0 
        ? [...rechargeHistory].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0].date 
        : (player.joinDate || '2025-01-01'));

  const primaryAmount = primaryRecharge ? primaryRecharge.amount : (player.credits > 0 ? player.credits : 0);

  // 2. 期间活动/赠送课时 (在上次主充值日期之后，且不属于主充值的记录，或 amount <= 8)
  const bonusRecharges = rechargeHistory.filter(r => {
    if (primaryRecharge && r.id === primaryRecharge.id) return false;
    return new Date(r.date).getTime() >= new Date(primaryDate).getTime();
  });
  const bonusAmount = bonusRecharges.reduce((sum, r) => sum + r.amount, 0);

  const totalRecharged = primaryAmount + bonusAmount;

  // 3. 统计上次充值日期 (primaryDate) 至今天的参训情况与课时变动
  const periodTrainings = trainings.filter(s => {
    if (!s.date || s.date < primaryDate) return false;
    if (isBeforeJoinDate(s.date, player.joinDate)) return false;
    const hasRecord = s.attendance?.some(r => r.playerId === player.id);
    return s.teamId === player.teamId || hasRecord;
  });

  let attendedCount = 0;
  let consumedCredits = 0;
  let leaveCount = 0;
  let injuryCount = 0;
  let absentCount = 0;

  periodTrainings.forEach(s => {
    const att = s.attendance?.find(a => a.playerId === player.id);
    const status = att ? att.status : 'Absent';
    if (status === 'Present') {
      attendedCount++;
      consumedCredits += (att?.creditCost ?? 1);
    } else if (status === 'Leave') {
      leaveCount++;
    } else if (status === 'Injury') {
      injuryCount++;
    } else {
      absentCount++;
    }
  });

  const totalPeriodSessions = periodTrainings.length;
  const attendanceRate = totalPeriodSessions > 0 
    ? Math.round((attendedCount / totalPeriodSessions) * 100) 
    : 100;

  // 当前剩余课时
  const currentCredits = player.credits;

  // 4. 期间教练重点关注与记录列表
  const focusedTrainings = periodTrainings.filter(t => 
    t.focusedPlayerIds && t.focusedPlayerIds.includes(player.id)
  ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleDownloadImage = async () => {
    setIsExporting(true);
    try {
      await exportToImage(`parent-renewal-card-${player.id}`, `${player.name}_家长续费通知卡`);
    } catch (err) {
      console.error('Export card image failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyText = () => {
    const text = `【顽石之光足球俱乐部 • 续费提醒与阶段学员成长报告】
------------------------------------------
学员姓名：${player.name}
所属梯队：${team?.name || '青训梯队'}
出生年月：${formatBirthDateMonth(player.birthDate)} (${calculateAge(player.birthDate)}岁)
俱乐部球龄：${calculateTenure(player.joinDate)}

【课时与续费核算】
• 上次续费日期：${primaryDate}
• 上次续费节数：${primaryAmount} 节 ${bonusAmount > 0 ? `(赠送奖励: +${bonusAmount}节)` : ''}
• 本阶段课时消耗：${consumedCredits} 节 (${attendedCount} 场训练)
• 当前剩余课时：${currentCredits} 节 (预警中)

【阶段参训表现 (${primaryDate} ~ 今)】
• 出勤概况：实到 ${attendedCount} 场 (共消耗 ${consumedCredits} 节) / 请假 ${leaveCount} 场 / 伤停 ${injuryCount} 场 / 缺席 ${absentCount} 场 / 参训率 ${attendanceRate}%
• 重点关注次数：${focusedTrainings.length} 次

为了保障学员训练的连贯性与团队竞技节奏，请您于近日协助为孩子办理续费，感谢对顽石之光青训的大力支持！`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-3 md:p-6 overflow-y-auto">
      <div className="bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] border border-gray-800 animate-in zoom-in-95 duration-200">
        
        {/* Modal Header Toolbar */}
        <div className="bg-gray-950 p-4 px-6 flex justify-between items-center text-white shrink-0 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-bvb-yellow/10 rounded-xl border border-bvb-yellow/20">
              <Sparkles className="w-5 h-5 text-bvb-yellow" />
            </div>
            <div>
              <h3 className="font-black text-base md:text-lg flex items-center text-white italic tracking-tight uppercase">
                家长续费卡片生成
              </h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Parent Renewal & Progress Card</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-800 text-gray-400 hover:text-white rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Preview Container */}
        <div className="p-4 md:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-4 bg-gray-900">
          
          {/* Card Export Canvas (The actual styled image container) */}
          <div 
            id={`parent-renewal-card-${player.id}`}
            className="bg-white text-gray-900 rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-2xl space-y-6 border border-gray-100 relative overflow-hidden font-sans"
          >
            {/* Top Brand Banner */}
            <div className="flex justify-between items-start border-b-2 border-bvb-yellow pb-4 relative z-10">
              <div className="flex items-center gap-3">
                {appLogo ? (
                  <img src={appLogo} alt="Logo" className="w-12 h-12 object-contain" />
                ) : (
                  <div className="w-12 h-12 bg-bvb-black rounded-2xl flex items-center justify-center text-bvb-yellow font-black text-xl shadow-md italic">
                    BVB
                  </div>
                )}
                <div>
                  <h2 className="font-black text-lg md:text-xl text-gray-900 tracking-tight flex items-center gap-2">
                    顽石之光足球俱乐部
                  </h2>
                  <p className="text-[10px] font-black text-amber-600 tracking-widest uppercase italic">
                    PARENT RENEWAL & PLAYER PROGRESS REPORT
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block bg-bvb-yellow text-bvb-black text-[10px] md:text-xs font-black px-3 py-1 rounded-full uppercase italic shadow-xs">
                  课时续费通知卡
                </span>
                <p className="text-[9px] text-gray-400 font-mono mt-1">报告生成日: {new Date().toISOString().split('T')[0]}</p>
              </div>
            </div>

            {/* Player Basic Info Header */}
            <div className="bg-gradient-to-r from-stone-900 via-gray-900 to-stone-900 text-white rounded-2xl p-4 md:p-5 shadow-lg relative overflow-hidden flex flex-wrap items-center justify-between gap-4">
              <div className="absolute right-0 top-0 bottom-0 w-32 bg-bvb-yellow/10 skew-x-12 transform translate-x-10 pointer-events-none"></div>
              
              <div className="flex items-center gap-4 relative z-10">
                <img 
                  src={player.image} 
                  alt={player.name} 
                  className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-4 border-bvb-yellow shadow-md bg-stone-800 shrink-0" 
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-xl md:text-2xl text-white tracking-tight">{player.name}</h3>
                    <span className="text-[10px] font-mono bg-bvb-yellow/20 text-bvb-yellow border border-bvb-yellow/30 px-2 py-0.5 rounded-full font-bold">
                      #{player.number}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 font-bold mt-1 flex items-center gap-2">
                    <span>{team?.name || '青训梯队'}</span>
                    <span>•</span>
                    <span>{player.position}</span>
                  </p>
                </div>
              </div>

              {/* Grid Player Attributes */}
              <div className="grid grid-cols-3 gap-2 text-center bg-white/10 backdrop-blur-md rounded-xl p-2.5 border border-white/10 shrink-0 min-w-[240px] relative z-10">
                <div>
                  <p className="text-[9px] text-gray-300 font-bold uppercase">出生年月</p>
                  <p className="text-xs md:text-sm font-black text-white mt-0.5">{formatBirthDateMonth(player.birthDate)}</p>
                </div>
                <div className="border-x border-white/10">
                  <p className="text-[9px] text-gray-300 font-bold uppercase">当前年龄</p>
                  <p className="text-xs md:text-sm font-black text-bvb-yellow mt-0.5">{calculateAge(player.birthDate)} 岁</p>
                </div>
                <div>
                  <p className="text-[9px] text-gray-300 font-bold uppercase">俱乐部球龄</p>
                  <p className="text-xs md:text-sm font-black text-white mt-0.5">{calculateTenure(player.joinDate)}</p>
                </div>
              </div>
            </div>

            {/* Section 1: Recharge & Credit Consumption Accounting */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-bvb-yellow rounded-full"></div>
                  <h4 className="font-black text-sm md:text-base text-gray-900 uppercase italic tracking-tight">
                    一、课时充值与使用统计
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-gray-400">核算基准: &gt; 8节续费记录</span>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 flex flex-col justify-between">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-amber-500" /> 上次续费日期
                  </p>
                  <div className="mt-2">
                    <p className="text-sm md:text-base font-black text-gray-900 font-mono">{primaryDate}</p>
                    <p className="text-[9px] text-gray-500 font-bold mt-0.5">主充值: {primaryAmount} 节</p>
                  </div>
                </div>

                <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-3.5 flex flex-col justify-between">
                  <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider flex items-center gap-1">
                    <Award className="w-3 h-3 text-amber-600" /> 期间活动奖励
                  </p>
                  <div className="mt-2">
                    <p className="text-base md:text-xl font-black text-amber-800 tabular-nums">+{bonusAmount} <span className="text-xs font-bold">节</span></p>
                    <p className="text-[9px] text-amber-600 font-bold mt-0.5">总累计: {totalRecharged} 节</p>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 flex flex-col justify-between">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-green-600" /> 本阶段课时消耗
                  </p>
                  <div className="mt-2">
                    <p className="text-base md:text-xl font-black text-gray-900 tabular-nums">{consumedCredits} <span className="text-xs font-bold">节</span></p>
                    <p className="text-[9px] text-gray-500 font-bold mt-0.5">打卡参训 {attendedCount} 场</p>
                  </div>
                </div>

                <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-3.5 flex flex-col justify-between shadow-xs">
                  <p className="text-[10px] font-black text-rose-600 uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-500" /> 当前剩余课时
                  </p>
                  <div className="mt-2">
                    <p className="text-xl md:text-2xl font-black text-rose-600 tabular-nums">{currentCredits} <span className="text-xs font-bold">节</span></p>
                    <p className="text-[9px] text-rose-500 font-bold mt-0.5">需申请续费提醒</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Attendance Statistics in Period */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-bvb-yellow rounded-full"></div>
                  <h4 className="font-black text-sm md:text-base text-gray-900 uppercase italic tracking-tight">
                    二、本阶段参训考勤总结 ({primaryDate} ~ 今)
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-gray-400">总计训练: {totalPeriodSessions} 场</span>
              </div>

              <div className="grid grid-cols-5 gap-1.5 md:gap-2 text-center">
                <div className="bg-green-50/80 border border-green-200 rounded-xl p-2 md:p-2.5">
                  <p className="text-[10px] font-black text-green-700 uppercase">实到(消耗课时)</p>
                  <p className="text-xs md:text-base font-black text-green-800 mt-1">{attendedCount} 场 <span className="text-[10px] md:text-xs font-bold">({consumedCredits}节)</span></p>
                </div>
                <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-2 md:p-2.5">
                  <p className="text-[10px] font-black text-amber-700 uppercase">请假次数</p>
                  <p className="text-sm md:text-lg font-black text-amber-800 mt-1">{leaveCount}</p>
                </div>
                <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-2 md:p-2.5">
                  <p className="text-[10px] font-black text-rose-700 uppercase">伤停次数</p>
                  <p className="text-sm md:text-lg font-black text-rose-800 mt-1">{injuryCount}</p>
                </div>
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-2 md:p-2.5">
                  <p className="text-[10px] font-black text-gray-600 uppercase">缺席次数</p>
                  <p className="text-sm md:text-lg font-black text-gray-800 mt-1">{absentCount}</p>
                </div>
                <div className="bg-bvb-yellow/20 border border-bvb-yellow/40 rounded-xl p-2 md:p-2.5">
                  <p className="text-[10px] font-black text-bvb-black uppercase">本期参训率</p>
                  <p className="text-sm md:text-lg font-black text-bvb-black mt-1">{attendanceRate}%</p>
                </div>
              </div>
            </div>

            {/* Section 3: Coach Focus Feedback during Period */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-bvb-yellow rounded-full"></div>
                  <h4 className="font-black text-sm md:text-base text-gray-900 uppercase italic tracking-tight">
                    三、教练团队重点关注与成长记录 ({focusedTrainings.length} 次)
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-gray-400">Personalized Coaching Tracking</span>
              </div>

              {focusedTrainings.length > 0 ? (
                <div className="space-y-2.5">
                  {focusedTrainings.map((session) => {
                    const note = session.focusedPlayerNotes?.[player.id] || { technical: '', mental: '', resolved: false };
                    return (
                      <div key={session.id} className="bg-gray-50 border border-gray-200/80 rounded-2xl p-3.5 space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-gray-200/60 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-gray-800 text-xs">{session.title || session.focus || '教案训练'}</span>
                            <span className="text-[10px] font-mono text-gray-400 font-bold">({session.date})</span>
                          </div>
                          {note.resolved ? (
                            <span className="text-[10px] font-black text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-green-600" /> 改进完成
                            </span>
                          ) : (
                            <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" /> 持续跟进
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                          {note.technical && (
                            <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                              <div className="font-black text-amber-800 flex items-center gap-1 text-[10px] mb-1">
                                <Target className="w-3 h-3 text-amber-500" /> 技术执行点评:
                              </div>
                              <p className="text-gray-700 italic leading-relaxed">{note.technical}</p>
                            </div>
                          )}
                          {note.mental && (
                            <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                              <div className="font-black text-indigo-800 flex items-center gap-1 text-[10px] mb-1">
                                <Brain className="w-3 h-3 text-indigo-400" /> 心理与态度评估:
                              </div>
                              <p className="text-gray-700 italic leading-relaxed">{note.mental}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-4 text-center text-xs text-gray-400 font-bold">
                  🌟 该阶段学员训练状态稳定流畅，表现优异，未触发特别预警关注事项。
                </div>
              )}
            </div>

            {/* Footer Friendly Message */}
            <div className="bg-bvb-black text-white rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center gap-3 border-t-2 border-bvb-yellow">
              <div className="space-y-1 text-center md:text-left">
                <p className="text-xs font-black text-bvb-yellow uppercase tracking-tight flex items-center justify-center md:justify-start gap-1">
                  <Heart className="w-3.5 h-3.5 fill-bvb-yellow" /> 顽石之光青训提示
                </p>
                <p className="text-[11px] text-gray-300 font-medium leading-relaxed">
                  为了保证孩子绿茵梦想训练的连贯性与梯队竞技节奏，请您于近日协助为孩子办理课时续费。感谢您对我们教学团队的信任与支持！
                </p>
              </div>
              <div className="shrink-0 text-center md:text-right border-t md:border-t-0 md:border-l border-gray-800 pt-2 md:pt-0 md:pl-4">
                <p className="text-xs font-black text-white">顽石之光足球教练组</p>
                <p className="text-[9px] text-gray-400 uppercase tracking-wider font-mono">ROCK LIGHT FOOTBALL ACADEMY</p>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Action Bar */}
        <div className="bg-gray-950 p-4 px-6 border-t border-gray-800 flex flex-wrap justify-between items-center gap-3">
          <div className="text-xs text-gray-400 font-bold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            <span>支持高清图片生成或一键发送文字版</span>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToAttendance && (
              <button
                type="button"
                onClick={() => {
                  onNavigateToAttendance(player);
                  onClose();
                }}
                className="px-3.5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>考勤明细</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyText}
              className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-bvb-yellow" />}
              <span>{copied ? '已复制文案' : '复制微信通知'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isExporting}
              className="px-5 py-2.5 bg-bvb-yellow hover:bg-yellow-400 text-bvb-black font-black text-xs rounded-xl transition-all shadow-lg hover:shadow-yellow-500/20 cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{isExporting ? '生成中...' : '下载为卡片图片'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
