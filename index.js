const express = require('express')
const app = express()
const port = process.env.PORT || 3000;

app.use(express.json())

let client = require(`./database`)

const almanacRoute = require(`./almanac`)
const inventoryRoute = require(`./inventory`)
const nextActionRoute = require(`./next_action`)
const registrationRoute = require(`./registration`)

app.use(almanacRoute)
app.use(inventoryRoute)
app.use(nextActionRoute)
app.use(registrationRoute)

app.get('/', (req, res) => {
   res.send('Welcome to dungeon dive game!')
 })

let no_endpoint_message = `The endpoint you entered is not available
Here are some endpoints available

account related:
POST - /account/register
POST - /account/forgetuserID
POST - /account/login
GET - /account/(your id)
PATCH - /account/changepassword
DELETE - /account/delete/(your id)

[endpoints below needs token in token bearer. Login to get your token]
[If you are unauthorized, try getting a new token]

inventory and potion related:
GET - /players/inventory
POST - /buyinventory
PATCH - /usePotion
DELETE - /delete/inventory
GET - /shop

gameplay related:
POST - /action
GET - /action
PATCH - /action
DELETE - /action
GET - /stats
GET - /wiki
GET - /leaderboard`

app.use((req, res) => {
  res.send(no_endpoint_message)
})
///////////////////////////////////////////////////////////////////////////////////////////////////////

app.listen(port, () => {
   console.log(`Example app listening on port ${port}`)
})

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
   //  await client.close();
  }
}
run().catch(console.dir);
