//Это сгенерировано нейросетью. Есть ошибки
(function () {
    var Point = /** @class */ (function () {
        function Point(x, y) {
            this.x = x;
            this.y = y;
        }
        Point.prototype.equals = function (other) {
            return this.x === other.x && this.y === other.y;
        };
        Point.fromXY = function (x, y) {
            return new Point(x, y);
        };
        Point.zero = function () {
            return new Point(0, 0);
        };
        return Point;
    }());
    var MessageType;
    (function (MessageType) {
        MessageType[MessageType["InitialState"] = 1073741824] = "InitialState";
        MessageType[MessageType["SetPoints"] = 536870912] = "SetPoints";
        MessageType[MessageType["FillSolid"] = 268435456] = "FillSolid";
    })(MessageType || (MessageType = {}));
    var isPointerDown = false;
    var COLUMNS_COUNT = 12;
    var ROWS_COUNT = 50;
    var GAP = 2;
    var SQUARE_SIZE = 12;
    var canvas = document.getElementById('myCanvas');
    var ctx = canvas.getContext('2d');
    var canvasWidth = canvas.width;
    var canvasHeight = canvas.height;
    var defaultLedValue = 'undefined';
    var changedLeds = [[]];
    fillLeds(changedLeds, defaultLedValue);
    var leds = [[]];
    var currentColor = '#ff0000';
    function fillLeds(leds, colorHex) {
        for (var col = 0; col < COLUMNS_COUNT; col++) {
            leds[col] = [];
            for (var row = 0; row < ROWS_COUNT; row++) {
                leds[col][row] = colorHex;
            }
        }
    }
    var UINT32toRGB = function (uint32) {
        var r = (uint32 >> 16) & 0xFF;
        var g = (uint32 >> 8) & 0xFF;
        var b = (uint32 & 0xFF);
        return { r: r, g: g, b: b };
    };
    var HEXtoRGB = function (colorHex) {
        var r = parseInt(colorHex.slice(1, 3), 16);
        var g = parseInt(colorHex.slice(3, 5), 16);
        var b = parseInt(colorHex.slice(5, 7), 16);
        return { r: r, g: g, b: b };
    };
    var RGBtoHEX = function (r, g, b) {
        var toHex = function (value) {
            return value.toString(16).padStart(2, '0');
        };
        return "#".concat(toHex(r)).concat(toHex(g)).concat(toHex(b));
    };
    var wsAddress = "ws://".concat(window.location.hostname, "/socket");
    var ws = new WebSocket(wsAddress);
    ws.binaryType = 'arraybuffer';
    ws.onerror = function (event) {
        throw new Error("WebSocket Error: ".concat(event));
    };
    ws.onclose = function (event) {
        throw new Error("WebSocket connection closed: ".concat(event));
    };
    ws.onmessage = function (event) {
        if (event.data instanceof ArrayBuffer) {
            var arrayBuffer = event.data;
            var dataView = new DataView(arrayBuffer);
            var msgType = dataView.getUint32(0);
            //[msgType][msgType][msgType][msgType][payload]
            //    0        1        2        3     .......
            switch (msgType) {
                case MessageType.InitialState: {
                    var slicedBuffer = arrayBuffer.slice(4);
                    var uint32Array = new Uint32Array(slicedBuffer);
                    for (var i = 0; i < uint32Array.length; i++) {
                        var x = i % COLUMNS_COUNT;
                        var y = Math.floor(i / COLUMNS_COUNT);
                        var _a = UINT32toRGB(uint32Array[i]), r = _a.r, g = _a.g, b = _a.b;
                        var hexColor = RGBtoHEX(r, g, b);
                        leds[x][y] = hexColor;
                    }
                    break;
                }
                case MessageType.SetPoints: {
                    //    0        1        2        3     4  5  .  .  .  .  N-4   N-3   N-2    N-1
                    //[msgType][msgType][msgType][msgType][x][y][x][y][x][y][red][green][blue][alpha]
                    var len = arrayBuffer.byteLength;
                    var uint8Array = new Uint8Array(arrayBuffer);
                    var HEAD_SIZE = 4;
                    var COLOR_SIZE = 4;
                    var pointsCount = (len - HEAD_SIZE - COLOR_SIZE) / 2;
                    var r = dataView.getUint8(len - 4);
                    var g = dataView.getUint8(len - 3);
                    var b = dataView.getUint8(len - 2);
                    var color = RGBtoHEX(r, g, b);
                    for (var i = 0; i < pointsCount; ++i) {
                        var x = dataView.getUint8(HEAD_SIZE + i * 2);
                        var y = dataView.getUint8(HEAD_SIZE + i * 2 + 1);
                        leds[x][y] = color;
                    }
                    break;
                }
                case MessageType.FillSolid: {
                    //                                       r      g      b    alpha
                    //[msgType][msgType][msgType][msgType][color][color][color][color]
                    //    0        1        2        3       4      5      6      7
                    var r = dataView.getUint8(4);
                    var g = dataView.getUint8(5);
                    var b = dataView.getUint8(6);
                    var color = RGBtoHEX(r, g, b);
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
    var drawSquares = function () {
        for (var col = 0; col < COLUMNS_COUNT; col++) {
            for (var row = 0; row < ROWS_COUNT; row++) {
                var x = col * (SQUARE_SIZE + GAP) + (canvasWidth - COLUMNS_COUNT * (SQUARE_SIZE + GAP)) / 2;
                var y = row * (SQUARE_SIZE + GAP) + (canvasHeight - ROWS_COUNT * (SQUARE_SIZE + GAP)) / 2;
                ctx.fillStyle = leds[col][row];
                ctx.fillRect(x, y, SQUARE_SIZE, SQUARE_SIZE);
            }
        }
    };
    var getPointerCoordinates = function (event) {
        var rect = canvas.getBoundingClientRect();
        var x = 'clientX' in event ? event.clientX - rect.left : event.touches[0].clientX - rect.left;
        var y = 'clientY' in event ? event.clientY - rect.top : event.touches[0].clientY - rect.top;
        return Point.fromXY(x, y);
    };
    //TODO: Handle error
    var ledStateSwitchCallback = function (changedLeds, colorHex) {
        //                                             r      g      b    alpha
        //[msgType][msgType][msgType][msgType][x][y][color][color][color][color]
        //    0        1        2         3    4  5    6      7      8     
        var ledsCoords = [];
        for (var col = 0; col < COLUMNS_COUNT; col++) {
            for (var row = 0; row < ROWS_COUNT; row++) {
                if (changedLeds[col][row] != defaultLedValue) {
                    ledsCoords.push(Point.fromXY(col, row));
                }
            }
        }
        //    0        1        2        3     4  5  .  .  .  .  N-4   N-3   N-2    N-1
        //[msgType][msgType][msgType][msgType][x][y][x][y][x][y][red][green][blue][alpha]
        //[head][head][head][head] [n points] [n points] [r] [g] [b] [a]
        var u8BufferLen = 4 + ledsCoords.length * 2 + 4;
        var u8buffer = new Uint8Array(u8BufferLen);
        var bytesOffset = 4;
        var u8bufferDataView = new DataView(u8buffer.buffer);
        for (var i = 0; i < ledsCoords.length; i++) {
            var point = ledsCoords[i];
            u8bufferDataView.setUint8(bytesOffset++, point.x);
            u8bufferDataView.setUint8(bytesOffset++, point.y);
        }
        u8bufferDataView.setUint32(0, MessageType.SetPoints, false);
        var _a = HEXtoRGB(colorHex), r = _a.r, g = _a.g, b = _a.b;
        u8bufferDataView.setUint8(bytesOffset++, r);
        u8bufferDataView.setUint8(bytesOffset++, g);
        u8bufferDataView.setUint8(bytesOffset++, b);
        u8bufferDataView.setUint8(bytesOffset++, 255);
        ws.send(u8bufferDataView);
    };
    var handlePointerMove = function (event) {
        if (isPointerDown) {
            event.preventDefault();
            var _a = getPointerCoordinates(event), x = _a.x, y = _a.y;
            var col = Math.floor((x - (canvasWidth - COLUMNS_COUNT * (SQUARE_SIZE + GAP)) / 2) / (SQUARE_SIZE + GAP));
            var row = Math.floor((y - (canvasHeight - ROWS_COUNT * (SQUARE_SIZE + GAP)) / 2) / (SQUARE_SIZE + GAP));
            if (col >= 0 && col < COLUMNS_COUNT && row >= 0 && row < ROWS_COUNT) {
                changedLeds[col][row] = currentColor;
                leds[col][row] = currentColor;
            }
        }
    };
    var handlePointerDown = function (event) {
        var _a = getPointerCoordinates(event), x = _a.x, y = _a.y;
        if (y < panelHeight) {
            var pixel = ctx.getImageData(x, y, 1, 1).data;
            currentColor = RGBtoHEX(pixel[0], pixel[1], pixel[2]);
        }
        if (y > 1.5 * panelHeight && y < 2 * panelHeight * 1.5) {
            var _b = HEXtoRGB(currentColor), r = _b.r, g = _b.g, b = _b.b;
            var buffer = new Uint8Array([
                0,
                0,
                0,
                0,
                r,
                g,
                b,
                255,
            ]);
            var dataView = new DataView(buffer.buffer);
            dataView.setUint32(0, MessageType.FillSolid, false);
            ws.send(buffer);
            fillLeds(leds, currentColor);
        }
        var col = Math.floor((x - (canvasWidth - COLUMNS_COUNT * (SQUARE_SIZE + GAP)) / 2) / (SQUARE_SIZE + GAP));
        var row = Math.floor((y - (canvasHeight - ROWS_COUNT * (SQUARE_SIZE + GAP)) / 2) / (SQUARE_SIZE + GAP));
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
    var panelHeight = 30;
    var drawColorPalette = function () {
        var gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
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
    };
    var drawCurrentColor = function () {
        ctx.fillStyle = currentColor;
        ctx.fillRect(0, panelHeight + 10, canvas.width, panelHeight);
        var r = 255 - parseInt(currentColor.slice(1, 3), 16);
        var g = 255 - parseInt(currentColor.slice(3, 5), 16);
        var b = 255 - parseInt(currentColor.slice(5, 7), 16);
        var invertedColor = "#".concat(r.toString(16).padStart(2, '0')).concat(g.toString(16).padStart(2, '0')).concat(b.toString(16).padStart(2, '0'));
        ctx.fillStyle = invertedColor;
        ctx.textAlign = 'center';
        ctx.font = "32px Verdana";
        ctx.fillText('ТЕКУЩИЙ ЦВЕТ', canvas.width / 2, panelHeight * 2.2);
    };
    var startAnimation = function () {
        drawSquares();
        drawColorPalette();
        drawCurrentColor();
        requestAnimationFrame(startAnimation);
    };
    fillLeds(leds, '000000');
    startAnimation();
})();
