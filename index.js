const config = require("./config.json");

const express = require("express");
const { spawn } = require("child_process");

const app = express();

app.get("/:module", (req, res) => {
    const module_key = req.params.module.replace(/[^a-zA-Z0-9\-]/g, '');

    if(config.modules[module_key] !== undefined){
        const module = config.modules[module_key];
        const commands = module.commands;

        (new Promise(async (resolve, reject) => {
            let log = "";
            let error = false;
            for(let i = 0; i < commands.length; i++){
                let c_meta = commands[i];
                log += "Script: " + c_meta.command + c_meta.args.join();
                try{
                    let c_log = await executeCommand(c_meta.command, c_meta.args, c_meta.cwd);
                    log += c_log + "\n\n";
                }catch (c_log){
                    error = true;
                    log += c_log + "\n\n";
                }
            }
            if(!error){
                resolve(log);
            }else{
                reject(log);
            }
        })).then((log) => {
            res.status(200).send(log);
        }).catch((log) => {
            res.status(500).send(log);
        });
    }else{
        res.status(400).send();
    }
});

app.listen(config.port, config.listen, null, () => {
    console.log("rest-script started with following config:");
    console.log(config);
});

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