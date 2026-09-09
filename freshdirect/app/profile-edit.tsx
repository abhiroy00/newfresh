import React from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { showMessage } from 'react-native-flash-message';
import { ChevronLeft, User, Mail, Phone, Check } from 'lucide-react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { usersApi } from '@/lib/api';
import { formatPhone } from '@/lib/phone';

export default function ProfileEditScreen() {
  const router = useRouter();
  const { user, setUser, token } = useAuthStore();

  const insets = useSafeAreaInsets();
  const [name, setName] = React.useState(user?.name || '');
  const [email, setEmail] = React.useState(user?.email || '');
  const [phone, setPhone] = React.useState(user?.phone || '');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await usersApi.me();
        const u = data.data;
        if (cancelled) return;
        setName(u.name || '');
        setEmail(u.email || '');
        setPhone(u.phone || '');
      } catch (e) {
        console.warn('Failed to load profile:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const emailValid = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSave = name.trim().length >= 2 && emailValid && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const { data } = await usersApi.updateMe({ name: name.trim(), email: email.trim() || undefined });
      const u = data.data;
      await setUser(
        { id: u.id, name: u.name || '', phone: u.phone, email: u.email },
        token ?? undefined,
      );
      showMessage({ message: 'Profile updated', type: 'success' });
      router.back();
    } catch (e: any) {
      showMessage({
        message: 'Update failed',
        description: e.response?.data?.detail || 'Please try again',
        type: 'danger',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.header} edges={['top']}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={Colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </SafeAreaView>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Spacing.lg + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(name || 'U').charAt(0).toUpperCase()}</Text>
          </View>
        </View>

        {/* Name */}
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

        {/* Email */}
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

        {/* Phone (read-only) */}
        <Text style={styles.label}>Phone</Text>
        <View style={[styles.inputRow, styles.inputDisabled]}>
          <Phone size={18} color={Colors.outline} />
          <Text style={styles.disabledText}>{formatPhone(phone)}</Text>
        </View>
        <Text style={styles.hint}>Phone number can't be changed</Text>

        <View style={{ height: 24 }} />
        <Pressable
          style={[styles.saveBtn, !canSave && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={!canSave}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Check size={18} color="#fff" />
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
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
  content: { padding: Spacing.lg },
  avatarWrap: { alignItems: 'center', marginBottom: Spacing.lg },
  avatar: {
    width: 88, height: 88, borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 36, fontWeight: '800', color: Colors.onPrimaryContainer },
  label: {
    fontSize: 13, fontWeight: '700', color: Colors.onSurfaceVariant,
    marginBottom: 6, marginTop: Spacing.md,
  },
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
  inputDisabled: { backgroundColor: Colors.surfaceContainerLow, borderColor: 'transparent' },
  input: { flex: 1, fontSize: 15, color: Colors.onSurfaceDeep },
  disabledText: { flex: 1, fontSize: 15, color: Colors.onSurfaceVariant },
  errorText: { color: Colors.error, fontSize: 12, marginTop: 4 },
  hint: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 4 },
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
