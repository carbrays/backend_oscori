const ActiveDirectory = require("activedirectory2");
const configAD = require("../config/active-directori.config");
const { generarJWT } = require("../helpers/generar-jwt");
const jwt = require('jsonwebtoken');
var ad = new ActiveDirectory(configAD);
const bcrypt = require('bcryptjs');
const {pool} = require('../config/db');

const loginPost = async (req, res) => {
  const query = `SELECT s.* FROM usuarios s WHERE login='${req.body.login}'`;
  pool.query(query, async (err, result) => {
    if (err) throw err;
    if (result.rowCount == 0) return res.status(400).json({ msg: 'Usuario no valido' })
    let username = await validaUsuario(req.body.login);
    if (result.rows[0].password==null) {
      await ad.authenticate(username, req.body.password, async function (err, auth) {
        if (err) {
          res.status(400).json({
            ok: false,
            msg: `Usuario incorrecto`,
          });
        }
        let token = jwt.sign({
          usuario: req.body.login,
          id_rol: result.rows[0].id_rol,
          menu:  result.rows[0].menu
        }, process.env.SEED, { expiresIn: process.env.CADUCIDAD_TOKEN });
        return res.status(200).json({
            login: req.body.login,
            menu:  result.rows[0].menu,
            rol: result.rows[0].id_rol,
            token: token
        })
      });
    } else {
      if (!bcrypt.compareSync(req.body.password, result.rows[0].password)) {
        res.status(400).json({
          ok: false,
          msg: `Usuario incorrecto`,
        });
      } else {
        let token = jwt.sign({
          usuario: req.body.login,
          id_rol: result.rows[0].id_rol
        }, process.env.SEED, { expiresIn: process.env.CADUCIDAD_TOKEN });
        return res.status(200).json({
            login: req.body.login,
            rol: result.rows[0].id_rol,
            token: token
        })
      }

    }
  });
};

function validaUsuario(username) {
  if (
    username.indexOf("@gob.bo") > -1 ||
    username.indexOf("@gov.bo") > -1
  ) {
    return username;
  } else {
    return username + "@gov.bo";
  }
}



module.exports = {
  loginPost,
};
