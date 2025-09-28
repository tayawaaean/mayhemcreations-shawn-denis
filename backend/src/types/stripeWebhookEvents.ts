/**
 * Stripe Webhook Event Types
 * Comprehensive list of supported Stripe webhook events
 */

export type StripeWebhookEventType = 
  // Payment Intent Events
  | 'payment_intent.created'
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed'
  | 'payment_intent.canceled'
  | 'payment_intent.requires_action'
  
  // Charge Events
  | 'charge.succeeded'
  | 'charge.failed'
  | 'charge.pending'
  | 'charge.updated'
  | 'charge.dispute.created'
  | 'charge.dispute.updated'
  | 'charge.dispute.closed'
  | 'charge.refunded'
  | 'charge.refund.updated'
  
  // Checkout Session Events
  | 'checkout.session.completed'
  | 'checkout.session.expired'
  | 'checkout.session.async_payment_succeeded'
  | 'checkout.session.async_payment_failed'
  
  // Customer Events
  | 'customer.created'
  | 'customer.updated'
  | 'customer.deleted'
  | 'customer.discount.created'
  | 'customer.discount.updated'
  | 'customer.discount.deleted'
  
  // Subscription Events
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'customer.subscription.paused'
  | 'customer.subscription.resumed'
  | 'customer.subscription.trial_will_end'
  
  // Invoice Events
  | 'invoice.created'
  | 'invoice.updated'
  | 'invoice.payment_succeeded'
  | 'invoice.payment_failed'
  | 'invoice.payment_action_required'
  | 'invoice.sent'
  | 'invoice.voided'
  | 'invoice.marked_uncollectible'
  | 'invoice.finalized'
  | 'invoice.paid'
  
  // Refund Events
  | 'charge.refund.created'
  | 'charge.refund.updated'
  
  // Payment Method Events
  | 'payment_method.attached'
  | 'payment_method.detached'
  | 'payment_method.updated'
  
  // Setup Intent Events
  | 'setup_intent.created'
  | 'setup_intent.succeeded'
  | 'setup_intent.setup_failed'
  | 'setup_intent.canceled'
  | 'setup_intent.requires_action'
  
  // Account Events
  | 'account.updated'
  | 'account.application.authorized'
  | 'account.application.deauthorized'
  | 'account.external_account.created'
  | 'account.external_account.updated'
  | 'account.external_account.deleted'
  
  // Capability Events
  | 'capability.updated'
  
  // Person Events
  | 'person.created'
  | 'person.updated'
  | 'person.deleted'
  
  // Product Events
  | 'product.created'
  | 'product.updated'
  | 'product.deleted'
  
  // Price Events
  | 'price.created'
  | 'price.updated'
  | 'price.deleted'
  
  // Coupon Events
  | 'coupon.created'
  | 'coupon.updated'
  | 'coupon.deleted'
  
  // Promotion Code Events
  | 'promotion_code.created'
  | 'promotion_code.updated'
  | 'promotion_code.deleted'
  
  // Tax Rate Events
  | 'tax_rate.created'
  | 'tax_rate.updated'
  
  // Webhook Endpoint Events
  | 'webhook_endpoint.created'
  | 'webhook_endpoint.updated'
  | 'webhook_endpoint.deleted'
  
  // File Events
  | 'file.created'
  
  // Mandate Events
  | 'mandate.updated'
  
  // Payment Link Events
  | 'payment_link.created'
  | 'payment_link.updated'
  | 'payment_link.deleted'
  
  // Quote Events
  | 'quote.created'
  | 'quote.accepted'
  | 'quote.canceled'
  | 'quote.finalized'
  | 'quote.updated'
  
  // Tax ID Events
  | 'customer.tax_id.created'
  | 'customer.tax_id.updated'
  | 'customer.tax_id.deleted'
  
  // Source Events
  | 'source.canceled'
  | 'source.chargeable'
  | 'source.failed'
  
  // Transfer Events
  | 'transfer.created'
  | 'transfer.updated'
  | 'transfer.reversed'
  | 'transfer.paid'
  | 'transfer.failed'
  
  // Payout Events
  | 'payout.created'
  | 'payout.updated'
  | 'payout.paid'
  | 'payout.failed'
  | 'payout.canceled'
  
  // Balance Events
  | 'balance.available'
  
  // Reporting Events
  | 'reporting.report_run.succeeded'
  | 'reporting.report_run.failed'
  
  // Sigma Events
  | 'sigma.scheduled_query_run.created'
  | 'sigma.scheduled_query_run.succeeded'
  | 'sigma.scheduled_query_run.failed'
  
  // Terminal Events
  | 'terminal.reader.action_failed'
  | 'terminal.reader.action_succeeded'
  
  // Treasury Events
  | 'treasury.financial_account.created'
  | 'treasury.financial_account.updated'
  | 'treasury.financial_account.features_status_updated'
  | 'treasury.outbound_payment.created'
  | 'treasury.outbound_payment.updated'
  | 'treasury.outbound_payment.returned'
  | 'treasury.outbound_payment.failed'
  | 'treasury.outbound_payment.posted'
  | 'treasury.outbound_transfer.created'
  | 'treasury.outbound_transfer.updated'
  | 'treasury.outbound_transfer.returned'
  | 'treasury.outbound_transfer.failed'
  | 'treasury.outbound_transfer.posted'
  | 'treasury.received_credit.created'
  | 'treasury.received_credit.failed'
  | 'treasury.received_debit.created';

export interface StripeWebhookEvent {
  id: string;
  object: 'event';
  api_version: string;
  created: number;
  data: {
    object: any;
    previous_attributes?: any;
  };
  livemode: boolean;
  pending_webhooks: number;
  request: {
    id: string | null;
    idempotency_key: string | null;
  };
  type: StripeWebhookEventType;
}
