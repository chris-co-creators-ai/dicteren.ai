// Dicteren.ai — Mollie Payment Service
// Shared mechanics: payment creation, status fetch, webhook verification, mapping.
// Domain logic (order creation, license generation after payment) stays in actions.
//
// Tagging-strategie: Mollie heeft geen native tags/labels. Wij gebruiken het
// `metadata` veld (~1kB JSON) als tagging-mechanisme. ALLE create-calls
// accepteren een gestructureerde `MollieMetadataInput` via buildMollieMetadata
// uit `./mollie-metadata`. Direct losse keys doorgeven mag ook (voor backwards
// compat), maar nieuwe code moet de builder gebruiken.

import type { ServiceResult } from "@/lib/types";

const MOLLIE_BASE = "https://api.mollie.com/v2";

/** Mollie metadata accepteert strings, numbers, null en (geserialiseerd) objects. */
export type MollieMetadataRecord = Record<string, string | number | boolean | null>;

interface CreatePaymentParams {
  /** Amount in eurocents (e.g. 1200 = €12.00) */
  amountCents: number;
  /** ISO-4217 currency code, default EUR */
  currency?: string;
  description: string;
  redirectUrl: string;
  webhookUrl?: string;
  metadata?: MollieMetadataRecord;
  locale?: string;
  /** Optional Mollie method id (e.g. 'ideal', 'creditcard'); omitted = customer chooses */
  method?: string;
}

interface PaymentResult {
  paymentId: string;
  checkoutUrl: string;
  status: string;
}

interface FetchedPayment {
  paymentId: string;
  status: string;
  amount: number;
  currency: string;
  method: string | null;
  paidAt: string | null;
  metadata: Record<string, unknown> | null;
  /** Set when this payment is the first charge of a recurring flow. */
  sequenceType: "oneoff" | "first" | "recurring" | null;
  customerId: string | null;
  /** Set when this payment is a recurring charge from an existing subscription. */
  subscriptionId: string | null;
  mandateId: string | null;
}

interface CreateCustomerPaymentParams extends CreatePaymentParams {
  customerId: string;
  /** "first" = mandate-establishing payment; "recurring" = on-demand later charge. */
  sequenceType: "first" | "recurring";
}

interface CreateSubscriptionParams {
  customerId: string;
  amountCents: number;
  currency?: string;
  /** Mollie format e.g. "1 month", "3 months", "12 months". */
  interval: string;
  description: string;
  webhookUrl?: string;
  /** ISO date string (yyyy-MM-dd); first charge happens then. Default: immediately.
   * Gebruik dit voor "X maanden gratis" voor de paid periode begint. */
  startDate?: string;
  /** Optional. Aantal afschrijvingen voor subscription eindigt (lifetime = weglaten). */
  times?: number;
  metadata?: MollieMetadataRecord;
}

interface CreateCustomerParams {
  name: string;
  email: string;
  locale?: string;
  metadata?: MollieMetadataRecord;
}

interface CustomerResult {
  customerId: string;
}

interface SubscriptionResult {
  subscriptionId: string;
  status: string;
  nextPaymentDate: string | null;
}

type MollieStatus = "open" | "canceled" | "pending" | "authorized" | "expired" | "failed" | "paid";

function authHeader(): { Authorization: string } | null {
  const key = process.env.MOLLIE_API_KEY;
  if (!key) return null;
  return { Authorization: `Bearer ${key}` };
}

/** POST /v2/payments — create a Mollie payment and return the checkout URL. */
export async function createPayment(
  params: CreatePaymentParams,
): Promise<ServiceResult<PaymentResult>> {
  const auth = authHeader();
  if (!auth) {
    return {
      success: false,
      error: "Mollie API key ontbreekt",
      code: "MOLLIE_NOT_CONFIGURED",
    };
  }

  const body: Record<string, unknown> = {
    amount: {
      currency: params.currency ?? "EUR",
      value: (params.amountCents / 100).toFixed(2),
    },
    description: params.description,
    redirectUrl: params.redirectUrl,
    locale: params.locale ?? "nl_NL",
  };
  if (params.webhookUrl) body.webhookUrl = params.webhookUrl;
  if (params.metadata) body.metadata = params.metadata;
  if (params.method) body.method = params.method;

  try {
    const res = await fetch(`${MOLLIE_BASE}/payments`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      return {
        success: false,
        error: detail.detail || `Mollie returned ${res.status}`,
        code: "MOLLIE_ERROR",
      };
    }

    const data = await res.json();
    return {
      success: true,
      data: {
        paymentId: data.id,
        checkoutUrl: data._links?.checkout?.href ?? "",
        status: data.status,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message,
      code: "MOLLIE_NETWORK_ERROR",
    };
  }
}

/**
 * GET /v2/payments/{id} — fetch authoritative payment state.
 *
 * Webhook bodies only contain `id`. Always re-fetch from Mollie to verify
 * status before changing license/order state.
 */
export async function verifyWebhookPayment(
  paymentId: string,
): Promise<ServiceResult<FetchedPayment>> {
  const auth = authHeader();
  if (!auth) {
    return {
      success: false,
      error: "Mollie API key ontbreekt",
      code: "MOLLIE_NOT_CONFIGURED",
    };
  }

  try {
    const res = await fetch(`${MOLLIE_BASE}/payments/${paymentId}`, {
      headers: auth,
    });

    if (!res.ok) {
      return {
        success: false,
        error: `Mollie returned ${res.status}`,
        code: res.status === 404 ? "MOLLIE_NOT_FOUND" : "MOLLIE_ERROR",
      };
    }

    const data = await res.json();
    return {
      success: true,
      data: {
        paymentId: data.id,
        status: data.status,
        amount: Math.round(parseFloat(data.amount?.value ?? "0") * 100),
        currency: data.amount?.currency ?? "EUR",
        method: data.method ?? null,
        paidAt: data.paidAt ?? null,
        metadata: data.metadata ?? null,
        sequenceType: data.sequenceType ?? null,
        customerId: data.customerId ?? null,
        subscriptionId: data.subscriptionId ?? null,
        mandateId: data.mandateId ?? null,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message,
      code: "MOLLIE_NETWORK_ERROR",
    };
  }
}

/**
 * POST /v2/customers/{customerId}/payments — used for recurring flows.
 *
 * `sequenceType: "first"` establishes a mandate the user explicitly consents to.
 * After this succeeds, Mollie can charge the saved payment method via subscriptions
 * (server-scheduled) or `sequenceType: "recurring"` payments (on-demand charges).
 */
export async function createCustomerPayment(
  params: CreateCustomerPaymentParams,
): Promise<ServiceResult<PaymentResult>> {
  const auth = authHeader();
  if (!auth) {
    return {
      success: false,
      error: "Mollie API key ontbreekt",
      code: "MOLLIE_NOT_CONFIGURED",
    };
  }

  const body: Record<string, unknown> = {
    amount: {
      currency: params.currency ?? "EUR",
      value: (params.amountCents / 100).toFixed(2),
    },
    description: params.description,
    redirectUrl: params.redirectUrl,
    locale: params.locale ?? "nl_NL",
    sequenceType: params.sequenceType,
  };
  if (params.webhookUrl) body.webhookUrl = params.webhookUrl;
  if (params.metadata) body.metadata = params.metadata;
  if (params.method) body.method = params.method;

  try {
    const res = await fetch(
      `${MOLLIE_BASE}/customers/${params.customerId}/payments`,
      {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      return {
        success: false,
        error: detail.detail || `Mollie returned ${res.status}`,
        code: "MOLLIE_ERROR",
      };
    }

    const data = await res.json();
    return {
      success: true,
      data: {
        paymentId: data.id,
        checkoutUrl: data._links?.checkout?.href ?? "",
        status: data.status,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message,
      code: "MOLLIE_NETWORK_ERROR",
    };
  }
}

/** POST /v2/customers/{customerId}/subscriptions — schedule recurring charges. */
export async function createMollieSubscription(
  params: CreateSubscriptionParams,
): Promise<ServiceResult<SubscriptionResult>> {
  const auth = authHeader();
  if (!auth) {
    return {
      success: false,
      error: "Mollie API key ontbreekt",
      code: "MOLLIE_NOT_CONFIGURED",
    };
  }

  const body: Record<string, unknown> = {
    amount: {
      currency: params.currency ?? "EUR",
      value: (params.amountCents / 100).toFixed(2),
    },
    interval: params.interval,
    description: params.description,
  };
  if (params.webhookUrl) body.webhookUrl = params.webhookUrl;
  if (params.startDate) body.startDate = params.startDate;
  if (params.times && params.times > 0) body.times = params.times;
  if (params.metadata) body.metadata = params.metadata;

  try {
    const res = await fetch(
      `${MOLLIE_BASE}/customers/${params.customerId}/subscriptions`,
      {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      return {
        success: false,
        error: detail.detail || `Mollie returned ${res.status}`,
        code: "MOLLIE_ERROR",
      };
    }

    const data = await res.json();
    return {
      success: true,
      data: {
        subscriptionId: data.id,
        status: data.status,
        nextPaymentDate: data.nextPaymentDate ?? null,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message,
      code: "MOLLIE_NETWORK_ERROR",
    };
  }
}

/** POST /v2/customers — create a Mollie customer with our standard metadata. */
export async function createMollieCustomer(
  params: CreateCustomerParams,
): Promise<ServiceResult<CustomerResult>> {
  const auth = authHeader();
  if (!auth) {
    return {
      success: false,
      error: "Mollie API key ontbreekt",
      code: "MOLLIE_NOT_CONFIGURED",
    };
  }

  const body: Record<string, unknown> = {
    name: params.name,
    email: params.email,
    locale: params.locale ?? "nl_NL",
  };
  if (params.metadata) body.metadata = params.metadata;

  try {
    const res = await fetch(`${MOLLIE_BASE}/customers`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      return {
        success: false,
        error: detail.detail || `Mollie returned ${res.status}`,
        code: "MOLLIE_ERROR",
      };
    }
    const data = await res.json();
    return { success: true, data: { customerId: data.id } };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message,
      code: "MOLLIE_NETWORK_ERROR",
    };
  }
}

/** GET /v2/customers/{customerId}/subscriptions/{subscriptionId} — voor sync naar Tauri. */
export async function getMollieSubscription(args: {
  customerId: string;
  subscriptionId: string;
}): Promise<
  ServiceResult<{
    status: string;
    nextPaymentDate: string | null;
    amountCents: number;
    interval: string;
    canceledAt: string | null;
  }>
> {
  const auth = authHeader();
  if (!auth) {
    return {
      success: false,
      error: "Mollie API key ontbreekt",
      code: "MOLLIE_NOT_CONFIGURED",
    };
  }
  try {
    const res = await fetch(
      `${MOLLIE_BASE}/customers/${args.customerId}/subscriptions/${args.subscriptionId}`,
      { headers: auth },
    );
    if (!res.ok) {
      return {
        success: false,
        error: `Mollie returned ${res.status}`,
        code: res.status === 404 ? "MOLLIE_NOT_FOUND" : "MOLLIE_ERROR",
      };
    }
    const data = await res.json();
    return {
      success: true,
      data: {
        status: data.status,
        nextPaymentDate: data.nextPaymentDate ?? null,
        amountCents: Math.round(parseFloat(data.amount?.value ?? "0") * 100),
        interval: data.interval ?? "",
        canceledAt: data.canceledAt ?? null,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message,
      code: "MOLLIE_NETWORK_ERROR",
    };
  }
}

/** DELETE /v2/customers/{customerId}/subscriptions/{subscriptionId} — user-initiated cancel. */
export async function cancelMollieSubscription(args: {
  customerId: string;
  subscriptionId: string;
}): Promise<ServiceResult<{ status: string }>> {
  const auth = authHeader();
  if (!auth) {
    return {
      success: false,
      error: "Mollie API key ontbreekt",
      code: "MOLLIE_NOT_CONFIGURED",
    };
  }

  try {
    const res = await fetch(
      `${MOLLIE_BASE}/customers/${args.customerId}/subscriptions/${args.subscriptionId}`,
      { method: "DELETE", headers: auth },
    );

    if (!res.ok) {
      return {
        success: false,
        error: `Mollie returned ${res.status}`,
        code: res.status === 404 ? "MOLLIE_NOT_FOUND" : "MOLLIE_ERROR",
      };
    }
    const data = await res.json();
    return { success: true, data: { status: data.status ?? "canceled" } };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message,
      code: "MOLLIE_NETWORK_ERROR",
    };
  }
}

interface CreateRefundParams {
  paymentId: string;
  /** Cents. Weglaten = volledig (Mollie default). */
  amountCents?: number;
  currency?: string;
  description?: string;
}

interface RefundResult {
  refundId: string;
  status: string;
  amountCents: number;
}

/**
 * POST /v2/payments/{paymentId}/refunds — initiate refund.
 *
 * - amountCents weglaten = volledige refund van wat nog niet eerder gerefund is.
 * - Refunds hebben eigen webhook (zelfde URL, payment komt opnieuw); fetch
 *   payment met ?embed=refunds voor refund-status details.
 * - Voor SEPA: status loopt queued → pending → processing → refunded (1-2 dagen).
 */
export async function createMollieRefund(
  params: CreateRefundParams,
): Promise<ServiceResult<RefundResult>> {
  const auth = authHeader();
  if (!auth) {
    return {
      success: false,
      error: "Mollie API key ontbreekt",
      code: "MOLLIE_NOT_CONFIGURED",
    };
  }

  const body: Record<string, unknown> = {};
  if (typeof params.amountCents === "number") {
    body.amount = {
      currency: params.currency ?? "EUR",
      value: (params.amountCents / 100).toFixed(2),
    };
  }
  if (params.description) body.description = params.description;

  try {
    const res = await fetch(
      `${MOLLIE_BASE}/payments/${params.paymentId}/refunds`,
      {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      return {
        success: false,
        error: detail.detail || `Mollie returned ${res.status}`,
        code: res.status === 404 ? "MOLLIE_NOT_FOUND" : "MOLLIE_ERROR",
      };
    }

    const data = await res.json();
    return {
      success: true,
      data: {
        refundId: data.id,
        status: data.status ?? "queued",
        amountCents: Math.round(parseFloat(data.amount?.value ?? "0") * 100),
      },
    };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message,
      code: "MOLLIE_NETWORK_ERROR",
    };
  }
}

/** Convert a plan period into Mollie's `interval` string. Lifetime → not supported. */
export function periodToMollieInterval(
  period: "monthly" | "quarterly" | "yearly" | "lifetime",
): string | null {
  switch (period) {
    case "monthly":
      return "1 month";
    case "quarterly":
      return "3 months";
    case "yearly":
      return "12 months";
    case "lifetime":
      return null;
  }
}

/** Map Mollie payment status → our internal order status. */
export function mapMollieStatus(
  mollieStatus: string,
): "pending" | "paid" | "failed" | "canceled" | "refunded" {
  const s = mollieStatus as MollieStatus;
  switch (s) {
    case "paid":
    case "authorized":
      return "paid";
    case "failed":
    case "expired":
      return "failed";
    case "canceled":
      return "canceled";
    default:
      return "pending";
  }
}

/** Format amount for display (€12,00 NL style). */
export function formatMollieAmount(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

/** Ping Mollie to check the API key is alive — used in admin/settings. */
export async function pingMollie(): Promise<ServiceResult<{ liveMode: boolean; methods: string[] }>> {
  const auth = authHeader();
  if (!auth) {
    return {
      success: false,
      error: "Mollie API key ontbreekt",
      code: "MOLLIE_NOT_CONFIGURED",
    };
  }
  try {
    const res = await fetch(`${MOLLIE_BASE}/methods`, { headers: auth });
    if (!res.ok) {
      return { success: false, error: `Mollie returned ${res.status}`, code: "MOLLIE_ERROR" };
    }
    const data = await res.json();
    const methods: string[] = (data._embedded?.methods ?? []).map(
      (m: { id: string }) => m.id,
    );
    const key = process.env.MOLLIE_API_KEY ?? "";
    return {
      success: true,
      data: { liveMode: key.startsWith("live_"), methods },
    };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message,
      code: "MOLLIE_NETWORK_ERROR",
    };
  }
}
