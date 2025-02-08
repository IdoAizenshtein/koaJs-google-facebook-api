const {promises: fs} = require("fs");
const {OAuth2Client} = require("google-auth-library");
const path = require("path");
const process = require("process");
const {google} = require("googleapis");
const {CREDENTIALS_PATH, SCOPES} = require("../lib/paths");
const User = require("../models/user.models");
const TaskList = require("../models/taskList.models");
const Task = require("../models/task.models");
const Groups = require("../models/groups.models");

function generateAuthUrl(TEL, login_hint) {
    return new Promise(async (resolve, reject) => {
        const content = await fs.readFile(CREDENTIALS_PATH);
        const key = JSON.parse(content);
        const keys = key.installed || key.web;

        // create an oAuth client to authorize the API call.  Secrets are kept in a `keys.json` file,
        // which should be downloaded from the Google Developers Console.
        const oAuth2Client = new google.auth.OAuth2(
            keys.client_id,
            keys.client_secret,
            keys.redirect_uris[0]
        );

        // Generate the url that will be used for the consent dialog.
        const authorizeUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            // redirect_uri: 'http://localhost:3000/users/' + TEL,
            state: TEL,
            prompt: 'consent',
            login_hint: login_hint
        });
        console.log('authorizeUrl: ', authorizeUrl)
        resolve(authorizeUrl);
    });
}

async function checkIfTaskListAndTasksExists(TEL) {
    try {
        const taskListByUserFound = await TaskList.findAll({
            where: {userId: TEL},
            raw: true,
            nest: true
        });
        if (!taskListByUserFound.length) {
            console.log('taskListByUserFound Not found!');
            return null;
        } else {
            for (let i = 0; i < taskListByUserFound.length; i++) {
                const list = taskListByUserFound[i];
                list.tasks = await Task.findAll({
                    where: {userId: TEL, parent_id: list.id},
                    raw: true,
                    nest: true
                });
                // console.log('list.tasks------', list.tasks.length);
            }
            // console.log('taskListByUserFound------', taskListByUserFound);
            return taskListByUserFound;
        }
    } catch (err) {
        console.log(err)
        return null;
    }
}

async function saveCredentials(client, TEL, tokenInfo) {
    // if (client.credentials.refresh_token) {
    //     // store the refresh_token in my database!
    //     console.log(client.credentials.refresh_token);
    // }
    // console.log(client.credentials.access_token);
    await User.upsert({
        email: tokenInfo.email,
        tokenExpireDate: tokenInfo.expiry_date,
        userId: TEL,
        accessToken: client.credentials.access_token,
        refreshToken: client.credentials.refresh_token,
        groupId: Number(TEL)
    });
    await Groups.upsert({
        email: tokenInfo.email,
        refreshToken: client.credentials.refresh_token,
        groupId: Number(TEL)
    });
}


async function loadSavedCredentialsIfExistJson(TEL) {
    try {
        const userIdFound = await User.findOne({where: {userId: TEL}});
        if (userIdFound === null) {
            console.log('Not found!');
            return null;
        } else {
            try {
                // console.log('userIdFound------', userIdFound.userId, userIdFound.refreshToken);
                const content = await fs.readFile(CREDENTIALS_PATH);
                const keys = JSON.parse(content);
                const key = keys.installed || keys.web;
                const credentials = {
                    type: 'authorized_user',
                    client_id: key.client_id,
                    client_secret: key.client_secret,
                    refresh_token: userIdFound.refreshToken
                }
                return google.auth.fromJSON(credentials);
            } catch (err) {
                return null;
            }
        }
    } catch (err) {
        console.log(err)
        return null;
    }
}

async function loadSavedCredentialsIfExist(TEL) {
    let oAuth2Client = await loadSavedCredentialsIfExistJson(TEL);
    try {
        const accessToken = await oAuth2Client.getAccessToken();
        console.log('accessToken----', accessToken);
    } catch (e) {
        console.log('error accessToken')
        return null;
    }
    return oAuth2Client;
}


module.exports = {generateAuthUrl, loadSavedCredentialsIfExist, saveCredentials, checkIfTaskListAndTasksExists};
