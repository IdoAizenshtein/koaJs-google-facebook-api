const sequelize = require('.')
const {DataTypes} = require('sequelize');

const User = sequelize.define('Users', {
    email: DataTypes.STRING,
    tokenExpireDate: DataTypes.DATE,
    userId: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    refreshToken: DataTypes.STRING,
    accessToken: DataTypes.STRING,
    groupId: DataTypes.BIGINT
});

// (async () => {
//     await sequelize.sync({ force: true });
//     // Code here
// })();

// User.sync().then(r => {
//     console.log('r:', r)
// });

module.exports = User;
