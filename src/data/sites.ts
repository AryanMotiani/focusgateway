import sitesDataRaw from './sites.json';

export interface SiteBundle {
  key: string;
  display_name: string;
  category: string;
  domains: string[];
}

export interface SitesData {
  version: string;
  updated_at: string;
  bundles: SiteBundle[];
}

export const sitesData: SitesData = sitesDataRaw as SitesData;

const DOMAIN_REGEX = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

export function getAllBundles(): SiteBundle[] {
  return sitesData.bundles;
}

export function getBundleByKey(key: string): SiteBundle | null {
  return sitesData.bundles.find(b => b.key === key) || null;
}

export function isValidCustomDomain(domain: string): boolean {
  if (typeof domain !== 'string') return false;
  const clean = domain.trim().toLowerCase();
  return DOMAIN_REGEX.test(clean);
}

export interface SiteSelection {
  bundle_key?: string;
  custom_domain?: string;
}

export function resolveDomains(siteSelections: SiteSelection[] = []): string[] {
  const domainSet = new Set<string>();

  for (const item of siteSelections) {
    if (item.bundle_key) {
      const bundle = getBundleByKey(item.bundle_key);
      if (bundle) {
        bundle.domains.forEach(d => domainSet.add(d.toLowerCase()));
      }
    } else if (item.custom_domain && isValidCustomDomain(item.custom_domain)) {
      const clean = item.custom_domain.trim().toLowerCase();
      domainSet.add(clean);
      if (!clean.startsWith('www.')) {
        domainSet.add(`www.${clean}`);
      }
    }
  }

  return Array.from(domainSet);
}
