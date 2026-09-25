// Habit Tracker — Expo app
//
// The React Native port of the web habit tracker. Same data layer
// (../src/lib/habitQueries.ts and ../src/lib/supabaseClient.ts), same Tailwind
// class names via NativeWind, one platform branch (src/lib/share.ts).
import './global.css'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { App } from './src/navigation'

export default function Root() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <App />
    </SafeAreaProvider>
  )
}
