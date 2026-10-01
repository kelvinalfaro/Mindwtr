import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTaskStore, type Task } from '@mindwtr/core';
import { LanguageProvider } from '../../contexts/language-context';
import { DateListView } from './DateListView';

vi.mock('./AgendaView', () => ({
    AgendaTaskList: ({ tasks }: { tasks: Task[] }) => <div>{tasks.map((task) => <p key={task.id}>{task.title}</p>)}</div>,
}));

const localDay = (offset: number): string => {
    const now = new Date();
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
};
const task = (id: string, dueDate: string): Task => ({
    id, title: id, status: 'next', dueDate, tags: [], contexts: [],
    createdAt: '2026-01-01T00:00:00', updatedAt: '2026-01-01T00:00:00',
});

describe('DateListView', () => {
    beforeEach(() => {
        const tasks = [task('Today item', localDay(0)), task('Overdue item', localDay(-1))];
        useTaskStore.setState({ tasks, _allTasks: tasks, projects: [], _allProjects: [], areas: [], _allAreas: [], settings: {} });
    });

    it('starts with overdue collapsed and reveals it without hiding today', () => {
        render(<LanguageProvider><DateListView period="today" /></LanguageProvider>);
        expect(screen.getByText('Today item')).toBeInTheDocument();
        expect(screen.queryByText('Overdue item')).not.toBeInTheDocument();
        const overdue = screen.getByRole('button', { name: /Overdue/ });
        expect(overdue).toHaveAttribute('aria-expanded', 'false');
        fireEvent.click(overdue);
        expect(overdue).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText('Today item')).toBeInTheDocument();
        expect(screen.getByText('Overdue item')).toBeInTheDocument();
    });
});
