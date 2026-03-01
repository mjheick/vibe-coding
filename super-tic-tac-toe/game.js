class SuperTicTacToe {
    constructor() {
        this.currentPlayer = 'X';
        this.miniBoards = Array(9).fill(null).map(() => Array(9).fill(''));
        this.miniWinners = Array(9).fill(null);
        this.gameOver = false;
        this.init();
    }

    init() {
        const superBoard = document.getElementById('super-board');
        superBoard.innerHTML = '';
        
        for (let i = 0; i < 9; i++) {
            const miniBoard = document.createElement('div');
            miniBoard.className = 'mini-board';
            miniBoard.dataset.board = i;
            
            for (let j = 0; j < 9; j++) {
                const cell = document.createElement('button');
                cell.className = 'cell';
                cell.dataset.board = i;
                cell.dataset.cell = j;
                cell.addEventListener('click', () => this.handleClick(i, j));
                miniBoard.appendChild(cell);
            }
            
            superBoard.appendChild(miniBoard);
        }
        
        document.getElementById('reset').addEventListener('click', () => this.reset());
        this.updateStatus();
    }

    handleClick(boardIndex, cellIndex) {
        if (this.gameOver || this.miniBoards[boardIndex][cellIndex] || this.miniWinners[boardIndex]) {
            return;
        }

        this.miniBoards[boardIndex][cellIndex] = this.currentPlayer;
        this.updateCell(boardIndex, cellIndex);
        
        const winner = this.checkMiniBoard(boardIndex);
        if (winner) {
            this.miniWinners[boardIndex] = winner;
            this.markBoardWon(boardIndex, winner);
        }
        
        const superWinner = this.checkSuperBoard();
        if (superWinner) {
            this.gameOver = true;
            this.updateStatus(`Player ${superWinner} wins the game!`);
            return;
        }
        
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        this.updateStatus();
    }

    checkMiniBoard(boardIndex) {
        const board = this.miniBoards[boardIndex];
        const lines = [
            [0,1,2], [3,4,5], [6,7,8],
            [0,3,6], [1,4,7], [2,5,8],
            [0,4,8], [2,4,6]
        ];
        
        for (const [a, b, c] of lines) {
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return board[a];
            }
        }
        
        if (board.every(cell => cell !== '')) {
            const xCount = board.filter(c => c === 'X').length;
            const oCount = board.filter(c => c === 'O').length;
            return xCount > oCount ? 'X' : oCount > xCount ? 'O' : 'T';
        }
        
        return null;
    }

    checkSuperBoard() {
        const lines = [
            [0,1,2], [3,4,5], [6,7,8],
            [0,3,6], [1,4,7], [2,5,8],
            [0,4,8], [2,4,6]
        ];
        
        for (const [a, b, c] of lines) {
            if (this.miniWinners[a] && 
                this.miniWinners[a] !== 'T' &&
                this.miniWinners[a] === this.miniWinners[b] && 
                this.miniWinners[a] === this.miniWinners[c]) {
                return this.miniWinners[a];
            }
        }
        
        if (this.miniWinners.every(w => w !== null)) {
            const xCount = this.miniWinners.filter(w => w === 'X').length;
            const oCount = this.miniWinners.filter(w => w === 'O').length;
            return xCount > oCount ? 'X' : oCount > xCount ? 'O' : 'T';
        }
        
        return null;
    }

    updateCell(boardIndex, cellIndex) {
        const cell = document.querySelector(`[data-board="${boardIndex}"][data-cell="${cellIndex}"]`);
        cell.textContent = this.currentPlayer;
        cell.disabled = true;
    }

    markBoardWon(boardIndex, winner) {
        const miniBoard = document.querySelector(`.mini-board[data-board="${boardIndex}"]`);
        miniBoard.classList.add('won');
        miniBoard.dataset.winner = winner === 'T' ? 'TIE' : winner;
    }

    updateStatus(message) {
        const status = document.getElementById('status');
        status.textContent = message || `Player ${this.currentPlayer}'s turn`;
    }

    reset() {
        this.currentPlayer = 'X';
        this.miniBoards = Array(9).fill(null).map(() => Array(9).fill(''));
        this.miniWinners = Array(9).fill(null);
        this.gameOver = false;
        this.init();
    }
}

new SuperTicTacToe();
