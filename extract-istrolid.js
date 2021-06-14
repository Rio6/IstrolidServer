#!/usr/bin/env node
const fs = require('fs/promises');

const needed = [
    'lib/mtwist.js',
    'src/hspace.js',
    'src/protocol.js',
    'src/maths.js',
    'src/maps.js',
    'src/sim.js',
    'src/interpolator.js',
    'src/things.js',
    'src/unit.js',
    'src/parts.js',
    'src/ai.js',
    'src/aidata.js',
    'src/grid.js',
    'src/colors.js',
    'src/utils.js',
    'src/zjson.js',
    'src/survival.js',
];

const file_regex = /^\/\/from (.*?\.js).*?(?=\/\/from)/gms;

async function main() {
    if(process.argv.length <= 3) {
        console.log(`${process.argv[0]} ${process.argv[1]} <istrolid.cat.js> <output>`);
        process.exit(1);
    }

    const cat = await fs.readFile(process.argv[2], { encoding: 'utf-8' });
    const out = Array.from(cat.matchAll(file_regex))
        .filter(match => needed.includes(match[1]))
        .map(match => match[0])
        .reduce((a, c) => a + c);

    fs.writeFile(process.argv[3], out, { encoding: 'utf-8' });
}

main().catch(console.error);
