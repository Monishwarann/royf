const { 
    MultiFormatReader, 
    BarcodeFormat, 
    DecodeHintType, 
    RGBLuminanceSource, 
    BinaryBitmap, 
    HybridBinarizer,
    GlobalHistogramBinarizer 
} = require('@zxing/library');
const { Jimp } = require('jimp');
const fs = require('fs');

class BarcodeDecoder {
    constructor() {
        this.reader = new MultiFormatReader();
        this.hints = new Map();
        const formats = [
            BarcodeFormat.QR_CODE,
            BarcodeFormat.EAN_13,
            BarcodeFormat.EAN_8,
            BarcodeFormat.CODE_128,
            BarcodeFormat.CODE_39,
            BarcodeFormat.UPC_A,
            BarcodeFormat.UPC_E,
            BarcodeFormat.ITF,
            BarcodeFormat.DATA_MATRIX,
            BarcodeFormat.PDF_417,
            BarcodeFormat.AZTEC
        ];
        this.hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
        this.hints.set(DecodeHintType.TRY_HARDER, true);
        this.hints.set(DecodeHintType.PURE_BARCODE, false);
        this.reader.setHints(this.hints);
    }

    async decode(imagePath) {
        console.log(`[BarcodeDecoder] Intensive decoding started for: ${imagePath}`);
        try {
            const originalImage = await Jimp.read(imagePath);
            
            // Define processing pipelines - ordered by most likely to succeed
            const pipelines = [
                // 1. Original (with slight contrast)
                { name: 'Standard', fn: img => img.contrast(0.2) },
                
                // 2. High Contrast (good for low light)
                { name: 'High Contrast', fn: img => img.contrast(0.6).brightness(0.1) },
                
                // 3. Sharpened (good for blurry shots)
                { name: 'Sharpened', fn: img => img.contrast(0.4).convolute([[-1,-1,-1],[-1,9,-1],[-1,-1,-1]]) },
                
                // 4. Normalized & Contrast
                { name: 'Normalized', fn: img => img.normalize().contrast(0.4) },

                // 5. Large Scale (crucial for small barcodes)
                { name: 'Resized Large', fn: img => img.resize(1600, Jimp.AUTO).contrast(0.3) },
                
                // 6. Medium Scale
                { name: 'Resized Medium', fn: img => img.resize(1000, Jimp.AUTO).contrast(0.2) },

                // 7. Inverted (for white-on-black barcodes)
                { name: 'Inverted', fn: img => img.invert().contrast(0.3) },
                
                // 8. Rotated 90
                { name: 'Rotate 90', fn: img => img.rotate(90).contrast(0.2) },
                
                // 9. Rotated 270
                { name: 'Rotate 270', fn: img => img.rotate(270).contrast(0.2) },
                
                // 10. Denoised
                { name: 'Denoised', fn: img => img.blur(1).contrast(0.3) }
            ];

            for (const pipeline of pipelines) {
                try {
                    const processed = await pipeline.fn(originalImage.clone());
                    
                    // Try with Hybrid Binarizer
                    let result = await this.tryDecode(processed, false);
                    if (result) {
                        console.log(`[BarcodeDecoder] Success: ${pipeline.name} (Hybrid)`);
                        return result;
                    }

                    // Try with Global Binarizer
                    result = await this.tryDecode(processed, true);
                    if (result) {
                        console.log(`[BarcodeDecoder] Success: ${pipeline.name} (Global)`);
                        return result;
                    }
                } catch (e) {
                    console.warn(`[BarcodeDecoder] Pipeline ${pipeline.name} error: ${e.message}`);
                }
            }

            console.log(`[BarcodeDecoder] All 20 attempts failed for: ${imagePath}`);
            return null;
        } catch (error) {
            console.error(`[BarcodeDecoder] Fatal error: ${error.message}`);
            return null;
        }
    }

    async tryDecode(jimpImage, useGlobalBinarizer = false) {
        try {
            const { data, width, height } = jimpImage.bitmap;
            const len = width * height;
            const luminances = new Int32Array(len);
            
            for (let i = 0; i < len; i++) {
                const r = data[i * 4];
                const g = data[i * 4 + 1];
                const b = data[i * 4 + 2];
                // RGBLuminanceSource expects packed Int32 pixels: 0xRRGGBB
                // We use bitwise OR to pack them correctly. 
                // Note: The library will calculate luminance from these values.
                luminances[i] = (r << 16) | (g << 8) | b;
            }

            const source = new RGBLuminanceSource(luminances, width, height);
            const binarizer = useGlobalBinarizer 
                ? new GlobalHistogramBinarizer(source) 
                : new HybridBinarizer(source);
            const bitmap = new BinaryBitmap(binarizer);

            const result = this.reader.decode(bitmap);
            return result.getText();
        } catch (err) {
            return null;
        }
    }
}

module.exports = new BarcodeDecoder();


