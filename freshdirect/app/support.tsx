import React from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Send, Headphones } from 'lucide-react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { supportApi } from '@/lib/api';

type Message = {
  id: string;
  sender_type: 'customer' | 'admin';
  message: string;
  created_at: string;
};

const POLL_INTERVAL = 10000;

export default function SupportScreen() {
  const router = useRouter();
  const [ticketId, setTicketId] = React.useState<string | null>(null);
  const [ticketStatus, setTicketStatus] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);

  const loadExisting = React.useCallback(async () => {
    try {
      const { data } = await supportApi.listTickets();
      const tickets = data?.data ?? [];
      const active = tickets.find((t: any) => t.status !== 'closed') ?? tickets[0];
      if (active) {
        const detail = await supportApi.getTicket(active.id);
        setTicketId(active.id);
        setTicketStatus(detail.data?.data?.status ?? active.status);
        setMessages(detail.data?.data?.messages ?? []);
      }
    } catch (e) {
      console.warn('Failed to load support ticket:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadExisting();
    const interval = setInterval(() => {
      if (ticketId) {
        supportApi.getTicket(ticketId).then(({ data }) => {
          setTicketStatus(data?.data?.status ?? null);
          setMessages(data?.data?.messages ?? []);
        }).catch(() => {});
      }
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');
    try {
      if (!ticketId) {
        const { data } = await supportApi.startOrContinue(text);
        setTicketId(data?.data?.id ?? null);
        setTicketStatus(data?.data?.status ?? null);
        setMessages(data?.data?.messages ?? []);
      } else {
        const { data } = await supportApi.sendMessage(ticketId, text);
        setMessages((prev) => [...prev, data?.data]);
      }
    } catch (e) {
      console.warn('Failed to send message:', e);
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <SafeAreaView style={styles.header} edges={['top']}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={Colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Live Chat</Text>
        <View style={styles.spacer} />
      </SafeAreaView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Headphones size={28} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>How can we help?</Text>
          <Text style={styles.emptySub}>Send us a message and our team will get back to you shortly.</Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.bubbleRow, item.sender_type === 'customer' && styles.bubbleRowRight]}>
              <View style={[styles.bubble, item.sender_type === 'customer' ? styles.bubbleCustomer : styles.bubbleAdmin]}>
                <Text style={item.sender_type === 'customer' ? styles.bubbleTextCustomer : styles.bubbleTextAdmin}>
                  {item.message}
                </Text>
              </View>
            </View>
          )}
        />
      )}

      {ticketStatus === 'closed' && (
        <View style={styles.closedBanner}>
          <Text style={styles.closedBannerText}>This conversation is closed. Sending a message will start a new one.</Text>
        </View>
      )}

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Type your message..."
          placeholderTextColor={Colors.outlineVariant}
          value={input}
          onChangeText={setInput}
          multiline
        />
        <Pressable style={[styles.sendBtn, (!input.trim() || sending) && { opacity: 0.5 }]} onPress={handleSend} disabled={!input.trim() || sending}>
          {sending ? <ActivityIndicator size="small" color="#fff" /> : <Send size={18} color="#fff" />}
        </Pressable>
      </View>
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
    backgroundColor: Colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: Colors.onSurfaceDeep },
  spacer: { width: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyIcon: {
    width: 64, height: 64, borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.onSurfaceDeep, marginBottom: 6 },
  emptySub: { fontSize: 13, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 19 },
  list: { padding: Spacing.md, gap: Spacing.sm },
  bubbleRow: { flexDirection: 'row', marginBottom: 4 },
  bubbleRowRight: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '78%', borderRadius: BorderRadius.lg, paddingHorizontal: 14, paddingVertical: 10, ...Shadows.card },
  bubbleCustomer: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleAdmin: { backgroundColor: Colors.surfaceCard, borderBottomLeftRadius: 4 },
  bubbleTextCustomer: { color: '#fff', fontSize: 14, lineHeight: 20 },
  bubbleTextAdmin: { color: Colors.onSurface, fontSize: 14, lineHeight: 20 },
  closedBanner: { paddingHorizontal: Spacing.md, paddingVertical: 8, backgroundColor: Colors.surfaceContainerLow },
  closedBannerText: { fontSize: 12, color: Colors.onSurfaceVariant, textAlign: 'center' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm,
    padding: Spacing.md, backgroundColor: 'rgba(239,254,235,0.95)',
    borderTopWidth: 0.5, borderTopColor: Colors.outlineVariant,
  },
  input: {
    flex: 1, backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md, paddingVertical: 10, fontSize: 14, color: Colors.onSurfaceDeep,
    maxHeight: 100, borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
});
