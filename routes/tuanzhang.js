var express = require('express');
var router = express.Router();
let {shopmodel} =require("../module/shopmodule.js")
let {infoModel,cateModel} =require("../module/tuanzhangmodel.js")

router.get('/shoplist',async(req,res)=>{
    let {page,limit} =req.query
    let data=await shopmodel.find().skip((page-1)*limit).limit(Number(limit)).exec()
    res.send({
        code:200,
        data
    })
})

router.get("catelist",async(req,res)=>{
    let data=await cateModel.find()
    res.send({
        code:200,
        data
    })
})









export default router;