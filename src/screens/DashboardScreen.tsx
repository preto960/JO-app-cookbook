// src/screens/DashboardScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SPACING } from '../constants/theme';
import { ProtectedRoute } from '../components';
import { useResourcePermissions } from '../context/PermissionsContext';

const MOCK_STATS = [
  { label: 'Total Users',     value: '1,284', delta: '+12%', positive: true  },
  { label: 'Active Today',    value: '347',   delta: '+5%',  positive: true  },
  { label: 'Revenue (month)', value: '$48.2k', delta: '-2%', positive: false },
  { label: 'Open Tasks',      value: '23',    delta: '+1',   positive: false },
];

const MOCK_ACTIVITY = [
  { id: '1', type: 'login',    user: 'Maria Garcia',  time: '2 min ago',  icon: '🔐' },
  { id: '2', type: 'update',   user: 'Carlos Lopez',  time: '15 min ago', icon: '✏️' },
  { id: '3', type: 'register', user: 'Ana Martinez',  time: '1h ago',     icon: '✅' },
  { id: '4', type: 'delete',   user: 'Admin',         time: '3h ago',     icon: '🗑️' },
  { id: '5', type: 'login',    user: 'Pedro Sanchez', time: '5h ago',     icon: '🔐' },
];

const MOCK_USERS = [
  { id: '1', firstName: 'Maria',  lastName: 'Garcia',   email: 'maria@co.com',  role: 'user',  active: true  },
  { id: '2', firstName: 'Carlos', lastName: 'Lopez',    email: 'carlos@co.com', role: 'admin', active: true  },
  { id: '3', firstName: 'Ana',    lastName: 'Martinez', email: 'ana@co.com',    role: 'user',  active: false },
  { id: '4', firstName: 'Pedro',  lastName: 'Sanchez',  email: 'pedro@co.com',  role: 'user',  active: true  },
];

function DashboardScreenContent({ navigation }: { navigation: any }) {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  
  // Permisos para dashboard
  const permissions = useResourcePermissions('DASHBOARD');

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* ── Stats ── */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Overview</Text>
      <View style={styles.statsGrid}>
        {MOCK_STATS.map((s, i) => (
          <View key={i} style={[
            styles.statCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{s.label}</Text>
            <View style={[
              styles.deltaBadge,
              { backgroundColor: s.positive ? '#10B98122' : '#EF444422' },
            ]}>
              <Text style={[
                styles.deltaText,
                { color: s.positive ? colors.success : colors.danger },
              ]}>
                {s.delta}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* ── Recent Users ── */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Users</Text>
        <TouchableOpacity>
          <Text style={[styles.seeAll, { color: colors.primary }]}>View all →</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {MOCK_USERS.map((u, i) => (
          <View key={u.id} style={[
            styles.userRow,
            i < MOCK_USERS.length - 1 && [styles.rowBorder, { borderBottomColor: colors.border }],
          ]}>
            <View style={[styles.userAvatar, { backgroundColor: colors.primaryDim }]}>
              <Text style={[styles.userAvatarText, { color: colors.primary }]}>
                {u.firstName[0]}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.userName2, { color: colors.textPrimary }]}>
                {u.firstName} {u.lastName}
              </Text>
              <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{u.email}</Text>
            </View>
            <View style={styles.userMeta}>
              <View style={[
                styles.roleBadge,
                { backgroundColor: u.role === 'admin' ? colors.accentDim : colors.primaryDim },
              ]}>
                <Text style={[
                  styles.roleText,
                  { color: u.role === 'admin' ? colors.accent : colors.primary },
                ]}>
                  {u.role}
                </Text>
              </View>
              <View style={[
                styles.statusDot,
                { backgroundColor: u.active ? colors.success : colors.textMuted },
              ]} />
            </View>
          </View>
        ))}
      </View>


      {/* ── Recent Activity ── */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Activity</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {MOCK_ACTIVITY.map((a, i) => (
          <View key={a.id} style={[
            styles.activityRow,
            i < MOCK_ACTIVITY.length - 1 && [styles.rowBorder, { borderBottomColor: colors.border }],
          ]}>
            <View style={[styles.activityIcon, { backgroundColor: colors.surfaceElevated }]}>
              <Text style={{ fontSize: 18 }}>{a.icon}</Text>
            </View>
            <View style={styles.activityInfo}>
              <Text style={[styles.activityUser, { color: colors.textPrimary }]}>{a.user}</Text>
              <Text style={[styles.activityTime, { color: colors.textSecondary }]}>{a.time}</Text>
            </View>
            <View style={[styles.activityTypeBadge, { backgroundColor: colors.surfaceElevated }]}>
              <Text style={[styles.activityTypeText, { color: colors.textSecondary }]}>
                {a.type}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={{ height: SPACING.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { padding: SPACING.lg },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  seeAll: { fontSize: 13, marginBottom: SPACING.md },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1,
    minWidth: '44%',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
  },
  statValue:  { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  statLabel:  { fontSize: 12, marginBottom: 8 },
  deltaBadge: {
    alignSelf: 'flex-start',
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  deltaText: { fontSize: 11, fontWeight: '600' },

  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  rowBorder: { borderBottomWidth: 1 },

  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: 12,
  },
  userAvatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  userAvatarText: { fontWeight: '700', fontSize: 14 },
  userInfo:       { flex: 1 },
  userName2:      { fontSize: 14, fontWeight: '600' },
  userEmail:      { fontSize: 12 },
  userMeta:       { alignItems: 'flex-end', gap: 4 },
  roleBadge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roleText:  { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },

  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: 12,
  },
  activityIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  activityInfo:      { flex: 1 },
  activityUser:      { fontSize: 14, fontWeight: '600' },
  activityTime:      { fontSize: 12 },
  activityTypeBadge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activityTypeText: { fontSize: 10, fontWeight: '600' },
});

export default function DashboardScreen(props: { navigation: any }) {
  return (
    <ProtectedRoute resource="DASHBOARD" action="canView">
      <DashboardScreenContent {...props} />
    </ProtectedRoute>
  );
}
