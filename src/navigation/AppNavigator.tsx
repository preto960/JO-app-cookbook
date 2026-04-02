// @ts-nocheck — stack screen components vs ParamList typing
// src/navigation/AppNavigator.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Platform, TouchableOpacity,
  Animated, Dimensions, Pressable,
} from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useDebug } from '../context/DebugContext';
import { RADIUS, SPACING } from '../constants/theme';
import { registerDebugBridge } from '../services/api';

import ThemeToggle    from '../components/ThemeToggle';
import HeaderAvatar   from '../components/HeaderAvatar';
import ToastContainer from '../components/ToastContainer';
import DebugPanel     from '../components/DebugPanel';

import LoginScreen         from '../screens/LoginScreen';
import DashboardScreen     from '../screens/DashboardScreen';
import ProfileScreen       from '../screens/ProfileScreen';
import SettingsScreen      from '../screens/SettingsScreen';
import PermissionsScreen   from '../screens/permissions/PermissionsScreen';
import UsersScreen         from '../screens/users/UsersScreen';
import UserDetailScreen    from '../screens/users/UserDetailScreen';
import UserFormScreen      from '../screens/users/UserFormScreen';
import UserPasswordScreen  from '../screens/users/UserPasswordScreen';
import RecipesScreen       from '../screens/recipes/RecipesScreen';
import RecipeDetailScreen  from '../screens/recipes/RecipeDetailScreen';
import RecipeFormScreen    from '../screens/recipes/RecipeFormScreen';
import ShoppingListsScreen from '../screens/shopping/ShoppingListsScreen';
import ShoppingListDetailScreen from '../screens/shopping/ShoppingListDetailScreen';
import ShoppingListFormScreen from '../screens/shopping/ShoppingListFormScreen';

const APP_NAME = 'JO-app-cookbook';
const SCREEN_W = Dimensions.get('window').width;
const DRAWER_W = Math.min(260, SCREEN_W * 0.72);

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

// ─── Menu items — Permissions removed (accessible via Settings) ───────────────
const MENU_ITEMS = [
  { key: 'Recipes',       label: 'Recipes',       icon: 'restaurant-outline' as const, iconOn: 'restaurant'   as const },
  { key: 'ShoppingLists', label: 'Shopping Lists', icon: 'list-outline'       as const, iconOn: 'list'         as const },
  { key: 'Users',         label: 'Users',         icon: 'people-outline'     as const, iconOn: 'people'       as const, adminOnly: true },
  { key: 'Settings',      label: 'Settings',      icon: 'settings-outline'   as const, iconOn: 'settings'     as const, adminOnly: true },
];

// ─── Slide menu ───────────────────────────────────────────────────────────────
function SlideMenu({
  visible, onClose, onNavigate, activeKey,
}: {
  visible: boolean; onClose: () => void;
  onNavigate: (screen: string) => void; activeKey: string;
}) {
  const { colors }       = useTheme();
  const { isSuperAdmin } = useAuth();
  const insets           = useSafeAreaInsets();
  const tx  = useRef(new Animated.Value(-DRAWER_W)).current;
  const dim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.spring(tx,  { toValue: 0,         useNativeDriver: Platform.OS !== 'web', tension: 68, friction: 12 }),
        Animated.timing(dim, { toValue: 1,          duration: 200, useNativeDriver: Platform.OS !== 'web' }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(tx,  { toValue: -DRAWER_W,  useNativeDriver: Platform.OS !== 'web', tension: 68, friction: 12 }),
        Animated.timing(dim, { toValue: 0,           duration: 180, useNativeDriver: Platform.OS !== 'web' }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  if (!mounted) return null;

  const items = MENU_ITEMS.filter(m => !m.adminOnly || isSuperAdmin);

  const panelShadow = Platform.OS === 'web'
    ? ({ boxShadow: '4px 0 32px rgba(0,0,0,0.28)' } as any)
    : { shadowColor: '#000', shadowOffset: { width: 6, height: 0 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 20 };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', opacity: dim, zIndex: 100 }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.drawer,
          {
            width: DRAWER_W,
            backgroundColor: colors.surface,
            borderRightColor: colors.border,
            transform: [{ translateX: tx }],
            zIndex: 101,
          },
          panelShadow,
        ]}
      >
        <View style={{
          paddingTop: insets.top + SPACING.lg,
          paddingBottom: insets.bottom + SPACING.lg,
          paddingHorizontal: SPACING.md,
          flex: 1,
        }}>
          {/* Menu header */}
          <View style={[styles.menuHeader, { borderBottomColor: colors.border }]}>
            <View style={[styles.menuDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.menuHeaderText, { color: colors.textPrimary }]}>Navigation</Text>
          </View>

          <View style={{ marginTop: SPACING.md }}>
            {items.map(item => {
              const active = activeKey === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.dItem,
                    active
                      ? { backgroundColor: colors.primaryDim, borderColor: `${colors.primary}44` }
                      : { borderColor: 'transparent' },
                  ]}
                  onPress={() => { 
                    onClose(); 
                    // Prevent multiple rapid taps
                    setTimeout(() => onNavigate(item.key), 200); 
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.dItemIcon,
                    { backgroundColor: active ? colors.primary : colors.surfaceElevated },
                  ]}>
                    <Ionicons
                      name={active ? item.iconOn : item.icon}
                      size={15}
                      color={active ? colors.background : colors.textSecondary}
                    />
                  </View>
                  <Text style={[styles.dItemText, { color: active ? colors.primary : colors.textPrimary }]}>
                    {item.label}
                  </Text>
                  {active && (
                    <View style={[styles.dItemBar, { backgroundColor: colors.primary }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Tab icon ─────────────────────────────────────────────────────────────────
function TabIcon({ name, focused, color, primaryDim }: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  focused: boolean; color: string; primaryDim: string;
}) {
  return (
    <View style={[styles.tabIcon, focused && { backgroundColor: primaryDim }]}>
      <Ionicons name={name} size={20} color={color} />
    </View>
  );
}

// ─── Shared header options ────────────────────────────────────────────────────
function useSharedHeaderOptions(onMenuOpen: () => void, onDebug: () => void) {
  const { colors }       = useTheme();
  const { isSuperAdmin } = useAuth();

  return {
    headerTitle: () => null,
    headerStyle: {
      backgroundColor: colors.surface,
      shadowColor: 'transparent',
      elevation: 0,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitleStyle: { color: colors.textPrimary },
    headerTintColor: colors.primary,
    headerLeft: () => (
      <TouchableOpacity
        style={styles.menuBtn}
        onPress={onMenuOpen}
        activeOpacity={0.7}
        accessibilityLabel="Open menu"
      >
        <Ionicons name="menu-outline" size={26} color={colors.textPrimary} />
      </TouchableOpacity>
    ),
    headerRight: () => (
      <View style={styles.headerRight}>
        {isSuperAdmin && (
          <TouchableOpacity
            onPress={onDebug}
            style={[styles.debugBtn, { backgroundColor: colors.surfaceElevated }]}
            activeOpacity={0.7}
          >
            <Ionicons name="bug-outline" size={15} color={colors.textMuted} />
          </TouchableOpacity>
        )}
        <ThemeToggle />
        <HeaderAvatar />
      </View>
    ),
  };
}

// ─── Main tabs ────────────────────────────────────────────────────────────────
function MainTabs({ onMenuOpen, onTabFocus, onDebug }: {
  onMenuOpen: () => void;
  onTabFocus: (key: string) => void;
  onDebug: () => void;
}) {
  const { colors }   = useTheme();
  const headerOpts   = useSharedHeaderOptions(onMenuOpen, onDebug);

  const tabOptions = {
    ...headerOpts,
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      height: Platform.OS === 'ios' ? 85 : 65,
      paddingBottom: Platform.OS === 'ios' ? 20 : 8,
      paddingTop: 8,
    },
    tabBarLabelStyle:        styles.tabLabel,
    tabBarActiveTintColor:   colors.primary,
    tabBarInactiveTintColor: colors.textSecondary,
  };

  return (
    <Tab.Navigator screenOptions={tabOptions}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        listeners={{ focus: () => onTabFocus('Dashboard') }}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name={focused ? 'grid' : 'grid-outline'} focused={focused} color={color} primaryDim={colors.primaryDim} />
          ),
        }}
      />
      <Tab.Screen
        name="Recipes"
        component={RecipesScreen}
        listeners={{ focus: () => onTabFocus('Recipes') }}
        options={{ tabBarButton: () => null }}
      />
      <Tab.Screen
        name="ShoppingLists"
        component={ShoppingListsScreen}
        listeners={{ focus: () => onTabFocus('ShoppingLists') }}
        options={{ tabBarButton: () => null }}
      />
      <Tab.Screen
        name="Users"
        component={UsersScreen}
        listeners={{ focus: () => onTabFocus('Users') }}
        options={{ tabBarButton: () => null }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        listeners={{ focus: () => onTabFocus('Settings') }}
        options={{ tabBarButton: () => null }}
      />
      
      {/* Detail screens - hidden from tab bar */}
      <Tab.Screen
        name="UserDetail"
        component={UserDetailScreen}
        listeners={{ focus: () => onTabFocus('Users') }}
        options={{ tabBarButton: () => null }}
      />
      <Tab.Screen
        name="UserForm"
        component={UserFormScreen}
        listeners={{ focus: () => onTabFocus('Users') }}
        options={{ tabBarButton: () => null }}
      />
      <Tab.Screen
        name="UserPassword"
        component={UserPasswordScreen}
        listeners={{ focus: () => onTabFocus('Users') }}
        options={{ tabBarButton: () => null }}
      />
      <Tab.Screen
        name="RecipeDetail"
        component={RecipeDetailScreen}
        listeners={{ focus: () => onTabFocus('Recipes') }}
        options={{ tabBarButton: () => null }}
      />
      <Tab.Screen
        name="RecipeForm"
        component={RecipeFormScreen}
        listeners={{ focus: () => onTabFocus('Recipes') }}
        options={{ tabBarButton: () => null }}
      />
      <Tab.Screen
        name="ShoppingListDetail"
        component={ShoppingListDetailScreen}
        listeners={{ focus: () => onTabFocus('ShoppingLists') }}
        options={{ tabBarButton: () => null }}
      />
      <Tab.Screen
        name="ShoppingListForm"
        component={ShoppingListFormScreen}
        listeners={{ focus: () => onTabFocus('ShoppingLists') }}
        options={{ tabBarButton: () => null }}
      />
      
      {/* Profile — hidden, accessed from HeaderAvatar */}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        listeners={{ focus: () => onTabFocus('Profile') }}
        options={{ tabBarButton: () => null }}
      />
    </Tab.Navigator>
  );
}

// ─── Authenticated shell ──────────────────────────────────────────────────────
function AuthenticatedApp() {
  const navigation                = useNavigation<any>();
  const { colors }                = useTheme();
  const debug                     = useDebug();
  const { isSuperAdmin }          = useAuth();
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [activeKey, setActiveKey] = useState('Dashboard');
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    registerDebugBridge({
      logRequest:    debug.logRequest,
      updateRequest: debug.updateRequest,
      logError:      debug.logError,
    });
  }, [debug]);

  const handleNavigate = (screen: string) => {
    if (navigating) return; // Prevent multiple navigations
    
    setNavigating(true);
    setActiveKey(screen);
    
    try {
      navigation.navigate('Tabs', { screen });
    } catch (error) {
      console.warn('Navigation error:', error);
      // Fallback: reset to dashboard if navigation fails
      navigation.navigate('Tabs', { screen: 'Dashboard' });
    } finally {
      // Reset navigation lock after a delay
      setTimeout(() => setNavigating(false), 500);
    }
  };

  const sharedHeader = useSharedHeaderOptions(
    () => {
      if (!menuOpen && !navigating) {
        setMenuOpen(true);
      }
    },
    () => setDebugOpen(true),
  );

  const stackScreenOptions = {
    ...sharedHeader,
    headerShown: true,
    headerBackTitle: '',
    cardStyle: { backgroundColor: colors.background },
    animationEnabled: Platform.OS !== 'web',
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animationEnabled: Platform.OS !== 'web',
          cardStyle: { backgroundColor: colors.background },
        }}
      >
        {/* Main tabs screen — always visible with bottom bar */}
        <Stack.Screen name="Tabs">
          {() => (
            <MainTabs
              onMenuOpen={() => {
                if (!menuOpen && !navigating) {
                  setMenuOpen(true);
                }
              }}
              onTabFocus={setActiveKey}
              onDebug={() => setDebugOpen(true)}
            />
          )}
        </Stack.Screen>

      {/* Full-screen stack screens */}
      <Stack.Screen name="Permissions" component={PermissionsScreen} options={stackScreenOptions} />
      </Stack.Navigator>

      <SlideMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavigate={handleNavigate}
        activeKey={activeKey}
      />

      {isSuperAdmin && (
        <DebugPanel visible={debugOpen} onClose={() => setDebugOpen(false)} />
      )}
    </View>
  );
}

// ─── Splash ───────────────────────────────────────────────────────────────────
function SplashScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.splash, { backgroundColor: colors.background }]}>
      <View style={[styles.splashRing, { backgroundColor: colors.primaryDim, borderColor: colors.primary }]}>
        <Text style={[styles.splashLetter, { color: colors.primary }]}>J</Text>
      </View>
      <Text style={[styles.splashTitle, { color: colors.textPrimary }]}>{APP_NAME}</Text>
    </View>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
const RootStack = createStackNavigator();

function RootNavigator() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <SplashScreen />;
  return (
    <View style={{ flex: 1 }}>
      <RootStack.Navigator screenOptions={{ headerShown: false, animationEnabled: false }}>
        {user
          ? <RootStack.Screen name="App"   component={AuthenticatedApp} />
          : <RootStack.Screen name="Login" component={LoginScreen}      />
        }
      </RootStack.Navigator>
      <ToastContainer />
    </View>
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  menuBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 8,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  debugBtn: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', marginRight: 2,
  },
  tabLabel: { fontSize: 10, fontWeight: '600' },
  tabIcon: {
    width: 36, height: 36,
    borderRadius: RADIUS.sm + 2,
    alignItems: 'center', justifyContent: 'center',
  },

  // Drawer
  drawer: {
    position: 'absolute',
    top: 0, left: 0, bottom: 0,
    borderRightWidth: 1,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
  },
  menuDot: {
    width: 6, height: 6, borderRadius: 3,
  },
  menuHeaderText: {
    fontSize: 11, fontWeight: '700',
    letterSpacing: 1.2, textTransform: 'uppercase',
  },
  dItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: RADIUS.md,
    paddingVertical: 10, paddingHorizontal: SPACING.sm,
    marginBottom: 2,
    borderWidth: 1,
    position: 'relative', overflow: 'hidden',
  },
  dItemIcon: {
    width: 28, height: 28, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  dItemText: { fontSize: 14, fontWeight: '600', flex: 1 },
  dItemBar: {
    position: 'absolute', right: 0, top: 8, bottom: 8,
    width: 3, borderRadius: 2,
  },

  // Splash
  splash:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  splashRing:   { width: 80, height: 80, borderRadius: 40, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  splashLetter: { fontSize: 32, fontWeight: '800' },
  splashTitle:  { fontSize: 18, fontWeight: '800' },
});
