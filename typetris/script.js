document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL DOM ELEMENTS & STATE ---
    const playerInput = document.getElementById('player-input');
    const restartBtn = document.getElementById('restart-btn');
    const howToPlayToggle = document.getElementById('how-to-play-toggle');
    const howToPlayContent = document.getElementById('how-to-play-content');
    const comboDiffIndicator = document.getElementById('combo-diff-indicator');
    const dangerBarFill = document.getElementById('danger-bar-fill');
    const advantageBarFill = document.getElementById('advantage-bar-fill');
    let typingTimeout; // To manage caret blinking

    function updatePlayerDangerBar() {
        if (!dangerBarFill || !advantageBarFill) return;

        // --- Calculate Player's Danger Ratio (how close they are to capping out) ---
        const playerPotentialWords = playerGame.wordBank.length + opponentGame.combo;
        const playerPotentialRows = Math.ceil(playerPotentialWords / playerGame.GRID_COLS);
        const playerPotentialPenalty = Math.max(0, playerPotentialRows - playerGame.INITIAL_ROWS);
        const playerMaxPenalty = playerGame.MAX_ROWS - playerGame.INITIAL_ROWS;
        const playerDangerRatio = playerMaxPenalty > 0 ? playerPotentialPenalty / playerMaxPenalty : 0;

        // --- Calculate Opponent's Danger Ratio (how close player is to capping them out) ---
        const opponentPotentialWords = opponentGame.wordBank.length + playerGame.combo;
        const opponentPotentialRows = Math.ceil(opponentPotentialWords / opponentGame.GRID_COLS);
        const opponentPotentialPenalty = Math.max(0, opponentPotentialRows - opponentGame.INITIAL_ROWS);
        const opponentMaxPenalty = opponentGame.MAX_ROWS - opponentGame.INITIAL_ROWS;
        const opponentDangerRatio = opponentMaxPenalty > 0 ? opponentPotentialPenalty / opponentMaxPenalty : 0;

        // --- Determine the tug-of-war state ---
        let tugOfWarScore;

        // Prioritize "checkmate" scenarios. If one player can cap out the other,
        // the bar should be full, unless the other player can also cap them out (a draw).
        const playerWillWin = opponentDangerRatio >= 1;
        const opponentWillWin = playerDangerRatio >= 1;

        if (playerWillWin && !opponentWillWin) {
            tugOfWarScore = -1; // Full advantage for player
        } else if (opponentWillWin && !playerWillWin) {
            tugOfWarScore = 1; // Full danger for player
        } else {
            // If it's a draw (both win) or no one is in a checkmate position,
            // show the relative advantage based on the difference in danger.
            tugOfWarScore = playerDangerRatio - opponentDangerRatio;
        }

        // Clamp the score between -1 and 1 for the bar display
        const clampedScore = Math.max(-1, Math.min(1, tugOfWarScore));

        if (clampedScore > 0) {
            // Player is in danger: fill red bar up from the middle.
            dangerBarFill.style.height = `${clampedScore * 50}%`;
            advantageBarFill.style.height = '0%';
        } else {
            // Player has advantage: fill green bar down from the middle.
            advantageBarFill.style.height = `${Math.abs(clampedScore) * 50}%`;
            dangerBarFill.style.height = '0%';
        }
    }

    function updateSharedComboIndicator() {
        const diff = playerGame.combo - opponentGame.combo;

        comboDiffIndicator.classList.toggle('hidden', diff === 0);
        if (diff !== 0) {
            comboDiffIndicator.textContent = `X${Math.abs(diff)}`;
            comboDiffIndicator.classList.toggle('surplus', diff > 0);
            comboDiffIndicator.classList.toggle('deficit', diff < 0);
        }
        updatePlayerDangerBar();
    }

    const allPossibleWords = ["the", "be", "of", "and", "a", "to", "in", "he", "have", "it", "that", "for", "they", "with", "as", "not", "on", "she", "at", "by", "this", "we", "you", "do", "but", "from", "or", "which", "one", "would", "all", "will", "there", "say", "who", "make", "when", "can", "more", "if", "no", "man", "out", "other", "so", "what", "time", "up", "go", "about", "than", "into", "could", "state", "only", "new", "year", "some", "take", "come", "these", "know", "see", "use", "get", "like", "then", "first", "any", "work", "now", "may", "such", "give", "over", "think", "most", "even", "find", "day", "also", "after", "way", "many", "must", "look", "before", "great", "back", "through", "long", "where", "much", "should", "well", "people", "down", "own", "just", "because", "good", "each", "those", "feel", "seem", "how", "high", "too", "place", "little", "world", "very", "still", "nation", "hand", "old", "life", "tell", "write", "become", "here", "show", "house", "both", "between", "need", "mean", "call", "develop", "under", "last", "right", "move", "thing", "general", "school", "never", "same", "another", "begin", "while", "number", "part", "turn", "real", "leave", "might", "want", "point", "form", "off", "child", "few", "small", "since", "against", "ask", "late", "home", "interest", "large", "person", "end", "open", "public", "follow", "during", "present", "without", "again", "hold", "govern", "around", "possible", "head", "consider", "word", "program", "problem", "however", "lead", "system", "set", "order", "eye", "plan", "run", "keep", "face", "fact", "group", "play", "stand", "increase", "early", "course", "change", "help", "line"];
    class Game {
        constructor(config) {
            this.config = config;
            this.elements = {
                grid: document.getElementById(config.gridId),
                caret: document.getElementById(config.caretId),
                wpm: document.getElementById(config.wpmId),
                combo: document.getElementById(config.comboId),
                height: document.getElementById(config.heightId),
                container: document.getElementById(config.containerId),
            };

            // Game State
            this.wordBank = [];
            this.opponent = null;
            this.combo = 0;
            this.currentRowWordIndex = 0;
            this.correctPrefix = "";

            // WPM State
            this.startTime = null;
            this.totalCharsTyped = 0;
            this.wpmValue = 0;
            this.aiTimeout = null;
            this.wpmInterval = null;

            // Constants
            this.GRID_COLS = 5;
            this.MAX_ROWS = 8;
            this.INITIAL_ROWS = 4;
        }

        getRandomWord = () => allPossibleWords[Math.floor(Math.random() * allPossibleWords.length)];

        renderGrid() {
            this.elements.grid.innerHTML = '';
            const numTotalRows = Math.ceil(this.wordBank.length / this.GRID_COLS);

            if (numTotalRows > this.MAX_ROWS) {
                this.endGame();
                return;
            }

            for (let i = 0; i < numTotalRows; i++) {
                const row = document.createElement('div');
                row.classList.add('word-row');
                const rowWords = this.wordBank.slice(i * this.GRID_COLS, (i + 1) * this.GRID_COLS);
                rowWords.forEach((word, wordIndex) => {
                    const cell = document.createElement('span');
                    cell.classList.add('word-cell');
                    if (i === 0 && wordIndex === this.currentRowWordIndex) {
                        cell.classList.add('target-word');
                    }
                    cell.textContent = word;
                    row.appendChild(cell);
                });
                this.elements.grid.appendChild(row);
            }
            this.updateStatus();
        }

        updateCaretPosition() {
            const targetCell = this.elements.grid.querySelector('.target-word');
            if (!targetCell) {
                this.elements.caret.style.display = 'none';
                return;
            }
            this.elements.caret.style.display = 'block';

            const typedSpan = targetCell.querySelector('.typed-chars');
            const cellRect = targetCell.getBoundingClientRect();
            const containerRect = this.elements.container.getBoundingClientRect();
            const cellStyle = window.getComputedStyle(targetCell);
            const paddingLeft = parseFloat(cellStyle.paddingLeft);
            const leftOffset = cellRect.left - containerRect.left + paddingLeft + (typedSpan ? typedSpan.offsetWidth : 0) - 1;
            const topOffset = cellRect.top - containerRect.top + parseFloat(cellStyle.paddingTop);

            this.elements.caret.style.left = `${leftOffset}px`;
            this.elements.caret.style.top = `${topOffset}px`;
            this.elements.caret.style.height = `${parseFloat(cellStyle.fontSize)}px`;
        }

        updateStatus() {
            this.elements.combo.textContent = this.combo;
            const currentRows = Math.ceil(this.wordBank.length / this.GRID_COLS);
            this.elements.height.textContent = currentRows;
            updateSharedComboIndicator();
        }

        updateWPM() {
            if (!this.startTime) return;
            const timeElapsedMinutes = (Date.now() - this.startTime) / 60000;
            if (timeElapsedMinutes === 0) return;

            const wpm = Math.round((this.totalCharsTyped / 5) / timeElapsedMinutes);
            this.elements.wpm.textContent = wpm;
            this.wpmValue = wpm;
        }

        aiCompleteWord() {
            const MISTAKE_CHANCE = 0.05; // 5% chance per word
            const ATTACK_CHANCE = 0.1;  // 10% chance per word

            if (Math.random() < MISTAKE_CHANCE) {
                this.handleMistake();
                return; // Stop this turn's logic
            }

            if (Math.random() < ATTACK_CHANCE) {
                this.handleAttack();
                // Don't return, still complete the word
            }

            const targetWord = this.wordBank[this.currentRowWordIndex];
            if (!targetWord) return;

            // --- Simulate successful word completion ---
            this.totalCharsTyped += targetWord.length + 1;
            this.combo++;
            this.updateStatus();

            // Update visuals
            const allCells = this.elements.grid.querySelectorAll('.word-cell');
            const oldTargetCell = allCells[this.currentRowWordIndex];
            if (oldTargetCell) {
                oldTargetCell.classList.remove('target-word');
                oldTargetCell.innerHTML = `<span class="typed-chars">${targetWord}</span>`;
            }

            this.currentRowWordIndex++;

            if (this.currentRowWordIndex >= this.GRID_COLS) {
                this.handleRowCompletion();
            } else {
                const nextTargetCell = allCells[this.currentRowWordIndex];
                if (nextTargetCell) {
                    nextTargetCell.classList.add('target-word');
                }
                this.updateCaretPosition();
            }
        }

        startAI() {
            if (this.config.isPlayer) return;

            const scheduleNextWord = () => {
                const targetWord = this.wordBank[this.currentRowWordIndex];
                if (!targetWord) { this.stopTimers(); return; }

                const playerWPM = this.opponent.wpmValue || 20;
                const aiWPM = playerWPM + 10;
                const timePerCharMs = 60000 / (aiWPM * 5);
                const delay = timePerCharMs * targetWord.length;

                this.aiTimeout = setTimeout(() => {
                    this.aiCompleteWord();
                    scheduleNextWord();
                }, delay);
            };

            this.startTime = Date.now();
            this.wpmInterval = setInterval(() => this.updateWPM(), 1000);
            scheduleNextWord();
        }

        stopTimers() {
            clearTimeout(this.aiTimeout);
            clearInterval(this.wpmInterval);
            this.elements.caret.style.display = 'none';
        }

        addPenaltyLines(count) {
            if (count === 0) return;
            const newWords = [];
            for (let i = 0; i < count; i++) {
                newWords.push(this.getRandomWord());
            }
            // Add new words to the end of the grid so the player isn't interrupted.
            this.wordBank.push(...newWords);

            // --- Performance Improvement: Additively render new rows ---
            // Instead of a full re-render which causes a hitch, we just append the new rows.
            const fragment = document.createDocumentFragment();
            const newRows = [];
            for (let i = 0; i < count; i += this.GRID_COLS) {
                const row = document.createElement('div');
                row.classList.add('word-row');
                const rowWords = this.wordBank.slice(this.wordBank.length - count + i, this.wordBank.length - count + i + this.GRID_COLS);
                rowWords.forEach(word => {
                    const cell = document.createElement('span');
                    cell.classList.add('word-cell');
                    cell.textContent = word;
                    row.appendChild(cell);
                });
                fragment.appendChild(row);
                newRows.push(row);
            }
            this.elements.grid.appendChild(fragment);

            // Check for game over *after* updating the grid height display
            this.updateStatus();
            if (Math.ceil(this.wordBank.length / this.GRID_COLS) > this.MAX_ROWS) {
                this.endGame();
            }
        }

        handleAttack() {
            const attackPower = this.combo;
            if (attackPower === 0) {
                this.combo = 0;
                this.updateStatus();
                return;
            }

            const initialWordCount = this.INITIAL_ROWS * this.GRID_COLS;
            const penaltyWords = Math.max(0, this.wordBank.length - initialWordCount);

            const wordsToClearFromSelf = Math.min(attackPower, penaltyWords);
            const netAttackToOpponent = attackPower - wordsToClearFromSelf;

            if (wordsToClearFromSelf > 0) {
                // Remove penalty words from the end of the player's own word bank.
                this.wordBank.splice(this.wordBank.length - wordsToClearFromSelf, wordsToClearFromSelf);
                // A full re-render is needed since we are removing words.
                this.renderGrid();
                this.updateCaretPosition();
            }

            if (netAttackToOpponent > 0 && this.opponent) {
                this.opponent.addPenaltyLines(netAttackToOpponent);
            }

            this.combo = 0;
            this.updateStatus();
        }

        handleRowCompletion() {
            const startingPositions = new Map();
            const oldRows = Array.from(this.elements.grid.children);
            oldRows.forEach((row, index) => {
                startingPositions.set(index, row.getBoundingClientRect());
            });
            const firstRowClone = oldRows[0] ? oldRows[0].cloneNode(true) : null;

            const initialWordCount = this.INITIAL_ROWS * this.GRID_COLS;
            const isClearingPenalty = this.wordBank.length > initialWordCount;

            // Always remove the completed row
            this.wordBank.splice(0, this.GRID_COLS);

            if (!isClearingPenalty) {
                // Only add a new row if not clearing penalty lines
                for (let i = 0; i < this.GRID_COLS; i++) {
                    this.wordBank.push(this.getRandomWord());
                }
            }
            this.currentRowWordIndex = 0;

            if (this.config.isPlayer) {
                this.correctPrefix = "";
                playerInput.value = "";
            }

            this.renderGrid();
            this.updateCaretPosition();

            if (this.config.isPlayer) {
                playerInput.focus();
            }

            if (firstRowClone) {
                const firstRowStartPos = startingPositions.get(0);
                const containerRect = this.elements.container.getBoundingClientRect();
                Object.assign(firstRowClone.style, {
                    position: 'absolute',
                    left: `${firstRowStartPos.left - containerRect.left}px`,
                    top: `${firstRowStartPos.top - containerRect.top}px`,
                    width: `${firstRowStartPos.width}px`,
                    margin: '0',
                    opacity: '1',
                    transition: 'transform 0.3s ease-out, opacity 0.3s ease-out'
                });
                this.elements.grid.parentNode.insertBefore(firstRowClone, this.elements.grid);
                requestAnimationFrame(() => {
                    firstRowClone.style.transform = 'translateY(-100%)';
                    firstRowClone.style.opacity = '0';
                });
                setTimeout(() => firstRowClone.remove(), 300);
            }

            const newRows = Array.from(this.elements.grid.children);
            newRows.forEach((row, index) => {
                // Only animate the row that is moving into the top position to reduce distraction.
                if (index === 0) {
                    const startPos = startingPositions.get(index + 1); // New row `i` corresponds to old row `i+1`
                    if (!startPos) return;
                    const newPos = row.getBoundingClientRect();
                    const deltaY = startPos.top - newPos.top;
                    if (Math.abs(deltaY) < 1) return; // Don't animate if it didn't move.

                    row.style.transition = 'transform 0s';
                    row.style.transform = `translateY(${deltaY}px)`;
                    requestAnimationFrame(() => {
                        row.style.transition = 'transform 0.3s ease-out';
                        row.style.transform = ''; // Animate to default (new) position.
                    });
                    row.addEventListener('transitionend', () => { row.style.transition = ''; }, { once: true });
                }
            });
        }

        resetCurrentWordInput() {
            if (playerInput.disabled) return; // Game is over, do nothing.

            if (this.config.isPlayer) {
                playerInput.value = this.correctPrefix;
            }
            const targetCell = this.elements.grid.querySelector('.target-word');
            if (targetCell) {
                const targetWord = this.wordBank[this.currentRowWordIndex];
                targetCell.innerHTML = targetWord; // Reset highlighting
            }
            this.updateCaretPosition();
        }

        handleMistake() {
            this.handleAttack(); // A mistake sends the current combo and resets it.
            this.updateStatus();
            this.resetCurrentWordInput();
        }

        endGame() {
            // Stop all timers for both games to prevent background activity.
            playerGame.stopTimers();
            opponentGame.stopTimers();

            // Disable player input regardless of who lost.
            playerInput.disabled = true;

            if (this.config.isPlayer) {
                // Player lost
                playerInput.value = "GAME OVER - CAPPED OUT!";
            } else {
                // Opponent lost, so player wins
                playerInput.value = "YOU WIN!";
            }
            // Show the retry button.
            restartBtn.classList.remove('hidden');
        }

        startGame() {
            this.wordBank = Array.from({ length: this.INITIAL_ROWS * this.GRID_COLS }, this.getRandomWord);
            this.currentRowWordIndex = 0;
            this.combo = 0;

            // Reset WPM state
            this.startTime = null;
            this.totalCharsTyped = 0;
            this.wpmValue = 0;
            clearInterval(this.wpmInterval);
            clearTimeout(this.aiTimeout);
            this.elements.wpm.textContent = 0;

            if (this.config.isPlayer) {
                this.correctPrefix = "";
                playerInput.disabled = false;
                playerInput.value = '';
                restartBtn.classList.add('hidden');
                playerInput.focus();
            } else {
                // Start the AI loop for the opponent
                this.startAI();
            }
            this.renderGrid();
            this.updateCaretPosition();
        }
    }

    // --- GAME INSTANCES ---
    const playerGame = new Game({
        containerId: 'player-game',
        gridId: 'player-word-grid',
        caretId: 'player-caret',
        wpmId: 'player-wpm',
        comboId: 'player-combo',
        heightId: 'player-grid-height',
        isPlayer: true
    });

    const opponentGame = new Game({
        containerId: 'opponent-game',
        gridId: 'opponent-word-grid',
        caretId: 'opponent-caret',
        wpmId: 'opponent-wpm',
        comboId: 'opponent-combo',
        heightId: 'opponent-grid-height',
        isPlayer: false
    });

    // Link the two game instances
    playerGame.opponent = opponentGame;
    opponentGame.opponent = playerGame;

    // --- EVENT LISTENERS ---
    howToPlayToggle.addEventListener('click', () => {
        howToPlayContent.classList.toggle('hidden');
    });

    playerInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent form submission
            playerGame.handleAttack();
            playerGame.resetCurrentWordInput();
        }
    });

    playerInput.addEventListener('input', () => {
        clearTimeout(typingTimeout);
        playerGame.elements.caret.classList.add('typing');
        typingTimeout = setTimeout(() => { playerGame.elements.caret.classList.remove('typing'); }, 500);

        // Start WPM timer on first input of the game
        if (playerGame.startTime === null) {
            playerGame.startTime = Date.now();
            playerGame.wpmInterval = setInterval(() => playerGame.updateWPM(), 1000);
        }

        const typedValue = playerInput.value;
        const targetWord = playerGame.wordBank[playerGame.currentRowWordIndex];
        if (!targetWord) return;

        if (!typedValue.startsWith(playerGame.correctPrefix)) {
            playerGame.handleMistake();
            return;
        }

        const activeTyping = typedValue.substring(playerGame.correctPrefix.length);

        if (activeTyping === targetWord + ' ') {
            playerGame.correctPrefix = typedValue;
            playerGame.totalCharsTyped += targetWord.length + 1; // +1 for the space
            playerGame.combo++;
            playerGame.updateStatus();

            const allCells = playerGame.elements.grid.querySelectorAll('.word-cell');
            const oldTargetCell = allCells[playerGame.currentRowWordIndex];
            if (oldTargetCell) {
                oldTargetCell.classList.remove('target-word');
                oldTargetCell.innerHTML = `<span class="typed-chars">${targetWord}</span>`;
            }

            playerGame.currentRowWordIndex++;

            if (playerGame.currentRowWordIndex >= playerGame.GRID_COLS) {
                playerGame.handleRowCompletion();
            } else {
                const nextTargetCell = allCells[playerGame.currentRowWordIndex];
                if (nextTargetCell) {
                    nextTargetCell.classList.add('target-word');
                }
                playerGame.updateCaretPosition();
            }
            return;
        }

        if (!targetWord.startsWith(activeTyping)) {
            playerGame.handleMistake();
            // handleMistake now resets the input for us
        } else {
            const targetCell = playerGame.elements.grid.querySelector('.target-word');
            if (targetCell) {
                targetCell.innerHTML = `<span class="typed-chars">${activeTyping}</span>${targetWord.substring(activeTyping.length)}`;
            }
            playerGame.updateCaretPosition();
        }
    });

    restartBtn.addEventListener('click', () => {
        location.reload();
    });

    // --- INITIALIZE GAMES ---
    playerGame.startGame();
    opponentGame.startGame();
});