"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IO = require("socket.io");
const Url = require("url");
const Qs = require("querystring");
const net = require("net");
const http = require("http");
function main(port) {
    const p = new Promise(resolve => {
        const hServer = http.createServer();
        const io = IO(hServer, {
            path: "/ws",
            serveClient: false,
            // below are engine.IO options
            pingInterval: 10000,
            pingTimeout: 5000,
            cookie: false
        });
        io.on("connection", client => {
            let lastActive = new Date().getTime();
            console.log("server receive connection", client.request.url);
            const url = Url.parse(client.request.url);
            const qs = Qs.parse(url.query);
            const tmpBuffer = [];
            try {
                const socket = net.connect({
                    host: qs.destHost,
                    port: parseInt(qs.destPort, 10)
                }, () => {
                    console.log("proxy server connect to tcp server", tmpBuffer.length);
                    let tmp;
                    while ((tmp = tmpBuffer.pop())) {
                        socket.write(tmp);
                    }
                    socket.on("data", data => {
                        client.emit("res", data);
                    });
                });
                client.on("req", data => {
                    lastActive = new Date().getTime();
                    console.log("req", [data.length, socket.connecting]);
                    if (!socket.connecting) {
                        socket.write(data);
                    }
                    else {
                        tmpBuffer.push(data);
                    }
                });
                const clear = () => {
                    const now = new Date().getTime();
                    if (now - lastActive > 10000) {
                        console.log("destroy after 10s");
                        socket.destroy();
                        client.disconnect();
                    }
                    else {
                        setTimeout(clear, 10000);
                    }
                };
                setTimeout(clear, 10000);
            }
            catch (error) {
                client.disconnect();
            }
        });
        hServer.listen(port, () => {
            console.log("proxy server listen to", port);
        });
        resolve();
    });
    return p;
}
module.exports = main;
