const ActiveDirectory = require('activedirectory2');
var config = require('../config/active-directori.config');

var ad = new ActiveDirectory(config);
const usuarioExiste = async(username= '')=>{
  
    let usernameAux = validaUsuario(username);
  const usuarioexisteActDir = await ad.userExists(usernameAux, function(err, exists) {
    if (err) {
      return;
    }
   return exists;
  });
  if(usuarioexisteActDir){
    throw new Error(`El usuario ${usernameAux} no se encuentra registrado`);
  } 
}
function validaUsuario(username){
  if(username.indexOf("@pol.gob.bo") > -1 || username.indexOf("@pol.gov.bo") > -1){    
    return username;
  }else{     
    return username+"@pol.gov.bo";
  }
}
module.exports= {
    usuarioExiste
}
