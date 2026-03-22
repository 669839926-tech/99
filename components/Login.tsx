
import React, { useState } from 'react';
import { User, Player } from '../types';
import { Shield, User as UserIcon, Lock, ChevronRight, LogIn } from 'lucide-react';

interface LoginProps {
  users: User[];
  players: Player[];
  onLogin: (user: User) => void;
  appLogo?: string;
}

const Login: React.FC<LoginProps> = ({ users, players, onLogin, appLogo }) => {
  const [activePortal, setActivePortal] = useState<'staff' | 'parent'>('staff');
  
  // Staff Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [staffError, setStaffError] = useState('');

  // Parent Login State
  const [playerName, setPlayerName] = useState('');
  const [idCardLast6, setIdCardLast6] = useState('');
  const [parentError, setParentError] = useState('');

  const handleStaffLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError('');
    
    // Simulate API call delay
    setTimeout(() => {
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
            onLogin(user);
        } else {
            setStaffError('用户名或密码错误');
        }
    }, 300);
  };

  const handleParentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setParentError('');

    setTimeout(() => {
        const player = players.find(p => p.name === playerName);
        
        if (player) {
            if (player.idCard.endsWith(idCardLast6)) {
                const parentUser: User = {
                    id: `parent-${player.id}`,
                    username: `parent_${player.id}`,
                    name: `${player.name}家长`,
                    role: 'parent',
                    playerId: player.id
                };
                onLogin(parentUser);
            } else {
                setParentError('验证失败：请检查身份证后6位');
            }
        } else {
            setParentError('未找到该球员信息');
        }
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-0 md:p-4">
      <div className="bg-white w-full md:rounded-3xl shadow-2xl overflow-hidden md:max-w-4xl flex flex-col md:flex-row min-h-screen md:min-h-[550px]">
        
        {/* Left: Branding & Info */}
        <div className="w-full md:w-5/12 bg-bvb-black text-white p-6 md:p-10 flex flex-col justify-between relative overflow-hidden shrink-0">
           <div className="relative z-10">
               <img src={appLogo} alt="Club Logo" className="w-16 h-16 md:w-24 md:h-24 object-contain mb-4 md:mb-6" />
               <h1 className="text-2xl md:text-4xl font-black mb-1 md:mb-2 text-bvb-yellow uppercase tracking-tighter italic">顽石之光</h1>
               <p className="text-sm md:text-xl font-bold opacity-80 uppercase tracking-widest">WSZG Football Club</p>
           </div>
           
           <div className="relative z-10 mt-6 md:mt-0 space-y-4">
               <p className="hidden md:block text-sm text-gray-400 leading-relaxed font-medium">
                   致力于培养下一代足球精英。结合先进的数据分析与科学的训练体系，为每一位小球员提供职业级的成长体验。
               </p>
               <div className="flex flex-wrap gap-2">
                   <div className="px-2.5 py-1 bg-white/10 rounded-full text-[10px] md:text-xs text-bvb-yellow font-black uppercase tracking-tighter border border-white/5">Professional</div>
                   <div className="px-2.5 py-1 bg-white/10 rounded-full text-[10px] md:text-xs text-bvb-yellow font-black uppercase tracking-tighter border border-white/5">Analytics</div>
                   <div className="px-2.5 py-1 bg-white/10 rounded-full text-[10px] md:text-xs text-bvb-yellow font-black uppercase tracking-tighter border border-white/5">Growth</div>
               </div>
           </div>

           {/* Decor - Hidden on mobile for cleaner look */}
           <div className="hidden md:block absolute -bottom-20 -right-20 w-64 h-64 bg-bvb-yellow opacity-10 rounded-full blur-3xl"></div>
           <div className="hidden md:block absolute top-10 right-10 w-20 h-20 bg-gray-800 opacity-20 rounded-full"></div>
        </div>

        {/* Right: Login Forms */}
        <div className="w-full md:w-7/12 p-6 md:p-10 flex flex-col bg-white">
            
            {/* Toggle Switch */}
            <div className="flex bg-gray-100 p-1.5 rounded-2xl mb-8 shadow-inner">
                <button 
                    onClick={() => setActivePortal('staff')}
                    className={`flex-1 py-2.5 md:py-3 rounded-xl text-[12px] md:text-sm font-black transition-all uppercase tracking-widest ${activePortal === 'staff' ? 'bg-white shadow-md text-bvb-black scale-[1.02]' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    俱乐部成员
                </button>
                <button 
                    onClick={() => setActivePortal('parent')}
                    className={`flex-1 py-2.5 md:py-3 rounded-xl text-[12px] md:text-sm font-black transition-all uppercase tracking-widest ${activePortal === 'parent' ? 'bg-white shadow-md text-bvb-black scale-[1.02]' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    家长/球员
                </button>
            </div>

            {/* Staff Form */}
            {activePortal === 'staff' && (
                <div className="flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="mb-8">
                        <h2 className="text-xl md:text-2xl font-black text-gray-800 flex items-center italic uppercase tracking-tighter">
                            <Shield className="w-5 h-5 md:w-6 md:h-6 mr-2 text-bvb-yellow" />
                            职员登录中心
                        </h2>
                        <div className="h-1.5 w-12 bg-bvb-yellow mt-2 rounded-full"></div>
                    </div>
                    
                    <form onSubmit={handleStaffLogin} className="space-y-4 md:space-y-5">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Account ID</label>
                            <div className="relative">
                                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input 
                                    className="w-full pl-11 pr-4 py-3.5 md:py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-bvb-yellow transition-all text-sm font-bold text-gray-800 shadow-inner"
                                    placeholder="请输入用户名"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    autoComplete="username"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input 
                                    type="password"
                                    className="w-full pl-11 pr-4 py-3.5 md:py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-bvb-yellow transition-all text-sm font-bold text-gray-800 shadow-inner"
                                    placeholder="请输入登录密码"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                />
                            </div>
                        </div>
                        
                        {staffError && (
                            <div className="flex items-center gap-2 text-red-500 text-[11px] font-bold bg-red-50 p-3 rounded-xl border border-red-100 animate-pulse">
                                <Shield className="w-3.5 h-3.5" />
                                {staffError}
                            </div>
                        )}

                        <button className="w-full bg-bvb-black text-white font-black py-4 md:py-4.5 rounded-2xl hover:bg-gray-800 transition-all flex items-center justify-center group mt-6 shadow-xl active:scale-95 uppercase italic tracking-widest">
                            进入系统 <ChevronRight className="w-5 h-5 ml-1.5 group-hover:translate-x-1 transition-transform text-bvb-yellow" />
                        </button>
                    </form>
                    
                    <div className="mt-8 pt-6 border-t border-gray-50 flex items-center justify-center">
                        <div className="bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
                             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Test account: <span className="text-gray-800 font-black">admin</span> / <span className="text-gray-800 font-black">123</span></p>
                        </div>
                    </div>
                </div>
            )}

            {/* Parent Form */}
            {activePortal === 'parent' && (
                <div className="flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="mb-6">
                        <h2 className="text-xl md:text-2xl font-black text-gray-800 flex items-center italic uppercase tracking-tighter">
                            <UserIcon className="w-5 h-5 md:w-6 md:h-6 mr-2 text-bvb-yellow" />
                            家长查询中心
                        </h2>
                        <div className="h-1.5 w-12 bg-bvb-yellow mt-2 rounded-full"></div>
                    </div>

                    <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl mb-6">
                        <div className="flex items-start gap-3">
                            <div className="p-1.5 bg-white rounded-lg shadow-sm shrink-0">
                                <Shield className="w-4 h-4 text-indigo-600" />
                            </div>
                            <p className="text-[11px] md:text-xs text-indigo-800 font-bold leading-relaxed">
                                为了保障球员隐私，请通过姓名与身份证件核验。档案查询仅限俱乐部已录入的人员。
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleParentLogin} className="space-y-4 md:space-y-5">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Player Name</label>
                            <input 
                                className="w-full px-5 py-3.5 md:py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-bvb-yellow transition-all text-sm font-bold text-gray-800 shadow-inner"
                                placeholder="输入球员姓名"
                                value={playerName}
                                onChange={e => setPlayerName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Identity Code (Last 6)</label>
                            <input 
                                className="w-full px-5 py-3.5 md:py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-bvb-yellow transition-all text-sm font-black text-gray-800 tracking-[0.4em] shadow-inner"
                                placeholder="身份证后6位"
                                maxLength={6}
                                value={idCardLast6}
                                onChange={e => setIdCardLast6(e.target.value)}
                            />
                        </div>

                        {parentError && (
                             <div className="flex items-center gap-2 text-red-500 text-[11px] font-bold bg-red-50 p-3 rounded-xl border border-red-100 animate-pulse">
                                <Shield className="w-3.5 h-3.5" />
                                {parentError}
                            </div>
                        )}

                        <button className="w-full bg-bvb-yellow text-bvb-black font-black py-4 md:py-4.5 rounded-2xl hover:brightness-105 transition-all flex items-center justify-center group mt-6 shadow-xl active:scale-95 uppercase italic tracking-widest">
                            开启成长档案 <LogIn className="w-5 h-5 ml-1.5" />
                        </button>
                    </form>
                    
                    <div className="mt-8 pt-6 border-t border-gray-50 flex flex-col items-center gap-2">
                         <div className="bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
                             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Test: <span className="text-gray-800 font-black">马尔科·罗伊斯 (Jr)</span> / <span className="text-gray-800 font-black">011234</span></p>
                        </div>
                        <p className="text-[9px] text-gray-300 font-bold">顽石之光足球俱乐部 • 数字化青训系统</p>
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

export default Login;
