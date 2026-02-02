import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { TextInput as RNTextInput, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { LightColors, useTheme } from '../context/ThemeContext';

interface CustomTextInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'decimal-pad' | 'number-pad' | 'url' | 'ascii-capable' | 'numbers-and-punctuation' | 'name-phone-pad' | 'twitter' | 'web-search';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: string;
  focused?: boolean;
  style?: StyleProp<ViewStyle>;
  inputStyle?: TextStyle;
  mainStyle?: StyleProp<ViewStyle>;
  showPasswordToggle?: boolean;
  togglePosition?: 'left' | 'right';
  maxLength?: number;
  editable?: boolean;
  multiline?: boolean;
  forceLight?: boolean;
  required?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
}

export default function CustomTextInput({
  label,
  placeholder,
  value,
  onChangeText,
  onFocus,
  onBlur,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  error,
  focused = false,
  style,
  inputStyle,
  mainStyle,
  showPasswordToggle = false,
  togglePosition = 'right',
  maxLength,
  editable = true,
  multiline = false,
  forceLight = false,
  required = false,
  icon,
  rightIcon,
}: CustomTextInputProps) {
  const { isDark: globalIsDark, colors: themeColors } = useTheme();

  // Use light theme colors if forceLight is true, otherwise use global theme colors
  const isDark = forceLight ? false : globalIsDark;
  const colors = forceLight ? LightColors : themeColors;

  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const getContainerStyle = () => {
    const baseStyle: any[] = [
      styles.inputContainer,
      {
        backgroundColor: isDark ? colors.surface : 'rgba(255, 255, 255, 0.8)',
        borderColor: isDark ? colors.border : 'rgba(51, 51, 51, 0.2)'
      }
    ];
    if (isFocused || focused) {
      baseStyle.push({
        borderColor: colors.primary,
        backgroundColor: isDark ? colors.surface : 'rgba(255, 255, 255, 0.95)',
      });
    }
    if (error) {
      baseStyle.push(styles.inputError);
    }
    if (style) {
      baseStyle.push(style);
    }
    return baseStyle;
  };

  const renderToggle = () => (
    <View style={styles.passwordToggle}>
      <RNTextInput
        value=""
        style={styles.hiddenInput}
        secureTextEntry={false}
      />
      <View style={[styles.toggleButton, togglePosition === 'left' ? styles.toggleButtonLeft : styles.toggleButtonRight]}>
        <Ionicons
          name={!showPassword ? 'eye-off' : 'eye'}
          size={20}
          color={colors.textSecondary}
          onPress={togglePasswordVisibility}
        />
      </View>
    </View>
  );

  return (
    <View style={[styles.inputGroup, mainStyle]}>
      {label && (
        <Text style={[styles.label, { color: isDark ? colors.textSecondary : '#333' }]}>
          {label}
          {required && <Text style={{ color: '#EF4444' }}> *</Text>}
        </Text>
      )}
      <View style={getContainerStyle()}>
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={colors.textSecondary}
            style={{ marginRight: 8 }}
          />
        )}
        {showPasswordToggle && togglePosition === 'left' && renderToggle()}
        <RNTextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={isDark ? colors.textSecondary + '70' : 'rgba(51,51,51,0.5)'}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          style={[
            styles.input,
            { color: colors.text },
            !editable && { opacity: 0.6 },
            inputStyle,
            multiline && { height: 100, textAlignVertical: 'top' }
          ]}
          maxLength={maxLength}
          editable={editable}
          multiline={multiline}
          verticalAlign='top'
        />
        {showPasswordToggle && togglePosition === 'right' && renderToggle()}
        {rightIcon && (
          <Ionicons
            name={rightIcon}
            size={20}
            color={colors.textSecondary}
            style={{ marginLeft: 8 }}
          />
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputContainer: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputError: {
    borderColor: 'rgba(239, 68, 68, 0.8)',
  },
  input: {
    fontSize: 16,
    paddingVertical: 12,
    flex: 1,
  },
  passwordToggle: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
  },
  toggleButton: {
    padding: 8,
  },
  toggleButtonRight: {
    marginRight: -8,
  },
  toggleButtonLeft: {
    marginLeft: -8,
    marginRight: 4,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginTop: 6,
    fontWeight: '500',
  },
});
