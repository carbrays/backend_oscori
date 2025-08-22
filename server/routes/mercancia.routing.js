const express = require('express');
const router = express.Router();
const { pool } = require("../config/db");

// 📌 LISTAR VEHÍCULOS ACTIVOS
router.get('/mercancias', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM cat_mercancia WHERE estado = 'ACTIVO' ORDER BY id_mercancia DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener mercancías' });
  }
});

// 📌 CREAR MERCANCÍA
router.post('/crear_mercancia', async (req, res) => {
  const data = req.body;
  const query = `
    INSERT INTO cat_mercancia (
      mercancia, descripcion, estado, usucre, feccre
    ) VALUES (
      $1,$2,$3,$4,NOW()
    ) RETURNING *`;

  const values = [
    data.mercancia, data.descripcion, data.estado || 'ACTIVO', data.usucre
  ];

  try {
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear mercancía' });
  }
});

// 📌 EDITAR MERCANCÍA
router.put('/editar_mercancia/:id', async (req, res) => {
  const id = req.params.id;
  const data = req.body;

  const query = `
    UPDATE cat_mercancia SET
      mercancia=$1, descripcion=$2, estado=$3
    WHERE id_mercancia=$4 RETURNING *`;

  const values = [
    data.mercancia, data.descripcion, data.estado || 'ACTIVO', id
  ];

  try {
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al editar vehículo' });
  }
});

// 📌 DESACTIVAR MERCANCÍA
router.put('/eliminar_mercancia/:id', async (req, res) => {
  const { id } = req.params;
  const { estado} = req.body;

  try {
    await pool.query(
      `UPDATE cat_mercancia SET estado = $1 WHERE id_mercancia = $2`,
      [estado || 'INACTIVO', id]
    );
    res.status(200).json({ message: 'Mercancía desactivada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al desactivar mercancía' });
  }
});

module.exports = router;
