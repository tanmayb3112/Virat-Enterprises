import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { sendLoginCode } from "@/lib/notify";

// Login codes, generated and delivered by us instead of by Supabase.
//
// Why this route exists: Supabase's built-in mailer (Authentication → SMTP) is
// a single point of failure. When it is misconfigured, signInWithOtp fails with
// an opaque HTTP 500 and nobody can sign in at all. Here the same 6-digit code
// is minted server-side with the service-role key (generateLink sends nothing
// on its own) and delivered through Resend, which the site already uses for
// order notifications. The browser still calls supabase.auth.verifyOtp, so
// sessions, roles and RLS are unchanged.
//
// When either half is missing (no service-role key, or no Resend key) the
// route replies { fallback: true } and the login page falls back to Supabase's
// own mailer. Failures name the stage they happened at, which separates the two
// causes of that 500: a broken auth→profiles trigger (stage "create_user")
// versus a broken mailer (stage "send_email").

export const dynamic = "force-dynamic";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

// Config visibility for debugging a live deploy — booleans only, no secrets.
export async function GET() {
  const serviceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = !!process.env.RESEND_API_KEY;
  return NextResponse.json({
    ok: true,
    supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey,
    resendKey,
    resendFrom: process.env.RESEND_FROM ?? "(default: onboarding@resend.dev)",
    // False means logins still go through Supabase's SMTP settings.
    sendsOwnLoginCodes: serviceRoleKey && resendKey,
  });
}

export async function POST(req: NextRequest) {
  let email = "";
  try {
    const body = await req.json();
    email = String(body?.email ?? "").trim().toLowerCase();
  } catch {
    // falls into the validation error below
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { ok: false, stage: "input", error: "Enter a valid email address." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ ok: false, fallback: true, reason: "no_service_role_key" });
  }

  // Note the Resend key is NOT required to get this far: with only the
  // service-role key we can still run the Supabase half below and report
  // whether the auth database path is healthy, which is the diagnosis that
  // matters. Delivery is checked at step 3.

  // 1. Ensure the auth user exists (passwordless, email pre-confirmed). This is
  //    also where a broken on_auth_user_created trigger surfaces as a real
  //    message instead of a bare 500.
  const created = await supabase.auth.admin.createUser({ email, email_confirm: true });
  if (created.error) {
    const msg = created.error.message ?? "";
    const alreadyThere =
      created.error.status === 422 || /already (been )?registered|already exists/i.test(msg);
    if (!alreadyThere) {
      return NextResponse.json(
        {
          ok: false,
          stage: "create_user",
          error:
            msg ||
            "Supabase could not create the login user — check the on_auth_user_created trigger.",
        },
        { status: 500 }
      );
    }
  }

  // 2. Mint the 6-digit code. generateLink does not send any email itself.
  const link = await supabase.auth.admin.generateLink({ type: "magiclink", email });
  const code = link.data?.properties?.email_otp;
  if (link.error || !code) {
    return NextResponse.json(
      {
        ok: false,
        stage: "generate_code",
        error: link.error?.message || "Supabase did not return a login code.",
      },
      { status: 500 }
    );
  }

  // 3. Deliver it ourselves — or hand back to Supabase's mailer if we can't.
  //    Reaching here proves the auth database path is healthy, so a 500 from
  //    the fallback is the mailer's fault and nothing else.
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({
      ok: false,
      fallback: true,
      reason: "no_resend_key",
      authDbOk: true,
    });
  }

  const sent = await sendLoginCode({ to: email, code });
  if (!sent.sent) {
    return NextResponse.json(
      { ok: false, stage: "send_email", error: `Email delivery failed (${sent.reason}).` },
      { status: 502 }
    );
  }

  // digits: the project's Email OTP Length setting is configurable (6–10), so
  // tell the client how long the code it should expect is rather than assuming.
  return NextResponse.json({ ok: true, via: "resend", digits: code.length });
}
