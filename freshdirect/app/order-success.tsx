import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { CheckCircle2, Package, MapPin } from 'lucide-react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { useCartStore } from '@/store/cartStore';
import { ordersApi } from '@/lib/api';

function formatEta(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function OrderSuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const clearCart = useCartStore((s) => s.clearCart);
  const [order, setOrder] = useState<any>(null);
  const fade = useSharedValue(0);

  useEffect(() => {
    clearCart();
    // Simple, clean fade-in — no bounce.
    fade.value = withTiming(1, { duration: 350 });
  }, []);

  useEffect(() => {
    if (!orderId) return;
    (async () => {
      try {
        const { data } = await ordersApi.detail(String(orderId));
        setOrder(data?.data ?? null);
      } catch (e) {
        console.warn('Failed to load order:', e);
      }
    })();
  }, [orderId]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  const addr = order?.address;
  const addressLine = addr
    ? [addr.line1, addr.city].filter(Boolean).join(', ')
    : null;
  const eta = formatEta(order?.estimated_delivery_at);

  return (
    <View style={[styles.container, { paddingBottom: 32 + insets.bottom }]}>
      <View style={styles.successSection}>
        {/* Success icon — clean, static */}
        <Animated.View style={[styles.successCircle, fadeStyle]}>
          <CheckCircle2 size={56} color="#fff" strokeWidth={2.5} />
        </Animated.View>

        <View>
          <Text style={styles.successTitle}>Order Placed!</Text>
          <Text style={styles.successSub}>Your fresh groceries are on the way</Text>
        </View>

        {/* Order details */}
        <View style={styles.orderCard}>
          <View style={styles.orderCardRow}>
            <Package size={20} color={Colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.orderIdLabel}>Order ID</Text>
              <Text style={styles.orderId}>
                {order?.order_number ? `#${order.order_number}` : '—'}
              </Text>
            </View>
          </View>

          {addressLine ? (
            <>
              <View style={styles.orderCardDivider} />
              <View style={styles.orderCardRow}>
                <MapPin size={20} color={Colors.accentMint} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderIdLabel}>Delivering to</Text>
                  <Text style={styles.orderAddress} numberOfLines={2}>{addressLine}</Text>
                </View>
              </View>
            </>
          ) : null}

          {eta ? (
            <>
              <View style={styles.orderCardDivider} />
              <View style={styles.etaRow}>
                <Text style={styles.etaLabel}>Estimated Delivery</Text>
                <Text style={styles.etaTime}>by {eta}</Text>
              </View>
            </>
          ) : null}
        </View>
      </View>

      {/* CTAs */}
      <View style={styles.ctaSection}>
        {orderId ? (
          <Pressable
            style={styles.primaryBtn}
            onPress={() => router.replace({ pathname: '/order/[id]', params: { id: String(orderId) } })}
          >
            <Text style={styles.primaryBtnText}>View Order Details</Text>
          </Pressable>
        ) : null}
        <Pressable style={styles.homeBtn} onPress={() => router.navigate('/tabs')}>
          <Text style={styles.homeBtnText}>Back to Home</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'space-between',
    paddingTop: 80,
  },
  successSection: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
  successCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.primaryBtn,
  },
  successTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.onSurfaceDeep,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  successSub: {
    fontSize: 15,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 4,
  },
  orderCard: {
    width: '100%',
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    ...Shadows.card,
  },
  orderCardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  orderCardDivider: {
    height: 1,
    backgroundColor: Colors.outlineVariant,
    marginVertical: Spacing.sm,
  },
  orderIdLabel: { fontSize: 11, color: Colors.onSurfaceVariant, fontWeight: '600' },
  orderId: { fontSize: 15, fontWeight: '800', color: Colors.primary },
  orderAddress: { fontSize: 13, fontWeight: '600', color: Colors.onSurface },
  etaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  etaLabel: { fontSize: 13, color: Colors.onSurfaceVariant },
  etaTime: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  ctaSection: { gap: Spacing.sm },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.primaryBtn,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  homeBtn: {
    borderRadius: BorderRadius.full,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
  },
  homeBtnText: { fontSize: 15, fontWeight: '600', color: Colors.onSurfaceVariant },
});
