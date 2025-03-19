const mongoose = require("./db")
//分类表和商品列表表
let cate = new mongoose.Schema({
    name:String,
})
let catemodel = mongoose.model("cate", cate, "cate")
//标签管理表

let descriptionSchema = new mongoose.Schema({
    name:String,
})
let descriptionmodel = mongoose.model("description", descriptionSchema, "description")

let shoplist = new mongoose.Schema({
    name:String,
    price:Number,
    img:{
        type:Array,
        default:[]
    },
    description:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"description"
    },
    cate:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"cate"
    },
    number:Number,
    status:{
        type:String,
        default:"上架"
    },
})
let shopmodel = mongoose.model("shoplist", shoplist, "shoplist")


//库存记录
let inventory = new mongoose.Schema({
    name:String,
    date:String,
    outnum:Number,
    num:Number,
    shopid:String,
    type:String,
})
let inventorymodel = mongoose.model("inventory", inventory, "inventory")


module.exports = {
    catemodel,
    shopmodel,
    inventorymodel,
    descriptionmodel
}
