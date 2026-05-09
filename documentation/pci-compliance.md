---
title: "PCI DSS Compliance (SAQ A)"
tags: ["pci", "stripe", "security", "billing"]
category: "Security"
isPublished: false
---

# PCI DSS Compliance (SAQ A)

## Overview

Sandpiper processes payments through **Stripe Checkout Sessions** — a fully hosted payment flow where cardholder data never touches Sandpiper's servers. This architecture qualifies for **PCI DSS SAQ A**, the simplest level of PCI compliance for e-commerce merchants.

## Why SAQ A applies

SAQ A is for merchants that have **fully outsourced** all payment page functions to a PCI DSS validated third-party service provider. Every SAQ A eligibility criterion is met:

| Criterion                                                                                                                                    | How Sandpiper meets it                                                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All processing of cardholder data is entirely outsourced to a PCI DSS validated third-party payment processor                                | Stripe is a [PCI Level 1 Service Provider](https://stripe.com/docs/security). All card collection and processing happens on Stripe's infrastructure.                                                |
| The merchant does not electronically store, process, or transmit any cardholder data on its systems or premises                              | Sandpiper's server never sees card numbers, CVVs, expiration dates, or any other cardholder data. The only data received from Stripe is payment confirmation metadata (amount, status, session ID). |
| The merchant has confirmed that all third parties handling storage, processing, and/or transmission of cardholder data are PCI DSS compliant | Stripe maintains PCI DSS Level 1 certification, audited annually by a Qualified Security Assessor.                                                                                                  |
| No Stripe.js, Elements, or SDKs are loaded on the merchant's payment pages                                                                   | The frontend contains no Stripe client-side libraries. The only Stripe dependency is the server-side Node.js SDK.                                                                                   |

## Payment flow

```
User clicks "Add Credits"
        │
        ▼
┌─────────────────────┐
│   TopUpDialog        │  User selects a dollar amount ($10–$100 or custom).
│   (Sandpiper UI)     │  No card fields, no Stripe.js, no iframes.
└────────┬────────────┘
         │ POST /teams/:teamId/billing  { intent: "INITIATE_TOPUP", amount }
         ▼
┌─────────────────────┐
│   Sandpiper server   │  1. Verifies authentication and authorization
│                      │  2. Ensures a Stripe Customer exists for the team
│                      │  3. Creates a Stripe Checkout Session (server-side SDK)
│                      │  4. Returns the Checkout Session URL to the browser
└────────┬────────────┘
         │ window.location.href = checkoutUrl
         ▼
┌─────────────────────┐
│   Stripe Checkout    │  Hosted entirely on stripe.com.
│   (Stripe-hosted)    │  User enters card details here.
│                      │  Sandpiper has zero visibility into this page.
└────────┬────────────┘
         │ On success: redirect to /teams/:teamId/billing?topup=success
         │ Async: Stripe sends webhook
         ▼
┌─────────────────────┐
│   Stripe Webhook     │  POST /api/webhooks/stripe
│   (Sandpiper server) │  1. Validates stripe-signature header
│                      │  2. Processes checkout.session.completed event
│                      │  3. Checks payment_status === "paid"
│                      │  4. Idempotency check (prevents duplicate credits)
│                      │  5. Credits the team's billing balance
└─────────────────────┘
```

## What data Sandpiper stores

Sandpiper stores **billing ledger entries** for each transaction. These contain:

- Dollar amount
- Team and user IDs
- Stripe Checkout Session ID (for reconciliation)
- Payment status (`"paid"`)
- Timestamp

Sandpiper does **not** store:

- Card numbers (PAN)
- CVV / CVC codes
- Expiration dates
- Cardholder names
- Any data that would fall under PCI DSS cardholder data definitions

## Security controls

### Webhook signature verification

All incoming Stripe webhooks are verified using `stripe.webhooks.constructEvent()` with the `STRIPE_WEBHOOK_SECRET`. Requests with missing or invalid signatures are rejected with HTTP 400.

### Idempotency

Duplicate webhook deliveries are handled at two levels:

1. **Application-level check** — queries the billing ledger for an existing entry with the same Stripe session ID before processing.
2. **Database-level constraint** — a unique index on `idempotencyKey` (`stripe-checkout:{sessionId}`) catches race conditions. Duplicate key errors (MongoDB error code 11000) are caught and silently ignored.

### Authorization

Only authenticated users with billing permissions on the team can initiate a top-up. Authorization is checked independently in the action handler (not inherited from the loader).

### Content Security Policy (PCI DSS v4.0.1 §6.4.3 & §11.6.1)

PCI DSS v4.0.1 requires merchants to control and monitor scripts on pages involved in the payment flow. Sandpiper implements a Content Security Policy (CSP) to satisfy requirements 6.4.3 and 11.6.1. See [GitHub issue #2160](https://github.com/freshcognate/pipeline/issues/2160) for the CSP specification.

Since Sandpiper uses Stripe's hosted Checkout page (not embedded elements), CSP does not need to allowlist any Stripe domains — the redirect is a top-level navigation, not governed by CSP directives.

## Stripe configuration

| Setting                      | Value                                          |
| ---------------------------- | ---------------------------------------------- |
| Integration type             | Checkout Sessions (hosted payment page)        |
| Mode                         | `payment` (one-time charges, no subscriptions) |
| Currency                     | USD                                            |
| Stripe SDK                   | Server-side only (`stripe` for Node.js)        |
| API version                  | `2026-03-25.dahlia` (pinned)                   |
| Client-side Stripe libraries | None                                           |
| Webhook events consumed      | `checkout.session.completed`                   |

## Relevant source files

| File                                                        | Purpose                                                                                      |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `app/modules/billing/stripe.ts`                             | Stripe SDK wrapper: customer creation, checkout session creation, webhook event construction |
| `app/modules/billing/containers/stripeWebhook.route.tsx`    | Webhook endpoint: signature verification, idempotent payment processing                      |
| `app/modules/billing/components/topUpDialog.tsx`            | Frontend dialog: dollar amount selection only, no card fields                                |
| `app/modules/billing/services/applyBillingCredit.server.ts` | Ledger entry creation with idempotency key                                                   |
| `app/modules/billing/teamBilling.ts`                        | TeamBillingService: balance management                                                       |

## SAQ A questionnaire notes

When filling out the SAQ A form, the following answers apply:

- **"Do you store cardholder data?"** — No. Sandpiper never receives, processes, or stores cardholder data.
- **"How are payments accepted?"** — Customers are redirected to Stripe's hosted Checkout page. No payment forms exist within Sandpiper.
- **"Are any Stripe.js, Elements, or payment iframes embedded?"** — No. The only client-side interaction is selecting a dollar amount and being redirected via `window.location.href`.
- **"Which Stripe integration type?"** — Stripe Checkout (redirect-based).
- **"Is the third-party payment processor PCI DSS compliant?"** — Yes. Stripe is a PCI Level 1 Service Provider.
