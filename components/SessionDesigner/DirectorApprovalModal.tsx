import React, { useState } from 'react';
import { DrillDesign, User } from '../../types';
import { CheckCircle2, XCircle, ShieldCheck, MessageSquare, Image as ImageIcon, User as UserIcon, Calendar, X } from 'lucide-react';
import { PitchSvgRenderer } from './PitchSvgRenderer';

interface DirectorApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: DrillDesign | null;
  currentUser?: User | null;
  onApprove: (item: DrillDesign, feedback?: string) => void;
  onReject: (item: DrillDesign, feedback: string) => void;
}

export const DirectorApprovalModal: React.FC<DirectorApprovalModalProps> = ({
  isOpen,
  onClose,
  item,
  currentUser,
  onApprove,
  onReject
}) => {
  const [feedback, setFeedback] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');

  if (!isOpen || !item) return null;

  const isDiagram = item.category === 'diagram' || item.contentType === 'diagram';
  const isDrill = item.category === 'drill_item' || item.contentType === 'drill';
  const isSession = item.category === 'session_plan' || item.contentType === 'session_plan';

  const handleConfirm = () => {
    if (actionType === 'reject' && !feedback.trim()) {
      alert('请输入退回修改的具体原因与指导建议，以便教练员进行完善。');
      return;
    }

    if (actionType === 'approve') {
      onApprove(item, feedback.trim() || undefined);
    } else {
      onReject(item, feedback.trim());
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col my-8 max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-between border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-bvb-yellow text-black flex items-center justify-center font-black shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">青训总监教案内容审批</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  待审批
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                审核教练员提交的教案内容，审核通过后将正式进入俱乐部公共内容库
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-5">
          {/* Item Meta Summary Card */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                  isSession ? 'bg-yellow-100 text-yellow-800' :
                  isDrill ? 'bg-blue-100 text-blue-800' :
                  isDiagram ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                }`}>
                  {isSession ? '教案' : isDrill ? '训练项' : isDiagram ? '示意图' : '专栏/文章'}
                </span>
                <h4 className="text-sm font-black text-gray-900">{item.title}</h4>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
                <span className="flex items-center gap-1">
                  <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                  <span>提交教练: <strong className="text-gray-800 font-bold">{item.authorName || '教练员'}</strong></span>
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>提交日期: {item.createdAt}</span>
                </span>
              </div>
            </div>

            {item.topic && (
              <span className="px-2.5 py-1 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 shadow-sm shrink-0">
                主题: {item.topic}
              </span>
            )}
          </div>

          {/* Author Submission Remarks */}
          {item.approvalFeedback && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 flex gap-2.5 text-blue-900 text-xs">
              <MessageSquare className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">教练员审核备注：</span>
                <span className="text-blue-800 ml-1">{item.approvalFeedback}</span>
              </div>
            </div>
          )}

          {/* Visual Preview */}
          {(item.previewImage || item.diagramImage || (item.elements && item.elements.length > 0)) && (
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-700 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-gray-500" />
                <span>战术图预览</span>
              </label>
              <div className="w-full h-56 bg-gray-950 rounded-2xl overflow-hidden flex items-center justify-center relative shadow-inner border border-gray-800">
                {item.previewImage || item.diagramImage ? (
                  <img
                    src={item.previewImage || item.diagramImage}
                    alt={item.title}
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <PitchSvgRenderer
                    pitchType={item.pitchType || 'Midfield'}
                    pitchTheme={item.pitchTheme || 'Grass'}
                    className="w-full h-full"
                  />
                )}
              </div>
            </div>
          )}

          {/* Structured Drill Item details */}
          {isDrill && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                <span className="text-gray-500 font-bold block mb-1">训练环节</span>
                <span className="font-black text-gray-900 capitalize">{item.drillStage || '技能强化'}</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                <span className="text-gray-500 font-bold block mb-1">建议时长 / 人数</span>
                <span className="font-black text-gray-900">{item.durationMinutes || 15}分钟 / {item.playerCount || 8}人</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                <span className="text-gray-500 font-bold block mb-1">适用组别</span>
                <span className="font-black text-gray-900">{item.ageGroups?.map(a => `U${a}`).join(', ') || '通用'}</span>
              </div>
            </div>
          )}

          {/* Description / Content */}
          {item.description && (
            <div className="space-y-1">
              <label className="text-xs font-black text-gray-700">内容简介 / 设计思路</label>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                {item.description}
              </div>
            </div>
          )}

          {/* Organization & Coaching Points */}
          {item.organization && (
            <div className="space-y-1">
              <label className="text-xs font-black text-gray-700">组织方法与规则</label>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700 leading-relaxed whitespace-pre-wrap font-mono">
                {item.organization}
              </div>
            </div>
          )}

          {item.coachingPoints && (
            <div className="space-y-1">
              <label className="text-xs font-black text-gray-700">指导要点与关键纠错</label>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700 leading-relaxed whitespace-pre-wrap font-mono">
                {item.coachingPoints}
              </div>
            </div>
          )}

          {/* Article / Other Content */}
          {item.articleContent && (
            <div className="space-y-1">
              <label className="text-xs font-black text-gray-700">专栏全文内容</label>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-800 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                {item.articleContent}
              </div>
            </div>
          )}

          {/* Approval Action Form */}
          <div className="border-t border-gray-200 pt-4 space-y-3">
            <label className="block text-xs font-black text-gray-900">总监审批决策与批注</label>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setActionType('approve')}
                className={`p-3 rounded-2xl border-2 font-black text-xs flex items-center justify-center gap-2 transition-all ${
                  actionType === 'approve'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm ring-1 ring-emerald-600'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>通过审核·收录入内容库</span>
              </button>

              <button
                type="button"
                onClick={() => setActionType('reject')}
                className={`p-3 rounded-2xl border-2 font-black text-xs flex items-center justify-center gap-2 transition-all ${
                  actionType === 'reject'
                    ? 'border-red-600 bg-red-50 text-red-800 shadow-sm ring-1 ring-red-600'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <XCircle className="w-4 h-4 text-red-600" />
                <span>退回修改·填写指导意见</span>
              </button>
            </div>

            <div>
              <textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder={actionType === 'approve' ? "可选：输入对该教案内容的评价或推荐语（将展示在教案详情中）..." : "必填：请输入退回修改原因及教学改进指导意见..."}
                rows={3}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-bvb-black resize-none leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
          <span className="text-xs text-gray-500 font-bold">
            审核人: {currentUser?.name || '青训总监'}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className={`px-5 py-2 text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-95 text-white ${
                actionType === 'approve'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
              }`}
            >
              {actionType === 'approve' ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>确认审批通过并入库</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  <span>确认退回该教案</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
