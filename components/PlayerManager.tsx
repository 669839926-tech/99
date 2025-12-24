
import React, { useState, useEffect, useRef } from 'react';
import { Player, Position, Team, PlayerStats, AttributeConfig, AttributeCategory, TrainingSession, PlayerReview, User, ApprovalStatus, PlayerPhoto } from '../types';
import { Search, Plus, Shield, ChevronRight, X, Save, Trash2, Edit2, Activity, Brain, Dumbbell, Target, CheckSquare, ArrowRightLeft, Upload, User as UserIcon, Calendar as CalendarIcon, CreditCard, Cake, MoreHorizontal, Star, Crown, ChevronDown, FileText, Loader2, Sparkles, Download, Clock, AlertTriangle, History, Filter, CheckCircle, Send, Globe, AlertCircle, ClipboardCheck, XCircle, FileSpreadsheet, Cloud, RefreshCw, ChevronLeft, Phone, School, CalendarDays, FileDown, LayoutGrid, LayoutList, Image as ImageIcon, ArrowUpDown, ArrowUp, ArrowDown, Ruler, Weight } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { generatePlayerReview } from '../services/geminiService';
import { exportToPDF } from '../services/pdfService';

interface PlayerManagerProps {
  teams: Team[];
  players: Player[];
  trainings?: TrainingSession[];
  attributeConfig: AttributeConfig;
  currentUser: User | null;
  onAddPlayer: (player: Player) => void;
  onBulkAddPlayers: (players: Player[]) => void;
  onAddTeam: (team: Team) => void;
  onUpdateTeam: (team: Team) => void;
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
const POSITION_ORDER: Record<Position, number> = {
  [Position.GK_ATT]: 10,
  [Position.GK_DEF]: 11,
  [Position.CB]: 20,
  [Position.LB]: 21,
  [Position.RB]: 22,
  [Position.LWB]: 23,
  [Position.RWB]: 24,
  [Position.CDM]: 30,
  [Position.CM]: 31,
  [Position.CAM]: 32,
  [Position.F9]: 40,
  [Position.ST]: 41,
  [Position.LW]: 42,
  [Position.RW]: 43,
  [Position.TBD]: 99
};

const calculateTenure = (dateStr?: string) => {
    if (!dateStr) return null;
    const start = new Date(dateStr);
    const now = new Date();
    if (isNaN(start.getTime())) return null;
    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    if (months < 0) { years--; months += 12; }
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
      Object.values(sourceStats[cat]).forEach(val => { total += val; count++; });
    }
  });
  return count === 0 ? '0.0' : (total / count).toFixed(1);
};

const calculateAttendanceRate = (player: Player, trainings: TrainingSession[], scope: 'month' | 'quarter' | 'year') => {
    if (!trainings || trainings.length === 0) return 0;
    const now = new Date();
    let startDate = new Date();
    if (scope === 'month') { startDate.setMonth(now.getMonth() - 1); } 
    else if (scope === 'quarter') { startDate.setMonth(now.getMonth() - 3); } 
    else { startDate.setFullYear(now.getFullYear() - 1); }
    const validSessions = trainings.filter(t => {
        const tDate = new Date(t.date);
        return t.teamId === player.teamId && tDate >= startDate && tDate <= now;
    });
    if (validSessions.length === 0) return 0;
    const presentCount = validSessions.filter(t => t.attendance?.some(r => r.playerId === player.id && r.status === 'Present')).length;
    return Math.round((presentCount / validSessions.length) * 100);
};

const getBirthdayStatus = (dateStr: string) => {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0,0,0,0);
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return null;
  let nextBirthday = new Date(today.getFullYear(), m - 1, d);
  if (nextBirthday < today) { nextBirthday.setFullYear(today.getFullYear() + 1); }
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
    const p = pos.toString();
    if (p.includes('锋') || p.includes('9')) return 'bg-red-600 text-white border-red-600';
    if (p.includes('中场')) return 'bg-green-600 text-white border-green-600';
    if (p.includes('卫') || p.includes('翼卫')) return 'bg-blue-600 text-white border-blue-600';
    if (p.includes('守门员')) return 'bg-yellow-50 text-white border-yellow-500';
    return 'bg-gray-500 text-white border-gray-500';
};

const getPosColorLight = (pos: Position) => {
    const p = pos.toString();
    if (p.includes('锋') || p.includes('9')) return 'bg-red-50 text-red-700 border-red-200';
    if (p.includes('中场')) return 'bg-green-50 text-green-700 border-green-200';
    if (p.includes('卫') || p.includes('翼卫')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (p.includes('守门员')) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    return 'bg-gray-50 text-gray-700 border-gray-200';
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
    const stats: any = { technical: {}, tactical: {}, physical: {}, mental: {} };
    Object.keys(attributeConfig).forEach((cat) => {
        if (cat === 'drillLibrary' || cat === 'trainingFoci') return;
        const category = cat as AttributeCategory;
        attributeConfig[category].forEach(attr => { stats[category][attr.key] = 5; });
    });
    return stats;
};

// --- Extracted Modals ---
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
                <select className="w-full p-2.5 border border-gray-200 rounded-lg mb-6 text-sm font-bold focus:ring-2 focus:ring-bvb-yellow outline-none bg-white" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    <option value="unassigned">待分配 (Unassigned)</option>
                </select>
                <div className="flex justify-end gap-3"><button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200">取消</button><button onClick={() => onConfirm(targetId)} className="px-4 py-2 bg-bvb-black text-white rounded-lg text-xs font-bold hover:bg-gray-800">确认移交</button></div>
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
        const headers = "姓名,球衣号码,场上位置,身份证号,入队时间,就读学校,家长姓名,联系电话,惯用脚(左/右)\n";
        const example = "张三,10,中锋,110101201001011234,2023-01-01,实验小学,张父,13800138000,右\n";
        const content = headers + example;
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url); link.setAttribute('download', '球员导入模版.csv'); link.style.visibility = 'hidden';
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => { const text = evt.target?.result as string; setCsvContent(text); parseCSV(text); };
        reader.readAsText(file);
    };
    const parseCSV = (text: string) => {
        const lines = text.split('\n'); const players: Partial<Player>[] = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim(); if (!line) continue;
            const cols = line.split(',').map(c => c.trim());
            if (cols.length >= 2) {
                const name = cols[0]; const number = parseInt(cols[1]) || 0; let positionStr = cols[2];
                const idCard = cols[3] || ''; const joinDate = cols[4] || ''; const school = cols[5] || '';
                const parentName = cols[6] || ''; const parentPhone = cols[7] || ''; const foot = cols[8] === '左' ? '左' : '右';
                let position: Position = Position.ST;
                if (positionStr.includes('守门员')) position = Position.GK_ATT; else if (positionStr.includes('后卫')) position = Position.CB; else if (positionStr.includes('中场')) position = Position.CM; else if (positionStr.includes('锋') || positionStr.includes('9')) position = Position.ST;
                let gender: '男' | '女' = '男'; let age = 10; let birthDate = '';
                if (idCard.length === 18) {
                    const year = parseInt(idCard.substring(6, 10)); const month = parseInt(idCard.substring(10, 12)); const day = parseInt(idCard.substring(12, 14)); const gVal = parseInt(idCard.charAt(16));
                    if (!isNaN(year)) { age = new Date().getFullYear() - year; birthDate = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`; }
                    if (!isNaN(gVal)) gender = gVal % 2 === 1 ? '男' : '女';
                }
                players.push({ name, number, position, idCard, gender, age, birthDate, joinDate, school, parentName, parentPhone, preferredFoot: foot });
            }
        }
        setParsedPlayers(players); setStep('preview');
    };
    const handleConfirmImport = () => {
        if (!selectedTeamId) { alert('请选择归属梯队'); return; }
        const defaultStats = generateDefaultStats(attributeConfig);
        const nextYear = new Date(); nextYear.setFullYear(nextYear.getFullYear() + 1);
        const newPlayers: Player[] = parsedPlayers.map(p => ({
            ...p, id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, teamId: selectedTeamId, isCaptain: false, goals: 0, assists: 0, appearances: 0, image: `https://picsum.photos/200/200?random=${Math.random()}`, stats: defaultStats, statsStatus: 'Published', lastPublishedStats: JSON.parse(JSON.stringify(defaultStats)), reviews: [], credits: 0, validUntil: nextYear.toISOString().split('T')[0], leaveQuota: 0, leavesUsed: 0, rechargeHistory: [], gallery: [], preferredFoot: p.preferredFoot || '右'
        } as Player));
        onImport(newPlayers); onClose();
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-bvb-black p-4 flex justify-between items-center text-white shrink-0"><h3 className="font-bold flex items-center"><FileSpreadsheet className="w-5 h-5 mr-2 text-bvb-yellow" /> 批量导入球员</h3><button onClick={onClose}><X className="w-5 h-5" /></button></div>
                <div className="p-6 overflow-y-auto">
                    {step === 'upload' ? (
                        <div className="space-y-6">
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center text-center space-y-3"><FileDown className="w-10 h-10 text-gray-400" /><div><h4 className="font-bold text-gray-700">第一步：下载模版</h4><p className="text-xs text-gray-500">请下载标准CSV模版，按格式填写球员信息。</p></div><button onClick={handleDownloadTemplate} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold hover:bg-gray-100 hover:text-bvb-black transition-colors shadow-sm">下载 CSV 模版</button></div>
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex flex-col items-center justify-center text-center space-y-3 relative"><Upload className="w-10 h-10 text-blue-400" /><div><h4 className="font-bold text-blue-900">第二步：上传文件</h4><p className="text-xs text-blue-600">选择填写好的 CSV 文件进行解析。</p></div><input type="file" ref={fileInputRef} accept=".csv" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/><button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm pointer-events-none">选择文件</button></div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200"><div className="flex items-center"><CheckCircle className="w-5 h-5 text-green-500 mr-2" /><span className="font-bold text-sm">成功解析 {parsedPlayers.length} 名球员数据</span></div><button onClick={() => setStep('upload')} className="text-xs text-gray-500 hover:underline">重新上传</button></div>
                            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">选择导入梯队</label><select className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none text-sm font-bold bg-white" value={selectedTeamId} onChange={e => setSelectedTeamId(e.target.value)}>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                            <div className="max-h-[300px] overflow-y-auto border rounded-lg"><table className="w-full text-xs text-left"><thead className="bg-gray-100 font-bold text-gray-600 sticky top-0"><tr><th className="p-2 border-b">姓名</th><th className="p-2 border-b">号码</th><th className="p-2 border-b">位置</th><th className="p-2 border-b">年龄</th><th className="p-2 border-b">惯用脚</th></tr></thead><tbody className="divide-y divide-gray-100">{parsedPlayers.map((p, i) => (<tr key={i} className="hover:bg-gray-50"><td className="p-2 font-bold">{p.name}</td><td className="p-2">{p.number}</td><td className="p-2">{p.position}</td><td className="p-2">{p.age}</td><td className="p-2">{p.preferredFoot}</td></tr>))}</tbody></table></div>
                        </div>
                    )}
                </div>
                <div className="p-4 bg-gray-50 border-t flex justify-end space-x-2 shrink-0"><button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-300">取消</button>{step === 'preview' && (<button onClick={handleConfirmImport} className="px-4 py-2 bg-bvb-black text-white rounded-lg text-sm font-bold hover:bg-gray-800 flex items-center"><Upload className="w-4 h-4 mr-2" /> 确认导入</button>)}</div>
            </div>
        </div>
    );
};

interface RechargeModalProps {
    player?: Player;
    onClose: () => void;
    onSubmit: (amount: number, quota: number) => void;
}
const RechargeModal: React.FC<RechargeModalProps> = ({ player, onClose, onSubmit }) => {
    const [amount, setAmount] = useState<string>('10'); const [quota, setQuota] = useState<string>('0');
    if (!player) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
                <h3 className="font-bold text-lg mb-2 flex items-center"><CreditCard className="w-5 h-5 mr-2 text-bvb-yellow"/> 课时充值</h3>
                <p className="text-sm text-gray-500 mb-4">为 <span className="font-bold text-bvb-black">{player.name}</span> 充值课时及请假额度。</p>
                <div className="space-y-4">
                    <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 tracking-wider">充值课时数</label><input type="number" className="w-full p-2.5 border border-gray-200 rounded-lg text-sm font-bold bg-white focus:ring-2 focus:ring-bvb-yellow outline-none text-gray-800" value={amount} onChange={(e) => setAmount(e.target.value)}/></div>
                    <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 tracking-wider">增加请假额度 (次)</label><input type="number" className="w-full p-2.5 border border-gray-200 rounded-lg text-sm font-bold bg-white focus:ring-2 focus:ring-bvb-yellow outline-none text-gray-800" value={quota} onChange={(e) => setQuota(e.target.value)}/></div>
                </div>
                <div className="flex justify-end gap-3 mt-6"><button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200">取消</button><button onClick={() => onSubmit(Number(amount) || 0, Number(quota) || 0)} className="px-4 py-2 bg-bvb-black text-white rounded-lg text-xs font-bold hover:bg-gray-800">确认充值</button></div>
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
    const [amount, setAmount] = useState<string>('10'); const [quota, setQuota] = useState<string>('0');
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
                <h3 className="font-bold text-lg mb-2 flex items-center"><CreditCard className="w-5 h-5 mr-2 text-bvb-yellow"/> 批量充值</h3>
                <p className="text-sm text-gray-500 mb-4">为选中的 <span className="font-bold text-bvb-black">{count}</span> 名球员进行充值。</p>
                <div className="space-y-4">
                    <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 tracking-wider">充值课时数 (每人)</label><input type="number" className="w-full p-2.5 border border-gray-200 rounded-lg text-sm font-bold bg-white focus:ring-2 focus:ring-bvb-yellow outline-none text-gray-800" value={amount} onChange={(e) => setAmount(e.target.value)}/></div>
                    <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 tracking-wider">增加请假额度 (每人)</label><input type="number" className="w-full p-2.5 border border-gray-200 rounded-lg text-sm font-bold bg-white focus:ring-2 focus:ring-bvb-yellow outline-none text-gray-800" value={quota} onChange={(e) => setQuota(e.target.value)}/></div>
                </div>
                <div className="flex justify-end gap-3 mt-6"><button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200">取消</button><button onClick={() => onSubmit(Number(amount) || 0, Number(quota) || 0)} className="px-4 py-2 bg-bvb-black text-white rounded-lg text-xs font-bold hover:bg-gray-800">确认批量充值</button></div>
            </div>
        </div>
    );
};

interface PositionSelectProps {
    value: Position;
    onChange: (val: Position) => void;
    className?: string;
    disabled?: boolean;
}
const PositionSelect: React.FC<PositionSelectProps> = ({ value, onChange, className, disabled }) => {
    return (
        <div className="relative group">
            <select disabled={disabled} value={value} onChange={e => onChange(e.target.value as Position)} className={`appearance-none w-full p-2 rounded text-sm font-bold border-none focus:ring-2 focus:ring-offset-1 focus:ring-bvb-yellow cursor-pointer bg-white ${className || ''}`}>
                <optgroup label="守门员" className="text-gray-400 font-normal"><option value={Position.GK_ATT} className="text-black bg-white">{Position.GK_ATT}</option><option value={Position.GK_DEF} className="text-black bg-white">{Position.GK_DEF}</option></optgroup>
                <optgroup label="后卫" className="text-gray-400 font-normal"><option value={Position.CB} className="text-black bg-white">{Position.CB}</option><option value={Position.LB} className="text-black bg-white">{Position.LB}</option><option value={Position.RB} className="text-black bg-white">{Position.RB}</option><option value={Position.LWB} className="text-black bg-white">{Position.LWB}</option><option value={Position.RWB} className="text-black bg-white">{Position.RWB}</option></optgroup>
                <optgroup label="中场" className="text-gray-400 font-normal"><option value={Position.CAM} className="text-black bg-white">{Position.CAM}</option><option value={Position.CM} className="text-black bg-white">{Position.CM}</option><option value={Position.CDM} className="text-black bg-white">{Position.CDM}</option></optgroup>
                <optgroup label="前锋" className="text-gray-400 font-normal"><option value={Position.F9} className="text-black bg-white">{Position.F9}</option><option value={Position.ST} className="text-black bg-white">{Position.ST}</option><option value={Position.LW} className="text-black bg-white">{Position.LW}</option><option value={Position.RW} className="text-black bg-white">{Position.RW}</option></optgroup>
                <optgroup label="其他" className="text-gray-400 font-normal"><option value={Position.TBD} className="text-black bg-white">{Position.TBD}</option></optgroup>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none opacity-50" />
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
    const [isEditing, setIsEditing] = useState(false);
    const [editedPlayer, setEditedPlayer] = useState<Player>(JSON.parse(JSON.stringify(player)));
    const [activeTab, setActiveTab] = useState<'overview' | 'technical' | 'tactical' | 'physical' | 'mental' | 'reviews' | 'records' | 'gallery'>('overview');
    const [detailAttendanceScope, setDetailAttendanceScope] = useState<'month' | 'quarter' | 'year'>('month');
    const [isExporting, setIsExporting] = useState(false);
    const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const profileImageInputRef = useRef<HTMLInputElement>(null);
    const [exportYear, setExportYear] = useState<number>(new Date().getFullYear());
    const isCoach = currentUser?.role === 'coach';
    const isDirector = currentUser?.role === 'director';

    // Gallery editing state
    const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
    const [tempCaption, setTempCaption] = useState('');

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
        if (initialFilter === 'pending_reviews') { setActiveTab('reviews'); } 
        else if (initialFilter === 'pending_stats') { setActiveTab('overview'); }
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

    const categoryLabels: Record<AttributeCategory, string> = { technical: '技术能力', tactical: '战术意识', physical: '身体素质', mental: '心理素质' };
    const getAvg = (category: AttributeCategory) => {
      const configItems = attributeConfig[category]; if (configItems.length === 0) return 0;
      let sum = 0; let count = 0;
      configItems.forEach(attr => { const val = editedPlayer.stats[category][attr.key] || 0; sum += val; count++; });
      return count === 0 ? 0 : parseFloat((sum / count).toFixed(1));
    };
    const overviewRadarData = [
      { subject: '技术', A: getAvg('technical'), fullMark: 10 },
      { subject: '战术', A: getAvg('tactical'), fullMark: 10 },
      { subject: '身体', A: getAvg('physical'), fullMark: 10 },
      { subject: '心理', A: getAvg('mental'), fullMark: 10 },
    ];
    const getCategoryRadarData = (category: AttributeCategory) => {
      return attributeConfig[category].map(attr => ({ subject: attr.label, value: editedPlayer.stats[category][attr.key] || 0, fullMark: 10 }));
    };

    const attendanceRate = calculateAttendanceRate(player, trainings, detailAttendanceScope);
    const handleSave = () => {
      const updatedPlayer = { ...editedPlayer, statsStatus: 'Published' as ApprovalStatus, lastPublishedStats: JSON.parse(JSON.stringify(editedPlayer.stats)) };
      onUpdatePlayer(updatedPlayer); setSaveStatus('saved');
    };
    const handleDelete = () => { if (confirm('确定要删除这名球员吗？此操作不可撤销。')) { onDeletePlayer(player.id); onClose(); } };
    const handleDeleteRechargeAction = (rechargeId: string) => {
         onDeleteRecharge(player.id, rechargeId);
         setEditedPlayer(prev => ({ ...prev, credits: (prev.credits || 0) - (prev.rechargeHistory?.find(r => r.id === rechargeId)?.amount || 0), rechargeHistory: prev.rechargeHistory?.filter(r => r.id !== rechargeId) || [] }));
    };
    const handleExportPDF = async () => { setIsExporting(true); try { await exportToPDF('player-profile-export', `${player.name}_${exportYear}_年度档案`); } catch (error) { alert('导出失败，请重试'); } finally { setIsExporting(false); } };
    const handleStatChange = (category: keyof PlayerStats, key: string, value: number) => {
      setEditedPlayer(prev => ({ ...prev, stats: { ...prev.stats, [category]: { ...prev.stats[category], [key]: value } }, }));
    };
    const handleIdCardChangeLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
      const id = e.target.value; const updates: any = { idCard: id };
      if (id.length === 18) {
        const year = parseInt(id.substring(6, 10)); const month = parseInt(id.substring(10, 12)); const day = parseInt(id.substring(12, 14));
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          const birthDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          updates.birthDate = birthDateStr; const today = new Date(); let age = today.getFullYear() - year;
          const m = today.getMonth() + 1 - month; if (m < 0 || (m === 0 && today.getDate() < day)) { age--; } updates.age = age;
        }
        const genderDigit = parseInt(id.charAt(16)); if (!isNaN(genderDigit)) { updates.gender = genderDigit % 2 === 1 ? '男' : '女'; }
      }
      setEditedPlayer(prev => ({ ...prev, ...updates }));
    };

    const handleGenerateAiReview = async () => {
        setIsGeneratingReview(true);
        try {
            const draft = await generatePlayerReview(player, newReview.quarter || 'Q1', newReview.year || new Date().getFullYear());
            setNewReview(prev => ({ ...prev, technicalTacticalImprovement: draft.tech, mentalDevelopment: draft.mental, summary: draft.summary }));
        } catch (e) { alert('生成失败，请稍后重试'); } finally { setIsGeneratingReview(false); }
    };

    const handleEditReview = (review: PlayerReview) => {
        setEditingReviewId(review.id);
        setNewReview({ ...review });
    };

    // --- 点评持久化核心修复 ---
    const handleSaveReview = (status: ApprovalStatus = 'Draft') => {
        let updatedReviews: PlayerReview[];
        if (editingReviewId) {
             updatedReviews = (editedPlayer.reviews || []).map(r => {
                if (r.id === editingReviewId) {
                    return { ...r, ...newReview, status, date: new Date().toISOString().split('T')[0] } as PlayerReview;
                }
                return r;
            });
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
            updatedReviews = [...(editedPlayer.reviews || []), review];
        }
        const updatedPlayer = { ...editedPlayer, reviews: updatedReviews };
        setEditedPlayer(updatedPlayer);
        onUpdatePlayer(updatedPlayer); // 同步到父组件及云端
        setNewReview({ year: new Date().getFullYear(), quarter: 'Q1', technicalTacticalImprovement: '', mentalDevelopment: '', summary: '', status: 'Draft' });
    };
    
    const updateReviewStatus = (reviewId: string, status: ApprovalStatus) => {
        const updatedReviews = editedPlayer.reviews.map(r => r.id === reviewId ? { ...r, status } : r);
        const updatedPlayer = { ...editedPlayer, reviews: updatedReviews };
        setEditedPlayer(updatedPlayer);
        onUpdatePlayer(updatedPlayer); // 同步到父组件及云端
    };

    const handleDeleteReview = (reviewId: string) => {
        if(confirm('确定要删除这条点评记录吗？')) {
            const updatedReviews = editedPlayer.reviews.filter(r => r.id !== reviewId);
            const updatedPlayer = { ...editedPlayer, reviews: updatedReviews };
            setEditedPlayer(updatedPlayer);
            onUpdatePlayer(updatedPlayer); // 同步到父组件及云端
        }
    };

    const handleUploadPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const newPhoto: PlayerPhoto = { id: Date.now().toString(), url: reader.result as string, date: new Date().toISOString().split('T')[0], caption: '日常训练' };
                const updatedPlayer = { ...editedPlayer, gallery: [newPhoto, ...(editedPlayer.gallery || [])] };
                setEditedPlayer(updatedPlayer);
                onUpdatePlayer(updatedPlayer);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => { setEditedPlayer(prev => ({ ...prev, image: reader.result as string })); };
            reader.readAsDataURL(file);
        }
    };

    const handleDeletePhoto = (photoId: string) => {
        if(confirm('确定要删除这张照片吗？')) {
            const updatedPlayer = { ...editedPlayer, gallery: editedPlayer.gallery?.filter(p => p.id !== photoId) || [] };
            setEditedPlayer(updatedPlayer);
            onUpdatePlayer(updatedPlayer);
        }
    };

    const handleSavePhotoCaption = (photoId: string) => {
        const updatedGallery = (editedPlayer.gallery || []).map(p => {
            if (p.id === photoId) return { ...p, caption: tempCaption };
            return p;
        });
        const updatedPlayer = { ...editedPlayer, gallery: updatedGallery };
        setEditedPlayer(updatedPlayer);
        onUpdatePlayer(updatedPlayer);
        setEditingPhotoId(null);
    };

    const renderStatSliders = (category: AttributeCategory) => {
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
                    <span className={`text-sm font-black font-mono ${meta.color} bg-gray-50 px-1.5 rounded`}>{value}<span className="text-[9px] text-gray-300 ml-0.5 font-normal">/10</span></span>
                  </div>
                  <div className="relative h-4 flex items-center">
                      <input type="range" min="1" max="10" step="1" disabled={!isEditing} value={value} onChange={(e) => handleStatChange(category, attr.key, parseInt(e.target.value))} className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-gray-100 focus:outline-none focus:ring-0 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-gray-300 [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-110 hover:[&::-webkit-slider-thumb]:border-bvb-yellow" style={{ background: `linear-gradient(to right, ${meta.hex} ${(value-1)/9*100}%, #f3f4f6 ${(value-1)/9*100}%)` }} />
                  </div>
                </div>
              );
            })}
          </div>
        );
    };

    const renderCategoryContent = (category: AttributeCategory) => {
      const radarData = attributeConfig[category].map(attr => ({ subject: attr.label, value: editedPlayer.stats[category][attr.key] || 0, fullMark: 10 }));
      return (
         <div className="animate-in slide-in-from-right-4 duration-300 flex flex-col md:flex-row h-full gap-4 md:gap-6 overflow-hidden">
            <div className="w-full md:w-5/12 h-64 md:h-auto relative bg-gray-50/50 rounded-xl p-2 shrink-0 border border-gray-100 flex flex-col justify-center"><div className="absolute top-2 left-3 z-10"><span className="text-xs font-black text-gray-400 uppercase tracking-wider">{categoryLabels[category]}分析</span></div><div className="h-64 md:h-full w-full"><ResponsiveContainer width="100%" height="100%"><RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}><PolarGrid stroke="#e5e7eb" /><PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 'bold' }} /><PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} /><Radar name={categoryLabels[category]} dataKey="value" stroke="#000" strokeWidth={2} fill="#FDE100" fillOpacity={0.6} /></RadarChart></ResponsiveContainer></div><div className="absolute bottom-2 right-2 bg-white px-2 py-1 rounded shadow-sm border border-gray-100 text-center"><div className="text-[10px] text-gray-400 font-bold uppercase">平均分</div><div className="text-lg font-black text-bvb-black">{getAvg(category)}</div></div></div>
            <div className="w-full md:w-7/12 overflow-y-auto custom-scrollbar pb-20 md:pb-0 pr-1"><div className="mb-3 px-1 flex justify-between items-center sticky top-0 bg-white z-10 py-2 border-b border-gray-50"><span className="text-xs text-gray-400 font-bold flex items-center"><Edit2 className="w-3 h-3 mr-1" />{isEditing ? '拖动滑块调整数值' : '点击右上角“编辑”进行修改'}</span></div>{renderStatSliders(category)}</div>
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
                                            <div className="flex items-center gap-2"><span className="text-xs text-gray-400">{review.date}</span><button onClick={() => handleDeleteReview(review.id)} className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button></div>
                                        </div>
                                        <div className="space-y-3">
                                            <div><h4 className="text-xs font-bold text-gray-500 uppercase mb-1">技战术能力改善</h4><p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-2 rounded">{review.technicalTacticalImprovement || '（未填写）'}</p></div>
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
                    <form className="space-y-4 flex-1 flex flex-col" onSubmit={(e) => { e.preventDefault(); handleSaveReview('Published'); }}>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">年份</label><select className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none text-sm bg-white" value={newReview.year} onChange={e => setNewReview({...newReview, year: parseInt(e.target.value)})}>{[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}</select></div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">季度</label><select className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none text-sm bg-white" value={newReview.quarter} onChange={e => setNewReview({...newReview, quarter: e.target.value as any})}><option value="Q1">Q1 (第一季度)</option><option value="Q2">Q2 (第二季度)</option><option value="Q3">Q3 (第三季度)</option><option value="Q4">Q4 (第四季度)</option></select></div>
                        </div>
                        <div><label className="block text-xs font-bold text-gray-500 mb-1">技战术能力改善</label><textarea required rows={3} className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none text-sm bg-white" placeholder="描述球员本季度的技术和战术进步..." value={newReview.technicalTacticalImprovement} onChange={e => setNewReview({...newReview, technicalTacticalImprovement: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold text-gray-500 mb-1">心理建设</label><textarea required rows={3} className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none text-sm bg-white" placeholder="评价球员的心理状态、抗压能力和团队融入..." value={newReview.mentalDevelopment} onChange={e => setNewReview({...newReview, mentalDevelopment: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold text-gray-500 mb-1">季度总结</label><textarea required rows={3} className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none text-sm bg-white" placeholder="综合评价与下季度目标..." value={newReview.summary} onChange={e => setNewReview({...newReview, summary: e.target.value})} /></div>
                        <div className="mt-auto grid grid-cols-2 gap-3 pb-16 md:pb-0">
                            <button type="button" onClick={() => handleSaveReview('Draft')} className="py-2 bg-gray-200 text-gray-700 font-bold rounded hover:bg-gray-300 transition-colors">预览/保存草稿</button>
                            <button type="button" onClick={() => handleSaveReview('Published')} className="py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700 transition-colors flex items-center justify-center"><CheckCircle className="w-3 h-3 mr-1" /> {editingReviewId ? '更新并发布' : '直接发布'}</button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    const renderRecords = () => {
        type Event = { id: string; originalId?: string; date: string; type: 'recharge' | 'training'; status?: string; amount: number; desc: string; quotaAdded?: number; };
        const events: Event[] = []; (editedPlayer.rechargeHistory || []).forEach(r => events.push({ id: `rech-${r.id}`, originalId: r.id, date: r.date, type: 'recharge', amount: r.amount, desc: `充值 ${r.amount} 课时 (含请假额度 ${r.quotaAdded}次)`, quotaAdded: r.quotaAdded }));
        trainings.forEach(t => { const record = t.attendance?.find(r => r.playerId === editedPlayer.id); if (record && record.status !== 'Absent') { let amount = 0; let desc = ''; if (record.status === 'Present') { amount = -1; desc = `参加训练: ${t.title}`; } else if (record.status === 'Leave') { amount = 0; desc = `请假: ${t.title}`; } else if (record.status === 'Injury') { amount = 0; desc = `伤停: ${t.title}`; } events.push({ id: `train-${t.id}`, date: t.date, type: 'training', status: record.status, amount, desc }); } });
        events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        let balance = 0; const historyWithBalance = events.map(e => { if (e.type === 'recharge') { balance += e.amount; } else if (e.type === 'training') { if (e.status === 'Present') { balance -= 1; e.amount = -1; } else if (e.status === 'Leave') { e.amount = 0; e.desc += ' (消耗额度)'; } } return { ...e, balanceAfter: balance }; });
        const displayList = [...historyWithBalance].reverse();
        return (
            <div className="animate-in slide-in-from-right-4 duration-300 h-full flex flex-col pb-20 md:pb-0"><div className="flex-1 overflow-y-auto custom-scrollbar border rounded-xl"><table className="w-full text-sm text-left"><thead className="bg-gray-50 text-gray-500 font-bold sticky top-0 z-10"><tr><th className="px-4 py-3">日期</th><th className="px-4 py-3">类型</th><th className="px-4 py-3">详情</th><th className="px-4 py-3 text-right">变动</th><th className="px-4 py-3 text-right">结余</th><th className="px-4 py-3 w-10"></th></tr></thead><tbody className="divide-y divide-gray-100">{displayList.map((item) => (<tr key={item.id} className="hover:bg-gray-50 group"><td className="px-4 py-3 whitespace-nowrap text-gray-600 font-mono text-xs">{item.date}</td><td className="px-4 py-3">{item.type === 'recharge' ? '充值' : item.status}</td><td className="px-4 py-3 text-gray-700">{item.desc}</td><td className={`px-4 py-3 text-right font-bold ${item.amount > 0 ? 'text-green-600' : item.amount < 0 ? 'text-red-500' : 'text-gray-400'}`}>{item.amount > 0 ? `+${item.amount}` : item.amount}</td><td className="px-4 py-3 text-right font-mono font-black text-gray-700 bg-gray-50/30 tabular-nums">{item.balanceAfter}</td><td className="px-4 py-3 text-right">{item.type === 'recharge' && isDirector && (<button onClick={(e) => { e.stopPropagation(); if(item.originalId) handleDeleteRechargeAction(item.originalId); }} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1" title="删除记录"><Trash2 className="w-4 h-4" /></button>)}</td></tr>))}</tbody></table></div></div>
        );
    };

    const renderGallery = () => {
        return (
            <div className="animate-in slide-in-from-right-4 duration-300 h-full flex flex-col pb-24 md:pb-6">
                <div className="flex justify-between items-center mb-4 sticky top-0 bg-white z-10 py-2">
                    <h3 className="font-bold text-gray-800 flex items-center">
                        <ImageIcon className="w-5 h-5 mr-2 text-bvb-yellow" /> 精彩瞬间
                    </h3>
                    <button onClick={() => galleryInputRef.current?.click()} className="px-4 py-2 bg-bvb-black text-white rounded-lg text-xs font-bold hover:bg-gray-800 flex items-center shadow-sm">
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
                                <div key={photo.id} className="relative group bg-gray-100 rounded-lg overflow-hidden aspect-square border border-gray-200 shadow-sm flex flex-col">
                                    <div className="flex-1 overflow-hidden relative">
                                        <img src={photo.url} alt="Gallery" className="w-full h-full object-cover" />
                                        <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { setEditingPhotoId(photo.id); setTempCaption(photo.caption || ''); }} className="p-1.5 bg-white/90 text-bvb-black rounded-full hover:bg-white shadow-sm" title="编辑名称">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeletePhoto(photo.id)} className="p-1.5 bg-white/90 text-red-500 rounded-full hover:bg-white shadow-sm" title="删除">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="bg-gradient-to-t from-black/80 to-black/20 p-3 pt-6 shrink-0 mt-[-40px] relative z-10">
                                        <div className="flex justify-between items-end gap-2">
                                            {editingPhotoId === photo.id ? (
                                                <div className="flex-1 flex gap-1">
                                                    <input 
                                                        autoFocus
                                                        className="flex-1 bg-white/20 border border-white/30 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-bvb-yellow"
                                                        value={tempCaption}
                                                        onChange={(e) => setTempCaption(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleSavePhotoCaption(photo.id)}
                                                    />
                                                    <button onClick={() => handleSavePhotoCaption(photo.id)} className="text-bvb-yellow hover:text-white">
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white text-xs font-black truncate">{photo.caption || '未命名'}</p>
                                                    <p className="text-white/50 text-[10px] font-mono">{photo.date}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
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
          <div className="bg-bvb-black text-white p-4 flex justify-between items-center shrink-0">
             <div className="flex items-center space-x-3"><button onClick={onClose} className="md:hidden mr-2 p-1"><ChevronLeft className="w-6 h-6" /></button><h2 className="text-xl font-bold uppercase tracking-wider flex items-center"><UserIcon className="w-5 h-5 mr-2 text-bvb-yellow" /> 球员档案</h2>{isEditing && (<div className="ml-4 flex items-center gap-2">{saveStatus === 'saving' && <span className="text-xs text-bvb-yellow flex items-center bg-gray-800 px-2 py-0.5 rounded-full"><RefreshCw className="w-3 h-3 mr-1 animate-spin"/> 保存中</span>}{saveStatus === 'saved' && <span className="text-xs text-green-400 flex items-center bg-gray-800 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3 mr-1"/> 已保存</span>}</div>)}</div>
             <div className="flex items-center space-x-3"><div className="hidden md:flex items-center gap-2 bg-gray-800 rounded px-2"><span className="text-xs text-gray-400 font-bold">导出年份:</span><select value={exportYear} onChange={(e) => setExportYear(parseInt(e.target.value))} className="bg-transparent text-white text-xs font-bold py-1 focus:outline-none">{[2023, 2024, 2025, 2026].map(y => <option key={y} value={y} className="text-black">{y}</option>)}</select></div><button onClick={handleExportPDF} disabled={isExporting} className="hidden md:flex p-2 bg-gray-800 rounded hover:bg-gray-700 text-bvb-yellow items-center" title="导出PDF档案">{isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}</button>{isEditing ? (<><button onClick={() => setIsEditing(false)} className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm">退出</button><button onClick={handleSave} className={`px-3 py-1 font-bold rounded hover:brightness-110 text-sm flex items-center ${saveStatus === 'saved' ? 'bg-green-600 text-white' : 'bg-bvb-yellow text-bvb-black'}`}>{saveStatus === 'saved' ? <CheckCircle className="w-4 h-4 mr-1" /> : <Save className="w-4 h-4 mr-2" />} {saveStatus === 'saved' ? '已保存' : '保存'}</button></>) : (<><button onClick={() => setIsEditing(true)} className="p-2 bg-gray-800 rounded hover:bg-gray-700 text-bvb-yellow" title="编辑"><Edit2 className="w-4 h-4" /></button>{isDirector && <button onClick={handleDelete} className="p-2 bg-red-900/50 text-red-400 rounded hover:bg-red-900 hover:text-red-300" title="删除"><Trash2 className="w-4 h-4" /></button>}</>)}<button onClick={onClose} className="hidden md:block hover:bg-gray-800 p-1 rounded"><X className="w-6 h-6" /></button></div>
          </div>
          <div className="bg-gray-100 border-b border-gray-200 shrink-0 sticky top-0 z-10"><div className="flex overflow-x-auto no-scrollbar">{[{ id: 'overview', label: '概览', icon: Activity }, { id: 'technical', label: '技术', icon: Target }, { id: 'tactical', label: '战术', icon: Brain }, { id: 'physical', label: '身体', icon: Dumbbell }, { id: 'mental', label: '心理', icon: CheckSquare }, { id: 'reviews', label: '点评', icon: FileText }, { id: 'records', label: '记录', icon: History }, { id: 'gallery', label: '相册', icon: ImageIcon }].map(tab => (<button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-shrink-0 flex items-center px-6 py-4 font-bold text-sm transition-colors border-b-2 ${activeTab === tab.id ? 'border-bvb-yellow text-bvb-black bg-white' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}><tab.icon className={`w-4 h-4 mr-2 ${activeTab === tab.id ? 'text-bvb-yellow fill-current stroke-bvb-black' : ''}`} />{tab.label}</button>))}</div></div>
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white pb-24 md:pb-6">
             {activeTab === 'overview' && (<div className="flex flex-col md:flex-row gap-6 h-full animate-in fade-in duration-300"><div className="w-full md:w-1/3 space-y-6"><div className="flex flex-col items-center"><div className="relative group"><img src={editedPlayer.image} alt={editedPlayer.name} className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-bvb-yellow shadow-lg" />{isEditing && (<><div onClick={() => profileImageInputRef.current?.click()} className="absolute inset-0 rounded-full bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer z-10"><Upload className="w-6 h-6 text-white mb-1" /><span className="text-[10px] text-white font-bold">更换头像</span></div><input type="file" ref={profileImageInputRef} className="hidden" accept="image/*" onChange={handleProfileImageChange}/></>)}<div className="absolute bottom-0 right-0 w-10 h-10 bg-bvb-black text-white rounded-full flex items-center justify-center font-black border-2 border-white text-lg overflow-hidden z-20">{isEditing ? <input type="number" className="bg-transparent text-center w-full h-full text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" value={editedPlayer.number} onChange={(e) => setEditedPlayer({ ...editedPlayer, number: parseInt(e.target.value) || 0 })} /> : editedPlayer.number}</div></div><div className="text-center mt-4 w-full">{isEditing ? <input value={editedPlayer.name} onChange={e => setEditedPlayer({...editedPlayer, name: e.target.value})} className="text-2xl font-black text-center w-full border-b border-gray-300 focus:border-bvb-yellow outline-none mb-2 bg-white"/> : <h3 className="text-2xl font-black text-gray-900">{editedPlayer.name}</h3>}<div className="flex justify-center items-center mt-2 space-x-2">{isEditing ? (<div className="flex gap-2 items-center w-full max-w-[240px]"><div className="flex-1"><PositionSelect value={editedPlayer.position} onChange={val => setEditedPlayer({...editedPlayer, position: val})} className={getPosColor(editedPlayer.position)}/></div><select value={editedPlayer.teamId} onChange={e => setEditedPlayer({...editedPlayer, teamId: e.target.value})} className="text-xs bg-white p-1 rounded border font-medium focus:ring-2 focus:ring-bvb-yellow outline-none shrink-0" disabled={isCoach}>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}<option value="unassigned">待分配</option></select></div>) : (<><span className={`px-3 py-1 rounded text-xs font-bold uppercase ${getPosColor(editedPlayer.position)}`}>{editedPlayer.position}</span><span className="text-sm font-bold text-gray-500">{teams.find(t => t.id === editedPlayer.teamId)?.name || (editedPlayer.teamId === 'unassigned' ? '待分配' : '未知梯队')}</span></>)}</div>{!isEditing && editedPlayer.nickname && <p className="text-xs text-gray-400 mt-1 font-bold">昵称: {editedPlayer.nickname}</p>}</div></div>{isEditing && (<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center justify-between"><span className="text-sm font-bold text-yellow-800 flex items-center"><Crown className="w-4 h-4 mr-2" /> 队长身份</span><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={editedPlayer.isCaptain || false} onChange={(e) => setEditedPlayer({...editedPlayer, isCaptain: e.target.checked})}/><div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bvb-yellow"></div></label></div>)}<div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-4 text-sm"><div className="col-span-2 flex items-center justify-between border-b pb-2"><span className="text-gray-500 flex items-center"><CreditCard className="w-3 h-3 mr-1"/> 身份证</span>{isEditing ? (<input className="font-mono font-bold text-right border-b border-dashed border-gray-300 bg-white focus:ring-0 outline-none p-0 w-44 hover:border-bvb-yellow transition-colors" value={editedPlayer.idCard} onChange={handleIdCardChangeLocal} placeholder="点击修改" maxLength={18}/>) : (<span className="font-mono font-bold">{editedPlayer.idCard || '未录入'}</span>)}</div><div className="flex flex-col"><span className="text-gray-500 text-xs">性别</span><span className="font-bold">{editedPlayer.gender}</span></div><div className="flex flex-col"><span className="text-gray-500 text-xs">年龄</span><span className="font-bold">{editedPlayer.age} 岁</span></div><div className="flex flex-col"><span className="text-gray-500 text-xs">出生日期</span>{isEditing ? <input type="date" className="bg-white border rounded text-xs p-1 font-bold" value={editedPlayer.birthDate || ''} onChange={e => setEditedPlayer({...editedPlayer, birthDate: e.target.value})} /> : <span className="font-bold font-mono">{editedPlayer.birthDate || '未录入'}</span>}</div><div className="flex flex-col"><span className="text-gray-500 text-xs">惯用脚</span>{isEditing ? <select className="bg-white border rounded text-xs p-1 font-bold" value={editedPlayer.preferredFoot} onChange={e => setEditedPlayer({...editedPlayer, preferredFoot: e.target.value as any})}><option value="右">右脚</option><option value="左">左脚</option></select> : <span className="font-bold">{editedPlayer.preferredFoot}脚</span>}</div><div className="flex flex-col"><span className="text-gray-500 text-xs">昵称</span>{isEditing ? <input className="bg-white border rounded text-xs p-1 font-bold" value={editedPlayer.nickname || ''} onChange={e => setEditedPlayer({...editedPlayer, nickname: e.target.value})} placeholder="选填" /> : <span className="font-bold">{editedPlayer.nickname || '-'}</span>}</div></div><div className="bg-gray-50 rounded-xl p-4 space-y-3"><h4 className="text-xs font-bold text-gray-400 uppercase border-b border-gray-200 pb-2 mb-2">体格信息</h4><div className="grid grid-cols-2 gap-4"><div className="flex items-center gap-3"><div className="p-2 bg-white rounded-lg border border-gray-100 text-gray-400"><Ruler className="w-4 h-4" /></div><div className="flex flex-col"><span className="text-[10px] text-gray-400 uppercase font-bold">身高 (cm)</span>{isEditing ? <input type="number" className="p-1 border rounded text-xs bg-white w-20" value={editedPlayer.height || ''} onChange={e => setEditedPlayer({...editedPlayer, height: parseInt(e.target.value)})} /> : <span className="font-bold">{editedPlayer.height || '-'}</span>}</div></div><div className="flex items-center gap-3"><div className="p-2 bg-white rounded-lg border border-gray-100 text-gray-400"><Weight className="w-4 h-4" /></div><div className="flex flex-col"><span className="text-[10px] text-gray-400 uppercase font-bold">体重 (kg)</span>{isEditing ? <input type="number" className="p-1 border rounded text-xs bg-white w-20" value={editedPlayer.weight || ''} onChange={e => setEditedPlayer({...editedPlayer, weight: parseInt(e.target.value)})} /> : <span className="font-bold">{editedPlayer.weight || '-'}</span>}</div></div></div></div><div className="bg-gray-50 rounded-xl p-4 space-y-3"><h4 className="text-xs font-bold text-gray-400 uppercase border-b border-gray-200 pb-2 mb-2">详细资料</h4><div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm"><div className="flex flex-col"><span className="text-gray-500 text-xs flex items-center"><CalendarDays className="w-3 h-3 mr-1"/> 入队时间</span>{isEditing ? <input type="date" className="p-1 border rounded text-xs bg-white" value={editedPlayer.joinDate || ''} onChange={e => setEditedPlayer({...editedPlayer, joinDate: e.target.value})} /> : (<div><span className="font-bold">{editedPlayer.joinDate || '-'}</span>{editedPlayer.joinDate && calculateTenure(editedPlayer.joinDate) && (<div className="text-[10px] text-bvb-black bg-bvb-yellow px-1.5 py-0.5 rounded w-max mt-1 font-bold">球龄: {calculateTenure(editedPlayer.joinDate)}</div>)}</div>)}</div><div className="flex flex-col"><span className="text-gray-500 text-xs flex items-center"><School className="w-3 h-3 mr-1"/> 就读学校</span>{isEditing ? <input className="p-1 border rounded text-xs bg-white" placeholder="学校名称" value={editedPlayer.school || ''} onChange={e => setEditedPlayer({...editedPlayer, school: e.target.value})} /> : <span className="font-bold truncate">{editedPlayer.school || '-'}</span>}</div><div className="flex flex-col"><span className="text-gray-500 text-xs flex items-center"><UserIcon className="w-3 h-3 mr-1"/> 家长姓名</span>{isEditing ? <input className="p-1 border rounded text-xs bg-white" placeholder="姓名" value={editedPlayer.parentName || ''} onChange={e => setEditedPlayer({...editedPlayer, parentName: e.target.value})} /> : <span className="font-bold">{editedPlayer.parentName || '-'}</span>}</div><div className="flex flex-col"><span className="text-gray-500 text-xs flex items-center"><Phone className="w-3 h-3 mr-1"/> 联系方式</span>{isEditing ? <input className="p-1 border rounded text-xs bg-white" placeholder="电话号码" value={editedPlayer.parentPhone || ''} onChange={e => setEditedPlayer({...editedPlayer, parentPhone: e.target.value})} /> : <span className="font-bold font-mono">{editedPlayer.parentPhone || '-'}</span>}</div></div></div></div><div className="w-full md:w-2/3 flex flex-col space-y-4"><div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl p-4 shadow-md flex justify-between items-center relative overflow-hidden"><div className="relative z-10"><p className="text-gray-400 text-xs uppercase font-bold mb-1">剩余课时 (Credits)</p><div className="flex items-baseline space-x-2"><h2 className={`text-4xl font-black ${editedPlayer.credits <= 5 ? 'text-red-400' : 'text-bvb-yellow'}`}>{editedPlayer.credits}</h2><span className="text-sm text-gray-400">节</span></div><div className="mt-2 flex items-center text-xs text-gray-400"><Clock className="w-3 h-3 mr-1" /> 有效期至: {editedPlayer.validUntil || 'N/A'}{isExpired(editedPlayer.validUntil) && <span className="text-red-400 font-bold ml-2">(已过期)</span>}</div></div></div><div className="flex-1 bg-white border border-gray-100 rounded-xl shadow-sm relative min-h-[300px] p-2"><h4 className="absolute top-2 left-2 font-bold text-gray-400 uppercase text-xs">综合能力图谱 (当前编辑预览)</h4><ResponsiveContainer width="100%" height="100%"><RadarChart cx="50%" cy="50%" outerRadius="70%" data={overviewRadarData}><PolarGrid stroke="#e5e7eb" /><PolarAngleAxis dataKey="subject" tick={{ fill: '#4b5563', fontWeight: 'bold' }} /><PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} /><Radar name="能力" dataKey="A" stroke="#000000" strokeWidth={3} fill="#FDE100" fillOpacity={0.6} /></RadarChart></ResponsiveContainer></div></div></div>)}
             {activeTab === 'technical' && renderCategoryContent('technical')}
             {activeTab === 'tactical' && renderCategoryContent('tactical')}
             {activeTab === 'physical' && renderCategoryContent('physical')}
             {activeTab === 'mental' && renderCategoryContent('mental')}
             {activeTab === 'reviews' && renderReviews()}
             {activeTab === 'records' && renderRecords()}
             {activeTab === 'gallery' && renderGallery()}
          </div>
           {/* HIDDEN PDF TEMPLATE */}
           <div id="player-profile-export" className="absolute left-[-9999px] top-0 w-[210mm] bg-white text-black p-0 z-[-1000] font-sans"><div className="w-full h-[297mm] p-[10mm] flex flex-col relative overflow-hidden bg-white"><div className="flex justify-between items-end border-b-4 border-bvb-yellow pb-4 mb-8"><div className="flex items-center gap-4"><img src={appLogo} alt="Club Logo" className="w-20 h-20 object-contain" /><div><h1 className="text-3xl font-black uppercase tracking-tighter text-bvb-black">顽石之光足球俱乐部</h1><p className="text-sm font-bold text-gray-400 tracking-widest uppercase">青少年精英梯队年度报告</p></div></div><div className="text-right"><div className="text-5xl font-black text-bvb-yellow text-outline">{exportYear}</div><div className="text-sm font-bold text-gray-500 uppercase">Season Report</div></div></div><div className="flex-1 flex flex-col gap-5"><div className="flex gap-8 bg-gray-50 rounded-lg p-6 border border-gray-100 relative overflow-hidden"><div className="w-32 h-32 rounded-full overflow-hidden border-4 border-bvb-yellow shadow-lg bg-white relative z-10 shrink-0"><img src={editedPlayer.image} alt={editedPlayer.name} className="w-full h-full object-cover" crossOrigin="anonymous" /></div><div className="relative z-10 flex-1 flex flex-col justify-center"><h2 className="text-3xl font-black text-gray-900 mb-1">{editedPlayer.name}</h2><p className="text-sm font-bold text-gray-500 mb-4 uppercase">#{editedPlayer.number} • {editedPlayer.position} • {teams.find(t => t.id === editedPlayer.teamId)?.name}</p><div className="grid grid-cols-4 gap-4 text-sm w-full"><div><span className="block text-gray-400 text-xs">年龄</span><span className="font-bold">{editedPlayer.age}岁</span></div><div><span className="block text-gray-400 text-xs">球龄</span><span className="font-bold">{calculateTenure(editedPlayer.joinDate) || '-'}</span></div><div><span className="block text-gray-400 text-xs">惯用脚</span><span className="font-bold">{editedPlayer.preferredFoot}脚</span></div><div><span className="block text-gray-400 text-xs">综合评分</span><span className="font-black text-bvb-yellow bg-black px-2 rounded">{getOverallRating(editedPlayer)}</span></div></div></div><div className="absolute top-0 right-0 w-64 h-64 bg-bvb-yellow/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div></div><div className="grid grid-cols-3 gap-6"><div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm flex flex-col items-center justify-center relative overflow-hidden"><div className="absolute left-0 top-0 bottom-0 w-1.5 bg-bvb-yellow"></div><span className="text-xs font-bold text-gray-400 uppercase mb-1">出场 (Apps)</span><span className="text-3xl font-black text-gray-800">{editedPlayer.appearances}</span></div><div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm flex flex-col items-center justify-center relative overflow-hidden"><div className="absolute left-0 top-0 bottom-0 w-1.5 bg-black"></div><span className="text-xs font-bold text-gray-400 uppercase mb-1">进球 (Goals)</span><span className="text-3xl font-black text-gray-800">{editedPlayer.goals}</span></div><div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm flex flex-col items-center justify-center relative overflow-hidden"><div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gray-400"></div><span className="text-xs font-bold text-gray-400 uppercase mb-1">助攻 (Assists)</span><span className="text-3xl font-black text-gray-800">{editedPlayer.assists}</span></div></div><div><h3 className="text-lg font-black text-gray-800 border-l-4 border-bvb-yellow pl-3 mb-6 uppercase">四维能力深度分析</h3><div className="grid grid-cols-2 gap-x-8 gap-y-8">{(['technical', 'tactical', 'physical', 'mental'] as AttributeCategory[]).map(cat => (<div key={cat} className="flex flex-col items-center"><div className="w-full h-[220px] relative border border-gray-100 rounded-xl p-2 bg-gray-50/30"><span className="absolute top-2 left-3 text-xs font-black text-gray-400 uppercase tracking-wider">{categoryLabels[cat]}</span><div className="absolute top-2 right-3 text-xl font-black text-gray-800">{getAvg(cat)}</div><ResponsiveContainer width="100%" height="100%"><RadarChart cx="50%" cy="55%" outerRadius="70%" data={getCategoryRadarData(cat)}><PolarGrid stroke="#e5e7eb" /><PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 9, fontWeight: 'bold' }} /><PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} /><Radar name={categoryLabels[cat]} dataKey="value" stroke="#000" strokeWidth={2} fill="#FDE100" fillOpacity={0.6} isAnimationActive={false} /></RadarChart></ResponsiveContainer></div></div>))}</div></div><div className="flex-1 flex flex-col min-h-0"><h3 className="text-lg font-black text-gray-800 border-l-4 border-bvb-yellow pl-3 mb-4 uppercase">年度考评记录</h3><div className="grid grid-cols-2 gap-4 flex-1">{editedPlayer.reviews?.filter(r => r.year === exportYear).sort((a,b) => a.quarter.localeCompare(b.quarter)).map((review, idx) => (<div key={review.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-xs h-full"><div className="flex justify-between items-center mb-2 border-b border-gray-200 pb-2"><span className="font-black text-bvb-black bg-bvb-yellow px-2 py-0.5 rounded">{review.quarter}</span><span className="text-gray-400 font-mono">{review.date}</span></div><div className="space-y-2"><div><span className="font-bold text-gray-500 uppercase block mb-0.5">技战术表现</span><p className="text-gray-800 leading-snug">{review.technicalTacticalImprovement || '-'}</p></div><div><span className="font-bold text-gray-500 uppercase block mb-0.5">心理成长</span><p className="text-gray-800 leading-snug">{review.mentalDevelopment || '-'}</p></div><div className="pt-2 mt-2 border-t border-gray-100"><p className="text-gray-600 italic font-medium">"{review.summary}"</p></div></div></div>))}{(!editedPlayer.reviews?.some(r => r.year === exportYear)) && (<div className="col-span-2 text-center text-gray-400 italic py-8 border border-dashed border-gray-300 rounded-lg">本年度暂无考评记录</div>)}</div></div></div><div className="mt-8 pt-4 border-t border-gray-200 flex justify-between items-center text-xs text-gray-400 font-mono"><span>CONFIDENTIAL REPORT</span><span>GENERATED ON {new Date().toLocaleDateString()}</span></div></div>{editedPlayer.gallery && editedPlayer.gallery.some(p => p.date.startsWith(String(exportYear))) && (<div className="w-full h-[297mm] p-[10mm] flex flex-col relative overflow-hidden bg-white break-before-page"><div className="flex justify-between items-end border-b-4 border-bvb-yellow pb-4 mb-8"><div><h1 className="text-2xl font-black uppercase tracking-tighter text-bvb-black">{editedPlayer.name}</h1><p className="text-sm font-bold text-gray-400 tracking-widest uppercase">年度精彩瞬间 / Gallery</p></div><div className="text-right"><div className="text-3xl font-black text-bvb-yellow text-outline">{exportYear}</div></div></div><div className="grid grid-cols-2 gap-6 auto-rows-max">{editedPlayer.gallery.filter(p => p.date.startsWith(String(exportYear))).slice(0, 6).map(photo => (<div key={photo.id} className="break-inside-avoid"><div className="aspect-[4/3] w-full rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-gray-50"><img src={photo.url} className="w-full h-full object-cover" crossOrigin="anonymous"/></div><div className="mt-2 flex justify-between items-center text-xs"><span className="font-bold text-gray-600">{photo.caption || '训练瞬间'}</span><span className="font-mono text-gray-400">{photo.date}</span></div></div>))}</div><div className="mt-auto pt-4 border-t border-gray-200 flex justify-between items-center text-xs text-gray-400 font-mono"><span>WSZG CLUB</span><span>PAGE 2</span></div></div>)}</div>
        </div>
      </div>
    );
};

// --- PlayerManager (Main Component) ---
const PlayerManager: React.FC<PlayerManagerProps> = ({ 
  teams, players, trainings = [], attributeConfig, currentUser, onAddPlayer, onBulkAddPlayers, onAddTeam, onUpdateTeam, onDeleteTeam, onUpdatePlayer, onDeletePlayer, onBulkDeletePlayers, onTransferPlayers, onAddPlayerReview, onRechargePlayer, onBulkRechargePlayers, onDeleteRecharge, initialFilter, appLogo
}) => {
  const isDirector = currentUser?.role === 'director';
  const isCoach = currentUser?.role === 'coach';
  const availableTeams = isCoach ? teams.filter(t => currentUser?.teamIds?.includes(t.id)) : teams;
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPos, setFilterPos] = useState<string>('全部');
  const [showDraftsOnly, setShowDraftsOnly] = useState(false);
  const [isExportingList, setIsExportingList] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortField, setSortField] = useState<'default' | 'age' | 'rating' | 'attendance' | 'credits' | 'position'>('default');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (initialFilter === 'pending_reviews' || initialFilter === 'pending_stats') { setShowDraftsOnly(true); } 
    else { const isTeamId = teams.some(t => t.id === initialFilter) || initialFilter === 'unassigned'; if (isTeamId) { setSelectedTeamId(initialFilter as string); setShowDraftsOnly(false); } }
  }, [initialFilter, teams]);

  useEffect(() => {
    if (isCoach && currentUser?.teamIds && currentUser.teamIds.length > 0) {
        if (!selectedTeamId || !currentUser.teamIds.includes(selectedTeamId)) {
             if (!(teams.some(t => t.id === initialFilter) && currentUser.teamIds.includes(initialFilter as string))) { setSelectedTeamId(currentUser.teamIds[0]); }
        } return;
    }
    const teamExists = teams.some(t => t.id === selectedTeamId); const isUnassigned = selectedTeamId === 'unassigned';
    if (!teamExists && !isUnassigned) { if (teams.length > 0) { setSelectedTeamId(teams[0].id); } else { setSelectedTeamId('unassigned'); } } else if (!selectedTeamId && teams.length > 0) { setSelectedTeamId(teams[0].id); }
  }, [teams, currentUser, isCoach, selectedTeamId]);

  const [attendanceScope, setAttendanceScope] = useState<'month' | 'quarter' | 'year'>('month');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  useEffect(() => { if (selectedPlayer) { const updated = players.find(p => p.id === selectedPlayer.id); if (updated && updated !== selectedPlayer) { setSelectedPlayer(updated); } } }, [players]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAddPlayerModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [showEditTeamModal, setShowEditTeamModal] = useState(false);
  const [teamToEdit, setTeamToEdit] = useState<Team | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showBulkRechargeModal, setShowBulkRechargeModal] = useState(false);
  const [rechargePlayerId, setRechargePlayerId] = useState<string | null>(null);

  useEffect(() => { setSelectedIds(new Set()); setIsSelectionMode(false); }, [selectedTeamId]);
  const selectedTeam = teams.find(t => t.id === selectedTeamId);
  const [newPlayer, setNewPlayer] = useState<Partial<Player>>({ name: '', gender: '男', idCard: '', birthDate: '', position: Position.ST, number: 0, age: 0, image: '', teamId: '', isCaptain: false, joinDate: '', school: '', parentName: '', parentPhone: '', preferredFoot: '右', nickname: '', height: undefined, weight: undefined });
  const [newTeam, setNewTeam] = useState<Partial<Team>>({ name: '', level: 'U17', description: '' });
  
  const handleIdCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const id = e.target.value; const updates: Partial<Player> = { idCard: id };
    if (id.length === 18) {
      const year = parseInt(id.substring(6, 10)); const month = parseInt(id.substring(10, 12)); const day = parseInt(id.substring(12, 14));
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        const birthDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        updates.birthDate = birthDateStr; const today = new Date(); let age = today.getFullYear() - year;
        const m = today.getMonth() + 1 - month; if (m < 0 || (m === 0 && today.getDate() < day)) { age--; } updates.age = age;
      }
      const genderDigit = parseInt(id.charAt(16)); if (!isNaN(genderDigit)) { updates.gender = genderDigit % 2 === 1 ? '男' : '女'; }
    }
    setNewPlayer(prev => ({ ...prev, ...updates }));
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => { setNewPlayer(prev => ({ ...prev, image: reader.result as string })); }; reader.readAsDataURL(file); } };
  const filteredPlayers = players.filter(p => {
    const shouldIgnoreTeamFilter = showDraftsOnly && isDirector; const matchesTeam = shouldIgnoreTeamFilter || p.teamId === selectedTeamId;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const posVal = p.position.toString(); const isFwd = posVal.includes('锋') || posVal.includes('9'); const isMid = posVal.includes('中场'); const isDef = posVal.includes('后卫') || posVal.includes('翼卫'); const isGk = posVal.includes('守门员');
    const matchesPos = filterPos === '全部' || (filterPos === '前锋' && isFwd) || (filterPos === '中场' && isMid) || (filterPos === '后卫' && isDef) || (filterPos === '门将' && isGk);
    if (showDraftsOnly) { const hasDraftReviews = p.reviews?.some(r => r.status === 'Draft' || r.status === 'Submitted'); const hasDraftStats = p.statsStatus === 'Draft' || p.statsStatus === 'Submitted'; if (!hasDraftReviews && !hasDraftStats) return false; }
    return matchesTeam && matchesSearch && matchesPos;
  }).sort((a, b) => {
    if (sortField === 'age') { const dateA = a.birthDate || '0000-00-00'; const dateB = b.birthDate || '0000-00-00'; return sortDirection === 'asc' ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA); }
    if (sortField === 'rating') { const rateA = parseFloat(getOverallRating(a)); const rateB = parseFloat(getOverallRating(b)); return sortDirection === 'asc' ? rateA - rateB : rateB - rateA; }
    if (sortField === 'attendance') { const attA = calculateAttendanceRate(a, trainings, 'year'); const attB = calculateAttendanceRate(b, trainings, 'year'); return sortDirection === 'asc' ? attA - attB : attB - attA; }
    if (sortField === 'credits') { return sortDirection === 'asc' ? a.credits - b.credits : b.credits - a.credits; }
    if (sortField === 'position') { const orderA = POSITION_ORDER[a.position] || 999; const orderB = POSITION_ORDER[b.position] || 999; return sortDirection === 'asc' ? orderA - orderB : orderB - orderA; }
    const joinA = a.joinDate || '9999-99-99'; const joinB = b.joinDate || '9999-99-99'; if (joinA !== joinB) { return joinA.localeCompare(joinB); }
    if (a.isCaptain && !b.isCaptain) return -1; if (!a.isCaptain && b.isCaptain) return 1; return (a.number || 0) - (b.number || 0);
  });

  const toggleSelection = (id: string) => { const newSet = new Set(selectedIds); if (newSet.has(id)) { newSet.delete(id); } else { newSet.add(id); } setSelectedIds(newSet); };
  const handleSelectAll = () => { if (selectedIds.size === filteredPlayers.length) { setSelectedIds(new Set()); } else { setSelectedIds(new Set(filteredPlayers.map(p => p.id))); } };
  const executeBulkDelete = () => { if (confirm(`确定要删除选中的 ${selectedIds.size} 名球员吗？`)) { onBulkDeletePlayers(Array.from(selectedIds)); setSelectedIds(new Set()); setIsSelectionMode(false); } };
  const handleTransferConfirm = (targetTeamId: string) => { onTransferPlayers(Array.from(selectedIds), targetTeamId); setSelectedIds(new Set()); setIsSelectionMode(false); setShowTransferModal(false); };
  const handleBulkRechargeConfirm = (amount: number, quota: number) => { onBulkRechargePlayers(Array.from(selectedIds), amount, quota); setSelectedIds(new Set()); setIsSelectionMode(false); setShowBulkRechargeModal(false); };
  const handleExportPlayerList = async () => { setIsExportingList(true); try { const exportTitle = selectedTeam ? `${selectedTeam.name}_球员名单` : '全部球员名单'; await exportToPDF('player-list-export', exportTitle); } catch (e) { alert('导出失败，请重试'); } finally { setIsExportingList(false); } };
  
  const handleAddPlayerSubmit = (e: React.FormEvent) => {
    e.preventDefault(); 
    const finalTeamId = newPlayer.teamId || selectedTeamId;
    if (newPlayer.name && newPlayer.name.trim() && finalTeamId && newPlayer.number !== undefined && !isNaN(newPlayer.number)) {
        const defaultStats = generateDefaultStats(attributeConfig);
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);

        const p: Player = { 
            id: Date.now().toString(), 
            teamId: finalTeamId, 
            name: newPlayer.name.trim(), 
            gender: newPlayer.gender || '男', 
            idCard: newPlayer.idCard || '', 
            birthDate: newPlayer.birthDate || '', 
            number: newPlayer.number, 
            position: (newPlayer.position || Position.ST) as Position, 
            isCaptain: newPlayer.isCaptain || false, 
            age: newPlayer.age || 16, 
            goals: 0, 
            assists: 0, 
            appearances: 0, 
            image: newPlayer.image || `https://picsum.photos/200/200?random=${Date.now()}`, 
            stats: defaultStats, 
            statsStatus: 'Published', 
            lastPublishedStats: JSON.parse(JSON.stringify(defaultStats)), 
            reviews: [], 
            credits: 0, 
            validUntil: nextYear.toISOString().split('T')[0], 
            leaveQuota: 0, 
            leavesUsed: 0, 
            rechargeHistory: [], 
            joinDate: newPlayer.joinDate || new Date().toISOString().split('T')[0], 
            school: newPlayer.school || '', 
            parentName: newPlayer.parentName || '', 
            parentPhone: newPlayer.parentPhone || '', 
            gallery: [], 
            preferredFoot: (newPlayer.preferredFoot || '右') as '左' | '右', 
            height: newPlayer.height, 
            weight: newPlayer.weight, 
            nickname: newPlayer.nickname || '' 
        };
        
        onAddPlayer(p); 
        setShowAddModal(false); 
        setNewPlayer({ name: '', gender: '男', idCard: '', birthDate: '', age: 0, position: Position.ST, number: 0, image: '', teamId: '', isCaptain: false, joinDate: '', school: '', parentName: '', parentPhone: '', preferredFoot: '右', height: undefined, weight: undefined, nickname: '' });
    } else {
        alert('请完整填写必填项：姓名、球衣号码及归属梯队。');
    }
  };

  const handleAddTeamSubmit = (e: React.FormEvent) => { e.preventDefault(); if (newTeam.name && newTeam.level) { const t: Team = { id: `t-${Date.now()}`, name: newTeam.name!, level: newTeam.level!, description: newTeam.description || '新组建的梯队' }; onAddTeam(t); setSelectedTeamId(t.id); setShowAddTeamModal(false); setNewTeam({ name: '', level: 'U17', description: '' }); } };
  const handleUpdateTeamSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (teamToEdit && teamToEdit.name && teamToEdit.level) {
          onUpdateTeam(teamToEdit);
          setShowEditTeamModal(false);
          setTeamToEdit(null);
      }
  };

  const openRechargeModal = (e: React.MouseEvent, playerId: string) => { e.stopPropagation(); setRechargePlayerId(playerId); setShowRechargeModal(true); };
  const handleRechargeSubmit = (amount: number, quota: number) => { if (rechargePlayerId) { onRechargePlayer(rechargePlayerId, amount, quota); setShowRechargeModal(false); setRechargePlayerId(null); } };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-100px)] md:h-auto gap-6 relative">
      <div className="w-full md:w-64 flex-shrink-0 flex flex-col space-y-4">
        <div className="flex justify-between items-center md:block"><h2 className="text-3xl font-black text-bvb-black uppercase hidden md:block mb-4">球队管理</h2>{isDirector && <button onClick={() => setShowAddTeamModal(true)} className="text-xs flex items-center text-gray-500 hover:text-bvb-black font-bold border border-gray-300 rounded-full px-3 py-1 md:w-full md:justify-center md:py-2 md:border-2 md:border-dashed md:hover:border-bvb-yellow md:hover:bg-yellow-50"><Plus className="w-3 h-3 mr-1" /> 新建梯队</button>}</div>
        <div className="md:hidden overflow-x-auto pb-2 flex space-x-2 no-scrollbar">{availableTeams.map(team => <button key={team.id} onClick={() => setSelectedTeamId(team.id)} className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${selectedTeamId === team.id ? 'bg-bvb-yellow text-bvb-black shadow-md' : 'bg-white text-gray-500 border border-gray-200'}`}>{team.name}</button>)}<button onClick={() => setSelectedTeamId('unassigned')} className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${selectedTeamId === 'unassigned' ? 'bg-bvb-yellow text-bvb-black shadow-md' : 'bg-white text-gray-500 border border-gray-200'}`}>待分配</button></div>
        <div className="hidden md:flex flex-col space-y-2">{availableTeams.map(team => (<div key={team.id} className="relative group"><button onClick={() => setSelectedTeamId(team.id)} className={`w-full text-left p-4 rounded-xl transition-all border-l-4 ${selectedTeamId === team.id ? 'bg-white border-bvb-yellow shadow-md transform translate-x-2' : 'bg-gray-50 border-transparent text-gray-500 hover:bg-white hover:shadow-sm'}`}><h3 className={`font-bold ${selectedTeamId === team.id ? 'text-bvb-black' : ''}`}>{team.name}</h3><p className="text-xs text-gray-400 mt-1">{team.description}</p></button>{isDirector && (<div className="absolute top-4 right-2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-white/80 rounded-lg p-1 shadow-sm"><button onClick={(e) => { e.stopPropagation(); setTeamToEdit(team); setShowEditTeamModal(true); }} className="p-1.5 text-gray-400 hover:text-bvb-black transition-colors" title="修改梯队分组"><Edit2 className="w-4 h-4" /></button><button onClick={(e) => { e.stopPropagation(); if (confirm('确定要删除这支球队吗？删除后该队球员将自动转入“待分配”列表，不会被删除。')) { onDeleteTeam(team.id); } }} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="删除球队"><Trash2 className="w-4 h-4" /></button></div>)}</div>))}<button onClick={() => setSelectedTeamId('unassigned')} className={`w-full text-left p-4 rounded-xl transition-all border-l-4 mt-2 ${selectedTeamId === 'unassigned' ? 'bg-white border-gray-400 shadow-md transform translate-x-2' : 'bg-gray-50 border-transparent text-gray-500 hover:bg-white hover:shadow-sm'}`}><div className="flex justify-between items-center"><h3 className={`font-bold ${selectedTeamId === 'unassigned' ? 'text-gray-800' : ''}`}>待分配球员</h3><span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">{players.filter(p => p.teamId === 'unassigned').length}</span></div><p className="text-xs text-gray-400 mt-1">暂无归属梯队的球员</p></button></div>
      </div>
      <div className="flex-1 flex flex-col min-h-0">
        <div className="bg-white p-4 rounded-xl shadow-sm mb-4 flex flex-col sm:flex-row justify-between items-center gap-4"><div className="flex w-full sm:w-auto items-center gap-3"><div className="flex items-center bg-gray-100 px-3 py-2 rounded-lg flex-1 sm:w-64"><Search className="w-5 h-5 text-gray-400 mr-2" /><input placeholder="搜索球员..." className="bg-transparent border-none focus:outline-none text-sm w-full bg-white px-2 rounded" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/></div><div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg shrink-0"><div className="relative"><select className="appearance-none bg-transparent pl-3 pr-8 py-1.5 rounded-md text-xs font-bold text-gray-600 focus:outline-none cursor-pointer hover:text-bvb-black" value={sortField} onChange={(e) => setSortField(e.target.value as any)}><option value="default">默认 (按入队时间)</option><option value="position">按场上位置</option><option value="age">出生年月</option><option value="rating">综合评分</option><option value="attendance">出勤率</option><option value="credits">课时余额</option></select><ArrowUpDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" /></div>{sortField !== 'default' && (<button onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')} className="p-1.5 bg-white shadow-sm rounded-md text-gray-600 hover:text-bvb-black transition-colors">{sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}</button>)}</div><div className="flex bg-gray-100 p-1 rounded-lg shrink-0"><button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-bvb-black' : 'text-gray-400'}`} title="列表视图"><LayoutList className="w-4 h-4" /></button><button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow text-bvb-black' : 'text-gray-400'}`} title="网格视图"><LayoutGrid className="w-4 h-4" /></button></div></div><div className="flex w-full sm:w-auto items-center gap-2 overflow-x-auto no-scrollbar"><div className="flex gap-1 p-1 bg-gray-100 rounded-lg shrink-0">{['全部', '前锋', '中场', '后卫', '门将'].map(pos => <button key={pos} onClick={() => setFilterPos(pos)} className={`px-3 py-1 rounded text-xs font-bold whitespace-nowrap transition-colors ${filterPos === pos ? 'bg-white text-bvb-black shadow-sm' : 'text-gray-500'}`}>{pos}</button>)}</div><button onClick={() => setShowDraftsOnly(!showDraftsOnly)} className={`px-3 py-1 rounded text-xs font-bold whitespace-nowrap transition-colors border flex items-center gap-1 shrink-0 ${showDraftsOnly ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'}`}><ClipboardCheck className="w-3 h-3" /> 草稿箱</button></div><div className="flex gap-2 w-full sm:w-auto justify-end"><button onClick={() => setIsSelectionMode(!isSelectionMode)} className={`p-2 rounded-lg border ${isSelectionMode ? 'bg-gray-800 text-white' : 'border-gray-300 text-gray-500'}`} title="批量管理"><CheckSquare className="w-5 h-5" /></button>{isDirector && (<><button onClick={handleExportPlayerList} disabled={isExportingList} className="p-2 rounded-lg border border-gray-300 text-gray-500" title="导出名单">{isExportingList ? <Loader2 className="w-5 h-5 animate-spin"/> : <Download className="w-5 h-5" />}</button><button onClick={() => setShowImportModal(true)} className="p-2 rounded-lg border border-gray-300 text-gray-500" title="批量导入"><FileSpreadsheet className="w-5 h-5" /></button><button onClick={() => setShowAddModal(true)} className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-bvb-yellow text-bvb-black font-bold rounded-lg shadow-sm hover:brightness-105"><Plus className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">录入</span>球员</button></>)}</div></div>{(showDraftsOnly || isSelectionMode) && (<div className={`px-4 py-2 rounded-lg mb-4 text-sm flex items-center justify-between ${showDraftsOnly ? 'bg-blue-50 text-blue-700' : 'bg-bvb-black text-white'}`}>{showDraftsOnly && !isSelectionMode && (<><div className="flex items-center font-bold"><ClipboardCheck className="w-4 h-4 mr-2" />{isDirector ? '未发布草稿' : '本队草稿'} ({filteredPlayers.length})</div><button onClick={() => setShowDraftsOnly(false)} className="text-xs hover:underline">清除筛选</button></>)}{isSelectionMode && (<><div className="flex items-center space-x-3"><button onClick={handleSelectAll} className="text-xs font-bold text-gray-400">全选</button><span className="text-sm font-bold">已选: {selectedIds.size}</span></div><div className="flex space-x-2"><button disabled={selectedIds.size === 0} onClick={() => setShowTransferModal(true)} className="px-3 py-1 bg-gray-700 rounded text-xs font-bold disabled:opacity-50">移交</button>{isDirector && <button disabled={selectedIds.size === 0} onClick={() => setShowBulkRechargeModal(true)} className="px-3 py-1 bg-gray-700 rounded text-xs font-bold disabled:opacity-50">充值</button>}{isDirector && <button disabled={selectedIds.size === 0} onClick={executeBulkDelete} className="px-3 py-1 bg-red-900 rounded text-xs font-bold disabled:opacity-50">删除</button>}<button onClick={() => setIsSelectionMode(false)} className="px-2 hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button></div></>)}</div>)}
        {viewMode === 'list' && (<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 overflow-y-auto custom-scrollbar"><table className="w-full text-left border-collapse"><thead className="bg-gray-50 sticky top-0 z-10"><tr><th className="p-4 border-b w-12 text-center">{isSelectionMode && <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.size > 0 && selectedIds.size === filteredPlayers.length} />}</th><th className="p-4 border-b text-xs font-bold text-gray-500 uppercase">球员信息</th><th className="p-4 border-b text-xs font-bold text-gray-500 uppercase">梯队/位置</th><th className="p-4 border-b text-xs font-bold text-gray-500 uppercase hidden sm:table-cell">年龄</th><th className="p-4 border-b text-xs font-bold text-gray-500 uppercase">综合评分</th><th className="p-4 border-b text-xs font-bold text-gray-500 uppercase hidden md:table-cell w-32">出勤率</th><th className="p-4 border-b text-xs font-bold text-gray-500 uppercase hidden sm:table-cell">课时余额</th><th className="p-4 border-b text-xs font-bold text-gray-500 uppercase hidden md:table-cell">状态</th><th className="p-4 border-b text-xs font-bold text-gray-500 uppercase text-right">操作</th></tr></thead><tbody className="divide-y divide-gray-100">{filteredPlayers.length > 0 ? filteredPlayers.map((player) => { const isSelected = selectedIds.has(player.id); const overallRating = getOverallRating(player); const ratingVal = parseFloat(overallRating); const attendanceRate = calculateAttendanceRate(player, trainings, attendanceScope); const isExpiredValid = isExpired(player.validUntil); const hasDraftReviews = player.reviews?.some(r => r.status === 'Draft' || r.status === 'Submitted'); const hasDraftStats = player.statsStatus === 'Draft' || player.statsStatus === 'Submitted'; const teamName = teams.find(t => t.id === player.teamId)?.name || (player.teamId === 'unassigned' ? '待分配' : '未知'); return (<tr key={player.id} onClick={() => { if (isSelectionMode) toggleSelection(player.id); else setSelectedPlayer(player); }} className={`hover:bg-yellow-50/50 transition-colors cursor-pointer group ${isSelected ? 'bg-yellow-50' : ''}`}><td className="p-4 text-center">{isSelectionMode && (<input type="checkbox" checked={isSelected} onChange={() => toggleSelection(player.id)} onClick={(e) => e.stopPropagation()} />)}</td><td className="p-4"><div className="flex items-center gap-3"><div className="relative w-10 h-10 shrink-0"><img src={player.image} alt={player.name} className="w-10 h-10 rounded-full object-cover border border-gray-200 bg-gray-100" />{player.isCaptain && <div className="absolute -top-1 -left-1 w-4 h-4 bg-yellow-400 text-bvb-black flex items-center justify-center rounded-sm font-black text-[9px] border border-white z-10">C</div>}<div className="absolute -bottom-1 -right-1 bg-bvb-black text-white text-[9px] font-bold px-1 rounded-full border border-white">#{player.number}</div></div><div><div className="font-bold text-gray-900 text-sm">{player.name}</div>{getBirthdayStatus(player.birthDate) && <div className="text-[10px] text-pink-500 font-bold flex items-center mt-0.5"><Cake className="w-3 h-3 mr-1"/> 生日</div>}</div></div></td><td className="p-4"><div className="flex flex-col items-start gap-1"><span className={`text-xs font-bold px-1.5 py-0.5 rounded ${player.teamId === 'unassigned' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}>{teamName}</span><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getPosColorLight(player.position)}`}>{player.position}</span></div></td><td className="p-4 hidden sm:table-cell"><div className="text-xs"><div className="font-bold">{player.age}岁</div><div className="text-[10px] text-gray-400 font-mono mt-0.5">{player.birthDate}</div></div></td><td className="p-4"><div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-black ${ratingVal >= 8 ? 'bg-green-100 text-green-700' : ratingVal >= 6 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>{overallRating}</div></td><td className="p-4 hidden md:table-cell"><div className="w-full flex items-center gap-2"><div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-bvb-black" style={{ width: `${attendanceRate}%` }}></div></div><span className="text-xs font-bold text-gray-600 w-8 text-right">{attendanceRate}%</span></div></td><td className="p-4 hidden sm:table-cell"><div><div className={`text-sm font-bold ${player.credits <= 5 ? 'text-red-500' : 'text-gray-800'}`}>{player.credits} 节</div><div className="text-[10px] text-gray-400 mt-0.5">{isExpiredValid ? <span className="text-red-400 flex items-center"><AlertTriangle className="w-3 h-3 mr-1"/>已过期</span> : player.validUntil}</div></div></td><td className="p-4 hidden md:table-cell"><div className="flex flex-col gap-1 items-start">{hasDraftReviews && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold border border-blue-100">点评草稿</span>}{hasDraftStats && <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-bold border border-purple-100">数据更新</span>}{!hasDraftReviews && !hasDraftStats && <span className="text-[10px] text-gray-400">正常</span>}</div></td><td className="p-4 text-right flex justify-end gap-2">{isDirector && (<button onClick={(e) => openRechargeModal(e, player.id)} className="p-1.5 bg-white border border-gray-200 rounded text-gray-400 hover:text-bvb-black transition-colors" title="充值"><CreditCard className="w-4 h-4" /></button>)}{isDirector && (<button onClick={(e) => { e.stopPropagation(); if (confirm('确定要删除这名球员吗？')) { onDeletePlayer(player.id); } }} className="p-1.5 bg-white border border-gray-200 rounded text-red-400 hover:bg-red-50 transition-colors" title="删除"><Trash2 className="w-4 h-4" /></button>)}</td></tr>); }) : (<tr><td colSpan={9} className="py-20 text-center text-gray-400 italic">未找到匹配球员</td></tr>)}</tbody></table></div>)}
        {viewMode === 'grid' && (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pb-20 custom-scrollbar flex-1">{filteredPlayers.length > 0 ? filteredPlayers.map(player => { const birthdayStatus = getBirthdayStatus(player.birthDate); const isSelected = selectedIds.has(player.id); const overallRating = getOverallRating(player); const attendanceRate = calculateAttendanceRate(player, trainings, attendanceScope); const isExpiredValid = isExpired(player.validUntil); const teamName = teams.find(t => t.id === player.teamId)?.name || (player.teamId === 'unassigned' ? '待分配' : '未知'); return (<div key={player.id} onClick={() => { if (isSelectionMode) toggleSelection(player.id); else setSelectedPlayer(player); }} className={`bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all cursor-pointer border relative group flex flex-col ${isSelected ? 'border-bvb-yellow ring-2 ring-bvb-yellow/50' : 'border-gray-200 hover:border-bvb-yellow'}`}>{isSelectionMode && <div className={`absolute top-2 left-2 w-6 h-6 rounded border-2 z-30 flex items-center justify-center transition-colors ${isSelected ? 'bg-bvb-yellow border-bvb-black' : 'bg-white border-gray-300'}`}>{isSelected && <CheckCircle className="w-3 h-3 text-bvb-black" />}</div>}<div className="flex p-4 gap-4"><div className="relative flex-shrink-0"><div className="w-20 h-24 rounded-lg overflow-hidden bg-gray-100 shadow-inner relative"><img src={player.image} alt={player.name} className="w-full h-full object-cover object-top" /></div>{player.isCaptain && !isSelectionMode && <div className="absolute -top-1.5 -left-1.5 w-6 h-6 bg-yellow-400 text-bvb-black flex items-center justify-center rounded-sm font-black text-xs border border-white shadow-sm z-10 rotate-[-10deg]">C</div>}<div className={`absolute -bottom-2 right-0 left-0 mx-auto w-max px-2 py-0.5 text-[10px] font-bold text-white text-center rounded-full border border-white shadow-sm ${getPosColor(player.position)}`}>{player.position}</div></div><div className="flex-1 flex flex-col justify-between py-0.5"><div className="flex justify-between items-start"><div className="pr-2"><h3 className="font-bold text-gray-900 text-lg leading-tight line-clamp-1">{player.name}</h3><div className="flex flex-wrap items-center gap-1 mt-0.5"><span className={`text-[10px] font-bold px-1 rounded ${player.teamId === 'unassigned' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}>{teamName}</span><span className="text-[10px] text-gray-400">#{player.number}</span></div></div><div className="flex flex-col items-end"><span className={`text-xl font-black ${parseFloat(overallRating) >= 8 ? 'text-green-500' : parseFloat(overallRating) >= 6 ? 'text-yellow-500' : 'text-gray-400'}`}>{overallRating}</span><span className="text-[9px] text-gray-300 uppercase font-bold">Rating</span></div></div><div className="mt-2 space-y-1"><div className="flex justify-between items-center text-xs"><span className="text-gray-400">出勤率</span><div className="flex items-center"><div className="w-12 h-1.5 bg-gray-100 rounded-full mr-1 overflow-hidden"><div className="h-full bg-bvb-black rounded-full" style={{ width: `${attendanceRate}%` }}></div></div><span className="font-bold">{attendanceRate}%</span></div></div><div className="flex justify-between items-center text-xs"><span className="text-gray-400">课时</span><span className={`font-bold ${player.credits <= 5 ? 'text-red-500' : 'text-gray-700'}`}>{player.credits}</span></div></div></div></div><div className="bg-gray-50 px-4 py-2 border-t border-gray-100 flex justify-between items-center mt-auto">{birthdayStatus ? <span className={`text-[10px] text-white px-2 py-0.5 rounded-full font-bold flex items-center ${birthdayStatus.color}`}><Cake className="w-3 h-3 mr-1"/> {birthdayStatus.label}</span> : <span className="text-[10px] text-gray-400 flex items-center">{isExpiredValid ? <span className="text-red-400 font-bold flex items-center"><AlertTriangle className="w-3 h-3 mr-1"/>已过期</span> : <span>至 {player.validUntil}</span>}</span>}{isDirector && <button onClick={(e) => openRechargeModal(e, player.id)} className="p-1.5 bg-white border border-gray-200 rounded text-gray-400 hover:text-bvb-black transition-colors" title="充值"><CreditCard className="w-3 h-3" /></button>}</div></div>); }) : (<div className="col-span-full py-20 text-center text-gray-400 italic">未找到匹配球员</div>)}</div>)}
      </div>

      {showAddPlayerModal && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"><div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200"><div className="bg-bvb-black p-4 flex justify-between items-center text-white shrink-0"><h3 className="font-bold flex items-center"><Plus className="w-5 h-5 mr-2 text-bvb-yellow" /> 录入新球员</h3><button onClick={() => setShowAddModal(false)}><X className="w-5 h-5" /></button></div><form onSubmit={handleAddPlayerSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto"><div className="flex justify-center mb-4"><div className="relative group cursor-pointer w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 hover:border-bvb-yellow transition-colors" onClick={() => fileInputRef.current?.click()}>{newPlayer.image ? <img src={newPlayer.image} className="w-full h-full object-cover" /> : <Upload className="w-8 h-8 text-gray-400" />}<div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 text-white text-xs font-bold">上传照片</div></div><input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">姓名 <span className="text-red-500">*</span></label><input required className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none bg-white text-gray-800" value={newPlayer.name} onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} /></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">球衣号码 <span className="text-red-500">*</span></label><input type="number" required className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none bg-white text-gray-800" value={newPlayer.number ?? ''} onChange={e => setNewPlayer({...newPlayer, number: parseInt(e.target.value)})} /></div></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">身份证号 (自动解析)</label><input required className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none tracking-widest font-mono bg-white text-gray-800" maxLength={18} value={newPlayer.idCard} onChange={handleIdCardChange} placeholder="18位身份证号码" /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">场上位置</label><PositionSelect value={newPlayer.position || Position.ST} onChange={val => setNewPlayer({...newPlayer, position: val})} className={getPosColor(newPlayer.position || Position.ST)}/></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">所属梯队 <span className="text-red-500">*</span></label><select className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none bg-white text-gray-800" value={newPlayer.teamId || selectedTeamId} onChange={e => setNewPlayer({...newPlayer, teamId: e.target.value})} disabled={isCoach}>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}<option value="unassigned">待分配</option></select></div></div><div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200"><label className="block text-xs font-bold text-yellow-800 uppercase mb-2 flex items-center">惯用脚 <span className="text-red-500 ml-1">*</span></label><div className="flex gap-4"><label className="flex items-center cursor-pointer"><input type="radio" name="foot" className="hidden peer" checked={newPlayer.preferredFoot === '右'} onChange={() => setNewPlayer({...newPlayer, preferredFoot: '右'})} /><div className="px-4 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-bold peer-checked:bg-bvb-black peer-checked:text-bvb-yellow peer-checked:border-bvb-black transition-all">右脚 (R)</div></label><label className="flex items-center cursor-pointer"><input type="radio" name="foot" className="hidden peer" checked={newPlayer.preferredFoot === '左'} onChange={() => setNewPlayer({...newPlayer, preferredFoot: '左'})} /><div className="px-4 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-bold peer-checked:bg-bvb-black peer-checked:text-bvb-yellow peer-checked:border-bvb-black transition-all">左脚 (L)</div></label></div></div><div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mt-4 space-y-3"><h4 className="text-xs font-bold text-gray-500 uppercase">附加信息 (选填)</h4><div className="grid grid-cols-3 gap-3"><div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">身高 (cm)</label><input type="number" className="w-full p-2 border rounded text-xs bg-white text-gray-800" value={newPlayer.height || ''} onChange={e => setNewPlayer({...newPlayer, height: parseInt(e.target.value)})} /></div><div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">体重 (kg)</label><input type="number" className="w-full p-2 border rounded text-xs bg-white text-gray-800" value={newPlayer.weight || ''} onChange={e => setNewPlayer({...newPlayer, weight: parseInt(e.target.value)})} /></div><div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">昵称</label><input className="w-full p-2 border rounded text-xs bg-white text-gray-800" placeholder="例如: 小魔兽" value={newPlayer.nickname || ''} onChange={e => setNewPlayer({...newPlayer, nickname: e.target.value})} /></div></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">入队时间</label><input type="date" className="w-full p-2 border rounded text-xs bg-white text-gray-800" value={newPlayer.joinDate || ''} onChange={e => setNewPlayer({...newPlayer, joinDate: e.target.value})} /></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">学校</label><input className="w-full p-2 border rounded text-xs bg-white text-gray-800" placeholder="学校名称" value={newPlayer.school || ''} onChange={e => setNewPlayer({...newPlayer, school: e.target.value})} /></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">家长</label><input className="w-full p-2 border rounded text-xs bg-white text-gray-800" placeholder="姓名" value={newPlayer.parentName || ''} onChange={e => setNewPlayer({...newPlayer, parentName: e.target.value})} /></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">联系电话</label><input className="w-full p-2 border rounded text-xs bg-white text-gray-800" placeholder="手机" value={newPlayer.parentPhone || ''} onChange={e => setNewPlayer({...newPlayer, parentPhone: e.target.value})} /></div></div></div><button type="submit" className="w-full py-3 bg-bvb-yellow text-bvb-black font-bold rounded hover:brightness-105 mt-2">确认录入</button></form></div></div>)}
      {showAddTeamModal && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"><div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200"><div className="bg-bvb-black p-4 flex justify-between items-center text-white"><h3 className="font-bold flex items-center"><Shield className="w-5 h-5 mr-2 text-bvb-yellow" /> 新建梯队</h3><button onClick={() => setShowAddTeamModal(false)}><X className="w-5 h-5" /></button></div><form onSubmit={handleAddTeamSubmit} className="p-6 space-y-4"><div><label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 tracking-wider">梯队名称</label><input required className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none bg-white text-gray-800" placeholder="例如: U15 精英队" value={newTeam.name} onChange={e => setNewTeam({...newTeam, name: e.target.value})} /></div><div><label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 tracking-wider">级别</label><select className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none bg-white text-gray-800" value={newTeam.level} onChange={e => setNewTeam({...newTeam, level: e.target.value})}>{['U7','U8','U9','U10','U11','U12','U13','U15','U17','U19','First Team'].map(l => <option key={l} value={l}>{l}</option>)}</select></div><div><label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 tracking-wider">简介</label><textarea className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none bg-white text-gray-800" rows={3} value={newTeam.description} onChange={e => setNewTeam({...newTeam, description: e.target.value})} placeholder="简单描述梯队训练目标..." /></div><button type="submit" className="w-full py-3.5 bg-bvb-yellow text-bvb-black font-black rounded-xl hover:brightness-105 mt-2 shadow-lg shadow-yellow-400/20">创建梯队</button></form></div></div>)}
      {showEditTeamModal && teamToEdit && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"><div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200"><div className="bg-bvb-black p-4 flex justify-between items-center text-white"><h3 className="font-bold flex items-center"><Edit2 className="w-5 h-5 mr-2 text-bvb-yellow" /> 编辑梯队信息</h3><button onClick={() => { setShowEditTeamModal(false); setTeamToEdit(null); }}><X className="w-5 h-5" /></button></div><form onSubmit={handleUpdateTeamSubmit} className="p-6 space-y-4"><div><label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 tracking-wider">梯队名称</label><input required className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none bg-white text-gray-800" value={teamToEdit.name} onChange={e => setTeamToEdit({...teamToEdit, name: e.target.value})} /></div><div><label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 tracking-wider">调整级别 (组别升级)</label><select className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none bg-white text-gray-800" value={teamToEdit.level} onChange={e => setTeamToEdit({...teamToEdit, level: e.target.value})}>{['U7','U8','U9','U10','U11','U12','U13','U15','U17','U19','First Team'].map(l => <option key={l} value={l}>{l}</option>)}</select></div><div><label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 tracking-wider">修改简介</label><textarea className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none bg-white text-gray-800" rows={3} value={teamToEdit.description} onChange={e => setTeamToEdit({...teamToEdit, description: e.target.value})} /></div><button type="submit" className="w-full py-3.5 bg-bvb-yellow text-bvb-black font-black rounded-xl hover:brightness-105 mt-2 shadow-lg shadow-yellow-400/20">保存更改</button></form></div></div>)}
      {showImportModal && (<ImportPlayersModal teams={teams} attributeConfig={attributeConfig} onImport={onBulkAddPlayers} onClose={() => setShowImportModal(false)}/>)}
      {showTransferModal && (<TransferModal teams={teams} count={selectedIds.size} onClose={() => setShowTransferModal(false)} onConfirm={handleTransferConfirm} />)}
      {showRechargeModal && (<RechargeModal player={players.find(p => p.id === rechargePlayerId)} onClose={() => setShowRechargeModal(false)} onSubmit={handleRechargeSubmit}/>)}
      {showBulkRechargeModal && (<BulkRechargeModal count={selectedIds.size} onClose={() => setShowBulkRechargeModal(false)} onSubmit={handleBulkRechargeConfirm}/>)}
      {selectedPlayer && (<PlayerDetailModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} teams={teams} trainings={trainings} attributeConfig={attributeConfig} currentUser={currentUser} onUpdatePlayer={onUpdatePlayer} onDeletePlayer={onDeletePlayer} initialFilter={initialFilter} appLogo={appLogo} onDeleteRecharge={onDeleteRecharge}/>)}
      <div id="player-list-export" className="absolute left-[-9999px] top-0 w-[1100px] bg-white text-black p-12 z-[-1000] font-sans"><div className="flex items-center justify-between border-b-4 border-bvb-yellow pb-6 mb-8"><div className="flex items-center"><img src={appLogo} alt="Club Logo" className="w-24 h-24 object-contain mr-6" /><div><h1 className="text-4xl font-black uppercase tracking-tighter">顽石之光足球俱乐部</h1><p className="text-xl text-gray-500 font-bold mt-1">{selectedTeam ? `${selectedTeam.name} - 球员名单` : '全部球员名单'}</p></div></div><div className="text-right"><div className="text-sm font-bold text-gray-400 uppercase">生成日期</div><div className="text-2xl font-black">{new Date().toLocaleDateString()}</div></div></div><table className="w-full text-left border-collapse"><thead className="bg-gray-100 border-b-2 border-gray-300"><tr><th className="p-3 font-black text-sm uppercase text-gray-600">球员</th><th className="p-3 font-black text-sm uppercase text-gray-600">梯队</th><th className="p-3 font-black text-sm uppercase text-gray-600">位置</th><th className="p-3 font-black text-sm uppercase text-gray-600">年龄</th><th className="p-3 font-black text-sm uppercase text-gray-600">出生日期</th><th className="p-3 font-black text-sm uppercase text-gray-600">惯用脚</th><th className="p-3 font-black text-sm uppercase text-gray-600 text-right">监护人</th></tr></thead><tbody>{(filteredPlayers || []).map((p, idx) => (<tr key={p.id} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}><td className="p-3 font-bold text-gray-900 flex items-center gap-2"><span className="text-xs text-gray-400 font-mono w-4">{idx + 1}</span>{p.name} <span className="text-xs bg-bvb-yellow text-bvb-black px-1 rounded">#{p.number}</span></td><td className="p-3">{teams.find(t => t.id === p.teamId)?.name || '待分配'}</td><td className="p-3">{p.position}</td><td className="p-3">{p.age}岁</td><td className="p-3 font-mono">{p.birthDate || '-'}</td><td className="p-3">{p.preferredFoot}脚</td><td className="p-3 text-right">{p.parentName || '-'} {p.parentPhone || ''}</td></tr>))}</tbody></table><div className="mt-8 pt-4 border-t border-gray-200 flex justify-between items-center text-xs text-gray-400"><span>共 {filteredPlayers.length} 名球员</span><span>© 顽石之光足球俱乐部 - 内部资料</span></div></div>
    </div>
  );
};

export default PlayerManager;
