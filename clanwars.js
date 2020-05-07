var http = require('http');
var url = require('url');
var config = require('./config.json');

global.getCWBattleData = async function(players) {
    let data = JSON.parse(await getRequest(config.cw_start_url));

    if(data.error) {
        throw new Error(data.error);
    }

    if(!data.sides || data.sides.length < 2) {
        throw new Error("Not enough sides");
    }

    return {
        alpha: data.sides[0],
        beta: data.sides[1]
    };
}

var getRequest = function(cwUrl) {
    return new Promise((resolve, reject) => {
        let resData = '';
        let req = http.request(url.format(cwUrl), res => {
            console.log("Clanwar Server Response", res.statusCode);
            res.setEncoding('utf8');

            res.on('data', data => {
                resData += data;
            });

            res.on('end', () => resolve(resData));
            res.on('error', err => reject(err));
        });
        req.end();
    });
}
