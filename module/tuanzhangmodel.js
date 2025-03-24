const mongoose = require("./db")

let info = mongoose.Schema({
    name:String,
    address:String,
    phone:String,
    email:String,
    yingyezhizhao:String,
    shopimg:String,
    door:String,
    cate:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'cate'
    },
    startTime:String,
    endTime:String,
    status:Number,
    regtime:String
})
let cate = mongoose.Schema({
    name:String,
})

let cateModel = mongoose.model("cate", cate, "cate")

let infoModel = mongoose.model("info", info, "info")





module.exports ={
    infoModel,
    cateModel,
}
