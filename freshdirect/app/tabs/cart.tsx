import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { ShoppingCart, Truck } from 'lucide-react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { useCartStore } from '@/store/cartStore';
import SwipeableCartItem from '@/components/SwipeableCartItem';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { usePullRefresh } from '@/hooks/usePullRefresh';

export default function CartScreen() {
  const router = useRouter();
  const tabBarHeight = useTabBarHeight();
  const { items, subtotal, delivery_fee, total, loading, fetchCart, removeItem, updateQuantity, totalItems } = useCartStore();
  const count = totalItems();
  const btnScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  // Refetch whenever the tab gains focus — server cart may have changed
  // (order placed, item added from another screen, stock adjustments).
  useFocusEffect(
    useCallback(() => {
      fetchCart();
    }, [fetchCart])
  );

  const { refreshControl } = usePullRefresh(fetchCart);

  if (loading && items.length === 0) {
    return (
      <View style={[styles.emptyContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (count === 0) {
    return (
      <View style={styles.emptyContainer}>
        <SafeAreaView edges={['top']}>
          <Text style={styles.headerTitle}>Your Cart</Text>
        </SafeAreaView>
        <View style={styles.emptyState}>
          <ShoppingCart size={48} color={Colors.onSurfaceVariant} />
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <Text style={styles.emptySub}>Add fresh produce to get started</Text>
          <Pressable style={styles.shopBtn} onPress={() => router.navigate('/tabs')}>
            <Text style={styles.shopBtnText}>Start Shopping</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Map cart items for SwipeableCartItem component
  const mappedItems = items.map((item) => ({
    id: item.id,
    productId: item.product?.id || item.product_id,
    name: item.product?.name || 'Product',
    price: item.price_at_add,
    unit: item.product?.unit || '',
    image: item.product?.primary_image_url || '',
    quantity: item.quantity,
  }));

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header} edges={['top']}>
        <Text style={styles.headerTitle}>Your Cart</Text>
        <Text style={styles.headerCount}>{count} items</Text>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        {subtotal < 499 && (
          <View style={styles.freeBanner}>
            <Truck size={14} color={Colors.primary} />
            <Text style={styles.freeBannerText}>
              Add <Text style={styles.freeBannerBold}>{`\u20b9${Math.ceil(499 - subtotal)}`}</Text> more for FREE delivery!
            </Text>
          </View>
        )}

        {mappedItems.map((item) => (
          <SwipeableCartItem
            key={item.id}
            item={item}
            onDelete={(id) => removeItem(id)}
            onUpdateQty={(id, qty) => updateQuantity(id, qty)}
          />
        ))}

        {/* Price Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal ({count} items)</Text>
            <Text style={styles.summaryValue}>{`\u20b9${subtotal}`}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery</Text>
            <Text style={[styles.summaryValue, delivery_fee === 0 && { color: Colors.accentMint }]}>
              {delivery_fee === 0 ? 'FREE' : `\u20b9${delivery_fee}`}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryTotal]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{`\u20b9${total}`}</Text>
          </View>
        </View>

        <View style={{ height: 80 + tabBarHeight }} />
      </ScrollView>

      {/* Checkout CTA */}
      <View style={[styles.checkoutBar, { paddingBottom: tabBarHeight + 8 }]}>
        <Pressable
          onPressIn={() => { btnScale.value = withSpring(0.96); }}
          onPressOut={() => { btnScale.value = withSpring(1); }}
          onPress={() => router.push('/payment')}
        >
          <Animated.View style={[styles.checkoutBtn, btnStyle]}>
            <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
            <View style={styles.checkoutBadge}>
              <Text style={styles.checkoutBadgeText}>{`\u20b9${total}`}</Text>
            </View>
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  emptyContainer: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: Spacing.md },
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
  headerTitle: { fontSize: 24, fontWeight: '800', color: Colors.onSurfaceDeep },
  headerCount: { fontSize: 13, color: Colors.onSurfaceVariant, fontWeight: '500' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  emptyText: { fontSize: 20, fontWeight: '700', color: Colors.onSurfaceDeep, textAlign: 'center', marginTop: 8 },
  emptySub: { fontSize: 14, color: Colors.onSurfaceVariant, textAlign: 'center' },
  shopBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginTop: Spacing.md,
  },
  shopBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md },
  freeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.xl,
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primaryFixed,
  },
  freeBannerText: { fontSize: 13, color: Colors.onSurface },
  freeBannerBold: { fontWeight: '800', color: Colors.primary },
  promoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
    ...Shadows.card,
  },
  promoText: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.primary },
  summaryCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    ...Shadows.card,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  summaryLabel: { fontSize: 14, color: Colors.onSurfaceVariant },
  summaryValue: { fontSize: 14, fontWeight: '600', color: Colors.onSurface },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
    marginTop: 4,
    paddingTop: 12,
  },
  totalLabel: { fontSize: 16, fontWeight: '800', color: Colors.onSurfaceDeep },
  totalValue: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  checkoutBar: {
    padding: Spacing.md,
    paddingBottom: 0,
    backgroundColor: 'rgba(239,254,235,0.97)',
    borderTopWidth: 0.5,
    borderTopColor: Colors.outlineVariant,
  },
  checkoutBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    ...Shadows.primaryBtn,
  },
  checkoutBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  checkoutBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  checkoutBadgeText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
