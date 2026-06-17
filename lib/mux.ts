/**
 * Mux dashboard utilities
 */

/**
 * Get the Mux dashboard URL for a specific asset.
 * Requires MUX_ORG_ID and MUX_ENV_ID environment variables to be set.
 * @param assetId - The Mux asset ID
 * @returns The full dashboard URL, or null if env vars are not configured
 */
export function getMuxDashboardUrl(assetId: string): string | null {
  const orgId = process.env.MUX_ORG_ID;
  const envId = process.env.MUX_ENV_ID;

  if (!orgId || !envId) {
    return null;
  }

  return `https://dashboard.mux.com/organizations/${orgId}/environments/${envId}/video/assets/${assetId}`;
}
