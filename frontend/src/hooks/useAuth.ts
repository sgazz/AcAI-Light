import { useState, useEffect, useCallback } from 'react';

interface User {
  user_id: string;
  email: string;
  name: string;
  is_premium: boolean;
  avatar_url?: string;
  bio?: string;
  preferences?: Record<string, any>;
  created_at?: string;
  last_login?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
}

interface AuthResponse {
  status: string;
  data: {
    user_id: string;
    email: string;
    name: string;
    is_premium?: boolean;
    access_token: string;
    token_type: string;
    message?: string;
  };
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Proveri da li postoji sačuvan token pri učitavanju
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        setAuthState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error) {
        console.error('Greška pri parsiranju korisničkih podataka:', error);
        // Očisti nevažeće podatke
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        setAuthState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:8001/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Greška pri prijavi');
      }

      const data: AuthResponse = await response.json();
      
      if (data.status === 'success') {
        const user: User = {
          user_id: data.data.user_id,
          email: data.data.email,
          name: data.data.name,
          is_premium: data.data.is_premium || false,
        };

        // Sačuvaj podatke u localStorage
        localStorage.setItem('auth_token', data.data.access_token);
        localStorage.setItem('user_data', JSON.stringify(user));

        setAuthState({
          user,
          token: data.data.access_token,
          isAuthenticated: true,
          isLoading: false,
        });

        return true;
      } else {
        throw new Error('Greška pri prijavi');
      }
    } catch (error) {
      console.error('Greška pri prijavi:', error);
      return false;
    }
  }, []);

  const register = useCallback(async (userData: RegisterData): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:8001/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Greška pri registraciji');
      }

      const data: AuthResponse = await response.json();
      
      if (data.status === 'success') {
        const user: User = {
          user_id: data.data.user_id,
          email: data.data.email,
          name: data.data.name,
          is_premium: data.data.is_premium || false,
        };

        // Sačuvaj podatke u localStorage
        localStorage.setItem('auth_token', data.data.access_token);
        localStorage.setItem('user_data', JSON.stringify(user));

        setAuthState({
          user,
          token: data.data.access_token,
          isAuthenticated: true,
          isLoading: false,
        });

        return true;
      } else {
        throw new Error('Greška pri registraciji');
      }
    } catch (error) {
      console.error('Greška pri registraciji:', error);
      return false;
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      const token = localStorage.getItem('auth_token');
      
      if (token) {
        // Pozovi logout endpoint
        await fetch('http://localhost:8001/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Greška pri odjavi:', error);
    } finally {
      // Očisti lokalne podatke
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      
      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  const updateProfile = useCallback(async (profileData: Partial<User>): Promise<boolean> => {
    try {
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        throw new Error('Nema tokena za autentifikaciju');
      }

      const response = await fetch('http://localhost:8001/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Greška pri ažuriranju profila');
      }

      const data = await response.json();
      
      if (data.status === 'success') {
        // Ažuriraj lokalne podatke
        const updatedUser = authState.user ? { ...authState.user, ...profileData } as User : null;
        if (updatedUser) {
          localStorage.setItem('user_data', JSON.stringify(updatedUser));
          
          setAuthState(prev => ({
            ...prev,
            user: updatedUser,
          }));
        }

        return true;
      } else {
        throw new Error('Greška pri ažuriranju profila');
      }
    } catch (error) {
      console.error('Greška pri ažuriranju profila:', error);
      return false;
    }
  }, [authState.user]);

  const getProfile = useCallback(async (): Promise<User | null> => {
    try {
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        return null;
      }

      const response = await fetch('http://localhost:8001/auth/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Greška pri dohvatanju profila');
      }

      const data = await response.json();
      
      if (data.status === 'success') {
        const user: User = data.data.user;
        
        // Ažuriraj lokalne podatke
        localStorage.setItem('user_data', JSON.stringify(user));
        
        setAuthState(prev => ({
          ...prev,
          user,
        }));

        return user;
      } else {
        throw new Error('Greška pri dohvatanju profila');
      }
    } catch (error) {
      console.error('Greška pri dohvatanju profila:', error);
      return null;
    }
  }, []);

  return {
    user: authState.user,
    token: authState.token,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    login,
    register,
    logout,
    updateProfile,
    getProfile,
  };
} 