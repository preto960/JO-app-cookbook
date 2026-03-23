// src/components/ActionMenu.tsx
// A floating action menu triggered by a kebab (⋮) button.
// Uses Modal for true cross-platform support: web, iOS, Android.
import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Modal, Pressable,
  StyleSheet, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SPACING } from '../constants/theme';

export interface MenuAction {
  label:    string;
  icon?:    React.ComponentProps<typeof Ionicons>['name'];
  onPress:  () => void;
  danger?:  boolean;
  disabled?: boolean;
}

interface Props {
  actions:  MenuAction[];
  /** Size of the trigger button. Default: 32 */
  size?:    number;
  /** Use 'ellipsis-horizontal' or 'ellipsis-vertical' icon */
  iconName?: React.ComponentProps<typeof Ionicons>['name'];
}

export default function ActionMenu({
  actions,
  size = 32,
  iconName = 'ellipsis-vertical',
}: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const filtered = actions.filter(a => !a.disabled);

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.trigger,
          { width: size, height: size, backgroundColor: colors.surfaceElevated },
        ]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Ionicons name={iconName} size={16} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal
        transparent
        animationType="fade"
        visible={open}
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={[
          styles.menu,
          {
            backgroundColor: colors.surface,
            borderColor:     colors.border,
            ...(Platform.OS === 'web'
              ? { boxShadow: '0 4px 20px rgba(0,0,0,0.18)' }
              : { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 12, elevation: 10 }),
          },
        ]}>
          {filtered.map((action, i) => (
            <TouchableOpacity
              key={action.label}
              style={[
                styles.item,
                i < filtered.length - 1 && [styles.itemBorder, { borderBottomColor: colors.border }],
              ]}
              onPress={() => { setOpen(false); action.onPress(); }}
              activeOpacity={0.7}
            >
              {action.icon && (
                <Ionicons
                  name={action.icon}
                  size={16}
                  color={action.danger ? colors.danger : colors.textSecondary}
                />
              )}
              <Text style={[
                styles.itemLabel,
                { color: action.danger ? colors.danger : colors.textPrimary },
              ]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    borderRadius: RADIUS.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  },
  menu: {
    position: 'absolute',
    right: 16,
    top: Platform.OS === 'ios' ? 100 : 60,
    width: 200,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: SPACING.md,
  },
  itemBorder: { borderBottomWidth: 1 },
  itemLabel: { fontSize: 14, fontWeight: '500' },
});
