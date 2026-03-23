// src/components/SearchBar.tsx
// Debounced search input with clear button.
// Cross-platform: web, iOS, Android.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, TextInput, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SPACING } from '../constants/theme';

interface Props {
  placeholder?: string;
  value?:       string;
  onSearch:     (value: string) => void;
  debounceMs?:  number;
  autoFocus?:   boolean;
}

export default function SearchBar({
  placeholder = 'Search…',
  value: controlled,
  onSearch,
  debounceMs = 350,
  autoFocus = false,
}: Props) {
  const { colors } = useTheme();
  const [text, setText] = useState(controlled ?? '');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync controlled value
  useEffect(() => {
    if (controlled !== undefined && controlled !== text) setText(controlled);
  }, [controlled]);

  const handleChange = useCallback((val: string) => {
    setText(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSearch(val), debounceMs);
  }, [onSearch, debounceMs]);

  const handleClear = useCallback(() => {
    setText('');
    if (timerRef.current) clearTimeout(timerRef.current);
    onSearch('');
  }, [onSearch]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return (
    <View style={[
      styles.container,
      { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
    ]}>
      <Ionicons name="search-outline" size={17} color={colors.textMuted} />
      <TextInput
        style={[styles.input, { color: colors.textPrimary }]}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={text}
        onChangeText={handleChange}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        autoFocus={autoFocus}
        clearButtonMode="never"
        {...(Platform.OS === 'web' ? ({ style: [styles.input, { color: colors.textPrimary, outlineStyle: 'none' }] } as any) : {})}
      />
      {text.length > 0 && (
        <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close-circle" size={17} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
});
