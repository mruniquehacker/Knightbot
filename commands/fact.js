const axios = require('axios');

module.exports = async function (sock, chatId) {
    try {
        const response = await axios.get('https://uselessfacts.jsph.pl/random.json?language=en');
        const fact = response.data.text;
        await sock.sendMessage(chatId, { text: fact });
    } catch (error) {
        console.error('Error fetching fact:', error);
        await sock.sendMessage(chatId, { text: 'Sorry, I could not fetch a fact right now.' });
    }
};
