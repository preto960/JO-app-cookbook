// src/screens/users/UserFormScreen.tsx
// Create or edit a user. userId in route params = edit mode.
// Cross-platform: web, iOS, Android.
import React, { useEffect, useState } from 'react';
import {
  View, ScrollView, StyleSheet, Switch, Text, TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { userService } from '../../services/api';
import { useApiCall } from '../../hooks/useApiCall';
import { FormField, ModalSheet, SkeletonList, ThemedCard } from '../../components';
import PasswordInput from '../../components/PasswordInput';
import { SPACING, RADIUS } from '../../constants/theme';

interface Props {
  navigation: any;
  route: { params?: { userId?: string } };
}

const DEFAULT_ROLES = ['USER', 'ADMIN', 'DEVELOPER'];

export default function UserFormScreen({ navigation, route }: Props) {
  const userId   = route.params?.userId;
  const isEdit   = !!userId;
  const { colors } = useTheme();
  const toast    = useToast();

  // Form state
  const [email,     setEmail]     = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [role,      setRole]      = useState('USER');
  const [password,  setPassword]  = useState('');
  const [isActive,  setIsActive]  = useState(true);
  const [bio,       setBio]       = useState('');
  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [roleSheetOpen, setRoleSheetOpen] = useState(false);

  // Available roles
  const [availableRoles, setAvailableRoles] = useState<string[]>(DEFAULT_ROLES);

  const { execute: loadUser, loading: loadingUser } = useApiCall(userService.getById, {
    onSuccess: (user) => {
      setEmail(user.email);
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setRole(user.role);
      setIsActive(user.isActive);
      setBio(user.bio ?? '');
    },
    onError: (e) => { toast.error('Failed to load user', e); navigation.goBack(); },
  });

  const { execute: loadRoles } = useApiCall(userService.getRoles, {
    onSuccess: (roles) => setAvailableRoles(roles.length ? roles : DEFAULT_ROLES),
  });

  const { execute: createUser, loading: creating } = useApiCall(userService.create, {
    onSuccess: () => { toast.success('User created'); navigation.goBack(); },
    onError: (e) => toast.error('Create failed', e),
  });

  const { execute: updateUser, loading: updating } = useApiCall(userService.update, {
    onSuccess: () => { toast.success('User updated'); navigation.goBack(); },
    onError: (e) => toast.error('Update failed', e),
  });

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Edit user' : 'New user' });
    loadRoles();
    if (isEdit && userId) loadUser(userId);
  }, [userId]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email.trim())     e.email     = 'Email is required';
    if (!firstName.trim()) e.firstName = 'First name is required';
    if (!lastName.trim())  e.lastName  = 'Last name is required';
    if (!isEdit && password.length < 6) e.password = 'Password must be at least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (isEdit && userId) {
      await updateUser(userId, { email: email.trim(), firstName: firstName.trim(), lastName: lastName.trim(), role, isActive, bio: bio.trim() || undefined });
    } else {
      await createUser({ email: email.trim(), password, firstName: firstName.trim(), lastName: lastName.trim(), role, isActive, bio: bio.trim() || undefined });
    }
  };

  const saving = creating || updating;

  if (isEdit && loadingUser) {
    return <View style={[styles.container, { backgroundColor: colors.background }]}><SkeletonList count={6} /></View>;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <ThemedCard title="Basic info">
        <FormField
          label="First name"
          value={firstName}
          onChangeText={setFirstName}
          placeholder="John"
          error={errors.firstName}
          required
          returnKeyType="next"
        />
        <FormField
          label="Last name"
          value={lastName}
          onChangeText={setLastName}
          placeholder="Doe"
          error={errors.lastName}
          required
          returnKeyType="next"
        />
        <FormField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="john@example.com"
          error={errors.email}
          required
          keyboardType="email-address"
          autoCapitalize="none"
          returnKeyType="next"
        />
      </ThemedCard>

      {!isEdit && (
        <ThemedCard title="Password">
          <View style={{ marginBottom: SPACING.sm }}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              PASSWORD <Text style={{ color: colors.danger }}>*</Text>
            </Text>
            <PasswordInput
              value={password}
              onChangeText={setPassword}
              placeholder="Min. 6 characters"
              returnKeyType="next"
            />
            {errors.password && (
              <Text style={[styles.errorText, { color: colors.danger }]}>{errors.password}</Text>
            )}
          </View>
        </ThemedCard>
      )}

      <ThemedCard title="Role & status">
        {/* Role selector */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>ROLE</Text>
          <TouchableOpacity
            style={[styles.selector, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
            onPress={() => setRoleSheetOpen(true)}
          >
            <Text style={[styles.selectorValue, { color: colors.textPrimary }]}>{role}</Text>
            <Text style={{ color: colors.textMuted }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Active toggle */}
        <View style={[styles.toggleRow, { borderTopColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>Active</Text>
            <Text style={[styles.toggleSub, { color: colors.textSecondary }]}>User can sign in</Text>
          </View>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={isActive ? colors.background : colors.textSecondary}
          />
        </View>
      </ThemedCard>

      <ThemedCard title="Profile (optional)">
        <FormField
          label="Bio"
          value={bio}
          onChangeText={setBio}
          placeholder="Short description…"
          multiline
          numberOfLines={3}
        />
      </ThemedCard>

      {/* Save button */}
      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
        onPress={handleSubmit}
        disabled={saving}
      >
        <Text style={[styles.saveBtnText, { color: colors.background }]}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create user'}
        </Text>
      </TouchableOpacity>

      <View style={{ height: SPACING.xl }} />

      {/* Role picker sheet */}
      <ModalSheet
        visible={roleSheetOpen}
        onClose={() => setRoleSheetOpen(false)}
        title="Select role"
      >
        {availableRoles.map((r) => (
          <TouchableOpacity
            key={r}
            style={[
              styles.roleOption,
              { borderBottomColor: colors.border },
              r === role && { backgroundColor: colors.primaryDim },
            ]}
            onPress={() => { setRole(r); setRoleSheetOpen(false); }}
          >
            <Text style={[styles.roleLabel, { color: r === role ? colors.primary : colors.textPrimary }]}>
              {r}
            </Text>
            {r === role && <Text style={{ color: colors.primary }}>✓</Text>}
          </TouchableOpacity>
        ))}
      </ModalSheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { padding: SPACING.lg },
  fieldLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6 },
  errorText:  { fontSize: 12, marginTop: 4 },
  fieldGroup: { marginBottom: SPACING.md },
  selector: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    height: 48, borderRadius: RADIUS.md, borderWidth: 1,
    paddingHorizontal: SPACING.md,
  },
  selectorValue: { fontSize: 15 },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: SPACING.md, borderTopWidth: 1, marginTop: 4,
  },
  toggleLabel: { fontSize: 15, fontWeight: '500' },
  toggleSub:   { fontSize: 12, marginTop: 2 },
  saveBtn: {
    height: 52, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  saveBtnText: { fontSize: 16, fontWeight: '800' },
  roleOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: SPACING.md,
    borderBottomWidth: 1, borderRadius: RADIUS.sm,
  },
  roleLabel: { fontSize: 15, fontWeight: '500' },
});
