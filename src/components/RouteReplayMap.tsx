import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, Dimensions, Pressable } from 'react-native';
import Svg, { Circle, Line, Polyline, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { Breadcrumb, DrivingEvent } from '../services/StorageService';

interface RouteReplayMapProps {
  trail: Breadcrumb[];
  events: DrivingEvent[];
  height?: number;
}

export const RouteReplayMap: React.FC<RouteReplayMapProps> = ({
  trail,
  events,
  height = 240,
}) => {
  const [replayProgress, setReplayProgress] = useState(0.0); // 0 to 1
  const [sliderWidth, setSliderWidth] = useState(0);

  const screenWidth = Dimensions.get('window').width;
  const width = screenWidth - 40; // Card padding

  // 1. Projection Math
  const projection = useMemo(() => {
    if (trail.length === 0) return null;

    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    trail.forEach((pt) => {
      if (pt.latitude < minLat) minLat = pt.latitude;
      if (pt.latitude > maxLat) maxLat = pt.latitude;
      if (pt.longitude < minLng) minLng = pt.longitude;
      if (pt.longitude > maxLng) maxLng = pt.longitude;
    });

    const padding = 20;
    const mapWidth = width - padding * 2;
    const mapHeight = height - padding * 2;

    const rangeLat = maxLat - minLat || 0.0001;
    const rangeLng = maxLng - minLng || 0.0001;

    // Aspect ratio correction (correcting longitude distortion by average latitude)
    const avgLat = (minLat + maxLat) / 2;
    const latCorrection = Math.cos((avgLat * Math.PI) / 180);
    const coordWidth = rangeLng * latCorrection;
    const coordHeight = rangeLat;

    // Scale to fit within container maintaining aspect ratio
    let scale = 1;
    if (coordWidth / mapWidth > coordHeight / mapHeight) {
      scale = mapWidth / coordWidth;
    } else {
      scale = mapHeight / coordHeight;
    }

    const project = (lat: number, lng: number) => {
      const x = width / 2 + (lng - (minLng + maxLng) / 2) * latCorrection * scale;
      // Invert Y because SVG coordinates grow downwards
      const y = height / 2 - (lat - (minLat + maxLat) / 2) * scale;
      return { x, y };
    };

    return { project, minLat, maxLat, minLng, maxLng };
  }, [trail, width, height]);

  // Project trail coordinates
  const projectedTrail = useMemo(() => {
    if (!projection) return [];
    return trail.map((pt) => ({
      ...pt,
      pixel: projection.project(pt.latitude, pt.longitude),
    }));
  }, [trail, projection]);

  // Project event coordinates
  const projectedEvents = useMemo(() => {
    if (!projection) return [];
    return events
      .map((e) => {
        // If event has no lat/lng, find nearest in trail by timestamp
        let lat = e.latitude;
        let lng = e.longitude;

        if (lat === undefined || lng === undefined) {
          const nearest = trail.reduce((prev, curr) => {
            return Math.abs(curr.timestamp - e.timestamp) < Math.abs(prev.timestamp - e.timestamp)
              ? curr
              : prev;
          }, trail[0]);
          if (nearest) {
            lat = nearest.latitude;
            lng = nearest.longitude;
          }
        }

        if (lat !== undefined && lng !== undefined) {
          return {
            ...e,
            pixel: projection.project(lat, lng),
          };
        }
        return null;
      })
      .filter((e) => e !== null) as Array<DrivingEvent & { pixel: { x: number; y: number } }>;
  }, [events, projection, trail]);

  // Current playing breadcrumb
  const currentIndex = Math.min(
    projectedTrail.length - 1,
    Math.max(0, Math.floor(replayProgress * (projectedTrail.length - 1)))
  );
  const currentPoint = projectedTrail[currentIndex];

  // Helper to determine G-Force segment color
  const getGForceColor = (gForce?: number) => {
    if (!gForce) return Colors.dustyRose;
    if (gForce > 0.35) return Colors.brightRed;
    if (gForce > 0.22) return Colors.vibrantCoral;
    return '#4CAF50'; // Safe green
  };

  const handleSliderPress = (event: any) => {
    const touchX = event.nativeEvent.locationX;
    if (sliderWidth > 0) {
      const progress = Math.max(0, Math.min(1, touchX / sliderWidth));
      setReplayProgress(progress);
    }
  };

  if (trail.length === 0 || !projection) {
    return (
      <View style={[styles.container, { height }, styles.center]}>
        <Text style={styles.noDataText}>No route trail recorded for this drive.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 2D Vector Map Canvas */}
      <View style={[styles.mapContainer, { height }]}>
        <Svg width={width} height={height}>
          {/* Heatmap Route Segments */}
          {projectedTrail.map((pt, index) => {
            if (index === 0) return null;
            const prev = projectedTrail[index - 1];
            return (
              <Line
                key={`seg-${index}`}
                x1={prev.pixel.x}
                y1={prev.pixel.y}
                x2={pt.pixel.x}
                y2={pt.pixel.y}
                stroke={getGForceColor(pt.gForce)}
                strokeWidth={5}
                strokeLinecap="round"
              />
            );
          })}

          {/* Start Marker */}
          <Circle
            cx={projectedTrail[0].pixel.x}
            cy={projectedTrail[0].pixel.y}
            r={6}
            fill="#4CAF50"
            stroke="#FFFFFF"
            strokeWidth={1.5}
          />

          {/* End Marker */}
          <Circle
            cx={projectedTrail[projectedTrail.length - 1].pixel.x}
            cy={projectedTrail[projectedTrail.length - 1].pixel.y}
            r={6}
            fill="#2196F3"
            stroke="#FFFFFF"
            strokeWidth={1.5}
          />

          {/* Event Flags on Map */}
          {projectedEvents.map((e, index) => {
            let eventColor = Colors.events[e.type] || Colors.brightRed;
            return (
              <G key={`evt-marker-${e.id}-${index}`}>
                <Circle
                  cx={e.pixel.x}
                  cy={e.pixel.y}
                  r={8}
                  fill={eventColor}
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                />
                <Circle
                  cx={e.pixel.x}
                  cy={e.pixel.y}
                  r={14}
                  stroke={eventColor}
                  strokeWidth={1.5}
                  fill="transparent"
                  opacity={0.5}
                />
              </G>
            );
          })}

          {/* Pulsing Replay Vehicle Indicator */}
          {currentPoint && (
            <G>
              <Circle
                cx={currentPoint.pixel.x}
                cy={currentPoint.pixel.y}
                r={16}
                fill="rgba(255, 255, 255, 0.2)"
              />
              <Circle
                cx={currentPoint.pixel.x}
                cy={currentPoint.pixel.y}
                r={8}
                fill="#FFFFFF"
                stroke={Colors.vibrantCoral}
                strokeWidth={3}
              />
            </G>
          )}
        </Svg>

        {/* Legend */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>Smooth</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.vibrantCoral }]} />
            <Text style={styles.legendText}>Medium G</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.brightRed }]} />
            <Text style={styles.legendText}>High G (Event)</Text>
          </View>
        </View>
      </View>

      {/* Playback scrubbing controls */}
      <View style={styles.playbackContainer}>
        <View style={styles.liveStats}>
          <View style={styles.liveStatItem}>
            <Ionicons name="time-outline" size={13} color="#F7F4F3" style={{ marginRight: 4 }} />
            <Text style={styles.statText}>
              Replay: {Math.floor(currentPoint.timestamp / 1000)}s
            </Text>
          </View>
          <View style={styles.liveStatItem}>
            <Ionicons name="car-outline" size={13} color="#F7F4F3" style={{ marginRight: 4 }} />
            <Text style={styles.statText}>
              Speed: {(currentPoint.speed * 3.6).toFixed(0)} km/h
            </Text>
          </View>
          <View style={styles.liveStatItem}>
            <Ionicons name="analytics-outline" size={13} color="#F7F4F3" style={{ marginRight: 4 }} />
            <Text style={styles.statText}>
              Force: {currentPoint.gForce ? `${currentPoint.gForce.toFixed(2)}G` : '0.0G'}
            </Text>
          </View>
        </View>

        {/* Custom Seek Bar */}
        <Pressable
          style={styles.sliderTrack}
          onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
          onPress={handleSliderPress}
        >
          <View style={[styles.sliderProgress, { width: `${replayProgress * 100}%` }]} />
          <View style={[styles.sliderThumb, { left: `${replayProgress * 100}%` }]} />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2A2120',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#5C423E',
    overflow: 'hidden',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapContainer: {
    width: '100%',
    position: 'relative',
  },
  noDataText: {
    color: '#C9958D',
    fontSize: 14,
    textAlign: 'center',
  },
  legendContainer: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(55, 46, 45, 0.85)',
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: '#5C423E',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 1,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
  },
  playbackContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#4D3835',
    paddingTop: 8,
  },
  liveStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  liveStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    color: '#F7F4F3',
    fontSize: 11,
    fontWeight: '700',
  },
  sliderTrack: {
    height: 6,
    backgroundColor: '#4D3835',
    borderRadius: 3,
    position: 'relative',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  sliderProgress: {
    height: 6,
    backgroundColor: '#FF7E6A',
    borderRadius: 3,
    position: 'absolute',
  },
  sliderThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FF7E6A',
    position: 'absolute',
    marginLeft: -8,
  },
});
