
import React from 'react';
import { LayoutDashboard, Calendar, Trophy, Settings, LogOut, Shirt, User, Cloud, Check, RefreshCw, PenTool, Wallet } from 'lucide-react';
import { User as UserType } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: UserType | null;
  onLogout: () => void;
  isSyncing?: boolean; // New prop for sync status
  hasNewAnnouncements?: boolean; // New prop for notifications
  appLogo?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, currentUser, onLogout, isSyncing = false, hasNewAnnouncements = false, appLogo }) => {
  const navItems = [
    { id: 'dashboard', label: '俱乐部概览', icon: LayoutDashboard },
    { id: 'players', label: '球队管理', icon: Shirt },
    { id: 'finance', label: '账务管理', icon: Wallet }, // New Item
    { id: 'design', label: '教案设计', icon: PenTool },
    { id: 'training', label: '训练计划', icon: Calendar },
    { id: 'matches', label: '比赛日程', icon: Trophy },
  ];

  const getMobileLabel = (label: string) => {
    if (label === '俱乐部概览') return '概览';
    if (label === '教案设计') return '教案';
    if (label === '账务管理') return '账务';
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

        {/* User Info Snippet */}
        {currentUser && (
            <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-bvb-yellow">
                     <User className="w-5 h-5" />
                 </div>
                 <div>
                     <p className="text-sm font-bold text-white truncate max-w-[120px]">{currentUser.name}</p>
                     <p className="text-[10px] text-gray-400 uppercase font-bold">
                         {currentUser.role === 'director' ? '青训总监' : '教练员'}
                     </p>
                 </div>
            </div>
        )}

        {/* Sync Status Indicator */}
        <div className="px-6 py-2 border-b border-gray-800">
             <div className="flex items-center text-xs text-gray-400">
                 {isSyncing ? (
                     <>
                        <RefreshCw className="w-3 h-3 mr-2 animate-spin text-bvb-yellow" />
                        <span className="text-bvb-yellow">正在同步到云端...</span>
                     </>
                 ) : (
                     <>
                        <Cloud className="w-3 h-3 mr-2" />
                        <span>数据已同步</span>
                        <Check className="w-3 h-3 ml-1 text-green-500" />
                     </>
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
              
              {/* Notification Badge for Dashboard */}
              {item.id === 'dashboard' && hasNewAnnouncements && (
                  <span className="absolute right-3 top-3 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-sm"></span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          {/* Settings: Visible for both Directors and Coaches (Coaches see limited options) */}
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

           <button 
            onClick={onLogout}
            className="w-full flex items-center p-3 text-red-400 hover:text-red-300 transition-colors hover:bg-red-900/20 rounded-lg"
           >
            <LogOut className="w-5 h-5 mr-3" />
            登出
          </button>
        </div>
      </aside>

      {/* Main Content & Mobile Elements */}
      <div className="flex-1 flex flex-col h-full w-full overflow-hidden relative">
        
        {/* Mobile Header (Brand Only) */}
        <header className="md:hidden bg-bvb-black text-white p-4 flex justify-between items-center shadow-md z-20 shrink-0 sticky top-0">
             <div className="flex items-center">
                <img src={appLogo} alt="Club Logo" className="w-8 h-8 object-contain mr-2" />
                <div className="flex flex-col">
                  <span className="font-bold text-bvb-yellow tracking-wider text-sm leading-tight">顽石之光</span>
                  <span className="text-[10px] text-gray-400 leading-tight">青训管理</span>
                </div>
             </div>
             <div className="flex items-center gap-3">
                 {/* Mobile Sync Icon */}
                 {isSyncing ? <RefreshCw className="w-4 h-4 text-bvb-yellow animate-spin" /> : <Cloud className="w-4 h-4 text-gray-500" />}
                 <button onClick={onLogout} className="text-gray-400 hover:text-white"><LogOut className="w-5 h-5"/></button>
             </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-8 pb-32 md:pb-8 scroll-smooth">
          <div className="max-w-7xl mx-auto h-full">
             {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation - Enhanced Glassmorphism */}
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
               {/* Settings now accessible on mobile for all */}
               <button
                  onClick={() => setActiveTab('settings')}
                  className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200 active:scale-95 ${
                    activeTab === 'settings' ? 'text-bvb-yellow' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <Settings className={`w-6 h-6 ${activeTab === 'settings' ? 'fill-current' : ''}`} strokeWidth={activeTab === 'settings' ? 2.5 : 2} />
                  <span className="text-[10px] font-bold scale-90 origin-center">设置</span>
                </button>
            </div>
            {/* Safe area spacer for iPhone Home Bar */}
            <div className="h-[env(safe-area-inset-bottom)] w-full"></div>
          </nav>

      </div>
    </div>
  );
};

export default Layout;
