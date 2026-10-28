export interface ListQuery {
    page: number;
    limit: number;
    q?: string;
}

export interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export class ListUtils {
    /** Convierte parametros de consulta en una pagina segura con limite maximo de 100. */
    static parseQuery(query: Record<string, unknown>): ListQuery {
        const page = ListUtils.parsePositiveInteger(query.page, 1);
        const limit = Math.min(ListUtils.parsePositiveInteger(query.limit, 10), 100);
        const q = typeof query.q === 'string' ? query.q.trim() : undefined;

        return {
            page,
            limit,
            ...(q ? { q } : {}),
        };
    }

    /** Calcula el offset SQL de una pagina. */
    static getOffset({ page, limit }: Pick<ListQuery, 'page' | 'limit'>): number {
        return (page - 1) * limit;
    }

    /** Construye los metadatos de paginacion para una coleccion. */
    static pagination(
        { page, limit }: Pick<ListQuery, 'page' | 'limit'>,
        total: number
    ): Pagination {
        return {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        };
    }

    private static parsePositiveInteger(value: unknown, fallback: number): number {
        if (typeof value !== 'string' || !/^\d+$/.test(value)) {
            return fallback;
        }

        const parsed = Number(value);
        return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
    }
}
