enum MessageType {
    SetFullState = 1,
    SetPointsSolidColor = 2,
    SetSolidColor = 3,
    SetOnePixel = 4,
    Settings = 5
}

enum PixelType {
    SupportPoint = 0,
    Default,
    Count,
}
const getPixelColor = (pixel: PixelType): string => {
    switch (pixel) {
        case PixelType.SupportPoint: return '#00ff00'
        case PixelType.Default: return '#ffffff'
        default: throw new Error("UNREACHABLE");
    }
}
const getPointerCoordinates = (canvas: HTMLCanvasElement, event: PointerEvent | TouchEvent) => {
    const rect = canvas.getBoundingClientRect();
    const x = 'clientX' in event ? event.clientX - rect.left : event.touches[0].clientX - rect.left;
    const y = 'clientY' in event ? event.clientY - rect.top : event.touches[0].clientY - rect.top;
    return { x, y };
}

(() => {

    let GAP = 2;
    let SQUARE_SIZE = 15;

    let ROWS_COUNT = 16;
    let COLUMNS_COUNT = 32;

    const saveButton = document.getElementById("bSave");
    const inputColumnCount = document.getElementById("columnCount") as HTMLInputElement;;
    const inputRowCount = document.getElementById("rowCount") as HTMLInputElement;

    const canvas = document.getElementById("myCanvas") as HTMLCanvasElement;
    const ctx = canvas?.getContext('2d');
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const backgroundColor = '#181818';

    const wsAddress = `ws://${window.location.hostname}/socket`;
    const ws: WebSocket = new WebSocket(wsAddress);
    let isDown = false;
    const leds: PixelType[][] = [[]];
    let supportPoints: Point[] = [];
    // const finalNumbersArray = Array<number>(ROWS_COUNT * COLUMNS_COUNT).fill(0);



    //REMOVE THIS
    inputColumnCount.value = COLUMNS_COUNT.toString();
    inputRowCount.value = ROWS_COUNT.toString();
    //END REMOVE THIS

    fillLeds(leds, PixelType.Default);

    previewLeds();

    ws.binaryType = 'arraybuffer';
    ws.onerror = (event) => {
        throw new Error(`WebSocket Error: ${event}`);
    };

    ws.onclose = (event) => {
        throw new Error(`WebSocket connection closed: ${event}`);
    }
    ws.onmessage = (event) => {
        inputColumnCount.value = COLUMNS_COUNT.toString();
        inputRowCount.value = ROWS_COUNT.toString();
    }

    saveButton?.addEventListener('click', handleSave);
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointerup', handlePointerUp);

    function handlePointerDown(event: PointerEvent | TouchEvent) {
        isDown = true;
        const { x, y } = getPointerCoordinates(canvas, event);
        const col = Math.floor((x - (canvasWidth - COLUMNS_COUNT * (SQUARE_SIZE + GAP)) / 2) / (SQUARE_SIZE + GAP));
        const row = Math.floor((y - (canvasHeight - ROWS_COUNT * (SQUARE_SIZE + GAP)) / 2) / (SQUARE_SIZE + GAP));
        let currentPixelType = leds[col][row];

        let next = ++currentPixelType;
        if (next == PixelType.Count)
            next = 0;
        const cords = { col, row };

        const predicate = (s: Point) => s.col === cords.col && s.row === cords.row;

        const exists = supportPoints.some(s => predicate(s));
        if (exists) {
            supportPoints = supportPoints.filter(s => !predicate(s));
        } else {
            supportPoints.push(cords);
        }

        leds[col][row] = next;
        console.table(supportPoints);
    }

    function handlePointerUp(event: PointerEvent | TouchEvent) {
        isDown = false;
    }

    type Point = {
        col: number;
        row: number;
    };

    const putNums = () => {
        let idx = 0;
        // Предполагается, что supportPoints - это массив упорядоченных точек
        for (let i = 0; i < supportPoints.length - 1; i += 2) {
            const first = supportPoints[i];
            const second = supportPoints[i + 1];

            if (first.col !== second.col) {
                // Если колонки разные, рисуем по колонкам
                idx = drawNumbersBetweenPoints(first, second, true, idx);
            } else if (first.row !== second.row) {
                // Если строки разные, рисуем по строкам
                idx = drawNumbersBetweenPoints(first, second, false, idx);
            }
        }

    }

    const drawNumbersBetweenPoints = (start: Point, end: Point, isHorizontal: boolean, idx: number): number => {
        const startPos = isHorizontal ? start.col : start.row;
        const endPos = isHorizontal ? end.col : end.row;

        const step = startPos < endPos ? 1 : -1;

        for (let i = startPos; i !== endPos + step; i += step) {
            if (ctx == null) throw new Error("Ctx is null");
            ctx.save();

            const x = isHorizontal ?
                (i * (SQUARE_SIZE + GAP) + (canvasWidth - COLUMNS_COUNT * (SQUARE_SIZE + GAP)) / 2 + SQUARE_SIZE / 12) :
                (start.col * (SQUARE_SIZE + GAP) + (canvasWidth - COLUMNS_COUNT * (SQUARE_SIZE + GAP)) / 2 + SQUARE_SIZE / 10);

            const y = isHorizontal ?
                (start.row * (SQUARE_SIZE + GAP) + (canvasHeight - ROWS_COUNT * (SQUARE_SIZE + GAP)) / 2 + SQUARE_SIZE / 2) :
                (i * (SQUARE_SIZE + GAP) + (canvasHeight - ROWS_COUNT * (SQUARE_SIZE + GAP)) / 2 + SQUARE_SIZE / 2);

            ctx.fillStyle = '#ff0000';
            ctx.font = '14px Arial';
            ctx.fillText(`${idx}`, x, y);
            ctx.restore();

            idx++;
        }

        return idx; // Возвращаем обновленный индекс
    }




    function previewLeds() {
        if (ctx === null)
            return;
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight)

        while (ROWS_COUNT * (SQUARE_SIZE + GAP) < canvasHeight ||
            COLUMNS_COUNT * (SQUARE_SIZE + GAP) <= canvasWidth) {
            SQUARE_SIZE++;
            GAP += 0.005;
        }

        while (ROWS_COUNT * (SQUARE_SIZE + GAP) >= canvasHeight ||
            COLUMNS_COUNT * (SQUARE_SIZE + GAP) >= canvasWidth) {
            SQUARE_SIZE--;
            GAP -= 0.005;
            if (SQUARE_SIZE <= 0)
                throw new Error("SQUARE_SIZE <= 0")
        }


        for (let col = 0; col < COLUMNS_COUNT; col++) {
            for (let row = 0; row < ROWS_COUNT; row++) {
                const x = col * (SQUARE_SIZE + GAP) + (canvasWidth - COLUMNS_COUNT * (SQUARE_SIZE + GAP)) / 2;
                const y = row * (SQUARE_SIZE + GAP) + (canvasHeight - ROWS_COUNT * (SQUARE_SIZE + GAP)) / 2;
                ctx.fillStyle = getPixelColor(leds[col][row]);
                ctx.fillRect(x, y, SQUARE_SIZE, SQUARE_SIZE);
            }
        }
    }
    function handleSave(ev: MouseEvent) {
        const rowCount: number = parseInt(inputRowCount?.value, 10);
        if (rowCount <= 0 || Number.isNaN(rowCount)) {
            alert("Количестов строк не может быть <= 0");
            return;
        }
        const columnCount = parseInt(inputColumnCount.value, 10);
        if (columnCount <= 0 || Number.isNaN(columnCount)) {
            alert("Количестов столбцов не может быть <= 0");
            return;
        }
        ROWS_COUNT = rowCount;
        COLUMNS_COUNT = columnCount;
        const buffer: Uint8Array = new Uint8Array([
            0,
            ROWS_COUNT,
            COLUMNS_COUNT
        ]);
        const dataView = new DataView(buffer.buffer);
        dataView.setUint8(0, MessageType.Settings);
        ws.send(buffer);

        previewLeds();

    }
    function fillLeds(leds: PixelType[][], value: PixelType) {
        for (let col = 0; col < COLUMNS_COUNT; col++) {
            leds[col] = [];
            for (let row = 0; row < ROWS_COUNT; row++) {
                leds[col][row] = value;
            }
        }
    }

    const startAnimation = () => {
        previewLeds();
        putNums();
        requestAnimationFrame(startAnimation);
    }
    startAnimation();

})();


