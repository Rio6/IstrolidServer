var http = require('http');
var url = require('url');
var WebSocket = require('ws');

const PORT = 8080;
const ROOT_ADDR = 'ws://198.199.109.223:88'

var httpServer = http.createServer();
var rootWss = new WebSocket.Server({noServer: true});
var serverWss = new WebSocket.Server({noServer: true});

var servers = {};

rootWss.on('connection', (ws, req) => {
    console.log("proxying", req.connection.remoteAddress);
    let root = new WebSocket(ROOT_ADDR);

    root.on('message', data => {
        //console.log("root", data);
        if(ws.readyState === WebSocket.OPEN) {
            ws.send(data);
            let parsed = JSON.parse(data);
            if(parsed[0] === 'servers') {
                ws.send(JSON.stringify(['serversDiff', servers]));
            }
        }
    });
    root.on('close', e => {
        ws.close();
    });

    ws.on('message', data => {
        //console.log("client", data.substring(0, 100));
        if(root.readyState === WebSocket.OPEN)
            root.send(data);
    });
    ws.on('close', e => {
        root.close();
    });
});

rootWss.sendToAll = data => {
    rootWss.clients.forEach(client => {
        if(client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
};

serverWss.on('connection', (ws, req) => {
    console.log('server from', req.connection.remoteAddress);

    ws.on('message', msg => {
        let data = JSON.parse(msg);
        switch(data[0]) {
            case 'info': {
                let name = data[1];
                let infoDiff = data[2];
                if(name && infoDiff) {
                    // Broadcast to clients
                    let data = {};
                    data[name] = infoDiff;
                    rootWss.sendToAll(JSON.stringify(['serversDiff', data]));

                    // Update servers
                    servers[name] = Object.assign(servers[name] || {}, infoDiff);
                }
                break;
            }
            case 'message':
            default:
                rootWss.sendToAll(msg);
                break;
        }
    });
});

httpServer.on('upgrade', (req, socket, head) => {
    let path = url.parse(req.url).pathname;

    if(path === '/') {
        rootWss.handleUpgrade(req, socket, head, ws => {
            rootWss.emit('connection', ws, req);
        });
    } else if(path === '/server') {
        serverWss.handleUpgrade(req, socket, head, ws => {
            serverWss.emit('connection', ws, req);
        });
    } else {
        socket.destroy();
    }
});

httpServer.listen(PORT);
