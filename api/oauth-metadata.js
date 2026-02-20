export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://chatgpt.com");
  res.setHeader("Content-Type", "application/json");

  res.status(200).json({
    issuer: "https://dev-8kzl8se6eols07df.eu.auth0.com/",
    authorization_endpoint: "https://dev-8kzl8se6eols07df.eu.auth0.com/authorize",
    token_endpoint: "https://dev-8kzl8se6eols07df.eu.auth0.com/oauth/token",
    jwks_uri: "https://dev-8kzl8se6eols07df.eu.auth0.com/.well-known/jwks.json",
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["client_secret_post"],
    scopes_supported: ["openid", "profile", "matdevis:devis"],
    code_challenge_methods_supported: ["S256"]
  });
}
