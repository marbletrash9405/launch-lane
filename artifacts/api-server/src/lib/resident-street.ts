export function deriveResidentStreetName(homeAddress: string) {
  const firstAddressLine = homeAddress.split(",")[0]?.trim() ?? "";
  const withoutUnit = firstAddressLine.replace(
    /\s+(?:apt(?:artment)?|unit|suite|ste|#)\s*[\w-]+\s*$/i,
    "",
  );
  const streetName = withoutUnit
    .replace(/^\d+[a-z]?(?:\s*-\s*\d+[a-z]?)?\s+/i, "")
    .trim();

  if (!streetName || /\d/.test(streetName)) return null;
  return streetName.slice(0, 120);
}
