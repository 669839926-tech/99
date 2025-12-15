
import React, { useState, useEffect, useRef } from 'react';
import { Player, Position, Team, PlayerStats, AttributeConfig, AttributeCategory, TrainingSession, PlayerReview, User, ApprovalStatus } from '../types';
import { Search, Plus, Shield, ChevronRight, X, Save, Trash2, Edit2, Activity, Brain, Dumbbell, Target, CheckSquare, ArrowRightLeft, Upload, User as UserIcon, Calendar as CalendarIcon, CreditCard, Cake, MoreHorizontal, Star, Crown, ChevronDown, FileText, Loader2, Sparkles, Download, Clock, AlertTriangle, History, Filter, CheckCircle, Send, Globe, AlertCircle, ClipboardCheck, XCircle, FileSpreadsheet, Cloud, RefreshCw, ChevronLeft, Phone, School, CalendarDays, FileDown, LayoutGrid, LayoutList } from 'lucide-react';
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
            rechargeHistory: []
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
                                <button onClick={handleDownloadTemplate} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold hover:bg-gray-100 hover:text-b