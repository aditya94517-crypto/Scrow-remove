const container = document.getElementById('game-container');
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
container.appendChild(canvas);

// Virtual board dimensions
const VIRTUAL_WIDTH = 600;
const VIRTUAL_HEIGHT = 800;

import { GameState } from './GameState.js';

let gameState = new GameState();
let lastTime = 0;
let selectedScrew = null;
let selectedPiece = null;
let currentScale = 1;
let isPaused = true; // start paused on home screen

// CrazyGames Mock SDK hooks
function cg_gameplayStart() {
    console.log("[CrazyGames SDK] gameplayStart");
}
function cg_gameplayStop() {
    console.log("[CrazyGames SDK] gameplayStop");
}
function cg_requestAd(type, callback) {
    console.log(`[CrazyGames SDK] Requesting ${type} ad...`);
    // Mock ad taking 2 seconds
    isPaused = true;
    setTimeout(() => {
        console.log(`[CrazyGames SDK] ${type} ad finished.`);
        isPaused = false;
        if(callback) callback();
    }, 2000);
}

// Player state
let coins = 100;
let drillsOwned = 0;
let isDrillModeActive = false;
let boardThemeColor1 = '#cda177'; // default wood
let boardThemeColor2 = '#a67b54'; // default wood dark
let screenShakeTime = 0;
let shakeAmount = 0;
let activeHint = null;

// Audio Context for synthesis
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
}

function playSound(type) {
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'click') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
        gainNode.gain.setValueAtTime(0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
    } else if (type === 'thunk') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
        gainNode.gain.setValueAtTime(1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'win') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
        gainNode.gain.setValueAtTime(0.5, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
    } else if (type === 'buy') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, now);
        osc.frequency.setValueAtTime(1500, now + 0.1);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    }
}

function triggerScreenShake(amount, duration) {
    shakeAmount = amount;
    screenShakeTime = duration;
}

function resizeCanvas() {
    // Calculate aspect ratio
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Fit canvas within container maintaining aspect ratio
    const scale = Math.min(
        containerWidth / VIRTUAL_WIDTH,
        containerHeight / VIRTUAL_HEIGHT
    );

    // Slight padding
    const finalScale = scale * 0.95;
    currentScale = finalScale;

    canvas.width = VIRTUAL_WIDTH * finalScale;
    canvas.height = VIRTUAL_HEIGHT * finalScale;

    // Scale context so we can always draw in virtual coordinates
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset
    ctx.scale(finalScale, finalScale);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    if (!isPaused) {
        update(deltaTime);
        render(ctx);
    }

    requestAnimationFrame(gameLoop);
}

// UI Handling
const homeScreen = document.getElementById('home-screen');
const gameUI = document.getElementById('game-ui');
const pauseScreen = document.getElementById('pause-screen');
const shopScreen = document.getElementById('shop-screen');
const levelCompleteUI = document.getElementById('level-complete');
const levelDisplay = document.getElementById('level-display');
const coinsDisplay = document.getElementById('coins-display');
const drillsDisplay = document.getElementById('drills-display');
const btnDrill = document.getElementById('btn-drill');

function updatePlayerUI() {
    coinsDisplay.innerText = coins;
    drillsDisplay.innerText = drillsOwned;
}
updatePlayerUI();

// Prevent right click context menu everywhere
document.addEventListener('contextmenu', event => event.preventDefault());

// Fullscreen toggle logic
document.getElementById('btn-fullscreen').addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
});

document.getElementById('btn-play').addEventListener('click', () => {
    initAudio();
    playSound('click');
    homeScreen.classList.remove('active');
    homeScreen.classList.add('hidden');
    gameUI.classList.remove('hidden');
    isPaused = false;
    updatePlayerUI();
    // Force a resize calculation now that the game-ui is visible and has dimensions
    resizeCanvas();
    cg_gameplayStart();
});

// Shop Logic
document.getElementById('btn-shop-open').addEventListener('click', () => {
    homeScreen.classList.remove('active');
    homeScreen.classList.add('hidden');
    shopScreen.classList.remove('hidden');
    shopScreen.classList.add('active');
});

document.getElementById('btn-shop-close').addEventListener('click', () => {
    shopScreen.classList.remove('active');
    shopScreen.classList.add('hidden');
    homeScreen.classList.remove('hidden');
    homeScreen.classList.add('active');
});

document.getElementById('btn-buy-drill').addEventListener('click', () => {
    if (coins >= 10) {
        coins -= 10;
        drillsOwned += 1;
        updatePlayerUI();
        playSound('buy');
        alert("Purchased a drill!");
    } else {
        alert("Not enough coins!");
    }
});

// Theme Purchases
document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        if (coins >= 20) {
            coins -= 20;
            updatePlayerUI();
            boardThemeColor1 = e.target.dataset.color1;
            boardThemeColor2 = e.target.dataset.color2;
            playSound('buy');
            alert(`Purchased ${e.target.dataset.theme} theme!`);
        } else {
            alert("Not enough coins!");
        }
    });
});

btnDrill.addEventListener('click', () => {
    if (drillsOwned > 0) {
        isDrillModeActive = !isDrillModeActive;
        if (isDrillModeActive) {
            btnDrill.classList.add('active');
        } else {
            btnDrill.classList.remove('active');
        }
    } else {
        alert("You don't own any drills! Buy one in the shop.");
    }
});

document.getElementById('btn-pause').addEventListener('click', () => {
    isPaused = true;
    pauseScreen.classList.remove('hidden');
    pauseScreen.classList.add('active');
    cg_gameplayStop();
});

document.getElementById('btn-resume').addEventListener('click', () => {
    isPaused = false;
    pauseScreen.classList.remove('active');
    pauseScreen.classList.add('hidden');
    cg_gameplayStart();
});

document.getElementById('btn-home').addEventListener('click', () => {
    isPaused = true;
    pauseScreen.classList.remove('active');
    pauseScreen.classList.add('hidden');
    gameUI.classList.add('hidden');
    levelCompleteUI.classList.add('hidden');
    homeScreen.classList.remove('hidden');
    homeScreen.classList.add('active');
    // Reset game state for when they come back
    gameState = new GameState();
    cg_gameplayStop();
});

window.onLevelComplete = function() {
    // Reward coins
    coins += 10;
    updatePlayerUI();
    playSound('win');

    if (levelCompleteUI) {
        levelCompleteUI.classList.remove('hidden');
    }
};

document.getElementById('btn-hint').addEventListener('click', () => {
    const hint = gameState.getHint();
    if (!hint) {
        alert("No hints available right now.");
        return;
    }

    const triggerHint = () => {
        activeHint = hint;
        if (typeof playSound !== 'undefined') playSound('click');
    };

    if (coins >= 20) {
        coins -= 20;
        updatePlayerUI();
        triggerHint();
    } else {
        if(confirm("Not enough coins! Watch an ad to get a hint?")) {
            cg_requestAd('rewarded', () => {
                triggerHint();
            });
        }
    }
});

document.getElementById('btn-reset').addEventListener('click', () => {
    gameState.resetLevel();
    selectedScrew = null;
    activeHint = null;
    if (levelCompleteUI) {
        levelCompleteUI.classList.add('hidden');
    }
});

document.getElementById('btn-undo').addEventListener('click', () => {
    gameState.undo();
});

window.onUndo = function() {
    if (levelCompleteUI) {
        levelCompleteUI.classList.add('hidden');
    }
};

document.getElementById('btn-next').addEventListener('click', () => {
    gameState.nextLevel();
    levelDisplay.innerText = `Level ${gameState.currentLevel}`;
    selectedScrew = null;
    if (levelCompleteUI) {
        levelCompleteUI.classList.add('hidden');
    }
});

// Input handling
function getVirtualCoordinates(event) {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if (event.touches && event.touches.length > 0) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
    } else {
        clientX = event.clientX;
        clientY = event.clientY;
    }

    const x = (clientX - rect.left) / currentScale;
    const y = (clientY - rect.top) / currentScale;

    return { x, y };
}

function handleInputDown(event) {
    if (gameState.isComplete) return;

    const { x, y } = getVirtualCoordinates(event);

    // Check if Drill mode is active
    if (isDrillModeActive) {
        // Ensure they clicked roughly within the board boundaries to drill
        if (x > 50 && x < 550 && y > 100 && y < 700) {
            gameState.board.addHole(x, y);
            drillsOwned -= 1;
            isDrillModeActive = false;
            btnDrill.classList.remove('active');
            updatePlayerUI();
            return;
        }
    }

    const clickedScrew = gameState.getScrewAtPosition(x, y);

    if (clickedScrew) {
        selectedScrew = clickedScrew;
        activeHint = null; // Clear hint on interaction
        if (typeof playSound !== 'undefined') playSound('click');
    } else if (selectedScrew) {
        // Try to place the selected screw in an empty hole
        const targetHoleIndex = gameState.board.getHoleAt(x, y);
        if (targetHoleIndex !== -1) {
            const moved = gameState.moveScrew(selectedScrew, targetHoleIndex);
            if (moved) {
                if (typeof playSound !== 'undefined') playSound('click');
                selectedScrew = null; // Deselect after moving
                activeHint = null;
            } else {
                if (typeof playSound !== 'undefined') playSound('thunk');
                if (typeof triggerScreenShake !== 'undefined') triggerScreenShake(5, 150);
                selectedScrew = null;
            }
        } else {
            if (typeof playSound !== 'undefined') playSound('thunk');
            if (typeof triggerScreenShake !== 'undefined') triggerScreenShake(5, 150);
            selectedScrew = null;
        }
    } else {
         // Check if we clicked a free piece to drag
         const clickedPiece = gameState.getPieceAtPosition(x, y);
         if (clickedPiece && clickedPiece.isFree) {
             gameState.saveState(); // Save state before dragging
             selectedPiece = clickedPiece;
             selectedPiece.isDragging = true;
             // Store initial drag coords so we can bounce back if invalid
             selectedPiece.dragStartX = selectedPiece.x;
             selectedPiece.dragStartY = selectedPiece.y;
         }
    }
}

function handleInputMove(event) {
    if (!selectedPiece) return;
    const { x, y } = getVirtualCoordinates(event);

    // Smoothly drag piece, respecting AABB center
    const box = selectedPiece.getAABB();
    selectedPiece.x = x - box.w / 2;
    selectedPiece.y = y - box.h / 2;
}

// Right click or double tap to rotate piece while dragging
let lastTapTime = 0;
canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (selectedPiece && selectedPiece.isDragging) {
        selectedPiece.rotation += Math.PI / 2;
        if (typeof playSound !== 'undefined') playSound('click');
    }
});

canvas.addEventListener('touchstart', (e) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTapTime;

    if (tapLength < 300 && tapLength > 0) {
        // Double tap
        if (selectedPiece && selectedPiece.isDragging) {
            selectedPiece.rotation += Math.PI / 2;
            if (typeof playSound !== 'undefined') playSound('click');
        }
    }
    lastTapTime = currentTime;
});

function handleInputUp(event) {
    if (selectedPiece) {
        selectedPiece.isDragging = false;

        // Check if it's dragged out of bounds to be removed
        if (selectedPiece.y > gameState.board.height || selectedPiece.x < -100 || selectedPiece.x > gameState.board.width + 100) {
            selectedPiece.isRemoved = true;
            if (typeof playSound !== 'undefined') playSound('win'); // mini success for clearing
        } else {
            // It wasn't dragged out of bounds. Check if it overlaps with an existing solid piece.
            let validDrop = true;
            for (const other of gameState.pieces) {
                if (other.id !== selectedPiece.id && !other.isRemoved && !other.isFree) {
                    if (selectedPiece.overlaps(other)) {
                        validDrop = false;
                        break;
                    }
                }
            }

            if (!validDrop) {
                // Invalid drop, bounce back!
                if (typeof playSound !== 'undefined') playSound('thunk');
                if (typeof triggerScreenShake !== 'undefined') triggerScreenShake(3, 100);
                selectedPiece.x = selectedPiece.dragStartX;
                selectedPiece.y = selectedPiece.dragStartY;
            } else {
                // valid drop on the board somewhere else
                if (typeof playSound !== 'undefined') playSound('click');
            }
        }

        selectedPiece = null;
    }
}

canvas.addEventListener('mousedown', handleInputDown);
canvas.addEventListener('mousemove', handleInputMove);
canvas.addEventListener('mouseup', handleInputUp);
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent scrolling
    handleInputDown(e);
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    handleInputMove(e);
}, { passive: false });
canvas.addEventListener('touchend', handleInputUp);


function update(deltaTime) {
    gameState.update(deltaTime);
}

function render(ctx) {
    // Clear canvas
    ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    ctx.save();

    // Apply screen shake
    if (screenShakeTime > 0) {
        const dx = (Math.random() - 0.5) * shakeAmount;
        const dy = (Math.random() - 0.5) * shakeAmount;
        ctx.translate(dx, dy);
        screenShakeTime -= 16; // rough approx of ms per frame
    }

    // 1. Draw Board (Wood)
    ctx.save();
    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 10;

    // Wood / Theme Base (Cached)
    if (!ctx.cachedBoardGradient || ctx.lastThemeColor1 !== boardThemeColor1 || ctx.lastThemeColor2 !== boardThemeColor2) {
        ctx.cachedBoardGradient = ctx.createLinearGradient(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
        ctx.cachedBoardGradient.addColorStop(0, boardThemeColor1);
        ctx.cachedBoardGradient.addColorStop(1, boardThemeColor2);
        ctx.lastThemeColor1 = boardThemeColor1;
        ctx.lastThemeColor2 = boardThemeColor2;
    }

    ctx.fillStyle = ctx.cachedBoardGradient;
    ctx.beginPath();
    ctx.roundRect(50, 100, 500, 600, 30);
    ctx.fill();
    ctx.restore();

    // Draw Holes
    for (const hole of gameState.board.holes) {
        // Inner shadow effect
        ctx.beginPath();
        ctx.arc(hole.x, hole.y, hole.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#3a2618'; // Dark inner hole
        ctx.fill();

        // Hole rim highlight
        ctx.beginPath();
        ctx.arc(hole.x, hole.y, hole.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // 2. Draw Pieces
    for (const piece of gameState.pieces) {
        if (piece.isRemoved) continue;

        ctx.save();

        // Translate for rotation and falling using AABB center
        const box = piece.getAABB();
        const centerX = box.x + box.w / 2;
        const centerY = box.y + box.h / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate(piece.rotation);

        // Shadow (moves when falling)
        const depth = piece.isFree ? 20 : 5;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = depth;

        // Metal gradient
        const pieceGradient = ctx.createLinearGradient(-piece.width/2, -piece.height/2, piece.width/2, piece.height/2);
        pieceGradient.addColorStop(0, '#d1d8e0');
        pieceGradient.addColorStop(0.5, piece.color);
        pieceGradient.addColorStop(1, '#778ca3');

        ctx.fillStyle = pieceGradient;
        ctx.beginPath();
        ctx.roundRect(-piece.width / 2, -piece.height / 2, piece.width, piece.height, 10);
        ctx.fill();

        // Bevel / Highlight
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw empty holes on the piece
        // Holes should stay relative to the piece's initial coordinates.
        // We know the hole's original board position and the piece's initial center position.
        const initialCenterX = piece.initialX + piece.width / 2;
        const initialCenterY = piece.initialY + piece.height / 2;

        for(const reqHoleIdx of piece.requiredHoles) {
            // Only draw hole if screw is not in it
            if(!gameState.isScrewInHole(reqHoleIdx)){
                 const h = gameState.board.holes[reqHoleIdx];

                 // Map board coordinate back to local piece coordinate based on initial positions
                 const localX = h.x - initialCenterX;
                 const localY = h.y - initialCenterY;

                 ctx.beginPath();
                 ctx.arc(localX, localY, 15, 0, Math.PI * 2);
                 ctx.fillStyle = 'rgba(0,0,0,0.5)';
                 ctx.fill();
            }
        }

        ctx.restore();
    }

    // 3. Draw Screws
    for (const screw of gameState.screws) {
        const isSelected = selectedScrew === screw;
        ctx.save();

        // Visual depth (selected screw lifts up)
        const scale = isSelected ? 1.2 : 1.0;
        ctx.translate(screw.x, screw.y);
        ctx.scale(scale, scale);

        // Shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetY = isSelected ? 8 : 3;

        // Screw head
        const screwGradient = ctx.createRadialGradient(0, 0, 2, 0, 0, screw.radius);
        if (isSelected) {
            screwGradient.addColorStop(0, '#f1c40f'); // Highlight gold if selected
            screwGradient.addColorStop(1, '#d35400');
        } else {
            screwGradient.addColorStop(0, '#bdc3c7'); // Normal silver
            screwGradient.addColorStop(1, '#7f8c8d');
        }

        ctx.beginPath();
        ctx.arc(0, 0, screw.radius, 0, Math.PI * 2);
        ctx.fillStyle = screwGradient;
        ctx.fill();

        // Screw slot
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-screw.radius/2, -screw.radius/2);
        ctx.lineTo(screw.radius/2, screw.radius/2);
        ctx.stroke();

        ctx.restore();
    }

    // 4. Draw Hint
    if (activeHint) {
        const hScrew = activeHint.screw;
        const tHole = gameState.board.holes[activeHint.targetHole];

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(hScrew.x, hScrew.y);
        ctx.lineTo(tHole.x, tHole.y);
        ctx.strokeStyle = 'rgba(46, 204, 113, 0.8)';
        ctx.lineWidth = 8;
        ctx.setLineDash([10, 15]);
        ctx.stroke();

        // Arrow head or target highlight
        ctx.beginPath();
        ctx.arc(tHole.x, tHole.y, tHole.radius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(46, 204, 113, 1)';
        ctx.lineWidth = 4;
        ctx.setLineDash([]);
        ctx.stroke();
        ctx.restore();
    }

    ctx.restore(); // Restore shake translation
}

requestAnimationFrame(gameLoop);
