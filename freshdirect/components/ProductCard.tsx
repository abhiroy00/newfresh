import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withSequence,
} from 'react-native-reanimated';
import { showCartToast } from '@/lib/cartToast';
import { splitProductName } from '@/lib/productName';
import { ShoppingCart, Plus, ShoppingBag, Heart } from 'lucide-react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { useCartStore } from '@/store/cartStore';
import { useLikesStore } from '@/store/likesStore';
import { formatLikes } from '@/lib/likes';
import { cdnImage } from '@/lib/cdnImage';

// Cards sit two per row.
const CARD_W = Dimensions.get('window').width / 2;
import type { Product } from '@/constants/data';

export default function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const liked = useLikesStore((s) => !!product && !!s.liked[product.id]);
  const likeCount = useLikesStore((s) => (product ? s.counts[product.id] ?? product.likeCount ?? 0 : 0));
  const toggleLike = useLikesStore((s) => s.toggle);
  const heartScale = useSharedValue(1);
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: heartScale.value }] }));

  const handleLike = () => {
    heartScale.value = withSequence(withSpring(1.35, { damping: 6 }), withSpring(1, { damping: 10 }));
    toggleLike(product.id, likeCount);
  };
  const scale = useSharedValue(1);
  const cartScale = useSharedValue(1);
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const cartStyle = useAnimatedStyle(() => ({ transform: [{ scale: cartScale.value }] }));

  const handleAddToCart = () => {
    addItem(product.id, 1, product);
    cartScale.value = withSequence(
      withSpring(1.4, { damping: 6 }),
      withSpring(1, { damping: 10 })
    );
    showCartToast({
      name: product.name,
      image: product.image,
      price: product.price,
      unit: product.unit,
    });
  };

  if (!product) return null;

  const { en: nameEn, hi: nameHi } = splitProductName(product.name);

  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.96); }}
      onPressOut={() => { scale.value = withSpring(1); }}
      onPress={() => product?.id && router.push({ pathname: '/product/[id]', params: { id: String(product.id) } })}
    >
      <Animated.View style={[styles.card, cardStyle]}>
        {/* Image */}
        <View style={styles.imageContainer}>
          {product.image ? (
            // Whole image, never cropped (contain), at a screen-sized CDN copy.
            <Image
              source={{ uri: cdnImage(product.image, CARD_W) }}
              style={styles.image}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <ShoppingBag size={28} color={Colors.outline} />
            </View>
          )}

          {/* Like (heart) — its own press target so it doesn't open the product */}
          <Pressable style={styles.likeBtn} onPress={handleLike} hitSlop={6}>
            <Animated.View style={heartStyle}>
              <Heart
                size={15}
                color={liked ? Colors.error : Colors.onSurfaceVariant}
                fill={liked ? Colors.error : 'transparent'}
              />
            </Animated.View>
            <Text style={[styles.likeText, liked && { color: Colors.error }]}>{formatLikes(likeCount)}</Text>
          </Pressable>
        </View>

        {/* Info */}
        <View style={styles.info}>
          {product.badge ? (
            <View style={[styles.badge, { backgroundColor: product.badgeColor || Colors.primary }]}>
              <Text style={styles.badgeText}>{product.badge}</Text>
            </View>
          ) : null}
          <View style={styles.nameBlock}>
            <Text style={styles.name} numberOfLines={2}>{nameEn || 'Product'}</Text>
            {nameHi ? <Text style={styles.nameHi} numberOfLines={1}>{nameHi}</Text> : null}
          </View>
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.price}>{`\u20b9${product.price ?? 0}`}</Text>
              <Text style={styles.unit}>{product.unit || ''}</Text>
            </View>
            <Pressable onPress={handleAddToCart} hitSlop={8}>
              <Animated.View style={[styles.addBtn, cartStyle]}>
                <Plus size={16} color="#fff" strokeWidth={3} />
              </Animated.View>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.card,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#fff',
    position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  likeBtn: {
    position: 'absolute', top: 6, right: 6,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 7, paddingVertical: 4,
    ...Shadows.card,
  },
  likeText: { fontSize: 10, fontWeight: '800', color: Colors.onSurfaceVariant },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceContainerLow },
  badge: {
    alignSelf: 'flex-start',
    marginBottom: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  badgeText: { color: '#fff', fontSize: 8, fontWeight: '800', textTransform: 'uppercase' },
  info: { padding: Spacing.sm },
  nameBlock: { marginBottom: 6 },
  name: { fontSize: 13, fontWeight: '600', color: Colors.onSurface, lineHeight: 18 },
  nameHi: { fontSize: 11, fontWeight: '500', color: Colors.onSurfaceVariant, marginTop: 1 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  price: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  unit: { fontSize: 10, color: Colors.onSurfaceVariant, marginTop: 1 },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.primaryCard,
  },
});
