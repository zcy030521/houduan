
var express = require('express');
var router = express.Router();
let {LYModel,LoginModel} = require("../module/db")
/* GET home page. */
// router.get('/', function(req, res, next) {
//   res.render('index', { title: 'Express' });
// });

router.get("/ly", async(req,res)=>{
  let result = await LYModel.find().populate("p_id")
  res.send({result})
})

router.post("/login",async(req,res)=>{
    let {user,pwd} = req.body
    let data = await LoginModel.findOne({user,pwd})
    if(data) res.send({code:200,msg:"登录成功"})
    else res.send({code:404,msg:"登录失败"})
})

router.post("/register",async(req,res)=>{
  let {user,pwd} = req.body
  await LoginModel.create({user,pwd})
  res.send({code:200,msg:"注册成功"})
})
router.post("/add", async(req,res)=>{
  let result = await LYModel.create(req.body)
  res.send({result})
})


module.exports = router;
