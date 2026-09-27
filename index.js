const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();

app.use(bodyParser.json());


// ===============================
// ENV VARIABLES
// ===============================

const VERIFY_TOKEN =
  process.env.VERIFY_TOKEN || 'alaa_store_verify_2024';

const PAGE_ACCESS_TOKEN =
  process.env.PAGE_TOKEN;

const GROQ_API_KEY =
  process.env.GROQ_API_KEY;


// Instagram Business Account ID
const INSTAGRAM_ACCOUNT_ID =
  '17841448590483479';


// ===============================
// HOME
// ===============================

app.get('/', (req, res) => {
  res.send('ALAA STORE Bot is Live!');
});


// ===============================
// META WEBHOOK VERIFICATION
// ===============================

app.get('/webhook', (req, res) => {

  console.log('🔍 Verification attempt:', req.query);

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {

    console.log('✅ VERIFIED!');

    res.status(200).send(challenge);

  } else {

    console.log('❌ Token mismatch:', token);

    res.sendStatus(403);
  }
});


// ===============================
// RECEIVE WEBHOOK EVENTS
// ===============================

app.post('/webhook', async (req, res) => {

  console.log(
    '--- NEW WEBHOOK ---',
    JSON.stringify(req.body).slice(0, 1000)
  );

  try {

    const body = req.body;

    // Make sure this is a Meta event
    if (
      body.object !== 'instagram' &&
      body.object !== 'page'
    ) {
      return res.status(200).send('EVENT_RECEIVED');
    }


    // Loop through webhook entries
    for (const entry of body.entry || []) {


      // =================================
      // INSTAGRAM
      // =================================

      if (
        body.object === 'instagram' &&
        entry.messaging
      ) {

        for (const event of entry.messaging) {


          // Ignore messages sent by our own bot
          if (event.message?.is_echo) {

            console.log('⏭️ Ignoring bot echo');

            continue;
          }


          const senderId =
            event.sender?.id;

          const text =
            event.message?.text;


          // Only process real text messages
          if (senderId && text) {

            await handleMessage(
              senderId,
              text
            );
          }
        }
      }


      // =================================
      // FACEBOOK PAGE
      // =================================

      if (
        body.object === 'page' &&
        entry.messaging
      ) {

        for (const event of entry.messaging) {

          const senderId =
            event.sender?.id;

          const text =
            event.message?.text;


          if (senderId && text) {

            await handleMessage(
              senderId,
              text
            );
          }
        }
      }
    }


    // Always tell Meta we received event
    res
      .status(200)
      .send('EVENT_RECEIVED');


  } catch (error) {

    console.error(
      '❌ WEBHOOK ERROR:',
      error.response?.data ||
      error.message
    );

    res.sendStatus(500);
  }
});


// ===============================
// HANDLE CUSTOMER MESSAGE
// ===============================

async function handleMessage(senderId, text) {

  console.log(
    `📩 Message from ${senderId}: ${text}`
  );


  try {

    // Ask AI for reply
    const aiReply =
      await getAIReply(text);


    console.log(
      `🤖 AI Reply: ${aiReply}`
    );


    // Send reply to Instagram
    await sendMessage(
      senderId,
      aiReply
    );


  } catch (error) {

    console.error(
      '❌ HANDLE MESSAGE ERROR:',
      error.response?.data ||
      error.message
    );
  }
}


// ===============================
// GROQ AI
// ===============================

async function getAIReply(userText) {


  // Check API key
  if (!GROQ_API_KEY) {

    console.error(
      '❌ GROQ_API_KEY is missing'
    );

    return 'Ahlan bik fi ALAA STORE! Chnowa t7eb? 😊';
  }


  try {

    const response = await axios.post(

      'https://api.groq.com/openai/v1/chat/completions',

      {

        model: 'llama-3.1-8b-instant',

        messages: [

          {
            role: 'system',

            content:
              'Enti vendeur fi ALAA STORE, ' +
              'marque streetwear fi Tunisia. ' +
              'Jaweb b tounsi, 9sir, friendly ' +
              'w naturel. ' +
              'A3ti réponses simples w utiles.'
          },

          {
            role: 'user',

            content: userText
          }

        ]
      },

      {
        headers: {

          Authorization:
            `Bearer ${GROQ_API_KEY}`,

          'Content-Type':
            'application/json'
        }
      }
    );


    const reply =
      response.data?.choices?.[0]?.message?.content;


    if (!reply) {

      console.error(
        '❌ GROQ returned no reply:',
        response.data
      );

      return 'Ahlan bik! Kifeh najem n3awnek?';
    }


    return reply;


  } catch (error) {

    console.error(
      '❌ GROQ ERROR:',
      error.response?.data ||
      error.message
    );


    return 'Ahlan bik! Famech mochkel technique, jareb ba3ed chwaya.';
  }
}


// ===============================
// SEND INSTAGRAM MESSAGE
// ===============================

async function sendMessage(senderId, text) {


  if (!PAGE_ACCESS_TOKEN) {

    console.error(
      '❌ PAGE_TOKEN is missing'
    );

    return;
  }


  try {

    await axios.post(

      `https://graph.instagram.com/v26.0/${INSTAGRAM_ACCOUNT_ID}/messages?access_token=${PAGE_ACCESS_TOKEN}`,

      {

        recipient: {
          id: senderId
        },

        message: {
          text: text
        }
      }
    );


    console.log(
      '✅ Reply SENT'
    );


  } catch (error) {

    console.error(
      '❌ SEND ERROR:',
      error.response?.data ||
      error.message
    );
  }
}


// ===============================
// START SERVER
// ===============================

const PORT =
  process.env.PORT || 10000;


app.listen(PORT, () => {

  console.log(
    `🚀 ALAA STORE Bot running on port ${PORT}`
  );
});
