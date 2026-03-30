import { db, doc, getDoc, setDoc } from '../firebase';

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
    financeCategories?: any[];
    techTests?: any[];
    salarySettings?: any;
    periodizationPlans?: any[];
    accountingRecords?: any[];
}

export const loadDataFromCloud = async (userId?: string): Promise<AppData | null> => {
    if (!userId) {
        console.log('No userId provided to loadDataFromCloud.');
        return null;
    }
    try {
        console.log('Fetching data from Firestore for user:', userId);
        const docRef = doc(db, 'appData', userId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            console.log('Data successfully loaded from Firestore.');
            return docSnap.data() as AppData;
        } else {
            console.log('No data found in Firestore for this user.');
            return null;
        }
    } catch (error) {
        console.error('Failed to load data from Firestore:', error);
        return null;
    }
};

export const saveDataToCloud = async (userId: string | undefined, data: AppData) => {
    const uid = userId || 'anonymous';
    try {
        console.log('Saving data to Firestore for user:', uid);
        const docRef = doc(db, 'appData', uid);
        await setDoc(docRef, {
            ...data,
            lastUpdated: new Date().toISOString()
        }, { merge: true });
        console.log('Data successfully saved to Firestore.');
        return { success: true };
    } catch (error) {
        console.error('Failed to save data to Firestore:', error);
        throw error;
    }
};
