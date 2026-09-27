/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<Record<string, unknown>>
  subject: string | ((data: Record<string, unknown>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, unknown>
}

import { template as productDelivery } from './product-delivery.tsx'
import { template as contactMessage } from './contact-message.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'product-delivery': productDelivery,
  'contact-message': contactMessage,
}
