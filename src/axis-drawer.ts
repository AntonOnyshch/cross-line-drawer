export enum DrawReason {
    Unknown,
    Connected,
    Resize,
    ColorChanged,
    CoorsChanged,
    AngleChanged,
    AttributeChanged
}
type Coords = {
    x: number,
    y: number
}
type LineCoords = {
    from: Coords,
    to: Coords
}
type LineGeometry = {
    sine: number,
    cosine: number,
    tan: number,
    cotn: number
    radian: number
}
export type AxisMovedArgs = {
    byUser: boolean,
    calledBy: DrawReason
    layerName: number | string,
    coords: Coords,
    vGeometry: LineGeometry,
    hGeometry: LineGeometry
}
export class AxisDrawer extends HTMLElement {

    private ctx: CanvasRenderingContext2D;

    private layerName: number | string;
    private vName: number | string;
    private vColor: string = 'pink';
    private hName: number | string;
    private hColor: string = 'crimson';

    private offsetCoords: Coords = {x: 0, y: 0};

    private widthRatio: number;
    private heightRatio: number;

    private inScope: boolean;

    private vLineGeometry = {sine: 1, cosine: 0, tan: 1, cotn: 0, radian: 0};
    private hLineGeometry = {sine: 0, cosine: 1, tan: 0, cotn: 1, radian: 0};

    private vCoors: LineCoords;
    private hCoors: LineCoords;

    private anchorCoords: Coords = {x: 0, y: 0};
    private anchorSource: 'horizontal' | 'vertical' | 'none' = 'none';

    private axisMovedArgs: AxisMovedArgs = { 
        byUser: false, calledBy: DrawReason.Unknown, coords: {x: 0, y: 0}, layerName: '', vGeometry: this.vLineGeometry, hGeometry: this.hLineGeometry 
    }
    private axisMovedEvent: CustomEvent<AxisMovedArgs> = new CustomEvent('onAxisMoved', {bubbles: true, detail: this.axisMovedArgs});

    private mouseParams = {
        isLMDown: false,
        lastX: 0,
        lastY: 0
    }

    private mouseMovedTime = 0;

    private onResizeFunc: () => void;
    private drawCrossLine: (vCoors: LineCoords, hCoors: LineCoords) => void;

    constructor() {
        super();

        this.attachShadow({mode: 'open'});

        this.ctx = document.createElement('canvas').getContext('2d', {alpha: true}) as CanvasRenderingContext2D;

        this.onResizeFunc = onResize(this.ctx.canvas);

        const style = document.createElement('style');
        style.textContent = `
        canvas {
            width: 100%;
            height: 100%;
            position: absolute;
        }
        `;

        this.shadowRoot?.append(style, this.ctx.canvas);
    }

    connectedCallback() {
        this.drawCrossLine = drawCrossLine(this.ctx)(this.vColor, this.hColor);
        window.addEventListener('resize', this.onResize.bind(this));
        this.onResizeFunc();

        this.ctx.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.ctx.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.ctx.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    }

    disconnectedCallback() {
        window.removeEventListener('resize', this.onResize);

        this.ctx.canvas.removeEventListener('mousedown', this.onMouseDown);
        this.ctx.canvas.removeEventListener('mouseup', this.onMouseUp);
        this.ctx.canvas.removeEventListener('mousemove', this.onMouseMove);
    }

    private onResize(e) {
        this.onResizeFunc();
        this.internalDraw(this.ctx.canvas.width * this.widthRatio, this.ctx.canvas.height * this.heightRatio, DrawReason.Resize);
    }

    private onMouseDown(e) {
        this.mouseParams = { isLMDown: e.button === 0, lastX: e.offsetX, lastY: e.offsetY }
    }
    private onMouseUp(e) {
        this.mouseParams = { isLMDown: e.button === 0 ? false : this.mouseParams.isLMDown, lastX: e.offsetX, lastY: e.offsetY }
    }
    private onMouseMove(e) {
        if(Date.now() - this.mouseMovedTime < 25) {
            return;
        } else {
            this.mouseMovedTime = Date.now();
        }

        if(this.mouseParams.isLMDown) {
            if(this.inScope) {
                this.internalDraw((e.offsetX - this.mouseParams.lastX) + this.offsetCoords.x, (e.offsetY - this.mouseParams.lastY) + this.offsetCoords.y, DrawReason.CoorsChanged, true);
                this.mouseParams.lastX = e.offsetX;
                this.mouseParams.lastY = e.offsetY;
            } else {
                this.vLineGeometry = getGeometryFromPoint(this.offsetCoords, {x: e.offsetX, y: e.offsetY});
                const rotatedPoint = rotatePoint({ x: e.offsetX, y: e.offsetY }, 1.5708, this.offsetCoords);
                this.hLineGeometry = getGeometryFromPoint(this.offsetCoords, rotatedPoint);
                this.internalDraw(this.offsetCoords.x, this.offsetCoords.y, DrawReason.AngleChanged, true);

                this.axisMovedArgs.byUser = true;
                this.axisMovedArgs.calledBy = DrawReason.CoorsChanged;
                this.axisMovedArgs.coords = {x: this.offsetCoords.x, y: this.offsetCoords.y};
                this.axisMovedArgs.layerName = this.layerName;
        
                this.ctx.canvas.dispatchEvent(this.axisMovedEvent);
            }
        } else {
            this.inScope = e.offsetX < this.offsetCoords.x + 30 && 
                            e.offsetX > this.offsetCoords.x - 30 && 
                            e.offsetY < this.offsetCoords.y + 30 && 
                            e.offsetY > this.offsetCoords.y - 30;

            if(this.inScope) {
                if(this.ctx.canvas.style.cursor !== 'grab') {
                    this.ctx.canvas.style.cursor = 'grab';
                }
            } else {
                if(this.ctx.canvas.style.cursor !== 'default') {
                    this.ctx.canvas.style.cursor = 'default';
                }
            }
        }
    }

    public draw(cX: number, cY: number, calledBy: DrawReason = DrawReason.Unknown) {
        this.internalDraw(cX, cY, calledBy, true);
    }

    private internalDraw(cX: number, cY: number, calledBy: DrawReason = DrawReason.Unknown, resetAnchor: boolean = false) {
        this.offsetCoords.x = Math.round(cX);
        this.offsetCoords.y = Math.round(cY);

        this.computeRatio();

        if(resetAnchor) {
            this.setAnchorCoords();
            this.anchorSource == 'none';
        }

        this.vCoors = findCoords(this.offsetCoords, this.vLineGeometry.tan, this.vLineGeometry.cotn, [this.ctx.canvas.width, this.ctx.canvas.height]);
        this.hCoors = findCoords(this.offsetCoords, this.hLineGeometry.tan, this.hLineGeometry.cotn, [this.ctx.canvas.width, this.ctx.canvas.height]);

        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        this.drawCrossLine(this.vCoors, this.hCoors);
        drawDot(this.ctx, this.offsetCoords);

        this.fillAxisMovedArgs(calledBy);

        window.dispatchEvent(this.axisMovedEvent);
    }

    private computeRatio() {
        this.widthRatio = this.offsetCoords.x / this.ctx.canvas.width;
        this.heightRatio = this.offsetCoords.y / this.ctx.canvas.height;
    }

    private setAnchorCoords() {
        this.anchorCoords.x = this.offsetCoords.x;
        this.anchorCoords.y = this.offsetCoords.y;
    }

    private fillAxisMovedArgs(calledBy: DrawReason) {
        this.axisMovedArgs.byUser = calledBy === DrawReason.CoorsChanged || calledBy === DrawReason.AngleChanged;
        this.axisMovedArgs.calledBy = calledBy;
        this.axisMovedArgs.coords = {x: this.offsetCoords.x, y: this.offsetCoords.y},
        this.axisMovedArgs.layerName = this.layerName;
        this.axisMovedArgs.vGeometry = this.vLineGeometry;
        this.axisMovedArgs.hGeometry = this.hLineGeometry;
    }

    set layername(newvalue: number | string) {
        this.layerName = newvalue;
    }
    set vname(newvalue: number | string) {
        this.vName = newvalue;
    }
    set vcolor(newvalue: string) {
        this.vColor = newvalue;
        this.drawCrossLine = drawCrossLine(this.ctx)(this.vColor, this.hColor);
        this.internalDraw(this.offsetCoords.x, this.offsetCoords.y, DrawReason.ColorChanged)
    }
    set hname(newvalue: number | string) {
        this.hName = newvalue;
    }
    set hcolor(newvalue: string) {
        this.hColor = newvalue;
        this.drawCrossLine = drawCrossLine(this.ctx)(this.vColor, this.hColor);
    }

    set x(newvalue: number) {
        if(this.anchorSource === 'none' || this.anchorSource === 'horizontal') {
            this.setAnchorCoords();
            this.anchorSource = 'vertical';
        }
        const rotatedPoint = rotatePoint(
            {x: newvalue, 
            y: this.anchorCoords.y},
            -this.hLineGeometry.radian, 
            this.anchorCoords
            );
        if(this.offsetCoords.y) {
            this.internalDraw(rotatedPoint.x, rotatedPoint.y, DrawReason.AttributeChanged, false);
        }
    }

    set y(newvalue: number) {
        if(this.anchorSource === 'none' || this.anchorSource === 'vertical') {
            this.setAnchorCoords();
            this.anchorSource = 'horizontal';
        }
        const rotatedPoint = rotatePoint(
            {x: this.anchorCoords.x, 
            y: newvalue}, 
            -this.hLineGeometry.radian, 
            this.anchorCoords
            );
        if(this.offsetCoords.x) {
            this.internalDraw(rotatedPoint.x, rotatedPoint.y, DrawReason.AttributeChanged, false);
        }
    }

    get width() {
        return this.ctx.canvas.width;
    }
    get height() {
        return this.ctx.canvas.height;
    }
    static get observedAttributes() {
        return ['layername', 'vname', 'vcolor', 'hname', 'hcolor', 'x', 'y'];
    }

    attributeChangedCallback(name, oldVal, newVal: string | number) {
        switch (name) {
            case 'layername': {
                this.layername = newVal;
            } break;
            case 'vname': {
                this.vname = newVal;
            } break;
            case 'vcolor': {
                if(oldVal === null) {
                    this.vColor = newVal.toString();
                } else {
                    this.vcolor = newVal.toString();
                }
            } break;
            case 'hname': {
                this.hname = newVal;
            } break;
            case 'hcolor': {
                if(oldVal === null) {
                    this.hColor = newVal.toString();
                } else {
                    this.hcolor = newVal.toString();
                }
            } break;
            case 'x': {
                this.x = +newVal;
            } break;
            case 'y': {
                this.y = +newVal;
            } break;
            default:
                break;
        }
    }
}

function onResize(canvas: HTMLCanvasElement) {
    return function() {
        const style = getComputedStyle(canvas);
        const width = +style.width.split('px')[0];
        const height = +style.height.split('px')[0];
        canvas.width = width;
        canvas.height = height;
    }
}

function getGeometryFromPoint(cOffset: Coords, pOffset: Coords): LineGeometry {
    const adjacentCat = pOffset.x - cOffset.x;
    const oppositeCat = cOffset.y - pOffset.y;
    const hypoth = Math.hypot(adjacentCat, oppositeCat);

    return {
        sine: oppositeCat / hypoth, 
        cosine: adjacentCat / hypoth, 
        tan: oppositeCat / adjacentCat, 
        cotn: adjacentCat / oppositeCat,
        radian: Math.atan2(cOffset.x - pOffset.x, cOffset.y - pOffset.y) + 1.5708
    };
}

const rotateX = (x: number, y: number, a: number) => Math.round(x*Math.cos(a) - y*Math.sin(a));
const rotateY = (x: number, y: number, a: number) => Math.round(x*Math.sin(a) + y*Math.cos(a));
function rotatePoint(pOffset: Coords, a: number, cOffset: Coords) {
    return {
        x: rotateX(pOffset.x - cOffset.x, pOffset.y - cOffset.y, a) + cOffset.x,
        y: rotateY(pOffset.x - cOffset.x, pOffset.y - cOffset.y, a) + cOffset.y
    }
}
function findCoords(offset: Coords, tan = 0, cotn = 0, size = [0, 0]): LineCoords {
    let coords: LineCoords;
    
    if(tan >= 0) {
        if(tan >= 1) {
            coords = {
                from: {x: offset.x + offset.y * cotn, y: 0},
                to: {x: offset.x - (size[1] - offset.y) * cotn, y: size[1]}
            }
            //coords.push(offset.x + offset.y * cotn, 0, offset.x - (size[1] - offset.y) * cotn, size[1]);
        } else {
            coords = {
                from: {x: size[0], y: offset.y - (size[0] - offset.x) * tan},
                to: {x: 0, y: offset.y + offset.x * tan}
            }
            //coords.push(size[0], offset.y - (size[0] - offset.x) * tan, 0, offset.y + offset.x * tan);
        }
    } else {
        if(tan <= -1) {
            coords = {
                from: {x: offset.x - offset.y * Math.abs(cotn), y: 0},
                to: {x: offset.x + (size[1] - offset.y) * Math.abs(cotn), y: size[1]}
            }
            //coords.push(offset.x - offset.y * Math.abs(cotn), 0, offset.x + (size[1] - offset.y) * Math.abs(cotn), size[1]);
        } else {
            coords = {
                from: {x: 0, y: offset.y - offset.x * Math.abs(tan)},
                to: {x: size[0], y: offset.y + (size[0] - offset.x) * Math.abs(tan)}
            }
            //coords.push(0, offset.y - offset.x * Math.abs(tan), size[0], offset.y + (size[0] - offset.x) * Math.abs(tan));
        }
    }
    // coords[0] = Math.round(coords[0]);
    // coords[1] = Math.round(coords[1]);
    // coords[2] = Math.round(coords[2]);
    // coords[3] = Math.round(coords[3]);
    coords.from.x = Math.round(coords.from.x);
    coords.from.y = Math.round(coords.from.y);
    coords.to.x = Math.round(coords.to.x);
    coords.to.y = Math.round(coords.to.y);
    return coords;
}

function drawDot(ctx: CanvasRenderingContext2D, offset: Coords) {
    ctx.fillStyle = 'green';
    ctx.clearRect(offset.x - 30, offset.y - 30, 60, 60);
    ctx.fillRect(offset.x - 2, offset.y - 2, 2, 2);
}

function drawCrossLine(ctx: CanvasRenderingContext2D) {
    return function(vColor: string, hColor: string) {
        return function(vCoors: LineCoords, hCoors: LineCoords) {
            ctx.strokeStyle = vColor;
            ctx.beginPath();
            ctx.moveTo(vCoors.from.x, vCoors.from.y);
            ctx.lineTo(vCoors.to.x, vCoors.to.y);
            ctx.stroke();
    
            ctx.strokeStyle = hColor;
            ctx.beginPath();
            ctx.moveTo(hCoors.from.x, hCoors.from.y);
            ctx.lineTo(hCoors.to.x, hCoors.to.y);
            ctx.stroke();
        }
    }
}