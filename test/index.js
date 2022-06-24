import { AxisDrawer, DrawReason } from './src/axis-drawer.js';
customElements.define('axis-drawer', AxisDrawer);
let drawer;
let x, y;
let rangeY;
let rangeX;
function start() {
    drawer = document.getElementById('axis');
    rangeY = document.getElementById('rangeByY');
    rangeX = document.getElementById('rangeByX');
    window.addEventListener('onAxisMoved', onAxisMoved);
    rangeY.addEventListener('input', onRangeYInput);
    rangeX.addEventListener('input', onRangeXInput);
    x = Math.round(drawer.width / 2);
    y = Math.round(drawer.height / 2);
    drawer.draw(x, y);
    rangeY.max = drawer.height.toString();
    rangeY.value = Math.round(drawer.height / 2).toString();
    rangeX.max = drawer.width.toString();
    rangeX.value = Math.round(drawer.width / 2).toString();
}
function onAxisMoved(e) {
    const args = e.detail;
    if (args.byUser || args.calledBy === DrawReason.AttributeChanged) {
        rangeX.value = args.coords.x.toString();
        rangeY.value = args.coords.y.toString();
    }
    else if (args.calledBy === DrawReason.Resize) {
        rangeY.max = drawer.height.toString();
        rangeX.max = drawer.width.toString();
        rangeX.value = args.coords.x.toString();
        rangeY.value = args.coords.y.toString();
    }
}
function onRangeYInput(e) {
    y = +e.currentTarget.value;
    drawer.setAttribute('y', y.toString());
}
function onRangeXInput(e) {
    x = +e.currentTarget.value;
    drawer.setAttribute('x', x.toString());
}
start();
//# sourceMappingURL=index.js.map