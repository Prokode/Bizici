export type ShopCurrency = {
  code: string;
  name: string;
  symbol: string;
};

export function formatShopPrice(
  minorAmount: number,
  currency: ShopCurrency | null | undefined,
  locale: string,
): string {
  const code = currency?.code || "USD";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(minorAmount / 100);
  } catch {
    const symbol = currency?.symbol || "$";
    return `${symbol}${(minorAmount / 100).toFixed(2)} ${code}`;
  }
}