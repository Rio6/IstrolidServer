var http = require('http');
var url = require('url');
require('./fix');

const PORT = 8080;
const ROOT_ADDR = 'ws://198.199.109.223:88'

var Istrolid = require('./istrolid.js');
var WebSocket = require('ws');

global.sim = new Sim();
sim.cheatSimInterval = -12;
sim.lastSimInterval = 0;

global.Server = function() {

    var httpServer = http.createServer();
    var wss = new WebSocket.Server({noServer: true});
    var rootWss = new WebSocket.Server({noServer: true});

    var players = {};

    this.send = (player, data) => {
        let packet = sim.zJson.dumpDv(data);
        let client = player.ws;
        if(client && client.readyState === WebSocket.OPEN) {
            client.send(packet);
        }
    };

    this.stop = () => {
        console.log("stopping server");
        httpServer.close();
        wss.close();
        rootWss.close();
        clearInterval(interval);
    };

    this.say = msg => {
        console.log(msg);
    };

    rootWss.on('connection', (ws, req) => {
        console.log("proxying", req.connection.remoteAddress);

        let root = new WebSocket(ROOT_ADDR);

        root.on('message', data => {
            ws.send(data);
        });
        root.on('close', e => {
            ws.close();
        });

        ws.on('message', data => {
            root.send(data);
        });
        ws.on('close', e => {
            root.close();
        });
    });

    wss.on('connection', (ws, req) => {
        console.log("connection from", req.connection.remoteAddress);

        let id = req.headers['sec-websocket-key'];

        ws.on('message', msg => {
            let packet = new DataView(new Uint8Array(msg).buffer);
            let data = sim.zJson.loadDv(packet);
            //console.log(data);
            if(data[0] === 'playerJoin') {
                let player = sim.playerJoin(...data);
                player.ws = ws;
                players[id] = player;
                sim.clearNetState();
            } else if(sim[data[0]]) {
                sim[data[0]].apply(sim, [players[id],...data.slice(1)]);
            }
        });

        ws.on('close', e => {
            delete players[id];
        });
    });

    httpServer.on('upgrade', (req, socket, head) => {
        let path = url.parse(req.url).pathname;

        if(path === '/') {
            rootWss.handleUpgrade(req, socket, head, ws => {
                rootWss.emit('connection', ws, req);
            });
        } else if(path === '/server') {
            wss.handleUpgrade(req, socket, head, ws => {
                wss.emit('connection', ws, req);
            });
        } else {
            socket.destroy();
        }
    });

    var interval = setInterval(() => {
        let rightNow = now();
        if(sim.lastSimInterval + 1000 / 16 + sim.cheatSimInterval <= rightNow) {
            sim.lastSimInterval = rightNow;

            if(!sim.paused) {
                sim.simulate();
            } else {
                sim.startingSim();
            }

            let packet = sim.send();
            wss.clients.forEach(client => {
                if(client.readyState === WebSocket.OPEN) {
                    client.send(packet);
                }
            });
        }
    }, 17);

    httpServer.listen(PORT);
};

global.server = new Server();

var repl = require('repl');
var ctx = repl.start().context;
