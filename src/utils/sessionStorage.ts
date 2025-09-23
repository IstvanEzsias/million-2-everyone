// Session storage utilities for wallet data
export interface WalletSessionData {
  nostrPrivateKey: string;
  lanaPrivateKey: string;
  walletId: string;
  nostrHex: string;
  email: string;
}

const WALLET_SESSION_KEY = 'wallet_session_data';

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