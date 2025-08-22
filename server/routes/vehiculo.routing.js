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

module.exports = router;
