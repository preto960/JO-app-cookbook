// src/components/ActionMenu.tsx
// A floating action menu triggered by a kebab (⋮) button.
// Uses Modal + measured anchor position for true cross-platform support.
import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Modal, Pressable,
  StyleSheet, Platform, findNodeHandle, UIManager,
  Dimensions,
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

interface MenuPosition {
  top: number;
  right: number;
}

interface Props {
  actions:  MenuAction[];
  size?:    number;
  iconName?: React.ComponentProps<typeof Ionicons>['name'];
}

const MENU_WIDTH = 200;
const ITEM_HEIGHT = 46;

export default function ActionMenu({
  actions,
  size = 32,
  iconName = 'ellipsis-vertical',
}: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPosition>({ top: 60, right: 16 });
  const triggerRef = useRef<View>(null);

  const filtered = actions.filter(a => !a.disabled);

  const measureAndOpen = useCallback(() => {
    if (!triggerRef.current) {
      setOpen(true);
      return;
    }

    const handle = findNodeHandle(triggerRef.current);
    if (!handle) {
      setOpen(true);
      return;
    }

    UIManager.measure(handle, (x, y, width, height, pageX, pageY) => {
      const screenWidth = Dimensions.get('window').width;
      const screenHeight = Dimensions.get('window').height;
      const menuHeight = filtered.length * ITEM_HEIGHT + 2;

      // Position menu below trigger, aligned to right edge
      let top = pageY + height + 4;
      let right = screenWidth - (pageX + width);

      // Flip up if not enough space below
      if (top + menuHeight > screenHeight - 20) {
        top = pageY - menuHeight - 4;
      }

      // Clamp right so menu doesn't go off-screen
      right = Math.max(8, Math.min(right, screenWidth - MENU_WIDTH - 8));

      setMenuPos({ top, right });
      setOpen(true);
    });
  }, [filtered.length]);

  const menuShadow = Platform.select({
    web: { boxShadow: '0 4px 20px rgba(0,0,0,0.18)' } as any,
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.16,
      shadowRadius: 12,
      elevation: 10,
    },
  });

  return (
    <View>
      <TouchableOpacity
        ref={triggerRef}
        style={[
          styles.trigger,
          { width: size, height: size, backgroundColor: colors.surfaceElevated },
        ]}
        onPress={measureAndOpen}
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
        <View
          style={[
            styles.menu,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              top: menuPos.top,
              right: menuPos.right,
            },
            menuShadow,
          ]}
        >
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
    width: MENU_WIDTH,
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
    minHeight: 46,
  },
  itemBorder: { borderBottomWidth: 1 },
  itemLabel: { fontSize: 14, fontWeight: '500' },
});
