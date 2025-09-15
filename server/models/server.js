const express = require('express')
const morgan = require('morgan')
const cors = require('cors');
const indexRouter = require('../routes/index');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const path = require('path');

dotenv.config();
class Server {
    constructor(){
        this.app = express();
        this.port = process.env.PORT;
        this.middlewares();
        this.routes();
    }
    middlewares(){
       this.app.use(cors());       
       this.app.use(express.static('public'));
       this.app.use(express.json({ limit: '50mb' })); // solo para JSON normales
       this.app.use(express.urlencoded({ extended: true }));
       
    }
    routes(){
        this.app.use('/', indexRouter);
        this.app.use('/login', require('../routes/login.routing'));
        this.app.use('/dashboard', require('../routes/dashboard.routing'));
        this.app.use('/usuario', require('../routes/usuario.routing'));
        this.app.use('/vehiculo', require('../routes/vehiculo.routing'));
        this.app.use('/naviera', require('../routes/naviera.routing'));
        this.app.use('/mercancia', require('../routes/mercancia.routing'));
        this.app.use('/cliente', require('../routes/cliente.routing'));
        this.app.use('/contenedor', require('../routes/contenedores.routing'));
        this.app.use('/despachos', require('../routes/despachos.routing'));
        this.app.use('/cotizacion', require('../routes/cotizacion.routing'));
        this.app.use('/forwader', require('../routes/forwader.routing'));
        this.app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

    }
    listen(){
        this.app.listen(this.port, () => {
            console.log('Iniciando servicios puerto', this.port);
        });
    }
}
module.exports = Server;