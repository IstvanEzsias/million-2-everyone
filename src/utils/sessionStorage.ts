// Session storage utilities for wallet data and return URL
export interface WalletSessionData {
  nostrPrivateKey: string;
  lanaPrivateKey: string;
  walletId: string;
  nostrHex: string;
  email: string;
  playedGame?: boolean;
}

export interface ReturnUrlData {
  url: string;
  siteName?: string;
  timestamp: number;
}

const WALLET_SESSION_KEY = 'wallet_session_data';
const RETURN_URL_SESSION_KEY = 'return_url_data';

// Whitelist of allowed return domains for security
const ALLOWED_RETURN_DOMAINS = [
  'localhost',
  '127.0.0.1',
  'lovable.app',
  'lovable.dev',
  // Add more trusted domains here
];

// Validate return URL for security
const isValidReturnUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    
    // Only allow HTTPS (except for localhost in development)
    if (urlObj.protocol !== 'https:' && 
        !['localhost', '127.0.0.1'].includes(urlObj.hostname)) {
      return false;
    }
    
    // Check if domain is in whitelist
    const isAllowed = ALLOWED_RETURN_DOMAINS.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
    );
    
    return isAllowed;
  } catch {
    return false;
  }
};

export const setWalletSessionData = (data: WalletSessionData): void => {
  try {
    sessionStorage.setItem(WALLET_SESSION_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save wallet data to session storage:', error);
  }
};

export const getWalletSessionData = (): WalletSessionData | null => {
  try {
    const data = sessionStorage.getItem(WALLET_SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to retrieve wallet data from session storage:', error);
    return null;
  }
};

export const clearWalletSessionData = (): void => {
  try {
    sessionStorage.removeItem(WALLET_SESSION_KEY);
  } catch (error) {
    console.error('Failed to clear wallet data from session storage:', error);
  }
};

export const setReturnUrlData = (url: string, siteName?: string): boolean => {
  if (!isValidReturnUrl(url)) {
    console.warn('Invalid return URL provided:', url);
    return false;
  }
  
  try {
    const data: ReturnUrlData = {
      url,
      siteName,
      timestamp: Date.now()
    };
    sessionStorage.setItem(RETURN_URL_SESSION_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Failed to save return URL to session storage:', error);
    return false;
  }
};

export const getReturnUrlData = (): ReturnUrlData | null => {
  try {
    const data = sessionStorage.getItem(RETURN_URL_SESSION_KEY);
    if (!data) return null;
    
    const returnData: ReturnUrlData = JSON.parse(data);
    
    // Check if the URL is still valid and not too old (24 hours)
    const isExpired = Date.now() - returnData.timestamp > 24 * 60 * 60 * 1000;
    if (isExpired || !isValidReturnUrl(returnData.url)) {
      clearReturnUrlData();
      return null;
    }
    
    return returnData;
  } catch (error) {
    console.error('Failed to retrieve return URL from session storage:', error);
    return null;
  }
};

export const clearReturnUrlData = (): void => {
  try {
    sessionStorage.removeItem(RETURN_URL_SESSION_KEY);
  } catch (error) {
    console.error('Failed to clear return URL from session storage:', error);
  }
};