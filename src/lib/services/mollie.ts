// Dicteren.ai — Mollie Payment Service
// Shared mechanics: payment creation, webhook verification, status mapping
// Domain logic (order creation, license generation after payment) stays in actions
// TODO: Activate when Christian provides Mollie API keys

import type { ServiceResult } from "@/lib/types";

interface CreatePaymentParams {
  amount: number;
  currency?: string;
  description: string;
  redirectUrl: string;
  webhookUrl: string;
  metadata?: Record<string, string>;
}

interface PaymentResult {
  paymentId: string;
  checkoutUrl: string;
  status: string;
}

/**
 * Create a Mollie payment
 * TODO: Implement when Mollie credentials are available
 */
export async function createPayment(
  params: CreatePaymentParams,
): Promise<ServiceResult<PaymentResult>> {
  const apiKey = process.env.MOLLIE_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: "Mollie is nog niet geconfigureerd",
      code: "MOLLIE_NOT_CONFIGURED",
    };
  }

  // TODO: Call Mollie API
  // const response = await fetch("https://api.mollie.com/v2/payments", { ... })
  return {
    success: false,
    error: "Mollie integratie wordt nog gebouwd",
    code: "NOT_IMPLEMENTED",
  };
}

/**
 * Verify a Mollie webhook by fetching payment status from Mollie API
 * Never trust webhook body alone — always verify with Mollie
 */
export async function verifyWebhookPayment(
  paymentId: string,
): Promise<ServiceResult<{ status: string; amount: number; method: string | null }>> {
  const apiKey = process.env.MOLLIE_API_KEY;
  if (!apiKey) {
    return { success: false, error: "Mollie niet geconfigureerd", code: "MOLLIE_NOT_CONFIGURED" };
  }

  // TODO: Fetch payment from Mollie API
  // const response = await fetch(`https://api.mollie.com/v2/payments/${paymentId}`, { ... })
  return {
    success: false,
    error: "Mollie integratie wordt nog gebouwd",
    code: "NOT_IMPLEMENTED",
  };
}

/**
 * Format amount for Mollie (expects string like "12.00")
 */
export function formatMollieAmount(euroCents: number): string {
  return (euroCents / 100).toFixed(2);
}

/**
 * Map Mollie payment status to our order status
 */
export function mapMollieStatus(mollieStatus: string): "pending" | "paid" | "failed" | "canceled" | "refunded" {
  switch (mollieStatus) {
    case "paid":
      return "paid";
    case "failed":
    case "expired":
      return "failed";
    case "canceled":
      return "canceled";
    case "refunded":
      return "refunded";
    default:
      return "pending";
  }
}
