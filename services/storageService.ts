
export interface AppData {
    players: any[];
    teams: any[];
    matches: any[];
    trainings: any[];
    attributeConfig: any;
    announcements: any[];
    appLogo?: string;
    users?: any[]; // Added users field for persistence
}

export const loadDataFromCloud = async (): Promise<AppData | null> => {
    try {
        const res = await fetch('/api/storage');
        if (!res.ok) {
            console.warn('API route not found or error. Are you running via "vercel dev"?');
            return null;
        }
        const data = await res.json();
        return data;
    } catch (error) {
        console.error('Failed to load data from cloud:', error);
        return null;
    }
};

export const saveDataToCloud = async (data: AppData) => {
    try {
        const res = await fetch('/api/storage', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) {
            throw new Error('Save failed');
        }
        return await res.json();
    } catch (error) {
        console.error('Failed to save data to cloud:', error);
        throw error;
    }
};
