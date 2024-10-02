async function demoteCommand(sock, chatId, mentionedJidList) {
    if (mentionedJidList.length === 0) {
        await sock.sendMessage(chatId, { text: 'Please mention a user to demote.' });
        return;
    }

    const userToDemote = mentionedJidList[0];
    await sock.groupParticipantsUpdate(chatId, [userToDemote], 'demote'); // Demote the user from admin
    await sock.sendMessage(chatId, { text: `User @${userToDemote.split('@')[0]} has been demoted from admin.`, mentions: [userToDemote] });
}

module.exports = demoteCommand;
