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
// CONVERSATION MEMORY
// ===============================

// Memory لكل client
// كل client عندو conversation وحدها

const conversations = {};

const MAX_MESSAGES = 12;


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

  console.log(
    'Verification attempt:',
    req.query
  );

  const mode =
    req.query['hub.mode'];

  const token =
    req.query['hub.verify_token'];

  const challenge =
    req.query['hub.challenge'];

  if (
    mode === 'subscribe' &&
    token === VERIFY_TOKEN
  ) {

    console.log('VERIFIED!');

    res
      .status(200)
      .send(challenge);

  } else {

    console.log(
      'Token mismatch:',
      token
    );

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

      return res
        .status(200)
        .send('EVENT_RECEIVED');
    }


    for (
      const entry of body.entry || []
    ) {


      // ===============================
      // INSTAGRAM
      // ===============================

      if (
        body.object === 'instagram' &&
        entry.messaging
      ) {

        for (
          const event of entry.messaging
        ) {

          // Ignore our own messages
          if (
            event.message?.is_echo
          ) {

            console.log(
              'Ignoring bot echo'
            );

            continue;
          }


          const senderId =
            event.sender?.id;

          const text =
            event.message?.text;


          if (
            senderId &&
            text
          ) {

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

        for (
          const event of entry.messaging
        ) {

          const senderId =
            event.sender?.id;

          const text =
            event.message?.text;


          if (
            senderId &&
            text
          ) {

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
      'WEBHOOK ERROR:',
      error.response?.data ||
      error.message
    );

    res.sendStatus(500);
  }
});


// ===============================
// HANDLE CUSTOMER MESSAGE
// ===============================

async function handleMessage(
  senderId,
  text
) {

  console.log(
    `Message from ${senderId}: ${text}`
  );


  try {

    // Create memory for new client
    if (
      !conversations[senderId]
    ) {

      conversations[senderId] = [];
    }


    // Add customer message
    conversations[senderId].push({

      role: 'user',

      content: text
    });


    // Keep only last messages
    if (
      conversations[senderId].length >
      MAX_MESSAGES
    ) {

      conversations[senderId] =
        conversations[senderId].slice(
          -MAX_MESSAGES
        );
    }


    const aiReply =
      await getAIReply(
        senderId,
        text
      );


    console.log(
      `AI Reply: ${aiReply}`
    );


    // Save bot reply in memory
    conversations[senderId].push({

      role: 'assistant',

      content: aiReply
    });


    // Keep memory limited
    if (
      conversations[senderId].length >
      MAX_MESSAGES
    ) {

      conversations[senderId] =
        conversations[senderId].slice(
          -MAX_MESSAGES
        );
    }


    await sendMessage(
      senderId,
      aiReply
    );


  } catch (error) {

    console.error(
      'HANDLE MESSAGE ERROR:',
      error.response?.data ||
      error.message
    );
  }
}


// ===============================
// GROQ AI
// ===============================

async function getAIReply(
  senderId,
  userText
) {

  if (!GROQ_API_KEY) {

    console.error(
      'GROQ_API_KEY is missing'
    );

    return 'Chnowa t7eb ta3ref?';
  }


  try {

    const conversation =
      conversations[senderId] || [];


    const response =
      await axios.post(

        'https://api.groq.com/openai/v1/chat/completions',

        {

          model:
            'openai/gpt-oss-20b',


          messages: [

            {

              role: 'system',

              content: `

You are the virtual salesperson of ALAA STORE in Tunisia.

ALAA STORE sells men's streetwear and clothing.

LANGUAGE:

Always reply in Tunisian Arabic written only with Latin letters and numbers.

Never use Arabic alphabet.

Never use Arabic script.

Use natural Tunisian Instagram DM style.

Examples:

Ahla bik! Chnowa t7eb?

Ey 3andna.

9olli taille mte3ek.

Chnowa el couleur elli t7ebha?

B9adech?

Ey fama.

STYLE:

Be friendly.

Be natural.

Be short.

Be direct.

Do not repeat the same greeting in every message.

IMPORTANT CONVERSATION RULE:

You are talking with the same customer throughout the conversation.

Use the previous messages to understand what the customer is talking about.

If the customer says something short like:

33

XL

Noir

Gris

Ey

Le

Oui

Oui noir

B9adech

Then understand it using the previous conversation.

Do not ask the customer to repeat information that was already provided.

Example:

Customer:
Nheb baggy jean bleu.

You:
9olli taille mte3ek?

Customer:
33

Correct reply:
Ey, taille 33. T7ebha bleu kif ma 9olt?

Wrong reply:
Ahla! 33 chnowa t7eb?

Another example:

Customer:
Nheb pull noir.

You:
9olli taille mte3ek?

Customer:
XL

Correct reply:
Ey, pull noir taille XL.

Wrong reply:
Ahla! XL chnowa t7eb?

GREETING RULE:

Use a greeting such as "Ahla bik" mainly at the beginning of a new conversation.

If the conversation already started, do not restart the conversation with "Ahla bik".

Continue naturally from the previous message.

PRODUCT INFORMATION:

Never invent product information.

Never invent prices.

Never invent stock.

Never invent sizes.

Never invent colors.

Never invent discounts.

Never invent products.

Never invent delivery offers.

Never invent free delivery.

If you do not know something, say that you need to check the information.

Do not pretend that a product is available if you do not have confirmed stock information.

CUSTOMER INTENT:

Understand what the customer wants before replying.

If the customer is asking about a product, stay focused on that product.

If the customer gives a size, understand that the size belongs to the product discussed previously.

If the customer gives a color, understand that the color belongs to the product discussed previously.

If the customer asks for price, answer about the product being discussed.

If the customer asks about delivery, answer about delivery.

Do not change the subject without a reason.

DO NOT SAY YOU ARE AI:

Do not say you are an AI or robot unless the customer specifically asks.

INSTAGRAM STYLE:

Keep replies short and natural.

Do not write long paragraphs.

Do not use formal Arabic.

Do not use Arabic alphabet.

Your goal is to understand the customer, continue the conversation naturally, and help them complete their purchase.

`
            },

            // Conversation history
            ...conversation

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
      response.data
        ?.choices?.[0]
        ?.message?.content;


    if (!reply) {

      console.error(
        'GROQ returned no reply:',
        response.data
      );

      return '9olli chnowa t7eb exactement.';
    }


    return reply.trim();


  } catch (error) {

    console.error(
      'GROQ ERROR:',
      error.response?.data ||
      error.message
    );

    return 'Jareb ba3ed chwaya.';
  }
}


// ===============================
// SEND INSTAGRAM MESSAGE
// ===============================

async function sendMessage(
  senderId,
  text
) {

  if (!PAGE_ACCESS_TOKEN) {

    console.error(
      'PAGE_TOKEN is missing'
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
      'Reply SENT'
    );


  } catch (error) {

    console.error(
      'SEND ERROR:',
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


app.listen(
  PORT,
  () => {

    console.log(
      `ALAA STORE Bot running on port ${PORT}`
    );
  }
);
