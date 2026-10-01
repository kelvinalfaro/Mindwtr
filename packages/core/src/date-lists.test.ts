import { describe, expect, it } from 'vitest';
import { deriveDateLists } from './date-lists';
import type { Task } from './types';

const now = new Date(2026, 8, 30, 10);
const task = (id: string, fields: Partial<Task> = {}): Task => ({
    id, title: id, status: 'next', tags: [], contexts: [],
    createdAt: '2026-09-01T10:00:00', updatedAt: '2026-09-01T10:00:00',
    ...fields,
});
const ids = (tasks: Task[]) => tasks.map((item) => item.id);

describe('deriveDateLists', () => {
    it('separates overdue from today and keeps future lists tied to local calendar days', () => {
        const result = deriveDateLists([
            task('old', { dueDate: '2026-09-28' }),
            task('today', { dueDate: '2026-09-30' }),
            task('starting', { startTime: '2026-09-30T15:00:00' }),
            task('tomorrow', { dueDate: '2026-10-01' }),
            task('sixth-day', { dueDate: '2026-10-06' }),
            task('outside', { dueDate: '2026-10-07' }),
            task('inactive', { dueDate: '2026-09-30', status: 'done' }),
        ], now);
        expect(ids(result.today)).toEqual(['starting', 'today']);
        expect(ids(result.overdue)).toEqual(['old']);
        expect(ids(result.tomorrow)).toEqual(['tomorrow']);
        expect(ids(result.nextSevenDays)).toEqual(['starting', 'today', 'tomorrow', 'sixth-day']);
    });

    it('defers an overdue task with a future start and never repeats a task within one list', () => {
        const result = deriveDateLists([
            task('deferred', { dueDate: '2026-09-20', startTime: '2026-10-01T09:00:00' }),
            task('both', { dueDate: '2026-09-30', startTime: '2026-09-30T09:00:00' }),
        ], now);
        expect(ids(result.today)).toEqual(['both']);
        expect(result.overdue).toEqual([]);
        expect(ids(result.tomorrow)).toEqual(['deferred']);
        expect(ids(result.nextSevenDays)).toEqual(['deferred', 'both']);
    });
});
