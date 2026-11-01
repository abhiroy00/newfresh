import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Check, Users, X } from 'lucide-react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { familyReminderApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const BENEFITS = [
  'Keep family member information organized',
  'Easily access family details whenever required',
  'Manage multiple family members from one account',
  'Save time by keeping family information in one place',
];

// Let the customer settle on the screen before anything pops up.
const SHOW_DELAY_MS = 4000;

// One attempt per app session. The frequency rules (daily limit, cooldown,
// "has family members") live on the backend, so they follow the account.
let checkedForUserId: string | null = null;

/**
 * Occasional "Add your family details" reminder. Mounted only on the Home tab,
 * so it can never interrupt cart, checkout, payment or order placement.
 */
export default function FamilyReminderPopup() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const [visible, setVisible] = React.useState(false);

  useFocusEffect(
    React.useCallback(() => {
      if (!userId || checkedForUserId === userId) return;
      let cancelled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      (async () => {
        try {
          const { data } = await familyReminderApi.status();
          if (cancelled) return;
          if (!data.data.eligible) {
            checkedForUserId = userId;
            return;
          }
          timer = setTimeout(async () => {
            if (cancelled) return;
            checkedForUserId = userId;
            try {
              // The server has the final say, so two devices can't both show it.
              const { data: claim } = await familyReminderApi.recordImpression();
              if (!cancelled && claim.data.show) setVisible(true);
            } catch {
              // Best-effort: never bother the customer about a reminder failing.
            }
          }, SHOW_DELAY_MS);
        } catch {
          // Offline or server error: stay quiet and try on a later visit.
        }
      })();
      return () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
        setVisible(false); // e.g. a notification tap navigated away from Home
      };
    }, [userId])
  );

  const dismiss = () => {
    setVisible(false);
    familyReminderApi.dismiss().catch(() => {});
  };

  const addDetails = () => {
    setVisible(false);
    router.push('/family/add');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Pressable style={styles.closeBtn} onPress={dismiss} hitSlop={10} accessibilityLabel="Close">
            <X size={20} color={Colors.onSurfaceVariant} />
          </Pressable>
          <View style={styles.iconWrap}>
            <Users size={26} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Add Your Family Details</Text>
          <Text style={styles.description}>
            Make your experience more convenient by adding your family members' details. Keep important family
            information organized in one place and make managing your family's requirements easier.
          </Text>
          <View style={styles.benefits}>
            {BENEFITS.map((b) => (
              <View key={b} style={styles.benefitRow}>
                <Check size={15} color={Colors.primary} strokeWidth={3} />
                <Text style={styles.benefitText}>{b}</Text>
              </View>
            ))}
          </View>
          <Pressable style={styles.primaryBtn} onPress={addDetails}>
            <Text style={styles.primaryText}>Add Family Details</Text>
          </Pressable>
          <Pressable style={styles.laterBtn} onPress={dismiss}>
            <Text style={styles.laterText}>Maybe Later</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center', padding: Spacing.lg,
  },
  card: {
    width: '100%', maxWidth: 400,
    backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.xl,
    padding: Spacing.lg, ...Shadows.elevated,
  },
  closeBtn: { position: 'absolute', top: Spacing.md, right: Spacing.md, zIndex: 1 },
  iconWrap: {
    width: 56, height: 56, borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center',
  },
  title: { fontSize: 19, fontWeight: '800', color: Colors.onSurfaceDeep, textAlign: 'center', marginTop: Spacing.md },
  description: { fontSize: 13, lineHeight: 19, color: Colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 },
  benefits: { gap: 8, marginTop: Spacing.md },
  benefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  benefitText: { flex: 1, fontSize: 13, lineHeight: 18, color: Colors.onSurface },
  primaryBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.full,
    height: 48, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.lg,
  },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  laterBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 2 },
  laterText: { color: Colors.onSurfaceVariant, fontSize: 14, fontWeight: '600' },
});
