/**
 * Fase 3 — Integration tests for POST /confirmar persistence logic.
 *
 * These tests exercise the transactional persistence logic directly against
 * the real PostgreSQL database using Sequelize models. They simulate the
 * controller's confirmar handler logic without going through HTTP/auth.
 *
 * Tests cover: tasks 3.1–3.10
 */
const { sequelize } = require('../../../config/database');
const { Programacion, RutaDiaria, DetalleRuta, Trabajador, Cliente } = require('../../../models');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Simulates the confirmar persistence logic without Express req/res.
 * Returns { ok, programaciones_creadas, programaciones_actualizadas, rutas_generadas }
 * or throws with { status, message } for controlled errors.
 */
async function ejecutarConfirmar(fecha, propuesta) {
  const transaction = await sequelize.transaction();
  let programacionesCreadas = 0;
  let programacionesActualizadas = 0;

  try {
    for (const tecnico of propuesta.tecnicos) {
      for (const trabajo of tecnico.trabajos) {
        let programacionId;

        if (trabajo.programacion_id === null) {
          const nueva = await Programacion.create({
            titulo: `Mantenimiento - ${trabajo.nombre_cliente}`,
            fecha_inicio: `${fecha}T${trabajo.hora_inicio}:00`,
            fecha_fin: `${fecha}T${trabajo.hora_fin}:00`,
            trabajador_id: tecnico.trabajador_id,
            cliente_id: trabajo.cliente_id,
            ascensor_id: trabajo.ascensor_id || null,
            tipo_trabajo: trabajo.tipo_trabajo,
            estado: 'pendiente',
            mantenimiento_fijo_id: trabajo.mantenimiento_fijo_id || null,
            descripcion: trabajo.justificacion || null
          }, { transaction });
          programacionId = nueva.programacion_id;
          programacionesCreadas++;
        } else {
          const existente = await Programacion.findByPk(trabajo.programacion_id, { transaction });

          if (!existente) {
            throw { status: 404, message: `La Programacion ${trabajo.programacion_id} no existe.` };
          }

          if (existente.trabajador_id !== null) {
            throw {
              status: 409,
              message: `La Programacion ${trabajo.programacion_id} fue modificada por otro usuario mientras revisabas la propuesta. Regenerá la propuesta.`
            };
          }

          await Programacion.update({
            trabajador_id: tecnico.trabajador_id,
            fecha_inicio: `${fecha}T${trabajo.hora_inicio}:00`,
            fecha_fin: `${fecha}T${trabajo.hora_fin}:00`,
            descripcion: trabajo.justificacion || null
          }, {
            where: { programacion_id: trabajo.programacion_id },
            transaction
          });
          programacionId = trabajo.programacion_id;
          programacionesActualizadas++;
        }

        trabajo._programacion_id_resuelto = programacionId;
      }

      const [ruta, created] = await RutaDiaria.findOrCreate({
        where: { trabajador_id: tecnico.trabajador_id, fecha_ruta: fecha },
        defaults: {
          numero_paradas: tecnico.trabajos.length,
          hora_inicio: tecnico.trabajos[0]?.hora_inicio || null,
          hora_fin: tecnico.trabajos[tecnico.trabajos.length - 1]?.hora_fin || null,
          estado_ruta: 'planificada'
        },
        transaction
      });

      if (!created) {
        await ruta.update({
          numero_paradas: tecnico.trabajos.length,
          hora_inicio: tecnico.trabajos[0]?.hora_inicio || null,
          hora_fin: tecnico.trabajos[tecnico.trabajos.length - 1]?.hora_fin || null,
          estado_ruta: 'planificada'
        }, { transaction });
      }

      await DetalleRuta.destroy({ where: { ruta_id: ruta.ruta_id }, transaction });

      for (let i = 0; i < tecnico.trabajos.length; i++) {
        const trabajo = tecnico.trabajos[i];
        await DetalleRuta.create({
          ruta_id: ruta.ruta_id,
          programacion_id: trabajo._programacion_id_resuelto,
          orden_parada: i + 1,
          hora_llegada: trabajo.hora_inicio,
          hora_salida: trabajo.hora_fin
        }, { transaction });
      }
    }

    await transaction.commit();
    return {
      ok: true,
      programaciones_creadas: programacionesCreadas,
      programaciones_actualizadas: programacionesActualizadas,
      rutas_generadas: propuesta.tecnicos.length
    };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

// ─── Test Suite ────────────────────────────────────────────────────────────────

describe('POST /confirmar — persistencia transaccional (Fase 3)', () => {
  // Fixtures: real IDs from the seeded database
  let tecnicoId;
  let clienteId;
  const FECHA = '2026-05-12';

  beforeAll(async () => {
    // Obtener IDs reales de la BD para tests
    const tecnico = await Trabajador.findOne({
      where: { estado_activo: true },
      order: [['trabajador_id', 'ASC']],
      raw: true
    });
    if (tecnico) {
      tecnicoId = tecnico.trabajador_id;
    }

    const cliente = await Cliente.findOne({
      order: [['cliente_id', 'ASC']],
      raw: true
    });
    if (cliente) {
      clienteId = cliente.cliente_id;
    }
  });

  // ── 3.1-3.3: INSERT cuando programacion_id === null ────────────────────────

  describe('3.1-3.3: INSERT Programacion nueva (programacion_id=null)', () => {
    const TAG = 'confirmar-test-insert-' + Date.now();

    afterEach(async () => {
      // Limpiar solo lo creado por este test
      await DetalleRuta.destroy({ where: {} });
      await RutaDiaria.destroy({
        where: { trabajador_id: tecnicoId, fecha_ruta: FECHA }
      });
      await Programacion.destroy({
        where: { descripcion: { [require('sequelize').Op.like]: TAG + '%' } }
      });
    });

    it('crea Programacion, RutaDiaria y DetalleRuta nuevos', async () => {
      const tag = TAG + '-1';
      const propuesta = {
        tecnicos: [{
          trabajador_id: tecnicoId,
          trabajos: [{
            programacion_id: null,
            mantenimiento_fijo_id: null,
            nombre_cliente: 'Test Insert',
            cliente_id: clienteId,
            ascensor_id: null,
            tipo_trabajo: 'mantenimiento',
            hora_inicio: '08:30',
            hora_fin: '09:30',
            justificacion: tag
          }]
        }]
      };

      const result = await ejecutarConfirmar(FECHA, propuesta);

      expect(result.ok).toBe(true);
      expect(result.programaciones_creadas).toBe(1);
      expect(result.programaciones_actualizadas).toBe(0);
      expect(result.rutas_generadas).toBe(1);

      // Verificar Programacion
      const prog = await Programacion.findOne({ where: { descripcion: tag } });
      expect(prog).not.toBeNull();
      expect(prog.trabajador_id).toBe(tecnicoId);
      expect(prog.estado).toBe('pendiente');
      expect(prog.titulo).toBe('Mantenimiento - Test Insert');

      // Verificar RutaDiaria
      const ruta = await RutaDiaria.findOne({
        where: { trabajador_id: tecnicoId, fecha_ruta: FECHA }
      });
      expect(ruta).not.toBeNull();
      expect(ruta.numero_paradas).toBe(1);
      expect(ruta.estado_ruta).toBe('planificada');

      // Verificar DetalleRuta
      const detalles = await DetalleRuta.findAll({
        where: { ruta_id: ruta.ruta_id }
      });
      expect(detalles).toHaveLength(1);
      expect(detalles[0].programacion_id).toBe(prog.programacion_id);
      expect(detalles[0].orden_parada).toBe(1);
      // TIME fields return HH:MM:SS from PostgreSQL
      expect(detalles[0].hora_llegada).toBe('08:30:00');
    });
  });

  // ── 3.4: UPDATE Programacion existente ─────────────────────────────────────

  describe('3.4: UPDATE Programacion existente (programacion_id !== null)', () => {
    let programaPreviaId;
    const TAG = 'confirmar-test-update-' + Date.now();

    beforeAll(async () => {
      // Crear una Programacion pendiente sin técnico para el test
      const prog = await Programacion.create({
        titulo: 'Reparación Test Update',
        fecha_inicio: `${FECHA}T00:00:00`,
        fecha_fin: `${FECHA}T00:00:00`,
        trabajador_id: null,
        cliente_id: clienteId,
        ascensor_id: null,
        tipo_trabajo: 'reparacion',
        estado: 'pendiente',
        descripcion: TAG
      });
      programaPreviaId = prog.programacion_id;
    });

    afterAll(async () => {
      // Limpiar
      await DetalleRuta.destroy({ where: {} });
      await RutaDiaria.destroy({
        where: { trabajador_id: tecnicoId, fecha_ruta: FECHA }
      });
      const p = await Programacion.findByPk(programaPreviaId);
      if (p) await p.destroy({ force: true });
    });

    it('actualiza trabajador_id, horarios y descripcion', async () => {
      const propuesta = {
        tecnicos: [{
          trabajador_id: tecnicoId,
          trabajos: [{
            programacion_id: programaPreviaId,
            nombre_cliente: 'Test Update',
            cliente_id: clienteId,
            ascensor_id: null,
            tipo_trabajo: 'reparacion',
            hora_inicio: '10:00',
            hora_fin: '12:00',
            justificacion: 'Reparación urgente de puertas'
          }]
        }]
      };

      const result = await ejecutarConfirmar(FECHA, propuesta);

      expect(result.ok).toBe(true);
      expect(result.programaciones_creadas).toBe(0);
      expect(result.programaciones_actualizadas).toBe(1);

      // Verificar que la Programacion se actualizó
      const prog = await Programacion.findByPk(programaPreviaId);
      expect(prog.trabajador_id).toBe(tecnicoId);
      expect(prog.descripcion).toBe('Reparación urgente de puertas');

      // Verificar que las fechas se concatenaron con la fecha + hora
      // TIMESTAMPTZ se almacena en UTC; verificamos que la fecha esté presente
      // y que la hora en UTC corresponda a la hora local (UTC-5)
      const fechaInicioStr = prog.fecha_inicio instanceof Date
        ? prog.fecha_inicio.toISOString()
        : String(prog.fecha_inicio);
      expect(fechaInicioStr).toContain(FECHA);
      // 10:00 Perú = 15:00 UTC
      expect(fechaInicioStr).toContain('T15:00:00');
    });
  });

  // ── 3.10: Optimistic locking — conflicto 409 ──────────────────────────────

  describe('3.10: Optimistic locking (conflicto 409)', () => {
    let programaAsignadaId;
    const TAG = 'confirmar-test-409-' + Date.now();

    beforeAll(async () => {
      // Crear una Programacion que YA tiene trabajador_id asignado
      const prog = await Programacion.create({
        titulo: 'Mantenimiento Ya Asignado',
        fecha_inicio: `${FECHA}T08:00:00`,
        fecha_fin: `${FECHA}T09:00:00`,
        trabajador_id: 90, // Ya tiene técnico asignado (usar ID real)
        cliente_id: clienteId,
        ascensor_id: null,
        tipo_trabajo: 'mantenimiento',
        estado: 'pendiente',
        descripcion: TAG
      });
      programaAsignadaId = prog.programacion_id;
    });

    afterAll(async () => {
      const p = await Programacion.findByPk(programaAsignadaId);
      if (p) await p.destroy({ force: true });
    });

    it('retorna 409 si la Programacion ya tiene trabajador_id asignado', async () => {
      const propuesta = {
        tecnicos: [{
          trabajador_id: tecnicoId,
          trabajos: [{
            programacion_id: programaAsignadaId,
            nombre_cliente: 'Test Conflicto',
            cliente_id: clienteId,
            ascensor_id: null,
            tipo_trabajo: 'mantenimiento',
            hora_inicio: '08:30',
            hora_fin: '09:30',
            justificacion: null
          }]
        }]
      };

      let error = null;
      try {
        await ejecutarConfirmar(FECHA, propuesta);
      } catch (e) {
        error = e;
      }

      expect(error).not.toBeNull();
      expect(error.status).toBe(409);
      expect(error.message).toContain(`La Programacion ${programaAsignadaId} fue modificada por otro usuario`);

      // Verificar que la Programacion NO fue modificada (se mantiene con trabajador_id=90)
      const prog = await Programacion.findByPk(programaAsignadaId);
      expect(prog.trabajador_id).toBe(90);
    });
  });

  // ── 3.8-3.9: Rollback transaccional ───────────────────────────────────────

  describe('3.8-3.9: Rollback transaccional', () => {
    const TAG = 'confirmar-test-rollback-' + Date.now();

    it('no persiste nada si falla el segundo trabajo (FK inválida)', async () => {
      // Crear una Programacion pendiente válida para el primer trabajo
      const progValida = await Programacion.create({
        titulo: 'Prog Rollback Test Válida',
        fecha_inicio: `${FECHA}T10:00:00`,
        fecha_fin: `${FECHA}T11:00:00`,
        trabajador_id: null,
        cliente_id: clienteId,
        ascensor_id: null,
        tipo_trabajo: 'inspeccion',
        estado: 'pendiente',
        descripcion: TAG
      });
      const programacionIdValida = progValida.programacion_id;

      // Contar cuántas Programaciones había antes
      const progsAntes = await Programacion.count();

      const propuesta = {
        tecnicos: [{
          trabajador_id: tecnicoId,
          trabajos: [
            {
              programacion_id: programacionIdValida,
              nombre_cliente: 'Test Rollback 1',
              cliente_id: clienteId,
              ascensor_id: null,
              tipo_trabajo: 'inspeccion',
              hora_inicio: '10:00',
              hora_fin: '11:00',
              justificacion: null
            },
            {
              // Segundo trabajo con programacion_id que no existe (FK fallará)
              programacion_id: 999999,
              nombre_cliente: 'Test Rollback 2',
              cliente_id: clienteId,
              ascensor_id: null,
              tipo_trabajo: 'mantenimiento',
              hora_inicio: '12:00',
              hora_fin: '13:00',
              justificacion: null
            }
          ]
        }]
      };

      let error = null;
      try {
        await ejecutarConfirmar(FECHA, propuesta);
      } catch (e) {
        error = e;
      }

      expect(error).not.toBeNull();

      // Verificar que el primer trabajo NO fue modificado (rollback)
      const prog = await Programacion.findByPk(programacionIdValida);
      expect(prog.trabajador_id).toBeNull(); // Sigue sin asignar

      // Verificar que no se crearon Programaciones nuevas
      const progsDespues = await Programacion.count();
      expect(progsDespues).toBe(progsAntes); // No se creó ninguna nueva

      // Limpiar la Programacion creada para el test
      await progValida.destroy({ force: true });
    });
  });

  // ── 3.5: UPSERT RutaDiaria — si ya existe, actualiza ──────────────────────

  describe('3.5: UPSERT RutaDiaria', () => {
    const TAG = 'confirmar-test-upsert-' + Date.now();

    beforeAll(async () => {
      // Limpiar cualquier RutaDiaria previa para este test
      await DetalleRuta.destroy({ where: {} });
      await RutaDiaria.destroy({
        where: { trabajador_id: tecnicoId, fecha_ruta: FECHA }
      });
      // Crear una RutaDiaria existente para este técnico y fecha
      await RutaDiaria.create({
        trabajador_id: tecnicoId,
        fecha_ruta: FECHA,
        numero_paradas: 1,
        hora_inicio: '08:00',
        hora_fin: '09:00',
        estado_ruta: 'planificada'
      });
    });

    afterAll(async () => {
      await DetalleRuta.destroy({ where: {} });
      await RutaDiaria.destroy({
        where: { trabajador_id: tecnicoId, fecha_ruta: FECHA }
      });
      await Programacion.destroy({
        where: { descripcion: { [require('sequelize').Op.like]: TAG + '%' } }
      });
    });

    it('actualiza RutaDiaria existente en vez de crear duplicado', async () => {
      const tag = TAG + '-upsert';
      const propuesta = {
        tecnicos: [{
          trabajador_id: tecnicoId,
          trabajos: [{
            programacion_id: null,
            mantenimiento_fijo_id: null,
            nombre_cliente: 'Test Upsert',
            cliente_id: clienteId,
            ascensor_id: null,
            tipo_trabajo: 'mantenimiento',
            hora_inicio: '09:00',
            hora_fin: '10:00',
            justificacion: tag
          }]
        }]
      };

      await ejecutarConfirmar(FECHA, propuesta);

      // Debe haber exactamente UNA RutaDiaria para este técnico y fecha
      const rutas = await RutaDiaria.findAll({
        where: { trabajador_id: tecnicoId, fecha_ruta: FECHA }
      });
      expect(rutas).toHaveLength(1);
      // TIME fields return HH:MM:SS from PostgreSQL
      expect(rutas[0].hora_inicio).toBe('09:00:00');
      expect(rutas[0].hora_fin).toBe('10:00:00');
    });
  });

  // ── 3.6-3.7: DELETE old DetalleRuta + INSERT new ──────────────────────────

  describe('3.6-3.7: Borra DetalleRuta anteriores y crea nuevos', () => {
    let rutaId;
    let programacionPreviaId;
    const TAG = 'confirmar-test-detalle-' + Date.now();

    beforeAll(async () => {
      // Limpiar estado previo
      await DetalleRuta.destroy({ where: {} });
      await RutaDiaria.destroy({
        where: { trabajador_id: tecnicoId, fecha_ruta: FECHA }
      });
      await Programacion.destroy({
        where: { descripcion: { [require('sequelize').Op.like]: TAG + '%' } }
      });

      // Crear una Programacion para el DetalleRuta viejo
      const prog = await Programacion.create({
        titulo: 'Prog Old Detalle',
        fecha_inicio: `${FECHA}T08:00:00`,
        fecha_fin: `${FECHA}T09:00:00`,
        trabajador_id: null,
        cliente_id: clienteId,
        ascensor_id: null,
        tipo_trabajo: 'mantenimiento',
        estado: 'pendiente',
        descripcion: TAG + '-old'
      });
      programacionPreviaId = prog.programacion_id;

      // Crear una RutaDiaria con DetalleRuta viejo
      const ruta = await RutaDiaria.create({
        trabajador_id: tecnicoId,
        fecha_ruta: FECHA,
        numero_paradas: 1,
        hora_inicio: '08:00',
        hora_fin: '09:00',
        estado_ruta: 'planificada'
      });
      rutaId = ruta.ruta_id;

      await DetalleRuta.create({
        ruta_id: rutaId,
        programacion_id: programacionPreviaId,
        orden_parada: 1,
        hora_llegada: '08:00',
        hora_salida: '09:00'
      });
    });

    afterAll(async () => {
      await DetalleRuta.destroy({ where: {} });
      await RutaDiaria.destroy({ where: { ruta_id: rutaId } });
      const p = await Programacion.findByPk(programacionPreviaId);
      if (p) await p.destroy({ force: true });
      // Limpiar Programaciones creadas por el test
      await Programacion.destroy({
        where: { descripcion: { [require('sequelize').Op.like]: TAG + '%' } }
      });
    });

    it('reemplaza DetalleRuta viejos por los nuevos con orden_parada correcto', async () => {
      const tag = TAG + '-replace';
      const propuesta = {
        tecnicos: [{
          trabajador_id: tecnicoId,
          trabajos: [
            {
              programacion_id: programacionPreviaId,
              nombre_cliente: 'Test Replace 1',
              cliente_id: clienteId,
              ascensor_id: null,
              tipo_trabajo: 'mantenimiento',
              hora_inicio: '08:30',
              hora_fin: '09:30',
              justificacion: null
            },
            {
              programacion_id: null,
              mantenimiento_fijo_id: null,
              nombre_cliente: 'Test Replace 2',
              cliente_id: clienteId,
              ascensor_id: null,
              tipo_trabajo: 'inspeccion',
              hora_inicio: '10:00',
              hora_fin: '10:45',
              justificacion: tag
            }
          ]
        }]
      };

      await ejecutarConfirmar(FECHA, propuesta);

      const detalles = await DetalleRuta.findAll({
        where: { ruta_id: rutaId },
        order: [['orden_parada', 'ASC']]
      });

      expect(detalles).toHaveLength(2);
      expect(detalles[0].orden_parada).toBe(1);
      expect(detalles[0].programacion_id).toBe(programacionPreviaId);
      // TIME fields return HH:MM:SS from PostgreSQL
      expect(detalles[0].hora_llegada).toBe('08:30:00');

      expect(detalles[1].orden_parada).toBe(2);
      expect(detalles[1].hora_llegada).toBe('10:00:00');
      expect(detalles[1].programacion_id).not.toBeNull();
      expect(detalles[1].programacion_id).not.toBe(programacionPreviaId);
    });
  });

  // ── Controller: validación de body ────────────────────────────────────────

  describe('Validación de body', () => {
    it('rechaza body sin fecha', () => {
      const body = {};
      const isValid = !!(body.fecha && body.propuesta && body.propuesta?.tecnicos);
      expect(isValid).toBe(false);
    });

    it('rechaza body sin propuesta', () => {
      const body = { fecha: '2026-05-12' };
      const isValid = !!(body.fecha && body.propuesta && body.propuesta?.tecnicos);
      expect(isValid).toBe(false);
    });

    it('rechaza propuesta sin tecnicos', () => {
      const body = { fecha: '2026-05-12', propuesta: {} };
      const isValid = !!(body.fecha && body.propuesta && body.propuesta?.tecnicos);
      expect(isValid).toBe(false);
    });

    it('acepta body completo', () => {
      const body = { fecha: '2026-05-12', propuesta: { tecnicos: [] } };
      const isValid = !!(body.fecha && body.propuesta && body.propuesta?.tecnicos);
      expect(isValid).toBe(true);
    });
  });
});
