import { Piece } from './Piece.js';
import { Screw } from './Screw.js';
import { Solver } from './Solver.js';

export class Generator {
    static generateLevel(board, difficultyScore = 1) {
        let pieces = [];
        let screws = [];

        let attempts = 0;
        const MAX_ATTEMPTS = 50; // Try generating 50 times until we find a solvable one

        while(attempts < MAX_ATTEMPTS) {
            board.holes = [];
            pieces = [];
            screws = [];

            const numPieces = 2 + Math.floor(Math.random() * 3) + Math.min(2, Math.floor(difficultyScore / 5));
            const numScrews = numPieces + 1; // Not every required hole gets a screw, creating empty spaces

            // Generate holes on a grid
            const gridRows = 5;
            const gridCols = 4;
            const startX = 150;
            const startY = 200;
            const spacing = 100;

            let possibleHoles = [];
            for(let r=0; r<gridRows; r++) {
                for(let c=0; c<gridCols; c++) {
                    possibleHoles.push({x: startX + c*spacing, y: startY + r*spacing});
                }
            }

            // Randomly pick holes to actually add to the board
            // We need enough holes for the pieces + a few empty ones for movement
            const totalHoles = numScrews + 2 + Math.floor(Math.random() * 3);
            for(let i=0; i<totalHoles && possibleHoles.length > 0; i++) {
                const idx = Math.floor(Math.random() * possibleHoles.length);
                const h = possibleHoles.splice(idx, 1)[0];
                board.addHole(h.x, h.y);
            }

            // Create pieces connecting 2 adjacent holes
            for(let i=0; i<numPieces; i++) {
                if(board.holes.length < 2) break;
                // Pick 2 random holes
                const h1Idx = Math.floor(Math.random() * board.holes.length);
                let h2Idx = Math.floor(Math.random() * board.holes.length);
                while(h2Idx === h1Idx) h2Idx = Math.floor(Math.random() * board.holes.length);

                const h1 = board.holes[h1Idx];
                const h2 = board.holes[h2Idx];

                const minX = Math.min(h1.x, h2.x) - 30;
                const minY = Math.min(h1.y, h2.y) - 30;
                const w = Math.abs(h1.x - h2.x) + 60;
                const h = Math.abs(h1.y - h2.y) + 60;

                const layer = Math.floor(Math.random() * 2); // 0 or 1
                const color = layer === 0 ? '#95a5a6' : '#e67e22';

                pieces.push(new Piece(i+1, 'PROC_BAR', minX, minY, w, h, [h1Idx, h2Idx], color, layer));
            }

            // Place screws in a subset of the required holes
            let allRequiredHoles = new Set();
            pieces.forEach(p => p.requiredHoles.forEach(h => allRequiredHoles.add(h)));

            let reqHoleArr = Array.from(allRequiredHoles);
            for(let i=0; i<numScrews && reqHoleArr.length > 0; i++) {
                const idx = Math.floor(Math.random() * reqHoleArr.length);
                const holeToScrew = reqHoleArr.splice(idx, 1)[0];
                screws.push(new Screw(i+1, holeToScrew));
            }

            // Validate with Solver!
            if (Solver.isSolvable(board.holes, pieces, screws)) {
                return { pieces, screws };
            }

            attempts++;
        }

        // Fallback if the generator fails (very rare but possible for hard constraints)
        // Return a trivial setup
        console.warn("Generator hit max attempts, returning fallback level");
        board.holes = [];
        board.addHole(300, 300);
        board.addHole(300, 500);
        pieces = [new Piece(1, 'FALLBACK', 200, 250, 200, 100, [0], '#bdc3c7', 0)];
        screws = [new Screw(1, 0)];
        return { pieces, screws };
    }
}
