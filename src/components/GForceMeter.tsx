import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { Colors } from '../constants/Colors';

interface GForceMeterProps {
  gForceX: number; // Lateral G (left/right)
  gForceY: number; // Longitudinal G (accel/brake)
  size?: number;
}

export const GForceMeter: React.FC<GForceMeterProps> = ({
  gForceX,
  gForceY,
  size = 180,
}) => {
  const [peakG, setPeakG] = useState(0);

  // Calculate current G magnitude
  const currentGMag = Math.sqrt(gForceX * gForceX + gForceY * gForceY);

  // Update peak G-force
  useEffect(() => {
    if (currentGMag > peakG) {
      setPeakG(currentGMag);
    }
  }, [currentGMag]);

  // Reset peak G-force if it is reset externally or a new drive starts (handled by resetting if peak is extremely old, but for this component we just keep it unless reset)
  const resetPeak = () => setPeakG(0);

  const center = size / 2;
  const maxG = 1.0; // 1.0 G limits
  const gridRadius = size / 2 - 15;

  // Convert G-forces to screen coordinates
  // x_pos = center + (gForceX / maxG) * gridRadius
  // y_pos = center - (gForceY / maxG) * gridRadius (Y decreases going up)
  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
  
  const dotX = center + clamp(gForceX / maxG, -1, 1) * gridRadius;
  const dotY = center - clamp(gForceY / maxG, -1, 1) * gridRadius;

  return (
    <View style={styles.container}>
      <View style={[styles.meterContainer, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          {/* Outer Grid Circle (1.0G) */}
          <Circle
            cx={center}
            cy={center}
            r={gridRadius}
            stroke="#5C423E"
            strokeWidth={1}
            fill="rgba(55, 46, 45, 0.4)"
          />
          {/* Mid Grid Circle (0.5G) */}
          <Circle
            cx={center}
            cy={center}
            r={gridRadius * 0.5}
            stroke="#5C423E"
            strokeWidth={1}
            strokeDasharray="4 4"
            fill="transparent"
          />
          {/* Inner Grid Circle (0.25G) */}
          <Circle
            cx={center}
            cy={center}
            r={gridRadius * 0.25}
            stroke="#5C423E"
            strokeWidth={1}
            strokeDasharray="2 2"
            fill="transparent"
          />

          {/* Crosshairs */}
          <Line
            x1={center - gridRadius}
            y1={center}
            x2={center + gridRadius}
            y2={center}
            stroke="#5C423E"
            strokeWidth={1}
          />
          <Line
            x1={center}
            y1={center - gridRadius}
            x2={center}
            y2={center + gridRadius}
            stroke="#5C423E"
            strokeWidth={1}
          />

          {/* Labels */}
          <SvgText
            x={center + 5}
            y={center - gridRadius + 12}
            fill={Colors.dustyRose}
            fontSize="10"
            fontWeight="bold"
          >
            +1.0G (Acc)
          </SvgText>
          <SvgText
            x={center + 5}
            y={center + gridRadius - 4}
            fill={Colors.dustyRose}
            fontSize="10"
            fontWeight="bold"
          >
            -1.0G (Brk)
          </SvgText>
          <SvgText
            x={center - gridRadius + 4}
            y={center - 5}
            fill={Colors.dustyRose}
            fontSize="10"
            fontWeight="bold"
          >
            L
          </SvgText>
          <SvgText
            x={center + gridRadius - 12}
            y={center - 5}
            fill={Colors.dustyRose}
            fontSize="10"
            fontWeight="bold"
          >
            R
          </SvgText>

          {/* Peak G circle ring */}
          {peakG > 0 && (
            <Circle
              cx={center}
              cy={center}
              r={clamp(peakG / maxG, 0, 1) * gridRadius}
              stroke="rgba(238, 147, 133, 0.3)" // Coral light opacity
              strokeWidth={1}
              fill="transparent"
            />
          )}

          {/* Live G Force Point */}
          <Circle
            cx={dotX}
            cy={dotY}
            r={7}
            fill={Colors.brightRed}
            stroke="#FFFFFF"
            strokeWidth={1.5}
          />
        </Svg>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>LATERAL</Text>
          <Text style={styles.metricValue}>{gForceX.toFixed(2)}G</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>PEAK G</Text>
          <Text style={styles.metricValue}>{peakG.toFixed(2)}G</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>LONGITUDINAL</Text>
          <Text style={styles.metricValue}>{gForceY.toFixed(2)}G</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  meterContainer: {
    backgroundColor: '#2A2120', // Deep brown surface background
    borderRadius: 90,
    borderWidth: 1.5,
    borderColor: '#5C423E',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 15,
    paddingHorizontal: 20,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#EE9385',
    letterSpacing: 1,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
});
