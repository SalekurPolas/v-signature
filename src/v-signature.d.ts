// src/v-signature.d.ts
interface vSignatureOptions {
    width?: string;
    height?: string;
    color?: string;
    lineWidth?: number;
    backgroundColor?: string;
    border?: string;
    borderRadius?: string;
    disabled?: boolean;
    minWidth?: number;
    maxWidth?: number;
    velocitySensitivity?: number;
}

interface vSignatureConfig {
    canvas?: string | HTMLElement | null;
    clear?: string | HTMLElement | null;
    save?: string | HTMLElement | null;
    undo?: string | HTMLElement | null;
    redo?: string | HTMLElement | null;
    onBegin?: ((e: PointerEvent | MouseEvent) => void) | null;
    onEnd?: (() => void) | null;
    options?: vSignatureOptions;
    [key: string]: any; // allows passing flat options in config
}

interface Point {
    x: number;
    y: number;
    time?: number;
    width?: number;
}

declare class vSignature {
    inputSelector: string | HTMLElement;
    canvasSelector: string | HTMLElement | null;
    clearSelector: string | HTMLElement | null;
    saveSelector: string | HTMLElement | null;
    undoSelector: string | HTMLElement | null;
    redoSelector: string | HTMLElement | null;
    options: vSignatureOptions;

    inputElement: HTMLInputElement | null;
    canvasElement: HTMLCanvasElement | null;
    clearButton: HTMLElement | null;
    saveButton: HTMLElement | null;
    undoButton: HTMLElement | null;
    redoButton: HTMLElement | null;
    onChange: ((data: string | null) => void) | null;
    onBegin: ((e: PointerEvent | MouseEvent) => void) | null;
    onEnd: (() => void) | null;
    
    context: CanvasRenderingContext2D | null;
    isDrawing: boolean;
    lastX: number;
    lastY: number;

    strokes: Point[][];
    currentStroke: Point[];
    redoStack: Point[][];

    constructor(input: string | HTMLElement, config?: vSignatureConfig);

    init(): void;

    resize(): void;

    startDrawing(e: PointerEvent | MouseEvent): void;

    draw(e: PointerEvent | MouseEvent): void;

    stopDrawing(): void;

    pauseDrawing(e: PointerEvent | MouseEvent): void;

    resumeDrawing(e: PointerEvent | MouseEvent): void;

    clearCanvas(): void;

    toPNG(): void;

    toJPEG(): void;

    toSVG(): string;

    downloadSVG(): void;

    toData(): Point[][];

    fromData(data: Point[][]): void;

    disable(): void;

    enable(): void;

    pos(e: PointerEvent | MouseEvent): { x: number; y: number };

    on(event: 'change', callback: (data: string | null) => void): void;

    isEmpty(): boolean;
}

export { vSignature as VSignature };
export default vSignature;