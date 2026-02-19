import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

function createServer() {
  const server = new McpServer({
    name: "MatDevis",
    version: "1.0.0",
  });

  // ─────────────────────────────────────────────
  // ÉTAPE 1 — IDENTIFICATION DU VÉHICULE
  // ─────────────────────────────────────────────
  server.tool(
    "matdevis_vehicule_immat",
    "Identifier le véhicule par sa plaque d'immatriculation",
    {
      immatriculation: z.string().describe("Plaque d'immatriculation ex: AB-123-CD")
    },
    async ({ immatriculation }) => ({
      content: [{
        type: "text",
        text: `🚗 **MatDevis — Identification véhicule**\n\n` +
          `Plaque saisie : **${immatriculation.toUpperCase()}**\n\n` +
          `✅ Véhicule identifié (simulation) :\n` +
          `• Marque : Renault\n` +
          `• Modèle : Clio V\n` +
          `• Version : 1.0 TCe 90ch Zen\n` +
          `• Année : 2021\n` +
          `• Carburant : Essence\n` +
          `• Valeur catalogue : 18 500 €\n\n` +
          `➡️ Véhicule confirmé ? Je passe à la collecte de vos informations personnelles.\n` +
          `Appelez **@MatDevis** avec l'outil *souscripteur* pour continuer.`
      }]
    })
  );

  server.tool(
    "matdevis_vehicule_manuel",
    "Identifier le véhicule manuellement si l'immatriculation est inconnue",
    {
      marque: z.string().describe("Marque du véhicule ex: Peugeot"),
      modele: z.string().describe("Modèle ex: 208"),
      version: z.string().describe("Version ex: 1.2 PureTech 100ch Allure"),
      annee: z.number().int().describe("Année de mise en circulation ex: 2020"),
      carburant: z.enum(["Essence", "Diesel", "Électrique", "Hybride", "GPL"])
        .describe("Type de carburant"),
      valeur_catalogue: z.number().describe("Valeur catalogue en euros ex: 22000")
    },
    async ({ marque, modele, version, annee, carburant, valeur_catalogue }) => ({
      content: [{
        type: "text",
        text: `🚗 **MatDevis — Véhicule enregistré**\n\n` +
          `• Marque : **${marque}**\n` +
          `• Modèle : **${modele}**\n` +
          `• Version : **${version}**\n` +
          `• Année : **${annee}**\n` +
          `• Carburant : **${carburant}**\n` +
          `• Valeur catalogue : **${valeur_catalogue.toLocaleString("fr-FR")} €**\n\n` +
          `✅ Véhicule enregistré avec succès.\n\n` +
          `➡️ Étape suivante : vos informations personnelles.\n` +
          `Appelez **@MatDevis** avec l'outil *souscripteur* pour continuer.`
      }]
    })
  );

  // ─────────────────────────────────────────────
  // ÉTAPE 2 — INFORMATIONS SOUSCRIPTEUR
  // ─────────────────────────────────────────────
  server.tool(
    "matdevis_souscripteur",
    "Collecter les informations du souscripteur : permis, bonus-malus, usage du véhicule",
    {
      date_naissance: z.string().describe("Date de naissance JJ/MM/AAAA"),
      date_permis: z.string().describe("Date d'obtention du permis JJ/MM/AAAA"),
      bonus_malus: z.number().min(0.5).max(3.5)
        .describe("Coefficient bonus-malus actuel ex: 0.85 pour un bon conducteur, 1.00 de base"),
      annees_assurance: z.number().int().min(0)
        .describe("Nombre d'années d'assurance continue"),
      usage: z.enum(["Trajet domicile-travail", "Usage privé", "Usage professionnel", "Tournées"])
        .describe("Usage principal du véhicule"),
      stationnement: z.enum(["Garage privé", "Parking collectif", "Rue"])
        .describe("Type de stationnement habituel"),
      conducteur_secondaire: z.boolean()
        .describe("Y a-t-il un conducteur secondaire ? true ou false")
    },
    async ({ date_naissance, date_permis, bonus_malus, annees_assurance, usage, stationnement, conducteur_secondaire }) => {
      const bonusLabel = bonus_malus <= 0.7 ? "🏆 Excellent" :
                         bonus_malus <= 1.0 ? "✅ Bon conducteur" :
                         bonus_malus <= 1.5 ? "⚠️ Conducteur standard" : "🔴 Malussé";
      return {
        content: [{
          type: "text",
          text: `👤 **MatDevis — Profil souscripteur enregistré**\n\n` +
            `• Date de naissance : **${date_naissance}**\n` +
            `• Date permis : **${date_permis}**\n` +
            `• Bonus-malus : **${bonus_malus}** ${bonusLabel}\n` +
            `• Ancienneté assurance : **${annees_assurance} ans**\n` +
            `• Usage : **${usage}**\n` +
            `• Stationnement : **${stationnement}**\n` +
            `• Conducteur secondaire : **${conducteur_secondaire ? "Oui" : "Non"}**\n\n` +
            `➡️ Étape suivante : votre historique de sinistres.\n` +
            `Appelez **@MatDevis** avec l'outil *sinistralite* pour continuer.`
        }]
      };
    }
  );

  // ─────────────────────────────────────────────
  // ÉTAPE 3 — SINISTRALITÉ
  // ─────────────────────────────────────────────
  server.tool(
    "matdevis_sinistralite",
    "Collecter l'historique de sinistres des 3 dernières années",
    {
      nb_sinistres_responsable: z.number().int().min(0)
        .describe("Nombre de sinistres responsables sur 3 ans"),
      nb_sinistres_non_responsable: z.number().int().min(0)
        .describe("Nombre de sinistres non responsables sur 3 ans"),
      nb_bris_glace: z.number().int().min(0)
        .describe("Nombre de bris de glace sur 3 ans"),
      nb_vol_incendie: z.number().int().min(0)
        .describe("Nombre de vols ou incendies sur 3 ans"),
      retrait_permis: z.boolean()
        .describe("Retrait ou suspension de permis dans les 3 ans ? true/false"),
      alcool_drogue: z.boolean()
        .describe("Sinistre sous alcool ou stupéfiants ? true/false")
    },
    async ({ nb_sinistres_responsable, nb_sinistres_non_responsable, nb_bris_glace, nb_vol_incendie, retrait_permis, alcool_drogue }) => {
      const risque = (nb_sinistres_responsable >= 2 || retrait_permis || alcool_drogue)
        ? "🔴 Profil aggravé — tarification majorée applicable"
        : nb_sinistres_responsable === 1
        ? "🟡 Profil standard — légère majoration"
        : "🟢 Bon profil — aucune majoration";
      return {
        content: [{
          type: "text",
          text: `📋 **MatDevis — Historique sinistres enregistré**\n\n` +
            `• Sinistres responsables : **${nb_sinistres_responsable}**\n` +
            `• Sinistres non responsables : **${nb_sinistres_non_responsable}**\n` +
            `• Bris de glace : **${nb_bris_glace}**\n` +
            `• Vol / Incendie : **${nb_vol_incendie}**\n` +
            `• Retrait de permis : **${retrait_permis ? "Oui ⚠️" : "Non"}**\n` +
            `• Sinistre alcool/drogue : **${alcool_drogue ? "Oui 🔴" : "Non"}**\n\n` +
            `${risque}\n\n` +
            `➡️ Étape suivante : choisir votre formule d'assurance.\n` +
            `Appelez **@MatDevis** avec l'outil *formules* pour voir les offres disponibles.`
        }]
      };
    }
  );

  // ─────────────────────────────────────────────
  // ÉTAPE 4 — PRÉSENTATION DES FORMULES
  // ─────────────────────────────────────────────
  server.tool(
    "matdevis_formules",
    "Présenter les formules d'assurance auto disponibles",
    {
      bonus_malus: z.number().describe("Coefficient bonus-malus du souscripteur"),
      valeur_vehicule: z.number().describe("Valeur catalogue du véhicule en euros"),
      annee_vehicule: z.number().int().describe("Année du véhicule")
    },
    async ({ bonus_malus, valeur_vehicule, annee_vehicule }) => {
      const age = new Date().getFullYear() - annee_vehicule;
      const base = valeur_vehicule * 0.04 * bonus_malus;
      const rc = Math.round(base * 0.5);
      const tiers = Math.round(base * 0.75);
      const tiersp = Math.round(base * 0.9);
      const tous = Math.round(base * 1.2);

      return {
        content: [{
          type: "text",
          text: `🛡️ **MatDevis — Formules disponibles**\n\n` +
            `Basé sur votre profil et votre véhicule (${age} ans d'âge) :\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `**1️⃣ Formule RESPONSABILITÉ CIVILE**\n` +
            `• Garanties : RC seule (obligatoire)\n` +
            `• ✅ Dommages causés aux tiers\n` +
            `• ❌ Pas de protection de votre véhicule\n` +
            `• 💶 Estimation : **${rc} €/an** (${Math.round(rc/12)} €/mois)\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `**2️⃣ Formule TIERS**\n` +
            `• Garanties : RC + Vol + Incendie + Bris de glace\n` +
            `• ✅ Protection vol et incendie incluse\n` +
            `• ❌ Dommages collision non couverts\n` +
            `• 💶 Estimation : **${tiers} €/an** (${Math.round(tiers/12)} €/mois)\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `**3️⃣ Formule TIERS PLUS**\n` +
            `• Garanties : Tiers + Dommages collision toutes causes\n` +
            `• ✅ Collision, tentative de vol, catastrophes naturelles\n` +
            `• ❌ Franchise de 300 €\n` +
            `• 💶 Estimation : **${tiersp} €/an** (${Math.round(tiersp/12)} €/mois)\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `**4️⃣ Formule TOUS RISQUES** ⭐ Recommandée\n` +
            `• Garanties : Toutes causes + Assistance 0 km + Protection conducteur\n` +
            `• ✅ Couverture maximale, franchise réduite\n` +
            `• ✅ Véhicule de remplacement inclus\n` +
            `• 💶 Estimation : **${tous} €/an** (${Math.round(tous/12)} €/mois)\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `➡️ Quelle formule vous intéresse ?\n` +
            `Appelez **@MatDevis** avec l'outil *devis_final* en précisant votre choix.`
        }]
      };
    }
  );

  // ─────────────────────────────────────────────
  // ÉTAPE 5 — DEVIS FINAL (RÉCAPITULATIF COMPLET)
  // ─────────────────────────────────────────────
  server.tool(
    "matdevis_devis_final",
    "Générer le devis final complet avec récapitulatif de toutes les informations",
    {
      // Véhicule
      marque: z.string().describe("Marque du véhicule"),
      modele: z.string().describe("Modèle du véhicule"),
      annee: z.number().int().describe("Année du véhicule"),
      carburant: z.string().describe("Type de carburant"),
      valeur_catalogue: z.number().describe("Valeur catalogue en euros"),
      // Souscripteur
      date_naissance: z.string().describe("Date de naissance"),
      date_permis: z.string().describe("Date du permis"),
      bonus_malus: z.number().describe("Coefficient bonus-malus"),
      usage: z.string().describe("Usage du véhicule"),
      // Sinistralité
      nb_sinistres: z.number().int().describe("Nombre de sinistres responsables sur 3 ans"),
      // Formule choisie
      formule: z.enum(["Responsabilité Civile", "Tiers", "Tiers Plus", "Tous Risques"])
        .describe("Formule d'assurance choisie"),
      // Options
      protection_conducteur: z.boolean().describe("Option protection conducteur ? true/false"),
      assistance_0km: z.boolean().describe("Option assistance 0km ? true/false"),
      vehicule_remplacement: z.boolean().describe("Option véhicule de remplacement ? true/false")
    },
    async ({
      marque, modele, annee, carburant, valeur_catalogue,
      date_naissance, date_permis, bonus_malus, usage,
      nb_sinistres, formule, protection_conducteur,
      assistance_0km, vehicule_remplacement
    }) => {
      // Calcul prime de base
      const baseRate = formule === "Responsabilité Civile" ? 0.02
                     : formule === "Tiers" ? 0.03
                     : formule === "Tiers Plus" ? 0.036
                     : 0.048;

      let prime = valeur_catalogue * baseRate * bonus_malus;
      if (nb_sinistres === 1) prime *= 1.15;
      if (nb_sinistres >= 2) prime *= 1.35;
      if (protection_conducteur) prime += 45;
      if (assistance_0km) prime += 35;
      if (vehicule_remplacement) prime += 60;

      const primeAnnuelle = Math.round(prime);
      const primeMensuelle = Math.round(prime / 12);
      const ref = `MAT-${Date.now().toString().slice(-8)}`;

      return {
        content: [{
          type: "text",
          text: `\n` +
            `╔══════════════════════════════════════╗\n` +
            `║     🚗 DEVIS ASSURANCE AUTOMOBILE    ║\n` +
            `║           MatDevis Agent IA          ║\n` +
            `╚══════════════════════════════════════╝\n\n` +
            `📌 Référence : **${ref}**\n` +
            `📅 Date : **${new Date().toLocaleDateString("fr-FR")}**\n\n` +
            `━━━ 🚗 VÉHICULE ━━━━━━━━━━━━━━━━━━━━━\n` +
            `• ${marque} ${modele} — ${annee} — ${carburant}\n` +
            `• Valeur catalogue : ${valeur_catalogue.toLocaleString("fr-FR")} €\n\n` +
            `━━━ 👤 SOUSCRIPTEUR ━━━━━━━━━━━━━━━━━\n` +
            `• Né(e) le : ${date_naissance}\n` +
            `• Permis obtenu le : ${date_permis}\n` +
            `• Bonus-malus : ${bonus_malus} ${bonus_malus <= 0.8 ? "🏆" : bonus_malus <= 1 ? "✅" : "⚠️"}\n` +
            `• Usage : ${usage}\n\n` +
            `━━━ 📋 SINISTRALITÉ ━━━━━━━━━━━━━━━━━\n` +
            `• Sinistres responsables (3 ans) : ${nb_sinistres}\n` +
            `• Impact tarif : ${nb_sinistres === 0 ? "Aucun ✅" : nb_sinistres === 1 ? "+15% ⚠️" : "+35% 🔴"}\n\n` +
            `━━━ 🛡️ FORMULE CHOISIE ━━━━━━━━━━━━━━\n` +
            `• **${formule}**\n` +
            `• Protection conducteur : ${protection_conducteur ? "✅ Incluse (+45€)" : "❌ Non souscrite"}\n` +
            `• Assistance 0km : ${assistance_0km ? "✅ Incluse (+35€)" : "❌ Non souscrite"}\n` +
            `• Véhicule de remplacement : ${vehicule_remplacement ? "✅ Inclus (+60€)" : "❌ Non souscrit"}\n\n` +
            `━━━ 💶 TARIFICATION ━━━━━━━━━━━━━━━━━\n` +
            `┌─────────────────────────────────────┐\n` +
            `│  Prime annuelle :  **${primeAnnuelle} €/an**       │\n` +
            `│  Prime mensuelle : **${primeMensuelle} €/mois**     │\n` +
            `└─────────────────────────────────────┘\n\n` +
            `✅ Ce devis est valable **30 jours**.\n` +
            `📞 Pour souscrire, contactez votre conseiller\n` +
            `    en mentionnant la réf. **${ref}**\n\n` +
            `_Devis généré par MatDevis Agent IA — Non contractuel_`
        }]
      };
    }
  );

  return server;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://chatgpt.com");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, mcp-session-id");
  res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  res.on("close", () => {
    transport.close();
    server.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}
