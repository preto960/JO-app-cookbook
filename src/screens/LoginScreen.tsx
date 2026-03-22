// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { RADIUS, SPACING } from '../constants/theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const { colors } = useTheme();
  const toast = useToast();

  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [loading,      setLoading]      = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      toast.warning('Required fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      // Success toast is shown briefly before navigation
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

  const glowShadow = Platform.OS === 'web'
    ? { boxShadow: `0 0 18px 0 ${colors.primary}99` }
    : { shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 12, elevation: 8 };

  const btnShadow = Platform.OS === 'web'
    ? { boxShadow: `0 4px 18px 0 ${colors.primary}66` }
    : { shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* ── Brand ── */}
        <View style={styles.brandSection}>
          <View style={[styles.logoRing, { borderColor: colors.primary }, glowShadow]}>
            <View style={[styles.logoInner, { backgroundColor: colors.primaryDim }]}>
              <Text style={[styles.logoText, { color: colors.primary }]}>M</Text>
            </View>
          </View>
          <Text style={[styles.appName, { color: colors.textPrimary }]}>MyApp</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            Sign in to your control panel
          </Text>
        </View>

        {/* ── Card ── */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Sign In</Text>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
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
            <View style={[styles.inputWrapper, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { flex: 1, color: colors.textPrimary }]}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: colors.primary }, btnShadow, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={colors.background} />
              : <Text style={[styles.loginBtnText, { color: colors.background }]}>Sign In</Text>
            }
          </TouchableOpacity>

          <View style={styles.hint}>
            <View style={[styles.hintDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.hintText, { color: colors.textSecondary }]}>
              Admin access is reserved for authorized accounts only.
            </Text>
          </View>
        </View>

        <Text style={[styles.footer, { color: colors.textMuted }]}>
          MyApp © {new Date().getFullYear()}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:      { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.xxl },

  brandSection: { alignItems: 'center', marginBottom: SPACING.xl },
  logoRing:  { width: 80, height: 80, borderRadius: 40, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md },
  logoInner: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  logoText:  { fontSize: 28, fontWeight: '800' },
  appName:   { fontSize: 28, fontWeight: '800', letterSpacing: 1 },
  tagline:   { fontSize: 14, marginTop: 4 },

  card:      { borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1 },
  cardTitle: { fontSize: 20, fontWeight: '700', marginBottom: SPACING.lg },

  fieldGroup:   { marginBottom: SPACING.md },
  label:        { fontSize: 12, fontWeight: '600', marginBottom: SPACING.xs, textTransform: 'uppercase', letterSpacing: 0.8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: SPACING.md, height: 52 },
  input:        { flex: 1, fontSize: 15 },
  eyeBtn:       { padding: SPACING.xs },
  eyeText:      { fontSize: 16 },

  loginBtn:         { borderRadius: RADIUS.md, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: SPACING.sm },
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText:     { fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },

  hint:     { flexDirection: 'row', alignItems: 'flex-start', marginTop: SPACING.md, gap: 8 },
  hintDot:  { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
  hintText: { flex: 1, fontSize: 12, lineHeight: 18 },

  footer: { textAlign: 'center', fontSize: 12, marginTop: SPACING.xl },
});
