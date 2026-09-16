export class Piece {
    constructor(id, type, x, y, width, height, requiredHoles, color = '#a8b2b8') {
        this.id = id;
        this.type = type; // e.g. 'STRAIGHT_BAR'
        this.x = x;
        this.y = y;
        this.initialX = x; // store initial coordinates for correct hole rendering
        this.initialY = y;
        this.width = width;
        this.height = height;
        // The indices of the board holes this piece spans/requires screws in to be attached
        this.requiredHoles = requiredHoles;
        this.color = color;
        this.isFree = false; // Is it no longer constrained by screws?
        this.isRemoved = false;

        // Physics for falling/removing
        this.vy = 0;
        this.vx = 0;
        this.rotation = 0;
        this.vRotation = 0;
        this.isDragging = false;
    }

    // Check if a point is within the bounds of this piece
    containsPoint(px, py) {
        return px >= this.x && px <= this.x + this.width && py >= this.y && py <= this.y + this.height;
    }

    // Check if a given board hole is covered by this piece
    coversHole(holeIndex) {
        return this.requiredHoles.includes(holeIndex);
    }
}
