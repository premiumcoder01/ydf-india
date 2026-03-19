import { getApiUrl } from '@/utils/apiConfig';
import { useFocusEffect } from 'expo-router';
import React, { createContext, useCallback, useContext, useReducer } from 'react';

// ==========================================
// Type Definitions for Dropdown Data
// ==========================================

export interface Option {
    value: string;
    label: string;
}

export interface DropdownField {
    shortname: string;
    name: string;
    options: Option[];
}

export interface DropdownData {
    course_fields: DropdownField[];
    user_fields: DropdownField[];
}

export interface DropdownState {
    data: DropdownData | null;
    loading: boolean;
    error: string | null;
}

// ==========================================
// Action Types
// ==========================================

type DropdownAction =
    | { type: 'FETCH_START' }
    | { type: 'FETCH_SUCCESS'; payload: DropdownData }
    | { type: 'FETCH_FAILURE'; payload: string }
    | { type: 'CLEAR_ERROR' };

// ==========================================
// Initial State
// ==========================================

const initialState: DropdownState = {
    data: null,
    loading: false,
    error: null,
};

// ==========================================
// Reducer Function
// ==========================================

function dropdownReducer(state: DropdownState, action: DropdownAction): DropdownState {
    switch (action.type) {
        case 'FETCH_START':
            return {
                ...state,
                loading: true,
                error: null
            };
        case 'FETCH_SUCCESS':
            return {
                ...state,
                loading: false,
                data: action.payload,
                error: null
            };
        case 'FETCH_FAILURE':
            return {
                ...state,
                loading: false,
                error: action.payload
            };
        case 'CLEAR_ERROR':
            return {
                ...state,
                error: null
            };
        default:
            return state;
    }
}

// ==========================================
// Context Definition
// ==========================================

interface DropdownContextType {
    state: DropdownState;
    dispatch: React.Dispatch<DropdownAction>;
    fetchDropdowns: () => Promise<void>;
    getOptionsByShortname: (shortname: string) => Option[];
    getFieldLabel: (shortname: string) => string;
}

const DropdownContext = createContext<DropdownContextType | undefined>(undefined);

// ==========================================
// API Endpoint
// ==========================================

const DROPDOWNS_API_URL = `${getApiUrl("webservice/rest/server.php")}?wstoken=39e3dcfa413a307c06e125c09d88c268&wsfunction=local_mobileapi_get_dropdown_definitions&moodlewsrestformat=json`;
console.log(DROPDOWNS_API_URL)

// ==========================================
// Provider Component
// ==========================================

export const DropdownProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(dropdownReducer, initialState);

    const fetchDropdowns = useCallback(async () => {
        dispatch({ type: 'FETCH_START' });
        try {
            const response = await fetch(DROPDOWNS_API_URL);
            const result = await response.json();

            if (result.success && result.data) {
                dispatch({ type: 'FETCH_SUCCESS', payload: result.data });
            } else {
                dispatch({
                    type: 'FETCH_FAILURE',
                    payload: result.message || 'Failed to fetch dropdown definitions'
                });
            }
        } catch (error: any) {
            dispatch({
                type: 'FETCH_FAILURE',
                payload: error.message || 'An error occurred while fetching dropdowns'
            });
        }
    }, []);



    useFocusEffect(
        useCallback(() => {
            fetchDropdowns(); // 🔄 Fetches live data from Admin every time you visit!
        }, [fetchDropdowns])
    );

    /**
     * Helper to get options list by shortname
     * Looks into both course_fields and user_fields
     */
    const getOptionsByShortname = useCallback((shortname: string): Option[] => {
        if (!state.data) return [];

        // Search in course_fields
        const courseField = state.data.course_fields?.find(
            field => field.shortname === shortname || field.shortname.trim() === shortname.trim()
        );
        if (courseField) return courseField.options;

        // Search in user_fields
        const userField = state.data.user_fields?.find(
            field => field.shortname === shortname || field.shortname.trim() === shortname.trim()
        );
        if (userField) return userField.options;

        return [];
    }, [state.data]);

    /**
     * Helper to get the human readable name of the field
     */
    const getFieldLabel = useCallback((shortname: string): string => {
        if (!state.data) return '';

        const courseField = state.data.course_fields?.find(field => field.shortname === shortname);
        if (courseField) return courseField.name;

        const userField = state.data.user_fields?.find(field => field.shortname === shortname);
        if (userField) return userField.name;

        return '';
    }, [state.data]);

    return (
        <DropdownContext.Provider
            value={{
                state,
                dispatch,
                fetchDropdowns,
                getOptionsByShortname,
                getFieldLabel
            }}
        >
            {children}
        </DropdownContext.Provider>
    );
};

// ==========================================
// Custom Hook for Consumption
// ==========================================

export const useDropdowns = () => {
    const context = useContext(DropdownContext);
    if (context === undefined) {
        throw new Error('useDropdowns must be used within a DropdownProvider');
    }
    return context;
};
