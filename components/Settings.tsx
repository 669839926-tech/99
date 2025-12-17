
import React, { useState } from 'react';
import { AttributeConfig, AttributeCategory, User, Team } from '../types';
import { Settings as SettingsIcon, Plus, Trash2, Save, Book, Activity, Brain, Dumbbell, Target, CheckSquare, Users, RotateCcw, Lock, KeyRound, Image as ImageIcon, Upload, CheckCircle, Edit2, X } from 'lucide-react';

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
  teams?: Team[]; // Passed from App for selection
}

const Settings: React.FC<SettingsProps> = ({ 
    attributeConfig, 
    onUpdateConfig, 
    currentUser,
    users,
    onAddUser,
    onUpdateUser,
    onDeleteUser,
    onResetUserPassword,
    onUpdateUserPassword,
    appLogo,
    onUpdateAppLogo,
    teams = []
}) => {
  const isDirector = currentUser?.role === 'director';

  const [localConfig, setLocalConfig] = useState<AttributeConfig>(JSON.parse(JSON.stringify(attributeConfig)));
  
  // Tabs: Coaches only see "Account", Directors see everything
  const [activeTab, setActiveTab] = useState<'attributes' | 'drills' | 'users' | 'account' | 'branding'>('account');
  const [activeCategory, setActiveCategory] = useState<AttributeCategory>('technical');
  const [newItemName, setNewItemName] = useState('');

  // User Management State (New/Edit User Form)
  const [newUser, setNewUser] = useState<Partial<User>>({ username: '', name: '', role: 'coach', teamIds: [] });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Change Password State
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });

  const categoryLabels: Record<AttributeCategory, string> = {
    technical: '技术能力',
    tactical: '战术能力',
    physical: '身体素质',
    mental: '心理素质'
  };

  const handleAddAttribute = () => {
    if (!newItemName.trim()) return;
    
    const key = newItemName.trim().toLowerCase().replace(/\s+/g, '_') + '_' + Date.now().toString().slice(-4);
    
    setLocalConfig(prev => ({
      ...prev,
      [activeCategory]: [
        ...prev[activeCategory],
        { key, label: newItemName.trim() }
      ]
    }));
    setNewItemName('');
  };

  const handleAddDrill = () => {
      if (!newItemName.trim()) return;
      setLocalConfig(prev => ({
          ...prev,
          drillLibrary: [...(prev.drillLibrary || []), newItemName.trim()]
      }));
      setNewItemName('');
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
              const user: User = { 
                  ...newUser, 
                  id: `u-${Date.now()}`,
                  password: '123' // Enforce default
              } as User;
              
              onAddUser(user);
              alert(`用户 ${user.name} 已创建，默认密码为 123`);
          }
          setNewUser({ username: '', name: '', role: 'coach', teamIds: [] });
          setEditingUserId(null);
      }
  };

  const toggleTeamSelection = (teamId: string) => {
      setNewUser(prev => {
          const currentIds = prev.teamIds || [];
          if (currentIds.includes(teamId)) {
              return { ...prev, teamIds: currentIds.filter(id => id !== teamId) };
          } else {
              return { ...prev, teamIds: [...currentIds, teamId] };
          }
      });
  };

  const startEditUser = (user: User) => {
      setEditingUserId(user.id);
      setNewUser({
          username: user.username,
          name: user.name,
          role: user.role,
          teamIds: user.teamIds || []
      });
      // Scroll to top or just highlight form
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditUser = () => {
      setEditingUserId(null);
      setNewUser({ username: '', name: '', role: 'coach', teamIds: [] });
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
      setLocalConfig(prev => ({
        ...prev,
        [category]: prev[category].filter(attr => attr.key !== keyToDelete)
      }));
    }
  };

  const handleDeleteDrill = (drill: string) => {
      if(confirm('确定要从库中删除此训练内容吗？')) {
          setLocalConfig(prev => ({
              ...prev,
              drillLibrary: prev.drillLibrary.filter(d => d !== drill)
          }));
      }
  };

  const handleChangeOwnPassword = (e: React.FormEvent) => {
      e.preventDefault();
      if (passwordForm.new !== passwordForm.confirm) {
          alert('两次输入的新密码不一致');
          return;
      }
      if (passwordForm.new.length < 3) {
          alert('密码长度至少需要3位');
          return;
      }
      
      // In a real app, verify old password via API. 
      // Here we check against currentUser prop (which is client-side state)
      if (currentUser && currentUser.password !== passwordForm.current) {
          alert('当前密码输入错误');
          return;
      }

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
          reader.onloadend = () => {
              const base64String = reader.result as string;
              onUpdateAppLogo(base64String);
          };
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
               {isDirector ? '自定义评价体系、训练内容库及用户管理。' : '管理您的个人账户安全。'}
           </p>
        </div>
        {/* Only show "Save Config" button if NOT in Account tab (Account tab has its own form button) */}
        {isDirector && activeTab !== 'account' && activeTab !== 'users' && activeTab !== 'branding' && (
            <button 
            onClick={handleSaveConfig}
            className="flex items-center px-6 py-2 bg-bvb-yellow text-bvb-black font-bold rounded-lg shadow-md hover:brightness-105 transition-colors"
            >
            <Save className="w-5 h-5 mr-2" />
            保存配置更改
            </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('account')} 
            className={`px-4 py-2 font-bold text-sm flex items-center border-b-2 transition-colors whitespace-nowrap ${activeTab === 'account' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-500'}`}
          >
              <Lock className="w-4 h-4 mr-2" /> 个人安全
          </button>
          
          {isDirector && (
              <>
                <button 
                    onClick={() => setActiveTab('users')} 
                    className={`px-4 py-2 font-bold text-sm flex items-center border-b-2 transition-colors whitespace-nowrap ${activeTab === 'users' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-500'}`}
                >
                    <Users className="w-4 h-4 mr-2" /> 用户权限管理
                </button>
                <button 
                    onClick={() => setActiveTab('attributes')} 
                    className={`px-4 py-2 font-bold text-sm flex items-center border-b-2 transition-colors whitespace-nowrap ${activeTab === 'attributes' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-500'}`}
                >
                    <Target className="w-4 h-4 mr-2" /> 球员能力模型
                </button>
                <button 
                    onClick={() => setActiveTab('drills')} 
                    className={`px-4 py-2 font-bold text-sm flex items-center border-b-2 transition-colors whitespace-nowrap ${activeTab === 'drills' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-500'}`}
                >
                    <Book className="w-4 h-4 mr-2" /> 训练内容库
                </button>
                <button 
                    onClick={() => setActiveTab('branding')} 
                    className={`px-4 py-2 font-bold text-sm flex items-center border-b-2 transition-colors whitespace-nowrap ${activeTab === 'branding' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-500'}`}
                >
                    <ImageIcon className="w-4 h-4 mr-2" /> 品牌外观
                </button>
              </>
          )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row min-h-[500px]">
        
        {/* === TAB: ACCOUNT SECURITY (For Everyone) === */}
        {activeTab === 'account' && (
            <div className="flex-1 p-6 flex flex-col items-center justify-center">
                <div className="w-full max-w-md bg-gray-50 p-8 rounded-xl border border-gray-200">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                        <KeyRound className="w-5 h-5 mr-2 text-bvb-yellow" />
                        修改登录密码
                    </h3>
                    <form onSubmit={handleChangeOwnPassword} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">当前密码</label>
                            <input 
                                type="password"
                                required
                                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bvb-yellow"
                                value={passwordForm.current}
                                onChange={e => setPasswordForm({...passwordForm, current: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">新密码</label>
                            <input 
                                type="password"
                                required
                                minLength={3}
                                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bvb-yellow"
                                value={passwordForm.new}
                                onChange={e => setPasswordForm({...passwordForm, new: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">确认新密码</label>
                            <input 
                                type="password"
                                required
                                minLength={3}
                                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bvb-yellow"
                                value={passwordForm.confirm}
                                onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})}
                            />
                        </div>
                        <button type="submit" className="w-full bg-bvb-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition-colors mt-4">
                            更新密码
                        </button>
                    </form>
                </div>
            </div>
        )}

        {/* === TAB: BRANDING (Director Only) === */}
        {activeTab === 'branding' && isDirector && (
            <div className="flex-1 p-6 flex flex-col items-center justify-center">
                <div className="w-full max-w-lg bg-gray-50 p-8 rounded-xl border border-gray-200 text-center">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 mr-2 text-bvb-yellow" />
                        应用 Logo 设置
                    </h3>
                    
                    <div className="mb-8 flex flex-col items-center">
                        <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center border-4 border-white shadow-lg overflow-hidden mb-4">
                            {appLogo ? (
                                <img src={appLogo} alt="App Logo" className="w-full h-full object-contain" />
                            ) : (
                                <span className="text-gray-300 font-bold">No Logo</span>
                            )}
                        </div>
                        <p className="text-sm text-gray-500">当前显示的 Logo 预览</p>
                    </div>

                    <div className="relative group w-full">
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleLogoUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-bvb-yellow hover:bg-yellow-50 transition-colors flex flex-col items-center justify-center">
                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                            <span className="font-bold text-gray-600">点击上传新图片</span>
                            <span className="text-xs text-gray-400 mt-1">支持 PNG, JPG, GIF 格式</span>
                        </div>
                    </div>
                    
                    <p className="text-xs text-gray-400 mt-6">
                        注意：上传后的 Logo 将应用到整个系统，包括登录页、侧边栏以及 PDF 导出报告。建议使用正方形或透明背景的 PNG 图片。
                    </p>
                </div>
            </div>
        )}

        {/* === TAB: USER MANAGEMENT (Director Only) === */}
        {activeTab === 'users' && isDirector && (
             <div className="flex-1 p-6">
                 <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                    <Users className="w-5 h-5 mr-2 text-bvb-yellow" />
                    用户与角色管理
                </h3>
                
                {/* Add/Edit User Form */}
                <div className={`p-4 rounded-lg border border-gray-200 mb-6 transition-colors ${editingUserId ? 'bg-yellow-50 border-bvb-yellow' : 'bg-gray-50'}`}>
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-sm text-gray-700 flex items-center">
                            {editingUserId ? <><Edit2 className="w-4 h-4 mr-2" /> 编辑用户</> : '新增用户'}
                        </h4>
                        {editingUserId && (
                            <button onClick={cancelEditUser} className="text-xs text-gray-500 hover:text-red-500 flex items-center">
                                <X className="w-3 h-3 mr-1" /> 取消
                            </button>
                        )}
                    </div>
                    <form onSubmit={handleUserFormSubmit} className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                            <input 
                                placeholder="用户名" 
                                className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-bvb-yellow text-sm bg-white"
                                value={newUser.username}
                                onChange={e => setNewUser({...newUser, username: e.target.value})}
                                required
                            />
                            <input 
                                placeholder="显示名称" 
                                className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-bvb-yellow text-sm bg-white"
                                value={newUser.name}
                                onChange={e => setNewUser({...newUser, name: e.target.value})}
                                required
                            />
                            <select 
                                className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-bvb-yellow text-sm bg-white"
                                value={newUser.role}
                                onChange={e => setNewUser({...newUser, role: e.target.value as any})}
                            >
                                <option value="coach">教练员</option>
                                <option value="director">青训总监</option>
                            </select>
                        </div>

                        {/* Team Selection for Coaches */}
                        {newUser.role === 'coach' && (
                            <div className="bg-white p-3 rounded border border-gray-200">
                                <span className="block text-xs font-bold text-gray-400 uppercase mb-2">负责梯队 (可多选)</span>
                                <div className="flex flex-wrap gap-2">
                                    {teams.map(t => {
                                        const isSelected = newUser.teamIds?.includes(t.id);
                                        return (
                                            <button
                                                type="button"
                                                key={t.id}
                                                onClick={() => toggleTeamSelection(t.id)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center ${
                                                    isSelected 
                                                    ? 'bg-bvb-yellow border-bvb-yellow text-bvb-black' 
                                                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-bvb-yellow'
                                                }`}
                                            >
                                                {isSelected && <CheckCircle className="w-3 h-3 mr-1" />}
                                                {t.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end">
                            <button className="bg-bvb-black text-white font-bold rounded px-4 py-2 hover:bg-gray-800 text-sm shadow-md">
                                {editingUserId ? '保存修改' : '添加用户'}
                            </button>
                        </div>
                    </form>
                    {!editingUserId && (
                        <p className="text-[10px] text-gray-400 mt-2 flex items-center border-t pt-2 border-gray-200">
                            * 默认初始密码为 <span className="font-mono bg-gray-200 px-1 rounded ml-1 text-gray-600">123</span>，请提醒用户登录后尽快修改。
                        </p>
                    )}
                </div>

                {/* User List */}
                <div className="space-y-2">
                    <div className="grid grid-cols-5 text-xs font-bold text-gray-400 uppercase px-4 py-2 bg-gray-50 border border-gray-100 rounded-t-lg">
                        <div className="col-span-1">用户名</div>
                        <div className="col-span-1">姓名</div>
                        <div className="col-span-1">角色</div>
                        <div className="col-span-1">管理梯队</div>
                        <div className="col-span-1 text-right">操作</div>
                    </div>
                    {users.map(u => (
                        <div key={u.id} className={`grid grid-cols-5 items-center px-4 py-3 bg-white border border-gray-100 first:border-t-0 last:rounded-b-lg hover:bg-gray-50 transition-colors ${editingUserId === u.id ? 'bg-yellow-50/50' : ''}`}>
                            <div className="col-span-1 font-mono text-sm">{u.username}</div>
                            <div className="col-span-1 font-bold text-sm text-gray-800 flex items-center">
                                {u.name}
                                {u.id === currentUser?.id && <span className="ml-2 text-[10px] bg-green-100 text-green-700 px-1.5 rounded">Me</span>}
                            </div>
                            <div className="col-span-1">
                                <span className={`text-xs px-2 py-0.5 rounded font-bold ${u.role === 'director' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {u.role === 'director' ? '总监' : '教练'}
                                </span>
                            </div>
                            <div className="col-span-1 flex flex-wrap gap-1">
                                {u.role === 'director' ? (
                                    <span className="text-xs text-gray-400 italic">全部权限</span>
                                ) : (
                                    u.teamIds && u.teamIds.length > 0 ? (
                                        u.teamIds.map(tid => {
                                            const t = teams.find(team => team.id === tid);
                                            return t ? (
                                                <span key={tid} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 rounded border border-gray-200">
                                                    {t.name}
                                                </span>
                                            ) : null;
                                        })
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">未分配</span>
                                    )
                                )}
                            </div>
                            <div className="col-span-1 text-right flex justify-end gap-2">
                                {/* Can't delete self */}
                                {u.id !== currentUser?.id && (
                                    <>
                                        <button 
                                            onClick={() => startEditUser(u)}
                                            className="text-gray-400 hover:text-bvb-black p-1 rounded hover:bg-gray-100"
                                            title="编辑用户"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleResetPasswordClick(u.id)}
                                            className="text-gray-400 hover:text-blue-500 p-1 rounded hover:bg-blue-50"
                                            title="重置密码为 123"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteUserClick(u.id)}
                                            className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50"
                                            title="删除用户"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
             </div>
        )}
        
        {/* === TAB: ATTRIBUTES CONFIG (Director Only) === */}
        {activeTab === 'attributes' && isDirector && (
            <>
                {/* Category Sidebar */}
                <div className="md:w-64 bg-gray-50 border-r border-gray-200 p-4 space-y-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase mb-4 px-2">评估维度</h3>
                {(Object.keys(categoryLabels) as AttributeCategory[]).map(cat => (
                    <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`w-full text-left px-4 py-3 rounded-lg font-bold transition-all ${
                        activeCategory === cat 
                        ? 'bg-bvb-black text-bvb-yellow shadow-md' 
                        : 'text-gray-600 hover:bg-white hover:shadow-sm'
                    }`}
                    >
                    {categoryLabels[cat]}
                    </button>
                ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                    <SettingsIcon className="w-5 h-5 mr-2 text-bvb-yellow" />
                    配置: {categoryLabels[activeCategory]}
                </h3>

                <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-bold text-gray-600 mb-2">添加新能力项</label>
                    <div className="flex gap-2">
                    <input 
                        type="text" 
                        placeholder="例如：任意球精度"
                        className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bvb-yellow"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddAttribute()}
                    />
                    <button 
                        onClick={handleAddAttribute}
                        disabled={!newItemName.trim()}
                        className="px-4 py-2 bg-bvb-black text-white font-bold rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                    </div>
                </div>

                <div className="space-y-3">
                    {localConfig[activeCategory].length > 0 ? (
                    localConfig[activeCategory].map((attr) => (
                        <div key={attr.key} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition-shadow group">
                        <span className="bold text-gray-700 font-bold">{attr.label}</span>
                        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs text-gray-300 font-mono mr-2">{attr.key}</span>
                            <button 
                            onClick={() => handleDeleteAttribute(activeCategory, attr.key)}
                            className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded"
                            title="删除"
                            >
                            <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        </div>
                    ))
                    ) : (
                    <p className="text-gray-400 text-center py-8 italic">此维度暂无评估项目</p>
                    )}
                </div>
                </div>
            </>
        )}

        {/* === TAB: DRILL LIBRARY (Director Only) === */}
        {activeTab === 'drills' && isDirector && (
            <div className="flex-1 p-6">
                 <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                    <Book className="w-5 h-5 mr-2 text-bvb-yellow" />
                    训练内容库管理
                </h3>
                <p className="text-sm text-gray-500 mb-6">在这里预设常用的训练项目（Drills），在制定训练计划时可以直接从库中选择。</p>

                <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-bold text-gray-600 mb-2">添加训练项目</label>
                    <div className="flex gap-2">
                    <input 
                        type="text" 
                        placeholder="例如：3v2 快速反击"
                        className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bvb-yellow"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddDrill()}
                    />
                    <button 
                        onClick={handleAddDrill}
                        disabled={!newItemName.trim()}
                        className="px-4 py-2 bg-bvb-black text-white font-bold rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                     {localConfig.drillLibrary?.map((drill, idx) => (
                         <div key={idx} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-lg shadow-sm group">
                             <span className="text-gray-800">{drill}</span>
                             <button 
                                onClick={() => handleDeleteDrill(drill)}
                                className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                             >
                                 <Trash2 className="w-4 h-4" />
                             </button>
                         </div>
                     ))}
                     {(!localConfig.drillLibrary || localConfig.drillLibrary.length === 0) && (
                         <p className="col-span-2 text-center text-gray-400 py-8">库中暂无内容</p>
                     )}
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default Settings;
