import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Package, ChevronRight, Clock, CheckCircle2, Truck, XCircle } from 'lucide-react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { ordersApi } from '@/lib/api';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';

const StatusIcon = ({ status }: { status: string }) => {
  if (status === 'delivered') return <CheckCircle2 size={14} color="#28c38a" />;
  if (status === 'out_for_delivery') return <Truck size={14} color={Colors.accentOrange} />;
  if (status === 'cancelled') return <XCircle size={14} color={Colors.error} />;
  return <Clock size={14} color={Colors.outline} />;
};

const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    pending: 'Pending', confirmed: 'Confirmed', packing: 'Packing', preparing: 'Preparing',
    out_for_delivery: 'Out for Delivery', delivered: 'Delivered', cancelled: 'Cancelled', refunded: 'Refunded',
  };
  return map[s] || s;
};

const statusColor = (s: string) => {
  if (s === 'delivered') return '#28c38a';
  if (s === 'out_for_delivery') return Colors.accentOrange;
  if (s === 'cancelled') return Colors.error;
  return Colors.outline;
};

export default function OrdersScreen() {
  const router = useRouter();
  const tabBarHeight = useTabBarHeight();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await ordersApi.list({ page: 1, per_page: 20 });
      setOrders(data.data || []);
    } catch (e) {
      console.warn('Failed to fetch orders:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch every time the tab gains focus — statuses change server-side
  // (admin marks delivered etc.) and must not go stale.
  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  }, [fetchOrders]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header} edges={['top']}>
        <Text style={styles.headerTitle}>My Orders</Text>
        <Text style={styles.headerSub}>{orders.length} orders placed</Text>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />
        }
      >
        {orders.length === 0 && (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Package size={48} color={Colors.onSurfaceVariant} />
            <Text style={{ fontSize: 16, color: Colors.onSurfaceVariant, marginTop: 12 }}>No orders yet</Text>
          </View>
        )}

        {orders.map((order: any) => {
          const color = statusColor(order.status);
          const firstItem = order.items?.[0];
          const firstItemImage = firstItem?.product_image_url || firstItem?.product?.primary_image_url || firstItem?.product?.images?.[0]?.url;
          return (
            <View key={order.id}>
              <Pressable
                style={styles.orderCard}
                onPress={() => router.push({ pathname: '/order/[id]', params: { id: order.id } })}
              >
                {firstItemImage ? (
                  <Image source={{ uri: firstItemImage }} style={styles.orderImage} resizeMode="contain" />
                ) : (
                  <View style={[styles.orderImage, { backgroundColor: Colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center' }]}>
                    <Package size={24} color={Colors.outline} />
                  </View>
                )}
                <View style={styles.orderInfo}>
                  <View style={styles.orderTopRow}>
                    <Text style={styles.orderId}>#{order.order_number}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
                      <StatusIcon status={order.status} />
                      <Text style={[styles.statusText, { color }]}>{statusLabel(order.status)}</Text>
                    </View>
                  </View>
                  <Text style={styles.orderDate}>{new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                  <View style={styles.orderBottomRow}>
                    <Text style={styles.orderItems}>{order.items?.length || 0} items</Text>
                    <Text style={styles.orderTotal}>{`\u20b9${order.total}`}</Text>
                  </View>
                  {order.status === 'out_for_delivery' && (
                    <Pressable style={styles.trackBtn} onPress={() => router.push('/track')}>
                      <Truck size={12} color="#fff" />
                      <Text style={styles.trackBtnText}>Track Order</Text>
                    </Pressable>
                  )}
                </View>
                <ChevronRight size={18} color={Colors.outline} />
              </Pressable>
            </View>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>
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
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: 0 },
  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
    ...Shadows.card,
  },
  orderImage: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceContainerLow,
  },
  orderInfo: { flex: 1 },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  orderId: { fontSize: 14, fontWeight: '700', color: Colors.onSurfaceDeep },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  orderDate: { fontSize: 12, color: Colors.onSurfaceVariant, marginBottom: 4 },
  orderBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderItems: { fontSize: 13, color: Colors.onSurfaceVariant },
  orderTotal: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    marginTop: 6,
  },
  trackBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
