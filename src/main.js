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

// Player state
let coins = 100;
let drillsOwned = 0;
let isDrillModeActive = false;

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

document.getElementById('btn-play').addEventListener('click', () => {
    homeScreen.classList.remove('active');
    homeScreen.classList.add('hidden');
    gameUI.classList.remove('hidden');
    isPaused = false;
    updatePlayerUI();
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
        alert("Purchased a drill!");
    } else {
        alert("Not enough coins!");
    }
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
});

document.getElementById('btn-resume').addEventListener('click', () => {
    isPaused = false;
    pauseScreen.classList.remove('active');
    pauseScreen.classList.add('hidden');
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
});

window.onLevelComplete = function() {
    // Reward coins
    coins += 10;
    updatePlayerUI();

    if (levelCompleteUI) {
        levelCompleteUI.classList.remove('hidden');
    }
};

document.getElementById('btn-reset').addEventListener('click', () => {
    gameState.resetLevel();
    selectedScrew = null;
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
    } else if (selectedScrew) {
        // Try to place the selected screw in an empty hole
        const targetHoleIndex = gameState.board.getHoleAt(x, y);
        if (targetHoleIndex !== -1) {
            const moved = gameState.moveScrew(selectedScrew, targetHoleIndex);
            if (moved) {
                selectedScrew = null; // Deselect after moving
            } else {
                // Clicked an occupied hole or invalid
                 selectedScrew = null;
            }
        } else {
            // Clicked outside any hole, deselect
            selectedScrew = null;
        }
    }
}

canvas.addEventListener('mousedown', handleInputDown);
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent scrolling
    handleInputDown(e);
}, { passive: false });


function update(deltaTime) {
    gameState.update(deltaTime);
}

function render(ctx) {
    // Clear canvas
    ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    // 1. Draw Board (Wood)
    ctx.save();
    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 10;

    // Wood Base
    const boardGradient = ctx.createLinearGradient(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    boardGradient.addColorStop(0, '#cda177');
    boardGradient.addColorStop(1, '#a67b54');

    ctx.fillStyle = boardGradient;
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

        // Translate for rotation and falling
        const centerX = piece.x + piece.width / 2;
        const centerY = piece.y + piece.height / 2;
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
}

requestAnimationFrame(gameLoop);
