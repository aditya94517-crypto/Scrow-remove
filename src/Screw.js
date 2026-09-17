export class Screw {
    constructor(id, holeIndex) {
        this.id = id;
        this.holeIndex = holeIndex; // The board hole this screw is currently in
        this.isMoving = false;
        this.x = 0; // Visual x position, updated by state
        this.y = 0; // Visual y position
        this.radius = 12;
    }
}
