
import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import PlayerManager from './components/PlayerManager';
import TrainingPlanner from './components/TrainingPlanner';
import MatchPlanner from './components/MatchPlanner';
import Settings from './components/Settings';
import Login from './components/Login';
import ParentPortal from './components/ParentPortal';
import { MOCK_PLAYERS, MOCK_MATCHES, MOCK_TRAINING, MOCK_TEAMS, DEFAULT_ATTRIBUTE_CONFIG, MOCK_USERS, MOCK_ANNOUNCEMENTS } from './constants';
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
  
  // User Management State (Lifted from Settings/Mock)
  const [users, setUsers] = useState<User[]>(MOCK_USERS);

  // Persistence State
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const isFirstRun = useRef(true);

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
            // In a real app, users would also be loaded from DB. 
            // For this demo, we use initial mock users or could persist them too if schema allows.
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
                players,
                teams,
                matches,
                trainings,
                attributeConfig,
                announcements
            });
        } catch (e) {
            console.error("Auto-save failed", e);
        } finally {
            setIsSyncing(false);
        }
    }, 2000); // 2 second debounce

    return () => clearTimeout(timer);
  }, [players, teams, matches, trainings, attributeConfig, announcements, isInitializing]);


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
                credits: (p.credits || 0) + amount,
                validUntil: nextYearStr,
                leaveQuota: leaveQuota,
                leavesUsed: 0, // Reset leaves on new recharge cycle
                rechargeHistory: [...(p.rechargeHistory || []), newRecord]
            };
        }
        return p;
    }));
  };

  const handleAddTraining = (session: TrainingSession) => {
    setTrainings(prev => [...prev, session]);
  };

  const handleUpdateAttendance = (session: TrainingSession, newAttendance: AttendanceRecord[]) => {
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

          oldAttendance.forEach(record => {
              if (record.status === 'Present') {
                  modifyPlayer(record.playerId, p => ({ ...p, credits: p.credits + 1 }));
              } else if (record.status === 'Leave') {
                  modifyPlayer(record.playerId, p => {
                      if (p.leavesUsed > p.leaveQuota) {
                           return { ...p, leavesUsed: p.leavesUsed - 1, credits: p.credits + 1 };
                      } else if (p.leavesUsed > 0) {
                           return { ...p, leavesUsed: p.leavesUsed - 1 };
                      }
                      return p;
                  });
              }
          });

          newAttendance.forEach(record => {
              if (record.status === 'Present') {
                  modifyPlayer(record.playerId, p => ({ ...p, credits: p.credits - 1 }));
              } else if (record.status === 'Leave') {
                  modifyPlayer(record.playerId, p => {
                      if (p.leavesUsed < p.leaveQuota) {
                          return { ...p, leavesUsed: p.leavesUsed + 1 };
                      } else {
                          return { ...p, credits: p.credits - 1, leavesUsed: p.leavesUsed + 1 };
                      }
                  });
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
    return <Login users={users} players={players} onLogin={handleLogin} />;
  }

  // 2. Parent Login -> Show dedicated Parent Portal
  if (currentUser.role === 'parent' && currentUser.playerId) {
    const childPlayer = players.find(p => p.id === currentUser.playerId);
    if (!childPlayer) return <div>Error: Player not found</div>;
    const childTeam = teams.find(t => t.id === childPlayer.teamId);

    return (
        <ParentPortal 
            player={childPlayer} 
            team={childTeam} 
            attributeConfig={attributeConfig} 
            trainings={trainings}
            onLogout={handleLogout}
        />
    );
  }

  // 3. Staff Login -> Show Main App Layout
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard 
                  players={players} 
                  matches={matches} 
                  trainings={trainings} 
                  teams={teams} 
                  announcements={announcements}
                  currentUser={currentUser} 
                  onNavigate={handleNavigate}
                  onAddAnnouncement={handleAddAnnouncement}
                  onDeleteAnnouncement={handleDeleteAnnouncement}
                  onUpdateAnnouncement={handleUpdateAnnouncement}
               />;
      case 'players':
        return (
          <PlayerManager 
            teams={teams}
            players={players} 
            trainings={trainings} 
            attributeConfig={attributeConfig}
            currentUser={currentUser}
            onAddPlayer={handleAddPlayer} 
            onBulkAddPlayers={handleBulkAddPlayers}
            onAddTeam={handleAddTeam}
            onDeleteTeam={(teamId) => {
                // Delete Team Logic
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
            initialFilter={navigationParams.filter}
          />
        );
      case 'training':
        return (
          <TrainingPlanner 
            teams={teams}
            players={players}
            trainings={trainings} 
            drillLibrary={attributeConfig.drillLibrary}
            currentUser={currentUser}
            onAddTraining={handleAddTraining} 
            onUpdateTraining={handleUpdateAttendance}
            initialFilter={navigationParams.filter}
          />
        );
      case 'matches':
        return (
            <MatchPlanner 
                matches={matches} 
                players={players}
                teams={teams}
                onAddMatch={handleAddMatch}
                onDeleteMatch={handleDeleteMatch}
                onUpdateMatch={handleUpdateMatch}
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
               />;
      default:
        return <Dashboard 
                  players={players} 
                  matches={matches} 
                  trainings={trainings} 
                  teams={teams} 
                  announcements={announcements}
                  currentUser={currentUser} 
               />;
    }
  };

  // Determine if there are new announcements today to show a badge in Layout
  const hasNewAnnouncements = announcements.some(a => a.date === new Date().toISOString().split('T')[0]);

  return (
    <Layout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        currentUser={currentUser} 
        onLogout={handleLogout}
        isSyncing={isSyncing}
        hasNewAnnouncements={hasNewAnnouncements}
    >
      {renderContent()}
    </Layout>
  );
}

export default App;
