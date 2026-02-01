
import React, { useState } from 'react';
import { AttributeConfig, AttributeCategory, User, Team, RolePermissions, ModuleId, PermissionLevel, UserRole, FinanceCategoryDefinition, SalarySettings, CoachLevel } from '../types';
// Comment: Added missing Info icon to lucide-react imports
import { Settings as SettingsIcon, Plus, Trash2, Save, Book, Activity, Brain, Dumbbell, Target, CheckSquare, Users, RotateCcw, Lock, KeyRound, Image as ImageIcon, Upload, CheckCircle, Edit2, X, ShieldAlert, Eye, EyeOff, Wallet, ArrowUpRight, ArrowDownRight, Zap, TrendingUp, Calculator, ShieldCheck, Star, Shirt, Square, UserMinus, UserCheck, Info } from 'lucide-react';

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

// 常量定义省略...

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
  // 其它状态省略...

  const handleSaveSalarySettings = () => {
      onUpdateSalarySettings(localSalarySettings);
      alert('薪酬核算规则已更新！助教将按在册人数计算月度补助。');
  };

  // handleAddAttribute 等逻辑省略...

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-3xl font-black text-bvb-black uppercase">系统设置</h2>
           <p className="text-gray-500">管理俱乐部底层配置与账户安全。</p>
        </div>
        {isDirector && activeTab === 'salary' && (
            <button onClick={handleSaveSalarySettings} className="flex items-center px-6 py-2 bg-bvb-black text-bvb-yellow font-bold rounded-lg shadow-md hover:brightness-110 transition-colors">
                <Calculator className="w-5 h-5 mr-2" /> 保存薪酬规则
            </button>
        )}
        {/* 其它 Tab 的保存按钮省略... */}
      </div>

      <div className="flex gap-4 border-b border-gray-200 overflow-x-auto no-scrollbar">
          {/* Tabs 切换按钮省略... */}
          <button onClick={() => setActiveTab('salary')} className={`px-4 py-2 font-bold text-sm flex items-center border-b-2 transition-colors whitespace-nowrap ${activeTab === 'salary' ? 'border-bvb-yellow text-bvb-black' : 'border-transparent text-gray-500'}`}><Calculator className="w-4 h-4 mr-2" /> 薪酬规则配置</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-[500px]">
        {activeTab === 'salary' && isDirector && (
            <div className="flex-1 p-6 space-y-8 animate-in fade-in duration-300">
                <div className="flex justify-between items-end">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 flex items-center"><Calculator className="w-5 h-5 mr-2 text-bvb-yellow" /> 教职薪酬核算规则</h3>
                        <p className="text-sm text-gray-500 mt-1">主教练按“课时”结算，助教按“管理人数”结算补助。</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* 主教练部分 */}
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                        <h4 className="font-black text-xs uppercase tracking-widest text-gray-400 mb-6 flex items-center"><Star className="w-4 h-4 mr-2" /> 主教练职级薪酬 (课时制)</h4>
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
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">基础课酬 (¥/课)</label>
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

                    <div className="space-y-6">
                        {/* 助理教练部分 - 核心调整 */}
                        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                            <h4 className="font-black text-xs uppercase tracking-widest text-blue-600 mb-6 flex items-center"><Users className="w-4 h-4 mr-2" /> 助理教练薪酬 (管理人数制)</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">助教基础底薪 (¥)</label>
                                    <input 
                                        type="number" className="w-full p-3 border rounded-xl font-black text-sm bg-white focus:ring-2 focus:ring-blue-300 outline-none"
                                        value={localSalarySettings.assistantCoachBaseSalary}
                                        onChange={e => setLocalSalarySettings({...localSalarySettings, assistantCoachBaseSalary: parseInt(e.target.value) || 0})}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">每名学员补贴 (¥/人)</label>
                                    <input 
                                        type="number" className="w-full p-3 border rounded-xl font-black text-sm bg-white focus:ring-2 focus:ring-blue-300 outline-none"
                                        value={localSalarySettings.assistantCoachPlayerRate}
                                        onChange={e => setLocalSalarySettings({...localSalarySettings, assistantCoachPlayerRate: parseInt(e.target.value) || 0})}
                                    />
                                </div>
                            </div>
                            <div className="mt-4 p-3 bg-white/50 rounded-lg border border-blue-100 flex items-start gap-2">
                                <Info className="w-4 h-4 text-blue-500 mt-0.5" />
                                <p className="text-[10px] text-blue-700 leading-relaxed font-bold italic">
                                    核算逻辑：月度总工资 = 底薪 + (所带梯队在册球员数 × 补贴单价)。<br/>
                                    注意：该补助按月发放一次，不随课时数增加。
                                </p>
                            </div>
                        </div>

                        {/* 公共绩效部分 */}
                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                            <h4 className="font-black text-xs uppercase tracking-widest text-gray-400 mb-6 flex items-center"><TrendingUp className="w-4 h-4 mr-2" /> 公共激励与续费奖 (主/助教通用)</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">季度续费奖励 (≥ X% 奖 Y元)</label>
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
        {/* 其它 Tab 的渲染省略... */}
      </div>
    </div>
  );
};

export default Settings;
