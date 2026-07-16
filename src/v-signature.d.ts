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
    
    style?: 'pen' | 'fountain' | 'quill' | 'feather' | 'gel' | 'brush' | 'highlighter' | 'calligraphy' | 'custom';
    minWidth?: number | null;
    maxWidth?: number | null;
    velocitySensitivity?: number | null;
    opacity?: number;
    shadowBlur?: number;
    shadowColor?: string | null;
    lineJoin?: 'round' | 'bevel' | 'miter';

    // watermark options
    watermark?: string | null;
    watermarkColor?: string;
    watermarkFont?: string;
    watermarkAngle?: number;

    // guideline baseline options
    guideLine?: string | null;
    guideLineColor?: string;
    guideLineExport?: boolean;

    // cursor pointer options
    pen?: 'default' | 'crosshair' | 'pen' | 'fountain' | 'quill' | 'feather' | 'pencil' | 'custom' | string;
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
    opacity?: number;
    shadowBlur?: number;
    shadowColor?: string | null;
    lineJoin?: string;
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

    clear(): void;

    toPNG(): string;

    downloadPNG(): void;

    toJPEG(): string;

    downloadJPEG(): void;

    toSVG(): string;

    downloadSVG(): void;

    toTrimmedPNG(): string | null;

    downloadTrimmedPNG(): void;

    toTrimmedJPEG(): string | null;

    downloadTrimmedJPEG(): void;

    toTrimmedSVG(): string | null;

    downloadTrimmedSVG(): void;

    toData(): Point[][];

    fromData(data: Point[][]): void;

    setPen(type: 'default' | 'crosshair' | 'pen' | 'fountain' | 'quill' | 'feather' | 'pencil' | 'custom' | string): void;

    disable(): void;

    enable(): void;

    pos(e: PointerEvent | MouseEvent): { x: number; y: number };

    on(event: 'change', callback: (data: string | null) => void): void;

    isEmpty(): boolean;
}

export { vSignature as VSignature };
export default vSignature;