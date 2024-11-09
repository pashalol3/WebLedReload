"use strict";
//Это сгенерировано нейросетью. Есть ошибки
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');
const canvasWidth = canvas.width;
const canvasHeight = canvas.height;
const columns = 12;
const rows = 50;
const gap = 2;
let squareSize = 10;
const colors = {
    on: '#00FF00',
    off: '#FF0000'
};
const lastPoint = {
    col: 5,
    row: 10
};
const squaresState = [];
for (let col = 0; col < columns; col++) {
    squaresState[col] = [];
    for (let row = 0; row < rows; row++) {
        squaresState[col][row] = false;
    }
}
class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    equals(other) {
        return this.x === other.x && this.y === other.y;
    }
}
const changedSquares = new Set();
let isPointerDown = false;
function drawSquares() {
    for (let col = 0; col < columns; col++) {
        for (let row = 0; row < rows; row++) {
            const x = col * (squareSize + gap) + (canvasWidth - columns * (squareSize + gap)) / 2;
            const y = row * (squareSize + gap) + (canvasHeight - rows * (squareSize + gap)) / 2;
            const color = squaresState[col][row] ? colors.on : colors.off;
            ctx.fillStyle = color;
            ctx.fillRect(x, y, squareSize, squareSize);
        }
    }
}
function getPointerCoordinates(event) {
    const rect = canvas.getBoundingClientRect();
    const x = 'clientX' in event ? event.clientX - rect.left : event.touches[0].clientX - rect.left;
    const y = 'clientY' in event ? event.clientY - rect.top : event.touches[0].clientY - rect.top;
    return { x, y };
}
function handlePointerMove(event) {
    if (isPointerDown) {
        event.preventDefault();
        const { x, y } = getPointerCoordinates(event);
        const col = Math.floor((x - (canvasWidth - columns * (squareSize + gap)) / 2) / (squareSize + gap));
        const row = Math.floor((y - (canvasHeight - rows * (squareSize + gap)) / 2) / (squareSize + gap));
        if (!(row === lastPoint.row && col === lastPoint.col)) {
            if (col >= 0 && col < columns && row >= 0 && row < rows) {
                lastPoint.row = row;
                lastPoint.col = col;
                const point = new Point(col, row);
                if (!Array.from(changedSquares).some(p => p.equals(point))) {
                    squaresState[col][row] = !squaresState[col][row];
                    const callback = (col, row, state) => {
                        console.log(`Square at (${col}, ${row}) is now ${state ? 'on' : 'off'}`);
                    };
                    callback(col, row, squaresState[col][row]);
                    changedSquares.add(point);
                    drawSquares();
                }
            }
        }
    }
}
function handlePointerDown(event) {
    const { x, y } = getPointerCoordinates(event);
    const col = Math.floor((x - (canvasWidth - columns * (squareSize + gap)) / 2) / (squareSize + gap));
    const row = Math.floor((y - (canvasHeight - rows * (squareSize + gap)) / 2) / (squareSize + gap));
    lastPoint.row = row;
    lastPoint.col = col;
    if (col >= 0 && col < columns && row >= 0 && row < rows) {
        if (!isPointerDown) {
            isPointerDown = true;
            squaresState[col][row] = !squaresState[col][row];
            const callback = (col, row, state) => {
                console.log(`Square at (${col}, ${row}) is now ${state ? 'on' : 'off'}`);
            };
            callback(col, row, squaresState[col][row]);
            drawSquares();
        }
    }
}
function handlePointerUp() {
    isPointerDown = false;
}
canvas.addEventListener('pointerdown', handlePointerDown);
canvas.addEventListener('pointermove', handlePointerMove);
canvas.addEventListener('pointerup', handlePointerUp);
canvas.addEventListener('pointercancel', handlePointerUp);
canvas.addEventListener('touchstart', handlePointerDown);
canvas.addEventListener('touchmove', handlePointerMove);
canvas.addEventListener('touchend', handlePointerUp);
canvas.addEventListener('touchcancel', handlePointerUp);
function animate() {
    drawSquares();
    requestAnimationFrame(animate);
}
// Инициализация: запускаем анимацию
animate();
