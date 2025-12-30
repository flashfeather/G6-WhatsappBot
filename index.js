const { Client, LocalAuth } = require('whatsapp-web.js');
require('dotenv').config();

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', qr => {
    console.log('📱 Escaneie o QR Code abaixo:');
    console.log(qr);
});

client.on('ready', () => {
    console.log('✅ Bot conectado e funcionando!');
});

client.on('message', message => {
    const msg = message.body.toLowerCase();

    if (msg === 'oi' || msg === 'olá') {
        message.reply(
            'Olá! 👋\n' +
            'Sou o bot automático da G6 Cloud.\n\n' +
            'Digite:\n' +
            '1️⃣ Suporte\n' +
            '2️⃣ Comercial\n' +
            '3️⃣ Horário de atendimento'
        );
    }

    if (msg === '1') {
        message.reply('🛠️ Suporte técnico: suporte@g6cloud.com');
    }

    if (msg === '2') {
        message.reply('💼 Comercial: comercial@g6cloud.com');
    }

    if (msg === '3') {
        message.reply('⏰ Atendimento: Segunda a Sexta, das 9h às 18h');
    }
});

client.initialize();
