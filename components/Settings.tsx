
import React, { useState } from 'react';
import { AttributeConfig, AttributeCategory, User, Team, RolePermissions, ModuleId, PermissionLevel, UserRole, FinanceCategoryDefinition, SalarySettings, CoachLevel } from '../types';
import { Plus, Trash2, Save, Book, Target, CheckSquare, Users as UsersIcon, RotateCcw, Lock, KeyRound, Image as ImageIcon, Upload, CheckCircle, Edit2, X, ShieldAlert, Eye, Zap, TrendingUp, Calculator, Star, Shirt, Square, Wallet, Cloud, Database, RefreshCw, FileJson, AlertTriangle, History, ArrowRight, Calendar as CalendarIcon } from 'lucide-react';
import { getCoachingTenure } from './utils';

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
  onRestoreSystem?: (data: any) => void;
}

const MODULES: { id: ModuleId; label: string }[] = [
    { id: 'dashboard', label: '俱乐部概览' },
    { id: 'philosophy', label: '体系库' },
    { id: 'players', label: '球队管理' },
    { id: 'growth', label: '球员成长' },
    { id: 'tactics', label: '战术板' },
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
    { id: 'Apprentice', label: '见习教练 (Apprentice)' },
    { id: 'Junior', label: '初级教练员 (Junior)' },
    { id: 'Intermediate', label: '常驻教练员 (Intermediate)' },
    { id: 'Senior', label: '核心教练员 (Senior)' },
];

const Settings: React.FC<SettingsProps> = ({ 
    attributeConfig, onUpdateConfig, currentUser, users,
    onAddUser, onUpdateUser, onDeleteUser, onResetUserPassword, onUpdateUserPassword,
    appLogo, onUpdateAppLogo, teams = [], permissions, onUpdatePermissions,
    financeCategories, onUpdateFinanceCategories,
    salarySettings, onUpdateSalarySettings,
    onRestoreSystem
}) => {
  const isDirector = currentUser?.role === 'director';

  const [localConfig, setLocalConfig] = useState<AttributeConfig>(JSON.parse(JSON.stringify(attributeConfig)));
  const [localPermissions, setLocalPermissions] = useState<RolePermissions>(JSON.parse(JSON.stringify(permissions)));
  const [localFinanceCategories, setLocalFinanceCategories] = useState<FinanceCategoryDefinition[]>(JSON.parse(JSON.stringify(financeCategories)));
  
  const defaultAssessmentRules = {
      assistantSupervision: {
          enabled: true,
          assessCoaches: true,
          assessAssistants: true,
          amount: 10,
          timing: '每场训练课后 (每日累积督考)',
          content: '检查考核教练/助教的着装规范(缺项扣10元)、必备口哨、消音/秒表，以及器材清理规范完成情况(未清每次扣10元)。'
      },
      directorLogAudit: {
          enabled: true,
          assessCoaches: true,
          assessAssistants: false,
          amount: 10,
          timing: '每日训练课后 (月度累积计算)',
          content: '训练日志应在下课当天完成提交。逾期1天扣除10元，逾期2天及以上扣罚20元。'
      },
      periodizationPlan: {
          enabled: true,
          assessCoaches: true,
          assessAssistants: false,
          amount: 20, // 20%
          timing: '季度末月 (Q1-Q4季末终审评定)',
          content: '每季度底需及时更新录入所带梯队的周期计划与目标大纲，若季度考核评定为“未录入”将扣除基础底薪的20%。'
      },
      playerReview: {
          enabled: true,
          assessCoaches: true,
          assessAssistants: false,
          amount: 5,
          timing: '每季度次月10日 24:00 截止',
          content: '要求在次月10日前录入并提交学员上季度的全部成长评估，每漏录入1人扣罚5元。'
      },
      quarterlyAttendance: {
          enabled: true,
          assessCoaches: true,
          assessAssistants: true,
          amount: 200,
          timing: '每季度末 (总监终评)',
          content: '配合青训总监对教练员进行季度考核执勤，评定为优秀全勤者给予单次追加奖励200元。'
      },
      monthlyExecution: {
          enabled: true,
          assessCoaches: true,
          assessAssistants: true,
          amount: 200,
          timing: '每月核算周期',
          content: '对无严重违纪或前4项考核累计扣罚≤0元的发放优秀奖(¥200)；累计扣罚在 ¥20(含)以内的发放良好奖(¥100)；超过 ¥20 则不予以正向奖励。'
      }
  };

  const [localSalarySettings, setLocalSalarySettings] = useState<SalarySettings>(() => {
    const raw = JSON.parse(JSON.stringify(salarySettings));
    if (!raw.assessmentRules) {
        raw.assessmentRules = JSON.parse(JSON.stringify(defaultAssessmentRules));
    } else {
        raw.assessmentRules = {
            ...JSON.parse(JSON.stringify(defaultAssessmentRules)),
            ...raw.assessmentRules
        };
    }
    return raw;
  });
  
  const [activeTab, setActiveTab] = useState<'account' | 'permissions' | 'users' | 'salary' | 'finance_cats' | 'attributes' | 'profile_tags' | 'drills' | 'branding' | 'cloud'>('account');
  const [activeCategory, setActiveCategory] = useState<AttributeCategory>('technical');
  const [activeTagGroup, setActiveTagGroup] = useState<'playerTypes' | 'technicalStrengths' | 'personalityTraits' | 'behavioralTraits' | 'coachingReminders'>('playerTypes');
  const [newItemName, setNewItemName] = useState('');

  const [newUser, setNewUser] = useState<Partial<User>>({ username: '', name: '', role: 'coach', teamIds: [], level: 'Junior', isTrial: false, joiningDate: '' });
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
          setNewUser({ username: '', name: '', role: 'coach', teamIds: [], level: 'Junior', isTrial: false, joiningDate: '' });
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
      setNewUser({ username: user.username, name: user.name, role: user.role, teamIds: user.teamIds || [], level: user.level || 'Junior', isTrial: user.isTrial || false, joiningDate: user.joiningDate || '' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditUser = () => {
      setEditingUserId(null);
      setNewUser({ username: '', name: '', role: 'coach', teamIds: [], level: 'Junior', isTrial: false, joiningDate: '' });
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

  const handleAddProfileTag = () => {
    if (!newItemName.trim()) return;
    setLocalConfig(prev => ({
      ...prev,
      [activeTagGroup]: [...(prev[activeTagGroup] || []), newItemName.trim()]
    }));
    setNewItemName('');
  };

  const handleDeleteProfileTag = (group: keyof AttributeConfig, tagToDelete: string) => {
    if (confirm('确定要删除这个标签吗？')) {
      setLocalConfig(prev => ({
        ...prev,
        [group]: (prev[group] as string[] || []).filter(tag => tag !== tagToDelete)
      }));
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
        {isDirector && (activeTab === 'attributes' || activeTab === 'drills') && (
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
      <div className="flex gap-4 border-b border-gray-200 overflow-x-auto no-scrollbar">
          <button onClick={() => setActiveTab('account')} className={`px-4 py-2 font-bold text-sm flex items-center border-b-2 transition-colors whitespace-nowrap ${activeTab === 'account' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-500'}`}><Lock className="w-4 h-4 mr-2" /> 个人安全</button>
          {isDirector && (
              <>
                <button onClick={() => setActiveTab('permissions')} className={`px-4 py-2 font-bold text-sm flex items-center border-b-2 transition-colors whitespace-nowrap ${activeTab === 'permissions' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-500'}`}><ShieldAlert className="w-4 h-4 mr-2" /> 角色权限设置</button>
                <button onClick={() => setActiveTab('users')} className={`px-4 py-2 font-bold text-sm flex items-center border-b-2 transition-colors whitespace-nowrap ${activeTab === 'users' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-500'}`}><UsersIcon className="w-4 h-4 mr-2" /> 用户账号管理</button>
                <button onClick={() => setActiveTab('salary')} className={`px-4 py-2 font-bold text-sm flex items-center border-b-2 transition-colors whitespace-nowrap ${activeTab === 'salary' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-500'}`}><Calculator className="w-4 h-4 mr-2" /> 薪酬规则配置</button>
                <button onClick={() => setActiveTab('finance_cats')} className={`px-4 py-2 font-bold text-sm flex items-center border-b-2 transition-colors whitespace-nowrap ${activeTab === 'finance_cats' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-500'}`}><Wallet className="w-4 h-4 mr-2" /> 财务科目管理</button>
                <button onClick={() => setActiveTab('attributes')} className={`px-4 py-2 font-bold text-sm flex items-center border-b-2 transition-colors whitespace-nowrap ${activeTab === 'attributes' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-500'}`}><Target className="w-4 h-4 mr-2" /> 球员能力模型</button>
                <button onClick={() => setActiveTab('profile_tags')} className={`px-4 py-2 font-bold text-sm flex items-center border-b-2 transition-colors whitespace-nowrap ${activeTab === 'profile_tags' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-500'}`}><Zap className="w-4 h-4 mr-2" /> 球员画像标签</button>
                <button onClick={() => setActiveTab('drills')} className={`px-4 py-2 font-bold text-sm flex items-center border-b-2 transition-colors whitespace-nowrap ${activeTab === 'drills' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-500'}`}><Book className="w-4 h-4 mr-2" /> 训练内容库</button>
                <button onClick={() => setActiveTab('branding')} className={`px-4 py-2 font-bold text-sm flex items-center border-b-2 transition-colors whitespace-nowrap ${activeTab === 'branding' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-500'}`}><ImageIcon className="w-4 h-4 mr-2" /> 品牌外观</button>
                <button onClick={() => setActiveTab('cloud')} className={`px-4 py-2 font-bold text-sm flex items-center border-b-2 transition-colors whitespace-nowrap ${activeTab === 'cloud' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-500'}`}><Cloud className="w-4 h-4 mr-2" /> 云端备份与数据恢复</button>
              </>
          )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-[500px]">
        {/* 其他 Tab 保持原样 ... */}
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

        {activeTab === 'salary' && isDirector && (
            <div className="flex-1 p-6 space-y-8">
                <div className="flex justify-between items-end">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 flex items-center"><Calculator className="w-5 h-5 mr-2 text-bvb-yellow" /> 教职薪酬核算规则设置</h3>
                        <p className="text-sm text-gray-500 mt-1">配置教练等级、底薪、课酬标准及绩效奖金。</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Level Bases for Head Coach */}
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                        <h4 className="font-black text-xs uppercase tracking-widest text-gray-400 mb-6 flex items-center"><Star className="w-4 h-4 mr-2" /> 主教练薪酬体系 (职级)</h4>
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

                        {/* 助理教练薪酬规则 (New) */}
                        <div className="mt-8 bg-blue-50/50 p-5 rounded-xl border border-blue-100 border-dashed">
                            <h4 className="font-black text-xs uppercase tracking-widest text-blue-600 mb-4 flex items-center"><UsersIcon className="w-4 h-4 mr-2" /> 助理教练薪酬规则</h4>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">助教基础工资 (¥)</label>
                                        <input 
                                            type="number" className="w-full p-2 border rounded font-black text-sm bg-white"
                                            value={localSalarySettings.assistantCoachBaseSalary}
                                            onChange={e => setLocalSalarySettings({...localSalarySettings, assistantCoachBaseSalary: parseInt(e.target.value) || 0})}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">助教基础课酬 (¥)</label>
                                        <input 
                                            type="number" className="w-full p-2 border rounded font-black text-sm bg-white"
                                            value={localSalarySettings.assistantCoachSessionBaseFee}
                                            onChange={e => setLocalSalarySettings({...localSalarySettings, assistantCoachSessionBaseFee: parseInt(e.target.value) || 0})}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">起算基准人数</label>
                                        <input 
                                            type="number" className="w-full p-2 border rounded font-black text-sm bg-white"
                                            value={localSalarySettings.assistantCoachMinPlayersForCalculation}
                                            onChange={e => setLocalSalarySettings({...localSalarySettings, assistantCoachMinPlayersForCalculation: parseInt(e.target.value) || 0})}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">每超1人增加 (¥)</label>
                                        <input 
                                            type="number" className="w-full p-2 border rounded font-black text-sm bg-white"
                                            value={localSalarySettings.assistantCoachIncrementalPlayerFee}
                                            onChange={e => setLocalSalarySettings({...localSalarySettings, assistantCoachIncrementalPlayerFee: parseInt(e.target.value) || 0})}
                                        />
                                    </div>
                                </div>
                            </div>
                            <p className="mt-3 text-[10px] text-blue-400 italic leading-tight">注：助教课酬计算逻辑现与主教练一致：基础课酬 + (实际人数 - 基准人数) × 增量单价。</p>
                        </div>
                    </div>

                    {/* 主教练专用的递增规则 & 公共绩效 */}
                    <div className="space-y-6">
                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                            <h4 className="font-black text-xs uppercase tracking-widest text-gray-400 mb-6 flex items-center"><TrendingUp className="w-4 h-4 mr-2" /> 主教练课酬递增规则</h4>
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
                            <div className="flex justify-between items-center mb-6">
                                <h4 className="font-black text-xs uppercase tracking-widest text-gray-400 flex items-center"><CheckSquare className="w-4 h-4 mr-2" /> 公共绩效奖励阈值设置</h4>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 rounded border-gray-300 text-bvb-yellow focus:ring-bvb-yellow"
                                            checked={localSalarySettings.enableCoachPerformanceReward}
                                            onChange={e => setLocalSalarySettings({...localSalarySettings, enableCoachPerformanceReward: e.target.checked})}
                                        />
                                        <span className="text-[10px] font-black text-gray-600 uppercase">主教练开启</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 rounded border-gray-300 text-bvb-yellow focus:ring-bvb-yellow"
                                            checked={localSalarySettings.enableAssistantPerformanceReward}
                                            onChange={e => setLocalSalarySettings({...localSalarySettings, enableAssistantPerformanceReward: e.target.checked})}
                                        />
                                        <span className="text-[10px] font-black text-gray-600 uppercase">助教开启</span>
                                    </label>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-3">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase block">月度参训率奖励 (≥ X% 奖 Y元)</label>
                                            <div className="flex gap-2 bg-white px-2 py-0.5 rounded border border-gray-200">
                                                <label className="flex items-center gap-1 cursor-pointer">
                                                    <input 
                                                        type="checkbox" className="w-3 h-3 rounded border-gray-300 text-bvb-yellow" 
                                                        checked={localSalarySettings.performanceBonusConfig?.attendance?.coach ?? true} 
                                                        onChange={e => setLocalSalarySettings({...localSalarySettings, performanceBonusConfig: {...(localSalarySettings.performanceBonusConfig || { attendance: {coach:true, assistant:true}, renewal: {coach:true, assistant:true}, evaluation: {coach:true, assistant:true} }), attendance: {...(localSalarySettings.performanceBonusConfig?.attendance || {coach:true, assistant:true}), coach: e.target.checked}}})} 
                                                    />
                                                    <span className="text-[8px] font-black text-gray-500">主教</span>
                                                </label>
                                                <label className="flex items-center gap-1 cursor-pointer">
                                                    <input 
                                                        type="checkbox" className="w-3 h-3 rounded border-gray-300 text-bvb-yellow" 
                                                        checked={localSalarySettings.performanceBonusConfig?.attendance?.assistant ?? true} 
                                                        onChange={e => setLocalSalarySettings({...localSalarySettings, performanceBonusConfig: {...(localSalarySettings.performanceBonusConfig || { attendance: {coach:true, assistant:true}, renewal: {coach:true, assistant:true}, evaluation: {coach:true, assistant:true} }), attendance: {...(localSalarySettings.performanceBonusConfig?.attendance || {coach:true, assistant:true}), assistant: e.target.checked}}})} 
                                                    />
                                                    <span className="text-[8px] font-black text-gray-500">助教</span>
                                                </label>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                const next = { ...localSalarySettings };
                                                next.monthlyAttendanceRewards.push({ threshold: 0, amount: 0 });
                                                setLocalSalarySettings(next);
                                            }}
                                            className="text-[10px] text-blue-500 hover:text-blue-700 font-bold flex items-center"
                                        >
                                            <Plus className="w-3 h-3 mr-1" /> 添加梯度
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {localSalarySettings.monthlyAttendanceRewards.map((r, i) => (
                                            <div key={i} className="flex gap-2 items-center group">
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
                                                <span className="text-xs font-bold text-gray-400 mr-2">元</span>
                                                <button 
                                                    onClick={() => {
                                                        const next = { ...localSalarySettings };
                                                        next.monthlyAttendanceRewards.splice(i, 1);
                                                        setLocalSalarySettings(next);
                                                    }}
                                                    className="p-1.5 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-gray-200">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase block">季度续费率奖励 (≥ X% 奖 Y元/人)</label>
                                        <div className="flex gap-2 bg-white px-2 py-0.5 rounded border border-gray-200">
                                            <label className="flex items-center gap-1 cursor-pointer">
                                                <input 
                                                    type="checkbox" className="w-3 h-3 rounded border-gray-300 text-bvb-yellow" 
                                                    checked={localSalarySettings.performanceBonusConfig?.renewal?.coach ?? true} 
                                                    onChange={e => setLocalSalarySettings({...localSalarySettings, performanceBonusConfig: {...(localSalarySettings.performanceBonusConfig || { attendance: {coach:true, assistant:true}, renewal: {coach:true, assistant:true}, evaluation: {coach:true, assistant:true} }), renewal: {...(localSalarySettings.performanceBonusConfig?.renewal || {coach:true, assistant:true}), coach: e.target.checked}}})} 
                                                />
                                                <span className="text-[8px] font-black text-gray-500">主教</span>
                                            </label>
                                            <label className="flex items-center gap-1 cursor-pointer">
                                                <input 
                                                    type="checkbox" className="w-3 h-3 rounded border-gray-300 text-bvb-yellow" 
                                                    checked={localSalarySettings.performanceBonusConfig?.renewal?.assistant ?? true} 
                                                    onChange={e => setLocalSalarySettings({...localSalarySettings, performanceBonusConfig: {...(localSalarySettings.performanceBonusConfig || { attendance: {coach:true, assistant:true}, renewal: {coach:true, assistant:true}, evaluation: {coach:true, assistant:true} }), renewal: {...(localSalarySettings.performanceBonusConfig?.renewal || {coach:true, assistant:true}), assistant: e.target.checked}}})} 
                                                />
                                                <span className="text-[8px] font-black text-gray-500">助教</span>
                                            </label>
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-blue-500 font-bold mb-2">注：达到阈值后，按实际续费人数发放奖励（每人 Y 元）。</p>
                                    <div className="flex gap-2 items-center">
                                        <input type="number" className="w-20 p-2 border rounded font-black text-xs" value={localSalarySettings.quarterlyRenewalReward.threshold} onChange={e => setLocalSalarySettings({...localSalarySettings, quarterlyRenewalReward: {...localSalarySettings.quarterlyRenewalReward, threshold: parseInt(e.target.value) || 0}})} />
                                        <span className="text-xs font-bold text-gray-400">%</span>
                                        <input type="number" className="flex-1 p-2 border rounded font-black text-xs" value={localSalarySettings.quarterlyRenewalReward.amount} onChange={e => setLocalSalarySettings({...localSalarySettings, quarterlyRenewalReward: {...localSalarySettings.quarterlyRenewalReward, amount: parseInt(e.target.value) || 0}})} />
                                        <span className="text-xs font-bold text-gray-400">元/人</span>
                                    </div>
                                    <div className="flex gap-2 items-center mt-2">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">单次充值 ≥</span>
                                        <input type="number" className="w-16 p-2 border rounded font-black text-xs" value={localSalarySettings.quarterlyRenewalReward.minRechargeAmount} onChange={e => setLocalSalarySettings({...localSalarySettings, quarterlyRenewalReward: {...localSalarySettings.quarterlyRenewalReward, minRechargeAmount: parseInt(e.target.value) || 0}})} />
                                        <span className="text-xs font-bold text-gray-400 uppercase">节课才计入续费统计</span>
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-gray-200">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase block italic">教练员综合评价绩效分配金额 (¥)</label>
                                        <div className="flex gap-2 bg-white px-2 py-0.5 rounded border border-gray-200">
                                            <label className="flex items-center gap-1 cursor-pointer">
                                                <input 
                                                    type="checkbox" className="w-3 h-3 rounded border-gray-300 text-bvb-yellow" 
                                                    checked={localSalarySettings.performanceBonusConfig?.evaluation?.coach ?? true} 
                                                    onChange={e => setLocalSalarySettings({...localSalarySettings, performanceBonusConfig: {...(localSalarySettings.performanceBonusConfig || { attendance: {coach:true, assistant:true}, renewal: {coach:true, assistant:true}, evaluation: {coach:true, assistant:true} }), evaluation: {...(localSalarySettings.performanceBonusConfig?.evaluation || {coach:true, assistant:true}), coach: e.target.checked}}})} 
                                                />
                                                <span className="text-[8px] font-black text-gray-500">主教</span>
                                            </label>
                                            <label className="flex items-center gap-1 cursor-pointer">
                                                <input 
                                                    type="checkbox" className="w-3 h-3 rounded border-gray-300 text-bvb-yellow" 
                                                    checked={localSalarySettings.performanceBonusConfig?.evaluation?.assistant ?? true} 
                                                    onChange={e => setLocalSalarySettings({...localSalarySettings, performanceBonusConfig: {...(localSalarySettings.performanceBonusConfig || { attendance: {coach:true, assistant:true}, renewal: {coach:true, assistant:true}, evaluation: {coach:true, assistant:true} }), evaluation: {...(localSalarySettings.performanceBonusConfig?.evaluation || {coach:true, assistant:true}), assistant: e.target.checked}}})} 
                                                />
                                                <span className="text-[8px] font-black text-gray-500">助教</span>
                                            </label>
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-blue-500 font-bold mb-2">注：月度综合评价均分 &gt; 8 分时，发放该全额绩效奖金。</p>
                                    <div className="flex gap-2 items-center">
                                        <input 
                                            type="number" 
                                            className="flex-1 p-2 border rounded font-black text-xs bg-white" 
                                            value={localSalarySettings.evaluationAllocation || 0} 
                                            onChange={e => setLocalSalarySettings({...localSalarySettings, evaluationAllocation: parseInt(e.target.value) || 0})} 
                                        />
                                        <span className="text-xs font-bold text-gray-400">元</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 六大核心业务考评与契约化奖卡开关规范 */}
                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-4">
                            <div className="flex items-center gap-2">
                                <CheckSquare className="w-4 h-4 text-bvb-yellow" />
                                <h4 className="font-black text-xs uppercase tracking-widest text-gray-800">业务考评与执行奖惩配置</h4>
                            </div>
                            <p className="text-[10px] text-gray-500 leading-normal">
                                开启/关闭特定的青训业务督考和底线扣罚，设定考核角色对象（主教/助教），调整基准金额，并支持随时补充自定义考核点与明细。
                            </p>
                            
                            <div className="space-y-4">
                                {(Object.keys(localSalarySettings.assessmentRules || {}) as Array<keyof AssessmentRulesConfig>).map((key) => {
                                    const rule = localSalarySettings.assessmentRules?.[key];
                                    if (!rule) return null;
                                    
                                    const labelMap: Record<string, string> = {
                                        assistantSupervision: '助教监督考评 (日常带训)',
                                        directorLogAudit: '青训总监监督考评 (训练日志)',
                                        periodizationPlan: '周期计划目标考核 (季度学期)',
                                        playerReview: '球员跟踪录入考核 (Quarterly 跟踪)',
                                        quarterlyAttendance: '季度全勤奖 (总监评定奖)',
                                        monthlyExecution: '月度执行奖 (业务考核正向激励)'
                                    };
                                    
                                    const amountLabelMap: Record<string, string> = {
                                        assistantSupervision: '单次缺项扣罚金额 (元/次)',
                                        directorLogAudit: '日志逾期扣罚金额 (元/天)',
                                        periodizationPlan: '未录扣减底薪比例 (%)',
                                        playerReview: '漏录未完成扣罚金额 (元/人)',
                                        quarterlyAttendance: '评定全勤奖励金额 (元/季)',
                                        monthlyExecution: '月度执行优秀奖上限 (元/月)'
                                    };

                                    return (
                                        <div key={key} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3 transition-colors hover:border-gray-300">
                                            {/* Switch Header */}
                                            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                                                <span className="font-extrabold text-[11px] text-gray-800">{labelMap[key]}</span>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        className="sr-only peer" 
                                                        checked={rule.enabled}
                                                        onChange={e => {
                                                            const next = { ...localSalarySettings };
                                                            if (next.assessmentRules?.[key]) {
                                                                next.assessmentRules[key].enabled = e.target.checked;
                                                            }
                                                            setLocalSalarySettings(next);
                                                        }}
                                                    />
                                                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-bvb-yellow"></div>
                                                    <span className="ml-2 text-[9px] font-black text-gray-500 uppercase">{rule.enabled ? '已启用' : '已关闭'}</span>
                                                </label>
                                            </div>

                                            {rule.enabled && (
                                                <div className="space-y-3 pt-1">
                                                    {/* Config Row */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">考核/奖励对象</label>
                                                            <div className="flex gap-3 py-1.5 px-2 bg-gray-50 rounded border border-gray-200">
                                                                <label className="flex items-center gap-1 cursor-pointer">
                                                                    <input 
                                                                        type="checkbox" 
                                                                        className="w-3.5 h-3.5 rounded border-gray-300 text-bvb-yellow focus:ring-bvb-yellow"
                                                                        checked={rule.assessCoaches}
                                                                        onChange={e => {
                                                                            const next = { ...localSalarySettings };
                                                                            if (next.assessmentRules?.[key]) {
                                                                                next.assessmentRules[key].assessCoaches = e.target.checked;
                                                                            }
                                                                            setLocalSalarySettings(next);
                                                                        }}
                                                                    />
                                                                    <span className="text-[10px] font-bold text-gray-700">教练员</span>
                                                                </label>
                                                                <label className="flex items-center gap-1 cursor-pointer">
                                                                    <input 
                                                                        type="checkbox" 
                                                                        className="w-3.5 h-3.5 rounded border-gray-300 text-bvb-yellow focus:ring-bvb-yellow"
                                                                        checked={rule.assessAssistants}
                                                                        onChange={e => {
                                                                            const next = { ...localSalarySettings };
                                                                            if (next.assessmentRules?.[key]) {
                                                                                next.assessmentRules[key].assessAssistants = e.target.checked;
                                                                            }
                                                                            setLocalSalarySettings(next);
                                                                        }}
                                                                    />
                                                                    <span className="text-[10px] font-bold text-gray-700">助理教练/助教</span>
                                                                </label>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">{amountLabelMap[key]}</label>
                                                            <input 
                                                                type="number" 
                                                                className="w-full p-1.5 border border-gray-200 rounded font-black text-xs bg-white text-right outline-none focus:border-bvb-yellow" 
                                                                value={rule.amount}
                                                                onChange={e => {
                                                                    const next = { ...localSalarySettings };
                                                                    if (next.assessmentRules?.[key]) {
                                                                        next.assessmentRules[key].amount = parseInt(e.target.value) || 0;
                                                                    }
                                                                    setLocalSalarySettings(next);
                                                                }}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Timing Row */}
                                                    <div>
                                                        <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">具体考核考评时间点</label>
                                                        <input 
                                                            type="text" 
                                                            className="w-full p-1.5 border border-gray-200 rounded text-xs bg-white text-gray-700 font-medium outline-none focus:border-bvb-yellow" 
                                                            value={rule.timing}
                                                            onChange={e => {
                                                                const next = { ...localSalarySettings };
                                                                if (next.assessmentRules?.[key]) {
                                                                    next.assessmentRules[key].timing = e.target.value;
                                                                }
                                                                setLocalSalarySettings(next);
                                                            }}
                                                        />
                                                    </div>

                                                    {/* Content Row */}
                                                    <div>
                                                        <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">具体考核项目及明细内容</label>
                                                        <textarea 
                                                            rows={2}
                                                            className="w-full p-1.5 border border-gray-200 rounded text-[11px] bg-white text-gray-600 font-medium resize-none leading-relaxed outline-none focus:border-bvb-yellow" 
                                                            value={rule.content}
                                                            onChange={e => {
                                                                const next = { ...localSalarySettings };
                                                                if (next.assessmentRules?.[key]) {
                                                                    next.assessmentRules[key].content = e.target.value;
                                                                }
                                                                setLocalSalarySettings(next);
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* 其他 Tab 的渲染代码省略，保持原样 */}
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
                 <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center"><UsersIcon className="w-5 h-5 mr-2 text-bvb-yellow" /> 用户与角色管理</h3>
                <div className={`p-6 rounded-2xl border transition-all ${editingUserId ? 'bg-yellow-50 border-bvb-yellow shadow-inner' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex justify-between items-center mb-5">
                        <h4 className="font-black text-sm text-gray-700 flex items-center uppercase tracking-widest">{editingUserId ? <><Edit2 className="w-4 h-4 mr-2 text-bvb-yellow" /> 编辑账户信息</> : <><Plus className="w-4 h-4 mr-2 text-bvb-yellow" /> 创建新账户</>}</h4>
                        {editingUserId && <button onClick={cancelEditUser} className="text-xs text-gray-400 hover:text-red-500 flex items-center font-bold"><X className="w-3 h-3 mr-1" /> 放弃修改</button>}
                    </div>
                    <form onSubmit={handleUserFormSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">入职时间</label>
                                <input type="date" className="w-full p-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-bvb-yellow text-sm font-bold bg-white" value={newUser.joiningDate || ''} onChange={e => setNewUser({...newUser, joiningDate: e.target.value})} />
                            </div>
                            {newUser.role === 'coach' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:col-span-2 lg:col-span-1">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">教练等级</label>
                                        <select className="w-full p-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-bvb-yellow text-sm font-bold bg-white" value={newUser.level} onChange={e => setNewUser({...newUser, level: e.target.value as CoachLevel})}>
                                            {COACH_LEVELS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                                        </select>
                                    </div>
                                    {newUser.level === 'Apprentice' && (
                                        <div className="flex items-center gap-2 pt-5">
                                            <input 
                                                id="isTrial" 
                                                type="checkbox" 
                                                className="w-4 h-4 text-bvb-yellow border-gray-300 rounded focus:ring-bvb-yellow cursor-pointer"
                                                checked={newUser.isTrial || false}
                                                onChange={e => setNewUser({...newUser, isTrial: e.target.checked})}
                                            />
                                            <label htmlFor="isTrial" className="text-xs font-bold text-gray-700 cursor-pointer select-none">
                                                处于试岗期间 (50元/课时且无底薪)
                                            </label>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

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
                                    <div className="flex flex-col items-center gap-1 shrink-0">
                                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center border-2 border-white shadow-sm relative">
                                            <UsersIcon className="w-6 h-6 text-gray-400" />
                                        </div>
                                        {u.joiningDate && (
                                            <span className="text-[9px] bg-bvb-black text-bvb-yellow font-black px-2 py-0.5 rounded-full scale-90 whitespace-nowrap">
                                                已执教 {getCoachingTenure(u.joiningDate)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="font-black text-gray-800 text-lg leading-none">{u.name}</span>
                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border tracking-tighter ${u.role === 'director' ? 'bg-purple-50 text-purple-600 border-purple-100' : u.role === 'coach' ? 'bg-blue-50 text-blue-600 border-blue-100' : u.role === 'assistant_coach' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-gray-50 text-gray-500'}`}>{u.role === 'coach' ? '主教练' : u.role === 'assistant_coach' ? '助教' : u.role}</span>
                                            {u.role === 'coach' && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[9px] font-black text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                                        {u.level === 'Apprentice' ? '见习' : u.level === 'Junior' ? '初级' : u.level === 'Intermediate' ? '常驻' : u.level === 'Senior' ? '核心' : u.level || 'Junior'}
                                                    </span>
                                                    {u.level === 'Apprentice' && (
                                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${u.isTrial ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                                                            {u.isTrial ? '试岗期 (50/课时)' : '正式 (底薪200)'}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 font-bold">
                                            <span className="flex items-center gap-1 font-mono">ID: {u.username}</span>
                                            {u.joiningDate && (
                                                <span className="flex items-center gap-1 text-emerald-600">
                                                    <CalendarIcon className="w-3 h-3" /> 入职: {u.joiningDate}
                                                </span>
                                            )}
                                            {(u.teamIds && u.teamIds.length > 0) && (
                                                <span className="flex items-center gap-1 text-blue-500">
                                                    <Shirt className="w-3 h-3" /> 负责: {u.teamIds.map(tid => teams.find(t => t.id === tid)?.name || tid).join(', ')}
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



        {activeTab === 'attributes' && isDirector && (
            <div className="flex-1 p-6 space-y-8">
                <div>
                    <h3 className="text-xl font-bold text-gray-800 flex items-center"><Target className="w-5 h-5 mr-2 text-bvb-yellow" /> 球员能力评价模型</h3>
                    <p className="text-sm text-gray-500 mt-1">定义球员在技术、战术、身体和心理四个维度的评价指标。</p>
                </div>

                <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
                    {(['technical', 'tactical', 'physical', 'mental'] as AttributeCategory[]).map(cat => (
                        <button 
                            key={cat} 
                            onClick={() => setActiveCategory(cat)}
                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${activeCategory === cat ? 'bg-white text-bvb-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {categoryLabels[cat]}
                        </button>
                    ))}
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <label className="block text-sm font-bold text-gray-600 mb-2">新增{categoryLabels[activeCategory]}指标</label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="输入指标名称..." 
                            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bvb-yellow font-bold" 
                            value={newItemName} 
                            onChange={(e) => setNewItemName(e.target.value)} 
                        />
                        <button onClick={handleAddAttribute} className="px-6 py-2 bg-bvb-black text-white text-xs font-black rounded-lg flex items-center gap-2">
                            <Plus className="w-4 h-4" /> 添加指标
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {localConfig[activeCategory].map(attr => (
                        <div key={attr.key} className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-xl shadow-sm group hover:border-bvb-yellow transition-all">
                            <span className="font-bold text-gray-700">{attr.label}</span>
                            <button onClick={() => handleDeleteAttribute(activeCategory, attr.key)} className="text-gray-200 hover:text-red-500 transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'profile_tags' && isDirector && (
            <div className="flex-1 p-6 space-y-8">
                <div>
                    <h3 className="text-xl font-bold text-gray-800 flex items-center"><Zap className="w-5 h-5 mr-2 text-bvb-yellow" /> 球员画像标签设置</h3>
                    <p className="text-sm text-gray-500 mt-1">配置球员档案中“球员画像”所使用的可选标签。</p>
                </div>

                <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit overflow-x-auto no-scrollbar">
                    {[
                        { id: 'playerTypes', label: '球员类型' },
                        { id: 'technicalStrengths', label: '技术强项' },
                        { id: 'personalityTraits', label: '性格特点' },
                        { id: 'behavioralTraits', label: '行为特点' },
                        { id: 'coachingReminders', label: '指导提醒' },
                    ].map(group => (
                        <button 
                            key={group.id} 
                            onClick={() => setActiveTagGroup(group.id as any)}
                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all whitespace-nowrap ${activeTagGroup === group.id ? 'bg-white text-bvb-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {group.label}
                        </button>
                    ))}
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <label className="block text-sm font-bold text-gray-600 mb-2">
                        新增{[
                            { id: 'playerTypes', label: '球员类型' },
                            { id: 'technicalStrengths', label: '技术强项' },
                            { id: 'personalityTraits', label: '性格特点' },
                            { id: 'behavioralTraits', label: '行为特点' },
                            { id: 'coachingReminders', label: '指导提醒' },
                        ].find(g => g.id === activeTagGroup)?.label}标签
                    </label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="输入标签名称..." 
                            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bvb-yellow font-bold" 
                            value={newItemName} 
                            onChange={(e) => setNewItemName(e.target.value)} 
                        />
                        <button onClick={handleAddProfileTag} className="px-6 py-2 bg-bvb-black text-white text-xs font-black rounded-lg flex items-center gap-2">
                            <Plus className="w-4 h-4" /> 添加标签
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {((localConfig[activeTagGroup as keyof AttributeConfig] as string[]) || []).map(tag => (
                        <div key={tag} className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-xl shadow-sm group hover:border-bvb-yellow transition-all">
                            <span className="font-bold text-gray-700">{tag}</span>
                            <button onClick={() => handleDeleteProfileTag(activeTagGroup, tag)} className="text-gray-200 hover:text-red-500 transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {(!localConfig[activeTagGroup as keyof AttributeConfig] || (localConfig[activeTagGroup as keyof AttributeConfig] as string[]).length === 0) && (
                        <p className="col-span-full text-center py-8 text-gray-400 font-bold italic">暂无标签项，请点击上方按钮添加。</p>
                    )}
                </div>
            </div>
        )}

        {activeTab === 'drills' && isDirector && (
            <div className="flex-1 p-6 space-y-8">
                <div>
                    <h3 className="text-xl font-bold text-gray-800 flex items-center"><Book className="w-5 h-5 mr-2 text-bvb-yellow" /> 训练内容库 (快速录入)</h3>
                    <p className="text-sm text-gray-500 mt-1">预设常用的训练项目名称，方便在制定计划时快速添加。</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <label className="block text-sm font-bold text-gray-600 mb-2">新增训练项目</label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="例如：5v2 抢圈、折返跑..." 
                            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bvb-yellow font-bold" 
                            value={newItemName} 
                            onChange={(e) => setNewItemName(e.target.value)} 
                        />
                        <button onClick={handleAddDrill} className="px-6 py-2 bg-bvb-black text-white text-xs font-black rounded-lg flex items-center gap-2">
                            <Plus className="w-4 h-4" /> 添加到库
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {localConfig.drillLibrary.map(drill => (
                        <div key={drill} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-lg shadow-sm group hover:bg-gray-50 transition-colors">
                            <span className="text-sm font-bold text-gray-700">{drill}</span>
                            <button onClick={() => handleDeleteDrill(drill)} className="text-gray-200 hover:text-red-500 transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
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

        {activeTab === 'branding' && isDirector && (
            <div className="flex-1 p-6 flex flex-col items-center justify-center">
                <div className="w-full max-lg bg-gray-50 p-8 rounded-xl border border-gray-200 text-center">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center justify-center"><ImageIcon className="w-5 h-5 mr-2 text-bvb-yellow" /> 应用 Logo 设置</h3>
                    <div className="mb-8 flex flex-col items-center"><div className="w-32 h-32 bg-white rounded-full flex items-center justify-center border-4 border-white shadow-lg overflow-hidden mb-4">{appLogo ? <img src={appLogo} alt="App Logo" className="w-full h-full object-contain" /> : <span className="text-gray-300 font-bold">No Logo</span>}</div></div>
                    <div className="relative group w-full"><input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" /><div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-bvb-yellow hover:bg-yellow-50 transition-colors flex flex-col items-center justify-center"><Upload className="w-8 h-8 text-gray-400 mb-2" /><span className="font-bold text-gray-600">点击上传新 Logo 图片</span></div></div>
                </div>
            </div>
        )}

        {activeTab === 'cloud' && isDirector && (
            <CloudManager onRestoreSystem={onRestoreSystem} />
        )}
      </div>
    </div>
  );
};

const CloudManager: React.FC<{ onRestoreSystem?: (data: any) => void }> = ({ onRestoreSystem }) => {
  const [backups, setBackups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBackupActionPending, setIsBackupActionPending] = useState(false);

  const fetchBackups = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/storage?listBackups=true');
      const data = await res.json();
      if (data.success) {
        setBackups(data.blobs || []);
      } else {
        setError(data.message || '获取云端备份列表失败');
      }
    } catch (err: any) {
      setError('无法与云端API建立连接: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateManualBackup = async () => {
    setIsBackupActionPending(true);
    try {
      const res = await fetch('/api/storage?action=createManualBackup');
      const data = await res.json();
      if (data.success) {
        alert('云端数据快照手动创建成功！备份文件名：' + data.pathname);
        fetchBackups();
      } else {
        alert('创建备份失败: ' + (data.error || '未知原因'));
      }
    } catch (err: any) {
      alert('发生通信错误: ' + err.message);
    } finally {
      setIsBackupActionPending(false);
    }
  };

  const handleRestore = async (backupUrl: string, uploadedAt: string, size: number) => {
    const formattedDate = new Date(uploadedAt).toLocaleString('zh-CN');
    const formattedSize = (size / 1024 / 1024).toFixed(2) + ' MB';
    
    const doubleCheck = confirm(
      `⚠️【数据恢复安全警告】\n\n` +
      `确认覆盖并重置您当前的整个俱乐部数据库吗？\n\n` +
      `您选择的备份快照信息:\n` +
      `- 上传时间: ${formattedDate}\n` +
      `- 备份大小: ${formattedSize}\n\n` +
      `确认后，系统将自动从此还原全站数据（包括所有 95 名球员、训练课等）。该操作不可撤销，请确认。`
    );

    if (!doubleCheck) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/storage?restoreFromUrl=${encodeURIComponent(backupUrl)}`);
      const data = await res.json();
      if (data.success) {
        alert('🎉 数据库结构恢复成功！全站球员成长记录已为您找回恢复完毕！');
        if (onRestoreSystem) {
          onRestoreSystem(data.data);
        }
      } else {
        alert('系统还原失败: ' + (data.error || '未知网络问题'));
      }
    } catch (err: any) {
       alert('系统还原执行过程中出现异常: ' + err.message);
    } finally {
       setIsLoading(false);
    }
  };

  return (
     <div className="flex-1 p-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50 p-4 rounded-xl border border-gray-200/60 gap-4">
           <div>
              <h3 className="text-lg font-bold text-gray-800 flex items-center md:text-xl">
                 <Database className="w-5 h-5 mr-2 text-bvb-yellow" />
                 云端备份恢复 & 数据库快照管理
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                 一键下载并覆盖当前的球员成长与俱乐部青训系统。可自由选择任何云端的有效数据恢复时间。
              </p>
           </div>
           
           <div className="flex gap-2 w-full md:w-auto shrink-0">
              <button 
                onClick={fetchBackups} 
                disabled={isLoading}
                className="flex items-center justify-center px-4 py-2 bg-white text-gray-700 font-bold border rounded-lg shadow-sm hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
              >
                 <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
                 刷新备份列表
              </button>
              <button 
                onClick={handleCreateManualBackup} 
                disabled={isBackupActionPending}
                className="flex items-center justify-center px-4 py-2 bg-bvb-yellow text-bvb-black font-black rounded-lg shadow-md hover:brightness-105 transition-colors text-sm disabled:opacity-50"
              >
                 <FileJson className="w-4 h-4 mr-1.5" />
                 手动点云备份
              </button>
           </div>
        </div>

        {error && (
            <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-lg flex items-start text-amber-800 gap-3">
               <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
               <div>
                  <h4 className="font-bold text-sm">云端连接受阻或Token配置不完整</h4>
                  <p className="text-xs mt-1 text-amber-700">{error}</p>
               </div>
            </div>
        )}

        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
           <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widery flex items-center gap-1.5">
                 <History className="w-4 h-4 text-gray-500" />
                 可用于一键恢复的云端备份节点 ({backups.length})
              </span>
              <span className="text-[10px] text-gray-400 font-mono">VERCEL BLOB STORAGE STORAGE_STATUS: ENABLED</span>
           </div>

           {isLoading && backups.length === 0 ? (
               <div className="p-12 flex flex-col items-center justify-center text-gray-400 gap-2">
                  <RefreshCw className="w-8 h-8 animate-spin text-bvb-yellow" />
                  <span className="text-xs font-bold text-gray-500">正在查询 Vercel Blob 云端存储节点...</span>
               </div>
           ) : backups.length === 0 ? (
               <div className="p-12 flex flex-col items-center justify-center text-gray-400 text-center gap-3">
                  <Database className="w-12 h-12 text-gray-300" />
                  <div>
                     <p className="text-sm font-bold text-gray-700">未发现云端备份</p>
                     <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                        数据尚未上传，或是由于云端账户变动。建议点击右上方“手动点云备份”开始录入云端快照！
                     </p>
                  </div>
               </div>
           ) : (
               <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                   {backups.map((blob) => {
                      const isPrimary = blob.pathname === 'football_manager_db.json';
                      const isLargeBackup = blob.size > 2000000; // May 29th is 4.25 MB

                      return (
                         <div key={blob.url} className={`p-4 flex flex-col lg:flex-row justify-between items-start lg:items-center hover:bg-gray-50/50 transition-colors gap-3 ${isPrimary ? 'bg-yellow-50/20' : ''}`}>
                            <div className="flex items-start gap-3">
                               <div className="p-2 bg-gray-100 rounded-lg text-gray-500 shrink-0 mt-0.5">
                                  <FileJson className="w-5 h-5 text-gray-600" />
                               </div>
                               <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                     <span className="font-bold text-gray-900 text-sm font-mono break-all max-w-[280px] lg:max-w-none">
                                        {blob.pathname}
                                     </span>
                                     {isPrimary && (
                                        <span className="bg-green-100 text-green-800 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                                           <span>● 线上主用主库 (系统当前读取)</span>
                                        </span>
                                     )}
                                     {isLargeBackup && (
                                        <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                                           ✨ 历史全量数据备份 (95名球员/122训练课)
                                        </span>
                                     )}
                                  </div>
                                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-1.5 flex-wrap">
                                     <span className="flex items-center gap-1">
                                        <History className="w-3.5 h-3.5 text-gray-400" />
                                        {new Date(blob.uploadedAt).toLocaleString('zh-CN')}
                                     </span>
                                     <span>•</span>
                                     <span className="font-mono bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                                        {(blob.size / 1024 / 1024).toFixed(3)} MB
                                     </span>
                                  </div>
                               </div>
                            </div>

                            <button 
                              onClick={() => handleRestore(blob.url, blob.uploadedAt, blob.size)}
                              className="w-full lg:w-auto px-4 py-1.5 bg-bvb-black text-white hover:bg-bvb-yellow hover:text-bvb-black font-black rounded-lg text-xs transition-all shadow-sm shrink-0 flex items-center justify-center gap-1"
                            >
                               <span>完全恢复该历史节点</span>
                               <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                         </div>
                      );
                   })}
               </div>
           )}
        </div>
        
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/50 flex items-start gap-3">
           <AlertTriangle className="w-5 h-5 text-bvb-yellow shrink-0 mt-0.5" />
           <div className="text-xs text-gray-600 leading-relaxed">
              <span className="font-black text-gray-800">重要安全操作须知：</span>
              恢复操作将更新本站所有教练角色可见的数据内容。系统会自动将此次更新推送到云端主服务器。建议您在还原旧数据之前，先进行一次“手动点云备份”来保存当前编辑。
           </div>
        </div>
     </div>
  );
};

export default Settings;
