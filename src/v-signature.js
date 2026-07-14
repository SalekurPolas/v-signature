// src/v-signature.js
class vSignature {
    constructor(input, config = {}) {
        this.inputSelector = input;
        
        // destructure configuration elements to separate them from flat options
        const {
            canvas = null,
            clear = null,
            save = null,
            undo = null,
            redo = null,
            options = {},
            onBegin = null,
            onEnd = null,
            ...flatOptions
        } = config;

        this.canvasSelector = canvas;
        this.clearSelector = clear;
        this.saveSelector = save;
        this.undoSelector = undo;
        this.redoSelector = redo;
        this.onBegin = onBegin;
        this.onEnd = onEnd;
        
        this.options = Object.assign({}, {
            width: '100%',
            height: '300px',
            color: '#000000',
            lineWidth: 2,
            backgroundColor: '#f2f2f2',
            border: '1px dashed #b3b3b3',
            borderRadius: '5px',
            disabled: false,
        }, flatOptions, options);

        // define minWidth and maxWidth if not set to enable variable-width fountain pen simulation
        this.options.minWidth = this.options.minWidth !== undefined ? this.options.minWidth : this.options.lineWidth;
        this.options.maxWidth = this.options.maxWidth !== undefined ? this.options.maxWidth : this.options.lineWidth;
        this.options.velocitySensitivity = this.options.velocitySensitivity !== undefined ? this.options.velocitySensitivity : 0.7;
    
        this.inputElement = null;
        this.canvasElement = null;
        this.clearButton = null;
        this.saveButton = null;
        this.undoButton = null;
        this.redoButton = null;
        this.onChange = null;
    
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.context = null;

        // vector stroke tracking for smoothing, undo/redo, resize redraw, and SVG
        this.strokes = [];
        this.currentStroke = [];
        this.redoStack = [];
    
        this.init();
    }

    // helper to resolve string selector or DOM element
    _resolveElement(target) {
        if (!target) return null;
        if (typeof HTMLElement !== 'undefined' && target instanceof HTMLElement) return target;
        
        // try querying the selector as-is
        let el = document.querySelector(target);

        if (!el) {
            // fallback for backwards compatibility if they passed raw class/id name without dot/hash
            el = document.querySelector(`.${target}`) || document.querySelector(`#${target}`);
        }

        return el;
    }

    init() {
        this.inputElement = this._resolveElement(this.inputSelector);
        this.canvasElement = this._resolveElement(this.canvasSelector);
        this.clearButton = this._resolveElement(this.clearSelector);
        this.saveButton = this._resolveElement(this.saveSelector);
        this.undoButton = this._resolveElement(this.undoSelector);
        this.redoButton = this._resolveElement(this.redoSelector);

        if (!this.inputElement) {
            console.warn('v-signature: Input element not found');
            return;
        }

        if (!this.canvasElement) {
            this.canvasElement = document.createElement('canvas');
            this.inputElement.parentNode.insertBefore(this.canvasElement, this.inputElement.nextSibling);
        }

        // apply styles
        this.canvasElement.style.width = this.canvasElement.style.width || this.options.width;
        this.canvasElement.style.height = this.canvasElement.style.height || this.options.height;
        this.canvasElement.style.border = this.canvasElement.style.border || this.options.border;
        this.canvasElement.style.borderRadius = this.canvasElement.style.borderRadius || this.options.borderRadius;
        this.canvasElement.style.backgroundColor = this.canvasElement.style.backgroundColor || this.options.backgroundColor;
        this.canvasElement.style.touchAction = 'none'; // prevent browser gestures/scrolling on the canvas

        this.inputElement.style.display = 'none';
        this.context = this.canvasElement.getContext('2d');

        // setup dimensions and support high-dpi/retina
        this.resize();

        // setup unified pointer events (handles mouse, touch, and pen)
        this.canvasElement.addEventListener('pointerdown', (e) => this.startDrawing(e));
        this.canvasElement.addEventListener('pointermove', (e) => this.draw(e));
        this.canvasElement.addEventListener('pointerup', () => this.stopDrawing());
        this.canvasElement.addEventListener('pointercancel', () => this.stopDrawing());
        
        // kept for backwards compatibility
        this.canvasElement.addEventListener('pointerleave', (e) => this.pauseDrawing(e));
        this.canvasElement.addEventListener('pointerenter', (e) => this.resumeDrawing(e));

        if (this.clearButton) {
            this.clearButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.clearCanvas();
            });
        }

        if (this.saveButton) {
            this.saveButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.toPNG();
            });
        }

        if (this.undoButton) {
            this.undoButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.undo();
            });
        }

        if (this.redoButton) {
            this.redoButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.redo();
            });
        }

        // setup window resize listener to keep layout crisp and redraw strokes dynamically
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', () => this.resize());
        }
    }

    resize() {
        if (!this.canvasElement) return;

        const rect = this.canvasElement.getBoundingClientRect();
        
        // prevent layout calculation issues if element is hidden initially (modal)
        const width = rect.width || parseFloat(this.options.width) || 300;
        const height = rect.height || parseFloat(this.options.height) || 150;
        const ratio = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
        
        // only update if dimensions actually changed (avoid clearing canvas on unnecessary resizing)
        if (this.canvasElement.width !== width * ratio || this.canvasElement.height !== height * ratio) {
            this.canvasElement.width = width * ratio;
            this.canvasElement.height = height * ratio;
            this.context.scale(ratio, ratio);

            // redraw signature vector strokes sharply
            this._redraw();
        }
    }

    pos(e) {
        const rect = this.canvasElement.getBoundingClientRect();
        // since we scale the context using ratios, we map coordinates relative to the CSS display box
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        return { x, y };
    }

    startDrawing(e) {
        if (this.options.disabled) return;
        this.isDrawing = true;
        
        // capture pointer events (crucial for smooth drawing outside boundaries)
        try {
            if (e.target && typeof e.target.setPointerCapture === 'function') {
                e.target.setPointerCapture(e.pointerId);
            }
        } catch (err) {
            // ignore if pointer capture fails
        }

        const position = this.pos(e);
        const point = { x: position.x, y: position.y, time: Date.now() };
        this.currentStroke = [point];
        [this.lastX, this.lastY] = [position.x, position.y];
        
        this.redoStack = [];
        this.lastWidth = (this.options.minWidth + this.options.maxWidth) / 2;

        if (this.onBegin) {
            this.onBegin(e);
        }
    }

    draw(e) {
        if (this.options.disabled || !this.isDrawing) return;

        const position = this.pos(e);
        const point = { x: position.x, y: position.y, time: Date.now() };
        this.currentStroke.push(point);

        this.context.lineCap = 'round';
        this.context.lineJoin = 'round';
        this.context.strokeStyle = this.options.color;

        const points = this.currentStroke;
        const len = points.length;

        // calculate dynamic line width based on velocity
        let lineWidth = this.options.lineWidth;
        if (this.options.minWidth !== this.options.maxWidth) {
            const lastPoint = points[len - 2];
            const dist = Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y);
            const timeDiff = point.time - lastPoint.time;
            const velocity = timeDiff > 0 ? dist / timeDiff : 0;
            
            // map velocity to thickness: higher velocity = thinner line
            const targetWidth = Math.max(
                this.options.minWidth,
                this.options.maxWidth - (velocity * this.options.velocitySensitivity)
            );

            // smooth changes using low-pass filter
            lineWidth = this.lastWidth * 0.7 + targetWidth * 0.3;
            this.lastWidth = lineWidth;
            point.width = lineWidth;
        } else {
            point.width = this.options.lineWidth;
        }

        this.context.lineWidth = lineWidth;

        if (len === 2) {
            this.context.beginPath();
            this.context.moveTo(points[0].x, points[0].y);
            this.context.lineTo(points[1].x, points[1].y);
            this.context.stroke();
        } else if (len > 2) {
            const lastMidX = (points[len - 3].x + points[len - 2].x) / 2;
            const lastMidY = (points[len - 3].y + points[len - 2].y) / 2;
            const midX = (points[len - 2].x + points[len - 1].x) / 2;
            const midY = (points[len - 2].y + points[len - 1].y) / 2;

            this.context.beginPath();
            this.context.moveTo(lastMidX, lastMidY);
            this.context.quadraticCurveTo(points[len - 2].x, points[len - 2].y, midX, midY);
            this.context.stroke();
        }

        [this.lastX, this.lastY] = [position.x, position.y];
    }

    stopDrawing() {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        
        if (this.currentStroke.length > 0) {
            this.strokes.push(this.currentStroke);
            this.currentStroke = [];
        }

        this._updateValue();

        if (this.onEnd) {
            this.onEnd();
        }
    }

    pauseDrawing(e) {
        // kept for backwards compatibility
        if (this.isDrawing) {
            const position = this.pos(e);
            [this.lastX, this.lastY] = [position.x, position.y];
        }
    }

    resumeDrawing(e) {
        // kept for backwards compatibility
        if (this.isDrawing) {
            const position = this.pos(e);
            [this.lastX, this.lastY] = [position.x, position.y];
        }
    }

    _redraw() {
        if (!this.context) return;
        this.context.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        this._drawOnContext(this.context, this.strokes);
    }

    _drawOnContext(ctx, strokes) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = this.options.color;

        for (const stroke of strokes) {
            const len = stroke.length;
            if (len === 0) continue;

            if (len === 1) {
                ctx.beginPath();
                ctx.fillStyle = this.options.color;
                const size = stroke[0].width || this.options.lineWidth;
                ctx.arc(stroke[0].x, stroke[0].y, size / 2, 0, Math.PI * 2);
                ctx.fill();
                continue;
            }

            if (len === 2) {
                ctx.beginPath();
                ctx.lineWidth = stroke[1].width || this.options.lineWidth;
                ctx.moveTo(stroke[0].x, stroke[0].y);
                ctx.lineTo(stroke[1].x, stroke[1].y);
                ctx.stroke();
                continue;
            }

            for (let i = 1; i < len - 1; i++) {
                const xc = (stroke[i].x + stroke[i + 1].x) / 2;
                const yc = (stroke[i].y + stroke[i + 1].y) / 2;
                const prevMidX = i === 1 ? stroke[0].x : (stroke[i - 1].x + stroke[i].x) / 2;
                const prevMidY = i === 1 ? stroke[0].y : (stroke[i - 1].y + stroke[i].y) / 2;
                
                ctx.beginPath();
                ctx.lineWidth = stroke[i].width || this.options.lineWidth;
                ctx.moveTo(prevMidX, prevMidY);
                ctx.quadraticCurveTo(stroke[i].x, stroke[i].y, xc, yc);
                ctx.stroke();
            }
            
            const prevMidX = (stroke[len - 2].x + stroke[len - 1].x) / 2;
            const prevMidY = (stroke[len - 2].y + stroke[len - 1].y) / 2;
            ctx.beginPath();
            ctx.lineWidth = stroke[len - 1].width || this.options.lineWidth;
            ctx.moveTo(prevMidX, prevMidY);
            ctx.lineTo(stroke[len - 1].x, stroke[len - 1].y);
            ctx.stroke();
        }
    }

    _updateValue() {
        if (!this.canvasElement) return;
        const dataURL = this.strokes.length > 0 ? this.canvasElement.toDataURL() : '';
        this.inputElement.value = dataURL;

        if (this.onChange) {
            this.onChange(dataURL || null);
        }
    }

    undo() {
        if (this.strokes.length === 0) return;
        const stroke = this.strokes.pop();
        this.redoStack.push(stroke);
        this._redraw();
        this._updateValue();
    }

    redo() {
        if (this.redoStack.length === 0) return;
        const stroke = this.redoStack.pop();
        this.strokes.push(stroke);
        this._redraw();
        this._updateValue();
    }

    clearCanvas() {
        this.strokes = [];
        this.currentStroke = [];
        this.redoStack = [];
        if (this.context) {
            this.context.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        }
        if (this.inputElement) {
            this.inputElement.value = '';
        }
        if (this.onChange) {
            this.onChange(null);
        }
    }

    toPNG() {
        const dataURL = this.canvasElement.toDataURL('image/png', 1.0);
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = 'signature.png';
        a.click();
    }

    toJPEG() {
        // create temporary canvas to fill background color so that it doesn't export transparency as black
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvasElement.width;
        tempCanvas.height = this.canvasElement.height;
        const tempCtx = tempCanvas.getContext('2d');

        // draw solid white background
        tempCtx.fillStyle = '#FFFFFF';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        // since temporary canvas has the same physical scale, we scale temp context if ratio > 1
        const ratio = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
        if (ratio > 1) {
            tempCtx.scale(ratio, ratio);
        }

        // draw the drawing on top of white background by scaling elements
        this._drawOnContext(tempCtx, this.strokes);

        const dataURL = tempCanvas.toDataURL('image/jpeg', 1.0);
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = 'signature.jpeg';
        a.click();
    }

    toSVG() {
        const ratio = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
        const width = this.canvasElement.width / ratio;
        const height = this.canvasElement.height / ratio;

        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
        
        // draw background if configured
        if (this.options.backgroundColor && this.options.backgroundColor !== 'transparent') {
            svg += `<rect width="100%" height="100%" fill="${this.options.backgroundColor}"/>`;
        }
        
        for (const stroke of this.strokes) {
            const len = stroke.length;
            if (len === 0) continue;

            if (len === 1) {
                const size = stroke[0].width || this.options.lineWidth;
                svg += `<circle cx="${stroke[0].x}" cy="${stroke[0].y}" r="${size / 2}" fill="${this.options.color}"/>`;
                continue;
            }

            if (len === 2) {
                const w = stroke[1].width || this.options.lineWidth;
                svg += `<path d="M ${stroke[0].x} ${stroke[0].y} L ${stroke[1].x} ${stroke[1].y}" fill="none" stroke="${this.options.color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
            } else {
                for (let i = 1; i < len - 1; i++) {
                    const xc = (stroke[i].x + stroke[i + 1].x) / 2;
                    const yc = (stroke[i].y + stroke[i + 1].y) / 2;
                    const prevMidX = i === 1 ? stroke[0].x : (stroke[i - 1].x + stroke[i].x) / 2;
                    const prevMidY = i === 1 ? stroke[0].y : (stroke[i - 1].y + stroke[i].y) / 2;
                    
                    const w = stroke[i].width || this.options.lineWidth;
                    svg += `<path d="M ${prevMidX} ${prevMidY} Q ${stroke[i].x} ${stroke[i].y}, ${xc} ${yc}" fill="none" stroke="${this.options.color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
                }

                // final line segment
                const prevMidX = (stroke[len - 2].x + stroke[len - 1].x) / 2;
                const prevMidY = (stroke[len - 2].y + stroke[len - 1].y) / 2;
                const w = stroke[len - 1].width || this.options.lineWidth;
                svg += `<path d="M ${prevMidX} ${prevMidY} L ${stroke[len - 1].x} ${stroke[len - 1].y}" fill="none" stroke="${this.options.color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
            }
        }

        svg += '</svg>';
        
        return svg;
    }

    downloadSVG() {
        const svgStr = this.toSVG();
        const blob = new Blob([svgStr], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'signature.svg';
        a.click();
        URL.revokeObjectURL(url);
    }

    toData() {
        return this.strokes;
    }

    fromData(data) {
        if (!Array.isArray(data)) return;
        this.strokes = JSON.parse(JSON.stringify(data)); // deep copy
        this.redoStack = [];
        this._redraw();
        this._updateValue();
    }

    on(event, callback) {
        if (event === 'change') {
            this.onChange = callback;
        }
    }

    disable() {
        this.options.disabled = true;
    }

    enable() {
        this.options.disabled = false;
    }

    isEmpty() {
        return this.strokes.length === 0;
    }
}

const VSignature = vSignature;
export { VSignature };
export default vSignature;
