var http = require('http');
var url = require('url');
require('./fix');

const ADDR = 'localhost'
const PORT = 8080;
const ROOT_ADDR = 'ws://198.199.109.223:88'

const SERVER_NAME = 'R26';
const SERVER_PATH = '/server';

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
    var info = {};

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
            //console.log("root", data);
            if(ws.readyState === WebSocket.OPEN) {
                ws.send(data);
                if(JSON.parse(data)[0] === 'servers') {
                    let data = {};
                    data[SERVER_NAME] = info;
                    ws.send(JSON.stringify(['serversDiff', data]));
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
                client.send(JSON.stringify(data));
            }
        });
    };

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
        } else if(path === SERVER_PATH) {
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

            // Send server info
            let newInfo = {
                name: SERVER_NAME,
                address: "ws://" + ADDR + ":" + PORT + SERVER_PATH,
                observers: sim.players.length,
                players: sim.players.map(p => { return {
                    name: p.name,
                    side: p.side,
                    ai: p.ai
                }}),
                type: sim.serverType,
                version: VERSION,
                state: sim.state
            };
            let diffInfo = {};
            for(let k in newInfo) {
                if(!simpleEquals(info[k], newInfo[k])) {
                    diffInfo[k] = newInfo[k];
                }
            }

            if(Object.keys(diffInfo).length > 0) {
                let data = {};
                data[SERVER_NAME] = diffInfo;
                rootWss.sendToAll(['serversDiff', data]);
                info = newInfo;
            }
        }
    }, 17);

    httpServer.listen(PORT);
};

global.server = new Server();

var repl = require('repl');
var ctx = repl.start().context;
