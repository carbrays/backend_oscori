const { Router } = require('express');
const {
  reporte,
  total,
  totalDeptoAprobado,
  totalDeptoReprobado,
  
  total2,
  totalDeptoAprobado2,
  totalDeptoReprobado2,

  listarPostulante,
  listar,
  listarDeptos,
  listarRoles,
  listarEscuelas,
  listarUsuarios,
  crearPostulante,
  updatePostulante,
  crearUsuario,
  obtenerUsuarios,
  obtenerCentros,
  editarUsuario,
  datoEmpresa,
  datoGastos,
  listaDirectorio,
  updateEmpresa,
  updateGastos,
  ModEstado,
  obtenerPostulantes,
  listarEscuela,
  updateExamenVmedico,
  updateExamenVpsico,
  updateExamenVodonto,
  obtenerEscuelas,
  crearEscuela,
  updateEscuela,
  listarCentro,
  crearCentro,
  obtenerCentrosId,
  updateCentro,
  ModEstadoCentro,
  ModEstadoEscuela,
  listarverificacion,
  ModEstadoVerificar,
  verificarcarnet,
  verificararchivador,
  verificarcarnetpostulante,
  verificarbaucher,
  addaccess,
  obtenerCentrosDep,
  obtenerEscuelasDep,
  obtenerMedResp,
  reportemed,
  inscritos

} = require("../controllers/dashboard.controller");
const { validarJWT } = require('../middlewares/validador-jwt');
const router = Router();
router.get("/total", total);
router.get("/totalDeptoAprobado", totalDeptoAprobado);
router.get("/totalDeptoReprobado", totalDeptoReprobado);

router.get("/inscritos", inscritos);


router.get("/total2", total2);
router.get("/totalDeptoAprobado2", totalDeptoAprobado2);
router.get("/totalDeptoReprobado2", totalDeptoReprobado2);

router.get('/reporte/:depto/:escuela/:sexo/:centro', reporte);
router.get('/reportemed/:depto/:tipo/:sexo/:centro', reportemed);

router.get('/listarPostulante/:id', listarPostulante);
router.get('/listar', listar);
router.post('/postulante', crearPostulante);
router.post('/examenpsi', updateExamenVpsico);
router.post('/examen', updateExamenVmedico);
router.post('/examenodo', updateExamenVodonto);
router.post('/updatePostulante', updatePostulante);
router.get('/obtenerPostulantes/:id', obtenerPostulantes);

router.get('/listarCentro', listarCentro);
router.get('/obtenerCentros/:tipo', obtenerCentros);
router.post('/centro', crearCentro);
router.get('/listarCentroId/:id', obtenerCentrosId);
router.post('/updateCentro', updateCentro);
router.post('/ModEstadoCentro/:id', ModEstadoCentro);
router.get('/obtenerCentrosDep/:id/:tipo', obtenerCentrosDep);
router.get('/obtenerMedResp/:id', obtenerMedResp);



router.post('/escuela', crearEscuela);
router.get('/listarEscuela', listarEscuela);
router.get('/obtenerEscuelas/:id', obtenerEscuelas);
router.get('/obtenerEscuelasDep/:id', obtenerEscuelasDep);
router.get('/listarEscuelas', listarEscuelas);
router.post('/updescuela', updateEscuela);
router.post('/ModEstadoEscuela/:id', ModEstadoEscuela);

router.get('/listarDeptos', listarDeptos);
router.get('/listarRoles', listarRoles);

router.get('/listarUsuarios', listarUsuarios);
router.post('/usuario', crearUsuario);
router.post('/editarUsuario/:id', editarUsuario);
router.post('/ModEstado/:id', ModEstado);
router.get('/obtenerUsuarios/:id', obtenerUsuarios);

router.get('/datoEmpresa/:codigo', datoEmpresa);
router.get('/datoGastos/:id/:gestion',datoGastos);
router.get('/listaDirectorio/:gestion',listaDirectorio);
router.post('/updateEmpresa',updateEmpresa);
router.post('/updateGastos',updateGastos);

router.get('/listarverificacion', listarverificacion);
router.post('/editarestado/:id', ModEstadoVerificar);

router.get('/check/:carnet', verificarcarnet); 
router.get('/checkpostulante/:carnet', verificarcarnetpostulante); 
router.get('/checkarchivador/:archi', verificararchivador); 
router.get('/checkboucher/:boucher', verificarbaucher); 


router.post('/access', addaccess);

module.exports = router;
