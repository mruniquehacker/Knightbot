const games = {};

function printBoard(board) {
    return `
${board[0]} | ${board[1]} | ${board[2]}
---------
${board[3]} | ${board[4]} | ${board[5]}
---------
${board[6]} | ${board[7]} | ${board[8]}
`;
}

function checkWinner(board, player) {
    const winningCombos = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], 
        [0, 3, 6], [1, 4, 7], [2, 5, 8], 
        [0, 4, 8], [2, 4, 6]
    ];

    return winningCombos.some(combo => combo.every(index => board[index] === player));
}

function checkDraw(board) {
    return board.every(cell => cell !== ' ');
}

function startGame(sock, chatId, playerX, playerO) {
    const board = [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '];
    games[chatId] = { board, playerX, playerO, turn: playerX };

    sock.sendMessage(chatId, { text: `Tic-Tac-Toe started! @${playerX} is ❌ and @${playerO} is ⚪️. @${playerX}, it's your turn!\n${printBoard(board)}`, mentions: [playerX, playerO] });
}

function makeMove(sock, chatId, player, position) {
    const game = games[chatId];
    const { board, turn, playerX, playerO } = game;

    if (turn !== player) {
        sock.sendMessage(chatId, { text: `It's not your turn.` });
        return;
    }

    if (board[position] !== ' ') {
        sock.sendMessage(chatId, { text: `That position is already taken. Try another.` });
        return;
    }

    board[position] = (player === playerX) ? '❌' : '⚪️';
    
    if (checkWinner(board, board[position])) {
        sock.sendMessage(chatId, { text: `@${player} wins!\n${printBoard(board)}`, mentions: [player] });
        delete games[chatId];
        return;
    }

    if (checkDraw(board)) {
        sock.sendMessage(chatId, { text: `It's a draw!\n${printBoard(board)}` });
        delete games[chatId];
        return;
    }

    game.turn = (turn === playerX) ? playerO : playerX;
    sock.sendMessage(chatId, { text: `@${game.turn}, it's your turn!\n${printBoard(board)}`, mentions: [game.turn] });
}

function tictactoeCommand(sock, chatId, playerX, playerO, isGroup) {
    if (!isGroup) {
        sock.sendMessage(chatId, { text: 'This command is only available in group chats.' });
        return;
    }

    if (!games[chatId]) {
        startGame(sock, chatId, playerX, playerO);
    } else {
        sock.sendMessage(chatId, { text: `A game is already in progress.` });
    }
}

function tictactoeMove(sock, chatId, player, position) {
    if (!games[chatId]) {
        sock.sendMessage(chatId, { text: `No game is currently in progress.` });
        return;
    }

    if (isNaN(position) || position < 0 || position > 8) {
        sock.sendMessage(chatId, { text: `Invalid position. Choose a number between 0 and 8.` });
        return;
    }

    makeMove(sock, chatId, player, position);
}

module.exports = { tictactoeCommand, tictactoeMove };
