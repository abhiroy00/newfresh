import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Search } from 'lucide-react-native';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { CATEGORIES, PRODUCTS } from '@/constants/data';
import ProductCard from '@/components/ProductCard';
import { productsApi } from '@/lib/api';
import { useAsyncData } from '@/hooks/useAsyncData';

const { width: SCREEN_W } = Dimensions.get('window');

// Map a backend product into the shape ProductCard expects.
const mapProduct = (p: any) => ({
  id: p.id,
  name: p.name,
  price: p.price,
  unit: p.unit,
  image: p.primary_image_url || p.image || '',
  category: p.category?.name || p.category || '',
  categoryId: p.category?.id || p.category_id || null,
  badge: p.badge,
  badgeColor: p.badge_color,
  description: p.description || '',
  isOrganic: p.is_organic,
});

export default function CategoriesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string }>();

  const [active, setActive] = React.useState<string>(params.category || 'All');  // stores category id or 'All'

  // Memoize fetchers to prevent unnecessary re-creates
  const fetchCategories = useCallback(async () => {
    try {
      const res = await productsApi.categories();
      const cats = res.data?.data;
      return Array.isArray(cats) && cats.length ? cats : CATEGORIES;
    } catch (e) {
      console.error('Categories fetch error:', e);
      return CATEGORIES;
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await productsApi.list({ page: 1, per_page: 50 });
      const prods = res.data?.items || res.data?.data;
      return Array.isArray(prods) && prods.length ? prods.map(mapProduct) : PRODUCTS;
    } catch (e) {
      console.error('Products fetch error:', e);
      return PRODUCTS;
    }
  }, []);

  const categoriesQuery = useAsyncData<any[]>(fetchCategories, CATEGORIES);
  const productsQuery = useAsyncData<any[]>(fetchProducts, PRODUCTS);

  const categories = categoriesQuery.data;
  const products = productsQuery.data;
  const loading = productsQuery.loading;

  // Only show categories that have at least one product
  const productCats = categories.filter((c: any) => (c.product_count || 0) > 0);
  const chips = [{ id: 'All', name: 'All' }, ...productCats.map((c: any) => ({ id: c.id, name: c.name }))];

  // If the initial param was a stale fake ID (e.g. 'c1' from fallback data),
  // reset to 'All' once real categories have loaded and the ID isn't found.
  React.useEffect(() => {
    if (productCats.length > 0 && active !== 'All') {
      const isValid = productCats.some((c: any) => c.id === active);
      if (!isValid) setActive('All');
    }
  }, [productCats.length]);

  const filtered =
    active === 'All' ? products : products.filter((p: any) => p.categoryId === active);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header} edges={['top']}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={Colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Categories</Text>
        <View style={styles.iconBtn} />
      </SafeAreaView>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        style={styles.chipsContainer}
      >
        {chips.map((c) => (
          <Pressable
            key={c.id}
            style={[styles.chip, active === c.id && styles.chipActive]}
            onPress={() => setActive(c.id)}
          >
            <Text style={[styles.chipText, active === c.id && styles.chipTextActive]}>{c.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Search size={48} color={Colors.onSurfaceVariant} />
              <Text style={styles.emptyText}>No products in {chips.find(c => c.id === active)?.name || active}</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {filtered.map((product: any, index: number) => (
                <View key={`${product.id ?? 'p'}-${index}`} style={styles.cell}>
                  <ProductCard product={product} index={index} />
                </View>
              ))}
            </View>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: 'rgba(239,254,235,0.95)',
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.outlineVariant,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.onSurfaceDeep },
  chipsContainer: { maxHeight: 52, backgroundColor: Colors.background },
  chipsRow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.onSurfaceVariant },
  chipTextActive: { color: '#fff' },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  cell: { width: (SCREEN_W - Spacing.md * 2 - Spacing.sm) / 2 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, color: Colors.onSurfaceVariant, marginTop: 12 },
});
