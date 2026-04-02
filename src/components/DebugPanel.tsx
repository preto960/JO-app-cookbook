// src/components/DebugPanel.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, ScrollView,
  TouchableOpacity, Pressable, Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useDebug, HttpLog, ErrorLog, CustomLog } from '../context/DebugContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth, fullName } from '../context/AuthContext';
import { getSavedApiUrl, DEFAULT_API_URL } from '../services/api';
import { RADIUS, SPACING } from '../constants/theme';

type Tab = 'http' | 'errors' | 'user' | 'logs';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(ts: number) {
  return new Date(ts).toLocaleTimeString();
}

function statusColor(status?: number, colors?: any) {
  if (!status) return colors.textMuted;
  if (status < 300) return colors.success;
  if (status < 400) return colors.warning;
  return colors.danger;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function HttpTab({ logs, colors }: { logs: HttpLog[]; colors: any }) {
  if (!logs.length) return <Empty label="No HTTP requests yet" colors={colors} />;
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {logs.map(l => (
        <View key={l.id} style={[styles.logRow, { borderBottomColor: colors.border }]}>
          <View style={styles.logRowTop}>
            <Text style={[styles.badge, { backgroundColor: colors.primaryDim, color: colors.primary }]}>
              {l.method}
            </Text>
            <Text style={[styles.logTime, { color: colors.textMuted }]}>{fmt(l.timestamp)}</Text>
            {l.duration != null && (
              <Text style={[styles.logTime, { color: colors.textMuted }]}>{l.duration}ms</Text>
            )}
            {l.status != null && (
              <Text style={[styles.badge, {
                backgroundColor: `${statusColor(l.status, colors)}22`,
                color: statusColor(l.status, colors),
              }]}>
                {l.status}
              </Text>
            )}
          </View>
          <Text style={[styles.logUrl, { color: colors.textPrimary }]} numberOfLines={2}>
            {l.url}
          </Text>
          {l.error && (
            <Text style={[styles.logError, { color: colors.danger }]} numberOfLines={2}>
              {l.error}
            </Text>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

function ErrorTab({ logs, colors }: { logs: ErrorLog[]; colors: any }) {
  if (!logs.length) return <Empty label="No errors captured" colors={colors} />;
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {logs.map(l => (
        <View key={l.id} style={[styles.logRow, { borderBottomColor: colors.border }]}>
          <Text style={[styles.logTime, { color: colors.textMuted }]}>{fmt(l.timestamp)}</Text>
          <Text style={[styles.logError, { color: colors.danger }]}>{l.message}</Text>
          {l.stack && (
            <Text style={[styles.logStack, { color: colors.textMuted }]} numberOfLines={5}>
              {l.stack}
            </Text>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

function UserTab({ colors }: { colors: any }) {
  const { user, isSuperAdmin } = useAuth();
  const [apiUrl, setApiUrl] = React.useState('loading…');

  React.useEffect(() => {
    getSavedApiUrl().then(setApiUrl);
  }, []);

  const rows = [
    { label: 'Name',         value: fullName(user) },
    { label: 'Email',        value: user?.email     ?? '—' },
    { label: 'Role',         value: user?.role      ?? '—' },
    { label: 'User ID',      value: String(user?.id ?? '—') },
    { label: 'Super Admin',  value: isSuperAdmin ? 'Yes' : 'No' },
    { label: 'Session',      value: user?.isLocal ? 'Local' : 'API' },
    { label: 'API URL',      value: apiUrl },
    { label: 'Default URL',  value: DEFAULT_API_URL },
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {rows.map(r => (
        <View key={r.label} style={[styles.userRow, { borderBottomColor: colors.border }]}>
          <Text style={[styles.userLabel, { color: colors.textSecondary }]}>{r.label}</Text>
          <Text style={[styles.userValue, { color: colors.textPrimary }]} numberOfLines={2}>
            {r.value}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

function LogsTab({ logs, colors }: { logs: CustomLog[]; colors: any }) {
  if (!logs.length) return <Empty label="No custom logs yet" colors={colors} />;

  const levelColor = (level: string) => {
    if (level === 'error') return colors.danger;
    if (level === 'warn')  return colors.warning;
    return colors.textSecondary;
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {logs.map(l => (
        <View key={l.id} style={[styles.logRow, { borderBottomColor: colors.border }]}>
          <View style={styles.logRowTop}>
            <Text style={[styles.badge, {
              backgroundColor: `${levelColor(l.level)}22`,
              color: levelColor(l.level),
            }]}>
              {l.level.toUpperCase()}
            </Text>
            <Text style={[styles.logTime, { color: colors.textMuted }]}>{fmt(l.timestamp)}</Text>
          </View>
          <Text style={[styles.logUrl, { color: colors.textPrimary }]}>{l.message}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function Empty({ label, colors }: { label: string; colors: any }) {
  return (
    <View style={styles.empty}>
      <Ionicons name="code-slash-outline" size={32} color={colors.textMuted} />
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function DebugPanel({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const { httpLogs, errorLogs, customLogs, clearAll } = useDebug();
  const [tab, setTab] = useState<Tab>('http');

  const TABS: { key: Tab; label: string; icon: React.ComponentProps<typeof Ionicons>['name']; count: number }[] = [
    { key: 'http',   label: 'HTTP',   icon: 'globe-outline',       count: httpLogs.length   },
    { key: 'errors', label: 'Errors', icon: 'alert-circle-outline', count: errorLogs.length  },
    { key: 'user',   label: 'User',   icon: 'person-outline',       count: 0                 },
    { key: 'logs',   label: 'Logs',   icon: 'terminal-outline',     count: customLogs.length },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={[
        styles.panel,
        {
          backgroundColor: colors.surface,
          borderTopColor:  colors.border,
          ...(Platform.OS === 'web'
            ? { boxShadow: '0 -8px 40px rgba(0,0,0,0.3)' }
            : { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 20 }),
        },
      ]}>
        {/* Header */}
        <View style={[styles.panelHeader, { borderBottomColor: colors.border }]}>
          <View style={styles.panelHeaderLeft}>
            <Ionicons name="bug-outline" size={18} color={colors.primary} />
            <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>Debug Panel</Text>
          </View>
          <View style={styles.panelHeaderRight}>
            <TouchableOpacity
              onPress={clearAll}
              style={[styles.clearBtn, { borderColor: colors.border }]}
            >
              <Ionicons name="trash-outline" size={14} color={colors.danger} />
              <Text style={[styles.clearBtnText, { color: colors.danger }]}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[
                styles.tabBtn,
                tab === t.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
              ]}
              onPress={() => setTab(t.key)}
            >
              <Ionicons
                name={t.icon}
                size={14}
                color={tab === t.key ? colors.primary : colors.textSecondary}
              />
              <Text style={[
                styles.tabLabel,
                { color: tab === t.key ? colors.primary : colors.textSecondary },
              ]}>
                {t.label}
              </Text>
              {t.count > 0 && (
                <View style={[styles.tabCount, { backgroundColor: tab === t.key ? colors.primary : colors.textMuted }]}>
                  <Text style={styles.tabCountText}>{t.count > 99 ? '99+' : t.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <View style={styles.tabContent}>
          {tab === 'http'   && <HttpTab   logs={httpLogs}   colors={colors} />}
          {tab === 'errors' && <ErrorTab  logs={errorLogs}  colors={colors} />}
          {tab === 'user'   && <UserTab                     colors={colors} />}
          {tab === 'logs'   && <LogsTab   logs={customLogs} colors={colors} />}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  panel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: '75%',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderTopWidth: 1,
  },
  panelHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    borderBottomWidth: 1,
  },
  panelHeaderLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  panelHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  panelTitle:       { fontSize: 16, fontWeight: '700' },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: RADIUS.sm,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  clearBtnText: { fontSize: 12, fontWeight: '600' },

  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 10,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  tabCount: {
    borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1, minWidth: 16,
    alignItems: 'center',
  },
  tabCountText: { fontSize: 9, color: '#fff', fontWeight: '700' },

  tabContent: { flex: 1, paddingHorizontal: SPACING.md },

  logRow:    { paddingVertical: SPACING.sm, borderBottomWidth: 1, gap: 3 },
  logRowTop: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  badge: {
    fontSize: 10, fontWeight: '700',
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4,
  },
  logTime:  { fontSize: 10 },
  logUrl:   { fontSize: 12, lineHeight: 17 },
  logError: { fontSize: 11 },
  logStack: { fontSize: 10, lineHeight: 15, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

  userRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 10, borderBottomWidth: 1,
  },
  userLabel: { fontSize: 13, flex: 1 },
  userValue: { fontSize: 13, fontWeight: '500', flex: 2, textAlign: 'right' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 60 },
  emptyText: { fontSize: 13 },
});
