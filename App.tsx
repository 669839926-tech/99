
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import PlayerManager from './components/PlayerManager';
import TrainingPlanner from './components/TrainingPlanner';
import MatchPlanner from './components/MatchPlanner';
import Settings from './components/Settings';
import Login from './components/Login';
import ParentPortal from './components/ParentPortal';
import { MOCK_PLAYERS, MOCK_MATCHES, MOCK_TRAINING, MOCK_TEAMS, DEFAULT_ATTRIBUTE_CONFIG, MOCK_USERS, MOCK_ANNOUNCEMENTS, APP_LOGO } from './constants';
import { Player, TrainingSession, Team, AttributeConfig, PlayerReview, AttendanceRecord, RechargeRecord, User, Match, Announcement } from './types';
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
  
  // User Management State (Lifted from Settings/Mock)
  const [users, setUsers] = useState<User[]>(MOCK_USERS);

  // Persistence State
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const isFirstRun = useRef(true);

  // Derived Players: Calculate Credits on the fly to ensure consistency
  // Credits = Sum of all Recharges - Count of 'Present' in Training Sessions
  const derivedPlayers = useMemo(() => {
      return players.map(p => {
          let balance = 0;
          // Add Recharges
          if (p.rechargeHistory) {
              balance += p.rechargeHistory.reduce((sum, r) => sum + r.amount, 0);
          }
          
          // Deduct Attendance (Present only)
          trainings.forEach(t => {
              const record = t.attendance?.find(r => r.playerId === p.id);
              if (record && record.status === 'Present') {
                  balance -= 1;
              }
          });
          
          return { ...p, credits: balance };
      });
  }, [players, trainings]);

  // 1. Load Data on Mount
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
        }
        setIsInitializing(false);
    };
    init();
  }, []);

  // 2. Auto-Save on Change (Debounced)
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
                players, // Save raw players state
                teams,
                matches,
                trainings,
                attributeConfig,
                announcements,
                appLogo,
                users
            });
        } catch (e) {
            console.error("Auto-save failed", e);
        } finally {
            setIsSyncing(false);
        }
    }, 2000); // 2 second debounce

    return () => clearTimeout(timer);
  }, [players, teams, matches, trainings, attributeConfig, announcements, appLogo, users, isInitializing]);


  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setActiveTab('dashboard'); // Reset tab on login
    setNavigationParams({});
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setNavigationParams({});
  };

  const handleNavigate = (tab: string, filter?: string) => {
      setActiveTab(tab);
      if (filter) {
          setNavigationParams({ filter });
      }
  };

  const handleAddTeam = (team: Team) => {
    setTeams(prev => [...prev, team]);
  };

  const handleAddPlayer = (player: Player) => {
    setPlayers(prev => [...prev, player]);
  };

  const handleBulkAddPlayers = (newPlayers: Player[]) => {
    setPlayers(prev => [...prev, ...newPlayers]);
  };

  const handleUpdatePlayer = (updatedPlayer: Player) => {
    setPlayers(prev => prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p));
  };

  const handleDeletePlayer = (playerId: string) => {
    if (confirm('确定要删除这名球员吗？此操作不可撤销。')) {
      setPlayers(prev => prev.filter(p => p.id !== playerId));
    }
  };

  const handleBulkDeletePlayers = (playerIds: string[]) => {
    if (confirm(`确定要删除选中的 ${playerIds.length} 名球员吗？`)) {
      setPlayers(prev => prev.filter(p => !playerIds.includes(p.id)));
    }
  };

  const handleTransferPlayers = (playerIds: string[], targetTeamId: string) => {
    setPlayers(prev => prev.map(p => 
      playerIds.includes(p.id) ? { ...p, teamId: targetTeamId } : p
    ));
  };

  const handleAddPlayerReview = (playerId: string, review: PlayerReview) => {
    setPlayers(prev => prev.map(p => {
        if (p.id === playerId) {
            return { ...p, reviews: [...(p.reviews || []), review] };
        }
        return p;
    }));
  };

  // --- Match Logic ---
  const handleAddMatch = (match: Match) => {
    setMatches(prev => [...prev, match]);
  };

  const handleDeleteMatch = (matchId: string) => {
    if (confirm('确定要删除这场比赛记录吗？')) {
        setMatches(prev => prev.filter(m => m.id !== matchId));
    }
  };

  const handleUpdateMatch = (updatedMatch: Match) => {
      setMatches(prev => prev.map(m => m.id === updatedMatch.id ? updatedMatch : m));
  };

  // --- User Management Logic (App Level) ---
  const handleAddUser = (user: User) => {
      setUsers(prev => [...prev, user]);
  };

  const handleDeleteUser = (userId: string) => {
      setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleResetUserPassword = (userId: string) => {
      setUsers(prev => prev.map(u => 
          u.id === userId ? { ...u, password: '123' } : u
      ));
  };

  const handleUpdateUserPassword = (userId: string, newPassword: string) => {
      setUsers(prev => prev.map(u => 
          u.id === userId ? { ...u, password: newPassword } : u
      ));
      // Also update current user session if it's the same user
      if (currentUser && currentUser.id === userId) {
          setCurrentUser(prev => prev ? { ...prev, password: newPassword } : null);
      }
  };

  // --- Announcements Logic ---
  const handleAddAnnouncement = (announcement: Announcement) => {
    setAnnouncements(prev => [announcement, ...prev]);
  };

  const handleDeleteAnnouncement = (id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  };

  const handleUpdateAnnouncement = (updatedAnnouncement: Announcement) => {
    setAnnouncements(prev => prev.map(a => a.id === updatedAnnouncement.id ? updatedAnnouncement : a));
  };

  // --- Recharge / Credit Logic ---
  // No longer manual credit update, just history
  const handleRechargePlayer = (playerId: string, amount: number, leaveQuota: number) => {
    const today = new Date();
    today.setFullYear(today.getFullYear() + 1);
    const nextYearStr = today.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];

    setPlayers(prev => prev.map(p => {
        if (p.id === playerId) {
            const newRecord: RechargeRecord = {
                id: Date.now().toString(),
                date: todayStr,
                amount: amount,
                quotaAdded: leaveQuota
            };

            return {
                ...p,
                // credits: removed (calculated)
                validUntil: nextYearStr,
                leaveQuota: leaveQuota,
                leavesUsed: 0, // Reset leaves on new recharge cycle
                rechargeHistory: [...(p.rechargeHistory || []), newRecord]
            };
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
            const newRecord: RechargeRecord = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                date: todayStr,
                amount: amount,
                quotaAdded: leaveQuota
            };

            return {
                ...p,
                // credits: removed (calculated)
                validUntil: nextYearStr,
                leaveQuota: leaveQuota,
                leavesUsed: 0, // Reset leaves on new recharge cycle
                rechargeHistory: [...(p.rechargeHistory || []), newRecord]
            };
        }
        return p;
    }));
  };

  const handleDeleteRecharge = (playerId: string, rechargeId: string) => {
      if (!confirm('确定要删除这条充值记录吗？\n删除后将扣除相应的课时余额。')) return;

      setPlayers(prev => prev.map(p => {
          if (p.id === playerId) {
              return {
                  ...p,
                  // credits: removed (calculated from filtered history)
                  rechargeHistory: p.rechargeHistory.filter(r => r.id !== rechargeId)
              };
          }
          return p;
      }));
  };

  const handleAddTraining = (session: TrainingSession) => {
    setTrainings(prev => [...prev, session]);
  };

  const handleDeleteTraining = (sessionId: string) => {
      if (confirm('确定要删除这条训练计划吗？\n删除后相关考勤记录也将一并移除。')) {
          setTrainings(prev => prev.filter(t => t.id !== sessionId));
      }
  };

  const handleUpdateAttendance = (session: TrainingSession, newAttendance: AttendanceRecord[]) => {
      // Logic for updating player credits based on attendance is now handled by derivedPlayers calculation.
      // We only need to update leave counts if we want to track them persistently in state, 
      // but for simplicity and consistency, let's update leavesUsed only.
      
      const oldSession = trainings.find(t => t.id === session.id);
      const oldAttendance = oldSession?.attendance || [];

      setPlayers(currentPlayers => {
          let updatedPlayers = [...currentPlayers];

          const modifyPlayer = (pid: string, modifier: (p: Player) => Player) => {
              const idx = updatedPlayers.findIndex(p => p.id === pid);
              if (idx !== -1) {
                  updatedPlayers[idx] = modifier(updatedPlayers[idx]);
              }
          };

          // Revert old leave usage
          oldAttendance.forEach(record => {
              if (record.status === 'Leave') {
                  modifyPlayer(record.playerId, p => ({ ...p, leavesUsed: Math.max(0, p.leavesUsed - 1) }));
              }
          });

          // Apply new leave usage
          newAttendance.forEach(record => {
              if (record.status === 'Leave') {
                  modifyPlayer(record.playerId, p => ({ ...p, leavesUsed: p.leavesUsed + 1 }));
              }
          });

          return updatedPlayers;
      });

      const updatedSession = { ...session, attendance: newAttendance };
      setTrainings(prev => prev.map(t => t.id === session.id ? updatedSession : t));
  };

  const handleUpdateAttributeConfig = (newConfig: AttributeConfig) => {
    setAttributeConfig(newConfig);
  };

  // Loading Screen
  if (isInitializing) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
              <Loader2 className="w-10 h-10 text-bvb-yellow animate-spin mb-4" />
              <p className="text-gray-500 font-bold">正在从 Vercel Blob 恢复数据...</p>
          </div>
      );
  }

  // 1. Not Logged In -> Show Login
  if (!currentUser) {
    return <Login users={users} players={derivedPlayers} onLogin={handleLogin} appLogo={appLogo} />;
  }

  // 2. Parent Login -> Show dedicated Parent Portal
  if (currentUser.role === 'parent' && currentUser.playerId) {
    const childPlayer = derivedPlayers.find(p => p.id === currentUser.playerId);
    if (!childPlayer) return <div>Error: Player not found</div>;
    const childTeam = teams.find(t => t.id === childPlayer.teamId);

    return (
        <ParentPortal 
            player={childPlayer} 
            team={childTeam} 
            attributeConfig={attributeConfig} 
            trainings={trainings}
            onLogout={handleLogout}
            appLogo={appLogo}
        />
    );
  }

  // 3. Staff Login -> Show Main App Layout
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard 
                  players={derivedPlayers} 
                  matches={matches} 
                  trainings={trainings} 
                  teams={teams} 
                  announcements={announcements}
                  currentUser={currentUser} 
                  onNavigate={handleNavigate}
                  onAddAnnouncement={handleAddAnnouncement}
                  onDeleteAnnouncement={handleDeleteAnnouncement}
                  onUpdateAnnouncement={handleUpdateAnnouncement}
                  appLogo={appLogo}
               />;
      case 'players':
        return (
          <PlayerManager 
            teams={teams}
            players={derivedPlayers} 
            trainings={trainings} 
            attributeConfig={attributeConfig}
            currentUser={currentUser}
            onAddPlayer={handleAddPlayer} 
            onBulkAddPlayers={handleBulkAddPlayers}
            onAddTeam={handleAddTeam}
            onDeleteTeam={(teamId) => {
                if (confirm('确定要删除这支球队吗？删除后该队球员将自动转入“待分配”列表，不会被删除。')) {
                    setTeams(prev => prev.filter(t => t.id !== teamId));
                    setPlayers(prev => prev.map(p => p.teamId === teamId ? { ...p, teamId: 'unassigned' } : p));
                }
            }}
            onUpdatePlayer={handleUpdatePlayer}
            onDeletePlayer={handleDeletePlayer}
            onBulkDeletePlayers={handleBulkDeletePlayers}
            onTransferPlayers={handleTransferPlayers}
            onAddPlayerReview={handleAddPlayerReview}
            onRechargePlayer={handleRechargePlayer}
            onBulkRechargePlayers={handleBulkRechargePlayers}
            onDeleteRecharge={handleDeleteRecharge}
            initialFilter={navigationParams.filter}
            appLogo={appLogo}
          />
        );
      case 'training':
        return (
          <TrainingPlanner 
            teams={teams}
            players={derivedPlayers}
            trainings={trainings} 
            drillLibrary={attributeConfig.drillLibrary}
            currentUser={currentUser}
            onAddTraining={handleAddTraining} 
            onUpdateTraining={handleUpdateAttendance}
            onDeleteTraining={handleDeleteTraining}
            initialFilter={navigationParams.filter}
            appLogo={appLogo}
          />
        );
      case 'matches':
        return (
            <MatchPlanner 
                matches={matches} 
                players={derivedPlayers}
                teams={teams}
                onAddMatch={handleAddMatch}
                onDeleteMatch={handleDeleteMatch}
                onUpdateMatch={handleUpdateMatch}
                appLogo={appLogo}
            />
        );
      case 'settings':
        return <Settings 
                  attributeConfig={attributeConfig} 
                  onUpdateConfig={handleUpdateAttributeConfig}
                  currentUser={currentUser}
                  users={users}
                  onAddUser={handleAddUser}
                  onDeleteUser={handleDeleteUser}
                  onResetUserPassword={handleResetUserPassword}
                  onUpdateUserPassword={handleUpdateUserPassword}
                  appLogo={appLogo}
                  onUpdateAppLogo={setAppLogo}
                  teams={teams}
               />;
      default:
        return <Dashboard 
                  players={derivedPlayers} 
                  matches={matches} 
                  trainings={trainings} 
                  teams={teams} 
                  announcements={announcements}
                  currentUser={currentUser}
                  appLogo={appLogo}
               />;
    }
  };

  const hasNewAnnouncements = announcements.some(a => a.date === new Date().toISOString().split('T')[0]);

  return (
    <Layout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        currentUser={currentUser} 
        onLogout={handleLogout}
        isSyncing={isSyncing}
        hasNewAnnouncements={hasNewAnnouncements}
        appLogo={appLogo}
    >
      {renderContent()}
    </Layout>
  );
}

export default App;
