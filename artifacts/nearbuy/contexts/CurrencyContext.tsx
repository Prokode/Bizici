import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { getGetPublicExchangeRatesQueryOptions } from "@workspace/api-client-react";
import { useTranslation } from "react-i18next";
import { convertPrice, formatCurrencyAmount, type ShopCurrency } from "@/lib/currency";

const STORAGE_KEY = "nearbuy_customer_display_currency";
const CurrencyContext = createContext<{
  currency: string;
  setCurrency: (code: string) => Promise<void>;
  formatPrice: (minorAmount: number, source?: ShopCurrency | null) => string;
  availableCurrencies: string[];
  updatedAt?: string;
  ratesUnavailable: boolean;
} | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrent] = useState("seller");
  const selected = useRef(false);
  const { t, i18n } = useTranslation();
  const rates = useQuery({
    ...getGetPublicExchangeRatesQueryOptions(),
    staleTime: 60 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
    retry: 1,
  });
  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (!selected.current && value && (value === "seller" || /^[A-Z]{3}$/.test(value))) setCurrent(value);
    }).catch(() => { /* Initial value remains the seller currency, never an assumed currency. */ });
  }, []);
  const setCurrency = async (code: string) => {
    if (code !== "seller" && !/^[A-Z]{3}$/.test(code)) throw new Error("Invalid currency");
    // Persist before updating the UI so failed storage is never reported as saved.
    selected.current = true;
    await AsyncStorage.setItem(STORAGE_KEY, code);
    setCurrent(code);
  };
  const fresh = rates.data && Date.now() - Date.parse(rates.data.updatedAt) <= 48 * 60 * 60 * 1000;
  const formatPrice = (minorAmount: number, source?: ShopCurrency | null) => {
    if (!Number.isFinite(minorAmount)) return "—";
    const code = source?.code;
    if (!code) return `${(minorAmount / 100).toFixed(2)} (${t("currency.unspecified")})`;
    const original = formatCurrencyAmount(minorAmount / 100, code, i18n.language);
    if (currency === "seller" || currency === code) return original;
    const converted = convertPrice(minorAmount, code, currency, fresh ? rates.data : undefined);
    return converted == null
      ? `${original} (${t("currency.unavailableShort")})`
      : `≈ ${formatCurrencyAmount(converted, currency, i18n.language)}`;
  };
  return (
    <CurrencyContext.Provider value={{
      currency, setCurrency, formatPrice,
      availableCurrencies: fresh ? Object.keys(rates.data!.rates).sort() : [],
      updatedAt: fresh ? rates.data?.updatedAt : undefined,
      ratesUnavailable: !fresh,
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error("CurrencyProvider is missing");
  return context;
}
