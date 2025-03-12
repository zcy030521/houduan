
var express = require('express');
var router = express.Router();
let { userModel, LYModel, roleModel } = require("../module/modules")
let {shopmodel,catemodel} =require("../module/shopmodule")
let jwt = require('jsonwebtoken');
const { format } = require('morgan');

router.post("/login", async (req, res) => {
  let { user, password } = req.body
  const userinfo = await userModel.findOne({ user:user })
  console.log(userinfo,user,password);
  
  if (!userinfo) {
    res.send({
      code: 400,
      msg: "用户不存在"
    })
    return false
  }
  if (userinfo.password !== password) {
    res.send({
      code: 400,
      msg: "密码错误"
    })
    return false
  }
  const token = jwt.sign({ userId: userinfo._id }, '2404B')
  console.log(token);
  // let list = req.get("Authorization")
  // console.log(list);
  
  res.send({
    code: 200,
    token,
    ...req.user
  })
})
router.get("/list", async(req, res) => {
  let token = req.get('Authorization');
  token = token.split("Bearer ")[1];
  const { userId } = jwt.verify(token, "2404B");
  // console.log(user);
  console.log(jwt.verify(token, "2404B"));
  
  let data = await userModel.findOne({ _id:userId }).populate({
    path: "role",
    populate: {
      path: "permission",
      populate:{
        path: "p_id",
      }
    },
  })
  console.log(data);
  res.send({
    code: 200,
    data,
  })
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

//添加商品信息
router.post("/addshop",async(req,res)=>{
  console.log(req.body);
  await shopmodel.create(req.body)
  res.send({code:200,msg:"添加成功"})
})
router.post("/addcate",async(req,res)=>{
    await catemodel.create(req.body)
    res.send({code:200,msg:"添加成功"})
})

//获取商品信息
router.get("/shoplist",async(req,res)=>{
  let data = await shopmodel.find()
  res.send({code:200,data})
})

module.exports = router;
