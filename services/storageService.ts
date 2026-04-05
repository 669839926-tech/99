
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
    matchPlans?: any[];
}

export const loadDataFromCloud = async (): Promise<AppData | null> => {
    try {
        console.log('Fetching data from cloud storage API...');
        const res = await fetch('/api/storage');
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
        console.log('Saving data to cloud storage API...');
        const res = await fetch('/api/storage', {
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
