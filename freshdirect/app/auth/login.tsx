import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView, Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { ArrowRight, Leaf } from 'lucide-react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { authApi } from '@/lib/api';

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const btnScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  const handleSendOtp = async () => {
    if (phone.length < 10) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await authApi.sendOtp(phone);
      const demoOtp = data?.data?.demo_otp || '';
      router.push({ pathname: '/auth/otp', params: { phone, demoOtp } });
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <Pressable onPress={Keyboard.dismiss} accessible={false} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.inner}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
        {/* Logo */}
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Leaf size={32} color="#fff" fill="#fff" />
          </View>
          <Text style={styles.appName}>Gmart</Text>
          <Text style={styles.tagline}>Farm fresh, delivered in 30 mins</Text>
        </View>

        {/* Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Enter your mobile number</Text>
          <Text style={styles.formSub}>We'll send a 6-digit OTP to verify</Text>

          <View style={styles.inputRow}>
            <View style={styles.countryCode}>
              <Text style={styles.countryText}>+91</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              placeholder="Enter 10-digit number"
              placeholderTextColor={Colors.outlineVariant}
              keyboardType="number-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          <Pressable
            onPressIn={() => { btnScale.value = withSpring(0.96); }}
            onPressOut={() => { btnScale.value = withSpring(1); }}
            onPress={handleSendOtp}
            disabled={phone.length < 10 || loading}
          >
            <Animated.View
              style={[
                styles.sendBtn,
                btnStyle,
                (phone.length < 10 || loading) && styles.sendBtnDisabled,
              ]}
            >
              <Text style={styles.sendBtnText}>{loading ? 'Sending...' : 'Send OTP'}</Text>
              <ArrowRight size={18} color="#fff" />
            </Animated.View>
          </Pressable>

          {error ? <Text style={{ color: '#d32f2f', fontSize: 13, textAlign: 'center', marginTop: 8 }}>{error}</Text> : null}

          <Text style={styles.termsText}>
            By continuing you agree to our{' '}
            <Text style={styles.termsLink}>Terms & Privacy Policy</Text>
          </Text>
        </View>
        </ScrollView>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flexGrow: 1, padding: Spacing.lg, justifyContent: 'center' },
  logoArea: { alignItems: 'center', marginBottom: Spacing.xl },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.elevated,
  },
  appName: { fontSize: 30, fontWeight: '800', color: Colors.onSurfaceDeep },
  tagline: { fontSize: 14, color: Colors.onSurfaceVariant, marginTop: 4 },
  formCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    ...Shadows.elevated,
  },
  formTitle: { fontSize: 20, fontWeight: '700', color: Colors.onSurfaceDeep, marginBottom: 4 },
  formSub: { fontSize: 13, color: Colors.onSurfaceVariant, marginBottom: Spacing.md },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  countryCode: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: Colors.surfaceContainerLow,
    borderRightWidth: 1,
    borderRightColor: Colors.outlineVariant,
    justifyContent: 'center',
  },
  countryText: { fontSize: 14, fontWeight: '600', color: Colors.onSurface },
  phoneInput: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.onSurfaceDeep,
    letterSpacing: 2,
  },
  sendBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Shadows.elevated,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  termsText: { fontSize: 11, color: Colors.onSurfaceVariant, textAlign: 'center', marginTop: Spacing.md },
  termsLink: { color: Colors.primary, fontWeight: '600' },
});
