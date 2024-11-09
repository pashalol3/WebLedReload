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
    var colors = {
        on: '#00FF00',
        off: '#FF0000'
    };
    var lastPoint = Point.zero();
    var isPointerDown = false;
    var COLUMNS_COUNT = 12;
    var ROWS_COUNT = 50;
    var GAP = 2;
    var SQUARE_SIZE = 10;
    var canvas = document.getElementById('myCanvas');
    var ctx = canvas.getContext('2d');
    var canvasWidth = canvas.width;
    var canvasHeight = canvas.height;
    var squaresState = [];
    var changedSquares = new Set();
    for (var col = 0; col < COLUMNS_COUNT; col++) {
        squaresState[col] = [];
        for (var row = 0; row < ROWS_COUNT; row++) {
            squaresState[col][row] = false;
        }
    }
    var wsAddress = "ws://".concat(window.location.hostname, "/socket");
    var ws = new WebSocket(wsAddress);
    ws.onmessage = function (event) {
        if (typeof event.data === 'string') {
            for (var idx = 0; idx < event.data.length; idx++) {
                if (event.data[idx] == '1') {
                    var x = idx % COLUMNS_COUNT;
                    var y = Math.floor(idx / COLUMNS_COUNT);
                    squaresState[x][y] = true;
                }
            }
            console.log('Получено текстовое сообщение:', event.data);
        }
    };
    var drawSquares = function () {
        for (var col = 0; col < COLUMNS_COUNT; col++) {
            for (var row = 0; row < ROWS_COUNT; row++) {
                var x = col * (SQUARE_SIZE + GAP) + (canvasWidth - COLUMNS_COUNT * (SQUARE_SIZE + GAP)) / 2;
                var y = row * (SQUARE_SIZE + GAP) + (canvasHeight - ROWS_COUNT * (SQUARE_SIZE + GAP)) / 2;
                var color = squaresState[col][row] ? colors.on : colors.off;
                ctx.fillStyle = color;
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
    var ledStateSwitchCallback = function (point, status) {
        ws.send("".concat(point.x, ":").concat(point.y, " ").concat(status ? 1 : 0));
    };
    var handlePointerMove = function (event) {
        if (isPointerDown) {
            event.preventDefault();
            var _a = getPointerCoordinates(event), x = _a.x, y = _a.y;
            var col = Math.floor((x - (canvasWidth - COLUMNS_COUNT * (SQUARE_SIZE + GAP)) / 2) / (SQUARE_SIZE + GAP));
            var row = Math.floor((y - (canvasHeight - ROWS_COUNT * (SQUARE_SIZE + GAP)) / 2) / (SQUARE_SIZE + GAP));
            if (!(row === lastPoint.x && col === lastPoint.y)) {
                if (col >= 0 && col < COLUMNS_COUNT && row >= 0 && row < ROWS_COUNT) {
                    lastPoint.x = row;
                    lastPoint.y = col;
                    var point_1 = Point.fromXY(col, row);
                    if (!Array.from(changedSquares).some(function (p) { return p.equals(point_1); })) {
                        squaresState[col][row] = !squaresState[col][row];
                        ledStateSwitchCallback(Point.fromXY(col, row), squaresState[col][row]);
                        changedSquares.add(point_1);
                        drawSquares();
                    }
                }
            }
        }
    };
    var handlePointerDown = function (event) {
        var _a = getPointerCoordinates(event), x = _a.x, y = _a.y;
        var col = Math.floor((x - (canvasWidth - COLUMNS_COUNT * (SQUARE_SIZE + GAP)) / 2) / (SQUARE_SIZE + GAP));
        var row = Math.floor((y - (canvasHeight - ROWS_COUNT * (SQUARE_SIZE + GAP)) / 2) / (SQUARE_SIZE + GAP));
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
    };
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
    var startAnimation = function () {
        drawSquares();
        requestAnimationFrame(startAnimation);
    };
    startAnimation();
})();
