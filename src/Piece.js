export class Piece {
    constructor(id, type, x, y, width, height, requiredHoles, color = '#a8b2b8', layer = 0) {
        this.id = id;
        this.type = type; // e.g. 'STRAIGHT_BAR'
        this.x = x;
        this.y = y;
        this.initialX = x; // store initial coordinates for correct hole rendering
        this.initialY = y;
        this.width = width;
        this.height = height;
        this.layer = layer;
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

    getAABB() {
        // If piece is rotated 90 or 270 degrees, width and height logic swap for AABB
        const isRotated = Math.abs(this.rotation % Math.PI) > 0.1;

        let w = this.width;
        let h = this.height;

        if (isRotated) {
            w = this.height;
            h = this.width;
        }

        // x and y are the top left of the UNROTATED piece.
        // During drag, x and y are updated to the top-left of the AABB bounding box in main.js
        // so we can just use x, y, w, h directly for simple AABB.
        return {
            x: this.x,
            y: this.y,
            w: w,
            h: h
        };
    }

    // Check if this piece overlaps with another piece (simple AABB)
    overlaps(other) {
        const box1 = this.getAABB();
        const box2 = other.getAABB();

        return (box1.x < box2.x + box2.w &&
                box1.x + box1.w > box2.x &&
                box1.y < box2.y + box2.h &&
                box1.y + box1.h > box2.y);
    }

    // Check if a point is within the bounds of this piece
    containsPoint(px, py) {
        const box = this.getAABB();
        return px >= box.x && px <= box.x + box.w && py >= box.y && py <= box.y + box.h;
    }

    // Check if a given board hole is covered by this piece
    coversHole(holeIndex) {
        return this.requiredHoles.includes(holeIndex);
    }
}
