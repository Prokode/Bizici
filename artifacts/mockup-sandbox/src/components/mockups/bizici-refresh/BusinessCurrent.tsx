import { ChevronRight, Mail, Plus } from "lucide-react";
import "./_group.css";

type BusinessShop = {
  name: string;
  market: string;
  role: "Vendeur" | "Assistant";
  open: boolean;
};

const shops: BusinessShop[] = [
  { name: "Fruits & Légumes Maria", market: "Marché des Enfants Rouges", role: "Vendeur", open: true },
  { name: "L'Atelier du Vélo", market: "Marché Popincourt", role: "Vendeur", open: true },
  { name: "Le Comptoir des Créateurs", market: "Village Saint-Paul", role: "Assistant", open: false },
];

function Badge({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: "seller" | "helper" | "open" | "closed";
}) {
  const styles = {
    seller: { background: "#F58220", color: "#fff" },
    helper: { background: "#1B2A5C", color: "#fff" },
    open: { background: "#7FB927", color: "#fff" },
    closed: { background: "#EF4444", color: "#fff" },
  }[variant];
  return (
    <span
      className="self-end rounded-full px-2 py-1 text-xs font-semibold uppercase leading-[15px]"
      style={styles}
    >
      {children}
    </span>
  );
}

export function BusinessCurrent() {
  return (
    <div className="bizici-current relative h-screen min-h-[720px] w-full overflow-hidden bg-white">
      <div className="h-6 bg-white" />
      <header className="flex h-14 items-center justify-center bg-white">
        <h1 className="text-[17px] font-bold text-[#1B2A5C]">Vos boutiques</h1>
      </header>

      <main className="absolute inset-x-0 bottom-0 top-20 overflow-y-auto px-4 pb-28 pt-4">
        <button
          type="button"
          className="mb-4 flex w-full items-center gap-3 rounded-[14px] bg-[#FFE9D6] p-3 text-[#C2620E] active:opacity-80"
        >
          <Mail size={20} />
          <span className="flex-1 text-left text-sm font-semibold">1 invitation en attente</span>
          <ChevronRight size={20} />
        </button>

        {shops.map((shop) => (
          <button
            key={shop.name}
            type="button"
            className="mb-3 flex w-full items-center rounded-[14px] border border-[#E2E8F0] bg-[#F7F9FC] p-4 text-left active:opacity-80"
          >
            <span className="mr-3 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F58220] text-[22px] font-bold text-white">
              {shop.name.charAt(0)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-lg font-bold text-[#1B2A5C]">{shop.name}</span>
              <span className="mt-0.5 block truncate text-[13px] font-medium text-[#64748B]">{shop.market}</span>
            </span>
            <span className="ml-2 flex shrink-0 flex-col items-end gap-1">
              <Badge variant={shop.role === "Vendeur" ? "seller" : "helper"}>{shop.role}</Badge>
              <Badge variant={shop.open ? "open" : "closed"}>{shop.open ? "Ouverte" : "Fermée"}</Badge>
            </span>
          </button>
        ))}
      </main>

      <button
        type="button"
        className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-[#F58220] px-5 py-[14px] text-[15px] font-semibold text-white shadow-[0_4px_8px_rgba(0,0,0,0.3)] active:opacity-85"
      >
        <Plus size={20} />
        Nouvelle boutique
      </button>
    </div>
  );
}
