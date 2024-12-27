const express=require('express');
const InventoryRouter=express.Router();
module.exports=InventoryRouter;
const client = require('./database')
const db = client.db('info');

let { compareToken } = require('./token.js')

const getPlayerById = async (playerId) => {
  if (!playerId) {
    throw new Error("Invalid ID format");
  }
  const player = await db.collection('stats').findOne({playerId});


  if (!player) {
    throw new Error("Player not found");
  }
  return player;
}



// GET the players
InventoryRouter.get('/players/inventory', compareToken, async (req, res) => {
  const{playerId}=req.body;
  if (!playerId) {
    res.status(400).send('Please enter u playerId')
    return
  }
  try{
  await getPlayerById(playerId)
  }catch (error) {
    res.status(400).send(error.message);
    return
  }

  const player=await db.collection('stats').findOne({playerId:playerId})
  if(player){
  const pipeline = [
    {
      '$match': {
        'playerId': playerId
      }
    }, 
    {
      '$project': {
        'inventory': 1
      }
    }
  ];
  const playerInventory = await db.collection('stats').aggregate(pipeline).toArray();
  res.status(200).json(playerInventory);
  return
} else {
  res.status(400).send("Error")
  return
}
});

//POST an item to a player's inventory
InventoryRouter.post('/buyinventory', compareToken, async (req, res) => {
const { playerId,itembuy } = req.body;
if (!playerId || !itembuy) {
  return res.status(400).send('Missing required fields: playerId and itembuy are required.');
}


  try {
     await getPlayerById(playerId);
    const player = await db.collection('stats').findOne({playerId:playerId})
    const itemfind=await db.collection('potion').findOne({item:itembuy})
    
    if(itemfind){
    if(!player.coin){
      return res.status(404).send('You have no coins');
    }

    const coin=player.coin-itemfind.coin

    if(coin>=0){
    await db.collection('stats').updateOne(
      { playerId: playerId },
      { 
        $push: { inventory: 
          {
            item: itemfind.item,
            health_pts: itemfind.health_pts,
            attack_action:itemfind.attack_action,
            evade_action: itemfind.evade_action
          } },
        $set: { coin: coin }
      }
    );

    //  res.status(200).json(Buy successfully now ${itembuy} is added in your inventory ,remain coin:${coin})
    }

    else if(coin<0){
      return res.status(404).send('You have insufficient coins');
    }
    let playerbuy=await db.collection('stats').findOne({playerId:playerId})
    res.status(200).json({ playerbuy, message: 'Item added to inventory' });
    }
    //No item
  //   else if(!itemfind)
  //   {
  //    return res.status(400).send("Item not found")
  //   }
  }
   catch (error) {
    console.log(error.message);
  }
});



InventoryRouter.patch('/usePotion', compareToken, async (req, res) => {
  const { playerId, item } = req.body;
  if (!playerId || !item) {
    return res.status(400).send('Missing required fields: playerId and item are required.');
  }
  // Find the player's document
  const player = await getPlayerById(playerId);
  if (!player) {
    return res.status(404).send('Player not found');
  }
  // Find the selected potion in the inventory
  const potion = player.inventory.find(p => p.item === item);
  if (!potion) {
    return res.status(404).send('Potion not found');
  }
  const newAttackAction = Math.min(player.attack_action + potion.attack_action, 10);
  const newHealthPts = Math.min(player.health_pts + potion.health_pts, 10);
  const evadePts= Math.min(player.evade_action + potion.evade_action, 5);
  // Update the attack_action and health_pts field
  let updatedPlayer = null;
  if(player.attack_action<=10 && player.health_pts<=10 && player.evade_action<=10){  
     updatedPlayer = await db.collection("stats").updateOne(
      { playerId:playerId },
      {
        $set: {
          attack_action: newAttackAction,
          health_pts: newHealthPts,
          evade_action:evadePts
        },
        $pull: { inventory: { item:item } }  // remove the used potion from inventory
      },
    );
  
  }
  else if(player.attack_action>=10 && player.health_pts>=10&& player.evade_action>=10)
  {
    return res.status(400).send("The attack and health is full");
  }
  result=await db.collection('stats').findOne({playerId})
  if(result){
  res.status(200).json(result)
  }
  else{
    res.status(400).send("Error")

  }
  
  
});
// DELETE an item from a player's inventory
InventoryRouter.delete('/delete/inventory', compareToken, async (req, res) => {
  const { playerId, item } = req.body;
  if (!playerId || !item) {
    return res.status(400).send('Missing required fields: playerId and item are required.');
  }

  try {
    const player = await getPlayerById(playerId);
    if (!player) {
      return res.status(404).send('Player not found');
    }


    const result = await db.collection('stats').updateOne(
      { playerId: playerId },
      { $pull: { inventory: { item: item } } }
    );

    if (result.modifiedCount === 0) {
      console.log('No modifications made by updateOne'); // Debugging line
      return res.status(404).send('Item not found');
    }

    res.send('Item removed from inventory');
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred');
  }
});

// GET the items
InventoryRouter.get('/shop', async (req, res) => {
 
  try {
    const items = await db.collection('potion').find().toArray();
    res.send(items);
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred');
  }
  
});
