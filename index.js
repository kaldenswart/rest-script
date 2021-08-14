const config = require("./config.json");

const express = require("express");
const { spawn } = require("child_process");
const fileUpload = require("express-fileupload");

const app = express();
app.use(fileUpload({
    limits: { fileSize: 20 * 1024 * 1024 }
}))

app.get("/:module", (req, res, next) => {
    if(config.secret !== undefined){
        if(req.headers.authorization !== config.secret){
            res.status(403).send();
            return;
        }
    }

    res.header("Content-Type", "text/plain");

    const module_key = req.params.module.replace(/[^a-zA-Z0-9\-]/g, '');

    if(config.modules[module_key] !== undefined){
        const module = config.modules[module_key];

        if(module.file === undefined){
            const commands = module.commands;

            (new Promise(async (resolve, reject) => {
                let log = "";
                let error = false;
                for(let i = 0; i < commands.length; i++){
                    let c_meta = commands[i];
                    log += "Script: " + c_meta.command + c_meta.args.join() + "\n";
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
            next();
        }
    }else{
        res.status(400).send("Error Code: 1");
    }
});

app.post("/:module", async (req, res, next) => {
    if(config.secret !== undefined){
        if(req.headers.authorization !== config.secret){
            res.status(403).send();
            return;
        }
    }

    res.header("Content-Type", "text/plain");

    const module_key = req.params.module.replace(/[^a-zA-Z0-9\-]/g, '');

    if (config.modules[module_key] !== undefined) {
        const module = config.modules[module_key];
        const file_config = (module.file !== undefined) ? module.file : {};
        if(!file_config.output.endsWith("/")) file_config.output = file_config.output + "/";

        if (file_config.accept !== undefined && !Array.isArray(file_config.accept)) file_config.accept = [file_config.accept];

        if (Array.isArray(file_config.accept)) {
            if (req.files !== undefined && Object.keys(req.files).length > 0) {
                const keys = Object.keys(req.files);
                for (let i = 0; i < keys.length; i++) {
                    const file = req.files[keys[i]];
                    if (file.size < (20 * 1024 * 1024)) {
                        let valid = false;
                        for (let x = 0; x < file_config.accept.length; x++) {
                            const supported_file_type = file_config.accept[x];
                            if (file.name.endsWith(supported_file_type)) {
                                valid = true;
                                break;
                            }
                        }
                        if (valid) {
                            await file.mv(file_config.output + cleanPermalink(file.name), async err => {
                                if (err) {
                                    res.status(500).send(err);
                                }
                            });
                        } else {
                            res.status(400).send("Error Code: 1");
                        }
                    }
                }
            } else {
                res.status(400).send("Error Code: 2");
            }

            const commands = module.commands;

            (new Promise(async (resolve, reject) => {
                let log = "";
                let error = false;
                for (let i = 0; i < commands.length; i++) {
                    let c_meta = commands[i];
                    log += "Script: " + c_meta.command + c_meta.args.join() + "\n";
                    try {
                        let c_log = await executeCommand(c_meta.command, c_meta.args, c_meta.cwd);
                        log += c_log + "\n\n";
                    } catch (c_log) {
                        error = true;
                        log += c_log + "\n\n";
                    }
                }
                if (!error) {
                    resolve(log);
                } else {
                    reject(log);
                }
            })).then((log) => {
                res.status(200).send(log);
            }).catch((log) => {
                res.status(500).send(log);
            });
        } else {
            next();
        }

    } else {
        res.status(400).send("Error Code: 3");
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

function cleanPermalink(data, optional){
    if(optional && (data === undefined || data === null)) return data;

    data = data.toString();
    data = data.replace(/ & /g, ' and ');
    data = data.replace(/[^a-zA-Z0-9\-. ]/g, '');
    data = data.trim();
    data = data.replace(/ {2,}/g, ' ');
    data = data.replace(/ /g, '-');
    data = data.replace(/-{2,}/g, '-');
    data = data.toLowerCase();
    return data;
}