import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator,
} from 'react-native';
import { appAlert } from '@/lib/appAlert';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { ChevronLeft, MapPin, Navigation, Search, Home, Briefcase, Plus, Check, Building, Pencil, Trash2 } from 'lucide-react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { usersApi } from '@/lib/api';
import AddAddressModal from '@/components/AddAddressModal';

const ICON_MAP: Record<string, any> = { Home, Work: Briefcase, Office: Building };

export default function LocationScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [autoLocate, setAutoLocate] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const btnScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const { data } = await usersApi.listAddresses();
      const addrs = data.data || [];
      setAddresses(addrs);
      const def = addrs.find((a: any) => a.is_default) || addrs[0];
      if (def) setSelected(def.id);
    } catch (e) {
      console.warn('Failed to fetch addresses:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async () => {
    if (!selected) return;
    try {
      await usersApi.updateAddress(selected, { is_default: true });
      router.back();
    } catch (e: any) {
      appAlert('Error', e.response?.data?.detail || 'Failed to update address');
    }
  };

  const getIcon = (label: string) => ICON_MAP[label] || MapPin;

  const handleEdit = (addr: any) => {
    setEditingAddress(addr);
    setAutoLocate(false);
    setModalVisible(true);
  };

  const handleDelete = (addr: any) => {
    appAlert('Delete Address', `Remove "${addr.label}" – ${addr.line1}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(addr.id);
          try {
            await usersApi.deleteAddress(addr.id);
            await fetchAddresses();
          } catch (e: any) {
            appAlert('Error', e.response?.data?.detail || 'Failed to delete address');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

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
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={Colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Set Delivery Location</Text>
        <View style={styles.spacer} />
      </SafeAreaView>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {/* Search */}
        <View style={styles.searchBar}>
          <Search size={18} color={Colors.outline} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for area, street name..."
            placeholderTextColor={Colors.outlineVariant}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Use Current Location */}
        <Pressable
          style={styles.currentLocBtn}
          onPress={() => { setEditingAddress(null); setAutoLocate(true); setModalVisible(true); }}
        >
          <View style={styles.currentLocIcon}>
            <Navigation size={18} color={Colors.primary} />
          </View>
          <View style={styles.currentLocInfo}>
            <Text style={styles.currentLocTitle}>Use Current Location</Text>
            <Text style={styles.currentLocSub}>GPS-based accurate delivery</Text>
          </View>
        </Pressable>

        {/* Saved Addresses */}
        <Text style={styles.sectionLabel}>Saved Addresses</Text>

        {addresses.length === 0 && (
          <Text style={{ color: Colors.onSurfaceVariant, fontSize: 14, textAlign: 'center', paddingVertical: 20 }}>
            No saved addresses yet
          </Text>
        )}

        {addresses.map((addr: any) => {
          const Icon = getIcon(addr.label);
          return (
            <Pressable
              key={addr.id}
              style={[styles.addressCard, selected === addr.id && styles.addressCardSelected]}
              onPress={() => setSelected(addr.id)}
            >
              <View style={[styles.addrIcon, selected === addr.id && { backgroundColor: Colors.surfaceContainerLow }]}>
                <Icon size={18} color={selected === addr.id ? Colors.primary : Colors.outline} />
              </View>
              <View style={styles.addrInfo}>
                <View style={styles.addrLabelRow}>
                  <Text style={styles.addrLabel}>{addr.label}</Text>
                  {addr.is_default && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultText}>DEFAULT</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.addrText}>{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</Text>
                <Text style={styles.addrCity}>{addr.city}, {addr.state} {addr.pincode}</Text>
              </View>
              <Pressable hitSlop={8} style={styles.addrActionBtn} onPress={() => handleEdit(addr)}>
                <Pencil size={16} color={Colors.outline} />
              </Pressable>
              <Pressable hitSlop={8} style={styles.addrActionBtn} disabled={deletingId === addr.id} onPress={() => handleDelete(addr)}>
                {deletingId === addr.id ? (
                  <ActivityIndicator size="small" color={Colors.error} />
                ) : (
                  <Trash2 size={16} color={Colors.error} />
                )}
              </Pressable>
              <View style={[styles.radio, selected === addr.id && styles.radioActive]}>
                {selected === addr.id && <Check size={12} color="#fff" />}
              </View>
            </Pressable>
          );
        })}

        {/* Add New */}
        <Pressable
          style={styles.addNewBtn}
          onPress={() => { setEditingAddress(null); setAutoLocate(false); setModalVisible(true); }}
        >
          <Plus size={16} color={Colors.primary} />
          <Text style={styles.addNewText}>Add New Address</Text>
        </Pressable>

        <View style={styles.spacerBottom} />
      </ScrollView>

      <AddAddressModal
        visible={modalVisible}
        autoLocate={autoLocate}
        makeDefault={addresses.length === 0}
        editingAddress={editingAddress}
        onClose={() => { setModalVisible(false); setEditingAddress(null); }}
        onSaved={(addr) => {
          setModalVisible(false);
          setEditingAddress(null);
          fetchAddresses();
          if (addr?.id) setSelected(addr.id);
        }}
      />

      {/* Confirm Button */}
      <View style={[styles.confirmBar, { paddingBottom: Spacing.md + insets.bottom }]}>
        <Pressable
          onPressIn={() => { btnScale.value = withSpring(0.96); }}
          onPressOut={() => { btnScale.value = withSpring(1); }}
          onPress={handleSetDefault}
          disabled={!selected}
        >
          <Animated.View style={[styles.confirmBtn, btnStyle, !selected && { opacity: 0.5 }]}>
            <MapPin size={18} color="#fff" />
            <Text style={styles.confirmBtnText}>Confirm Location</Text>
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
  spacer: { width: 40 },
  scroll: { flex: 1 },
  content: { padding: Spacing.md },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.onSurfaceDeep },
  currentLocBtn: {
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
  currentLocIcon: {
    width: 44, height: 44, borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center', justifyContent: 'center',
  },
  currentLocInfo: { flex: 1 },
  currentLocTitle: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  currentLocSub: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 2 },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: Colors.onSurfaceVariant,
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  addressCard: {
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
  addressCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceContainerLow,
  },
  addrIcon: {
    width: 44, height: 44, borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center', justifyContent: 'center',
  },
  addrActionBtn: {
    width: 32, height: 32, borderRadius: BorderRadius.full,
    alignItems: 'center', justifyContent: 'center',
  },
  addrInfo: { flex: 1 },
  addrLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  addrLabel: { fontSize: 15, fontWeight: '700', color: Colors.onSurfaceDeep },
  defaultBadge: {
    backgroundColor: Colors.primaryFixed,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  defaultText: { fontSize: 9, fontWeight: '700', color: Colors.primary },
  addrText: { fontSize: 13, color: Colors.onSurface },
  addrCity: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 1 },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: Colors.outlineVariant,
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  addNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginTop: Spacing.xs,
  },
  addNewText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  spacerBottom: { height: 100 },
  confirmBar: {
    padding: Spacing.md,
    backgroundColor: 'rgba(239,254,235,0.95)',
    borderTopWidth: 0.5,
    borderTopColor: Colors.outlineVariant,
  },
  confirmBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadows.primaryBtn,
  },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
