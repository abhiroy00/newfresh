import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
} from 'react-native-reanimated';
import { CheckCircle2, ShoppingCart } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { TAB_BAR_BASE } from '@/hooks/useTabBarHeight';
import { _registerCartToastHandler } from '@/lib/cartToast';

type ToastProduct = { name: string; image?: string; price?: number; unit?: string };

export default function CartToast() {
  const [product, setProduct] = useState<ToastProduct | null>(null);
  const { bottom } = useSafeAreaInsets();
  const translateY = useSharedValue(120);
  const opacity = useSharedValue(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleRef = useRef(false);

  useEffect(() => {
    const show = (p: ToastProduct) => {
      setProduct(p);
      // Hard-reset position so the spring always plays from bottom
      translateY.value = 120;
      opacity.value = 0;
      translateY.value = withSpring(0, { damping: 16, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 180 });
      visibleRef.current = true;
      timerRef.current = setTimeout(() => {
        visibleRef.current = false;
        translateY.value = withSpring(120, { damping: 20, stiffness: 180 });
        opacity.value = withTiming(0, { duration: 220 });
        setTimeout(() => setProduct(null), 250);
      }, 2600);
    };

    _registerCartToastHandler((p) => {
      if (timerRef.current) clearTimeout(timerRef.current);

      if (visibleRef.current) {
        // Dismiss current toast quickly, then slide the new one in fresh
        visibleRef.current = false;
        translateY.value = withTiming(130, { duration: 110 });
        opacity.value = withTiming(0, { duration: 90 });
        timerRef.current = setTimeout(() => { setProduct(p); show(p); }, 140);
      } else {
        show(p);
      }
    });

    return () => { _registerCartToastHandler(null); };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!product) return null;

  const bottomOffset = TAB_BAR_BASE + bottom + 12;

  return (
    <Animated.View style={[styles.container, { bottom: bottomOffset }, animatedStyle]}>
      <View style={styles.accent} />

      <View style={styles.imageWrap}>
        {product.image ? (
          <Image source={{ uri: product.image }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imageFallback}>
            <ShoppingCart size={20} color={Colors.primary} />
          </View>
        )}
      </View>

      <View style={styles.textBlock}>
        <Text style={styles.label}>Added to cart</Text>
        <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
        {product.unit ? (
          <Text style={styles.meta}>{product.unit}{product.price ? `  ·  ₹${product.price}` : ''}</Text>
        ) : product.price ? (
          <Text style={styles.meta}>₹{product.price}</Text>
        ) : null}
      </View>

      <View style={styles.checkWrap}>
        <CheckCircle2 size={24} color={Colors.primary} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: BorderRadius.md + 4,
    overflow: 'hidden',
    ...Shadows.heavy,
    zIndex: 9999,
  },
  accent: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: Colors.primary,
  },
  imageWrap: {
    marginLeft: 12,
    marginVertical: 12,
  },
  image: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.DEFAULT,
  },
  imageFallback: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.DEFAULT,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
    paddingVertical: 12,
    gap: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurface,
    lineHeight: 19,
  },
  meta: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
  },
  checkWrap: {
    paddingRight: 14,
  },
});
