import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DrivingEvent {
  id: string;
  type: 'harshBraking' | 'harshAcceleration' | 'sharpTurn' | 'aggressiveSteering' | 'excessiveMovement' | 'phoneHandling';
  timestamp: number; // ms since drive start
  latitude?: number;
  longitude?: number;
  gForce: number; // Peak G force recorded during the event
  pointsDeducted: number;
}

export interface Breadcrumb {
  latitude: number;
  longitude: number;
  speed: number; // m/s
  timestamp: number; // ms since drive start
  gForce?: number;
}

export interface DriveSession {
  id: string;
  date: string; // ISO string
  duration: number; // seconds
  distance: number; // meters
  avgSpeed: number; // m/s
  maxSpeed: number; // m/s
  score: number; // 0-100
  safetyRating: 'Excellent' | 'Good' | 'Average' | 'Risky';
  events: DrivingEvent[];
  trail: Breadcrumb[];
  aiFeedback?: string;
}

export interface AppSettings {
  sensitivity: 'conservative' | 'standard' | 'aggressive';
  geminiApiKey: string;
  audioAlertsEnabled: boolean;
  gpsEnabled: boolean;
}

const STORAGE_KEYS = {
  DRIVE_HISTORY: '@safer_drive_history',
  APP_SETTINGS: '@safer_drive_settings',
};

const DEFAULT_SETTINGS: AppSettings = {
  sensitivity: 'standard',
  geminiApiKey: '',
  audioAlertsEnabled: true,
  gpsEnabled: true,
};

export const StorageService = {
  /**
   * Save a completed driving session to history
   */
  async saveSession(session: DriveSession): Promise<void> {
    try {
      const history = await this.getHistory();
      const updatedHistory = [session, ...history];
      await AsyncStorage.setItem(STORAGE_KEYS.DRIVE_HISTORY, JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Error saving drive session:', error);
    }
  },

  /**
   * Fetch all completed sessions, sorted by date descending
   */
  async getHistory(): Promise<DriveSession[]> {
    try {
      const historyJson = await AsyncStorage.getItem(STORAGE_KEYS.DRIVE_HISTORY);
      if (!historyJson) return [];
      return JSON.parse(historyJson);
    } catch (error) {
      console.error('Error fetching drive history:', error);
      return [];
    }
  },

  /**
   * Clear all drive history
   */
  async clearHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.DRIVE_HISTORY);
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  },

  /**
   * Save user settings
   */
  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  },

  /**
   * Retrieve user settings, fallback to defaults
   */
  async getSettings(): Promise<AppSettings> {
    try {
      const settingsJson = await AsyncStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
      if (!settingsJson) return DEFAULT_SETTINGS;
      return { ...DEFAULT_SETTINGS, ...JSON.parse(settingsJson) };
    } catch (error) {
      console.error('Error fetching settings:', error);
      return DEFAULT_SETTINGS;
    }
  }
};
