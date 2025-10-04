/**
 * Utility functions for handling bot login flow
 */

export interface BotUserData {
  name: string;
  email: string;
  phone: string;
  authCredit: number;
  isVerified: boolean;
  verificationTime: string;
  loginMethod: 'bot_qr' | 'bot_sms' | 'regular';
}

/**
 * Set up bot login session
 */
export const setupBotLogin = (userData: Partial<BotUserData>) => {
  const botUserData: BotUserData = {
    name: userData.name || 'Bot User',
    email: userData.email || '',
    phone: userData.phone || '',
    authCredit: userData.authCredit || 0,
    isVerified: true,
    verificationTime: new Date().toISOString(),
    loginMethod: (userData.loginMethod as BotUserData['loginMethod']) || 'bot_qr'
  };

  try { localStorage.setItem('botLogin', 'true'); } catch {}
  try { localStorage.setItem('botUserData', JSON.stringify(botUserData)); } catch {}
  
  return botUserData;
};

/**
 * Check if current session is a bot login
 */
export const isBotLogin = (): boolean => {
  try { return localStorage.getItem('botLogin') === 'true'; } catch { return false; }
};

/**
 * Get bot user data from localStorage
 */
export const getBotUserData = (): BotUserData | null => {
  try {
    const data = localStorage.getItem('botUserData');
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

/**
 * Clear bot login session
 */
export const clearBotLogin = () => {
  try { localStorage.removeItem('botLogin'); } catch {}
  try { localStorage.removeItem('botUserData'); } catch {}
};

/**
 * Initialize bot login from URL parameters (for bot redirects)
 * Supports two params:
 *  - bot_token: JWT token to persist
 *  - bot_user: URL-encoded JSON with user fields
 */
export const initializeBotLoginFromParams = () => {
  if (typeof window === 'undefined') return false;
  
  const urlParams = new URLSearchParams(window.location.search);
  const botToken = urlParams.get('bot_token');
  const botUser = urlParams.get('bot_user');
  
  if (botToken && botUser) {
    try {
      const userData = JSON.parse(decodeURIComponent(botUser));
      // Persist token for API calls
      try { localStorage.setItem('authToken', botToken); } catch {}
      setupBotLogin(userData);
      
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete('bot_token');
      url.searchParams.delete('bot_user');
      window.history.replaceState({}, '', url.toString());
      
      return true;
    } catch {
      return false;
    }
  }
  
  return false;
};
