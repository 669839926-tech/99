
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
}

export const loadData = async (): Promise<AppData | null> => {
    try {
        console.log('Fetching data from local storage API...');
        const res = await fetch('/api/storage');
        if (!res.ok) {
            const errorText = await res.text();
            console.warn('API route error:', res.status, errorText);
            return null;
        }
        const data = await res.json();
        if (data) {
            console.log('Data successfully loaded from local storage.');
        } else {
            console.log('Local storage is empty (new database).');
        }
        return data;
    } catch (error) {
        console.error('Failed to load data from local storage:', error);
        return null;
    }
};

export const saveData = async (data: AppData) => {
    try {
        console.log('Saving data to local storage API...');
        const res = await fetch('/api/storage', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) {
            const errorText = await res.text();
            console.error('Failed to save data to local storage:', res.status, errorText);
            throw new Error(`Save failed: ${res.status} ${errorText}`);
        }
        const result = await res.json();
        console.log('Data successfully saved to local storage.');
        return result;
    } catch (error) {
        console.error('Failed to save data to local storage:', error);
        throw error;
    }
};
