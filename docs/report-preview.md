# Report preview & tokens

Este documento descreve o formato retornado no campo `report_preview` das rotas de análise e
como os tokens são gerados para montar o relatório (preview e DOCX).

## Formato de `report_preview`

```json
{
  "content_version": "v1",
  "tokens": [
    "sun_capricorn",
    "sun_house_1",
    "sun_capricorn_house_1",
    "aspect_sun_sextile_moon",
    "sun_sextile_moon_house_3"
  ],
  "sections": {
    "resumo": [
      {
        "type": "planet_sign_house",
        "key": "sun_capricorn_house_1",
        "title": "Sol em Capricórnio na Casa 1",
        "text_md": "Texto do trecho...",
        "priority": 90,
        "service_scopes": ["natal"],
        "tags": ["identidade"]
      }
    ],
    "identidade": [],
    "relacoes": [],
    "carreira": [],
    "ciclos": []
  }
}
```

### Campos

- `content_version`: versão do conteúdo usada para selecionar trechos.
- `tokens`: lista ordenada de tokens gerados a partir do resultado da análise.
- `sections`: trechos agrupados pelo resolvedor (`resumo`, `identidade`, `relacoes`, `carreira`, `ciclos`).

## Regras de tokens por serviço

### Mapa natal (`natal`/`natal_chart`)

Para cada planeta com signo e casa:
- `planet_sign` → `sun_capricorn`
- `planet_house` → `sun_house_1`
- `planet_sign_house` → `sun_capricorn_house_1`

Para cada aspecto:
- `aspect` → `aspect_sun_sextile_moon`
- `aspect_house` → `sun_sextile_moon_house_3` (quando a casa é resolvida)

### Revolução solar (`solar_return`)

Mesmo conjunto do mapa natal (planetas, casas e aspectos), usando o resultado da revolução solar.

### Sinastria (`synastry`)

- Aspectos entre os mapas:
  - `aspect` → `aspect_venus_trine_mars`
  - `aspect_house` → `venus_trine_mars_house_7` (quando casa é conhecida)

### Trânsitos (`predictions`)

Com base em `current_transits`:
- `planet_sign`, `planet_house`, `planet_sign_house`

### Progressões (`progressions`)

Quando não há dados de planetas/casas, os tokens retornam vazios.

## Integração no DOCX

O gerador DOCX (`app/utils/report.js`) aceita `reportPreview` opcional para incluir as seções
resolvidas no relatório final.

