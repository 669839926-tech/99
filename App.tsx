import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import PlayerManager from './components/PlayerManager';
import TrainingPlanner from './components/TrainingPlanner';
import MatchPlanner from './components/MatchPlanner';
import Settings from './components/Settings';
import Login from './components/Login';
import ParentPortal from './components/ParentPortal';
import { MOCK_PLAYERS, MOCK_MATCHES, MOCK_TRAINING, MOCK_TEAMS, DEFAULT_ATTRIBUTE_CONFIG, MOCK_USERS } from './constants';
import { Player, TrainingSession, Team, AttributeConfig, PlayerReview, AttendanceRecord, RechargeRecord, User, Match } from './types';

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
  const [users] = useState<User[]>(MOCK_USERS);

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
                  currentUser={currentUser} 
                  onNavigate={handleNavigate}
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
        return <Settings attributeConfig={attributeConfig} onUpdateConfig={handleUpdateAttributeConfig} />;
      default:
        return <Dashboard players={players} matches={matches} trainings={trainings} teams={teams} currentUser={currentUser} />;
    }
  };

  return (
    <Layout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        currentUser={currentUser} 
        onLogout={handleLogout}
    >
      {renderContent()}
    </Layout>
  );
}

export default App;