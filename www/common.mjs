class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    equals(other) {
        return this.x === other.x && this.y === other.y;
    }
    static fromXY(x, y) {
        return new Point(x, y);
    }
    static zero() {
        return new Point(0, 0);
    }
}
Point.getPointerCoordinates = (canvas, event) => {
    const rect = canvas.getBoundingClientRect();
    const x = 'clientX' in event ? event.clientX - rect.left : event.touches[0].clientX - rect.left;
    const y = 'clientY' in event ? event.clientY - rect.top : event.touches[0].clientY - rect.top;
    return Point.fromXY(x, y);
};
export default Point;
