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

    static getOffset({ page, limit }: Pick<ListQuery, 'page' | 'limit'>): number {
        return (page - 1) * limit;
    }

    static pagination(
        { page, limit }: Pick<ListQuery, 'page' | 'limit'>,
        total: number,
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
