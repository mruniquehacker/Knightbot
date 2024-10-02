const insults = [
    "You're like a cloud. When you disappear, it's a beautiful day!",
    "You bring everyone so much joy when you leave the room!",
    "I'd agree with you, but then we’d both be wrong.",
    "You’re not stupid; you just have bad luck thinking.",
    "Your secrets are always safe with me. I never even listen to them."
];

async function insultCommand(sock, chatId, mentionedUser) {
    if (!mentionedUser) {
        await sock.sendMessage(chatId, { text: 'Please mention a user to insult.' });
        return;
    }

    const randomInsult = insults[Math.floor(Math.random() * insults.length)];
    await sock.sendMessage(chatId, { text: `@${mentionedUser} ${randomInsult}`, mentions: [mentionedUser] });
}

module.exports = { insultCommand };
