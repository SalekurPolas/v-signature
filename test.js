import vSignature from './index.js';

// simple sanity check for node environment
if (typeof document === 'undefined') {
    // if running in Node, 
    // mock the bare minimum dom apis to ensure it doesn't crash on init
    globalThis.document = {
        querySelector: (selector) => {
            if (selector === '.signature' || selector === '.clear' || selector === '.save' || selector === '.undo' || selector === '.redo') {
                return {
                    style: {},
                    parentNode: {
                        insertBefore: () => {}
                    },
                    addEventListener: () => {},
                    getBoundingClientRect: () => ({ 
                        width: 300, 
                        height: 150, 
                        left: 0, 
                        top: 0, 
                        right: 300, 
                        bottom: 150 
                    })
                };
            }
            return null;
        },
        createElement: () => ({
            style: {},
            getContext: () => ({
                scale: () => {},
                clearRect: () => {}
            }),
            addEventListener: () => {},
            getBoundingClientRect: () => ({ 
                width: 300, 
                height: 150, 
                left: 0, 
                top: 0, 
                right: 300, 
                bottom: 150 
            })
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
    minWidth: 0.5,
    maxWidth: 3,
});

// bind ui actions if running in the browser
if (typeof document !== 'undefined') {
    document.querySelector('.save-jpg')?.addEventListener('click', (e) => {
        e.preventDefault();
        signature.toJPEG();
    });
    
    document.querySelector('.save-svg')?.addEventListener('click', (e) => {
        e.preventDefault();
        signature.downloadSVG();
    });

    signature.on('change', (data) => {
        const preview = document.querySelector('.data-preview');
        if (preview) {
            preview.textContent = data ? data.substring(0, 100) + '...' : 'No signature data...';
        }
    });
}

console.log('vSignature initialized successfully.');