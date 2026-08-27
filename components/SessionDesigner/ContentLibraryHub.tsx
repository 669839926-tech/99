import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DrillDesign, User } from '../../types';
import { PitchSvgRenderer } from './PitchSvgRenderer';
import { MoveToFolderModal } from './MoveToFolderModal';
import { DirectorApprovalModal } from './DirectorApprovalModal';
import {
  Compass, Layers, BookOpen, PenTool, Calendar, Folder,
  Search, Grid, List, Edit3, Copy, Trash2, Heart,
  Clock, ArrowUpRight, FolderInput,
  Square, X, Check, AlertCircle, Sparkles,
  ChevronDown, Plus, PlusCircle, User as UserIcon,
  ShieldCheck, Lock, CheckCircle2, XCircle
} from 'lucide-react';

interface ContentLibraryHubProps {
  designs: DrillDesign[];
  currentUser: User | null;
  initialFilter?: string;
  onOpenPitchSelector: () => void;
  onOpenCreateDrillModal: () => void;
  onOpenCreateSessionModal: () => void;
  onOpenCreateOtherModal: () => void;
  onEditItem: (item: DrillDesign) => void;
  onViewDetail: (item: DrillDesign) => void;
  onDuplicateItem: (item: DrillDesign) => void;
  onDeleteItem: (id: string) => void;
  onSaveDesign?: (item: DrillDesign) => void;
  onBatchSaveDesigns?: (items: DrillDesign[]) => void;
  onBatchDeleteDesigns?: (ids: string[]) => void;
  onToggleFavorite: (id: string) => void;
}

const DEFAULT_FOLDERS = [
  { id: 'f-shoot', name: '射门训练' },
  { id: 'f-dribble', name: '运控球训练' },
  { id: 'f-pass', name: '传接球训练' },
  { id: 'f-match', name: '比赛场景训练' },
  { id: 'f-defense', name: '防守训练' },
  { id: 'f-warmup', name: '常用高频热身套路' }
];

export const ContentLibraryHub: React.FC<ContentLibraryHubProps> = ({
  designs,
  currentUser,
  initialFilter,
  onOpenPitchSelector,
  onOpenCreateDrillModal,
  onOpenCreateSessionModal,
  onOpenCreateOtherModal,
  onEditItem,
  onViewDetail,
  onDuplicateItem,
  onDeleteItem,
  onSaveDesign,
  onBatchSaveDesigns,
  onBatchDeleteDesigns,
  onToggleFavorite
}) => {
  // Top Level Tabs
  const [mainTab, setMainTab] = useState<'content' | 'articles' | 'favorites'>('content');
  
  // Left Sidebar Navigation (all, unfiled, drafts, pending, or folderId)
  const [activeCategoryState, setActiveCategoryState] = useState<'mine' | 'all' | 'unfiled' | 'drafts' | 'pending' | string>(() => {
    if (initialFilter === 'pending') return 'pending';
    return 'all';
  });

  const [prevInitialFilter, setPrevInitialFilter] = useState(initialFilter);
  if (initialFilter !== prevInitialFilter) {
    setPrevInitialFilter(initialFilter);
    if (initialFilter) {
      setActiveCategoryState(initialFilter);
    }
  }

  const activeCategory = activeCategoryState;
  const setActiveCategory = setActiveCategoryState;
  
  // Filtering & Sorting
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');

  // Custom User Folders (Persistent via localStorage)
  const [folders, setFolders] = useState<{ id: string; name: string }[]>(() => {
    try {
      const saved = localStorage.getItem('club_session_folders_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore parse error
    }
    return DEFAULT_FOLDERS;
  });

  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isManagingFolders, setIsManagingFolders] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [deletingFolder, setDeletingFolder] = useState<{ id: string; name: string; count: number } | null>(null);

  // Dropdown states
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);
  const [showMoveToDropdown, setShowMoveToDropdown] = useState(false);
  const moveToDropdownRef = useRef<HTMLDivElement>(null);
  const createDropdownRef = useRef<HTMLDivElement>(null);

  // Multi-select & Batch Operations State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Move Modal State (For full dialog if requested)
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [itemsToMove, setItemsToMove] = useState<DrillDesign[]>([]);

  // Director Approval Modal State
  const [approvalModalItem, setApprovalModalItem] = useState<DrillDesign | null>(null);

  // User Role & Permissions Helpers
  const isDirector = currentUser?.role === 'director';
  
  // Check if item was created by youth academy director
  const isDirectorCreated = (item: DrillDesign) => {
    return item.authorRole === 'director' || item.authorId === 'u1' || (!item.authorId && !item.authorRole);
  };

  // Check if current user can edit the item
  const canEditItem = (item: DrillDesign) => {
    if (isDirector) return true;
    // Director created items can ONLY be edited by the Director
    if (isDirectorCreated(item)) return false;
    // For coach items, only author can edit
    if (item.authorId && currentUser?.id && item.authorId !== currentUser.id) return false;
    return true;
  };

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => prev === msg ? null : prev);
    }, 3500);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moveToDropdownRef.current && !moveToDropdownRef.current.contains(e.target as Node)) {
        setShowMoveToDropdown(false);
      }
      if (createDropdownRef.current && !createDropdownRef.current.contains(e.target as Node)) {
        setShowCreateDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Persist folders
  useEffect(() => {
    try {
      localStorage.setItem('club_session_folders_v2', JSON.stringify(folders));
    } catch (e) {
      console.warn('Failed to save folders to localStorage:', e);
    }
  }, [folders]);

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

  // Helper: timestamp parser for robust sorting by creation time (Default: 最新创建优先)
  const getItemTimestamp = (item: DrillDesign): number => {
    if (item.createdAt) {
      const parsed = new Date(item.createdAt).getTime();
      if (!isNaN(parsed) && parsed > 0) {
        if (item.createdAt.length <= 10 && item.id) {
          const idMatch = item.id.match(/\d{10,13}/);
          if (idMatch) return parseInt(idMatch[0], 10);
        }
        return parsed;
      }
    }
    if (item.id) {
      const idMatch = item.id.match(/\d{10,13}/);
      if (idMatch) return parseInt(idMatch[0], 10);
    }
    return 0;
  };

  // Folder creation
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const newFolder = { id: `f-${Date.now()}`, name: newFolderName.trim() };
    setFolders(prev => [...prev, newFolder]);
    setNewFolderName('');
    setShowNewFolderInput(false);
    showToast(`文件夹「${newFolder.name}」已创建`);
  };

  // Folder renaming
  const handleSaveRenameFolder = (folderId: string) => {
    if (!editingFolderName.trim()) return;
    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, name: editingFolderName.trim() } : f));
    setEditingFolderId(null);
    setEditingFolderName('');
    showToast('文件夹名称已更新');
  };

  // Request Delete Folder Confirmation
  const handleRequestDeleteFolder = (f: { id: string; name: string }, e: React.MouseEvent) => {
    e.stopPropagation();
    const count = designs.filter(d => d.folderId === f.id).length;
    setDeletingFolder({ id: f.id, name: f.name, count });
  };

  // Confirm Delete Folder
  const handleConfirmDeleteFolder = () => {
    if (!deletingFolder) return;
    const { id, name, count } = deletingFolder;

    // 1. Move all items in this folder to unfiled
    const itemsInFolder = designs.filter(d => d.folderId === id);
    if (itemsInFolder.length > 0) {
      const updatedItems = itemsInFolder.map(item => ({
        ...item,
        folderId: undefined
      }));
      if (onBatchSaveDesigns) {
        onBatchSaveDesigns(updatedItems);
      } else if (onSaveDesign) {
        updatedItems.forEach(d => onSaveDesign(d));
      }
    }

    // 2. Remove folder from state
    setFolders(prev => prev.filter(f => f.id !== id));

    // 3. Reset activeCategory if currently viewing this folder
    if (activeCategory === id) {
      setActiveCategory('all');
    }

    setDeletingFolder(null);
    showToast(`文件夹「${name}」已删除，内部 ${count} 项内容已保留并移入「未分组内容」`);
  };

  // Single Item Move to Folder
  const handleOpenSingleMove = (item: DrillDesign, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemsToMove([item]);
    setIsMoveModalOpen(true);
  };

  // Apply Move To Folder (Batch or Single)
  const handleApplyMoveToFolder = (targetFolderId: string | undefined, specificItems?: DrillDesign[]) => {
    const targets = specificItems || (itemsToMove.length > 0 ? itemsToMove : designs.filter(d => selectedIds.includes(d.id)));
    if (targets.length === 0) {
      alert('请先选择需要移动的教案内容');
      return;
    }

    const targetFolder = folders.find(f => f.id === targetFolderId);
    const targetName = targetFolder ? targetFolder.name : '未分组内容';

    const updatedItems = targets.map(item => ({
      ...item,
      folderId: targetFolderId
    }));

    if (onBatchSaveDesigns) {
      onBatchSaveDesigns(updatedItems);
    } else if (onSaveDesign) {
      updatedItems.forEach(d => onSaveDesign(d));
    }

    showToast(`已将 ${targets.length} 项内容移动至「${targetName}」`);
    setIsMoveModalOpen(false);
    setShowMoveToDropdown(false);
    setItemsToMove([]);
    setSelectedIds([]);
  };

  // Create New Folder and Move items into it
  const handleCreateAndMoveToFolder = (folderName: string) => {
    const newFolder = { id: `f-${Date.now()}`, name: folderName.trim() };
    setFolders(prev => [...prev, newFolder]);
    handleApplyMoveToFolder(newFolder.id);
  };

  // Toggle Single Item Selection
  const handleToggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Batch Delete
  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    if (onBatchDeleteDesigns) {
      onBatchDeleteDesigns(selectedIds);
      setSelectedIds([]);
    } else {
      if (window.confirm(`确定要批量删除选中的 ${selectedIds.length} 项内容吗？`)) {
        selectedIds.forEach(id => onDeleteItem(id));
        setSelectedIds([]);
      }
    }
  };

  // Director Approval Handlers
  const handleApproveContent = (item: DrillDesign, feedback?: string) => {
    const updated: DrillDesign = {
      ...item,
      approvalStatus: 'approved',
      isPrivate: false,
      isDraft: false,
      approvedBy: currentUser?.name || '青训总监',
      approvedAt: new Date().toISOString(),
      approvalFeedback: feedback || item.approvalFeedback
    };
    if (onSaveDesign) onSaveDesign(updated);
    showToast(`已审核通过并发布至内容库：「${item.title}」`);
  };

  const handleRejectContent = (item: DrillDesign, feedback: string) => {
    const updated: DrillDesign = {
      ...item,
      approvalStatus: 'rejected',
      approvalFeedback: feedback
    };
    if (onSaveDesign) onSaveDesign(updated);
    showToast(`已驳回「${item.title}」，修改建议已同步教练员`);
  };

  // Pre-calculate category counts for navigation
  const pendingApprovalsCount = useMemo(() => {
    if (isDirector) {
      return designs.filter(d => d.approvalStatus === 'pending').length;
    }
    return designs.filter(d => d.approvalStatus === 'pending' && d.authorId === currentUser?.id).length;
  }, [designs, isDirector, currentUser]);

  const myCreationsCount = useMemo(() => {
    if (isDirector) {
      return designs.filter(d => isDirectorCreated(d) || (currentUser?.id && d.authorId === currentUser.id)).length;
    }
    return designs.filter(d => currentUser?.id && d.authorId === currentUser.id).length;
  }, [designs, isDirector, currentUser]);

  const approvedLibraryCount = useMemo(() => {
    return designs.filter(d => {
      if (d.approvalStatus === 'rejected' || d.approvalStatus === 'pending' || d.approvalStatus === 'draft' || d.isDraft || d.isPrivate) {
        return false;
      }
      return d.approvalStatus === 'approved' || isDirectorCreated(d);
    }).length;
  }, [designs]);

  const draftsCount = useMemo(() => {
    return designs.filter(d => {
      const isDraftOrRejected = d.isDraft || d.approvalStatus === 'draft' || d.approvalStatus === 'rejected' || d.isPrivate;
      if (!isDraftOrRejected) return false;
      if (isDirector) return true;
      return d.authorId === currentUser?.id;
    }).length;
  }, [designs, isDirector, currentUser]);

  // Filter items based on left sidebar selection + search + type + permissions
  const filteredItems = useMemo(() => {
    return designs.filter(item => {
      // Top tab filtering
      if (mainTab === 'favorites' && !item.isFavorite) return false;
      if (mainTab === 'articles' && item.contentType !== 'other' && item.category !== 'Other') return false;

      // Access control: Coaches only see approved library content + their own creations
      if (!isDirector) {
        const isOwn = item.authorId && currentUser && item.authorId === currentUser.id;
        const isApprovedOrDirector = (item.approvalStatus === 'approved' || isDirectorCreated(item)) && item.approvalStatus !== 'rejected' && item.approvalStatus !== 'pending' && !item.isDraft && !item.isPrivate;
        if (!isOwn && !isApprovedOrDirector) {
          return false;
        }
      }

      // Left sidebar category filtering
      if (activeCategory === 'pending') {
        if (item.approvalStatus !== 'pending') return false;
        if (!isDirector && item.authorId !== currentUser?.id) return false;
      } else if (activeCategory === 'all') {
        // "公共内容库" (Public Repository): STRICTLY approved / director standard items only.
        // NEVER show rejected, pending, or draft items in the public repository
        if (item.approvalStatus === 'rejected' || item.approvalStatus === 'pending' || item.approvalStatus === 'draft' || item.isDraft || item.isPrivate) {
          return false;
        }
        if (item.approvalStatus !== 'approved' && !isDirectorCreated(item)) return false;
      } else if (activeCategory === 'unfiled') {
        if (item.folderId) return false;
      } else if (activeCategory === 'drafts') {
        const isDraftOrRejected = item.isDraft || item.approvalStatus === 'draft' || item.approvalStatus === 'rejected' || item.isPrivate;
        if (!isDraftOrRejected) return false;
        if (!isDirector && item.authorId !== currentUser?.id) return false;
      } else if (activeCategory === 'mine') {
        if (isDirector) {
          if (!isDirectorCreated(item) && item.authorId !== currentUser?.id) return false;
        } else {
          if (currentUser?.id && item.authorId !== currentUser.id) return false;
        }
      } else if (activeCategory !== 'all' && activeCategory !== 'mine' && activeCategory !== 'unfiled' && activeCategory !== 'drafts' && activeCategory !== 'pending') {
        if (item.folderId !== activeCategory) return false;
      }

      // Content Type filter
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
  }, [designs, mainTab, activeCategory, contentTypeFilter, searchQuery, isDirector, currentUser]);

  // Sort items (Default: 最新创建的示意图、训练项、教案)
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      if (sortBy === 'newest') {
        const timeA = getItemTimestamp(a);
        const timeB = getItemTimestamp(b);
        if (timeB !== timeA) return timeB - timeA;
        return (b.id || '').localeCompare(a.id || '');
      } else if (sortBy === 'oldest') {
        const timeA = getItemTimestamp(a);
        const timeB = getItemTimestamp(b);
        if (timeA !== timeB) return timeA - timeB;
        return (a.id || '').localeCompare(b.id || '');
      } else if (sortBy === 'name') {
        return (a.title || '').localeCompare(b.title || '');
      }
      return 0;
    });
  }, [filteredItems, sortBy]);

  // Select all in current view
  const isAllCurrentSelected = sortedItems.length > 0 && sortedItems.every(i => selectedIds.includes(i.id));

  const handleToggleSelectAll = () => {
    if (isAllCurrentSelected) {
      setSelectedIds(prev => prev.filter(id => !sortedItems.some(i => i.id === id)));
    } else {
      const allCurrentIds = sortedItems.map(i => i.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...allCurrentIds])));
    }
  };

  return (
    <div className="space-y-6 relative pb-16">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold border border-gray-700 animate-in fade-in slide-in-from-top-3">
          <Sparkles className="w-4 h-4 text-bvb-yellow" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Top 4 Feature Creation Cards */}
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
            在此生成工具创建战术示意图与动画，支持24种场地布局
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

      {/* 2. Middle Calendar / Schedule Bar */}
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

      {/* 3. Main Content Studio: Left Sidebar Folder Tree + Right Content Area (Image 2 Layout) */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[640px]">
        
        {/* ===================== LEFT SIDEBAR (Category & Folders) ===================== */}
        <div className="w-full md:w-64 lg:w-72 bg-gray-50/70 border-r border-gray-200 p-4 flex flex-col justify-between shrink-0 space-y-4">
          
          <div className="space-y-4">
            
            {/* Top Navigation Mode Pills */}
            <div className="flex items-center gap-1 bg-gray-200/70 p-1 rounded-2xl">
              <button
                onClick={() => {
                  setMainTab('content');
                  setActiveCategory('all');
                }}
                className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all ${
                  mainTab === 'content' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                我的内容 ({designs.length})
              </button>
              <button
                onClick={() => {
                  setMainTab('favorites');
                  setActiveCategory('all');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                  mainTab === 'favorites' ? 'bg-white text-red-600 shadow-xs' : 'text-gray-500 hover:text-gray-900'
                }`}
                title="我的收藏"
              >
                <Heart className="w-3.5 h-3.5 fill-current" />
              </button>
            </div>

            {/* Quick Filter Search Box (Image 2 style) */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索内容标题或主题..."
                className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-500 shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Primary Category List (Image 2 left layout) */}
            <div className="space-y-1">
              <button
                onClick={() => setActiveCategory('mine')}
                className={`w-full px-3 py-2 rounded-xl text-xs font-black flex items-center justify-between transition-all ${
                  activeCategory === 'mine'
                    ? 'bg-emerald-100/70 text-emerald-900 font-black'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-emerald-600" />
                  <span>我创建的</span>
                </span>
                <span className="text-[11px] font-mono opacity-70">
                  {myCreationsCount}
                </span>
              </button>

              <button
                onClick={() => setActiveCategory('all')}
                className={`w-full px-3 py-2 rounded-xl text-xs font-black flex items-center justify-between transition-all ${
                  activeCategory === 'all'
                    ? 'bg-emerald-100/70 text-emerald-900 font-black'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <span>公共内容库</span>
                </span>
                <span className="text-[11px] font-mono opacity-70">
                  {approvedLibraryCount}
                </span>
              </button>

              <button
                onClick={() => setActiveCategory('pending')}
                className={`w-full px-3 py-2 rounded-xl text-xs font-black flex items-center justify-between transition-all ${
                  activeCategory === 'pending'
                    ? 'bg-amber-100 text-amber-900 font-black border border-amber-300'
                    : 'text-gray-700 hover:bg-amber-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>待总监审批</span>
                </span>
                {pendingApprovalsCount > 0 ? (
                  <span className="text-[10px] font-black font-mono bg-amber-500 text-white px-1.5 py-0.5 rounded-full shadow-2xs">
                    {pendingApprovalsCount}
                  </span>
                ) : (
                  <span className="text-[11px] font-mono opacity-60">0</span>
                )}
              </button>

              <button
                onClick={() => setActiveCategory('unfiled')}
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
                  activeCategory === 'unfiled'
                    ? 'bg-emerald-100/70 text-emerald-900 font-black'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-gray-400" />
                  <span>未分组内容</span>
                </span>
                <span className="text-[11px] font-mono opacity-70">
                  {designs.filter(d => !d.folderId).length}
                </span>
              </button>

              <button
                onClick={() => setActiveCategory('drafts')}
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
                  activeCategory === 'drafts'
                    ? 'bg-emerald-100/70 text-emerald-900 font-black'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-gray-400" />
                  <span>草稿箱</span>
                </span>
                <span className="text-[11px] font-mono opacity-70">
                  {draftsCount}
                </span>
              </button>
            </div>

            {/* Folder Header with '管理' and '+ 新建' (Image 2 style) */}
            <div className="pt-2 border-t border-gray-200">
              <div className="flex items-center justify-between px-1 mb-2">
                <span className="text-xs font-black text-gray-500 tracking-wider">
                  文件夹 ({folders.length})
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsManagingFolders(!isManagingFolders)}
                    className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md transition-colors ${
                      isManagingFolders ? 'bg-emerald-600 text-white' : 'text-emerald-600 hover:bg-emerald-50'
                    }`}
                  >
                    {isManagingFolders ? '完成' : '管理'}
                  </button>
                  <button
                    onClick={() => setShowNewFolderInput(true)}
                    className="text-[11px] font-bold text-gray-500 hover:text-emerald-600 p-1 hover:bg-gray-200 rounded-md"
                    title="新建文件夹"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Vertical Scrollable Folder List (No more horizontal squeeze!) */}
              <div className="space-y-1 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                
                {/* Inline New Folder Input */}
                {showNewFolderInput && (
                  <div className="p-2 bg-white border border-emerald-500 rounded-xl space-y-1.5 shadow-xs mb-1 animate-in fade-in">
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={e => setNewFolderName(e.target.value)}
                      placeholder="文件夹名称..."
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleCreateFolder();
                        if (e.key === 'Escape') setShowNewFolderInput(false);
                      }}
                      className="w-full px-2.5 py-1 text-xs font-bold border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-600"
                    />
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setShowNewFolderInput(false)}
                        className="px-2 py-0.5 text-[11px] text-gray-500 hover:bg-gray-100 rounded"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleCreateFolder}
                        disabled={!newFolderName.trim()}
                        className="px-2.5 py-0.5 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded disabled:opacity-50"
                      >
                        确定创建
                      </button>
                    </div>
                  </div>
                )}

                {/* Folder Items */}
                {folders.map(f => {
                  const count = designs.filter(d => d.folderId === f.id).length;
                  const isActive = activeCategory === f.id;
                  const isEditing = editingFolderId === f.id;

                  if (isEditing) {
                    return (
                      <div key={f.id} className="p-2 bg-white border border-emerald-500 rounded-xl space-y-1">
                        <input
                          type="text"
                          value={editingFolderName}
                          onChange={e => setEditingFolderName(e.target.value)}
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveRenameFolder(f.id);
                            if (e.key === 'Escape') setEditingFolderId(null);
                          }}
                          className="w-full px-2 py-1 text-xs font-bold border rounded-md focus:outline-none focus:border-emerald-600"
                        />
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditingFolderId(null)}
                            className="text-[10px] px-2 py-0.5 text-gray-500 rounded"
                          >
                            取消
                          </button>
                          <button
                            onClick={() => handleSaveRenameFolder(f.id)}
                            className="text-[10px] px-2 py-0.5 bg-emerald-600 text-white font-bold rounded"
                          >
                            保存
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={f.id}
                      onClick={() => setActiveCategory(f.id)}
                      className={`group w-full px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
                        isActive
                          ? 'bg-emerald-100/70 text-emerald-950 font-black'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Folder className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-emerald-700' : 'text-gray-400 group-hover:text-emerald-600'}`} />
                        <span className="truncate max-w-[130px] font-medium group-hover:text-gray-900">{f.name}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isManagingFolders ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingFolderId(f.id);
                                setEditingFolderName(f.name);
                              }}
                              className="p-1 hover:bg-gray-200 text-gray-500 rounded"
                              title="重命名"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => handleRequestDeleteFolder(f, e)}
                              className="p-1 hover:bg-red-100 text-red-500 rounded"
                              title="删除文件夹"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-[11px] font-mono opacity-60">
                              {count}
                            </span>
                            {/* Hover Quick Delete Button */}
                            <button
                              onClick={(e) => handleRequestDeleteFolder(f, e)}
                              title={`删除文件夹「${f.name}」`}
                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-100 text-red-500 rounded transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Quick Create Folder Button */}
              {!showNewFolderInput && (
                <button
                  onClick={() => setShowNewFolderInput(true)}
                  className="w-full mt-2 py-2 px-3 rounded-xl border border-dashed border-gray-300 hover:border-emerald-500 hover:bg-emerald-50/50 text-gray-600 hover:text-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>新建文件夹</span>
                </button>
              )}
            </div>
          </div>

          {/* Sidebar Footer Info */}
          <div className="pt-3 border-t border-gray-200 text-[11px] text-gray-400 flex items-center justify-between px-1">
            <span>顽石之光足球青训</span>
            <span className="font-mono">v2.4</span>
          </div>
        </div>

        {/* ===================== RIGHT CONTENT AREA (Toolbar & Content Items) ===================== */}
        <div className="flex-1 p-5 flex flex-col justify-between space-y-4">
          
          <div className="space-y-4">
            
            {/* Top Toolbar (Exact match with Image 2) */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3.5 flex-wrap gap-3">
              
              {/* Left Group: Select All Checkbox + [移动至 ▾] + [删除] + [创建内容 ▾] */}
              <div className="flex items-center gap-2.5 flex-wrap">
                
                {/* Select All Checkbox */}
                <button
                  onClick={handleToggleSelectAll}
                  className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all ${
                    isAllCurrentSelected
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                      : selectedIds.length > 0
                      ? 'bg-emerald-100 border-emerald-500 text-emerald-700'
                      : 'border-gray-300 hover:border-emerald-500 bg-white text-transparent'
                  }`}
                  title={isAllCurrentSelected ? '取消全选' : '全选所有项'}
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                </button>

                {/* 移动至 ▾ Dropdown Button (Image 2 style) */}
                <div className="relative" ref={moveToDropdownRef}>
                  <button
                    onClick={() => {
                      if (selectedIds.length === 0) {
                        alert('请先勾选需要移动的教案内容');
                        return;
                      }
                      setShowMoveToDropdown(!showMoveToDropdown);
                    }}
                    disabled={selectedIds.length === 0}
                    className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                      selectedIds.length > 0
                        ? 'border-gray-300 bg-white hover:border-emerald-500 hover:bg-emerald-50/50 text-gray-800 shadow-2xs cursor-pointer'
                        : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <span>移动至</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                  </button>

                  {/* Move to Folder Popup Menu */}
                  {showMoveToDropdown && (
                    <div className="absolute left-0 top-full mt-1.5 w-56 bg-white rounded-2xl shadow-xl border border-gray-200 py-1.5 z-30 animate-in fade-in zoom-in-95">
                      <div className="px-3 py-1 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                        移动选中的 {selectedIds.length} 项到：
                      </div>
                      
                      <button
                        onClick={() => handleApplyMoveToFolder(undefined)}
                        className="w-full px-3 py-2 text-left text-xs font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2"
                      >
                        <Folder className="w-3.5 h-3.5 text-gray-400" />
                        <span>未分组内容 (移出文件夹)</span>
                      </button>

                      <div className="my-1 border-t border-gray-100" />

                      {folders.map(f => (
                        <button
                          key={f.id}
                          onClick={() => handleApplyMoveToFolder(f.id)}
                          className="w-full px-3 py-2 text-left text-xs font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center justify-between"
                        >
                          <span className="flex items-center gap-2 truncate">
                            <Folder className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="truncate">{f.name}</span>
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {designs.filter(d => d.folderId === f.id).length}
                          </span>
                        </button>
                      ))}

                      <div className="my-1 border-t border-gray-100" />
                      
                      <button
                        onClick={() => {
                          setShowMoveToDropdown(false);
                          setItemsToMove(designs.filter(d => selectedIds.includes(d.id)));
                          setIsMoveModalOpen(true);
                        }}
                        className="w-full px-3 py-2 text-left text-xs font-black text-emerald-600 hover:bg-emerald-50 flex items-center gap-2"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>新建文件夹并移入...</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 批量删除 Button (Image 2 style) */}
                <button
                  onClick={handleBatchDelete}
                  disabled={selectedIds.length === 0}
                  className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                    selectedIds.length > 0
                      ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-300 cursor-pointer shadow-2xs'
                      : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed opacity-60'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>删除 {selectedIds.length > 0 && `(${selectedIds.length})`}</span>
                </button>

                {/* 创建内容 ▾ Button (Image 2 style) */}
                <div className="relative" ref={createDropdownRef}>
                  <button
                    onClick={() => setShowCreateDropdown(!showCreateDropdown)}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>创建内容</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Create Options Dropdown */}
                  {showCreateDropdown && (
                    <div className="absolute left-0 top-full mt-1.5 w-44 bg-white rounded-2xl shadow-xl border border-gray-200 py-1.5 z-30 animate-in fade-in zoom-in-95">
                      <button
                        onClick={() => {
                          setShowCreateDropdown(false);
                          onOpenPitchSelector();
                        }}
                        className="w-full px-3 py-2 text-left text-xs font-bold text-gray-800 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2"
                      >
                        <Compass className="w-4 h-4 text-emerald-600" />
                        <span>创建战术示意图</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowCreateDropdown(false);
                          onOpenCreateDrillModal();
                        }}
                        className="w-full px-3 py-2 text-left text-xs font-bold text-gray-800 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2"
                      >
                        <Layers className="w-4 h-4 text-blue-600" />
                        <span>创建训练项</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowCreateDropdown(false);
                          onOpenCreateSessionModal();
                        }}
                        className="w-full px-3 py-2 text-left text-xs font-bold text-gray-800 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2"
                      >
                        <BookOpen className="w-4 h-4 text-yellow-600" />
                        <span>创建主题教案</span>
                      </button>
                      <div className="my-1 border-t border-gray-100" />
                      <button
                        onClick={() => {
                          setShowCreateDropdown(false);
                          onOpenCreateOtherModal();
                        }}
                        className="w-full px-3 py-2 text-left text-xs font-bold text-gray-800 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2"
                      >
                        <PenTool className="w-4 h-4 text-purple-600" />
                        <span>创建专栏文章/其他</span>
                      </button>
                    </div>
                  )}
                </div>

              </div>

              {/* Right Group: Content Type Filter + Sorting + View Mode */}
              <div className="flex items-center gap-2.5 flex-wrap">
                
                {/* Content Type Filter Dropdown */}
                <select
                  value={contentTypeFilter}
                  onChange={e => setContentTypeFilter(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
                >
                  <option value="all">全部类型</option>
                  <option value="diagram">战术示意图</option>
                  <option value="drill">训练项</option>
                  <option value="session_plan">主题教案</option>
                </select>

                {/* Sort dropdown (Default: 最新创建优先) */}
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
                >
                  <option value="newest">最新创建 (默认)</option>
                  <option value="oldest">最早创建</option>
                  <option value="name">按标题 (A-Z)</option>
                </select>

                {/* View Mode Toggle: List (Image 2 style) vs Grid */}
                <div className="flex items-center gap-0.5 bg-gray-100 p-1 rounded-xl">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-400 hover:text-gray-700'}`}
                    title="列表视图 (推荐)"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-400 hover:text-gray-700'}`}
                    title="网格视图"
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                </div>

              </div>

            </div>

            {/* Current Active Category Title & Counts */}
            <div className="flex items-center justify-between text-xs text-gray-500 px-1">
              <div className="flex items-center gap-2 font-bold">
                <span className="text-gray-900 font-black">
                  {activeCategory === 'all' ? '全部内容' :
                   activeCategory === 'mine' ? '我创建的' :
                   activeCategory === 'unfiled' ? '未分组内容' :
                   activeCategory === 'drafts' ? '草稿箱' :
                   folders.find(f => f.id === activeCategory)?.name || '分类列表'}
                </span>
                <span>(共 {sortedItems.length} 项)</span>
              </div>
              {selectedIds.length > 0 && (
                <span className="text-emerald-600 font-bold">
                  已勾选 {selectedIds.length} 项
                </span>
              )}
            </div>

            {/* Content List Area (List View strictly matching Image 2 layout) */}
            {sortedItems.length > 0 ? (
              viewMode === 'list' ? (
                /* =================== LIST VIEW (Image 2 layout) =================== */
                <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                  {sortedItems.map(item => {
                    const isSelected = selectedIds.includes(item.id);
                    const itemFolder = folders.find(f => f.id === item.folderId);
                    const isPlan = item.category === 'session_plan' || item.contentType === 'session_plan';
                    const isDrill = item.category === 'drill_item' || item.contentType === 'drill';

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 flex items-center justify-between gap-4 transition-all duration-150 group ${
                          isSelected ? 'bg-emerald-50/70' : 'hover:bg-gray-50/80'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          
                          {/* Checkbox */}
                          <div
                            onClick={() => handleToggleSelect(item.id)}
                            className={`w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                              isSelected
                                ? 'bg-emerald-600 text-white'
                                : 'border border-gray-300 group-hover:border-emerald-500 text-transparent'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>

                          {/* Tactical Thumbnail Preview (Image 2 style) */}
                          <div
                            onClick={() => onViewDetail(item)}
                            className="w-20 h-14 bg-gray-950 rounded-xl overflow-hidden shrink-0 flex items-center justify-center cursor-pointer shadow-2xs border border-gray-200/60 group-hover:opacity-90 relative"
                          >
                            {item.previewImage ? (
                              <img src={item.previewImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <PitchSvgRenderer
                                pitchType={item.pitchType || 'Midfield'}
                                pitchTheme={item.pitchTheme || 'Grass'}
                                className="w-full h-full"
                              />
                            )}
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-[9px] bg-white/90 text-gray-900 font-bold px-1.5 py-0.5 rounded">查看</span>
                            </div>
                          </div>

                          {/* Middle Text Info */}
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Category Icon Badge (Image 2 blue/gold icon badge) */}
                              <span
                                className={`text-[10px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-1 shrink-0 ${
                                  isPlan
                                    ? 'bg-yellow-100 text-yellow-900'
                                    : isDrill
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {isPlan ? <BookOpen className="w-3 h-3" /> : isDrill ? <Layers className="w-3 h-3" /> : <Compass className="w-3 h-3" />}
                                <span>{isPlan ? '教案' : isDrill ? '训练项' : '示意图'}</span>
                              </span>

                              {/* Approval Status / Origin Badge (示意图不显示总监标准标识) */}
                              {isDirectorCreated(item) ? (
                                (isPlan || isDrill) ? (
                                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-yellow-400/90 text-gray-950 flex items-center gap-1 shadow-2xs">
                                    <ShieldCheck className="w-2.5 h-2.5" />
                                    <span>总监标准</span>
                                  </span>
                                ) : null
                              ) : item.approvalStatus === 'pending' ? (
                                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>待总监审批</span>
                                </span>
                              ) : item.approvalStatus === 'approved' ? (
                                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  <span>已入库</span>
                                </span>
                              ) : item.approvalStatus === 'rejected' ? (
                                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-red-100 text-red-700 border border-red-300 flex items-center gap-1" title={item.approvalFeedback || '已被退回修改'}>
                                  <XCircle className="w-2.5 h-2.5" />
                                  <span>已退回</span>
                                </span>
                              ) : null}

                              <h4
                                onClick={() => onViewDetail(item)}
                                className="text-xs font-black text-gray-900 hover:text-emerald-700 transition-colors cursor-pointer truncate max-w-[280px] sm:max-w-md md:max-w-lg"
                              >
                                {item.title}
                              </h4>

                              {itemFolder && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-yellow-50 text-yellow-800 border border-yellow-200/60 shrink-0">
                                  {itemFolder.name}
                                </span>
                              )}
                            </div>

                            {/* Author & Timestamp (Image 2 style) */}
                            <div className="flex items-center gap-3 text-[11px] text-gray-400">
                              <span>作者: <strong className="text-gray-600 font-medium">{item.authorName || currentUser?.name || '镇远县顽石之光足球俱乐部'}</strong></span>
                              <span>更新时间: <strong className="text-gray-500 font-mono">{item.createdAt ? item.createdAt.slice(0, 16).replace('T', ' ') : '2026-08-25 10:30'}</strong></span>
                              {item.durationMinutes && <span>时长: {item.durationMinutes}分钟</span>}
                              {item.totalDuration && <span>总时长: {item.totalDuration}分钟</span>}
                            </div>
                          </div>

                        </div>

                        {/* Right Quick Operations */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          
                          {/* Director Approval Button */}
                          {isDirector && item.approvalStatus === 'pending' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setApprovalModalItem(item);
                              }}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-black flex items-center gap-1 shadow-xs transition-colors"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>审批</span>
                            </button>
                          )}

                          {/* Move to folder icon */}
                          <button
                            onClick={e => handleOpenSingleMove(item, e)}
                            title="移动到文件夹"
                            className="p-1.5 hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 rounded-lg transition-colors"
                          >
                            <FolderInput className="w-4 h-4" />
                          </button>

                          {/* Favorite toggle */}
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              onToggleFavorite(item.id);
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${
                              item.isFavorite ? 'text-red-500 hover:bg-red-50' : 'text-gray-300 hover:text-red-500 hover:bg-gray-100'
                            }`}
                          >
                            <Heart className={`w-4 h-4 ${item.isFavorite ? 'fill-current' : ''}`} />
                          </button>

                          {/* Edit / Lock */}
                          {canEditItem(item) ? (
                            <button
                              onClick={() => onEditItem(item)}
                              title="编辑"
                              className="p-1.5 hover:bg-gray-100 text-gray-500 hover:text-gray-900 rounded-lg transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span
                              title="青训总监标准内容，仅总监可编辑修改（教练员可在教案中自由选用）"
                              className="p-1.5 text-gray-300 cursor-not-allowed flex items-center justify-center"
                            >
                              <Lock className="w-4 h-4" />
                            </span>
                          )}

                          {/* Duplicate */}
                          <button
                            onClick={() => onDuplicateItem(item)}
                            title="复制"
                            className="p-1.5 hover:bg-gray-100 text-gray-500 hover:text-gray-900 rounded-lg transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          {canEditItem(item) && (
                            <button
                              onClick={() => onDeleteItem(item.id)}
                              title="删除"
                              className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* =================== GRID VIEW =================== */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {sortedItems.map(item => {
                    const isSessionPlan = item.category === 'session_plan' || item.contentType === 'session_plan';
                    const isDrill = item.category === 'drill_item' || item.contentType === 'drill';
                    const isSelected = selectedIds.includes(item.id);
                    const itemFolder = folders.find(f => f.id === item.folderId);

                    return (
                      <div
                        key={item.id}
                        className={`group bg-white rounded-3xl border-2 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col justify-between relative ${
                          isSelected
                            ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                            : 'border-gray-200 hover:border-emerald-500'
                        }`}
                      >
                        {/* Top Preview Canvas Card */}
                        <div
                          onClick={() => onViewDetail(item)}
                          className="w-full aspect-[16/10] bg-gray-950 relative overflow-hidden cursor-pointer flex items-center justify-center group-hover:opacity-95 transition-opacity"
                        >
                          {item.previewImage ? (
                            <img src={item.previewImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <PitchSvgRenderer
                              pitchType={item.pitchType || 'Midfield'}
                              pitchTheme={item.pitchTheme || 'Grass'}
                              className="w-full h-full"
                            />
                          )}

                          {/* Selection Checkbox */}
                          <div
                            onClick={(e) => handleToggleSelect(item.id, e)}
                            className={`absolute top-2.5 left-2.5 z-10 w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-md ${
                              isSelected
                                ? 'bg-emerald-600 text-white ring-2 ring-white'
                                : 'bg-black/40 hover:bg-black/70 text-white/70'
                            }`}
                            title={isSelected ? '取消勾选' : '勾选此项'}
                          >
                            {isSelected ? (
                              <Check className="w-4 h-4 stroke-[3]" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </div>

                          {/* Type Badge, Origin/Approval Badge & Folder Badge */}
                          <div className="absolute top-2.5 left-11 flex items-center gap-1.5 flex-wrap max-w-[calc(100%-80px)]">
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs whitespace-nowrap shrink-0 ${
                                isSessionPlan
                                  ? 'bg-yellow-400 text-gray-950'
                                  : isDrill
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-emerald-600 text-white'
                              }`}
                            >
                              {isSessionPlan ? '教案' : isDrill ? '训练项' : '示意图'}
                            </span>

                            {/* Horizontal and neat status badge (示意图不显示总监标准标识) */}
                            {isDirectorCreated(item) ? (
                              (isSessionPlan || isDrill) ? (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-yellow-400 text-gray-950 shadow-xs flex items-center gap-0.5 whitespace-nowrap shrink-0 border border-yellow-500/40">
                                  <ShieldCheck className="w-2.5 h-2.5 shrink-0" />
                                  <span>总监标准</span>
                                </span>
                              ) : null
                            ) : item.approvalStatus === 'pending' ? (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-xs flex items-center gap-0.5 whitespace-nowrap shrink-0">
                                <Clock className="w-2.5 h-2.5 shrink-0" />
                                <span>待审批</span>
                              </span>
                            ) : item.approvalStatus === 'rejected' ? (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-600 text-white shadow-xs flex items-center gap-0.5 whitespace-nowrap shrink-0" title={item.approvalFeedback || '已被退回修改'}>
                                <XCircle className="w-2.5 h-2.5 shrink-0" />
                                <span>已退回</span>
                              </span>
                            ) : null}

                            {itemFolder && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-black/60 text-yellow-300 backdrop-blur-xs flex items-center gap-1 whitespace-nowrap shrink-0">
                                <Folder className="w-2.5 h-2.5 shrink-0" />
                                <span className="max-w-[65px] truncate">{itemFolder.name}</span>
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
                                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 whitespace-nowrap">
                                  {item.topic}
                                </span>
                              )}
                              {item.durationMinutes && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 flex items-center gap-1 whitespace-nowrap">
                                  <Clock className="w-2.5 h-2.5 shrink-0" />
                                  <span>{item.durationMinutes}分</span>
                                </span>
                              )}
                              {item.totalDuration && (
                                <span className="px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-800 flex items-center gap-1 whitespace-nowrap">
                                  <Clock className="w-2.5 h-2.5 shrink-0" />
                                  <span>{item.totalDuration}分</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Card Footer Actions */}
                          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                            <span className="text-[10px] font-mono text-gray-400 whitespace-nowrap shrink-0">
                              {item.createdAt ? item.createdAt.slice(0, 10) : '2026-08-25'}
                            </span>

                            <div className="flex items-center gap-1 shrink-0">
                              {/* Director quick approve */}
                              {isDirector && item.approvalStatus === 'pending' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setApprovalModalItem(item);
                                  }}
                                  className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-white rounded text-[11px] font-black transition-colors whitespace-nowrap"
                                >
                                  审批
                                </button>
                              )}

                              <button
                                onClick={e => handleOpenSingleMove(item, e)}
                                title="移动到文件夹"
                                className="p-1 hover:bg-emerald-50 rounded text-gray-500 hover:text-emerald-600 transition-colors"
                              >
                                <FolderInput className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit or Lock */}
                              {canEditItem(item) ? (
                                <button
                                  onClick={() => onEditItem(item)}
                                  title="编辑"
                                  className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <span
                                  title="青训总监标准内容，仅总监可编辑修改（教练员可在教案中自由选用）"
                                  className="p-1 text-gray-300 cursor-not-allowed flex items-center justify-center"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                </span>
                              )}

                              <button
                                onClick={() => onDuplicateItem(item)}
                                title="复制"
                                className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              {canEditItem(item) && (
                                <button
                                  onClick={() => onDeleteItem(item.id)}
                                  title="删除"
                                  className="p-1 hover:bg-red-50 rounded text-red-500 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* Empty State */
              <div className="py-16 text-center">
                <div className="w-16 h-16 rounded-3xl bg-gray-100 flex items-center justify-center text-gray-400 mx-auto mb-3">
                  <Compass className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-black text-gray-900">当前分类暂无内容</h4>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  你可以通过顶部「创建内容」添加战术示意图、单项训练或整套教案，或将其他分类内容移入此处。
                </p>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* 4. Move To Folder Modal (Single & Multi Move Dialog) */}
      <MoveToFolderModal
        isOpen={isMoveModalOpen}
        itemsToMove={itemsToMove}
        folders={folders}
        allDesigns={designs}
        onClose={() => {
          setIsMoveModalOpen(false);
          setItemsToMove([]);
        }}
        onSelectFolder={handleApplyMoveToFolder}
        onCreateAndSelectFolder={handleCreateAndMoveToFolder}
      />

      {/* 5. Delete Folder Confirmation Modal */}
      {deletingFolder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100 p-6 space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-sm font-black text-gray-900">
                确定删除文件夹「{deletingFolder.name}」？
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                删除后，该文件夹包含的 <strong>{deletingFolder.count}</strong> 项示意图与教案将<strong>安全保留并自动移入「未分组内容」</strong>，不会丢失任何数据。
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setDeletingFolder(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-black rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmDeleteFolder}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl transition-colors shadow-md shadow-red-600/20"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Director Approval Modal */}
      {approvalModalItem && (
        <DirectorApprovalModal
          isOpen={!!approvalModalItem}
          item={approvalModalItem}
          currentUser={currentUser}
          onClose={() => setApprovalModalItem(null)}
          onApprove={(item, feedback) => {
            handleApproveContent(item, feedback);
            setApprovalModalItem(null);
          }}
          onReject={(item, feedback) => {
            handleRejectContent(item, feedback);
            setApprovalModalItem(null);
          }}
        />
      )}

    </div>
  );
};
