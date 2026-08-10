
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
    return relativePath;
};

export const loadDataFromCloud = async (retries = 3): Promise<AppData | null> => {
    let lastError: any = null;
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const apiUrl = getApiUrl('/api/storage');
            console.log(`Fetching data from cloud storage API (attempt ${attempt + 1}/${retries})...`, apiUrl);
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
            lastError = error;
            console.warn(`Load attempt ${attempt + 1} failed:`, error);
            if (attempt < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, 600 * (attempt + 1)));
            }
        }
    }
    console.error('Failed to load data from cloud after retries:', lastError);
    throw lastError;
};

export const saveDataToCloud = async (data: AppData, retries = 2): Promise<any> => {
    let lastError: any = null;
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const apiUrl = getApiUrl('/api/storage');
            console.log(`Saving data to cloud storage API (attempt ${attempt + 1}/${retries})...`, apiUrl);
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
            lastError = error;
            console.warn(`Save attempt ${attempt + 1} failed:`, error);
            if (attempt < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, 800 * (attempt + 1)));
            }
        }
    }
    console.error('Failed to save data to cloud after retries:', lastError);
    throw lastError;
};
