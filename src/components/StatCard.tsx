import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

interface StatCardProps {
  icon: string; // Ionicons name string
  value: string | number;
  label: string;
  subValue?: string;
  color?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  value,
  label,
  subValue,
  color = '#FFFFFF',
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.iconWrapper}>
        <Ionicons name={icon as any} size={18} color={Colors.vibrantCoral} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.value, { color }]}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
        {subValue && <Text style={styles.subValue}>{subValue}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(42, 33, 32, 0.55)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(201, 149, 141, 0.15)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    marginVertical: 4,
    minWidth: 140,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(238, 147, 133, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  content: {
    flex: 1,
  },
  value: {
    fontSize: 16,
    fontWeight: '800',
  },
  label: {
    fontSize: 9,
    fontWeight: '800',
    color: '#C9958D',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  subValue: {
    fontSize: 9,
    fontWeight: '700',
    color: '#EE9385',
    marginTop: 1,
  },
});
