const settings = require('../settings');

async function isAdmin(sock, chatId, senderId) {
    const groupMetadata = await sock.groupMetadata(chatId);
    const participants = groupMetadata.participants;

    // Check if the sender is an admin
    const sender = participants.find(p => p.id === senderId);
    const bot = participants.find(p => p.id === sock.user.id); // Check if the bot is an admin

    const isSenderAdmin = sender && (sender.admin === 'admin' || sender.admin === 'superadmin');
    const isBotAdmin = bot && (bot.admin === 'admin' || bot.admin === 'superadmin');

    return { isSenderAdmin, isBotAdmin };
}

async function tagAllCommand(sock, chatId, senderId) {
    const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

    if (isSenderAdmin || isBotAdmin) {
        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants;

        if (!participants || participants.length === 0) {
            await sock.sendMessage(chatId, { text: 'No participants found in the group.' });
            return;
        }

        let mentionText = 'Hey everyone! ';
        let mentions = [];

        participants.forEach(participant => {
            mentionText += `@${participant.id.split('@')[0]} `;
            mentions.push(participant.id);
        });

        await sock.sendMessage(chatId, {
            text: mentionText,
            mentions: mentions
        });
    } else {
        await sock.sendMessage(chatId, {
            text: 'Only admins or the bot (if it is an admin) can use the .tagall command.'
        });
    }
}

module.exports = tagAllCommand;
