const fs = require('fs');
const path = require('path');
const isAdmin = require('../helpers/isAdmin');

const warningsFilePath = path.join(__dirname, '../data/warnings.json');

function loadWarnings() {
    if (!fs.existsSync(warningsFilePath)) {
        fs.writeFileSync(warningsFilePath, JSON.stringify({}), 'utf8');
    }
    const data = fs.readFileSync(warningsFilePath, 'utf8');
    return JSON.parse(data);
}

function saveWarnings(warnings) {
    fs.writeFileSync(warningsFilePath, JSON.stringify(warnings, null, 2), 'utf8');
}

async function warnCommand(sock, chatId, senderId, mentionedJidList) {
    const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

    if (!isBotAdmin) {
        await sock.sendMessage(chatId, { text: 'Please make the bot an admin first.' });
        return;
    }

    if (!isSenderAdmin) {
        await sock.sendMessage(chatId, { text: 'Only group admins can use the warn command.' });
        return;
    }

    if (mentionedJidList.length === 0) {
        await sock.sendMessage(chatId, { text: 'Please mention a user to warn.' });
        return;
    }

    const warnings = loadWarnings();
    const userToWarn = mentionedJidList[0];

    if (!warnings[userToWarn]) {
        warnings[userToWarn] = 1;
    } else {
        warnings[userToWarn]++;
    }

    saveWarnings(warnings);

    if (warnings[userToWarn] >= 3) {
        // Kick the user from the group after 3 warnings
        try {
            await sock.groupParticipantsUpdate(chatId, [userToWarn], 'remove');
            delete warnings[userToWarn];  // Reset the warning count after kicking
            saveWarnings(warnings);  // Save the updated warnings
            await sock.sendMessage(chatId, { text: `User has been kicked from the group after 3 warnings.` });
        } catch (error) {
            console.error('Error kicking user from the group:', error);
            await sock.sendMessage(chatId, { text: 'Failed to kick the user. Make sure the bot has admin privileges.' });
        }
    } else {
        await sock.sendMessage(chatId, { text: `User has been warned. Total warnings: ${warnings[userToWarn]}` });
    }
}
//hi
module.exports = warnCommand;
