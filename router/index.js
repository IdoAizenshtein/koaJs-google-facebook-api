const Index = require('@koa/router');
const url = require("url");
const {promises: fs} = require("fs");
const {OAuth2Client} = require("google-auth-library");
const router = new Index();
const {listTaskLists} = require("../google-tasks-calendar-api/listTaskLists");
const {getCalendarList, getEventsNextHourTodayListByCalendarId} = require("../google-tasks-calendar-api/calendar");
const {CREDENTIALS_PATH} = require("../lib/paths");
const {createReadStream} = require("fs");
const {
    saveCredentials,
    loadSavedCredentialsIfExist,
    generateAuthUrl,
    checkIfTaskListAndTasksExists
} = require("../google-tasks-calendar-api/auth");
const User = require("../models/user.models");
const Task = require("../models/task.models");
const TaskList = require("../models/taskList.models");
const {
    clearAllTasks,
    deleteTask,
    patchTask,
    insertTask,
    getTask,
    getAllTasks
} = require('../google-tasks-calendar-api/task')
const {deleteOneList, patchListTask, insertNewList, getOneList} = require('../google-tasks-calendar-api/taskList')
const taskFunc = require("../google-tasks-calendar-api/task");
const {speechToText} = require("../google-tasks-calendar-api/speechToText");
const {getAudioUrl} = require("../facebook-api/getAudioUrl");
const {sendMessages} = require("../facebook-api/messages");

const {google} = require("googleapis");
require('dotenv').config()
const axios = require('axios');
const Groups = require("../models/groups.models");
const whatsAppClient = require('@green-api/whatsapp-api-client');
const taskListFunc = require("../google-tasks-calendar-api/taskList");
const {
    updateAllUsersByUpdatedTasks,
    getAllTasksDueTodayOfAllUsers,
    getAllCalendarEventsDueNextHourTodayOfAllUsers
} = require("../job");
const idInstance = '7103925459'; // your instance id
const apiTokenInstance = '87f336f6c3b34a1eb4094ce11d46bdc2988b55b56a9d4a5880'; // your instance api token


router
    .get('/', async (ctx, next) => {
        // const foundUsers = await User.findAll();
        // console.log('foundUsers: ', foundUsers)
        // const foundTasks = await Task.findAll();
        // console.log('foundTasks: ', foundUsers)
        // const foundTaskList = await TaskList.findAll();
        // console.log('foundTaskList: ', foundTaskList)
        console.log('Main path params:', ctx.params, ctx.path, ctx.url, ctx.param, ctx.query)
        try {
            if (ctx.url.includes('code=')) {
                const qs = new url.URL(ctx.url, ((ctx.request.header['x-forwarded-proto'] || 'http') + '://' + ctx.request.header.host)).searchParams;
                const code = qs.get('code');
                console.log(`Code is ${code}`);
                const TEL = qs.get('state');
                console.log(`TEL is ${TEL}`);
                let login_hint = qs.get('login_hint');
                console.log(`login_hint is ${login_hint}`);
                if (!login_hint) {
                    login_hint = 'users';
                }
                const content = await fs.readFile(CREDENTIALS_PATH);
                const key = JSON.parse(content);
                const keys = key.installed || key.web;
                const oAuth2Client = new OAuth2Client(
                    keys.client_id,
                    keys.client_secret,
                    keys.redirect_uris[0]
                );
                // Now that we have the code, use that to acquire tokens.
                const r = await oAuth2Client.getToken(code);

                // Make sure to set the credentials on the OAuth2 client.
                oAuth2Client.setCredentials(r.tokens);
                console.info('Tokens acquired.', oAuth2Client.credentials);
                if (oAuth2Client.credentials) {
                    if (oAuth2Client.credentials.refresh_token) {
                        const tokenInfo = await oAuth2Client.getTokenInfo(
                            oAuth2Client.credentials.access_token
                        );
                        console.log('tokenInfo:', tokenInfo)
                        const isTokenExpiring = oAuth2Client.isTokenExpiring();
                        console.log('isTokenExpiring:', isTokenExpiring)
                        await saveCredentials(oAuth2Client, TEL, tokenInfo);
                    }
                }
                ctx.redirect('/' + login_hint + '/' + TEL + '?redirect=code');
            } else {
                // ctx.body = 'Hello World';

                ctx.type = 'html';
                ctx.body = createReadStream('index.html');
            }
        } catch (e) {
            console.log('ErrorMainPage:', e)
            ctx.type = 'html';
            ctx.body = createReadStream('index.html');
        }
    })
    .get('/updateAllUsersByUpdatedTasks', async (ctx, next) => {
        console.log("---------------------");
        console.log("running a task every 20 min");
        ctx.body = "--- running a task every 20 min -----";

        await updateAllUsersByUpdatedTasks()
        console.log("--- updateAllUsersByUpdatedTasks finished -----");
        ctx.body = "--- updateAllUsersByUpdatedTasks finished -----";
    })
    .get('/getAllTasksDueTodayOfAllUsers', async (ctx, next) => {
        console.log("---------------------");
        console.log("running a task every day at 8:00 am - Asia/Tel_Aviv timezone");
        ctx.body = "--- running a task every day at 8:00 am - Asia/Tel_Aviv timezone -----";

        await getAllTasksDueTodayOfAllUsers()
        console.log("--- getAllTasksDueTodayOfAllUsers finished -----");
        ctx.body = "--- getAllTasksDueTodayOfAllUsers finished -----";
    })
    .get('/getAllCalendarEventsDueNextHourTodayOfAllUsers', async (ctx, next) => {
        console.log("---------------------", new Date().toLocaleTimeString());
        ctx.body = "--- running a task every round hour -----";

        await getAllCalendarEventsDueNextHourTodayOfAllUsers(new Date().toLocaleTimeString())
        console.log("--- getAllCalendarEventsDueNextHourTodayOfAllUsers finished -----");
        ctx.body = "--- getAllCalendarEventsDueNextHourTodayOfAllUsers finished -----";
    })
    .get('/webhook', async (ctx, next) => {
        console.log(ctx.query, ctx.request.header)
        console.log('webhook get')
    })
    .post('/webhook', async (ctx, next) => {
        console.log('webhook post')
        console.log(ctx.query, ctx.request.header)
        const body = ctx.request.body;
        console.log(body);
        console.log('Incoming webhook: ' + JSON.stringify(body));
        ctx.body = body;

        if (body && body['typeWebhook'] && body['typeWebhook'] === 'incomingMessageReceived') {
            const TEL = body['senderData'].chatId.split('@')[0];
            const oAuth2Client = await loadSavedCredentialsIfExist(TEL);
            if (oAuth2Client) {
                let taskTitle = null;
                if (body['messageData']['typeMessage'] === 'audioMessage') {
                    const downloadUrl = body['messageData']['fileMessageData']['downloadUrl'];
                    const text = await speechToText(oAuth2Client, downloadUrl);
                    if (text !== null) {
                        taskTitle = text;
                    }
                } else if (body['messageData']['typeMessage'] === 'textMessage') {
                    taskTitle = body['messageData']['textMessageData']['textMessage'];
                }
                if (taskTitle) {
                    const taskLists = await taskListFunc.getTasklists(oAuth2Client);
                    let tasklistId = null;
                    let taskTitleList = '';
                    if (taskLists) {
                        if (taskLists.length) {
                            tasklistId = taskLists[0].id;
                            taskTitleList = taskLists[0].title;
                        } else {
                            const data = await insertNewList(oAuth2Client, {
                                title: 'רשימה חדשה ' + new Date().toLocaleDateString()
                            })
                            if (data) {
                                const {kind, id, etag, title, updated, selfLink} = data;
                                await TaskList.upsert({
                                    userId: TEL,
                                    kind: kind,
                                    id: id,
                                    etag: etag,
                                    title: title,
                                    updated: updated,
                                    selfLink: selfLink
                                });
                                tasklistId = id;
                                taskTitleList = title;
                            }
                        }
                        if (tasklistId) {

                            const task = await insertTask(oAuth2Client, tasklistId, {
                                title: taskTitle
                            })
                            if (task) {
                                await Task.upsert({
                                    userId: TEL,
                                    kind: task.kind,
                                    id: task.id,
                                    etag: task.etag,
                                    title: task.title,
                                    updated: task.updated,
                                    selfLink: task.selfLink,
                                    parent: task.parent,
                                    position: task.position,
                                    notes: task.notes,
                                    status: task.status,
                                    due: task.due,
                                    completed: task.completed,
                                    deleted: task.deleted,
                                    hidden: task.hidden,
                                    parent_id: tasklistId
                                });
                                const message = 'משימה חדשה עם הכותרת: "'
                                    + taskTitle +
                                    '" נוצרה בהצלחה ' +
                                    'בתוך רשימת: "' +
                                    taskTitleList +
                                    '"';
                                try {
                                    const restAPI = whatsAppClient.restAPI(({
                                        idInstance,
                                        apiTokenInstance
                                    }));
                                    const response = await restAPI.message.sendMessage(body['senderData'].chatId, null, message, null, true);
                                } catch (errrr) {
                                    console.log(errrr)
                                }
                            }
                        }

                    } else {

                    }
                }


                // const getListTaskLists = await listTaskLists(oAuth2Client, TEL);
                // let sections = [];
                // getListTaskLists.forEach(v => {
                //     let tasks = [];
                //     v.tasks.forEach(vTask => {
                //         tasks.push({
                //             "rowId": vTask.id,
                //             "title": vTask.title,
                //             "description": vTask.notes
                //         })
                //     })
                //     if (tasks.length) {
                //         sections.push({
                //             "title": v.title,
                //             "rows": tasks
                //         })
                //     }
                // })
                // console.log("sections: ", JSON.stringify(sections))
                // try {
                //     const restAPI = whatsAppClient.restAPI(({
                //         idInstance,
                //         apiTokenInstance
                //     }));
                //     const response = await restAPI.message.sendListMessage(body['senderData'].chatId,
                //         "Message text",
                //         "Action list",
                //         "כותרת רשימת משימות",
                //         "",
                //         sections);
                // } catch (errrr) {
                //     console.log(errrr)
                // }
                // axios({
                //     method: 'post',
                //     url: `https://graph.facebook.com/v19.0/218633504668284/messages`,
                //     headers: {
                //         'Authorization': `Bearer EAAS8nOhuT4oBO1PNiwAkrnlCyz7uVBp1A0gGJttg2OPfWkBUY4zd1dtCaU6pSqVOuQWA5ZCpCmZB3pMYTSeIdxxk24t3AthjYI8SaWbZAu61wW9VKLY8rarCFQXkIXqWAzHlRoPBYRwzR9EyP5AknS10RxqzCF5LqMdRGDj3wpXE9e0JmgsgqgQ0MBCR0Sa9MHPMSrjh1EoSGBI7nY3a4iwI9UZD`,
                //         'Content-Type': 'application/json'
                //     },
                //     data: JSON.stringify(
                //         {
                //             "messaging_product": "whatsapp",
                //             "recipient_type": "individual",
                //             "to": TEL,
                //             "type": "interactive",
                //             "interactive": {
                //                 "type": "list",
                //                 "header": {
                //                     "type": "text",
                //                     "text": "כותרת רשימת משימות"
                //                 },
                //                 "body": {
                //                     "text": "רשימת משימות גוגל"
                //                 },
                //                 "footer": {
                //                     "text": "כותרת סיום רשימת משימות"
                //                 },
                //                 "action": {
                //                     "button": "הצג רשימה",
                //                     "sections": sections
                //                 }
                //             }
                //         })
                // })
                //     .then(function (response) {
                //         console.log(response)
                //     })
                //     .catch(function (error) {
                //         console.log(error);
                //         console.log(error.response.data);
                //
                //     });
            } else {
                const message = body['senderData'].senderName + " שלום, " +
                    " ברוכים הבאים לשירות ניהול משימות באמצעות הוואטסאפ של חברת אייל חזות ייעוץ טכנולוגי. " +
                    "בכדי להירשם לשירות היכנס/י לקישור הבא: " + 'https://login.timesapp.biz/users/' + TEL;
                try {
                    const restAPI = whatsAppClient.restAPI(({
                        idInstance,
                        apiTokenInstance
                    }));
                    const response = await restAPI.message.sendMessage(body['senderData'].chatId, null, message, null, true);
                } catch (errrr) {
                    console.log(errrr)
                }
                // axios({
                //     method: 'post',
                //     url: `https://graph.facebook.com/v19.0/218633504668284/messages`,
                //     headers: {
                //         'Authorization': `Bearer EAAS8nOhuT4oBO1PNiwAkrnlCyz7uVBp1A0gGJttg2OPfWkBUY4zd1dtCaU6pSqVOuQWA5ZCpCmZB3pMYTSeIdxxk24t3AthjYI8SaWbZAu61wW9VKLY8rarCFQXkIXqWAzHlRoPBYRwzR9EyP5AknS10RxqzCF5LqMdRGDj3wpXE9e0JmgsgqgQ0MBCR0Sa9MHPMSrjh1EoSGBI7nY3a4iwI9UZD`,
                //         'Content-Type': 'application/json'
                //     },
                //     data: JSON.stringify(
                //         {
                //             "messaging_product": "whatsapp",
                //             "recipient_type": "individual",
                //             "to": TEL,
                //             "type": "text",
                //             "text": {
                //                 "preview_url": true,
                //                 "body": body.entry[0].changes[0].value.messages[0].text.body + " בכדי להירשם לשירות היכנס ללינק הבא: " + 'https://4273-190-66-255-118.ngrok-free.app/users/' + TEL
                //             }
                //             // "text": {
                //             //     "preview_url": false,
                //             //     "body": body.entry[0].changes[0].value.messages[0].text.body + ' ---- testssssss'
                //             // }
                //         })
                // })
                //     .then(function (response) {
                //         console.log(response)
                //     })
                //     .catch(function (error) {
                //         console.log(error);
                //         console.log(error.response.data);
                //
                //     });
            }


        }
    })
    .get('/webhooks', async (ctx, next) => {
        console.log(ctx.query, ctx.request.header['x-forwarded-proto'])
        if (
            ctx.query['hub.mode'] === 'subscribe' &&
            ctx.query['hub.verify_token'] === 'TokenWebhooks'
        ) {
            ctx.body = ctx.query['hub.challenge'];
        } else {
            ctx.status = 400;
        }
    })
    .post('/webhooks', async (ctx, next) => {
        const body = ctx.request.body;
        console.log(body);
        console.log('Incoming webhook: ' + JSON.stringify(body));
        ctx.body = body;

        if (body.entry[0].changes[0].value.messages) {
            const TEL = body.entry[0].changes[0].value.contacts[0].wa_id;
            const oAuth2Client = await loadSavedCredentialsIfExist(TEL);
            if (oAuth2Client) {
                let taskTitle = null;
                if (body.entry[0].changes[0].value.messages[0].type === 'audio') {
                    const downloadUrl = await getAudioUrl(body.entry[0].changes[0].value.messages[0].audio.id);
                    if (downloadUrl) {
                        const text = await speechToText(oAuth2Client, downloadUrl.url, downloadUrl.mime_type);
                        if (text !== null) {
                            taskTitle = text;
                        }
                    }
                } else if (body.entry[0].changes[0].value.messages[0].type === 'text') {
                    taskTitle = body.entry[0].changes[0].value.messages[0].text.body;
                }
                if (taskTitle) {
                    const taskLists = await taskListFunc.getTasklists(oAuth2Client);
                    let tasklistId = null;
                    let taskTitleList = '';
                    if (taskLists) {
                        if (taskLists.length) {
                            tasklistId = taskLists[0].id;
                            taskTitleList = taskLists[0].title;
                        } else {
                            const data = await insertNewList(oAuth2Client, {
                                title: 'רשימה חדשה ' + new Date().toLocaleDateString()
                            })
                            if (data) {
                                const {kind, id, etag, title, updated, selfLink} = data;
                                await TaskList.upsert({
                                    userId: TEL,
                                    kind: kind,
                                    id: id,
                                    etag: etag,
                                    title: title,
                                    updated: updated,
                                    selfLink: selfLink
                                });
                                tasklistId = id;
                                taskTitleList = title;
                            }
                        }
                        if (tasklistId) {
                            const task = await insertTask(oAuth2Client, tasklistId, {
                                title: taskTitle
                            })
                            if (task) {
                                await Task.upsert({
                                    userId: TEL,
                                    kind: task.kind,
                                    id: task.id,
                                    etag: task.etag,
                                    title: task.title,
                                    updated: task.updated,
                                    selfLink: task.selfLink,
                                    parent: task.parent,
                                    position: task.position,
                                    notes: task.notes,
                                    status: task.status,
                                    due: task.due,
                                    completed: task.completed,
                                    deleted: task.deleted,
                                    hidden: task.hidden,
                                    parent_id: tasklistId
                                });
                                const message = 'משימה חדשה עם הכותרת: "'
                                    + taskTitle +
                                    '" נוצרה בהצלחה ' +
                                    'בתוך רשימת: "' +
                                    taskTitleList +
                                    '"';
                                try {
                                    const response = await sendMessages({
                                        "messaging_product": "whatsapp",
                                        "recipient_type": "individual",
                                        "to": TEL,
                                        "type": "text",
                                        "text": {
                                            "preview_url": false,
                                            "body": message
                                        }
                                    })
                                } catch (errrr) {
                                    console.log(errrr)
                                }
                            }
                        }

                    } else {

                    }
                }


                // const getListTaskLists = await listTaskLists(oAuth2Client, TEL);
                // let sections = [];
                // getListTaskLists.forEach(v => {
                //     let tasks = [];
                //     v.tasks.forEach(vTask => {
                //         tasks.push({
                //             "rowId": vTask.id,
                //             "title": vTask.title,
                //             "description": vTask.notes
                //         })
                //     })
                //     if (tasks.length) {
                //         sections.push({
                //             "title": v.title,
                //             "rows": tasks
                //         })
                //     }
                // })
                // console.log("sections: ", JSON.stringify(sections))
                // try {
                //     const restAPI = whatsAppClient.restAPI(({
                //         idInstance,
                //         apiTokenInstance
                //     }));
                //     const response = await restAPI.message.sendListMessage(body['senderData'].chatId,
                //         "Message text",
                //         "Action list",
                //         "כותרת רשימת משימות",
                //         "",
                //         sections);
                // } catch (errrr) {
                //     console.log(errrr)
                // }
                // axios({
                //     method: 'post',
                //     url: `https://graph.facebook.com/v19.0/218633504668284/messages`,
                //     headers: {
                //         'Authorization': `Bearer EAAS8nOhuT4oBO1PNiwAkrnlCyz7uVBp1A0gGJttg2OPfWkBUY4zd1dtCaU6pSqVOuQWA5ZCpCmZB3pMYTSeIdxxk24t3AthjYI8SaWbZAu61wW9VKLY8rarCFQXkIXqWAzHlRoPBYRwzR9EyP5AknS10RxqzCF5LqMdRGDj3wpXE9e0JmgsgqgQ0MBCR0Sa9MHPMSrjh1EoSGBI7nY3a4iwI9UZD`,
                //         'Content-Type': 'application/json'
                //     },
                //     data: JSON.stringify(
                //         {
                //             "messaging_product": "whatsapp",
                //             "recipient_type": "individual",
                //             "to": TEL,
                //             "type": "interactive",
                //             "interactive": {
                //                 "type": "list",
                //                 "header": {
                //                     "type": "text",
                //                     "text": "כותרת רשימת משימות"
                //                 },
                //                 "body": {
                //                     "text": "רשימת משימות גוגל"
                //                 },
                //                 "footer": {
                //                     "text": "כותרת סיום רשימת משימות"
                //                 },
                //                 "action": {
                //                     "button": "הצג רשימה",
                //                     "sections": sections
                //                 }
                //             }
                //         })
                // })
                //     .then(function (response) {
                //         console.log(response)
                //     })
                //     .catch(function (error) {
                //         console.log(error);
                //         console.log(error.response.data);
                //
                //     });
            } else {
                const message = body.entry[0].changes[0].value.contacts[0].profile.name + " שלום, " +
                    " ברוכים הבאים לשירות ניהול משימות באמצעות הוואטסאפ של חברת אייל חזות ייעוץ טכנולוגי. " +
                    "בכדי להירשם לשירות היכנס/י לקישור הבא: " + 'https://login.timesapp.biz/users/' + TEL;
                try {
                    const response = await sendMessages({
                        "messaging_product": "whatsapp",
                        "recipient_type": "individual",
                        "to": TEL,
                        "type": "text",
                        "text": {
                            "preview_url": true,
                            "body": message
                        }
                    })
                } catch (errrr) {
                    console.log(errrr)
                }
            }
        }


        // if (body.entry[0].changes[0].value.messages) {
        //     const TEL = body.entry[0].changes[0].value.messages ? body.entry[0].changes[0].value.messages[0].from : body.entry[0].changes[0].value.statuses[0].recipient_id;
        //     const oAuth2Client = await loadSavedCredentialsIfExist(TEL);
        //     if (oAuth2Client) {
        //         const getListTaskLists = await listTaskLists(oAuth2Client, TEL);
        //         let sections = [];
        //         getListTaskLists.forEach(v => {
        //             let tasks = [];
        //             v.tasks.forEach(vTask => {
        //                 tasks.push({
        //                     "id": vTask.id,
        //                     "title": vTask.title,
        //                     "description": vTask.notes
        //                 })
        //             })
        //             if (tasks.length) {
        //                 sections.push({
        //                     "title": v.title,
        //                     "rows": tasks
        //                 })
        //             }
        //         })
        //         // console.log("sections: ", JSON.stringify(sections))
        //                 {
        //                     "messaging_product": "whatsapp",
        //                     "recipient_type": "individual",
        //                     "to": TEL,
        //                     "type": "interactive",
        //                     "interactive": {
        //                         "type": "list",
        //                         "header": {
        //                             "type": "text",
        //                             "text": "כותרת רשימת משימות"
        //                         },
        //                         "body": {
        //                             "text": "רשימת משימות גוגל"
        //                         },
        //                         "footer": {
        //                             "text": "כותרת סיום רשימת משימות"
        //                         },
        //                         "action": {
        //                             "button": "הצג רשימה",
        //                             "sections": sections
        //                         }
        //                     }


    })
    .get('/users/:id', async (ctx, next) => {
        const TEL = ctx.params.id;
        const qs = new url.URL(ctx.url, ((ctx.request.header['x-forwarded-proto'] || 'http') + '://' + ctx.request.header.host)).searchParams;
        const redirect = qs.get('redirect');
        ctx.state.user = TEL;
        const oAuth2Client = await loadSavedCredentialsIfExist(TEL);
        if (oAuth2Client) {
            oAuth2Client.on('tokens', async (tokens) => {
                if (tokens.refresh_token) {
                    console.log('-------tokens-------', tokens);
                    tokens.credentials = {
                        refresh_token: tokens.refresh_token,
                        access_token: tokens.access_token || ''
                    }
                    const tokenInfo = await oAuth2Client.getTokenInfo(
                        tokens['credentials'].access_token
                    );
                    console.log('tokenInfo:', tokenInfo)
                    await saveCredentials(tokens, TEL, tokenInfo);
                }
                if (tokens.access_token) {
                    console.log(tokens, tokens.access_token);
                    try {
                        const tokenInfo = await oAuth2Client.getTokenInfo(
                            tokens.access_token
                        );
                        console.log('tokenInfo----', tokenInfo);
                        await User.upsert({
                            email: tokenInfo.email,
                            tokenExpireDate: tokenInfo.expiry_date,
                            userId: TEL,
                            accessToken: tokens.access_token,
                            groupId: Number(TEL)
                        });
                    } catch (e) {
                        console.log('22222', e)
                    }
                }
            });
            // console.log('-------oAuth2Client-----', oAuth2Client.credentials.refresh_token)

            ctx.body = 'Hello exist number ' + ctx.params.id;
            console.log(ctx.query)
            if (ctx.query['type']) {
                if (ctx.query['type'] === 'getListById') {
                    if (ctx.query['tasklistId']) {
                        ctx.body = await getOneList(oAuth2Client, ctx.query['tasklistId']);
                    } else {
                        ctx.body = `Sorry, we are missed tasklistId param.`
                        ctx.status = 500;
                    }
                } else if (ctx.query['type'] === 'getTaskById') {
                    if (ctx.query['tasklistId'] && ctx.query['taskId']) {
                        ctx.body = await getTask(oAuth2Client, ctx.query['tasklistId'], ctx.query['taskId']);
                    } else {
                        ctx.body = `Sorry, we are missed tasklistId/taskId param.`
                        ctx.status = 500;
                    }
                } else if (ctx.query['type'] === 'getListAndTasksById') {
                    if (ctx.query['tasklistId']) {
                        let getOneTaskList = await getOneList(oAuth2Client, ctx.query['tasklistId']);
                        getOneTaskList['tasks'] = await getAllTasks(oAuth2Client, ctx.query['tasklistId']);
                        ctx.body = getOneTaskList;
                    } else {
                        ctx.body = `Sorry, we are missed tasklistId param.`
                        ctx.status = 500;
                    }
                }
            } else {
                const getListTaskLists = await listTaskLists(oAuth2Client, TEL);
                ctx.body = getListTaskLists;
                if (redirect) {
                    const message = 'הרשמתך לשירות ניהול משימות בוצעה בהצלחה, מעתה כל הודעה שתרשום בצאט זה תייצר אוטומטית משימה חדשה.' +
                        '\n' +
                        'להלן המשימות העדכניות בחשבונך: ';
                    try {
                        const restAPI = whatsAppClient.restAPI(({
                            idInstance,
                            apiTokenInstance
                        }));
                        const response = await restAPI.message.sendMessage(TEL + '@c.us', null, message, null, true);
                        ctx.redirect('https://wa.me/' + TEL);
                    } catch (errrr) {
                        console.log(errrr)
                    }
                    try {
                        const responseApi = await sendMessages({
                            "messaging_product": "whatsapp",
                            "recipient_type": "individual",
                            "to": TEL,
                            "type": "text",
                            "text": {
                                "preview_url": false,
                                "body": message
                            }
                        })
                    } catch (errrr) {
                        console.log(errrr)
                    }
                    for (let i = 0; i < getListTaskLists.length; i++) {
                        for (let i1 = 0; i1 < getListTaskLists[i].tasks.length; i1++) {
                            try {
                                const restAPI = whatsAppClient.restAPI(({
                                    idInstance,
                                    apiTokenInstance
                                }));
                                const response = await restAPI.message.sendMessage(TEL + '@c.us', null, getListTaskLists[i].tasks[i1].title, null, true);
                            } catch (errrr) {
                                console.log(errrr)
                            }
                            try {
                                const responseApi = await sendMessages({
                                    "messaging_product": "whatsapp",
                                    "recipient_type": "individual",
                                    "to": TEL,
                                    "type": "text",
                                    "text": {
                                        "preview_url": false,
                                        "body": getListTaskLists[i].tasks[i1].title
                                    }
                                })
                            } catch (errrr) {
                                console.log(errrr)
                            }
                        }
                    }
                }


                // let sections = [];
                // getListTaskLists.forEach(v => {
                //     let tasks = [];
                //     v.tasks.forEach(vTask => {
                //         tasks.push({
                //             "rowId": vTask.id,
                //             "title": vTask.title,
                //             "description": vTask.notes
                //         })
                //     })
                //     if (tasks.length) {
                //         sections.push({
                //             "title": v.title,
                //             "rows": tasks
                //         })
                //     }
                // })
                //
                // console.log("sections: ", JSON.stringify(sections))
                // try {
                //     const restAPI = whatsAppClient.restAPI(({
                //         idInstance,
                //         apiTokenInstance
                //     }));
                //     const response = await restAPI.message.sendListMessage(TEL + '@c.us',
                //         "Message text",
                //         "Action list",
                //         "כותרת רשימת משימות",
                //         "",
                //         sections);
                // } catch (errrr) {
                //     console.log(errrr)
                // }
                //
                // ctx.redirect('https://wa.me/972559647897');

                // ctx.body = sections;
                // axios({
                //     method: 'post',
                //     url: `https://graph.facebook.com/v19.0/218633504668284/messages`,
                //     headers: {
                //         'Authorization': `Bearer EAAS8nOhuT4oBO1PNiwAkrnlCyz7uVBp1A0gGJttg2OPfWkBUY4zd1dtCaU6pSqVOuQWA5ZCpCmZB3pMYTSeIdxxk24t3AthjYI8SaWbZAu61wW9VKLY8rarCFQXkIXqWAzHlRoPBYRwzR9EyP5AknS10RxqzCF5LqMdRGDj3wpXE9e0JmgsgqgQ0MBCR0Sa9MHPMSrjh1EoSGBI7nY3a4iwI9UZD`,
                //         'Content-Type': 'application/json'
                //     },
                //     data: JSON.stringify(
                //         {
                //             "messaging_product": "whatsapp",
                //             "recipient_type": "individual",
                //             "to": TEL,
                //             "type": "interactive",
                //             "interactive": {
                //                 "type": "list",
                //                 "header": {
                //                     "type": "text",
                //                     "text": "כותרת רשימת משימות"
                //                 },
                //                 "body": {
                //                     "text": "רשימת משימות גוגל"
                //                 },
                //                 "footer": {
                //                     "text": "כותרת סיום רשימת משימות"
                //                 },
                //                 "action": {
                //                     "button": "הצג רשימה",
                //                     "sections": sections
                //                 }
                //             }
                //         })
                // })
                //     .then(function (response) {
                //         console.log(response)
                //
                //     })
                //     .catch(function (error) {
                //         console.log(error);
                //         console.log(error.response.data);
                //
                //     });


                // const taskListAndTasksExists = await checkIfTaskListAndTasksExists(TEL);
                // if (taskListAndTasksExists) {
                //     ctx.body = taskListAndTasksExists;
                // } else {
                //     ctx.body = await listTaskLists(oAuth2Client, TEL);
                // }
            }
        } else {
            const authUrl = await generateAuthUrl(TEL, 'users');
            ctx.redirect(authUrl);
        }
    })
    .get('/users/calendar-list/:id', async (ctx, next) => {
        const TEL = ctx.params.id;
        ctx.state.user = TEL;
        const oAuth2Client = await loadSavedCredentialsIfExist(TEL);
        if (oAuth2Client) {
            const getListTaskLists = await getCalendarList(oAuth2Client, TEL);
            if (getListTaskLists === null) {
                const authUrl = await generateAuthUrl(TEL, 'users/calendar-list');
                ctx.redirect(authUrl);
            } else {
                ctx.body = getListTaskLists;
            }
        } else {
            const authUrl = await generateAuthUrl(TEL, 'users/calendar-list');
            ctx.redirect(authUrl);
        }
    })
    .get('/users/calendar-next-hour-events-list/:id', async (ctx, next) => {
        let events = [];
        const TEL = ctx.params.id;
        ctx.state.user = TEL;
        const oAuth2Client = await loadSavedCredentialsIfExist(TEL);
        if (oAuth2Client) {
            const getCalendarLists = await getCalendarList(oAuth2Client);
            if (getCalendarLists === null) {
                const authUrl = await generateAuthUrl(TEL, 'users/calendar-next-hour-events-list');
                ctx.redirect(authUrl);
            } else {
                if (getCalendarLists && Array.isArray(getCalendarLists) && getCalendarLists.length) {
                    for (let i = 0; i < getCalendarLists.length; i++) {
                        const eventsListByCalendarId = await getEventsNextHourTodayListByCalendarId(oAuth2Client, getCalendarLists[i].id);
                        events.push(...eventsListByCalendarId);
                    }
                }
                ctx.body = events;
            }
        } else {
            const authUrl = await generateAuthUrl(TEL, 'users/calendar-next-hour-events-list');
            ctx.redirect(authUrl);
        }
    })
    .post('/users/speech-to-text/:id', async (ctx, next) => {
        const TEL = ctx.params.id;
        const body = ctx.request.body;
        ctx.state.user = TEL;
        const audioUrl = body['audioUrl'];
        const oAuth2Client = await loadSavedCredentialsIfExist(TEL);
        if (oAuth2Client) {
            const text = await speechToText(oAuth2Client, audioUrl);
            if (text === null) {
                ctx.status = 403;
            } else {
                ctx.body = text;
            }
        } else {
            ctx.status = 403;
        }
    })
    .post('/users/add-task-list/:id', async (ctx, next) => { //add-task-list
        const body = ctx.request.body;
        if (ctx.params.id && body.requestBody) {
            const TEL = ctx.params.id;
            const oAuth2Client = await loadSavedCredentialsIfExist(TEL);
            if (oAuth2Client) {
                console.log('1111')
                const data = await insertNewList(oAuth2Client, body.requestBody)
                if (data) {
                    console.log('2222', data)
                    const {kind, id, etag, title, updated, selfLink} = data;
                    await TaskList.upsert({
                        userId: TEL,
                        kind: kind,
                        id: id,
                        etag: etag,
                        title: title,
                        updated: updated,
                        selfLink: selfLink
                    });
                    ctx.body = data;
                } else {
                    ctx.body = {};
                }
            } else {
                ctx.status = 401;
            }
        } else {
            ctx.status = 500;
        }
    })
    .post('/users/add-task/:id', async (ctx, next) => { //add-task
        const body = ctx.request.body;
        if (ctx.params.id && body.tasklistId && body.requestBody) {
            const TEL = ctx.params.id;
            const oAuth2Client = await loadSavedCredentialsIfExist(TEL);
            if (oAuth2Client) {
                const task = await insertTask(oAuth2Client, body.tasklistId, body.requestBody)
                if (task) {
                    await Task.upsert({
                        userId: TEL,
                        kind: task.kind,
                        id: task.id,
                        etag: task.etag,
                        title: task.title,
                        updated: task.updated,
                        selfLink: task.selfLink,
                        parent: task.parent,
                        position: task.position,
                        notes: task.notes,
                        status: task.status,
                        due: task.due,
                        completed: task.completed,
                        deleted: task.deleted,
                        hidden: task.hidden,
                        parent_id: body.tasklistId
                    });
                    ctx.body = task;
                } else {
                    ctx.body = {};
                }
            }

        } else {
            ctx.status = 500;
        }
    })
    .patch('/users/update-task-list/:id', async (ctx, next) => { //update only a few params
        const body = ctx.request.body;
        if (ctx.params.id && body.tasklistId && body.requestBody) {
            const TEL = ctx.params.id;
            const oAuth2Client = await loadSavedCredentialsIfExist(TEL);
            if (oAuth2Client) {
                const data = await patchListTask(oAuth2Client, body.tasklistId, body.requestBody);
                if (data) {
                    // const taskFindOne = await TaskList.findOne(
                    //     {
                    //         where: {
                    //             id: body.tasklistId,
                    //             userId: TEL
                    //         }
                    //     });
                    // if (taskFindOne === null) {
                    //     taskFindOne.update(body.requestBody);
                    // }
                    const {kind, id, etag, title, updated, selfLink} = data;
                    await TaskList.update({
                        userId: TEL,
                        kind: kind,
                        id: id,
                        etag: etag,
                        title: title,
                        updated: updated,
                        selfLink: selfLink
                    }, {
                        where: {
                            id: body.tasklistId,
                            userId: TEL
                        },
                    });
                    ctx.body = data;

                    // await TaskList.update(data, {
                    //     where: {
                    //         id: body.tasklistId,
                    //         userId: TEL
                    //     },
                    // });
                } else {
                    ctx.body = {};
                }
            } else {
                ctx.status = 401;
            }

        } else {
            ctx.body = `Sorry, we are out of params.`
            ctx.status = 500;
        }

    })
    .patch('/users/update-task/:id', async (ctx, next) => { //update only a few params
        const body = ctx.request.body;
        if (ctx.params.id && body.tasklistId && body.taskId && body.requestBody) {
            const TEL = ctx.params.id;
            const oAuth2Client = await loadSavedCredentialsIfExist(TEL);
            if (oAuth2Client) {
                const task = await patchTask(oAuth2Client, body.tasklistId, body.taskId, body.requestBody)
                if (task) {
                    // const taskFindOne = await Task.findOne(
                    //     {
                    //         where: {
                    //             id: body.taskId,
                    //             parent_id: body.tasklistId,
                    //             userId: TEL
                    //         }
                    //     });
                    // if (taskFindOne === null) {
                    //     taskFindOne.update(body.requestBody);
                    // }
                    await Task.update({
                        userId: TEL,
                        kind: task.kind,
                        id: task.id,
                        etag: task.etag,
                        title: task.title,
                        updated: task.updated,
                        selfLink: task.selfLink,
                        parent: task.parent,
                        position: task.position,
                        notes: task.notes,
                        status: task.status,
                        due: task.due,
                        completed: task.completed,
                        deleted: task.deleted,
                        hidden: task.hidden,
                        parent_id: body.tasklistId
                    }, {
                        where: {
                            id: body.taskId,
                            parent_id: body.tasklistId,
                            userId: TEL
                        },
                    });
                    ctx.body = task;

                    // await Task.update(data, {
                    //     where: {
                    //         id: body.taskId,
                    //         parent_id: body.tasklistId,
                    //         userId: TEL
                    //     },
                    // });
                } else {
                    ctx.body = {};
                }
            } else {
                ctx.status = 401;
            }
        } else {
            ctx.body = `Sorry, we are out of params.`
            ctx.status = 500;
        }
    })
    .put('/users/:id', async (ctx, next) => { //update complete obj
        if (ctx.params.id) {
            console.log(ctx.request.body)
        }
        ctx.body = ctx.request.body;
    })
    .del('/users/:id', async (ctx, next) => { // delete obj
        ///users/:id?type=clearAllTasks&tasklistId=MDY0Mjk0OTM2NzcxMTA2NzU5NTU6MDow
        ///users/:id?type=deleteTask&tasklistId=MDY0Mjk0OTM2NzcxMTA2NzU5NTU6MDow&taskId=Z0RJc3kzcHFOeEo3MXFndQ
        ///users/:id?type=deleteOneList&tasklistId=MDY0Mjk0OTM2NzcxMTA2NzU5NTU6MDow
        if (ctx.params.id) {
            const TEL = ctx.params.id;
            const oAuth2Client = await loadSavedCredentialsIfExist(TEL);
            if (oAuth2Client) {
                if (ctx.query.type) {
                    switch (ctx.query.type) {
                        case 'clearAllTasks':
                            if (ctx.query.tasklistId) {
                                const status = await clearAllTasks(oAuth2Client, ctx.query.tasklistId);
                                if (status === 204) {
                                    await Task.destroy({
                                        where: {
                                            parent_id: ctx.query.tasklistId
                                        },
                                    });
                                }
                                console.log('clearAllTasks status: ', status);
                                ctx.body = 'clearAllTasks status: ' + status;
                            } else {
                                ctx.body = `Sorry, we are out of ${ctx.query.type} missed tasklistId param.`
                                ctx.status = 500;
                            }
                            break;
                        case 'deleteTask':
                            if (ctx.query.tasklistId && ctx.query.taskId) {
                                const status = await deleteTask(oAuth2Client, ctx.query.tasklistId, ctx.query.taskId);
                                if (status === 204) {
                                    await Task.destroy({
                                        where: {
                                            parent_id: ctx.query.tasklistId,
                                            id: ctx.query.taskId
                                        },
                                    });
                                }
                                console.log('deleteTask status: ', status);
                                ctx.body = 'deleteTask status: ' + status;
                            } else {
                                let msg;
                                if (!ctx.query.tasklistId && !ctx.query.taskId) {
                                    msg = 'tasklistId and taskId params';
                                } else {
                                    if (!ctx.query.tasklistId) {
                                        msg = 'tasklistId param';
                                    } else {
                                        msg = 'taskId params';
                                    }
                                }
                                ctx.body = `Sorry, we are out of ${ctx.query.type} missed ${msg}.`
                                ctx.status = 500;
                            }
                            break;
                        case 'deleteOneList':
                            if (ctx.query.tasklistId) {
                                const status = await deleteOneList(oAuth2Client, ctx.query.tasklistId);
                                if (status === 204) {
                                    await TaskList.destroy({
                                        where: {
                                            id: ctx.query.tasklistId
                                        },
                                    });
                                }
                                console.log('deleteOneList status: ', status);
                                ctx.body = 'deleteOneList status: ' + status;
                            } else {
                                ctx.body = `Sorry, we are out of ${ctx.query.type} missed tasklistId param.`
                                ctx.status = 500;
                            }
                            break;
                        default:
                            console.log(`Sorry, we are out of ${ctx.query.type}.`);
                            ctx.body = `Sorry, we are out of ${ctx.query.type}.`
                            ctx.status = 500;
                    }
                }
            } else {
                ctx.status = 401;
            }
        }
    })
    .post('/send-otp', async (ctx, next) => {
        const body = ctx.request.body;
        const otpCode = body['otpCode'];
        console.log(otpCode);


    })
    .all('/users/:id', (ctx, next) => {

        // ...
    });

module.exports = router;
