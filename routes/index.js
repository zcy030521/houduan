
var express = require('express');
var router = express.Router();
let { userModel, LYModel, roleModel } = require("../module/modules")
let {shopmodel,catemodel,inventorymodel,descriptionmodel} =require("../module/shopmodule")
let jwt = require('jsonwebtoken');
const xlsx = require('xlsx');
const Excel = require('exceljs');
const workbook = new Excel.Workbook();
let fs = require('fs')

var multiparty = require('multiparty')
var fse = require('fs-extra')
var path = require('path');
// 定义uploads目录
const UPLOAD_DIR = path.resolve(__dirname, '../uploads')
 
// 提取文件扩展名
const extractExt = filename => filename.slice(filename.lastIndexOf('.'))

// 处理分片上传
router.post('/upload', function (req, res) {
  const form = new multiparty.Form();
  form.parse(req, async (err, fields, files) => {
    console.log(fields);
    
    // fields中存储的是前端传递fileHash和thunkHash
    // files中存储的是上传文件的切片
    if (err) {
      return res.status(500).json({ ok: false, msg: "上传失败" });
    }
 
    // 获取fileHash和thunkHash
    const fileHash = fields['fileHash'][0];  // 文件哈希值
    const chunkHash = fields['thunkHash'][0];  // 切片哈希值
    console.log(fileHash, chunkHash);
    
    // const fileName = fields['fileName'][0];
    // 存放当前文件的所有切片的路径
    const chunkDir = path.resolve(UPLOAD_DIR, `${fileHash}`);  
 
    // if (fse.existsSync(chunkDir)) {
    //   console.log('已存在');
    //   return
    // }
 
    // 创建存放切片的目录（如果不存在）
    if (!fse.existsSync(chunkDir)) {
      await fse.ensureDir(chunkDir);
    }
 
    // 将切片移动到thunkDir
    const oldPath = files['thunk'][0]['path'];  // 上传的临时文件路径
    const chunkPath = path.resolve(chunkDir, chunkHash);  // 目标路径
    console.log(oldPath, chunkPath);
    
    // 移动文件到切片目录
    await fse.move(oldPath, chunkPath, { overwrite: true });
    
    res.status(200).json({ ok: true, msg: '切片上传成功' });
  });
});
 
 
// 处理文件合并
router.post('/merge', async (req, res) => {
  const { fileHash, fileName, size } = req.body;
  // fileHash文件唯一id
  // fileName文件名
  // size切片大小
 
  // 合成后文件路径
  const filePath = path.resolve(UPLOAD_DIR, fileHash + extractExt(fileName));
  // 存放切片的目录
  const chunkDir = path.resolve(UPLOAD_DIR, fileHash);
 
  if (!fse.existsSync(chunkDir)) {
    return res.status(400).json({ ok: false, msg: '切片目录不存在' });
  }
 
  // 获取所有切片文件
  const chunkPaths = await fse.readdir(chunkDir);
  // 对切片进行排序
  chunkPaths.sort((a, b) => parseInt(a.split('-')[1]) - parseInt(b.split('-')[1]));
 
  // 逐个合并切片
  for (let i = 0; i < chunkPaths.length; i++) {
    // 当前切片的路径
    const chunkPath = path.resolve(chunkDir, chunkPaths[i]);
    // 创建写入流，使用追加方式
    const writeStream = fse.createWriteStream(filePath, { flags: "a" });
    await new Promise((resolve) => {
      // 异步方法，读取当前切片内容
      const readStream = fse.createReadStream(chunkPath);
      // 将readStream的值进行追加
      readStream.pipe(writeStream);
      // 监听end事件，将合并完的切片进行删除
      readStream.on("end", async () => {
        await fse.unlink(chunkPath);  // 删除切片
        resolve();
      });
    });
  }
 
  await fse.remove(chunkDir);  // 删除存放切片的目录
  res.status(200).json({ ok: true, msg: '文件合并成功' });
  
  function readFile(filePath) {
    const fileContent = xlsx.readFile(filePath); // 读取 Excel 文件
    const sheetName = fileContent.SheetNames[0]; // 获取第一张 sheet 的名字
    const sheet = fileContent.Sheets[sheetName]; // 获取第一张 sheet 的数据
    const jsonData = xlsx.utils.sheet_to_json(sheet); // 将数据转换为 JSON 格式
    return jsonData;
    }
    
    // 示例：读取 Excel 文件并输出 JSON 数据
    const jsonData = readFile(`./uploads/${fileHash}.xlsx`);
    jsonData.forEach(item=>{
      async function add(item){
        let cate =await catemodel.findOne({name:item.cate})
        let descriptions = await descriptionmodel.findOne({name:item.description})
          await shopmodel.create({name:item.name,price:item.price,img:[item.img],cate:cate._id,number:item.number,description:descriptions._id})
      }
      add(item)
    })
    console.log(jsonData);
});
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
  console.log(req.body);
    await catemodel.create(req.body)
    res.send({code:200,msg:"添加成功"})
})

//获取商品信息
router.get("/shoplist",async(req,res)=>{
  let data = await shopmodel.find().populate("cate").populate("description")

  console.log(data);
  
  res.send({code:200,data})
})
router.post("/shopupdate",async(req,res)=>{
  console.log(req.body);
  let {id} = req.query;
  await shopmodel.updateOne({_id:id},req.body)
  res.send({code:200,msg:"修改成功"})

})
router.get("/catelist",async(req,res)=>{

  let data = await catemodel.find()
  res.send({code:200,data})
})

router.get("/delectcate",async(req,res)=>{
  let {id} = req.query
  await catemodel.deleteOne({_id:id})
  res.send({code:200,msg:"删除成功"})
})
router.post("/addshop",async(req,res)=>{
  console.log(req.body);
  
  await shopmodel.create(req.body)
  res.send({code:200,msg:"添加成功"})
})
//标签管理
router.post("/addbq",async(req,res)=>{
  await descriptionmodel.create(req.body)
  res.send({code:200,msg:"添加成功"})
})
router.get("/bqlist",async(req,res)=>{
  let data = await descriptionmodel.find()
  res.send({code:200,data})
})
//库存记录
router.post("/addkucun",async(req,res)=>{
  await inventorymodel.create(req.body)
  res.send({code:200,msg:"添加成功"})
})
router.get("/kucunlist",async(req,res)=>{
  let data = await inventorymodel.find()
  res.send({code:200,data})
})
router.post("/kucunchange",async(req,res)=>{
  let {id,num} = req.body;
  let data = await inventorymodel.findOne({_id:id})
  data.num = num
  await data.save()
  res.send({code:200,msg:"修改成功"})
})

//苏浚瑞
//发送随机数数据

//生成随机数范围
const generateRandom = (min,max,fixed=0)=>{
  return (Math.random()*(max-min)+min).toFixed(fixed);
}
router.get("/metrics",async(req,res)=>{
    const mockData ={
      newUsers:generateRandom(500,2000),
    }
 res.send({
  code:200,
  data:mockData,
  timestamp:new Date().getTime()
 })
})
module.exports = router



