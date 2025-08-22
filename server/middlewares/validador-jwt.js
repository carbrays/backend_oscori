const { response, request } = require('express');
const jwt = require('jsonwebtoken');
const validarJWT = async(req = request, res = response, next) => {
    const token = req.header('token');
    if (!token) {
        return res.status(401).json({
            msg: 'El token no es valido'
        })
    }
    try {
        const { uid, id_rol, id_dep } = await jwt.verify(token,process.env.SEED);
        req.body.usucre=uid;
        req.body.id_rol_token=id_rol;
        if(req.body.id_rol_token === 0){
            req.body.id_dep_token = null;
        } else {
            req.body.id_dep_token =id_dep;
        }
        next();     
    } catch (error) {
        return res.status(401).json({
            ok:false,
            msg: 'Token no válido'
        })
    }
}

module.exports = {
    validarJWT
}