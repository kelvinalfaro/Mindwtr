import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { deriveDateLists, tFallback, useTaskStore, type DateListKey, type Task } from '@mindwtr/core';

import { SwipeableTaskItem, type TaskRowActions } from '@/components/swipeable-task-item';
import { TaskEditModal } from '@/components/task-edit-modal';
import { useLocalDayKey } from '@/hooks/use-local-day-key';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useVisibleTaskContext } from '@/hooks/use-visible-tasks';
import { openContextsScreen, openProjectScreen } from '@/lib/task-meta-navigation';
import { useLanguage } from '../../../contexts/language-context';
import { useTheme } from '../../../contexts/theme-context';

type DateListRow = { kind: 'task'; task: Task } | { kind: 'overdue'; count: number };

export default function DateListScreen() {
  const { period } = useLocalSearchParams<{ period: string }>();
  const selectedPeriod: DateListKey = period === 'tomorrow' || period === 'nextSevenDays' ? period : 'today';
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const tc = useThemeColors();
  const insets = useSafeAreaInsets();
  const dayKey = useLocalDayKey();
  const { visibleTasks } = useVisibleTaskContext();
  const updateTask = useTaskStore((state) => state.updateTask);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showOverdue, setShowOverdue] = useState(false);
  const lists = useMemo(() => {
    void dayKey;
    return deriveDateLists(visibleTasks, new Date());
  }, [visibleTasks, dayKey]);
  const title = selectedPeriod === 'today'
    ? tFallback(t, 'focus.schedule', 'Today')
    : selectedPeriod === 'tomorrow'
      ? tFallback(t, 'quickDate.tomorrow', 'Tomorrow')
      : tFallback(t, 'dateLists.nextSevenDays', 'Next 7 Days');
  const overdueTitle = tFallback(t, 'agenda.overdue', 'Overdue');

  useLayoutEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  const rows = useMemo<DateListRow[]>(() => [
    ...lists[selectedPeriod].map((task): DateListRow => ({ kind: 'task', task })),
    ...(selectedPeriod === 'today' && lists.overdue.length > 0
      ? [
        { kind: 'overdue' as const, count: lists.overdue.length },
        ...(showOverdue ? lists.overdue.map((task): DateListRow => ({ kind: 'task', task })) : []),
      ]
      : []),
  ], [lists, selectedPeriod, showOverdue]);
  const actions = useMemo<TaskRowActions>(() => ({
    edit: setEditingTask,
    changeStatus: (task, status) => updateTask(task.id, { status }),
    remove: (task) => deleteTask(task.id),
  }), [updateTask, deleteTask]);
  const onSave = useCallback((id: string, changes: Partial<Task>) => updateTask(id, changes), [updateTask]);

  return (
    <View style={[styles.container, { backgroundColor: tc.bg }]}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.kind === 'overdue' ? 'overdue' : item.task.id}
        contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}
        ListHeaderComponent={
          <Text style={[styles.heading, { color: tc.text }]}>{title} ({lists[selectedPeriod].length})</Text>
        }
        ListEmptyComponent={
          <Text style={[styles.empty, { color: tc.secondaryText }]}>
            {tFallback(t, 'list.noTasks', 'No tasks found')}
          </Text>
        }
        renderItem={({ item }) => item.kind === 'overdue' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${overdueTitle} (${item.count})`}
            accessibilityState={{ expanded: showOverdue }}
            onPress={() => setShowOverdue((value) => !value)}
            style={styles.overdueHeader}
          >
            <Text style={[styles.overdueText, { color: tc.text }]}>
              {showOverdue ? '▾' : '▸'} {overdueTitle} ({item.count})
            </Text>
          </Pressable>
        ) : (
          <SwipeableTaskItem
            task={item.task}
            isDark={isDark}
            tc={tc}
            actions={actions}
            onProjectPress={openProjectScreen}
            onContextPress={openContextsScreen}
            onTagPress={openContextsScreen}
          />
        )}
      />
      <TaskEditModal
        visible={editingTask !== null}
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onSave={onSave}
        onProjectNavigate={openProjectScreen}
        onContextNavigate={openContextsScreen}
        onTagNavigate={openContextsScreen}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 12 },
  heading: { fontSize: 20, fontWeight: '700', paddingVertical: 16 },
  empty: { paddingVertical: 16 },
  overdueHeader: { paddingHorizontal: 8, paddingVertical: 18 },
  overdueText: { fontSize: 16, fontWeight: '600' },
});
