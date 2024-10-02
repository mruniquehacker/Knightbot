const isAdmin = require('../helpers/isAdmin');

async function kickCommand(sock, chatId, senderId, mentionedJidList, replyMessage) {
    const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

    if (!isBotAdmin) {
        await sock.sendMessage(chatId, { text: 'Please make the bot an admin first.' });
        return;
    }

    if (!isSenderAdmin) {
        await sock.sendMessage(chatId, { text: 'Only group admins can use the kick command.' });
        return;
    }

    // If the command was a reply to a user
    if (replyMessage && replyMessage.participant) {
        const userToKick = replyMessage.participant;
        await sock.groupParticipantsUpdate(chatId, [userToKick], 'remove');
        await sock.sendMessage(chatId, { text: 'User has been kicked from the group.' });
        return;
    }

    // If the command mentioned users
    if (mentionedJidList.length > 0) {
        console.log(`Mentioned users to kick: ${mentionedJidList}`);  // Debugging log
        await sock.groupParticipantsUpdate(chatId, mentionedJidList, 'remove');
        await sock.sendMessage(chatId, { text: 'User(s) have been kicked from the group.' });
    } else {
        await sock.sendMessage(chatId, { text: 'Please reply to a user or tag a user to kick.' });
    }
}

module.exports = kickCommand;
