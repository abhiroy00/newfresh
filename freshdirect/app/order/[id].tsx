import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft, Package, Clock, CheckCircle2, Truck, XCircle, MapPin,
} from 'lucide-react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { ordersApi } from '@/lib/api';

const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    pending: 'Pending', confirmed: 'Confirmed', preparing: 'Preparing',
    out_for_delivery: 'Out for Delivery', delivered: 'Delivered', cancelled: 'Cancelled',
  };
  return map[s] || s;
};

const statusColor = (s: string) => {
  if (s === 'delivered') return '#28c38a';
  if (s === 'out_for_delivery') return Colors.accentOrange;
  if (s === 'cancelled') return Colors.error;
  return Colors.outline;
};

const StatusIcon = ({ status, size = 16 }: { status: string; size?: number }) => {
  const color = statusColor(status);
  if (status === 'delivered') return <CheckCircle2 size={size} color={color} />;
  if (status === 'out_for_delivery') return <Truck size={size} color={color} />;
  if (status === 'cancelled') return <XCircle size={size} color={color} />;
  return <Clock size={size} color={color} />;
};

export default function OrderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [order, setOrder] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await ordersApi.detail(String(id));
        if (!cancelled) setOrder(data?.data ?? null);
      } catch (e) {
        console.warn('Failed to load order:', e);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const Header = (
    <SafeAreaView style={styles.header} edges={['top']}>
      <Pressable style={styles.iconBtn} onPress={() => router.back()}>
        <ChevronLeft size={22} color={Colors.onSurface} />
      </Pressable>
      <Text style={styles.headerTitle}>Order Details</Text>
      <View style={styles.iconBtn} />
    </SafeAreaView>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {Header}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
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
          <Text style={styles.emptyText}>Couldn't load this order</Text>
        </View>
      </View>
    );
  }

  const color = statusColor(order.status);
  const items: any[] = order.items || [];
  const addr = order.address || order.delivery_address;

  return (
    <View style={styles.container}>
      {Header}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status card */}
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.orderNumber}>#{order.order_number || order.id}</Text>
              {order.created_at ? (
                <Text style={styles.orderDate}>
                  {new Date(order.created_at).toLocaleString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
              ) : null}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
              <StatusIcon status={order.status} size={14} />
              <Text style={[styles.statusText, { color }]}>{statusLabel(order.status)}</Text>
            </View>
          </View>

          {['confirmed', 'packing', 'out_for_delivery'].includes(order.status) && (
            <Pressable
              style={styles.trackBtn}
              onPress={() => router.push({ pathname: '/track', params: { id: order.id } })}
            >
              <Truck size={14} color="#fff" />
              <Text style={styles.trackBtnText}>Track Order</Text>
            </Pressable>
          )}
        </View>

        {/* Delivery address */}
        {addr ? (
          <View style={styles.card}>
            <View style={styles.sectionTitleRow}>
              <MapPin size={16} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Delivery Address</Text>
            </View>
            {addr.full_name ? <Text style={styles.addrName}>{addr.full_name}</Text> : null}
            <Text style={styles.addrLine}>
              {[addr.line1, addr.line2, addr.city, addr.state, addr.pincode]
                .filter(Boolean)
                .join(', ')}
            </Text>
          </View>
        ) : null}

        {/* Items */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{items.length} Item{items.length !== 1 ? 's' : ''}</Text>
          {items.map((it: any, i: number) => (
            <View
              key={it.id || i}
              style={[styles.itemRow, i < items.length - 1 && styles.itemDivider]}
            >
              {it.product_image_url || it.product?.primary_image_url || it.product?.images?.[0]?.url ? (
                <Image
                  source={{ uri: it.product_image_url || it.product?.primary_image_url || it.product?.images?.[0]?.url }}
                  style={styles.itemImage}
                />
              ) : (
                <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                  <Package size={20} color={Colors.outline} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {it.product_name || it.product?.name || 'Item'}
                </Text>
                <Text style={styles.itemQty}>Qty: {it.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>
                {`\u20b9${it.item_total ?? it.price_at_add ?? it.product?.price ?? 0}`}
              </Text>
            </View>
          ))}
        </View>

        {/* Bill summary */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Bill Summary</Text>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Subtotal</Text>
            <Text style={styles.billValue}>{`\u20b9${order.subtotal ?? 0}`}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Delivery Fee</Text>
            <Text style={styles.billValue}>{`\u20b9${order.delivery_fee ?? 0}`}</Text>
          </View>
          <View style={[styles.billRow, styles.billTotalRow]}>
            <Text style={styles.billTotalLabel}>Total</Text>
            <Text style={styles.billTotalValue}>{`\u20b9${order.total ?? 0}`}</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
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
    paddingBottom: Spacing.md,
    backgroundColor: 'rgba(239,254,235,0.95)',
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.outlineVariant,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.onSurfaceDeep },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, gap: Spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: Colors.onSurfaceVariant, marginTop: 12 },
  card: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    ...Shadows.card,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNumber: { fontSize: 16, fontWeight: '800', color: Colors.onSurfaceDeep },
  orderDate: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.md,
  },
  trackBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.onSurfaceDeep, marginBottom: Spacing.sm },
  addrName: { fontSize: 14, fontWeight: '600', color: Colors.onSurface, marginBottom: 2 },
  addrLine: { fontSize: 13, color: Colors.onSurfaceVariant, lineHeight: 19 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  itemDivider: { borderBottomWidth: 0.5, borderBottomColor: Colors.outlineVariant },
  itemImage: { width: 48, height: 48, borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceContainerLow },
  itemImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: 13, fontWeight: '600', color: Colors.onSurface },
  itemQty: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: '700', color: Colors.onSurfaceDeep },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  billLabel: { fontSize: 13, color: Colors.onSurfaceVariant },
  billValue: { fontSize: 13, fontWeight: '600', color: Colors.onSurface },
  billTotalRow: {
    borderTopWidth: 0.5,
    borderTopColor: Colors.outlineVariant,
    marginTop: 6,
    paddingTop: 10,
  },
  billTotalLabel: { fontSize: 15, fontWeight: '800', color: Colors.onSurfaceDeep },
  billTotalValue: { fontSize: 16, fontWeight: '800', color: Colors.primary },
});
