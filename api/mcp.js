import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import pkg from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { widgetHtml } from "./ui.js";

const { verify, decode } = pkg;

const WIDGET_URI = "ui://widget/devis.html";

// ─── Config Auth0 ────────────────────────────────────────────────
const AUTH0_DOMAIN   = process.env.AUTH0_DOMAIN;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;

const jwks = jwksClient({
  jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`,
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5
});

// ─── Vérification du token JWT Auth0 ─────────────────────────────
async function verifyAuth0Token(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Token manquant ou invalide");
  }

  const token = authHeader.split(" ")[1];
  const decoded = decode(token, { complete: true });

  if (!decoded?.header?.kid) {
    throw new Error("Structure du token invalide");
  }

  const key = await jwks.getSigningKey(decoded.header.kid);
  const signingKey = key.getPublicKey();

  return verify(token, signingKey, {
    audience:   AUTH0_AUDIENCE,
    issuer:     `https://${AUTH0_DOMAIN}/`,
    algorithms: ["RS256"]
  });
}

// ─── Outils MCP ──────────────────────────────────────────────────
function createServer() {
  const server = new McpServer({
    name: "MatDevis",
    version: "1.0.0",
  });

  // Enregistrement de la ressource UI
  server.registerResource("devis-widget", WIDGET_URI, { mimeType: "text/html;profile=mcp-app" }, async () => ({
    contents: [{
      uri: WIDGET_URI,
      mimeType: "text/html;profile=mcp-app",
      text: widgetHtml,
      _meta: { ui: { prefersBorder: true } }
    }]
  }));

  // ÉTAPE 1a — Véhicule par immatriculation
  server.tool(
    "matdevis_vehicule_immat",
    "Identifier le véhicule par sa plaque d'immatriculation",
    { immatriculation: z.string().describe("Plaque ex: AB-123-CD") },
    async ({ immatriculation }) => ({
      content: [{
        type: "text",
        text: `🚗 **MatDevis — Identification véhicule**\n\nPlaque : **${immatriculation.toUpperCase()}**\n\n✅ Véhicule identifié :\n• Marque : Renault\n• Modèle : Clio V\n• Version : 1.0 TCe 90ch Zen\n• Année : 2021\n• Carburant : Essence\n• Valeur catalogue : 18 500 €\n\n➡️ Appelez **@MatDevis** avec l'outil *souscripteur* pour continuer.`
      }]
    })
  );

  // ÉTAPE 1b — Véhicule manuel
  server.tool(
    "matdevis_vehicule_manuel",
    "Identifier le véhicule manuellement sans immatriculation",
    {
      marque:           z.string().describe("Marque ex: Peugeot"),
      modele:           z.string().describe("Modèle ex: 308"),
      version:          z.string().describe("Version ex: 1.5 BlueHDi 130ch Allure"),
      annee:            z.number().int().describe("Année ex: 2022"),
      carburant:        z.enum(["Essence","Diesel","Électrique","Hybride","GPL"]),
      valeur_catalogue: z.number().describe("Valeur catalogue en euros")
    },
    async ({ marque, modele, version, annee, carburant, valeur_catalogue }) => ({
      content: [{
        type: "text",
        text: `🚗 **MatDevis — Véhicule enregistré**\n\n• Marque : **${marque}**\n• Modèle : **${modele}**\n• Version : **${version}**\n• Année : **${annee}**\n• Carburant : **${carburant}**\n• Valeur catalogue : **${valeur_catalogue.toLocaleString("fr-FR")} €**\n\n✅ Véhicule enregistré.\n➡️ Appelez **@MatDevis** avec l'outil *souscripteur* pour continuer.`
      }]
    })
  );

  // ÉTAPE 2 — Souscripteur
  server.tool(
    "matdevis_souscripteur",
    "Collecter les informations du souscripteur",
    {
      date_naissance:        z.string().describe("Date de naissance JJ/MM/AAAA"),
      date_permis:           z.string().describe("Date du permis JJ/MM/AAAA"),
      bonus_malus:           z.number().min(0.5).max(3.5).describe("Coefficient bonus-malus ex: 0.85"),
      annees_assurance:      z.number().int().min(0).describe("Années d'assurance continue"),
      usage:                 z.enum(["Trajet domicile-travail","Usage privé","Usage professionnel","Tournées"]),
      stationnement:         z.enum(["Garage privé","Parking collectif","Rue"]),
      conducteur_secondaire: z.boolean()
    },
    async ({ date_naissance, date_permis, bonus_malus, annees_assurance, usage, stationnement, conducteur_secondaire }) => {
      const label = bonus_malus <= 0.7 ? "🏆 Excellent" : bonus_malus <= 1.0 ? "✅ Bon conducteur" : bonus_malus <= 1.5 ? "⚠️ Standard" : "🔴 Malussé";
      return {
        content: [{
          type: "text",
          text: `👤 **MatDevis — Profil souscripteur**\n\n• Naissance : **${date_naissance}**\n• Permis : **${date_permis}**\n• Bonus-malus : **${bonus_malus}** ${label}\n• Ancienneté : **${annees_assurance} ans**\n• Usage : **${usage}**\n• Stationnement : **${stationnement}**\n• Conducteur secondaire : **${conducteur_secondaire ? "Oui" : "Non"}**\n\n➡️ Appelez **@MatDevis** avec l'outil *sinistralite* pour continuer.`
        }]
      };
    }
  );

  // ÉTAPE 3 — Sinistralité
  server.tool(
    "matdevis_sinistralite",
    "Collecter l'historique de sinistres sur 3 ans",
    {
      nb_sinistres_responsable:     z.number().int().min(0),
      nb_sinistres_non_responsable: z.number().int().min(0),
      nb_bris_glace:                z.number().int().min(0),
      nb_vol_incendie:              z.number().int().min(0),
      retrait_permis:               z.boolean(),
      alcool_drogue:                z.boolean()
    },
    async ({ nb_sinistres_responsable, nb_sinistres_non_responsable, nb_bris_glace, nb_vol_incendie, retrait_permis, alcool_drogue }) => {
      const risque = (nb_sinistres_responsable >= 2 || retrait_permis || alcool_drogue) ? "🔴 Profil aggravé" : nb_sinistres_responsable === 1 ? "🟡 Légère majoration" : "🟢 Bon profil — aucune majoration";
      return {
        content: [{
          type: "text",
          text: `📋 **MatDevis — Sinistralité**\n\n• Sinistres responsables : **${nb_sinistres_responsable}**\n• Non responsables : **${nb_sinistres_non_responsable}**\n• Bris de glace : **${nb_bris_glace}**\n• Vol/Incendie : **${nb_vol_incendie}**\n• Retrait permis : **${retrait_permis ? "Oui ⚠️" : "Non"}**\n• Alcool/Drogue : **${alcool_drogue ? "Oui 🔴" : "Non"}**\n\n${risque}\n\n➡️ Appelez **@MatDevis** avec l'outil *formules* pour voir les offres.`
        }]
      };
    }
  );

  // ÉTAPE 4 — Formules
  server.tool(
    "matdevis_formules",
    "Présenter les formules d'assurance disponibles",
    {
      bonus_malus:     z.number(),
      valeur_vehicule: z.number(),
      annee_vehicule:  z.number().int()
    },
    async ({ bonus_malus, valeur_vehicule, annee_vehicule }) => {
      const age  = new Date().getFullYear() - annee_vehicule;
      const base = valeur_vehicule * 0.04 * bonus_malus;
      const rc   = Math.round(base * 0.50);
      const t    = Math.round(base * 0.75);
      const tp   = Math.round(base * 0.90);
      const tr   = Math.round(base * 1.20);
      return {
        content: [{
          type: "text",
          text: `🛡️ **MatDevis — Formules disponibles** (véhicule ${age} ans)\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n**1️⃣ RC seule** — ${rc}€/an (${Math.round(rc/12)}€/mois)\n✅ Dommages aux tiers uniquement\n\n**2️⃣ Tiers** — ${t}€/an (${Math.round(t/12)}€/mois)\n✅ RC + Vol + Incendie + Bris de glace\n\n**3️⃣ Tiers Plus** — ${tp}€/an (${Math.round(tp/12)}€/mois)\n✅ Tiers + Dommages collision (franchise 300€)\n\n**4️⃣ Tous Risques ⭐** — ${tr}€/an (${Math.round(tr/12)}€/mois)\n✅ Couverture maximale + Assistance 0km\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n➡️ Appelez **@MatDevis** avec l'outil *devis_final* en précisant votre choix.`
        }]
      };
    }
  );

  // ÉTAPE 5 — Devis final (Combined Calculation & Rendering)
  server.registerTool(
    "matdevis_devis_final",
    {
      description: "Générer et afficher le devis final complet",
      inputSchema: z.object({
        marque:                z.string(),
        modele:                z.string(),
        annee:                 z.number().int(),
        carburant:             z.string(),
        valeur_catalogue:      z.number(),
        date_naissance:        z.string(),
        date_permis:           z.string(),
        bonus_malus:           z.number(),
        usage:                 z.string(),
        nb_sinistres:          z.number().int(),
        formule:               z.enum(["Responsabilité Civile","Tiers","Tiers Plus","Tous Risques"]),
        protection_conducteur: z.boolean(),
        assistance_0km:        z.boolean(),
        vehicule_remplacement: z.boolean()
      }),
      _meta: {
        ui: { resourceUri: WIDGET_URI },
        "openai/outputTemplate": WIDGET_URI,
      }
    },
    async ({ marque, modele, annee, carburant, valeur_catalogue, bonus_malus, usage, nb_sinistres, formule, protection_conducteur, assistance_0km, vehicule_remplacement }) => {
      const taux  = formule === "Responsabilité Civile" ? 0.02 : formule === "Tiers" ? 0.03 : formule === "Tiers Plus" ? 0.036 : 0.048;
      let prime   = valeur_catalogue * taux * bonus_malus;
      if (nb_sinistres === 1) prime *= 1.15;
      if (nb_sinistres >= 2) prime *= 1.35;
      if (protection_conducteur) prime += 45;
      if (assistance_0km)        prime += 35;
      if (vehicule_remplacement) prime += 60;
      const annuel   = Math.round(prime);
      const mensuel  = Math.round(prime / 12);
      const ref      = `MAT-${Date.now().toString().slice(-8)}`;

      const data = {
        marque, modele, annee, carburant, bonus_malus, usage, formule, annuel, mensuel, ref
      };

      return {
        structuredContent: data,
        content: [{
          type: "text",
          text: `\n╔══════════════════════════════════════╗\n║     🚗 DEVIS ASSURANCE AUTOMOBILE    ║\n║           MatDevis Agent IA          ║\n╚══════════════════════════════════════╝\n\n📌 Référence : **${ref}**\n📅 Date : **${new Date().toLocaleDateString("fr-FR")}**\n\n━━━ 🚗 VÉHICULE ━━━━━━━━━━━━━━━━━━━━━\n• ${marque} ${modele} — ${annee} — ${carburant}\n• Valeur catalogue : ${valeur_catalogue.toLocaleString("fr-FR")} €\n\n━━━ 👤 SOUSCRIPTEUR ━━━━━━━━━━━━━━━━━\n• Bonus-malus : ${bonus_malus}\n• Usage : ${usage}\n\n━━━ 🛡️ FORMULE : ${formule.toUpperCase()} ━━━━━━━━\n• Protection conducteur : ${protection_conducteur ? "✅ (+45€)" : "❌"}\n• Assistance 0km : ${assistance_0km ? "✅ (+35€)" : "❌"}\n• Véhicule de remplacement : ${vehicule_remplacement ? "✅ (+60€)" : "❌"}\n\n━━━ 💶 TARIFICATION ━━━━━━━━━━━━━━━━━\n  Prime annuelle  : **${annuel} €/an**\n  Prime mensuelle : **${mensuel} €/mois**\n\n✅ Devis valable 30 jours — Réf. **${ref}**\n_MatDevis Agent IA — Non contractuel_`
        }]
      };
    }
  );

  return server;
}

// ─── Handler HTTP principal ───────────────────────────────────────
export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "https://chatgpt.com");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, mcp-session-id, Authorization");
  res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // ─── Vérification JWT Auth0 ──────────────────────────────────
  try {
  const token = (req.headers.authorization || "").split(" ")[1];
  if (!token) throw new Error("Token manquant");
  
  // Décoder SANS vérifier pour voir ce qu'il contient
  const decoded = decode(token, { complete: true });
  console.log("=== TOKEN DEBUG ===");
  console.log("Header:", JSON.stringify(decoded?.header));
  console.log("Audience:", JSON.stringify(decoded?.payload?.aud));
  console.log("Issuer:", JSON.stringify(decoded?.payload?.iss));
  console.log("Scope:", JSON.stringify(decoded?.payload?.scope));
  console.log("==================");
  
  // TEMPORAIRE : on laisse passer sans vérifier
  req.oktaClaims = decoded?.payload;

} catch (err) {
  res.status(401).json({ error: "unauthorized", error_description: err.message });
  return;
}

  // ─── MCP normal ──────────────────────────────────────────────
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined
  });

  res.on("close", () => {
    transport.close();
    server.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}
