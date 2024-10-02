const { setAntilinkSetting, getAntilinkSetting } = require('../helpers/antilinkHelper');

async function handleAntilinkCommand(sock, chatId, userMessage, senderId, isSenderAdmin) {
    if (!isSenderAdmin) {
        await sock.sendMessage(chatId, { text: 'Only admins can use the .antilink command.' });
        return;
    }

    if (userMessage === '.antilink') {
        const helpMessage = `
*Antilink Commands:*
1. *.antilink off* - Disable antilink protection.
2. *.antilink whatsapp* - Block WhatsApp group links.
3. *.antilink whatsappchannel* - Block WhatsApp channel links.
4. *.antilink telegram* - Block Telegram links.
5. *.antilink all* - Block all types of links.
        `;
        await sock.sendMessage(chatId, { text: helpMessage });
        return;
    }

    if (userMessage === '.antilink off') {
        setAntilinkSetting(chatId, 'off');
        await sock.sendMessage(chatId, { text: 'Antilink protection is now turned off.' });
    } else if (userMessage === '.antilink whatsapp') {
        setAntilinkSetting(chatId, 'whatsappGroup');
        await sock.sendMessage(chatId, { text: 'WhatsApp group links are now blocked.' });
    } else if (userMessage === '.antilink whatsappchannel') {
        setAntilinkSetting(chatId, 'whatsappChannel');
        await sock.sendMessage(chatId, { text: 'WhatsApp channel links are now blocked.' });
    } else if (userMessage === '.antilink telegram') {
        setAntilinkSetting(chatId, 'telegram');
        await sock.sendMessage(chatId, { text: 'Telegram links are now blocked.' });
    } else if (userMessage === '.antilink all') {
        setAntilinkSetting(chatId, 'allLinks');
        await sock.sendMessage(chatId, { text: 'All types of links are now blocked.' });
    }
}

async function handleLinkDetection(sock, chatId, message, userMessage, senderId) {
    const antilinkSetting = getAntilinkSetting(chatId);
    if (antilinkSetting === 'off') return;

    console.log(`Antilink Setting for ${chatId}: ${antilinkSetting}`);
    console.log(`Checking message for links: ${userMessage}`);
    
    // Log the full message object to diagnose message structure
    console.log("Full message object: ", JSON.stringify(message, null, 2));

    let shouldDelete = false;

    const linkPatterns = {
        whatsappGroup: /chat\.whatsapp\.com\/[A-Za-z0-9]{20,}/,
        whatsappChannel: /wa\.me\/channel\/[A-Za-z0-9]{20,}/,
        telegram: /t\.me\/[A-Za-z0-9_]+/,
        allLinks: /https?:\/\/[^\s]+/,
    };

    // Detect WhatsApp Group links
    if (antilinkSetting === 'whatsappGroup') {
        console.log('WhatsApp group link protection is enabled.');
        if (linkPatterns.whatsappGroup.test(userMessage)) {
            console.log('Detected a WhatsApp group link!');
            shouldDelete = true;
        }
    } else if (antilinkSetting === 'whatsappChannel' && linkPatterns.whatsappChannel.test(userMessage)) {
        shouldDelete = true;
    } else if (antilinkSetting === 'telegram' && linkPatterns.telegram.test(userMessage)) {
        shouldDelete = true;
    } else if (antilinkSetting === 'allLinks' && linkPatterns.allLinks.test(userMessage)) {
        shouldDelete = true;
    }

    if (shouldDelete) {
        const quotedMessageId = message.key.id; // Get the message ID to delete
        const quotedParticipant = message.key.participant || senderId; // Get the participant ID

        console.log(`Attempting to delete message with id: ${quotedMessageId} from participant: ${quotedParticipant}`);

        try {
            await sock.sendMessage(chatId, {
                delete: { remoteJid: chatId, fromMe: false, id: quotedMessageId, participant: quotedParticipant },
            });
            console.log(`Message with ID ${quotedMessageId} deleted successfully.`);
        } catch (error) {
            console.error('Failed to delete message:', error);
        }

        const mentionedJidList = [senderId];
        await sock.sendMessage(chatId, { text: `Warning! @${senderId.split('@')[0]}, posting links is not allowed.`, mentions: mentionedJidList });
    } else {
        console.log('No link detected or protection not enabled for this type of link.');
    }
}

module.exports = {
    handleAntilinkCommand,
    handleLinkDetection,
};
