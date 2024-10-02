async function banCommand(sock, chatId, mentionedJidList) {
    if (mentionedJidList.length === 0) {
        await sock.sendMessage(chatId, { text: 'Please mention a user to ban.' });
        return;
    }
    
    const userToBan = mentionedJidList[0]; // Only ban the first mentioned user
    await sock.groupParticipantsUpdate(chatId, [userToBan], 'remove'); // Remove the user from the group
    await sock.sendMessage(chatId, { text: `User @${userToBan.split('@')[0]} has been banned.`, mentions: [userToBan] });
}

module.exports = banCommand;
