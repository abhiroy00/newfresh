import React from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { showMessage } from 'react-native-flash-message';
import { ChevronLeft, User, Mail, Phone, Check, Users, Plus, Trash2, X } from 'lucide-react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { usersApi, familyMembersApi, type Gender } from '@/lib/api';
import { formatPhone } from '@/lib/phone';

type FamilyMember = { id: string; name?: string | null; age: number; weight_kg: number; gender?: Gender | null };

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];
const genderLabel = (g?: string | null) => GENDER_OPTIONS.find((o) => o.value === g)?.label;

export default function ProfileEditScreen() {
  const router = useRouter();
  const { user, setUser, token } = useAuthStore();

  const insets = useSafeAreaInsets();
  const [name, setName] = React.useState(user?.name || '');
  const [email, setEmail] = React.useState(user?.email || '');
  const [phone, setPhone] = React.useState(user?.phone || '');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const [familyMembers, setFamilyMembers] = React.useState<FamilyMember[]>([]);
  const [showAddMember, setShowAddMember] = React.useState(false);
  const [memberName, setMemberName] = React.useState('');
  const [memberAge, setMemberAge] = React.useState('');
  const [memberWeight, setMemberWeight] = React.useState('');
  const [memberGender, setMemberGender] = React.useState<Gender | null>(null);
  const [addingMember, setAddingMember] = React.useState(false);
  const [removingMemberId, setRemovingMemberId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ data }, familyRes] = await Promise.all([
          usersApi.me(),
          familyMembersApi.list(),
        ]);
        const u = data.data;
        if (cancelled) return;
        setName(u.name || '');
        setEmail(u.email || '');
        setPhone(u.phone || '');
        setFamilyMembers(familyRes.data.data || []);
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

  const memberAgeNum = Number(memberAge);
  const memberWeightNum = Number(memberWeight);
  const memberFormValid =
    memberAge.trim().length > 0 && memberAgeNum >= 0 && memberAgeNum <= 120 &&
    memberWeight.trim().length > 0 && memberWeightNum > 0 && memberWeightNum <= 300 &&
    memberGender !== null;

  const resetAddMemberForm = () => {
    setShowAddMember(false);
    setMemberName('');
    setMemberAge('');
    setMemberWeight('');
    setMemberGender(null);
  };

  const handleAddMember = async () => {
    if (!memberFormValid || addingMember) return;
    setAddingMember(true);
    try {
      const { data } = await familyMembersApi.create({
        name: memberName.trim() || undefined,
        age: memberAgeNum,
        weight_kg: memberWeightNum,
        gender: memberGender ?? undefined,
      });
      setFamilyMembers((prev) => [...prev, data.data]);
      resetAddMemberForm();
    } catch (e: any) {
      showMessage({
        message: 'Could not add family member',
        description: e.response?.data?.detail || 'Please try again',
        type: 'danger',
      });
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (id: string) => {
    setRemovingMemberId(id);
    try {
      await familyMembersApi.remove(id);
      setFamilyMembers((prev) => prev.filter((m) => m.id !== id));
    } catch (e: any) {
      showMessage({
        message: 'Could not remove family member',
        description: e.response?.data?.detail || 'Please try again',
        type: 'danger',
      });
    } finally {
      setRemovingMemberId(null);
    }
  };

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

        {/* Family Members */}
        <View style={styles.familyHeaderRow}>
          <Users size={16} color={Colors.onSurfaceVariant} />
          <Text style={[styles.label, { marginTop: 0, marginBottom: 0, flex: 1 }]}>Family Members</Text>
          <View style={styles.familyCountBadge}>
            <Text style={styles.familyCountText}>
              Total: {familyMembers.length} {familyMembers.length === 1 ? 'member' : 'members'}
            </Text>
          </View>
        </View>

        {familyMembers.map((m) => (
          <View key={m.id} style={styles.memberRow}>
            <View style={styles.memberAvatar}>
              <Text style={styles.memberAvatarText}>{(m.name || 'F').charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              {!!m.name && <Text style={styles.memberName}>{m.name}</Text>}
              <Text style={styles.memberDetail}>
                {[genderLabel(m.gender), `Age ${m.age} yrs`, `Weight ${m.weight_kg} kg`].filter(Boolean).join(' • ')}
              </Text>
            </View>
            <Pressable
              style={styles.memberDeleteBtn}
              onPress={() => handleRemoveMember(m.id)}
              disabled={removingMemberId === m.id}
            >
              {removingMemberId === m.id ? (
                <ActivityIndicator size="small" color={Colors.error} />
              ) : (
                <Trash2 size={16} color={Colors.error} />
              )}
            </Pressable>
          </View>
        ))}

        {showAddMember ? (
          <View style={styles.addMemberCard}>
            <View style={styles.addMemberRow}>
              <TextInput
                style={[styles.input, styles.addMemberNameInput]}
                placeholder="Name (optional)"
                placeholderTextColor={Colors.outlineVariant}
                value={memberName}
                onChangeText={setMemberName}
                autoCapitalize="words"
              />
              <Pressable style={styles.memberDeleteBtn} onPress={resetAddMemberForm}>
                <X size={18} color={Colors.onSurfaceVariant} />
              </Pressable>
            </View>
            <View style={styles.addMemberRow}>
              {/* Labels + unit suffixes stay visible after typing — placeholders alone vanish. */}
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Age</Text>
                <View style={styles.unitInputWrap}>
                  <TextInput
                    style={[styles.input, styles.unitInput]}
                    placeholder="e.g. 32"
                    placeholderTextColor={Colors.outlineVariant}
                    value={memberAge}
                    onChangeText={(v) => setMemberAge(v.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                  <Text style={styles.unitSuffix}>yrs</Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Weight</Text>
                <View style={styles.unitInputWrap}>
                  <TextInput
                    style={[styles.input, styles.unitInput]}
                    placeholder="e.g. 65"
                    placeholderTextColor={Colors.outlineVariant}
                    value={memberWeight}
                    onChangeText={(v) => setMemberWeight(v.replace(/[^0-9.]/g, ''))}
                    keyboardType="decimal-pad"
                    maxLength={5}
                  />
                  <Text style={styles.unitSuffix}>kg</Text>
                </View>
              </View>
            </View>
            <View>
              <Text style={styles.fieldLabel}>Gender</Text>
              <View style={styles.genderRow}>
                {GENDER_OPTIONS.map((o) => {
                  const active = memberGender === o.value;
                  return (
                    <Pressable
                      key={o.value}
                      style={[styles.genderChip, active && styles.genderChipActive]}
                      onPress={() => setMemberGender(o.value)}
                    >
                      <Text style={[styles.genderChipText, active && styles.genderChipTextActive]}>{o.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <Pressable
              style={[styles.addMemberSaveBtn, !memberFormValid && { opacity: 0.5 }]}
              onPress={handleAddMember}
              disabled={!memberFormValid || addingMember}
            >
              {addingMember ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.addMemberSaveBtnText}>Add Member</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.addMemberBtn} onPress={() => setShowAddMember(true)}>
            <Plus size={16} color={Colors.primary} />
            <Text style={styles.addMemberBtnText}>Add Family Member</Text>
          </Pressable>
        )}

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
  familyHeaderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: Spacing.lg, marginBottom: Spacing.sm,
  },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    marginBottom: Spacing.sm,
  },
  memberAvatar: {
    width: 36, height: 36, borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  memberAvatarText: { fontSize: 14, fontWeight: '700', color: Colors.onPrimaryContainer },
  memberName: { fontSize: 14, fontWeight: '600', color: Colors.onSurfaceDeep },
  memberDetail: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 1 },
  memberDeleteBtn: { padding: 6 },
  addMemberCard: {
    backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.xl,
    borderWidth: 1.5, borderColor: Colors.outlineVariant,
    padding: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.sm,
  },
  addMemberRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  addMemberNameInput: {
    flex: 1, backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
  },
  addMemberSmallInput: {
    flex: 1, backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
  },
  familyCountBadge: {
    backgroundColor: Colors.primaryContainer, borderRadius: BorderRadius.full,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  familyCountText: { fontSize: 12, fontWeight: '700', color: Colors.onPrimaryContainer },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: Colors.onSurfaceVariant, marginBottom: 4 },
  unitInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
  },
  unitInput: { paddingVertical: 10 },
  unitSuffix: { fontSize: 14, fontWeight: '700', color: Colors.onSurfaceVariant, marginLeft: 4 },
  genderRow: { flexDirection: 'row', gap: Spacing.sm },
  genderChip: {
    flex: 1, alignItems: 'center', paddingVertical: 9,
    borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLow,
  },
  genderChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryContainer },
  genderChipText: { fontSize: 13, fontWeight: '600', color: Colors.onSurfaceVariant },
  genderChipTextActive: { color: Colors.onPrimaryContainer, fontWeight: '700' },
  addMemberSaveBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    height: 42, alignItems: 'center', justifyContent: 'center',
  },
  addMemberSaveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  addMemberBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: Colors.primary, borderStyle: 'dashed',
    borderRadius: BorderRadius.lg, paddingVertical: 12, marginBottom: Spacing.sm,
  },
  addMemberBtnText: { color: Colors.primary, fontSize: 14, fontWeight: '700' },
});
