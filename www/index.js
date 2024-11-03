//Это сгенерировано нейросетью. Есть ошибки
var canvas = document.getElementById('myCanvas');
var ctx = canvas.getContext('2d');
var canvasWidth = canvas.width;
var canvasHeight = canvas.height;
var columns = 12;
var rows = 50;
var gap = 2;
var squareSize = 10;
var colors = {
    on: '#00FF00',
    off: '#FF0000'
};
var squaresState = [];
for (var col = 0; col < columns; col++) {
    squaresState[col] = [];
    for (var row = 0; row < rows; row++) {
        squaresState[col][row] = false;
    }
}
var Point = /** @class */ (function () {
    function Point(x, y) {
        this.x = x;
        this.y = y;
    }
    Point.prototype.equals = function (other) {
        return this.x === other.x && this.y === other.y;
    };
    return Point;
}());
var changedSquares = new Set();
var isPointerDown = false;
function drawSquares() {
    for (var col = 0; col < columns; col++) {
        for (var row = 0; row < rows; row++) {
            var x = col * (squareSize + gap) + (canvasWidth - columns * (squareSize + gap)) / 2;
            var y = row * (squareSize + gap) + (canvasHeight - rows * (squareSize + gap)) / 2;
            var color = squaresState[col][row] ? colors.on : colors.off;
            ctx.fillStyle = color;
            ctx.fillRect(x, y, squareSize, squareSize);
        }
    }
}
function getPointerCoordinates(event) {
    var rect = canvas.getBoundingClientRect();
    var x = 'clientX' in event ? event.clientX - rect.left : event.touches[0].clientX - rect.left;
    var y = 'clientY' in event ? event.clientY - rect.top : event.touches[0].clientY - rect.top;
    return { x: x, y: y };
}
function handlePointerMove(event) {
    if (isPointerDown) {
        event.preventDefault();
        var _a = getPointerCoordinates(event), x = _a.x, y = _a.y;
        var col = Math.floor((x - (canvasWidth - columns * (squareSize + gap)) / 2) / (squareSize + gap));
        var row = Math.floor((y - (canvasHeight - rows * (squareSize + gap)) / 2) / (squareSize + gap));
        if (col >= 0 && col < columns && row >= 0 && row < rows) {
            var point_1 = new Point(col, row);
            if (!Array.from(changedSquares).some(function (p) { return p.equals(point_1); })) {
                squaresState[col][row] = !squaresState[col][row];
                var callback = function (col, row, state) {
                    console.log("Square at (".concat(col, ", ").concat(row, ") is now ").concat(state ? 'on' : 'off'));
                };
                callback(col, row, squaresState[col][row]);
                changedSquares.add(point_1);
                drawSquares();
            }
        }
    }
}
function handlePointerDown(event) {
    var _a = getPointerCoordinates(event), x = _a.x, y = _a.y;
    var col = Math.floor((x - (canvasWidth - columns * (squareSize + gap)) / 2) / (squareSize + gap));
    var row = Math.floor((y - (canvasHeight - rows * (squareSize + gap)) / 2) / (squareSize + gap));
    if (col >= 0 && col < columns && row >= 0 && row < rows) {
        var point = new Point(col, row);
        if (!isPointerDown) {
            isPointerDown = true;
            squaresState[col][row] = !squaresState[col][row];
            var callback = function (col, row, state) {
                console.log("Square at (".concat(col, ", ").concat(row, ") is now ").concat(state ? 'on' : 'off'));
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
