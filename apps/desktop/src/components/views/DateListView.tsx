import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { deriveDateLists, tFallback, type DateListKey, type Task } from '@mindwtr/core';
import { useLocalDayKey } from '../../hooks/useLocalDayKey';
import { useLanguage } from '../../contexts/language-context';
import { useVisibleTaskContext } from '../../hooks/useVisibleTaskContext';
import { AgendaTaskList } from './AgendaView';

function DateSection({ title, tasks, emptyText }: { title: string; tasks: Task[]; emptyText: string }) {
    return (
        <section className="space-y-2" aria-label={title}>
            <h2 className="text-lg font-semibold">{title} <span className="text-sm font-normal text-muted-foreground">({tasks.length})</span></h2>
            {tasks.length > 0
                ? <AgendaTaskList tasks={tasks} showListDetails highlightTaskId={null} />
                : <p className="text-sm text-muted-foreground">{emptyText}</p>}
        </section>
    );
}

export function DateListView({ period }: { period: DateListKey }) {
    const { t } = useLanguage();
    const { visibleTasks } = useVisibleTaskContext();
    const dayKey = useLocalDayKey();
    const lists = useMemo(() => deriveDateLists(visibleTasks, new Date()), [visibleTasks, dayKey]);
    const [showOverdue, setShowOverdue] = useState(false);
    const selected = lists[period];
    const labels: Record<DateListKey, string> = {
        today: tFallback(t, 'focus.schedule', 'Today'),
        tomorrow: tFallback(t, 'quickDate.tomorrow', 'Tomorrow'),
        nextSevenDays: tFallback(t, 'dateLists.nextSevenDays', 'Next 7 Days'),
    };
    const overdueLabel = tFallback(t, 'agenda.overdue', 'Overdue');

    return (
        <div className="w-full space-y-6 pb-12" data-list-end>
            <header>
                <h1 className="text-2xl font-bold">{labels[period]}</h1>
            </header>
            <DateSection title={labels[period]} tasks={selected} emptyText={tFallback(t, 'list.noTasks', 'No tasks found')} />
            {period === 'today' && lists.overdue.length > 0 && (
                <section aria-label={overdueLabel}>
                    <button
                        type="button"
                        aria-expanded={showOverdue}
                        aria-controls="date-list-overdue"
                        onClick={() => setShowOverdue((current) => !current)}
                        className="flex w-full items-center gap-2 rounded-md py-2 text-left text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                        {showOverdue ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        {overdueLabel} <span className="text-sm font-normal text-muted-foreground">({lists.overdue.length})</span>
                    </button>
                    {showOverdue && <div id="date-list-overdue"><AgendaTaskList tasks={lists.overdue} showListDetails highlightTaskId={null} /></div>}
                </section>
            )}
        </div>
    );
}
