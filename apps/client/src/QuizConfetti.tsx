import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

export function QuizConfetti({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const [pieces] = useState(() =>
    Array.from({ length: 64 }, (_, i) => ({
      angle: (i / 64) * Math.PI * 2,
      speed: 0.55 + Math.random() * 0.45,
      spin: (Math.random() - 0.5) * 1080,
      color: ['#F5AD42', '#ED7996', '#68B99D', '#79BEE0', '#AE8BD5'][i % 5],
    })),
  );
  useEffect(() => {
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 2400,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress]);
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {pieces.map((piece, i) => {
        const dx = Math.cos(piece.angle) * width * 0.55 * piece.speed;
        const dy =
          Math.sin(piece.angle) * height * 0.6 * piece.speed - height * 0.35;
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: width / 2 - 4,
              top: height / 2 - 5,
              width: 8,
              height: 11,
              borderRadius: i % 3 === 0 ? 4 : 1,
              backgroundColor: piece.color,
              opacity: progress.interpolate({
                inputRange: [0, 0.05, 0.75, 1],
                outputRange: [0, 1, 1, 0],
              }),
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 0.45, 1],
                    outputRange: [0, dx * 0.7, dx],
                  }),
                },
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 0.35, 0.65, 1],
                    outputRange: [0, dy, dy + height * 0.35, height * 0.8],
                  }),
                },
                {
                  rotate: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', `${piece.spin}deg`],
                  }),
                },
              ],
            }}
          />
        );
      })}
    </View>
  );
}
