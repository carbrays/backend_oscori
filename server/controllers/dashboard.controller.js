const { pool } = require("../config/db");
const path = require("path");
const fs = require("fs");
const { PDFDocument } = require("pdf-lib");
const zlib = require("zlib");
const { exec } = require("child_process");
const { text } = require("stream/consumers");

const total = async (req, res) => {
  const text = `SELECT NOMBRE, COUNT, porcentaje FROM 
    (select 1 orden, 'Total Postulantes' nombre, count(*), 100.00 porcentaje from postulantes
    UNION
    select 2 orden, 'Total APTOS' nombre, count(*), ROUND((COUNT(*)::decimal / (SELECT COUNT(*) FROM postulantes) * 100), 2) porcentaje from examenes where estado_med = 'APTO' and estado_odonto='APTO' and estado_psico='APTO'
    UNION
    select 3 orden, 'Total NO APTOS' nombre, count(*), ROUND((COUNT(*)::decimal / (SELECT COUNT(*) FROM postulantes) * 100), 2) porcentaje from examenes where estado_med != 'APTO' or estado_odonto !='APTO' or estado_psico !='APTO') AS A
    ORDER BY orden`;
  pool.query(text, async (err, result) => {
    if (err) {pg
      throw err;
    } else {
      return res.status(200).json(result.rows);
    }
  });
};

const totalDeptoAprobado = async (req, res) => {
    const text = `select departamento, coalesce(f.count, 0) from departamentos d left join  
      (select depto, count(*) from postulantes p join examenes e on p.id_postulante = e.id_postulante where estado_med = 'APTO' and estado_odonto='APTO' and estado_psico='APTO' group by depto) f
      on id_depto = depto
      order by id_depto`;
  pool.query(text, async (err, result) => {
    if (err) {
      throw err;
    } else {
      return res.status(200).json(result.rows);
    }
  });
};

const totalDeptoReprobado = async (req, res) => {
  const text = `select departamento, coalesce(f.count, 0) from departamentos d left join  
    (select depto, count(*) from postulantes p join examenes e on p.id_postulante = e.id_postulante where estado_med != 'APTO' or estado_odonto!='APTO' or estado_psico!='APTO' group by depto) f
    on id_depto = depto
    order by id_depto`;
  pool.query(text, async (err, result) => {
    if (err) {
      throw err;
    } else {
      return res.status(200).json(result.rows);
    }
  });
};

const total2 = async (req, res) => {
  const text = `SELECT NOMBRE, COUNT, porcentaje FROM 
    (select 1 orden, 'Total Postulantes' nombre, count(*), 100.00 porcentaje from postulantes
    UNION
    select 2 orden, 'Total APTOS' nombre, count(*), ROUND((COUNT(*)::decimal / (SELECT COUNT(*) FROM postulantes) * 100), 2) porcentaje from examenes where estado_med = 'APTO' and estado_odonto='APTO'
    UNION
    select 3 orden, 'Total NO APTOS' nombre, count(*), ROUND((COUNT(*)::decimal / (SELECT COUNT(*) FROM postulantes) * 100), 2) porcentaje from examenes where estado_med = 'NO APTO' or estado_odonto ='NO APTO') AS A
    ORDER BY orden`;
  pool.query(text, async (err, result) => {
    if (err) {pg
      throw err;
    } else {
      return res.status(200).json(result.rows);
    }
  });
};

const inscritos = async (req, res) => {
  const text = `SELECT d.departamento, COUNT(p.id_postulante) AS cantidad_postulantes
FROM departamentos d
LEFT JOIN postulantes p ON d.id_depto = p.depto
GROUP BY d.departamento;`;
  pool.query(text, async (err, result) => {
    if (err) {pg
      throw err;
    } else {
      return res.status(200).json(result.rows);
    }
  });
};

const totalDeptoAprobado2 = async (req, res) => {
  const text = `select departamento, coalesce(f.count, 0) from departamentos d left join  
    (select depto, count(*) from postulantes p join examenes e on p.id_postulante = e.id_postulante where estado_med = 'APTO' and estado_odonto='APTO' group by depto) f
    on id_depto = depto
    order by id_depto`;
pool.query(text, async (err, result) => {
  if (err) {
    throw err;
  } else {
    return res.status(200).json(result.rows);
  }
});
};

const totalDeptoReprobado2 = async (req, res) => {
const text = `select departamento, coalesce(f.count, 0) from departamentos d left join  
  (select depto, count(*) from postulantes p join examenes e on p.id_postulante = e.id_postulante where estado_med != 'APTO' or estado_odonto!='APTO' group by depto) f
  on id_depto = depto
  order by id_depto`;
pool.query(text, async (err, result) => {
  if (err) {
    throw err;
  } else {
    return res.status(200).json(result.rows);
  }
});
};
const reportemed = async (req, res) => {
  
  let sexo = req.params.sexo == 0 ? `'M','F'` : `'` + req.params.sexo + `'`;
  let centro =
  req.params.centro == 0
    ? ``
    : `and (id_cm_med in (${req.params.centro}))`;
    let estado = 'e.estado_med';
    let identificador = 'e.id_cm_med';
  if(req.params.tipo==='MEDICO'){
   estado = 'e.estado_med';
   identificador = 'e.id_cm_med';
  }
  else if(req.params.tipo==='ODONTOLOGICO'){
     estado = 'e.estado_odonto';
     identificador = 'e.id_cm_odonto';
     centro = req.params.centro == 0
    ? ``
    : `and (id_cm_odonto in (${req.params.centro}))`;
    }
  else{
       estado = 'e.estado_med';
       identificador = 'e.id_cm_med';
      }
        const text = `SELECT DISTINCT
          p.cod_pros,
          p.cod_arc,
          p.id_postulante,
          p.ci,
          p.nombres,
          p.ap_pat,
          p.ap_mat,
          c.id_centro,
          c.depto AS departamento,
          c.nombre,
          c.tipo,
          c.med_resp,
          ${estado},
          (select departamento from departamentos where departamento=c.depto)departo, 
          CASE 
            WHEN ${estado} = 'APTO' OR ${estado} = 'NO APTO' THEN 'REALIZADO'
            WHEN ${estado} = 'SIN ESTADO' THEN 'NO REALIZADO'
            ELSE 'ABANDONO'
          END AS estado_final
        FROM 
          postulantes p
        LEFT JOIN 
          examenes e ON p.id_postulante = e.id_postulante
        LEFT JOIN 
          centros_medicos c ON (c.id_centro = ${identificador})
        WHERE p.id_postulante IS NOT NULL AND p.id_postulante = e.id_postulante 
        and sexo::text in (${sexo})  
        ${centro}
        ORDER BY p.cod_arc`;
  console.log(text);
  pool.query(text, async (err, result) => {
    if (err) {
      throw err;
    } else {
      return res.status(200).json(result.rows);
    }
  });
};

const reporte = async (req, res) => {
  let depto =
    req.params.depto == 0
      ? `'1','2','3','4','5','6','7','8','9'`
      : `'` + req.params.depto + `'`;
  let escuela =
    req.params.escuela == 0
      ? `select id_escuela from escuelas`
      : req.params.escuela;
  let sexo = req.params.sexo == 0 ? `'M','F'` : `'` + req.params.sexo + `'`;
  let centro =
    req.params.centro == 0
      ? ``
      : `and (id_cm_med in (${req.params.centro}) or id_cm_odonto in (${req.params.centro}) or id_cm_psico in (${req.params.centro}))`;
  const text = `SELECT p.id_postulante, p.cod_arc, ci, nombres, ap_pat, ap_mat, celular, fecnac, sexo, 
(select departamento from departamentos where id_depto=p.depto)depto, 
(select nombre from escuelas where id_escuela = p.id_escuela)id_escuela, 
cod_boucher, fec_boucher, total_boucher, case when estado_med ='APTO' AND estado_odonto ='APTO' and estado_psico='APTO' then 'APTO' ELSE 'NO APTO' END estado,
estado_med, estado_odonto, estado_psico
from postulantes p
join examenes e on p.id_postulante = e.id_postulante
where depto::text in (${depto}) and id_escuela in (${escuela}) 
and sexo::text in (${sexo}) 
${centro}
order by p.cod_arc`;
  console.log(text);
  pool.query(text, async (err, result) => {
    if (err) {
      throw err;
    } else {
      return res.status(200).json(result.rows);
    }
  });
};

const listar = async (req, res) => {
  const text = `SELECT p.*, estado_med, estado_psico, estado_odonto FROM postulantes p join examenes e on p.id_postulante = e.id_postulante order by id_postulante desc`;
  pool.query(text, async (err, result) => {
    if (err) {
      throw err;
    } else {
      return res.status(200).json(result.rows);
    }
  });
};

const listarPostulante = async (req, res) => {
  const text = `SELECT * FROM postulantes where id_postulante = ${req.params.id}`;
  pool.query(text, async (err, result) => {
    if (err) {
      throw err;
    } else {
      return res.status(200).json(result.rows);
    }
  });
};

const crearPostulante = async (req, res) => {
  try {
    let text1 = `INSERT INTO public.postulantes(
	ci, nombres, ap_pat, ap_mat, celular, fecnac, depto, id_escuela, cod_boucher, fec_boucher, total_boucher, id_usuario_asig, estado, usucre, feccre, sexo, cod_pros, cod_arc)
	VALUES ('${req.body.ci}',
'${req.body.nombres}',
'${req.body.ap_pat}',
'${req.body.ap_mat}',
'${req.body.celular}',
'${req.body.fecnac}',
'${req.body.depto}',
'${req.body.id_escuela}',
'${req.body.cod_boucher}',
'${req.body.fec_boucher}',
'${req.body.total_boucher}',
'${req.body.id_usuario_asig}',
'${req.body.estado}',
'${req.body.usucre}',
'${req.body.feccre}',
'${req.body.sexo}',
'${req.body.cod_pros}',
'${req.body.cod_arc}'
) returning id_postulante`;
    console.log(text1);
    pool.query(text1, async (err, result1) => {
      if (err) {
        throw err;
      } else {
        console.log(result1.rows);
        let text2 = `INSERT INTO public.examenes(id_postulante, verificado)
	                    VALUES ('${result1.rows[0].id_postulante}','SIN VERIFICAR') returning id_postulante`;
        pool.query(text2, async (err, result2) => {
          if (err) {
            throw err;
          } else {
            console.log(result2.rows);
            return res.status(200).json(result2.rows);
          }
        });
      }
    });
  } catch (error) {
    console.log('error al guardar los datos: ', error)
  }
  
};

const updatePostulante = async (req, res) => {
  try
  {
     let text1 = `UPDATE public.postulantes SET 
    ci='${req.body.ci}',
    nombres='${req.body.nombres}',
    ap_pat='${req.body.ap_pat}',
    ap_mat='${req.body.ap_mat}',
    celular='${req.body.celular}',
    fecnac='${req.body.fecnac}',
    depto='${req.body.depto}',
    id_escuela='${req.body.id_escuela}',
    cod_boucher='${req.body.cod_boucher}',
    fec_boucher='${req.body.fec_boucher}',
    total_boucher='${req.body.total_boucher}',
    id_usuario_asig='${req.body.id_usuario_asig}',
    estado='${req.body.estado}',
    usumod='${req.body.usumod}',
    fecmod='${req.body.fecmod}',
    sexo='${req.body.sexo}',
    cod_pros='${req.body.cod_pros}',
    cod_arc='${req.body.cod_arc}'
    WHERE id_postulante = '${req.body.id_postulante}'`;
     console.log(text1);
     pool.query(text1, async (err, result1) => {
       if (err) {
         throw err;
       } else {
         console.log(result1.rows);
         return res.status(200).json(result1.rows);
       }
     });
  }
  catch(error)
  {
    console.log('ocurrio un problema');
  } 
};

const updateExamenVmedico = async (req, res) => {
  let text = `UPDATE public.examenes SET 
  id_cm_med='${req.body.id_cm_med}', 
  estado_med='${req.body.estado_med}', 
  obs_med='${req.body.obs_med}', 
  fec_med='${req.body.fec_med}' 
	WHERE id_postulante=${req.body.id_postulante}`;
  console.log(text);
  pool.query(text, async (err, result1) => {
    if (err) {
      throw err;
    } else {
      console.log(result1.rows);
      return res.status(200).json(result1.rows);
    }
  });
};

const updateExamenVpsico = async (req, res) => {
  let text = `UPDATE public.examenes SET 
  id_cm_psico='${req.body.id_cm_psico}', 
  estado_psico='${req.body.estado_psico}', 
  obs_psico='${req.body.obs_psico}', 
  fec_psico='${req.body.fec_psico}' 
	WHERE id_postulante=${req.body.id_postulante}`;
  console.log(text);
  pool.query(text, async (err, result1) => {
    if (err) {
      throw err;
    } else {
      console.log(result1.rows);
      return res.status(200).json(result1.rows);
    }
  });
};

const updateExamenVodonto = async (req, res) => {
  let text = `UPDATE public.examenes SET 
  id_cm_odonto='${req.body.id_cm_odonto}', 
  estado_odonto='${req.body.estado_odonto}', 
  obs_odonto='${req.body.obs_odonto}', 
  fec_odonto='${req.body.fec_odonto}' 
	WHERE id_postulante=${req.body.id_postulante}`;
  console.log(text);
  pool.query(text, async (err, result1) => {
    if (err) {
      throw err;
    } else {
      console.log(result1.rows);
      return res.status(200).json(result1.rows);
    }
  });
};

const listarDeptos = async (req, res) => {
  const text = `select id_depto, departamento from departamentos`;
  pool.query(text, async (err, result) => {
    if (err) {
      throw err;
    } else {
      return res.status(200).json(result.rows);
    }
  });
};

const listarRoles = async (req, res) => {
  const text = `SELECT id_rol, rol, descripcion FROM roles`;
  pool.query(text, async (err, result) => {
    if (err) {
      throw err;
    } else {
      return res.status(200).json(result.rows);
    }
  });
};

/*
const DeptosWhere = async (req, res) => {
  let text = `SELECT id_depto, departamento FROM departamentos`;

  if (req.query.departamento) {
    text += ` WHERE departamento ILIKE '%${req.query.departamento}%'`;
  }

  try {
    const result = await pool.query(text);
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error al listar departamentos:", err);
    return res
      .status(500)
      .json({ message: "Ocurrió un error al listar los departamentos" });
  }
};*/

const obtenerCentros = async (req, res) => {
  const text = `select id_centro, nombre from centros_medicos where tipo = '${req.params.tipo}'`;
  pool.query(text, async (err, result) => {
    if (err) {
      throw err;
    } else {
      return res.status(200).json(result.rows);
    }
  });
};

const listarEscuela = async (req, res) => {
  const text = `SELECT * FROM escuelas ORDER BY id_escuela ASC`;
  pool.query(text, async (err, result) => {
    if (err) {
      throw err;
    } else {
      return res.status(200).json(result.rows);
    }
  });
};

const listarEscuelas = async (req, res) => {
  const text = `select id_escuela, nombre from escuelas`;
  pool.query(text, async (err, result) => {
    if (err) {
      throw err;
    } else {
      return res.status(200).json(result.rows);
    }
  });
};

const listarUsuarios = async (req, res) => {
  const text = `SELECT id_usuario, ci, nombres, ap_pat, ap_mat, celular, r.rol id_rol, login, password, u.depto, d.departamento, u.estado, u.usucre, u.feccre, u.usumod, u.fecmod 
FROM usuarios u
JOIN
roles r on u.id_rol = r.id_rol 
JOIN 
  departamentos d ON u.depto = d.id_depto
WHERE u.estado='ACTIVO' order by id_usuario asc`;
  pool.query(text, async (err, result) => {
    if (err) {
      throw err;
    } else {
      return res.status(200).json(result.rows);
    }
  });
};

const obtenerUsuarios = async (req, res) => {
  const text = `select * from usuarios where id_usuario='${req.params.id}'`;
  pool.query(text, async (err, result) => {
    if (err) {
      throw err;
    } else {
      return res.status(200).json(result.rows);
    }
  });
};

const verificarcarnet = async (req, res) => {
  const id = req.params.carnet;
  const text = `
    SELECT COUNT(*) as count FROM usuarios WHERE ci = '${id}'
  `;
  pool.query(text, async (err, result) => {
    if (err) {
      throw err;
    } else {
      const count = parseInt(result.rows[0].count, 10);
      
      console.log('Existencia >>>', count === 0 ? 'No existe' : 'Existe');
      // Devuelvo directamente el valor booleano
      return res.json({ exists: count === 0 });
      
    }
  });
};


const crearUsuario = async (req, res) => {
  let text1 = `INSERT INTO public.usuarios(
    ci, nombres, ap_pat, ap_mat, celular, id_rol, login, password, depto, estado, usucre, feccre, usumod, fecmod)
    VALUES ('${req.body.ci}',
    '${req.body.nombres}',
    '${req.body.ap_pat}',
    '${req.body.ap_mat}',
    '${req.body.celular}',
    '${req.body.id_rol}',
    '${req.body.login}',
    crypt('${req.body.password}',gen_salt('bf',8)),
    '${req.body.depto}',
    '${req.body.estado}',
    '${req.body.usucre}',
    '${req.body.feccre}',
    '${req.body.usumod}',
    '${req.body.fecmod}'
) returning *`;

  console.log(text1);

  pool.query(text1, async (err, result1) => {
    if (err) {
      throw err;
    } else {
      return res.status(200).json(result1.rows);
    }
  });
};

const editarUsuario = async (req, res) => {
  text1 = `UPDATE public.usuarios
	SET  
  ci='${req.body.ci}', 
  nombres='${req.body.nombres}', 
  ap_pat='${req.body.ap_pat}', 
  ap_mat='${req.body.ap_mat}', 
  celular='${req.body.celular}', 
  id_rol='${req.body.id_rol}', 
  login='${req.body.login}', 
  depto='${req.body.depto}',  
  usumod='${req.body.usumod}', 
  fecmod='${req.body.fecmod}'
	WHERE id_usuario='${req.params.id}' 
  returning *`;
  pool.query(text1, async (err, result1) => {
    if (err) {
      throw err;
    } else {
      return res.status(200).json(result1.rows);
    }
  });
};

const ModEstado = async (req, res) => {
  text1 = `UPDATE public.usuarios
	SET  
  estado='${req.body.estado}' 
	WHERE id_usuario='${req.params.id}' 
  returning *`;
  pool.query(text1, async (err, result1) => {
    if (err) {
      throw err;
    } else {
      return res.status(200).json(result1.rows);
    }
  });
};
/*const cambiarEstadoUsuario = async (req, res) => {
  console.log("id para el estado: ", req.params.id);

  text1 = `UPDATE usuarios
	SET estado='${req.body.estado}'	WHERE id_usuario='${req.params.id}'`;
  pool.query(text1, async (err, result1) => {
    if (err) {
      throw err;
    } else {
      return res.status(200).json(result1.rows);
    }
  });
};*/

const datoEmpresa = async (req, res) => {
  const text = `select 
    case when id_directorio is null then id_usuario else id_directorio end as id_directorio,
    case when razon_social is null then su.nombre else razon_social end as razon_social, 
    case when ed.nit is null then su.nit else ed.nit end as nit, 
    rotulo_comercial, 
    case when ed.departamento is null then su.departamento else ed.departamento end as departamento, 
    ciudad, 
    case when ed.zona is null then su.zona else ed.zona end as zona, 
    case when ed.calle is null then su.calle else ed.calle end as calle,  
    case when ed.numero is null then su.numero else ed.numero end as numero,   
    entre_calles, edificio, piso, numero_oficina, 
    case when ed.telefono is null then su.telefono else ed.telefono end as telefono,   
    fax, email, pagina, actividad_principal, tipo_sector, otro from seg_usuario su 
    left join enc_directorio ed on su.login = ed.nit::text
    where su.login ='${req.params.codigo}'`;
  pool.query(text, async (err, result) => {
    if (err) {
      throw err;
    } else {
      return res.status(200).json(result.rows);
    }
  });
};

const datoGastos = async (req, res) => {
  const text = `select * from enc_registro where id_directorio=${req.params.id} and gestion=${req.params.gestion}`;
  pool.query(text, async (err, result) => {
    if (err) {
      throw err;
    } else {
      return res.status(200).json(result.rows);
    }
  });
};

const listaDirectorio = async (req, res) => {
  const text = `select 
    case when ed.id_directorio is null then id_usuario else ed.id_directorio end as id_directorio, 
        case when razon_social is null then su.nombre else razon_social end as razon_social, 
        case when ed.nit is null then su.nit else ed.nit end as nit,
        er.informante,er.cargo,
        case when er.estado is null then 'INICIAL' else er.estado end as estado
    from seg_usuario su 
    left join enc_directorio ed on ed.id_directorio=su.id_usuario
    left join enc_registro er on er.id_directorio=su.id_usuario and gestion=${req.params.gestion}
    where id_rol=1 order by estado`;
  pool.query(text, async (err, result) => {
    if (err) {
      throw err;
    } else {
      return res.status(200).json(result.rows);
    }
  });
};

const updateEmpresa = async (req, res) => {
  let text;
  let text1;
  text = `select count(*) from enc_directorio where nit='${req.body.nit}'`;
  pool.query(text, async (err, result) => {
    if (err) {
      throw err;
    } else {
      if (result.rows[0].count == 0) {
        text1 = `INSERT INTO public.enc_directorio(id_directorio,razon_social, nit, rotulo_comercial, departamento, ciudad, zona, calle, numero, entre_calles, edificio, piso, 
                    numero_oficina, telefono, fax, email, pagina, actividad_principal, tipo_sector, otro, usucre)
                    VALUES (${req.body.id_directorio},'${
          req.body.razon_social
        }','${req.body.nit}','${req.body.rotulo_comercial}','${
          req.body.departamento
        }','${req.body.ciudad}','${req.body.zona}',
                    '${req.body.calle}','${req.body.numero}','${
          req.body.entre_calles
        }','${req.body.edificio}','${req.body.piso}','${
          req.body.numero_oficina
        }','${req.body.telefono}',
                    '${req.body.fax}','${req.body.email}','${
          req.body.pagina
        }','${req.body.actividad_principal}','${JSON.stringify(
          req.body.tipo_sector
        )}','${req.body.otro}','${req.body.login}') returning *`;
        console.log(text1);
        pool.query(text1, async (err, result1) => {
          if (err) {
            throw err;
          } else {
            return res.status(200).json(result1.rows);
          }
        });
      } else {
        text1 = `UPDATE public.enc_directorio SET  
                    rotulo_comercial='${req.body.rotulo_comercial}', 
                    departamento='${req.body.departamento}', 
                    ciudad='${req.body.ciudad}', 
                    zona='${req.body.zona}', 
                    calle='${req.body.calle}', 
                    numero='${req.body.numero}', 
                    entre_calles='${req.body.entre_calles}', 
                    edificio='${req.body.edificio}', 
                    piso='${req.body.piso}', 
                    numero_oficina='${req.body.numero_oficina}', 
                    telefono='${req.body.telefono}', 
                    fax='${req.body.fax}', 
                    email='${req.body.email}', 
                    pagina='${req.body.pagina}', 
                    actividad_principal='${req.body.actividad_principal}', 
                    tipo_sector='${JSON.stringify(req.body.tipo_sector)}', 
                    otro='${req.body.otro}', 
                    usumod='${req.body.login}', 
                    fecmod=now()
                WHERE nit='${req.body.nit}' returning *`;
        pool.query(text1, async (err, result1) => {
          if (err) {
            throw err;
          } else {
            return res.status(200).json(result1.rows);
          }
        });
      }
    }
  });
};

const updateGastos = async (req, res) => {
  let text;
  let text1;
  text = `select count(*) from enc_registro where id_directorio=${req.body.id_directorio} and gestion=${req.body.gestion} and estado='ELABORADO'`;
  pool.query(text, async (err, result) => {
    if (err) {
      throw err;
    } else {
      if (result.rows[0].count == 0) {
        text1 = `INSERT INTO public.enc_registro(id_directorio, informante, cargo, gestion, datos, estado, usucre, feccre)
                VALUES (${req.body.id_directorio},'${req.body.informante}','${
          req.body.cargo
        }',${req.body.gestion},'${JSON.stringify(req.body.datos)}','${
          req.body.estado
        }','${req.body.usuario}',NOW()) returning *`;
        pool.query(text1, async (err, result1) => {
          if (err) {
            throw err;
          } else {
            return res.status(200).json(result1.rows);
          }
        });
      } else {
        text1 = `UPDATE public.enc_registro SET 
                informante='${req.body.informante}', 
                cargo='${req.body.cargo}', 
                datos='${JSON.stringify(req.body.datos)}', 
                estado='${req.body.estado}', 
                usumod='${req.body.usuario}', 
                fecmod=now()
                WHERE id_directorio=${req.body.id_directorio} and gestion=${
          req.body.gestion
        }
                returning *`;
        pool.query(text1, async (err, result1) => {
          if (err) {
            throw err;
          } else {
            return res.status(200).json(result1.rows);
          }
        });
      }
    }
  });
};

const obtenerPostulantes = async (req, res) => {
  const text = `select * from postulantes where id_postulante='${req.params.id}'`;
  pool.query(text, async (err, result) => {
    if (err) {
      throw err;
    } else {
      return res.status(200).json(result.rows);
    }
  });
};

const obtenerEscuelas = async (req, res) => {
  try{
    const text = `SELECT * FROM public.escuelas where id_escuela='${req.params.id}'`;
    pool.query(text, async (err, result) => {
      if (err) {
        throw err;
      } else {
        return res.status(200).json(result.rows);
      }
    });
  }
  catch(error){
    console.log('ocurrio un error', error);
  }
}; 

const obtenerEscuelasDep = async (req, res) => {
  const text = `SELECT e.*
  FROM departamentos d
  INNER JOIN escuelas e ON d.departamento = e.departamento where d.id_depto='${req.params.id}'`;
  pool.query(text, async (err, result) => {
    if (err) {
      throw err;
    } else {
      return res.status(200).json(result.rows);
    }
  });
};

const crearEscuela = async (req, res) => {

  let text1 = `INSERT INTO escuelas(
	nombre, descripcion, estado, departamento)
  VALUES ('${req.body.nombre}',
    '${req.body.descripcion}',
    '${req.body.estado}',
    '${req.body.departamento}'
) returning id_escuela`;

  pool.query(text1, async (err, result1) => {
    if (err) {
      throw err;
    } else {
      return res.status(200).json(result1.rows);
    }
  });
};

const updateEscuela = async (req, res) => {
  text1 = `UPDATE public.escuelas
	SET  
  nombre='${req.body.nombre}', 
  descripcion='${req.body.descripcion}', 
  estado='${req.body.estado}', 
  departamento='${req.body.departamento}'
	WHERE id_escuela='${req.body.id_escuela}' 
  returning *`;

  pool.query(text1, async (err, result1) => {
    if (err) {
      throw err;
    } else {
      return res.status(200).json(result1.rows);
    }
  });
};

const listarCentro = async (req, res) => {
  const text = `SELECT * FROM centros_medicos ORDER BY id_centro`;
  pool.query(text, async (err, result) => {
    if (err) {
      throw err;
    } else {
      return res.status(200).json(result.rows);
    }
  });
};

const crearCentro = async (req, res) => {
  let text1 = `INSERT INTO public.centros_medicos(
	nombre, direccion, tipo, depto, descripcion, med_resp)
  VALUES ('${req.body.nombre}',
    '${req.body.direccion}',
    '${req.body.tipo}',
    '${req.body.depto}',
    '${req.body.descripcion}',
    '${req.body.med_resp}'
) returning id_centro`;
 // console.log(text1);
  pool.query(text1, async (err, result1) => {
    if (err) {
      throw err;
    } else {
      return res.status(200).json(result1.rows);
    }
  });
};

const obtenerCentrosId = async (req, res) => {
  const text = `SELECT * FROM centros_medicos where id_centro='${req.params.id}'`;
  pool.query(text, async (err, result) => {
    if (err) {
      throw err;
    } else {
      return res.status(200).json(result.rows);
    }
  });
};

const obtenerCentrosDep = async (req, res) => {
  const text = `SELECT c.*
FROM departamentos d
INNER JOIN centros_medicos c ON d.departamento = c.depto WHERE d.id_depto='${req.params.id}' AND c.tipo='${req.params.tipo}'`;
  pool.query(text, async (err, result) => {
    if (err) {
      throw err;
    } else {
      return res.status(200).json(result.rows);
    }
  });
};

const obtenerMedResp = async (req, res) => {
  const text = `SELECT c.*
FROM departamentos d
INNER JOIN centros_medicos c ON d.departamento = c.depto WHERE d.id_depto='${req.params.id}' AND c.tipo='${req.params.tipo}'`;
  pool.query(text, async (err, result) => {
    if (err) {
      throw err;
    } else {
      return res.status(200).json(result.rows);
    }
  });
};

const updateCentro = async (req, res) => {
  text1 = `UPDATE public.centros_medicos
	SET  
  nombre='${req.body.nombre}', 
  direccion='${req.body.direccion}', 
  descripcion='${req.body.descripcion}', 
  tipo='${req.body.tipo}', 
  depto='${req.body.depto}', 
  med_resp='${req.body.med_resp}',
  estado='${req.body.estado}'
	WHERE id_centro='${req.body.id_centro}' 
  returning *`;
  console.log('ver upd ->', text1);
  pool.query(text1, async (err, result1) => {
    if (err) {
      throw err;
    } else {
      return res.status(200).json(result1.rows);
    }
  });
};

const ModEstadoCentro = async (req, res) => {
  text1 = `UPDATE public.centros_medicos
	SET  
  estado='${req.body.estado}' 
	WHERE id_centro='${req.params.id}' 
  returning *`;
  pool.query(text1, async (err, result1) => {
    if (err) {
      throw err;
    } else {
      return res.status(200).json(result1.rows);
    }
  });
};

const ModEstadoEscuela = async (req, res) => {
  text1 = `UPDATE public.escuelas
	SET  
  estado='${req.body.estado}' 
	WHERE id_escuela='${req.params.id}' 
  returning *`;
  console.log(text1);
  pool.query(text1, async (err, result1) => {
    if (err) {
      throw err;
    } else {
      return res.status(200).json(result1.rows);
    }
  });
};

const listarverificacion = async (req, res) => {
  const text = `SELECT DISTINCT p.cod_pros, p.cod_arc, p.id_postulante, p.ci, p.nombres, p.ap_pat, p.ap_mat, e.verificado, e.user_ver,
  CASE 
    WHEN e.estado_med = 'APTO' AND e.estado_odonto = 'APTO' THEN 'APTO'
    ELSE 'NO APTO'
  END AS estado
FROM postulantes p
LEFT JOIN examenes e ON p.id_postulante = e.id_postulante
WHERE e.estado_med != 'SIN ESTADO' AND e.estado_odonto != 'SIN ESTADO' ORDER BY p.id_postulante desc;`;

  pool.query(text, async (err, result) => {
    
    if (err) {
      throw err;
    } else {
      return res.status(200).json(result.rows);
    }
  });
};

/*const ModEstadoVerificar = async (req, res) => {
  console.log('probando--- ',estado, id);
  text1 = `UPDATE public.examenes
	SET  
  verificado='${req.params.estado}' 
	WHERE id_postulante='${req.params.id}' 
  returning *`;
  pool.query(text1, async (err, result1) => {
    console.log("ver->", result);
    if (err) {
      throw err;
    } else {
      return res.status(200).json(result1.rows);
    }
  });
};*/

const ModEstadoVerificar = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10); // Aseguramos que sea un número
    const login = req.body.user_ver;
    const estado = req.body.verificado;

    // Consulta parametrizada para evitar inyección SQL
    const text1 = `UPDATE public.examenes SET verificado = $1, user_ver = $2 WHERE id_postulante = $3 RETURNING *`;
    const values = [estado, login, id];

    // Ejecutar consulta usando async/await
    const result = await pool.query(text1, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No se encontró el registro con el ID proporcionado' });
    }

    // Responder con los datos actualizados
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error en ModEstadoVerificar:', error.message);
    return res.status(500).json({ error: 'Ocurrió un error al actualizar el estado' });
  }
};


const verificararchivador = async (req, res) => {
  const id = req.params.archi;
  const text = `
    SELECT COUNT(*) as count FROM postulantes WHERE cod_arc = '${id}'
  `;
  pool.query(text, async (err, result) => {
    if (err) {
      throw err;
    } else {
      const count = parseInt(result.rows[0].count, 10);
      
      console.log('Existencia >>>', count === 0 ? 'No existe' : 'Existe');
      // Devuelvo directamente el valor booleano
      return res.json({ exists: count === 0 });
      
    }
  });
};

const verificarcarnetpostulante = async (req, res) => {
  const id = req.params.carnet;
  const text = `
    SELECT COUNT(*) as count FROM postulantes WHERE ci = '${id}'
  `;
  pool.query(text, async (err, result) => {
    if (err) {
      throw err;
    } else {
      const count = parseInt(result.rows[0].count, 10);
      
      console.log('Existencia >>>', count === 0 ? 'No existe' : 'Existe');
      // Devuelvo directamente el valor booleano
      return res.json({ exists: count === 0 });
      
    }
  });
};

const verificarbaucher = async (req, res) => {
  const id = req.params.boucher;
  const text = `
    SELECT COUNT(*) as count FROM postulantes WHERE cod_boucher = '${id}'
  `;
  pool.query(text, async (err, result) => {
    if (err) {
      throw err;
    } else {
      const count = parseInt(result.rows[0].count, 10);
      
      console.log('Existencia >>>', count === 0 ? 'No existe' : 'Existe');
      // Devuelvo directamente el valor booleano
      return res.json({ exists: count === 0 });
      
    }
  });
};

/*const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

router.put('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Verificar contraseña actual
    const user = await User.findByPk(req.user.id);
    if (!await bcrypt.compare(currentPassword, user.password)) {
      return res.status(400).json({ error: 'Contraseña actual incorrecta' });
    }
    
    // Actualizar contraseña
    await user.update({ password: newPassword });
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al cambiar la contraseña' });
  }
});*/

const addaccess = async (req, res) => {
  try {
    let text1 = `INSERT INTO public.access_log(
	login, fecha_ing, hora_ing, localizacion)
  VALUES (
'${req.body.login}',
'${req.body.fecha_ing}',
'${req.body.hora_ing}',
'${req.body.localizacion}'
) returning *`;
    console.log(text1);
    pool.query(text1, async (err, result1) => {
      if (err) {
        throw err;
      } else {
        console.log(result1.rows);
        return res.status(200).json(result1.rows);
          }
        });
  } catch (error) {
    console.log('error al guardar los datos: ', error)
  } 
};

module.exports = {
  reporte,

  total,
  totalDeptoAprobado,
  totalDeptoReprobado,

  total2,
  totalDeptoAprobado2,
  totalDeptoReprobado2,

  listar,
  listarPostulante,
  crearPostulante,

  listarDeptos,
  listarRoles,

  listarEscuelas,
  updatePostulante,
  obtenerPostulantes,

  listarUsuarios,
  crearUsuario,
  editarUsuario,
  obtenerUsuarios,
  ModEstado,

  datoEmpresa,
  datoGastos,
  listaDirectorio,
  updateEmpresa,
  updateGastos,

  listarEscuela,
  obtenerEscuelas,
  crearEscuela,
  updateEscuela,
  ModEstadoEscuela,

  obtenerCentros,
  listarCentro,
  crearCentro,
  obtenerCentrosId,
  updateCentro,
  ModEstadoCentro,

  updateExamenVmedico,
  updateExamenVpsico,
  updateExamenVodonto,

  listarverificacion,
  ModEstadoVerificar,

  verificarcarnet,
  verificararchivador,
  verificarcarnetpostulante,
  verificarbaucher,

  addaccess,
  obtenerEscuelasDep,
  obtenerCentrosDep,
  obtenerMedResp,
  reportemed,
  inscritos
};
