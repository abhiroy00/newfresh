import LegalDocument, { LegalSection } from '@/components/layout/LegalDocument'

const SECTIONS: LegalSection[] = [
  { heading: 'Acceptance of Terms', body: [
    'By creating an account and using the Gmart app, you agree to these Terms & Conditions. If you do not agree, please do not use the app.',
  ]},
  { heading: 'Your Account', body: [
    'You must provide accurate information and keep your mobile number up to date. You are responsible for activity that happens through your account. You must be at least 18 years old, or use the app under the supervision of a parent or guardian.',
  ]},
  { heading: 'Orders and Pricing', body: [
    '• All prices are listed in Indian Rupees (₹) and include applicable taxes unless stated otherwise.',
    '• We try to keep product information and prices accurate, but errors can occur. If a price is wrong, we may cancel the order and inform you.',
    '• Product availability is not guaranteed and may change without notice.',
    '• A delivery fee may apply to orders below the free-delivery threshold shown at checkout.',
  ]},
  { heading: 'Payment', body: [
    'You can pay online or via Cash on Delivery where available. Online payments are processed by third-party payment providers. By placing an order you authorise us to charge the total amount shown at checkout.',
  ]},
  { heading: 'Delivery', body: [
    'We aim to deliver within the estimated time shown at checkout, but delivery times are estimates and may vary due to traffic, weather, or availability. Please ensure someone is available to receive the order at the delivery address.',
  ]},
  { heading: 'Cancellations and Refunds', body: [
    'You can cancel an order while it is still Pending or Confirmed. Once an order is being packed or is out for delivery, it may not be cancellable. Eligible refunds for prepaid orders are processed to the original payment method within a reasonable period.',
  ]},
  { heading: 'Product Quality', body: [
    'If you receive a damaged, spoiled, or incorrect item, contact us within 24 hours of delivery and we will arrange a replacement or refund for that item.',
  ]},
  { heading: 'Limitation of Liability', body: [
    'The app and service are provided on an "as is" basis. To the extent permitted by law, Gmart is not liable for indirect or consequential losses arising from the use of the app.',
  ]},
  { heading: 'Changes to These Terms', body: [
    'We may update these Terms & Conditions from time to time. Continued use of the app after changes means you accept the updated terms.',
  ]},
]

export default function Terms() {
  return (
    <LegalDocument
      title="Terms & Conditions"
      updated="2 July 2026"
      intro="These Terms & Conditions govern your use of the Gmart app and services. Please read them carefully."
      sections={SECTIONS}
    />
  )
}
