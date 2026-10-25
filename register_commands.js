require('dotenv').config();
const { Client, REST, Routes, GatewayIntentBits } = require('discord.js');

// --- CONFIGURAÇÕES ---
const GUILD_ID = process.env.GUILD_ID || '1252997988909973565'; // Servidor Principal (Hierarquia)
const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN) {
    console.error('\n❌ ERRO CRÍTICO: Token não encontrado no arquivo .env');
    console.error('👉 Abra o arquivo .env e configure: DISCORD_TOKEN=seu_token_aqui\n');
    process.exit(1);
}

if (!GUILD_ID) {
    console.error('\n❌ ERRO: GUILD_ID não encontrado no arquivo .env');
    console.error('👉 Abra o arquivo .env e configure: GUILD_ID=seu_servidor_id_aqui\n');
    process.exit(1);
}

// Lista de comandos para registrar
const commands = [
    {
        name: 'atualizar',
        description: 'Atualiza o painel de hierarquia manualmente (Admin)',
    },
    {
        name: 'verificar-semanaatual',
        description: 'Verifica parcial da semana atual (NÃO SALVA no site)',
    },
    {
        name: 'verificar-semanapassada',
        description: 'Fecha a semana anterior e SALVA os dados no site',
    },
    {
        name: 'limpar-vendas',
        description: 'Limpa o histórico de vendas/kits do site (Admin)',
    },
    {
        name: 'adicionar-kits',
        description: 'Adiciona manualmente kits às vendas de um membro',
        options: [
            {
                name: 'usuario',
                description: 'Usuário do Discord',
                type: 6, // USER
                required: true,
            },
            {
                name: 'kits',
                description: 'Quantidade de Kits',
                type: 4, // INTEGER
                required: true,
            },
            {
                name: 'horas',
                description: 'Horas trabalhadas (Opcional)',
                type: 10, // NUMBER
                required: false,
            },
            {
                name: 'id_cidade',
                description: 'ID na Cidade (Opcional)',
                type: 4, // INTEGER
                required: false,
            }
        ]
    },
    {
        name: 'remover-vendas',
        description: 'Remove (subtrai) manualmente kits de um membro (Correção de erros)',
        options: [
            {
                name: 'usuario',
                description: 'Usuário do Discord',
                type: 6, // USER
                required: true,
            },
            {
                name: 'kits',
                description: 'Quantidade de Kits a REMOVER',
                type: 4, // INTEGER
                required: true,
            }
        ]
    },
    {
        name: 'setar-bau',
        description: 'Define o total de kits colocados no baú para venda (Admin)',
        options: [
            {
                name: 'total',
                description: 'Total de kits disponíveis no baú',
                type: 4, // INTEGER
                required: true,
            }
        ]
    },
    {
        name: 'status-vendas',
        description: 'Exibe o painel de progresso de vendas de kits',
    },
    {
        name: 'painel-mensagens',
        description: 'Abre o painel visual para gerenciar mensagens automáticas (Adicionar/Editar/Remover)',
    },
];

// Cliente auxiliar apenas para pegar o ID do Bot
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

console.log('⏳ Iniciando Script de Registro de Comandos...');

client.once('ready', async () => {
    try {
        console.log(`🤖 Bot logado como: ${client.user.tag}`);
        const CLIENT_ID = client.user.id;
        console.log(`🆔 ID do Bot detectado: ${CLIENT_ID}`);

        const rest = new REST({ version: '10' }).setToken(TOKEN);

        console.log(`⚙️  Registrando ${commands.length} comandos no servidor ${GUILD_ID}...`);

        // Registra os comandos (sobrescreve os antigos)
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands },
        );

        console.log('\n✅ SUCESSO! Comandos registrados/atualizados.');
        console.log('👉 Agora você pode reiniciar o bot e digitar /fechar-semana no Discord.\n');

    } catch (error) {
        console.error('\n❌ ERRO durante o registro:', error);
    } finally {
        client.destroy();
        process.exit(0);
    }
});

client.login(TOKEN).catch(err => {
    console.error('\n❌ ERRO ao conectar no Discord. Verifique se o Token no arquivo .env está correto.');
    console.error(err.message);
    process.exit(1);
});
