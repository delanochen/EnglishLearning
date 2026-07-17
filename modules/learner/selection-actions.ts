"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { requireProfileAccess } from "@/modules/learner/access";
import { ACTIVE_PROFILE_COOKIE } from "@/modules/learner/selection";

export async function selectLearnerProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user.id) redirect("/login");
  const profileId = z.string().uuid().parse(formData.get("profileId"));
  await requireProfileAccess(session.user.id, profileId);
  (await cookies()).set(ACTIVE_PROFILE_COOKIE, profileId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  });
  redirect("/dashboard");
}
