// const Knex = require('knex');
//
// // createUnixSocketPool initializes a Unix socket connection pool for
// // a Cloud SQL instance of Postgres.
// const createUnixSocketPool = async config => {
//     return Knex({
//         client: 'pg',
//         connection: {
//             user: process.env.DB_USER,
//             password: process.env.DB_PASS,
//             database: process.env.DB_NAME,
//             host: process.env.INSTANCE_UNIX_SOCKET,
//         },
//         ...config,
//     });
// };
//
// module.exports = createUnixSocketPool;
