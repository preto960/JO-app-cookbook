// src/components/InlineSelect.tsx
// Selector inline que despliega opciones en un panel dentro del scroll,
// sin abrir ningún modal externo ni pantalla en blanco.
// Compatible: web, iOS, Android.
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SPACING } from '../constants/theme';

export interface SelectOption {
  label: string;
  value: string;
  /** Ícono opcional de Ionicons */
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}

interface Props {
  label:      string;
  options:    SelectOption[];
  value:      string | null;
  onChange:   (value: string) => void;
  placeholder?: string;
  required?:  boolean;
}

export default function InlineSelect({
  label, options, value, onChange, placeholder = 'Select…', required,
}: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const selected = options.find(o => o.value === value);

  return (
    <View style={styles.container}>
      {/* Label */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {label}{required ? <Text style={{ color: colors.danger }}> *</Text> : null}
      </Text>

      {/* Trigger */}
      <TouchableOpacity
        style={[
          styles.trigger,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: open ? colors.primary : colors.border,
          },
        ]}
        onPress={() => setOpen(v => !v)}
        activeOpacity={0.8}
      >
        <Text style={[
          styles.triggerText,
          { color: selected ? colors.textPrimary : colors.textMuted },
        ]}>
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textMuted}
        />
      </TouchableOpacity>

      {/* Dropdown inline */}
      {open && (
        <View style={[
          styles.dropdown,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            ...(require('react-native').Platform.OS === 'web'
              ? { boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }
              : { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 8 }),
          },
        ]}>
          {options.map((opt, i) => {
            const active = opt.value === value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.option,
                  active && { backgroundColor: colors.primaryDim },
                  i < options.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
                onPress={() => { onChange(opt.value); setOpen(false); }}
                activeOpacity={0.7}
              >
                {opt.icon && (
                  <Ionicons name={opt.icon} size={14} color={active ? colors.primary : colors.textSecondary} />
                )}
                <Text style={[
                  styles.optionText,
                  { color: active ? colors.primary : colors.textPrimary },
                ]}>
                  {opt.label}
                </Text>
                {active && (
                  <Ionicons name="checkmark" size={14} color={colors.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { marginBottom: SPACING.md },
  label: {
    fontSize: 12, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.7,
    marginBottom: 6,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
  },
  triggerText: { fontSize: 15, flex: 1 },
  dropdown: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginTop: 4,
    overflow: 'hidden',
    zIndex: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
  },
  optionText: { fontSize: 14, fontWeight: '500', flex: 1 },
});
