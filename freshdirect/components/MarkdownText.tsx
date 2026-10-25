import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';

/**
 * Minimal markdown renderer for product descriptions written in the
 * admin's rich-text editor. Supports: # headings, **bold**, *italic*,
 * bullet lists (* or -), and blank-line paragraphs. No external deps.
 */

// Split a line into Text segments for **bold** and *italic*
function renderInline(text: string, keyPrefix: string) {
  const segments: React.ReactNode[] = [];
  // Match **bold** first, then *italic*
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      segments.push(text.slice(last, m.index));
    }
    if (m[2] !== undefined) {
      segments.push(<Text key={`${keyPrefix}-b${i}`} style={styles.bold}>{m[2]}</Text>);
    } else if (m[3] !== undefined) {
      segments.push(<Text key={`${keyPrefix}-i${i}`} style={styles.italic}>{m[3]}</Text>);
    }
    last = m.index + m[0].length;
    i++;
  }
  if (last < text.length) segments.push(text.slice(last));
  return segments;
}

// Descriptions saved from the rich-text editor may be HTML; convert to the markdown subset below.
function htmlToMarkdown(input: string): string {
  if (!/<\/?[a-z][^>]*>/i.test(input)) return input;
  return input
    .replace(/<h[1-6][^>]*>/gi, '\n# ')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<(strong|b)>/gi, '**').replace(/<\/(strong|b)>/gi, '**')
    .replace(/<(em|i)>/gi, '*').replace(/<\/(em|i)>/gi, '*')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|ul|ol)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/g, "'");
}

export default function MarkdownText({ children }: { children?: string | null }) {
  const source = htmlToMarkdown(children || '').replace(/\r\n/g, '\n');
  if (!source.trim()) return null;

  const lines = source.split('\n');
  const blocks: React.ReactNode[] = [];

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    const key = `md-${idx}`;

    if (!line) return; // blank line = paragraph gap (handled by block margins)

    // Headings: #, ##, ### ... (strip leading emoji-safe hashes)
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      blocks.push(
        <Text key={key} style={styles.heading}>
          {renderInline(heading[2], key)}
        </Text>
      );
      return;
    }

    // Bullets: * item or - item
    const bullet = line.match(/^[*-]\s+(.*)$/);
    if (bullet) {
      blocks.push(
        <View key={key} style={styles.bulletRow}>
          <Text style={styles.bulletDot}>{'•'}</Text>
          <Text style={styles.bulletText}>{renderInline(bullet[1], key)}</Text>
        </View>
      );
      return;
    }

    // Plain paragraph line
    blocks.push(
      <Text key={key} style={styles.paragraph}>
        {renderInline(line, key)}
      </Text>
    );
  });

  return <View>{blocks}</View>;
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.onSurfaceDeep,
    marginTop: 10,
    marginBottom: 4,
    lineHeight: 22,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.onSurfaceVariant,
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
    paddingLeft: 4,
  },
  bulletDot: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.primary,
    fontWeight: '800',
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.onSurfaceVariant,
  },
  bold: { fontWeight: '700', color: Colors.onSurface },
  italic: { fontStyle: 'italic' },
});
