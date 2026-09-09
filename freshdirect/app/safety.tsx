import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronLeft, Shield, Leaf, Thermometer,
  ClipboardCheck, Truck, Award, ChevronRight,
} from 'lucide-react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '@/constants/theme';

const SAFETY_ITEMS = [
  {
    icon: Leaf,
    title: 'No Harmful Pesticides',
    desc: 'All products are tested and certified free from harmful chemicals. We partner only with certified organic farms.',
    color: Colors.primary,
  },
  {
    icon: Thermometer,
    title: 'Cold Chain Maintained',
    desc: 'From farm to your door, we maintain optimal temperature throughout the supply chain to ensure freshness.',
    color: Colors.accentMint,
  },
  {
    icon: ClipboardCheck,
    title: 'Quality Inspected',
    desc: 'Every batch goes through a 12-point quality check before dispatch. Only the best makes it to your basket.',
    color: Colors.secondary,
  },
  {
    icon: Truck,
    title: 'Hygienic Packaging',
    desc: 'All items are packed in food-grade, eco-friendly packaging. Our delivery bags are sanitized before every use.',
    color: Colors.accentOrange,
  },
  {
    icon: Award,
    title: 'FSSAI Certified',
    desc: 'Gmart is licensed by FSSAI (Food Safety and Standards Authority of India). License No: 12345678901234.',
    color: Colors.primary,
  },
];

export default function SafetyScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header} edges={['top']}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={Colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Safety Center</Text>
        <View style={styles.spacer} />
      </SafeAreaView>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Hero */}
        <View>
          <View style={styles.heroCard}>
            <View style={styles.shieldContainer}>
              <Shield size={40} color={Colors.primary} fill={Colors.primaryFixed} />
            </View>
            <Text style={styles.heroTitle}>Your Safety is Our Priority</Text>
            <Text style={styles.heroSub}>
              We follow strict safety standards to ensure every product is fresh, clean, and safe for your family.
            </Text>
          </View>
        </View>

        {/* Certifications Row */}
        <View>
          <View style={styles.certRow}>
            {['FSSAI', 'ISO 22000', 'Organic India', 'No GMO'].map((cert) => (
              <View key={cert} style={styles.certBadge}>
                <Text style={styles.certText}>{cert}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Safety Points */}
        <Text style={styles.sectionLabel}>Our Safety Promise</Text>
        {SAFETY_ITEMS.map((item, index) => (
          <View
            key={item.title}
          >
            <View style={styles.safetyCard}>
              <View style={[styles.safetyIcon, { backgroundColor: item.color + '15' }]}>
                <item.icon size={22} color={item.color} />
              </View>
              <View style={styles.safetyInfo}>
                <Text style={styles.safetyTitle}>{item.title}</Text>
                <Text style={styles.safetyDesc}>{item.desc}</Text>
              </View>
            </View>
          </View>
        ))}

        {/* Report Button */}
        <View>
          <Pressable style={styles.reportBtn}>
            <ClipboardCheck size={18} color={Colors.primary} />
            <Text style={styles.reportBtnText}>Report a Safety Concern</Text>
            <ChevronRight size={16} color={Colors.primary} />
          </Pressable>
        </View>

        <View style={styles.spacerBottom} />
      </ScrollView>
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
  heroCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primaryFixed,
  },
  shieldContainer: {
    width: 80, height: 80, borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceCard,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  heroTitle: { fontSize: 18, fontWeight: '800', color: Colors.onSurfaceDeep, textAlign: 'center' },
  heroSub: {
    fontSize: 13, color: Colors.onSurfaceVariant, textAlign: 'center',
    lineHeight: 19, marginTop: 8,
  },
  certRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    justifyContent: 'center',
  },
  certBadge: {
    backgroundColor: Colors.primaryFixed,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  certText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: Colors.onSurfaceVariant,
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  safetyCard: {
    flexDirection: 'row',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  safetyIcon: {
    width: 52, height: 52, borderRadius: BorderRadius.xl,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  safetyInfo: { flex: 1 },
  safetyTitle: { fontSize: 15, fontWeight: '700', color: Colors.onSurface, marginBottom: 4 },
  safetyDesc: { fontSize: 13, color: Colors.onSurfaceVariant, lineHeight: 19 },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primaryFixed,
    marginTop: Spacing.sm,
  },
  reportBtnText: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.primary },
  spacerBottom: { height: 80 },
});
