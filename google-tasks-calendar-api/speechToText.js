const {google} = require("googleapis");
// const {promises: fs} = require("fs");
const https = require('https');
const speech = require('@google-cloud/speech');
const {CREDENTIALS_PATH} = require("../lib/paths");
const fs = require('fs');
const axios = require("axios");
require('dotenv').config();

async function requestBase64(audioUrl, contentType) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await axios.get(audioUrl, {
                headers: contentType ? {
                    'Authorization': `Bearer ${process.env.ACCESS_FIXED_TOKEN}`,
                    'Content-Type': contentType
                } : {},
                responseType: 'arraybuffer'
            });
            const binaryData = Buffer.from(response.data, 'binary')
            resolve(binaryData)
        } catch (e) {
            console.log('requestBase64Error:', e)
            resolve(null);
        }
    });
}

async function speechToText(auth, audioUrl, contentType) {
    return new Promise(async (resolve, reject) => {
        try {
            // const speech = google.speech({
            //     version: 'v1',
            //     auth
            // }).speech;
            // const content = await fs.readFile(CREDENTIALS_PATH);
            // const key = JSON.parse(content);
            // const keys = key.installed || key.web;
            //
            // // create an oAuth client to authorize the API call.  Secrets are kept in a `keys.json` file,
            // // which should be downloaded from the Google Developers Console.
            // const oAuth2Client = new google.auth.OAuth2(
            //     keys.client_id,
            //     keys.client_secret,
            //     keys.redirect_uris[0]
            // );
            const client = new speech.SpeechClient({});

            // The path to the remote LINEAR16 file
            // const gcsUri = audioUrl; //'https://do-media-7103.fra1.digitaloceanspaces.com/7103925459/a7cbcf00-8ba5-4f8c-88fd-7bef5ab7400e.oga';
            // const splitFileName = audioUrl.split('/');
            // console.log(splitFileName[splitFileName.length - 1])
            // const fileName = splitFileName[splitFileName.length - 1];
            // const file = fs.createWriteStream(fileName);
            // https.get(audioUrl, function (response) {
            //     response.pipe(file);
            // });

            const audio_content = await requestBase64(audioUrl, contentType);
            // console.log('audio_content', audio_content)

            // Detects speech in the audio file
            client.recognize({
                audio: {content: audio_content},
                config: {
                    encoding: 'OGG_OPUS',
                    sampleRateHertz: 16000,
                    languageCode: 'iw-IL',
                    model: 'default',
                    audioChannelCount: 1,
                    enableWordConfidence: true,
                    enableWordTimeOffsets: true
                }
            }).then(response => {
                // console.log('-----response[0][\'results\']-----', response[0]['results'])
                const transcription = response[0]['results']
                    .map(result => result.alternatives[0].transcript)
                    .join('\n');
                console.log(`Transcription: ${transcription}`);
                resolve(transcription)
            })

        } catch (e) {
            console.log('speechToTextError:', e)
            resolve(null);
        }
    });
}

module.exports = {speechToText};
