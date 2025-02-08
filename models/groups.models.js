const sequelize = require('.')
const {DataTypes} = require('sequelize');

const Groups = sequelize.define('Groups', {
    email: DataTypes.STRING,
    refreshToken: DataTypes.STRING,
    groupId: {
        type: DataTypes.BIGINT,
        primaryKey: true
    }
});

// (async () => {
//     await sequelize.sync({ force: true });
//     // Code here
// })();

// Groups.sync().then(r => {
//     console.log('r:', r)
// });

module.exports = Groups;
