const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ Bot conectado e funcionando!');
});

client.on('message', message => {
    const msg = message.body.trim().toLowerCase();

    console.log('Mensagem recebida:', msg);

    // Ignora mensagens vazias
    if (!msg) return;

    // Resposta automática para QUALQUER mensagem
    message.reply(
        'Olá! 👋\n\n' +
        'Sou o atendimento automático da *G6 Cloud*.\n\n' +
        'Recebemos sua mensagem e em breve um especialista poderá falar com você.\n\n' +
        'Enquanto isso, posso ajudar com:\n' +
        '1️⃣ Serviços em nuvem (AWS / Oracle / Multicloud)\n' +
        '2️⃣ Suporte técnico\n' +
        '3️⃣ Falar com um especialista\n\n' +
        'Responda com o número da opção desejada.'
    );
});

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
