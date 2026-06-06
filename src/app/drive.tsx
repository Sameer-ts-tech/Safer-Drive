import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, Pressable, SafeAreaView, Platform, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDriveSession } from '../hooks/useDriveSession';
import { Colors } from '../constants/Colors';
import { GForceMeter } from '../components/GForceMeter';

const getEventIcon = (type: string): string => {
  switch (type) {
    case 'harshBraking': return 'alert-circle';
    case 'harshAcceleration': return 'speedometer';
    case 'sharpTurn': return 'sync';
    case 'aggressiveSteering': return 'git-compare';
    case 'excessiveMovement': return 'phone-portrait';
    case 'phoneHandling': return 'hand-right';
    default: return 'warning';
  }
};

export default function DriveScreen() {
  const router = useRouter();
  const {
    isDriving,
    score,
    events,
    liveGForce,
    liveSpeed,
    duration,
    distance,
    calibration,
    stopDrive
  } = useDriveSession();

  const [activeAlert, setActiveAlert] = useState<{ type: string; message: string } | null>(null);
  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const lastEventCountRef = useRef(0);
  useEffect(() => {
    if (events.length > lastEventCountRef.current) {
      const latestEvent = events[events.length - 1];
      
      let alertMsg = '';
      switch (latestEvent.type) {
        case 'harshBraking': alertMsg = 'HARSH BRAKE (-5)'; break;
        case 'harshAcceleration': alertMsg = 'HARSH ACCELERATION (-5)'; break;
        case 'sharpTurn': alertMsg = 'SHARP TURN (-3)'; break;
        case 'aggressiveSteering': alertMsg = 'AGGRESSIVE STEER (-4)'; break;
        case 'excessiveMovement': alertMsg = 'EXCESSIVE MOTION (-2)'; break;
        case 'phoneHandling': alertMsg = 'PHONE HANDLING (-10)'; break;
      }

      if (alertMsg) {
        setActiveAlert({ type: latestEvent.type, message: alertMsg });
        
        if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
        alertTimeoutRef.current = setTimeout(() => {
          setActiveAlert(null);
        }, 3000);
      }
    }
    lastEventCountRef.current = events.length;
  }, [events]);

  useEffect(() => {
    if (!isDriving && events.length === 0) {
      router.replace('/(tabs)');
    }
  }, [isDriving]);

  useEffect(() => {
    return () => {
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    };
  }, []);

  const handleStopDrive = async () => {
    const session = await stopDrive();
    if (session) {
      router.replace({
        pathname: '/summary',
        params: { sessionId: session.id }
      });
    } else {
      router.replace('/(tabs)');
    }
  };

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const speedKmh = Math.round(liveSpeed * 3.6);
  const distanceKm = (distance / 1000).toFixed(2);

  const getScoreColor = () => {
    if (score >= 90) return Colors.ratings.excellent;
    if (score >= 75) return Colors.ratings.good;
    if (score >= 50) return Colors.ratings.average;
    return Colors.ratings.risky;
  };

  return (
    <View style={styles.outerContainer}>
      <LinearGradient
        colors={['#181211', '#2C1E1D', '#0A0807']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      
      <SafeAreaView style={styles.container}>
        {/* Header Ticker */}
        <View style={styles.statusBar}>
          <View style={styles.pulseContainer}>
            <View style={styles.pulseDot} />
            <Text style={styles.statusText}>RECORDING DRIVE</Text>
          </View>
          <View style={styles.calibIndicator}>
            <Text style={styles.calibrationText}>
              {calibration.isCalibrated ? '📡 GPS & Sensor Sync' : '⏳ Aligning sensors...'}
            </Text>
          </View>
        </View>

        {/* Real-time alert banner at the top of the HUD */}
        {activeAlert ? (
          <View style={styles.alertToast}>
            <LinearGradient
              colors={['#AF4C3C', '#FF5E46']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.alertToastContent}>
              <Ionicons 
                name={getEventIcon(activeAlert.type) as any} 
                size={18} 
                color="#FFFFFF" 
                style={{ marginRight: 8 }} 
              />
              <Text style={styles.alertToastText}>{activeAlert.message}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.alertPlaceholder} />
        )}

        {/* Large Score HUD */}
        <View style={styles.scoreConsole}>
          <Text style={[styles.scoreValue, { color: getScoreColor() }]}>{score}</Text>
          <Text style={styles.scoreLabel}>SAFETY SCORE</Text>
        </View>

        {/* Friction Circle G-Force Meter */}
        <View style={styles.meterSection}>
          <GForceMeter gForceX={liveGForce.x} gForceY={liveGForce.y} size={200} />
        </View>

        {/* HUD Stats Row */}
        <View style={styles.statsPanel}>
          <LinearGradient
            colors={['rgba(92, 66, 62, 0.25)', 'rgba(55, 46, 45, 0.15)']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{formatTime(duration)}</Text>
            <Text style={styles.statLabel}>DURATION</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statBox}>
            <Text style={[styles.statVal, styles.speedValue]}>{speedKmh}</Text>
            <Text style={styles.statLabel}>KM/H</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{distanceKm}</Text>
            <Text style={styles.statLabel}>DIST (KM)</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statBox}>
            <Text style={[styles.statVal, events.length > 0 && { color: Colors.brightRed }]}>
              {events.length}
            </Text>
            <Text style={styles.statLabel}>EVENTS</Text>
          </View>
        </View>

        {/* End Drive glowing button */}
        <View style={styles.footer}>
          <Pressable 
            style={({ pressed }) => [
              styles.stopBtn, 
              pressed && styles.stopBtnPressed
            ]}
            onPress={handleStopDrive}
          >
            <LinearGradient
              colors={['#AF4C3C', '#E2402B']}
              style={styles.stopBtnGradient}
            >
              <View style={styles.stopBtnContent}>
                <Ionicons name="stop-circle" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.stopBtnText}>END DRIVE & ANALYZE</Text>
              </View>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 24 : 10,
  },
  pulseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 94, 70, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 94, 70, 0.2)',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF5E46',
    marginRight: 6,
  },
  statusText: {
    color: '#FF7E6A',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  calibIndicator: {
    backgroundColor: 'rgba(201, 149, 141, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(201, 149, 141, 0.15)',
  },
  calibrationText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  alertPlaceholder: {
    height: 44,
  },
  alertToast: {
    height: 44,
    borderRadius: 12,
    alignSelf: 'center',
    width: Dimensions.get('window').width - 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  alertToastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  scoreConsole: {
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 120,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: -3,
    lineHeight: 125,
    textShadowColor: 'rgba(255, 255, 255, 0.15)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  scoreLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.dustyRose,
    letterSpacing: 2.5,
    marginTop: 2,
  },
  meterSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(201, 149, 141, 0.12)',
    paddingVertical: 14,
    overflow: 'hidden',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  speedValue: {
    fontSize: 22,
    color: '#FF7E6A',
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: Colors.dustyRose,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  divider: {
    width: 1.5,
    height: 24,
    backgroundColor: 'rgba(201, 149, 141, 0.15)',
  },
  footer: {
    paddingHorizontal: 24,
    marginBottom: Platform.OS === 'ios' ? 10 : 20,
  },
  stopBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.terracotta,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  stopBtnGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  stopBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  alertToastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    height: '100%',
  },
  stopBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
