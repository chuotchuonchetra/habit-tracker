// mobile/src/navigation.tsx
//
// The List -> Add navigation the brief asks for, plus the auth gate.
//
// react-router's <Routes>/<Outlet>/<Navigate> map onto a native stack here:
// a stack navigator owns the screen history (so the hardware back gesture and
// the Add screen's goBack() work), and the auth gate is a conditional swap of
// whole navigators rather than a <Navigate> redirect, because a native stack
// cannot render "redirect to /login" — there is no URL to redirect away from.
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ActivityIndicator, View } from 'react-native'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { HabitsProvider } from './context/HabitsContext'
import { SignInScreen } from './screens/SignInScreen'
import { HabitListScreen } from './screens/HabitListScreen'
import { AddHabitScreen } from './screens/AddHabitScreen'

export type RootStackParamList = {
  Habits: undefined
  AddHabit: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

function Booting() {
  return (
    <View className="flex-1 items-center justify-center bg-slate-100">
      <ActivityIndicator color="#4f46e5" size="large" />
    </View>
  )
}

function HabitsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Habits" component={HabitListScreen} options={{ title: '' }} />
      <Stack.Screen
        name="AddHabit"
        component={AddHabitScreen}
        options={{ title: 'Add a habit' }}
      />
    </Stack.Navigator>
  )
}

function Root() {
  const { session, loading } = useAuth()

  if (loading) return <Booting />
  if (!session) return <SignInScreen />

  return (
    <HabitsProvider userId={session.user.id}>
      <HabitsStack />
    </HabitsProvider>
  )
}

export function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Root />
      </NavigationContainer>
    </AuthProvider>
  )
}
