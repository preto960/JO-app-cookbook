// src/navigation/AppNavigator.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useDebug } from '../context/DebugContext';
import { RADIUS } from '../constants/theme';
import { registerDebugBridge } from '../services/api';

import ThemeToggle    from '../components/ThemeToggle';
import HeaderAvatar   from '../components/HeaderAvatar';
import ToastContainer from '../components/ToastContainer';
import DebugPanel     from '../components/DebugPanel';

import LoginScreen     from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ProfileScreen   from '../screens/ProfileScreen';
import SettingsScreen  from '../screens/SettingsScreen';

// ─── Tab icon ─────────────────────────────────────────────────────────────────
function TabIcon({
  name, focused, color, primaryDim,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  focused: boolean; color: string; primaryDim: string;
}) {
  return (
    <View style={[styles.tabIcon, focused && { backgroundColor: primaryDim }]}>
      <Ionicons name={name} size={20} color={color} />
    </View>
  );
}

// ─── Header right ─────────────────────────────────────────────────────────────
function HeaderRight({ onDebug }: { onDebug: () => void }) {
  const { isSuperAdmin } = useAuth();
  const { colors } = useTheme();

  return (
    <View style={styles.headerRight}>
      {isSuperAdmin && (
        <TouchableOpacity
          onPress={onDebug}
          activeOpacity={0.7}
          style={[styles.debugBtn, { backgroundColor: colors.surfaceElevated }]}
          accessibilityLabel="Open debug panel"
        >
          <Ionicons name="bug-outline" size={15} color={colors.textMuted} />
        </TouchableOpacity>
      )}
      <ThemeToggle />
      <HeaderAvatar />
    </View>
  );
}

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

// ─── Main tabs ────────────────────────────────────────────────────────────────
function MainTabs({ onDebug }: { onDebug: () => void }) {
  const { isSuperAdmin } = useAuth();
  const { colors } = useTheme();

  const screenOptions = {
    headerStyle: {
      backgroundColor: colors.surface,
      elevation: 0,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitleStyle: { color: colors.textPrimary, fontWeight: '700' as const, fontSize: 18 },
    headerTintColor:  colors.primary,
    headerRight: () => <HeaderRight onDebug={onDebug} />,
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopWidth: 1, borderTopColor: colors.border,
      height: Platform.OS === 'ios' ? 85 : 65,
      paddingBottom: Platform.OS === 'ios' ? 20 : 8,
      paddingTop: 8,
    },
    tabBarLabelStyle:        styles.tabLabel,
    tabBarActiveTintColor:   colors.primary,
    tabBarInactiveTintColor: colors.textSecondary,
  };

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name={focused ? 'grid' : 'grid-outline'} focused={focused} color={color} primaryDim={colors.primaryDim} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile', tabBarButton: () => null }}
      />
      {isSuperAdmin && (
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: 'Settings',
            tabBarIcon: ({ focused, color }) => (
              <TabIcon name={focused ? 'settings' : 'settings-outline'} focused={focused} color={color} primaryDim={colors.primaryDim} />
            ),
          }}
        />
      )}
    </Tab.Navigator>
  );
}

// ─── Root navigator ───────────────────────────────────────────────────────────
function RootNavigator() {
  const { user, isLoading } = useAuth();
  const { colors }          = useTheme();
  const debug               = useDebug();
  const [debugOpen, setDebugOpen] = React.useState(false);

  useEffect(() => {
    registerDebugBridge({
      logRequest:    debug.logRequest,
      updateRequest: debug.updateRequest,
      logError:      debug.logError,
    });
  }, [debug]);

  if (isLoading) {
    return (
      <View style={[styles.splash, { backgroundColor: colors.background }]}>
        <View style={[styles.splashRing, { backgroundColor: colors.primaryDim, borderColor: colors.primary }]}>
          <Text style={[styles.splashLogo, { color: colors.primary }]}>M</Text>
        </View>
        <Text style={[styles.splashText, { color: colors.textPrimary }]}>MyApp</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false, animationEnabled: false }}>
        {user
          ? <Stack.Screen name="Main"  component={() => <MainTabs onDebug={() => setDebugOpen(true)} />} />
          : <Stack.Screen name="Login" component={LoginScreen} />
        }
      </Stack.Navigator>

      <ToastContainer />
      <DebugPanel visible={debugOpen} onClose={() => setDebugOpen(false)} />
    </>
  );
}

export default function AppNavigator() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  debugBtn: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 2,
  },
  tabLabel: { fontSize: 10, fontWeight: '600' },
  tabIcon:  { width: 36, height: 36, borderRadius: RADIUS.sm + 2, alignItems: 'center', justifyContent: 'center' },
  splash:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  splashRing: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  splashLogo: { fontSize: 32, fontWeight: '800' },
  splashText: { fontSize: 24, fontWeight: '800' },
});
