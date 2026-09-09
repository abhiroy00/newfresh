import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from 'moti/skeleton';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';

export default function ProductSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton colorMode="light" width="100%" height={160} radius={BorderRadius.xl} />
      <View style={styles.info}>
        <Skeleton colorMode="light" width="80%" height={14} radius={6} />
        <View style={{ height: 6 }} />
        <Skeleton colorMode="light" width="50%" height={12} radius={6} />
        <View style={{ height: 8 }} />
        <Skeleton colorMode="light" width="40%" height={18} radius={6} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: 0,
  },
  info: { padding: Spacing.sm },
});
