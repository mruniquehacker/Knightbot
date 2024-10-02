const axios = require('axios');

module.exports = async function (sock, chatId) {
    try {
        const response = await axios.get('https://type.fit/api/quotes');
        const quotes = response.data;
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        await sock.sendMessage(chatId, { text: `${randomQuote.text} - ${randomQuote.author || 'Unknown'}` });
    } catch (error) {
        console.error('Error fetching quote:', error);
        await sock.sendMessage(chatId, { text: 'Sorry, I could not fetch a quote right now.' });
    }
};
