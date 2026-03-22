// src/components/PasswordInput.tsx
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SPACING } from '../constants/theme';

interface PasswordInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  returnKeyType?: 'done' | 'next' | 'go' | 'search' | 'send';
  onSubmitEditing?: () => void;
  wrapperStyle?: object;
}

export default function PasswordInput({
  value,
  onChangeText,
  placeholder = '••••••••',
  returnKeyType = 'done',
  onSubmitEditing,
  wrapperStyle,
}: PasswordInputProps) {
  const { colors } = useTheme();
  const [show, setShow] = useState(false);

  return (
    <View
      style={[
        styles.wrapper,
        { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
        wrapperStyle,
      ]}
    >
      <TextInput
        style={[styles.input, { color: colors.textPrimary }]}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!show}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <TouchableOpacity
        onPress={() => setShow(v => !v)}
        style={styles.eyeBtn}
        activeOpacity={0.7}
        accessibilityLabel={show ? 'Hide password' : 'Show password'}
        accessibilityRole="button"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name={show ? 'eye-outline' : 'eye-off-outline'}
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    height: 52,
  },
  input: {
    flex: 1,
    fontSize: 15,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  eyeBtn: {
    padding: 4,
    marginLeft: 4,
  },
});
