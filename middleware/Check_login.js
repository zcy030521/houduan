let jwt = require('jsonwebtoken');
let { userModel } = require("../module/modules");
module.exports = () => {
    return async (req, res, next) => {
        console.log("验证用户身份");
        // console.log(req.get("Authorization"));

        try {
            let token = req.get("Authorization")
            console.log(token);

            if (!token) {
                return res.send({
                    code: 400,
                    msg: "请登录"
                });
            }

            // 从 "Bearer" 字符串后获取 token
            token = token.split("Bearer ")[1];
            const { userid } = jwt.verify(token, "2404B");
            // 查找用户数据
            let data = await userModel.findOne({ _id: userid });

            // 这里直接传递到下一个中间件
            req.user = data; // 可以把用户数据存到 req 中
            next(); // 调用 next()，继续处理后续的中间件或路由
        } catch (err) {
            return res.send({
                code: 400,
                msg: err.message || err
            });
        }
    }
}