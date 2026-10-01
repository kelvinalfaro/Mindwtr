import React from 'react';
import { FlatList, Pressable } from 'react-native';
import { act, create } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import type { Task } from '@mindwtr/core';
import DateListScreen from '../app/(drawer)/date-list/[period]';

const mock = vi.hoisted(() => ({
  visibleTasks: [] as Task[],
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  setOptions: vi.fn(),
}));

vi.mock('@mindwtr/core', async (importOriginal) => {
  const { mockCore } = await import('../test-support/mock-core');
  return mockCore(importOriginal, () => ({ updateTask: mock.updateTask, deleteTask: mock.deleteTask }));
});
vi.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ period: 'today' }),
  useNavigation: () => ({ setOptions: mock.setOptions }),
}));
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ bottom: 0 }) }));
vi.mock('@/hooks/use-local-day-key', () => ({ useLocalDayKey: () => 'today' }));
vi.mock('@/hooks/use-visible-tasks', () => ({ useVisibleTaskContext: () => ({ visibleTasks: mock.visibleTasks }) }));
vi.mock('@/hooks/use-theme-colors', () => ({
  useThemeColors: () => ({ bg: '#000', text: '#fff', secondaryText: '#aaa' }),
}));
vi.mock('../contexts/theme-context', () => ({ useTheme: () => ({ isDark: true }) }));
vi.mock('../contexts/language-context', () => ({
  useLanguage: () => ({ t: (key: string) => ({ 'focus.schedule': 'Today', 'agenda.overdue': 'Overdue' }[key] ?? key) }),
}));
vi.mock('@/components/swipeable-task-item', () => ({
  SwipeableTaskItem: (props: object) => React.createElement('SwipeableTaskItem', props),
}));
vi.mock('@/components/task-edit-modal', () => ({
  TaskEditModal: (props: object) => React.createElement('TaskEditModal', props),
}));
vi.mock('@/lib/task-meta-navigation', () => ({ openContextsScreen: vi.fn(), openProjectScreen: vi.fn() }));

describe('mobile Today list', () => {
  it('starts with current-day tasks and a collapsed overdue section', () => {
    const today = new Date();
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    mock.visibleTasks = [
      { id: 'today', title: 'Today', status: 'next', dueDate: localDate(today) } as Task,
      { id: 'late', title: 'Late', status: 'next', dueDate: localDate(yesterday) } as Task,
    ];
    let tree!: ReturnType<typeof create>;
    act(() => { tree = create(<DateListScreen />); });
    const list = () => tree.root.findByType(FlatList);
    expect(list().props.data.map((row: { kind: string; task?: Task }) => row.task?.id ?? row.kind))
      .toEqual(['today', 'overdue']);
    const overdueRow = list().props.renderItem({ item: list().props.data[1] });
    expect(overdueRow.type).toBe(Pressable);
    expect(overdueRow.props.accessibilityState).toEqual({ expanded: false });
    act(() => { overdueRow.props.onPress(); });
    expect(list().props.data.map((row: { kind: string; task?: Task }) => row.task?.id ?? row.kind))
      .toEqual(['today', 'overdue', 'late']);
  });
});
