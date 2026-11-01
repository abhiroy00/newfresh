import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { ChevronLeft, ChevronRight, Plus, Users } from 'lucide-react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { familyMembersApi } from '@/lib/api';
import { genderLabel, type FamilyMember } from '@/components/FamilyMemberForm';

export default function FamilyListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [members, setMembers] = React.useState<FamilyMember[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const { data } = await familyMembersApi.list();
      setMembers(data.data || []);
      setError(false);
    } catch (e) {
      console.warn('Failed to load family members:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch on focus so adds, edits and removals show immediately.
  useFocusEffect(React.useCallback(() => { load(); }, [load]));

  const addButton = (label: string) => (
    <Pressable style={styles.addBtn} onPress={() => router.push('/family/add')}>
      <Plus size={18} color="#fff" />
      <Text style={styles.addText}>{label}</Text>
    </Pressable>
  );

  let body: React.ReactNode;
  if (loading) {
    body = <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  } else if (error && members.length === 0) {
    body = (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Couldn't load your family members</Text>
        <Pressable style={styles.retryBtn} onPress={() => { setLoading(true); load(); }}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  } else if (members.length === 0) {
    body = (
      <View style={styles.center}>
        <Users size={48} color={Colors.onSurfaceVariant} />
        <Text style={styles.emptyTitle}>No family members yet</Text>
        <Text style={styles.emptyText}>Add your family to keep their details in one place.</Text>
        <View style={{ marginTop: Spacing.lg, alignSelf: 'stretch' }}>{addButton('Add Family Member')}</View>
      </View>
    );
  } else {
    body = (
      <ScrollView contentContainerStyle={[styles.list, { paddingBottom: Spacing.lg + insets.bottom }]}>
        <Text style={styles.total}>Total: {members.length} {members.length === 1 ? 'member' : 'members'}</Text>
        {members.map((m) => (
          <Pressable
            key={m.id}
            style={styles.card}
            onPress={() => router.push({ pathname: '/family/[id]', params: { id: m.id } })}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(m.name || 'F').charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{m.name || 'Family member'}</Text>
              <Text style={styles.detail}>
                {[genderLabel(m.gender), `Age ${m.age} yrs`, `Weight ${m.weight_kg} kg`].filter(Boolean).join(' • ')}
              </Text>
            </View>
            <ChevronRight size={18} color={Colors.outline} />
          </Pressable>
        ))}
        <View style={{ marginTop: Spacing.sm }}>{addButton('Add Another Family Member')}</View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header} edges={['top']}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={Colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Family Details</Text>
        <View style={{ width: 40 }} />
      </SafeAreaView>
      {body}
    </View>
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
  emptyTitle: { fontSize: 17, fontWeight: '800', color: Colors.onSurfaceDeep, marginTop: Spacing.md },
  emptyText: { fontSize: 14, color: Colors.onSurfaceVariant, marginTop: 6, textAlign: 'center' },
  retryBtn: {
    marginTop: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: 10,
    borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.primary,
  },
  retryText: { color: Colors.primary, fontSize: 14, fontWeight: '700' },
  list: { padding: Spacing.md, gap: Spacing.sm },
  total: { fontSize: 13, fontWeight: '700', color: Colors.onSurfaceVariant, marginBottom: 2 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.xl,
    padding: Spacing.md, ...Shadows.card,
  },
  avatar: {
    width: 44, height: 44, borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 17, fontWeight: '800', color: Colors.onPrimaryContainer },
  name: { fontSize: 15, fontWeight: '700', color: Colors.onSurfaceDeep },
  detail: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: BorderRadius.full, height: 50,
  },
  addText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
