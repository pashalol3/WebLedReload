"use strict";
(() => {
    let MessageType;
    (function (MessageType) {
        MessageType[MessageType["SetFullState"] = 1] = "SetFullState";
        MessageType[MessageType["SetPointsSolidColor"] = 2] = "SetPointsSolidColor";
        MessageType[MessageType["SetSolidColor"] = 3] = "SetSolidColor";
        MessageType[MessageType["SetOnePixel"] = 4] = "SetOnePixel";
        MessageType[MessageType["Settings"] = 5] = "Settings";
    })(MessageType || (MessageType = {}));
    const getPointerCoordinates = (canvas, event) => {
        const rect = canvas.getBoundingClientRect();
        const x = 'clientX' in event ? event.clientX - rect.left : event.touches[0].clientX - rect.left;
        const y = 'clientY' in event ? event.clientY - rect.top : event.touches[0].clientY - rect.top;
        return { x, y };
    };
    const saveButton = document.getElementById("bSave");
    const inputColumnCount = document.getElementById("columnCount");
    ;
    const inputRowCount = document.getElementById("rowCount");
    const lableCoords = document.getElementById("coords");
    const canvas = document.getElementById("myCanvas");
    const ctx = canvas === null || canvas === void 0 ? void 0 : canvas.getContext('2d');
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const backgroundColor = '#181818';
    const wsAddress = `ws://${window.location.hostname}/socket`;
    const ws = new WebSocket(wsAddress);
    const defaultColor = 'red';
    const leds = [[]];
    let GAP = 2;
    let SQUARE_SIZE = 15;
    let ROWS_COUNT = 50;
    let COLUMNS_COUNT = 12;
    let LED_TYPE = 'WS2812B';
    //REMOVE THIS
    inputColumnCount.value = COLUMNS_COUNT.toString();
    inputRowCount.value = ROWS_COUNT.toString();
    //END REMOVE THIS
    fillLeds(leds, defaultColor);
    previewLeds();
    ws.binaryType = 'arraybuffer';
    ws.onerror = (event) => {
        throw new Error(`WebSocket Error: ${event}`);
    };
    ws.onclose = (event) => {
        throw new Error(`WebSocket connection closed: ${event}`);
    };
    ws.onmessage = (event) => {
        inputColumnCount.value = COLUMNS_COUNT.toString();
        inputRowCount.value = ROWS_COUNT.toString();
    };
    saveButton === null || saveButton === void 0 ? void 0 : saveButton.addEventListener('click', handleSave);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('touchmove', handlePointerMove);
    function handlePointerMove(event) {
        event.preventDefault();
        const { x, y } = getPointerCoordinates(canvas, event);
        const col = Math.floor((x - (canvasWidth - COLUMNS_COUNT * (SQUARE_SIZE + GAP)) / 2) / (SQUARE_SIZE + GAP));
        const row = Math.floor((y - (canvasHeight - ROWS_COUNT * (SQUARE_SIZE + GAP)) / 2) / (SQUARE_SIZE + GAP));
        if (col >= 0 && col < COLUMNS_COUNT && row >= 0 && row < ROWS_COUNT) {
            if (lableCoords === null)
                throw new Error('lableCoords ctx is null');
            lableCoords.textContent = `Координаты: X:${row.toString().padStart(2, '0')} : Y:${col.toString().padStart(2, '0')}`;
        }
    }
    function previewLeds() {
        if (ctx === null)
            return;
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
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
                throw new Error("SQUARE_SIZE <= 0");
        }
        for (let col = 0; col < COLUMNS_COUNT; col++) {
            for (let row = 0; row < ROWS_COUNT; row++) {
                const x = col * (SQUARE_SIZE + GAP) + (canvasWidth - COLUMNS_COUNT * (SQUARE_SIZE + GAP)) / 2;
                const y = row * (SQUARE_SIZE + GAP) + (canvasHeight - ROWS_COUNT * (SQUARE_SIZE + GAP)) / 2;
                ctx.fillStyle = defaultColor;
                ctx.fillRect(x, y, SQUARE_SIZE, SQUARE_SIZE);
            }
        }
    }
    function handleSave(ev) {
        const rowCount = parseInt(inputRowCount === null || inputRowCount === void 0 ? void 0 : inputRowCount.value, 10);
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
        const buffer = new Uint8Array([
            0,
            ROWS_COUNT,
            COLUMNS_COUNT
        ]);
        const dataView = new DataView(buffer.buffer);
        dataView.setUint8(0, MessageType.Settings);
        ws.send(buffer);
        previewLeds();
    }
    function fillLeds(leds, colorHex) {
        for (let col = 0; col < COLUMNS_COUNT; col++) {
            leds[col] = [];
            for (let row = 0; row < ROWS_COUNT; row++) {
                leds[col][row] = colorHex;
            }
        }
    }
})();
