import React from 'react'

/**
 * Minimal markdown renderer for product descriptions written in the admin's
 * rich-text editor. Supports: # headings, **bold**, *italic*, bullet lists
 * (* or -), and blank-line paragraphs. No external deps.
 */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const segments: React.ReactNode[] = []
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segments.push(text.slice(last, m.index))
    if (m[2] !== undefined) {
      segments.push(<strong key={`${keyPrefix}-b${i}`} className="font-bold text-on-surface">{m[2]}</strong>)
    } else if (m[3] !== undefined) {
      segments.push(<em key={`${keyPrefix}-i${i}`}>{m[3]}</em>)
    }
    last = m.index + m[0].length
    i++
  }
  if (last < text.length) segments.push(text.slice(last))
  return segments
}

export default function MarkdownText({ children }: { children?: string | null }) {
  const source = (children || '').replace(/\r\n/g, '\n')
  if (!source.trim()) return null

  const lines = source.split('\n')
  const blocks: React.ReactNode[] = []

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim()
    const key = `md-${idx}`
    if (!line) return

    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      blocks.push(
        <p key={key} className="font-extrabold text-on-surface-deep mt-2.5 mb-1">
          {renderInline(heading[2], key)}
        </p>
      )
      return
    }

    const bullet = line.match(/^[*-]\s+(.*)$/)
    if (bullet) {
      blocks.push(
        <div key={key} className="flex gap-2 mb-1.5 pl-1">
          <span className="text-primary font-extrabold">•</span>
          <span className="flex-1 text-sm leading-relaxed text-on-surface-variant">{renderInline(bullet[1], key)}</span>
        </div>
      )
      return
    }

    blocks.push(
      <p key={key} className="text-sm leading-relaxed text-on-surface-variant mb-2">
        {renderInline(line, key)}
      </p>
    )
  })

  return <div>{blocks}</div>
}
