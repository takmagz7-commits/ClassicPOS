"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { User, UserRole } from "@/types/user";
import { useLoading } from "@/context/LoadingContext";
import { logger } from "@/utils/logger";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getApiBaseUrl } from "@/utils/platformConfig";
import { ensureDatabaseReady } from "@/utils/databaseHealth";

const API_BASE_URL = getApiBaseUrl();

interface LoginResult {
  success: boolean;
  mfaRequired?: boolean;
  userId?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, totpCode?: string, backupCode?: string) => Promise<LoginResult>;
  pinLogin: (pinCode: string) => Promise<LoginResult>;
  register: (email: string, password: string, businessName: string, businessType: string, country: string, phone?: string, vatNumber?: string, tinNumber?: string) => Promise<boolean>;
  logout: () => void;
  generateMfaSecret: (email: string) => Promise<{ secret: string; qrCodeUrl: string }>;
  verifyMfaSetup: (secret: string, totpCode: string) => Promise<boolean>;
  generateBackupCodes: (email: string) => Promise<string[]>;
  saveBackupCodes: (email: string, codes: string[]) => void;
  disableMfa: () => Promise<boolean>;
  users: User[];
  addUser: (userData: Partial<User> & { email: string; password: string; role: UserRole }) => Promise<boolean>;
  updateUser: (userId: string, updatedUser: Partial<User>, currentPassword?: string, newPassword?: string) => Promise<boolean>;
  deleteUser: (userId: string) => Promise<boolean>;
  hasPermission: (requiredRoles: UserRole[]) => boolean;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [mfaState, setMfaState] = useState<{ userId?: string }>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const { startLoading, stopLoading } = useLoading();

  const refreshAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/auth/me`, {
        credentials: 'include',
        skipAuthErrorHandling: true,
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      logger.error('Error refreshing auth:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const loadUsers = useCallback(async () => {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/auth/users`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      logger.error('Error loading users:', error);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadUsers();
    }
  }, [isAuthenticated, loadUsers]);

  const login = async (email: string, password: string, totpCode?: string, backupCode?: string): Promise<LoginResult> => {
    startLoading();
    
    try {
      const dbReady = await ensureDatabaseReady((message) => {
        toast.info(message);
      });

      if (!dbReady) {
        toast.error("Database is not ready. Please try again in a moment.");
        stopLoading();
        return { success: false };
      }

      if (mfaState.userId && (totpCode || backupCode)) {
        const verifyResponse = await fetchWithAuth(`${API_BASE_URL}/auth/verify-mfa`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ 
            userId: mfaState.userId, 
            totpCode: totpCode || undefined,
            backupCode: backupCode || undefined
          }),
          skipAuthErrorHandling: true,
        });

        if (verifyResponse.ok) {
          const data = await verifyResponse.json();
          setIsAuthenticated(true);
          setUser(data.user);
          setMfaState({});
          
          if (totpCode) {
            toast.success("TOTP verified successfully!");
          } else {
            toast.success("Backup code used successfully.");
          }
          
          if (data.user.role === UserRole.EMPLOYEE) {
            navigate("/sales");
          } else {
            navigate("/");
          }
          
          stopLoading();
          return { success: true };
        } else {
          const errorData = await verifyResponse.json();
          toast.error(errorData.message || "Invalid verification code.");
          stopLoading();
          return { success: false };
        }
      }

      const response = await fetchWithAuth(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
        skipAuthErrorHandling: true,
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Invalid credentials");
        stopLoading();
        return { success: false };
      }

      if (data.mfaRequired) {
        setMfaState({ userId: data.userId });
        toast.info("MFA required. Please enter your TOTP code or a backup code.");
        stopLoading();
        return { success: false, mfaRequired: true, userId: data.userId };
      }

      setIsAuthenticated(true);
      setUser(data.user);
      toast.success("Login successful!");
      
      if (data.user.role === UserRole.EMPLOYEE) {
        navigate("/sales");
      } else {
        navigate("/");
      }
      
      stopLoading();
      return { success: true };
    } catch (error) {
      toast.error("An error occurred during login");
      stopLoading();
      return { success: false };
    }
  };

  const pinLogin = async (pinCode: string): Promise<LoginResult> => {
    startLoading();
    
    try {
      const dbReady = await ensureDatabaseReady((message) => {
        toast.info(message);
      });

      if (!dbReady) {
        toast.error("Database is not ready. Please try again in a moment.");
        stopLoading();
        return { success: false };
      }

      const response = await fetchWithAuth(`${API_BASE_URL}/auth/pin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pinCode }),
        skipAuthErrorHandling: true,
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Invalid PIN code");
        stopLoading();
        return { success: false };
      }

      setIsAuthenticated(true);
      setUser(data.user);
      toast.success("PIN login successful!");
      
      if (data.user.role === UserRole.EMPLOYEE) {
        navigate("/sales");
      } else {
        navigate("/");
      }
      
      stopLoading();
      return { success: true };
    } catch (error) {
      logger.error('PIN login error:', error);
      toast.error("An error occurred during PIN login");
      stopLoading();
      return { success: false };
    }
  };

  const register = async (email: string, password: string, businessName: string, businessType: string, country: string, phone?: string, vatNumber?: string, tinNumber?: string): Promise<boolean> => {
    startLoading();
    
    try {
      const dbReady = await ensureDatabaseReady((message) => {
        toast.info(message);
      });

      if (!dbReady) {
        toast.error("Database is not ready. Please try again in a moment.");
        stopLoading();
        return false;
      }

      const response = await fetchWithAuth(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email,
          password,
          businessName,
          businessType,
          country,
          phone,
          vatNumber,
          tinNumber
        }),
        skipAuthErrorHandling: true,
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Registration failed");
        stopLoading();
        return false;
      }

      setIsAuthenticated(true);
      setUser(data.user);
      
      toast.success("Admin account created successfully!");
      
      if (data.pinSetupRequired) {
        navigate("/setup-pin");
      }
      
      stopLoading();
      return true;
    } catch (error) {
      logger.error('Registration error:', error);
      toast.error("An error occurred during registration");
      stopLoading();
      return false;
    }
  };

  const logout = useCallback(async () => {
    startLoading();
    
    try {
      await fetchWithAuth(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        skipAuthErrorHandling: true,
      });

      setIsAuthenticated(false);
      setUser(null);
      setMfaState({});
      toast.info("Logged out successfully.");
      navigate("/login");
    } catch (error) {
      logger.error('Logout error:', error);
      setIsAuthenticated(false);
      setUser(null);
      setMfaState({});
      navigate("/login");
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading, navigate]);

  const generateMfaSecret = useCallback(async (_email: string) => {
    startLoading();
    
    try {
      // Call server-side endpoint for secure secret generation
      const response = await fetchWithAuth(`${API_BASE_URL}/auth/setup-mfa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.message || 'Failed to setup MFA');
        stopLoading();
        return { secret: '', qrCodeUrl: '' };
      }

      const data = await response.json();
      stopLoading();
      
      // Return secret and QR URL (secret sent ONLY during setup)
      return { secret: data.secret, qrCodeUrl: data.otpauthUrl };
    } catch (error) {
      logger.error('Error generating MFA secret:', error);
      toast.error('Failed to setup MFA');
      stopLoading();
      return { secret: '', qrCodeUrl: '' };
    }
  }, [startLoading, stopLoading]);

  const verifyMfaSetup = async (_secret: string, totpCode: string): Promise<boolean> => {
    startLoading();
    if (!user?.id) {
      stopLoading();
      return false;
    }

    try {
      // Verify on server-side (secret never leaves backend after initial setup)
      const response = await fetchWithAuth(`${API_BASE_URL}/auth/complete-mfa-setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ totpCode }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update local state (without secret - never stored client-side)
          setUser(prev => prev ? { ...prev, mfaEnabled: true } : null);
          toast.success('MFA enabled successfully!');
          stopLoading();
          return true;
        }
      } else {
        const error = await response.json();
        toast.error(error.message || 'Invalid TOTP code');
      }
    } catch (error) {
      logger.error('Error verifying MFA setup:', error);
      toast.error('Failed to verify MFA');
    }
    
    stopLoading();
    return false;
  };

  const generateBackupCodes = useCallback(async (_email: string): Promise<string[]> => {
    startLoading();
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomUUID().substring(0, 8).toUpperCase());
    }
    stopLoading();
    return codes;
  }, [startLoading, stopLoading]);

  const saveBackupCodes = useCallback(async (_email: string, codes: string[]) => {
    startLoading();
    
    if (!user?.id) {
      stopLoading();
      return;
    }

    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/auth/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ backupCodes: codes }),
      });

      if (response.ok) {
        setUser(prev => prev ? { ...prev, backupCodes: codes } : null);
      }
    } catch (error) {
      logger.error('Error saving backup codes:', error);
    }

    stopLoading();
  }, [startLoading, stopLoading, user?.id]);

  const disableMfa = async (): Promise<boolean> => {
    startLoading();
    if (!user?.id) {
      toast.error("No user logged in.");
      stopLoading();
      return false;
    }

    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/auth/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          mfaEnabled: false,
          mfaSecret: null,
          backupCodes: null,
        }),
      });

      if (response.ok) {
        // Remove MFA data from local state
        setUser(prev => prev ? { ...prev, mfaEnabled: false } : null);
        toast.success("MFA disabled successfully.");
        stopLoading();
        return true;
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to disable MFA');
      }
    } catch (error) {
      logger.error('Error disabling MFA:', error);
    }

    stopLoading();
    return false;
  };

  const addUser = async (userData: Partial<User> & { email: string; password: string; role: UserRole }): Promise<boolean> => {
    startLoading();
    
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/auth/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Failed to add user");
        stopLoading();
        return false;
      }

      toast.success(`User ${userData.email} (${userData.role}) added successfully.`);
      await loadUsers();
      stopLoading();
      return true;
    } catch (error) {
      logger.error('Error adding user:', error);
      toast.error("An error occurred while adding user");
      stopLoading();
      return false;
    }
  };

  const updateUser = async (userId: string, updatedUser: Partial<User>, currentPassword?: string, newPassword?: string): Promise<boolean> => {
    startLoading();
    
    try {
      const payload: any = { ...updatedUser };
      if (newPassword) {
        payload.password = newPassword;
        if (currentPassword) {
          payload.currentPassword = currentPassword;
        }
      }

      const response = await fetchWithAuth(`${API_BASE_URL}/auth/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Failed to update user");
        stopLoading();
        return false;
      }

      if (user?.id === userId) {
        setUser(data);
      }

      toast.success(`User updated successfully.`);
      await loadUsers();
      stopLoading();
      return true;
    } catch (error) {
      logger.error('Error updating user:', error);
      toast.error("An error occurred while updating user");
      stopLoading();
      return false;
    }
  };

  const deleteUser = async (userId: string): Promise<boolean> => {
    startLoading();
    
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/auth/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.message || "Failed to delete user");
        stopLoading();
        return false;
      }

      toast.success("User deleted successfully.");
      await loadUsers();
      stopLoading();
      return true;
    } catch (error) {
      logger.error('Error deleting user:', error);
      toast.error("An error occurred while deleting user");
      stopLoading();
      return false;
    }
  };

  const hasPermission = useCallback((requiredRoles: UserRole[]): boolean => {
    if (!user) return false;
    return requiredRoles.includes(user.role);
  }, [user]);

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      isLoading,
      login,
      pinLogin,
      register,
      logout,
      generateMfaSecret,
      verifyMfaSetup,
      generateBackupCodes,
      saveBackupCodes,
      disableMfa,
      users,
      addUser,
      updateUser,
      deleteUser,
      hasPermission,
      refreshAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
