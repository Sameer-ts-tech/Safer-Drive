import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, Pressable, Switch, SafeAreaView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DeviceMotion } from 'expo-sensors';
import { Ionicons } from '@expo/vector-icons';
import { useDriveSession } from '../../hooks/useDriveSession';
import { Colors } from '../../constants/Colors';

export default function Settings() {
  const {
    settings,
    updateSettings,
    calibration,
    calibrateSensors,
    clearHistory,
    history
  } = useDriveSession();

  const [apiKey, setApiKey] = useState(settings.geminiApiKey);
  const [rawAcc, setRawAcc] = useState({ x: 0, y: 0, z: 0 });
  const [rawGyro, setRawGyro] = useState({ x: 0, y: 0, z: 0 });
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    DeviceMotion.setUpdateInterval(250);
    const sub = DeviceMotion.addListener((data) => {
      const acc = data.accelerationIncludingGravity || { x: 0, y: 0, z: 0 };
      const gyro = data.rotationRate || { alpha: 0, beta: 0, gamma: 0 };
      setRawAcc({ x: acc.x, y: acc.y, z: acc.z });
      setRawGyro({ x: gyro.alpha, y: gyro.beta, z: gyro.gamma });
    });

    return () => {
      sub.remove();
    };
  }, []);

  useEffect(() => {
    setApiKey(settings.geminiApiKey);
  }, [settings.geminiApiKey]);

  const handleSaveApiKey = async () => {
    await updateSettings({
      ...settings,
      geminiApiKey: apiKey.trim(),
    });
  };

  const handleSensitivityChange = async (profile: 'conservative' | 'standard' | 'aggressive') => {
    await updateSettings({
      ...settings,
      sensitivity: profile,
    });
  };

  const handleToggleSpeech = async (val: boolean) => {
    await updateSettings({
      ...settings,
      audioAlertsEnabled: val,
    });
  };

  const handleToggleGps = async (val: boolean) => {
    await updateSettings({
      ...settings,
      gpsEnabled: val,
    });
  };

  const handleClearHistory = async () => {
    await clearHistory();
    setShowClearConfirm(false);
  };

  return (
    <View style={styles.outerContainer}>
      <LinearGradient
        colors={['#1E1615', '#3E2D2B', '#120E0D']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      
      <SafeAreaView style={styles.safeContainer}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Console Settings</Text>

          {/* Sensitivity Selectors */}
          <View style={styles.section}>
            <LinearGradient
              colors={['rgba(92, 66, 62, 0.25)', 'rgba(55, 46, 45, 0.15)']}
              style={StyleSheet.absoluteFillObject}
            />
            <Text style={styles.sectionHeader}>Event Detection Sensitivity</Text>
            <Text style={styles.sectionSubtitle}>
              Adjust the threshold levels for triggering braking, acceleration, and steering events.
            </Text>
            <View style={styles.btnRow}>
              {(['conservative', 'standard', 'aggressive'] as const).map((profile) => {
                const active = settings.sensitivity === profile;
                return (
                  <Pressable
                    key={profile}
                    style={[styles.profileBtn, { flex: 1, marginHorizontal: 4 }]}
                    onPress={() => handleSensitivityChange(profile)}
                  >
                    {active && (
                      <LinearGradient
                        colors={['#FF7E6A', '#FF5E46']}
                        style={StyleSheet.absoluteFillObject}
                      />
                    )}
                    <Text style={[styles.profileBtnText, active && styles.profileBtnTextActive]}>
                      {profile.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* API Keys */}
          <View style={styles.section}>
            <LinearGradient
              colors={['rgba(92, 66, 62, 0.25)', 'rgba(55, 46, 45, 0.15)']}
              style={StyleSheet.absoluteFillObject}
            />
            <Text style={styles.sectionHeader}>Gemini AI Integration</Text>
            <Text style={styles.sectionSubtitle}>
              Save your Gemini API key to generate custom coaching feedback. If left blank, rules-based feedback is used.
            </Text>
            <View style={styles.apiInputRow}>
              <TextInput
                style={styles.apiInput}
                placeholder="Enter Gemini API Key"
                placeholderTextColor="#C9958D"
                value={apiKey}
                onChangeText={setApiKey}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable style={styles.saveBtn} onPress={handleSaveApiKey}>
                <LinearGradient
                  colors={['#FF7E6A', '#FF5E46']}
                  style={StyleSheet.absoluteFillObject}
                />
                <Text style={styles.saveBtnText}>SAVE</Text>
              </Pressable>
            </View>
          </View>

          {/* Feature Toggles */}
          <View style={styles.section}>
            <LinearGradient
              colors={['rgba(92, 66, 62, 0.25)', 'rgba(55, 46, 45, 0.15)']}
              style={StyleSheet.absoluteFillObject}
            />
            <Text style={styles.sectionHeader}>Feature Toggles</Text>
            
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Text style={styles.toggleLabel}>Voice Alerts (Speech)</Text>
                <Text style={styles.toggleSub}>Announce driving alerts out loud in real time.</Text>
              </View>
              <Switch
                value={settings.audioAlertsEnabled}
                onValueChange={handleToggleSpeech}
                trackColor={{ false: '#4D3835', true: Colors.vibrantCoral }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Text style={styles.toggleLabel}>GPS Route Tracking</Text>
                <Text style={styles.toggleSub}>Watch location and draw routes on the summary map.</Text>
              </View>
              <Switch
                value={settings.gpsEnabled}
                onValueChange={handleToggleGps}
                trackColor={{ false: '#4D3835', true: Colors.vibrantCoral }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* Raw developer console box */}
          <View style={styles.section}>
            <LinearGradient
              colors={['rgba(92, 66, 62, 0.25)', 'rgba(55, 46, 45, 0.15)']}
              style={StyleSheet.absoluteFillObject}
            />
            <Text style={styles.sectionHeader}>Sensor Calibration</Text>
            <Text style={styles.sectionSubtitle}>
              Align phone tilt and inspect raw telemetry streams.
            </Text>

            <View style={styles.terminalContainer}>
              <View style={styles.terminalHeader}>
                <View style={[styles.terminalDot, { backgroundColor: '#FF5E46' }]} />
                <View style={[styles.terminalDot, { backgroundColor: '#FFC107' }]} />
                <View style={[styles.terminalDot, { backgroundColor: '#4CAF50' }]} />
                <Text style={styles.terminalTitle}>telemetry_stream.sh</Text>
              </View>

              <View style={styles.calibStatusRow}>
                <Text style={styles.statusLabel}>STATUS:</Text>
                <Text style={[styles.statusValue, { color: calibration.isCalibrated ? '#4CAF50' : '#FF7E6A' }]}>
                  {calibration.isCalibrated ? 'CALIBRATED' : 'WAITING_AUTO_CALIBRATION'}
                </Text>
              </View>
              
              <Text style={styles.rawLabel}>$ acc_forces_m_s2</Text>
              <Text style={styles.rawValues}>
                x: {rawAcc.x.toFixed(3).padStart(7)}  y: {rawAcc.y.toFixed(3).padStart(7)}  z: {rawAcc.z.toFixed(3).padStart(7)}
              </Text>

              <Text style={styles.rawLabel}>$ gyro_rates_rad_s</Text>
              <Text style={styles.rawValues}>
                x: {rawGyro.x.toFixed(3).padStart(7)}  y: {rawGyro.y.toFixed(3).padStart(7)}  z: {rawGyro.z.toFixed(3).padStart(7)}
              </Text>
            </View>

            <Pressable style={styles.calibBtn} onPress={calibrateSensors}>
              <View style={styles.calibBtnContent}>
                <Ionicons name="construct-outline" size={13} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.calibBtnText}>FORCE RE-CALIBRATION</Text>
              </View>
            </Pressable>
          </View>

          {/* History Management */}
          <View style={[styles.section, { borderBottomWidth: 0 }]}>
            <LinearGradient
              colors={['rgba(92, 66, 62, 0.25)', 'rgba(55, 46, 45, 0.15)']}
              style={StyleSheet.absoluteFillObject}
            />
            <Text style={styles.sectionHeader}>Data Administration</Text>
            <Text style={styles.sectionSubtitle}>
              Reset all driving logs saved on this device. This action cannot be reversed.
            </Text>
            
            {showClearConfirm ? (
              <View style={styles.confirmRow}>
                <Pressable style={[styles.confirmBtn, { backgroundColor: Colors.terracotta }]} onPress={handleClearHistory}>
                  <Text style={styles.confirmBtnText}>YES, RESET DATA</Text>
                </Pressable>
                <Pressable style={styles.cancelBtn} onPress={() => setShowClearConfirm(false)}>
                  <Text style={styles.cancelBtnText}>CANCEL</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable 
                style={[styles.clearBtn, history.length === 0 && styles.clearBtnDisabled]}
                onPress={() => setShowClearConfirm(true)}
                disabled={history.length === 0}
              >
                <View style={styles.clearBtnContent}>
                  <Ionicons name="trash-outline" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.clearBtnText}>PURGE HISTORY DATABASE</Text>
                </View>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  safeContainer: {
    flex: 1,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 20,
    letterSpacing: 0.5,
    marginTop: Platform.OS === 'android' ? 10 : 0,
  },
  section: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(201, 149, 141, 0.15)',
    marginBottom: 20,
    overflow: 'hidden',
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: Colors.dustyRose,
    fontWeight: '600',
    lineHeight: 16,
    marginTop: 4,
    marginBottom: 14,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  profileBtn: {
    backgroundColor: 'rgba(55, 46, 45, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(201, 149, 141, 0.15)',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  profileBtnText: {
    color: Colors.dustyRose,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    zIndex: 2,
  },
  profileBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  apiInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  apiInput: {
    flex: 1,
    backgroundColor: 'rgba(55, 46, 45, 0.35)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(201, 149, 141, 0.15)',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 13,
    fontWeight: '700',
  },
  saveBtn: {
    borderRadius: 10,
    marginLeft: 8,
    width: 68,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  toggleLeft: {
    flex: 1,
    paddingRight: 16,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  toggleSub: {
    fontSize: 10,
    color: Colors.dustyRose,
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(201, 149, 141, 0.12)',
    marginVertical: 12,
  },
  terminalContainer: {
    backgroundColor: '#0F0B0A', // Dark terminal body
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(201, 149, 141, 0.15)',
    padding: 12,
  },
  terminalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201, 149, 141, 0.12)',
    paddingBottom: 8,
    marginBottom: 8,
  },
  terminalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  terminalTitle: {
    color: Colors.dustyRose,
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
    marginLeft: 6,
  },
  calibStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8BC34A',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  statusValue: {
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  rawLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.dustyRose,
    marginTop: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  rawValues: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  calibBtn: {
    backgroundColor: 'rgba(92, 66, 62, 0.2)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(201, 149, 141, 0.15)',
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  calibBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  calibBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtn: {
    backgroundColor: Colors.terracotta,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  clearBtnDisabled: {
    opacity: 0.45,
  },
  clearBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  clearBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  confirmBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginRight: 6,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: 'rgba(55, 46, 45, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(201, 149, 141, 0.15)',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginLeft: 6,
  },
  cancelBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
