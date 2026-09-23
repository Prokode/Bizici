import { Camera, Heart, MapPin, MessageCircle, Navigation, Package, Search, Scissors, User, X } from "lucide-react";
import { useMemo, useState } from "react";
import "./refresh.css";

type Filter = "all" | "products" | "services";
const shops = [
  { id: "maria", name: "Fruits & Légumes Maria", place: "Marché des Enfants Rouges", kind: "products", distance: "350 m", count: "28 produits", open: true, art: "produce", picks: "Fraises · Avocats · Tomates" },
  { id: "atelier", name: "L'Atelier du Vélo", place: "Rue de Bretagne", kind: "hybrid", distance: "620 m", count: "14 essentiels", open: true, art: "bike", picks: "Antivol U · Révision · Éclairage" },
  { id: "camille", name: "Studio Camille", place: "Coiffure & soins", kind: "services", distance: "900 m", count: "6 services", open: false, art: "studio", picks: "Coupe · Brushing · Soin" },
] as const;

export function ConsumerDiscovery() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<(typeof shops)[number] | null>(null);
  const visible = useMemo(() => shops.filter((shop) => {
    const q = query.trim().toLocaleLowerCase("fr");
    const allowed = filter === "all" || (filter === "services" ? shop.kind !== "products" : shop.kind !== "services");
    return allowed && (!q || `${shop.name} ${shop.place} ${shop.picks}`.toLocaleLowerCase("fr").includes(q));
  }), [filter, query]);
  const filters: { id: Filter; label: string; icon: typeof Package }[] = [{ id: "all", label: "Autour de moi", icon: Navigation }, { id: "products", label: "Produits", icon: Package }, { id: "services", label: "Services", icon: Scissors }];
  return <div className="biz-refresh discovery">
    <main className="scroll">
      <div className="brand-row"><div className="brand">Biz<b>Ici</b></div><div className="locale"><MapPin size={13} /> Le Marais</div></div>
      <section className="intro"><div className="eyebrow">À deux pas de vous</div><h1>La vie locale,<br />bien trouvée.</h1><p>Des produits et savoir-faire disponibles près de chez vous.</p></section>
      <form className="discover-search" onSubmit={(e) => e.preventDefault()}><Search size={19} color="#69748b" /><input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Rechercher une boutique ou un produit" placeholder="Que cherchez-vous aujourd’hui ?" />{query && <button className="clear-btn" type="button" onClick={() => setQuery("")} aria-label="Effacer la recherche"><X size={18} /></button>}</form>
      <div className="filters">{filters.map(({ id, label, icon: Icon }) => <button className={`filter-pill ${filter === id ? "active" : ""}`} type="button" onClick={() => setFilter(id)} key={id}><Icon size={14} />{label}</button>)}</div>
      <div className="nearby-head"><h2>À proximité</h2><span>{visible.length} adresse{visible.length > 1 ? "s" : ""} · 5 km</span></div>
      <div className="shop-stack">{visible.map((shop) => <button className="discover-card" key={shop.id} onClick={() => setSelected(shop)} type="button" aria-label={`Voir ${shop.name}`}><div className={`shop-art ${shop.art}`}><div className="art-shape" /><span className="art-label">{shop.kind === "services" ? "Prendre rendez-vous" : shop.kind === "hybrid" ? "Boutique & atelier" : "De saison"}</span></div><div className="shop-body"><div className="shop-top"><div><div className="shop-name">{shop.name}</div><span className="shop-place">{shop.place}</span></div><span className={`open-dot ${shop.open ? "" : "closed"}`}>{shop.open ? "Ouvert" : "Fermé"}</span></div><div className="shop-facts"><span><Navigation size={12} />{shop.distance}</span><span><Package size={12} />{shop.count}</span></div><div className="product-line">{shop.picks}</div></div></button>)}</div>
      {visible.length === 0 && <div style={{ textAlign: "center", padding: "35px 18px", color: "#69748b", fontSize: 13 }}>Aucune adresse trouvée. Essayez un autre mot-clé.</div>}
    </main>
    <nav className="nav-consumer">{[{ label: "Découvrir", icon: Navigation }, { label: "Favoris", icon: Heart }, { label: "Photo", icon: Camera }, { label: "Messages", icon: MessageCircle }, { label: "Profil", icon: User }].map(({ label, icon: Icon }, index) => <button type="button" className={index === 0 ? "active" : ""} key={label}><Icon size={20} />{label}</button>)}</nav>
    {selected && <div className="sheet" role="dialog" aria-modal="true"><div className="sheet-panel"><div className="handle" /><h3>{selected.name}</h3><p>{selected.place} · à {selected.distance}. {selected.open ? "Cette adresse est ouverte aujourd’hui." : "Cette adresse est actuellement fermée."}</p><div className="sheet-actions"><button className="primary" type="button" onClick={() => setSelected(null)}>Voir la sélection</button><button className="secondary" type="button" onClick={() => setSelected(null)}>Fermer</button></div></div></div>}
  </div>;
}