import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '../../config/mariadb.config.js';
import { UserNotFoundError } from '../../errors/user.error.js';
import type { CreateUserInput, User } from '../../schemas/user.schema.js';
import { ListUtils, type ListQuery } from '../../utils/list.utils.js';
import type { UserList, UserRepository } from '../user.repository.js';

type UserRow = User & RowDataPacket;

export class MariaDBUserRepository implements UserRepository {
    /**
     * Busca un usuario por UUID sin lanzar cuando no existe.
     *
     * @param id UUID del usuario.
     * @returns {Promise<User | null>} Usuario encontrado o `null`.
     * @throws {Error} Si MariaDB rechaza la consulta.
     */
    async findById(id: string): Promise<User | null> {
        const [rows] = await pool.query<UserRow[]>('SELECT * FROM users WHERE id = ?', [id]);

        return rows[0] ?? null;
    }

    /**
     * Busca un usuario por UUID y convierte la ausencia en un error de dominio.
     *
     * @param id UUID del usuario.
     * @returns {Promise<User>} Usuario encontrado.
     * @throws {UserNotFoundError} Si no existe.
     * @throws {Error} Si MariaDB rechaza la consulta.
     */
    async getById(id: string): Promise<User> {
        const user = await this.findById(id);

        if (user) {
            return user;
        }

        throw new UserNotFoundError();
    }

    /**
     * Busca un usuario por correo electronico sin lanzar cuando no existe.
     *
     * @param email Correo electronico normalizado.
     * @returns {Promise<User | null>} Usuario encontrado o `null`.
     * @throws {Error} Si MariaDB rechaza la consulta.
     */
    async findByEmail(email: string): Promise<User | null> {
        const [users] = await pool.query<UserRow[]>('SELECT * FROM users WHERE email = ?', [email]);

        return users[0] ?? null;
    }

    /**
     * Busca un usuario por correo y convierte la ausencia en un error de dominio.
     *
     * @param email Correo electronico normalizado.
     * @returns {Promise<User>} Usuario encontrado.
     * @throws {UserNotFoundError} Si no existe.
     * @throws {Error} Si MariaDB rechaza la consulta.
     */
    async getByEmail(email: string): Promise<User> {
        const user = await this.findByEmail(email);

        if (user) {
            return user;
        }

        throw new UserNotFoundError();
    }

    /**
     * Actualiza las columnas indicadas y devuelve el estado persistido.
     *
     * @param id UUID del usuario.
     * @param user Campos de usuario a actualizar.
     * @returns {Promise<User | null>} Usuario actualizado o `null` si desaparecio antes de leerlo.
     * @throws {Error} Si MariaDB rechaza la actualizacion o la consulta posterior.
     */
    async update(id: string, user: Partial<User>): Promise<User | null> {
        if (Object.keys(user).length > 0) {
            await pool.query('UPDATE users SET ? WHERE id = ?', [user, id]);
        }

        return this.findById(id);
    }

    /**
     * Lista usuarios sin incluir contrasenas y calcula la paginacion.
     *
     * @param query Pagina, limite y filtro de busqueda.
     * @returns {Promise<UserList>} Usuarios y metadatos de paginacion.
     * @throws {Error} Si MariaDB rechaza alguna consulta.
     */
    async list({ page, limit, q }: ListQuery): Promise<UserList> {
        const whereClause = q ? 'WHERE name LIKE ? OR email LIKE ?' : '';
        const searchParams = q ? [`%${q}%`, `%${q}%`] : [];
        const offset = ListUtils.getOffset({ page, limit });

        const [countResult, usersResult] = await Promise.all([
            pool.query<Array<{ total: number } & RowDataPacket>>(
                `
                SELECT COUNT(*) AS total
                    FROM users
                    ${whereClause}
                `,
                searchParams
            ),
            pool.query<UserRow[]>(
                `
                SELECT id, name, email, role, is_active, created_at, updated_at 
                    FROM users
                    ${whereClause}
                    ORDER BY name 
                    LIMIT ? 
                    OFFSET ?
                `,
                [...searchParams, limit, offset]
            ),
        ]);

        const total = Number(countResult[0][0]?.total ?? 0);
        const users = usersResult[0];

        return {
            data: users,
            pagination: ListUtils.pagination({ page, limit }, total),
        };
    }

    /**
     * Inserta un usuario y recupera la fila creada.
     *
     * @param user Datos del usuario; la contrasena debe estar hasheada previamente.
     * @returns {Promise<User>} Usuario persistido.
     * @throws {UserNotFoundError} Si la fila creada no puede recuperarse.
     * @throws {Error} Si MariaDB rechaza la insercion.
     */
    async create(user: CreateUserInput): Promise<User> {
        await pool.query('INSERT INTO users SET ?', [user]);

        return await this.getByEmail(user.email);
    }

    /**
     * Elimina un usuario por UUID.
     *
     * @param id UUID del usuario.
     * @returns {Promise<boolean>} `true` solo cuando MariaDB reporta al menos una fila afectada.
     * @throws {Error} Si MariaDB rechaza la eliminacion.
     */
    async delete(id: string): Promise<boolean> {
        const [result] = await pool.query<ResultSetHeader>('DELETE FROM users WHERE id = ?', [id]);

        return result.affectedRows > 0;
    }
}
