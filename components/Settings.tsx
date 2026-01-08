
import React, { useState } from 'react';
import { AttributeConfig, AttributeCategory, User, Team, RolePermissions, ModuleId, PermissionLevel, UserRole, FinanceCategoryDefinition, SalarySettings, CoachLevel } from '../types';
import { Settings as SettingsIcon, Plus, Trash2, Save, Book, Activity, Brain, Dumbbell, Target, CheckSquare, Users, RotateCcw, Lock, KeyRound, Image as ImageIcon, Upload, CheckCircle, Edit2, X, ShieldAlert, Eye, EyeOff, Wallet, ArrowUpRight, ArrowDownRight, Zap, TrendingUp, Calculator, ShieldCheck, Star, Shirt, Square } from 'lucide-react';

interface SettingsProps {
  attributeConfig: AttributeConfig;
  onUpdateConfig: (newConfig: AttributeConfig) => void;
  currentUser: User | null;
  users: User[];
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onResetUserPassword: (userId: string) => void;
  onUpdateUserPassword: (userId: string, newPass: string) => void;
  appLogo?: string;
  onUpdateAppLogo?: (newLogo: string) => void;
  teams?: Team[];
  permissions: RolePermissions;
  onUpdatePermissions: (perms: RolePermissions) => void;
  financeCategories: FinanceCategoryDefinition[];
  onUpdateFinanceCategories: (cats: FinanceCategoryDefinition[]) => void;
  salarySettings: SalarySettings;
  onUpdateSalarySettings: (settings: SalarySettings) => void;
}

const MODULES: { id: ModuleId; label: string }[] = [
    { id: 'dashboard', label: '俱乐部概览' },
    { id: 'players', label: '球队管理' },
    { id: 'growth', label: '球员成长' },
    { id: 'finance', label: '账务管理' },
    { id: 'design', label: '教案设计' },
    { id: 'training', label: '训练计划' },
    { id: 'matches', label: '比赛日程' },
    { id: 'settings', label: '系统设置' },
];

const ROLES: { id: UserRole; label: string }[] = [
    { id: 'director', label: '青训总监 (Director)' },
    { id: 'coach', label: '教练员 (Coach)' },
    { id: 'assistant_coach', label: '助教 (Assistant Coach)' },
    { id: 'parent', label: '家长 (Parent)' },
];

const COACH_LEVELS: { id: CoachLevel; label: string }[] = [
    { id: 'Junior', label: '初级 (Junior)' },
    { id: 'Intermediate', label: '中级 (Intermediate)' },
    { id: 'Senior', label: '高级 (Senior)' },
];

const Settings: React.FC<SettingsProps> = ({ 
    attributeConfig, onUpdateConfig, currentUser, users,
    onAddUser, onUpdateUser, onDeleteUser, onResetUserPassword, onUpdateUserPassword,
    appLogo, onUpdateAppLogo, teams = [], permissions, onUpdatePermissions,
    financeCategories, onUpdateFinanceCategories,
    salarySettings, onUpdateSalarySettings
}) => {
  const isDirector = currentUser?.role === 'director';

  const [localConfig, setLocalConfig] = useState<AttributeConfig>(JSON.parse(JSON.stringify(attributeConfig)));
  const [localPermissions, setLocalPermissions] = useState<RolePermissions>(JSON.parse(JSON.stringify(permissions)));
  const [localFinanceCategories, setLocalFinanceCategories] = useState<FinanceCategoryDefinition[]>(JSON.parse(JSON.stringify(financeCategories)));
  const [localSalarySettings, setLocalSalarySettings] = useState<SalarySettings>(JSON.parse(JSON.stringify(salarySettings)));
  
  const [activeTab, setActiveTab] = useState<'account' | 'permissions' | 'users' | 'salary' | 'finance_cats' | 'attributes' | 'drills' | 'foci' | 'branding'>('account');
  const [activeCategory, setActiveCategory] = useState<AttributeCategory>('technical');
  const [newItemName, setNewItemName] = useState('');

  const [newUser, setNewUser] = useState<Partial<User>>({ username: '', name: '', role: 'coach', teamIds: [], level: 'Junior' });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });

  const categoryLabels: Record<AttributeCategory, string> = {
    technical: '技术能力',
    tactical: '战术能力',
    physical: '身体素质',
    mental: '心理素质'
  };

  const handleUpdatePermission = (role: UserRole, module: ModuleId, level: PermissionLevel) => {
      if (role === 'director' && module === 'settings' && level !== 'edit') {
          alert('总监角色必须拥有系统设置的编辑权限。');
          return;
      }
      const next = { ...localPermissions };
      next[role][module] = level;
      setLocalPermissions(next);
  };

  const handleSavePermissions = () => {
      onUpdatePermissions(localPermissions);
      alert('角色权限配置已保存！');
  };

  const handleSaveSalarySettings = () => {
      onUpdateSalarySettings(localSalarySettings);
      alert('薪酬计算规则已更新！');
  };

  const handleAddAttribute = () => {
    if (!newItemName.trim()) return;
    const key = newItemName.trim().toLowerCase().replace(/\s+/g, '_') + '_' + Date.now().toString().slice(-4);
    setLocalConfig(prev => ({
      ...prev,
      [activeCategory]: [ ...prev[activeCategory], { key, label: newItemName.trim() } ]
    }));
    setNewItemName('');
  };

  const handleAddDrill = () => {
      if (!newItemName.trim()) return;
      setLocalConfig(prev => ({ ...prev, drillLibrary: [...(prev.drillLibrary || []), newItemName.trim()] }));
      setNewItemName('');
  };

  const handleAddFocus = () => {
      if (!newItemName.trim()) return;
      setLocalConfig(prev => ({ ...prev, trainingFoci: [...(prev.trainingFoci || []), newItemName.trim()] }));
      setNewItemName('');
  };

  const handleAddFinanceCategory = (type: 'income' | 'expense') => {
      if (!newItemName.trim()) return;
      const newCat: FinanceCategoryDefinition = {
          id: `cat-${Date.now()}`,
          label: newItemName.trim(),
          type
      };
      const updated = [...localFinanceCategories, newCat];
      setLocalFinanceCategories(updated);
      onUpdateFinanceCategories(updated);
      setNewItemName('');
  };

  const handleDeleteFinanceCategory = (id: string) => {
      if (confirm('确定要删除这个财务分类吗？删除后已录入的历史账目将显示为“未知分类”。')) {
          const updated = localFinanceCategories.filter(c => c.id !== id);
          setLocalFinanceCategories(updated);
          onUpdateFinanceCategories(updated);
      }
  };

  const handleUserFormSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(newUser.username && newUser.name) {
          if (editingUserId) {
             const existingUser = users.find(u => u.id === editingUserId);
             if (existingUser) {
                 onUpdateUser({ ...existingUser, ...newUser } as User);
                 alert('用户信息已更新');
             }
          } else {
              const user: User = { ...newUser, id: `u-${Date.now()}`, password: '123' } as User;
              onAddUser(user);
              alert(`用户 ${user.name} 已创建，默认密码为 123`);
          }
          setNewUser({ username: '', name: '', role: 'coach', teamIds: [], level: 'Junior' });
          setEditingUserId(null);
      }
  };

  const toggleTeamSelection = (teamId: string) => {
      setNewUser(prev => {
          const currentIds = prev.teamIds || [];
          if (currentIds.includes(teamId)) return { ...prev, teamIds: currentIds.filter(id => id !== teamId) };
          else return { ...prev, teamIds: [...currentIds, teamId] };
      });
  };

  const startEditUser = (user: User) => {
      setEditingUserId(user.id);
      setNewUser({ username: user.username, name: user.name, role: user.role, teamIds: user.teamIds || [], level: user.level || 'Junior' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditUser = () => {
      setEditingUserId(null);
      setNewUser({ username: '', name: '', role: 'coach', teamIds: [], level: 'Junior' });
  };

  const handleDeleteUserClick = (id: string) => {
      if(confirm('确定要删除该用户吗？')) {
          onDeleteUser(id);
          if (editingUserId === id) cancelEditUser();
      }
  };

  const handleResetPasswordClick = (id: string) => {
      if (confirm('确定要重置该用户的密码吗？重置后密码将恢复为默认值 "123"。')) {
          onResetUserPassword(id);
          alert('密码已重置为 123');
      }
  };

  const handleDeleteAttribute = (category: AttributeCategory, keyToDelete: string) => {
    if (confirm('确定要删除这个能力项吗？')) {
      setLocalConfig(prev => ({ ...prev, [category]: prev[category].filter(attr => attr.key !== keyToDelete) }));
    }
  };

  const handleDeleteDrill = (drill: string) => {
      if(confirm('确定要从库中删除此训练内容吗？')) {
          setLocalConfig(prev => ({ ...prev, drillLibrary: prev.drillLibrary.filter(d => d !== drill) }));
      }
  };

  const handleDeleteFocus = (focus: string) => {
    if(confirm('确定要删除此训练重点吗？删除后历史训练记录仍会保留该重点名称，但新建计划时不可选。')) {
        setLocalConfig(prev => ({ ...prev, trainingFoci: (prev.trainingFoci || []).filter(f => f !== focus) }));
    }
  };

  const handleChangeOwnPassword = (e: React.FormEvent) => {
      e.preventDefault();
      if (passwordForm.new !== passwordForm.confirm) { alert('两次输入的新密码不一致'); return; }
      if (passwordForm.new.length < 3) { alert('密码长度至少需要3位'); return; }
      if (currentUser && currentUser.password !== passwordForm.current) { alert('当前密码输入错误'); return; }
      if (currentUser) {
          onUpdateUserPassword(currentUser.id, passwordForm.new);
          alert('密码修改成功');
          setPasswordForm({ current: '', new: '', confirm: '' });
      }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onUpdateAppLogo) {
          const reader = new FileReader();
          reader.onloadend = () => onUpdateAppLogo(reader.result as string);
          reader.readAsDataURL(file);
      }
  };

  const handleSaveConfig = () => {
    onUpdateConfig(localConfig);
    alert('配置设置已保存！');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-3xl font-black text-bvb-black uppercase">系统设置</h2>
           <p className="text-gray-500">
               {isDirector ? '自定义评价体系、角色权限及系统配置。' : '管理您的个人账户安全。'}
           </p>
        </div>
        {isDirector && (activeTab === 'attributes' || activeTab === 'drills' || activeTab === 'foci') && (
            <button onClick={handleSaveConfig} className="flex items-center px-6 py-2 bg-bvb-yellow text-bvb-black font-bold rounded-lg shadow-md hover:brightness-105 transition-colors">
                <Save className="w-5 h-5 mr-2" /> 保存配置更改
            </button>
        )}
        {isDirector && activeTab === 'permissions' && (
            <button onClick={handleSavePermissions} className="flex items-center px-6 py-2 bg-bvb-black text-bvb-yellow font-bold rounded-lg shadow-md hover:brightness-110 transition-colors">
                <ShieldAlert className="w-5 h-5 mr-2" /> 保存权限设置
            </button>
        )}
        {isDirector && activeTab === 'salary' && (
            <button onClick={handleSaveSalarySettings} className="flex items-center px-6 py-2 bg-bvb-black text-bvb-yellow font-bold rounded-lg shadow-md hover:brightness-110 transition-colors">
                <Calculator className="w-5 h-5 mr-2" /> 保存薪酬规则
            </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 overflow-x-auto">
          <button onClick={() => setActiveTab('account')} className={`px-4 py-2 font-bold text-sm flex items-center border-b-2 transition-colors whitespace-nowrap ${activeTab === 'account' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-500'}`}><Lock className="w-4 h-4 mr-2" /> 个人安全</button>
          {isDirector && (
              <>
                <button onClick={() => setActiveTab('permissions')} className={`px-4 py-2 font-bold text-sm flex items-center border-b-2 transition-colors whitespace-nowrap ${activeTab === 'permissions' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-500'}`}><ShieldAlert className="w-4 h-4 mr-2" /> 角色权限设置</button>
                <button onClick={() => setActiveTab('users')} className={`px-4 py-2 font-bold text-sm flex items-center border-b-2 transition-colors whitespace-nowrap ${activeTab === 'users' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-500'}`}><Users className="w-4 h-4 mr-2" /> 用户账号管理</button>
                <button onClick={() => setActiveTab('salary')} className={`px-4 py-2 font-bold text-sm flex items-center border-b-2 transition-colors whitespace-nowrap ${activeTab === 'salary' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-500'}`}><Calculator className="w-4 h-4 mr-2" /> 薪酬规则配置</button>
                <button onClick={() => setActiveTab('finance_cats')} className={`px-4 py-2 font-bold text-sm flex items-center border-b-2 transition-colors whitespace-nowrap ${activeTab === 'finance_cats' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-500'}`}><Wallet className="w-4 h-4 mr-2" /> 财务科目管理</button>
                <button onClick={() => setActiveTab('foci')} className={`px-4 py-2 font-bold text-sm flex items-center border-b-2 transition-colors whitespace-nowrap ${activeTab === 'foci' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-500'}`}><Zap className="w-4 h-4 mr-2" /> 训练重点预设</button>
                <button onClick={() => setActiveTab('attributes')} className={`px-4 py-2 font-bold text-sm flex items-center border-b-2 transition-colors whitespace-nowrap ${activeTab === 'attributes' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-500'}`}><Target className="w-4 h-4 mr-2" /> 球员能力模型</button>
                <button onClick={() => setActiveTab('drills')} className={`px-4 py-2 font-bold text-sm flex items-center border-b-2 transition-colors whitespace-nowrap ${activeTab === 'drills' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-500'}`}><Book className="w-4 h-4 mr-2" /> 训练内容库</button>
                <button onClick={() => setActiveTab('branding')} className={`px-4 py-2 font-bold text-sm flex items-center border-b-2 transition-colors whitespace-nowrap ${activeTab === 'branding' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-500'}`}><ImageIcon className="w-4 h-4 mr-2" /> 品牌外观</button>
              </>
          )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-[500px]">
        
        {activeTab === 'account' && (
            <div className="flex-1 p-6 flex flex-col items-center justify-center">
                <div className="w-full max-md bg-gray-50 p-8 rounded-xl border border-gray-200">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center"><KeyRound className="w-5 h-5 mr-2 text-bvb-yellow" /> 修改登录密码</h3>
                    <form onSubmit={handleChangeOwnPassword} className="space-y-4">
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">当前密码</label><input type="password" required className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bvb-yellow" value={passwordForm.current} onChange={e => setPasswordForm({...passwordForm, current: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">新密码</label><input type="password" required minLength={3} className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bvb-yellow" value={passwordForm.new} onChange={e => setPasswordForm({...passwordForm, new: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">确认新密码</label><input type="password" required minLength={3} className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bvb-yellow" value={passwordForm.confirm} onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})} /></div>
                        <button type="submit" className="w-full bg-bvb-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition-colors mt-4">更新密码</button>
                    </form>
                </div>
            </div>
        )}

        {activeTab === 'permissions' && isDirector && (
            <div className="flex-1 p-6">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 flex items-center"><ShieldAlert className="w-5 h-5 mr-2 text-bvb-yellow" /> 角色权限矩阵</h3>
                        <p className="text-sm text-gray-500 mt-1">设置不同角色对功能模块的 查看(View) 和 编辑(Edit) 权限。</p>
                    </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="p-4 font-black text-xs uppercase text-gray-500 border-b">功能模块</th>
                                {ROLES.map(role => (
                                    <th key={role.id} className="p-4 font-black text-xs uppercase text-gray-500 border-b text-center">{role.label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {MODULES.map(module => (
                                <tr key={module.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4 font-bold text-gray-700">{module.label}</td>
                                    {ROLES.map(role => {
                                        const level = localPermissions[role.id]?.[module.id] || 'none';
                                        return (
                                            <td key={role.id} className="p-4">
                                                <div className="flex justify-center items-center gap-1">
                                                    <button 
                                                        onClick={() => handleUpdatePermission(role.id, module.id, 'none')}
                                                        className={`p-2 rounded-lg transition-all ${level === 'none' ? 'bg-red-500 text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                                        title="禁用"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleUpdatePermission(role.id, module.id, 'view')}
                                                        className={`p-2 rounded-lg transition-all ${level === 'view' ? 'bg-blue-50 text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                                        title="仅查看"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleUpdatePermission(role.id, module.id, 'edit')}
                                                        className={`p-2 rounded-lg transition-all ${level === 'edit' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                                        title="可编辑"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {activeTab === 'users' && isDirector && (
             <div className="flex-1 p-6">
                 <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center"><Users className="w-5 h-5 mr-2 text-bvb-yellow" /> 用户与角色管理</h3>
                <div className={`p-6 rounded-2xl border transition-all ${editingUserId ? 'bg-yellow-50 border-bvb-yellow shadow-inner' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex justify-between items-center mb-5">
                        <h4 className="font-black text-sm text-gray-700 flex items-center uppercase tracking-widest">{editingUserId ? <><Edit2 className="w-4 h-4 mr-2 text-bvb-yellow" /> 编辑账户信息</> : <><Plus className="w-4 h-4 mr-2 text-bvb-yellow" /> 创建新账户</>}</h4>
                        {editingUserId && <button onClick={cancelEditUser} className="text-xs text-gray-400 hover:text-red-500 flex items-center font-bold"><X className="w-3 h-3 mr-1" /> 放弃修改</button>}
                    </div>
                    <form onSubmit={handleUserFormSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">用户名</label>
                                <input placeholder="登录账号" className="w-full p-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-bvb-yellow text-sm font-bold bg-white" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} required />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">显示名称</label>
                                <input placeholder="真实姓名" className="w-full p-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-bvb-yellow text-sm font-bold bg-white" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">系统角色</label>
                                <select className="w-full p-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-bvb-yellow text-sm font-bold bg-white" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})}>
                                    {ROLES.map(r => <option key={r.id} value={r.id}>{r.label.split('(')[0].trim()}</option>)}
                                </select>
                            </div>
                            {newUser.role === 'coach' && (
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">教练等级</label>
                                    <select className="w-full p-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-bvb-yellow text-sm font-bold bg-white" value={newUser.level} onChange={e => setNewUser({...newUser, level: e.target.value as CoachLevel})}>
                                        {COACH_LEVELS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Team Selection Section (Crucial Fix) */}
                        {(newUser.role === 'coach' || newUser.role === 'assistant_coach') && (
                            <div className="animate-in slide-in-from-top-2 duration-300">
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest flex items-center gap-2">
                                    <Shirt className="w-3 h-3 text-bvb-yellow" /> 管理范围：请选择该教练负责的梯队
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                                    {teams.map(team => {
                                        const isSelected = newUser.teamIds?.includes(team.id);
                                        return (
                                            <button 
                                                key={team.id}
                                                type="button"
                                                onClick={() => toggleTeamSelection(team.id)}
                                                className={`flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all text-xs font-bold ${isSelected ? 'bg-bvb-black text-bvb-yellow border-bvb-black shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'}`}
                                            >
                                                <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${isSelected ? 'bg-bvb-yellow' : 'bg-gray-100'}`}>
                                                    {isSelected ? <CheckCircle className="w-3 h-3 text-bvb-black" /> : <Square className="w-3 h-3 text-gray-200" />}
                                                </div>
                                                <span className="truncate">{team.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                {(!teams || teams.length === 0) && <p className="text-[10px] text-gray-400 italic">暂无可选梯队，请先在“球队管理”中创建。</p>}
                            </div>
                        )}

                        <div className="flex justify-end pt-2 border-t border-gray-200">
                            <button type="submit" className="bg-bvb-black text-white font-black rounded-xl px-8 py-3 hover:bg-gray-800 text-sm shadow-xl active:scale-95 transition-all flex items-center gap-2">
                                {editingUserId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                {editingUserId ? '确认更新账号' : '立即创建账号'}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="mt-8">
                    <h4 className="font-black text-xs text-gray-400 uppercase tracking-widest mb-4">当前系统账户列表</h4>
                    <div className="space-y-3">
                        {users.map(u => (
                            <div key={u.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 bg-white border border-gray-100 rounded-2xl hover:shadow-md transition-all group relative overflow-hidden">
                                <div className="flex items-center gap-6 z-10 w-full">
                                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0 border-2 border-white shadow-sm">
                                        <Users className="w-6 h-6 text-gray-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="font-black text-gray-800 text-lg leading-none">{u.name}</span>
                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border tracking-tighter ${u.role === 'director' ? 'bg-purple-50 text-purple-600 border-purple-100' : u.role === 'coach' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-gray-50 text-gray-500'}`}>{u.role}</span>
                                            {u.role === 'coach' && <span className="text-[9px] font-black text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{u.level || 'Junior'}</span>}
                                        </div>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 font-bold">
                                            <span className="flex items-center gap-1 font-mono">ID: {u.username}</span>
                                            {(u.teamIds && u.teamIds.length > 0) && (
                                                <span className="flex items-center gap-1 text-blue-500">
                                                    <Shirt className="w-3 h-3" /> 负责: {u.teamIds.map(tid => teams.find(t => t.id === tid)?.level || tid).join(', ')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-4 md:mt-0 z-10">
                                    <button onClick={() => handleResetPasswordClick(u.id)} className="p-2.5 text-gray-400 hover:text-bvb-black hover:bg-gray-100 rounded-xl transition-all" title="重置密码 (123)">
                                        <RotateCcw className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => startEditUser(u)} className="p-2.5 text-gray-400 hover:text-bvb-black hover:bg-yellow-50 rounded-xl transition-all" title="修改资料">
                                        <Edit2 className="w-5 h-5" />
                                    </button>
                                    {u.id !== 'u1' && (
                                        <button onClick={() => handleDeleteUserClick(u.id)} className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="注销账户">
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                                <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-gray-50/50 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </div>
                        ))}
                    </div>
                </div>
             </div>
        )}

        {activeTab === 'salary' && isDirector && (
            <div className="flex-1 p-6 space-y-8">
                <div className="flex justify-between items-end">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 flex items-center"><Calculator className="w-5 h-5 mr-2 text-bvb-yellow" /> 教职薪酬核算规则设置</h3>
                        <p className="text-sm text-gray-500 mt-1">配置教练等级、底薪、课酬标准及绩效奖金。</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Level Bases */}
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                        <h4 className="font-black text-xs uppercase tracking-widest text-gray-400 mb-6 flex items-center"><Star className="w-4 h-4 mr-2" /> 等级基础薪资与课酬</h4>
                        <div className="space-y-4">
                            {localSalarySettings.levels.map((l, idx) => (
                                <div key={l.level} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                    <p className="font-black text-xs text-bvb-black mb-3 border-b pb-2">{l.label} 教练</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">基础底薪 (¥)</label>
                                            <input 
                                                type="number" className="w-full p-2 border rounded font-black text-sm"
                                                value={l.baseSalary}
                                                onChange={e => {
                                                    const next = { ...localSalarySettings };
                                                    next.levels[idx].baseSalary = parseInt(e.target.value) || 0;
                                                    setLocalSalarySettings(next);
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">基础课酬 (¥)</label>
                                            <input 
                                                type="number" className="w-full p-2 border rounded font-black text-sm"
                                                value={l.sessionBaseFee}
                                                onChange={e => {
                                                    const next = { ...localSalarySettings };
                                                    next.levels[idx].sessionBaseFee = parseInt(e.target.value) || 0;
                                                    setLocalSalarySettings(next);
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Incremental & Performance */}
                    <div className="space-y-6">
                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                            <h4 className="font-black text-xs uppercase tracking-widest text-gray-400 mb-6 flex items-center"><TrendingUp className="w-4 h-4 mr-2" /> 课时费人数递增规则</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">起算基准人数</label>
                                    <input type="number" className="w-full p-2 border rounded font-black text-sm bg-white" value={localSalarySettings.minPlayersForCalculation} onChange={e => setLocalSalarySettings({...localSalarySettings, minPlayersForCalculation: parseInt(e.target.value) || 0})} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">每超1人增加 (¥)</label>
                                    <input type="number" className="w-full p-2 border rounded font-black text-sm bg-white" value={localSalarySettings.incrementalPlayerFee} onChange={e => setLocalSalarySettings({...localSalarySettings, incrementalPlayerFee: parseInt(e.target.value) || 0})} />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                            <h4 className="font-black text-xs uppercase tracking-widest text-gray-400 mb-6 flex items-center"><CheckSquare className="w-4 h-4 mr-2" /> 绩效奖励阈值设置</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">月度参训率奖励 (≥ X% 奖 Y元)</label>
                                    <div className="space-y-2">
                                        {localSalarySettings.monthlyAttendanceRewards.map((r, i) => (
                                            <div key={i} className="flex gap-2 items-center">
                                                <input type="number" className="w-20 p-2 border rounded font-black text-xs" value={r.threshold} onChange={e => {
                                                    const next = { ...localSalarySettings };
                                                    next.monthlyAttendanceRewards[i].threshold = parseInt(e.target.value) || 0;
                                                    setLocalSalarySettings(next);
                                                }} />
                                                <span className="text-xs font-bold text-gray-400">%</span>
                                                <input type="number" className="flex-1 p-2 border rounded font-black text-xs" value={r.amount} onChange={e => {
                                                    const next = { ...localSalarySettings };
                                                    next.monthlyAttendanceRewards[i].amount = parseInt(e.target.value) || 0;
                                                    setLocalSalarySettings(next);
                                                }} />
                                                <span className="text-xs font-bold text-gray-400">元</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-gray-200">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">季度续费率奖励 (≥ X% 奖 Y元)</label>
                                    <p className="text-[9px] text-blue-500 font-bold mb-2">注：按季度统计，仅在季末月份(3/6/9/12)发放。</p>
                                    <div className="flex gap-2 items-center">
                                        <input type="number" className="w-20 p-2 border rounded font-black text-xs" value={localSalarySettings.quarterlyRenewalReward.threshold} onChange={e => setLocalSalarySettings({...localSalarySettings, quarterlyRenewalReward: {...localSalarySettings.quarterlyRenewalReward, threshold: parseInt(e.target.value) || 0}})} />
                                        <span className="text-xs font-bold text-gray-400">%</span>
                                        <input type="number" className="flex-1 p-2 border rounded font-black text-xs" value={localSalarySettings.quarterlyRenewalReward.amount} onChange={e => setLocalSalarySettings({...localSalarySettings, quarterlyRenewalReward: {...localSalarySettings.quarterlyRenewalReward, amount: parseInt(e.target.value) || 0}})} />
                                        <span className="text-xs font-bold text-gray-400">元</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'foci' && isDirector && (
            <div className="flex-1 p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center"><Zap className="w-5 h-5 mr-2 text-bvb-yellow" /> 训练重点预设管理</h3>
                <p className="text-sm text-gray-500 mb-6">设置训练计划中可选的重点项目（如：传接球、射门等）。</p>
                <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-bold text-gray-600 mb-2">添加新重点</label>
                    <div className="flex gap-2">
                        <input type="text" placeholder="例如：快速反击" className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bvb-yellow" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddFocus()} />
                        <button onClick={handleAddFocus} disabled={!newItemName.trim()} className="px-4 py-2 bg-bvb-black text-white font-bold rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"><Plus className="w-5 h-5" /></button>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {localConfig.trainingFoci?.map((focus, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-lg shadow-sm group">
                            <span className="text-gray-800 font-bold">{focus}</span>
                            <button onClick={() => handleDeleteFocus(focus)} className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'finance_cats' && isDirector && (
            <div className="flex-1 p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center"><Wallet className="w-5 h-5 mr-2 text-bvb-yellow" /> 财务科目与分类管理</h3>
                <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-bold text-gray-600 mb-2">新增分类科目</label>
                    <div className="flex gap-2">
                        <input type="text" placeholder="输入科目名称..." className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bvb-yellow" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} />
                        <button onClick={() => handleAddFinanceCategory('income')} className="px-4 py-2 bg-green-600 text-white text-xs font-black rounded-lg">设为收入</button>
                        <button onClick={() => handleAddFinanceCategory('expense')} className="px-4 py-2 bg-red-600 text-white text-xs font-black rounded-lg">设为支出</button>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <h4 className="text-xs font-black text-green-600 uppercase">收入科目</h4>
                        {localFinanceCategories.filter(c => c.type === 'income').map(cat => (
                            <div key={cat.id} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-lg shadow-sm group">
                                <span className="font-bold">{cat.label}</span>
                                <button onClick={() => handleDeleteFinanceCategory(cat.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-xs font-black text-red-600 uppercase">支出科目</h4>
                        {localFinanceCategories.filter(c => c.type === 'expense').map(cat => (
                            <div key={cat.id} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-lg shadow-sm group">
                                <span className="font-bold">{cat.label}</span>
                                <button onClick={() => handleDeleteFinanceCategory(cat.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'attributes' && isDirector && (
            <div className="flex flex-col md:flex-row h-full">
                <div className="md:w-64 bg-gray-50 border-r border-gray-200 p-4 space-y-2">
                    {(Object.keys(categoryLabels) as AttributeCategory[]).map(cat => (<button key={cat} onClick={() => setActiveCategory(cat)} className={`w-full text-left px-4 py-3 rounded-lg font-bold transition-all ${activeCategory === cat ? 'bg-bvb-black text-bvb-yellow shadow-md' : 'text-gray-600 hover:bg-white hover:shadow-sm'}`}>{categoryLabels[cat]}</button>))}
                </div>
                <div className="flex-1 p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center"><SettingsIcon className="w-5 h-5 mr-2 text-bvb-yellow" /> 配置: {categoryLabels[activeCategory]}</h3>
                    <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200"><label className="block text-sm font-bold text-gray-600 mb-2">添加新能力项</label><div className="flex gap-2"><input type="text" placeholder="例如：任意球精度" className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bvb-yellow" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddAttribute()} /><button onClick={handleAddAttribute} disabled={!newItemName.trim()} className="px-4 py-2 bg-bvb-black text-white font-bold rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"><Plus className="w-5 h-5" /></button></div></div>
                    <div className="space-y-3">{localConfig[activeCategory].map((attr) => ( <div key={attr.key} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-lg shadow-sm group"><span className="bold text-gray-700 font-bold">{attr.label}</span><button onClick={() => handleDeleteAttribute(activeCategory, attr.key)} className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button></div> ))}</div>
                </div>
            </div>
        )}

        {activeTab === 'drills' && isDirector && (
            <div className="flex-1 p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center"><Book className="w-5 h-5 mr-2 text-bvb-yellow" /> 训练内容库管理</h3>
                <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200"><label className="block text-sm font-bold text-gray-600 mb-2">添加训练项目</label><div className="flex gap-2"><input type="text" placeholder="例如：3v2 快速反击" className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bvb-yellow" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddDrill()} /><button onClick={handleAddDrill} disabled={!newItemName.trim()} className="px-4 py-2 bg-bvb-black text-white font-bold rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"><Plus className="w-5 h-5" /></button></div></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{localConfig.drillLibrary?.map((drill, idx) => ( <div key={idx} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-lg shadow-sm group"><span className="text-gray-800">{drill}</span><button onClick={() => handleDeleteDrill(drill)} className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button></div> ))}</div>
            </div>
        )}

        {activeTab === 'branding' && isDirector && (
            <div className="flex-1 p-6 flex flex-col items-center justify-center">
                <div className="w-full max-lg bg-gray-50 p-8 rounded-xl border border-gray-200 text-center">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center justify-center"><ImageIcon className="w-5 h-5 mr-2 text-bvb-yellow" /> 应用 Logo 设置</h3>
                    <div className="mb-8 flex flex-col items-center"><div className="w-32 h-32 bg-white rounded-full flex items-center justify-center border-4 border-white shadow-lg overflow-hidden mb-4">{appLogo ? <img src={appLogo} alt="App Logo" className="w-full h-full object-contain" /> : <span className="text-gray-300 font-bold">No Logo</span>}</div></div>
                    <div className="relative group w-full"><input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" /><div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-bvb-yellow hover:bg-yellow-50 transition-colors flex flex-col items-center justify-center"><Upload className="w-8 h-8 text-gray-400 mb-2" /><span className="font-bold text-gray-600">点击上传新 Logo 图片</span></div></div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default Settings;
