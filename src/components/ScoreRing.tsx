import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '../constants/Colors';
import { TelemetryAnalyzer } from '../services/TelemetryAnalyzer';

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const ScoreRing: React.FC<ScoreRingProps> = ({
  score,
  size = 180,
  strokeWidth = 14,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: score,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [score]);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  // Map score to color
  const getScoreColor = (value: number) => {
    if (value >= 90) return Colors.ratings.excellent;
    if (value >= 75) return Colors.ratings.good;
    if (value >= 50) return Colors.ratings.average;
    return Colors.ratings.risky;
  };

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  const displayScore = useRef(0);
  const [currentScore, setCurrentScore] = React.useState(0);

  useEffect(() => {
    const listenerId = animatedValue.addListener(({ value }) => {
      setCurrentScore(Math.round(value));
    });
    return () => {
      animatedValue.removeListener(listenerId);
    };
  }, []);

  const rating = TelemetryAnalyzer.calculateSafetyRating(currentScore);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background Track Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#4D3835" // Slightly darker than surface
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Foreground Progress Circle */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getScoreColor(currentScore)}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {/* Center Text Labels */}
      <View style={styles.labelContainer}>
        <Text style={styles.scoreText}>{currentScore}</Text>
        <Text style={[styles.ratingText, { color: getScoreColor(currentScore) }]}>
          {rating.toUpperCase()}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  svg: {
    position: 'absolute',
  },
  labelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 4,
    fontFamily: 'System',
  },
});
