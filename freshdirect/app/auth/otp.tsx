import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ScrollView, Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming } from 'react-native-reanimated';
import { ChevronLeft, CheckCircle2 } from 'lucide-react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { authApi, usersApi } from '@/lib/api';
import * as SecureStore from 'expo-secure-store';

const setToken = async (key: string, value: string): Promise<void> => {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(key, value);
  } else {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      console.warn(`Failed to set ${key}`);
    }
  }
};

const RESEND_COOLDOWN_SECONDS = 30;

export default function OtpScreen() {
  const router = useRouter();
  const { phone, demoOtp: demoOtpParam } = useLocalSearchParams<{ phone: string; demoOtp?: string }>();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [demoOtp, setDemoOtp] = useState(demoOtpParam || '');
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [info, setInfo] = useState('');
  const inputRef = useRef<TextInput>(null);
  const setUser = useAuthStore((s) => s.setUser);
  const btnScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown > 0]);

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError('');
    setInfo('');
    try {
      const { data } = await authApi.sendOtp(phone || '');
      if (data?.data?.demo_otp) setDemoOtp(data.data.demo_otp);
      setOtp('');
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setInfo('A new OTP has been sent');
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to resend OTP. Please try again.');
    } finally {
      setResending(false);
    }
  };

  // Auto-verify the moment all 6 digits are in (typed, pasted, or autofilled)
  React.useEffect(() => {
    if (otp.length === 6 && !loading) {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  const handleVerify = async () => {
    if (otp.length < 6 || loading) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await authApi.verifyOtp(phone || '', otp);
      const tokens = data.data;
      await setToken('auth_token', tokens.access_token);
      await setToken('refresh_token', tokens.refresh_token);
      const { data: userRes } = await usersApi.me();
      const user = userRes.data;
      await setUser({ id: user.id, name: user.name || '', phone: user.phone, email: user.email }, tokens.access_token);
      setLoading(false);
      if (!user.name) {
        router.replace('/onboarding');
      } else {
        router.replace('/tabs');
      }
    } catch (e: any) {
      setLoading(false);
      setError(e.response?.data?.detail || 'Invalid OTP. Please try again.');
      shakeX.value = withSequence(
        withTiming(-10, { duration: 50 }), withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }), withTiming(0, { duration: 50 }),
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Pressable onPress={Keyboard.dismiss} accessible={false} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.inner}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={24} color={Colors.onSurface} />
          </Pressable>

          <View>
            <Text style={styles.title}>Verify OTP</Text>
            <Text style={styles.sub}>
              Enter the 6-digit code sent to{' '}
              <Text style={styles.phone}>+91 {phone}</Text>
            </Text>
            {demoOtp ? (
              <Text style={styles.devOtp}>DEV MODE — OTP: {demoOtp}</Text>
            ) : null}
          </View>

          <View style={styles.otpWrap}>
            <Animated.View style={[styles.otpRow, shakeStyle]}>
              {[0, 1, 2, 3, 4, 5].map((idx) => (
                <View
                  key={idx}
                  style={[
                    styles.otpBox,
                    idx < otp.length && styles.otpBoxFilled,
                    idx === otp.length && styles.otpBoxActive,
                    error ? styles.otpBoxError : null,
                  ]}
                >
                  <Text style={styles.otpDigit}>{otp[idx] || ''}</Text>
                </View>
              ))}
            </Animated.View>

            {/* Invisible input stretched over the boxes: receives taps,
                long-press paste, and SMS autofill. Pasting "Your OTP is 482913"
                also works — non-digits are stripped. */}
            <TextInput
              ref={inputRef}
              value={otp}
              onChangeText={(v) => {
                setError('');
                setOtp(v.replace(/[^0-9]/g, '').slice(0, 6));
              }}
              keyboardType="number-pad"
              inputMode="numeric"
              autoComplete="sms-otp"
              textContentType="oneTimeCode"
              importantForAutofill="yes"
              caretHidden
              contextMenuHidden={false}
              selectionColor="transparent"
              maxLength={40}
              style={styles.otpOverlayInput}
              autoFocus
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {info ? <Text style={styles.infoText}>{info}</Text> : null}

          <Pressable
            onPressIn={() => { btnScale.value = withSpring(0.96); }}
            onPressOut={() => { btnScale.value = withSpring(1); }}
            onPress={handleVerify}
            disabled={otp.length < 6 || loading}
          >
            <Animated.View
              style={[
                styles.verifyBtn,
                btnStyle,
                (otp.length < 6 || loading) && styles.verifyBtnDisabled,
              ]}
            >
              {loading ? (
                <Text style={styles.verifyBtnText}>Verifying...</Text>
              ) : (
                <>
                  <CheckCircle2 size={18} color="#fff" />
                  <Text style={styles.verifyBtnText}>Verify & Continue</Text>
                </>
              )}
            </Animated.View>
          </Pressable>

          <Pressable style={styles.resendRow} onPress={handleResend} disabled={cooldown > 0 || resending}>
            <Text style={styles.resendText}>
              Didn't receive it?{' '}
              {cooldown > 0 ? (
                <Text style={styles.resendWait}>Resend in {cooldown}s</Text>
              ) : (
                <Text style={styles.resendLink}>{resending ? 'Sending...' : 'Resend OTP'}</Text>
              )}
            </Text>
          </Pressable>
        </ScrollView>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flexGrow: 1, padding: Spacing.lg, paddingTop: 72 },
  backBtn: {
    width: 44, height: 44, borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceCard,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.xl,
    ...Shadows.card,
  },
  title: { fontSize: 28, fontWeight: '800', color: Colors.onSurfaceDeep, marginBottom: 8 },
  sub: { fontSize: 14, color: Colors.onSurfaceVariant, marginBottom: Spacing.xl, lineHeight: 21 },
  phone: { fontWeight: '700', color: Colors.primary },
  devOtp: { fontSize: 12, color: Colors.accentOrange, fontWeight: '700', marginBottom: 8 },
  otpWrap: {
    position: 'relative',
    marginBottom: Spacing.xl,
  },
  otpRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  otpBox: {
    width: 48, height: 56,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceCard,
  },
  otpBoxFilled: { borderColor: Colors.primary, backgroundColor: Colors.surfaceContainerLow },
  otpBoxActive: { borderColor: Colors.primary, borderWidth: 2 },
  otpBoxError: { borderColor: Colors.error, backgroundColor: Colors.errorContainer },
  otpDigit: { fontSize: 22, fontWeight: '700', color: Colors.onSurfaceDeep },
  otpOverlayInput: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    opacity: 0.02,           // ~invisible but still touchable + paste menu works
    color: 'transparent',
    fontSize: 1,
    textAlign: 'center',
  },
  errorText: { color: Colors.error, fontSize: 13, textAlign: 'center', marginBottom: Spacing.md },
  infoText: { color: Colors.primary, fontSize: 13, textAlign: 'center', marginBottom: Spacing.md, fontWeight: '600' },
  verifyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Shadows.elevated,
  },
  verifyBtnDisabled: { opacity: 0.5 },
  verifyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resendRow: { alignItems: 'center', marginTop: Spacing.lg },
  resendText: { fontSize: 13, color: Colors.onSurfaceVariant },
  resendLink: { color: Colors.primary, fontWeight: '700' },
  resendWait: { color: Colors.onSurfaceVariant, fontWeight: '600' },
});
