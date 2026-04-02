// src/screens/SettingsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  Alert, TextInput, TouchableOpacity,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth, fullName, registerToastBridge } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { RADIUS, SPACING } from '../constants/theme';
import { getSavedApiUrl, saveApiUrl, DEFAULT_API_URL } from '../services/api';

import ThemedCard from '../components/ThemedCard';
import SettingRow from '../components/SettingRow';

interface Props {
  navigation?: any;
}

export default function SettingsScreen({ navigation }: Props) {
  const { user, isSuperAdmin }                    = useAuth();
  const { colors }                                = useTheme();
  const toast                                     = useToast();
  const { maintenanceMode, emailNotifications,
          debugMode, rateLimiting, set, ready }   = useSettings();

  useEffect(() => {
    registerToastBridge({ success: toast.success, error: toast.error, info: toast.info });
  }, [toast]);

  // ── API URL ────────────────────────────────────────────────────────────────
  const [apiUrl,   setApiUrl]   = useState('');
  const [urlDraft, setUrlDraft] = useState('');
  const [editing,  setEditing]  = useState(false);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    getSavedApiUrl().then((url) => { setApiUrl(url); setUrlDraft(url); });
  }, []);

  const handleSaveUrl = async () => {
    const trimmed = urlDraft.trim();
    if (!trimmed) { toast.warning('Invalid URL', 'The URL cannot be empty.'); return; }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      toast.warning('Invalid URL', 'URL must start with http:// or https://');
      return;
    }
    setSaving(true);
    try {
      await saveApiUrl(trimmed);
      setApiUrl(trimmed);
      setEditing(false);
      toast.success('API URL saved', 'New requests will use this URL.');
    } catch {
      toast.error('Save failed', 'Could not save the URL. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetUrl = () => {
    Alert.alert('Reset URL', `Reset to default?\n${DEFAULT_API_URL}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        onPress: async () => {
          await saveApiUrl(DEFAULT_API_URL);
          setApiUrl(DEFAULT_API_URL);
          setUrlDraft(DEFAULT_API_URL);
          setEditing(false);
          toast.info('URL reset', 'Using the default API URL.');
        },
      },
    ]);
  };

  if (!isSuperAdmin) {
    return (
      <View style={[styles.blocked, { backgroundColor: colors.background }]}>
        <Text style={{ fontSize: 48 }}>🔒</Text>
        <Text style={[styles.blockedTitle, { color: colors.textPrimary }]}>Access Restricted</Text>
        <Text style={[styles.blockedSub, { color: colors.textSecondary }]}>
          This panel is only available to the Super Admin.
        </Text>
      </View>
    );
  }

  if (!ready) return null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Admin banner ── */}
      <View style={[styles.adminBanner, { backgroundColor: colors.adminGoldDim, borderColor: `${colors.adminGold}44` }]}>
        <Text style={{ fontSize: 20 }}>👑</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.adminBannerTitle, { color: colors.adminGold }]}>Super Admin Panel</Text>
          <Text style={[styles.adminBannerSub, { color: colors.textSecondary }]}>
            Active session: {fullName(user)}
          </Text>
        </View>
      </View>

      {/* ── Access Control (contiene el acceso a Permissions) ── */}
      <ThemedCard title="Access Control">
        {/* Botón de acceso a Permissions */}
        <TouchableOpacity
          style={[styles.permBtn, { borderBottomColor: colors.border }]}
          onPress={() => navigation?.navigate('Permissions')}
          activeOpacity={0.7}
        >
          <View style={[styles.permBtnIcon, { backgroundColor: colors.primaryDim }]}>
            <Ionicons name="key-outline" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.permBtnTitle, { color: colors.textPrimary }]}>Permissions Matrix</Text>
            <Text style={[styles.permBtnSub, { color: colors.textSecondary }]}>
              Manage role-based access control
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>

        <SettingRow
          label="Rate Limiting"
          description="Limit requests per IP"
          type="toggle"
          value={rateLimiting}
          onToggle={async (v) => {
            await set('rateLimiting', v);
            toast.info(v ? 'Rate limiting enabled' : 'Rate limiting disabled');
          }}
        />
      </ThemedCard>

      {/* ── API Config ── */}
      <ThemedCard title="API Configuration">
        <View style={styles.urlBlock}>
          <View style={styles.urlLabelRow}>
            <Text style={[styles.urlLabel, { color: colors.textSecondary }]}>Base URL</Text>
            {!editing && (
              <View style={styles.urlActions}>
                <TouchableOpacity
                  onPress={() => { setUrlDraft(apiUrl); setEditing(true); }}
                  style={[styles.urlIconBtn, { backgroundColor: colors.primaryDim }]}
                >
                  <Ionicons name="pencil-outline" size={14} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleResetUrl}
                  style={[styles.urlIconBtn, { backgroundColor: colors.surfaceElevated }]}
                >
                  <Ionicons name="refresh-outline" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
          </View>
          {editing ? (
            <>
              <TextInput
                style={[styles.urlInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.primary, color: colors.textPrimary }]}
                value={urlDraft}
                onChangeText={setUrlDraft}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                placeholder="https://your-api.com/api"
                placeholderTextColor={colors.textMuted}
                selectTextOnFocus
              />
              <View style={styles.urlBtnRow}>
                <TouchableOpacity
                  onPress={() => { setUrlDraft(apiUrl); setEditing(false); }}
                  style={[styles.urlBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                >
                  <Text style={[styles.urlBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveUrl}
                  disabled={saving}
                  style={[styles.urlBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
                >
                  <Text style={[styles.urlBtnText, { color: colors.background }]}>{saving ? 'Saving…' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <Text style={[styles.urlValue, { color: colors.primary, backgroundColor: colors.primaryDim }]} numberOfLines={2}>
              {apiUrl}
            </Text>
          )}
        </View>

        <SettingRow
          label="Debug Mode"
          description="Enable detailed server logs"
          type="toggle"
          value={debugMode}
          onToggle={async (v) => {
            await set('debugMode', v);
            toast.info(v ? 'Debug mode enabled' : 'Debug mode disabled');
          }}
        />
      </ThemedCard>

      {/* ── App Settings ── */}
      <ThemedCard title="App Settings">
        <SettingRow
          label="Maintenance Mode"
          description="Block access for regular users"
          type="toggle"
          value={maintenanceMode}
          onToggle={async (v) => {
            await set('maintenanceMode', v);
            toast.warning(
              v ? 'Maintenance enabled' : 'Maintenance disabled',
              v ? 'Regular users cannot access the app.' : 'The system is now available.',
            );
          }}
        />
        <SettingRow
          label="Email Notifications"
          description="Send automatic admin alerts"
          type="toggle"
          value={emailNotifications}
          onToggle={async (v) => {
            await set('emailNotifications', v);
            toast.info(v ? 'Notifications enabled' : 'Notifications disabled');
          }}
        />
      </ThemedCard>

      {/* ── System Actions ── */}
      <ThemedCard title="System Actions">
        <SettingRow
          label="Clear Cache"
          description="Remove server-side cached data"
          type="button"
          onPress={() =>
            Alert.alert('Clear Cache', 'Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Confirm', style: 'destructive', onPress: () => toast.success('Cache cleared') },
            ])
          }
        />
        <SettingRow
          label="View System Logs"
          description="Browse server activity logs"
          type="button"
          onPress={() => toast.info('Coming soon', 'System logs will be available in a future update.')}
        />
        <SettingRow
          label="Manage Roles"
          description="Assign and modify user permissions"
          type="button"
          onPress={() => toast.info('Coming soon', 'Role management will be available in a future update.')}
        />
      </ThemedCard>

      {/* ── Danger Zone ── */}
      <ThemedCard title="⚠️ Danger Zone" danger>
        <SettingRow
          label="Reset Test Database"
          description="Delete all test data permanently"
          type="button"
          danger
          onPress={() =>
            Alert.alert(
              '⚠️ Dangerous Action',
              'This will reset the test database. Are you absolutely sure?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', style: 'destructive', onPress: () => toast.error('Database reset', 'All test data has been deleted.') },
              ]
            )
          }
        />
      </ThemedCard>

      <View style={{ height: SPACING.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { padding: SPACING.lg },

  blocked:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  blockedTitle: { fontSize: 20, fontWeight: '800', marginTop: SPACING.md },
  blockedSub:   { fontSize: 14, textAlign: 'center', marginTop: 8 },

  adminBanner:      { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.md, marginBottom: SPACING.lg },
  adminBannerTitle: { fontWeight: '700', fontSize: 15 },
  adminBannerSub:   { fontSize: 12, marginTop: 2 },

  // Permissions button
  permBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  permBtnIcon: {
    width: 38, height: 38, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  permBtnTitle: { fontSize: 15, fontWeight: '600' },
  permBtnSub:   { fontSize: 12, marginTop: 2 },

  urlBlock:    { paddingVertical: SPACING.md, gap: 8 },
  urlLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  urlLabel:    { fontSize: 15, fontWeight: '500' },
  urlActions:  { flexDirection: 'row', gap: 6 },
  urlIconBtn:  { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  urlValue:    { fontSize: 12, padding: 8, borderRadius: 6, lineHeight: 18 },
  urlInput:    { borderWidth: 1.5, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 10, fontSize: 13 },
  urlBtnRow:   { flexDirection: 'row', gap: 10, marginTop: 4 },
  urlBtn:      { flex: 1, height: 40, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  urlBtnText:  { fontSize: 14, fontWeight: '700' },
});
