//Это сгенерировано нейросетью. Есть ошибки
(() => {
    class Point {
        constructor(public x: number, public y: number) { }

        equals(other: Point): boolean {
            return this.x === other.x && this.y === other.y;
        }
        static fromXY(x : number , y: number) : Point {
            return new Point(x,y);
        }
        static zero() : Point{
            return new Point(0,0);
        }
    }

    const colors = {
        on: '#00FF00',
        off: '#FF0000'
    };

    const lastPoint = Point.zero();
    let isPointerDown = false;

    const COLUMNS_COUNT = 12;
    const ROWS_COUNT = 50;
    const GAP = 2;
    const SQUARE_SIZE = 10;

    const canvas = document.getElementById('myCanvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const squaresState: boolean[][] = [];
    const changedSquares: Set<Point> = new Set();


    for (let col = 0; col < COLUMNS_COUNT; col++) {
        squaresState[col] = [];
        for (let row = 0; row < ROWS_COUNT; row++) {
            squaresState[col][row] = false;
        }
    }

    const wsAddress = `ws://${window.location.hostname}/socket`;
    const ws: WebSocket = new WebSocket(wsAddress);

    ws.onmessage = (event) => {
       if (typeof event.data === 'string') {
          
        for (let idx = 0; idx < event.data.length ; idx++){
            if(event.data[idx] == '1'){
                const x = idx % COLUMNS_COUNT;
                const y = Math.floor(idx / COLUMNS_COUNT);
                squaresState[x][y] = true;
            }
        }

          console.log('Получено текстовое сообщение:', event.data);
        }
      };

    const drawSquares = () => {
        for (let col = 0; col < COLUMNS_COUNT; col++) {
            for (let row = 0; row < ROWS_COUNT; row++) {
                const x = col * (SQUARE_SIZE + GAP) + (canvasWidth - COLUMNS_COUNT * (SQUARE_SIZE + GAP)) / 2;
                const y = row * (SQUARE_SIZE + GAP) + (canvasHeight - ROWS_COUNT * (SQUARE_SIZE + GAP)) / 2;
                const color = squaresState[col][row] ? colors.on : colors.off;
                ctx.fillStyle = color;
                ctx.fillRect(x, y, SQUARE_SIZE, SQUARE_SIZE);
            }
        }
    }

    const getPointerCoordinates = (event: PointerEvent | TouchEvent): Point => {
        const rect = canvas.getBoundingClientRect();
        const x = 'clientX' in event ? event.clientX - rect.left : event.touches[0].clientX - rect.left;
        const y = 'clientY' in event ? event.clientY - rect.top : event.touches[0].clientY - rect.top;
        return Point.fromXY(x, y);
    }

    //TODO: Handle error
    const ledStateSwitchCallback = (point: Point, status: boolean): void => {
        ws.send(`${point.x}:${point.y} ${status ? 1 : 0}`);
    }

    const handlePointerMove = (event: PointerEvent | TouchEvent) => {
        if (isPointerDown) {
            event.preventDefault();
            const { x, y } = getPointerCoordinates(event);

            const col = Math.floor((x - (canvasWidth - COLUMNS_COUNT * (SQUARE_SIZE + GAP)) / 2) / (SQUARE_SIZE + GAP));
            const row = Math.floor((y - (canvasHeight - ROWS_COUNT * (SQUARE_SIZE + GAP)) / 2) / (SQUARE_SIZE + GAP));
            if (!(row === lastPoint.x && col === lastPoint.y)) {
                if (col >= 0 && col < COLUMNS_COUNT && row >= 0 && row < ROWS_COUNT) {
                    lastPoint.x = row;
                    lastPoint.y = col;
                    const point = Point.fromXY(col, row);
                    if (!Array.from(changedSquares).some(p => p.equals(point))) {
                        squaresState[col][row] = !squaresState[col][row];


                        ledStateSwitchCallback(Point.fromXY(col, row), squaresState[col][row]);

                        changedSquares.add(point);

                        drawSquares();
                    }
                }
            }
        }
    }

    const handlePointerDown = (event: PointerEvent | TouchEvent) => {
        const { x, y } = getPointerCoordinates(event);
        const col = Math.floor((x - (canvasWidth - COLUMNS_COUNT * (SQUARE_SIZE + GAP)) / 2) / (SQUARE_SIZE + GAP));
        const row = Math.floor((y - (canvasHeight - ROWS_COUNT * (SQUARE_SIZE + GAP)) / 2) / (SQUARE_SIZE + GAP));
        lastPoint.x = row;
        lastPoint.y = col;
        if (col >= 0 && col < COLUMNS_COUNT && row >= 0 && row < ROWS_COUNT) {
            if (!isPointerDown) {
                isPointerDown = true;
                squaresState[col][row] = !squaresState[col][row];


                ledStateSwitchCallback(Point.fromXY(col, row), squaresState[col][row]);

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

    const startAnimation = () => {
        drawSquares();
        requestAnimationFrame(startAnimation);
    }

    startAnimation();
})();

