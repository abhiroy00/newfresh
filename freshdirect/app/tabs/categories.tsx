import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { CATEGORIES } from '@/constants/data';
import { productsApi } from '@/lib/api';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';

const { width: SCREEN_W } = Dimensions.get('window');
const TILE_W = (SCREEN_W - Spacing.md * 2 - Spacing.sm * 2) / 3;

export default function CategoriesTab() {
  const router = useRouter();
  const tabBarHeight = useTabBarHeight();
  const [categories, setCategories] = React.useState<any[]>(CATEGORIES);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await productsApi.categories();
        const cats = data?.data;
        if (!cancelled && Array.isArray(cats) && cats.length) setCategories(cats);
      } catch (e) {
        console.warn('Failed to load categories:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openCategory = (id: string) =>
    router.push({ pathname: '/categories', params: { category: id } });

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header} edges={['top']}>
        <Text style={styles.headerTitle}>Categories</Text>
        <Text style={styles.headerSub}>Browse fresh groceries by category</Text>
      </SafeAreaView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 16 }]}
          showsVerticalScrollIndicator={false}
        >
          <Pressable style={styles.allRow} onPress={() => router.push('/categories')}>
            <Text style={styles.allText}>View all products</Text>
            <ChevronRight size={16} color={Colors.primary} />
          </Pressable>

          <View style={styles.grid}>
            {categories.map((cat: any) => (
              <Pressable
                key={cat.id}
                style={styles.tile}
                onPress={() => openCategory(cat.id)}
              >
                <View style={[styles.emojiWrap, { backgroundColor: cat.color || Colors.surfaceContainerLow }]}>
                  <Text style={styles.emoji}>{cat.emoji || '🛒'}</Text>
                </View>
                <Text style={styles.tileName} numberOfLines={1}>{cat.name}</Text>
              </Pressable>
            ))}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: 'rgba(239,254,235,0.95)',
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.outlineVariant,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: Colors.onSurfaceDeep },
  headerSub: { fontSize: 13, color: Colors.onSurfaceVariant, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  content: { padding: Spacing.md },
  allRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  allText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tile: {
    width: TILE_W,
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    gap: 8,
    ...Shadows.card,
  },
  emojiWrap: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 26 },
  tileName: { fontSize: 12, fontWeight: '600', color: Colors.onSurface, textAlign: 'center', paddingHorizontal: 4 },
});
