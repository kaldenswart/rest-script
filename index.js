const config = require("./example-config.json");

const express = require("express");
const { spawn } = require("child_process");

const app = express();

app.get("/:module", (req, res) => {
    const module_key = req.params.module.replace(/[^a-zA-Z0-9\-]/g, '');

    if(config.modules[module_key] !== undefined){
        const module = config.modules[module_key];
        const commands = module.commands;

        for(let i = 0; i < commands.length; i++){
            let c_meta = commands[i];
            executeCommand(c_meta.command, c_meta.args, c_meta.cwd).then((log) => {
                res.status(200).send(log);
            }).catch((log) => {
                res.status(500).send(log);
            });
        }
    }else{
        res.status(400).send();
    }
});

app.listen(config.port, config.listen);

function executeCommand(command, arguments, cwd){
    return new Promise(async (resolve, reject) => {

        const child = spawn(command, arguments, { cwd: cwd });
        let log = "";

        child.stdout.on('data', (chunk) => {
            if(chunk.length > 0) {
                log += chunk;
            }
        });

        child.stderr.on('data', (chunk) => {
            if(chunk.length > 0) {
                log += chunk;
            }
        });

        child.on('error', function (err) {
            log += err.message;
            console.error(err);
        });

        child.on("close", async (code) => {
            if(code === 0){
                resolve(log);
            }else{
                reject(log);
            }
        });
    });
}