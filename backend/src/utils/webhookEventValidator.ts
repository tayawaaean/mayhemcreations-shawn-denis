/**
 * Webhook Event Validator
 * Validates Stripe webhook event types and provides type safety
 */

import { StripeWebhookEventType } from '../types/stripeWebhookEvents';

/**
 * Valid Stripe webhook event types that we handle
 */
const SUPPORTED_EVENT_TYPES: StripeWebhookEventType[] = [
  // Payment Intent Events
  'payment_intent.created',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  
  // Charge Events
  'charge.succeeded',
  'charge.updated',
  'charge.dispute.created',
  'charge.refund.created',
  
  // Checkout Session Events
  'checkout.session.completed',
  'checkout.session.expired',
  
  // Customer Events
  'customer.created',
  'customer.updated',
  
  // Subscription Events
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  
  // Invoice Events
  'invoice.payment_succeeded',
  'invoice.payment_failed',
];

/**
 * Check if an event type is supported
 */
export function isSupportedEventType(eventType: string): eventType is StripeWebhookEventType {
  return SUPPORTED_EVENT_TYPES.includes(eventType as StripeWebhookEventType);
}

/**
 * Get all supported event types
 */
export function getSupportedEventTypes(): StripeWebhookEventType[] {
  return [...SUPPORTED_EVENT_TYPES];
}

/**
 * Validate webhook event type
 */
export function validateEventType(eventType: string): void {
  if (!isSupportedEventType(eventType)) {
    throw new Error(`Unsupported webhook event type: ${eventType}`);
  }
}

/**
 * Get event category for logging
 */
export function getEventCategory(eventType: string): string {
  if (eventType.startsWith('payment_intent.')) return 'Payment Intent';
  if (eventType.startsWith('charge.')) return 'Charge';
  if (eventType.startsWith('checkout.session.')) return 'Checkout Session';
  if (eventType.startsWith('customer.')) return 'Customer';
  if (eventType.startsWith('invoice.')) return 'Invoice';
  if (eventType.startsWith('subscription.')) return 'Subscription';
  return 'Other';
}

/**
 * Check if event requires immediate processing
 */
export function isCriticalEvent(eventType: string): boolean {
  const criticalEvents = [
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
    'charge.succeeded',
    'checkout.session.completed',
    'charge.dispute.created',
  ];
  return criticalEvents.includes(eventType);
}

/**
 * Get event priority for processing order
 */
export function getEventPriority(eventType: string): number {
  if (isCriticalEvent(eventType)) return 1; // High priority
  if (eventType.startsWith('payment_intent.') || eventType.startsWith('charge.')) return 2; // Medium priority
  return 3; // Low priority
}
