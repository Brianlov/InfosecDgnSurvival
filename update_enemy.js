let client = require(`./database.js`)
let collection_almanac = client.db('info').collection('almanac')
let collection_stats = client.db('info').collection('stats')

module.exports = { update_enemy, randomise_enemy_skill }

async function randomise_enemy() {

    let enemy_list = await collection_almanac.find().toArray()

    //making a random index to choose in almanac
    let randomEnemyIndex = Math.floor(Math.random() * enemy_list.length)

    //this is the enemy chosen at random
    let chosenEnemy = enemy_list[randomEnemyIndex]

    return chosenEnemy
}

async function randomise_enemy_skill(enemy_name) {

    let enemy_current = await collection_almanac.findOne(
        { enemy: enemy_name }
    )

    let randomEnemySkillIndex = Math.floor(Math.random() * enemy_current.skill.length)

    enemy_new_skill = enemy_current.skill[randomEnemySkillIndex]

    return enemy_new_skill

    // let enemy_change_skill = await client.db('info').collection('stats').updateOne(
    //     { playerId: player.playerId },
    //     { $set: { enemy_next_move: enemy_new_skill } }
    // )
}

async function update_enemy (playerId) {

    let current_enemy = await collection_stats.findOne(
        { playerId: playerId }
    )

    let enemy_name
    let enemy_health
    let is_alive

    // enemy is dead
    if(current_enemy.enemy_current_health <= 0) {

        is_alive = false

        let how_much = await collection_almanac.findOne(
            { enemy: current_enemy.current_enemy }
        )

        let reward = await collection_stats.updateOne(
            { playerId: playerId },
            {
                $inc:
                {
                    coin: how_much.coin,
                    current_score: how_much.score
                }
            }
        )

        current_enemy = await randomise_enemy()
        enemy_name = current_enemy.enemy
        enemy_health = current_enemy.base_health

    } else {    //enemy is still alive *dramatic music*
        is_alive = true
        enemy_name = current_enemy.current_enemy
        enemy_health = current_enemy.enemy_current_health
    }

    let enemy_skill = await randomise_enemy_skill(enemy_name)

    let new_enemy = await collection_stats.updateOne(
        { playerId: playerId },
        {
            $set:
            {
                current_enemy: enemy_name,
                enemy_current_health: enemy_health,
                enemy_next_move: enemy_skill
            }
        }
    )

    return is_alive

}