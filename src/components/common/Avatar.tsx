import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/core/theme';

export interface AvatarProps {
  name: string;
  imageUrl?: string | null;
  size?: number;
  style?: ViewStyle;
}

export const Avatar: React.FC<AvatarProps> = ({ name, imageUrl, size = 40, style }) => {
  const { colors, typography } = useTheme();

  const getInitials = (str: string): string => {
    if (!str) return '?';
    const parts = str.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const fontSize = Math.floor(size * 0.4);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.surfaceSubtle,
          borderColor: colors.border,
          borderWidth: 1,
        },
        style,
      ]}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      ) : (
        <Text
          style={[
            typography.headline,
            {
              fontSize,
              lineHeight: size,
              color: colors.textPrimary,
              textAlign: 'center',
            },
          ]}
        >
          {getInitials(name)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
