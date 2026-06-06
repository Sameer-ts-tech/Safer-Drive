import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, SafeAreaView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDriveSession } from '../hooks/useDriveSession';
import { Colors } from '../constants/Colors';
import { RouteReplayMap } from '../components/RouteReplayMap';
import { EventList } from '../components/EventList';
import { StatCard } from '../components/StatCard';
import { TelemetryAnalyzer } from '../services/TelemetryAnalyzer';

export default function SummaryScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { history, lastSession, clearActiveSession } = useDriveSession();

  const session = useMemo(() => {
    if (sessionId) {
      return history.find((s) => s.id === sessionId) || null;
    }
    return lastSession;
  }, [sessionId, history, lastSession]);

  const handleDone = () => {
    clearActiveSession();
    router.replace('/(tabs)');
  };

  if (!session) {
    return (
      <View style={styles.outerContainer}>
        <LinearGradient
          colors={['#1E1615', '#3E2D2B', '#120E0D']}
          style={StyleSheet.absoluteFillObject}
        />
        <SafeAreaView style={[styles.container, styles.center]}>
          <Text style={styles.errorText}>Drive session details not found.</Text>
          <Pressable style={styles.doneBtn} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.doneBtnText}>Return to Dashboard</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  const getRatingColor = (rate: string) => {
    switch (rate) {
      case 'Excellent': return Colors.ratings.excellent;
      case 'Good': return Colors.ratings.good;
      case 'Average': return Colors.ratings.average;
      default: return Colors.ratings.risky;
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
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
            <Text style={styles.headerTitle}>Drive Analysis</Text>
            <Text style={styles.headerDate}>
              {new Date(session.date).toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          {/* Glassmorphic Score Card */}
          <View style={styles.scoreCard}>
            <LinearGradient
              colors={['rgba(92, 66, 62, 0.35)', 'rgba(55, 46, 45, 0.2)']}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.scoreRow}>
              <View>
                <Text style={styles.scoreValue}>{session.score}</Text>
                <Text style={styles.scoreMax}>SAFETY RATING OUT OF 100</Text>
              </View>
              <View style={[styles.ratingBadge, { backgroundColor: getRatingColor(session.safetyRating) }]}>
                <Text style={styles.ratingText}>{session.safetyRating.toUpperCase()}</Text>
              </View>
            </View>
          </View>

          {/* AI Coach Feedback Card */}
          {session.aiFeedback && (
            <View style={styles.feedbackCard}>
              <LinearGradient
                colors={['rgba(77, 56, 53, 0.65)', 'rgba(55, 46, 45, 0.45)']}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.feedbackHeaderRow}>
                <Ionicons name="hardware-chip-outline" size={16} color={Colors.vibrantCoral} style={{ marginRight: 6 }} />
                <Text style={styles.feedbackTitle}>AI DRIVING COACH</Text>
              </View>
              <Text style={styles.feedbackBody}>{session.aiFeedback}</Text>
            </View>
          )}

          {/* Route Replay & Heatmap */}
          <Text style={styles.sectionTitle}>Route Replay & Event Heatmap</Text>
          <View style={styles.mapSection}>
            <RouteReplayMap trail={session.trail} events={session.events} height={230} />
          </View>

          {/* Telemetry Metrics Grid */}
          <Text style={styles.sectionTitle}>Telemetry Summary</Text>
          <View style={styles.statsContainer}>
            <LinearGradient
              colors={['rgba(92, 66, 62, 0.25)', 'rgba(55, 46, 45, 0.15)']}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.gridRow}>
              <StatCard icon="time" value={formatDuration(session.duration)} label="Drive Duration" />
              <StatCard icon="navigate" value={`${(session.distance / 1000).toFixed(2)} km`} label="Distance" />
            </View>
            <View style={[styles.gridRow, { marginTop: 8 }]}>
              <StatCard icon="car-sport" value={`${(session.avgSpeed * 3.6).toFixed(0)} km/h`} label="Average Speed" />
              <StatCard icon="speedometer" value={`${(session.maxSpeed * 3.6).toFixed(0)} km/h`} label="Maximum Speed" />
            </View>
          </View>

          {/* Flagged Events */}
          <Text style={styles.sectionTitle}>Flagged Events Timeline ({session.events.length})</Text>
          <EventList events={session.events} />

          {/* Done Button */}
          <View style={styles.doneBtnContainer}>
            <Pressable 
              style={({ pressed }) => [
                styles.doneBtn, 
                pressed && styles.doneBtnPressed
              ]} 
              onPress={handleDone}
            >
              <LinearGradient
                colors={['#FF7E6A', '#FF5E46']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.doneBtnGradient}
              >
                <Text style={styles.doneBtnText}>BACK TO CONSOLE</Text>
              </LinearGradient>
            </Pressable>
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    marginBottom: 20,
    paddingTop: Platform.OS === 'android' ? 10 : 0,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerDate: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.dustyRose,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  scoreCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(201, 149, 141, 0.15)',
    marginBottom: 20,
    overflow: 'hidden',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 60,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 64,
  },
  scoreMax: {
    fontSize: 9,
    color: Colors.dustyRose,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 4,
  },
  ratingBadge: {
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  feedbackCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 126, 106, 0.15)',
    marginBottom: 24,
    overflow: 'hidden',
  },
  feedbackHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 126, 106, 0.15)',
    paddingBottom: 8,
  },
  feedbackTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: Colors.vibrantCoral,
    letterSpacing: 1,
  },
  feedbackBody: {
    fontSize: 13,
    color: '#FFFFFF',
    lineHeight: 20,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 10,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  mapSection: {
    marginBottom: 20,
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
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  doneBtnContainer: {
    marginTop: 24,
  },
  doneBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FF5E46',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  doneBtnGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
