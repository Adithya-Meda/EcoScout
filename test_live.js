const https = require('https');
const fs = require('fs');

// Create a valid base64 PNG data URL of a 100x100 green image
const base64Png = "iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEwAACxMBAJqcGAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAACCSURBVHic7c4BDQAADAMg9695q3g24AEJSAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAODLZwctXwGtJg6xAAAAAElFTkSuQmCC";

const payload = JSON.stringify({
  city: "Bengaluru",
  postalCode: "560001",
  imageBase64: base64Png,
  mimeType: "image/png"
});

console.log("Sending payload of length:", payload.length);

const req = https.request('https://dh3e5zck76.execute-api.us-east-1.amazonaws.com/prod/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, res => {
  console.log('STATUS:', res.statusCode);
  console.log('HEADERS:', res.headers);
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('RESPONSE BODY:');
    console.log(body);
  });
});

req.on('error', e => console.error("REQUEST ERROR:", e));
req.write(payload);
req.end();
