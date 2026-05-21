// Dicteren.ai — Mollie Webhook Action
// Orchestrates: verify payment with Mollie, update order, generate license
// Calls services for reusable mechanics (verify, map status, generate code, send email)

import { NextResponse } from "next/server";
import {
  verifyWebhookPayment,
  mapMollieStatus,
  generateLicenseCode,
  hashLicenseCode,
  sendLicenseEmail,
  logEvent,
  trackEvent,
} from "@/lib/services";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const paymentId = formData.get("id") as string;

    if (!paymentId) {
      return NextResponse.json({ error: "Missing payment ID" }, { status: 400 });
    }

    // 1. Verify payment with Mollie API (service: reusable mechanics)
    //    Never trust webhook body alone
    const paymentResult = await verifyWebhookPayment(paymentId);
    if (!paymentResult.success) {
      return NextResponse.json({ error: paymentResult.error }, { status: 500 });
    }

    // 2. Map Mollie status to our status (service: reusable mechanics)
    const orderStatus = mapMollieStatus(paymentResult.data.status);

    // 3. Update order in database (domain logic — stays here)
    // TODO: Update order status, payment record

    // 4. If paid: generate license (domain rule — stays here)
    if (orderStatus === "paid") {
      // Generate code (service) + create license record (domain)
      // const code = generateLicenseCode("consumer");
      // const hash = hashLicenseCode(code);
      // TODO: Insert license into database

      // Send license email (service)
      // await sendLicenseEmail({ to: order.email, licenseCode: code, expiresAt: null });

      // Log events (service)
      // await logEvent({ action: "order.paid", entityType: "order", entityId: orderId });
      // await trackEvent("payment_completed", { method: paymentResult.data.method });
    }

    // 5. If failed/canceled/refunded: handle accordingly (domain rule)
    if (orderStatus === "failed" || orderStatus === "canceled") {
      // await logEvent({ action: "order.failed", entityType: "order", entityId: orderId });
    }

    if (orderStatus === "refunded") {
      // Revoke associated license (domain rule)
      // await logEvent({ action: "order.refunded", entityType: "order", entityId: orderId });
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Webhook verwerking mislukt" }, { status: 500 });
  }
}
