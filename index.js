require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, Partials, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, ChannelSelectMenuBuilder, StringSelectMenuBuilder, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const xlsx = require('xlsx');
const axios = require('axios');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDoc, updateDoc, collection, addDoc, deleteDoc, getDocs } = require('firebase/firestore');
const { getAuth, signInAnonymously } = require('firebase/auth');

const CONFIG = {
    TOKEN: process.env.DISCORD_TOKEN,
    CHANNEL_ID: process.env.CHANNEL_ID || '1253003446244610108',       
    MESSAGE_ID: process.env.MESSAGE_ID || '1467192047231566049',       
    BASE_ROLE_ID: process.env.BASE_ROLE_ID || '1252997989144727719',     
    REPORT_CHANNEL_ID: process.env.REPORT_CHANNEL_ID || '1238572013707329718',
    MAIN_GUILD_ID: process.env.GUILD_ID || process.env.MAIN_GUILD_ID || '1252997988909973565', 

    RECRUIT_CHANNEL_ID: process.env.RECRUIT_CHANNEL_ID || '1257816172154458253',
    SPONSOR_CHANNEL_ID: process.env.SPONSOR_CHANNEL_ID || '1252997990168395924',

    AVISOS_CHANNEL_ID: process.env.AVISOS_CHANNEL_ID || '1252997990491361401',       
    TOP_HOURS_ROLE_ID: process.env.TOP_HOURS_ROLE_ID || '1252997989170155536',       

    TOP_RECRUITER_ROLE_ID: process.env.TOP_RECRUITER_ROLE_ID || '1425465043155419156', 

    BOOSTER_ROLE_ID: process.env.BOOSTER_ROLE_ID || '1253014613428277259',           

    SALES_LOG_CHANNEL_ID: process.env.SALES_LOG_CHANNEL_ID || '1238572013321322546', 

    ADMIN_LOG_ID: process.env.ADMIN_LOG_ID || '943628403528056923',                  

    IGNORED_USERS: process.env.IGNORED_USERS ? process.env.IGNORED_USERS.split(',') : ['713774125151289385']
};

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: `${process.env.FIREBASE_PROJECT_ID}.firebaseapp.com`,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: `${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

signInAnonymously(auth).then(() => {
    console.log("🔥 [FIREBASE] Bot conectado ao banco de dados!");
}).catch((error) => {
    console.error("🔥 [FIREBASE ERROR]", error);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,      
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel]
});

const HIERARQUIA = [
    {
        nome: 'Dono',
        emoji: '<:dono:1254804672498241752>',
        id: '1252997989178413084',
        manualTop: ['354741432113823746']
    },
    {
        nome: 'Diretor',
        emoji: '<:diretor:1325924722470293505>',
        id: '1252997989178413082'
    },
    {
        nome: 'Gerente',
        emoji: '<:gerente:1325924679373819926>',
        id: '1252997989178413081'
    },
    {
        nome: 'Conselheiro',
        emoji: '<:conselheiro:1325924679373819926>',
        id: '1336112376482758696'
    },
    {
        nome: 'Supervisor',
        emoji: '<:supervisor:1325924670452797600>',
        id: '1252997989170155540'
    },
    {
        nome: 'Recrutador',
        emoji: '<:recrutador:1325924684067504218>',
        id: '1252997989144727721'
    },
    {
        nome: 'Engenheiro',
        emoji: '<:engenheiro:1325924703994515476>',
        id: '1252997989170155533'
    },
    {
        nome: 'Especialista',
        emoji: '<:especialista:1325924708864233582>',
        id: '1252997989157437519'
    },
    {
        nome: 'Mecânico',
        emoji: '<:mecanico:1325924694309736579>',
        id: '1252997989157437517'
    },
    {
        nome: 'Estagiário',
        emoji: '<:estagiario:1325924713452671117>',
        id: '1252997989144727720'
    },
    {
        nome: 'Aposentado',
        emoji: '<:inss:1325924689645670511>',
        id: '1252997989157437516'
    }
];

async function sendLogDm(content) {
    if (!CONFIG.ADMIN_LOG_ID) return;
    try {
        const user = await client.users.fetch(CONFIG.ADMIN_LOG_ID);
        if (user) await user.send(content);
    } catch (e) {
        console.warn(`⚠️ [LOG DM] Não foi possível enviar log para ${CONFIG.ADMIN_LOG_ID}:`, e.message);
    }
}

async function atualizarPainel(guild) {
    console.log(`--- [PROCESSANDO] Atualização do painel HIERARQUIA em ${guild.name}... ---`);
    try {
        await guild.members.fetch();
        console.log(`👥 Membros sincronizados: ${guild.members.cache.size}`);

        let textoFinal = '';
        const jaListados = new Set();

        for (const item of HIERARQUIA) {
            const role = guild.roles.cache.get(item.id);
            let listaMembros = [];

            if (role) {
                
                listaMembros = role.members
                    .filter(m => !(CONFIG.IGNORED_USERS || []).includes(m.id))
                    .filter(m => m.roles.cache.has(CONFIG.BASE_ROLE_ID) || item.nome === 'Dono')
                    .map(m => m.toString());
            } else {
                console.warn(`⚠️ [Configuração] Cargo '${item.nome}' (ID: ${item.id}) não encontrado no servidor ${guild.name}.`);
            }

            if (item.manualTop && Array.isArray(item.manualTop)) {
                const manuaisFormatados = item.manualTop
                    .filter(id => !(CONFIG.IGNORED_USERS || []).includes(String(id)))
                    .map(id => `<@${id}>`);
                listaMembros = listaMembros.filter(m => !manuaisFormatados.includes(m));
                listaMembros = [...manuaisFormatados, ...listaMembros];
            }

            listaMembros = listaMembros.filter(m => !(CONFIG.IGNORED_USERS || []).some(id => m.includes(id)));
            listaMembros = listaMembros.filter(m => !jaListados.has(m));
            listaMembros.forEach(m => jaListados.add(m));

            textoFinal += `${item.emoji} **${item.nome}** (${listaMembros.length})\n`;

            if (listaMembros.length > 0) textoFinal += listaMembros.map(m => `・${m}`).join('\n'); 
            else textoFinal += '・Nenhum membro\n';

            textoFinal += '\n\n';
        }

        const data = new Date().toLocaleDateString('pt-BR');
        const hora = new Date().toLocaleTimeString('pt-BR');
        textoFinal += `||Última atualização: ${data} às ${hora}||`;

        const channel = guild.channels.cache.get(CONFIG.CHANNEL_ID);
        if (!channel) {
            console.error(`❌ [Configuração] Canal do Painel (ID: ${CONFIG.CHANNEL_ID}) não encontrado no servidor ${guild.name}.`);
            return;
        }

        const embed = new EmbedBuilder().setColor('#2b2d31').setDescription(textoFinal);

        if (CONFIG.MESSAGE_ID) {
            try {
                const msg = await channel.messages.fetch(CONFIG.MESSAGE_ID);
                await msg.edit({ content: '', embeds: [embed] });
                console.log(`✅ [SUCESSO] Painel atualizado em ${guild.name}.`);
            } catch (err) {
                console.error('❌ [ERRO] Mensagem fixa não encontrada. Verifique o ID.');
            }
        } else {
            await channel.send({ embeds: [embed] });
            console.log('✅ [SUCESSO] Nova mensagem de painel enviada.');
        }

        try {
            const donosList = [];
            const donoConfig = HIERARQUIA.find(h => h.nome === 'Dono');
            if (donoConfig) {
                const roleDono = guild.roles.cache.get(donoConfig.id);
                if (roleDono) {
                    roleDono.members.forEach(m => {
                        if (!(CONFIG.IGNORED_USERS || []).includes(m.id)) {
                            donosList.push({ id: m.id, name: m.displayName || m.user.globalName || m.user.username });
                        }
                    });
                }
                if (Array.isArray(donoConfig.manualTop)) {
                    donoConfig.manualTop.forEach(id => {
                        if (!(CONFIG.IGNORED_USERS || []).includes(String(id)) && !donosList.find(d => d.id === String(id))) {
                            
                            const m = guild.members.cache.get(String(id));
                            const fallbackName = String(id) === '354741432113823746' ? 'Jadson' : 'Dono';
                            donosList.push({ id: String(id), name: m ? (m.displayName || m.user.username) : fallbackName });
                        }
                    });
                }
            }

            const appId = 'default-app-id';
            const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'redline_storage', 'main');
            await setDoc(docRef, { donosData: donosList }, { merge: true });
            console.log(`📡 [FIREBASE] Sincronizados ${donosList.length} donos com o site.`);
        } catch(e) {
            console.error('❌ [FIREBASE ERRO] Não foi possível sincronizar os donos', e);
        }

    } catch (error) {
        console.error('❌ [ERRO CRÍTICO]', error);
    }
}

let reportDebounceTimer = null;
const processingFiles = new Set(); 

client.on('messageCreate', async (message) => {
    
    if (message.channel.id === CONFIG.REPORT_CHANNEL_ID) {
        if (message.author.bot) return; 
        
        clearTimeout(reportDebounceTimer);
        console.log(`📊 [AUTO] Arquivo detectado no canal de relatórios! Aguardando lote completo (15s)...`);
        
        reportDebounceTimer = setTimeout(() => processarLoteRelatorios(message.channel), 15000);
        return;
    }

    if (message.channel.id === CONFIG.SALES_LOG_CHANNEL_ID) {

        if (message.content.includes(':check~2:') || message.content.includes('✅')) {
            console.log("📝 [LOG VENDAS] Mensagem de BOT/Webhook detectada e verificada.");
            await processarLogVendas(message);
        }
        return;
    }

    if (message.author.bot) return; 

    if (message.attachments.size > 0) {
        const file = message.attachments.first();
        if (file.name.endsWith('.xlsx')) {

            if (message.guild || message.channel.type === 1) { 
                await processarExcel(message, file.url);
            }
        }
    }
});

async function processarLoteRelatorios(channel) {
    console.log('--- [AUTO] Buscando maior relatório do lote recente... ---');
    try {
        
        const messages = await channel.messages.fetch({ limit: 20 });

        let bestFile = null;
        let maxBytes = 0;

        const now = Date.now();
        let firstFile = null;
        let oldestTimestamp = now;

        const jaProcessadoRecente = messages.some(msg => {
            const isRecent = (now - msg.createdTimestamp <= 300000);
            const hasCheck = msg.reactions.cache.has('✅');
            return isRecent && hasCheck;
        });

        if (jaProcessadoRecente) {
            console.log("⏸️ [AUTO] Lote já processado anteriormente (Check detectado). Ignorando restantes.");
            sendLogDm("⏸️ **[Sistema]** Lote de arquivos duplicado ignorado com sucesso.");
            return;
        }

        messages.forEach(msg => {
            
            if (now - msg.createdTimestamp > 300000) return;

            msg.attachments.forEach(att => {
                if (att.name.endsWith('.xlsx')) {
                    
                    if (msg.createdTimestamp < oldestTimestamp) {
                        oldestTimestamp = msg.createdTimestamp;
                        firstFile = { attachment: att, message: msg };
                    }
                }
            });
        });

        if (firstFile) {
            console.log(`✅ [AUTO] Primeiro: ${firstFile.attachment.name} (${(firstFile.attachment.size / 1024).toFixed(2)} KB)`);
            sendLogDm(`📊 **[Processamento Iniciado]**\nArquivo: \`${firstFile.attachment.name}\`\nTamanho: ${(firstFile.attachment.size / 1024).toFixed(2)} KB`);
            await processarExcelUrl(firstFile.attachment.url, channel, true); 

            try {
                await firstFile.message.react('✅');
                console.log(`✅ [AUTO] Reação adicionada ao relatório processado.`);
            } catch (e) {
                console.warn(`⚠️ [AUTO] Não foi possível reagir: ${e.message}`);
            }
        } else {
            console.log('⚠️ [AUTO] Nenhum relatório encontrado no lote recente.');
        }

    } catch (e) {
        console.error('[ERRO AUTO]', e);
    }
}

async function processarExcelUrl(url, channel, isAutomatic = false) {
    if (processingFiles.has(url)) {
        console.log("⚠️ [ANTI-DUPLIC] Arquivo já sendo processado, ignorando:", url);
        return;
    }
    processingFiles.add(url);

    setTimeout(() => processingFiles.delete(url), 300000);

    let feedbackMsg = null;
    
    try {
        if (channel) feedbackMsg = await channel.send('🔄 **[Sincronização] Processando relatório...**');
    } catch (e) { }

    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const workbook = xlsx.read(response.data, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

        if (!rows || rows.length === 0) throw new Error("Planilha vazia.");

        if (rows.length > 0) rows.shift();

        const filteredRows = rows.map(row => {
            
            if (!row || row.length < 5) return null;

            return [
                row[0], 
                row[1], 
                row[2], 
                row[3], 
                row[4], 
                
                (row[7] || (row[5] && String(row[5]).includes('/') ? row[5] : 'N/A'))  
            ];
        }).filter(r => r !== null);

        const appId = 'default-app-id';
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'redline_storage', 'main');

        const docSnap = await getDoc(docRef);
        let currentData = docSnap.exists() ? docSnap.data() : {};
        let oldRawData = currentData.rawData || "";

        const consolidatedMap = new Map();

        if (oldRawData) {
            const oldLines = oldRawData.split('\n');
            for (const line of oldLines) {
                const parts = line.split('\t');
                if (parts.length >= 2) {
                    const id = parts[1];
                    consolidatedMap.set(id, parts);
                }
            }
        }

        const currentIds = new Set();

        for (const newRow of filteredRows) {
            const id = String(newRow[1]);
            currentIds.add(id);

            const cleanRow = [
                String(newRow[0] ?? ''), 
                String(newRow[1] ?? ''), 
                String(newRow[2] ?? ''), 
                String(newRow[3] ?? ''), 
                '0',                     
                String(newRow[5] ?? '')  
            ];

            const existingRecord = consolidatedMap.get(id);
            if (existingRecord && existingRecord.length >= 5) {
                
                cleanRow[4] = existingRecord[4];
            }

            consolidatedMap.set(id, cleanRow);
        }

        for (const [id, row] of consolidatedMap) {
            if (!currentIds.has(id)) {

                if (!row[0].includes('(Exonerado)')) {
                    row[0] = `${row[0]} (Exonerado)`;
                }

                row[3] = '0';

                consolidatedMap.set(id, row);
            }
        }

        const finalRows = Array.from(consolidatedMap.values());
        const rawText = finalRows.map(row => row.join('\t')).join('\n');

        if (isAutomatic) {
            const targetGuild = await client.guilds.fetch(CONFIG.MAIN_GUILD_ID);

            if (targetGuild) {
                console.log(`🎯 [TOP HORAS] Processando no servidor: ${targetGuild.name}`);
                
                gerenciarTopHoras(targetGuild, filteredRows).catch(e => console.error("❌ [TOP HORAS] Erro:", e));
            } else {
                console.error("❌ [TOP HORAS] Servidor principal não encontrado.");
            }
        } else {
            console.log("ℹ️ [TOP HORAS] Processamento manual detectado. Anúncio não será enviado.");
        }

        await setDoc(docRef, {
            ...currentData,
            rawData: rawText,
            updatedAt: new Date().toISOString()
        });

        if (feedbackMsg) await feedbackMsg.edit(`✅ **[Sucesso]** Sistema atualizado!\n📊 **Total (Com Exonerados):** ${finalRows.length}\n🆕 **Ativos/Atualizados:** ${filteredRows.length}`);
        console.log(`[AUTO] Site atualizado com sucesso.`);
        sendLogDm(`✅ **[Sucesso]** Site atualizado!\n📊 Total: ${finalRows.length}\n🆕 Ativos: ${filteredRows.length}`);

    } catch (error) {
        console.error(error);
        if (feedbackMsg) await feedbackMsg.edit(`❌ **[Erro]** Falha ao processar: ${error.message}`);
        sendLogDm(`❌ **[Erro Crítico]** Falha ao processar planilha:\n\`${error.message}\``);
    }
}

async function gerenciarTopRecrutador(guild, pontos) {
    if (CONFIG.TOP_RECRUITER_ROLE_ID === 'CHANGE_ME') {
        console.warn("⚠️ [TOP RECRUTADOR] ID do Cargo não configurado.");
        return;
    }

    const role = guild.roles.cache.get(CONFIG.TOP_RECRUITER_ROLE_ID);
    if (!role) {
        console.error("❌ [TOP RECRUTADOR] Cargo não encontrado.");
        return;
    }

    console.log("🏆 [TOP RECRUTADOR] Calculando vencedor...");

    let maxRecruits = 0;
    for (const data of Object.values(pontos)) {
        if (data.recruit > maxRecruits) maxRecruits = data.recruit;
    }

    if (maxRecruits === 0) {
        console.log("🏆 [TOP RECRUTADOR] Sem recrutamentos esta semana.");

    }

    const winners = [];
    if (maxRecruits > 0) {
        for (const [id, data] of Object.entries(pontos)) {
            if (data.recruit === maxRecruits) {
                winners.push(id);
            }
        }
    }

    console.log(`🏆 [TOP RECRUTADOR] Vencedores (${maxRecruits} recruts): ${winners.join(', ')}`);

    const membersWithRole = role.members.map(m => m.id);

    for (const memberId of membersWithRole) {
        if (!winners.includes(memberId)) {
            const member = guild.members.cache.get(memberId);
            if (member) await member.roles.remove(role);
        }
    }

    for (const winnerId of winners) {
        if (!membersWithRole.includes(winnerId)) {
            const member = guild.members.cache.get(winnerId);
            if (member) await member.roles.add(role);
        }
    }
}

async function gerenciarTopHoras(guild, rows) {
    if (CONFIG.AVISOS_CHANNEL_ID === 'CHANGE_ME' || CONFIG.TOP_HOURS_ROLE_ID === 'CHANGE_ME') {
        console.warn("⚠️ [TOP HORAS] IDs de Canal ou Cargo não configurados no CONFIG.");
        return;
    }

    console.log("🏆 [TOP HORAS] Iniciando verificação...");

    const role = guild.roles.cache.get(CONFIG.TOP_HOURS_ROLE_ID);
    if (!role) {
        console.error(`❌ [TOP HORAS] Cargo não encontrado.`);
        console.error(`   Procurando ID: ${CONFIG.TOP_HOURS_ROLE_ID}`);
        console.error(`   No servidor: ${guild.name} (${guild.id})`);
        console.error(`   Cargos disponíveis: ${guild.roles.cache.size}`);
        return;
    }

    const channel = guild.channels.cache.get(CONFIG.AVISOS_CHANNEL_ID);
    if (!channel) {
        console.error("❌ [TOP HORAS] Canal de Avisos não encontrado.");
        return;
    }

    const winnersData = []; 
    const minHours = 15;

    for (const row of rows) {
        
        if (!row || row.length < 4) continue;

        const discordId = row[1]; 
        const rawTime = row[3];   

        let hoursValue = 0;

        if (typeof rawTime === 'number') {

            if (rawTime < 5) { 
                hoursValue = rawTime * 24;
            } else {
                hoursValue = rawTime;
            }
        } else if (typeof rawTime === 'string') {
            const timeStr = rawTime.trim().toLowerCase();

            if (timeStr.includes('hora')) {

                const horasMatch = timeStr.match(/(\d+)\s*hora/);
                const minMatch = timeStr.match(/(\d+)\s*minuto/);

                const h = horasMatch ? parseInt(horasMatch[1]) : 0;
                const m = minMatch ? parseInt(minMatch[1]) : 0;

                hoursValue = h + (m / 60);
            }
            
            else if (timeStr.includes(':')) {
                const parts = timeStr.split(':');
                const h = parseInt(parts[0]) || 0;
                const m = parseInt(parts[1]) || 0;
                hoursValue = h + (m / 60);
            } else {
                
                hoursValue = parseFloat(timeStr.replace(',', '.'));
            }
        }

        if (hoursValue >= minHours) {
            console.log(`   -> 🎯 BATEU META: ${discordId} com ${hoursValue.toFixed(2)}h`);
            winnersData.push({ id: discordId, hours: hoursValue });
        } else {
            
        }
    }

    console.log(`🏆 [TOP HORAS] ${winnersData.length} membros bateram a meta de ${minHours} horas.`);

    const membersWithRole = role.members.map(m => m.id);

    const winnersIds = winnersData.map(w => w.id);
    for (const memberId of membersWithRole) {
        if (!winnersIds.includes(memberId)) {
            try {
                const member = guild.members.cache.get(memberId);
                if (member) await member.roles.remove(role);
            } catch (e) {
                console.error(`❌ Falha ao remover cargo de ${memberId}:`, e.message);
            }
        }
    }

    winnersData.sort((a, b) => b.hours - a.hours);

    const listLines = [];

    for (const w of winnersData) {
        try {
            let member = guild.members.cache.get(w.id);
            if (!member) {
                try {
                    console.log(`🔎 [TOP HORAS] Buscando membro fora do cache: ${w.id}`);
                    member = await guild.members.fetch(w.id);
                } catch (fetchErr) {
                    console.error(`❌ [TOP HORAS] Membro ${w.id} não encontrado no servidor.`);
                    continue; 
                }
            }

            if (member) {
                if (!membersWithRole.includes(w.id)) {
                    await member.roles.add(role);
                }
                const hoursFormatted = Math.floor(w.hours) + "h " + Math.round((w.hours % 1) * 60) + "m";
                
                const basePoints = 100;
                const extraHours = Math.max(0, w.hours - 15);
                const bonusBlocks = Math.floor(extraHours / 5);
                const totalPoints = basePoints + (bonusBlocks * 100);
                listLines.push(`> <@${w.id}> • **${hoursFormatted}** • ${totalPoints} Pts`);
            }
        } catch (e) {
            console.error(`❌ Falha ao dar cargo para ${w.id}:`, e.message);
        }
    }

    if (listLines.length > 0) {
        const dateHeader = `**<:LOGOREDLINE:1401368764322152518> TOP HORAS DA SEMANA PASSADA <:LOGOREDLINE:1401368764322152518>**`;

        const messageContent = `${dateHeader}

❤️ Olá,
<@&${CONFIG.BASE_ROLE_ID}>

Hoje é dia de reconhecer quem vestiu a camisa de verdade!
Parabéns aos novos <@&${CONFIG.TOP_HOURS_ROLE_ID}> 👏

👏 O esforço de cada um aqui faz a diferença.
🔧 Comprometimento, foco e trabalho... é disso que a RedLine é feita!
<:graficosredline:1308113428489175142> Rumo a mais conquistas!

**#RedlineServindoeTunando**

${listLines.join('\n')}`;

        channel.send({ content: messageContent })
            .then(() => console.log("✅ [TOP HORAS] Anúncio enviado com sucesso!"))
            .catch(err => console.error("❌ [TOP HORAS] ERRO ao enviar msg de top horas:", err));
    } else {
        console.log("ℹ️ [TOP HORAS] Lista vazia, nenhum anúncio enviado.");
    }
}

function extractRecruiterId(message) {
    const regex = /recrutador\s*<@!?(\d+)>/i;

    let match = message.content.match(regex);
    if (match) return match[1];

    if (message.embeds && message.embeds.length > 0) {
        for (const embed of message.embeds) {
            if (embed.description) {
                match = embed.description.match(regex);
                if (match) return match[1];
            }
        }
    }
    return null; 
}

async function confirmarTopRecrutador(interaction, guild, pontos) {
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

    let maxRecruits = 0;
    for (const data of Object.values(pontos)) {
        if (data.recruit > maxRecruits) maxRecruits = data.recruit;
    }

    if (maxRecruits === 0) return; 

    const potentialWinners = [];
    for (const [id, data] of Object.entries(pontos)) {
        if (data.recruit === maxRecruits) potentialWinners.push(id);
    }

    const confirmButton = new ButtonBuilder()
        .setCustomId('confirm_top_recruiter')
        .setLabel('Sim')
        .setStyle(ButtonStyle.Success);

    const cancelButton = new ButtonBuilder()
        .setCustomId('cancel_top_recruiter')
        .setLabel('Não')
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

    const mentions = potentialWinners.map(id => `<@${id}>`).join(', ');
    const msg = await interaction.followUp({
        content: `🏆 **Top Recrutador Detectado:** ${mentions} com **${maxRecruits}** recrutamentos.\nDeseja atualizar o cargo automaticamente?`,
        components: [row],
        ephemeral: true
    });

    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

    collector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) {
            return i.reply({ content: '🚫 Você não pode clicar aqui.', ephemeral: true });
        }

        if (i.customId === 'confirm_top_recruiter') {
            await i.update({ content: '🔄 **Processando Premiação...**', components: [] });
            await gerenciarTopRecrutador(guild, pontos); 
            await i.editReply({ content: `✅ **Sucesso!** Cargo atualizado para: ${mentions}`, components: [] });
        } else {
            await i.update({ content: '🚫 **Premiação Cancelada.** O cargo não foi alterado.', components: [] });
        }
    });

    collector.on('end', collected => {
        if (collected.size === 0) interaction.editReply({ content: '⚠️ **Tempo Esgotado.** Nenhuma ação tomada sobre o Top Recrutador.', components: [] });
    });
}

async function sincronizarPontosNovo(interaction, modo) {
    const salvar = (modo === 'PASSADA');
    const isEphemeral = (modo === 'ATUAL'); 

    await interaction.deferReply({ ephemeral: isEphemeral });

    const hoje = new Date();
    let startWindow, endWindow;

    if (modo === 'PASSADA') {
        endWindow = new Date(hoje);
        endWindow.setDate(hoje.getDate() - (hoje.getDay() === 0 ? 7 : hoje.getDay()));
        endWindow.setHours(23, 59, 59, 999);

        startWindow = new Date(endWindow);
        startWindow.setDate(endWindow.getDate() - 6);
        startWindow.setHours(0, 0, 0, 0);
    } else {
        endWindow = new Date();
        startWindow = new Date(hoje);
        const currentDay = hoje.getDay() || 7;
        startWindow.setDate(hoje.getDate() - (currentDay - 1));
        startWindow.setHours(0, 0, 0, 0);
    }

    const loadingEmbed = new EmbedBuilder()
        .setColor(Colors.Yellow)
        .setTitle('⏳ Processando Pontos...')
        .setDescription(`**Modo:** ${salvar ? 'FECHAMENTO (Salvar)' : 'VERIFICAÇÃO (Ler)'}\n**Janela:** ${startWindow.toLocaleDateString('pt-BR')} até ${endWindow.toLocaleDateString('pt-BR')}`)
        .setFooter({ text: 'Isso pode levar alguns segundos...' });

    await interaction.editReply({ embeds: [loadingEmbed] });

    try {
        const guild = await client.guilds.fetch(CONFIG.MAIN_GUILD_ID);
        const recruitChannel = guild.channels.cache.get(CONFIG.RECRUIT_CHANNEL_ID);
        const sponsorChannel = guild.channels.cache.get(CONFIG.SPONSOR_CHANNEL_ID);

        if (!recruitChannel || !sponsorChannel) throw new Error("Canais de pontos não configurados.");

        const pontos = {};
        let totalRecruitMsgs = 0;
        let totalSponsorMsgs = 0;

        async function processChannel(channel, type) {
            let lastId = null;
            let keepFetching = true;
            let count = 0;

            while (keepFetching) {
                const options = { limit: 100 };
                if (lastId) options.before = lastId;

                const messages = await channel.messages.fetch(options);
                if (messages.size === 0) break;

                for (const msg of messages.values()) {
                    lastId = msg.id;

                    if (msg.createdTimestamp > endWindow.getTime()) continue;

                    if (msg.createdTimestamp < startWindow.getTime()) {
                        keepFetching = false;
                        continue;
                    }

                    count++;

                    if (type === 'RECRUIT') {
                        const recruiterId = extractRecruiterId(msg);
                        if (recruiterId) {
                            if (!pontos[recruiterId]) pontos[recruiterId] = { recruit: 0, sponsor: 0 };
                            pontos[recruiterId].recruit++;
                        }
                    } else if (type === 'SPONSOR') {
                        if (!msg.author.bot) {
                            const autorId = msg.author.id;
                            if (!pontos[autorId]) pontos[autorId] = { recruit: 0, sponsor: 0 };
                            pontos[autorId].sponsor++;
                        }
                    }
                }
            }
            return count;
        }

        totalRecruitMsgs = await processChannel(recruitChannel, 'RECRUIT');
        totalSponsorMsgs = await processChannel(sponsorChannel, 'SPONSOR');

        if (salvar && Object.keys(pontos).length > 0) {
            const appId = 'default-app-id';
            const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'redline_storage', 'main');
            const docSnap = await getDoc(docRef);
            let currentData = docSnap.exists() ? docSnap.data() : {};
            let manualData = {}; 

            for (const [id, dados] of Object.entries(pontos)) {
                manualData[id] = {
                    recruit: dados.recruit,
                    sponsor: dados.sponsor
                };
            }

            let boostersData = {};
            try {
                if (guild) {
                    const roleBooster = guild.roles.cache.get(CONFIG.BOOSTER_ROLE_ID);
                    if (roleBooster) {
                        
                        roleBooster.members.forEach(m => {
                            boostersData[m.id] = { points: 100 };
                        });
                        console.log(`🚀 [BOOSTER] ${Object.keys(boostersData).length} membros salvos na lista separada.`);
                    } else {
                        console.warn("⚠️ [BOOSTER] Cargo não encontrado.");
                    }
                }
            } catch (e) {
                console.error("❌ Erro boosters:", e);
            }

            await updateDoc(docRef, { manualData, boostersData });

            if (guild) {
                
                confirmarTopRecrutador(interaction, guild, pontos).catch(console.error);
            }
        }

        const totalPessoas = Object.keys(pontos).length;

        let topRecruiterField = { name: '🏆 Top Recrutador', value: 'N/A', inline: false };
        if (totalPessoas > 0) {
            const recruitRanking = Object.entries(pontos)
                .map(([id, data]) => ({ id, count: data.recruit }))
                .filter(r => r.count > 0)
                .sort((a, b) => b.count - a.count);

            if (recruitRanking.length > 0) {
                const maxRecruits = recruitRanking[0].count;
                const topRecruiters = recruitRanking.filter(r => r.count === maxRecruits);
                const mentions = topRecruiters.map(r => `<@${r.id}>`).join(', ');
                topRecruiterField.value = `${mentions} (**${maxRecruits}** recruts)`;
            }
        }

        const resultEmbed = new EmbedBuilder()
            .setColor(salvar ? Colors.Red : Colors.Blue)
            .setTitle(salvar ? '✅ Semana Fechada & Salva' : '🔎 Verificação Parcial')
            .addFields(
                { name: '📅 Período', value: `${startWindow.toLocaleDateString('pt-BR')} - ${endWindow.toLocaleDateString('pt-BR')}`, inline: false },
                { name: '📊 Mensagens Analisadas', value: `Recrutamentos: **${totalRecruitMsgs}**\nApadrinhamentos: **${totalSponsorMsgs}**`, inline: false },
                topRecruiterField
            )
            .setTimestamp();

        if (totalPessoas > 0) {
            const topList = Object.entries(pontos)
                .sort((a, b) => (b[1].recruit + b[1].sponsor) - (a[1].recruit + a[1].sponsor))
                .slice(0, 15);

            const description = topList.map(([id, p]) => `<@${id}>: **${p.recruit}** Recrut. | **${p.sponsor}** Apadr.`).join('\n');
            resultEmbed.setDescription(description + (topList.length < totalPessoas ? `\n\n*...e mais ${totalPessoas - topList.length} membros.*` : ''));
        } else {
            resultEmbed.setDescription('⚠️ **Nenhum ponto registrado neste período.**');
            resultEmbed.setColor(Colors.Grey);
        }

        await interaction.editReply({ embeds: [resultEmbed] });

    } catch (error) {
        console.error("❌ Erro na sincronização:", error);

        const errorEmbed = new EmbedBuilder()
            .setColor(Colors.Red)
            .setTitle('❌ Erro na Execução')
            .setDescription(`Ocorreu um problema: ${error.message}`);

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

async function sincronizarPontos(msgTrigger, modo) {
    
    const salvar = (modo === 'PASSADA');
    const titulo = salvar ? 'fechamento da semana passada' : 'verificação da semana atual';

    if (msgTrigger) await msgTrigger.reply(`⏳ Iniciando ${titulo}... (Modo: ${salvar ? 'GRAVAÇÃO' : 'LEITURA'})`);

    const hoje = new Date();
    let startWindow, endWindow;

    if (modo === 'PASSADA') {
        
        endWindow = new Date(hoje);
        
        endWindow.setDate(hoje.getDate() - (hoje.getDay() === 0 ? 7 : hoje.getDay()));
        endWindow.setHours(23, 59, 59, 999);

        startWindow = new Date(endWindow);
        startWindow.setDate(endWindow.getDate() - 6);
        startWindow.setHours(0, 0, 0, 0);
    } else {
        
        endWindow = new Date(); 

        startWindow = new Date(hoje);
        const currentDay = hoje.getDay() || 7; 
        startWindow.setDate(hoje.getDate() - (currentDay - 1));
        startWindow.setHours(0, 0, 0, 0);
    }

    console.log(`📅 Janela [${modo}]: ${startWindow.toLocaleString()} até ${endWindow.toLocaleString()}`);

    try {
        const guild = await client.guilds.fetch(CONFIG.MAIN_GUILD_ID);
        if (!guild) throw new Error("Servidor principal não encontrado.");

        const recruitChannel = guild.channels.cache.get(CONFIG.RECRUIT_CHANNEL_ID);
        const sponsorChannel = guild.channels.cache.get(CONFIG.SPONSOR_CHANNEL_ID);

        if (!recruitChannel || !sponsorChannel) throw new Error("Canais de pontos não configurados.");

        const pontos = {}; 

        async function fetchMessagesInWindow(channel, start, end) {
            let foundMsgs = [];
            let lastId = null;
            let keepFetching = true;

            console.log(`🔎 Buscando mensagens em ${channel.name}...`);

            while (keepFetching) {
                const options = { limit: 100 };
                if (lastId) options.before = lastId;

                const messages = await channel.messages.fetch(options);
                if (messages.size === 0) break;

                for (const msg of messages.values()) {
                    if (msg.createdTimestamp > end.getTime()) {
                        lastId = msg.id;
                        continue;
                    }
                    if (msg.createdTimestamp < start.getTime()) {
                        keepFetching = false;
                        lastId = msg.id;
                        break;
                    }
                    foundMsgs.push(msg);
                    lastId = msg.id;
                }
            }
            return foundMsgs;
        }

        const msgsRecruit = await fetchMessagesInWindow(recruitChannel, startWindow, endWindow);
        msgsRecruit.forEach(msg => {
            const recruiterId = extractRecruiterId(msg);
            if (recruiterId) {
                if (!pontos[recruiterId]) pontos[recruiterId] = { recruit: 0, sponsor: 0 };
                pontos[recruiterId].recruit++;
            }
        });

        const msgsSponsor = await fetchMessagesInWindow(sponsorChannel, startWindow, endWindow);
        msgsSponsor.forEach(msg => {
            if (msg.author.bot) return;
            const autorId = msg.author.id;
            if (!pontos[autorId]) pontos[autorId] = { recruit: 0, sponsor: 0 };
            pontos[autorId].sponsor++;
        });

        const totalPessoas = Object.keys(pontos).length;

        if (totalPessoas > 0) {

            if (salvar) {
                console.log("💾 Salvando pontos no Firebase...", pontos);
                const appId = 'default-app-id';
                const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'redline_storage', 'main');
                const docSnap = await getDoc(docRef);
                let currentData = docSnap.exists() ? docSnap.data() : {};
                let manualData = {}; 

                for (const [id, dados] of Object.entries(pontos)) {
                    manualData[id] = {
                        recruit: dados.recruit,
                        sponsor: dados.sponsor
                    };
                }

                let boostersData = {};
                try {
                    const roleBooster = guild.roles.cache.get(CONFIG.BOOSTER_ROLE_ID);
                    if (roleBooster) {
                        roleBooster.members.forEach(m => {
                            boostersData[m.id] = { points: 100 };
                        });
                    }
                } catch (e) { }

                await updateDoc(docRef, { manualData, boostersData });

                if (guild) {

                    try {
                        const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
                        
                        let maxRecruits = 0;
                        for (const data of Object.values(pontos)) { if (data.recruit > maxRecruits) maxRecruits = data.recruit; }

                        if (maxRecruits > 0) {
                            const potentialWinners = [];
                            for (const [id, data] of Object.entries(pontos)) { if (data.recruit === maxRecruits) potentialWinners.push(id); }

                            const confirmButton = new ButtonBuilder().setCustomId('confirm_top_text').setLabel('Sim').setStyle(ButtonStyle.Success);
                            const cancelButton = new ButtonBuilder().setCustomId('cancel_top_text').setLabel('Não').setStyle(ButtonStyle.Secondary);
                            const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

                            const msg = await msgTrigger.reply({
                                content: `🏆 **Top Recrutador Detectado:** ${potentialWinners.map(id => `<@${id}>`).join(', ')} (${maxRecruits})\nDeseja atualizar o cargo?`,
                                components: [row]
                            });

                            const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
                            collector.on('collect', async i => {
                                if (i.user.id !== msgTrigger.author.id) return i.reply({ content: '🚫', ephemeral: true });

                                if (i.customId === 'confirm_top_text') {
                                    await i.update({ content: '🔄 Atualizando...', components: [] });
                                    await gerenciarTopRecrutador(guild, pontos);
                                    await i.editReply({ content: '✅ **Cargo Atualizado!**' });
                                } else {
                                    await i.update({ content: '🚫 Cancelado.', components: [] });
                                }
                            });
                        }
                    } catch (e) { console.error("Erro botão texto:", e); }
                }
            }

            if (msgTrigger) {
                let resumo = `✅ **${salvar ? 'Semana Fechada & Site Atualizado' : 'Verificação Parcial (Sem salvar)'}**\n📅 Janela: ${startWindow.toLocaleDateString('pt-BR')} - ${endWindow.toLocaleDateString('pt-BR')}\n\n`;
                const top5 = Object.entries(pontos)
                    .sort((a, b) => (b[1].recruit + b[1].sponsor) - (a[1].recruit + a[1].sponsor))
                    .slice(0, 15);

                resumo += top5.map(([id, p]) => `<@${id}>: ${p.recruit} Recrut. | ${p.sponsor} Apadr.`).join('\n');

                if (top5.length < totalPessoas) resumo += `\n...e mais ${totalPessoas - top5.length} membros.`;

                await msgTrigger.channel.send(resumo);
            }
        } else {
            if (msgTrigger) await msgTrigger.channel.send(`⚠️ Nenhum recrutamento ou apadrinhamento encontrado nesta janela (${startWindow.toLocaleDateString('pt-BR')} - ${endWindow.toLocaleDateString('pt-BR')}).`);
        }

    } catch (error) {
        console.error("❌ Erro na sincronização:", error);
        if (msgTrigger) await msgTrigger.channel.send(`❌ Erro: ${error.message}`);
    }
}

async function processarExcel(message, url = null) {
    if (!url) url = message.attachments.first().url;
    await processarExcelUrl(url, message.channel);

    try {
        const guild = await client.guilds.fetch(CONFIG.MAIN_GUILD_ID);
        if (guild) {
            await guild.members.fetch();
            const donoConfig = HIERARQUIA.find(h => h.nome === 'Dono');
            if (donoConfig) {
                const roleDono = guild.roles.cache.get(donoConfig.id);
                const donosList = [];
                if (roleDono) {
                    roleDono.members.forEach(m => {
                        donosList.push({ id: m.id, name: m.displayName || m.user.globalName || m.user.username });
                    });
                }
                const appId = 'default-app-id';
                const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'redline_storage', 'main');
                await setDoc(docRef, { donosData: donosList }, { merge: true });
                console.log(`📡 [FIREBASE] donosData sincronizado via DM: ${donosList.length} donos.`);
            }
        }
    } catch (e) {
        console.warn('⚠️ [FIREBASE] Não foi possível sincronizar donosData via DM:', e.message);
    }
}

async function processarLogVendas(message) {
    console.log("🔄 [DEBUG] Entrou em processarLogVendas()");

    if (message.partial) {
        try {
            console.log("   -> Mensagem parcial, fazendo fetch...");
            await message.fetch();
        } catch (e) {
            console.error("   -> Erro no fetch da mensagem parcial:", e);
            return;
        }
    }

    let content = message.content || "";

    if (message.embeds.length > 0) {
        console.log("   -> Embed detectado. Extraindo...");
        const emb = message.embeds[0];
        content += " " + (emb.description || "");
        if (emb.fields) emb.fields.forEach(f => content += " " + f.name + " " + f.value);
    }

    console.log(`   -> Conteúdo FINAL para análise: "${content.substring(0, 100)}..."`); 

    if (content.toLowerCase().includes('zerou o baú')) {
        console.log("♻️ [LOG VENDAS] Detectado 'Zerou o baú'. Resetando rawData...");
        try {
            const appId = 'default-app-id';
            const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'redline_storage', 'main');
            
            await updateDoc(docRef, { rawData: "", updatedAt: new Date().toISOString() });
            message.react('♻️');
        } catch (e) { console.error(e); }
        return;
    }

    const hasMec = content.match(/Mec[aáâ]nico/i);
    const hasQtd = content.match(/(?:Quantidade|Kits)/i);

    if (!hasMec || !hasQtd) {
        console.log(`⚠️ [DEBUG] Ignorado por falta de palavras-chave.`);
        console.log(`   Tem 'Mecânico'? ${!!hasMec}`);
        console.log(`   Tem 'Quantidade'/'Kits'? ${!!hasQtd}`);
        console.log(`   Conteúdo parcial: ${content.substring(0, 100)}...`);
        return;
    }

    try {

        const mecanicoMatch = content.match(/Mec[aáâ]nico.*?<@!?(\d+)>/is);

        const kitsMatch = content.match(/(?:Quantidade|Kits).*?(\d+)/is);

        if (!mecanicoMatch) console.log("❌ [DEBUG] Falha Regex MECÂNICO. Texto procurado: 'Mecânico...<@ID>'");
        if (!kitsMatch) console.log("❌ [DEBUG] Falha Regex KITS. Texto procurado: 'Quantidade...número'");

        if (!mecanicoMatch || !kitsMatch) {
            console.log("   -> Conteúdo analisado (Snippet): ", content.substring(0, 200));
            return;
        }

        const userId = mecanicoMatch[1];
        const kitsVendidos = parseInt(kitsMatch[1]);

        let userName = userId;
        try {
            const member = await message.guild.members.fetch(userId);
            userName = member.displayName;
        } catch (e) { }

        console.log(`💰 [LOG VENDAS] Venda APROVADA: ${userName} (+${kitsVendidos} kits)`);

        const appId = 'default-app-id';
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'redline_storage', 'main');

        const docSnap = await getDoc(docRef);
        let currentData = docSnap.exists() ? docSnap.data() : {};
        let rawData = currentData.rawData || "";
        const consolidatedMap = new Map();

        if (rawData) {
            const lines = rawData.split('\n');
            for (const line of lines) {
                const parts = line.split('\t');
                if (parts.length >= 2) consolidatedMap.set(parts[1], parts);
            }
        }

        let record = consolidatedMap.get(userId);
        if (record) {
            const currentKits = parseInt(record[4]) || 0;
            record[4] = String(currentKits + kitsVendidos);
        } else {
            
            record = [
                userName, 
                userId,
                '',       
                '0',      
                String(kitsVendidos),
                '', '', ''
            ];
        }
        consolidatedMap.set(userId, record);

        const finalRows = Array.from(consolidatedMap.values());
        const newRawText = finalRows.map(row => row.join('\t')).join('\n');

        await setDoc(docRef, {
            ...currentData,
            rawData: newRawText,
            updatedAt: new Date().toISOString()
        });

        await message.react('💸'); 

    } catch (e) {
        console.error("❌ Erro processar venda:", e);
    }
}

client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (newMessage.channel.id === CONFIG.SALES_LOG_CHANNEL_ID) {

        const getContent = (msg) => {
            let txt = msg.content || "";
            
            if (msg.embeds.length > 0) {
                const emb = msg.embeds[0];
                txt += " " + (emb.description || "");
                if (emb.fields) emb.fields.forEach(f => txt += " " + f.name + " " + f.value);
            }
            return txt;
        };

        const oldContent = oldMessage.partial ? '' : getContent(oldMessage);
        const newContent = getContent(newMessage);

        console.log(`📝 [DEBUG EDIT] Msg Editada!`);

        const checks = [':check~2:', '✅', 'Venda Verificada', 'Verificado por', 'Aprovado'];

        const isVerifiedNow = checks.some(t => newContent.includes(t));
        const wasVerifiedBefore = checks.some(t => oldContent.includes(t));

        if (isVerifiedNow && !wasVerifiedBefore) {
            console.log("✅ [LOG VENDAS] Mensagem agora está APROVADA! Processando...");
            await processarLogVendas(newMessage);
        } else {
            if (!isVerifiedNow) console.log(`   -> Ainda não verificado. (Buscou por: ${checks.join(', ')})`);
            
            if (newContent.includes('Status')) {
                const statusPart = newContent.split('Status')[1]?.substring(0, 50);
                console.log(`   -> Trecho 'Status' encontrado: ...${statusPart}...`);
            }
        }
    }
});

client.on('messageCreate', async message => {
    
    if (message.channel.id === CONFIG.SALES_LOG_CHANNEL_ID) {
        console.log(`📨 [DEBUG] Nova mensagem recebida!`);
        console.log(`   Conteúdo: "${message.content}"`);
        console.log(`   Verificado? ${message.content.includes(':check~2:') || message.content.includes('✅')}`);

        if (message.content.includes(':check~2:') || message.content.includes('✅')) {
            console.log("📝 [LOG VENDAS] Detectado emoji de verificação. Tentando processar...");
            await processarLogVendas(message);
        } else {
            console.log("⚠️ [DEBUG] Mensagem ignorada: Não tem emoji de verificado (:check~2: ou ✅).");
        }
    }
});

function parseInterval(str) {
    if (!str) return null;
    const match = str.toLowerCase().match(/^(\d+)([mhdw])$/);
    if (!match) return null;
    const val = parseInt(match[1]);
    const unit = match[2];
    if (unit === 'm') return val * 60 * 1000;
    if (unit === 'h') return val * 3600 * 1000;
    if (unit === 'd') return val * 86400 * 1000;
    if (unit === 'w') return val * 604800 * 1000;
    return null;
}

async function formatarMensagem(guild, content) {
    if (!guild || !content) return content;

    await guild.roles.fetch().catch(() => { });
    await guild.channels.fetch().catch(() => { });
    await guild.emojis.fetch().catch(() => { });

    let formatted = content;

    const roles = Array.from(guild.roles.cache.values()).sort((a, b) => b.name.length - a.name.length);

    for (const role of roles) {
        const name = role.name;
        
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const pattern = new RegExp(`@\\|?\\s*${escaped}`, 'gi');

        if (pattern.test(formatted)) {
            formatted = formatted.replace(pattern, role.toString());
        }
    }

    const channels = Array.from(guild.channels.cache.values()).sort((a, b) => b.name.length - a.name.length);
    for (const channel of channels) {
        if (channel.type !== 0 && channel.type !== 5) continue;
        const name = channel.name;
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const pattern = new RegExp(`#${escaped}`, 'gi');
        if (pattern.test(formatted)) {
            formatted = formatted.replace(pattern, channel.toString());
        }
    }

    const emojiRegex = /:([a-zA-Z0-9_~\-\.]+):/g;
    const emojis = guild.emojis.cache;

    formatted = formatted.replace(emojiRegex, (match, rawName) => {
        
        let emoji = emojis.find(e => e.name === rawName);

        if (!emoji) {
            
            const cleanRaw = rawName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            emoji = emojis.find(e => {
                const cleanName = e.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                return cleanName === cleanRaw;
            });
        }

        return emoji ? emoji.toString() : match;
    });

    return formatted;
}

async function checkScheduledMessages() {
    try {
        const messagesRef = collection(db, 'scheduled_messages');
        const snapshot = await getDocs(messagesRef);

        const now = Date.now();

        snapshot.forEach(async (docSnap) => {
            const data = docSnap.data();
            const { channelId, content, intervalMs, lastRun } = data;

            if (!channelId || !content || !intervalMs) return;

            if (!lastRun || (now - lastRun >= intervalMs)) {
                try {
                    const channel = client.channels.cache.get(channelId) || await client.channels.fetch(channelId);
                    if (channel) {
                        
                        const finalText = await formatarMensagem(channel.guild, content);

                        await channel.send(finalText);
                        console.log(`⏰ [MSG PROGRAMADA] Enviada para ${channel.name} (ID: ${docSnap.id})`);

                        await updateDoc(doc(db, 'scheduled_messages', docSnap.id), {
                            lastRun: now
                        });
                    } else {
                        console.warn(`⚠️ [MSG PROGRAMADA] Canal ${channelId} não encontrado/inacessível.`);
                    }
                } catch (err) {
                    console.error(`❌ [MSG PROGRAMADA] Erro ao enviar/atualizar ${docSnap.id}:`, err.message);
                }
            }
        });

    } catch (error) {
        console.error("❌ [MSG PROGRAMADA] Erro no loop de verificação:", error);
    }
}

client.once('ready', async () => {
    console.log(`✅ Bot online como: ${client.user.tag}`);

    try {
        
        const guild = await client.guilds.fetch(CONFIG.MAIN_GUILD_ID);
        if (guild) {
            console.log(`🏠 Servidor Principal conectado: ${guild.name}`);
            atualizarPainel(guild);
            setInterval(() => atualizarPainel(guild), 10 * 60 * 1000);
        }
    } catch (e) {
        console.error(`❌ [ERRO CRÍTICO] Servidor Principal ID ${CONFIG.MAIN_GUILD_ID} não encontrado! O painel de hierarquia não funcionará.`);
    }

    const channelRelatorio = client.channels.cache.get(CONFIG.REPORT_CHANNEL_ID);
    if (channelRelatorio) {
        console.log(`📊 Canal de Relatórios monitorado: ${channelRelatorio.name}`);
        console.log(`   ID: ${CONFIG.REPORT_CHANNEL_ID}`);
        console.log(`   Permissões: Ler=${channelRelatorio.permissionsFor(client.user).has('ViewChannel')}, Reagir=${channelRelatorio.permissionsFor(client.user).has('AddReactions')}`);
    } else {
        console.warn(`⚠️ [AVISO] Canal de Relatórios (${CONFIG.REPORT_CHANNEL_ID}) não está visível para o bot.`);
        console.warn(`   Verifique se o bot tem permissão de ver o canal e se o ID está correto.`);
    }

    console.log("⏰ Iniciando monitoramento de mensagens programadas...");
    setInterval(() => checkScheduledMessages(), 60000); 
    checkScheduledMessages(); 
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'atualizar') {
        if (interaction.guildId !== CONFIG.MAIN_GUILD_ID) {
            return interaction.reply({ content: ' **Bloqueado:** Use apenas no servidor da Hierarquia.', ephemeral: true });
        }
        await interaction.deferReply({ ephemeral: true });
        try {
            await atualizarPainel(interaction.guild);
            await interaction.editReply('✅ **Sucesso!** O painel de hierarquia foi atualizado.');
        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ **Erro:** Falha ao atualizar. Verifique logs.');
        }
    }

    if (interaction.commandName === 'verificar-semanaatual' || interaction.commandName === 'verificar-semanapassada') {

        const isPast = (interaction.commandName === 'verificar-semanapassada');
        await sincronizarPontosNovo(interaction, isPast ? 'PASSADA' : 'ATUAL');
    }

    if (interaction.commandName === 'limpar-vendas') {
        await interaction.deferReply({ ephemeral: true });

        try {
            const appId = 'default-app-id';
            const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'redline_storage', 'main');

            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) {
                return interaction.editReply('⚠️ **Aviso:** Nenhum dado encontrado para limpar.');
            }

            const currentData = docSnap.data();
            const oldRawData = currentData.rawData || "";

            if (!oldRawData) {
                return interaction.editReply('⚠️ **Aviso:** O banco já está vazio.');
            }

            const lines = oldRawData.split('\n');
            const newLines = lines.map(line => {
                const parts = line.split('\t');
                if (parts.length >= 5) {
                    parts[4] = '0'; 
                }
                return parts.join('\t');
            });

            const newRawData = newLines.join('\n');

            await updateDoc(docRef, { rawData: newRawData, updatedAt: new Date().toISOString() });

            await interaction.editReply('✅ **Kits Zerados!**\n📦 Todos os kits foram resetados para 0.\n✅ Nomes, horas e outros dados foram **preservados**.\n\n💡 O próximo log de venda começará a contar do zero.');
        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ **Erro:** Falha ao limpar vendas. Detalhes: ' + error.message);
        }
    }

    if (interaction.commandName === 'adicionar-kits') {
        await interaction.deferReply({ ephemeral: true });

        const targetUser = interaction.options.getUser('usuario');
        const kits = interaction.options.getInteger('kits');
        const horas = interaction.options.getNumber('horas') || 0;
        const idCidade = interaction.options.getInteger('id_cidade') || 0;

        try {
            const appId = 'default-app-id';
            const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'redline_storage', 'main');

            const docSnap = await getDoc(docRef);
            let currentData = docSnap.exists() ? docSnap.data() : {};
            let rawData = currentData.rawData || "";

            const consolidatedMap = new Map();

            if (rawData) {
                const lines = rawData.split('\n');
                for (const line of lines) {
                    const parts = line.split('\t');
                    if (parts.length >= 2) {
                        const id = parts[1];
                        consolidatedMap.set(id, parts);
                    }
                }
            }

            const userId = targetUser.id;
            let record = consolidatedMap.get(userId);

            if (record) {
                
                const prevKits = parseInt(record[4]) || 0;
                const newKits = prevKits + kits;
                console.log(`[MANUAL] Atualizando ${targetUser.username}: Kits ${record[4]} -> ${newKits} (+${kits})`);
                record[4] = String(newKits); 
                if (horas > 0) record[3] = String(horas); 
                if (idCidade > 0) record[2] = String(idCidade);
            } else {
                
                console.log(`[MANUAL] Criando novo registro para ${targetUser.username}`);
                record = [
                    targetUser.username, 
                    userId,              
                    String(idCidade),    
                    String(horas),       
                    String(kits),        
                    '',                  
                    '',                  
                    ''                   
                ];
            }
            consolidatedMap.set(userId, record);

            const finalRows = Array.from(consolidatedMap.values());
            const newRawText = finalRows.map(row => row.join('\t')).join('\n');

            await setDoc(docRef, {
                ...currentData,
                rawData: newRawText,
                updatedAt: new Date().toISOString()
            });

            await interaction.editReply(`✅ **Sucesso!** Kits de ${targetUser} atualizados.\n📦 **Kits adicionados:** +${kits}\n⏰ **Horas:** ${horas}\n\nO site refletirá essa mudança imediatamente e ela será preservada nos próximos relatórios.`);

        } catch (error) {
            console.error(error);
            await interaction.editReply(`❌ **Erro:** ${error.message}`);
        }
    }

    if (interaction.commandName === 'remover-vendas') {
        await interaction.deferReply({ ephemeral: true });

        const targetUser = interaction.options.getUser('usuario');
        const kitsRemover = interaction.options.getInteger('kits');

        if (kitsRemover <= 0) {
            return interaction.editReply('❌ **Erro:** A quantidade de kits a remover deve ser um número positivo.');
        }

        try {
            const appId = 'default-app-id';
            const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'redline_storage', 'main');

            const docSnap = await getDoc(docRef);
            let currentData = docSnap.exists() ? docSnap.data() : {};
            let rawData = currentData.rawData || '';

            const consolidatedMap = new Map();
            if (rawData) {
                const lines = rawData.split('\n');
                for (const line of lines) {
                    const parts = line.split('\t');
                    if (parts.length >= 2) {
                        consolidatedMap.set(parts[1], parts);
                    }
                }
            }

            const userId = targetUser.id;
            let record = consolidatedMap.get(userId);

            if (!record) {
                return interaction.editReply(`❌ **Erro:** Nenhum registro encontrado para ${targetUser}. Ele ainda não possui vendas registradas.`);
            }

            const kitsAntes = parseInt(record[4]) || 0;
            const kitsDepois = Math.max(0, kitsAntes - kitsRemover); 

            console.log(`[MANUAL REMOÇÃO] ${targetUser.username}: Kits ${kitsAntes} -> ${kitsDepois} (Removidos: ${kitsRemover})`);
            record[4] = String(kitsDepois);
            consolidatedMap.set(userId, record);

            const finalRows = Array.from(consolidatedMap.values());
            const newRawText = finalRows.map(row => row.join('\t')).join('\n');

            await setDoc(docRef, {
                ...currentData,
                rawData: newRawText,
                updatedAt: new Date().toISOString()
            });

            const aviso = kitsAntes < kitsRemover
                ? `\n⚠️ **Aviso:** O membro tinha apenas **${kitsAntes}** kits — o valor foi zerado (não ficou negativo).`
                : '';

            await interaction.editReply(`✅ **Sucesso!** Kits de ${targetUser} atualizados.\n📦 **Kits antes:** ${kitsAntes}\n➖ **Removidos:** ${kitsRemover}\n📦 **Kits agora:** ${kitsDepois}${aviso}\n\nO site refletirá essa mudança imediatamente.`);

            sendLogDm(`📦 **[Remoção Manual de Kits]**\nAdmin: <@${interaction.user.id}>\nMembro: <@${userId}>\nKits antes: ${kitsAntes} → Agora: ${kitsDepois} (Removidos: ${kitsRemover})`);

        } catch (error) {
            console.error(error);
            await interaction.editReply(`❌ **Erro:** ${error.message}`);
        }
    }

    if (interaction.commandName === 'setar-bau') {
        await interaction.deferReply({ ephemeral: true });

        const totalBau = interaction.options.getInteger('total');
        if (totalBau <= 0) {
            return interaction.editReply('❌ **Erro:** O total deve ser um número positivo.');
        }

        try {
            const appId = 'default-app-id';
            const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'redline_storage', 'main');
            await setDoc(docRef, { totalBau, updatedAt: new Date().toISOString() }, { merge: true });

            console.log(`[SETAR-BAÚ] Total do baú definido para ${totalBau} kits por ${interaction.user.username}`);
            sendLogDm(`🪣 **[Baú Atualizado]**\nAdmin: <@${interaction.user.id}>\nTotal de kits no baú: **${totalBau}**`);

            await interaction.editReply(`✅ **Baú configurado!**\n🪣 Total de kits disponíveis para venda: **${totalBau} kits**\n\nUse \`/status-vendas\` para acompanhar o progresso.`);
        } catch (error) {
            console.error(error);
            await interaction.editReply(`❌ **Erro:** ${error.message}`);
        }
    }

    if (interaction.commandName === 'status-vendas') {
        await interaction.deferReply({ ephemeral: false });

        try {
            const appId = 'default-app-id';
            const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'redline_storage', 'main');
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                return interaction.editReply('⚠️ Nenhum dado encontrado no sistema ainda.');
            }

            const currentData = docSnap.data();
            const totalBau = currentData.totalBau || 0;
            const rawData = currentData.rawData || '';

            const vendedores = [];
            if (rawData) {
                const lines = rawData.split('\n');
                for (const line of lines) {
                    const parts = line.split('\t');
                    if (parts.length >= 5) {
                        const nome = parts[0] || 'Desconhecido';
                        const id = parts[1] || '';
                        const kits = parseInt(parts[4]) || 0;
                        if (kits > 0) {
                            vendedores.push({ nome, id, kits });
                        }
                    }
                }
            }

            const totalVendido = vendedores.reduce((acc, v) => acc + v.kits, 0);
            const totalFaltando = Math.max(0, totalBau - totalVendido);
            const porcentagem = totalBau > 0 ? Math.min(100, Math.round((totalVendido / totalBau) * 100)) : 0;

            const blocosTotal = 20;
            const blocosPreenchidos = Math.round((porcentagem / 100) * blocosTotal);
            const barra = '█'.repeat(blocosPreenchidos) + '░'.repeat(blocosTotal - blocosPreenchidos);

            let statusEmoji = '🟡';
            if (porcentagem >= 100) statusEmoji = '✅';
            else if (porcentagem >= 75) statusEmoji = '🟠';
            else if (porcentagem < 25 && totalBau > 0) statusEmoji = '🔴';

            vendedores.sort((a, b) => b.kits - a.kits);
            const top3 = vendedores.slice(0, 3);
            const topTexto = top3.length > 0
                ? top3.map((v, i) => {
                    const medal = ['🥇', '🥈', '🥉'][i];
                    return `${medal} <@${v.id}> — **${v.kits}** kits`;
                }).join('\n')
                : '*Nenhuma venda registrada ainda.*';

            const updatedAt = currentData.updatedAt
                ? `<t:${Math.floor(new Date(currentData.updatedAt).getTime() / 1000)}:R>`
                : 'N/A';

            const embed = new EmbedBuilder()
                .setColor(porcentagem >= 100 ? '#57F287' : porcentagem >= 75 ? '#FEE75C' : '#ED4245')
                .setTitle('📦 Painel de Vendas — Status do Baú')
                .setDescription(
                    `**Progresso Geral** ${statusEmoji}\n` +
                    `\`[${barra}] ${porcentagem}%\`\n\n` +
                    `🪣 **Total no Baú:** ${totalBau > 0 ? `${totalBau} kits` : '*Não definido — use `/setar-bau`*'}\n` +
                    `💰 **Vendidos:** ${totalVendido} kits\n` +
                    `⏳ **Faltando:** ${totalBau > 0 ? `${totalFaltando} kits` : 'N/A'}`
                )
                .addFields({ name: '🏆 Top Vendedores', value: topTexto })
                .setFooter({ text: `Última atualização: ${updatedAt} • ${vendedores.length} membro(s) com vendas` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            await interaction.editReply(`❌ **Erro:** ${error.message}`);
        }
    }

    if (interaction.commandName === 'painel-mensagens') {

        const embed = new EmbedBuilder()
            .setColor(Colors.Blurple)
            .setTitle('🤖 Gerenciador de Mensagens Automáticas')
            .setDescription('Selecione uma ação abaixo para configurar as mensagens programadas do bot.')
            .addFields(
                { name: '➕ Adicionar', value: 'Cria uma nova mensagem recorrente.', inline: true },
                { name: '📢 Enviar Agora', value: 'Envia uma mensagem única imediatamente.', inline: true },
                { name: '📋 Listar/Gerenciar', value: 'Visualiza e edita mensagens existentes.', inline: true }
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_panel_add').setLabel('Agendar Mensagem').setStyle(ButtonStyle.Success).setEmoji('➕'),
            new ButtonBuilder().setCustomId('btn_panel_send_now').setLabel('Enviar Agora').setStyle(ButtonStyle.Secondary).setEmoji('📢'),
            new ButtonBuilder().setCustomId('btn_panel_list').setLabel('Gerenciar Agendadas').setStyle(ButtonStyle.Primary).setEmoji('📋')
        );

        return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }
});

client.on('interactionCreate', async interaction => {
    
    if (interaction.isChannelSelectMenu() && interaction.customId === 'select_channel_add') {
        const channelId = interaction.values[0]; 

        const modal = new ModalBuilder()
            .setCustomId(`modal_add_msg_${channelId}`)
            .setTitle('Nova Mensagem Programada');

        const intervalInput = new TextInputBuilder()
            .setCustomId('input_interval')
            .setLabel("Intervalo (Ex: 30m, 1h, 24h)")
            .setPlaceholder("Digite o tempo entre envios...")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const msgInput = new TextInputBuilder()
            .setCustomId('input_content')
            .setLabel("Conteúdo da Mensagem")
            .setPlaceholder("Digite aqui... Suporta Emojis e Menções <@&ID>")
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(2000)
            .setRequired(true);

        const row1 = new ActionRowBuilder().addComponents(intervalInput);
        const row2 = new ActionRowBuilder().addComponents(msgInput);

        modal.addComponents(row1, row2);
        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_add_msg_')) {
        const channelId = interaction.customId.split('_')[3]; 
        const intervalStr = interaction.fields.getTextInputValue('input_interval');
        const content = interaction.fields.getTextInputValue('input_content');

        const intervalMs = parseInterval(intervalStr);
        if (!intervalMs || intervalMs < 60000) {
            return interaction.reply({ content: '⚠️ **Intervalo inválido!** Use formatos como 30m, 1h, 2d (Mínimo 1 min). Tente novamente.', ephemeral: true });
        }

        try {
            await addDoc(collection(db, 'scheduled_messages'), {
                channelId: channelId,
                content: content,
                intervalStr: intervalStr,
                intervalMs: intervalMs,
                lastRun: 0,
                createdAt: new Date().toISOString(),
                authorId: interaction.user.id
            });
            return interaction.reply({ content: `✅ **Mensagem Salva!**\nVai ser enviada no canal <#${channelId}> a cada \`${intervalStr}\`.`, ephemeral: true });
        } catch (e) {
            return interaction.reply({ content: '❌ Erro ao salvar no banco de dados.', ephemeral: true });
        }
    }

    if (interaction.isChannelSelectMenu() && interaction.customId === 'select_channel_send_now') {
        const channelId = interaction.values[0];
        const modal = new ModalBuilder()
            .setCustomId(`modal_send_now_${channelId}`)
            .setTitle('Enviar Mensagem Imediata');

        const msgInput = new TextInputBuilder()
            .setCustomId('input_content_now')
            .setLabel("Conteúdo da Mensagem")
            .setPlaceholder("Digite aqui... A mensagem será enviada assim que clicar em Enviar.")
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(2000)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(msgInput));
        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_send_now_')) {
        const channelId = interaction.customId.split('_')[3];
        const content = interaction.fields.getTextInputValue('input_content_now');

        try {
            const channel = interaction.guild.channels.cache.get(channelId) || await interaction.guild.channels.fetch(channelId);
            if (!channel) return interaction.reply({ content: '❌ Canal não encontrado.', ephemeral: true });

            const finalText = await formatarMensagem(interaction.guild, content);

            await channel.send(finalText);
            return interaction.reply({ content: `✅ **Mensagem Enviada!**\nConfira em: ${channel}`, ephemeral: true });
        } catch (e) {
            console.error(e);
            return interaction.reply({ content: `❌ Erro ao enviar: ${e.message}`, ephemeral: true });
        }
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'select_msg_manage') {
        const msgId = interaction.values[0];

        try {
            const docRef = doc(db, 'scheduled_messages', msgId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                return interaction.reply({ content: '❌ Mensagem não encontrada (pode ter sido apagada).', ephemeral: true });
            }

            const data = docSnap.data();

            const embed = new EmbedBuilder()
                .setColor(Colors.Orange)
                .setTitle('⚙️ Detalhes da Mensagem')
                .addFields(
                    { name: '🆔 ID', value: msgId, inline: true },
                    { name: '📢 Canal', value: `<#${data.channelId}>`, inline: true },
                    { name: '⏰ Intervalo', value: data.intervalStr, inline: true },
                    { name: '💬 Conteúdo', value: data.content.substring(0, 1024) } 
                );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`btn_edit_${msgId}`).setLabel('✏️ Editar').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`btn_delete_${msgId}`).setLabel('🗑️ Apagar').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`btn_back`).setLabel('🔙 Voltar').setStyle(ButtonStyle.Secondary)
            );

            await interaction.update({ content: null, embeds: [embed], components: [row] });

        } catch (e) {
            await interaction.reply({ content: '❌ Erro ao buscar dados.', ephemeral: true });
        }
    }

    if (interaction.isButton()) {
        const id = interaction.customId;

        if (id === 'btn_panel_add') {
            const row = new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder()
                    .setCustomId('select_channel_add')
                    .setPlaceholder('Selecione o canal para programar')
                    .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            );
            return interaction.reply({ content: '📅 **Agendar:** Escolha o canal de destino:', components: [row], ephemeral: true });
        }

        if (id === 'btn_panel_send_now') {
            const row = new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder()
                    .setCustomId('select_channel_send_now')
                    .setPlaceholder('Selecione o canal para enviar agora')
                    .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            );
            return interaction.reply({ content: '📢 **Envio Imediato:** Escolha o canal de destino:', components: [row], ephemeral: true });
        }

        if (id === 'btn_panel_list' || id === 'btn_back') {

            const snapshot = await getDocs(collection(db, 'scheduled_messages'));
            if (snapshot.empty) {
                const msg = { content: '📭 Nenhuma mensagem configurada no momento.', components: [], embeds: [] };
                if (interaction.replied || interaction.deferred) return interaction.followUp({ ...msg, ephemeral: true });
                if (id === 'btn_back') return interaction.update(msg);
                return interaction.reply({ ...msg, ephemeral: true });
            }

            const menu = new StringSelectMenuBuilder()
                .setCustomId('select_msg_manage')
                .setPlaceholder('Selecione uma mensagem para ver opções...');

            snapshot.forEach(docSnap => {
                const d = docSnap.data();
                const label = `${d.intervalStr} em #${interaction.guild.channels.cache.get(d.channelId)?.name || d.channelId}`;
                
                const description = d.content.length > 50 ? d.content.substring(0, 47) + '...' : d.content;

                menu.addOptions({
                    label: label.substring(0, 100), 
                    description: description.substring(0, 100),
                    value: docSnap.id
                });
            });

            const row = new ActionRowBuilder().addComponents(menu);
            const msgPayload = { content: '📂 **Selecione uma mensagem da lista:**', embeds: [], components: [row] };

            if (id === 'btn_back') return interaction.update(msgPayload);
            return interaction.reply({ ...msgPayload, ephemeral: true });
        }

        if (id.startsWith('btn_delete_')) {
            const msgId = id.replace('btn_delete_', '');
            try {
                await deleteDoc(doc(db, 'scheduled_messages', msgId));
                return interaction.update({ content: `✅ Mensagem removida com sucesso!`, embeds: [], components: [] });
            } catch (e) {
                return interaction.reply({ content: '❌ Erro ao remover.', ephemeral: true });
            }
        }

        if (id.startsWith('btn_edit_')) {
            const msgId = id.replace('btn_edit_', '');

            const docSnap = await getDoc(doc(db, 'scheduled_messages', msgId));
            if (!docSnap.exists()) return interaction.reply({ content: '❌ Mensagem não existe mais.', ephemeral: true });
            const data = docSnap.data();

            const modal = new ModalBuilder()
                .setCustomId(`modal_edit_msg_${msgId}`)
                .setTitle('Editar Mensagem');

            const intervalInput = new TextInputBuilder()
                .setCustomId('input_edit_interval')
                .setLabel("Novo Intervalo")
                .setValue(data.intervalStr)
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const msgInput = new TextInputBuilder()
                .setCustomId('input_edit_content')
                .setLabel("Novo Conteúdo")
                .setValue(data.content)
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(intervalInput), new ActionRowBuilder().addComponents(msgInput));
            await interaction.showModal(modal);
        }
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_edit_msg_')) {
        const msgId = interaction.customId.replace('modal_edit_msg_', '');
        const newInterval = interaction.fields.getTextInputValue('input_edit_interval');
        const newContent = interaction.fields.getTextInputValue('input_edit_content');

        const intervalMs = parseInterval(newInterval);
        if (!intervalMs || intervalMs < 60000) {
            return interaction.reply({ content: '⚠️ Intervalo inválido (Min 1m). Edição cancelada.', ephemeral: true });
        }

        try {
            await updateDoc(doc(db, 'scheduled_messages', msgId), {
                intervalStr: newInterval,
                intervalMs: intervalMs,
                content: newContent
            });
            return interaction.reply({ content: '✅ Mensagem atualizada com sucesso!', ephemeral: true });
        } catch (e) {
            return interaction.reply({ content: '❌ Erro ao atualizar.', ephemeral: true });
        }
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ [Anti-Crash] Rejeição não tratada:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('⚠️ [Anti-Crash] Erro não capturado:', error);
});

client.login(CONFIG.TOKEN);