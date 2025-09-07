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

router.get('/despachos', async (req, res) => {
  try {
    // 1. Obtener despachos desde la base de datos
    const result = await pool.query(`
      SELECT *, 
        (SELECT numero_contenedor FROM cat_contenedor WHERE id_contenedor = despachos.id_contenedor::INT) AS numero_contenedor 
      FROM despachos 
      WHERE estado != 'INACTIVO' 
      ORDER BY fecha_llegada DESC
    `);

    const despachos = result.rows;

    // 2. Leer archivos en carpeta
    const carpetaUploads = path.join(__dirname, '../../uploads/pdfs'); // ajusta si es subcarpeta
    let archivos = [];

    try {
      const archivosEnCarpeta = fs.readdirSync(carpetaUploads);
      const archivosPDF = archivosEnCarpeta.filter(file => file.endsWith('.pdf'));

      archivos = archivosPDF.map(nombre => {
        const partes = nombre.split('-');
        const idDespacho = parseInt(partes[0], 10);
        const documentoPdf = partes[1] || null; 
        let documento;
        if (documentoPdf === null) {
          documento = null; 
        } else {
          documento = partes[1].split('.')[0];
        }
        
        return {
          id_despacho: isNaN(idDespacho) ? null : idDespacho,
          documento: documento || null,
        };
      }).filter(a => a.id_despacho !== null && a.documento !== null);
    } catch (err) {
      console.warn('No se pudieron leer archivos:', err.message);
    }

    // 3. Para cada despacho, construir archivosSubidos
    const despachosConEstado = despachos.map(d => {
      const archivosDeEste = archivos.filter(a => a.id_despacho === d.id_despacho);

      const archivosSubidos = {};
      archivosDeEste.forEach(a => {
        archivosSubidos[a.id_documento] = true;
      });

      return {
        ...d,
        archivosSubidos: archivosDeEste.map(a => a.documento),
      };
    });

    res.json(despachosConEstado);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener los despachos' });
  }
});

// ✅ CREAR DESPACHO
router.post('/crear_despacho', async (req, res) => {
  const data = req.body;

  const queryContenedor = `
    INSERT INTO cat_contenedor (
      numero_contenedor, tamano, id_naviera, id_ciudad_origen, estado, usucre, feccre
    ) VALUES (
      $1,$2,$3,$4,$5,$6,now()
    ) RETURNING id_contenedor`;

    let estado;
    if(data.id_asignacion_vehiculo_carga === null){
      estado = 'EN OFICINA';
    } else {
      estado = 'PLANIFICADO';
    }
  const contenedorValues = [data.numero_contenedor, data.descripcion_carga, data.id_naviera, data.id_ciudad_origen, estado, data.usucre];

  const query = `
    INSERT INTO despachos (
      id_cliente, id_mercancia, id_contenedor, id_tipo_carga, descripcion_carga,
      bl_madre, peso_kg, id_naviera, id_despacho_portuario, fecha_llegada,
      fecha_limite, id_ciudad_origen, id_ciudad_destino, id_despacho_aduanero,
      id_asignacion_vehiculo_carga, fecha_carga, id_asignacion_vehiculo_descarga,
      fecha_descarga, descripcion, estado, usucre, feccre, volumen_m3,
      bl_hijo, fecha_bl_madre, fecha_bl_hijo, dam, fecha_dam, embalaje,
      id_deposito_aduanero, id_despacho_aduanero_general, permisos, precinto, precinto_gog, precinto_dress, bl_nieto, fecha_bl_nieto, id_preasignacion_vehiculo_carga,
      autorizado
    ) VALUES (
      $1,$2,$3,$4,$5,
      $6,$7,$8,$9,$10,
      $11,$12,$13,$14,
      $15,$16,$17,
      $18,$19,$20,$21,NOW(),
      $22,$23,$24,$25,$26,$27,$28,
      $29,$30,$31,$32,$33,$34,$35,$36,$37,
      $38
    ) RETURNING *`;

  try {
    await pool.query('BEGIN');

    const resultContenedor = await pool.query(queryContenedor, contenedorValues);
    const id_contenedor = resultContenedor.rows[0].id_contenedor;

    const values = [
    data.id_cliente, data.id_mercancia, id_contenedor, data.id_tipo_carga, data.descripcion_carga,
    data.bl_madre, data.peso_kg, data.id_naviera, data.id_despacho_portuario, data.fecha_llegada,
    data.fecha_limite, data.id_ciudad_origen, data.id_ciudad_destino, data.id_despacho_aduanero,
    data.id_asignacion_vehiculo_carga, data.fecha_carga, data.id_asignacion_vehiculo_descarga,
    data.fecha_descarga, data.descripcion, estado, data.usucre,
    data.volumen_m3, data.bl_hijo, data.fecha_bl_madre, data.fecha_bl_hijo, data.dam, data.fecha_dam, data.embalaje,
    data.id_deposito_aduanero, data.id_despacho_aduanero_general, data.permisos, data.precinto, data.precinto_gog, data.precinto_dress, data.bl_nieto, data.fecha_bl_nieto,
    data.id_preasignacion_vehiculo_carga, data.autorizado
  ];

  const result = await pool.query(query, values);

    await pool.query('COMMIT');
    res.json(result.rows[0]);
    
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al crear el despacho' });
  }
});

// ✅ EDITAR DESPACHO
router.put('/editar_despacho/:id', async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  console.log(data);

  const queryContenedor = `UPDATE cat_contenedor c SET
    numero_contenedor=$1, tamano=$2, id_naviera=$3, id_ciudad_origen=$4, usumod=$5, fecmod=NOW(), estado=CASE
               WHEN NOT EXISTS (
                  SELECT 1 
                  FROM cat_contenedor x
                  WHERE x.id_contenedor = c.id_contenedor 
                    AND x.estado = 'DEVUELTO'
               )
               THEN $7
               ELSE c.estado
             END 
    WHERE id_contenedor=$6 RETURNING estado`;

    let estado;
    if(data.id_asignacion_vehiculo_carga === null){
      estado = 'EN OFICINA';
    } else {
      estado = 'PLANIFICADO';
    }

  const contenedorValues = [data.numero_contenedor, data.descripcion_carga, data.id_naviera, data.id_ciudad_origen, data.usucre, data.id_contenedor, estado];

  const query = `
    UPDATE despachos SET
      id_cliente=$1, id_mercancia=$2, id_contenedor=$3, id_tipo_carga=$4, descripcion_carga=$5,
      bl_madre=$6, peso_kg=$7, id_naviera=$8, id_despacho_portuario=$9, fecha_llegada=$10,
      fecha_limite=$11, id_ciudad_origen=$12, id_ciudad_destino=$13, id_despacho_aduanero=$14,
      id_asignacion_vehiculo_carga=$15, fecha_carga=$16, id_asignacion_vehiculo_descarga=$17,
      fecha_descarga=$18, descripcion=$19, usumod=$20, fecmod=NOW(),
      volumen_m3=$21, bl_hijo=$22, fecha_bl_madre=$23, fecha_bl_hijo=$24, dam=$25, fecha_dam=$26, embalaje=$27,
      id_deposito_aduanero=$28, id_despacho_aduanero_general=$29, permisos=$30, precinto=$31, precinto_gog=$32, precinto_dress=$33, estado=$35, bl_nieto=$36, fecha_bl_nieto=$37,
      id_preasignacion_vehiculo_carga=$38, autorizado=$39
    WHERE id_despacho=$34 RETURNING *`;


  try {
    await pool.query('BEGIN');

    const resultContenedor = await pool.query(queryContenedor, contenedorValues);
    const estado_contenedor = resultContenedor.rows[0]?.estado ?? null;

    if(estado_contenedor === 'DEVUELTO') {
      estado = 'DEVUELTO';
    } 

    const values = [
    data.id_cliente, data.id_mercancia, data.id_contenedor, data.id_tipo_carga, data.descripcion_carga,
    data.bl_madre, data.peso_kg, data.id_naviera, data.id_despacho_portuario, data.fecha_llegada,
    data.fecha_limite, data.id_ciudad_origen, data.id_ciudad_destino, data.id_despacho_aduanero,
    data.id_asignacion_vehiculo_carga, data.fecha_carga, data.id_asignacion_vehiculo_descarga,
    data.fecha_descarga, data.descripcion, data.usumod || 'admin', 
    data.volumen_m3, data.bl_hijo, data.fecha_bl_madre, data.fecha_bl_hijo, data.dam, data.fecha_dam, data.embalaje,
    data.id_deposito_aduanero, data.id_despacho_aduanero_general, data.permisos, data.precinto, data.precinto_gog, data.precinto_dress, id, estado, data.bl_nieto, data.fecha_bl_nieto,
    data.id_preasignacion_vehiculo_carga, data.autorizado
  ];

    const result = await pool.query(query, values);
    await pool.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al editar el despacho' });
  }
});

router.put('/editar_estado_despacho/:id', async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  const query = `
    UPDATE despachos SET
      pago_dam=$1, usumod=$2, fecmod=NOW()
    WHERE id_despacho=$3 RETURNING *`;

  const values = [
    data.pago_dam || false, data.usumod || 'admin', id
  ];

  try {
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al editar el estado del despacho' });
  }
});

// ✅ DESACTIVAR DESPACHO
router.put('/eliminar_despacho/:id/:id_contenedor', async (req, res) => {
  const { id, id_contenedor } = req.params;
  const { estado, usumod } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE despachos
       SET estado = $1, usumod = $2, fecmod = NOW()
       WHERE id_despacho = $3`,
      [estado || 'INACTIVO', usumod || 'sistema', id]
    );

    await client.query(
      `UPDATE cat_contenedor
       SET estado = $1, usumod = $2, fecmod = NOW()
       WHERE id_contenedor = $3`,
      [estado || 'INACTIVO', usumod || 'sistema', id_contenedor]
    );

    await client.query('COMMIT');
    res.status(200).json({ message: 'Despacho desactivado correctamente' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al desactivar el despacho' });

  } finally {
    client.release();
  }
});


router.get('/clientes', async (req, res) => {
  try {
    const result = await pool.query(`SELECT id_cliente, nombre_comercial FROM clientes ORDER BY id_cliente`);
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
    const result = await pool.query(`SELECT id_naviera, nombre_comercial, dias FROM public.cat_naviera ORDER BY id_naviera`);
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
    const nombreFinal = file.originalname;
    cb(null, nombreFinal);
  }
});
const upload = multer({ storage: storage });

router.get('/verPdf/:id', (req, res)=>{ 
    if(fs.existsSync(path.join(__dirname, '../../uploads/pdfs', `${req.params.id}`))) {
      res.sendFile( path.join(__dirname, '../../uploads/pdfs', `${req.params.id}`));
    } else {
      res.json('No existe el documento');
    }
});

router.post('/subir_pdf', upload.single('archivo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se envió archivo' });

  res.status(200).json({
    mensaje: 'Archivo subido correctamente',
    nombreArchivo: req.file.filename,
    idDespacho: req.body.id_despacho
  });

  // const file = req.file;
  // const idDespacho = req.body.id_despacho;
  // const documento = req.body.documento;

  // const ext = path.extname(file.originalname);
  // const nuevoNombre = `${idDespacho}-${documento}${ext}`;
  // const nuevoPath = path.join(file.destination, nuevoNombre);

  // ✅ Sobrescribe directamente, usando rename
  // fs.rename(file.path, nuevoPath, (err) => {
  //   if (err) {
  //     return res.status(500).json({ error: 'Error al renombrar archivo' });
  //   }

  //   res.status(200).json({
  //     mensaje: 'Archivo sobrescrito correctamente',
  //     nombreArchivo: nuevoNombre,
  //     idDespacho
  //   });
  // });
});

router.get('/pdfs/:id_despacho/:pdf', (req, res) => {
  const { id_despacho, pdf } = req.params;
  const carpetaUploads = path.join(__dirname, '../../uploads/pdfs');

  try {
    const archivos = fs.readdirSync(carpetaUploads);
    
    // Filtrar solo los que empiezan con id_despacho y contienen el nombre pdf dinámico
    const filtrados = archivos.filter(file =>
      file.startsWith(`${id_despacho}-${pdf}`)
    );

    // Mapear solo los nombres
    const resultado = filtrados.map(nombre => ({ nombre }));

    res.json(resultado);

  } catch (err) {
    console.error('Error al leer PDFs:', err.message);
    res.status(500).json({ error: 'No se pudieron leer los PDFs' });
  }
});


// router.post('/subir_pdf', upload.single('archivo'), (req, res) => {
//   const file = req.file;
//   const idDespacho = req.body.id_despacho;
//   const documento = req.body.documento;

//   const ext = path.extname(file.originalname);
//   let nuevoNombre = `${idDespacho}-${documento}${ext}`;
//   let nuevoPath = path.join(file.destination, nuevoNombre);

//    let counter = 1;
//     while (fs.existsSync(nuevoPath)) {
//       nuevoNombre = `${idDespacho}-${counter}${ext}`;
//       nuevoPath = path.join(file.destination, nuevoNombre);
//       counter++;
//     }

//   fs.rename(file.path, nuevoPath, (err) => {
//     if (err) {
//       return res.status(500).json({ error: 'Error al renombrar archivo' });
//     }
//     res.send('Archivo recibido');
//     // return res.status(200).json({
//     //   mensaje: 'Archivo recibido y renombrado correctamente',
//     //   nombreArchivo: nuevoNombre,
//     //   idDespacho
//     // });
//   });

// });

router.delete('/eliminar_pdf/:nombre', (req, res) => {
  const nombre = req.params.nombre;
  const ruta = path.join(__dirname, '../../uploads/pdfs', nombre);

  fs.unlink(ruta, (err) => {
    if (err) {
      return res.status(404).json({ ok: false, msg: 'Archivo no encontrado' });
    }
    res.json({ ok: true, msg: 'Archivo eliminado' });
  });
});

router.get('/despachos_movil/:id', function(req, res) {
    const { id } = req.params;
    pool.query(`select id_despacho, coalesce(c.id_contenedor,0) id_contenedor,
coalesce(numero_contenedor, 'SIN CONTENEDOR') contenedor, 
tamano, 
(select nombre_comercial from cat_naviera where id_naviera=d.id_naviera) naviera, 
(select ciudad from cat_ciudad where id_ciudad =d.id_ciudad_origen) origen, 
(select ciudad from cat_ciudad where id_ciudad =d.id_ciudad_destino) destino, 
fecha_llegada,
placa, id_tipo_carga tipo_carga,
(select nombre_comercial from clientes where id_cliente =d.id_cliente) cliente, 
peso_kg peso, 
id_despacho_portuario despacho_portuario,
id_despacho_aduanero despacho_aduanero,
id_despacho_aduanero_general despacho_aduanero_general,
CASE WHEN id_deposito_aduanero = 'TEMPORAL' THEN 'TEMPORAL (ADUANA INTERIOR)' WHEN id_deposito_aduanero = 'TRANSTORIO' THEN 'TRANSITORIO (DEPOSITO CLIENTE)' 
ELSE id_deposito_aduanero END deposito_aduanero
from despachos d 
join vehiculos v 
on v.id_vehiculo =  d.id_asignacion_vehiculo_carga
left join cat_contenedor c
on c.id_contenedor = d.id_contenedor::int
where d.estado= 'PLANIFICADO' and conductor = $1`, [id], (err, result) => {
        if (err) throw err
        return res.status(200).send(result.rows)
    })
});

module.exports = router;
