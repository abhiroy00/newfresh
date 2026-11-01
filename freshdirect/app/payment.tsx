import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, TextInput,
} from 'react-native';
import { appAlert } from '@/lib/appAlert';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import {
  ChevronLeft, CreditCard, Smartphone, Banknote,
  Plus, Check, MapPin, Clock, Zap,
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

// Quick delivery instructions (Zepto/Swiggy style); saved as the order's
// notes, which the rider sees in their portal.
const INSTRUCTION_OPTIONS = ['Leave at the door', 'Call on arrival', "Don't ring the bell", 'Hand over to security'];

export default function PaymentScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState('upi');
  const [placing, setPlacing] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  // Set once the backend order exists. Creating the order empties the server
  // cart, so a cancelled/failed online payment must be retried against this
  // same order instead of creating a new one (which fails: "Cart is empty").
  const [pendingOrder, setPendingOrder] = useState<{
    id: string; subtotal: number; delivery_fee: number; total: number; count: number;
  } | null>(null);
  // Delivery mode comes from the backend (services/delivery_slots.py), which
  // owns the rule: 9 AM–8 PM IST → express (no slot); otherwise scheduled with
  // a mandatory slot. The same rule is re-checked when the order is created.
  const [slotInfo, setSlotInfo] = useState<{
    mode: 'normal' | 'scheduled';
    estimate_label?: string;
    date: string | null; date_label: string | null;
    slots: { value: string; label: string; available?: boolean }[];
  } | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [instructions, setInstructions] = useState<string[]>([]);
  const [instructionNote, setInstructionNote] = useState('');
  const toggleInstruction = (opt: string) =>
    setInstructions((cur) => (cur.includes(opt) ? cur.filter((o) => o !== opt) : [...cur, opt]));
  const cart = useCartStore();
  const { totalItems, clearCart, fetchCart, items } = cart;
  const subtotal = pendingOrder?.subtotal ?? cart.subtotal;
  const delivery_fee = pendingOrder?.delivery_fee ?? cart.delivery_fee;
  const total = pendingOrder?.total ?? cart.total;
  const { user } = useAuthStore();
  const { startPayment } = useRazorpay();
  const count = pendingOrder?.count ?? totalItems();
  const insets = useSafeAreaInsets();
  const btnScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  // Start downloading Razorpay's bundle as soon as checkout opens, so tapping
  // Pay doesn't stall on a cold script fetch.
  useEffect(() => {
    preloadRazorpay();
  }, []);

  const loadSlots = useCallback(async (addressId?: string) => {
    try {
      const { data } = await ordersApi.deliverySlots(addressId || undefined);
      const info = data.data;
      setSlotInfo(info);
      // Keep the customer's choice across refreshes while it's still offered;
      // never pre-select — a scheduled slot is the customer's explicit choice.
      setSelectedSlot((prev) =>
        info.slots.some((sl: any) => sl.value === prev && sl.available !== false) ? prev : '');
    } catch (e) {
      console.warn('Failed to load delivery options:', e);
    }
  }, []);

  // Re-estimate when the address changes, and re-check every minute so the
  // section switches by itself at 8 PM (→ scheduled) and 9 AM (→ express).
  useEffect(() => {
    if (pendingOrder) return; // the order already carries its delivery
    loadSlots(selectedAddress);
    const timer = setInterval(() => loadSlots(selectedAddress), 60_000);
    return () => clearInterval(timer);
  }, [selectedAddress, loadSlots, pendingOrder]);

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
        // "Change" opens /location, which confirms a choice by making it the
        // default — so the default must win here, or the change never applies.
        const def = addrs.find((a: any) => a.is_default) || addrs[0];
        setSelectedAddress(def ? def.id : '');
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
    if (pendingOrder && !ONLINE_PAYMENT_METHODS.includes(selected)) {
      appAlert(
        'Complete Payment',
        'This order was already placed for online payment. Please pay online, or cancel it from My Orders and order again with Cash on Delivery.',
      );
      return;
    }
    if (!pendingOrder && items.length === 0) {
      appAlert('Empty Cart', 'Your cart is empty. Please add items before checking out.');
      return;
    }
    if (!pendingOrder && slotInfo?.mode === 'scheduled' && !selectedSlot) {
      appAlert('Choose a delivery time', 'Please select your preferred delivery time slot.');
      return;
    }

    setPlacing(true);
    try {
      let order: { id: string } | null = pendingOrder;
      if (!order) {
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
          notes: [...instructions, instructionNote.trim()].filter(Boolean).join(' • ') || undefined,
          // Only scheduled orders carry a slot; the server decides the mode
          // from its own clock and rejects (409) if it now needs one.
          ...(slotInfo?.mode === 'scheduled' && selectedSlot && slotInfo.date
            ? { delivery_slot: selectedSlot, delivery_date: slotInfo.date }
            : {}),
        });
        const created = orderRes.data;
        order = created;
        if (ONLINE_PAYMENT_METHODS.includes(selected)) {
          setPendingOrder({
            id: created.id,
            subtotal: created.subtotal,
            delivery_fee: created.delivery_fee,
            total: created.total,
            count: (created.items || []).reduce((n: number, i: any) => n + (i.quantity || 0), 0),
          });
        }
      }
      if (!order) return;

      // If online payment (UPI/Card), go through Razorpay
      if (ONLINE_PAYMENT_METHODS.includes(selected)) {
        const result = await startPayment(order.id, {
          name: user?.name,
          email: user?.email,
          phone: user?.phone,
        });

        if (!result.success) {
          // Payment failed or cancelled — order remains PENDING; tapping Pay
          // again retries against the same order (see pendingOrder).
          if (result.error && result.error !== PAYMENT_CANCELLED) {
            appAlert('Payment Failed', `${result.error}\n\nYour order is saved — tap Pay to try again.`);
          } else {
            appAlert('Payment not completed', 'Your order is saved. Tap Pay to try again, or find it in My Orders.');
          }
          // The server emptied the cart when the order was created; sync the badge.
          fetchCart();
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
      
      if (e.response?.status === 409) {
        // 8 PM cutoff passed while checking out — show the new date's slots.
        // Delivery mode/date changed (e.g. 8 PM passed mid-checkout) or the
        // slot filled up — show the fresh options and let them choose.
        appAlert('Please choose a delivery time', detail);
        loadSlots(selectedAddress);
      } else if (detail.toLowerCase().includes('cart') && detail.toLowerCase().includes('empty')) {
        appAlert('Empty Cart', 'Your cart is empty. Please add items before checking out.');
        router.back();
      } else if (detail.toLowerCase().includes('payment') && detail.toLowerCase().includes('failed')) {
        appAlert('Payment Error', detail);
      } else {
        appAlert('Order Failed', detail || 'Could not place your order. Please try again.');
      }
      // The server may have changed the cart (unavailable items removed, stock
      // limits) — resync so the summary shows the real total before a retry.
      if (!pendingOrder) fetchCart();
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
        <Pressable
          style={styles.addressCard}
          onPress={() => {
            if (pendingOrder) {
              // The address is snapshotted into the order when it's created.
              appAlert('Address locked', 'This order is already placed with this address. Complete payment, or cancel it from My Orders to change the address.');
              return;
            }
            router.push('/location');
          }}
        >
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

        {/* Delivery: express (9 AM–8 PM) or scheduled (otherwise) */}
        {slotInfo?.mode === 'normal' && (
          <View style={styles.slotCard}>
            <View style={styles.slotHeader}>
              <Zap size={16} color={Colors.primary} />
              <Text style={styles.slotTitle}>Express Delivery</Text>
            </View>
            <Text style={styles.expressEta}>{slotInfo.estimate_label}</Text>
          </View>
        )}
        {slotInfo?.mode === 'scheduled' && (
          <View style={styles.slotCard}>
            <View style={styles.slotHeader}>
              <Clock size={16} color={Colors.primary} />
              <Text style={styles.slotTitle}>Scheduled Delivery</Text>
            </View>
            <Text style={styles.scheduledDate}>{slotInfo.date_label}</Text>
            <Text style={styles.slotHint}>Choose your preferred delivery time.</Text>
            <View style={styles.slotGrid}>
              {slotInfo.slots.map((sl) => {
                const active = sl.value === selectedSlot;
                const full = sl.available === false;
                return (
                  <Pressable
                    key={sl.value}
                    style={[
                      styles.slotChip, active && styles.slotChipActive,
                      (full || (!!pendingOrder && !active)) && { opacity: 0.4 },
                    ]}
                    // The slot is saved on the order when it's created; full slots can't be booked.
                    disabled={!!pendingOrder || full}
                    onPress={() => setSelectedSlot(sl.value)}
                  >
                    <Text style={[styles.slotChipText, active && styles.slotChipTextActive]}>{sl.label}</Text>
                    {full ? <Text style={styles.slotFull}>Full</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Delivery instructions */}
        <View style={styles.slotCard}>
          <Text style={styles.slotTitle}>Delivery instructions</Text>
          <View style={[styles.slotGrid, { marginTop: Spacing.sm }]}>
            {INSTRUCTION_OPTIONS.map((opt) => {
              const active = instructions.includes(opt);
              return (
                <Pressable
                  key={opt}
                  style={[styles.instructionChip, active && styles.slotChipActive]}
                  disabled={!!pendingOrder}
                  onPress={() => toggleInstruction(opt)}
                >
                  <Text style={[styles.slotChipText, active && styles.slotChipTextActive]}>{opt}</Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            style={styles.instructionInput}
            placeholder="Anything else for the delivery partner? (optional)"
            placeholderTextColor={Colors.outlineVariant}
            value={instructionNote}
            onChangeText={setInstructionNote}
            editable={!pendingOrder}
            maxLength={200}
          />
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
  slotCard: {
    backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.xl,
    padding: Spacing.md, marginBottom: Spacing.lg, ...Shadows.card,
  },
  slotHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  slotTitle: { fontSize: 15, fontWeight: '700', color: Colors.onSurfaceDeep },
  expressEta: { fontSize: 14, fontWeight: '700', color: Colors.primary, marginTop: 6 },
  scheduledDate: { fontSize: 14, fontWeight: '700', color: Colors.primary, marginTop: 6 },
  slotFull: { fontSize: 10, color: Colors.error, fontWeight: '700', marginTop: 1 },
  slotHint: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 4, marginBottom: Spacing.sm },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotChip: {
    width: '31%', alignItems: 'center', paddingVertical: 10,
    borderRadius: BorderRadius.lg, borderWidth: 1.5, borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLow,
  },
  instructionChip: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLow,
  },
  instructionInput: {
    marginTop: Spacing.sm, backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: 10, fontSize: 13, color: Colors.onSurfaceDeep,
  },
  slotChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryContainer },
  slotChipText: { fontSize: 13, fontWeight: '600', color: Colors.onSurfaceVariant },
  slotChipTextActive: { color: Colors.onPrimaryContainer, fontWeight: '700' },
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
