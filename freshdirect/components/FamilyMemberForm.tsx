import React from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import type { Gender } from '@/lib/api';

export type FamilyMember = {
  id: string;
  name?: string | null;
  age: number;
  weight_kg: number;
  gender?: Gender | null;
  relationship?: string | null;
};

export type FamilyMemberValues = {
  name?: string; age: number; weight_kg: number; gender?: Gender; relationship?: string;
};

export const RELATIONSHIP_OPTIONS = [
  'Spouse', 'Father', 'Mother', 'Son', 'Daughter', 'Brother', 'Sister', 'Grandparent', 'Other',
];

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export const genderLabel = (g?: string | null) => GENDER_OPTIONS.find((o) => o.value === g)?.label;

/**
 * Add/edit form for a family member. Gender is required for new members but
 * optional when editing, since members added before it existed have none.
 */
export default function FamilyMemberForm({
  initial, submitLabel, saving, requireGender = true, onSubmit, onCancel,
}: {
  initial?: FamilyMember | null;
  submitLabel: string;
  saving: boolean;
  requireGender?: boolean;
  onSubmit: (values: FamilyMemberValues) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = React.useState(initial?.name || '');
  const [age, setAge] = React.useState(initial ? String(initial.age) : '');
  const [weight, setWeight] = React.useState(initial ? String(initial.weight_kg) : '');
  const [gender, setGender] = React.useState<Gender | null>(initial?.gender ?? null);
  const [relationship, setRelationship] = React.useState<string | null>(initial?.relationship ?? null);

  const ageNum = Number(age);
  const weightNum = Number(weight);
  const valid =
    age.trim().length > 0 && ageNum >= 0 && ageNum <= 120 &&
    weight.trim().length > 0 && weightNum > 0 && weightNum <= 300 &&
    (!requireGender || gender !== null);

  const submit = () => {
    if (!valid || saving) return;
    onSubmit({
      name: name.trim() || undefined, age: ageNum, weight_kg: weightNum,
      gender: gender ?? undefined, relationship: relationship ?? undefined,
    });
  };

  return (
    <View style={styles.card}>
      <View>
        <Text style={styles.label}>Name (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Asha"
          placeholderTextColor={Colors.outlineVariant}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
      </View>
      <View>
        <Text style={styles.label}>Relationship (optional)</Text>
        <View style={styles.wrapRow}>
          {RELATIONSHIP_OPTIONS.map((opt) => {
            const active = relationship === opt;
            return (
              <Pressable
                key={opt}
                style={[styles.relChip, active && styles.chipActive]}
                // Tap the selected one again to clear it.
                onPress={() => setRelationship(active ? null : opt)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.row}>
        {/* Labels + unit suffixes stay visible after typing — placeholders alone vanish. */}
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Age</Text>
          <View style={styles.unitWrap}>
            <TextInput
              style={styles.unitInput}
              placeholder="e.g. 32"
              placeholderTextColor={Colors.outlineVariant}
              value={age}
              onChangeText={(v) => setAge(v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={3}
            />
            <Text style={styles.unit}>yrs</Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Weight</Text>
          <View style={styles.unitWrap}>
            <TextInput
              style={styles.unitInput}
              placeholder="e.g. 65"
              placeholderTextColor={Colors.outlineVariant}
              value={weight}
              onChangeText={(v) => setWeight(v.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              maxLength={5}
            />
            <Text style={styles.unit}>kg</Text>
          </View>
        </View>
      </View>
      <View>
        <Text style={styles.label}>Gender</Text>
        <View style={styles.row}>
          {GENDER_OPTIONS.map((o) => {
            const active = gender === o.value;
            return (
              <Pressable
                key={o.value}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setGender(o.value)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Pressable style={[styles.saveBtn, !valid && { opacity: 0.5 }]} onPress={submit} disabled={!valid || saving}>
        {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>{submitLabel}</Text>}
      </Pressable>
      {onCancel && (
        <Pressable style={styles.cancelBtn} onPress={onCancel} disabled={saving}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.xl,
    borderWidth: 1.5, borderColor: Colors.outlineVariant,
    padding: Spacing.md, gap: Spacing.md,
  },
  row: { flexDirection: 'row', gap: Spacing.sm },
  label: { fontSize: 12, fontWeight: '700', color: Colors.onSurfaceVariant, marginBottom: 4 },
  input: {
    backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: 10, fontSize: 15, color: Colors.onSurfaceDeep,
  },
  unitWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
  },
  unitInput: { flex: 1, paddingVertical: 10, fontSize: 15, color: Colors.onSurfaceDeep },
  unit: { fontSize: 14, fontWeight: '700', color: Colors.onSurfaceVariant, marginLeft: 4 },
  chip: {
    flex: 1, alignItems: 'center', paddingVertical: 9,
    borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLow,
  },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  relChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLow,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryContainer },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.onSurfaceVariant },
  chipTextActive: { color: Colors.onPrimaryContainer, fontWeight: '700' },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    height: 46, alignItems: 'center', justifyContent: 'center',
  },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', paddingVertical: 4 },
  cancelText: { color: Colors.onSurfaceVariant, fontSize: 14, fontWeight: '600' },
});
