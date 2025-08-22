const express = require('express');
const router = express.Router();
const { pool } = require("../config/db");

// Listar usuarios
router.get('/usuarios', async (req, res) => {
  const result = await pool.query(`SELECT * FROM usuarios WHERE estado='ACTIVO' ORDER BY id_usuario DESC`);
  res.json(result.rows);
});

// Crear usuario
router.post('/crear_usuario', async (req, res) => {
    console.log('crear_usuario')
  const data = req.body;
  const query = `
    INSERT INTO public.usuarios(login, password, nombre, paterno, materno, ci, direccion, cargo, rol, telefono, telefono_chile, correo, 
    persona_ref, telefono_ref, licencia_categoria, licencia_vencimiento, fecha_inicio, usucre)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
    RETURNING *`;
    console.log(query)
  const values = [
    data.login, data.password, data.nombre, data.paterno, data.materno, data.ci, data.direccion, data.cargo, data.rol, data.telefono, data.telefono_chile, data.correo,
    data.persona_ref, data.telefono_ref, data.licencia_categoria, data.licencia_vencimiento, data.fecha_inicio, data.usucre
  ];
  const result = await pool.query(query, values);
  res.json(result.rows[0]);
});

// Editar usuario
router.put('/editar/:id', async (req, res) => {
  const id = req.params.id;
  const data = req.body;
  const result = await pool.query(`
    UPDATE usuarios SET
    nombre=$1, paterno=$2, materno=$3, ci=$4,
    direccion=$5, cargo=$6, telefono=$7, telefono_chile=$8, correo=$9,
    persona_ref=$10, telefono_ref=$11, licencia_categoria=$12,
    licencia_vencimiento=$13, usumod='admin', fecmod=NOW()
    WHERE id_usuario=$14 RETURNING *`,
    [data.nombre, data.paterno, data.materno, data.ci,
     data.direccion, data.cargo, data.telefono, data.telefono_chile,
     data.correo, data.persona_ref, data.telefono_ref,
     data.licencia_categoria, data.licencia_vencimiento, id]);
  res.json(result.rows[0]);
});

router.put('/eliminar/:id', async (req, res) => {
  const { id } = req.params;
  const { estado, usumod, fecmod } = req.body;

  try {
    await pool.query(
        `UPDATE usuarios SET estado = $1, usumod = $2, fecmod = $3  WHERE id_usuario=$4 RETURNING *`, [estado || 'INACTIVO', usumod || 'sistema', fecmod || new Date(), id])
    res.status(200).json({ message: 'Usuario desactivado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al desactivar usuario' });
  }
});

module.exports = router;
