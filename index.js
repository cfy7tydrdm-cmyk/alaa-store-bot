require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());
const PAGE_TOKEN = process.env.PAGE_TOKEN;
const GROQ_KEY = process.env.GROQ_API_KEY;
const VERIFY_TOKEN = "alaa_store_123";
app.get('/', (req,res)=> res.send('ALAA STORE Bot is Live!'));
app.get('/webhook', (req,res)=>{
  if(req.query['hub.verify_token'] === VERIFY_TOKEN){
    res.send(req.query['hub.challenge']);
  } else res.sendStatus(403);
});
app.post('/webhook', async (req,res)=>{
  try{
    for(let entry of req.body.entry){
      for(let event of entry.messaging){
        if(event.message && event.message.text){
          let sender = event.sender.id;
          let ai = await axios.post('https://api.groq.com/openai/v1/chat/completions',{
            model: "llama-3.1-8b-instant",
            messages: [{role:"system", content:"You are ALAA STORE assistant streetwear Tunisia"},{role:"user", content: event.message.text}]
          },{headers:{Authorization:`Bearer ${GROQ_KEY}`}});
          let reply = ai.data.choices[0].message.content;
          await axios.post(`https://graph.facebook.com/v20.0/me/messages?access_token=${PAGE_TOKEN}`,{
            recipient:{id:sender},
            message:{text: reply}
          });
        }
      }
    }
    res.sendStatus(200);
  }catch(e){
    console.log(e.response ? e.response.data : e.message);
    res.sendStatus(200);
  }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('Running on', PORT));
