import React, { useState } from 'react';
import { DrillDesign } from '../../types';
import { X, Image as ImageIcon, Check, Edit3 } from 'lucide-react';

interface RenameUploadedDiagramModalProps {
  isOpen: boolean;
  diagram: DrillDesign | null;
  onClose: () => void;
  onSave: (updatedDiagram: DrillDesign) => void;
}

interface RenameFormProps {
  diagram: DrillDesign;
  onClose: () => void;
  onSave: (updatedDiagram: DrillDesign) => void;
}

const RenameForm: React.FC<RenameFormProps> = ({ diagram, onClose, onSave }) => {
  const [title, setTitle] = useState(diagram.title || '');
  const [description, setDescription] = useState(diagram.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('请输入示意图名称');
      return;
    }

    const updated: DrillDesign = {
      ...diagram,
      title: title.trim(),
      description: description.trim(),
      updatedAt: new Date().toISOString().split('T')[0]
    };

    onSave(updated);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      {/* Image Thumbnail Preview */}
      <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-950 aspect-[16/10] flex items-center justify-center group shadow-inner">
        {diagram.previewImage || diagram.diagramImage ? (
          <img
            src={diagram.previewImage || diagram.diagramImage}
            alt={diagram.title}
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        ) : (
          <ImageIcon className="w-10 h-10 text-gray-600" />
        )}
        <div className="absolute top-2 left-2 px-2.5 py-1 bg-black/70 backdrop-blur-md rounded-lg text-[10px] text-white font-bold flex items-center gap-1.5 border border-white/10">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>本地导入示意图</span>
        </div>
      </div>

      <div>
        <label className="block text-xs font-black text-gray-800 mb-1.5">
          示意图名称 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="请输入示意图名称..."
          autoFocus
          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm font-bold text-gray-900 outline-none transition-all"
        />
      </div>

      <div>
        <label className="block text-xs font-black text-gray-800 mb-1.5">
          备注说明
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="可填写该示意图的战术要点或使用说明..."
          rows={2}
          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs text-gray-700 outline-none transition-all resize-none"
        />
      </div>

      {/* Footer Buttons */}
      <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-black transition-colors"
        >
          取消
        </button>
        <button
          type="submit"
          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all"
        >
          <Check className="w-3.5 h-3.5" />
          <span>保存修改</span>
        </button>
      </div>
    </form>
  );
};

export const RenameUploadedDiagramModal: React.FC<RenameUploadedDiagramModalProps> = ({
  isOpen,
  diagram,
  onClose,
  onSave
}) => {
  if (!isOpen || !diagram) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-100 flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 via-white to-gray-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900">编辑示意图信息</h3>
              <p className="text-[10px] text-gray-500">本地导入示意图仅支持编辑名称与备注</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <RenameForm
          key={diagram.id}
          diagram={diagram}
          onClose={onClose}
          onSave={onSave}
        />
      </div>
    </div>
  );
};
