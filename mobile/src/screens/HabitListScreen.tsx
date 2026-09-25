// mobile/src/screens/HabitListScreen.tsx
//
// The ported habit list. FlatList rather than a ScrollView of mapped rows: a
// habit list is unbounded, and FlatList recycles rows so memory stays flat while
// the web version's <ul> would mount every row at once. The class strings are
// the web app's, unchanged — that is what NativeWind is for.
import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useAuth } from '../hooks/useAuth'
import { useHabitsContext } from '../context/HabitsContext'
import { shareHabitLink, type ShareOutcome } from '../lib/share'
import type { RootStackParamList } from '../navigation'
import type { Habit } from '../../../src/lib/habitQueries'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Habits'>

export function HabitListScreen() {
  const { user, signOut } = useAuth()
  const navigation = useNavigation<Nav>()
  const [shareNote, setShareNote] = useState<ShareOutcome | null>(null)

  const {
    habits,
    completedIds,
    loading,
    loadError,
    pendingId,
    reload,
    toggleHabit,
    deleteHabit,
  } = useHabitsContext()

  const handleShare = useCallback(async () => {
    // The only call site of the platform branch.
    const outcome = await shareHabitLink({
      title: 'Habit Tracker',
      message: 'Track your daily habits with me',
      url: 'https://github.com/chuotchuonchetra/habit-tracker',
    })
    setShareNote(outcome)
    if (outcome !== 'shared') setTimeout(() => setShareNote(null), 2000)
  }, [])

  const handleDelete = useCallback(
    (habit: Habit) => {
      // window.confirm has no native equivalent; Alert.alert is the platform's
      // own confirm dialog. A second divergence that is unavoidable, not a bug.
      Alert.alert('Delete habit', `Delete "${habit.title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void deleteHabit(habit.id),
        },
      ])
    },
    [deleteHabit],
  )

  const renderItem = useCallback(
    ({ item }: { item: Habit }) => {
      const done = completedIds.has(item.id)
      const busy = pendingId === item.id

      return (
        <View className="mb-3 flex-row items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <Pressable
            onPress={() => void toggleHabit(item)}
            disabled={busy}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: done, disabled: busy }}
            accessibilityLabel={`Mark ${item.title} ${done ? 'incomplete' : 'complete for today'}`}
            className={`h-7 w-7 items-center justify-center rounded-full border-2 ${
              done ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
            } disabled:opacity-60`}
          >
            <Text className={`text-sm font-bold ${done ? 'text-white' : 'text-transparent'}`}>
              ✓
            </Text>
          </Pressable>

          <View className="flex-1">
            <Text
              numberOfLines={1}
              className={`text-base font-medium ${done ? 'text-slate-400 line-through' : 'text-slate-900'}`}
            >
              {item.title}
            </Text>
            {item.category ? (
              <View className="mt-0.5 self-start rounded-full bg-slate-100 px-2 py-0.5">
                <Text className="text-xs font-medium text-slate-600">{item.category}</Text>
              </View>
            ) : null}
          </View>

          <Pressable
            onPress={() => handleDelete(item)}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${item.title}`}
            className="rounded-lg border border-red-200 px-3 py-1.5 active:bg-red-50 disabled:opacity-60"
          >
            <Text className="text-sm font-medium text-red-600">Delete</Text>
          </Pressable>
        </View>
      )
    },
    [completedIds, pendingId, toggleHabit, handleDelete],
  )

  return (
    <View className="flex-1 bg-slate-100">
      <View className="border-b border-slate-200 bg-white px-4 pb-4 pt-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-slate-900">Habit Tracker</Text>
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => void handleShare()}
              accessibilityRole="button"
              accessibilityLabel="Share this app"
              className="rounded-lg border border-slate-300 px-3 py-1.5 active:bg-slate-50"
            >
              <Text className="text-sm font-medium text-slate-700">Share</Text>
            </Pressable>
            <Pressable
              onPress={() => void signOut()}
              accessibilityRole="button"
              className="rounded-lg border border-slate-300 px-3 py-1.5 active:bg-slate-50"
            >
              <Text className="text-sm font-medium text-slate-700">Sign out</Text>
            </Pressable>
          </View>
        </View>
        <Text numberOfLines={1} className="mt-1 text-sm text-slate-500">
          {user?.email}
        </Text>
        {shareNote ? (
          <Text className="mt-1 text-xs text-slate-500">
            {shareNote === 'dismissed'
              ? 'Share cancelled'
              : shareNote === 'unavailable'
                ? 'Sharing is not available on this device'
                : 'Shared'}
          </Text>
        ) : null}
      </View>

      <FlatList
        data={habits}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        refreshControl={
          <RefreshControl
            refreshing={loading && habits.length > 0}
            onRefresh={reload}
            tintColor="#4f46e5"
          />
        }
        ListEmptyComponent={
          loading ? (
            <View className="items-center py-16">
              <ActivityIndicator color="#4f46e5" />
            </View>
          ) : loadError ? (
            <View className="rounded-xl border border-red-200 bg-red-50 px-4 py-4">
              <Text className="text-sm text-red-700">{loadError}</Text>
              <Pressable onPress={reload} accessibilityRole="button" className="mt-2">
                <Text className="text-sm font-medium text-red-700 underline">Retry</Text>
              </Pressable>
            </View>
          ) : (
            <Text className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-16 text-center text-slate-500">
              No habits yet. Add your first one.
            </Text>
          )
        }
      />

      <View className="absolute inset-x-0 bottom-0 p-4">
        <Pressable
          onPress={() => navigation.navigate('AddHabit')}
          accessibilityRole="button"
          accessibilityLabel="Add a habit"
          className="items-center rounded-lg bg-indigo-600 py-3.5 active:bg-indigo-500"
        >
          <Text className="text-base font-medium text-white">Add habit</Text>
        </Pressable>
      </View>
    </View>
  )
}
