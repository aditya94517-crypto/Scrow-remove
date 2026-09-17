import { Piece } from './Piece.js';
import { Screw } from './Screw.js';
import { Board } from './Board.js';

export class Solver {
    // DFS Solver to verify if a level configuration is solvable.
    static isSolvable(boardHoles, initialPieces, initialScrews) {
        // Deep clone initial state so we don't mutate the actual game while testing
        // For Pieces, we keep the original objects in a map so we can call getAABB safely,
        // and only clone the mutable state (isRemoved).
        const pieceMap = new Map();
        initialPieces.forEach(p => pieceMap.set(p.id, p));

        const initialState = {
            pieces: initialPieces.map(p => ({
                id: p.id,
                requiredHoles: [...p.requiredHoles],
                layer: p.layer,
                isRemoved: false,
                overlaps: (other) => pieceMap.get(p.id).overlaps(pieceMap.get(other.id))
            })),
            screws: initialScrews.map(s => ({
                id: s.id,
                holeIndex: s.holeIndex
            }))
        };

        const visitedStates = new Set();

        function serializeState(pieces, screws) {
            const pState = pieces.map(p => p.id + ':' + (p.isRemoved ? 1 : 0)).join(',');
            const sState = screws.map(s => s.holeIndex).sort().join(',');
            return pState + '|' + sState;
        }

        // Returns true if solvable
        function solve(pieces, screws) {
            const stateStr = serializeState(pieces, screws);
            if (visitedStates.has(stateStr)) return false;
            visitedStates.add(stateStr);

            // Check if all pieces removed
            if (pieces.every(p => p.isRemoved)) {
                return true;
            }

            // Generate possible moves:
            // 1. Move any screw to any empty hole
            for (let i = 0; i < screws.length; i++) {
                const currentScrew = screws[i];
                const originalHole = currentScrew.holeIndex;

                // Find empty holes
                const occupiedHoles = new Set(screws.map(s => s.holeIndex));

                for (let holeIdx = 0; holeIdx < boardHoles.length; holeIdx++) {
                    if (!occupiedHoles.has(holeIdx)) {
                        // Try this move
                        const newScrews = screws.map(s => ({ ...s }));
                        newScrews[i].holeIndex = holeIdx;

                        // Check piece falling
                        const newPieces = pieces.map(p => ({ ...p }));
                        checkPiecesFree(newPieces, newScrews);

                        // Recurse
                        if (solve(newPieces, newScrews)) {
                            return true;
                        }
                    }
                }
            }

            return false;
        }

        function checkPiecesFree(pList, sList) {
            for (const p of pList) {
                if (p.isRemoved) continue;

                let isScrewed = false;
                for (const reqHole of p.requiredHoles) {
                    if (sList.some(s => s.holeIndex === reqHole)) {
                        isScrewed = true;
                        break;
                    }
                }

                let isBlocked = false;
                if (!isScrewed) {
                    for (const other of pList) {
                        if (other.id !== p.id && !other.isRemoved) {
                            if (other.layer > p.layer && p.overlaps(other)) {
                                isBlocked = true;
                                break;
                            }
                        }
                    }
                }

                if (!isScrewed && !isBlocked) {
                    p.isRemoved = true; // For the solver, 'free' means instantly removed to simplify state space
                }
            }
        }

        return solve(initialState.pieces, initialState.screws);
    }
}
