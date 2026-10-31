import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Image, TextInput, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Search, MapPin, ChevronRight,
  Zap,
} from 'lucide-react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { CATEGORIES } from '@/constants/data';

// Stable reference: useAsyncData's refetch depends on the fallback identity.
const EMPTY_PRODUCTS: any[] = [];
import ProductCard from '@/components/ProductCard';
import ProductSkeleton from '@/components/ProductSkeleton';
import { useAuthStore } from '@/store/authStore';
import { productsApi, usersApi, api } from '@/lib/api';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { useAsyncData } from '@/hooks/useAsyncData';
import { usePullRefresh } from '@/hooks/usePullRefresh';

const { width: SCREEN_W } = Dimensions.get('window');

// Map a backend product into the shape ProductCard expects.
const mapProduct = (p: any) => ({
  id: p.id,
  name: p.name,
  price: p.price,
  unit: p.unit,
  image: p.primary_image_url || p.images?.[0]?.url || p.image || '',
  category: p.category?.name || p.category || '',
  badge: p.badge,
  badgeColor: p.badge_color || p.badgeColor,
  description: p.description || '',
  isOrganic: p.is_organic ?? p.isOrganic ?? false,
});

interface CarouselItem {
  id: string;
  title: string;
  subtitle?: string;
  image_url: string;
  link_type: 'category' | 'product' | 'external';
  link_value?: string;
  button_text?: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const tabBarHeight = useTabBarHeight();
  const [carousels, setCarousels] = useState<CarouselItem[]>([]);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [userLocation, setUserLocation] = useState<string>('Bengaluru');

  // Fetch carousel data
  const loadCarousel = useCallback(async () => {
    try {
      const { data: carouselRes } = await api.get('/carousel');
      if (carouselRes && Array.isArray(carouselRes.data)) {
        setCarousels(carouselRes.data);
      }
    } catch (e) {
      console.warn('Failed to fetch carousel:', e);
    }
  }, []);

  useEffect(() => {
    loadCarousel();
  }, [loadCarousel]);

  // Auto-advance carousel
  useEffect(() => {
    if (carousels.length === 0) return;
    const timer = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % carousels.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [carousels.length]);

  // Fetch user's saved address on screen focus (only if authenticated)
  useFocusEffect(
    useCallback(() => {
      if (!user) return; // Only fetch if user is logged in

      (async () => {
        try {
          const { data } = await usersApi.listAddresses();
          const addresses = data?.data || [];
          if (addresses.length > 0) {
            const defaultAddr = addresses.find((a: any) => a.is_default) || addresses[0];
            if (defaultAddr) {
              const locationStr = [
                defaultAddr.line1,
                defaultAddr.city,
              ].filter(Boolean).join(', ');
              setUserLocation(locationStr || 'Bengaluru');
            } else {
              setUserLocation('Bengaluru');
            }
          } else {
            setUserLocation('Bengaluru');
          }
        } catch (e) {
          console.warn('Failed to fetch addresses:', e);
          setUserLocation('Bengaluru');
        }
      })();
    }, [user]),
  );

  // Memoize fetchers to prevent unnecessary re-creates
  const fetchProducts = useCallback(async () => {
    try {
      const res = await productsApi.list({ page: 1, per_page: 20 });
      const prods = res.data?.items || res.data?.data;
      // No demo-product fallback: their ids don't exist on the server, so
      // tapping or adding them fails.
      return Array.isArray(prods) ? prods.map(mapProduct) : [];
    } catch (e) {
      console.error('Products fetch error:', e);
      return [];
    }
  }, []);

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

  const productsQuery = useAsyncData<any[]>(fetchProducts, EMPTY_PRODUCTS);
  const categoriesQuery = useAsyncData<any[]>(fetchCategories, CATEGORIES);

  const { refreshControl } = usePullRefresh(() =>
    Promise.all([productsQuery.refetch(), categoriesQuery.refetch(), loadCarousel()]),
  );

  const products = productsQuery.data;
  const categories = categoriesQuery.data;
  const loading = productsQuery.loading;
  const validProducts = products.filter((p: any) => p && p.id && p.name);

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView style={styles.header} edges={['top']}>
        <Pressable style={styles.locationRow} onPress={() => router.push('/location')}>
          <MapPin size={14} color={Colors.primary} />
          <Text style={styles.locationText} numberOfLines={1}>
            {user?.name ? `Hi ${user.name.split(' ')[0]}!` : 'Hi!'}{' '}
          </Text>
          <Text style={styles.locationAddress} numberOfLines={1}>{userLocation}</Text>
          <ChevronRight size={14} color={Colors.primary} />
        </Pressable>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 16 }]}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={refreshControl}
      >
        {/* Search Bar (sticky) */}
        <View style={styles.searchContainer}>
          <Pressable
            style={styles.searchBar}
            onPress={() => router.push('/search')}
          >
            <Search size={18} color={Colors.outline} />
            <Text style={styles.searchPlaceholder}>Search fresh produce...</Text>
          </Pressable>
        </View>

        {/* Carousel Banner - Managed by Admin */}
        {carousels.length > 0 && (
          <Pressable
            style={styles.heroBanner}
            onPress={() => {
              const current = carousels[carouselIndex];
              if (current.link_type === 'category') {
                router.push({ pathname: '/categories', params: { category: current.link_value } });
              } else if (current.link_type === 'product') {
                router.push({ pathname: '/product/[id]', params: { id: current.link_value ?? '' } });
              }
            }}
          >
            <Image
              source={{ uri: carousels[carouselIndex].image_url }}
              style={styles.heroImage}
              resizeMode="cover"
            />
            <View style={styles.heroOverlay} />
            {carousels[carouselIndex].title && (
              <View style={styles.heroContent}>
                <Text style={styles.heroTitle}>{carousels[carouselIndex].title}</Text>
                {carousels[carouselIndex].subtitle && (
                  <Text style={styles.heroSubtitle}>{carousels[carouselIndex].subtitle}</Text>
                )}
                {carousels[carouselIndex].button_text && (
                  <View style={styles.heroButton}>
                    <Text style={styles.heroButtonText}>{carousels[carouselIndex].button_text}</Text>
                  </View>
                )}
              </View>
            )}
            {carousels.length > 1 && (
              <View style={styles.carouselDots}>
                {carousels.map((_, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.dot,
                      idx === carouselIndex ? styles.dotActive : styles.dotInactive,
                    ]}
                  />
                ))}
              </View>
            )}
          </Pressable>
        )}

        {/* Categories */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <Pressable onPress={() => router.push('/categories')}>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
        >
          {categories.filter((cat: any) => (cat.product_count || 0) > 0).map((cat: any, index: number) => (
            <Pressable
              key={`${cat.id ?? cat.name ?? 'c'}-${index}`}
              style={styles.catCard}
              onPress={() => {
                // Only pass category id if it's a real UUID (fallback IDs like 'c1' have no dashes)
                const isRealId = cat.id && cat.id.includes('-');
                router.push({ pathname: '/categories', params: isRealId ? { category: cat.id } : {} });
              }}
            >
              {cat.image_url ? (
                <Image
                  source={{ uri: cat.image_url }}
                  style={styles.catImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.catImage, { backgroundColor: cat.color || '#e8f5e9', justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={styles.catEmoji}>{cat.emoji || '🛒'}</Text>
                </View>
              )}
              <Text style={styles.catName}>{cat.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Products */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Fresh Picks</Text>
          <Pressable onPress={() => router.push('/categories')}>
            <Text style={styles.seeAll}>View all</Text>
          </Pressable>
        </View>

        <View style={styles.productGrid}>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <View key={i} style={styles.productCell}>
                  <ProductSkeleton />
                </View>
              ))
            : validProducts.map((product: any, index: number) => (
                <View
                  key={`${product.id ?? 'p'}-${index}`}
                  style={styles.productCell}
                >
                  <ProductCard product={product} index={index} />
                </View>
              ))}
        </View>

        <View style={styles.spacer} />
      </ScrollView>
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
    paddingBottom: Spacing.sm,
    backgroundColor: 'rgba(239,254,235,0.97)',
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  locationText: { fontSize: 13, fontWeight: '700', color: Colors.onSurfaceDeep },
  locationAddress: { fontSize: 13, color: Colors.primary, fontWeight: '600', flexShrink: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 0 },
  searchContainer: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: Spacing.sm,
    ...Shadows.card,
  },
  searchPlaceholder: { flex: 1, fontSize: 15, color: Colors.outlineVariant },
  heroBanner: {
    marginHorizontal: Spacing.md,
    height: 160,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: Spacing.md,
    ...Shadows.elevated,
  },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: {
    position: 'absolute',
    left: 0, top: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    justifyContent: 'flex-end',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
  },
  heroButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  heroButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  carouselDots: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.md,
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: Colors.primary,
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: Colors.onSurfaceDeep },
  seeAll: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  catRow: { paddingLeft: Spacing.md, paddingRight: Spacing.sm, gap: Spacing.sm, marginBottom: Spacing.sm },
  catCard: {
    width: 72,
    alignItems: 'center',
    gap: 6,
  },
  catImage: { width: 72, height: 72, borderRadius: BorderRadius.xl, ...Shadows.card },
  catEmoji: { fontSize: 24 },
  catName: { fontSize: 11, fontWeight: '600', color: Colors.onSurface, textAlign: 'center', width: 72 },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  productCell: { width: (SCREEN_W - Spacing.md * 2 - Spacing.sm) / 2 },
  emptySearch: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: Colors.onSurfaceVariant },
  retryBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  spacer: { height: 20 },
});
