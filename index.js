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
const dataFile = path.join(dataDirectory, 'userGroupData.json');

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
        console.log('Database has been created');
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

// Function to start the bot
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: P({ level: 'warn' })
    });

    sock.ev.on('creds.update', saveCreds);

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
                console.log(`Added new group: ${chatId}`);
                saveUserGroupData();
            }
        } else {
            if (!userGroupData.users.includes(chatId)) {
                userGroupData.users.push(chatId);
                console.log(`Added new user: ${chatId}`);
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
                    console.log(`Bot has been removed from group: ${chatId}`);
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
            console.error('Error handling group update:', error);
        }
    });

    // Handle connection updates
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                await startBot();
            } else {
                console.log(chalk.red('Logged out from WhatsApp. Please restart the bot and scan the QR code again.'));
            }
        } else if (connection === 'open') {
            console.log(chalk.green('Connected to WhatsApp!'));

            const botNumber = sock.user.id;
            await sock.sendMessage(botNumber, {
                text: '🎉 Congrats! The bot has been connected successfully.'
            });
        }
    });
}

// Start the bot
startBot();
