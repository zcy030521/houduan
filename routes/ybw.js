var express = require('express');
var router = express.Router();
let {user1} = require("../module/model")
//登录
router.post('/login',async(req,res)=>{
  let {loginId,LoginPwd} = req.body;
  let result = await user1.findOne({loginId,LoginPwd});
  if(result){
    res.send({code:200,msg:'登录成功',data:result});
  }
  else{
    res.send({code:400,msg:'登录失败'});
  }
})

//注册
router.post('/register',async(req,res)=>{
  let {loginId,LoginPwd} = req.body;
  let result = await user1.findOne({loginId});
  if(result){
    res.send({code:400,msg:'用户名已存在'});
  }
  else{
    let user = new user1({loginId,LoginPwd});
    await user.save();
    res.send({code:200,msg:'注册成功'});
  }
})

module.exports = router;
