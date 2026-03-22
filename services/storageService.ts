
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

export const loadDataFromCloud = async (): Promise<{ data: AppData | null, method: string }> => {
    try {
        const res = await fetch('/api/storage');
        const storageMethod = res.headers.get('X-Storage-Method') || 'unknown';
        console.log(`Fetching data from cloud storage API (Method: ${storageMethod})...`);
        if (!res.ok) {
            const errorText = await res.text();
            console.warn('API route error:', res.status, errorText);
            return { data: null, method: storageMethod };
        }
        const data = await res.json();
        if (data) {
            console.log('Data successfully loaded from cloud storage.');
        } else {
            console.log('Cloud storage is empty (new database).');
        }
        return { data, method: storageMethod };
    } catch (error: any) {
        console.error('Failed to load data from cloud:', error);
        return { data: null, method: 'error' };
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
            let errorDetails = '';
            try {
                const errorJson = await res.json();
                errorDetails = errorJson.message || errorJson.error || '';
            } catch (_e) {
                errorDetails = await res.text();
            }
            console.error('Failed to save data to cloud storage:', res.status, errorDetails);
            throw new Error(`Save failed (${res.status}): ${errorDetails}`);
        }
        const result = await res.json();
        console.log('Data successfully saved to cloud storage:', result.url);
        return result;
    } catch (error) {
        console.error('Failed to save data to cloud:', error);
        throw error;
    }
};
