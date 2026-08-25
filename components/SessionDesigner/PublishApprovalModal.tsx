import React, { useState } from 'react';
import { Lock, Send, ShieldCheck, CheckCircle2, Info, Sparkles, X } from 'lucide-react';
import { User } from '../../types';

export type PublishChoice = 'private' | 'submit_approval';

interface PublishApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (choice: PublishChoice, notes?: string) => void;
  contentTypeName: string; // e.g. "示意图" | "训练项" | "教案" | "专栏文章"
  title: string;
  currentUser: User | null;
}

export const PublishApprovalModal: React.FC<PublishApprovalModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  contentTypeName,
  title,
  currentUser
}) => {
  const [selectedChoice, setSelectedChoice] = useState<PublishChoice>('submit_approval');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(selectedChoice, notes.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100 flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-bvb-yellow text-black flex items-center justify-center font-black shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>发布{contentTypeName}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">
                  审核流程
                </span>
              </h3>
              <p className="text-xs text-gray-400 truncate max-w-xs mt-0.5 font-medium">
                「{title || `未命名${contentTypeName}`}」
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

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Policy Notice Box */}
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 flex gap-3 text-amber-900">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-black text-amber-950">俱乐部教案库发布规范提醒：</p>
              <p className="text-amber-800/90 leading-relaxed">
                按照俱乐部教学管理标准，非青训总监创建的内容需经<strong>青训总监审核</strong>后方可正式收录入公共内容库。请选择本次发布的发布方式：
              </p>
            </div>
          </div>

          {/* 2 Options */}
          <div className="space-y-3">
            {/* Option 1: 仅自己可见 */}
            <div
              onClick={() => setSelectedChoice('private')}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                selectedChoice === 'private'
                  ? 'border-gray-900 bg-gray-50/80 shadow-md ring-1 ring-gray-900'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                selectedChoice === 'private' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300'
              }`}>
                {selectedChoice === 'private' && <CheckCircle2 className="w-3.5 h-3.5" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-gray-700" />
                  <span className="text-sm font-black text-gray-900">1. 仅自己可见 (个人私有草稿)</span>
                </div>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  保存至您的个人内容列表中，暂不提交审核。仅您本人可查看和使用，不会展示在俱乐部公共内容库中。
                </p>
              </div>
            </div>

            {/* Option 2: 提交青训总监审核 */}
            <div
              onClick={() => setSelectedChoice('submit_approval')}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                selectedChoice === 'submit_approval'
                  ? 'border-bvb-black bg-yellow-50/50 shadow-md ring-1 ring-yellow-400'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                selectedChoice === 'submit_approval' ? 'border-bvb-black bg-bvb-black text-bvb-yellow' : 'border-gray-300'
              }`}>
                {selectedChoice === 'submit_approval' && <CheckCircle2 className="w-3.5 h-3.5" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-black text-gray-900">2. 提交青训总监审核 (申请入库)</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-bvb-yellow text-black">
                    推荐
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  提交给青训总监审核。审批通过后将自动收录至俱乐部公共内容库，供全梯队教练员学习参考并在教案中引用。
                </p>
              </div>
            </div>
          </div>

          {/* Optional remark field when submitting for approval */}
          {selectedChoice === 'submit_approval' && (
            <div className="animate-in fade-in duration-200">
              <label className="block text-xs font-black text-gray-700 mb-1.5 flex items-center justify-between">
                <span>给青训总监的留言/审核说明 (选填)</span>
                <span className="text-[10px] text-gray-400 font-normal">可选</span>
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="例如：本训练项针对U10进攻三区二过一配合设计，适用于周三强化技术课..."
                rows={2}
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-bvb-black resize-none leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
          <div className="text-[11px] text-gray-500 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>提交人: {currentUser?.name || '教练员'}</span>
          </div>

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
              className={`px-5 py-2 text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-95 ${
                selectedChoice === 'submit_approval'
                  ? 'bg-bvb-yellow hover:bg-yellow-400 text-black shadow-yellow-500/20'
                  : 'bg-gray-900 hover:bg-black text-white shadow-gray-900/20'
              }`}
            >
              {selectedChoice === 'submit_approval' ? (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>确认提交审核</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>保存为私有内容</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
