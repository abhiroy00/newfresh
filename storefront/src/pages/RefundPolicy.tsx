import LegalDocument, { LegalSection } from '@/components/layout/LegalDocument'

const SECTIONS: LegalSection[] = [
  { heading: 'Order Cancellation', body: [
    'You can cancel an order free of charge while it is still in the "Pending" or "Confirmed" status, from the Order Details page in the app or website.',
    'Once an order has been packed or is out for delivery, it can no longer be cancelled, as preparation and dispatch are already underway.',
  ]},
  { heading: 'Refunds for Prepaid Orders', body: [
    'If you paid online (UPI/Card) and your order is cancelled before dispatch, the full amount is refunded to the original payment method.',
    'Refunds are initiated immediately after cancellation is confirmed and typically reflect in your account within 5–7 business days, depending on your bank or payment provider.',
  ]},
  { heading: 'Cash on Delivery Orders', body: [
    'Cash on Delivery orders cancelled before dispatch do not require a refund, since no payment was collected in advance.',
  ]},
  { heading: 'Damaged, Spoiled, or Incorrect Items', body: [
    'If any item in your delivered order is damaged, spoiled, expired, or different from what you ordered, contact us within 24 hours of delivery with your order number and (where possible) a photo of the item.',
    'Once verified, we will arrange a replacement or a refund for that item, credited to your original payment method or your Gmart wallet, whichever is applicable.',
  ]},
  { heading: 'Non-Refundable Situations', body: [
    '• Orders cancelled after they have been packed or dispatched for delivery.',
    '• Issues reported more than 24 hours after delivery.',
    '• Change of mind after an order has already been delivered in good condition.',
  ]},
  { heading: 'How to Request a Refund', body: [
    'Open the relevant order under "My Orders" and use the cancel option, or reach out to our support team with your order number via the Help Center, phone, or email. We will confirm the outcome and expected refund timeline directly with you.',
  ]},
]

export default function RefundPolicy() {
  return (
    <LegalDocument
      title="Refund & Cancellation Policy"
      updated="2 July 2026"
      intro="This policy explains when orders can be cancelled, how refunds are processed, and what to do if something arrives damaged or incorrect."
      sections={SECTIONS}
    />
  )
}
