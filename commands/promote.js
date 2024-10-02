async function promoteCommand(sock, chatId, mentionedJidList) {
    if (mentionedJidList.length === 0) {
        await sock.sendMessage(chatId, { text: 'Please mention a user to promote.' });
        return;
    }

    const userToPromote = mentionedJidList[0];
    await sock.groupParticipantsUpdate(chatId, [userToPromote], 'promote'); // Promote the user to admin
    await sock.sendMessage(chatId, { text: `User @${userToPromote.split('@')[0]} has been promoted to admin.`, mentions: [userToPromote] });
}

module.exports = promoteCommand;
