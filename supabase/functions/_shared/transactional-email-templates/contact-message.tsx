/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  senderName?: string
  senderEmail?: string
  message?: string
}

const Email = ({ senderName, senderEmail, message }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New contact form message from {senderName || 'a visitor'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New contact message</Heading>
        <Text style={label}>From</Text>
        <Text style={value}>
          {senderName || 'Anonymous'} &lt;{senderEmail || 'unknown'}&gt;
        </Text>
        <Hr style={hr} />
        <Text style={label}>Message</Text>
        <Section style={messageBox}>
          <Text style={messageText}>{message || '(empty message)'}</Text>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>Sent from the DigiCraft contact form.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, string>) =>
    `New contact message from ${data.senderName || 'a visitor'}`,
  to: 'rebeccamaynard1@gmail.com',
  displayName: 'Contact form message',
  previewData: {
    senderName: 'Jane Doe',
    senderEmail: 'jane@example.com',
    message: 'Hi — I have a question about my order.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '28px 24px', maxWidth: '560px' }
const h1 = { fontSize: '22px', color: '#111827', margin: '0 0 20px' }
const label = { fontSize: '12px', color: '#6b7280', margin: '12px 0 4px', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }
const value = { fontSize: '15px', color: '#111827', margin: '0 0 8px' }
const messageBox = { background: '#f9fafb', borderRadius: '12px', padding: '16px 18px', margin: '4px 0' }
const messageText = { fontSize: '15px', color: '#1f2937', lineHeight: '1.55', margin: 0, whiteSpace: 'pre-wrap' as const }
const hr = { borderColor: '#e5e7eb', margin: '18px 0' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '8px 0 0' }
