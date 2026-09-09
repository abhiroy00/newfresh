import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Image, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  User, MapPin, Package, Shield,
  HelpCircle, ChevronRight, LogOut, Star, Edit3, FileText, Lock,
} from 'lucide-react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { usersApi, ordersApi } from '@/lib/api';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { formatPhone } from '@/lib/phone';

// Standard delivery fee (mirrors backend DELIVERY_FEE) — used to value
// the free-delivery savings shown in the profile stats.
const DELIVERY_FEE = 49;

const MENU_ITEMS = [
  {
    group: 'Account',
    items: [
      { icon: User, label: 'Edit Profile', route: '/profile-edit' },
      { icon: MapPin, label: 'Delivery Addresses', route: '/location' },
      { icon: Package, label: 'My Orders', route: '/tabs/orders' },
    ],
  },
  {
    group: 'Support',
    items: [
      { icon: Shield, label: 'Safety Center', route: '/safety' },
      { icon: HelpCircle, label: 'Help Center', route: '/help' },
    ],
  },
  {
    group: 'Legal',
    items: [
      { icon: Lock, label: 'Privacy Policy', route: '/privacy' },
      { icon: FileText, label: 'Terms & Conditions', route: '/terms' },
    ],
  },
];

export default function ProfileScreen() {
  const router = useRouter();
  const tabBarHeight = useTabBarHeight();
  const { user, logout, setUser } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ orders: 0, saved: 0 });

  // Refetch on focus so edits from profile-edit show up immediately
  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        try {
          const { data } = await usersApi.me();
          setProfile(data.data);
        } catch (e) {
          console.warn('Failed to fetch profile:', e);
        }
        try {
          const { data } = await ordersApi.list({ page: 1, per_page: 50 });
          const orders = data.data || [];
          // "Saved" = real money saved: coupon/discounts + waived delivery fees
          const saved = orders.reduce(
            (sum: number, o: any) =>
              sum + (o.discount || 0) + ((o.delivery_fee || 0) === 0 && o.status !== 'cancelled' ? DELIVERY_FEE : 0),
            0,
          );
          const orderCount = orders.filter((o: any) => o.status !== 'cancelled').length;
          setStats({ orders: orderCount, saved: Math.round(saved) });
        } catch (e) {
          console.warn('Failed to fetch order stats:', e);
        }
      })();
    }, [])
  );

  const doLogout = async () => {
    await logout();
    router.replace('/auth/login');
  };

  const handleLogout = () => {
    // Alert.alert is a no-op on web — use window.confirm there instead
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to log out?')) doLogout();
      return;
    }
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: doLogout },
    ]);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header} edges={['top']}>
        <Text style={styles.headerTitle}>My Profile</Text>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View>
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(profile?.name || user?.name || 'U').charAt(0)}
                </Text>
              </View>
              <Pressable style={styles.editAvatarBtn} onPress={() => router.push('/profile-edit')}>
                <Edit3 size={12} color="#fff" />
              </Pressable>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile?.name || user?.name || 'User'}</Text>
              <Text style={styles.profilePhone}>{formatPhone(profile?.phone || user?.phone)}</Text>
              {profile?.email && <Text style={{ fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 1 }}>{profile.email}</Text>}
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View>
          <View style={styles.statsRow}>
            {[
              { label: 'Orders', value: String(stats.orders) },
              { label: 'Saved', value: `\u20b9${stats.saved.toLocaleString('en-IN')}` },
            ].map((stat) => (
              <View key={stat.label} style={styles.statItem}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Menu Groups */}
        {MENU_ITEMS.map((group, gi) => (
          <View
            key={group.group}
          >
            <Text style={styles.groupLabel}>{group.group}</Text>
            <View style={styles.menuCard}>
              {group.items.map((item, ii) => (
                <Pressable
                  key={item.label}
                  style={[styles.menuItem, ii < group.items.length - 1 && styles.menuItemBorder]}
                  onPress={() => router.navigate(item.route as any)}
                >
                  <View style={styles.menuItemIcon}>
                    <item.icon size={18} color={Colors.primary} />
                  </View>
                  <Text style={styles.menuItemText}>{item.label}</Text>
                  <ChevronRight size={16} color={Colors.outline} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {/* Logout */}
        <View>
          <Pressable style={styles.logoutBtn} onPress={handleLogout}>
            <LogOut size={18} color={Colors.error} />
            <Text style={styles.logoutText}>Log Out</Text>
          </Pressable>
        </View>

        <Text style={styles.versionText}>Gmart v1.0.0</Text>
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
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: 0 },
  profileCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  avatarContainer: { position: 'relative' },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: Colors.onPrimaryContainer },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surfaceCard,
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '700', color: Colors.onSurfaceDeep },
  profilePhone: { fontSize: 13, color: Colors.onSurfaceVariant, marginTop: 2 },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#fff3e0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  memberText: { fontSize: 11, fontWeight: '700', color: Colors.accentOrange },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 2 },
  groupLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
    paddingHorizontal: 4,
  },
  menuCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  menuItemBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.outlineVariant,
  },
  menuItemIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: { flex: 1, fontSize: 15, fontWeight: '500', color: Colors.onSurface },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.errorContainer,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: Colors.error },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.outlineVariant,
    marginTop: Spacing.lg,
  },
});
