
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Player, Position, Team, PlayerStats, AttributeConfig, AttributeCategory, TrainingSession, PlayerReview, User, ApprovalStatus, PlayerPhoto } from '../types';
import { Search, Plus, Shield, ChevronRight, X, Save, Trash2, Edit2, Activity, Brain, Dumbbell, Target, CheckSquare, ArrowRightLeft, Upload, User as UserIcon, Calendar as CalendarIcon, CreditCard, Cake, MoreHorizontal, Star, Crown, ChevronDown, FileText, Loader2, Sparkles, Download, Clock, AlertTriangle, History, Filter, CheckCircle, Send, Globe, AlertCircle, ClipboardCheck, XCircle, FileSpreadsheet, Cloud, RefreshCw, ChevronLeft, Phone, School, CalendarDays, FileDown, LayoutGrid, LayoutList, Image as ImageIcon } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { generatePlayerReview } from '../services/geminiService';
import { exportToPDF } from '../services/pdfService';

interface PlayerManagerProps {
  teams: Team[];
  players: Player[];
  trainings?: TrainingSession[];
  attributeConfig: AttributeConfig;
  currentUser: User | null; // Pass current user for permissions
  onAddPlayer: (player: Player) => void;
  onBulkAddPlayers: (players: Player[]) => void;
  onAddTeam: (team: Team) => void;
  onDeleteTeam: (teamId: string) => void;
  onUpdatePlayer: (player: Player) => void;
  onDeletePlayer: (playerId: string) => void;
  onBulkDeletePlayers: (playerIds: string[]) => void;
  onTransferPlayers: (playerIds: string[], targetTeamId: string) => void;
  onAddPlayerReview: (playerId: string, review: PlayerReview) => void;
  onRechargePlayer: (playerId: string, amount: number, leaveQuota: number) => void;
  onBulkRechargePlayers: (playerIds: string[], amount: number, leaveQuota: number) => void;
  onDeleteRecharge: (playerId: string, rechargeId: string) => void;
  initialFilter?: string;
  appLogo?: string;
}

// --- Helper Functions ---

const calculateTenure = (dateStr?: string) => {
    if (!dateStr) return null;
    const start = new Date(dateStr);
    const now = new Date();
    if (isNaN(start.getTime())) return null;

    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();

    if (months < 0) {
        years--;
        months += 12;
    }

    if (years < 0) return '刚刚入队';
    if (years === 0 && months === 0) return '不满1个月';

    let result = '';
    if (years > 0) result += `${years}年`;
    if (months > 0) result += `${months}个月`;
    
    return result;
};

const getOverallRating = (player: Player): string => {
  const sourceStats = player.lastPublishedStats || player.stats;
  let total = 0;
  let count = 0;
  (['technical', 'tactical', 'physical', 'mental'] as AttributeCategory[]).forEach(cat => {
    if (sourceStats[cat]) {
      Object.values(sourceStats[cat]).forEach(val => {
          total += val;
          count++;
      });
    }
  });
  return count === 0 ? '0.0' : (total / count).toFixed(1);
};

const calculateAttendanceRate = (player: Player, trainings: TrainingSession[], scope: 'month' | 'quarter' | 'year') => {
    if (!trainings || trainings.length === 0) return 0;
    
    const now = new Date();
    let startDate = new Date();

    if (scope === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (scope === 'quarter') {
      startDate.setMonth(now.getMonth() - 3);
    } else {
      startDate.setFullYear(now.getFullYear() - 1);
    }

    const validSessions = trainings.filter(t => {
        const tDate = new Date(t.date);
        return t.teamId === player.teamId && tDate >= startDate && tDate <= now;
    });
    
    if (validSessions.length === 0) return 0;
    
    const presentCount = validSessions.filter(t => 
      t.attendance?.some(r => r.playerId === player.id && r.status === 'Present')
    ).length;

    return Math.round((presentCount / validSessions.length) * 100);
};

const getBirthdayStatus = (dateStr: string) => {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return null;

  let nextBirthday = new Date(today.getFullYear(), m - 1, d);
  if (nextBirthday < today) {
      nextBirthday.setFullYear(today.getFullYear() + 1);
  }

  const diffTime = nextBirthday.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return { label: '今天生日', color: 'bg-pink-500' };
  if (diffDays <= 7) return { label: `${diffDays}天后生日`, color: 'bg-blue-500' };
  return null;
};

const isExpired = (dateStr?: string) => {
    if (!dateStr) return true;
    return new Date(dateStr) < new Date();
};

const getPosColor = (pos: Position) => {
    switch(pos) {
        case Position.GK: return 'bg-yellow-500 text-white border-yellow-500';
        case Position.DEF: return 'bg-blue-600 text-white border-blue-600';
        case Position.MID: return 'bg-green-600 text-white border-green-600';
        case Position.FWD: return 'bg-red-600 text-white border-red-600';
        default: return 'bg-gray-500 border-gray-500';
    }
};

const getPosColorLight = (pos: Position) => {
    switch(pos) {
        case Position.GK: return 'bg-yellow-50 text-yellow-700 border-yellow-200';
        case Position.DEF: return 'bg-blue-50 text-blue-700 border-blue-200';
        case Position.MID: return 'bg-green-50 text-green-700 border-green-200';
        case Position.FWD: return 'bg-red-50 text-red-700 border-red-200';
        default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
};

const getStatusColor = (status?: ApprovalStatus) => {
    switch(status) {
        case 'Published': return 'bg-green-100 text-green-700 border-green-200';
        case 'Submitted': return 'bg-blue-100 text-blue-700 border-blue-200';
        default: return 'bg-gray-100 text-gray-500 border-gray-200';
    }
};

const getStatusLabel = (status?: ApprovalStatus) => {
    switch(status) {
        case 'Published': return '已发布';
        case 'Submitted': return '待审核';
        default: return '草稿';
    }
};

const generateDefaultStats = (attributeConfig: AttributeConfig): PlayerStats => {
    const stats: any = {
        technical: {},
        tactical: {},
        physical: {},
        mental: {}
    };
    
    Object.keys(attributeConfig).forEach((cat) => {
        if (cat === 'drillLibrary') return;
        const category = cat as AttributeCategory;
        attributeConfig[category].forEach(attr => {
            stats[category][attr.key] = 5;
        });
    });

    return stats;
};

// --- Extracted Modals ---

interface RechargeModalProps {
    player: Player | undefined;
    onClose: () => void;
    onSubmit: (amount: number, quota: number) => void;
}

const RechargeModal: React.FC<RechargeModalProps> = ({ player, onClose, onSubmit }) => {
    const [rechargeData, setRechargeData] = useState({ amount: 50, quota: 3 });
    
    if (!player) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(rechargeData.amount, rechargeData.quota);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-bvb-black p-4 flex justify-between items-center text-white">
                    <h3 className="font-bold flex items-center">
                        <CreditCard className="w-5 h-5 mr-2 text-bvb-yellow" /> 
                        课时充值
                    </h3>
                    <button onClick={onClose}><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6">
                    <div className="mb-4 flex items-center justify-between bg-gray-50 p-3 rounded">
                        <span className="font-bold text-gray-700">{player.name}</span>
                        <span className="text-xs text-gray-500">当前余额: {player.credits || 0}</span>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">充值课时数</label>
                            <input 
                                type="number"
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none font-bold text-lg"
                                value={rechargeData.amount}
                                onChange={e => setRechargeData({...rechargeData, amount: parseInt(e.target.value)})}
                                min={1}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">周期内允许请假次数</label>
                            <input 
                                type="number"
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none font-bold text-lg"
                                value={rechargeData.quota}
                                onChange={e => setRechargeData({...rechargeData, quota: parseInt(e.target.value)})}
                                min={0}
                            />
                            <p className="text-[10px] text-gray-400 mt-1">
                                有效期将自动延长至一年后。达到请假次数上限后将正常扣课时。
                            </p>
                        </div>
                        <button type="submit" className="w-full py-3 bg-bvb-yellow text-bvb-black font-bold rounded hover:brightness-105 mt-2">
                            确认充值
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

interface BulkRechargeModalProps {
    count: number;
    onClose: () => void;
    onSubmit: (amount: number, quota: number) => void;
}

const BulkRechargeModal: React.FC<BulkRechargeModalProps> = ({ count, onClose, onSubmit }) => {
    const [rechargeData, setRechargeData] = useState({ amount: 50, quota: 3 });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(rechargeData.amount, rechargeData.quota);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-bvb-black p-4 flex justify-between items-center text-white">
                    <h3 className="font-bold flex items-center">
                        <CreditCard className="w-5 h-5 mr-2 text-bvb-yellow" /> 
                        批量课时充值
                    </h3>
                    <button onClick={onClose}><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6">
                    <div className="mb-4 bg-yellow-50 border border-yellow-200 p-3 rounded text-sm text-yellow-800 font-bold">
                        正在为 {count} 名球员进行统一充值。
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">统一充值课时数</label>
                            <input 
                                type="number"
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none font-bold text-lg"
                                value={rechargeData.amount}
                                onChange={e => setRechargeData({...rechargeData, amount: parseInt(e.target.value)})}
                                min={1}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">统一允许请假次数</label>
                            <input 
                                type="number"
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none font-bold text-lg"
                                value={rechargeData.quota}
                                onChange={e => setRechargeData({...rechargeData, quota: parseInt(e.target.value)})}
                                min={0}
                            />
                            <p className="text-[10px] text-gray-400 mt-1">
                                所有选定球员的有效期将自动延长至一年后。
                            </p>
                        </div>
                        <button type="submit" className="w-full py-3 bg-bvb-yellow text-bvb-black font-bold rounded hover:brightness-105 mt-2">
                            确认批量充值
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

interface TransferModalProps {
    teams: Team[];
    count: number;
    onClose: () => void;
    onConfirm: (targetTeamId: string) => void;
}

const TransferModal: React.FC<TransferModalProps> = ({ teams, count, onClose, onConfirm }) => {
    const [targetId, setTargetId] = useState(teams[0]?.id || 'unassigned');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
                <h3 className="font-bold text-lg mb-2 flex items-center"><ArrowRightLeft className="w-5 h-5 mr-2 text-bvb-yellow"/>批量移交球员</h3>
                <p className="text-sm text-gray-500 mb-4">即将把选中的 <span className="font-bold text-bvb-black">{count}</span> 名球员移交至：</p>
                
                <select 
                    className="w-full p-2 border rounded-lg mb-6 text-sm font-bold focus:ring-2 focus:ring-bvb-yellow outline-none"
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                >
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    <option value="unassigned">待分配 (Unassigned)</option>
                </select>

                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200">取消</button>
                    <button 
                        onClick={() => onConfirm(targetId)} 
                        className="px-4 py-2 bg-bvb-black text-white rounded-lg text-xs font-bold hover:bg-gray-800"
                    >
                        确认移交
                    </button>
                </div>
            </div>
        </div>
    );
};

interface ImportPlayersModalProps {
    teams: Team[];
    attributeConfig: AttributeConfig;
    onImport: (players: Player[]) => void;
    onClose: () => void;
}

const ImportPlayersModal: React.FC<ImportPlayersModalProps> = ({ teams, attributeConfig, onImport, onClose }) => {
    const [csvContent, setCsvContent] = useState('');
    const [parsedPlayers, setParsedPlayers] = useState<Partial<Player>[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.id || '');
    const [step, setStep] = useState<'upload' | 'preview'>('upload');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDownloadTemplate = () => {
        const headers = "姓名,球衣号码,场上位置,身份证号,入队时间,就读学校,家长姓名,联系电话\n";
        const example = "张三,10,中场,110101201001011234,2023-01-01,实验小学,张父,13800138000\n";
        const content = headers + example;
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', '球员导入模版.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target?.result as string;
            setCsvContent(text);
            parseCSV(text);
        };
        reader.readAsText(file);
    };

    const parseCSV = (text: string) => {
        const lines = text.split('\n');
        const players: Partial<Player>[] = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const cols = line.split(',').map(c => c.trim());
            
            if (cols.length >= 2) {
                const name = cols[0];
                const number = parseInt(cols[1]) || 0;
                let positionStr = cols[2];
                const idCard = cols[3] || '';
                const joinDate = cols[4] || '';
                const school = cols[5] || '';
                const parentName = cols[6] || '';
                const parentPhone = cols[7] || '';

                let position: Position = Position.MID;
                if (positionStr.includes('门')) position = Position.GK;
                else if (positionStr.includes('卫')) position = Position.DEF;
                else if (positionStr.includes('锋')) position = Position.FWD;

                let gender: '男' | '女' = '男';
                let age = 10;
                let birthDate = '';

                if (idCard.length === 18) {
                    const year = parseInt(idCard.substring(6, 10));
                    const month = parseInt(idCard.substring(10, 12));
                    const day = parseInt(idCard.substring(12, 14));
                    const gVal = parseInt(idCard.charAt(16));
                    if (!isNaN(year)) {
                        age = new Date().getFullYear() - year;
                        birthDate = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                    }
                    if (!isNaN(gVal)) gender = gVal % 2 === 1 ? '男' : '女';
                }

                players.push({
                    name,
                    number,
                    position,
                    idCard,
                    gender,
                    age,
                    birthDate,
                    joinDate,
                    school,
                    parentName,
                    parentPhone
                });
            }
        }
        setParsedPlayers(players);
        setStep('preview');
    };

    const handleConfirmImport = () => {
        if (!selectedTeamId) {
            alert('请选择归属梯队');
            return;
        }

        const defaultStats = generateDefaultStats(attributeConfig);
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);

        const newPlayers: Player[] = parsedPlayers.map(p => ({
            ...p,
            id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            teamId: selectedTeamId,
            isCaptain: false,
            height: 0,
            weight: 0,
            goals: 0,
            assists: 0,
            appearances: 0,
            image: `https://picsum.photos/200/200?random=${Math.random()}`, 
            stats: defaultStats,
            statsStatus: 'Published',
            lastPublishedStats: JSON.parse(JSON.stringify(defaultStats)),
            reviews: [],
            credits: 0,
            validUntil: nextYear.toISOString().split('T')[0],
            leaveQuota: 0,
            leavesUsed: 0,
            rechargeHistory: [],
            gallery: []
        } as Player));

        onImport(newPlayers);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-bvb-black p-4 flex justify-between items-center text-white shrink-0">
                    <h3 className="font-bold flex items-center"><FileSpreadsheet className="w-5 h-5 mr-2 text-bvb-yellow" /> 批量导入球员</h3>
                    <button onClick={onClose}><X className="w-5 h-5" /></button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                    {step === 'upload' ? (
                        <div className="space-y-6">
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center text-center space-y-3">
                                <FileDown className="w-10 h-10 text-gray-400" />
                                <div>
                                    <h4 className="font-bold text-gray-700">第一步：下载模版</h4>
                                    <p className="text-xs text-gray-500">请下载标准CSV模版，按格式填写球员信息。</p>
                                </div>
                                <button onClick={handleDownloadTemplate} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold hover:bg-gray-100 hover:text-bvb-black transition-colors shadow-sm">
                                    下载 CSV 模版
                                </button>
                            </div>

                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex flex-col items-center justify-center text-center space-y-3 relative">
                                <Upload className="w-10 h-10 text-blue-400" />
                                <div>
                                    <h4 className="font-bold text-blue-900">第二步：上传文件</h4>
                                    <p className="text-xs text-blue-600">选择填写好的 CSV 文件进行解析。</p>
                                </div>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    accept=".csv" 
                                    onChange={handleFileUpload} 
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm pointer-events-none">
                                    选择文件
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <div className="flex items-center">
                                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                                    <span className="font-bold text-sm">成功解析 {parsedPlayers.length} 名球员数据</span>
                                </div>
                                <button onClick={() => setStep('upload')} className="text-xs text-gray-500 hover:underline">重新上传</button>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">选择导入梯队</label>
                                <select 
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none text-sm font-bold"
                                    value={selectedTeamId}
                                    onChange={e => setSelectedTeamId(e.target.value)}
                                >
                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>

                            <div className="max-h-[300px] overflow-y-auto border rounded-lg">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-gray-100 font-bold text-gray-600 sticky top-0">
                                        <tr>
                                            <th className="p-2 border-b">姓名</th>
                                            <th className="p-2 border-b">号码</th>
                                            <th className="p-2 border-b">位置</th>
                                            <th className="p-2 border-b">年龄</th>
                                            <th className="p-2 border-b">家长</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {parsedPlayers.map((p, i) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="p-2 font-bold">{p.name}</td>
                                                <td className="p-2">{p.number}</td>
                                                <td className="p-2">{p.position}</td>
                                                <td className="p-2">{p.age}</td>
                                                <td className="p-2">{p.parentName} {p.parentPhone}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-50 border-t flex justify-end space-x-2 shrink-0">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-300">取消</button>
                    {step === 'preview' && (
                        <button onClick={handleConfirmImport} className="px-4 py-2 bg-bvb-black text-white rounded-lg text-sm font-bold hover:bg-gray-800 flex items-center">
                            <Upload className="w-4 h-4 mr-2" /> 确认导入
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

interface PlayerDetailModalProps {
    player: Player;
    onClose: () => void;
    teams: Team[];
    trainings: TrainingSession[];
    attributeConfig: AttributeConfig;
    currentUser: User | null;
    onUpdatePlayer: (player: Player) => void;
    onDeletePlayer: (playerId: string) => void;
    initialFilter?: string;
    appLogo?: string;
    onDeleteRecharge: (playerId: string, rechargeId: string) => void;
}

const PlayerDetailModal: React.FC<PlayerDetailModalProps> = ({ 
    player, onClose, teams, trainings, attributeConfig, currentUser, onUpdatePlayer, onDeletePlayer, initialFilter, appLogo, onDeleteRecharge
}) => {
    // Implementation same as previous version (Full code preserved in memory, kept here for completeness)
    const [isEditing, setIsEditing] = useState(false);
    const [editedPlayer, setEditedPlayer] = useState<Player>(JSON.parse(JSON.stringify(player)));
    const [activeTab, setActiveTab] = useState<'overview' | 'technical' | 'tactical' | 'physical' | 'mental' | 'reviews' | 'records' | 'gallery'>('overview');
    const [detailAttendanceScope, setDetailAttendanceScope] = useState<'month' | 'quarter' | 'year'>('month');
    const [isExporting, setIsExporting] = useState(false);
    const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const galleryInputRef = useRef<HTMLInputElement>(null);
    
    // NEW: Export Year State
    const [exportYear, setExportYear] = useState<number>(new Date().getFullYear());

    const isCoach = currentUser?.role === 'coach';
    const isDirector = currentUser?.role === 'director';

    useEffect(() => {
        if (!isEditing && player) {
             if (player.id === editedPlayer.id && JSON.stringify(editedPlayer) !== JSON.stringify(player)) {
                 setEditedPlayer(JSON.parse(JSON.stringify(player)));
             }
        }
    }, [player, isEditing]);

    useEffect(() => {
        if (!isEditing) return;
        const timer = setTimeout(() => {
            setSaveStatus('saving');
            const updatedPlayer = {
                ...editedPlayer,
                statsStatus: 'Published' as ApprovalStatus,
                lastPublishedStats: JSON.parse(JSON.stringify(editedPlayer.stats))
            };
            onUpdatePlayer(updatedPlayer);
            setTimeout(() => setSaveStatus('saved'), 800);
        }, 1200);
        return () => clearTimeout(timer);
    }, [editedPlayer, isEditing]);

    useEffect(() => {
        if (initialFilter === 'pending_reviews') {
            setActiveTab('reviews');
        } else if (initialFilter === 'pending_stats') {
            setActiveTab('overview'); 
        }
    }, [initialFilter]);

    const [newReview, setNewReview] = useState<Partial<PlayerReview>>({
        year: new Date().getFullYear(),
        quarter: 'Q1',
        technicalTacticalImprovement: '',
        mentalDevelopment: '',
        summary: '',
        status: 'Draft'
    });
    const [isGeneratingReview, setIsGeneratingReview] = useState(false);

    const categoryLabels: Record<AttributeCategory, string> = {
      technical: '技术能力',
      tactical: '战术意识',
      physical: '身体素质',
      mental: '心理素质'
    };

    const getAvg = (category: AttributeCategory) => {
      const configItems = attributeConfig[category];
      if (configItems.length === 0) return 0;
      let sum = 0; let count = 0;
      configItems.forEach(attr => {
        const val = editedPlayer.stats[category][attr.key] || 0;
        sum += val; count++;
      });
      return count === 0 ? 0 : parseFloat((sum / count).toFixed(1));
    };

    const overviewRadarData = [
      { subject: '技术', A: getAvg('technical'), fullMark: 10 },
      { subject: '战术', A: getAvg('tactical'), fullMark: 10 },
      { subject: '身体', A: getAvg('physical'), fullMark: 10 },
      { subject: '心理', A: getAvg('mental'), fullMark: 10 },
    ];

    const getCategoryRadarData = (category: AttributeCategory) => {
      return attributeConfig[category].map(attr => ({
        subject: attr.label,
        value: editedPlayer.stats[category][attr.key] || 0,
        fullMark: 10
      }));
    };

    const attendanceRate = calculateAttendanceRate(player, trainings, detailAttendanceScope);

    // NEW: Annual Attendance Calculation for Export
    const annualAttendanceStats = useMemo(() => {
        const yearStart = new Date(exportYear, 0, 1);
        const yearEnd = new Date(exportYear, 11, 31);
        
        const sessions = trainings.filter(t => {
            const d = new Date(t.date);
            // Matches year and player's team
            return t.teamId === player.teamId && d >= yearStart && d <= yearEnd;
        });

        const total = sessions.length;
        const present = sessions.filter(t => t.attendance?.some(r => r.playerId === player.id && r.status === 'Present')).length;
        const leave = sessions.filter(t => t.attendance?.some(r => r.playerId === player.id && r.status === 'Leave')).length;
        const injury = sessions.filter(t => t.attendance?.some(r => r.playerId === player.id && r.status === 'Injury')).length;
        
        // Rate based on valid sessions (usually present / (total - injury/leave) or just total depending on club policy)
        // Here we use simple (Present / Total) for visualization, or could be (Present / (Total - Injury))
        const rate = total > 0 ? Math.round((present / total) * 100) : 0;

        return { total, present, leave, injury, rate };
    }, [trainings, player, exportYear]);

    const handleSave = () => {
      const updatedPlayer = {
          ...editedPlayer,
          statsStatus: 'Published' as ApprovalStatus,
          lastPublishedStats: JSON.parse(JSON.stringify(editedPlayer.stats))
      };
      onUpdatePlayer(updatedPlayer);
      setSaveStatus('saved');
    };

    const handleDelete = () => {
      if (confirm('确定要删除这名球员吗？此操作不可撤销。')) {
          onDeletePlayer(player.id);
          onClose();
      }
    };

    const handleDeleteRechargeAction = (rechargeId: string) => {
         onDeleteRecharge(player.id, rechargeId);
         // Manually update local state to reflect deletion immediately to improve UX
         setEditedPlayer(prev => ({
             ...prev,
             credits: (prev.credits || 0) - (prev.rechargeHistory?.find(r => r.id === rechargeId)?.amount || 0),
             rechargeHistory: prev.rechargeHistory?.filter(r => r.id !== rechargeId) || []
         }));
    };

    const handleExportPDF = async () => {
        setIsExporting(true);
        try {
            await exportToPDF('player-profile-export', `${player.name}_${exportYear}_年度档案`);
        } catch (error) {
            alert('导出失败，请重试');
        } finally {
            setIsExporting(false);
        }
    };

    const handleStatChange = (category: keyof PlayerStats, key: string, value: number) => {
      setEditedPlayer(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          [category]: {
            ...prev.stats[category],
            [key]: value
          }
        },
      }));
    };

    const handleGenerateAiReview = async () => {
        setIsGeneratingReview(true);
        try {
            const draft = await generatePlayerReview(player, newReview.quarter || 'Q1', newReview.year || new Date().getFullYear());
            setNewReview(prev => ({ ...prev, technicalTacticalImprovement: draft.tech, mentalDevelopment: draft.mental, summary: draft.summary }));
        } catch (e) {
            alert('生成失败，请稍后重试');
        } finally {
            setIsGeneratingReview(false);
        }
    };

    const handleEditReview = (review: PlayerReview) => {
        setEditingReviewId(review.id);
        setNewReview({ ...review });
    };

    const handleSaveReview = (status: ApprovalStatus = 'Draft') => {
        if (editingReviewId) {
             const updatedReviews = (editedPlayer.reviews || []).map(r => {
                if (r.id === editingReviewId) {
                    return { ...r, ...newReview, status, date: new Date().toISOString().split('T')[0] } as PlayerReview;
                }
                return r;
            });
            setEditedPlayer({ ...editedPlayer, reviews: updatedReviews });
            setEditingReviewId(null);
        } else {
            const review: PlayerReview = {
                id: Date.now().toString(),
                date: new Date().toISOString().split('T')[0],
                year: newReview.year || new Date().getFullYear(),
                quarter: newReview.quarter || 'Q1',
                technicalTacticalImprovement: newReview.technicalTacticalImprovement || '',
                mentalDevelopment: newReview.mentalDevelopment || '',
                summary: newReview.summary || '',
                status: status 
            };
            const updatedReviews = [...(editedPlayer.reviews || []), review];
            setEditedPlayer({ ...editedPlayer, reviews: updatedReviews });
        }
        setNewReview({ year: new Date().getFullYear(), quarter: 'Q1', technicalTacticalImprovement: '', mentalDevelopment: '', summary: '', status: 'Draft' });
    };
    
    const updateReviewStatus = (reviewId: string, status: ApprovalStatus) => {
        const updatedReviews = editedPlayer.reviews.map(r => r.id === reviewId ? { ...r, status } : r);
        setEditedPlayer({ ...editedPlayer, reviews: updatedReviews });
    };

    const handleUploadPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const newPhoto: PlayerPhoto = {
                    id: Date.now().toString(),
                    url: reader.result as string,
                    date: new Date().toISOString().split('T')[0],
                    caption: '日常训练'
                };
                setEditedPlayer(prev => ({
                    ...prev,
                    gallery: [newPhoto, ...(prev.gallery || [])]
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDeletePhoto = (photoId: string) => {
        if(confirm('确定要删除这张照片吗？')) {
            setEditedPlayer(prev => ({
                ...prev,
                gallery: prev.gallery?.filter(p => p.id !== photoId) || []
            }));
        }
    };

    // Render Logic for Detail Tabs
    const renderStatSliders = (category: AttributeCategory) => {
        // ... Same implementation as before ...
        const attributes = attributeConfig[category];
        if (attributes.length === 0) return <div className="p-8 text-center text-gray-400">该维度暂无评估项目</div>;
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-1 content-start">
            {attributes.map(attr => {
              const value = editedPlayer.stats[category][attr.key] ?? 5;
              const getMeta = (v: number) => {
                  if (v >= 9) return { color: 'text-green-600', hex: '#16a34a' };
                  if (v >= 7) return { color: 'text-blue-600', hex: '#2563eb' };
                  if (v >= 5) return { color: 'text-yellow-600', hex: '#EAB308' };
                  return { color: 'text-red-500', hex: '#ef4444' };
              };
              const meta = getMeta(value);
              return (
                <div key={attr.key} className="group bg-white hover:bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 hover:border-bvb-yellow/50 transition-all shadow-sm">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-gray-600 truncate mr-2" title={attr.label}>{attr.label}</label>
                    <span className={`text-sm font-black font-mono ${meta.color} bg-gray-50 px-1.5 rounded`}>
                      {value}<span className="text-[9px] text-gray-300 ml-0.5 font-normal">/10</span>
                    </span>
                  </div>
                  <div className="relative h-4 flex items-center">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        disabled={!isEditing}
                        value={value}
                        onChange={(e) => handleStatChange(category, attr.key, parseInt(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-gray-100 focus:outline-none focus:ring-0
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 
                          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border 
                          [&::-webkit-slider-thumb]:border-gray-300 [&::-webkit-slider-thumb]:shadow-sm 
                          [&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-110 hover:[&::-webkit-slider-thumb]:border-bvb-yellow"
                        style={{ background: `linear-gradient(to right, ${meta.hex} ${(value-1)/9*100}%, #f3f4f6 ${(value-1)/9*100}%)` }}
                      />
                  </div>
                </div>
              );
            })}
          </div>
        );
    };

    const renderCategoryContent = (category: AttributeCategory) => {
      const radarData = attributeConfig[category].map(attr => ({
        subject: attr.label, value: editedPlayer.stats[category][attr.key] || 0, fullMark: 10
      }));
      return (
         <div className="animate-in slide-in-from-right-4 duration-300 flex flex-col md:flex-row h-full gap-4 md:gap-6 overflow-hidden">
            <div className="w-full md:w-5/12 h-64 md:h-auto relative bg-gray-50/50 rounded-xl p-2 shrink-0 border border-gray-100 flex flex-col justify-center">
                <div className="absolute top-2 left-3 z-10"><span className="text-xs font-black text-gray-400 uppercase tracking-wider">{categoryLabels[category]}分析</span></div>
                <div className="h-64 md:h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                            <PolarGrid stroke="#e5e7eb" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 'bold' }} />
                            <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                            <Radar name={categoryLabels[category]} dataKey="value" stroke="#000" strokeWidth={2} fill="#FDE100" fillOpacity={0.6} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
                <div className="absolute bottom-2 right-2 bg-white px-2 py-1 rounded shadow-sm border border-gray-100 text-center">
                    <div className="text-[10px] text-gray-400 font-bold uppercase">平均分</div>
                    <div className="text-lg font-black text-bvb-black">{getAvg(category)}</div>
                </div>
            </div>
            <div className="w-full md:w-7/12 overflow-y-auto custom-scrollbar pb-20 md:pb-0 pr-1">
                <div className="mb-3 px-1 flex justify-between items-center sticky top-0 bg-white z-10 py-2 border-b border-gray-50">
                    <span className="text-xs text-gray-400 font-bold flex items-center"><Edit2 className="w-3 h-3 mr-1" />{isEditing ? '拖动滑块调整数值' : '点击右上角“编辑”进行修改'}</span>
                </div>
                {renderStatSliders(category)}
            </div>
         </div>
      );
    };

    const renderReviews = () => {
        const sortedReviews = [...(editedPlayer.reviews || [])].sort((a,b) => b.year - a.year || b.quarter.localeCompare(a.quarter));
        const groupedReviews = sortedReviews.reduce((acc, review) => { (acc[review.year] = acc[review.year] || []).push(review); return acc; }, {} as Record<number, PlayerReview[]>);
        const years = Object.keys(groupedReviews).map(Number).sort((a,b) => b - a);

        return (
            <div className="animate-in slide-in-from-right-4 duration-300 flex flex-col md:flex-row gap-6 pb-24 md:pb-10">
                <div className="w-full md:w-1/2 space-y-6 md:overflow-y-auto md:max-h-[600px] pr-2 custom-scrollbar border-b md:border-b-0 pb-6 md:pb-0 border-gray-100 shrink-0">
                    <h3 className="font-bold text-gray-800 flex items-center sticky top-0 bg-white z-10 py-2"><FileText className="w-5 h-5 mr-2 text-bvb-yellow" /> 历史点评归档</h3>
                    {years.length === 0 && <p className="text-gray-400 text-sm">暂无点评记录。</p>}
                    {years.map(year => (
                        <div key={year} className="relative border-l-2 border-gray-200 pl-6 ml-2 space-y-6">
                            <span className="absolute -left-[21px] top-0 bg-gray-100 text-gray-500 text-xs font-bold px-1.5 py-0.5 rounded border border-gray-300">{year}</span>
                            {groupedReviews[year].map(review => (
                                <div key={review.id} className={`relative group ${review.status === 'Draft' ? 'opacity-80' : ''}`}>
                                    <div className="absolute -left-[31px] top-1 w-3 h-3 bg-bvb-yellow rounded-full border-2 border-white shadow-sm group-hover:scale-125 transition-transform"></div>
                                    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-2"><span className="text-sm font-black text-bvb-black bg-bvb-yellow px-2 py-0.5 rounded">{review.quarter}</span><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getStatusColor(review.status)}`}>{getStatusLabel(review.status)}</span></div>
                                            <span className="text-xs text-gray-400">{review.date}</span>
                                        </div>
                                        <div className="space-y-3">
                                            <div><h4 className="text-xs font-bold text-gray-500 uppercase mb-1">技战术改善</h4><p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-2 rounded">{review.technicalTacticalImprovement || '（未填写）'}</p></div>
                                            <div><h4 className="text-xs font-bold text-gray-500 uppercase mb-1">心理建设</h4><p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-2 rounded">{review.mentalDevelopment || '（未填写）'}</p></div>
                                            <div><h4 className="text-xs font-bold text-gray-500 uppercase mb-1">季度总结</h4><p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-2 rounded italic border-l-2 border-bvb-yellow">{review.summary || '（未填写）'}</p></div>
                                            <div className="flex justify-end pt-2 gap-2 border-t border-gray-100">
                                                {(review.status === 'Draft' || review.status === 'Submitted' || review.status === 'Published') && (<button onClick={() => handleEditReview(review)} className="text-xs bg-bvb-yellow text-bvb-black px-3 py-1.5 rounded font-bold hover:brightness-105 flex items-center shadow-sm"><Edit2 className="w-3 h-3 mr-1" /> 编辑</button>)}
                                                {review.status !== 'Published' && (<button onClick={() => updateReviewStatus(review.id, 'Published')} className="text-xs bg-green-50 text-green-600 px-2 py-1.5 rounded font-bold hover:bg-green-100 flex items-center"><CheckCircle className="w-3 h-3 mr-1" /> 发布</button>)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
                <div className="w-full md:w-1/2 bg-gray-50 p-6 rounded-xl border border-gray-200 flex flex-col shrink-0">
                    <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-gray-800">{editingReviewId ? '编辑季度点评' : '新增季度点评'}</h3><button type="button" onClick={handleGenerateAiReview} disabled={isGeneratingReview} className="text-xs flex items-center bg-white border border-gray-300 hover:border-bvb-yellow px-3 py-1.5 rounded-full font-bold transition-all">{isGeneratingReview ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1 text-bvb-yellow" />} AI 辅助生成</button></div>
                    <form className="space-y-4 flex-1 flex flex-col">
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">年份</label><select className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none text-sm" value={newReview.year} onChange={e => setNewReview({...newReview, year: parseInt(e.target.value)})}>{[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}</select></div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">季度</label><select className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none text-sm" value={newReview.quarter} onChange={e => setNewReview({...newReview, quarter: e.target.value as any})}><option value="Q1">Q1 (第一季度)</option><option value="Q2">Q2 (第二季度)</option><option value="Q3">Q3 (第三季度)</option><option value="Q4">Q4 (第四季度)</option></select></div>
                        </div>
                        <div><label className="block text-xs font-bold text-gray-500 mb-1">技战术能力改善</label><textarea required rows={3} className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none text-sm" placeholder="描述球员本季度的技术和战术进步..." value={newReview.technicalTacticalImprovement} onChange={e => setNewReview({...newReview, technicalTacticalImprovement: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold text-gray-500 mb-1">心理建设</label><textarea required rows={3} className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none text-sm" placeholder="评价球员的心理状态、抗压能力和团队融入..." value={newReview.mentalDevelopment} onChange={e => setNewReview({...newReview, mentalDevelopment: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold text-gray-500 mb-1">季度总结</label><textarea required rows={3} className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none text-sm" placeholder="综合评价与下季度目标..." value={newReview.summary} onChange={e => setNewReview({...newReview, summary: e.target.value})} /></div>
                        <div className="mt-auto grid grid-cols-2 gap-3 pb-16 md:pb-0">
                            <button type="button" onClick={() => handleSaveReview('Draft')} className="py-2 bg-gray-200 text-gray-700 font-bold rounded hover:bg-gray-300 transition-colors">{editingReviewId ? '更新草稿' : '保存草稿'}</button>
                            <button type="button" onClick={() => handleSaveReview('Published')} className="py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700 transition-colors flex items-center justify-center"><CheckCircle className="w-3 h-3 mr-1" /> {editingReviewId ? '更新并发布' : '直接发布'}</button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    const renderRecords = () => {
        type Event = { id: string; originalId?: string; date: string; type: 'recharge' | 'training'; status?: string; amount: number; desc: string; quotaAdded?: number; };
        const events: Event[] = [];
        (editedPlayer.rechargeHistory || []).forEach(r => events.push({ id: `rech-${r.id}`, originalId: r.id, date: r.date, type: 'recharge', amount: r.amount, desc: `充值 ${r.amount} 课时 (含请假额度 ${r.quotaAdded}次)`, quotaAdded: r.quotaAdded }));
        trainings.forEach(t => {
            const record = t.attendance?.find(r => r.playerId === editedPlayer.id);
            if (record && record.status !== 'Absent') {
                let amount = 0; let desc = '';
                if (record.status === 'Present') { amount = -1; desc = `参加训练: ${t.title}`; } 
                else if (record.status === 'Leave') { amount = 0; desc = `请假: ${t.title}`; } 
                else if (record.status === 'Injury') { amount = 0; desc = `伤停: ${t.title}`; }
                events.push({ id: `train-${t.id}`, date: t.date, type: 'training', status: record.status, amount, desc });
            }
        });
        events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        let balance = 0; let quota = 0; let used = 0;
        const historyWithBalance = events.map(e => {
            if (e.type === 'recharge') { balance += e.amount; quota = e.quotaAdded ?? 0; used = 0; } 
            else if (e.type === 'training') {
                if (e.status === 'Present') { balance -= 1; e.amount = -1; } 
                else if (e.status === 'Leave') { 
                    used++; 
                    e.amount = 0; 
                    e.desc += ' (消耗额度)'; 
                } 
                // Injury and Absent do not affect balance
            }
            return { ...e, balanceAfter: balance };
        });
        const displayList = [...historyWithBalance].reverse();
        return (
            <div className="animate-in slide-in-from-right-4 duration-300 h-full flex flex-col pb-20 md:pb-0">
                <div className="flex-1 overflow-y-auto custom-scrollbar border rounded-xl">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-bold sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3">日期</th>
                                <th className="px-4 py-3">类型</th>
                                <th className="px-4 py-3">详情</th>
                                <th className="px-4 py-3 text-right">变动</th>
                                <th className="px-4 py-3 text-right">结余</th>
                                <th className="px-4 py-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {displayList.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 group">
                                    <td className="px-4 py-3 whitespace-nowrap text-gray-600 font-mono text-xs">{item.date}</td>
                                    <td className="px-4 py-3">{item.type === 'recharge' ? '充值' : item.status}</td>
                                    <td className="px-4 py-3 text-gray-700">{item.desc}</td>
                                    <td className={`px-4 py-3 text-right font-bold ${item.amount > 0 ? 'text-green-600' : item.amount < 0 ? 'text-red-500' : 'text-gray-400'}`}>{item.amount > 0 ? `+${item.amount}` : item.amount}</td>
                                    <td className="px-4 py-3 text-right font-mono font-bold text-gray-800">{item.balanceAfter}</td>
                                    <td className="px-4 py-3 text-right">
                                        {item.type === 'recharge' && (
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if(item.originalId) handleDeleteRechargeAction(item.originalId);
                                                }}
                                                className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                                title="删除记录"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderGallery = () => {
        return (
            <div className="animate-in slide-in-from-right-4 duration-300 h-full flex flex-col pb-24 md:pb-6">
                <div className="flex justify-between items-center mb-4 sticky top-0 bg-white z-10 py-2">
                    <h3 className="font-bold text-gray-800 flex items-center">
                        <ImageIcon className="w-5 h-5 mr-2 text-bvb-yellow" /> 精彩瞬间
                    </h3>
                    <button 
                        onClick={() => galleryInputRef.current?.click()} 
                        className="px-4 py-2 bg-bvb-black text-white rounded-lg text-xs font-bold hover:bg-gray-800 flex items-center shadow-sm"
                    >
                        <Upload className="w-4 h-4 mr-2" /> 上传照片
                    </button>
                    <input type="file" ref={galleryInputRef} className="hidden" accept="image/*" onChange={handleUploadPhoto} />
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {(!editedPlayer.gallery || editedPlayer.gallery.length === 0) ? (
                        <div className="h-64 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                            <ImageIcon className="w-12 h-12 mb-2 opacity-20" />
                            <p className="text-sm">暂无照片，记录球员的训练瞬间吧！</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {editedPlayer.gallery.map(photo => (
                                <div key={photo.id} className="relative group bg-gray-100 rounded-lg overflow-hidden aspect-square border border-gray-200 shadow-sm">
                                    <img src={photo.url} alt="Gallery" className="w-full h-full object-cover" />
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
                                        <p className="text-white text-xs font-bold">{photo.date}</p>
                                    </div>
                                    <button 
                                        onClick={() => handleDeletePhoto(photo.id)}
                                        className="absolute top-2 right-2 p-1.5 bg-white/90 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-sm"
                                        title="删除"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-white w-full h-full md:h-[90vh] md:max-w-5xl rounded-none md:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col">
          {/* Header */}
          <div className="bg-bvb-black text-white p-4 flex justify-between items-center shrink-0">
             <div className="flex items-center space-x-3">
                 <button onClick={onClose} className="md:hidden mr-2 p-1"><ChevronLeft className="w-6 h-6" /></button>
                 <h2 className="text-xl font-bold uppercase tracking-wider flex items-center"><UserIcon className="w-5 h-5 mr-2 text-bvb-yellow" /> 球员档案</h2>
                 {isEditing && (
                     <div className="ml-4 flex items-center gap-2">
                         {saveStatus === 'saving' && <span className="text-xs text-bvb-yellow flex items-center bg-gray-800 px-2 py-0.5 rounded-full"><RefreshCw className="w-3 h-3 mr-1 animate-spin"/> 保存中</span>}
                         {saveStatus === 'saved' && <span className="text-xs text-green-400 flex items-center bg-gray-800 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3 mr-1"/> 已保存</span>}
                     </div>
                 )}
             </div>
             <div className="flex items-center space-x-3">
                {/* Year Selector for Export */}
                <div className="hidden md:flex items-center gap-2 bg-gray-800 rounded px-2">
                    <span className="text-xs text-gray-400 font-bold">导出年份:</span>
                    <select 
                        value={exportYear} 
                        onChange={(e) => setExportYear(parseInt(e.target.value))} 
                        className="bg-transparent text-white text-xs font-bold py-1 focus:outline-none"
                    >
                        {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y} className="text-black">{y}</option>)}
                    </select>
                </div>

                <button onClick={handleExportPDF} disabled={isExporting} className="hidden md:flex p-2 bg-gray-800 rounded hover:bg-gray-700 text-bvb-yellow items-center" title="导出PDF档案">
                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                </button>
                {isEditing ? (
                  <>
                    <button onClick={() => setIsEditing(false)} className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm">退出</button>
                    <button onClick={handleSave} className={`px-3 py-1 font-bold rounded hover:brightness-110 text-sm flex items-center ${saveStatus === 'saved' ? 'bg-green-600 text-white' : 'bg-bvb-yellow text-bvb-black'}`}>
                        {saveStatus === 'saved' ? <CheckCircle className="w-4 h-4 mr-1" /> : <Save className="w-4 h-4 mr-1" />} 
                        {saveStatus === 'saved' ? '已保存' : '保存'}
                    </button>
                  </>
                ) : (
                  <>
                     <button onClick={() => setIsEditing(true)} className="p-2 bg-gray-800 rounded hover:bg-gray-700 text-bvb-yellow" title="编辑"><Edit2 className="w-4 h-4" /></button>
                     {isDirector && <button onClick={handleDelete} className="p-2 bg-red-900/50 text-red-400 rounded hover:bg-red-900 hover:text-red-300" title="删除"><Trash2 className="w-4 h-4" /></button>}
                  </>
                )}
                <button onClick={onClose} className="hidden md:block hover:bg-gray-800 p-1 rounded"><X className="w-6 h-6" /></button>
             </div>
          </div>
          {/* Nav Tabs */}
          <div className="bg-gray-100 border-b border-gray-200 shrink-0 sticky top-0 z-10">
            <div className="flex overflow-x-auto no-scrollbar">
               {[
                 { id: 'overview', label: '概览', icon: Activity },
                 { id: 'technical', label: '技术', icon: Target },
                 { id: 'tactical', label: '战术', icon: Brain },
                 { id: 'physical', label: '身体', icon: Dumbbell },
                 { id: 'mental', label: '心理', icon: CheckSquare },
                 { id: 'reviews', label: '点评', icon: FileText },
                 { id: 'records', label: '记录', icon: History },
                 { id: 'gallery', label: '相册', icon: ImageIcon },
               ].map(tab => (
                 <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-shrink-0 flex items-center px-6 py-4 font-bold text-sm transition-colors border-b-2 ${activeTab === tab.id ? 'border-bvb-yellow text-bvb-black bg-white' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}>
                    <tab.icon className={`w-4 h-4 mr-2 ${activeTab === tab.id ? 'text-bvb-yellow fill-current stroke-bvb-black' : ''}`} />
                    {tab.label}
                 </button>
               ))}
            </div>
          </div>
          {/* Content Area - Same as before... */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white pb-24 md:pb-6">
             {activeTab === 'overview' && (
               <div className="flex flex-col md:flex-row gap-6 h-full animate-in fade-in duration-300