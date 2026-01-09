/**
 * Generate a unique client code
 * Format: CLI-YYYYMMDD-XXXX
 * @returns {string} - Unique client code
 */
const generateClientCode = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `CLI-${year}${month}${day}-${random}`;
};

/**
 * Generate a unique maintenance code
 * Format: MNT-YYYYMMDD-XXXX
 * @returns {string} - Unique maintenance code
 */
const generateMaintenanceCode = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `MNT-${year}${month}${day}-${random}`;
};

/**
 * Generate a unique worker code
 * Format: TEC-XXXX
 * @returns {string} - Unique worker code
 */
const generateWorkerCode = () => {
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TEC-${random}`;
};

/**
 * Generate a unique equipment code
 * Format: EQP-YYYYMMDD-XXXX
 * @returns {string} - Unique equipment code
 */
const generateEquipmentCode = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `EQP-${year}${month}${day}-${random}`;
};

module.exports = {
  generateClientCode,
  generateMaintenanceCode,
  generateWorkerCode,
  generateEquipmentCode
};
