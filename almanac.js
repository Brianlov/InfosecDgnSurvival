const express = require('express');
const AlmanacRouter = express.Router();
module.exports = AlmanacRouter;

let client = require(`./database.js`)

AlmanacRouter.get('/wiki', async (req, res) => {

    let enemies = await client.db('infosec').collection('almanac').find().toArray();

    res.send(enemies);
})
