import fs from 'fs';
import path from 'path';

const ACTIVE_DB_PATH = path.join(process.cwd(), 'football_manager_db.json');
const BACKUP_DB_PATH = path.join(process.cwd(), 'football_manager_db_backup_1780651439905.json');

interface Database {
  players?: any[];
  teams?: any[];
  matches?: any[];
  trainings?: any[];
  announcements?: any[];
  users?: any[];
  designs?: any[];
  transactions?: any[];
  financeCategories?: any[];
  techTests?: any[];
  periodizationPlans?: any[];
  accountingRecords?: any[];
  tactics?: any[];
  pointItemDefinitions?: any[];
  playerPointRecords?: any[];
  travelingPlayerIds?: any[];
  philosophyDocs?: any[];
  matchPrinciples?: any[];
  basicTechThemes?: any[];
  scenarioThemes?: any[];
  [key: string]: any;
}

function mergeArraysById(activeArr: any[] = [], backupArr: any[] = [], uniqueKeys: string[] = ['id']): any[] {
  const mergedMap = new Map<string, any>();
  const fallbackList: any[] = [];
  
  // Add all backup array items first to establish background data
  backupArr.forEach(item => {
    if (!item) return;
    const keyVal = uniqueKeys.map(k => String(item[k] || '')).join('_').trim();
    if (keyVal && keyVal !== '_' && keyVal !== '__') {
      mergedMap.set(keyVal, item);
    } else {
      // Fallback keys
      const fallbackKey = item.code || item.name || item.title || item.username;
      if (fallbackKey) {
        mergedMap.set(String(fallbackKey), item);
      } else {
        fallbackList.push(item);
      }
    }
  });

  // Overwrite or add active array items (they are newer)
  activeArr.forEach(item => {
    if (!item) return;
    const keyVal = uniqueKeys.map(k => String(item[k] || '')).join('_').trim();
    if (keyVal && keyVal !== '_' && keyVal !== '__') {
      const existing = mergedMap.get(keyVal);
      if (existing) {
        mergedMap.set(keyVal, { ...existing, ...item });
      } else {
        mergedMap.set(keyVal, item);
      }
    } else {
      const fallbackKey = item.code || item.name || item.title || item.username;
      if (fallbackKey) {
        const existing = mergedMap.get(String(fallbackKey));
        if (existing) {
          mergedMap.set(String(fallbackKey), { ...existing, ...item });
        } else {
          mergedMap.set(String(fallbackKey), item);
        }
      } else {
        fallbackList.push(item);
      }
    }
  });

  return Array.from(mergedMap.values()).concat(fallbackList);
}

function main() {
  console.log('[Merge Script] Starting Robust DB Merge...');
  
  if (!fs.existsSync(ACTIVE_DB_PATH)) {
    console.error('Active database not found at:', ACTIVE_DB_PATH);
    return;
  }
  if (!fs.existsSync(BACKUP_DB_PATH)) {
    console.error('Backup database not found at:', BACKUP_DB_PATH);
    return;
  }

  // Backup our active db before making changes
  const activeDbRaw = fs.readFileSync(ACTIVE_DB_PATH, 'utf-8');
  const backupDbRaw = fs.readFileSync(BACKUP_DB_PATH, 'utf-8');

  const activeDb: Database = JSON.parse(activeDbRaw);
  const backupDb: Database = JSON.parse(backupDbRaw);

  const mergedDb: Database = { ...activeDb };

  // Keys to merge
  const keysToMergeById = [
    'players', 'teams', 'matches', 'trainings', 'announcements', 'users',
    'designs', 'transactions', 'financeCategories', 'techTests', 
    'accountingRecords', 'tactics', 'pointItemDefinitions', 'playerPointRecords',
    'matchPrinciples', 'basicTechThemes', 'scenarioThemes'
  ];

  for (const key of keysToMergeById) {
    // If our active array got cleared in the previous merge, recover it from backup (as they were original configuration defaults)
    const activeArr = (activeDb[key] && activeDb[key].length > 0) ? activeDb[key] : (backupDb[key] || []);
    const backupArr = backupDb[key] || [];
    
    const primaryKey = key === 'users' ? ['id', 'username'] : ['id'];
    
    mergedDb[key] = mergeArraysById(activeArr, backupArr, primaryKey);
    console.log(`[Merge Script] Merging "${key}": active size=${activeArr.length}, backup size=${backupArr.length} => final merged size=${mergedDb[key].length}`);
  }

  // Handle periodizationPlans
  const activePlans = (activeDb.periodizationPlans && activeDb.periodizationPlans.length > 0) ? activeDb.periodizationPlans : (backupDb.periodizationPlans || []);
  const backupPlans = backupDb.periodizationPlans || [];
  mergedDb.periodizationPlans = mergeArraysById(activePlans, backupPlans, ['id']);
  console.log(`[Merge Script] Merged "periodizationPlans": Total is ${mergedDb.periodizationPlans.length}`);

  // Handle simple arrays
  const simpleKeys = ['travelingPlayerIds', 'philosophyDocs'];
  for (const key of simpleKeys) {
    const activeArr = activeDb[key] || [];
    const backupArr = backupDb[key] || [];
    mergedDb[key] = Array.from(new Set([...activeArr, ...backupArr]));
  }

  // Write merged database
  fs.writeFileSync(ACTIVE_DB_PATH, JSON.stringify(mergedDb, null, 2), 'utf-8');
  console.log(`[Merge Script] Success! Merged database written to ${ACTIVE_DB_PATH}. Total players: ${mergedDb.players?.length || 0}`);
}

main();
