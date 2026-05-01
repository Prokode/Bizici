/**
 * Shared legal content (Privacy Policy + Terms of Use) for the BizIci suite.
 * Used by the marketing site and both Expo apps so the wording stays in sync.
 *
 * IMPORTANT — placeholders to fill:
 *   {COMPANY_LEGAL_NAME}, {COMPANY_FORM} (e.g. SAS), {COMPANY_CAPITAL},
 *   {COMPANY_SIREN}, {COMPANY_ADDRESS}, {COMPANY_RCS_CITY}, {COMPANY_VAT},
 *   {COMPANY_PUBLISHER}, {COMPANY_HOST_NAME}, {COMPANY_HOST_ADDRESS}.
 *
 * The text below is a serious, France/EU-aligned baseline (GDPR + DAC7 + LCEN
 * + consumer law) but it is NOT legal advice — have it reviewed by a lawyer
 * before going to production.
 */

export type LegalLang = "fr" | "en";

export type LegalSection = {
  /** Heading shown above the paragraphs. */
  heading: string;
  /** One paragraph per string. Plain text — no HTML or Markdown. */
  paragraphs: string[];
};

export type LegalDoc = {
  title: string;
  intro: string;
  /** Human-readable last update date, e.g. "1 mai 2026". */
  lastUpdated: string;
  sections: LegalSection[];
};

const LAST_UPDATED_FR = "1 mai 2026";
const LAST_UPDATED_EN = "May 1, 2026";

// ---------------------------------------------------------------------------
// Privacy policy
// ---------------------------------------------------------------------------

const privacyFr: LegalDoc = {
  title: "Politique de confidentialité",
  lastUpdated: LAST_UPDATED_FR,
  intro:
    "BizIci accorde une importance fondamentale à la protection de vos données personnelles. La présente politique décrit, en application du Règlement (UE) 2016/679 (RGPD) et de la loi Informatique et Libertés modifiée, les traitements que nous mettons en œuvre lorsque vous utilisez nos applications mobiles (BizIci, BizIci Pro), notre site web et nos services associés.",
  sections: [
    {
      heading: "1. Responsable de traitement",
      paragraphs: [
        "Le responsable de traitement est {COMPANY_LEGAL_NAME}, {COMPANY_FORM} au capital de {COMPANY_CAPITAL} euros, immatriculée au RCS de {COMPANY_RCS_CITY} sous le numéro {COMPANY_SIREN}, dont le siège social est situé {COMPANY_ADDRESS}.",
        "Pour toute question relative à vos données personnelles, vous pouvez contacter notre délégué à la protection des données à l'adresse : privacy@bizici.fr.",
      ],
    },
    {
      heading: "2. Données collectées",
      paragraphs: [
        "Nous collectons les catégories de données suivantes :",
        "• Données d'identification : nom, prénom, adresse e-mail, mot de passe (chiffré), numéro de téléphone le cas échéant.",
        "• Données de profil vendeur : nom commercial, adresse de la boutique, catégorie d'activité, photos, services proposés.",
        "• Document d'identité (vendeurs uniquement) : pièce d'identité (CNI, passeport ou permis de conduire) collectée dans le cadre du processus de vérification (KYC).",
        "• Données de localisation : position GPS (avec votre consentement explicite) pour afficher les boutiques proches.",
        "• Données de navigation : pages consultées, recherches effectuées, interactions avec les boutiques.",
        "• Données de communication : messages échangés via la messagerie intégrée, avis et évaluations.",
      ],
    },
    {
      heading: "3. Finalités et bases légales",
      paragraphs: [
        "Vos données sont traitées pour les finalités suivantes :",
        "• Création et gestion de votre compte (exécution du contrat, art. 6.1.b RGPD).",
        "• Mise en relation entre acheteurs et vendeurs locaux (exécution du contrat).",
        "• Vérification de l'identité des vendeurs et lutte contre la fraude (intérêt légitime + obligation légale au titre de la directive DAC7).",
        "• Déclarations fiscales annuelles aux autorités compétentes pour les vendeurs concernés (obligation légale, art. 6.1.c RGPD ; directive (UE) 2021/514 dite DAC7).",
        "• Envoi de notifications transactionnelles (exécution du contrat).",
        "• Envoi de communications commerciales (consentement, retrait possible à tout moment).",
        "• Mesure d'audience anonymisée et amélioration du service (intérêt légitime).",
      ],
    },
    {
      heading: "4. Destinataires des données",
      paragraphs: [
        "Vos données sont accessibles uniquement aux personnes habilitées au sein de notre équipe, ainsi qu'à nos sous-traitants techniques agissant sur instruction et soumis à des engagements de confidentialité :",
        "• Hébergement : {COMPANY_HOST_NAME}, {COMPANY_HOST_ADDRESS}.",
        "• Authentification : Clerk (Clerk Inc., États-Unis ; transferts encadrés par les Clauses Contractuelles Types).",
        "• Base de données : MongoDB Atlas (hébergement UE).",
        "• Notifications push et e-mail : prestataires Expo / Resend / équivalents.",
        "Pour les vendeurs concernés par DAC7, certaines données sont transmises à la Direction Générale des Finances Publiques (DGFiP) en France ou à l'autorité fiscale compétente de votre État de résidence.",
      ],
    },
    {
      heading: "5. Transferts hors Union européenne",
      paragraphs: [
        "Certains de nos sous-traitants sont situés hors de l'Espace Économique Européen (notamment aux États-Unis). Ces transferts sont encadrés par les Clauses Contractuelles Types adoptées par la Commission européenne (décision 2021/914) et, le cas échéant, par des mesures supplémentaires (chiffrement, pseudonymisation).",
      ],
    },
    {
      heading: "6. Durées de conservation",
      paragraphs: [
        "• Compte utilisateur actif : pendant toute la durée d'utilisation du service.",
        "• Compte inactif : suppression après 3 ans d'inactivité, après une notification préalable.",
        "• Données KYC (documents d'identité) : 5 ans après la fin de la relation contractuelle, conformément aux obligations légales.",
        "• Données fiscales DAC7 : 10 ans à compter de la fin de l'année déclarée.",
        "• Données de facturation : 10 ans (art. L.123-22 du Code de commerce).",
        "• Logs techniques de connexion : 12 mois (art. L.34-1 CPCE).",
      ],
    },
    {
      heading: "7. Vos droits",
      paragraphs: [
        "Conformément aux articles 15 à 22 du RGPD, vous disposez des droits suivants : droit d'accès, de rectification, d'effacement, de limitation du traitement, d'opposition, de portabilité et le droit de définir des directives relatives au sort de vos données après votre décès.",
        "Vous pouvez exercer ces droits à tout moment en écrivant à privacy@bizici.fr ou directement depuis l'application via la fonction « Supprimer mon compte ». Une réponse vous sera apportée sous 30 jours maximum.",
        "Vous disposez également du droit d'introduire une réclamation auprès de la CNIL (3 place de Fontenoy, 75007 Paris ; www.cnil.fr).",
      ],
    },
    {
      heading: "8. Sécurité",
      paragraphs: [
        "Nous mettons en œuvre les mesures techniques et organisationnelles appropriées pour garantir la sécurité de vos données : chiffrement des communications (TLS), chiffrement des documents d'identité au repos, contrôle d'accès strict, sauvegardes régulières et journalisation des accès.",
      ],
    },
    {
      heading: "9. Cookies et traceurs",
      paragraphs: [
        "Le site web utilise uniquement des cookies strictement nécessaires au fonctionnement du service (session, préférences linguistiques). Aucun cookie publicitaire ou de mesure d'audience non anonymisée n'est déposé sans votre consentement.",
        "Les applications mobiles n'utilisent pas de cookies, mais conservent localement vos préférences et votre jeton d'authentification.",
      ],
    },
    {
      heading: "10. Modifications de la politique",
      paragraphs: [
        "La présente politique peut être modifiée pour refléter des évolutions légales ou fonctionnelles. Toute modification substantielle vous sera notifiée par e-mail ou via l'application au moins 30 jours avant son entrée en vigueur.",
      ],
    },
  ],
};

const privacyEn: LegalDoc = {
  title: "Privacy Policy",
  lastUpdated: LAST_UPDATED_EN,
  intro:
    "BizIci is committed to protecting your personal data. This policy describes, in compliance with Regulation (EU) 2016/679 (GDPR) and the French Data Protection Act, the processing operations we carry out when you use our mobile apps (BizIci, BizIci Pro), our website, and related services.",
  sections: [
    {
      heading: "1. Data Controller",
      paragraphs: [
        "The data controller is {COMPANY_LEGAL_NAME}, {COMPANY_FORM} with capital of EUR {COMPANY_CAPITAL}, registered with the {COMPANY_RCS_CITY} Trade and Companies Register under number {COMPANY_SIREN}, with registered office at {COMPANY_ADDRESS}.",
        "For any question regarding your personal data, you may contact our Data Protection Officer at: privacy@bizici.fr.",
      ],
    },
    {
      heading: "2. Data we collect",
      paragraphs: [
        "We collect the following categories of data:",
        "• Identification data: first name, last name, email, password (encrypted), phone number where applicable.",
        "• Seller profile data: business name, shop address, business category, photos, services offered.",
        "• ID document (sellers only): national ID card, passport, or driver's license collected as part of the verification (KYC) process.",
        "• Location data: GPS position (with explicit consent) to show nearby shops.",
        "• Browsing data: pages viewed, searches performed, interactions with shops.",
        "• Communication data: messages exchanged via the integrated messaging, reviews and ratings.",
      ],
    },
    {
      heading: "3. Purposes and legal bases",
      paragraphs: [
        "Your data is processed for the following purposes:",
        "• Account creation and management (contract performance, art. 6.1.b GDPR).",
        "• Connecting local buyers and sellers (contract performance).",
        "• Verifying seller identity and fighting fraud (legitimate interest + legal obligation under DAC7).",
        "• Annual tax reporting to competent authorities for affected sellers (legal obligation, art. 6.1.c GDPR; Directive (EU) 2021/514 known as DAC7).",
        "• Sending transactional notifications (contract performance).",
        "• Sending marketing communications (consent, withdrawable at any time).",
        "• Anonymous audience measurement and service improvement (legitimate interest).",
      ],
    },
    {
      heading: "4. Recipients",
      paragraphs: [
        "Your data is accessible only to authorized personnel within our team, and to our technical processors acting on our instructions and bound by confidentiality:",
        "• Hosting: {COMPANY_HOST_NAME}, {COMPANY_HOST_ADDRESS}.",
        "• Authentication: Clerk (Clerk Inc., USA; transfers governed by Standard Contractual Clauses).",
        "• Database: MongoDB Atlas (EU hosting).",
        "• Push and email notifications: Expo / Resend or equivalent providers.",
        "For sellers covered by DAC7, certain data is transmitted to the French Tax Authority (DGFiP) or the competent tax authority of your country of residence.",
      ],
    },
    {
      heading: "5. Transfers outside the EU",
      paragraphs: [
        "Some of our processors are located outside the European Economic Area (notably in the United States). These transfers are governed by Standard Contractual Clauses adopted by the European Commission (Decision 2021/914) and, where applicable, by additional measures (encryption, pseudonymization).",
      ],
    },
    {
      heading: "6. Retention periods",
      paragraphs: [
        "• Active user account: for the entire duration of service use.",
        "• Inactive account: deleted after 3 years of inactivity, with prior notification.",
        "• KYC data (ID documents): 5 years after the end of the contractual relationship, in compliance with legal obligations.",
        "• DAC7 tax data: 10 years from the end of the reported year.",
        "• Billing data: 10 years (French Commercial Code, art. L.123-22).",
        "• Technical connection logs: 12 months (CPCE art. L.34-1).",
      ],
    },
    {
      heading: "7. Your rights",
      paragraphs: [
        "Pursuant to articles 15 to 22 of the GDPR, you have the following rights: access, rectification, erasure, restriction of processing, objection, portability, and the right to define directives concerning your data after your death.",
        "You can exercise these rights at any time by writing to privacy@bizici.fr or directly from the app via the “Delete my account” feature. A response will be provided within 30 days.",
        "You also have the right to lodge a complaint with the CNIL (3 place de Fontenoy, 75007 Paris; www.cnil.fr).",
      ],
    },
    {
      heading: "8. Security",
      paragraphs: [
        "We implement appropriate technical and organizational measures to ensure the security of your data: TLS encryption in transit, encryption of ID documents at rest, strict access control, regular backups and access logging.",
      ],
    },
    {
      heading: "9. Cookies and trackers",
      paragraphs: [
        "The website uses only strictly necessary cookies (session, language preferences). No advertising or non-anonymized analytics cookies are placed without your consent.",
        "Mobile apps do not use cookies, but locally store your preferences and authentication token.",
      ],
    },
    {
      heading: "10. Changes to this policy",
      paragraphs: [
        "This policy may be updated to reflect legal or functional changes. Any substantial change will be notified to you by email or via the app at least 30 days before it takes effect.",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Terms of Use
// ---------------------------------------------------------------------------

const termsFr: LegalDoc = {
  title: "Conditions générales d'utilisation",
  lastUpdated: LAST_UPDATED_FR,
  intro:
    "Les présentes Conditions Générales d'Utilisation (« CGU ») régissent l'accès et l'utilisation des services BizIci (applications mobiles BizIci et BizIci Pro, site web et services associés). En créant un compte ou en utilisant nos services, vous acceptez sans réserve les présentes CGU.",
  sections: [
    {
      heading: "1. Mentions légales",
      paragraphs: [
        "Éditeur : {COMPANY_LEGAL_NAME}, {COMPANY_FORM} au capital de {COMPANY_CAPITAL} euros, RCS {COMPANY_RCS_CITY} {COMPANY_SIREN}, siège social {COMPANY_ADDRESS}, TVA intracommunautaire {COMPANY_VAT}.",
        "Directeur de la publication : {COMPANY_PUBLISHER}.",
        "Hébergeur : {COMPANY_HOST_NAME}, {COMPANY_HOST_ADDRESS}.",
        "Contact : support@bizici.app.",
      ],
    },
    {
      heading: "2. Objet du service",
      paragraphs: [
        "BizIci est une plateforme de mise en relation entre commerçants locaux (« Vendeurs ») et clients (« Acheteurs ») permettant de découvrir des produits et services de proximité, communiquer, prendre rendez-vous et organiser des transactions.",
        "BizIci agit exclusivement en qualité d'intermédiaire technique. La société n'est pas partie aux contrats conclus entre Vendeurs et Acheteurs et ne perçoit aucune somme au titre de ces transactions, sauf mention contraire dans les conditions tarifaires applicables.",
      ],
    },
    {
      heading: "3. Création de compte",
      paragraphs: [
        "L'utilisation des services nécessite la création d'un compte. Vous garantissez que les informations fournies sont exactes, complètes et à jour. Vous êtes responsable de la confidentialité de vos identifiants et de toute activité réalisée depuis votre compte.",
        "L'inscription est réservée aux personnes physiques majeures (18 ans et plus) ou à des personnes morales représentées par un mandataire dûment habilité.",
        "Les comptes Vendeur sont soumis à une vérification d'identité obligatoire (KYC) avant publication sur la plateforme.",
      ],
    },
    {
      heading: "4. Obligations des utilisateurs",
      paragraphs: [
        "En utilisant nos services, vous vous engagez à :",
        "• respecter les lois et règlements en vigueur ;",
        "• ne pas publier de contenu illicite, diffamatoire, contrefaisant, trompeur, haineux ou contraire aux bonnes mœurs ;",
        "• ne pas usurper l'identité d'un tiers ;",
        "• ne pas utiliser le service à des fins commerciales non autorisées (revente, scraping, automatisation abusive) ;",
        "• ne pas tenter d'altérer ou de contourner les mesures de sécurité de la plateforme.",
      ],
    },
    {
      heading: "5. Obligations spécifiques des Vendeurs",
      paragraphs: [
        "Les Vendeurs s'engagent à :",
        "• déclarer leur statut juridique (particulier ou professionnel) conformément au droit applicable ;",
        "• respecter leurs obligations fiscales et sociales ;",
        "• fournir des informations exactes sur leurs produits et services (description, prix, disponibilité) ;",
        "• honorer les commandes et rendez-vous confirmés ou en informer immédiatement l'Acheteur en cas d'impossibilité ;",
        "• respecter le droit de rétractation, la garantie légale de conformité et la garantie des vices cachés lorsqu'applicable.",
        "Conformément à la directive européenne DAC7, certaines informations relatives aux revenus des Vendeurs sont susceptibles d'être transmises annuellement à l'administration fiscale.",
      ],
    },
    {
      heading: "6. Vérification d'identité (KYC)",
      paragraphs: [
        "Pour publier une boutique sur BizIci, le Vendeur doit soumettre un document d'identité valide (CNI, passeport ou permis de conduire). La boutique n'est visible des Acheteurs qu'après validation par notre équipe.",
        "Nous nous réservons le droit de refuser ou de suspendre tout compte si le document ne peut être vérifié, semble falsifié, ou si l'identité du Vendeur ne peut être établie avec un niveau de confiance suffisant.",
      ],
    },
    {
      heading: "7. Propriété intellectuelle",
      paragraphs: [
        "L'ensemble des éléments composant le service (marque BizIci, logos, interfaces, code source, textes éditoriaux) est protégé par le droit de la propriété intellectuelle et reste la propriété exclusive de l'éditeur ou de ses partenaires.",
        "En publiant un contenu (photo, description, avis), vous accordez à BizIci une licence non exclusive, mondiale et gratuite d'utilisation, de reproduction et d'affichage de ce contenu dans le seul cadre du fonctionnement du service.",
      ],
    },
    {
      heading: "8. Suspension et résiliation",
      paragraphs: [
        "Vous pouvez résilier votre compte à tout moment depuis l'application ou via la page « Supprimer mon compte » du site web.",
        "BizIci se réserve le droit de suspendre ou de fermer un compte en cas de manquement aux présentes CGU, de comportement frauduleux, d'usurpation d'identité, ou de toute activité portant atteinte à la sécurité ou à la réputation du service. La décision est notifiée à l'utilisateur, sauf si la loi l'interdit.",
      ],
    },
    {
      heading: "9. Limitation de responsabilité",
      paragraphs: [
        "BizIci s'engage à fournir le service avec diligence, sans toutefois garantir une disponibilité ininterrompue. Le service est fourni « en l'état », sans garantie expresse ou implicite quant à son adéquation à un usage particulier.",
        "BizIci ne saurait être tenue responsable des litiges, dommages directs ou indirects résultant des transactions ou interactions entre Vendeurs et Acheteurs.",
        "La responsabilité de BizIci est limitée, en tout état de cause, au montant des sommes éventuellement versées par l'utilisateur au titre du service au cours des 12 derniers mois.",
      ],
    },
    {
      heading: "10. Données personnelles",
      paragraphs: [
        "Le traitement de vos données personnelles est régi par notre Politique de confidentialité, accessible depuis l'application et le site web. En acceptant les présentes CGU, vous reconnaissez en avoir pris connaissance.",
      ],
    },
    {
      heading: "11. Modification des CGU",
      paragraphs: [
        "BizIci peut modifier les présentes CGU pour refléter des évolutions légales ou fonctionnelles. Toute modification substantielle sera notifiée 30 jours à l'avance par e-mail ou via l'application. La poursuite de l'utilisation du service vaut acceptation des CGU modifiées.",
      ],
    },
    {
      heading: "12. Loi applicable et juridiction",
      paragraphs: [
        "Les présentes CGU sont soumises au droit français. Tout litige sera soumis aux tribunaux compétents du ressort du siège social de l'éditeur, sous réserve des règles impératives de protection du consommateur permettant à ce dernier de saisir le tribunal de son domicile.",
        "Conformément à l'article L.612-1 du Code de la consommation, vous pouvez recourir gratuitement au médiateur de la consommation : [coordonnées du médiateur à compléter].",
      ],
    },
  ],
};

const termsEn: LegalDoc = {
  title: "Terms of Use",
  lastUpdated: LAST_UPDATED_EN,
  intro:
    "These Terms of Use (“Terms”) govern access to and use of the BizIci services (BizIci and BizIci Pro mobile apps, website, and related services). By creating an account or using our services, you accept these Terms without reservation.",
  sections: [
    {
      heading: "1. Legal information",
      paragraphs: [
        "Publisher: {COMPANY_LEGAL_NAME}, {COMPANY_FORM} with capital of EUR {COMPANY_CAPITAL}, {COMPANY_RCS_CITY} Trade Register {COMPANY_SIREN}, registered office {COMPANY_ADDRESS}, EU VAT {COMPANY_VAT}.",
        "Publication director: {COMPANY_PUBLISHER}.",
        "Hosting: {COMPANY_HOST_NAME}, {COMPANY_HOST_ADDRESS}.",
        "Contact: support@bizici.app.",
      ],
    },
    {
      heading: "2. Purpose of the service",
      paragraphs: [
        "BizIci is a platform that connects local merchants (“Sellers”) with customers (“Buyers”) to discover nearby products and services, communicate, book appointments and arrange transactions.",
        "BizIci acts exclusively as a technical intermediary. The company is not a party to the contracts concluded between Sellers and Buyers and does not collect any payment for these transactions, unless otherwise stated in applicable pricing terms.",
      ],
    },
    {
      heading: "3. Account creation",
      paragraphs: [
        "Use of the services requires creating an account. You warrant that the information provided is accurate, complete and up to date. You are responsible for the confidentiality of your credentials and for any activity carried out from your account.",
        "Registration is restricted to natural persons of legal age (18+) or to legal entities represented by a duly authorized agent.",
        "Seller accounts are subject to mandatory identity verification (KYC) before publication on the platform.",
      ],
    },
    {
      heading: "4. User obligations",
      paragraphs: [
        "When using our services, you undertake to:",
        "• comply with applicable laws and regulations;",
        "• not publish unlawful, defamatory, infringing, misleading, hateful or improper content;",
        "• not impersonate a third party;",
        "• not use the service for unauthorized commercial purposes (resale, scraping, abusive automation);",
        "• not attempt to alter or circumvent the platform's security measures.",
      ],
    },
    {
      heading: "5. Specific Seller obligations",
      paragraphs: [
        "Sellers undertake to:",
        "• declare their legal status (private individual or professional) in accordance with applicable law;",
        "• comply with their tax and social obligations;",
        "• provide accurate information about their products and services (description, price, availability);",
        "• fulfill confirmed orders and appointments or immediately inform the Buyer in case of impossibility;",
        "• comply with the right of withdrawal, legal warranty of conformity and warranty against hidden defects where applicable.",
        "In accordance with the European DAC7 directive, certain information relating to Sellers' income may be transmitted annually to the tax authorities.",
      ],
    },
    {
      heading: "6. Identity verification (KYC)",
      paragraphs: [
        "To publish a shop on BizIci, the Seller must submit a valid ID document (national ID, passport or driver's license). The shop is only visible to Buyers after validation by our team.",
        "We reserve the right to refuse or suspend any account if the document cannot be verified, appears falsified, or if the Seller's identity cannot be established with sufficient confidence.",
      ],
    },
    {
      heading: "7. Intellectual property",
      paragraphs: [
        "All elements of the service (BizIci trademark, logos, interfaces, source code, editorial texts) are protected by intellectual property law and remain the exclusive property of the publisher or its partners.",
        "By publishing content (photo, description, review), you grant BizIci a non-exclusive, worldwide, royalty-free license to use, reproduce and display this content solely as part of the operation of the service.",
      ],
    },
    {
      heading: "8. Suspension and termination",
      paragraphs: [
        "You may terminate your account at any time from the app or via the “Delete my account” page on the website.",
        "BizIci reserves the right to suspend or close an account in case of breach of these Terms, fraudulent behavior, identity theft, or any activity affecting the security or reputation of the service. The decision is notified to the user unless prohibited by law.",
      ],
    },
    {
      heading: "9. Limitation of liability",
      paragraphs: [
        "BizIci undertakes to provide the service with due care, but does not guarantee uninterrupted availability. The service is provided “as is”, without express or implied warranty of fitness for a particular purpose.",
        "BizIci shall not be held liable for any disputes, direct or indirect damages resulting from transactions or interactions between Sellers and Buyers.",
        "BizIci's liability is in any event limited to the amount of any sums paid by the user for the service over the past 12 months.",
      ],
    },
    {
      heading: "10. Personal data",
      paragraphs: [
        "The processing of your personal data is governed by our Privacy Policy, accessible from the app and the website. By accepting these Terms, you acknowledge having read it.",
      ],
    },
    {
      heading: "11. Changes to the Terms",
      paragraphs: [
        "BizIci may update these Terms to reflect legal or functional changes. Any substantial change will be notified 30 days in advance by email or via the app. Continued use of the service constitutes acceptance of the modified Terms.",
      ],
    },
    {
      heading: "12. Applicable law and jurisdiction",
      paragraphs: [
        "These Terms are governed by French law. Any dispute will be submitted to the competent courts of the publisher's registered office, subject to the mandatory consumer protection rules allowing the consumer to bring an action before the court of their domicile.",
        "Pursuant to article L.612-1 of the French Consumer Code, you may contact the consumer mediator free of charge: [mediator details to be added].",
      ],
    },
  ],
};

export const privacyDoc: Record<LegalLang, LegalDoc> = {
  fr: privacyFr,
  en: privacyEn,
};

export const termsDoc: Record<LegalLang, LegalDoc> = {
  fr: termsFr,
  en: termsEn,
};

/**
 * Resolve `{PLACEHOLDER}` tokens against a map. Useful when the consumer
 * artifact knows real company info (e.g. via env vars) and wants to render
 * the final text. Unknown tokens are left in place so they remain visible
 * during early development.
 */
export function fillPlaceholders(
  text: string,
  values: Record<string, string>,
): string {
  return text.replace(/\{([A-Z_]+)\}/g, (m, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? values[key]! : m,
  );
}

export function fillDoc(
  doc: LegalDoc,
  values: Record<string, string>,
): LegalDoc {
  return {
    ...doc,
    intro: fillPlaceholders(doc.intro, values),
    sections: doc.sections.map((s) => ({
      heading: fillPlaceholders(s.heading, values),
      paragraphs: s.paragraphs.map((p) => fillPlaceholders(p, values)),
    })),
  };
}

/**
 * Fallback values shown when the consumer artifact has not yet wired the
 * real company information. We replace each unknown token with a clearly
 * visible "À compléter" / "To be completed" marker so that end users see
 * an obvious gap (instead of the literal `{COMPANY_LEGAL_NAME}` token) and
 * the publisher knows what is missing.
 */
const TBD_FR = "[À compléter]";
const TBD_EN = "[To be completed]";

export const defaultPlaceholders: Record<LegalLang, Record<string, string>> = {
  fr: {
    COMPANY_LEGAL_NAME: TBD_FR,
    COMPANY_FORM: TBD_FR,
    COMPANY_CAPITAL: TBD_FR,
    COMPANY_SIREN: TBD_FR,
    COMPANY_ADDRESS: TBD_FR,
    COMPANY_RCS_CITY: TBD_FR,
    COMPANY_VAT: TBD_FR,
    COMPANY_PUBLISHER: TBD_FR,
    COMPANY_HOST_NAME: TBD_FR,
    COMPANY_HOST_ADDRESS: TBD_FR,
  },
  en: {
    COMPANY_LEGAL_NAME: TBD_EN,
    COMPANY_FORM: TBD_EN,
    COMPANY_CAPITAL: TBD_EN,
    COMPANY_SIREN: TBD_EN,
    COMPANY_ADDRESS: TBD_EN,
    COMPANY_RCS_CITY: TBD_EN,
    COMPANY_VAT: TBD_EN,
    COMPANY_PUBLISHER: TBD_EN,
    COMPANY_HOST_NAME: TBD_EN,
    COMPANY_HOST_ADDRESS: TBD_EN,
  },
};

/**
 * Resolve a privacy/terms doc for the given language with sensible default
 * placeholder values, optionally overridden by `overrides` (e.g. when the
 * artifact eventually reads real company info from env or a CMS).
 */
export function getPrivacyDoc(
  lang: LegalLang,
  overrides: Record<string, string> = {},
): LegalDoc {
  return fillDoc(privacyDoc[lang], { ...defaultPlaceholders[lang], ...overrides });
}

export function getTermsDoc(
  lang: LegalLang,
  overrides: Record<string, string> = {},
): LegalDoc {
  return fillDoc(termsDoc[lang], { ...defaultPlaceholders[lang], ...overrides });
}
