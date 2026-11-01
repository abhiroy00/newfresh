import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { showMessage } from 'react-native-flash-message';
import { ChevronLeft, Pencil, Plus, Trash2, Users } from 'lucide-react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { familyMembersApi } from '@/lib/api';
import { appAlert } from '@/lib/appAlert';
import FamilyMemberForm, { genderLabel, type FamilyMember, type FamilyMemberValues } from '@/components/FamilyMemberForm';

export default function FamilyMemberDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [member, setMember] = React.useState<FamilyMember | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const { data } = await familyMembersApi.get(String(id));
      setMember(data.data);
    } catch (e) {
      console.warn('Failed to load family member:', e);
      setMember(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => { load(); }, [load]);

  const save = async (values: FamilyMemberValues) => {
    setSaving(true);
    try {
      // Cleared optional fields → null: PATCH only changes the keys it receives.
      const { data } = await familyMembersApi.update(String(id), {
        ...values, name: values.name ?? null, relationship: values.relationship ?? null,
      });
      setMember(data.data);
      setEditing(false);
      showMessage({ message: 'Details updated', type: 'success' });
    } catch (e: any) {
      const detail = e.response?.data?.detail;
      showMessage({
        message: 'Could not save details',
        description: typeof detail === 'string' ? detail : 'Please try again',
        type: 'danger',
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    appAlert('Remove family member', `Remove ${member?.name || 'this family member'}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setRemoving(true);
          try {
            await familyMembersApi.remove(String(id));
            router.back();
          } catch {
            setRemoving(false);
            showMessage({ message: 'Could not remove family member', description: 'Please try again', type: 'danger' });
          }
        },
      },
    ]);
  };

  const Header = (
    <SafeAreaView style={styles.header} edges={['top']}>
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <ChevronLeft size={22} color={Colors.onSurface} />
      </Pressable>
      <Text style={styles.headerTitle}>Family Details</Text>
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

  if (!member) {
    return (
      <View style={styles.container}>
        {Header}
        <View style={styles.center}>
          <Users size={48} color={Colors.onSurfaceVariant} />
          <Text style={styles.emptyText}>Couldn't load this family member</Text>
          <Pressable style={styles.outlineBtn} onPress={() => { setLoading(true); load(); }}>
            <Text style={styles.outlineText}>Try again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const rows: { label: string; value: string }[] = [
    { label: 'Full Name', value: member.name || 'Not added' },
    { label: 'Relationship', value: member.relationship || 'Not added' },
    { label: 'Age', value: `${member.age} years` },
    { label: 'Gender', value: genderLabel(member.gender) || 'Not added' },
    { label: 'Weight', value: `${member.weight_kg} kg` },
  ];

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {Header}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Spacing.lg + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(member.name || 'F').charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.heroName}>{member.name || 'Family member'}</Text>
          {member.relationship ? <Text style={styles.heroRelationship}>{member.relationship}</Text> : null}
        </View>

        {editing ? (
          <FamilyMemberForm
            initial={member}
            submitLabel="Save Changes"
            saving={saving}
            // Members added before gender existed can be edited without it.
            requireGender={false}
            onSubmit={save}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            <View style={styles.card}>
              {rows.map((r, i) => (
                <View key={r.label} style={[styles.row, i < rows.length - 1 && styles.rowDivider]}>
                  <Text style={styles.rowLabel}>{r.label}</Text>
                  <Text style={styles.rowValue}>{r.value}</Text>
                </View>
              ))}
            </View>

            <Pressable style={styles.primaryBtn} onPress={() => setEditing(true)}>
              <Pencil size={16} color="#fff" />
              <Text style={styles.primaryText}>Edit Details</Text>
            </Pressable>
            <Pressable style={styles.outlineBtn} onPress={() => router.push('/family/add')}>
              <Plus size={16} color={Colors.primary} />
              <Text style={styles.outlineText}>Add Another Family Member</Text>
            </Pressable>
            <Pressable style={styles.removeBtn} onPress={remove} disabled={removing}>
              {removing ? (
                <ActivityIndicator size="small" color={Colors.error} />
              ) : (
                <>
                  <Trash2 size={15} color={Colors.error} />
                  <Text style={styles.removeText}>Remove</Text>
                </>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  emptyText: { fontSize: 14, color: Colors.onSurfaceVariant, marginTop: 12 },
  content: { padding: Spacing.md, gap: Spacing.md },
  hero: { alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  avatar: {
    width: 76, height: 76, borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 30, fontWeight: '800', color: Colors.onPrimaryContainer },
  heroName: { fontSize: 19, fontWeight: '800', color: Colors.onSurfaceDeep },
  heroRelationship: { fontSize: 13, fontWeight: '600', color: Colors.primary, marginTop: -4 },
  card: {
    backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md, ...Shadows.card,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, gap: Spacing.md },
  rowDivider: { borderBottomWidth: 0.5, borderBottomColor: Colors.outlineVariant },
  rowLabel: { fontSize: 13, color: Colors.onSurfaceVariant },
  rowValue: { flexShrink: 1, textAlign: 'right', fontSize: 14, fontWeight: '700', color: Colors.onSurfaceDeep },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: BorderRadius.full, height: 50,
  },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: Colors.primary, borderRadius: BorderRadius.full,
    minHeight: 48, paddingHorizontal: Spacing.lg, marginTop: 0,
  },
  outlineText: { color: Colors.primary, fontSize: 14, fontWeight: '700' },
  removeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8,
  },
  removeText: { color: Colors.error, fontSize: 14, fontWeight: '600' },
});
