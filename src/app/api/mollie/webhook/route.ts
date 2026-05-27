// Dicteren.ai — Mollie Webhook
//
// Action layer:
//  1. Mollie POSTs { id: "tr_xxx" } (form / json / query — all accepted).
//  2. We GET /v2/payments/{id} for authoritative status (never trust body).
//  3. Route by payment kind:
//       - first / one-off paid    → fulfillPaidOrder → optional subscription
//       - recurring paid          → renewSubscriptionLicense
//       - recurring failed        → markSubscriptionPastDue (14-day grace)
//       - one-off failed/canceled → markOrderStatus
//       - refunded                → markOrderStatus + lock license
//
// All paths are idempotent: fulfillPaidOrder uses status-guarded UPDATE,
// renew checks payments-unique, recordSubscription has unique index on
// mollieSubscriptionId.

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { discountCodes, licenses, plans } from "@/lib/db/schema";
import {
  createMollieSubscription,
  mapMollieStatus,
  periodToMollieInterval,
  verifyWebhookPayment,
} from "@/lib/services/mollie";
import {
  fulfillPaidOrder,
  isRecurringPlan,
  markOrderStatus,
  markSubscriptionPastDue,
  recordLicenseDiscount,
  recordSubscription,
  renewSubscriptionLicense,
} from "@/lib/services/order";
import { activatePendingExpansionSeats } from "@/lib/services/orderUpgrade";
import { getTierForSeats } from "@/lib/services/pricingTiers";
import type { DiscountSnapshot, LicenseSource } from "@/lib/services/mollie-metadata";
import { logEvent, trackEvent } from "@/lib/services/audit";
import {
  sendLicenseEmail,
  sendPastDueEmail,
  sendRefundEmail,
  sendRenewalEmail,
} from "@/lib/services/email";
import { sendB2BWelcomeWithCodesEmail } from "@/lib/services/orgEmail";
import {
  findCrmOrgByPaymentLinkOrderId,
  logCrmEvent,
  upsertCrmOrgFromAuthOrganization,
} from "@/lib/services/crmDeals";
import { crmOrganizations } from "@/lib/db/schema/crmDeals";
import {
  attributeUserToAffiliate,
  getAffiliateById,
  getReferralForUser,
  markReferralConverted,
  recordCommission,
  recordCommissionV2,
  voidCommissionsForOrder,
  customerTypeFromOrderPlan,
} from "@/lib/services/affiliate";
import { incrementDiscountRedemption } from "@/lib/services/discount";
import {
  getContactByLicenseId,
  getContactByMolliePaymentId,
  getUserIdByMollieCustomerId,
} from "@/lib/services/identity";

import { appBase, webhookUrlFor } from "@/lib/url";

async function extractPaymentId(request: Request): Promise<string | null> {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("id");
  if (fromQuery) return fromQuery;

  const contentType = request.headers.get("content-type") ?? "";

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    try {
      const form = await request.formData();
      const id = form.get("id");
      if (typeof id === "string" && id.length > 0) return id;
    } catch {
      // fall through
    }
  }

  try {
    const cloned = request.clone();
    const text = await cloned.text();
    if (!text) return null;
    if (text.startsWith("{")) {
      const json = JSON.parse(text);
      if (typeof json?.id === "string") return json.id;
    }
    const params = new URLSearchParams(text);
    const id = params.get("id");
    if (id) return id;
  } catch {
    return null;
  }

  return null;
}

export async function POST(request: Request) {
  const paymentId = await extractPaymentId(request);
  if (!paymentId) {
    return NextResponse.json({ error: "Missing payment id" }, { status: 400 });
  }

  const payment = await verifyWebhookPayment(paymentId);
  if (!payment.success) {
    if (payment.code === "MOLLIE_NOT_FOUND") {
      return NextResponse.json({ error: payment.error }, { status: 404 });
    }
    return NextResponse.json({ error: payment.error }, { status: 500 });
  }

  const orderStatus = mapMollieStatus(payment.data.status);
  const metadata = payment.data.metadata as
    | {
        orderId?: string;
        internalRef?: string;
        userId?: string;
        email?: string;
        name?: string;
        source?: LicenseSource;
        discountType?: string;
        discountValue?: number;
        kind?: string;
        organizationId?: string;
        deltaSeats?: number;
        targetSeats?: number;
      }
    | null;

  // ───────── Self-service seat-expansion pro-rata charge ─────────
  // Payment komt los van een order (geen orderId). Activeer pending_payment
  // seats voor de org wanneer paid bevestigd is.
  if (metadata?.kind === "seat_expansion" && metadata.organizationId) {
    if (orderStatus === "paid") {
      const result = await activatePendingExpansionSeats({
        orgId: metadata.organizationId,
        paymentId: payment.data.paymentId,
      });
      await trackEvent("payment_completed", {
        method: payment.data.method,
        amountCents: payment.data.amount,
      });
      return NextResponse.json({
        received: true,
        kind: "seat_expansion",
        activatedSeats: result.activated,
      });
    }
    if (orderStatus === "failed" || orderStatus === "canceled") {
      await logEvent({
        action: "organization.subscription_failed",
        entityType: "organization",
        entityId: metadata.organizationId,
        metadata: {
          paymentId: payment.data.paymentId,
          reason: "prorata_charge_failed",
          mollieStatus: payment.data.status,
        },
      });
      return NextResponse.json({
        received: true,
        kind: "seat_expansion",
        status: orderStatus,
      });
    }
    return NextResponse.json({ received: true, kind: "seat_expansion_pending" });
  }

  // Snapshot van source + discount uit metadata (we kopieren naar licenses-row
  // bij issue zodat CRM/admin niet hoeft te queriën aan Mollie API).
  const sourceFromMeta: LicenseSource =
    (metadata?.source as LicenseSource | undefined) ?? "self-signup";
  const discountFromMeta: DiscountSnapshot =
    metadata?.discountType && typeof metadata.discountValue === "number"
      ? ({
          type: metadata.discountType,
          value: metadata.discountValue,
        } as DiscountSnapshot)
      : null;

  // ───────── Recurring charge from an existing subscription ─────────
  if (payment.data.subscriptionId) {
    if (orderStatus === "paid") {
      const renewed = await renewSubscriptionLicense({
        mollieSubscriptionId: payment.data.subscriptionId,
        molliePaymentId: payment.data.paymentId,
        paidAmountCents: payment.data.amount,
        rawWebhookPayload: payment.data,
      });
      if (renewed) {
        await logEvent({
          action: "license.extended",
          entityType: "license",
          entityId: renewed.licenseId,
          metadata: {
            paymentId: payment.data.paymentId,
            subscriptionId: payment.data.subscriptionId,
            newExpiresAt: renewed.newExpiresAt.toISOString(),
          },
        });
        await trackEvent("subscription_renewed", {
          amountCents: payment.data.amount,
        });

        // ───── Renewal-commission (V2 rule-based + lockup) ─────
        // Boek commissie voor de affiliate van deze user — alleen als nog
        // binnen `*_commission_duration_months`. Onfflict-key is
        // (orderId, sequenceNumber), webhook-retries no-op.
        try {
          const [lic] = await db
            .select({
              userId: licenses.userId,
              orderId: licenses.orderId,
              planCustomerType: plans.customerType,
              seats: licenses.seats,
            })
            .from(licenses)
            .leftJoin(plans, eq(plans.id, licenses.planId))
            .where(eq(licenses.id, renewed.licenseId))
            .limit(1);
          if (lic?.userId && lic.orderId && lic.planCustomerType) {
            const ref = await getReferralForUser(lic.userId);
            if (ref) {
              const aff = await getAffiliateById(ref.affiliateId);
              if (aff && aff.status === "active") {
                const customerType = customerTypeFromOrderPlan(
                  lic.planCustomerType as "consumer" | "organization",
                );
                const renewalCommission = await recordCommissionV2({
                  affiliate: aff,
                  referral: ref,
                  orderId: lic.orderId,
                  licenseId: renewed.licenseId,
                  paymentId: null,
                  basisAmountCents: payment.data.amount,
                  seats: lic.seats,
                  customerType,
                  isRenewal: true,
                  paidAt: new Date(),
                });
                if (renewalCommission) {
                  await logEvent({
                    action: "affiliate.commission_recorded",
                    entityType: "affiliate",
                    entityId: aff.id,
                    metadata: {
                      orderId: lic.orderId,
                      licenseId: renewed.licenseId,
                      amountCents: renewalCommission.amountCents,
                      basisAmountCents: payment.data.amount,
                      seats: lic.seats,
                      customerType,
                      isRenewal: true,
                      sequenceNumber: renewalCommission.sequenceNumber,
                    },
                  });
                }
              }
            }
          }
        } catch (err) {
          console.warn("[webhook] renewal-commission failed", err);
        }

        const contact = await getContactByLicenseId(renewed.licenseId);
        if (contact) {
          const mail = await sendRenewalEmail({
            to: contact.email,
            name: contact.name,
            amountCents: payment.data.amount,
            currency: payment.data.currency,
            newExpiresAt: renewed.newExpiresAt,
            subscriptionId: payment.data.subscriptionId,
            paymentId: payment.data.paymentId,
            licenseId: renewed.licenseId,
            userId: contact.userId ?? undefined,
          });
          if (!mail.success) {
            console.warn("[webhook] renewal email failed", mail.error, mail.code);
          }
        }
      }
      return NextResponse.json({
        received: true,
        kind: "subscription_renewed",
        idempotent: !renewed,
      });
    }

    if (orderStatus === "failed" || orderStatus === "canceled") {
      const past = await markSubscriptionPastDue({
        mollieSubscriptionId: payment.data.subscriptionId,
      });
      if (past) {
        await logEvent({
          action: "license.expired",
          entityType: "license",
          entityId: past.licenseId,
          metadata: {
            paymentId: payment.data.paymentId,
            subscriptionId: payment.data.subscriptionId,
            graceUntil: past.graceUntil.toISOString(),
            reason: orderStatus,
          },
        });

        const contact = await getContactByLicenseId(past.licenseId);
        if (contact) {
          const mail = await sendPastDueEmail({
            to: contact.email,
            name: contact.name,
            graceUntil: past.graceUntil,
            subscriptionId: payment.data.subscriptionId,
            licenseId: past.licenseId,
            userId: contact.userId ?? undefined,
          });
          if (!mail.success) {
            console.warn("[webhook] past_due email failed", mail.error, mail.code);
          }
        }
      }
      return NextResponse.json({
        received: true,
        kind: "subscription_past_due",
        graceUntil: past?.graceUntil.toISOString() ?? null,
      });
    }

    if (orderStatus === "refunded") {
      // A refund on a recurring charge: lock immediately via order route.
      await markOrderStatus(payment.data.paymentId, "refunded");
      const contact = await getContactByMolliePaymentId(payment.data.paymentId);
      if (contact?.orderId) {
        const voided = await voidCommissionsForOrder({
          orderId: contact.orderId,
          reason: "refund",
        });
        if (voided.voidedCount > 0) {
          await logEvent({
            action: "affiliate.commission_status_changed",
            entityType: "order",
            entityId: contact.orderId,
            metadata: {
              reason: "refund",
              voidedCount: voided.voidedCount,
            },
          });
        }
      }
      if (contact) {
        const mail = await sendRefundEmail({
          to: contact.email,
          name: contact.name,
          amountCents: payment.data.amount,
          currency: payment.data.currency,
          orderId: contact.orderId,
          userId: contact.userId ?? undefined,
        });
        if (!mail.success) {
          console.warn("[webhook] refund email failed", mail.error, mail.code);
        }
      }
      return NextResponse.json({ received: true, kind: "subscription_refunded" });
    }

    return NextResponse.json({ received: true, kind: "subscription_other" });
  }

  // ───────── First payment or one-off ─────────
  const orderId = metadata?.orderId ?? null;

  if (orderStatus === "paid") {
    const fulfilled = await fulfillPaidOrder({
      molliePaymentId: payment.data.paymentId,
      paidAmountCents: payment.data.amount,
      rawWebhookPayload: payment.data,
    });

    if (fulfilled) {
      // Snapshot source + discount op de license-row (CRM-vriendelijk).
      await recordLicenseDiscount({
        licenseId: fulfilled.licenseId,
        source: sourceFromMeta,
        discount: discountFromMeta,
      });

      await logEvent({
        action: "order.paid",
        entityType: "order",
        entityId: fulfilled.orderId,
        metadata: {
          paymentId: payment.data.paymentId,
          method: payment.data.method,
          amountCents: payment.data.amount,
          source: sourceFromMeta,
          discountType: discountFromMeta?.type ?? null,
          discountValue: discountFromMeta?.value ?? null,
        },
      });
      await trackEvent("payment_completed", {
        method: payment.data.method,
        amountCents: payment.data.amount,
      });

      // ───── B2B detectie + welkomstmail ─────
      const isTeam = fulfilled.plan.customerType === "organization";
      const crmOrgIdFromMeta = (metadata as { crmOrgId?: string } | null)
        ?.crmOrgId;
      const userIdFromMeta = (metadata as { userId?: string } | null)?.userId;

      if (isTeam && fulfilled.organizationId && metadata?.email) {
        // Route 2: self-service B2B (organization is in checkout aangemaakt).
        // Owner krijgt ALLE codes in één mail. Plus crm_organizations upsert.
        const welcomeResult = await sendB2BWelcomeWithCodesEmail({
          to: metadata.email,
          ownerName: metadata.name,
          organizationName:
            (metadata as { organizationName?: string } | null)
              ?.organizationName ?? "je organisatie",
          licenseCodes: fulfilled.licenseCodes,
          ownerCode: fulfilled.licenseCode,
          expiresAt: fulfilled.expiresAt ?? null,
          organizationId: fulfilled.organizationId,
          userId: userIdFromMeta,
        });
        if (!welcomeResult.success) {
          console.warn(
            "[webhook] b2b welcome email failed",
            welcomeResult.error,
            welcomeResult.code,
          );
        }
        // Upsert crm_organizations zodat self-service deals óók in /admin/crm
        // verschijnen. Source = consumer_upgrade als de klant via /account
        // is geüpgraded, anders self_service.
        const isUpgrade =
          (metadata as { upgradeFromConsumer?: number | string } | null)
            ?.upgradeFromConsumer === 1 ||
          (metadata as { upgradeFromConsumer?: number | string } | null)
            ?.upgradeFromConsumer === "1";
        await upsertCrmOrgFromAuthOrganization({
          authOrganizationId: fulfilled.organizationId,
          name:
            (metadata as { organizationName?: string } | null)
              ?.organizationName ?? "Onbekend bedrijf",
          source: isUpgrade ? "consumer_upgrade" : "self_service",
          primaryContactUserId: userIdFromMeta,
          primaryContactName: metadata.name,
          primaryContactEmail: metadata.email,
          proposedSeats: fulfilled.seats,
          proposedAmountCents: payment.data.amount,
          proposedPlanSlug: fulfilled.plan.slug,
          paidAt: new Date(),
        });
      } else if (crmOrgIdFromMeta) {
        // Route 3: AM-initiated. Geen auth.organization aangemaakt (komt later
        // handmatig via admin). Mark crm_organizations als 'won' + paidAt.
        await db
          .update(crmOrganizations)
          .set({
            status: "won",
            paidAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(crmOrganizations.id, crmOrgIdFromMeta));
        await logCrmEvent({
          crmOrganizationId: crmOrgIdFromMeta,
          kind: "payment_received",
          payload: {
            orderId: fulfilled.orderId,
            paymentId: payment.data.paymentId,
            amountCents: payment.data.amount,
            note:
              "Betaling ontvangen. Maak handmatig auth.organization aan en koppel licenties.",
          },
        });
        // Ook welkomstmail naar de contact-email uit de metadata.
        const contactEmail = (metadata as { crmContactEmail?: string } | null)
          ?.crmContactEmail;
        const contactName = (metadata as { crmContactName?: string } | null)
          ?.crmContactName;
        if (contactEmail) {
          const welcomeResult = await sendB2BWelcomeWithCodesEmail({
            to: contactEmail,
            ownerName: contactName,
            organizationName:
              (metadata as { organizationName?: string } | null)
                ?.organizationName ?? "je organisatie",
            licenseCodes: fulfilled.licenseCodes,
            ownerCode: fulfilled.licenseCode,
            expiresAt: fulfilled.expiresAt ?? null,
            organizationId: crmOrgIdFromMeta,
          });
          if (!welcomeResult.success) {
            console.warn(
              "[webhook] am b2b welcome email failed",
              welcomeResult.error,
            );
          }
        }
      } else if (metadata?.email) {
        // Consumer-order: 1 mail met 1 code (bestaande gedrag).
        const emailResult = await sendLicenseEmail({
          to: metadata.email,
          name: metadata.name,
          licenseCode: fulfilled.licenseCode,
          expiresAt: fulfilled.expiresAt ?? null,
          orderId: fulfilled.orderId,
          licenseId: fulfilled.licenseId,
          userId: userIdFromMeta,
        });
        if (!emailResult.success) {
          console.warn(
            "[webhook] license email failed",
            emailResult.error,
            emailResult.code,
          );
        }
      }

      // ───── Discount-code attributie + redemption ─────
      // Klant heeft een discount-code gebruikt: increment redemption-count
      // (idempotent op orderId — een retried webhook fulfilled = null, dus
      // dit blok wordt alleen op de eerste call uitgevoerd) én als de code
      // aan een affiliate hangt: attribueer user via discount-code path.
      if (fulfilled.discountCodeId) {
        await incrementDiscountRedemption(fulfilled.discountCodeId);
        if (fulfilled.userId) {
          const [discountRow] = await db
            .select({
              code: discountCodes.code,
              affiliateId: discountCodes.affiliateId,
            })
            .from(discountCodes)
            .where(eq(discountCodes.id, fulfilled.discountCodeId))
            .limit(1);
          if (discountRow?.affiliateId) {
            const result = await attributeUserToAffiliate({
              affiliateId: discountRow.affiliateId,
              userId: fulfilled.userId,
              organizationId: fulfilled.organizationId,
              attributionSource: `discount:${discountRow.code}`,
            });
            if (result.created) {
              await logEvent({
                action: "affiliate.attributed",
                entityType: "affiliate",
                entityId: discountRow.affiliateId,
                actorId: fulfilled.userId,
                metadata: {
                  source: "discount-code",
                  discountCode: discountRow.code,
                  orderId: fulfilled.orderId,
                },
              });
            }
          }
        }
      }

      // ───── Affiliate commission (V2: rule-based + lockup) ─────
      // Lifetime attributie: als deze user via een affiliate kwam, krijgt die
      // commission op deze paid order. Idempotent op orderId (unique index).
      // Status begint 'pending' — cron unlock-commissions flipt na 30 dagen
      // naar 'payable' tenzij refund/cancel-in-lockup hem void heeft.
      if (fulfilled.userId) {
        const referral = await getReferralForUser(fulfilled.userId);
        if (referral) {
          const affiliate = await getAffiliateById(referral.affiliateId);
          if (affiliate && affiliate.status === "active") {
            const customerType = customerTypeFromOrderPlan(
              fulfilled.plan.customerType as "consumer" | "organization",
            );
            const commission = await recordCommissionV2({
              affiliate,
              referral,
              orderId: fulfilled.orderId,
              licenseId: fulfilled.licenseId,
              paymentId: fulfilled.paymentId,
              basisAmountCents: payment.data.amount,
              seats: fulfilled.seats,
              customerType,
              isRenewal: false,
              paidAt: new Date(),
            });
            await markReferralConverted({ userId: fulfilled.userId });
            if (commission) {
              await logEvent({
                action: "affiliate.commission_recorded",
                entityType: "affiliate",
                entityId: affiliate.id,
                metadata: {
                  orderId: fulfilled.orderId,
                  licenseId: fulfilled.licenseId,
                  amountCents: commission.amountCents,
                  basisAmountCents: payment.data.amount,
                  seats: fulfilled.seats,
                  customerType,
                  isRenewal: false,
                  unlocksAt: commission.unlocksAt?.toISOString() ?? null,
                  sequenceNumber: commission.sequenceNumber,
                },
              });
              await trackEvent("affiliate_commission_recorded", {
                affiliateCode: affiliate.code,
                amountCents: commission.amountCents,
              });
            }
          }
        }
      }

      // If this was a first-of-recurring payment AND the plan is recurring,
      // create the Mollie subscription so renewals happen automatically.
      const customerId = payment.data.customerId;
      const sequenceType = payment.data.sequenceType;
      if (
        customerId &&
        sequenceType === "first" &&
        isRecurringPlan(fulfilled.plan)
      ) {
        const interval = periodToMollieInterval(fulfilled.plan.period);
        if (interval) {
          const base = appBase();
          const subMetadata: Record<string, string | number | null> = {
            // Spiegel het standaard metadata-schema (zie mollie-metadata.ts).
            userId: metadata?.userId ?? null,
            segment: fulfilled.plan.customerType === "organization" ? "team" : "consumer",
            source: sourceFromMeta,
            licenseType: fulfilled.plan.customerType === "organization" ? "team" : "consumer",
            period: fulfilled.plan.period,
            internalRef: fulfilled.licenseId,
            licenseId: fulfilled.licenseId,
          };
          if (discountFromMeta) {
            subMetadata.discountType = discountFromMeta.type;
            subMetadata.discountValue = discountFromMeta.value;
          }
          // Tier-aware amount voor team: tier-discount × seats.
          // Consumer blijft plan.priceCents (komt al uit plans-tabel).
          const isTeam = fulfilled.plan.customerType === "organization";
          const tier = isTeam ? getTierForSeats(fulfilled.seats) : null;
          const subAmountCents = isTeam && tier
            ? tier.pricePerSeatCents * fulfilled.seats
            : fulfilled.plan.priceCents;

          if (isTeam && tier) {
            subMetadata.tier = tier.id;
            subMetadata.seats = fulfilled.seats;
          }

          const sub = await createMollieSubscription({
            customerId,
            amountCents: subAmountCents,
            currency: fulfilled.plan.currency,
            interval,
            description: `Dicteren.ai · ${fulfilled.plan.label} (auto-renew)`,
            webhookUrl: webhookUrlFor(base),
            startDate: fulfilled.expiresAt.toISOString().slice(0, 10),
            metadata: subMetadata,
          });
          if (sub.success) {
            await recordSubscription({
              mollieSubscriptionId: sub.data.subscriptionId,
              mollieCustomerId: customerId,
              userId: fulfilled.userId ?? (await getUserIdByMollieCustomerId(customerId)),
              organizationId: fulfilled.organizationId,
              licenseId: fulfilled.licenseId,
              planId: fulfilled.plan.id,
              intervalLabel: interval,
              amountCents: subAmountCents,
              currency: fulfilled.plan.currency,
              seats: fulfilled.seats,
              nextBillingAt: fulfilled.expiresAt,
            });
          } else {
            // Klant heeft betaald + license is uitgegeven, maar de auto-renew
            // subscription is NIET aangemaakt. Volgende incasso komt nooit en
            // dit zou stilletjes wegglijden zonder audit-log. Hier hangt geld
            // aan — admin moet dit kunnen oppakken via /admin/audit.
            await logEvent({
              action: "subscription.creation_failed",
              entityType: "license",
              entityId: fulfilled.licenseId,
              metadata: {
                reason: sub.error,
                code: sub.code,
                mollieCustomerId: customerId,
                mollieFirstPaymentId: payment.data.paymentId,
                planId: fulfilled.plan.id,
                planSlug: fulfilled.plan.slug,
                interval,
              },
            });
            await trackEvent("subscription_creation_failed", {
              planSlug: fulfilled.plan.slug,
              code: sub.code ?? null,
            });
            console.warn(
              "[webhook] subscription create failed",
              sub.error,
              sub.code,
            );
          }
        }
      }
    }

    return NextResponse.json({
      received: true,
      status: "paid",
      idempotent: !fulfilled,
    });
  }

  if (orderStatus === "failed" || orderStatus === "canceled") {
    await markOrderStatus(payment.data.paymentId, orderStatus);
    if (orderId) {
      await logEvent({
        action: "order.failed",
        entityType: "order",
        entityId: orderId,
        metadata: {
          paymentId: payment.data.paymentId,
          mollieStatus: payment.data.status,
        },
      });
    }
    return NextResponse.json({ received: true, status: orderStatus });
  }

  if (orderStatus === "refunded") {
    await markOrderStatus(payment.data.paymentId, "refunded");
    if (orderId) {
      await logEvent({
        action: "order.refunded",
        entityType: "order",
        entityId: orderId,
        metadata: { paymentId: payment.data.paymentId },
      });
      // Void affiliate-commissions die nog pending/payable zijn voor deze
      // order. Paid commissions blijven staan (admin moet handmatig terug-
      // vorderen — buiten scope automation).
      const voided = await voidCommissionsForOrder({
        orderId,
        reason: "refund",
      });
      if (voided.voidedCount > 0) {
        await logEvent({
          action: "affiliate.commission_status_changed",
          entityType: "order",
          entityId: orderId,
          metadata: {
            reason: "refund",
            voidedCount: voided.voidedCount,
          },
        });
      }
    }
    const contact = await getContactByMolliePaymentId(payment.data.paymentId);
    if (contact) {
      const mail = await sendRefundEmail({
        to: contact.email,
        name: contact.name,
        amountCents: payment.data.amount,
        currency: payment.data.currency,
        orderId: contact.orderId,
      });
      if (!mail.success) {
        console.warn("[webhook] refund email failed", mail.error, mail.code);
      }
    }
    return NextResponse.json({ received: true, status: "refunded" });
  }

  return NextResponse.json({ received: true, status: orderStatus });
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "mollie-webhook" });
}
