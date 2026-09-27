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

    if (
      body.object !== 'instagram' &&
      body.object !== 'page'
    ) {
      return res.status(200).send('EVENT_RECEIVED');
    }

    for (const entry of body.entry || []) {

      // ===============================
      // INSTAGRAM
      // ===============================

      if (
        body.object === 'instagram' &&
        entry.messaging
      ) {

        for (const event of entry.messaging) {

          if (event.message?.is_echo) {

            console.log('⏭️ Ignoring bot echo');

            continue;
          }

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


      // ===============================
      // FACEBOOK PAGE
      // ===============================

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

    const aiReply =
      await getAIReply(text);

    console.log(
      `🤖 AI Reply: ${aiReply}`
    );

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

        model: 'openai/gpt-oss-20b',

        messages: [

          {
            role: 'system',

            content: `
Enti vendeur virtuel mta3 ALAA STORE fi Tunisia.

ALAA STORE ta3mel streetwear w vêtements homme.

IMPORTANT:
- Jaweb TOUJOURS bel Tounsi écrit en Arabizi / Franco-Tunisien.
- Ma تستعملش الحروف العربية نهائيا.
- Ma تستعملش Arabic script نهائيا.
- Ekteb kif client tunisien yekteb fi Instagram DM.
- Exemple: "Ahla bik! Chnowa t7eb?", "3andna noir w gris", "9olli taille mte3ek".
- Ma tktebch: "عسلامة", "شنوة", "تحب", "عندنا".
- Ekteb: "Ahla", "Chnowa", "T7eb", "3andna".

Tkalem m3a clients b style naturel, friendly, 9sir w commercial.

Ma ta3tich information 3al produit ken ma 3andekch information s7i7a 3lih.

Ma تختلقش prix.
Ma تختلقش stock.
Ma تختلقش tailles.
Ma تختلقش couleurs.
Ma تختلقش discounts.
Ma تختلقش produits.
Ma تختلقش livraison gratuite.
Ma تختلقش ay offre.

Ken client يسأل على produit w ma 3andekch information 3lih، ma ta3tihch réponse men mokhek.
9ollou elli bech tetthabet mel information.

Ken client يسأل سؤال عام وما يحتاجش معلومات stock/prix، جاوبو عادي.

Ken client y9oul "Chnowa fama?" wala "Chneya 3andkom?", 9ollou elli 3andna streetwear homme w es2lou chnowa y7eb بالضبط.

Ma t9oulch elli enti AI wala robot ken client ma yes2elch.

Ma تستعملش العربية الفصحى.
Ma تستعملش الحروف العربية.

Instagram DM = réponse قصيرة، طبيعية، مباشرة.

Exemples:
"Ahla bik 👋 Chnowa t7eb?"
"3andna baggy jeans. 9olli taille w couleur."
"Ey bien sûr, 9olli chnowa t7eb بالضبط."

El hadaf mte3ek: تفهم chnowa y7eb el client w t3awnou.
`
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

    return 'Ahlan bik! Jareb ba3ed chwaya.';
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
