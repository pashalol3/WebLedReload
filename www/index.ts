//Это сгенерировано нейросетью. Есть ошибки
(() => {
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
    }
    enum MessageType {
        InitialState = 1 << 30,
        SetPoints = 1 << 29,
        FillSolid = 1 << 28,
    }

    let isPointerDown = false;

    const COLUMNS_COUNT = 12;
    const ROWS_COUNT = 50;
    const GAP = 2;
    const SQUARE_SIZE = 12;

    const canvas = document.getElementById('myCanvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    const defaultLedValue: string = 'undefined';
    const changedLeds: string[][] = [[]];
    fillLeds(changedLeds, defaultLedValue);

    const leds: string[][] = [[]];
    let currentColor = '#ff0000';

    function fillLeds(leds: string[][], colorHex: string): void {
        for (let col = 0; col < COLUMNS_COUNT; col++) {
            leds[col] = [];
            for (let row = 0; row < ROWS_COUNT; row++) {
                leds[col][row] = colorHex;
            }
        }
    }
    const UINT32toRGB = (uint32: number): { r: number, g: number, b: number } => {
        const r = (uint32 >> 16) & 0xFF;
        const g = (uint32 >> 8) & 0xFF;
        const b = (uint32 & 0xFF);
        return { r, g, b };
    }
    const HEXtoRGB = (colorHex: string): { r: number, g: number, b: number } => {
        const r = parseInt(colorHex.slice(1, 3), 16);
        const g = parseInt(colorHex.slice(3, 5), 16);
        const b = parseInt(colorHex.slice(5, 7), 16);
        return { r, g, b };
    }
    const RGBtoHEX = (r: number, g: number, b: number): string => {
        const toHex = (value: number): string => {
            return value.toString(16).padStart(2, '0');
        };

        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
    const wsAddress = `ws://${window.location.hostname}/socket`;
    const ws: WebSocket = new WebSocket(wsAddress);
    ws.binaryType = 'arraybuffer';

    ws.onerror = (event) => {
        throw new Error(`WebSocket Error: ${event}`);
    };

    ws.onclose = (event) => {
        throw new Error(`WebSocket connection closed: ${event}`);
    }
    ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
            const arrayBuffer = event.data as ArrayBuffer;
            const dataView = new DataView(arrayBuffer);
            const msgType: MessageType = dataView.getUint32(0);
            //[msgType][msgType][msgType][msgType][payload]
            //    0        1        2        3     .......
            switch (msgType) {
                case MessageType.InitialState: {
                    const slicedBuffer = arrayBuffer.slice(4);
                    const uint32Array = new Uint32Array(slicedBuffer);
                    for (let i = 0; i < uint32Array.length; i++) {
                        const x = i % COLUMNS_COUNT;
                        const y = Math.floor(i / COLUMNS_COUNT);
                        const { r, g, b } = UINT32toRGB(uint32Array[i]);
                        const hexColor = RGBtoHEX(r, g, b);
                        leds[x][y] = hexColor;
                    }
                    break;
                }
                case MessageType.SetPoints: {
                    //    0        1        2        3     4  5  .  .  .  .  N-4   N-3   N-2    N-1
                    //[msgType][msgType][msgType][msgType][x][y][x][y][x][y][red][green][blue][alpha]
                    const len = arrayBuffer.byteLength;
                    const uint8Array = new Uint8Array(arrayBuffer);
                    const HEAD_SIZE = 4;
                    const COLOR_SIZE = 4;
                    const pointsCount = (len - HEAD_SIZE - COLOR_SIZE) / 2;

                    const r = dataView.getUint8(len - 4);
                    const g = dataView.getUint8(len - 3);
                    const b = dataView.getUint8(len - 2);
                    const color = RGBtoHEX(r, g, b);

                    for (let i = 0; i < pointsCount; ++i) {
                        const x = dataView.getUint8(HEAD_SIZE + i * 2);
                        const y = dataView.getUint8(HEAD_SIZE + i * 2 + 1);
                        leds[x][y] = color;
                    }


                    break;
                }
                case MessageType.FillSolid: {
                    //                                       r      g      b    alpha
                    //[msgType][msgType][msgType][msgType][color][color][color][color]
                    //    0        1        2        3       4      5      6      7
                    const r = dataView.getUint8(4);
                    const g = dataView.getUint8(5);
                    const b = dataView.getUint8(6);
                    const color = RGBtoHEX(r, g, b);
                    fillLeds(leds, color);
                    break;
                }
                default:
                    throw new Error("Invalid message");
            }
        }
        else {
            console.log(event);
            throw new Error('Invalid message');
        }
    };

    const drawSquares = () => {
        for (let col = 0; col < COLUMNS_COUNT; col++) {
            for (let row = 0; row < ROWS_COUNT; row++) {
                const x = col * (SQUARE_SIZE + GAP) + (canvasWidth - COLUMNS_COUNT * (SQUARE_SIZE + GAP)) / 2;
                const y = row * (SQUARE_SIZE + GAP) + (canvasHeight - ROWS_COUNT * (SQUARE_SIZE + GAP)) / 2;
                ctx.fillStyle = leds[col][row];
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
    const ledStateSwitchCallback = (changedLeds: string[][], colorHex: string): void => {
        //                                             r      g      b    alpha
        //[msgType][msgType][msgType][msgType][x][y][color][color][color][color]
        //    0        1        2         3    4  5    6      7      8     
        const ledsCoords: Point[] = [];
        for (let col = 0; col < COLUMNS_COUNT; col++) {
            for (let row = 0; row < ROWS_COUNT; row++) {
                if (changedLeds[col][row] != defaultLedValue) {
                    ledsCoords.push(Point.fromXY(col, row));
                }
            }
        }

        //    0        1        2        3     4  5  .  .  .  .  N-4   N-3   N-2    N-1
        //[msgType][msgType][msgType][msgType][x][y][x][y][x][y][red][green][blue][alpha]

        //[head][head][head][head] [n points] [n points] [r] [g] [b] [a]
        const u8BufferLen = 4 + ledsCoords.length * 2 + 4;
        const u8buffer: Uint8Array = new Uint8Array(u8BufferLen);
        let bytesOffset = 4;
        const u8bufferDataView = new DataView(u8buffer.buffer);
        for (let i = 0; i < ledsCoords.length; i++) {
            const point = ledsCoords[i];
            u8bufferDataView.setUint8(bytesOffset++, point.x);
            u8bufferDataView.setUint8(bytesOffset++, point.y);
        }
        u8bufferDataView.setUint32(0, MessageType.SetPoints, false);
        const { r, g, b } = HEXtoRGB(colorHex);
        u8bufferDataView.setUint8(bytesOffset++, r);
        u8bufferDataView.setUint8(bytesOffset++, g);
        u8bufferDataView.setUint8(bytesOffset++, b);
        u8bufferDataView.setUint8(bytesOffset++, 255);
        ws.send(u8bufferDataView);
    }

    const handlePointerMove = (event: PointerEvent | TouchEvent) => {
        if (isPointerDown) {
            event.preventDefault();
            const { x, y } = getPointerCoordinates(event);

            const col = Math.floor((x - (canvasWidth - COLUMNS_COUNT * (SQUARE_SIZE + GAP)) / 2) / (SQUARE_SIZE + GAP));
            const row = Math.floor((y - (canvasHeight - ROWS_COUNT * (SQUARE_SIZE + GAP)) / 2) / (SQUARE_SIZE + GAP));

            if (col >= 0 && col < COLUMNS_COUNT && row >= 0 && row < ROWS_COUNT) {

                changedLeds[col][row] = currentColor;
                leds[col][row] = currentColor;
            }
        }

    }


    const handlePointerDown = (event: PointerEvent | TouchEvent) => {
        const { x, y } = getPointerCoordinates(event);
        if (y < panelHeight) {
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            currentColor = RGBtoHEX(pixel[0], pixel[1], pixel[2]);
        }
        if (y > 1.5 * panelHeight && y < 2 * panelHeight * 1.5) {

            const { r, g, b } = HEXtoRGB(currentColor);
            const buffer: Uint8Array = new Uint8Array([
                0,
                0,
                0,
                0,
                r,
                g,
                b,
                255,
            ]);
            const dataView = new DataView(buffer.buffer);
            dataView.setUint32(0, MessageType.FillSolid, false);
            ws.send(buffer);
            fillLeds(leds, currentColor);
        }
        const col = Math.floor((x - (canvasWidth - COLUMNS_COUNT * (SQUARE_SIZE + GAP)) / 2) / (SQUARE_SIZE + GAP));
        const row = Math.floor((y - (canvasHeight - ROWS_COUNT * (SQUARE_SIZE + GAP)) / 2) / (SQUARE_SIZE + GAP));
        if (col >= 0 && col < COLUMNS_COUNT && row >= 0 && row < ROWS_COUNT) {
            if (!isPointerDown) {
                isPointerDown = true;
                changedLeds[col][row] = currentColor;
                leds[col][row] = currentColor
            }
        }
    }


    function handlePointerUp() {
        isPointerDown = false;
        ledStateSwitchCallback(changedLeds, currentColor);
        fillLeds(changedLeds, defaultLedValue);
    }


    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);

    canvas.addEventListener('touchstart', handlePointerDown);
    canvas.addEventListener('touchmove', handlePointerMove);
    canvas.addEventListener('touchend', handlePointerUp);
    canvas.addEventListener('touchcancel', handlePointerUp);

    const panelHeight = 30;
    const drawColorPalette = (): void => {
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
        gradient.addColorStop(0.00, 'red');
        gradient.addColorStop(0.14, 'orange');
        gradient.addColorStop(0.28, 'yellow');
        gradient.addColorStop(0.42, 'green');
        gradient.addColorStop(0.57, 'blue');
        gradient.addColorStop(0.71, 'indigo');
        gradient.addColorStop(0.85, 'violet');
        gradient.addColorStop(1.00, 'white');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, panelHeight);
    }

    const drawCurrentColor = (): void => {
        ctx.fillStyle = currentColor;
        ctx.fillRect(0, panelHeight + 10, canvas.width, panelHeight);

        const r = 255 - parseInt(currentColor.slice(1, 3), 16);
        const g = 255 - parseInt(currentColor.slice(3, 5), 16);
        const b = 255 - parseInt(currentColor.slice(5, 7), 16);
        const invertedColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

        ctx.fillStyle = invertedColor;
        ctx.textAlign = 'center';
        ctx.font = `32px Verdana`;
        ctx.fillText('ТЕКУЩИЙ ЦВЕТ', canvas.width / 2, panelHeight * 2.2);
    }
    const startAnimation = () => {
        drawSquares();
        drawColorPalette();
        drawCurrentColor();
        requestAnimationFrame(startAnimation);
    }
    fillLeds(leds, '000000');
    startAnimation();
})();

