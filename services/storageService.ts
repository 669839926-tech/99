
export interface AppData {
    players: any[];
    teams: any[];
    matches: any[];
    trainings: any[];
    designs?: any[];
    attributeConfig: any;
    announcements: any[];
    appLogo?: string;
    users?: any[];
    transactions?: any[];
    permissions?: any;
    financeCategories?: any[]; // New: Finance Categories
    techTests?: any[];
    salarySettings?: any;
    // Comment: Added periodizationPlans to AppData interface to fix build errors in App.tsx
    periodizationPlans?: any[];
    accountingRecords?: any[];
    tactics?: any[];
    pointItemDefinitions?: any[];
    playerPointRecords?: any[];
    travelingPlayerIds?: string[];
    philosophyDocs?: any[];
    matchPrinciples?: any[];
    basicTechThemes?: any[];
    scenarioThemes?: any[];
    philosophyOverview?: any;
}

const getApiUrl = (relativePath: string): string => {
    try {
        if (typeof window !== 'undefined' && window.location) {
            const isHttp = /^https?:/i.test(window.location.protocol);
            if (isHttp && window.location.host && window.location.host.trim() !== '') {
                return `${window.location.protocol}//${window.location.host}${relativePath}`;
            }
        }
    } catch (e) {
        console.warn('[Storage Service] failed to build absolute url from window.location:', e);
    }
    return relativePath;
};

export const loadDataFromCloud = async (): Promise<AppData | null> => {
    try {
        const apiUrl = getApiUrl('/api/storage');
        console.log('Fetching data from cloud storage API...', apiUrl);
        const res = await fetch(apiUrl);
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            const errorMessage = errorData.details || errorData.message || `HTTP ${res.status}`;
            console.warn('API route error:', res.status, errorMessage);
            throw new Error(errorMessage);
        }
        const data = await res.json();
        if (data) {
            console.log('Data successfully loaded from cloud storage.');
        } else {
            console.log('Cloud storage is empty (new database).');
        }
        return data;
    } catch (error: any) {
        console.error('Failed to load data from cloud:', error);
        throw error;
    }
};

export const saveDataToCloud = async (data: AppData) => {
    try {
        const apiUrl = getApiUrl('/api/storage');
        console.log('Saving data to cloud storage API...', apiUrl);
        const res = await fetch(apiUrl, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            const errorMessage = errorData.details || errorData.message || `HTTP ${res.status}`;
            console.error('Failed to save data to cloud storage:', res.status, errorMessage);
            throw new Error(errorMessage);
        }
        const result = await res.json();
        console.log('Data successfully saved to cloud storage:', result.url);
        return result;
    } catch (error: any) {
        console.error('Failed to save data to cloud:', error);
        throw error;
    }
};
