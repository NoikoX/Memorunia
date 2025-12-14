// Google Calendar API Service
// Uses Google Identity Services (new) instead of deprecated gapi.auth2

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || '').trim();
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

let isGapiLoaded = false;
let isGoogleIdentityLoaded = false;
let isSignedIn = false;
let accessToken: string | null = null;
let userEmail: string | null = null;

// Debug logging
if (typeof window !== 'undefined') {
  console.log('📅 Calendar Service - Client ID:', GOOGLE_CLIENT_ID ? `${GOOGLE_CLIENT_ID.substring(0, 30)}...` : '❌ NOT SET');
}

// Load Google Identity Services library (new)
const loadGoogleIdentity = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (isGoogleIdentityLoaded && window.google) {
      resolve();
      return;
    }

    if (document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
      // Script is loading, wait for it
      const checkInterval = setInterval(() => {
        if (window.google && window.google.accounts) {
          clearInterval(checkInterval);
          isGoogleIdentityLoaded = true;
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Timeout loading Google Identity Services'));
      }, 10000);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      isGoogleIdentityLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Google Identity Services script'));
    document.head.appendChild(script);
  });
};

// Load Google API client library (for Calendar API calls)
export const loadGoogleAPI = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!GOOGLE_CLIENT_ID) {
      const errorMsg = 'GOOGLE_CLIENT_ID is not set. Please:\n1. Add GOOGLE_CLIENT_ID=your_client_id to your .env file\n2. Restart the dev server (npm run dev)';
      console.error('❌', errorMsg);
      reject(new Error(errorMsg));
      return;
    }

    if (isGapiLoaded && window.gapi && window.gapi.client) {
      resolve();
      return;
    }

    // Check if script already exists
    if (document.querySelector('script[src="https://apis.google.com/js/api.js"]')) {
      const checkInterval = setInterval(() => {
        if (window.gapi && window.gapi.client) {
          clearInterval(checkInterval);
          if (!isGapiLoaded) {
            window.gapi.client.init({
              discoveryDocs: DISCOVERY_DOCS
            }).then(() => {
              isGapiLoaded = true;
              resolve();
            }).catch(reject);
          } else {
            resolve();
          }
        }
      }, 100);
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Timeout loading Google API'));
      }, 10000);
      return;
    }

    // Load the Google API client library
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.gapi.load('client', () => {
        window.gapi.client.init({
          discoveryDocs: DISCOVERY_DOCS
        }).then(() => {
          isGapiLoaded = true;
          resolve();
        }).catch((err: any) => {
          console.error('Google API init error:', err);
          reject(new Error(`Failed to initialize Google API: ${err.message || err}`));
        });
      });
    };
    script.onerror = () => reject(new Error('Failed to load Google API script'));
    document.head.appendChild(script);
  });
};

// Check if user is signed in
export const checkAuthStatus = (): boolean => {
  return isSignedIn && accessToken !== null;
};

// Sign in user using new Google Identity Services
export const signIn = async (): Promise<boolean> => {
  try {
    // Load both libraries
    await loadGoogleIdentity();
    await loadGoogleAPI();

    if (!window.google || !window.google.accounts) {
      throw new Error('Google Identity Services not loaded');
    }

    if (!window.gapi || !window.gapi.client) {
      throw new Error('Google API client not loaded');
    }

    console.log('Attempting to sign in with client ID:', GOOGLE_CLIENT_ID ? `${GOOGLE_CLIENT_ID.substring(0, 20)}...` : 'MISSING');

    return new Promise((resolve, reject) => {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse: any) => {
          if (tokenResponse.error) {
            console.error('Token error:', tokenResponse);
            reject(new Error(tokenResponse.error_description || tokenResponse.error));
            return;
          }

          accessToken = tokenResponse.access_token;
          isSignedIn = true;

          // Set the token for gapi client
          window.gapi.client.setToken({ access_token: accessToken });

          // Get user info
          window.gapi.client.request({
            path: 'https://www.googleapis.com/oauth2/v2/userinfo'
          }).then((response: any) => {
            userEmail = response.result.email;
            console.log('✅ Calendar connected successfully!', userEmail);
            resolve(true);
          }).catch(() => {
            // If we can't get email, that's okay - we're still signed in
            console.log('✅ Calendar connected (email not available)');
            resolve(true);
          });
        },
        error_callback: (error: any) => {
          console.error('OAuth error:', error);
          let errorMsg = 'Failed to sign in to Google Calendar.';
          
          if (error.type === 'popup_closed') {
            errorMsg = 'Sign-in popup was closed. Please try again.';
          } else if (error.type === 'access_denied') {
            errorMsg = 'Access was denied. Please grant calendar permissions.';
          }
          
          reject(new Error(errorMsg));
        }
      });

      // Request access token
      tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  } catch (error: any) {
    console.error('Error signing in:', error);
    throw error;
  }
};

// Sign out user
export const signOut = async (): Promise<void> => {
  if (accessToken && window.google && window.google.accounts) {
    window.google.accounts.oauth2.revoke(accessToken, () => {
      accessToken = null;
      isSignedIn = false;
      userEmail = null;
      if (window.gapi && window.gapi.client) {
        window.gapi.client.setToken(null);
      }
    });
  } else {
    accessToken = null;
    isSignedIn = false;
    userEmail = null;
  }
};

// Create a calendar event using quickAdd
export const createCalendarEvent = async (text: string): Promise<{ success: boolean; eventId?: string; error?: string }> => {
  try {
    // Ensure API is loaded
    if (!isGapiLoaded) {
      await loadGoogleAPI();
    }

    // Check if signed in
    if (!checkAuthStatus() || !accessToken) {
      return { success: false, error: 'Not signed in to Google Calendar. Please sign in first.' };
    }

    // Ensure token is set
    window.gapi.client.setToken({ access_token: accessToken });

    // Use events.quickAdd to create event from natural language text
    const response = await window.gapi.client.calendar.events.quickAdd({
      calendarId: 'primary',
      text: text
    });

    if (response.result && response.result.id) {
      return {
        success: true,
        eventId: response.result.id,
        error: undefined
      };
    } else {
      return {
        success: false,
        error: 'Failed to create event. No event ID returned.'
      };
    }
  } catch (error: any) {
    console.error('Error creating calendar event:', error);
    return {
      success: false,
      error: error.message || 'Failed to create calendar event'
    };
  }
};

// Get user's email (for display)
export const getUserEmail = (): string | null => {
  return userEmail;
};
