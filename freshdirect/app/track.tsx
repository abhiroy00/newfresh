import React from 'react';
import { usePullRefresh } from '@/hooks/usePullRefresh';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  ChevronLeft, Phone, Package, CheckCircle2, Truck, Clock, Home,
} from 'lucide-react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { ordersApi } from '@/lib/api';
import { formatDeliveryTime, formatStepTime, stepTimes } from '@/lib/deliveryTime';
import DeliveryOtpCard from '@/components/DeliveryOtpCard';

const STATUS_ORDER = ['pending', 'confirmed', 'packing', 'out_for_delivery', 'delivered'];
const ACTIVE_STATUSES = ['pending', 'confirmed', 'packing', 'out_for_delivery'];
// Tracking refreshes itself this often while the screen is open.
const POLL_MS = 15_000;

const STEPS = [
  { key: 'pending',          label: 'Order Placed',       Icon: CheckCircle2 },
  { key: 'confirmed',        label: 'Order Confirmed',    Icon: CheckCircle2 },
  { key: 'packing',          label: 'Being Packed',       Icon: Package },
  { key: 'out_for_delivery', label: 'Out for Delivery',   Icon: Truck },
  { key: 'delivered',        label: 'Delivered',          Icon: Home },
];

function getInitials(name?: string | null) {
  if (!name) return '?';
  return name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}


export default function TrackScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [order, setOrder] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  const [noActiveOrder, setNoActiveOrder] = React.useState(false);
  const hasOrder = React.useRef(false);

  const loadOrder = React.useCallback(async () => {
    try {
      // Opened without an order (e.g. from Help): track the latest active one.
      let orderId = id ? String(id) : null;
      if (!orderId) {
        const { data } = await ordersApi.list({ page: 1, per_page: 10 });
        const active = (data?.data || []).find((o: any) => ACTIVE_STATUSES.includes(o.status));
        if (!active) { setNoActiveOrder(true); setError(false); return; }
        orderId = active.id;
      }
      const { data } = await ordersApi.detail(orderId!);
      setOrder(data?.data ?? null);
      hasOrder.current = !!data?.data;
      setNoActiveOrder(false);
      setError(false);
    } catch {
      // Keep showing the last good data on a failed background refresh.
      if (!hasOrder.current) setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Load on focus and keep refreshing while the order is still on its way,
  // so status, rider and ETA update without the customer pulling to refresh.
  const isActive = !order || ACTIVE_STATUSES.includes(order.status);
  useFocusEffect(
    React.useCallback(() => {
      loadOrder();
      if (!isActive) return;
      const timer = setInterval(loadOrder, POLL_MS);
      return () => clearInterval(timer);
    }, [loadOrder, isActive])
  );

  const { refreshControl } = usePullRefresh(loadOrder);

  const Header = (
    <SafeAreaView style={styles.header} edges={['top']}>
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <ChevronLeft size={22} color={Colors.onSurface} />
      </Pressable>
      <Text style={styles.headerTitle}>Track Delivery</Text>
      <View style={{ width: 40 }} />
    </SafeAreaView>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {Header}
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </View>
    );
  }

  if (noActiveOrder) {
    return (
      <View style={styles.container}>
        {Header}
        <View style={styles.center}>
          <Package size={48} color={Colors.onSurfaceVariant} />
          <Text style={styles.emptyText}>No active orders to track right now</Text>
          <Pressable style={styles.secondaryBtn} onPress={() => router.replace('/tabs/orders')}>
            <Text style={styles.secondaryBtnText}>View my orders</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.container}>
        {Header}
        <View style={styles.center}>
          <Package size={48} color={Colors.onSurfaceVariant} />
          <Text style={styles.emptyText}>Couldn't load tracking info</Text>
        </View>
      </View>
    );
  }

  const currentIdx = STATUS_ORDER.indexOf(order.status);
  const rider = order.rider;
  const eta = formatDeliveryTime(order.estimated_delivery_at);
  const times = stepTimes(order.timeline);

  return (
    <View style={styles.container}>
      {Header}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} refreshControl={refreshControl}>

        {/* Order info + ETA */}
        <View style={styles.card}>
          <View style={styles.orderRow}>
            <Text style={styles.orderNumber}>#{order.order_number}</Text>
            <View style={[styles.statusBadge, { backgroundColor: Colors.primaryContainer }]}>
              <Text style={styles.statusText}>
                {order.status === 'out_for_delivery' ? 'Out for Delivery'
                  : order.status === 'packing' ? 'Being Packed'
                  : order.status === 'confirmed' ? 'Confirmed'
                  : order.status === 'delivered' ? 'Delivered'
                  : 'Pending'}
              </Text>
            </View>
          </View>
          {eta && order.status !== 'delivered' && (
            <View style={styles.etaRow}>
              <Clock size={14} color={Colors.primary} />
              <Text style={styles.etaText}>
                {order.delivery_type === 'normal' ? 'Express delivery by' : 'Scheduled delivery'}: <Text style={styles.etaBold}>{eta}</Text>
              </Text>
            </View>
          )}
        </View>

        <DeliveryOtpCard otp={order.delivery_otp} />

        {/* Rider card — only shown if assigned */}
        {rider ? (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Delivery Partner</Text>
            <View style={styles.riderRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(rider.name)}</Text>
              </View>
              <View style={styles.riderInfo}>
                <Text style={styles.riderName}>{rider.name || 'Rider'}</Text>
                <Text style={styles.riderSub}>Delivery Partner</Text>
              </View>
              {rider.phone ? (
                <Pressable
                  style={styles.callBtn}
                  onPress={() => Linking.openURL(`tel:${rider.phone}`)}
                >
                  <Phone size={18} color="#fff" />
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : order.status !== 'pending' ? (
          <View style={styles.card}>
            <View style={styles.riderPending}>
              <Truck size={20} color={Colors.onSurfaceVariant} />
              <Text style={styles.riderPendingText}>Delivery partner will be assigned soon</Text>
            </View>
          </View>
        ) : null}

        {/* Timeline */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Order Timeline</Text>
          {STEPS.map((step, index) => {
            const done = STATUS_ORDER.indexOf(step.key) <= currentIdx;
            const isLast = index === STEPS.length - 1;
            return (
              <View key={step.key} style={styles.step}>
                <View style={styles.stepLeft}>
                  <View style={[styles.circle, done ? styles.circleDone : styles.circlePending]}>
                    <step.Icon size={14} color={done ? '#fff' : Colors.onSurfaceVariant} />
                  </View>
                  {!isLast && (
                    <View style={[styles.line, done && index < currentIdx && styles.lineDone]} />
                  )}
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepLabel, !done && { color: Colors.onSurfaceVariant }]}>
                    {step.label}
                  </Text>
                  {done && formatStepTime(times[step.key]) ? (
                    <Text style={styles.stepTime}>{formatStepTime(times[step.key])}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  stepTime: { fontSize: 11, color: Colors.onSurfaceVariant, marginTop: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
    backgroundColor: 'rgba(239,254,235,0.95)',
    borderBottomWidth: 0.5, borderBottomColor: Colors.outlineVariant,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: Colors.onSurfaceDeep },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, gap: Spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: Colors.onSurfaceVariant, marginTop: 12 },
  secondaryBtn: {
    marginTop: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: 10,
    borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.primary,
  },
  secondaryBtnText: { color: Colors.primary, fontSize: 13, fontWeight: '700' },
  card: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    ...Shadows.card,
  },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderNumber: { fontSize: 16, fontWeight: '800', color: Colors.onSurfaceDeep },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  etaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: Spacing.sm, paddingTop: Spacing.sm,
    borderTopWidth: 0.5, borderTopColor: Colors.outlineVariant,
  },
  etaText: { fontSize: 13, color: Colors.onSurface },
  etaBold: { fontWeight: '800', color: Colors.primary },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: Colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm },
  riderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: Colors.onPrimaryContainer, fontSize: 16, fontWeight: '800' },
  riderInfo: { flex: 1 },
  riderName: { fontSize: 15, fontWeight: '700', color: Colors.onSurfaceDeep },
  riderSub: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 1 },
  callBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...Shadows.primaryCard,
  },
  riderPending: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  riderPendingText: { fontSize: 13, color: Colors.onSurfaceVariant, flex: 1 },
  step: { flexDirection: 'row', gap: Spacing.sm },
  stepLeft: { alignItems: 'center', width: 32 },
  circle: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  circleDone: { backgroundColor: Colors.primary },
  circlePending: { backgroundColor: Colors.surfaceContainerHigh },
  line: { width: 2, flex: 1, backgroundColor: Colors.outlineVariant, marginVertical: 3 },
  lineDone: { backgroundColor: Colors.primary },
  stepContent: { flex: 1, paddingBottom: Spacing.md, justifyContent: 'center' },
  stepLabel: { fontSize: 14, fontWeight: '600', color: Colors.onSurface },
});
