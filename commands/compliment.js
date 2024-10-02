const compliments = [
    "You’re amazing just the way you are!",
    "You have a great sense of humor!",
    "You’re incredibly thoughtful and kind.",
    "You are more powerful than you know.",
    "You light up the room!",
    "You’re a true friend.",
    "You inspire me!"
];

async function complimentCommand(sock, chatId, mentionedUser) {
    if (!mentionedUser) {
        await sock.sendMessage(chatId, { text: 'Please mention a user to compliment.' });
        return;
    }

    const randomCompliment = compliments[Math.floor(Math.random() * compliments.length)];
    await sock.sendMessage(chatId, { text: `@${mentionedUser} ${randomCompliment}`, mentions: [mentionedUser] });
}

module.exports = { complimentCommand };
