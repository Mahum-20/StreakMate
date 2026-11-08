import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/core/theme';
import { useSky } from '@/core/environment/SkyContext';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  isPassword = false,
  containerStyle,
  ...props
}) => {
  const { colors, typography, borderRadius, spacing } = useTheme();
  let sky = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    sky = useSky();
  } catch {}

  const isDaytime = sky?.skyConfig.isDarkContent ?? true;
  const textPrimary = sky?.skyConfig.textPrimary || colors.textPrimary;
  const textMuted = sky?.skyConfig.textMuted || colors.textMuted;
  const accentColor = sky?.skyConfig.accent || colors.accent;
  const inputBg = isDaytime ? 'rgba(255, 255, 255, 0.94)' : 'rgba(15, 23, 42, 0.82)';
  const borderDefault = isDaytime ? 'rgba(15, 23, 42, 0.16)' : 'rgba(255, 255, 255, 0.24)';
  const labelColor = isDaytime ? '#0F172A' : '#FFFFFF';

  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const hasError = Boolean(error);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && (
        <Text
          style={[
            typography.caption,
            {
              color: hasError ? colors.danger : labelColor,
              fontWeight: '700',
              marginBottom: spacing.xs,
              letterSpacing: 0.2,
            },
          ]}
        >
          {label}
        </Text>
      )}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: inputBg,
            borderColor: hasError ? colors.danger : isFocused ? accentColor : borderDefault,
            borderRadius: borderRadius.md,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={18}
            color={hasError ? colors.danger : isFocused ? accentColor : textMuted}
            style={{ marginRight: spacing.sm }}
          />
        )}

        <TextInput
          placeholderTextColor={textMuted}
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[
            styles.textInput,
            typography.bodyMedium,
            { color: textPrimary },
          ]}
          {...props}
        />

        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <Text style={[typography.caption, { color: colors.danger, marginTop: spacing.xs }]}>
          {error}
        </Text>
      ) : helperText ? (
        <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
  },
  textInput: {
    flex: 1,
    height: '100%',
    paddingVertical: 0,
  },
});
