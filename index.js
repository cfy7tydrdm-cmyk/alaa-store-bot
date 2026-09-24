const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'alaa_store_123';
const PAGE_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Webhook verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('WEBHOOK VERIFIED!');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Receive messages (Facebook + Instagram)
app.post('/webhook', async (req, res) => {
  console.log('--- NEW WEBHOOK ---');
  console.log(JSON.stringify(req.body, null, 2));

  const body = req.body;

  if (body.object === 'page' || body.object === 'instagram') {
    for (const entry of body.entry) {
      const messaging = entry.messaging || [];
      for (const event of messaging) {
        if (event.message && !event.message.is_echo) {
          const senderId = event.sender.id;
          const text = event.message.text;
          console.log(`Message from ${senderId}: ${text}`);
          await handleMessage(senderId, text);
        }
      }
    }
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

async function handleMessage(senderId, text) {
  try {
    // AI Reply with Groq
    const aiResponse = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: 'Enti bot mta3 ALAA STORE, ma7al streetwear fi Tunisia. Jawb b tounsi, b tari9a friendly, w bi3 l client. 3andek cargo, jogging, hoodie, t-shirt. Livraison fi Tunis kamel 7dt.' },
        { role: 'user', content: text }
      ]
    }, {
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` }
    });

    const reply = aiResponse.data.choices[0].message.content;
    console.log('AI Reply:', reply);

    // Send back
    await axios.post(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_TOKEN}`, {
      recipient: { id: senderId },
      message: { text: reply }
    });
    console.log('Reply SENT to', senderId);

  } catch (err) {
    console.error('ERROR:', err.response?.data || err.message);
  }
}

app.get('/', (req, res) => res.send('ALAA STORE Bot is Live!'));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
