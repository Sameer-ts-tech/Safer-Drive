import React from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, SafeAreaView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDriveSession } from '../../hooks/useDriveSession';
import { Colors } from '../../constants/Colors';
import { ScoreRing } from '../../components/ScoreRing';
import { StatCard } from '../../components/StatCard';
import { TelemetryAnalyzer } from '../../services/TelemetryAnalyzer';

export default function Dashboard() {
  const router = useRouter();
  const { history, startDrive, loadMockSession, isLoading } = useDriveSession();

  // Calculate stats
  const totalDrives = history.length;
  const averageScore = totalDrives > 0 
    ? Math.round(history.reduce((sum, s) => sum + s.score, 0) / totalDrives) 
    : 100;
  
  const totalDistanceKm = totalDrives > 0
    ? (history.reduce((sum, s) => sum + s.distance, 0) / 1000).toFixed(1)
    : '0.0';

  const totalDurationHrs = totalDrives > 0
    ? (history.reduce((sum, s) => sum + s.duration, 0) / 3600).toFixed(1)
    : '0.0';

  const rating = TelemetryAnalyzer.calculateSafetyRating(averageScore);

  const handleStartDrive = async () => {
    const success = await startDrive();
    if (success) {
      router.push('/drive');
    }
  };

  const getRatingColor = (rate: string) => {
    switch (rate) {
      case 'Excellent': return Colors.ratings.excellent;
      case 'Good': return Colors.ratings.good;
      case 'Average': return Colors.ratings.average;
      default: return Colors.ratings.risky;
    }
  };

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.welcomeText}>WELCOME TO SAFER-DRIVE</Text>
              <Text style={styles.titleText}>Driver Console</Text>
            </View>
            {totalDrives > 0 && (
              <Pressable style={styles.headerSimBtn} onPress={loadMockSession}>
                <Text style={styles.headerSimText}>Simulate</Text>
              </Pressable>
            )}
          </View>

          {/* Main Score Glassmorphic Card */}
          <View style={styles.scoreSection}>
            <LinearGradient
              colors={['rgba(92, 66, 62, 0.35)', 'rgba(55, 46, 45, 0.25)']}
              style={StyleSheet.absoluteFillObject}
            />
            <ScoreRing score={averageScore} size={165} />
            <Text style={styles.scoreLabel}>LIFETIME SAFETY SCORE</Text>
            <Text style={[styles.ratingLabel, { color: getRatingColor(rating) }]}>
              {rating} Status
            </Text>
          </View>

          {/* Start Drive Glowing Button */}
          <View style={styles.ctaContainer}>
            <Pressable 
              style={({ pressed }) => [
                styles.startBtn, 
                pressed && styles.startBtnPressed
              ]}
              onPress={handleStartDrive}
            >
              <LinearGradient
                colors={['#FF7E6A', '#FF5E46']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.startBtnGradient}
              >
                <Text style={styles.startBtnText}>START NEW DRIVE</Text>
              </LinearGradient>
            </Pressable>
          </View>

          {/* Stats Section */}
          <Text style={styles.sectionTitle}>Dashboard Statistics</Text>
          <View style={styles.statsContainer}>
            <LinearGradient
              colors={['rgba(92, 66, 62, 0.2)', 'rgba(55, 46, 45, 0.1)']}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.gridRow}>
              <StatCard icon="car" value={totalDrives} label="Total Drives" />
              <StatCard icon="navigate" value={`${totalDistanceKm} km`} label="Distance" />
            </View>
            <View style={[styles.gridRow, { marginTop: 8 }]}>
              <StatCard icon="time" value={`${totalDurationHrs} hrs`} label="Time Logged" />
              <StatCard icon="trophy" value={`${averageScore}/100`} label="Avg Score" color={getRatingColor(rating)} />
            </View>
          </View>

          {/* Recent sessions */}
          <Text style={styles.sectionTitle}>Recent Logs</Text>
          {totalDrives === 0 ? (
            <View style={styles.emptyCard}>
              <LinearGradient
                colors={['rgba(92, 66, 62, 0.25)', 'rgba(55, 46, 45, 0.15)']}
                style={StyleSheet.absoluteFillObject}
              />
              <Text style={styles.emptyTitle}>No driving sessions logged</Text>
              <Text style={styles.emptySubtitle}>
                Secure your device in a vehicle holder and press "START NEW DRIVE" to analyze driving telemetry.
              </Text>
              <Pressable style={styles.emptyMockBtn} onPress={loadMockSession}>
                <LinearGradient
                  colors={['rgba(255, 126, 106, 0.2)', 'rgba(238, 147, 133, 0.1)']}
                  style={StyleSheet.absoluteFillObject}
                />
                <Text style={styles.emptyMockBtnText}>Generate Simulated Drive Data</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.recentList}>
              {history.slice(0, 3).map((session) => {
                const sessionRating = TelemetryAnalyzer.calculateSafetyRating(session.score);
                return (
                  <Pressable
                    key={session.id}
                    style={({ pressed }) => [
                      styles.sessionItem,
                      pressed && styles.sessionItemPressed
                    ]}
                    onPress={() => router.push({ pathname: '/summary', params: { sessionId: session.id } })}
                  >
                    <View style={styles.sessionLeft}>
                      <Text style={styles.sessionDate}>{formatDate(session.date)}</Text>
                      <Text style={styles.sessionStats}>
                        {(session.distance / 1000).toFixed(1)} km   •   {Math.round(session.duration / 60)} min   •   {session.events.length} events
                      </Text>
                    </View>
                    <View style={[styles.sessionRight, { backgroundColor: getRatingColor(sessionRating) }]}>
                      <Text style={styles.sessionScore}>{session.score}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: Platform.OS === 'android' ? 10 : 0,
  },
  welcomeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.dustyRose,
    letterSpacing: 2,
  },
  titleText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 4,
  },
  headerSimBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(238, 147, 133, 0.4)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(92, 66, 62, 0.2)',
  },
  headerSimText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  scoreSection: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(201, 149, 141, 0.15)',
    marginBottom: 24,
    overflow: 'hidden',
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.dustyRose,
    letterSpacing: 1.5,
    marginTop: 18,
  },
  ratingLabel: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  ctaContainer: {
    marginBottom: 28,
  },
  startBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FF5E46',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  startBtnGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  startBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  statsContainer: {
    borderRadius: 20,
    padding: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(201, 149, 141, 0.1)',
    marginBottom: 24,
    overflow: 'hidden',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emptyCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(201, 149, 141, 0.1)',
    overflow: 'hidden',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 11,
    color: Colors.dustyRose,
    textAlign: 'center',
    lineHeight: 17,
    fontWeight: '600',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  emptyMockBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 126, 106, 0.3)',
    overflow: 'hidden',
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyMockBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  recentList: {
    marginTop: 4,
  },
  sessionItem: {
    backgroundColor: 'rgba(92, 66, 62, 0.25)',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(201, 149, 141, 0.12)',
  },
  sessionItemPressed: {
    opacity: 0.85,
    backgroundColor: 'rgba(109, 80, 75, 0.4)',
  },
  sessionLeft: {
    flex: 1,
  },
  sessionDate: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sessionStats: {
    fontSize: 10,
    color: Colors.dustyRose,
    fontWeight: '700',
    marginTop: 5,
  },
  sessionRight: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  sessionScore: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});
