const express = require('express');
const Action_Router = express.Router();
module.exports = Action_Router;

const bcrypt = require('bcrypt') //DELETE LATER

let client = require(`./database.js`)
let info = client.db('info')
let collection_action = info.collection('action')
let collection_stats = info.collection('stats')

let { getPlayerStats } = require(`./valid.js`)
let { update_enemy } = require(`./update_enemy.js`)
let { compareToken } = require(`./token.js`)

//FINISH
Action_Router.post('/action', compareToken, async (req, res) => {

    let playerId = req.body.playerId
    let action = req.body.action

    //Validate! Check if there is enough data?
    if (!playerId || !action) {    //data to be checked availability
        res.send(`There's some undefined field.\nplayerId: ${playerId}\naction: ${action}`)
        return
    }

    //get player data
    let player = await getPlayerStats(playerId, res)

    //reject if no player data
    if (!player) {
        return
    }

    //Validate! Check if player already have an action
    let playerAction = await collection_action.findOne(
        { playerId: playerId }
    )

    //If they have an active action, then reject
    if (playerAction) {
        res.send(`You already have an active action:\n${playerAction.action}`)
        return
    }

    //Validate! Check if the action is a valid action
    if (action != "attack" && action != "evade" && action != "defend") {
        res.send("Invalid Action")
        return
    }

    //add the action
    let addAction = await collection_action.insertOne(
        {
            playerId: playerId,
            action: action
        }
    )

    let currentAction = await getActiveAction(playerId, res)

    res.send(`You've added an action:\n${currentAction.action}`)
})

//FINISH
Action_Router.get('/action', compareToken, async (req, res) => {

    let playerId = req.body.playerId

    //Validate! Check if there is enough data?
    if (!playerId) {    //data to be checked availability
        res.send(`There's some undefined field.\nplayerId: ${playerId}`)
        return
    }

    let player = await getPlayerStats(playerId, res)

    if (!player) {
        return
    }

    let playerAction = await getActiveAction(playerId, res)

    if (!playerAction) {
        return
    }

    res.send(playerAction)
})

//FINISH
Action_Router.patch('/action', compareToken, async (req, res) => {

    let playerId = req.body.playerId

    //get player data
    let player = await getPlayerStats(playerId, res)

    //reject if no player data
    if (!player) {
        return
    }

    let deleted_action = await deleteAction(playerId, res)

    if (!deleted_action) {
        return      //function already res message
    }

    if (deleted_action.action == "attack" && player.attack_action > 0) {

        await collection_stats.updateOne(
            { playerId: deleted_action.playerId },
            {
                $inc: {
                    enemy_current_health: -2,
                    attack_action: -1,
                    health_pts: (-1 * player.enemy_next_move.damage)
                }
            }
        )

        //Process player health = 0 AND DELETE STATS
        let isAlive = await isPlayerAlive(playerId, res)
        if (!isAlive) {
            return
        }

        //process enemy setup if not dead
        await update_enemy(playerId)

        //just to show data to player
        let latest_stats = await collection_stats.findOne(
            { playerId: playerId }
        )
        res.send(`Player Health: ${latest_stats.health_pts}\nEnemy Health: ${latest_stats.enemy_current_health}\nEnemy Next Action: ${latest_stats.enemy_next_move.attack_name}`)

    } else if (deleted_action.action == "evade" && player.evade_action > 0) {

        await collection_stats.updateOne(
            { playerId: deleted_action.playerId },
            { $inc: { evade_action: -1 } }
        )

        //since evade, player will not get hit and enemy will change move; enemy also do not receive any damage
        res.send(`You evaded the enemy's ${player.enemy_next_move.attack_name}`)

        //process enemy setup
        await update_enemy(playerId)

    } else if (deleted_action.action == "defend") {

        // Calculate half damage, rounding up if necessary
        let half_damage = Math.ceil(player.enemy_next_move.damage / 2);
        let result = await collection_stats.updateOne(
            { playerId: player.playerId },
            { $inc: { health_pts: -half_damage } }
        )

        //Process if player health = 0 AND DELETE STATS
        let isAlive = await isPlayerAlive(playerId, res)
        if (!isAlive) {
            return
        }

        //enemy setup
        let is_enemy_alive = await update_enemy(playerId)

        //just to show player data
        let latest_stats = await collection_stats.findOne(
            { playerId: playerId }
        )

        if (is_enemy_alive) {
        res.send(`Player Health: ${latest_stats.health_pts}\nEnemy Health: ${latest_stats.enemy_current_health}\nEnemy Next Action: ${latest_stats.enemy_next_move.attack_name}\nEnemy Next Action Damage: ${latest_stats.enemy_next_move.damage}`)
        } else {
        res.send(`Player Health: ${latest_stats.health_pts}\nA new ${latest_stats.current_enemy} appeared!\nEnemy Health: ${latest_stats.enemy_current_health}\nEnemy Next Action: ${latest_stats.enemy_next_move.attack_name}\nEnemy Next Action Damage: ${latest_stats.enemy_next_move.damage}`)
        }

    } else { res.send('Unable to do action,\nYou can choose "attack", "evade" and "defend"\nYou need enough action points to use "attack" and "evade"') }

})

//FINISH
Action_Router.delete('/action', compareToken, async (req, res) => {

    let playerId = req.body.playerId

    //Validate! Check if there is enough data?
    if (!playerId) {    //data to be checked availability
        res.send(`There's some undefined field.\nplayerId: ${playerId}`)
        return
    }

    //find player in stats
    let player = await getPlayerStats(playerId, res)

    if (!player) {
        return
    }

    //delete player's action
    let deleted_action = await deleteAction(playerId, res)

    //send message; must do this because the function could be sending res when not found player action
    if (deleted_action) {
        console.log(deleted_action)
        res.send(`You've deleted your active action`)
    }
})

Action_Router.get('/stats', compareToken, async (req, res) => {

    let playerId = req.body.playerId

    //Validate! Check if there is enough data?
    if (!playerId) {    //data to be checked availability
        res.send(`There's some undefined field.\nplayerId: ${playerId}`)
        return
    }

    //find player in stats
    let player = await getPlayerStats(playerId, res)

    if (!player) {
        return
    }

    let show_stats = await collection_stats.aggregate(
        [
            {
                '$match': {
                    'playerId': playerId
                }
            }, {
                '$project': {
                    '_id': 0
                }
            }
        ]
    ).toArray()

    res.send(show_stats)

})

async function getActiveAction(playerId, res) {

    //Validate! Check if player have an active action
    let playerAction = await collection_action.findOne(
        { playerId: playerId }
    )

    //If there is no active action, then reject
    if (!playerAction) {
        res.send(`No active action found`)
        return false
    }

    return playerAction
}

async function deleteAction(playerId, res) {

    let active_action = await getActiveAction(playerId, res)

    if (!active_action) {
        return false
    }

    let deleteAction = await collection_action.deleteOne(
        {
            _id: active_action._id
        }
    )

    return active_action
}

async function isPlayerAlive(playerId, res) {

    let player = await collection_stats.findOne(
        { playerId: playerId }
    )

    if (player.health_pts <= 0) {

        let final_stats = await collection_stats.findOne(
            { playerId: playerId }
        )

        let deletePlayer = await collection_stats.deleteOne(
            { playerId: playerId }
        )

        let player_leaderboard = await info.collection('leaderboard').insertOne(
            {
                player: final_stats.playerId,
                score: final_stats.current_score,
                coin: final_stats.coin
            }
        )

        res.send("You Died")
        return false
    }

    return true

}

function verifyToken(req, res, next) {

    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(` `)[1]

    if (token == null) return res.sendStatus(401)

    jwt.verify(token, "secret-password", (err, decoded) => {
        console.log(err)

        if (err) return res.sendStatus(403)

        req.identity = decoded

        next()
    })

}