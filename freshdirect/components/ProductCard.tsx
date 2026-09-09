import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withSequence,
} from 'react-native-reanimated';
import { showCartToast } from '@/lib/cartToast';
import { splitProductName } from '@/lib/productName';
import { ShoppingCart, Plus, ShoppingBag } from 'lucide-react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { useCartStore } from '@/store/cartStore';
import type { Product } from '@/constants/data';

export default function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
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
            <Image
              source={{ uri: product.image }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <ShoppingBag size={28} color={Colors.outline} />
            </View>
          )}
          {product.badge && (
            <View style={[styles.badge, { backgroundColor: product.badgeColor || Colors.primary }]}>
              <Text style={styles.badgeText}>{product.badge}</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.info}>
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
    backgroundColor: Colors.surfaceContainerLow,
    position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceContainerLow },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
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
