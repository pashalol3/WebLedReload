import { MessageType, Point } from './common';
(() => {
    let isPointerDown = false;
    const COLUMNS_COUNT = 12;
    const ROWS_COUNT = 50;
    const GAP = 2;
    const SQUARE_SIZE = 12;
    const canvas = document.getElementById('myCanvas');
    const ctx = canvas.getContext('2d');
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const defaultLedValue = 'undefined';
    const changedLeds = [[]];
    fillLeds(changedLeds, defaultLedValue);
    const leds = [[]];
    let currentColor = '#000000';
    function fillLeds(leds, colorHex) {
        for (let col = 0; col < COLUMNS_COUNT; col++) {
            leds[col] = [];
            for (let row = 0; row < ROWS_COUNT; row++) {
                leds[col][row] = colorHex;
            }
        }
    }
    const UINT32toRGB = (uint32) => {
        const r = (uint32 >> 16) & 0xFF;
        const g = (uint32 >> 8) & 0xFF;
        const b = (uint32 & 0xFF);
        return { r, g, b };
    };
    const HEXtoRGB = (colorHex) => {
        const r = parseInt(colorHex.slice(1, 3), 16);
        const g = parseInt(colorHex.slice(3, 5), 16);
        const b = parseInt(colorHex.slice(5, 7), 16);
        return { r, g, b };
    };
    const RGBtoHEX = (r, g, b) => {
        const toHex = (value) => value.toString(16).padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    };
    const wsAddress = `ws://${window.location.hostname}/socket`;
    const ws = new WebSocket(wsAddress);
    ws.binaryType = 'arraybuffer';
    ws.onerror = (event) => {
        throw new Error(`WebSocket Error: ${event}`);
    };
    ws.onclose = (event) => {
        throw new Error(`WebSocket connection closed: ${event}`);
    };
    ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
            const arrayBuffer = event.data;
            const dataView = new DataView(arrayBuffer);
            const msgType = dataView.getUint8(0);
            //[msgType][payload]
            //   0     .......
            switch (msgType) {
                case MessageType.InitialState: {
                    const slicedBuffer = arrayBuffer.slice(1);
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
                    //    0     4  5  .  .  .  .  N-4   N-3   N-2    N-1
                    //[msgType][x][y][x][y][x][y][red][green][blue][alpha]
                    const len = arrayBuffer.byteLength;
                    const HEAD_SIZE = 1;
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
                    //            r      g      b    alpha
                    //[msgType][color][color][color][color]
                    //    0        1     2      3      4
                    const r = dataView.getUint8(1);
                    const g = dataView.getUint8(2);
                    const b = dataView.getUint8(3);
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
                ctx.save();
                ctx.fillStyle = leds[col][row];
                ctx.fillRect(x, y, SQUARE_SIZE, SQUARE_SIZE);
                ctx.restore();
            }
        }
    };
    //TODO: Handle error
    const ledStateSwitchCallback = (changedLeds, colorHex) => {
        //                  r      g      b    alpha
        //[msgType][x][y][color][color][color][color]
        //    0     1  2    3      4      5     
        const ledsCoords = [];
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
        const u8buffer = new Uint8Array(u8BufferLen);
        let bytesOffset = headSize;
        const u8bufferDataView = new DataView(u8buffer.buffer);
        for (let i = 0; i < ledsCoords.length; i++) {
            const point = ledsCoords[i];
            u8bufferDataView.setUint8(bytesOffset++, point.x);
            u8bufferDataView.setUint8(bytesOffset++, point.y);
        }
        u8bufferDataView.setUint8(0, MessageType.SetPoints);
        const { r, g, b } = HEXtoRGB(colorHex);
        u8bufferDataView.setUint8(bytesOffset++, r);
        u8bufferDataView.setUint8(bytesOffset++, g);
        u8bufferDataView.setUint8(bytesOffset++, b);
        u8bufferDataView.setUint8(bytesOffset++, 255);
        ws.send(u8bufferDataView);
    };
    const handlePointerMove = (event) => {
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
    };
    const handlePointerDown = (event) => {
        const { x, y } = Point.getPointerCoordinates(canvas, event);
        if (y < panelHeight) {
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            currentColor = RGBtoHEX(pixel[0], pixel[1], pixel[2]);
        }
        if (y > 1.5 * panelHeight && y < 2 * panelHeight * 1.5) {
            const { r, g, b } = HEXtoRGB(currentColor);
            const buffer = new Uint8Array([
                0,
                r,
                g,
                b,
                255,
            ]);
            const dataView = new DataView(buffer.buffer);
            dataView.setUint8(0, MessageType.FillSolid);
            ws.send(buffer);
            fillLeds(leds, currentColor);
        }
        const col = Math.floor((x - (canvasWidth - COLUMNS_COUNT * (SQUARE_SIZE + GAP)) / 2) / (SQUARE_SIZE + GAP));
        const row = Math.floor((y - (canvasHeight - ROWS_COUNT * (SQUARE_SIZE + GAP)) / 2) / (SQUARE_SIZE + GAP));
        if (col >= 0 && col < COLUMNS_COUNT && row >= 0 && row < ROWS_COUNT) {
            if (!isPointerDown) {
                isPointerDown = true;
                changedLeds[col][row] = currentColor;
                leds[col][row] = currentColor;
            }
        }
    };
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
    const drawColorPalette = () => {
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
    };
    const drawCurrentColor = () => {
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
    };
    const startAnimation = () => {
        drawSquares();
        drawColorPalette();
        drawCurrentColor();
        requestAnimationFrame(startAnimation);
    };
    fillLeds(leds, currentColor);
    startAnimation();
})();
