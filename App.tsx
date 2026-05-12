
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
import TacticsModule from './components/TacticsModule';
import { MOCK_PLAYERS, MOCK_MATCHES, MOCK_TRAINING, MOCK_TEAMS, DEFAULT_ATTRIBUTE_CONFIG, MOCK_USERS, MOCK_ANNOUNCEMENTS, APP_LOGO, DEFAULT_PERMISSIONS, DEFAULT_FINANCE_CATEGORIES, DEFAULT_SALARY_SETTINGS } from './constants';
import { Player, TrainingSession, Team, AttributeConfig, PlayerReview, AttendanceRecord, RechargeRecord, User, Match, Announcement, DrillDesign, FinanceTransaction, RolePermissions, FinanceCategoryDefinition, TechTestDefinition, SalarySettings, PeriodizationPlan, AccountingRecord } from './types';
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
  const [matchPlans, setMatchPlans] = useState<MatchPlan[]>([]);
  const [pointItemDefinitions, setPointItemDefinitions] = useState<PointItemDefinition[]>([]);
  const [playerPointRecords, setPlayerPointRecords] = useState<PlayerPointRecord[]>([]);
  const [travelingPlayerIds, setTravelingPlayerIds] = useState<string[]>([]);

  // Persistence State
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
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

          return { 
              ...p, 
              credits: runningCredits, 
              remainingLeaveQuota: runningLeaveQuota,
              leavesUsed: usedLeaveQuota
          };
      });
  }, [players, trainings]);

  // Load Data on Mount
  const initializeCloudData = useCallback(async () => {
    setIsInitializing(true);
    setCloudError(null);
    try {
        const cloudData = await loadDataFromCloud();
        if (cloudData) {
            setTeams(cloudData.teams || MOCK_TEAMS);
            setPlayers(cloudData.players || MOCK_PLAYERS);
            setMatches(cloudData.matches || MOCK_MATCHES);
            setTrainings(cloudData.trainings || MOCK_TRAINING);
            setAttributeConfig(cloudData.attributeConfig || DEFAULT_ATTRIBUTE_CONFIG);
            setAnnouncements(cloudData.announcements || MOCK_ANNOUNCEMENTS);
            if (cloudData.appLogo) setAppLogo(cloudData.appLogo);
            if (cloudData.users) setUsers(cloudData.users);
            if (cloudData.designs) setDesigns(cloudData.designs);
            if (cloudData.transactions) setTransactions(cloudData.transactions);
            if (cloudData.permissions) setPermissions(cloudData.permissions);
            if (cloudData.financeCategories) setFinanceCategories(cloudData.financeCategories);
            if (cloudData.techTests) setTechTests(cloudData.techTests);
            if (cloudData.salarySettings) setSalarySettings(cloudData.salarySettings);
            if (cloudData.periodizationPlans) setPeriodizationPlans(cloudData.periodizationPlans);
            if (cloudData.accountingRecords) setAccountingRecords(cloudData.accountingRecords);
            if (cloudData.tactics) setTactics(cloudData.tactics);
            if (cloudData.matchPlans) setMatchPlans(cloudData.matchPlans);
            if (cloudData.pointItemDefinitions) setPointItemDefinitions(cloudData.pointItemDefinitions);
            if (cloudData.playerPointRecords) setPlayerPointRecords(cloudData.playerPointRecords);
            if (cloudData.travelingPlayerIds) setTravelingPlayerIds(cloudData.travelingPlayerIds);
            setCloudError(null);
        }
    } catch (err: any) {
        console.error("Failed to initialize cloud data", err);
        setCloudError(err.message || "无法连接到云端存储");
    } finally {
        setIsInitializing(false);
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

    const timer = setTimeout(async () => {
        setIsSyncing(true);
        try {
            await saveDataToCloud({
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
                matchPlans,
                pointItemDefinitions,
                playerPointRecords,
                travelingPlayerIds
            });
            setCloudError(null);
        } catch (e: any) {
            console.error("Auto-save failed", e);
            setCloudError(e.message || "自动保存失败");
        } finally {
            setIsSyncing(false);
        }
    }, 2000);

    return () => clearTimeout(timer);
  }, [players, teams, matches, trainings, attributeConfig, announcements, appLogo, users, designs, transactions, permissions, financeCategories, techTests, salarySettings, periodizationPlans, accountingRecords, tactics, matchPlans, pointItemDefinitions, playerPointRecords, travelingPlayerIds, isInitializing]);


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
        return <TrainingPlanner teams={teams} players={derivedPlayers} trainings={trainings} drillLibrary={attributeConfig.drillLibrary} trainingFoci={attributeConfig.trainingFoci} focusSubjects={attributeConfig.focusSubjects} designs={designs} currentUser={currentUser} onAddTraining={handleAddTraining} onUpdateTraining={handleUpdateAttendance} onDeleteTraining={handleDeleteTraining} initialFilter={navigationParams.filter} appLogo={appLogo} periodizationPlans={periodizationPlans} onUpdatePeriodization={handleUpdatePeriodization} />;
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
          matchPlans={matchPlans}
          onAddMatchPlan={(plan) => setMatchPlans(prev => [...prev, plan])}
          onUpdateMatchPlan={(plan) => setMatchPlans(prev => prev.map(p => p.id === plan.id ? plan : p))}
          onDeleteMatchPlan={(id) => setMatchPlans(prev => prev.filter(p => p.id !== id))}
          pointItemDefinitions={pointItemDefinitions}
          onAddPointItem={handleAddPointItem}
          onDeletePointItem={handleDeletePointItem}
          playerPointRecords={playerPointRecords}
          onAddPointRecord={handleAddPointRecord}
          onBulkAddPointRecords={handleBulkAddPointRecords}
          onDeletePointRecord={handleDeletePointRecord}
          travelingPlayerIds={travelingPlayerIds}
          onUpdateTravelingPlayers={handleUpdateTravelingPlayers}
        />;
      case 'tactics':
        return <TacticsModule players={derivedPlayers} teams={teams} tactics={tactics} onUpdateTactics={setTactics} />;
      case 'settings':
        return <Settings attributeConfig={attributeConfig} onUpdateConfig={handleUpdateAttributeConfig} currentUser={currentUser} users={users} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onDeleteUser={handleDeleteUser} onResetUserPassword={handleResetUserPassword} onUpdateUserPassword={handleUpdateUserPassword} appLogo={appLogo} onUpdateAppLogo={setAppLogo} teams={teams} permissions={permissions} onUpdatePermissions={setPermissions} financeCategories={financeCategories} onUpdateFinanceCategories={setFinanceCategories} salarySettings={salarySettings} onUpdateSalarySettings={setSalarySettings} />;
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
