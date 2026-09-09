import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';

export type LegalSection = {
  heading: string;
  /** Paragraph strings; a line starting with "• " renders as a bullet. */
  body: string[];
};

export default function LegalDocument({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro?: string;
  sections: LegalSection[];
}) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header} edges={['top']}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={Colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.spacer} />
      </SafeAreaView>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.updated}>Last updated: {updated}</Text>
        {intro ? <Text style={styles.intro}>{intro}</Text> : null}

        {sections.map((section, i) => (
          <View key={section.heading} style={styles.section}>
            <Text style={styles.heading}>{`${i + 1}. ${section.heading}`}</Text>
            {section.body.map((line, j) => {
              const isBullet = line.startsWith('• ');
              return (
                <Text
                  key={j}
                  style={[styles.paragraph, isBullet && styles.bullet]}
                >
                  {line}
                </Text>
              );
            })}
          </View>
        ))}

        <Text style={styles.contact}>
          Questions? Contact us at support@gmartfresh.com
        </Text>
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
  updated: { fontSize: 12, color: Colors.onSurfaceVariant, marginBottom: Spacing.md },
  intro: {
    fontSize: 14, lineHeight: 22, color: Colors.onSurface,
    marginBottom: Spacing.md,
  },
  section: { marginBottom: Spacing.lg },
  heading: {
    fontSize: 15, fontWeight: '800', color: Colors.onSurfaceDeep,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 13.5, lineHeight: 21, color: Colors.onSurfaceVariant,
    marginBottom: 6,
  },
  bullet: { paddingLeft: Spacing.sm },
  contact: {
    fontSize: 13, color: Colors.onSurfaceVariant, fontStyle: 'italic',
    marginTop: Spacing.sm, marginBottom: Spacing.md,
  },
  spacerBottom: { height: 60 },
});
