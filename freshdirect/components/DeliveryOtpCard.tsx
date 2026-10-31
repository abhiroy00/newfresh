import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { KeyRound } from 'lucide-react-native';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';

/** The 4-digit code the customer gives the rider at the door. */
export default function DeliveryOtpCard({ otp }: { otp?: string | null }) {
  if (!otp) return null;
  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <KeyRound size={18} color={Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>Delivery OTP</Text>
        <Text style={styles.hint}>Share this with the delivery partner only when you receive your order.</Text>
      </View>
      <Text style={styles.otp}>{otp.split('').join(' ')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primaryContainer, borderRadius: BorderRadius.xl,
    padding: Spacing.md,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: BorderRadius.full, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  label: { fontSize: 14, fontWeight: '800', color: Colors.onPrimaryContainer },
  hint: { fontSize: 11, color: Colors.onPrimaryContainer, opacity: 0.8, marginTop: 2 },
  otp: { fontSize: 24, fontWeight: '900', letterSpacing: 2, color: Colors.onPrimaryContainer },
});
