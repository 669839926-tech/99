import React, { useState, useEffect, useRef } from 'react';
import { Player, Position, Team, PlayerStats, AttributeConfig, AttributeCategory, TrainingSession, PlayerReview, User, ApprovalStatus } from '../types';
import { Search, Plus, Shield, ChevronRight, X, Save, Trash2, Edit2, Activity, Brain, Dumbbell, Target, CheckSquare, ArrowRightLeft, Upload, User as UserIcon, Calendar as CalendarIcon, CreditCard, Cake, MoreHorizontal, Star, Crown, ChevronDown, FileText, Loader2, Sparkles, Download, Clock, AlertTriangle, History, Filter, CheckCircle, Send, Globe, AlertCircle, ClipboardCheck, XCircle, FileSpreadsheet } from 'lucide-react';
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
  onUpdatePlayer: (player: Player) => void;
  onDeletePlayer: (playerId: string) => void;
  onBulkDeletePlayers: (playerIds: string[]) => void;
  onTransferPlayers: (playerIds: string[], targetTeamId: string) => void;
  onAddPlayerReview: (playerId: string, review: PlayerReview) => void;
  onRechargePlayer: (playerId: string, amount: number, leaveQuota: number) => void;
  initialFilter?: string;
}

const PlayerManager: React.FC<PlayerManagerProps> = ({ 
  teams, 
  players, 
  trainings = [],
  attributeConfig,
  currentUser,
  onAddPlayer, 
  onBulkAddPlayers,
  onAddTeam, 
  onUpdatePlayer, 
  onDeletePlayer,
  onBulkDeletePlayers,
  onTransferPlayers,
  onAddPlayerReview,
  onRechargePlayer,
  initialFilter
}) => {
  
  // Permissions Logic
  const isDirector = currentUser?.role === 'director';
  const isCoach = currentUser?.role === 'coach';
  
  // If coach, restrict team selection to assigned team
  const availableTeams = isCoach 
    ? teams.filter(t => t.id === currentUser?.teamId) 
    : teams;

  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPos, setFilterPos] = useState<string>('全部');
  const [showDraftsOnly, setShowDraftsOnly] = useState(false); // Changed from Pending to Drafts

  // Handle Initial Filter from Dashboard Navigation
  useEffect(() => {
    if (initialFilter === 'pending_reviews' || initialFilter === 'pending_stats') {
        setShowDraftsOnly(true);
    } else {
        setShowDraftsOnly(false);
    }
  }, [initialFilter]);

  // Initialize selectedTeamId based on role
  useEffect(() => {
    if (isCoach && currentUser?.teamId) {
        setSelectedTeamId(currentUser.teamId);
    } else if (!selectedTeamId && teams.length > 0) {
        setSelectedTeamId(teams[0].id);
    }
  }, [teams, currentUser, isCoach]);

  const [attendanceScope, setAttendanceScope] = useState<'month' | 'quarter' | 'year'>('month');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  // Sync selectedPlayer with players prop updates to ensure fresh data in modal
  useEffect(() => {
      if (selectedPlayer) {
          const updated = players.find(p => p.id === selectedPlayer.id);
          if (updated && updated !== selectedPlayer) {
              setSelectedPlayer(updated);
          }
      }
  }, [players, selectedPlayer]);
  
  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selection Mode State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargePlayerId, setRechargePlayerId] = useState<string | null>(null);

  // Reset selection when changing teams
  useEffect(() => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  }, [selectedTeamId]);

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  // New Player Form State
  const [newPlayer, setNewPlayer] = useState<Partial<Player>>({
    name: '',
    gender: '男',
    idCard: '',
    birthDate: '',
    position: Position.MID,
    number: 0,
    age: 0,
    image: '',
    teamId: '',
    isCaptain: false
  });

  // Recharge Form State
  const [rechargeData, setRechargeData] = useState({ amount: 50, quota: 3 });

  // ID Card Parsing Logic
  const handleIdCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const id = e.target.value;
    const updates: Partial<Player> = { idCard: id };

    if (id.length === 18) {
      // Parse Birth Date (YYYYMMDD) - chars 6-13
      const year = parseInt(id.substring(6, 10));
      const month = parseInt(id.substring(10, 12));
      const day = parseInt(id.substring(12, 14));
      
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        const birthDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        updates.birthDate = birthDateStr;

        // Calc Age
        const today = new Date();
        let age = today.getFullYear() - year;
        const m = today.getMonth() + 1 - month;
        if (m < 0 || (m === 0 && today.getDate() < day)) {
            age--;
        }
        updates.age = age;
      }

      // Parse Gender (17th digit, odd=Male, even=Female)
      const genderDigit = parseInt(id.charAt(16));
      if (!isNaN(genderDigit)) {
        updates.gender = genderDigit % 2 === 1 ? '男' : '女';
      }
    }
    
    setNewPlayer(prev => ({ ...prev, ...updates }));
  };

  // Image Upload Logic
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPlayer(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Birthday Helper
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

  // Helper: Calculate Overall Rating (1-10)
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

  // Helper: Calculate Attendance Rate with Scope
  const getAttendanceRate = (player: Player, scope: 'month' | 'quarter' | 'year') => {
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

      // Filter sessions that belong to the player's team AND fall within date range
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

  // Validity Checker
  const isExpired = (dateStr?: string) => {
      if (!dateStr) return true;
      return new Date(dateStr) < new Date();
  };

  // New Team Form State
  const [newTeam, setNewTeam] = useState<Partial<Team>>({
    name: '',
    level: 'U17',
    description: ''
  });

  const filteredPlayers = players.filter(p => {
    // Allow Director to see all teams when filtering for drafts/pending items
    const shouldIgnoreTeamFilter = showDraftsOnly && isDirector;
    const matchesTeam = shouldIgnoreTeamFilter || p.teamId === selectedTeamId;

    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPos = filterPos === '全部' || p.position === filterPos;
    
    // Draft/Pending Filter Logic
    if (showDraftsOnly) {
        // Look for Draft or Submitted (treating submitted as draft in this new workflow)
        const hasDraftReviews = p.reviews?.some(r => r.status === 'Draft' || r.status === 'Submitted');
        const hasDraftStats = p.statsStatus === 'Draft' || p.statsStatus === 'Submitted';
        
        // If it doesn't have draft items, filter it out
        if (!hasDraftReviews && !hasDraftStats) return false;
    }

    return matchesTeam && matchesSearch && matchesPos;
  }).sort((a, b) => {
    // Sort logic: Birthday Today first, then Captain, then others by number
    const statusA = getBirthdayStatus(a.birthDate);
    const statusB = getBirthdayStatus(b.birthDate);
    
    const isTodayA = statusA?.label === '今天生日';
    const isTodayB = statusB?.label === '今天生日';

    if (isTodayA && !isTodayB) return -1;
    if (!isTodayA && isTodayB) return 1;

    // Captain priority
    if (a.isCaptain && !b.isCaptain) return -1;
    if (!a.isCaptain && b.isCaptain) return 1;

    // Secondary sort by jersey number
    return (a.number || 0) - (b.number || 0);
  });

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
        newSet.delete(id);
    } else {
        newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredPlayers.length) {
        setSelectedIds(new Set());
    } else {
        setSelectedIds(new Set(filteredPlayers.map(p => p.id)));
    }
  };

  const executeBulkDelete = () => {
      onBulkDeletePlayers(Array.from(selectedIds));
      setSelectedIds(new Set());
      setIsSelectionMode(false);
  };

  const generateDefaultStats = (): PlayerStats => {
    const stats: any = {
        technical: {},
        tactical: {},
        physical: {},
        mental: {}
    };
    
    // Initialize defaults to 5 for all configured attributes (scale 1-10)
    Object.keys(attributeConfig).forEach((cat) => {
        if (cat === 'drillLibrary') return;
        const category = cat as AttributeCategory;
        attributeConfig[category].forEach(attr => {
            stats[category][attr.key] = 5;
        });
    });

    return stats;
  };

  const handleAddPlayerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTeamId = newPlayer.teamId || selectedTeamId;
    
    if (newPlayer.name && newPlayer.number && finalTeamId) {
        const defaultStats = generateDefaultStats();
        const p: Player = {
            id: Date.now().toString(),
            teamId: finalTeamId,
            name: newPlayer.name,
            gender: newPlayer.gender || '男',
            idCard: newPlayer.idCard || '',
            birthDate: newPlayer.birthDate || '',
            number: newPlayer.number,
            position: newPlayer.position as Position,
            isCaptain: newPlayer.isCaptain || false,
            age: newPlayer.age || 16,
            height: 175, 
            weight: 70, 
            goals: 0,
            assists: 0,
            appearances: 0,
            image: newPlayer.image || `https://picsum.photos/200/200?random=${Date.now()}`,
            stats: defaultStats,
            statsStatus: 'Published', // Defaults to published for new players
            lastPublishedStats: JSON.parse(JSON.stringify(defaultStats)), 
            reviews: [],
            credits: 0,
            validUntil: new Date().toISOString().split('T')[0],
            leaveQuota: 0,
            leavesUsed: 0,
            rechargeHistory: []
        };
        onAddPlayer(p);
        setShowAddPlayerModal(false);
        setNewPlayer({ name: '', gender: '男', idCard: '', birthDate: '', age: 0, position: Position.MID, number: 0, image: '', teamId: '', isCaptain: false });
    }
  };

  const handleAddTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTeam.name && newTeam.level) {
      const t: Team = {
        id: `t-${Date.now()}`,
        name: newTeam.name!,
        level: newTeam.level!,
        description: newTeam.description || '新组建的梯队'
      };
      onAddTeam(t);
      setSelectedTeamId(t.id);
      setShowAddTeamModal(false);
      setNewTeam({ name: '', level: 'U17', description: '' });
    }
  };

  const openRechargeModal = (e: React.MouseEvent, playerId: string) => {
      e.stopPropagation();
      setRechargePlayerId(playerId);
      setRechargeData({ amount: 50, quota: 3 });
      setShowRechargeModal(true);
  };

  const handleRechargeSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (rechargePlayerId) {
          onRechargePlayer(rechargePlayerId, rechargeData.amount, rechargeData.quota);
          setShowRechargeModal(false);
          setRechargePlayerId(null);
      }
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

  // ------------------------------------------------------------------
  // Import Players Modal (New)
  // ------------------------------------------------------------------
  const ImportPlayersModal = () => {
    const [fileContent, setFileContent] = useState('');
    const [parsedPlayers, setParsedPlayers] = useState<Partial<Player>[]>([]);
    const fileReaderRef = useRef<HTMLInputElement>(null);

    const generateTemplate = () => {
        const header = "姓名,号码,位置(GK/DEF/MID/FWD),性别(男/女),出生日期(YYYY-MM-DD),身份证号";
        const example = "张三,10,FWD,男,2008-01-01,110101200801011234";
        const content = `data:text/csv;charset=utf-8,\uFEFF${header}\n${example}`;
        const encodedUri = encodeURI(content);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "球员导入模版.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                const text = evt.target?.result as string;
                setFileContent(text);
                parseCSV(text);
            };
            reader.readAsText(file);
        }
    };

    const parseCSV = (csvText: string) => {
        const lines = csvText.split(/\r\n|\n/);
        const players: Partial<Player>[] = [];
        
        // Skip header (index 0)
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Handle simple CSV splitting (assuming no commas in fields)
            const parts = line.split(',').map(p => p.trim());
            if (parts.length < 2) continue; // Basic validation

            const [name, numberStr, posStr, gender, birthDate, idCard] = parts;

            // Map Position
            let position = Position.MID;
            const pUpper = posStr?.toUpperCase();
            if (pUpper === 'GK' || pUpper === '门将') position = Position.GK;
            else if (pUpper === 'DEF' || pUpper === '后卫') position = Position.DEF;
            else if (pUpper === 'FWD' || pUpper === '前锋') position = Position.FWD;

            // Calculate Age from Birthdate
            let age = 0;
            if (birthDate) {
                 const birthYear = parseInt(birthDate.substring(0, 4));
                 if (!isNaN(birthYear)) {
                     age = new Date().getFullYear() - birthYear;
                 }
            }

            players.push({
                name,
                number: parseInt(numberStr) || 0,
                position,
                gender: gender === '女' ? '女' : '男',
                birthDate: birthDate || '',
                idCard: idCard || '',
                age: age || 16, // Default fallback
                teamId: selectedTeamId // Import into currently visible/selected team by default
            });
        }
        setParsedPlayers(players);
    };

    const handleConfirmImport = () => {
        const finalPlayers: Player[] = parsedPlayers.map(p => {
            const defaultStats = generateDefaultStats();
            return {
                ...p,
                id: `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                image: `https://picsum.photos/200/200?random=${Math.floor(Math.random() * 1000)}`,
                stats: defaultStats,
                statsStatus: 'Published',
                lastPublishedStats: JSON.parse(JSON.stringify(defaultStats)),
                reviews: [],
                credits: 0,
                validUntil: new Date().toISOString().split('T')[0],
                leaveQuota: 0,
                leavesUsed: 0,
                rechargeHistory: [],
                goals: 0,
                assists: 0,
                appearances: 0,
                teamId: p.teamId || selectedTeamId,
                height: 170,
                weight: 60,
                isCaptain: false,
            } as Player;
        });

        onBulkAddPlayers(finalPlayers);
        setShowImportModal(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                <div className="bg-bvb-black p-4 flex justify-between items-center text-white shrink-0">
                    <h3 className="font-bold flex items-center">
                        <FileSpreadsheet className="w-5 h-5 mr-2 text-bvb-yellow" /> 
                        批量导入球员 (到 {selectedTeam?.name})
                    </h3>
                    <button onClick={() => setShowImportModal(false)}><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 flex-1 overflow-y-auto">
                    <div className="space-y-6">
                        {/* Step 1: Download */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <h4 className="font-bold text-gray-800 mb-2">步骤 1: 获取模版</h4>
                            <p className="text-sm text-gray-500 mb-3">请下载标准 CSV 格式模版，并按照格式填写球员信息。请勿修改表头。</p>
                            <button 
                                onClick={generateTemplate}
                                className="px-4 py-2 bg-white border border-gray-300 hover:border-bvb-yellow text-sm font-bold rounded shadow-sm flex items-center"
                            >
                                <Download className="w-4 h-4 mr-2" /> 下载 CSV 模版
                            </button>
                        </div>

                        {/* Step 2: Upload */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                             <h4 className="font-bold text-gray-800 mb-2">步骤 2: 上传文件</h4>
                             <input 
                                type="file" 
                                accept=".csv"
                                ref={fileReaderRef}
                                onChange={handleFileUpload}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-bvb-yellow file:text-bvb-black hover:file:bg-yellow-400"
                             />
                        </div>

                        {/* Preview */}
                        {parsedPlayers.length > 0 && (
                            <div>
                                <h4 className="font-bold text-gray-800 mb-2 flex justify-between">
                                    <span>数据预览</span>
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">解析成功: {parsedPlayers.length} 人</span>
                                </h4>
                                <div className="max-h-60 overflow-y-auto border rounded-lg">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-gray-100 font-bold sticky top-0">
                                            <tr>
                                                <th className="p-2">姓名</th>
                                                <th className="p-2">号码</th>
                                                <th className="p-2">位置</th>
                                                <th className="p-2">性别</th>
                                                <th className="p-2">身份证</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parsedPlayers.map((p, i) => (
                                                <tr key={i} className="border-b last:border-0">
                                                    <td className="p-2 font-bold">{p.name}</td>
                                                    <td className="p-2">{p.number}</td>
                                                    <td className="p-2">{p.position}</td>
                                                    <td className="p-2">{p.gender}</td>
                                                    <td className="p-2 font-mono">{p.idCard}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                    <button onClick={() => setShowImportModal(false)} className="px-4 py-2 bg-gray-200 text-gray-700 font-bold rounded hover:bg-gray-300">取消</button>
                    <button 
                        onClick={handleConfirmImport}
                        disabled={parsedPlayers.length === 0}
                        className="px-6 py-2 bg-bvb-black text-white font-bold rounded hover:bg-gray-800 disabled:opacity-50"
                    >
                        确认导入
                    </button>
                </div>
            </div>
        </div>
    );
  };

  // ------------------------------------------------------------------
  // Transfer Modal Component
  // ------------------------------------------------------------------
  const TransferModal = ({ onClose }: { onClose: () => void }) => {
      const [targetTeam, setTargetTeam] = useState<string>(teams.filter(t => t.id !== selectedTeamId)[0]?.id || '');
      
      const handleTransfer = () => {
          if (targetTeam) {
              onTransferPlayers(Array.from(selectedIds), targetTeam);
              setSelectedIds(new Set());
              setIsSelectionMode(false);
              onClose();
          }
      };

      const count = selectedIds.size;

      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-bvb-black p-4 flex justify-between items-center text-white">
                    <h3 className="font-bold flex items-center">
                        <ArrowRightLeft className="w-5 h-5 mr-2 text-bvb-yellow" /> 
                        球员转会/移交
                    </h3>
                    <button onClick={onClose}><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6">
                    <p className="mb-4 text-gray-600">
                        将选中的 <strong className="text-bvb-black">{count}</strong> 名球员移交至：
                    </p>
                    <select 
                        className="w-full p-3 border rounded-lg mb-6 bg-gray-50 focus:ring-2 focus:ring-bvb-yellow outline-none"
                        value={targetTeam}
                        onChange={(e) => setTargetTeam(e.target.value)}
                    >
                        {teams.filter(t => t.id !== selectedTeamId).map(t => (
                            <option key={t.id} value={t.id}>{t.name} ({t.level})</option>
                        ))}
                    </select>
                    <div className="flex space-x-3">
                        <button onClick={onClose} className="flex-1 py-2 bg-gray-200 font-bold rounded-lg text-gray-700">取消</button>
                        <button 
                            onClick={handleTransfer}
                            className="flex-1 py-2 bg-bvb-yellow font-bold rounded-lg text-bvb-black hover:brightness-105"
                        >
                            确认移交
                        </button>
                    </div>
                </div>
            </div>
        </div>
      );
  };

  // ------------------------------------------------------------------
  // Recharge Modal Component
  // ------------------------------------------------------------------
  const RechargeModal = () => {
      const player = players.find(p => p.id === rechargePlayerId);
      if (!player) return null;

      return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-bvb-black p-4 flex justify-between items-center text-white">
                    <h3 className="font-bold flex items-center">
                        <CreditCard className="w-5 h-5 mr-2 text-bvb-yellow" /> 
                        课时充值
                    </h3>
                    <button onClick={() => setShowRechargeModal(false)}><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6">
                    <div className="mb-4 flex items-center justify-between bg-gray-50 p-3 rounded">
                        <span className="font-bold text-gray-700">{player.name}</span>
                        <span className="text-xs text-gray-500">当前余额: {player.credits || 0}</span>
                    </div>
                    
                    <form onSubmit={handleRechargeSubmit} className="space-y-4">
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

  // ------------------------------------------------------------------
  // Player Details Component
  // ------------------------------------------------------------------
  
  const PlayerDetailModal = ({ player, onClose }: { player: Player; onClose: () => void }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedPlayer, setEditedPlayer] = useState<Player>(JSON.parse(JSON.stringify(player)));
    const [activeTab, setActiveTab] = useState<'overview' | 'technical' | 'tactical' | 'physical' | 'mental' | 'reviews' | 'records'>('overview');
    const [detailAttendanceScope, setDetailAttendanceScope] = useState<'month' | 'quarter' | 'year'>('month');
    const [recordTimeScope, setRecordTimeScope] = useState<'all' | 'month' | 'quarter' | 'year'>('month');
    const [isExporting, setIsExporting] = useState(false);
    const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

    // Sync state with prop if player updates and we are not editing
    useEffect(() => {
        if (!isEditing) {
            setEditedPlayer(JSON.parse(JSON.stringify(player)));
        }
    }, [player, isEditing]);

    // Set active tab to reviews if filter is pending reviews
    useEffect(() => {
        if (initialFilter === 'pending_reviews') {
            setActiveTab('reviews');
        } else if (initialFilter === 'pending_stats') {
            // Default to technical or overview to show stats controls
            setActiveTab('overview'); 
        }
    }, []);

    // Review Form State
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

    // Calculate averages for Overview Radar (Scale 1-10)
    // NOTE: In the edit modal, we show the EDITED stats (draft) so the user sees what they are changing
    const getAvg = (category: AttributeCategory) => {
      const configItems = attributeConfig[category];
      if (configItems.length === 0) return 0;
      
      let sum = 0;
      let count = 0;
      
      configItems.forEach(attr => {
        const val = editedPlayer.stats[category][attr.key] || 0;
        sum += val;
        count++;
      });
      
      return count === 0 ? 0 : parseFloat((sum / count).toFixed(1));
    };

    const overviewRadarData = [
      { subject: '技术', A: getAvg('technical'), fullMark: 10 },
      { subject: '战术', A: getAvg('tactical'), fullMark: 10 },
      { subject: '身体', A: getAvg('physical'), fullMark: 10 },
      { subject: '心理', A: getAvg('mental'), fullMark: 10 },
    ];

    const attendanceRate = getAttendanceRate(player, detailAttendanceScope);

    const handleSave = () => {
      // Simplified workflow: Coaches can now directly update and publish instantly
      const updatedPlayer = {
          ...editedPlayer,
          // Auto-publish changes
          statsStatus: 'Published' as ApprovalStatus,
          lastPublishedStats: JSON.parse(JSON.stringify(editedPlayer.stats)) // Sync immediately
      };
      onUpdatePlayer(updatedPlayer);
      
      // Show Success Feedback
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
      
      // IMPORTANT: Do NOT call setIsEditing(false) here, as per user request to stay in edit mode
    };

    const handleDelete = () => {
      onDeletePlayer(player.id);
      onClose();
    };

    const handleExportPDF = async () => {
        setIsExporting(true);
        try {
            await exportToPDF('player-profile-export', `${player.name}_档案`);
        } catch (error) {
            alert('导出失败，请重试');
        } finally {
            setIsExporting(false);
        }
    };

    const handleStatChange = (category: keyof PlayerStats, key: string, value: number) => {
      // Modifying stats implies we are working on a draft or update
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
            setNewReview(prev => ({
                ...prev,
                technicalTacticalImprovement: draft.tech,
                mentalDevelopment: draft.mental,
                summary: draft.summary
            }));
        } catch (e) {
            alert('生成失败，请稍后重试');
        } finally {
            setIsGeneratingReview(false);
        }
    };

    const handleEditReview = (review: PlayerReview) => {
        setEditingReviewId(review.id);
        setNewReview({
            year: review.year,
            quarter: review.quarter,
            technicalTacticalImprovement: review.technicalTacticalImprovement,
            mentalDevelopment: review.mentalDevelopment,
            summary: review.summary,
            status: review.status // Preserve existing status
        });
    };

    const handleCancelEdit = () => {
        setEditingReviewId(null);
        setNewReview({ year: new Date().getFullYear(), quarter: 'Q1', technicalTacticalImprovement: '', mentalDevelopment: '', summary: '', status: 'Draft' });
    };

    const handleSaveReview = (status: ApprovalStatus = 'Draft') => {
        if (editingReviewId) {
            // Update existing review
             const updatedReviews = (editedPlayer.reviews || []).map(r => {
                if (r.id === editingReviewId) {
                    return {
                        ...r,
                        year: newReview.year || new Date().getFullYear(),
                        quarter: newReview.quarter || 'Q1',
                        technicalTacticalImprovement: newReview.technicalTacticalImprovement || '',
                        mentalDevelopment: newReview.mentalDevelopment || '',
                        summary: newReview.summary || '',
                        status: status,
                        date: new Date().toISOString().split('T')[0]
                    };
                }
                return r;
            });
            const updatedPlayer = { ...editedPlayer, reviews: updatedReviews };
            setEditedPlayer(updatedPlayer);
            onUpdatePlayer(updatedPlayer); // Persist changes to app state
            
            // Clear edit mode but stay on tab
            setEditingReviewId(null);
        } else {
            // Create new review
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
            // Update local editedPlayer immediately
            const updatedReviews = [...(editedPlayer.reviews || []), review];
            const updatedPlayer = { ...editedPlayer, reviews: updatedReviews };
            setEditedPlayer(updatedPlayer);
            onUpdatePlayer(updatedPlayer);
        }
        
        // Reset form
        setNewReview({ year: new Date().getFullYear(), quarter: 'Q1', technicalTacticalImprovement: '', mentalDevelopment: '', summary: '', status: 'Draft' });
    };
    
    const updateReviewStatus = (reviewId: string, status: ApprovalStatus) => {
        const updatedReviews = editedPlayer.reviews.map(r => r.id === reviewId ? { ...r, status } : r);
        const updatedPlayer = { ...editedPlayer, reviews: updatedReviews };
        setEditedPlayer(updatedPlayer);
        onUpdatePlayer(updatedPlayer);
    };

    const renderStatSliders = (category: AttributeCategory) => {
      const attributes = attributeConfig[category];
      
      if (attributes.length === 0) {
        return <div className="p-8 text-center text-gray-400">该维度暂无评估项目，请在设置中添加。</div>;
      }

      return (
        <div className="grid grid-cols-1 gap-4 p-2">
          {attributes.map(attr => {
            const value = editedPlayer.stats[category][attr.key] ?? 5;
            return (
              <div key={attr.key} className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-gray-700">{attr.label}</label>
                  <span className={`text-sm font-black ${value >= 8 ? 'text-green-600' : value >= 6 ? 'text-yellow-600' : 'text-gray-500'}`}>
                    {value}/10
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  disabled={!isEditing}
                  value={value}
                  onChange={(e) => handleStatChange(category, attr.key, parseInt(e.target.value))}
                  className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${
                     isEditing ? 'bg-gray-200 accent-bvb-yellow hover:bg-gray-300' : 'bg-gray-100 accent-gray-400'
                  }`}
                />
              </div>
            );
          })}
        </div>
      );
    };

    const renderCategoryContent = (category: AttributeCategory) => {
      // Data for specific radar chart
      const radarData = attributeConfig[category].map(attr => ({
        subject: attr.label,
        value: editedPlayer.stats[category][attr.key] || 0,
        fullMark: 10
      }));

      return (
         <div className="animate-in slide-in-from-right-4 duration-300 flex flex-col md:flex-row md:h-full gap-6">
            {/* Chart */}
            <div className="w-full md:w-1/2 h-64 relative bg-gray-50 rounded-xl p-2 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 10 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                        <Radar name={categoryLabels[category]} dataKey="value" stroke="#FDE100" strokeWidth={3} fill="#FDE100" fillOpacity={0.5} />
                    </RadarChart>
                </ResponsiveContainer>
                <div className="absolute top-2 right-2 text-xs font-bold text-gray-400 bg-white px-2 py-1 rounded shadow-sm">
                    {categoryLabels[category]}分析
                </div>
            </div>
            
            {/* Sliders */}
            <div className="w-full md:w-1/2 md:overflow-y-auto md:max-h-full pr-2 custom-scrollbar">
                <div className="mb-4 text-xs text-gray-400 flex items-center justify-between">
                    <span>{isEditing ? '调整数值后需保存更新' : '点击右上角“编辑”按钮以调整数据'}</span>
                </div>
                {renderStatSliders(category)}
            </div>
         </div>
      );
    };

    const renderReviews = () => {
        // Show all reviews including drafts
        const sortedReviews = [...(editedPlayer.reviews || [])].sort((a,b) => b.year - a.year || b.quarter.localeCompare(a.quarter));
        const groupedReviews = sortedReviews.reduce((acc, review) => {
            (acc[review.year] = acc[review.year] || []).push(review);
            return acc;
        }, {} as Record<number, PlayerReview[]>);
        const years = Object.keys(groupedReviews).map(Number).sort((a,b) => b - a);

        return (
            <div className="animate-in slide-in-from-right-4 duration-300 flex flex-col md:flex-row gap-6 pb-24 md:pb-10">
                {/* Left: History Timeline */}
                <div className="w-full md:w-1/2 space-y-6 md:overflow-y-auto md:max-h-[600px] pr-2 custom-scrollbar border-b md:border-b-0 pb-6 md:pb-0 border-gray-100 shrink-0">
                    <h3 className="font-bold text-gray-800 flex items-center sticky top-0 bg-white z-10 py-2">
                        <FileText className="w-5 h-5 mr-2 text-bvb-yellow" /> 历史点评归档
                    </h3>
                    
                    {years.length === 0 && <p className="text-gray-400 text-sm">暂无点评记录。</p>}

                    {years.map(year => (
                        <div key={year} className="relative border-l-2 border-gray-200 pl-6 ml-2 space-y-6">
                            <span className="absolute -left-[21px] top-0 bg-gray-100 text-gray-500 text-xs font-bold px-1.5 py-0.5 rounded border border-gray-300">
                                {year}
                            </span>
                            {groupedReviews[year].map(review => (
                                <div key={review.id} className={`relative group ${review.status === 'Draft' ? 'opacity-80' : ''}`}>
                                    <div className="absolute -left-[31px] top-1 w-3 h-3 bg-bvb-yellow rounded-full border-2 border-white shadow-sm group-hover:scale-125 transition-transform"></div>
                                    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-black text-bvb-black bg-bvb-yellow px-2 py-0.5 rounded">{review.quarter}</span>
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getStatusColor(review.status)}`}>
                                                    {getStatusLabel(review.status)}
                                                </span>
                                            </div>
                                            <span className="text-xs text-gray-400">{review.date}</span>
                                        </div>
                                        
                                        <div className="space-y-3">
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">技战术改善</h4>
                                                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-2 rounded">{review.technicalTacticalImprovement || '（未填写）'}</p>
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">心理建设</h4>
                                                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-2 rounded">{review.mentalDevelopment || '（未填写）'}</p>
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">季度总结</h4>
                                                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-2 rounded italic border-l-2 border-bvb-yellow">{review.summary || '（未填写）'}</p>
                                            </div>
                                            
                                            {/* Action Buttons - Simplified: Everyone can edit/publish */}
                                            <div className="flex justify-end pt-2 gap-2 border-t border-gray-100">
                                                {(review.status === 'Draft' || review.status === 'Submitted' || review.status === 'Published') && (
                                                    <button 
                                                        onClick={() => handleEditReview(review)}
                                                        className="text-xs bg-bvb-yellow text-bvb-black px-3 py-1.5 rounded font-bold hover:brightness-105 flex items-center shadow-sm"
                                                    >
                                                        <Edit2 className="w-3 h-3 mr-1" /> 编辑
                                                    </button>
                                                )}
                                                {review.status !== 'Published' && (
                                                    <button 
                                                        onClick={() => updateReviewStatus(review.id, 'Published')}
                                                        className="text-xs bg-green-50 text-green-600 px-2 py-1.5 rounded font-bold hover:bg-green-100 flex items-center"
                                                    >
                                                        <CheckCircle className="w-3 h-3 mr-1" /> 发布
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                {/* Right: New Review Form */}
                <div className="w-full md:w-1/2 bg-gray-50 p-6 rounded-xl border border-gray-200 flex flex-col shrink-0">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-800">
                            {editingReviewId ? '编辑季度点评' : '新增季度点评'}
                        </h3>
                        <button 
                            type="button"
                            onClick={handleGenerateAiReview}
                            disabled={isGeneratingReview}
                            className="text-xs flex items-center bg-white border border-gray-300 hover:border-bvb-yellow px-3 py-1.5 rounded-full font-bold transition-all"
                        >
                            {isGeneratingReview ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1 text-bvb-yellow" />}
                            AI 辅助生成
                        </button>
                    </div>

                    <form className="space-y-4 flex-1 flex flex-col">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">年份</label>
                                <select 
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none text-sm"
                                    value={newReview.year}
                                    onChange={e => setNewReview({...newReview, year: parseInt(e.target.value)})}
                                >
                                    {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">季度</label>
                                <select 
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none text-sm"
                                    value={newReview.quarter}
                                    onChange={e => setNewReview({...newReview, quarter: e.target.value as any})}
                                >
                                    <option value="Q1">Q1 (第一季度)</option>
                                    <option value="Q2">Q2 (第二季度)</option>
                                    <option value="Q3">Q3 (第三季度)</option>
                                    <option value="Q4">Q4 (第四季度)</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">技战术能力改善</label>
                            <textarea 
                                required
                                rows={3}
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none text-sm"
                                placeholder="描述球员本季度的技术和战术进步..."
                                value={newReview.technicalTacticalImprovement}
                                onChange={e => setNewReview({...newReview, technicalTacticalImprovement: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">心理建设</label>
                            <textarea 
                                required
                                rows={3}
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none text-sm"
                                placeholder="评价球员的心理状态、抗压能力和团队融入..."
                                value={newReview.mentalDevelopment}
                                onChange={e => setNewReview({...newReview, mentalDevelopment: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">季度总结</label>
                            <textarea 
                                required
                                rows={3}
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none text-sm"
                                placeholder="综合评价与下季度目标..."
                                value={newReview.summary}
                                onChange={e => setNewReview({...newReview, summary: e.target.value})}
                            />
                        </div>

                        <div className="mt-auto grid grid-cols-2 gap-3">
                            <button 
                                type="button"
                                onClick={() => handleSaveReview('Draft')}
                                className="py-2 bg-gray-200 text-gray-700 font-bold rounded hover:bg-gray-300 transition-colors"
                            >
                                {editingReviewId ? '仅保存草稿' : '保存草稿'}
                            </button>
                            
                            <button 
                                type="button"
                                onClick={() => handleSaveReview('Published')}
                                className="py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700 transition-colors flex items-center justify-center"
                            >
                                <CheckCircle className="w-3 h-3 mr-1" /> {editingReviewId ? '更新并发布' : '直接发布'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    const renderRecords = () => {
         // Build timeline of events
        type Event = {
            id: string;
            date: string;
            type: 'recharge' | 'training';
            status?: string; // for training
            amount: number; // credit change
            desc: string;
            quotaAdded?: number;
        };
        
        const events: Event[] = [];

        // 1. Recharges
        (editedPlayer.rechargeHistory || []).forEach(r => {
            events.push({
                id: `rech-${r.id}`,
                date: r.date,
                type: 'recharge',
                amount: r.amount,
                desc: `充值 ${r.amount} 课时 (含请假额度 ${r.quotaAdded}次)`,
                quotaAdded: r.quotaAdded
            });
        });

        // 2. Trainings
        trainings.forEach(t => {
            const record = t.attendance?.find(r => r.playerId === editedPlayer.id);
            if (record) {
                let amount = 0;
                let desc = '';
                if (record.status === 'Present') {
                    amount = -1;
                    desc = `参加训练: ${t.title}`;
                } else if (record.status === 'Leave') {
                    amount = 0; // Simulated default
                    desc = `请假: ${t.title}`;
                } else if (record.status === 'Injury') {
                    amount = 0;
                    desc = `伤停: ${t.title}`;
                }

                if (record.status !== 'Absent') {
                    events.push({
                        id: `train-${t.id}`,
                        date: t.date,
                        type: 'training',
                        status: record.status,
                        amount: amount,
                        desc: desc
                    });
                }
            }
        });

        events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let balance = 0;
        let quota = 0; 
        let used = 0;
        
        const historyWithBalance = events.map(e => {
            if (e.type === 'recharge') {
                balance += e.amount;
                quota = e.quotaAdded ?? parseInt(e.desc.match(/额度 (\d+)次/)?.[1] || '0'); 
                used = 0;
            } else if (e.type === 'training') {
                if (e.status === 'Present') {
                    balance -= 1;
                    e.amount = -1; 
                } else if (e.status === 'Leave') {
                    if (used < quota) {
                        used++;
                        e.amount = 0;
                        e.desc += ' (消耗额度)';
                    } else {
                        balance -= 1;
                        e.amount = -1;
                        e.desc += ' (超额扣课时)';
                    }
                }
            }
            return { ...e, balanceAfter: balance };
        });

        const now = new Date();
        const getStartDate = () => {
            const d = new Date();
            if (recordTimeScope === 'month') d.setMonth(now.getMonth() - 1);
            else if (recordTimeScope === 'quarter') d.setMonth(now.getMonth() - 3);
            else if (recordTimeScope === 'year') d.setFullYear(now.getFullYear() - 1);
            else return null; // All
            return d;
        };
        const startDate = getStartDate();
        const allReverse = [...historyWithBalance].reverse();
        const displayList = startDate 
            ? allReverse.filter(e => new Date(e.date) >= startDate) 
            : allReverse;

        const stats = {
            present: displayList.filter(e => e.type === 'training' && e.status === 'Present').length,
            leave: displayList.filter(e => e.type === 'training' && e.status === 'Leave').length,
            injury: displayList.filter(e => e.type === 'training' && e.status === 'Injury').length,
            consumed: displayList.reduce((acc, e) => (e.amount < 0 ? acc + Math.abs(e.amount) : acc), 0)
        };

        const StatCard = ({ label, value, color }: { label: string, value: number, color: string }) => (
            <div className={`p-3 rounded-lg border ${color} flex flex-col items-center justify-center`}>
                <span className="text-xs font-bold uppercase opacity-80 mb-1">{label}</span>
                <span className="text-2xl font-black">{value}</span>
            </div>
        );

        return (
            <div className="animate-in slide-in-from-right-4 duration-300 h-full flex flex-col">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                    <h3 className="font-bold text-gray-800 flex items-center">
                        <History className="w-5 h-5 mr-2 text-bvb-yellow" /> 课时变动记录
                    </h3>
                    
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <select 
                                value={recordTimeScope}
                                onChange={(e) => setRecordTimeScope(e.target.value as any)}
                                className="appearance-none bg-gray-100 pl-8 pr-8 py-1.5 rounded-lg text-xs font-bold text-gray-600 focus:outline-none focus:bg-white focus:ring-1 focus:ring-bvb-yellow cursor-pointer border border-transparent hover:border-gray-200"
                            >
                                <option value="month">近30天</option>
                                <option value="quarter">本季度</option>
                                <option value="year">本年度</option>
                                <option value="all">全部记录</option>
                            </select>
                            <Filter className="w-3 h-3 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                            <ChevronDown className="w-3 h-3 text-gray-500 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                        </div>
                        <div className="text-xs bg-gray-100 px-3 py-1.5 rounded-lg whitespace-nowrap">
                            当前余额: <span className="font-black text-bvb-black">{editedPlayer.credits}</span> 节
                        </div>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 shrink-0">
                    <StatCard label="正常参训" value={stats.present} color="bg-blue-50 border-blue-100 text-blue-700" />
                    <StatCard label="请假次数" value={stats.leave} color="bg-yellow-50 border-yellow-100 text-yellow-700" />
                    <StatCard label="伤停次数" value={stats.injury} color="bg-red-50 border-red-100 text-red-700" />
                    <StatCard label="扣除课时" value={stats.consumed} color="bg-gray-100 border-gray-200 text-gray-700" />
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar border rounded-xl">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-bold sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3">日期</th>
                                <th className="px-4 py-3">类型</th>
                                <th className="px-4 py-3">详情</th>
                                <th className="px-4 py-3 text-right">变动</th>
                                <th className="px-4 py-3 text-right">结余</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {displayList.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 whitespace-nowrap text-gray-600 font-mono text-xs">
                                        {item.date}
                                    </td>
                                    <td className="px-4 py-3">
                                        {item.type === 'recharge' ? (
                                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-bold">充值</span>
                                        ) : (
                                            <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                                                item.status === 'Present' ? 'bg-blue-100 text-blue-700' :
                                                item.status === 'Leave' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                                {item.status === 'Present' ? '参训' : item.status === 'Leave' ? '请假' : '伤停'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">
                                        {item.desc}
                                    </td>
                                    <td className={`px-4 py-3 text-right font-bold ${item.amount > 0 ? 'text-green-600' : item.amount < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                        {item.amount > 0 ? `+${item.amount}` : item.amount}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono font-bold text-gray-800">
                                        {item.balanceAfter}
                                    </td>
                                </tr>
                            ))}
                            {displayList.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-gray-400">此时间段内暂无记录</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-white w-full h-full md:h-[90vh] md:max-w-5xl md:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col">
          
          {/* Header */}
          <div className="bg-bvb-black text-white p-4 flex justify-between items-center shrink-0">
             <div className="flex items-center space-x-3">
                 <button onClick={onClose} className="md:hidden mr-2">
                     <ChevronRight className="w-6 h-6 rotate-180" />
                 </button>
                 <h2 className="text-xl font-bold uppercase tracking-wider flex items-center">
                    <UserIcon className="w-5 h-5 mr-2 text-bvb-yellow" /> 
                    球员档案
                 </h2>
                 {isEditing && (
                     <div className="ml-4 text-xs bg-yellow-600/50 text-white px-2 py-1 rounded-full animate-pulse">
                         编辑模式
                     </div>
                 )}
             </div>
             <div className="flex items-center space-x-3">
                {/* PDF Export Button */}
                <button 
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    className="p-2 bg-gray-800 rounded hover:bg-gray-700 text-bvb-yellow flex items-center" 
                    title="导出PDF档案"
                >
                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                </button>

                {isEditing ? (
                  <>
                    <button onClick={() => setIsEditing(false)} className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm">
                        退出编辑
                    </button>
                    {/* Simplified: Save acts as Publish */}
                    <button onClick={handleSave} className={`px-3 py-1 font-bold rounded hover:brightness-110 text-sm flex items-center ${saveStatus === 'saved' ? 'bg-green-600 text-white' : 'bg-bvb-yellow text-bvb-black'}`}>
                        {saveStatus === 'saved' ? <CheckCircle className="w-4 h-4 mr-1" /> : <Save className="w-4 h-4 mr-1" />} 
                        {saveStatus === 'saved' ? '已保存' : '保存并更新'}
                    </button>
                  </>
                ) : (
                  <>
                     <button onClick={() => setIsEditing(true)} className="p-2 bg-gray-800 rounded hover:bg-gray-700 text-bvb-yellow" title="编辑">
                         <Edit2 className="w-4 h-4" />
                     </button>
                     {/* Restrict Delete for Coaches */}
                     {isDirector && (
                        <button onClick={handleDelete} className="p-2 bg-red-900/50 text-red-400 rounded hover:bg-red-900 hover:text-red-300" title="删除">
                            <Trash2 className="w-4 h-4" />
                        </button>
                     )}
                  </>
                )}
                <button onClick={onClose} className="hidden md:block hover:bg-gray-800 p-1 rounded"><X className="w-6 h-6" /></button>
             </div>
          </div>
          
          {/* Nav Tabs */}
          <div className="bg-gray-100 border-b border-gray-200 shrink-0">
            <div className="flex overflow-x-auto no-scrollbar">
               {[
                 { id: 'overview', label: '概览', icon: Activity },
                 { id: 'technical', label: '技术', icon: Target },
                 { id: 'tactical', label: '战术', icon: Brain },
                 { id: 'physical', label: '身体', icon: Dumbbell },
                 { id: 'mental', label: '心理', icon: CheckSquare },
                 { id: 'reviews', label: '跟踪点评', icon: FileText },
                 { id: 'records', label: '课时记录', icon: History },
               ].map(tab => (
                 <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-shrink-0 flex items-center px-6 py-4 font-bold text-sm transition-colors border-b-2 ${
                        activeTab === tab.id 
                         ? 'border-bvb-yellow text-bvb-black bg-white' 
                         : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                 >
                    <tab.icon className={`w-4 h-4 mr-2 ${activeTab === tab.id ? 'text-bvb-yellow fill-current stroke-bvb-black' : ''}`} />
                    {tab.label}
                 </button>
               ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white">
             {activeTab === 'overview' && (
               <div className="flex flex-col md:flex-row gap-6 h-full animate-in fade-in duration-300">
                  {/* Left Column: Bio */}
                   <div className="w-full md:w-1/3 space-y-6">
                      <div className="flex flex-col items-center">
                          {/* Image logic ... */}
                          <div className="relative">
                            <img src={editedPlayer.image} alt={editedPlayer.name} className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-bvb-yellow shadow-lg" />
                             <div className="absolute bottom-0 right-0 w-10 h-10 bg-bvb-black text-white rounded-full flex items-center justify-center font-black border-2 border-white text-lg overflow-hidden">
                                {isEditing ? (
                                    <input
                                        type="number"
                                        className="bg-transparent text-center w-full h-full text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        value={editedPlayer.number}
                                        onChange={(e) => setEditedPlayer({ ...editedPlayer, number: parseInt(e.target.value) || 0 })}
                                    />
                                ) : (
                                    editedPlayer.number
                                )}
                            </div>
                          </div>
                          
                          <div className="text-center mt-4 w-full">
                            {isEditing ? (
                                <input 
                                    value={editedPlayer.name}
                                    onChange={e => setEditedPlayer({...editedPlayer, name: e.target.value})}
                                    className="text-2xl font-black text-center w-full border-b border-gray-300 focus:border-bvb-yellow outline-none mb-2"
                                />
                            ) : (
                                <h3 className="text-2xl font-black text-gray-900">{editedPlayer.name}</h3>
                            )}
                            
                            <div className="flex justify-center items-center mt-2 space-x-2">
                                <span className={`px-3 py-1 rounded text-xs font-bold uppercase ${getPosColor(editedPlayer.position)}`}>
                                    {editedPlayer.position}
                                </span>
                                {isEditing ? (
                                     <select
                                        value={editedPlayer.teamId}
                                        onChange={e => setEditedPlayer({...editedPlayer, teamId: e.target.value})}
                                        className="text-xs bg-gray-100 p-1 rounded border"
                                        disabled={isCoach}
                                     >
                                         {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                     </select>
                                ) : (
                                    <span className="text-sm font-bold text-gray-500">
                                        {teams.find(t => t.id === editedPlayer.teamId)?.name}
                                    </span>
                                )}
                            </div>
                          </div>
                      </div>

                      {/* Captain Toggle (Editing Mode) */}
                      {isEditing && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center justify-between">
                              <span className="text-sm font-bold text-yellow-800 flex items-center">
                                  <Crown className="w-4 h-4 mr-2" /> 队长身份
                              </span>
                              <label className="relative inline-flex items-center cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={editedPlayer.isCaptain || false}
                                    onChange={(e) => setEditedPlayer({...editedPlayer, isCaptain: e.target.checked})}
                                  />
                                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bvb-yellow"></div>
                              </label>
                          </div>
                      )}

                       {/* Details Grid */}
                      <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-4 text-sm">
                           <div className="col-span-2 flex items-center justify-between border-b pb-2">
                             <span className="text-gray-500 flex items-center"><CreditCard className="w-3 h-3 mr-1"/> 身份证</span>
                             <span className="font-mono font-bold">{editedPlayer.idCard || '未录入'}</span>
                          </div>
                          <div className="flex flex-col">
                              <span className="text-gray-500 text-xs">性别</span>
                              <span className="font-bold">{editedPlayer.gender}</span>
                          </div>
                          <div className="flex flex-col">
                              <span className="text-gray-500 text-xs">年龄</span>
                              <span className="font-bold">{editedPlayer.age} 岁</span>
                          </div>
                      </div>
                   </div>

                  {/* Right Column: Stats & Actions */}
                  <div className="w-full md:w-2/3 flex flex-col space-y-4">
                      {/* Credit Info Card */}
                      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl p-4 shadow-md flex justify-between items-center relative overflow-hidden">
                           <div className="relative z-10">
                              <p className="text-gray-400 text-xs uppercase font-bold mb-1">剩余课时 (Credits)</p>
                              <div className="flex items-baseline space-x-2">
                                  <h2 className={`text-4xl font-black ${editedPlayer.credits <= 5 ? 'text-red-400' : 'text-bvb-yellow'}`}>{editedPlayer.credits}</h2>
                                  <span className="text-sm text-gray-400">节</span>
                              </div>
                              <div className="mt-2 flex items-center text-xs text-gray-400">
                                  <Clock className="w-3 h-3 mr-1" /> 有效期至: {editedPlayer.validUntil || 'N/A'}
                                  {isExpired(editedPlayer.validUntil) && <span className="text-red-400 font-bold ml-2">(已过期)</span>}
                              </div>
                          </div>
                      </div>
                      
                      {/* Radar */}
                      <div className="flex-1 bg-white border border-gray-100 rounded-xl shadow-sm relative min-h-[250px] p-2">
                          <h4 className="absolute top-2 left-2 font-bold text-gray-400 uppercase text-xs">综合能力图谱 (当前编辑预览)</h4>
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={overviewRadarData}>
                              <PolarGrid stroke="#e5e7eb" />
                              <PolarAngleAxis dataKey="subject" tick={{ fill: '#4b5563', fontWeight: 'bold' }} />
                              <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                              <Radar name="能力" dataKey="A" stroke="#000000" strokeWidth={3} fill="#FDE100" fillOpacity={0.6} />
                            </RadarChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
               </div>
             )}

             {activeTab === 'technical' && renderCategoryContent('technical')}
             {activeTab === 'tactical' && renderCategoryContent('tactical')}
             {activeTab === 'physical' && renderCategoryContent('physical')}
             {activeTab === 'mental' && renderCategoryContent('mental')}
             {activeTab === 'reviews' && renderReviews()}
             {activeTab === 'records' && renderRecords()}
          </div>
          
           {/* --- Hidden Export View (Off-screen) --- */}
           {/* Ensure this container is fully rendered without scrollbars */}
           <div id="player-profile-export" className="absolute left-[-9999px] top-0 w-[1000px] bg-white text-black p-12 z-[-1000] font-sans">
                 <div className="flex items-center justify-between border-b-4 border-bvb-yellow pb-6 mb-8">
                    <div className="flex items-center">
                        <div className="w-20 h-20 bg-gray-200 rounded-full overflow-hidden border-4 border-bvb-yellow mr-6">
                             <img src={player.image} className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black uppercase tracking-tighter">{player.name}</h1>
                            <p className="text-xl text-gray-500 font-bold mt-1">
                                {teams.find(t=>t.id===player.teamId)?.name} | {player.position} | #{player.number}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="w-16 h-16 bg-bvb-yellow rounded-full flex items-center justify-center text-bvb-black font-black text-2xl border-4 border-black ml-auto">WS</div>
                        <div className="text-sm font-bold text-gray-400 uppercase mt-2">顽石之光青训</div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                     {/* Basic Stats */}
                     <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                         <h3 className="font-bold text-lg mb-4 border-b pb-2">基础数据</h3>
                         <div className="grid grid-cols-2 gap-4">
                             <div><span className="text-gray-500 text-xs uppercase font-bold">年龄</span> <div className="font-bold text-lg">{player.age}</div></div>
                             <div><span className="text-gray-500 text-xs uppercase font-bold">剩余课时</span> <div className="font-bold text-lg">{player.credits}</div></div>
                             <div><span className="text-gray-500 text-xs uppercase font-bold">出勤率</span> <div className="font-bold text-lg">{attendanceRate}%</div></div>
                             <div><span className="text-gray-500 text-xs uppercase font-bold">进球/助攻</span> <div className="font-bold text-lg">{player.goals} / {player.assists}</div></div>
                         </div>
                     </div>
                     {/* Radar Placeholder for PDF - we can't easily re-render Recharts here without more complex logic, 
                         so we list top attributes instead for print safety */}
                     <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                         <h3 className="font-bold text-lg mb-4 border-b pb-2">能力概览</h3>
                         <div className="space-y-2">
                             <div className="flex justify-between font-bold"><span>技术</span> <span>{getAvg('technical')}</span></div>
                             <div className="flex justify-between font-bold"><span>战术</span> <span>{getAvg('tactical')}</span></div>
                             <div className="flex justify-between font-bold"><span>身体</span> <span>{getAvg('physical')}</span></div>
                             <div className="flex justify-between font-bold"><span>心理</span> <span>{getAvg('mental')}</span></div>
                         </div>
                     </div>
                </div>

                <div className="mb-8">
                    <h3 className="font-bold text-xl mb-4 border-l-4 border-bvb-yellow pl-3">详细能力评分</h3>
                    <div className="grid grid-cols-2 gap-6">
                        {(['technical', 'tactical', 'physical', 'mental'] as AttributeCategory[]).map(cat => (
                            <div key={cat} className="mb-4 break-inside-avoid">
                                <h4 className="font-bold text-gray-600 mb-2 uppercase text-sm border-b pb-1">{categoryLabels[cat]}</h4>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                    {attributeConfig[cat].map(attr => (
                                        <div key={attr.key} className="flex justify-between text-sm">
                                            <span>{attr.label}</span>
                                            <span className="font-bold">{player.stats[cat][attr.key] || 0}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mb-8">
                     <h3 className="font-bold text-xl mb-4 border-l-4 border-bvb-yellow pl-3">历史季度点评</h3>
                     <div className="space-y-6">
                         {player.reviews.filter(r => r.status === 'Published').map(review => (
                             <div key={review.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 break-inside-avoid">
                                 <div className="flex justify-between font-bold mb-2">
                                     <span className="bg-bvb-black text-bvb-yellow px-2 py-0.5 rounded text-sm">{review.year} {review.quarter}</span>
                                     <span className="text-gray-500 text-sm">{review.date}</span>
                                 </div>
                                 <p className="text-sm mb-2"><span className="font-bold">技战术:</span> {review.technicalTacticalImprovement}</p>
                                 <p className="text-sm mb-2"><span className="font-bold">心理:</span> {review.mentalDevelopment}</p>
                                 <p className="text-sm italic border-t pt-2 mt-2">"{review.summary}"</p>
                             </div>
                         ))}
                         {player.reviews.filter(r => r.status === 'Published').length === 0 && <p className="text-gray-400">暂无已发布的点评。</p>}
                     </div>
                </div>
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-100px)] md:h-auto gap-6 relative">
      
      {/* Team Sidebar / Mobile Top Nav */}
      <div className="w-full md:w-64 flex-shrink-0 flex flex-col space-y-4">
        <div className="flex justify-between items-center md:block">
            <h2 className="text-3xl font-black text-bvb-black uppercase hidden md:block mb-4">球队管理</h2>
            {/* Restrict Add Team for Coaches */}
            {isDirector && (
                <button 
                    onClick={() => setShowAddTeamModal(true)}
                    className="text-xs flex items-center text-gray-500 hover:text-bvb-black font-bold border border-gray-300 rounded-full px-3 py-1 md:w-full md:justify-center md:py-2 md:border-2 md:border-dashed md:hover:border-bvb-yellow md:hover:bg-yellow-50"
                >
                    <Plus className="w-3 h-3 mr-1" /> 新建梯队
                </button>
            )}
        </div>

        {/* Mobile Horizontal Scroll */}
        <div className="md:hidden overflow-x-auto pb-2 flex space-x-2 no-scrollbar">
            {availableTeams.map(team => (
                <button
                    key={team.id}
                    onClick={() => setSelectedTeamId(team.id)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                        selectedTeamId === team.id 
                        ? 'bg-bvb-yellow text-bvb-black shadow-md' 
                        : 'bg-white text-gray-500 border border-gray-200'
                    }`}
                >
                    {team.name}
                </button>
            ))}
        </div>

        {/* Desktop Vertical List */}
        <div className="hidden md:flex flex-col space-y-2">
            {availableTeams.map(team => (
                <button
                    key={team.id}
                    onClick={() => setSelectedTeamId(team.id)}
                    className={`w-full text-left p-4 rounded-xl transition-all border-l-4 ${
                        selectedTeamId === team.id 
                        ? 'bg-white border-bvb-yellow shadow-md transform translate-x-2' 
                        : 'bg-gray-50 border-transparent text-gray-500 hover:bg-white hover:shadow-sm'
                    }`}
                >
                    <h3 className={`font-bold ${selectedTeamId === team.id ? 'text-bvb-black' : ''}`}>{team.name}</h3>
                    <p className="text-xs text-gray-400 mt-1">{team.description}</p>
                </button>
            ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        
        {/* Toolbar */}
        <div className="bg-white p-4 rounded-xl shadow-sm mb-4 flex flex-col sm:flex-row justify-between items-center gap-4">
           
           {/* Left: Search */}
           <div className="flex w-full sm:w-auto items-center bg-gray-100 px-3 py-2 rounded-lg">
               <Search className="w-5 h-5 text-gray-400 mr-2" />
               <input 
                 placeholder="搜索球员..." 
                 className="bg-transparent border-none focus:outline-none text-sm w-full"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
           </div>
            
           {/* Center: Filters */}
           <div className="flex w-full sm:w-auto items-center gap-2 overflow-x-auto no-scrollbar">
               {/* Position Filter */}
              <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                {['全部', '前锋', '中场', '后卫', '门将'].map(pos => (
                    <button
                        key={pos}
                        onClick={() => setFilterPos(pos)}
                        className={`px-3 py-1 rounded text-xs font-bold whitespace-nowrap transition-colors ${
                            filterPos === pos ? 'bg-white text-bvb-black shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {pos}
                    </button>
                ))}
              </div>
              
              {/* Toggle Draft Filter */}
              <button
                 onClick={() => setShowDraftsOnly(!showDraftsOnly)}
                 className={`px-3 py-1 rounded text-xs font-bold whitespace-nowrap transition-colors border flex items-center gap-1 ${
                     showDraftsOnly ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'
                 }`}
              >
                  <ClipboardCheck className="w-3 h-3" />
                  草稿箱 / 未发布
              </button>
           </div>

           {/* Right: Actions */}
           <div className="flex gap-2 w-full sm:w-auto">
               <button 
                 onClick={() => setIsSelectionMode(!isSelectionMode)}
                 className={`p-2 rounded-lg border ${isSelectionMode ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-300 text-gray-500 hover:bg-gray-50'}`}
                 title="批量管理"
               >
                   <CheckSquare className="w-5 h-5" />
               </button>
               
               {/* Bulk Import (Director Only) */}
               {isDirector && (
                    <button 
                        onClick={() => setShowImportModal(true)}
                        className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-bvb-black"
                        title="批量导入球员"
                    >
                        <FileSpreadsheet className="w-5 h-5" />
                    </button>
               )}

               {/* Restrict Add Player for Coaches */}
               {isDirector && (
                   <button 
                    onClick={() => setShowAddPlayerModal(true)}
                    className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-bvb-yellow text-bvb-black font-bold rounded-lg hover:brightness-105 shadow-sm"
                   >
                       <Plus className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">录入</span>球员
                   </button>
               )}
           </div>
        </div>

        {/* Filter Indicator Banner */}
        {showDraftsOnly && (
             <div className="bg-blue-50 border border-blue-100 text-blue-700 px-4 py-2 rounded-lg mb-4 text-sm flex items-center justify-between">
                 <div className="flex items-center font-bold">
                     <ClipboardCheck className="w-4 h-4 mr-2" />
                     {isDirector ? '存在未发布的草稿' : '本队未发布的草稿'} ({filteredPlayers.length})
                 </div>
                 <button onClick={() => setShowDraftsOnly(false)} className="text-xs hover:underline">
                     清除筛选
                 </button>
             </div>
        )}

        {/* Bulk Action Bar */}
        {isSelectionMode && (
            <div className="bg-bvb-black text-white p-3 rounded-lg mb-4 flex justify-between items-center animate-in slide-in-from-top-2">
                <div className="flex items-center space-x-3">
                    <button onClick={handleSelectAll} className="text-xs font-bold text-gray-400 hover:text-white">全选</button>
                    <span className="text-sm font-bold">已选: {selectedIds.size}</span>
                </div>
                <div className="flex space-x-2">
                    {/* Transfer allowed for coaches too */}
                    <button 
                        disabled={selectedIds.size === 0}
                        onClick={() => setShowTransferModal(true)}
                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs font-bold disabled:opacity-50 flex items-center"
                    >
                        <ArrowRightLeft className="w-3 h-3 mr-1" /> 移交
                    </button>
                    {/* Delete restricted */}
                    {isDirector && (
                        <button 
                            disabled={selectedIds.size === 0}
                            onClick={executeBulkDelete}
                            className="px-3 py-1 bg-red-900 hover:bg-red-800 rounded text-xs font-bold disabled:opacity-50 flex items-center"
                        >
                            <Trash2 className="w-3 h-3 mr-1" /> 删除
                        </button>
                    )}
                    <button onClick={() => setIsSelectionMode(false)} className="px-2 hover:bg-gray-800 rounded">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        )}

        {/* Player List Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pb-20 custom-scrollbar">
            {filteredPlayers.length > 0 ? filteredPlayers.map(player => {
                const birthdayStatus = getBirthdayStatus(player.birthDate);
                const isSelected = selectedIds.has(player.id);
                const overallRating = getOverallRating(player);
                const attendanceRate = getAttendanceRate(player, attendanceScope);
                const isExpiredValid = isExpired(player.validUntil);
                
                // Draft indicators
                const hasDraftReviews = player.reviews?.some(r => r.status === 'Draft' || r.status === 'Submitted');
                const hasDraftStats = player.statsStatus === 'Draft' || player.statsStatus === 'Submitted';
                const teamName = teams.find(t => t.id === player.teamId)?.name;

                return (
                  <div 
                    key={player.id}
                    onClick={() => {
                        if (isSelectionMode) toggleSelection(player.id);
                        else setSelectedPlayer(player);
                    }}
                    className={`bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all cursor-pointer border relative group flex flex-col ${
                        isSelected ? 'border-bvb-yellow ring-2 ring-bvb-yellow/50' : 'border-gray-200 hover:border-bvb-yellow'
                    }`}
                  >
                      {/* ... (Existing Card Logic) ... */}
                      {/* Selection Overlay */}
                      {isSelectionMode && (
                          <div className={`absolute top-2 left-2 w-6 h-6 rounded border-2 z-30 flex items-center justify-center transition-colors ${
                              isSelected ? 'bg-bvb-yellow border-bvb-yellow' : 'bg-white border-gray-300'
                          }`}>
                              {isSelected && <CheckSquare className="w-4 h-4 text-bvb-black" />}
                          </div>
                      )}
                      
                      {/* Draft Badge */}
                      {(hasDraftReviews || hasDraftStats) && (
                          <div className="absolute top-2 right-2 z-20 flex flex-col gap-1 items-end">
                              {hasDraftReviews && <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm border border-gray-200">点评草稿</span>}
                              {hasDraftStats && <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm border border-gray-200">数据草稿</span>}
                          </div>
                      )}

                      <div className="flex p-4 gap-4">
                          <div className="relative flex-shrink-0">
                              <div className="w-20 h-24 rounded-lg overflow-hidden bg-gray-100 shadow-inner relative">
                                  <img src={player.image} alt={player.name} className="w-full h-full object-cover object-top" />
                              </div>
                              {player.isCaptain && !isSelectionMode && (
                                 <div className="absolute -top-1.5 -left-1.5 w-6 h-6 bg-yellow-400 text-bvb-black flex items-center justify-center rounded-sm font-black text-xs border border-white shadow-sm z-10 rotate-[-10deg]">C</div>
                              )}
                              <div className={`absolute -bottom-2 right-0 left-0 mx-auto w-max px-2 py-0.5 text-[10px] font-bold text-white text-center rounded-full border border-white shadow-sm ${getPosColor(player.position)}`}>
                                  {player.position}
                              </div>
                          </div>

                          <div className="flex-1 flex flex-col justify-between py-0.5">
                              <div className="flex justify-between items-start">
                                  <div className="pr-2">
                                      <h3 className="font-bold text-gray-900 text-lg leading-tight line-clamp-1">{player.name}</h3>
                                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-gray-500">
                                          <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold border border-blue-100 truncate max-w-[80px]">{teamName}</span>
                                          <span className="bg-gray-100 px-1.5 py-0.5 rounded font-medium text-gray-600 border border-gray-200">{player.gender}</span>
                                          <span className="font-mono">{player.age}岁</span>
                                      </div>
                                  </div>
                                  <div className="text-3xl font-black text-gray-100 group-hover:text-bvb-yellow/20 transition-colors select-none">
                                      {player.number}
                                  </div>
                              </div>
                              <div className="flex items-end justify-between mt-2">
                                  <div className="flex items-center gap-2">
                                     <div className={`text-sm font-black px-2 py-0.5 rounded flex items-center ${
                                         parseFloat(overallRating) >= 8 ? 'bg-green-100 text-green-700' :
                                         parseFloat(overallRating) >= 6 ? 'bg-yellow-100 text-yellow-700' :
                                         'bg-gray-100 text-gray-600'
                                     }`}>
                                         {overallRating} <span className="text-[9px] opacity-70 ml-1 font-bold">OVR</span>
                                     </div>
                                  </div>
                                  {birthdayStatus && (
                                    <div className={`flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white ${birthdayStatus.color}`}>
                                        <Cake className="w-3 h-3 mr-1" />
                                        {birthdayStatus.label}
                                    </div>
                                  )}
                              </div>
                          </div>
                      </div>

                      <div className="px-3 pb-2 flex justify-between items-center text-xs border-t border-gray-100 pt-2">
                          <div className="flex items-center text-gray-600 font-bold">
                              <CreditCard className="w-3 h-3 mr-1 text-bvb-yellow" />
                              <span className={player.credits <= 5 ? 'text-red-500' : ''}>{player.credits} 节</span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {isExpiredValid && (
                                <span className="text-[10px] text-red-500 font-bold flex items-center bg-red-50 px-1 rounded">
                                    <AlertTriangle className="w-3 h-3 mr-1" /> 已过期
                                </span>
                            )}
                            <button 
                                onClick={(e) => openRechargeModal(e, player.id)}
                                disabled={isCoach} // Disable recharge quick button for coach if desired
                                className={`text-[10px] px-2 py-1 rounded font-bold transition-colors ${
                                    isCoach ? 'text-gray-300 bg-gray-50 cursor-not-allowed' : 'bg-gray-100 hover:bg-bvb-yellow hover:text-bvb-black text-gray-500'
                                }`}
                            >
                                充值
                            </button>
                          </div>
                      </div>
                      <div className="bg-gray-50 px-3 py-2 border-t border-gray-100">
                           <div className="flex justify-between items-center mb-1">
                               <span className="text-[10px] font-bold text-gray-400 uppercase">
                                   出勤率 ({attendanceScope === 'month' ? '月' : attendanceScope === 'quarter' ? '季' : '年'})
                               </span>
                               <span className={`text-[10px] font-bold ${attendanceRate >= 90 ? 'text-green-600' : 'text-gray-500'}`}>{attendanceRate}%</span>
                           </div>
                           <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                               <div 
                                  className={`h-full rounded-full ${attendanceRate >= 90 ? 'bg-green-500' : attendanceRate >= 75 ? 'bg-yellow-500' : 'bg-red-400'}`} 
                                  style={{ width: `${attendanceRate}%` }}
                               ></div>
                           </div>
                      </div>
                  </div>
                );
            }) : (
                <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-400">
                    <UserIcon className="w-12 h-12 mb-2 opacity-20" />
                    <p>{showDraftsOnly ? '暂无未发布的草稿' : '暂无符合条件的球员'}</p>
                    {isCoach && !showDraftsOnly && <p className="text-xs mt-1">您只能查看您所管理球队的球员</p>}
                </div>
            )}
        </div>
      </div>

      {/* -------------------- Modals -------------------- */}

      {/* Add Team Modal */}
      {showAddTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-bvb-black p-4 flex justify-between items-center text-white">
              <h3 className="font-bold">创建新梯队</h3>
              <button onClick={() => setShowAddTeamModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddTeamSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">球队名称</label>
                <input 
                  required
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none"
                  value={newTeam.name}
                  onChange={e => setNewTeam({...newTeam, name: e.target.value})}
                  placeholder="例如: 多特蒙德 U15"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">级别</label>
                <select 
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none"
                  value={newTeam.level}
                  onChange={e => setNewTeam({...newTeam, level: e.target.value})}
                >
                  <option value="U19">U19</option>
                  <option value="U17">U17</option>
                  <option value="U15">U15</option>
                  <option value="First Team">一线队</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">描述</label>
                <textarea 
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-bvb-yellow outline-none"
                  rows={3}
                  value={newTeam.description}
                  onChange={e => setNewTeam({...newTeam, description: e.target.value})}
                  placeholder="球队的主要目标或简介..."
                />
              </div>
              <button type="submit" className="w-full py-3 bg-bvb-yellow font-bold rounded-lg text-bvb-black hover:brightness-105">
                创建球队
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Player Modal */}
      {showAddPlayerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
             <div className="bg-bvb-black p-4 flex justify-between items-center text-white shrink-0">
                <h3 className="font-bold flex items-center">
                    <UserIcon className="w-5 h-5 mr-2 text-bvb-yellow" /> 
                    录入新球员
                </h3>
                <button onClick={() => setShowAddPlayerModal(false)}><X className="w-5 h-5" /></button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6">
                <form onSubmit={handleAddPlayerSubmit} className="space-y-6">
                   <div className="flex flex-col md:flex-row gap-6">
                       {/* Left: Image Upload */}
                       <div className="flex flex-col items-center space-y-3">
                           <div 
                              onClick={() => fileInputRef.current?.click()}
                              className="w-32 h-40 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-bvb-yellow hover:bg-yellow-50 transition-colors overflow-hidden"
                           >
                               {newPlayer.image ? (
                                   <img src={newPlayer.image} alt="Preview" className="w-full h-full object-cover" />
                               ) : (
                                   <>
                                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                      <span className="text-xs text-gray-400 font-bold">上传照片</span>
                                   </>
                               )}
                           </div>
                           <input 
                              type="file" 
                              ref={fileInputRef} 
                              className="hidden" 
                              accept="image/*"
                              onChange={handleFileChange} 
                           />
                       </div>

                       {/* Right: Basic Info */}
                       <div className="flex-1 space-y-4">
                           <div className="grid grid-cols-2 gap-4">
                               <div>
                                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">姓名</label>
                                   <input 
                                     required
                                     className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none"
                                     value={newPlayer.name}
                                     onChange={e => setNewPlayer({...newPlayer, name: e.target.value})}
                                   />
                               </div>
                               <div>
                                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">球衣号码</label>
                                   <input 
                                     required
                                     type="number"
                                     className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none"
                                     value={newPlayer.number || ''}
                                     onChange={e => setNewPlayer({...newPlayer, number: parseInt(e.target.value)})}
                                   />
                               </div>
                           </div>

                           <div className="grid grid-cols-2 gap-4">
                               <div>
                                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">场上位置</label>
                                   <select 
                                     className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none"
                                     value={newPlayer.position}
                                     onChange={e => setNewPlayer({...newPlayer, position: e.target.value as Position})}
                                   >
                                     <option value={Position.GK}>门将 (GK)</option>
                                     <option value={Position.DEF}>后卫 (DEF)</option>
                                     <option value={Position.MID}>中场 (MID)</option>
                                     <option value={Position.FWD}>前锋 (FWD)</option>
                                   </select>
                               </div>
                               <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">归属梯队</label>
                                    <select 
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none"
                                        value={newPlayer.teamId}
                                        onChange={e => setNewPlayer({...newPlayer, teamId: e.target.value})}
                                        disabled={isCoach} // Coach is locked to their team (pre-filled)
                                    >
                                        <option value="">请选择梯队...</option>
                                        {availableTeams.map(t => (
                                            <option key={t.id} value={t.id}>{t.name} ({t.level})</option>
                                        ))}
                                    </select>
                               </div>
                           </div>

                           <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">身份证号 (自动解析生日/性别)</label>
                                <input 
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-bvb-yellow outline-none font-mono"
                                    placeholder="18位身份证号码"
                                    maxLength={18}
                                    value={newPlayer.idCard}
                                    onChange={handleIdCardChange}
                                />
                           </div>

                           <div className="grid grid-cols-3 gap-4 bg-gray-50 p-3 rounded text-sm text-gray-600">
                               <div>
                                   <span className="block text-[10px] text-gray-400 uppercase">性别</span>
                                   <span className="font-bold">{newPlayer.gender || '-'}</span>
                               </div>
                               <div>
                                   <span className="block text-[10px] text-gray-400 uppercase">出生日期</span>
                                   <span className="font-bold">{newPlayer.birthDate || '-'}</span>
                               </div>
                               <div>
                                   <span className="block text-[10px] text-gray-400 uppercase">当前年龄</span>
                                   <span className="font-bold">{newPlayer.age || '-'} 岁</span>
                               </div>
                           </div>
                       </div>
                   </div>

                   <button type="submit" className="w-full py-3 bg-bvb-yellow font-bold rounded-lg text-bvb-black hover:brightness-105 shadow-md">
                        确认录入
                   </button>
                </form>
             </div>
          </div>
        </div>
      )}
      
      {/* Import Modal */}
      {showImportModal && <ImportPlayersModal />}

      {/* Recharge Modal */}
      {showRechargeModal && <RechargeModal />}

      {/* Transfer Modal */}
      {showTransferModal && <TransferModal onClose={() => setShowTransferModal(false)} />}
      
      {/* Detail Modal */}
      {selectedPlayer && (
        <PlayerDetailModal 
            player={selectedPlayer} 
            onClose={() => setSelectedPlayer(null)} 
        />
      )}

    </div>
  );
};

export default PlayerManager;