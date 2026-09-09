import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Image, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, SlidersHorizontal, Leaf } from 'lucide-react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { PRODUCTS } from '@/constants/data';
import ProductCard from '@/components/ProductCard';

const { width: SCREEN_W } = Dimensions.get('window');

const VEGGIE_FILTERS = ['All', 'Leafy', 'Root', 'Exotic', 'Organic'];

export default function VegetablesScreen() {
  const router = useRouter();
  const [filter, setFilter] = React.useState('All');
  const veggies = PRODUCTS.filter((p) => p.category === 'Vegetables' || p.category === 'Organic');

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header} edges={['top']}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={Colors.onSurface} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Leaf size={16} color={Colors.primary} />
          <Text style={styles.headerTitle}>Fresh Vegetables</Text>
        </View>
        <Pressable style={styles.filterBtn}>
          <SlidersHorizontal size={18} color={Colors.primary} />
        </Pressable>
      </SafeAreaView>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
        style={styles.filtersContainer}
      >
        {VEGGIE_FILTERS.map((f) => (
          <Pressable
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>{f}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Hero Banner */}
      <View style={styles.heroBannerContainer}>
        <View style={styles.heroBanner}>
          <Image
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOsOa1sA0QBK8AsauZfm3_CqRjV8x2EuY_cNqCatDWZZ-pMbWFtjlhLRqTTpW2kM8QJ1b_ClfRTPNv0b-vVHGDaTSb8k-hRv6bFyaZRgKMDpCdyNbLU7E5xBnbilDJb5ZLFp8vWXlB83eKPMQcRQcGD65rSRa2TDjqMiU7VQ5kPh_Lv1dBpDuaJMzFgPyL_iYqpQB6A' }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
          <View style={styles.bannerOverlay}>
            <Text style={styles.bannerTitle}>Farm Fresh{`\n`}Delivered Daily</Text>
            <View style={styles.bannerBadge}>
              <Text style={styles.bannerBadgeText}>Up to 20% OFF</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {(veggies.length > 0 ? veggies : PRODUCTS).map((product, index) => (
            <View
              key={product.id}
              style={styles.cell}
            >
              <ProductCard product={product} index={index} />
            </View>
          ))}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: 'rgba(239,254,235,0.95)',
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.outlineVariant,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.onSurfaceDeep },
  filterBtn: {
    width: 40, height: 40, borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center', justifyContent: 'center',
  },
  filtersContainer: { maxHeight: 52, backgroundColor: Colors.background },
  filtersRow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { fontSize: 13, fontWeight: '600', color: Colors.onSurfaceVariant },
  filterChipTextActive: { color: '#fff' },
  heroBannerContainer: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  heroBanner: {
    height: 120,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerImage: { width: '100%', height: '100%' },
  bannerOverlay: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: '60%',
    padding: Spacing.md,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,83,34,0.8)',
  },
  bannerTitle: { fontSize: 15, fontWeight: '800', color: '#fff', lineHeight: 20 },
  bannerBadge: {
    backgroundColor: Colors.accentOrange,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  bannerBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  cell: { width: (SCREEN_W - Spacing.md * 2 - Spacing.sm) / 2 },
});
