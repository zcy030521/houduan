const mongoose = require("./db")
// 创建权限集合
let LY = new mongoose.Schema({
    key:String,
    label:String,
    p_id:{
        type: mongoose.Types.ObjectId,
        ref: 'LY'
    },
    level:Number
});
let LYModel = mongoose.model('LY', LY);
// const permissionModel = mongoose.model('permission', permissionSchema)
// 创建角色集合
const roleSchema =new mongoose.Schema({
    name: String, // 角色名称
    describe: String, // 角色描述
    time: {
        type: Date,
        default: new Date()
    },
    permission: {
        type: [mongoose.Types.ObjectId],
        ref: 'LY'
    }// 角色权限，存放的是权限集合的id数组
})
const roleModel = mongoose.model('role', roleSchema)
const userSchema = new mongoose.Schema({
    name: String,
    password: String,
    user: String,
    phone: String,
    time: {
        type: Date,
        default: new Date()
    },
    role: {
        type: mongoose.Types.ObjectId,
        ref: 'role'
    }
})

const userModel = mongoose.model('user', userSchema)
module.exports = {
    // permissionModel,
    roleModel,
    userModel,
    LYModel
}