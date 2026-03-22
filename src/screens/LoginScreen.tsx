// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useAuth }   from '../context/AuthContext';
import { useTheme }  from '../context/ThemeContext';
import { useToast }  from '../context/ToastContext';
import { RADIUS, SPACING } from '../constants/theme';

import AppLogo       from '../components/AppLogo';
import PasswordInput from '../components/PasswordInput';

const CURRENT_YEAR = new Date().getFullYear();
const APP_NAME     = 'JO-app-cookbook';

export default function LoginScreen() {
  const { login }  = useAuth();
  const { colors } = useTheme();
  const toast      = useToast();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      toast.warning('Required fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      toast.success('Welcome back!');
    } catch (err: any) {
      const status  = err?.response?.status;
      const message = err?.response?.data?.message || err?.message || 'Unknown error';
      if (!err?.response) {
        toast.error('Network error', 'Could not reach the server. Check your API URL in Settings.');
      } else if (status === 401) {
        toast.error('Login failed', 'Invalid email or password.');
      } else if (status >= 500) {
        toast.error(`Server error (${status})`, message);
      } else {
        toast.error('Authentication error', message);
      }
    } finally {
      setLoading(false);
    }
  };

  const btnShadow =
    Platform.OS === 'web'
      ? ({ boxShadow: `0 4px 18px 0 ${colors.primary}66` } as any)
      : {
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 10,
          elevation: 6,
        };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo only, no app name text */}
        <View style={styles.brandSection}>
          <AppLogo size={140} />
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Sign In</Text>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
            <View style={[styles.inputWrapper, {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            }]}>
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="user@email.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
            <PasswordInput
              value={password}
              onChangeText={setPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.loginBtn,
              { backgroundColor: colors.primary },
              btnShadow,
              loading && styles.loginBtnDisabled,
            ]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={[styles.loginBtnText, { color: colors.background }]}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.hint}>
            <View style={[styles.hintDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.hintText, { color: colors.textSecondary }]}>
              Admin access is reserved for authorized accounts only.
            </Text>
          </View>
        </View>

        <Text style={[styles.footer, { color: colors.textMuted }]}>
          {APP_NAME} © {CURRENT_YEAR}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:      { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xxl,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  card:      { borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1 },
  cardTitle: { fontSize: 20, fontWeight: '700', marginBottom: SPACING.lg },
  fieldGroup: { marginBottom: SPACING.md },
  label: {
    fontSize: 12, fontWeight: '600',
    marginBottom: SPACING.xs,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: RADIUS.md, borderWidth: 1,
    paddingHorizontal: SPACING.md, height: 52,
  },
  input: {
    flex: 1, fontSize: 15,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  loginBtn:         { borderRadius: RADIUS.md, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: SPACING.sm },
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText:     { fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  hint:     { flexDirection: 'row', alignItems: 'flex-start', marginTop: SPACING.md, gap: 8 },
  hintDot:  { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
  hintText: { flex: 1, fontSize: 12, lineHeight: 18 },
  footer:   { textAlign: 'center', fontSize: 12, marginTop: SPACING.xl },
});
