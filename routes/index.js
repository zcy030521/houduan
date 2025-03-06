var express = require('express');
var router = express.Router();
let {LYModel} = require("../module/db")
/* GET home page. */
// router.get('/', function(req, res, next) {
//   res.render('index', { title: 'Express' });
// });

router.get("/ly", async(req,res)=>{
  let result = await LYModel.find().populate("p_id")
  res.send({result})
})

router.post("/add", async(req,res)=>{
  let result = await LYModel.create(req.body)
  res.send({result})
})

module.exports = router;
