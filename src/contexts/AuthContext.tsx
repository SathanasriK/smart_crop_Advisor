import React, { createContext, useContext, useState, useCallback } from 'react';

export type UserRole = 'farmer' | 'admin';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  preferredLanguage: string;
  cropType: string;
  role: UserRole;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: Omit<User, 'id' | 'role'> & { password: string }) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo user for testing
const demoUser: User = {
  id: '1',
  name: 'Ramesh Kumar',
  email: 'ramesh@example.com',
  phone: '+91 98765 43210',
  location: 'Varanasi, Uttar Pradesh',
  preferredLanguage: 'hi',
  cropType: 'Rice, Wheat',
  role: 'farmer',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setUser(demoUser);
    setIsLoading(false);
  }, []);

  const register = useCallback(async (userData: Omit<User, 'id' | 'role'> & { password: string }) => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    const newUser: User = {
      ...userData,
      id: Date.now().toString(),
      role: 'farmer',
    };
    setUser(newUser);
    setIsLoading(false);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const updateProfile = useCallback((data: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...data } : null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
      updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
