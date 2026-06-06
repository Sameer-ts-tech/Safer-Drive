import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { DrivingEvent } from '../services/StorageService';

interface EventListProps {
  events: DrivingEvent[];
}

export const EventList: React.FC<EventListProps> = ({ events }) => {
  const formatElapsedTime = (ms: number): string => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getEventName = (type: DrivingEvent['type']): string => {
    switch (type) {
      case 'harshBraking':
        return 'Harsh Braking';
      case 'harshAcceleration':
        return 'Harsh Acceleration';
      case 'sharpTurn':
        return 'Sharp Turn';
      case 'aggressiveSteering':
        return 'Aggressive Steering';
      case 'excessiveMovement':
        return 'Excessive Phone Motion';
      case 'phoneHandling':
        return 'Phone Handling';
      default:
        return 'Unknown Event';
    }
  };

  const getEventIcon = (type: DrivingEvent['type']): string => {
    switch (type) {
      case 'harshBraking':
        return 'alert-circle';
      case 'harshAcceleration':
        return 'speedometer';
      case 'sharpTurn':
        return 'sync';
      case 'aggressiveSteering':
        return 'git-compare';
      case 'excessiveMovement':
        return 'phone-portrait';
      case 'phoneHandling':
        return 'hand-right';
      default:
        return 'warning';
    }
  };

  if (events.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Great job! No safety events recorded.</Text>
      </View>
    );
  }

  const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <View style={styles.container}>
      {sortedEvents.map((e, index) => {
        const eventColor = Colors.events[e.type] || Colors.brightRed;
        return (
          <View key={e.id || index} style={styles.eventRow}>
            {/* Timeline track with Vector Icon */}
            <View style={styles.timelineColumn}>
              <View style={[styles.timelineNode, { borderColor: eventColor }]}>
                <Ionicons name={getEventIcon(e.type) as any} size={16} color={eventColor} />
              </View>
              {index < sortedEvents.length - 1 && <View style={styles.timelineLine} />}
            </View>

            {/* Event Card Content */}
            <View style={styles.eventCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.eventName}>{getEventName(e.type)}</Text>
                <Text style={styles.deductionText}>-{e.pointsDeducted}</Text>
              </View>
              <View style={styles.cardDetails}>
                <Text style={styles.detailText}>Elapsed: {formatElapsedTime(e.timestamp)}</Text>
                <Text style={styles.detailText}>
                  {e.type === 'phoneHandling' 
                    ? `Rotation: ${e.gForce.toFixed(1)} rad/s` 
                    : `Peak: ${e.gForce.toFixed(2)}G`
                  }
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
  },
  emptyContainer: {
    backgroundColor: 'rgba(92, 66, 62, 0.25)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(201, 149, 141, 0.12)',
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  eventRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineColumn: {
    alignItems: 'center',
    marginRight: 12,
    width: 36,
  },
  timelineNode: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: '#1C1615', // primary dark BG
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    marginTop: 2,
  },
  timelineLine: {
    width: 1.5,
    flex: 1,
    backgroundColor: 'rgba(201, 149, 141, 0.15)',
    position: 'absolute',
    top: 34,
    bottom: -16,
    zIndex: 1,
  },
  eventCard: {
    flex: 1,
    backgroundColor: 'rgba(92, 66, 62, 0.25)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(201, 149, 141, 0.12)',
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  deductionText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FF5E46',
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(201, 149, 141, 0.1)',
    paddingTop: 6,
  },
  detailText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C9958D',
  },
});
