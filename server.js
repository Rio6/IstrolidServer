require('./fix');

var Istrolid = require('./istrolid.js');
var WebSocket = require('ws');

var wss = new WebSocket.Server({port: 8080});


global.sim = new Sim();
sim.cheatSimInterval = 0;
sim.lastSimInterval = 0;

var players = {};

wss.on('connection', (ws, req) => {
    console.log("connection from", req.connection.remoteAddress);

    ws.on('message', msg => {
        let id = req.headers['sec-websocket-key'];
        let packet = new DataView(new Uint8Array(msg).buffer);
        let data = sim.zJson.loadDv(packet);
        if(data[0] === "playerJoin") {
            players[id] = sim.playerJoin(...data);
            sim.clearNetState();
        } else if(sim[data[0]]) {
            sim[data[0]].apply(sim, [players[id],...data.slice(1)]);
        }
    });
});

setInterval(() => {
    let rightNow = now();
    if (sim.lastSimInterval + 1000 / 16 + sim.cheatSimInterval <= rightNow) {
        sim.lastSimInterval = rightNow;

        if(!sim.paused) {
            sim.simulate();
        } else {
            sim.startingSim();
        }

        let packet = sim.send();
        wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(packet);
            }
        });
    }
}, 17);

var repl = require('repl');
var ctx = repl.start().context;
