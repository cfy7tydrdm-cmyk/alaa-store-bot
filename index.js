const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'alaa_store_verify_2024';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
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
        const messaging = entry.messaging || entry.changes || [];
        // Instagram format
        if(body.object === 'instagram' && entry.messaging){
          for(const event of entry.messaging){
            const senderId = event.sender.id;
            const text = event.message?.text;
            if(text) await handleMessage(senderId, text);
          }
        }
        // Page format
        if(body.object === 'page'){
          for(const event of entry.messaging){
            const senderId = event.sender.id;
            const text = event.message?.text;
            if(text) await handleMessage(senderId, text);
          }
        }
      }
    }
    res.status(200).send('EVENT_RECEIVED');
  } catch(e){
    console.error(e);
    res.sendStatus(500);
  }
});

async function handleMessage(senderId, text){
  console.log(`Message from ${senderId}: ${text}`);
  try{
    const aiReply = await getAIReply(text);
    console.log(`AI Reply: ${aiReply}`);
    await sendMessage(senderId, aiReply);
  } catch(e){ console.error('Handle error', e); }
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
    await axios.post(`https://graph.facebook.com/v20.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,{
      recipient:{id:senderId},
      message:{text}
    });
    console.log('Reply SENT');
  } catch(e){ console.error('Send error', e.response?.data || e.message); }
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=> console.log(`Server running on ${PORT}`));
