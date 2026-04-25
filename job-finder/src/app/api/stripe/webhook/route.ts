import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServiceSupabase } from "@/lib/supabase/service";

export const runtime = "nodejs";

/** Stripe webhook scaffold. Activate by setting STRIPE_WEBHOOK_SECRET + STRIPE_SECRET_KEY. */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!secret || !apiKey) return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });

  const stripe = new Stripe(apiKey);
  const sig = req.headers.get("stripe-signature") ?? "";
  const raw = await req.text();

  let event: Stripe.Event;
  try { event = stripe.webhooks.constructEvent(raw, sig, secret); }
  catch (err) { return NextResponse.json({ error: `bad_sig:${(err as Error).message}` }, { status: 400 }); }

  const sb = getServiceSupabase();

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = (sub.metadata as Record<string, string>)?.user_id;
      if (userId) {
        const plan = sub.status === "active" || sub.status === "trialing" ? "pro" : "free";
        await sb.from("subscriptions").upsert({
          user_id: userId,
          plan,
          stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
          stripe_subscription_id: sub.id,
          status: sub.status,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        });
        await sb.from("profiles").update({ plan_tier: plan }).eq("id", userId);
      }
      break;
    }
  }
  return NextResponse.json({ received: true });
}
