export class Board {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.holes = []; // Array of {x, y, radius}
    }

    addHole(x, y, radius = 15) {
        this.holes.push({ x, y, radius });
    }

    getHoleAt(x, y, radius = 20) {
        for (let i = 0; i < this.holes.length; i++) {
            const h = this.holes[i];
            const dx = h.x - x;
            const dy = h.y - y;
            if (dx * dx + dy * dy <= radius * radius) {
                return i;
            }
        }
        return -1;
    }
}
