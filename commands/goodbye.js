async function sayGoodbye(sock, chatId, removedMembers) {
    let goodbyeText = 'Goodbye ';
    removedMembers.forEach((member) => {
        goodbyeText += `@${member.split('@')[0]} `;
    });
    goodbyeText += '👋 We will never miss you!';

    await sock.sendMessage(chatId, {
        text: goodbyeText,
        mentions: removedMembers
    });
}

module.exports = sayGoodbye;
