/**
 List Task Object
 {
 "kind": string,
 "id": string,
 "etag": string,
 "title": string,
 "updated": string,
 "selfLink": string
 }

 Methods Lists
 delete
 Deletes the authenticated user's specified task list.
 get
 Returns the authenticated user's specified task list.
 insert
 Creates a new task list and adds it to the authenticated user's task lists.
 list
 Returns all the authenticated user's task lists.
 patch
 Updates the authenticated user's specified task list.
 update
 Updates the authenticated user's specified task list.
 */
const {google} = require("googleapis");

async function getTasklists(auth) {
    return new Promise(async (resolve, reject) => {
        try {
            const service = google.tasks({version: 'v1', auth});
            const getTasklists = await service.tasklists.list({});
            console.log(getTasklists)
            if (getTasklists.status === 200) {
                resolve(getTasklists.data.items)
            } else {
                resolve([]);
            }
        } catch (e) {
            console.log('getTasklistsError:', e)
            resolve(null);
        }
    });
}

async function getOneList(auth, tasklistId) {
    return new Promise(async (resolve, reject) => {
        try {
            const service = google.tasks({version: 'v1', auth});
            const getOneList = await service.tasklists.get({
                tasklist: tasklistId
            })
            console.log('getOneList: ', getOneList)
            if (getOneList.status === 200) {
                resolve(getOneList.data)
            } else {
                resolve({});
            }
        } catch (e) {
            resolve({});
        }
    });
}

async function deleteOneList(auth, tasklistId) {
    return new Promise(async (resolve, reject) => {
        try {
            const service = google.tasks({version: 'v1', auth});
            const deleteOneList = await service.tasklists.delete({
                tasklist: tasklistId,
            })
            resolve(deleteOneList.status);
        } catch (e) {
            resolve(500);
        }
    });
}

async function patchListTask(auth, tasklistId, requestBody) {
    return new Promise(async (resolve, reject) => {
        try {
            const service = google.tasks({version: 'v1', auth});
            const patchList = await service.tasklists.patch({
                tasklist: tasklistId,
                requestBody: requestBody
            })
            if (patchList.status === 200) {
                resolve(patchList.data)
            } else {
                resolve(null);
            }
        } catch (e) {
            resolve(null);
        }
    });
}

async function insertNewList(auth, requestBody) {
    return new Promise(async (resolve, reject) => {
        try {
            const service = google.tasks({version: 'v1', auth});
            const insertNewList = await service.tasklists.insert({
                requestBody: requestBody
            })
            if (insertNewList.status === 200) {
                resolve(insertNewList.data)
            } else {
                resolve(null);
            }
        } catch (e) {
            resolve(null);
        }
    });
}

module.exports = {getTasklists, getOneList, deleteOneList, patchListTask, insertNewList};
