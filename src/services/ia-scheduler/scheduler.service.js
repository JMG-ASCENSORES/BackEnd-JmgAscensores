/**
 * SchedulerService — orquestador de motor + LLM.
 *
 * Recibe un trabajo individual, lo enriquece, evalúa con el motor determinista,
 * y pasa el resultado por el LLM para validación y justificaciones.
 */
class SchedulerService {
  /**
   * @param {DemandService} demandService
   * @param {WorkerService} workerService
   * @param {MotorService} motorService
   * @param {LLMService} llmService
   */
  constructor(demandService, workerService, motorService, llmService) {
    this.demandService = demandService;
    this.workerService = workerService;
    this.motorService = motorService;
    this.llmService = llmService;
  }

  /**
   * Genera una sugerencia completa para un trabajo individual.
   *
   * Flujo:
   *   1. Enriquece el trabajo con datos del equipo/cliente/config
   *   2. Obtiene los técnicos con su carga del día
   *   3. Evalúa con el motor determinista
   *   4. Valida y enriquece con el LLM (fallback al motor si falla)
   *
   * @param {string} fecha — 'YYYY-MM-DD'
   * @param {object} trabajoInput — { cliente_id, ascensor_id, tipo_trabajo, hora_preferida }
   * @param {number[]} tecnicoIds — IDs de técnicos a evaluar
   * @param {string|null} instruccionAdmin — instrucción opcional del admin
   * @returns {object} — evaluación completa con origen 'llm' o 'motor_fallback'
   */
  async generarSugerencia(fecha, trabajoInput, tecnicoIds, instruccionAdmin = null) {
    // 1. Enriquecer el trabajo
    const trabajo = await this.demandService.enriquecerTrabajo(trabajoInput);

    // 2. Obtener técnicos con agenda del día
    const tecnicos = await this.workerService.obtenerTecnicos(tecnicoIds, fecha);

    // 3. Motor: evaluar elegibilidad y calcular slots
    const resultadoMotor = this.motorService.evaluarTecnicos(trabajo, tecnicos);

    const evaluacionMotor = {
      fecha,
      generado_en: new Date().toISOString(),
      origen: 'motor',
      trabajo,
      ...resultadoMotor,
    };

    // 4. LLM: validar, justificar, reordenar (fallback al motor si falla)
    const { ok, evaluacion } = await this.llmService.validarYJustificar(
      evaluacionMotor,
      instruccionAdmin
    );

    return evaluacion;
  }
}

module.exports = { SchedulerService };
