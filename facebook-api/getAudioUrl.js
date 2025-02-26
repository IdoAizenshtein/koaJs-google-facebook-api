const axios = require("axios");
require('dotenv').config();

async function getAudioUrl(audioId) {
    return new Promise(async (resolve, reject) => {
        try {
            axios({
                method: 'get',
                url: `https://graph.facebook.com/v19.0/${audioId}`,
                headers: {
                    'Authorization': `Bearer ${process.env.ACCESS_FIXED_TOKEN}`
                }
            })
                .then(function (response) {
                    console.log(response.data)
                    if (response && response.data.url) {
                        console.log('audioId---------:', response.data)
                        resolve(response.data)
                    } else {
                        resolve(null)
                    }
                })
                .catch(function (error) {
                    console.log(error);
                    console.log(error.response.data);
                    resolve(null)
                });

        } catch (e) {
            console.log('getAudioUrlError:', e)
            resolve(null);
        }
    });
}

module.exports = {getAudioUrl};
