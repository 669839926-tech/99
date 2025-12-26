
import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { MOCK_PLAYERS, MOCK_MATCHES, MOCK_TRAINING, MOCK_TEAMS, DEFAULT_ATTRIBUTE_CONFIG, MOCK_USERS, MOCK_ANNOUNCEMENTS, APP_LOGO, DEFAULT_PERMISSIONS, DEFAULT_FINANCE_CATEGORIES, DEFAULT_SALARY_SETTINGS } from './constants';
import { Player, TrainingSession, Team, AttributeConfig, PlayerReview, AttendanceRecord, RechargeRecord, User, Match, Announcement, DrillDesign, FinanceTransaction, RolePermissions, FinanceCategoryDefinition, TechTestDefinition, SalarySettings } from './types';
import { loadDataFromCloud, saveDataToCloud } from './services/storageService';
import { Loader2 } from 'lucide-react';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
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

  // Persistence State
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const isFirstRun = useRef(true);

  // Derived Players: Calculate Credits on the fly
  const derivedPlayers = useMemo(() => {
      return players.map(p => {
          let balance = 0;
          if (p.rechargeHistory) balance += p.rechargeHistory.reduce((sum, r) => sum + r.amount, 0);
          trainings.forEach(t => {
              const record = t.attendance?.find(r => r.playerId === p.id);
              if (record && record.status === 'Present') balance -= 1;
          });
          return { ...p, credits: balance };
      });
  }, [players, trainings]);

  // Load Data on Mount
  useEffect(() => {
    const init = async () => {
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
        }
        setIsInitializing(false);
    };
    init();
  }, []);

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
                salarySettings
            });
        } catch (e) {
            console.error("Auto-save failed", e);
        } finally {
            setIsSyncing(false);
        }
    }, 2000);

    return () => clearTimeout(timer);
  }, [players, teams, matches, trainings, attributeConfig, announcements, appLogo, users, designs, transactions, permissions, financeCategories, techTests, salarySettings, isInitializing]);


  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setActiveTab('dashboard');
    setNavigationParams({});
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setNavigationParams({});
  };

  const handleNavigate = (tab: string, filter?: string) => {
      setActiveTab(tab);
      if (filter) setNavigationParams({ filter });
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
  const handleUpdateMatch = (updatedMatch: Match) => setMatches(prev => prev.map(m => m.id === updatedMatch.id ? updatedMatch : m));
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
  const handleRechargePlayer = (playerId: string, amount: number, leaveQuota: number) => {
      const today = new Date();
      today.setFullYear(today.getFullYear() + 1);
      const nextYearStr = today.toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];
      setPlayers(prev => prev.map(p => {
          if (p.id === playerId) {
              const newRecord: RechargeRecord = { id: Date.now().toString(), date: todayStr, amount, quotaAdded: leaveQuota };
              return { ...p, validUntil: nextYearStr, leaveQuota, leavesUsed: 0, rechargeHistory: [...(p.rechargeHistory || []), newRecord] };
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
              return { ...p, validUntil: nextYearStr, leaveQuota, leavesUsed: 0, rechargeHistory: [...(p.rechargeHistory || []), newRecord] };
          }
          return p;
      }));
  };
  const handleDeleteRecharge = (playerId: string, rechargeId: string) => setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, rechargeHistory: p.rechargeHistory.filter(r => r.id !== rechargeId) } : p));
  const handleAddTraining = (session: TrainingSession) => setTrainings(prev => [...prev, session]);
  const handleDeleteTraining = (sessionId: string) => setTrainings(prev => prev.filter(t => t.id !== sessionId));
  const handleUpdateAttendance = (session: TrainingSession, newAttendance: AttendanceRecord[]) => setTrainings(prev => prev.map(t => t.id === session.id ? { ...session, attendance: newAttendance } : t));
  const handleUpdateAttributeConfig = (newConfig: AttributeConfig) => setAttributeConfig(newConfig);

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

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard players={derivedPlayers} matches={matches} trainings={trainings} teams={teams} transactions={transactions} announcements={announcements} currentUser={currentUser} onNavigate={handleNavigate} onAddAnnouncement={handleAddAnnouncement} onDeleteAnnouncement={handleDeleteAnnouncement} onUpdateAnnouncement={handleUpdateAnnouncement} appLogo={appLogo} />;
      case 'players':
        return <PlayerManager teams={teams} players={derivedPlayers} trainings={trainings} attributeConfig={attributeConfig} currentUser={currentUser} onAddPlayer={handleAddPlayer} onBulkAddPlayers={handleBulkAddPlayers} onAddTeam={handleAddTeam} onUpdateTeam={handleUpdateTeam} onDeleteTeam={id => setTeams(prev => prev.filter(t => t.id !== id))} onUpdatePlayer={handleUpdatePlayer} onDeletePlayer={handleDeletePlayer} onBulkDeletePlayers={handleBulkDeletePlayers} onTransferPlayers={handleTransferPlayers} onAddPlayerReview={handleAddPlayerReview} onRechargePlayer={handleRechargePlayer} onBulkRechargePlayers={handleBulkRechargePlayers} onDeleteRecharge={handleDeleteRecharge} initialFilter={navigationParams.filter} appLogo={appLogo} />;
      case 'growth':
        return <TechnicalGrowth players={derivedPlayers} teams={teams} currentUser={currentUser} techTests={techTests} onUpdatePlayer={handleUpdatePlayer} onUpdateTechTests={setTechTests} />;
      case 'finance':
        // Comment: Passed 'teams' prop to FinanceManager
        return <FinanceManager transactions={transactions} financeCategories={financeCategories} currentUser={currentUser} onAddTransaction={handleAddTransaction} onBulkAddTransactions={handleBulkAddTransactions} onDeleteTransaction={handleDeleteTransaction} onBulkDeleteTransactions={handleBulkDeleteTransactions} users={users} players={derivedPlayers} teams={teams} trainings={trainings} salarySettings={salarySettings} onUpdateUser={handleUpdateUser} />;
      case 'design':
        return <SessionDesigner designs={designs} onSaveDesign={handleSaveDesign} onDeleteDesign={handleDeleteDesign} currentUser={currentUser} />;
      case 'training':
        return <TrainingPlanner teams={teams} players={derivedPlayers} trainings={trainings} drillLibrary={attributeConfig.drillLibrary} trainingFoci={attributeConfig.trainingFoci} designs={designs} currentUser={currentUser} onAddTraining={handleAddTraining} onUpdateTraining={handleUpdateAttendance} onDeleteTraining={handleDeleteTraining} initialFilter={navigationParams.filter} appLogo={appLogo} />;
      case 'matches':
        return <MatchPlanner matches={matches} players={derivedPlayers} teams={teams} currentUser={currentUser} onAddMatch={handleAddMatch} onDeleteMatch={handleDeleteMatch} onUpdateMatch={handleUpdateMatch} appLogo={appLogo} />;
      case 'settings':
        return <Settings attributeConfig={attributeConfig} onUpdateConfig={handleUpdateAttributeConfig} currentUser={currentUser} users={users} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onDeleteUser={handleDeleteUser} onResetUserPassword={handleResetUserPassword} onUpdateUserPassword={handleUpdateUserPassword} appLogo={appLogo} onUpdateAppLogo={setAppLogo} teams={teams} permissions={permissions} onUpdatePermissions={setPermissions} financeCategories={financeCategories} onUpdateFinanceCategories={setFinanceCategories} salarySettings={salarySettings} onUpdateSalarySettings={setSalarySettings} />;
      default:
        return <Dashboard players={derivedPlayers} matches={matches} trainings={trainings} teams={teams} transactions={transactions} announcements={announcements} currentUser={currentUser} appLogo={appLogo} />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} currentUser={currentUser} onLogout={handleLogout} isSyncing={isSyncing} hasNewAnnouncements={announcements.some(a => a.date === new Date().toISOString().split('T')[0])} appLogo={appLogo} permissions={permissions}>
      {renderContent()}
    </Layout>
  );
}

export default App;
