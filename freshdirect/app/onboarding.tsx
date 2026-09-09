import React from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, ScrollView, Modal,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { showMessage } from 'react-native-flash-message';
import {
  User, Mail, ChevronDown, ArrowRight, MapPin, Navigation, Check, Leaf,
} from 'lucide-react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { usersApi } from '@/lib/api';
import AddAddressModal from '@/components/AddAddressModal';

const CITIES = [
  'Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai',
  'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Gurugram', 'Noida', 'Other',
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, setUser, token } = useAuthStore();

  const [step, setStep] = React.useState<1 | 2>(1);
  const [name, setName] = React.useState(user?.name || '');
  const [email, setEmail] = React.useState(user?.email || '');
  const [city, setCity] = React.useState('');
  const [cityOpen, setCityOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [addrModal, setAddrModal] = React.useState(false);

  const emailValid = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canContinue = name.trim().length >= 2 && !!city && emailValid && !saving;

  const handleContinue = async () => {
    if (!canContinue) return;
    setSaving(true);
    try {
      const { data } = await usersApi.updateMe({ name: name.trim(), email: email.trim() || undefined });
      const u = data.data;
      await setUser(
        { id: u.id, name: u.name || name.trim(), phone: u.phone, email: u.email },
        token ?? undefined,
      );
      setStep(2);
    } catch (e: any) {
      showMessage({
        message: 'Could not save details',
        description: e.response?.data?.detail || 'Please try again',
        type: 'danger',
      });
    } finally {
      setSaving(false);
    }
  };

  const enableLocation = () => {
    // The address modal handles the permission prompt + GPS autofill itself,
    // so we just open it. Opening the modal first (then requesting permission
    // inside it) avoids the Android "grey stuck screen" when a system
    // permission dialog is dismissed right before a modal mounts.
    setAddrModal(true);
  };

  const finish = () => router.replace('/tabs');

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {step === 1 ? (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              <View style={styles.logoCircle}>
                <Leaf size={28} color="#fff" fill="#fff" />
              </View>
              <Text style={styles.title}>Welcome to Gmart!</Text>
              <Text style={styles.subtitle}>Let's set up your profile to get started</Text>

              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputRow}>
                <User size={18} color={Colors.outline} />
                <TextInput
                  style={styles.input}
                  placeholder="Your name"
                  placeholderTextColor={Colors.outlineVariant}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              <Text style={styles.label}>Email</Text>
              <View style={[styles.inputRow, !emailValid && styles.inputRowError]}>
                <Mail size={18} color={Colors.outline} />
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor={Colors.outlineVariant}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {!emailValid && <Text style={styles.errorText}>Enter a valid email address</Text>}

              <Text style={styles.label}>City</Text>
              <Pressable style={styles.inputRow} onPress={() => setCityOpen(true)}>
                <MapPin size={18} color={Colors.outline} />
                <Text style={[styles.input, !city && { color: Colors.outlineVariant }]}>
                  {city || 'Select your city'}
                </Text>
                <ChevronDown size={18} color={Colors.outline} />
              </Pressable>

              <View style={{ height: 28 }} />
              <Pressable
                style={[styles.primaryBtn, !canContinue && { opacity: 0.5 }]}
                onPress={handleContinue}
                disabled={!canContinue}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Continue</Text>
                    <ArrowRight size={18} color="#fff" />
                  </>
                )}
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        ) : (
          <View style={styles.content}>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <View style={styles.locIconWrap}>
                <Navigation size={40} color={Colors.primary} />
              </View>
              <Text style={styles.title}>Enable your location</Text>
              <Text style={[styles.subtitle, { textAlign: 'center' }]}>
                Allow location access so we can deliver fresh groceries to your doorstep.
              </Text>
            </View>

            <Pressable style={styles.primaryBtn} onPress={enableLocation}>
              <Navigation size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Enable Device Location</Text>
            </Pressable>
            <Pressable style={styles.skipBtn} onPress={finish}>
              <Text style={styles.skipText}>Skip for now</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>

      {/* City picker */}
      <Modal visible={cityOpen} transparent animationType="fade" onRequestClose={() => setCityOpen(false)}>
        <Pressable style={styles.pickerBackdrop} onPress={() => setCityOpen(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Select City</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {CITIES.map((c) => (
                <Pressable
                  key={c}
                  style={styles.pickerRow}
                  onPress={() => { setCity(c); setCityOpen(false); }}
                >
                  <Text style={[styles.pickerText, city === c && { color: Colors.primary, fontWeight: '700' }]}>{c}</Text>
                  {city === c && <Check size={16} color={Colors.primary} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Add address */}
      <AddAddressModal
        visible={addrModal}
        autoLocate
        makeDefault
        initialCity={city === 'Other' ? '' : city}
        onClose={() => setAddrModal(false)}
        onSaved={() => { setAddrModal(false); finish(); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flexGrow: 1, padding: Spacing.lg },
  logoCircle: {
    width: 64, height: 64, borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.elevated,
  },
  title: { fontSize: 26, fontWeight: '800', color: Colors.onSurfaceDeep },
  subtitle: { fontSize: 14, color: Colors.onSurfaceVariant, marginTop: 6, marginBottom: Spacing.lg, lineHeight: 21 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.onSurfaceVariant, marginBottom: 6, marginTop: Spacing.md },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
  },
  inputRowError: { borderColor: Colors.error },
  input: { flex: 1, fontSize: 15, color: Colors.onSurfaceDeep },
  errorText: { color: Colors.error, fontSize: 12, marginTop: 4 },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Shadows.elevated,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  skipBtn: { alignItems: 'center', paddingVertical: Spacing.md, marginTop: Spacing.sm },
  skipText: { fontSize: 14, color: Colors.onSurfaceVariant, fontWeight: '600' },
  locIconWrap: {
    width: 96, height: 96, borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: Spacing.lg },
  pickerSheet: { backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.xl, padding: Spacing.md },
  pickerTitle: { fontSize: 16, fontWeight: '800', color: Colors.onSurfaceDeep, marginBottom: Spacing.sm, paddingHorizontal: 4 },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 8,
    borderBottomWidth: 0.5, borderBottomColor: Colors.outlineVariant,
  },
  pickerText: { fontSize: 15, color: Colors.onSurface },
});
