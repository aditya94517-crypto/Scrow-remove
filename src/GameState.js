import { Board } from './Board.js';
import { Piece } from './Piece.js';
import { Screw } from './Screw.js';
import { Generator } from './Generator.js';

export class GameState {
    constructor() {
        this.currentLevel = 1;
        this.loadLevel(this.currentLevel);
    }

    resetLevel() {
        this.loadLevel(this.currentLevel);
    }

    nextLevel() {
        this.currentLevel++;
        this.loadLevel(this.currentLevel);
    }

    loadLevel(levelNumber) {
        this.board = new Board(600, 800);
        this.pieces = [];
        this.screws = [];
        this.isComplete = false;
        this.history = []; // store state for undo

        this.objective = 'CLEAR_ALL'; // Default objective
        this.notifiedComplete = false;

        if (levelNumber <= 4) {
            if (levelNumber === 1) this.initLevel1();
            else if (levelNumber === 2) this.initLevel2();
            else if (levelNumber === 3) this.initLevel3();
            else if (levelNumber === 4) this.initLevel4();
        } else {
            // Level 5+ uses procedural generation!
            this.initProceduralLevel(levelNumber);
        }
    }

    initProceduralLevel(levelNumber) {
        this.objective = 'CLEAR_ALL';
        // Generate a level with difficulty scaling with level number
        const genResult = Generator.generateLevel(this.board, levelNumber);
        this.pieces = genResult.pieces;
        this.screws = genResult.screws;

        this.updateVisualPositions();
        this.checkPiecesFree();
    }

    saveState() {
        // Deep copy essential state
        const state = {
            pieces: this.pieces.map(p => ({
                id: p.id,
                x: p.x,
                y: p.y,
                isFree: p.isFree,
                isRemoved: p.isRemoved
            })),
            screws: this.screws.map(s => ({
                id: s.id,
                holeIndex: s.holeIndex
            }))
        };
        this.history.push(state);
    }

    undo() {
        if (this.history.length === 0) return;

        const lastState = this.history.pop();

        // Restore pieces
        for (const pState of lastState.pieces) {
            const piece = this.pieces.find(p => p.id === pState.id);
            if (piece) {
                piece.x = pState.x;
                piece.y = pState.y;
                piece.isFree = pState.isFree;
                piece.isRemoved = pState.isRemoved;
                piece.vy = 0;
                piece.vRotation = 0;
            }
        }

        // Restore screws
        for (const sState of lastState.screws) {
            const screw = this.screws.find(s => s.id === sState.id);
            if (screw) {
                screw.holeIndex = sState.holeIndex;
            }
        }

        this.updateVisualPositions();
        this.isComplete = false;
        if (typeof window !== 'undefined' && window.onUndo) {
            window.onUndo();
        }
    }

    initLevel1() {
        // Setup board holes
        this.board.addHole(200, 300); // 0
        this.board.addHole(400, 300); // 1
        this.board.addHole(200, 500); // 2
        this.board.addHole(400, 500); // 3
        this.board.addHole(300, 200); // 4 (Empty hole)
        this.board.addHole(300, 600); // 5 (Empty hole)

        // Add pieces
        // Piece 1 covering hole 0 and 1
        this.pieces.push(new Piece(1, 'STRAIGHT_BAR', 150, 275, 300, 50, [0, 1]));
        // Piece 2 covering hole 2 and 3
        this.pieces.push(new Piece(2, 'STRAIGHT_BAR', 150, 475, 300, 50, [2, 3]));

        // Add screws to the holes
        this.screws.push(new Screw(1, 0));
        this.screws.push(new Screw(2, 1));
        this.screws.push(new Screw(3, 2));
        this.screws.push(new Screw(4, 3));

        this.updateVisualPositions();
        this.checkPiecesFree();
    }

    initLevel2() {
        this.board.addHole(300, 200); // 0
        this.board.addHole(300, 400); // 1
        this.board.addHole(300, 600); // 2
        this.board.addHole(150, 400); // 3 (Empty)
        this.board.addHole(450, 400); // 4 (Empty)

        this.pieces.push(new Piece(1, 'STRAIGHT_BAR', 250, 150, 100, 300, [0, 1]));
        this.pieces.push(new Piece(2, 'STRAIGHT_BAR', 250, 350, 100, 300, [1, 2], '#c0392b'));

        this.screws.push(new Screw(1, 0));
        this.screws.push(new Screw(2, 1)); // Shared hole conceptually, but screw is in 1
        this.screws.push(new Screw(3, 2));

        this.updateVisualPositions();
        this.checkPiecesFree();
    }

    initLevel3() {
        this.board.addHole(200, 200); // 0
        this.board.addHole(400, 200); // 1
        this.board.addHole(300, 400); // 2
        this.board.addHole(200, 600); // 3
        this.board.addHole(400, 600); // 4
        this.board.addHole(300, 300); // 5 (Empty)
        this.board.addHole(300, 500); // 6 (Empty)

        // Triangle-like dependency
        this.pieces.push(new Piece(1, 'LONG_BAR', 150, 175, 300, 50, [0, 1]));
        this.pieces.push(new Piece(2, 'LONG_BAR', 250, 175, 50, 275, [1, 2], '#2980b9'));
        this.pieces.push(new Piece(3, 'LONG_BAR', 150, 575, 300, 50, [3, 4], '#27ae60'));

        this.screws.push(new Screw(1, 0));
        this.screws.push(new Screw(2, 1));
        this.screws.push(new Screw(3, 2));
        this.screws.push(new Screw(4, 3));
        this.screws.push(new Screw(5, 4));

        this.updateVisualPositions();
        this.checkPiecesFree();
    }

    initLevel4() {
        this.objective = 'FREE_GOLDEN';

        this.board.addHole(250, 300); // 0
        this.board.addHole(350, 300); // 1
        this.board.addHole(250, 500); // 2
        this.board.addHole(350, 500); // 3
        this.board.addHole(150, 400); // 4
        this.board.addHole(450, 400); // 5

        // The Golden Target (Layer 0, bottom)
        this.pieces.push(new Piece(1, 'GOLDEN_TARGET', 200, 275, 200, 250, [0, 1, 2, 3], '#f1c40f', 0));

        // Blocking piece across the top (Layer 1)
        this.pieces.push(new Piece(2, 'BLOCKER', 100, 375, 400, 50, [4, 5], '#34495e', 1));

        // Target piece requires 4 screws to be removed, AND the blocker on top needs to be removed first!
        this.screws.push(new Screw(1, 0));
        this.screws.push(new Screw(2, 1));
        this.screws.push(new Screw(3, 2));
        this.screws.push(new Screw(4, 3));
        this.screws.push(new Screw(5, 4));
        this.screws.push(new Screw(6, 5));

        this.board.addHole(300, 100); // Empty hole
        this.board.addHole(300, 700); // Empty hole
        this.board.addHole(100, 200); // Empty hole

        this.updateVisualPositions();
        this.checkPiecesFree();
    }

    updateVisualPositions() {
        for (const screw of this.screws) {
            const hole = this.board.holes[screw.holeIndex];
            screw.x = hole.x;
            screw.y = hole.y;
        }
    }

    checkPiecesFree() {
        for (const piece of this.pieces) {
            if (piece.isRemoved) continue;

            // 1. Check screws
            let isScrewed = false;
            for (const requiredHole of piece.requiredHoles) {
                if (this.isScrewInHole(requiredHole)) {
                    isScrewed = true;
                    break;
                }
            }

            // 2. Check layering blocking
            // A piece cannot fall if another unremoved piece on a higher layer overlaps it
            let isBlockedByLayer = false;
            if (!isScrewed) {
                for (const other of this.pieces) {
                    if (other.id !== piece.id && !other.isRemoved) {
                        if (other.layer > piece.layer && piece.overlaps(other)) {
                            isBlockedByLayer = true;
                            break;
                        }
                    }
                }
            }

            if (!isScrewed && !isBlockedByLayer && !piece.isFree) {
                piece.isFree = true;
                // Add some initial velocity for falling off
                piece.vy = 2;
                piece.vRotation = (Math.random() - 0.5) * 0.05;
            } else if ((isScrewed || isBlockedByLayer) && piece.isFree) {
                // If it was somehow free but became blocked again (e.g. undo or dynamic)
                piece.isFree = false;
            }
        }

        // Check win condition based on objective
        if (this.objective === 'CLEAR_ALL') {
            if (this.pieces.every(p => p.isRemoved)) {
                this.isComplete = true;
            }
        } else if (this.objective === 'FREE_GOLDEN') {
            const goldenPiece = this.pieces.find(p => p.type === 'GOLDEN_TARGET');
            if (goldenPiece && goldenPiece.isRemoved) {
                this.isComplete = true;
            }
        }
    }

    isScrewInHole(holeIndex) {
        return this.screws.some(s => s.holeIndex === holeIndex);
    }

    getScrewAtHole(holeIndex) {
        return this.screws.find(s => s.holeIndex === holeIndex);
    }

    getScrewAtPosition(x, y) {
        const holeIndex = this.board.getHoleAt(x, y);
        if (holeIndex !== -1) {
            return this.getScrewAtHole(holeIndex);
        }
        return null;
    }

    getPieceAtPosition(x, y) {
        // Iterate backwards so pieces drawn on top are selected first
        for (let i = this.pieces.length - 1; i >= 0; i--) {
            const piece = this.pieces[i];
            if (!piece.isRemoved && piece.containsPoint(x, y)) {
                return piece;
            }
        }
        return null;
    }

    moveScrew(screw, targetHoleIndex) {
        if (this.isScrewInHole(targetHoleIndex)) {
            return false; // Target hole is occupied
        }

        this.saveState(); // Save state before action

        screw.holeIndex = targetHoleIndex;
        this.updateVisualPositions();
        this.checkPiecesFree();
        return true;
    }

    getHint() {
        // Simple hint: Find a piece that is almost free (only held by 1 screw)
        // Or just suggest moving a screw out of a piece to an empty hole.

        for (const piece of this.pieces) {
            if (piece.isRemoved || piece.isFree) continue;

            // Count how many screws are holding this piece
            let holdingScrews = [];
            for (const requiredHole of piece.requiredHoles) {
                const screw = this.getScrewAtHole(requiredHole);
                if (screw) {
                    holdingScrews.push(screw);
                }
            }

            // If it's held by screws, suggest moving one of them to the first empty hole
            if (holdingScrews.length > 0) {
                // Find an empty hole
                for (let i = 0; i < this.board.holes.length; i++) {
                    if (!this.isScrewInHole(i)) {
                        return { screw: holdingScrews[0], targetHole: i };
                    }
                }
            }
        }
        return null;
    }

    update(deltaTime) {
        let allRemoved = true;
        for (const piece of this.pieces) {
            if (piece.isFree && !piece.isRemoved) {
                if (!piece.isDragging) {
                    piece.vy += 0.5; // Gravity
                    piece.y += piece.vy;
                    piece.rotation += piece.vRotation;
                } else {
                    // Reset velocities while dragging
                    piece.vy = 0;
                    piece.vRotation = 0;
                }

                if (piece.y > this.board.height + 200) {
                    piece.isRemoved = true;
                }
            }
            if (!piece.isRemoved) {
                allRemoved = false;
            }
        }

        if (allRemoved && this.pieces.length > 0 && !this.isComplete) {
            this.isComplete = true;
            if (typeof window !== 'undefined' && window.onLevelComplete) {
                window.onLevelComplete();
            }
        }
    }
}
