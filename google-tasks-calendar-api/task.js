/**
 Task Object
 {
 "kind": string,
 "id": string,
 "etag": string,
 "title": string,
 "updated": string,
 "selfLink": string,
 "parent": string,
 "position": string,
 "notes": string,
 "status": string,
 "due": string,
 "completed": string,
 "deleted": boolean,
 "hidden": boolean,
 "links": [
 {
 "type": string,
 "description": string,
 "link": string
 }
 ]
 }

 Methods Task
 clear
 Clears all completed tasks from the specified task list.
 delete
 Deletes the specified task from the task list.
 get
 Returns the specified task.
 insert
 Creates a new task on the specified task list.
 list
 Returns all tasks in the specified task list.
 move
 Moves the specified task to another position in the task list.
 patch
 Updates the specified task.
 update
 Updates the specified task.
 */
const {google} = require("googleapis");


async function getAllTasks(auth, tasklistId) {
    return new Promise(async (resolve, reject) => {
        try {
            const service = google.tasks({version: 'v1', auth});
            const readListPerTask = await service.tasks.list({
                tasklist: tasklistId
            });
            if (readListPerTask.status === 200) {
                resolve(readListPerTask.data.items)
            } else {
                resolve([]);
            }
        } catch (e) {
            resolve([]);
        }
    });
}

async function getTask(auth, tasklistId, taskId) {
    return new Promise(async (resolve, reject) => {
        try {
            const service = google.tasks({version: 'v1', auth});
            const getTask = await service.tasks.get({
                tasklist: tasklistId,
                task: taskId
            });
            if (getTask.status === 200) {
                resolve(getTask.data)
            } else {
                resolve({});
            }
        } catch (e) {
            resolve({});
        }

    });
}

async function patchTask(auth, tasklistId, taskId, requestBody) {
    return new Promise(async (resolve, reject) => {
        try {
            const service = google.tasks({version: 'v1', auth});
            const patchTask = await service.tasks.patch({
                tasklist: tasklistId,
                task: taskId,
                requestBody: requestBody
            });
            if (patchTask.status === 200) {
                resolve(patchTask.data);
            } else {
                resolve(null);
            }
        } catch (e) {
            resolve(null);
        }

    });
}

async function insertTask(auth, tasklistId, requestBody) {
    return new Promise(async (resolve, reject) => {
        try {
            const service = google.tasks({version: 'v1', auth});
            const insertTask = await service.tasks.insert({
                tasklist: tasklistId,
                requestBody: requestBody
            });
            if (insertTask.status === 200) {
                resolve(insertTask.data)
            } else {
                resolve(null);
            }
        } catch (e) {
            resolve(null);
        }

    });
}

async function clearAllTasks(auth, tasklistId) {
    return new Promise(async (resolve, reject) => {
        try {
            const service = google.tasks({version: 'v1', auth});
            const clearAllTasks = await service.tasks.clear({
                tasklist: tasklistId
            });
            resolve(clearAllTasks.status);
        } catch (e) {
            resolve(500);

        }

    });
}

async function deleteTask(auth, tasklistId, taskId) {
    return new Promise(async (resolve, reject) => {
        try {
            const service = google.tasks({version: 'v1', auth});
            const deleteTask = await service.tasks.delete({
                tasklist: tasklistId,
                task: taskId
            });
            resolve(deleteTask.status);
        } catch (e) {
            resolve(500);

        }

    });
}

async function moveTask(auth, tasklistId, taskId, parentIdMoveTo, previousIdToMove) {
    return new Promise(async (resolve, reject) => {
        try {
            const service = google.tasks({version: 'v1', auth});
            const moveTask = await service.tasks.move({
                tasklist: tasklistId,
                task: taskId,
                parent: parentIdMoveTo || null,
                previous: previousIdToMove || null
            });
            resolve(moveTask.status);
        } catch (e) {
            resolve(500);

        }

    });
}

module.exports = {getAllTasks, getTask, patchTask, insertTask, clearAllTasks, deleteTask, moveTask};
