# AstroLumen API

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

## Variáveis de ambiente

| Variável | Descrição | Default |
| --- | --- | --- |
| `ASTRO_MOCK_MODE` | Retorna resposta mock sem chamar Swiss Ephemeris | `false` |
| `ASTRO_EPHEMERIS_PATH` | Caminho para arquivos ephemeris (opcional) | `null` |
| `ASTRO_RATE_LIMIT_ENABLED` | Habilita rate limit simples | `true` |
| `ASTRO_RATE_LIMIT_REQUESTS` | Número de requisições por janela | `30` |
| `ASTRO_RATE_LIMIT_WINDOW_SECONDS` | Janela em segundos | `60` |
| `ASTRO_GEOCODE_USER_AGENT` | User agent para Nominatim | `astrolumen-api` |

## Endpoints

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
