import React from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, ScrollView, Modal,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { showMessage } from 'react-native-flash-message';
import { X, Navigation, Check, Home, Briefcase, MapPin } from 'lucide-react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { usersApi } from '@/lib/api';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: (address?: any) => void;
  makeDefault?: boolean;
  autoLocate?: boolean;
  initialCity?: string;
};

const LABELS = [
  { key: 'Home', icon: Home },
  { key: 'Work', icon: Briefcase },
  { key: 'Other', icon: MapPin },
];

const emptyForm = {
  label: 'Home',
  full_name: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
  landmark: '',
};

export default function AddAddressModal({ visible, onClose, onSaved, makeDefault, autoLocate, initialCity }: Props) {
  const { user } = useAuthStore();
  const [form, setForm] = React.useState({ ...emptyForm });
  const [coords, setCoords] = React.useState<{ latitude?: number; longitude?: number }>({});
  const [locating, setLocating] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // Prefill name/phone from the logged-in user each time the modal opens.
  React.useEffect(() => {
    if (visible) {
      setForm({
        ...emptyForm,
        full_name: user?.name || '',
        // Backend stores phone like "+9198…"; keep only the local 10 digits.
        phone: (user?.phone || '').replace(/\D/g, '').slice(-10),
        city: initialCity || '',
      });
      setCoords({});
    }
  }, [visible]);

  const set = (key: keyof typeof emptyForm, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Latest form snapshot for async (GPS) flows that need current values.
  const formRef = React.useRef(form);
  React.useEffect(() => { formRef.current = form; }, [form]);

  const validate = (f: typeof emptyForm): string[] => {
    const missing: string[] = [];
    if (f.full_name.trim().length < 2) missing.push('full name');
    if (!/^\d{10}$/.test(f.phone)) missing.push('10-digit phone');
    if (!f.line1.trim()) missing.push('house / building');
    if (!f.city.trim()) missing.push('city');
    if (!f.state.trim()) missing.push('state');
    if (!/^\d{6}$/.test(f.pincode)) missing.push('6-digit pincode');
    return missing;
  };

  const saveAddress = async (f: typeof emptyForm, c: { latitude?: number; longitude?: number }) => {
    if (saving) return;
    setSaving(true);
    try {
      const { data } = await usersApi.createAddress({
        label: f.label,
        full_name: f.full_name.trim(),
        phone: f.phone.trim(),
        line1: f.line1.trim(),
        line2: f.line2.trim() || undefined,
        city: f.city.trim(),
        state: f.state.trim(),
        pincode: f.pincode.trim(),
        landmark: f.landmark.trim() || undefined,
        latitude: c.latitude,
        longitude: c.longitude,
        is_default: makeDefault,
      });
      showMessage({ message: 'Address saved', type: 'success' });
      onSaved(data?.data);
    } catch (e: any) {
      showMessage({
        message: 'Could not save address',
        description: e.response?.data?.detail || 'Please check the details and try again',
        type: 'danger',
      });
    } finally {
      setSaving(false);
    }
  };

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showMessage({
          message: 'Location permission denied',
          description: 'You can still enter your address manually.',
          type: 'warning',
        });
        return;
      }

      // Fast path: last known position. Fallback: a fresh fix, but never
      // hang forever — time out after 10s so the user can type manually.
      let pos = await Location.getLastKnownPositionAsync();
      if (!pos) {
        pos = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<Location.LocationObject | null>((resolve) => setTimeout(() => resolve(null), 10000)),
        ]);
      }
      if (!pos) {
        showMessage({ message: 'Could not detect location, please enter manually', type: 'info' });
        return;
      }
      const { latitude, longitude } = pos.coords;
      setCoords({ latitude, longitude });

      const places = await Location.reverseGeocodeAsync({ latitude, longitude }).catch(() => []);
      const p = places?.[0];
      if (!p) {
        showMessage({ message: 'Address not found, please enter manually', type: 'info' });
        return;
      }

      const base = formRef.current;
      const detected = {
        ...base,
        line1: [p.name, p.street].filter(Boolean).join(', ') || base.line1,
        line2: p.district || base.line2,
        city: p.city || p.subregion || base.city,
        state: p.region || base.state,
        pincode: p.postalCode || base.pincode,
      };
      setForm(detected);

      // If detection produced everything required, save right away.
      const missing = validate(detected);
      if (missing.length === 0) {
        showMessage({ message: 'Location detected \u2014 saving address\u2026', type: 'success' });
        await saveAddress(detected, { latitude, longitude });
      } else {
        showMessage({
          message: 'Location detected',
          description: `Please complete: ${missing.join(', ')}`,
          type: 'info',
        });
      }
    } catch (e) {
      console.warn('Location error:', e);
      showMessage({ message: 'Failed to get location, please enter manually', type: 'danger' });
    } finally {
      setLocating(false);
    }
  };

  // When opened via the "Use current location" entry point, detect immediately.
  React.useEffect(() => {
    if (visible && autoLocate) {
      useCurrentLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, autoLocate]);

  const phoneValid = /^\d{10}$/.test(form.phone);
  const pincodeValid = /^\d{6}$/.test(form.pincode);
  const canSave =
    form.full_name.trim().length >= 2 &&
    phoneValid &&
    form.line1.trim().length > 0 &&
    form.city.trim().length > 0 &&
    form.state.trim().length > 0 &&
    pincodeValid &&
    !saving;

  const handleSave = async () => {
    if (saving) return;
    const missing = validate(form);
    if (missing.length) {
      showMessage({
        message: 'Missing details',
        description: `Please fill: ${missing.join(', ')}`,
        type: 'warning',
      });
      return;
    }
    await saveAddress(form, coords);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdropTop} onPress={onClose} />
        <View style={styles.sheet}>
            <View style={styles.handleRow}>
              <Text style={styles.title}>Add New Address</Text>
              <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
                <X size={20} color={Colors.onSurface} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.body}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Use current location */}
              <Pressable style={styles.gpsBtn} onPress={useCurrentLocation} disabled={locating}>
                {locating ? (
                  <ActivityIndicator color={Colors.primary} size="small" />
                ) : (
                  <Navigation size={16} color={Colors.primary} />
                )}
                <Text style={styles.gpsText}>
                  {locating ? 'Detecting location...' : 'Use my current location'}
                </Text>
              </Pressable>

              {/* Label chips */}
              <Text style={styles.label}>Save as</Text>
              <View style={styles.chipRow}>
                {LABELS.map(({ key, icon: Icon }) => {
                  const active = form.label === key;
                  return (
                    <Pressable
                      key={key}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => set('label', key)}
                    >
                      <Icon size={14} color={active ? '#fff' : Colors.onSurfaceVariant} />
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{key}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Field label="Full Name" value={form.full_name} onChange={(v) => set('full_name', v)} placeholder="Recipient name" autoCapitalize="words" />
              <Field label="Phone" value={form.phone} onChange={(v) => set('phone', v.replace(/[^0-9]/g, '').slice(0, 10))} placeholder="10-digit mobile" keyboardType="number-pad" />
              <Field label="Flat / House / Building" value={form.line1} onChange={(v) => set('line1', v)} placeholder="e.g. 12B, Green Apartments" />
              <Field label="Area / Street (optional)" value={form.line2} onChange={(v) => set('line2', v)} placeholder="Street, locality" />
              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <Field label="City" value={form.city} onChange={(v) => set('city', v)} placeholder="City" autoCapitalize="words" />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="State" value={form.state} onChange={(v) => set('state', v)} placeholder="State" autoCapitalize="words" />
                </View>
              </View>
              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <Field label="Pincode" value={form.pincode} onChange={(v) => set('pincode', v.replace(/[^0-9]/g, '').slice(0, 6))} placeholder="6-digit" keyboardType="number-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Landmark (optional)" value={form.landmark} onChange={(v) => set('landmark', v)} placeholder="Nearby landmark" />
                </View>
              </View>

              <View style={{ height: 12 }} />
              <Pressable style={[styles.saveBtn, !canSave && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Check size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>Save Address</Text>
                  </>
                )}
              </Pressable>
              <View style={{ height: 12 }} />
            </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label, value, onChange, placeholder, keyboardType, autoCapitalize,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'email-address';
  autoCapitalize?: 'none' | 'words' | 'sentences';
}) {
  return (
    <View style={{ marginBottom: Spacing.sm }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.outlineVariant}
        keyboardType={keyboardType || 'default'}
        autoCapitalize={autoCapitalize || 'sentences'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  backdropTop: { flex: 1 },
  sheet: {
    maxHeight: '88%',
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    overflow: 'hidden',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.outlineVariant,
  },
  title: { fontSize: 18, fontWeight: '800', color: Colors.onSurfaceDeep },
  closeBtn: {
    width: 36, height: 36, borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center', justifyContent: 'center',
  },
  body: { padding: Spacing.lg },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.primaryFixed,
    borderRadius: BorderRadius.xl,
    paddingVertical: 14,
    marginBottom: Spacing.md,
  },
  gpsText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  label: { fontSize: 12, fontWeight: '700', color: Colors.onSurfaceVariant, marginBottom: 6 },
  chipRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.onSurfaceVariant },
  chipTextActive: { color: '#fff' },
  input: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.onSurfaceDeep,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
  },
  row2: { flexDirection: 'row', gap: Spacing.sm },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Shadows.elevated,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
