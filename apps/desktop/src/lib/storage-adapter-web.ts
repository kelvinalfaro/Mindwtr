import { AppData, StorageAdapter } from '@mindwtr/core';
import { reportError } from './report-error';

const DATA_KEY = 'mindwtr-data';
const DATABASE_NAME = 'mindwtr-web';
const STORE_NAME = 'app-data';

const emptyData = (): AppData => ({ tasks: [], projects: [], sections: [], areas: [], settings: {} });

const parseData = (jsonValue: string): AppData => {
    const data = JSON.parse(jsonValue) as AppData;
    if (!Array.isArray(data.tasks) || !Array.isArray(data.projects)) {
        throw new Error('Invalid data format');
    }
    data.areas = Array.isArray(data.areas) ? data.areas : [];
    data.sections = Array.isArray(data.sections) ? data.sections : [];
    return data;
};

const openDatabase = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Browser data upgrade is blocked by another tab. Close other Mindwtr tabs and retry.'));
});

const readIndexedData = async (): Promise<string | undefined> => {
    const database = await openDatabase();
    try {
        return await new Promise<string | undefined>((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, 'readonly');
            const request = transaction.objectStore(STORE_NAME).get(DATA_KEY);
            let value: string | undefined;
            request.onsuccess = () => { value = request.result as string | undefined; };
            transaction.oncomplete = () => resolve(value);
            transaction.onabort = () => reject(transaction.error ?? new Error('Browser data read was aborted.'));
            transaction.onerror = () => reject(transaction.error);
        });
    } finally {
        database.close();
    }
};

const writeIndexedData = async (jsonValue: string): Promise<void> => {
    const database = await openDatabase();
    try {
        await new Promise<void>((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, 'readwrite');
            transaction.objectStore(STORE_NAME).put(jsonValue, DATA_KEY);
            transaction.oncomplete = () => resolve();
            transaction.onabort = () => reject(transaction.error ?? new Error('Browser data write was aborted.'));
            transaction.onerror = () => reject(transaction.error);
        });
    } finally {
        database.close();
    }
};

export const webStorage: StorageAdapter = {
    getData: async (): Promise<AppData> => {
        if (typeof window === 'undefined') return emptyData();
        try {
            // Keep legacy data until its IndexedDB replacement has committed.
            const legacyValue = localStorage.getItem(DATA_KEY);
            if (legacyValue != null) {
                const data = parseData(legacyValue);
                if (typeof indexedDB !== 'undefined') {
                    await writeIndexedData(legacyValue);
                    localStorage.removeItem(DATA_KEY);
                }
                return data;
            }
            if (typeof indexedDB === 'undefined') return emptyData();
            const jsonValue = await readIndexedData();
            return jsonValue == null ? emptyData() : parseData(jsonValue);
        } catch (error) {
            reportError('Failed to load local data', error);
            throw new Error('Could not load browser data. Your existing data was not removed.');
        }
    },
    saveData: async (data: AppData): Promise<void> => {
        if (typeof window === 'undefined') return;
        try {
            const jsonValue = JSON.stringify(data);
            if (typeof indexedDB === 'undefined') {
                localStorage.setItem(DATA_KEY, jsonValue);
            } else {
                await writeIndexedData(jsonValue);
                localStorage.removeItem(DATA_KEY);
            }
        } catch (error) {
            reportError('Failed to save local data', error);
            throw new Error('Failed to save browser data.');
        }
    },
};
