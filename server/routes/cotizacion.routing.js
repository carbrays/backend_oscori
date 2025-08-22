const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ✅ LISTAR DESPACHOS ACTIVOS
// router.get('/despachos', async (req, res) => {
//   try {
//     const result = await pool.query(`SELECT *, (SELECT numero_contenedor FROM cat_contenedor WHERE id_contenedor = despachos.id_contenedor::INT) numero_contenedor FROM despachos WHERE estado = 'ACTIVO' ORDER BY id_despacho DESC`);
//     res.json(result.rows);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Error al obtener los despachos' });
//   }
// });

router.get('/cotizaciones', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM cotizacion 
      WHERE estado != 'INACTIVO' 
      ORDER BY feccre DESC
    `);
    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener los despachos' });
  }
});

// ✅ CREAR COTIZACION
router.post('/crear_cotizacion', async (req, res) => {
  const data = req.body;

  const query = `
    INSERT INTO cotizacion (
      modo_cliente, tipo_cliente, razon_social, nombre_comercial, 
      correo, telefono, ciudad, tipo_documento, tipo_bl, numero_bl, 
      id_tipo_carga, numero_contenedor, tamano,
      peso_kg, id_mercancia, embalaje, volumen_m3, id_navieria, fecha_llegada,
      id_ciudad_origen, id_ciudad_destino, id_despacho_aduanero, lugar_descarga,
      id_despacho_portuario, devolucion, gate_in, flete, estado, usucre, feccre,
      usumod, fecmod, categoria_cliente
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,
      $8,$9,$10,$11,$12,$13,$14,
      $15,$16,$17,$18,$19,$20,
      $21,$22,$23,$24,$25,$26,$27,
      $28,$29,NOW(),$30,$31,$32
    )
    RETURNING *`;

  const values = [
    data.modo_cliente, data.tipo_cliente, data.razon_social, data.nombre_comercial,
    data.correo, data.telefono, data.ciudad, data.tipo_documento, data.tipo_bl, data.numero_bl,
    data.id_tipo_carga, data.numero_contenedor,
    data.tamano, data.peso_kg, data.id_mercancia, data.embalaje, data.volumen_m3,
    data.id_navieria, data.fecha_llegada, data.id_ciudad_origen, data.id_ciudad_destino,
    data.id_despacho_aduanero, data.lugar_descarga, data.id_despacho_portuario,
    data.devolucion || false, data.gate_in || false, data.flete,
    data.estado || 'ACTIVO', data.usucre, data.usumod, data.fecmod, data.categoria_cliente
  ];

  try {
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear cotización' });
  }
});

// ✅ EDITAR COTIZACION
router.put('/editar_cotizacion/:id', async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  const query = `
    UPDATE cotizacion SET
      modo_cliente = $1,
      tipo_cliente = $2,
      razon_social = $3,
      nombre_comercial = $4,
      correo = $5,
      telefono = $6,
      ciudad = $7,
      tipo_documento = $8,
      tipo_bl = $9,
      numero_bl = $10,
      id_tipo_carga = $11,
      numero_contenedor = $12,
      tamano = $13,
      peso_kg = $14,
      id_mercancia = $15,
      embalaje = $16,
      volumen_m3 = $17,
      id_navieria = $18,
      fecha_llegada = $19,
      id_ciudad_origen = $20,
      id_ciudad_destino = $21,
      id_despacho_aduanero = $22,
      lugar_descarga = $23,
      id_despacho_portuario = $24,
      devolucion = $25,
      gate_in = $26,
      flete = $27,
      estado = $28,
      usumod = $29,
      fecmod = NOW(),
      categoria_cliente = $30
    WHERE id_cotizacion = $31
    RETURNING *`;

  const values = [
    data.modo_cliente, data.tipo_cliente, data.razon_social, data.nombre_comercial,
    data.correo, data.telefono, data.ciudad, data.tipo_documento,
    data.tipo_bl, data.numero_bl, data.id_tipo_carga,
    data.numero_contenedor, data.tamano, data.peso_kg, data.id_mercancia,
    data.embalaje, data.volumen_m3, data.id_navieria, data.fecha_llegada,
    data.id_ciudad_origen, data.id_ciudad_destino, data.id_despacho_aduanero,
    data.lugar_descarga, data.id_despacho_portuario,
    data.devolucion ?? false, data.gate_in ?? false, data.flete,
    data.estado || 'ACTIVO', data.usumod, data.categoria_cliente,
    id
  ];

  try {
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar cotización' });
  }
});

// ✅ DESACTIVAR DESPACHO
router.put('/eliminar_cotizacion/:id', async (req, res) => {
  const { id } = req.params;
  const { estado, usumod } = req.body;

  try {
    await pool.query(
      `UPDATE cotizacion 
       SET estado = $1, usumod = $2, fecmod = NOW() 
       WHERE id_cotizacion = $3`,
      [estado || 'INACTIVO', usumod || 'sistema', id]
    );

    res.status(200).json({ message: 'Cotización desactivada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al desactivar la cotización' });
  }
});

router.get('/clientes', async (req, res) => {
  try {
    const result = await pool.query(`SELECT id_cliente, nombre_comercial, razon_social, correo, telefono, ciudad  FROM clientes ORDER BY id_cliente`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener los clientes' });
  }
});

router.get('/mercancias', async (req, res) => {
  try {
    const result = await pool.query(`SELECT id_mercancia, mercancia FROM cat_mercancia ORDER BY mercancia`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener las mercancías' });
  }
});

router.get('/navieras', async (req, res) => {
  try {
    const result = await pool.query(`SELECT id_naviera, nombre_comercial, gate_in FROM public.cat_naviera ORDER BY id_naviera`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener las navieras' });
  }
});

router.get('/ciudades', async (req, res) => {
  try {
    const result = await pool.query(`SELECT id_ciudad, ciudad FROM public.cat_ciudad ORDER BY pais, ciudad`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener las ciudades' });
  }
});

router.get('/vehiculos', async (req, res) => {
  try {
    const result = await pool.query(`select v.id_vehiculo, v.placa || '-' || coalesce(u.nombre, '') || ' ' || coalesce(u.paterno,'') || ' ' || coalesce(u.materno, '') nombre_vehiculo from vehiculos v left join usuarios u on v.conductor = u.id_usuario ORDER BY id_vehiculo`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener los vehículos' });
  }
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/pdfs/'); 
  },
  filename: function (req, file, cb) {    
    const nombreFinal = Date.now() + '-' + file.originalname;
    cb(null, nombreFinal);
  }
});
const upload = multer({ storage: storage });

router.get('/verPdf/:id', (req, res)=>{ 
    if(fs.existsSync(path.join(__dirname, '../../uploads/pdfs', `${req.params.id}.pdf`))) {
      res.sendFile( path.join(__dirname, '../../uploads/pdfs', `${req.params.id}.pdf`));
    } else {
      res.json('No existe el documento');
    }
});

router.post('/subir_pdf', upload.single('archivo'), (req, res) => {
  const file = req.file;
  const idDespacho = req.body.id_despacho;
  const documento = req.body.documento;

  const ext = path.extname(file.originalname);
  const nuevoNombre = `${idDespacho}-${documento}${ext}`;
  const nuevoPath = path.join(file.destination, nuevoNombre);

  // ✅ Sobrescribe directamente, usando rename
  fs.rename(file.path, nuevoPath, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Error al renombrar archivo' });
    }

    res.status(200).json({
      mensaje: 'Archivo sobrescrito correctamente',
      nombreArchivo: nuevoNombre,
      idDespacho
    });
  });
});

module.exports = router;