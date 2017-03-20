'use strict';

import BlAddonDB from 'bl_add-on_db_t';
const db = new BlAddonDB();

import fs from 'fs';
import path from 'path';

const CONFIG_FILE = path.resolve('./config.json');

let text = fs.readFileSync(CONFIG_FILE, 'utf8');
console.log("Parsing configuration file ...");
let config = JSON.parse(text);
console.log("Parsed configuration file ...");

db.init(config, 1, 5, 0, 499);
db.buildAddonDB( () => {
    console.log("fin");
});

loop();

function loop() {
    console.log("loop");
    setTimeout(() => { loop() }, 10000);
}
