const sequelize = require('.')
const {DataTypes} = require('sequelize');

const Task = sequelize.define('Tasks', {
    userId: DataTypes.STRING,
    kind: DataTypes.STRING,
    id: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    parent_id: DataTypes.STRING,
    etag: DataTypes.STRING,
    title: DataTypes.STRING,
    updated: DataTypes.STRING,
    selfLink: DataTypes.STRING,
    parent: DataTypes.STRING,
    position: DataTypes.STRING,
    notes: DataTypes.STRING,
    status: DataTypes.STRING,
    due: DataTypes.STRING,
    completed: DataTypes.STRING,
    deleted: DataTypes.BOOLEAN,
    hidden: DataTypes.BOOLEAN
});

// (async () => {
//     await sequelize.sync({ force: true });
//     // Code here
// })();

// Task.sync().then(r => {
//     console.log('r:', r)
// });

module.exports = Task;
