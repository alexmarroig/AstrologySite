# Relatório de Auditoria Técnica - AstroLumen

## 1. Arquitetura Atual
O projeto é composto por dois backends principais que operam de forma complementar:
- **Node.js (Express):** Responsável pela gestão de usuários, autenticação (JWT), fluxo de pedidos (Orders), pagamentos (Stripe), e-mails, e o motor de "snippets" para interpretações.
- **Python (FastAPI):** Responsável pelo motor de cálculo astronômico (Swiss Ephemeris), cálculos de efemérides e integração de IA para interpretações via OpenAI.

---

## 2. Inventário de Endpoints

### Backend Node.js (Express)
| Método | Path | Auth | Descrição |
| :--- | :--- | :--- | :--- |
| POST | `/api/auth/register` | Pública | Registro de novos usuários |
| POST | `/api/auth/login` | Pública | Login e geração de JWT |
| POST | `/api/auth/refresh` | Pública | Renovação de token JWT |
| GET | `/api/auth/me` | JWT | Dados do usuário logado |
| POST | `/api/analysis/natal-chart` | JWT | Cálculo e preview de mapa natal |
| POST | `/api/analysis/solar-return` | JWT | Cálculo e preview de retorno solar |
| POST | `/api/analysis/synastry` | JWT | Cálculo de sinastria entre duas pessoas |
| POST | `/api/analysis/predictions` | JWT | Previsões astrológicas (trânsitos) |
| POST | `/api/analysis/progressions` | JWT | Progressões secundárias |
| GET | `/api/analysis/stats` | Pública | Estatísticas da base de interpretações |
| POST | `/api/payments/intent` | JWT | Criação de Payment Intent no Stripe |
| POST | `/api/orders/` | JWT | Criação de pedido e sessão de Checkout |
| POST | `/api/orders/:id/success` | Pública | Callback de sucesso do Stripe |
| GET | `/api/orders/` | JWT | Lista de pedidos do usuário |
| GET | `/api/orders/:id` | JWT | Detalhes de um pedido específico |
| POST | `/api/orders/:id/complete` | Admin | Marca pedido como concluído (Admin) |
| POST | `/api/orders/:id/notify` | JWT | Notifica a astróloga sobre novo pedido |
| GET | `/api/horoscope/daily` | Pública | Horóscopo do dia |
| GET | `/api/content/services` | Pública | Lista de serviços oferecidos |
| GET | `/api/admin/snippets` | Admin | Gestão de snippets de conteúdo |

### Backend Python (FastAPI)
| Método | Path | Auth | Descrição |
| :--- | :--- | :--- | :--- |
| GET | `/health` | Pública | Check de saúde do sistema |
| POST | `/v1/chart/natal` | Rate Limit | Cálculo bruto via Swiss Ephemeris |
| POST | `/v1/chart/solar-return` | Rate Limit | Cálculo de retorno solar |
| POST | `/v1/chart/progression` | Rate Limit | Cálculo de progressões |
| POST | `/v1/lunation` | Rate Limit | Fases da lua e lunações |
| POST | `/v1/report/doc` | Rate Limit | Geração de relatório em formato RTF |
| POST | `/v1/interpretation/ai` | Rate Limit | Interpretação via OpenAI (GPT-4) |

---

## 3. Bancos de Dados e Serviços

### Bancos de Dados
1.  **PostgreSQL (Principal):**
    *   Tabelas: `users`, `orders`, `analyses`, `analysis_cache`, `email_logs`, `newsletter_subscribers`.
    *   Tabelas de Interpretações: `planet_sign_interpretations`, `aspect_interpretations`, `house_sign_interpretations`.
2.  **SQLite (Python):**
    *   Tabela: `interpretations` (usada como base local para o FastAPI).
3.  **Redis:**
    *   Fila: `report-generation` gerenciada pelo **Bull**.

### Integrações Externas
- **Stripe:** Processamento de pagamentos e checkout.
- **OpenAI:** Geração de sínteses e análises personalizadas.
- **AWS S3:** Armazenamento de relatórios gerados (.doc).
- **Nodemailer:** Envio de e-mails transacionais.
- **Nominatim (OSM):** Geocoding para conversão de nomes de cidades em lat/long.

---

## 4. Testes e Qualidade

### Node.js (Jest)
- **Integração:** `tests/integration/app.test.js` (Cobre fluxo de Auth e Natal).
- **Unitários:** Validação de esquemas de conteúdo e snippets.
- **Estado Atual:** ❌ Falhas detectadas por ausência da biblioteca `supertest` e erros de sintaxe no `snippet-resolver.test.js`.

### Python (Pytest)
- **Cálculos:** Testes de efemérides, aspectos e fusos horários.
- **Mocks:** Teste de rota com `ASTRO_MOCK_MODE`.
- **Estado Atual:** ❌ Falhas detectadas por ausência de dependências no ambiente (`fastapi`, `swisseph`, `dateutil`).

---

## 5. Plano de Melhorias Priorizado

### P0: Crítico (Infraestrutura)
- [ ] **Unificação de Dados:** Mover as interpretações do SQLite (Python) para o PostgreSQL (Node).
- [ ] **Sistema de Migrations:** Implementar Prisma/Knex no Node e Alembic no Python.
- [ ] **Persistência Docker:** Corrigir Dockerfile para garantir que arquivos de efemérides e bancos locais não sejam perdidos.

### P1: Importante (Performance)
- [ ] **Cache de Geocoding:** Implementar cache em Redis para evitar bloqueios no Nominatim.
- [ ] **Geração Assíncrona:** Mover a geração de `.doc` totalmente para workers em segundo plano.
- [ ] **Logs Estruturados:** Substituir logs comuns por formato JSON (Pino/Winston).

### P2: Estratégico (Evolução)
- [ ] **Migração TypeScript:** Adicionar tipagem estática no backend Node.js.
- [ ] **OpenAPI Unified:** Gerar um Swagger único para todo o ecossistema AstroLumen.
