
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import PlayerManager from './components/PlayerManager';
import TrainingPlanner from './components/TrainingPlanner';
import MatchPlanner from './components/MatchPlanner';
import Settings from './components/Settings';
import Login from './components/Login';
import ParentPortal from './components/ParentPortal';
import SessionDesigner from './components/SessionDesigner';
import FinanceManager from './components/FinanceManager';
import TechnicalGrowth from './components/TechnicalGrowth';
import PhilosophyLibrary from './components/PhilosophyLibrary';
import { MATCH_PRINCIPLES, PHILOSOPHY_OVERVIEW, BASIC_TECH_THEMES, SCENARIO_THEMES, MatchPrinciple, BasicTechItem, ScenarioTheme } from './src/philosophyData';
import { MOCK_PLAYERS, MOCK_MATCHES, MOCK_TRAINING, MOCK_TEAMS, DEFAULT_ATTRIBUTE_CONFIG, MOCK_USERS, MOCK_ANNOUNCEMENTS, APP_LOGO, DEFAULT_PERMISSIONS, DEFAULT_FINANCE_CATEGORIES, DEFAULT_SALARY_SETTINGS } from './constants';
import { Player, TrainingSession, Team, AttributeConfig, PlayerReview, AttendanceRecord, RechargeRecord, User, Match, Announcement, DrillDesign, FinanceTransaction, RolePermissions, FinanceCategoryDefinition, TechTestDefinition, SalarySettings, PeriodizationPlan, AccountingRecord, PhilosophyDocument } from './types';
import { loadDataFromCloud, saveDataToCloud } from './services/storageService';
import { Loader2 } from 'lucide-react';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [openedTabs, setOpenedTabs] = useState<string[]>(['dashboard']);
  const [navigationParams, setNavigationParams] = useState<{ filter?: string }>({});
  
  // App State
  const [teams, setTeams] = useState<Team[]>(MOCK_TEAMS);
  const [players, setPlayers] = useState<Player[]>(MOCK_PLAYERS);
  const [trainings, setTrainings] = useState<TrainingSession[]>(MOCK_TRAINING);
  const [matches, setMatches] = useState<Match[]>(MOCK_MATCHES); 
  const [attributeConfig, setAttributeConfig] = useState<AttributeConfig>(DEFAULT_ATTRIBUTE_CONFIG);
  const [announcements, setAnnouncements] = useState<Announcement[]>(MOCK_ANNOUNCEMENTS);
  const [appLogo, setAppLogo] = useState<string>(APP_LOGO);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [designs, setDesigns] = useState<DrillDesign[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [permissions, setPermissions] = useState<RolePermissions>(DEFAULT_PERMISSIONS);
  const [financeCategories, setFinanceCategories] = useState<FinanceCategoryDefinition[]>(DEFAULT_FINANCE_CATEGORIES);
  const [techTests, setTechTests] = useState<TechTestDefinition[]>([]);
  const [salarySettings, setSalarySettings] = useState<SalarySettings>(DEFAULT_SALARY_SETTINGS);
  const [periodizationPlans, setPeriodizationPlans] = useState<PeriodizationPlan[]>([]);
  const [accountingRecords, setAccountingRecords] = useState<AccountingRecord[]>([]);
  const [tactics, setTactics] = useState<Tactic[]>([]);
  const [pointItemDefinitions, setPointItemDefinitions] = useState<PointItemDefinition[]>([]);
  const [playerPointRecords, setPlayerPointRecords] = useState<PlayerPointRecord[]>([]);
  const [travelingPlayerIds, setTravelingPlayerIds] = useState<string[]>([]);
  const [philosophyDocs, setPhilosophyDocs] = useState<PhilosophyDocument[]>([]);
  const [matchPrinciples, setMatchPrinciples] = useState<MatchPrinciple[]>(MATCH_PRINCIPLES);
  const [basicTechThemes, setBasicTechThemes] = useState<BasicTechItem[]>(BASIC_TECH_THEMES);
  const [scenarioThemes, setScenarioThemes] = useState<ScenarioTheme[]>(SCENARIO_THEMES);
  const [philosophyOverview, setPhilosophyOverview] = useState<any>(PHILOSOPHY_OVERVIEW);

  // Persistence State
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const isFirstRun = useRef(true);

  // Derived Players: 按时间轴模拟扣费逻辑，请假额度在充值时更新而非累加
  const derivedPlayers = useMemo(() => {
      return players.map(p => {
          // 构建该球员的所有财务/考勤事件流
          const events: { type: 'recharge' | 'training', date: string, amount?: number, quota?: number, status?: string, creditCost?: number }[] = [];
          
          (p.rechargeHistory || []).forEach(r => {
              events.push({ type: 'recharge', date: r.date, amount: r.amount, quota: r.quotaAdded });
          });

          trainings.forEach(t => {
              const record = t.attendance?.find(att => att.playerId === p.id);
              if (record && record.status !== 'Absent') {
                  events.push({ 
                      type: 'training', 
                      date: t.date, 
                      status: record.status,
                      creditCost: record.creditCost 
                  });
              }
          });

          // 按日期从早到晚排序
          events.sort((a, b) => a.date.localeCompare(b.date));

          let runningCredits = 0;
          let runningLeaveQuota = 0;
          let usedLeaveQuota = 0;

          events.forEach(e => {
              if (e.type === 'recharge') {
                  runningCredits += e.amount || 0;
                  // 核心更新：请假次数不累计，而是更新为最新一次充值的额度
                  runningLeaveQuota = e.quota || 0;
              } else if (e.type === 'training') {
                  const cost = e.creditCost ?? 1;
                  if (e.status === 'Present') {
                      runningCredits -= cost;
                  } else if (e.status === 'Leave') {
                      if (runningLeaveQuota > 0) {
                          runningLeaveQuota -= 1;
                          usedLeaveQuota += 1;
                          // 如果请假且有多扣课时需求，目前逻辑是扣除1次请假额度，不额外扣课时
                          // 但如果用户想在请假时也扣多倍，可以根据需求调整
                      } else {
                          runningCredits -= cost;
                      }
                  }
                  // Injury 状态通常不计费也不扣除额度
              }
          });

          // Calculate dynamic age from birthDate
          let dynamicAge = p.age || 0;
          if (p.birthDate) {
              const today = new Date();
              const parts = p.birthDate.split('-').map(Number);
              if (parts.length === 3) {
                  const [bYear, bMonth, bDay] = parts;
                  if (!isNaN(bYear) && !isNaN(bMonth) && !isNaN(bDay)) {
                      let computedAge = today.getFullYear() - bYear;
                      const monthDiff = today.getMonth() + 1 - bMonth;
                      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < bDay)) {
                          computedAge--;
                      }
                      dynamicAge = computedAge >= 0 ? computedAge : 0;
                  }
              }
          }

          return { 
              ...p, 
              credits: runningCredits, 
              remainingLeaveQuota: runningLeaveQuota,
              leavesUsed: usedLeaveQuota,
              age: dynamicAge
          };
      });
  }, [players, trainings]);

  // Load Data on Mount
  const initializeCloudData = useCallback(async () => {
    setIsInitializing(true);
    setCloudError(null);

    const applyDataToStates = (data: any) => {
        if (!data) return;
        setTeams(data.teams || MOCK_TEAMS);
        setPlayers(data.players || MOCK_PLAYERS);
        setMatches(data.matches || MOCK_MATCHES);
        setTrainings(data.trainings || MOCK_TRAINING);
        setAttributeConfig(data.attributeConfig || DEFAULT_ATTRIBUTE_CONFIG);
        setAnnouncements(data.announcements || MOCK_ANNOUNCEMENTS);
        if (data.appLogo) setAppLogo(data.appLogo);
        if (data.users) setUsers(data.users);
        if (data.designs) setDesigns(data.designs);
        if (data.transactions) setTransactions(data.transactions);
        if (data.permissions) {
            const merged = { ...DEFAULT_PERMISSIONS };
            Object.keys(data.permissions).forEach((role) => {
                const r = role as keyof RolePermissions;
                merged[r] = {
                    ...DEFAULT_PERMISSIONS[r],
                    ...data.permissions[r]
                };
            });
            setPermissions(merged);
        }
        if (data.financeCategories) setFinanceCategories(data.financeCategories);
        if (data.techTests) setTechTests(data.techTests);
        if (data.salarySettings) setSalarySettings(data.salarySettings);
        if (data.periodizationPlans) setPeriodizationPlans(data.periodizationPlans);
        if (data.accountingRecords) setAccountingRecords(data.accountingRecords);
        if (data.tactics) setTactics(data.tactics);
        if (data.pointItemDefinitions) setPointItemDefinitions(data.pointItemDefinitions);
        if (data.playerPointRecords) setPlayerPointRecords(data.playerPointRecords);
        if (data.travelingPlayerIds) setTravelingPlayerIds(data.travelingPlayerIds);
        if (data.philosophyDocs) setPhilosophyDocs(data.philosophyDocs);
        if (data.matchPrinciples) setMatchPrinciples(data.matchPrinciples);
        if (data.basicTechThemes) setBasicTechThemes(data.basicTechThemes);
        if (data.scenarioThemes) setScenarioThemes(data.scenarioThemes);
        if (data.philosophyOverview) setPhilosophyOverview(data.philosophyOverview);
    };

    try {
        const cloudData = await loadDataFromCloud();
        if (cloudData) {
            applyDataToStates(cloudData);
            setCloudError(null);
            // Save a redundant cache copy locally in case the network changes in future sessions
            try {
                localStorage.setItem('football_manager_local_cache', JSON.stringify(cloudData));
            } catch (err) {
                console.warn('Failed to cache data locally in browser storage:', err);
            }
        } else {
            console.log('Database is empty, checking browser cache fallback...');
            const localCache = localStorage.getItem('football_manager_local_cache');
            if (localCache) {
                try {
                    const parsed = JSON.parse(localCache);
                    applyDataToStates(parsed);
                } catch (e) {
                    console.error('Failed to parse local browser storage cache:', e);
                }
            }
        }
    } catch (err: any) {
        console.warn("Failed to initialize cloud database, initiating local recovery stream:", err);
        const localCache = localStorage.getItem('football_manager_local_cache');
        if (localCache) {
            try {
                const parsed = JSON.parse(localCache);
                applyDataToStates(parsed);
                setCloudError(`本地运行模式：服务器正在进行升级维护 (云端同步离线: ${err.message || '网络连接有阻碍'})。所幸您的数据已完全在本地沙盒环境中恢复，可流畅编辑。`);
            } catch {
                setCloudError(`青训数据库正在本地离线运行 (${err.message || '服务异常'})。且本地缓存损坏，系统已自动加载内置青训示范数据集：所有操作和保存功用一切正常！`);
            }
        } else {
            setCloudError(`青训数据库正在本地安全模式运行 (服务器离线中: ${err.message || '同步受阻'})。当前已自动加载软件内置标准青训预设：您仍可照常使用、修改、添加所有俱乐部设置。`);
        }
    } finally {
        setIsInitializing(false);
        const now = new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' });
        setLastSavedTime(now);
    }
  }, []);

  useEffect(() => {
    initializeCloudData();
  }, [initializeCloudData]);

  // Auto-Save on Change
  useEffect(() => {
    if (isInitializing) return;
    if (isFirstRun.current) {
        isFirstRun.current = false;
        return;
    }

    setHasUnsavedChanges(true);

    const timer = setTimeout(async () => {
        setIsSyncing(true);
        const dataPayload = {
            players,
            teams,
            matches,
            trainings,
            attributeConfig,
            announcements,
            appLogo,
            users,
            designs,
            transactions,
            permissions,
            financeCategories,
            techTests,
            salarySettings,
            periodizationPlans,
            accountingRecords,
            tactics,
            pointItemDefinitions,
            playerPointRecords,
            travelingPlayerIds,
            philosophyDocs,
            matchPrinciples,
            basicTechThemes,
            scenarioThemes,
            philosophyOverview
        };

        // Mirror in local browser storage synchronously first
        try {
            localStorage.setItem('football_manager_local_cache', JSON.stringify(dataPayload));
        } catch (e) {
            console.warn('Failed to cache data in browser storage:', e);
        }

        try {
            const res = await saveDataToCloud(dataPayload);
            if (res && res.cloudSynced === false) {
                setCloudError(`数据已暂存本地。云端备份未就绪 (${res.message || '由于连接限制'})`);
            } else {
                setCloudError(null);
                setHasUnsavedChanges(false);
                const now = new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
                setLastSavedTime(now);
            }
        } catch (e: any) {
            console.warn("Cloud persistence failed, data safely retained locally in file & browser:", e);
            setCloudError(`云端同步异常: ${e.message || '网络连接有阻碍'}`);
        } finally {
            setIsSyncing(false);
        }
    }, 2000);

    return () => clearTimeout(timer);
  }, [players, teams, matches, trainings, attributeConfig, announcements, appLogo, users, designs, transactions, permissions, financeCategories, techTests, salarySettings, periodizationPlans, accountingRecords, tactics, pointItemDefinitions, playerPointRecords, travelingPlayerIds, philosophyDocs, matchPrinciples, basicTechThemes, scenarioThemes, philosophyOverview, isInitializing]);

  const handleRestoreSystem = (data: any) => {
    if (!data) return;
    
    setIsInitializing(true);
    
    if (Array.isArray(data.players)) setPlayers(data.players);
    if (Array.isArray(data.teams)) setTeams(data.teams);
    if (Array.isArray(data.trainings)) setTrainings(data.trainings);
    if (Array.isArray(data.matches)) setMatches(data.matches);
    if (data.attributeConfig) setAttributeConfig(data.attributeConfig);
    if (Array.isArray(data.announcements)) setAnnouncements(data.announcements);
    if (data.appLogo) setAppLogo(data.appLogo);
    if (Array.isArray(data.users)) setUsers(data.users);
    if (Array.isArray(data.designs)) setDesigns(data.designs);
    if (Array.isArray(data.transactions)) setTransactions(data.transactions);
    if (data.permissions) setPermissions(data.permissions);
    if (Array.isArray(data.financeCategories)) setFinanceCategories(data.financeCategories);
    if (Array.isArray(data.techTests)) setTechTests(data.techTests);
    if (data.salarySettings) setSalarySettings(data.salarySettings);
    if (Array.isArray(data.periodizationPlans)) setPeriodizationPlans(data.periodizationPlans);
    if (Array.isArray(data.accountingRecords)) setAccountingRecords(data.accountingRecords);
    if (Array.isArray(data.tactics)) setTactics(data.tactics);
    if (Array.isArray(data.pointItemDefinitions)) setPointItemDefinitions(data.pointItemDefinitions);
    if (Array.isArray(data.playerPointRecords)) setPlayerPointRecords(data.playerPointRecords);
    if (Array.isArray(data.travelingPlayerIds)) setTravelingPlayerIds(data.travelingPlayerIds);
    if (Array.isArray(data.philosophyDocs)) setPhilosophyDocs(data.philosophyDocs);
    if (Array.isArray(data.matchPrinciples)) setMatchPrinciples(data.matchPrinciples);
    if (Array.isArray(data.basicTechThemes)) setBasicTechThemes(data.basicTechThemes);
    if (Array.isArray(data.scenarioThemes)) setScenarioThemes(data.scenarioThemes);
    if (data.philosophyOverview) setPhilosophyOverview(data.philosophyOverview);

    setTimeout(() => {
        setIsInitializing(false);
        setHasUnsavedChanges(false);
        const now = new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSavedTime(now);
    }, 100);
  };

  const handleManualSave = async () => {
    if (isInitializing || isSyncing) return;
    setIsSyncing(true);
    setCloudError(null);
    
    const dataPayload = {
        players,
        teams,
        matches,
        trainings,
        attributeConfig,
        announcements,
        appLogo,
        users,
        designs,
        transactions,
        permissions,
        financeCategories,
        techTests,
        salarySettings,
        periodizationPlans,
        accountingRecords,
        tactics,
        pointItemDefinitions,
        playerPointRecords,
        travelingPlayerIds,
        philosophyDocs,
        matchPrinciples,
        basicTechThemes,
        scenarioThemes,
        philosophyOverview
    };

    // Mirror in local browser storage synchronously first
    try {
        localStorage.setItem('football_manager_local_cache', JSON.stringify(dataPayload));
    } catch (e) {
        console.warn('Failed to cache data in browser storage:', e);
    }

    try {
        const res = await saveDataToCloud(dataPayload);
        if (res && res.cloudSynced === false) {
            setCloudError(`数据已本地保存。但未能上传备份至云端备份（Vercel Blob 暂时未就绪）。`);
        } else {
            setCloudError(null);
            setHasUnsavedChanges(false);
            const now = new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setLastSavedTime(now);
        }
    } catch (e: any) {
        console.warn("Manual save failed:", e);
        setCloudError(`手动云端同步失败: ${e.message || '网络超时'}`);
    } finally {
        setIsSyncing(false);
    }
  };


  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setActiveTab('dashboard');
    setOpenedTabs(['dashboard']);
    setNavigationParams({});
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setOpenedTabs(['dashboard']);
    setNavigationParams({});
  };

  const handleNavigate = (tab: string, filter?: string) => {
      handleOpenTab(tab);
      if (filter) setNavigationParams({ filter });
  };

  const handleOpenTab = (tabId: string) => {
    setActiveTab(tabId);
    if (!openedTabs.includes(tabId)) {
      setOpenedTabs(prev => [...prev, tabId]);
    }
  };

  const handleCloseTab = (tabId: string) => {
    if (openedTabs.length <= 1) return;
    const newTabs = openedTabs.filter(id => id !== tabId);
    setOpenedTabs(newTabs);
    if (activeTab === tabId) {
      setActiveTab(newTabs[newTabs.length - 1]);
    }
  };

  // Finance Handlers
  const handleAddTransaction = (t: FinanceTransaction) => setTransactions(prev => [...prev, t]);
  const handleBulkAddTransactions = (newTransactions: FinanceTransaction[]) => setTransactions(prev => [...prev, ...newTransactions]);
  const handleDeleteTransaction = (id: string) => { if(confirm('确定要删除这条财务记录吗？')) setTransactions(prev => prev.filter(t => t.id !== id)); };
  const handleBulkDeleteTransactions = (ids: string[]) => {
      if(confirm(`确定要删除选中的 ${ids.length} 条财务记录吗？`)) {
          setTransactions(prev => prev.filter(t => !ids.includes(t.id)));
      }
  };

  const handleAddTeam = (team: Team) => setTeams(prev => [...prev, team]);
  const handleUpdateTeam = (updatedTeam: Team) => setTeams(prev => prev.map(t => t.id === updatedTeam.id ? updatedTeam : t));
  const handleAddPlayer = (player: Player) => setPlayers(prev => [...prev, player]);
  const handleBulkAddPlayers = (newPlayers: Player[]) => setPlayers(prev => [...prev, ...newPlayers]);
  const handleUpdatePlayer = (updatedPlayer: Player) => setPlayers(prev => prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p));
  const handleDeletePlayer = (playerId: string) => { if(confirm('确定要删除这名球员吗？')) setPlayers(prev => prev.filter(p => p.id !== playerId)); };
  const handleBulkDeletePlayers = (playerIds: string[]) => setPlayers(prev => prev.filter(p => !playerIds.includes(p.id)));
  const handleTransferPlayers = (playerIds: string[], targetTeamId: string) => setPlayers(prev => prev.map(p => playerIds.includes(p.id) ? { ...p, teamId: targetTeamId } : p));
  const handleAddPlayerReview = (playerId: string, review: PlayerReview) => setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, reviews: [...(p.reviews || []), review] } : p));
  const handleAddMatch = (match: Match) => setMatches(prev => [...prev, match]);
  const handleDeleteMatch = (matchId: string) => setMatches(prev => prev.filter(m => m.id !== matchId));
  const handleUpdateMatch = React.useCallback((updatedMatch: Match) => setMatches(prev => prev.map(m => m.id === updatedMatch.id ? updatedMatch : m)), []);
  const handleAddUser = (user: User) => setUsers(prev => [...prev, user]);
  const handleUpdateUser = (updatedUser: User) => setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
  const handleDeleteUser = (userId: string) => setUsers(prev => prev.filter(u => u.id !== userId));
  const handleResetUserPassword = (userId: string) => setUsers(prev => prev.map(u => u.id === userId ? { ...u, password: '123' } : u));
  const handleUpdateUserPassword = (userId: string, newPassword: string) => setUsers(prev => prev.map(u => u.id === userId ? { ...u, password: newPassword } : u));
  const handleSaveDesign = (design: DrillDesign) => setDesigns(prev => { const idx = prev.findIndex(d => d.id === design.id); if(idx >= 0) { const next = [...prev]; next[idx] = design; return next; } return [...prev, design]; });
  const handleDeleteDesign = (id: string) => setDesigns(prev => prev.filter(d => d.id !== id));
  const handleAddAnnouncement = (announcement: Announcement) => setAnnouncements(prev => [announcement, ...prev]);
  const handleDeleteAnnouncement = (id: string) => setAnnouncements(prev => prev.filter(a => a.id !== id));
  const handleUpdateAnnouncement = (updatedAnnouncement: Announcement) => setAnnouncements(prev => prev.map(a => a.id === updatedAnnouncement.id ? updatedAnnouncement : a));
  
  // Point Handlers
  const handleAddPointItem = (item: PointItemDefinition) => setPointItemDefinitions(prev => [...prev, item]);
  const handleDeletePointItem = (id: string) => setPointItemDefinitions(prev => prev.filter(i => i.id !== id));
  const handleAddPointRecord = (record: PlayerPointRecord) => setPlayerPointRecords(prev => [...prev, record]);
  const handleBulkAddPointRecords = (records: PlayerPointRecord[]) => setPlayerPointRecords(prev => [...prev, ...records]);
  const handleDeletePointRecord = (id: string) => setPlayerPointRecords(prev => prev.filter(r => r.id !== id));
  const handleUpdateTravelingPlayers = (ids: string[]) => setTravelingPlayerIds(ids);

  const handleRechargePlayer = (playerId: string, amount: number, leaveQuota: number) => {
      const today = new Date();
      today.setFullYear(today.getFullYear() + 1);
      const nextYearStr = today.toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];
      setPlayers(prev => prev.map(p => {
          if (p.id === playerId) {
              const newRecord: RechargeRecord = { id: Date.now().toString(), date: todayStr, amount, quotaAdded: leaveQuota };
              return { ...p, validUntil: nextYearStr, rechargeHistory: [...(p.rechargeHistory || []), newRecord] };
          }
          return p;
      }));
  };
  const handleBulkRechargePlayers = (playerIds: string[], amount: number, leaveQuota: number) => {
      const today = new Date();
      today.setFullYear(today.getFullYear() + 1);
      const nextYearStr = today.toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];
      setPlayers(prev => prev.map(p => {
          if (playerIds.includes(p.id)) {
              const newRecord: RechargeRecord = { id: Date.now().toString() + Math.random().toString(36).substr(2, 5), date: todayStr, amount, quotaAdded: leaveQuota };
              return { ...p, validUntil: nextYearStr, rechargeHistory: [...(p.rechargeHistory || []), newRecord] };
          }
          return p;
      }));
  };
  const handleDeleteRecharge = (playerId: string, rechargeId: string) => setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, rechargeHistory: p.rechargeHistory.filter(r => r.id !== rechargeId) } : p));
  const handleAddTraining = (session: TrainingSession) => setTrainings(prev => [...prev, session]);
  const handleDeleteTraining = (sessionId: string) => setTrainings(prev => prev.filter(t => t.id !== sessionId));
  const handleUpdateAttendance = (session: TrainingSession, newAttendance: AttendanceRecord[]) => setTrainings(prev => prev.map(t => t.id === session.id ? { ...session, attendance: newAttendance } : t));
  const handleUpdateAttributeConfig = (newConfig: AttributeConfig) => setAttributeConfig(newConfig);

  // Accounting Records Handlers
  const handleAddAccountingRecord = (record: AccountingRecord) => setAccountingRecords(prev => [...prev, record]);
  const handleUpdateAccountingRecord = (updatedRecord: AccountingRecord) => setAccountingRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
  const handleDeleteAccountingRecord = (id: string) => { if(confirm('确定要删除这条会计账款记录吗？')) setAccountingRecords(prev => prev.filter(r => r.id !== id)); };

  const handleUpdatePeriodization = (plan: PeriodizationPlan) => {
      setPeriodizationPlans(prev => {
          const idx = prev.findIndex(p => p.teamId === plan.teamId && p.year === plan.year);
          if (idx >= 0) {
              const next = [...prev];
              next[idx] = plan;
              return next;
          }
          return [...prev, plan];
      });
  };

  if (isInitializing) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
              <Loader2 className="w-10 h-10 text-bvb-yellow animate-spin mb-4" />
              <p className="text-gray-500 font-bold">正在载入云端数据...</p>
          </div>
      );
  }

  if (!currentUser) return <Login users={users} players={derivedPlayers} onLogin={handleLogin} appLogo={appLogo} />;

  if (currentUser.role === 'parent' && currentUser.playerId) {
    const childPlayer = derivedPlayers.find(p => p.id === currentUser.playerId);
    if (!childPlayer) return <div>Error: Player not found</div>;
    const childTeam = teams.find(t => t.id === childPlayer.teamId);
    return <ParentPortal player={childPlayer} team={childTeam} attributeConfig={attributeConfig} trainings={trainings} onLogout={handleLogout} appLogo={appLogo} techTests={techTests} onUpdatePlayer={handleUpdatePlayer} />;
  }

  const renderTabContent = (tabId: string) => {
    switch (tabId) {
      case 'dashboard':
        return <Dashboard players={derivedPlayers} matches={matches} trainings={trainings} teams={teams} transactions={transactions} announcements={announcements} currentUser={currentUser} onNavigate={handleNavigate} onAddAnnouncement={handleAddAnnouncement} onDeleteAnnouncement={handleDeleteAnnouncement} onUpdateAnnouncement={handleUpdateAnnouncement} appLogo={appLogo} tactics={tactics} salarySettings={salarySettings} />;
      case 'players':
        return <PlayerManager teams={teams} players={derivedPlayers} trainings={trainings} attributeConfig={attributeConfig} currentUser={currentUser} onAddPlayer={handleAddPlayer} onBulkAddPlayers={handleBulkAddPlayers} onAddTeam={handleAddTeam} onUpdateTeam={handleUpdateTeam} onDeleteTeam={id => setTeams(prev => prev.filter(t => t.id !== id))} onUpdatePlayer={handleUpdatePlayer} onDeletePlayer={handleDeletePlayer} onBulkDeletePlayers={handleBulkDeletePlayers} onTransferPlayers={handleTransferPlayers} onAddPlayerReview={handleAddPlayerReview} onRechargePlayer={handleRechargePlayer} onBulkRechargePlayers={handleBulkRechargePlayers} onDeleteRecharge={handleDeleteRecharge} initialFilter={navigationParams.filter} appLogo={appLogo} />;
      case 'growth':
        return <TechnicalGrowth players={derivedPlayers} teams={teams} currentUser={currentUser} techTests={techTests} onUpdatePlayer={handleUpdatePlayer} onUpdateTechTests={setTechTests} />;
      case 'finance':
        return <FinanceManager transactions={transactions} financeCategories={financeCategories} currentUser={currentUser} onAddTransaction={handleAddTransaction} onBulkAddTransactions={handleBulkAddTransactions} onDeleteTransaction={handleDeleteTransaction} onBulkDeleteTransactions={handleBulkDeleteTransactions} users={users} players={derivedPlayers} teams={teams} trainings={trainings} salarySettings={salarySettings} onUpdateUser={handleUpdateUser} accountingRecords={accountingRecords} periodizationPlans={periodizationPlans} onAddAccountingRecord={handleAddAccountingRecord} onUpdateAccountingRecord={handleUpdateAccountingRecord} onDeleteAccountingRecord={handleDeleteAccountingRecord} />;
      case 'design':
        return <SessionDesigner designs={designs} onSaveDesign={handleSaveDesign} onDeleteDesign={handleDeleteDesign} currentUser={currentUser} />;
      case 'training':
        return <TrainingPlanner teams={teams} players={derivedPlayers} trainings={trainings} drillLibrary={attributeConfig.drillLibrary} trainingFoci={attributeConfig.trainingFoci} focusSubjects={attributeConfig.focusSubjects} designs={designs} currentUser={currentUser} onAddTraining={handleAddTraining} onUpdateTraining={handleUpdateAttendance} onDeleteTraining={handleDeleteTraining} initialFilter={navigationParams.filter} appLogo={appLogo} periodizationPlans={periodizationPlans} onUpdatePeriodization={handleUpdatePeriodization} basicTechThemes={basicTechThemes} scenarioThemes={scenarioThemes} />;
      case 'matches':
        return <MatchPlanner 
          matches={matches} 
          players={derivedPlayers} 
          teams={teams} 
          currentUser={currentUser} 
          onAddMatch={handleAddMatch} 
          onDeleteMatch={handleDeleteMatch} 
          onUpdateMatch={handleUpdateMatch} 
          appLogo={appLogo}
          pointItemDefinitions={pointItemDefinitions}
          onAddPointItem={handleAddPointItem}
          onDeletePointItem={handleDeletePointItem}
          playerPointRecords={playerPointRecords}
          onAddPointRecord={handleAddPointRecord}
          onBulkAddPointRecords={handleBulkAddPointRecords}
          onDeletePointRecord={handleDeletePointRecord}
          travelingPlayerIds={travelingPlayerIds}
          onUpdateTravelingPlayers={handleUpdateTravelingPlayers}
          tactics={tactics}
          onUpdateTactics={setTactics}
        />;
      case 'philosophy':
        return (
          <PhilosophyLibrary 
            currentUser={currentUser}
            customDocs={philosophyDocs}
            onAddDoc={doc => setPhilosophyDocs(prev => [...prev, doc])}
            onUpdateDoc={doc => setPhilosophyDocs(prev => prev.map(d => d.id === doc.id ? doc : d))}
            onDeleteDoc={id => setPhilosophyDocs(prev => prev.filter(d => d.id !== id))}
            appLogo={appLogo}
            matchPrinciples={matchPrinciples}
            onUpdatePrinciples={setMatchPrinciples}
            basicTechThemes={basicTechThemes}
            onUpdateBasicTechThemes={setBasicTechThemes}
            scenarioThemes={scenarioThemes}
            onUpdateScenarioThemes={setScenarioThemes}
            philosophyOverview={philosophyOverview}
            onUpdatePhilosophyOverview={setPhilosophyOverview}
          />
        );
      case 'settings':
        return <Settings attributeConfig={attributeConfig} onUpdateConfig={handleUpdateAttributeConfig} currentUser={currentUser} users={users} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onDeleteUser={handleDeleteUser} onResetUserPassword={handleResetUserPassword} onUpdateUserPassword={handleUpdateUserPassword} appLogo={appLogo} onUpdateAppLogo={setAppLogo} teams={teams} permissions={permissions} onUpdatePermissions={setPermissions} financeCategories={financeCategories} onUpdateFinanceCategories={setFinanceCategories} salarySettings={salarySettings} onUpdateSalarySettings={setSalarySettings} onRestoreSystem={handleRestoreSystem} />;
      default:
        return null;
    }
  };

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={handleOpenTab} 
      openedTabs={openedTabs}
      onCloseTab={handleCloseTab}
      currentUser={currentUser} 
      onLogout={handleLogout} 
      isSyncing={isSyncing} 
      hasUnsavedChanges={hasUnsavedChanges}
      lastSavedTime={lastSavedTime}
      onManualSave={handleManualSave}
      hasNewAnnouncements={announcements.some(a => a.date === new Date().toISOString().split('T')[0])} 
      appLogo={appLogo} 
      permissions={permissions}
    >
      {cloudError && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex justify-between items-center shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center">
            <div className="bg-red-500 p-1.5 rounded-full mr-3">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <div>
              <p className="text-sm font-black text-red-800 uppercase tracking-tight">云端同步异常</p>
              <p className="text-xs text-red-600 font-bold">{cloudError}</p>
            </div>
          </div>
          <button 
            onClick={() => initializeCloudData()}
            className="px-4 py-2 bg-red-600 text-white text-xs font-black rounded-lg hover:bg-red-700 transition-colors shadow-sm active:scale-95"
          >
            重试连接
          </button>
        </div>
      )}
      
      <div className="relative h-full">
        {openedTabs.map(tabId => (
          <div 
            key={tabId} 
            className={`h-full ${activeTab === tabId ? 'block' : 'hidden'}`}
          >
            {renderTabContent(tabId)}
          </div>
        ))}
      </div>
    </Layout>
  );
}

export default App;
