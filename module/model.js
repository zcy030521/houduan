const mongoose = require('./db');

const user1Schema = new mongoose.Schema({
    loginId: String,
    LoginPwd:Number
})

const user1 = mongoose.model('user1', user1Schema, 'user1');

module.exports = {user1};