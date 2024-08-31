const logger = require('../logger');
const axios = require('axios');
const fs = require('fs');
const { setKeyValue } = require('./Database');

async function getUIDSlow(url) {
    var FormData = require("form-data");
    var Form = new FormData();
    var Url = new URL(url);
    Form.append('username', Url.pathname.replace(/\//g, ""));
    try {
        var response = await axios.post('https://api.findids.net/api/get-uid-from-username', Form, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.79 Safari/537.36'
            }
        });
        var data = response.data;
        if (data.status !== 200) {
            throw new Error('Error!');
        }
        if (typeof data.error === 'string') {
            throw new Error("errr");
        } else {
            return data.data.id || "Not Found";
        }
    } catch (e) {
        throw e;
    }
}

async function getUIDFast(url) {
    var FormData = require("form-data");
    var Form = new FormData();
    var Url = new URL(url);
    Form.append('link', Url.href);
    try {
        var response = await axios.post('https://id.traodoisub.com/api.php', Form);
        var data = response.data;
        if (data.error) {
            throw new Error(data.error);
        } else {
            return data.id || "Not Found";
        }
    } catch (e) {
        throw e;
    }
}

async function getUID(url, callback) {
    try {
        var getUID = await getUIDFast(url);
        if (!isNaN(getUID)) {
            callback(null, getUID);
        } else {
            let getUIDSlowResult = await getUIDSlow(url);
            if (!isNaN(getUIDSlowResult)) {
                callback(null, getUIDSlowResult);
            } else {
                callback("UID not found", null);
            }
        }
    } catch (error) {
        callback(error.message, null);
    }
}

function StartCountOnlineTime() {
    if (!fs.existsSync(process.cwd() + "/Online.json")) {
        fs.writeFileSync(process.cwd() + "/Online.json", JSON.stringify(0, null, 2));
    }
    setInterval(function () {
        const data = Number(fs.readFileSync(process.cwd() + '/Online.json', 'utf8'));
        const time = data + 1;
        fs.writeFileSync(process.cwd() + "/Online.json", JSON.stringify(time, null, 2));
    }, 1000);
}

function GetCountOnlineTime() {
    let second = Number(fs.readFileSync(process.cwd() + '/Online.json', 'utf8'));
    const day = Math.floor(second / (3600 * 24));
    second %= 3600 * 24;
    const hour = Math.floor(second / 3600);
    second %= 3600;
    const minute = Math.floor(second / 60);
    return { day, hour, minute };
}

async function Auto_Login(Email, PassWord) {
    require('../index')({ email: Email, password: PassWord},async (error, api) => {
        if (error) {
            setKeyValue("Email", null);
            setKeyValue("Password", null);
            
            return logger("Auto Login Failed!", "[ MetaCore ]"), process.exit(1);
        } else {
            return console.log("Auto Login Successful!", "[ MetaCore ]") ,process.exit(1);
        }
    });
}

module.exports = {
    getUID,
    StartCountOnlineTime,
    GetCountOnlineTime,
    Auto_Login
};
