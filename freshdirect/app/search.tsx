import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, ChevronLeft } from 'lucide-react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '@/constants/theme';
import ProductCard from '@/components/ProductCard';
import { productsApi } from '@/lib/api';

const { width: SCREEN_W } = Dimensions.get('window');

const mapProduct = (p: any) => ({
  id: p.id,
  name: p.name,
  price: p.price,
  unit: p.unit,
  image: p.primary_image_url || p.image || '',
  category: p.category?.name || p.category || '',
  badge: p.badge,
  badgeColor: p.badge_color || p.badgeColor,
  description: p.description || '',
  isOrganic: p.is_organic ?? p.isOrganic ?? false,
});

export default function SearchScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Search fires on every keystroke; only the latest request may set results,
  // otherwise a slow earlier response can overwrite newer ones.
  const latestQuery = useRef('');

  const handleSearch = async (query: string) => {
    setSearch(query);
    latestQuery.current = query;
    if (!query.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    try {
      const response = await productsApi.list({ search: query.trim(), page: 1, per_page: 50 });
      if (latestQuery.current !== query) return;
      // Body is { success, data: [...] } — the array is response.data.data.
      const prods = response?.data?.data;
      setResults(Array.isArray(prods) ? prods.map(mapProduct) : []);
    } catch (e) {
      console.warn('Search error:', e);
      // Don't fall back to demo products: their ids don't exist on the server.
      if (latestQuery.current === query) setResults([]);
    } finally {
      if (latestQuery.current === query) setSearching(false);
    }
  };

  const validResults = results.filter((p) => p && p.id && p.name);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header} edges={['top']}>
        {/* Back button and Search bar */}
        <View style={styles.headerContent}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={24} color={Colors.onSurface} />
          </Pressable>
          <View style={styles.searchInputContainer}>
          <Search size={18} color={Colors.outline} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search fresh produce..."
            placeholderTextColor={Colors.outlineVariant}
            value={search}
            onChangeText={handleSearch}
            autoFocus
          />
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {search.trim() && (
          <View style={styles.resultHeader}>
            <Text style={styles.resultCount}>
              {validResults.length} results for "{search}"
            </Text>
          </View>
        )}

        {validResults.length > 0 ? (
          <View style={styles.productGrid}>
            {validResults.map((product, index) => (
              <View
                key={`${product.id ?? 'p'}-${index}`}
                style={styles.productCell}
              >
                <ProductCard product={product} index={index} />
              </View>
            ))}
          </View>
        ) : search.trim() && !searching ? (
          <View style={styles.emptyState}>
            <Search size={56} color={Colors.onSurfaceVariant} />
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptyText}>
              Try searching with different keywords
            </Text>
          </View>
        ) : !search.trim() ? (
          <View style={styles.emptyState}>
            <Search size={56} color={Colors.outlineVariant} />
            <Text style={styles.emptyTitle}>Start searching</Text>
            <Text style={styles.emptyText}>
              Type a product name to find fresh groceries
            </Text>
          </View>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: 'rgba(239,254,235,0.95)',
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.outlineVariant,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    ...Shadows.card,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.onSurfaceDeep,
    paddingVertical: 10,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: Spacing.md, paddingBottom: 40 },
  resultHeader: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  resultCount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  productCell: { width: (SCREEN_W - Spacing.md * 2 - Spacing.sm) / 2 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.onSurfaceDeep,
    marginTop: Spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.sm,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
});
