# Tracking & Admin API (AstroLumen)

## Tracking (server-side + frontend)

### POST `/v1/track`
Registra eventos de analytics.

**Body**
```json
{
  "event_name": "page_view",
  "anonymous_id": "anon_123",
  "session_id": "sess_456",
  "page_url": "https://astrolumen.com/servicos/mapa-astral",
  "referrer": "https://google.com",
  "service_slug": "mapa-astral",
  "payload": { "scroll_depth": 75 },
  "utm": {
    "source": "google",
    "medium": "cpc",
    "campaign": "brand",
    "content": "ad-1",
    "term": "mapa astral"
  }
}
```

**Respostas**
- `201`: `{ "status": "ok" }`
- `200`: `{ "status": "consent_required" }` (sem consentimento para analytics)

### POST `/v1/identify`
Vincula o `anonymous_id` a um usuário ou lead.

**Body (usuário existente)**
```json
{
  "anonymous_id": "anon_123",
  "user_id": 42,
  "utm": { "source": "google", "campaign": "brand" }
}
```

**Body (lead)**
```json
{
  "anonymous_id": "anon_123",
  "email": "lead@email.com",
  "whatsapp": "+55 11 99999-9999",
  "name": "Lead Exemplo",
  "utm": { "source": "instagram", "campaign": "relacionamento" }
}
```

## Admin

### Autenticação
`POST /v1/auth/login-admin` com email/senha.

### Dashboard
- `GET /v1/admin/overview?from&to`
- `GET /v1/admin/funnel?from&to&service_slug`
- `GET /v1/admin/users?search&from&to`
- `GET /v1/admin/leads?search&from&to`
- `GET /v1/admin/orders?status&service_slug&from&to`
- `GET /v1/admin/traffic?group_by=utm_source|utm_campaign|page_url`
- `GET /v1/admin/user/:id/timeline`

### LGPD
- `GET /v1/admin/user/:id/export`
- `DELETE /v1/admin/user/:id`
