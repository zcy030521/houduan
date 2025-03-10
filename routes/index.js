var express = require('express');
var router = express.Router();
let { userModel, LYModel, roleModel } = require("../module/modules")
let jwt = require('jsonwebtoken')

/* GET home page. */
// router.get('/', function(req, res, next) {
//   res.render('index', { title: 'Express' });
// });
// let user_token = {}
// router.get("/ly", async (req, res) => {
//   let result = await LYModel.find().populate("p_id")
//   res.send({ result })
// })

// // router.post("/add", async (req, res) => {
// //   let result = await LYModel.create(req.body)
// //   res.send({ result })
// // })
// router.get('/user_permission', async (req, res) => {
//   // 获取前端传递的token
//   const token = req.headers.authorization.substring(7)
//   // 根据token获取对应的角色id
//   // console.log(user_token[token]);
//   // 根据用户的角色ID查询用户的角色信息
//   const role = await roleModel.findOne({ _id: user_token[token] })
//   // 根据角色ID查询所有的权限信息
//   const permission = await permissionModel.find({ _id: { $in: role.permission } })
//   const data_tree = covert(permission)
//   console.log(data_tree);

//   return res.send({
//     code: 200,
//     data: data_tree
//   })
// })
// router.post('/login', async (req, res) => {
//   const { name, password } = req.body
//   // const newname=decryptInput(name)
//   // const newpassword=decryptInput(password)
//   // console.log(name,newname,password,newpassword);
//   const user = await userModel.findOne({ name: name, password: password })
//   if (user) {
//     // 生成token
//     let accessTokenData = accessToken({ user: user.name })
//     let refreshTokenData = refreshToken({ user: user.name })
//     const token = jwt.sign({ username: name }, '2312A', { expiresIn: "1h" })
//     // 存储用户的token和用户信息
//     user_token[token] = user.role
//     // 返回token
//     res.send({
//       code: 200,
//       token,
//       code: 200,
//       msg: "登录成功",
//       accessToken: accessTokenData,
//       refreshToken: refreshTokenData,
//       data: user
//     })
//     return false
//   }
//   res.send({
//     code: 400
//   })
// })
// // 通过递归将扁平化数据结构转换成树状结构
// function covert(data) {
//   function tree(id) {
//     let arr = []
//     filter_data = data.filter(item => String(item.p_id) == String(id))//过滤出当前id下的所有数据
//     // console.log(filter_data);
//     filter_data.forEach(item => {//遍历当前id下的所有数据，递归调用tree函数
//       const obj = {//创建对象，将当前id下的所有数据转换成树状结构
//         _id: item._id,
//         name: item.name,
//         router: item.router,
//         children: tree(item._id)//递归调用tree函数，传入当前id下的所有数据的_id作为新的id

//       }
//       arr.push(obj)//将当前id下的所有数据转换成树状结构，并推入arr数组中
//     })
//     return arr//返回树状结构数据

//   }
//   return tree(undefined)//调用tree函数，传入undefined作为初始id

// }
// router.post("/useradd", (req, res) => {
//   userModel.create(req.body)
//   res.send({ code: 200 })
// })
// router.post("/roleadd", (req, res) => {
//   roleModel.create(req.body)
//   res.send({ code: 200 })
// })

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
  let list = req.get("Authorization")
  console.log(list);
  
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
      path: "permission"
    }
  })
  // console.log(data);
  res.send({
    code: 200,
    data,
  })
})


module.exports = router;
