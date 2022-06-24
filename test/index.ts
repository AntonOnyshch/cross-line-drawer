import {AxisDrawer, AxisMovedArgs, DrawReason } from './src/axis-drawer.js';
customElements.define('axis-drawer', AxisDrawer);
let drawer: AxisDrawer;
let x: number, y: number;
let rangeY: HTMLInputElement;
let rangeX: HTMLInputElement;
function start() {
    drawer = document.getElementById('axis') as AxisDrawer;
    rangeY = document.getElementById('rangeByY') as HTMLInputElement;
    rangeX = document.getElementById('rangeByX') as HTMLInputElement;
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

function onAxisMoved(e: CustomEventInit<AxisMovedArgs>) {
    const args = e.detail as AxisMovedArgs;
    if(args.byUser || args.calledBy === DrawReason.AttributeChanged) {
        rangeX.value = args.coords.x.toString();
        rangeY.value = args.coords.y.toString();
    } else if(args.calledBy === DrawReason.Resize) {
        rangeY.max = drawer.height.toString();
        rangeX.max = drawer.width.toString();
        rangeX.value = args.coords.x.toString();
        rangeY.value = args.coords.y.toString();
    }
}

function onRangeYInput(e: InputEvent) {
    y = +(e.currentTarget as HTMLInputElement).value;
    drawer.setAttribute('y', y.toString());
}
function onRangeXInput(e: InputEvent) {
    x = +(e.currentTarget as HTMLInputElement).value;
    drawer.setAttribute('x', x.toString());
}
start();