export type LicensePolicyInput = {
  type: "PUBLIC_DOMAIN"|"CC0"|"CC_BY"|"CC_BY_SA"|"GOVERNMENT_OPEN_DATA"|"CUSTOM_ALLOWED"|"UNKNOWN"|"RESTRICTED";
  publicationAllowed: boolean;
  requiresAttribution: boolean;
  attributionText?: string | null;
};

export function evaluatePublicationLicense(input: LicensePolicyInput) {
  if (["UNKNOWN", "RESTRICTED"].includes(input.type)) return { allowed: false, reason: `LICENSE_${input.type}` };
  if (!input.publicationAllowed) return { allowed: false, reason: "LICENSE_PUBLICATION_NOT_ALLOWED" };
  if (input.requiresAttribution && !input.attributionText?.trim()) return { allowed: false, reason: "ATTRIBUTION_REQUIRED" };
  return { allowed: true, reason: null };
}
