const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

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
 * Controle de primeira interação por usuário
 * (em memória — reinicia se o bot reiniciar)
 */
const atendidos = new Set();

/**
 * Recebimento de mensagens
 */
client.on('message', async message => {
    try {
        const msg = message.body.trim();
        const chatId = message.from;

        console.log('📩 Mensagem recebida:', msg, 'de', chatId);

        // PRIMEIRA MENSAGEM
        if (!atendidos.has(chatId)) {
            atendidos.add(chatId);

            await message.reply(
                'Olá! 👋\n\n' +
                'Sou o atendimento automático da *G6 Cloud*.\n' +
                'Como posso ajudar?\n\n' +
                '1️⃣ Serviços em nuvem\n' +
                '2️⃣ Suporte técnico\n' +
                '3️⃣ Falar com um especialista'
            );
            return;
        }

        // OPÇÃO 1
        if (msg === '1') {
            await message.reply(
                '☁️ *Serviços em nuvem*\n\n' +
                '• Migração para AWS e Oracle\n' +
                '• Otimização de custos\n' +
                '• Segurança e arquitetura cloud'
            );
            return;
        }

        // OPÇÃO 2
        if (msg === '2') {
            await message.reply(
                '🛠️ *Suporte técnico*\n\n' +
                'Atendimento especializado para ambientes em nuvem.'
            );
            return;
        }

        // OPÇÃO 3
        if (msg === '3') {
            await message.reply(
                '📞 *Contato com especialista*\n\n' +
                'Um especialista da G6 Cloud entrará em contato em breve.'
            );
            return;
        }

        // QUALQUER OUTRA MENSAGEM
        await message.reply(
            '❗ Opção inválida.\n\n' +
            'Por favor, responda com:\n' +
            '1️⃣ Serviços em nuvem\n' +
            '2️⃣ Suporte técnico\n' +
            '3️⃣ Falar com um especialista'
        );

    } catch (error) {
        console.error('❌ Erro ao processar mensagem:', error);
    }
});

/**
 * Inicializa o bot
 */
client.initialize();