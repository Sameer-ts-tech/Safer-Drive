import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { DeviceMotion, Accelerometer, Gyroscope } from 'expo-sensors';
import * as Location from 'expo-location';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  StorageService, 
  DriveSession, 
  DrivingEvent, 
  Breadcrumb, 
  AppSettings 
} from '../services/StorageService';
import { TelemetryAnalyzer, SensorFrame, CalibrationState } from '../services/TelemetryAnalyzer';

interface DriveSessionContextType {
  isDriving: boolean;
  score: number;
  events: DrivingEvent[];
  trail: Breadcrumb[];
  liveGForce: { x: number; y: number; z: number };
  liveSpeed: number; // m/s
  duration: number; // seconds
  distance: number; // meters
  calibration: CalibrationState;
  settings: AppSettings;
  history: DriveSession[];
  lastSession: DriveSession | null;
  isLoading: boolean;
  startDrive: () => Promise<boolean>;
  stopDrive: () => Promise<DriveSession | null>;
  calibrateSensors: () => void;
  updateSettings: (settings: AppSettings) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  clearActiveSession: () => void;
  loadMockSession: () => void; // For testing/demos
}

const DriveSessionContext = createContext<DriveSessionContextType | undefined>(undefined);

// Distance helper (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Radius of Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

export const DriveSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDriving, setIsDriving] = useState(false);
  const [score, setScore] = useState(100);
  const [events, setEvents] = useState<DrivingEvent[]>([]);
  const [trail, setTrail] = useState<Breadcrumb[]>([]);
  const [liveGForce, setLiveGForce] = useState({ x: 0, y: 0, z: 0 });
  const [liveSpeed, setLiveSpeed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSession, setLastSession] = useState<DriveSession | null>(null);

  const [calibration, setCalibration] = useState<CalibrationState>({
    gravity: { x: 0, y: 0, z: 0 },
    forward: { x: 0, y: 1, z: 0 },
    lateral: { x: 1, y: 0, z: 0 },
    isCalibrated: false,
  });

  const [settings, setSettings] = useState<AppSettings>({
    sensitivity: 'standard',
    geminiApiKey: '',
    audioAlertsEnabled: true,
    gpsEnabled: true,
  });

  const [history, setHistory] = useState<DriveSession[]>([]);

  // Refs for tracking streams without triggering state loops
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const motionSubRef = useRef<any>(null);
  const accSubRef = useRef<any>(null);
  const gyroSubRef = useRef<any>(null);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const sensorBuffer = useRef<SensorFrame[]>([]);
  const mockSensorTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastMockSpeedRef = useRef<number>(0);
  
  const startTimeRef = useRef<number>(0);
  const speedRef = useRef<number>(0);
  const locationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const lastCoordsRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const calibrationRef = useRef<CalibrationState>(calibration);
  const settingsRef = useRef<AppSettings>(settings);
  
  // Track last events to prevent double triggering within 3s
  const lastEventTimes = useRef<Record<string, number>>({});
  const lastGForceMag = useRef<number>(0);

  // Load initial settings and history
  useEffect(() => {
    async function loadData() {
      try {
        const storedSettings = await StorageService.getSettings();
        setSettings(storedSettings);
        settingsRef.current = storedSettings;

        const storedHistory = await StorageService.getHistory();
        setHistory(storedHistory);
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Update settings ref when settings state changes
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Clean up listeners on unmount
  useEffect(() => {
    return () => {
      stopListeners();
    };
  }, []);

  const stopListeners = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (motionSubRef.current) {
      motionSubRef.current.remove();
      motionSubRef.current = null;
    }
    if (accSubRef.current) {
      accSubRef.current.remove();
      accSubRef.current = null;
    }
    if (gyroSubRef.current) {
      gyroSubRef.current.remove();
      gyroSubRef.current = null;
    }
    if (mockSensorTimerRef.current) {
      clearInterval(mockSensorTimerRef.current);
      mockSensorTimerRef.current = null;
    }
    if (locationSubRef.current) {
      locationSubRef.current.remove();
      locationSubRef.current = null;
    }
    deactivateKeepAwake();
  };

  /**
   * Sound/Voice alerts
   */
  const triggerAudioAlert = async (type: string) => {
    try {
      let phrase = '';
      switch (type) {
        case 'harshBraking':
          phrase = 'Harsh brake!';
          break;
        case 'harshAcceleration':
          phrase = 'Harsh acceleration!';
          break;
        case 'sharpTurn':
          phrase = 'Sharp turn!';
          break;
        case 'aggressiveSteering':
          phrase = 'Aggressive steering!';
          break;
        case 'excessiveMovement':
          phrase = 'Secure your phone!';
          break;
        case 'phoneHandling':
          phrase = 'Please keep your hands off the phone while driving!';
          break;
      }
      
      if (phrase) {
        // Since we are waiting for expo-speech package installation,
        // we can dynamically require it to prevent app crashes if package is not yet fully loaded
        try {
          const Speech = require('expo-speech');
          if (Speech && Speech.speak) {
            Speech.speak(phrase, { rate: 1.0 });
          }
        } catch (speechErr) {
          console.warn('Speech engine not available:', speechErr);
        }
      }
    } catch (err) {
      console.error('Audio alert error:', err);
    }
  };

  /**
   * Calibrate sensors manually
   */
  const calibrateSensors = () => {
    setCalibration({
      gravity: { x: 0, y: 0, z: 0 },
      forward: { x: 0, y: 1, z: 0 },
      lateral: { x: 1, y: 0, z: 0 },
      isCalibrated: false,
    });
    calibrationRef.current = {
      gravity: { x: 0, y: 0, z: 0 },
      forward: { x: 0, y: 1, z: 0 },
      lateral: { x: 1, y: 0, z: 0 },
      isCalibrated: false,
    };
    sensorBuffer.current = [];
  };

  /**
   * Update Settings
   */
  const updateSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await StorageService.saveSettings(newSettings);
  };

  /**
   * Start driving session
   */
  const startDrive = async (): Promise<boolean> => {
    try {
      // 1. Request location permissions (required for speed and tracking)
      const locPermission = await Location.requestForegroundPermissionsAsync();
      if (locPermission.status !== 'granted') {
        console.warn('Location permission denied');
        return false;
      }

      // Check motion permissions and availability (with fail-safe fallback)
      let deviceMotionAvailable = false;
      try {
        deviceMotionAvailable = await DeviceMotion.isAvailableAsync();
      } catch (err) {
        console.warn('DeviceMotion availability check failed:', err);
      }

      let deviceMotionGranted = false;
      if (deviceMotionAvailable) {
        try {
          const motionPermission = await DeviceMotion.requestPermissionsAsync();
          deviceMotionGranted = motionPermission.status === 'granted';
        } catch (err) {
          console.warn('DeviceMotion permission request failed:', err);
        }
      }

      // If DeviceMotion is not available/granted, check for raw sensors (Accelerometer + Gyroscope)
      // Raw sensors do not require permission prompts on iOS/Android, making them a very solid layer-2 fallback.
      let rawSensorsAvailable = false;
      if (!deviceMotionGranted) {
        try {
          const accAvail = await Accelerometer.isAvailableAsync();
          const gyroAvail = await Gyroscope.isAvailableAsync();
          rawSensorsAvailable = accAvail && gyroAvail;
        } catch (err) {
          console.warn('Raw sensors check failed:', err);
        }
      }

      const useDeviceMotion = deviceMotionAvailable && deviceMotionGranted;
      const useRawSensors = !useDeviceMotion && rawSensorsAvailable;
      const useEmulation = !useDeviceMotion && !useRawSensors;

      if (useDeviceMotion) {
        console.log('Telemetry engine initialized using DeviceMotion fusion.');
      } else if (useRawSensors) {
        console.log('Telemetry engine initialized using raw Accelerometer + Gyroscope hardware.');
      } else {
        console.warn('Motion sensors offline. Telemetry engine will emulate forces via GPS dynamics.');
      }

      // 2. Prevent screen lock
      await activateKeepAwakeAsync();

      // 3. Reset states
      setScore(100);
      setEvents([]);
      setTrail([]);
      setLiveGForce({ x: 0, y: 0, z: 0 });
      setLiveSpeed(0);
      setDuration(0);
      setDistance(0);
      setIsDriving(true);
      
      startTimeRef.current = Date.now();
      speedRef.current = 0;
      locationRef.current = null;
      lastCoordsRef.current = null;
      sensorBuffer.current = [];
      lastEventTimes.current = {};
      lastGForceMag.current = 0;
      lastMockSpeedRef.current = 0;

      // 4. Start Duration Timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      // 5. Subscribe to Sensors or start Emulation loop
      if (useDeviceMotion) {
        // Layer 1: DeviceMotion Fusion
        DeviceMotion.setUpdateInterval(100); 
        motionSubRef.current = DeviceMotion.addListener((data) => {
          const acc = data.accelerationIncludingGravity || data.acceleration;
          const gyro = data.rotationRate;

          if (acc && gyro) {
            const frame: SensorFrame = {
              accelerometer: { x: acc.x, y: acc.y, z: acc.z },
              gyroscope: { x: gyro.alpha, y: gyro.beta, z: gyro.gamma },
              timestamp: Date.now(),
            };

            sensorBuffer.current.push(frame);
            if (sensorBuffer.current.length > 50) {
              sensorBuffer.current.shift();
            }

            // Run evaluation
            const analysis = TelemetryAnalyzer.analyzeTelemetry(
              sensorBuffer.current,
              speedRef.current,
              calibrationRef.current,
              settingsRef.current.sensitivity
            );

            // Update G force states
            setLiveGForce({ x: analysis.gForceX, y: analysis.gForceY, z: analysis.gForceZ });
            lastGForceMag.current = Math.sqrt(analysis.gForceX * analysis.gForceX + analysis.gForceY * analysis.gForceY);

            // Update calibration
            if (analysis.calibration.isCalibrated && !calibrationRef.current.isCalibrated) {
              calibrationRef.current = analysis.calibration;
              setCalibration(analysis.calibration);
            }

            // Handle detected events
            if (analysis.detectedEvent) {
              const eventType = analysis.detectedEvent.type;
              const now = Date.now();
              const lastTime = lastEventTimes.current[eventType] || 0;

              if (now - lastTime > 3000) {
                lastEventTimes.current[eventType] = now;

                const newEvent: DrivingEvent = {
                  id: `e-${now}-${Math.floor(Math.random() * 1000)}`,
                  type: eventType,
                  timestamp: now - startTimeRef.current,
                  latitude: locationRef.current?.latitude,
                  longitude: locationRef.current?.longitude,
                  gForce: analysis.detectedEvent.gForce,
                  pointsDeducted: analysis.detectedEvent.pointsDeducted,
                };

                setEvents(prev => [...prev, newEvent]);
                setScore(prev => Math.max(0, prev - newEvent.pointsDeducted));

                if (settingsRef.current.audioAlertsEnabled) {
                  triggerAudioAlert(eventType);
                }
              }
            }
          }
        });
      } else if (useRawSensors) {
        // Layer 2: Raw Accelerometer + Gyroscope Hardware (No permissions prompt required)
        const accVal = { x: 0, y: 0, z: 9.81 };
        const gyroVal = { x: 0, y: 0, z: 0 };

        Accelerometer.setUpdateInterval(100);
        Gyroscope.setUpdateInterval(100);

        // Keep gyro values updated
        gyroSubRef.current = Gyroscope.addListener((data) => {
          gyroVal.x = data.x;
          gyroVal.y = data.y;
          gyroVal.z = data.z;
        });

        // Trigger evaluations on accelerometer ticks (10Hz)
        accSubRef.current = Accelerometer.addListener((data) => {
          // Raw accelerometer returns in G units; convert to m/s^2
          accVal.x = data.x * 9.80665;
          accVal.y = data.y * 9.80665;
          accVal.z = data.z * 9.80665;

          const frame: SensorFrame = {
            accelerometer: { ...accVal },
            gyroscope: { ...gyroVal },
            timestamp: Date.now(),
          };

          sensorBuffer.current.push(frame);
          if (sensorBuffer.current.length > 50) {
            sensorBuffer.current.shift();
          }

          // Run evaluation
          const analysis = TelemetryAnalyzer.analyzeTelemetry(
            sensorBuffer.current,
            speedRef.current,
            calibrationRef.current,
            settingsRef.current.sensitivity
          );

          // Update G force states
          setLiveGForce({ x: analysis.gForceX, y: analysis.gForceY, z: analysis.gForceZ });
          lastGForceMag.current = Math.sqrt(analysis.gForceX * analysis.gForceX + analysis.gForceY * analysis.gForceY);

          // Update calibration
          if (analysis.calibration.isCalibrated && !calibrationRef.current.isCalibrated) {
            calibrationRef.current = analysis.calibration;
            setCalibration(analysis.calibration);
          }

          // Handle detected events
          if (analysis.detectedEvent) {
            const eventType = analysis.detectedEvent.type;
            const now = Date.now();
            const lastTime = lastEventTimes.current[eventType] || 0;

            if (now - lastTime > 3000) {
              lastEventTimes.current[eventType] = now;

              const newEvent: DrivingEvent = {
                id: `e-${now}-${Math.floor(Math.random() * 1000)}`,
                type: eventType,
                timestamp: now - startTimeRef.current,
                latitude: locationRef.current?.latitude,
                longitude: locationRef.current?.longitude,
                gForce: analysis.detectedEvent.gForce,
                pointsDeducted: analysis.detectedEvent.pointsDeducted,
              };

              setEvents(prev => [...prev, newEvent]);
              setScore(prev => Math.max(0, prev - newEvent.pointsDeducted));

              if (settingsRef.current.audioAlertsEnabled) {
                triggerAudioAlert(eventType);
              }
            }
          }
        });
      } else {
        // Layer 3: GPS-based Emulated Sensor Stream running at 10Hz
        mockSensorTimerRef.current = setInterval(() => {
          // Simulated minor engine vibration noise
          const vibrationNoise = {
            x: (Math.random() - 0.5) * 0.1,
            y: (Math.random() - 0.5) * 0.1,
            z: (Math.random() - 0.5) * 0.1,
          };

          // Calculate longitudinal acceleration from GPS speed changes
          const dt = 0.1; // 100ms
          const speedDiff = speedRef.current - lastMockSpeedRef.current;
          lastMockSpeedRef.current = speedRef.current;
          
          // Accel in m/s^2 (G magnitude = acceleration / 9.81)
          const rawAccelLong = speedDiff / dt;
          const accelLong = Math.max(-8, Math.min(6, rawAccelLong)); // clamp values

          const mockAcc = {
            x: vibrationNoise.x,
            y: accelLong + vibrationNoise.y,
            z: 9.81 + vibrationNoise.z, // gravity vector
          };

          const mockGyro = {
            x: (Math.random() - 0.5) * 0.05,
            y: (Math.random() - 0.5) * 0.05,
            z: (Math.random() - 0.5) * 0.05,
          };

          const frame: SensorFrame = {
            accelerometer: mockAcc,
            gyroscope: mockGyro,
            timestamp: Date.now(),
          };

          sensorBuffer.current.push(frame);
          if (sensorBuffer.current.length > 50) {
            sensorBuffer.current.shift();
          }

          // Run telemetry calculations
          const analysis = TelemetryAnalyzer.analyzeTelemetry(
            sensorBuffer.current,
            speedRef.current,
            calibrationRef.current,
            settingsRef.current.sensitivity
          );

          setLiveGForce({ x: analysis.gForceX, y: analysis.gForceY, z: analysis.gForceZ });
          lastGForceMag.current = Math.sqrt(analysis.gForceX * analysis.gForceX + analysis.gForceY * analysis.gForceY);

          if (analysis.detectedEvent) {
            const eventType = analysis.detectedEvent.type;
            const now = Date.now();
            const lastTime = lastEventTimes.current[eventType] || 0;

            if (now - lastTime > 3000) {
              lastEventTimes.current[eventType] = now;

              const newEvent: DrivingEvent = {
                id: `e-${now}-${Math.floor(Math.random() * 1000)}`,
                type: eventType,
                timestamp: now - startTimeRef.current,
                latitude: locationRef.current?.latitude,
                longitude: locationRef.current?.longitude,
                gForce: analysis.detectedEvent.gForce,
                pointsDeducted: analysis.detectedEvent.pointsDeducted,
              };

              setEvents(prev => [...prev, newEvent]);
              setScore(prev => Math.max(0, prev - newEvent.pointsDeducted));

              if (settingsRef.current.audioAlertsEnabled) {
                triggerAudioAlert(eventType);
              }
            }
          }
        }, 100);
      }

      // 6. Subscribe to GPS location updates
      if (settingsRef.current.gpsEnabled) {
        locationSubRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000, // 1Hz update
            distanceInterval: 3, // 3 meters
          },
          (location) => {
            const { latitude, longitude, speed, heading } = location.coords;
            const speedMps = speed !== null && speed >= 0 ? speed : 0;

            speedRef.current = speedMps;
            setLiveSpeed(speedMps);
            
            const coords = { latitude, longitude };
            locationRef.current = coords;

            // Add distance
            if (lastCoordsRef.current) {
              const d = calculateDistance(
                lastCoordsRef.current.latitude,
                lastCoordsRef.current.longitude,
                latitude,
                longitude
              );
              
              // Filter out minor GPS drift if vehicle is stationary
              if (speedMps > 0.5 && d > 1) {
                setDistance(prev => prev + d);
              }
            }
            lastCoordsRef.current = coords;

            // Append breadcrumb
            const timestamp = Date.now() - startTimeRef.current;
            const breadcrumb: Breadcrumb = {
              latitude,
              longitude,
              speed: speedMps,
              timestamp,
              gForce: lastGForceMag.current,
            };
            setTrail(prev => [...prev, breadcrumb]);
          }
        );
      }

      return true;
    } catch (err) {
      console.error('Error starting drive tracker:', err);
      stopListeners();
      return false;
    }
  };

  /**
   * Stop driving session and save
   */
  const stopDrive = async (): Promise<DriveSession | null> => {
    if (!isDriving) return null;

    stopListeners();
    setIsDriving(false);
    setIsLoading(true);

    try {
      const finalScore = score;
      const finalDuration = duration;
      const finalDistance = distance;
      const finalEvents = [...events];
      const finalTrail = [...trail];

      // Calculate averages
      let maxSpeed = 0;
      let totalSpeed = 0;
      finalTrail.forEach(t => {
        if (t.speed > maxSpeed) maxSpeed = t.speed;
        totalSpeed += t.speed;
      });
      const avgSpeed = finalTrail.length > 0 ? totalSpeed / finalTrail.length : 0;

      // Create driving summary session object
      const session: DriveSession = {
        id: `drive-${Date.now()}`,
        date: new Date().toISOString(),
        duration: finalDuration,
        distance: finalDistance,
        avgSpeed,
        maxSpeed,
        score: finalScore,
        safetyRating: TelemetryAnalyzer.calculateSafetyRating(finalScore),
        events: finalEvents,
        trail: finalTrail,
      };

      // Generate AI Coaching Advice
      const aiFeedbackText = await TelemetryAnalyzer.generateFeedback(
        finalScore,
        finalEvents,
        settingsRef.current.geminiApiKey
      );
      session.aiFeedback = aiFeedbackText;

      // Save to persistence storage
      await StorageService.saveSession(session);
      
      // Update history list in state
      const updatedHistory = await StorageService.getHistory();
      setHistory(updatedHistory);
      
      setLastSession(session);
      return session;
    } catch (err) {
      console.error('Error stopping drive tracker:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Delete specific driving session
   */
  const deleteSession = async (id: string) => {
    try {
      setIsLoading(true);
      const filtered = history.filter(s => s.id !== id);
      await AsyncStorage.setItem('@safer_drive_history', JSON.stringify(filtered));
      setHistory(filtered);
      if (lastSession?.id === id) {
        setLastSession(null);
      }
    } catch (err) {
      console.error('Error deleting session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Clear entire history
   */
  const clearHistory = async () => {
    try {
      setIsLoading(true);
      await StorageService.clearHistory();
      setHistory([]);
      setLastSession(null);
    } catch (err) {
      console.error('Error clearing history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Clear active session state
   */
  const clearActiveSession = () => {
    setScore(100);
    setEvents([]);
    setTrail([]);
    setLiveSpeed(0);
    setLiveGForce({ x: 0, y: 0, z: 0 });
    setDuration(0);
    setDistance(0);
    setLastSession(null);
  };

  /**
   * Load a mock session for testing/demo purposes
   */
  const loadMockSession = () => {
    setIsLoading(true);
    setTimeout(async () => {
      try {
        const mockData = TelemetryAnalyzer.generateMockTelemetry(320); // 320 seconds
        
        let mockScore = 100;
        mockData.events.forEach(e => {
          mockScore = Math.max(0, mockScore - e.pointsDeducted);
        });

        // Calculate statistics
        let maxSpeed = 0;
        let totalSpeed = 0;
        mockData.trail.forEach(t => {
          if (t.speed > maxSpeed) maxSpeed = t.speed;
          totalSpeed += t.speed;
        });
        const avgSpeed = mockData.trail.length > 0 ? totalSpeed / mockData.trail.length : 0;
        
        // Approximate distance: average speed * duration
        const mockDistance = avgSpeed * 320;

        const session: DriveSession = {
          id: `mock-drive-${Date.now()}`,
          date: new Date().toISOString(),
          duration: 320,
          distance: mockDistance,
          avgSpeed,
          maxSpeed,
          score: mockScore,
          safetyRating: TelemetryAnalyzer.calculateSafetyRating(mockScore),
          events: mockData.events,
          trail: mockData.trail,
        };

        const feedback = await TelemetryAnalyzer.generateFeedback(
          mockScore,
          mockData.events,
          settingsRef.current.geminiApiKey
        );
        session.aiFeedback = feedback;

        await StorageService.saveSession(session);
        const storedHistory = await StorageService.getHistory();
        setHistory(storedHistory);
        setLastSession(session);
      } catch (err) {
        console.error('Error creating mock session:', err);
      } finally {
        setIsLoading(false);
      }
    }, 1000);
  };

  return (
    <DriveSessionContext.Provider
      value={{
        isDriving,
        score,
        events,
        trail,
        liveGForce,
        liveSpeed,
        duration,
        distance,
        calibration,
        settings,
        history,
        lastSession,
        isLoading,
        startDrive,
        stopDrive,
        calibrateSensors,
        updateSettings,
        deleteSession,
        clearHistory,
        clearActiveSession,
        loadMockSession,
      }}
    >
      {children}
    </DriveSessionContext.Provider>
  );
};

export const useDriveSession = () => {
  const context = useContext(DriveSessionContext);
  if (context === undefined) {
    throw new Error('useDriveSession must be used within a DriveSessionProvider');
  }
  return context;
};
