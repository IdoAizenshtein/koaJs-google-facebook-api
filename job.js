const TaskList = require("./models/taskList.models");
const Task = require("./models/task.models");
const User = require("./models/user.models");
const {listTaskLists} = require("./google-tasks-calendar-api/listTaskLists");
const {promises: fs} = require("fs");
const {CREDENTIALS_PATH, idInstance, apiTokenInstance} = require("./lib/paths");
const {google} = require("googleapis");
const {saveCredentials, loadSavedCredentialsIfExist, generateAuthUrl} = require("./google-tasks-calendar-api/auth");
const whatsAppClient = require('@green-api/whatsapp-api-client');
const {getCalendarList, getEventsNextHourTodayListByCalendarId} = require("./google-tasks-calendar-api/calendar");
const {sendMessages} = require("./facebook-api/messages");
require('dotenv').config();

async function updateAllUsersByUpdatedTasks() {
    try {
        await TaskList.truncate();
        await Task.truncate();
        const allUsers = await User.findAll();
        if (allUsers.length) {
            for (let i = 0; i < allUsers.length; i++) {
                const {refreshToken, userId, tokenExpireDate} = allUsers[i];
                const content = await fs.readFile(CREDENTIALS_PATH);
                const keys = JSON.parse(content);
                const key = keys.installed || keys.web;
                const credentials = {
                    type: 'authorized_user',
                    client_id: key.client_id,
                    client_secret: key.client_secret,
                    refresh_token: refreshToken
                }
                const oAuth2Client = google.auth.fromJSON(credentials);
                if (oAuth2Client) {
                    if (new Date(tokenExpireDate) < new Date()) {
                        oAuth2Client.on('tokens', async (tokens) => {
                            if (tokens.refresh_token) {
                                tokens.credentials = {
                                    refresh_token: tokens.refresh_token,
                                    access_token: tokens.access_token || ''
                                }
                                const tokenInfo = await oAuth2Client.getTokenInfo(
                                    tokens['credentials'].access_token
                                );
                                console.log('tokenInfo:', tokenInfo)
                                await saveCredentials(tokens, userId, tokenInfo);
                            }
                            if (tokens.access_token) {
                                try {
                                    const tokenInfo = await oAuth2Client.getTokenInfo(
                                        tokens.access_token
                                    );
                                    console.log('tokenInfo----', tokenInfo);
                                    await User.upsert({
                                        email: tokenInfo.email,
                                        tokenExpireDate: tokenInfo.expiry_date,
                                        userId: userId,
                                        accessToken: tokens.access_token,
                                        groupId: Number(userId)
                                    });
                                } catch (e) {
                                    console.log('22222', e)
                                }
                            }
                        });
                        await listTaskLists(oAuth2Client, userId);
                    } else {
                        await listTaskLists(oAuth2Client, userId);
                    }
                }
            }
        }
    } catch (e) {
        console.log('ErrorJobUpdateAllUsersByUpdatedTasks:', e)
    }
}

async function getAllTasksDueTodayOfAllUsers() {
    try {
        const allUsers = await User.findAll();
        if (allUsers.length) {
            for (let i = 0; i < allUsers.length; i++) {
                const {refreshToken, userId, tokenExpireDate} = allUsers[i];
                const content = await fs.readFile(CREDENTIALS_PATH);
                const keys = JSON.parse(content);
                const key = keys.installed || keys.web;
                const credentials = {
                    type: 'authorized_user',
                    client_id: key.client_id,
                    client_secret: key.client_secret,
                    refresh_token: refreshToken
                }
                const oAuth2Client = google.auth.fromJSON(credentials);
                if (oAuth2Client) {
                    let allListTaskLists;
                    if (new Date(tokenExpireDate) < new Date()) {
                        oAuth2Client.on('tokens', async (tokens) => {
                            if (tokens.refresh_token) {
                                tokens.credentials = {
                                    refresh_token: tokens.refresh_token,
                                    access_token: tokens.access_token || ''
                                }
                                const tokenInfo = await oAuth2Client.getTokenInfo(
                                    tokens['credentials'].access_token
                                );
                                console.log('tokenInfo:', tokenInfo)
                                await saveCredentials(tokens, userId, tokenInfo);
                            }
                            if (tokens.access_token) {
                                try {
                                    const tokenInfo = await oAuth2Client.getTokenInfo(
                                        tokens.access_token
                                    );
                                    console.log('tokenInfo----', tokenInfo);
                                    await User.upsert({
                                        email: tokenInfo.email,
                                        tokenExpireDate: tokenInfo.expiry_date,
                                        userId: userId,
                                        accessToken: tokens.access_token,
                                        groupId: Number(userId)
                                    });
                                } catch (e) {
                                    console.log('22222', e)
                                }
                            }
                        });
                        allListTaskLists = await listTaskLists(oAuth2Client, userId);
                    } else {
                        allListTaskLists = await listTaskLists(oAuth2Client, userId);
                    }
                    let existTodayTasks = false;
                    if (allListTaskLists && Array.isArray(allListTaskLists) && allListTaskLists.length > 0) {
                        for (let i = 0; i < allListTaskLists.length; i++) {
                            for (let i1 = 0; i1 < allListTaskLists[i].tasks.length; i1++) {
                                const {due, title, completed} = allListTaskLists[i].tasks[i1];
                                const today = new Date();
                                const isToday = (today.toDateString() == new Date(due).toDateString());
                                if (isToday) {
                                    if (!existTodayTasks) {
                                        try {
                                            const restAPI = whatsAppClient.restAPI(({
                                                idInstance,
                                                apiTokenInstance
                                            }));
                                            const response = await restAPI.message.sendMessage(userId + '@c.us', null, 'בוקר טוב, להלן המשימות המעודכנות להיום:', null, true);
                                        } catch (errrr) {
                                            console.log(errrr)
                                        }
                                        try {
                                            const responseApi = await sendMessages({
                                                "messaging_product": "whatsapp",
                                                "recipient_type": "individual",
                                                "to": userId,
                                                "type": "text",
                                                "text": {
                                                    "preview_url": false,
                                                    "body": 'בוקר טוב, להלן המשימות המעודכנות להיום:'
                                                }
                                            })
                                        } catch (errrr) {
                                            console.log(errrr)
                                        }
                                    }
                                    existTodayTasks = true;
                                    try {
                                        const restAPI = whatsAppClient.restAPI(({
                                            idInstance,
                                            apiTokenInstance
                                        }));
                                        const response = await restAPI.message.sendMessage(userId + '@c.us', null, ('משימה להיום: ' + title), null, true);
                                    } catch (errrr) {
                                        console.log(errrr)
                                    }
                                    try {
                                        const responseApi = await sendMessages({
                                            "messaging_product": "whatsapp",
                                            "recipient_type": "individual",
                                            "to": userId,
                                            "type": "text",
                                            "text": {
                                                "preview_url": false,
                                                "body": ('משימה להיום: ' + title)
                                            }
                                        })
                                    } catch (errrr) {
                                        console.log(errrr)
                                    }
                                }else{
                                    if ((new Date(due) < new Date()) && !completed) {
                                        try {
                                            const restAPI = whatsAppClient.restAPI(({
                                                idInstance,
                                                apiTokenInstance
                                            }));
                                            const response = await restAPI.message.sendMessage(userId + '@c.us', null, ('משימה שעדיין לא בוצעה: ' + title), null, true);
                                        } catch (errrr) {
                                            console.log(errrr)
                                        }
                                        try {
                                            const responseApi = await sendMessages({
                                                "messaging_product": "whatsapp",
                                                "recipient_type": "individual",
                                                "to": userId,
                                                "type": "text",
                                                "text": {
                                                    "preview_url": false,
                                                    "body": ('משימה שעדיין לא בוצעה: ' + title)
                                                }
                                            })
                                        } catch (errrr) {
                                            console.log(errrr)
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if (!existTodayTasks) {
                        try {
                            const restAPI = whatsAppClient.restAPI(({
                                idInstance,
                                apiTokenInstance
                            }));
                            const response = await restAPI.message.sendMessage(userId + '@c.us', null, 'לקוח יקר, לא נמצאו משימות להיום. יום טוב.', null, true);
                        } catch (errrr) {
                            console.log(errrr)
                        }
                        try {
                            const responseApi = await sendMessages({
                                "messaging_product": "whatsapp",
                                "recipient_type": "individual",
                                "to": userId,
                                "type": "text",
                                "text": {
                                    "preview_url": false,
                                    "body": 'לקוח יקר, לא נמצאו משימות להיום. יום טוב.'
                                }
                            })
                        } catch (errrr) {
                            console.log(errrr)
                        }
                    }

                }
            }
        }
    } catch (e) {
        console.log('ErrorJobGetAllTasksDueTodayOfAllUsers:', e)
    }
}

async function getAllCalendarEventsDueNextHourTodayOfAllUsers(dateFormat) {
    try {
        const allUsers = await User.findAll();
        if (allUsers.length) {
            for (let i = 0; i < allUsers.length; i++) {
                const {refreshToken, userId, tokenExpireDate} = allUsers[i];
                const content = await fs.readFile(CREDENTIALS_PATH);
                const keys = JSON.parse(content);
                const key = keys.installed || keys.web;
                const credentials = {
                    type: 'authorized_user',
                    client_id: key.client_id,
                    client_secret: key.client_secret,
                    refresh_token: refreshToken
                }
                const oAuth2Client = google.auth.fromJSON(credentials);
                if (oAuth2Client) {
                    if (new Date(tokenExpireDate) < new Date()) {
                        oAuth2Client.on('tokens', async (tokens) => {
                            if (tokens.refresh_token) {
                                tokens.credentials = {
                                    refresh_token: tokens.refresh_token,
                                    access_token: tokens.access_token || ''
                                }
                                const tokenInfo = await oAuth2Client.getTokenInfo(
                                    tokens['credentials'].access_token
                                );
                                console.log('tokenInfo:', tokenInfo)
                                await saveCredentials(tokens, userId, tokenInfo);
                            }
                            if (tokens.access_token) {
                                try {
                                    const tokenInfo = await oAuth2Client.getTokenInfo(
                                        tokens.access_token
                                    );
                                    console.log('tokenInfo----', tokenInfo);
                                    await User.upsert({
                                        email: tokenInfo.email,
                                        tokenExpireDate: tokenInfo.expiry_date,
                                        userId: userId,
                                        accessToken: tokens.access_token,
                                        groupId: Number(userId)
                                    });
                                } catch (e) {
                                    console.log('22222', e)
                                }
                            }
                        });
                    }
                    let events = [];
                    const getCalendarLists = await getCalendarList(oAuth2Client);
                    if (getCalendarLists && Array.isArray(getCalendarLists) && getCalendarLists.length) {
                        for (let i = 0; i < getCalendarLists.length; i++) {
                            const eventsListByCalendarId = await getEventsNextHourTodayListByCalendarId(oAuth2Client, getCalendarLists[i].id);
                            events.push(...eventsListByCalendarId);
                        }
                    }
                    if (events.length) {
                        try {
                            const restAPI = whatsAppClient.restAPI(({
                                idInstance,
                                apiTokenInstance
                            }));
                            const response = await restAPI.message.sendMessage(userId + '@c.us', null,
                                'לקוח יקר, ' +
                                'השעה ' +
                                dateFormat +
                                ' להלן האירועים לשעה הקרובה:', null, true);
                        } catch (errrr) {
                            console.log(errrr)
                        }
                        try {
                            const responseApi = await sendMessages({
                                "messaging_product": "whatsapp",
                                "recipient_type": "individual",
                                "to": userId,
                                "type": "text",
                                "text": {
                                    "preview_url": false,
                                    "body": 'לקוח יקר, ' +
                                        'השעה ' +
                                        dateFormat +
                                        ' להלן האירועים לשעה הקרובה:'
                                }
                            })
                        } catch (errrr) {
                            console.log(errrr)
                        }
                        try {
                            for (let i = 0; i < events.length; i++) {
                                const event = events[i].summary +
                                    '\n' +
                                    (events[i].start.dateTime ? (
                                        ' בשעה ' +
                                        new Date(events[i].start.dateTime).toLocaleTimeString() + ' ' +
                                        '\n' +
                                        'אזור זמן: ' +
                                        events[i].start.timeZone
                                    ) : ('כל היום'));
                                try {
                                    const restAPI = whatsAppClient.restAPI(({
                                        idInstance,
                                        apiTokenInstance
                                    }));
                                    const response = await restAPI.message.sendMessage(userId + '@c.us', null, event, null, true);
                                } catch (errrr) {
                                    console.log(errrr)
                                }

                                try {
                                    const responseApi = await sendMessages({
                                        "messaging_product": "whatsapp",
                                        "recipient_type": "individual",
                                        "to": userId,
                                        "type": "text",
                                        "text": {
                                            "preview_url": false,
                                            "body": event
                                        }
                                    })
                                } catch (errrr) {
                                    console.log(errrr)
                                }
                            }
                        } catch (errrr2) {
                            console.log(errrr2)
                        }
                    }


                }
            }
        }
    } catch (e) {
        console.log('ErrorJobGetAllCalendarEventsDueNextHourTodayOfAllUsers:', e)
    }
}


module.exports = {
    updateAllUsersByUpdatedTasks,
    getAllTasksDueTodayOfAllUsers,
    getAllCalendarEventsDueNextHourTodayOfAllUsers
};



