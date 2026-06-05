
import React from 'react';
import { LayoutDashboard, Calendar, Trophy, Settings, LogOut, Shirt, User, Cloud, Check, RefreshCw, PenTool, Wallet, TrendingUp, X, BookOpen } from 'lucide-react';
import { User as UserType, RolePermissions, ModuleId } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openedTabs: string[];
  onCloseTab: (tab: string) => void;
  currentUser: UserType | null;
  onLogout: () => void;
  isSyncing?: boolean;
  hasUnsavedChanges?: boolean;
  lastSavedTime?: string | null;
  onManualSave?: () => void;
  hasNewAnnouncements?: boolean;
  appLogo?: string;
  permissions: RolePermissions;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeTab, 
  setActiveTab, 
  openedTabs, 
  onCloseTab, 
  currentUser, 
  onLogout, 
  isSyncing = false, 
  hasUnsavedChanges = false,
  lastSavedTime = null,
  onManualSave,
  hasNewAnnouncements = false, 
  appLogo, 
  permissions 
}) => {
  
  const hasViewPermission = (moduleId: ModuleId) => {
      if (!currentUser) return false;
      const level = permissions[currentUser.role]?.[moduleId];
      return level === 'view' || level === 'edit';
  };

  const navItems = [
    { id: 'dashboard', label: '俱乐部概览', icon: LayoutDashboard },
    { id: 'philosophy', label: '体系库', icon: BookOpen },
    { id: 'players', label: '球员管理', icon: Shirt },
    { id: 'growth', label: '球员成长', icon: TrendingUp },
    { id: 'finance', label: '账务管理', icon: Wallet },
    { id: 'design', label: '教案设计', icon: PenTool },
    { id: 'training', label: '训练计划', icon: Calendar },
    { id: 'matches', label: '比赛日程', icon: Trophy },
  ].filter(item => hasViewPermission(item.id as ModuleId));

  const allModulesMap = [
    ...navItems,
    { id: 'settings', label: '系统设置', icon: Settings }
  ].reduce((acc, item) => ({ ...acc, [item.id]: item }), {} as Record<string, any>);

  const getMobileLabel = (label: string) => {
    if (label === '俱乐部概览') return '概览';
    if (label === '体系库') return '体系';
    if (label === '教案设计') return '教案';
    if (label === '账务管理') return '账务';
    if (label === '球员成长') return '成长';
    return label.substring(0, 2);
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-bvb-black text-white h-full shadow-xl z-20">
        <div className="p-6 flex items-center justify-center border-b border-gray-800">
          <img src={appLogo} alt="Club Logo" className="w-16 h-16 object-contain mr-3" />
          <div>
            <h1 className="text-xl font-bold text-bvb-yellow tracking-tighter">顽石之光</h1>
            <p className="text-xs text-gray-400">青训管理系统</p>
          </div>
        </div>

        {currentUser && (
            <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-bvb-yellow">
                     <User className="w-5 h-5" />
                 </div>
                 <div>
                     <p className="text-sm font-bold text-white truncate max-w-[120px]">{currentUser.name}</p>
                     <p className="text-[10px] text-gray-400 uppercase font-bold">
                         {currentUser.role === 'director' ? '青训总监' : currentUser.role === 'coach' ? '教练员' : currentUser.role === 'assistant_coach' ? '助教' : '家长'}
                     </p>
                 </div>
            </div>
        )}

                <div className="px-6 py-3 border-b border-gray-800 space-y-2">
             <div className="flex flex-col gap-1.5">
                 <div className="flex items-center text-xs justify-between">
                     {isSyncing ? (
                          <div className="flex items-center text-bvb-yellow">
                             <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                             <span className="font-semibold text-bvb-yellow">云端正在同步...</span>
                          </div>
                      ) : hasUnsavedChanges ? (
                          <div className="flex items-center text-yellow-500">
                             <Cloud className="w-3.5 h-3.5 mr-1.5 animate-pulse" />
                             <span className="font-semibold text-yellow-500">有未同步的修改</span>
                          </div>
                      ) : (
                          <div className="flex items-center text-green-400">
                             <Cloud className="w-3.5 h-3.5 mr-1.5" />
                             <span className="font-semibold text-green-400">云端已同步</span>
                             <Check className="w-3 h-3 ml-1 text-green-400" />
                          </div>
                      )}
                      
                      {!isSyncing && hasUnsavedChanges && onManualSave && (
                          <button 
                              onClick={onManualSave}
                              className="text-[10px] bg-bvb-yellow text-bvb-black px-2 py-0.5 rounded font-black hover:brightness-110 active:scale-95 transition-all shadow-md animate-bounce"
                              title="点击立即上传保存数据"
                          >
                              立即同步
                          </button>
                      )}
                 </div>
                 
                 {lastSavedTime && (
                     <div className="text-[10px] text-gray-500 flex justify-between items-center bg-gray-900/40 px-2 py-0.5 rounded border border-gray-800/40 font-mono">
                         <span>上次同步</span>
                         <span className="font-semibold text-gray-400">{lastSavedTime}</span>
                     </div>
                 )}
             </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 relative ${
                activeTab === item.id
                  ? 'bg-bvb-yellow text-bvb-black font-bold shadow-lg transform scale-105'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
              {item.id === 'dashboard' && hasNewAnnouncements && (
                  <span className="absolute right-3 top-3 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-sm"></span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          {hasViewPermission('settings') && (
            <button 
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center p-3 rounded-lg transition-colors mb-2 ${
                activeTab === 'settings' 
                ? 'bg-gray-800 text-bvb-yellow font-bold' 
                : 'text-gray-400 hover:text-white'
                }`}
            >
                <Settings className="w-5 h-5 mr-3" />
                设置
            </button>
          )}

           <button 
            onClick={onLogout}
            className="w-full flex items-center p-3 text-red-400 hover:text-red-300 transition-colors hover:bg-red-900/20 rounded-lg"
           >
            <LogOut className="w-5 h-5 mr-3" />
            登出
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full w-full overflow-hidden relative">
                <header className="md:hidden bg-bvb-black text-white p-4 flex justify-between items-center shadow-md z-20 shrink-0 sticky top-0">
             <div className="flex items-center">
                 <img src={appLogo} alt="Club Logo" className="w-8 h-8 object-contain mr-2" />
                 <div className="flex flex-col">
                   <span className="font-bold text-bvb-yellow tracking-wider text-sm leading-tight">顽石之光</span>
                   <span className="text-[10px] text-gray-400 leading-tight">青训管理</span>
                 </div>
             </div>
             <div className="flex items-center gap-3">
                  {isSyncing ? (
                      <RefreshCw className="w-4 h-4 text-bvb-yellow animate-spin" />
                  ) : (
                      <button 
                        onClick={onManualSave} 
                        title={hasUnsavedChanges ? "有未同步修改，点击手动同步" : `云端数据已同步 (上次保存: ${lastSavedTime || '未知'})`}
                        className="relative p-1 rounded hover:bg-gray-800 transition-colors flex items-center"
                      >
                        <Cloud className={`w-4 h-4 ${hasUnsavedChanges ? 'text-yellow-500 animate-pulse' : 'text-green-400'}`} />
                        {hasUnsavedChanges && (
                          <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                        )}
                      </button>
                  )}
                  <button onClick={onLogout} className="text-gray-400 hover:text-white"><LogOut className="w-5 h-5"/></button>
             </div>
        </header>

        {/* Tab Bar - Desktop */}
        <div className="hidden md:flex bg-white border-b border-gray-200 shrink-0 overflow-x-auto no-scrollbar items-end h-12 px-4 gap-1">
          {openedTabs.map(tabId => {
            const module = allModulesMap[tabId];
            if (!module) return null;
            const IsActive = activeTab === tabId;
            return (
              <div 
                key={tabId}
                onClick={() => setActiveTab(tabId)}
                className={`group relative flex items-center h-10 min-w-[120px] max-w-[200px] px-4 rounded-t-xl cursor-pointer transition-all border-t border-x ${
                  IsActive 
                  ? 'bg-gray-50 border-gray-200 text-bvb-black font-bold' 
                  : 'bg-gray-100/50 border-transparent text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                }`}
              >
                <module.icon className={`w-3.5 h-3.5 mr-2 ${IsActive ? 'text-bvb-yellow' : 'text-gray-400'}`} />
                <span className="text-xs truncate">{module.label}</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); onCloseTab(tabId); }}
                  className={`ml-2 p-0.5 rounded-full hover:bg-gray-200 transition-colors ${IsActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                >
                  <X className="w-3 h-3" />
                </button>
                {IsActive && <div className="absolute top-0 left-0 right-0 h-0.5 bg-bvb-yellow rounded-full"></div>}
              </div>
            );
          })}
        </div>

        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-8 pb-32 md:pb-8 scroll-smooth">
          <div className="max-w-[95%] xl:max-w-[1600px] mx-auto h-full">
             {children}
          </div>
        </main>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-bvb-black/90 backdrop-blur-md border-t border-gray-800 z-30 pb-safe transition-all duration-300">
            <div className={`flex justify-around items-center h-16 px-1`}>
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200 active:scale-95 relative ${
                    activeTab === item.id ? 'text-bvb-yellow' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <div className="relative">
                      <item.icon className={`w-6 h-6 ${activeTab === item.id ? 'fill-current' : ''}`} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                      {item.id === 'dashboard' && hasNewAnnouncements && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-bvb-black"></span>
                      )}
                  </div>
                  <span className="text-[10px] font-bold scale-90 origin-center">{getMobileLabel(item.label)}</span>
                </button>
              ))}
               {hasViewPermission('settings') && (
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200 active:scale-95 ${
                        activeTab === 'settings' ? 'text-bvb-yellow' : 'text-gray-500 hover:text-gray-300'
                    }`}
                    >
                    <Settings className={`w-6 h-6 ${activeTab === 'settings' ? 'fill-current' : ''}`} strokeWidth={activeTab === 'settings' ? 2.5 : 2} />
                    <span className="text-[10px] font-bold scale-90 origin-center">设置</span>
                </button>
               )}
            </div>
            <div className="h-[env(safe-area-inset-bottom)] w-full"></div>
          </nav>
      </div>
    </div>
  );
};

export default Layout;
