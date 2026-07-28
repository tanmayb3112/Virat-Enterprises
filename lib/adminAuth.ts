import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

// Staff authorisation for the /api/admin/* routes.
//
// Same source of truth as /api/me: the caller proves who they are with their
// Supabase access token, and the allowed_staff_emails allowlist (admin-managed
// on /admin/settings) decides whether they are staff. Reads and writes then go
// through the service-role client, so the dashboard never depends on RLS being
// perfectly in step with the allowlist.

export type StaffRole = "admin" | "staff";

export interface StaffIdentity {
  email: string;
  role: StaffRole;
  // Empty = not pinned to any branch, i.e. sees every branch.
  branchIds: string[];
}

// Derived from the factory, not from createClient itself: ReturnType on a
// generic function instantiates its type params from their constraints rather
// than their defaults, which collapses every row type to never.
type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

export interface StaffContext {
  supabase: AdminClient;
  staff: StaffIdentity;
}

// Returns null when the caller is not signed-in staff, or Supabase is not
// configured at all. Callers must reject on null.
export async function requireStaff(req: NextRequest): Promise<StaffContext | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const auth = req.headers.get("authorization") ?? "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!jwt) return null;

  try {
    const { data, error } = await supabase.auth.getUser(jwt);
    const email = data?.user?.email?.toLowerCase();
    if (error || !email) return null;

    const { data: row } = await supabase
      .from("allowed_staff_emails")
      .select("role, branch_ids")
      .eq("email", email)
      .maybeSingle();

    const role = row?.role;
    if (role !== "admin" && role !== "staff") return null;

    return {
      supabase,
      staff: { email, role, branchIds: (row?.branch_ids as string[] | null) ?? [] },
    };
  } catch {
    return null;
  }
}

// Whether this staff member may touch an order belonging to the given branch.
// Admins and unpinned staff may touch any; pinned staff only their own.
export function canReachBranch(staff: StaffIdentity, branchId: string | null): boolean {
  if (staff.role === "admin" || staff.branchIds.length === 0) return true;
  return !!branchId && staff.branchIds.includes(branchId);
}
