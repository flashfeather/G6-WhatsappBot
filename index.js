const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

/**
 * Inicialização do cliente WhatsApp
 */
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    }
});

/**
 * QR Code no terminal
 */
client.on('qr', qr => {
    console.log('📱 Escaneie o QR Code abaixo:');
    qrcode.generate(qr, { small: true });
});

/**
 * Bot pronto
 */
client.on('ready', () => {
    console.log('✅ Bot conectado e funcionando!');
});

/**
 * Estado simples por usuário (persistido em arquivo)
 */
const DATA_DIR = path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const LOG_FILE = path.join(DATA_DIR, 'events.log');

const BUSINESS_HOURS_START = Number(process.env.BUSINESS_HOURS_START || 8); // 08:00
const BUSINESS_HOURS_END = Number(process.env.BUSINESS_HOURS_END || 18); // 18:00
const BUSINESS_DAYS = (process.env.BUSINESS_DAYS || '1,2,3,4,5')
    .split(',')
    .map(value => Number(value.trim()))
    .filter(value => !Number.isNaN(value));

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

function loadState() {
    try {
        ensureDataDir();
        if (!fs.existsSync(STATE_FILE)) {
            return {};
        }
        return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) || {};
    } catch (error) {
        console.error('❌ Erro ao carregar estado:', error);
        return {};
    }
}

function saveState(state) {
    try {
        ensureDataDir();
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
    } catch (error) {
        console.error('❌ Erro ao salvar estado:', error);
    }
}

function logEvent(event) {
    try {
        ensureDataDir();
        const payload = {
            timestamp: new Date().toISOString(),
            ...event
        };
        fs.appendFileSync(LOG_FILE, `${JSON.stringify(payload)}\n`, 'utf-8');
    } catch (error) {
        console.error('❌ Erro ao registrar log:', error);
    }
}

const stateByChat = loadState();

function getHourGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
}

function normalizeText(text) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function getBusinessHoursStatus() {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    const isBusinessDay = BUSINESS_DAYS.includes(day);
    const isBusinessHour = hour >= BUSINESS_HOURS_START && hour < BUSINESS_HOURS_END;
    return {
        within: isBusinessDay && isBusinessHour,
        note: '⏰ *Estamos fora do horário comercial.*\nMesmo assim posso registrar sua solicitação.'
    };
}

function getMenuMessage(name, includeOffHoursNote) {
    const greet = getHourGreeting();
    const prefix = name ? `${greet}, ${name}!` : `${greet}!`;
    const offHoursNote = includeOffHoursNote ? `${getBusinessHoursStatus().note}\n\n` : '';
    return (
        `${prefix} 👋\n\n` +
        offHoursNote +
        'Sou o atendimento automático da *G6 Cloud*.\n' +
        'Como posso ajudar?\n\n' +
        '1️⃣ Serviços em nuvem\n' +
        '2️⃣ Suporte técnico\n' +
        '3️⃣ Falar com especialista\n' +
        '0️⃣ Falar com humano\n\n' +
        'Digite *menu* para ver as opções ou *ajuda*.'
    );
}

function getHelpMessage() {
    return (
        'ℹ️ *Ajuda rápida*\n\n' +
        '• Responda com 1, 2 ou 3\n' +
        '• Digite *menu* para ver as opções\n' +
        '• Digite *voltar* para retornar ao menu\n' +
        '• Digite *0* para falar com humano'
    );
}

async function sendReply(message, text, meta = {}) {
    await message.reply(text);
    logEvent({
        type: 'reply',
        chatId: message.from,
        meta,
        text
    });
}

/**
 * Recebimento de mensagens
 */
client.on('message', async message => {
    try {
        const rawMsg = message.body || '';
        const msg = normalizeText(rawMsg);
        const chatId = message.from;

        console.log('📩 Mensagem recebida:', rawMsg, 'de', chatId);
        logEvent({
            type: 'incoming',
            chatId,
            text: rawMsg
        });

        const currentState = stateByChat[chatId] || {
            stage: 'new',
            name: null,
            lastInteractionAt: Date.now()
        };

        currentState.lastInteractionAt = Date.now();

        const isMenuCommand = msg === 'menu' || msg === 'opcoes' || msg === 'opções';
        const isHelpCommand = msg === 'ajuda' || msg === 'help';
        const isBackCommand = msg === 'voltar';

        const businessStatus = getBusinessHoursStatus();

        if (isHelpCommand) {
            await sendReply(message, getHelpMessage(), { action: 'help' });
            return;
        }

        if (isMenuCommand || isBackCommand) {
            currentState.stage = 'menu';
            stateByChat[chatId] = currentState;
            saveState(stateByChat);
            await sendReply(message, getMenuMessage(currentState.name, !businessStatus.within), { action: 'menu' });
            return;
        }

        if (currentState.stage === 'collect_name') {
            currentState.name = rawMsg.trim().split(' ')[0] || null;
            currentState.stage = 'menu';
            stateByChat[chatId] = currentState;
            saveState(stateByChat);
            await sendReply(message, getMenuMessage(currentState.name, !businessStatus.within), { action: 'collect_name' });
            return;
        }

        // PRIMEIRA MENSAGEM
        if (currentState.stage === 'new') {
            currentState.stage = 'collect_name';
            stateByChat[chatId] = currentState;
            saveState(stateByChat);
            await sendReply(message, 'Olá! 👋\n\nPara começar, qual é o seu *primeiro nome*?', { action: 'ask_name' });
            return;
        }

        // OPÇÃO 1
        if (msg === '1' || msg.includes('servico') || msg.includes('nuvem') || msg.includes('cloud')) {
            await sendReply(
                message,
                '☁️ *Serviços em nuvem*\n\n' +
                '• Migração para AWS e Oracle\n' +
                '• Otimização de custos (FinOps)\n' +
                '• Segurança e arquitetura\n\n' +
                'Se quiser, descreva seu cenário em 1 frase.',
                { action: 'services' }
            );
            return;
        }

        // OPÇÃO 2
        if (msg === '2' || msg.includes('suporte') || msg.includes('tecnico') || msg.includes('técnico')) {
            await sendReply(
                message,
                '🛠️ *Suporte técnico*\n\n' +
                'Atendimento especializado para ambientes em nuvem.\n' +
                'Informe a urgência: *baixa*, *média* ou *alta*.',
                { action: 'support' }
            );
            return;
        }

        // OPÇÃO 3
        if (msg === '3' || msg.includes('especialista') || msg.includes('consultor') || msg.includes('consultoria')) {
            await sendReply(
                message,
                '📞 *Contato com especialista*\n\n' +
                'Qual o melhor horário para contato? (ex: manhã, tarde, 18h)',
                { action: 'specialist' }
            );
            return;
        }

        // OPÇÃO 0 - HUMANO
        if (msg === '0' || msg.includes('humano') || msg.includes('atendente')) {
            currentState.stage = 'handoff';
            stateByChat[chatId] = currentState;
            saveState(stateByChat);
            const handoffMessage = businessStatus.within
                ? '✅ Certo! Um atendente humano vai falar com você o quanto antes.\nSe puder, informe seu e-mail ou telefone de contato.'
                : '✅ Certo! Vamos acionar um atendente humano.\nEstamos fora do horário comercial, mas retornaremos no próximo expediente.\nSe puder, informe seu e-mail ou telefone de contato.';

            await sendReply(message, handoffMessage, { action: 'handoff' });
            logEvent({ type: 'handoff_request', chatId, withinBusinessHours: businessStatus.within });
            return;
        }

        // QUALQUER OUTRA MENSAGEM
        await sendReply(
            message,
            '❗ Opção inválida.\n\n' +
            'Por favor, responda com:\n' +
            '1️⃣ Serviços em nuvem\n' +
            '2️⃣ Suporte técnico\n' +
            '3️⃣ Falar com especialista\n' +
            '0️⃣ Falar com humano\n\n' +
            'Ou digite *menu*.',
            { action: 'invalid_option' }
        );

        stateByChat[chatId] = currentState;
        saveState(stateByChat);

    } catch (error) {
        console.error('❌ Erro ao processar mensagem:', error);
    }
});

/**
 * Inicializa o bot
 */
client.initialize();