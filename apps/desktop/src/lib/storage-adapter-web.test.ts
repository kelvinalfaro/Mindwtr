import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppData } from '@mindwtr/core';
import { webStorage } from './storage-adapter-web';

const DATA_KEY = 'mindwtr-data';
const emptyData = (): AppData => ({ tasks: [], projects: [], sections: [], areas: [], settings: {} });

const deleteDatabase = (): Promise<void> => new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase('mindwtr-web');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
});

describe('webStorage', () => {
    beforeEach(async () => {
        vi.restoreAllMocks();
        localStorage.clear();
        await deleteDatabase();
    });

    it('stores data larger than localStorage allows and reads it back', async () => {
        const data = emptyData();
        data.settings = { largeValue: 'x'.repeat(9_000_000) } as AppData['settings'];
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota exceeded'); });

        await webStorage.saveData(data);

        expect(localStorage.getItem(DATA_KEY)).toBeNull();
        expect(await webStorage.getData()).toEqual(data);
    });

    it('migrates legacy browser data before removing the old copy', async () => {
        const data = emptyData();
        data.settings = { theme: 'dark' } as AppData['settings'];
        localStorage.setItem(DATA_KEY, JSON.stringify(data));

        expect(await webStorage.getData()).toEqual(data);
        expect(localStorage.getItem(DATA_KEY)).toBeNull();
        expect(await webStorage.getData()).toEqual(data);
    });

    it('keeps corrupt legacy data for recovery', async () => {
        localStorage.setItem(DATA_KEY, '{invalid');

        await expect(webStorage.getData()).rejects.toThrow('Could not load browser data');
        expect(localStorage.getItem(DATA_KEY)).toBe('{invalid');
    });
});
