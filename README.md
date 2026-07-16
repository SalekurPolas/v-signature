# v-signature

[![NPM Version](https://img.shields.io/npm/v/v-signature.svg?style=flat-square)](https://www.npmjs.com/package/v-signature)
[![NPM Downloads](https://img.shields.io/npm/dm/v-signature.svg?style=flat-square)](https://www.npmjs.com/package/v-signature)
[![License](https://img.shields.io/npm/l/v-signature.svg?style=flat-square)](https://github.com/SalekurPolas/v-signature/blob/master/LICENSE)

> 🌐 **[Live Demo / Interactive Playground Studio](https://salekurpolas.github.io/v-signature)**

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
import vSignature from 'v-signature';

// make it globally accessible if needed
window.vSignature = vSignature;
```

### CommonJS

```javascript
const vSignature = require('v-signature');

window.vSignature = vSignature;
```

---

## Quick Start

Create a hidden input element to hold the signature base64 data stream:

```html
<input type="hidden" id="signature-data" class="signature">
```

Initialize `vSignature` in your script:

```javascript
document.addEventListener('DOMContentLoaded', () => {
    // initialize using input selector
    const signature = new vSignature('signature-data');
});
```

---

## Configuration Options

You can pass configuration parameters during initialization to style the canvas, change brush physics, add watermarks, and customize pointer icons:

```javascript
const signature = new vSignature('signature-data', {
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
        // options: 'fountain' | 'pen' | 'quill' | 'feather' | 'calligraphy' | 'gel' | 'brush' | 'highlighter' | 'custom'
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
        // options: 'default' | 'pen' | 'feather' | 'pencil' | 'custom' | custom image path/URL string
        pen: 'default',

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

- **`toPNG()`**: Returns base64 PNG data URL string containing the transparent signature.
  ```javascript
  const pngDataUrl = signature.toPNG();
  ```

- **`downloadPNG()`**: Triggers browser file download of the transparent signature as a PNG file.
  ```javascript
  signature.downloadPNG();
  ```

- **`toJPEG()`**: Returns base64 JPEG data URL string containing the signature on a solid white background.
  ```javascript
  const jpegDataUrl = signature.toJPEG();
  ```

- **`downloadJPEG()`**: Triggers browser file download of the signature as a solid white-background JPEG file.
  ```javascript
  signature.downloadJPEG();
  ```

- **`toSVG()`**: Generates and returns raw vector inline SVG XML markup string.
  ```javascript
  const svgMarkup = signature.toSVG();
  ```

- **`downloadSVG()`**: Triggers browser file download of the signature as a vector `.svg` file.
  ```javascript
  signature.downloadSVG();
  ```

- **`toTrimmedPNG()`**: Automatically crops margins and returns base64 PNG data URL cropped directly to drawing bounds.
  ```javascript
  const trimmedPngUrl = signature.toTrimmedPNG();
  ```

- **`downloadTrimmedPNG()`**: Triggers browser file download of the cropped transparent signature as a PNG file.
  ```javascript
  signature.downloadTrimmedPNG();
  ```

- **`toTrimmedJPEG()`**: Automatically crops margins and returns base64 JPEG data URL cropped directly to drawing bounds on a white background.
  ```javascript
  const trimmedJpegUrl = signature.toTrimmedJPEG();
  ```

- **`downloadTrimmedJPEG()`**: Triggers browser file download of the cropped signature as a white-background JPEG file.
  ```javascript
  signature.downloadTrimmedJPEG();
  ```

- **`toTrimmedSVG()`**: Generates and returns cropped vector XML SVG markup string dynamically using viewBox coordinates.
  ```javascript
  const trimmedSvg = signature.toTrimmedSVG();
  ```

- **`downloadTrimmedSVG()`**: Triggers browser file download of the cropped signature as a vector `.svg` file.
  ```javascript
  signature.downloadTrimmedSVG();
  ```

- **`toData()`**: Exports raw array of stroke coordinates and speed dynamics.
  ```javascript
  const strokes = signature.toData();
  ```

- **`fromData(data)`**: Imports and renders raw coordinates onto the signature canvas.
  ```javascript
  signature.fromData(strokes);
  ```

---

## License

MIT License. See the [LICENSE](https://github.com/SalekurPolas/v-signature/blob/master/LICENSE) file.