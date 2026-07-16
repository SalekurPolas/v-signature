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

            // pen style presets: 'pen' | 'feather' | 'gel' | 'brush' | 'highlighter' | 'calligraphy' | 'custom'
            style: 'pen',
            minWidth: null,
            maxWidth: null,
            velocitySensitivity: null,
            opacity: 1.0,
            shadowBlur: 0,
            shadowColor: null,
            lineJoin: 'round',

            // custom watermark
            watermark: null, // text string
            watermarkColor: 'rgba(0, 0, 0, 0.05)',
            watermarkFont: '32px sans-serif',
            watermarkAngle: -30,

            // baseline guideline
            guideLine: null, // e.g. "Sign here"
            guideLineColor: 'rgba(0, 0, 0, 0.15)',
            guideLineExport: false,

            // cursor pointer styles: 'default' | 'pen' | 'feather' | 'pencil' | 'custom' | string
            pen: 'default'
        }, flatOptions, options);
    
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
        this.lastWidth = this.options.lineWidth;

        // vector stroke tracking for smoothing, undo/redo, resize redraw, and SVG
        this.strokes = [];
        this.currentStroke = [];
        this.redoStack = [];
    
        this.init();
    }

    // helper to resolve string selector or dom element
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
                this.clear();
            });
        }

        if (this.saveButton) {
            this.saveButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.downloadPNG();
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

        this._updateCursor();
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

    // helper to calculate pen brush configurations dynamically
    _resolvePenParams(velocity) {
        const style = this.options.style || 'pen';
        let lineWidth = this.options.lineWidth;
        let opacity = this.options.opacity !== undefined ? this.options.opacity : 1.0;
        let shadowBlur = this.options.shadowBlur !== undefined ? this.options.shadowBlur : 0;
        let shadowColor = this.options.shadowColor || null;
        let lineJoin = this.options.lineJoin || 'round';

        let minWidth = this.options.minWidth;
        let maxWidth = this.options.maxWidth;
        let velocitySensitivity = this.options.velocitySensitivity !== null ? this.options.velocitySensitivity : 0.7;

        if (style === 'fountain' || style === 'pen') {
            minWidth = minWidth !== null ? minWidth : Math.max(0.5, this.options.lineWidth * 0.25);
            maxWidth = maxWidth !== null ? maxWidth : this.options.lineWidth * 1.5;
            
            const targetWidth = Math.max(minWidth, maxWidth - (velocity * velocitySensitivity));
            lineWidth = this.lastWidth * 0.7 + targetWidth * 0.3;
        } else if (style === 'quill' || style === 'feather') {
            minWidth = minWidth !== null ? minWidth : Math.max(0.3, this.options.lineWidth * 0.15);
            maxWidth = maxWidth !== null ? maxWidth : this.options.lineWidth * 2.0;
            
            const targetWidth = Math.max(minWidth, maxWidth - (velocity * (velocitySensitivity * 1.2)));
            lineWidth = this.lastWidth * 0.6 + targetWidth * 0.4;
            
            // slight opacity fade as drawing speed increases to simulate ink quill flow
            const speedRatio = Math.min(1.0, velocity / 5.0);
            opacity = 1.0 - speedRatio * 0.4;
        } else if (style === 'gel') {
            lineWidth = this.options.lineWidth;
            opacity = 1.0;
        } else if (style === 'brush') {
            minWidth = minWidth !== null ? minWidth : this.options.lineWidth * 0.6;
            maxWidth = maxWidth !== null ? maxWidth : this.options.lineWidth * 2.2;
            
            const targetWidth = Math.max(minWidth, maxWidth - (velocity * velocitySensitivity));
            lineWidth = this.lastWidth * 0.8 + targetWidth * 0.2;
            
            shadowBlur = 1;
            shadowColor = this.options.color;
        } else if (style === 'highlighter') {
            lineWidth = this.options.lineWidth * 3.5;
            opacity = 0.35;
            lineJoin = 'miter';
        } else if (style === 'calligraphy') {
            minWidth = minWidth !== null ? minWidth : this.options.lineWidth * 0.25;
            maxWidth = maxWidth !== null ? maxWidth : this.options.lineWidth * 2.5;
            
            const targetWidth = Math.max(minWidth, maxWidth - (velocity * (velocitySensitivity * 1.3)));
            lineWidth = this.lastWidth * 0.5 + targetWidth * 0.5;
        } else if (style === 'custom') {
            if (minWidth !== null && maxWidth !== null && minWidth !== maxWidth) {
                const targetWidth = Math.max(minWidth, maxWidth - (velocity * velocitySensitivity));
                lineWidth = this.lastWidth * 0.7 + targetWidth * 0.3;
            }
        }

        return {
            width: lineWidth,
            opacity,
            shadowBlur,
            shadowColor,
            lineJoin
        };
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
        this.lastWidth = (this.options.minWidth || this.options.lineWidth + (this.options.maxWidth || this.options.lineWidth)) / 2;

        if (this.onBegin) {
            this.onBegin(e);
        }
    }

    draw(e) {
        if (this.options.disabled || !this.isDrawing) return;

        const position = this.pos(e);
        const point = { x: position.x, y: position.y, time: Date.now() };
        this.currentStroke.push(point);

        const points = this.currentStroke;
        const len = points.length;

        // calculate velocity
        let velocity = 0;
        if (len >= 2) {
            const lastPoint = points[len - 2];
            const dist = Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y);
            const timeDiff = point.time - lastPoint.time;
            velocity = timeDiff > 0 ? dist / timeDiff : 0;
        }

        const params = this._resolvePenParams(velocity);
        
        // store computed values inside the point coordinates for redraws and exports
        point.width = params.width;
        point.opacity = params.opacity;
        point.shadowBlur = params.shadowBlur;
        point.shadowColor = params.shadowColor;
        point.lineJoin = params.lineJoin;
        
        this.lastWidth = params.width;

        this.context.lineCap = 'round';
        this.context.lineJoin = params.lineJoin;
        this.context.strokeStyle = this.options.color;
        this.context.lineWidth = params.width;
        this.context.globalAlpha = params.opacity;

        if (params.shadowBlur > 0 && params.shadowColor) {
            this.context.shadowBlur = params.shadowBlur;
            this.context.shadowColor = params.shadowColor;
        } else {
            this.context.shadowBlur = 0;
        }

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

        // reset context styling constraints to defaults
        this.context.globalAlpha = 1.0;
        this.context.shadowBlur = 0;

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

    _drawOnContext(ctx, strokes, excludeGuides = false) {
        const ratio = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
        const width = this.canvasElement.width / ratio;
        const height = this.canvasElement.height / ratio;

        // draw watermark behind drawing
        this._drawWatermark(ctx, width, height);

        // draw signing guideline baseline (unless requested to exclude in output exports)
        if (!excludeGuides) {
            this._drawGuideLine(ctx, width, height);
        }

        // draw recorded vector strokes
        ctx.lineCap = 'round';
        ctx.strokeStyle = this.options.color;

        for (const stroke of strokes) {
            const len = stroke.length;
            if (len === 0) continue;

            if (len === 1) {
                ctx.beginPath();
                ctx.fillStyle = this.options.color;
                const size = stroke[0].width || this.options.lineWidth;
                ctx.globalAlpha = stroke[0].opacity !== undefined ? stroke[0].opacity : 1.0;
                ctx.arc(stroke[0].x, stroke[0].y, size / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1.0; // reset
                continue;
            }

            if (len === 2) {
                ctx.beginPath();
                ctx.lineWidth = stroke[1].width || this.options.lineWidth;
                ctx.lineJoin = stroke[1].lineJoin || 'round';
                ctx.globalAlpha = stroke[1].opacity !== undefined ? stroke[1].opacity : 1.0;
                
                if (stroke[1].shadowBlur > 0 && stroke[1].shadowColor) {
                    ctx.shadowBlur = stroke[1].shadowBlur;
                    ctx.shadowColor = stroke[1].shadowColor;
                } else {
                    ctx.shadowBlur = 0;
                }

                ctx.moveTo(stroke[0].x, stroke[0].y);
                ctx.lineTo(stroke[1].x, stroke[1].y);
                ctx.stroke();
                
                ctx.globalAlpha = 1.0;
                ctx.shadowBlur = 0;
                continue;
            }

            for (let i = 1; i < len - 1; i++) {
                const xc = (stroke[i].x + stroke[i + 1].x) / 2;
                const yc = (stroke[i].y + stroke[i + 1].y) / 2;
                const prevMidX = i === 1 ? stroke[0].x : (stroke[i - 1].x + stroke[i].x) / 2;
                const prevMidY = i === 1 ? stroke[0].y : (stroke[i - 1].y + stroke[i].y) / 2;
                
                ctx.beginPath();
                ctx.lineWidth = stroke[i].width || this.options.lineWidth;
                ctx.lineJoin = stroke[i].lineJoin || 'round';
                ctx.globalAlpha = stroke[i].opacity !== undefined ? stroke[i].opacity : 1.0;

                if (stroke[i].shadowBlur > 0 && stroke[i].shadowColor) {
                    ctx.shadowBlur = stroke[i].shadowBlur;
                    ctx.shadowColor = stroke[i].shadowColor;
                } else {
                    ctx.shadowBlur = 0;
                }

                ctx.moveTo(prevMidX, prevMidY);
                ctx.quadraticCurveTo(stroke[i].x, stroke[i].y, xc, yc);
                ctx.stroke();
            }
            
            // connect to final point
            const prevMidX = (stroke[len - 2].x + stroke[len - 1].x) / 2;
            const prevMidY = (stroke[len - 2].y + stroke[len - 1].y) / 2;
            ctx.beginPath();
            ctx.lineWidth = stroke[len - 1].width || this.options.lineWidth;
            ctx.lineJoin = stroke[len - 1].lineJoin || 'round';
            ctx.globalAlpha = stroke[len - 1].opacity !== undefined ? stroke[len - 1].opacity : 1.0;

            if (stroke[len - 1].shadowBlur > 0 && stroke[len - 1].shadowColor) {
                ctx.shadowBlur = stroke[len - 1].shadowBlur;
                ctx.shadowColor = stroke[len - 1].shadowColor;
            } else {
                ctx.shadowBlur = 0;
            }

            ctx.moveTo(prevMidX, prevMidY);
            ctx.lineTo(stroke[len - 1].x, stroke[len - 1].y);
            ctx.stroke();
            
            ctx.globalAlpha = 1.0;
            ctx.shadowBlur = 0;
        }
    }

    _drawWatermark(ctx, width, height) {
        if (!this.options.watermark) return;
        ctx.save();
        ctx.font = this.options.watermarkFont || '32px sans-serif';
        ctx.fillStyle = this.options.watermarkColor || 'rgba(0, 0, 0, 0.05)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.translate(width / 2, height / 2);
        ctx.rotate((this.options.watermarkAngle || -30) * Math.PI / 180);
        ctx.fillText(this.options.watermark, 0, 0);
        ctx.restore();
    }

    _drawGuideLine(ctx, width, height) {
        if (!this.options.guideLine) return;
        ctx.save();
        ctx.strokeStyle = this.options.guideLineColor || 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]); // dotted line
        
        const y = height * 0.8;
        ctx.beginPath();
        ctx.moveTo(30, y);
        ctx.lineTo(width - 30, y);
        ctx.stroke();
        
        // draw description guide text
        if (typeof this.options.guideLine === 'string' && this.options.guideLine !== '') {
            ctx.fillStyle = this.options.guideLineColor || 'rgba(0, 0, 0, 0.15)';
            ctx.font = '12px sans-serif';
            ctx.fillText(this.options.guideLine, 30, y - 8);
        }
        ctx.restore();
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

    clear() {
        this.strokes = [];
        this.currentStroke = [];
        this.redoStack = [];
        if (this.context) {
            this.context.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        }
        if (this.inputElement) {
            this.inputElement.value = '';
        }
        this._redraw(); // draws watermark/guides again on clean pad
        if (this.onChange) {
            this.onChange(null);
        }
    }

    toPNG() {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvasElement.width;
        tempCanvas.height = this.canvasElement.height;
        const tempCtx = tempCanvas.getContext('2d');

        const ratio = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
        if (ratio > 1) {
            tempCtx.scale(ratio, ratio);
        }

        // draw background if configured
        if (this.options.backgroundColor && this.options.backgroundColor !== 'transparent') {
            tempCtx.fillStyle = this.options.backgroundColor;
            tempCtx.fillRect(0, 0, tempCanvas.width / ratio, tempCanvas.height / ratio);
        }

        // exclude baseline guidelines if guideLineExport is false
        const excludeGuides = !this.options.guideLineExport;
        this._drawOnContext(tempCtx, this.strokes, excludeGuides);

        return tempCanvas.toDataURL('image/png', 1.0);
    }

    downloadPNG() {
        const dataURL = this.toPNG();
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
        
        // since temporary canvas has the same physical scale, we scale temp context if ratio is greater than one
        const ratio = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
        if (ratio > 1) {
            tempCtx.scale(ratio, ratio);
        }

        // draw the drawing on top of white background by scaling elements
        const excludeGuides = !this.options.guideLineExport;
        this._drawOnContext(tempCtx, this.strokes, excludeGuides);

        return tempCanvas.toDataURL('image/jpeg', 1.0);
    }

    downloadJPEG() {
        const dataURL = this.toJPEG();
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

        // draw watermark
        if (this.options.watermark) {
            const font = this.options.watermarkFont || '32px sans-serif';
            const color = this.options.watermarkColor || 'rgba(0, 0, 0, 0.05)';
            const angle = this.options.watermarkAngle || -30;
            const fontFamily = font.replace(/^\d+px\s+/, '');
            const fontSize = font.match(/^\d+px/)?.[0] || '32px';
            
            const transform = `translate(${width / 2}, ${height / 2}) rotate(${angle})`;
            svg += `<text transform="${transform}" font-family="${fontFamily}" font-size="${fontSize}" fill="${color}" text-anchor="middle" dominant-baseline="middle">${this.options.watermark}</text>`;
        }

        // draw baseline guideline
        if (this.options.guideLine && this.options.guideLineExport) {
            const color = this.options.guideLineColor || 'rgba(0, 0, 0, 0.15)';
            const y = height * 0.8;
            svg += `<line x1="30" y1="${y}" x2="${width - 30}" y2="${y}" stroke="${color}" stroke-width="1" stroke-dasharray="5,5"/>`;
            if (typeof this.options.guideLine === 'string' && this.options.guideLine !== '') {
                svg += `<text x="30" y="${y - 8}" font-family="sans-serif" font-size="12px" fill="${color}">${this.options.guideLine}</text>`;
            }
        }
        
        for (const stroke of this.strokes) {
            const len = stroke.length;
            if (len === 0) continue;

            if (len === 1) {
                const size = stroke[0].width || this.options.lineWidth;
                const opacity = stroke[0].opacity !== undefined ? stroke[0].opacity : 1.0;
                svg += `<circle cx="${stroke[0].x}" cy="${stroke[0].y}" r="${size / 2}" fill="${this.options.color}" fill-opacity="${opacity}"/>`;
                continue;
            }

            if (len === 2) {
                const w = stroke[1].width || this.options.lineWidth;
                const opacity = stroke[1].opacity !== undefined ? stroke[1].opacity : 1.0;
                let filter = '';
                if (stroke[1].shadowBlur > 0) {
                    filter = ` style="filter: drop-shadow(0 0 ${stroke[1].shadowBlur}px ${this.options.color})"`;
                }
                svg += `<path d="M ${stroke[0].x} ${stroke[0].y} L ${stroke[1].x} ${stroke[1].y}" fill="none" stroke="${this.options.color}" stroke-width="${w}" stroke-opacity="${opacity}" stroke-linecap="round" stroke-linejoin="${stroke[1].lineJoin || 'round'}"${filter}/>`;
            } else {
                let filter = '';
                if (stroke[1].shadowBlur > 0) {
                    filter = ` style="filter: drop-shadow(0 0 ${stroke[1].shadowBlur}px ${this.options.color})"`;
                }

                for (let i = 1; i < len - 1; i++) {
                    const xc = (stroke[i].x + stroke[i + 1].x) / 2;
                    const yc = (stroke[i].y + stroke[i + 1].y) / 2;
                    const prevMidX = i === 1 ? stroke[0].x : (stroke[i - 1].x + stroke[i].x) / 2;
                    const prevMidY = i === 1 ? stroke[0].y : (stroke[i - 1].y + stroke[i].y) / 2;
                    
                    const w = stroke[i].width || this.options.lineWidth;
                    const opacity = stroke[i].opacity !== undefined ? stroke[i].opacity : 1.0;
                    svg += `<path d="M ${prevMidX} ${prevMidY} Q ${stroke[i].x} ${stroke[i].y}, ${xc} ${yc}" fill="none" stroke="${this.options.color}" stroke-width="${w}" stroke-opacity="${opacity}" stroke-linecap="round" stroke-linejoin="${stroke[i].lineJoin || 'round'}"${filter}/>`;
                }

                // final line segment
                const prevMidX = (stroke[len - 2].x + stroke[len - 1].x) / 2;
                const prevMidY = (stroke[len - 2].y + stroke[len - 1].y) / 2;
                const w = stroke[len - 1].width || this.options.lineWidth;
                const opacity = stroke[len - 1].opacity !== undefined ? stroke[len - 1].opacity : 1.0;
                svg += `<path d="M ${prevMidX} ${prevMidY} L ${stroke[len - 1].x} ${stroke[len - 1].y}" fill="none" stroke="${this.options.color}" stroke-width="${w}" stroke-opacity="${opacity}" stroke-linecap="round" stroke-linejoin="${stroke[len - 1].lineJoin || 'round'}"${filter}/>`;
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

    _getBoundingBox() {
        if (this.strokes.length === 0) return null;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        for (const stroke of this.strokes) {
            for (const pt of stroke) {
                if (pt.x < minX) minX = pt.x;
                if (pt.y < minY) minY = pt.y;
                if (pt.x > maxX) maxX = pt.x;
                if (pt.y > maxY) maxY = pt.y;
            }
        }
        
        // add safety padding boundary to prevent cutting off pen caps
        const padding = 8;
        return {
            x: Math.max(0, minX - padding),
            y: Math.max(0, minY - padding),
            width: (maxX - minX) + (padding * 2),
            height: (maxY - minY) + (padding * 2)
        };
    }

    toTrimmedPNG() {
        const box = this._getBoundingBox();
        if (!box) return null;
        
        const tempCanvas = document.createElement('canvas');
        const ratio = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
        tempCanvas.width = box.width * ratio;
        tempCanvas.height = box.height * ratio;
        
        const tempCtx = tempCanvas.getContext('2d');
        if (ratio > 1) {
            tempCtx.scale(ratio, ratio);
        }
        
        // translate coordinate system to top-left of trimmed bounding box
        tempCtx.translate(-box.x, -box.y);
        
        // render drawing, excluding guide lines for clean output crops
        this._drawOnContext(tempCtx, this.strokes, true);
        
        return tempCanvas.toDataURL('image/png');
    }

    downloadTrimmedPNG() {
        const dataURL = this.toTrimmedPNG();
        if (!dataURL) return;
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = 'signature-trimmed.png';
        a.click();
    }


    toTrimmedJPEG() {
        const box = this._getBoundingBox();
        if (!box) return null;
        
        const tempCanvas = document.createElement('canvas');
        const ratio = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
        tempCanvas.width = box.width * ratio;
        tempCanvas.height = box.height * ratio;
        
        const tempCtx = tempCanvas.getContext('2d');
        
        // draw solid white background
        tempCtx.fillStyle = '#FFFFFF';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        if (ratio > 1) {
            tempCtx.scale(ratio, ratio);
        }
        
        // translate coordinate system to top-left of trimmed bounding box
        tempCtx.translate(-box.x, -box.y);
        
        // render drawing, excluding guide lines for clean output crops
        this._drawOnContext(tempCtx, this.strokes, true);
        
        return tempCanvas.toDataURL('image/jpeg', 1.0);
    }

    downloadTrimmedJPEG() {
        const dataURL = this.toTrimmedJPEG();
        if (!dataURL) return;
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = 'signature-trimmed.jpeg';
        a.click();
    }

    toTrimmedSVG() {
        const box = this._getBoundingBox();
        if (!box) return null;

        const width = box.width;
        const height = box.height;

        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${box.x} ${box.y} ${width} ${height}">`;
        
        // draw background if configured
        if (this.options.backgroundColor && this.options.backgroundColor !== 'transparent') {
            svg += `<rect x="${box.x}" y="${box.y}" width="${width}" height="${height}" fill="${this.options.backgroundColor}"/>`;
        }

        for (const stroke of this.strokes) {
            const len = stroke.length;
            if (len === 0) continue;

            if (len === 1) {
                const size = stroke[0].width || this.options.lineWidth;
                const opacity = stroke[0].opacity !== undefined ? stroke[0].opacity : 1.0;
                svg += `<circle cx="${stroke[0].x}" cy="${stroke[0].y}" r="${size / 2}" fill="${this.options.color}" fill-opacity="${opacity}"/>`;
                continue;
            }

            if (len === 2) {
                const w = stroke[1].width || this.options.lineWidth;
                const opacity = stroke[1].opacity !== undefined ? stroke[1].opacity : 1.0;
                let filter = '';
                if (stroke[1].shadowBlur > 0) {
                    filter = ` style="filter: drop-shadow(0 0 ${stroke[1].shadowBlur}px ${this.options.color})"`;
                }
                svg += `<path d="M ${stroke[0].x} ${stroke[0].y} L ${stroke[1].x} ${stroke[1].y}" fill="none" stroke="${this.options.color}" stroke-width="${w}" stroke-opacity="${opacity}" stroke-linecap="round" stroke-linejoin="${stroke[1].lineJoin || 'round'}"${filter}/>`;
            } else {
                let filter = '';
                if (stroke[1].shadowBlur > 0) {
                    filter = ` style="filter: drop-shadow(0 0 ${stroke[1].shadowBlur}px ${this.options.color})"`;
                }

                for (let i = 1; i < len - 1; i++) {
                    const xc = (stroke[i].x + stroke[i + 1].x) / 2;
                    const yc = (stroke[i].y + stroke[i + 1].y) / 2;
                    const prevMidX = i === 1 ? stroke[0].x : (stroke[i - 1].x + stroke[i].x) / 2;
                    const prevMidY = i === 1 ? stroke[0].y : (stroke[i - 1].y + stroke[i].y) / 2;
                    
                    const w = stroke[i].width || this.options.lineWidth;
                    const opacity = stroke[i].opacity !== undefined ? stroke[i].opacity : 1.0;
                    svg += `<path d="M ${prevMidX} ${prevMidY} Q ${stroke[i].x} ${stroke[i].y}, ${xc} ${yc}" fill="none" stroke="${this.options.color}" stroke-width="${w}" stroke-opacity="${opacity}" stroke-linecap="round" stroke-linejoin="${stroke[i].lineJoin || 'round'}"${filter}/>`;
                }

                // final line segment
                const prevMidX = (stroke[len - 2].x + stroke[len - 1].x) / 2;
                const prevMidY = (stroke[len - 2].y + stroke[len - 1].y) / 2;
                const w = stroke[len - 1].width || this.options.lineWidth;
                const opacity = stroke[len - 1].opacity !== undefined ? stroke[len - 1].opacity : 1.0;
                svg += `<path d="M ${prevMidX} ${prevMidY} L ${stroke[len - 1].x} ${stroke[len - 1].y}" fill="none" stroke="${this.options.color}" stroke-width="${w}" stroke-opacity="${opacity}" stroke-linecap="round" stroke-linejoin="${stroke[len - 1].lineJoin || 'round'}"${filter}/>`;
            }
        }

        svg += '</svg>';
        return svg;
    }

    downloadTrimmedSVG() {
        const svgStr = this.toTrimmedSVG();
        if (!svgStr) return;
        const blob = new Blob([svgStr], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'signature-trimmed.svg';
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

    _updateCursor() {
        if (!this.canvasElement) return;
        const penOpt = this.options.pen || 'default';

        // self-contained inline vector shapes for pens, quill, and pencils
        const presets = {
            default: 'crosshair',
            crosshair: 'crosshair',
            fountain: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><path d='M0 32 L8 16 L24 0 L32 8 L16 24 Z' fill='%236366f1'/><path d='M0 32 L4 28' stroke='%23000000' stroke-width='1.5'/></svg>") 0 32, crosshair`,
            pen: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><path d='M0 32 L8 16 L24 0 L32 8 L16 24 Z' fill='%236366f1'/><path d='M0 32 L4 28' stroke='%23000000' stroke-width='1.5'/></svg>") 0 32, crosshair`,
            quill: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><path d='M0 32 L8 24 L28 4 Q30 2 28 0 Q26 -2 24 0 L4 20 L0 32' fill='%2394a3b8'/><path d='M24 0 Q16 12 6 22' stroke='%23ffffff' stroke-width='1'/></svg>") 0 32, crosshair`,
            feather: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><path d='M0 32 L8 24 L28 4 Q30 2 28 0 Q26 -2 24 0 L4 20 L0 32' fill='%2394a3b8'/><path d='M24 0 Q16 12 6 22' stroke='%23ffffff' stroke-width='1'/></svg>") 0 32, crosshair`,
            pencil: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><path d='M0 32 L4 20 L20 4 L28 12 L12 28 Z' fill='%23eab308'/><path d='M0 32 L2 26 L6 30 Z' fill='%231e293b'/><path d='M20 4 L28 12 L30 10 L22 2 Z' fill='%23f43f5e'/></svg>") 0 32, crosshair`
        };

        if (presets[penOpt]) {
            this.canvasElement.style.cursor = presets[penOpt];
        } else if (penOpt.startsWith('url(') || penOpt.includes('/') || penOpt.includes('.')) {
            // check if we can downscale large custom cursors automatically
            const rawUrl = penOpt.startsWith('url(') ? penOpt.slice(4, -1).replace(/['"]/g, "") : penOpt;
            
            // set raw URL fallback immediately
            this.canvasElement.style.cursor = `url("${rawUrl}") 0 32, auto`;
            
            // try to load and downscale to small size to bypass browser size restrictions
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = 32;
                    canvas.height = 32;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, 32, 32);
                    const dataURL = canvas.toDataURL('image/png');
                    this.canvasElement.style.cursor = `url("${dataURL}") 0 32, auto`;
                } catch (err) {
                    // keep raw fallback on cors taint
                }
            };
            img.src = rawUrl;
        } else {
            this.canvasElement.style.cursor = penOpt;
        }
    }

    setPen(type) {
        this.options.pen = type;
        this._updateCursor();
    }

    isEmpty() {
        return this.strokes.length === 0;
    }
}

const VSignature = vSignature;
export { VSignature };
export default vSignature;
