import { ChevronRight, Mail, Plus, Store, UserRound } from "lucide-react";
import { useState } from "react";
import "./refresh.css";

const shops = [
  { name: "Fruits & Légumes Maria", place: "Marché des Enfants Rouges", role: "Vendeur", open: true, mark: "maria", initial: "M" },
  { name: "L'Atelier du Vélo", place: "Marché Popincourt", role: "Vendeur", open: true, mark: "velo", initial: "V" },
  { name: "Le Comptoir des Créateurs", place: "Village Saint-Paul", role: "Assistant", open: false, mark: "createurs", initial: "C" },
];

export function BusinessShops() {
  const [sheet, setSheet] = useState<"invite" | "create" | null>(null);
  const [notice, setNotice] = useState("");
  const close = (message = "") => { setSheet(null); if (message) setNotice(message); };
  return <div className="biz-refresh pro">
    <main className="scroll">
      <header className="pro-header"><div className="brand">Biz<b>Ici</b><small>PRO</small></div><div className="avatar">LM</div></header>
      <section className="workspace-title"><div className="eyebrow">Votre espace professionnel</div><h1>Vos adresses<br />font partie du quartier.</h1><p>Choisissez une boutique pour continuer.</p></section>
      <button className="invite" type="button" onClick={() => setSheet("invite")}><div className="invite-icon"><Mail size={18} /></div><div><strong>Une invitation vous attend</strong><span>Le Comptoir du Passage · assistant</span></div><ChevronRight className="chev" size={19} /></button>
      {notice && <div role="status" style={{ fontSize: 12, color: "#54752c", margin: "-8px 0 14px", fontWeight: 700 }}>{notice}</div>}
      <div className="pro-section-head"><h2>Mes boutiques</h2><button type="button" onClick={() => setSheet("create")}>Ajouter</button></div>
      <div className="shop-list">{shops.map((shop) => <button className="pro-card" type="button" key={shop.name} onClick={() => setNotice(`${shop.name} est sélectionnée`)}><span className={`pro-mark ${shop.mark}`}>{shop.initial}</span><span className="pro-card-main"><strong>{shop.name}</strong><span>{shop.place}</span><span className="pro-meta"><i className="role">{shop.role}</i><i className={`status ${shop.open ? "" : "closed-pro"}`}><i />{shop.open ? "Ouverte" : "Fermée"}</i></span></span><ChevronRight size={18} /></button>)}</div>
      <button className="create-shop" type="button" onClick={() => setSheet("create")}><Plus size={18} />Créer une boutique</button>
    </main>
    <nav className="pro-nav"><button className="active" type="button"><Store size={20} />Boutiques</button><button type="button"><UserRound size={20} />Compte</button></nav>
    {sheet && <div className="sheet business-sheet" role="dialog" aria-modal="true"><div className="sheet-panel"><div className="handle" />{sheet === "invite" ? <><h3>Une adresse vous invite</h3><p>Le Comptoir du Passage vous propose le rôle d’assistant. Vous pourrez contribuer sans modifier la gestion de la boutique.</p><div className="sheet-actions"><button className="primary" type="button" onClick={() => close("Invitation acceptée")}>Accepter</button><button className="secondary" type="button" onClick={() => close("Invitation déclinée")}>Décliner</button></div></> : <><h3>Créer votre boutique</h3><p>Choisissez le point de départ qui correspond à votre activité.</p><button className="option" type="button" onClick={() => close("Création d’une boutique commencée")}>Vendre des produits<span>Constituez votre catalogue local</span></button><button className="option" type="button" onClick={() => close("Création d’un atelier commencée")}>Proposer des services<span>Présentez votre savoir-faire et vos créneaux</span></button></>}</div></div>}
  </div>;
}