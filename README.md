# AstroLumen API

## Node/Express (atual)

Este repositório contém um backend Node/Express para o AstroLumen, com conteúdo versionado em JSON e geração programática de relatórios DOCX.

### Testes

```bash
npm test
```

O comando usa o runner nativo do Node (`node --test`) para evitar dependências externas. Se o registry interno bloquear downloads (erro 403), configure o registry padrão:

```bash
npm config set registry https://registry.npmjs.org/
```

### Seeds e manutenção

```bash
npm run seed:services
npm run prune:analytics
```

Backend em FastAPI para cálculo de mapa natal usando Swiss Ephemeris (pyswisseph).

## Stack
- FastAPI + Pydantic
- pyswisseph (Swiss Ephemeris)
- geopy + Nominatim (geocoding)
- timezonefinder + zoneinfo

## Setup local

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

uvicorn app.main:app --reload
```

## Git LFS

Os templates `.docx` ficam sob Git LFS em `templates/*.docx`. Em ambientes de CI/PR builder, instale o Git LFS e faça o pull dos arquivos após o checkout:

```bash
git lfs install
git lfs pull
```

## Variáveis de ambiente

| Variável | Descrição | Default |
| --- | --- | --- |
| `ASTRO_MOCK_MODE` | Retorna resposta mock sem chamar Swiss Ephemeris | `false` |
| `ASTRO_EPHEMERIS_PATH` | Caminho para arquivos ephemeris (opcional) | `null` |
| `ASTRO_RATE_LIMIT_ENABLED` | Habilita rate limit simples | `true` |
| `ASTRO_RATE_LIMIT_REQUESTS` | Número de requisições por janela | `30` |
| `ASTRO_RATE_LIMIT_WINDOW_SECONDS` | Janela em segundos | `60` |
| `ASTRO_GEOCODE_USER_AGENT` | User agent para Nominatim | `astrolumen-api` |
| `ASTRO_CORS_ORIGINS` | Lista CSV de origens permitidas no CORS | `http://localhost:5173` |
| `ADMIN_EMAIL` | Email da administradora (Camila) | `camila@astrolumen.com` |
| `IP_HASH_SALT` | Salt para hash de IP no tracking | `astrolumen` |
| `ANALYTICS_RATE_LIMIT_MAX` | Limite de eventos por janela | `30` |
| `ANALYTICS_RATE_LIMIT_WINDOW_MS` | Janela de rate limit (ms) | `60000` |
| `ANALYTICS_RETENTION_DAYS` | Retenção de eventos analytics | `90` |
| `STRIPE_WEBHOOK_SECRET` | Segredo de assinatura do webhook Stripe | `-` |
| `STRIPE_SUCCESS_URL` | URL de sucesso do checkout | `https://astrolumen.com/checkout/success` |
| `STRIPE_CANCEL_URL` | URL de cancelamento do checkout | `https://astrolumen.com/checkout/cancel` |

## Endpoints

### Admin, Analytics, Serviços e Pedidos (Node/Express)

```bash
# tracking
curl -X POST http://localhost:3000/v1/analytics/track \
  -H "Content-Type: application/json" \
  -d '{"event":"page_view","page":"/","session_id":"uuid","ts":"2025-01-01T12:00:00Z"}'

# serviços
curl http://localhost:3000/v1/services

# criar pedido
curl -X POST http://localhost:3000/v1/orders \
  -H "Content-Type: application/json" \
  -d '{"service_id":1,"customer_name":"Ana","birth_date":"1990-01-01","birth_time":"08:00","birth_place_text":"São Paulo"}'

# resumo analytics (admin)
curl http://localhost:3000/v1/analytics/summary?from=2025-01-01&to=2025-01-31 \
  -H "Authorization: Bearer <token>"
```

### GET /health

```bash
curl http://localhost:8000/health
```

### POST /v1/chart/natal

```bash
curl -X POST http://localhost:8000/v1/chart/natal \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Ada Lovelace",
    "birth_date": "1815-12-10",
    "birth_time": "10:00",
    "birth_place": "London, UK",
    "language": "pt-BR",
    "house_system": "P",
    "zodiac": "tropical",
    "sidereal_mode": "LAHIRI",
    "aspects": {
      "orbs": {
        "conjunction": 8,
        "opposition": 8,
        "square": 6,
        "trine": 6,
        "sextile": 4
      }
    }
  }'
```

### POST /v1/chart/solar-return

```bash
curl -X POST http://localhost:8000/v1/chart/solar-return \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Ada Lovelace",
    "birth_date": "1815-12-10",
    "birth_time": "10:00",
    "birth_place": "London, UK",
    "target_year": 2025
  }'
```

### POST /v1/chart/progression

```bash
curl -X POST http://localhost:8000/v1/chart/progression \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Ada Lovelace",
    "birth_date": "1815-12-10",
    "birth_time": "10:00",
    "birth_place": "London, UK",
    "target_date": "2025-05-10"
  }'
```

### POST /v1/lunation

```bash
curl -X POST http://localhost:8000/v1/lunation \
  -H "Content-Type: application/json" \
  -d '{
    "reference_date": "2025-05-10",
    "phase": "new",
    "language": "pt-BR"
  }'
```

### POST /v1/report/doc

```bash
curl -X POST http://localhost:8000/v1/report/doc \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Ada Lovelace",
    "birth_date": "1815-12-10",
    "birth_time": "10:00",
    "birth_place": "London, UK"
  }' --output astrolumen-report.doc
```

### POST /v1/interpretation/ai

```bash
curl -X POST http://localhost:8000/v1/interpretation/ai \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Ada Lovelace",
    "birth_date": "1815-12-10",
    "birth_time": "10:00",
    "birth_place": "London, UK",
    "focus": "general",
    "language": "pt-BR"
  }'
```

### Resposta esperada (exemplo)

```json
{
  "metadata": {
    "full_name": "Ada Lovelace",
    "birth_place": "London, Greater London, England, United Kingdom",
    "birth_date": "1815-12-10",
    "birth_time": "10:00:00",
    "timezone": "Europe/London",
    "utc_datetime": "1815-12-10T10:00:00Z",
    "latitude": 51.5074,
    "longitude": -0.1278,
    "zodiac": "tropical",
    "house_system": "P",
    "sidereal_mode": "LAHIRI",
    "ephemeris_flags": ["TROPICAL"]
  },
  "points": {
    "asc": {"sign": "Áries", "degree": 10, "minute": 20},
    "mc": {"sign": "Capricórnio", "degree": 5, "minute": 12}
  },
  "houses": [
    {"index": 1, "longitude": 15.0, "sign": "Áries", "degree": 15, "minute": 0}
  ],
  "planets": [
    {
      "name": "Sun",
      "longitude": 15.0,
      "latitude": 0.0,
      "speed": 1.0,
      "sign": "Áries",
      "degree": 15,
      "minute": 0,
      "house": 1,
      "retrograde": false
    }
  ],
  "aspects": [
    {
      "planet1": "Sun",
      "planet2": "Moon",
      "type": "conjunction",
      "exact_angle": 0,
      "orb": 2.0,
      "applying": true
    }
  ],
  "summary": ["Sol em Áries", "Lua em Touro", "Ascendente em Áries", "MC em Capricórnio"]
}
```

## Estrutura de projeto

```
app/
  api/
    models.py
    routes.py
  astro/
    aspects.py
    ephemeris.py
    geocode.py
    houses.py
    timezone.py
  core/
    config.py
    logging.py
  utils/
    rate_limit.py
    signs.py
  main.py

openapi.json
Dockerfile
requirements.txt
tests/
```

## Deploy no Render

1. Suba o repositório no GitHub.
2. Crie um novo Web Service no Render.
3. Configure:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
4. Adicione as variáveis de ambiente necessárias (ex: `ASTRO_MOCK_MODE=false`).
5. Faça deploy.

## Exemplo de integração frontend (React Query)

```tsx
import { useMutation } from '@tanstack/react-query';

const useNatalChart = () =>
  useMutation({
    mutationFn: async (payload) => {
      const response = await fetch('/v1/chart/natal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error('Erro ao gerar mapa');
      }
      return response.json();
    },
  });
```

## Observações
- O endpoint utiliza Nominatim para geocoding. Recomendado cache interno e respeito a limites de uso.
- O cálculo usa hora local convertida para UTC com zoneinfo, incluindo histórico de DST quando disponível.
- Para mock: `ASTRO_MOCK_MODE=true`.
