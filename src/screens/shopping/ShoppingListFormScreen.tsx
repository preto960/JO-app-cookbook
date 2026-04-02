// @ts-nocheck
// src/screens/shopping/ShoppingListFormScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useDataRefresh } from '../../context/DataRefreshContext';
import { RADIUS, SPACING } from '../../constants/theme';
import { shoppingListService } from '../../services/api';
import type { ShoppingList } from '../../types/api.types';

import { useApiCall } from '../../hooks';
import { FormField, SkeletonLoader } from '../../components';

interface RouteParams {
  listId?: string;
}

export default function ShoppingListFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { listId } = (route.params as RouteParams) ?? {};
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { triggerRefresh } = useDataRefresh();

  const isEditing = Boolean(listId);

  // ── State ──
  const [form, setForm] = useState({
    name: '',
    description: '',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  // ── Load existing list for editing ──
  const {
    data: existingList,
    loading,
    error,
  } = useApiCall(
    () => (listId ? shoppingListService.getById(listId) : Promise.resolve(null)),
    [listId]
  );

  // ── Effects ──
  useEffect(() => {
    if (existingList) {
      setForm({
        name: existingList.name,
        description: existingList.description || '',
        isActive: existingList.isActive,
      });
    }
  }, [existingList]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: isEditing ? 'Edit Shopping List' : 'New Shopping List',
      headerRight: () => (
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || !form.name.trim()}
          style={[
            styles.saveBtn,
            {
              backgroundColor: saving || !form.name.trim() ? colors.textMuted : colors.primary,
            },
          ]}
        >
          <Text style={[styles.saveBtnText, { color: colors.background }]}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, form, saving, isEditing]);

  // ── Handlers ──
  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('error', 'List name is required');
      return;
    }

    setSaving(true);
    try {
      if (isEditing && listId) {
        await shoppingListService.update(listId, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          isActive: form.isActive,
        });
        showToast('success', 'Shopping list updated successfully');
      } else {
        const newList = await shoppingListService.create({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
        });
        showToast('success', 'Shopping list created successfully');
        navigation.navigate('ShoppingListDetail', { listId: newList.id });
        return;
      }
      navigation.goBack();
    } catch (err) {
      showToast(
        'error',
        isEditing ? 'Failed to update shopping list' : 'Failed to create shopping list'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!listId) return;

    Alert.alert(
      'Delete Shopping List',
      'Are you sure you want to delete this shopping list? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await shoppingListService.delete(listId);
              showToast('success', 'Shopping list deleted successfully');
              triggerRefresh('shoppingLists');
              navigation.navigate('ShoppingLists');
            } catch (err) {
              showToast('error', 'Failed to delete shopping list');
            }
          },
        },
      ]
    );
  };

  // ── Render ──
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SkeletonLoader count={3} />
      </View>
    );
  }

  if (error && isEditing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
            Error Loading List
          </Text>
          <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
            Please try again later
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.retryBtnText, { color: colors.background }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Basic Info ── */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Basic Information</Text>
          
          <FormField
            label="List Name"
            value={form.name}
            onChangeText={(value) => setForm(prev => ({ ...prev, name: value }))}
            placeholder="e.g., Weekly Groceries, Party Shopping..."
            required
          />
          
          <FormField
            label="Description"
            value={form.description}
            onChangeText={(value) => setForm(prev => ({ ...prev, description: value }))}
            placeholder="Optional description for this list"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* ── Settings ── */}
        {isEditing && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Settings</Text>
            
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setForm(prev => ({ ...prev, isActive: !prev.isActive }))}
            >
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Active List</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Active lists appear in the main list and can be used for shopping
                </Text>
              </View>
              <View style={[
                styles.toggle,
                {
                  backgroundColor: form.isActive ? colors.primary : colors.border,
                },
              ]}>
                <View style={[
                  styles.toggleThumb,
                  {
                    backgroundColor: colors.background,
                    transform: [{ translateX: form.isActive ? 20 : 2 }],
                  },
                ]} />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Actions ── */}
        {isEditing && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Actions</Text>
            
            <TouchableOpacity
              style={[styles.actionBtn, styles.dangerBtn, { borderColor: colors.danger }]}
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
              <Text style={[styles.actionBtnText, { color: colors.danger }]}>Delete List</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  contentContainer: { padding: SPACING.lg },

  saveBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    marginRight: 16,
  },
  saveBtnText: { fontSize: 14, fontWeight: '600' },

  section: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  settingInfo: { flex: 1, marginRight: SPACING.md },
  settingLabel: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  settingDescription: { fontSize: 13 },
  
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    position: 'relative',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: 'absolute',
  },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  dangerBtn: {},
  actionBtnText: { fontSize: 16, fontWeight: '600' },

  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  errorTitle: { fontSize: 18, fontWeight: '700' },
  errorMessage: { fontSize: 14, textAlign: 'center' },
  retryBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
  },
  retryBtnText: { fontSize: 16, fontWeight: '600' },
});