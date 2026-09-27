/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'DigiCraft'

interface ProductDeliveryProps {
  productName?: string
  downloadUrl?: string
}

const ProductDeliveryEmail = ({
  productName,
  downloadUrl,
}: ProductDeliveryProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {productName ?? 'product'} is ready to download</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your product is ready! 🎉</Heading>
        <Text style={text}>
          Thanks for your purchase! {productName ? <>Your <strong>{productName}</strong> has been generated</> : 'Your custom product has been generated'} and is ready to download.
        </Text>
        {downloadUrl && (
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button href={downloadUrl} style={button}>
              Download your product
            </Button>
          </Section>
        )}
        <Text style={text}>
          This download link will remain active for 7 days. If you have any
          trouble accessing your file, just reply to this email and we'll help.
        </Text>
        <Text style={footer}>— The {SITE_NAME} team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ProductDeliveryEmail,
  subject: (data: Record<string, string>) =>
    data?.productName
      ? `Your ${data.productName} is ready to download`
      : 'Your product is ready to download',
  displayName: 'Product delivery',
  previewData: {
    productName: 'Custom Daily Planner',
    downloadUrl: 'https://example.com/download/sample',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '"Plus Jakarta Sans", "Inter", Arial, sans-serif',
}
const container = {
  padding: '32px 28px',
  maxWidth: '560px',
  margin: '0 auto',
}
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  margin: '0 0 20px',
}
const text = {
  fontSize: '15px',
  color: '#4b5563',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const button = {
  backgroundColor: '#7C3AED',
  color: '#ffffff',
  padding: '14px 28px',
  borderRadius: '16px',
  fontSize: '15px',
  fontWeight: '600',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = {
  fontSize: '13px',
  color: '#9ca3af',
  margin: '32px 0 0',
}
