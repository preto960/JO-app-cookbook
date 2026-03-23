// src/components/FormField.tsx
// Label + TextInput + error message in one accessible unit.
// Cross-platform: web, iOS, Android.
import React, { forwardRef } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  TextInputProps, Platform, TouchableOpacity,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SPACING } from '../constants/theme';

interface Props extends TextInputProps {
  label:        string;
  error?:       string | null;
  /** Optional right-side action in the input (e.g., eye toggle) */
  rightElement?: React.ReactNode;
  /** Makes the text area tall for multi-line inputs */
  multiline?:   boolean;
  numberOfLines?: number;
  required?:    boolean;
}

const FormField = forwardRef<TextInput, Props>(({
  label, error, rightElement, required, style, multiline,
  numberOfLines = 4, ...inputProps
}, ref) => {
  const { colors } = useTheme();
  const hasError = !!error;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {label}{required ? <Text style={{ color: colors.danger }}> *</Text> : null}
      </Text>
      <View style={[
        styles.inputWrap,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor:     hasError ? colors.danger : colors.border,
        },
        multiline && styles.multilineWrap,
      ]}>
        <TextInput
          ref={ref}
          style={[
            styles.input,
            { color: colors.textPrimary },
            multiline && styles.multilineInput,
            Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {},
            style,
          ]}
          placeholderTextColor={colors.textMuted}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : undefined}
          textAlignVertical={multiline ? 'top' : 'center'}
          {...inputProps}
        />
        {rightElement && (
          <View style={styles.right}>{rightElement}</View>
        )}
      </View>
      {hasError && (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      )}
    </View>
  );
});

FormField.displayName = 'FormField';
export default FormField;

const styles = StyleSheet.create({
  container:     { marginBottom: SPACING.md },
  label: {
    fontSize: 12, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.7,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md, borderWidth: 1,
    paddingHorizontal: SPACING.md,
    minHeight: 48,
  },
  multilineWrap: {
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  input: {
    flex: 1, fontSize: 15,
    paddingVertical: Platform.OS === 'ios' ? 12 : 0,
  },
  multilineInput: {
    paddingVertical: 4,
    minHeight: 80,
  },
  right:  { marginLeft: 8 },
  error:  { fontSize: 12, marginTop: 4 },
});
