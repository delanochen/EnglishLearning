import { cookies } from "next/headers";

export const ACTIVE_PROFILE_COOKIE = "homelingua_active_profile";

export async function getActiveProfile<T extends { id: string }>(profiles: T[]) {
  try {
    const selectedId = (await cookies()).get(ACTIVE_PROFILE_COOKIE)?.value;
    return profiles.find((profile) => profile.id === selectedId) ?? profiles[0];
  } catch {
    return profiles[0];
  }
}
