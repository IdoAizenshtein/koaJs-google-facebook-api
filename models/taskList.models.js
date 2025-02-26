const sequelize = require('.')
const {DataTypes} = require('sequelize');

const TaskList = sequelize.define('TaskList', {
    userId: DataTypes.STRING,
    kind: DataTypes.STRING,
    id: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    etag: DataTypes.STRING,
    title: DataTypes.STRING,
    updated: DataTypes.STRING,
    selfLink: DataTypes.STRING
});

// (async () => {
//     await sequelize.sync({ force: true });
//     // Code here
// })();

// TaskList.sync().then(r => {
//     console.log('r:', r)
// });

module.exports = TaskList;
