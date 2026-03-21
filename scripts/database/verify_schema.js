const { createInformeSchema } = require('./src/validators/informes.validator');

const testData = {
  descripcion_trabajo: 'Test de validación sin orden_id',
  tipo_informe: 'Técnico',
  fecha_informe: '2026-03-21',
  hora_informe: '12:00',
  cliente_id: 1,
  ascensor_id: 1,
  trabajador_id: 1
  // orden_id is missing
};

const { error, value } = createInformeSchema.validate(testData);

if (error) {
  console.error('Validation Failed:', error.details);
  process.exit(1);
} else {
  console.log('Validation Success!');
  console.log('Validated Value:', value);
  process.exit(0);
}
