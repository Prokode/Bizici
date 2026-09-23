import { useMemo, useState } from "react";
import {
  Camera,
  Globe,
  Info,
  Map as MapIcon,
  MessageCircle,
  Navigation,
  Package,
  Scissors,
  Search,
  User,
  XCircle,
} from "lucide-react";
import "./_group.css";

type Filter = "all" | "products" | "services";

type Shop = {
  id: string;
  name: string;
  market?: string;
  kind: "products" | "services" | "hybrid";
  distance: string;
  count: number;
  open: boolean;
  products: { name: string; price: string; tone: string }[];
};

const shops: Shop[] = [
  {
    id: "maria",
    name: "Fruits & Légumes Maria",
    market: "Marché des Enfants Rouges",
    kind: "products",
    distance: "350 m",
    count: 28,
    open: true,
    products: [
      { name: "Fraises", price: "4,50 €", tone: "#ffe0df" },
      { name: "Avocats", price: "1,80 €", tone: "#e5f2ce" },
      { name: "Tomates", price: "3,20 €", tone: "#ffd9cf" },
      { name: "Citrons", price: "2,40 €", tone: "#fff2b8" },
    ],
  },
  {
    id: "atelier",
    name: "L'Atelier du Vélo",
    market: "Rue de Bretagne",
    kind: "hybrid",
    distance: "620 m",
    count: 14,
    open: true,
    products: [
      { name: "Antivol U", price: "29,90 €", tone: "#dce7f4" },
      { name: "Éclairage", price: "18,50 €", tone: "#ffedcf" },
      { name: "Casque", price: "45,00 €", tone: "#e6e1ed" },
    ],
  },
  {
    id: "camille",
    name: "Studio Camille",
    market: "Coiffure & soins",
    kind: "services",
    distance: "900 m",
    count: 6,
    open: false,
    products: [
      { name: "Coupe", price: "32,00 €", tone: "#f3e0ef" },
      { name: "Brushing", price: "25,00 €", tone: "#e2e8f0" },
    ],
  },
];

const filterLabels: Record<Filter, string> = {
  all: "Tous",
  products: "Produits",
  services: "Services",
};

function FilterIcon({ filter }: { filter: Filter }) {
  if (filter === "products") return <Package size={13} />;
  if (filter === "services") return <Scissors size={13} />;
  return <Globe size={13} />;
}

export function ConsumerCurrent() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const visibleShops = useMemo(
    () =>
      shops.filter((shop) => {
        const matchesFilter =
          filter === "all" ||
          (filter === "services"
            ? shop.kind === "services" || shop.kind === "hybrid"
            : shop.kind !== "services");
        const normalized = query.trim().toLocaleLowerCase("fr");
        return (
          matchesFilter &&
          (!normalized ||
            `${shop.name} ${shop.market ?? ""} ${shop.products.map((p) => p.name).join(" ")}`
              .toLocaleLowerCase("fr")
              .includes(normalized))
        );
      }),
    [filter, query],
  );

  return (
    <div className="bizici-current relative h-screen min-h-[720px] w-full overflow-hidden bg-white">
      <main className="absolute inset-x-0 bottom-[84px] top-0 overflow-y-auto px-4 pb-8 pt-[144px]">
        <div className="mb-3 flex items-center gap-2 rounded-[10px] border border-[#E2E8F0] bg-[#EEF2F7] px-3 py-[10px] text-xs leading-4 text-[#64748B]">
          <Info size={14} className="shrink-0" />
          <span>Carte interactive disponible sur mobile (Expo Go). Voici les boutiques proches.</span>
        </div>

        <div className="flex flex-col gap-3">
          {visibleShops.map((shop) => (
            <button
              key={shop.id}
              type="button"
              className="w-full rounded-[14px] border border-[#E2E8F0] bg-[#F7F9FC] p-[14px] text-left active:opacity-70"
            >
              <div className="flex items-start gap-[10px]">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-bold text-[#1B2A5C]">{shop.name}</div>
                  <div className="mt-0.5 truncate text-xs text-[#64748B]">{shop.market}</div>
                </div>
                <div
                  className="flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-bold"
                  style={{
                    background: shop.open ? "#10b98122" : "#EEF2F7",
                    color: shop.open ? "#047857" : "#64748B",
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: shop.open ? "#10b981" : "#64748B" }}
                  />
                  {shop.open ? "Ouvert" : "Fermé"}
                </div>
              </div>

              <div className="mt-[10px] flex flex-wrap items-center gap-[5px] text-xs text-[#64748B]">
                <Navigation size={12} />
                <span>{shop.distance}</span>
                <span className="mx-0.5">·</span>
                <Package size={12} />
                <span>{shop.count} {shop.kind === "services" ? "services" : "produits"}</span>
              </div>

              <div className="mt-[10px] flex flex-wrap gap-2">
                {shop.products.slice(0, 4).map((product) => (
                  <div key={product.name} className="w-20 rounded-lg border border-[#E2E8F0] p-1.5">
                    <div
                      className="flex aspect-square w-full items-center justify-center rounded-md"
                      style={{ backgroundColor: product.tone }}
                    >
                      <Package size={18} color="#64748B" />
                    </div>
                    <div className="mt-1 truncate text-[11px] font-semibold text-[#1B2A5C]">{product.name}</div>
                    <div className="mt-1 text-[11px] font-bold text-[#F58220]">{product.price}</div>
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>
      </main>

      <form
        className="absolute left-4 right-4 top-3 flex items-center gap-[10px] rounded-[14px] border border-[#E2E8F0] bg-white px-[14px] py-3 shadow-[0_4px_12px_rgba(27,42,92,0.12)]"
        onSubmit={(event) => event.preventDefault()}
      >
        <Search size={20} color="#64748B" />
        <input
          aria-label="Chercher un produit"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cherchez un produit (ex : jeans bleus)"
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] text-[#1B2A5C] outline-none placeholder:text-[#64748B]"
        />
        {query && (
          <button type="button" aria-label="Effacer" onClick={() => setQuery("")}>
            <XCircle size={18} color="#64748B" />
          </button>
        )}
      </form>

      <div className="absolute left-1/2 top-[76px] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-[#E2E8F0] bg-white px-[14px] py-2 shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
        <Navigation size={14} color="#F58220" />
        <span className="text-xs font-bold">{visibleShops.length} boutiques · 5 km</span>
      </div>

      <div className="absolute left-1/2 top-[116px] flex -translate-x-1/2 items-center gap-1 rounded-full border border-[#E2E8F0] bg-white p-1 shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
        {(["all", "products", "services"] as Filter[]).map((item) => {
          const active = filter === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className="flex items-center gap-1.5 rounded-full px-3 py-[7px] text-xs"
              style={{
                color: active ? "#fff" : "#64748B",
                background: active ? "#1B2A5C" : "transparent",
                fontWeight: active ? 700 : 500,
              }}
            >
              <FilterIcon filter={item} />
              {filterLabels[item]}
            </button>
          );
        })}
      </div>

      <nav className="absolute inset-x-0 bottom-0 grid h-[84px] grid-cols-5 border-t border-[#E2E8F0] bg-white pb-[18px]">
        {[
          { label: "Carte", icon: MapIcon, active: true },
          { label: "Recherche", icon: Search },
          { label: "Photo", icon: Camera },
          { label: "Messages", icon: MessageCircle },
          { label: "Profil", icon: User },
        ].map(({ label, icon: Icon, active }) => (
          <button key={label} type="button" className="flex flex-col items-center justify-center gap-1">
            <Icon size={23} color={active ? "#F58220" : "#64748B"} />
            <span className="text-[11px] font-semibold" style={{ color: active ? "#F58220" : "#64748B" }}>
              {label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}
