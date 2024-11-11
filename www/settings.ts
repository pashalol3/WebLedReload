(() => {
    const saveButton = document.getElementById("bSave");
    const inputColumnCount = document.getElementById("columnCount") as HTMLInputElement;;
    const inputRowCount = document.getElementById("rowCount") as HTMLInputElement;
    const ledTypeSelect = document.getElementById("ledType") as HTMLSelectElement;

    const canvas = document.getElementById("myCanvas") as HTMLCanvasElement;
    const ctx = canvas?.getContext('2d');
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const backgroundColor = '#181818';

    const wsAddress = `ws://${window.location.hostname}/socket`;
    const ws: WebSocket = new WebSocket(wsAddress);
    const defaultColor = 'red';
    const leds: string[][] = [[]];

    let GAP = 2;
    let SQUARE_SIZE = 15;

    let ROWS_COUNT = 50;
    let COLUMNS_COUNT = 12;
    let LED_TYPE = 'WS2812B';
    
    //REMOVE THIS
    ledTypeSelect.value = LED_TYPE;
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
    }
    ws.onmessage = (event) => {
        ledTypeSelect.value = LED_TYPE;
        inputColumnCount.value = COLUMNS_COUNT.toString();
        inputRowCount.value = ROWS_COUNT.toString();
    }

    saveButton?.addEventListener('click', handleSave);

    function previewLeds() {
        if (ctx === null)
            return;
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0,0,canvasWidth ,canvasHeight)

        while ( ROWS_COUNT * (SQUARE_SIZE + GAP) >= canvasHeight ||
                COLUMNS_COUNT * (SQUARE_SIZE + GAP) >= canvasWidth) {
            SQUARE_SIZE--;
            if(SQUARE_SIZE <= 0)
                throw new Error("SQUARE_SIZE <= 0")
        }
       
        for (let col = 0; col < COLUMNS_COUNT; col++) {
            for (let row = 0; row < ROWS_COUNT; row++) {
                const x = col * (SQUARE_SIZE + GAP) + (canvasWidth - COLUMNS_COUNT * (SQUARE_SIZE + GAP)) / 2;
                const y = row * (SQUARE_SIZE + GAP) + (canvasHeight - ROWS_COUNT * (SQUARE_SIZE + GAP)) / 2;
                ctx.fillStyle = defaultColor;
                ctx.fillRect(x, y, SQUARE_SIZE, SQUARE_SIZE);
            }
        }
        for (let col = 0; col < COLUMNS_COUNT; col++){
            const x = col * (SQUARE_SIZE + GAP) + (canvasWidth - COLUMNS_COUNT * (SQUARE_SIZE + GAP)) / 2;

            ctx.fillStyle = 'white'
            ctx.font = '12px Calibri'
            ctx.fillText(`${col}`,x + 0.5*GAP,5*GAP);
        }
        for (let row = 0; row < ROWS_COUNT; row++){
            const y = row * (SQUARE_SIZE + GAP) + (canvasHeight - ROWS_COUNT * (SQUARE_SIZE + GAP)) / 2;

            ctx.fillStyle = 'white'
            ctx.font = '12px Calibri'
            ctx.fillText(`${row}`,canvasWidth / 2 - COLUMNS_COUNT * (1.5*GAP + SQUARE_SIZE / 2),y+6*GAP);
        }
    }
    function handleSave(ev: MouseEvent) {
        const ledType = ledTypeSelect?.value;
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
        LED_TYPE = ledType;
        ROWS_COUNT = rowCount;
        COLUMNS_COUNT = columnCount;
        previewLeds();
        console.log(`lt:${ledType} rc:${rowCount} cc:${columnCount}`)
    }
    function fillLeds(leds: string[][], colorHex: string): void {
        for (let col = 0; col < COLUMNS_COUNT; col++) {
            leds[col] = [];
            for (let row = 0; row < ROWS_COUNT; row++) {
                leds[col][row] = colorHex;
            }
        }
    }

})();


