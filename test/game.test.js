import assert from 'assert';
import { Board } from '../src/Board.js';
import { Piece } from '../src/Piece.js';
import { Screw } from '../src/Screw.js';
import { GameState } from '../src/GameState.js';
import { Solver } from '../src/Solver.js';
import { Generator } from '../src/Generator.js';

// Minimal polyfill for window if needed by game state
if (typeof window === 'undefined') {
    global.window = {};
}

function runTests() {
    console.log('Running Tests...');

    // Test Board
    const board = new Board(600, 800);
    board.addHole(100, 100);
    assert.strictEqual(board.holes.length, 1, 'Board should have 1 hole');
    assert.strictEqual(board.getHoleAt(100, 100), 0, 'Should find hole at exact coordinates');
    assert.strictEqual(board.getHoleAt(110, 100), 0, 'Should find hole within radius');
    assert.strictEqual(board.getHoleAt(200, 200), -1, 'Should not find hole outside radius');

    // Test Piece Covers Hole
    const piece = new Piece(1, 'BAR', 0, 0, 100, 20, [0, 1]);
    assert.strictEqual(piece.coversHole(0), true, 'Piece should cover required hole 0');
    assert.strictEqual(piece.coversHole(1), true, 'Piece should cover required hole 1');
    assert.strictEqual(piece.coversHole(2), false, 'Piece should not cover hole 2');

    // Test GameState
    const state = new GameState();
    // Level 1 setup creates 6 holes, 2 pieces, 4 screws
    assert.strictEqual(state.board.holes.length, 6, 'Level 1 board should have 6 holes');
    assert.strictEqual(state.pieces.length, 2, 'Level 1 should have 2 pieces');
    assert.strictEqual(state.screws.length, 4, 'Level 1 should have 4 screws');

    // Check screw constraints
    const screw1 = state.screws[0];
    assert.strictEqual(screw1.holeIndex, 0, 'First screw should be in hole 0');
    assert.strictEqual(state.isScrewInHole(0), true, 'Hole 0 should have a screw');
    assert.strictEqual(state.isScrewInHole(4), false, 'Hole 4 should be empty initially');

    // Move screw
    const moved = state.moveScrew(screw1, 4);
    assert.strictEqual(moved, true, 'Screw should move to empty hole 4');
    assert.strictEqual(screw1.holeIndex, 4, 'Screw index should update');
    assert.strictEqual(state.isScrewInHole(0), false, 'Hole 0 should now be empty');

    // Moving screw should free a piece if its required holes are clear
    // Piece 1 requires 0, 1. Currently screw 2 is still in 1.
    assert.strictEqual(state.pieces[0].isFree, false, 'Piece 1 should still be stuck');

    const screw2 = state.screws[1];
    state.moveScrew(screw2, 5); // move screw out of hole 1
    assert.strictEqual(state.pieces[0].isFree, true, 'Piece 1 should be free after screws removed');

    // Test Level loading logic
    state.nextLevel();
    assert.strictEqual(state.currentLevel, 2, 'Should move to level 2');
    // Level 2 has 5 holes
    assert.strictEqual(state.board.holes.length, 5, 'Level 2 board should have 5 holes');

    state.nextLevel();
    assert.strictEqual(state.currentLevel, 3, 'Should move to level 3');
    // Level 3 has 7 holes
    assert.strictEqual(state.board.holes.length, 7, 'Level 3 board should have 7 holes');

    state.nextLevel();
    assert.strictEqual(state.currentLevel, 4, 'Should move to level 4');
    // Level 4 is now our GOLDEN_TARGET level
    assert.strictEqual(state.board.holes.length, 9, 'Level 4 board should have 9 holes');
    assert.strictEqual(state.objective, 'FREE_GOLDEN', 'Level 4 should have FREE_GOLDEN objective');

    // Test Layer Logic
    const pieceOverlap1 = new Piece(1, 'TEST', 0, 0, 50, 50, [], '#fff', 0);
    const pieceOverlap2 = new Piece(2, 'TEST', 25, 25, 50, 50, [], '#fff', 1);
    const pieceNoOverlap = new Piece(3, 'TEST', 100, 100, 50, 50, [], '#fff', 1);

    assert.strictEqual(pieceOverlap1.overlaps(pieceOverlap2), true, 'Pieces should overlap');
    assert.strictEqual(pieceOverlap1.overlaps(pieceNoOverlap), false, 'Pieces should not overlap');

    // Simulate game state layer blocking
    state.pieces = [pieceOverlap1, pieceOverlap2];
    state.screws = []; // No screws
    state.checkPiecesFree();

    // pieceOverlap1 is on layer 0, pieceOverlap2 is on layer 1.
    // Therefore, pieceOverlap1 should be blocked by pieceOverlap2
    assert.strictEqual(pieceOverlap1.isFree, false, 'Piece 1 should be blocked by layer 1 piece');
    assert.strictEqual(pieceOverlap2.isFree, true, 'Piece 2 should be free as nothing is above it');

    // Test Solver and Generator
    const testBoard = new Board(600, 800);
    const genResult = Generator.generateLevel(testBoard, 1);

    assert.strictEqual(genResult.pieces.length > 0, true, 'Generator should create pieces');
    assert.strictEqual(genResult.screws.length > 0, true, 'Generator should create screws');
    assert.strictEqual(testBoard.holes.length >= genResult.screws.length, true, 'Generator should create enough holes');

    const isSolvable = Solver.isSolvable(testBoard.holes, genResult.pieces, genResult.screws);
    assert.strictEqual(isSolvable, true, 'Generated level must be solvable');

    console.log('All tests passed!');
}

runTests();