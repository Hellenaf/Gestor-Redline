# 🤖 Gestor Redline — Bot de Gestão para Discord

Bot avançado para **Discord** desenvolvido em **Node.js** com [Discord.js v14](https://discord.js.org/), integrado em tempo real com o **Google Firebase Firestore**. Criado para automação e gestão completa de equipes/facções no GTA RP, abrangendo fechamento semanal de metas, controle de vendas de kits, cálculo de horas trabalhadas, rankings e sincronização de hierarquia.

---

## ⚡ Principais Recursos

- 📊 **Fechamento de Semanas Automatizado**:
  - Parciais da semana em andamento sem persistência (`/verificar-semanaatual`).
  - Fechamento oficial com persistência no Firebase e sincronização com o painel web (`/verificar-semanapassada`).
- 📦 **Controle de Vendas de Kits & Baú**:
  - Registro de kits vendidos manualmente ou via logs (`/adicionar-kits`, `/remover-vendas`).
  - Definição do total de kits no baú (`/setar-bau`).
  - Painel visual do progresso de vendas em tempo real (`/status-vendas`).
  - Limpeza de histórico de vendas para início de novo ciclo (`/limpar-vendas`).
- 👑 **Hierarquia e Patentes**:
  - Varredura de membros do servidor e montagem da hierarquia organizada por cargos e emojis (`/atualizar`).
  - Painel interativo fixo com botões para promover, rebaixar ou exonerar membros.
  - Sincronização automática com a coleção do Firestore consumida pelo painel web.
- 📢 **Automação de Mensagens Agendadas**:
  - Painel interativo para criar, editar e programar mensagens automáticas periódicas em canais do Discord (`/painel-mensagens`).
- 🌟 **Rankings & Metas**:
  - Cálculo de horas mínimas exigidas por cargo.
  - Atribuição automática de cargos para Top Horas (15h+), Top Recrutador e Boosters.

---

## 📋 Lista de Comandos Slash

| Comando | Descrição | Permissão |
| :--- | :--- | :--- |
| `/atualizar` | Atualiza manualmente o painel fixo de hierarquia no canal configurado | Admin |
| `/verificar-semanaatual` | Gera relatório parcial da semana corrente (NÃO salva no Firebase) | Membro / Admin |
| `/verificar-semanapassada`| Fecha a semana anterior, gera relatório completo e SALVA no Firebase | Admin |
| `/status-vendas` | Exibe o embed com barra de progresso e estatísticas de vendas do baú | Todos |
| `/adicionar-kits` | Adiciona kits vendidos, horas e ID da cidade para um membro | Admin |
| `/remover-vendas` | Subtrai kits da contagem de um membro (correção de erros) | Admin |
| `/setar-bau` | Define o estoque inicial de kits disponíveis para venda no baú | Admin |
| `/limpar-vendas` | Zera o histórico de vendas de todos os membros no banco de dados | Admin |
| `/painel-mensagens` | Abre o painel visual de gerenciamento de mensagens automáticas agendadas | Admin |

---

## 🛠️ Tecnologias

- **Linguagem**: JavaScript (Node.js 18+)
- **Biblioteca Discord**: `discord.js` v14
- **Banco de Dados**: `firebase` v12 (Cloud Firestore & Authentication)
- **Manipulação de Planilhas**: `xlsx` (SheetJS)
- **Requisições HTTP**: `axios`
- **Ambiente**: `dotenv`

---

## ⚙️ Instalação e Configuração Passo a Passo

### 1. Clonar e Instalar Dependências
```bash
# Instale os pacotes necessários
npm install
```

### 2. Configurar o Bot no Discord Developer Portal
1. Acesse o [Discord Developer Portal](https://discord.com/developers/applications).
2. Clique em **New Application** e defina um nome para o seu bot.
3. No menu lateral, acesse a aba **Bot**:
   - Clique em **Reset Token** para gerar e copiar o token do bot.
   - Na seção **Privileged Gateway Intents**, **ATIVE** obrigatoriamente:
     - ✅ **Server Members Intent** (necessário para ler cargos e membros)
     - ✅ **Message Content Intent** (necessário para ler mensagens em canais de log)
4. No menu lateral, acesse **OAuth2 > URL Generator**:
   - Em *Scopes*, marque `bot` e `applications.commands`.
   - Em *Bot Permissions*, selecione `Administrator` (ou permissões para gerenciar cargos, canais e mensagens).
   - Copie o link gerado e abra no navegador para adicionar o bot ao seu servidor do Discord.

### 3. Configurar o Firebase Firestore
1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/).
2. Ative o **Cloud Firestore** em modo de produção/teste.
3. Ative a **Autenticação Anônima** em *Authentication > Sign-in method*.
4. Obtenha as credenciais da aplicação web em *Configurações do Projeto > Seus Aplicativos*.

### 4. Configurar as Variáveis de Ambiente (`.env`)
Copie o arquivo de exemplo `.env.example` para `.env`:
```bash
cp .env.example .env
```
Abra o `.env` e preencha as credenciais:
```env
DISCORD_TOKEN=seu_token_do_bot
GUILD_ID=id_do_seu_servidor_discord

FIREBASE_API_KEY=sua_api_key_firebase
FIREBASE_PROJECT_ID=id_do_seu_projeto_firebase
FIREBASE_APP_ID=id_do_app_firebase
FIREBASE_MESSAGING_SENDER_ID=seu_messaging_sender_id
```

### 5. Ajustar IDs de Canais e Cargos
No arquivo `index.js`, você pode personalizar o objeto `CONFIG` (ou definir as variáveis de mesmo nome no seu `.env`):
- `CHANNEL_ID`: ID do canal onde o painel fixo de hierarquia será postado.
- `REPORT_CHANNEL_ID`: ID do canal onde os relatórios semanais são enviados.
- `SALES_LOG_CHANNEL_ID`: ID do canal onde mensagens/webhooks de log de vendas chegam.
- `TOP_HOURS_ROLE_ID`, `BOOSTER_ROLE_ID`, etc.: IDs dos cargos correspondentes.

Verifique também o array `HIERARQUIA` em `index.js` para mapear os nomes, IDs de cargo e emojis de cada patente do seu servidor.

### 6. Registrar os Comandos Slash no Discord
Antes de iniciar o bot pela primeira vez (ou sempre que modificar a lista de comandos), registre os comandos no servidor:
```bash
npm run register
# ou: node register_commands.js
```
Aguarde a mensagem de confirmação: `✅ SUCESSO! Comandos registrados/atualizados.`

### 7. Iniciar o Bot
```bash
npm start
# ou: node index.js
```

---

## 🚀 Execução em Produção (PM2)

Para manter o bot online 24/7 na sua VPS ou servidor dedicado:

```bash
# Instalar o PM2 globalmente
npm install -g pm2

# Iniciar o bot
pm2 start index.js --name "gestor-redline"

# Configurar para reiniciar com o sistema
pm2 save
pm2 startup
```

---

## 🔒 Segurança

- **NUNCA envie o arquivo `.env` para repositórios públicos**. Ele já está incluído no `.gitignore`.
- Mantenha o token do bot e as credenciais do Firebase sempre protegidos.
