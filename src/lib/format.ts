const numberFormat = new Intl.NumberFormat("fr-FR");

/** 142600 devient « 142 600 ». */
export function formatNumber(value: number): string {
  return numberFormat.format(value);
}
