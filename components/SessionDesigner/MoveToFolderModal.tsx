import React, { useState } from 'react';
import { DrillDesign } from '../../types';
import { Folder, FolderInput, FolderPlus, X, Check, ArrowRight } from 'lucide-react';

interface MoveToFolderModalProps {
  isOpen: boolean;
  itemsToMove: DrillDesign[];
  folders: { id: string; name: string }[];
  allDesigns: DrillDesign[];
  onClose: () => void;
  onSelectFolder: (targetFolderId: string | undefined) => void;
  onCreateAndSelectFolder: (folderName: string) => void;
}

export const MoveToFolderModal: React.FC<MoveToFolderModalProps> = ({
  isOpen,
  itemsToMove,
  folders,
  allDesigns,
  onClose,
  onSelectFolder,
  onCreateAndSelectFolder
}) => {
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  if (!isOpen || itemsToMove.length === 0) return null;

  const handleCreateAndSelect = () => {
    if (!newFolderName.trim()) return;
    onCreateAndSelectFolder(newFolderName.trim());
    setNewFolderName('');
    setIsCreatingNew(false);
  };

  const isMultiple = itemsToMove.length > 1;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-100 p-6 space-y-5 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FolderInput className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900">
                {isMultiple ? `批量移动 ${itemsToMove.length} 项内容` : '移动内容至文件夹'}
              </h3>
              <p className="text-[11px] text-gray-500 font-medium truncate max-w-[260px]">
                {isMultiple
                  ? itemsToMove.map(i => i.title).join('、')
                  : itemsToMove[0]?.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Target Options */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          <div className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1 px-1">
            选择目标分类 / 文件夹
          </div>

          {/* Option: 移至未分类内容 */}
          <button
            onClick={() => onSelectFolder(undefined)}
            className="w-full p-3 rounded-2xl border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50/50 flex items-center justify-between text-left transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gray-100 group-hover:bg-emerald-100 text-gray-500 group-hover:text-emerald-600 flex items-center justify-center">
                <Folder className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-black text-gray-900 group-hover:text-emerald-700">
                  未分类内容
                </div>
                <div className="text-[10px] text-gray-400">
                  移出文件夹，作为独立零散内容保存
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-600 transition-colors" />
          </button>

          {/* Existing Custom Folders */}
          {folders.map(folder => {
            const count = allDesigns.filter(d => d.folderId === folder.id).length;
            const isAllCurrent = itemsToMove.every(i => i.folderId === folder.id);

            return (
              <button
                key={folder.id}
                onClick={() => onSelectFolder(folder.id)}
                className={`w-full p-3 rounded-2xl border flex items-center justify-between text-left transition-all group ${
                  isAllCurrent
                    ? 'border-emerald-500 bg-emerald-50/60'
                    : 'border-gray-200 hover:border-emerald-500 hover:bg-emerald-50/40'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isAllCurrent
                      ? 'bg-emerald-600 text-white'
                      : 'bg-yellow-50 group-hover:bg-emerald-100 text-yellow-700 group-hover:text-emerald-700'
                  }`}>
                    <Folder className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-gray-900 group-hover:text-emerald-700 truncate">
                      {folder.name}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      已有 {count} 项内容 {isAllCurrent && '· (当前所在文件夹)'}
                    </div>
                  </div>
                </div>
                {isAllCurrent ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>当前</span>
                  </span>
                ) : (
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-600 transition-colors shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Create New Folder Inline */}
        <div className="pt-2 border-t border-gray-100">
          {isCreatingNew ? (
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-gray-600">新建文件夹并移入：</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  placeholder="例如: 常用防守反击演练..."
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleCreateAndSelect();
                  }}
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-emerald-600"
                />
                <button
                  onClick={handleCreateAndSelect}
                  disabled={!newFolderName.trim()}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black rounded-xl"
                >
                  创建并移入
                </button>
                <button
                  onClick={() => setIsCreatingNew(false)}
                  className="px-2.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs rounded-xl"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsCreatingNew(true)}
              className="w-full py-2.5 px-3 rounded-2xl border border-dashed border-gray-300 hover:border-emerald-500 hover:bg-emerald-50/30 text-gray-600 hover:text-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
            >
              <FolderPlus className="w-4 h-4 text-emerald-600" />
              <span>新建文件夹并移入</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
