import React from 'react';
import LegalDocument, { LegalSection } from '@/components/LegalDocument';

const SECTIONS: LegalSection[] = [
  {
    heading: 'Information We Collect',
    body: [
      'To provide our grocery delivery service, we collect:',
      '• Your name and mobile number, used to create your account and verify it via OTP.',
      '• Delivery addresses you save, so we can deliver your orders.',
      '• Order history and cart contents.',
      '• Your device location (only when you grant permission) to help set your delivery address.',
      '• Basic device information needed to keep the app running securely.',
    ],
  },
  {
    heading: 'How We Use Your Information',
    body: [
      'We use your information only to run the service — to process and deliver your orders, verify your identity, keep you updated on order status, provide customer support, and improve the app. We do not sell your personal data to anyone.',
    ],
  },
  {
    heading: 'Sharing Your Information',
    body: [
      'We share information only where it is necessary to fulfil your order:',
      '• With delivery partners, so they can deliver to your address.',
      '• With payment providers, to process payments securely. We never store your full card details.',
      '• With authorities, only where required by law.',
    ],
  },
  {
    heading: 'Data Security',
    body: [
      'We use industry-standard measures to protect your data, including encrypted connections and secure storage of authentication tokens on your device. No method of transmission is completely secure, but we work continuously to protect your information.',
    ],
  },
  {
    heading: 'Your Rights',
    body: [
      'You can view and update your profile and saved addresses at any time from within the app. To request deletion of your account and associated data, contact us at support@gmartfresh.com.',
    ],
  },
  {
    heading: 'Changes to This Policy',
    body: [
      'We may update this Privacy Policy from time to time. Any changes will be reflected on this screen with an updated date.',
    ],
  },
];

export default function PrivacyScreen() {
  return (
    <LegalDocument
      title="Privacy Policy"
      updated="2 July 2026"
      intro="This Privacy Policy explains how Gmart collects, uses, and protects your personal information when you use our app."
      sections={SECTIONS}
    />
  );
}
