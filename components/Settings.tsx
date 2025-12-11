
import React, { useState } from 'react';
import { AttributeConfig, AttributeCategory, User } from '../types';
import { Settings as SettingsIcon, Plus, Trash2, Save, Book, Activity, Brain, Dumbbell, Target, CheckSquare, Users } from 'lucide-react';
import { MOCK_USERS } from '../constants'; // Import mock users directly if you want to initialize, or handle via App props better in a real app. For this structure, we'll maintain local state simulation.

interface SettingsProps {
  attributeConfig: AttributeConfig;
  onUpdateConfig: (newConfig: AttributeConfig) => void;
}

// Simulated local user management since it's not lifted to App in original props but requested as feature
const Settings: React.FC<SettingsProps> = ({ attributeConfig, onUpdateConfig }) => {
  const [localConfig, setLocalConfig] = useState<AttributeConfig>(JSON.parse(JSON.stringify(attributeConfig)));
  const [activeTab, setActiveTab] = useState<'attributes' | 'drills' | 'users'>('attributes');
  const [activeCategory, setActiveCategory] = useState<AttributeCategory>('technical');
  const [newItemName, setNewItemName] = useState('');

  // Local User Management State
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [newUser, setNewUser] = useState<Partial<User>>({ username: '', name: '', role: 'coach', password: '123' });


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

  const handleAddUser = (e: React.FormEvent) => {
      e.preventDefault();
      if(newUser.username && newUser.name) {
          setUsers(prev => [...prev, { ...newUser, id: `u-${Date.now()}` } as User]);
          setNewUser({ username: '', name: '', role: 'coach', password: '123' });
      }
  };

  const handleDeleteUser = (id: string) => {
      if(confirm('确定要删除该用户吗？')) {
          setUsers(prev => prev.filter(u => u.id !== id));
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

  const handleSave = () => {
    onUpdateConfig(localConfig);
    alert('设置已保存！');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-3xl font-black text-bvb-black uppercase">系统设置</h2>
           <p className="text-gray-500">自定义评价体系与训练内容库。</p>
        </div>
        <button 
          onClick={handleSave}
          className="flex items-center px-6 py-2 bg-bvb-yellow text-bvb-black font-bold rounded-lg shadow-md hover:brightness-105 transition-colors"
        >
          <Save className="w-5 h-5 mr-2" />
          保存更改
        </button>
      </div>

      <div className="flex gap-4 border-b border-gray-200">
          <button 
            onClick={() => setActiveTab('attributes')} 
            className={`px-4 py-2 font-bold text-sm flex items-center border-b-2 transition-colors ${activeTab === 'attributes' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-500'}`}
          >
              <Target className="w-4 h-4 mr-2" /> 球员能力模型
          </button>
          <button 
            onClick={() => setActiveTab('drills')} 
            className={`px-4 py-2 font-bold text-sm flex items-center border-b-2 transition-colors ${activeTab === 'drills' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-500'}`}
          >
              <Book className="w-4 h-4 mr-2" /> 训练内容库
          </button>
          <button 
            onClick={() => setActiveTab('users')} 
            className={`px-4 py-2 font-bold text-sm flex items-center border-b-2 transition-colors ${activeTab === 'users' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-500'}`}
          >
              <Users className="w-4 h-4 mr-2" /> 用户权限管理
          </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row min-h-[500px]">
        
        {/* === Attributes Logic === */}
        {activeTab === 'attributes' && (
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
                        <span className="font-bold text-gray-700">{attr.label}</span>
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

        {/* === Drill Library Logic === */}
        {activeTab === 'drills' && (
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

        {/* === User Management Logic (New) === */}
        {activeTab === 'users' && (
             <div className="flex-1 p-6">
                 <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                    <Users className="w-5 h-5 mr-2 text-bvb-yellow" />
                    用户与角色管理
                </h3>
                
                {/* Add User Form */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                    <h4 className="font-bold text-sm text-gray-700 mb-3">新增用户</h4>
                    <form onSubmit={handleAddUser} className="grid grid-cols-4 gap-3">
                        <input 
                            placeholder="用户名" 
                            className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-bvb-yellow"
                            value={newUser.username}
                            onChange={e => setNewUser({...newUser, username: e.target.value})}
                        />
                         <input 
                            placeholder="显示名称" 
                            className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-bvb-yellow"
                            value={newUser.name}
                            onChange={e => setNewUser({...newUser, name: e.target.value})}
                        />
                         <select 
                            className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-bvb-yellow"
                            value={newUser.role}
                            onChange={e => setNewUser({...newUser, role: e.target.value as any})}
                        >
                            <option value="coach">教练员</option>
                            <option value="director">青训总监</option>
                        </select>
                        <button className="bg-bvb-black text-white font-bold rounded hover:bg-gray-800">
                            添加
                        </button>
                    </form>
                </div>

                {/* User List */}
                <div className="space-y-2">
                    <div className="grid grid-cols-4 text-xs font-bold text-gray-400 uppercase px-4 py-2 bg-gray-50 border border-gray-100 rounded-t-lg">
                        <div>用户名</div>
                        <div>姓名</div>
                        <div>角色</div>
                        <div className="text-right">操作</div>
                    </div>
                    {users.map(u => (
                        <div key={u.id} className="grid grid-cols-4 items-center px-4 py-3 bg-white border border-gray-100 first:border-t-0 last:rounded-b-lg hover:bg-gray-50">
                            <div className="font-mono text-sm">{u.username}</div>
                            <div className="font-bold text-sm text-gray-800">{u.name}</div>
                            <div>
                                <span className={`text-xs px-2 py-0.5 rounded font-bold ${u.role === 'director' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {u.role === 'director' ? '总监' : '教练'}
                                </span>
                            </div>
                            <div className="text-right">
                                {u.username !== 'admin' && (
                                    <button 
                                        onClick={() => handleDeleteUser(u.id)}
                                        className="text-gray-400 hover:text-red-500"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
             </div>
        )}

      </div>
    </div>
  );
};

export default Settings;
