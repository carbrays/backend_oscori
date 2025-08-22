
const { Client } = require('pg');
const client = new Client({});
client.connect()

const validaUsuario = async(login= '')=>{
    const query = {
        text: 'SELECT * FROM usuarios WHERE login = $1',
        values: [login],
    }
    const existeUsuario = await client.query(query);
    if(existeUsuario.rowCount > 0){
        throw new Error('El usuario ya se encuentra registrado'); 
       }
}
module.exports= {
    validaUsuario
}