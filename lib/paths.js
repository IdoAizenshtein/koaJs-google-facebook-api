const path = require('path');
const process = require('process');
const SCOPES = ['https://www.googleapis.com/auth/tasks', 'https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/cloud-platform'];
const DATA_PATH = path.join(process.cwd(), 'arrListAndTasks.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const idInstance = ''; // your instance id
const apiTokenInstance = ''; // your instance api token
module.exports = {SCOPES, DATA_PATH, CREDENTIALS_PATH, idInstance, apiTokenInstance};
