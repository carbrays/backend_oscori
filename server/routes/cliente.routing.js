const express = require('express');
const router = express.Router();
const { pool } = require("../config/db");

// 📌 LISTAR CLIENTES ACTIVOS
router.get('/clientes', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM clientes WHERE estado = 'ACTIVO' ORDER BY id_cliente DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

// 📌 CREAR CLIENTE
router.post('/crear_cliente', async (req, res) => {
  const data = req.body;
  const query = `
    INSERT INTO clientes (
      nombre_comercial, razon_social, nit, correo, telefono, whatsapp, direccion,
      pais, ciudad, id_forwarder, persona_contacto, telefono_contacto, correo_contacto,
      estado, usucre, feccre
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,
      $8,$9,$10,$11,$12,$13,
      $14,$15,NOW()
    ) RETURNING *`;

  const values = [
    data.nombre_comercial, data.razon_social, data.nit, data.correo,
    data.telefono, data.whatsapp, data.direccion, data.pais, data.ciudad,
    data.id_forwarder, data.persona_contacto, data.telefono_contacto, data.correo_contacto,
    data.estado || 'ACTIVO', data.usucre
  ];

  try {
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

// 📌 EDITAR CLIENTE
router.put('/editar_cliente/:id', async (req, res) => {
  const id = req.params.id;
  const data = req.body;

  const query = `
    UPDATE clientes SET
      nombre_comercial=$1, razon_social=$2, nit=$3, correo=$4,
      telefono=$5, whatsapp=$6, direccion=$7, pais=$8, ciudad=$9,
      id_forwarder=$10, persona_contacto=$11, telefono_contacto=$12, correo_contacto=$13,
      usumod=$14, fecmod=NOW()
    WHERE id_cliente=$15 RETURNING *`;

  const values = [
    data.nombre_comercial, data.razon_social, data.nit, data.correo,
    data.telefono, data.whatsapp, data.direccion, data.pais, data.ciudad,
    data.id_forwarder, data.persona_contacto, data.telefono_contacto, data.correo_contacto,
    data.usumod || 'admin', id
  ];

  try {
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al editar cliente' });
  }
});

// 📌 ELIMINAR (DESACTIVAR) CLIENTE
router.put('/eliminar_cliente/:id', async (req, res) => {
  const { id } = req.params;
  const { estado, usumod } = req.body;

  try {
    await pool.query(
      `UPDATE clientes SET estado = $1, usumod = $2, fecmod = NOW() WHERE id_cliente = $3`,
      [estado || 'INACTIVO', usumod || 'sistema', id]
    );
    res.status(200).json({ message: 'Cliente desactivado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al desactivar cliente' });
  }
});

module.exports = router;
