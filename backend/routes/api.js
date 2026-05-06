const express = require('express');
const router = express.Router();
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const barcodeDecoder = require('../utils/barcodeDecoder');

// Configure Multer for in-memory processing (works on Vercel & Local)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Simple in-memory cache for scans
const scanCache = new Map();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

// Get product data and check safety
router.get('/scan/:barcode', async (req, res) => {
  const { barcode } = req.params;
  const { allergies, diet } = req.query; // Allergies and diet passed from frontend
  const cacheKey = `${barcode}_${allergies || 'none'}_${diet || 'none'}`;

  // Check cache first
  if (scanCache.has(cacheKey)) {
    const cached = scanCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[Cache Hit] Serving scan result for: ${barcode}`);
      return res.json(cached.data);
    }
    scanCache.delete(cacheKey);
  }

  try {
    // 1. Fetch product from Open Food Facts
    const fields = 'product_name,brands,image_url,ingredients_text,ingredients_text_en,ingredients_text_with_allergens,allergens_tags,status';
    const offUrl = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${fields}`;
    const response = await axios.get(offUrl, {
      headers: {
        'User-Agent': 'TrustBite - Web - Version 1.0 - https://trustbite.example.com'
      }
    });

    if (response.data.status === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const product = response.data.product;
    // Check multiple possible ingredient fields from OFF
    const ingredientsText = product.ingredients_text || 
                            product.ingredients_text_en || 
                            product.ingredients_text_with_allergens || 
                            'No ingredients list available for this product.';
    const allergensTags = product.allergens_tags || [];

    // 2. Handle User Allergies (from query params)
    const userAllergies = allergies ? allergies.split(',') : [];

    // 3. Safety Check Logic
    let unsafeIngredients = [];
    
    userAllergies.forEach(allergy => {
      if (!allergy) return;
      // Check in ingredients text (case insensitive)
      const regex = new RegExp(allergy, 'i');
      if (regex.test(ingredientsText)) {
        unsafeIngredients.push(allergy);
      }
      // Check in allergens tags (e.g., "en:milk")
      const tagMatch = allergensTags.some(tag => tag.toLowerCase().includes(allergy.toLowerCase()));
      if (tagMatch && !unsafeIngredients.includes(allergy)) {
        unsafeIngredients.push(allergy);
      }
    });

    // 4. Diet Check Logic
    const dietRules = {
      vegan: ['milk', 'egg', 'honey', 'meat', 'fish', 'poultry', 'dairy', 'cheese', 'butter', 'whey', 'casein', 'gelatin', 'lard'],
      vegetarian: ['meat', 'fish', 'poultry', 'gelatin', 'lard'],
      halal: ['pork', 'alcohol', 'wine', 'beer', 'lard', 'gelatin']
    };

    if (diet && dietRules[diet]) {
      dietRules[diet].forEach(item => {
        const regex = new RegExp(`\\b${item}\\b`, 'i');
        if (regex.test(ingredientsText) && !unsafeIngredients.includes(item)) {
          unsafeIngredients.push(`${item} (${diet})`);
        }
      });
    }

    const isSafe = unsafeIngredients.length === 0;

    const result = {
      product: {
        name: product.product_name,
        brand: product.brands,
        image: product.image_url,
        ingredients: ingredientsText,
        allergens: allergensTags
      },
      safety: {
        isSafe,
        unsafeIngredients,
        message: isSafe ? 'Safe for you!' : `Warning: Contains ${unsafeIngredients.join(', ')}`
      }
    };

    // Store in cache
    scanCache.set(cacheKey, {
      timestamp: Date.now(),
      data: result
    });

    // Cleanup cache if it gets too large
    if (scanCache.size > 500) {
      const firstKey = scanCache.keys().next().value;
      scanCache.delete(firstKey);
    }

    res.json(result);

    } catch (error) {
      console.error('Scan Error:', error.response?.data || error.message);
      res.status(500).json({ 
        message: 'Error processing scan', 
        details: error.response?.data?.message || error.message 
      });
    }
});

// Scan from uploaded image
router.post('/scan-image', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image file provided' });
  }

  try {
    const { allergies, diet } = req.body;
    console.log(`[ImageScan] Processing buffer from: ${req.file.originalname}`);
    
    // 1. Decode barcode from memory buffer
    const barcode = await barcodeDecoder.decode(req.file.buffer);

    if (!barcode) {
      return res.status(422).json({ message: 'No clear barcode detected in the image.' });
    }

    console.log(`[ImageScan] Detected barcode: ${barcode}`);

    // 2. Reuse the scan logic by redirecting or calling a helper
    // For now, let's just fetch the product directly as we do in the GET route
    const fields = 'product_name,brands,image_url,ingredients_text,ingredients_text_en,ingredients_text_with_allergens,allergens_tags,status';
    const offUrl = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${fields}`;
    
    const response = await axios.get(offUrl, {
      headers: { 'User-Agent': 'TrustBite - Web - Version 1.0' }
    });

    if (response.data.status === 0) {
      return res.status(404).json({ message: 'Product not found in Open Food Facts' });
    }

    const product = response.data.product;
    const ingredientsText = product.ingredients_text || product.ingredients_text_en || 'No ingredients available.';
    const allergensTags = product.allergens_tags || [];
    const userAllergies = allergies ? allergies.split(',') : [];

    let unsafeIngredients = [];
    userAllergies.forEach(allergy => {
      if (!allergy) return;
      const regex = new RegExp(allergy, 'i');
      if (regex.test(ingredientsText)) unsafeIngredients.push(allergy);
      const tagMatch = allergensTags.some(tag => tag.toLowerCase().includes(allergy.toLowerCase()));
      if (tagMatch && !unsafeIngredients.includes(allergy)) unsafeIngredients.push(allergy);
    });

    const dietRules = {
      vegan: ['milk', 'egg', 'honey', 'meat', 'fish', 'poultry', 'dairy', 'cheese', 'butter', 'whey', 'casein', 'gelatin', 'lard'],
      vegetarian: ['meat', 'fish', 'poultry', 'gelatin', 'lard'],
      halal: ['pork', 'alcohol', 'wine', 'beer', 'lard', 'gelatin']
    };

    if (diet && dietRules[diet]) {
      dietRules[diet].forEach(item => {
        const regex = new RegExp(`\\b${item}\\b`, 'i');
        if (regex.test(ingredientsText) && !unsafeIngredients.includes(item)) {
          unsafeIngredients.push(`${item} (${diet})`);
        }
      });
    }

    const isSafe = unsafeIngredients.length === 0;

    res.json({
      product: {
        name: product.product_name,
        brand: product.brands,
        image: product.image_url,
        ingredients: ingredientsText,
        allergens: allergensTags,
        barcode: barcode
      },
      safety: {
        isSafe,
        unsafeIngredients,
        message: isSafe ? 'Safe for you!' : `Warning: Contains ${unsafeIngredients.join(', ')}`
      }
    });

  } catch (error) {
    console.error('Image Scan Error:', error.message);
    res.status(500).json({ message: 'Error processing image scan', details: error.message });
  }
});

module.exports = router;
