const Koa = require('koa');
const app = new Koa();
const indexRoutes = require('./router');
const cors = require('@koa/cors');
const cron = require("node-cron");
const {updateAllUsersByUpdatedTasks, getAllTasksDueTodayOfAllUsers, getAllCalendarEventsDueNextHourTodayOfAllUsers} = require('./job');
const {bodyParser} = require("@koa/bodyparser");
const http = require('http');
const https = require('https');
const fs = require('fs');
// const createUnixSocketPool = require('./models/connect-unix.js');
const sequelize = require('./models/index');
const TaskList = require("./models/taskList.models");
const Task = require("./models/task.models");
const User = require("./models/user.models");
const Groups = require("./models/groups.models");
const serve = require('koa-static');
const mount = require('koa-mount');
const path = require('path');
const {koaSwagger} = require('koa2-swagger-ui');
require('dotenv').config();
console.log('Date: ', new Date().toString())

// ============== Server config
const PORT = process.env.PORT || 8080;
const config = {};
const env = process.argv[2] || 'prod';

config.ports = {
    http: PORT,
    https: 443
};

// ============ Path to openssl files
config.sslOptions = {
    key: fs.readFileSync('ssl/key.pem', 'utf8').toString(),
    cert: fs.readFileSync('ssl/cert.pem', 'utf8').toString()
};

// logger
app.use(async (ctx, next) => {
    await next();
    const rt = ctx.response.get('X-Response-Time');
    console.log(`${ctx.method} ${ctx.url} - ${rt}`);
});

// x-response-time
app.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    ctx.set('X-Response-Time', `${ms}ms`);
});

let pool;

app.use(async (ctx, next) => {
    if (pool) {
        return next();
    }
    try {
        // pool = await createPoolAndEnsureSchema();
        pool = {};
        // await sequelize.sync({ force: true });
        User.sync().then(r => {
            console.log('User:', r)
        });
        Groups.sync().then(r => {
            console.log('Groups:', r)
        });
        Task.sync().then(r => {
            console.log('Task:', r)
        });
        TaskList.sync().then(r => {
            console.log('TaskList:', r)
        });

        return next();
    } catch (err) {
        console.error(err);
        return next(err);
    }
});

// const createPoolAndEnsureSchema = async () =>
//     await createPool()
//         .then(async pool => {
//             console.log('createPoolAndEnsureSchema------')
//             // try {
//             //     sequelize.authenticate().then(r => {
//             //         console.log("Connection has been established successfully.");
//             //     });
//             // } catch (err) {
//             //     console.error("Unable to connect to the database:", err);
//             // }
//             // await ensureSchema(pool);
//             return pool;
//         })
//         .catch(err => {
//             console.error(err);
//             throw err;
//         });
// const ensureSchema = async pool => {
//     const hasTable = await pool.schema.hasTable('votes');
//     if (!hasTable) {
//         return pool.schema.createTable('votes', table => {
//             table.increments('vote_id').primary();
//             table.timestamp('time_cast', 30).notNullable();
//             table.specificType('candidate', 'CHAR(6)').notNullable();
//         });
//     }
//     console.info("Ensured that table 'votes' exists");
// };
//
// // Initialize Knex, a Node.js SQL query builder library with built-in connection pooling.
// const createPool = async () => {
//     // Configure which instance and what database user to connect with.
//     // Remember - storing secrets in plaintext is potentially unsafe. Consider using
//     // something like https://cloud.google.com/kms/ to help keep secrets secret.
//     const config = {pool: {}};
//
//     // [START cloud_sql_postgres_knex_limit]
//     // 'max' limits the total number of concurrent connections this pool will keep. Ideal
//     // values for this setting are highly variable on app design, infrastructure, and database.
//     config.pool.max = 5;
//     // 'min' is the minimum number of idle connections Knex maintains in the pool.
//     // Additional connections will be established to meet this value unless the pool is full.
//     config.pool.min = 5;
//     // [END cloud_sql_postgres_knex_limit]
//
//     // [START cloud_sql_postgres_knex_timeout]
//     // 'acquireTimeoutMillis' is the number of milliseconds before a timeout occurs when acquiring a
//     // connection from the pool. This is slightly different from connectionTimeout, because acquiring
//     // a pool connection does not always involve making a new connection, and may include multiple retries.
//     // when making a connection
//     config.pool.acquireTimeoutMillis = 60000; // 60 seconds
//     // 'createTimeoutMillis` is the maximum number of milliseconds to wait trying to establish an
//     // initial connection before retrying.
//     // After acquireTimeoutMillis has passed, a timeout exception will be thrown.
//     config.pool.createTimeoutMillis = 30000; // 30 seconds
//     // 'idleTimeoutMillis' is the number of milliseconds a connection must sit idle in the pool
//     // and not be checked out before it is automatically closed.
//     config.pool.idleTimeoutMillis = 600000; // 10 minutes
//     // [END cloud_sql_postgres_knex_timeout]
//
//     // [START cloud_sql_postgres_knex_backoff]
//     // 'knex' uses a built-in retry strategy which does not implement backoff.
//     // 'createRetryIntervalMillis' is how long to idle after failed connection creation before trying again
//     config.pool.createRetryIntervalMillis = 200; // 0.2 seconds
//     // [END cloud_sql_postgres_knex_backoff]
//
//     if (process.env.INSTANCE_UNIX_SOCKET) {
//         // Use a Unix socket when INSTANCE_UNIX_SOCKET (e.g., /cloudsql/proj:region:instance) is defined.
//         console.log('INSTANCE_UNIX_SOCKET')
//
//         return createUnixSocketPool(config);
//     } else {
//         throw 'One of INSTANCE_HOST or INSTANCE_UNIX_SOCKET` is required.';
//     }
// };


app
    .use(cors())
    .use(bodyParser())
    .use(indexRoutes.routes())
    .use(indexRoutes.allowedMethods())
    .use(
        koaSwagger({
            routePrefix: '/swagger',
            swaggerOptions: {
                url: './swagger/config.json'
            },
        }),
    );

// app.use(mount('/public ', serve(path.join(__dirname, '/static'))))
const staticDirPath = path.join(__dirname, 'public');
app.use(serve(staticDirPath));

app.use((ctx) => {
    ctx.body = ctx.request.body;
});

// cron.schedule('*/20 * * * *', () => {
//     console.log("---------------------");
//     console.log("running a task every 20 min");
//     updateAllUsersByUpdatedTasks().then(r => {
//         console.log("--- updateAllUsersByUpdatedTasks finished -----");
//     });
// });
//
// cron.schedule('0 8 * * *', () => {
//     console.log("---------------------");
//     console.log("running a task every day at 8:00 am - Asia/Tel_Aviv timezone");
//     getAllTasksDueTodayOfAllUsers().then(r => {
//         console.log("--- getAllTasksDueTodayOfAllUsers finished -----");
//     });
// },  {
//     timezone: 'Asia/Tel_Aviv'
// });
//
// cron.schedule('0 * * * *', (date) => {
//     console.log("---------------------", new Date(date).toLocaleTimeString());
//     getAllCalendarEventsDueNextHourTodayOfAllUsers(new Date(date).toLocaleTimeString()).then(r => {
//         console.log("--- getAllCalendarEventsDueNextHourTodayOfAllUsers finished -----");
//     });
// },  {
//     timezone: 'Asia/Tel_Aviv'
// });

// app.listen(3000, function () {
//     console.log('Server running on http://localhost:3000')
// });

app.on('error', (err, ctx) => {
    console.error('server error', err, ctx)
});

try {
    http.createServer(app.callback()).listen(config.ports.http, listeningReporter);
} catch (ex) {
    console.error('Failed to start http server\n', ex, (ex && ex.stack));
}

try {
    // http.createServer(config.sslOptions,(req, res) => {
    //     res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
    //     res.end();
    // }).listen(config.ports.https, listeningReporter);
    https.createServer(config.sslOptions, app.callback()).listen(config.ports.https, listeningReporter);
} catch (ex) {
    console.error('Failed to start https server\n', ex, (ex && ex.stack));
}

async function listeningReporter(err) {
    if (!!err) {
        console.error('HTTPS server FAIL: ', err, (err && err.stack));
    } else {
        console.log(`${new Date().toLocaleString()}`);
        // `this` refers to the http server here
        const {address, port} = this.address();
        const protocol = this.addContext ? 'https' : 'http';
        console.log(`Listening on ${protocol}://${address}:${port}...`);

    }
}

