// proxy.js
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import CryptoJS from 'crypto-js';
import dotenv from 'dotenv';

dotenv.config(); // Loads .env vars

const app = express();
const port = 3001;

const devId = process.env.VITE_PTV_DEV_ID;
const apiKey = process.env.VITE_PTV_API_KEY;

// ✅ Add CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // You can lock this down to localhost:5173
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// ✅ Sign PTV requests
app.use('/api/ptv', (req, res, next) => {
  const fullUrl = req.originalUrl.replace('/api/ptv', '');
  const [path, query = ''] = fullUrl.split('?');

  const sigBase = `${path}?${query}${query ? '&' : ''}devid=${devId}`;
  const signature = CryptoJS.HmacSHA1(sigBase, apiKey).toString();

  req.url = `${path}?${query}${query ? '&' : ''}devid=${devId}&signature=${signature}`;
  next();
});

// ✅ Proxy to PTV API
app.use(
  '/api/ptv',
  createProxyMiddleware({
    target: 'https://timetableapi.ptv.vic.gov.au',
    changeOrigin: true,
    secure: true,
  })
);

app.listen(port, () => {
  console.log(`🚀 PTV Proxy running at http://localhost:${port}`);
});
