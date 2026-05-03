# Portal D4 — Protocolo 4D

Sistema web privado para terapeuta e clientes, onde o cliente responde um diário diário estruturado e a terapeuta acompanha respostas, histórico e relatórios.

## Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS (paleta customizada)
- Supabase (Auth + PostgreSQL)
- react-router-dom v6

## Pré-requisitos

- Node.js 18+
- Conta no Supabase

## Rodando localmente

1. Clone o repositório
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Copie `.env.example` para `.env` e preencha as variáveis:
   ```bash
   cp .env.example .env
   ```
4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave pública (anon) do Supabase |

## Criar conta da terapeuta

Após configurar o Supabase, crie a terapeuta diretamente pelo painel do Supabase:

1. Acesse **Authentication > Users** e clique em **Add User**
2. Preencha e-mail e senha
3. Execute no SQL Editor:
   ```sql
   UPDATE profiles
   SET role = 'therapist', name = 'Nome da Terapeuta'
   WHERE email = 'terapeuta@email.com';
   ```

## Perfis

| Perfil | Acesso |
|---|---|
| `therapist` | Dashboard, clientes, diários, relatórios |
| `client` | Diário ativo, histórico, relatórios publicados |

## Build para produção

```bash
npm run build
```

O conteúdo de `dist/` pode ser deployado na Vercel ou qualquer host estático.

## Deploy na Vercel

1. Conecte o repositório na Vercel
2. Configure as variáveis de ambiente no painel da Vercel
3. A Vercel detecta automaticamente o Vite

## Estrutura de pastas

```
src/
├── components/
│   ├── layout/      # TherapistLayout, ClientLayout
│   └── ui/          # Button, Input, Card, Modal, etc.
├── contexts/
│   └── AuthContext.tsx
├── lib/
│   ├── supabase.ts
│   ├── database.types.ts
│   └── format.ts
└── pages/
    ├── Login.tsx
    ├── therapist/   # Dashboard, Clients, Diaries, Reports
    └── client/      # DiaryPage, DiaryHistory, ClientReports
```
