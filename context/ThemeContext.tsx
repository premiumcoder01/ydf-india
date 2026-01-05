import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
    theme: ThemeMode;
    toggleTheme: () => void;
    isDark: boolean;
    colors: typeof LightColors;
}

export const LightColors = {
    background: '#F9FAFB',
    surface: '#FFFFFF',
    text: '#111827',
    textSecondary: '#6B7280',
    primary: '#6366F1', // Indigo primary for a modern look
    accent: '#F2C44D', // Gold as accent
    secondary: '#1F2937',
    border: '#E5E7EB',
    error: '#EF4444',
    success: '#10B981',
    card: '#FFFFFF',
    inputBg: '#FFFFFF',
    divider: '#F3F4F6',
};

export const DarkColors = {
    background: '#0F172A',
    surface: '#1E293B',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    primary: '#818CF8', // Lighter Indigo for Dark Mode
    accent: '#F2C44D', // Keep Gold accent
    secondary: '#F1F5F9',
    border: '#334155',
    error: '#F87171',
    success: '#34D399',
    card: '#1E293B',
    inputBg: '#334155',
    divider: '#334155',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [theme, setTheme] = useState<ThemeMode>('light');

    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem('user-theme');
            if (savedTheme) {
                setTheme(savedTheme as ThemeMode);
            } else if (systemColorScheme) {
                setTheme(systemColorScheme);
            }
        } catch (error) {
            console.error('Failed to load theme', error);
        }
    };

    const toggleTheme = async () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        try {
            await AsyncStorage.setItem('user-theme', newTheme);
        } catch (error) {
            console.error('Failed to save theme', error);
        }
    };

    const isDark = theme === 'dark';
    const colors = isDark ? DarkColors : LightColors;

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, isDark, colors }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
