import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn, FadeOut, LinearTransition,
  useSharedValue, useAnimatedStyle, withTiming,
} from 'react-native-reanimated';
import {
  ChevronLeft, ChevronRight, ChevronDown,
  Package, CreditCard, Truck, RefreshCw, MessageSquare, Phone, Headphones,
} from 'lucide-react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '@/constants/theme';

const FAQ_ITEMS = [
  {
    q: 'How do I track my order?',
    a: 'Go to the Orders tab and tap your active order. You can see real-time tracking of your delivery partner.',
  },
  {
    q: 'Can I cancel my order?',
    a: 'Yes, you can cancel within 5 minutes of placing the order. Go to Orders > Order Details > Cancel Order.',
  },
  {
    q: 'What is the delivery time?',
    a: 'Standard delivery takes 25-45 minutes. Express delivery (marked with \u26a1) takes 15-20 minutes for select items.',
  },
  {
    q: 'How do I report a wrong item?',
    a: 'Go to Orders > Order Details > Report Issue. Our team will resolve it within 24 hours with a refund or replacement.',
  },
  {
    q: 'Is there a minimum order value?',
    a: 'No minimum order! However, orders below \u20b9499 have a delivery fee of \u20b949. Above \u20b9499, delivery is FREE.',
  },
];

const QUICK_HELP = [
  { icon: Package, label: 'Track Order', color: Colors.primary, route: '/track' },
  { icon: CreditCard, label: 'Payment Issues', color: Colors.secondary, route: null, action: 'call' as const },
  { icon: Truck, label: 'Delivery Issue', color: Colors.accentOrange, route: '/track' },
  { icon: RefreshCw, label: 'Returns', color: Colors.accentMint, route: '/tabs/orders' },
];

function Chevron({ open }: { open: boolean }) {
  const rot = useSharedValue(open ? 1 : 0);
  React.useEffect(() => {
    rot.value = withTiming(open ? 1 : 0, { duration: 200 });
  }, [open]);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value * 180}deg` }],
  }));
  return (
    <Animated.View style={style}>
      <ChevronDown size={18} color={open ? Colors.primary : Colors.outline} />
    </Animated.View>
  );
}

export default function HelpScreen() {
  const router = useRouter();
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header} edges={['top']}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={Colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Help Center</Text>
        <View style={styles.spacer} />
      </SafeAreaView>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <LinearGradient
          colors={[Colors.primaryContainer, Colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroIconWrap}>
            <Headphones size={26} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>How can we help?</Text>
          <Text style={styles.heroSub}>We're here 24/7 to support you</Text>
        </LinearGradient>

        {/* Quick Help */}
        <Text style={styles.sectionLabel}>Quick Help</Text>
        <View style={styles.quickGrid}>
          {QUICK_HELP.map((item) => (
            <Pressable
              key={item.label}
              style={styles.quickCard}
              onPress={() => {
                if ((item as any).action === 'call') Linking.openURL('tel:9955476677');
                else if (item.route) router.navigate(item.route as any);
              }}
            >
              <View style={[styles.quickIcon, { backgroundColor: item.color + '1A' }]}>
                <item.icon size={20} color={item.color} />
              </View>
              <Text style={styles.quickLabel}>{item.label}</Text>
              <ChevronRight size={14} color={Colors.outline} />
            </Pressable>
          ))}
        </View>

        {/* FAQs */}
        <Text style={styles.sectionLabel}>Frequently Asked Questions</Text>
        {FAQ_ITEMS.map((item, index) => {
          const open = expanded === index;
          return (
            <Animated.View
              key={index}
              layout={LinearTransition.duration(220)}
              style={[styles.faqCard, open && styles.faqCardOpen]}
            >
              <Pressable
                style={styles.faqHeader}
                onPress={() => setExpanded(open ? null : index)}
              >
                <Text style={styles.faqQ}>{item.q}</Text>
                <Chevron open={open} />
              </Pressable>
              {open && (
                <Animated.View
                  entering={FadeIn.duration(180)}
                  exiting={FadeOut.duration(140)}
                >
                  <View style={styles.faqDivider} />
                  <Text style={styles.faqA}>{item.a}</Text>
                </Animated.View>
              )}
            </Animated.View>
          );
        })}

        {/* Contact */}
        <Text style={styles.sectionLabel}>Contact Us</Text>
        <View style={styles.contactRow}>
          <Pressable style={styles.contactCard} onPress={() => router.navigate('/support' as any)}>
            <View style={[styles.contactIcon, { backgroundColor: Colors.primary + '1A' }]}>
              <MessageSquare size={20} color={Colors.primary} />
            </View>
            <Text style={styles.contactTitle}>Live Chat</Text>
            <Text style={styles.contactSub}>Avg. reply in 2 min</Text>
          </Pressable>
          <Pressable style={styles.contactCard} onPress={() => Linking.openURL('tel:9955476677')}>
            <View style={[styles.contactIcon, { backgroundColor: Colors.secondary + '1A' }]}>
              <Phone size={20} color={Colors.secondary} />
            </View>
            <Text style={styles.contactTitle}>Call Us</Text>
            <Text style={styles.contactSub}>9955476677</Text>
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
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadows.elevated,
  },
  heroIconWrap: {
    width: 56, height: 56, borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: Colors.onSurfaceVariant,
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: Spacing.sm, marginTop: Spacing.md,
  },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  quickCard: {
    width: '47.5%',
    flexGrow: 1,
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadows.card,
  },
  quickIcon: {
    width: 40, height: 40, borderRadius: BorderRadius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  quickLabel: { flex: 1, fontSize: 12.5, fontWeight: '600', color: Colors.onSurface },
  faqCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
    ...Shadows.card,
  },
  faqCardOpen: { borderColor: Colors.primaryFixed },
  faqHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: 8, paddingVertical: Spacing.md,
  },
  faqQ: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.onSurface, lineHeight: 20 },
  faqDivider: { height: 0.5, backgroundColor: Colors.outlineVariant },
  faqA: {
    fontSize: 13, color: Colors.onSurfaceVariant,
    lineHeight: 21, paddingTop: Spacing.sm, paddingBottom: Spacing.md,
  },
  contactRow: { flexDirection: 'row', gap: Spacing.sm },
  contactCard: {
    flex: 1,
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 2,
    ...Shadows.card,
  },
  contactIcon: {
    width: 44, height: 44, borderRadius: BorderRadius.full,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  contactTitle: { fontSize: 14, fontWeight: '700', color: Colors.onSurface },
  contactSub: { fontSize: 11, color: Colors.onSurfaceVariant },
  spacerBottom: { height: 80 },
});
