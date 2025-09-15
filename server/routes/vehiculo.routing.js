const express = require('express');
const router = express.Router();
const { pool } = require("../config/db");

// 📌 LISTAR VEHÍCULOS ACTIVOS
router.get('/vehiculos', async (req, res) => {
  try {
    const result = await pool.query(`SELECT *, (SELECT CASE WHEN count(*)>0 THEN 'OCUPADO' ELSE 'LIBRE' END FROM despachos WHERE id_asignacion_vehiculo_carga = vehiculos.id_vehiculo AND estado='EN PROCESO') as despachos_en_proceso FROM vehiculos WHERE estado = 'ACTIVO' ORDER BY id_vehiculo`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener vehículos' });
  }
});

// 📌 CREAR VEHÍCULO
router.post('/crear_vehiculo', async (req, res) => {
  const data = req.body;
  const query = `
    INSERT INTO vehiculos (
      placa, marca, modelo, fabricacion, tipo_vehiculo,
      color, nro_chasis, nro_motor, capacidad_carga_kg, volumen_carga_m3,
      tipo_combustible, kilometraje, estado, usucre, feccre
    ) VALUES (
      $1,$2,$3,$4,$5,
      $6,$7,$8,$9,$10,
      $11,$12,$13,$14,NOW()
    ) RETURNING *`;

  const values = [
    data.placa, data.marca, data.modelo, data.fabricacion, data.tipo_vehiculo,
    data.color, data.nro_chasis, data.nro_motor, data.capacidad_carga_kg, data.volumen_carga_m3,
    data.tipo_combustible, data.kilometraje, data.estado || 'ACTIVO', data.usucre
  ];

  try {
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear vehículo' });
  }
});

// 📌 EDITAR VEHÍCULO
router.put('/editar_vehiculo/:id', async (req, res) => {
  const id = req.params.id;
  const data = req.body;

  const query = `
    UPDATE vehiculos SET
      placa=$1, marca=$2, modelo=$3, fabricacion=$4, tipo_vehiculo=$5,
      color=$6, nro_chasis=$7, nro_motor=$8, capacidad_carga_kg=$9,
      volumen_carga_m3=$10, tipo_combustible=$11, kilometraje=$12,
      usumod=$13, fecmod=NOW()
    WHERE id_vehiculo=$14 RETURNING *`;

  const values = [
    data.placa, data.marca, data.modelo, data.fabricacion, data.tipo_vehiculo,
    data.color, data.nro_chasis, data.nro_motor, data.capacidad_carga_kg,
    data.volumen_carga_m3, data.tipo_combustible, data.kilometraje,
    data.usumod || 'admin', id
  ];

  try {
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al editar vehículo' });
  }
});

// 📌 DESACTIVAR VEHÍCULO
router.put('/eliminar_vehiculo/:id', async (req, res) => {
  const { id } = req.params;
  const { estado, usumod } = req.body;

  try {
    await pool.query(
      `UPDATE vehiculos SET estado = $1, usumod = $2, fecmod = NOW() WHERE id_vehiculo = $3`,
      [estado || 'INACTIVO', usumod || 'sistema', id]
    );
    res.status(200).json({ message: 'Vehículo desactivado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al desactivar vehículo' });
  }
});

router.get('/vehiculos_propios', async (req, res) => {
  try {
    const result = await pool.query(`SELECT placa, nombre ||' '||coalesce(paterno,'')||' '||coalesce(materno,'') conductor
      FROM vehiculos v
      JOIN usuarios u ON u.id_usuario = v.conductor
      WHERE v.conductor IS NOT NULL
      ORDER BY 1`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener vehículos' });
  }
});

// ===============================
// 🚗 MANTENIMIENTO VEHICULOS
// ===============================

router.get("/mantenimientos", async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM mantenimiento_vehiculos WHERE estado != 'INACTIVO' ORDER BY id_mantenimiento DESC`);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener mantenimientos" });
  }
});

// POST crear
router.post("/crear_mantenimiento", async (req, res) => {
  const data = req.body;
  const query = `
    INSERT INTO mantenimiento_vehiculos (tipo, fecha, lugar, costo, km, fecha_siguiente, estado, usucre, feccre)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW()) RETURNING *`;
  const values = [data.tipo, data.fecha, data.lugar, data.costo, data.km, data.fecha_siguiente, data.estado, data.usucre];
  try {
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al crear mantenimiento" });
  }
});

// PUT editar
router.put("/editar_mantenimiento/:id", async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const query = `
    UPDATE mantenimiento_vehiculos SET tipo=$1, fecha=$2, lugar=$3, costo=$4, km=$5, fecha_siguiente=$6,
    estado=$7, usumod=$8, fecmod=NOW()
    WHERE id_mantenimiento=$9 RETURNING *`;
  const values = [data.tipo, data.fecha, data.lugar, data.costo, data.km, data.fecha_siguiente, data.estado, data.usumod, id];
  try {
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al editar mantenimiento" });
  }
});

// DELETE lógico
router.put("/eliminar_mantenimiento/:id", async (req, res) => {
  const { id } = req.params;
  const { usumod } = req.body;
  try {
    await pool.query(
      `UPDATE mantenimiento_vehiculos SET estado='INACTIVO', fecmod=NOW(), usumod=$1 WHERE id_mantenimiento=$2`,
      [usumod || "sistema", id]
    );
    res.json({ message: "Mantenimiento marcado como INACTIVO" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al eliminar mantenimiento" });
  }
});

// ===============================
// 🔧 MANTENIMIENTO DETALLES
// ===============================

router.get("/mantenimiento_detalles/:id_mantenimiento", async (req, res) => {
  try {
    const { id_mantenimiento } = req.params;
    const result = await pool.query(`SELECT * FROM mantenimiento_detalles WHERE id_mantenimiento=$1 AND estado != 'INACTIVO'`, [id_mantenimiento]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener detalles" });
  }
});

router.post("/crear_mantenimiento_detalle", async (req, res) => {
  const data = req.body;
  const query = `
    INSERT INTO mantenimiento_detalles (id_mantenimiento, pieza, descripcion, tipo, cantidad, unidad, costo, fecha_siguiente, estado, usucre, feccre)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),$10) RETURNING *`;
  const values = [data.id_mantenimiento, data.pieza, data.descripcion, data.tipo, data.cantidad, data.unidad, data.costo, data.fecha_siguiente, data.estado, data.usucre];
  try {
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al crear detalle" });
  }
});

router.put("/editar_mantenimiento_detalle/:id", async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const query = `
    UPDATE mantenimiento_detalles SET id_mantenimiento=$1, pieza=$2, descripcion=$3, tipo=$4, cantidad=$5, unidad=$6, costo=$7, fecha_siguiente=$8,
    estado=$9, usumod=$10, fecmod=NOW()
    WHERE id_detalle=$11 RETURNING *`;
  const values = [data.id_mantenimiento, data.pieza, data.descripcion, data.tipo, data.cantidad, data.unidad, data.costo, data.fecha_siguiente, data.estado, data.usumod, id];
  try {
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al editar detalle" });
  }
});

router.put("/eliminar_mantenimiento_detalle/:id", async (req, res) => {
  const { id } = req.params;
  const { usumod } = req.body;
  try {
    await pool.query(`UPDATE mantenimiento_detalles SET estado='INACTIVO', fecmod=NOW(), usumod=$1 WHERE id_detalle=$2`, [usumod, id]);
    res.json({ message: "Detalle marcado como INACTIVO" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar detalle" });
  }
});

// ===============================
// 🛠️ REPARACION VEHICULOS
// ===============================

router.get("/reparaciones", async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM reparacion_vehiculos WHERE estado != 'INACTIVO' ORDER BY id_reparacion DESC`);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener reparaciones" });
  }
});

router.post("/crear_reparacion", async (req, res) => {
  const data = req.body;
  const query = `
    INSERT INTO reparacion_vehiculos (pieza, descripcion, tipo, fecha, lugar, costo, km, fec_siguiente, estado, usucre, feccre)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW()) RETURNING *`;
  const values = [data.pieza, data.descripcion, data.tipo, data.fecha, data.lugar, data.costo, data.km, data.fec_siguiente, data.estado, data.usucre];
  try {
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al crear reparacion" });
  }
});

// PUT editar reparación
router.put("/editar_reparacion/:id", async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  const query = `
    UPDATE reparacion_vehiculos SET
      pieza=$1,
      descripcion=$2,
      tipo=$3,
      fecha=$4,
      lugar=$5,
      costo=$6,
      km=$7,
      fec_siguiente=$8,
      estado=$9,
      usumod=$10,
      fecmod=NOW()
    WHERE id_reparacion=$11 RETURNING *`;

  const values = [
    data.pieza, data.descripcion, data.tipo, data.fecha, data.lugar,
    data.costo, data.km, data.fec_siguiente, data.estado, data.usumod, id
  ];

  try {
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al editar reparación" });
  }
});

// DELETE lógico reparación
router.put("/eliminar_reparacion/:id", async (req, res) => {
  const { id } = req.params;
  const { usumod } = req.body;

  try {
    await pool.query(
      `UPDATE reparacion_vehiculos SET estado='INACTIVO', fecmod=NOW(), usumod=$1 WHERE id_reparacion=$2`,
      [usumod || "sistema", id]
    );
    res.json({ message: "Reparación marcada como INACTIVO" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al eliminar reparación" });
  }
});

// ===============================
// 🔍 REVISION VEHICULO
// ===============================

router.get("/revisiones", async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM revision_vehiculo WHERE estado != 'INACTIVO' ORDER BY id_revision DESC`);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener revisiones" });
  }
});

router.post("/crear_revision", async (req, res) => {
  const data = req.body;
  const query = `
    INSERT INTO revision_vehiculo (tipo, pieza, fecha, accion, estado, usucre, feccre)
    VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *`;
  const values = [data.tipo, data.pieza, data.fecha, data.accion, data.estado, data.usucre];
  try {
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al crear revision" });
  }
});

// PUT editar revisión
router.put("/editar_revision/:id", async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  const query = `
    UPDATE revision_vehiculo SET
      tipo=$1,
      pieza=$2,
      fecha=$3,
      accion=$4,
      estado=$5,
      usumod=$6,
      fecmod=NOW()
    WHERE id_revision=$7 RETURNING *`;

  const values = [
    data.tipo, data.pieza, data.fecha, data.accion,
    data.estado, data.usumod, id
  ];

  try {
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al editar revisión" });
  }
});

// DELETE lógico revisión
router.put("/eliminar_revision/:id", async (req, res) => {
  const { id } = req.params;
  const { usumod } = req.body;

  try {
    await pool.query(
      `UPDATE revision_vehiculo SET estado='INACTIVO', fecmod=NOW(), usumod=$1 WHERE id_revision=$2`,
      [usumod || "sistema", id]
    );
    res.json({ message: "Revisión marcada como INACTIVO" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al eliminar revisión" });
  }
});

module.exports = router;
