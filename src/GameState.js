import { Board } from './Board.js';
import { Piece } from './Piece.js';
import { Screw } from './Screw.js';

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

        // Simple cyclic level loading for infinite feel
        const levelType = (levelNumber - 1) % 3;

        if (levelType === 0) {
            this.initLevel1();
        } else if (levelType === 1) {
            this.initLevel2();
        } else {
            this.initLevel3();
        }
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

            // Check if any screw is currently in any of this piece's required holes
            let isScrewed = false;
            for (const requiredHole of piece.requiredHoles) {
                if (this.isScrewInHole(requiredHole)) {
                    isScrewed = true;
                    break;
                }
            }

            if (!isScrewed && !piece.isFree) {
                piece.isFree = true;
                // Add some initial velocity for falling off
                piece.vy = 2;
                piece.vRotation = (Math.random() - 0.5) * 0.05;
            }
        }

        // Check win condition
        if (this.pieces.every(p => p.isRemoved)) {
            this.isComplete = true;
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
