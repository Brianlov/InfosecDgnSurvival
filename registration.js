const express = require('express');
const registrationRouter=express.Router();
module.exports=registrationRouter;

const bcrypt = require('bcrypt')

const client = require(`./database.js`)
var jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');

let { randomise_enemy_skill } = require(`./update_enemy.js`)

//app.use(express.json());

//part for token verification

// client.connect()
//     .then(() => {
//         app.listen(3000, () => {
//             console.log(`Server is running on port 3000`);
//         });
//     })
//     .catch(err => console.error(err));

    function verifyToken(req, res, next) {
      const bearerHeader = req.headers['authorization'];
      if (typeof bearerHeader !== 'undefined') {
          const bearer = bearerHeader.split(' ');
          const bearerToken = bearer[1];
          req.token = bearerToken;
          jwt.verify(req.token, 'chiikawaaaaaaa', (err, authData) => {
              if(err) {
                  res.sendStatus(403);
              } else {
                  req.authData = authData;
                  next();
              }
          });
      } else {
          res.sendStatus(403);
      }
  }



registrationRouter.post('/account/login',async(req,res) => { 
    // step #1:req.body.username
      let result = await client.db("info").collection("account").findOne({
        player: req.body.player
    })
    console.log(result);
    console.log(req.body);
    if(!req.body.player || !req.body.password){
      res.status(404).send('Please provide username and password')
      return
    }
    else if(req.body.player != null && req.body.password != null){
    
      if(result){
        //step2:if user exists, check if password is correct
        if(bcrypt.compareSync(req.body.password,result.password)==true){
          var token = jwt.sign(
            { _id: result._id, player: result.player}, 
            'chiikawaaaaaaa',
          
          { expiresIn: 60*60*2  });
          //paaword is correct
          res.send(token);
        } else{
          //password is incorrect
          res.status(404).send('Wrong Password');
        
        }
      }else{
        //step3:if user not found
        res.send('User not found');
      
      }
  }
  })
  
  
  
  
  registrationRouter.get('/account/:id',verifyToken, async(req, res) => {
    if (req.authData._id != req.params.id) {
      res.send('User is not authorized')
      return
    }
    let auth = req.headers.authorization
    console.log(auth)
  
    let authSplitted = auth.split(' ')
    console.log(authSplitted)
  
    let token = authSplitted[1]
    console.log(token)
  
    let decoded = jwt.verify(token, 'chiikawaaaaaaa')
    console.log(decoded)
  
    if (req.authData._id != req.params.id) {
      res.send('User is not authorized')
      return
    }
    else{
    let result= await client.db("info").collection("account").findOne({
      _id: new ObjectId(req.params.id)
    })
    res.send(`Player name : ${result.player}\n _id: ${result._id}`)
    
  }
  })


// Get the leaderboard

registrationRouter.get('/leaderboard', async(req, res) => {
    let LatestLB = await client.db("info").collection("leaderboard")
        .find()
        .sort({ score: -1 }) // Sort by score in descending order
        .toArray();

    res.json(LatestLB);
});




//account registration



registrationRouter.post('/account/register',async(req,res)=>{

  if(!req.body.player || !req.body.password){
    res.status(404).send('Please provide username and password')
    return
  }

    let Exists= await client.db("info").collection("account").findOne({
        player:req.body.player
    });
    if(Exists){
        res.status(404).send("Player already exists");
        return
    }
    else{
        const hash = bcrypt.hashSync(req.body.password, 10);
        let result= await client.db("info").collection("account").insertOne({
            player:req.body.player,
            password:hash
       
        });
        let result1 = await client.db('info').collection('almanac').aggregate([{$sample:{size:1}}]).toArray();
      let document = result1[0]; // get the first document from the result array
      // let skills = document.skill;

      // Generate a random index
      // let randomIndex = Math.floor(Math.random() * skills.length);

      // Get a random skill
      // let randomSkill = skills[randomIndex];
      
      let the_enemy_skill = await randomise_enemy_skill(document.enemy)

      let statPlayer= await client.db("info").collection("stats").insertOne({
          playerId:req.body.player,
          health_pts:10,
          attack_action:10,
          evade_action:5,
          inventory:[],
          coin: 10,
          current_score:0,
          current_enemy:document.enemy,
          enemy_current_health:document.base_health,
          enemy_next_move:the_enemy_skill,
    
     })
    }
    
    let give_id = await client.db('info').collection('account').findOne(
      { player: req.body.player }
     )

    res.send(`Account created successfully\nuser id: ${give_id._id}\nplease remember your user id!`);
    
})


//forget userid

registrationRouter.post('/account/forgetuserID', async(req, res) => {
    let result = await client.db("info").collection("account").findOne({
      player: req.body.player
        
    })
    if(!req.body.player || !req.body.password){
        res.status(404).send('Please provide username and password')
      }
      else if(req.body.player != null && req.body.password != null){
      
        if(result){
          //step2:if user exists, check if password is correct
          if(bcrypt.compareSync(req.body.password,result.password)==true){
            //paaword is correct
            res.send(result._id);
          } else{
            //password is incorrect
            res.status(404).send('Wrong Password');
          
          }
        }else{
          //step3:if user not found
          res.send('User not found');
        
        }
    }
});


//update or change password for current account
registrationRouter.patch ("/account/changepassword" ,async (req, res) => {

  if(!req.body.player || !req.body.password){
    res.status(404).send('Please provide username and password')
    return
  }

    if (!req.body.newpassword) {
      return res.status(400).send('New password is required');
  }

    let findUser = await client.db('info').collection('account').findOne({player:req.body.player});

    if(!findUser) {
      res.send('user not found')
      return
    }

        if (bcrypt.compareSync(req.body.password, findUser.password) == true){ //compare the password with the hashed password in the database
        
        req.body.password = bcrypt.hashSync(req.body.newpassword, 10); //hash the new password
        await client.db('info').collection('account').updateOne({player:req.body.player}, {$set: {password:req.body.password}}); //update the password in the database
        res.send('password changed successfully');
        } 
        else { //password is incorrect
            res.status(401).send('password incorrect')
          }

    });


//delete current account
registrationRouter.delete('/account/delete/:id',verifyToken, async(req, res) => {

  let player = await client.db("info").collection("account").findOne(
    { _id: new ObjectId(req.params.id) }
  )

  if(!req.body.password || !req.body.player) {
    res.send('Not enough data\nPlease provide the player and password')
    return
  }

  if(req.authData._id != req.params.id){
          res.send('User is not authorized')
          return
        }
        else if(!player){
          res.send(`Could not find player`)
          return
        }
        else if(bcrypt.compareSync(req.body.password,player.password)==false){
          res.send('Incorrect password')
          return
        }
        else{

        let result= await client.db("info").collection("account").deleteOne({
            _id: new ObjectId(req.params.id)
        })

        let delete_stats = await client.db("info").collection("stats").deleteOne(
          { playerId: player.player }
        )

        let delete_leaderboard = await client.db('info').collection('leaderboard').deleteOne(
          { player: player.player }
        )

        let delete_action = await client.db('info').collection('leaderboard').deleteOne(
          { playerId: player.player }
        )
        
        res.send("Account Deleted Successfully");

        }
        
    
    });
