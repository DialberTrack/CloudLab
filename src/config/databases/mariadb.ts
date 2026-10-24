import mysql from 'mysql2/promise';
import { env } from '../env.js';

const pool = mysql.createPool({
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

try {
    const connection = await pool.getConnection();
    console.log('Conexión a la base de datos MariaDB establecida correctamente.');
    connection.release();
} catch (error) {
    console.error('❌ Error al conectar a la base de datos MariaDB:', error);
    process.exit(1);
}

export default pool;
