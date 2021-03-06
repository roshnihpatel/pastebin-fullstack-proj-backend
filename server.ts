import { Client } from "pg";
import { config } from "dotenv";
import express from "express";
import cors from "cors";

config(); //Read .env file lines as though they were env vars.

//Call this script with the environment variable LOCAL set if you want to connect to a local db (i.e. without SSL)
//Do not set the environment variable LOCAL if you want to connect to a heroku DB.

//For the ssl property of the DB connection config, use a value of...
// false - when connecting to a local DB
// { rejectUnauthorized: false } - when connecting to a heroku DB
const herokuSSLSetting = { rejectUnauthorized: false }
const sslSetting = process.env.LOCAL ? false : herokuSSLSetting

const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: sslSetting,
};

const app = express();



app.use(express.json()); //add body parser to each following route handler
app.use(cors()) //add CORS support to each following route handler

const client = new Client(dbConfig);
client.connect();

app.get("/pastes", async (req, res) => {
  const dbres = await client.query('select * from pastebin order by timestamp desc limit 10');
  res.set('Access-Control-Allow-Origin', '*')
  res.json(dbres.rows);
});

app.post("/pastes", async (req, res) => {
  await client.query('insert into pastebin (content, title, timestamp) values ($1, $2, now())', [req.body.content, req.body.title])
  res.set('Access-Control-Allow-Origin', '*')
  res.json({status: 'success'})
});

app.delete("/pastes/:id", async (req, res) => {
  await client.query('delete from comments where paste_id = $1', [req.params.id])
  await client.query('delete from pastebin where id = $1', [req.params.id])
  res.set('Access-Control-Allow-Origin', '*')
  res.json({status: 'success'})
})

//for comments section
app.get('/pastes/:pastes_id/comment', async (req, res) => {
  const data = await client.query('select * from comments where paste_id = $1 order by timestamp desc limit 10', [req.params.pastes_id])
  res.set('Access-Control-Allow-Origin', '*')
  res.json(data.rows)
});

app.post('/pastes/:pastes_id/comment', async (req, res) => {
  await client.query('insert into comments (paste_id, comment, timestamp) values ($1, $2, now())', [req.params.pastes_id, req.body.comment])
  res.set('Access-Control-Allow-Origin', '*')
  res.json({status: 'success'})
});

app.delete('/pastes/:pastes_id/comment/:id', async (req,res) => {
  await client.query('delete from comments where paste_id = $1 and id = $2', [req.params.pastes_id, req.params.id])
  res.set('Access-Control-Allow-Origin', '*')
  res.json({status: 'success'})
});

//Start the server on the given port
const port = process.env.PORT;
if (!port) {
  throw 'Missing PORT environment variable.  Set it in .env file.';
}
app.listen(port, () => {
  console.log(`Server is up and running on port ${port}`);
});
