const express = require('express');
const Action_Router = express.Router();
module.exports = Action_Router;

const bcrypt = require('bcrypt') //DELETE LATER

let client = require(`./database.js`)
let ds_db = client.db('ds_db')
let collection_action = ds_db.collection('action')
let collection_stats = ds_db.collection('stats')

let { getPlayerStats } = require(`./valid.js`)

let { update_enemy } = require(`./update_enemy.js`)

//FINISH
Action_Router.post('/action', async (req, res) => {

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
Action_Router.get('/action', async (req, res) => {

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
Action_Router.patch('/action', async (req, res) => {

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

            let deletePlayer = await collection_stats.deleteOne(
                { playerId: playerId }
            )
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

            let deletePlayer = await collection_stats.deleteOne(
                { playerId: playerId }
            )
        }

        //enemy setup
        await update_enemy(playerId)

        //just to show player data
        let latest_stats = await collection_stats.findOne(
            { playerId: playerId }
        )
        res.send(`Player Health: ${latest_stats.health_pts}\nEnemy Health: ${latest_stats.enemy_current_health}\nEnemy Next Action: ${latest_stats.enemy_next_move.attack_name}`)


    } else { res.send('Unable to do action,\nYou can choose "attack", "evade" and "defend"\nYou need enough action points to use "attack" and "evade"') }

})

//FINISH
Action_Router.delete('/action', async (req, res) => {

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
        res.send("You Died")
    }

    return player.health_pts > 0

}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Action_Router.post('/register', async (req, res) => {
//     let Exists = await client.db("ds_db").collection("account").findOne({
//         player: req.body.player
//     });
//     if (Exists) {
//         res.status(404).send("Player already exists");
//     }
//     else {
//         const hash = bcrypt.hashSync(req.body.password, 10);
//         let result = await client.db("ds_db").collection("account").insertOne({
//             player: req.body.player,
//             password: hash
//         });

//         let result1 = await client.db('ds_db').collection('almanac').aggregate([{ $sample: { size: 1 } }]).toArray();

//         let document = result1[0]; // get the first document from the result array
//         let skills = document.skill;

//         // Generate a random index
//         let randomIndex = Math.floor(Math.random() * skills.length);

//         // Get a random skill
//         let randomSkill = skills[randomIndex];




//         let statPlayer = await client.db("ds_db").collection("stats").insertOne({
//             playerID: req.body.player,
//             heath_pts: 10,
//             attack_action: 10,
//             evade_action: 5,
//             inventory: 0,
//             current_enemy: document.enemy,
//             enemy_current_health: document.base_health,
//             enemy_next_move: randomSkill,
//             current_score: 0
//         })
//         res.send({ message: "Account created successfully, please remember your player id" });
//     }
// })