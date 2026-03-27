// src/screens/users/UserFormScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Switch, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useUsersRefresh } from '../../context/DataRefreshContext';
import { userService } from '../../services/api';
import { useApiCall } from '../../hooks/useApiCall';
import { FormField, SkeletonList, ThemedCard, ModalSheet, StatusBadge } from '../../components';
import PasswordInput from '../../components/PasswordInput';
import { SPACING, RADIUS } from '../../constants/theme';

interface Props {
  navigation: any;
  route: { params?: { userId?: string } };
}

const DEFAULT_ROLES = ['USER', 'ADMIN', 'DEVELOPER'];

// Normalize role value: accepts string or object with name/displayName
function normalizeRole(r: any): string {
  if (typeof r === 'string') return r;
  if (r && typeof r === 'object') {
    return r.name ?? r.displayName ?? r.id ?? String(r);
  }
  return String(r);
}

export default function UserFormScreen({ navigation, route }: Props) {
  const userId = route.params?.userId;
  const isEdit = !!userId;
  const { colors } = useTheme();
  const toast = useToast();
  const { notifyUsersChanged } = useUsersRefresh();

  const [email,     setEmail]     = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [role,      setRole]      = useState('USER');
  const [password,  setPassword]  = useState('');
  const [isActive,  setIsActive]  = useState(true);
  const [bio,       setBio]       = useState('');
  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [availableRoles, setAvailableRoles] = useState<string[]>(DEFAULT_ROLES);

  // Modal state for role picker
  const [roleSheet, setRoleSheet] = useState(false);

  const { execute: loadUser, loading: loadingUser } = useApiCall(userService.getById, {
    onSuccess: (user) => {
      setEmail(user.email);
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setRole(normalizeRole(user.role));
      setIsActive(user.isActive);
      setBio(user.bio ?? '');
    },
    onError: (e) => { toast.error('Failed to load user', e); navigation.navigate('Users'); },
  });

  const { execute: loadRoles } = useApiCall(userService.getRoles, {
    onSuccess: (roles) => {
      if (Array.isArray(roles) && roles.length) {
        const normalized = roles.map(normalizeRole).filter(Boolean);
        if (normalized.length) setAvailableRoles(normalized);
      }
    },
  });

  const { execute: createUser, loading: creating } = useApiCall(userService.create, {
    onSuccess: () => { 
      toast.success('User created');
      notifyUsersChanged(); // Notificar cambio global
      navigation.navigate('Users');
    },
    onError: (e) => toast.error('Create failed', e),
  });

  const { execute: updateUser, loading: updating } = useApiCall(userService.update, {
    onSuccess: () => { 
      toast.success('User updated');
      notifyUsersChanged(); // Notificar cambio global
      navigation.navigate('Users');
    },
    onError: (e) => toast.error('Update failed', e),
  });

  // Función para limpiar el formulario
  const clearForm = useCallback(() => {
    setEmail('');
    setFirstName('');
    setLastName('');
    setRole('USER');
    setPassword('');
    setIsActive(true);
    setBio('');
    setErrors({});
  }, []);

  // Efecto para configurar navegación
  useEffect(() => {
    navigation.setOptions({
      title: isEdit ? 'Edit user' : 'New user',
      headerLeft: () => (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Users')}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
      ),
    });
  }, [isEdit, colors.textPrimary, navigation]);

  // Efecto para cargar datos iniciales
  useEffect(() => {
    loadRoles();
    if (isEdit && userId) {
      loadUser(userId);
    } else {
      // Si no es edición, limpiar el formulario para un nuevo usuario
      clearForm();
    }
  }, [userId, isEdit, loadRoles, loadUser, clearForm]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email.trim())     e.email     = 'Email is required';
    if (!firstName.trim()) e.firstName = 'First name is required';
    if (!lastName.trim())  e.lastName  = 'Last name is required';
    if (!isEdit && password.length < 6) e.password = 'Min. 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (isEdit && userId) {
      await updateUser(userId, {
        email: email.trim(), firstName: firstName.trim(),
        lastName: lastName.trim(), role, isActive,
        bio: bio.trim() || undefined,
      });
    } else {
      await createUser({
        email: email.trim(), password,
        firstName: firstName.trim(), lastName: lastName.trim(),
        role, isActive, bio: bio.trim() || undefined,
      });
    }
  };


  const saving = creating || updating;

  if (isEdit && loadingUser) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SkeletonList count={6} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={true}
      nestedScrollEnabled={true}
    >
      {/* Basic info */}
      <ThemedCard title="Basic info">
        <FormField
          label="First name" value={firstName} onChangeText={setFirstName}
          placeholder="John" error={errors.firstName} required returnKeyType="next"
        />
        <FormField
          label="Last name" value={lastName} onChangeText={setLastName}
          placeholder="Doe" error={errors.lastName} required returnKeyType="next"
        />
        <FormField
          label="Email" value={email} onChangeText={setEmail}
          placeholder="john@example.com" error={errors.email} required
          keyboardType="email-address" autoCapitalize="none" returnKeyType="next"
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
        {/* Role picker — same pattern as RecipeFormScreen difficulty */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>ROLE</Text>
          <TouchableOpacity
            style={[styles.roleSelector, { borderColor: colors.border, backgroundColor: colors.background }]} 
            onPress={() => setRoleSheet(true)}
          >
            <Text style={[styles.roleLabel, { color: colors.textPrimary }]}>
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
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

        <View style={{ height: SPACING.md }} />
      </ThemedCard>

      <ThemedCard title="Profile (optional)">
        <FormField
          label="Bio" value={bio} onChangeText={setBio}
          placeholder="Short description…" multiline numberOfLines={3}
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


      <View style={{ height: SPACING.xl * 2 }} />

      {/* Role picker modal */}
      <ModalSheet
        visible={roleSheet}
        onClose={() => setRoleSheet(false)}
        title="Role"
        compact
      >
        {availableRoles.map((r) => (
          <TouchableOpacity
            key={r}
            style={[
              styles.sheetOption,
              { borderBottomColor: colors.border },
              r === role && { backgroundColor: colors.primaryDim },
            ]}
            onPress={() => { setRole(r); setRoleSheet(false); }}
          >
            <StatusBadge label={r} auto />
            {r === role && (
              <Ionicons name="checkmark" size={16} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </ModalSheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { padding: SPACING.md },

  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  fieldGroup: { marginBottom: SPACING.md },
  fieldLabel: {
    fontSize: 12, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.7,
    marginBottom: 6,
  },
  errorText:  { fontSize: 12, marginTop: 4 },

  // Role selector — matches RecipeFormScreen difficultySelector style
  roleSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    minHeight: 48,
  },
  roleLabel: { 
    fontSize: 15, 
    fontWeight: '500' 
  },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: SPACING.sm, borderTopWidth: 1, marginTop: 4,
  },
  toggleLabel: { fontSize: 15, fontWeight: '500' },
  toggleSub:   { fontSize: 12, marginTop: 2 },

  saveBtn: {
    height: 52, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  saveBtnText: { fontSize: 16, fontWeight: '800' },

  // Sheet option — same as RecipeFormScreen sheetOption
  sheetOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderRadius: RADIUS.sm,
  },
});
