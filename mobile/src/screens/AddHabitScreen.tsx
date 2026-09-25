// mobile/src/screens/AddHabitScreen.tsx
// Destination for the List -> Add navigation. Same form, same classes, same
// addHabit call as the web app's Section 3.
import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useHabitsContext } from '../context/HabitsContext'
import type { RootStackParamList } from '../navigation'

type Props = NativeStackScreenProps<RootStackParamList, 'AddHabit'>

export function AddHabitScreen({ navigation }: Props) {
  // The same instance the list reads, so a habit added here is already there
  // when we navigate back.
  const { addHabit, adding } = useHabitsContext()

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('Give the habit a title.')
      return
    }
    setError(null)

    const { error: addError } = await addHabit({
      title: trimmedTitle,
      category: category.trim() || 'General',
    })

    if (addError) {
      setError(addError)
      return
    }
    navigation.goBack()
  }

  const inputClass =
    'rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900'

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-100"
    >
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Text className="mb-3 text-lg font-semibold text-slate-900">Add a habit</Text>

        {error ? (
          <View className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5">
            <Text className="text-sm text-red-700">{error}</Text>
          </View>
        ) : null}

        <View className="gap-3">
          <View className="gap-1.5">
            <Text className="text-sm font-medium text-slate-700">Title</Text>
            <TextInput
              className={inputClass}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Exercise, Read, Meditate"
              placeholderTextColor="#94a3b8"
              autoFocus
              returnKeyType="next"
            />
          </View>

          <View className="gap-1.5">
            <Text className="text-sm font-medium text-slate-700">Category</Text>
            <TextInput
              className={inputClass}
              value={category}
              onChangeText={setCategory}
              placeholder="General"
              placeholderTextColor="#94a3b8"
              returnKeyType="go"
              onSubmitEditing={() => void handleAdd()}
            />
          </View>
        </View>

        <Pressable
          onPress={() => void handleAdd()}
          disabled={adding}
          accessibilityRole="button"
          className="mt-4 items-center rounded-lg bg-indigo-600 py-3 active:bg-indigo-500 disabled:opacity-60"
        >
          {adding ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-base font-medium text-white">Add habit</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
