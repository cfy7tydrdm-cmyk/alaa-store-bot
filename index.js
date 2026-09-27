const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'alaa_store_verify_2024';
const PAGE_ACCESS_TOKEN = process.env.PAGE_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Home
app.get('/', (req,res)=>{
  res.send('ALAA STORE Bot is Live!');
});

// VERIFICATION - HETHI LI NE9SA!
app.get('/webhook', (req,res)=>{
  console.log('🔍 Verification attempt:', req.query);
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if(mode === 'subscribe' && token === VERIFY_TOKEN){
    console.log('✅ VERIFIED!');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Token mismatch:', token);
    res.sendStatus(403);
  }
});

// RECEIVE MESSAGES
app.post('/webhook', async (req,res)=>{
  console.log('--- NEW WEBHOOK ---', JSON.stringify(req.body).slice(0,500));

  try{
    const body = req.body;

    if(body.object === 'page' || body.object === 'instagram'){

      for(const entry of body.entry){

        // Instagram messages
        if(body.object === 'instagram' && entry.messaging){

          for(const event of entry.messaging){

            // Ignore messages sent by the bot itself
            if(event.message?.is_echo) continue;

            const senderId = event.sender?.id;
            const text = event.message?.text;

            if(senderId && text){
              await handleMessage(senderId, text);
            }
          }
        }

        // Page messages
        if(body.object === 'page' && entry.messaging){

          for(const event of entry.messaging){

            const senderId = event.sender?.id;
            const text = event.message?.text;

            if(senderId && text){
              await handleMessage(senderId, text);
            }
          }
        }
      }
    }

    res.status(200).send('EVENT_RECEIVED');

  } catch(e){
    console.error('Webhook error:', e.response?.data || e.message);
    res.sendStatus(500);
  }
});

  try{
    const aiReply = await getAIReply(text);
    console.log(`AI Reply: ${aiReply}`);
    await sendMessage(senderId, aiReply);
  } catch(e){
    console.error('Handle error:', e.response?.data || e.message);
  }
}
async function getAIReply(userText){
  if(!GROQ_API_KEY) return "Ahlan bik fi ALAA STORE! Chnowa t7eb? 😊";
  try{
    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions',{
      model: 'llama-3.1-8b-instant',
      messages: [
        {role:'system', content:'Enti vendeur fi ALAA STORE streetwear Tunisia. Jaweb b tounsi, 9sir, friendly. Bi3 produits streetwear.'},
        {role:'user', content:userText}
      ]
    },{headers:{Authorization:`Bearer ${GROQ_API_KEY}`}});
    return res.data.choices[0].message.content;
  } catch(e){ return "Ahlan bik! Kifeh najem n3awnek?"; }
}

async function sendMessage(senderId, text){
  try{
    await axios.post(
      `https://graph.instagram.com/v26.0/17841448590483479/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        recipient:{id:senderId},
        message:{text}
      }
    );

    console.log('Reply SENT');
  } catch(e){
    console.error('Send error', e.response?.data || e.message);
  }
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=> console.log(`Server running on ${PORT}`));
