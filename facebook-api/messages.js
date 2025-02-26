const axios = require("axios");
require('dotenv').config();

async function sendMessages(data) {
    return new Promise(async (resolve, reject) => {
        try {
            axios({
                method: 'post',
                url: `https://graph.facebook.com/v19.0/${process.env.WA_PHONE_NUMBER_ID}/messages`,
                headers: {
                    'Authorization': `Bearer ${process.env.ACCESS_FIXED_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify(data)
            })
                .then(function (response) {
                    console.log(response.data)
                    resolve(response.data)
                })
                .catch(function (error) {
                    console.log(error);
                    console.log(error.response.data);
                    resolve(null)
                });
        } catch (e) {
            console.log('sendMessagesError:', e)
            resolve(null);
        }
    });
}

module.exports = {sendMessages};
