const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

app.use('/firebase', createProxyMiddleware({
    target: 'https://firebasestorage.googleapis.com',
    changeOrigin: true,
    pathRewrite: { '^/firebase': '' },
}));

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Proxy server is running on http://localhost:${PORT}`);
});
