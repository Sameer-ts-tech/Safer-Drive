import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, SafeAreaView, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Line, G } from 'react-native-svg';
import { useDriveSession } from '../../hooks/useDriveSession';
import { Colors } from '../../constants/Colors';
import { TelemetryAnalyzer } from '../../services/TelemetryAnalyzer';

export default function History() {
  const router = useRouter();
  const { history, deleteSession } = useDriveSession();

  const totalSessions = history.length;

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const eventBreakdown = useMemo(() => {
    const counts = {
      harshBraking: 0,
      harshAcceleration: 0,
      sharpTurn: 0,
      aggressiveSteering: 0,
      excessiveMovement: 0,
      phoneHandling: 0,
    };
    
    history.forEach(s => {
      s.events.forEach(e => {
        if (counts[e.type] !== undefined) {
          counts[e.type]++;
        }
      });
    });

    return counts;
  }, [history]);

  const chartData = useMemo(() => {
    if (history.length === 0) return [];
    return [...history]
      .slice(0, 10)
      .reverse()
      .map(s => s.score);
  }, [history]);

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 72;
  const chartHeight = 120;
  const paddingX = 12;
  const paddingY = 15;

  const chartPoints = useMemo(() => {
    if (chartData.length < 2) return null;
    
    const usableWidth = chartWidth - paddingX * 2;
    const usableHeight = chartHeight - paddingY * 2;
    const stepX = usableWidth / (chartData.length - 1);
    
    return chartData.map((score, index) => {
      const x = paddingX + index * stepX;
      const y = chartHeight - (paddingY + (score / 100) * usableHeight);
      return { x, y, score };
    });
  }, [chartData, chartWidth]);

  const chartPath = useMemo(() => {
    if (!chartPoints || chartPoints.length < 2) return '';
    let path = `M ${chartPoints[0].x} ${chartPoints[0].y}`;
    for (let i = 1; i < chartPoints.length; i++) {
      path += ` L ${chartPoints[i].x} ${chartPoints[i].y}`;
    }
    return path;
  }, [chartPoints]);

  const getRatingColor = (rate: string) => {
    switch (rate) {
      case 'Excellent': return Colors.ratings.excellent;
      case 'Good': return Colors.ratings.good;
      case 'Average': return Colors.ratings.average;
      default: return Colors.ratings.risky;
    }
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
          <Text style={styles.title}>History & Trends</Text>

          {/* SVG Score Trend Chart Card */}
          {chartData.length >= 2 ? (
            <View style={styles.chartContainer}>
              <LinearGradient
                colors={['rgba(92, 66, 62, 0.25)', 'rgba(55, 46, 45, 0.15)']}
                style={StyleSheet.absoluteFillObject}
              />
              <Text style={styles.chartTitle}>Driving Score Trend (Last {chartData.length} rides)</Text>
              <Svg width={chartWidth} height={chartHeight}>
                <Line x1={0} y1={paddingY} x2={chartWidth} y2={paddingY} stroke="rgba(201, 149, 141, 0.12)" strokeDasharray="3 3" />
                <Line x1={0} y1={chartHeight / 2} x2={chartWidth} y2={chartHeight / 2} stroke="rgba(201, 149, 141, 0.12)" strokeDasharray="3 3" />
                <Line x1={0} y1={chartHeight - paddingY} x2={chartWidth} y2={chartHeight - paddingY} stroke="rgba(201, 149, 141, 0.12)" strokeDasharray="3 3" />
                
                <Path
                  d={chartPath}
                  fill="none"
                  stroke={Colors.vibrantCoral}
                  strokeWidth={3}
                />
                {chartPoints?.map((p, i) => (
                  <G key={`chart-pt-${i}`}>
                    <Circle
                      cx={p.x}
                      cy={p.y}
                      r={4}
                      fill="#FFFFFF"
                      stroke={Colors.vibrantCoral}
                      strokeWidth={2}
                    />
                  </G>
                ))}
              </Svg>
              <View style={styles.chartLabels}>
                <Text style={styles.chartLabelText}>Oldest</Text>
                <Text style={styles.chartLabelText}>Latest</Text>
              </View>
            </View>
          ) : totalSessions > 0 ? (
            <View style={styles.chartFallback}>
              <LinearGradient
                colors={['rgba(92, 66, 62, 0.2)', 'rgba(55, 46, 45, 0.1)']}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.fallbackContent}>
                <Ionicons name="bulb-outline" size={15} color={Colors.dustyRose} style={{ marginRight: 6 }} />
                <Text style={styles.fallbackText}>Log at least 2 sessions to visualize driving score charts.</Text>
              </View>
            </View>
          ) : null}

          {/* Event Frequency Summary Card */}
          {totalSessions > 0 && (
            <View style={styles.breakdownCard}>
              <LinearGradient
                colors={['rgba(92, 66, 62, 0.25)', 'rgba(55, 46, 45, 0.15)']}
                style={StyleSheet.absoluteFillObject}
              />
              <Text style={styles.breakdownTitle}>Event Frequency Summary</Text>
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownItem}>
                  <Ionicons name="alert-circle" size={18} color={Colors.events.harshBraking} style={{ marginBottom: 4 }} />
                  <Text style={styles.breakdownCount}>{eventBreakdown.harshBraking}</Text>
                  <Text style={styles.breakdownLabel}>Braking</Text>
                </View>
                <View style={styles.breakdownItem}>
                  <Ionicons name="speedometer" size={18} color={Colors.events.harshAcceleration} style={{ marginBottom: 4 }} />
                  <Text style={styles.breakdownCount}>{eventBreakdown.harshAcceleration}</Text>
                  <Text style={styles.breakdownLabel}>Accel</Text>
                </View>
                <View style={styles.breakdownItem}>
                  <Ionicons name="sync" size={18} color={Colors.events.sharpTurn} style={{ marginBottom: 4 }} />
                  <Text style={styles.breakdownCount}>{eventBreakdown.sharpTurn}</Text>
                  <Text style={styles.breakdownLabel}>Turns</Text>
                </View>
              </View>
              <View style={[styles.breakdownRow, { marginTop: 16 }]}>
                <View style={styles.breakdownItem}>
                  <Ionicons name="git-compare" size={18} color={Colors.events.aggressiveSteering} style={{ marginBottom: 4 }} />
                  <Text style={styles.breakdownCount}>{eventBreakdown.aggressiveSteering}</Text>
                  <Text style={styles.breakdownLabel}>Steering</Text>
                </View>
                <View style={styles.breakdownItem}>
                  <Ionicons name="phone-portrait" size={18} color={Colors.events.excessiveMovement} style={{ marginBottom: 4 }} />
                  <Text style={styles.breakdownCount}>{eventBreakdown.excessiveMovement}</Text>
                  <Text style={styles.breakdownLabel}>Vibration</Text>
                </View>
                <View style={styles.breakdownItem}>
                  <Ionicons name="hand-right" size={18} color={Colors.events.phoneHandling} style={{ marginBottom: 4 }} />
                  <Text style={[styles.breakdownCount, eventBreakdown.phoneHandling > 0 && { color: Colors.brightRed }]}>
                    {eventBreakdown.phoneHandling}
                  </Text>
                  <Text style={styles.breakdownLabel}>Phone Use</Text>
                </View>
              </View>
            </View>
          )}

          {/* Drive list */}
          <Text style={styles.listTitle}>All Driving Logs ({totalSessions})</Text>
          {totalSessions === 0 ? (
            <View style={styles.emptyCard}>
              <LinearGradient
                colors={['rgba(92, 66, 62, 0.25)', 'rgba(55, 46, 45, 0.15)']}
                style={StyleSheet.absoluteFillObject}
              />
              <Text style={styles.emptyText}>No historical logs found</Text>
              <Text style={styles.emptySub}>Your saved driving sessions will be listed here.</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {history.map((session) => {
                const sessionRating = TelemetryAnalyzer.calculateSafetyRating(session.score);
                return (
                  <View key={session.id} style={styles.historyRow}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.historyItem,
                        pressed && styles.historyItemPressed
                      ]}
                      onPress={() => router.push({ pathname: '/summary', params: { sessionId: session.id } })}
                    >
                      <View style={styles.historyLeft}>
                        <Text style={styles.historyDate}>{formatDate(session.date)}</Text>
                        <View style={styles.historyMetaRow}>
                          <Ionicons name="flag-outline" size={11} color={Colors.dustyRose} style={styles.metaIcon} />
                          <Text style={styles.historyMetaText}>{(session.distance / 1000).toFixed(1)} km</Text>
                          <Text style={styles.historyDivider}>•</Text>
                          <Ionicons name="time-outline" size={11} color={Colors.dustyRose} style={styles.metaIcon} />
                          <Text style={styles.historyMetaText}>{Math.round(session.duration / 60)} min</Text>
                        </View>
                        <View style={styles.historyEventsRow}>
                          <Ionicons name="warning-outline" size={11} color={Colors.coralPink} style={styles.metaIcon} />
                          <Text style={styles.historyEventsText}>{session.events.length} safety events flagged</Text>
                        </View>
                      </View>
                      <View style={[styles.historyRight, { backgroundColor: getRatingColor(sessionRating) }]}>
                        <Text style={styles.historyScore}>{session.score}</Text>
                      </View>
                    </Pressable>
                    
                    {/* Sleek Delete button */}
                    <Pressable 
                      style={({ pressed }) => [
                        styles.deleteBtn,
                        pressed && styles.deleteBtnPressed
                      ]}
                      onPress={() => deleteSession(session.id)}
                    >
                      <Ionicons name="trash-outline" size={16} color={Colors.brightRed} />
                    </Pressable>
                  </View>
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
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 20,
    letterSpacing: 0.5,
    marginTop: Platform.OS === 'android' ? 10 : 0,
  },
  chartContainer: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(201, 149, 141, 0.15)',
    marginBottom: 24,
    overflow: 'hidden',
  },
  chartTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  chartLabelText: {
    color: Colors.dustyRose,
    fontSize: 9,
    fontWeight: '700',
  },
  chartFallback: {
    padding: 20,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(201, 149, 141, 0.1)',
    marginBottom: 24,
    overflow: 'hidden',
  },
  fallbackText: {
    color: Colors.dustyRose,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  breakdownCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(201, 149, 141, 0.15)',
    marginBottom: 28,
    overflow: 'hidden',
  },
  breakdownTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 14,
    letterSpacing: 0.5,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownItem: {
    alignItems: 'center',
    flex: 1,
  },
  breakdownCount: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 4,
  },
  breakdownLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.dustyRose,
    marginTop: 2,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  emptyCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(201, 149, 141, 0.1)',
    overflow: 'hidden',
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  emptySub: {
    color: Colors.dustyRose,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  list: {
    marginTop: 4,
  },
  historyRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  historyItem: {
    flex: 1,
    backgroundColor: 'rgba(92, 66, 62, 0.25)',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(201, 149, 141, 0.12)',
  },
  historyItemPressed: {
    opacity: 0.85,
    backgroundColor: 'rgba(109, 80, 75, 0.4)',
  },
  historyLeft: {
    flex: 1,
  },
  historyDate: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  historyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  metaIcon: {
    marginRight: 3,
  },
  historyMetaText: {
    fontSize: 10,
    color: Colors.dustyRose,
    fontWeight: '700',
  },
  historyDivider: {
    fontSize: 10,
    color: 'rgba(201, 149, 141, 0.3)',
    marginHorizontal: 6,
    fontWeight: '700',
  },
  historyEventsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  historyEventsText: {
    fontSize: 10,
    color: Colors.coralPink,
    fontWeight: '700',
  },
  historyRight: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  historyScore: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  deleteBtn: {
    backgroundColor: 'rgba(92, 66, 62, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    width: 44,
    borderRadius: 16,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'rgba(201, 149, 141, 0.15)',
  },
  deleteBtnPressed: {
    backgroundColor: 'rgba(175, 76, 60, 0.2)',
    borderColor: Colors.terracotta,
  },
  fallbackContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
