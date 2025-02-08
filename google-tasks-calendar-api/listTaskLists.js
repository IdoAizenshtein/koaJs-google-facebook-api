const {google} = require("googleapis");
const taskListFunc = require("./taskList");
const taskFunc = require("./task");
const {promises: fs} = require("fs");
const {DATA_PATH} = require("../lib/paths");
const User = require("../models/user.models");
const TaskList = require("../models/taskList.models");
const Task = require("../models/task.models");

async function listTaskLists(auth, TEL) {
    const arrListAndTasks = [];
    try {
        // const service = google.tasks({version: 'v1', auth});
        const taskLists = await taskListFunc.getTasklists(auth);
        if (taskLists && taskLists.length) {
            console.log('------- Start lists -----------');
            for (let i = 0; i < taskLists.length; i++) {
                console.log('------- Start ' + i + ' list -----------');
                const taskList = taskLists[i];
                console.log(`${taskList.title} : `, taskList);
                const {kind, id, etag, title, updated, selfLink} = taskList;
                await TaskList.upsert({
                    userId: TEL,
                    kind: kind,
                    id: id,
                    etag: etag,
                    title: title,
                    updated: updated,
                    selfLink: selfLink
                });
                const taskListsPerTask = await taskFunc.getAllTasks(auth, taskList.id);
                if (taskListsPerTask && taskListsPerTask.length) {
                    console.log('Task per list ', `${taskList.title} - (${taskList.id})`);
                    console.log('------- Start tasks -----------');
                    taskList['tasks'] = taskListsPerTask;
                    for (let i1 = 0; i1 < taskListsPerTask.length; i1++) {
                        const task = taskListsPerTask[i1];
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
                            parent_id: taskList.id
                        });
                        console.log(`${task.title} : `, task);
                    }
                    console.log('------- End tasks -----------');
                } else {
                    taskList['tasks'] = [];
                    console.log('No task found.');
                }
                console.log('------- End ' + i + ' list -----------');
                arrListAndTasks.push(taskList)
            }
            console.log('------- End lists -----------');
        } else {
            if(taskLists){
                console.log('No task lists found.');
            }else{

            }
        }
        console.log("arrListAndTasks: ", arrListAndTasks)
        // const payload_data = JSON.stringify(arrListAndTasks, null, 4);
        // await fs.writeFile(DATA_PATH, payload_data);
    } catch (e) {
        console.log('listTaskListsError:', e)
    }

    return arrListAndTasks;
}

module.exports = {listTaskLists};
