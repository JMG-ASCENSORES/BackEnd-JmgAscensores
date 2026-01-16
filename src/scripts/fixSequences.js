const { sequelize } = require('../config/database');
const { Trabajador } = require('../models');

const fixSequences = async () => {
  try {
    console.log('Starting sequence fix...');
    
    // Check if we are connected
    await sequelize.authenticate();
    console.log('Database connected.');

    // Fix Trabajadores sequence
    // Get the max ID
    const maxIdResult = await Trabajador.max('trabajador_id');
    const maxId = maxIdResult || 0;
    
    console.log(`Max Trabajador ID is: ${maxId}`);
    
    // Reset sequence
    // The sequence name is typically "TableName_column_seq" in quotes
    // For sequelize define 'Trabajador' mapped to table 'Trabajadores'
    // Sequence usually: "Trabajadores_trabajador_id_seq"
    
    const query = `SELECT setval(pg_get_serial_sequence('"Trabajadores"', 'trabajador_id'), ${maxId + 1}, false);`;
    
    console.log(`Executing: ${query}`);
    await sequelize.query(query);

    console.log('Sequence fixed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing sequence:', error);
    process.exit(1);
  }
};

fixSequences();
