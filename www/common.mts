class Point {
    constructor(public x: number, public y: number) { }

    equals(other: Point): boolean {
        return this.x === other.x && this.y === other.y;
    }
    static fromXY(x: number, y: number): Point {
        return new Point(x, y);
    }
    static zero(): Point {
        return new Point(0, 0);
    }
    static getPointerCoordinates = (canvas: HTMLCanvasElement ,event: PointerEvent | TouchEvent): Point => {
        const rect = canvas.getBoundingClientRect();
        const x = 'clientX' in event ? event.clientX - rect.left : event.touches[0].clientX - rect.left;
        const y = 'clientY' in event ? event.clientY - rect.top : event.touches[0].clientY - rect.top;
        return Point.fromXY(x, y);
    }

}
enum MessageType {
    InitialState = 1,
    SetPoints = 2,
    FillSolid = 3,
}

export {Point , MessageType};