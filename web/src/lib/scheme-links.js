const approvedSchemeHosts = new Set([
  "kaushalya.karnataka.gov.in",
  "kmdc.karnataka.gov.in",
  "kodagu.nic.in",
  "kswdc.karnataka.gov.in",
  "mandya.nic.in",
  "scholarships.gov.in",
  "socialjustice.gov.in",
  "www.myscheme.gov.in",
]);

function approvedSchemeUrl(value) {
  if (typeof value !== "string") return null;

  try {
    const url = new URL(value);
    if (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      approvedSchemeHosts.has(url.hostname)
    ) {
      return url.href;
    }
  } catch {
    return null;
  }

  return null;
}

export function withApprovedSchemeLinks(scheme) {
  return {
    ...scheme,
    source_url: approvedSchemeUrl(scheme.source_url),
    application_url: approvedSchemeUrl(scheme.application_url),
  };
}
