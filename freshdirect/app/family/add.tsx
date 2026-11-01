import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { showMessage } from 'react-native-flash-message';
import { ChevronLeft } from 'lucide-react-native';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { familyMembersApi } from '@/lib/api';
import FamilyMemberForm, { type FamilyMemberValues } from '@/components/FamilyMemberForm';

export default function AddFamilyMemberScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = React.useState(false);

  const save = async (values: FamilyMemberValues) => {
    setSaving(true);
    try {
      await familyMembersApi.create(values);
      showMessage({ message: 'Family member added', type: 'success' });
      // Replace so Back from the list doesn't reopen an empty form. The backend
      // stops the reminder as soon as a member exists.
      router.replace('/family');
    } catch (e: any) {
      const detail = e.response?.data?.detail;
      setSaving(false);
      showMessage({
        message: 'Could not add family member',
        description: typeof detail === 'string' ? detail : 'Please try again',
        type: 'danger',
      });
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.header} edges={['top']}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={Colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Add Family Member</Text>
        <View style={{ width: 40 }} />
      </SafeAreaView>
      <ScrollView
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: Spacing.lg + insets.bottom }}
        keyboardShouldPersistTaps="handled"
      >
        <FamilyMemberForm submitLabel="Add Member" saving={saving} onSubmit={save} />
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
});
