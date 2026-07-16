// test.js
import { vSignature } from './src/v-signature.js';

// mock dom APIs if running in standard headless Node environment
if (typeof globalThis.window === 'undefined') {
    globalThis.document = {
        querySelector: () => null,
        createElement: () => ({
            style: {},
            getContext: () => ({
                scale: () => {},
                clearRect: () => {},
                save: () => {},
                restore: () => {},
                translate: () => {},
                rotate: () => {},
                fillText: () => {},
                beginPath: () => {},
                moveTo: () => {},
                lineTo: () => {},
                stroke: () => {},
                setLineDash: () => {}
            }),
            addEventListener: () => {},
            getBoundingClientRect: () => ({ width: 300, height: 150, left: 0, top: 0, right: 300, bottom: 150 })
        })
    };

    globalThis.window = {
        devicePixelRatio: 1,
        addEventListener: () => {}
    };

    globalThis.HTMLElement = class {};
}

// initialization of signature
const signature = new vSignature('signature', {
    clear: 'clear',
    save: 'save',
    undo: 'undo',
    redo: 'redo',
    width: '100%',
    height: '100%',
    border: 'none',
    borderRadius: '0px',
    backgroundColor: '#ffffff',
    style: 'fountain',
    watermark: 'SAMPLE',
    watermarkColor: 'rgba(0, 0, 0, 0.05)',
    watermarkFont: '32px sans-serif',
    watermarkAngle: -30,
    guideLine: 'Sign here',
    guideLineColor: 'rgba(0, 0, 0, 0.15)',
    guideLineExport: false
});

// bind ui actions if running in the browser
if (typeof document !== 'undefined') {
    document.querySelector('.save-jpg')?.addEventListener('click', (e) => {
        e.preventDefault();
        signature.downloadJPEG();
    });
    
    document.querySelector('.save-svg')?.addEventListener('click', (e) => {
        e.preventDefault();
        signature.downloadSVG();
    });

    document.querySelector('.save-trimmed')?.addEventListener('click', (e) => {
        e.preventDefault();
        signature.downloadTrimmedPNG();
    });

    // control: helper to toggle custom physics panel visibility
    const togglePhysicsSection = (preset) => {
        const section = document.querySelector('.physics-section');
        if (section) {
            if (preset === 'custom' || preset === 'fountain') {
                section.style.opacity = '1.0';
                section.style.pointerEvents = 'auto';
            } else {
                section.style.opacity = '0.4';
                section.style.pointerEvents = 'none';
            }
        }
    };

    // control: style selector
    document.querySelector('.pen-style-selector')?.addEventListener('change', (e) => {
        signature.options.style = e.target.value;
        togglePhysicsSection(e.target.value);
        signature.clear();
    });

    // control: line join selector
    document.querySelector('.join-selector')?.addEventListener('change', (e) => {
        signature.options.lineJoin = e.target.value;
        signature.clear();
    });

    // control: pad disable checkbox
    document.querySelector('.disable-checkbox')?.addEventListener('change', (e) => {
        if (e.target.checked) {
            signature.disable();
        } else {
            signature.enable();
        }
    });

    // control: pen color picker
    document.querySelector('.color-picker')?.addEventListener('input', (e) => {
        const color = e.target.value;
        signature.options.color = color;
        const label = document.querySelector('.color-value');
        if (label) label.textContent = color.toUpperCase();
        signature._redraw();
    });

    // control: background color picker
    document.querySelector('.bg-picker')?.addEventListener('input', (e) => {
        const color = e.target.value;
        signature.options.backgroundColor = color;
        if (signature.canvasElement) {
            signature.canvasElement.style.backgroundColor = color;
        }
        const label = document.querySelector('.bg-value');
        if (label) label.textContent = color.toUpperCase();
        signature._redraw();
    });

    // control: base pen thickness range slider
    document.querySelector('.width-slider')?.addEventListener('input', (e) => {
        const width = parseInt(e.target.value, 10);
        signature.options.lineWidth = width;
        signature.options.minWidth = null;
        signature.options.maxWidth = null;
        const label = document.querySelector('.width-value');
        if (label) label.textContent = `${width}px`;
        signature.clear();
    });

    // control: opacity transparency slider
    document.querySelector('.opacity-slider')?.addEventListener('input', (e) => {
        const opacity = parseFloat(e.target.value);
        signature.options.opacity = opacity;
        const label = document.querySelector('.opacity-value');
        if (label) label.textContent = opacity.toFixed(2);
        signature._redraw();
    });

    // control: min width slider
    document.querySelector('.min-width-slider')?.addEventListener('input', (e) => {
        const w = parseFloat(e.target.value);
        signature.options.minWidth = w;
        const label = document.querySelector('.min-width-value');
        if (label) label.textContent = `${w.toFixed(1)}px`;
        signature.clear();
    });

    // control: max width slider
    document.querySelector('.max-width-slider')?.addEventListener('input', (e) => {
        const w = parseFloat(e.target.value);
        signature.options.maxWidth = w;
        const label = document.querySelector('.max-width-value');
        if (label) label.textContent = `${w.toFixed(1)}px`;
        signature.clear();
    });

    // control: speed sensitivity slider
    document.querySelector('.speed-slider')?.addEventListener('input', (e) => {
        const v = parseFloat(e.target.value);
        signature.options.velocitySensitivity = v;
        const label = document.querySelector('.speed-value');
        if (label) label.textContent = v.toFixed(2);
        signature.clear();
    });

    // control: shadow color picker
    document.querySelector('.shadow-color-picker')?.addEventListener('input', (e) => {
        const color = e.target.value;
        signature.options.shadowColor = color;
        const label = document.querySelector('.shadow-color-value');
        if (label) label.textContent = color.toUpperCase();
        signature._redraw();
    });

    // control: shadow blur slider
    document.querySelector('.shadow-blur-slider')?.addEventListener('input', (e) => {
        const blur = parseInt(e.target.value, 10);
        signature.options.shadowBlur = blur;
        const label = document.querySelector('.shadow-blur-value');
        if (label) label.textContent = `${blur}px`;
        signature._redraw();
    });

    // control: custom watermark input
    document.querySelector('.watermark-input')?.addEventListener('input', (e) => {
        signature.options.watermark = e.target.value || null;
        signature._redraw();
    });

    // control: watermark color picker
    document.querySelector('.watermark-color-picker')?.addEventListener('input', (e) => {
        const color = e.target.value;
        signature.options.watermarkColor = color + '0D'; // add fractional opacity to watermark color
        const label = document.querySelector('.watermark-color-value');
        if (label) label.textContent = color.toUpperCase();
        signature._redraw();
    });

    // control: watermark size slider
    document.querySelector('.watermark-size-slider')?.addEventListener('input', (e) => {
        const size = parseInt(e.target.value, 10);
        signature.options.watermarkFont = `${size}px sans-serif`;
        const label = document.querySelector('.watermark-size-value');
        if (label) label.textContent = `${size}px`;
        signature._redraw();
    });

    // control: watermark rotation angle slider
    document.querySelector('.watermark-angle-slider')?.addEventListener('input', (e) => {
        const angle = parseInt(e.target.value, 10);
        signature.options.watermarkAngle = angle;
        const label = document.querySelector('.watermark-angle-value');
        if (label) label.textContent = `${angle}°`;
        signature._redraw();
    });

    // control: guideline color picker
    document.querySelector('.guide-color-picker')?.addEventListener('input', (e) => {
        const color = e.target.value;
        signature.options.guideLineColor = color + '26'; // add fractional opacity to guideline color
        const label = document.querySelector('.guide-color-value');
        if (label) label.textContent = color.toUpperCase();
        signature._redraw();
    });

    // control: guideline export checkbox
    document.querySelector('.guide-export-checkbox')?.addEventListener('change', (e) => {
        signature.options.guideLineExport = e.target.checked;
    });

    // control: guideline baseline settings
    const updateGuideLine = () => {
        const checkbox = document.querySelector('.guide-checkbox');
        const textInput = document.querySelector('.guide-text');
        
        if (checkbox && checkbox.checked) {
            signature.options.guideLine = (textInput && textInput.value !== '') ? textInput.value : true;
        } else {
            signature.options.guideLine = null;
        }
        signature._redraw();
    };

    document.querySelector('.guide-checkbox')?.addEventListener('change', updateGuideLine);
    document.querySelector('.guide-text')?.addEventListener('input', updateGuideLine);

    // control: cursor pointer settings
    document.querySelector('.cursor-selector')?.addEventListener('change', (e) => {
        const value = e.target.value;
        const pathGroup = document.querySelector('.cursor-path-group');
        const pathInput = document.querySelector('.cursor-path-input');

        if (value === 'custom') {
            if (pathGroup) pathGroup.style.display = 'flex';
            if (pathInput) {
                signature.setPen(pathInput.value || 'crosshair');
            }
        } else {
            if (pathGroup) pathGroup.style.display = 'none';
            signature.setPen(value);
        }
    });

    document.querySelector('.cursor-path-input')?.addEventListener('input', (e) => {
        signature.setPen(e.target.value || 'crosshair');
    });

    // control: copy data output to clipboard
    document.querySelector('.copy-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        const dataText = signature.inputElement ? signature.inputElement.value : '';
        if (!dataText) return;

        navigator.clipboard.writeText(dataText).then(() => {
            const btn = document.querySelector('.copy-btn');
            if (btn) {
                const origHTML = btn.innerHTML;
                btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                setTimeout(() => {
                    btn.innerHTML = origHTML;
                }, 2000);
            }
        }).catch((err) => {
            console.error('failed to copy text: ', err);
        });
    });

    signature.on('change', (data) => {
        const preview = document.querySelector('.data-preview');
        if (preview) {
            preview.textContent = data ? data.substring(0, 100) + '...' : 'No signature data...';
        }
    });
}

console.log('vSignature initialized successfully.');