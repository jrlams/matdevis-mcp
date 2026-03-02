export const widgetHtml = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 16px;
      background-color: #f9f9f9;
      color: #333;
    }
    .card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      padding: 16px;
      border: 1px solid #e0e0e0;
    }
    .header {
      font-size: 1.2em;
      font-weight: bold;
      margin-bottom: 12px;
      color: #007bff;
      border-bottom: 2px solid #007bff;
      padding-bottom: 4px;
    }
    .section {
      margin-bottom: 12px;
    }
    .section-title {
      font-weight: bold;
      font-size: 0.9em;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 4px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .label {
      color: #888;
      font-size: 0.85em;
    }
    .value {
      font-weight: 500;
    }
    .price-box {
      background: #e7f3ff;
      padding: 12px;
      border-radius: 6px;
      text-align: center;
      margin-top: 16px;
    }
    .price-label {
      font-size: 0.9em;
      color: #555;
    }
    .price-value {
      font-size: 1.5em;
      font-weight: bold;
      color: #0056b3;
    }
    .footer {
      font-size: 0.75em;
      color: #999;
      margin-top: 12px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div id="app" class="card" style="display: none;">
    <div class="header">🚗 Devis Assurance MatDevis</div>

    <div class="section">
      <div class="section-title">Véhicule</div>
      <div class="grid">
        <div>
          <div class="label">Marque & Modèle</div>
          <div class="value" id="vehicule-nom">-</div>
        </div>
        <div>
          <div class="label">Année & Carburant</div>
          <div class="value" id="vehicule-info">-</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Souscripteur</div>
      <div class="grid">
        <div>
          <div class="label">Bonus-Malus</div>
          <div class="value" id="bonus-malus">-</div>
        </div>
        <div>
          <div class="label">Usage</div>
          <div class="value" id="usage">-</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Formule</div>
      <div class="value" id="formule-nom">-</div>
    </div>

    <div class="price-box">
      <div class="price-label">Tarif Annuel</div>
      <div class="price-value" id="prix-annuel">- €</div>
      <div class="price-label" id="prix-mensuel" style="margin-top: 4px; font-size: 0.8em;">- €/mois</div>
    </div>

    <div class="footer">
      Référence : <span id="ref-devis">-</span><br>
      Devis valable 30 jours
    </div>
  </div>

  <div id="loading">Chargement du devis...</div>

  <script>
    function render(data) {
      if (!data) return;

      document.getElementById('loading').style.display = 'none';
      document.getElementById('app').style.display = 'block';

      if (data.marque && data.modele) {
        document.getElementById('vehicule-nom').textContent = data.marque + ' ' + data.modele;
      }
      if (data.annee && data.carburant) {
        document.getElementById('vehicule-info').textContent = data.annee + ' (' + data.carburant + ')';
      }
      if (data.bonus_malus !== undefined) {
        document.getElementById('bonus-malus').textContent = data.bonus_malus;
      }
      if (data.usage) {
        document.getElementById('usage').textContent = data.usage;
      }
      if (data.formule) {
        document.getElementById('formule-nom').textContent = data.formule;
      }
      if (data.annuel !== undefined) {
        document.getElementById('prix-annuel').textContent = data.annuel + ' €';
      }
      if (data.mensuel !== undefined) {
        document.getElementById('prix-mensuel').textContent = data.mensuel + ' €/mois';
      }
      if (data.ref) {
        document.getElementById('ref-devis').textContent = data.ref;
      }
    }

    // Handle initial data if available via window.openai
    if (window.openai && window.openai.toolOutput) {
      render(window.openai.toolOutput);
    }

    // Listen for updates
    window.addEventListener('message', (event) => {
      if (event.source !== window.parent) return;
      const message = event.data;
      if (!message || message.jsonrpc !== "2.0") return;

      if (message.method === "ui/notifications/tool-result") {
        render(message.params?.structuredContent);
      }
    }, { passive: true });

    // Also listen for Apps SDK specific event
    window.addEventListener('openai:set_globals', (event) => {
      render(event.detail?.globals?.toolOutput);
    }, { passive: true });
  </script>
</body>
</html>
`.trim();
