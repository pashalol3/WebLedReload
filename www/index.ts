import { log } from "console";

(() => {



    //!!!!!!ВО ВСЕХ СООБЩЕНИЯХ, ДЛЯ ПЕРЕВОДА ИЗ UINT8 в UINT32 ИСПОЛЬЗОВАТЬ LITTLE ENDIAN FALSE!!!!!!
    enum MessageType {
        SetFullState = 1,
        SetPointsSolidColor = 2,
        SetSolidColor = 3,
        SetOnePixel = 4, 
        WriteSettings = 5,
        ReadSettings = 6,
    
    }

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
        static getPointerCoordinates = (canvas: HTMLCanvasElement, event: PointerEvent | TouchEvent): Point => {
            const rect = canvas.getBoundingClientRect();
            const x = 'clientX' in event ? event.clientX - rect.left : event.touches[0].clientX - rect.left;
            const y = 'clientY' in event ? event.clientY - rect.top : event.touches[0].clientY - rect.top;
            return Point.fromXY(x, y);
        }

    }
    let isPointerDown = false;

    let COLUMNS_COUNT = 1;
    let ROWS_COUNT = 1;
    const GAP = 2;
    const SQUARE_SIZE = 12;

    const canvas = document.getElementById('myCanvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    const defaultLedValue: string = 'undefined';
    let changedLeds: string[][] = [[]];
    fillLeds(changedLeds, defaultLedValue);

    //EXAMPLE
    //power Of 2      31                                7       
    //bigEndian:    0b00000000 0b00000000 0b00000000 0b10000000    
    //littleEndian: 0b10000000 0b00000000 0b00000000 0b00000000
    // const buffer = new Uint8Array([0b00000000,0b00000000 ,0b00000000, 0b10000000]).buffer;
    // const dw = new DataView(buffer);
    // const bigIndian = dw.getUint32(0,false);    //128
    // const littleEndian = dw.getUint32(0,true);  //2147483648
    //EXAMPLE

    let leds: string[][] = [[]];
    let currentColor = '#000000';

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
    const uint32ToByteArray = (num: number): Uint8Array => {
        if (num < 0 || num > 0xFFFFFFFF) throw new RangeError('Number must be a uint32 (0 to 4294967295)');

        const byteArray = new Uint8Array(4);
        byteArray[0] = (num >> 24) & 0xFF;
        byteArray[1] = (num >> 16) & 0xFF;
        byteArray[2] = (num >> 8) & 0xFF;
        byteArray[3] = num & 0xFF;

        return byteArray;
    }

    const byteArrayToUint32 = (byteArray: Uint8Array): number => {
        if (byteArray.length !== 4) throw new Error('Array must be of length 4');
        return (byteArray[0] << 24) | (byteArray[1] << 16) | (byteArray[2] << 8) | byteArray[3];
    }

    const RGBtoHEX = (r: number, g: number, b: number): string => {
        const toHex = (value: number): string => value.toString(16).padStart(2, '0');

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
            const msgType: MessageType = dataView.getUint8(0);
            //[msgType][payload]
            //   0     .......
            switch (msgType) {
                case MessageType.SetFullState: {

                    let slicedBuffer = arrayBuffer.slice(1);
                    let dataView = new DataView(slicedBuffer);
                    const rxHeight = dataView.getUint8(0);
                    const rxWidth = dataView.getUint8(1);
                    COLUMNS_COUNT = rxWidth;
                    ROWS_COUNT = rxHeight;

                    slicedBuffer = arrayBuffer.slice(3);
                    dataView = new DataView(slicedBuffer);
                    //TODO: 2x dataView
                    const uint32ArrayLength = dataView.byteLength / 4;
                    changedLeds = [[]];
                    fillLeds(changedLeds, defaultLedValue);
                    leds = [[]];
                    fillLeds(leds, '#ff0000');
                    for (let i = 0; i < uint32ArrayLength; i++) {
                        const uint32 = dataView.getUint32(i * 4, false);
                        const x = i % COLUMNS_COUNT;
                        const y = Math.floor(i / COLUMNS_COUNT);
                        const { r, g, b } = UINT32toRGB(uint32);
                        const hexColor = RGBtoHEX(r, g, b);
                        leds[x][y] = hexColor;
                    }
                    break;
                }
                case MessageType.SetOnePixel: {

                    const N = arrayBuffer.byteLength;
                    const HEAD_SIZE = 1;
                    const COLOR_SIZE = 4;
                    const pointsCount = (N - HEAD_SIZE - COLOR_SIZE) / 2;

                    const a = dataView.getUint8(N - 4)
                    const r = dataView.getUint8(N - 3);
                    const g = dataView.getUint8(N - 2);
                    const b = dataView.getUint8(N - 1);
                    const color = RGBtoHEX(r, g, b);

                    for (let i = 0; i < pointsCount; ++i) {
                        const x = dataView.getUint8(HEAD_SIZE + i * 2);
                        const y = dataView.getUint8(HEAD_SIZE + i * 2 + 1);
                        leds[x][y] = color;
                    }
                    break;
                }
                case MessageType.SetSolidColor: {
                    //           N-4   N-3   N-2   N-1
                    //[msgType][alpha][red][green][blue]
                    //    0        1    2     3      4
                    const a = dataView.getUint8(1);
                    const r = dataView.getUint8(2);
                    const g = dataView.getUint8(3);
                    const b = dataView.getUint8(4);
                    const color = RGBtoHEX(r, g, b);
                    fillLeds(leds, color);
                    break;
                }
                case MessageType.ReadSettings: {
                    // const h = dataView.getUint8(1);
                    // const w = dataView.getUint8(2);
                    // COLUMNS_COUNT = w;
                    // ROWS_COUNT = h;
                    console.log("Got ReadSettings");
                    break;
                }
                case MessageType.WriteSettings: {
                    console.log("Got WriteSettings")
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
        ctx.save();

        ctx.fillStyle = '#181818'
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        for (let col = 0; col < COLUMNS_COUNT; col++) {
            for (let row = 0; row < ROWS_COUNT; row++) {
                const x = col * (SQUARE_SIZE + GAP) + (canvasWidth - COLUMNS_COUNT * (SQUARE_SIZE + GAP)) / 2;
                const y = row * (SQUARE_SIZE + GAP) + (canvasHeight - ROWS_COUNT * (SQUARE_SIZE + GAP)) / 2;

                ctx.fillStyle = leds[col][row];
                ctx.fillRect(x, y, SQUARE_SIZE, SQUARE_SIZE);

            }
        }
        ctx.restore();
    }


    //TODO: Handle error
    const ledStateSwitchCallback = (changedLeds: string[][], colorHex: string): void => {
        //                  r      g      b    alpha
        //[msgType][x][y][color][color][color][color]
        //    0     1  2    3      4      5     
        const ledsCoords: Point[] = [];
        for (let col = 0; col < COLUMNS_COUNT; col++) {
            for (let row = 0; row < ROWS_COUNT; row++) {
                if (changedLeds[col][row] != defaultLedValue) {
                    ledsCoords.push(Point.fromXY(col, row));
                }
            }
        }

        //    0     1  2  .  .  .  .  N-4   N-3   N-2    N-1
        //[msgType][x][y][x][y][x][y][red][green][blue][alpha]

        const headSize = 1;
        const colorSize = 4;
        const u8BufferLen = headSize + ledsCoords.length * 2 + colorSize;
        const u8buffer: Uint8Array = new Uint8Array(u8BufferLen);
        let bytesOffset = headSize;
        const u8bufferDataView = new DataView(u8buffer.buffer);
        for (let i = 0; i < ledsCoords.length; i++) {
            const point = ledsCoords[i];
            u8bufferDataView.setUint8(bytesOffset++, point.x);
            u8bufferDataView.setUint8(bytesOffset++, point.y);
        }
        u8bufferDataView.setUint8(0, MessageType.SetPointsSolidColor);
        const { r, g, b } = HEXtoRGB(colorHex);
        u8bufferDataView.setUint8(bytesOffset++, 0); //alpha
        u8bufferDataView.setUint8(bytesOffset++, r); //red
        u8bufferDataView.setUint8(bytesOffset++, g); //green
        u8bufferDataView.setUint8(bytesOffset++, b); //blue
        ws.send(u8bufferDataView);
    }

    const handlePointerMove = (event: PointerEvent | TouchEvent) => {
        if (isPointerDown) {
            event.preventDefault();
            const { x, y } = Point.getPointerCoordinates(canvas, event);

            const col = Math.floor((x - (canvasWidth - COLUMNS_COUNT * (SQUARE_SIZE + GAP)) / 2) / (SQUARE_SIZE + GAP));
            const row = Math.floor((y - (canvasHeight - ROWS_COUNT * (SQUARE_SIZE + GAP)) / 2) / (SQUARE_SIZE + GAP));

            if (col >= 0 && col < COLUMNS_COUNT && row >= 0 && row < ROWS_COUNT) {

                changedLeds[col][row] = currentColor;
                leds[col][row] = currentColor;
            }
        }

    }


    const handlePointerDown = (event: PointerEvent | TouchEvent) => {
        const { x, y } = Point.getPointerCoordinates(canvas, event);
        if (y < panelHeight) {
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            currentColor = RGBtoHEX(pixel[0], pixel[1], pixel[2]);
            //BUG: Обработать тот факт, что ТОЛЬКО ПОМЕНЯЛСЯ ЦВЕТ, ОТПРАВЛЯТЬ НИЧЕГО НЕ НЕДО. ОТПРАВКА ПРОИЗОЙДЕТ В handlePointerUp
        }
        if (y > 1.5 * panelHeight && y < 2 * panelHeight * 1.5) {

            const { r, g, b } = HEXtoRGB(currentColor);
            const buffer: Uint8Array = new Uint8Array([
                0,
                255,
                r,
                g,
                b,
            ]);
            const dataView = new DataView(buffer.buffer);
            dataView.setUint8(0, MessageType.SetSolidColor);
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
        ctx.save();
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, panelHeight);
        ctx.restore();
    }

    const drawCurrentColor = (): void => {
        ctx.save();
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
        ctx.restore();
    }
    const startAnimation = () => {
        drawSquares();
        drawColorPalette();
        drawCurrentColor();
        requestAnimationFrame(startAnimation);
    }
    fillLeds(leds, currentColor);
    startAnimation();
})();

