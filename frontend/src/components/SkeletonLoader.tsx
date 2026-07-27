import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, ViewStyle } from "react-native";
import { colors, radius } from "@/src/theme";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = "100%",
  height = 20,
  borderRadius = radius.sm,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width: width as any, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

export function CardSkeleton() {
  return (
    <View style={styles.cardSkeleton}>
      <Skeleton width="40%" height={16} borderRadius={radius.xs} style={{ marginBottom: 12 }} />
      <Skeleton width="85%" height={22} borderRadius={radius.sm} style={{ marginBottom: 8 }} />
      <Skeleton width="60%" height={14} borderRadius={radius.xs} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.surfaceTertiary,
  },
  cardSkeleton: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 12,
  },
});
