# v-signature

[![NPM Version](https://img.shields.io/npm/v/v-signature.svg?style=flat-square)](https://www.npmjs.com/package/v-signature)
[![NPM Downloads](https://img.shields.io/npm/dm/v-signature.svg?style=flat-square)](https://www.npmjs.com/package/v-signature)
[![License](https://img.shields.io/npm/l/v-signature.svg?style=flat-square)](https://github.com/SalekurPolas/v-signature/blob/master/LICENSE)

> 🌐 **[Live Demo / Interactive Playground Studio](https://salekurpolas.github.io/vsignature)**

`v-signature` is an ultra-lightweight, responsive HTML5 canvas signature pad library written in pure vanilla JavaScript. Capture smooth, high-fidelity digital signatures using dynamic calligraphy brush dynamics, custom text watermarks, baseline signing guidelines, and export them instantly to vector SVG, JPEG, PNG, or whitespace-trimmed signature images.

Designed for seamless integration into Laravel, React, Vue, Angular, Node, and vanilla web applications.

---

## Key Features

* 🚀 **Zero Dependencies**: Lightweight vanilla JavaScript capture engine.
* 🖋️ **Premium Brush Presets**: built-in Fountain, Feather Quill, Gel, Calligraphy Brush, and Highlighter pen presets.
* 📈 **Dynamic Physics**: Velocity-sensitive line width calculations for expressive drawing.
* 📐 **Baseline Guideline Layer**: Dotted signature helper line with titles (can be omitted on export).
* 🏢 **Watermark Support**: Draw transparent text watermarks rotated behind drawings.
* 🖱️ **Custom Pointer Cursors**: Self-contained SVG pointers (fountain pen, quill, pencil) that work anywhere.
* ✂️ **Whitespace Autocropping**: Trim margins automatically to export only the signature bounding box.
* 💾 **Multiple Formats**: Export drawings as SVG (vector XML code), JPEG, standard PNG, or trimmed PNG.
* 🎨 **Photoshop Studio UI**: Responsive, fullscreen, double-sidebar playground demo page.

---

## Installation

Install `v-signature` via npm:

```bash
npm install v-signature
```

---

## Importing

### ES Modules

```javascript
import { VSignature } from 'v-signature';

// make it globally accessible if needed
window.VSignature = VSignature;
```

### CommonJS

```javascript
const { VSignature } = require('v-signature');

window.VSignature = VSignature;
```

---

## Quick Start

Create a hidden input element to hold the signature base64 data stream:

```html
<input type="hidden" id="signature-data" class="signature">
```

Initialize `VSignature` in your script:

```javascript
document.addEventListener('DOMContentLoaded', () => {
    // initialize using input selector
    const signature = new VSignature('signature-data');
});
```

---

## Configuration Options

You can pass configuration parameters during initialization to style the canvas, change brush physics, add watermarks, and customize pointer icons:

```javascript
const signature = new VSignature('signature-data', {
    // structural elements
    canvas: 'custom-canvas-id', // optional custom canvas element selector
    clear: 'clear-btn-id',       // optional clear trigger selector
    save: 'save-btn-id',         // optional save trigger selector
    undo: 'undo-btn-id',         // optional undo trigger selector
    redo: 'redo-btn-id',         // optional redo trigger selector

    options: {
        // canvas dimensions
        width: '100%',
        height: '350px',
        backgroundColor: '#ffffff',
        border: '1px dashed #cccccc',
        borderRadius: '8px',
        disabled: false,

        // brush style preset
        // options: 'fountain' | 'quill' | 'gel' | 'brush' | 'highlighter' | 'custom'
        style: 'fountain',
        color: '#000000',
        lineWidth: 2,
        lineJoin: 'round', // options: 'round' | 'bevel' | 'miter'
        opacity: 1.0,

        // custom physics (active when style is 'custom' or 'fountain')
        minWidth: 0.5,
        maxWidth: 3.0,
        velocitySensitivity: 0.7,

        // shadow blur / ink bleed
        shadowBlur: 0,
        shadowColor: null,

        // cursor pointer styling
        // options: 'crosshair' | 'fountain' | 'quill' | 'pencil' | custom image path
        pen: 'crosshair',

        // custom watermark layer
        watermark: null, // watermark text string
        watermarkColor: 'rgba(0, 0, 0, 0.05)',
        watermarkFont: '32px sans-serif',
        watermarkAngle: -30,

        // guideline baseline layer
        guideLine: null, // text description (e.g. "sign here") or true for line only
        guideLineColor: 'rgba(0, 0, 0, 0.15)',
        guideLineExport: false // set true to burn guideline into export files
    }
});
```

---

## Public Methods

- **`on(event, callback)`**: Register an event callback for canvas updates.
  ```javascript
  // listen to changes
  signature.on('change', (data) => {
      console.log('signature changed: ', data);
  });
  ```

- **`isEmpty()`**: Returns `true` if the signature canvas is empty.
  ```javascript
  if (signature.isEmpty()) {
      console.log('canvas is empty');
  }
  ```

- **`disable()`**: Locks the signature pad to prevent drawing.
  ```javascript
  signature.disable();
  ```

- **`enable()`**: Unlocks the signature pad to allow drawing.
  ```javascript
  signature.enable();
  ```

- **`clear()`**: Wipes all strokes and resets the canvas state.
  ```javascript
  signature.clear();
  ```

- **`undo()`**: Undo the last drawn vector stroke.
  ```javascript
  signature.undo();
  ```

- **`redo()`**: Redo the last undone vector stroke.
  ```javascript
  signature.redo();
  ```

- **`setPen(type)`**: Change the active cursor pointer style dynamically.
  ```javascript
  signature.setPen('quill');
  ```

- **`toPNG()`**: Trigger browser download of signature as standard PNG.
  ```javascript
  signature.toPNG();
  ```

- **`toJPEG()`**: Trigger browser download of signature as standard JPEG.
  ```javascript
  signature.toJPEG();
  ```

- **`toSVG()`**: Generate raw vector SVG XML code.
  ```javascript
  const svgMarkup = signature.toSVG();
  ```

- **`downloadSVG()`**: Trigger browser download of signature as vector SVG file.
  ```javascript
  signature.downloadSVG();
  ```

- **`toTrimmedPNG()`**: Computes stroke bounding box and returns cropped base64 PNG data URL (removes empty spacing).
  ```javascript
  const croppedData = signature.toTrimmedPNG();
  ```

- **`downloadTrimmed()`**: Trigger browser download of cropped/trimmed PNG file.
  ```javascript
  signature.downloadTrimmed();
  ```

- **`toData()`**: Export raw point vectors array.
  ```javascript
  const strokes = signature.toData();
  ```

- **`fromData(data)`**: Load and redraw signature from raw point vectors array.
  ```javascript
  signature.fromData(strokes);
  ```

---

## License

MIT License. See the [LICENSE](https://github.com/SalekurPolas/v-signature/blob/master/LICENSE) file.