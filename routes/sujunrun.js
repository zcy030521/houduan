const express = require('express');
const router = express.Router();

const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 3001 });

// 模拟数据
let data = {
    paymentOrders: 231,
    paymentAmount: 1000.21,
    activeUsers: 120311,
    conversionRate: 0.53,
    averageOrderValue: 32.00,
    newUsers: 122
};

// 定时更新数据并发送给客户端
setInterval(() => {
    data.paymentOrders = Math.floor(Math.random() * 1000);
    data.paymentAmount = (Math.random() * 10000).toFixed(2);
    data.activeUsers = Math.floor(Math.random() * 1000000);
    data.conversionRate = (Math.random() * 1).toFixed(2);
    data.averageOrderValue = (Math.random() * 100).toFixed(2);
    data.newUsers = Math.floor(Math.random() * 1000);

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}, 2000);

module.exports = router;