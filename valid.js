//const express = require('express');

let client = require(`./database.js`)

module.exports = { getPlayerStats }

async function getPlayerStats(playerId, res) {

    //Validate! Check if the player exists
    let player = await client.db('infosec').collection('stats').findOne(
        { playerId: playerId }
    )

    //If player does not exist, then reject
    if (!player) {
        res.send(`Could not find ${playerId}.`)
        return false
    }

    return player
}