import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { DefaultTheme, DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';

import "../global.css";
import { useColorScheme } from '@/components/useColorScheme';
import FivifySplash from '@/components/FivifySplash';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

/**
 * Fivify-themed navigation colors — warm scholarly palette.
 */
const FivifyLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#3D4148',
    background: '#F5F0E8',
    card: '#F5F0E8',
    text: '#3D4148',
    border: '#D4C5AE',
    notification: '#C4B19A',
  },
};

const FivifyDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#C4B19A',
    background: '#1C1B19',
    card: '#1C1B19',
    text: '#F5F0E8',
    border: '#3D4148',
    notification: '#C4B19A',
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
    ...MaterialCommunityIcons.font,
  });

  const [showSplash, setShowSplash] = useState(true);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // NOTE: We intentionally do NOT call SplashScreen.hideAsync() here.
  // FivifySplash handles that after it mounts at full opacity, so there's
  // no frame where the capture screen peeks through.

  if (!loaded) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <RootLayoutNav />
      {showSplash && (
        <FivifySplash onFinished={() => setShowSplash(false)} />
      )}
    </View>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? FivifyDarkTheme : FivifyLightTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="formula/[id]" options={{ headerShown: true }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
