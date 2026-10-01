import { safeParseDate, safeParseDueDate } from './date';
import type { Task } from './types';

export type DateListKey = 'today' | 'tomorrow' | 'nextSevenDays';

export interface DateLists {
    today: Task[];
    overdue: Task[];
    tomorrow: Task[];
    nextSevenDays: Task[];
}

const isOpenTask = (task: Task): boolean => (
    !task.deletedAt
    && task.status !== 'done'
    && task.status !== 'archived'
    && task.status !== 'reference'
);

const dayStart = (date: Date, offset: number): number => (
    new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset).getTime()
);

/** Calendar lists use the user's local day and never mutate task dates or statuses. */
export function deriveDateLists(tasks: readonly Task[], now: Date): DateLists {
    const todayStart = dayStart(now, 0);
    const tomorrowStart = dayStart(now, 1);
    const dayAfterTomorrowStart = dayStart(now, 2);
    const afterSevenDays = dayStart(now, 7);
    const lists: DateLists = { today: [], overdue: [], tomorrow: [], nextSevenDays: [] };

    for (const task of tasks) {
        if (!isOpenTask(task)) continue;
        const due = safeParseDueDate(task.dueDate)?.getTime();
        const start = safeParseDate(task.startTime)?.getTime();
        // A future start keeps an old due date out of Overdue until that task
        // becomes available, matching Focus's deferred-task behavior.
        if (start !== undefined && start >= tomorrowStart) {
            if (start < dayAfterTomorrowStart) lists.tomorrow.push(task);
            if (start < afterSevenDays) lists.nextSevenDays.push(task);
            continue;
        }
        const dueToday = due !== undefined && due >= todayStart && due < tomorrowStart;
        const startsToday = start !== undefined && start >= todayStart && start < tomorrowStart;
        if (dueToday || startsToday) lists.today.push(task);
        else if (due !== undefined && due < todayStart) lists.overdue.push(task);

        const dueTomorrow = due !== undefined && due >= tomorrowStart && due < dayAfterTomorrowStart;
        if (dueTomorrow) lists.tomorrow.push(task);
        if ((due !== undefined && due >= todayStart && due < afterSevenDays)
            || (start !== undefined && start >= todayStart && start < afterSevenDays)) {
            lists.nextSevenDays.push(task);
        }
    }

    const scheduleTime = (task: Task): number => {
        const due = safeParseDueDate(task.dueDate)?.getTime();
        const start = safeParseDate(task.startTime)?.getTime();
        return Math.min(due ?? Number.POSITIVE_INFINITY, start ?? Number.POSITIVE_INFINITY);
    };
    const bySchedule = (a: Task, b: Task) => scheduleTime(a) - scheduleTime(b) || a.id.localeCompare(b.id);
    lists.today.sort(bySchedule);
    lists.tomorrow.sort(bySchedule);
    lists.nextSevenDays.sort(bySchedule);
    lists.overdue.sort((a, b) => scheduleTime(b) - scheduleTime(a) || a.id.localeCompare(b.id));
    return lists;
}
