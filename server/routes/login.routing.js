const express = require('express');
const router = express.Router();
const { loginPost } = require('../controllers/login.controller')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { verificaToken } = require('../middlewares/autenticacion');
const { check } = require('express-validator');
const { usuarioExiste } = require('../middlewares/validar-active-directori');
const { validarCampos } = require('../middlewares/validar-campos');
const { usuarioDatos } = require('../middlewares/validardatologin')


router.post('/signin', loginPost);
router.get('/renew', verificaToken, function (req, res) {
    const { token } = req.headers;
    var payload = jwt.decode(token, process.env.SEED);
    const { usuario, id_rol, nombres } = payload;
    return res.status(200).json({
        login: usuario,
        rol: id_rol,
        token: token
    })
});

module.exports = router;