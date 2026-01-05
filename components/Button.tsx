import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';
import { LightColors, useTheme } from '../context/ThemeContext';

interface ButtonProps {
  title?: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'social';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  activeOpacity?: number;
  children?: React.ReactNode;
  forceLight?: boolean;
}

export default function Button({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  style,
  textStyle,
  activeOpacity = 0.8,
  children,
  forceLight = false,
}: ButtonProps) {
  const { isDark: globalIsDark, colors: themeColors } = useTheme();

  const isDark = forceLight ? false : globalIsDark;
  const colors = forceLight ? LightColors : themeColors;

  const getButtonStyle = (): StyleProp<ViewStyle> => {
    const baseStyle: any[] = [styles.button];

    if (variant === 'primary') {
      baseStyle.push({ backgroundColor: isDark ? colors.primary : '#333' });
    } else if (variant === 'secondary') {
      baseStyle.push({
        backgroundColor: isDark ? colors.surface : 'rgba(255, 255, 255, 0.8)',
        borderColor: isDark ? colors.border : 'rgba(51, 51, 51, 0.3)',
        borderWidth: 1.5
      });
    } else if (variant === 'social') {
      baseStyle.push(styles.social);
      baseStyle.push({
        backgroundColor: isDark ? colors.surface : 'rgba(255, 255, 255, 0.8)',
        borderColor: isDark ? colors.border : 'rgba(51, 51, 51, 0.3)',
      });
    }

    if (disabled || loading) {
      baseStyle.push(styles.disabled);
    }

    baseStyle.push(style);
    return baseStyle;
  };

  const getTextStyle = (): StyleProp<TextStyle> => {
    const baseTextStyle: any[] = [styles.text];

    if (variant === 'primary') {
      baseTextStyle.push({ color: '#fff' });
    } else {
      baseTextStyle.push({ color: colors.text });
    }

    baseTextStyle.push(textStyle);
    return baseTextStyle;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={getButtonStyle()}
      activeOpacity={activeOpacity}
    >
      {children || (
        <Text style={getTextStyle()}>
          {loading ? 'Loading...' : title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  social: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    paddingVertical: 0,
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: 0.5,
  },
});
