
import React, { useState } from 'react';
import { User, Player } from '../types';
import { Shield, User as UserIcon, Lock, ChevronRight, LogIn } from 'lucide-react';

interface LoginProps {
  users: User[];
  players: Player[];
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ users, players, onLogin }) => {
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
    }, 500);
  };

  const handleParentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setParentError('');

    setTimeout(() => {
        // Simple logic: Find player by name and verify ID card last 6 digits
        const player = players.find(p => p.name === playerName);
        
        if (player) {
            if (player.idCard.endsWith(idCardLast6)) {
                // Create a temporary User object for the parent
                const parentUser: User = {
                    id: `parent-${player.id}`,
                    username: `parent_${player.id}`,
                    name: `${player.name}家长`,
                    role: 'parent',
                    playerId: player.id
                };
                onLogin(parentUser);
            } else {
                setParentError('身份证后6位验证失败');
            }
        } else {
            setParentError('未找到该球员信息');
        }
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-4xl flex flex-col md:flex-row min-h-[500px]">
        
        {/* Left: Branding & Info */}
        <div className="w-full md:w-1/2 bg-bvb-black text-white p-8 flex flex-col justify-between relative overflow-hidden">
           <div className="relative z-10">
               <div className="w-16 h-16 bg-bvb-yellow rounded-full flex items-center justify-center text-bvb-black font-black text-2xl border-4 border-white mb-6">WS</div>
               <h1 className="text-4xl font-black mb-2 text-bvb-yellow tracking-tighter">顽石之光</h1>
               <p className="text-xl font-bold opacity-80">足球俱乐部青训管理系统</p>
           </div>
           
           <div className="relative z-10 space-y-4">
               <p className="text-sm text-gray-400 leading-relaxed">
                   致力于培养下一代足球精英。结合先进的数据分析与科学的训练体系，为每一位小球员提供职业级的成长体验。
               </p>
               <div className="flex gap-2">
                   <div className="px-3 py-1 bg-gray-800 rounded text-xs text-bvb-yellow font-bold">专业训练</div>
                   <div className="px-3 py-1 bg-gray-800 rounded text-xs text-bvb-yellow font-bold">数据追踪</div>
                   <div className="px-3 py-1 bg-gray-800 rounded text-xs text-bvb-yellow font-bold">家校互联</div>
               </div>
           </div>

           {/* Decor */}
           <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-bvb-yellow opacity-10 rounded-full"></div>
           <div className="absolute top-10 right-10 w-20 h-20 bg-gray-800 opacity-20 rounded-full"></div>
        </div>

        {/* Right: Login Forms */}
        <div className="w-full md:w-1/2 p-8 flex flex-col">
            
            {/* Toggle Switch */}
            <div className="flex bg-gray-100 p-1 rounded-xl mb-8">
                <button 
                    onClick={() => setActivePortal('staff')}
                    className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${activePortal === 'staff' ? 'bg-white shadow-sm text-bvb-black' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    俱乐部成员端
                </button>
                <button 
                    onClick={() => setActivePortal('parent')}
                    className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${activePortal === 'parent' ? 'bg-white shadow-sm text-bvb-black' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    家长/球员端
                </button>
            </div>

            {/* Staff Form */}
            {activePortal === 'staff' && (
                <div className="flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-right-4 duration-300">
                    <h2 className="text-2xl font-black text-gray-800 mb-6 flex items-center">
                        <Shield className="w-6 h-6 mr-2 text-bvb-yellow fill-current" />
                        职员登录
                    </h2>
                    <form onSubmit={handleStaffLogin} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">用户名</label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input 
                                    className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-bvb-yellow transition-all text-sm font-bold"
                                    placeholder="请输入用户名"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">密码</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input 
                                    type="password"
                                    className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-bvb-yellow transition-all text-sm font-bold"
                                    placeholder="请输入密码"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>
                        </div>
                        
                        {staffError && <p className="text-red-500 text-xs font-bold">{staffError}</p>}

                        <button className="w-full bg-bvb-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center group mt-4">
                            登录系统 <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>
                    <div className="mt-6 text-center">
                        <p className="text-xs text-gray-400">测试账号: admin / 123 (总监), coach_u19 / 123</p>
                    </div>
                </div>
            )}

            {/* Parent Form */}
            {activePortal === 'parent' && (
                <div className="flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-right-4 duration-300">
                    <h2 className="text-2xl font-black text-gray-800 mb-6 flex items-center">
                        <UserIcon className="w-6 h-6 mr-2 text-bvb-yellow" />
                        家长/球员查询
                    </h2>
                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-xs text-yellow-800 mb-6">
                        为了保护隐私，请验证球员姓名与身份证件号码。
                    </div>
                    <form onSubmit={handleParentLogin} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">球员姓名</label>
                            <input 
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-bvb-yellow transition-all text-sm font-bold"
                                placeholder="例如: 张三"
                                value={playerName}
                                onChange={e => setPlayerName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">身份证号 (后6位)</label>
                            <input 
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-bvb-yellow transition-all text-sm font-bold tracking-widest"
                                placeholder="●●●●●●"
                                maxLength={6}
                                value={idCardLast6}
                                onChange={e => setIdCardLast6(e.target.value)}
                            />
                        </div>

                        {parentError && <p className="text-red-500 text-xs font-bold">{parentError}</p>}

                        <button className="w-full bg-bvb-yellow text-bvb-black font-bold py-3 rounded-lg hover:brightness-105 transition-colors flex items-center justify-center group mt-4">
                            查询档案 <LogIn className="w-4 h-4 ml-1" />
                        </button>
                    </form>
                    <div className="mt-6 text-center">
                         <p className="text-xs text-gray-400">测试: 马尔科·罗伊斯 (Jr) / 011234</p>
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

export default Login;
