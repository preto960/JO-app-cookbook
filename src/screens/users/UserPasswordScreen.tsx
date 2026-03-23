// src/screens/users/UserPasswordScreen.tsx
// Admin sets a new password for any user.
// Cross-platform: web, iOS, Android.
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { userService } from '../../services/api';
import { useApiCall } from '../../hooks/useApiCall';
import { ThemedCard } from '../../components';
import PasswordInput from '../../components/PasswordInput';
import { SPACING, RADIUS } from '../../constants/theme';

interface Props {
  navigation: any;
  route: { params: { userId: string } };
}

export default function UserPasswordScreen({ navigation, route }: Props) {
  const { userId } = route.params;
  const { colors } = useTheme();
  const toast      = useToast();

  const [password, setPassword]   = useState('');
  const [confirm,  setConfirm]    = useState('');
  const [error,    setError]      = useState('');

  const { execute: changePass, loading } = useApiCall(userService.changePassword, {
    onSuccess: () => { toast.success('Password updated'); navigation.goBack(); },
    onError:   (e) => toast.error('Failed', e),
  });

  const handleSubmit = async () => {
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirm)  { setError('Passwords do not match'); return; }
    await changePass(userId, { password });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <ThemedCard title="New password">
        <View style={{ marginBottom: SPACING.md }}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>NEW PASSWORD *</Text>
          <PasswordInput value={password} onChangeText={setPassword} placeholder="Min. 6 characters" />
        </View>
        <View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>CONFIRM PASSWORD *</Text>
          <PasswordInput value={confirm} onChangeText={setConfirm} placeholder="Repeat password" />
        </View>
        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      </ThemedCard>

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={[styles.btnLabel, { color: colors.background }]}>
          {loading ? 'Saving…' : 'Update password'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { padding: SPACING.lg },
  label:     { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6 },
  error:     { fontSize: 12, marginTop: SPACING.sm },
  btn: { height: 52, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginTop: SPACING.sm },
  btnLabel: { fontSize: 16, fontWeight: '800' },
});
