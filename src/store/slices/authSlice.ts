import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Define a minimal shape for the authenticated user we store in Redux.
// Extend this as needed to match your auth provider (e.g., Supabase) user object.
export interface AuthUser {
    id: string;
    email?: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
}

export interface AuthState {
    user: AuthUser | null;
    isAuth: boolean;
    loading: boolean;
    error: string | null;
}

const initialState: AuthState = {
    user: null,
    isAuth: false,
    loading: false,
    error: null,
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setUser: (
            state,
            action: PayloadAction<{ user: AuthUser | null; isAuth: boolean }>
        ) => {
            state.user = action.payload.user;
            state.isAuth = action.payload.isAuth;
        },
        clearUser: (state) => {
            state.user = null;
            state.isAuth = false;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.loading = action.payload;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
    },
});

export const { setUser, clearUser, setLoading, setError } = authSlice.actions;
export default authSlice.reducer;