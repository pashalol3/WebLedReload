//Это сгенерировано нейросетью. Есть ошибки

const canvas = document.getElementById('myCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

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

const squaresState: boolean[][] = [];
for (let col = 0; col < columns; col++) {
    squaresState[col] = [];
    for (let row = 0; row < rows; row++) {
        squaresState[col][row] = false;
    }
}

class Point {
    constructor(public x: number, public y: number) {}

    equals(other: Point): boolean {
        return this.x === other.x && this.y === other.y;
    }
}

const changedSquares: Set<Point> = new Set();

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

function getPointerCoordinates(event: PointerEvent | TouchEvent): { x: number, y: number } {
    const rect = canvas.getBoundingClientRect();
    const x = 'clientX' in event ? event.clientX - rect.left : event.touches[0].clientX - rect.left;
    const y = 'clientY' in event ? event.clientY - rect.top : event.touches[0].clientY - rect.top;
    return { x, y };
}

function handlePointerMove(event: PointerEvent | TouchEvent) {
    if (isPointerDown) {
        event.preventDefault(); 
        const { x, y } = getPointerCoordinates(event);
        
        const col = Math.floor((x - (canvasWidth - columns * (squareSize + gap)) / 2) / (squareSize + gap));
        const row = Math.floor((y - (canvasHeight - rows * (squareSize + gap)) / 2) / (squareSize + gap));
        
        if (col >= 0 && col < columns && row >= 0 && row < rows) {
            const point = new Point(col, row);
            if (!Array.from(changedSquares).some(p => p.equals(point))) {
                squaresState[col][row] = !squaresState[col][row];
                
                const callback = (col: number, row: number, state: boolean) => {
                    console.log(`Square at (${col}, ${row}) is now ${state ? 'on' : 'off'}`);
                };
                callback(col, row, squaresState[col][row]);
                
                changedSquares.add(point);
                
                drawSquares();
            }
        }
    }
}

function handlePointerDown(event: PointerEvent | TouchEvent) {
    const { x, y } = getPointerCoordinates(event);
    const col = Math.floor((x - (canvasWidth - columns * (squareSize + gap)) / 2) / (squareSize + gap));
    const row = Math.floor((y - (canvasHeight - rows * (squareSize + gap)) / 2) / (squareSize + gap));

    if (col >= 0 && col < columns && row >= 0 && row < rows) {
        const point = new Point(col, row);
        
        if (!isPointerDown) {
            isPointerDown = true; 
            squaresState[col][row] = !squaresState[col][row];

            const callback = (col: number, row: number, state: boolean) => {
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
