const fs = require('fs');
const path = require('path');

async function welcomeNewMembers(sock, chatId, newMembers) {
    let welcomeText = 'Welcome ';
    newMembers.forEach((member) => {
        welcomeText += `@${member.split('@')[0]} `;
    });
    welcomeText += 'to the group! 🎉';

    // Send the welcome message
    await sock.sendMessage(chatId, {
        text: welcomeText,
        mentions: newMembers
    });

    // Path to the sticker file
    const stickerPath = path.join(__dirname, '../assets/stickintro.webp');

    // Check if the sticker file exists
    if (fs.existsSync(stickerPath)) {
        const stickerBuffer = fs.readFileSync(stickerPath);

        // Send the sticker
        await sock.sendMessage(chatId, { 
            sticker: stickerBuffer 
        });
    } else {
        console.error('Sticker not found at:', stickerPath);
    }
}

module.exports = welcomeNewMembers;
