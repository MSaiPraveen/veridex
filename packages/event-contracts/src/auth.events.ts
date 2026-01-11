/**
 * Auth service event contracts
 */

export interface AuthUserRegisteredEvent {
  userId: string;
  email: string;
  role: string;
  timestamp: string;
}

export interface AuthUserLoggedInEvent {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface AuthUserLoggedOutEvent {
  userId: string;
  allDevices: boolean;
  timestamp: string;
}

// Deprecated - use AuthUserLoggedInEvent
export interface AuthLoginEvent {
  userId: string;
  email: string;
  timestamp: string;
}
