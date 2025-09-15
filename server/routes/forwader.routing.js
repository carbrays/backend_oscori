const express = require('express');
const router = express.Router();
const { pool } = require("../config/db");

// 📌 LISTAR CLIENTES ACTIVOS
router.get('/forwaders', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM forwaders WHERE estado = 'ACTIVO' ORDER BY id_forwarder DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener forwaders' });
  }
});

// 📌 CREAR FORWARDER
router.post('/crear_forwarder', async (req, res) => {
  const data = req.body;

  const query = `
    INSERT INTO forwaders (
      nombre_comercial, persona_contacto, correo, telefono,
      pais, direccion, estado, feccre, usucre, ciudad
    ) VALUES (
      $1,$2,$3,$4,$5,
      $6,$7,NOW(),$8,$9
    ) RETURNING *`;

  const values = [
    data.nombre_comercial, data.persona_contacto, data.correo, data.telefono,
    data.pais, data.direccion, data.estado || 'ACTIVO', data.usucre, data.ciudad
  ];

  try {
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear forwarder' });
  }
});


// 📌 EDITAR FORWARDER
router.put('/editar_forwarder/:id', async (req, res) => {
  const id = req.params.id;
  const data = req.body;

  const query = `
    UPDATE forwaders SET
      nombre_comercial=$1, persona_contacto=$2, correo=$3, telefono=$4,
      pais=$5, direccion=$6, ciudad=$7,
      estado=$8, usumod=$9, fecmod=NOW()
    WHERE id_forwarder=$10 RETURNING *`;

  const values = [
    data.nombre_comercial, data.persona_contacto, data.correo, data.telefono,
    data.pais, data.direccion, data.ciudad,
    data.estado || 'ACTIVO', data.usumod || 'admin', id
  ];

  try {
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al editar forwarder' });
  }
});


// 📌 ELIMINAR (DESACTIVAR) FORWARDER
router.put('/eliminar_forwarder/:id', async (req, res) => {
  const { id } = req.params;
  const { estado, usumod } = req.body;

  try {
    await pool.query(
      `UPDATE forwaders SET estado = $1, usumod = $2, fecmod = NOW() WHERE id_forwarder = $3`,
      [estado || 'INACTIVO', usumod || 'sistema', id]
    );
    res.status(200).json({ message: 'Forwarder desactivado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al desactivar forwarder' });
  }
});


module.exports = router;
