var http = require('http');
var url = require('url');
var config = require('./config.json');

global.getCWBattleData = async function(players) {
    let data = JSON.parse(await postRequest(config.cw_start_url, {players: players}));

    if(data.error) {
        throw data.error;
    }

    if(!data.sides || data.sides.length < 1) {
        throw new Error("Not enough info returned from Clanwars server");
    }

    return data;
}

global.sendCWBattleData = function(data) {
    postRequest(config.cw_end_url, data).catch(err => {
        console.warn("Clanwars game end error", err);
    });
}

var postRequest = function(cwUrl, data) {
    return new Promise((resolve, reject) => {
        let json = JSON.stringify(data);
        let options = url.parse(cwUrl);
        options.method = 'POST';
        options.headers = {
            'Content-Type': 'application/json',
            'Content-Length': json.length
        };

        let resData = '';
        let req = http.request(options, res => {
            console.log("Clanwar Server Response", res.statusCode);

            if(res.statusCode < 200 || res.statusCode > 299) {
                reject(new Error("Clanwars server error: " + res.statusCode));
                return;
            }

            res.setEncoding('utf8');

            res.on('data', data => {
                resData += data;
            });

            res.on('end', () => resolve(resData));
            res.on('error', err => reject(err));
        });

        req.on('error', err => reject(err));
        req.write(json);
        req.end();
    });
}
