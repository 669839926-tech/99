import { Player, TrainingSession, AttendanceStatus, Team, PlayerTeamTransfer } from '../types';

/**
 * Checks whether a given session date is before player's entry date into the club.
 */
export const isBeforeJoinDate = (sessionDateStr: string, joinDateStr?: string): boolean => {
  if (!joinDateStr || !sessionDateStr) return false;
  return sessionDateStr < joinDateStr;
};

/**
 * Determines whether a training session should be counted for a player,
 * and what attendance status the player holds for that session.
 * 
 * Rules:
 * 1. If player has an explicit attendance record (Present, Leave, Injury, Absent) in `session.attendance`,
 *    this session IS COUNTED with that recorded status. (Preserves all historical participated sessions across any team).
 * 2. If player does NOT have an explicit record:
 *    - If `session.teamId !== player.teamId`: Player is not in this team and has no record -> DO NOT COUNT, NOT ABSENT.
 *    - If `session.date < player.joinDate`: Training was before player joined club -> DO NOT COUNT, NOT ABSENT.
 *    - If player has teamTransferHistory:
 *      Find when player transferred into this current `player.teamId`.
 *      If `session.date < transferDateIntoCurrentTeam`: Player hadn't transferred into current team yet -> DO NOT COUNT, NOT ABSENT.
 *    - Otherwise (session is in player's current team during active period):
 *      Player was expected to attend -> Counted as Absent / unrecorded.
 */
export const getPlayerSessionStatus = (
  player: Player,
  session: TrainingSession
): { isCounted: boolean; status?: AttendanceStatus; creditCost: number } => {
  if (!session || !player) return { isCounted: false, creditCost: 1 };

  const record = session.attendance?.find(r => r.playerId === player.id);
  
  // 1. Explicit attendance record exists
  if (record) {
    return {
      isCounted: true,
      status: record.status,
      creditCost: record.creditCost ?? 1
    };
  }

  // 2. No record exists:
  // If session is for another team, it is NOT counted for this player and NOT absent.
  if (session.teamId !== player.teamId) {
    return { isCounted: false, creditCost: 1 };
  }

  // If session occurred before player joined the club, NOT counted.
  if (isBeforeJoinDate(session.date, player.joinDate)) {
    return { isCounted: false, creditCost: 1 };
  }

  // If player has transfer history, check if session is before player transferred to this current team
  if (player.teamTransferHistory && player.teamTransferHistory.length > 0) {
    // Find transfers into current team
    const transfersToCurrent = player.teamTransferHistory
      .filter(t => t.toTeamId === player.teamId)
      .sort((a, b) => a.transferDate.localeCompare(b.transferDate));

    if (transfersToCurrent.length > 0) {
      const firstTransferToCurrentDate = transfersToCurrent[0].transferDate;
      if (session.date < firstTransferToCurrentDate) {
        // Session in current team happened before player transferred in -> DO NOT COUNT, NOT ABSENT
        return { isCounted: false, creditCost: 1 };
      }
    }
  }

  // If session is in current team during player's active tenure, mark as Absent
  return {
    isCounted: true,
    status: 'Absent',
    creditCost: 1
  };
};

/**
 * Calculates a player's attendance stats for a list of training sessions.
 */
export const calculatePlayerAttendanceSummary = (
  player: Player,
  trainings: TrainingSession[],
  dateFilter?: (sessionDate: string) => boolean
) => {
  let present = 0;
  let presentSessions = 0;
  let leave = 0;
  let injury = 0;
  let absent = 0;
  const countedSessions: { session: TrainingSession; status: AttendanceStatus; creditCost: number }[] = [];

  (trainings || []).forEach(s => {
    if (dateFilter && !dateFilter(s.date)) return;

    const res = getPlayerSessionStatus(player, s);
    if (!res.isCounted || !res.status) return;

    countedSessions.push({ session: s, status: res.status, creditCost: res.creditCost });

    if (res.status === 'Present') {
      present += res.creditCost;
      presentSessions++;
    } else if (res.status === 'Leave') {
      leave++;
    } else if (res.status === 'Injury') {
      injury++;
    } else if (res.status === 'Absent') {
      absent++;
    }
  });

  const total = countedSessions.length;
  const rate = total > 0 ? Math.round((presentSessions / total) * 100) : 0;

  return {
    total,
    present,
    presentSessions,
    leave,
    injury,
    absent,
    rate,
    countedSessions
  };
};

/**
 * Creates or updates player when team changes, automatically recording a PlayerTeamTransfer entry.
 */
export const recordPlayerTeamTransfer = (
  player: Player,
  newTeamId: string,
  teams: Team[],
  reason: string = '梯队归属调整',
  transferDate?: string,
  operator?: string,
  note?: string
): Player => {
  if (!player || player.teamId === newTeamId) return player;

  const fromTeamId = player.teamId;
  const fromTeam = teams.find(t => t.id === fromTeamId);
  const toTeam = teams.find(t => t.id === newTeamId);

  const tDate = transferDate || new Date().toISOString().split('T')[0];

  const newTransfer: PlayerTeamTransfer = {
    id: `trans_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    transferDate: tDate,
    fromTeamId: fromTeamId || undefined,
    fromTeamName: fromTeam ? fromTeam.name : (fromTeamId === 'unassigned' ? '待分配' : '未知梯队'),
    toTeamId: newTeamId,
    toTeamName: toTeam ? toTeam.name : (newTeamId === 'unassigned' ? '待分配' : '未知梯队'),
    reason,
    note: note || '',
    operator: operator || '',
    createdAt: new Date().toISOString()
  };

  const existingTransfers = Array.isArray(player.teamTransferHistory) ? [...player.teamTransferHistory] : [];

  return {
    ...player,
    teamId: newTeamId,
    teamTransferHistory: [...existingTransfers, newTransfer]
  };
};
