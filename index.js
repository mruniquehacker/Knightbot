const settings = require('./settings');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');

// Global settings
global.packname = settings.packname;
global.author = settings.author;
global.channelLink = "https://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A";
global.ytch = "Mr Unique Hacker";

// Commands
const tagAllCommand = require('./commands/tagall');
const helpCommand = require('./commands/help');
const welcomeNewMembers = require('./commands/welcome');
const sayGoodbye = require('./commands/goodbye');
const banCommand = require('./commands/ban');
const promoteCommand = require('./commands/promote');
const demoteCommand = require('./commands/demote');
const muteCommand = require('./commands/mute');
const unmuteCommand = require('./commands/unmute');
const stickerCommand = require('./commands/sticker');
const isAdmin = require('./helpers/isAdmin');
const warnCommand = require('./commands/warn');
const warningsCommand = require('./commands/warnings');
const ttsCommand = require('./commands/tts');
const { tictactoeCommand, tictactoeMove } = require('./commands/tictactoe');
const { incrementMessageCount, topMembers } = require('./commands/topmembers');
const ownerCommand = require('./commands/owner');
const deleteCommand = require('./commands/delete');
const { handleAntilinkCommand, handleLinkDetection } = require('./commands/antilink');
const memeCommand = require('./commands/meme');
const tagCommand = require('./commands/tag');
const jokeCommand = require('./commands/joke');
const quoteCommand = require('./commands/quote');
const factCommand = require('./commands/fact');
const weatherCommand = require('./commands/weather');
const newsCommand = require('./commands/news');
const kickCommand = require('./commands/kick');
const simageCommand = require('./commands/simage');
const attpCommand = require('./commands/attp');
const { startHangman, guessLetter } = require('./commands/hangman');
const { startTrivia, answerTrivia } = require('./commands/trivia');
const { complimentCommand } = require('./commands/compliment');
const { insultCommand } = require('./commands/insult');
const { eightBallCommand } = require('./commands/eightball');
const { lyricsCommand } = require('./commands/lyrics');
const { dareCommand } = require('./commands/dare');
const { truthCommand } = require('./commands/truth');
const { clearCommand } = require('./commands/clear');

// Data storage path
const dataDirectory = path.join(__dirname, './data');
const dataFile = path.join(dataDirectory, './userGroupData.json');

// Ensure data directory exists
if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory);
}

// Initialize or load user group data
let userGroupData = { users: [], groups: [] };
if (fs.existsSync(dataFile)) {
    userGroupData = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
} else {
    fs.writeFileSync(dataFile, JSON.stringify(userGroupData, null, 2));
}

// Function to save user and group data to file
function saveUserGroupData() {
    try {
        fs.writeFileSync(dataFile, JSON.stringify(userGroupData, null, 2));
    } catch (error) {
        console.error('Error Creating Database:', error);
    }
}

// Function to send a global broadcast message
const globalBroadcastMessage = "🌟 This is a global broadcast message from KnightBot! Stay tuned for updates.";

async function sendGlobalBroadcastMessage(sock) {
    if (userGroupData.groups.length === 0 && userGroupData.users.length === 0) return;

    for (const groupId of userGroupData.groups) {
        console.log(`Sending broadcast to group: ${groupId}`);
        await sock.sendMessage(groupId, { text: globalBroadcastMessage });
    }

    for (const userId of userGroupData.users) {
        console.log(`Sending broadcast to user: ${userId}`);
        await sock.sendMessage(userId, { text: globalBroadcastMessage });
    }
}

// Custom logger to filter unnecessary messages
const logger = P({
    level: 'silent',
    enabled: false
});

// Console output helper
const printLog = {
    success: (msg) => console.log(chalk.green(`\n[✓] ${msg}`)),
    info: (msg) => console.log(chalk.blue(`\n[i] ${msg}`)),
    warn: (msg) => console.log(chalk.yellow(`\n[!] ${msg}`)),
    error: (msg) => console.log(chalk.red(`\n[x] ${msg}`))
};

// Global state management
let connectionState = {
    isConnected: false,
    qrDisplayed: false,
    retryCount: 0,
    sessionExists: false,
    lastPing: Date.now()
};

async function startBot() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
        connectionState.sessionExists = state?.creds?.registered || false;

        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: true,
            logger,
            browser: ['KnightBot', 'Chrome', '1.0.0'],
            connectTimeoutMs: 60000,
            qrTimeout: 40000,
            defaultQueryTimeoutMs: 60000,
            markOnlineOnConnect: true,
            keepAliveIntervalMs: 30000,
            retryRequestDelayMs: 2000,
            emitOwnEvents: true
        });

        // Connection monitoring
        const connectionMonitor = setInterval(async () => {
            if (!connectionState.isConnected) return;
            
            try {
                await sock.sendMessage(sock.user.id, { text: '' }, { ephemeral: true })
                    .catch(() => {});
                connectionState.lastPing = Date.now();
            } catch (err) {
                if (Date.now() - connectionState.lastPing > 30000) {
                    printLog.warn('Connection check failed, attempting reconnect...');
                    clearInterval(connectionMonitor);
                    sock.end();
                }
            }
        }, 30000);

        sock.ev.on('creds.update', saveCreds);

        // Clean up database creation messages
        const createDatabase = () => {
            try {
                if (!fs.existsSync(dataFile)) {
                    fs.writeFileSync(dataFile, JSON.stringify(userGroupData, null, 2));
                    printLog.info('Database initialized');
                }
            } catch (error) {
                printLog.error('Error creating database');
            }
        };

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr && !connectionState.qrDisplayed && !connectionState.isConnected) {
                connectionState.qrDisplayed = true;
                printLog.info('Scan the QR code above to connect (Valid for 40 seconds)');
            }

            if (connection === 'close') {
                clearInterval(connectionMonitor);
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const reason = lastDisconnect?.error?.output?.payload?.error;
                printLog.error(`Connection closed: ${reason || 'Unknown reason'}`);

                const shouldReconnect = (
                    statusCode !== DisconnectReason.loggedOut &&
                    statusCode !== DisconnectReason.badSession &&
                    connectionState.retryCount < 3
                );

                if (shouldReconnect) {
                    connectionState.retryCount++;
                    const delay = Math.min(connectionState.retryCount * 2000, 10000);
                    printLog.warn(`Reconnecting in ${delay/1000}s... (Attempt ${connectionState.retryCount}/3)`);
                    setTimeout(startBot, delay);
                } else {
                    printLog.error('Connection terminated. Please restart the bot.');
                    process.exit(1);
                }
            } else if (connection === 'open') {
                connectionState.isConnected = true;
                connectionState.qrDisplayed = false;
                connectionState.retryCount = 0;
                connectionState.lastPing = Date.now();
                printLog.success('Successfully connected to WhatsApp!');

                try {
                    const botNumber = sock.user.id;
                    await sock.sendMessage(botNumber, {
                        text: '🎉 Bot connected successfully!'
                    });
                } catch (err) {
                    // Silently handle confirmation message error
                }
            }
        });

        // Handle group events with clean logging
        sock.ev.on('group-participants.update', async (update) => {
            const { id, participants, action } = update;
            if (action === 'add') {
                printLog.info(`New member(s) joined group ${id.split('@')[0]}`);
            } else if (action === 'remove') {
                printLog.info(`Member(s) left group ${id.split('@')[0]}`);
            }
        });

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            printLog.warn('Shutting down bot gracefully...');
            clearInterval(connectionMonitor);
            try {
                await sock.logout();
            } catch (err) {
                printLog.error('Error during logout');
            }
            process.exit(0);
        });

        // Broadcast message every 12 hours
        setInterval(async () => {
            if (sock) await sendGlobalBroadcastMessage(sock);
        }, 12 * 60 * 60 * 1000);

        // Message handling
        sock.ev.on('messages.upsert', async (messageUpdate) => {
            const message = messageUpdate.messages[0];
            const chatId = message.key.remoteJid;
            const senderId = message.key.participant || message.key.remoteJid;

            if (!message.message) return;

            const isGroup = chatId.endsWith('@g.us');

            if (isGroup) {
                if (!userGroupData.groups.includes(chatId)) {
                    userGroupData.groups.push(chatId);
                    printLog.info(`Added new group: ${chatId}`);
                    saveUserGroupData();
                }
            } else {
                if (!userGroupData.users.includes(chatId)) {
                    userGroupData.users.push(chatId);
                    printLog.info(`Added new user: ${chatId}`);
                    saveUserGroupData();
                }
            }

            let userMessage = message.message?.conversation?.trim().toLowerCase() ||
                message.message?.extendedTextMessage?.text?.trim().toLowerCase() || '';
            userMessage = userMessage.replace(/\.\s+/g, '.').trim();

            // Basic message response in private chat
            if (!isGroup && (userMessage === 'hi' || userMessage === 'hello' || userMessage === 'bot')) {
                await sock.sendMessage(chatId, {
                    text: 'Hi, How can I help you?\nYou can use .menu for more info and commands.'
                });
                return;
            }

            // Ignore messages that don't start with a command prefix
            if (!userMessage.startsWith('.')) return;

            // List of admin commands
            const adminCommands = ['.mute', '.unmute', '.ban', '.promote', '.demote', '.kick', '.tagall', '.antilink'];
            const isAdminCommand = adminCommands.some(cmd => userMessage.startsWith(cmd));

            let isSenderAdmin = false;
            let isBotAdmin = false;

            if (isGroup && isAdminCommand) {
                const adminStatus = await isAdmin(sock, chatId, senderId);
                isSenderAdmin = adminStatus.isSenderAdmin;
                isBotAdmin = adminStatus.isBotAdmin;

                if (!isBotAdmin) {
                    await sock.sendMessage(chatId, { text: 'Please make the bot an admin to use admin commands.' });
                    return;
                }

                if (
                    userMessage.startsWith('.mute') ||
                    userMessage === '.unmute' ||
                    userMessage.startsWith('.ban') ||
                    userMessage.startsWith('.promote') ||
                    userMessage.startsWith('.demote')
                ) {
                    if (!isSenderAdmin && !message.key.fromMe) {
                        await sock.sendMessage(chatId, { text: 'Sorry, only group admins can use this command.' });
                        return;
                    }
                }

                // Handling promote and demote commands
                if (userMessage.startsWith('.promote')) {
                    const mentionedJidList = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                    await promoteCommand(sock, chatId, mentionedJidList);
                } else if (userMessage.startsWith('.demote')) {
                    const mentionedJidList = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                    await demoteCommand(sock, chatId, mentionedJidList);
                }
            }

            if (!message.key.fromMe) incrementMessageCount(chatId, senderId);

            // Command handlers
            switch (true) {
                case userMessage === '.simage': {
                    const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                    if (quotedMessage?.stickerMessage) {
                        await simageCommand(sock, quotedMessage, chatId);
                    } else {
                        await sock.sendMessage(chatId, { text: 'Please reply to a sticker with the .simage command to convert it.' });
                    }
                    break;
                }
                case userMessage.startsWith('.kick'):
                    const mentionedJidListKick = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                    if (mentionedJidListKick.length > 0) {
                        await kickCommand(sock, chatId, senderId, mentionedJidListKick, message.message?.extendedTextMessage?.contextInfo);
                    } else {
                        await sock.sendMessage(chatId, { text: 'Please mention a user to kick.' });
                    }
                    break;
                case userMessage.startsWith('.mute'):
                    const muteDuration = parseInt(userMessage.split(' ')[1]);
                    if (isNaN(muteDuration)) {
                        await sock.sendMessage(chatId, { text: 'Please provide a valid number of minutes.' });
                    } else {
                        await muteCommand(sock, chatId, senderId, muteDuration);
                    }
                    break;
                case userMessage === '.unmute':
                    await unmuteCommand(sock, chatId, senderId);
                    break;
                case userMessage.startsWith('.ban'):
                    const mentionedJidListBan = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                    if (mentionedJidListBan.length > 0) {
                        await banCommand(sock, chatId, senderId, mentionedJidListBan);
                    } else {
                        await sock.sendMessage(chatId, { text: 'Please mention users to ban.' });
                    }
                    break;
                case userMessage === '.help' || userMessage === '.menu' || userMessage === '.bot' || userMessage === '.list':
                    await helpCommand(sock, chatId, global.channelLink);
                    break;
                case userMessage.startsWith('.sticker') || userMessage.startsWith('.s'):
                    await stickerCommand(sock, chatId, message);
                    break;
                case userMessage.startsWith('.warnings'):
                    const mentionedJidListWarnings = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                    await warningsCommand(sock, chatId, mentionedJidListWarnings);
                    break;
                case userMessage.startsWith('.warn'):
                    const mentionedJidListWarn = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                    await warnCommand(sock, chatId, senderId, mentionedJidListWarn);
                    break;
                case userMessage.startsWith('.tts'):
                    const text = userMessage.slice(4).trim();
                    await ttsCommand(sock, chatId, text);
                    break;
                case userMessage === '.delete' || userMessage === '.del':
                    await deleteCommand(sock, chatId, message, senderId);
                    break;
                case userMessage.startsWith('.attp'):
                    await attpCommand(sock, chatId, message);
                    break;
                case userMessage === '.owner':
                    await ownerCommand(sock, chatId);
                    break;
                case userMessage === '.tagall':
                    if (isSenderAdmin || message.key.fromMe) {
                        await tagAllCommand(sock, chatId, senderId);
                    } else {
                        await sock.sendMessage(chatId, { text: 'Sorry, only group admins can use the .tagall command.' });
                    }
                    break;
                case userMessage.startsWith('.tag'):
                    const messageText = userMessage.slice(4).trim();
                    const replyMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
                    await tagCommand(sock, chatId, senderId, messageText, replyMessage);
                    break;
                case userMessage.startsWith('.antilink'):
                    await handleAntilinkCommand(sock, chatId, userMessage, senderId, isSenderAdmin);
                    break;
                case userMessage === '.meme':
                    await memeCommand(sock, chatId);
                    break;
                case userMessage === '.joke':
                    await jokeCommand(sock, chatId);
                    break;
                case userMessage === '.quote':
                    await quoteCommand(sock, chatId);
                    break;
                case userMessage === '.fact':
                    await factCommand(sock, chatId);
                    break;
                case userMessage.startsWith('.weather'):
                    const city = userMessage.slice(9).trim();
                    if (city) {
                        await weatherCommand(sock, chatId, city);
                    } else {
                        await sock.sendMessage(chatId, { text: 'Please specify a city, e.g., .weather London' });
                    }
                    break;
                case userMessage === '.news':
                    await newsCommand(sock, chatId);
                    break;
                case userMessage.startsWith('.tictactoe'):
                    const mentions = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                    if (mentions.length === 1) {
                        const playerX = senderId;
                        const playerO = mentions[0];
                        tictactoeCommand(sock, chatId, playerX, playerO, isGroup);
                    } else {
                        await sock.sendMessage(chatId, { text: 'Please mention one player to start a game of Tic-Tac-Toe.' });
                    }
                    break;
                case userMessage.startsWith('.move'):
                    const position = parseInt(userMessage.split(' ')[1]);
                    if (isNaN(position)) {
                        await sock.sendMessage(chatId, { text: 'Please provide a valid position number for Tic-Tac-Toe move.' });
                    } else {
                        tictactoeMove(sock, chatId, senderId, position);
                    }
                    break;
                case userMessage === '.topmembers':
                    topMembers(sock, chatId, isGroup);
                    break;

                case userMessage.startsWith('.hangman'):
                    startHangman(sock, chatId);
                    break;

                case userMessage.startsWith('.guess'):
                    const guessedLetter = userMessage.split(' ')[1];
                    if (guessedLetter) {
                        guessLetter(sock, chatId, guessedLetter);
                    } else {
                        sock.sendMessage(chatId, { text: 'Please guess a letter using .guess <letter>' });
                    }
                    break;

                case userMessage.startsWith('.trivia'):
                    startTrivia(sock, chatId);
                    break;

                case userMessage.startsWith('.answer'):
                    const answer = userMessage.split(' ').slice(1).join(' ');
                    if (answer) {
                        answerTrivia(sock, chatId, answer);
                    } else {
                        sock.sendMessage(chatId, { text: 'Please provide an answer using .answer <answer>' });
                    }
                    break;
                case userMessage.startsWith('.compliment'):
                    const mentionedComplimentUser = message.message.extendedTextMessage?.contextInfo?.mentionedJid[0];
                    await complimentCommand(sock, chatId, mentionedComplimentUser);
                    break;

                case userMessage.startsWith('.insult'):
                    const mentionedInsultUser = message.message.extendedTextMessage?.contextInfo?.mentionedJid[0];
                    await insultCommand(sock, chatId, mentionedInsultUser);
                    break;

                case userMessage.startsWith('.8ball'):
                    const question = userMessage.split(' ').slice(1).join(' ');
                    await eightBallCommand(sock, chatId, question);
                    break;

                case userMessage.startsWith('.lyrics'):
                    const songTitle = userMessage.split(' ').slice(1).join(' ');
                    await lyricsCommand(sock, chatId, songTitle);
                    break;

                case userMessage === '.dare':
                    await dareCommand(sock, chatId);
                    break;

                case userMessage === '.truth':
                    await truthCommand(sock, chatId);
                    break;

                case userMessage === '.clear':
                    if (isGroup) await clearCommand(sock, chatId);
                    break;


                default:
                    await handleLinkDetection(sock, chatId, message, userMessage, senderId);
                    break;
            }
        });

        // Handle bot being removed from group or group participant updates
        sock.ev.on('group-participants.update', async (update) => {
            const chatId = update.id;
            const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';  // Define botNumber

            try {
                if (update.action === 'remove') {
                    const removedMembers = update.participants;

                    // Check if the bot itself was removed
                    if (removedMembers.includes(botNumber)) {
                        printLog.info(`Bot has been removed from group: ${chatId}`);
                        // Remove the group from the saved data
                        userGroupData.groups = userGroupData.groups.filter(group => group !== chatId);
                        saveUserGroupData();
                    } else {
                        if (removedMembers.length > 0) await sayGoodbye(sock, chatId, removedMembers);
                    }
                } else if (update.action === 'add') {
                    const newMembers = update.participants;
                    if (newMembers.length > 0) await welcomeNewMembers(sock, chatId, newMembers);
                }
            } catch (error) {
                printLog.error('Error handling group update:', error);
            }
        });

    } catch (err) {
        printLog.error('Error in bot initialization:', err);
        const delay = Math.min(1000 * Math.pow(2, connectionState.retryCount), 60000);
        await new Promise(resolve => setTimeout(resolve, delay));
        connectionState.retryCount++;
        startBot();
    }
}

// Start the bot
startBot();
