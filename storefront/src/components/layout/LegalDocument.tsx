import { SUPPORT_EMAIL } from '@/lib/constants'

export interface LegalSection {
  heading: string
  body: string[]
}

export default function LegalDocument({
  title, updated, intro, sections,
}: { title: string; updated: string; intro?: string; sections: LegalSection[] }) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-extrabold text-on-surface-deep mb-1">{title}</h1>
      <p className="text-xs text-on-surface-variant mb-6">Last updated: {updated}</p>
      {intro && <p className="text-sm text-on-surface leading-relaxed mb-8">{intro}</p>}

      {sections.map((section, i) => (
        <section key={section.heading} className="mb-7">
          <h2 className="font-bold text-on-surface-deep mb-2">{i + 1}. {section.heading}</h2>
          <div className="flex flex-col gap-1.5">
            {section.body.map((line, j) =>
              line.startsWith('• ') ? (
                <p key={j} className="text-sm text-on-surface-variant leading-relaxed pl-4">{line}</p>
              ) : (
                <p key={j} className="text-sm text-on-surface-variant leading-relaxed">{line}</p>
              )
            )}
          </div>
        </section>
      ))}

      <p className="text-sm text-on-surface-variant italic mt-8">
        Questions? Contact us at {SUPPORT_EMAIL}
      </p>
    </div>
  )
}
