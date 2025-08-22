const express = require('express');
const router = express.Router();
const { pool } = require("../config/db");

// 📌 LISTAR NAVIERAS ACTIVAS
router.get('/navieras', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM cat_naviera ORDER BY id_naviera`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener navieras' });
  }
});

// 📌 CREAR NAVIERA
router.post('/crear_naviera', async (req, res) => {
  const data = req.body;

  const query = `
    INSERT INTO cat_naviera (
      nombre_comercial, razon_social, pais_origen, sitio_web,
      telefono_contacto, correo_contacto, direccion,
      representante, observaciones, feccre, usucre, dias
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7,
      $8, $9, NOW(), $10, $11
    ) RETURNING *
  `;

  const values = [
    data.nombre_comercial, data.razon_social, data.pais_origen, data.sitio_web,
    data.telefono_contacto, data.correo_contacto, data.direccion,
    data.representante, data.observaciones, data.usucre || 'admin', data.dias || 0
  ];

  try {
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear naviera' });
  }
});

// 📌 EDITAR NAVIERA
router.put('/editar_naviera/:id', async (req, res) => {
  const id = req.params.id;
  const data = req.body;

  const query = `
    UPDATE cat_naviera SET
      nombre_comercial = $1, razon_social = $2, pais_origen = $3, sitio_web = $4,
      telefono_contacto = $5, correo_contacto = $6, direccion = $7,
      representante = $8, observaciones = $9, dias = $10,
      fecmod = NOW(), usumod = $11
    WHERE id_naviera = $12
    RETURNING *
  `;

  const values = [
    data.nombre_comercial, data.razon_social, data.pais_origen, data.sitio_web,
    data.telefono_contacto, data.correo_contacto, data.direccion,
    data.representante, data.observaciones, data.dias || 0,
    data.usumod || 'admin', id
  ];

  try {
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al editar naviera' });
  }
});

module.exports = router;
