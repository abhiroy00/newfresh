import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
} from 'react-native';
import { appAlert } from '@/lib/appAlert';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import {
  ChevronLeft, CreditCard, Smartphone, Banknote,
  Plus, Check, MapPin,
} from 'lucide-react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { ordersApi, usersApi } from '@/lib/api';
import { useRazorpay, preloadRazorpay, PAYMENT_CANCELLED } from '@/hooks/useRazorpay';

const PAYMENT_METHODS = [
  { id: 'upi', icon: Smartphone, label: 'UPI / GPay / PhonePe', sub: 'Instant transfer', badge: 'POPULAR' },
  { id: 'card', icon: CreditCard, label: 'Credit / Debit Card', sub: 'Visa, Mastercard, RuPay' },
  { id: 'cod', icon: Banknote, label: 'Cash on Delivery', sub: 'Pay when delivered' },
];

const ONLINE_PAYMENT_METHODS = ['upi', 'card'];

export default function PaymentScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState('upi');
  const [placing, setPlacing] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const { subtotal, delivery_fee, total, totalItems, clearCart, fetchCart, items } = useCartStore();
  const { user } = useAuthStore();
  const { startPayment } = useRazorpay();
  const count = totalItems();
  const insets = useSafeAreaInsets();
  const btnScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  // Start downloading Razorpay's bundle as soon as checkout opens, so tapping
  // Pay doesn't stall on a cold script fetch.
  useEffect(() => {
    preloadRazorpay();
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        // Refresh the cart alongside addresses rather than inside handlePay —
        // same freshness, but off the critical path between tap and payment.
        const [addrResult] = await Promise.allSettled([
          usersApi.listAddresses(),
          fetchCart(),
        ]);
        if (!active) return;
        if (addrResult.status === 'rejected') {
          console.warn('Failed to fetch addresses:', addrResult.reason);
          return;
        }
        const addrs = addrResult.value.data.data || [];
        setAddresses(addrs);
        setSelectedAddress((prev) => {
          if (prev && addrs.some((a: any) => a.id === prev)) return prev;
          const def = addrs.find((a: any) => a.is_default) || addrs[0];
          return def ? def.id : '';
        });
      })();
      return () => { active = false; };
    }, [fetchCart])
  );

  const handlePay = async () => {
    if (placing) return;
    if (!selectedAddress) {
      appAlert('No Address', 'Please add a delivery address first.', [
        { text: 'Add Address', onPress: () => router.push('/location') },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    if (items.length === 0) {
      appAlert('Empty Cart', 'Your cart is empty. Please add items before checking out.');
      return;
    }

    setPlacing(true);
    try {
      // The cart was refreshed when this screen gained focus, so read the store
      // directly rather than paying for another round trip here. Read from
      // getState() — not the render-time closure — so a refresh that landed
      // after this render is still seen. The server revalidates regardless.
      const freshItems = useCartStore.getState().items;

      if (freshItems.length === 0) {
        appAlert('Empty Cart', 'Your cart is empty. Please add items before checking out.');
        setPlacing(false);
        return;
      }

      // Create the order on the backend
      const { data: orderRes } = await ordersApi.create({
        address_id: selectedAddress,
        payment_method: selected,
      });
      const order = orderRes.data;

      // If online payment (UPI/Card), go through Razorpay
      if (ONLINE_PAYMENT_METHODS.includes(selected)) {
        const result = await startPayment(order.id, {
          name: user?.name,
          email: user?.email,
          phone: user?.phone,
        });

        if (!result.success) {
          // Payment failed or cancelled — order remains PENDING, user can retry
          if (result.error && result.error !== PAYMENT_CANCELLED) {
            appAlert('Payment Failed', result.error);
          }
          setPlacing(false);
          return;
        }
      }

      // Clear local cart and navigate to success
      await clearCart();
      router.replace({ pathname: '/order-success', params: { orderId: order.id } });
    } catch (e: any) {
      // Try to extract the actual error message from the server
      const data = e.response?.data;
      const detail = typeof data?.detail === 'string'
        ? data.detail
        : (data?.detail?.[0]?.msg || data?.message || '');
      
      if (detail.toLowerCase().includes('cart') && detail.toLowerCase().includes('empty')) {
        appAlert('Empty Cart', 'Your cart is empty. Please add items before checking out.');
        router.back();
      } else if (detail.toLowerCase().includes('payment') && detail.toLowerCase().includes('failed')) {
        appAlert('Payment Error', detail);
      } else {
        appAlert('Order Failed', detail || 'Could not place your order. Please try again.');
      }
    } finally {
      setPlacing(false);
    }
  };

  const currentAddr = addresses.find((a: any) => a.id === selectedAddress);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header} edges={['top']}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={Colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </SafeAreaView>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Delivery Address */}
        <Pressable style={styles.addressCard} onPress={() => router.push('/location')}>
          <MapPin size={18} color={Colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.addressLabel}>Deliver to: {currentAddr?.label || 'Select Address'}</Text>
            <Text style={styles.addressText} numberOfLines={1}>
              {currentAddr ? `${currentAddr.line1}, ${currentAddr.city}` : 'Tap to select delivery address'}
            </Text>
          </View>
          <Text style={{ color: Colors.primary, fontWeight: '600', fontSize: 13 }}>Change</Text>
        </Pressable>

        {/* Order Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{count} items</Text>
            <Text style={styles.summaryValue}>{`\u20b9${subtotal}`}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery</Text>
            <Text style={[styles.summaryValue, delivery_fee === 0 && { color: Colors.accentMint }]}>
              {delivery_fee === 0 ? 'FREE' : `\u20b9${delivery_fee}`}
            </Text>
          </View>
          <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: Colors.outlineVariant, paddingTop: 8, marginTop: 4 }]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{`\u20b9${total}`}</Text>
          </View>
        </View>

        {/* Payment Methods */}
        <Text style={styles.sectionLabel}>Payment Method</Text>
        {PAYMENT_METHODS.map((method) => (
          <Pressable
            key={method.id}
            style={[styles.methodCard, selected === method.id && styles.methodCardSelected]}
            onPress={() => setSelected(method.id)}
          >
            <View style={[styles.methodIcon, selected === method.id && { backgroundColor: Colors.surfaceContainerLow }]}>
              <method.icon size={20} color={selected === method.id ? Colors.primary : Colors.outline} />
            </View>
            <View style={styles.methodInfo}>
              <View style={styles.methodLabelRow}>
                <Text style={styles.methodLabel}>{method.label}</Text>
                {method.badge && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>{method.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.methodSub}>{method.sub}</Text>
            </View>
            <View style={[styles.radio, selected === method.id && styles.radioSelected]}>
              {selected === method.id && <Check size={12} color="#fff" />}
            </View>
          </Pressable>
        ))}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Pay Button */}
      <View style={[styles.payBar, { paddingBottom: Spacing.md + insets.bottom }]}>
        <Pressable
          onPressIn={() => { btnScale.value = withSpring(0.96); }}
          onPressOut={() => { btnScale.value = withSpring(1); }}
          onPress={handlePay}
          disabled={placing}
        >
          <Animated.View style={[styles.payBtn, btnStyle, placing && { opacity: 0.6 }]}>
            {placing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.payBtnText}>
                {selected === 'cod' ? 'Place Order (COD)' : `Pay \u20b9${total}`}
              </Text>
            )}
          </Animated.View>
        </Pressable>
      </View>
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
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: Colors.onSurfaceDeep },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primaryFixed,
    ...Shadows.card,
  },
  addressLabel: { fontSize: 13, fontWeight: '700', color: Colors.onSurfaceDeep },
  addressText: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 2 },
  summaryCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: Colors.onSurfaceDeep, marginBottom: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { fontSize: 14, color: Colors.onSurfaceVariant },
  summaryValue: { fontSize: 14, fontWeight: '600', color: Colors.onSurface },
  totalLabel: { fontSize: 16, fontWeight: '800', color: Colors.onSurfaceDeep },
  totalValue: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: Colors.onSurfaceVariant,
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...Shadows.card,
  },
  methodCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceContainerLow,
  },
  methodIcon: {
    width: 44, height: 44, borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center', justifyContent: 'center',
  },
  methodInfo: { flex: 1 },
  methodLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  methodLabel: { fontSize: 15, fontWeight: '600', color: Colors.onSurface },
  methodSub: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 2 },
  popularBadge: {
    backgroundColor: Colors.primaryFixed,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  popularText: { fontSize: 9, fontWeight: '700', color: Colors.primary },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: Colors.outlineVariant,
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  payBar: {
    padding: Spacing.md,
    backgroundColor: 'rgba(239,254,235,0.95)',
    borderTopWidth: 0.5,
    borderTopColor: Colors.outlineVariant,
  },
  payBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.primaryBtn,
  },
  payBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
