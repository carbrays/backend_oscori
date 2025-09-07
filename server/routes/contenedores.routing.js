const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ✅ LISTAR CONTENEDORES
router.get('/contenedores', async (req, res) => {
  try {
    const result = await pool.query(`SELECT c.*, d.id_cliente, d.id_mercancia, d.bl_madre, d.id_despacho, d.fecha_llegada, d.fecha_limite, d.id_asignacion_vehiculo_carga,
      d.autorizado, 
    (SELECT sum(monto::numeric) FROM cat_contenedor_gasto WHERE cancelado = false AND estado != 'INACTIVO' AND tipo='ESTIBAJE' AND id_contenedor = c.id_contenedor) as deuda_estibaje,
    (SELECT sum(monto::numeric) FROM cat_contenedor_gasto WHERE cancelado = false AND estado != 'INACTIVO' AND tipo='GRUAJE' AND id_contenedor = c.id_contenedor) as deuda_gruaje,
    (SELECT sum(monto::numeric) FROM cat_contenedor_gasto WHERE cancelado = false AND estado != 'INACTIVO' AND tipo='MONTACARGA' AND id_contenedor = c.id_contenedor) as deuda_montacarga,
    (SELECT sum(monto::numeric) FROM cat_contenedor_gasto WHERE cancelado = false AND estado != 'INACTIVO' AND tipo='URBANO' AND id_contenedor = c.id_contenedor) as deuda_urbano,
    (SELECT sum(monto::numeric) FROM cat_contenedor_gasto WHERE cancelado = false AND estado != 'INACTIVO' AND tipo='TRASBORDO' AND id_contenedor = c.id_contenedor) as deuda_trasbordo,
    (SELECT sum(monto::numeric) FROM cat_contenedor_gasto WHERE cancelado = false AND estado != 'INACTIVO' AND tipo='LAVADO' AND id_contenedor = c.id_contenedor) as deuda_lavado,
	  (SELECT fecha_devolucion FROM cat_contenedor_devolucion where id_contenedor = c.id_contenedor and estado = 'ACTIVO' order by fecha_devolucion DESC LIMIT 1) fec_devolucion,
    d.id_ciudad_destino
    FROM cat_contenedor c 
    JOIN despachos d ON d.id_contenedor::INT = c.id_contenedor
    WHERE c.estado != 'INACTIVO'
    ORDER BY c.id_contenedor DESC`);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener contenedores' });
  }
});

// ✅ CREAR CONTENEDOR
router.post('/crear_contenedor', async (req, res) => {
  const data = req.body;
  const query = `
    INSERT INTO cat_contenedor (
      id_naviera, numero_contenedor, tipo_contenedor, tamano, ano,
      id_categoria, id_ciudad_origen, estado_contenedor, observaciones,
      feccre, usucre, estado, verificado, ano_plaqueta, fecha_devolucion, 
      ubicacion_devolucion
    ) VALUES (
      $1,$2,$3,$4,$5,
      $6,$7,$8,$9,
      NOW(), $10, $11, $12, $13, $14, 
      $15
    ) RETURNING *`;

  const values = [
    data.id_naviera, data.numero_contenedor, data.tipo_contenedor,
    data.tamano, data.ano, data.id_categoria, data.id_ciudad_origen,
    data.estado_contenedor, data.observaciones, data.usucre, data.estado,
    data.verificado, data.ano_plaqueta, data.fecha_devolucion, 
    data.ubicacion_devolucion
  ];

  try {
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear contenedor' });
  }
});

// ✅ EDITAR CONTENEDOR
router.put('/editar_contenedor/:id', async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  const query = `
    UPDATE cat_contenedor SET
      id_naviera=$1,
      numero_contenedor=$2,
      tipo_contenedor=$3,
      tamano=$4,
      ano=$5,
      id_categoria=$6,
      id_ciudad_origen=$7,
      estado_contenedor=$8,
      observaciones=$9,
      fecmod=NOW(),
      usumod=$10,
      estado=$12,
      verificado=$13,
      ano_plaqueta=$14,
      fecha_devolucion=$15,
      ubicacion_devolucion=$16,
      tiene_estibaje=$17,
      tiene_gruaje=$18,
      tiene_montacarga=$19,
      tiene_urbano=$20,
      tiene_trasbordo=$21,
      tiene_lavado=$22
    WHERE id_contenedor=$11 RETURNING *`;

  const values = [
    data.id_naviera, data.numero_contenedor, data.tipo_contenedor,
    data.tamano, data.ano, data.id_categoria, data.id_ciudad_origen,
    data.estado_contenedor, data.observaciones, data.usumod || 'admin', 
    id, data.estado,
    data.verificado, data.ano_plaqueta, data.fecha_devolucion,
    data.ubicacion_devolucion, data.tiene_estibaje, data.tiene_gruaje,
    data.tiene_montacarga, data.tiene_urbano, data.tiene_trasbordo,
    data.tiene_lavado
  ];

  try {
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al editar contenedor' });
  }
});

router.put('/editar_estado_contenedor/:id', async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  const query = `
    UPDATE cat_contenedor SET
      estado=$1, usumod=$2, fecmod=NOW()
    WHERE id_contenedor=$3 RETURNING *`;

  const values = [
    data.estado || 'INACTIVO', data.usumod || 'sistema', id
  ];

  try {
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al editar el estado del contenedor' });
  }
});

// ✅ ELIMINAR CONTENEDOR (borrado lógico opcional)
router.put('/eliminar_contenedor/:id', async (req, res) => {
  const { id } = req.params;
  const { usumod } = req.body;

  try {
    await pool.query(
      `UPDATE cat_contenedor SET estado='INACTIVO', fecmod=NOW(), usumod=$1 WHERE id_contenedor=$2`,
      [usumod || 'sistema', id]
    );
    res.json({ message: 'Contenedor marcado como INACTIVO' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al desactivar contenedor' });
  }
});

router.get('/navieras', async (req, res) => {
  try {
    const result = await pool.query(`SELECT id_naviera, nombre_comercial FROM public.cat_naviera ORDER BY id_naviera`);
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

router.get('/gastos/:idContenedor/:nombreGasto', async (req, res) => {
  const { idContenedor, nombreGasto } = req.params;
  const { rows } = await pool.query(
    `SELECT * 
     FROM cat_contenedor_gasto
     WHERE id_contenedor = $1 AND tipo = $2
       AND estado != 'INACTIVO'
     ORDER BY id_contenedor_gasto`,
    [idContenedor, nombreGasto]
  );
  res.json(rows);
});

router.post('/crear_gasto', async (req, res) => {
  const { id_contenedor, tipo, lugar, monto, cancelado, estado, fecha_pago, modalidad_pago, persona_pago } = req.body;

  try {
    // 1️⃣ Insertar el gasto
    const { rows } = await pool.query(
      `INSERT INTO cat_contenedor_gasto 
       (id_contenedor, tipo, lugar, monto, cancelado, estado, fecha_pago, modalidad_pago, persona_pago) 
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [id_contenedor, tipo, lugar, monto, cancelado, estado, fecha_pago, modalidad_pago, persona_pago]
    );

    const gastoInsertado = rows[0];

    const { rows: sumaRows } = await pool.query(
      `SELECT COALESCE(SUM(monto::NUMERIC), 0) AS total
       FROM cat_contenedor_gasto
       WHERE id_contenedor = $1 AND tipo = $2 AND estado != 'INACTIVO'`,
      [id_contenedor, tipo]
    );

    const total = sumaRows[0].total;

    let tipoLower = tipo.toLowerCase();

    await pool.query(
      `UPDATE cat_contenedor
       SET ${tipoLower} = $1
       WHERE id_contenedor = $2`,
      [total, id_contenedor]
    );

    // 4️⃣ Respuesta final
    res.status(201).json({
      message: 'Gasto creado y total actualizado correctamente',
      gasto: gastoInsertado,
      total_actualizado: total
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear el gasto y actualizar el total' });
  }
});


router.put('/editar_gasto/:id', async (req, res) => {
  const { id } = req.params;
  const { id_contenedor, tipo, lugar, monto, cancelado, estado, fecha_pago, modalidad_pago, persona_pago } = req.body;

  try {
  const { rows } = await pool.query(
    `UPDATE cat_contenedor_gasto
     SET tipo=$1, lugar=$2, monto=$3, cancelado=$4, estado=$5, fecha_pago=$6, modalidad_pago=$7, persona_pago=$8
     WHERE id_contenedor_gasto=$9 RETURNING *`,
    [tipo, lugar, monto, cancelado, estado, fecha_pago, modalidad_pago, persona_pago, id]
  );

  const gastoInsertado = rows[0];

    const { rows: sumaRows } = await pool.query(
      `SELECT COALESCE(SUM(monto::NUMERIC), 0) AS total
       FROM cat_contenedor_gasto
       WHERE id_contenedor = $1 AND tipo = $2 AND estado != 'INACTIVO'`,
      [id_contenedor, tipo]
    );

    const total = sumaRows[0].total;

    let tipoLower = tipo.toLowerCase();

    await pool.query(
      `UPDATE cat_contenedor
       SET ${tipoLower} = $1
       WHERE id_contenedor = $2`,
      [total, id_contenedor]
    );

    // 4️⃣ Respuesta final
    res.status(201).json({
      message: 'Gasto creado y total actualizado correctamente',
      gasto: gastoInsertado,
      total_actualizado: total
    });
    } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear el gasto y actualizar el total' });
  }
});

router.put('/eliminar_gasto/:id/:id_contenedor/:tipo', async (req, res) => {
  const { id, id_contenedor, tipo } = req.params;
  try {
    await pool.query(
      `UPDATE cat_contenedor_gasto 
       SET estado = 'INACTIVO'
       WHERE id_contenedor_gasto = $1`,
      [id]
    );

    const { rows: sumaRows } = await pool.query(
      `SELECT SUM(monto::NUMERIC) AS total
       FROM cat_contenedor_gasto
       WHERE id_contenedor = $1 AND tipo = $2 AND estado != 'INACTIVO'`,
      [id_contenedor, tipo]
    );

    const total = sumaRows[0].total;

    let tipoLower = tipo.toLowerCase();

    await pool.query(
      `UPDATE cat_contenedor
       SET ${tipoLower} = $1
       WHERE id_contenedor = $2`,
      [total, id_contenedor]
    );

    // 4️⃣ Respuesta final
    res.status(201).json({
      message: 'Gasto creado y total actualizado correctamente',
      total_actualizado: total
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al marcar gasto como anulado' });
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
    cb(null, 'uploads/imagenes_contenedor/'); 
  },
  filename: function (req, file, cb) {    
    const nombreFinal = file.originalname;
    cb(null, nombreFinal);
  }
});
const upload = multer({ storage: storage });

router.get('/verImagen/:id', (req, res)=>{ // ej: 123-C1_IZQUIERDA

    if(fs.existsSync(path.join(__dirname, '../../uploads/imagenes_contenedor', `${req.params.id}`))) {
      res.sendFile( path.join(__dirname, '../../uploads/imagenes_contenedor', `${req.params.id}`));
    } 
    else {
      res.json('No existe el documento');
    }

});

router.post('/subir_imagen', upload.single('archivo'), (req, res) => {
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


router.get('/devoluciones/:idContenedor', async (req, res) => {
  const { idContenedor} = req.params;
  const { rows } = await pool.query(
    `SELECT * 
     FROM cat_contenedor_devolucion
     WHERE id_contenedor = $1 
       AND estado != 'INACTIVO'
     ORDER BY id_contenedor_devolucion`,
    [idContenedor]
  );
  res.json(rows);
});

router.post('/crear_devolucion', async (req, res) => {
  const { id_contenedor, id_vehiculo, urbano, fecha_devolucion } = req.body;

  try {
    // 1️⃣ Insertar la devolución
    const { rows } = await pool.query(
      `INSERT INTO cat_contenedor_devolucion 
       (id_contenedor, id_vehiculo, urbano, fecha_devolucion) 
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [id_contenedor, id_vehiculo, urbano, fecha_devolucion]
    );

    const devolucionInsertada = rows[0];

    await pool.query(
      `UPDATE cat_contenedor
       SET estado= 'DEVUELTO', fecmod=NOW()
       WHERE id_contenedor = $1`,
      [id_contenedor]
    );

    await pool.query(
      `UPDATE despachos
       SET estado= 'DEVUELTO', fecmod=NOW()
       WHERE id_contenedor = $1`,
      [id_contenedor]
    );

    // 4️⃣ Respuesta final
    res.status(201).json({
      message: 'Devolución creada y total actualizado correctamente',
      gasto: devolucionInsertada
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear la devolución' });
  }
});


router.put('/editar_devolucion/:id', async (req, res) => {
  const { id } = req.params;
  const { id_contenedor, id_vehiculo, urbano, fecha_devolucion } = req.body;

  try {
  const { rows } = await pool.query(
    `UPDATE cat_contenedor_devolucion
     SET id_vehiculo=$1, urbano=$2, fecha_devolucion=$3
     WHERE id_contenedor_devolucion=$4 RETURNING *`,
    [id_vehiculo, urbano, fecha_devolucion, id]
  );

  const devolucionInsertada = rows[0];

    // 4️⃣ Respuesta final
    res.status(201).json({
      message: 'Devolución editada y total actualizado correctamente',
      devolucion: devolucionInsertada
    });
    } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear la devolución y actualizar el total' });
  }
});

router.put('/eliminar_devolucion/:id/:id_contenedor', async (req, res) => {
  const { id, id_contenedor } = req.params;
  try {
    await pool.query(
      `UPDATE cat_contenedor_devolucion
       SET estado = 'INACTIVO'
       WHERE id_contenedor_devolucion = $1`,
      [id]
    );

    await pool.query(
      `UPDATE cat_contenedor
       SET estado= 'PLANIFICADO', fecmod=NOW()
       WHERE id_contenedor = $1 AND (SELECT COUNT(*) FROM cat_contenedor_devolucion WHERE id_contenedor = $1 AND estado != 'INACTIVO') = 0`,
      [id_contenedor]
    );

     await pool.query(
      `UPDATE despachos
       SET estado= 'PLANIFICADO', fecmod=NOW()
       WHERE id_contenedor::int = $1 AND (SELECT COUNT(*) FROM cat_contenedor_devolucion WHERE id_contenedor = $1 AND estado != 'INACTIVO') = 0`,
      [id_contenedor]
    );
    // 4️⃣ Respuesta final
    res.status(201).json({
      message: 'Devolución actualizado correctamente'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al marcar gasto como anulado' });
  }
});

router.get('/gastos_deuda', async (req, res) => {
  const { rows } = await pool.query(
    `select tipo, sum(monto::numeric) from cat_contenedor_gasto where cancelado = false AND estado != 'INACTIVO' group by tipo`
  );
  res.json(rows);
});

router.get('/imagenes/:id_contenedor', (req, res) => {
  const { id_contenedor } = req.params;
  const carpetaUploads = path.join(__dirname, '../../uploads/imagenes_contenedor');

  try {
    const archivos = fs.readdirSync(carpetaUploads);

    // Extensiones permitidas
    const extensiones = ['.jpg', '.jpeg', '.png'];

    // Filtrar archivos que empiezan con id_contenedor-nombre y tienen extensión de imagen
    const filtrados = archivos.filter(file => {
      const lower = file.toLowerCase();
      return (
        file.startsWith(`${id_contenedor}-`) &&
        extensiones.some(ext => lower.endsWith(ext))
      );
    });

    // Mapear a objetos { nombre }
    const resultado = filtrados.map(nombre => ({ nombre }));

    res.json(resultado);
  } catch (err) {
    console.error('Error al leer imágenes:', err.message);
    res.status(500).json({ error: 'No se pudieron leer las imágenes' });
  }
});

const storagePDF = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/pdfs_contenedor/'); 
  },
  filename: function (req, file, cb) {    
    const nombreFinal = file.originalname;
    cb(null, nombreFinal);
  }
});
const uploadPDF = multer({ storage: storagePDF });

router.get('/verPdf/:id', (req, res)=>{ 
    if(fs.existsSync(path.join(__dirname, '../../uploads/pdfs_contenedor', `${req.params.id}`))) {
      res.sendFile( path.join(__dirname, '../../uploads/pdfs_contenedor', `${req.params.id}`));
    } else {
      res.json('No existe el documento');
    }
});

router.post('/subir_pdf', uploadPDF.single('archivo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se envió archivo' });

  res.status(200).json({
    mensaje: 'Archivo subido correctamente',
    nombreArchivo: req.file.filename,
    idDespacho: req.body.id_despacho
  });
});

router.get('/pdfs/:id_contenedor/:pdf', (req, res) => {
  const { id_contenedor, pdf } = req.params;
  const carpetaUploads = path.join(__dirname, '../../uploads/pdfs_contenedor');

  try {
    const archivos = fs.readdirSync(carpetaUploads);
    
    // Filtrar solo los que empiezan con id_contenedor y contienen el nombre pdf dinámico
    const filtrados = archivos.filter(file =>
      file.startsWith(`${id_contenedor}-${pdf}`) && file.endsWith('.pdf')
    );

    // Mapear solo los nombres
    const resultado = filtrados.map(nombre => ({ nombre }));

    res.json(resultado);

  } catch (err) {
    console.error('Error al leer PDFs:', err.message);
    res.status(500).json({ error: 'No se pudieron leer los PDFs' });
  }
});

router.delete('/eliminar_pdf/:nombre', (req, res) => {
  const nombre = req.params.nombre;
  const ruta = path.join(__dirname, '../../uploads/pdfs_contenedor', nombre);

  fs.unlink(ruta, (err) => {
    if (err) {
      return res.status(404).json({ ok: false, msg: 'Archivo no encontrado' });
    }
    res.json({ ok: true, msg: 'Archivo eliminado' });
  });
});

module.exports = router;
